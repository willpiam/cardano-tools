# Cardano governance model (CIP-1694)

## Overview
CIP-1694 defines a minimum viable on-chain governance framework for Cardano's Voltaire era. It adds governance actions and votes to normal transactions, with ratification and enactment handled by ledger rules on epoch boundaries.

## Governance bodies
- **Constitutional committee (CC):** Votes on constitutionality of actions; can be replaced through governance, including via no-confidence flow.
- **DReps:** Delegated representatives that receive stake-based voting power from Ada holders.
- **SPOs:** Stake pool operators participate in action types where operational/security consensus is required (notably hard forks and selected security-relevant parameter updates).

## Voting and delegation model
- Voting power for DReps and SPOs is stake-weighted ("one Lovelace = one vote").
- DRep delegation is separate from stake-pool delegation for block production.
- Two predefined voting options exist: `Abstain` and `No Confidence`.
- DReps can become inactive after a protocol-defined inactivity period (`drepActivity`) and later reactivate by voting/updating.

## Governance actions and flow
- Seven action types are defined: no-confidence motion, committee updates, constitution/guardrails updates, hard-fork initiation, protocol parameter updates, treasury withdrawals, and info actions.
- An action is submitted, voted on, and then either ratified+enacted or expired by deadline.
- Most action classes require ratification by at least two of the three governance bodies; hard-fork initiation and certain security-sensitive changes include SPO participation requirements.
- Enactment priority and ordering rules are explicit to avoid conflicts and unintended interactions.
- Governance actions include anti-collision linkage to prior enacted actions of the same type (action ID chaining), reducing accidental clashes between concurrent proposals.

## Constitution and guardrails
- The constitution is initially off-chain text, referenced on-chain by hash.
- An optional guardrails script can add enforceable constraints for protocol parameter changes and treasury withdrawals.

## Additional operational details (from 1694.io campaign module source)
- Committee continuity is parameterized (`committeeMinSize`, member terms, `committeeMaxTermLength`), and an undersized committee can become unable to ratify actions that require CC approval.
- Ratification thresholds are grouped as governance parameters (`P_1..P_6`, `Q_1..Q_5` families), with extra SPO voting for security-relevant parameter changes.
- During the bootstrap phase, governance action availability is intentionally restricted until later activation of full DRep-centered governance.

## Scope and boundaries from the CIP
- In scope: on-chain mechanism design for governance actions, voting, ratification, and enactment.
- Out of scope: constitution contents, constitutional committee membership process details, legal enforceability, and off-chain governance standards/processes.

## Off-chain metadata linkage
- CIP-1694 governance actions can carry metadata anchors, but it does not define a full narrative metadata vocabulary.
- **CIP-100** specifies the base JSON-LD governance metadata framework (anchors, hashing, optional signing/`body` patterns, extension via `@context`).
- **CIP-108** provides governance-action vocabulary (`title`, `abstract`, `motivation`, `rationale`, `references`) as an extension to CIP-100.
- **CIP-119** proposes DRep registration/update profile fields on top of the same CIP-100 foundation (with relaxed `authors` witness expectations for that use case).
- Together, 1694 + (100/108/119) separate on-chain decision mechanics from off-chain explanatory context and interoperability standards.

## Web wallet bridge (CIP-95)
- **CIP-95** extends **CIP-30** with a `cip: 95` extension for Conway-era governance in the browser: DRep/stake public keys, Conway-aware `.signTx()`, and DRep-capable `.signData()`.
- Wallets expose keys and signatures; **dApps** construct transactions and use indexers to interpret governance state (delegation, registration, live actions).
- Scope is **Ada holders and DReps**—not SPO or constitutional-committee credential flows through the web bridge.
- See [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md).

## Related pages
- [Source: cip1694](source-cip1694.md)
- [CIP-1694 explained (Intersect article)](cip-1694-explained-intersect-article.md)
- [Source: cip100](source-cip100.md)
- [Source: cip108](source-cip108.md)
- [Source: cip119](source-cip119.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Source: cip95](source-cip95.md)
- [Source: Voltaire DRep Campaign Module](source-voltaire-drep-campaign-module.md)
- [Wiki Home](wiki-home.md)
