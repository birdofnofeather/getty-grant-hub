import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { INDIVIDUAL_INITIATIVES } from '@/lib/grant-types';
import { HONORIFICS, LEADING_TITLES, SCOPED_INITIATIVES, ORG_KEYWORDS, PST_INITIATIVES } from '@/lib/classification';

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-20">
    <h2 className="text-lg font-semibold text-foreground mt-8 mb-2">{title}</h2>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

// Collapsible, understated panel holding the precise rule behind a plain-language claim.
// Aimed at reviewers who know the data and may want to challenge a decision.
const RuleDetail = ({ children }: { children: React.ReactNode }) => (
  <details className="group mt-3 rounded-md border border-border bg-card">
    <summary className="flex cursor-pointer list-none select-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
      <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
      Show the exact rule
    </summary>
    <div className="space-y-2 border-t border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </div>
  </details>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px] text-foreground break-words">{children}</code>
);

const Chips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((s) => <Code key={s}>{s}</Code>)}
  </div>
);

const RuleList = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc space-y-1 pl-4 marker:text-muted-foreground">
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);

const Lead = ({ children }: { children: React.ReactNode }) => (
  <span className="font-medium text-foreground/80">{children}</span>
);

const Methodology = () => (
  <div className="min-h-screen bg-background">
    <header className="px-6 py-4 border-b bg-card">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to the map
        </Link>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">How this data is prepared</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        This page explains, in plain language, the decisions behind the numbers, maps, and charts on this
        site. If a figure ever looks surprising, the reason is almost certainly explained here. You don't
        need to know the underlying data to follow along — but where a decision was a judgment call, a
        <span className="mx-1 inline-flex items-center gap-1 align-middle rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground"><ChevronRight className="h-3 w-3" />Show the exact rule</span>
        panel reveals the precise lists, thresholds, and record IDs used in the code, so those who know the
        data can check and challenge them.
      </p>

      <Section id="source" title="Data source & updates">
        <p>
          Every grant comes from the Getty Foundation's own public grants database. Each week an
          automated job checks for new grants, adds only what is new, removes any grant Getty
          has taken down, and refreshes the dollar amount of existing grants to match Getty's current
          figures (for instance when a grant awarded in another currency is re-valued at a new exchange
          rate). It runs a series of safety checks and publishes only if they all pass — if
          anything looks wrong, it stops rather than publish bad data. The most recent calendar year is
          always marked "partial," because it is still in progress.
        </p>
        <p>
          Ten older grants list no dollar amount in Getty's records, and the amount can't be recovered.
          They are kept so the grant <em>count</em> stays accurate, but they add nothing to any dollar
          total and show a dash ("—").
        </p>
        <RuleDetail>
          <p><Lead>Schedule.</Lead> GitHub Actions, cron <Code>0 9 * * 1</Code> (every Monday, 09:00 UTC); also runnable on demand.</p>
          <p><Lead>Each run.</Lead></p>
          <RuleList items={[
            <>Sweep every <Code>grantId</Code> from Getty's grants-database search API.</>,
            <>Fetch full records only for IDs not already stored, and append them.</>,
            <>Drop any stored grant whose ID Getty no longer lists.</>,
            <>Refresh <Code>amountAwarded_USD</Code> and the currency string for existing grants whose value changed; all other stored fields are left untouched.</>,
          ]} />
          <p><Lead>Safety gates (all must pass, or nothing is committed and the owner is emailed).</Lead></p>
          <RuleList items={[
            <>Abort if removals would exceed <Code>max(50, 5% of stored rows)</Code> while adding nothing new.</>,
            <>Row-count change must equal (added − removed); no duplicate <Code>grantId</Code>s; required columns present.</>,
          ]} />
          <p><Lead>Other.</Lead> Exactly 10 rows have <Code>amountAwarded_USD = 0</Code> (shown "—", counted but never summed). Partial-year flag: <Code>grantAwardYear === current year</Code>. Source: <Code>update_getty_grants.py</Code>.</p>
        </RuleDetail>
      </Section>

      <Section id="individuals" title="What counts as a grant to an individual">
        <p>
          People — interns, fellows, and visiting scholars — receive about two-thirds of all grants but
          only about one-fifth of the dollars. Mixing them with large institutional grants hides both
          stories, so the "Organizational grants only" toggle lets you set the personal grants aside.
        </p>
        <p>
          Getty's data doesn't flag which grants went to a person, so we infer it from clear signals: some
          programs (internships, fellowships, residencies) only ever fund individuals; a name beginning
          with a title such as "Dr." or "Ms." is a person; and in a few specific programs we recognize
          individuals by whether the grantee's name looks like a person rather than an institution. A few
          programs whose names <em>sound</em> personal but actually fund organizations (for example, one
          that pays for a staff position at a museum) are deliberately kept on the organization side.
        </p>
        <RuleDetail>
          <p>A grant is tagged <Lead>individual</Lead> if <em>any</em> signal below fires (otherwise organizational). Logic lives in <Code>src/lib/classification.ts</Code>, mirrored in <Code>scripts/getty_logic.py</Code>. Classification is inferred by us — Getty never states it.</p>
          <p><Lead>1 · Initiative only ever funds individuals</Lead> — one of:</p>
          <Chips items={[...INDIVIDUAL_INITIATIVES]} />
          <p><Lead>2 · Small Summer Institutes grant</Lead> — initiative <Code>Summer Institutes</Code> with amount under <Code>$5,000</Code>.</p>
          <p><Lead>3 · Name begins with an honorific</Lead> (leading spaces ignored) — one of:</p>
          <Chips items={HONORIFICS.map((h) => JSON.stringify(h))} />
          <p>The trailing spaces on <Code>"Professor "</Code> and <Code>"Miss "</Code> are deliberate, so "Mississippi University for Women" is never misread as "Miss." A regression test guards this.</p>
          <p><Lead>4 · Grantee name looks like a person</Lead>, but only in these name-classified initiatives:</p>
          <Chips items={[...SCOPED_INITIATIVES]} />
          <p>"Looks like a person" = does not contain an organization keyword (below); then, after removing any leading title tokens, the name is 2–4 words with no digits and only letters, hyphens, apostrophes, or periods.</p>
          <p>Leading title tokens removed first: <Chips items={[...LEADING_TITLES]} /></p>
          <p><Lead>Organization keyword test</Lead> (case-insensitive; if it matches, the grantee is treated as an organization):</p>
          <p><Code>{ORG_KEYWORDS.source}</Code></p>
        </RuleDetail>
      </Section>

      <Section id="mapping" title="Where grants appear on the map">
        <p>
          A grant is placed by where its project happened, not the grantee's head office. When a grant has
          no project location, we fall back to the grantee's country; a couple of grants have neither and
          can't be mapped.
        </p>
        <p>
          <strong>Grants that serve several countries split their amount evenly among them.</strong> A
          $30,000 grant funding work in three countries counts as $10,000 in each, rather than $30,000 in
          all three. This keeps country totals from double-counting cross-border grants — added up, the
          country totals now match Getty's true total giving. Each shared grant shows a note in the country
          panel telling you its full amount and the other countries it serves. The headline "Total Granted"
          figure is unaffected, since it always counted each grant once.
        </p>
        <p>
          Grants under the "Pacific Standard Time: LA/LA" and "PST ART: Art &amp; Science Collide" initiatives
          funded exhibitions and programs <em>about</em> other regions that took place <em>in</em> Los
          Angeles, so they are mapped to Los Angeles rather than scattered across the countries they
          depict (with three documented Pacific Standard Time: LA/LA exceptions that genuinely funded
          work abroad). The four parts of the United Kingdom are combined into one country for shading.
        </p>
        <RuleDetail>
          <p><Lead>Location priority.</Lead></p>
          <RuleList items={[
            <>Project locations (<Code>projectLocation_countries</Code>) — one map point per distinct country; the "Los Angeles" city hint attaches only to the U.S. point.</>,
            <>If none, the grantee's country.</>,
            <>If neither, unmapped (2 grants).</>,
          ]} />
          <p><Lead>United Kingdom.</Lead> England, Scotland, Wales and Northern Ireland all map to <Code>United Kingdom</Code> (ISO <Code>GB</Code>).</p>
          <p><Lead>Even split.</Lead> A country's share of a grant = <Code>amount ÷ N</Code>, where <Code>N</Code> = distinct countries the grant maps to <em>after</em> the PST override. <Code>N</Code> keeps the U.S. even when the Exclude-U.S. toggle is on.</p>
          <p><Lead>PST → Los Angeles.</Lead> Grants in these initiatives collapse to one Los Angeles, USA point:</p>
          <Chips items={[...PST_INITIATIVES]} />
          <p>Three grants are whitelisted to keep their original overseas locations (they genuinely funded work abroad):</p>
          <RuleList items={[
            <>Fundação de Desenvolvimento da Pesquisa — 2015, $245,000 (Brazil)</>,
            <>Universidad Nacional de General San Martín — 2015, $240,000 (Argentina)</>,
            <>Fundación Espigas — 2015, $180,000 (Argentina)</>,
          ]} />
          <p>Source: <Code>clean_getty_grants.py</Code>, <Code>src/hooks/use-grant-data.ts</Code>.</p>
        </RuleDetail>
      </Section>

      <Section id="colors" title="How the map is shaded">
        <p>
          Giving is extremely concentrated — the United States, then a steep drop — so a plain scale would
          make every other country look the same. Instead the map sorts countries into equal-count color
          classes (a quantile scale): each shade holds the same number of countries, so the largest
          recipients stand out in the brightest class while smaller recipients stay distinguishable from
          one another. Colors run dim to bright — brighter means more — on the dark map background, and the
          classes are recomputed on whatever is shown, so excluding the U.S. re-spreads the scale and the
          next tier of leaders stands out clearly. Dollar amounts use an amber scale and counts use a blue
          scale. These choices follow accepted practice for readable, colorblind-considerate maps.
        </p>
        <RuleDetail>
          <RuleList items={[
            <><strong>Quantile (equal-count) classification</strong> into 6 classes, computed over the countries currently visible — best practice for a heavily right-skewed distribution, since it spreads the long tail across classes instead of collapsing it.</>,
            <>Excluding the U.S. (or any filter) recomputes the classes, so the remaining leaders re-spread across the full ramp.</>,
            <>Two ramps: <span className="text-amber-500">amber</span> for dollars, <span className="text-blue-400">blue</span> for counts/other; each runs dim → bright (brighter = more), monotonic in luminance, so the top class pops on the dark background.</>,
            <>The dimmest class stays a saturated hue, distinct from the grey "no-grant" hatch.</>,
          ]} />
          <p>Source: <Code>src/lib/map-colors.ts</Code>, <Code>src/components/WorldMap.tsx</Code>.</p>
        </RuleDetail>
      </Section>

      <Section id="exclude-us" title="Excluding U.S. grants">
        <p>
          Toggling <em>Exclude U.S. grants</em> removes the United States from the map and subtracts
          only the U.S. share of each grant from the totals. A grant that funds work in the U.S. and
          nowhere else is dropped entirely. A cross-border grant — say a $290,250 award serving five
          countries including the U.S. — stays on the map for the other four countries at $58,050
          each, and contributes $232,200 (four fifths) to the headline totals and to every dollar
          chart. Grants that touch only non-U.S. countries are unaffected.
        </p>
        <RuleDetail>
          <p>For a grant with post-PST country set <Code>C</Code>:</p>
          <RuleList items={[
            <>U.S. not in <Code>C</Code> → unaffected.</>,
            <>U.S. is the only country in <Code>C</Code> → dropped entirely.</>,
            <>Otherwise → amount scaled by <Code>(|C| − 1) / |C|</Code> and the U.S. map point removed.</>,
          ]} />
          <p>The denominator <Code>|C|</Code> includes the U.S., so a 5-country grant keeps four-fifths. Source: <Code>src/hooks/use-grant-data.ts</Code>.</p>
        </RuleDetail>
      </Section>

      <Section id="inflation" title="Adjusting for inflation">
        <p>
          Toggling <em>Adjust dollars for inflation</em> restates every grant in {`${2025}`}-dollar terms
          using the U.S. Bureau of Labor Statistics'{' '}
          <a href="https://data.bls.gov/timeseries/CUUR0000SA0" target="_blank" rel="noopener noreferrer"
             className="underline hover:text-foreground">
            Consumer Price Index for All Urban Consumers (CPI-U)
          </a>
          , annual averages, 1982-84 = 100. A grant awarded in year Y is multiplied by
          CPI(2025) / CPI(Y), so a $100,000 grant in 1990 becomes roughly $246,000 in today's dollars.
        </p>
        <p>
          Reference year 2025 is the most recent complete annual CPI release from BLS. Grants awarded in
          the current, still-in-progress year are treated as already in reference-year dollars (a factor
          of 1), which slightly understates their real value — this is called out in each chart's
          subtitle. When inflation adjustment is on, headline totals, country totals, and every dollar
          series in the Data view use adjusted amounts; grant counts and the Grant Size Distribution
          (which is about award size at the time) remain nominal.
        </p>
        <RuleDetail>
          <RuleList items={[
            <>Factor = <Code>CPI(2025) / CPI(Y)</Code>, CPI-U annual averages (1982–84 = 100).</>,
            <>Reference year 2025 = latest complete annual BLS release.</>,
            <>Current, still-open year uses factor <Code>1</Code> (slightly understates real value).</>,
            <>Applies to dollar series only; counts and the grant-size distribution stay nominal.</>,
          ]} />
          <p>Source: <Code>src/lib/inflation.ts</Code>.</p>
        </RuleDetail>
      </Section>

      <Section id="limits" title="What this data can and cannot show">
        <p>This site is a faithful window onto Getty's grant records, but those records have limits:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>There is no subject or discipline category — conservation, art history, and museum grants can only be inferred from program names.</li>
          <li>Locations are country-level; Los Angeles is the only city the source data pinpoints.</li>
          <li>Dollar amounts default to as-awarded (nominal); use the inflation-adjust toggle to see them in 2025 dollars.</li>
          <li>There is no information on grant outcomes or on the individuals funded.</li>
          <li><strong className="text-foreground/80">Individual vs. organizational is inferred</strong>, never stated by Getty — see the exact rule under "What counts as a grant to an individual" and judge it for yourself.</li>
          <li>This concerns the <strong className="text-foreground/80">count of distinct grantees only</strong> — the number of grants and every dollar amount match Getty's database exactly. The headline Grantees figure is Getty's own official count, read from their database; tallying grantees from the grant records instead (as the per-country counts do) runs slightly higher, because some grantees appear under more than one name — Getty's own grant data included — so the two never fully reconcile.</li>
          <li>Ten grants have no recoverable amount, and the current year is always incomplete.</li>
        </ul>
      </Section>


      <p className="mt-10 text-xs text-muted-foreground">
        This methodology is kept alongside the data itself so any figure on the site can be traced back to
        the decision behind it.
      </p>
    </main>
  </div>
);

export default Methodology;
