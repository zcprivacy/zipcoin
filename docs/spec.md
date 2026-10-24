# Zipcoin protocol specification

This document describes the protocol as deployed on Ethereum mainnet at tag `mainnet-2026-10-23`.
Where it describes behaviour of the Privacy Pools v1 core, the core's own source is authoritative;
Zipcoin deploys it unmodified.

## 1. Components

| Component | Source | Role |
|---|---|---|
| Entrypoint | Privacy Pools v1, UUPS proxy | Accepts deposits, forwards relayed withdrawals, holds the association root, registers pools, holds roles |
| ZC pool | Privacy Pools v1 `PrivacyPoolComplex` | Holds ZC, maintains the state tree, verifies proofs, pays withdrawals and ragequits |
| Verifiers | Privacy Pools v1 Groth16 verifiers | Verify withdrawal and ragequit proofs; keys from the core's public trusted setup |
| Timelock | OpenZeppelin `TimelockController`, 48 h | Sole holder of the Entrypoint owner role |
| The Book | `protocol/src/ZipBook.sol` | Spender: burns the withdrawn amount and records a text entry |
| The Doorstep | `protocol/src/ZipDoorstep.sol` | Spender: burns the withdrawn amount and records a text and optional sealed bytes at one address |

The Book and the Doorstep share `ZipSpender`, which implements the `IZipSpender` interface.

## 2. Actors

- **User.** Holds a zip key, deposits publicly, spends privately through proofs generated in the browser.
- **Relayer.** Submits users' proofs with its own gas and receives the fee the user fixed in the proof. Has no role on chain.
- **Association set poster.** Holds the Entrypoint `ASP_POSTMAN` role. Applies the published policy and posts the approved root.
- **Owner.** The timelock. Can register pools, set asset parameters, replace the poster and upgrade the Entrypoint, each after a 48-hour public delay.

## 3. Keys and notes

### 3.1 The zip key

The zip key is a 12-word BIP-39 phrase. A wallet derives it by signing this fixed message:

```
Zipcoin zip key v1

Signing this message derives the key that controls your private notes.
Only sign it on the Zipcoin app. It costs no gas and sends nothing.
```

The first 16 bytes of `keccak256(signature)` are the BIP-39 entropy. The same wallet produces the same
phrase on every device. The phrase can also be entered directly, so notes are usable without the wallet.
Nothing is stored by the application. Anyone holding the phrase can spend the notes it controls.

The message text is a protocol constant. A future message would be added under a new version, never
by changing this one.

### 3.2 Note secrets

From the phrase the Privacy Pools SDK derives master keys. For deposit index `i` into a pool with
scope `S`, it derives a nullifier `n_i` and a secret `s_i`. Spending a note creates a change note
whose secrets are derived from the same keys with one further index. Secrets are never stored;
recovery re-derives them and matches them against public deposit events.

Hashes are Poseidon over the BN254 scalar field:

```
precommitment = Poseidon(n, s)
commitment    = Poseidon(value, label, precommitment)
nullifierHash = Poseidon(n)
```

### 3.3 Labels

Each deposit receives a label from the pool:

```
label = keccak256(abi.encodePacked(SCOPE, ++nonce)) mod p
```

`SCOPE` identifies the pool: `keccak256(abi.encodePacked(address(pool), block.chainid, asset)) mod p`.
A change note keeps the label of the deposit it descends from. The association set is a set of labels,
so approval of a deposit covers every later note that descends from it.

## 4. Deposit

`Entrypoint.deposit(asset, value, precommitment)`:

1. Transfers `value` ZC from the caller. Minimum deposit is 1 ZC. The vetting fee is 0.
2. Calls the pool, which assigns a label, computes the commitment and inserts it into the state tree.
3. Records `depositors[label] = caller` in the pool, which is what later authorises ragequit.
4. Emits `Deposited(depositor, pool, commitment, value)`; the pool emits the label and precommitment.

Everything in a deposit is public: the depositing address, the amount, the commitment, the label.

## 5. Association set

The poster applies the policy in `docs/asp-policy-v1.md` to every deposit. Approved labels form a
Lean incremental Merkle tree (Poseidon). The poster calls `Entrypoint.updateRoot(root, cid)` where
`cid` is a content identifier of the full set, which the node serves at `/asp/sets/<cid>`.

A withdrawal proof must reference the latest posted root. Deposits that are not approved cannot be
spent privately; they can always be returned by ragequit.

## 6. Withdrawal proofs

The state tree is a Lean incremental Merkle tree of depth up to 32; the pool accepts any of its
recent roots. A withdrawal proof is Groth16 over the core's `withdraw` circuit with eight public
signals, in order:

| # | Signal | Meaning |
|---|---|---|
| 1 | `newCommitmentHash` | The change note inserted after this spend |
| 2 | `existingNullifierHash` | Marks the spent note; the pool rejects it a second time |
| 3 | `withdrawnValue` | Amount leaving the pool |
| 4 | `stateRoot` | A recent state root |
| 5 | `stateTreeDepth` | Depth used for the state proof |
| 6 | `ASPRoot` | Must equal the latest posted association root |
| 7 | `ASPTreeDepth` | Depth used for the association proof |
| 8 | `context` | Binds the proof to one exact withdrawal |

```
context = keccak256(abi.encode(Withdrawal{processooor, data}, SCOPE)) mod p
```

The proof asserts: a note with the claimed value exists in the state tree; its label is in the
association set; the nullifier derives from that note; the change note is well formed; and the
context matches. It reveals none of: which deposit, which note, who.

`Withdrawal.processooor` is the address allowed to call `pool.withdraw` with this proof.
`Withdrawal.data` is opaque to the pool and interpreted by the processooor.

## 7. Direct withdrawals

`Entrypoint.relay(withdrawal, proof, scope)` with `processooor = Entrypoint` and

```
data = abi.encode(RelayData{address recipient, address feeRecipient, uint256 relayFeeBPS})
```

The Entrypoint withdraws from the pool, pays `withdrawnValue * relayFeeBPS / 10_000` to
`feeRecipient` and the remainder to `recipient`. `relayFeeBPS` may not exceed the asset's maximum,
300 basis points on mainnet. Because `data` is inside `context`, nobody can alter the recipient or
the fee after proving.

## 8. Spenders

### 8.1 Instruction

A spender is a processooor. Its `data` is an `Instruction`:

```solidity
struct Instruction {
  uint8   version;       // 1
  address feeRecipient;  // paid the relay fee
  uint256 relayFeeBPS;   // at most MAX_RELAY_FEE_BPS, 300
  bytes   payload;       // spender-specific
}
```

### 8.2 Execution

`execute(withdrawal, proof)`, callable by anyone:

1. Require `withdrawal.processooor == address(this)`, `version == 1`, `relayFeeBPS <= MAX_RELAY_FEE_BPS`.
2. Call `POOL.withdraw(withdrawal, proof)`. The pool verifies the proof and transfers `withdrawnValue` to the spender.
3. Require the spender's balance to have grown by exactly `withdrawnValue`.
4. Pay `withdrawnValue * relayFeeBPS / 10_000` to `feeRecipient`.
5. Hand the remainder and `payload` to the concrete spender.
6. Emit `Executed(nullifierHash, feeRecipient, withdrawnValue, fee)`.

Spenders have no owner, no pause and no upgrade path. Every parameter is immutable. A spender holds
no balance between transactions.

### 8.3 The Book

```solidity
struct Post { uint256 replyTo; string text; }
```

- `text` is at most 280 bytes. `replyTo` is 0 or the id of an existing entry.
- The remainder after the fee must be at least `MIN_BURN`, 1,000 ZC. It is transferred to the
  furnace address `0x000000000000000000000000000000000000dEaD`.
- Emits `Spoken(id, replyTo, burned, text)`. Ids are sequential.

### 8.4 The Doorstep

```solidity
struct Delivery { address door; string text; bytes cipher; }
```

- `door` is the address the delivery is addressed to and may not be zero. `text` is at most 280
  bytes. `cipher` is at most 1,024 bytes of opaque data for the door's owner; the contract does not
  interpret it.
- The remainder after the fee must be at least `MIN_BURN`, 100 ZC, and is burned as above.
- Emits `Delivered(id, door, burned, text, cipher)`.

## 9. Ragequit

`pool.ragequit(proof)` returns the full value of a note to `depositors[label]`, and only that
address may call it. It needs no association root, no relayer and no approval. It works for pending
and rejected deposits. It is public: the amount and the depositor are visible.

## 10. Governance and parameters

| Parameter | Value | Who can change it |
|---|---|---|
| Entrypoint owner | Timelock, 48 h delay, proposer the project owner key, executor anyone | Timelock itself |
| Minimum deposit | 1 ZC | Owner, via timelock |
| Vetting fee | 0 | Owner, via timelock |
| Maximum relay fee | 300 basis points | Owner, via timelock |
| Association set poster | One address with `ASP_POSTMAN` | Owner, via timelock |
| Pool, verifiers, spenders | Immutable | Nobody |
| Book `MIN_BURN`, `MAX_TEXT_BYTES` | 1,000 ZC, 280 | Nobody |
| Doorstep `MIN_BURN`, `MAX_TEXT_BYTES`, `MAX_SEALED_BYTES` | 100 ZC, 280, 1,024 | Nobody |

The owner can also stop new deposits into a pool. It cannot block withdrawals or ragequits, and it
cannot move pool funds.

## 11. What is public

| Action | Public | Not public |
|---|---|---|
| Deposit | depositor, amount, commitment, label | the note secrets |
| Approval | the set of approved labels, the root, the policy | nothing hidden |
| Withdrawal or spend | amount, recipient or payload, fee, nullifier hash, new commitment | which deposit, who |
| Book entry | text, burned amount, reply target | author |
| Doorstep delivery | door, text, cipher bytes, burned amount | sender; the plaintext of `cipher` if encrypted |
| Ragequit | depositor, amount | nothing hidden |

Privacy of a spend depends on the size of the approved set and on timing. A set of a few deposits
offers little; the metric that matters is how many approved deposits exist.

## 12. Node API

A node rebuilds everything above from chain events and serves it to wallets. Endpoints are listed in
`services/node/README.md`. Any node run against the same RPC produces the same data.

## 13. Known limitations

- The anonymity set is the number of approved deposits. Early on it is small.
- A relayer sees the network address of the request. It does not learn the note.
- One poster publishes the association root today. Opening the role is a roadmap phase.
- The app does not yet encrypt `cipher` for Doorstep deliveries; the field is reserved for it.
- Proof generation in the browser takes several seconds.
