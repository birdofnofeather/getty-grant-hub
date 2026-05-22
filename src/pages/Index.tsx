import { useState, useCallback, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import WorldMap from '@/components/WorldMap';
import FilterDrawer from '@/components/FilterDrawer';
import CountryDetailPanel from '@/components/CountryDetailPanel';
import DataDashboard from '@/components/DataDashboard';
import { useGrantData } from '@/hooks/use-grant-data';
import type { FilterState, DrawerMode } from '@/lib/grant-types';
import { DEFAULT_FILTERS } from '@/lib/grant-types';

type ViewMode = 'map' | 'data';

function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

const Index = () => {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const { loading, error, headlineStats, countryAgg, allInitiatives, filteredMap, filteredClean, maxYear } = useGrantData(filters);

  // Extend year range to maxYear once data loads
  useEffect(() => {
    if (!loading && maxYear > filters.yearRange[1]) {
      setFilters((prev) => ({ ...prev, yearRange: [prev.yearRange[0], maxYear] }));
    }
  }, [loading, maxYear]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          J. Paul Getty Trust — Grant Explorer
        </h1>
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
          <div className="flex gap-4">
            <Skeleton className="h-20 flex-1 rounded-lg" />
            <Skeleton className="h-20 flex-1 rounded-lg" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
            Failed to load grant data: {error}
          </div>
        ) : (
          <div className="flex gap-4">
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
              </div>

              {/* Filter drawer */}
              <FilterDrawer
                mode={drawerMode}
                filters={filters}
                onChange={updateFilters}
                allInitiatives={allInitiatives}
                maxYear={maxYear}
                hideMapOnly={viewMode === 'data'}
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
          onClose={() => setSelectedCountry(null)}
        />
      </main>
    </div>
  );
};

export default Index;
