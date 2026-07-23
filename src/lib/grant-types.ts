export interface CleanGrant {
  grantId: string;
  grantAwardDate: string;
  grantAwardYear: number;
  amountAwarded_USD: number;
  initiative: string;
  initiativeType: string;
  pastInitiative: string;
  grantee_name: string;
  projectTitle_clean: string;
  projectTitleURL: string;
  is_partial_year: boolean;
}

export interface InitiativeGroups { current: string[]; past: string[]; other: string[]; }

export interface MapGrant {
  grantId: string;
  grantAwardYear: number;
  amountAwarded_USD: number;
  initiative: string;
  grantee_name: string;
  grantee_country: string;
  projectTitle_clean: string;
  map_iso2: string;
  map_country: string;
  map_city: string;
  location_source: string;
  is_partial_year: boolean;
}

export type ChoroplethMetric =
  | 'none'
  | 'grantCount'
  | 'totalUSD'
  | 'uniqueGrantees'
  | 'uniqueInitiatives'
  | 'longevity';

export type DrawerMode = 'none' | 'basic' | 'advanced';

export interface FilterState {
  yearRange: [number, number];
  orgOnly: boolean;
  excludeUS: boolean;
  inflationAdjust: boolean;
  metric: ChoroplethMetric;
  selectedInitiatives: string[] | null; // null = all
  minGrantAmount: number;
  minGrantCountPerCountry: number;
}

export const DEFAULT_FILTERS: FilterState = {
  yearRange: [1984, 2026],
  orgOnly: false,
  excludeUS: false,
  inflationAdjust: false,
  metric: 'none',
  selectedInitiatives: null,
  minGrantAmount: 0,
  minGrantCountPerCountry: 1,
};

export const INDIVIDUAL_INITIATIVES = new Set([
  'Getty Marrow Undergraduate Internships',
  'Scholars in Residence at the Getty',
  'Graduate Internships',
  'Postdoctoral Fellowships',
  'Connecting Art Histories Guest Scholars',
  'Post-Bacc Conservation Internships',
  'Getty Global Art and Sustainability Fellowships',
  'J. Paul Getty Museum Training Fellowships',
  'Getty Rothschild Fellow',
]);



export interface CountryAgg {
  iso2: string;
  name: string;
  grantCount: number;
  totalUSD: number;
  uniqueGrantees: number;
  uniqueInitiatives: number;
  longevity: number;
  grantIds: Set<string>;
}

// Precomputed aggregates for instant first paint (getty_grants_agg.json).
// Country totals use the multi-country split; headline totals are full.
export interface AggCountry {
  iso2: string; name: string; count: number; usd: number;
  grantees: number; initiatives: number; minYear: number; maxYear: number;
}
export interface AggData {
  generated: string;
  maxYear: number;
  headline: { grantCount: number; totalUSD: number };
  headlineOrg: { grantCount: number; totalUSD: number };
  years: { year: number; count: number; usd: number; countOrg: number; usdOrg: number }[];
  countries: AggCountry[];
}
