import { NavLink, useLocation } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

import { short } from '../lib/format';
import { useZip } from '../state';

const LANDING_LINKS = [
  ['#how', 'Protocol'],
  ['#architecture', 'Architecture'],
  ['#roadmap', 'Roadmap'],
  ['#token', 'Token'],
  ['#faq', 'FAQ'],
] as const;

const APP_LINKS = [
  ['/pool', 'Pool'],
  ['/book', 'The Book'],
  ['/doorstep', 'Doorstep'],
] as const;

export function Header() {
  const zip = useZip();
  const { pathname } = useLocation();
  const onLanding = pathname === '/';
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const wrongChain = isConnected && zip.pool && chainId !== zip.pool.chainId;

  return (
    <>
      <header className="nav">
        <div className="wrap">
          <NavLink className="brand" to="/" aria-label="Zipcoin home">
            <img className="brand-mark" src="/assets/zc-logo-128.png" width="34" height="34" alt="" decoding="async" />
            <span className="brand-name">Zipcoin</span>
            <span className="brand-tag">ZC</span>
          </NavLink>

          <ul className="nav-links">
            {onLanding &&
              LANDING_LINKS.map(([href, label]) => (
                <li key={href} className="hide-narrow">
                  <a href={href}>{label}</a>
                </li>
              ))}
            {APP_LINKS.map(([to, label]) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <span className={`status-dot hide-narrow ${zip.nodeOk ? 'is-ok' : 'is-bad'}`} title={zip.nodeOk ? 'node online' : 'node unreachable'}>
              {zip.nodeOk ? 'node' : 'offline'}
            </span>
            {zip.phrase ? (
              <button className="lock-btn is-open" onClick={zip.lock} title="Lock your notes">key unlocked</button>
            ) : (
              <button className="lock-btn" onClick={zip.openUnlock} title="Unlock your notes">unlock key</button>
            )}
            {isConnected ? (
              wrongChain ? (
                <button className="btn btn-sm" onClick={() => switchChain({ chainId: zip.pool!.chainId })}>Switch network</button>
              ) : (
                <button className="btn btn-sm" onClick={() => disconnect()} title={address}>{short(address ?? '')}</button>
              )
            ) : (
              <button className="btn btn-sm btn-primary" disabled={isPending} onClick={() => connect({ connector: connectors[0]! })}>
                {isPending ? 'Connecting' : 'Connect'}
              </button>
            )}
            <button className="theme-btn" type="button" aria-label="Toggle light and dark theme" onClick={zip.toggleTheme}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3a9 9 0 1 0 7 14.5A8 8 0 0 1 14 3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </button>
            <details className="menu">
              <summary>Menu</summary>
              <ul className="menu-list">
                {APP_LINKS.map(([to, label]) => (
                  <li key={to}><NavLink to={to}>{label}</NavLink></li>
                ))}
                {LANDING_LINKS.map(([href, label]) => (
                  <li key={href}><a href={onLanding ? href : `/${href}`}>{label}</a></li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
