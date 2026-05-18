# Source: cip129

## Source metadata
- Location: `wiki/raw/Governance Identifiers.md`
- CIP: 129
- Title: Governance Identifiers
- Source URL: https://cips.cardano.org/cip/CIP-0129
- Published: 2024-07-15
- Clipping created: 2026-05-16

## Summary
**CIP-129** standardizes byte and Bech32 encodings for Conway-era **governance identifiers**: DRep credentials, constitutional committee (CC) hot/cold credentials, and **governance action IDs**. A **single-byte header** embeds key type (bits 7–4) and credential type (bits 3–0) so metadata survives when tools store raw bytes instead of Bech32 strings. Governance actions use a separate compact format: **32-byte tx id + index** with prefix `gov_action`.

## Key claims
- Problem: infrastructure often decodes Bech32 to raw bytes and **loses prefix metadata**; header byte preserves type in byte form.
- Header layout inspired by reward-address style but new semantics for governance credentials.
- Credential types **reserve** values 0–1 to avoid collision with address network tags.
- Key types: `0000` CC Hot, `0001` CC Cold, `0010` DRep (room for 16 types).
- Credential types: `0010` Key Hash, `0011` Script Hash.
- On-chain gov action reference (CIP-1694): `tx_id#index`; CIP-129 hex = tx id bytes || index bytes; Bech32 prefix `gov_action`.
- Bech32 prefixes: `drep`, `cc_hot`, `cc_cold`, `gov_action`.
- Examples: `tx#17` → hex ending `...11`, Bech32 `gov_action1qqqq...`; DRep key hash test vector → `drep1ygqq...`.
- **No hard fork** required; UI and sharing medium; explorers/wallets may support legacy CIP-105 prefixes during transition.
- Acceptance targets: Ledger/Trezor apps, CNTools, Koios, Blockfrost, Cardanoscan, Eternl, Lace, etc.
- Related: updates suggested for **CIP-105** and **CIP-005** prefix vectors when this CIP merges.

## Test vectors (from spec)
| Role | Header (hex) | Bech32 prefix | Example (all-zero key) |
| --- | --- | --- | --- |
| CC Hot, key hash | `02` | `cc_hot1` | `cc_hot1qgqqqq...` |
| CC Cold, script hash | `13` | `cc_cold1` | `cc_cold1zvqqqq...` |
| DRep, key hash | `22` | `drep1` | `drep1ygqqqq...` |

## Related pages
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Wiki Home](wiki-home.md)
