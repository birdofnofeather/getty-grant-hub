// Pure data-prep functions for the Data dashboard. Extracted from the component
// so they can be unit-tested independently.
import type { CleanGrant, CountryAgg } from '@/lib/grant-types';
import { isIndividualGrant } from '@/lib/classification';
import type { Adjuster } from '@/lib/inflation';

const defaultAdjust: Adjuster = (usd) => (usd > 0 ? usd : 0);

export interface YearRow { year: number; count: number; usd: number; }

export function perYear(rows: CleanGrant[], adjust: Adjuster = defaultAdjust): YearRow[] {
  const m = new Map<number, YearRow>();
  for (const r of rows) {
    const y = r.grantAwardYear;
    if (!y) continue;
    let a = m.get(y);
    if (!a) { a = { year: y, count: 0, usd: 0 }; m.set(y, a); }
    a.count++; a.usd += adjust(r.amountAwarded_USD, y);
  }
  return Array.from(m.values()).sort((a, b) => a.year - b.year);
}

export interface PeopleOrgRow { year: number; indCount: number; orgCount: number; indUsd: number; orgUsd: number; }

export function peopleVsOrgByYear(rows: CleanGrant[], adjust: Adjuster = defaultAdjust): PeopleOrgRow[] {
  const m = new Map<number, PeopleOrgRow>();
  for (const r of rows) {
    const y = r.grantAwardYear;
    if (!y) continue;
    let a = m.get(y);
    if (!a) { a = { year: y, indCount: 0, orgCount: 0, indUsd: 0, orgUsd: 0 }; m.set(y, a); }
    const usd = adjust(r.amountAwarded_USD, y);
    if (isIndividualGrant(r)) { a.indCount++; a.indUsd += usd; }
    else { a.orgCount++; a.orgUsd += usd; }
  }
  return Array.from(m.values()).sort((a, b) => a.year - b.year);
}

export function topInitiatives(rows: CleanGrant[], by: 'usd' | 'count', limit = 12, adjust: Adjuster = defaultAdjust) {
  const m = new Map<string, { name: string; count: number; usd: number }>();
  for (const r of rows) {
    const key = r.initiative || '(Unspecified)';
    let a = m.get(key);
    if (!a) { a = { name: key, count: 0, usd: 0 }; m.set(key, a); }
    a.count++; a.usd += adjust(r.amountAwarded_USD, r.grantAwardYear);
  }
  return Array.from(m.values()).sort((a, b) => (by === 'usd' ? b.usd - a.usd : b.count - a.count)).slice(0, limit);
}

export function avgGrantSize(rows: CleanGrant[], minGrants = 10, limit = 12, adjust: Adjuster = defaultAdjust) {
  const m = new Map<string, { name: string; sum: number; count: number }>();
  for (const r of rows) {
    const key = r.initiative || '(Unspecified)';
    let a = m.get(key);
    if (!a) { a = { name: key, sum: 0, count: 0 }; m.set(key, a); }
    a.count++; a.sum += adjust(r.amountAwarded_USD, r.grantAwardYear);
  }
  return Array.from(m.values())
    .filter((x) => x.count >= minGrants)
    .map((x) => ({ name: x.name, avg: Math.round(x.sum / x.count), count: x.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

export function topCountriesExUS(countryAgg: Map<string, CountryAgg>, limit = 12) {
  const all = Array.from(countryAgg.values());
  const us = all.find((c) => c.iso2 === 'US');
  const bars = all
    .filter((c) => c.iso2 !== 'US')
    .map((c) => ({ name: c.name || c.iso2, count: c.grantCount, usd: c.totalUSD }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return { bars, usCount: us ? us.grantCount : 0, usUsd: us ? us.totalUSD : 0 };
}

// Same shape as topCountriesExUS but sorted by USD (for the "By dollars" toggle).
export function topCountriesExUSByUsd(countryAgg: Map<string, CountryAgg>, limit = 12) {
  const all = Array.from(countryAgg.values());
  const us = all.find((c) => c.iso2 === 'US');
  const bars = all
    .filter((c) => c.iso2 !== 'US')
    .map((c) => ({ name: c.name || c.iso2, count: c.grantCount, usd: c.totalUSD }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, limit);
  return { bars, usCount: us ? us.grantCount : 0, usUsd: us ? us.totalUSD : 0 };
}

export function sizeBuckets(rows: CleanGrant[]) {
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
    count: rows.filter((r) => r.amountAwarded_USD >= b.min && r.amountAwarded_USD < b.max).length,
  }));
}

export function cumulativeUSD(years: YearRow[]) {
  let cum = 0;
  return years.map((p) => ({ year: p.year, cumulative: (cum += p.usd) }));
}
