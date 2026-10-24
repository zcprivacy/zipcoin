# Deployments

## Ethereum mainnet, 23 October 2026

Deployed from this repository's `protocol/script/Deploy.s.sol` in one script run at block 26 251 103.
Source tag: `mainnet-2026-10-23`. The machine-readable record is `protocol/deployments/1.json`; the
full broadcast with every transaction hash is under `protocol/broadcast/Deploy.s.sol/1/`.

| Contract | Address | Verified |
|---|---|---|
| Entrypoint, ERC1967 proxy | `0x7959a703F49B2d0baa29978c2A126076a0150190` | [Etherscan](https://etherscan.io/address/0x7959a703F49B2d0baa29978c2A126076a0150190#code) · [Sourcify](https://repo.sourcify.dev/1/0x7959a703F49B2d0baa29978c2A126076a0150190) |
| Entrypoint implementation | `0xE8FcD12523aCd59456375a14d52170097F12f7F9` | [Etherscan](https://etherscan.io/address/0xE8FcD12523aCd59456375a14d52170097F12f7F9#code) · [Sourcify](https://repo.sourcify.dev/1/0xE8FcD12523aCd59456375a14d52170097F12f7F9) |
| ZC pool, `PrivacyPoolComplex` | `0x316E560405D221a01107392A7C1650916dd38F39` | [Etherscan](https://etherscan.io/address/0x316E560405D221a01107392A7C1650916dd38F39#code) · [Sourcify](https://repo.sourcify.dev/1/0x316E560405D221a01107392A7C1650916dd38F39) |
| Withdrawal verifier | `0xAfF0a152D80726bbaf9F147Ae5B84Ab4E0e5a958` | [Etherscan](https://etherscan.io/address/0xAfF0a152D80726bbaf9F147Ae5B84Ab4E0e5a958#code) · [Sourcify](https://repo.sourcify.dev/1/0xAfF0a152D80726bbaf9F147Ae5B84Ab4E0e5a958) |
| Ragequit verifier | `0xf8B0c85062c07Ef1654fe31831b4457a250e447E` | [Etherscan](https://etherscan.io/address/0xf8B0c85062c07Ef1654fe31831b4457a250e447E#code) · [Sourcify](https://repo.sourcify.dev/1/0xf8B0c85062c07Ef1654fe31831b4457a250e447E) |
| Timelock, `TimelockController` | `0x9CcE4FAcB48332846d075e0B793D06975Cb71e97` | [Etherscan](https://etherscan.io/address/0x9CcE4FAcB48332846d075e0B793D06975Cb71e97#code) · [Sourcify](https://repo.sourcify.dev/1/0x9CcE4FAcB48332846d075e0B793D06975Cb71e97) |
| The Book, `ZipBook` | `0xfFa010d4106f20e58058909b612f75668Ae3764e` | [Etherscan](https://etherscan.io/address/0xfFa010d4106f20e58058909b612f75668Ae3764e#code) · [Sourcify](https://repo.sourcify.dev/1/0xfFa010d4106f20e58058909b612f75668Ae3764e) |
| The Doorstep, `ZipDoorstep` | `0x8b72E65392ac44E30E50f7799EC8fe0585F3fD72` | [Etherscan](https://etherscan.io/address/0x8b72E65392ac44E30E50f7799EC8fe0585F3fD72#code) · [Sourcify](https://repo.sourcify.dev/1/0x8b72E65392ac44E30E50f7799EC8fe0585F3fD72) |

Asset: ZC, `0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA`. Pool scope:
`6010869506274674965221909637291313067715936254615401927322045992363755073413`.

### Constructor parameters

| Contract | Parameters |
|---|---|
| Pool | entrypoint, withdrawal verifier, ragequit verifier, ZC |
| Timelock | delay 172 800 s; proposer: owner key; executor: anyone; admin: none |
| Book | pool, max relay fee 300 bps, minimum burn 1 000 ZC, max text 280 bytes |
| Doorstep | pool, max relay fee 300 bps, minimum burn 100 ZC, max text 280 bytes, max sealed 1 024 bytes |

Entrypoint asset configuration at deployment: minimum deposit 1 ZC, vetting fee 0, maximum relay
fee 300 basis points.

### Roles at deployment

| Role | Address |
|---|---|
| Entrypoint `OWNER_ROLE` | the timelock only; the deployer renounced its role in the same run |
| Entrypoint `ASP_POSTMAN` | `0x6d1e45B503Fc5E9419eAE0BdF01e27b7446ab358` |
| Timelock proposer | `0x315F786e07208a9D89EF334d08C63d4B657275d7` |
| Deployer, no remaining role | `0xdC4eD9FAA323acBDE18F50A3E2077a870b525373` |
| Relayer operated by the project, no role | `0x33da4c675c3A67Ec5612975DCAc0077EdDDCcd1F` |

### Check it yourself

```
# the timelock is the only owner, and the deployer is not
cast call 0x7959a703F49B2d0baa29978c2A126076a0150190 "hasRole(bytes32,address)(bool)" $(cast keccak OWNER_ROLE) 0x9CcE4FAcB48332846d075e0B793D06975Cb71e97
cast call 0x7959a703F49B2d0baa29978c2A126076a0150190 "hasRole(bytes32,address)(bool)" $(cast keccak OWNER_ROLE) 0xdC4eD9FAA323acBDE18F50A3E2077a870b525373

# 48 hours
cast call 0x9CcE4FAcB48332846d075e0B793D06975Cb71e97 "getMinDelay()(uint256)"

# rebuild the bytecode from the tagged source
git checkout mainnet-2026-10-23 && git submodule update --init --recursive
cd protocol && forge build
```

Sourcify's match records the compiler settings, so a rebuild at the tag with `foundry.toml` as
committed reproduces the deployed bytecode. The spenders carry immutable parameters, which appear in
the runtime bytecode and are listed above.
