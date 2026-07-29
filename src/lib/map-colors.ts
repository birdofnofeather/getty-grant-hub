// Choropleth colour logic, extracted so it can be unit-tested.
//
// Continuous log-scale interpolation from a light endpoint to a dark endpoint,
// so darker = more. Two colour families: amber for dollar measures, blue for
// counts and other measures.
import { scaleLog } from 'd3-scale';
import { interpolateHcl } from 'd3-interpolate';
import type { ChoroplethMetric } from '@/lib/grant-types';

// [lightest, darkest] endpoints per metric family.
export function getColorRange(metric: ChoroplethMetric): [string, string] {
  if (metric === 'totalUSD') return ['#fcd34d', '#9a3412'];
  return ['#93c5fd', '#1d4ed8'];
}

// Sampled swatches for the legend gradient bar (light -> dark).
export function getRamp(metric: ChoroplethMetric): string[] {
  const [c0, c1] = getColorRange(metric);
  const interp = interpolateHcl(c0, c1);
  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => interp(t) as string);
}

export interface ColorScale {
  color: (v: number) => string;
  thresholds: number[];
  ramp: string[];
}

// Continuous log scale over the full data range. No outlier cap: the scale
// spans min -> max of the currently-visible countries, so removing the top
// country genuinely re-anchors the ramp for the remaining ones.
export function makeColorScale(values: number[], metric: ChoroplethMetric): ColorScale {
  const [c0, c1] = getColorRange(metric);
  const ramp = getRamp(metric);
  const interp = interpolateHcl(c0, c1);
  const positive = values.filter((v) => v > 0);
  if (positive.length === 0) {
    return { color: () => c0, thresholds: [], ramp };
  }
  const min = Math.max(Math.min(...positive), 1);
  const max = Math.max(...positive, min + 1);
  const scale = scaleLog().domain([min, max]).range([0, 1]).clamp(true);
  return {
    color: (v: number) => {
      if (v <= 0) return c0;
      return interp(scale(Math.max(v, 1))) as string;
    },
    thresholds: [],
    ramp,
  };
}

// Multi-stop CSS gradient helper.
export function hclGradient(colorMin: string, colorMax: string): string {
  const interp = interpolateHcl(colorMin, colorMax);
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `${interp(t)} ${Math.round(t * 100)}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
