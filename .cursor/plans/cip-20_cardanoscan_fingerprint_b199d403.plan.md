---
name: CIP-20 Cardanoscan fingerprint
overview: Keep asset input as hex unit only; add CIP-14 fingerprint computation for display with a Cardanoscan token link; switch transaction links from cexplorer to cardanoscan.io/transaction (matching existing app URLs).
todos:
  - id: cip14-util
    content: Add src/utils/cip14AssetFingerprint.ts (parse unit hex, blake2b dkLen 20, bech32 asset1…)
    status: completed
  - id: cardanoscan-links
    content: "cip20AssetHistory: tx url → cardanoscan.io/transaction; AssetCip20Messages: fingerprint link + copy"
    status: completed
  - id: deps-wiki
    content: Add direct deps if needed; wiki page + log one-liner
    status: completed
isProject: false
---

# Asset CIP-20: fingerprint display and Cardanoscan links

## Scope (per your direction)

- **Do not** accept `asset1…` / CIP-14 bech32 as user input; URL param `assetId` stays the hex **unit** (policy + hex asset name) only.
- **Compute** the CIP-14 fingerprint from that unit and show it in the UI as a **link** to the asset on Cardanoscan.
- **Transaction** links in this tool should use **Cardanoscan**, not cexplorer (align with [`src/components/CommitWizard.tsx`](src/components/CommitWizard.tsx), which already uses `https://cardanoscan.io/transaction/...`).

## CIP-14 fingerprint (implementation)

Per [CIP-14](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0014/README.md):

1. Parse the unit hex string (lowercase): first **56** hex chars = **policy id** (28 bytes); remainder = **asset name** bytes (may be empty).
2. Decode each segment from hex to `Uint8Array`.
3. Concatenate `policyBytes || assetNameBytes`.
4. **blake2b** with **20-byte** digest on that buffer (CIP-14 uses blake2b-160).
5. **Bech32**-encode with human-readable part **`asset`** (Cardano bech32, not bech32m — match CIP-14 / common wallets).

Use **`@noble/hashes/blake2b`** with `{ dkLen: 20 }` (already present transitively in the lockfile) plus the **`bech32`** package’s `toWords` / `encode` (already transitive; add as a **direct** dependency in [`package.json`](package.json) if the bundler does not resolve transitive imports reliably — prefer direct dep for a stable import path).

Add a small pure helper module, e.g. [`src/utils/cip14AssetFingerprint.ts`](src/utils/cip14AssetFingerprint.ts):

- `parseAssetUnitHex(unit: string): { policy: Uint8Array; name: Uint8Array } | null` (validate even-length hex, min length 56).
- `assetFingerprintFromUnitHex(unit: string): string | null` returning `asset1…` or `null` if invalid.

Optional unit tests are not required unless you want them; keep the surface minimal.

## Wire-up

1. **[`src/utils/cip20AssetHistory.ts`](src/utils/cip20AssetHistory.ts)**  
   - Change row `url` from `https://cexplorer.io/tx/${tx}` to **`https://cardanoscan.io/transaction/${tx}`** (same pattern as CommitWizard).

2. **[`src/pages/AssetCip20Messages.tsx`](src/pages/AssetCip20Messages.tsx)**  
   - When `localAssetId` (trimmed) parses to a valid unit, compute fingerprint via `assetFingerprintFromUnitHex` (e.g. `useMemo` on trimmed input).
   - Render a line under the asset id field (or next to the heading after first successful parse): **CIP-14 fingerprint:** `asset1…` as an anchor to **`https://cardanoscan.io/token/${fingerprint}`** (Cardanoscan accepts token URLs with the fingerprint per their public pages).
   - If the unit is invalid hex / too short, show nothing or a short inline hint (no error until load).

3. **Copy**  
   - Placeholder / helper text: asset id is **hex unit only** (not `asset1…`).

## Wiki (light touch)

- One sentence in [`wiki/pages/ctools-drep-voting-history-blockfrost.md`](wiki/pages/ctools-drep-voting-history-blockfrost.md) under the Asset CIP-20 section: fingerprint is derived for display + Cardanoscan link; txs link to Cardanoscan.
- Append a line to [`wiki/log.md`](wiki/log.md).

## Files touched (summary)

| File | Change |
|------|--------|
| [`src/utils/cip14AssetFingerprint.ts`](src/utils/cip14AssetFingerprint.ts) | New: CIP-14 fingerprint from hex unit |
| [`src/utils/cip20AssetHistory.ts`](src/utils/cip20AssetHistory.ts) | Cardanoscan tx URLs |
| [`src/pages/AssetCip20Messages.tsx`](src/pages/AssetCip20Messages.tsx) | Show fingerprint link; clarify hex-only input |
| [`package.json`](package.json) | Add `bech32` (and `@noble/hashes` if needed as direct deps) only if imports require it |
| Wiki | Short doc + log line |
