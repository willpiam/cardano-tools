# Cardano Multiplatform Lib (CML)

## Overview
**Cardano Multiplatform Lib (CML)** is a Rust-first Cardano library shipped as **Rust crates** and **JS/TS/WASM** bindings for serialization, transaction construction, and supporting utilities. The wiki summary is grounded in `wiki/raw/cardano-multiplatform-lib-combined.md` (a stitched doc export).

## Crate layout
| Crate / area | Role |
|--------------|------|
| **cml-core** | Core types shared across crates |
| **cml-chain** | Current-era on-chain types and builders—typical default for applications |
| **cml-crypto** | Keys, signatures, and primitives |
| **cml-multi-era** | Historical eras (Byron, Shelley, Alonzo, Babbage, …) and helpers for parsing legacy chain data |
| **cml-cip25** | NFT metadata (CIP-25) |
| **cml-cip36** | Catalyst registration (CIP-36) |

Most application work uses **`cml-chain`**; reach for **`cml-multi-era`** when ingesting pre-Conway era blocks/Tx; use **cip25** / **cip36** crates only when those standards apply.

## JavaScript / WASM consumption
- NPM packages include **`@dcspark/cardano-multiplatform-lib-browser`** and **`@dcspark/cardano-multiplatform-lib-nodejs`**.
- In this repo’s app dependency tree, ctools pins **`@anastasia-labs/cardano-multiplatform-lib-browser`** (same CML lineage; Anastasia Labs / dcSpark packaging—not an `@emurgo/*` package). For Emurgo packages actually present in the tree, see [Emurgo library inventory](ctools-emurgo-libraries.md).
- An **asm.js** build exists on NPM but is **deprecated path**: performance and currency with the mainline builds are poor.
- Bundlers should use **Webpack 5+** per upstream guidance in the raw doc.

## Design emphasis: CBOR fidelity
CML highlights **preserving concrete CBOR encodings** (not just abstract structures). That matters for **hashes**, interoperability with other encoders (CLI vs library), and Plutus-related data edges—an advertised differentiator versus ad-hoc JSON-first flows.

For **hardware wallet** signing, emitted transactions should also satisfy [CIP-21](hardware-wallet-transaction-interop-cip21.md) canonical CBOR and structural rules (sorted map keys, element caps, forbidden cert combinations).

## Treasury donation (tx builder, 6.2.0+)
From **CML 6.2.0** onward, the transaction builder exposes treasury-related helpers named in upstream release notes as **`set_donation`** (ADA donation to the treasury) and **`set_current_treasury_value`** (for builds where **Plutus** needs the current treasury amount). See [Source: CML release 6.2.0](source-cml-release-6-2-0-treasury-donation.md).

## Spec alignment
Authors point readers to **cardano-ledger-specs** formal specs (Shelley and later eras) as prerequisite reading rather than re-deriving ledger rules inside the library docs.

## Documentation caveat
The ingested combined raw file contains **placeholder `todo` commands** in its getting-started section; prefer upstream repo/README for copy-paste install commands until raw sources are refreshed.

## Related pages
- [Source: cardano-multiplatform-lib-combined](source-cardano-multiplatform-lib-combined.md)
- [Source: CML release 6.2.0](source-cml-release-6-2-0-treasury-donation.md)
- [Emurgo library inventory](ctools-emurgo-libraries.md) (contrast: Emurgo cip14 / message-signing / CSL vs CML)
- [Hardware wallet transaction interoperability (CIP-21)](hardware-wallet-transaction-interop-cip21.md)
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md)
- [Wiki Home](wiki-home.md)
