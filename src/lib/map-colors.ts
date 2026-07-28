// Choropleth colour logic, extracted so it can be unit-tested.
//
// Sequential ramps run LIGHT -> DARK (darker = more) so the biggest recipients
// read as heavy/dense against the dark map background, while the lowest values
// stay pale. Two colour-vision-safe families only: amber = dollar measures,
// blue = counts and other measures.
import { scaleQuantize } from 'd3-scale';
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

// Magnitude-based (log) classification, with the top of the scale CAPPED at the
// second-highest country's value. The Getty distribution has one dominant outlier
// (the U.S.) followed by a steep drop; without a cap, the log scale still pushes
// every non-U.S. country toward the light end. Capping at the runner-up value
// keeps the U.S. at the darkest class on its own AND lets the rest of the world
// use the full ramp. When the U.S. is filtered out, the runner-up shifts down,
// the scale genuinely resets, and contrast among remaining countries grows.
export function makeColorScale(values: number[], metric: ChoroplethMetric): ColorScale {
  const ramp = getRamp(metric);
  const positive = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (positive.length === 0) {
    return { color: () => ramp[0], thresholds: [], ramp };
  }
  const min = positive[0];
  // Cap at the second-highest so the top outlier doesn't compress the rest.
  const capMax = positive.length >= 2 ? positive[positive.length - 2] : positive[0];
  const logMin = Math.log(Math.max(min, 1));
  const logMax = Math.log(Math.max(capMax, min + 1));
  const scale = scaleQuantize<string>().domain([logMin, logMax]).range(ramp);
  return {
    color: (v: number) => {
      if (v <= 0) return ramp[0];
      if (v >= capMax) return ramp[ramp.length - 1];
      return scale(Math.log(Math.max(v, 1)));
    },
    thresholds: scale.thresholds(),
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
