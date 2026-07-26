# How the Getty Grant Data Is Prepared — Decisions & Reasons

This document explains, in plain language, every deliberate decision we make when
turning Getty's raw grant records into the numbers, maps, and charts you see on the
site. It is meant to be readable by anyone — you do not need to know the data or the
code. If a number on the site ever looks surprising, the reason is almost certainly
explained here.

*Last updated: 26 July 2026.*

---

## Where the data comes from and how it stays current

**One trustworthy source, refreshed every week.** Every grant comes from Getty's own
public grants database. Each week an automated job checks for new grants,
adds only what is new, removes any grant Getty has taken down, runs a series of safety
checks, and publishes the update only if everything passes. If anything looks wrong, it
stops and emails us instead of publishing bad data.

**We keep amounts matched to Getty, and protect our own corrections.** Each month we refresh
the dollar amount of every grant to match Getty's current figure. This catches grants Getty
re-values (for example, a euro- or rupee-denominated grant recalculated at a new exchange rate)
or corrects after the fact. Every *other* detail of a grant we've already recorded is left
untouched, so hand-checked fixes to any field besides the amount are preserved. *(Why this
exists: before July 2026 the monthly update never re-read an existing grant at all. That was
meant to protect our corrections, but it also let 14 grants drift $73,674 below Getty's own
published total before we reconciled them and added the automatic amount refresh.)*

**Grants Getty removes, we remove too — but with a brake.** If Getty deletes grants from
their database, we mirror that. As a safeguard, if an update would delete more than a small
share of our records (more than 50 grants, or 5% of the total) while adding nothing new, we
treat that as a likely glitch and cancel the update rather than risk erasing good data.

**Ten grants show no dollar amount.** For ten old grants, Getty's records list no amount and
we cannot recover it. We keep them so the grant *count* stays accurate, but they add nothing
to any *dollar* total, and they show a dash ("—") instead of a figure.

**The current year is always marked "in progress."** The most recent year is never complete,
so the site labels it as partial (for example, "2026 data is partial"). This label moves
forward automatically each year.

---

## Where grants appear on the map

**We map to where the work happened, not the head office.** A grant is placed on the map by
its project location. Only when a grant lists no project location do we fall back to the
grantee's own country. A tiny number of grants (two) have neither and can't be mapped.

**A grant that serves several countries appears in each of them.** Some grants fund work in
more than one country — say, a project spanning Italy, Greece, and Turkey. That grant shows up
as a point in all three, because it genuinely supports all three.

**★ A grant's money is now split evenly among the countries it serves (added July 2026).**
Previously, a grant that funded work in three countries had its *full* amount counted in each
of those three countries. That meant a single $30,000 grant was tallied as $30,000 in Italy,
$30,000 in Greece, and $30,000 in Turkey — so it looked like $90,000 had been spent when only
$30,000 was awarded. Added up across every country, this overstated Getty's giving by roughly
$98 million.

We fixed this. A grant's amount is now divided evenly across the countries it serves: that
$30,000 grant counts as $10,000 in each of the three countries. As a result, the country totals
on the map now add up to Getty's true total giving instead of an inflated figure. To keep this
honest and clear, each grant listed in a country's detail panel shows a note when it is shared —
for example: "$10,000 of this $30,000 grant, split evenly across 3 countries. Also serves:
Greece, Turkey." The headline "Total Granted" figure at the top of the site is unchanged, because
it was always counting each grant's full amount exactly once.

*(Note: grants under the "Pacific Standard Time: LA/LA" initiative are handled first by the rule
below, which places most of them in Los Angeles only; the split then applies to whatever countries
remain.)*

**"Pacific Standard Time: LA/LA" grants are placed in Los Angeles.** This initiative funded
exhibitions *about* Latin American art, and Getty's records list those subject countries (Mexico,
Brazil, and others) as the grants' locations. But the exhibitions themselves took place in Los
Angeles, so we map these grants to LA rather than scattering them across Latin America.
**★ Three grants are exceptions (added April 2026):** three PST grants really did fund work abroad,
so they keep their original locations. The later **"PST ART: Art & Science Collide"** initiative is
handled the same way, and for the same reason.

**The four parts of the United Kingdom are combined.** Getty's records sometimes say "England,"
"Scotland," "Wales," or "Northern Ireland." Since the map colors whole countries, we combine these
into "United Kingdom." Los Angeles is the only city the source data pinpoints; everything else is
placed at the country level.

---

## Telling grants to individuals apart from grants to organizations

**Why we separate the two.** People (interns, fellows, visiting scholars) receive about two-thirds
of all grants but only about one-fifth of the dollars. Mixing them with big institutional grants
hides both stories. A toggle on the site — "Organizational grants only" — lets you set the personal
grants aside and see institutional giving on its own.

**How we decide.** Getty's data doesn't flag which grants went to a person, so we infer it from the
grantee's name using a few clear signals: some programs (internships, fellowships, residencies) only
ever fund individuals; a name beginning with a title like "Dr." or "Ms." is a person; and in three
specific programs — Central and Eastern European Initiative, Research Grants (Team and Individual), and
Publications — we look at whether the grantee's name is a person's name or an institution's. A few
programs whose names *sound* personal but actually fund organizations (for example, a program that pays
for a staff position at a museum) are deliberately kept on the organization side.

**★ How we tell a person's name from an institution's (updated July 2026).** For those three
name-classified programs, a grantee counts as an individual only if the name looks like a person: after
setting aside any leading title ("Dr.", "Prof.", "Assoc.", and so on), the name is two to four words of
ordinary name characters and contains none of our organization keywords (words like "university",
"museum", "foundation", "press", "verlag", "academie", "collection" and many more, across several
languages). Two fixes in July 2026 made this reliable:

- We removed an old shortcut that treated any Central and Eastern European Initiative grant of exactly
  $5,000 or $10,000 as an individual. Award size is not a trustworthy signal — that shortcut wrongly
  counted organizations that happened to receive a $5,000 or $10,000 grant (such as "The Fund for Arts and
  Culture in Central and Eastern Europe") as people. Classification now rests on the name alone.
- We added "Publications" to the name-classified programs and broadened the organization keyword list to
  recognize non-English institutions and publishers. This moved 23 grants made to named scholars (to write
  or publish a book) from the organization side to the individual side, where they belong, while correctly
  leaving presses, museums, universities, and learned societies as organizations.

These rules are encoded in `src/lib/classification.ts` and mirrored in `scripts/getty_logic.py`; the public
methodology page shows the exact lists behind an expandable "Show the exact rule" panel so reviewers who
know the data can check and dispute them.

**One tricky edge case, on purpose.** "Mississippi University for Women Foundation" begins with the
letters "Miss," which could be mistaken for the title "Miss." We specifically prevent that
misclassification — it's a known trap, and there's an automated test guarding against it.

**Grouping initiatives as current or past.** In the initiative picker, programs are grouped into
"Current," "Past," and "Other." Rather than maintaining that grouping by hand (which quietly falls out
of date when Getty adds a program), we now read it straight from Getty's own records: a program marked
current is grouped as current, one marked past (or flagged as a past initiative) as past, and anything
unmarked as other. When we switched to this automatic method it reproduced the old hand-kept list exactly
and additionally caught one newly added program the manual list had missed.

---

## Optional toggles that change the dollars

**Adjusting for inflation.** The "Adjust dollars for inflation" toggle restates every grant in
2025 dollars using the U.S. Bureau of Labor Statistics' Consumer Price Index (CPI-U, annual
averages). A grant awarded in year Y is multiplied by CPI(2025) / CPI(Y) — so a $100,000 grant
from 1990 shows as roughly $246,000 in today's dollars. 2025 is the most recent complete annual
CPI release; grants from the current, still-open year are treated as already in reference-year
dollars (a factor of 1), which slightly understates their real value, and each chart says so.
When the toggle is on, headline totals, country totals, and every dollar chart use adjusted
amounts; grant *counts* and the grant-size distribution stay nominal.

**Excluding the United States.** The "Exclude U.S. grants" toggle removes the U.S. from the map
and subtracts only the U.S. *share* of each grant from the totals — consistent with the even
split described above. A grant that funds work only in the U.S. is dropped entirely; a
cross-border grant that includes the U.S. stays on the map for its other countries and
contributes its non-U.S. share to the totals (for example, a $290,250 grant serving five
countries including the U.S. keeps $232,200 — four fifths). Grants that never touch the U.S.
are unaffected.

## How the numbers and colors are shown

**Two sets of books, one rule.** We keep the master list of grants (one row per grant) separate from
the map placements (one row per country a grant touches). All dollar totals come from the master list
so grants are never accidentally counted twice — with the single, deliberate exception of the
country-by-country split described above, which divides rather than duplicates.

**The grantee count comes straight from Getty.** Getty publishes a headline of 5,354 distinct grantees.
This number cannot be reproduced from grant-level records — not even from Getty's own: deduplicating the
grantee names in their API by name or by sort-name yields ~5,401, the same as ours (our sort-name count
matches theirs to the record). Getty's 5,354 comes from an internal grantee registry — a per-entity ID
that is not exposed in the grants feed — so no amount of studying the grants can recover it, and fuzzy
name-merging would only guess (most similar names are genuinely different people). Rather than approximate,
the site reads Getty's official grantee total directly from their API and shows that as the headline, so it
always matches the source — exactly as Getty's own site does. Per-country grantee tallies are computed from
the grant records (by canonical sort-name) and are approximate in the same way Getty's own grant-level data is.

**The map's shading uses equal-count colour classes.** Giving is extremely concentrated (the U.S.,
then a steep drop), so a plain or even logarithmic scale collapses every other country into one shade.
Instead we sort countries into six equal-count classes (a quantile scale): each shade holds the same
number of countries, so the largest recipients occupy the brightest class on their own while smaller
recipients stay distinguishable. The classes are recomputed over whatever is on the map, so excluding
the U.S. re-spreads the scale and the next tier of leaders stands out. Colours run dim to bright
(brighter = more) on the dark map background; dollar amounts use an amber ramp and counts/other measures
a blue ramp, both colour-vision-safe and monotonic in luminance.

**Some program names contain hidden formatting.** A few of Getty's program names include leftover web
formatting (for instance, italics markup around part of the name). We remove that so names read cleanly
wherever they appear.

---

*This document is kept next to the data itself so any figure on the site can be traced back to the
decision behind it.*
