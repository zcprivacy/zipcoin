import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';
import type { Hex, PublicClient, WalletClient } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';

import { EntrypointAbi } from './abi/index.js';
import { buildTree, readLatestAspRoot, readPoolScope } from './chain.js';
import type { Config } from './config.js';
import type { DepositRow, Store } from './db.js';
import { bus } from './events.js';
import type { Logger } from './logger.js';

const PENDING_KEY = 'asp:pending';

const sanctionsAbi = [
  {
    type: 'function',
    name: 'isSanctioned',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * The association set postman. Applies a fixed, published policy to every deposit, builds the
 * approved set as a LeanIMT of labels, publishes the whole set (content-addressed, served by this
 * node and optionally pinned to IPFS), and posts its root to the Entrypoint.
 *
 * Policy, in order:
 *   1. depositor on the operator blocklist           -> rejected
 *   2. depositor flagged by the sanctions oracle      -> rejected
 *   3. deposit younger than ASP_DELAY_SECONDS         -> wait
 *   4. otherwise                                      -> approved
 *
 * A rejected deposit can always leave through ragequit; rejection only withholds private spending.
 */
export class Postman {
  private stopped = false;
  private scope?: bigint;

  constructor(
    private readonly cfg: Config,
    private readonly store: Store,
    private readonly client: PublicClient,
    private readonly wallet: { client: WalletClient; account: PrivateKeyAccount },
    private readonly log: Logger,
  ) {}

  async start() {
    while (!this.stopped) {
      try {
        await this.tick();
      } catch (error) {
        this.log.error('postman tick failed', { error });
      }
      await sleep(this.cfg.aspIntervalMs);
    }
  }

  stop() {
    this.stopped = true;
  }

  async tick() {
    await this.decidePending();
    await this.publishIfChanged();
  }

  /* ---------- policy ---------- */

  private async decidePending() {
    const cutoff = Math.floor(Date.now() / 1000) - this.cfg.aspDelaySeconds;
    const pending = this.store.pendingDepositsBefore(cutoff).filter((d) => d.ts > 0);
    for (const deposit of pending) {
      const verdict = await this.evaluate(deposit);
      this.store.decideDeposit(deposit.label, verdict.status, verdict.reason);
      bus.publish({ type: 'approval', label: deposit.label, status: verdict.status });
      this.log.info('deposit decided', { label: deposit.label, depositor: deposit.depositor, ...verdict });
    }
  }

  private async evaluate(deposit: DepositRow): Promise<{ status: 'approved' | 'rejected'; reason: string | null }> {
    if (this.cfg.aspBlocklist.has(deposit.depositor)) return { status: 'rejected', reason: 'blocklist' };
    if (this.cfg.sanctionsOracle) {
      const flagged = await this.client.readContract({
        address: this.cfg.sanctionsOracle,
        abi: sanctionsAbi,
        functionName: 'isSanctioned',
        args: [deposit.depositor as Hex],
      });
      if (flagged) return { status: 'rejected', reason: 'sanctions-oracle' };
    }
    return { status: 'approved', reason: null };
  }

  /* ---------- publishing ---------- */

  private async publishIfChanged() {
    const labels = this.store.approvedLabels();
    if (labels.length === 0) return;

    const tree = buildTree(labels.map((l) => BigInt(l)));
    const root = tree.root;
    const onchain = await readLatestAspRoot(this.client, this.cfg.entrypoint);
    if (root === onchain) {
      this.store.setSync(PENDING_KEY, '');
      return;
    }

    // A root we already submitted may still be in flight.
    const pending = this.store.getSync(PENDING_KEY);
    if (pending) {
      const [pendingRoot, pendingTx] = pending.split(':');
      if (pendingRoot === root.toString() && pendingTx) {
        const receipt = await this.client.getTransactionReceipt({ hash: pendingTx as Hex }).catch(() => null);
        if (!receipt) return; // still pending
        if (receipt.status === 'success') return; // indexer will catch up
        this.log.warn('previous root update reverted, resubmitting', { tx: pendingTx });
      }
    }

    const { cid, body } = await this.serializeSet(root, labels);
    this.store.saveAspSet(cid, root.toString(), body);
    await this.pin(cid, body);

    const hash = await this.wallet.client.writeContract({
      address: this.cfg.entrypoint,
      abi: EntrypointAbi,
      functionName: 'updateRoot',
      args: [root, cid],
      account: this.wallet.account,
      chain: this.wallet.client.chain,
    });
    this.store.setSync(PENDING_KEY, `${root.toString()}:${hash}`);
    this.log.info('posted association root', { root, cid, leaves: labels.length, tx: hash });
  }

  private async serializeSet(root: bigint, labels: string[]) {
    if (this.scope === undefined) this.scope = await readPoolScope(this.client, this.cfg.pool);
    const body = JSON.stringify({
      format: 'zipcoin-association-set/1',
      policyVersion: this.cfg.aspPolicyVersion,
      chainId: this.cfg.chainId,
      entrypoint: this.cfg.entrypoint,
      pool: this.cfg.pool,
      scope: this.scope.toString(),
      hash: 'poseidon2',
      tree: 'lean-imt',
      root: root.toString(),
      count: labels.length,
      leaves: labels,
      generatedAt: new Date().toISOString(),
    });
    const bytes = new TextEncoder().encode(body);
    const digest = await sha256.digest(bytes);
    const cid = CID.create(1, raw.code, digest).toString();
    return { cid, body };
  }

  /** Best-effort pin to Pinata when a JWT is configured. The node serves the set itself regardless. */
  private async pin(cid: string, body: string) {
    if (!this.cfg.pinataJwt) return;
    try {
      const form = new FormData();
      form.append('file', new Blob([body], { type: 'application/json' }), `${cid}.json`);
      form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
      form.append('pinataMetadata', JSON.stringify({ name: `zipcoin-asp-${cid}` }));
      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.cfg.pinataJwt}` },
        body: form,
      });
      if (!res.ok) {
        this.log.warn('pinata pin failed', { status: res.status, text: await res.text() });
        return;
      }
      const json = (await res.json()) as { IpfsHash?: string };
      if (json.IpfsHash && json.IpfsHash !== cid) {
        this.log.warn('pinata returned a different CID; the on-chain CID is ours and the node serves it', {
          ours: cid,
          pinata: json.IpfsHash,
        });
      }
    } catch (error) {
      this.log.warn('pinata pin error', { error });
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
