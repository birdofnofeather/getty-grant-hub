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
  it('CEEI is classified by grantee name, not amount (old $5k/$10k rule removed)', () => {
    // a person is individual regardless of amount
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 5000, 'Zdeno Kolesár'))).toBe(true);
    // the regression this fixes: an organization that happened to receive a $5k/$10k grant
    // used to be mislabeled individual — it must now be organizational
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 5000, 'The Fund for Arts and Culture in Central and Eastern Europe'))).toBe(false);
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 10000, 'The Fund for Arts and Culture in Central and Eastern Europe'))).toBe(false);
    // a multi-title academic name still resolves to a person
    expect(isIndividualGrant(g('Central and Eastern European Initiative', 8000, 'Assoc. Prof. PhDr. Ladislav Kesner'))).toBe(true);
  });
  it('name-pattern heuristic applies only in scoped initiatives', () => {
    expect(isIndividualGrant(g('Research Grants (Team and Individual)', 28000, 'Anthony Molho'))).toBe(true);
    expect(isIndividualGrant(g('Publications', 28000, 'Anthony Molho'))).toBe(true); // Publications is now name-scoped
    expect(isIndividualGrant(g('Keeping It Modern', 28000, 'Anthony Molho'))).toBe(false); // not a scoped initiative
  });
  it('Publications: scholars are individuals, publishers/institutions are organizations', () => {
    expect(isIndividualGrant(g('Publications', 20000, 'Richard De Puma'))).toBe(true);
    expect(isIndividualGrant(g('Publications', 20000, 'Akademie Verlag'))).toBe(false);
    expect(isIndividualGrant(g('Publications', 20000, 'The Frick Collection'))).toBe(false);
    expect(isIndividualGrant(g('Publications', 20000, 'Historic England'))).toBe(false);
    expect(isIndividualGrant(g('Publications', 20000, 'Universidad Nacional Autónoma de México'))).toBe(false);
    expect(isIndividualGrant(g('Publications', 20000, ' Dr. Thomas Gaehtgens'))).toBe(true); // leading-space honorific
  });
  it('org keywords beat the name heuristic', () => {
    expect(looksLikePersonName('Courtauld Institute of Art')).toBe(false);
    expect(looksLikePersonName('Akademie Verlag')).toBe(false);
    expect(looksLikePersonName('Ashgate Publishing Limited')).toBe(false);
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
