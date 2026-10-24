import type { AccountCommitment } from '@0xbow/privacy-pools-core-sdk';

import type { LoadedAccount } from './account';

/** Smallest spend whose post-fee burn is at least `burn`. */
export function grossForBurn(burn: bigint, feeBps: bigint): bigint {
  return (burn * 10_000n + (10_000n - feeBps) - 1n) / (10_000n - feeBps);
}

/** What the spender burns from a spend of `gross`, exactly as the contract computes it. */
export function burnForGross(gross: bigint, feeBps: bigint): bigint {
  return gross - (gross * feeBps) / 10_000n;
}

export type Gate =
  | { kind: 'locked' }
  | { kind: 'empty' }
  | { kind: 'pending'; pendingTotal: bigint }
  | { kind: 'insufficient'; largest: bigint; needed: bigint }
  | { kind: 'ready'; note: AccountCommitment; gross: bigint; burned: bigint; maxBurn: bigint; approvedTotal: bigint };

/**
 * Decides whether a burn of `wantBurn` can happen right now and from which note.
 * Picks the smallest approved note that covers it, so large notes stay intact.
 */
export function planBurn(account: LoadedAccount | null, feeBps: bigint, minBurn: bigint, wantBurn: bigint): Gate {
  if (!account) return { kind: 'locked' };
  const notes = account.notes;
  if (notes.length === 0) return { kind: 'empty' };

  const approved = notes.filter((n) => account.statuses.get(n.label.toString()) === 'approved' && n.value > 0n);
  if (approved.length === 0) {
    const pendingTotal = notes
      .filter((n) => account.statuses.get(n.label.toString()) !== 'rejected')
      .reduce((s, n) => s + n.value, 0n);
    return { kind: 'pending', pendingTotal };
  }

  const largest = approved.reduce((m, n) => (n.value > m.value ? n : m), approved[0]!);
  const needed = grossForBurn(minBurn, feeBps);
  if (largest.value < needed) return { kind: 'insufficient', largest: largest.value, needed };

  const burn = wantBurn < minBurn ? minBurn : wantBurn;
  const gross = grossForBurn(burn, feeBps);
  const note = approved.filter((n) => n.value >= gross).sort((a, b) => (a.value < b.value ? -1 : 1))[0] ?? largest;
  const effectiveGross = gross > note.value ? note.value : gross;
  return {
    kind: 'ready',
    note,
    gross: effectiveGross,
    burned: burnForGross(effectiveGross, feeBps),
    maxBurn: burnForGross(largest.value, feeBps),
    approvedTotal: approved.reduce((s, n) => s + n.value, 0n),
  };
}
