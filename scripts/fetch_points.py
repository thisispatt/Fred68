#!/usr/bin/env python3
"""
Fetch F1 Fantasy points for all completed race rounds and write to public/points.json.

Usage:
    python scripts/fetch_points.py               # normal run
    python scripts/fetch_points.py --discover    # dump raw API responses, exit without writing

Required env vars (set as GitHub Actions secrets):
    F1_EMAIL      your F1 account email
    F1_PASSWORD   your F1 account password

Run --discover first after any auth change to verify field names haven't moved.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────

SEASON = 2026
FANTASY_BASE = f"https://fantasy-api.formula1.com/partner_games/f1/{SEASON}"
AUTH_URL = "https://account.formula1.com/api/login"
POINTS_FILE = Path(__file__).parent.parent / "public" / "points.json"
TIMEOUT = 30

# ── Code mappings ─────────────────────────────────────────────────────────────
# Keys are lowercased values from the API (last_name / display_name / short_name).
# Run --discover to see what identifier the API actually uses, then adjust keys.

DRIVER_CODES = {
    "russell":    "RUS",
    "antonelli":  "ANT",
    "leclerc":    "LEC",
    "hamilton":   "HAM",
    "norris":     "NOR",
    "piastri":    "PIA",
    "verstappen": "VER",
    "hadjar":     "HAD",
    "alonso":     "ALO",
    "stroll":     "STR",
    "gasly":      "GAS",
    "colapinto":  "COL",
    "lawson":     "LAW",
    "lindblad":   "LIN",
    "ocon":       "OCO",
    "bearman":    "BEA",
    "albon":      "ALB",
    "sainz":      "SAI",
    "hulkenberg": "HUL",
    "bortoleto":  "BOR",
    "perez":      "PER",
    "bottas":     "BOT",
}

CONSTRUCTOR_CODES = {
    "mercedes":             "MER",
    "ferrari":              "FER",
    "mclaren":              "MCL",
    "red bull racing":      "RBR",
    "red bull":             "RBR",
    "aston martin":         "AST",
    "alpine":               "ALP",
    "racing bulls":         "RBA",
    "visa cash app rb":     "RBA",
    "haas":                 "HAA",
    "haas f1 team":         "HAA",
    "williams":             "WIL",
    "audi":                 "AUD",
    "cadillac":             "CAD",
    "cadillac andretti":    "CAD",
}

# ── Auth ──────────────────────────────────────────────────────────────────────

def login(email: str, password: str) -> str:
    """POST credentials, return Bearer token for Fantasy API calls."""
    try:
        resp = requests.post(
            AUTH_URL,
            json={"Login": email, "Password": password},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except requests.HTTPError as e:
        _die(f"Login failed — HTTP {e.response.status_code}: {e.response.text[:400]}")
    except requests.RequestException as e:
        _die(f"Login request error: {e}")

    data = resp.json()

    # Try every plausible token field in the response
    token = (
        data.get("data", {}).get("subscriptionToken")
        or data.get("data", {}).get("token")
        or data.get("data", {}).get("access_token")
        or data.get("subscriptionToken")
        or data.get("token")
        or data.get("access_token")
    )
    if not token:
        _die(
            "Could not find a token in the login response.\n"
            "Full response:\n" + json.dumps(data, indent=2)
        )
    return token

# ── API helpers ───────────────────────────────────────────────────────────────

def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

def _get(path: str, token: str, params: dict = None) -> dict:
    url = f"{FANTASY_BASE}/{path}"
    try:
        resp = requests.get(url, headers=_headers(token), params=params or {}, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError as e:
        raise requests.HTTPError(e.response.status_code, response=e.response)
    except requests.RequestException as e:
        _die(f"Request failed for {url}: {e}")

def get_game_periods(token: str) -> list:
    data = _get("game_periods", token)
    periods = data.get("game_periods") or data.get("periods") or data.get("data") or []
    if not isinstance(periods, list):
        _die(
            "Unexpected game_periods response shape.\n"
            "Run --discover to inspect the raw response."
        )
    return periods

def get_live_stats(token: str, period_id) -> dict:
    return _get("live_stats", token, params={"game_period_id": period_id})

# ── Points extraction ─────────────────────────────────────────────────────────

def _lookup_name(entry: dict) -> str:
    """Extract the best name candidate from a stats entry."""
    return (
        entry.get("last_name")
        or entry.get("display_name")
        or entry.get("short_name")
        or entry.get("name")
        or ""
    ).strip()

def _lookup_pts(entry: dict) -> int:
    raw = (
        entry.get("score")
        or entry.get("total_points")
        or entry.get("points")
        or entry.get("fantasy_points")
        or 0
    )
    return int(raw)

def _is_constructor(entry: dict) -> bool:
    return (
        entry.get("is_constructor") is True
        or entry.get("type") in ("constructor", "team")
        or entry.get("player_type") in ("constructor", "team")
    )

def extract_round_points(stats_data: dict) -> tuple:
    """Return (drivers: dict, constructors: dict) from a live_stats response."""
    entries = (
        stats_data.get("players")
        or stats_data.get("stats")
        or stats_data.get("data", {}).get("players")
        or []
    )
    if not entries:
        return {}, {}

    drivers = {}
    constructors = {}
    for entry in entries:
        name = _lookup_name(entry)
        if not name:
            continue
        pts = _lookup_pts(entry)
        key = name.lower()

        if _is_constructor(entry):
            code = CONSTRUCTOR_CODES.get(key)
            if code is None:
                _die(f"Unmapped constructor: '{name}' — add to CONSTRUCTOR_CODES")
            constructors[code] = pts
        else:
            code = DRIVER_CODES.get(key)
            if code is None:
                _die(f"Unmapped driver: '{name}' — add to DRIVER_CODES")
            drivers[code] = pts

    return drivers, constructors

# ── Discover mode ─────────────────────────────────────────────────────────────

def discover(token: str) -> None:
    print("=" * 60)
    print("DISCOVER: game_periods")
    print("=" * 60)
    periods_raw = _get("game_periods", token)
    print(json.dumps(periods_raw, indent=2))

    periods = periods_raw.get("game_periods") or periods_raw.get("periods") or periods_raw.get("data") or []
    if periods and isinstance(periods, list):
        first = periods[0]
        pid = first.get("id") or first.get("game_period_id")
        print(f"\n{'=' * 60}")
        print(f"DISCOVER: live_stats?game_period_id={pid}  (first period)")
        print("=" * 60)
        stats = _get("live_stats", token, params={"game_period_id": pid})
        print(json.dumps(stats, indent=2))
    else:
        print("\n[WARN] Could not find a period list — also checking players endpoint")
        print("=" * 60)
        print("DISCOVER: players")
        print("=" * 60)
        print(json.dumps(_get("players", token), indent=2))

# ── File I/O ──────────────────────────────────────────────────────────────────

def load_existing() -> dict:
    if POINTS_FILE.exists():
        try:
            return json.loads(POINTS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"season": SEASON, "lastUpdated": "", "races": {}}

def save(data: dict) -> None:
    POINTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    POINTS_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

# ── Utilities ─────────────────────────────────────────────────────────────────

def _die(msg: str) -> None:
    print(f"[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)

# ── Main ──────────────────────────────────────────────────────────────────────

COMPLETED_STATUSES = {"completed", "finished", "scored", "locked", "results_confirmed"}

def main() -> None:
    discover_mode = "--discover" in sys.argv

    email = os.environ.get("F1_EMAIL", "").strip()
    password = os.environ.get("F1_PASSWORD", "").strip()
    if not email or not password:
        _die("Set F1_EMAIL and F1_PASSWORD environment variables.")

    print(f"Logging in as {email} ...")
    token = login(email, password)
    print("Login OK.")

    if discover_mode:
        discover(token)
        return

    print("Fetching game periods ...")
    periods = get_game_periods(token)
    if not periods:
        _die("API returned no game periods — cannot continue.")

    existing = load_existing()
    races = existing.get("races", {})
    updated = 0

    for period in periods:
        pid = period.get("id") or period.get("game_period_id")
        round_num = str(
            period.get("game_period_number")
            or period.get("round")
            or period.get("race_number")
            or pid
        )
        race_name = (
            period.get("race_name")
            or period.get("name")
            or period.get("label")
            or f"Round {round_num}"
        )
        status = str(period.get("status") or "").lower()

        # Only process rounds with confirmed scores; skip future/live rounds
        if status and status not in COMPLETED_STATUSES:
            print(f"  [SKIP] Round {round_num} ({race_name}) — status: '{status}'")
            continue

        print(f"  Round {round_num}: {race_name} (period_id={pid}) ...")
        try:
            stats_data = get_live_stats(token, pid)
        except requests.HTTPError as e:
            print(f"  [WARN] HTTP {e.args[0]} for period {pid} — skipping", file=sys.stderr)
            continue

        drivers_pts, constructors_pts = extract_round_points(stats_data)

        if not drivers_pts and not constructors_pts:
            print(f"  [SKIP] No scoreable data for round {round_num}")
            continue

        races[round_num] = {
            "name": race_name,
            "drivers": drivers_pts,
            "constructors": constructors_pts,
        }
        updated += 1
        print(f"  OK — {len(drivers_pts)} drivers, {len(constructors_pts)} constructors")

    existing["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    existing["races"] = races
    save(existing)
    print(f"\nDone. {updated} round(s) written to {POINTS_FILE}")


if __name__ == "__main__":
    main()
