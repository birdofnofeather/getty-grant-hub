// Test helpers: load the real CSVs + baselines so tests assert against actual data.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Papa from 'papaparse';
import type { CleanGrant, MapGrant } from '@/lib/grant-types';
import { stripHtml } from '@/lib/classification';

const root = resolve(__dirname, '../../../');

function parseCsv(file: string): Record<string, string>[] {
  const text = readFileSync(resolve(root, file), 'utf-8');
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data as Record<string, string>[];
}

export function loadClean(): CleanGrant[] {
  return parseCsv('getty_grants_clean.csv').map((r) => ({
    grantId: r.grantId || '',
    grantAwardDate: r.grantAwardDate || '',
    grantAwardYear: parseInt(r.grantAwardYear) || 0,
    amountAwarded_USD: parseFloat(r.amountAwarded_USD) || 0,
    initiative: stripHtml(r.initiative || ''),
    initiativeType: stripHtml(r.initiativeType || ''),
    pastInitiative: r.pastInitiative || '',
    grantee_name: r.grantee_name || '',
    projectTitle_clean: r.projectTitle_clean || '',
    projectTitleURL: r.projectTitleURL || '',
    is_partial_year: (r.is_partial_year || '').toLowerCase() === 'true',
  }));
}

export function loadMap(): MapGrant[] {
  return parseCsv('getty_grants_map.csv').map((r) => ({
    grantId: r.grantId || '',
    grantAwardYear: parseInt(r.grantAwardYear) || 0,
    amountAwarded_USD: parseFloat(r.amountAwarded_USD) || 0,
    initiative: stripHtml(r.initiative || ''),
    initiativeType: stripHtml(r.initiativeType || ''),
    pastInitiative: r.pastInitiative || '',
    grantee_name: r.grantee_name || '',
    grantee_country: r.grantee_country || '',
    projectTitle_clean: r.projectTitle_clean || '',
    map_iso2: r.map_iso2 || '',
    map_country: r.map_country || '',
    map_city: r.map_city || '',
    location_source: r.location_source || '',
    is_partial_year: (r.is_partial_year || '').toLowerCase() === 'true',
  }));
}

export function loadBaselines() {
  return JSON.parse(readFileSync(resolve(root, 'scripts/baselines.json'), 'utf-8'));
}
