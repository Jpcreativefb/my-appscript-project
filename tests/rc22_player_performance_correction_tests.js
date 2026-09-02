"use strict";

const fs = require("fs");
const vm = require("vm");
const cp = require("child_process");

const BASELINE = "7b5718efb93b3ca6baf802b12f43dedaf899bfea";
const RC22_COMMIT = "7c20e341341acdf0982b6d6580f7a84bcac987b5";
const EXPECTED_CHANGED = [
  "backend/Api.js",
  "frontend/js/app.js",
  "frontend/app.js",
  "backend/engines/SportsTeamFantasyEngine.js",
  "tests/rc22_player_performance_correction_tests.js"
].sort();

let assertions = 0;
function ok(value, message) {
  assertions += 1;
  if (!value) throw new Error("FAIL: " + message);
}

function read(rel) {
  return fs.readFileSync(rel, "utf8");
}

function git(args) {
  return cp.execFileSync("git", args, { encoding: "utf8" }).trimEnd();
}

function extractFunction(text, name) {
  const marker = "function " + name + "(";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("Function not found: " + name);
  const brace = text.indexOf("{", start);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = brace; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1] || "";

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced function: " + name);
}

function baseline(rel) {
  return cp.execFileSync(
    "git",
    ["show", BASELINE + ":" + rel],
    { encoding: "utf8" }
  );
}

const backendApi = read("backend/Api.js");
const appJs = read("frontend/js/app.js");
const appMirror = read("frontend/app.js");
const engine = read("backend/engines/SportsTeamFantasyEngine.js");
const dashboard = read("frontend/js/pages/dashboard.js");
const appData = read("backend/engines/AppDataEngine.js");
const authFrontend = read("frontend/js/auth.js");

// Historical RC22 correction isolation.
// Validate the immutable RC22 correction commit rather than the current
// working tree so later feature branches can run production regression gates.
const changed = git([
  "diff-tree",
  "--no-commit-id",
  "--name-only",
  "-r",
  RC22_COMMIT
])
  .split(/\n/)
  .filter(Boolean)
  .sort();

ok(JSON.stringify(changed) === JSON.stringify(EXPECTED_CHANGED),
  "RC22 commit preserves exact five-file changed scope");
ok(appJs === appMirror, "frontend app mirrors remain identical");
ok(!changed.some(p => /sports.*scores.*engine/i.test(p) || /external-engines\/sports/i.test(p)),
  "RC22 commit changed no Sports Scores Engine file");

// P0-1: Login -> Home.
ok(backendApi.includes('fastStartup:\n            params.fastStartup === true ||'),
  "Dashboard route forwards fastStartup");
ok(backendApi.includes('String(params.fastStartup || "")'),
  "Dashboard route strictly normalizes POST/string fastStartup");
ok(dashboard.includes('apiGetDashboardGamesHub({ fastStartup: true })'),
  "Home still requests compact startup");
ok(appData.includes('const fastStartup = payload.fastStartup === true;'),
  "existing Dashboard compact branch remains");

const dashboardFn = extractFunction(appData, "apiGetDashboardGamesHub");
ok(dashboardFn.includes("validateUserSession_("),
  "Dashboard still validates the session");
ok(dashboardFn.indexOf("validateUserSession_(") < dashboardFn.indexOf("const fastStartup"),
  "backend session validation occurs before fastStartup return");
ok(authFrontend.includes("validatedAt: Date.now()"),
  "successful login still records recent validation");
ok(appJs.includes("recentlyValidated"),
  "app boot keeps existing recent-session optimization");
ok(read("backend/AuthEngine.js") === baseline("backend/AuthEngine.js"),
  "AuthEngine is byte-for-byte baseline");
ok(authFrontend === baseline("frontend/js/auth.js"),
  "frontend auth is byte-for-byte baseline");

// P0-2: Reality/profile gate ordering.
const enterGame = extractFunction(appJs, "enterGame");
ok(enterGame.includes('gameType === "prediction"'),
  "prediction/reality family participates in route-first path");
ok(enterGame.includes('gameRole === "parent"'),
  "parent game exception is preserved");
const firstRenderIndex = enterGame.indexOf("await navigate(renderBeforeProfileRoute);");
const profileIndex = enterGame.indexOf("const profileChoice = await maybeOfferGameProfile_(gameId);");
ok(firstRenderIndex >= 0 && profileIndex > firstRenderIndex,
  "first usable destination render precedes profile RPC gate");
ok(enterGame.includes('if (profileChoice === "custom")'),
  "custom profile choice is preserved");
ok(enterGame.includes('await navigate("profile");'),
  "custom profile still redirects to Profile");
ok(enterGame.includes("loadStartupPayload()"),
  "prediction startup prewarm remains");
ok(enterGame.indexOf("loadStartupPayload()") < firstRenderIndex,
  "startup prewarm starts before destination render");
ok(!enterGame.includes("teamFantasyPrewarmState_"),
  "Team Fantasy state prewarm race is removed");
ok(enterGame.includes('ensurePageModules_("team-fantasy")'),
  "Team Fantasy module prewarm is retained");

// P0-3: Team Fantasy shared reads.
const lineupFn = extractFunction(engine, "teamFantasyLineupState_");
const stateFn = extractFunction(engine, "apiGetTeamFantasyState");

ok(lineupFn.includes("readContext"), "lineup accepts shared read context");
ok(lineupFn.includes("teamFantasyEligibleTeamsFromRows_"),
  "lineup uses row-based eligible-team helper");
ok(lineupFn.includes("teamFantasyRankingsFromRows_"),
  "lineup uses row-based rankings helper");
ok(!lineupFn.includes("teamFantasyEligibleTeams_("),
  "lineup no longer calls Sheet-reading eligible-team helper");
ok(!lineupFn.includes("teamFantasyPickRows_("),
  "lineup no longer calls Sheet-reading current-picks helper");
ok(!lineupFn.includes("teamFantasyRankings_("),
  "lineup no longer calls Sheet-reading rankings helper");

ok(stateFn.includes("const lineupReadContext"),
  "state builds one shared lineup read context");
ok((stateFn.match(/teamFantasyReadRows_\(TEAM_FANTASY_SHEETS\.PICKS\)/g) || []).length === 1,
  "state lineup context reads Picks exactly once");
ok((stateFn.match(/teamFantasyReadRows_\(TEAM_FANTASY_SHEETS\.UNIT_SCORES\)/g) || []).length === 1,
  "state lineup context reads Unit Scores exactly once");
ok(stateFn.includes("lineupReadContext"),
  "same read context is passed to all lineups");

// Dynamic read-count and lock test for corrected lineup function.
const readCounts = { PICKS: 0, UNIT_SCORES: 0 };
const pickRows = [{
  GameId: "game-1",
  SeasonYear: 2026,
  Week: 1,
  EntryId: "entry-1",
  Position: "QB",
  TeamAbbr: "BUF",
  TeamName: "Buffalo Bills",
  ESPNEventId: "evt",
  GameDateTime: "2000-01-01T00:00:00.000Z",
  PickMethod: "manual",
  AutoPickPenalty: 0
}];
const unitRows = [];

const sandbox = {
  TEAM_FANTASY_SHEETS: { PICKS: "PICKS", UNIT_SCORES: "UNIT_SCORES" },
  TEAM_FANTASY_POSITIONS: ["QB","RB","WRTE","K","OL","DL","LB","DB"],
  TEAM_FANTASY_POSITION_LABELS: {
    QB:"QB", RB:"RB", WRTE:"WR/TE", K:"K",
    OL:"OL", DL:"DL", LB:"LB", DB:"DB"
  },
  teamFantasyReadRows_: function(name) {
    readCounts[name] += 1;
    return name === "PICKS" ? pickRows : unitRows;
  },
  teamFantasyString_: v => String(v == null ? "" : v).trim(),
  teamFantasyNormalizePosition_: v => String(v || "").toUpperCase(),
  teamFantasyNormalizeTeam_: v => String(v || "").toUpperCase(),
  teamFantasyNumber_: (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },
  teamFantasyRound_: v => Math.round(Number(v || 0) * 100) / 100,
  teamFantasyRankingsFromRows_: () => ({}),
  teamFantasyEligibleTeamsFromRows_: () => [],
  Date: Date,
  Math: Math,
  Number: Number,
  Array: Array,
  String: String,
  isNaN: isNaN
};

vm.createContext(sandbox);
vm.runInContext(lineupFn, sandbox);

const settings = {
  seasonYear: 2026,
  teamUseLimit: 3,
  regularSeasonEndWeek: 18,
  playoffUsageMode: "reset"
};
const entry = { entryId: "entry-1", conference: "ALL" };
const schedule = {
  byTeam: { BUF: { gameDateTime: "2000-01-01T00:00:00.000Z" } }
};

const lineup = sandbox.teamFantasyLineupState_(
  "game-1", settings, entry, 1, schedule, true
);

ok(readCounts.PICKS === 1, "one lineup build reads Picks once");
ok(readCounts.UNIT_SCORES === 1, "one lineup build reads Unit Scores once");
ok(lineup.slots.length === 8, "all eight lineup positions remain");
ok(lineup.slots[0].pick && lineup.slots[0].pick.teamAbbr === "BUF",
  "current pick remains");
ok(lineup.slots[0].locked === true,
  "kickoff lock remains");

readCounts.PICKS = 0;
readCounts.UNIT_SCORES = 0;
sandbox.teamFantasyLineupState_(
  "game-1", settings, entry, 1, schedule, true,
  { pickRows: pickRows, unitScoreRows: unitRows }
);
ok(readCounts.PICKS === 0 && readCounts.UNIT_SCORES === 0,
  "shared state context causes zero extra Sheet reads per lineup");

// Critical rules and Sports boundary are untouched.
[
  "teamFantasyFetchScheduleFromSportsEngine_",
  "teamFantasyFetchWeekSchedule_",
  "teamFantasyUsageCountFromRows_",
  "teamFantasySavePick_",
  "teamFantasyAutoPick_"
].forEach(name => {
  ok(
    extractFunction(engine, name) ===
      extractFunction(baseline("backend/engines/SportsTeamFantasyEngine.js"), name),
    name + " remains byte-for-byte baseline"
  );
});

console.log(
  "PASS: RC22 player performance correction contract (" +
  assertions + " assertions)."
);
