import {
  AccountService,
  DataService,
  type AccountCommitment,
  type DepositEvent,
  type Hash,
  type PoolInfo,
  type RagequitEvent,
  type WithdrawalEvent,
} from '@0xbow/privacy-pools-core-sdk';
import type { Address } from 'viem';

import { api, type EventsResponse, type PoolInfoResponse } from './api';

/**
 * The SDK rebuilds an account from pool events. Instead of scanning an RPC from the browser, this
 * DataService pulls the same events from the node's API. Anyone can run that node, and the result
 * is identical to an RPC scan because the indexer stores events verbatim.
 */
export class ApiDataService extends DataService {
  private cache?: Promise<EventsResponse>;

  constructor(chainId: number, pool: Address) {
    super([{ chainId, privacyPoolAddress: pool, startBlock: 0n, rpcUrl: 'http://127.0.0.1:1' }]);
  }

  private events(): Promise<EventsResponse> {
    this.cache ??= api.events();
    return this.cache;
  }

  override async getDeposits(_pool: PoolInfo): Promise<DepositEvent[]> {
    const { deposits } = await this.events();
    return deposits.map((d) => ({
      depositor: d.depositor,
      commitment: BigInt(d.commitment) as Hash,
      label: BigInt(d.label) as Hash,
      value: BigInt(d.value),
      precommitment: BigInt(d.precommitment) as Hash,
      blockNumber: BigInt(d.blockNumber),
      transactionHash: d.transactionHash,
      logIndex: d.logIndex,
    }));
  }

  override async getWithdrawals(_pool: PoolInfo): Promise<WithdrawalEvent[]> {
    const { withdrawals } = await this.events();
    return withdrawals.map((w) => ({
      withdrawn: BigInt(w.withdrawn),
      spentNullifier: BigInt(w.spentNullifier) as Hash,
      newCommitment: BigInt(w.newCommitment) as Hash,
      blockNumber: BigInt(w.blockNumber),
      transactionHash: w.transactionHash,
    }));
  }

  override async getRagequits(_pool: PoolInfo): Promise<RagequitEvent[]> {
    const { ragequits } = await this.events();
    return ragequits.map((r) => ({
      ragequitter: r.ragequitter,
      commitment: BigInt(r.commitment) as Hash,
      label: BigInt(r.label) as Hash,
      value: BigInt(r.value),
      blockNumber: BigInt(r.blockNumber),
      transactionHash: r.transactionHash,
    }));
  }
}

export interface LoadedAccount {
  service: AccountService;
  notes: AccountCommitment[];
  statuses: Map<string, 'pending' | 'approved' | 'rejected'>;
  scope: Hash;
}

export async function loadAccount(phrase: string, pool: PoolInfoResponse): Promise<LoadedAccount> {
  const data = new ApiDataService(pool.chainId, pool.pool);
  const poolInfo: PoolInfo = {
    chainId: pool.chainId,
    address: pool.pool,
    scope: BigInt(pool.scope) as Hash,
    deploymentBlock: BigInt(pool.deploymentBlock),
  };
  const { account, errors } = await AccountService.initializeWithEvents(
    data,
    { mnemonic: phrase },
    [poolInfo],
    { includeEmptyNodes: false },
  );
  if (errors.length) throw new Error(errors.map((e) => e.reason).join('; '));

  const notes = account.getSpendableCommitments().get(poolInfo.scope) ?? [];
  const events = await api.events();
  const statuses = new Map<string, 'pending' | 'approved' | 'rejected'>();
  for (const d of events.deposits) statuses.set(d.label, d.status);

  return { service: account, notes, statuses, scope: poolInfo.scope };
}
