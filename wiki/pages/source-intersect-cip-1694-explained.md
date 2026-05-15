# Source: Cardano CIP-1694 explained (Intersect)

## Source metadata
- Location: `wiki/raw/Cardano CIP-1694 explained.md`
- Original publication: https://www.intersectmbo.org/news/cardano-cip-1694-explained
- Article title: Cardano CIP-1694 explained
- Published (per front matter): 2024-11-27
- Clipped / added to raw (per front matter): 2026-05-05

## Summary
Intersect MBO article explaining CIP-1694 for a general audience: Voltaire naming, workshop-driven development, "one lovelace, one vote," the seven governance action types, constitutional committee role bounds, DRep vs predefined options (`Abstain`, `No confidence`), and bootstrap incentives tying reward withdrawal to DRep (or predefined) delegation.

## Key claims
- CIP-1694 is framed as transferring protocol control toward Ada holders via on-chain governance introduced across **Chang** and **Plomin** hard forks (article wording).
- Constitution starts as **off-chain text**; committee votes only on constitutionality for action classes **3–7** in the article’s numbering scheme (aligned with common action-type enumerations; always verify against the current ledger spec for exact indices).
- **No confidence** delegation counts as yes on no-confidence actions and no on others—described as an extreme option to replace the committee.
- Bootstrap: rewards accrue but **withdrawal may be gated** until stake is delegated to a DRep or predefined option; unblocked once suitably delegated.

## Relation to canonical spec
This is explanatory journalism, not the **Active** CIP text. For normative mechanics, thresholds, and parameter names, prefer [Source: cip1694](source-cip1694.md) and the ledger specification the CIP references.

## Related pages
- [CIP-1694 explained (Intersect article)](cip-1694-explained-intersect-article.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Source: cip1694](source-cip1694.md)
- [Wiki Home](wiki-home.md)
