import { useQuery } from '@tanstack/react-query';
import { formatUnits, hexToString, isAddress, parseAbi, zeroAddress, type Address, type Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { usePublicClient } from 'wagmi';

const abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]);
// A few early tokens return bytes32 for name and symbol.
const abi32 = parseAbi(['function name() view returns (bytes32)', 'function symbol() view returns (bytes32)']);

export type TokenInfo = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  /** Balance of the connected wallet, when one is connected. */
  balance?: bigint;
};

export type TokenLookup =
  | { status: 'idle' }
  | { status: 'invalid' }
  | { status: 'loading' }
  | { status: 'none' | 'notoken' | 'error'; message: string }
  | { status: 'ok'; token: TokenInfo };

const clean32 = (v: Hex) => hexToString(v, { size: 32 }).replace(/\0+$/, '');

/** Reads an ERC-20 on mainnet as the user types its address: contract check, name, symbol, decimals, supply, and the wallet's balance. */
export function useToken(input: string, holder?: Address): TokenLookup {
  const client = usePublicClient({ chainId: mainnet.id });
  const address = input.trim();
  const valid = isAddress(address);
  const q = useQuery({
    queryKey: ['token', address.toLowerCase(), holder?.toLowerCase() ?? ''],
    enabled: valid && !!client,
    staleTime: 60_000,
    retry: 1,
    queryFn: async (): Promise<TokenLookup> => {
      if (!client) throw new Error('no client');
      const a = address as Address;
      const code = await client.getCode({ address: a });
      if (!code || code === '0x') return { status: 'none', message: 'no contract at this address on Ethereum mainnet' };
      const contracts = [
        { address: a, abi, functionName: 'name' },
        { address: a, abi, functionName: 'symbol' },
        { address: a, abi, functionName: 'decimals' },
        { address: a, abi, functionName: 'totalSupply' },
        { address: a, abi, functionName: 'balanceOf', args: [holder ?? zeroAddress] },
      ] as const;
      const r = await client.multicall({ contracts, allowFailure: true });
      const decimals = r[2].status === 'success' ? Number(r[2].result) : undefined;
      const totalSupply = r[3].status === 'success' ? (r[3].result as bigint) : undefined;
      if (decimals === undefined || totalSupply === undefined) return { status: 'notoken', message: 'a contract, but not a standard ERC-20' };
      let name = r[0].status === 'success' ? String(r[0].result) : '';
      let symbol = r[1].status === 'success' ? String(r[1].result) : '';
      if (!name || !symbol) {
        const r32 = await client.multicall({ contracts: [{ address: a, abi: abi32, functionName: 'name' }, { address: a, abi: abi32, functionName: 'symbol' }], allowFailure: true });
        if (!name && r32[0].status === 'success') name = clean32(r32[0].result as Hex);
        if (!symbol && r32[1].status === 'success') symbol = clean32(r32[1].result as Hex);
      }
      if (!symbol) return { status: 'notoken', message: 'a contract, but it has no symbol' };
      const balance = holder && r[4].status === 'success' ? (r[4].result as bigint) : undefined;
      return { status: 'ok', token: { address: a, name: name || symbol, symbol, decimals, totalSupply, balance } };
    },
  });
  if (!address) return { status: 'idle' };
  if (!valid) return { status: 'invalid' };
  if (q.isError) return { status: 'error', message: 'could not read mainnet right now' };
  if (!q.data) return { status: 'loading' };
  return q.data;
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

/** 420,690,000,000,000 → "420.69T"; keeps full precision for amounts that fit. */
export function fmtUnits(v: bigint, decimals: number, digits = 4): string {
  const n = Number(formatUnits(v, decimals));
  return n >= 1e6 ? compact.format(n) : n.toLocaleString('en-US', { maximumFractionDigits: digits });
}
