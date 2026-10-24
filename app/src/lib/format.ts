import { formatUnits, parseUnits } from 'viem';

export function fmtZC(v: bigint | string, digits = 2): string {
  const n = Number(formatUnits(BigInt(v), 18));
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function parseZC(s: string): bigint {
  return parseUnits(s.trim() || '0', 18);
}

export function short(addr: string, n = 4): string {
  return addr.length > 2 * n + 2 ? `${addr.slice(0, n + 2)}…${addr.slice(-n)}` : addr;
}

export function shortBig(v: bigint | string, n = 6): string {
  const s = BigInt(v).toString(16).padStart(64, '0');
  return `0x${s.slice(0, n)}…${s.slice(-n)}`;
}

export function ago(ts: number): string {
  if (!ts) return '';
  const d = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
