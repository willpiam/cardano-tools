# Treasury withdrawal governance actions: on-chain amounts and querying

## How the ledger learns the withdrawal amount

Treasury withdrawal is **governance action type 6** in [CIP-1694](cardano-governance-cip1694.md). The amount is **not** carried in off-chain CIP-108 metadata; it is encoded **on-chain** in the governance action payload.

### Submission path

1. A submitter includes one or more **proposal procedures** in the Conway transaction body field **`proposal_procedure`** (tx body index **20** per [CIP-95](cip95-wallet-bridge.md)).
2. Each proposal procedure is a full governance action: deposit, reward address for deposit return, metadata anchor, anti-collision previous-action id, and **type-specific data**.
3. For **treasury withdrawal**, the type-specific data is: **a map from stake credentials to a positive number of Lovelace** ([Source: cip1694](source-cip1694.md), CIP table "Content → Additional data").

The ledger therefore learns **who receives how much** from that credential→lovelace map. The **total treasury outflow** for the action is the **sum** of all map values. On ratification and enactment at the epoch boundary, the ledger moves those lovelace amounts from the treasury to the named stake credentials' reward accounts.

### What this is not

| Mechanism | Role |
|-----------|------|
| CIP-108 off-chain metadata (`title`, `abstract`, …) | Narrative context only; does **not** define withdrawal amounts |
| Tx body `coin` (index 21) | **Current treasury value** — used when Plutus must reference treasury state (e.g. donations), not withdrawal sizing |
| Tx body `positive_coin` (index 22) | **Donation to treasury** (ADA into treasury), not withdrawal |
| Shelley-era MIR certificates | Replaced by the governance-action system in Conway |

Optional **guardrails script** (CIP-1694) can enforce extra constraints on treasury withdrawal proposals at validation/enactment time.

## How to query withdrawal amounts

### Blockfrost (indexer API)

For a proposal keyed by `tx_hash` + `cert_index`:

1. **Proposal detail** — `GET /governance/proposals/{tx_hash}/{cert_index}`  
   Response includes `governance_description`, which may embed withdrawal entries under keys such as `withdrawals`, `treasury_withdrawals`, or nested `action.withdrawals` / `contents.withdrawals`.

2. **Dedicated withdrawals list** — `GET /governance/proposals/{tx_hash}/{cert_index}/withdrawals`  
   Returns an array of `{ stake_address, amount }` where `amount` is lovelace (string). Sum `amount` for total withdrawal; count rows for recipient count.

See [ctools: Live Governance Actions](ctools-governance-actions-live.md) for the ctools pipeline that uses both endpoints.

### ctools implementation

`src/functions/governanceActionsFetch.ts`:

- For `governance_type === 'treasury_withdrawals'`, fetches the `/withdrawals` endpoint (paginated `count=100`).
- `parseSummary` / `summarizeWithdrawals` sum per-recipient lovelace into `treasuryWithdrawalTotalLovelace` and format ADA as `lovelace / 1_000_000`.
- Falls back to parsing `governance_description` when the withdrawals endpoint is unavailable.

### Identifiers

On-chain action id: `tx_hash#cert_index` ([CIP-1694](cardano-governance-cip1694.md)). [CIP-129](governance-identifiers-cip129.md) `gov_action1…` is a Bech32 encoding of the same bytes for UIs/APIs.

## Related pages

- [Cardano governance model (CIP-1694)](cardano-governance-cip1694.md)
- [Source: cip1694](source-cip1694.md)
- [CIP-95 wallet bridge (Conway governance)](cip95-wallet-bridge.md)
- [ctools: Live Governance Actions](ctools-governance-actions-live.md)
- [Cardano Multiplatform Lib (CML)](cardano-multiplatform-lib-cml.md) — `set_donation` / `set_current_treasury_value` (treasury **in**, not withdrawal)
