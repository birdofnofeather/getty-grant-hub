import { useState, useCallback, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import WorldMap from '@/components/WorldMap';
import FilterDrawer from '@/components/FilterDrawer';
import CountryDetailPanel from '@/components/CountryDetailPanel';
import DataDashboard from '@/components/DataDashboard';
import { useGrantData } from '@/hooks/use-grant-data';
import type { FilterState, DrawerMode } from '@/lib/grant-types';
import { DEFAULT_FILTERS } from '@/lib/grant-types';
import { HAS_METHODOLOGY } from '@/lib/site-config';
import { Link } from 'react-router-dom';
import { serializeState, parseState } from '@/lib/url-state';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';

type ViewMode = 'map' | 'data';

function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

const Index = () => {
  const initialUrl = parseState(window.location.search);
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialUrl.filters });
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrl.viewMode ?? 'map');
  const yearFromUrl = initialUrl.yearProvided;

  const { loading, error, headlineStats, countryAgg, grantCountries, adjust, allInitiatives, initiativeGroups, filteredMap, filteredClean, maxYear, lastDataDate, fullDataReady } = useGrantData(filters);

  // Extend year range to maxYear once data loads
  useEffect(() => {
    if (!loading && !yearFromUrl && maxYear > filters.yearRange[1]) {
      setFilters((prev) => ({ ...prev, yearRange: [prev.yearRange[0], maxYear] }));
    }
  }, [loading, maxYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the URL in sync with the current view (no history spam).
  useEffect(() => {
    const qs = serializeState(filters, viewMode, maxYear);
    window.history.replaceState(null, '', qs || window.location.pathname);
  }, [filters, viewMode, maxYear]);

  const copyLink = useCallback(() => {
    const url = window.location.origin + window.location.pathname + serializeState(filters, viewMode, maxYear);
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Could not copy link'),
    );
  }, [filters, viewMode, maxYear]);

  const updateFilters = useCallback((partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleDrawer = (mode: DrawerMode) => {
    setDrawerMode((prev) => (prev === mode ? 'none' : mode));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <header className="px-6 py-4 border-b bg-card flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            J. Paul Getty Trust — Grant Explorer
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every grant awarded by the Getty Foundation since 1984 · Updated monthly
          </p>
        </div>
        <div role="tablist" aria-label="View mode" className="inline-flex rounded-full border border-input bg-background p-0.5">
          <button
            role="tab"
            aria-selected={viewMode === 'map'}
            onClick={() => setViewMode('map')}
            className={`text-xs px-4 py-1.5 rounded-full transition-colors ${
              viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Map
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'data'}
            onClick={() => setViewMode('data')}
            className={`text-xs px-4 py-1.5 rounded-full transition-colors ${
              viewMode === 'data' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Data
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1600px] mx-auto space-y-4">
        {/* Headline stats */}
        {loading ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-20 flex-1 rounded-lg" />
            <Skeleton className="h-20 flex-1 rounded-lg" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
            Failed to load grant data: {error}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-card rounded-lg border p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Granted (USD)</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{formatUSD(headlineStats.totalUSD)}</div>
              {headlineStats.hasPartialYear && (
                <div className="text-[10px] text-muted-foreground mt-1">* {maxYear} data is partial (year in progress)</div>
              )}
            </div>
            <div className="flex-1 bg-card rounded-lg border p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Number of Grants</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{formatNum(headlineStats.grantCount)}</div>
            </div>
          </div>
        )}

        {/* Main view: map or data */}
        <div className="relative">
          {loading ? (
            <Skeleton className="w-full h-[520px] rounded-lg" />
          ) : !error ? (
            <>
              {viewMode === 'map' ? (
                <WorldMap
                  countryAgg={countryAgg}
                  metric={filters.metric}
                  onCountryClick={(iso2) => setSelectedCountry(iso2)}
                />
              ) : (
                <DataDashboard
                  filteredClean={filteredClean}
                  filteredMap={filteredMap}
                  countryAgg={countryAgg}
                  maxYear={maxYear}
                  adjust={adjust}
                  inflationAdjust={filters.inflationAdjust}
                  excludeUS={filters.excludeUS}
                />
              )}

              {/* Filter mode toggle buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => toggleDrawer('basic')}
                  className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                    drawerMode === 'basic'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-input hover:border-primary/50'
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => toggleDrawer('advanced')}
                  className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                    drawerMode === 'advanced'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-input hover:border-primary/50'
                  }`}
                >
                  Advanced
                </button>
                {!fullDataReady && (
                  <span className="text-[11px] text-muted-foreground self-center inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" aria-hidden="true" />
                    Loading full data…
                  </span>
                )}
                <button
                  onClick={copyLink}
                  className="text-xs px-3 py-1.5 rounded-full border border-input bg-card text-foreground hover:border-primary/50 transition-colors inline-flex items-center gap-1 ml-auto"
                  title="Copy a link to this exact view"
                >
                  <Link2 className="h-3 w-3" /> Copy link
                </button>
              </div>

              {/* Filter drawer */}
              <FilterDrawer
                mode={drawerMode}
                filters={filters}
                onChange={updateFilters}
                allInitiatives={allInitiatives}
                initiativeGroups={initiativeGroups}
                maxYear={maxYear}
                hideMapOnly={viewMode === 'data'}
                fullDataReady={fullDataReady}
              />
            </>
          ) : null}
        </div>

        {/* Country detail panel */}
        <CountryDetailPanel
          iso2={selectedCountry}
          countryAgg={countryAgg}
          filteredMap={filteredMap}
          filteredClean={filteredClean}
          grantCountries={grantCountries}
          adjust={adjust}
          onClose={() => setSelectedCountry(null)}
        />


        {/* Provenance footer */}
        {!loading && !error && (
          <footer className="pt-6 mt-2 border-t text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Data: Getty grants database</span>
            <span aria-hidden="true">·</span>
            <span>
              Last data update:{' '}
              {lastDataDate
                ? lastDataDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : '—'}
            </span>
            {HAS_METHODOLOGY && (
              <>
                <span aria-hidden="true">·</span>
                <Link to="/methodology" className="underline hover:text-foreground">Methodology</Link>
              </>
            )}
          </footer>
        )}
      </main>
    </div>
  );
};

export default Index;
