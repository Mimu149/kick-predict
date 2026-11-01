"""Hilfsfunktionen: HTTP, Namens-Normalisierung, Team-Zuordnung, Saisons."""
import difflib
import io
import json
import os
import re
import time
import unicodedata
from datetime import date, datetime

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "docs", "data")
CACHE_DIR = os.path.join(ROOT, ".cache")

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "fussball-predict/1.0 (+github actions)"

LOG = []          # Meldungen für status.json
UNMATCHED = set()  # nicht zugeordnete Teamnamen


def log(msg):
    print(msg, flush=True)
    LOG.append(msg)


def http_get(url, headers=None, params=None, retries=3, timeout=30, as_json=False):
    last = None
    for i in range(retries):
        try:
            r = SESSION.get(url, headers=headers, params=params, timeout=timeout)
            if r.status_code == 429:
                time.sleep(15 * (i + 1))
                continue
            r.raise_for_status()
            return r.json() if as_json else r
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"GET {url} fehlgeschlagen: {last}")


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return default


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


# ---------------------------------------------------------------- Saisons

def season_start_year(d=None):
    d = d or date.today()
    return d.year if d.month >= 7 else d.year - 1


def season_code(start):
    """2026 -> '2627' (football-data.co.uk)."""
    return f"{start % 100:02d}{(start + 1) % 100:02d}"


def season_label(start):
    return f"{start}/{(start + 1) % 100:02d}"


# ---------------------------------------------------------------- Namen

_STOP = {
    "fc", "cf", "afc", "sc", "ac", "as", "ss", "ssc", "sv", "vfb", "vfl", "tsg", "fsv",
    "bv", "bsc", "rcd", "cd", "ud", "sd", "rc", "ogc", "losc", "us", "sk", "fk", "jk",
    "if", "bk", "club", "clube", "kv", "sk", "sad", "de", "calcio", "the", "1", "1899", "05", "04", "1846", "1907",
    "1909", "1913", "1919", "1860", "07", "a", "s", "spor", "kulubu", "futbol", "cp",
}

_ALIAS_RAW = {
    # England
    "manchester united": "Man United", "manchester utd": "Man United",
    "manchester city": "Man City", "newcastle united": "Newcastle",
    "nottingham forest": "Nott'm Forest", "nottm forest": "Nott'm Forest",
    "wolverhampton wanderers": "Wolves", "wolverhampton": "Wolves",
    "tottenham hotspur": "Tottenham", "spurs": "Tottenham",
    "west ham united": "West Ham", "brighton hove albion": "Brighton",
    "brighton and hove albion": "Brighton", "sheffield utd": "Sheffield United",
    "leeds united": "Leeds", "leicester city": "Leicester", "ipswich town": "Ipswich",
    "luton town": "Luton", "afc bournemouth": "Bournemouth",
    # Deutschland
    "bayern munchen": "Bayern Munich", "bayern": "Bayern Munich",
    "borussia monchengladbach": "M'gladbach", "monchengladbach": "M'gladbach",
    "borussia m gladbach": "M'gladbach", "gladbach": "M'gladbach",
    "borussia dortmund": "Dortmund", "bayer leverkusen": "Leverkusen",
    "bayer 04 leverkusen": "Leverkusen", "eintracht frankfurt": "Ein Frankfurt",
    "koln": "FC Koln", "cologne": "FC Koln", "st pauli": "St Pauli",
    "heidenheim": "Heidenheim", "hoffenheim": "Hoffenheim", "mainz": "Mainz",
    "union berlin": "Union Berlin", "hamburger": "Hamburg", "hamburger sv": "Hamburg",
    "werder bremen": "Werder Bremen", "rb leipzig": "RB Leipzig", "leipzig": "RB Leipzig",
    "augsburg": "Augsburg", "wolfsburg": "Wolfsburg", "freiburg": "Freiburg",
    "sport club freiburg": "Freiburg", "holstein kiel": "Holstein Kiel",
    # Spanien
    "atletico madrid": "Ath Madrid", "club atletico de madrid": "Ath Madrid",
    "atletico de madrid": "Ath Madrid", "athletic club": "Ath Bilbao",
    "athletic bilbao": "Ath Bilbao", "real sociedad": "Sociedad",
    "real betis": "Betis", "real betis balompie": "Betis", "celta vigo": "Celta",
    "celta de vigo": "Celta", "rc celta": "Celta", "rayo vallecano": "Vallecano",
    "espanyol": "Espanol", "espanyol barcelona": "Espanol", "deportivo alaves": "Alaves",
    "real oviedo": "Oviedo", "real valladolid": "Valladolid", "ca osasuna": "Osasuna",
    "girona": "Girona", "rcd mallorca": "Mallorca", "ud las palmas": "Las Palmas",
    "elche": "Elche", "levante ud": "Levante",
    # Italien
    "ac milan": "Milan", "internazionale": "Inter", "inter milan": "Inter",
    "fc internazionale milano": "Inter", "as roma": "Roma", "hellas verona": "Verona",
    "ssc napoli": "Napoli", "ss lazio": "Lazio", "acf fiorentina": "Fiorentina",
    "atalanta bc": "Atalanta", "bologna fc 1909": "Bologna", "us lecce": "Lecce",
    "parma calcio": "Parma", "como 1907": "Como", "us sassuolo": "Sassuolo",
    "pisa sporting club": "Pisa",
    # Frankreich
    "paris saint germain": "Paris SG", "psg": "Paris SG", "paris sg": "Paris SG",
    "saint etienne": "St Etienne", "as saint etienne": "St Etienne",
    "stade brestois": "Brest", "stade brestois 29": "Brest", "stade rennais": "Rennes",
    "olympique lyonnais": "Lyon", "olympique lyon": "Lyon",
    "olympique marseille": "Marseille", "olympique de marseille": "Marseille",
    "as monaco": "Monaco", "ogc nice": "Nice", "rc lens": "Lens", "racing club de lens": "Lens",
    "lille osc": "Lille", "stade de reims": "Reims", "rc strasbourg alsace": "Strasbourg",
    "paris fc": "Paris FC", "le havre ac": "Le Havre",
    # Portugal
    "sporting cp": "Sp Lisbon", "sporting lisbon": "Sp Lisbon", "sporting clube de portugal": "Sp Lisbon",
    "sporting": "Sp Lisbon", "sporting clube de braga": "Sp Braga", "sporting clube braga": "Sp Braga", "sc braga": "Sp Braga", "sporting braga": "Sp Braga", "braga": "Sp Braga",
    "vitoria guimaraes": "Guimaraes", "vitoria sc": "Guimaraes", "fc porto": "Porto",
    "sl benfica": "Benfica", "gil vicente": "Gil Vicente", "fc famalicao": "Famalicao",
    "estoril praia": "Estoril", "moreirense": "Moreirense", "casa pia": "Casa Pia",
    "rio ave": "Rio Ave", "fc arouca": "Arouca", "cd nacional": "Nacional",
    "estrela amadora": "Estrela", "avs futebol sad": "AVS", "tondela": "Tondela",
    # Türkei
    "istanbul basaksehir": "Buyuksehyr", "basaksehir": "Buyuksehyr",
    "caykur rizespor": "Rizespor", "gaziantep": "Gaziantep", "fatih karagumruk": "Karagumruk",
    "kasimpasa": "Kasimpasa", "goztepe": "Goztepe", "kayserispor": "Kayserispor",
    "antalyaspor": "Antalyaspor", "konyaspor": "Konyaspor", "alanyaspor": "Alanyaspor",
    "samsunspor": "Samsunspor", "eyupspor": "Eyupspor", "kocaelispor": "Kocaelispor",
    "genclerbirligi": "Genclerbirligi",
    # Dänemark
    "copenhagen": "FC Copenhagen", "kobenhavn": "FC Copenhagen", "fc kobenhavn": "FC Copenhagen",
    "agf": "Aarhus", "agf aarhus": "Aarhus", "aab": "Aalborg", "aalborg bk": "Aalborg",
    "nordsjaelland": "Nordsjaelland", "brondby": "Brondby", "brondby if": "Brondby",
    "randers": "Randers", "silkeborg": "Silkeborg", "sonderjyske": "Sonderjyske",
    "viborg": "Viborg", "odense": "Odense", "ob": "Odense", "vejle": "Vejle",
    "lyngby": "Lyngby", "midtjylland": "Midtjylland", "fredericia": "Fredericia",
    # Weitere Ligen
    "queens park rangers": "QPR", "oh leuven": "Oud-Heverlee Leuven", "union saint gilloise": "St. Gilloise",
    "royale union saint gilloise": "St. Gilloise", "union sg": "St. Gilloise", "sint truidense": "St Truiden",
    "sint truiden": "St Truiden", "zulte waregem": "Waregem", "west bromwich albion": "West Brom",
    "sheffield wednesday": "Sheffield Weds", "psv eindhoven": "PSV Eindhoven", "nec": "Nijmegen", "nec nijmegen": "Nijmegen", "psv": "PSV Eindhoven",
    "az alkmaar": "AZ Alkmaar", "olympiacos piraeus": "Olympiakos", "olympiacos": "Olympiakos",
    "red bull salzburg": "Salzburg", "rb salzburg": "Salzburg", "bsc young boys": "Young Boys",
    "fc zurich": "Zurich", "fc basel": "Basel", "fc basel 1893": "Basel",
}


def strip_accents(s):
    s = s.replace("ı", "i").replace("ø", "o").replace("æ", "ae").replace("å", "aa")
    s = s.replace("Ø", "O").replace("Æ", "Ae").replace("Å", "Aa").replace("ß", "ss")
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def norm(name):
    s = strip_accents(str(name)).lower()
    s = s.replace("&", " and ").replace("'", " ").replace(".", " ").replace("-", " ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def core(name):
    toks = [t for t in norm(name).split() if t not in _STOP and not re.fullmatch(r"(18|19|20)\d\d", t)]
    return " ".join(toks) or norm(name)


ALIASES = {}
for _k, _v in _ALIAS_RAW.items():
    ALIASES[norm(_k)] = _v
    ALIASES[core(_k)] = _v


def load_user_aliases():
    path = os.path.join(ROOT, "pipeline", "aliases.json")
    for k, v in (read_json(path, {}) or {}).items():
        if not k.startswith("_"):
            ALIASES[norm(k)] = v
            ALIASES[core(k)] = v


def match_team(name, candidates, threshold=0.72):
    """Ordnet einen Teamnamen (z. B. aus einer API) einem Namen aus `candidates` zu."""
    if not name or not candidates:
        return None
    cands = list(candidates)
    by_norm = {norm(c): c for c in cands}
    by_core = {core(c): c for c in cands}
    n, c = norm(name), core(name)
    if n in by_norm:
        return by_norm[n]
    if c in by_core:
        return by_core[c]
    for key in (n, c):
        if key in ALIASES:
            target = ALIASES[key]
            if target in cands:
                return target
            t = norm(target)
            if t in by_norm:
                return by_norm[t]
    # Token-Enthaltensein (z. B. "Borussia Dortmund" <-> "Dortmund")
    ctoks = set(c.split())
    hits = [cand for cand_core, cand in by_core.items()
            if cand_core and (set(cand_core.split()) <= ctoks or ctoks <= set(cand_core.split()))]
    if len(hits) == 1:
        return hits[0]
    # Abkürzungen (z. B. "Universitatea Cluj" <-> "U. Cluj", "Univ. Craiova")
    ctl = c.split()
    ab = [cand for cand_core, cand in by_core.items()
          if len(cand_core.split()) == len(ctl) and len(ctl) > 1
          and all(a.startswith(b) or b.startswith(a) for a, b in zip(ctl, cand_core.split()))]
    if len(ab) == 1:
        return ab[0]
    # Präfix (z. B. "Amed" <-> "Amedspor")
    if len(c) >= 4:
        pre = [cand for cand_core, cand in by_core.items() if cand_core.startswith(c) or c.startswith(cand_core)]
        if len(pre) == 1:
            return pre[0]
    best, score = None, 0.0
    for cand_core, cand in by_core.items():
        s = difflib.SequenceMatcher(None, c, cand_core).ratio()
        if s > score:
            best, score = cand, s
    if score >= threshold:
        return best
    UNMATCHED.add(name)
    return None


def parse_date(s):
    s = str(s).strip()
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def csv_text(resp):
    raw = resp.content
    for enc in ("utf-8-sig", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("utf-8", errors="ignore")


def to_io(text):
    return io.StringIO(text)
