# Zipcoin site and app

One Vite + React site: the public intro page at `/` and the wallet behind it. Every proof is generated
in the browser and every piece of state is rebuilt from public chain events served by a Zipcoin node.

| Route | What |
|---|---|
| `/` | Intro page: frost hero with a live status card, thesis, how it works with the receipt demo, architecture, the Book preview fed live from the node, roadmap, token, commitments, lineage, FAQ |
| `/pool` | Balance strip, Deposit and Withdraw (private via relayer, or ragequit) side by side, your notes and activity |
| `/book` | Stats strip, live feed with sorting, threads and a "new entries" pill, compose panel |
| `/doorstep` | Deliveries at an address, live, plus compose |

- **Zip key**: one wallet signature over a fixed message derives a 12-word phrase (BIP-39). The same
  wallet always yields the same phrase, so nothing is stored. The phrase can be exported and imported.
  Unlocking is a modal; the header shows the lock state.
- **Notes**: recovered with the Privacy Pools SDK `AccountService`, fed by the node's `/pool/events`.
- **Live data**: the node's `/stats` and `/events/stream` (server-sent events) drive the stats strips,
  the landing status card and the feeds.
- **Proving**: own artifact loader over `public/artifacts` (same bytes as the Privacy Pools trusted
  setup). The proving stack is a lazy chunk; the intro page never loads it.

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
