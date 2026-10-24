# Roadmap

Each phase is released when its completion criteria are met and independently verifiable. No phase
carries a target date. Delivered items are ticked. This mirrors the roadmap on the site; the site is
updated first.

## Phase I · Genesis — live

- [x] ZC launched on Ethereum mainnet through a public launchpad
- [x] Fixed supply, no team allocation, no presale
- [x] zipcoin.zip registered and the site published
- [x] Protocol specification and trust model published in this repository

## Phase II · Foundations — building

- [x] 48-hour timelock deployed as the Entrypoint owner
- [x] Public repository under Apache-2.0 with the protocol specification
- [ ] Treasury address and spending policy published
- [ ] Independent legal review of the non-custodial design
- [x] Incident disclosure policy with a 24-hour clock, see SECURITY.md

## Phase III · The pool — live

- [x] Entrypoint and ZC pool deployed from the audited core
- [x] Reuse of the core's audited Groth16 verifiers, no new ceremony
- [x] Association set policy published, every set addressable by content hash
- [ ] Full association sets mirrored to IPFS
- [x] Ragequit tested and available from the Pool page
- [x] Browser prover
- [ ] Command-line client
- [x] Public indexer that rebuilds from chain

## Phase IV · The Book and the Doorstep — live

- [x] The Book: burn-to-post from inside the pool, fixed minimum burn
- [x] The Doorstep: a line left at one address, with its own minimum
- [ ] Sealed Doorstep messages, readable only by the addressee
- [ ] Envelopes for longer messages
- [x] Spender source published and verified on Etherscan

## Phase V · Tellers, the Hearth and the Changer — next

- [ ] Shielded staking: lock a note from inside the pool and return it to the pool with its reward
- [ ] Tellers: pay out a withdrawal in ETH or a stablecoin
- [ ] The Hearth: gifts that carry a burn
- [ ] The Changer: swap inside the withdrawal, with a public fee cap
- [ ] Payment links a merchant can issue without knowing the payer

## Phase VI · Open relaying — later

- [ ] Relayer specification and reference implementation
- [ ] At least three independent relayers live
- [ ] ERC-4337 paymaster path for withdrawals with no relayer at all
- [ ] Association set provider role documented so others can run one
- [ ] Second and third indexers run by other parties

## Phase VII · The Snowmoon layer — research

Mechanisms from the novel that need new circuits and a new trusted setup.

- [ ] Private sales tax paid in real time inside the same proof
- [ ] Hidden payment amounts
- [ ] Reputation-collateralised loans where only the nullifier and the amount are public
- [ ] Nullifier-gated polls: one voice per note

## Phase VIII · Reach — later

- [ ] Deployment on an Ethereum L2 with the same policy
- [ ] Integration with privacy-first wallets
- [ ] Agent and MCP toolkit so software can pay privately too
- [ ] One-command self-hosting of the entire stack

## Always

- Any incident is disclosed within 24 hours, with transaction hashes.
- Every contract is verified and matched to a tagged commit before it is announced.
- The site and the app carry no analytics, trackers or third-party scripts.
- Progress is reported against this list, in public, and nowhere else first.
