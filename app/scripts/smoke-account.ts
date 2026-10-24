/**
 * Recovers the rehearsal account through the app's own SDK integration (ApiDataService + loadAccount)
 * against a running local node. Expects the e2e script to have deposited 50,000 ZC and burned 2,000.
 *
 * Usage: npx tsx scripts/smoke-account.ts
 */
import { api } from '../src/lib/api';
import { loadAccount } from '../src/lib/account';

const MNEMONIC = 'test test test test test test test test test test test junk';

async function main() {
  const pool = await api.pool();
  console.log('pool', { chainId: pool.chainId, pool: pool.pool, leaves: pool.leaves });
  const t0 = Date.now();
  const acct = await loadAccount(MNEMONIC, pool);
  console.log('recovered in ms', Date.now() - t0);
  for (const n of acct.notes) {
    console.log('note', {
      value: n.value.toString(),
      label: n.label.toString().slice(0, 12) + '…',
      status: acct.statuses.get(n.label.toString()),
    });
  }
  const total = acct.notes.reduce((s, n) => s + n.value, 0n);
  console.log('total', total.toString());
  if (total !== 48_000n * 10n ** 18n) throw new Error(`expected 48000 ZC remaining, got ${total}`);
  console.log('SMOKE OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
