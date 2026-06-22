# Wiki Log

## [2026-04-23] init | wiki scaffold
Created wiki scaffold with raw sources nested under wiki/.
## [2026-04-23] lint | health check
- status: pass
- timestamp: 2026-04-23T20:02:57.152Z

## [2026-04-23] ingest | blockfrost-platform-main README/docs
- Source(s) processed:
  - `wiki/raw/blockfrost-platform-main/README.md`
  - `wiki/raw/blockfrost-platform-main/docs/src/content/index.mdx`
  - `wiki/raw/blockfrost-platform-main/docs/src/content/get-started.mdx`
- Pages created/updated:
  - created `wiki/pages/source-blockfrost-platform-main.md`
  - created `wiki/pages/blockfrost-icebreakers.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
- Contradictions or open questions:
  - no direct contradictions observed in reviewed files
  - open question: reward mechanics and acceptance criteria for Icebreakers are not specified in reviewed sources

## [2026-05-03] query | DRepVotingHistory Blockfrost key and URI parameters
- Question asked: Whether the wiki explained how `src/pages/DRepVotingHistory.tsx` takes a Blockfrost API key from the user and saves it as URI parameters; fill gap if not.
- Pages consulted: `wiki/index.md`, `wiki/pages/wiki-home.md`, `wiki/pages/blockfrost-icebreakers.md` (no prior app-level coverage).
- New page created: `wiki/pages/ctools-drep-voting-history-blockfrost.md`; updated `wiki/index.md`.

## [2026-05-03] ingest | Asset CIP-20 tool wiki
- Extended `wiki/pages/ctools-drep-voting-history-blockfrost.md` with `assetId` / `txLimit` URL behavior and `AssetCip20Messages.tsx` / `cip20AssetHistory.ts` references.
- Updated `wiki/index.md` summary line and `wiki/pages/wiki-home.md` key pages link.

## [2026-05-03] ingest | Asset CIP-14 fingerprint + Cardanoscan links
- Added `@emurgo/cip14-js` and `src/utils/cip14AssetFingerprint.ts`; `AssetCip20Messages` shows CIP-14 fingerprint link to Cardanoscan; `cip20AssetHistory` tx URLs use Cardanoscan.
- Updated `wiki/pages/ctools-drep-voting-history-blockfrost.md` and `wiki/log.md`.

## [2026-05-03] ingest | Conch protocol naming and `/conch` route
- Renamed user-facing copy to Conch protocol; primary route `/conch` with redirects from `/cip20-asset` and `/asset-cip20-messages`; Commit tool linked from Conch page; wiki/index/wiki-home/ctools-drep page updated.

## [2026-05-05] ingest | cip1694.md
- Source(s) processed:
  - `wiki/raw/cip1694.md`
- Pages created/updated:
  - created `wiki/pages/source-cip1694.md`
  - created `wiki/pages/cardano-governance-cip1694.md`
  - updated `wiki/index.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/log.md`
- Contradictions or open questions:
  - no direct contradictions observed against existing wiki pages
  - open question: final operational threshold values and governance parameter initializations are intentionally left to community/governance process

## [2026-05-05] ingest | Voltaire DRep Campaign Module
- Source(s) processed:
  - `wiki/raw/Voltaire DRep Campaign Module.md`
- Pages created/updated:
  - created `wiki/pages/source-voltaire-drep-campaign-module.md`
  - updated `wiki/pages/cardano-governance-cip1694.md`
  - updated `wiki/pages/source-cip1694.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
- Contradictions or open questions:
  - no direct contradictions observed against `wiki/pages/source-cip1694.md`; content is largely a presentation-layer restatement
  - open question: should governance workshop attendee rosters and acknowledgements be tracked as first-class entities/pages, or kept source-local only

## [2026-05-05] ingest | cip108.md
- Source(s) processed:
  - `wiki/raw/cip108.md`
- Pages created/updated:
  - created `wiki/pages/source-cip108.md`
  - created `wiki/pages/governance-action-metadata-cip108.md`
  - updated `wiki/pages/cardano-governance-cip1694.md`
  - updated `wiki/pages/source-cip1694.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
- Contradictions or open questions:
  - no direct contradictions observed with existing CIP-1694 pages; scope appears complementary (on-chain governance mechanics vs off-chain metadata vocabulary)
  - open question: if CIP-108 advances to Active with field/schema changes, which pages should carry version/status drift tracking

## [2026-05-15] ingest | cip100.md, cip119.md, cardano-multiplatform-lib-combined.md, Cardano CIP-1694 explained.md
- Source(s) processed:
  - `wiki/raw/cip100.md`
  - `wiki/raw/cip119.md`
  - `wiki/raw/cardano-multiplatform-lib-combined.md`
  - `wiki/raw/Cardano CIP-1694 explained.md`
- Pages created/updated:
  - created `wiki/pages/source-cip100.md`
  - created `wiki/pages/governance-metadata-framework-cip100.md`
  - created `wiki/pages/source-cip119.md`
  - created `wiki/pages/drep-metadata-cip119.md`
  - created `wiki/pages/source-cardano-multiplatform-lib-combined.md`
  - created `wiki/pages/cardano-multiplatform-lib-cml.md`
  - created `wiki/pages/source-intersect-cip-1694-explained.md`
  - created `wiki/pages/cip-1694-explained-intersect-article.md`
  - updated `wiki/pages/cardano-governance-cip1694.md`
  - updated `wiki/pages/governance-action-metadata-cip108.md`
  - updated `wiki/pages/source-cip108.md`
  - updated `wiki/pages/source-cip1694.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
  - updated `wiki/log.md`
- Contradictions or open questions:
  - CIP-119 deliberately relaxes CIP-100 `authors`/witness expectations for DRep profile metadata; documented as an extension delta, not a contradiction
  - Intersect article uses simplified action-type numbering and fork naming—aligned narratively with CIP-1694 but not a substitute for the Active spec
  - CML combined raw doc still contains `todo` placeholders in install/run snippets; operational commands should be taken from upstream when implementing

## [2026-05-16] ingest | src/pages/GovernanceActions.tsx
- Source(s) processed:
  - `src/pages/GovernanceActions.tsx`
  - `src/functions/governanceActionsFetch.ts` (data layer referenced by the page)
- Pages created/updated:
  - created `wiki/pages/ctools-governance-actions-live.md`
  - updated `wiki/pages/ctools-drep-voting-history-blockfrost.md`
  - updated `wiki/pages/governance-action-metadata-cip108.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
- Contradictions or open questions:
  - none observed; app behavior is consistent with CIP-108 field names documented in wiki
  - open question: mainnet-only Blockfrost base URL is hardcoded; no preview/testnet switch in this tool

## [2026-05-15] ingest | Release 6.2.0_ Treasury donation support.md
- Source(s) processed:
  - `wiki/raw/Release 6.2.0_ Treasury donation support.md`
- Pages created/updated:
  - created `wiki/pages/source-cml-release-6-2-0-treasury-donation.md`
  - updated `wiki/pages/cardano-multiplatform-lib-cml.md`
  - updated `wiki/pages/source-cardano-multiplatform-lib-combined.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
  - updated `wiki/log.md`
- Contradictions or open questions:
  - none against existing CML pages; release notes are additive to the combined doc snapshot
  - exact Rust/TS symbol paths and Conway ledger field names are not in this clipping; implementers should confirm in upstream API docs or source for 6.2.0

## [2026-05-16] ingest | Web-Wallet Bridge - Conway ledger era
- Source(s) processed:
  - `wiki/raw/Web-Wallet Bridge - Conway ledger era.md` (CIP-95)
- Pages created/updated:
  - created `wiki/pages/source-cip95.md`
  - created `wiki/pages/cip95-wallet-bridge.md`
  - updated `wiki/pages/cardano-governance-cip1694.md`
  - updated `wiki/pages/drep-metadata-cip119.md`
  - updated `wiki/pages/source-cip1694.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
- Contradictions or open questions:
  - none against existing CIP-1694 / CIP-119 pages; CIP-95 is the wallet-layer complement to on-chain + metadata standards
  - spec lists `getRegisteredPubStakeKeys()` at `api` root while sibling methods use `api.cip95`—documented as in source; implementers should confirm wallet behavior
  - ctools `ConnectWallet` calls `enable()` without `{ extensions: [{ cip: 95 }] }`; may limit CIP-95 on strict wallets (noted on concept page)

## [2026-05-18] ingest | Governance Identifiers.md, Transaction requirements for interoperability with hardware wallets.md
- Source(s) processed:
  - `wiki/raw/Governance Identifiers.md` (CIP-129)
  - `wiki/raw/Transaction requirements for interoperability with hardware wallets.md` (CIP-21)
- Pages created/updated:
  - created `wiki/pages/source-cip129.md`
  - created `wiki/pages/governance-identifiers-cip129.md`
  - created `wiki/pages/source-cip21.md`
  - created `wiki/pages/hardware-wallet-transaction-interop-cip21.md`
  - updated `wiki/pages/cardano-governance-cip1694.md`
  - updated `wiki/pages/cip95-wallet-bridge.md`
  - updated `wiki/pages/cardano-multiplatform-lib-cml.md`
  - updated `wiki/pages/ctools-governance-actions-live.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
  - updated `wiki/log.md`
- Contradictions or open questions:
  - none against existing CIP-1694 / CIP-95 pages; CIP-129 is the identifier layer, CIP-21 is the HW serialization/signing layer
  - CIP-21 Trezor/ledger device tables are point-in-time; firmware may add Conway features—verify before HW governance flows
  - CIP-129 coexists with legacy CIP-105 Bech32 prefixes during ecosystem transition

## [2026-05-18] ingest | Transaction requirements for interoperability with hardware wallets.md
- Source(s) processed:
  - `wiki/raw/Transaction requirements for interoperability with hardware wallets.md` (CIP-21)
- Pages created/updated:
  - updated `wiki/pages/source-cip21.md` (published date, auxiliary data, withdrawals, credentials, voting-procedure cap)
  - updated `wiki/pages/hardware-wallet-transaction-interop-cip21.md` (voting-procedure section, auxiliary data, credentials/signing modes, device tables, ctools bulk-vote / Eternl+Ledger note)
  - updated `wiki/pages/cip95-wallet-bridge.md` (one-vote-per-tx HW constraint for bulk vote)
  - updated `wiki/index.md` (hardware-wallet summary line)
  - updated `wiki/log.md`
- Contradictions or open questions:
  - none; deepens prior CIP-21 ingest from same day
  - ctools bulk-vote multi-vote txs may work on software-only CIP-95 wallets but conflict with CIP-21 HW rule—documented, not a spec contradiction

## [2026-05-21] ingest | DRep bulk vote optional CIP-20 message
- Updated `wiki/pages/cip95-wallet-bridge.md` with a ctools note that `DRepBulkVote` supports optional label-674 CIP-20 metadata via `src/functions/cip20Metadata.ts`, distinct from the optional shared CIP-100 vote anchor.

## [2026-06-03] query | DRep vote metadata charts
- Question asked: Implement vote rationale charts and on-chain CIP-100 anchor detection on DRep Voting History.
- Pages consulted: `wiki/pages/governance-metadata-framework-cip100.md`, `wiki/pages/ctools-drep-voting-history-blockfrost.md`, `wiki/pages/cip95-wallet-bridge.md`.
- Updated `wiki/pages/ctools-drep-voting-history-blockfrost.md` with anchor enrichment via `/txs/{hash}/cbor` and chart behavior.

## [2026-06-04] ingest | DRep voting history closed-action cache
- Updated `wiki/pages/ctools-drep-voting-history-blockfrost.md` with IndexedDB cache for finalized governance actions and phased **Reload closed actions** recache modal.

## [2026-06-05] ingest | Conch transaction metadata cache
- Added `src/utils/conchHistoryCache.ts` (IndexedDB `ctools-conch-history`) and cache-first metadata loading in `cip20AssetHistory.ts`; Conch settings modal to clear cached transaction lookups; updated `wiki/pages/ctools-drep-voting-history-blockfrost.md`.

## [2026-06-19] ingest | DRep voting history treasury withdrawal display
- Updated `wiki/pages/ctools-drep-voting-history-blockfrost.md` with treasury withdrawal fetch, cache, badge, and detail display.

## [2026-06-22] ingest | Reforming-Treasury-Governance.json
- Source(s) processed:
  - `wiki/raw/Reforming-Treasury-Governance.json`
- Pages created/updated:
  - created `wiki/pages/source-reforming-treasury-governance.md`
  - created `wiki/pages/governance-action-metadata-example.md`
  - updated `wiki/pages/governance-action-metadata-cip108.md`
  - updated `wiki/pages/governance-metadata-framework-cip100.md`
  - updated `wiki/pages/ctools-governance-actions-live.md`
  - updated `wiki/pages/wiki-home.md`
  - updated `wiki/index.md`
- Contradictions or open questions:
  - empty `authors` array is common in the wild but CIP-100 defines witness endorsement; documented as observed practice, not spec contradiction
  - substantive treasury reform ideas are informational (`info_action`); not yet reflected as operational governance process in wiki

## [2026-06-19] query | Treasury withdrawal governance amounts
- Question asked: How does a withdrawal governance action indicate to the ledger how much it withdraws from the treasury, and how can we query this value?
- Pages consulted: `wiki/pages/cardano-governance-cip1694.md`, `wiki/pages/source-cip1694.md`, `wiki/pages/cip95-wallet-bridge.md`, `wiki/pages/ctools-governance-actions-live.md`, `wiki/pages/cardano-multiplatform-lib-cml.md`.
- New page created: `wiki/pages/treasury-withdrawal-governance-amounts.md`

