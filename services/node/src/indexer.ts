import { parseEventLogs, type Address, type Hex, type Log, type PublicClient } from 'viem';

import { EntrypointAbi, PrivacyPoolAbi, ZipBookAbi, ZipDoorstepAbi } from './abi/index.js';
import type { Config } from './config.js';
import type { Store } from './db.js';
import { bus, type LiveEvent } from './events.js';
import type { Logger } from './logger.js';

const SYNC_KEY = 'indexer:last_block';
/** On restart, re-scan this many blocks below the last synced block; all writes are idempotent. */
const REWIND = 12n;

/**
 * Reads every event the app needs from chain into SQLite: deposits, state-tree leaves, withdrawals,
 * ragequits, association roots, Book posts and Doorstep deliveries. Backfills from the deployment
 * block, then follows the head with a confirmation lag. Anyone can run this against any RPC and get
 * the same database.
 */
export class Indexer {
  private readonly abi = [...PrivacyPoolAbi, ...EntrypointAbi, ...ZipBookAbi, ...ZipDoorstepAbi];
  private readonly addresses: Address[];
  private readonly blockTimestamps = new Map<bigint, number>();
  private stopped = false;

  constructor(
    private readonly cfg: Config,
    private readonly store: Store,
    private readonly client: PublicClient,
    private readonly log: Logger,
  ) {
    this.addresses = [cfg.pool, cfg.entrypoint, ...(cfg.book ? [cfg.book] : []), ...(cfg.doorstep ? [cfg.doorstep] : [])];
  }

  /** Latest head seen by the indexer; served to the API so browser polls never touch the RPC. */
  head: bigint | undefined;

  lastSynced(): bigint | undefined {
    const v = this.store.getSync(SYNC_KEY);
    return v === undefined ? undefined : BigInt(v);
  }

  async start() {
    const last = this.lastSynced();
    if (last !== undefined && last > this.cfg.deploymentBlock + REWIND) {
      this.store.setSync(SYNC_KEY, (last - REWIND).toString());
    }
    while (!this.stopped) {
      try {
        const progressed = await this.syncOnce();
        if (!progressed) await sleep(this.cfg.indexerIntervalMs);
      } catch (error) {
        this.log.error('sync failed, retrying', { error });
        await sleep(this.cfg.indexerIntervalMs);
      }
    }
  }

  stop() {
    this.stopped = true;
  }

  /** Processes one chunk. Returns true when there is more to do right away. */
  async syncOnce(): Promise<boolean> {
    const head = await this.client.getBlockNumber();
    this.head = head;
    const safe = head - BigInt(this.cfg.confirmations);
    const last = this.lastSynced();
    const from = last === undefined ? this.cfg.deploymentBlock : last + 1n;
    if (from > safe) return false;

    const to = from + BigInt(this.cfg.indexerChunk) - 1n > safe ? safe : from + BigInt(this.cfg.indexerChunk) - 1n;
    const logs = await this.client.getLogs({ address: this.addresses, fromBlock: from, toBlock: to });
    const live = await this.apply(logs);
    this.store.setSync(SYNC_KEY, to.toString());
    if (logs.length > 0) this.log.info('indexed', { from, to, events: logs.length });
    for (const ev of live) bus.publish(ev);
    if (to === safe) bus.publish({ type: 'block', lastSynced: to.toString() });
    return to < safe;
  }

  private async apply(logs: Log[]): Promise<LiveEvent[]> {
    const parsed = parseEventLogs({ abi: this.abi, logs, strict: false });
    const live: LiveEvent[] = [];

    // Timestamps are needed for deposits (ASP delay) and for the Book and Doorstep feeds.
    const needTs = new Set<bigint>();
    for (const ev of parsed) {
      if (ev.eventName === 'Deposited' || ev.eventName === 'Spoken' || ev.eventName === 'Delivered') {
        if (ev.blockNumber !== null) needTs.add(ev.blockNumber);
      }
    }
    await Promise.all([...needTs].filter((b) => !this.blockTimestamps.has(b)).map((b) => this.fetchTimestamp(b)));

    const tx = this.store.db.transaction(() => {
      for (const ev of parsed) {
        const address = ev.address.toLowerCase();
        const block = Number(ev.blockNumber ?? 0n);
        const logIndex = ev.logIndex ?? 0;
        const txHash = ev.transactionHash ?? '0x';
        const args = ev.args as Record<string, unknown>;

        if (address === this.cfg.pool.toLowerCase()) {
          switch (ev.eventName) {
            case 'Deposited':
              this.store.upsertDeposit({
                label: String(args._label),
                commitment: String(args._commitment),
                precommitment: String(args._precommitmentHash),
                depositor: String(args._depositor).toLowerCase(),
                value: String(args._value),
                block,
                log_index: logIndex,
                tx: txHash,
                ts: this.blockTimestamps.get(ev.blockNumber ?? 0n) ?? 0,
              });
              live.push({
                type: 'deposit',
                deposit: {
                  label: String(args._label),
                  value: String(args._value),
                  tx: txHash,
                  ts: this.blockTimestamps.get(ev.blockNumber ?? 0n) ?? 0,
                },
              });
              break;
            case 'LeafInserted':
              this.store.upsertLeaf({
                idx: Number(args._index),
                leaf: String(args._leaf),
                root: String(args._root),
                block,
                tx: txHash,
              });
              break;
            case 'Withdrawn':
              this.store.upsertWithdrawal({
                nullifier: String(args._spentNullifier),
                new_commitment: String(args._newCommitment),
                value: String(args._value),
                processooor: String(args._processooor).toLowerCase(),
                block,
                log_index: logIndex,
                tx: txHash,
              });
              break;
            case 'Ragequit':
              this.store.upsertRagequit({
                label: String(args._label),
                commitment: String(args._commitment),
                ragequitter: String(args._ragequitter).toLowerCase(),
                value: String(args._value),
                block,
                tx: txHash,
              });
              break;
            default:
              break;
          }
        } else if (address === this.cfg.entrypoint.toLowerCase()) {
          if (ev.eventName === 'RootUpdated') {
            this.store.upsertAspRoot({
              root: String(args._root),
              cid: String(args._ipfsCID),
              ts: Number(args._timestamp),
              block,
              tx: txHash,
            });
            live.push({ type: 'root', root: String(args._root), cid: String(args._ipfsCID), ts: Number(args._timestamp) });
          }
        } else if (this.cfg.book && address === this.cfg.book.toLowerCase()) {
          if (ev.eventName === 'Spoken') {
            this.store.upsertPost({
              id: Number(args._id),
              reply_to: Number(args._replyTo),
              burned: String(args._burned),
              text: String(args._text),
              block,
              tx: txHash,
              ts: this.blockTimestamps.get(ev.blockNumber ?? 0n) ?? 0,
            });
            live.push({
              type: 'post',
              post: {
                id: Number(args._id),
                reply_to: Number(args._replyTo),
                burned: String(args._burned),
                text: String(args._text),
                tx: txHash,
                ts: this.blockTimestamps.get(ev.blockNumber ?? 0n) ?? 0,
              },
            });
          }
        } else if (this.cfg.doorstep && address === this.cfg.doorstep.toLowerCase()) {
          if (ev.eventName === 'Delivered') {
            this.store.upsertDelivery({
              id: Number(args._id),
              door: String(args._door).toLowerCase(),
              burned: String(args._burned),
              text: String(args._text),
              cipher: String(args._sealed as Hex),
              block,
              tx: txHash,
              ts: this.blockTimestamps.get(ev.blockNumber ?? 0n) ?? 0,
            });
            live.push({
              type: 'delivery',
              delivery: {
                id: Number(args._id),
                door: String(args._door).toLowerCase(),
                burned: String(args._burned),
                text: String(args._text),
                cipher: String(args._sealed as Hex),
                tx: txHash,
                ts: this.blockTimestamps.get(ev.blockNumber ?? 0n) ?? 0,
              },
            });
          }
        }
      }
    });
    tx();
    return live;
  }

  private async fetchTimestamp(blockNumber: bigint) {
    const block = await this.client.getBlock({ blockNumber });
    this.blockTimestamps.set(blockNumber, Number(block.timestamp));
    if (this.blockTimestamps.size > 5000) {
      const oldest = this.blockTimestamps.keys().next().value;
      if (oldest !== undefined) this.blockTimestamps.delete(oldest);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
