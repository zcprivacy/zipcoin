import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { isAddress, type Address, type Hex } from 'viem';
import { useAccount } from 'wagmi';

import { ProofProgress } from '../components/ProofProgress';
import { SpendGate } from '../components/SpendGate';
import { StatsStrip } from '../components/StatsStrip';
import { api } from '../lib/api';
import { ago, fmtZC, parseZC, short } from '../lib/format';
import { planBurn } from '../lib/plan';
import { encodeDelivery, encodeInstruction, spend } from '../lib/zip';
import { useZip } from '../state';

export default function Doorstep() {
  const zip = useZip();
  const pool = zip.pool;
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
          <p className="eyebrow">The Doorstep</p>
          <h1 className="page-h">A message at one door. <em>No sender.</em></h1>
          <p className="page-sub">Leave a line at any address, paid for with a burn. The door's owner sees the message and the burn. Nobody sees who left it. The sealed field is reserved and not yet used by the app.</p>
        </div>
      </div>
      <StatsStrip
        items={[
          { k: 'Deliveries', v: String(s?.deliveries ?? '…'), d: `${s?.deliveries24h ?? 0} today` },
          { k: 'Burned at doors', v: fmtZC(s?.totalBurned ?? '0', 0), unit: 'ZC', d: 'Book and Doorstep together', ember: true },
          { k: 'Anonymity set', v: String(s?.approved ?? '…'), d: 'approved deposits' },
        ]}
      />
      <div className="cols cols-feed">
        <Doors />
        <div className="sticky"><Leave doorstep={pool.spenders.doorstep} /></div>
      </div>
    </div>
  );
}

function Doors() {
  const zip = useZip();
  const { address } = useAccount();
  const [lookup, setLookup] = useState('');
  const viewing = (lookup || address || '').toLowerCase();
  const q = useQuery({ queryKey: ['deliveries', viewing], enabled: isAddress(viewing), queryFn: () => api.deliveries(viewing), staleTime: 15_000, refetchInterval: 20_000 });
  useEffect(() => zip.onLive((e) => e.type === 'delivery' && e.delivery.door === viewing && void q.refetch()), [zip, q, viewing]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>At the door</h2>
        <span className="fine">{zip.nodeOk ? 'live' : 'offline'}</span>
      </div>
      <label className="field">
        Address to view
        <input className="input mono" value={lookup} onChange={(e) => setLookup(e.target.value.trim())} placeholder={address ?? '0x…'} />
      </label>
      <div style={{ marginTop: '.9rem' }}>
        {!isAddress(viewing) && <div className="empty">Connect a wallet or enter an address to see its doorstep.</div>}
        {isAddress(viewing) && q.data?.deliveries.length === 0 && <div className="empty">Nothing at {short(viewing)} yet.</div>}
        <ol className="feed">
          {q.data?.deliveries.map((d) => (
            <li className="feed-item" key={d.id}>
              <div className="burn"><span className="num">{fmtZC(d.burned, 0)} zc</span><small>burned</small></div>
              <div>
                <p className="msg">{d.text || <span className="muted">sealed message</span>}</p>
                <div className="meta">
                  <span>#{d.id}</span><span>{ago(d.ts)}</span>
                  {zip.explorer(d.tx) ? <a href={zip.explorer(d.tx)!} target="_blank" rel="noopener">{short(d.tx, 5)}</a> : <span>{short(d.tx, 5)}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Leave({ doorstep }: { doorstep: Address | null }) {
  const zip = useZip();
  const asp = useQuery({ queryKey: ['asp-meta'], queryFn: api.asp, staleTime: 300_000 });
  const params = useMemo(() => {
    const p = zip.pool?.params.doorstep;
    return p ? { data: { minBurn: BigInt(p.minBurn), maxText: Number(p.maxTextBytes) } } : { data: undefined };
  }, [zip.pool]);
  const feeBps = BigInt(zip.relayer?.feeBps ?? 0);
  const minBurn = params.data?.minBurn ?? 0n;

  const [door, setDoor] = useState('');
  const [text, setText] = useState('');
  const [burnInput, setBurnInput] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wantBurn = burnInput ? parseZC(burnInput) : minBurn;
  const gate = useMemo(() => planBurn(zip.account, feeBps, minBurn, wantBurn), [zip.account, feeBps, minBurn, wantBurn]);
  const bytes = new TextEncoder().encode(text).length;
  const ready = gate.kind === 'ready';

  const go = async () => {
    setError(null);
    setResult(null);
    if (gate.kind !== 'ready' || !zip.account || !zip.relayer || !doorstep) return;
    try {
      if (!isAddress(door)) throw new Error('enter the door address');
      if (!text.trim()) throw new Error('write something to leave at the door');
      if (params.data && bytes > params.data.maxText) throw new Error(`messages are limited to ${params.data.maxText} bytes`);
      if (wantBurn < minBurn) throw new Error(`the minimum burn is ${fmtZC(minBurn)} ZC`);
      if (wantBurn > gate.maxBurn) throw new Error(`your largest note allows a burn of at most ${fmtZC(gate.maxBurn, 3)} ZC`);
      const data = encodeInstruction(zip.relayer, encodeDelivery(door as Address, text, '0x'));
      const r = await spend(zip.account.service, gate.note, zip.account.scope, doorstep, data, gate.gross, setProgress);
      setResult(r.txHash);
      setText('');
      setBurnInput('');
      setTimeout(() => void zip.refresh(), 6000);
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="card">
      <div className="card-head"><h2>Leave a message</h2></div>
      {!doorstep && <p className="muted">The Doorstep is not deployed on this network yet.</p>}
      {doorstep && !ready && params.data && <SpendGate gate={gate} minBurn={minBurn} delaySeconds={asp.data?.delaySeconds} action="Leaving a message" />}
      {doorstep && ready && (
        <div className="stack">
          <label className="field">
            Door address
            <input className="input mono" value={door} onChange={(e) => setDoor(e.target.value.trim())} placeholder="0x…" disabled={!!progress} />
          </label>
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your message" disabled={!!progress} />
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
            <button className="btn btn-primary" disabled={!isAddress(door) || !text.trim() || wantBurn < minBurn || wantBurn > gate.maxBurn} onClick={() => void go()}>Burn and deliver</button>
          )}
        </div>
      )}
      {result && <div className="alert alert-ok" style={{ marginTop: '.75rem' }}>Delivered. {zip.explorer(result) ? <a href={zip.explorer(result)!} target="_blank" rel="noopener">View transaction</a> : <code className="fine">{short(result, 8)}</code>}</div>}
      {error && <div className="alert alert-bad" style={{ marginTop: '.75rem' }}>{error}</div>}
    </section>
  );
}
