# Source: cip119

## Source metadata
- Location: `wiki/raw/cip119.md`
- CIP: 119
- Title: Governance metadata - DReps
- Status: Proposed
- Category: Metadata
- Created: 2024-02-07

## Summary
CIP-119 proposes a **DRep-specific** off-chain metadata vocabulary extending [CIP-100](source-cip100.md). It targets metadata anchors on **DRep registration and update** transactions so delegators get structured context (name, objectives, links, optional image, payment address, identity links) while keeping bulk content off-chain.

## Key claims
- Without a DRep metadata standard, tooling fragments and delegators get uneven information quality.
- **`givenName`** is the only required field (max 80 chars, no markdown); other narrative fields are optional caps (~1000 chars).
- Extends **Schema.org `Person`** so additional `Person` properties may appear in `body`.
- **`references`** gains `@type` values **`Link`** (social/site URIs) and **`Identity`** (URIs where the DRep prominently displays their DRep ID for manual verification).
- **`paymentAddress`** is optional and distinct from Schema.org postal `address`.
- **`doNotList`:** boolean optional; `true` signals the DRep does not want **campaign/delegation aggregation** tooling to list them (explorers may still show the DRep).
- **Witnessing:** Unlike generic CIP-100 usage, DRep metadata recommends **blank `authors`** and **ignoring `authors`** for validation warnings; authenticity is tied to the registering/updating DRep ID.

## Notable design details
- **`image`:** If not base64-inlined via `imageObject.contentUrl` data URI, URL form requires **`sha256`** of image bytes at `contentUrl` for integrity.
- Team-operated DReps are not explicitly modeled; scope targets individual-presented metadata with room for future CIPs.
- Status is **Proposed**; acceptance criteria emphasize published schemas/test vectors and at least one adopting tool.

## Relationship to other CIPs
- Builds on **CIP-100** framing and **CIP-108**-style `body` extension pattern.
- Complements **CIP-1694** on-chain DRep certificates with interoperable off-chain profiles.

## Related pages
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Source: intersect CIP-1694 explained](source-intersect-cip-1694-explained.md)
- [Source: cip100](source-cip100.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Wiki Home](wiki-home.md)
