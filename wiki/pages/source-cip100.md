# Source: cip100

## Source metadata
- Location: `wiki/raw/cip100.md`
- CIP: 100
- Title: Governance Metadata
- Status: Active
- Category: Metadata
- Created: 2023-04-09

## Summary
CIP-100 defines the base off-chain governance metadata standard for Cardano (Voltaire-era and beyond). It standardizes JSON-LD documents for content linked via on-chain metadata anchors: hashing (blake2b-256 of raw bytes), optional `@context` / `@type` for extensibility, a `body` plus `authors` with witnessed endorsements, and conventions for hosting, augmentation via `references`, and on-chain discoverability (including reserved metadatum label 1694).

## Key claims
- The ledger does not validate governance metadata structure; a shared off-chain format improves tooling, interoperability, and consistent presentation.
- Anchor content SHOULD be JSON-LD; without `@context`, tooling may assume the CIP-100 common context document.
- Hash in the anchor MUST match raw retrieved bytes; canonical RDF procedures apply for signing the `body`.
- Extension happens via new JSON-LD contexts/CIPs rather than monolithic version numbers.
- Follow-on CIPs (e.g. CIP-108 governance actions, CIP-119 DReps) extend vocabulary while reusing this framework.

## Notable design details
- `authors` entries SHOULD include validated `witness` objects when following the base spec; tooling SHOULD surface when integrity/authorship is not verified.
- `body` holds `references`, `comment`, `externalUpdates`, and is the signed semantic core.
- Best practices emphasize hash verification UX, graceful degradation for unknown fields, and content-addressable hosting (IPFS/Arweave) where possible.

## Path to Active (as stated)
- Marked Active in source front matter; acceptance checklist in the CIP still lists one library criterion as incomplete while naming implementors and consumers.

## Related pages
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Source: cip119](source-cip119.md)
- [Source: cip108](source-cip108.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Wiki Home](wiki-home.md)
