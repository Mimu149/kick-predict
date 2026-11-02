/* Kick Predict – Handy-App (PWA). Liest die vom GitHub-Roboter erzeugten JSON-Dateien. */
"use strict";

const S = {
  tab: "games",
  matches: [], comps: {}, tables: null, status: null, generated: null,
  day: "all", hidden: new Set(), showLeagues: false,
  minOdds: 2.0, markets: new Set(["1X2", "O/U", "BTTS", "AH"]),
  tableComp: null, tableMode: "table",
  pickMode: "daily", pickDay: null, pickMin: 0.6, pickOne: true,
};

const store = {
  get(k, d) { try { const v = localStorage.getItem("kp_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("kp_" + k, JSON.stringify(v)); } catch { /* egal */ } },
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (p, d = 0) => (p == null ? "–" : num(p * 100, d) + "%");
const odd = (o) => (o == null ? "–" : num(o, 2));
const fair = (p) => (p ? num(1 / p, 2) : "–");
const dt = (iso) => new Date(iso);
const loc = () => LANGS[LANG].locale;
const fmtTime = (iso) => dt(iso).toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso) => dt(iso).toLocaleDateString(loc(), { weekday: "long", day: "2-digit", month: "2-digit" });
const fmtShort = (iso) => dt(iso).toLocaleDateString(loc(), { day: "2-digit", month: "2-digit", year: "2-digit" });
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const logo = (url) => (url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">` : "");
const ahFmt = (l) => (l > 0 ? "+" : "") + (LANGS[LANG].comma ? String(l).replace(".", ",") : String(l));
const sgn = (x) => (x > 0 ? "+" : "");

/* ------------------------------------------------------------ Laden */
async function load(force) {
  const opt = force ? { cache: "reload" } : {};
  try {
    const [m, t, s] = await Promise.all([
      fetch("data/matches.json", opt).then((r) => r.json()),
      fetch("data/tables.json", opt).then((r) => r.json()).catch(() => null),
      fetch("data/status.json", opt).then((r) => r.json()).catch(() => null),
    ]);
    S.results = await fetch("data/results.json", opt).then((r) => r.json()).catch(() => null);
    S.matches = m.matches || [];
    S.comps = m.comps || {};
    S.generated = m.generated;
    S.lineupsUpdated = m.lineupsUpdated;
    S.tables = t;
    S.status = s;
    S.hidden = new Set(store.get("hidden", []));
    S.minOdds = store.get("minOdds", 2.0);
    S.markets = new Set(store.get("markets", ["1X2", "O/U", "BTTS", "AH"]));
    S.pickGroups = new Set(store.get("pickGroups", ["1X2", "Goals", "BTTS", "Half"]));
    S.pickMin = store.get("pickMin", 0.6);
    S.pickOne = store.get("pickOne", true);
    updatedLabel();
  } catch (e) {
    $("#updated").textContent = t("noData");
    S.matches = [];
  }
  render();
}

function updatedLabel() {
  if (!S.generated) return;
  const ago = Math.round((Date.now() - dt(S.generated)) / 60000);
  $("#updated").textContent = t("updated", { x: ago < 60 ? t("minAgo", { n: ago }) : fmtShort(S.generated) + " " + fmtTime(S.generated) });
}

function applyStatic() {
  document.documentElement.lang = LANG;
  document.querySelectorAll(".tabs button").forEach((b) => { b.querySelector("i").textContent = t("tab_" + b.dataset.tab); });
  if (!S.generated) $("#updated").textContent = t("loading");
  else updatedLabel();
}

function setLang(l) {
  LANG = l;
  try { localStorage.setItem("kp_lang", JSON.stringify(l)); } catch { /* egal */ }
  applyStatic();
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
  else if (S.tab === "picks") v.innerHTML = S.pickMode === "value" ? pickModeChips() + viewValue() : S.pickMode === "kombi" ? viewKombi() : viewPicks();
  else if (S.tab === "results") v.innerHTML = viewResults();
  else if (S.tab === "tables") v.innerHTML = viewTables();
  else v.innerHTML = viewInfo();
  bind(v);
}

function bind(root) {
  root.querySelectorAll("[data-day]").forEach((el) => el.onclick = () => { S.day = el.dataset.day; render(); });
  root.querySelectorAll("[data-league]").forEach((el) => el.onclick = () => {
    const k = el.dataset.league;
    if (k === "+") S.hidden = new Set();
    else if (k === "-") S.hidden = new Set(Object.keys(S.comps));
    else if (k === "~") { S.showLeagues = !S.showLeagues; render(); return; }
    else S.hidden.has(k) ? S.hidden.delete(k) : S.hidden.add(k);
    store.set("hidden", [...S.hidden]);
    render();
  });
  root.querySelectorAll("[data-match]").forEach((el) => el.onclick = () => openMatch(el.dataset.match));
  bindAdds(root);
  root.querySelectorAll("[data-fav]").forEach((el) => el.onclick = (e) => {
    e.stopPropagation();
    const id = el.dataset.fav;
    if (FAVS.has(id)) { FAVS.delete(id); toast(t("favRm")); } else { FAVS.add(id); toast(t("favAdd")); }
    store.set("favs", [...FAVS]); render();
  });
  root.querySelectorAll("[data-onlyfav]").forEach((el) => el.onclick = () => { S.onlyFavs = !S.onlyFavs; render(); });
  root.querySelectorAll("[data-minodds]").forEach((el) => el.onclick = () => { S.minOdds = +el.dataset.minodds; store.set("minOdds", S.minOdds); render(); });
  root.querySelectorAll("[data-market]").forEach((el) => el.onclick = () => {
    const k = el.dataset.market; S.markets.has(k) ? S.markets.delete(k) : S.markets.add(k);
    store.set("markets", [...S.markets]); render();
  });
  root.querySelectorAll("[data-kt]").forEach((el) => el.onclick = () => { S.kT = +el.dataset.kt; render(); });
  root.querySelectorAll("[data-kl]").forEach((el) => el.onclick = () => { S.kL = +el.dataset.kl; render(); });
  root.querySelectorAll("[data-kadd]").forEach((el) => el.onclick = () => {
    const k = S._kombis && S._kombis[+el.dataset.kadd]; if (!k) return;
    for (const l of k.legs) if (!SLIP.legs.some((x) => x.id === l.m.id && x.key === l.p.k))
      SLIP.legs.push({ id: l.m.id, key: l.p.k, comp: l.m.comp, kickoff: l.m.kickoff, home: l.m.home, away: l.m.away, p: l.p.p, fair: l.p.fair, odds: +l.o.toFixed(2) });
    SLIP.type = "combo"; saveSlip(); updateFab(); toast(t("added"));
  });
  root.querySelectorAll("[data-pmode]").forEach((el) => el.onclick = () => { S.pickMode = el.dataset.pmode; render(); });
  root.querySelectorAll("[data-pday]").forEach((el) => el.onclick = () => { S.pickDay = el.dataset.pday; render(); });
  root.querySelectorAll("[data-pmin]").forEach((el) => el.onclick = () => { S.pickMin = +el.dataset.pmin; store.set("pickMin", S.pickMin); render(); });
  root.querySelectorAll("[data-pone]").forEach((el) => el.onclick = () => { S.pickOne = !S.pickOne; store.set("pickOne", S.pickOne); render(); });
  root.querySelectorAll("[data-pgroup]").forEach((el) => el.onclick = () => {
    const k = el.dataset.pgroup; S.pickGroups.has(k) ? S.pickGroups.delete(k) : S.pickGroups.add(k);
    store.set("pickGroups", [...S.pickGroups]); render();
  });
  root.querySelectorAll("[data-theme-set]").forEach((el) => el.onclick = () => {
    document.documentElement.dataset.theme = el.dataset.themeSet; store.set("theme", el.dataset.themeSet);
    const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = el.dataset.themeSet === "light" ? "#eef2f7" : "#0e1726";
    render();
  });
  root.querySelectorAll("[data-lang]").forEach((el) => el.onclick = () => setLang(el.dataset.lang));
  root.querySelectorAll("[data-rper]").forEach((el) => el.onclick = () => { S.rPeriod = el.dataset.rper; render(); });
  root.querySelectorAll("[data-tsel]").forEach((el) => el.onchange = () => { S.tableComp = el.value; render(); });
  root.querySelectorAll("[data-tmode]").forEach((el) => el.onclick = () => { S.tableMode = el.dataset.tmode; render(); });
}

/* ------------------------------------------------------------ Spiele */
const vis = (k) => !S.hidden.has(k);

function compOrder() {
  const keys = Object.keys(S.comps);
  return [...keys.filter((k) => S.comps[k].cup), ...keys.filter((k) => !S.comps[k].cup)];
}

function leagueChips() {
  const counts = {};
  for (const m of S.matches) counts[m.comp] = (counts[m.comp] || 0) + 1;
  const keys = compOrder().filter((k) => counts[k]);
  const on = keys.filter(vis).length;
  let html = `<div class="chips"><button class="chip ${S.showLeagues ? "on" : ""}" data-league="~">🏆 ${t("leagues")} ${on}/${keys.length} ${S.showLeagues ? "▴" : "▾"}</button>`;
  if (!S.showLeagues) {
    html += keys.filter(vis).slice(0, 12).map((k) => `<button class="chip on" data-league="${k}" title="${t("hide")}">${S.comps[k].flag} ${esc(S.comps[k].name)} ✕</button>`).join("");
    return html + `</div>`;
  }
  html += `<button class="chip" data-league="+">${t("allOn")}</button><button class="chip" data-league="-">${t("allOff")}</button></div>`;
  html += `<div class="chips wrap">${keys.map((k) => `<button class="chip ${vis(k) ? "on" : ""}" data-league="${k}">${S.comps[k].flag} ${esc(S.comps[k].name)} <small>${counts[k]}</small></button>`).join("")}</div>`;
  return html;
}

function dayChips() {
  const days = [...new Set(S.matches.map((m) => dayKey(m.kickoff)))];
  const today = dayKey(new Date()), tomorrow = dayKey(Date.now() + 864e5);
  const label = (k) => {
    if (k === today) return t("today");
    if (k === tomorrow) return t("tomorrow");
    const m = S.matches.find((x) => dayKey(x.kickoff) === k);
    return dt(m.kickoff).toLocaleDateString(loc(), { weekday: "short", day: "2-digit", month: "2-digit" });
  };
  return `<div class="chips"><button class="chip ${S.day === "all" ? "on" : ""}" data-day="all">${t("allDays")}</button>${days
    .map((k) => `<button class="chip ${S.day === k ? "on" : ""}" data-day="${k}">${label(k)}</button>`).join("")}</div>`;
}

function filtered() {
  return S.matches.filter((m) => (S.onlyFavs ? FAVS.has(m.id) : vis(m.comp)) && (S.day === "all" || dayKey(m.kickoff) === S.day));
}

function matchCard(m) {
  const c = S.comps[m.comp] || { flag: "", name: m.comp };
  const p = m.p && m.p["1X2"];
  const vb = (m.value || []).filter((v) => v.isValue && v.odds >= S.minOdds);
  const badges = [
    m.derby ? `<span class="badge derby">🔥 ${esc(m.derby)}</span>` : "",
    vb.length ? `<span class="badge value">💎 Value</span>` : "",
    m.lineups ? `<span class="badge lineup">📋 ${t("lineupBadge")}</span>` : "",
  ].join("");
  const bar = probTiles(m) + (p ? "" : `<div class="info-note">${t("noPred")}</div>`);
  const tip = m.tip
    ? `<div class="tipline"><span>${t("tip")}: <b class="conf-${m.tip.conf}">${esc(trPick(m.tip.pick))}</b></span><span>${esc(trGoals(m.tip.goals))} · ${pct(m.tip.goalsP)}</span></div>`
    : "";
  return `<div class="card match" data-match="${esc(m.id)}">
    <div class="m-top"><span><button class="star ${FAVS.has(m.id) ? "on" : ""}" data-fav="${esc(m.id)}">${FAVS.has(m.id) ? "★" : "☆"}</button>${c.flag} ${esc(c.name)} · ${fmtTime(m.kickoff)}</span><span class="badges">${badges}</span></div>
    <div class="teams">
      <div class="team">${logo(m.homeLogo)}<span>${esc(m.home)}</span></div>
      <div class="xg">${m.xg ? `<b>${num(m.xg[0], 1)} : ${num(m.xg[1], 1)}</b>xG` : `<b>${fmtTime(m.kickoff)}</b>`}</div>
      <div class="team r"><span>${esc(m.away)}</span>${logo(m.awayLogo)}</div>
    </div>${bar}${tip}</div>`;
}

function probTiles(m) {
  const o = m.odds || {}, p = (m.p && m.p["1X2"]) || {};
  const best = p.H != null ? ["H", "D", "A"].reduce((a, b) => (p[b] > p[a] ? b : a)) : null;
  const tile = (k, lbl, cls) => {
    const od = o[k] || (p[k] ? 1 / p[k] : null);
    const v = p[k] != null ? `${Math.round(p[k] * 100)}<small>%</small>` : "–";
    return `<button class="pt ${cls} ${best === k ? "fav" : ""}" style="--w:${p[k] ? Math.round(p[k] * 100) : 0}%" data-add="${esc(m.id)}|${k}" aria-label="${esc(lbl)}">
      <span class="k">${lbl}</span><span class="v">${v}</span><span class="o">${od ? odd(od) : ""}${mv(m, k)}<em>+</em></span></button>`;
  };
  return `<div class="probs">${tile("H", "1", "h")}${tile("D", "X", "d")}${tile("A", "2", "a")}</div>`;
}

function quickRow(m) {
  const o = m.odds || {}, p = (m.p && m.p["1X2"]) || {};
  const q = (k, lbl) => {
    const od = o[k] || (p[k] ? 1 / p[k] : null);
    return `<button class="qb" data-add="${esc(m.id)}|${k}"><b>${lbl}</b>${od ? `<span>${odd(od)}</span>` : ""}<i>＋</i></button>`;
  };
  return `<div class="qrow">${q("H", "1")}${q("D", "X")}${q("A", "2")}</div>`;
}

function viewGames() {
  if (!S.matches.length) return emptyState();
  const list = filtered();
  let html = dayChips() + leagueChips();
  html += `<div class="chips"><button class="chip ${S.onlyFavs ? "on" : ""}" data-onlyfav="1">⭐ ${t("favorites")} (${S.matches.filter((m) => FAVS.has(m.id)).length})</button></div>`;
  if (!list.length) return html + `<div class="empty"><b>${S.onlyFavs ? "⭐" : "🔍"}</b>${S.onlyFavs ? t("noFavs") : t("noGamesFilter")}</div>`;
  let lastDay = null;
  for (const m of list) {
    const k = dayKey(m.kickoff);
    if (k !== lastDay) {
      const n = list.filter((x) => dayKey(x.kickoff) === k).length;
      html += `<div class="group-h"><span>${fmtDay(m.kickoff)}</span><span>${t("games_n", { n })}</span></div>`;
      lastDay = k;
    }
    html += matchCard(m);
  }
  return html;
}

function emptyState() {
  return `<div class="empty"><b>⚽</b>${t("emptyGames")}<br><small>${t("emptyGamesSub")}</small></div>`;
}

/* ------------------------------------------------------------ Ergebnisse */
const okBadge = (ok, text) => ok == null ? "" : `<span class="rb ${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${text}</span>`;
const rate = (r) => (r && r.n ? Math.round((r.ok / r.n) * 100) + "%" : "–");

function viewResults() {
  const R = S.results;
  if (!R || !R.matches || !R.matches.length) return `<div class="empty"><b>✅</b>${t("noResults")}<br><small>${t("noResultsSub")}</small></div>`;
  S.rPeriod = S.rPeriod || "7";
  const sm = (R.summary || {})[S.rPeriod];
  let html = `<div class="chips">${[["7", t("days7")], ["30", t("days30")], ["all", t("all")]].map(([k, l]) => `<button class="chip ${S.rPeriod === k ? "on" : ""}" data-rper="${k}">${l}</button>`).join("")}</div>`;
  if (sm) {
    const v = sm.value2 && sm.value2.n ? sm.value2 : sm.value;
    html += `<div class="grid3">
      <div class="stat"><small>${t("tip1x2")}</small><b>${rate(sm.x12)}</b><i>${t("correct", { a: sm.x12.ok, b: sm.x12.n })}</i></div>
      <div class="stat"><small>${t("ou25")}</small><b>${rate(sm.goals)}</b><i>${sm.goals.ok}/${sm.goals.n}</i></div>
      <div class="stat"><small>${t("btts")}</small><b>${rate(sm.btts)}</b><i>${sm.btts.ok}/${sm.btts.n}</i></div></div>`;
    if (v && v.n) html += `<div class="card row-between" style="margin-top:6px"><span>💎 ${t("valueTips")}${v === sm.value2 ? " " + t("odds2") : ""}<br><small>${t("wonOf", { a: v.won, b: v.n })}</small></span><b class="${v.profit >= 0 ? "src-ok" : "src-bad"}" style="font-size:20px">${v.profit >= 0 ? "+" : ""}${num(v.profit, 2)}<br><small>ROI ${num(v.roi * 100, 1)}%</small></b></div>`;
    const pk = sm.picks || {};
    if (pk.all && pk.all.n) html += `<div class="card"><div class="row-between"><span>🎯 ${t("picksStat")}</span><b class="${pk.all.ok / pk.all.n >= 0.6 ? "src-ok" : "src-bad"}" style="font-size:20px">${rate(pk.all)}</b></div><small>${["1X2", "DC", "Goals", "BTTS", "Half", "Corners", "Cards"].filter((g) => pk[g]).map((g) => `${t("g_" + g)} ${rate(pk[g])} (${pk[g].ok}/${pk[g].n})`).join(" · ")}${pk.p70 ? ` · ≥70 %: ${rate(pk.p70)}` : ""}</small></div>`;
    const bc = sm.byConf || {};
    const conf = ["hoch", "mittel", "niedrig"].filter((c) => bc[c]);
    if (conf.length) html += `<small>${t("byConf")}: ${conf.map((c) => `${trConf(c)} ${rate(bc[c])} (${bc[c].n})`).join(" · ")}</small>`;
  }
  const list = R.matches.filter((m) => vis(m.comp));
  let lastDay = null;
  for (const m of list) {
    const k = dayKey(m.kickoff);
    if (k !== lastDay) { html += `<div class="group-h"><span>${fmtDay(m.kickoff)}</span></div>`; lastDay = k; }
    html += resultCard(m);
  }
  return html;
}

function resultCard(m) {
  const c = S.comps[m.comp] || { flag: "", name: m.comp };
  const r = m.result, ev = m.eval || {};
  const tipTxt = m.tip ? trPick(m.tip.pick) : "";
  const cls = r ? (ev.x12 ? "res-ok" : "res-bad") : "";
  const score = r ? `<b class="score">${r.hg} : ${r.ag}</b>` : `<small>${t("resultPending")}</small>`;
  let badges = "";
  if (r) {
    badges += okBadge(ev.x12, tipTxt);
    if ("goals" in ev) badges += okBadge(ev.goals, trGoals(m.tip.goals));
    if ("btts" in ev) badges += okBadge(ev.btts, trBtts(m.tip.btts, true));
    for (const p of (ev.picks || []).slice(0, 6)) badges += `<span class="rb ${p.won === true ? "ok" : p.won === false ? "bad" : ""}">🎯 ${esc(t("pk_" + p.k))} ${pct(p.p)}${p.won == null ? " · " + t("pending") : ""}</span>`;
    for (const v of ev.value || []) badges += `<span class="rb ${v.profit > 0 ? "ok" : v.profit < 0 ? "bad" : ""}">💎 ${esc(trLabel(v.label))} @${odd(v.odds)} ${v.profit > 0 ? "+" : ""}${num(v.profit, 2)}</span>`;
  } else if (m.tip) {
    badges += `<span class="rb">${t("tip")}: ${esc(tipTxt)}</span><span class="rb">${esc(trGoals(m.tip.goals))}</span>`;
  }
  const p = m.p || {};
  return `<div class="card ${cls}">
    <div class="m-top"><span>${c.flag} ${esc(c.name)} · ${fmtTime(m.kickoff)}</span>${m.derby ? `<span class="badge derby">🔥 ${esc(m.derby)}</span>` : ""}</div>
    <div class="teams"><div class="team">${logo(m.homeLogo)}<span>${esc(m.home)}</span></div><div class="xg">${score}</div><div class="team r"><span>${esc(m.away)}</span>${logo(m.awayLogo)}</div></div>
    <div class="tipline"><span>${t("forecast")}: ${pct(p.H)} · ${pct(p.D)} · ${pct(p.A)}</span>${m.xg ? `<span>xG ${num(m.xg[0], 1)}:${num(m.xg[1], 1)}</span>` : ""}</div>
    <div class="rbs">${badges}</div></div>`;
}

/* ------------------------------------------------------------ Daily Picks */
function pickModeChips() {
  return `<div class="chips"><button class="chip ${S.pickMode === "daily" ? "on" : ""}" data-pmode="daily">🎯 ${t("dailyPicks")}</button><button class="chip ${S.pickMode === "kombi" ? "on" : ""}" data-pmode="kombi">🧩 ${t("kombiGen")}</button><button class="chip ${S.pickMode === "value" ? "on" : ""}" data-pmode="value">💎 ${t("value")}</button></div>`;
}

function viewPicks() {
  let html = pickModeChips();
  const days = [...new Set(S.matches.filter((m) => m.picks && m.picks.length).map((m) => dayKey(m.kickoff)))];
  if (!days.length) return html + `<div class="empty"><b>🎯</b>${t("noPicks")}</div>`;
  if (!S.pickDay || (S.pickDay !== "all" && !days.includes(S.pickDay))) S.pickDay = days[0];
  const today = dayKey(new Date()), tomorrow = dayKey(Date.now() + 864e5);
  const dl = (k) => k === today ? t("today") : k === tomorrow ? t("tomorrow")
    : dt(S.matches.find((x) => dayKey(x.kickoff) === k).kickoff).toLocaleDateString(loc(), { weekday: "short", day: "2-digit", month: "2-digit" });
  html += `<div class="chips">${days.map((k) => `<button class="chip ${S.pickDay === k ? "on" : ""}" data-pday="${k}">${dl(k)}</button>`).join("")}<button class="chip ${S.pickDay === "all" ? "on" : ""}" data-pday="all">${t("allDays")}</button></div>`;
  html += `<div class="chips">${[0.6, 0.65, 0.7, 0.75, 0.8].map((x) => `<button class="chip ${S.pickMin === x ? "on" : ""}" data-pmin="${x}">${t("minProb", { x: Math.round(x * 100) })}</button>`).join("")}</div>`;
  html += `<div class="chips">${["1X2", "DC", "Goals", "BTTS", "Half", "Corners", "Cards"].map((g) => `<button class="chip ${S.pickGroups.has(g) ? "on" : ""}" data-pgroup="${g}">${t("g_" + g)}</button>`).join("")}<button class="chip ${S.pickOne ? "on" : ""}" data-pone="1">${S.pickOne ? t("onePer") : t("allPicks")}</button></div>`;
  const rows = [];
  for (const m of S.matches) {
    if (!vis(m.comp) || !m.picks) continue;
    if (S.pickDay !== "all" && dayKey(m.kickoff) !== S.pickDay) continue;
    let ps = m.picks.filter((p) => p.p >= S.pickMin && S.pickGroups.has(p.g));
    if (S.pickOne) ps = ps.slice(0, 1);
    for (const p of ps) rows.push({ m, p });
  }
  rows.sort((a, b) => b.p.p - a.p.p);
  const sm = S.results && S.results.summary && S.results.summary.all;
  const ph = sm && sm.picks && sm.picks.all;
  html += `<div class="info-note">${t("picksExplain", { x: Math.round(S.pickMin * 100) })}${ph && ph.n ? "<br><b>" + t("picksHit", { r: rate(ph), a: ph.ok, b: ph.n }) + "</b>" : ""}</div>`;
  if (S.pickGroups.has("Corners")) html += `<div class="note">${t("cornersWeak")}</div>`;
  if (S.pickGroups.has("Cards")) html += `<div class="note">${t("cardsNote")}</div>`;
  if (!rows.length) return html + `<div class="empty"><b>🎯</b>${t("noPicks")}</div>`;
  for (const { m, p } of rows) {
    const c = S.comps[m.comp] || { flag: "" };
    const val = p.odds && p.odds * p.p > 1;
    html += `<div class="card match" data-match="${esc(m.id)}"><div class="vrow">
      <div><b>${esc(t("pk_" + p.k))}</b><div class="sub">${c.flag} ${esc(m.home)} – ${esc(m.away)}</div>
      <div class="sub">${S.pickDay === "all" ? fmtDay(m.kickoff) + ", " : ""}${fmtTime(m.kickoff)}${m.derby ? " · 🔥 " + esc(m.derby) : ""}</div></div>
      <div class="edge ${p.p >= 0.75 ? "" : "mid"}">${pct(p.p)}</div>
      <div class="sub">${t("fairOdds")} <b>${odd(p.fair)}</b></div>
      <div class="sub" style="text-align:right">${p.odds ? `${t("odds")} <b>${odd(p.odds)}</b>${val ? " 💎" : ""}` : ""} <button class="addbtn" data-add="${esc(m.id)}|${p.k}">＋</button></div>
    </div></div>`;
  }
  return html + `<p class="info-note">${t("noModelSafe")}</p>`;
}

/* ------------------------------------------------------------ Value */
function valueKey(label) {
  const map = { "Heimsieg": "H", "Unentschieden": "D", "Auswärtssieg": "A", "Über 2,5": "O25", "Unter 2,5": "U25",
    "Beide treffen: Ja": "BTTSY", "Beide treffen: Nein": "BTTSN" };
  if (map[label]) return map[label];
  const mm = label.match(/^AH (Heim|Gast) (.+)$/);
  if (mm) { const l = parseFloat(mm[2].replace(",", ".")); return mm[1] === "Heim" ? `AH:H:${l}` : `AH:A:${-l}`; }
  return null;
}

function viewValue() {
  const rows = [];
  for (const m of S.matches) {
    if (!vis(m.comp)) continue;
    for (const v of m.value || []) if (v.isValue && v.odds >= S.minOdds && S.markets.has(v.market)) rows.push({ m, v });
  }
  rows.sort((a, b) => b.v.edge - a.v.edge);
  let html = `<div class="info-note">${esc(t("valueExplain"))}</div>`;
  html += `<div class="chips">${[1.5, 1.8, 2.0, 2.5, 3.0].map((o) => `<button class="chip ${S.minOdds === o ? "on" : ""}" data-minodds="${o}">${t("oddsMin", { x: num(o, 1) })}</button>`).join("")}</div>`;
  html += `<div class="chips">${["1X2", "O/U", "BTTS", "AH"].map((k) => `<button class="chip ${S.markets.has(k) ? "on" : ""}" data-market="${k}">${k === "AH" ? t("asianHandicap") : k}</button>`).join("")}</div>`;
  html += leagueChips();
  if (!rows.length) return html + `<div class="empty"><b>💎</b>${t("noValue")}<br><small>${t("noValueSub")}</small></div>`;
  for (const { m, v } of rows) {
    const c = S.comps[m.comp] || { flag: "" };
    html += `<div class="card match" data-match="${esc(m.id)}"><div class="vrow">
      <div><b>${esc(trLabel(v.label))}</b><div class="sub">${c.flag} ${esc(m.home)} – ${esc(m.away)}</div>
      <div class="sub">${fmtDay(m.kickoff)}, ${fmtTime(m.kickoff)}${m.derby ? " · 🔥 Derby" : ""}</div></div>
      <div class="edge">+${num(v.edge * 100, 1)}%</div>
      <div class="sub">${t("prob")} <b>${pct(v.p, 1)}</b> · ${t("fairOdds")} ${odd(v.fair)}</div>
      <div class="sub" style="text-align:right">${t("odds")} <b>${odd(v.odds)}</b>${v.maxOdds ? ` (${t("max")} ${odd(v.maxOdds)})` : ""}${valueKey(v.label) ? ` <button class="addbtn" data-add="${esc(m.id)}|${valueKey(v.label)}">＋</button>` : ""}</div>
    </div></div>`;
  }
  return html + `<p class="info-note">${t("noModelSafe")}</p>`;
}

/* ------------------------------------------------------------ Tabellen */
const tr = (k, v) => window.t(k, v);
function viewTables() {
  const T = S.tables && S.tables.tables;
  if (!T || !Object.keys(T).length) return `<div class="empty"><b>📊</b>${tr("noTables")}</div>`;
  const keys = Object.keys(T);
  if (!S.tableComp || !T[S.tableComp]) S.tableComp = keys[0];
  const t = T[S.tableComp];
  let html = `<select data-tsel style="margin:4px 0 8px">${keys.map((k) => `<option value="${k}" ${k === S.tableComp ? "selected" : ""}>${S.comps[k].flag} ${esc(S.comps[k].name)} (${esc(country(S.comps[k].country || ""))})</option>`).join("")}</select>`;
  html += `<div class="chips"><button class="chip ${S.tableMode === "table" ? "on" : ""}" data-tmode="table">${tr("table")} ${esc(t.season)}</button><button class="chip ${S.tableMode === "home" ? "on" : ""}" data-tmode="home">${tr("homeAway")}</button><button class="chip ${S.tableMode === "power" ? "on" : ""}" data-tmode="power">${tr("power")}</button><button class="chip ${S.tableMode === "sim" ? "on" : ""}" data-tmode="sim">🎲 ${tr("simMode")}</button></div>`;
  if (S.tableMode === "sim") {
    const sim = (S.tables.sims || {})[S.tableComp];
    if (!sim) return html + `<div class="empty"><b>🎲</b>${tr("noSim")}</div>`;
    const pc = (x) => (x >= 0.995 ? "✓" : x < 0.005 ? "–" : Math.round(x * 100) + "%");
    html += `<h3>${tr("simTitle")}</h3><div class="card tbl-wrap"><table><tr><th style="text-align:left">Team</th><th>${tr("expPts")}</th><th>${tr("avgPos")}</th><th>${tr("champ")}</th><th>${tr("top4")}</th><th>${tr("relL")}</th></tr>${sim.teams
      .map((r) => `<tr><td>${esc(r.team)}</td><td><b>${num(r.pts, 0)}</b></td><td>${num(r.pos, 1)}</td><td class="${r.p1 > 0.2 ? "edge-pos" : ""}">${pc(r.p1)}</td><td>${pc(r.top4)}</td><td style="${r.rel > 0.3 ? "color:var(--bad);font-weight:700" : ""}">${pc(r.rel)}</td></tr>`).join("")}</table></div>
      <p class="info-note">${tr("simNote", { n: sim.n.toLocaleString(loc()), r: sim.left })}</p>`;
    return html;
  }
  if (S.tableMode === "power") {
    const R = (S.tables.ratings || {})[S.tableComp] || [];
    html += `<div class="card tbl-wrap"><table><tr><th>#</th><th>Team</th><th>${tr("goalsPerGame")}</th><th>${tr("conceded")}</th><th>${tr("homePlus")}</th></tr>${R.map((r, i) =>
      `<tr><td>${i + 1}</td><td style="text-align:left">${esc(r.team)}</td><td>${num(r.xgf, 2)}</td><td>${num(r.xga, 2)}</td><td>${r.home >= 0 ? "+" : ""}${(r.home * 100).toFixed(0)}%</td></tr>`).join("")}</table></div>
      <p class="info-note">${tr("powerNote")}</p>`;
    return html;
  }
  if (S.tableMode === "home") {
    const rows = [...t.rows];
    html += `<div class="card tbl-wrap"><table><tr><th>Team</th><th>${tr("homeP")}</th><th>${tr("pts")}</th><th>Ø</th><th>${tr("awayP")}</th><th>${tr("pts")}</th><th>Ø</th></tr>${rows
      .sort((a, b) => b.hPts / (b.hP || 1) - a.hPts / (a.hP || 1))
      .map((r) => `<tr><td>${esc(r.team)}</td><td>${r.hP}</td><td>${r.hPts}</td><td>${num(r.hPts / (r.hP || 1), 2)}</td><td>${r.aP}</td><td>${r.aPts}</td><td>${num(r.aPts / (r.aP || 1), 2)}</td></tr>`).join("")}</table></div>`;
    return html;
  }
  const promoted = new Set(t.promoted || []);
  html += `<div class="card tbl-wrap"><table><tr><th>#</th><th style="text-align:left">Team</th><th>${tr("pl")}</th><th>${tr("gd")}</th><th>${tr("pts")}</th><th>${tr("form")}</th></tr>${t.rows
    .map((r) => `<tr><td>${r.pos}</td><td style="text-align:left">${esc(r.team)}${promoted.has(r.team) ? " <small>↑</small>" : ""}</td><td>${r.P}</td><td>${r.GF - r.GA > 0 ? "+" : ""}${r.GF - r.GA}</td><td><b>${r.Pts}</b></td><td><span class="pills" style="justify-content:flex-end">${r.form.map((f) => `<span class="pill ${f}" style="width:16px;height:16px;font-size:9px">${trForm(f)}</span>`).join("")}</span></td></tr>`)
    .join("")}</table></div>`;
  if (t.avg && t.avg.goals) html += `<div class="grid3"><div class="stat"><small>${tr("avgGoals")}</small><b>${num(t.avg.goals, 2)}</b></div><div class="stat"><small>${tr("homeWins")}</small><b>${t.avg.homeWin}%</b></div><div class="stat"><small>${tr("draws")}</small><b>${t.avg.draw}%</b></div><div class="stat"><small>${tr("awayWins")}</small><b>${t.avg.awayWin}%</b></div><div class="stat"><small>${tr("over25")}</small><b>${t.avg.o25}%</b></div><div class="stat"><small>${tr("btts")}</small><b>${t.avg.btts}%</b></div></div><small>${tr("leagueAvg")}</small>`;
  return html;
}

/* ------------------------------------------------------------ Info */
function viewInfo() {
  const st = S.status;
  const theme = document.documentElement.dataset.theme || "dark";
  let html = `<h3>${t("theme")}</h3><div class="chips"><button class="chip ${theme === "dark" ? "on" : ""}" data-theme-set="dark">${t("dark")}</button><button class="chip ${theme === "light" ? "on" : ""}" data-theme-set="light">${t("light")}</button></div>`;
  html += `<h3>${t("language")}</h3><div class="chips">${Object.entries(LANGS).map(([k, l]) => `<button class="chip ${LANG === k ? "on" : ""}" data-lang="${k}">${l.flag} ${l.name}</button>`).join("")}</div>`;
  html += `<h3>${t("dataState")}</h3><div class="card">`;
  html += `<div class="row-between"><span>${t("predsComputed")}</span><b>${S.generated ? fmtShort(S.generated) + " " + fmtTime(S.generated) : "–"}</b></div>`;
  if (S.lineupsUpdated) html += `<div class="row-between"><span>${t("lineups")}</span><b>${fmtTime(S.lineupsUpdated)}</b></div>`;
  html += `<div class="row-between"><span>${t("games")}</span><b>${S.matches.length}</b></div></div>`;
  if (st) {
    const src = st.sources || {};
    html += `<h3>${t("sources")}</h3><div class="card">`;
    const af = src["API-Football"] || {};
    html += `<div class="row-between"><span>API-Football</span><b class="${af.key ? "src-ok" : "src-bad"}">${af.key ? "✓ " + t("calls", { a: af.calls, b: af.remaining ?? "?" }) : t("noKey")}</b></div>`;
    html += `<div class="row-between"><span>football-data.org</span><b class="${src["football-data.org"]?.key ? "src-ok" : "src-bad"}">${src["football-data.org"]?.key ? "✓" : t("noKey")}</b></div>`;
    html += `<div class="row-between"><span>ClubElo</span><b class="${src.ClubElo?.clubs ? "src-ok" : "src-bad"}">${src.ClubElo?.clubs ? "✓ " + t("clubs", { n: src.ClubElo.clubs }) : t("unreachable")}</b></div>`;
    html += `<div class="row-between"><span>${t("history")}</span><b>${t("games_n", { n: src.Historie?.matches ?? 0 })}</b></div><small>${esc(src.Historie?.seasons || "")}</small>`;
    if (af.errors && af.errors.length) html += `<div class="note">${t("apiSays")}: ${esc(af.errors[0])}</div>`;
    html += `</div>`;
    if (st.unmatched && st.unmatched.length) html += `<h3>${t("unmatched")}</h3><div class="card"><small>${t("unmatchedSub")} <code>pipeline/aliases.json</code></small><p>${st.unmatched.map(esc).join(", ")}</p></div>`;
    html += `<h3>${t("log")}</h3><div class="card" style="font-size:12px;color:var(--muted);max-height:220px;overflow:auto">${(st.log || []).map(esc).join("<br>")}</div>`;
  }
  html += `<h3>${t("howTitle")}</h3><div class="card" style="font-size:14px">${[1, 2, 3, 4, 5, 6].map((i) => `<p>${t("how" + i)}</p>`).join("")}</div>
  <p class="info-note">${t("disclaimer")} <a href="https://www.stopspillet.dk" target="_blank" rel="noopener">stopspillet.dk</a></p>`;
  return html;
}

/* ------------------------------------------------------------ Detail */
let detailTab = "pred";

function openMatch(id) {
  const m = S.matches.find((x) => x.id === id);
  if (!m) return;
  detailTab = "pred";
  S.sheet = "match";
  renderDetail(m);
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState({ sheet: 1 }, "");
}

function closeSheet(fromPop) {
  $("#sheet").hidden = true;
  updateFab();
  document.body.style.overflow = "";
  if (!fromPop && history.state && history.state.sheet) history.back();
}

function renderDetail(m) {
  const c = S.comps[m.comp] || { flag: "", name: m.comp };
  const T = m.teams || {};
  const posH = T.home && T.home.pos ? `${t("place", { n: T.home.pos })}` : T.home && T.home.league ? esc(T.home.league) : "";
  const posA = T.away && T.away.pos ? `${t("place", { n: T.away.pos })}` : T.away && T.away.league ? esc(T.away.league) : "";
  const tabs = ["pred", "form", "h2h", "stats", "half", "corners", "cards", "lineup"].map((k) => [k, t("d_" + k)]);
  let html = `<div class="d-head"><small>${c.flag} ${esc(c.name)}${m.round ? " · " + esc(m.round) : ""}</small>
    ${m.derby ? `<div style="margin-top:6px"><span class="badge derby">🔥 ${esc(m.derby)}</span></div>` : ""}
    <div class="vs"><div class="t" data-team="home">${logo(m.homeLogo)}<u>${esc(m.home)}</u><small>${posH}</small></div>
      <div class="mid">${fmtDay(m.kickoff)}<b>${fmtTime(m.kickoff)}</b>${m.venue ? esc(m.venue) : ""}</div>
      <div class="t" data-team="away">${logo(m.awayLogo)}<u>${esc(m.away)}</u><small>${posA}</small></div></div></div>
    <div class="subtabs"><div class="chips">${tabs.map(([k, l]) => `<button class="chip ${detailTab === k ? "on" : ""}" data-dtab="${k}">${l}</button>`).join("")}</div></div>
    <div id="dbody">${detailBody(m)}</div>`;
  const box = $("#sheet-content");
  box.innerHTML = html;
  box.querySelectorAll("[data-dtab]").forEach((b) => b.onclick = () => { detailTab = b.dataset.dtab; renderDetail(m); });
  bindAdds(box);
  box.querySelectorAll("[data-team]").forEach((el) => el.onclick = () => { if (m.teams && m.teams[el.dataset.team]) openTeam(m, el.dataset.team); });
  const ca = box.querySelector("[data-cadd]");
  if (ca) ca.onclick = () => {
    const txt = box.querySelector("[data-ctext]").value.trim();
    const od = pnum(box.querySelector("[data-codd]").value);
    if (!txt) { box.querySelector("[data-ctext]").focus(); return; }
    SLIP.legs.push({ id: m.id, key: "CUSTOM", label: txt, comp: m.comp, kickoff: m.kickoff, home: m.home, away: m.away,
      p: null, fair: null, odds: od && od >= 1 ? od : 1.5 });
    saveSlip(); updateFab(); toast(t("added"));
    box.querySelector("[data-ctext]").value = ""; box.querySelector("[data-codd]").value = "";
  };
}

function detailBody(m) {
  if (detailTab === "pred") return dPred(m);
  if (detailTab === "form") return dForm(m);
  if (detailTab === "h2h") return dH2H(m);
  if (detailTab === "stats") return dStats(m);
  if (detailTab === "corners") return dCorners(m);
  if (detailTab === "half") return dHalf(m);
  if (detailTab === "cards") return dCards(m);
  return dLineup(m);
}

function mv(m, k) {
  const now = m.odds && m.odds[k], open = m.oddsOpen && m.oddsOpen[k];
  if (!now || !open || Math.abs(now - open) < 0.03) return "";
  const up = now > open;
  return `<span class="mv ${up ? "up" : "dn"}" title="${esc(t("oddsMove"))}: ${odd(open)} → ${odd(now)}">${up ? "▲" : "▼"}</span>`;
}

function oddsCell(o) { return o ? odd(o) : "–"; }
function edgeCell(p, o) {
  if (!o || !p) return "<td>–</td>";
  const e = p * o - 1;
  return `<td class="${e > 0 ? "edge-pos" : "edge-neg"}">${e > 0 ? "+" : ""}${num(e * 100, 1)}%</td>`;
}

function quickAdd(m) {
  const keys = [["H", "1"], ["D", "X"], ["A", "2"], ["1X", "1X"], ["X2", "X2"], ["O25", t("over") + " 2,5"], ["U25", t("under") + " 2,5"], ["BTTSY", "BTTS ✓"], ["BTTSN", "BTTS ✗"]];
  const avail = m.p ? keys : keys.slice(0, 3);
  return `<h3>🧾 ${t("quickAdd")}</h3><div class="qgrid">${avail.map(([k, l]) => {
    const info = selInfo(m, k); const od = info.odds || info.fair;
    return `<button class="qb" data-add="${esc(m.id)}|${k}"><b>${esc(l)}</b>${od ? `<span>${odd(od)}</span>` : ""}<i>＋</i></button>`;
  }).join("")}</div>
  <div class="card" style="margin-top:8px"><small>${t("customTip")}</small>
    <div style="display:flex;gap:6px;margin-top:6px"><input class="txtin" data-ctext placeholder="${esc(t("customPh"))}"><input class="oddin" data-codd inputmode="decimal" placeholder="1,85"></div>
    <button class="btn small" style="margin-top:8px" data-cadd="${esc(m.id)}">${t("addCustom")}</button><br><small>${t("customNote")}</small></div>`;
}

function dPred(m) {
  if (!m.p) return quickAdd(m) + `<div class="empty"><b>🤷</b>${t("tooLittle")}</div>`;
  const p = m.p, o = m.odds || {};
  let h = (m.notes || []).map((n) => `<div class="note">${esc(trNote(n))}</div>`).join("");
  h += quickAdd(m);
  h += `<div class="info-note">🧾 ${t("tapHint")}</div>`;
  h += `<div class="bar"><div class="h" style="flex:${p["1X2"].H}">1 · ${pct(p["1X2"].H)}</div><div class="d" style="flex:${p["1X2"].D}">X · ${pct(p["1X2"].D)}</div><div class="a" style="flex:${p["1X2"].A}">2 · ${pct(p["1X2"].A)}</div></div>`;
  h += `<div class="grid3" style="margin-top:8px"><div class="stat"><small>xG ${esc(m.home)}</small><b>${num(m.xg[0], 2)}</b></div><div class="stat"><small>${t("tip")}</small><b class="conf-${m.tip.conf}" style="font-size:15px">${esc(trPick(m.tip.pick))}</b><i>${t("confidence", { x: trConf(m.tip.conf) })}</i></div><div class="stat"><small>xG ${esc(m.away)}</small><b>${num(m.xg[1], 2)}</b></div></div>`;

  const val = (m.value || []).filter((v) => v.isValue);
  if (val.length) {
    h += `<h3>💎 Value</h3>`;
    h += val.map((v) => `<div class="card vrow"><div><b>${esc(trLabel(v.label))}</b><div class="sub">${t("prob")} ${pct(v.p, 1)} · ${t("fairOdds")} ${odd(v.fair)}</div></div><div class="edge">+${num(v.edge * 100, 1)}%<div class="sub">@ ${odd(v.odds)}</div></div></div>`).join("");
  }

  h += `<h3>${t("x12dc")}</h3><div class="card"><table><tr><th>${t("tip")}</th><th>${t("prob")}</th><th>${t("fairQ")}</th><th>${t("market")}</th><th>${t("edge")}</th></tr>
    <tr><td>${t("home1")}</td><td data-add="${m.id}|H">${pct(p["1X2"].H, 1)}</td><td>${fair(p["1X2"].H)}</td><td>${oddsCell(o.H)}${mv(m, "H")}</td>${edgeCell(p["1X2"].H, o.H)}</tr>
    <tr><td>${t("drawX")}</td><td data-add="${m.id}|D">${pct(p["1X2"].D, 1)}</td><td>${fair(p["1X2"].D)}</td><td>${oddsCell(o.D)}${mv(m, "D")}</td>${edgeCell(p["1X2"].D, o.D)}</tr>
    <tr><td>${t("away2")}</td><td data-add="${m.id}|A">${pct(p["1X2"].A, 1)}</td><td>${fair(p["1X2"].A)}</td><td>${oddsCell(o.A)}${mv(m, "A")}</td>${edgeCell(p["1X2"].A, o.A)}</tr>
    <tr><td>1X</td><td data-add="${m.id}|1X">${pct(p.DC["1X"], 1)}</td><td>${fair(p.DC["1X"])}</td><td></td><td></td></tr>
    <tr><td>X2</td><td data-add="${m.id}|X2">${pct(p.DC.X2, 1)}</td><td>${fair(p.DC.X2)}</td><td></td><td></td></tr>
    <tr><td>12</td><td data-add="${m.id}|12">${pct(p.DC["12"], 1)}</td><td>${fair(p.DC["12"])}</td><td></td><td></td></tr></table></div>`;

  h += `<h3>${t("overUnder")}</h3><div class="card"><table><tr><th>${t("line")}</th><th>${t("over")}</th><th>${t("fairQ")}</th><th>${t("under")}</th><th>${t("fairQ")}</th></tr>${Object.entries(p.OU)
    .map(([l, v]) => `<tr class="${l === "2.5" ? "hl" : ""}"><td>${num(l, 1)}</td><td data-add="${m.id}|O${l.replace(".", "")}">${pct(v.O)}</td><td>${fair(v.O)}</td><td data-add="${m.id}|U${l.replace(".", "")}">${pct(v.U)}</td><td>${fair(v.U)}</td></tr>`).join("")}</table>
    ${o.O25 ? `<small>${t("marketOU", { a: odd(o.O25), b: odd(o.U25) })}</small>` : ""}</div>`;

  h += `<h3>${t("btts")}</h3><div class="grid2"><div class="stat" data-add="${m.id}|BTTSY"><small>${t("yes")}</small><b>${pct(p.BTTS.Y)}</b><i>${t("fairShort")} ${fair(p.BTTS.Y)}${o.BTTSY ? " · " + t("market") + " " + odd(o.BTTSY) : ""}</i></div><div class="stat" data-add="${m.id}|BTTSN"><small>${t("no")}</small><b>${pct(p.BTTS.N)}</b><i>${t("fairShort")} ${fair(p.BTTS.N)}${o.BTTSN ? " · " + t("market") + " " + odd(o.BTTSN) : ""}</i></div></div>`;

  const ahMarket = o.AH ? o.AH.line : null;
  const ah = (p.AH || []).filter((a) => Math.abs(a.line) <= 1.75 || a.line === ahMarket);
  h += `<h3>${t("ahHome")}</h3><div class="card"><table><tr><th>${t("line")}</th><th>${t("homeFair")}</th><th>${t("awayFair")}</th></tr>${ah
    .map((a) => `<tr class="${a.line === ahMarket ? "hl" : ""}"><td>${ahFmt(a.line)}</td><td data-add="${m.id}|AH:H:${a.line}">${odd(a.home)}</td><td data-add="${m.id}|AH:A:${a.line}">${odd(a.away)}</td></tr>`).join("")}</table>
    ${o.AH ? `<small>${t("ahMarket", { l: ahFmt(o.AH.line), a: odd(o.AH.home), b: odd(o.AH.away) })}</small>` : ""}</div>`;

  h += `<h3>${t("likelyScores")}</h3><div class="grid3">${p.CS.slice(0, 6).map(([s, v]) => `<div class="stat"><b>${s.replace("-", ":")}</b><i>${pct(v, 1)}</i></div>`).join("")}</div>`;
  h += `<h3>${t("numGoals")}</h3><div class="grid3">${Object.entries(p.TG).map(([k, v]) => `<div class="stat"><small>${t("goalsN", { k })}</small><b>${pct(v)}</b></div>`).join("")}</div>`;
  if (m.elo) h += `<h3>ClubElo</h3><div class="grid2"><div class="stat"><small>${esc(m.home)}</small><b>${m.elo.home}</b></div><div class="stat"><small>${esc(m.away)}</small><b>${m.elo.away}</b></div></div>`;
  h += `<p class="info-note">${t("model")}: ${esc(m.model || "")} · ${t("sourcesL")}: ${esc((m.src || []).join(", "))}</p>`;
  return h;
}

function formList(items, title) {
  if (!items || !items.length) return "";
  return `<h3>${title}</h3><div class="card">${items.map((i) => `<div class="formrow"><span class="pill ${i.r}">${trForm(i.r)}</span><small>${fmtShort(i.d)}</small><span class="opp">${i.v === "H" ? "vs" : "@"} ${esc(i.opp)}</span><span class="sc">${i.gf}:${i.ga}</span></div>`).join("")}</div>`;
}

function formStats(name, f) {
  if (!f) return "";
  return `<div class="card"><b>${esc(name)}</b> <small>· ${t("lastN", { n: f.n })}</small>
    <div class="grid3" style="margin-top:8px"><div class="stat"><small>${t("ppg")}</small><b>${num(f.ppg, 2)}</b><i>${t("wdl", { w: f.w, d: f.d, l: f.l })}</i></div>
    <div class="stat"><small>${t("goals")}</small><b>${f.gf}:${f.ga}</b></div><div class="stat"><small>${t("cleanSheets")}</small><b>${f.cs}</b></div>
    <div class="stat"><small>${t("over25")}</small><b>${f.o25}/${f.n}</b></div><div class="stat"><small>${t("btts")}</small><b>${f.btts}/${f.n}</b></div><div class="stat"><small>${t("wins")}</small><b>${Math.round((f.w / f.n) * 100)}%</b></div></div></div>`;
}

function dForm(m) {
  const T = m.teams;
  if (!T) return `<div class="empty">${t("noForm")}</div>`;
  let h = "";
  h += `<div class="card"><div class="row-between"><b>${esc(m.home)}</b><span class="pills">${(T.home.form || []).map((i) => `<span class="pill ${i.r}">${trForm(i.r)}</span>`).join("")}</span></div>
        <div class="row-between" style="margin-top:8px"><b>${esc(m.away)}</b><span class="pills">${(T.away.form || []).map((i) => `<span class="pill ${i.r}">${trForm(i.r)}</span>`).join("")}</span></div></div>`;
  h += formStats(m.home, T.home.formSum) + formStats(m.away, T.away.formSum);
  h += formList(T.home.homeForm, t("lastHome", { t: esc(m.home) }));
  h += formList(T.away.awayForm, t("lastAway", { t: esc(m.away) }));
  h += formList(T.home.form, t("last5", { t: esc(m.home) }));
  h += formList(T.away.form, t("last5", { t: esc(m.away) }));
  return h;
}

function dH2H(m) {
  const x = m.h2h;
  if (!x || !x.n) return `<div class="empty"><b>🤝</b>${t("noH2H")}</div>`;
  let h = `<div class="bar"><div class="h" style="flex:${x.w1 || 0.3}">${x.w1}</div><div class="d" style="flex:${x.d || 0.3}">${x.d}</div><div class="a" style="flex:${x.w2 || 0.3}">${x.w2}</div></div>
    <div class="row-between" style="font-size:12px;color:var(--muted);margin-top:4px"><span>${t("winsOf", { t: esc(m.home) })}</span><span>${t("draw")}</span><span>${t("winsOf", { t: esc(m.away) })}</span></div>`;
  h += `<div class="grid3" style="margin-top:10px"><div class="stat"><small>${t("gamesL")}</small><b>${x.n}</b></div><div class="stat"><small>${t("avgGoals")}</small><b>${num(x.avgGoals, 2)}</b></div><div class="stat"><small>${t("over25")}</small><b>${x.o25}%</b></div></div>`;
  h += `<h3>${t("lastMeetings")}</h3><div class="card">${x.games.map((g) => `<div class="formrow"><small>${fmtShort(g.d)}</small><span class="opp">${esc(g.h)} – ${esc(g.a)}</span><span class="sc">${g.hg}:${g.ag}</span></div>`).join("")}</div>`;
  return h;
}

function recCard(title, r) {
  if (!r) return "";
  return `<div class="stat" style="text-align:left"><small>${title}</small><b>${r.W}-${r.D}-${r.L}</b><i>${t("recLine", { gf: r.GF, ga: r.GA, w: r.winPct, o: r.o25Pct, b: r.bttsPct })}</i></div>`;
}

function dStats(m) {
  const T = m.teams;
  if (!T) return `<div class="empty">${t("noStats")}</div>`;
  let h = `<h3>${t("thisSeason")}</h3><div class="grid2">${recCard(t("atHome", { t: esc(m.home) }), T.home.homeRec)}${recCard(t("awayL", { t: esc(m.away) }), T.away.awayRec)}</div>`;
  h += `<h3>${t("last5y")}</h3><div class="grid2">${recCard(t("atHome", { t: esc(m.home) }), T.home.homeRec5y)}${recCard(t("awayL", { t: esc(m.away) }), T.away.awayRec5y)}</div>`;
  for (const [side, name] of [["home", m.home], ["away", m.away]]) {
    const s = T[side].seasons || [];
    if (!s.length) continue;
    h += `<h3>${t("seasons", { t: esc(name) })}</h3><div class="card tbl-wrap"><table><tr><th>${t("season")}</th><th>${t("pl")}</th><th>${t("wdlH")}</th><th>${t("goals")}</th><th>${t("pts")}</th><th>${t("homeW")}</th><th>${t("awayW")}</th></tr>${s
      .map((x) => `<tr><td>${x.season}</td><td>${x.total.P}</td><td>${x.total.W}-${x.total.D}-${x.total.L}</td><td>${x.total.GF}:${x.total.GA}</td><td><b>${x.total.Pts}</b></td><td>${x.home ? x.home.W + "/" + x.home.P : "–"}</td><td>${x.away ? x.away.W + "/" + x.away.P : "–"}</td></tr>`).join("")}</table></div>`;
  }
  if (T.home.rating && T.away.rating) {
    h += `<h3>${t("modelVals")}</h3><div class="grid2"><div class="stat"><small>${esc(m.home)}</small><i>${t("attack")} ${sgn(T.home.rating.att)}${num(T.home.rating.att * 100, 0)}% · ${t("defence")} ${sgn(T.home.rating.def)}${num(T.home.rating.def * 100, 0)}% ${t("concededL")}</i></div><div class="stat"><small>${esc(m.away)}</small><i>${t("attack")} ${sgn(T.away.rating.att)}${num(T.away.rating.att * 100, 0)}% · ${t("defence")} ${sgn(T.away.rating.def)}${num(T.away.rating.def * 100, 0)}% ${t("concededL")}</i></div></div>`;
  }
  return h;
}

function cornerRec(title, r) {
  if (!r) return "";
  return `<div class="stat" style="text-align:left"><small>${title} · ${t("games_s", { n: r.n })}</small><b>${num(r.for, 1)} : ${num(r.against, 1)}</b><i>${t("cornersTotal")} Ø ${num(r.total, 1)} · ${t("o95share")} ${r.o95}%</i></div>`;
}

function dCorners(m) {
  const c = m.corners, T = m.teams || {};
  const ch = T.home && T.home.corners, ca = T.away && T.away.corners;
  if (!c && !ch && !ca) return `<div class="empty"><b>🚩</b>${t("noCorners")}</div>`;
  let h = "";
  if (c) {
    h += `<div class="grid3"><div class="stat"><small>${esc(m.home)}</small><b>${num(c.exp[0], 1)}</b></div><div class="stat"><small>${t("expCorners")}</small><b>${num(c.total, 1)}</b></div><div class="stat"><small>${esc(m.away)}</small><b>${num(c.exp[1], 1)}</b></div></div>`;
    h += `<h3>${t("moreCorners")}</h3><div class="bar"><div class="h" style="flex:${c.more.H}">${pct(c.more.H)}</div><div class="d" style="flex:${c.more.E}">${pct(c.more.E)}</div><div class="a" style="flex:${c.more.A}">${pct(c.more.A)}</div></div>
      <div class="row-between" style="font-size:12px;color:var(--muted);margin-top:4px"><span>${esc(m.home)}</span><span>${t("equal")}</span><span>${esc(m.away)}</span></div>`;
    h += `<h3>${t("cornersOU")}</h3><div class="card"><table><tr><th>${t("line")}</th><th>${t("over")}</th><th>${t("fairQ")}</th><th>${t("under")}</th><th>${t("fairQ")}</th></tr>${Object.entries(c.OU)
      .map(([l, v]) => `<tr class="${l === "9.5" ? "hl" : ""}"><td>${num(l, 1)}</td><td data-add="${m.id}|CO${l.replace(".", "")}">${pct(v.O)}</td><td>${fair(v.O)}</td><td data-add="${m.id}|CU${l.replace(".", "")}">${pct(v.U)}</td><td>${fair(v.U)}</td></tr>`).join("")}</table></div>`;
    h += `<div class="note">${t("cornersWeak")}</div>`;
  }
  h += `<h3>${t("cornersFor")} : ${t("cornersAgainst")} · ${t("thisSeason")}</h3><div class="grid2">${cornerRec(t("cornersHomeT", { t: esc(m.home) }), ch && ch.season && ch.season.home)}${cornerRec(t("cornersAwayT", { t: esc(m.away) }), ca && ca.season && ca.season.away)}</div>`;
  h += `<h3>${t("cornersFor")} : ${t("cornersAgainst")} · ${t("last5y")}</h3><div class="grid2">${cornerRec(t("cornersHomeT", { t: esc(m.home) }), ch && ch.all && ch.all.home)}${cornerRec(t("cornersAwayT", { t: esc(m.away) }), ca && ca.all && ca.all.away)}</div>`;
  h += `<div class="grid2" style="margin-top:6px">${cornerRec(t("cornersAwayT", { t: esc(m.home) }), ch && ch.all && ch.all.away)}${cornerRec(t("cornersHomeT", { t: esc(m.away) }), ca && ca.all && ca.all.home)}</div>`;
  for (const [x, name] of [[ch, m.home], [ca, m.away]]) {
    if (!x || !x.last || !x.last.length) continue;
    h += `<h3>${t("lastCorners", { t: esc(name) })}</h3><div class="card">${x.last.map((i) => `<div class="formrow"><small>${fmtShort(i.d)}</small><span class="opp">${i.v === "H" ? "vs" : "@"} ${esc(i.opp)}</span><span class="sc">${i.cf}:${i.ca}</span></div>`).join("")}</div>`;
  }
  return h;
}

function dLineup(m) {
  let h = "";
  if (m.lineups && m.lineups.length) {
    for (const t of m.lineups) {
      h += `<h3>${esc(t.team)} ${t.formation ? "· " + esc(t.formation) : ""}</h3><div class="card"><div class="lineup">${t.xi.map((p) => `<div><span class="no">${p.no ?? ""}</span>${esc(p.n)} <small>${esc(p.pos || "")}</small></div>`).join("")}</div>
        ${t.coach ? `<small>${tr("coach")}: ${esc(t.coach)}</small>` : ""}${t.subs && t.subs.length ? `<p><small>${tr("bench")}: ${t.subs.map(esc).join(", ")}</small></p>` : ""}</div>`;
    }
  } else {
    h += `<div class="empty"><b>📋</b>${t("lineupsSoon")}<br><small>${t("robotChecks")}</small></div>`;
  }
  if (m.injuries && m.injuries.length) {
    h += `<h3>${t("absences")}</h3><div class="card">${m.injuries.map((i) => `<div class="formrow"><span class="opp">${esc(i.player)}</span><small>${esc(i.team)}</small><small>${esc(i.reason || i.type || "")}</small></div>`).join("")}</div>`;
  }
  return h;
}

/* ------------------------------------------------------------ Halbzeit */
function dHalf(m) {
  const H = m.ht;
  if (!H) return `<div class="empty"><b>⏱️</b>${t("tooLittle")}</div>`;
  let h = `<div class="grid3"><div class="stat"><small>${esc(m.home)}</small><b>${num(H.xg[0], 2)}</b></div><div class="stat"><small>${t("htxg")}</small><b>${num(H.xg[0] + H.xg[1], 2)}</b></div><div class="stat"><small>${esc(m.away)}</small><b>${num(H.xg[1], 2)}</b></div></div>`;
  h += `<h3>${t("ht1x2")}</h3><div class="probs">${[["HTH", "H", "1", "h"], ["HTD", "D", "X", "d"], ["HTA", "A", "2", "a"]].map(([k, x, l, c]) =>
    `<button class="pt ${c}" style="--w:${Math.round(H["1X2"][x] * 100)}%" data-add="${esc(m.id)}|${k}"><span class="k">${l}</span><span class="v">${Math.round(H["1X2"][x] * 100)}<small>%</small></span><span class="o">${fair(H["1X2"][x])}<em>+</em></span></button>`).join("")}</div>`;
  h += `<h3>${t("htOU")}</h3><div class="card"><table><tr><th>${t("line")}</th><th>${t("over")}</th><th>${t("fairQ")}</th><th>${t("under")}</th><th>${t("fairQ")}</th></tr>${Object.entries(H.OU)
    .map(([l, v]) => `<tr><td>${num(l, 1)}</td><td data-add="${esc(m.id)}|HO${l.replace(".", "")}">${pct(v.O)}</td><td>${fair(v.O)}</td><td data-add="${esc(m.id)}|HU${l.replace(".", "")}">${pct(v.U)}</td><td>${fair(v.U)}</td></tr>`).join("")}</table></div>`;
  const order = ["1/1", "X/1", "2/1", "1/X", "X/X", "2/X", "1/2", "X/2", "2/2"];
  const best = order.reduce((a, b) => (H.HTFT[b] > H.HTFT[a] ? b : a));
  h += `<h3>${t("htft")}</h3><div class="grid3">${order.map((k) => `<div class="stat" data-add="${esc(m.id)}|HTFT:${k}" style="${k === best ? "border-color:var(--home)" : ""}"><small>${k}</small><b>${pct(H.HTFT[k])}</b><i>${fair(H.HTFT[k])}</i></div>`).join("")}</div><small>${t("htftNote")}</small>`;
  h += `<h3>${t("moreGoalsHalf")}</h3><div class="bar"><div class="h" style="flex:${H.more["1"]}">${pct(H.more["1"])}</div><div class="d" style="flex:${H.more.E}">${pct(H.more.E)}</div><div class="a" style="flex:${H.more["2"]}">${pct(H.more["2"])}</div></div>
    <div class="row-between" style="font-size:12px;color:var(--muted);margin-top:4px"><span>${t("firstHalf")}</span><span>${t("equal")}</span><span>${t("secondHalf")}</span></div>`;
  return h;
}

/* ------------------------------------------------------------ Karten */
function dCards(m) {
  const c = m.cards, T = m.teams || {};
  const ch = T.home && T.home.cards, ca = T.away && T.away.cards;
  if (!c && !ch && !ca) return `<div class="empty"><b>🟨</b>${t("noCards")}</div>`;
  const rec = (title, r) => !r ? "" : `<div class="stat" style="text-align:left"><small>${title} · ${t("games_s", { n: r.n })}</small><b>${num(r.for, 1)} : ${num(r.against, 1)}</b><i>${t("cardsTotal")} Ø ${num(r.total, 1)} · ${t("o45share")} ${r.o95}%</i></div>`;
  let h = "";
  if (c) {
    h += `<div class="grid3"><div class="stat"><small>${esc(m.home)}</small><b>${num(c.exp[0], 1)}</b></div><div class="stat"><small>${t("expCards")}</small><b>${num(c.total, 1)}</b></div><div class="stat"><small>${esc(m.away)}</small><b>${num(c.exp[1], 1)}</b></div></div>`;
    h += `<h3>${t("moreCards")}</h3><div class="bar"><div class="h" style="flex:${c.more.H}">${pct(c.more.H)}</div><div class="d" style="flex:${c.more.E}">${pct(c.more.E)}</div><div class="a" style="flex:${c.more.A}">${pct(c.more.A)}</div></div>
      <div class="row-between" style="font-size:12px;color:var(--muted);margin-top:4px"><span>${esc(m.home)}</span><span>${t("equal")}</span><span>${esc(m.away)}</span></div>`;
    h += `<h3>${t("cardsOU")}</h3><div class="card"><table><tr><th>${t("line")}</th><th>${t("over")}</th><th>${t("fairQ")}</th><th>${t("under")}</th><th>${t("fairQ")}</th></tr>${Object.entries(c.OU)
      .map(([l, v]) => `<tr class="${l === "4.5" ? "hl" : ""}"><td>${num(l, 1)}</td><td data-add="${esc(m.id)}|KO${l.replace(".", "")}">${pct(v.O)}</td><td>${fair(v.O)}</td><td data-add="${esc(m.id)}|KU${l.replace(".", "")}">${pct(v.U)}</td><td>${fair(v.U)}</td></tr>`).join("")}</table></div>`;
    h += `<div class="note">${t("cardsNote")}</div>`;
  }
  h += `<h3>${t("cardsFor")} : ${t("cardsAgainst")} · ${t("thisSeason")}</h3><div class="grid2">${rec(t("cornersHomeT", { t: esc(m.home) }), ch && ch.season && ch.season.home)}${rec(t("cornersAwayT", { t: esc(m.away) }), ca && ca.season && ca.season.away)}</div>`;
  h += `<h3>${t("cardsFor")} : ${t("cardsAgainst")} · ${t("last5y")}</h3><div class="grid2">${rec(t("cornersHomeT", { t: esc(m.home) }), ch && ch.all && ch.all.home)}${rec(t("cornersAwayT", { t: esc(m.away) }), ca && ca.all && ca.all.away)}</div>`;
  for (const [x, name] of [[ch, m.home], [ca, m.away]]) {
    if (!x || !x.last || !x.last.length) continue;
    h += `<h3>${t("lastCards", { t: esc(name) })}</h3><div class="card">${x.last.map((i) => `<div class="formrow"><small>${fmtShort(i.d)}</small><span class="opp">${i.v === "H" ? "vs" : "@"} ${esc(i.opp)}</span><span class="sc">${i.cf}:${i.ca}</span></div>`).join("")}</div>`;
  }
  return h;
}

/* ------------------------------------------------------------ Team-Seite */
function formChart(items) {
  if (!items || !items.length) return "";
  const L = [...items].reverse(), w = 320, hgt = 130, bw = w / L.length, mid = 66, u = 13;
  let svg = `<svg viewBox="0 0 ${w} ${hgt}" width="100%" role="img" aria-label="${esc(t("formCurve"))}"><line x1="0" x2="${w}" y1="${mid}" y2="${mid}" stroke="var(--line)"/>`;
  L.forEach((g, i) => {
    const x = i * bw + bw * 0.2, bwi = bw * 0.6;
    const col = g.r === "S" ? "var(--home)" : g.r === "U" ? "var(--draw)" : "var(--bad)";
    svg += `<rect x="${x}" y="${mid - Math.min(g.gf, 4) * u}" width="${bwi}" height="${Math.min(g.gf, 4) * u}" rx="3" fill="var(--home)" opacity=".85"/>`;
    svg += `<rect x="${x}" y="${mid}" width="${bwi}" height="${Math.min(g.ga, 4) * u}" rx="3" fill="var(--bad)" opacity=".7"/>`;
    svg += `<circle cx="${x + bwi / 2}" cy="${hgt - 6}" r="5" fill="${col}"/>`;
  });
  return svg + `</svg><div class="row-between" style="font-size:12px;color:var(--muted)"><span>▲ ${t("goals")} · ▼ ${t("conceded")}</span><span>${fmtShort(L[0].d)} → ${fmtShort(L[L.length - 1].d)}</span></div>`;
}

function openTeam(m, side) {
  const B = m.teams[side], name = side === "home" ? m.home : m.away, key = B.name || name;
  const logoU = side === "home" ? m.homeLogo : m.awayLogo;
  const comp = m.comp in (S.tables && S.tables.tables || {}) ? m.comp : null;
  let h = `<div class="d-head"><button class="btn small" data-back>${t("back")}</button>
    <div class="t" style="margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:6px;font:700 26px/1.1 var(--display)">${logo(logoU)}${esc(name)}<small style="font:500 13px var(--body)">${[B.league ? esc(B.league) : esc((S.comps[m.comp] || {}).name || ""), B.pos ? t("place", { n: B.pos }) : ""].filter(Boolean).join(" · ")}</small></div></div>`;
  const simComp = B.league ? Object.keys(S.comps).find((k) => S.comps[k].name === B.league) : comp;
  const sim = S.tables && S.tables.sims && S.tables.sims[simComp || m.comp];
  const sr = sim && sim.teams.find((x) => x.team === key);
  if (sr) h += `<div class="grid3"><div class="stat"><small>${t("expPts")}</small><b>${num(sr.pts, 0)}</b></div><div class="stat"><small>${t("champ")}</small><b>${Math.round(sr.p1 * 100)}%</b></div><div class="stat"><small>${t("relL")}</small><b>${Math.round(sr.rel * 100)}%</b></div></div>`;
  h += `<h3>${t("formCurve")}</h3><div class="card">${formChart(B.last10 || B.form)}</div>`;
  h += formStats(name, B.formSum);
  h += `<h3>${t("thisSeason")}</h3><div class="grid2">${recCard(t("atHome", { t: "" }).trim(), B.homeRec)}${recCard(t("awayL", { t: "" }).trim(), B.awayRec)}</div>`;
  h += `<h3>${t("last5y")}</h3><div class="grid2">${recCard(t("atHome", { t: "" }).trim(), B.homeRec5y)}${recCard(t("awayL", { t: "" }).trim(), B.awayRec5y)}</div>`;
  const cs = B.corners && B.corners.all, ks = B.cards && B.cards.all;
  if (cs || ks) h += `<h3>${t("d_corners")} / ${t("d_cards")} · ${t("last5y")}</h3><div class="grid2">${cs && cs.home ? cornerRec("🚩 " + t("atHome", { t: "" }).trim(), cs.home) : ""}${cs && cs.away ? cornerRec("🚩 " + t("awayL", { t: "" }).trim(), cs.away) : ""}${ks && ks.home ? cornerRec("🟨 " + t("atHome", { t: "" }).trim(), ks.home).replace(t("o95share"), t("o45share")) : ""}${ks && ks.away ? cornerRec("🟨 " + t("awayL", { t: "" }).trim(), ks.away).replace(t("o95share"), t("o45share")) : ""}</div>`;
  const next = S.matches.filter((x) => (x.hk === key || x.ak === key || x.home === name || x.away === name) && x.id !== m.id);
  if (next.length) h += `<h3>${t("nextGames")}</h3>` + next.map(matchCard).join("");
  const past = ((S.results && S.results.matches) || []).filter((x) => x.hk === key || x.ak === key || x.home === name || x.away === name);
  if (past.length) h += `<h3>${t("pastPreds")}</h3>` + past.slice(0, 8).map(resultCard).join("");
  const box = $("#sheet-content");
  box.innerHTML = h;
  box.parentElement.scrollTop = 0;
  box.querySelector("[data-back]").onclick = () => renderDetail(m);
  box.querySelectorAll("[data-match]").forEach((el) => el.onclick = () => { const mm = S.matches.find((x) => x.id === el.dataset.match); if (mm) { detailTab = "pred"; renderDetail(mm); box.parentElement.scrollTop = 0; } });
  bindAdds(box);
}

/* ------------------------------------------------------------ Kombi-Generator */
const KTARGETS = [[1.5, 2], [2, 3], [3, 5], [5, 10], [10, 25]];

function kombiCandidates() {
  const now = Date.now(), legs = [];
  for (const m of S.matches) {
    if (!vis(m.comp) || !m.picks || dt(m.kickoff) < now) continue;
    if (S.pickDay && S.pickDay !== "all" && dayKey(m.kickoff) !== S.pickDay) continue;
    for (const p of m.picks) {
      if (p.p < S.pickMin || !S.pickGroups.has(p.g)) continue;
      const est = !p.odds;
      const o = p.odds || +(p.fair * 0.95).toFixed(2);
      if (o < 1.05) continue;
      legs.push({ m, p, o, est, eff: -Math.log(p.p) / Math.log(o) });
    }
  }
  return legs.sort((a, b) => a.eff - b.eff);
}

function buildKombis(cands, lo, hi, maxL) {
  const pool = cands.slice(0, maxL > 4 ? 22 : 30), found = [];
  const rec = (start, legs, o, p, used) => {
    if (o >= lo && o <= hi && legs.length >= 2) found.push({ legs: [...legs], o, p });
    if (legs.length >= maxL) return;
    for (let i = start; i < pool.length; i++) {
      const c = pool[i];
      if (used.has(c.m.id) || o * c.o > hi) continue;
      used.add(c.m.id); legs.push(c);
      rec(i + 1, legs, o * c.o, p * c.p.p, used);
      legs.pop(); used.delete(c.m.id);
    }
  };
  rec(0, [], 1, 1, new Set());
  found.sort((a, b) => b.p - a.p);
  const out = [], seen = new Set();
  for (const f of found) {
    const sig = f.legs.map((l) => l.m.id).sort().join();
    if (seen.has(sig)) continue;
    seen.add(sig); out.push(f);
    if (out.length >= 3) break;
  }
  return out;
}

function viewKombi() {
  let html = pickModeChips();
  S.kT = S.kT ?? 1; S.kL = S.kL ?? 4;
  const days = [...new Set(S.matches.filter((m) => m.picks && m.picks.length && dt(m.kickoff) > Date.now()).map((m) => dayKey(m.kickoff)))];
  if (!S.pickDay || (S.pickDay !== "all" && !days.includes(S.pickDay))) S.pickDay = days[0] || "all";
  const today = dayKey(new Date()), tomorrow = dayKey(Date.now() + 864e5);
  const dl = (k) => k === today ? t("today") : k === tomorrow ? t("tomorrow")
    : dt(S.matches.find((x) => dayKey(x.kickoff) === k).kickoff).toLocaleDateString(loc(), { weekday: "short", day: "2-digit", month: "2-digit" });
  html += `<div class="chips">${days.map((k) => `<button class="chip ${S.pickDay === k ? "on" : ""}" data-pday="${k}">${dl(k)}</button>`).join("")}<button class="chip ${S.pickDay === "all" ? "on" : ""}" data-pday="all">${t("allDays")}</button></div>`;
  html += `<div class="chips"><span style="align-self:center;color:var(--muted);font-size:14px">${t("targetOdds")}</span>${KTARGETS.map(([a, b], i) => `<button class="chip ${S.kT === i ? "on" : ""}" data-kt="${i}">${num(a, 1)}–${num(b, 0)}</button>`).join("")}</div>`;
  html += `<div class="chips">${[2, 3, 4, 5, 6].map((n) => `<button class="chip ${S.kL === n ? "on" : ""}" data-kl="${n}">${t("maxLegs", { n })}</button>`).join("")}</div>`;
  html += `<div class="chips">${["1X2", "DC", "Goals", "BTTS", "Half", "Corners", "Cards"].map((g) => `<button class="chip ${S.pickGroups.has(g) ? "on" : ""}" data-pgroup="${g}">${t("g_" + g)}</button>`).join("")}</div>`;
  html += `<div class="info-note">${t("kombiExplain")}</div>`;
  const [lo, hi] = KTARGETS[S.kT];
  const res = buildKombis(kombiCandidates(), lo, hi, S.kL);
  if (!res.length) return html + `<div class="empty"><b>🧩</b>${t("kombiNone")}</div>`;
  res.forEach((k, i) => {
    if (i === 1) html += `<h3>${t("alternatives")}</h3>`;
    html += `<div class="card"><div class="row-between"><b style="font:700 26px var(--display)">${odd(k.o)}</b><span>${t("kombiChance")} <b class="${k.p >= 0.4 ? "src-ok" : ""}">${pct(k.p, 1)}</b></span></div>
      ${k.legs.map((l) => { const c = S.comps[l.m.comp] || { flag: "" }; return `<div class="formrow"><span class="opp"><b>${esc(t("pk_" + l.p.k))}</b><br><small>${c.flag} ${esc(l.m.home)} – ${esc(l.m.away)} · ${fmtTime(l.m.kickoff)}</small></span><span style="text-align:right">${pct(l.p.p)}<br><small>${odd(l.o)}${l.est ? " ≈" : ""}</small></span></div>`; }).join("")}
      <button class="btn primary" style="width:100%;margin-top:10px" data-kadd="${i}">🧾 ${t("kombiAdd")}</button></div>`;
  });
  S._kombis = res;
  return html + `<p class="info-note">${t("noModelSafe")}</p>`;
}

/* ------------------------------------------------------------ Wett-Bilanz */
function keyGroup(k) {
  if (k === "CUSTOM") return "Other";
  if (["H", "D", "A"].includes(k)) return "1X2";
  if (["1X", "X2", "12"].includes(k)) return "DC";
  if (/^[OU]\d+$/.test(k)) return "Goals";
  if (k.startsWith("BTTS")) return "BTTS";
  if (/^C[OU]/.test(k)) return "Corners";
  if (/^K[OU]/.test(k)) return "Cards";
  if (k.startsWith("HTFT")) return "HTFT";
  if (/^H[OU]/.test(k) || k.startsWith("HT")) return "Half";
  if (k.startsWith("AH")) return "AH";
  return "Other";
}

function betStats(states) {
  const settled = SLIP.bets.map((b, i) => ({ b, s: states[i] })).filter((x) => x.s.st !== "open").reverse();
  if (!settled.length) return "";
  let cum = 0;
  const pts = [0, ...settled.map((x) => (cum += (x.s.payout || 0) - x.b.stake))];
  const w = 320, hgt = 120, mn = Math.min(0, ...pts), mx = Math.max(0, ...pts), rng = mx - mn || 1;
  const X = (i) => (i / Math.max(1, pts.length - 1)) * (w - 10) + 5, Y = (v) => hgt - 8 - ((v - mn) / rng) * (hgt - 16);
  const path = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  let h = `<h3>${t("profitCurve")}</h3><div class="card"><svg viewBox="0 0 ${w} ${hgt}" width="100%"><line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)" stroke-dasharray="4 4"/><path d="${path}" fill="none" stroke="${last >= 0 ? "var(--home)" : "var(--bad)"}" stroke-width="2.5" stroke-linejoin="round"/>${pts.map((v, i) => i ? `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${last >= 0 ? "var(--home)" : "var(--bad)"}"/>` : "").join("")}</svg></div>`;
  const agg = (fn) => {
    const g = {};
    for (const { b, s } of settled) {
      const k = fn(b), x = g[k] || (g[k] = { n: 0, w: 0, st: 0, ret: 0 });
      x.n++; x.st += b.stake; x.ret += s.payout || 0; if (s.st === "won" || s.st === "halfWon") x.w++;
    }
    return Object.entries(g).sort((a, b) => b[1].n - a[1].n);
  };
  const tbl = (title, rows, lab) => `<h3>${title}</h3><div class="card tbl-wrap"><table><tr><th>&nbsp;</th><th>${t("bets")}</th><th>${t("hit")}</th><th>${t("profit")}</th></tr>${rows.map(([k, x]) => {
    const pl = x.ret - x.st; return `<tr><td>${lab(k)}</td><td>${x.n}</td><td>${Math.round((x.w / x.n) * 100)}%</td><td class="${pl >= 0 ? "edge-pos" : ""}" style="${pl < 0 ? "color:var(--bad)" : ""}">${pl >= 0 ? "+" : ""}${num(pl, 2)}</td></tr>`; }).join("")}</table></div>`;
  h += tbl(t("byLeague"), agg((b) => (b.legs.length > 1 ? "_combo" : b.legs[0].comp)), (k) => k === "_combo" ? t("g_Combo") : `${(S.comps[k] || {}).flag || ""} ${esc((S.comps[k] || { name: k }).name)}`);
  h += tbl(t("byMarket"), agg((b) => (b.legs.length > 1 ? "Combo" : keyGroup(b.legs[0].key))), (k) => t("g_" + k) !== "g_" + k ? t("g_" + k) : k);
  return h;
}

/* ------------------------------------------------------------ Kupon / Meine Wetten */
const FAVS = new Set(store.get("favs", []));
const SLIP = { bankroll: store.get("bankroll", null), legs: store.get("slip", []), type: store.get("slipType", "combo"), stake: store.get("slipStake", 10), bets: store.get("bets", []), view: "slip" };
const saveSlip = () => { store.set("slip", SLIP.legs); store.set("slipType", SLIP.type); store.set("slipStake", SLIP.stake); };
const saveBets = () => store.set("bets", SLIP.bets);
const pnum = (v) => { const x = parseFloat(String(v).replace(",", ".")); return isNaN(x) ? null : x; };

function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 1600);
}

function updateFab() {
  const n = SLIP.legs.length, open = SLIP.bets.filter((b) => betState(b).st === "open").length;
  $("#couponBtn").hidden = !n && !SLIP.bets.length;
  $("#couponCount").textContent = n || open || "";
  $("#couponCount").style.display = n || open ? "" : "none";
}

/* Wahrscheinlichkeit, faire Quote, Markt-Quote und Text für einen Tipp-Schlüssel */
function selInfo(m, key) {
  const p = m.p || {}, o = m.odds || {}, c = m.corners || {};
  const lineOf = (d) => (parseInt(d, 10) / 10).toFixed(1);
  let pr = null, odds = null, lab = "", g = "";
  if (["H", "D", "A"].includes(key)) { pr = p["1X2"] && p["1X2"][key]; odds = o[key]; g = "1X2"; }
  else if (["1X", "X2", "12"].includes(key)) { pr = p.DC && p.DC[key]; g = "DC"; }
  else if (/^[OU]\d+$/.test(key)) { const l = lineOf(key.slice(1)); const v = p.OU && p.OU[l]; pr = v && v[key[0]]; if (l === "2.5") odds = o[key[0] + "25"]; g = "Goals"; }
  else if (key === "BTTSY" || key === "BTTSN") { pr = p.BTTS && p.BTTS[key.slice(4)]; odds = o[key]; g = "BTTS"; }
  else if (/^C[OU]\d+$/.test(key)) { const l = lineOf(key.slice(2)); const v = c.OU && c.OU[l]; pr = v && v[key[1]]; g = "Corners"; }
  else if (/^K[OU]\d+$/.test(key)) { const l = lineOf(key.slice(2)); const v = m.cards && m.cards.OU[l]; pr = v && v[key[1]]; g = "Cards"; }
  else if (/^H[OU]\d+$/.test(key)) { const l = lineOf(key.slice(2)); const v = m.ht && m.ht.OU[l]; pr = v && v[key[1]]; g = "Half"; }
  else if (["HTH", "HTD", "HTA"].includes(key)) { pr = m.ht && m.ht["1X2"][key[2]]; g = "Half"; }
  else if (key.startsWith("HTFT:")) { pr = m.ht && m.ht.HTFT[key.slice(5)]; g = "HTFT"; }
  else if (key.startsWith("AH:")) {
    const [, side, ls] = key.split(":"); const line = +ls;
    const row = (p.AH || []).find((a) => Math.abs(a.line - line) < 1e-9);
    if (row) pr = 1 / (side === "H" ? row.home : row.away);
    if (o.AH && Math.abs(o.AH.line - line) < 1e-9) odds = side === "H" ? o.AH.home : o.AH.away;
    g = "AH";
  }
  return { p: pr, fair: pr ? 1 / pr : null, odds, g };
}

function selLabel(leg) {
  const k = leg.key, h = leg.home, a = leg.away;
  if (k === "CUSTOM") return "✍️ " + leg.label;
  const ln = (d) => num(parseInt(d, 10) / 10, 1);
  if (["H", "D", "A", "1X", "X2", "12", "BTTSY", "BTTSN"].includes(k)) return t("s_" + k, { h, a });
  if (/^[OU]\d+$/.test(k)) return t("s_" + k[0], { l: ln(k.slice(1)) });
  if (/^C[OU]\d+$/.test(k)) return t("s_" + k.slice(0, 2), { l: ln(k.slice(2)) });
  if (/^K[OU]\d+$/.test(k)) return t("s_" + k.slice(0, 2), { l: ln(k.slice(2)) });
  if (/^H[OU]\d+$/.test(k)) return t("s_" + k.slice(0, 2), { l: ln(k.slice(2)) });
  if (["HTH", "HTD", "HTA"].includes(k)) return t("s_" + k, { h, a });
  if (k.startsWith("HTFT:")) return t("s_HTFT", { x: k.slice(5) });
  if (k.startsWith("AH:")) { const [, side, ls] = k.split(":"); const l = side === "H" ? +ls : -ls; return t("s_AH", { t: side === "H" ? h : a, l: ahFmt(l) }); }
  return k;
}

function addSel(id, key) {
  const m = S.matches.find((x) => x.id === id);
  if (!m) return;
  if (SLIP.legs.some((l) => l.id === id && l.key === key)) { toast(t("already")); return; }
  const info = selInfo(m, key);
  SLIP.legs.push({ id, key, comp: m.comp, kickoff: m.kickoff, home: m.home, away: m.away,
    p: info.p, fair: info.fair, odds: +(info.odds || info.fair || 1.5).toFixed(2) });
  saveSlip(); updateFab(); toast(t("added"));
}

function bindAdds(root) {
  root.querySelectorAll("[data-add]").forEach((el) => el.onclick = (e) => {
    e.stopPropagation();
    const [id, key] = el.dataset.add.split("|");
    addSel(id, key);
  });
}

/* Auswertung eines Tipps mit Endstand */
function resultOf(id) {
  const r = S.results && S.results.matches && S.results.matches.find((x) => x.id === id);
  return r && r.result;
}

function legOutcome(leg) {
  const r = resultOf(leg.id);
  if (!r) return { st: "open" };
  const { hg, ag, hc, ac } = r, k = leg.key, tot = hg + ag;
  const win = (b) => (b ? { st: "won", f: leg.odds } : { st: "lost", f: 0 });
  const simple = { H: hg > ag, D: hg === ag, A: hg < ag, "1X": hg >= ag, X2: hg <= ag, "12": hg !== ag,
    BTTSY: hg > 0 && ag > 0, BTTSN: !(hg > 0 && ag > 0) };
  if (k in simple) return win(simple[k]);
  if (/^[OU]\d+$/.test(k)) { const l = parseInt(k.slice(1), 10) / 10; return win(k[0] === "O" ? tot > l : tot < l); }
  if (/^K[OU]\d+$/.test(k)) {
    if (r.hy == null || r.ay == null) return { st: "open" };
    const cards = r.hy + r.ay + (r.hr || 0) + (r.ar || 0); const l = parseInt(k.slice(2), 10) / 10;
    return win(k[1] === "O" ? cards > l : cards < l);
  }
  if (/^H[OU]\d+$/.test(k) || ["HTH", "HTD", "HTA"].includes(k) || k.startsWith("HTFT:")) {
    if (r.hthg == null || r.htag == null) return { st: "open" };
    const h1 = r.hthg, a1 = r.htag, l = parseInt(k.slice(2), 10) / 10;
    const sg = (x, y) => (x > y ? "1" : x === y ? "X" : "2");
    if (k === "HTH") return win(h1 > a1);
    if (k === "HTD") return win(h1 === a1);
    if (k === "HTA") return win(h1 < a1);
    if (k.startsWith("HTFT:")) return win(k.slice(5) === sg(h1, a1) + "/" + sg(hg, ag));
    return win(k[1] === "O" ? h1 + a1 > l : h1 + a1 < l);
  }
  if (/^C[OU]\d+$/.test(k)) {
    if (hc == null || ac == null) return { st: "open" };
    const l = parseInt(k.slice(2), 10) / 10; return win(k[1] === "O" ? hc + ac > l : hc + ac < l);
  }
  if (k.startsWith("AH:")) {
    const [, side, ls] = k.split(":"); const line = side === "H" ? +ls : -ls;
    const diff = side === "H" ? hg - ag : ag - hg;
    const quarter = Math.abs((line * 4) % 2) === 1;
    const halves = quarter ? [line - 0.25, line + 0.25] : [line, line];
    let f = 0;
    for (const l of halves) { const mar = diff + l; f += 0.5 * (mar > 0 ? leg.odds : mar === 0 ? 1 : 0); }
    const st = f === leg.odds ? "won" : f === 0 ? "lost" : f === 1 ? "void" : f > 1 ? "halfWon" : "halfLost";
    return { st, f };
  }
  return { st: "open" };
}

function betState(b) {
  const total = b.legs.reduce((x, l) => x * l.odds, 1);
  if (b.manual) return { st: b.manual, payout: b.manual === "won" ? b.stake * total : 0, total };
  const outs = b.legs.map(legOutcome);
  if (outs.some((o) => o.st === "lost")) return { st: "lost", payout: 0, total, outs };
  if (outs.some((o) => o.st === "open")) return { st: "open", payout: null, total, outs };
  const f = outs.reduce((x, o) => x * o.f, 1);
  return { st: f > 1 ? "won" : f === 1 ? "void" : "lost", payout: b.stake * f, total, outs };
}

function openCoupon() {
  S.sheet = "coupon";
  renderCoupon();
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState({ sheet: 1 }, "");
}

function stIcon(st) { return { won: "✅", lost: "❌", open: "⏳", void: "↩️", halfWon: "✅½", halfLost: "❌½" }[st] || "⏳"; }
function stText(st) { return t(st === "halfWon" ? "halfWon" : st === "halfLost" ? "halfLost" : st); }

function kellyHtml(p, o) {
  if (!SLIP.bankroll || !p || !o || o <= 1) return "";
  const f = (p * o - 1) / (o - 1);
  if (f <= 0) return `<div class="row-between"><small>${t("kellyRec")}</small><small class="src-bad">${t("kellyNone")}</small></div>`;
  const st = Math.max(0, Math.round(SLIP.bankroll * f / 4 * 2) / 2);
  return `<div class="card" style="margin:8px 0 0;padding:10px 12px;background:var(--card2)"><small>${t("kellyRec")} (¼ Kelly)</small><div class="row-between"><b class="src-ok" style="font:700 24px var(--display)">${num(st, 2)}</b><button class="btn small" data-kapply="${st}">${t("apply")}</button></div></div>`;
}

function slipSummary() {
  const L = SLIP.legs;
  if (!L.length) return "";
  const stake = SLIP.stake || 0;
  if (SLIP.type === "combo" && L.length > 1) {
    const tot = L.reduce((x, l) => x * (l.odds || 1), 1);
    const pp = L.every((l) => l.p) ? L.reduce((x, l) => x * l.p, 1) : null;
    const ev = pp ? pp * tot - 1 : null;
    return `<div class="row-between"><span>${t("totalOdds")}</span><b>${odd(tot)}</b></div>
      <div class="row-between"><span>${t("potWin")}</span><b class="src-ok">${num(stake * tot, 2)}</b></div>
      ${pp ? `<div class="row-between"><span>${t("modelChance")}</span><b>${pct(pp, 1)}</b></div>
      <div class="row-between"><span>${t("ev")}</span><b class="${ev >= 0 ? "src-ok" : "src-bad"}">${ev >= 0 ? "+" : ""}${num(ev * 100, 1)}%</b></div>` : ""}${kellyHtml(pp, tot)}`;
  }
  if (L.length === 1) return `<div class="row-between"><span>${t("potWin")}</span><b class="src-ok">${num(stake * (L[0].odds || 0), 2)}</b></div>${L[0].p ? `<div class="row-between"><span>${t("ev")}</span><b class="${L[0].p * L[0].odds >= 1 ? "src-ok" : "src-bad"}">${L[0].p * L[0].odds >= 1 ? "+" : ""}${num((L[0].p * L[0].odds - 1) * 100, 1)}%</b></div>` : ""}${kellyHtml(L[0].p, L[0].odds)}`;
  return L.map((l) => `<div class="row-between"><span>${esc(selLabel(l))}</span><b>${num(stake * (l.odds || 0), 2)}</b></div>`).join("")
    + `<div class="row-between"><span>${t("stake")}</span><b>${num(stake * L.length, 2)}</b></div>`;
}

function renderCoupon() {
  const box = $("#sheet-content");
  const n = SLIP.legs.length, nb = SLIP.bets.length;
  let h = `<div class="d-head"><b style="font-size:18px">🧾 ${t("coupon")}</b></div>
    <div class="chips"><button class="chip ${SLIP.view === "slip" ? "on" : ""}" data-cview="slip">${t("newSlip")} (${n})</button><button class="chip ${SLIP.view === "bets" ? "on" : ""}" data-cview="bets">${t("myBets")} (${nb})</button></div>`;
  if (SLIP.view === "slip") {
    if (!n) h += `<div class="empty"><b>🧾</b>${t("emptySlip")}<br><small>${t("emptySlipSub")}</small></div>`;
    else {
      const ids = SLIP.legs.map((l) => l.id);
      if (SLIP.type === "combo" && new Set(ids).size < ids.length) h += `<div class="note">${t("sameMatch")}</div>`;
      h += `<div class="card">${SLIP.legs.map((l, i) => {
        const c = S.comps[l.comp] || { flag: "" };
        return `<div class="leg"><div><b>${esc(selLabel(l))}</b><div class="sub" style="font-size:12px;color:var(--muted)">${c.flag} ${esc(l.home)} – ${esc(l.away)} · ${fmtShort(l.kickoff)} ${fmtTime(l.kickoff)}</div>
          <div class="sub" style="font-size:12px;color:var(--muted)">${l.p ? `${t("prob")} ${pct(l.p, 1)} · ${t("fairOdds")} ${odd(l.fair)}` : ""}</div></div>
          <div style="display:flex;gap:6px;align-items:center"><input class="oddin" inputmode="decimal" data-odd="${i}" value="${num(l.odds, 2)}" aria-label="${t("yourOdds")}"><button class="x" data-rm="${i}">✕</button></div></div>`;
      }).join("")}<small>✏️ ${t("oddsHint")}</small></div>`;
      if (n > 1) h += `<div class="chips"><button class="chip ${SLIP.type === "combo" ? "on" : ""}" data-ctype="combo">${t("combo")}</button><button class="chip ${SLIP.type === "single" ? "on" : ""}" data-ctype="single">${t("single")}</button></div>`;
      h += `<div class="card"><div class="row-between"><span>${SLIP.type === "single" && n > 1 ? t("stakeEach") : t("stake")}</span><input class="oddin" inputmode="decimal" data-stake value="${num(SLIP.stake, 2)}"></div>
        <div class="row-between" style="margin-top:8px"><span>${t("bankroll")}</span><input class="oddin" inputmode="decimal" data-bank value="${SLIP.bankroll ? num(SLIP.bankroll, 0) : ""}" placeholder="500"></div>
        <div id="slipSum" style="margin-top:8px">${slipSummary()}</div>${SLIP.bankroll ? `<small>${t("kellyNote")}</small>` : ""}</div>
        <div class="row-between" style="margin-top:10px"><button class="btn" data-cclear>${t("clear")}</button><button class="btn primary" data-csave>${t("saveBet")}</button></div>`;
    }
  } else {
    if (!nb) h += `<div class="empty"><b>📒</b>${t("noBets")}</div>`;
    else {
      let st = 0, ret = 0, done = 0, wins = 0;
      const states = SLIP.bets.map(betState);
      SLIP.bets.forEach((b, i) => { st += b.stake; if (states[i].st !== "open") { done++; ret += states[i].payout || 0; if (states[i].st === "won" || states[i].st === "halfWon") wins++; } });
      const settledStake = SLIP.bets.reduce((x, b, i) => x + (states[i].st !== "open" ? b.stake : 0), 0);
      const pl = ret - settledStake;
      h += `<div class="grid3"><div class="stat"><small>${t("staked")}</small><b>${num(st, 2)}</b></div><div class="stat"><small>${t("returned")}</small><b>${num(ret, 2)}</b></div><div class="stat"><small>${t("profit")}</small><b class="${pl >= 0 ? "src-ok" : "src-bad"}">${pl >= 0 ? "+" : ""}${num(pl, 2)}</b></div></div>`;
      if (done) h += `<small>${t("hitRate")}: ${Math.round((wins / done) * 100)}% (${wins}/${done})</small>`;
      h += betStats(states);
      SLIP.bets.forEach((b, i) => {
        const s2 = states[i];
        h += `<div class="card betcard ${s2.st === "won" || s2.st === "halfWon" ? "won" : s2.st === "lost" || s2.st === "halfLost" ? "lost" : ""}" style="margin-top:8px">
          <div class="row-between"><b>${b.legs.length > 1 ? t("combo") : "1×"} · ${t("stake")} ${num(b.stake, 2)} @ ${odd(s2.total)}</b><span class="st ${s2.st === "won" ? "won" : s2.st === "lost" ? "lost" : "open"}">${stIcon(s2.st)} ${stText(s2.st)}${s2.payout != null && s2.st !== "lost" ? " " + num(s2.payout, 2) : ""}</span></div>
          ${b.legs.map((l, j) => { const o = s2.outs ? s2.outs[j] : null; const r = resultOf(l.id);
            return `<div class="formrow"><span>${o ? stIcon(o.st) : ""}</span><span class="opp">${esc(selLabel(l))}<br><small>${esc(l.home)} – ${esc(l.away)}${r ? ` · <b>${r.hg}:${r.ag}</b>` : ` · ${fmtShort(l.kickoff)}`}</small></span><span class="sc">${odd(l.odds)}</span></div>`; }).join("")}
          <div class="chips" style="margin-top:6px"><button class="btn small" data-bmark="${i}|won">${t("markWon")}</button><button class="btn small" data-bmark="${i}|lost">${t("markLost")}</button>${b.manual ? `<button class="btn small" data-bmark="${i}|">${t("auto")}</button>` : ""}<button class="btn small" data-bdel="${i}">${t("del")}</button></div></div>`;
      });
    }
    h += `<p class="info-note">${t("localNote")}</p>`;
  }
  box.innerHTML = h;
  box.querySelectorAll("[data-cview]").forEach((el) => el.onclick = () => { SLIP.view = el.dataset.cview; renderCoupon(); });
  box.querySelectorAll("[data-ctype]").forEach((el) => el.onclick = () => { SLIP.type = el.dataset.ctype; saveSlip(); renderCoupon(); });
  box.querySelectorAll("[data-rm]").forEach((el) => el.onclick = () => { SLIP.legs.splice(+el.dataset.rm, 1); saveSlip(); updateFab(); renderCoupon(); });
  box.querySelectorAll("[data-odd]").forEach((el) => el.oninput = () => {
    const v = pnum(el.value); if (v && v >= 1) { SLIP.legs[+el.dataset.odd].odds = v; saveSlip(); $("#slipSum").innerHTML = slipSummary(); }
  });
  const bk = box.querySelector("[data-bank]");
  if (bk) bk.onchange = () => { const v = pnum(bk.value); SLIP.bankroll = v && v > 0 ? v : null; store.set("bankroll", SLIP.bankroll); renderCoupon(); };
  box.onclick = (e) => { const a = e.target.closest("[data-kapply]"); if (a) { SLIP.stake = +a.dataset.kapply; saveSlip(); renderCoupon(); } };
  const sk = box.querySelector("[data-stake]");
  if (sk) sk.oninput = () => { const v = pnum(sk.value); if (v != null && v >= 0) { SLIP.stake = v; saveSlip(); $("#slipSum").innerHTML = slipSummary(); } };
  const cl = box.querySelector("[data-cclear]");
  if (cl) cl.onclick = () => { SLIP.legs = []; saveSlip(); updateFab(); renderCoupon(); };
  const sv = box.querySelector("[data-csave]");
  if (sv) sv.onclick = () => {
    const now = new Date().toISOString();
    const legs = SLIP.legs.map((l) => ({ ...l }));
    if (SLIP.type === "single" || legs.length === 1) legs.forEach((l) => SLIP.bets.unshift({ created: now, stake: SLIP.stake, legs: [l] }));
    else SLIP.bets.unshift({ created: now, stake: SLIP.stake, legs });
    SLIP.legs = []; saveSlip(); saveBets(); updateFab(); SLIP.view = "bets"; toast(t("saved")); renderCoupon();
  };
  box.querySelectorAll("[data-bmark]").forEach((el) => el.onclick = () => {
    const [i, v] = el.dataset.bmark.split("|"); SLIP.bets[+i].manual = v || null; saveBets(); updateFab(); renderCoupon();
  });
  box.querySelectorAll("[data-bdel]").forEach((el) => el.onclick = () => { SLIP.bets.splice(+el.dataset.bdel, 1); saveBets(); updateFab(); renderCoupon(); });
}

$("#couponBtn").addEventListener("click", openCoupon);

/* ------------------------------------------------------------ Start */
applyStatic();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
updateFab();
load();
