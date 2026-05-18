# Hardware wallet transaction interoperability (CIP-21)

## Overview
[CIP-21](source-cip21.md) is the interoperability contract between **software wallets / tx builders** and **hardware wallets** on Cardano. Because HW devices sign a streamed body hash and return witnesses only, every client must serialize transactions in the same **canonical CBOR** form and respect structural limits so the reconstructed body matches what the device signed.

This matters for governance tooling when users sign Conway-era transactions on Ledger or Trezor: several Voltaire features are **disallowed or incomplete** on some devices even when valid on-chain.

## Canonical serialization
Transactions must follow [RFC 7049 §3.9](https://datatracker.ietf.org/doc/html/rfc7049#section-3.9) canonical rules:
- Minimal integer encodings and shortest length prefixes.
- **Sorted map keys** (enables HW duplicate-key detection).
- Definite-length encoding (no indefinite-length items).
- Conway: optional CBOR tag **258** on set-like arrays must be **consistent**—either nowhere or everywhere per CDDL.

CML and other libraries advertising CBOR fidelity should align with these rules when targeting HW signing; see [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md).

## Structural limits (selected)
| Area | Rule |
| --- | --- |
| Body entries | No `update` (6) or `proposal procedures` (20) |
| Integers | Fit `int64` / `uint64` |
| Counts | Each of inputs, outputs, mint groups, certs, witnesses, etc. ≤ 65535 |
| Voting procedures | At most **one** voter with **one** voting procedure (one gov action per tx for HW) |
| Empty optionals | Omit empty lists/maps unless explicitly allowed |
| Withdrawals | Sorted map keys; no duplicate accounts |
| Outputs | Prefer post-Alonzo (map) format; legacy empty MA = `[addr, coin]` not `[addr, [coin, {}]]` |

Ledger firmware may add restrictions beyond this CIP until Conway CDDL changes are fully implemented on device.

## Voting procedures (governance-critical)

CIP-21 allows only **one voter** with **one voting procedure** in `voting_procedures`. On-chain Conway maps can hold many `(gov_action_id → vote)` pairs per voter, but HW wallets reject multi-vote bodies.

Observed in ctools: Eternl with a **Ledger** device refuses txs built by `buildAndSubmitBulkVotes` when multiple live actions are selected, with an error equivalent to *"There must be exactly one voting procedure per voter"* (unsigned tx shows one `DRep` voter and multiple entries under `votes`).

**Implication for [DRep bulk vote](cip95-wallet-bridge.md):** batching many CIP-1694 votes into a single transaction works for some software wallets but is **not HW-compatible** under CIP-21. Use **one governance action per transaction** when signing on Ledger/Trezor, or sign via a software wallet that does not enforce CIP-21.

DRep **certificates** may still be combined with a **single** vote in the same tx (explicit exception in CIP-21 rationale).

## Auxiliary data

Hardware wallets normally hash auxiliary data only (`auxiliary_data_hash` in the body) and do not serialize metadata/scripts themselves. Exception: **CIP-36 Catalyst registration** requires the tuple encoding `[transaction_metadata, auxiliary_scripts: []]` with an empty scripts array so the device can sign the registration.

## Credentials and signing modes

In **ordinary** signing mode, payment/stake credentials and withdrawal addresses should be expressed as **derivation paths** so the user can confirm wallet ownership. **Plutus** mode allows broader credential usage (script hashes, etc.) at the cost of weaker UX guardrails—use only when required.

| Mode | Credentials | Typical use |
| --- | --- | --- |
| Stake pool registration | Minimal tx; pool cert only | SPO registration |
| Ordinary | Key paths | Standard transfers, stake ops |
| Multisig | Script hashes (CIP-1854) | Native multisig |
| Plutus | Flexible | Script data hash, collateral, complex scripts |

## Certificates and combinations
**Never include** (HW-unsupported types): Shelley `genesis_key_delegation`, `move_instantaneous_rewards_cert`; Conway combined delegation certs (`stake_vote_deleg_cert`, `stake_reg_deleg_cert`, `vote_reg_deleg_cert`, `stake_vote_reg_deleg_cert`).

**Pool registration** must be isolated: no other certs, withdrawals, mint, Plutus/datum/reference outputs, collateral, required signers, reference inputs, **voting procedures**, or **treasury/donation** fields in the same transaction.

**DRep certs + one vote:** DRep witness may cover both a DRep certificate and a vote; do not confuse with multi-vote bulk voting.

## Device-specific Conway gaps
From CIP-21 device notes — verify against current firmware before relying on HW for governance txs:

**Trezor (listed as missing):**
- Stake pool **cold** key derivation
- Operational certificate signing
- Pool registration as **operator** (owner-only supported)
- DRep and constitutional committee key derivation
- DRep and CC certificates (registration, retirement, update)
- Voting procedures
- Treasury and donation transaction fields

**Ledger Nano S (legacy):** operational certificates; native script hash derivation; stake pool registration and retirement; partial Byron address display (addresses still supported).

**Ledger Nano S Plus / Nano X / Stax:** CIP-21 “allowed” features expected to work when firmware supports them.

## Relationship to CIP-95 and governance apps
- [CIP-95](cip95-wallet-bridge.md) lets browser wallets sign Conway governance certs; HW users may still hit **CIP-21** limits when moving the same tx through Ledger/Trezor or CLI HW tools.
- Bulk voting / DRep registration flows that bundle many votes or mix unsupported certs may fail HW validation even if a software wallet accepts construction.

## Tooling
- [`cardano-hw-interop-library`](https://github.com/vacuumlabs/cardano-hw-interop-lib) — validate or normalize txs for HW compatibility.
- [`cardano-hw-cli`](https://github.com/vacuumlabs/cardano-hw-cli) — CLI wrapper using the interop library.

## Related pages
- [Source: cip21](source-cip21.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md)
- [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md)
- [Wiki Home](wiki-home.md)
