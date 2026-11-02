"""Kurzer Lauf (alle 30 Min.): Aufstellungen + Verletzungen für Spiele, die bald beginnen.

Spart API-Abrufe: nur Spiele mit Anpfiff in den nächsten ~80 Minuten, die noch keine Aufstellung haben.
"""
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import results as res  # noqa: E402
from sources import ApiFootball  # noqa: E402
from util import DATA_DIR, read_json, write_json  # noqa: E402

WINDOW_MIN = 80


def main():
    path = os.path.join(DATA_DIR, "matches.json")
    data = read_json(path)
    if not data:
        print("Keine matches.json – zuerst build.py laufen lassen")
        return
    api = ApiFootball()
    now = datetime.now(timezone.utc)
    changed = 0
    for m in data["matches"]:
        if not m.get("apiId") or m.get("lineups"):
            continue
        ko = datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00"))
        mins = (ko - now).total_seconds() / 60
        if not (-20 <= mins <= WINDOW_MIN):
            continue
        lu = api.lineups(m["apiId"])
        if lu:
            m["lineups"] = lu
            changed += 1
        if not m.get("injuries") and (api.remaining is None or api.remaining > 25):
            inj = api.injuries(m["apiId"])
            if inj is not None:
                m["injuries"] = inj
                changed += 1
    if changed:
        data["lineupsUpdated"] = now.isoformat()
        write_json(path, data)
    # Ergebnisse: Spiele archivieren, Endstände nachtragen
    try:
        arch = res.load()
        added = res.archive_from(data, arch, now)
        fd_res = res.fd_results(days_back=2)
        api_res = []
        late = f"{now.date()}-late"
        pending = [m for m in arch["matches"] if not m.get("result")
                   and (now - datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00"))).total_seconds() > 2.2 * 3600]
        if pending and now.hour >= 21 and arch.get("apiChecked") != late:
            api_res = res.api_results(api, days_back=0)
            arch["apiChecked"] = late
        filled = res.fill(arch, api_res, fd_res)
        if added or filled:
            res.save(arch, now.isoformat())
        print(f"Ergebnisse: {added} archiviert, {filled} eingetragen")
    except Exception as e:  # noqa: BLE001
        print(f"Ergebnisse: Fehler {e}")
    print(f"Aufstellungen aktualisiert: {changed} Änderungen, {api.calls} Abrufe, Rest: {api.remaining}")


if __name__ == "__main__":
    main()
