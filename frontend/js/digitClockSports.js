(function (root) {
  "use strict";
  const E = typeof module !== "undefined" && module.exports ? require("./digitClockEngine.js") : root.DigitClock;
  const nflNormalize = E.normalize, nflTally = E.tally;
  const profiles = {
    nfl: { label: "NFL", sport: "football", path: "football/nfl", count: 4, length: 900, ot: 600, playoffOT: 900, halfAfter: 2, kind: "quarter", unit: "seconds", scoring: [6, 3, 2, 1] },
    cfb: { label: "College Football", sport: "football", path: "football/college-football", count: 4, length: 900, ot: 0, halfAfter: 2, kind: "quarter", unit: "seconds", scoring: [6, 3, 2, 1] },
    nba: { label: "NBA", sport: "basketball", path: "basketball/nba", count: 4, length: 720, ot: 300, halfAfter: 2, kind: "quarter", unit: "seconds", scoring: [1, 2, 3] },
    wnba: { label: "WNBA", sport: "basketball", path: "basketball/wnba", count: 4, length: 600, ot: 300, halfAfter: 2, kind: "quarter", unit: "seconds", scoring: [1, 2, 3] },
    ncaam: { label: "College Basketball · Men", sport: "basketball", path: "basketball/mens-college-basketball", count: 2, length: 1200, ot: 300, halfAfter: 1, kind: "half", unit: "seconds", scoring: [1, 2, 3] },
    ncaaw: { label: "College Basketball · Women", sport: "basketball", path: "basketball/womens-college-basketball", count: 4, length: 600, ot: 300, halfAfter: 2, kind: "quarter", unit: "seconds", scoring: [1, 2, 3] },
    mlb: { label: "MLB", sport: "baseball", path: "baseball/mlb", count: 9, length: 6, ot: 6, halfAfter: 0, kind: "inning", unit: "outs", scoring: [1, 2, 3, 4] },
    nhl: { label: "NHL", sport: "hockey", path: "hockey/nhl", count: 3, length: 1200, ot: 300, playoffOT: 1200, halfAfter: 0, kind: "period", unit: "seconds", scoring: [1] }
  };
  function profile(game = {}) { const key = typeof game === "string" ? game : game.league || "nfl"; if (!profiles[key]) throw new Error("Unsupported sport / league."); return profiles[key]; }
  function clockSeconds(value) {
    const text = String(value ?? "");
    const full = text.match(/^(\d{1,2}):([0-5]\d(?:\.\d{1,3})?)$/);
    if (full) return Number(full[1]) * 60 + Number(full[2]);
    if (/^\d{1,2}(?:\.\d{1,3})?$/.test(text) && Number(text) < 60) return Number(text);
    return null;
  }
  const regulation = game => { const p = profile(game); return p.count * p.length; };
  const overtimeLength = game => { const p = profile(game); return game.postseason && p.playoffOT ? p.playoffOT : p.ot; };
  const start = (game, period) => { const p = profile(game); return period <= p.count ? (period - 1) * p.length : regulation(game) + (period - p.count - 1) * overtimeLength(game); };
  function at(game, period, clock, elapsedClock = false) {
    const p = profile(game), length = period <= p.count ? p.length : overtimeLength(game);
    if (!Number.isInteger(period) || period < 1 || period > 100) return null;
    if (!length) return regulation(game);
    if (game.league === "nhl" && !game.postseason && period >= 5) return regulation(game) + overtimeLength(game);
    const value = clockSeconds(clock); if (value === null || value > length) return null;
    return start(game, period) + (elapsedClock ? value : length - value);
  }
  function format(game, value) {
    if (profile(game).unit === "outs") return `${Number(value.toFixed(2))} outs`;
    const rounded = Math.max(0, Math.round(value * 10) / 10), minutes = Math.floor(rounded / 60), seconds = Math.round((rounded % 60) * 10) / 10;
    return `${minutes}:${(Number.isInteger(seconds) ? String(seconds).padStart(2, "0") : seconds.toFixed(1).padStart(4, "0"))}`;
  }
  const periodLabel = (game, n) => {
    const p = profile(game);
    return p.unit === "outs" ? `Inning ${n}` : n > p.count ? (game.league === "nhl" && !game.postseason && n >= 5 ? "Shootout" : `OT${n - p.count}`) : p.kind === "quarter" ? `Q${n}` : p.kind === "half" ? `Half ${n}` : `Period ${n}`;
  };
  function normalize(payload, selected = "nfl") {
    const league = payload.league || selected;
    const p = profile(league);
    if (league === "nfl") return { ...nflNormalize(payload), league, unit: p.unit };
    const summary = payload.summary || payload, comp = summary.header?.competitions?.[0];
    if (!comp) throw new Error("ESPN did not return a game.");
    const board = payload.scoreboardEvent?.competitions?.[0], status = board?.status || payload.scoreboardEvent?.status || comp.status || {};
    const competitors = board?.competitors || comp.competitors || [];
    const home = competitors.find(t => t.homeAway === "home"), away = competitors.find(t => t.homeAway === "away");
    const score = value => value === null || value === undefined || value === "" || !Number.isInteger(Number(value)) || Number(value) < 0 ? null : Number(value);
    const homeScore = score(home?.score), awayScore = score(away?.score);
    if (homeScore === null || awayScore === null) throw new Error("ESPN scoreboard scores are missing.");
    const game = { id: String(comp.id), league, unit: p.unit, home: home.team?.displayName || "Home", away: away.team?.displayName || "Away", homeScore, awayScore,
      postseason: Number(summary.header?.season?.type) === 3, completed: status.type?.completed === true, pre: status.type?.state === "pre", detail: status.type?.detail || status.type?.description || "Waiting for ESPN", warnings: [], fetchedAt: payload.fetchedAt, conversionPending: false };
    const raw = [...(summary.plays || []), ...(summary.drives?.previous || []).flatMap(d => d.plays || []), ...(summary.drives?.current?.plays || [])];
    const unique = [...new Map(raw.map((play, i) => [String(play.id || `raw-${i}`), play])).values()];
    let lastHalf = "Top";
    const parsed = unique.map((play, index) => {
      const period = Number(play.period?.number);
      let location = play.period?.type || "";
      if (["Top", "Bottom"].includes(location)) lastHalf = location;
      let outs = Number.isInteger(play.outs) && play.outs >= 0 && play.outs <= 3 ? play.outs : null;
      if (p.unit === "outs" && location === "End") { location = lastHalf; outs = 3; }
      const position = p.unit === "outs" ? Number.isInteger(period) && outs !== null && ["Top", "Bottom"].includes(location) ? (period - 1) * 6 + (location === "Bottom" ? 3 : 0) + outs : null : at(game, period, play.clock?.displayValue, league === "nhl");
      return { id: String(play.id || `raw-${index}`), sequence: index, period, clock: play.clock?.displayValue || "", at: position, home: score(play.homeScore), away: score(play.awayScore),
        text: play.text || play.type?.text || "Score", source: "Play-by-play", scoring: play.scoringPlay === true, location, outs, type: play.type?.text || "", wallclock: play.wallclock || "" };
    });
    let scoring = parsed.filter(play => play.scoring && !(league === "nhl" && !game.postseason && play.period >= 5));
    if (!scoring.length && summary.scoringPlays?.length) scoring = summary.scoringPlays.map((play, index) => ({ id: String(play.id || index), sequence: index, period: Number(play.period?.number), clock: play.clock?.displayValue,
      at: at(game, Number(play.period?.number), play.clock?.displayValue, league === "nhl"), home: score(play.homeScore), away: score(play.awayScore), text: play.text || "Score", source: "Scoring summary" }));
    if (scoring.some(play => play.at === null || play.home === null || play.away === null)) throw new Error("A scoring play has no valid clock / outs or score. Totals cannot be verified.");
    scoring.sort((a, b) => a.at - b.at || a.sequence - b.sequence);
    let prevHome = 0, prevAway = 0;
    game.events = scoring.filter(play => {
      if (play.home === prevHome && play.away === prevAway) return false;
      if (play.home < prevHome || play.away < prevAway || play.home + play.away - prevHome - prevAway > (p.sport === "football" ? 8 : p.sport === "baseball" ? 4 : p.sport === "basketball" ? 4 : 1)) game.warnings.push("Scoring history has a correction or gap. Totals are provisional.");
      prevHome = play.home; prevAway = play.away; return true;
    });
    const valid = parsed.filter(play => play.at !== null);
    const latest = valid.at(-1);
    game.period = Number(status.period) || latest?.period || game.events.at(-1)?.period || 1;
    game.clock = status.displayClock;
    game.untimedPhase = league === "cfb" && game.period > p.count || league === "nhl" && !game.postseason && game.period >= 5;
    if (p.unit === "outs") {
      const situation = board?.situation || summary.situation;
      const outs = situation?.outs;
      const type = String(status.type?.detail || "");
      const bottom = /bot|bottom|mid/i.test(type);
      game.through = game.pre ? 0 : Number.isInteger(outs) && !game.completed ? (game.period - 1) * 6 + (bottom ? 3 : 0) + outs : latest?.at ?? 0;
      game.clock = `${latest?.location || ""} ${game.period} · ${latest?.outs ?? 0} outs`;
      game.completedPeriods = game.completed ? game.period : Math.floor(game.through / 6);
    } else {
      game.through = game.pre ? 0 : at(game, game.period, game.clock);
      if (game.completed && game.period <= p.count) { game.period = p.count; game.clock = "0:00"; game.through = regulation(game); }
      else if (game.completed && p.sport === "basketball") { game.clock = "0:00"; game.through = start(game, game.period) + overtimeLength(game); }
      else if (game.completed && league === "nhl" && game.period > p.count && (game.postseason || game.period === 4)) {
        const ending = game.events.filter(play => play.period === game.period).at(-1);
        game.through = ending?.at ?? latest?.at; game.clock = ending?.clock || latest?.clock;
        if (!ending) game.warnings.push("Overtime final clock requires review.");
      }
      if (game.through === null || game.through === undefined) { game.through = latest?.at ?? game.events.at(-1)?.at ?? 0; game.clock = latest?.clock || ""; game.warnings.push("Live clock unavailable; totals stop at the last reported play."); }
      if (game.untimedPhase) { game.through = league === "cfb" ? regulation(game) : regulation(game) + overtimeLength(game); game.clock = league === "cfb" ? "Untimed OT" : "Shootout"; }
    }
    const last = game.events.at(-1);
    if (last && last.at > game.through) { game.through = last.at; game.warnings.push("Score and clock are out of sync. Totals are provisional."); }
    if ((last?.home || 0) !== homeScore || (last?.away || 0) !== awayScore) {
      if (league === "nhl" && !game.postseason && game.period >= 5 && game.completed && homeScore + awayScore - (last?.home || 0) - (last?.away || 0) === 1) {
        game.events.push({ id: "shootout-result", sequence: Infinity, period: 5, clock: "SO", at: game.through, home: homeScore, away: awayScore, text: "Official shootout result (+1 winning goal); no game-clock time", source: "Final scoreboard", untimed: true });
      } else game.warnings.push("Scoring plays have not caught up to the scoreboard. Totals are provisional.");
    }
    if (!game.events.length && homeScore + awayScore) game.warnings.push("Scoring history unavailable.");
    if (p.unit === "outs" && !valid.length && !game.pre) game.warnings.push("Play-by-play out counts unavailable; outs totals are provisional.");
    game.warnings = [...new Set(game.warnings)];
    return game;
  }
  function tally(game) {
    if (!game.league || game.league === "nfl") return nflTally(game);
    const p = profile(game), reg = regulation(game), ot = overtimeLength(game);
    const rows = Array.from({ length: 10 }, (_, digit) => ({ digit, total: 0, half: 0, ot: 0, quarters: Array(Math.max(4, p.count, p.unit === "outs" ? game.period : 0)).fill(0) }));
    let cursor = 0, holder = 0, lastChange = 0;
    const history = [];
    function credit(end) {
      while (cursor < end) {
        const period = p.unit === "outs" ? Math.floor(cursor / 6) + 1 : cursor < reg ? Math.floor(cursor / p.length) + 1 : p.count + 1 + Math.floor((cursor - reg) / (ot || 1));
        const boundary = p.unit === "outs" ? period * 6 : period <= p.count ? period * p.length : reg + (period - p.count) * ot;
        if (boundary <= cursor) break;
        const stop = Math.min(end, boundary), units = stop - cursor;
        rows[holder].total += units;
        if (p.unit === "outs" || period <= p.count) { if (rows[holder].quarters[period - 1] === undefined) rows[holder].quarters[period - 1] = 0; rows[holder].quarters[period - 1] += units; }
        if (period > p.count && p.unit !== "outs") rows[holder].ot += units;
        if (p.halfAfter && period <= p.halfAfter) rows[holder].half += units;
        cursor = stop;
      }
    }
    game.events.forEach(play => { if (play.at > game.through) return; const before = holder; credit(play.at); holder = E.digit(play.home + play.away); history.push({ ...play, before, holder, held: play.at - lastChange }); lastChange = play.at; });
    credit(game.through);
    return { rows, history, holder: E.digit(game.homeScore + game.awayScore), timedHolder: holder, stretch: game.through - lastChange };
  }
  function outcomesFor(game) {
    const p = profile(game);
    if (p.sport === "football") return E.outcomes;
    const values = p.sport === "basketball" ? [["Made free throw", 1], ["Made two-point shot", 2], ["Made three-point shot", 3], ["Three-point play (basket + free throw)", 3], ["Four-point play (three + free throw)", 4], ["Missed shot / free throw", 0]] :
      p.sport === "hockey" ? [["Goal (even strength, power play, shorthanded, or empty net)", 1], ["Two goals", 2], ["Three goals", 3], ["No goal", 0]] :
      [["One run (any scoring play)", 1], ["Two-run scoring play", 2], ["Three-run scoring play", 3], ["Four runs / grand slam", 4], ["No runs", 0]];
    return values.map(([label, points], index) => ({ label, points, kind: "score", modelKey: points && index < p.scoring.length ? `v${points}` : null }));
  }
  function pathsFor(game, total) {
    const p = profile(game); if (p.sport === "football") return E.paths(total);
    const units = p.sport === "basketball" ? [["Free throw", 1], ["Two-point basket", 2], ["Three-point basket", 3]] : p.sport === "hockey" ? [["Goal", 1]] : [["One run", 1], ["Two-run play", 2], ["Three-run play", 3], ["Four-run play", 4]];
    const result = Array.from({ length: 10 }, () => []);
    const max = p.sport === "hockey" ? 10 : 4;
    function walk(start, labels, sum) {
      if (labels.length) result[E.digit(total + sum)].push({ label: labels.map(x => x[0]).join(" + "), points: sum, events: labels.length, needs: labels.reduce((counts, unit) => { const key = `v${unit[1]}`; counts[key] = (counts[key] || 0) + 1; return counts; }, {}) });
      if (labels.length === max) return;
      for (let i = start; i < units.length; i++) walk(i, [...labels, units[i]], sum + units[i][1]);
    }
    walk(0, [], 0); return result.map(list => list.sort((a, b) => a.events - b.events || a.points - b.points));
  }
  function sportModelFields(game) {
    const p = profile(game);
    const base = p.sport === "basketball" ? [[1, "Made free throws", 24], [2, "Made two-point baskets", 55], [3, "Made three-point baskets", 20]] : p.sport === "baseball" ? [[1, "One-run plays", 5], [2, "Two-run plays", 1], [3, "Three-run plays", 0.25], [4, "Four-run plays", 0.1]] : [[1, "Goals", 6]];
    return base.map(([points, label, rate]) => ({ key: `v${points}`, points, label: `${label} / regulation game`, rate }));
  }
  function sportProbabilities(game, remaining, values = {}) {
    const fields = sportModelFields(game), scale = Math.max(0, remaining) / regulation(game);
    let distribution = Array(10).fill(0); distribution[E.digit(game.homeScore + game.awayScore)] = 1;
    const expected = {}, next = {}, rates = fields.map(f => {
      const rate = values[f.key] ?? f.rate;
      if (!Number.isFinite(rate) || rate < 0 || rate > 300) throw new Error("Scoring rates must be between 0 and 300 per regulation game.");
      return { ...f, rate };
    });
    const sumRate = rates.reduce((n, r) => n + r.rate, 0);
    rates.forEach(f => {
      const lambda = f.rate * scale; expected[f.key] = lambda; next[f.key] = sumRate ? f.rate / sumRate : 0;
      const chunks = Math.max(1, Math.ceil(lambda / 20)), step = lambda / chunks;
      const counts = Array(10).fill(0); let mass = Math.exp(-step);
      for (let n = 0; n < 160; n++) { counts[E.digit(n * f.points)] += mass; mass *= step / (n + 1); }
      for (let chunk = 0; chunk < chunks; chunk++) {
        const combined = Array(10).fill(0);
        distribution.forEach((p, i) => counts.forEach((q, j) => { combined[E.digit(i + j)] += p * q; }));
        distribution = combined;
      }
    });
    return { final: distribution, expected, next, noMore: Math.exp(-sumRate * scale) };
  }
  Object.assign(E, { profiles, profile, clockSeconds, regulation, overtimeLength, periodStartFor: start, elapsedFor: at, formatProgress: format, periodLabel, normalize, tally, outcomesFor, pathsFor, sportModelFields, sportProbabilities });
  if (typeof module !== "undefined" && module.exports) module.exports = E;
})(typeof window === "undefined" ? globalThis : window);
