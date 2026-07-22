import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import type { CleanGrant, MapGrant, FilterState, CountryAgg, AggData, InitiativeGroups } from '@/lib/grant-types';
import { stripHtml, isIndividualGrant, applyPstOverride } from '@/lib/classification';
import { makeAdjuster } from '@/lib/inflation';

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

const AGG_SOURCES = [
  'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/main/getty_grants_agg.json',
  'https://raw.githubusercontent.com/birdofnofeather/getty-grant-hub/master/getty_grants_agg.json',
  '/getty_grants_agg.json',
];

async function fetchJsonFromSources<T>(sources: string[]): Promise<T> {
  const errors: string[] = [];
  for (const source of sources) {
    try {
      const r = await fetch(source);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as T;
    } catch (e) {
      errors.push(`${source} -> ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`Failed to load aggregates. ${errors.join(' | ')}`);
}

// Whether the current filters keep the FULL scope of grants (so precomputed
// aggregates apply). Grant-level filters: year range, initiative subset, min amount.
function isFullScope(filters: FilterState, maxYear: number): boolean {
  return (
    filters.yearRange[0] <= 1984 &&
    filters.yearRange[1] >= maxYear &&
    filters.selectedInitiatives === null &&
    (filters.minGrantAmount || 0) <= 0 &&
    !filters.excludeUS &&
    !filters.inflationAdjust
  );
}

function parseClean(row: Record<string, string>): CleanGrant {
  const initiative = stripHtml(row.initiative || '');
  return {
    grantId: row.grantId || '',
    grantAwardDate: row.grantAwardDate || '',
    grantAwardYear: parseInt(row.grantAwardYear) || 0,
    amountAwarded_USD: parseFloat(row.amountAwarded_USD) || 0,
    initiative,
    initiativeType: stripHtml(row.initiativeType || ''),
    pastInitiative: row.pastInitiative || '',
    grantee_name: row.grantee_name || '',
    projectTitle_clean: row.projectTitle_clean || '',
    projectTitleURL: row.projectTitleURL || '',
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
  const [aggData, setAggData] = useState<AggData | null>(null);
  const [csvReady, setCsvReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aggOk = false;

    // 1) Fetch tiny aggregates first for instant map + headline (no filters needed).
    fetchJsonFromSources<AggData>(AGG_SOURCES)
      .then((agg) => { aggOk = true; setAggData(agg); setError(null); setLoading(false); })
      .catch(() => { /* older deploys may lack the JSON; CSVs will drive first paint */ });

    // 2) Fetch full CSVs in the background; these power all filtering.
    Promise.all([
      fetchCsvFromSources(CLEAN_SOURCES, parseClean),
      fetchCsvFromSources(MAP_SOURCES, parseMap),
    ])
      .then(([clean, map]) => {
        setCleanData(clean);
        setMapData(map);
        setError(null);
        setCsvReady(true);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        // Only surface an error if the aggregates didn't render anything either.
        if (!aggOk) setError(err.message || 'Failed to load data');
      });
  }, []);

  // Grants that touch the US on the map (any row where map_iso2 === 'US').
  // Used to implement "Exclude U.S." — an all-or-nothing filter that removes
  // the grant from every view, including its non-US country rows.
  const usGrantIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of mapData) if (r.map_iso2 === 'US') s.add(r.grantId);
    return s;
  }, [mapData]);

  const adjust = useMemo(() => makeAdjuster(filters.inflationAdjust), [filters.inflationAdjust]);

  const filteredClean = useMemo(() => {
    const base = applyBaseFilters(cleanData, filters);
    return filters.excludeUS ? base.filter((r) => !usGrantIds.has(r.grantId)) : base;
  }, [cleanData, filters, usGrantIds]);
  const filteredMap = useMemo(() => {
    let base = applyBaseFilters(mapData, filters);
    if (filters.excludeUS) base = base.filter((r) => !usGrantIds.has(r.grantId));
    return applyPstOverride(base);
  }, [mapData, filters, usGrantIds]);

  const headlineStats = useMemo(() => {
    // Before the full CSVs arrive, serve the default (and org-only) totals from the
    // tiny precomputed aggregates so the headline is correct and instant.
    if (!csvReady && aggData && !filters.excludeUS && !filters.inflationAdjust) {
      const h = filters.orgOnly ? aggData.headlineOrg : aggData.headline;
      return { totalUSD: h.totalUSD, grantCount: h.grantCount, hasPartialYear: filters.yearRange[1] >= aggData.maxYear };
    }
    const totalUSD = filteredClean.reduce((s, r) => s + adjust(r.amountAwarded_USD, r.grantAwardYear), 0);
    const grantCount = filteredClean.length;
    const hasPartialYear = filteredClean.some((r) => r.is_partial_year && r.grantAwardYear >= filters.yearRange[0] && r.grantAwardYear <= filters.yearRange[1]);
    return { totalUSD, grantCount, hasPartialYear };
  }, [csvReady, aggData, filters.orgOnly, filters.excludeUS, filters.inflationAdjust, filteredClean, filters.yearRange, adjust]);

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
    // Before CSVs arrive, render the default map from precomputed aggregates.
    if (!csvReady && aggData && !filters.orgOnly && isFullScope(filters, aggData.maxYear) && filters.minGrantCountPerCountry <= 1) {
      const am = new Map<string, CountryAgg>();
      for (const c of aggData.countries) {
        am.set(c.iso2, {
          iso2: c.iso2, name: c.name, grantCount: c.count, totalUSD: c.usd,
          uniqueGrantees: c.grantees, uniqueInitiatives: c.initiatives,
          longevity: c.maxYear - c.minYear, grantIds: new Set(),
        });
      }
      return am;
    }

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
        const year = clean ? clean.grantAwardYear : 0;
        total += adjust(full, year) / denom;
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
  }, [csvReady, aggData, filters, filteredMap, cleanById, grantCountries, filters.minGrantCountPerCountry]);

  const allInitiatives = useMemo(() => {
    const set = new Set<string>();
    for (const row of cleanData) {
      if (row.initiative) set.add(row.initiative);
    }
    return Array.from(set).sort();
  }, [cleanData]);

  // Initiative grouping derived from the data (initiativeType / pastInitiative)
  // instead of hardcoded lists, so new initiatives are classified automatically.
  const initiativeGroups = useMemo<InitiativeGroups>(() => {
    const info = new Map<string, { anyPast: boolean; anyCurrent: boolean }>();
    for (const row of cleanData) {
      if (!row.initiative) continue;
      let a = info.get(row.initiative);
      if (!a) { a = { anyPast: false, anyCurrent: false }; info.set(row.initiative, a); }
      const t = (row.initiativeType || '').toLowerCase();
      if (t === 'past' || (row.pastInitiative && row.pastInitiative.trim() !== '')) a.anyPast = true;
      if (t === 'current') a.anyCurrent = true;
    }
    const current: string[] = [], past: string[] = [], other: string[] = [];
    for (const [name, a] of info) {
      if (a.anyCurrent && !a.anyPast) current.push(name);
      else if (a.anyPast) past.push(name);
      else other.push(name);
    }
    current.sort(); past.sort(); other.sort();
    return { current, past, other };
  }, [cleanData]);

  const maxYear = useMemo(() =>
    cleanData.length > 0
      ? Math.max(...cleanData.map(r => r.grantAwardYear))
      : (aggData?.maxYear ?? 2026),
    [cleanData, aggData]
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
    initiativeGroups,
    maxYear,
    lastDataDate,
    fullDataReady: csvReady,
  };
}
