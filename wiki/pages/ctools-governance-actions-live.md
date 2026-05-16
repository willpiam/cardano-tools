# ctools: Live Governance Actions page

This page documents the **Live Governance Actions** UI (`src/pages/GovernanceActions.tsx`) and its data layer (`src/functions/governanceActionsFetch.ts`).

## Purpose

The tool lists governance proposals that are still **live** on Cardano mainnet—those with no `dropped_epoch`, `expired_epoch`, `ratified_epoch`, or `enacted_epoch` in Blockfrost proposal detail. For each action it shows a type-specific on-chain summary, discovers the metadata anchor from the on-chain `governance_description`, fetches off-chain JSON when possible, and parses **CIP-108** fields for display.

## Routes

Registered in `src/index.tsx`:

| Path | Component |
|------|-----------|
| `/governance-actions` | `GovernanceActions` |
| `/governanceactions` | same |
| `/gov-actions` | same |
| `/live-actions` | same |

The home page links to `/governance-actions` (`src/pages/Home.tsx`).

## Blockfrost API key

Uses the same pattern as other ctools Blockfrost tools (see [DRep voting history: Blockfrost key and URL params](ctools-drep-voting-history-blockfrost.md)):

- Redux `state.blockfrost.apiKey` via `setBlockfrostConfig`.
- Query parameter **`blockfrostApiKey`** read on mount and written on **Set Key** with `history.replaceState`.
- Requests use header **`project_id`** against `https://cardano-mainnet.blockfrost.io/api/v0` (mainnet only).

Without a key, the page shows a prompt to enter one from [blockfrost.io](https://blockfrost.io).

## Data pipeline

`fetchLiveGovernanceActions(apiKey, { onPartial? })` in `src/functions/governanceActionsFetch.ts`:

1. **List proposals** — Paginated `GET /governance/proposals` (`fetchAllPages`, 100 per page, `order=desc`).
2. **Per-proposal detail** — Up to 8 concurrent `GET /governance/proposals/{tx_hash}/{cert_index}`.
3. **Treasury withdrawals** — For `treasury_withdrawals` type, also `GET .../withdrawals?count=100` to sum recipient amounts when the description alone is insufficient.
4. **Live filter** — Keeps only actions where all four epoch fields above are `null`.
5. **Metadata step 1 (on-chain)** — `discoverMetadataAnchor` walks `governance_description` (depth-limited) for `uri`/`url` and optional hash fields (`hash`, `data_hash`, `hashDigest`, `referenceHash`). Status: `success` or `error` (`anchor_missing`, `anchor_discovery_failed`).
6. **Metadata step 2 (off-chain)** — Up to 6 concurrent fetches of the discovered URL via `loadActionMetadata`, then `parseCip108Metadata` on `body` (or root). Status: `loaded`, `error`, or `skipped` when step 1 did not yield a URL.
7. **Partial UI updates** — `onPartial` is called after step 1 with step-2 rows marked `loading`, then again when all metadata fetches finish.

The page component calls `fetchLiveGovernanceActions` whenever `apiKey` is set in Redux. Step-2 **Retry metadata** re-runs `loadActionMetadata` for a single card when step 1 succeeded but step 2 failed.

## Governance action types

`GOVERNANCE_TYPES` (Blockfrost `governance_type` values):

- `hard_fork_initiation`
- `info_action`
- `new_committee`
- `new_constitution`
- `no_confidence`
- `parameter_change`
- `treasury_withdrawals`

`formatGovActionType` turns snake_case into title case for labels. The UI assigns a distinct badge color per type (`typeColor` in `GovernanceActions.tsx`).

## On-chain summaries

`parseSummary` builds a one-line `summary` per type (and `treasuryWithdrawalTotalLovelace` for treasury actions), for example:

- **Treasury withdrawals** — recipient count and total ADA (lovelace / 1_000_000).
- **Parameter change** — up to four changed parameter keys.
- **New committee** — member add/remove counts and optional quorum threshold.
- **New constitution** — constitution anchor URL/hash snippet.
- **Hard fork initiation** — target protocol major.minor.
- **No confidence / info** — fixed short labels.

`extractGovernanceTitle` searches the description tree for `title`, `action_title`, `proposal_title`, or `name` as a fallback title before CIP-108 metadata loads.

## CIP-108 display

When step 2 succeeds, the card prefers `metadata.title` over the on-chain title and shows `abstract`. A collapsible **Show CIP-108 details** section exposes `motivation`, `rationale`, and `references` (label, URI, optional `hashDigest` / `hashAlgorithm`). This aligns with the vocabulary in [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md); the parser accepts JSON-LD-style `references.@set` arrays.

Metadata errors show step (`step1` vs `step2`), message, `code`, optional HTTP status, and `details`.

## UI filters and sorting

- **Filter by type** — `all` or one `GovernanceType`.
- **Sort treasury withdrawals** — only when the treasury filter is active: none, amount ascending, or amount descending (`treasuryWithdrawalTotalLovelace`).
- **Counts** — Total live actions plus per-type counts in the header strip.

## External links

Each action links to Cardanoscan: `https://cardanoscan.io/govAction/{id}` (truncated hash display via `truncateHash`). Metadata URL and reference URIs open in new tabs.

## Related consumers

- `src/pages/DRepBulkVote.tsx` imports `fetchLiveGovernanceActions` and related types from the same module for voting over live actions.

## Related code

- Page: `src/pages/GovernanceActions.tsx`
- Fetch/metadata: `src/functions/governanceActionsFetch.ts`
- Blockfrost state: `src/store/blockfrostSlice.ts`

## Related wiki

- [DRep voting history: Blockfrost key and URL params](ctools-drep-voting-history-blockfrost.md)
- [Governance action metadata standard (CIP-108)](governance-action-metadata-cip108.md)
- [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md)
- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
