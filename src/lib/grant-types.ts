export interface CleanGrant {
  grantId: string;
  grantAwardYear: number;
  amountAwarded_USD: number;
  initiative: string;
  grantee_name: string;
  projectTitle_clean: string;
  is_partial_year: boolean;
}

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
  metric: ChoroplethMetric;
  selectedInitiatives: string[] | null; // null = all
  minGrantAmount: number;
  minGrantCountPerCountry: number;
}

export const DEFAULT_FILTERS: FilterState = {
  yearRange: [1984, 2026],
  orgOnly: false,
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

export const CURRENT_INITIATIVES = [
  'Black Visual Arts Archives',
  'Connecting Art Histories',
  'Connecting Art Histories Guest Scholars',
  'Connecting Professionals/Sharing Expertise',
  'Conserving Canvas',
  'Getty Global Art and Sustainability Fellowships',
  'Getty Marrow Undergraduate Internships',
  'Graduate Internships',
  'Keeping It Modern',
  'Post-Bacc Conservation Internships',
  'Scholars in Residence at the Getty',
];

export const PAST_INITIATIVES = [
  'Campus Heritage Initiative',
  'Central and Eastern European Initiative',
  'Digital Art History',
  'Electronic Cataloguing Initiative',
  'Fund for New Orleans',
  'Getty Marrow Emerging Professionals',
  'Grants Outside of LA in support of Pacific Standard Time: LA/LA',
  'MOSAIKON',
  'Museums in Africa',
  'Online Scholarly Catalogue Initiative (OSCI)',
  'PST ART: Art & Science Collide',
  'Pacific Standard Time Presents: Modern Architecture in L.A.',
  'Pacific Standard Time: Art in L.A. 1945-1980',
  'Pacific Standard Time: LA/LA',
  'Panel Paintings',
  'Postdoctoral Fellowships',
  'Preserve L.A.',
  'The Paper Project',
];

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
