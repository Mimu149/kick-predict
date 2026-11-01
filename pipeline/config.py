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
    # --- Top-Ligen
    "PL":  {"name": "Premier League",   "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "csv": "E0",  "fd": "PL",  "api": 39,  "elo": "ENG", "str": 0.0},
    "BL":  {"name": "Bundesliga",       "country": "Deutschland", "flag": "🇩🇪", "csv": "D1",  "fd": "BL1", "api": 78,  "elo": "GER", "str": -0.08},
    "LL":  {"name": "LaLiga",           "country": "Spanien",     "flag": "🇪🇸", "csv": "SP1", "fd": "PD",  "api": 140, "elo": "ESP", "str": -0.06},
    "SA":  {"name": "Serie A",          "country": "Italien",     "flag": "🇮🇹", "csv": "I1",  "fd": "SA",  "api": 135, "elo": "ITA", "str": -0.07},
    "L1":  {"name": "Ligue 1",          "country": "Frankreich",  "flag": "🇫🇷", "csv": "F1",  "fd": "FL1", "api": 61,  "elo": "FRA", "str": -0.14},
    "PT":  {"name": "Liga Portugal",    "country": "Portugal",    "flag": "🇵🇹", "csv": "P1",  "fd": "PPL", "api": 94,  "elo": "POR", "str": -0.22},
    "NL":  {"name": "Eredivisie",       "country": "Niederlande", "flag": "🇳🇱", "csv": "N1",  "fd": "DED", "api": 88,  "elo": "NED", "str": -0.25},
    "BE":  {"name": "Pro League",       "country": "Belgien",     "flag": "🇧🇪", "csv": "B1",  "api": 144, "elo": "BEL", "str": -0.28},
    "TR":  {"name": "Süper Lig",        "country": "Türkei",      "flag": "🇹🇷", "csv": "T1",  "api": 203, "elo": "TUR", "str": -0.30},
    "GR":  {"name": "Super League",     "country": "Griechenland", "flag": "🇬🇷", "csv": "G1", "api": 197, "elo": "GRE", "str": -0.35},
    "SC":  {"name": "Premiership",      "country": "Schottland",  "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "csv": "SC0", "api": 179, "elo": "SCO", "str": -0.42},
    "AT":  {"name": "Bundesliga AT",    "country": "Österreich",  "flag": "🇦🇹", "new": "AUT", "en": "Austria",     "api": 218, "elo": "AUT", "str": -0.35},
    "CH":  {"name": "Super League CH",  "country": "Schweiz",     "flag": "🇨🇭", "new": "SWZ", "en": "Switzerland", "api": 207, "elo": "SUI", "str": -0.38},
    "DK":  {"name": "Superliga",        "country": "Dänemark",    "flag": "🇩🇰", "new": "DNK", "en": "Denmark",     "api": 119, "elo": "DEN", "str": -0.36},
    "PO":  {"name": "Ekstraklasa",      "country": "Polen",       "flag": "🇵🇱", "new": "POL", "en": "Poland",      "api": 106, "elo": "POL", "str": -0.45},
    "NO":  {"name": "Eliteserien",      "country": "Norwegen",    "flag": "🇳🇴", "new": "NOR", "en": "Norway",      "api": 103, "elo": "NOR", "str": -0.45, "calendar": True},
    "SE":  {"name": "Allsvenskan",      "country": "Schweden",    "flag": "🇸🇪", "new": "SWE", "en": "Sweden",      "api": 113, "elo": "SWE", "str": -0.50, "calendar": True},
    "RO":  {"name": "Liga I",           "country": "Rumänien",    "flag": "🇷🇴", "new": "ROU", "en": "Romania",     "api": 283, "elo": "ROM", "str": -0.55},
    "RU":  {"name": "Premier Liga",     "country": "Russland",    "flag": "🇷🇺", "new": "RUS", "en": "Russia",      "api": 235, "elo": "RUS", "str": -0.40},
    "FI":  {"name": "Veikkausliiga",    "country": "Finnland",    "flag": "🇫🇮", "new": "FIN", "en": "Finland",     "api": 244, "elo": "FIN", "str": -0.70, "calendar": True},
    "IE":  {"name": "Premier Division", "country": "Irland",      "flag": "🇮🇪", "new": "IRL", "en": "Ireland",     "api": 357, "elo": "IRL", "str": -0.75, "calendar": True},
    # --- 2. Ligen
    "EN2": {"name": "Championship",     "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "csv": "E1",  "fd": "ELC", "api": 40,  "elo": "ENG", "str": -0.45},
    "EN3": {"name": "League One",       "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "csv": "E2",  "api": 41,  "elo": "ENG", "str": -0.70},
    "EN4": {"name": "League Two",       "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "csv": "E3",  "api": 42,  "elo": "ENG", "str": -0.85},
    "DE2": {"name": "2. Bundesliga",    "country": "Deutschland", "flag": "🇩🇪", "csv": "D2",  "api": 79,  "elo": "GER", "str": -0.45},
    "ES2": {"name": "LaLiga 2",         "country": "Spanien",     "flag": "🇪🇸", "csv": "SP2", "api": 141, "elo": "ESP", "str": -0.50},
    "IT2": {"name": "Serie B",          "country": "Italien",     "flag": "🇮🇹", "csv": "I2",  "api": 136, "elo": "ITA", "str": -0.50},
    "FR2": {"name": "Ligue 2",          "country": "Frankreich",  "flag": "🇫🇷", "csv": "F2",  "api": 62,  "elo": "FRA", "str": -0.55},
    "SC2": {"name": "Championship SCO", "country": "Schottland",  "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "csv": "SC1", "api": 180, "elo": "SCO", "str": -0.80},
}

# Ligastärke (Log-Skala, relativ zur Premier League) – grobe Schätzung, nur für Europapokal-Spiele
# ohne ClubElo. Anpassbar über "str" oben.
LEAGUE_STRENGTH = {k: v["str"] for k, v in LEAGUES.items()}

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
EN_TO_COMP = {v["en"]: k for k, v in LEAGUES.items() if v.get("en")}

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
    # Weitere Ligen
    (["celtic"], ["rangers"], "Old Firm"),
    (["hearts"], ["hibernian"], "Edinburgh Derby"),
    (["dundee"], ["dundee united"], "Dundee Derby"),
    (["ajax"], ["feyenoord"], "De Klassieker"),
    (["ajax"], ["psv"], "Topper"),
    (["psv"], ["feyenoord"], "Topper"),
    (["anderlecht"], ["standard"], "Clasico (BE)"),
    (["club brugge", "brugge"], ["cercle"], "Brugse Derby"),
    (["club brugge", "brugge"], ["anderlecht"], "Topper (BE)"),
    (["olympiakos", "olympiacos"], ["panathinaikos"], "Derby der ewigen Feinde"),
    (["aek"], ["panathinaikos", "olympiakos", "olympiacos"], "Athen-Derby"),
    (["paok"], ["aris"], "Thessaloniki-Derby"),
    (["rapid"], ["austria vienna", "austria wien"], "Wiener Derby"),
    (["salzburg"], ["rapid", "sturm"], "Österreich-Topspiel"),
    (["basel"], ["zurich"], "Klassiker (CH)"),
    (["young boys"], ["basel"], "Klassiker (CH)"),
    (["legia"], ["lech"], "Polen-Klassiker"),
    (["wisla"], ["cracovia"], "Krakauer Derby"),
    (["rosenborg"], ["molde"], "Norwegen-Topspiel"),
    (["aik"], ["djurgarden", "hammarby"], "Stockholm-Derby"),
    (["djurgarden"], ["hammarby"], "Stockholm-Derby"),
    (["malmo"], ["helsingborg", "goteborg"], "Schweden-Derby"),
    (["fcsb", "steaua"], ["dinamo", "rapid"], "Bukarest-Derby"),
    (["spartak"], ["cska"], "Moskau-Derby"),
    (["hjk"], ["hifk"], "Helsinki-Derby"),
    (["shamrock"], ["bohemians"], "Dublin-Derby"),
    (["schalke"], ["dortmund", "bochum"], "Revierderby"),
    (["hertha"], ["union berlin"], "Berlin-Derby"),
    (["sheffield united"], ["sheffield weds"], "Steel City Derby"),
    (["sunderland"], ["middlesbrough"], "Tees-Wear Derby"),
    (["sampdoria"], ["genoa"], "Derby della Lanterna"),
    (["sporting gijon"], ["oviedo"], "Asturien-Derby"),
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
