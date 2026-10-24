# Contributing

## Prerequisites

- [Foundry](https://getfoundry.sh) 1.5 or newer
- Node.js 20 or newer
- Git with submodule support

Clone with the libraries:

```
git clone --recurse-submodules https://github.com/zcprivacy/zipcoin.git
cd zipcoin
```

## Build and test

| Package | Commands |
|---|---|
| `protocol/` | `forge build` · `forge test` · `forge test --match-contract DeployTest -vvv` rehearses the deployment |
| `services/node/` | `npm ci` · `npm run typecheck` · `npm run build` · `npx tsx scripts/e2e.ts` runs the full flow against a local chain |
| `app/` | `npm ci` · `npm run typecheck` · `npm run build` (copies the proving artifacts from the pinned core first) |

The end-to-end rehearsal on a local Anvil chain is described in `docs/run-your-own.md`.

## Changes

- Open an issue or a draft pull request before large changes, so the design is discussed first.
- Every change lands through a pull request with CI green. This applies to maintainers too.
- Keep pull requests small and single-purpose. Prefix the title with the area: `protocol:`, `node:`,
  `app:`, `docs:`, `ci:`.
- Contract changes come with tests. Changes to the association policy come with an update to
  `docs/asp-policy-v1.md` or a new policy version document.
- Documentation states milestones, never target dates.

## What not to commit

- Private keys, keystores, environment files, hosting project files, or any operator's hostnames.
  The app's `vercel.json` is generated from a template at deploy time for this reason.
- Proving artifacts larger than the committed verification keys; they are copied from the pinned
  core submodule at build time and checked against `app/artifacts.manifest.json`.
- Screenshots, databases, build output.

## Licence

By contributing you agree that your contribution is licensed under the Apache License 2.0, the
licence of this repository.
