# Source: blockfrost-platform-main

## Source metadata
- Location: `wiki/raw/blockfrost-platform-main/`
- Primary files reviewed:
  - `README.md`
  - `docs/src/content/index.mdx`
  - `docs/src/content/get-started.mdx`

## Summary
Blockfrost Platform is presented as a decentralized API node stack for Cardano operators. It can be used in two primary modes: joining the Blockfrost decentralized cluster ("Icebreakers") or running independently in solitary mode.

## Key claims
- The platform converts Cardano node infrastructure into a high-performance JSON API endpoint.
- It targets SPOs and other node operators.
- Icebreakers is an incentivized quality-testing program tied to operating instances in the decentralized network.
- Solitary deployment is supported for private or local operation without joining the fleet.
- For blockchain query endpoints, a Dolos data node is required.

## Prerequisites captured from source
- Running mainnet Cardano node with a public IP.
- Icebreaker NFT License reward address (for Icebreakers participation).
- Icebreaker account secret (for program participation).

## Emurgo serialization crate (raw tree only)
The ingested Blockfrost Platform tree declares Emurgo’s Rust **`cardano-serialization-lib` `15.0.3`** (workspace `Cargo.toml`) and uses it in `common`, `gateway`, `sdk_bridge`, and `integration_tests` (keys, Hydra verification / coin selection, tx building). This is **not** wired into the ctools React app; see [Emurgo library inventory](ctools-emurgo-libraries.md).

## Related pages
- [Blockfrost Icebreakers](blockfrost-icebreakers.md)
- [Emurgo library inventory](ctools-emurgo-libraries.md)
- [Wiki Home](wiki-home.md)
