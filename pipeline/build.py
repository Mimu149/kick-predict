"""Vollständiger Lauf: Historie laden, Modelle fitten, Spiele holen, Prognosen schreiben.

Aufruf:  python pipeline/build.py           (normal)
         python pipeline/build.py --offline (ohne Live-Quellen, nur Historie/Tabellen)
"""
import math
import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import results as res  # noqa: E402
import stats as st  # noqa: E402
from config import ALL_COMPS, CUPS, DAYS_AHEAD, DERBIES, LEAGUE_STRENGTH, LEAGUES, MODEL, VALUE  # noqa: E402
from history import load_fixture_odds, load_history  # noqa: E402
from model import LeagueModel, ah_prob, elo_expect, markets, score_matrix, supremacy_from_expect  # noqa: E402
from sources import ApiFootball, clubelo, fd_matches  # noqa: E402
from util import (DATA_DIR, LOG, UNMATCHED, core, load_user_aliases, log, match_team, norm,  # noqa: E402
                  read_json, season_label, season_start_year, write_json)

UK = ZoneInfo("Europe/London")
NOW = datetime.now(timezone.utc)


def r3(x):
    return None if x is None else round(float(x), 3)


# ---------------------------------------------------------------- Derby

def derby_name(home, away):
    h, a = norm(home), norm(away)
    for k1, k2, name in DERBIES:
        if (any(k in h for k in k1) and any(k in a for k in k2)) or (any(k in a for k in k1) and any(k in h for k in k2)):
            return name
    return None


# ---------------------------------------------------------------- Fixtures zusammenführen

def _csv_kickoff(d, t=None):
    try:
        hh, mm = (int(x) for x in str(t).split(":")[:2])
    except Exception:  # noqa: BLE001
        hh, mm = 15, 0
    return datetime(d.year, d.month, d.day, hh, mm, tzinfo=UK).astimezone(timezone.utc).isoformat()


def collect_fixtures(api, odds_rows):
    raw = []
    if api.ok:
        raw += api.fixtures(DAYS_AHEAD)
        log(f"API-Football: {len(raw)} Spiele, {api.calls} Abrufe, Rest heute: {api.remaining}")
    fdm = fd_matches(DAYS_AHEAD)
    if fdm is not None:
        raw += fdm
        log(f"football-data.org: {len(fdm)} Spiele")
    for o in odds_rows:
        if o["date"] >= NOW.date() - timedelta(days=0) and o["date"] <= NOW.date() + timedelta(days=DAYS_AHEAD):
            raw.append({"comp": o["comp"], "kickoff": _csv_kickoff(o["date"], o.get("time")), "home": o["home"],
                        "away": o["away"], "src": "football-data.co.uk", "csvOdds": o["odds"]})
    return raw


def merge_fixtures(raw, resolve):
    merged = {}
    prio = {"API-Football": 0, "football-data.org": 1, "football-data.co.uk": 2}
    for fx in sorted(raw, key=lambda f: prio.get(f["src"], 9)):
        h, a = resolve(fx["comp"], fx["home"]), resolve(fx["comp"], fx["away"])
        kh = h["key"] if h else core(fx["home"])
        ka = a["key"] if a else core(fx["away"])
        day = fx["kickoff"][:10]
        key = (fx["comp"], day, kh, ka)
        # gleiche Partie mit leicht abweichendem Datum (Zeitzone) zusammenführen
        alt = [k for k in merged if k[0] == fx["comp"] and k[2] == kh and k[3] == ka
               and abs((pd.Timestamp(k[1]) - pd.Timestamp(day)).days) <= 1]
        if alt:
            m = merged[alt[0]]
            for f in ("apiId", "fdId", "homeLogo", "awayLogo", "venue", "round", "csvOdds"):
                if fx.get(f) and not m.get(f):
                    m[f] = fx[f]
            m["srcs"].add(fx["src"])
            continue
        fx = dict(fx)
        fx["h"], fx["a"] = h, a
        fx["srcs"] = {fx["src"]}
        merged[key] = fx
    return list(merged.values())


# ---------------------------------------------------------------- Hauptlogik

def main(offline=False):
    load_user_aliases()
    cur = season_start_year()
    hist = load_history()
    ref = pd.Timestamp(NOW.date())

    # ---------- Modelle je Liga
    models, team_comp, tables, league_avgs, cur_of = {}, {}, {}, {}, {}
    for comp in LEAGUES:
        df = hist[hist["comp"] == comp]
        if df.empty:
            continue
        cs = int(df["season"].max())  # aktuelle Saison dieser Liga (Kalenderjahr-Ligen beachten)
        cur_of[comp] = cs
        cur_df = df[df["season"] == cs]
        prev_teams = set(df[df["season"] == cs - 1]["home"])
        promoted = [t for t in set(cur_df["home"]) | set(cur_df["away"]) if t not in prev_teams]
        try:
            models[comp] = LeagueModel(comp).fit(df, ref, promoted)
        except Exception as e:  # noqa: BLE001
            log(f"Modell {comp}: {e}")
            continue
        for t in set(cur_df["home"]) | set(cur_df["away"]):
            team_comp[t] = comp
        label = str(cs) if LEAGUES[comp].get("calendar") else season_label(cs)
        tables[comp] = {"season": label, "rows": st.table(cur_df),
                        "avg": st.league_averages(df[df["season"] >= cs - 1]), "promoted": promoted}
        league_avgs[comp] = st.league_averages(df[df["season"] >= cs - 1])
        log(f"Modell {LEAGUES[comp]['name']}: {models[comp].n_matches} Spiele, Heimvorteil {math.exp(models[comp].home):.2f}x, rho {models[comp].rho:.2f}")

    # Kandidaten je Liga: aktuelle + letzte Saison
    cands = {comp: sorted(set(hist[(hist["comp"] == comp) & (hist["season"] >= cur_of.get(comp, cur) - 1)]["home"]))
             for comp in LEAGUES}
    all_current = sorted(team_comp)

    elo = {} if offline else clubelo()
    log(f"ClubElo: {len(elo)} Vereine")
    elo_by_country = {}
    for club, v in elo.items():
        elo_by_country.setdefault(v["country"], []).append(club)

    def resolve(comp, name):
        if comp in LEAGUES:
            t = match_team(name, cands.get(comp, []))
            return {"key": t, "comp": comp} if t else None
        t = match_team(name, all_current, threshold=0.85)
        return {"key": t, "comp": team_comp[t]} if t else None

    def elo_of(name, comp):
        if not elo:
            return None
        country = LEAGUES.get(comp, {}).get("elo") if comp else None
        pool = elo_by_country.get(country) if country else list(elo)
        club = match_team(name, pool or list(elo), threshold=0.8)
        if club:
            UNMATCHED.discard(name)
        return (club, elo[club]["elo"]) if club else None

    # ---------- Spiele
    api = ApiFootball() if not offline else ApiFootball.__new__(ApiFootball)
    if offline:
        api.key, api.remaining, api.calls, api.errors = "", None, 0, []
    odds_rows = [] if offline else load_fixture_odds()
    raw = [] if offline else collect_fixtures(api, odds_rows)
    fixtures = merge_fixtures(raw, resolve)
    fixtures = [f for f in fixtures if pd.Timestamp(f["kickoff"]) >= pd.Timestamp(NOW) - pd.Timedelta(hours=3)]
    fixtures.sort(key=lambda f: f["kickoff"])
    log(f"Spiele gesamt: {len(fixtures)}")

    # Odds-Zuordnung für Spiele, die nicht aus der CSV kamen
    odds_idx = {}
    for o in odds_rows:
        h = match_team(o["home"], cands.get(o["comp"], []))
        a = match_team(o["away"], cands.get(o["comp"], []))
        if h and a:
            odds_idx[(o["comp"], h, a)] = o["odds"]

    prev_data = read_json(os.path.join(DATA_DIR, "matches.json"), {}) or {}
    previous = {m["id"]: m for m in prev_data.get("matches", [])}

    out = []
    odds_budget = int(os.environ.get("ODDS_BUDGET", "15"))
    for fx in fixtures:
        comp = fx["comp"]
        h, a = fx["h"], fx["a"]
        hname, aname = (h or {}).get("key"), (a or {}).get("key")
        mid = f"{comp}-{fx['kickoff'][:10]}-{core(fx['home']).replace(' ', '')}-{core(fx['away']).replace(' ', '')}"
        rec = {
            "id": mid, "comp": comp, "kickoff": fx["kickoff"],
            "home": fx["home"], "away": fx["away"],
            "homeLogo": fx.get("homeLogo"), "awayLogo": fx.get("awayLogo"),
            "venue": fx.get("venue"), "round": fx.get("round"),
            "apiId": fx.get("apiId"), "fdId": fx.get("fdId"),
            "src": sorted(fx["srcs"]),
            "hk": hname, "ak": aname,
        }
        dn = derby_name(fx["home"], fx["away"]) or (derby_name(hname, aname) if hname and aname else None)
        rec["derby"] = dn
        eh = elo_of(fx["home"], (h or {}).get("comp") if comp in CUPS else comp)
        ea = elo_of(fx["away"], (a or {}).get("comp") if comp in CUPS else comp)
        if eh and ea:
            rec["elo"] = {"home": round(eh[1]), "away": round(ea[1])}

        notes = []
        lh = la = None
        rho = -0.05
        if comp in LEAGUES and comp in models and hname and aname and models[comp].has(hname) and models[comp].has(aname):
            mdl = models[comp]
            rho = mdl.rho
            lh, la = mdl.lambdas(hname, aname)
            base_lh, base_la = lh, la
            df = hist[hist["comp"] == comp]
            # Form
            fw = MODEL["form_weight"]
            fh = _form_factor(mdl, df, hname)
            fa = _form_factor(mdl, df, aname)
            if fh and fa:
                lh *= (fh[0] * fa[1]) ** fw
                la *= (fa[0] * fh[1]) ** fw
            # H2H
            hh = st.h2h(df, hname, aname)
            if hh["n"] >= 3:
                exp_tot = base_lh + base_la
                ratio = (hh["avgGoals"] * hh["n"] + exp_tot * 6) / (exp_tot * (hh["n"] + 6))
                ratio = min(1 + MODEL["h2h_max_effect"], max(1 - MODEL["h2h_max_effect"], ratio))
                lh *= ratio
                la *= ratio
                if abs(ratio - 1) > 0.03:
                    notes.append(f"H2H: {'torreicher' if ratio > 1 else 'torärmer'} als erwartet ({hh['avgGoals']} Tore/Spiel)")
            # Elo
            if eh and ea and MODEL["elo_blend"] > 0:
                T = lh + la
                s_elo = supremacy_from_expect(elo_expect(eh[1], ea[1]), T)
                s = (1 - MODEL["elo_blend"]) * (lh - la) + MODEL["elo_blend"] * s_elo
                lh, la = max(0.15, (T + s) / 2), max(0.15, (T - s) / 2)
            # Derby
            if dn:
                ha = mdl.home_adv(hname)
                lh *= math.exp(-ha * MODEL["derby_home_adv_cut"])
                notes.append("Derby: Heimvorteil reduziert, Remis wahrscheinlicher")
            rec["teams"] = _team_block(df, hname, aname, mdl, cur_of[comp], tables.get(comp))
            rec["h2h"] = hh
            rec["model"] = "Poisson/Dixon-Coles" + (" + Elo" if eh and ea else "")
        elif eh and ea:
            # Europapokal oder unbekanntes Team: Elo + Tor-Niveau der Heimatligen
            tot = []
            for side in (h, a):
                if side and side["comp"] in league_avgs:
                    tot.append(league_avgs[side["comp"]].get("goals", 2.7))
            T = float(np.mean(tot)) if tot else 2.7
            s = supremacy_from_expect(elo_expect(eh[1], ea[1]), T)
            lh, la = max(0.15, (T + s) / 2), max(0.15, (T - s) / 2)
            rec["model"] = "ClubElo"
            if h and a:
                blocks = {}
                for side, nm in (("home", hname), ("away", aname)):
                    c = (h if side == "home" else a)["comp"]
                    df = hist[hist["comp"] == c]
                    blocks[side] = _side_block(df, nm, cur_of[c], tables.get(c))
                    blocks[side]["league"] = LEAGUES[c]["name"]
                rec["teams"] = blocks
            if dn:
                lh *= math.exp(-0.25 * MODEL["derby_home_adv_cut"])
        elif comp in CUPS and h and a and h["comp"] in models and a["comp"] in models \
                and models[h["comp"]].has(hname) and models[a["comp"]].has(aname):
            # Ersatz ohne Elo: Liga-Modelle + Ligastärke
            mh, ma = models[h["comp"]], models[a["comp"]]
            oh, oa = LEAGUE_STRENGTH.get(h["comp"], -0.3), LEAGUE_STRENGTH.get(a["comp"], -0.3)
            mu = (mh.mu + ma.mu) / 2
            ih, ia = mh.idx[hname], ma.idx[aname]
            ha = 0.6 * mh.home_adv(hname)
            lh = math.exp(mu + ha + mh.att[ih] + oh + ma.dfn[ia] - oa)
            la = math.exp(mu + ma.att[ia] + oa + mh.dfn[ih] - oh)
            rec["model"] = "Liga-Modelle + Ligastärke"
            notes.append("Europapokal: Schätzung über Liga-Modelle (ClubElo nicht verfügbar)")
            blocks = {}
            for side, nm, c in (("home", hname, h["comp"]), ("away", aname, a["comp"])):
                df = hist[hist["comp"] == c]
                blocks[side] = _side_block(df, nm, cur_of[c], tables.get(c))
                blocks[side]["league"] = LEAGUES[c]["name"]
            rec["teams"] = blocks
            if dn:
                lh *= math.exp(-ha * MODEL["derby_home_adv_cut"])
        else:
            notes.append("Keine ausreichenden Daten für eine Prognose" +
                         (" (Team außerhalb der abgedeckten Ligen)" if comp in CUPS else ""))

        if lh is not None:
            m = score_matrix(lh, la, rho, derby=bool(dn))
            mk = markets(m)
            rec["xg"] = [r3(lh), r3(la)]
            rec["p"] = _round_markets(mk)
            # Quoten
            odds = fx.get("csvOdds") or (odds_idx.get((comp, hname, aname)) if hname and aname else None)
            if not odds and api.ok and fx.get("apiId") and odds_budget > 0 and \
                    pd.Timestamp(fx["kickoff"]) < pd.Timestamp(NOW) + pd.Timedelta(days=3):
                odds_budget -= 1
                odds = api.odds(fx["apiId"])
            if odds:
                rec["odds"] = odds
                rec["value"] = _value(mk, m, odds)
            rec["tip"] = _tip(mk)
        rec["notes"] = notes
        # Aufstellungen / Verletzungen aus dem letzten Lauf übernehmen
        prev = previous.get(mid)
        if prev:
            for f in ("lineups", "injuries"):
                if prev.get(f):
                    rec[f] = prev[f]
        out.append(rec)

    # ---------- Ergebnisse & Trefferquote
    try:
        arch = res.load()
        added = res.archive_from(prev_data, arch)
        api_res = [] if offline else res.api_results(api, days_back=1)
        fd_res = [] if offline else res.fd_results()
        filled = res.fill(arch, api_res, fd_res, hist)
        res.save(arch, NOW.isoformat())
        log(f"Ergebnisse: {added} archiviert, {filled} Endstände eingetragen, {len(arch['matches'])} im Archiv")
    except Exception as e:  # noqa: BLE001
        log(f"Ergebnisse: Fehler {e}")

    # ---------- Schreiben
    os.makedirs(DATA_DIR, exist_ok=True)
    meta = {k: {"name": v["name"], "flag": v["flag"], "cup": k in CUPS, "country": v.get("country", "Europa")} for k, v in ALL_COMPS.items()}
    write_json(os.path.join(DATA_DIR, "matches.json"),
               {"generated": NOW.isoformat(), "comps": meta, "matches": out})
    write_json(os.path.join(DATA_DIR, "tables.json"),
               {"generated": NOW.isoformat(), "comps": meta,
                "tables": {k: v for k, v in tables.items()},
                "ratings": {k: _ratings(models[k], team_comp) for k in models}})
    status = {
        "generated": NOW.isoformat(),
        "sources": {
            "API-Football": {"key": bool(os.environ.get("API_FOOTBALL_KEY")), "calls": api.calls,
                             "remaining": api.remaining, "errors": api.errors[:5]},
            "football-data.org": {"key": bool(os.environ.get("FOOTBALL_DATA_KEY"))},
            "ClubElo": {"clubs": len(elo)},
            "Historie": {"matches": int(len(hist)), "seasons": f"{season_label(cur - 5)} – {season_label(cur)}"},
        },
        "matches": len(out),
        "unmatched": sorted(UNMATCHED)[:60],
        "log": LOG[-80:],
    }
    write_json(os.path.join(DATA_DIR, "status.json"), status)
    log(f"Fertig: {len(out)} Spiele geschrieben")


# ---------------------------------------------------------------- Hilfen

def _form_factor(mdl, df, team, n=None):
    n = n or MODEL["form_matches"]
    g = st.team_games(df, team).tail(n)
    gf = ga = egf = ega = 0.0
    for _, r in g.iterrows():
        if not (mdl.has(r["home"]) and mdl.has(r["away"])):
            continue
        lh, la = mdl.lambdas(r["home"], r["away"])
        if r["home"] == team:
            gf, ga, egf, ega = gf + r["hg"], ga + r["ag"], egf + lh, ega + la
        else:
            gf, ga, egf, ega = gf + r["ag"], ga + r["hg"], egf + la, ega + lh
    if egf == 0:
        return None
    c = 4.0
    att = min(1.18, max(0.85, (gf + c) / (egf + c)))
    dfn = min(1.18, max(0.85, (ga + c) / (ega + c)))
    return att, dfn


def _side_block(df, team, cur, table):
    pos = None
    if table:
        for row in table["rows"]:
            if row["team"] == team:
                pos = row["pos"]
    last = st.form(df, team, 5)
    venue_home = st.form(df, team, 5, "H")
    venue_away = st.form(df, team, 5, "A")
    return {
        "name": team, "pos": pos,
        "form": last, "formSum": st.form_summary(st.form(df, team, 10)),
        "homeForm": venue_home, "awayForm": venue_away,
        "homeRec": st.record(df, team, "H", cur), "awayRec": st.record(df, team, "A", cur),
        "homeRec5y": st.record(df, team, "H"), "awayRec5y": st.record(df, team, "A"),
        "seasons": st.seasons(df, team),
    }


def _team_block(df, home, away, mdl, cur, table):
    b = {"home": _side_block(df, home, cur, table), "away": _side_block(df, away, cur, table)}
    b["home"]["rating"] = mdl.rating(home)
    b["away"]["rating"] = mdl.rating(away)
    return b


def _round_markets(mk):
    def rr(v):
        if isinstance(v, dict):
            return {k: rr(x) for k, x in v.items()}
        if isinstance(v, list):
            return [rr(x) for x in v]
        if isinstance(v, (float, np.floating)):
            return round(float(v), 4)
        return v
    return rr(mk)


def _tip(mk):
    x = mk["1X2"]
    best = max(x, key=x.get)
    label = {"H": "Heimsieg", "D": "Unentschieden", "A": "Auswärtssieg"}[best]
    p = x[best]
    conf = "hoch" if p >= 0.60 else ("mittel" if p >= 0.45 else "niedrig")
    ou = mk["OU"]["2.5"]
    goals = "Über 2,5 Tore" if ou["O"] >= 0.5 else "Unter 2,5 Tore"
    btts = "Beide treffen: Ja" if mk["BTTS"]["Y"] >= 0.5 else "Beide treffen: Nein"
    return {"pick": best, "label": label, "p": round(p, 4), "conf": conf,
            "goals": goals, "goalsP": round(max(ou["O"], ou["U"]), 4),
            "btts": btts, "bttsP": round(max(mk["BTTS"]["Y"], mk["BTTS"]["N"]), 4)}


def _value(mk, m, odds):
    cands = [
        ("1X2", "Heimsieg", mk["1X2"]["H"], odds.get("H"), odds.get("maxH")),
        ("1X2", "Unentschieden", mk["1X2"]["D"], odds.get("D"), odds.get("maxD")),
        ("1X2", "Auswärtssieg", mk["1X2"]["A"], odds.get("A"), odds.get("maxA")),
        ("O/U", "Über 2,5", mk["OU"]["2.5"]["O"], odds.get("O25"), odds.get("maxO25")),
        ("O/U", "Unter 2,5", mk["OU"]["2.5"]["U"], odds.get("U25"), odds.get("maxU25")),
        ("BTTS", "Beide treffen: Ja", mk["BTTS"]["Y"], odds.get("BTTSY"), odds.get("maxBTTSY")),
        ("BTTS", "Beide treffen: Nein", mk["BTTS"]["N"], odds.get("BTTSN"), odds.get("maxBTTSN")),
    ]
    ah = odds.get("AH")
    if ah and ah.get("line") is not None:
        line = float(ah["line"])
        ph, pa = ah_prob(m, line, "home"), ah_prob(m, line, "away")
        fmt = lambda x: f"{x:+.2f}".replace(".00", "").replace(".50", ".5").replace(".", ",")  # noqa: E731
        if ph:
            cands.append(("AH", f"AH Heim {fmt(line)}", ph, ah.get("home"), None))
        if pa:
            cands.append(("AH", f"AH Gast {fmt(-line)}", pa, ah.get("away"), None))
    out = []
    for market, label, p, o, omax in cands:
        if not o or p is None:
            continue
        edge = p * o - 1
        out.append({"market": market, "label": label, "p": round(float(p), 4), "odds": round(float(o), 2),
                    "maxOdds": round(float(omax), 2) if omax else None, "fair": round(1 / float(p), 2),
                    "edge": round(float(edge), 4),
                    "isValue": bool(edge >= VALUE["min_edge"] and p >= VALUE["min_prob"])})
    out.sort(key=lambda v: -v["edge"])
    return out


def _ratings(mdl, team_comp):
    rows = []
    for t in mdl.teams:
        if team_comp.get(t) != mdl.comp:
            continue
        r = mdl.rating(t)
        strength = r["att"] - r["def"]
        rows.append({"team": t, **r, "strength": round(strength, 3),
                     "xgf": round(math.exp(mdl.mu + r["att"] + mdl.home / 2), 2),
                     "xga": round(math.exp(mdl.mu + r["def"] + mdl.home / 2), 2)})
    rows.sort(key=lambda x: -x["strength"])
    return rows


if __name__ == "__main__":
    main(offline="--offline" in sys.argv)
