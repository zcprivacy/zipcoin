# Security

## Reporting

Report vulnerabilities privately through GitHub's "Report a vulnerability" button on the Security tab
of this repository. Do not open a public issue for anything that could affect users' funds or privacy.

Include what you found, where, how to reproduce it, and what you believe the impact is. Reports are
acknowledged promptly.

## Scope

In scope:

- `protocol/src`: the Zipcoin spender contracts and the deployment script.
- `services/node`: the indexer, API, association-set poster and relayer.
- `app`: the website and wallet, including key derivation and proof generation in the browser.

Out of scope, with where to report instead:

- The Privacy Pools core contracts, circuits and SDK, which Zipcoin deploys unmodified: report to
  0xbow at https://github.com/0xbow-io/privacy-pools-core.
- Third-party libraries: report to their maintainers.
- The ZC token contract, which was created by a public launchpad and is not part of this repository.

## What holds regardless of any bug here

- No key, including ours, can move funds inside the pool. A note moves only on a proof made by its owner.
- Ragequit returns a note to the wallet that deposited it without any relayer, poster or operator.
- The spender contracts hold no funds between transactions.
- The only administrative role sits behind a 48-hour public timelock.

## Disclosure

Any incident that affects users is disclosed publicly within 24 hours of confirmation, with the
transaction hashes involved, on the project site and in this repository.
