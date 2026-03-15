"""
Getty Foundation Grants — Data Cleaning & Map Generation
=========================================================
Run once on the raw CSV pulled by getty_grants_pull.py.
Produces two output files:
  1. getty_grants_clean.csv  — full dataset with normalized geo columns
  2. getty_grants_map.csv    — exploded, one row per map point

Usage:
    python clean_getty_grants.py [input.csv]

Defaults:
    input        -> getty_grants.csv
    clean output -> getty_grants_clean.csv
    map output   -> getty_grants_map.csv
"""

import sys
import html
import re
import datetime
import pandas as pd

INPUT_FILE = sys.argv[1] if len(sys.argv) > 1 else "getty_grants.csv"
CLEAN_FILE = "getty_grants_clean.csv"
MAP_FILE   = "getty_grants_map.csv"

# ── ISO lookup ────────────────────────────────────────────────────────────────

ISO_LOOKUP = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Antarctica": "AQ",
    "Andorra": "AD", "Angola": "AO", "Antigua and Barbuda": "AG", "Argentina": "AR",
    "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ",
    "Bahamas": "BS", "The Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD",
    "Barbados": "BB", "Belarus": "BY", "Belgium": "BE", "Belize": "BZ",
    "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA",
    "Brazil": "BR", "Burkina Faso": "BF", "Bulgaria": "BG", "Cambodia": "KH",
    "Cameroon": "CM", "Canada": "CA", "Chile": "CL", "China": "CN",
    "Colombia": "CO", "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU",
    "Cyprus": "CY", "Denmark": "DK", "Dominican Republic": "DO", "Ecuador": "EC",
    "Egypt": "EG", "Eritrea": "ER", "Estonia": "EE", "Eswatini, Kingdom of": "SZ",
    "Ethiopia": "ET", "Finland": "FI", "France": "FR", "Gabon": "GA",
    "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Greece": "GR",
    "Guatemala": "GT", "Guinea": "GN", "Haiti": "HT", "Honduras": "HN",
    "Hong Kong": "HK", "Hungary": "HU", "India": "IN", "Indonesia": "ID",
    "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT",
    "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ",
    "Kenya": "KE", "Kosovo": "XK", "Kuwait": "KW", "Kyrgyzstan": "KG",
    "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Libya": "LY",
    "Lithuania": "LT", "Luxembourg": "LU", "Malaysia": "MY", "Mali": "ML",
    "Malta": "MT", "Martinique": "MQ", "Mauritius": "MU", "Mexico": "MX",
    "Moldova": "MD", "Mongolia": "MN", "Montenegro, Republic of": "ME",
    "Morocco": "MA", "Mozambique": "MZ", "Myanmar (Burma)": "MM", "Nepal": "NP",
    "Netherlands": "NL", "New Zealand": "NZ", "Niger": "NE", "Nigeria": "NG",
    "North Macedonia": "MK", "Norway": "NO", "Pakistan": "PK",
    "Palestinian Territory": "PS", "Paraguay": "PY", "Peru": "PE",
    "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Puerto Rico": "PR",
    "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Saint Lucia": "LC",
    "Senegal": "SN", "Serbia": "RS", "Singapore": "SG", "Slovakia": "SK",
    "Slovenia": "SI", "South Africa": "ZA", "South Korea": "KR", "Spain": "ES",
    "Sri Lanka": "LK", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY",
    "Taiwan": "TW", "Tanzania": "TZ", "Thailand": "TH", "Togo": "TG",
    "Trinidad and Tobago": "TT", "Tunisia": "TN", "Turkey": "TR",
    "Turkmenistan": "TM", "Uganda": "UG", "Ukraine": "UA",
    "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
    "Uruguay": "UY", "Uzbekistan": "UZ", "Vatican": "VA", "Venezuela": "VE",
    "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW",
    # Getty-specific variants
    "The Netherlands": "NL", "England": "GB", "Scotland": "GB",
    "Wales": "GB", "Northern Ireland": "GB", "Czechia": "CZ",
    "Czechia (Czech Republic)": "CZ", "Czech Republic": "CZ",
    "Ireland, Republic of": "IE", "Serbia, Republic of": "RS",
    "Serbia and Montenegro": "RS", "Holy See (Vatican City)": "VA",
}

STD_DISPLAY = {
    "AF":"Afghanistan","AL":"Albania","DZ":"Algeria","AQ":"Antarctica",
    "AG":"Antigua and Barbuda","AR":"Argentina","AM":"Armenia","AU":"Australia",
    "AT":"Austria","BS":"Bahamas","BH":"Bahrain","BD":"Bangladesh","BB":"Barbados",
    "BY":"Belarus","BE":"Belgium","BJ":"Benin","BT":"Bhutan","BO":"Bolivia",
    "BA":"Bosnia and Herzegovina","BR":"Brazil","BF":"Burkina Faso","BG":"Bulgaria",
    "KH":"Cambodia","CM":"Cameroon","CA":"Canada","CL":"Chile","CN":"China",
    "CO":"Colombia","CR":"Costa Rica","HR":"Croatia","CU":"Cuba","CY":"Cyprus",
    "CZ":"Czechia","DK":"Denmark","DO":"Dominican Republic","EC":"Ecuador",
    "EG":"Egypt","ER":"Eritrea","EE":"Estonia","SZ":"Eswatini","ET":"Ethiopia",
    "FI":"Finland","FR":"France","GA":"Gabon","GE":"Georgia","DE":"Germany",
    "GH":"Ghana","GR":"Greece","GT":"Guatemala","GN":"Guinea","HT":"Haiti",
    "HN":"Honduras","HK":"Hong Kong","HU":"Hungary","IN":"India","ID":"Indonesia",
    "IR":"Iran","IQ":"Iraq","IE":"Ireland","IL":"Israel","IT":"Italy",
    "JM":"Jamaica","JP":"Japan","JO":"Jordan","KZ":"Kazakhstan","KE":"Kenya",
    "XK":"Kosovo","KW":"Kuwait","KG":"Kyrgyzstan","LA":"Laos","LV":"Latvia",
    "LB":"Lebanon","LY":"Libya","LT":"Lithuania","LU":"Luxembourg","MY":"Malaysia",
    "ML":"Mali","MT":"Malta","MQ":"Martinique","MU":"Mauritius","MX":"Mexico",
    "MD":"Moldova","MN":"Mongolia","ME":"Montenegro","MA":"Morocco","MZ":"Mozambique",
    "MM":"Myanmar","NP":"Nepal","NL":"Netherlands","NZ":"New Zealand","NE":"Niger",
    "NG":"Nigeria","MK":"North Macedonia","NO":"Norway","PK":"Pakistan",
    "PS":"Palestinian Territory","PY":"Paraguay","PE":"Peru","PH":"Philippines",
    "PL":"Poland","PT":"Portugal","PR":"Puerto Rico","QA":"Qatar","RO":"Romania",
    "RU":"Russia","LC":"Saint Lucia","SN":"Senegal","RS":"Serbia","SG":"Singapore",
    "SK":"Slovakia","SI":"Slovenia","ZA":"South Africa","KR":"South Korea",
    "ES":"Spain","LK":"Sri Lanka","SE":"Sweden","CH":"Switzerland","SY":"Syria",
    "TW":"Taiwan","TZ":"Tanzania","TH":"Thailand","TG":"Togo","TT":"Trinidad and Tobago",
    "TN":"Tunisia","TR":"Turkey","TM":"Turkmenistan","UG":"Uganda","UA":"Ukraine",
    "AE":"United Arab Emirates","GB":"United Kingdom","US":"United States",
    "UY":"Uruguay","UZ":"Uzbekistan","VA":"Vatican City","VE":"Venezuela",
    "VN":"Vietnam","YE":"Yemen","ZM":"Zambia","ZW":"Zimbabwe",
}

# ── Cleaning functions ────────────────────────────────────────────────────────

def clean_html(text):
    if pd.isna(text):
        return text
    text = html.unescape(str(text))
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_locations(raw):
    """
    Parse projectLocation_countries into three clean columns.
    Source format: semicolons separate locations; || attaches city to country.
    Returns (map_countries_std, map_countries_iso2, map_cities).
    Warns on unknown country names instead of silently dropping them.
    """
    if pd.isna(raw) or not str(raw).strip():
        return None, None, None

    parts = [p.strip() for p in str(raw).split(';')]
    countries_std, isos, cities = [], [], []
    seen_isos = set()

    for part in parts:
        if '||' in part:
            country_raw, city = part.split('||', 1)
            country_raw = country_raw.strip()
            cities.append(city.strip())
        else:
            country_raw = part.strip()

        iso = ISO_LOOKUP.get(country_raw)
        if iso is None:
            print(f"  WARNING: Unknown country '{country_raw}' — kept as-is, add to ISO_LOOKUP")
            countries_std.append(country_raw)
            isos.append('??')
        elif iso not in seen_isos:
            seen_isos.add(iso)
            countries_std.append(STD_DISPLAY.get(iso, country_raw))
            isos.append(iso)

    return (
        '; '.join(countries_std) if countries_std else None,
        '; '.join(isos)          if isos          else None,
        '; '.join(cities)        if cities         else None,
    )


# ── Clean pipeline ────────────────────────────────────────────────────────────

def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df['projectTitle_clean'] = df['projectTitle'].apply(clean_html)

    parsed = df['projectLocation_countries'].apply(parse_locations)
    df['map_countries_std']  = parsed.apply(lambda x: x[0])
    df['map_countries_iso2'] = parsed.apply(lambda x: x[1])
    df['map_cities']         = parsed.apply(lambda x: x[2])

    df['grantee_country_iso2'] = df['grantee_country'].map(ISO_LOOKUP)
    df['grantee_country_std']  = df['grantee_country_iso2'].map(STD_DISPLAY)

    current_year = datetime.date.today().year
    df['is_partial_year'] = df['grantAwardYear'] == current_year

    return df


# ── Map table builder ─────────────────────────────────────────────────────────

def build_map_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Explode to one row per map point for the dashboard map.

    Priority:
      1. projectLocation_countries (map_countries_iso2) — preferred
         Multi-country rows produce multiple map rows.
         City hint ("Los Angeles") is assigned only to the US entry.
      2. grantee_country + grantee_city — fallback when project location is null
      3. Rows with no location data are excluded (currently 2 records).

    Columns: grantId, grantAwardYear, amountAwarded_USD, initiative,
             grantee_name, grantee_country, projectTitle_clean,
             map_iso2, map_country, map_city, location_source, is_partial_year
    """
    rows = []

    for _, r in df.iterrows():
        iso_src = r['map_countries_iso2']
        std_src = r['map_countries_std']
        has_project = pd.notna(iso_src) and str(iso_src).strip() != ''

        if has_project:
            isos      = [x.strip() for x in str(iso_src).split(';')]
            stds      = [x.strip() for x in str(std_src).split(';')]
            city_hint = r['map_cities']  # "Los Angeles" or NaN

            for iso, std in zip(isos, stds):
                # City hint applies only to the US entry in the row
                city = city_hint if (pd.notna(city_hint) and iso == 'US') else None
                rows.append({
                    'grantId':            r['grantId'],
                    'grantAwardYear':     r['grantAwardYear'],
                    'amountAwarded_USD':  r['amountAwarded_USD'],
                    'initiative':         r['initiative'],
                    'grantee_name':       r['grantee_name'],
                    'grantee_country':    r['grantee_country_std'],
                    'projectTitle_clean': r['projectTitle_clean'],
                    'map_iso2':           iso,
                    'map_country':        std,
                    'map_city':           city,
                    'location_source':    'project',
                    'is_partial_year':    r['is_partial_year'],
                })

        elif pd.notna(r['grantee_country_iso2']):
            rows.append({
                'grantId':            r['grantId'],
                'grantAwardYear':     r['grantAwardYear'],
                'amountAwarded_USD':  r['amountAwarded_USD'],
                'initiative':         r['initiative'],
                'grantee_name':       r['grantee_name'],
                'grantee_country':    r['grantee_country_std'],
                'projectTitle_clean': r['projectTitle_clean'],
                'map_iso2':           r['grantee_country_iso2'],
                'map_country':        r['grantee_country_std'],
                'map_city':           r['grantee_city'],
                'location_source':    'grantee_fallback',
                'is_partial_year':    r['is_partial_year'],
            })

    return pd.DataFrame(rows)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"Reading {INPUT_FILE}...")
    df = pd.read_csv(INPUT_FILE, dtype={'grantId': str})
    print(f"  {len(df):,} rows loaded.")

    print("Cleaning...")
    df_clean = clean(df)
    df_clean.to_csv(CLEAN_FILE, index=False)
    print(f"  Saved {len(df_clean):,} rows -> {CLEAN_FILE}")

    print("Building map table...")
    df_map = build_map_table(df_clean)
    df_map.to_csv(MAP_FILE, index=False)
    print(f"  Saved {len(df_map):,} map rows -> {MAP_FILE}")

    unmapped = set(df_clean['grantId'].astype(str)) - set(df_map['grantId'].astype(str))
    if unmapped:
        print(f"  Unmapped grantIds (no location data): {unmapped}")


if __name__ == "__main__":
    main()
