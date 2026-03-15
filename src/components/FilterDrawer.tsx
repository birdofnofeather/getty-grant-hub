import { useMemo, useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search, RotateCcw } from 'lucide-react';
import type { FilterState, ChoroplethMetric, DrawerMode } from '@/lib/grant-types';
import { DEFAULT_FILTERS, CURRENT_INITIATIVES, PAST_INITIATIVES } from '@/lib/grant-types';

interface FilterDrawerProps {
  mode: DrawerMode;
  filters: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  allInitiatives: string[];
}

export default function FilterDrawer({ mode, filters, onChange, allInitiatives }: FilterDrawerProps) {
  const [initiativeSearch, setInitiativeSearch] = useState('');

  const isAdvanced = mode === 'advanced';
  const hasChanges = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const basicMetrics: { value: ChoroplethMetric; label: string }[] = [
    { value: 'none', label: 'None (uniform)' },
    { value: 'grantCount', label: 'Grant Count' },
    { value: 'totalUSD', label: 'Total USD Awarded' },
  ];

  const advancedMetrics: { value: ChoroplethMetric; label: string }[] = [
    ...basicMetrics,
    { value: 'uniqueGrantees', label: 'Unique Grantees' },
    { value: 'uniqueInitiatives', label: 'Unique Initiatives' },
    { value: 'longevity', label: 'Relationship Longevity' },
  ];

  const metrics = isAdvanced ? advancedMetrics : basicMetrics;

  // Initiative grouping
  const groupedInitiatives = useMemo(() => {
    const currentSet = new Set(CURRENT_INITIATIVES);
    const pastSet = new Set(PAST_INITIATIVES);
    const other = allInitiatives.filter((i) => !currentSet.has(i) && !pastSet.has(i)).sort();
    return { current: CURRENT_INITIATIVES, past: PAST_INITIATIVES, other };
  }, [allInitiatives]);

  const filteredInitiatives = useMemo(() => {
    const q = initiativeSearch.toLowerCase();
    const filter = (arr: string[]) => q ? arr.filter((i) => i.toLowerCase().includes(q)) : arr;
    return {
      current: filter(groupedInitiatives.current),
      past: filter(groupedInitiatives.past),
      other: filter(groupedInitiatives.other),
    };
  }, [groupedInitiatives, initiativeSearch]);

  const selectedSet = useMemo(() => filters.selectedInitiatives ? new Set(filters.selectedInitiatives) : null, [filters.selectedInitiatives]);
  const isSelected = (init: string) => !selectedSet || selectedSet.has(init);
  const toggleInitiative = (init: string) => {
    if (!selectedSet) {
      // Selecting one means deselecting all others
      onChange({ selectedInitiatives: [init] });
    } else if (selectedSet.has(init)) {
      const next = filters.selectedInitiatives!.filter((i) => i !== init);
      onChange({ selectedInitiatives: next.length === 0 ? null : next });
    } else {
      onChange({ selectedInitiatives: [...filters.selectedInitiatives!, init] });
    }
  };

  if (mode === 'none') return null;

    <div className="bg-card border-t rounded-t-xl shadow-xl p-4 space-y-4 max-h-[50vh] overflow-y-auto">
      {/* Year range */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Year Range</Label>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm font-mono tabular-nums">{filters.yearRange[0]}</span>
          <Slider
            min={1984}
            max={2026}
            step={1}
            value={filters.yearRange}
            onValueChange={(v) => onChange({ yearRange: v as [number, number] })}
            className="flex-1"
          />
          <span className="text-sm font-mono tabular-nums">{filters.yearRange[1]}</span>
        </div>
      </div>

      {/* Metric */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Choropleth Metric</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {metrics.map((m) => (
            <button
              key={m.value}
              onClick={() => onChange({ metric: m.value })}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filters.metric === m.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:border-primary/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Org toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={filters.orgOnly} onCheckedChange={(v) => onChange({ orgOnly: v })} />
        <Label className="text-sm">Organizational grants only</Label>
      </div>

      {/* Advanced controls */}
      {isAdvanced && (
        <>
          {/* Initiative multi-select */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Initiatives</Label>
            <div className="relative mt-1 mb-2">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={initiativeSearch}
                onChange={(e) => setInitiativeSearch(e.target.value)}
                placeholder="Search initiatives..."
                className="pl-7 h-8 text-xs"
              />
            </div>
            {selectedSet && (
              <div className="flex flex-wrap gap-1 mb-2">
                {filters.selectedInitiatives!.slice(0, 5).map((i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                    {i.length > 30 ? i.slice(0, 30) + '…' : i}
                    <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => toggleInitiative(i)} />
                  </Badge>
                ))}
                {filters.selectedInitiatives!.length > 5 && (
                  <Badge variant="outline" className="text-[10px]">+{filters.selectedInitiatives!.length - 5} more</Badge>
                )}
                <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => onChange({ selectedInitiatives: null })}>
                  Select all
                </button>
              </div>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-background">
              {filteredInitiatives.current.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Current Initiatives</div>
                  {filteredInitiatives.current.map((i) => (
                    <InitiativeRow key={i} name={i} checked={isSelected(i)} onToggle={() => toggleInitiative(i)} />
                  ))}
                </>
              )}
              {filteredInitiatives.past.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-2">Past Initiatives</div>
                  {filteredInitiatives.past.map((i) => (
                    <InitiativeRow key={i} name={i} checked={isSelected(i)} onToggle={() => toggleInitiative(i)} />
                  ))}
                </>
              )}
              {filteredInitiatives.other.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-2">Other</div>
                  {filteredInitiatives.other.map((i) => (
                    <InitiativeRow key={i} name={i} checked={isSelected(i)} onToggle={() => toggleInitiative(i)} />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Min grant amount */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Minimum Grant Amount ($)</Label>
            <Input
              type="number"
              min={0}
              value={filters.minGrantAmount || ''}
              onChange={(e) => onChange({ minGrantAmount: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="h-8 text-xs mt-1 w-40"
            />
          </div>

          {/* Min grant count per country */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Min Grants per Country (map only)</Label>
            <Input
              type="number"
              min={1}
              value={filters.minGrantCountPerCountry || ''}
              onChange={(e) => onChange({ minGrantCountPerCountry: Math.max(1, parseInt(e.target.value) || 1) })}
              placeholder="1"
              className="h-8 text-xs mt-1 w-40"
            />
          </div>
        </>
      )}

      {/* Reset */}
      {hasChanges && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs text-muted-foreground gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Reset all filters
          </Button>
        </div>
      )}
    </div>
  );
}

function InitiativeRow({ name, checked, onToggle }: { name: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="h-3.5 w-3.5" />
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{name}</span>
    </label>
  );
}
