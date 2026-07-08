# Cardano ADA Handles

## Overview
[ADA Handles](source-handle-documentation.md) (Handle.me, Kora Labs) provide **human-readable names** for Cardano wallets and identities. A Handle takes the form **`$custom_name`** and maps to native addresses (and optional personalization) via on-chain NFTs and the **Handle Standard**. Handles are minted as **CIP-68** assets; whoever holds the Handle NFT is where payments route by default.

SubHandles extend a root brand or handle:
- **`$john@acme`** — `$acme` is the root; `@` denotes a subhandle.
- **NFT SubHandles** — same ownership model as Handles; holder controls resolution.
- **Virtual SubHandles** — not held in user wallets; root owner manages them in a contract; **`resolved_addresses.ada`** lives in the token UTxO **inline datum**.

Upstream docs also describe marketplace, personalization, Handle Pay, and HandleChat as ecosystem products; this page focuses on **resolution** and **dApp integration** from ingested sources.

## Resolution overview
Source diagram: [`wiki/raw/HandleResolution.svg`](../raw/HandleResolution.svg). Hosted resolution is available via [api.handle.me/swagger](https://api.handle.me/swagger).

### Step 1 — Active policies
Read valid handle policies from the UTxO named **`$handle_policies`**. Each policy maps to slot bounds:

| Field | Meaning |
| --- | --- |
| `first_mint_slot` | Slot of first Handle mint for this policy |
| `last_mint_slot` | Slot of last mint; `0` = still minting |
| `sunset_slot` | After this slot, Handles in the policy should not resolve; `0` = active |

Example policy entries (from diagram):
- Classic: `f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a` → `[47931333, 148344951, 0]`
- Modern: `6c32db33a422e0bc2cb535bb850b5a6e9a9572222056d6ddc9cbc26e` → `[148344960, 0, 0]`

### Step 2 — CIP-68 Handles / NFT SubHandles
Combine the **CIP-68 (222) label** `000de140` with the **hex-encoded handle name** (without `$`).

Example `$my.cool.handle`:
- Label: `000de140`
- Name hex: `6d792e636f6f6c2e68616e646c65`
- Token name: `000de1406d792e636f6f6c2e68616e646c65`

Resolve to the address holding that token.

### Step 3 — Virtual SubHandles
Only if the name contains **`@`** and step 2 did not resolve. Use **CIP-67 (000) label** `00000000` + hex-encoded full name.

Example `$john@my.cool.handle`:
- Token name: `000000006a6f686e406d792e636f6f6c2e68616e646c65`

Virtual subhandles are **not** in the user's wallet; read **`resolved_addresses.ada`** from the **inline datum** on the token UTxO.

### Step 4 — Classic Handles
Only on policy **`f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a`**. Token name is the **raw hex-encoded name** (no CIP-68 prefix).

Example `$my.cool.handle` → `6d792e636f6f6c2e68616e646c65`. Resolve to the holder's address.

## REST API resolution
**Endpoint:** `GET https://api.handle.me/handles/{name}` — use the handle **without** the leading `$`.

Example response fields (from `$test` and DRep subhandle docs):
- `name`, `hex`, `image`, `standard_image`
- `holder`, `holder_type` (`wallet`, `drep`, …)
- `resolved_addresses.ada` — primary payment/identity address
- `handle_type` — e.g. `handle`, `nft_subhandle`
- `has_datum`, `utxo`, policy/slot metadata
- For DRep subhandles: nested **`drep`** with `cip_105`, `cip_129`, credential hex

**DRep subhandle example:** `GET https://api.handle.me/handles/goose@drep` returns `holder_type: "drep"` and both **`drep.cip_105`** and **`drep.cip_129`** Bech32 IDs (see [CIP-129](governance-identifiers-cip129.md)).

**Rate limit (docs, 2026-07):** free API, **5 requests/second**. Authentication page was "Coming Soon" at ingest time.

Alternatives mentioned upstream: self-hosted / Docker resolver and decentralized public API (see Handle Rest API docs).

## DRep ID resolution paths

| Path | Works? | Notes |
| --- | --- | --- |
| `*@drep` subhandle → Handle API | **Yes** | `GET api.handle.me/handles/{name}` → `drep.cip_129` directly ([example above](#rest-api-resolution)) |
| Regular `$handle` → `drep.cip_129` via Handle API | **No** | Response has `holder_type: "wallet"`; no `drep` object |
| Regular `$handle` → stake credential → DRep ID | **No (not a valid chain)** | See below |

### Handle → stake credential (partial)
Handle API returns **`resolved_addresses.ada`** (payment address) for all handles. The **`holder`** field may be a **stake address** (`stake1...`) for some regular handles or a payment/enterprise address for others — it is **not** documented as a guaranteed stake-credential lookup.

The wiki does **not** document a standard step to extract a stake **credential hash** from a resolved handle, nor a Blockfrost/indexer query keyed by stake credential to find a DRep.

### Stake credential ≠ DRep credential
[CIP-95](cip95-wallet-bridge.md) treats **DRep keys** and **stake keys** as **separate** material:
- **`getPubDRepKey()`** → DRep ID via Blake2b-224 hash → `drep1...` ([CIP-129](governance-identifiers-cip129.md))
- **`getRegisteredPubStakeKeys()`** → stake credentials for delegation

A stake credential hash does **not** cryptographically derive a DRep ID. DRep registration on-chain is keyed by the **DRep credential**, not the stake credential ([CIP-119](drep-metadata-cip119.md): authenticity comes from the registering DRep credential). Blockfrost governance endpoints in the wiki are keyed by **`drep_id`** (e.g. `/governance/dreps/{drep_id}`), not by stake credential reverse lookup.

**Practical implication:** for a human-readable name → DRep ID mapping, use a **DRep subhandle** (`*@drep`) or have the user supply/wallet-derive the DRep ID directly. A regular ADA Handle only reliably gives you a **payment address** (and sometimes a stake **address** in `holder`), not a governance DRep identity.

## dApp integration best practices
From the Handle Standard **Verified Integration** guidance:

1. **Do not rely on debounce alone** for resolution. Prefer explicit completion signals: Enter, Tab, button click, or input blur. If debouncing, re-resolve after explicit user action.
2. **Disable browser autofill** on address inputs to prevent accidental wrong recipients.
3. **Confirm resolution visually** — show the resolved `$handle` string and/or the Handle NFT image.
4. **Warn on script addresses** without datum (except expected multi-sig cases).
5. **Transaction review** — repeat handle name and/or image alongside the resolved address.

## Relationship to Cardano governance metadata
- **[CIP-119](drep-metadata-cip119.md)** `Identity` reference type supports linking social/profile URIs where a DRep prominently displays their DRep ID; an ADA Handle can serve as a human-verifiable identity anchor (manual content correlation, not PKI).
- **DRep subhandles** (`*@drep`) expose **`drep1...`** ([CIP-129](governance-identifiers-cip129.md)) via the Handle API, complementing wallet-derived DRep IDs in [CIP-95](cip95-wallet-bridge.md) flows.

## Quick-start journeys (upstream)
Handle.me docs suggest four entry paths: **mint** a Handle, **personalize** profile/socials, create **SubHandles**, or manage **DRep identity** via the DRep dashboard (wallet connect, resolve DRep Handle, update metadata).

## Related pages
- [Source: Handle Documentation](source-handle-documentation.md)
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [Wiki Home](wiki-home.md)
