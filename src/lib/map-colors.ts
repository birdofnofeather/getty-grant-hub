// Choropleth colour logic, extracted so it can be unit-tested. Ramps run
// DIM -> BRIGHT (brighter = more) for the dark map canvas, interpolated in HCL
// space for perceptually even midtones. Two colour families only (blue = counts,
// amber = dollars); green was dropped as the least colour-vision-deficiency-safe.
import { scaleLog } from 'd3-scale';
import { interpolateHcl } from 'd3-interpolate';
import type { ChoroplethMetric } from '@/lib/grant-types';

export function getColorRange(metric: ChoroplethMetric): [string, string] {
  switch (metric) {
    case 'totalUSD':
      return ['#9a3412', '#fcd34d']; // dim amber → bright gold
    case 'uniqueGrantees':
    case 'uniqueInitiatives':
    case 'longevity':
    case 'grantCount':
    default:
      return ['#1d4ed8', '#93c5fd']; // dim blue → bright sky
  }
}

// Multi-stop CSS gradient sampled from the HCL interpolator so the legend bar
// matches the map (a 2-stop CSS gradient would interpolate in sRGB and drift).
export function hclGradient(colorMin: string, colorMax: string): string {
  const interp = interpolateHcl(colorMin, colorMax);
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `${interp(t)} ${Math.round(t * 100)}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

// Build a value→colour function. Log domain (values span orders of magnitude);
// the caller passes maxVal already capped at the non-US maximum so the U.S. reads
// at full intensity without collapsing the scale for everyone else.
export function makeColorScale(minVal: number, maxVal: number, metric: ChoroplethMetric): (v: number) => string {
  const [colorMin, colorMax] = getColorRange(metric);
  const scale = scaleLog().domain([Math.max(minVal, 1), maxVal]).range([0, 1]).clamp(true);
  const interp = interpolateHcl(colorMin, colorMax);
  return (v: number) => (v <= 0 ? colorMin : interp(scale(Math.max(v, 1))));
}
