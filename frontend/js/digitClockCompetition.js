(function (root) {
  "use strict";
  const E = typeof module !== "undefined" && module.exports ? require("./digitClockSports.js") : root.DigitClock;
  const defaults = { mode: "awards", basis: "time", q1: 1, q2: 1, q3: 1, q4: 1, p5: 1, p6: 1, p7: 1, p8: 1, p9: 1, extra: 0, half: 0, ot: 0, total: 0, ties: "split" };
  const formats = {
    quarters: { label: "All periods / innings · equal points", rules: { ...defaults } },
    weighted: { label: "Four quarters / periods · different values", rules: { ...defaults, q1: 1, q2: 2, q3: 3, q4: 4 } },
    halfFinal: { label: "Half & final only", rules: { ...defaults, q1: 0, q2: 0, q3: 0, q4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0, half: 1, total: 3 } },
    timeOnly: { label: "Time / outs bank only · no points", rules: { ...defaults, q1: 0, q2: 0, q3: 0, q4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0 } }
  };
  const id = () => globalThis.crypto?.randomUUID?.() || `dc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const empty = () => ({ version: 1, leagues: [] });
  function rules(value = {}) {
    const result = { ...defaults, ...value };
    if (!["awards", "seconds"].includes(result.mode) || !["time", "score"].includes(result.basis) || !["split", "full"].includes(result.ties)) throw new Error("Invalid points rules.");
    for (const k of ["q1", "q2", "q3", "q4", "p5", "p6", "p7", "p8", "p9", "extra", "half", "ot", "total"]) if (!Number.isFinite(result[k]) || result[k] < 0 || result[k] > 10000) throw new Error("Award points must be between 0 and 10,000.");
    return result;
  }
  function createLeague(store, name) {
    name = String(name).trim().slice(0, 80); if (!name) throw new Error("Enter a league name.");
    const league = { id: id(), name, members: [], seasons: [] }; store.leagues.push(league); return league;
  }
  function createSeason(league, label) {
    label = String(label).trim().slice(0, 60); if (!label) throw new Error("Enter a season name or year.");
    if (league.seasons.some(s => s.label.toLowerCase() === label.toLowerCase())) throw new Error("That season already exists in this league.");
    const season = { id: id(), label, rules: { ...defaults }, entries: [] }; league.seasons.push(season); return season;
  }
  function member(league, name) {
    name = String(name).trim().slice(0, 60); if (!name) return null;
    let value = league.members.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (!value) { value = { id: id(), name }; league.members.push(value); }
    return value;
  }
  function addGame(league, season, eventId, week, names = [], snapshot = null) {
    if (!/^\d{6,12}$/.test(String(eventId))) throw new Error("Track a real game before adding it to a league.");
    week = String(week).trim().slice(0, 40); if (!week) throw new Error("Enter a week (for example 1, 2, or Playoffs).");
    const sport = snapshot?.league || "nfl"; E.profile(sport);
    if (season.entries.some(e => e.eventId === String(eventId) && (e.sport || "nfl") === sport)) throw new Error("This game is already in this league's season. Open it below to edit its week or lineup.");
    const entry = { id: id(), eventId: String(eventId), sport, week, assignments: Array.from({ length: 10 }, (_, n) => member(league, names[n] || "")?.id || null), snapshot,
      updatedAt: snapshot ? new Date().toISOString() : null, error: "", verifiedOT: false, rules: null };
    season.entries.push(entry); return entry;
  }
  const lineup = (league, entry) => entry.assignments.map(key => league.members.find(m => m.id === key)?.name || "");
  function scopes(game) {
    const p = E.profile(game), count = p.unit === "outs" ? Math.max(9, game.period) : p.count;
    return [...Array.from({ length: count }, (_, i) => ({ key: `q${i + 1}`, label: E.periodLabel(game, i + 1), start: i * p.length, end: (i + 1) * p.length, pointsKey: i < 4 ? `q${i + 1}` : i < 9 ? `p${i + 1}` : "extra", period: i + 1 })),
      ...(p.halfAfter ? [{ key: "half", label: "First half", start: 0, end: p.halfAfter * p.length, pointsKey: "half", period: p.halfAfter }] : []),
      ...(p.unit !== "outs" ? [{ key: "ot", label: "OT", start: E.regulation(game), end: Infinity, pointsKey: "ot", period: Infinity }] : []),
      { key: "total", label: "Game", start: 0, end: Infinity, pointsKey: "total", period: Infinity }];
  }
  function periodAwards(league, entry, settings) {
    if (!entry.snapshot) return [];
    const game = entry.snapshot, tally = E.tally(game), policy = rules({ ...settings, ...entry.rules }), p = E.profile(game);
    return scopes(game).map(scope => {
      const done = scope.key === "total" || scope.key === "ot" ? game.completed : p.unit === "outs" ? (game.completedPeriods || 0) >= scope.period : game.through >= scope.end;
      const exists = !game.pre && (scope.key === "total" ? game.through > 0 || game.completed : scope.key === "ot" && game.untimedPhase ? game.period > p.count : game.through > scope.start || (done && scope.key !== "ot"));
      const warnings = (game.warnings || []).filter(w => !(entry.verifiedOT && /overtime/i.test(w)) && !((scope.key.startsWith("q") || scope.key === "half") && /overtime/i.test(w)));
      const verified = done && !warnings.length && !entry.error;
      const secondsFor = row => scope.key.startsWith("q") ? row.quarters[Number(scope.key.slice(1)) - 1] || 0 : row[scope.key];
      let winners = [], winningSeconds = 0, scoreDigit = 0;
      const maxPeriod = scope.period;
      for (const event of game.events) if (event.at <= Math.min(scope.end, game.through) && event.period <= maxPeriod) scoreDigit = E.digit(event.home + event.away);
      if (exists && policy.basis === "score") {
        winners = [entry.assignments[scoreDigit] || null];
      } else if (exists) {
        // Aggregate multiple digits belonging to one player. Unassigned digits still compete.
        const buckets = new Map();
        tally.rows.forEach(row => {
          const key = entry.assignments[row.digit] || `unassigned-${row.digit}`;
          buckets.set(key, (buckets.get(key) || 0) + secondsFor(row));
        });
        winningSeconds = Math.max(0, ...buckets.values());
        if (winningSeconds > 0) winners = [...buckets].filter(([, value]) => value === winningSeconds).map(([key]) => league.members.some(m => m.id === key) ? key : null);
      }
      const points = policy[scope.pointsKey];
      return { ...scope, done, exists, verified, winners, winningSeconds, scoreDigit, points,
        perWinner: points / (policy.ties === "split" ? winners.length || 1 : 1),
        reason: entry.error ? "Feed stale" : warnings.length ? "Review feed warnings" : done ? "Confirmed" : "In progress" };
    });
  }
  function standings(league, season, week = "") {
    const policy = rules(season.rules);
    const rows = new Map(league.members.map(m => [m.id, { id: m.id, name: m.name, points: 0, projected: 0, seconds: 0, outs: 0, confirmedOuts: 0, confirmedSeconds: 0, quarterWins: 0, gameWins: 0, appearances: 0 }]));
    const entries = season.entries.filter(e => !week || e.week === week);
    entries.forEach(entry => {
      if (!entry.snapshot) return;
      const tally = E.tally(entry.snapshot), awards = periodAwards(league, entry, policy);
      const finalAward = awards.find(a => a.key === "total");
      const played = new Set();
      tally.rows.forEach(row => {
        const record = rows.get(entry.assignments[row.digit]); if (!record) return;
        const baseball = E.profile(entry.snapshot).unit === "outs";
        played.add(record.id); record[baseball ? "outs" : "seconds"] += row.total;
        if (finalAward?.verified) record[baseball ? "confirmedOuts" : "confirmedSeconds"] += row.total;
        if (policy.mode === "seconds") { record.projected += row.total; if (finalAward?.verified) record.points += row.total; }
      });
      played.forEach(key => rows.get(key).appearances++);
      awards.filter(a => a.exists).forEach(award => award.winners.forEach(key => {
        const record = rows.get(key); if (!record) return;
        if (policy.mode === "awards") { record.projected += award.perWinner; if (award.verified) record.points += award.perWinner; }
        if (award.verified && award.key.startsWith("q")) record.quarterWins++;
        if (award.verified && award.key === "total") record.gameWins++;
      }));
    });
    const sorted = [...rows.values()].sort((a, b) => b.points - a.points || b.seconds - a.seconds || a.name.localeCompare(b.name));
    sorted.forEach((row, n) => { row.rank = n && sorted[n - 1].points === row.points ? sorted[n - 1].rank : n + 1; });
    return { rows: sorted, entries, pending: entries.filter(e => !e.snapshot || e.error || !periodAwards(league, e, policy).find(a => a.key === "total")?.verified).length };
  }
  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.leagues) || value.leagues.length > 100) throw new Error("Not a supported Digit Clock league backup.");
    const identifiers = new Set();
    function checkId(value) { if (typeof value !== "string" || !value || value.length > 100 || identifiers.has(value)) throw new Error("Invalid or duplicate backup ID."); identifiers.add(value); }
    function text(value, max) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid backup label."); }
    for (const league of value.leagues) {
      checkId(league.id); text(league.name, 80);
      if (!Array.isArray(league.members) || league.members.length > 1000 || !Array.isArray(league.seasons) || league.seasons.length > 100) throw new Error("Invalid league roster or seasons.");
      league.members.forEach(m => { checkId(m.id); text(m.name, 60); });
      const members = new Set(league.members.map(m => m.id));
      for (const season of league.seasons) {
        checkId(season.id); text(season.label, 60); rules(season.rules);
        if (!Array.isArray(season.entries) || season.entries.length > 1000) throw new Error("Invalid season game list.");
        const events = new Set();
        for (const entry of season.entries) {
          checkId(entry.id); text(entry.week, 40); if (entry.rules) rules({ ...season.rules, ...entry.rules });
          E.profile(entry.sport || "nfl");
          const eventKey = `${entry.sport || "nfl"}:${entry.eventId}`;
          if (!/^\d{6,12}$/.test(entry.eventId) || events.has(eventKey)) throw new Error("Invalid or duplicate game in season.");
          events.add(eventKey);
          if (!Array.isArray(entry.assignments) || entry.assignments.length !== 10 || entry.assignments.some(m => m !== null && !members.has(m))) throw new Error("Invalid lineup assignment.");
          if (entry.snapshot) {
            const g = entry.snapshot;
            if ((g.league || "nfl") !== (entry.sport || "nfl") || g.id !== entry.eventId || !Number.isFinite(g.through) || g.through < 0 || g.through > 100000 || !Array.isArray(g.events) || g.events.length > 3000 || !Array.isArray(g.warnings) || typeof g.home !== "string" || typeof g.away !== "string" || !Number.isInteger(g.homeScore) || !Number.isInteger(g.awayScore) || typeof g.completed !== "boolean") throw new Error("Invalid saved game snapshot.");
            let last = 0;
            for (const p of g.events) { if (!Number.isFinite(p.at) || p.at < last || p.at > g.through || !Number.isInteger(p.home) || !Number.isInteger(p.away) || p.home < 0 || p.away < 0) throw new Error("Invalid scoring timeline."); last = p.at; }
          }
        }
      }
    }
    return value;
  }
  const api = { defaults, formats, empty, rules, createLeague, createSeason, member, addGame, lineup, periodAwards, standings, validate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DigitClockCompetition = api;
})(typeof window === "undefined" ? globalThis : window);
