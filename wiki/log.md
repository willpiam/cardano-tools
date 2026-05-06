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

