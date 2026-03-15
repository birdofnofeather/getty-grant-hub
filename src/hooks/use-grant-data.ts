import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import type { CleanGrant, MapGrant, FilterState, CountryAgg } from '@/lib/grant-types';
import { INDIVIDUAL_INITIATIVES as INDIV_SET } from '@/lib/grant-types';

const CLEAN_SOURCES = [
  'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/main/getty_grants_clean.csv',
  'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/master/getty_grants_clean.csv',
  '/getty_grants_clean.csv',
];

const MAP_SOURCES = [
  'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/main/getty_grants_map.csv',
  'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/master/getty_grants_map.csv',
  '/getty_grants_map.csv',
];

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

const HONORIFICS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Professor ', 'Prof.', 'Miss ', 'Arq.'];

const SCOPED_INITIATIVES = new Set([
  'Central and Eastern European Initiative',
  'Research Grants (Team and Individual)',
]);

const ORG_KEYWORDS = /university|college|collegium|museum|institute|institut|foundation|fondation|stiftung|association|asociaci[oó]n|center|centre|academy|library|council|society|trust|fund|school|gallery|archive|research|national|international|royal|state|federal|regents|board|directorate|seminar|forum|program|programme|office|department|ministry|government|authority|agency|committee|commission|corporation|company|inc\.|ltd\.|llc|arts$/i;

function looksLikePersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (ORG_KEYWORDS.test(name)) return false;
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (/\d/.test(name)) return false;
  for (const word of words) {
    if (!/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\-'.]+$/.test(word)) return false;
  }
  return true;
}

function isIndividualGrant(row: { initiative: string; amountAwarded_USD: number; grantee_name: string }): boolean {
  // Signal 1: Initiative-level blanket rules
  if (INDIV_SET.has(row.initiative)) return true;
  if (row.initiative === 'Summer Institutes' && row.amountAwarded_USD < 5000) return true;

  // Signal 2: Honorific prefix check
  if (HONORIFICS.some(h => row.grantee_name.startsWith(h))) return true;

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

function parseClean(row: Record<string, string>): CleanGrant {
  const initiative = stripHtml(row.initiative || '');
  return {
    grantId: row.grantId || '',
    grantAwardYear: parseInt(row.grantAwardYear) || 0,
    amountAwarded_USD: parseFloat(row.amountAwarded_USD) || 0,
    initiative,
    grantee_name: row.grantee_name || '',
    projectTitle_clean: row.projectTitle_clean || '',
    is_partial_year: (row.is_partial_year || '').toLowerCase() === 'true',
  };
}

function parseMap(row: Record<string, string>): MapGrant {
  const initiative = stripHtml(row.initiative || '');
  return {
    grantId: row.grantId || '',
    grantAwardYear: parseInt(row.grantAwardYear) || 0,
    amountAwarded_USD: parseFloat(row.amountAwarded_USD) || 0,
    initiative,
    grantee_name: row.grantee_name || '',
    grantee_country: row.grantee_country || '',
    projectTitle_clean: row.projectTitle_clean || '',
    map_iso2: row.map_iso2 || '',
    map_country: row.map_country || '',
    map_city: row.map_city || '',
    location_source: row.location_source || '',
    is_partial_year: (row.is_partial_year || '').toLowerCase() === 'true',
  };
}

async function fetchCsv<T>(url: string, parser: (row: Record<string, string>) => T): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve((results.data as Record<string, string>[]).map(parser));
      },
      error: (err: Error) => reject(err),
    });
  });
}

async function fetchCsvFromSources<T>(sources: string[], parser: (row: Record<string, string>) => T): Promise<T[]> {
  const errors: string[] = [];

  for (const source of sources) {
    try {
      return await fetchCsv(source, parser);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${source} -> ${message}`);
    }
  }

  throw new Error(`Failed to load data from all sources. ${errors.join(' | ')}`);
}

function applyBaseFilters<T extends { grantAwardYear: number; initiative: string; amountAwarded_USD: number; grantee_name: string }>(
  data: T[],
  filters: FilterState
): T[] {
  return data.filter((row) => {
    if (row.grantAwardYear < filters.yearRange[0] || row.grantAwardYear > filters.yearRange[1]) return false;
    if (filters.orgOnly && isIndividualGrant(row)) return false;
    if (filters.selectedInitiatives && !filters.selectedInitiatives.includes(row.initiative)) return false;
    if (filters.minGrantAmount > 0 && row.amountAwarded_USD < filters.minGrantAmount) return false;
    return true;
  });
}

export function useGrantData(filters: FilterState) {
  const [cleanData, setCleanData] = useState<CleanGrant[]>([]);
  const [mapData, setMapData] = useState<MapGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchCsvFromSources(CLEAN_SOURCES, parseClean),
      fetchCsvFromSources(MAP_SOURCES, parseMap),
    ])
      .then(([clean, map]) => {
        setCleanData(clean);
        setMapData(map);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, []);

  const filteredClean = useMemo(() => applyBaseFilters(cleanData, filters), [cleanData, filters]);
  const filteredMap = useMemo(() => {
    const base = applyBaseFilters(mapData, filters);
    // PST LA/LA grants should only map to Los Angeles, USA
    const PST_LALA = 'Pacific Standard Time: LA/LA';
    const result: MapGrant[] = [];
    const pstGrantIds = new Set<string>();
    for (const row of base) {
      if (row.initiative === PST_LALA || row.initiative === 'Grants Outside of LA in support of Pacific Standard Time: LA/LA') {
        if (!pstGrantIds.has(row.grantId)) {
          pstGrantIds.add(row.grantId);
          result.push({ ...row, map_iso2: 'US', map_country: 'United States', map_city: 'Los Angeles', location_source: 'initiative_override' });
        }
      } else {
        result.push(row);
      }
    }
    return result;
  }, [mapData, filters]);

  const headlineStats = useMemo(() => {
    const totalUSD = filteredClean.reduce((s, r) => s + (r.amountAwarded_USD > 0 ? r.amountAwarded_USD : 0), 0);
    const grantCount = filteredClean.length;
    const hasPartialYear = filteredClean.some((r) => r.is_partial_year && r.grantAwardYear >= filters.yearRange[0] && r.grantAwardYear <= filters.yearRange[1]);
    return { totalUSD, grantCount, hasPartialYear };
  }, [filteredClean, filters.yearRange]);

  const countryAgg = useMemo(() => {
    const map = new Map<string, CountryAgg>();
    for (const row of filteredMap) {
      if (!row.map_iso2) continue;
      let agg = map.get(row.map_iso2);
      if (!agg) {
        agg = {
          iso2: row.map_iso2,
          name: row.map_country,
          grantCount: 0,
          totalUSD: 0,
          uniqueGrantees: 0,
          uniqueInitiatives: 0,
          longevity: 0,
          grantIds: new Set(),
        };
        map.set(row.map_iso2, agg);
      }
      agg.grantCount++;
      agg.grantIds.add(row.grantId);
    }

    // compute unique counts and longevity
    for (const [iso2, agg] of map) {
      const rows = filteredMap.filter((r) => r.map_iso2 === iso2);
      const grantees = new Set(rows.map((r) => r.grantee_name));
      const initiatives = new Set(rows.map((r) => r.initiative));
      const years = rows.map((r) => r.grantAwardYear);
      agg.uniqueGrantees = grantees.size;
      agg.uniqueInitiatives = initiatives.size;
      agg.longevity = years.length > 0 ? Math.max(...years) - Math.min(...years) : 0;

      // financial totals from clean CSV for matching grantIds
      const matchingClean = filteredClean.filter((c) => agg.grantIds.has(c.grantId));
      agg.totalUSD = matchingClean.reduce((s, c) => s + (c.amountAwarded_USD > 0 ? c.amountAwarded_USD : 0), 0);
    }

    // apply min grant count filter
    if (filters.minGrantCountPerCountry > 1) {
      for (const [iso2, agg] of map) {
        if (agg.grantIds.size < filters.minGrantCountPerCountry) {
          map.delete(iso2);
        }
      }
    }

    return map;
  }, [filteredMap, filteredClean, filters.minGrantCountPerCountry]);

  const allInitiatives = useMemo(() => {
    const set = new Set<string>();
    for (const row of cleanData) {
      if (row.initiative) set.add(row.initiative);
    }
    return Array.from(set).sort();
  }, [cleanData]);

  const maxYear = useMemo(() =>
    cleanData.length > 0
      ? Math.max(...cleanData.map(r => r.grantAwardYear))
      : 2026,
    [cleanData]
  );

  return {
    loading,
    error,
    cleanData,
    mapData,
    filteredClean,
    filteredMap,
    headlineStats,
    countryAgg,
    allInitiatives,
    maxYear,
  };
}
