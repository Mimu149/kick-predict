"""Ergebnisse: Prognosen archivieren, Endstände holen, Tipps auswerten (richtig/falsch)."""
import os
from datetime import date, datetime, timedelta, timezone

import pandas as pd

from util import DATA_DIR, core, http_get, log, read_json, write_json

PATH = os.path.join(DATA_DIR, "results.json")
KEEP_DAYS = 60
FINISHED_API = {"FT", "AET", "PEN"}


def _ts(iso):
    return datetime.fromisoformat(str(iso).replace("Z", "+00:00"))


# ---------------------------------------------------------------- Archiv

def load():
    return read_json(PATH, {"matches": []}) or {"matches": []}


def archive_from(data, arch, now=None):
    """Übernimmt Prognosen aus einer matches.json, deren Spiele begonnen haben.
    Nur Prognosen, die VOR dem Anpfiff erstellt wurden, werden gespeichert."""
    now = now or datetime.now(timezone.utc)
    if not data:
        return 0
    gen = _ts(data.get("generated", "1970-01-01T00:00:00+00:00"))
    have = {m["id"] for m in arch["matches"]}
    added = 0
    for m in data.get("matches", []):
        if m["id"] in have or not m.get("p") or _dup(m, arch["matches"]):
            continue
        ko = _ts(m["kickoff"])
        if ko > now or gen >= ko:
            continue
        arch["matches"].append(snapshot(m))
        have.add(m["id"])
        added += 1
    return added


def _dup(m, lst):
    """Gleiches Spiel unter anderem Namen (z. B. 'SC Braga' / 'Sp Braga')?"""
    for x in lst:
        if x["comp"] == m["comp"] and x["kickoff"][:16] == m["kickoff"][:16] and \
                (core(x["home"]) == core(m["home"]) or core(x["away"]) == core(m["away"])):
            return True
    return False


def snapshot(m):
    p = m["p"]
    return {
        "id": m["id"], "comp": m["comp"], "kickoff": m["kickoff"],
        "home": m["home"], "away": m["away"], "homeLogo": m.get("homeLogo"), "awayLogo": m.get("awayLogo"),
        "hk": m.get("hk"), "ak": m.get("ak"), "apiId": m.get("apiId"), "fdId": m.get("fdId"),
        "derby": m.get("derby"), "xg": m.get("xg"), "tip": m.get("tip"),
        "p": {"H": p["1X2"]["H"], "D": p["1X2"]["D"], "A": p["1X2"]["A"],
              "O25": p["OU"]["2.5"]["O"], "BTTS": p["BTTS"]["Y"]},
        "value": [v for v in (m.get("value") or []) if v.get("isValue")],
        "result": None,
    }


# ---------------------------------------------------------------- Ergebnisse holen

def api_results(api, days_back=1):
    out = []
    if not api or not api.ok:
        return out
    for i in range(days_back, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        resp = api.raw.get(d) if getattr(api, "raw", None) and d in api.raw else api.get("/fixtures", date=d, timezone="UTC")
        for fx in resp or []:
            if fx["fixture"]["status"]["short"] not in FINISHED_API:
                continue
            ft = (fx.get("score") or {}).get("fulltime") or {}
            hg = ft.get("home") if ft.get("home") is not None else fx["goals"]["home"]
            ag = ft.get("away") if ft.get("away") is not None else fx["goals"]["away"]
            if hg is None or ag is None:
                continue
            out.append({"apiId": fx["fixture"]["id"], "hg": int(hg), "ag": int(ag),
                        "home": fx["teams"]["home"]["name"], "away": fx["teams"]["away"]["name"],
                        "date": fx["fixture"]["date"][:10]})
    return out


def fd_results(days_back=6):
    key = os.environ.get("FOOTBALL_DATA_KEY", "").strip()
    if not key:
        return []
    d1 = date.today()
    d0 = d1 - timedelta(days=days_back)
    try:
        data = http_get("https://api.football-data.org/v4/matches", headers={"X-Auth-Token": key},
                        params={"dateFrom": d0.isoformat(), "dateTo": d1.isoformat(), "status": "FINISHED"},
                        as_json=True)
    except Exception as e:  # noqa: BLE001
        log(f"Ergebnisse football-data.org: {e}")
        return []
    out = []
    for m in data.get("matches", []):
        sc = m.get("score") or {}
        t = sc.get("regularTime") or sc.get("fullTime") or {}
        if t.get("home") is None:
            continue
        out.append({"fdId": m["id"], "hg": int(t["home"]), "ag": int(t["away"])})
    return out


def fill(arch, api_res=(), fd_res=(), hist=None):
    by_api = {r["apiId"]: r for r in api_res}
    by_fd = {r["fdId"]: r for r in fd_res}
    n = 0
    for m in arch["matches"]:
        if m.get("result"):
            continue
        r = None
        if m.get("apiId") in by_api:
            r = by_api[m["apiId"]]
        elif m.get("fdId") in by_fd:
            r = by_fd[m["fdId"]]
        elif hist is not None and m.get("hk") and m.get("ak"):
            d = pd.Timestamp(m["kickoff"][:10])
            g = hist[(hist["comp"] == m["comp"]) & (hist["home"] == m["hk"]) & (hist["away"] == m["ak"])
                     & ((hist["date"] - d).abs() <= pd.Timedelta(days=1))]
            if len(g):
                r = {"hg": int(g.iloc[0]["hg"]), "ag": int(g.iloc[0]["ag"])}
        if r:
            m["result"] = {"hg": r["hg"], "ag": r["ag"]}
            m["eval"] = evaluate(m)
            n += 1
    return n


# ---------------------------------------------------------------- Auswertung

def _ah_profit(diff, line, odds):
    halves = [line - 0.25, line + 0.25] if abs((line * 4) % 2 - 1) < 1e-9 else [line, line]
    prof = 0.0
    for l in halves:
        mar = diff + l
        prof += 0.5 * ((odds - 1) if mar > 0 else (0 if abs(mar) < 1e-9 else -1))
    return prof


def _parse_line(label):
    try:
        return float(label.split()[-1].replace(",", "."))
    except ValueError:
        return None


def settle(v, hg, ag):
    """Gewinn in Einheiten (Einsatz 1) für einen Value-Tipp."""
    lab, o = v["label"], v["odds"]
    win = None
    if lab == "Heimsieg":
        win = hg > ag
    elif lab == "Unentschieden":
        win = hg == ag
    elif lab == "Auswärtssieg":
        win = hg < ag
    elif lab.startswith("Über 2,5"):
        win = hg + ag > 2.5
    elif lab.startswith("Unter 2,5"):
        win = hg + ag < 2.5
    elif lab == "Beide treffen: Ja":
        win = hg > 0 and ag > 0
    elif lab == "Beide treffen: Nein":
        win = not (hg > 0 and ag > 0)
    elif lab.startswith("AH Heim"):
        line = _parse_line(lab)
        return None if line is None else round(_ah_profit(hg - ag, line, o), 3)
    elif lab.startswith("AH Gast"):
        line = _parse_line(lab)
        return None if line is None else round(_ah_profit(ag - hg, line, o), 3)
    if win is None:
        return None
    return round(o - 1, 3) if win else -1.0


def evaluate(m):
    hg, ag = m["result"]["hg"], m["result"]["ag"]
    actual = "H" if hg > ag else ("D" if hg == ag else "A")
    tip = m.get("tip") or {}
    ev = {"actual": actual, "x12": tip.get("pick") == actual}
    if tip.get("goals"):
        ev["goals"] = (hg + ag > 2.5) == tip["goals"].startswith("Über")
    if tip.get("btts"):
        ev["btts"] = (hg > 0 and ag > 0) == tip["btts"].endswith("Ja")
    vals = []
    for v in m.get("value") or []:
        pr = settle(v, hg, ag)
        if pr is not None:
            vals.append({"label": v["label"], "odds": v["odds"], "profit": pr})
    ev["value"] = vals
    return ev


def summary(arch, days):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    done = [m for m in arch["matches"] if m.get("eval") and _ts(m["kickoff"]) >= cutoff]
    if not done:
        return None
    def rate(k):
        xs = [m["eval"][k] for m in done if k in m["eval"]]
        return {"ok": sum(xs), "n": len(xs)}
    vals = [v for m in done for v in m["eval"].get("value", [])]
    prof = sum(v["profit"] for v in vals)
    vals2 = [v for v in vals if v["odds"] >= 2.0]
    prof2 = sum(v["profit"] for v in vals2)
    by_conf = {}
    for m in done:
        c = (m.get("tip") or {}).get("conf")
        if c:
            b = by_conf.setdefault(c, {"ok": 0, "n": 0})
            b["n"] += 1
            b["ok"] += int(m["eval"]["x12"])
    return {"days": days, "matches": len(done), "x12": rate("x12"), "goals": rate("goals"), "btts": rate("btts"),
            "byConf": by_conf,
            "value": {"n": len(vals), "won": sum(v["profit"] > 0 for v in vals), "profit": round(prof, 2),
                      "roi": round(prof / len(vals), 4) if vals else None},
            "value2": {"n": len(vals2), "won": sum(v["profit"] > 0 for v in vals2), "profit": round(prof2, 2),
                       "roi": round(prof2 / len(vals2), 4) if vals2 else None}}


def save(arch, generated):
    cutoff = datetime.now(timezone.utc) - timedelta(days=KEEP_DAYS)
    arch["matches"] = [m for m in arch["matches"] if _ts(m["kickoff"]) >= cutoff]
    arch["matches"].sort(key=lambda m: m["kickoff"], reverse=True)
    arch["generated"] = generated
    arch["summary"] = {"7": summary(arch, 7), "30": summary(arch, 30), "all": summary(arch, KEEP_DAYS)}
    write_json(PATH, arch)
