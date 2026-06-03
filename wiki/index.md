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
- [Source: CML release 6.2.0 treasury donation](pages/source-cml-release-6-2-0-treasury-donation.md) - GitHub release notes: `set_donation`, `set_current_treasury_value` in the tx builder (2025-04-06).
- [Source: cip95](pages/source-cip95.md) - CIP-95: CIP-30 extension for Conway-era governance (DRep/stake keys, extended signTx/signData) for Ada holders and DReps.
- [Source: cip129](pages/source-cip129.md) - CIP-129: Bech32 and byte encodings for DRep, CC hot/cold, and governance action identifiers (Conway era).
- [Source: cip21](pages/source-cip21.md) - CIP-21: Canonical CBOR and structural rules for transactions signed by hardware wallets.

## Entities / Concepts
- [Blockfrost Icebreakers](pages/blockfrost-icebreakers.md) - Incentivized operator program for decentralized Blockfrost fleet participation.
- [Cardano governance model (CIP-1694)](pages/cardano-governance-cip1694.md) - Governance bodies, action lifecycle, ratification thresholds, and constitutional/guardrails model.
- [CIP-1694 explained (Intersect article)](pages/cip-1694-explained-intersect-article.md) - Plain-language recap of workshop history, governance bodies, actions, and bootstrap incentives from Intersect MBO.
- [Governance metadata framework (CIP-100)](pages/governance-metadata-framework-cip100.md) - Base JSON-LD governance metadata: anchors, hashing, `body`/`authors`, extension contexts, metadatum label 1694.
- [Governance action metadata standard (CIP-108)](pages/governance-action-metadata-cip108.md) - Standardized off-chain fields (`title`, `abstract`, `motivation`, `rationale`, `references`) for CIP-1694 governance actions.
- [DRep metadata standard (CIP-119)](pages/drep-metadata-cip119.md) - Proposed DRep profile anchor fields (`givenName`, narrative blocks, `Identity`/`Link` references, `doNotList`).
- [Cardano Multiplatform Lib (CML)](pages/cardano-multiplatform-lib-cml.md) - Multi-target Rust/JS/WASM Cardano library; crate split and NPM packages; treasury donation builder helpers from CML 6.2.0.
- [CIP-95 wallet bridge (Conway governance)](pages/cip95-wallet-bridge.md) - Browser wallet extension for Conway certs, DRep signing, and governance dApp flows atop CIP-30.
- [Governance identifiers (CIP-129)](pages/governance-identifiers-cip129.md) - `drep1`, `cc_hot1`, `cc_cold1`, `gov_action1` formats; header byte preserves type in raw-byte storage.
- [Hardware wallet transaction interoperability (CIP-21)](pages/hardware-wallet-transaction-interop-cip21.md) - HW signing constraints: canonical CBOR, one vote per tx, cert combinations, device Conway gaps; bulk multi-vote txs fail on Ledger via Eternl.

## ctools application
- [DRep voting history: Blockfrost key and URL params](pages/ctools-drep-voting-history-blockfrost.md) - Blockfrost key URL/Redux flow; vote summary + CIP-100 anchor charts (CBOR enrichment via `voteTxAnchors.ts`).
- [Live Governance Actions](pages/ctools-governance-actions-live.md) - Blockfrost-backed browser for live mainnet proposals: type filters, treasury sort, two-step metadata (anchor + CIP-108 fetch), Cardanoscan links.
