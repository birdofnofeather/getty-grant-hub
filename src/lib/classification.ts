// Pure, testable data-classification logic shared by the data hook, the dashboard,
// and the test suite. Mirrors scripts/getty_logic.py — keep the two in sync.
import type { MapGrant } from '@/lib/grant-types';
import { INDIVIDUAL_INITIATIVES as INDIV_SET } from '@/lib/grant-types';

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export const HONORIFICS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Professor ', 'Prof.', 'Miss ', 'Arq.'];

const SCOPED_INITIATIVES = new Set([
  'Central and Eastern European Initiative',
  'Research Grants (Team and Individual)',
]);

const ORG_KEYWORDS = /university|college|collegium|museum|institute|institut|foundation|fondation|stiftung|association|asociaci[oó]n|center|centre|academy|library|council|society|trust|fund|school|gallery|archive|research|national|international|royal|state|federal|regents|board|directorate|seminar|forum|program|programme|office|department|ministry|government|authority|agency|committee|commission|corporation|company|inc\.|ltd\.|llc|arts$/i;

export function looksLikePersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (ORG_KEYWORDS.test(name)) return false;
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (/\d/.test(name)) return false;
  for (const word of words) {
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\-'.]+$/.test(word)) return false;
  }
  return true;
}

export function isIndividualGrant(row: { initiative: string; amountAwarded_USD: number; grantee_name: string }): boolean {
  // Signal 1: Initiative-level blanket rules
  if (INDIV_SET.has(row.initiative)) return true;
  if (row.initiative === 'Summer Institutes' && row.amountAwarded_USD < 5000) return true;
  // Signal 2: Honorific prefix check
  if (HONORIFICS.some((h) => row.grantee_name.startsWith(h))) return true;
  // Signal 3: CEEI amount rule
  if (row.initiative === 'Central and Eastern European Initiative') {
    const amt = row.amountAwarded_USD;
    if (amt === 5000 || amt === 10000) return true;
  }
  // Signal 4: Name-pattern heuristic for scoped initiatives
  if (SCOPED_INITIATIVES.has(row.initiative)) {
    if (looksLikePersonName(row.grantee_name)) return true;
  }
  return false;
}

export const PST_INITIATIVES = new Set([
  'Pacific Standard Time: LA/LA',
  'Grants Outside of LA in support of Pacific Standard Time: LA/LA',
]);

// Three PST LA/LA grants genuinely funded work abroad and keep their original locations.
export const PST_KEEP_ORIGINAL = new Set(['201527020', '201526957', '20150007']);

// Apply the PST LA/LA map override: most PST grants collapse to a single
// Los Angeles, USA point; the three whitelisted grants keep their original rows.
export function applyPstOverride(base: MapGrant[]): MapGrant[] {
  const result: MapGrant[] = [];
  const seen = new Set<string>();
  for (const row of base) {
    if (PST_INITIATIVES.has(row.initiative)) {
      if (PST_KEEP_ORIGINAL.has(row.grantId)) {
        result.push(row);
      } else if (!seen.has(row.grantId)) {
        seen.add(row.grantId);
        result.push({ ...row, map_iso2: 'US', map_country: 'United States', map_city: 'Los Angeles', location_source: 'initiative_override' });
      }
    } else {
      result.push(row);
    }
  }
  return result;
}
