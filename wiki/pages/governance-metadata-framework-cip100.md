# Governance metadata framework (CIP-100)

## Overview
CIP-100 is the **Active** base standard for Cardano governance-related off-chain metadata. It does not define every narrative field for every governance artifact; instead it specifies JSON-LD shape, anchor hashing, signing of the `body`, and extension patterns so follow-on CIPs can add vocabulary (for example [CIP-108](governance-action-metadata-cip108.md) for governance actions and [CIP-119](drep-metadata-cip119.md) for DRep profiles).

## Anchors and content
- On-chain structures expose **anchors**: a URI plus a hash of the off-chain document.
- Compliant anchor payloads SHOULD be **JSON-LD** with optional `@context` and `@type`; missing `@context` may default to the CIP-100 shared context document referenced in the CIP.
- The anchor hash MUST be **blake2b-256** of the **raw bytes** of the fetched content (avoid parse-then-hash ambiguity).
- Hosting SHOULD prefer **content-addressable** storage (e.g. IPFS, Arweave) for immutability; self-hosted HTTP URIs warrant clear UX warnings.

## Document structure (minimum viable governance)
- **`hashAlgorithm`:** Algorithm used for anchor hashing (currently blake2b-256).
- **`authors`:** Endorsers with `witness` objects; tooling SHOULD validate known witness schemes and SHOULD warn when validation is skipped or fails.
- **`body`:** Primary signed content, including:
  - **`references`:** Links to other CIP-100 documents or augmentations (`GovernanceMetadata` vs `Other`).
  - **`comment`:** Freeform author commentary (tooling SHOULD flag author bias).
  - **`externalUpdates`:** Optional pointers to living resources (feeds, blogs); tooling MUST treat these as second-class vs anchored content.

Signing canonically processes the **`body`** subgraph per JSON-LD canonicalization so multiple authors can endorse stable semantic content.

## On-chain discoverability
The CIP reserves **metadatum label 1694** (per CIP-10 family) as a shared label for governance-related transaction metadata, complementing anchor URIs.

## Extensions and superseding profiles
- New vocabulary generally arrives as **additional `@context` documents** and/or **new CIPs** building on CIP-100.
- Tooling MUST tolerate unknown context: render known fields cleanly and fall back to raw JSON when needed.

## Intentional deltas in extension CIPs
Some later CIPs narrow or relax CIP-100 rules for specific metadata kinds. For example, **CIP-119** recommends leaving `authors` empty for DRep registration/update anchors and deriving authenticity from the on-chain DRep credential rather than CIP-100 author witnesses—this does not invalidate CIP-100 for other metadata types; readers should follow the applicable extension CIP when present.

## Related pages
- [Source: cip100](source-cip100.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Wiki Home](wiki-home.md)
