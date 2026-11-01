"""Zentrale Konfiguration: Ligen, Datenquellen, Derbys, Modell-Parameter."""

# Anzahl Saisons Historie (5 abgeschlossene + laufende)
HISTORY_SEASONS = 6

# Tage im Voraus, für die Spiele geladen werden
DAYS_AHEAD = 7

# Domestische Ligen
#   csv   = Kürzel bei football-data.co.uk (mmz4281/<saison>/<csv>.csv)
#   new   = Datei im "new leagues"-Format (eine Datei, alle Saisons)
#   fd    = Code bei football-data.org (None = nicht im Gratis-Plan)
#   api   = Liga-ID bei API-Football
#   elo   = Ländercode bei ClubElo
LEAGUES = {
    "PL":  {"name": "Premier League",  "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "csv": "E0",  "fd": "PL",  "api": 39,  "elo": "ENG"},
    "BL":  {"name": "Bundesliga",      "country": "Deutschland", "flag": "🇩🇪", "csv": "D1",  "fd": "BL1", "api": 78,  "elo": "GER"},
    "LL":  {"name": "LaLiga",          "country": "Spanien",     "flag": "🇪🇸", "csv": "SP1", "fd": "PD",  "api": 140, "elo": "ESP"},
    "SA":  {"name": "Serie A",         "country": "Italien",     "flag": "🇮🇹", "csv": "I1",  "fd": "SA",  "api": 135, "elo": "ITA"},
    "L1":  {"name": "Ligue 1",         "country": "Frankreich",  "flag": "🇫🇷", "csv": "F1",  "fd": "FL1", "api": 61,  "elo": "FRA"},
    "PT":  {"name": "Liga Portugal",   "country": "Portugal",    "flag": "🇵🇹", "csv": "P1",  "fd": "PPL", "api": 94,  "elo": "POR"},
    "TR":  {"name": "Süper Lig",       "country": "Türkei",      "flag": "🇹🇷", "csv": "T1",  "fd": None,  "api": 203, "elo": "TUR"},
    "DK":  {"name": "Superliga",       "country": "Dänemark",    "flag": "🇩🇰", "new": "DNK", "fd": None,  "api": 119, "elo": "DEN"},
}

# Ligastärke (Log-Skala, relativ zur Premier League) – Ersatz, falls ClubElo nicht erreichbar ist
LEAGUE_STRENGTH = {"PL": 0.0, "LL": -0.06, "BL": -0.08, "SA": -0.07, "L1": -0.14,
                   "PT": -0.22, "TR": -0.30, "DK": -0.36}

# Europapokale (keine eigene Liga-Historie -> Modell über ClubElo + Liga-Modelle)
CUPS = {
    "CL":  {"name": "Champions League",  "flag": "⭐", "fd": "CL", "api": 2},
    "EL":  {"name": "Europa League",     "flag": "🟠", "fd": None, "api": 3},
    "ECL": {"name": "Conference League", "flag": "🟢", "fd": None, "api": 848},
}

ALL_COMPS = {**LEAGUES, **CUPS}
API_TO_COMP = {v["api"]: k for k, v in ALL_COMPS.items()}
FD_TO_COMP = {v["fd"]: k for k, v in ALL_COMPS.items() if v.get("fd")}
CSV_TO_COMP = {v["csv"]: k for k, v in LEAGUES.items() if v.get("csv")}

# Derbys: Paare von Schlüsselwort-Listen (auf normalisierte Teamnamen geprüft)
DERBIES = [
    # England
    (["arsenal"], ["tottenham"], "North London Derby"),
    (["liverpool"], ["everton"], "Merseyside Derby"),
    (["man united", "manchester united"], ["man city", "manchester city"], "Manchester Derby"),
    (["liverpool"], ["man united", "manchester united"], "Nordwest-Derby"),
    (["chelsea"], ["arsenal", "tottenham"], "London Derby"),
    (["newcastle"], ["sunderland"], "Tyne-Wear Derby"),
    (["aston villa"], ["birmingham"], "Second City Derby"),
    # Deutschland
    (["dortmund"], ["schalke"], "Revierderby"),
    (["dortmund"], ["bayern"], "Der Klassiker"),
    (["hamburg"], ["werder", "bremen"], "Nordderby"),
    (["koln", "cologne"], ["gladbach"], "Rheinderby"),
    (["stuttgart"], ["karlsruhe"], "Baden-Württemberg-Derby"),
    (["union berlin"], ["hertha"], "Berlin-Derby"),
    # Spanien
    (["real madrid"], ["barcelona"], "El Clásico"),
    (["real madrid"], ["ath madrid", "atletico"], "Madrid-Derby"),
    (["barcelona"], ["espanol", "espanyol"], "Derbi barceloní"),
    (["sevilla"], ["betis"], "Sevilla-Derby"),
    (["ath bilbao", "athletic"], ["sociedad"], "Baskenderby"),
    (["valencia"], ["levante", "villarreal"], "Valencia-Derby"),
    # Italien
    (["inter"], ["milan"], "Derby della Madonnina"),
    (["roma"], ["lazio"], "Derby della Capitale"),
    (["juventus"], ["torino"], "Derby della Mole"),
    (["juventus"], ["inter"], "Derby d'Italia"),
    (["genoa"], ["sampdoria"], "Derby della Lanterna"),
    (["napoli"], ["roma"], "Derby del Sole"),
    # Frankreich
    (["paris"], ["marseille"], "Le Classique"),
    (["lyon"], ["st etienne", "saint etienne"], "Derby du Rhône"),
    (["nice"], ["monaco"], "Derby de la Côte d'Azur"),
    (["lens"], ["lille"], "Derby du Nord"),
    # Portugal
    (["benfica"], ["sp lisbon", "sporting"], "Derby de Lisboa"),
    (["porto"], ["benfica"], "O Clássico"),
    (["porto"], ["sp lisbon", "sporting"], "Clássico"),
    (["braga"], ["guimaraes"], "Derby do Minho"),
    # Türkei
    (["galatasaray"], ["fenerbahce"], "Kıtalararası Derbi"),
    (["besiktas"], ["galatasaray"], "İstanbul Derbisi"),
    (["fenerbahce"], ["besiktas"], "İstanbul Derbisi"),
    (["trabzonspor"], ["fenerbahce", "galatasaray", "besiktas"], "Karadeniz–İstanbul"),
    # Dänemark
    (["copenhagen", "kobenhavn"], ["brondby"], "New Firm"),
    (["aarhus", "agf"], ["aalborg", "aab"], "Jysk Derby"),
    (["midtjylland"], ["viborg", "silkeborg"], "Midtjysk Derby"),
]

# Modell-Parameter
MODEL = {
    "half_life_days": 365,     # Zeitgewichtung: Spiele vor 1 Jahr zählen halb
    "ridge": 0.6,              # Regularisierung Angriff/Abwehr
    "ridge_home": 6.0,         # Regularisierung team-spezifischer Heimvorteil
    "promoted_attack": -0.18,  # Prior für Aufsteiger
    "promoted_defence": 0.15,
    "form_matches": 6,
    "form_weight": 0.5,        # 0 = Form ignorieren, 1 = voll
    "elo_blend": 0.25,         # Anteil ClubElo an der Tordifferenz-Erwartung
    "elo_hfa": 65,             # Heimvorteil in Elo-Punkten
    "derby_home_adv_cut": 0.4, # Derby: Heimvorteil um 40 % reduziert
    "derby_draw_boost": 0.08,  # Derby: +8 % auf Remis-Ergebnisse
    "h2h_max_effect": 0.10,    # H2H kann Torerwartung um max. ±10 % verschieben
    "max_goals": 10,
}

# Value-Wetten
VALUE = {
    "min_edge": 0.04,   # Mindestvorteil (4 %)
    "min_prob": 0.20,   # sehr unwahrscheinliche Tipps ignorieren
}
