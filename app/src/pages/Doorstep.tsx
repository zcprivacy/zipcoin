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
      <div className="page pad">
        {zip.poolError ? <div className="alert alert-bad">The Zipcoin node is unreachable.</div> : <p className="muted mono"><span className="spin" />Connecting to the Zipcoin node</p>}
      </div>
    );
  }
  const s = zip.stats;
  const minBurn = pool.params.doorstep ? fmtZC(pool.params.doorstep.minBurn, 0) : '…';
  return (
    <main>
      <div className="page-head pad">
        <div>
          <span className="eyebrow">04 · The Doorstep · live</span>
          <h1 className="h1">A line at one door. No sender.</h1>
        </div>
        <p className="page-sub">Leave a line at any address, paid for with a burn. The door's owner sees the message and the burn. Nobody sees who knocked. Snowmoon, chapter 20: he had no way to prove that he was someone to talk to, except perhaps for burning a hundred zipcoins at his doorstep.</p>
      </div>
      <StatsStrip
        items={[
          { k: 'Deliveries', v: String(s?.deliveries ?? '…'), d: `${s?.deliveries24h ?? 0} today` },
          { k: 'Minimum per knock', v: minBurn, unit: 'ZC' },
          { k: 'Anonymity set', v: String(s?.approved ?? '…'), d: 'approved deposits' },
        ]}
      />
      <section className="split w57">
        <div className="col"><Doors /></div>
        <div className="col ink"><Leave doorstep={pool.spenders.doorstep} /></div>
      </section>
    </main>
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
    <div className="card">
      <label className="field">
        <span>Which door</span>
        <div className="input-row">
          <input className="input" value={lookup} onChange={(e) => setLookup(e.target.value.trim())} placeholder={address ?? '0x…'} />
          <button className="btn btn-ink" onClick={() => void q.refetch()}>Open</button>
        </div>
      </label>
      <div className="ledger" style={{ '--cols': '1fr 150px 120px' } as React.CSSProperties}>
        <div className="ledger-head"><span>Deliveries at this door</span><span>Burned</span><span className="right">Block</span></div>
      </div>
      {!isAddress(viewing) && <div className="empty"><b>Pick a door.</b><span className="light">Connect a wallet to see your own, or enter any address.</span></div>}
      {isAddress(viewing) && q.data?.deliveries.length === 0 && <div className="empty"><b>No one has knocked here yet.</b><span className="light">Every door on Ethereum starts like this. A delivery shows the line, the burn and the block. Never the sender.</span></div>}
      <ol className="feed">
        {q.data?.deliveries.map((d) => (
          <li className="feed-item" key={d.id} style={{ gridTemplateColumns: '56px 1fr 150px 120px' }}>
            <span className="no">{d.id}</span>
            <div>
              <p className="msg">{d.text || <span className="muted">sealed message</span>}</p>
              <div className="meta">
                <span>{ago(d.ts)}</span>
                {zip.explorer(d.tx) ? <a href={zip.explorer(d.tx)!} target="_blank" rel="noopener">{short(d.tx, 5)}</a> : <span>{short(d.tx, 5)}</span>}
              </div>
            </div>
            <span className="burn">{fmtZC(d.burned, 0)} ZC</span>
            <span className="blk">{d.block ? d.block.toLocaleString('en-US') : 'pending'}</span>
          </li>
        ))}
      </ol>
      <p className="fine">Owners can pin a reply by signing a message; it costs nothing and is shown beside the deliveries. Coming with the next release of the app.</p>
    </div>
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
    <div className="card">
      <div className="card-head"><h2>Knock</h2><span className="tag">from a note</span></div>
      {!doorstep && <p className="muted">The Doorstep is not deployed on this network yet.</p>}
      {doorstep && !ready && params.data && <SpendGate gate={gate} minBurn={minBurn} delaySeconds={asp.data?.delaySeconds} action="Leaving a message" />}
      {doorstep && ready && (
        <div className="stack">
          <label className="field">
            <span>Door address</span>
            <input className="input" value={door} onChange={(e) => setDoor(e.target.value.trim())} placeholder="0x…" disabled={!!progress} />
          </label>
          <label className="field">
            <span>Your line · up to {params.data?.maxText ?? 280} bytes · {bytes} used · public</span>
            <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your message" disabled={!!progress} />
          </label>
          <label className="field">
            <span className="row" style={{ justifyContent: 'space-between' }}>
              <span>Burn · ZC</span>
              <button className="link" onClick={() => setBurnInput(fmtZC(gate.maxBurn, 3).replace(/,/g, ''))} disabled={!!progress}>max {fmtZC(gate.maxBurn, 2)}</button>
            </span>
            <input className="input big num" inputMode="decimal" value={burnInput} placeholder={fmtZC(minBurn)} onChange={(e) => setBurnInput(e.target.value)} disabled={!!progress} />
          </label>
          <div className="receipt">
            <div><span>burned · to the furnace</span><span>{fmtZC(gate.burned, 3)} ZC</span></div>
            <div><span>relayer fee · {Number(feeBps) / 100}%</span><span>{fmtZC(gate.gross - gate.burned, 3)} ZC</span></div>
            <div><span>taken from note</span><span>{fmtZC(gate.gross, 3)} of {fmtZC(gate.note.value)} ZC</span></div>
            <div><span>sealed field</span><span>reserved · not yet used by the app</span></div>
            <div><span>the door sees</span><span>the line, the burn, the block</span></div>
          </div>
          <p className="fine">Spends from your pool balance ({fmtZC(gate.approvedTotal)} ZC approved), never from your wallet. Minimum burn {fmtZC(minBurn)} ZC.</p>
          {progress ? (
            <ProofProgress message={progress} />
          ) : (
            <button className="btn btn-ink btn-big" disabled={!isAddress(door) || !text.trim() || wantBurn < minBurn || wantBurn > gate.maxBurn} onClick={() => void go()}>Burn and knock</button>
          )}
        </div>
      )}
      {result && <div className="alert alert-ok">Delivered. {zip.explorer(result) ? <a href={zip.explorer(result)!} target="_blank" rel="noopener">View transaction</a> : <code className="fine">{short(result, 8)}</code>}</div>}
      {error && <div className="alert alert-bad">{error}</div>}
    </div>
  );
}
