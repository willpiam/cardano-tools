# DRep metadata standard (CIP-119)

## Overview
[CIP-119](source-cip119.md) (**Proposed**) standardizes off-chain **JSON-LD** metadata for **DRep registration and update** anchors in the CIP-1694 governance model. It extends the shared [CIP-100](governance-metadata-framework-cip100.md) container so wallets, directories, and explorers can render consistent DRep profiles.

## Required vs optional fields
- **Required:** `givenName` (≤80 characters, plain text—no markdown).
- **Optional narrative blocks:** `objectives`, `motivations`, `qualifications` (each ≤1000 characters).
- **Optional:** `paymentAddress` (Bech32, same network as registration)—for transparent tips/donations; not the Schema.org mailing `address`.
- **Optional:** `image` as Schema.org `ImageObject`—either base64 `contentUrl` data URI or remote URL **with** `sha256` of the image file bytes.
- **Optional:** `doNotList` (default false)—DRep opts out of **campaign/directory** style listing; indexing/explorer behavior may still show chain facts.

## References: links and identity
- **`Link`:** Labeled URIs (social/site); labels SHOULD describe the destination (e.g. "X", "Personal Website").
- **`Identity`:** URIs where the DRep publishes their **DRep ID** prominently so readers can correlate metadata with real profiles (social proof by content, not PKI in the MVP). An [ADA Handle](cardano-ada-handles.md) or DRep subhandle (`*@drep`) can serve as a human-readable identity link; Handle API returns both legacy and [CIP-129](governance-identifiers-cip129.md) `drep1` IDs.

## Authors and signing (difference from base CIP-100)
CIP-119 recommends **`authors` be empty** and tooling **not** treat missing author witnesses as an error for DRep metadata. Rationale: the registering/updating **DRep credential** supplies on-chain linkage; mandatory CIP-100 author witnesses were seen as the wrong fit for user-generated profile content.

When reading mixed documents, apply the most specific applicable CIP (119 for DRep profile payloads).

## UX and safety notes
- Treat all fields as **user-generated content**; verification is social/process-level except where cryptographic checks (anchor hash, image `sha256`) apply.
- Copycat `givenName` values are possible; tooling should encourage holistic profile review before delegation.

## Wallet integration (CIP-95)
Off-chain CIP-119 metadata is attached at **DRep registration/update** on-chain. Browser tools typically obtain the registering DRep's public key via [CIP-95](cip95-wallet-bridge.md) (`getPubDRepKey`, extended `signTx` for `reg_drep_cert`) rather than through metadata signing alone.

## Related pages
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md) — `drep1` Bech32 for the on-chain DRep credential (separate from this metadata document)
- [Cardano ADA Handles](cardano-ada-handles.md) — optional `$handle` / `*@drep` identity and resolution via Handle.me API
- [Source: cip119](source-cip119.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [CIP-1694 explained (Intersect article)](cip-1694-explained-intersect-article.md)
- [Wiki Home](wiki-home.md)
