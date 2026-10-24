import type { AccountCommitment, Hash } from '@0xbow/privacy-pools-core-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { isAddress, type Address, type Hex } from 'viem';
import { useAccount, usePublicClient, useReadContract, useWalletClient } from 'wagmi';

import { ProofProgress } from '../components/ProofProgress';
import { StatsStrip } from '../components/StatsStrip';
import { entrypointAbi, erc20Abi, poolAbi } from '../lib/abi';
import { api } from '../lib/api';
import { fmtZC, parseZC, short, shortBig } from '../lib/format';
import { encodeRelayData, ragequitArgs, spend } from '../lib/zip';
import { useZip } from '../state';

type Status = 'pending' | 'approved' | 'rejected';

function statusOf(statuses: Map<string, Status>, n: AccountCommitment): Status {
  return statuses.get(n.label.toString()) ?? 'pending';
}

export default function Pool() {
  const zip = useZip();
  const pool = zip.pool;
  const asp = useQuery({ queryKey: ['asp-meta'], queryFn: api.asp, staleTime: 300_000 });

  if (!pool) {
    return (
      <div className="wrap page">
        {zip.poolError ? <div className="alert alert-bad">The Zipcoin node is unreachable. Nothing can be read or relayed until it is back.</div> : <p className="muted"><span className="spin" />Connecting to the Zipcoin node</p>}
      </div>
    );
  }

  const notes = zip.account?.notes ?? [];
  const statuses = zip.account?.statuses ?? new Map<string, Status>();
  const total = notes.reduce((s, n) => s + n.value, 0n);
  const spendable = notes.filter((n) => statusOf(statuses, n) === 'approved').reduce((s, n) => s + n.value, 0n);
  const pending = notes.filter((n) => statusOf(statuses, n) === 'pending').reduce((s, n) => s + n.value, 0n);
  const delay = asp.data?.delaySeconds;

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Pool</p>
          <h1 className="page-h">Your money, <em>in and out.</em></h1>
          <p className="page-sub">Deposits are public. Everything after is private. A note becomes spendable once the published policy approves it{delay !== undefined ? `, ${delayText(delay)}` : ''}, and can always be returned to its wallet with ragequit.</p>
        </div>
        {!zip.phrase && <button className="btn btn-primary" onClick={zip.openUnlock}>Unlock your notes</button>}
      </div>

      <StatsStrip
        items={
          zip.account
            ? [
                { k: 'Balance', v: fmtZC(total), unit: 'ZC' },
                { k: 'Spendable', v: fmtZC(spendable), unit: 'ZC', d: 'approved notes' },
                { k: 'Pending approval', v: fmtZC(pending), unit: 'ZC' },
                { k: 'Notes', v: String(notes.length), d: `${zip.stats?.deposits ?? '…'} deposits in the pool` },
              ]
            : [
                { k: 'In the pool', v: fmtZC(zip.stats?.inPool ?? '0', 0), unit: 'ZC' },
                { k: 'Deposits', v: String(zip.stats?.deposits ?? '…'), d: `${zip.stats?.approved ?? '…'} approved` },
                { k: 'Anonymity set', v: String(zip.stats?.approved ?? '…'), d: 'approved deposits' },
                { k: 'Burned', v: fmtZC(zip.stats?.totalBurned ?? '0', 0), unit: 'ZC', ember: true },
              ]
        }
      />

      {zip.loading && <p className="muted"><span className="spin" />{zip.loading}</p>}
      {zip.error && !zip.unlockOpen && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}>{zip.error}</div>}

      <div className="cols">
        <DepositCard />
        <WithdrawCard />
      </div>

      {zip.account && (
        <div className="cols" style={{ marginTop: '1.25rem' }}>
          <NotesCard notes={notes} statuses={statuses} />
          <ActivityCard />
        </div>
      )}
    </div>
  );
}

function delayText(seconds: number) {
  if (seconds < 120) return 'usually within a couple of minutes';
  if (seconds < 7200) return `usually about ${Math.round(seconds / 60)} minutes after depositing`;
  return `usually about ${Math.round(seconds / 3600)} hours after depositing`;
}

/* ---------------- deposit ---------------- */

function DepositCard() {
  const zip = useZip();
  const pool = zip.pool!;
  const { address } = useAccount();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient({ chainId: pool.chainId });
  const [amount, setAmount] = useState('1000');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance = useReadContract({
    address: pool.asset,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: pool.chainId,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  const min = BigInt(pool.minimumDepositAmount);
  const vetting = BigInt(pool.vettingFeeBPS);

  const submit = async () => {
    setError(null);
    setDone(null);
    if (!wallet || !client || !address || !zip.account) return;
    try {
      const value = parseZC(amount);
      if (value < min) throw new Error(`minimum deposit is ${fmtZC(min)} ZC`);
      if (balance.data !== undefined && value > balance.data) throw new Error('not enough ZC in this wallet');
      const { precommitment } = zip.account.service.createDepositSecrets(BigInt(pool.scope) as Hash);
      const allowance = await client.readContract({ address: pool.asset, abi: erc20Abi, functionName: 'allowance', args: [address, pool.entrypoint] });
      if (allowance < value) {
        setBusy('approving ZC');
        const h = await wallet.writeContract({ address: pool.asset, abi: erc20Abi, functionName: 'approve', args: [pool.entrypoint, value] });
        await client.waitForTransactionReceipt({ hash: h });
      }
      setBusy('confirm the deposit in your wallet');
      const hash = await wallet.writeContract({ address: pool.entrypoint, abi: entrypointAbi, functionName: 'deposit', args: [pool.asset, value, precommitment] });
      setBusy('waiting for confirmation');
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('deposit transaction reverted');
      setDone(hash);
      setBusy('waiting for the indexer');
      const before = zip.account.notes.length;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        await zip.refresh();
        if ((zip.account?.notes.length ?? 0) > before) break;
      }
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'failed');
    } finally {
      setBusy(null);
      void balance.refetch();
    }
  };

  return (
    <section className="card">
      <div className="card-head"><h2>Deposit</h2><span className="chip">public</span></div>
      <div className="stack">
        <label className="field">
          Amount in ZC
          <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <p className="fine num">
          Wallet balance {balance.data !== undefined ? fmtZC(balance.data) : '…'} ZC · minimum {fmtZC(min)} ZC
          {vetting > 0n ? ` · vetting fee ${Number(vetting) / 100}%` : ' · no deposit fee'}
        </p>
        <div className="row">
          <button className="btn btn-primary" disabled={!zip.account || !wallet || !!busy} onClick={() => void submit()}>
            {busy ? <><span className="spin" />{busy}</> : 'Deposit'}
          </button>
          {!zip.account && <button className="link" onClick={zip.openUnlock}>Unlock your zip key first</button>}
          {zip.account && !wallet && <span className="fine">Connect a wallet to deposit</span>}
        </div>
        {done && (
          <div className="alert alert-ok">
            Deposited. It shows under Notes as pending until the policy approves it.{' '}
            {zip.explorer(done) ? <a href={zip.explorer(done)!} target="_blank" rel="noopener">View transaction</a> : <code className="fine">{short(done, 8)}</code>}
          </div>
        )}
        {error && <div className="alert alert-bad">{error}</div>}
      </div>
    </section>
  );
}

/* ---------------- withdraw ---------------- */

function WithdrawCard() {
  const zip = useZip();
  const pool = zip.pool!;
  const [mode, setMode] = useState<'private' | 'ragequit'>('private');
  return (
    <section className="card">
      <div className="card-head">
        <h2>Withdraw</h2>
        <div className="seg">
          <button className={mode === 'private' ? 'is-on' : ''} onClick={() => setMode('private')}>Private</button>
          <button className={mode === 'ragequit' ? 'is-on' : ''} onClick={() => setMode('ragequit')}>Ragequit</button>
        </div>
      </div>
      {mode === 'private' ? <PrivateWithdraw /> : <Ragequit poolAddress={pool.pool} chainId={pool.chainId} />}
    </section>
  );
}

function PrivateWithdraw() {
  const zip = useZip();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const feeBps = BigInt(zip.relayer?.feeBps ?? 0);
  const value = amount ? parseZC(amount) : 0n;
  const notes = zip.account?.notes ?? [];
  const statuses = zip.account?.statuses ?? new Map<string, Status>();
  const candidates = notes.filter((n) => statusOf(statuses, n) === 'approved' && value > 0n && n.value >= value).sort((a, b) => (a.value < b.value ? 1 : -1));

  const go = async () => {
    setError(null);
    setResult(null);
    if (!zip.account || !zip.relayer || !zip.pool) return;
    try {
      if (!isAddress(recipient)) throw new Error('enter the recipient address');
      const note = candidates[0];
      if (!note) throw new Error('no approved note large enough');
      const data = encodeRelayData(recipient as Address, zip.relayer);
      const r = await spend(zip.account.service, note, zip.account.scope, zip.pool.entrypoint, data, value, setProgress);
      setResult(r.txHash);
      setTimeout(() => void zip.refresh(), 6000);
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="stack">
      <p className="fine">Paid out through the relayer, so your wallet never signs. The chain sees a payment to the recipient and cannot link it to your deposit. Use a fresh address for the strongest privacy.</p>
      <label className="field">
        Recipient
        <input className="input mono" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="0x…" />
      </label>
      <label className="field">
        Amount in ZC
        <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <p className="fine num">
        Recipient receives {fmtZC(value - (value * feeBps) / 10_000n)} ZC after the {Number(feeBps) / 100}% relay fee
        {candidates[0] ? ` · from a ${fmtZC(candidates[0].value)} ZC note` : value > 0n && zip.account ? ' · no approved note large enough' : ''}
      </p>
      {progress ? (
        <ProofProgress message={progress} />
      ) : (
        <div className="row">
          <button className="btn btn-primary" disabled={!zip.account || !candidates[0]} onClick={() => void go()}>Withdraw privately</button>
          {!zip.account && <button className="link" onClick={zip.openUnlock}>Unlock your zip key first</button>}
        </div>
      )}
      {result && (
        <div className="alert alert-ok">
          Sent. {zip.explorer(result) ? <a href={zip.explorer(result)!} target="_blank" rel="noopener">View transaction</a> : <code className="fine">{short(result, 8)}</code>}
        </div>
      )}
      {error && <div className="alert alert-bad">{error}</div>}
    </div>
  );
}

function Ragequit({ poolAddress, chainId }: { poolAddress: Address; chainId: number }) {
  const zip = useZip();
  const { address } = useAccount();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient({ chainId });
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notes = zip.account?.notes ?? [];

  const go = async (note: AccountCommitment) => {
    setError(null);
    setResult(null);
    if (!wallet || !client || !address) return;
    try {
      const depositor = await client.readContract({ address: poolAddress, abi: poolAbi, functionName: 'depositors', args: [note.label] });
      if (depositor.toLowerCase() !== address.toLowerCase()) throw new Error(`only the depositing wallet ${short(depositor)} can ragequit this note`);
      setBusy('proving ownership');
      const proof = await ragequitArgs(note);
      setBusy('confirm in your wallet');
      const hash = await wallet.writeContract({ address: poolAddress, abi: poolAbi, functionName: 'ragequit', args: [proof] });
      setBusy('waiting for confirmation');
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('ragequit reverted');
      setResult(hash);
      setTimeout(() => void zip.refresh(), 5000);
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack">
      <p className="fine">Public exit. The whole note returns to the wallet that deposited it, with no approval from anyone. Works for pending and rejected deposits too.</p>
      {!zip.account && <button className="link" onClick={zip.openUnlock}>Unlock your zip key to see your notes</button>}
      {zip.account && notes.length === 0 && <p className="muted">No notes to return.</p>}
      <ul className="notes">
        {notes.map((n) => (
          <li key={n.hash.toString()}>
            <div>
              <div className="amt num">{fmtZC(n.value)} ZC</div>
              <div className="lbl">label {shortBig(n.label)}</div>
            </div>
            <button className="btn btn-sm btn-danger" disabled={!!busy || !wallet} onClick={() => void go(n)}>
              {busy ? <><span className="spin" />{busy}</> : 'Ragequit'}
            </button>
          </li>
        ))}
      </ul>
      {result && <div className="alert alert-ok">Returned. {zip.explorer(result) ? <a href={zip.explorer(result)!} target="_blank" rel="noopener">View transaction</a> : <code className="fine">{short(result, 8)}</code>}</div>}
      {error && <div className="alert alert-bad">{error}</div>}
    </div>
  );
}

/* ---------------- notes + activity ---------------- */

function NotesCard({ notes, statuses }: { notes: AccountCommitment[]; statuses: Map<string, Status> }) {
  const zip = useZip();
  const [reveal, setReveal] = useState(false);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Notes</h2>
        <div className="row">
          <button className="btn btn-sm" onClick={() => void zip.refresh()}>Reload</button>
          <button className="btn btn-sm" onClick={() => setReveal((v) => !v)}>{reveal ? 'Hide phrase' : 'Show phrase'}</button>
        </div>
      </div>
      {reveal && zip.phrase && (
        <div className="stack" style={{ marginBottom: '1rem' }}>
          <div className="phrase">{zip.phrase}</div>
          <p className="fine">Anyone with these twelve words can spend your notes. Your wallet can re-derive them by signing again.</p>
          <p className="fine">
            <strong>Back them up now.</strong> Write them down and keep them offline, as you would a seed phrase. They are the only way
            to reach your notes from a device without this wallet, and the fallback if your wallet ever signs differently.
          </p>
        </div>
      )}
      {notes.length === 0 && <p className="muted">No notes yet. Deposit ZC to create one.</p>}
      <ul className="notes">
        {notes.map((n) => {
          const s = statusOf(statuses, n);
          return (
            <li key={n.hash.toString()}>
              <div>
                <div className="amt num">{fmtZC(n.value)} ZC</div>
                <div className="lbl">label {shortBig(n.label)} · commitment {shortBig(n.hash)}</div>
              </div>
              <span className={`chip ${s === 'approved' ? 'chip-ok' : s === 'rejected' ? 'chip-bad' : 'chip-wait'}`}>{s}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ActivityCard() {
  const zip = useZip();
  const items = useMemo(() => {
    const out: { kind: string; value: bigint; tx: string; block: bigint }[] = [];
    const accounts = zip.account?.service.account.poolAccounts.get(zip.account.scope) ?? [];
    for (const a of accounts) {
      out.push({ kind: 'deposit', value: a.deposit.value, tx: a.deposit.txHash, block: a.deposit.blockNumber });
      let prev = a.deposit;
      for (const c of a.children) {
        out.push({ kind: 'spend', value: prev.value - c.value, tx: c.txHash, block: c.blockNumber });
        prev = c;
      }
      if (a.ragequit) out.push({ kind: 'ragequit', value: a.ragequit.value, tx: a.ragequit.transactionHash, block: a.ragequit.blockNumber });
    }
    return out.sort((x, y) => (x.block < y.block ? 1 : -1));
  }, [zip.account]);

  return (
    <section className="card">
      <div className="card-head"><h2>Activity</h2><span className="fine">your own, recovered from chain</span></div>
      {items.length === 0 && <p className="muted">Nothing yet.</p>}
      <ul className="activity">
        {items.map((it, i) => (
          <li key={`${it.tx}-${i}`}>
            <span className="t">{it.kind}</span>
            <span className="num">{fmtZC(it.value)} ZC</span>
            {zip.explorer(it.tx) ? <a href={zip.explorer(it.tx)!} target="_blank" rel="noopener">{short(it.tx, 6)}</a> : <span className="mono fine">{it.block === 0n ? 'pending' : short(it.tx, 6)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
