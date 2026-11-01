# ⚽ Kick Predict – Fußball-Prognosen fürs Handy

Kick Predict ist eine Web-App, die du auf Android wie eine normale App installieren kannst. Sie zeigt für die kommenden 7 Tage:

- **Prognosen**: 1X2, Doppelte Chance, Über/Unter 0,5–4,5, Beide treffen, Asian Handicap, wahrscheinlichste Ergebnisse, xG
- **Form**: letzte 5/10 Spiele sowie die Heimform des Heimteams und die Auswärtsform des Gastteams
- **5 Jahre Historie**: Heim-/Auswärtsbilanz und Saison-für-Saison-Werte
- **H2H**: direkte Duelle mit Siegen, Remis, Ø Toren und Über 2,5
- **Derbys**: werden erkannt und im Modell berücksichtigt
- **Aufstellungen und Ausfälle**: ca. 60 Minuten vor Anpfiff
- **Value-Tipps**: Vergleich mit den Buchmacher-Quoten, Filter nach Mindestquote und Markt
- **Tabellen**: Gesamt, Heim/Auswärts und Modell-Stärke

**Ligen:** Premier League, Bundesliga, LaLiga, Serie A, Ligue 1, Liga Portugal, Süper Lig, Superliga (DK), Champions League, Europa League und Conference League.

---

## So funktioniert es

```
GitHub Actions (Roboter, läuft automatisch)
  ├─ football-data.co.uk  → Ergebnisse der letzten 5 Saisons + Quoten (kostenlos, ohne Schlüssel)
  ├─ API-Football          → Spielplan, Europapokal, Aufstellungen, Verletzungen, Quoten (Schlüssel)
  ├─ football-data.org     → Spielplan Top-Ligen + CL (Schlüssel)
  └─ ClubElo               → Stärkewerte aller europäischen Vereine (kostenlos)
        ↓ berechnet Prognosen → docs/data/*.json
GitHub Pages  → die App unter https://DEINNAME.github.io/kick-predict/
```

Der Roboter läuft täglich um ca. 05:20 und um 13:20 Uhr. An Spieltagen schaut er zusätzlich alle 30 Minuten nach Aufstellungen. GitHub startet geplante Läufe manchmal ein paar Minuten später.

---

## Einrichtung (einmalig, ca. 10–15 Minuten)

### 1. GitHub-Konto
Lege auf https://github.com/signup ein kostenloses Konto an.

### 2. Repository anlegen
Oben rechts **+ → New repository**:
- Name: `kick-predict`
- **Public** (GitHub Pages ist für private Repos nur im Bezahl-Abo verfügbar; deine API-Schlüssel bleiben trotzdem geheim)
- **ohne** README (leer lassen)
- **Create repository**

### 3. Code hochladen
Claude lädt den Code direkt hoch, sobald das Repository existiert.
Alternative: ZIP entpacken und im Repository **Add file → Upload files** wählen. Dann **alle** Ordner und Dateien hineinziehen, auch den Ordner `.github`.

### 4. API-Schlüssel holen (beide kostenlos)
- **API-Football**: https://dashboard.api-football.com/register → nach dem Login steht der Schlüssel unter *Account → My Access*.
- **football-data.org**: https://www.football-data.org/client/register → der Schlüssel kommt per E-Mail.

### 5. Schlüssel als Secrets eintragen
Im Repository: **Settings → Secrets and variables → Actions → New repository secret**
| Name | Wert |
|---|---|
| `API_FOOTBALL_KEY` | Schlüssel von API-Football |
| `FOOTBALL_DATA_KEY` | Schlüssel von football-data.org |

### 6. GitHub Pages einschalten
**Settings → Pages → Build and deployment → Source: „GitHub Actions“**

### 7. Ersten Lauf starten
**Actions** → falls nötig „I understand my workflows, go ahead and enable them“ → **Daten aktualisieren** → **Run workflow** → Modus `full` → grüner Button.
Nach 2–4 Minuten ist der Lauf fertig (grüner Haken).

### 8. Aufs Handy
Öffne in Chrome auf dem Handy **https://DEINNAME.github.io/kick-predict/** → Menü **⋮** → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.

---

## Wenn etwas nicht stimmt

- **Info-Tab in der App**: Er zeigt Datenstand, Quellen, API-Kontingent und das Protokoll des letzten Laufs.
- **„Nicht erkannte Teamnamen“**: Trage sie in `pipeline/aliases.json` ein, z. B. `"Name aus der API": "Name in der Historie"`. Die Namen in der Historie findest du in der App unter *Tabellen*.
- **API-Football meldet einen Fehler zum Plan oder zur Saison**: Dann erlaubt der Gratis-Plan diesen Abruf nicht. Die App nutzt in dem Fall automatisch football-data.org und football-data.co.uk. Aufstellungen und Europa/Conference League fehlen dann.
- **Kontingent**: API-Football erlaubt gratis 100 Abrufe pro Tag. Der Roboter teilt sie ein: ca. 7 für den Spielplan, bis zu 15 für Quoten und den Rest für Aufstellungen.

## Modell anpassen
Alle Stellschrauben stehen in `pipeline/config.py`: Gewichtung von Form, Elo und H2H, Derby-Effekt, Value-Schwelle und die Derby-Liste.

## Lokal testen
```bash
pip install -r requirements.txt
API_FOOTBALL_KEY=... FOOTBALL_DATA_KEY=... python pipeline/build.py
cd docs && python -m http.server 8000   # → http://localhost:8000
```

---

*Prognosen sind Wahrscheinlichkeiten, keine Garantien. Spiel verantwortungsvoll – Hilfe gibt es bei stopspillet.dk.*
