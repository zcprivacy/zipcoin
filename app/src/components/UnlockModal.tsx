import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { useZip } from '../state';

export function UnlockModal() {
  const zip = useZip();
  const { isConnected } = useAccount();
  const [mode, setMode] = useState<'wallet' | 'phrase'>('wallet');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!zip.unlockOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zip.closeUnlock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zip]);

  if (!zip.unlockOpen) return null;

  return (
    <div className="modal-back" onClick={zip.closeUnlock} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="unlock-title" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Zip key</p>
        <h2 id="unlock-title">Unlock your notes</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Your notes are controlled by a 12-word zip phrase. A wallet derives it with one signature that costs nothing and
          sends nothing; the same wallet always gives the same phrase. You can also paste a phrase from another device.
        </p>
        <div className="seg" style={{ marginBottom: '1rem' }}>
          <button className={mode === 'wallet' ? 'is-on' : ''} onClick={() => setMode('wallet')}>Wallet</button>
          <button className={mode === 'phrase' ? 'is-on' : ''} onClick={() => setMode('phrase')}>Phrase</button>
        </div>
        {mode === 'wallet' ? (
          <div className="row">
            <button className="btn btn-primary" disabled={!isConnected} onClick={() => void zip.unlockWithWallet()}>Sign to unlock</button>
            {!isConnected && <span className="fine">Connect a wallet first</span>}
          </div>
        ) : (
          <div className="stack">
            <p className="fine">Enter the zip phrase shown under Notes on the Pool page. Never enter your wallet's seed phrase here.</p>
            <textarea className="input" placeholder="twelve words separated by spaces" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row">
              <button className="btn btn-primary" onClick={() => zip.unlockWithPhrase(text)}>Use this phrase</button>
              <span className="fine">Nothing is stored. Closing the tab locks again.</span>
            </div>
          </div>
        )}
        {zip.error && <div className="alert alert-bad" style={{ marginTop: '1rem' }}>{zip.error}</div>}
        <div className="row" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={zip.closeUnlock}>Close</button>
        </div>
      </div>
    </div>
  );
}
