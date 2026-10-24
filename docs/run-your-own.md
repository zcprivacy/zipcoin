# Run your own

Every part of Zipcoin can be run by anyone, against the same mainnet contracts, with no dependency
on infrastructure the project operates. This guide covers the node, a relayer, the wallet, and a new
deployment of the protocol for another token.

Prerequisites: Node.js 20+, Docker if you want containers, Foundry for the contracts, and an
Ethereum mainnet RPC endpoint.

```
git clone --recurse-submodules https://github.com/zcprivacy/zipcoin.git
```

## 1. A node: indexer and API

The node reads the pool, Entrypoint, Book and Doorstep events from the deployment block into
SQLite and serves them to wallets. It holds no keys in this configuration.

```
cd services/node
cp .env.example .env
```

Set at least:

| Variable | Value |
|---|---|
| `RPC_URL` | your mainnet RPC |
| `CHAIN_ID` | `1` |
| `ENTRYPOINT`, `POOL`, `ZC_TOKEN`, `BOOK`, `DOORSTEP` | the addresses in `docs/deployments.md` |
| `DEPLOYMENT_BLOCK` | `26251103` |
| `ROLES` | `indexer,api` |
| `DB_PATH` | a path on persistent storage |
| `ALLOWED_ORIGINS` | the origins of the wallets you serve |

Then `npm ci && npm run build && npm start`, or build the Dockerfile and run it with the same
variables and a volume mounted at `DB_PATH`. `GET /health` reports the indexed head. Deleting the
database and restarting is always safe; everything is rebuilt from chain.

Any Docker host works. The service needs one small volume and outbound access to your RPC.

## 2. A relayer

A relayer submits users' proofs with its own gas and receives the fee the user fixed in the proof.
It has no role on chain and cannot alter anything in a proof. Add the role and a key that holds ETH
for gas and nothing else:

| Variable | Value |
|---|---|
| `ROLES` | `indexer,api,relayer` |
| `RELAYER_PRIVATE_KEY` | a fresh key funded with ETH |
| `RELAYER_FEE_BPS` | the minimum fee you accept, in basis points; the on-chain cap is 300 |
| `RELAYER_MIN_WITHDRAW` | the smallest withdrawal you will relay, in wei of ZC |
| `RELAYER_MAX_GAS_GWEI` | refuse to relay above this gas price |
| `RELAYER_RATE_LIMIT_PER_MIN` | per-address request limit |

The relayer refuses anything the pool would reject or that would lose it money: stale association
root, spent note, invalid proof, fee below your minimum or above the cap, gas above your limit. A
refused request costs nothing. `GET /relayer` publishes your terms; wallets read them from there.

## 3. The wallet

```
cd app
cp .env.example .env
```

For development, `VITE_NODE_URL` points at your node, for example `http://127.0.0.1:8080`, and
`npm run dev` serves the app.

For production the app talks to `/api/*` on its own origin, so the browser never learns the node's
address. Proxy that path to your node on whichever static host you use. For a host that reads
`vercel.json`, generate it from the committed template:

```
NODE_ORIGIN=https://node.example.org npm run vercel:config
npm run build
```

The generated `vercel.json` is git-ignored; the repository never contains an operator's hostname.
On any other host, add the equivalent rewrite rule: `/api/(.*)` to `https://your-node/$1`, with
server-sent events passed through.

`npm run build` first copies the proving artifacts from the pinned core submodule into
`public/artifacts` and checks their hashes against `artifacts.manifest.json`.

## 4. A new deployment for another token

`protocol/script/Deploy.s.sol` deploys the verifiers, Entrypoint, pool, timelock and spenders in
one run and hands the owner role to the timelock.

```
cd protocol
cp .env.example .env     # MAINNET_RPC_URL, ETHERSCAN_API_KEY, and:
#   ZC_TOKEN  = the ERC-20 to shield
#   OWNER     = the timelock proposer, an offline key
#   POSTMAN   = the association set poster
forge test                                   # includes a full deployment rehearsal
forge script script/Deploy.s.sol --rpc-url <rpc> --account <keystore> --broadcast --verify
```

Rehearse first against a local fork of mainnet with the real token:

```
anvil --fork-url <rpc>
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --account <keystore> --broadcast
```

The script writes `deployments/<chainid>.json`; point a node at those addresses and the deployment
block, and run the poster role with `ROLES=indexer,api,asp` and `POSTMAN_PRIVATE_KEY` so deposits
get approved under the policy in `docs/asp-policy-v1.md`.

## 5. Local end-to-end rehearsal

```
anvil --port 8546 --chain-id 31337 --block-time 1

cd protocol
forge script script/LocalToken.s.sol --tc DeployLocalToken --rpc-url http://127.0.0.1:8546 --private-key <anvil key> --broadcast
ZC_TOKEN=<token> OWNER=<addr> POSTMAN=<addr> forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8546 --private-key <anvil key> --broadcast

cd ../services/node        # .env pointing at the local chain and deployments/31337.json
npm run dev
npx tsx scripts/e2e.ts     # deposit, approval, root, proof, relay, Book entry

cd ../app
npm run dev
node scripts/browser-e2e.mjs
```

## Keys

Never put a private key in a file that is tracked, on a command line, or in a hosting dashboard
that other people can read. Server keys hold only what their role needs: ETH for gas on the
relayer, ETH for root postings on the poster. Owner and deployer keys never belong on a server.
