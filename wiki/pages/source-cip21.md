# Source: cip21

## Source metadata
- Location: `wiki/raw/Transaction requirements for interoperability with hardware wallets.md`
- CIP: 21
- Title: Transaction requirements for interoperability with hardware wallets
- Source URL: https://cips.cardano.org/cip/CIP-0021
- Published: 2021-06-15
- Category: Wallets / serialization
- Clipping created: 2026-05-18

## Summary
**CIP-21** defines restrictions on Cardano transactions that must be signed by **hardware wallets (HW)**. HW devices stream transaction chunks, compute a rolling hash of the body, and return witness signatures only—so software must reconstruct the exact body using a **shared, unambiguous CBOR serialization** (canonical CBOR per RFC 7049 §3.9). The CIP also caps element counts, forbids certain certificate combinations, and documents device-specific gaps (Ledger Nano S, Trezor Conway limitations).

## Key claims
- HW wallets cannot process all node-valid transactions (memory, limited types, streaming hash model).
- **Canonical CBOR** required: minimal integers, shortest lengths, sorted map keys, definite-length items; Conway **tag 258** in sets must be all-or-nothing across the tx.
- **Unsupported body entries:** `6 : update`, `20 : proposal procedures` (governance action submission via HW must not include proposal procedures in the signed body per this rule).
- **Firmware lag:** recent ledger CDDL changes may impose extra HW restrictions until device apps catch up.
- **Integer bounds:** signed/unsigned values must fit `int64` / `uint64`.
- **Count caps:** inputs, outputs, asset groups, tokens, certs, pool owners/relays, withdrawals, collateral, required signers, reference inputs, total witnesses — each ≤ `UINT16_MAX` (65535); voting procedures: **one voter, one procedure**.
- **Optional empty** lists/maps must not appear unless spec says otherwise; Conway CDDL is stricter (non-empty sets/maps).
- **Outputs:** legacy (array) and post-Alonzo (map) formats both supported for now; legacy empty multi-asset must use `[address, coin]` not `[address, [coin, {}]]`; non-empty `datum_option.data` and `script_ref` when present.
- **Multiassets:** sorted keys; no duplicate `policy_id` or `asset_name` within a policy.
- **Unsupported certs:** `genesis_key_delegation`, `move_instantaneous_rewards_cert`, and Conway combined delegation certs (`stake_vote_deleg_cert`, `stake_reg_deleg_cert`, `vote_reg_deleg_cert`, `stake_vote_reg_deleg_cert`).
- **Pool registration isolation:** if present, tx must not include other certs, withdrawals, mint, datum/reference outputs, script data hash, collateral, required signers, reference inputs, voting procedures, treasury/donation fields.
- **Signing modes (Ledger/Trezor):** stake pool registration (minimal tx), ordinary (key-path credentials), multisig (script hashes, CIP-1854), Plutus (max flexibility, user sees more).
- **Withdrawals:** reward-account map keys sorted canonically; no duplicate withdrawal keys.
- **Auxiliary data:** HW includes only `auxiliary_data_hash` in body (does not serialize aux data), except **Catalyst voting registration** which uses tuple format `[metadata map, auxiliary_scripts: []]` with empty scripts array.
- **Credentials (ordinary mode):** key-hash credentials and withdrawal addresses should use wallet derivation paths so users see owned keys; Plutus mode relaxes this for script flexibility.
- **DRep witnesses:** no restriction on combining DRep certs and votes in one tx (unlike stake pool registration + withdrawals); but **voting procedures** are capped at one voter × one procedure (see below).
- **Trezor gaps (as of source):** no DRep/CC key derivation, no DRep/CC certs, no voting procedures, no treasury/donation tx fields; pool registration only as owner not operator.
- **Interop tools:** `cardano-hw-interop-library`, `cardano-hw-cli`.

## Path to Active
- Acceptance: interoperability generally achieved since Alonzo (absent ongoing incompatibilities).
- Implementation: validation/transformation libraries listed above.

## Related pages
- [Hardware wallet transaction interoperability (CIP-21)](hardware-wallet-transaction-interop-cip21.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md)
- [Wiki Home](wiki-home.md)
