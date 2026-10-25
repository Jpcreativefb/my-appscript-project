(function () {
  "use strict";
  const E = window.DigitClock, M = window.DigitClockLeagues, $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const percent = p => `${(100 * p).toFixed(1)}%`;
  const sportModels = {};
  let game = null, result = null, demo = false, busy = false, revision = 0, activeEvent = "", activeSport = "nfl", names = Array(10).fill(""), assumptions = { ...E.defaults };
  const key = () => `pattc-digit-clock:${demo ? "demo" : (activeSport === "nfl" ? "" : activeSport + ":") + (activeEvent || "draft")}`;
  const progress = n => E.formatProgress(game || { league: activeSport }, n);
  const person = n => names[n] || `Number ${n}`;
  const amount = (row, scope = $("scope").value) => scope[0] === "q" ? row.quarters[Number(scope.slice(1)) - 1] || 0 : row[scope];
  function message(text, error = false) { $("message").textContent = text; $("message").className = error ? "error" : ""; }
  function saveNames() {
    if (M.context()) return;
    try { localStorage.setItem(key(), JSON.stringify(names)); } catch (_) { message("Names could not save on this device. Copy a game link to keep them.", true); }
  }
  function loadNames(shared) {
    try {
      const value = shared || JSON.parse(localStorage.getItem(key()) || "null");
      names = Array.from({ length: 10 }, (_, n) => typeof value?.[n] === "string" ? value[n].slice(0, 60) : "");
    } catch (_) { names = Array(10).fill(""); }
    $("names").innerHTML = names.map((name, n) => `<label>Number ${n}<input data-digit="${n}" maxlength="60" aria-label="Name assigned to number ${n}" value="${esc(name)}" placeholder="Player name"></label>`).join("");
    const managed = !!M.context();
    $("names").querySelectorAll("input").forEach(input => { input.readOnly = managed; });
    $("assignment-help").textContent = managed ? "This game belongs to a saved league. Edit its lineup with the player selectors in the league section above." : "Names save on this device for each game. Share a link to copy this lineup to another device.";
  }
  const demoPayload = () => ({ header: { season: { type: 2 }, competitions: [{ id: "example", status: { period: 2, displayClock: "9:10", type: { state: "in", detail: "2nd quarter · Example" } }, competitors: [
    { homeAway: "home", team: { displayName: "Home team" }, score: "10" }, { homeAway: "away", team: { displayName: "Away team" }, score: "10" }
  ] }] }, scoringPlays: [
    { id: "1", period: { number: 1 }, clock: { displayValue: "11:40" }, homeScore: 7, awayScore: 0, text: "Touchdown + made extra point (bundled)" },
    { id: "2", period: { number: 1 }, clock: { displayValue: "9:40" }, homeScore: 7, awayScore: 3, text: "Made field goal" },
    { id: "3", period: { number: 2 }, clock: { displayValue: "13:20" }, homeScore: 10, awayScore: 3, text: "Made field goal" },
    { id: "4", period: { number: 2 }, clock: { displayValue: "10:20" }, homeScore: 10, awayScore: 10, text: "Touchdown + made extra point (bundled)" }
  ] });
  async function get(query) {
    const response = await fetch(`./api/digit-clock?${new URLSearchParams(query)}`, { cache: "no-store", signal: AbortSignal.timeout(40000) });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Could not fetch ESPN data.");
    return data;
  }
  const fetching = new Map();
  function fetchGame(event, league = activeSport) {
    const key = `${league}:${event}`;
    if (!fetching.has(key)) {
      const promise = get({ event, league }).then(data => E.normalize(data, league)).finally(() => fetching.delete(key));
      fetching.set(key, promise);
    }
    return fetching.get(key);
  }
  async function refresh() {
    if (busy || demo || !activeEvent) return;
    busy = true; const token = revision, event = activeEvent, league = activeSport;
    $("refresh").disabled = true;
    message("Checking ESPN scoring plays…");
    try {
      const next = await fetchGame(event, league);
      if (token !== revision) return;
      game = next; result = E.tally(game);
      $("game-content").hidden = false;
      render(); M.saveSnapshot(game); message(game.completed ? "Final score received. Time totals remain subject to any feed warnings below." : "Tracking ESPN. Totals advance only when ESPN reports game-clock progress.");
    } catch (error) {
      if (token === revision) { message(`Feed unavailable: ${error.message} Last successful totals are frozen.`, true); $("updated").textContent = "STALE · Last successful data retained"; M.feedError(event, error.message, league); }
    } finally { busy = false; $("refresh").disabled = false; if (token !== revision && activeEvent && !demo) queueMicrotask(refresh); }
  }
  function render() {
    if (!game || !result) return;
    const profile = E.profile(game), baseball = profile.unit === "outs";
    $("sport-badge").textContent = `${profile.label} · ${baseball ? "OUTS HELD" : "GAME CLOCK"}`;
    const scopeKey = $("scope").value;
    const scopeItems = [{ value: "total", label: "Whole game" }, ...Array.from({ length: baseball ? Math.max(9, game.period) : profile.count }, (_, i) => ({ value: `q${i + 1}`, label: E.periodLabel(game, i + 1) }))];
    if (profile.halfAfter) scopeItems.push({ value: "half", label: "First half" });
    if (!baseball) scopeItems.push({ value: "ot", label: "Overtime" });
    const scopeMarkup = scopeItems.map(s => `<option value="${s.value}">${esc(s.label)}</option>`).join("");
    if ($("scope").dataset.league !== game.league || $("scope").options.length !== scopeItems.length) { $("scope").innerHTML = scopeMarkup; $("scope").value = scopeItems.some(s => s.value === scopeKey) ? scopeKey : "total"; $("scope").dataset.league = game.league; }
    const total = game.homeScore + game.awayScore, scope = $("scope").value;
    const context = M.context();
    const grouped = new Map();
    result.rows.forEach(row => {
      const identity = context?.entry.assignments[row.digit] || `digit-${row.digit}`;
      const old = grouped.get(identity) || { name: person(row.digit), time: 0 };
      old.time += amount(row); grouped.set(identity, old);
    });
    const sorted = [...grouped.values()].sort((a, b) => b.time - a.time);
    const top = sorted[0].time;
    const leaders = top > 0 ? sorted.filter(r => r.time === top) : [];
    const scopeLabel = $("scope").selectedOptions[0].textContent;
    $("scoreboard").innerHTML = `<div class="team">${esc(game.away)}<div class="score">${game.awayScore}</div></div><div class="game-status"><span>${demo ? "EXAMPLE · NOT LIVE" : game.completed ? "FINAL" : game.pre ? "UPCOMING" : "ESPN LIVE"}</span><strong>${esc(game.clock)}</strong><span>${esc(game.detail)}</span><p class="muted">Combined score ${total} → #${E.digit(total)}</p></div><div class="team">${esc(game.home)}<div class="score">${game.homeScore}</div></div>`;
    $("updated").textContent = demo ? "Example data · Clock paused" : `Last checked ${new Date(game.fetchedAt || Date.now()).toLocaleTimeString()}`;
    $("warnings").innerHTML = game.warnings.map(w => `<div class="warning">${esc(w)}</div>`).join("");
    const current = person(result.holder);
    const holderId = context?.entry.assignments[result.holder];
    const holderTotal = holderId ? result.rows.filter(r => context.entry.assignments[r.digit] === holderId).reduce((sum, r) => sum + r.total, 0) : result.rows[result.holder].total;
    $("leaders").innerHTML = `<article class="leader"><p class="eyebrow">${game.completed ? "FINAL SCORE HOLDER" : "CURRENT SCORE HOLDER"}</p><div class="leader-value">${esc(current)} <span class="muted">#${result.holder}</span></div><p>${result.holder === result.timedHolder ? `${progress(result.stretch)} this stretch · ${progress(holderTotal)} banked overall` : "Waiting for matching scoring history to verify progress."}</p></article><article class="leader"><p class="eyebrow">${esc(scopeLabel.toUpperCase())} · ${baseball ? "OUTS" : "TIME"} ${leaders.length > 1 ? "LEADERS (TIED)" : "LEADER"}</p><div class="leader-value">${leaders.length ? leaders.map(r => esc(r.name)).join(" / ") : "No progress banked yet"}</div><p>${progress(top)} accumulated${game.warnings.length ? " · Provisional totals" : ""}</p></article>`;
    $("digits").innerHTML = result.rows.map(row => `<article class="digit-card ${row.digit === result.holder ? "holding" : ""}"><span class="number">${row.digit}</span>${row.digit === result.holder ? '<span class="tag">HOLDING</span>' : ""}<div class="digit-name">${esc(person(row.digit))}</div><div class="digit-time">${progress(amount(row))}</div><span class="muted">${esc(scopeLabel)}</span><div class="bar"><span style="width:${top ? amount(row) / top * 100 : 0}%"></span></div></article>`).join("");
    $("accounted").textContent = `${progress(result.rows.reduce((n, r) => n + r.total, 0))} accounted for · ${game.warnings.length ? "Provisional" : "Reconciled to reported score"} · ${baseball ? "Outs credited to the previous digit through each scoring play." : game.untimedPhase ? "Untimed phase: the score changes, but no game-clock seconds are added." : "No intermission or stoppage time included."}`;
    $("periods").innerHTML = `<table><thead><tr><th>Number / person</th>${scopeItems.map(s => `<th>${esc(s.label)}</th>`).join("")}</tr></thead><tbody>${result.rows.map(r => `<tr><td>#${r.digit} ${esc(person(r.digit))}</td>${scopeItems.map(s => `<td>${progress(amount(r, s.value) || 0)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const remaining = game.completed || game.untimedPhase ? 0 : game.period <= profile.count ? E.regulation(game) - game.through : Math.max(0, E.periodStartFor(game, game.period) + E.overtimeLength(game) - game.through);
    const footballModel = profile.sport === "football" && !game.untimedPhase;
    const generalModel = profile.sport !== "football" && (!game.untimedPhase || game.completed);
    $("model-panel").hidden = !footballModel; $("general-model-panel").hidden = !generalModel; $("sport-model-note").hidden = footballModel || generalModel;
    const model = profile.sport === "football" ? E.probabilities(total, remaining, assumptions) : E.sportProbabilities(game, remaining, sportModels[game.league] || {});
    if (generalModel) {
      if ($("general-model-form").dataset.league !== game.league) {
        $("general-model-form").innerHTML = E.sportModelFields(game).map(f => `<label>${esc(f.label)}<input type="number" name="${f.key}" min="0" max="300" step="0.01" required value="${sportModels[game.league]?.[f.key] ?? f.rate}"></label>`).join("");
        $("general-model-form").dataset.league = game.league;
      }
      $("general-model-note").textContent = game.completed ? "Game finished: the final digit is known." : `Estimated ending-digit chances over the next ${progress(remaining)}${game.period <= profile.count ? " through regulation; future extra innings / OT excluded" : " through the current extra period"}. Chance of no further modeled scoring: ${percent(model.noMore)}. Walk-offs and early OT endings are not modeled.`;
      $("general-probabilities").innerHTML = model.final.map((p, n) => `<div class="probability"><span>#${n} · ${esc(person(n))}</span><strong>${percent(p)}</strong><span class="muted">Ending digit</span></div>`).join("");
    }
    $("outcomes-note").textContent = profile.sport === "football" ? "Either team can score. Conversions require a touchdown first. Misses keep the digit unless a return produces points." : baseball ? "Either team can score runs. Outs advance the progress bank, but do not change the score digit." : "Either team can score. These possibilities use this sport's point values.";
    $("outcomes").innerHTML = E.outcomesFor(game).map(o => {
      let estimate = "";
      if (o.label === "Touchdown") estimate = `Model: ${percent(model.nextTD)} of next TD / FG / safety events`;
      if (o.label === "Made field goal") estimate = `Model: ${percent(model.nextFG)} of next TD / FG / safety events; ${percent(assumptions.fgSuccess)} per kick attempt`;
      if (o.label === "Safety") estimate = `Model: ${percent(model.nextSafety)} of next TD / FG / safety events`;
      if (o.label === "Made extra point") estimate = `Model: ${percent(assumptions.pat)} if a kick is attempted`;
      if (o.label === "Successful two-point conversion") estimate = `Model: ${percent(assumptions.twoSuccess)} if attempted`;
      if (o.label.startsWith("Missed extra")) estimate = `Model: ${percent(1 - assumptions.pat)} missed PAT; ${percent(1 - assumptions.twoSuccess)} failed two-point try (returns excluded)`;
      if (o.kind === "attempt") estimate = `Model: ${percent(1 - assumptions.fgSuccess)} per kick attempt`;
      if (!footballModel) estimate = "";
      if (generalModel && o.modelKey) estimate = `Model: ${percent(model.next[o.modelKey] || 0)} of the next modeled scoring events`;
      const condition = o.kind === "conversion" ? game.conversionPending ? "Conversion pending" : "Conditional · after a touchdown" : o.kind === "combination" ? "Multiple events / includes conversion outcome" : "Scoring possibility";
      return `<article class="outcome"><span>${esc(o.label)} <small>(+${o.points})</small></span><strong>${esc(person(E.digit(total + o.points)))} · #${E.digit(total + o.points)}</strong><small>${condition}${estimate ? `<br>${estimate}` : "<br>No separate probability modeled"}</small></article>`;
    }).join("");
    const allPaths = E.pathsFor(game, total);
    const pathHtml = p => `<p>+${p.points}: ${esc(p.label)}${footballModel || generalModel ? `<br><small>Model: ${percent(E.combinationProbability(p.needs, model.expected))} for at least this combination before the horizon; other scores may occur.</small>` : ""}</p>`;
    $("paths").innerHTML = allPaths.map((paths, n) => `<article class="path"><h3>#${n} · ${esc(person(n))}</h3>${n === result.holder ? '<p style="color:var(--lime)">Currently holding · no score needed</p>' : ""}${paths.slice(0, 2).map(pathHtml).join("")}<details><summary>More scoring paths</summary>${paths.slice(2).map(pathHtml).join("")}</details></article>`).join("");
    $("model-note").textContent = game.completed ? "Game finished: the final score digit is known. This is separate from the accumulated-time winner." : `Estimated ending-digit chances over the next ${E.time(remaining)} of game-clock time${game.period <= 4 ? " (through regulation; future overtime excluded)" : " (through the current OT period; sudden-death and later OT periods not modeled)"}. Chance of no further modeled scoring: ${percent(model.noMore)}.`;
    $("probabilities").innerHTML = model.final.map((p, n) => `<div class="probability"><span>#${n} · ${esc(person(n))}</span><strong>${percent(p)}</strong><span class="muted">Ending digit</span></div>`).join("");
    $("history").innerHTML = `<table><thead><tr><th>Period</th><th>${baseball ? "Half / outs" : game.league === "nhl" ? "Clock elapsed in period" : "Clock left"}</th><th>${baseball ? "Completed outs" : "Elapsed"}</th><th>Scoring play</th><th>Away–Home</th><th>New holder</th><th>Previous holder credited</th></tr></thead><tbody>${result.history.length ? result.history.map(p => `<tr><td>${esc(E.periodLabel(game, p.period))}</td><td>${baseball ? `${esc(p.location)} · ${p.outs} outs` : esc(p.clock)}</td><td>${progress(p.at)}</td><td>${esc(p.text)}${p.bundled ? '<br><span class="muted">Bundled TD + conversion</span>' : ""}</td><td>${p.away}–${p.home}</td><td>#${p.holder} ${esc(person(p.holder))}</td><td>#${p.before} ${esc(person(p.before))}: ${progress(p.held)}</td></tr>`).join("") : '<tr><td colspan="7">No scores yet. Number 0 holds the progress bank.</td></tr>'}</tbody></table>`;
    $("history-note").textContent = baseball ? "MLB uses reported out counts: three outs per half-inning, six per full inning. Outs on a scoring play are credited to the previous holder; the new digit starts afterward. No unused outs are added to walk-off or shortened games." : "Times follow ESPN's reported play clocks. Hockey play clocks are elapsed in the period; basketball can include fractions of a second. Bundled scores remain bundled. Untimed phases add no seconds.";
    M.renderWinners();
  }
  const modelFields = [ ["td", "Touchdowns / 60 min", 30], ["fg", "Made field goals / 60 min", 30], ["safety", "Safeties / 60 min", 30], ["pat", "Extra point success %", 100], ["twoAttempt", "TDs choosing a two-point try %", 100], ["twoSuccess", "Two-point try success %", 100], ["fgSuccess", "Field goal attempt success %", 100] ];
  $("model-form").innerHTML = modelFields.map(([key, label, max]) => `<label>${label}<input name="${key}" type="number" min="0" max="${max}" step="0.01" value="${max === 100 ? assumptions[key] * 100 : assumptions[key]}" required></label>`).join("");
  $("apply-model").addEventListener("click", () => {
    if (!$("model-form").reportValidity()) return;
    const next = Object.fromEntries(modelFields.map(([key, , max]) => [key, Number($("model-form").elements[key].value) / (max === 100 ? 100 : 1)]));
    try { E.probabilities(0, 3600, next); assumptions = next; render(); message("Probability assumptions updated. These estimates are illustrative, not ESPN odds."); } catch (error) { message(error.message, true); }
  });
  $("model-form").addEventListener("submit", event => { event.preventDefault(); $("apply-model").click(); });
  $("apply-general-model").addEventListener("click", () => {
    if (!game || !$("general-model-form").reportValidity()) return;
    try { const values = Object.fromEntries(E.sportModelFields(game).map(f => [f.key, Number($("general-model-form").elements[f.key].value)])); E.sportProbabilities(game, 1, values); sportModels[game.league] = values; render(); message("Sport probability assumptions updated. These are illustrative estimates, not ESPN odds."); }
    catch (error) { message(error.message, true); }
  });
  $("general-model-form").addEventListener("submit", event => { event.preventDefault(); $("apply-general-model").click(); });
  $("names").addEventListener("input", event => { if (M.context()) return; const n = event.target.dataset.digit; if (n === undefined) return; names[Number(n)] = event.target.value; saveNames(); render(); });
  $("scope").addEventListener("change", render);
  $("games").addEventListener("change", () => { $("event").value = $("games").value; });
  $("find").addEventListener("click", async () => {
    const date = $("date").value.replaceAll("-", ""); if (!/^\d{8}$/.test(date)) return message("Choose a date first.", true);
    $("find").disabled = true;
    try {
      const data = await get({ date, league: $("sport").value });
      $("games").innerHTML = '<option value="">Choose a game</option>' + (data.events || []).map(e => `<option value="${esc(e.id)}">${esc(e.name)} · ${esc(e.status?.type?.shortDetail || "Scheduled")}</option>`).join("");
      message(data.events?.length ? "Select a game, then choose Track game." : "No games found for this sport and date.");
    } catch (error) { message(error.message, true); } finally { $("find").disabled = false; }
  });
  $("game-form").addEventListener("submit", async event => {
    event.preventDefault(); if (busy) return;
    const previousNames = names.slice(); const wasDraft = !activeEvent && !demo;
    M.standalone();
    activeEvent = $("event").value.trim(); activeSport = $("sport").value; revision++; demo = false; game = null; result = null;
    $("game-content").hidden = true;
    loadNames(wasDraft ? previousNames : undefined); saveNames();
    const url = new URL(location.href); url.searchParams.set("event", activeEvent); url.searchParams.set("league", activeSport); url.searchParams.delete("entry"); url.hash = ""; history.replaceState(null, "", url);
    await refresh();
  });
  $("demo").addEventListener("click", () => {
    M.standalone();
    revision++; demo = true; activeEvent = ""; activeSport = "nfl"; $("sport").value = "nfl"; game = E.normalize(demoPayload()); result = E.tally(game);
    loadNames(["Alex", "Morgan", "Casey", "Sam", "Jordan", "Riley", "Avery", "John", "Taylor", "George"]);
    $("game-content").hidden = false; render(); message("EXAMPLE ONLY · Try a real NFL game for ESPN scores and your saved lineup.");
  });
  $("refresh").addEventListener("click", refresh);
  $("share").addEventListener("click", async () => {
    if (!activeEvent || demo) return message("Track a real game before sharing.", true);
    const url = new URL(location.href); url.search = new URLSearchParams({ event: activeEvent, league: activeSport }).toString(); url.hash = new URLSearchParams({ names: JSON.stringify(names) }).toString();
    try { await navigator.clipboard.writeText(url.toString()); message("Game link copied with the current names. Recipients get a copy; later edits do not sync between devices."); }
    catch (_) { message("Clipboard unavailable. You can copy the game link from the address bar after clicking Share again on a secure connection.", true); history.replaceState(null, "", url); }
  });
  $("export").addEventListener("click", () => {
    if (!result) return;
    const cell = value => '"' + String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
    const p = E.profile(game), count = p.unit === "outs" ? Math.max(9, game.period) : p.count;
    const rows = [["Digit", "Name", "Unit", ...Array.from({ length: count }, (_, n) => E.periodLabel(game, n + 1)), "First half", "OT", "Total", "Status"], ...result.rows.map(r => [r.digit, person(r.digit), p.unit, ...Array.from({ length: count }, (_, n) => r.quarters[n] || 0), r.half, r.ot, r.total, demo ? "Example" : game.warnings.length ? "Provisional" : game.completed ? "Final" : "In progress"])];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `digit-clock-${game.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const today = new Date(); $("date").value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const initial = new URL(location.href).searchParams.get("event");
  const initialSport = new URL(location.href).searchParams.get("league");
  if (Object.hasOwn(E.profiles, initialSport)) activeSport = initialSport;
  $("sport").innerHTML = Object.entries(E.profiles).map(([key, p]) => `<option value="${key}" ${key === activeSport ? "selected" : ""}>${esc(p.label)}</option>`).join("");
  $("sport").addEventListener("change", () => { $("games").innerHTML = '<option value="">Find games for this sport and date</option>'; $("event").value = ""; });
  let shared; try { shared = JSON.parse(new URLSearchParams(location.hash.slice(1)).get("names") || "null"); } catch (_) { /* Ignore malformed shared names. */ }
  if (initial && /^\d{6,12}$/.test(initial)) { activeEvent = initial; $("event").value = initial; }
  loadNames(Array.isArray(shared) ? shared : undefined);
  if (shared && activeEvent) saveNames();
  M.init({
    state: () => ({ game, names: names.slice(), demo, league: activeSport }), fetchGame,
    setLineup: (value, managed) => { if (value) loadNames(value); else loadNames(); render(); },
    open: (event, lineup, snapshot, shouldRefresh, league = "nfl") => {
      revision++; activeEvent = event; activeSport = league; demo = false; $("event").value = event; $("sport").value = league;
      game = snapshot || null; result = game ? E.tally(game) : null; loadNames(lineup);
      $("game-content").hidden = !game; render();
      const url = new URL(location.href); url.searchParams.set("event", event); url.searchParams.set("league", league); url.searchParams.set("entry", M.context().entry.id); url.hash = ""; history.replaceState(null, "", url);
      if (shouldRefresh) refresh();
    },
    updateIfCurrent: next => { if (!demo && activeEvent === next.id && activeSport === next.league) { game = next; result = E.tally(game); $("game-content").hidden = false; render(); } }
  });
  if (activeEvent) refresh();
  setInterval(() => { if ($("auto").checked && !document.hidden && !game?.completed) refresh(); }, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && $("auto").checked && !game?.completed) refresh(); });
})();
