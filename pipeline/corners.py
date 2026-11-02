"""Eckbälle: Statistik je Team (Heim/Auswärts) und Prognose (negativ-binomial)."""
import math

import numpy as np
from scipy.stats import nbinom, poisson

LINES = (7.5, 8.5, 9.5, 10.5, 11.5, 12.5)
SHRINK = 20  # Spiele, mit denen zum Ligaschnitt gezogen wird (Ecken sind schwer vorherzusagen)


def has_corners(df, min_games=150):
    return df["hc"].notna().sum() >= min_games


class CornerModel:
    """Pro Liga: Heim-/Auswärts-Eckenwerte je Team (aktuelle Saison voll, Vorsaison halb gewichtet)."""

    def __init__(self, df, cur):
        d = df[df["hc"].notna() & df["ac"].notna() & (df["season"] >= cur - 1)].copy()
        d["w"] = np.where(d["season"] == cur, 1.0, 0.5)
        self.ok = len(d) >= 100
        if not self.ok:
            return
        w = d["w"]
        self.H = float((d["hc"] * w).sum() / w.sum())   # Ø Ecken Heimteam
        self.A = float((d["ac"] * w).sum() / w.sum())   # Ø Ecken Auswärtsteam
        tot = d["hc"] + d["ac"]
        mean, var = float(tot.mean()), float(tot.var())
        # Überdispersion: Varianz > Mittelwert -> negative Binomialverteilung
        self.r = mean ** 2 / (var - mean) if var > mean * 1.05 else None
        self.teams = {}
        for t in set(d["home"]) | set(d["away"]):
            h = d[d["home"] == t]
            a = d[d["away"] == t]
            hw, aw = h["w"].sum(), a["w"].sum()
            self.teams[t] = {
                "hf": (float((h["hc"] * h["w"]).sum()) + SHRINK * self.H) / ((hw + SHRINK) * self.H),  # Heim: Ecken für
                "ha": (float((h["ac"] * h["w"]).sum()) + SHRINK * self.A) / ((hw + SHRINK) * self.A),  # Heim: Ecken gegen
                "af": (float((a["ac"] * a["w"]).sum()) + SHRINK * self.A) / ((aw + SHRINK) * self.A),  # Ausw.: Ecken für
                "aa": (float((a["hc"] * a["w"]).sum()) + SHRINK * self.H) / ((aw + SHRINK) * self.H),  # Ausw.: Ecken gegen
            }

    def has(self, t):
        return self.ok and t in self.teams

    def expect(self, home, away):
        h, a = self.teams[home], self.teams[away]
        return self.H * h["hf"] * a["aa"], self.A * a["af"] * h["ha"]

    def abs_home(self, t):
        x = self.teams[t]
        return self.H * x["hf"], self.A * x["ha"]

    def abs_away(self, t):
        x = self.teams[t]
        return self.A * x["af"], self.H * x["aa"]


def markets(lh, la, r=None):
    lam = lh + la
    out = {"exp": [round(lh, 2), round(la, 2)], "total": round(lam, 2), "OU": {}}
    for line in LINES:
        k = math.floor(line)
        if r:
            p = r / (r + lam)
            under = float(nbinom.cdf(k, r, p))
        else:
            under = float(poisson.cdf(k, lam))
        out["OU"][str(line)] = {"O": round(1 - under, 4), "U": round(under, 4)}
    # Wer hat mehr Ecken? (unabhängige Poisson)
    g = 30
    ph = poisson.pmf(np.arange(g), lh)
    pa = poisson.pmf(np.arange(g), la)
    m = np.outer(ph, pa)
    diff = np.subtract.outer(np.arange(g), np.arange(g))
    out["more"] = {"H": round(float(m[diff > 0].sum()), 4), "E": round(float(m[diff == 0].sum()), 4),
                   "A": round(float(m[diff < 0].sum()), 4)}
    return out


def team_stats(df, team, cur):
    """Ecken-Statistik eines Teams: diese Saison und 5 Jahre, getrennt Heim/Auswärts, letzte 5."""
    d = df[df["hc"].notna() & df["ac"].notna()]
    if d.empty:
        return None

    def block(sub_h, sub_a):
        res = {}
        if len(sub_h):
            res["home"] = {"n": int(len(sub_h)), "for": round(float(sub_h["hc"].mean()), 2),
                           "against": round(float(sub_h["ac"].mean()), 2),
                           "total": round(float((sub_h["hc"] + sub_h["ac"]).mean()), 2),
                           "o95": round(float(((sub_h["hc"] + sub_h["ac"]) > 9.5).mean()) * 100)}
        if len(sub_a):
            res["away"] = {"n": int(len(sub_a)), "for": round(float(sub_a["ac"].mean()), 2),
                           "against": round(float(sub_a["hc"].mean()), 2),
                           "total": round(float((sub_a["hc"] + sub_a["ac"]).mean()), 2),
                           "o95": round(float(((sub_a["hc"] + sub_a["ac"]) > 9.5).mean()) * 100)}
        return res or None

    h_all, a_all = d[d["home"] == team], d[d["away"] == team]
    out = {"season": block(h_all[h_all["season"] == cur], a_all[a_all["season"] == cur]),
           "all": block(h_all, a_all)}
    g = d[(d["home"] == team) | (d["away"] == team)].sort_values("date").tail(5)
    out["last"] = [{"d": r["date"].strftime("%Y-%m-%d"), "opp": r["away"] if r["home"] == team else r["home"],
                    "v": "H" if r["home"] == team else "A",
                    "cf": int(r["hc"] if r["home"] == team else r["ac"]),
                    "ca": int(r["ac"] if r["home"] == team else r["hc"])} for _, r in g.iloc[::-1].iterrows()]
    return out if (out["season"] or out["all"]) else None
