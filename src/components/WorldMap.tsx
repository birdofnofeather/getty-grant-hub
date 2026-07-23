import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { CountryAgg, ChoroplethMetric } from '@/lib/grant-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { getColorRange, hclGradient, makeColorScale } from '@/lib/map-colors';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO numeric → ISO alpha-2 mapping (subset for matching)
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '004':'AF','008':'AL','012':'DZ','016':'AS','020':'AD','024':'AO','028':'AG','031':'AZ','032':'AR','036':'AU',
  '040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE','060':'BM','064':'BT','068':'BO',
  '070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','092':'VG','096':'BN','100':'BG','104':'MM','108':'BI',
  '112':'BY','116':'KH','120':'CM','124':'CA','132':'CV','140':'CF','144':'LK','148':'TD','152':'CL','156':'CN',
  '158':'TW','170':'CO','174':'KM','178':'CG','180':'CD','184':'CK','188':'CR','191':'HR','192':'CU','196':'CY',
  '203':'CZ','204':'BJ','208':'DK','212':'DM','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER',
  '233':'EE','234':'FO','238':'FK','242':'FJ','246':'FI','250':'FR','254':'GF','258':'PF','262':'DJ','266':'GA',
  '268':'GE','270':'GM','275':'PS','276':'DE','288':'GH','300':'GR','304':'GL','308':'GD','312':'GP','316':'GU',
  '320':'GT','324':'GN','328':'GY','332':'HT','340':'HN','344':'HK','348':'HU','352':'IS','356':'IN','360':'ID',
  '364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO',
  '404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS','428':'LV','430':'LR',
  '434':'LY','438':'LI','440':'LT','442':'LU','450':'MG','454':'MW','458':'MY','462':'MV','466':'ML','470':'MT',
  '474':'MQ','478':'MR','480':'MU','484':'MX','492':'MC','496':'MN','498':'MD','499':'ME','504':'MA','508':'MZ',
  '512':'OM','516':'NA','520':'NR','524':'NP','528':'NL','540':'NC','554':'NZ','558':'NI','562':'NE','566':'NG',
  '578':'NO','586':'PK','591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','624':'GW',
  '626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW','682':'SA','686':'SN','688':'RS','694':'SL',
  '702':'SG','703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA','716':'ZW','724':'ES','728':'SS','729':'SD',
  '740':'SR','748':'SZ','752':'SE','756':'CH','760':'SY','762':'TJ','764':'TH','768':'TG','776':'TO','780':'TT',
  '784':'AE','788':'TN','792':'TR','795':'TM','800':'UG','804':'UA','807':'MK','818':'EG','826':'GB','834':'TZ',
  '840':'US','854':'BF','858':'UY','860':'UZ','862':'VE','887':'YE','894':'ZM',
  '-99':'XK', // Kosovo
};

function getMetricValue(agg: CountryAgg, metric: ChoroplethMetric): number {
  switch (metric) {
    case 'grantCount': return agg.grantCount;
    case 'totalUSD': return agg.totalUSD;
    case 'uniqueGrantees': return agg.uniqueGrantees;
    case 'uniqueInitiatives': return agg.uniqueInitiatives;
    case 'longevity': return agg.longevity;
    default: return 0;
  }
}

function getMetricLabel(metric: ChoroplethMetric): string {
  switch (metric) {
    case 'grantCount': return 'Grant Count';
    case 'totalUSD': return 'Total USD Awarded';
    case 'uniqueGrantees': return 'Unique Grantees';
    case 'uniqueInitiatives': return 'Unique Initiatives';
    case 'longevity': return 'Relationship Longevity (years)';
    default: return '';
  }
}

function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

function tooltipContent(agg: CountryAgg, metric: ChoroplethMetric, mobileHint = false): React.ReactNode {
  return (
    <div>
      <div className="font-semibold mb-1">{agg.name}</div>
      <div>Total Granted: {formatUSD(agg.totalUSD)}</div>
      <div>Grants: {formatNum(agg.grantCount)}</div>
      {metric !== 'none' && (
        <div>{getMetricLabel(metric)}: {metric === 'totalUSD' ? formatUSD(getMetricValue(agg, metric)) : formatNum(getMetricValue(agg, metric))}</div>
      )}
      {mobileHint && <div className="mt-1 text-white/60">Tap again for details</div>}
    </div>
  );
}

const UNIFORM_COLOR = '#2563eb';
const NO_GRANT_COLOR = '#2a2f3a';

interface WorldMapProps {
  countryAgg: Map<string, CountryAgg>;
  metric: ChoroplethMetric;
  onCountryClick: (iso2: string) => void;
}

export default function WorldMap({ countryAgg, metric, onCountryClick }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({ coordinates: [0, 0], zoom: 1 });
  const [pendingCountry, setPendingCountry] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const zoomIn = useCallback(() => setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) })), []);
  const zoomOut = useCallback(() => setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) })), []);
  const resetZoom = useCallback(() => setPosition({ coordinates: [0, 0], zoom: 1 }), []);

  // Cap the domain at the second-highest country's value so the single top
  // country (often the US, or the next leader when the US is excluded) renders
  // at full intensity without collapsing the scale for everyone else.
  const cappedMax = useMemo(() => {
    const values = Array.from(countryAgg.values())
      .map((a) => getMetricValue(a, metric))
      .filter((v) => v > 0)
      .sort((a, b) => b - a);
    if (values.length === 0) return null;
    return values.length > 1 ? values[1] : values[0];
  }, [countryAgg, metric]);

  const colorScale = useMemo(() => {
    if (metric === 'none' || cappedMax == null) return null;
    const allValues = Array.from(countryAgg.values()).map((a) => getMetricValue(a, metric)).filter((v) => v > 0);
    const min = Math.min(...allValues);
    if (min === cappedMax) return null;
    return makeColorScale(min, cappedMax, metric);
  }, [countryAgg, metric, cappedMax]);

  const legendRange = useMemo(() => {
    if (metric === 'none' || !colorScale || cappedMax == null) return null;
    const allValues = Array.from(countryAgg.values()).map((a) => getMetricValue(a, metric)).filter((v) => v > 0);
    if (allValues.length === 0) return null;
    const min = Math.max(Math.min(...allValues), 1);
    const [colorMin, colorMax] = getColorRange(metric);
    const fmt = metric === 'totalUSD' ? formatUSD : formatNum;
    return { colorMin, colorMax, gradient: hclGradient(colorMin, colorMax), minLabel: fmt(Math.round(min)), maxLabel: fmt(Math.round(cappedMax)) };
  }, [countryAgg, metric, colorScale, cappedMax]);


  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen((v) => !v);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  }, [tooltip]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-lg overflow-hidden ${isFullscreen ? 'bg-[#0f172a]' : ''}`}
      style={{ backgroundColor: '#0f172a' }}
      onMouseMove={handleMouseMove}
    >
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-20 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
        <button onClick={zoomIn} aria-label="Zoom in"
          className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={zoomOut} aria-label="Zoom out"
          className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={resetZoom} aria-label="Reset zoom"
          className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Hatching pattern for no-grant countries */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={NO_GRANT_COLOR} />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#3a4050" strokeWidth="0.8" />
          </pattern>
        </defs>
      </svg>

      {/* Legend — continuous gradient bar */}
      {metric !== 'none' && legendRange && (
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white/90 text-xs">
          <div className="font-medium mb-2">{getMetricLabel(metric)}</div>
          <div
            className="rounded overflow-hidden"
            style={{
              height: 12,
              width: 192,
              background: legendRange.gradient,
            }}
          />
          <div className="flex justify-between mt-1" style={{ width: 192 }}>
            <span className="text-[10px] text-white/60">{legendRange.minLabel}</span>
            <span className="text-[10px] text-white/60">{legendRange.maxLabel}</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          {tooltip.content}
        </div>
      )}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130, center: [10, 20] }}
        style={{ width: '100%', height: isFullscreen ? '100vh' : (isMobile ? '60vh' : '520px') }}
      >
        <ZoomableGroup zoom={position.zoom} center={position.coordinates} minZoom={1} maxZoom={8} onMoveEnd={(pos) => setPosition(pos)}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numericId = geo.id || geo.properties?.iso_n3;
                const alpha2 = NUMERIC_TO_ALPHA2[numericId] || geo.properties?.iso_a2 || '';
                const agg = countryAgg.get(alpha2);
                const hasGrants = !!agg;

                let fill = 'url(#hatch)'; // no grants - gray hatched
                if (hasGrants) {
                  if (metric === 'none') {
                    fill = UNIFORM_COLOR;
                  } else if (colorScale) {
                    const val = getMetricValue(agg!, metric);
                    fill = colorScale(val);
                  } else {
                    fill = UNIFORM_COLOR;
                  }
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: hasGrants ? '#e2e8f0' : undefined, cursor: hasGrants ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    tabIndex={hasGrants ? 0 : -1}
                    role={hasGrants ? 'button' : undefined}
                    aria-label={hasGrants && agg ? `${agg.name}: ${formatNum(agg.grantCount)} grants, ${formatUSD(agg.totalUSD)}` : undefined}
                    onMouseEnter={(e) => {
                      if (!hasGrants || !agg) return;
                      setTooltip({ x: e.clientX, y: e.clientY, content: tooltipContent(agg, metric) });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(e) => {
                      if (!hasGrants || !agg) return;
                      const rect = (e.target as SVGGraphicsElement).getBoundingClientRect();
                      setTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipContent(agg, metric) });
                    }}
                    onBlur={() => setTooltip(null)}
                    onKeyDown={(e) => {
                      if (hasGrants && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onCountryClick(alpha2);
                      }
                    }}
                    onClick={(e) => {
                      if (!hasGrants || !agg) return;
                      if (isMobile) {
                        if (pendingCountry === alpha2) {
                          onCountryClick(alpha2);
                          setPendingCountry(null);
                          setTooltip(null);
                        } else {
                          const rect = (e.target as SVGGraphicsElement).getBoundingClientRect();
                          setPendingCountry(alpha2);
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipContent(agg, metric, true) });
                        }
                      } else {
                        onCountryClick(alpha2);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
