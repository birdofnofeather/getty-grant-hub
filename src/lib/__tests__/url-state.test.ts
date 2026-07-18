import { describe, it, expect } from 'vitest';
import { serializeState, parseState } from '@/lib/url-state';
import { DEFAULT_FILTERS } from '@/lib/grant-types';
import type { FilterState } from '@/lib/grant-types';

const MAXY = 2026;

describe('URL state round-trip', () => {
  const cases: { name: string; filters: Partial<FilterState>; view: 'map' | 'data' }[] = [
    { name: 'defaults → empty query', filters: {}, view: 'map' },
    { name: 'year + org + metric', filters: { yearRange: [1990, 2015], orgOnly: true, metric: 'totalUSD' }, view: 'map' },
    { name: 'initiatives with special characters', filters: { selectedInitiatives: ['Research Resources (Archives, Catalogues, Research Centers)', 'PST ART: Art & Science Collide'] }, view: 'data' },
    { name: 'min amount + min count', filters: { minGrantAmount: 50000, minGrantCountPerCountry: 3 }, view: 'map' },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const filters: FilterState = { ...DEFAULT_FILTERS, yearRange: [1984, MAXY], ...c.filters };
      const qs1 = serializeState(filters, c.view, MAXY);
      const parsed = parseState(qs1);
      const rebuilt: FilterState = { ...DEFAULT_FILTERS, yearRange: [1984, MAXY], ...parsed.filters };
      const qs2 = serializeState(rebuilt, parsed.viewMode ?? 'map', MAXY);
      expect(qs2).toBe(qs1); // serialize→parse→serialize is stable
    });
  }

  it('defaults produce no query string', () => {
    expect(serializeState({ ...DEFAULT_FILTERS, yearRange: [1984, MAXY] }, 'map', MAXY)).toBe('');
  });

  it('rejects out-of-range years and unknown initiatives', () => {
    const p = parseState('?y=1700-3000&init=Nonexistent', ['Keeping It Modern']);
    expect(p.filters.yearRange![0]).toBeGreaterThanOrEqual(1984);
    expect(p.filters.selectedInitiatives).toBeUndefined();
  });
});
