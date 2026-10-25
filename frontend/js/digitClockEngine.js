(function (root) {
  "use strict";
  const digit = score => ((score % 10) + 10) % 10;
  const seconds = value => {
    const match = String(value ?? "").match(/^(\d{1,2}):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const time = n => `${Math.floor(Math.max(0, n) / 60)}:${String(Math.floor(Math.max(0, n) % 60)).padStart(2, "0")}`;
  function periodLength(period, postseason) { return period <= 4 || postseason ? 900 : 600; }
  function periodStart(period, postseason) { return period <= 4 ? (period - 1) * 900 : 3600 + (period - 5) * periodLength(period, postseason); }
  function elapsed(period, clock, postseason) {
    const remaining = seconds(clock);
    if (!Number.isInteger(period) || period < 1 || period > 30 || remaining === null || remaining > periodLength(period, postseason)) return null;
    return periodStart(period, postseason) + periodLength(period, postseason) - remaining;
  }
  function score(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(typeof value === "object" ? value.value : value);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }
  function normalize(payload) {
    const summary = payload.summary || payload;
    const competition = summary.header?.competitions?.[0];
    if (!competition) throw new Error("ESPN did not return a game.");
    const board = payload.scoreboardEvent?.competitions?.[0];
    const status = board?.status || payload.scoreboardEvent?.status || competition.status || {};
    const postseason = Number(summary.header?.season?.type) === 3;
    const competitors = board?.competitors || competition.competitors || [];
    const home = competitors.find(t => t.homeAway === "home");
    const away = competitors.find(t => t.homeAway === "away");
    const homeScore = score(home?.score), awayScore = score(away?.score);
    if (homeScore === null || awayScore === null) throw new Error("ESPN scoreboard scores are missing.");
    const raw = [...(summary.plays || []), ...(summary.drives?.previous || []).flatMap(d => d.plays || []), ...(summary.drives?.current?.plays || [])];
    const rawUnique = [...new Map(raw.map((p, i) => [String(p.id || `raw-${i}`), p])).values()];
    const warnings = [];
    const parse = (plays, source) => {
      const unique = [...new Map(plays.map((p, i) => [String(p.id || `${source}-${i}`), p])).values()];
      return unique.map((p, index) => ({ id: String(p.id || `${source}-${index}`), sequence: Number(p.sequenceNumber) || index,
        period: Number(p.period?.number), clock: p.clock?.displayValue,
        at: elapsed(Number(p.period?.number), p.clock?.displayValue, postseason),
        home: score(p.homeScore), away: score(p.awayScore), text: p.text || p.type?.text || "Score", source
      })).sort((a, b) => a.at - b.at || a.sequence - b.sequence);
    };
    const summaryScores = parse(summary.scoringPlays || [], "Scoring summary");
    const rawScores = parse(rawUnique.filter(p => p.scoringPlay === true), "Play-by-play");
    const valid = plays => plays.every(p => p.at !== null && p.home !== null && p.away !== null);
    const matches = plays => plays.length && plays.at(-1).home === homeScore && plays.at(-1).away === awayScore;
    // Prefer separate plays only when they cover the summary and reconcile to the scoreboard.
    const rawIds = new Set(rawScores.map(p => p.id));
    let events = valid(rawScores) && matches(rawScores) && summaryScores.every(p => rawIds.has(p.id)) ? rawScores : summaryScores;
    if (!valid(events)) throw new Error("A scoring play has no valid clock or score. Time totals cannot be verified.");
    let priorHome = 0, priorAway = 0;
    events.forEach(p => {
      const change = p.home + p.away - priorHome - priorAway;
      if (p.home < priorHome || p.away < priorAway || change > 8) warnings.push("Scoring history has a correction or gap. Time totals are provisional.");
      if (change >= 7 && /touchdown|\bTD\b/i.test(p.text)) p.bundled = true;
      priorHome = p.home; priorAway = p.away;
    });
    const completed = status.type?.completed === true;
    const pre = status.type?.state === "pre";
    const timedPlays = parse(rawUnique.filter(p => p.clock?.displayValue && p.period?.number), "Play-by-play").filter(p => p.at !== null);
    const latest = timedPlays.at(-1);
    let period = Number(status.period) || latest?.period || events.at(-1)?.period || 1;
    let clock = status.displayClock;
    let through = pre ? 0 : elapsed(period, clock, postseason);
    if (completed && period <= 4) { period = 4; clock = "0:00"; through = 3600; }
    if (completed && period > 4) {
      // Some final status records reset the clock to 0:00 after an early OT finish.
      const meaningful = timedPlays.filter(p => !/end of (game|period|quarter)|end game/i.test(p.text)).at(-1);
      const ending = meaningful?.period >= 5 ? meaningful : events.at(-1);
      if (ending?.period >= 5) { through = ending.at; clock = ending.clock; }
      warnings.push("Overtime ends at the last reported substantive play; verify the final clock before awarding time prizes.");
    }
    if (through === null || through === undefined) {
      through = latest?.at ?? events.at(-1)?.at ?? 0;
      clock = latest?.clock || events.at(-1)?.clock || "15:00";
      warnings.push("Live clock unavailable; totals stop at the last reported play.");
    }
    if (completed && period > 4 && !status.displayClock) warnings.push("Overtime final clock is based on the last reported play; verify before awarding time prizes.");
    const last = events.at(-1);
    if ((last?.home || 0) !== homeScore || (last?.away || 0) !== awayScore) warnings.push("Scoring plays have not caught up to the scoreboard. Time totals are provisional.");
    if (last && last.at > through) { through = last.at; warnings.push("Score and clock are out of sync. Time totals are provisional."); }
    const detail = status.type?.detail || status.type?.description || "Waiting for ESPN";
    const lastPlay = rawUnique.slice().sort((a, b) => Number(a.sequenceNumber || 0) - Number(b.sequenceNumber || 0)).at(-1);
    const conversionPending = /touchdown/i.test(lastPlay?.type?.text || "") && !/extra point|PAT |two.point|2.point|kick\)/i.test(lastPlay?.text || "");
    return { id: String(competition.id), home: home?.team?.displayName || "Home", away: away?.team?.displayName || "Away",
      homeScore, awayScore, period, clock, through, completed, pre, postseason, detail, events,
      conversionPending, warnings: [...new Set(warnings)], fetchedAt: payload.fetchedAt };
  }
  function tally(game) {
    const rows = Array.from({ length: 10 }, (_, n) => ({ digit: n, total: 0, half: 0, ot: 0, quarters: [0, 0, 0, 0] }));
    let cursor = 0, holder = 0, lastChange = 0;
    const history = [];
    function credit(end) {
      while (cursor < end) {
        const period = cursor < 3600 ? Math.floor(cursor / 900) + 1 : 5 + Math.floor((cursor - 3600) / periodLength(5, game.postseason));
        const stop = Math.min(end, periodStart(period, game.postseason) + periodLength(period, game.postseason));
        const amount = stop - cursor;
        rows[holder].total += amount;
        if (period <= 4) rows[holder].quarters[period - 1] += amount; else rows[holder].ot += amount;
        if (period <= 2) rows[holder].half += amount;
        cursor = stop;
      }
    }
    game.events.forEach(p => {
      if (p.at > game.through) return;
      const before = holder;
      credit(p.at);
      holder = digit(p.home + p.away);
      history.push({ ...p, before, holder, held: p.at - lastChange });
      lastChange = p.at;
    });
    credit(game.through);
    return { rows, history, holder: digit(game.homeScore + game.awayScore), timedHolder: holder, stretch: game.through - lastChange };
  }
  const outcomes = [
    { label: "Touchdown", points: 6, kind: "score" },
    { label: "Made field goal", points: 3, kind: "score" },
    { label: "Safety", points: 2, kind: "score" },
    { label: "Made extra point", points: 1, kind: "conversion" },
    { label: "Missed extra point / failed conversion, no return score", points: 0, kind: "conversion" },
    { label: "Successful two-point conversion", points: 2, kind: "conversion" },
    { label: "Defensive conversion return", points: 2, kind: "conversion" },
    { label: "One-point conversion safety (rare)", points: 1, kind: "conversion" },
    { label: "Missed field goal, no return score", points: 0, kind: "attempt" },
    { label: "TD + made extra point", points: 7, kind: "combination" },
    { label: "TD + two-point conversion", points: 8, kind: "combination" },
    { label: "TD + missed conversion + FG", points: 9, kind: "combination" },
    { label: "TD + extra point + FG", points: 10, kind: "combination" },
    { label: "Two TDs + two made extra points", points: 14, kind: "combination" },
    { label: "Two TDs, both conversions fail", points: 12, kind: "combination" }
  ];
  function paths(total) {
    const units = [{ label: "TD + extra point", points: 7, key: "td7" }, { label: "TD + two-point conversion", points: 8, key: "td8" },
      { label: "TD + failed conversion", points: 6, key: "td6" }, { label: "Field goal", points: 3, key: "fg" }, { label: "Safety", points: 2, key: "safety" }];
    const result = Array.from({ length: 10 }, () => []);
    function walk(start, chosen, sum) {
      if (chosen.length) result[digit(total + sum)].push({ label: chosen.map(x => x.label).join(" + "), points: sum, events: chosen.length,
        needs: chosen.reduce((counts, unit) => { counts[unit.key] = (counts[unit.key] || 0) + 1; return counts; }, {}) });
      if (chosen.length === 3) return;
      for (let i = start; i < units.length; i++) walk(i, [...chosen, units[i]], sum + units[i].points);
    }
    walk(0, [], 0);
    return result.map(list => list.sort((a, b) => a.events - b.events || a.points - b.points));
  }
  const defaults = { td: 5, fg: 3, safety: 0.05, pat: 0.94, twoAttempt: 0.08, twoSuccess: 0.48, fgSuccess: 0.82 };
  function combinationProbability(needs, expected) {
    return Object.entries(needs).reduce((chance, [key, count]) => {
      const lambda = expected[key] || 0;
      let mass = Math.exp(-lambda), fewer = mass;
      for (let n = 1; n < count; n++) { mass *= lambda / n; fewer += mass; }
      return chance * Math.max(0, 1 - fewer);
    }, 1);
  }
  function probabilities(total, remainingSeconds, assumptions = defaults) {
    const a = { ...defaults, ...assumptions };
    for (const key of ["td", "fg", "safety"]) if (!Number.isFinite(a[key]) || a[key] < 0 || a[key] > 30) throw new Error("Scoring rates must be between 0 and 30 per 60 minutes.");
    for (const key of ["pat", "twoAttempt", "twoSuccess", "fgSuccess"]) if (!Number.isFinite(a[key]) || a[key] < 0 || a[key] > 1) throw new Error("Success rates must be between 0% and 100%.");
    const scale = Math.max(0, remainingSeconds) / 3600;
    const rates = [
      { points: 6, rate: a.td * ((1 - a.twoAttempt) * (1 - a.pat) + a.twoAttempt * (1 - a.twoSuccess)) },
      { points: 7, rate: a.td * (1 - a.twoAttempt) * a.pat },
      { points: 8, rate: a.td * a.twoAttempt * a.twoSuccess },
      { points: 3, rate: a.fg }, { points: 2, rate: a.safety }
    ];
    let distribution = Array(10).fill(0); distribution[digit(total)] = 1;
    // Independent Poisson scoring counts, convolved modulo ten. No random sampling.
    rates.forEach(({ points, rate }) => {
      const lambda = rate * scale;
      const counts = Array(10).fill(0);
      let mass = Math.exp(-lambda);
      for (let n = 0; n < 250; n++) {
        counts[digit(n * points)] += mass;
        mass *= lambda / (n + 1);
      }
      const next = Array(10).fill(0);
      distribution.forEach((p, i) => counts.forEach((q, j) => { next[digit(i + j)] += p * q; }));
      distribution = next;
    });
    const rate = a.td + a.fg + a.safety;
    const expected = Object.fromEntries(["td6", "td7", "td8", "fg", "safety"].map((key, i) => [key, rates[i].rate * scale]));
    return { final: distribution, expected, nextTD: rate ? a.td / rate : 0, nextFG: rate ? a.fg / rate : 0,
      nextSafety: rate ? a.safety / rate : 0, noMore: Math.exp(-rate * scale), assumptions: a };
  }
  const api = { digit, seconds, time, elapsed, periodLength, normalize, tally, paths, outcomes, probabilities, combinationProbability, defaults };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DigitClock = api;
})(typeof window === "undefined" ? globalThis : window);
