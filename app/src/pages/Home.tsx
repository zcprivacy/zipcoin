import { Link } from 'react-router-dom';

import { fmtZC } from '../lib/format';
import { useZip } from '../state';

export default function Home() {
  const zip = useZip();
  const s = zip.stats;
  const inPool = s ? `${fmtZC(s.inPool, 0)} ZC` : '…';
  const burned = s ? fmtZC(s.totalBurned, 0) : '…';

  return (
    <main>
      {/* The two columns of the ledger */}
      <section className="hero" id="top">
        <div className="col pad">
          <span className="eyebrow">Column one · printed on the chain</span>
          <h1 className="h1">The public part.</h1>
          <p className="lead">A deposit is a line in a ledger anyone can read: who, how much, when. Zipcoin keeps that line honest and screens it against a published policy. It is the last line about you that anyone will read.</p>
          <div className="receipt boxed">
            <div><span>deposit</span><span>10,000 ZC</span></div>
            <div><span>from</span><span>a public wallet</span></div>
            <div><span>screened</span><span>policy v1 · approved</span></div>
            <div><span>fee</span><span>0</span></div>
            <div><span>commitment</span><span>0x2c7e…91ab</span></div>
          </div>
          <div className="row">
            <Link className="btn btn-ink btn-big" to="/pool">Enter the shield</Link>
            <Link className="btn btn-big" to="/docs">Read the docs</Link>
          </div>
        </div>
        <div className="col ink pad">
          <span className="eyebrow">Column two · never printed</span>
          <h1 className="h1">The private part.</h1>
          <p className="lead light">Everything after the deposit: what you hold, what you trade, what you pay, what you say. The chain gets an amount and a nullifier. The name column stays blank, forever.</p>
          <div className="receipt boxed">
            <div><span>withdrawal</span><span>1,010.1 ZC</span></div>
            <div><span>from</span><span className="bar" style={{ width: 140 }} /></div>
            <div><span>owner</span><span className="bar" style={{ width: 96 }} /></div>
            <div><span>nullifier</span><span>0x18f4…60c5</span></div>
            <div><span>action</span><span style={{ color: 'var(--amber)' }}>burned 1,000 ZC to speak</span></div>
          </div>
          <div className="row mono" style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', gap: 18 }}>
            <a href="https://github.com/zcprivacy/zipcoin" target="_blank" rel="noopener" style={{ textDecoration: 'none', borderBottom: '1px solid currentColor' }}>GitHub</a>
            <a href="https://x.com/zcprivacy" target="_blank" rel="noopener" style={{ textDecoration: 'none', borderBottom: '1px solid currentColor' }}>X · @zcprivacy</a>
          </div>
        </div>
      </section>

      {/* Feature ledger */}
      <section className="ledger pad rule-b" style={{ '--cols': '72px 1.1fr 2fr 1fr 150px' } as React.CSSProperties}>
        <div className="ledger-head"><span>No.</span><span>Feature</span><span>What it does</span><span>Cost</span><span className="right">Status</span></div>
        <Link className="ledger-row" to="/pool">
          <span className="no">01</span>
          <span className="name">The Pool</span>
          <span className="what">Shield ETH or ZC. Withdraw to a fresh address with no link to the deposit. Ragequit returns a note to its depositor with nobody's approval.</span>
          <span className="cost">0 · relayer gas only</span>
          <span className="status chip-live">Live · {inPool}</span>
        </Link>
        <Link className="ledger-row hi" to="/hook">
          <span className="no">02</span>
          <span className="name">ZipHook</span>
          <span className="what">Markets with a door into the shield. Buy any token straight into its private pool, or swap from an ETH note to a token note with no wallet between. Anyone can open a market.</span>
          <span className="cost">1% per swap · 0.6% providers · 0.4% treasury</span>
          <span className="status chip-building">Building · ZC/ETH first</span>
        </Link>
        <Link className="ledger-row" to="/book">
          <span className="no">03</span>
          <span className="name">The Book</span>
          <span className="what">A public record where a line costs a burn and authorship cannot be proven. The burn is the only signature it accepts.</span>
          <span className="cost">1,000 ZC burned, minimum</span>
          <span className="status chip-live">Live · {s ? `${s.posts} entries` : '…'}</span>
        </Link>
        <Link className="ledger-row" to="/doorstep">
          <span className="no">04</span>
          <span className="name">The Doorstep</span>
          <span className="what">A line left at one address, paid for with a burn. The door's owner sees the message and the burn. Nobody sees who knocked.</span>
          <span className="cost">100 ZC burned, minimum</span>
          <span className="status chip-live">Live · {s ? `${s.deliveries} knocks` : '…'}</span>
        </Link>
      </section>

      {/* ZipHook, drawn */}
      <section className="split pad" style={{ gridTemplateColumns: '4fr 8fr', gap: 32, paddingBlock: 56 }}>
        <div className="stack" style={{ gap: 18, minWidth: 0 }}>
          <span className="eyebrow blue">Next · ZipHook</span>
          <h2 className="h2" style={{ fontSize: 44, lineHeight: 0.98 }}>A market with a door into the shield.</h2>
          <p className="light">Every ZipHook market is a Uniswap v4 pool with our hook on it. The hook sets the pool's fee to 0.6% for liquidity providers, takes 0.4% in ETH for the treasury, and, when a buyer attaches a key, deposits the purchase straight into the token's private pool instead of their wallet.</p>
          <p className="light">From an ETH note you swap into any market and the output lands as a token note. Selling runs the same way back. No wallet appears at any step.</p>
          <Link className="btn btn-big" to="/hook/new" style={{ alignSelf: 'flex-start' }}>Open a market for any token</Link>
        </div>
        <div style={{ minWidth: 0 }}>
          <HookDiagram />
        </div>
      </section>

      {/* Steps */}
      <section className="ledger pad rule-b" style={{ '--cols': '72px 1fr 1fr 2fr' } as React.CSSProperties}>
        <div className="ledger-head"><span>Step</span><span>What happens</span><span>Who can see it</span><span>Detail</span></div>
        <div className="ledger-row"><span className="no">1</span><span className="name" style={{ fontSize: 24 }}>Deposit</span><span className="cost">everyone</span><span className="what" style={{ fontSize: 15 }}>ETH or a token goes into its pool from your wallet. It becomes a note only your zip key can spend. The key is twelve words derived from one wallet signature; nothing is stored.</span></div>
        <div className="ledger-row"><span className="no">2</span><span className="name" style={{ fontSize: 24 }}>Approval</span><span className="cost">everyone · the rule is public</span><span className="what" style={{ fontSize: 15 }}>The deposit is screened against the published policy and its label joins the approved set. A rejected deposit is never stuck: ragequit returns it.</span></div>
        <div className="ledger-row"><span className="no">3</span><span className="name" style={{ fontSize: 24 }}>Prove</span><span className="cost">only you · in your browser</span><span className="what" style={{ fontSize: 15 }}>Your browser proves you own an approved note and binds exactly what you want done: a withdrawal, a swap, a line on the Book. About eight seconds.</span></div>
        <div className="ledger-row" style={{ borderBottom: 0 }}><span className="no">4</span><span className="name" style={{ fontSize: 24 }}>Act</span><span className="cost">everyone sees an amount and a nullifier</span><span className="what" style={{ fontSize: 15 }}>A relayer submits the proof and pays the gas, so no wallet of yours signs. The relayer can only collect the fee you fixed. The chain never learns who.</span></div>
      </section>

      {/* Totals */}
      <section className="totals">
        <div className="total ember"><span className="k">Burned to speak, total</span><span className="v">{burned}<small>ZC</small></span><span className="d">to the furnace, unrecoverable</span></div>
        <div className="total"><span className="k">Deposits in the shield</span><span className="v">{s?.deposits ?? '…'}</span><span className="d">the crowd a withdrawal hides in</span></div>
        <div className="total"><span className="k">Fee the protocol takes from the shield</span><span className="v">0</span><span className="d">the market is taxed, the shield is free</span></div>
      </section>
    </main>
  );
}

/** The flow through a ZipHook market, as one scalable drawing. */
function HookDiagram() {
  const card = (x: number, y: number, w: number, title: string, sub: string, ink = false, stroke?: string) => (
    <g>
      <rect className={ink ? 'card-ink' : 'card-box'} x={x} y={y} width={w} height={72} style={stroke ? { stroke } : undefined} />
      <text x={x + w / 2} y={y + 32} textAnchor="middle" className={ink ? 'on-ink' : ''} fontWeight={700}>{title}</text>
      <text x={x + w / 2} y={y + 52} textAnchor="middle" className={`sub${ink ? ' on-ink' : ''}`}>{sub}</text>
    </g>
  );
  return (
    <svg className="diagram" viewBox="0 0 1120 300" role="img" aria-label="A buyer's wallet buys on a ZipHook market and the tokens land in the token's private pool; the ETH pool swaps privately into the same market; the hook sends 0.4% of every swap to the treasury.">
      <defs>
        <marker id="hd-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0b0d10" /></marker>
        <marker id="hd-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1b63a8" /></marker>
        <marker id="hd-ember" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c8591a" /></marker>
      </defs>
      <path className="arrow" d="M264 76 H456" markerEnd="url(#hd-ink)" />
      <path className="arrow" d="M660 76 H852" markerEnd="url(#hd-ink)" />
      <path className="arrow blue" d="M560 196 V116" markerEnd="url(#hd-blue)" />
      <path className="arrow ember" d="M660 232 H852" markerEnd="url(#hd-ember)" />
      {card(64, 40, 200, 'Your wallet', 'public, as always')}
      {card(460, 40, 200, 'ZipHook market', 'v4 pool + hook', true)}
      {card(856, 40, 200, 'Token pool', 'your note, no address')}
      {card(460, 196, 200, 'ETH pool', 'the private hub', false, '#1b63a8')}
      {card(856, 196, 200, 'Treasury', '0.4% of every swap, in ETH', false, '#c8591a')}
      <text x="360" y="62" textAnchor="middle" className="sub">public buy</text>
      <text x="756" y="62" textAnchor="middle" className="sub">into the shield</text>
      <text x="576" y="160" className="sub" fill="#1b63a8" style={{ fill: '#1b63a8' }}>private swap</text>
      <text x="756" y="218" textAnchor="middle" className="sub" style={{ fill: '#c8591a' }}>hook fee</text>
    </svg>
  );
}
