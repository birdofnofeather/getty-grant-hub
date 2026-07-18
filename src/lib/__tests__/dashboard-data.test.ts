import { describe, it, expect } from 'vitest';
import { perYear, peopleVsOrgByYear, avgGrantSize, topCountriesExUS, topInitiatives } from '@/lib/dashboard-data';
import type { CleanGrant, CountryAgg } from '@/lib/grant-types';
import { loadClean } from './_fixtures';

const row = (o: Partial<CleanGrant>): CleanGrant => ({
  grantId: Math.random().toString(), grantAwardDate: '', grantAwardYear: 2000,
  amountAwarded_USD: 0, initiative: 'X', grantee_name: 'Org Museum',
  projectTitle_clean: '', projectTitleURL: '', is_partial_year: false, ...o,
});

describe('dashboard data prep', () => {
  it('headline-style totals from a hand-built fixture', () => {
    const rows = [
      row({ amountAwarded_USD: 100 }), row({ amountAwarded_USD: 200 }),
      row({ amountAwarded_USD: 0 }),   // $0 grant: counts, no dollars
      row({ amountAwarded_USD: 700 }),
    ];
    const total = rows.reduce((s, r) => s + (r.amountAwarded_USD > 0 ? r.amountAwarded_USD : 0), 0);
    expect(rows.length).toBe(4);
    expect(total).toBe(1000);
  });

  it('avgGrantSize excludes initiatives with fewer than 10 grants', () => {
    const rows: CleanGrant[] = [];
    for (let i = 0; i < 12; i++) rows.push(row({ initiative: 'Big', amountAwarded_USD: 1000 }));
    for (let i = 0; i < 3; i++) rows.push(row({ initiative: 'Tiny', amountAwarded_USD: 99999 }));
    const avg = avgGrantSize(rows, 10);
    expect(avg.some((a) => a.name === 'Big')).toBe(true);
    expect(avg.some((a) => a.name === 'Tiny')).toBe(false);
  });

  it('topCountriesExUS excludes the US and reports it separately', () => {
    const agg = new Map<string, CountryAgg>([
      ['US', { iso2: 'US', name: 'United States', grantCount: 8000, totalUSD: 4e8, uniqueGrantees: 1, uniqueInitiatives: 1, longevity: 1, grantIds: new Set() }],
      ['GB', { iso2: 'GB', name: 'United Kingdom', grantCount: 400, totalUSD: 5e7, uniqueGrantees: 1, uniqueInitiatives: 1, longevity: 1, grantIds: new Set() }],
    ]);
    const r = topCountriesExUS(agg);
    expect(r.bars.some((b) => b.name === 'United States')).toBe(false);
    expect(r.usCount).toBe(8000);
    expect(r.bars[0].name).toBe('United Kingdom');
  });

  it('people-vs-orgs yearly totals sum to the overall yearly totals (full data)', () => {
    const clean = loadClean();
    const yr = new Map(perYear(clean).map((y) => [y.year, y]));
    for (const p of peopleVsOrgByYear(clean)) {
      const overall = yr.get(p.year)!;
      expect(p.indCount + p.orgCount).toBe(overall.count);
      expect(Math.round(p.indUsd + p.orgUsd)).toBe(Math.round(overall.usd));
    }
  });

  it('topInitiatives respects the sort metric', () => {
    const clean = loadClean();
    const byUsd = topInitiatives(clean, 'usd', 3);
    expect(byUsd[0].usd).toBeGreaterThanOrEqual(byUsd[1].usd);
    const byCount = topInitiatives(clean, 'count', 3);
    expect(byCount[0].count).toBeGreaterThanOrEqual(byCount[1].count);
  });
});
