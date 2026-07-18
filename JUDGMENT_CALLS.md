# How the Getty Grant Data Is Prepared — Decisions & Reasons

This document explains, in plain language, every deliberate decision we make when
turning Getty's raw grant records into the numbers, maps, and charts you see on the
site. It is meant to be readable by anyone — you do not need to know the data or the
code. If a number on the site ever looks surprising, the reason is almost certainly
explained here.

*Last updated: July 2026.*

---

## Where the data comes from and how it stays current

**One trustworthy source, refreshed every month.** Every grant comes from Getty's own
public grants database. On the 5th of each month an automated job checks for new grants,
adds only what is new, removes any grant Getty has taken down, runs a series of safety
checks, and publishes the update only if everything passes. If anything looks wrong, it
stops and emails us instead of publishing bad data.

**We don't overwrite our own corrections.** Once a grant is in our data, the monthly
update won't quietly change it. This protects any hand-checked fixes from being undone by
a stale value upstream.

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
so they keep their original locations.

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

**How we decide.** Getty's data doesn't flag which grants went to a person, so we infer it using a
few clear signals: some programs (internships, fellowships, residencies) only ever fund individuals;
a name beginning with a title like "Dr." or "Ms." is a person; and in a couple of specific programs
we recognize individuals by their grant size or by names that look like people rather than
institutions. A few programs whose names *sound* personal but actually fund organizations (for
example, a program that pays for a staff position at a museum) are deliberately kept on the
organization side.

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

## How the numbers and colors are shown

**Two sets of books, one rule.** We keep the master list of grants (one row per grant) separate from
the map placements (one row per country a grant touches). All dollar totals come from the master list
so grants are never accidentally counted twice — with the single, deliberate exception of the
country-by-country split described above, which divides rather than duplicates.

**The map's shading uses a color scale built for clarity.** Because the United States receives far
more than anywhere else, a plain scale would make every other country look identical. So the shading
uses a compressed (logarithmic) scale, and the U.S. is capped at the level of the next-highest country
so it doesn't wash everything else out. Colors run from dim to bright, with brighter meaning more, on
the site's dark map background. Dollar amounts use an amber scale; counts and other measures use a blue
scale, so you can tell at a glance which measure you're looking at.

**Some program names contain hidden formatting.** A few of Getty's program names include leftover web
formatting (for instance, italics markup around part of the name). We remove that so names read cleanly
wherever they appear.

---

*This document is kept next to the data itself so any figure on the site can be traced back to the
decision behind it.*
