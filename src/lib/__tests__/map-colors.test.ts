import { describe, it, expect } from 'vitest';
import { getColorRange, getRamp, makeColorScale } from '@/lib/map-colors';

function relLum(rgb: string): number {
  let m: number[];
  if (rgb.startsWith('#')) m = rgb.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
  else m = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
}

describe('choropleth colour scale', () => {
  it('dollars use amber, counts/other use blue', () => {
    expect(getColorRange('totalUSD')).not.toEqual(getColorRange('grantCount'));
    expect(getColorRange('grantCount')).toEqual(getColorRange('uniqueGrantees'));
    expect(getColorRange('grantCount')).toEqual(getColorRange('longevity'));
  });

  it('ramp runs light -> dark (decreasing luminance)', () => {
    for (const metric of ['totalUSD', 'grantCount'] as const) {
      const lums = getRamp(metric).map(relLum);
      expect(lums[lums.length - 1]).toBeLessThan(lums[0]);
    }
  });

  it('darker = more: the largest value is darker than the smallest', () => {
    const vals = [1, 2, 3, 5, 8, 13, 40, 120, 900, 5000];
    const s = makeColorScale(vals, 'grantCount');
    expect(relLum(s.color(5000))).toBeLessThan(relLum(s.color(1)));
  });

  it('removing the top outlier re-anchors the scale so mid values darken', () => {
    const withUS = makeColorScale([1, 10, 100, 1000, 50000], 'totalUSD');
    const withoutUS = makeColorScale([1, 10, 100, 1000], 'totalUSD');
    expect(relLum(withoutUS.color(100))).toBeLessThan(relLum(withUS.color(100)));
  });

  it('a country with no value renders at the lightest endpoint, not blank', () => {
    const s = makeColorScale([10, 20, 30], 'grantCount');
    expect(s.color(0)).toBe(getColorRange('grantCount')[0]);
  });

});
