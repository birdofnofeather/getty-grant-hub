import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CleanGrant, MapGrant, CountryAgg } from '@/lib/grant-types';

function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

type SortField = 'year' | 'amount' | 'initiative';
type Tab = 'grants' | 'grantees';
type GranteeSort = 'total' | 'count';

interface CountryDetailPanelProps {
  iso2: string | null;
  countryAgg: Map<string, CountryAgg>;
  filteredMap: MapGrant[];
  filteredClean: CleanGrant[];
  grantCountries: Map<string, { iso2: string; name: string }[]>;
  onClose: () => void;
}

export default function CountryDetailPanel({ iso2, countryAgg, filteredMap, filteredClean, grantCountries, onClose }: CountryDetailPanelProps) {
  const [tab, setTab] = useState<Tab>('grants');
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortAsc, setSortAsc] = useState(false);
  const [granteeSort, setGranteeSort] = useState<GranteeSort>('total');
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const agg = iso2 ? countryAgg.get(iso2) : null;

  const grants = useMemo(() => {
    if (!iso2) return [];
    const countryMapRows = filteredMap.filter((r) => r.map_iso2 === iso2);
    const cleanMap = new Map(filteredClean.map((c) => [c.grantId, c]));
    const seen = new Set<string>();
    const result: Array<{
      grantId: string; year: number; grantee: string;
      amount: number; fullAmount: number; others: string[];
      initiative: string; title: string; url: string;
    }> = [];

    for (const row of countryMapRows) {
      if (seen.has(row.grantId)) continue;
      seen.add(row.grantId);
      const clean = cleanMap.get(row.grantId);
      const full = clean ? clean.amountAwarded_USD : row.amountAwarded_USD;
      const countries = grantCountries.get(row.grantId) || [];
      const denom = countries.length || 1;
      const others = countries.filter((c) => c.iso2 !== iso2).map((c) => c.name);
      result.push({
        grantId: row.grantId,
        year: row.grantAwardYear,
        grantee: row.grantee_name,
        amount: full > 0 ? full / denom : 0,
        fullAmount: full,
        others,
        initiative: row.initiative,
        title: row.projectTitle_clean,
        url: clean ? clean.projectTitleURL : '',
      });
    }

    result.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortField) {
        case 'year': return dir * (a.year - b.year);
        case 'amount': return dir * (a.amount - b.amount);
        case 'initiative': return dir * a.initiative.localeCompare(b.initiative);
        default: return 0;
      }
    });
    return result;
  }, [iso2, filteredMap, filteredClean, grantCountries, sortField, sortAsc]);

  // Grantee rollup: shares sum to the country's Total Granted (split-aware).
  const grantees = useMemo(() => {
    const m = new Map<string, { name: string; count: number; total: number; minYear: number; maxYear: number }>();
    for (const g of grants) {
      let a = m.get(g.grantee);
      if (!a) { a = { name: g.grantee, count: 0, total: 0, minYear: g.year, maxYear: g.year }; m.set(g.grantee, a); }
      a.count++; a.total += g.amount;
      a.minYear = Math.min(a.minYear, g.year); a.maxYear = Math.max(a.maxYear, g.year);
    }
    return Array.from(m.values()).sort((a, b) => (granteeSort === 'total' ? b.total - a.total : b.count - a.count));
  }, [grants, granteeSort]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  return (
    <Sheet open={!!iso2} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className={`overflow-y-auto bg-card ${isMobile ? 'w-full h-[85vh]' : 'w-full sm:max-w-lg'}`} side={isMobile ? 'bottom' : 'right'}>
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-lg">{agg?.name || ''}</SheetTitle>
        </SheetHeader>

        {agg && (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Total Granted" value={formatUSD(agg.totalUSD)} />
              <StatItem label="Grant Count" value={formatNum(agg.grantCount)} />
              <StatItem label="Unique Grantees" value={formatNum(agg.uniqueGrantees)} />
              <StatItem label="Unique Initiatives" value={formatNum(agg.uniqueInitiatives)} />
              <StatItem
                label="Year Range"
                value={(() => {
                  const rows = filteredMap.filter((r) => r.map_iso2 === iso2);
                  const years = rows.map((r) => r.grantAwardYear);
                  return years.length ? `${Math.min(...years)} – ${Math.max(...years)}` : '—';
                })()}
              />
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Detail view" className="inline-flex rounded-full border border-input bg-background p-0.5">
              {(['grants', 'grantees'] as Tab[]).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`text-xs px-4 py-1.5 rounded-full capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === 'grants' ? (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Grants ({formatNum(grants.length)})</h4>
                <div className="text-xs text-muted-foreground flex gap-4 mb-2 border-b pb-1">
                  <button onClick={() => toggleSort('year')} className="hover:text-foreground font-medium">Year<SortIcon field="year" /></button>
                  <button onClick={() => toggleSort('amount')} className="hover:text-foreground font-medium">Amount<SortIcon field="amount" /></button>
                  <button onClick={() => toggleSort('initiative')} className="hover:text-foreground font-medium">Initiative<SortIcon field="initiative" /></button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {grants.map((g) => {
                    const isExpanded = expandedGrants.has(g.grantId);
                    const titleLong = g.title.length > 80;
                    return (
                      <div key={g.grantId} className="text-xs border rounded-md p-2 bg-background">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-muted-foreground">{g.year}</span>
                          <span className="flex-1 font-medium truncate">{g.grantee}</span>
                          <span className="font-mono whitespace-nowrap">{g.amount > 0 ? formatUSD(g.amount) : '—'}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">{g.initiative}</div>
                        {g.others.length > 0 && g.fullAmount > 0 && (
                          <div className="mt-1 text-[11px] text-amber-600/90 dark:text-amber-500/90">
                            {formatUSD(g.amount)} of this {formatUSD(g.fullAmount)} grant, split evenly across {g.others.length + 1} countries.
                            {' '}Also serves: {g.others.join(', ')}.
                          </div>
                        )}
                        {g.title && (
                          <div
                            className={`mt-1 text-foreground/70 ${!isExpanded && titleLong ? 'truncate cursor-pointer' : titleLong ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (titleLong) {
                                const next = new Set(expandedGrants);
                                if (isExpanded) next.delete(g.grantId); else next.add(g.grantId);
                                setExpandedGrants(next);
                              }
                            }}
                          >
                            {g.url ? (
                              <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                                {g.title}<ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                              </a>
                            ) : g.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">Grantees ({formatNum(grantees.length)})</h4>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    <button onClick={() => setGranteeSort('total')} className={granteeSort === 'total' ? 'text-foreground font-medium' : 'hover:text-foreground'}>Total</button>
                    <button onClick={() => setGranteeSort('count')} className={granteeSort === 'count' ? 'text-foreground font-medium' : 'hover:text-foreground'}>Grants</button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {grantees.map((gr) => (
                    <div key={gr.name} className="text-xs border rounded-md p-2 bg-background flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{gr.name}</div>
                        <div className="text-muted-foreground">{gr.count} grant{gr.count > 1 ? 's' : ''} · {gr.minYear === gr.maxYear ? gr.minYear : `${gr.minYear}–${gr.maxYear}`}</div>
                      </div>
                      <span className="font-mono whitespace-nowrap">{gr.total > 0 ? formatUSD(gr.total) : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/10 border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}
