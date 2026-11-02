"""Historische Ergebnisse von football-data.co.uk laden (5 Saisons + laufende)."""
import os

import pandas as pd

from config import HISTORY_SEASONS, LEAGUES
from util import CACHE_DIR, csv_text, http_get, log, parse_date, season_code, season_start_year, to_io

BASE = "https://www.football-data.co.uk"
COLS = ["comp", "season", "date", "home", "away", "hg", "ag", "hc", "ac"]


def _cached(url, fname, refresh):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, fname)
    if os.path.exists(path) and not refresh:
        with open(path, encoding="utf-8") as f:
            return f.read()
    text = csv_text(http_get(url))
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return text


def _parse_main(text, comp, season):
    df = pd.read_csv(to_io(text), on_bad_lines="skip", low_memory=False)
    need = {"Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"}
    if not need <= set(df.columns):
        return pd.DataFrame(columns=COLS)
    df = df.dropna(subset=["HomeTeam", "AwayTeam", "FTHG", "FTAG"])
    out = pd.DataFrame({
        "comp": comp,
        "season": season,
        "date": df["Date"].map(parse_date),
        "home": df["HomeTeam"].astype(str).str.strip(),
        "away": df["AwayTeam"].astype(str).str.strip(),
        "hg": df["FTHG"].astype(int),
        "ag": df["FTAG"].astype(int),
        "hc": pd.to_numeric(df["HC"], errors="coerce") if "HC" in df.columns else float("nan"),
        "ac": pd.to_numeric(df["AC"], errors="coerce") if "AC" in df.columns else float("nan"),
    })
    return out.dropna(subset=["date"])


def _parse_new(text, comp, first_season):
    df = pd.read_csv(to_io(text), on_bad_lines="skip", low_memory=False)
    df = df.dropna(subset=["Home", "Away", "HG", "AG"])
    seasons = df["Season"].astype(str).str.slice(0, 4)
    df = df[pd.to_numeric(seasons, errors="coerce") >= first_season]
    out = pd.DataFrame({
        "comp": comp,
        "season": pd.to_numeric(df["Season"].astype(str).str.slice(0, 4)).astype(int),
        "date": df["Date"].map(parse_date),
        "home": df["Home"].astype(str).str.strip(),
        "away": df["Away"].astype(str).str.strip(),
        "hg": df["HG"].astype(int),
        "ag": df["AG"].astype(int),
        "hc": float("nan"),
        "ac": float("nan"),
    })
    return out.dropna(subset=["date"])


def load_history():
    cur = season_start_year()
    first = cur - (HISTORY_SEASONS - 1)
    frames = []
    for comp, cfg in LEAGUES.items():
        n_before = sum(len(f) for f in frames)
        if cfg.get("csv"):
            for s in range(first, cur + 1):
                code = season_code(s)
                url = f"{BASE}/mmz4281/{code}/{cfg['csv']}.csv"
                try:
                    text = _cached(url, f"{cfg['csv']}_{code}.csv", refresh=(s == cur))
                    frames.append(_parse_main(text, comp, s))
                except Exception as e:  # noqa: BLE001
                    log(f"Historie {comp} {code}: {e}")
        elif cfg.get("new"):
            url = f"{BASE}/new/{cfg['new']}.csv"
            try:
                text = _cached(url, f"{cfg['new']}.csv", refresh=True)
                frames.append(_parse_new(text, comp, first))
            except Exception as e:  # noqa: BLE001
                log(f"Historie {comp}: {e}")
        n = sum(len(f) for f in frames) - n_before
        log(f"Historie {cfg['name']}: {n} Spiele")
    if not frames:
        return pd.DataFrame(columns=COLS)
    df = pd.concat(frames, ignore_index=True)
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


def load_fixture_odds():
    """Kommende Spiele mit Quoten (football-data.co.uk fixtures.csv + new_league_fixtures.csv)."""
    rows = []
    for fname in ("fixtures.csv", "new_league_fixtures.csv"):
        try:
            text = csv_text(http_get(f"{BASE}/{fname}"))
            df = pd.read_csv(to_io(text), on_bad_lines="skip", low_memory=False)
        except Exception as e:  # noqa: BLE001
            log(f"Quoten {fname}: {e}")
            continue
        for _, r in df.iterrows():
            rows.append(_odds_row(r))
    return [r for r in rows if r]


def _num(r, *cols):
    for c in cols:
        if c in r and pd.notna(r[c]):
            try:
                v = float(r[c])
                if v > 1.0:
                    return v
            except (TypeError, ValueError):
                pass
    return None


def _odds_row(r):
    from config import CSV_TO_COMP, EN_TO_COMP
    comp = None
    if "Div" in r and r["Div"] in CSV_TO_COMP:
        comp = CSV_TO_COMP[r["Div"]]
    elif "Country" in r:
        comp = EN_TO_COMP.get(str(r.get("Country", "")).strip())
    if not comp:
        return None
    home = r.get("HomeTeam", r.get("Home"))
    away = r.get("AwayTeam", r.get("Away"))
    d = parse_date(r.get("Date"))
    if not isinstance(home, str) or not d:
        return None
    odds = {
        "H": _num(r, "AvgH", "AvgCH", "B365H", "PSH", "MaxH"),
        "D": _num(r, "AvgD", "AvgCD", "B365D", "PSD", "MaxD"),
        "A": _num(r, "AvgA", "AvgCA", "B365A", "PSA", "MaxA"),
        "O25": _num(r, "Avg>2.5", "B365>2.5", "P>2.5", "Max>2.5"),
        "U25": _num(r, "Avg<2.5", "B365<2.5", "P<2.5", "Max<2.5"),
        "maxH": _num(r, "MaxH", "MaxCH"), "maxD": _num(r, "MaxD", "MaxCD"), "maxA": _num(r, "MaxA", "MaxCA"),
        "maxO25": _num(r, "Max>2.5"), "maxU25": _num(r, "Max<2.5"),
    }
    ahh = r.get("AHh")
    if ahh is not None and pd.notna(ahh):
        odds["AH"] = {"line": float(ahh),
                      "home": _num(r, "AvgAHH", "B365AHH", "PAHH", "MaxAHH"),
                      "away": _num(r, "AvgAHA", "B365AHA", "PAHA", "MaxAHA")}
    return {"comp": comp, "date": d, "time": r.get("Time"), "home": home.strip(), "away": away.strip(),
            "odds": {k: v for k, v in odds.items() if v}}
