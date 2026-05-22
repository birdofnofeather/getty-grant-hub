import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { CleanGrant, MapGrant, CountryAgg } from '@/lib/grant-types';

interface Props {
  filteredClean: CleanGrant[];
  filteredMap: MapGrant[];
  countryAgg: Map<string, CountryAgg>;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
  accent: 'hsl(217 91% 60%)',
  amber: 'hsl(32 95% 44%)',
};

function formatShortUSD(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

const ChartCard = ({ title, subtitle, children, height = 280 }: { title: string; subtitle?: string; children: React.ReactNode; height?: number }) => (
  <div className="bg-card rounded-lg border p-4 shadow-sm">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>{children as any}</ResponsiveContainer>
    </div>
  </div>
);

const DataDashboard = ({ filteredClean, filteredMap, countryAgg }: Props) => {
  // Grants per year (count + USD)
  const perYear = useMemo(() => {
    const m = new Map<number, { year: number; count: number; usd: number }>();
    for (const r of filteredClean) {
      const y = r.grantAwardYear;
      if (!y) continue;
      let agg = m.get(y);
      if (!agg) { agg = { year: y, count: 0, usd: 0 }; m.set(y, agg); }
      agg.count++;
      if (r.amountAwarded_USD > 0) agg.usd += r.amountAwarded_USD;
    }
    return Array.from(m.values()).sort((a, b) => a.year - b.year);
  }, [filteredClean]);

  // Top initiatives by grant count
  const topInitiatives = useMemo(() => {
    const m = new Map<string, { name: string; count: number; usd: number }>();
    for (const r of filteredClean) {
      const key = r.initiative || '(Unspecified)';
      let agg = m.get(key);
      if (!agg) { agg = { name: key, count: 0, usd: 0 }; m.set(key, agg); }
      agg.count++;
      if (r.amountAwarded_USD > 0) agg.usd += r.amountAwarded_USD;
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [filteredClean]);

  // Top countries by grant count (from countryAgg)
  const topCountries = useMemo(() => {
    return Array.from(countryAgg.values())
      .map((c) => ({ name: c.name || c.iso2, count: c.grantCount, usd: c.totalUSD }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [countryAgg]);

  // Grant size distribution buckets
  const sizeBuckets = useMemo(() => {
    const buckets = [
      { label: '< $5K', min: 0, max: 5_000 },
      { label: '$5K–25K', min: 5_000, max: 25_000 },
      { label: '$25K–100K', min: 25_000, max: 100_000 },
      { label: '$100K–500K', min: 100_000, max: 500_000 },
      { label: '$500K–1M', min: 500_000, max: 1_000_000 },
      { label: '> $1M', min: 1_000_000, max: Infinity },
    ];
    return buckets.map((b) => ({
      label: b.label,
      count: filteredClean.filter((r) => r.amountAwarded_USD >= b.min && r.amountAwarded_USD < b.max).length,
    }));
  }, [filteredClean]);

  if (filteredClean.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No grants match the current filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Total USD Awarded per Year" subtitle="Sum of amount awarded each year">
        <BarChart data={perYear} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatShortUSD(v)} />
          <Bar dataKey="usd" fill={COLORS.amber} name="USD" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Grants per Year" subtitle="Number of grants awarded each year">
        <BarChart data={perYear} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.accent} name="Grants" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Top Initiatives" subtitle="By number of grants" height={360}>
        <BarChart data={topInitiatives} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.accent} radius={[0, 3, 3, 0]} name="Grants" />
        </BarChart>
      </ChartCard>

      <ChartCard title="Top Countries" subtitle="By number of grants (mapped)" height={360}>
        <BarChart data={topCountries} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.amber} radius={[0, 3, 3, 0]} name="Grants" />
        </BarChart>
      </ChartCard>

      <ChartCard title="Grant Size Distribution" subtitle="Number of grants by award amount">
        <BarChart data={sizeBuckets} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.accent} radius={[3, 3, 0, 0]} name="Grants" />
        </BarChart>
      </ChartCard>

      <ChartCard title="Cumulative USD Over Time" subtitle="Running total of USD awarded">
        <LineChart
          data={(() => {
            let cum = 0;
            return perYear.map((p) => ({ year: p.year, cumulative: (cum += p.usd) }));
          })()}
          margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatShortUSD} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatShortUSD(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="cumulative" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Cumulative USD" />
        </LineChart>
      </ChartCard>
    </div>
  );
};

export default DataDashboard;
