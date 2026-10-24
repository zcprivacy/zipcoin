# Zipcoin protocol

Smart contracts for Zipcoin: an independent Privacy Pools v1 deployment for ZC on Ethereum, plus
stateless spender contracts that turn a private withdrawal into an action.

Every contract is deployed by this repository's script. Nothing references, calls or depends on
contracts deployed by anyone else. Only open-source code and the public trusted setup outputs are reused.

## Layout

```
lib/privacy-pools-core/   0xbow Privacy Pools v1.3.0 (Apache-2.0), audited; compiled unmodified
lib/lean-imt/             @zk-kit/lean-imt.sol 2.0.0 (MIT), vendored verbatim
lib/poseidon-solidity/    poseidon-solidity 0.0.5 (MIT), vendored verbatim
lib/openzeppelin-*/       OpenZeppelin 5.1.0 and upgradeable 5.0.2
src/ZipSpender.sol        base for every spender: processooor plumbing and relay-fee handling
src/ZipBook.sol           the Book: burn-to-post, public, unattributable, with replies
src/ZipDoorstep.sol       the Doorstep: burn to leave a message at one address, with a reserved field for sealed bytes
src/interfaces/           IZipSpender, the common instruction format
script/Deploy.s.sol       one script deploys verifiers, Entrypoint, pool, timelock and spenders
test/                     unit tests with mock verifiers, plus a full deploy rehearsal
```

## How a spender works

A Privacy Pools withdrawal names a `processooor` and carries arbitrary `data`. The proof's `context`
public signal is `keccak(abi.encode(Withdrawal, SCOPE))`, so the pool only pays out if the submitted
withdrawal is byte-for-byte what the user proved against.

Zipcoin spenders are processooors. The user encodes an `Instruction` into `data`:

```
Instruction { uint8 version; address feeRecipient; uint256 relayFeeBPS; bytes payload; }
```

`ZipSpender.execute` checks the header, calls `pool.withdraw`, pays the encoded relay fee, and hands
the remainder plus `payload` to the concrete spender. Anyone may submit the transaction; the fee can
only go to the recipient the user chose, so there is nothing to gain by front-running.

- **ZipBook** payload `Post { uint256 replyTo; string text; }`. Burns the amount to the furnace
  address and emits `Spoken(id, replyTo, burned, text)`. `replyTo` must be an existing id or 0.
- **ZipDoorstep** payload `Delivery { address door; string text; bytes cipher; }`. Same burn, emits
  `Delivered(id, door, burned, text, cipher)`. `cipher` is opaque bytes encrypted off-chain for the
  door's owner, so a delivery can be private as well as unattributable.

Spenders have no owner, no pause and no upgrade path. All parameters are immutable.

## Governance

- Pool contracts are immutable.
- The Entrypoint owner role is held only by an OpenZeppelin `TimelockController` with a 48-hour
  delay. `OWNER` proposes; anyone can execute after the delay. The deployer renounces its role in the
  same script run.
- The Entrypoint can close the pool to new deposits (`windDown`) but can never block withdrawals or
  ragequit, and cannot move pool funds.
- Default vetting fee is 0, so the Entrypoint accrues nothing from deposits.

## Commands

```
forge build
forge test
forge test --match-contract DeployTest -vvv      # rehearse the deployment locally
```

## Deploying a new instance

Rehearse against a local fork of mainnet with the real token, so the exact bytecode, parameters and
role handover are exercised, then deploy:

```
cp .env.example .env                              # MAINNET_RPC_URL, ETHERSCAN_API_KEY, OWNER, POSTMAN
anvil --fork-url $MAINNET_RPC_URL                 # terminal 1
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --account <keystore-name> --broadcast
```

```
forge script script/Deploy.s.sol --rpc-url mainnet --account <keystore-name> --broadcast --verify
```

Use `cast wallet import <keystore-name> --interactive` once to create the keystore. Never put a
private key in `.env` or on the command line.

## Status

Deployed on Ethereum mainnet on 23 October 2026; addresses, parameters, roles and verification steps
are in `../docs/deployments.md`. The Privacy Pools core is audited upstream and deployed unmodified.
Spenders hold no funds between transactions. The test suite covers the spenders and a full
deployment rehearsal.
