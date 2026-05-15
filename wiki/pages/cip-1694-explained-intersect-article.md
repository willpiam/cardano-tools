# CIP-1694 explained (Intersect article)

## Overview
High-level, non-normative summary of Cardano on-chain governance as described in the Intersect MBO article **"Cardano CIP-1694 explained"** (Nov 2024). Use this page for **narrative context**; use [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md) and [Source: cip1694](source-cip1694.md) for specification-aligned details.

## Historical and process framing
- Cardano governance evolves through **CIPs**; **CIP-1694** (Voltaire-era naming) was developed through **in-person and virtual community workshops** in 2023 after an initial Colorado workshop.
- Implementation is described as proceeding via **Chang** and **Plomin** hard forks (article wording—verify current deployment names/dates against release notes when precision matters).

## Model in brief
- **Voting weight:** Stake-weighted for DReps and SPOs—popular summary **"one lovelace, one vote"** for those bodies.
- **Governance actions:** On-chain events with deadlines; flow described as **ratified** (enough supporting votes) then **enacted** at an epoch boundary, or **expired** if the deadline passes without ratification.
- **Seven action types** (tabular overview in the article): mirrors the taxonomy used throughout CIP-1694 materials (exact ratification mixes remain ledger-parameterized).

## Institutions and roles
- **Constitutional committee:** Exists to assess **constitutionality** for the action classes the article groups as types 3–7; stepping outside that role invites replacement via **no confidence** flows (per the article’s simplification).
- **Constitution:** Must exist; initial content is **off-chain prose** referenced on-chain by hash in the full governance design.

## DReps and delegation options
- Ada holders typically **delegate voting stake** to registered DReps; registration as DRep or **direct voter** is open.
- **`Abstain`:** Marks stake as **not participating** while still being a deliberate delegation choice.
- **`No confidence`:** Counts toward ousting the current constitutional committee posture; framed as a strong option.

## Bootstrap incentives (article summary)
During an early **bootstrap phase**, rewards still accrue from staking, but **reward withdrawals may be blocked** until the related stake credential delegates to a **DRep** or a **predefined voting option**. Once delegated appropriately, **past rewards become withdrawable**—an incentive for governance participation.

## Related pages
- [Source: intersect CIP-1694 explained](source-intersect-cip-1694-explained.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Wiki Home](wiki-home.md)
