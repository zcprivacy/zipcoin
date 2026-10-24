import { LeanIMT, type LeanIMTMerkleProof } from '@zk-kit/lean-imt';
import { poseidon2 } from 'poseidon-lite';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  keccak256,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

import { EntrypointAbi, PrivacyPoolAbi } from './abi/index.js';
import type { Config } from './config.js';

export const SNARK_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export function makeChain(cfg: Config): Chain {
  if (cfg.chainId === 1) {
    return { ...mainnet, rpcUrls: { default: { http: [cfg.rpcUrl] } } };
  }
  return defineChain({
    id: cfg.chainId,
    name: `chain-${cfg.chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
  });
}

export function makePublicClient(cfg: Config): PublicClient {
  return createPublicClient({ chain: makeChain(cfg), transport: http(cfg.rpcUrl, { batch: true }) });
}

export function makeWalletClient(cfg: Config, privateKey: Hex): { client: WalletClient; account: PrivateKeyAccount } {
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({ account, chain: makeChain(cfg), transport: http(cfg.rpcUrl) });
  return { client, account };
}

/* ---------- Merkle helpers (same hash and padding as the Privacy Pools SDK) ---------- */

export function buildTree(leaves: bigint[]): LeanIMT<bigint> {
  const tree = new LeanIMT<bigint>((a, b) => poseidon2([a, b]));
  if (leaves.length > 0) tree.insertMany(leaves);
  return tree;
}

export function paddedProof(tree: LeanIMT<bigint>, leaf: bigint): LeanIMTMerkleProof<bigint> {
  const index = tree.indexOf(leaf);
  if (index === -1) throw new Error('leaf not in tree');
  const proof = tree.generateProof(index);
  if (proof.siblings.length < 32) {
    proof.siblings = [...proof.siblings, ...Array<bigint>(32 - proof.siblings.length).fill(0n)];
  }
  return proof;
}

/** `context` public signal: keccak(abi.encode(Withdrawal, SCOPE)) mod p, exactly as PrivacyPool.sol computes it. */
export function withdrawalContext(processooor: Address, data: Hex, scope: bigint): bigint {
  const encoded = encodeAbiParameters(
    [
      { type: 'tuple', components: [{ name: 'processooor', type: 'address' }, { name: 'data', type: 'bytes' }] },
      { type: 'uint256' },
    ],
    [{ processooor, data }, scope],
  );
  return BigInt(keccak256(encoded)) % SNARK_SCALAR_FIELD;
}

export function toHex32(v: bigint): Hex {
  return `0x${v.toString(16).padStart(64, '0')}`;
}

/* ---------- contract reads ---------- */

export async function readPoolScope(client: PublicClient, pool: Address): Promise<bigint> {
  return client.readContract({ address: pool, abi: PrivacyPoolAbi, functionName: 'SCOPE' });
}

export async function readLatestAspRoot(client: PublicClient, entrypoint: Address): Promise<bigint> {
  try {
    return await client.readContract({ address: entrypoint, abi: EntrypointAbi, functionName: 'latestRoot' });
  } catch {
    // NoRootsAvailable: nothing posted yet
    return 0n;
  }
}

export async function readAssetConfig(client: PublicClient, entrypoint: Address, asset: Address) {
  const [pool, minimumDepositAmount, vettingFeeBPS, maxRelayFeeBPS] = await client.readContract({
    address: entrypoint,
    abi: EntrypointAbi,
    functionName: 'assetConfig',
    args: [asset],
  });
  return { pool, minimumDepositAmount, vettingFeeBPS, maxRelayFeeBPS };
}

export async function readNullifierSpent(client: PublicClient, pool: Address, nullifierHash: bigint): Promise<boolean> {
  return client.readContract({ address: pool, abi: PrivacyPoolAbi, functionName: 'nullifierHashes', args: [nullifierHash] });
}
