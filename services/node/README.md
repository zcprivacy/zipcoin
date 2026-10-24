# Zipcoin node

One Node.js service with four roles, selectable with `ROLES`:

| Role | What it does | Key it holds |
|---|---|---|
| `indexer` | Reads pool, Entrypoint, Book and Doorstep events into SQLite from the deployment block onward | none |
| `api` | Serves the indexed data to wallets: state-tree leaves, events, association set, Book and Doorstep feeds | none |
| `asp` | The association set postman: applies the published policy to deposits, builds the approved set, serves it content-addressed, posts its root | postman key (posts roots only) |
| `relayer` | Submits users' withdrawals to the Entrypoint or a spender and earns the fee the user encoded | relayer key (holds gas only) |

Everything the indexer and API hold is rebuilt from chain, so anyone running this code against the
same RPC gets the same data. Deleting the database and restarting is always safe.

## Policy (role `asp`)

Applied by code, never by hand, in this order:

1. Depositor on `ASP_BLOCKLIST` → rejected.
2. Depositor flagged by the sanctions oracle (`SANCTIONS_ORACLE`, Chainalysis on mainnet by default) → rejected.
3. Deposit younger than `ASP_DELAY_SECONDS` → wait.
4. Otherwise → approved.

The approved set is a Lean incremental Merkle tree of deposit labels (Poseidon, same as the circuits).
Every published set is served at `/asp/sets/<cid>` with a CIDv1 raw sha256 identifier, the same CID
that is posted on chain, so anyone can fetch the set, rebuild the tree and check the root. Set
`PINATA_JWT` to additionally pin each set to IPFS.

A rejected deposit is never stuck: ragequit returns it to the depositor without any root.

## API

```
GET  /health
GET  /pool                      addresses, scope, fee parameters, leaf count, state root
GET  /pool/leaves               state-tree leaves in insertion order
GET  /pool/events               deposits, withdrawals, ragequits (strings, SDK-compatible)
GET  /asp                       latest root, CID and the full approved label list
GET  /asp/sets/:cid             a published set
GET  /asp/deposits/:label       approval status of one deposit
GET  /book/posts?before=&limit= Book feed, newest first
GET  /book/posts/:id/replies
GET  /doorstep/:door            deliveries left at an address
GET  /relayer                   fee terms and accepted targets
POST /relayer/relay             { withdrawal, proof, publicSignals }
GET  /relayer/requests/:id
```

## Run

```
npm install
cp .env.example .env            # fill RPC_URL and the deployment addresses
npm run dev
```

Regenerate ABIs after changing contracts: `forge build` in `protocol/`, then `npm run gen:abi`.

## Deploy

Any Docker host works. Build the Dockerfile, mount a persistent volume and point `DB_PATH` at it,
and provide the variables from `.env.example` as environment variables. Keys go into the host's
secret store, never into the repository. To run roles on separate machines, start a second instance
from the same image with a different `ROLES` value and only the key that role needs; the poster, for
example, needs no public hostname at all.

The full self-hosting guide, including running a relayer that earns the fee, is in
`docs/run-your-own.md`.
