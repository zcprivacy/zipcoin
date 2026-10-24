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

/** The receipt demo: what you see versus what the chain sees. */
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
    <div className="demo" id="demo">
      <div className="pane pane-you">
        <div className="pane-head"><span className="eyebrow">What you see</span><span className="eyebrow">Receipt</span></div>
        <div className="receipt">
          <div className="receipt-row"><span>Payee</span><span>The Lantern Café</span></div>
          <div className="amount">
            <label htmlFor="amt"><span>Amount</span><output className="num">{fmt(amount)} zc</output></label>
            <input id="amt" type="range" min="1" max="60" step="0.5" value={amount} aria-label="Payment amount in ZC" onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="receipt-row"><span>Base</span><span className="num">{fmt(amount)} zc</span></div>
          <div className="receipt-row"><span>Tax</span><span className="num">{fmt(tax)} zc</span></div>
          <div className="receipt-row total"><span>Total</span><span className="num">{fmt(total)} zc</span></div>
          <p className="receipt-note">Tax follows the receipt in Snowmoon (10.5 base, 1.1 tax). Paying it privately in real time is a Phase VII item.</p>
        </div>
      </div>
      <div className="pane pane-chain">
        <div className="pane-head">
          <span className="eyebrow">What the chain sees</span>
          <button className="tiny-btn" type="button" onClick={() => setNote({ secret: randHex(16), nullifier: randHex(16), label: randHex(8) })}>New note</button>
        </div>
        <p className="chain-split">Public</p>
        <dl className="chain">
          <div><dt>withdrawnValue</dt><dd className="pub num">{fmt(total)} ZC</dd></div>
          <div><dt>recipient</dt><dd className="pub">café</dd></div>
          <div><dt>nullifierHash</dt><dd className="hex" title={hashes.nul}>{hashes.nul.startsWith('0x') ? shortHex(hashes.nul) : '…'}</dd></div>
          <div><dt>newCommitment</dt><dd className="hex" title={hashes.commit}>{hashes.commit.startsWith('0x') ? shortHex(hashes.commit) : '…'}</dd></div>
          <div><dt>stateRoot</dt><dd className="hex" title={hashes.root}>{hashes.root.startsWith('0x') ? shortHex(hashes.root) : '…'}</dd></div>
        </dl>
        <p className="chain-split">Not there</p>
        <dl className="chain">
          <div><dt>depositor</dt><dd className="hid">hidden</dd></div>
          <div><dt>source note</dt><dd className="hid">one of every approved deposit</dd></div>
          <div><dt>remaining balance</dt><dd className="hid">hidden inside newCommitment</dd></div>
        </dl>
        <p className="fine" style={{ padding: '.9rem 1.1rem 1.1rem' }}>Hashes above are SHA-256 for illustration. The protocol uses Poseidon over BN254 and the proof is verified on-chain with Groth16.</p>
      </div>
    </div>
  );
}
