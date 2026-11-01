/* Kick Predict – Handy-App (PWA). Liest die vom GitHub-Roboter erzeugten JSON-Dateien. */
"use strict";

const S = {
  tab: "games",
  matches: [], comps: {}, tables: null, status: null, generated: null,
  day: "all", leagues: new Set(),
  minOdds: 2.0, markets: new Set(["1X2", "O/U", "BTTS", "AH"]),
  tableComp: null, tableMode: "table",
};

const store = {
  get(k, d) { try { const v = localStorage.getItem("kp_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("kp_" + k, JSON.stringify(v)); } catch { /* egal */ } },
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (p, d = 0) => (p == null ? "–" : (p * 100).toFixed(d) + "%");
const odd = (o) => (o == null ? "–" : Number(o).toFixed(2));
const fair = (p) => (p ? (1 / p).toFixed(2) : "–");
const dt = (iso) => new Date(iso);
const fmtTime = (iso) => dt(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso) => dt(iso).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" });
const fmtShort = (iso) => dt(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const logo = (url) => (url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">` : "");
const ahFmt = (l) => (l > 0 ? "+" : "") + String(l).replace(".", ",");

/* ------------------------------------------------------------ Laden */
async function load(force) {
  const opt = force ? { cache: "reload" } : {};
  try {
    const [m, t, s] = await Promise.all([
      fetch("data/matches.json", opt).then((r) => r.json()),
      fetch("data/tables.json", opt).then((r) => r.json()).catch(() => null),
      fetch("data/status.json", opt).then((r) => r.json()).catch(() => null),
    ]);
    S.matches = m.matches || [];
    S.comps = m.comps || {};
    S.generated = m.generated;
    S.lineupsUpdated = m.lineupsUpdated;
    S.tables = t;
    S.status = s;
    const saved = store.get("leagues", null);
    S.leagues = new Set(saved || Object.keys(S.comps));
    S.minOdds = store.get("minOdds", 2.0);
    S.markets = new Set(store.get("markets", ["1X2", "O/U", "BTTS", "AH"]));
    const ago = Math.round((Date.now() - dt(S.generated)) / 60000);
    $("#updated").textContent = "Stand: " + (ago < 60 ? `vor ${ago} Min.` : fmtShort(S.generated) + " " + fmtTime(S.generated));
  } catch (e) {
    $("#updated").textContent = "Keine Daten";
    S.matches = [];
  }
  render();
}

/* ------------------------------------------------------------ Navigation */
document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    S.tab = b.dataset.tab;
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    render();
    window.scrollTo(0, 0);
  })
);
$("#refresh").addEventListener("click", () => load(true));
document.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
window.addEventListener("popstate", () => { if (!$("#sheet").hidden) closeSheet(true); });

function render() {
  const v = $("#view");
  if (S.tab === "games") v.innerHTML = viewGames();
  else if (S.tab === "value") v.innerHTML = viewValue();
  else if (S.tab === "tables") v.innerHTML = viewTables();
  else v.innerHTML = viewInfo();
  bind(v);
}

function bind(root) {
  root.querySelectorAll("[data-day]").forEach((el) => el.onclick = () => { S.day = el.dataset.day; render(); });
  root.querySelectorAll("[data-league]").forEach((el) => el.onclick = () => {
    const k = el.dataset.league;
    if (k === "*") S.leagues = new Set(S.leagues.size === Object.keys(S.comps).length ? [] : Object.keys(S.comps));
    else S.leagues.has(k) ? S.leagues.delete(k) : S.leagues.add(k);
    store.set("leagues", [...S.leagues]);
    render();
  });
  root.querySelectorAll("[data-match]").forEach((el) => el.onclick = () => openMatch(el.dataset.match));
  root.querySelectorAll("[data-minodds]").forEach((el) => el.onclick = () => { S.minOdds = +el.dataset.minodds; store.set("minOdds", S.minOdds); render(); });
  root.querySelectorAll("[data-market]").forEach((el) => el.onclick = () => {
    const k = el.dataset.market; S.markets.has(k) ? S.markets.delete(k) : S.markets.add(k);
    store.set("markets", [...S.markets]); render();
  });
  root.querySelectorAll("[data-tcomp]").forEach((el) => el.onclick = () => { S.tableComp = el.dataset.tcomp; render(); });
  root.querySelectorAll("[data-tmode]").forEach((el) => el.onclick = () => { S.tableMode = el.dataset.tmode; render(); });
}

/* ------------------------------------------------------------ Spiele */
function leagueChips() {
  const keys = Object.keys(S.comps).filter((k) => S.matches.some((m) => m.comp === k));
  const all = S.leagues.size === Object.keys(S.comps).length;
  return `<div class="chips"><button class="chip ${all ? "on" : ""}" data-league="*">Alle</button>${keys
    .map((k) => `<button class="chip ${S.leagues.has(k) ? "on" : ""}" data-league="${k}">${S.comps[k].flag} ${esc(S.comps[k].name)}</button>`)
    .join("")}</div>`;
}

function dayChips() {
  const days = [...new Set(S.matches.map((m) => dayKey(m.kickoff)))];
  const today = dayKey(new Date()), tomorrow = dayKey(Date.now() + 864e5);
  const label = (k) => {
    if (k === today) return "Heute";
    if (k === tomorrow) return "Morgen";
    const m = S.matches.find((x) => dayKey(x.kickoff) === k);
    return dt(m.kickoff).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  };
  return `<div class="chips"><button class="chip ${S.day === "all" ? "on" : ""}" data-day="all">Alle Tage</button>${days
    .map((k) => `<button class="chip ${S.day === k ? "on" : ""}" data-day="${k}">${label(k)}</button>`).join("")}</div>`;
}

function filtered() {
  return S.matches.filter((m) => S.leagues.has(m.comp) && (S.day === "all" || dayKey(m.kickoff) === S.day));
}

function matchCard(m) {
  const c = S.comps[m.comp] || { flag: "", name: m.comp };
  const p = m.p && m.p["1X2"];
  const vb = (m.value || []).filter((v) => v.isValue && v.odds >= S.minOdds);
  const badges = [
    m.derby ? `<span class="badge derby">🔥 ${esc(m.derby)}</span>` : "",
    vb.length ? `<span class="badge value">💎 Value</span>` : "",
    m.lineups ? `<span class="badge lineup">📋 Aufstellung</span>` : "",
  ].join("");
  const bar = p
    ? `<div class="bar"><div class="h" style="flex:${p.H}">${pct(p.H)}</div><div class="d" style="flex:${p.D}">${pct(p.D)}</div><div class="a" style="flex:${p.A}">${pct(p.A)}</div></div>`
    : `<div class="info-note">Keine Prognose – zu wenig Daten</div>`;
  const tip = m.tip
    ? `<div class="tipline"><span>Tipp: <b class="conf-${m.tip.conf}">${esc(m.tip.label)}</b></span><span>${esc(m.tip.goals)} · ${pct(m.tip.goalsP)}</span></div>`
    : "";
  return `<div class="card match" data-match="${esc(m.id)}">
    <div class="m-top"><span>${c.flag} ${esc(c.name)} · ${fmtTime(m.kickoff)}</span><span class="badges">${badges}</span></div>
    <div class="teams">
      <div class="team">${logo(m.homeLogo)}<span>${esc(m.home)}</span></div>
      <div class="xg">${m.xg ? `<b>${m.xg[0].toFixed(1)} : ${m.xg[1].toFixed(1)}</b><br>xG` : "vs"}</div>
      <div class="team r"><span>${esc(m.away)}</span>${logo(m.awayLogo)}</div>
    </div>${bar}${tip}</div>`;
}

function viewGames() {
  if (!S.matches.length) return emptyState();
  const list = filtered();
  let html = dayChips() + leagueChips();
  if (!list.length) return html + `<div class="empty"><b>🔍</b>Keine Spiele für diese Auswahl</div>`;
  let lastDay = null;
  for (const m of list) {
    const k = dayKey(m.kickoff);
    if (k !== lastDay) {
      const n = list.filter((x) => dayKey(x.kickoff) === k).length;
      html += `<div class="group-h"><span>${fmtDay(m.kickoff)}</span><span>${n} Spiele</span></div>`;
      lastDay = k;
    }
    html += matchCard(m);
  }
  return html;
}

function emptyState() {
  return `<div class="empty"><b>⚽</b>Noch keine Spiele geladen.<br><small>Der GitHub-Roboter füllt die Daten automatisch. Schau unter „Info“ nach dem Status.</small></div>`;
}

/* ------------------------------------------------------------ Value */
function viewValue() {
  const rows = [];
  for (const m of S.matches) {
    if (!S.leagues.has(m.comp)) continue;
    for (const v of m.value || []) if (v.isValue && v.odds >= S.minOdds && S.markets.has(v.market)) rows.push({ m, v });
  }
  rows.sort((a, b) => b.v.edge - a.v.edge);
  let html = `<div class="info-note">Value = unsere Wahrscheinlichkeit × Quote &gt; 1. Die Quote ist der Marktdurchschnitt; der „Vorteil“ zeigt, wie viel die Quote über der fairen Quote liegt.</div>`;
  html += `<div class="chips">${[1.5, 1.8, 2.0, 2.5, 3.0].map((o) => `<button class="chip ${S.minOdds === o ? "on" : ""}" data-minodds="${o}">Quote ≥ ${o.toFixed(1).replace(".", ",")}</button>`).join("")}</div>`;
  html += `<div class="chips">${["1X2", "O/U", "BTTS", "AH"].map((k) => `<button class="chip ${S.markets.has(k) ? "on" : ""}" data-market="${k}">${k === "AH" ? "Asian Handicap" : k}</button>`).join("")}</div>`;
  html += leagueChips();
  if (!rows.length) return html + `<div class="empty"><b>💎</b>Keine Value-Tipps für diese Filter.<br><small>Quoten gibt es meist 2–4 Tage vor dem Spiel.</small></div>`;
  for (const { m, v } of rows) {
    const c = S.comps[m.comp] || { flag: "" };
    html += `<div class="card match" data-match="${esc(m.id)}"><div class="vrow">
      <div><b>${esc(v.label)}</b><div class="sub">${c.flag} ${esc(m.home)} – ${esc(m.away)}</div>
      <div class="sub">${fmtDay(m.kickoff)}, ${fmtTime(m.kickoff)}${m.derby ? " · 🔥 Derby" : ""}</div></div>
      <div class="edge">+${(v.edge * 100).toFixed(1)}%</div>
      <div class="sub">Wahrsch. <b>${pct(v.p, 1)}</b> · faire Quote ${odd(v.fair)}</div>
      <div class="sub" style="text-align:right">Quote <b>${odd(v.odds)}</b>${v.maxOdds ? ` (max ${odd(v.maxOdds)})` : ""}</div>
    </div></div>`;
  }
  return html + `<p class="info-note">Kein Modell ist sicher. Setze nur Geld, dessen Verlust du verkraften kannst.</p>`;
}

/* ------------------------------------------------------------ Tabellen */
function viewTables() {
  const T = S.tables && S.tables.tables;
  if (!T || !Object.keys(T).length) return `<div class="empty"><b>📊</b>Noch keine Tabellen.</div>`;
  const keys = Object.keys(T);
  if (!S.tableComp || !T[S.tableComp]) S.tableComp = keys[0];
  const t = T[S.tableComp];
  let html = `<div class="chips">${keys.map((k) => `<button class="chip ${k === S.tableComp ? "on" : ""}" data-tcomp="${k}">${S.comps[k].flag} ${esc(S.comps[k].name)}</button>`).join("")}</div>`;
  html += `<div class="chips"><button class="chip ${S.tableMode === "table" ? "on" : ""}" data-tmode="table">Tabelle ${esc(t.season)}</button><button class="chip ${S.tableMode === "home" ? "on" : ""}" data-tmode="home">Heim/Auswärts</button><button class="chip ${S.tableMode === "power" ? "on" : ""}" data-tmode="power">Modell-Stärke</button></div>`;
  if (S.tableMode === "power") {
    const R = (S.tables.ratings || {})[S.tableComp] || [];
    html += `<div class="card tbl-wrap"><table><tr><th>#</th><th>Team</th><th>Tore/Sp.</th><th>Gegent.</th><th>Heim+</th></tr>${R.map((r, i) =>
      `<tr><td>${i + 1}</td><td style="text-align:left">${esc(r.team)}</td><td>${r.xgf.toFixed(2)}</td><td>${r.xga.toFixed(2)}</td><td>${r.home >= 0 ? "+" : ""}${(r.home * 100).toFixed(0)}%</td></tr>`).join("")}</table></div>
      <p class="info-note">Erwartete Tore gegen einen Durchschnittsgegner, laut Modell (letzte 5 Jahre, neuere Spiele zählen mehr). „Heim+“ = Heimstärke über dem Ligaschnitt.</p>`;
    return html;
  }
  if (S.tableMode === "home") {
    const rows = [...t.rows];
    html += `<div class="card tbl-wrap"><table><tr><th>Team</th><th>Heim Sp.</th><th>Pkt</th><th>Ø</th><th>Ausw. Sp.</th><th>Pkt</th><th>Ø</th></tr>${rows
      .sort((a, b) => b.hPts / (b.hP || 1) - a.hPts / (a.hP || 1))
      .map((r) => `<tr><td>${esc(r.team)}</td><td>${r.hP}</td><td>${r.hPts}</td><td>${(r.hPts / (r.hP || 1)).toFixed(2)}</td><td>${r.aP}</td><td>${r.aPts}</td><td>${(r.aPts / (r.aP || 1)).toFixed(2)}</td></tr>`).join("")}</table></div>`;
    return html;
  }
  const promoted = new Set(t.promoted || []);
  html += `<div class="card tbl-wrap"><table><tr><th>#</th><th style="text-align:left">Team</th><th>Sp</th><th>TD</th><th>Pkt</th><th>Form</th></tr>${t.rows
    .map((r) => `<tr><td>${r.pos}</td><td style="text-align:left">${esc(r.team)}${promoted.has(r.team) ? " <small>↑</small>" : ""}</td><td>${r.P}</td><td>${r.GF - r.GA > 0 ? "+" : ""}${r.GF - r.GA}</td><td><b>${r.Pts}</b></td><td><span class="pills" style="justify-content:flex-end">${r.form.map((f) => `<span class="pill ${f}" style="width:16px;height:16px;font-size:9px">${f}</span>`).join("")}</span></td></tr>`)
    .join("")}</table></div>`;
  if (t.avg && t.avg.goals) html += `<div class="grid3"><div class="stat"><small>Ø Tore</small><b>${t.avg.goals}</b></div><div class="stat"><small>Heimsiege</small><b>${t.avg.homeWin}%</b></div><div class="stat"><small>Remis</small><b>${t.avg.draw}%</b></div><div class="stat"><small>Auswärtssiege</small><b>${t.avg.awayWin}%</b></div><div class="stat"><small>Über 2,5</small><b>${t.avg.o25}%</b></div><div class="stat"><small>Beide treffen</small><b>${t.avg.btts}%</b></div></div><small>Ligaschnitt der letzten 2 Saisons</small>`;
  return html;
}

/* ------------------------------------------------------------ Info */
function viewInfo() {
  const st = S.status;
  let html = `<h3>Datenstand</h3><div class="card">`;
  html += `<div class="row-between"><span>Prognosen berechnet</span><b>${S.generated ? fmtShort(S.generated) + " " + fmtTime(S.generated) : "–"}</b></div>`;
  if (S.lineupsUpdated) html += `<div class="row-between"><span>Aufstellungen</span><b>${fmtTime(S.lineupsUpdated)}</b></div>`;
  html += `<div class="row-between"><span>Spiele</span><b>${S.matches.length}</b></div></div>`;
  if (st) {
    const src = st.sources || {};
    html += `<h3>Quellen</h3><div class="card">`;
    const af = src["API-Football"] || {};
    html += `<div class="row-between"><span>API-Football</span><b class="${af.key ? "src-ok" : "src-bad"}">${af.key ? `✓ ${af.calls} Abrufe, Rest ${af.remaining ?? "?"}` : "kein Schlüssel"}</b></div>`;
    html += `<div class="row-between"><span>football-data.org</span><b class="${src["football-data.org"]?.key ? "src-ok" : "src-bad"}">${src["football-data.org"]?.key ? "✓" : "kein Schlüssel"}</b></div>`;
    html += `<div class="row-between"><span>ClubElo</span><b class="${src.ClubElo?.clubs ? "src-ok" : "src-bad"}">${src.ClubElo?.clubs ? "✓ " + src.ClubElo.clubs + " Vereine" : "nicht erreichbar"}</b></div>`;
    html += `<div class="row-between"><span>Historie</span><b>${src.Historie?.matches ?? 0} Spiele</b></div><small>${esc(src.Historie?.seasons || "")}</small>`;
    if (af.errors && af.errors.length) html += `<div class="note">API-Football meldet: ${esc(af.errors[0])}</div>`;
    html += `</div>`;
    if (st.unmatched && st.unmatched.length) html += `<h3>Nicht erkannte Teamnamen</h3><div class="card"><small>Diese Namen konnten keinem Team der Historie zugeordnet werden. Ergänzen in <code>pipeline/aliases.json</code>:</small><p>${st.unmatched.map(esc).join(", ")}</p></div>`;
    html += `<h3>Protokoll</h3><div class="card" style="font-size:12px;color:var(--muted);max-height:220px;overflow:auto">${(st.log || []).map(esc).join("<br>")}</div>`;
  }
  html += `<h3>So rechnet die App</h3><div class="card" style="font-size:14px">
    <p><b>Grundmodell:</b> Aus allen Ligaspielen der letzten 5 Saisons wird für jedes Team eine Angriffs- und Abwehrstärke geschätzt (Poisson/Dixon-Coles). Neuere Spiele zählen mehr (Halbwertszeit 1 Jahr). Jedes Team hat einen eigenen Heimvorteil.</p>
    <p><b>Form:</b> Die letzten 6 Spiele werden mit der Erwartung verglichen. Wer mehr trifft als erwartet, bekommt einen Zuschlag (max. ±15 %).</p>
    <p><b>H2H:</b> Direkte Duelle der letzten 5 Jahre verschieben die Torerwartung leicht (max. ±10 %).</p>
    <p><b>Derby:</b> Heimvorteil wird reduziert, Remis werden wahrscheinlicher.</p>
    <p><b>ClubElo:</b> 25 % der Tordifferenz-Erwartung kommen aus den Elo-Werten. Für Europapokalspiele ist Elo die Hauptquelle, weil Teams aus verschiedenen Ligen aufeinandertreffen.</p>
    <p><b>Aufstellungen</b> erscheinen ca. 60 Minuten vor Anpfiff. Sie fließen nicht automatisch in die Prognose ein. Prüfe also selbst, ob wichtige Spieler fehlen.</p>
  </div>
  <p class="info-note">Prognosen sind Wahrscheinlichkeiten, keine Garantien. Wetten kann süchtig machen – Hilfe: <a href="https://www.stopspillet.dk" target="_blank" rel="noopener">stopspillet.dk</a>.</p>`;
  return html;
}

/* ------------------------------------------------------------ Detail */
let detailTab = "pred";

function openMatch(id) {
  const m = S.matches.find((x) => x.id === id);
  if (!m) return;
  detailTab = "pred";
  renderDetail(m);
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState({ sheet: 1 }, "");
}

function closeSheet(fromPop) {
  $("#sheet").hidden = true;
  document.body.style.overflow = "";
  if (!fromPop && history.state && history.state.sheet) history.back();
}

function renderDetail(m) {
  const c = S.comps[m.comp] || { flag: "", name: m.comp };
  const T = m.teams || {};
  const posH = T.home && T.home.pos ? `${T.home.pos}. Platz` : T.home && T.home.league ? esc(T.home.league) : "";
  const posA = T.away && T.away.pos ? `${T.away.pos}. Platz` : T.away && T.away.league ? esc(T.away.league) : "";
  const tabs = [["pred", "Prognose"], ["form", "Form"], ["h2h", "H2H"], ["stats", "5 Jahre"], ["lineup", "Aufstellung"]];
  let html = `<div class="d-head"><small>${c.flag} ${esc(c.name)}${m.round ? " · " + esc(m.round) : ""}</small>
    ${m.derby ? `<div style="margin-top:6px"><span class="badge derby">🔥 ${esc(m.derby)}</span></div>` : ""}
    <div class="vs"><div class="t">${logo(m.homeLogo)}${esc(m.home)}<small>${posH}</small></div>
      <div class="mid">${fmtDay(m.kickoff)}<b>${fmtTime(m.kickoff)}</b>${m.venue ? esc(m.venue) : ""}</div>
      <div class="t">${logo(m.awayLogo)}${esc(m.away)}<small>${posA}</small></div></div></div>
    <div class="subtabs"><div class="chips">${tabs.map(([k, l]) => `<button class="chip ${detailTab === k ? "on" : ""}" data-dtab="${k}">${l}</button>`).join("")}</div></div>
    <div id="dbody">${detailBody(m)}</div>`;
  const box = $("#sheet-content");
  box.innerHTML = html;
  box.querySelectorAll("[data-dtab]").forEach((b) => b.onclick = () => { detailTab = b.dataset.dtab; renderDetail(m); });
}

function detailBody(m) {
  if (detailTab === "pred") return dPred(m);
  if (detailTab === "form") return dForm(m);
  if (detailTab === "h2h") return dH2H(m);
  if (detailTab === "stats") return dStats(m);
  return dLineup(m);
}

function oddsCell(o) { return o ? odd(o) : "–"; }
function edgeCell(p, o) {
  if (!o || !p) return "<td>–</td>";
  const e = p * o - 1;
  return `<td class="${e > 0 ? "edge-pos" : "edge-neg"}">${e > 0 ? "+" : ""}${(e * 100).toFixed(1)}%</td>`;
}

function dPred(m) {
  if (!m.p) return `<div class="empty"><b>🤷</b>Für dieses Spiel gibt es zu wenig Daten.</div>`;
  const p = m.p, o = m.odds || {};
  let h = (m.notes || []).map((n) => `<div class="note">${esc(n)}</div>`).join("");
  h += `<div class="bar"><div class="h" style="flex:${p["1X2"].H}">1 · ${pct(p["1X2"].H)}</div><div class="d" style="flex:${p["1X2"].D}">X · ${pct(p["1X2"].D)}</div><div class="a" style="flex:${p["1X2"].A}">2 · ${pct(p["1X2"].A)}</div></div>`;
  h += `<div class="grid3" style="margin-top:8px"><div class="stat"><small>xG ${esc(m.home)}</small><b>${m.xg[0].toFixed(2)}</b></div><div class="stat"><small>Tipp</small><b class="conf-${m.tip.conf}" style="font-size:15px">${esc(m.tip.label)}</b><i>Sicherheit ${m.tip.conf}</i></div><div class="stat"><small>xG ${esc(m.away)}</small><b>${m.xg[1].toFixed(2)}</b></div></div>`;

  const val = (m.value || []).filter((v) => v.isValue);
  if (val.length) {
    h += `<h3>💎 Value</h3>`;
    h += val.map((v) => `<div class="card vrow"><div><b>${esc(v.label)}</b><div class="sub">Wahrsch. ${pct(v.p, 1)} · faire Quote ${odd(v.fair)}</div></div><div class="edge">+${(v.edge * 100).toFixed(1)}%<div class="sub">@ ${odd(v.odds)}</div></div></div>`).join("");
  }

  h += `<h3>1X2 & Doppelte Chance</h3><div class="card"><table><tr><th>Tipp</th><th>Wahrsch.</th><th>Faire Q.</th><th>Markt</th><th>Vorteil</th></tr>
    <tr><td>1 Heim</td><td>${pct(p["1X2"].H, 1)}</td><td>${fair(p["1X2"].H)}</td><td>${oddsCell(o.H)}</td>${edgeCell(p["1X2"].H, o.H)}</tr>
    <tr><td>X Remis</td><td>${pct(p["1X2"].D, 1)}</td><td>${fair(p["1X2"].D)}</td><td>${oddsCell(o.D)}</td>${edgeCell(p["1X2"].D, o.D)}</tr>
    <tr><td>2 Gast</td><td>${pct(p["1X2"].A, 1)}</td><td>${fair(p["1X2"].A)}</td><td>${oddsCell(o.A)}</td>${edgeCell(p["1X2"].A, o.A)}</tr>
    <tr><td>1X</td><td>${pct(p.DC["1X"], 1)}</td><td>${fair(p.DC["1X"])}</td><td></td><td></td></tr>
    <tr><td>X2</td><td>${pct(p.DC.X2, 1)}</td><td>${fair(p.DC.X2)}</td><td></td><td></td></tr>
    <tr><td>12</td><td>${pct(p.DC["12"], 1)}</td><td>${fair(p.DC["12"])}</td><td></td><td></td></tr></table></div>`;

  h += `<h3>Über / Unter</h3><div class="card"><table><tr><th>Linie</th><th>Über</th><th>Faire Q.</th><th>Unter</th><th>Faire Q.</th></tr>${Object.entries(p.OU)
    .map(([l, v]) => `<tr class="${l === "2.5" ? "hl" : ""}"><td>${l.replace(".", ",")}</td><td>${pct(v.O)}</td><td>${fair(v.O)}</td><td>${pct(v.U)}</td><td>${fair(v.U)}</td></tr>`).join("")}</table>
    ${o.O25 ? `<small>Markt 2,5: Über ${odd(o.O25)} · Unter ${odd(o.U25)}</small>` : ""}</div>`;

  h += `<h3>Beide treffen</h3><div class="grid2"><div class="stat"><small>Ja</small><b>${pct(p.BTTS.Y)}</b><i>faire Q. ${fair(p.BTTS.Y)}${o.BTTSY ? " · Markt " + odd(o.BTTSY) : ""}</i></div><div class="stat"><small>Nein</small><b>${pct(p.BTTS.N)}</b><i>faire Q. ${fair(p.BTTS.N)}${o.BTTSN ? " · Markt " + odd(o.BTTSN) : ""}</i></div></div>`;

  const ahMarket = o.AH ? o.AH.line : null;
  const ah = (p.AH || []).filter((a) => Math.abs(a.line) <= 1.75 || a.line === ahMarket);
  h += `<h3>Asian Handicap (Heim)</h3><div class="card"><table><tr><th>Linie</th><th>Heim faire Q.</th><th>Gast faire Q.</th></tr>${ah
    .map((a) => `<tr class="${a.line === ahMarket ? "hl" : ""}"><td>${ahFmt(a.line)}</td><td>${odd(a.home)}</td><td>${odd(a.away)}</td></tr>`).join("")}</table>
    ${o.AH ? `<small>Markt: Heim ${ahFmt(o.AH.line)} @ ${odd(o.AH.home)} · Gast @ ${odd(o.AH.away)}</small>` : ""}</div>`;

  h += `<h3>Wahrscheinlichste Ergebnisse</h3><div class="grid3">${p.CS.slice(0, 6).map(([s, v]) => `<div class="stat"><b>${s.replace("-", ":")}</b><i>${pct(v, 1)}</i></div>`).join("")}</div>`;
  h += `<h3>Anzahl Tore</h3><div class="grid3">${Object.entries(p.TG).map(([k, v]) => `<div class="stat"><small>${k} Tore</small><b>${pct(v)}</b></div>`).join("")}</div>`;
  if (m.elo) h += `<h3>ClubElo</h3><div class="grid2"><div class="stat"><small>${esc(m.home)}</small><b>${m.elo.home}</b></div><div class="stat"><small>${esc(m.away)}</small><b>${m.elo.away}</b></div></div>`;
  h += `<p class="info-note">Modell: ${esc(m.model || "")} · Quellen: ${esc((m.src || []).join(", "))}</p>`;
  return h;
}

function formList(items, title) {
  if (!items || !items.length) return "";
  return `<h3>${title}</h3><div class="card">${items.map((i) => `<div class="formrow"><span class="pill ${i.r}">${i.r}</span><small>${fmtShort(i.d)}</small><span class="opp">${i.v === "H" ? "vs" : "@"} ${esc(i.opp)}</span><span class="sc">${i.gf}:${i.ga}</span></div>`).join("")}</div>`;
}

function formStats(name, f) {
  if (!f) return "";
  return `<div class="card"><b>${esc(name)}</b> <small>· letzte ${f.n} Spiele</small>
    <div class="grid3" style="margin-top:8px"><div class="stat"><small>Punkte/Sp.</small><b>${f.ppg.toFixed(2)}</b><i>${f.w}S ${f.d}U ${f.l}N</i></div>
    <div class="stat"><small>Tore</small><b>${f.gf}:${f.ga}</b></div><div class="stat"><small>Zu Null</small><b>${f.cs}</b></div>
    <div class="stat"><small>Über 2,5</small><b>${f.o25}/${f.n}</b></div><div class="stat"><small>Beide treffen</small><b>${f.btts}/${f.n}</b></div><div class="stat"><small>Siege</small><b>${Math.round((f.w / f.n) * 100)}%</b></div></div></div>`;
}

function dForm(m) {
  const T = m.teams;
  if (!T) return `<div class="empty">Keine Formdaten</div>`;
  let h = "";
  h += `<div class="card"><div class="row-between"><b>${esc(m.home)}</b><span class="pills">${(T.home.form || []).map((i) => `<span class="pill ${i.r}">${i.r}</span>`).join("")}</span></div>
        <div class="row-between" style="margin-top:8px"><b>${esc(m.away)}</b><span class="pills">${(T.away.form || []).map((i) => `<span class="pill ${i.r}">${i.r}</span>`).join("")}</span></div></div>`;
  h += formStats(m.home, T.home.formSum) + formStats(m.away, T.away.formSum);
  h += formList(T.home.homeForm, `${esc(m.home)} – letzte Heimspiele`);
  h += formList(T.away.awayForm, `${esc(m.away)} – letzte Auswärtsspiele`);
  h += formList(T.home.form, `${esc(m.home)} – letzte 5 Spiele`);
  h += formList(T.away.form, `${esc(m.away)} – letzte 5 Spiele`);
  return h;
}

function dH2H(m) {
  const x = m.h2h;
  if (!x || !x.n) return `<div class="empty"><b>🤝</b>Keine direkten Duelle in den letzten 5 Jahren (in dieser Liga).</div>`;
  let h = `<div class="bar"><div class="h" style="flex:${x.w1 || 0.3}">${x.w1}</div><div class="d" style="flex:${x.d || 0.3}">${x.d}</div><div class="a" style="flex:${x.w2 || 0.3}">${x.w2}</div></div>
    <div class="row-between" style="font-size:12px;color:var(--muted);margin-top:4px"><span>${esc(m.home)} Siege</span><span>Remis</span><span>${esc(m.away)} Siege</span></div>`;
  h += `<div class="grid3" style="margin-top:10px"><div class="stat"><small>Spiele</small><b>${x.n}</b></div><div class="stat"><small>Ø Tore</small><b>${x.avgGoals}</b></div><div class="stat"><small>Über 2,5</small><b>${x.o25}%</b></div></div>`;
  h += `<h3>Letzte Duelle</h3><div class="card">${x.games.map((g) => `<div class="formrow"><small>${fmtShort(g.d)}</small><span class="opp">${esc(g.h)} – ${esc(g.a)}</span><span class="sc">${g.hg}:${g.ag}</span></div>`).join("")}</div>`;
  return h;
}

function recCard(title, r) {
  if (!r) return "";
  return `<div class="stat" style="text-align:left"><small>${title}</small><b>${r.W}-${r.D}-${r.L}</b><i>${r.GF}:${r.GA} Tore · ${r.winPct}% Siege · Ü2,5 ${r.o25Pct}% · BTTS ${r.bttsPct}%</i></div>`;
}

function dStats(m) {
  const T = m.teams;
  if (!T) return `<div class="empty">Keine Statistik</div>`;
  let h = `<h3>Diese Saison</h3><div class="grid2">${recCard(esc(m.home) + " zu Hause", T.home.homeRec)}${recCard(esc(m.away) + " auswärts", T.away.awayRec)}</div>`;
  h += `<h3>Letzte 5 Jahre</h3><div class="grid2">${recCard(esc(m.home) + " zu Hause", T.home.homeRec5y)}${recCard(esc(m.away) + " auswärts", T.away.awayRec5y)}</div>`;
  for (const [side, name] of [["home", m.home], ["away", m.away]]) {
    const s = T[side].seasons || [];
    if (!s.length) continue;
    h += `<h3>${esc(name)} – Saisons</h3><div class="card tbl-wrap"><table><tr><th>Saison</th><th>Sp</th><th>S-U-N</th><th>Tore</th><th>Pkt</th><th>Heim S</th><th>Ausw. S</th></tr>${s
      .map((x) => `<tr><td>${x.season}</td><td>${x.total.P}</td><td>${x.total.W}-${x.total.D}-${x.total.L}</td><td>${x.total.GF}:${x.total.GA}</td><td><b>${x.total.Pts}</b></td><td>${x.home ? x.home.W + "/" + x.home.P : "–"}</td><td>${x.away ? x.away.W + "/" + x.away.P : "–"}</td></tr>`).join("")}</table></div>`;
  }
  if (T.home.rating && T.away.rating) {
    h += `<h3>Modell-Werte</h3><div class="grid2"><div class="stat"><small>${esc(m.home)}</small><i>Angriff ${T.home.rating.att >= 0 ? "+" : ""}${(T.home.rating.att * 100).toFixed(0)}% · Abwehr ${T.home.rating.def <= 0 ? "" : "+"}${(T.home.rating.def * 100).toFixed(0)}% Gegentore</i></div><div class="stat"><small>${esc(m.away)}</small><i>Angriff ${T.away.rating.att >= 0 ? "+" : ""}${(T.away.rating.att * 100).toFixed(0)}% · Abwehr ${T.away.rating.def <= 0 ? "" : "+"}${(T.away.rating.def * 100).toFixed(0)}% Gegentore</i></div></div>`;
  }
  return h;
}

function dLineup(m) {
  let h = "";
  if (m.lineups && m.lineups.length) {
    for (const t of m.lineups) {
      h += `<h3>${esc(t.team)} ${t.formation ? "· " + esc(t.formation) : ""}</h3><div class="card"><div class="lineup">${t.xi.map((p) => `<div><span class="no">${p.no ?? ""}</span>${esc(p.n)} <small>${esc(p.pos || "")}</small></div>`).join("")}</div>
        ${t.coach ? `<small>Trainer: ${esc(t.coach)}</small>` : ""}${t.subs && t.subs.length ? `<p><small>Bank: ${t.subs.map(esc).join(", ")}</small></p>` : ""}</div>`;
    }
  } else {
    h += `<div class="empty"><b>📋</b>Aufstellungen kommen ca. 60 Minuten vor Anpfiff.<br><small>Der Roboter prüft an Spieltagen alle 30 Minuten.</small></div>`;
  }
  if (m.injuries && m.injuries.length) {
    h += `<h3>Ausfälle</h3><div class="card">${m.injuries.map((i) => `<div class="formrow"><span class="opp">${esc(i.player)}</span><small>${esc(i.team)}</small><small>${esc(i.reason || i.type || "")}</small></div>`).join("")}</div>`;
  }
  return h;
}

/* ------------------------------------------------------------ Start */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
load();
