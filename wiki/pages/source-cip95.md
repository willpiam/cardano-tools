# Source: cip95

## Source metadata
- Location: `wiki/raw/Web-Wallet Bridge - Conway ledger era.md`
- CIP: 95
- Title: Web-Wallet Bridge - Conway ledger era
- Source URL: https://cips.cardano.org/cip/CIP-95
- Category: Wallets
- Clipping created: 2026-05-16

## Summary
CIP-95 extends [CIP-30](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0030/README.md) with a **governance extension** (`cip: 95`) so web apps can support **Ada holders and DReps** in the **Conway ledger era** (CIP-1694). Wallets expose public DRep/stake keys, extended `.signTx()` / `.signData()` for Conway certificates and `drep_credential` witnesses, while **clients** build transactions and track governance state.

## Key claims
- CIP-30 predates Conway; expecting all wallets to silently upgrade CIP-30 behavior is considered infeasible—an explicit extension signals Conway capability.
- Enable: `cardano.{wallet-name}.enable({ extensions: [{ cip: 95 }] })`; methods live under `api.cip95` except **`.signTx()`**, which **overrides** CIP-30 in a backwards-compatible way.
- **Stakeholders:** Ada holders and DReps only—not constitutional committee members or SPOs (different credentials, often not in light wallets).
- **Wallet role:** share public keys, inspect/sign/submit transactions; **not** required to track full governance state (apps/indexers do).
- **Encoding:** public keys returned as **raw hex** where possible; apps derive `DRepID` (Blake2b-224 of Ed25519 DRep pubkey per CIP-1694) and addresses (CIP-19 type 6 for DRep signing addresses).
- DRep key derivation references **CIP-105** (Conway HD wallet key chains).

## Governance extension API (methods)
| Method | Namespace | Purpose |
| --- | --- | --- |
| `getPubDRepKey()` | `api.cip95` | Account's public DRep key (hex, 32 bytes) |
| `getRegisteredPubStakeKeys()` | `api` (root) | Stake keys registered on-chain (incl. pending registration) |
| `getUnregisteredPubStakeKeys()` | `api.cip95` | Unregistered stake keys (or unknown status treated as unregistered) |
| `signTx(tx, partialSign?)` | `api` (override) | Conway cert/field inspection + witnesses for payment, stake, **DRep** keys |
| `signData(addr, payload)` | `api.cip95` | CIP-8 message signing; `addr` may be `Address` or `DRepID` |

## Conway `.signTx()` support matrix
**Supported certificates (inspect):** pre-Conway stake/pool certs (0–4); Conway `reg_cert` … `update_drep_cert` (5–16).

**Supported transaction body fields (inspect):** `voting_procedure`, `proposal_procedure`, treasury `coin` / donation `positive_coin` (indices 19–22); fields 0–18 should be recognizable.

**Deprecated (reject with `TxSignError.DeprecatedCertificate`):** `genesis_key_delegation`, `move_instantaneous_rewards_cert`.

**Recognized but not witnessed:** stake pool registration/retirement and constitutional committee hot/cold certs—wallets witness only payment, stake, and DRep keys.

## Error extensions (from CIP-30)
- `APIError.Refused` also covers extension revoked/disabled.
- `TxSignError.ProofGeneration` also when DRep SK unavailable; new `DeprecatedCertificate` (3).
- `DataSignError.ProofGeneration` also when DRep SK unavailable.

## Example flows (from spec)
1. **Connection/login:** enable with CIP-95 → `getRegisteredPubStakeKeys` + `getPubDRepKey` → indexer lookup → show governance “login” state.
2. **Vote delegation:** app builds `vote_deleg_cert` tx (CIP-30 UTxO/address queries) → `.signTx()` → `.submitTx()`.
3. **DRep registration:** app builds `reg_drep_cert` with metadata anchor → `.signTx()` (payment + DRep witnesses).

## Path to Active (acceptance criteria snapshot)
- **Wallets:** Nufi, Lace, Yoroi, cip95-demos-wallet (per CIP).
- **Apps:** SanchoNet GovTool, GovTool, cip95-cardano-wallet-connector, drep-campaign-platform.
- **Libraries:** Cardano JS-SDK, purescript-cip95, Mesh SDK.

## Related pages
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Wiki Home](wiki-home.md)
