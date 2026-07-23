import { useMemo, useState, type ReactElement, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  ComposedChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { CleanGrant, MapGrant, CountryAgg } from '@/lib/grant-types';
import {
  perYear, peopleVsOrgByYear, topInitiatives, avgGrantSize,
  topCountriesExUS, topCountriesExUSByUsd, sizeBuckets, cumulativeUSD,
} from '@/lib/dashboard-data';
import { isIndividualGrant } from '@/lib/classification';
import type { Adjuster } from '@/lib/inflation';
import { CPI_REFERENCE_YEAR } from '@/lib/inflation';
import ChartGrantsPanel, { type ChartDetailItem, type ChartDetailSelection } from './ChartGrantsPanel';

interface Props {
  filteredClean: CleanGrant[];
  filteredMap: MapGrant[];
  countryAgg: Map<string, CountryAgg>;
  grantCountries: Map<string, { iso2: string; name: string }[]>;
  maxYear: number;
  adjust: Adjuster;
  inflationAdjust: boolean;
  excludeUS: boolean;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
  accent: 'hsl(217 91% 60%)',
  amber: 'hsl(32 95% 44%)',
  people: 'hsl(160 84% 39%)',
  positive: 'hsl(160 84% 39%)',
  negative: 'hsl(0 72% 55%)',
};

function formatShortUSD(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

const ChartCard = ({ title, subtitle, action, children, height = 280 }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; height?: number }) => (
  <div className="bg-card rounded-lg border p-4 shadow-sm">
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>{children as ReactElement}</ResponsiveContainer>
    </div>
  </div>
);

const Pills = ({ options, value, onChange }: { options: { v: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
  <div className="inline-flex rounded-full border border-input bg-background p-0.5 shrink-0">
    {options.map((o) => (
      <button key={o.v} onClick={() => onChange(o.v)}
        className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${value === o.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        {o.label}
      </button>
    ))}
  </div>
);

const commonXAxis = { interval: 'preserveStartEnd' as const, minTickGap: 20, tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } };

function sideFromEvent(e: unknown): 'left' | 'right' {
  const evt = e as { clientX?: number } | undefined;
  const x = evt?.clientX ?? 0;
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  // Chart on right half → open panel on left, and vice versa.
  return x > w / 2 ? 'left' : 'right';
}

const DataDashboard = ({ filteredClean, filteredMap, countryAgg, grantCountries, maxYear, adjust, inflationAdjust, excludeUS }: Props) => {
  const [initBy, setInitBy] = useState<'usd' | 'count'>('usd');
  const [povBy, setPovBy] = useState<'count' | 'usd'>('count');
  const [countryBy, setCountryBy] = useState<'usd' | 'count'>('usd');
  const [selection, setSelection] = useState<ChartDetailSelection | null>(null);

  const cleanById = useMemo(() => {
    const m = new Map<string, CleanGrant>();
    for (const g of filteredClean) m.set(g.grantId, g);
    return m;
  }, [filteredClean]);

  const years = useMemo(() => perYear(filteredClean, adjust), [filteredClean, adjust]);
  const pov = useMemo(() => peopleVsOrgByYear(filteredClean, adjust), [filteredClean, adjust]);
  const inits = useMemo(() => topInitiatives(filteredClean, initBy, 12, adjust), [filteredClean, initBy, adjust]);
  const avg = useMemo(() => avgGrantSize(filteredClean, 10, 12, adjust), [filteredClean, adjust]);
  const countries = useMemo(
    () => (countryBy === 'usd' ? topCountriesExUSByUsd(countryAgg) : topCountriesExUS(countryAgg)),
    [countryAgg, countryBy]
  );
  const buckets = useMemo(() => sizeBuckets(filteredClean), [filteredClean]);
  const bucketRanges = useMemo(() => [
    { label: '< $5K', min: 0, max: 5_000 },
    { label: '$5K–25K', min: 5_000, max: 25_000 },
    { label: '$25K–100K', min: 25_000, max: 100_000 },
    { label: '$100K–500K', min: 100_000, max: 500_000 },
    { label: '$500K–1M', min: 500_000, max: 1_000_000 },
    { label: '> $1M', min: 1_000_000, max: Infinity },
  ], []);
  const cumulative = useMemo(() => {
    const cum = cumulativeUSD(years);
    return years.map((y, i) => {
      const prev = i > 0 ? years[i - 1].usd : 0;
      const variance = i > 0 ? y.usd - prev : 0;
      const pct = i > 0 && prev > 0 ? ((y.usd - prev) / prev) * 100 : null;
      return {
        year: y.year,
        annual: y.usd,
        variance,
        pct,
        cumulative: cum[i].cumulative,
      };
    });
  }, [years]);
  const partialNote = `${maxYear} is a partial year`;
  const dollarNote = inflationAdjust ? `in ${CPI_REFERENCE_YEAR} dollars (CPI-U)` : '';
  const withDollarNote = (s: string) => dollarNote ? `${s} · ${dollarNote}` : s;

  // --- selection builders ---
  const toItem = (g: CleanGrant): ChartDetailItem => ({
    grantId: g.grantId,
    year: g.grantAwardYear,
    grantee: g.grantee_name,
    amount: adjust(g.amountAwarded_USD, g.grantAwardYear),
    initiative: g.initiative || '(Unspecified)',
    title: g.projectTitle_clean,
    url: g.projectTitleURL,
  });

  const openYearSelection = (year: number, e: unknown, kind: 'all' | 'ind' | 'org' = 'all') => {
    let grants = filteredClean.filter((g) => g.grantAwardYear === year);
    if (kind === 'ind') grants = grants.filter(isIndividualGrant);
    else if (kind === 'org') grants = grants.filter((g) => !isIndividualGrant(g));
    const label = kind === 'ind' ? 'Individuals · ' : kind === 'org' ? 'Organizations · ' : '';
    setSelection({
      title: `${label}${year}`,
      subtitle: `${grants.length.toLocaleString()} grants`,
      side: sideFromEvent(e),
      items: grants.map(toItem),
    });
  };

  const openInitiativeSelection = (name: string, e: unknown) => {
    const grants = filteredClean.filter((g) => (g.initiative || '(Unspecified)') === name);
    setSelection({
      title: name,
      subtitle: `${grants.length.toLocaleString()} grants`,
      side: sideFromEvent(e),
      items: grants.map(toItem),
    });
  };

  const openBucketSelection = (label: string, e: unknown) => {
    const range = bucketRanges.find((b) => b.label === label);
    if (!range) return;
    const grants = filteredClean.filter((g) => g.amountAwarded_USD >= range.min && g.amountAwarded_USD < range.max);
    setSelection({
      title: `Grants ${label}`,
      subtitle: `${grants.length.toLocaleString()} grants (nominal amounts)`,
      side: sideFromEvent(e),
      items: grants.map(toItem),
    });
  };

  const openCountrySelection = (name: string, e: unknown) => {
    // Resolve iso2 by name from countryAgg.
    let iso2: string | null = null;
    for (const c of countryAgg.values()) {
      if (c.name === name) { iso2 = c.iso2; break; }
    }
    if (!iso2) return;
    const rows = filteredMap.filter((r) => r.map_iso2 === iso2);
    const seen = new Set<string>();
    const items: ChartDetailItem[] = [];
    for (const r of rows) {
      if (seen.has(r.grantId)) continue;
      seen.add(r.grantId);
      const clean = cleanById.get(r.grantId);
      const full = r.amountAwarded_USD > 0 ? r.amountAwarded_USD : (clean ? clean.amountAwarded_USD : 0);
      const year = clean ? clean.grantAwardYear : r.grantAwardYear;
      const adjusted = adjust(full, year);
      const denom = (grantCountries.get(r.grantId) || []).length || 1;
      items.push({
        grantId: r.grantId,
        year,
        grantee: r.grantee_name,
        amount: adjusted > 0 ? adjusted / denom : 0,
        initiative: r.initiative || '(Unspecified)',
        title: r.projectTitle_clean,
        url: clean ? clean.projectTitleURL : '',
      });
    }
    setSelection({
      title: name,
      subtitle: `${items.length.toLocaleString()} grants (split-adjusted)`,
      side: sideFromEvent(e),
      items,
    });
  };

  if (filteredClean.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No grants match the current filters.
      </div>
    );
  }

  const barOpacity = (year: number) => (year === maxYear ? 0.45 : 1);

  const CumulativeTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: typeof cumulative[number] }>; label?: number }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const pctStr = d.pct === null ? '—' : `${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(1)}%`;
    const pctColor = d.pct === null ? 'hsl(var(--muted-foreground))' : d.pct >= 0 ? COLORS.positive : COLORS.negative;
    return (
      <div style={tooltipStyle} className="p-2.5">
        <div className="font-semibold text-xs mb-1">{label}</div>
        <div className="text-[11px] space-y-0.5">
          <div>Annual: <span className="font-medium">{formatShortUSD(d.annual)}</span></div>
          <div>YoY change: <span className="font-medium" style={{ color: pctColor }}>{pctStr}</span></div>
          <div>Cumulative: <span className="font-medium">{formatShortUSD(d.cumulative)}</span></div>
        </div>
      </div>
    );
  };

  const hint = <p className="text-[10px] text-muted-foreground/70 italic mt-1">Double-click a bar to see the underlying grants.</p>;

  // Recharts fires bar events with (data, index, event). Wrap for TS.
  type BarEvt = (data: { payload?: Record<string, unknown> } & Record<string, unknown>, index: number, event: ReactMouseEvent) => void;

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Total USD Awarded per Year */}
      <ChartCard title="Total USD Awarded per Year" subtitle={withDollarNote(`Sum of amount awarded each year · ${partialNote}`)}>
        <BarChart data={years} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" {...commonXAxis} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatShortUSD(v)} />
          <Bar dataKey="usd" fill={COLORS.amber} name="USD" radius={[3, 3, 0, 0]}
            onDoubleClick={((d, _i, e) => openYearSelection(Number(d.year), e)) as BarEvt}
            style={{ cursor: 'pointer' }}>
            {years.map((d) => <Cell key={d.year} fillOpacity={barOpacity(d.year)} />)}
          </Bar>
        </BarChart>
      </ChartCard>

      {/* 2. Grants per Year */}
      <ChartCard title="Grants per Year" subtitle={`Number of grants awarded each year · ${partialNote}`}>
        <BarChart data={years} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" {...commonXAxis} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.accent} name="Grants" radius={[3, 3, 0, 0]}
            onDoubleClick={((d, _i, e) => openYearSelection(Number(d.year), e)) as BarEvt}
            style={{ cursor: 'pointer' }}>
            {years.map((d) => <Cell key={d.year} fillOpacity={barOpacity(d.year)} />)}
          </Bar>
        </BarChart>
      </ChartCard>

      {/* 3. Top Initiatives */}
      <ChartCard
        title="Top Initiatives"
        subtitle={initBy === 'usd' ? withDollarNote('By total USD awarded') : 'By number of grants'}
        action={<Pills options={[{ v: 'usd', label: 'By dollars' }, { v: 'count', label: 'By grant count' }]} value={initBy} onChange={(v) => setInitBy(v as 'usd' | 'count')} />}
        height={360}
      >
        <BarChart data={inits} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={initBy === 'usd' ? formatShortUSD : undefined} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => (initBy === 'usd' ? formatShortUSD(v) : v.toLocaleString())} />
          <Bar dataKey={initBy} fill={initBy === 'usd' ? COLORS.amber : COLORS.accent} radius={[0, 3, 3, 0]} name={initBy === 'usd' ? 'USD' : 'Grants'}
            onDoubleClick={((d, _i, e) => openInitiativeSelection(String(d.name), e)) as BarEvt}
            style={{ cursor: 'pointer' }} />
        </BarChart>
      </ChartCard>

      {/* 4. Avg Grant Size by Initiative */}
      <ChartCard title="Avg Grant Size by Initiative" subtitle={withDollarNote('Average USD per grant · initiatives with ≥ 10 grants')} height={360}>
        <BarChart data={avg} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatShortUSD(v)} />
          <Bar dataKey="avg" fill={COLORS.primary} radius={[0, 3, 3, 0]} name="Avg USD"
            onDoubleClick={((d, _i, e) => openInitiativeSelection(String(d.name), e)) as BarEvt}
            style={{ cursor: 'pointer' }} />
        </BarChart>
      </ChartCard>

      {/* 5. Top Countries */}
      <ChartCard
        title={excludeUS ? 'Top Countries' : 'Top Countries (excluding U.S.)'}
        subtitle={
          excludeUS
            ? (countryBy === 'usd' ? withDollarNote('By total USD awarded') : 'By number of grants')
            : `U.S.: ${countries.usCount.toLocaleString()} grants${countryBy === 'usd' ? ` · ${formatShortUSD(countries.usUsd)}` : ''} — shown separately so other countries are readable`
        }
        action={<Pills options={[{ v: 'usd', label: 'By dollars' }, { v: 'count', label: 'By grant count' }]} value={countryBy} onChange={(v) => setCountryBy(v as 'usd' | 'count')} />}
        height={360}
      >
        <BarChart data={countries.bars} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={countryBy === 'usd' ? formatShortUSD : undefined} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => (countryBy === 'usd' ? formatShortUSD(v) : v.toLocaleString())} />
          <Bar dataKey={countryBy} fill={countryBy === 'usd' ? COLORS.amber : COLORS.accent} radius={[0, 3, 3, 0]} name={countryBy === 'usd' ? 'USD' : 'Grants'}
            onDoubleClick={((d, _i, e) => openCountrySelection(String(d.name), e)) as BarEvt}
            style={{ cursor: 'pointer' }} />
        </BarChart>
      </ChartCard>

      {/* 6. Grant Size Distribution */}
      <ChartCard title="Grant Size Distribution" subtitle="Number of grants by award amount (nominal)">
        <BarChart data={buckets} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.accent} radius={[3, 3, 0, 0]} name="Grants"
            onDoubleClick={((d, _i, e) => openBucketSelection(String(d.label), e)) as BarEvt}
            style={{ cursor: 'pointer' }} />
        </BarChart>
      </ChartCard>

      {/* 7. People vs. Organizations */}
      <ChartCard
        title="People vs. Organizations Over Time"
        subtitle={withDollarNote(`Grants to individuals (fellows, interns, scholars) vs. institutions · ${partialNote}`)}
        action={<Pills options={[{ v: 'count', label: 'Grants' }, { v: 'usd', label: 'Dollars' }]} value={povBy} onChange={(v) => setPovBy(v as 'count' | 'usd')} />}
        height={300}
      >
        <BarChart data={pov} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" {...commonXAxis} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v: number) => (povBy === 'usd' ? formatShortUSD(v) : String(v))} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => (povBy === 'usd' ? formatShortUSD(v) : v.toLocaleString())} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={povBy === 'usd' ? 'indUsd' : 'indCount'} stackId="a" fill={COLORS.people} name="Individuals" radius={[0, 0, 0, 0]}
            onDoubleClick={((d, _i, e) => openYearSelection(Number(d.year), e, 'ind')) as BarEvt}
            style={{ cursor: 'pointer' }} />
          <Bar dataKey={povBy === 'usd' ? 'orgUsd' : 'orgCount'} stackId="a" fill={COLORS.accent} name="Organizations" radius={[2, 2, 0, 0]}
            onDoubleClick={((d, _i, e) => openYearSelection(Number(d.year), e, 'org')) as BarEvt}
            style={{ cursor: 'pointer' }} />
        </BarChart>
      </ChartCard>

      {/* 8. Cumulative USD with annual variance */}
      <ChartCard title="Cumulative USD Over Time" subtitle={withDollarNote(`Running total with annual change · ${partialNote}`)}>
        <ComposedChart data={cumulative} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" {...commonXAxis} />
          <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <Tooltip content={<CumulativeTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="variance" name="Annual change" radius={[3, 3, 0, 0]}
            onDoubleClick={((d, _i, e) => openYearSelection(Number(d.year), e)) as BarEvt}
            style={{ cursor: 'pointer' }}>
            {cumulative.map((d) => (
              <Cell key={d.year} fill={d.variance >= 0 ? COLORS.positive : COLORS.negative} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Cumulative USD" />
        </ComposedChart>
      </ChartCard>
    </div>
    <p className="text-[11px] text-muted-foreground/80 italic mt-3">Tip: double-click any bar to see the grants that make it up.</p>
    <ChartGrantsPanel selection={selection} onClose={() => setSelection(null)} />
    </>
  );
};

export default DataDashboard;
