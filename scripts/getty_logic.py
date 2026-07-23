"""
Shared data logic for Getty Grant Hub — the single Python source of truth that
mirrors the frontend's runtime rules (src/hooks/use-grant-data.ts and
src/lib/grant-types.ts). Used by derive_baselines.py and the aggregate builder
so precomputed data matches what the app computes at runtime.

Rules encoded here (keep in sync with the TypeScript):
  - HTML stripping of initiative names
  - Individual vs. organizational classification (4 signals)
  - PST LA/LA map override (with the 3-grant keep-original whitelist)
  - NEW (July 2026): multi-country grants split their dollar amount evenly
    across the countries they serve, for per-country map/panel totals.
"""
import re
import html as _html

INDIVIDUAL_INITIATIVES = {
    'Getty Marrow Undergraduate Internships',
    'Scholars in Residence at the Getty',
    'Graduate Internships',
    'Postdoctoral Fellowships',
    'Connecting Art Histories Guest Scholars',
    'Post-Bacc Conservation Internships',
    'Getty Global Art and Sustainability Fellowships',
    'J. Paul Getty Museum Training Fellowships',
    'Getty Rothschild Fellow',
}
HONORIFICS = ('Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Professor ', 'Prof.', 'Miss ', 'Arq.')
SCOPED_INITIATIVES = {
    'Central and Eastern European Initiative',
    'Research Grants (Team and Individual)',
}
ORG_KEYWORDS = re.compile(
    r"university|college|collegium|museum|institute|institut|foundation|fondation|"
    r"stiftung|association|asociaci[oó]n|center|centre|academy|library|council|"
    r"society|trust|fund|school|gallery|archive|research|national|international|royal|"
    r"state|federal|regents|board|directorate|seminar|forum|program|programme|office|"
    r"department|ministry|government|authority|agency|committee|commission|corporation|"
    r"company|inc\.|ltd\.|llc|arts$",
    re.I,
)
PST_INITIATIVES = {
    'Pacific Standard Time: LA/LA',
    'Grants Outside of LA in support of Pacific Standard Time: LA/LA',
    'PST ART: Art & Science Collide',
}
PST_KEEP_ORIGINAL = {'201527020', '201526957', '20150007'}


def strip_html(s):
    if not isinstance(s, str):
        return ''
    return re.sub(r'<[^>]*>', '', _html.unescape(s)).strip()


def looks_like_person(name):
    if not isinstance(name, str) or not name:
        return False
    if ORG_KEYWORDS.search(name):
        return False
    words = name.strip().split()
    if len(words) < 2 or len(words) > 4:
        return False
    if re.search(r'\d', name):
        return False
    return all(re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ\-'.]+", w) for w in words)


def is_individual(initiative, amount, grantee_name):
    initiative = strip_html(initiative)
    amount = amount or 0
    name = grantee_name if isinstance(grantee_name, str) else ''
    if initiative in INDIVIDUAL_INITIATIVES:
        return True
    if initiative == 'Summer Institutes' and amount < 5000:
        return True
    if any(name.startswith(h) for h in HONORIFICS):
        return True
    if initiative == 'Central and Eastern European Initiative' and amount in (5000, 10000):
        return True
    if initiative in SCOPED_INITIATIVES and looks_like_person(name):
        return True
    return False


def apply_pst_override(map_df):
    """Return a copy of the map dataframe with the PST LA/LA override applied,
    mirroring the frontend's filteredMap logic. One row per (grant,country)."""
    import pandas as pd
    rows = []
    seen_pst = set()
    for _, r in map_df.iterrows():
        init = strip_html(r['initiative'])
        if init in PST_INITIATIVES:
            gid = str(r['grantId'])
            if gid in PST_KEEP_ORIGINAL:
                rows.append(r.to_dict())
            elif gid not in seen_pst:
                seen_pst.add(gid)
                d = r.to_dict()
                d['map_iso2'] = 'US'
                d['map_country'] = 'United States'
                d['map_city'] = 'Los Angeles'
                d['location_source'] = 'initiative_override'
                rows.append(d)
            # else: drop duplicate PST country rows for this grant
        else:
            rows.append(r.to_dict())
    return pd.DataFrame(rows)


def country_count_per_grant(overridden_map_df):
    """distinct mapped countries per grantId AFTER the PST override — the
    denominator for the multi-country dollar split."""
    g = overridden_map_df.dropna(subset=['map_iso2'])
    g = g[g['map_iso2'].astype(str).str.strip() != '']
    return g.groupby('grantId')['map_iso2'].nunique().to_dict()
