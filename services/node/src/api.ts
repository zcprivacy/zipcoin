import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import type { PublicClient } from 'viem';

import { ZipBookAbi, ZipDoorstepAbi } from './abi/index.js';
import { readAssetConfig, readPoolScope } from './chain.js';
import type { Config } from './config.js';
import type { Store } from './db.js';
import { bus } from './events.js';
import type { Logger } from './logger.js';
import { RelayError, relayRequestSchema, type Relayer } from './relayer.js';

/**
 * Public read API for wallets plus the relayer endpoints. Everything served here is derived from
 * chain events, so any other node running this code against the same RPC returns the same data.
 */
export function createApi(
  cfg: Config,
  store: Store,
  client: PublicClient,
  log: Logger,
  opts: { relayer?: Relayer; lastSynced: () => bigint | undefined; head: () => bigint | undefined },
): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(cors({ origin: cfg.allowedOrigins === '*' ? true : cfg.allowedOrigins }));
  app.use(express.json({ limit: '512kb' }));

  // Everything read from the chain here is cached; browser traffic must never scale RPC usage.
  let scopeCache: bigint | undefined;
  const scope = async () => (scopeCache ??= await readPoolScope(client, cfg.pool));
  let assetCfgCache: { at: number; value: Awaited<ReturnType<typeof readAssetConfig>> } | undefined;
  const assetConfig = async () => {
    if (!assetCfgCache || Date.now() - assetCfgCache.at > 60_000) {
      assetCfgCache = { at: Date.now(), value: await readAssetConfig(client, cfg.entrypoint, cfg.zcToken) };
    }
    return assetCfgCache.value;
  };

  // Spender constants are immutable; read once and serve forever.
  let spenderParams: { book: Record<string, string> | null; doorstep: Record<string, string> | null } | undefined;
  const params = async () => {
    if (spenderParams) return spenderParams;
    const [book, doorstep] = await Promise.all([
      cfg.book
        ? Promise.all([
            client.readContract({ address: cfg.book, abi: ZipBookAbi, functionName: 'MIN_BURN' }),
            client.readContract({ address: cfg.book, abi: ZipBookAbi, functionName: 'MAX_TEXT_BYTES' }),
          ]).then(([minBurn, maxTextBytes]) => ({ minBurn: minBurn.toString(), maxTextBytes: maxTextBytes.toString() }))
        : Promise.resolve(null),
      cfg.doorstep
        ? Promise.all([
            client.readContract({ address: cfg.doorstep, abi: ZipDoorstepAbi, functionName: 'MIN_BURN' }),
            client.readContract({ address: cfg.doorstep, abi: ZipDoorstepAbi, functionName: 'MAX_TEXT_BYTES' }),
            client.readContract({ address: cfg.doorstep, abi: ZipDoorstepAbi, functionName: 'MAX_SEALED_BYTES' }),
          ]).then(([minBurn, maxTextBytes, maxSealedBytes]) => ({
            minBurn: minBurn.toString(),
            maxTextBytes: maxTextBytes.toString(),
            maxSealedBytes: maxSealedBytes.toString(),
          }))
        : Promise.resolve(null),
    ]);
    spenderParams = { book, doorstep };
    return spenderParams;
  };

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      chainId: cfg.chainId,
      roles: [...cfg.roles],
      head: opts.head()?.toString() ?? null,
      lastSynced: opts.lastSynced()?.toString() ?? null,
      stats: store.stats(),
    });
  });

  app.get('/pool', async (_req, res) => {
    const [s, assetCfg, p] = await Promise.all([scope(), assetConfig(), params()]);
    const latest = store.latestLeaf();
    res.json({
      params: p,
      chainId: cfg.chainId,
      entrypoint: cfg.entrypoint,
      pool: cfg.pool,
      asset: cfg.zcToken,
      scope: s.toString(),
      deploymentBlock: cfg.deploymentBlock.toString(),
      spenders: { book: cfg.book ?? null, doorstep: cfg.doorstep ?? null },
      minimumDepositAmount: assetCfg.minimumDepositAmount.toString(),
      vettingFeeBPS: assetCfg.vettingFeeBPS.toString(),
      maxRelayFeeBPS: assetCfg.maxRelayFeeBPS.toString(),
      leaves: store.leafCount(),
      stateRoot: latest?.root ?? null,
    });
  });

  /** Aggregates for dashboards and the landing page. All derived from indexed events. */
  app.get('/stats', (_req, res) => {
    res.json({ ...store.aggregate(), lastSynced: opts.lastSynced()?.toString() ?? null, chainId: cfg.chainId });
  });

  /** Server-sent events: new posts, deliveries, deposits, approvals, roots and synced blocks. */
  app.get('/events/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: hello\ndata: ${JSON.stringify({ lastSynced: opts.lastSynced()?.toString() ?? null })}\n\n`);
    const unsubscribe = bus.subscribe((ev) => {
      res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  /** State tree leaves in insertion order; a wallet rebuilds the tree and its own Merkle proof. */
  app.get('/pool/leaves', (_req, res) => {
    const rows = store.leaves();
    res.json({ count: rows.length, root: rows.at(-1)?.root ?? null, leaves: rows.map((r) => r.leaf) });
  });

  /** Raw events in the shape the Privacy Pools SDK's DataService expects (strings, not bigints). */
  app.get('/pool/events', (_req, res) => {
    res.json({
      deposits: store.deposits().map((d) => ({
        depositor: d.depositor,
        commitment: d.commitment,
        label: d.label,
        value: d.value,
        precommitment: d.precommitment,
        blockNumber: d.block,
        transactionHash: d.tx,
        logIndex: d.log_index,
        status: d.status,
      })),
      withdrawals: store.withdrawals().map((w) => ({
        withdrawn: w.value,
        spentNullifier: w.nullifier,
        newCommitment: w.new_commitment,
        blockNumber: w.block,
        transactionHash: w.tx,
      })),
      ragequits: store.ragequits().map((r) => ({
        ragequitter: r.ragequitter,
        commitment: r.commitment,
        label: r.label,
        value: r.value,
        blockNumber: r.block,
        transactionHash: r.tx,
      })),
    });
  });

  /** Current association set: the latest on-chain root and the full list of approved labels. */
  app.get('/asp', (_req, res) => {
    const latest = store.latestAspRoot();
    if (!latest) {
      res.json({ root: null, cid: null, leaves: [], policyVersion: cfg.aspPolicyVersion, delaySeconds: cfg.aspDelaySeconds });
      return;
    }
    const set = store.aspSetByRoot(latest.root);
    const leaves = set ? (JSON.parse(set.body) as { leaves: string[] }).leaves : [];
    res.json({
      root: latest.root,
      cid: latest.cid,
      updatedAt: latest.ts,
      tx: latest.tx,
      count: leaves.length,
      leaves,
      policyVersion: cfg.aspPolicyVersion,
      delaySeconds: cfg.aspDelaySeconds,
      setUrl: set ? `${cfg.publicUrl ?? ''}/asp/sets/${latest.cid}` : null,
    });
  });

  app.get('/asp/sets/:cid', (req, res) => {
    const body = store.aspSet(String(req.params.cid));
    if (!body) {
      res.status(404).json({ error: 'unknown set' });
      return;
    }
    res.type('application/json').send(body);
  });

  app.get('/asp/deposits/:label', (req, res) => {
    const row = store.deposit(String(req.params.label));
    if (!row) {
      res.status(404).json({ error: 'unknown deposit' });
      return;
    }
    res.json({ label: row.label, status: row.status, decidedAt: row.decided_at, reason: row.reason, depositedAt: row.ts });
  });

  app.get('/book/posts', (req, res) => {
    const before = req.query.before !== undefined ? Number(req.query.before) : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    res.json({ posts: store.posts(Number.isFinite(before as number) ? before : undefined, limit) });
  });

  app.get('/book/posts/:id/replies', (req, res) => {
    res.json({ replies: store.replies(Number(req.params.id), 200) });
  });

  app.get('/doorstep/:door', (req, res) => {
    const before = req.query.before !== undefined ? Number(req.query.before) : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    res.json({
      deliveries: store.deliveriesFor(String(req.params.door).toLowerCase(), Number.isFinite(before as number) ? before : undefined, limit),
    });
  });

  if (opts.relayer) mountRelayer(app, opts.relayer, store, log);

  app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    log.error('request failed', { error: err });
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}

function mountRelayer(app: Express, relayer: Relayer, store: Store, log: Logger) {
  app.get('/relayer', async (_req, res) => {
    res.json(await relayer.details());
  });

  app.post('/relayer/relay', async (req, res) => {
    if (!relayer.allow(req.ip ?? 'unknown')) {
      res.status(429).json({ error: 'rate_limited', message: 'too many requests' });
      return;
    }
    const parsed = relayRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'bad_request', message: parsed.error.issues.map((i) => i.message).join('; ') });
      return;
    }
    try {
      const result = await relayer.relay(parsed.data);
      res.json(result);
    } catch (error) {
      if (error instanceof RelayError) {
        res.status(error.code === 'broadcast' ? 502 : 400).json({ error: error.code, message: error.message });
        return;
      }
      log.error('relay failed', { error });
      res.status(500).json({ error: 'internal', message: 'relay failed' });
    }
  });

  app.get('/relayer/requests/:id', (req, res) => {
    const row = store.relayRequest(String(req.params.id));
    if (!row) {
      res.status(404).json({ error: 'unknown request' });
      return;
    }
    res.json(row);
  });
}
