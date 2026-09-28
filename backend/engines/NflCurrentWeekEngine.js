/* =====================================================
   PATTC NFL CURRENT WEEK ENGINE R1

   Shared, scoring-neutral resolver for NFL games.
   Automatic mode ignores a stored numeric override unless the override
   mode is explicitly enabled. Schedule/result state is authoritative.
===================================================== */

function pattcNflWeekNumber_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(18, Math.floor(n))) : (fallback || 1);
}

function pattcNflWeekBool_(value) {
  if (value === true || value === 1) return true;
  const s = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on" || s === "override";
}

function pattcNflGameStartMs_(game) {
  game = game || {};
  const raw = game.GameDateTime || game.gameDateTime || game.StartTime || game.startTime ||
    game.DateTime || game.dateTime || game.Date || game.date || "";
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function pattcNflGameFinal_(game) {
  game = game || {};
  const truthy = function(v) {
    if (v === true || v === 1) return true;
    const s = String(v === undefined || v === null ? "" : v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  };
  const status = String(game.Status || game.status || game.GameStatus || game.gameStatus || game.State || game.state || "").toLowerCase();
  return truthy(game.Completed || game.completed || game.Final || game.final || game.IsFinal || game.isFinal) ||
    /(^|\b)(final|closed|complete|completed)(\b|$)/.test(status);
}

function pattcNflWeekSummary_(games) {
  const rows = Array.isArray(games) ? games : [];
  const starts = rows.map(pattcNflGameStartMs_).filter(function(ms) { return ms > 0; });
  return {
    exists: rows.length > 0,
    firstKickoffMs: starts.length ? Math.min.apply(Math, starts) : 0,
    lastKickoffMs: starts.length ? Math.max.apply(Math, starts) : 0,
    allFinal: rows.length > 0 && rows.every(pattcNflGameFinal_)
  };
}

/**
 * Resolve the current NFL week without using a stale manually stored week.
 *
 * options:
 *   mode: "auto" | "override"
 *   overrideWeek: 1..18
 *   startWeek/endWeek: optional bounds
 *   nowMs: optional deterministic test clock
 *   fetchWeek(week): returns normalized schedule/result rows
 *   fallbackWeek: used only if schedule data is unavailable
 *
 * Auto strategy:
 *  1. Read Week 1 to establish the season calendar.
 *  2. Estimate the calendar week from Week 1's first kickoff.
 *  3. Inspect the estimated week and the following week.
 *  4. When the estimated week is fully final and the next week exists,
 *     advance immediately. Scoring settlement state is never consulted.
 */
function pattcNflResolveCurrentWeek_(options) {
  options = options || {};
  const mode = String(options.mode || "auto").trim().toLowerCase();
  const startWeek = pattcNflWeekNumber_(options.startWeek || 1, 1);
  const endWeek = Math.max(startWeek, pattcNflWeekNumber_(options.endWeek || 18, 18));
  const overrideWeek = pattcNflWeekNumber_(options.overrideWeek || startWeek, startWeek);
  if (mode === "override") {
    return { week: Math.max(startWeek, Math.min(endWeek, overrideWeek)), mode: "override", source: "explicit-admin-override" };
  }

  const now = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const fetchWeek = typeof options.fetchWeek === "function" ? options.fetchWeek : function() { return []; };
  const cache = {};
  const get = function(week) {
    week = Math.max(startWeek, Math.min(endWeek, pattcNflWeekNumber_(week, startWeek)));
    if (!Object.prototype.hasOwnProperty.call(cache, week)) {
      let rows = [];
      try { rows = fetchWeek(week) || []; } catch (err) { rows = []; }
      cache[week] = pattcNflWeekSummary_(rows);
    }
    return cache[week];
  };

  const week1 = get(startWeek);
  let estimated = pattcNflWeekNumber_(options.fallbackWeek || startWeek, startWeek);
  if (week1.firstKickoffMs) {
    // NFL weeks are schedule-week buckets. The estimate deliberately uses
    // kickoff cadence only as a locator; final-state below performs advancement.
    const elapsed = now - week1.firstKickoffMs;
    estimated = elapsed < 0 ? startWeek : startWeek + Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
  }
  estimated = Math.max(startWeek, Math.min(endWeek, estimated));

  // Correct a calendar estimate that lands one week early/late around boundaries.
  let current = estimated;
  const currentSummary = get(current);
  if (current > startWeek && currentSummary.firstKickoffMs && now < currentSummary.firstKickoffMs) {
    const prior = get(current - 1);
    if (prior.exists && !prior.allFinal) current--;
  }

  const summary = get(current);
  if (current < endWeek) {
    const next = get(current + 1);
    if (summary.allFinal && next.exists) current++;
  }

  return {
    week: current,
    mode: "auto",
    source: week1.exists ? "nfl-schedule-state" : "fallback",
    scheduleAvailable: week1.exists || get(current).exists
  };
}
