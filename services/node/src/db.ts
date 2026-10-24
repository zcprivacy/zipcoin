import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * SQLite store. Every chain value is kept as a decimal string so nothing is lost to JS numbers;
 * callers convert with BigInt(). Everything here is rebuildable from chain events except
 * `asp_sets`, which the postman can regenerate from approved deposits, and `relay_requests`.
 */
export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface DepositRow {
  label: string;
  commitment: string;
  precommitment: string;
  depositor: string;
  value: string;
  block: number;
  log_index: number;
  tx: string;
  ts: number;
  status: DepositStatus;
  decided_at: number | null;
  reason: string | null;
}

export interface LeafRow {
  idx: number;
  leaf: string;
  root: string;
  block: number;
  tx: string;
}

export interface WithdrawalRow {
  nullifier: string;
  new_commitment: string;
  value: string;
  processooor: string;
  block: number;
  log_index: number;
  tx: string;
}

export interface RagequitRow {
  label: string;
  commitment: string;
  ragequitter: string;
  value: string;
  block: number;
  tx: string;
}

export interface AspRootRow {
  root: string;
  cid: string;
  ts: number;
  block: number | null;
  tx: string | null;
}

export interface PostRow {
  id: number;
  reply_to: number;
  burned: string;
  text: string;
  block: number;
  tx: string;
  ts: number;
}

export interface DeliveryRow {
  id: number;
  door: string;
  burned: string;
  text: string;
  cipher: string;
  block: number;
  tx: string;
  ts: number;
}

export interface RelayRequestRow {
  id: string;
  created: number;
  status: 'received' | 'broadcast' | 'failed';
  target: string;
  tx: string | null;
  error: string | null;
}

export class Store {
  readonly db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deposits (
        label TEXT PRIMARY KEY, commitment TEXT NOT NULL, precommitment TEXT NOT NULL, depositor TEXT NOT NULL,
        value TEXT NOT NULL, block INTEGER NOT NULL, log_index INTEGER NOT NULL, tx TEXT NOT NULL, ts INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', decided_at INTEGER, reason TEXT
      );
      CREATE INDEX IF NOT EXISTS deposits_status ON deposits(status, ts);
      CREATE INDEX IF NOT EXISTS deposits_order ON deposits(block, log_index);
      CREATE TABLE IF NOT EXISTS leaves (
        idx INTEGER PRIMARY KEY, leaf TEXT NOT NULL, root TEXT NOT NULL, block INTEGER NOT NULL, tx TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS withdrawals (
        nullifier TEXT PRIMARY KEY, new_commitment TEXT NOT NULL, value TEXT NOT NULL, processooor TEXT NOT NULL,
        block INTEGER NOT NULL, log_index INTEGER NOT NULL, tx TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ragequits (
        label TEXT PRIMARY KEY, commitment TEXT NOT NULL, ragequitter TEXT NOT NULL, value TEXT NOT NULL,
        block INTEGER NOT NULL, tx TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS asp_roots (
        root TEXT PRIMARY KEY, cid TEXT NOT NULL, ts INTEGER NOT NULL, block INTEGER, tx TEXT
      );
      CREATE TABLE IF NOT EXISTS asp_sets (
        cid TEXT PRIMARY KEY, root TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY, reply_to INTEGER NOT NULL, burned TEXT NOT NULL, text TEXT NOT NULL,
        block INTEGER NOT NULL, tx TEXT NOT NULL, ts INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY, door TEXT NOT NULL, burned TEXT NOT NULL, text TEXT NOT NULL, cipher TEXT NOT NULL,
        block INTEGER NOT NULL, tx TEXT NOT NULL, ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS deliveries_door ON deliveries(door, id);
      CREATE TABLE IF NOT EXISTS relay_requests (
        id TEXT PRIMARY KEY, created INTEGER NOT NULL, status TEXT NOT NULL, target TEXT NOT NULL, tx TEXT, error TEXT
      );
    `);
  }

  /* ---------- sync ---------- */

  getSync(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM sync WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  setSync(key: string, value: string) {
    this.db.prepare('INSERT INTO sync(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value);
  }

  /* ---------- deposits ---------- */

  upsertDeposit(row: Omit<DepositRow, 'status' | 'decided_at' | 'reason'>) {
    this.db.prepare(`
      INSERT INTO deposits(label, commitment, precommitment, depositor, value, block, log_index, tx, ts)
      VALUES (@label, @commitment, @precommitment, @depositor, @value, @block, @log_index, @tx, @ts)
      ON CONFLICT(label) DO UPDATE SET block = excluded.block, log_index = excluded.log_index, tx = excluded.tx, ts = excluded.ts
    `).run(row);
  }

  pendingDepositsBefore(ts: number): DepositRow[] {
    return this.db.prepare(`SELECT * FROM deposits WHERE status = 'pending' AND ts <= ? ORDER BY block, log_index`)
      .all(ts) as DepositRow[];
  }

  decideDeposit(label: string, status: DepositStatus, reason: string | null) {
    this.db.prepare('UPDATE deposits SET status = ?, decided_at = ?, reason = ? WHERE label = ?')
      .run(status, Math.floor(Date.now() / 1000), reason, label);
  }

  approvedLabels(): string[] {
    return (this.db.prepare(`SELECT label FROM deposits WHERE status = 'approved' ORDER BY block, log_index`)
      .all() as { label: string }[]).map((r) => r.label);
  }

  deposit(label: string): DepositRow | undefined {
    return this.db.prepare('SELECT * FROM deposits WHERE label = ?').get(label) as DepositRow | undefined;
  }

  deposits(): DepositRow[] {
    return this.db.prepare('SELECT * FROM deposits ORDER BY block, log_index').all() as DepositRow[];
  }

  /* ---------- state tree ---------- */

  upsertLeaf(row: LeafRow) {
    this.db.prepare(`
      INSERT INTO leaves(idx, leaf, root, block, tx) VALUES (@idx, @leaf, @root, @block, @tx)
      ON CONFLICT(idx) DO UPDATE SET leaf = excluded.leaf, root = excluded.root, block = excluded.block, tx = excluded.tx
    `).run(row);
  }

  leaves(): LeafRow[] {
    return this.db.prepare('SELECT * FROM leaves ORDER BY idx').all() as LeafRow[];
  }

  leafCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM leaves').get() as { n: number };
    return row.n;
  }

  latestLeaf(): LeafRow | undefined {
    return this.db.prepare('SELECT * FROM leaves ORDER BY idx DESC LIMIT 1').get() as LeafRow | undefined;
  }

  /* ---------- withdrawals / ragequits ---------- */

  upsertWithdrawal(row: WithdrawalRow) {
    this.db.prepare(`
      INSERT INTO withdrawals(nullifier, new_commitment, value, processooor, block, log_index, tx)
      VALUES (@nullifier, @new_commitment, @value, @processooor, @block, @log_index, @tx)
      ON CONFLICT(nullifier) DO NOTHING
    `).run(row);
  }

  withdrawals(): WithdrawalRow[] {
    return this.db.prepare('SELECT * FROM withdrawals ORDER BY block, log_index').all() as WithdrawalRow[];
  }

  upsertRagequit(row: RagequitRow) {
    this.db.prepare(`
      INSERT INTO ragequits(label, commitment, ragequitter, value, block, tx)
      VALUES (@label, @commitment, @ragequitter, @value, @block, @tx)
      ON CONFLICT(label) DO NOTHING
    `).run(row);
  }

  ragequits(): RagequitRow[] {
    return this.db.prepare('SELECT * FROM ragequits ORDER BY block').all() as RagequitRow[];
  }

  /* ---------- association set ---------- */

  upsertAspRoot(row: AspRootRow) {
    this.db.prepare(`
      INSERT INTO asp_roots(root, cid, ts, block, tx) VALUES (@root, @cid, @ts, @block, @tx)
      ON CONFLICT(root) DO UPDATE SET cid = excluded.cid, ts = excluded.ts,
        block = COALESCE(excluded.block, asp_roots.block), tx = COALESCE(excluded.tx, asp_roots.tx)
    `).run(row);
  }

  latestAspRoot(): AspRootRow | undefined {
    return this.db.prepare('SELECT * FROM asp_roots ORDER BY ts DESC, block DESC LIMIT 1').get() as
      | AspRootRow
      | undefined;
  }

  saveAspSet(cid: string, root: string, body: string) {
    this.db.prepare(`INSERT INTO asp_sets(cid, root, body, created) VALUES (?, ?, ?, ?) ON CONFLICT(cid) DO NOTHING`)
      .run(cid, root, body, Math.floor(Date.now() / 1000));
  }

  aspSet(cid: string): string | undefined {
    const row = this.db.prepare('SELECT body FROM asp_sets WHERE cid = ?').get(cid) as { body: string } | undefined;
    return row?.body;
  }

  aspSetByRoot(root: string): { cid: string; body: string } | undefined {
    return this.db.prepare('SELECT cid, body FROM asp_sets WHERE root = ? ORDER BY created DESC LIMIT 1').get(root) as
      | { cid: string; body: string }
      | undefined;
  }

  /* ---------- book / doorstep ---------- */

  upsertPost(row: PostRow) {
    this.db.prepare(`
      INSERT INTO posts(id, reply_to, burned, text, block, tx, ts) VALUES (@id, @reply_to, @burned, @text, @block, @tx, @ts)
      ON CONFLICT(id) DO NOTHING
    `).run(row);
  }

  posts(before: number | undefined, limit: number): PostRow[] {
    if (before === undefined) {
      return this.db.prepare('SELECT * FROM posts ORDER BY id DESC LIMIT ?').all(limit) as PostRow[];
    }
    return this.db.prepare('SELECT * FROM posts WHERE id < ? ORDER BY id DESC LIMIT ?').all(before, limit) as PostRow[];
  }

  replies(id: number, limit: number): PostRow[] {
    return this.db.prepare('SELECT * FROM posts WHERE reply_to = ? ORDER BY id ASC LIMIT ?').all(id, limit) as PostRow[];
  }

  upsertDelivery(row: DeliveryRow) {
    this.db.prepare(`
      INSERT INTO deliveries(id, door, burned, text, cipher, block, tx, ts)
      VALUES (@id, @door, @burned, @text, @cipher, @block, @tx, @ts)
      ON CONFLICT(id) DO NOTHING
    `).run(row);
  }

  deliveriesFor(door: string, before: number | undefined, limit: number): DeliveryRow[] {
    if (before === undefined) {
      return this.db.prepare('SELECT * FROM deliveries WHERE door = ? ORDER BY id DESC LIMIT ?')
        .all(door, limit) as DeliveryRow[];
    }
    return this.db.prepare('SELECT * FROM deliveries WHERE door = ? AND id < ? ORDER BY id DESC LIMIT ?')
      .all(door, before, limit) as DeliveryRow[];
  }

  /* ---------- relayer ---------- */

  createRelayRequest(id: string, target: string) {
    this.db.prepare(`INSERT INTO relay_requests(id, created, status, target) VALUES (?, ?, 'received', ?)`)
      .run(id, Math.floor(Date.now() / 1000), target);
  }

  finishRelayRequest(id: string, status: 'broadcast' | 'failed', tx: string | null, error: string | null) {
    this.db.prepare('UPDATE relay_requests SET status = ?, tx = ?, error = ? WHERE id = ?').run(status, tx, error, id);
  }

  relayRequest(id: string): RelayRequestRow | undefined {
    return this.db.prepare('SELECT * FROM relay_requests WHERE id = ?').get(id) as RelayRequestRow | undefined;
  }

  /** Totals computed in JS with BigInt; chain values are decimal strings in SQLite. */
  aggregate() {
    const sum = (rows: { v: string }[]) => rows.reduce((a, r) => a + BigInt(r.v), 0n);
    const dayAgo = Math.floor(Date.now() / 1000) - 86_400;
    const deposits = this.db.prepare('SELECT value AS v FROM deposits').all() as { v: string }[];
    const withdrawals = this.db.prepare('SELECT value AS v FROM withdrawals').all() as { v: string }[];
    const ragequits = this.db.prepare('SELECT value AS v FROM ragequits').all() as { v: string }[];
    const postBurns = this.db.prepare('SELECT burned AS v, ts FROM posts').all() as { v: string; ts: number }[];
    const doorBurns = this.db.prepare('SELECT burned AS v, ts FROM deliveries').all() as { v: string; ts: number }[];
    const burns = [...postBurns, ...doorBurns];
    const largest = burns.reduce((m, r) => (BigInt(r.v) > m ? BigInt(r.v) : m), 0n);
    const n = (sql: string) => (this.db.prepare(sql).get() as { n: number }).n;
    const latestRoot = this.latestAspRoot();
    return {
      deposits: deposits.length,
      approved: n(`SELECT COUNT(*) AS n FROM deposits WHERE status = 'approved'`),
      pending: n(`SELECT COUNT(*) AS n FROM deposits WHERE status = 'pending'`),
      rejected: n(`SELECT COUNT(*) AS n FROM deposits WHERE status = 'rejected'`),
      totalDeposited: sum(deposits).toString(),
      totalWithdrawn: sum(withdrawals).toString(),
      totalRagequit: sum(ragequits).toString(),
      inPool: (sum(deposits) - sum(withdrawals) - sum(ragequits)).toString(),
      withdrawals: withdrawals.length,
      posts: postBurns.length,
      posts24h: postBurns.filter((r) => r.ts >= dayAgo).length,
      deliveries: doorBurns.length,
      deliveries24h: doorBurns.filter((r) => r.ts >= dayAgo).length,
      totalBurned: sum(burns).toString(),
      burned24h: sum(burns.filter((r) => r.ts >= dayAgo)).toString(),
      largestBurn: largest.toString(),
      lastRootAt: latestRoot?.ts ?? null,
      lastRoot: latestRoot?.root ?? null,
    };
  }

  stats() {
    const n = (sql: string) => (this.db.prepare(sql).get() as { n: number }).n;
    return {
      deposits: n('SELECT COUNT(*) AS n FROM deposits'),
      approved: n(`SELECT COUNT(*) AS n FROM deposits WHERE status = 'approved'`),
      pending: n(`SELECT COUNT(*) AS n FROM deposits WHERE status = 'pending'`),
      withdrawals: n('SELECT COUNT(*) AS n FROM withdrawals'),
      ragequits: n('SELECT COUNT(*) AS n FROM ragequits'),
      posts: n('SELECT COUNT(*) AS n FROM posts'),
      deliveries: n('SELECT COUNT(*) AS n FROM deliveries'),
    };
  }
}
