# Source: cip108

## Source metadata
- Location: `wiki/raw/cip108.md`
- CIP: 108
- Title: Governance Metadata - Governance Actions
- Status: Proposed
- Category: Metadata
- Created: 2023-11-23

## Summary
CIP-108 specifies an off-chain metadata vocabulary for Cardano governance actions. It extends CIP-100 so governance action authors can provide standardized context (`title`, `abstract`, `motivation`, `rationale`, and structured `references`) while keeping on-chain payloads minimal through metadata anchors and hashes.

## Key claims
- Governance action on-chain data is insufficient for voter context; richer off-chain metadata is needed for informed voting.
- Standardized metadata structure improves interoperability between authoring tools, indexers, and governance interfaces.
- Four core narrative fields (`title`, `abstract`, `motivation`, `rationale`) are treated as compulsory for CIP-108 compliance.
- `references` are extended to support a set of labeled URIs with optional content hashing for verification.
- Markdown styling is intentionally supported for longer narrative fields, while short/identifier-like fields remain plain text oriented.

## Notable design details
- `title` is short (80 chars) for scanability; `abstract` is limited (2500 chars) as an intermediate detail layer.
- A new `witness` type allows `witnessAlgorithm: CIP-0008`, aligning with existing message-signing patterns used in tooling.
- The CIP intentionally avoids in-place versioning; future vocabulary growth should happen via new CIPs and JSON-LD extension patterns.

## Path to active (as stated)
- Partial tooling support is already listed (submission/signing libraries and scripts).
- Broader indexing/rendering support is still tracked as incomplete in acceptance criteria.

## Related pages
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [Governance action metadata example](governance-action-metadata-example.md)
- [Source: cip100](source-cip100.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Source: cip1694](source-cip1694.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Wiki Home](wiki-home.md)
