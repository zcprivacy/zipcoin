import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApi } from './api.js';
import { Postman } from './asp.js';
import { makePublicClient, makeWalletClient } from './chain.js';
import { loadConfig } from './config.js';
import { Store } from './db.js';
import { Indexer } from './indexer.js';
import { createLogger } from './logger.js';
import { Relayer } from './relayer.js';

const log = createLogger('node');

async function main() {
  const cfg = loadConfig();
  const store = new Store(cfg.dbPath);
  const client = makePublicClient(cfg);

  const chainId = await client.getChainId();
  if (chainId !== cfg.chainId) throw new Error(`RPC is chain ${chainId}, config says ${cfg.chainId}`);

  log.info('starting', {
    roles: [...cfg.roles],
    chainId,
    entrypoint: cfg.entrypoint,
    pool: cfg.pool,
    book: cfg.book,
    doorstep: cfg.doorstep,
  });

  const indexer = new Indexer(cfg, store, client, createLogger('indexer'));
  const stoppers: Array<() => void> = [];

  if (cfg.roles.has('indexer')) {
    void indexer.start();
    stoppers.push(() => indexer.stop());
  }

  if (cfg.roles.has('asp')) {
    const wallet = makeWalletClient(cfg, cfg.postmanPrivateKey!);
    const postman = new Postman(cfg, store, client, wallet, createLogger('postman'));
    log.info('postman enabled', { postman: wallet.account.address, delaySeconds: cfg.aspDelaySeconds });
    void postman.start();
    stoppers.push(() => postman.stop());
  }

  let relayer: Relayer | undefined;
  if (cfg.roles.has('relayer')) {
    const wallet = makeWalletClient(cfg, cfg.relayerPrivateKey!);
    const here = dirname(fileURLToPath(import.meta.url));
    const vkeyPath = join(here, '..', 'artifacts', 'withdraw.vkey');
    relayer = new Relayer(cfg, store, client, wallet, createLogger('relayer'), vkeyPath);
    log.info('relayer enabled', { relayer: wallet.account.address, feeBps: cfg.relayerFeeBps });
  }

  if (cfg.roles.has('api') || relayer) {
    const app = createApi(cfg, store, client, createLogger('api'), {
      relayer,
      lastSynced: () => indexer.lastSynced(),
      head: () => indexer.head,
    });
    const server = app.listen(cfg.port, () => log.info('listening', { port: cfg.port }));
    stoppers.push(() => server.close());
  }

  const shutdown = () => {
    log.info('shutting down');
    for (const stop of stoppers) stop();
    store.db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  log.error('fatal', { error });
  process.exit(1);
});
