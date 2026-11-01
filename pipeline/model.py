"""Prognosemodell: zeitgewichtetes Poisson / Dixon-Coles mit team-spezifischem Heimvorteil."""
import math

import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson

from config import MODEL


class LeagueModel:
    def __init__(self, comp):
        self.comp = comp
        self.teams = []
        self.idx = {}
        self.mu = 0.3
        self.home = 0.25
        self.att = None
        self.dfn = None
        self.hadv = None
        self.rho = -0.05
        self.n_matches = 0

    # ------------------------------------------------------------ Fitting
    def fit(self, df, ref_date, promoted=()):
        df = df[df["date"] <= ref_date]
        if len(df) < 50:
            raise ValueError("zu wenige Spiele")
        teams = sorted(set(df["home"]) | set(df["away"]))
        self.teams, self.idx = teams, {t: i for i, t in enumerate(teams)}
        n = len(teams)
        hi = df["home"].map(self.idx).to_numpy()
        ai = df["away"].map(self.idx).to_numpy()
        hg = df["hg"].to_numpy(float)
        ag = df["ag"].to_numpy(float)
        age = (ref_date - df["date"]).dt.days.to_numpy(float)
        w = 0.5 ** (age / MODEL["half_life_days"])
        self.n_matches = len(df)

        prior_att = np.zeros(n)
        prior_def = np.zeros(n)
        for t in promoted:
            if t in self.idx:
                prior_att[self.idx[t]] = MODEL["promoted_attack"]
                prior_def[self.idx[t]] = MODEL["promoted_defence"]
        lam_r, lam_h = MODEL["ridge"], MODEL["ridge_home"]

        def unpack(x):
            return x[0], x[1], x[2:2 + n], x[2 + n:2 + 2 * n], x[2 + 2 * n:]

        def f(x):
            mu, home, att, dfn, hadv = unpack(x)
            lh = np.exp(mu + home + hadv[hi] + att[hi] + dfn[ai])
            la = np.exp(mu + att[ai] + dfn[hi])
            nll = np.sum(w * (lh - hg * np.log(lh))) + np.sum(w * (la - ag * np.log(la)))
            pen = lam_r * (np.sum((att - prior_att) ** 2) + np.sum((dfn - prior_def) ** 2)) + lam_h * np.sum(hadv ** 2)
            rh = w * (lh - hg)
            ra = w * (la - ag)
            g = np.zeros_like(x)
            g[0] = rh.sum() + ra.sum()
            g[1] = rh.sum()
            g_att = np.bincount(hi, rh, n) + np.bincount(ai, ra, n)
            g_def = np.bincount(ai, rh, n) + np.bincount(hi, ra, n)
            g_h = np.bincount(hi, rh, n)
            g[2:2 + n] = g_att + 2 * lam_r * (att - prior_att)
            g[2 + n:2 + 2 * n] = g_def + 2 * lam_r * (dfn - prior_def)
            g[2 + 2 * n:] = g_h + 2 * lam_h * hadv
            return nll + pen, g

        x0 = np.concatenate([[math.log(max(hg.mean(), 0.5)) - 0.1, 0.2], prior_att, prior_def, np.zeros(n)])
        res = minimize(f, x0, jac=True, method="L-BFGS-B", options={"maxiter": 500})
        self.mu, self.home, self.att, self.dfn, self.hadv = unpack(res.x)

        # Dixon-Coles rho über Gitter
        lh = np.exp(self.mu + self.home + self.hadv[hi] + self.att[hi] + self.dfn[ai])
        la = np.exp(self.mu + self.att[ai] + self.dfn[hi])
        best, best_ll = 0.0, -1e18
        for rho in np.arange(-0.20, 0.021, 0.01):
            tau = _tau_vec(hg, ag, lh, la, rho)
            if np.any(tau <= 0):
                continue
            ll = np.sum(w * np.log(tau))
            if ll > best_ll:
                best, best_ll = rho, ll
        self.rho = float(best)
        return self

    # ------------------------------------------------------------ Vorhersage
    def has(self, team):
        return team in self.idx

    def lambdas(self, home, away, neutral=False):
        h, a = self.idx[home], self.idx[away]
        hv = 0.0 if neutral else self.home + self.hadv[h]
        lh = math.exp(self.mu + hv + self.att[h] + self.dfn[a])
        la = math.exp(self.mu + self.att[a] + self.dfn[h])
        return lh, la

    def home_adv(self, team):
        return self.home + self.hadv[self.idx[team]]

    def rating(self, team):
        i = self.idx[team]
        return {"att": round(float(self.att[i]), 3), "def": round(float(self.dfn[i]), 3),
                "home": round(float(self.hadv[i]), 3)}


def _tau_vec(x, y, lh, la, rho):
    tau = np.ones_like(lh)
    m00 = (x == 0) & (y == 0)
    m01 = (x == 0) & (y == 1)
    m10 = (x == 1) & (y == 0)
    m11 = (x == 1) & (y == 1)
    tau[m00] = 1 - lh[m00] * la[m00] * rho
    tau[m01] = 1 + lh[m01] * rho
    tau[m10] = 1 + la[m10] * rho
    tau[m11] = 1 - rho
    return tau


def score_matrix(lh, la, rho=-0.05, derby=False):
    g = MODEL["max_goals"]
    ph = poisson.pmf(np.arange(g + 1), lh)
    pa = poisson.pmf(np.arange(g + 1), la)
    m = np.outer(ph, pa)
    m[0, 0] *= 1 - lh * la * rho
    m[0, 1] *= 1 + lh * rho
    m[1, 0] *= 1 + la * rho
    m[1, 1] *= 1 - rho
    if derby:
        np.fill_diagonal(m, np.diag(m) * (1 + MODEL["derby_draw_boost"] * 2))
    m = np.clip(m, 0, None)
    return m / m.sum()


def _ah_fair(m, line):
    """Faire Quoten für Asian Handicap (line = Handicap Heim, z. B. -0.75)."""
    g = m.shape[0]
    diff = np.subtract.outer(np.arange(g), np.arange(g))
    halves = [line - 0.25, line + 0.25] if abs((line * 4) % 2 - 1) < 1e-9 else [line, line]
    pw_h = pp_h = pw_a = 0.0
    for l in halves:
        mar = diff + l
        pw_h += m[mar > 0].sum()
        pp_h += m[np.isclose(mar, 0)].sum()
        pw_a += m[mar < 0].sum()
    res = {}
    if pw_h > 0:
        res["home"] = (2 - pp_h) / pw_h
    if pw_a > 0:
        res["away"] = (2 - pp_h) / pw_a
    return res


def markets(m):
    g = m.shape[0]
    diff = np.subtract.outer(np.arange(g), np.arange(g))
    tot = np.add.outer(np.arange(g), np.arange(g))
    pH, pD, pA = m[diff > 0].sum(), m[diff == 0].sum(), m[diff < 0].sum()
    out = {
        "1X2": {"H": pH, "D": pD, "A": pA},
        "DC": {"1X": pH + pD, "X2": pD + pA, "12": pH + pA},
        "OU": {},
        "BTTS": {"Y": m[1:, 1:].sum(), "N": 1 - m[1:, 1:].sum()},
        "AH": [],
        "CS": [],
        "TG": {},
    }
    for line in (0.5, 1.5, 2.5, 3.5, 4.5):
        o = m[tot > line].sum()
        out["OU"][str(line)] = {"O": o, "U": 1 - o}
    for line in np.arange(-2.5, 2.51, 0.25):
        f = _ah_fair(m, float(line))
        if "home" in f and "away" in f and 1.05 < f["home"] < 30 and 1.05 < f["away"] < 30:
            out["AH"].append({"line": round(float(line), 2), "home": f["home"], "away": f["away"]})
    flat = [((i, j), m[i, j]) for i in range(min(g, 7)) for j in range(min(g, 7))]
    flat.sort(key=lambda t: -t[1])
    out["CS"] = [[f"{i}-{j}", p] for (i, j), p in flat[:8]]
    for k in range(0, 6):
        out["TG"][str(k) if k < 5 else "5+"] = m[tot == k].sum() if k < 5 else m[tot >= 5].sum()
    return out


def ah_prob(m, line, side):
    f = _ah_fair(m, line)
    o = f.get(side)
    return 1 / o if o else None


# ---------------------------------------------------------------- Elo

def elo_expect(elo_h, elo_a, neutral=False):
    dr = elo_h - elo_a + (0 if neutral else MODEL["elo_hfa"])
    return 1 / (1 + 10 ** (-dr / 400))


def _exp_score(lh, la):
    g = MODEL["max_goals"]
    m = np.outer(poisson.pmf(np.arange(g + 1), lh), poisson.pmf(np.arange(g + 1), la))
    diff = np.subtract.outer(np.arange(g + 1), np.arange(g + 1))
    return m[diff > 0].sum() + 0.5 * m[diff == 0].sum()


def supremacy_from_expect(we, total):
    """Tordifferenz-Erwartung, die zur Elo-Siegerwartung `we` passt."""
    lo, hi = -total + 0.1, total - 0.1
    for _ in range(40):
        mid = (lo + hi) / 2
        if _exp_score((total + mid) / 2, (total - mid) / 2) < we:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
