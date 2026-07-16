# Wiki Home

This wiki is maintained incrementally by an LLM.

## Current focus
- Blockfrost Platform deployment model and operator onboarding concepts.
- Source ingested: [Source: blockfrost-platform-main](source-blockfrost-platform-main.md).
- Cardano on-chain governance baseline from CIP-1694 (Voltaire era).
- Source ingested: [Source: cip1694](source-cip1694.md).
- Companion source ingested: [Source: Voltaire DRep Campaign Module](source-voltaire-drep-campaign-module.md).
- Non-technical explainer ingested: [Source: intersect CIP-1694 explained](source-intersect-cip-1694-explained.md).
- Governance off-chain metadata stack: Active [Source: cip100](source-cip100.md); proposed extensions [Source: cip108](source-cip108.md) and [Source: cip119](source-cip119.md).
- Serialization/transaction library snapshot: [Source: cardano-multiplatform-lib-combined](source-cardano-multiplatform-lib-combined.md); treasury donation builder APIs: [Source: CML release 6.2.0](source-cml-release-6-2-0-treasury-donation.md).
- Conway wallet web bridge: [Source: cip95](source-cip95.md) (CIP-95 extends CIP-30 for DRep/Ada-holder governance in the browser).
- Governance identifiers: [Source: cip129](source-cip129.md) (`drep1`, `cc_hot1`, `cc_cold1`, `gov_action1` encodings).
- Hardware wallet tx interop: [Source: cip21](source-cip21.md) (canonical CBOR and Conway signing limits for Ledger/Trezor).
- ADA Handles naming/resolution: [Source: Handle Documentation](source-handle-documentation.md) (Handle.me standard, `api.handle.me`, DRep subhandles).

## Open questions
- What are the concrete reward mechanics and payout cadence for Icebreakers?
- What are the operator acceptance and quality criteria for Icebreakers participation?

## Key pages
- [Blockfrost Icebreakers](blockfrost-icebreakers.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [CIP-1694 explained (Intersect article)](cip-1694-explained-intersect-article.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [Governance action metadata example](governance-action-metadata-example.md) (Reforming Treasury Governance JSON-LD)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md)
- [Hardware wallet transaction interoperability (CIP-21)](hardware-wallet-transaction-interop-cip21.md)
- [Cardano ADA Handles](cardano-ada-handles.md) (Handle.me resolution, API, dApp best practices)
- [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md)
- [Emurgo library inventory](ctools-emurgo-libraries.md) (ctools: `@emurgo/cip14-js` direct; message-signing transitive; CSL in raw Blockfrost Platform only)
- [DRep voting history: Blockfrost key and URL](ctools-drep-voting-history-blockfrost.md) (ctools app; includes Conch `/conch` query params)
- [Live Governance Actions](ctools-governance-actions-live.md) (ctools app; `/governance-actions`)
