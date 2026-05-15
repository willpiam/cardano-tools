# Source: cip1694

## Source metadata
- Location: `wiki/raw/cip1694.md`
- CIP: 1694
- Title: A First Step Towards On-Chain Decentralized Governance
- Status: Active
- Category: Ledger
- Created: 2022-11-18

## Summary
CIP-1694 defines Cardano's first full on-chain governance framework for the Voltaire era. It introduces governance actions and votes in transaction bodies, three governance bodies (constitutional committee, DReps, SPOs), ratification thresholds, and enactment rules at epoch boundaries.

## Key claims
- The Shelley-era special governance paths (protocol parameter update path and MIR-based treasury/reserve movement path) are replaced by a broader governance action system.
- Any Ada holder can submit a governance action by posting a deposit (`govActionDeposit`), which is returned when the action is finalized.
- Governance decisions are stake-weighted for DReps and SPOs under a "one Lovelace = one vote" model.
- The constitutional committee is introduced as a constitutionality check, with an explicit no-confidence mechanism.
- Seven governance action types are specified: no-confidence motion, committee update, constitution/guardrails update, hard-fork initiation, protocol parameter changes, treasury withdrawals, and info actions.

## Notable implementation path
- The CIP documents a staged rollout via hard forks, including a bootstrap period before full DRep-governed operation.
- "Path to Active" notes bootstrapping via Chang #1 hard fork and full governance via Plomin hard fork.

## Related pages
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [CIP-1694 explained (Intersect article)](cip-1694-explained-intersect-article.md)
- [Source: intersect CIP-1694 explained](source-intersect-cip-1694-explained.md)
- [Source: cip100](source-cip100.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Source: cip108](source-cip108.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [Source: cip119](source-cip119.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Source: Voltaire DRep Campaign Module](source-voltaire-drep-campaign-module.md)
- [Wiki Home](wiki-home.md)
