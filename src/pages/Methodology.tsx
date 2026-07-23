import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-20">
    <h2 className="text-lg font-semibold text-foreground mt-8 mb-2">{title}</h2>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </section>
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
        need to know the underlying data to follow along.
      </p>

      <Section id="source" title="Data source & updates">
        <p>
          Every grant comes from the Getty Foundation's own public grants database. On the 5th of each
          month an automated job checks for new grants, adds only what is new, and removes any grant Getty
          has taken down. It runs a series of safety checks and publishes only if they all pass — if
          anything looks wrong, it stops rather than publish bad data. The most recent calendar year is
          always marked "partial," because it is still in progress.
        </p>
        <p>
          Ten older grants list no dollar amount in Getty's records, and the amount can't be recovered.
          They are kept so the grant <em>count</em> stays accurate, but they add nothing to any dollar
          total and show a dash ("—").
        </p>
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
          with a title such as "Dr." or "Ms." is a person; and in a couple of specific programs we
          recognize individuals by grant size or by names that look like people rather than institutions. A
          few programs whose names <em>sound</em> personal but actually fund organizations (for example, one
          that pays for a staff position at a museum) are deliberately kept on the organization side.
        </p>
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
          Grants under the "Pacific Standard Time: LA/LA" initiative funded exhibitions <em>about</em> Latin
          American art that took place <em>in</em> Los Angeles, so they are mapped to Los Angeles rather
          than scattered across the countries they depict (with three documented exceptions that genuinely
          funded work abroad). The four parts of the United Kingdom are combined into one country for
          shading.
        </p>
      </Section>

      <Section id="colors" title="How the map is shaded">
        <p>
          Because the United States receives far more than anywhere else, a plain color scale would make
          every other country look identical. So the shading uses a compressed (logarithmic) scale, and the
          U.S. is capped at the level of the next-highest country so it doesn't wash everything else out.
          Colors run from dim to bright — brighter means more — on the dark map background. Dollar amounts
          use an amber scale and counts use a blue scale, so you can tell at a glance which measure you're
          viewing. These choices follow accepted practice for readable, colorblind-considerate maps.
        </p>
      </Section>

      <Section id="exclude-us" title="Excluding U.S. grants">
        <p>
          Toggling <em>Exclude U.S. grants</em> removes the United States from the map and subtracts
          only the U.S. share of each grant from the totals. A grant that funds work in the U.S. and
          nowhere else is dropped entirely. A cross-border grant — say a $290,250 award serving five
          countries including the U.S. — stays on the map for the other four countries at $58,050
          each, and contributes $232,050 (four fifths) to the headline totals and to every dollar
          chart. Grants that touch only non-U.S. countries are unaffected.
        </p>
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
      </Section>

      <Section id="limits" title="What this data can and cannot show">
        <p>This site is a faithful window onto Getty's grant records, but those records have limits:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>There is no subject or discipline category — conservation, art history, and museum grants can only be inferred from program names.</li>
          <li>Locations are country-level; Los Angeles is the only city the source data pinpoints.</li>
          <li>Dollar amounts default to as-awarded (nominal); use the inflation-adjust toggle to see them in 2025 dollars.</li>
          <li>There is no information on grant outcomes or on the individuals funded.</li>
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
