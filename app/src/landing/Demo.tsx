import { useEffect, useState } from 'react';

const RATE = 1.1 / 10.5;

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function randHex(n: number) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}
async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return '0x' + Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
const shortHex = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

/** The receipt, two ways: what you see versus what the chain sees. */
export function Demo() {
  const [amount, setAmount] = useState(10.5);
  const [note, setNote] = useState(() => ({ secret: randHex(16), nullifier: randHex(16), label: randHex(8) }));
  const [hashes, setHashes] = useState({ nul: '…', commit: '…', root: '…' });
  const tax = amount * RATE;
  const total = amount + tax;

  useEffect(() => {
    let alive = true;
    (async () => {
      const nul = await sha(`nullifier|${note.nullifier}`);
      const pre = await sha(`nullifier|${note.nullifier}|${note.secret}`);
      const commit = await sha(`commitment|change|${note.label}|${pre}|${fmt(total)}`);
      const root = await sha(`root|${note.label}|${note.secret}`);
      if (alive) setHashes({ nul, commit, root });
    })();
    return () => {
      alive = false;
    };
  }, [note, total]);

  return (
    <div className="split" style={{ border: '2px solid var(--ink)', maxWidth: 880 }}>
      <div className="col" style={{ padding: 20, gap: 10, background: 'var(--white)' }}>
        <span className="eyebrow">What you see</span>
        <div className="receipt">
          <div><span>paid to</span><span>a café</span></div>
          <div><span>base</span><span>{fmt(amount)} ZC</span></div>
          <div><span>tax</span><span>{fmt(tax)} ZC</span></div>
          <div><span>total</span><span><b>{fmt(total)} ZC</b></span></div>
        </div>
        <label className="field">
          <span>Amount · {fmt(amount)} ZC</span>
          <input type="range" min="1" max="60" step="0.5" value={amount} aria-label="Payment amount in ZC" onChange={(e) => setAmount(Number(e.target.value))} />
        </label>
        <p className="fine">Tax follows the receipt in Snowmoon, 10.5 base and 1.1 tax. Paying it privately in real time is a Phase VII item.</p>
      </div>
      <div className="col ink" style={{ padding: 20, gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">What the chain sees</span>
          <button className="btn btn-sm" type="button" onClick={() => setNote({ secret: randHex(16), nullifier: randHex(16), label: randHex(8) })}>New note</button>
        </div>
        <div className="receipt">
          <div><span>withdrawnValue</span><span>{fmt(total)} ZC</span></div>
          <div><span>recipient</span><span>a café</span></div>
          <div><span>payer</span><span className="bar" style={{ width: 110 }} /></div>
          <div><span>nullifierHash</span><span title={hashes.nul}>{hashes.nul.startsWith('0x') ? shortHex(hashes.nul) : '…'}</span></div>
          <div><span>newCommitment</span><span title={hashes.commit}>{hashes.commit.startsWith('0x') ? shortHex(hashes.commit) : '…'}</span></div>
          <div><span>source note</span><span className="bar" style={{ width: 80 }} /></div>
          <div><span>remaining balance</span><span className="bar" style={{ width: 60 }} /></div>
        </div>
        <p className="fine">Hashes are SHA-256 for illustration. The protocol uses Poseidon over BN254 and the proof is verified on chain with Groth16.</p>
      </div>
    </div>
  );
}
