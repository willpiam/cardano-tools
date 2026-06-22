# Governance action metadata example

This page documents a **real-world CIP-100 / CIP-108 governance action metadata document** from [Source: Reforming Treasury Governance](source-reforming-treasury-governance.md). Use it as a reference for how off-chain JSON linked from on-chain governance anchors is typically shaped.

## Document envelope (CIP-100)

A compliant governance-action anchor payload is JSON-LD with these top-level fields:

| Field | In example | Purpose |
|-------|------------|---------|
| `@context` | Nested CIP-100 + CIP-108 IRIs | JSON-LD vocabulary for parsers and canonicalization |
| `hashAlgorithm` | `blake2b-256` | Algorithm for the on-chain anchor hash |
| `authors` | `[]` (empty) | Optional endorsers with witnesses; may be empty in practice |
| `body` | CIP-108 narrative block | Signed semantic content per CIP-100 |

The `@context` block maps shorthand terms to GitHub CIP anchor URLs (`CIP100:…`, `CIP108:…`) and nests a `body.@context` for action-specific fields (`title`, `abstract`, `motivation`, `rationale`, `references`).

## Body fields (CIP-108)

ctools `parseCip108Metadata` reads `body` (or falls back to root) and extracts:

| Field | Example value | Notes |
|-------|---------------|-------|
| `title` | `"Reforming Treasury Governance"` | Short scan label (≤80 chars per CIP-108) |
| `abstract` | ~1 paragraph | Problem summary and call to collaborate |
| `motivation` | ~1 paragraph | Funding impasse, toxicity, lack of guardrails |
| `rationale` | Long HTML narrative | Sections: Basic Propositions [a]–[i], process, budget structure |
| `references` | One `Other` link | AtlasHub DRep on cexplorer.io |

### HTML in `rationale`

The example uses inline HTML rather than Markdown:

```html
<h2>Basic Propositions</h2>
[a] <b>Treasury governance is pivotal</b> for the Cardano ecosystem...
```

CIP-108 permits styling in longer fields; renderers should treat `rationale` as rich text. ctools displays it as plain text in the collapsible details panel (HTML tags visible unless a renderer sanitizes/converts).

### References shape

```json
{
  "@type": "Other",
  "label": "AtlasHub",
  "uri": "https://cexplorer.io/drep/drep1y2dnsj0taktxwmzwf4a7sp0mg3rvm3jsetag0h0m83khs3c7d3l6x"
}
```

- `@type` distinguishes `GovernanceMetadata` vs `Other` per CIP-100.
- No `referenceHash` in this instance (optional per CIP-108).
- Parsers should accept both a plain array and JSON-LD `@set` container for `references`.

## Empty `authors`

This document sets `"authors": []`. [CIP-100](governance-metadata-framework-cip100.md) defines author witnesses for endorsement, but submitters sometimes omit them; tooling should still render `body` content when witnesses are absent. Contrast with [CIP-119](drep-metadata-cip119.md), which explicitly recommends empty authors for DRep profile anchors.

## On-chain pairing

In production, this JSON is hosted off-chain (IPFS, HTTP, etc.) and committed on-chain via a **metadata anchor**: URI + blake2b-256 hash of the raw bytes. Blockfrost exposes the anchor under `governance_description`; [ctools Live Governance Actions](ctools-governance-actions-live.md) discovers the URI, fetches JSON, and runs `parseCip108Metadata`.

For this action type the on-chain `governance_type` would be **`info_action`** — informational, not a treasury withdrawal or parameter change.

## Minimal structural skeleton

Illustrative shape (field names only; see raw source for full `@context`):

```json
{
  "@context": { "...": "CIP-100/CIP-108 nested contexts" },
  "hashAlgorithm": "blake2b-256",
  "authors": [],
  "body": {
    "title": "...",
    "abstract": "...",
    "motivation": "...",
    "rationale": "... HTML or Markdown ...",
    "references": [
      { "@type": "Other", "label": "...", "uri": "https://..." }
    ]
  }
}
```

## What this example proposes (substance)

AtlasHub's info action diagnoses treasury governance gridlock and proposes:

1. **Governance principles** — explicit treasury strategy, NCL not treated as the whole budget, thematic budget domains, no pitting individual withdrawals against each other.
2. **Institutions** — a voted strategic entity (budget preparation) and expert commission (project evaluation).
3. **Voting sequence** — NCL vote → budget vote (amount, structure, domain percentages) → final treasury withdrawal vote listing funded projects.
4. **Eight budget domains** — core protocol, dev tooling, research, commercial growth, administration, community/education, other public goods, functional reserve.

Implementation would require further process and constitutional amendments beyond this info action.

## Related pages
- [Source: Reforming Treasury Governance](source-reforming-treasury-governance.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Treasury withdrawal governance amounts](treasury-withdrawal-governance-amounts.md)
- [ctools: Live Governance Actions](ctools-governance-actions-live.md)
- [Wiki Home](wiki-home.md)
