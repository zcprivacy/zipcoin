import type { AccountCommitment, AccountService, Hash, Secret } from '@0xbow/privacy-pools-core-sdk';
import { PrivacyPoolSDK } from '@0xbow/privacy-pools-core-sdk';
import { LeanIMT } from '@zk-kit/lean-imt';
import { poseidon2 } from 'poseidon-lite';
import { encodeAbiParameters, keccak256, type Address, type Hex } from 'viem';

import { api, type RelayerInfo } from './api';
import { HostedCircuits } from './circuits';

export const SNARK_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const circuits = new HostedCircuits();
export const sdk = new PrivacyPoolSDK(circuits);
export const setProvingProgress = (fn: ((msg: string) => void) | undefined) => {
  circuits.onProgress = fn;
};

/* ---------- instruction encoding (matches IZipSpender.Instruction and Entrypoint.RelayData) ---------- */

const instructionAbi = [
  {
    type: 'tuple',
    components: [
      { name: 'version', type: 'uint8' },
      { name: 'feeRecipient', type: 'address' },
      { name: 'relayFeeBPS', type: 'uint256' },
      { name: 'payload', type: 'bytes' },
    ],
  },
] as const;

export function encodeInstruction(relayer: RelayerInfo, payload: Hex): Hex {
  return encodeAbiParameters(instructionAbi, [
    { version: 1, feeRecipient: relayer.feeRecipient, relayFeeBPS: BigInt(relayer.feeBps), payload },
  ]);
}

export function encodeBookPost(replyTo: bigint, text: string): Hex {
  return encodeAbiParameters(
    [{ type: 'tuple', components: [{ name: 'replyTo', type: 'uint256' }, { name: 'text', type: 'string' }] }],
    [{ replyTo, text }],
  );
}

export function encodeDelivery(door: Address, text: string, cipher: Hex): Hex {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'door', type: 'address' },
          { name: 'text', type: 'string' },
          { name: 'cipher', type: 'bytes' },
        ],
      },
    ],
    [{ door, text, cipher }],
  );
}

export function encodeRelayData(recipient: Address, relayer: RelayerInfo): Hex {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'recipient', type: 'address' },
          { name: 'feeRecipient', type: 'address' },
          { name: 'relayFeeBPS', type: 'uint256' },
        ],
      },
    ],
    [{ recipient, feeRecipient: relayer.feeRecipient, relayFeeBPS: BigInt(relayer.feeBps) }],
  );
}

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

/* ---------- trees ---------- */

function tree(leaves: bigint[]) {
  const t = new LeanIMT<bigint>((a, b) => poseidon2([a, b]));
  if (leaves.length) t.insertMany(leaves);
  return t;
}

function paddedProof(t: LeanIMT<bigint>, leaf: bigint) {
  const index = t.indexOf(leaf);
  if (index === -1) throw new Error('note not found in the current tree; wait for the indexer');
  const p = t.generateProof(index);
  return {
    ...p,
    siblings: [...p.siblings, ...Array<bigint>(Math.max(0, 32 - p.siblings.length)).fill(0n)],
  };
}

/* ---------- spend ---------- */

export interface SpendResult {
  txHash: Hex;
  requestId: string;
  remaining: bigint;
}

/**
 * Spend part of a note through a processooor: builds both Merkle proofs from the node's data,
 * proves in the browser, and hands the proof to the relayer. Nothing here signs with the wallet.
 */
export async function spend(
  account: AccountService,
  note: AccountCommitment,
  scope: Hash,
  processooor: Address,
  data: Hex,
  amount: bigint,
  onProgress: (msg: string) => void,
): Promise<SpendResult> {
  if (amount <= 0n || amount > note.value) throw new Error('amount must be between 0 and the note value');

  onProgress('reading pool state');
  const [leavesRes, asp] = await Promise.all([api.leaves(), api.asp()]);
  if (!asp.root) throw new Error('no association root has been published yet');

  const stateTree = tree(leavesRes.leaves.map(BigInt));
  const aspTree = tree(asp.leaves.map(BigInt));
  if (aspTree.root !== BigInt(asp.root)) throw new Error('association set does not match its published root');
  if (!asp.leaves.includes(note.label.toString())) throw new Error('this note is not approved yet');

  const stateProof = paddedProof(stateTree, note.hash);
  const aspProof = paddedProof(aspTree, note.label);
  const { nullifier: newNullifier, secret: newSecret } = account.createWithdrawalSecrets(note);

  setProvingProgress(onProgress);
  onProgress('generating proof');
  const proof = await sdk.proveWithdrawal(note, {
    withdrawalAmount: amount,
    stateMerkleProof: stateProof,
    aspMerkleProof: aspProof,
    stateRoot: stateTree.root as Hash,
    stateTreeDepth: BigInt(stateTree.depth),
    aspRoot: aspTree.root as Hash,
    aspTreeDepth: BigInt(aspTree.depth),
    context: withdrawalContext(processooor, data, scope),
    newNullifier: newNullifier as Secret,
    newSecret: newSecret as Secret,
  });

  onProgress('sending to relayer');
  const result = await api.relay({
    withdrawal: { processooor, data },
    proof: {
      pi_a: proof.proof.pi_a.map(String),
      pi_b: proof.proof.pi_b.map((r) => r.map(String)),
      pi_c: proof.proof.pi_c.map(String),
    },
    publicSignals: proof.publicSignals.map(String),
  });

  account.addWithdrawalCommitment(note, note.value - amount, newNullifier, newSecret, 0n, result.txHash);
  return { ...result, remaining: note.value - amount };
}

/* ---------- ragequit proof, formatted for the pool contract ---------- */

export async function ragequitArgs(note: AccountCommitment) {
  const proof = await sdk.proveCommitment(note.value, note.label, note.nullifier, note.secret);
  const b = (s: string | undefined) => BigInt(s ?? '0');
  const p = proof.proof;
  return {
    pA: [b(p.pi_a[0]), b(p.pi_a[1])] as [bigint, bigint],
    pB: [
      [b(p.pi_b[0]?.[1]), b(p.pi_b[0]?.[0])],
      [b(p.pi_b[1]?.[1]), b(p.pi_b[1]?.[0])],
    ] as [[bigint, bigint], [bigint, bigint]],
    pC: [b(p.pi_c[0]), b(p.pi_c[1])] as [bigint, bigint],
    pubSignals: proof.publicSignals.map((s) => BigInt(s)) as unknown as readonly [bigint, bigint, bigint, bigint],
  };
}
