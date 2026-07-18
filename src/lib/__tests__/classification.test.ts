import { describe, it, expect } from 'vitest';
import { isIndividualGrant, applyPstOverride, looksLikePersonName } from '@/lib/classification';
import type { MapGrant } from '@/lib/grant-types';
import { loadClean, loadBaselines } from './_fixtures';

const g = (initiative: string, amountAwarded_USD: number, grantee_name: string) => ({ initiative, amountAwarded_USD, grantee_name });

describe('individual vs organizational classification', () => {
  it('the "Miss " trap: Mississippi University for Women Foundation is organizational', () => {
    expect(isIndividualGrant(g('Publications', 20000, 'Mississippi University for Women Foundation'))).toBe(false);
  });
  it('an actual honorific is individual', () => {
    expect(isIndividualGrant(g('Publications', 20000, 'Miss Jane Doe'))).toBe(true);
    expect(isIndividualGrant(g('Anything', 0, 'Dr. Zoran Eric'))).toBe(true);
  });
  it('blanket individual initiative', () => {
    expect(isIndividualGrant(g('Getty Marrow Undergraduate Internships', 6200, 'Some Museum'))).toBe(true);
  });
  it('Summer Institutes amount rule', () => {
    expect(isIndividualGrant(g('Summer Institutes', 1890, 'Jane Roe'))).toBe(true);
    expect(isIndividualGrant(g('Summer Institutes', 16000, 'The Big Institute'))).toBe(false);
  });
  it('CEEI amount rule', () => {
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 5000, 'Anon Person'))).toBe(true);
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 10000, 'Anon Person'))).toBe(true);
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 10800, 'Some Fondation'))).toBe(false);
  });
  it('name-pattern heuristic only in scoped initiatives', () => {
    expect(isIndividualGrant(g('Research Grants (Team and Individual)', 28000, 'Anthony Molho'))).toBe(true);
    expect(isIndividualGrant(g('Publications', 28000, 'Anthony Molho'))).toBe(false); // not a scoped initiative
  });
  it('org keywords beat the name heuristic', () => {
    expect(looksLikePersonName('Courtauld Institute of Art')).toBe(false);
    expect(looksLikePersonName('Anthony Molho')).toBe(true);
  });

  it('full-data totals match derived baselines exactly', () => {
    const clean = loadClean();
    const base = loadBaselines();
    const ind = clean.filter((r) => isIndividualGrant(r));
    const org = clean.filter((r) => !isIndividualGrant(r));
    const sum = (rows: typeof clean) => rows.reduce((s, r) => s + (r.amountAwarded_USD > 0 ? r.amountAwarded_USD : 0), 0);
    expect(clean.length).toBe(base.total.count);
    expect(ind.length).toBe(base.individual.count);
    expect(org.length).toBe(base.organizational.count);
    expect(sum(org)).toBe(base.organizational.usd);
    expect(sum(ind)).toBe(base.individual.usd);
  });
});

describe('PST LA/LA map override', () => {
  const pst = (grantId: string, iso: string): MapGrant => ({
    grantId, grantAwardYear: 2016, amountAwarded_USD: 100000,
    initiative: 'Pacific Standard Time: LA/LA', grantee_name: 'X', grantee_country: 'Mexico',
    projectTitle_clean: 'T', map_iso2: iso, map_country: iso === 'MX' ? 'Mexico' : 'Brazil',
    map_city: '', location_source: 'project', is_partial_year: false,
  });

  it('non-whitelisted PST grants collapse to a single US/Los Angeles point', () => {
    const out = applyPstOverride([pst('999', 'MX'), pst('999', 'BR')]);
    expect(out).toHaveLength(1);
    expect(out[0].map_iso2).toBe('US');
    expect(out[0].map_country).toBe('United States');
    expect(out[0].map_city).toBe('Los Angeles');
    expect(out[0].location_source).toBe('initiative_override');
  });
  it('whitelisted grants keep their original locations', () => {
    const out = applyPstOverride([pst('201527020', 'MX'), pst('201527020', 'BR')]);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.map_iso2).sort()).toEqual(['BR', 'MX']);
  });
  it('non-PST rows pass through unchanged', () => {
    const row: MapGrant = { ...pst('1', 'IT'), initiative: 'Keeping It Modern', map_country: 'Italy' };
    expect(applyPstOverride([row])[0]).toEqual(row);
  });
  it('no PST grantId appears twice after override', () => {
    const out = applyPstOverride([pst('7', 'MX'), pst('7', 'BR'), pst('8', 'MX')]);
    const ids = out.map((r) => r.grantId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
