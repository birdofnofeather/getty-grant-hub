import { useMemo, useState } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CleanGrant, MapGrant, CountryAgg } from '@/lib/grant-types';

function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

type SortField = 'year' | 'amount' | 'initiative';

interface CountryDetailPanelProps {
  iso2: string | null;
  countryAgg: Map<string, CountryAgg>;
  filteredMap: MapGrant[];
  filteredClean: CleanGrant[];
  onClose: () => void;
}

export default function CountryDetailPanel({ iso2, countryAgg, filteredMap, filteredClean, onClose }: CountryDetailPanelProps) {
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());

  const agg = iso2 ? countryAgg.get(iso2) : null;

  const grants = useMemo(() => {
    if (!iso2) return [];
    // Get unique grantIds for this country from map data
    const countryMapRows = filteredMap.filter((r) => r.map_iso2 === iso2);
    const grantIdSet = new Set(countryMapRows.map((r) => r.grantId));

    // Deduplicate: one entry per grantId, use map row for display but clean row for amount
    const cleanMap = new Map(filteredClean.map((c) => [c.grantId, c]));
    const seen = new Set<string>();
    const result: Array<{
      grantId: string;
      year: number;
      grantee: string;
      amount: number;
      initiative: string;
      title: string;
    }> = [];

    for (const row of countryMapRows) {
      if (seen.has(row.grantId)) continue;
      seen.add(row.grantId);
      const clean = cleanMap.get(row.grantId);
      result.push({
        grantId: row.grantId,
        year: row.grantAwardYear,
        grantee: row.grantee_name,
        amount: clean ? clean.amountAwarded_USD : row.amountAwarded_USD,
        initiative: row.initiative,
        title: row.projectTitle_clean,
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
  }, [iso2, filteredMap, filteredClean, sortField, sortAsc]);

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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card" side="right">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-lg">{agg?.name || ''}</SheetTitle>
        </SheetHeader>

        {agg && (
          <div className="py-4 space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Total Granted" value={formatUSD(agg.totalUSD)} />
              <StatItem label="Grant Count" value={formatNum(agg.grantIds.size)} />
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

            {/* Grant list */}
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
                          {g.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
