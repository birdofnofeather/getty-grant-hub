// Pure, testable data-classification logic shared by the data hook, the dashboard,
// and the test suite. Mirrors scripts/getty_logic.py — keep the two in sync.
import type { MapGrant } from '@/lib/grant-types';
import { INDIVIDUAL_INITIATIVES as INDIV_SET } from '@/lib/grant-types';

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export const HONORIFICS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Professor ', 'Prof.', 'Miss ', 'Arq.'];

export const SCOPED_INITIATIVES = new Set([
  'Central and Eastern European Initiative',
  'Research Grants (Team and Individual)',
  'Publications',
]);

// Leading title tokens stripped before person-name matching (academic / courtesy titles).
export const LEADING_TITLES = new Set([
  'dr.', 'dr', 'mr.', 'ms.', 'mrs.', 'prof.', 'professor', 'miss', 'arq.', 'assoc.', 'phdr.',
  'mx.', 'm.', 'doç.', 'doc.', 'sir', 'dame', 'hon.', 'ph.d.', 'phd.',
]);

export const ORG_KEYWORDS = /university|college|collegium|museum|institute|institut|foundation|fondation|stiftung|association|asociaci[oó]n|center|centre|academy|library|council|society|trust|fund|school|gallery|archive|research|national|international|royal|state|federal|regents|board|directorate|seminar|forum|program|programme|office|department|ministry|government|authority|agency|committee|commission|corporation|company|inc\.|ltd\.|llc|verlag|akademie|akademia|academie|académie|universidad|università|universit[eé]|universität|universitat|editorial|edizioni|ediciones|éditions|\beditions\b|publish|\bpress\b|\bbooks?\b|comit[ée]|comitato|\bente\b|\bleague\b|ligue|\bcollection\b|collezione|colecci[oó]n|\bconference\b|congress|congreso|colloqu|symposium|gesellschaft|verein|santuario|pontific|passionist|gmbh|\bltda\b|\blimited\b|\bco\.|\bn\.v\.|\bb\.v\.|\bs\.a\.|\bs\.l\.|\bs\.p\.a\.|heritage|\bhistoric|arts$/i;

export function looksLikePersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (ORG_KEYWORDS.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;
  let words = trimmed.split(/\s+/);
  while (words.length && LEADING_TITLES.has(words[0].toLowerCase())) words = words.slice(1);
  if (words.length < 2 || words.length > 4) return false;
  for (const word of words) {
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\-'.]+$/.test(word)) return false;
  }
  return true;
}

export function isIndividualGrant(row: { initiative: string; amountAwarded_USD: number; grantee_name: string }): boolean {
  const name = (row.grantee_name ?? '').trim();
  // Signal 1: Initiative-level blanket rules
  if (INDIV_SET.has(row.initiative)) return true;
  if (row.initiative === 'Summer Institutes' && row.amountAwarded_USD < 5000) return true;
  // Signal 2: Honorific / title prefix check
  if (HONORIFICS.some((h) => name.startsWith(h))) return true;
  // Signal 3: Scoped initiatives (CEEI, Research Grants, Publications) — decide by grantee name.
  // A person is identified by honorific/title or a person-name shape; organizations are caught
  // by the keyword list in looksLikePersonName. (The old CEEI "amount === $5k/$10k means
  // individual" rule was removed 2026-07 — it mislabeled orgs that received $5k/$10k grants.)
  if (SCOPED_INITIATIVES.has(row.initiative)) {
    if (looksLikePersonName(name)) return true;
  }
  return false;
}

export const PST_INITIATIVES = new Set([
  'Pacific Standard Time: LA/LA',
  'Grants Outside of LA in support of Pacific Standard Time: LA/LA',
  'PST ART: Art & Science Collide',
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
