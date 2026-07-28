// Choropleth colour logic, extracted so it can be unit-tested.
//
// Sequential ramps run LIGHT -> DARK (darker = more) so the biggest recipients
// read as heavy/dense against the dark map background, while the lowest values
// stay pale. Two colour-vision-safe families only: amber = dollar measures,
// blue = counts and other measures.
import { scaleQuantile } from 'd3-scale';
import { interpolateHcl } from 'd3-interpolate';
import type { ChoroplethMetric } from '@/lib/grant-types';

const RAMP_AMBER = ['#ffe49c', '#ffc960', '#eeab3a', '#d18f1e', '#b0730a', '#8a5a00'];
const RAMP_BLUE  = ['#b3d6ff', '#7db8fb', '#4f9bf0', '#3b82d6', '#2f63a8', '#274b7d'];

export function getRamp(metric: ChoroplethMetric): string[] {
  return metric === 'totalUSD' ? RAMP_AMBER : RAMP_BLUE;
}

// [lightest, darkest] convenience for anything that wants the two endpoints.
export function getColorRange(metric: ChoroplethMetric): [string, string] {
  const r = getRamp(metric);
  return [r[0], r[r.length - 1]];
}

export interface ColorScale {
  color: (v: number) => string;
  thresholds: number[]; // class-break values (length = classes − 1)
  ramp: string[];
}

// Quantile (equal-count) classification over the CURRENTLY VISIBLE countries.
// The Getty distribution is extremely right-skewed (the U.S., then a steep drop),
// so a continuous scale collapses the long tail into a single shade. Equal-count
// classes instead give every class the same number of countries: mid and low
// recipients stay distinguishable, and the very top recipients occupy the
// darkest class on their own. Because the scale recomputes over whatever values
// are passed in, excluding the U.S. re-spreads the whole scale and the new leaders
// jump out — exactly the "more dramatic" behaviour we want there.
export function makeColorScale(values: number[], metric: ChoroplethMetric): ColorScale {
  const ramp = getRamp(metric);
  const positive = values.filter((v) => v > 0);
  const scale = scaleQuantile<string>().domain(positive.length ? positive : [0, 1]).range(ramp);
  return {
    color: (v: number) => (v > 0 ? scale(v) : ramp[0]),
    thresholds: scale.quantiles(),
    ramp,
  };
}

// Kept for any continuous legend use; the map legend now renders discrete class
// swatches (below) since the scale is quantile, not continuous.
export function hclGradient(colorMin: string, colorMax: string): string {
  const interp = interpolateHcl(colorMin, colorMax);
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `${interp(t)} ${Math.round(t * 100)}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
