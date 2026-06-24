"""
Getty Foundation Grants — Incremental Update Script
====================================================
Monthly updater. Sweeps all grantIds from the API, finds new ones,
fetches only those full records, cleans them, appends to both CSVs,
and prints a full validation report.

Usage:
    python update_getty_grants.py [clean_csv] [map_csv]
"""

import sys
import time
import datetime
import requests
import pandas as pd
from clean_getty_grants import clean, build_map_table

CLEAN_FILE = sys.argv[1] if len(sys.argv) > 1 else "getty_grants_clean.csv"
MAP_FILE   = sys.argv[2] if len(sys.argv) > 2 else "getty_grants_map.csv"

API_BASE  = "https://www.getty.edu/funding/grants-database/api/search"
SWEEP_SIZE = 1000   # large pages for the ID sweep (fewer requests)
FETCH_SIZE = 100    # normal pages when fetching full records
PAUSE      = 0.5    # seconds between requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; grants-research-script/1.0)",
    "Accept": "application/json",
    "Referer": "https://www.getty.edu/funding/grants-database/search",
}

# Fields we expect in every API record — used for schema validation
EXPECTED_FIELDS = {
    "grantId", "grantAwardDate", "grantAwardYear", "fiscalYear",
    "amountAwarded", "projectTitle", "initiative", "grantee"
}

# ── API helpers ───────────────────────────────────────────────────────────────

def fetch_page(from_: int, size: int) -> dict:
    params = {"from": from_, "size": size, "q": ""}
    resp = requests.get(API_BASE, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def sweep_all_ids() -> tuple[set, int]:
    """
    Fetch every grantId from the API using large pages.
    Returns (set of all IDs, total reported by API).
    This is order-independent — safe regardless of how Getty sorts their data.
    """
    print("  Sweeping API for all current grantIds...")
    first = fetch_page(0, 1)
    total = first["total"]
    print(f"  API reports {total:,} total records.")

    all_ids = set()
    from_ = 0
    while from_ < total:
        data  = fetch_page(from_, SWEEP_SIZE)
        batch = data.get("data", [])
        if not batch:
            break
        for g in batch:
            gid = str(g.get("grantId", "")).strip()
            if gid:
                all_ids.add(gid)
            # Schema check on first record of first page
            if from_ == 0 and g is batch[0]:
                missing = EXPECTED_FIELDS - set(g.keys())
                if missing:
                    print(f"  SCHEMA WARNING: API response missing expected fields: {missing}")
                    print(f"  This may mean Getty changed their API. Review before proceeding.")
        from_ += len(batch)
        print(f"    Swept {min(from_, total):,} / {total:,}", end="\r", flush=True)
        time.sleep(PAUSE)

    print(f"\n  Collected {len(all_ids):,} unique grantIds from API.")
    return all_ids, total


def fetch_records_for_ids(target_ids: set, api_total: int) -> list:
    """
    Page through the API and collect full records only for target_ids.
    Stops once all target IDs have been found.
    """
    collected = []
    found_ids = set()
    from_ = 0

    while from_ < api_total and len(found_ids) < len(target_ids):
        data  = fetch_page(from_, FETCH_SIZE)
        batch = data.get("data", [])
        if not batch:
            break
        for g in batch:
            gid = str(g.get("grantId", "")).strip()
            if gid in target_ids and gid not in found_ids:
                collected.append(g)
                found_ids.add(gid)
        from_ += len(batch)
        print(f"    Retrieved {len(found_ids):,} / {len(target_ids):,} new records", end="\r", flush=True)
        time.sleep(PAUSE)

    print()
    not_found = target_ids - found_ids
    if not_found:
        print(f"  WARNING: Could not retrieve records for {len(not_found)} IDs: {not_found}")

    return collected


def flatten_grant(g: dict) -> dict:
    amount    = g.get("amountAwarded") or {}
    grantee   = g.get("grantee") or {}
    proj_locs = g.get("projectLocations") or []
    loc_countries = "; ".join(
        loc.get("location", {}).get("country", "")
        for loc in proj_locs
        if loc.get("location", {}).get("country")
    )
    return {
        "grantId":                str(g.get("grantId", "")),
        "grantAwardDate":         g.get("grantAwardDate", ""),
        "grantAwardYear":         g.get("grantAwardYear", ""),
        "fiscalYear":             g.get("fiscalYear", ""),
        "amountAwarded_currency": amount.get("currency", ""),
        "amountAwarded_USD":      amount.get("amountUSD", ""),
        "projectTitle":           g.get("projectTitle", ""),
        "projectTitleURL":        g.get("projectTitleURL", ""),
        "publicInitiative":       g.get("publicInitiative", ""),
        "initiative":             g.get("initiative", ""),
        "internalInitiative":     g.get("internalInitiative", ""),
        "initiativeType":         g.get("initiativeType", ""),
        "initiativeURL":          g.get("initiativeURL", ""),
        "pastInitiative":         g.get("pastInitiative", ""),
        "grantee_name":           grantee.get("name", ""),
        "grantee_acronym":        grantee.get("acronym", ""),
        "grantee_sortName":       grantee.get("sortName", ""),
        "grantee_city":           grantee.get("city", ""),
        "grantee_country":        grantee.get("country", ""),
        "projectLocation_countries": loc_countries,
    }


# ── Validation helpers ────────────────────────────────────────────────────────

def validate_update(df_before: pd.DataFrame, df_after: pd.DataFrame,
                    new_ids: set) -> bool:
    """
    Run sanity checks after appending new records.
    Returns True if all checks pass, False if something looks wrong.
    Prints a clear report either way.
    """
    ok = True
    print("\n=== VALIDATION REPORT ===")

    # 1. Row count should never decrease
    if len(df_after) < len(df_before):
        print(f"  FAIL: Row count DECREASED ({len(df_before):,} -> {len(df_after):,}). "
              f"Data may have been corrupted. NOT saving.")
        ok = False
    else:
        added = len(df_after) - len(df_before)
        print(f"  PASS: Row count {len(df_before):,} -> {len(df_after):,} (+{added})")

    # 2. No duplicate grantIds
    dupes = df_after['grantId'].duplicated().sum()
    if dupes > 0:
        print(f"  FAIL: {dupes} duplicate grantIds found after update.")
        ok = False
    else:
        print(f"  PASS: No duplicate grantIds.")

    # 3. New records count matches expectation
    if len(new_ids) > 0:
        print(f"  INFO: {len(new_ids)} new grantIds added this run.")
        # Show breakdown of new records
        new_rows = df_after[df_after['grantId'].isin(new_ids)]
        if not new_rows.empty:
            print(f"  INFO: New records by year:")
            for year, count in new_rows['grantAwardYear'].value_counts().sort_index().items():
                print(f"    {year}: {count} grants")
            print(f"  INFO: New records by initiative (top 5):")
            for init, count in new_rows['initiative'].value_counts().head(5).items():
                print(f"    {init}: {count}")

    # 4. Required columns still present
    required = ['grantId', 'grantAwardYear', 'amountAwarded_USD',
                'map_countries_iso2', 'grantee_country_iso2']
    missing_cols = [c for c in required if c not in df_after.columns]
    if missing_cols:
        print(f"  FAIL: Missing required columns: {missing_cols}")
        ok = False
    else:
        print(f"  PASS: All required columns present.")

    if ok:
        print("  OVERALL: All checks passed. Safe to save.")
    else:
        print("  OVERALL: CHECKS FAILED. Files not updated. Review errors above.")

    return ok


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    run_date = datetime.date.today().isoformat()
    print(f"=== Getty Grants Update — {run_date} ===\n")

    # ── Step 1: Load existing database ──
    print(f"[1/6] Loading existing database: {CLEAN_FILE}")
    try:
        df_existing = pd.read_csv(CLEAN_FILE, dtype={"grantId": str})
        known_ids   = set(df_existing["grantId"].astype(str))
        print(f"  {len(df_existing):,} existing records, {len(known_ids):,} known grantIds.")
    except FileNotFoundError:
        print("  No existing database found — will build fresh.")
        df_existing = pd.DataFrame()
        known_ids   = set()

    # ── Step 2: Check last-updated timestamp ──
    print("\n[2/6] Checking Getty API last-updated timestamp...")
    try:
        resp = requests.get(
            "https://www.getty.edu/funding/grants-database/api/last-updated",
            headers=HEADERS, timeout=15
        )
        print(f"  Getty database last updated: {resp.json()}")
    except Exception as e:
        print(f"  Could not fetch timestamp (non-fatal): {e}")

    # ── Step 3: Sweep all IDs ──
    print("\n[3/6] Sweeping API for all grantIds...")
    try:
        api_ids, api_total = sweep_all_ids()
    except Exception as e:
        print(f"  FATAL: Could not reach Getty API: {e}")
        raise SystemExit(1)

    new_ids     = api_ids - known_ids
    removed_ids = known_ids - api_ids
    print(f"  New grantIds not in our database: {len(new_ids):,}")
    print(f"  Stale grantIds (in DB but no longer in API): {len(removed_ids):,}")

    # Safety: refuse to prune if the API appears to have collapsed unexpectedly.
    # Block removals >5% of known records unless there are also new IDs (real refresh).
    if removed_ids and len(removed_ids) > max(50, 0.05 * len(known_ids)) and not new_ids:
        print(f"  FATAL: Would remove {len(removed_ids):,} records (>5% of DB) with no additions.")
        print(f"  This looks like an API anomaly. Aborting without changes.")
        raise SystemExit(1)

    if not new_ids and not removed_ids:
        print("\nDatabase is already up to date. No changes made.")
        return

    # ── Step 4: Fetch full records for new IDs only ──
    if new_ids:
        print(f"\n[4/6] Fetching full records for {len(new_ids):,} new grants...")
        new_raw = fetch_records_for_ids(new_ids, api_total)
        if not new_raw:
            print("  ERROR: No records retrieved. Aborting without changes.")
            raise SystemExit(1)
    else:
        print("\n[4/6] No new grants to fetch.")
        new_raw = []

    # ── Step 5: Clean, prune, and combine ──
    print("\n[5/6] Cleaning new records and pruning stale ones...")

    if removed_ids:
        print(f"  Removing {len(removed_ids):,} stale grantIds from existing data.")
        df_existing = df_existing[~df_existing["grantId"].astype(str).isin(removed_ids)]

    if new_raw:
        df_new_raw   = pd.DataFrame([flatten_grant(g) for g in new_raw])
        df_new_clean = clean(df_new_raw)
        df_combined  = df_new_clean if df_existing.empty else pd.concat([df_existing, df_new_clean], ignore_index=True)
    else:
        df_combined = df_existing.reset_index(drop=True)


    # Re-flag partial year across entire combined dataset
    current_year = datetime.date.today().year
    df_combined['is_partial_year'] = df_combined['grantAwardYear'] == current_year

    # ── Step 6: Validate before saving ──
    print("\n[6/6] Validating...")
    passed = validate_update(df_existing, df_combined, new_ids)

    if not passed:
        raise SystemExit(1)


    # Save both files
    df_combined.to_csv(CLEAN_FILE, index=False)
    print(f"\nSaved {len(df_combined):,} rows -> {CLEAN_FILE}")

    print("Regenerating map table...")
    df_map = build_map_table(df_combined)
    df_map.to_csv(MAP_FILE, index=False)
    print(f"Saved {len(df_map):,} map rows -> {MAP_FILE}")

    print(f"\n=== Update complete: {len(new_ids):,} new grants added on {run_date} ===")


if __name__ == "__main__":
    main()
