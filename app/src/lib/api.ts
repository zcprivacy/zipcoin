import type { Address, Hex } from 'viem';

import { NODE_URL } from './config';

export interface PoolInfoResponse {
  chainId: number;
  entrypoint: Address;
  pool: Address;
  asset: Address;
  scope: string;
  deploymentBlock: string;
  spenders: { book: Address | null; doorstep: Address | null };
  params: {
    book: { minBurn: string; maxTextBytes: string } | null;
    doorstep: { minBurn: string; maxTextBytes: string; maxSealedBytes: string } | null;
  };
  minimumDepositAmount: string;
  vettingFeeBPS: string;
  maxRelayFeeBPS: string;
  leaves: number;
  stateRoot: string | null;
}

export interface EventsResponse {
  deposits: {
    depositor: string;
    commitment: string;
    label: string;
    value: string;
    precommitment: string;
    blockNumber: number;
    transactionHash: Hex;
    logIndex: number;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  withdrawals: { withdrawn: string; spentNullifier: string; newCommitment: string; blockNumber: number; transactionHash: Hex }[];
  ragequits: { ragequitter: string; commitment: string; label: string; value: string; blockNumber: number; transactionHash: Hex }[];
}

export interface AspResponse {
  root: string | null;
  cid: string | null;
  updatedAt?: number;
  count?: number;
  leaves: string[];
  policyVersion: string;
  delaySeconds: number;
}

export interface RelayerInfo {
  chainId: number;
  relayer: Address;
  feeRecipient: Address;
  feeBps: number;
  maxRelayFeeBps: number;
  targets: { entrypoint: Address; book?: Address; doorstep?: Address };
}

export interface Stats {
  chainId: number;
  lastSynced: string | null;
  deposits: number;
  approved: number;
  pending: number;
  rejected: number;
  totalDeposited: string;
  totalWithdrawn: string;
  totalRagequit: string;
  inPool: string;
  withdrawals: number;
  posts: number;
  posts24h: number;
  deliveries: number;
  deliveries24h: number;
  totalBurned: string;
  burned24h: string;
  largestBurn: string;
  lastRootAt: number | null;
  lastRoot: string | null;
}

export interface Post {
  id: number;
  reply_to: number;
  burned: string;
  text: string;
  block: number;
  tx: Hex;
  ts: number;
}

export interface Delivery {
  id: number;
  door: string;
  burned: string;
  text: string;
  cipher: Hex;
  block: number;
  tx: Hex;
  ts: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${NODE_URL}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => get<{ ok: boolean; head: string | null; lastSynced: string | null }>('/health'),
  pool: () => get<PoolInfoResponse>('/pool'),
  stats: () => get<Stats>('/stats'),
  replies: (id: number) => get<{ replies: Post[] }>(`/book/posts/${id}/replies`),
  leaves: () => get<{ count: number; root: string | null; leaves: string[] }>('/pool/leaves'),
  events: () => get<EventsResponse>('/pool/events'),
  asp: () => get<AspResponse>('/asp'),
  relayer: () => get<RelayerInfo>('/relayer'),
  posts: (before?: number) => get<{ posts: Post[] }>(`/book/posts?limit=50${before ? `&before=${before}` : ''}`),
  deliveries: (door: string) => get<{ deliveries: Delivery[] }>(`/doorstep/${door}`),
  relay: async (body: {
    withdrawal: { processooor: Address; data: Hex };
    proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] };
    publicSignals: string[];
  }) => {
    const res = await fetch(`${NODE_URL}/relayer/relay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { requestId?: string; txHash?: Hex; error?: string; message?: string };
    if (!res.ok) throw new Error(json.message ?? json.error ?? `relay failed (${res.status})`);
    return json as { requestId: string; txHash: Hex };
  },
};
