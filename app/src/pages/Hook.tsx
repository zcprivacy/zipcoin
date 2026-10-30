import { Link } from 'react-router-dom';

import { useZip } from '../state';

export default function Hook() {
  const zip = useZip();
  const s = zip.stats;

  return (
    <main>
      <div className="page-head pad">
        <div>
          <span className="eyebrow blue">02 · ZipHook · building</span>
          <h1 className="h1">Markets with a door into the shield.</h1>
        </div>
        <p className="page-sub">A ZipHook market is a Uniswap v4 pool with one hook on it. Buy a token and it lands in your private pool, not your wallet. Swap from an ETH note and no wallet appears at all. Anyone can open one, for any standard token, with no listing fee.</p>
      </div>

      {/* Three ways through */}
      <section className="split" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="col" style={{ paddingBlock: 26, gap: 8 }}>
          <span className="eyebrow">Way one · from a wallet</span>
          <b style={{ fontSize: 24, letterSpacing: '-0.03em' }}>Buy into the shield</b>
          <span className="light" style={{ fontSize: 14 }}>Public purchase. The hook deposits what you bought straight into the token's pool as your note. Private from the first second after.</span>
        </div>
        <div className="col ink" style={{ paddingBlock: 26, gap: 8 }}>
          <span className="eyebrow">Way two · from an ETH note</span>
          <b style={{ fontSize: 24, letterSpacing: '-0.03em' }}>Swap privately</b>
          <span className="light" style={{ fontSize: 14 }}>Your ETH note goes through the market and comes out as a token note. The chain sees the swap by the contract. Not you.</span>
        </div>
        <div className="col" style={{ paddingBlock: 26, gap: 8 }}>
          <span className="eyebrow">Way three · back out</span>
          <b style={{ fontSize: 24, letterSpacing: '-0.03em' }}>Sell privately</b>
          <span className="light" style={{ fontSize: 14 }}>A token note goes through the market and comes out as an ETH note. Withdraw it to a fresh address whenever you like.</span>
        </div>
      </section>

      {/* Swap panel and markets */}
      <section className="split w75">
        <div className="col ink">
          <div className="card-head"><h2>Swap</h2><span className="tag">private</span></div>
          <label className="field">
            <span>From · ETH note</span>
            <input className="input big num" disabled placeholder="the ETH pool is being built" />
          </label>
          <label className="field">
            <span>To · token note</span>
            <div className="input-row">
              <button className="btn btn-ink" disabled>ZC</button>
              <input className="input" disabled placeholder="or any market by address" />
            </div>
          </label>
          <div className="receipt">
            <div><span>pool fee · to providers</span><span>0.6%</span></div>
            <div><span>hook fee · to treasury, in ETH</span><span>0.4%</span></div>
            <div><span>relayer</span><span>0.25% · fixed in your proof</span></div>
            <div><span>minimum received</span><span>set by you · bound in the proof</span></div>
            <div><span>output lands as</span><span>a note in the token's pool</span></div>
          </div>
          <button className="btn btn-ink btn-big" disabled>Prove and swap</button>
          <p className="fine">ZipHook is being built in public. This panel turns on when the ETH pool and the first market are on mainnet. What the chain will see: a withdrawal from the ETH pool, a swap by the contract, a deposit into the token pool. Amount and price, never a name.</p>
        </div>
        <div className="col">
          <div className="card-head"><h2>Markets</h2><Link className="btn" to="/hook/new">Open a market</Link></div>
          <div className="ledger" style={{ '--cols': '1.2fr 1fr 1fr 1fr 1fr 110px' } as React.CSSProperties}>
            <div className="ledger-head"><span>Token</span><span>Pair</span><span>Liquidity</span><span>24h volume</span><span>Shield deposits</span><span className="right">Status</span></div>
            <div className="ledger-row" style={{ padding: '18px 0' }}>
              <span className="name" style={{ fontSize: 22 }}>ZC</span>
              <span className="cost">ZC / ETH</span>
              <span className="cost muted">—</span>
              <span className="cost muted">—</span>
              <span className="cost">{s?.deposits ?? '…'}</span>
              <span className="status chip-building">building</span>
            </div>
            <div className="ledger-row" style={{ padding: '18px 0' }}>
              <span className="name light" style={{ fontSize: 22, color: 'var(--mute)' }}>your token</span>
              <span className="cost muted">· / ETH</span>
              <span className="cost muted">you seed it</span>
              <span className="cost muted">—</span>
              <span className="cost muted">0</span>
              <Link className="status" to="/hook/new" style={{ textDecoration: 'none' }}>open</Link>
            </div>
          </div>
          <p className="fine">Any standard ERC-20 with no transfer fee or rebase. No listing fee, gas only. A new market shows here once it has liquidity; search by address to find one before that.</p>

          <h3 style={{ fontSize: 20, marginTop: 10 }}>What the hook does, and nothing else</h3>
          <div className="ledger" style={{ '--cols': '200px 1fr' } as React.CSSProperties}>
            <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">sets the pool fee</span><span className="cost">0.6%, paid to liquidity providers by Uniswap itself</span></div>
            <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">takes its own fee</span><span className="cost">0.4% of every swap, always in ETH, to the treasury</span></div>
            <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">shields purchases</span><span className="cost">a buyer who attaches a key gets the tokens as a note in the token's pool</span></div>
            <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">keeps an exit</span><span className="cost">a hashed recovery commitment per note, revealed only on ragequit</span></div>
            <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">changes nothing else</span><span className="cost">no owner, no pause, no custody; the policy screens deposits exactly as before</span></div>
            <div className="ledger-row" style={{ padding: '10px 0', borderBottom: 0 }}><span className="cost">parameters</span><span className="cost">the 0.6 / 0.4 split is set by the 48-hour timelock; total stays 1%</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
