"""Zusätze: Halbzeit-Prognosen und Saison-Simulation."""
import numpy as np
from scipy.stats import poisson

G = 9  # max. Tore je Halbzeit und Team


def ht_ratio(df):
    """Anteil der Tore, die in der 1. Halbzeit fallen (Heim, Auswärts) – aus der Liga-Historie."""
    d = df[df["hthg"].notna() & df["htag"].notna()]
    if len(d) < 150 or d["hg"].sum() == 0 or d["ag"].sum() == 0:
        return 0.44, 0.44, False
    return float(d["hthg"].sum() / d["hg"].sum()), float(d["htag"].sum() / d["ag"].sum()), True


def halftime(lh, la, rh, ra):
    """Märkte für die 1. Halbzeit und Halbzeit/Endstand (unabhängige Poisson je Halbzeit)."""
    k = np.arange(G + 1)
    h1, a1 = poisson.pmf(k, lh * rh), poisson.pmf(k, la * ra)
    h2, a2 = poisson.pmf(k, lh * (1 - rh)), poisson.pmf(k, la * (1 - ra))
    m1 = np.outer(h1, a1)          # Halbzeit-Ergebnis
    m2 = np.outer(h2, a2)          # Tore 2. Halbzeit
    diff = np.subtract.outer(k, k)
    tot = np.add.outer(k, k)

    def dist(m):  # Verteilung der Tordifferenz
        d = {}
        for x in range(-G, G + 1):
            d[x] = float(m[diff == x].sum())
        return d

    d1, d2 = dist(m1), dist(m2)
    sign = lambda x: "1" if x > 0 else ("X" if x == 0 else "2")  # noqa: E731
    htft = {f"{a}/{b}": 0.0 for a in "1X2" for b in "1X2"}
    for x1, p1 in d1.items():
        if p1 < 1e-9:
            continue
        for x2, p2 in d2.items():
            if p2 < 1e-9:
                continue
            htft[f"{sign(x1)}/{sign(x1 + x2)}"] += p1 * p2
    s = sum(htft.values())
    htft = {k2: round(v / s, 4) for k2, v in htft.items()}
    out = {
        "xg": [round(lh * rh, 2), round(la * ra, 2)],
        "1X2": {"H": round(float(m1[diff > 0].sum()), 4), "D": round(float(m1[diff == 0].sum()), 4),
                "A": round(float(m1[diff < 0].sum()), 4)},
        "OU": {str(l): {"O": round(float(m1[tot > l].sum()), 4), "U": round(float(m1[tot < l].sum()), 4)}
               for l in (0.5, 1.5, 2.5)},
        "HTFT": htft,
    }
    # Halbzeit mit mehr Toren
    t1 = poisson.pmf(k, lh * rh + la * ra)
    t2 = poisson.pmf(k, lh * (1 - rh) + la * (1 - ra))
    mm = np.outer(t1, t2)
    out["more"] = {"1": round(float(mm[diff > 0].sum()), 4), "E": round(float(mm[diff == 0].sum()), 4),
                   "2": round(float(mm[diff < 0].sum()), 4)}
    return out


def simulate_season(model, cur_df, n=10000, seed=7):
    """Spielt die restlichen Saisonspiele n-mal durch (jede Paarung Heim + Auswärts einmal)."""
    teams = sorted(set(cur_df["home"]) | set(cur_df["away"]))
    if len(teams) < 6 or not all(model.has(t) for t in teams):
        return None
    idx = {t: i for i, t in enumerate(teams)}
    nt = len(teams)
    played = set(zip(cur_df["home"], cur_df["away"]))
    # Ligen mit mehr als 2 Duellen pro Saison (z. B. Schottland, Meister-/Abstiegsrunden) nur ungefähr
    rest = [(h, a) for h in teams for a in teams if h != a and (h, a) not in played]
    if not rest:
        return None
    pts = np.zeros(nt)
    gd = np.zeros(nt)
    gf = np.zeros(nt)
    for _, r in cur_df.iterrows():
        h, a = idx[r["home"]], idx[r["away"]]
        gf[h] += r["hg"]
        gf[a] += r["ag"]
        gd[h] += r["hg"] - r["ag"]
        gd[a] += r["ag"] - r["hg"]
        if r["hg"] > r["ag"]:
            pts[h] += 3
        elif r["hg"] < r["ag"]:
            pts[a] += 3
        else:
            pts[h] += 1
            pts[a] += 1
    hi = np.array([idx[h] for h, _ in rest])
    ai = np.array([idx[a] for _, a in rest])
    lam = np.array([model.lambdas(h, a) for h, a in rest])
    rng = np.random.default_rng(seed)
    HG = rng.poisson(lam[:, 0], size=(n, len(rest)))
    AG = rng.poisson(lam[:, 1], size=(n, len(rest)))
    P = np.tile(pts, (n, 1))
    D = np.tile(gd, (n, 1))
    F = np.tile(gf, (n, 1))
    hp = np.where(HG > AG, 3, np.where(HG == AG, 1, 0))
    ap = np.where(AG > HG, 3, np.where(HG == AG, 1, 0))
    for j in range(len(rest)):
        P[:, hi[j]] += hp[:, j]
        P[:, ai[j]] += ap[:, j]
        D[:, hi[j]] += HG[:, j] - AG[:, j]
        D[:, ai[j]] += AG[:, j] - HG[:, j]
        F[:, hi[j]] += HG[:, j]
        F[:, ai[j]] += AG[:, j]
    score = P * 1e6 + (D + 500) * 1e3 + F + rng.random((n, nt)) * 0.1
    order = np.argsort(-score, axis=1)
    pos = np.empty_like(order)
    rows = np.arange(n)[:, None]
    pos[rows, order] = np.arange(nt)[None, :]
    out = []
    for t, i in idx.items():
        pp = pos[:, i]
        out.append({"team": t, "pts": round(float(P[:, i].mean()), 1), "pos": round(float(pp.mean()) + 1, 1),
                    "p1": round(float((pp == 0).mean()), 4), "top4": round(float((pp < 4).mean()), 4),
                    "rel": round(float((pp >= nt - 3).mean()), 4)})
    out.sort(key=lambda x: -x["pts"])
    return {"teams": out, "left": len(rest) // max(1, nt // 2), "n": n}
