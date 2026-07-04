#!/usr/bin/env python3
"""Fetch ADA balances for stake addresses in state.json (resumable)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

BLOCKFROST_BASE = "https://cardano-mainnet.blockfrost.io/api/v0"
LOVELACE_PER_ADA = 1_000_000
STATE_WRITE_INTERVAL = 25
DIR = Path(__file__).resolve().parent


def blockfrost_headers(api_key: str) -> dict[str, str]:
    return {"project_id": api_key}


def write_state(state_path: Path, state: dict[str, Any]) -> None:
    with state_path.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
        f.write("\n")


def load_state(state_path: Path) -> dict[str, Any]:
    if not state_path.exists():
        raise FileNotFoundError(f"{state_path} not found — run part_1.py first")

    with state_path.open(encoding="utf-8") as f:
        state = json.load(f)

    if not isinstance(state.get("uuid"), str):
        raise ValueError(f"{state_path} is missing a uuid string")
    if not isinstance(state.get("stake_addresses"), list):
        raise ValueError(f"{state_path} is missing a stake_addresses list")

    return state


def fetch_ada_balance(stake_address: str, api_key: str) -> float:
    """Return ADA controlled by a stake address via Blockfrost account summary."""
    url = f"{BLOCKFROST_BASE}/accounts/{stake_address}"
    res = requests.get(url, headers=blockfrost_headers(api_key), timeout=60)

    if res.status_code == 404:
        return 0.0

    if not res.ok:
        raise RuntimeError(f"Blockfrost {res.status_code}: {res.text}")

    # controlled_amount is the stake account balance in lovelace (not a UTXO sum).
    lovelace = int(res.json()["controlled_amount"])
    return lovelace / LOVELACE_PER_ADA


def is_pending(balance: Any) -> bool:
    return balance == "pending"


def format_progress_counts(done: int, total: int) -> str:
    width = len(str(total))
    pct = (done / total * 100) if total else 100.0
    return f"{done:>{width}}/{total} ({pct:>6.1f}%)"


def format_balance_progress(done: int, total: int) -> str:
    return f"Balances: {format_progress_counts(done, total)}"


def main() -> int:
    load_dotenv(DIR / ".env")

    api_key = os.environ.get("BLOCKFROST_API_KEY", "").strip()
    if not api_key:
        print("BLOCKFROST_API_KEY is missing from LittleBoy/.env", file=sys.stderr)
        return 1

    state_path = DIR / "state.json"
    try:
        state = load_state(state_path)
    except (FileNotFoundError, ValueError) as exc:
        print(exc, file=sys.stderr)
        return 1

    entries: list[dict[str, Any]] = state["stake_addresses"]
    pending_indices = [
        index
        for index, entry in enumerate(entries)
        if is_pending(entry.get("ada_balance"))
    ]

    if not pending_indices:
        print(
            f"All {len(entries)} balance(s) already loaded "
            f"({format_progress_counts(len(entries), len(entries))}, "
            f"uuid={state['uuid']})."
        )
        return 0

    already_loaded = len(entries) - len(pending_indices)
    total = len(entries)
    print(
        f"Resuming uuid={state['uuid']}: "
        f"{already_loaded} loaded, {len(pending_indices)} pending "
        f"({format_progress_counts(already_loaded, total)})"
    )

    resolved_this_run = 0
    for resolved_this_run, index in enumerate(pending_indices, start=1):
        entry = entries[index]
        stake_address = entry["stake_address"]
        entry["ada_balance"] = fetch_ada_balance(stake_address, api_key)

        if resolved_this_run % STATE_WRITE_INTERVAL == 0 or resolved_this_run == len(
            pending_indices
        ):
            write_state(state_path, state)
            print(format_balance_progress(already_loaded + resolved_this_run, total))

    remaining = sum(1 for entry in entries if is_pending(entry.get("ada_balance")))
    done_count = total - remaining
    print(
        f"Done: resolved {resolved_this_run} this run, "
        f"{remaining} still pending, {format_balance_progress(done_count, total)}, "
        f"uuid={state['uuid']} -> {state_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
