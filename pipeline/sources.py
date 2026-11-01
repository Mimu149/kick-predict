"""Live-Datenquellen: API-Football, football-data.org, ClubElo."""
import os
import time
from datetime import date, timedelta

import pandas as pd

from config import ALL_COMPS, API_TO_COMP, FD_TO_COMP
from util import csv_text, http_get, log, to_io

# ================================================================ API-Football

class ApiFootball:
    BASE = "https://v3.football.api-sports.io"

    def __init__(self):
        self.key = os.environ.get("API_FOOTBALL_KEY", "").strip()
        self.remaining = None
        self.calls = 0
        self.errors = []
        self._last = 0.0

    @property
    def ok(self):
        return bool(self.key)

    def get(self, path, **params):
        if not self.key:
            return None
        if self.remaining is not None and self.remaining <= 3:
            return None
        wait = 6.5 - (time.time() - self._last)  # Gratis-Plan: max. ~10 Abrufe/Minute
        if wait > 0:
            time.sleep(wait)
        self._last = time.time()
        try:
            r = http_get(self.BASE + path, headers={"x-apisports-key": self.key}, params=params, retries=2)
        except Exception as e:  # noqa: BLE001
            self.errors.append(str(e))
            log(f"API-Football {path}: {e}")
            return None
        self.calls += 1
        rem = r.headers.get("x-ratelimit-requests-remaining")
        if rem is not None and rem.isdigit():
            self.remaining = int(rem)
        data = r.json()
        err = data.get("errors")
        if err and (isinstance(err, dict) and err or isinstance(err, list) and err):
            self.errors.append(str(err))
            log(f"API-Football {path} {params}: {err}")
            return None
        return data.get("response", [])

    def fixtures(self, days):
        out = []
        # Gratis-Plan: nur gestern bis morgen abrufbar
        for i in range(min(days, 2)):
            d = (date.today() + timedelta(days=i)).isoformat()
            resp = self.get("/fixtures", date=d, timezone="UTC")
            if resp is None:
                continue
            for fx in resp:
                comp = API_TO_COMP.get(fx["league"]["id"])
                if not comp:
                    continue
                if fx["fixture"]["status"]["short"] in ("CANC", "PST", "ABD", "AWD", "WO"):
                    continue
                out.append({
                    "comp": comp,
                    "kickoff": fx["fixture"]["date"],
                    "home": fx["teams"]["home"]["name"],
                    "away": fx["teams"]["away"]["name"],
                    "homeLogo": fx["teams"]["home"].get("logo"),
                    "awayLogo": fx["teams"]["away"].get("logo"),
                    "apiId": fx["fixture"]["id"],
                    "venue": (fx["fixture"].get("venue") or {}).get("name"),
                    "round": fx["league"].get("round"),
                    "status": fx["fixture"]["status"]["short"],
                    "src": "API-Football",
                })
        return out

    def lineups(self, fixture_id):
        resp = self.get("/fixtures/lineups", fixture=fixture_id)
        if not resp:
            return None
        out = []
        for t in resp:
            out.append({
                "team": t["team"]["name"],
                "formation": t.get("formation"),
                "coach": (t.get("coach") or {}).get("name"),
                "xi": [{"n": p["player"]["name"], "no": p["player"].get("number"), "pos": p["player"].get("pos")}
                       for p in t.get("startXI", [])],
                "subs": [p["player"]["name"] for p in t.get("substitutes", [])],
            })
        return out

    def injuries(self, fixture_id):
        resp = self.get("/injuries", fixture=fixture_id)
        if resp is None:
            return None
        return [{"team": i["team"]["name"], "player": i["player"]["name"],
                 "type": i["player"].get("type"), "reason": i["player"].get("reason")} for i in resp]

    def odds(self, fixture_id):
        resp = self.get("/odds", fixture=fixture_id)
        if not resp:
            return None
        books = resp[0].get("bookmakers", [])
        if not books:
            return None
        o = {}
        for book in books[:6]:
            for bet in book.get("bets", []):
                name = bet.get("name")
                for v in bet.get("values", []):
                    try:
                        odd = float(v["odd"])
                    except (TypeError, ValueError):
                        continue
                    key = None
                    val = str(v.get("value"))
                    if name == "Match Winner":
                        key = {"Home": "H", "Draw": "D", "Away": "A"}.get(val)
                    elif name == "Goals Over/Under" and val in ("Over 2.5", "Under 2.5"):
                        key = "O25" if val.startswith("Over") else "U25"
                    elif name == "Both Teams Score":
                        key = {"Yes": "BTTSY", "No": "BTTSN"}.get(val)
                    if key:
                        o.setdefault(key, []).append(odd)
        # Durchschnitt + Höchstquote
        res = {}
        for k, vals in o.items():
            res[k] = round(sum(vals) / len(vals), 3)
            res["max" + k] = max(vals)
        return res


# ================================================================ football-data.org

def fd_matches(days):
    key = os.environ.get("FOOTBALL_DATA_KEY", "").strip()
    if not key:
        return None
    codes = ",".join(c for c in FD_TO_COMP)
    d0 = date.today()
    d1 = d0 + timedelta(days=min(days, 10) - 1)
    try:
        data = http_get("https://api.football-data.org/v4/matches", headers={"X-Auth-Token": key},
                        params={"competitions": codes, "dateFrom": d0.isoformat(), "dateTo": d1.isoformat()},
                        as_json=True)
    except Exception as e:  # noqa: BLE001
        log(f"football-data.org: {e}")
        return None
    out = []
    for m in data.get("matches", []):
        comp = FD_TO_COMP.get(m["competition"]["code"])
        if not comp or m.get("status") in ("POSTPONED", "CANCELLED", "SUSPENDED"):
            continue
        out.append({
            "comp": comp, "kickoff": m["utcDate"],
            "home": m["homeTeam"].get("name") or m["homeTeam"].get("shortName"),
            "away": m["awayTeam"].get("name") or m["awayTeam"].get("shortName"),
            "homeLogo": m["homeTeam"].get("crest"), "awayLogo": m["awayTeam"].get("crest"),
            "fdId": m["id"], "round": m.get("matchday"), "status": m.get("status"),
            "src": "football-data.org",
        })
    return out


def fd_standings(code):
    key = os.environ.get("FOOTBALL_DATA_KEY", "").strip()
    if not key:
        return None
    try:
        data = http_get(f"https://api.football-data.org/v4/competitions/{code}/standings",
                        headers={"X-Auth-Token": key}, as_json=True)
    except Exception as e:  # noqa: BLE001
        log(f"football-data.org Tabelle {code}: {e}")
        return None
    return data


# ================================================================ ClubElo

def clubelo(d=None):
    d = d or date.today()
    last = None
    for day in (d, d - timedelta(days=1), d - timedelta(days=3)):
        for scheme in ("http", "https"):
            try:
                text = csv_text(http_get(f"{scheme}://api.clubelo.com/{day.isoformat()}", retries=2))
                df = pd.read_csv(to_io(text))
                df = df.dropna(subset=["Club", "Elo"])
                if len(df):
                    return {r["Club"]: {"elo": float(r["Elo"]), "country": r["Country"]} for _, r in df.iterrows()}
            except Exception as e:  # noqa: BLE001
                last = e
    log(f"ClubElo nicht erreichbar: {last}")
    return {}


def comp_name(comp):
    return ALL_COMPS[comp]["name"]
