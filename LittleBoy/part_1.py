#!/usr/bin/env python3
"""Enumerate stake addresses delegated to target DReps via Blockfrost."""

from __future__ import annotations

import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

BLOCKFROST_BASE = "https://cardano-mainnet.blockfrost.io/api/v0"
DIR = Path(__file__).resolve().parent


def load_targets(setup_path: Path) -> list[dict[str, str]]:
    with setup_path.open(encoding="utf-8") as f:
        data = json.load(f)

    targets = data.get("targets")
    if not isinstance(targets, list) or not targets:
        raise ValueError(f"{setup_path} must contain a non-empty 'targets' list")

    cleaned: list[dict[str, str]] = []
    for target in targets:
        if not isinstance(target, dict):
            raise ValueError("each target must be an object with drepId and drep_name")

        drep_id = target.get("drepId")
        drep_name = target.get("drep_name")
        if not isinstance(drep_id, str) or not drep_id.strip():
            raise ValueError("each target must have a non-empty drepId string")
        if not isinstance(drep_name, str) or not drep_name.strip():
            raise ValueError("each target must have a non-empty drep_name string")

        cleaned.append({"drepId": drep_id.strip(), "drep_name": drep_name.strip()})

    return cleaned


def blockfrost_headers(api_key: str) -> dict[str, str]:
    return {"project_id": api_key}


def fetch_delegator_addresses(drep_id: str, api_key: str) -> set[str]:
    addresses: set[str] = set()
    page = 1

    while True:
        url = f"{BLOCKFROST_BASE}/governance/dreps/{drep_id}/delegators"
        res = requests.get(
            url,
            headers=blockfrost_headers(api_key),
            params={"page": page, "count": 100, "order": "asc"},
            timeout=60,
        )

        if res.status_code == 404:
            break

        if not res.ok:
            raise RuntimeError(f"Blockfrost {res.status_code}: {res.text}")

        rows = res.json()
        for row in rows:
            addresses.add(row["address"])

        if len(rows) < 100:
            break

        page += 1

    return addresses


def write_state(state_path: Path, state: dict[str, Any]) -> None:
    with state_path.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
        f.write("\n")


def main() -> int:
    load_dotenv(DIR / ".env")

    api_key = os.environ.get("BLOCKFROST_API_KEY", "").strip()
    if not api_key:
        print("BLOCKFROST_API_KEY is missing from LittleBoy/.env", file=sys.stderr)
        return 1

    targets = load_targets(DIR / "setup.json")
    all_addresses: set[str] = set()

    for target in targets:
        drep_id = target["drepId"]
        drep_name = target["drep_name"]
        print(f"Fetching delegators for {drep_name} ({drep_id})...")
        all_addresses.update(fetch_delegator_addresses(drep_id, api_key))

    run_id = str(uuid.uuid4())
    stake_entries: list[dict[str, Any]] = [
        {"stake_address": address, "ada_balance": "pending"}
        for address in sorted(all_addresses)
    ]

    state_path = DIR / "state.json"
    state: dict[str, Any] = {"uuid": run_id, "stake_addresses": stake_entries}
    write_state(state_path, state)

    print(
        f"Done: {len(targets)} target(s), {len(stake_entries)} stake address(es), "
        f"uuid={run_id} -> {state_path}"
    )
    print("Run part_2.py to fetch ADA balances.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
