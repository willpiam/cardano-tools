# ctools: DRep voting history and Blockfrost API keys

This page documents how the **DRep Voting History** UI (`src/pages/DRepVotingHistory.tsx`) obtains a Blockfrost project API key and how that value is mirrored in the page URL.

## Where the key comes from

1. **Redux store** — The component reads `apiKey` from `state.blockfrost` (see `src/store/blockfrostSlice.ts`). The slice holds `useBlockfrost` and `apiKey` (nullable string); `setBlockfrostConfig` updates both together.

2. **Query string on load** — On mount, the page parses `window.location.search` with `URLSearchParams`, reads the parameter **`blockfrostApiKey`**, and if present dispatches `setBlockfrostConfig({ useBlockfrost: true, apiKey: blockfrostApiKey })` and syncs local input state.

3. **Manual entry** — If there is no key in Redux yet, the UI shows a text field and a **Set Key** control. The user types the Blockfrost project id (API key); submitting dispatches the same `setBlockfrostConfig` action with the trimmed value.

A `useEffect` also copies `apiKey` from Redux into local state when Redux changes, so the input stays aligned with the store.

## How the key is written into the URL

When the user applies a key from the form (**Set Key**), `handleApplyKey`:

- Dispatches `setBlockfrostConfig` with the trimmed key.
- Builds `new URL(window.location.href)`, sets the search parameter **`blockfrostApiKey`** to that value, and calls **`window.history.replaceState`** so the current path (including any `/drephistory/:drepId` route) is preserved while the query string is updated.

There is no separate step that removes the key from the URL when clearing Redux; persistence is “add or replace query param” on apply.

## How the key is used for API calls

Requests to Blockfrost use the HTTP header **`project_id`** set to the key (Blockfrost’s convention), not the query string. The base URL is fixed mainnet (`https://cardano-mainnet.blockfrost.io/api/v0`). Pagination uses path + query (`page`, `count`, `order`); the secret stays in the header.

## Vote rationale (CIP-100 anchor) charts

The DRep Voting History page shows two summary charts: **vote disposition** (Yes / No / Abstain / did not vote) and **vote rationale** (did not vote / voted without on-chain anchor / voted with anchor).

Blockfrost `GET /governance/dreps/{drep_id}/votes` does not include per-vote anchor fields. After the main table loads, the app enriches votes in a second phase:

1. Collect unique **vote transaction** hashes from rows where the DRep voted.
2. For each hash, `GET /txs/{hash}/cbor` and parse `voting_procedures` with CML (`src/functions/voteTxAnchors.ts`).
3. Match the page DRep credential and governance action id (`proposal_tx_hash#proposal_cert_index`) to detect whether the `VotingProcedure` includes a CIP-100 anchor (URL + hash on-chain only—no off-chain document fetch).

The results table adds a **Rationale** column (link when an anchor URL is present). Expanded chart modals support pie/bar toggle and a vote-choice × anchor cross-tab for voted actions. See [Governance metadata framework (CIP-100)](governance-metadata-framework-cip100.md).

## Cached closed governance actions

For governance actions where voting has ended (expired, ratified, enacted, or dropped), the DRep Voting History page stores enrichment in the browser **IndexedDB** (`ctools-drep-voting-history`):

- **Global per proposal** (`tx_hash#cert_index`): expiration epochs, governance-action metadata anchor, and (for `treasury_withdrawals`) total withdrawal lovelace + recipient count from Blockfrost detail + `/withdrawals`.
- **Per DRep**: vote disposition, vote transaction hash, and CIP-100 vote rationale anchor (from `/txs/{hash}/cbor` parsing).

On refresh, paginated proposal and vote lists still load from Blockfrost, but detail/metadata and vote-CBOR calls are skipped for closed actions when cache entries exist. Open actions (`countdown` / unknown status) always refetch. Legacy cache entries without treasury totals trigger a refetch for `treasury_withdrawals` proposals.

## Treasury withdrawal amounts

For governance actions with `governance_type === 'treasury_withdrawals'`, the page fetches on-chain withdrawal totals via Blockfrost `GET /governance/proposals/{tx_hash}/{cert_index}/withdrawals` (falling back to parsing `governance_description`). See [Treasury withdrawal governance amounts](treasury-withdrawal-governance-amounts.md) for ledger encoding.

- **Summary row:** single type badge combining action label and compact amount (e.g. `Treasury Withdrawals · ₳70M`) via `src/utils/formatAda.ts`.
- **Expanded details:** exact ADA amount and recipient count.
- **Search:** compact badge text is included in the title search haystack.

Shared parsing lives in `computeTreasuryWithdrawalSummary` / `fetchProposalTreasuryWithdrawals` in `src/functions/governanceActionsFetch.ts` (same helpers as [Live Governance Actions](ctools-governance-actions-live.md)).

**Reload closed actions** runs a phased recache: batched proposal requests, a cooldown between batches, then batched vote-CBOR fetches, with a modal titled **Reloading & Recaching** showing the current step (e.g. `Requesting batch 2 of 12`, `Waiting 10 seconds between batch 3 and 4`). Helpers: `src/utils/drepVotingHistoryCache.ts`, `src/utils/drepVotingHistoryRecache.ts`, `src/components/ReloadingRecacheModal.tsx`.

## Security note

Putting API keys in query parameters can expose them in shared links, referrer headers, analytics, and server access logs. This behavior is intentional for shareable/bookmarkable sessions in this tool, but operators should treat shared URLs as sensitive.

## Conch protocol (same URL pattern)

The **Conch protocol** reader (`src/pages/AssetCip20Messages.tsx`, route **`/conch`**; legacy paths `/cip20-asset` and `/asset-cip20-messages` redirect to `/conch` with query preserved) reuses the same Blockfrost key flow:

- On mount, reads **`blockfrostApiKey`** from the query string and dispatches `setBlockfrostConfig` like the other tools.
- **Apply settings (save to URL)** dispatches the trimmed key (or uses the key already in Redux), then `replaceState` with:
  - **`blockfrostApiKey`**
  - **`assetId`** — full native asset unit (policy hex + asset name hex) used for `GET /assets/{asset}/transactions`
  - **`txLimit`** — max number of asset transactions to scan (capped in the UI; default 40)

**Load history** runs the Blockfrost fetches (header `project_id` only) and does not add the secret to Blockfrost request URLs. Helpers live in `src/utils/cip20AssetHistory.ts`.

Per-transaction metadata lookups are cached in browser **IndexedDB** (`ctools-conch-history`, store `transactions`) keyed by normalized tx hash. On each load the asset transaction list is always refetched; Blockfrost `GET /txs/{hash}/metadata` is skipped for txs already in cache (including txs confirmed to have no CIP-20 label `674`). A **Settings** gear on the Conch page opens a modal showing the cache count and a **Clear {n} cached Conch transactions** button. Cache module: `src/utils/conchHistoryCache.ts`; settings modal: `src/components/ConchHistorySettingsModal.tsx`.

The Conch reader derives the CIP-14 **`asset1…` fingerprint** from the hex unit via **`@emurgo/cip14-js`** (`AssetFingerprint.fromParts`) and shows it as a link to the token on **Cardanoscan**; per-transaction links in the results table use **Cardanoscan** (`/transaction/{hash}`), not cexplorer. To author new CIP-20 / 674 payloads in transactions, the app’s **Commit** page is linked from the Conch UI (`/commit`).

## Live Governance Actions (same Blockfrost key)

`src/pages/GovernanceActions.tsx` (routes `/governance-actions`, `/gov-actions`, `/live-actions`, etc.) uses the same `blockfrostApiKey` query param and Redux flow. Data loading and CIP-108 metadata parsing live in `src/functions/governanceActionsFetch.ts`. See [ctools: Live Governance Actions](ctools-governance-actions-live.md).

## Related code

- Pages: `src/pages/DRepVotingHistory.tsx`, `src/pages/GovernanceActions.tsx`, `src/pages/AssetCip20Messages.tsx`
- Charts: `src/components/DRepVoteSummaryChart.tsx`, `src/components/DRepVoteMetadataChart.tsx`, `src/components/governanceChartShared.tsx`
- Vote anchor parsing: `src/functions/voteTxAnchors.ts`
- State: `src/store/blockfrostSlice.ts`
- Conch / CIP-20 history helpers: `src/utils/cip20AssetHistory.ts`
- Conch transaction metadata cache: `src/utils/conchHistoryCache.ts`
- CIP-14 fingerprint from unit hex: `src/utils/cip14AssetFingerprint.ts` (uses `@emurgo/cip14-js`)
