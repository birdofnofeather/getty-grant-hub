import { describe, it, expect } from 'vitest';
import { getColorRange, makeColorScale } from '@/lib/map-colors';

function relLum(rgb: string): number {
  const m = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
}

describe('choropleth colour scale', () => {
  it('dollars use amber, counts use blue', () => {
    expect(getColorRange('totalUSD')).toEqual(['#9a3412', '#fcd34d']);
    expect(getColorRange('grantCount')).toEqual(['#1d4ed8', '#93c5fd']);
    // advanced metrics fold into the blue family (no green)
    expect(getColorRange('uniqueGrantees')).toEqual(['#1d4ed8', '#93c5fd']);
    expect(getColorRange('longevity')).toEqual(['#1d4ed8', '#93c5fd']);
  });

  it('low value = dim end, high value = bright end (dim→bright for dark bg)', () => {
    const scale = makeColorScale(1, 1000, 'grantCount');
    const lo = scale(1);
    const hi = scale(1000);
    expect(relLum(hi)).toBeGreaterThan(relLum(lo)); // brighter = more
  });

  it('is monotonically increasing in luminance across the range', () => {
    const scale = makeColorScale(1, 1000, 'grantCount');
    const lums = [1, 5, 20, 80, 300, 1000].map((v) => relLum(scale(v)));
    for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeGreaterThan(lums[i - 1]);
  });

  it('values at/above the capped max clamp to the bright end', () => {
    const scale = makeColorScale(1, 1000, 'totalUSD');
    expect(scale(1000)).toBe(scale(5000)); // clamp — US (capped) renders at max
  });
});
