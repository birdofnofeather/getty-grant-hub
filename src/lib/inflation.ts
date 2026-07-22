// CPI-U (U.S. City Average, All Items, 1982-84 = 100) annual averages, BLS
// series CUUR0000SA0. Used to convert historical grant dollars into today's
// (latest full-year) dollars. Reference year is the latest complete annual
// CPI available (updated when BLS publishes the new January release).
//
// Source: U.S. Bureau of Labor Statistics — https://data.bls.gov/timeseries/CUUR0000SA0
//
// Grants in years without a published annual CPI (e.g. the current partial
// year) are treated as already in reference-year dollars (factor = 1). This
// slightly understates their real value, which we call out in the UI.

export const CPI_ANNUAL: Record<number, number> = {
  1984: 103.9, 1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3,
  1989: 124.0, 1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5,
  1994: 148.2, 1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0,
  1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0,
  2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.342, 2008: 215.303,
  2009: 214.537, 2010: 218.056, 2011: 224.939, 2012: 229.594, 2013: 232.957,
  2014: 236.736, 2015: 237.017, 2016: 240.007, 2017: 245.120, 2018: 251.107,
  2019: 255.657, 2020: 258.811, 2021: 270.970, 2022: 292.655, 2023: 304.702,
  2024: 313.689, 2025: 322.132,
};

export const CPI_REFERENCE_YEAR = 2025;
const REF = CPI_ANNUAL[CPI_REFERENCE_YEAR];

// Multiply a nominal-year amount by this factor to get reference-year dollars.
export function inflationFactor(year: number): number {
  const c = CPI_ANNUAL[year];
  if (!c || !REF) return 1;
  return REF / c;
}

export type Adjuster = (usd: number, year: number) => number;

export function makeAdjuster(enabled: boolean): Adjuster {
  if (!enabled) return (usd) => (usd > 0 ? usd : 0);
  return (usd, year) => (usd > 0 ? usd * inflationFactor(year) : 0);
}
