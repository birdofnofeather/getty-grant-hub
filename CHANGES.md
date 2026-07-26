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
| M10 | 2026-07-18 | done | src/lib/__tests__/*, src/lib/map-colors.ts, e2e/smoke.spec.ts, .github/workflows/ci.yml, playwright.config.ts | 27 vitest tests vs real data (classification/PST/colors/dashboard/url-state); negative "Miss " test proven to fail then reverted; Playwright smoke + CI (Playwright runs in CI — sandbox couldn't download browsers) |
| M11 | 2026-07-18 | done | src/hooks/use-grant-data.ts, src/lib/grant-types.ts, src/components/FilterDrawer.tsx, src/pages/Index.tsx, .github/workflows/update_getty_grants.yml, update_getty_grants.py | initiative grouping derived from initiativeType/pastInitiative (reproduces old Past 18/18, adds newly-detected "Building Networks" to Current — old hardcoded list had missed it); workflow copies CSVs+JSON to public/; updater prints NEW INITIATIVES |
| M12 | 2026-07-18 | done | public/sitemap.xml, public/robots.txt | sitemap (/ + /methodology), robots Sitemap line; Vite emits hashed assets (verified) |

## Hosting posture (M12 decision)

Lovable hosting retained. Data is served from GitHub raw (main → master → bundled `/public` fallback);
the tiny `getty_grants_agg.json` gives instant first paint and the full CSVs load lazily. A custom domain
(Lovable → Settings → Domains) is left to the owner; no functional change requires leaving Lovable.

## Modules NOT executed (per request)

- **M4 (Insight strip):** excluded by the owner.
- **M7 parts 3 & 4 (filtered-CSV download, map-PNG export):** excluded by the owner. Parts 1–2 (URL state + Copy link) done.
- **M8 country-CSV download:** omitted for consistency with the M7 export exclusion (grantee tab + external links done). Trivial to add later if wanted.

---

## Data reconciliation & monthly amount auto-refresh (2026-07-26)

**What changed.** Added an amount-refresh step to `update_getty_grants.py`, and ran a
one-time reconciliation that corrected 14 stale grant amounts. Our headline total now
equals Getty's live figure exactly: **$580,967,468** (was $580,893,794).

**Why — the drift.** Our stored "Awarded" total was **$73,674 lower** than Getty's own
grants database. The grant *set* was identical (9,971 IDs, none added or removed), so the
gap was entirely down to **amounts**: 14 grants whose value Getty had revised after we first
pulled them. Root cause is a design choice in the monthly updater — it only fetched full
records for **brand-new** grant IDs and never re-read grants already in our database (the
"we don't overwrite our own corrections" rule). So any amount Getty revised on an existing
grant never reached us.

**Timing that confirms it.** Getty last updated their database **2026-05-12** (index
`gettygrants_2026-05-12`); we last pulled **2026-06-05** (automated job) with a manual
edit **2026-06-24**. Our June pull ran *after* Getty's May revision, so we *could* have
caught these — but because the 14 grants were already in our DB, the new-IDs-only logic
skipped them. The 2026-07-05 job found no genuinely new grants and committed nothing,
leaving the 14 stale.

**The 14 grants, two flavours:**
- **10 foreign-currency re-valuations** (€, ₹) — e.g. a €735,000 fellowship (`202568912`)
  moved from $841,060 to $866,124 as Getty updated its exchange conversion.
- **4 USD corrections** — recent internships Getty adjusted down, e.g. `202565937`
  $49,000 → $35,030, `202566293` $49,000 → $36,892, `202463185` $51,450 → $42,550,
  `202672350` $54,000 → $48,750.

**The fix (code).** `update_getty_grants.py`:
- The API sweep now also captures each grant's current `amountUSD` + currency string
  (no extra requests — same pages already fetched to list IDs).
- New `refresh_amounts()` updates `amountAwarded_USD` and the original-currency string for
  any existing grant whose amount Getty has revised. It **only touches grants still present
  in Getty's API** (never re-adds a pruned or hand-removed grant) and **only changes the two
  amount fields** — every other column is left as-is.
- The updater no longer early-returns when the ID set is unchanged; it runs the refresh
  first, and only reports "already up to date" when IDs *and* amounts both match. Every
  refreshed grant and the net dollar delta are printed; row-count validation is unaffected
  (refresh never changes row counts).
- Result: going forward the monthly job keeps our amounts matched to Getty automatically.
  (This deliberately relaxes the old "never touch existing records" rule for the amount
  field only. There are currently no hand-corrected amounts to protect; the one manual edit
  on record — the 2026-06-24 deletion of 17 grants Getty had also dropped — is a row removal,
  not an amount edit, and the refresh cannot resurrect it.)

**Files rebuilt.** `getty_grants_clean.csv`, `getty_grants_map.csv`, `getty_grants_agg.json`
(+ `public/` copies). Regenerated `scripts/baselines.json`, which was itself stale from the
2026-06-24 manual deletion — its informational fields corrected alongside the new totals
(`multi_country_grants` 571→569, `us_grants` 8487→8488; the amount refresh changed **zero**
locations, verified: map grant/country pairs are identical before and after). All 27 vitest
tests pass.

**Known item, not changed here.** Getty reports **5,354 grantees**; we count **5,406**
distinct grantee-name strings. This is a name-vs-entity counting difference (name variants,
acronyms), not a data error — logged for a future reconciliation if wanted.

---

## Individual-vs-organizational reclassification (2026-07-26)

**What changed.** Made the individual/organizational split for the three name-classified initiatives
rest on the **grantee's name** rather than any amount shortcut, fixing two classes of error. Headline
grand total is unchanged ($580,967,468); the split moved: **individual 6,566 → 6,588 grants
($109,094,451 → $109,524,937)**, **organizational 3,405 → 3,383**.

**Why & the two fixes.**
1. **CEEI amount shortcut removed.** The old rule tagged any *Central and Eastern European Initiative*
   grant of exactly $5,000 or $10,000 as an individual. Award size isn't a reliable signal — it
   mislabeled organizations that received $5k/$10k grants (e.g. "The Fund for Arts and Culture in Central
   and Eastern Europe") as people. CEEI is now decided purely by name. Net effect: 1 grantee (its grants)
   correctly moves to organizational; no real person is lost.
2. **Publications now name-classified + keyword list expanded.** "Publications" was added to the
   name-scoped initiatives, and the organization-keyword list was broadened to catch non-English
   institutions and publishers (verlag, akademie, universidad, editorial, press, books, collection,
   conference, N.V., S.A., Co., heritage/historic, etc.). This reclassified **23 grants made to named
   scholars** (to write/publish a book) from organization → individual, while correctly leaving presses,
   museums, universities, and learned societies as organizations.

**How we validated it was safe to call "definitive."** For all three initiatives we enumerated every
distinct grantee and checked the name rule against it: Research Grants reproduced the existing split
exactly (185/65, zero changes); CEEI produced exactly one org→correct flip and zero people lost;
Publications produced 23 org→individual flips, every one a real person, and zero real organizations
misclassified. Every name newly caught by an expanded keyword was verified to be a genuine organization.
Changes are fully contained to the three initiatives (zero classification changes anywhere else in the
dataset).

**Mechanics.**
- Name matching now trims leading whitespace and strips leading title tokens (`Dr.`, `Prof.`, `Assoc.`,
  `PhDr.`, …) before the 2–4-word person test, so multi-title academic names (e.g. "Assoc. Prof. PhDr.
  Ladislav Kesner") resolve correctly.
- `src/lib/classification.ts` and `scripts/getty_logic.py` kept in sync; `SCOPED_INITIATIVES`,
  `ORG_KEYWORDS`, and `LEADING_TITLES` exported so the methodology page renders the *actual* lists.

**Docs & tests.** Methodology page gained inline "Show the exact rule" panels (importing the live code
constants, so they can't drift) exposing every classification list, threshold, and ID for expert review;
`JUDGMENT_CALLS.md` classification section rewritten. Regenerated `getty_grants_agg.json` (+public) and
`scripts/baselines.json`. Added classification tests (CEEI org regression, Publications scholar vs.
publisher, keyword-caught orgs, title stripping); full suite 28/28 green; `tsc` and production build pass.

---

## Grantee count, choropleth colour scale, methodology polish (2026-07-26)

**Grantee count now matches the source exactly (headline).** Our data has 5,401–5,406 distinct grantees
(by canonical sort-name / by raw name) versus Getty's official 5,354 — Getty merges grantee entities via
an internal ID not exposed per grant, so ~50 name variants stay split in our rows. Fix: `build_aggregates.py`
now reads Getty's authoritative `stats` (`grantees_total`, `funding_total`) from their API and stores them
in `getty_grants_agg.json` as `source_stats`; the site shows Getty's official grantee total in a new
**Grantees** headline KPI at full scope, and computes distinct grantees (canonical sort-name) for filtered
views. `grantee_sortName` is now parsed client-side. (Reconciliation check: # grants 9,971 = 9,971 ✓;
awarded total $580,967,468 = $580,967,468 ✓; grantees headline = Getty official 5,354 ✓; data-level distinct
grantees remain ~5,401 and cannot be reduced to 5,354 without Getty's entity IDs.)

**Choropleth colour scale reworked for the skewed distribution.** Replaced the continuous log scale +
"cap the US at the second-highest value" hack with **quantile (equal-count) classification** into 6 classes
(`src/lib/map-colors.ts`), computed over the currently-visible countries. Ramps now run dim→bright
(brighter = more, monotonic in luminance) so the top recipients pop on the dark background; amber = dollars,
blue = counts/other. Because classes recompute over what's shown, **excluding the U.S. re-spreads the scale**
and the next tier of leaders stands out — the behaviour that was previously washed out. Legend is now a
discrete class strip. `makeColorScale(values[], metric)` returns `{color, thresholds, ramp}`.

**Methodology page.** Per request, superseded rules no longer appear on the page (history lives here in the
changelog): removed the "Changed July 2026" note from the classification panel. The PST exceptions are now
described by recipient, year, and amount instead of grant IDs (Fundação de Desenvolvimento da Pesquisa —
2015, $245,000; Universidad Nacional de General San Martín — 2015, $240,000; Fundación Espigas — 2015,
$180,000). The shading section and its rule panel now describe the quantile scale; the grantee limitation
bullet reflects the official-count approach.

**Deployment note.** The live site is a Lovable project; there is no deploy workflow in the repo. Pushes to
`main` update the code and Lovable preview, but the published site requires a Publish action in Lovable (or a
GitHub Pages workflow if fully automatic main→live deploys are wanted). All work here is on `main`.

Tests 29/29; `tsc` and production build pass.
