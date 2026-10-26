(function (root) {
  "use strict";
  const C = root.DigitClockCompetition, E = root.DigitClock, $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const number = n => Number(n.toFixed(3)).toLocaleString();
  const STORAGE = "pattc-digit-clock-leagues-v1";
  let store = C.empty(), lastSaved = JSON.stringify(store), host, activeId = "", refreshing = false;
  function notice(text, error = false) { $("dc-manager-message").textContent = text; $("dc-manager-message").className = error ? "error" : "muted"; }
  function persist() {
    try { const data = JSON.stringify(store); localStorage.setItem(STORAGE, data); lastSaved = data; }
    catch (_) { store = JSON.parse(lastSaved); throw new Error("Device storage is full or unavailable. The change was not saved; export a backup before making more changes."); }
  }
  const league = () => store.leagues.find(l => l.id === store.selectedLeague);
  const season = () => league()?.seasons.find(s => s.id === store.selectedSeason);
  function locate(id = activeId) {
    for (const l of store.leagues) for (const s of l.seasons) { const entry = s.entries.find(e => e.id === id); if (entry) return { league: l, season: s, entry }; }
    return null;
  }
  const fields = [["q1", "Period / inning 1 points"], ["q2", "Period / inning 2 points"], ["q3", "Period / inning 3 points"], ["q4", "Period / inning 4 points"], ["p5", "Inning 5 points"], ["p6", "Inning 6 points"], ["p7", "Inning 7 points"], ["p8", "Inning 8 points"], ["p9", "Inning 9 points"], ["extra", "Each extra inning points"], ["half", "First-half bonus (where applicable)"], ["ot", "OT bonus (timed sports)"], ["total", "Whole-game bonus"]];
  function rulesForm(value, prefix) {
    const r = C.rules(value);
    const context = prefix === "game" ? locate() : null;
    const sport = context ? E.profile(context.entry.sport || "nfl") : null;
    const format = Object.entries(C.formats).find(([, f]) => fields.every(([key]) => f.rules[key] === r[key]))?.[0] || "custom";
    return `<label>Admin game format<select name="format" data-format="${prefix}">${Object.entries(C.formats).map(([key, f]) => `<option value="${key}" ${format === key ? "selected" : ""}>${esc(f.label)}</option>`).join("")}<option value="custom" ${format === "custom" ? "selected" : ""}>Custom points & bonuses</option></select></label><label>Award winner by<select name="basis" id="${prefix}-basis"><option value="time" ${r.basis === "time" ? "selected" : ""}>Most time / outs held</option><option value="score" ${r.basis === "score" ? "selected" : ""}>Score holder at period end</option></select></label>` +
      fields.map(([key, label]) => {
        const period = key.startsWith("q") ? Number(key.slice(1)) : key.startsWith("p") ? Number(key.slice(1)) : null;
        const hidden = sport && ((period && period > sport.count) || (key === "extra" && sport.unit !== "outs") || (key === "half" && !sport.halfAfter) || (key === "ot" && sport.unit === "outs"));
        if (hidden) return `<input name="${key}" type="hidden" value="${r[key]}">`;
        const title = period && context ? `${E.periodLabel({ league: context.entry.sport || "nfl" }, period)} points` : label;
        return `<label>${title}<input name="${key}" type="number" min="0" max="10000" step="0.01" required value="${r[key]}"></label>`;
      }).join("") +
      `<label>Tied time winners<select name="ties"><option value="split" ${r.ties === "split" ? "selected" : ""}>Split the available points</option><option value="full" ${r.ties === "full" ? "selected" : ""}>Each gets full points</option></select></label>`;
  }
  function readRules(form) {
    if (!form.reportValidity()) throw new Error("Check the points settings.");
    return C.rules({ basis: form.elements.basis.value, ties: form.elements.ties.value, ...Object.fromEntries(fields.map(([key]) => [key, Number(form.elements[key].value)])) });
  }
  function applyFormat(event) {
    const key = event.target.dataset.format;
    if (!key) {
      const form = event.target.closest("form");
      if (form?.elements.format && fields.some(([field]) => event.target.name === field)) form.elements.format.value = "custom";
      return;
    }
    const preset = C.formats[event.target.value]; if (!preset) return;
    const form = event.target.closest("form");
    fields.forEach(([field]) => { form.elements[field].value = preset.rules[field]; });
    notice("Format selected. Adjust values or winner basis, then save to apply. Accumulated time is retained for every format.");
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function winnerNames(context, award) {
    return award.winners.length ? award.winners.map(key => context.league.members.find(m => m.id === key)?.name || "Unassigned number").join(" / ") : "—";
  }
  function awardsTable(context) {
    const timeAwards = C.periodAwards(context.league, { ...context.entry, rules: { ...context.season.rules, ...context.entry.rules, basis: "time" } }, context.season.rules);
    const scoreAwards = C.periodAwards(context.league, { ...context.entry, rules: { ...context.season.rules, ...context.entry.rules, basis: "score" } }, context.season.rules);
    const pointAwards = C.periodAwards(context.league, context.entry, context.season.rules);
    return `<table><thead><tr><th>Period</th><th>Time / outs winner</th><th>Winning amount</th><th>End-score holder</th><th>Points winner</th><th>Points each</th><th>Status</th></tr></thead><tbody>${pointAwards.map((award, i) => `<tr><td>${award.label}</td><td>${esc(winnerNames(context, timeAwards[i]))}</td><td>${E.formatProgress(context.entry.snapshot, timeAwards[i].winningSeconds)}</td><td>${award.exists ? `#${scoreAwards[i].scoreDigit} ${esc(winnerNames(context, scoreAwards[i]))}` : "—"}</td><td>${esc(winnerNames(context, award))}</td><td>${award.exists ? number(award.perWinner) : "—"}</td><td>${!award.exists ? "Not played" : award.verified ? "Confirmed" : esc(award.reason)}</td></tr>`).join("")}</tbody></table>`;
  }
  function renderWinners() {
    const state = host?.state(); if (!state?.game) return;
    const context = locate();
    if (context && context.entry.eventId === state.game.id && (context.entry.sport || "nfl") === (state.game.league || "nfl")) {
      $("dc-active-context").textContent = `${context.league.name} · ${context.season.label} · Week ${context.entry.week}`;
      $("dc-period-winners").innerHTML = awardsTable(context); return;
    }
    const members = state.names.map((name, n) => ({ id: `digit-${n}`, name: name || `Number ${n}` }));
    const standalone = { league: { members }, season: { rules: C.defaults }, entry: { assignments: members.map(m => m.id), snapshot: state.game } };
    $("dc-active-context").textContent = state.demo ? "Example · not saved" : "Single game · add to a league to customize points";
    $("dc-period-winners").innerHTML = awardsTable(standalone);
  }
  function renderLineup() {
    const context = locate(), target = $("dc-lineup");
    target.hidden = !context || context.league.id !== league()?.id || context.season.id !== season()?.id;
    if (target.hidden) return;
    const { league: l, season: s, entry } = context;
    target.innerHTML = `<div class="lineup-editor"><div class="section-heading"><h3>Game lineup · ${esc(entry.snapshot ? `${entry.snapshot.away} at ${entry.snapshot.home}` : entry.eventId)}</h3><span class="pill">WEEK ${esc(entry.week)}</span></div><p class="muted">These assignments belong only to this league and game. Add players in the league roster above. The same player may own more than one digit; their time is combined.</p><div class="name-grid">${entry.assignments.map((assigned, n) => `<label>Number ${n}<select data-assignment="${n}"><option value="">Unassigned</option>${l.members.map(m => `<option value="${esc(m.id)}" ${assigned === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>`).join("")}</div><div class="controls league-heading"><button data-move="${esc(entry.id)}">Move game to week above</button>${entry.snapshot?.completed && entry.snapshot.warnings?.some(w => /overtime/i.test(w)) ? `<label class="check-label"><input type="checkbox" id="dc-verify-ot" ${entry.verifiedOT ? "checked" : ""}> I verified this final OT clock</label>` : ""}</div><details><summary>Admin: game format & custom points${entry.rules ? " · override active" : " · using season defaults"}</summary><p class="muted">Choose a game type, then set the applicable period / inning values. Half bonuses apply only to sports with halves. The final includes OT or extra innings. Baseball awards use outs held or the end-of-inning score holder. Zero disables an award.</p><form id="dc-game-rules" class="model-inputs">${rulesForm({ ...s.rules, ...entry.rules }, "game")}</form><div class="controls"><button id="dc-save-game-rules">Save game override</button><button id="dc-reset-game-rules" class="quiet">Use season defaults</button></div></details></div>`;
  }
  function render(full = true) {
    const l = league(), s = season();
    if (full) {
      $("dc-league").innerHTML = '<option value="">Choose a league</option>' + store.leagues.map(item => `<option value="${esc(item.id)}" ${item.id === l?.id ? "selected" : ""}>${esc(item.name)}</option>`).join("");
      $("dc-season").innerHTML = '<option value="">Choose a season</option>' + (l?.seasons || []).map(item => `<option value="${esc(item.id)}" ${item.id === s?.id ? "selected" : ""}>${esc(item.label)}</option>`).join("");
      $("dc-roster").innerHTML = (l?.members || []).map(m => `<label>Player name<input data-member="${esc(m.id)}" maxlength="60" value="${esc(m.name)}" aria-label="Rename ${esc(m.name)}"></label>`).join("");
      $("dc-rules").innerHTML = rulesForm(s?.rules || C.defaults, "season");
      renderLineup();
    }
    $("dc-league-content").hidden = !s;
    $("dc-create-season").disabled = !l;
    $("dc-refresh-all").disabled = !s || refreshing;
    const currentWeek = $("dc-week-filter").value;
    const weeks = [...new Set((s?.entries || []).map(e => e.week))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    $("dc-week-filter").innerHTML = '<option value="">Whole season</option>' + weeks.map(w => `<option value="${esc(w)}" ${w === currentWeek ? "selected" : ""}>Week ${esc(w)}</option>`).join("");
    if (!s) { renderWinners(); return; }
    const week = $("dc-week-filter").value;
    const stats = C.standings(l, s, week);
    $("dc-saved-games").innerHTML = stats.entries.length ? stats.entries.map(entry => {
      const g = entry.snapshot, awards = C.periodAwards(l, entry, s.rules), q = awards.filter(a => a.key.startsWith("q"));
      return `<article class="saved-game ${entry.id === activeId ? "selected-game" : ""}"><p class="eyebrow">${esc(E.profile(entry.sport || "nfl").label)} · WEEK ${esc(entry.week)} · ${entry.rules ? "CUSTOM POINTS" : "SEASON POINTS"}</p><h3>${esc(g ? `${g.away} at ${g.home}` : `ESPN ${entry.eventId}`)}</h3><p>${g ? `${g.awayScore}–${g.homeScore} · ${esc(g.detail)}` : "Awaiting first refresh"}</p><p class="muted">${q.length ? q.map(a => `${a.label}: ${a.exists ? esc(winnerNames({ league: l }, a)) + (a.verified ? " ✓" : " (provisional)") : "—"}`).join(" · ") : "No results yet"}</p><p class="muted">${entry.error ? `Feed stale: ${esc(entry.error)}` : g?.warnings?.length ? "Feed warnings · awards pending review" : g?.completed ? "Final" : "Live / upcoming"}${entry.updatedAt ? ` · Checked ${esc(new Date(entry.updatedAt).toLocaleString())}` : ""}</p><div class="controls"><button data-open="${esc(entry.id)}">Open game & lineup →</button><button class="quiet" data-remove="${esc(entry.id)}">Remove from season</button></div></article>`;
    }).join("") : '<p class="muted">No saved games here yet. Track a game below, then add it to this season.</p>';
    const rankBy = $("dc-rank-by")?.value || "points";
    const ranked = [...stats.rows].sort((a, b) => rankBy !== "points" ? b[rankBy] - a[rankBy] || a.name.localeCompare(b.name) : b.points - a.points || b.seconds - a.seconds || a.name.localeCompare(b.name));
    ranked.forEach((row, index) => { row.displayRank = index && ranked[index - 1][rankBy] === row[rankBy] ? ranked[index - 1].displayRank : index + 1; });
    $("dc-standings-title").textContent = `${l.name} · ${s.label}${week ? ` · Week ${week}` : " · Season standings"}`;
    $("dc-standings").innerHTML = `<table><thead><tr><th>Rank</th><th>Player</th><th>Confirmed points</th><th>Projected points</th><th>Accumulated time</th><th>Time in verified finals</th><th>Baseball outs</th><th>Outs in verified finals</th><th>Period / inning wins</th><th>Game wins</th><th>Games tracked</th></tr></thead><tbody>${ranked.length ? ranked.map(r => `<tr><td>${r.displayRank}</td><td>${esc(r.name)}</td><td>${number(r.points)}</td><td>${number(r.projected)}</td><td>${E.time(r.seconds)}</td><td>${E.time(r.confirmedSeconds)}</td><td>${r.outs}</td><td>${r.confirmedOuts}</td><td>${r.quarterWins}</td><td>${r.gameWins}</td><td>${r.appearances}</td></tr>`).join("") : '<tr><td colspan="11">Add players in League roster, or assign names before adding your first game.</td></tr>'}</tbody></table>`;
    $("dc-pending").textContent = `${stats.entries.length} games · ${stats.pending} unfinished or awaiting verified data. Confirmed points include only completed, verified periods. Projected points include current period leaders and bonuses. Time includes reported progress in live games. Unassigned numbers can win, but receive no player points. Timed sports and baseball outs are kept separate. Tied period / inning wins count once per tied player.`;
    renderWinners();
  }
  function useLineup() {
    const context = locate();
    if (context) host.setLineup(C.lineup(context.league, context.entry), true);
    renderWinners();
  }
  function saveSnapshot(game) {
    let changed = false;
    for (const l of store.leagues) for (const s of l.seasons) for (const entry of s.entries) if (entry.eventId === game.id && (entry.sport || "nfl") === (game.league || "nfl")) {
      if (entry.snapshot && (entry.snapshot.through !== game.through || JSON.stringify(entry.snapshot.events) !== JSON.stringify(game.events))) entry.verifiedOT = false;
      entry.snapshot = game; entry.updatedAt = new Date().toISOString(); entry.error = ""; changed = true;
    }
    if (changed) { persist(); render(false); }
    renderWinners();
  }
  function feedError(eventId, error, sport = "nfl") {
    let changed = false;
    for (const l of store.leagues) for (const s of l.seasons) for (const entry of s.entries) if (entry.eventId === eventId && (entry.sport || "nfl") === sport) { entry.error = String(error).slice(0, 300); changed = true; }
    if (changed) { persist(); render(false); }
  }
  async function refreshSeason(automatic = false) {
    const s = season(); if (!s || refreshing) return;
    const current = host.state();
    const events = [...new Set(s.entries.filter(e => !automatic || (!e.snapshot?.completed && !(e.eventId === current.game?.id && (e.sport || "nfl") === current.game?.league))).map(e => `${e.sport || "nfl"}:${e.eventId}`))];
    if (!events.length) return;
    refreshing = true; render(false); let failed = 0, done = 0;
    if (!automatic) notice(`Refreshing ${events.length} saved games…`);
    async function worker() {
      while (events.length) {
        const [sport, eventId] = events.shift().split(":");
        try {
          const game = await host.fetchGame(eventId, sport); saveSnapshot(game); host.updateIfCurrent(game);
        } catch (error) { failed++; try { feedError(eventId, error.message, sport); } catch (_) { /* Storage failure already reported below. */ } }
        done++;
      }
    }
    try { await Promise.all([worker(), worker(), worker()]); }
    finally { refreshing = false; render(false); if (!automatic || failed) notice(`${done} games checked${failed ? `; ${failed} could not refresh. Last snapshots retained.` : ". Standings recalculated."}`, !!failed); }
  }
  function action(fn) { return async event => { try { await fn(event); } catch (error) { store = JSON.parse(lastSaved); render(); notice(error.message, true); } }; }
  function clearActive() { activeId = ""; host?.setLineup(null, false); }
  function open(entryId, fetch = true) {
    const context = locate(entryId); if (!context) throw new Error("Saved game not found.");
    activeId = entryId; store.selectedLeague = context.league.id; store.selectedSeason = context.season.id; persist();
    $("dc-entry-week").value = context.entry.week;
    host.open(context.entry.eventId, C.lineup(context.league, context.entry), context.entry.snapshot, fetch, context.entry.sport || "nfl");
    render(); notice(`Opened ${context.league.name}, ${context.season.label}, week ${context.entry.week}. Edit this game's assignments and points above.`);
  }
  function init(api) {
    host = api;
    try { const saved = localStorage.getItem(STORAGE); if (saved) { store = C.validate(JSON.parse(saved)); lastSaved = saved; } }
    catch (_) { notice("Saved league data could not be read. Existing storage has been left untouched. Import a valid backup to recover.", true); }
    $("dc-new-season").value = String(new Date().getFullYear());
    $("dc-create-league").addEventListener("click", action(() => {
      const l = C.createLeague(store, $("dc-new-league").value), s = C.createSeason(l, $("dc-new-season").value || String(new Date().getFullYear()));
      store.selectedLeague = l.id; store.selectedSeason = s.id; clearActive(); persist(); render(); $("dc-new-league").value = "";
      notice("League and season created. Track a game, assign names, then add it to this season.");
    }));
    $("dc-create-season").addEventListener("click", action(() => { const l = league(); if (!l) throw new Error("Choose a league first."); const s = C.createSeason(l, $("dc-new-season").value); store.selectedSeason = s.id; clearActive(); persist(); render(); notice("New season created with a fresh game list and standings."); }));
    $("dc-league").addEventListener("change", action(() => { store.selectedLeague = $("dc-league").value; store.selectedSeason = league()?.seasons[0]?.id || ""; clearActive(); persist(); render(); }));
    $("dc-season").addEventListener("change", action(() => { store.selectedSeason = $("dc-season").value; clearActive(); persist(); render(); }));
    $("dc-week-filter").addEventListener("change", () => render(false));
    $("dc-rank-by").addEventListener("change", () => render(false));
    $("dc-add-player").addEventListener("click", action(() => { if (!league()) throw new Error("Choose a league first."); if (!$("dc-new-player").value.trim()) throw new Error("Enter a player name."); C.member(league(), $("dc-new-player").value); persist(); render(); $("dc-new-player").value = ""; notice("Player added to this league's roster."); }));
    $("dc-roster").addEventListener("change", action(event => {
      const id = event.target.dataset.member; if (!id) return; const name = event.target.value.trim();
      if (!name) throw new Error("Player name cannot be blank.");
      if (league().members.some(m => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) throw new Error("Another player already uses that name in this league.");
      league().members.find(m => m.id === id).name = name; persist(); useLineup(); render(); notice("Player renamed across this league's games and seasons.");
    }));
    $("dc-save-rules").addEventListener("click", action(() => { if (!season()) return; season().rules = readRules($("dc-rules")); persist(); render(); notice("Season defaults updated. Games with custom points keep their overrides. Standings recalculated."); }));
    $("dc-rules").addEventListener("submit", e => { e.preventDefault(); $("dc-save-rules").click(); });
    $("dc-rules").addEventListener("change", applyFormat);
    $("dc-add-current").addEventListener("click", action(() => {
      const state = host.state(), l = league(), s = season();
      if (!l || !s) throw new Error("Choose a league and season first.");
      if (!state.game || state.demo) throw new Error("Track a real game below before adding it.");
      const entry = C.addGame(l, s, state.game.id, $("dc-entry-week").value, state.names, state.game);
      persist(); open(entry.id, false); notice("Game added. Its lineup and points are independent of other leagues. Open a different game below to add more.");
    }));
    $("dc-saved-games").addEventListener("click", action(event => {
      const openId = event.target.closest("[data-open]")?.dataset.open; if (openId) { open(openId); return; }
      const remove = event.target.closest("[data-remove]")?.dataset.remove;
      if (remove) { const context = locate(remove); context.season.entries = context.season.entries.filter(e => e.id !== remove); if (activeId === remove) clearActive(); persist(); render(); notice("Game removed from this season. Other leagues and games are unchanged."); }
    }));
    $("dc-lineup").addEventListener("change", action(event => {
      applyFormat(event);
      const context = locate(); if (!context) return;
      const n = event.target.dataset.assignment;
      if (n !== undefined) { const value = event.target.value; if (value && !context.league.members.some(m => m.id === value)) throw new Error("Unknown player."); context.entry.assignments[Number(n)] = value || null; persist(); useLineup(); render(false); notice("Game lineup saved. All weekly and season totals recalculated."); }
      if (event.target.id === "dc-verify-ot") { context.entry.verifiedOT = event.target.checked; persist(); render(false); notice("OT verification saved. Other feed warnings still prevent confirmed awards."); }
    }));
    $("dc-lineup").addEventListener("submit", event => { event.preventDefault(); if (event.target.id === "dc-game-rules") $("dc-save-game-rules").click(); });
    $("dc-lineup").addEventListener("click", action(event => {
      const context = locate(); if (!context) return;
      if (event.target.closest("[data-move]")) { const week = $("dc-entry-week").value.trim(); if (!week) throw new Error("Enter a week above."); context.entry.week = week.slice(0, 40); persist(); render(); notice("Game moved. Weekly standings recalculated."); }
      if (event.target.id === "dc-save-game-rules") { context.entry.rules = readRules($("dc-game-rules")); persist(); render(); notice("Custom game points saved. This game's awards now use its own rules."); }
      if (event.target.id === "dc-reset-game-rules") { context.entry.rules = null; persist(); render(); notice("Game now follows the season's default points rules."); }
    }));
    $("dc-refresh-all").addEventListener("click", action(() => refreshSeason()));
    $("dc-backup").addEventListener("click", () => { download(`digit-clock-leagues-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store, null, 2), "application/json"); notice("Backup exported with leagues, rosters, rules, saved snapshots, and standings inputs."); });
    $("dc-import").addEventListener("change", action(async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Backup exceeds 10 MB.");
        const imported = C.validate(JSON.parse(await file.text()));
        if (imported.leagues.some(l => store.leagues.some(old => old.id === l.id))) throw new Error("A league in this backup already exists here. Import adds new leagues and will not overwrite existing records.");
        store.leagues.push(...imported.leagues); C.validate(store);
        if (!store.selectedLeague) { store.selectedLeague = store.leagues[0]?.id; store.selectedSeason = league()?.seasons[0]?.id; }
        persist(); render(); notice(`${imported.leagues.length} leagues imported. Existing leagues retained.`);
      } finally { event.target.value = ""; }
    }));
    $("dc-export-standings").addEventListener("click", action(() => {
      const l = league(), s = season(); if (!s) return;
      const cell = value => '"' + String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
      const stats = C.standings(l, s, $("dc-week-filter").value);
      const rows = [["Player", "Confirmed points", "Projected points", "Accumulated seconds", "Seconds in verified finals", "Baseball outs", "Outs in verified finals", "Period/inning wins", "Game wins", "Games"], ...stats.rows.map(r => [r.name, r.points, r.projected, r.seconds, r.confirmedSeconds, r.outs, r.confirmedOuts, r.quarterWins, r.gameWins, r.appearances])];
      download("digit-clock-standings.csv", rows.map(r => r.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
    }));
    render();
    const initialEntry = new URL(location.href).searchParams.get("entry");
    if (initialEntry && locate(initialEntry)) open(initialEntry);
    window.addEventListener("storage", event => {
      if (event.key !== STORAGE || !event.newValue) return;
      try {
        const next = C.validate(JSON.parse(event.newValue));
        store = next; lastSaved = event.newValue;
        if (activeId && !locate()) clearActive(); else if (activeId) useLineup();
        render(); notice("League data updated from another tab on this device.");
      } catch (_) { notice("Another tab wrote unreadable league data. Export a backup of this tab before reloading.", true); }
    });
    setInterval(() => { if (!document.hidden && $("auto").checked) refreshSeason(true); }, 45000);
  }
  root.DigitClockLeagues = { init, saveSnapshot: game => { try { saveSnapshot(game); } catch (error) { notice(error.message, true); } }, feedError: (eventId, error, sport) => { try { feedError(eventId, error, sport); } catch (storageError) { notice(storageError.message, true); } }, renderWinners, clearActive, refreshSeason,
    context: () => locate(), standalone: () => { clearActive(); render(); } };
})(window);
