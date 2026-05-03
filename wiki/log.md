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

