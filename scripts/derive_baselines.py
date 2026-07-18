"""Derive verification baselines from the current CSVs. Writes scripts/baselines.json.
Country totals use the NEW multi-country split (July 2026). Headline totals are full."""
import json, sys, datetime
import pandas as pd
from getty_logic import (strip_html, is_individual, apply_pst_override,
                         country_count_per_grant)

CLEAN = sys.argv[1] if len(sys.argv) > 1 else 'getty_grants_clean.csv'
MAP = sys.argv[2] if len(sys.argv) > 2 else 'getty_grants_map.csv'

c = pd.read_csv(CLEAN, dtype={'grantId': str})
m = pd.read_csv(MAP, dtype={'grantId': str})
c['initiative_clean'] = c['initiative'].map(strip_html)
c['is_individual'] = c.apply(
    lambda r: is_individual(r['initiative'], r['amountAwarded_USD'], r['grantee_name']), axis=1)

amt = c.set_index('grantId')['amountAwarded_USD']
pos = lambda s: s[s > 0].sum()

tot_n, tot_usd = len(c), pos(c['amountAwarded_USD'])
ind = c[c['is_individual']]; org = c[~c['is_individual']]

mo = apply_pst_override(m)
ccount = country_count_per_grant(mo)  # denominator per grant

# per-country split totals
mo_u = mo.dropna(subset=['map_iso2'])
mo_u = mo_u[mo_u['map_iso2'].astype(str).str.strip() != ''].drop_duplicates(['map_iso2', 'grantId'])
def country_rows():
    out = {}
    for _, r in mo_u.iterrows():
        iso = r['map_iso2']; gid = r['grantId']
        full = amt.get(gid, 0) or 0
        share = (full / ccount.get(gid, 1)) if full > 0 else 0
        a = out.setdefault(iso, {'iso2': iso, 'name': r['map_country'], 'count': 0,
                                 'usd_split': 0.0, 'usd_full': 0.0})
        a['count'] += 1
        a['usd_split'] += share
        a['usd_full'] += full if full > 0 else 0
    return out
countries = country_rows()
sum_split = sum(v['usd_split'] for v in countries.values())
sum_full = sum(v['usd_full'] for v in countries.values())

baselines = {
    'generated': datetime.date.today().isoformat(),
    'source_rows': {'clean': int(len(c)), 'map': int(len(m))},
    'total': {'count': int(tot_n), 'usd': float(tot_usd)},
    'individual': {'count': int(len(ind)), 'usd': float(pos(ind['amountAwarded_USD']))},
    'organizational': {'count': int(len(org)), 'usd': float(pos(org['amountAwarded_USD']))},
    'countries_mapped': int(mo_u['map_iso2'].nunique()),
    'multi_country_grants': int(sum(1 for v in ccount.values() if v > 1)),
    'us_grants': int(countries['US']['count']),
    'uk_split_usd': float(countries['GB']['usd_split']),
    'uk_full_usd': float(countries['GB']['usd_full']),
    'sum_country_split_usd': float(sum_split),
    'sum_country_full_usd_double_counted': float(sum_full),
    'partial_year_count': int((c['grantAwardYear'] == c['grantAwardYear'].max()).sum()),
    'max_year': int(c['grantAwardYear'].max()),
}
with open('scripts/baselines.json', 'w') as f:
    json.dump(baselines, f, indent=2)
print(json.dumps(baselines, indent=2))
