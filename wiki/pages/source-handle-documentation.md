# Source: Handle Documentation

## Source metadata
| Field | Value |
| --- | --- |
| Primary clipping | `wiki/raw/Handle Documentation.md` |
| Resolution clipping | `wiki/raw/Handle Documentation (1).md` |
| Resolution diagram | `wiki/raw/HandleResolution.svg` |
| Upstream | [docs.handle.me](https://docs.handle.me/) |
| Resolution page | [docs.handle.me/docs/Handles/3_Resolution](https://docs.handle.me/docs/Handles/3_Resolution) |
| Public API | [api.handle.me/swagger](https://api.handle.me/swagger) |
| Clipping created | 2026-07-05 |

## What was ingested
The two markdown clippings in `wiki/raw/` contain **YAML frontmatter only** (title, source URL, description); no article body was captured at clip time. Substantive content for this ingest was taken from:
- **`HandleResolution.svg`** — path-rendered infographic titled **Handles Resolution** (four-step on-chain resolution algorithm; recommends `https://api.handle.me/swagger` for easier resolution).
- **Upstream docs pages** referenced by the clippings (Resolution best practices, Welcome overview, Quick Start journeys, DRep Handles API example, Rest API overview, Limits and Tiers).

## Summary
**ADA Handles** (Handle.me / Kora Labs) are Cardano **NFT-based human-readable names** (`$custom_name`) mapped to wallet addresses and optional personalization. The **Handle Standard** covers minting (CIP-68 datum), **SubHandles** (NFT and virtual `@` forms), resolution rules across policy eras, and dApp **integration best practices**. A hosted **REST API** at `api.handle.me` resolves handles to structured JSON including `resolved_addresses.ada`, holder metadata, and (for DRep subhandles) both legacy and [CIP-129](governance-identifiers-cip129.md) DRep IDs.

## Key claims
- Handles associate a custom name with an address, datum, script, or UTxO; payments route to whichever wallet holds the Handle NFT.
- **SubHandles** extend a root handle: `$john@acme` where `$acme` is root. **NFT SubHandles** behave like Handles (holder owns resolution). **Virtual SubHandles** live in a smart contract; root owner creates/edits/revokes; resolution comes from inline datum `resolved_addresses.ada`.
- **Resolution** is policy- and label-dependent: active policies from `$handle_policies` UTxO; CIP-68 `(222)` label `000de140` for modern handles/NFT subhandles; CIP-67 `(000)` label `00000000` for virtual subhandles with `@`; classic policy `f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a` uses raw hex-encoded name as token name.
- **dApp best practices:** avoid debounce-only resolution; disable browser autofill on address fields; confirm resolved handle text and NFT image; warn on script addresses without datum; reiterate handle on tx review.
- **REST API:** `GET https://api.handle.me/handles/{name}` (no `$` prefix in path). Free tier documented as **5 requests/second** (2026-07 docs). Swagger UI at `api.handle.me/swagger`. Authentication doc marked "Coming Soon" at ingest time.
- **DRep subhandles** (e.g. `goose@drep`): API returns `holder_type: "drep"`, `drep.cip_105`, `drep.cip_129`, and `resolved_addresses.ada`.

## Policy table (from resolution diagram)
| Policy id (truncated) | first_mint_slot | last_mint_slot | sunset_slot |
| --- | --- | --- | --- |
| `f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a` | 47931333 | 148344951 | 0 (active) |
| `6c32db33a422e0bc2cb535bb850b5a6e9a9572222056d6ddc9cbc26e` | 148344960 | 0 | 0 (active) |

## Related pages
- [Cardano ADA Handles](cardano-ada-handles.md)
- [Governance identifiers (CIP-129)](governance-identifiers-cip129.md)
- [DRep metadata standard (CIP-119)](drep-metadata-cip119.md)
- [Wiki Home](wiki-home.md)
