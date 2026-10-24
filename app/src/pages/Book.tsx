import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { Hex } from 'viem';

import { ProofProgress } from '../components/ProofProgress';
import { SpendGate } from '../components/SpendGate';
import { StatsStrip } from '../components/StatsStrip';
import { api, type Post } from '../lib/api';
import { ago, fmtZC, parseZC, short } from '../lib/format';
import { planBurn } from '../lib/plan';
import { encodeBookPost, encodeInstruction, spend } from '../lib/zip';
import { useZip } from '../state';

export default function Book() {
  const zip = useZip();
  const pool = zip.pool;
  const book = pool?.spenders.book ?? null;
  const [replyTo, setReplyTo] = useState<Post | null>(null);

  if (!pool) {
    return (
      <div className="wrap page">
        {zip.poolError ? <div className="alert alert-bad">The Zipcoin node is unreachable.</div> : <p className="muted"><span className="spin" />Connecting to the Zipcoin node</p>}
      </div>
    );
  }
  const s = zip.stats;
  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <p className="eyebrow">The Book</p>
          <h1 className="page-h">Burn to speak. <em>Nobody signs.</em></h1>
          <p className="page-sub">Every entry is a private withdrawal that burned ZC. The text is permanent and public. The author cannot be proven, because the proof names no deposit.</p>
        </div>
      </div>
      <StatsStrip
        items={[
          { k: 'Burned to speak', v: fmtZC(s?.totalBurned ?? '0', 0), unit: 'ZC', d: `${fmtZC(s?.burned24h ?? '0', 0)} ZC in the last 24h`, ember: true },
          { k: 'Entries', v: String(s?.posts ?? '…'), d: `${s?.posts24h ?? 0} today` },
          { k: 'Largest burn', v: fmtZC(s?.largestBurn ?? '0', 0), unit: 'ZC' },
          { k: 'Anonymity set', v: String(s?.approved ?? '…'), d: 'approved deposits' },
        ]}
      />
      <div className="cols cols-feed">
        <Feed book={!!book} onReply={setReplyTo} />
        <div className="sticky">
          <Compose book={book} replyTo={replyTo} clearReply={() => setReplyTo(null)} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- feed ---------------- */

function Feed({ book, onReply }: { book: boolean; onReply: (p: Post) => void }) {
  const zip = useZip();
  // Polling is the floor; the live stream makes it instant when it is available.
  const feed = useQuery({ queryKey: ['posts'], queryFn: () => api.posts(), staleTime: 15_000, refetchInterval: 20_000 });
  const [sort, setSort] = useState<'new' | 'burn'>('new');
  const [incoming, setIncoming] = useState<Post[]>([]);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<Set<number>>(new Set());

  useEffect(
    () =>
      zip.onLive((e) => {
        if (e.type !== 'post') return;
        const p: Post = { ...e.post, block: 0, tx: e.post.tx as Hex };
        setIncoming((list) => (list.some((x) => x.id === p.id) ? list : [p, ...list]));
      }),
    [zip],
  );

  const merge = () => {
    const ids = new Set(incoming.map((p) => p.id));
    setFlash(ids);
    setIncoming([]);
    void feed.refetch();
    setTimeout(() => setFlash(new Set()), 2000);
  };

  const posts = useMemo(() => {
    const all = [...(feed.data?.posts ?? [])];
    const top = all.filter((p) => p.reply_to === 0);
    if (sort === 'burn') top.sort((a, b) => (BigInt(a.burned) < BigInt(b.burned) ? 1 : -1));
    return top;
  }, [feed.data, sort]);
  const replyCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of feed.data?.posts ?? []) if (p.reply_to) m.set(p.reply_to, (m.get(p.reply_to) ?? 0) + 1);
    return m;
  }, [feed.data]);
  const largest = BigInt(zip.stats?.largestBurn ?? '0');
  const weight = (burned: string) => {
    if (largest === 0n) return 'w1';
    const r = Number((BigInt(burned) * 100n) / largest);
    return r >= 66 ? 'w3' : r >= 33 ? 'w2' : 'w1';
  };

  return (
    <section className="card">
      <div className="feed-tools">
        <div className="seg">
          <button className={sort === 'new' ? 'is-on' : ''} onClick={() => setSort('new')}>Newest</button>
          <button className={sort === 'burn' ? 'is-on' : ''} onClick={() => setSort('burn')}>Most burned</button>
        </div>
        {incoming.length > 0 ? (
          <button className="pill" onClick={merge}>{incoming.length} new {incoming.length === 1 ? 'entry' : 'entries'}</button>
        ) : (
          <span className="fine">{zip.nodeOk ? 'live' : 'offline'}</span>
        )}
      </div>
      {!book && <p className="muted">The Book is not deployed on this network yet.</p>}
      {feed.isLoading && <div className="stack"><div className="skeleton" /><div className="skeleton" style={{ width: '70%' }} /></div>}
      {feed.data && posts.length === 0 && <div className="empty">Nothing has been said yet. The first burn writes the first line.</div>}
      <ol className="feed">
        {posts.map((p) => (
          <li key={p.id} className={`feed-item ${weight(p.burned)}${flash.has(p.id) ? ' is-new' : ''}`}>
            <div className="burn">
              <span className="num">{fmtZC(p.burned, 0)} zc</span>
              <small>burned</small>
              <span className="burn-bar" style={{ width: `${Math.max(12, Math.min(100, largest ? Number((BigInt(p.burned) * 100n) / largest) : 0))}%` }} />
            </div>
            <div>
              <p className="msg">{p.text}</p>
              <div className="meta">
                <span>#{p.id}</span>
                <span>{ago(p.ts)}</span>
                {zip.explorer(p.tx) ? <a href={zip.explorer(p.tx)!} target="_blank" rel="noopener">{short(p.tx, 5)}</a> : <span>{short(p.tx, 5)}</span>}
                <button className="link" style={{ fontSize: 'inherit' }} onClick={() => onReply(p)}>reply</button>
                {(replyCount.get(p.id) ?? 0) > 0 && (
                  <button className="link" style={{ fontSize: 'inherit' }} onClick={() => setOpen((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}>
                    {open.has(p.id) ? 'hide' : `${replyCount.get(p.id)} ${replyCount.get(p.id) === 1 ? 'reply' : 'replies'}`}
                  </button>
                )}
              </div>
              {open.has(p.id) && (
                <div className="thread">
                  {(feed.data?.posts ?? []).filter((r) => r.reply_to === p.id).sort((a, b) => a.id - b.id).map((r) => (
                    <div key={r.id}>
                      <p className="msg">{r.text}</p>
                      <div className="meta"><span>#{r.id}</span><span>{fmtZC(r.burned, 0)} zc burned</span><span>{ago(r.ts)}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- compose ---------------- */

function Compose({ book, replyTo, clearReply }: { book: `0x${string}` | null; replyTo: Post | null; clearReply: () => void }) {
  const zip = useZip();
  const asp = useQuery({ queryKey: ['asp-meta'], queryFn: api.asp, staleTime: 300_000 });
  // Spender constants come from the node, which read them once from chain; no browser RPC call.
  const params = useMemo(() => {
    const p = zip.pool?.params.book;
    return p ? { data: { minBurn: BigInt(p.minBurn), maxText: Number(p.maxTextBytes) } } : { data: undefined };
  }, [zip.pool]);
  const feeBps = BigInt(zip.relayer?.feeBps ?? 0);
  const minBurn = params.data?.minBurn ?? 0n;

  const [text, setText] = useState('');
  const [burnInput, setBurnInput] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wantBurn = burnInput ? parseZC(burnInput) : minBurn;
  const gate = useMemo(() => planBurn(zip.account, feeBps, minBurn, wantBurn), [zip.account, feeBps, minBurn, wantBurn]);
  const bytes = new TextEncoder().encode(text).length;
  const ready = gate.kind === 'ready';

  const post = async () => {
    setError(null);
    setResult(null);
    if (gate.kind !== 'ready' || !zip.account || !zip.relayer || !book) return;
    try {
      if (bytes === 0) throw new Error('write something first');
      if (params.data && bytes > params.data.maxText) throw new Error(`entries are limited to ${params.data.maxText} bytes`);
      if (wantBurn < minBurn) throw new Error(`the minimum burn is ${fmtZC(minBurn)} ZC`);
      if (wantBurn > gate.maxBurn) throw new Error(`your largest note allows a burn of at most ${fmtZC(gate.maxBurn, 3)} ZC`);
      const data = encodeInstruction(zip.relayer, encodeBookPost(BigInt(replyTo?.id ?? 0), text));
      const r = await spend(zip.account.service, gate.note, zip.account.scope, book, data, gate.gross, setProgress);
      setResult(r.txHash);
      setText('');
      setBurnInput('');
      clearReply();
      setTimeout(() => void zip.refresh(), 6000);
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="card">
      <div className="card-head"><h2>{replyTo ? `Reply to #${replyTo.id}` : 'Write'}</h2>{replyTo && <button className="btn btn-sm" onClick={clearReply}>cancel</button>}</div>
      {replyTo && <p className="fine" style={{ marginBottom: '.75rem' }}>“{replyTo.text.slice(0, 120)}{replyTo.text.length > 120 ? '…' : ''}”</p>}
      {!book && <p className="muted">The Book is not deployed on this network yet.</p>}
      {book && !ready && params.data && <SpendGate gate={gate} minBurn={minBurn} delaySeconds={asp.data?.delaySeconds} action="Posting" />}
      {book && ready && (
        <div className="stack">
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="What the pool will say for you" disabled={!!progress} />
          <p className="fine num">{bytes}{params.data ? ` / ${params.data.maxText}` : ''} bytes</p>
          <label className="field">
            <span className="row" style={{ justifyContent: 'space-between' }}>
              <span>Burn (ZC)</span>
              <button className="link" style={{ fontSize: '.8rem' }} onClick={() => setBurnInput(fmtZC(gate.maxBurn, 3).replace(/,/g, ''))} disabled={!!progress}>max {fmtZC(gate.maxBurn, 2)}</button>
            </span>
            <input className="input num" inputMode="decimal" value={burnInput} placeholder={fmtZC(minBurn)} onChange={(e) => setBurnInput(e.target.value)} disabled={!!progress} />
          </label>
          <dl className="kv">
            <dt>Burned</dt><dd className="num">{fmtZC(gate.burned, 3)} ZC</dd>
            <dt>Relay fee</dt><dd className="num">{Number(feeBps) / 100}% · {fmtZC(gate.gross - gate.burned, 3)} ZC</dd>
            <dt>Taken from note</dt><dd className="num">{fmtZC(gate.gross, 3)} ZC of {fmtZC(gate.note.value)} ZC</dd>
            <dt>Note after</dt><dd className="num">{fmtZC(gate.note.value - gate.gross, 3)} ZC</dd>
          </dl>
          <p className="fine">Spends from your pool balance ({fmtZC(gate.approvedTotal)} ZC approved), never from your wallet. Minimum burn {fmtZC(minBurn)} ZC.</p>
          {progress ? (
            <ProofProgress message={progress} />
          ) : (
            <button className="btn btn-primary" disabled={bytes === 0 || wantBurn < minBurn || wantBurn > gate.maxBurn} onClick={() => void post()}>Burn and post</button>
          )}
        </div>
      )}
      {result && (
        <div className="alert alert-ok" style={{ marginTop: '.75rem' }}>
          Posted. {zip.explorer(result) ? <a href={zip.explorer(result)!} target="_blank" rel="noopener">View transaction</a> : <code className="fine">{short(result, 8)}</code>}
        </div>
      )}
      {error && <div className="alert alert-bad" style={{ marginTop: '.75rem' }}>{error}</div>}
    </section>
  );
}
