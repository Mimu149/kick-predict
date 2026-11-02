/* Übersetzungen: Deutsch, English, Türkçe */
"use strict";

const LANGS = {
  de: { name: "Deutsch", flag: "🇩🇪", locale: "de-DE", comma: true },
  en: { name: "English", flag: "🇬🇧", locale: "en-GB", comma: false },
  tr: { name: "Türkçe", flag: "🇹🇷", locale: "tr-TR", comma: true },
};

const I18N = {
  de: {
    favorites: "Favoriten", favAdd: "Als Favorit markiert ⭐", favRm: "Favorit entfernt", noFavs: "Noch keine Favoriten. Tippe auf ☆ bei einem Spiel.",
    quickAdd: "Zum Kupon hinzufügen", customTip: "Eigener Tipp", customPh: "z. B. Kane trifft, Ecken Bayern > 6 …", addCustom: "＋ Eigenen Tipp hinzufügen",
    customNote: "Eigene Tipps wertest du selbst unter „Meine Wetten“ aus (✓ / ✗).", g_ou: "Ü/U 2,5",
    coupon: "Kupon", newSlip: "Neuer Schein", myBets: "Meine Wetten", added: "Zum Kupon hinzugefügt ✓", already: "Ist schon im Kupon",
    tapHint: "Tippe auf eine Wahrscheinlichkeit (＋), um den Tipp in deinen Kupon zu legen.",
    single: "Einzelwetten", combo: "Kombi", stake: "Einsatz", stakeEach: "Einsatz je Wette", yourOdds: "Deine Quote", totalOdds: "Gesamtquote",
    potWin: "Möglicher Gewinn", modelChance: "Chance laut Modell", ev: "Erwartungswert", saveBet: "✓ Als gewettet speichern", clear: "Leeren",
    emptySlip: "Dein Kupon ist leer.", emptySlipSub: "Öffne ein Spiel und tippe auf einen Tipp (z. B. Sieg Bayern) – oder tippe bei Picks auf ＋.",
    noBets: "Noch keine gespeicherten Wetten.", sameMatch: "Mehrere Tipps aus demselben Spiel – viele Buchmacher erlauben das in einer Kombi nicht.",
    won: "Gewonnen", lost: "Verloren", open: "Offen", void: "Erstattet", halfWon: "Halb gewonnen", halfLost: "Halb verloren",
    markWon: "✓ Gewonnen", markLost: "✗ Verloren", auto: "↺ Automatisch", del: "🗑 Löschen",
    staked: "Eingesetzt", returned: "Ausgezahlt", profit: "Gewinn/Verlust", betsN: "{n} Wetten", saved: "Wette gespeichert ✓",
    localNote: "Deine Wetten werden nur auf diesem Handy gespeichert.", oddsHint: "Quote wie bei deinem Wettanbieter eintragen",
    s_H: "Sieg {h}", s_D: "Unentschieden", s_A: "Sieg {a}", s_1X: "{h} oder Remis (1X)", s_X2: "{a} oder Remis (X2)", s_12: "Kein Remis (12)",
    s_O: "Über {l} Tore", s_U: "Unter {l} Tore", s_BTTSY: "Beide treffen: Ja", s_BTTSN: "Beide treffen: Nein",
    s_CO: "Über {l} Ecken", s_CU: "Unter {l} Ecken", s_AH: "Handicap {t} {l}",
    tab_picks: "Picks", dailyPicks: "Daily Picks", value: "Value", minProb: "≥ {x} %", onePer: "1 Pick pro Spiel", allPicks: "Alle Picks",
    g_1X2: "Sieg", g_DC: "Doppelte Chance", g_Goals: "Tore", g_BTTS: "Beide treffen", g_Corners: "Ecken",
    picksExplain: "Tipps mit mindestens {x} % Wahrscheinlichkeit laut Modell. Faire Quote = 1 ÷ Wahrscheinlichkeit; liegt die Buchmacher-Quote darüber, ist es zusätzlich ein Value-Tipp.",
    noPicks: "Keine Picks für diese Auswahl.", picksHit: "Bisherige Trefferquote der Picks: {r} ({a}/{b})",
    cornersWeak: "Hinweis: Ecken sind schwer vorherzusagen. Im Test lag das Ecken-Modell kaum besser als der Ligaschnitt – nutze es eher als Statistik.",
    pk_H: "Heimsieg", pk_D: "Unentschieden", pk_A: "Auswärtssieg", pk_1X: "1X – Heim oder Remis", pk_X2: "X2 – Gast oder Remis", pk_12: "12 – kein Remis",
    pk_O15: "Über 1,5 Tore", pk_U15: "Unter 1,5 Tore", pk_O25: "Über 2,5 Tore", pk_U25: "Unter 2,5 Tore", pk_O35: "Über 3,5 Tore", pk_U35: "Unter 3,5 Tore",
    pk_BTTSY: "Beide treffen: Ja", pk_BTTSN: "Beide treffen: Nein",
    pk_CO85: "Über 8,5 Ecken", pk_CU85: "Unter 8,5 Ecken", pk_CO95: "Über 9,5 Ecken", pk_CU95: "Unter 9,5 Ecken", pk_CO105: "Über 10,5 Ecken", pk_CU105: "Unter 10,5 Ecken",
    d_corners: "Ecken", expCorners: "Erwartete Ecken", cornersOU: "Ecken Über / Unter", moreCorners: "Mehr Ecken", equal: "Gleich",
    cornersFor: "Ecken für", cornersAgainst: "Ecken gegen", cornersTotal: "Ecken gesamt", o95share: "Über 9,5",
    cornersHomeT: "{t} zu Hause", cornersAwayT: "{t} auswärts", lastCorners: "{t} – Ecken letzte 5 Spiele",
    noCorners: "Für diese Liga gibt es keine Ecken-Daten.", games_s: "{n} Sp.", picksStat: "Daily Picks", pending: "offen",
    loading: "lädt …", noData: "Keine Daten", updated: "Stand: {x}", minAgo: "vor {n} Min.",
    tab_games: "Spiele", tab_results: "Ergebnisse", tab_value: "Value", tab_tables: "Tabellen", tab_info: "Info",
    today: "Heute", tomorrow: "Morgen", allDays: "Alle Tage", leagues: "Ligen", allOn: "Alle an", allOff: "Alle aus",
    hide: "ausblenden", games_n: "{n} Spiele", noGamesFilter: "Keine Spiele für diese Auswahl",
    emptyGames: "Noch keine Spiele geladen.", emptyGamesSub: "Der GitHub-Roboter füllt die Daten automatisch. Schau unter „Info“ nach dem Status.",
    lineupBadge: "Aufstellung", noPred: "Keine Prognose – zu wenig Daten", tip: "Tipp",
    // Ergebnisse
    noResults: "Noch keine ausgewerteten Spiele.", noResultsSub: "Sobald Spiele vorbei sind, erscheinen hier die Ergebnisse – grün = Tipp richtig, rot = falsch.",
    days7: "7 Tage", days30: "30 Tage", all: "Alle", tip1x2: "Tipp 1X2", correct: "{a}/{b} richtig", ou25: "Über/Unter 2,5",
    btts: "Beide treffen", valueTips: "Value-Tipps", odds2: "(Quote ≥ 2,0)", wonOf: "{a} von {b} gewonnen · Einsatz je 1 Einheit",
    byConf: "Trefferquote nach Sicherheit", resultPending: "Ergebnis folgt", forecast: "Prognose 1/X/2",
    // Value
    valueExplain: "Value = unsere Wahrscheinlichkeit × Quote > 1. Die Quote ist der Marktdurchschnitt; der „Vorteil“ zeigt, wie viel die Quote über der fairen Quote liegt.",
    oddsMin: "Quote ≥ {x}", asianHandicap: "Asian Handicap", noValue: "Keine Value-Tipps für diese Filter.", noValueSub: "Quoten gibt es meist 2–4 Tage vor dem Spiel.",
    prob: "Wahrsch.", fairOdds: "faire Quote", odds: "Quote", max: "max", noModelSafe: "Kein Modell ist sicher. Setze nur Geld, dessen Verlust du verkraften kannst.",
    // Tabellen
    noTables: "Noch keine Tabellen.", table: "Tabelle", homeAway: "Heim/Auswärts", power: "Modell-Stärke",
    goalsPerGame: "Tore/Sp.", conceded: "Gegent.", homePlus: "Heim+",
    powerNote: "Erwartete Tore gegen einen Durchschnittsgegner, laut Modell (letzte 5 Jahre, neuere Spiele zählen mehr). „Heim+“ = Heimstärke über dem Ligaschnitt.",
    homeP: "Heim Sp.", awayP: "Ausw. Sp.", pts: "Pkt", pl: "Sp", gd: "TD", form: "Form", avgGoals: "Ø Tore", homeWins: "Heimsiege", draws: "Remis",
    awayWins: "Auswärtssiege", over25: "Über 2,5", leagueAvg: "Ligaschnitt der letzten 2 Saisons",
    // Info
    language: "Sprache", dataState: "Datenstand", predsComputed: "Prognosen berechnet", lineups: "Aufstellungen", games: "Spiele",
    sources: "Quellen", calls: "{a} Abrufe, Rest {b}", noKey: "kein Schlüssel", clubs: "{n} Vereine", unreachable: "nicht erreichbar",
    history: "Historie", apiSays: "API-Football meldet", unmatched: "Nicht erkannte Teamnamen",
    unmatchedSub: "Diese Namen konnten keinem Team der Historie zugeordnet werden. Ergänzen in", log: "Protokoll",
    howTitle: "So rechnet die App",
    how1: "<b>Grundmodell:</b> Aus allen Ligaspielen der letzten 5 Saisons wird für jedes Team eine Angriffs- und Abwehrstärke geschätzt (Poisson/Dixon-Coles). Neuere Spiele zählen mehr (Halbwertszeit 1 Jahr). Jedes Team hat einen eigenen Heimvorteil.",
    how2: "<b>Form:</b> Die letzten 6 Spiele werden mit der Erwartung verglichen. Wer mehr trifft als erwartet, bekommt einen Zuschlag (max. ±15 %).",
    how3: "<b>H2H:</b> Direkte Duelle der letzten 5 Jahre verschieben die Torerwartung leicht (max. ±10 %).",
    how4: "<b>Derby:</b> Heimvorteil wird reduziert, Remis werden wahrscheinlicher.",
    how5: "<b>ClubElo:</b> 25 % der Tordifferenz-Erwartung kommen aus den Elo-Werten. Für Europapokalspiele ist Elo die Hauptquelle, weil Teams aus verschiedenen Ligen aufeinandertreffen.",
    how6: "<b>Aufstellungen</b> erscheinen ca. 60 Minuten vor Anpfiff. Sie fließen nicht automatisch in die Prognose ein. Prüfe also selbst, ob wichtige Spieler fehlen.",
    disclaimer: "Prognosen sind Wahrscheinlichkeiten, keine Garantien. Wetten kann süchtig machen – Hilfe:",
    // Detail
    place: "{n}. Platz", d_pred: "Prognose", d_form: "Form", d_h2h: "H2H", d_stats: "5 Jahre", d_lineup: "Aufstellung",
    tooLittle: "Für dieses Spiel gibt es zu wenig Daten.", confidence: "Sicherheit {x}",
    x12dc: "1X2 & Doppelte Chance", market: "Markt", edge: "Vorteil", fairQ: "Faire Q.", home1: "1 Heim", drawX: "X Remis", away2: "2 Gast",
    overUnder: "Über / Unter", line: "Linie", over: "Über", under: "Unter", marketOU: "Markt 2,5: Über {a} · Unter {b}",
    yes: "Ja", no: "Nein", fairShort: "faire Q.", ahHome: "Asian Handicap (Heim)", homeFair: "Heim faire Q.", awayFair: "Gast faire Q.",
    ahMarket: "Markt: Heim {l} @ {a} · Gast @ {b}", likelyScores: "Wahrscheinlichste Ergebnisse", numGoals: "Anzahl Tore", goalsN: "{k} Tore",
    model: "Modell", sourcesL: "Quellen",
    lastN: "letzte {n} Spiele", ppg: "Punkte/Sp.", goals: "Tore", cleanSheets: "Zu Null", wins: "Siege", wdl: "{w}S {d}U {l}N",
    lastHome: "{t} – letzte Heimspiele", lastAway: "{t} – letzte Auswärtsspiele", last5: "{t} – letzte 5 Spiele", noForm: "Keine Formdaten",
    noH2H: "Keine direkten Duelle in den letzten 5 Jahren (in dieser Liga).", winsOf: "{t} Siege", draw: "Remis", gamesL: "Spiele",
    lastMeetings: "Letzte Duelle", recLine: "{gf}:{ga} Tore · {w}% Siege · Ü2,5 {o}% · BTTS {b}%", noStats: "Keine Statistik",
    thisSeason: "Diese Saison", last5y: "Letzte 5 Jahre", atHome: "{t} zu Hause", awayL: "{t} auswärts", seasons: "{t} – Saisons",
    season: "Saison", wdlH: "S-U-N", homeW: "Heim S", awayW: "Ausw. S", modelVals: "Modell-Werte", attack: "Angriff", defence: "Abwehr", concededL: "Gegentore",
    coach: "Trainer", bench: "Bank", lineupsSoon: "Aufstellungen kommen ca. 60 Minuten vor Anpfiff.", robotChecks: "Der Roboter prüft an Spieltagen alle 30 Minuten.",
    absences: "Ausfälle",
    // Datenbegriffe
    H: "Heimsieg", D: "Unentschieden", A: "Auswärtssieg", O25: "Über 2,5 Tore", U25: "Unter 2,5 Tore", O25s: "Über 2,5", U25s: "Unter 2,5",
    BTTSY: "Beide treffen: Ja", BTTSN: "Beide treffen: Nein", BTTSYs: "BTTS Ja", BTTSNs: "BTTS Nein", AHH: "AH Heim {l}", AHA: "AH Gast {l}",
    conf_hoch: "hoch", conf_mittel: "mittel", conf_niedrig: "niedrig", formS: "S", formU: "U", formN: "N",
    n_h2h_more: "H2H: torreicher als erwartet ({x} Tore/Spiel)", n_h2h_less: "H2H: torärmer als erwartet ({x} Tore/Spiel)",
    n_derby: "Derby: Heimvorteil reduziert, Remis wahrscheinlicher", n_nodata: "Keine ausreichenden Daten für eine Prognose",
    n_nodata_cup: "Keine ausreichenden Daten für eine Prognose (Team außerhalb der abgedeckten Ligen)",
    n_cup: "Europapokal: Schätzung über Liga-Modelle (ClubElo nicht verfügbar)",
  },
  en: {
    favorites: "Favourites", favAdd: "Marked as favourite ⭐", favRm: "Favourite removed", noFavs: "No favourites yet. Tap ☆ on a match.",
    quickAdd: "Add to bet slip", customTip: "Custom tip", customPh: "e.g. Kane scores, Bayern corners > 6 …", addCustom: "＋ Add custom tip",
    customNote: "You settle custom tips yourself under “My bets” (✓ / ✗).", g_ou: "O/U 2.5",
    coupon: "Bet slip", newSlip: "New slip", myBets: "My bets", added: "Added to bet slip ✓", already: "Already on the bet slip",
    tapHint: "Tap a probability (＋) to put the tip on your bet slip.",
    single: "Singles", combo: "Accumulator", stake: "Stake", stakeEach: "Stake per bet", yourOdds: "Your odds", totalOdds: "Total odds",
    potWin: "Potential return", modelChance: "Chance per model", ev: "Expected value", saveBet: "✓ Save as placed", clear: "Clear",
    emptySlip: "Your bet slip is empty.", emptySlipSub: "Open a match and tap a tip (e.g. Bayern to win) – or tap ＋ in Picks.",
    noBets: "No saved bets yet.", sameMatch: "Several tips from the same match – many bookmakers don't allow that in an accumulator.",
    won: "Won", lost: "Lost", open: "Open", void: "Void", halfWon: "Half won", halfLost: "Half lost",
    markWon: "✓ Won", markLost: "✗ Lost", auto: "↺ Automatic", del: "🗑 Delete",
    staked: "Staked", returned: "Returned", profit: "Profit/loss", betsN: "{n} bets", saved: "Bet saved ✓",
    localNote: "Your bets are only stored on this phone.", oddsHint: "Enter the odds from your bookmaker",
    s_H: "{h} to win", s_D: "Draw", s_A: "{a} to win", s_1X: "{h} or draw (1X)", s_X2: "{a} or draw (X2)", s_12: "No draw (12)",
    s_O: "Over {l} goals", s_U: "Under {l} goals", s_BTTSY: "Both teams score: Yes", s_BTTSN: "Both teams score: No",
    s_CO: "Over {l} corners", s_CU: "Under {l} corners", s_AH: "Handicap {t} {l}",
    tab_picks: "Picks", dailyPicks: "Daily Picks", value: "Value", minProb: "≥ {x}%", onePer: "1 pick per match", allPicks: "All picks",
    g_1X2: "Win", g_DC: "Double chance", g_Goals: "Goals", g_BTTS: "BTTS", g_Corners: "Corners",
    picksExplain: "Tips with at least {x}% probability according to the model. Fair odds = 1 ÷ probability; if the bookmaker's odds are higher, it is also a value tip.",
    noPicks: "No picks for this selection.", picksHit: "Pick hit rate so far: {r} ({a}/{b})",
    cornersWeak: "Note: corners are hard to predict. In testing, the corner model was barely better than the league average – treat it mainly as statistics.",
    pk_H: "Home win", pk_D: "Draw", pk_A: "Away win", pk_1X: "1X – home or draw", pk_X2: "X2 – away or draw", pk_12: "12 – no draw",
    pk_O15: "Over 1.5 goals", pk_U15: "Under 1.5 goals", pk_O25: "Over 2.5 goals", pk_U25: "Under 2.5 goals", pk_O35: "Over 3.5 goals", pk_U35: "Under 3.5 goals",
    pk_BTTSY: "Both teams score: Yes", pk_BTTSN: "Both teams score: No",
    pk_CO85: "Over 8.5 corners", pk_CU85: "Under 8.5 corners", pk_CO95: "Over 9.5 corners", pk_CU95: "Under 9.5 corners", pk_CO105: "Over 10.5 corners", pk_CU105: "Under 10.5 corners",
    d_corners: "Corners", expCorners: "Expected corners", cornersOU: "Corners Over / Under", moreCorners: "More corners", equal: "Equal",
    cornersFor: "Corners for", cornersAgainst: "Corners against", cornersTotal: "Total corners", o95share: "Over 9.5",
    cornersHomeT: "{t} at home", cornersAwayT: "{t} away", lastCorners: "{t} – corners last 5 matches",
    noCorners: "No corner data for this league.", games_s: "{n} g", picksStat: "Daily Picks", pending: "open",
    loading: "loading …", noData: "No data", updated: "Updated: {x}", minAgo: "{n} min ago",
    tab_games: "Matches", tab_results: "Results", tab_value: "Value", tab_tables: "Tables", tab_info: "Info",
    today: "Today", tomorrow: "Tomorrow", allDays: "All days", leagues: "Leagues", allOn: "All on", allOff: "All off",
    hide: "hide", games_n: "{n} matches", noGamesFilter: "No matches for this selection",
    emptyGames: "No matches loaded yet.", emptyGamesSub: "The GitHub robot fills in the data automatically. Check “Info” for the status.",
    lineupBadge: "Line-up", noPred: "No prediction – not enough data", tip: "Tip",
    noResults: "No evaluated matches yet.", noResultsSub: "Once matches are over, results appear here – green = tip correct, red = wrong.",
    days7: "7 days", days30: "30 days", all: "All", tip1x2: "Tip 1X2", correct: "{a}/{b} correct", ou25: "Over/Under 2.5",
    btts: "Both teams score", valueTips: "Value tips", odds2: "(odds ≥ 2.0)", wonOf: "{a} of {b} won · stake 1 unit each",
    byConf: "Hit rate by confidence", resultPending: "Result pending", forecast: "Forecast 1/X/2",
    valueExplain: "Value = our probability × odds > 1. The odds are the market average; the “edge” shows how far the odds are above the fair odds.",
    oddsMin: "Odds ≥ {x}", asianHandicap: "Asian Handicap", noValue: "No value tips for these filters.", noValueSub: "Odds are usually available 2–4 days before the match.",
    prob: "Prob.", fairOdds: "fair odds", odds: "Odds", max: "max", noModelSafe: "No model is certain. Only bet money you can afford to lose.",
    noTables: "No tables yet.", table: "Table", homeAway: "Home/Away", power: "Model strength",
    goalsPerGame: "Goals/g", conceded: "Conceded", homePlus: "Home+",
    powerNote: "Expected goals against an average opponent, according to the model (last 5 years, recent matches weigh more). “Home+” = home strength above the league average.",
    homeP: "Home P", awayP: "Away P", pts: "Pts", pl: "P", gd: "GD", form: "Form", avgGoals: "Avg goals", homeWins: "Home wins", draws: "Draws",
    awayWins: "Away wins", over25: "Over 2.5", leagueAvg: "League average of the last 2 seasons",
    language: "Language", dataState: "Data status", predsComputed: "Predictions computed", lineups: "Line-ups", games: "Matches",
    sources: "Sources", calls: "{a} calls, {b} left", noKey: "no key", clubs: "{n} clubs", unreachable: "unreachable",
    history: "History", apiSays: "API-Football reports", unmatched: "Unrecognised team names",
    unmatchedSub: "These names could not be matched to a team in the history. Add them in", log: "Log",
    howTitle: "How the app calculates",
    how1: "<b>Base model:</b> From all league matches of the last 5 seasons, an attack and defence strength is estimated for every team (Poisson/Dixon-Coles). Recent matches weigh more (half-life 1 year). Every team has its own home advantage.",
    how2: "<b>Form:</b> The last 6 matches are compared with expectations. Teams scoring more than expected get a bonus (max ±15%).",
    how3: "<b>H2H:</b> Head-to-head matches of the last 5 years shift the goal expectation slightly (max ±10%).",
    how4: "<b>Derby:</b> Home advantage is reduced, draws become more likely.",
    how5: "<b>ClubElo:</b> 25% of the expected goal difference comes from Elo ratings. For European cup matches Elo is the main source, because teams from different leagues meet.",
    how6: "<b>Line-ups</b> appear about 60 minutes before kick-off. They are not automatically included in the prediction, so check yourself whether key players are missing.",
    disclaimer: "Predictions are probabilities, not guarantees. Betting can be addictive – help:",
    place: "Pos. {n}", d_pred: "Prediction", d_form: "Form", d_h2h: "H2H", d_stats: "5 years", d_lineup: "Line-up",
    tooLittle: "Not enough data for this match.", confidence: "Confidence {x}",
    x12dc: "1X2 & Double chance", market: "Market", edge: "Edge", fairQ: "Fair", home1: "1 Home", drawX: "X Draw", away2: "2 Away",
    overUnder: "Over / Under", line: "Line", over: "Over", under: "Under", marketOU: "Market 2.5: Over {a} · Under {b}",
    yes: "Yes", no: "No", fairShort: "fair", ahHome: "Asian Handicap (home)", homeFair: "Home fair", awayFair: "Away fair",
    ahMarket: "Market: Home {l} @ {a} · Away @ {b}", likelyScores: "Most likely scores", numGoals: "Number of goals", goalsN: "{k} goals",
    model: "Model", sourcesL: "Sources",
    lastN: "last {n} matches", ppg: "Points/g", goals: "Goals", cleanSheets: "Clean sheets", wins: "Wins", wdl: "{w}W {d}D {l}L",
    lastHome: "{t} – last home matches", lastAway: "{t} – last away matches", last5: "{t} – last 5 matches", noForm: "No form data",
    noH2H: "No head-to-head matches in the last 5 years (in this league).", winsOf: "{t} wins", draw: "Draw", gamesL: "Matches",
    lastMeetings: "Last meetings", recLine: "{gf}:{ga} goals · {w}% wins · O2.5 {o}% · BTTS {b}%", noStats: "No statistics",
    thisSeason: "This season", last5y: "Last 5 years", atHome: "{t} at home", awayL: "{t} away", seasons: "{t} – seasons",
    season: "Season", wdlH: "W-D-L", homeW: "Home W", awayW: "Away W", modelVals: "Model values", attack: "Attack", defence: "Defence", concededL: "goals conceded",
    coach: "Coach", bench: "Bench", lineupsSoon: "Line-ups arrive about 60 minutes before kick-off.", robotChecks: "On match days the robot checks every 30 minutes.",
    absences: "Absences",
    H: "Home win", D: "Draw", A: "Away win", O25: "Over 2.5 goals", U25: "Under 2.5 goals", O25s: "Over 2.5", U25s: "Under 2.5",
    BTTSY: "Both teams score: Yes", BTTSN: "Both teams score: No", BTTSYs: "BTTS Yes", BTTSNs: "BTTS No", AHH: "AH Home {l}", AHA: "AH Away {l}",
    conf_hoch: "high", conf_mittel: "medium", conf_niedrig: "low", formS: "W", formU: "D", formN: "L",
    n_h2h_more: "H2H: more goals than expected ({x} goals/match)", n_h2h_less: "H2H: fewer goals than expected ({x} goals/match)",
    n_derby: "Derby: home advantage reduced, draw more likely", n_nodata: "Not enough data for a prediction",
    n_nodata_cup: "Not enough data for a prediction (team outside the covered leagues)",
    n_cup: "European cup: estimate via league models (ClubElo unavailable)",
  },
  tr: {
    favorites: "Favoriler", favAdd: "Favorilere eklendi ⭐", favRm: "Favorilerden çıkarıldı", noFavs: "Henüz favori yok. Bir maçta ☆'a dokun.",
    quickAdd: "Kupona ekle", customTip: "Kendi tahminin", customPh: "ör. Kane gol atar, Bayern korner > 6 …", addCustom: "＋ Kendi tahminini ekle",
    customNote: "Kendi tahminlerini „Bahislerim“ altında kendin değerlendirirsin (✓ / ✗).", g_ou: "2,5 A/Ü",
    coupon: "Kupon", newSlip: "Yeni kupon", myBets: "Bahislerim", added: "Kupona eklendi ✓", already: "Zaten kuponda",
    tapHint: "Tahmini kupona eklemek için bir olasılığa (＋) dokun.",
    single: "Tekli", combo: "Kombine", stake: "Bahis", stakeEach: "Bahis başına", yourOdds: "Senin oranın", totalOdds: "Toplam oran",
    potWin: "Olası kazanç", modelChance: "Modele göre şans", ev: "Beklenen değer", saveBet: "✓ Oynandı olarak kaydet", clear: "Temizle",
    emptySlip: "Kuponun boş.", emptySlipSub: "Bir maçı aç ve bir tahmine dokun (ör. Bayern kazanır) – ya da Tahminler'de ＋'ya dokun.",
    noBets: "Henüz kayıtlı bahis yok.", sameMatch: "Aynı maçtan birden fazla tahmin – çoğu bahis şirketi kombinede buna izin vermez.",
    won: "Kazandı", lost: "Kaybetti", open: "Açık", void: "İade", halfWon: "Yarı kazandı", halfLost: "Yarı kaybetti",
    markWon: "✓ Kazandı", markLost: "✗ Kaybetti", auto: "↺ Otomatik", del: "🗑 Sil",
    staked: "Yatırılan", returned: "Ödenen", profit: "Kâr/zarar", betsN: "{n} bahis", saved: "Bahis kaydedildi ✓",
    localNote: "Bahislerin sadece bu telefonda saklanır.", oddsHint: "Bahis şirketindeki oranı gir",
    s_H: "{h} kazanır", s_D: "Beraberlik", s_A: "{a} kazanır", s_1X: "{h} veya beraberlik (1X)", s_X2: "{a} veya beraberlik (X2)", s_12: "Beraberlik yok (12)",
    s_O: "{l} Üst", s_U: "{l} Alt", s_BTTSY: "KG Var", s_BTTSN: "KG Yok",
    s_CO: "Korner {l} Üst", s_CU: "Korner {l} Alt", s_AH: "Handikap {t} {l}",
    tab_picks: "Tahminler", dailyPicks: "Günün Tahminleri", value: "Value", minProb: "≥ %{x}", onePer: "Maç başı 1 tahmin", allPicks: "Tüm tahminler",
    g_1X2: "Maç sonucu", g_DC: "Çifte şans", g_Goals: "Gol", g_BTTS: "KG", g_Corners: "Korner",
    picksExplain: "Modele göre en az %{x} olasılıklı tahminler. Adil oran = 1 ÷ olasılık; bahis şirketinin oranı daha yüksekse aynı zamanda value tahmindir.",
    noPicks: "Bu seçim için tahmin yok.", picksHit: "Şimdiye kadarki isabet oranı: {r} ({a}/{b})",
    cornersWeak: "Not: Kornerleri tahmin etmek zordur. Testte korner modeli lig ortalamasından pek iyi değildi – daha çok istatistik olarak kullan.",
    pk_H: "Ev sahibi kazanır (1)", pk_D: "Beraberlik (X)", pk_A: "Deplasman kazanır (2)", pk_1X: "ÇŞ 1X – ev veya beraberlik", pk_X2: "ÇŞ X2 – deplasman veya beraberlik", pk_12: "ÇŞ 12 – beraberlik yok",
    pk_O15: "1,5 Üst", pk_U15: "1,5 Alt", pk_O25: "2,5 Üst", pk_U25: "2,5 Alt", pk_O35: "3,5 Üst", pk_U35: "3,5 Alt",
    pk_BTTSY: "KG Var", pk_BTTSN: "KG Yok",
    pk_CO85: "Korner 8,5 Üst", pk_CU85: "Korner 8,5 Alt", pk_CO95: "Korner 9,5 Üst", pk_CU95: "Korner 9,5 Alt", pk_CO105: "Korner 10,5 Üst", pk_CU105: "Korner 10,5 Alt",
    d_corners: "Korner", expCorners: "Beklenen korner", cornersOU: "Korner Alt / Üst", moreCorners: "Daha çok korner", equal: "Eşit",
    cornersFor: "Kazanılan korner", cornersAgainst: "Verilen korner", cornersTotal: "Toplam korner", o95share: "9,5 Üst",
    cornersHomeT: "{t} iç sahada", cornersAwayT: "{t} deplasmanda", lastCorners: "{t} – son 5 maçta kornerler",
    noCorners: "Bu lig için korner verisi yok.", games_s: "{n} maç", picksStat: "Günün Tahminleri", pending: "açık",
    loading: "yükleniyor …", noData: "Veri yok", updated: "Güncelleme: {x}", minAgo: "{n} dk önce",
    tab_games: "Maçlar", tab_results: "Sonuçlar", tab_value: "Value", tab_tables: "Puan Durumu", tab_info: "Bilgi",
    today: "Bugün", tomorrow: "Yarın", allDays: "Tüm günler", leagues: "Ligler", allOn: "Hepsini aç", allOff: "Hepsini kapat",
    hide: "gizle", games_n: "{n} maç", noGamesFilter: "Bu seçim için maç yok",
    emptyGames: "Henüz maç yüklenmedi.", emptyGamesSub: "GitHub robotu verileri otomatik doldurur. Durum için „Bilgi“ sekmesine bak.",
    lineupBadge: "Kadro", noPred: "Tahmin yok – yetersiz veri", tip: "Tahmin",
    noResults: "Henüz değerlendirilmiş maç yok.", noResultsSub: "Maçlar bitince sonuçlar burada görünür – yeşil = tahmin doğru, kırmızı = yanlış.",
    days7: "7 gün", days30: "30 gün", all: "Tümü", tip1x2: "Tahmin 1X2", correct: "{a}/{b} doğru", ou25: "2,5 Alt/Üst",
    btts: "Karşılıklı gol", valueTips: "Value tahminleri", odds2: "(oran ≥ 2,0)", wonOf: "{b} tahminden {a} kazandı · her biri 1 birim",
    byConf: "Güvene göre isabet oranı", resultPending: "Sonuç bekleniyor", forecast: "Tahmin 1/X/2",
    valueExplain: "Value = bizim olasılığımız × oran > 1. Oran piyasa ortalamasıdır; „avantaj“, oranın adil orandan ne kadar yüksek olduğunu gösterir.",
    oddsMin: "Oran ≥ {x}", asianHandicap: "Asya Handikapı", noValue: "Bu filtreler için value tahmini yok.", noValueSub: "Oranlar genelde maçtan 2–4 gün önce çıkar.",
    prob: "Olasılık", fairOdds: "adil oran", odds: "Oran", max: "maks", noModelSafe: "Hiçbir model kesin değildir. Sadece kaybetmeyi göze alabileceğin parayla oyna.",
    noTables: "Henüz puan durumu yok.", table: "Puan durumu", homeAway: "İç saha/Deplasman", power: "Model gücü",
    goalsPerGame: "Gol/maç", conceded: "Yenilen", homePlus: "İç saha+",
    powerNote: "Modele göre ortalama bir rakibe karşı beklenen gol (son 5 yıl, yeni maçlar daha ağır basar). „İç saha+“ = lig ortalamasının üzerindeki iç saha gücü.",
    homeP: "İç O", awayP: "Dep O", pts: "P", pl: "O", gd: "AV", form: "Form", avgGoals: "Ort. gol", homeWins: "Ev galibiyeti", draws: "Beraberlik",
    awayWins: "Deplasman galibiyeti", over25: "2,5 Üst", leagueAvg: "Son 2 sezonun lig ortalaması",
    language: "Dil", dataState: "Veri durumu", predsComputed: "Tahminler hesaplandı", lineups: "Kadrolar", games: "Maçlar",
    sources: "Kaynaklar", calls: "{a} istek, {b} kaldı", noKey: "anahtar yok", clubs: "{n} kulüp", unreachable: "ulaşılamıyor",
    history: "Geçmiş", apiSays: "API-Football bildiriyor", unmatched: "Tanınmayan takım adları",
    unmatchedSub: "Bu adlar geçmişteki hiçbir takımla eşleştirilemedi. Şuraya ekle:", log: "Kayıt",
    howTitle: "Uygulama nasıl hesaplıyor",
    how1: "<b>Temel model:</b> Son 5 sezonun tüm lig maçlarından her takım için hücum ve savunma gücü tahmin edilir (Poisson/Dixon-Coles). Yeni maçlar daha ağır basar (yarı ömür 1 yıl). Her takımın kendi iç saha avantajı vardır.",
    how2: "<b>Form:</b> Son 6 maç beklentiyle karşılaştırılır. Beklenenden fazla gol atan takım bonus alır (en fazla ±%15).",
    how3: "<b>H2H:</b> Son 5 yılın aralarındaki maçları gol beklentisini biraz değiştirir (en fazla ±%10).",
    how4: "<b>Derbi:</b> İç saha avantajı azalır, beraberlik olasılığı artar.",
    how5: "<b>ClubElo:</b> Beklenen gol farkının %25'i Elo puanlarından gelir. Avrupa kupası maçlarında farklı liglerden takımlar karşılaştığı için Elo ana kaynaktır.",
    how6: "<b>Kadrolar</b> maçtan yaklaşık 60 dakika önce gelir. Tahmine otomatik dahil edilmez; önemli oyuncuların eksik olup olmadığını kendin kontrol et.",
    disclaimer: "Tahminler olasılıktır, garanti değildir. Bahis bağımlılık yapabilir – yardım:",
    place: "{n}. sıra", d_pred: "Tahmin", d_form: "Form", d_h2h: "H2H", d_stats: "5 yıl", d_lineup: "Kadro",
    tooLittle: "Bu maç için yeterli veri yok.", confidence: "Güven {x}",
    x12dc: "1X2 & Çifte şans", market: "Piyasa", edge: "Avantaj", fairQ: "Adil", home1: "1 Ev", drawX: "X Beraberlik", away2: "2 Deplasman",
    overUnder: "Alt / Üst", line: "Çizgi", over: "Üst", under: "Alt", marketOU: "Piyasa 2,5: Üst {a} · Alt {b}",
    yes: "Var", no: "Yok", fairShort: "adil", ahHome: "Asya Handikapı (ev)", homeFair: "Ev adil", awayFair: "Dep adil",
    ahMarket: "Piyasa: Ev {l} @ {a} · Dep @ {b}", likelyScores: "En olası skorlar", numGoals: "Gol sayısı", goalsN: "{k} gol",
    model: "Model", sourcesL: "Kaynaklar",
    lastN: "son {n} maç", ppg: "Puan/maç", goals: "Goller", cleanSheets: "Gol yemeden", wins: "Galibiyet", wdl: "{w}G {d}B {l}M",
    lastHome: "{t} – son iç saha maçları", lastAway: "{t} – son deplasman maçları", last5: "{t} – son 5 maç", noForm: "Form verisi yok",
    noH2H: "Son 5 yılda (bu ligde) aralarında maç yok.", winsOf: "{t} galibiyet", draw: "Beraberlik", gamesL: "Maç",
    lastMeetings: "Son karşılaşmalar", recLine: "{gf}:{ga} gol · %{w} galibiyet · Ü2,5 %{o} · KG %{b}", noStats: "İstatistik yok",
    thisSeason: "Bu sezon", last5y: "Son 5 yıl", atHome: "{t} iç sahada", awayL: "{t} deplasmanda", seasons: "{t} – sezonlar",
    season: "Sezon", wdlH: "G-B-M", homeW: "İç G", awayW: "Dep G", modelVals: "Model değerleri", attack: "Hücum", defence: "Savunma", concededL: "yenilen gol",
    coach: "Teknik direktör", bench: "Yedekler", lineupsSoon: "Kadrolar maçtan yaklaşık 60 dakika önce gelir.", robotChecks: "Robot maç günlerinde 30 dakikada bir kontrol eder.",
    absences: "Eksikler",
    H: "Ev sahibi kazanır (1)", D: "Beraberlik (X)", A: "Deplasman kazanır (2)", O25: "2,5 Üst", U25: "2,5 Alt", O25s: "2,5 Üst", U25s: "2,5 Alt",
    BTTSY: "KG Var", BTTSN: "KG Yok", BTTSYs: "KG Var", BTTSNs: "KG Yok", AHH: "AH Ev {l}", AHA: "AH Dep {l}",
    conf_hoch: "yüksek", conf_mittel: "orta", conf_niedrig: "düşük", formS: "G", formU: "B", formN: "M",
    n_h2h_more: "H2H: beklenenden çok gollü (maç başı {x} gol)", n_h2h_less: "H2H: beklenenden az gollü (maç başı {x} gol)",
    n_derby: "Derbi: iç saha avantajı azaldı, beraberlik daha olası", n_nodata: "Tahmin için yeterli veri yok",
    n_nodata_cup: "Tahmin için yeterli veri yok (takım kapsanan liglerin dışında)",
    n_cup: "Avrupa kupası: lig modelleriyle tahmin (ClubElo kullanılamıyor)",
  },
};

const COUNTRIES = {
  en: { England: "England", Deutschland: "Germany", Spanien: "Spain", Italien: "Italy", Frankreich: "France", Portugal: "Portugal",
    Niederlande: "Netherlands", Belgien: "Belgium", Türkei: "Turkey", Griechenland: "Greece", Schottland: "Scotland", Österreich: "Austria",
    Schweiz: "Switzerland", Dänemark: "Denmark", Polen: "Poland", Norwegen: "Norway", Schweden: "Sweden", Rumänien: "Romania",
    Russland: "Russia", Finnland: "Finland", Irland: "Ireland", Europa: "Europe" },
  tr: { England: "İngiltere", Deutschland: "Almanya", Spanien: "İspanya", Italien: "İtalya", Frankreich: "Fransa", Portugal: "Portekiz",
    Niederlande: "Hollanda", Belgien: "Belçika", Türkei: "Türkiye", Griechenland: "Yunanistan", Schottland: "İskoçya", Österreich: "Avusturya",
    Schweiz: "İsviçre", Dänemark: "Danimarka", Polen: "Polonya", Norwegen: "Norveç", Schweden: "İsveç", Rumänien: "Romanya",
    Russland: "Rusya", Finnland: "Finlandiya", Irland: "İrlanda", Europa: "Avrupa" },
};

let LANG = (() => {
  try { const s = JSON.parse(localStorage.getItem("kp_lang")); if (LANGS[s]) return s; } catch { /* egal */ }
  const n = (navigator.language || "de").slice(0, 2).toLowerCase();
  return LANGS[n] ? n : "en";
})();

function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.de[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split("{" + k + "}").join(v);
  return s;
}

/* Zahlen mit Komma (DE/TR) oder Punkt (EN) */
function num(x, d = 2) {
  if (x == null || isNaN(x)) return "–";
  const s = Number(x).toFixed(d);
  return LANGS[LANG].comma ? s.replace(".", ",") : s;
}

function country(c) { return (COUNTRIES[LANG] && COUNTRIES[LANG][c]) || c; }

/* Begriffe aus den Daten (vom Roboter auf Deutsch erzeugt) übersetzen */
function trPick(pick) { return t(pick); }
function trGoals(s) { return s && s.startsWith("Über") ? t("O25") : t("U25"); }
function trBtts(s, short) { const y = s && s.endsWith("Ja"); return t((y ? "BTTSY" : "BTTSN") + (short ? "s" : "")); }
function trConf(c) { return t("conf_" + c); }
function trForm(r) { return t("form" + r); }

function trLabel(label) {
  if (!label) return "";
  const map = { "Heimsieg": "H", "Unentschieden": "D", "Auswärtssieg": "A", "Über 2,5": "O25s", "Unter 2,5": "U25s",
    "Beide treffen: Ja": "BTTSY", "Beide treffen: Nein": "BTTSN" };
  if (map[label]) return t(map[label]);
  const m = label.match(/^AH (Heim|Gast) (.+)$/);
  if (m) {
    const l = LANGS[LANG].comma ? m[2] : m[2].replace(",", ".");
    return t(m[1] === "Heim" ? "AHH" : "AHA", { l });
  }
  return label;
}

function trNote(n) {
  let m = n.match(/^H2H: (torreicher|torärmer) als erwartet \(([\d.]+) Tore\/Spiel\)$/);
  if (m) return t(m[1] === "torreicher" ? "n_h2h_more" : "n_h2h_less", { x: num(m[2], 2) });
  if (n.startsWith("Derby:")) return t("n_derby");
  if (n.startsWith("Europapokal:")) return t("n_cup");
  if (n.startsWith("Keine ausreichenden Daten")) return t(n.includes("außerhalb") ? "n_nodata_cup" : "n_nodata");
  return n;
}
