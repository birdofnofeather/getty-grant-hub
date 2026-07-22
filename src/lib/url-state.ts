// Serialize/parse filter + view state to URL query params so any view is
// linkable and bookmarkable. Only non-default fields are written.
import type { FilterState, ChoroplethMetric } from '@/lib/grant-types';
import { DEFAULT_FILTERS } from '@/lib/grant-types';

export type ViewMode = 'map' | 'data';

const VALID_METRICS: ChoroplethMetric[] = ['none', 'grantCount', 'totalUSD', 'uniqueGrantees', 'uniqueInitiatives', 'longevity'];

export interface ParsedUrlState {
  filters: Partial<FilterState>;
  viewMode?: ViewMode;
  yearProvided: boolean;
}

export function serializeState(filters: FilterState, viewMode: ViewMode, maxYear: number): string {
  const p = new URLSearchParams();
  const [y0, y1] = filters.yearRange;
  if (y0 > DEFAULT_FILTERS.yearRange[0] || y1 < maxYear) p.set('y', `${y0}-${y1}`);
  if (filters.orgOnly) p.set('org', '1');
  if (filters.excludeUS) p.set('nous', '1');
  if (filters.inflationAdjust) p.set('infl', '1');
  if (filters.metric !== DEFAULT_FILTERS.metric) p.set('m', filters.metric);
  if (filters.selectedInitiatives !== null) {
    for (const i of filters.selectedInitiatives) p.append('init', i);
  }
  if ((filters.minGrantAmount || 0) > 0) p.set('min', String(filters.minGrantAmount));
  if ((filters.minGrantCountPerCountry || 1) > 1) p.set('mincount', String(filters.minGrantCountPerCountry));
  if (viewMode === 'data') p.set('view', 'data');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function parseState(search: string, knownInitiatives?: string[]): ParsedUrlState {
  const p = new URLSearchParams(search);
  const filters: Partial<FilterState> = {};
  let yearProvided = false;

  const y = p.get('y');
  if (y) {
    const m = /^(\d{1,4})-(\d{1,4})$/.exec(y);
    if (m) {
      let lo = parseInt(m[1], 10);
      let hi = parseInt(m[2], 10);
      if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
        lo = Math.max(1984, Math.min(lo, hi));
        hi = Math.max(lo, hi);
        filters.yearRange = [lo, hi];
        yearProvided = true;
      }
    }
  }

  if (p.get('org') === '1') filters.orgOnly = true;
  if (p.get('nous') === '1') filters.excludeUS = true;
  if (p.get('infl') === '1') filters.inflationAdjust = true;

  const m = p.get('m');
  if (m && (VALID_METRICS as string[]).includes(m)) filters.metric = m as ChoroplethMetric;

  const inits = p.getAll('init').filter((i) => !knownInitiatives || knownInitiatives.length === 0 || knownInitiatives.includes(i));
  if (inits.length > 0) filters.selectedInitiatives = inits;

  const min = parseInt(p.get('min') || '', 10);
  if (!Number.isNaN(min) && min > 0) filters.minGrantAmount = min;

  const mc = parseInt(p.get('mincount') || '', 10);
  if (!Number.isNaN(mc) && mc > 1) filters.minGrantCountPerCountry = mc;

  const view = p.get('view');
  const viewMode: ViewMode | undefined = view === 'data' ? 'data' : undefined;

  return { filters, viewMode, yearProvided };
}
