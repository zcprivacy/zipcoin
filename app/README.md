# Zipcoin site and app

One Vite + React site: the public pages and the wallet behind them. Every proof is generated in the
browser and every piece of state is rebuilt from public chain events served by a Zipcoin node. The
fonts are served from `public/fonts` (SIL Open Font License, see the licence file there); the site
makes no third-party requests.

| Route | What |
|---|---|
| `/` | Home: the public and the private side of one payment, the feature ledger with live totals, how a ZipHook market works, the steps, totals |
| `/pool` | Pools ledger, Deposit and Withdraw (private via relayer, or ragequit) side by side, your notes and activity |
| `/hook` | ZipHook: the three ways through a market, the swap panel and the markets ledger (preview until the contracts are on mainnet) |
| `/hook/new` | Open a market: token, pair and liquidity, hook terms, review (preview) |
| `/book` | Stats strip, live feed with sorting, threads and a "new entries" pill, compose panel |
| `/doorstep` | Deliveries at an address, live, plus compose |
| `/docs` | Overview, thesis, how it works with the receipt demo, architecture, ZipHook, approval policy, trust model, roadmap, token, commitments, lineage, FAQ |

- **Zip key**: one wallet signature over a fixed message derives a 12-word phrase (BIP-39). The same
  wallet always yields the same phrase, so nothing is stored. The phrase can be exported and imported.
  Unlocking is a modal; the header shows the lock state.
- **Notes**: recovered with the Privacy Pools SDK `AccountService`, fed by the node's `/pool/events`.
- **Live data**: the node's `/stats` and `/events/stream` (server-sent events) drive the stats strips,
  the home page and the feeds.
- **Proving**: own artifact loader over `public/artifacts` (same bytes as the Privacy Pools trusted
  setup). The proving stack is a lazy chunk; the public pages never load it.

## Run

```
npm install
cp .env.example .env     # VITE_NODE_URL, VITE_RPC_URL
npm run dev              # http://localhost:5173
```

With the local rehearsal described in `../docs/run-your-own.md` the defaults point at
`http://127.0.0.1:8080` for the node and `http://127.0.0.1:8546` for the chain.

Checks:

```
npm run typecheck
npx tsx scripts/smoke-account.ts      # recovers the rehearsal account through the SDK path
node scripts/browser-e2e.mjs          # drives the real UI: unlock, prove in browser, relay, live feed
```

## Deploy

In production the app calls `/api/*` on its own origin and the host proxies that path to a Zipcoin
node, so the browser never learns the node's address. For a host that reads `vercel.json`, generate
it from the committed template with your node's origin; the result is git-ignored:

```
NODE_ORIGIN=https://node.example.org npm run vercel:config
npm run build
```

`npm run build` first runs `scripts/sync-artifacts.mjs`, which copies the Groth16 artifacts from the
pinned Privacy Pools core submodule into `public/artifacts` and checks them against
`artifacts.manifest.json`. See `../docs/run-your-own.md` for other hosts.
