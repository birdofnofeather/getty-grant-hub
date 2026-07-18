import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import type { CleanGrant, MapGrant, FilterState, CountryAgg } from '@/lib/grant-types';
import { stripHtml, isIndividualGrant, applyPstOverride } from '@/lib/classification';

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

function parseClean(row: Record<string, string>): CleanGrant {
  const initiative = stripHtml(row.initiative || '');
  return {
    grantId: row.grantId || '',
    grantAwardDate: row.grantAwardDate || '',
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
    return applyPstOverride(base);
  }, [mapData, filters]);

  const headlineStats = useMemo(() => {
    const totalUSD = filteredClean.reduce((s, r) => s + (r.amountAwarded_USD > 0 ? r.amountAwarded_USD : 0), 0);
    const grantCount = filteredClean.length;
    const hasPartialYear = filteredClean.some((r) => r.is_partial_year && r.grantAwardYear >= filters.yearRange[0] && r.grantAwardYear <= filters.yearRange[1]);
    return { totalUSD, grantCount, hasPartialYear };
  }, [filteredClean, filters.yearRange]);

  // Multi-country dollar split (added July 2026): a grant that serves N countries
  // contributes amount/N to each country's total, so per-country totals no longer
  // double-count grants that span borders. grantCountries lists the distinct
  // countries each grant touches (after the PST override); its length is the
  // split denominator. Grant-level filters keep or drop a grant as a whole, so
  // this length equals the grant's intrinsic country span for any passing grant.
  const grantCountries = useMemo(() => {
    const gc = new Map<string, { iso2: string; name: string }[]>();
    for (const row of filteredMap) {
      if (!row.map_iso2) continue;
      let list = gc.get(row.grantId);
      if (!list) { list = []; gc.set(row.grantId, list); }
      if (!list.some((x) => x.iso2 === row.map_iso2)) list.push({ iso2: row.map_iso2, name: row.map_country });
    }
    return gc;
  }, [filteredMap]);

  const cleanById = useMemo(() => {
    const m = new Map<string, CleanGrant>();
    for (const c of filteredClean) m.set(c.grantId, c);
    return m;
  }, [filteredClean]);

  const countryAgg = useMemo(() => {
    const map = new Map<string, CountryAgg>();
    const rowsByIso = new Map<string, MapGrant[]>();
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
        rowsByIso.set(row.map_iso2, []);
      }
      agg.grantCount++;
      agg.grantIds.add(row.grantId);
      rowsByIso.get(row.map_iso2)!.push(row);
    }

    // compute unique counts, longevity, and split financial totals
    for (const [iso2, agg] of map) {
      const rows = rowsByIso.get(iso2)!;
      const grantees = new Set(rows.map((r) => r.grantee_name));
      const initiatives = new Set(rows.map((r) => r.initiative));
      const years = rows.map((r) => r.grantAwardYear);
      agg.uniqueGrantees = grantees.size;
      agg.uniqueInitiatives = initiatives.size;
      agg.longevity = years.length > 0 ? Math.max(...years) - Math.min(...years) : 0;

      // financial totals from clean CSV, split evenly across the grant's countries
      let total = 0;
      for (const gid of agg.grantIds) {
        const clean = cleanById.get(gid);
        const full = clean && clean.amountAwarded_USD > 0 ? clean.amountAwarded_USD : 0;
        if (full <= 0) continue;
        const denom = grantCountries.get(gid)?.length || 1;
        total += full / denom;
      }
      agg.totalUSD = total;
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
  }, [filteredMap, cleanById, grantCountries, filters.minGrantCountPerCountry]);

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

  // Most recent grant award date in the loaded data (dates are MM/DD/YYYY).
  const lastDataDate = useMemo(() => {
    let best: Date | null = null;
    for (const r of cleanData) {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(r.grantAwardDate || '');
      if (!m) continue;
      const d = new Date(+m[3], +m[1] - 1, +m[2]);
      if (!best || d > best) best = d;
    }
    return best;
  }, [cleanData]);

  return {
    loading,
    error,
    cleanData,
    mapData,
    filteredClean,
    filteredMap,
    headlineStats,
    countryAgg,
    grantCountries,
    allInitiatives,
    maxYear,
    lastDataDate,
  };
}
