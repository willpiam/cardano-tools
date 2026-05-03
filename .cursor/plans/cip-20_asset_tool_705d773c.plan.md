---
name: CIP-20 asset tool
overview: "Add a new React tool page that ports the CIP-20 message history logic from `temp/index.ts` using the same Blockfrost patterns as `DRepVotingHistory` / `GovernanceActions`: Redux + `blockfrostApiKey` query param, plus a new `assetId` query param, and REST calls with the `project_id` header (no new npm dependency)."
todos:
  - id: utils-cip20
    content: Add src/utils/cip20AssetHistory.ts with fetch-based pagination, metadata fetch, CIP-20 filter, and formatted output types
    status: completed
  - id: page-ui
    content: "Create AssetCip20Messages (or similar) page: Blockfrost key UX + assetId/limit fields, URL read/write for blockfrostApiKey + assetId (+ optional txLimit), load + table"
    status: completed
  - id: route-home
    content: Wire route in src/index.tsx and TOOL_LINKS in src/pages/Home.tsx
    status: completed
  - id: wiki-optional
    content: "Optional: append assetId query param behavior to wiki page or log entry"
    status: completed
isProject: false
---

# CIP-20 asset message history tool

## Wiki-grounded Blockfrost + URL behavior

Per [wiki/pages/ctools-drep-voting-history-blockfrost.md](wiki/pages/ctools-drep-voting-history-blockfrost.md) (and the live pattern in [src/pages/DRepVotingHistory.tsx](src/pages/DRepVotingHistory.tsx) / [src/pages/GovernanceActions.tsx](src/pages/GovernanceActions.tsx)):

- **Read on mount:** `URLSearchParams(window.location.search)` → if `blockfrostApiKey` is set, `dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: value }))` and mirror into local input state.
- **Write on apply:** after dispatch, `new URL(window.location.href)`, `url.searchParams.set('blockfrostApiKey', trimmedKey)`, `window.history.replaceState({}, '', url.toString())`.
- **Calls:** `fetch` to `https://cardano-mainnet.blockfrost.io/api/v0` with header **`project_id`**: `apiKey` (never put the secret in Blockfrost path/query for the HTTP request itself).

**Extension for this tool:** treat **`assetId`** the same way for bookmarking/sharing: read `assetId` from the query string on mount into local state; when the user applies settings (key and/or asset + optional limit), call `replaceState` after setting **`assetId`** (and optionally **`txLimit`** or `amount` if you want parity with the Deno script’s `40`). Use a single “Apply” / “Load history” action that updates **both** `blockfrostApiKey` and `assetId` when present so one click keeps the URL consistent.

## What `temp/index.ts` does (porting target)

Core behavior to expose in the app:

1. Paginate asset transaction history ascending (`count`/`page`, max 100 per page) — in Deno via `API.assetsTransactions(asset, opts)`.
2. For each tx, fetch metadata — `API.txsMetadata(tx_hash)`.
3. Keep txs whose metadata includes **label `674`** (CIP-20).
4. Decode message via `json_metadata.msg` or string/array fallbacks (`formatCip20Message`).
5. Join **block_time** from the tx list for display timestamps and explorer links (`cexplorer.io` is fine to keep).

**Asset identity:** The Deno script passed a **policy id** into `assetsPolicyById` and took the first asset. You asked to persist an **asset id** in the URL; the more direct REST path is **`GET /assets/{asset}/transactions`** using the full **asset unit** (policy hex + asset name hex). That avoids ambiguity when a policy mints multiple assets and matches “asset id” literally.

Optional follow-up (not required for the first slice): `getAddressCip20History` / `getAddressMetadataHistory` could be a second section or later page using `/addresses/{address}/transactions` — same CIP-20 helpers.

## Implementation plan

1. **Shared Blockfrost helpers (small module)**  
   Add something like [src/utils/cip20AssetHistory.ts](src/utils/cip20AssetHistory.ts) (name flexible) containing:
   - Typed minimal interfaces for Blockfrost list items and metadata entries.
   - `buildHistoryPages`: loop `page` with `count=100`, `order=asc`, stop when page shorter than 100 or total reached (mirror [temp/index.ts](temp/index.ts) `buildHistory` cap by `amount`).
   - `fetchAssetTransactions(assetId, apiKey, amount)` → `GET .../assets/${encodeURIComponent(assetId)}/transactions?...`
   - `fetchTxMetadata(txHash, apiKey)` → `GET .../txs/{hash}/metadata`
   - `getAssetCip20History(assetId, apiKey, amount)` orchestrating the above + CIP-20 filter + formatted rows (`tx`, explorer `url`, `timestamp`, `message`).

2. **New page component**  
   New file e.g. [src/pages/AssetCip20Messages.tsx](src/pages/AssetCip20Messages.tsx) (title copy can say “CIP-20 messages” or “Asset message history”):
   - Reuse the **key gate UI** block from DRep/Governance (link to blockfrost.io, input, **Set Key** / combined apply).
   - **Asset id** text field; numeric **limit** (default e.g. 40 or 100, max bounded to avoid runaway requests).
   - `useEffect` on mount: parse `blockfrostApiKey` and **`assetId`** (and limit if present) from `window.location.search`, dispatch Redux for key, set local state.
   - Apply handler: trim key + asset id, dispatch `setBlockfrostConfig`, `url.searchParams.set('blockfrostApiKey', ...)`, **`url.searchParams.set('assetId', ...)`**, optionally `txLimit`, then `replaceState`.
   - Fetch when `apiKey` and non-empty `assetId` are available (button or auto after apply — match UX of other tools: explicit “Load” after fields are set avoids surprise rate usage).
   - Present results in a simple table (align styling with [src/pages/DRepVotingHistory.tsx](src/pages/DRepVotingHistory.tsx) / [src/pages/GovernanceActions.tsx](src/pages/GovernanceActions.tsx): bordered sections, readable typography).

3. **Routing and discovery**  
   - Register route in [src/index.tsx](src/index.tsx) (e.g. `/cip20-asset` or `/asset-cip20-messages`).
   - Add entry to `TOOL_LINKS` in [src/pages/Home.tsx](src/pages/Home.tsx).

4. **No new dependency**  
   Keep parity with the rest of the app: **do not** add `@blockfrost/blockfrost-js`; use `fetch` + `BLOCKFROST_BASE` constant as elsewhere.

5. **Wiki (optional durable note)**  
   If you want the wiki to document the new query param, a short addition to [wiki/pages/ctools-drep-voting-history-blockfrost.md](wiki/pages/ctools-drep-voting-history-blockfrost.md) or a one-line cross-link page is enough; only do this if you want parity with how DRep behavior was filed — not strictly required for the feature.

## Security / UX (same as wiki)

Call out in UI copy (one line): query strings can leak in referrers and shared links — same intentional tradeoff as existing Blockfrost tools ([wiki/pages/ctools-drep-voting-history-blockfrost.md](wiki/pages/ctools-drep-voting-history-blockfrost.md) “Security note”).
