import { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { isIndividualGrant } from '@/lib/classification';


function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

export interface ChartDetailItem {
  grantId: string;
  year: number;
  grantee: string;
  amount: number;
  initiative: string;
  title: string;
  url: string;
}

export interface ChartDetailSelection {
  title: string;
  subtitle?: string;
  side: 'left' | 'right';
  items: ChartDetailItem[];
}

type SortField = 'year' | 'amount' | 'initiative';

interface Props {
  selection: ChartDetailSelection | null;
  onClose: () => void;
}

export default function ChartGrantsPanel({ selection, onClose }: Props) {
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const items = selection?.items ?? [];
  const sorted = useMemo(() => {
    const dir = sortAsc ? 1 : -1;
    return [...items].sort((a, b) => {
      switch (sortField) {
        case 'year': return dir * (a.year - b.year);
        case 'amount': return dir * (a.amount - b.amount);
        case 'initiative': return dir * a.initiative.localeCompare(b.initiative);
      }
    });
  }, [items, sortField, sortAsc]);

  const totalUSD = useMemo(() => items.reduce((s, g) => s + (g.amount > 0 ? g.amount : 0), 0), [items]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  const side = isMobile ? 'bottom' : (selection?.side ?? 'right');

  return (
    <Sheet open={!!selection} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className={`overflow-y-auto bg-card ${isMobile ? 'w-full h-[85vh]' : 'w-full sm:max-w-lg'}`} side={side}>
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-lg">{selection?.title}</SheetTitle>
          {selection?.subtitle && <p className="text-xs text-muted-foreground">{selection.subtitle}</p>}
        </SheetHeader>

        {selection && (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Grants" value={formatNum(items.length)} />
              <StatItem label="Total" value={formatUSD(totalUSD)} />
            </div>

            <div>
              <div className="text-xs text-muted-foreground flex gap-4 mb-2 border-b pb-1">
                <button onClick={() => toggleSort('year')} className="hover:text-foreground font-medium">Year<SortIcon field="year" /></button>
                <button onClick={() => toggleSort('amount')} className="hover:text-foreground font-medium">Amount<SortIcon field="amount" /></button>
                <button onClick={() => toggleSort('initiative')} className="hover:text-foreground font-medium">Initiative<SortIcon field="initiative" /></button>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {sorted.map((g) => {
                  const isExpanded = expanded.has(g.grantId);
                  const titleLong = g.title.length > 80;
                  const toggle = () => {
                    if (!titleLong) return;
                    const next = new Set(expanded);
                    if (isExpanded) next.delete(g.grantId); else next.add(g.grantId);
                    setExpanded(next);
                  };
                  return (
                    <div
                      key={g.grantId}
                      className={`text-xs border rounded-md p-2 bg-background ${titleLong ? 'cursor-pointer' : ''}`}
                      onClick={toggle}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-muted-foreground">{g.year}</span>
                        <span className="flex-1 font-medium truncate">{g.grantee}</span>
                        <span className="font-mono whitespace-nowrap">{g.amount > 0 ? formatUSD(g.amount) : '—'}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">{g.initiative}</div>
                      {g.title && (
                        <div className={`mt-1 text-foreground/70 ${!isExpanded && titleLong ? 'truncate' : ''}`}>
                          <span>{g.title}</span>
                          {g.url && (
                            <a
                              href={g.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center hover:text-foreground ml-1 align-middle"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Open project page"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sorted.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">No grants match this selection.</div>
                )}
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
