# Wiki Index

## Core
- [Wiki Home](pages/wiki-home.md) - High-level overview and current synthesis.

## Sources
- [Source: blockfrost-platform-main](pages/source-blockfrost-platform-main.md) - Decentralized Cardano API platform; fleet (Icebreakers) and solitary operating modes.
- [Source: cip100](pages/source-cip100.md) - Active CIP defining JSON-LD governance metadata anchors, `body` signing patterns, and extension model (foundation for CIP-108/119).
- [Source: cip108](pages/source-cip108.md) - Proposed CIP defining off-chain metadata vocabulary for governance actions as a CIP-100 extension.
- [Source: cip119](pages/source-cip119.md) - Proposed CIP for DRep registration/update off-chain profile metadata extending CIP-100 / Schema.org Person.
- [Source: cip1694](pages/source-cip1694.md) - CIP-1694 specification for Cardano's Voltaire-era on-chain governance framework.
- [Source: intersect CIP-1694 explained](pages/source-intersect-cip-1694-explained.md) - Intersect MBO news article (2024) summarizing CIP-1694 for a general audience.
- [Source: Voltaire DRep Campaign Module](pages/source-voltaire-drep-campaign-module.md) - 1694.io campaign/explainer rendering of CIP-1694 with governance lifecycle framing, threshold families, and bootstrap emphasis.
- [Source: cardano-multiplatform-lib-combined](pages/source-cardano-multiplatform-lib-combined.md) - Stitched CML (Cardano Multiplatform Lib) doc export: crates, WASM/JS packages, CBOR-fidelity rationale.

## Entities / Concepts
- [Blockfrost Icebreakers](pages/blockfrost-icebreakers.md) - Incentivized operator program for decentralized Blockfrost fleet participation.
- [Cardano governance model (CIP-1694)](pages/cardano-governance-cip1694.md) - Governance bodies, action lifecycle, ratification thresholds, and constitutional/guardrails model.
- [CIP-1694 explained (Intersect article)](pages/cip-1694-explained-intersect-article.md) - Plain-language recap of workshop history, governance bodies, actions, and bootstrap incentives from Intersect MBO.
- [Governance metadata framework (CIP-100)](pages/governance-metadata-framework-cip100.md) - Base JSON-LD governance metadata: anchors, hashing, `body`/`authors`, extension contexts, metadatum label 1694.
- [Governance action metadata standard (CIP-108)](pages/governance-action-metadata-cip108.md) - Standardized off-chain fields (`title`, `abstract`, `motivation`, `rationale`, `references`) for CIP-1694 governance actions.
- [DRep metadata standard (CIP-119)](pages/drep-metadata-cip119.md) - Proposed DRep profile anchor fields (`givenName`, narrative blocks, `Identity`/`Link` references, `doNotList`).
- [Cardano Multiplatform Lib (CML)](pages/cardano-multiplatform-lib-cml.md) - Multi-target Rust/JS/WASM Cardano library; crate split and NPM packages (summary of ingested doc snapshot).

## ctools application
- [DRep voting history: Blockfrost key and URL params](pages/ctools-drep-voting-history-blockfrost.md) - How ctools Blockfrost tools read/write `blockfrostApiKey` (and, on the Conch protocol page `/conch`, `assetId` / `txLimit`) in the query string; Redux + `project_id` headers.
