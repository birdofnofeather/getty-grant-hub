"""
Getty Foundation Grants Database — Full Pull
=============================================
Fetches every grant record from the Getty grants search API and writes
a flat CSV file with all per-grant fields.

Requirements:
    pip install requests

Usage:
    python getty_grants_pull.py

Output:
    getty_grants.csv  (in the same directory as this script)
"""

import csv
import time
import sys
import requests

API_BASE = "https://www.getty.edu/funding/grants-database/api/search"
PAGE_SIZE = 100          # max stable page size; reduce to 50 if you get timeouts
OUTPUT_FILE = "getty_grants.csv"
PAUSE_BETWEEN_REQUESTS = 0.5   # seconds — be polite to their server

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; grants-research-script/1.0)",
    "Accept": "application/json",
    "Referer": "https://www.getty.edu/funding/grants-database/search",
}

# ── Field extractor ──────────────────────────────────────────────────────────

def flatten_grant(g: dict) -> dict:
    """Flatten a nested grant record into a single-level dict for CSV."""
    amount = g.get("amountAwarded") or {}
    grantee = g.get("grantee") or {}

    # projectLocations is a list; collect all unique countries
    proj_locs = g.get("projectLocations") or []
    loc_countries = "; ".join(
        loc.get("location", {}).get("country", "")
        for loc in proj_locs
        if loc.get("location", {}).get("country")
    )

    return {
        "grantId":              g.get("grantId", ""),
        "grantAwardDate":       g.get("grantAwardDate", ""),
        "grantAwardYear":       g.get("grantAwardYear", ""),
        "fiscalYear":           g.get("fiscalYear", ""),
        "amountAwarded_currency": amount.get("currency", ""),
        "amountAwarded_USD":    amount.get("amountUSD", ""),
        "projectTitle":         g.get("projectTitle", ""),
        "projectTitleURL":      g.get("projectTitleURL", ""),
        "publicInitiative":     g.get("publicInitiative", ""),
        "initiative":           g.get("initiative", ""),
        "internalInitiative":   g.get("internalInitiative", ""),
        "initiativeType":       g.get("initiativeType", ""),
        "initiativeURL":        g.get("initiativeURL", ""),
        "pastInitiative":       g.get("pastInitiative", ""),
        "grantee_name":         grantee.get("name", ""),
        "grantee_acronym":      grantee.get("acronym", ""),
        "grantee_sortName":     grantee.get("sortName", ""),
        "grantee_city":         grantee.get("city", ""),
        "grantee_country":      grantee.get("country", ""),
        "projectLocation_countries": loc_countries,
    }

# ── Fetch helpers ─────────────────────────────────────────────────────────────

def fetch_page(from_: int, size: int = PAGE_SIZE) -> dict:
    params = {"from": from_, "size": size, "q": ""}
    resp = requests.get(API_BASE, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()

def fetch_total() -> int:
    data = fetch_page(0, 1)
    return data["total"]

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Checking total record count…")
    try:
        total = fetch_total()
    except Exception as e:
        print(f"ERROR: Could not reach the API — {e}")
        sys.exit(1)

    print(f"Total grants to fetch: {total:,}")

    all_records = []
    fetched = 0

    while fetched < total:
        try:
            data = fetch_page(fetched, PAGE_SIZE)
        except Exception as e:
            print(f"\nERROR on page starting at {fetched}: {e}")
            print("Retrying in 5 seconds…")
            time.sleep(5)
            data = fetch_page(fetched, PAGE_SIZE)

        batch = data.get("data", [])
        if not batch:
            break

        all_records.extend(flatten_grant(g) for g in batch)
        fetched += len(batch)

        pct = fetched / total * 100
        print(f"  Fetched {fetched:,} / {total:,}  ({pct:.1f}%)", end="\r", flush=True)
        time.sleep(PAUSE_BETWEEN_REQUESTS)

    print(f"\nDone — {len(all_records):,} records collected.")

    if not all_records:
        print("No records returned. Exiting.")
        sys.exit(1)

    fieldnames = list(all_records[0].keys())

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_records)

    print(f"CSV written → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
