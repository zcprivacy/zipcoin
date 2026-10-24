import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as snarkjs from 'snarkjs';
import {
  decodeAbiParameters,
  getAddress,
  parseGwei,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';
import { z } from 'zod';

import { EntrypointAbi, ZipBookAbi } from './abi/index.js';
import { readAssetConfig, readLatestAspRoot, readNullifierSpent, readPoolScope, withdrawalContext } from './chain.js';
import type { Config } from './config.js';
import type { Store } from './db.js';
import type { Logger } from './logger.js';

const hex = z.string().regex(/^0x[0-9a-fA-F]*$/);
const fieldString = z.string().regex(/^[0-9]+$/);

export const relayRequestSchema = z.object({
  withdrawal: z.object({ processooor: hex, data: hex }),
  proof: z.object({
    pi_a: z.array(z.string()).min(2),
    pi_b: z.array(z.array(z.string()).min(2)).min(2),
    pi_c: z.array(z.string()).min(2),
  }),
  publicSignals: z.array(fieldString).length(8),
});
export type RelayRequest = z.infer<typeof relayRequestSchema>;

export class RelayError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const relayDataAbi = [
  {
    type: 'tuple',
    components: [
      { name: 'recipient', type: 'address' },
      { name: 'feeRecipient', type: 'address' },
      { name: 'relayFeeBPS', type: 'uint256' },
    ],
  },
] as const;

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

/**
 * Submits users' withdrawals so their own wallet never signs one. The relayer has no special
 * rights: it only pays gas, and the fee it receives is whatever the user encoded before proving.
 * It refuses anything it would lose money on or that the pool would reject.
 */
export class Relayer {
  private readonly vkey: unknown;
  private scope?: bigint;
  private maxRelayFeeBps?: bigint;
  private readonly recent = new Map<string, number[]>();

  constructor(
    private readonly cfg: Config,
    private readonly store: Store,
    private readonly client: PublicClient,
    private readonly wallet: { client: WalletClient; account: PrivateKeyAccount },
    private readonly log: Logger,
    vkeyPath: string,
  ) {
    this.vkey = JSON.parse(readFileSync(vkeyPath, 'utf8'));
  }

  get address(): Address {
    return this.wallet.account.address;
  }

  targets(): Record<string, Address> {
    const t: Record<string, Address> = { entrypoint: this.cfg.entrypoint };
    if (this.cfg.book) t.book = this.cfg.book;
    if (this.cfg.doorstep) t.doorstep = this.cfg.doorstep;
    return t;
  }

  async details() {
    if (this.maxRelayFeeBps === undefined) await this.loadChainParams();
    return {
      chainId: this.cfg.chainId,
      relayer: this.address,
      feeRecipient: this.address,
      feeBps: this.cfg.relayerFeeBps,
      maxRelayFeeBps: Number(this.maxRelayFeeBps),
      maxGasGwei: this.cfg.relayerMaxGasGwei,
      minWithdraw: this.cfg.relayerMinWithdraw.toString(),
      targets: this.targets(),
      instructionVersion: 1,
    };
  }

  allow(ip: string): boolean {
    const now = Date.now();
    const hits = (this.recent.get(ip) ?? []).filter((t) => now - t < 60_000);
    hits.push(now);
    this.recent.set(ip, hits);
    return hits.length <= this.cfg.relayerRateLimitPerMin;
  }

  async relay(req: RelayRequest): Promise<{ requestId: string; txHash: Hex }> {
    const processooor = getAddress(req.withdrawal.processooor);
    const targetName = Object.entries(this.targets()).find(([, a]) => a === processooor)?.[0];
    const requestId = randomUUID();
    this.store.createRelayRequest(requestId, targetName ?? processooor);

    try {
      if (!targetName) throw new RelayError('unknown_target', 'processooor is not a Zipcoin target');
      if (this.scope === undefined || this.maxRelayFeeBps === undefined) await this.loadChainParams();

      const signals = req.publicSignals.map((s) => BigInt(s));
      const [newCommitment, nullifierHash, withdrawnValue, , , aspRoot, , context] = signals as [
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
      ];
      void newCommitment;

      if (withdrawnValue === 0n) throw new RelayError('zero_value', 'withdrawnValue is zero');
      if (withdrawnValue < this.cfg.relayerMinWithdraw) {
        throw new RelayError('below_minimum', `this relayer accepts withdrawals of at least ${this.cfg.relayerMinWithdraw} wei of ZC`);
      }

      // Fee terms the user committed to.
      const { feeRecipient, relayFeeBPS } = this.decodeFee(targetName, req.withdrawal.data as Hex);
      if (getAddress(feeRecipient) !== this.address) {
        throw new RelayError('fee_recipient', `feeRecipient must be ${this.address}`);
      }
      if (relayFeeBPS < BigInt(this.cfg.relayerFeeBps)) {
        throw new RelayError('fee_too_low', `relayFeeBPS must be at least ${this.cfg.relayerFeeBps}`);
      }
      if (relayFeeBPS > this.maxRelayFeeBps!) {
        throw new RelayError('fee_too_high', `relayFeeBPS exceeds the pool cap of ${this.maxRelayFeeBps}`);
      }

      // The proof must be bound to exactly this withdrawal.
      const expectedContext = withdrawalContext(processooor, req.withdrawal.data as Hex, this.scope!);
      if (context !== expectedContext) throw new RelayError('context', 'proof context does not match withdrawal');

      // The pool only accepts the latest association root.
      const latestRoot = await readLatestAspRoot(this.client, this.cfg.entrypoint);
      if (aspRoot !== latestRoot) {
        throw new RelayError('stale_asp_root', 'association root changed; generate the proof again');
      }

      if (await readNullifierSpent(this.client, this.cfg.pool, nullifierHash)) {
        throw new RelayError('spent', 'this note has already been spent');
      }

      const valid = await snarkjs.groth16.verify(this.vkey as never, req.publicSignals, req.proof as never);
      if (!valid) throw new RelayError('invalid_proof', 'proof does not verify');

      const gasPrice = await this.client.getGasPrice();
      if (gasPrice > parseGwei(String(this.cfg.relayerMaxGasGwei))) {
        throw new RelayError('gas_too_high', 'gas price above the relayer limit; try again later');
      }

      const txHash = await this.broadcast(targetName, processooor, req, signals);
      this.store.finishRelayRequest(requestId, 'broadcast', txHash, null);
      this.log.info('relayed', { requestId, target: targetName, txHash, withdrawnValue, relayFeeBPS });
      return { requestId, txHash };
    } catch (error) {
      const message = error instanceof RelayError ? error.message : shortError(error);
      this.store.finishRelayRequest(requestId, 'failed', null, message);
      throw error instanceof RelayError ? error : new RelayError('broadcast', message);
    }
  }

  private decodeFee(target: string, data: Hex): { feeRecipient: Address; relayFeeBPS: bigint } {
    try {
      if (target === 'entrypoint') {
        const [d] = decodeAbiParameters(relayDataAbi, data);
        return { feeRecipient: d.feeRecipient, relayFeeBPS: d.relayFeeBPS };
      }
      const [ix] = decodeAbiParameters(instructionAbi, data);
      if (ix.version !== 1) throw new RelayError('instruction_version', `unsupported instruction version ${ix.version}`);
      return { feeRecipient: ix.feeRecipient, relayFeeBPS: ix.relayFeeBPS };
    } catch (error) {
      if (error instanceof RelayError) throw error;
      throw new RelayError('bad_data', 'withdrawal data does not decode for this target');
    }
  }

  private async broadcast(target: string, processooor: Address, req: RelayRequest, signals: bigint[]): Promise<Hex> {
    const proof = formatProof(req.proof, signals);
    const withdrawal = { processooor, data: req.withdrawal.data as Hex };
    const account = this.wallet.account;
    const chain = this.wallet.client.chain;

    if (target === 'entrypoint') {
      const { request } = await this.client.simulateContract({
        address: this.cfg.entrypoint,
        abi: EntrypointAbi,
        functionName: 'relay',
        args: [withdrawal, proof, this.scope!],
        account,
      });
      return this.wallet.client.writeContract({ ...request, account, chain });
    }

    // Every spender shares the IZipSpender.execute signature; the Book ABI carries it.
    const { request } = await this.client.simulateContract({
      address: processooor,
      abi: ZipBookAbi,
      functionName: 'execute',
      args: [withdrawal, proof],
      account,
    });
    return this.wallet.client.writeContract({ ...request, account, chain });
  }

  private async loadChainParams() {
    this.scope = await readPoolScope(this.client, this.cfg.pool);
    const cfg = await readAssetConfig(this.client, this.cfg.entrypoint, this.cfg.zcToken);
    this.maxRelayFeeBps = cfg.maxRelayFeeBPS;
  }
}

/** snarkjs proof -> the Solidity verifier's (pA, pB, pC, pubSignals) layout; pB coordinates are swapped. */
export function formatProof(p: RelayRequest['proof'], signals: bigint[]) {
  const b = (s: string | undefined) => BigInt(s ?? '0');
  return {
    pA: [b(p.pi_a[0]), b(p.pi_a[1])] as [bigint, bigint],
    pB: [
      [b(p.pi_b[0]?.[1]), b(p.pi_b[0]?.[0])],
      [b(p.pi_b[1]?.[1]), b(p.pi_b[1]?.[0])],
    ] as [[bigint, bigint], [bigint, bigint]],
    pC: [b(p.pi_c[0]), b(p.pi_c[1])] as [bigint, bigint],
    pubSignals: signals as unknown as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint],
  };
}

function shortError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { shortMessage?: string; metaMessages?: string[]; message?: string };
    if (e.metaMessages?.[0]) return e.metaMessages[0].replace(/^Error:\s*/, '').trim();
    if (e.shortMessage) return e.shortMessage;
    if (e.message) return e.message.split('\n')[0] ?? 'error';
  }
  return String(error);
}
