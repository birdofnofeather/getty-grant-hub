# Getty Grant Hub — Change Log

This document records the rebuild executed July 2026 against the recommendations
report. Each module is independent; skipped modules are listed at the end.

## Pre-change baselines (M0)

Captured before any change, from the CSVs on `main`:

| Metric | Value |
|---|---|
| Build | success — JS bundle 889.22 kB (gzip 269.98 kB), dist 9.2 MB |
| Lint | 4 pre-existing errors, 7 warnings (all in shadcn/ui + tailwind.config boilerplate) |
| Tests | 1 placeholder test passing |
| Total grants / USD | 9,971 / $580,893,794 |
| Individual / Org | 6,566 ($109,094,451) / 3,405 ($471,799,343) |
| Countries mapped (post-PST-override) | 127 |
| **Country USD totals — CURRENT (full amount, double-counted)** | **sum = $679,008,764** |
| **Country USD totals — NEW (proportional split)** | **sum = $580,847,094** (≈ total of mapped grants) |
| Multi-country grants (post-override) | 571 |
| Partial year (2026) | 197 grants |

Baseline script: `scripts/derive_baselines.py` → `scripts/baselines.json` (regenerate any time).

| Module | Date | Status | Files | Eval |
|---|---|---|---|---|
| M0 | 2026-07-17 | done | CHANGES.md, scripts/getty_logic.py, scripts/derive_baselines.py, scripts/baselines.json | baselines computed, build OK |
