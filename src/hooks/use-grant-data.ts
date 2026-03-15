import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import type { CleanGrant, MapGrant, FilterState, CountryAgg, INDIVIDUAL_INITIATIVES } from '@/lib/grant-types';
import { INDIVIDUAL_INITIATIVES as INDIV_SET } from '@/lib/grant-types';

const CLEAN_URL = 'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/main/getty_grants_clean.csv';
const MAP_URL = 'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/main/getty_grants_map.csv';

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

function isIndividual(initiative: string, amount: number): boolean {
  if (INDIV_SET.has(initiative)) return true;
  if (initiative === 'Summer Institutes' && amount < 5000) return true;
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

function fetchCsv<T>(url: string, parser: (row: Record<string, string>) => T): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve((results.data as Record<string, string>[]).map(parser));
      },
      error: (err: Error) => reject(err),
    });
  });
}

function applyBaseFilters<T extends { grantAwardYear: number; initiative: string; amountAwarded_USD: number }>(
  data: T[],
  filters: FilterState
): T[] {
  return data.filter((row) => {
    if (row.grantAwardYear < filters.yearRange[0] || row.grantAwardYear > filters.yearRange[1]) return false;
    if (filters.orgOnly && isIndividual(row.initiative, row.amountAwarded_USD)) return false;
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
    Promise.all([fetchCsv(CLEAN_URL, parseClean), fetchCsv(MAP_URL, parseMap)])
      .then(([clean, map]) => {
        setCleanData(clean);
        setMapData(map);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, []);

  const filteredClean = useMemo(() => applyBaseFilters(cleanData, filters), [cleanData, filters]);
  const filteredMap = useMemo(() => applyBaseFilters(mapData, filters), [mapData, filters]);

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
  };
}
