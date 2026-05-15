# Source: cardano-multiplatform-lib-combined

## Source metadata
- Location: `wiki/raw/cardano-multiplatform-lib-combined.md`
- Origin note: File aggregates multiple upstream doc fragments under `llm-docs/cml/` paths (crate architecture, getting started, introduction, builder examples, etc.).

## Summary
Combined documentation snapshot for **Cardano Multiplatform Lib (CML)**—a multi-target Rust library (Rust crates, JS/TS, WASM) for Cardano serialization, transaction building, and related utilities. The raw file repeats section headers where sources were concatenated; this wiki distills durable claims without mirroring the full pasted examples.

## Key claims (from introduction and architecture sections)
- CML targets multiple deployments: Rust crates, JavaScript/TypeScript, WASM; NPM packages exist for browser and Node; asm.js package exists but is **strongly discouraged** (slow crypto).
- Crate split: **core** (shared types), **chain** (current-era on-chain types/builders—primary for most users), **crypto**, **multi-era** (historical eras Byron→Babbage and wrappers for chain parsing), **cip25**, **cip36** (Catalyst registration).
- Webpack **v5+** is required when bundling the JS/WASM builds.
- Serialization code is generated from Cardano specifications (cddl-codegen / EMURGO & dcSpark toolchain emphasis), with an explicit goal of **preserving CBOR encoding details** relevant to hashing and cross-tool compatibility.
- Public examples in the combined source use the **WASM/TS API**; Rust callers must translate patterns (constructors, ownership).

## Open gaps in raw source
- Installation/run/build shell examples in the combined file contain placeholder `todo` in several places; treat operational commands as **incomplete** in this snapshot.

## Related pages
- [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md)
- [Wiki Home](wiki-home.md)
