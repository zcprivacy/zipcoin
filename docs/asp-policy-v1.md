# Association set policy, version 1

The association set is the list of deposits that may be spent privately. This document is the rule
that decides membership, as applied on mainnet. The rule is executed by code in
`services/node/src/asp.ts`; nothing is decided by hand.

## The rule

For each deposit, in order:

1. If the depositing address is on the blocklist, reject.
2. If the Chainalysis sanctions oracle on Ethereum mainnet, `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`,
   returns true for the depositing address, reject.
3. If the deposit is younger than the delay, wait. The delay is 30 seconds on mainnet.
4. Otherwise, approve.

The blocklist is empty at launch. Any address added to it will be listed here with the reason, in a
new version of this document.

A rejected deposit is never stuck. Its depositor can ragequit at any time and receive the full amount.

## What gets published

- The approved set is a Lean incremental Merkle tree of deposit labels, hashed with Poseidon,
  identical to the tree the circuits expect.
- Each time the set changes, the poster calls `Entrypoint.updateRoot(root, cid)`. `cid` is a
  CIDv1 identifier (raw codec, sha2-256) of the JSON document listing the labels, so the identifier
  posted on chain commits to the exact set.
- The node serves every published set at `/asp/sets/<cid>` and the current one at `/asp`.
- The decision for any single deposit is at `/asp/deposits/<label>`, with its status and reason.

## How to audit it

Anyone can check that the posted root is the root of the published set, and that the set is what the
rule produces:

1. Fetch `/asp` from any node. It returns the latest root, the CID and the full list of labels.
2. Rebuild the tree from the labels with `@zk-kit/lean-imt` and `poseidon-lite` and compare its root to
   the one returned, and to `Entrypoint.latestRoot()` on chain.
3. Fetch the deposits from `/pool/events` or from the chain, re-run the three checks above against each
   depositor, and compare the resulting label set to the published one.

Two nodes run against the same RPC produce the same set. A disagreement is a bug or a misbehaving
poster, and either is visible.

## What the poster cannot do

The poster key can post roots and nothing else. It cannot move funds, block a ragequit, see who spends,
or change any parameter. If it posted a root the rule does not produce, the worst case is that honest
deposits wait while the timelock replaces the poster, after its 48-hour delay.

## Changing the policy

A new rule is a new version of this document and a new `ASP_POLICY_VERSION` served by the node. Sets
published under the old version remain available at their CIDs. Opening the poster role to other
operators is a roadmap phase; the rule, the sets and the roots are public now so that the decisions
can be audited before anyone else is allowed to make them.
