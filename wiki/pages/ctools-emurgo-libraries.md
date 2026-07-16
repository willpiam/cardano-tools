# ctools: Emurgo library inventory

Inventory of **Emurgo-published** libraries present in this repository (app runtime, transitive npm deps, and ingested third-party source). Snapshot from codebase review **2026-07-16**.

## Direct app dependency

| Package | Declared / resolved | Role |
|---------|---------------------|------|
| `@emurgo/cip14-js` | `^3.0.1` / `3.0.1` | CIP-14 asset fingerprint (`asset1…`) |

Declared in root `package.json`.

### Application call sites

- `src/utils/cip14AssetFingerprint.ts` — imports `AssetFingerprint`; `AssetFingerprint.fromParts(policy, name).fingerprint()`.
- `src/pages/AssetCip20Messages.tsx` (Conch `/conch`) — calls `assetFingerprintFromUnitHex`; no direct `@emurgo` import.

No other file under `src/` imports `@emurgo/*`. Conch / CIP-14 UI behavior is also noted on [DRep voting history: Blockfrost key and URL params](ctools-drep-voting-history-blockfrost.md).

## Transitive npm packages (no app imports)

Pulled in by **Lucid Evolution** (`@lucid-evolution/lucid` → `@lucid-evolution/sign_data`). Present in `package-lock.json` / `node_modules`; **ctools source does not import them**.

| Package | Resolved | Brought in by |
|---------|----------|---------------|
| `@emurgo/cardano-message-signing-nodejs` | `1.1.0` | `@lucid-evolution/lucid`, `@lucid-evolution/sign_data` |
| `@emurgo/cardano-message-signing-browser` | `1.1.0` | `@lucid-evolution/sign_data` |

## Not Emurgo (serialization stack used by the app)

ctools transaction/CBOR work uses **Cardano Multiplatform Lib (CML)** under Anastasia Labs / dcSpark package names—not the Emurgo `@emurgo/cardano-serialization-lib*` npm line:

- Direct: `@anastasia-labs/cardano-multiplatform-lib-browser` `6.0.2-3`
- App modules: `src/functions/{bulkVote,cip20Metadata,drepCredential,drepMetadataTx,treasuryDonation,voteTxAnchors}.ts`

See [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md). CML is historically related to Emurgo serialization work but is a separate maintained stack in this repo’s dependency tree.

## Ingested third-party only (`wiki/raw/`)

Emurgo’s Rust crate **`cardano-serialization-lib` `15.0.3`** appears under `wiki/raw/blockfrost-platform-main/` (Blockfrost Platform source tree). It is **not** a dependency of the React app.

- Workspace dep: `wiki/raw/blockfrost-platform-main/Cargo.toml`
- Crates: `common`, `gateway`, `sdk_bridge`, `integration_tests`
- Example uses: key/payment credential helpers; Hydra verification / coin selection / tx body building; integration `tx_builder.rs`

Documented as a source at [Source: blockfrost-platform-main](source-blockfrost-platform-main.md).

## Non-library “EMURGO” strings

- `LittleBoy/setup.json` — DRep display name `"EMURGO"` (fixture/data, not a library).
- Wiki raw CIP / wallet docs may mention Emurgo, Yoroi, or `cardano-serialization-lib` historically; those are documentation references, not ctools runtime deps.

## Related pages

- [DRep voting history: Blockfrost key and URL params](ctools-drep-voting-history-blockfrost.md) (Conch + `@emurgo/cip14-js`)
- [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md)
- [Source: blockfrost-platform-main](source-blockfrost-platform-main.md)
- [Wiki Home](wiki-home.md)
