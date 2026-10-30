import { NavLink } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

import { short } from '../lib/format';
import { useZip } from '../state';

const LINKS = [
  ['/pool', 'Pool'],
  ['/hook', 'Hook'],
  ['/book', 'Book'],
  ['/doorstep', 'Doorstep'],
  ['/docs', 'Docs'],
] as const;

export function Header() {
  const zip = useZip();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const wrongChain = isConnected && zip.pool && chainId !== zip.pool.chainId;
  const block = zip.stats?.lastSynced ? Number(zip.stats.lastSynced).toLocaleString('en-US') : null;

  return (
    <header className="masthead pad">
      <NavLink className="mast-brand" to="/" aria-label="Zipcoin home">
        <img src="/assets/zc-logo-128.png" alt="" decoding="async" />
        <span>Zipcoin</span>
      </NavLink>

      <nav className="mast-nav" aria-label="Sections">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mast-right">
        <span className={`mast-status${zip.nodeOk ? '' : ' is-bad'}`} title={zip.nodeOk ? 'node online' : 'node unreachable'}>
          <span className="dot" />
          {zip.nodeOk ? (block ? `No. ${block}` : 'node live') : 'node unreachable'}
        </span>
        {zip.phrase ? (
          <button className="btn" onClick={zip.lock} title="Lock your notes">key unlocked</button>
        ) : (
          <button className="btn" onClick={zip.openUnlock} title="Unlock your notes">unlock key</button>
        )}
        {isConnected ? (
          wrongChain ? (
            <button className="btn btn-ink" onClick={() => switchChain({ chainId: zip.pool!.chainId })}>Switch network</button>
          ) : (
            <button className="btn" onClick={() => disconnect()} title={address}>{short(address ?? '')}</button>
          )
        ) : (
          <button className="btn btn-ink" disabled={isPending} onClick={() => connect({ connector: connectors[0]! })}>
            {isPending ? 'Connecting' : 'Connect'}
          </button>
        )}
        <details className="menu">
          <summary aria-label="Open menu">
            <svg aria-hidden="true" width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M0 1h20M0 7h20M0 13h20" /></svg>
          </summary>
          <div className="menu-list">
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
