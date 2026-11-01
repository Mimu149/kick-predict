"""Statistiken aus der Historie: Form, Heim/Auswärts, H2H, Saisonbilanz, Tabelle."""
import pandas as pd


def _result(gf, ga):
    return "S" if gf > ga else ("U" if gf == ga else "N")


def team_games(df, team, before=None):
    g = df[(df["home"] == team) | (df["away"] == team)]
    if before is not None:
        g = g[g["date"] < before]
    return g.sort_values("date")


def form(df, team, n=5, venue=None, before=None):
    g = team_games(df, team, before)
    if venue == "H":
        g = g[g["home"] == team]
    elif venue == "A":
        g = g[g["away"] == team]
    g = g.tail(n)
    out = []
    for _, r in g.iloc[::-1].iterrows():
        home = r["home"] == team
        gf, ga = (r["hg"], r["ag"]) if home else (r["ag"], r["hg"])
        out.append({"d": r["date"].strftime("%Y-%m-%d"), "opp": r["away"] if home else r["home"],
                    "v": "H" if home else "A", "gf": int(gf), "ga": int(ga), "r": _result(gf, ga)})
    return out


def form_summary(items):
    if not items:
        return None
    pts = sum(3 if i["r"] == "S" else (1 if i["r"] == "U" else 0) for i in items)
    return {"n": len(items), "pts": pts, "ppg": round(pts / len(items), 2),
            "gf": sum(i["gf"] for i in items), "ga": sum(i["ga"] for i in items),
            "w": sum(i["r"] == "S" for i in items), "d": sum(i["r"] == "U" for i in items),
            "l": sum(i["r"] == "N" for i in items),
            "btts": sum(i["gf"] > 0 and i["ga"] > 0 for i in items),
            "o25": sum(i["gf"] + i["ga"] > 2 for i in items),
            "cs": sum(i["ga"] == 0 for i in items)}


def record(df, team, venue, season=None):
    g = df[df["home" if venue == "H" else "away"] == team]
    if season is not None:
        g = g[g["season"] == season]
    if g.empty:
        return None
    gf = g["hg"] if venue == "H" else g["ag"]
    ga = g["ag"] if venue == "H" else g["hg"]
    return {"P": int(len(g)), "W": int((gf > ga).sum()), "D": int((gf == ga).sum()), "L": int((gf < ga).sum()),
            "GF": int(gf.sum()), "GA": int(ga.sum()),
            "winPct": round(float((gf > ga).mean()) * 100), "o25Pct": round(float(((gf + ga) > 2).mean()) * 100),
            "bttsPct": round(float(((gf > 0) & (ga > 0)).mean()) * 100)}


def seasons(df, team):
    out = []
    for s in sorted(df["season"].unique(), reverse=True):
        h, a = record(df, team, "H", s), record(df, team, "A", s)
        if not h and not a:
            continue
        tot = {k: (h or {}).get(k, 0) + (a or {}).get(k, 0) for k in ("P", "W", "D", "L", "GF", "GA")}
        tot["Pts"] = tot["W"] * 3 + tot["D"]
        out.append({"season": f"{s}/{(s + 1) % 100:02d}", "home": h, "away": a, "total": tot})
    return out


def h2h(df, a, b, n=10):
    g = df[((df["home"] == a) & (df["away"] == b)) | ((df["home"] == b) & (df["away"] == a))].sort_values("date")
    if g.empty:
        return {"n": 0, "games": []}
    wa = ((g["home"] == a) & (g["hg"] > g["ag"])).sum() + ((g["away"] == a) & (g["ag"] > g["hg"])).sum()
    wb = ((g["home"] == b) & (g["hg"] > g["ag"])).sum() + ((g["away"] == b) & (g["ag"] > g["hg"])).sum()
    games = [{"d": r["date"].strftime("%Y-%m-%d"), "h": r["home"], "a": r["away"],
              "hg": int(r["hg"]), "ag": int(r["ag"])} for _, r in g.tail(n).iloc[::-1].iterrows()]
    return {"n": int(len(g)), "w1": int(wa), "d": int((g["hg"] == g["ag"]).sum()), "w2": int(wb),
            "avgGoals": round(float((g["hg"] + g["ag"]).mean()), 2),
            "btts": round(float(((g["hg"] > 0) & (g["ag"] > 0)).mean()) * 100),
            "o25": round(float(((g["hg"] + g["ag"]) > 2).mean()) * 100),
            "games": games}


def table(df):
    rows = {}
    for _, r in df.sort_values("date").iterrows():
        for team, gf, ga, venue in ((r["home"], r["hg"], r["ag"], "H"), (r["away"], r["ag"], r["hg"], "A")):
            t = rows.setdefault(team, {"team": team, "P": 0, "W": 0, "D": 0, "L": 0, "GF": 0, "GA": 0,
                                       "Pts": 0, "form": [], "hP": 0, "hPts": 0, "aP": 0, "aPts": 0})
            t["P"] += 1
            t["GF"] += int(gf)
            t["GA"] += int(ga)
            pts = 3 if gf > ga else (1 if gf == ga else 0)
            t["Pts"] += pts
            t["W" if gf > ga else ("D" if gf == ga else "L")] += 1
            t["form"].append(_result(gf, ga))
            if venue == "H":
                t["hP"] += 1
                t["hPts"] += pts
            else:
                t["aP"] += 1
                t["aPts"] += pts
    out = sorted(rows.values(), key=lambda t: (-t["Pts"], -(t["GF"] - t["GA"]), -t["GF"], t["team"]))
    for i, t in enumerate(out, 1):
        t["pos"] = i
        t["form"] = t["form"][-5:]
    return out


def league_averages(df):
    if df.empty:
        return {}
    return {"goals": round(float((df["hg"] + df["ag"]).mean()), 2),
            "homeWin": round(float((df["hg"] > df["ag"]).mean()) * 100),
            "draw": round(float((df["hg"] == df["ag"]).mean()) * 100),
            "awayWin": round(float((df["hg"] < df["ag"]).mean()) * 100),
            "btts": round(float(((df["hg"] > 0) & (df["ag"] > 0)).mean()) * 100),
            "o25": round(float(((df["hg"] + df["ag"]) > 2).mean()) * 100)}


def to_ts(d):
    return pd.Timestamp(d)
