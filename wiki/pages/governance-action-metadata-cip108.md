# Governance action metadata standard (CIP-108)

## Overview
CIP-108 defines a common off-chain metadata structure for governance actions in Cardano's CIP-1694 governance system. It builds on the **Active** [CIP-100 governance metadata framework](governance-metadata-framework-cip100.md) so governance actions can be accompanied by consistent, reviewable context without storing long-form content directly on-chain.

## Core metadata fields
- **`title`:** Short identifier-style description (up to 80 characters) for quick scanning in tooling.
- **`abstract`:** Compact summary (up to 2500 characters) that expands on what and why.
- **`motivation`:** Problem framing, affected stakeholders, and need for action.
- **`rationale`:** Explanation of why the proposed action solves the stated problem, including trade-offs and alternatives.
- **`references`:** Structured links to supporting artifacts, with optional hashes for content integrity checks.

## Interoperability goals
- Gives metadata authors and renderers a shared vocabulary for governance actions.
- Supports richer voter UX by enabling layered detail views (short to long form).
- Improves portability of governance metadata across submitters, wallets, and indexers.

## Integrity and signing
- Reuses metadata-anchor patterns (URI + hash) so off-chain content can be verified against on-chain commitments.
- Extends witness handling with `witnessAlgorithm: CIP-0008` to align with established signing flows.

## Relationship to governance flow
- CIP-1694 defines on-chain governance actions, voting, and ratification mechanics.
- [CIP-100](governance-metadata-framework-cip100.md) defines the shared JSON-LD anchor/metadata container those explanations live in.
- CIP-108 complements that flow by standardizing the explanatory metadata linked to governance **action** anchors on top of CIP-100.

## Open status notes
- The source is marked **Proposed**, not Active.
- The CIP's own acceptance checklist reports incomplete support across indexers/renderers.

## Related pages
- [Source: cip108](source-cip108.md)
- [Source: cip100](source-cip100.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Source: cip1694](source-cip1694.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Wiki Home](wiki-home.md)
