import 'dotenv/config';
import { getAddress, type Address, type Hex } from 'viem';
import { z } from 'zod';

const zAddress = z.string().transform((v, ctx) => {
  try {
    return getAddress(v);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid address: ${v}` });
    return z.NEVER;
  }
});
const zHex = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'expected a 32-byte hex private key');

export type Role = 'indexer' | 'asp' | 'relayer' | 'api';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  ROLES: z.string().default('indexer,asp,relayer,api'),
  PUBLIC_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),

  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive().default(1),
  CONFIRMATIONS: z.coerce.number().int().min(0).default(3),

  DEPLOYMENT_BLOCK: z.coerce.bigint().nonnegative(),
  ENTRYPOINT: zAddress,
  POOL: zAddress,
  ZC_TOKEN: zAddress,
  BOOK: zAddress.optional(),
  DOORSTEP: zAddress.optional(),

  DB_PATH: z.string().default('./data/zipcoin.sqlite'),

  INDEXER_CHUNK: z.coerce.number().int().positive().default(2000),
  INDEXER_INTERVAL_MS: z.coerce.number().int().positive().default(12_000),

  ASP_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  ASP_DELAY_SECONDS: z.coerce.number().int().min(0).default(30),
  ASP_BLOCKLIST: z.string().default(''),
  ASP_POLICY_VERSION: z.string().default('1'),
  SANCTIONS_ORACLE: zAddress.optional(),
  POSTMAN_PRIVATE_KEY: zHex.optional(),
  PINATA_JWT: z.string().optional(),

  RELAYER_PRIVATE_KEY: zHex.optional(),
  RELAYER_FEE_BPS: z.coerce.number().int().min(0).max(9999).default(100),
  RELAYER_MAX_GAS_GWEI: z.coerce.number().positive().default(50),
  RELAYER_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(20),
  RELAYER_MIN_WITHDRAW: z.coerce.bigint().nonnegative().default(0n),
});

export interface Config {
  port: number;
  roles: Set<Role>;
  publicUrl?: string;
  allowedOrigins: string[] | '*';
  rpcUrl: string;
  chainId: number;
  confirmations: number;
  deploymentBlock: bigint;
  entrypoint: Address;
  pool: Address;
  zcToken: Address;
  book?: Address;
  doorstep?: Address;
  dbPath: string;
  indexerChunk: number;
  indexerIntervalMs: number;
  aspIntervalMs: number;
  aspDelaySeconds: number;
  aspBlocklist: Set<string>;
  aspPolicyVersion: string;
  sanctionsOracle?: Address;
  postmanPrivateKey?: Hex;
  pinataJwt?: string;
  relayerPrivateKey?: Hex;
  relayerFeeBps: number;
  relayerMaxGasGwei: number;
  relayerRateLimitPerMin: number;
  relayerMinWithdraw: bigint;
}

/** Chainalysis sanctions oracle on Ethereum mainnet: `isSanctioned(address) view returns (bool)`. */
const CHAINALYSIS_MAINNET: Address = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Environment values may carry stray whitespace or a trailing \r.
  const cleaned = Object.fromEntries(Object.entries(env).map(([k, v]) => [k, v?.replace(/[\r\n]/g, '').trim()]));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const e = parsed.data;

  const roles = new Set<Role>();
  for (const r of e.ROLES.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (r !== 'indexer' && r !== 'asp' && r !== 'relayer' && r !== 'api') throw new Error(`Unknown role: ${r}`);
    roles.add(r);
  }
  if (roles.has('asp') && !e.POSTMAN_PRIVATE_KEY) throw new Error('POSTMAN_PRIVATE_KEY is required for the asp role');
  if (roles.has('relayer') && !e.RELAYER_PRIVATE_KEY) {
    throw new Error('RELAYER_PRIVATE_KEY is required for the relayer role');
  }

  const sanctionsOracle = e.SANCTIONS_ORACLE ?? (e.CHAIN_ID === 1 ? CHAINALYSIS_MAINNET : undefined);

  return {
    port: e.PORT,
    roles,
    publicUrl: e.PUBLIC_URL,
    allowedOrigins: e.ALLOWED_ORIGINS === '*' ? '*' : e.ALLOWED_ORIGINS.split(',').map((s) => s.trim()),
    rpcUrl: e.RPC_URL,
    chainId: e.CHAIN_ID,
    confirmations: e.CONFIRMATIONS,
    deploymentBlock: e.DEPLOYMENT_BLOCK,
    entrypoint: e.ENTRYPOINT,
    pool: e.POOL,
    zcToken: e.ZC_TOKEN,
    book: e.BOOK,
    doorstep: e.DOORSTEP,
    dbPath: e.DB_PATH,
    indexerChunk: e.INDEXER_CHUNK,
    indexerIntervalMs: e.INDEXER_INTERVAL_MS,
    aspIntervalMs: e.ASP_INTERVAL_MS,
    aspDelaySeconds: e.ASP_DELAY_SECONDS,
    aspBlocklist: new Set(
      e.ASP_BLOCKLIST.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    ),
    aspPolicyVersion: e.ASP_POLICY_VERSION,
    sanctionsOracle,
    postmanPrivateKey: e.POSTMAN_PRIVATE_KEY as Hex | undefined,
    pinataJwt: e.PINATA_JWT,
    relayerPrivateKey: e.RELAYER_PRIVATE_KEY as Hex | undefined,
    relayerFeeBps: e.RELAYER_FEE_BPS,
    relayerMaxGasGwei: e.RELAYER_MAX_GAS_GWEI,
    relayerRateLimitPerMin: e.RELAYER_RATE_LIMIT_PER_MIN,
    relayerMinWithdraw: e.RELAYER_MIN_WITHDRAW,
  };
}
