"""Build getty_grants_agg.json — small precomputed aggregates for instant first
paint. Written to repo root AND public/. Country totals use the multi-country
split; headline totals are full (each grant counted once). Mirrors the frontend.

Usage: python scripts/build_aggregates.py [clean_csv] [map_csv]
"""
import sys, os, json, datetime
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from getty_logic import strip_html, is_individual, apply_pst_override, country_count_per_grant

CLEAN = sys.argv[1] if len(sys.argv) > 1 else 'getty_grants_clean.csv'
MAP = sys.argv[2] if len(sys.argv) > 2 else 'getty_grants_map.csv'


def build(clean_path=CLEAN, map_path=MAP):
    c = pd.read_csv(clean_path, dtype={'grantId': str})
    m = pd.read_csv(map_path, dtype={'grantId': str})
    c['initiative_clean'] = c['initiative'].map(strip_html)
    c['ind'] = c.apply(lambda r: is_individual(r['initiative'], r['amountAwarded_USD'], r['grantee_name']), axis=1)
    pos = lambda s: float(s[s > 0].sum())
    amt = c.set_index('grantId')['amountAwarded_USD']

    headline = {'grantCount': int(len(c)), 'totalUSD': pos(c['amountAwarded_USD'])}
    org = c[~c['ind']]
    headlineOrg = {'grantCount': int(len(org)), 'totalUSD': pos(org['amountAwarded_USD'])}

    years = []
    for y, g in c.groupby('grantAwardYear'):
        go = g[~g['ind']]
        years.append({'year': int(y), 'count': int(len(g)), 'usd': pos(g['amountAwarded_USD']),
                      'countOrg': int(len(go)), 'usdOrg': pos(go['amountAwarded_USD'])})
    years.sort(key=lambda r: r['year'])

    mo = apply_pst_override(m)
    ccount = country_count_per_grant(mo)
    mo_u = mo.dropna(subset=['map_iso2'])
    mo_u = mo_u[mo_u['map_iso2'].astype(str).str.strip() != ''].drop_duplicates(['map_iso2', 'grantId'])
    countries = {}
    for _, r in mo_u.iterrows():
        iso = r['map_iso2']; gid = r['grantId']
        full = amt.get(gid, 0) or 0
        share = (full / ccount.get(gid, 1)) if full > 0 else 0
        a = countries.setdefault(iso, {'iso2': iso, 'name': r['map_country'], 'count': 0, 'usd': 0.0,
                                       'grantees': set(), 'initiatives': set(), 'minYear': 9999, 'maxYear': 0})
        a['count'] += 1
        a['usd'] += share
        a['grantees'].add(r['grantee_name'])
        a['initiatives'].add(strip_html(r['initiative']))
        yr = int(r['grantAwardYear'])
        a['minYear'] = min(a['minYear'], yr); a['maxYear'] = max(a['maxYear'], yr)
    country_list = [{'iso2': a['iso2'], 'name': a['name'], 'count': a['count'], 'usd': round(a['usd'], 2),
                     'grantees': len(a['grantees']), 'initiatives': len(a['initiatives']),
                     'minYear': a['minYear'], 'maxYear': a['maxYear']}
                    for a in countries.values()]
    country_list.sort(key=lambda r: -r['count'])

    return {
        'generated': datetime.date.today().isoformat(),
        'maxYear': int(c['grantAwardYear'].max()),
        'headline': headline,
        'headlineOrg': headlineOrg,
        'years': years,
        'countries': country_list,
    }


def main():
    data = build()
    for path in ['getty_grants_agg.json', os.path.join('public', 'getty_grants_agg.json')]:
        os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f, separators=(',', ':'))
        print(f"  wrote {path} ({os.path.getsize(path)} bytes)")
    print(f"  headline {data['headline']}  countries {len(data['countries'])}  years {len(data['years'])}")


if __name__ == '__main__':
    main()
