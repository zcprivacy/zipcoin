import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import type { LoadedAccount } from './lib/account';
import { api, type PoolInfoResponse, type RelayerInfo, type Stats } from './lib/api';
import { ZIP_KEY_MESSAGE } from './lib/config';
import { isValidPhrase, normalizePhrase, phraseFromSignature } from './lib/keys';
import { useLiveEvents, type LiveEvent } from './lib/live';

export interface Zip {
  pool: PoolInfoResponse | undefined;
  poolError: boolean;
  relayer: RelayerInfo | undefined;
  stats: Stats | undefined;
  nodeOk: boolean;
  phrase: string | null;
  account: LoadedAccount | null;
  loading: string | null;
  error: string | null;
  unlockOpen: boolean;
  openUnlock: () => void;
  closeUnlock: () => void;
  unlockWithWallet: () => Promise<void>;
  unlockWithPhrase: (phrase: string) => void;
  lock: () => void;
  refresh: () => Promise<void>;
  explorer: (tx: string) => string | null;
  chainName: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLive: (fn: (e: LiveEvent) => void) => () => void;
}

const Ctx = createContext<Zip | null>(null);

export function useZip(): Zip {
  const v = useContext(Ctx);
  if (!v) throw new Error('useZip outside provider');
  return v;
}

const CHAIN_NAMES: Record<number, string> = { 1: 'Ethereum mainnet', 31337: 'local Anvil' };

export function ZipProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const pool = useQuery({ queryKey: ['pool'], queryFn: api.pool, staleTime: 60_000, retry: 2 });
  const relayer = useQuery({ queryKey: ['relayer'], queryFn: api.relayer, staleTime: 60_000, retry: 1 });
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats, refetchInterval: 30_000 });
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 20_000, retry: 1 });

  const { isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [phrase, setPhrase] = useState<string | null>(null);
  const [account, setAccount] = useState<LoadedAccount | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);

  const load = useCallback(async (p: string, info: PoolInfoResponse) => {
    setLoading('recovering your notes from chain');
    try {
      const { loadAccount } = await import('./lib/account');
      setAccount(await loadAccount(p, info));
      setError(null);
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'could not load account');
    } finally {
      setLoading(null);
    }
  }, []);

  useEffect(() => {
    if (phrase && pool.data) void load(phrase, pool.data);
  }, [phrase, pool.data, load]);

  const refresh = useCallback(async () => {
    if (phrase && pool.data) await load(phrase, pool.data);
  }, [phrase, pool.data, load]);

  const unlockWithWallet = useCallback(async () => {
    if (!isConnected) {
      setError('connect a wallet first');
      return;
    }
    setError(null);
    try {
      const sig = await signMessageAsync({ message: ZIP_KEY_MESSAGE });
      setPhrase(phraseFromSignature(sig));
      setUnlockOpen(false);
    } catch (e) {
      setError((e as Error).message.split('\n')[0] ?? 'signature rejected');
    }
  }, [isConnected, signMessageAsync]);

  const unlockWithPhrase = useCallback((raw: string) => {
    const p = normalizePhrase(raw);
    if (!isValidPhrase(p)) {
      setError('that is not a valid 12-word phrase');
      return;
    }
    setError(null);
    setPhrase(p);
    setUnlockOpen(false);
  }, []);

  const lock = useCallback(() => {
    setPhrase(null);
    setAccount(null);
  }, []);

  /* live events: refresh stats and derived queries, fan out to subscribers */
  const subs = useRef(new Set<(e: LiveEvent) => void>());
  const onLive = useCallback((fn: (e: LiveEvent) => void) => {
    subs.current.add(fn);
    return () => {
      subs.current.delete(fn);
    };
  }, []);
  useLiveEvents((e) => {
    for (const fn of subs.current) fn(e);
    if (e.type !== 'block') void qc.invalidateQueries({ queryKey: ['stats'] });
    if (e.type === 'approval' || e.type === 'deposit') void refresh();
  });

  /* theme: stored per browser, boot script in index.html applies it before paint */
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('zip-theme', next);
      } catch {
        /* storage may be unavailable */
      }
      return next;
    });
  }, []);

  const value = useMemo<Zip>(
    () => ({
      pool: pool.data,
      poolError: pool.isError,
      relayer: relayer.data,
      stats: stats.data,
      nodeOk: !!health.data?.ok,
      phrase,
      account,
      loading,
      error,
      unlockOpen,
      openUnlock: () => setUnlockOpen(true),
      closeUnlock: () => setUnlockOpen(false),
      unlockWithWallet,
      unlockWithPhrase,
      lock,
      refresh,
      explorer: (tx) => (pool.data?.chainId === 1 ? `https://etherscan.io/tx/${tx}` : null),
      chainName: CHAIN_NAMES[pool.data?.chainId ?? 0] ?? `chain ${pool.data?.chainId ?? '?'}`,
      theme,
      toggleTheme,
      onLive,
    }),
    [pool.data, pool.isError, relayer.data, stats.data, health.data, phrase, account, loading, error, unlockOpen, unlockWithWallet, unlockWithPhrase, lock, refresh, theme, toggleTheme, onLive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
