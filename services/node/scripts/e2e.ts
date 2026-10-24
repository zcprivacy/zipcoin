/**
 * End-to-end rehearsal against a local Anvil chain running the deployed Zipcoin contracts and a
 * running node (indexer + asp + relayer + api). Flow:
 *   1. fund a user with ZC, deposit through the Entrypoint with SDK-compatible secrets
 *   2. wait for the postman to approve the deposit and post the association root
 *   3. rebuild both Merkle trees from the node's API, build a Book instruction, prove in Groth16
 *   4. submit through the relayer and confirm the post shows up in the Book feed
 *
 * Usage: npx tsx scripts/e2e.ts   (env: RPC_URL, API_URL, DEPLOYMENT json path, ZC_TOKEN)
 */
import { readFileSync } from 'node:fs';
import { LeanIMT } from '@zk-kit/lean-imt';
import { poseidon1, poseidon2, poseidon3 } from 'poseidon-lite';
import * as snarkjs from 'snarkjs';
import {
  bytesToBigInt,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

const F = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const RPC = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
const API = process.env.API_URL ?? 'http://127.0.0.1:8080';
const DEPLOYMENT = process.env.DEPLOYMENT ?? '../../protocol/deployments/31337.json';
const ZC = process.env.ZC_TOKEN as Address;
const CIRCUITS = '../../protocol/lib/privacy-pools-core/packages/circuits';
const WASM = `${CIRCUITS}/build/withdraw/withdraw_js/withdraw.wasm`;
const ZKEY = `${CIRCUITS}/trusted-setup/final-keys/withdraw.zkey`;

// Anvil's well-known test keys: 0 funds the user, 3 is the user.
const FUNDER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const USER_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';
const MNEMONIC = 'test test test test test test test test test test test junk';

const DEPOSIT = 50_000n * 10n ** 18n;
const WITHDRAW = 2_000n * 10n ** 18n;
const RELAY_FEE_BPS = 100n;
const TEXT = `The lantern is lit on the north bridge. ${new Date().toISOString()}`;

const erc20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
]);
const entrypointAbi = parseAbi([
  'function deposit(address asset, uint256 value, uint256 precommitment) returns (uint256)',
]);
const poolAbi = parseAbi(['function SCOPE() view returns (uint256)']);

type Deployment = { entrypoint: Address; pool: Address; book: Address; doorstep: Address; scope: string };

async function main() {
  if (!ZC) throw new Error('ZC_TOKEN env is required');
  const dep = JSON.parse(readFileSync(DEPLOYMENT, 'utf8')) as Deployment;
  const client = createPublicClient({ transport: http(RPC) });
  const chainId = await client.getChainId();
  const chain = { id: chainId, name: 'local', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
  // On a mainnet fork there is no mintable token: impersonate a large holder (e.g. the Uniswap PoolManager)
  // via FUNDER_IMPERSONATE and let Anvil sign for it.
  const impersonate = process.env.FUNDER_IMPERSONATE as Address | undefined;
  if (impersonate) {
    await client.request({ method: 'anvil_setBalance' as never, params: [impersonate, '0x56BC75E2D63100000'] as never });
    await client.request({ method: 'anvil_impersonateAccount' as never, params: [impersonate] as never });
  }
  const funder = impersonate
    ? createWalletClient({ account: impersonate, chain, transport: http(RPC) })
    : createWalletClient({ account: privateKeyToAccount(FUNDER_KEY), chain, transport: http(RPC) });
  const userAccount = privateKeyToAccount(USER_KEY);
  const user = createWalletClient({ account: userAccount, chain, transport: http(RPC) });

  const scope = await client.readContract({ address: dep.pool, abi: poolAbi, functionName: 'SCOPE' });
  console.log('scope', scope.toString());

  // --- keys exactly as the Privacy Pools SDK derives them ---
  const k1 = bytesToBigInt(mnemonicToAccount(MNEMONIC, { accountIndex: 0 }).getHdKey().privateKey!);
  const k2 = bytesToBigInt(mnemonicToAccount(MNEMONIC, { accountIndex: 1 }).getHdKey().privateKey!);
  const masterNullifier = poseidon1([k1]);
  const masterSecret = poseidon1([k2]);
  const depositIndex = BigInt(Number(process.env.DEPOSIT_INDEX ?? 0));
  const nullifier = poseidon3([masterNullifier, scope, depositIndex]);
  const secret = poseidon3([masterSecret, scope, depositIndex]);
  const precommitment = poseidon2([nullifier, secret]);

  // --- 1. fund + deposit ---
  console.log('funding user and depositing', { user: userAccount.address });
  await wait(client, await funder.writeContract({ address: ZC, abi: erc20, functionName: 'transfer', args: [userAccount.address, DEPOSIT] }));
  await wait(client, await user.writeContract({ address: ZC, abi: erc20, functionName: 'approve', args: [dep.entrypoint, DEPOSIT] }));
  const depositTx = await user.writeContract({
    address: dep.entrypoint,
    abi: entrypointAbi,
    functionName: 'deposit',
    args: [ZC, DEPOSIT, precommitment],
  });
  await wait(client, depositTx);
  console.log('deposited', { tx: depositTx });

  // --- 2. wait for indexer + postman ---
  const deposit = await poll('deposit indexed', async () => {
    const events = (await getJson(`${API}/pool/events`)) as { deposits: { precommitment: string; label: string; value: string }[] };
    return events.deposits.find((d) => d.precommitment === precommitment.toString());
  });
  const label = BigInt(deposit.label);
  const value = BigInt(deposit.value);
  console.log('deposit indexed', { label: label.toString(), value: value.toString() });

  const asp = await poll('association root includes deposit', async () => {
    const a = (await getJson(`${API}/asp`)) as { root: string | null; leaves: string[] };
    return a.root && a.leaves.includes(label.toString()) ? a : undefined;
  });
  console.log('association root posted', { root: asp.root, leaves: asp.leaves.length });

  // --- 3. trees, instruction, proof ---
  const leavesRes = (await getJson(`${API}/pool/leaves`)) as { leaves: string[] };
  const stateTree = tree(leavesRes.leaves.map(BigInt));
  const commitment = poseidon3([value, label, precommitment]);
  const stateProof = paddedProof(stateTree, commitment);
  const aspTree = tree(asp.leaves.map(BigInt));
  const aspProof = paddedProof(aspTree, label);
  if (aspTree.root !== BigInt(asp.root!)) throw new Error('local ASP root differs from published root');

  const relayer = (await getJson(`${API}/relayer`)) as { feeRecipient: Address };
  const payload = encodeAbiParameters(
    [{ type: 'tuple', components: [{ name: 'replyTo', type: 'uint256' }, { name: 'text', type: 'string' }] }],
    [{ replyTo: 0n, text: TEXT }],
  );
  const data = encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'feeRecipient', type: 'address' },
          { name: 'relayFeeBPS', type: 'uint256' },
          { name: 'payload', type: 'bytes' },
        ],
      },
    ],
    [{ version: 1, feeRecipient: relayer.feeRecipient, relayFeeBPS: RELAY_FEE_BPS, payload }],
  );
  const context =
    BigInt(
      keccak256(
        encodeAbiParameters(
          [
            { type: 'tuple', components: [{ name: 'processooor', type: 'address' }, { name: 'data', type: 'bytes' }] },
            { type: 'uint256' },
          ],
          [{ processooor: dep.book, data }, scope],
        ),
      ),
    ) % F;

  const newNullifier = poseidon3([masterNullifier, label, 0n]);
  const newSecret = poseidon3([masterSecret, label, 0n]);
  const input = {
    withdrawnValue: WITHDRAW,
    stateRoot: stateTree.root,
    stateTreeDepth: BigInt(stateTree.depth),
    ASPRoot: aspTree.root,
    ASPTreeDepth: BigInt(aspTree.depth),
    context,
    label,
    existingValue: value,
    existingNullifier: nullifier,
    existingSecret: secret,
    newNullifier,
    newSecret,
    stateSiblings: stateProof.siblings,
    stateIndex: BigInt(stateProof.index),
    ASPSiblings: aspProof.siblings,
    ASPIndex: BigInt(aspProof.index),
  };
  console.log('proving...');
  const t0 = Date.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  console.log('proof ready', { ms: Date.now() - t0, publicSignals });

  // --- 4. relay ---
  const res = await fetch(`${API}/relayer/relay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      withdrawal: { processooor: dep.book, data },
      proof: { pi_a: proof.pi_a, pi_b: proof.pi_b, pi_c: proof.pi_c },
      publicSignals,
    }),
  });
  const body = (await res.json()) as { txHash?: Hex; error?: string; message?: string };
  if (!res.ok) throw new Error(`relay rejected: ${body.error} ${body.message}`);
  console.log('relayed', body);
  await wait(client, body.txHash!);

  const post = await poll('post indexed', async () => {
    const feed = (await getJson(`${API}/book/posts`)) as { posts: { id: number; text: string; burned: string }[] };
    return feed.posts.find((p) => p.text === TEXT);
  });
  console.log('BOOK POST CONFIRMED', post);
  process.exit(0);
}

function tree(leaves: bigint[]) {
  const t = new LeanIMT<bigint>((a, b) => poseidon2([a, b]));
  if (leaves.length) t.insertMany(leaves);
  return t;
}

function paddedProof(t: LeanIMT<bigint>, leaf: bigint) {
  const index = t.indexOf(leaf);
  if (index === -1) throw new Error('leaf not found in tree');
  const p = t.generateProof(index);
  const siblings = [...p.siblings, ...Array<bigint>(Math.max(0, 32 - p.siblings.length)).fill(0n)];
  return { index: p.index, siblings };
}

async function wait(client: ReturnType<typeof createPublicClient>, hash: Hex) {
  const r = await client.waitForTransactionReceipt({ hash });
  if (r.status !== 'success') throw new Error(`tx ${hash} reverted`);
}

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function poll<T>(what: string, fn: () => Promise<T | undefined>, timeoutMs = 120_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn().catch(() => undefined);
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
