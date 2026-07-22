import { useMemo, useState, type ReactElement } from 'react';
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
import type { Adjuster } from '@/lib/inflation';
import { CPI_REFERENCE_YEAR } from '@/lib/inflation';

interface Props {
  filteredClean: CleanGrant[];
  filteredMap: MapGrant[];
  countryAgg: Map<string, CountryAgg>;
  maxYear: number;
  adjust: Adjuster;
  inflationAdjust: boolean;
  excludeUS: boolean;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
  accent: 'hsl(217 91% 60%)',   // blue — organizations / counts
  amber: 'hsl(32 95% 44%)',     // amber — dollars
  people: 'hsl(160 84% 39%)',   // teal — individuals
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

const DataDashboard = ({ filteredClean, countryAgg, maxYear, adjust, inflationAdjust, excludeUS }: Props) => {
  const [initBy, setInitBy] = useState<'usd' | 'count'>('usd');
  const [povBy, setPovBy] = useState<'count' | 'usd'>('count');
  const [countryBy, setCountryBy] = useState<'usd' | 'count'>('usd');

  const years = useMemo(() => perYear(filteredClean, adjust), [filteredClean, adjust]);
  const pov = useMemo(() => peopleVsOrgByYear(filteredClean, adjust), [filteredClean, adjust]);
  const inits = useMemo(() => topInitiatives(filteredClean, initBy, 12, adjust), [filteredClean, initBy, adjust]);
  const avg = useMemo(() => avgGrantSize(filteredClean, 10, 12, adjust), [filteredClean, adjust]);
  const countries = useMemo(
    () => (countryBy === 'usd' ? topCountriesExUSByUsd(countryAgg) : topCountriesExUS(countryAgg)),
    [countryAgg, countryBy]
  );
  const buckets = useMemo(() => sizeBuckets(filteredClean), [filteredClean]);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Total USD Awarded per Year */}
      <ChartCard title="Total USD Awarded per Year" subtitle={withDollarNote(`Sum of amount awarded each year · ${partialNote}`)}>
        <BarChart data={years} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" {...commonXAxis} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatShortUSD(v)} />
          <Bar dataKey="usd" fill={COLORS.amber} name="USD" radius={[3, 3, 0, 0]}>
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
          <Bar dataKey="count" fill={COLORS.accent} name="Grants" radius={[3, 3, 0, 0]}>
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
          <Bar dataKey={initBy} fill={initBy === 'usd' ? COLORS.amber : COLORS.accent} radius={[0, 3, 3, 0]} name={initBy === 'usd' ? 'USD' : 'Grants'} />
        </BarChart>
      </ChartCard>

      {/* 4. Avg Grant Size by Initiative */}
      <ChartCard title="Avg Grant Size by Initiative" subtitle={withDollarNote('Average USD per grant · initiatives with ≥ 10 grants')} height={360}>
        <BarChart data={avg} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatShortUSD(v)} />
          <Bar dataKey="avg" fill={COLORS.primary} radius={[0, 3, 3, 0]} name="Avg USD" />
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
          <Bar dataKey={countryBy} fill={countryBy === 'usd' ? COLORS.amber : COLORS.accent} radius={[0, 3, 3, 0]} name={countryBy === 'usd' ? 'USD' : 'Grants'} />
        </BarChart>
      </ChartCard>

      {/* 6. Grant Size Distribution */}
      <ChartCard title="Grant Size Distribution" subtitle="Number of grants by award amount (nominal)">
        <BarChart data={buckets} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.accent} radius={[3, 3, 0, 0]} name="Grants" />
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
          <Bar dataKey={povBy === 'usd' ? 'indUsd' : 'indCount'} stackId="a" fill={COLORS.people} name="Individuals" radius={[0, 0, 0, 0]} />
          <Bar dataKey={povBy === 'usd' ? 'orgUsd' : 'orgCount'} stackId="a" fill={COLORS.accent} name="Organizations" radius={[2, 2, 0, 0]} />
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
          <Bar yAxisId="left" dataKey="variance" name="Annual change" radius={[3, 3, 0, 0]}>
            {cumulative.map((d) => (
              <Cell key={d.year} fill={d.variance >= 0 ? COLORS.positive : COLORS.negative} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Cumulative USD" />
        </ComposedChart>
      </ChartCard>
    </div>
  );
};

export default DataDashboard;
