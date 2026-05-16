# CIP-95 wallet bridge (Conway governance)

## Overview
[CIP-95](source-cip95.md) is a **CIP-30 extension** for browser wallets and governance web apps in the **Conway era**. It lets dApps connect to wallets that can expose DRep/stake public material and sign Conway-era certificates (vote delegation, DRep registration, voting procedures, etc.) without forcing every CIP-30 wallet to adopt Conway behavior silently.

See also: [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md) for on-chain mechanics; [DRep metadata standard (CIP-119)](drep-metadata-cip119.md) for off-chain DRep profile anchors at registration time.

## Enabling the extension
```ts
const api = await cardano[walletName].enable({ extensions: [{ cip: 95 }] });
```

The `{ cip: 95 }` object acts as a **Conway-capability flag** at connection time. Clients should not assume Conway signing unless the wallet accepted this extension.

## API surface (practical)

### Credential discovery
- **`api.cip95.getPubDRepKey()`** → hex Ed25519 DRep public key (32 bytes). Apps hash with Blake2b-224 to form on-chain **DRep ID** (see CIP-1694 registered DReps; key derivation in CIP-105).
- **`api.getRegisteredPubStakeKeys()`** → hex stake pub keys already registered (includes pending registration certs).
- **`api.cip95.getUnregisteredPubStakeKeys()`** → stake keys not registered (or registration unknown—wallet may return them here).

Splitting registered vs unregistered stake keys supports [multi-stake-key](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0018) wallets and per-key vote delegation.

### Signing
- **`api.signTx(cborTx, partialSign?)`** — **not** under `cip95` namespace; intentionally overrides CIP-30 `.signTx()` with Conway-aware inspection and `drep_credential` witnesses. Returns only the witness set the wallet produced; apps merge witnesses before submit.
- **`api.cip95.signData(addr | DRepID, payload)`** — CIP-8 COSE signatures; pass **`DRepID`** in `addr` to sign with the DRep key (alternative: CIP-19 type-6 address built from DRep key hash).

### What wallets must not do via this bridge
- Witness **stake pool** or **constitutional committee** certificates (may inspect, must not sign).
- Sign **deprecated** Shelley certs (`genesis_key_delegation`, `move_instantaneous_rewards_cert`) → `TxSignError.DeprecatedCertificate`.

## Design principles
| Topic | Choice |
| --- | --- |
| Transaction construction | **Client/dApp** builds txs; wallet inspects and signs |
| Governance state | **Client/indexer** tracks delegation, DRep registration, etc. |
| vs folding into CIP-30 core | Separate extension so non-governance dApps/wallets are not forced to implement |
| vs standalone bridge | Reuses CIP-30 enable/handshake and extension siloing |
| Key encoding | Raw hex pubkeys from wallet; app handles Bech32/`drep1` encoding |
| Actor scope | Ada holders + DReps only |

## Relationship to metadata CIPs
- **CIP-119** defines what goes in a DRep registration **metadata anchor**; CIP-95 supplies the **wallet DRep key** and signing path to register and vote.
- **CIP-108 / CIP-100** govern governance **action** narrative metadata; CIP-95 does not fetch or validate those documents.

## ctools usage (application note)
The DRep bulk-vote tool derives `drep1...` from `api.cip95.getPubDRepKey()` (Blake2b-224 + Bech32) when the wallet exposes CIP-95; otherwise the user can paste a DRep ID manually. `ConnectWallet` currently calls `wallet.enable()` without passing `{ extensions: [{ cip: 95 }] }`—wallets that require explicit extension enable may need that added for reliable CIP-95 access.

## Related pages
- [Source: cip95](source-cip95.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Wiki Home](wiki-home.md)
