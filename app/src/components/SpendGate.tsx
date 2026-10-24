import { Link } from 'react-router-dom';

import { fmtZC } from '../lib/format';
import type { Gate } from '../lib/plan';
import { useZip } from '../state';

function delayText(seconds: number | undefined): string {
  if (seconds === undefined) return 'shortly';
  if (seconds < 90) return 'within about a minute';
  if (seconds < 7200) return `within about ${Math.round(seconds / 60)} minutes`;
  return `within about ${Math.round(seconds / 3600)} hours`;
}

/**
 * Explains why a burn cannot happen yet and points at the fix. Rendered in place of the compose
 * controls for every state except `ready`.
 */
export function SpendGate({ gate, minBurn, delaySeconds, action }: { gate: Exclude<Gate, { kind: 'ready' }>; minBurn: bigint; delaySeconds?: number; action: string }) {
  const zip = useZip();
  switch (gate.kind) {
    case 'locked':
      return (
        <div className="alert">
          <p style={{ margin: '0 0 .6rem' }}>{action} spends from your pool balance, never from your wallet. Unlock your zip key to see what you have in the pool.</p>
          <button className="btn btn-sm btn-primary" onClick={zip.openUnlock}>Unlock zip key</button>
        </div>
      );
    case 'empty':
      return (
        <div className="alert">
          <p style={{ margin: '0 0 .6rem' }}>Your pool balance is 0 ZC. {action} spends from the pool, not from your wallet, so the first step is a deposit. The minimum burn is {fmtZC(minBurn)} ZC.</p>
          <Link className="btn btn-sm btn-primary" to="/pool">Deposit ZC in the Pool</Link>
        </div>
      );
    case 'pending':
      return (
        <div className="alert">
          <p style={{ margin: 0 }}>
            <span className="spin" />Your deposit of {fmtZC(gate.pendingTotal)} ZC is waiting for approval, usually {delayText(delaySeconds)}. This panel enables itself the moment it is approved.
          </p>
        </div>
      );
    case 'insufficient':
      return (
        <div className="alert">
          <p style={{ margin: '0 0 .6rem' }}>
            Your largest approved note is {fmtZC(gate.largest)} ZC. {action} needs at least {fmtZC(gate.needed, 3)} ZC in one note to cover the {fmtZC(minBurn)} ZC minimum burn plus the relay fee. Notes cannot be combined, so deposit a larger amount.
          </p>
          <Link className="btn btn-sm btn-primary" to="/pool">Deposit more ZC</Link>
        </div>
      );
  }
}
