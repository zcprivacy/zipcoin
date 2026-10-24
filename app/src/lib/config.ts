import { defineChain } from 'viem';
import { mainnet } from 'viem/chains';

// Works under Vite (import.meta.env) and under plain Node (process.env) for scripts and tests.
const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ??
  (typeof process !== 'undefined' ? process.env : {});

/**
 * Node API base. In production the site proxies `/api/*` to the node server-side, so the browser only
 * ever talks to its own origin. Local development talks to a local node directly; VITE_NODE_URL overrides.
 */
export const NODE_URL: string = env.VITE_NODE_URL || (env.DEV ? 'http://127.0.0.1:8080' : '/api');

/** Public RPC used for reads and for the wallet's chain definition when the wallet has none. */
export const RPC_URL: string | undefined = env.VITE_RPC_URL || undefined;

export const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8546'] } },
});

export const chains = [mainnet, anvil] as const;

/** Message a wallet signs once to derive its zip key. Deterministic per wallet, never sent anywhere. */
export const ZIP_KEY_MESSAGE =
  'Zipcoin zip key v1\n\nSigning this message derives the key that controls your private notes.\nOnly sign it on the Zipcoin app. It costs no gas and sends nothing.';

export const ARTIFACTS_URL = '/artifacts';
