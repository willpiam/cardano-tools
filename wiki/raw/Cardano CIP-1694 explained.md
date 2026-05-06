---
title: "Cardano CIP-1694 explained"
source: "https://www.intersectmbo.org/news/cardano-cip-1694-explained"
author:
published: 2024-11-27
created: 2026-05-05
description: "The foundation of decentralized governance, its history, and what it means"
tags:
  - "clippings"
---
From its inception in 2015 through its first block in 2017 to 2024 and the [Voltaire development phase](https://roadmap.cardano.org/en/voltaire/) (named after the [French libertarian philosopher](https://www.worldhistory.org/Voltaire/)), Cardano has aimed to be the most decentralized blockchain.

Cardano’s design and implementation evolve through changes proposed in [Cardano improvement proposals](https://cips.cardano.org/) (CIPs). Cardano [CIP-1694](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1694/README.md), named after the year of Voltaire’s birth, established the foundation for decentralized on-chain governance. CIP-1694 was implemented in two controlled hard forks, beginning the Voltaire development phase.

This governance model aims to empower the Cardano community of ada holders with greater control over decision-making processes related to protocol updates, treasury management, and technical improvements.

Development of CIP-1694  
The proposal was first crafted in a workshop held in Longmont, CO, from February 28 to March 1, 2023. It was then developed further in 20 in-person [community workshops](https://www.essentialcardano.io/article/cip-1694-community-workshops-the-line-up) held in cities worldwide from May to July 2023 and another 20 virtual workshops.  
  
Contents of the proposal  
The proposal, consisting of approximately 2,000 lines of detailed content, outlines the framework for governance within the Cardano ecosystem. To dive deeper into the specifics, the full text of the proposal can be accessed on GitHub at [CIP-1694](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1694/README.md). A key feature of the proposal is its voting mechanism, which operates on a "one lovelace, one vote" basis, ensuring that voting power corresponds directly to the amount of ADA participants hold.

Governance actions  
Governance actions existed on the Cardano blockchain before this CIP, but this proposal expands their definition and scope.

A governance action is an on-chain event triggered by a transaction. It has a deadline after which it cannot be enacted.

- An action is said to be ratified when it gathers enough votes in its favor
- An action that fails to be ratified before its deadline is said to have expired
- A ratified action is said to be enacted once activated on the network at the next epoch boundary.

Three entities can vote on governance actions: the constitutional committee, delegated representatives (DReps) (including direct voters), and stake pool operators.

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXc5BQ3x5b5chx0mlK3HiWrYb51cKv-pdH8w0ozrvlmefoXl4FHQO03HLclObYGSqxRql44khgVBllM7Ddc2pR9icERpQVsTzDvb3Vry34TtxKWxEv8OWEjK6u_JTdS6J2icRiyR9g?key=0dY0_qXo8rbovW12xhFNfF3H)

Table 1. The seven types of governance actions

Any ada holder can submit a governance action to the chain. They must provide a deposit, which is returned when the action is finalized (whether it is ratified or has expired).

Cardano constitution  
There must be a constitution. Its contents are out of the scope of the CIP. Initially, it is an off-chain text document.

There must be a constitutional committee. Its role is limited to voting on the constitutionality of governance actions, so it can only vote on actions 3 through 7. If it steps outside this role, it can be replaced via a motion of no confidence.

DReps  
To participate in governance, a stake credential must be delegated to a DRep. Ada holders will generally delegate their voting rights to a registered DRep who will vote on their behalf. Any ada holder may register as a DRep or direct voter.

In addition, two pre-defined voting options are available:

*Abstain*

If an ada holder delegates to abstain, their stake is actively marked as not participating in governance. It is a way to opt out of participating in decision-making within the governance system.

*No confidence*

If an ada holder delegates to no confidence, their stake is counted as a yes vote on every no-confidence action and a no vote on every other action. This option is extreme, and you would only do it if you wanted the current constitutional committee replaced.

Incentives for ada holders to delegate  
There is a short [bootstrapping phase](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1694/README.md#bootstrapping-phase) during which rewards are earned for stake delegation, etc, and may be withdrawn at any time. After this phase, although rewards will continue to be earned as before, reward accounts will be blocked from withdrawing any rewards unless their associated stake credential is also delegated to a DRep or pre-defined voting option. This helps to ensure high participation and, thus, legitimacy.

Even though rewards cannot be withdrawn, they are recovered. They can be withdrawn once a stake credential (including a pre-defined voting option) is delegated.

Incentives for DReps  
DReps arguably need to be compensated for their work. Research on incentive models is still ongoing.

Rationale  
The rationales for many of the decisions made in developing this improvement proposal are recorded [in the CIP](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1694/README.md#rationale) itself.

This improvement proposal is probably the most important in Cardano’s history. It transfers the blockchain's control from its founding entities to the people who care most, the community of ada holders.  
  
We'll explore these areas more fully as they are implemented through Chang and Plomin hard forks, so watch this space.