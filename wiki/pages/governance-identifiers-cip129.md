# Governance identifiers (CIP-129)

## Overview
[CIP-129](source-cip129.md) defines how Conway-era **governance roles and actions** are labeled for humans and tools: compact binary IDs with embedded metadata, plus standard **Bech32 prefixes**. It complements [CIP-1694](cardano-governance-cip1694.md) on-chain mechanics and [CIP-95](cip95-wallet-bridge.md) wallet key exposure (which returns raw hex; apps encode `drep1...`).

## Why a header byte?
Many services decode Bech32 to raw bytes for storage and drop the string prefix. CIP-129 packs **key type** and **credential type** into the first byte so byte-only storage still carries role metadata.

```
1 byte header | variable key payload
bits [7:4] = key type    bits [3:0] = credential type
```

Credential type values **0** and **1** are reserved so governance IDs are not mistaken for address network tags.

## Key and credential types
| Header bits [7:4] | Role |
| --- | --- |
| `0000` | Constitutional committee **hot** |
| `0001` | Constitutional committee **cold** |
| `0010` | **DRep** |

| Header bits [3:0] | Credential |
| --- | --- |
| `0010` | Key hash |
| `0011` | Script hash |

## Bech32 prefixes
| Prefix | Contents |
| --- | --- |
| `drep1` | DRep credential (header + hash) |
| `cc_hot1` | CC hot credential |
| `cc_cold1` | CC cold credential |
| `gov_action1` | 32-byte proposal tx id + action index |

## Governance action IDs
CIP-1694 defines an action as **`transaction_id#cert_index`** (e.g. `abc...f0#17`).

CIP-129 concatenates:
- **32 bytes** — transaction id
- **Index bytes** — proposal index (e.g. `11` hex for index 17)

Then Bech32-encodes with prefix **`gov_action`**. Example from spec: all-zero tx id + index 17 → `gov_action1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpzklpgpf`.

Explorers (e.g. Cardanoscan) and APIs (Blockfrost, Koios) increasingly accept these forms; Blockfrost platform changelog notes CIP-129 support.

## Relationship to other standards
- **CIP-1694** — defines what is voted on and how actions are referenced on-chain (`tx#index`).
- **CIP-105** — HD wallet derivation for DRep keys; older Bech32 prefix conventions; CIP-129 aligns prefixes with header semantics.
- **CIP-119** — off-chain DRep **profile** metadata at registration; CIP-129 is the **identifier** format, not the narrative document.
- **CIP-21** — Trezor may lack DRep/CC key derivation and Conway signing paths; identifier display can still use `drep1` from software-derived hashes.

## Handle.me DRep subhandles
Handle.me **DRep subhandles** (e.g. `goose@drep`) resolve via `GET https://api.handle.me/handles/{name}` with a nested **`drep`** object exposing **`cip_105`** and **`cip_129`** Bech32 strings alongside `resolved_addresses.ada`. See [Cardano ADA Handles](cardano-ada-handles.md).

## ctools usage
- **DRep bulk vote / voting history:** `drep1...` IDs from wallet (`CML.Ed25519KeyHash.to_bech32('drep')` after Blake2b-224 of CIP-95 pubkey) or manual paste; Lucid `drepIDToCredential` parses Bech32 for voting.
- **Live Governance Actions:** Cardanoscan links use `https://cardanoscan.io/govAction/{id}`; Blockfrost APIs key proposals by `tx_hash` + `cert_index` (equivalent to CIP-1694 `#` form). CIP-129 `gov_action1` is the shareable encoded bundle of the same pair.

## Transition and compatibility
CIP-129 does not require a hard fork. Wallets and explorers may show **both** legacy CIP-105-style prefixes and CIP-129 during migration; key-generation tools can adopt new prefixes with find-and-replace style updates per the CIP implementation plan.

## Related pages
- [Cardano ADA Handles](cardano-ada-handles.md)
- [Source: cip129](source-cip129.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Live Governance Actions](ctools-governance-actions-live.md)
- [Hardware wallet transaction interoperability (CIP-21)](hardware-wallet-transaction-interop-cip21.md)
- [Wiki Home](wiki-home.md)
