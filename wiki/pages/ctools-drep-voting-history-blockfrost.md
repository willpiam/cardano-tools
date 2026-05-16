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

The Conch reader derives the CIP-14 **`asset1…` fingerprint** from the hex unit via **`@emurgo/cip14-js`** (`AssetFingerprint.fromParts`) and shows it as a link to the token on **Cardanoscan**; per-transaction links in the results table use **Cardanoscan** (`/transaction/{hash}`), not cexplorer. To author new CIP-20 / 674 payloads in transactions, the app’s **Commit** page is linked from the Conch UI (`/commit`).

## Live Governance Actions (same Blockfrost key)

`src/pages/GovernanceActions.tsx` (routes `/governance-actions`, `/gov-actions`, `/live-actions`, etc.) uses the same `blockfrostApiKey` query param and Redux flow. Data loading and CIP-108 metadata parsing live in `src/functions/governanceActionsFetch.ts`. See [ctools: Live Governance Actions](ctools-governance-actions-live.md).

## Related code

- Pages: `src/pages/DRepVotingHistory.tsx`, `src/pages/GovernanceActions.tsx`, `src/pages/AssetCip20Messages.tsx`
- State: `src/store/blockfrostSlice.ts`
- Conch / CIP-20 history helpers: `src/utils/cip20AssetHistory.ts`
- CIP-14 fingerprint from unit hex: `src/utils/cip14AssetFingerprint.ts` (uses `@emurgo/cip14-js`)
