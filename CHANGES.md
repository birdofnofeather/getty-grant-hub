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
| SPLIT | 2026-07-18 | done | src/hooks/use-grant-data.ts, src/components/CountryDetailPanel.tsx, src/pages/Index.tsx, JUDGMENT_CALLS.md | country totals now sum to $580.8M (was $679M double-counted); grant cards show split disclaimer |
| COLORS | 2026-07-18 | done | src/components/WorldMap.tsx | ramps reversed to dim→bright (brighter=more on dark bg), HCL interpolation, green dropped → 2 CVD-safe families; luminance monotonic verified |

## Colour scheme review (decision)

**Finding:** the old ramps ran pale→vivid, i.e. HIGH luminance at LOW values. On the dark
map canvas this made low-value countries brighter than high-value ones, and the highest-value
countries (US, UK) barely cleared the background (contrast 2.89:1). Interpolation was in sRGB
(muddy midtones), and there were three hue families including green (weakest for colour-vision
deficiency).

**Change:** ramps now run dim→bright so the biggest funders visually pop; interpolation is in
HCL for perceptually even steps (verified monotonic in luminance); two families only — blue for
counts/measures, amber for dollars. Low ends still clear the grey "no-grant" hatch by both
luminance and hue, so funded vs. unfunded countries stay distinct. Logic recorded in
JUDGMENT_CALLS.md.
| M1 | 2026-07-18 | done | index.html, src/pages/Index.tsx, src/lib/site-config.ts, src/hooks/use-grant-data.ts, src/lib/grant-types.ts | 0 Lovable refs; real title/meta/OG; header subtitle; provenance footer w/ last-update date + Methodology link |
| M3 | 2026-07-18 | done | src/lib/grant-types.ts, src/components/WorldMap.tsx | default choropleth = Grant Count; zoom in/out/reset; keyboard focus + Enter/Space + aria-labels on countries |
| M5 | 2026-07-18 | done | src/components/DataDashboard.tsx, src/lib/dashboard-data.ts | new People-vs-Orgs chart (first); Top Countries excludes US w/ annotation; single-metric Top Initiatives toggle; avg-size ≥10 grants; partial-year shading; extracted testable data-prep |
| M6 | 2026-07-18 | done | src/pages/Methodology.tsx, src/App.tsx, src/components/FilterDrawer.tsx | /methodology route (plain-language, 6 sections incl. limits); footer + org-toggle info-icon links |
| M2 | 2026-07-18 | done | scripts/build_aggregates.py, scripts/getty_logic.py, clean_getty_grants.py, update_getty_grants.py, getty_grants_agg.json (+public), src/hooks/use-grant-data.ts, src/lib/grant-types.ts, src/components/FilterDrawer.tsx, src/pages/Index.tsx | 18KB agg JSON vs 8MB CSV; instant map+headline; lazy CSV; advanced controls disabled + "Loading full data" until ready |
| M7 (1–2) | 2026-07-18 | done | src/lib/url-state.ts, src/pages/Index.tsx | filters+view serialize to URL (?y/org/m/init/min/mincount/view), parse+validate on load, replaceState on change; Copy link button. Parts 3 (CSV export) & 4 (PNG export) intentionally omitted per request. |
| M8 | 2026-07-18 | done | src/components/CountryDetailPanel.tsx, src/lib/grant-types.ts, src/hooks/use-grant-data.ts | Grants/Grantees tabs (grantee totals use split shares → sum to country total); external links where projectTitleURL present. Country CSV download omitted for consistency with M7 export exclusion. |
| M9 | 2026-07-18 | done | src/components/WorldMap.tsx, src/components/CountryDetailPanel.tsx, src/pages/Index.tsx, src/components/FilterDrawer.tsx | mobile map 60vh, tap-to-tooltip then tap-to-open, bottom-sheet panel, stacked headline cards, taller drawers, 40px touch targets |
