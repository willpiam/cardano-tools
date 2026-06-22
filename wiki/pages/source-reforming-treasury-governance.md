# Source: Reforming Treasury Governance

## Source metadata
- Location: `wiki/raw/Reforming-Treasury-Governance.json`
- Format: JSON-LD governance metadata (CIP-100 container, CIP-108 `body` vocabulary)
- Title: Reforming Treasury Governance
- Author (in rationale): AtlasHub DRep (`drep1y2dnsj0taktxwmzwf4a7sp0mg3rvm3jsetag0h0m83khs3c7d3l6x`)
- Role in wiki: **concrete example** of how a live governance action metadata document is structured

## Summary
Off-chain metadata for a Cardano **info action** proposing treasury governance reform. The document follows the CIP-100 anchor shape (`hashAlgorithm`, `authors`, `body`) with a nested `@context` wiring CIP-100 and CIP-108 terms. The `body` supplies standard CIP-108 narrative fields plus one `Other` reference to the author's DRep profile.

## Key structural claims
- Top-level `@context` maps `body`, `authors`, and `hashAlgorithm` to CIP-100/CIP-108 IRIs; `body` carries its own nested context for `title`, `abstract`, `motivation`, `rationale`, and `references`.
- `hashAlgorithm` is `blake2b-256` at the document root (CIP-100 anchor hashing).
- `authors` is an **empty array** — no CIP-100 author witnesses in this instance; authenticity relies on the on-chain anchor commitment rather than off-chain signatures.
- `body.rationale` embeds **HTML** (`<h2>`, `<b>`) for section headings and emphasis, which CIP-108 allows for longer narrative fields.
- `body.references` contains a single `@type: Other` entry (AtlasHub DRep on cexplorer.io) without `referenceHash`.

## Substantive content (brief)
The action argues treasury governance is dysfunctional (funding impasse, project-vs-project voting toxicity) and sketches reform ideas: dedicated budgets with thematic structure, votes on balanced budgets rather than isolated withdrawals, a strategic entity and expert commission, and a three-phase voting sequence (NCL → budget → treasury withdrawal).

## Related pages
- [Governance action metadata example](governance-action-metadata-example.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [ctools: Live Governance Actions](ctools-governance-actions-live.md)
- [Wiki Home](wiki-home.md)
