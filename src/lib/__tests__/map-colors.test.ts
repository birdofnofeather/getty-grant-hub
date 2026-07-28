import { describe, it, expect } from 'vitest';
import { getColorRange, getRamp, makeColorScale } from '@/lib/map-colors';

function relLum(rgb: string): number {
  // accepts "#rrggbb" or "rgb(r,g,b)"
  let m: number[];
  if (rgb.startsWith('#')) m = rgb.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
  else m = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
}

describe('choropleth colour scale', () => {
  it('dollars use amber, counts/other use blue', () => {
    expect(getRamp('totalUSD')[0]).toMatch(/^#/);
    expect(getRamp('grantCount')).toEqual(getRamp('uniqueGrantees'));
    expect(getRamp('grantCount')).toEqual(getRamp('longevity'));
    expect(getRamp('totalUSD')).not.toEqual(getRamp('grantCount'));
  });

  it('ramps run light -> dark (monotonically decreasing luminance)', () => {
    for (const metric of ['totalUSD', 'grantCount'] as const) {
      const lums = getRamp(metric).map(relLum);
      for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeLessThan(lums[i - 1]);
    }
  });

  it('darker = more: the largest value is darker than the smallest', () => {
    const vals = [1, 2, 3, 5, 8, 13, 40, 120, 900, 5000];
    const s = makeColorScale(vals, 'grantCount');
    expect(relLum(s.color(5000))).toBeLessThan(relLum(s.color(1)));
  });

  it('equal-count quantile: top value lands in the darkest class, bottom in the lightest', () => {
    const vals = [1, 1, 2, 2, 3, 3, 90, 90, 5000, 5000];
    const s = makeColorScale(vals, 'totalUSD');
    expect(s.color(5000)).toBe(s.ramp[s.ramp.length - 1]);
    expect(s.color(1)).toBe(s.ramp[0]);
  });

  it('a country with no value renders at the dimmest class, not blank', () => {
    const s = makeColorScale([10, 20, 30], 'grantCount');
    expect(s.color(0)).toBe(s.ramp[0]);
  });
});
