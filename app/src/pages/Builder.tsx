import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';

import { short } from '../lib/format';
import { fmtUnits, useToken } from '../lib/token';

const fmt = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: 2 });
const sig = (x: number) => x.toLocaleString('en-US', { maximumSignificantDigits: 4 });

/** Open a ZipHook market: four steps, one transaction at the end. The factory is not on mainnet yet, so the last step is a preview. */
export default function Builder() {
  const { address } = useAccount();
  const [step, setStep] = useState(1);
  const [token, setToken] = useState('');
  const [ethSeed, setEthSeed] = useState('');
  const [tokSeed, setTokSeed] = useState('');
  const [volume, setVolume] = useState(100);

  const t = token.trim();
  const look = useToken(t, address);
  const info = look.status === 'ok' ? look.token : null;
  const sym = info?.symbol ?? 'TOKEN';
  const tokenLabel = info ? `${info.name} (${info.symbol})` : t ? short(t, 6) : 'TOKEN';
  const eth = parseFloat(ethSeed) || 0;
  const tok = parseFloat(tokSeed) || 0;
  const price = eth > 0 && tok > 0 ? eth / tok : 0;
  const priceText = price > 0 ? `${sig(price)} ETH per ${sym}` : 'set both amounts';
  const inverseText = price > 0 ? `${sig(1 / price)} ${sym} per ETH` : '';
  const seedText = eth > 0 && tok > 0 ? `${eth} ETH + ${tok.toLocaleString('en-US')} ${sym}` : 'none now, add later';
  const steps = useMemo(() => [['Token', 1], ['Pair and liquidity', 2], ['What the hook does', 3], ['Review', 4]] as const, []);
  const held = info?.balance !== undefined ? fmtUnits(info.balance, info.decimals) : null;
  const etherscan = info ? `https://etherscan.io/token/${info.address}` : '';

  return (
    <main>
      <div className="page-head pad" style={{ paddingBlock: '40px 24px' }}>
        <div>
          <span className="eyebrow blue">ZipHook · open a market</span>
          <h1 className="h1" style={{ fontSize: 'clamp(36px,4.6vw,64px)' }}>Give any token a door into the shield.</h1>
        </div>
        <p className="page-sub" style={{ fontSize: 15 }}>Four steps, one transaction at the end. The market and the token's private pool are created together. No listing fee, gas only.</p>
      </div>

      <section className="builder">
        <div className="steps">
          {steps.map(([label, n]) => (
            <button key={n} className={step === n ? 'is-on' : ''} onClick={() => setStep(n)}>
              <span className="eyebrow">Step {n}</span>
              <b>{label}</b>
            </button>
          ))}
          <div className="note">Nothing is sent until the last step. You can change anything before that.</div>
        </div>

        <div className="builder-form">
          {step === 1 && (
            <>
              <span className="eyebrow">Step 1 of 4</span>
              <h2 className="h2">Which token?</h2>
              <p>Any standard ERC-20 on Ethereum mainnet. Paste its contract address and the token is read from chain as you type. At creation the factory also checks that transfers carry no fee and no rebase.</p>
              <label className="field">
                <span>Token contract address</span>
                <input className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" spellCheck={false} />
              </label>
              <TokenReceipt look={look} />
              <div className="row"><button className="btn btn-ink btn-big" disabled={!info} onClick={() => setStep(2)}>{info ? `Continue with ${info.symbol}` : 'Continue'}</button></div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">Step 2 of 4</span>
              <h2 className="h2">Pair and first liquidity.</h2>
              <p>Markets pair with ETH. That is where the shield's crowd is, and what every private swap routes through. Seed liquidity now or add it later from any wallet; providers earn the pool's 0.6%.</p>
              <div className="seg"><button className="is-on">ETH</button><button disabled>ZC · later</button></div>
              <div className="econ" style={{ gap: 16 }}>
                <label className="field" style={{ border: 0, padding: 0, background: 'none' }}><span>ETH to seed</span><input className="input num" inputMode="decimal" value={ethSeed} onChange={(e) => setEthSeed(e.target.value)} placeholder="0" /></label>
                <label className="field" style={{ border: 0, padding: 0, background: 'none' }}>
                  <span className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{sym} to seed</span>
                    {info && info.balance !== undefined && info.balance > 0n && <button className="link" type="button" onClick={() => setTokSeed(formatUnits(info.balance ?? 0n, info.decimals))}>max {held}</button>}
                  </span>
                  <input className="input num" inputMode="decimal" value={tokSeed} onChange={(e) => setTokSeed(e.target.value)} placeholder="0" />
                </label>
              </div>
              <div className="receipt">
                <div><span>opening price</span><span>{priceText}</span></div>
                {inverseText && <div><span>which is</span><span>{inverseText}</span></div>}
                {held !== null && <div><span>you hold</span><span>{held} {sym}</span></div>}
                <div><span>pool fee to providers</span><span>0.6%</span></div>
                <div><span>your position</span><span>a normal Uniswap position, collect fees in the Uniswap app</span></div>
              </div>
              <div className="row"><button className="btn btn-big" onClick={() => setStep(1)}>Back</button><button className="btn btn-ink btn-big" onClick={() => setStep(3)}>Continue</button></div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">Step 3 of 4</span>
              <h2 className="h2">What the hook will do.</h2>
              <p>Every ZipHook market runs the same hook with the same rules. There is nothing to configure here, and that is the point: a buyer on any market knows exactly what they are getting.</p>
              <div className="ledger" style={{ '--cols': '190px 1fr' } as React.CSSProperties}>
                <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">pool fee</span><span className="cost">0.6% to liquidity providers, through Uniswap's own fee</span></div>
                <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">hook fee</span><span className="cost">0.4% of every swap, taken in ETH, to the treasury</span></div>
                <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">shield on buy</span><span className="cost">a buyer who attaches a key receives {sym} as a note in the {sym} pool</span></div>
                <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">private swaps</span><span className="cost">ETH notes can swap into this market and come out as {sym} notes</span></div>
                <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">recovery</span><span className="cost">a hashed recovery commitment per note, revealed only on ragequit</span></div>
                <div className="ledger-row" style={{ padding: '10px 0' }}><span className="cost">screening</span><span className="cost">deposits into the {sym} pool follow the published policy, like every pool</span></div>
              </div>
              <label className="field">
                <span>If {sym} / ETH traded {fmt(volume)} ETH a day</span>
                <input type="range" min={1} max={1000} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              </label>
              <div className="econ">
                <div><span className="k">to providers, per day</span><span className="v">{fmt(volume * 0.006)} ETH</span></div>
                <div className="ember"><span className="k">to the treasury, per day</span><span className="v">{fmt(volume * 0.004)} ETH</span></div>
              </div>
              <div className="row"><button className="btn btn-big" onClick={() => setStep(2)}>Back</button><button className="btn btn-ink btn-big" onClick={() => setStep(4)}>Continue</button></div>
            </>
          )}
          {step === 4 && (
            <>
              <span className="eyebrow">Step 4 of 4</span>
              <h2 className="h2">Review and create.</h2>
              <div className="receipt boxed">
                <div><span>token</span><span>{tokenLabel}{info && <> · <a href={etherscan} target="_blank" rel="noopener">{short(info.address, 6)}</a></>}</span></div>
                {info && <div><span>supply</span><span>{fmtUnits(info.totalSupply, info.decimals)} {info.symbol} · {info.decimals} decimals</span></div>}
                <div><span>pair</span><span>ETH</span></div>
                <div><span>seed liquidity</span><span>{seedText}</span></div>
                {price > 0 && <div><span>opening price</span><span>{priceText}</span></div>}
                <div><span>created together</span><span>v4 pool with ZipHook · the {sym} private pool</span></div>
                <div><span>fee</span><span>1% per swap · 0.6 providers · 0.4 treasury</span></div>
                <div><span>cost to you</span><span>gas only</span></div>
              </div>
              <div className="row"><button className="btn btn-big" onClick={() => setStep(3)}>Back</button><button className="btn btn-ink btn-big" disabled>Create the market</button></div>
              <div className="alert">
                <b>Being built.</b>
                <span>This is the exact flow. The button turns on when the factory and the ETH pool are on mainnet; progress is in the open at github.com/zcprivacy/zipcoin.</span>
              </div>
            </>
          )}
        </div>

        <div className="builder-preview ink">
          <span className="eyebrow">Your market, as it will exist</span>
          <div className="receipt">
            <div><span>market</span><span>{sym} / ETH</span></div>
            {info && <div><span>token</span><span>{info.name} · {fmtUnits(info.totalSupply, info.decimals)} supply</span></div>}
            <div><span>hook</span><span>ZipHook · 1%</span></div>
            <div><span>private pool</span><span>{sym} · policy v1</span></div>
            <div><span>connects to</span><span>the ETH pool, shared by every market</span></div>
          </div>
          <PreviewDiagram sym={sym} step={step} />
          <p className="fine">Highlighted: the part the current step decides. The ETH pool already exists in the design and is shared by every market.</p>
          <Link className="link" to="/hook">Back to markets</Link>
        </div>
      </section>
    </main>
  );
}

function TokenReceipt({ look }: { look: ReturnType<typeof useToken> }) {
  const row = (k: string, v: React.ReactNode, color?: string) => (
    <div><span>{k}</span><span style={color ? { color } : undefined}>{v}</span></div>
  );
  if (look.status === 'idle') return <div className="receipt">{row('token', 'paste an address', 'var(--mute)')}{row('read from chain', 'name, symbol, decimals, supply, your balance', 'var(--mute)')}</div>;
  if (look.status === 'invalid') return <div className="receipt">{row('address', 'not a 0x address of 40 hex characters', 'var(--ember)')}</div>;
  if (look.status === 'loading') return <div className="receipt">{row('reading mainnet', <><span className="spin" />one moment</>, 'var(--mute)')}</div>;
  if (look.status !== 'ok') return <div className="receipt">{row('mainnet says', look.message, 'var(--ember)')}</div>;
  const k = look.token;
  return (
    <div className="receipt">
      {row('token', `${k.name} (${k.symbol})`, 'var(--green)')}
      {row('contract', <a href={`https://etherscan.io/token/${k.address}`} target="_blank" rel="noopener">{short(k.address, 6)} · Etherscan</a>)}
      {row('supply', `${fmtUnits(k.totalSupply, k.decimals)} ${k.symbol} · ${k.decimals} decimals`)}
      {k.balance !== undefined && row('you hold', `${fmtUnits(k.balance, k.decimals)} ${k.symbol}`)}
      {row('no fee, no rebase', 'checked by the factory at creation', 'var(--mute)')}
    </div>
  );
}

function PreviewDiagram({ sym, step }: { sym: string; step: number }) {
  const hi = (on: boolean) => (on ? '#f0a860' : '#f7f6f2');
  const market = hi(step === 1 || step === 2 || step === 4);
  const pool = hi(step === 1 || step === 4);
  const fee = hi(step === 3 || step === 4);
  const label = sym.length > 10 ? `${sym.slice(0, 9)}…` : sym;
  const mono = 'JetBrains Mono, monospace';
  return (
    <svg viewBox="0 0 500 400" className="diagram" role="img" aria-label={`A buyer's wallet buys on the ${sym} / ETH market and tokens land in the ${sym} pool; the ETH pool swaps privately into the market; the hook sends 0.4% in ETH to the treasury.`}>
      <defs>
        <marker id="pv-paper" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#f7f6f2" /></marker>
        <marker id="pv-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#a6d4ff" /></marker>
        <marker id="pv-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#f0a860" /></marker>
      </defs>
      <path d="M124 88 V164" fill="none" stroke="#f7f6f2" strokeWidth="2" markerEnd="url(#pv-paper)" />
      <path d="M224 189 H292" fill="none" stroke="#f7f6f2" strokeWidth="2" markerEnd="url(#pv-paper)" />
      <path d="M124 312 V236" fill="none" stroke="#a6d4ff" strokeWidth="2" markerEnd="url(#pv-blue)" />
      <path d="M224 211 H396 V308" fill="none" stroke="#f0a860" strokeWidth="2" strokeDasharray="6 6" markerEnd="url(#pv-amber)" />
      <g><rect x="24" y="24" width="200" height="64" fill="#0b0d10" stroke="#f7f6f2" strokeWidth="2" /><text x="124" y="52" textAnchor="middle" fill="#f7f6f2" fontWeight={700} fontSize="14">Buyer's wallet</text><text x="124" y="72" textAnchor="middle" fill="#9aa3b2" fontSize="11" fontFamily={mono}>public</text></g>
      <g><rect x="24" y="168" width="200" height="64" fill="#f7f6f2" stroke={market} strokeWidth="2" /><text x="124" y="196" textAnchor="middle" fill="#0b0d10" fontWeight={700} fontSize="14">{label} / ETH</text><text x="124" y="216" textAnchor="middle" fill="#5c6270" fontSize="11" fontFamily={mono}>v4 pool + ZipHook</text></g>
      <g><rect x="296" y="168" width="180" height="64" fill="#0b0d10" stroke={pool} strokeWidth="2" /><text x="386" y="196" textAnchor="middle" fill="#f7f6f2" fontWeight={700} fontSize="14">{label} pool</text><text x="386" y="216" textAnchor="middle" fill="#9aa3b2" fontSize="11" fontFamily={mono}>notes, no addresses</text></g>
      <g><rect x="24" y="312" width="200" height="64" fill="#0b0d10" stroke="#a6d4ff" strokeWidth="2" /><text x="124" y="340" textAnchor="middle" fill="#f7f6f2" fontWeight={700} fontSize="14">ETH pool</text><text x="124" y="360" textAnchor="middle" fill="#9aa3b2" fontSize="11" fontFamily={mono}>the private hub</text></g>
      <g><rect x="296" y="312" width="180" height="64" fill="#0b0d10" stroke={fee} strokeWidth="2" /><text x="386" y="340" textAnchor="middle" fill="#f7f6f2" fontWeight={700} fontSize="14">Treasury</text><text x="386" y="360" textAnchor="middle" fill="#9aa3b2" fontSize="11" fontFamily={mono}>0.4% in ETH</text></g>
      <text x="136" y="130" fill="#9aa3b2" fontSize="12" fontFamily={mono}>buy</text>
      <text x="258" y="160" textAnchor="middle" fill="#9aa3b2" fontSize="12" fontFamily={mono}>into the shield</text>
      <text x="136" y="276" fill="#a6d4ff" fontSize="12" fontFamily={mono}>private swap</text>
      <text x="408" y="266" fill="#f0a860" fontSize="12" fontFamily={mono}>0.4% ETH</text>
    </svg>
  );
}
