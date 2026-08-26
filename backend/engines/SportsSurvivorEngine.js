/* =====================================================
   SPORTS SURVIVOR + STREAK SURVIVOR ENGINE v1.2.18y

   Extends the existing Survivor / Elimination game type with:
   - Sports Survivor (one or more team picks per league week)
   - team-use limits
   - lives / allowed losses
   - straight-up or against-the-spread grading
   - Streak Survivor consecutive-win multipliers
   - optional weekly twists
   - Sports Scores Engine schedule/result automation
   - team record, opponent, odds, and expandable schedule metadata

   Manual / Reality-TV Survivor remains in SurvivorGameEngine.js.
===================================================== */

const SPORTS_SURVIVOR_SETTINGS_SHEET = "SurvivorSettings";
const SPORTS_SURVIVOR_PICK_META_SHEET = "SurvivorPickMeta";
const SPORTS_SURVIVOR_RESULTS_SHEET = "SurvivorSportsResults";

const SPORTS_SURVIVOR_SETTINGS_HEADERS = [
  "GameId", "Mode", "Sport", "League", "SeasonYear", "SeasonType", "SeasonPhase",
  "StartWeek", "EndWeek", "ResultMode", "LossesAllowed", "TeamUseLimit", "PickLockMode",
  "MissedPickRule", "PushRule", "EndMode", "ShowRecords", "ShowOdds", "ShowOpponent",
  "ShowSchedule", "OddsFreezeMode", "KothBasePoints", "KothMultiplierStep",
  "KothMaxMultiplier", "KothLossBehavior", "EarnLifeEnabled", "EarnLifeWinStreak",
  "MaxEarnedLives", "SafeWeeks", "ATSWeeks", "UnderdogWeeks", "RoadOnlyWeeks",
  "DivisionWeeks", "DoublePickWeeks", "SecondChanceWeeks", "RedemptionWeeks",
  "ConfidenceWeeks", "MaxConfidenceRisk", "AutoSettle", "AutoBuildNextWeek",
  "AutoRefreshOdds", "AutomationEnabled",
  "KothSourceGameIdsJSON", "KothCombineMode", "KothEntryAggregation", "KothStrikeLimit",
  "KothPacingMode", "KothFixedRecipients", "KothCustomSchedule", "KothTieRule",
  "KothMinRecipients", "KothMaxRecipients", "KothStartMode", "KothAutoProcess",
  "TwistJSON", "UpdatedAt"
];

const SPORTS_SURVIVOR_PICK_META_HEADERS = [
  "GameId", "Username", "CategoryId", "NomineeIdsJSON", "SnapshotJSON",
  "ConfidencePoints", "UpdatedAt"
];

const SPORTS_SURVIVOR_RESULTS_HEADERS = [
  "GameId", "CategoryId", "Week", "SportsGameId", "ESPNEventId", "HomeTeam", "AwayTeam",
  "HomeScore", "AwayScore", "Status", "State", "Completed", "Cancelled", "GameDateTime",
  "UpdatedAt"
];

function sportsSurvivorString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function sportsSurvivorKey_(value) {
  return sportsSurvivorString_(value).toLowerCase().replace(/_/g, "-");
}

function sportsSurvivorBool_(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback === true;
  if (value === true || value === 1) return true;
  const key = sportsSurvivorKey_(value);
  return key === "true" || key === "yes" || key === "1" || key === "on";
}

function sportsSurvivorNumber_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
}

function sportsSurvivorSlug_(value) {
  if (typeof sportsWagerSlug_ === "function") return sportsWagerSlug_(value);
  return sportsSurvivorKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sportsSurvivorJsonParse_(value, fallback) {
  if (value && typeof value === "object") return value;
  const text = sportsSurvivorString_(value);
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (err) { return fallback; }
}

function sportsSurvivorList_(value) {
  if (Array.isArray(value)) return value.map(function(item) { return sportsSurvivorString_(item); }).filter(Boolean);
  return sportsSurvivorString_(value).split(/[\s,;|]+/).map(function(item) { return item.trim(); }).filter(Boolean);
}

function sportsSurvivorWeekSet_(value) {
  const set = {};
  sportsSurvivorList_(value).forEach(function(item) {
    const n = Number(String(item).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) set[String(Math.floor(n))] = true;
  });
  return set;
}

function sportsSurvivorWeekIn_(week, value) {
  return !!sportsSurvivorWeekSet_(value)[String(Math.floor(sportsSurvivorNumber_(week, 0)))];
}

function sportsSurvivorEnsureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  const width = Math.max(sh.getLastColumn(), headers.length);
  const existing = sh.getRange(1, 1, 1, width).getValues()[0].map(function(v) { return sportsSurvivorString_(v); });
  const missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function sportsSurvivorSheetObjects_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(v) { return sportsSurvivorString_(v); });
  return data.slice(1).map(function(row, index) {
    const object = { __rowNumber: index + 2 };
    headers.forEach(function(header, col) { if (header) object[header] = row[col]; });
    return object;
  });
}

function sportsSurvivorWriteObjectRow_(sheet, headers, rowNumber, object) {
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(v) { return sportsSurvivorString_(v); });
  const row = currentHeaders.map(function(header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  });
  if (rowNumber) sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function sportsSurvivorDefaultSettings_(gameId) {
  const nowYear = new Date().getFullYear();
  return {
    gameId: sportsSurvivorString_(gameId),
    mode: "manual-elimination",
    sport: "football",
    league: "nfl",
    seasonYear: nowYear,
    seasonType: "2",
    seasonPhase: "regular",
    startWeek: 1,
    endWeek: 18,
    resultMode: "straight-up",
    lossesAllowed: 0,
    teamUseLimit: 1,
    pickLockMode: "team-kickoff",
    missedPickRule: "loss",
    pushRule: "survive",
    endMode: "sole-survivor",
    showRecords: true,
    showOdds: true,
    showOpponent: true,
    showSchedule: true,
    oddsFreezeMode: "weekly-lock",
    kothBasePoints: 10,
    kothMultiplierStep: 1,
    kothMaxMultiplier: 5,
    kothLossBehavior: "reset",
    earnLifeEnabled: false,
    earnLifeWinStreak: 5,
    maxEarnedLives: 1,
    safeWeeks: "",
    atsWeeks: "",
    underdogWeeks: "",
    roadOnlyWeeks: "",
    divisionWeeks: "",
    doublePickWeeks: "",
    secondChanceWeeks: "",
    redemptionWeeks: "",
    confidenceWeeks: "",
    maxConfidenceRisk: 10,
    autoSettle: true,
    autoBuildNextWeek: true,
    autoRefreshOdds: true,
    automationEnabled: true,
    kothSourceGameIds: [],
    kothCombineMode: "sum",
    kothEntryAggregation: "sum",
    kothStrikeLimit: 3,
    kothPacingMode: "automatic",
    kothFixedRecipients: 3,
    kothCustomSchedule: "",
    kothTieRule: "include-all",
    kothMinRecipients: 1,
    kothMaxRecipients: 0,
    kothStartMode: "start-fresh",
    kothAutoProcess: true,
    twistJSON: "{}"
  };
}

function sportsSurvivorNormalizeSettings_(raw, gameId) {
  raw = raw || {};
  const defaults = sportsSurvivorDefaultSettings_(gameId || raw.GameId || raw.gameId);
  const get = function(lower, upper) {
    return Object.prototype.hasOwnProperty.call(raw, lower) ? raw[lower] : raw[upper];
  };
  const mode = sportsSurvivorKey_(get("mode", "Mode") || defaults.mode);
  const resultMode = sportsSurvivorKey_(get("resultMode", "ResultMode") || defaults.resultMode);
  const league = sportsSurvivorKey_(get("league", "League") || defaults.league);
  const sportByLeague = { nfl: "football", "college-football": "football", nba: "basketball", mlb: "baseball", nhl: "hockey" };
  const sport = sportByLeague[league] || sportsSurvivorKey_(get("sport", "Sport") || defaults.sport);
  return {
    gameId: sportsSurvivorString_(gameId || get("gameId", "GameId") || defaults.gameId),
    mode: ["manual-elimination", "sports-survivor", "streak-survivor", "king-of-the-hill"].indexOf(mode) >= 0 ? mode : defaults.mode,
    sport: sport,
    league: league,
    seasonYear: Math.floor(sportsSurvivorNumber_(get("seasonYear", "SeasonYear"), defaults.seasonYear)),
    seasonType: sportsSurvivorString_(get("seasonType", "SeasonType") || defaults.seasonType),
    seasonPhase: sportsSurvivorString_(get("seasonPhase", "SeasonPhase") || defaults.seasonPhase),
    startWeek: Math.max(1, Math.floor(sportsSurvivorNumber_(get("startWeek", "StartWeek"), defaults.startWeek))),
    endWeek: Math.max(1, Math.floor(sportsSurvivorNumber_(get("endWeek", "EndWeek"), defaults.endWeek))),
    resultMode: resultMode === "spread" || resultMode === "ats" ? "spread" : "straight-up",
    lossesAllowed: Math.max(0, Math.floor(sportsSurvivorNumber_(get("lossesAllowed", "LossesAllowed"), defaults.lossesAllowed))),
    teamUseLimit: Math.max(0, Math.floor(sportsSurvivorNumber_(get("teamUseLimit", "TeamUseLimit"), defaults.teamUseLimit))),
    pickLockMode: sportsSurvivorKey_(get("pickLockMode", "PickLockMode") || defaults.pickLockMode),
    missedPickRule: sportsSurvivorKey_(get("missedPickRule", "MissedPickRule") || defaults.missedPickRule),
    pushRule: sportsSurvivorKey_(get("pushRule", "PushRule") || defaults.pushRule),
    endMode: sportsSurvivorKey_(get("endMode", "EndMode") || defaults.endMode),
    showRecords: sportsSurvivorBool_(get("showRecords", "ShowRecords"), defaults.showRecords),
    showOdds: sportsSurvivorBool_(get("showOdds", "ShowOdds"), defaults.showOdds),
    showOpponent: sportsSurvivorBool_(get("showOpponent", "ShowOpponent"), defaults.showOpponent),
    showSchedule: sportsSurvivorBool_(get("showSchedule", "ShowSchedule"), defaults.showSchedule),
    oddsFreezeMode: sportsSurvivorKey_(get("oddsFreezeMode", "OddsFreezeMode") || defaults.oddsFreezeMode),
    kothBasePoints: Math.max(0, sportsSurvivorNumber_(get("kothBasePoints", "KothBasePoints"), defaults.kothBasePoints)),
    kothMultiplierStep: Math.max(0, sportsSurvivorNumber_(get("kothMultiplierStep", "KothMultiplierStep"), defaults.kothMultiplierStep)),
    kothMaxMultiplier: Math.max(0, sportsSurvivorNumber_(get("kothMaxMultiplier", "KothMaxMultiplier"), defaults.kothMaxMultiplier)),
    kothLossBehavior: sportsSurvivorKey_(get("kothLossBehavior", "KothLossBehavior") || defaults.kothLossBehavior),
    earnLifeEnabled: sportsSurvivorBool_(get("earnLifeEnabled", "EarnLifeEnabled"), defaults.earnLifeEnabled),
    earnLifeWinStreak: Math.max(1, Math.floor(sportsSurvivorNumber_(get("earnLifeWinStreak", "EarnLifeWinStreak"), defaults.earnLifeWinStreak))),
    maxEarnedLives: Math.max(0, Math.floor(sportsSurvivorNumber_(get("maxEarnedLives", "MaxEarnedLives"), defaults.maxEarnedLives))),
    safeWeeks: sportsSurvivorString_(get("safeWeeks", "SafeWeeks")),
    atsWeeks: sportsSurvivorString_(get("atsWeeks", "ATSWeeks")),
    underdogWeeks: sportsSurvivorString_(get("underdogWeeks", "UnderdogWeeks")),
    roadOnlyWeeks: sportsSurvivorString_(get("roadOnlyWeeks", "RoadOnlyWeeks")),
    divisionWeeks: sportsSurvivorString_(get("divisionWeeks", "DivisionWeeks")),
    doublePickWeeks: sportsSurvivorString_(get("doublePickWeeks", "DoublePickWeeks")),
    secondChanceWeeks: sportsSurvivorString_(get("secondChanceWeeks", "SecondChanceWeeks")),
    redemptionWeeks: sportsSurvivorString_(get("redemptionWeeks", "RedemptionWeeks")),
    confidenceWeeks: sportsSurvivorString_(get("confidenceWeeks", "ConfidenceWeeks")),
    maxConfidenceRisk: Math.max(0, sportsSurvivorNumber_(get("maxConfidenceRisk", "MaxConfidenceRisk"), defaults.maxConfidenceRisk)),
    autoSettle: sportsSurvivorBool_(get("autoSettle", "AutoSettle"), defaults.autoSettle),
    autoBuildNextWeek: sportsSurvivorBool_(get("autoBuildNextWeek", "AutoBuildNextWeek"), defaults.autoBuildNextWeek),
    autoRefreshOdds: sportsSurvivorBool_(get("autoRefreshOdds", "AutoRefreshOdds"), defaults.autoRefreshOdds),
    automationEnabled: sportsSurvivorBool_(get("automationEnabled", "AutomationEnabled"), defaults.automationEnabled),
    kothSourceGameIds: (function() {
      const value = get("kothSourceGameIds", "KothSourceGameIdsJSON");
      const parsed = sportsSurvivorJsonParse_(value, null);
      return Array.isArray(parsed) ? parsed.map(sportsSurvivorString_).filter(Boolean) : sportsSurvivorList_(value);
    })(),
    kothCombineMode: ["sum", "average", "highest", "lowest"].indexOf(sportsSurvivorKey_(get("kothCombineMode", "KothCombineMode"))) >= 0 ? sportsSurvivorKey_(get("kothCombineMode", "KothCombineMode")) : defaults.kothCombineMode,
    kothEntryAggregation: ["sum", "average", "highest", "lowest"].indexOf(sportsSurvivorKey_(get("kothEntryAggregation", "KothEntryAggregation"))) >= 0 ? sportsSurvivorKey_(get("kothEntryAggregation", "KothEntryAggregation")) : defaults.kothEntryAggregation,
    kothStrikeLimit: Math.max(1, Math.floor(sportsSurvivorNumber_(get("kothStrikeLimit", "KothStrikeLimit"), defaults.kothStrikeLimit))),
    kothPacingMode: ["automatic", "fixed", "custom"].indexOf(sportsSurvivorKey_(get("kothPacingMode", "KothPacingMode"))) >= 0 ? sportsSurvivorKey_(get("kothPacingMode", "KothPacingMode")) : defaults.kothPacingMode,
    kothFixedRecipients: Math.max(1, Math.floor(sportsSurvivorNumber_(get("kothFixedRecipients", "KothFixedRecipients"), defaults.kothFixedRecipients))),
    kothCustomSchedule: sportsSurvivorString_(get("kothCustomSchedule", "KothCustomSchedule")),
    kothTieRule: ["include-all", "previous-week", "season-average"].indexOf(sportsSurvivorKey_(get("kothTieRule", "KothTieRule"))) >= 0 ? sportsSurvivorKey_(get("kothTieRule", "KothTieRule")) : defaults.kothTieRule,
    kothMinRecipients: Math.max(1, Math.floor(sportsSurvivorNumber_(get("kothMinRecipients", "KothMinRecipients"), defaults.kothMinRecipients))),
    kothMaxRecipients: Math.max(0, Math.floor(sportsSurvivorNumber_(get("kothMaxRecipients", "KothMaxRecipients"), defaults.kothMaxRecipients))),
    kothStartMode: sportsSurvivorKey_(get("kothStartMode", "KothStartMode")) === "backfill" ? "backfill" : "start-fresh",
    kothAutoProcess: sportsSurvivorBool_(get("kothAutoProcess", "KothAutoProcess"), defaults.kothAutoProcess),
    twistJSON: sportsSurvivorString_(get("twistJSON", "TwistJSON") || "{}")
  };
}

function survivorGetSettings_(gameId) {
  const cleanGameId = sportsSurvivorString_(gameId);
  const defaults = sportsSurvivorDefaultSettings_(cleanGameId);
  if (!cleanGameId || typeof SpreadsheetApp === "undefined") return defaults;
  const sh = sportsSurvivorEnsureSheet_(SPORTS_SURVIVOR_SETTINGS_SHEET, SPORTS_SURVIVOR_SETTINGS_HEADERS);
  const row = sportsSurvivorSheetObjects_(sh).find(function(item) {
    return sportsSurvivorString_(item.GameId) === cleanGameId;
  });
  return sportsSurvivorNormalizeSettings_(row || defaults, cleanGameId);
}

function survivorSportsModeEnabled_(gameId) {
  const mode = survivorGetSettings_(gameId).mode;
  return mode === "sports-survivor" || mode === "streak-survivor";
}

function survivorSaveSettings_(gameId, value) {
  const cleanGameId = sportsSurvivorString_(gameId || (value && (value.gameId || value.GameId)));
  if (!cleanGameId) throw new Error("GameId is required for Survivor settings.");
  const settings = sportsSurvivorNormalizeSettings_(value || {}, cleanGameId);
  const sh = sportsSurvivorEnsureSheet_(SPORTS_SURVIVOR_SETTINGS_SHEET, SPORTS_SURVIVOR_SETTINGS_HEADERS);
  const rows = sportsSurvivorSheetObjects_(sh);
  const existing = rows.find(function(item) { return sportsSurvivorString_(item.GameId) === cleanGameId; });
  const object = {
    GameId: cleanGameId, Mode: settings.mode, Sport: settings.sport, League: settings.league,
    SeasonYear: settings.seasonYear, SeasonType: settings.seasonType, SeasonPhase: settings.seasonPhase,
    StartWeek: settings.startWeek, EndWeek: settings.endWeek, ResultMode: settings.resultMode,
    LossesAllowed: settings.lossesAllowed, TeamUseLimit: settings.teamUseLimit, PickLockMode: settings.pickLockMode,
    MissedPickRule: settings.missedPickRule, PushRule: settings.pushRule, EndMode: settings.endMode,
    ShowRecords: settings.showRecords, ShowOdds: settings.showOdds, ShowOpponent: settings.showOpponent,
    ShowSchedule: settings.showSchedule, OddsFreezeMode: settings.oddsFreezeMode,
    KothBasePoints: settings.kothBasePoints, KothMultiplierStep: settings.kothMultiplierStep,
    KothMaxMultiplier: settings.kothMaxMultiplier, KothLossBehavior: settings.kothLossBehavior,
    EarnLifeEnabled: settings.earnLifeEnabled, EarnLifeWinStreak: settings.earnLifeWinStreak,
    MaxEarnedLives: settings.maxEarnedLives, SafeWeeks: settings.safeWeeks, ATSWeeks: settings.atsWeeks,
    UnderdogWeeks: settings.underdogWeeks, RoadOnlyWeeks: settings.roadOnlyWeeks,
    DivisionWeeks: settings.divisionWeeks, DoublePickWeeks: settings.doublePickWeeks,
    SecondChanceWeeks: settings.secondChanceWeeks, RedemptionWeeks: settings.redemptionWeeks,
    ConfidenceWeeks: settings.confidenceWeeks, MaxConfidenceRisk: settings.maxConfidenceRisk,
    AutoSettle: settings.autoSettle, AutoBuildNextWeek: settings.autoBuildNextWeek,
    AutoRefreshOdds: settings.autoRefreshOdds, AutomationEnabled: settings.automationEnabled,
    KothSourceGameIdsJSON: JSON.stringify(settings.kothSourceGameIds || []),
    KothCombineMode: settings.kothCombineMode, KothEntryAggregation: settings.kothEntryAggregation,
    KothStrikeLimit: settings.kothStrikeLimit, KothPacingMode: settings.kothPacingMode,
    KothFixedRecipients: settings.kothFixedRecipients, KothCustomSchedule: settings.kothCustomSchedule,
    KothTieRule: settings.kothTieRule, KothMinRecipients: settings.kothMinRecipients,
    KothMaxRecipients: settings.kothMaxRecipients, KothStartMode: settings.kothStartMode,
    KothAutoProcess: settings.kothAutoProcess,
    TwistJSON: settings.twistJSON || "{}", UpdatedAt: new Date()
  };
  sportsSurvivorWriteObjectRow_(sh, SPORTS_SURVIVOR_SETTINGS_HEADERS, existing && existing.__rowNumber, object);
  if (settings.automationEnabled && settings.mode !== "manual-elimination") {
    try { survivorEnsureSportsAutomationTrigger_(); } catch (err) { /* Admin can install/run manually if trigger permission is unavailable. */ }
  }
  return settings;
}

function sportsSurvivorSettingsFromPayload_(payload) {
  payload = payload || {};
  const raw = payload.survivorSettings || sportsSurvivorJsonParse_(payload.survivorSettingsJSON, {});
  return raw && typeof raw === "object" ? raw : {};
}

function sportsSurvivorRoundWeek_(category, index) {
  const round = sportsSurvivorNumber_(category && (category.roundNumber || category.RoundNumber), 0);
  if (round > 0) return Math.floor(round);
  const id = sportsSurvivorString_(category && category.id);
  const match = id.match(/(?:^|-)w(?:eek)?-?(\d+)(?:-|$)/i);
  return match ? Number(match[1]) : index + 1;
}

function sportsSurvivorRoundRules_(settings, week) {
  const doublePick = sportsSurvivorWeekIn_(week, settings.doublePickWeeks);
  const redemption = sportsSurvivorWeekIn_(week, settings.redemptionWeeks);
  return {
    week: week,
    resultMode: sportsSurvivorWeekIn_(week, settings.atsWeeks) ? "spread" : settings.resultMode,
    safe: sportsSurvivorWeekIn_(week, settings.safeWeeks),
    underdogsOnly: sportsSurvivorWeekIn_(week, settings.underdogWeeks),
    roadOnly: sportsSurvivorWeekIn_(week, settings.roadOnlyWeeks),
    divisionOnly: sportsSurvivorWeekIn_(week, settings.divisionWeeks),
    doublePick: doublePick,
    redemption: redemption,
    secondChance: sportsSurvivorWeekIn_(week, settings.secondChanceWeeks),
    confidence: sportsSurvivorWeekIn_(week, settings.confidenceWeeks),
    requiredSelections: (doublePick || redemption) ? 2 : 1,
    selectionRule: redemption ? "any" : "all"
  };
}

function sportsSurvivorFetchScores_(settings, extra) {
  if (typeof sportsWagerFetchJson_ !== "function") throw new Error("Sports Scores Engine connection is unavailable.");
  extra = extra || {};
  const params = {
    action: "getSportsScores",
    sport: settings.sport,
    league: settings.league,
    seasonYear: settings.seasonYear
  };
  if (settings.seasonType) params.seasonType = settings.seasonType;
  if (settings.seasonPhase) params.seasonPhase = settings.seasonPhase;
  Object.keys(extra).forEach(function(key) {
    if (extra[key] !== undefined && extra[key] !== null && extra[key] !== "") params[key] = extra[key];
  });
  const result = sportsWagerFetchJson_(params, "Sports Survivor schedule/results");
  if (!result || result.success === false) throw new Error((result && (result.error || result.message)) || "Sports Scores Engine could not load games.");
  const scores = Array.isArray(result.scores) ? result.scores : (Array.isArray(result.games) ? result.games : []);
  return scores.map(function(score) { return typeof sportsWagerNormalizeScore_ === "function" ? sportsWagerNormalizeScore_(score) : score; });
}

function sportsSurvivorFetchOdds_(score) {
  if (typeof sportsWagerFetchJson_ !== "function") return null;
  try {
    const result = sportsWagerFetchJson_({
      action: "getSportsOdds",
      league: sportsSurvivorString_(score.League),
      homeTeam: sportsSurvivorString_(score.HomeTeam),
      awayTeam: sportsSurvivorString_(score.AwayTeam),
      market: "spread",
      refreshIfStale: "true"
    }, "Sports Survivor odds");
    if (!result || result.success === false || result.found === false) return null;
    const odds = result.odds || result.data || result;
    return {
      homeOdds: odds.homeOdds !== undefined ? odds.homeOdds : odds.HomeOdds,
      awayOdds: odds.awayOdds !== undefined ? odds.awayOdds : odds.AwayOdds,
      homeSpread: odds.homeSpread !== undefined ? odds.homeSpread : odds.HomeSpread,
      awaySpread: odds.awaySpread !== undefined ? odds.awaySpread : odds.AwaySpread,
      homeSpreadOdds: odds.homeSpreadOdds !== undefined ? odds.homeSpreadOdds : odds.HomeSpreadOdds,
      awaySpreadOdds: odds.awaySpreadOdds !== undefined ? odds.awaySpreadOdds : odds.AwaySpreadOdds,
      source: sportsSurvivorString_(result.source || odds.source || odds.bookmaker || "sports-odds"),
      lastUpdated: sportsSurvivorString_(odds.lastUpdated || odds.LastUpdated || result.lastUpdated || new Date().toISOString())
    };
  } catch (err) {
    return null;
  }
}

function sportsSurvivorOddsFromResult_(result) {
  if (!result || result.success === false || result.found === false) return null;
  const odds = result.odds || result.data || result;
  return {
    homeOdds: odds.homeOdds !== undefined ? odds.homeOdds : odds.HomeOdds,
    awayOdds: odds.awayOdds !== undefined ? odds.awayOdds : odds.AwayOdds,
    homeSpread: odds.homeSpread !== undefined ? odds.homeSpread : odds.HomeSpread,
    awaySpread: odds.awaySpread !== undefined ? odds.awaySpread : odds.AwaySpread,
    homeSpreadOdds: odds.homeSpreadOdds !== undefined ? odds.homeSpreadOdds : odds.HomeSpreadOdds,
    awaySpreadOdds: odds.awaySpreadOdds !== undefined ? odds.awaySpreadOdds : odds.AwaySpreadOdds,
    source: sportsSurvivorString_(result.source || odds.source || odds.bookmaker || "sports-odds"),
    lastUpdated: sportsSurvivorString_(odds.lastUpdated || odds.LastUpdated || result.lastUpdated || new Date().toISOString())
  };
}

function sportsSurvivorFetchOddsBulk_(scores) {
  const map = {};
  scores = Array.isArray(scores) ? scores : [];
  if (!scores.length) return map;
  if (typeof UrlFetchApp === "undefined" || typeof UrlFetchApp.fetchAll !== "function" ||
      typeof sportsWagerBuildQuery_ !== "function" || typeof sportsWagerGetApiUrl_ !== "function") {
    scores.forEach(function(score) {
      const odds = sportsSurvivorFetchOdds_(score);
      if (odds) map[sportsSurvivorString_(score.GameId || score.ESPNEventId)] = odds;
    });
    return map;
  }
  const baseUrl = sportsWagerGetApiUrl_();
  const requests = scores.map(function(score) {
    const query = sportsWagerBuildQuery_({
      action: "getSportsOdds", league: sportsSurvivorString_(score.League),
      homeTeam: sportsSurvivorString_(score.HomeTeam), awayTeam: sportsSurvivorString_(score.AwayTeam),
      market: "spread", refreshIfStale: "true"
    });
    return { url: baseUrl + (query ? "?" + query : ""), method: "get", followRedirects: true, muteHttpExceptions: true };
  });
  let responses;
  try { responses = UrlFetchApp.fetchAll(requests); }
  catch (err) { responses = []; }
  responses.forEach(function(response, index) {
    try {
      if (!response || response.getResponseCode() < 200 || response.getResponseCode() >= 300) return;
      const result = JSON.parse(response.getContentText());
      const odds = sportsSurvivorOddsFromResult_(result);
      if (odds) map[sportsSurvivorString_(scores[index].GameId || scores[index].ESPNEventId)] = odds;
    } catch (err) { /* One unavailable line should not fail an entire Survivor week. */ }
  });
  return map;
}

function sportsSurvivorCategoryId_(settings, week) {
  return "sports-survivor-" + sportsSurvivorSlug_(settings.league || "sports") + "-week-" + Math.floor(Number(week));
}

function sportsSurvivorQuestionExists_(gameId, categoryId) {
  const categories = typeof survivorGameCategories_ === "function" ? survivorGameCategories_(gameId) : [];
  return categories.some(function(category) { return sportsSurvivorKey_(category.id) === sportsSurvivorKey_(categoryId); });
}

function sportsSurvivorOptionMetaForGame_(gameId) {
  const result = {};
  if (typeof normalizedStorageReadOptionsByGame_ !== "function" || typeof normalizedStorageRowsToObjects_ !== "function") return result;
  const data = normalizedStorageReadOptionsByGame_(gameId, { trustIndex: true });
  normalizedStorageRowsToObjects_(data).forEach(function(option) {
    const categoryId = sportsSurvivorKey_(option.QuestionId);
    const optionId = sportsSurvivorKey_(option.OptionId);
    if (!categoryId || !optionId) return;
    if (!result[categoryId]) result[categoryId] = {};
    const payload = sportsSurvivorJsonParse_(option.PayloadJSON, {});
    result[categoryId][optionId] = Object.assign({}, payload, {
      optionId: optionId,
      name: sportsSurvivorString_(option.Option),
      shortAnswer: sportsSurvivorString_(option.ShortAnswer || option.Option),
      logoUrl: sportsSurvivorString_(option.LogoUrl)
    });
  });
  return result;
}

function sportsSurvivorNflDivision_(team) {
  const key = sportsSurvivorKey_(team).replace(/[^a-z0-9]+/g, " ").trim();
  const divisions = {
    "buffalo bills":"afc-east", "miami dolphins":"afc-east", "new england patriots":"afc-east", "new york jets":"afc-east",
    "baltimore ravens":"afc-north", "cincinnati bengals":"afc-north", "cleveland browns":"afc-north", "pittsburgh steelers":"afc-north",
    "houston texans":"afc-south", "indianapolis colts":"afc-south", "jacksonville jaguars":"afc-south", "tennessee titans":"afc-south",
    "denver broncos":"afc-west", "kansas city chiefs":"afc-west", "las vegas raiders":"afc-west", "los angeles chargers":"afc-west",
    "dallas cowboys":"nfc-east", "new york giants":"nfc-east", "philadelphia eagles":"nfc-east", "washington commanders":"nfc-east",
    "chicago bears":"nfc-north", "detroit lions":"nfc-north", "green bay packers":"nfc-north", "minnesota vikings":"nfc-north",
    "atlanta falcons":"nfc-south", "carolina panthers":"nfc-south", "new orleans saints":"nfc-south", "tampa bay buccaneers":"nfc-south",
    "arizona cardinals":"nfc-west", "los angeles rams":"nfc-west", "san francisco 49ers":"nfc-west", "seattle seahawks":"nfc-west"
  };
  return divisions[key] || "";
}

function sportsSurvivorDivisionGame_(settings, score) {
  if (sportsSurvivorBool_(score.DivisionGame || score.divisionGame || score.IsDivisionGame, false)) return true;
  if (sportsSurvivorKey_(settings.league) === "nfl") {
    const homeDivision = sportsSurvivorNflDivision_(score.HomeTeam);
    return !!homeDivision && homeDivision === sportsSurvivorNflDivision_(score.AwayTeam);
  }
  return false;
}

function sportsSurvivorBuildWeek_(gameId, requestedWeek, options) {
  options = options || {};
  const settings = survivorGetSettings_(gameId);
  if (settings.mode === "manual-elimination") throw new Error("Change Survivor Mode to Sports Survivor or King of the Hill before building a sports week.");
  const week = Math.floor(sportsSurvivorNumber_(requestedWeek, settings.startWeek));
  if (week < settings.startWeek || week > settings.endWeek) throw new Error("Week " + week + " is outside the configured Survivor range.");
  const categoryId = sportsSurvivorCategoryId_(settings, week);
  if (sportsSurvivorQuestionExists_(gameId, categoryId)) {
    if (options.refresh === true) sportsSurvivorSyncWeek_(gameId, week, { refreshOdds: settings.autoRefreshOdds });
    return { success: true, duplicate: true, gameId: gameId, categoryId: categoryId, week: week };
  }

  const scores = sportsSurvivorFetchScores_(settings, { week: week });
  if (!scores.length) throw new Error("No " + String(settings.league).toUpperCase() + " games were found for Week " + week + ".");
  const rules = sportsSurvivorRoundRules_(settings, week);
  const starts = scores.map(function(score) { return new Date(score.GameDateTime || 0).getTime(); }).filter(function(value) { return Number.isFinite(value) && value > 0; });
  const firstKickoff = starts.length ? new Date(Math.min.apply(Math, starts)).toISOString() : "";
  const categoryName = String(settings.league).toUpperCase() + " Week " + week + " Survivor Pick";

  adminCreateCategory({
    gameId: gameId,
    categoryId: categoryId,
    category: categoryName,
    section: "Survivor",
    scoreMode: "fixed-points",
    points: 1,
    locked: false,
    lockDateTime: settings.pickLockMode === "first-game" ? firstKickoff : "",
    displayOrder: week,
    roundNumber: week,
    groupId: "sports-survivor",
    layoutType: "list",
    shortName: "Week " + week,
    questionType: "sports-survivor",
    scoringEngine: "sports",
    selectionMode: rules.requiredSelections > 1 ? "multiple" : "single",
    oddsMode: settings.showOdds ? "display" : "none",
    resultSource: "sports-engine",
    resultSourceType: "sports-score",
    resultProvider: "Sports Scores Engine",
    settlementStatus: "pending",
    sportsProvider: "ESPN",
    sportsLeague: settings.league,
    sportsMarket: rules.resultMode === "spread" ? "spread" : "moneyline",
    maxSelections: rules.requiredSelections,
    minSelections: rules.requiredSelections,
    allowPush: true,
    autoSettle: true,
    requireAdminReview: false,
    sourceConfigJSON: JSON.stringify({ source: "sports-survivor-v1.2.18y", week: week, rules: rules })
  });

  const teams = [];
  const oddsMap = (settings.showOdds || rules.resultMode === "spread" || rules.underdogsOnly)
    ? sportsSurvivorFetchOddsBulk_(scores)
    : {};
  scores.forEach(function(score) {
    const odds = oddsMap[sportsSurvivorString_(score.GameId || score.ESPNEventId)] || null;
    ["away", "home"].forEach(function(side) {
      const isHome = side === "home";
      const team = sportsSurvivorString_(isHome ? score.HomeTeam : score.AwayTeam);
      const opponent = sportsSurvivorString_(isHome ? score.AwayTeam : score.HomeTeam);
      if (!team) return;
      const teamId = sportsSurvivorSlug_(team);
      const spread = odds ? sportsSurvivorNumber_(isHome ? odds.homeSpread : odds.awaySpread, NaN) : NaN;
      const moneyline = odds ? (isHome ? odds.homeOdds : odds.awayOdds) : "";
      teams.push({
        nomineeId: teamId,
        nominee: team,
        shortAnswer: team,
        logoUrl: sportsSurvivorString_(isHome ? score.HomeLogo : score.AwayLogo),
        active: true,
        bettingOdds: moneyline,
        oddsSource: odds && odds.source || "",
        oddsLastUpdated: odds && odds.lastUpdated || "",
        _meta: {
          sportsSurvivor: true,
          week: week,
          sportsGameId: sportsSurvivorString_(score.GameId),
          espnEventId: sportsSurvivorString_(score.ESPNEventId),
          teamId: teamId,
          team: team,
          teamRecord: sportsSurvivorString_(isHome ? score.HomeRecord : score.AwayRecord),
          opponent: opponent,
          opponentRecord: sportsSurvivorString_(isHome ? score.AwayRecord : score.HomeRecord),
          side: side,
          homeAway: isHome ? "HOME" : "AWAY",
          homeTeam: sportsSurvivorString_(score.HomeTeam),
          awayTeam: sportsSurvivorString_(score.AwayTeam),
          kickoff: sportsSurvivorString_(score.GameDateTime),
          spread: Number.isFinite(spread) ? spread : "",
          moneyline: moneyline === undefined || moneyline === null ? "" : moneyline,
          spreadOdds: odds ? (isHome ? odds.homeSpreadOdds : odds.awaySpreadOdds) : "",
          oddsSource: odds && odds.source || "",
          oddsLastUpdated: odds && odds.lastUpdated || "",
          divisionGame: sportsSurvivorDivisionGame_(settings, score)
        }
      });
    });
  });

  adminBulkCreateNominees({ gameId: gameId, categoryId: categoryId, category: categoryName, items: teams });
  if (typeof normalizedStorageUpsertQuestion_ === "function") {
    normalizedStorageUpsertQuestion_({
      gameId: gameId, questionId: categoryId, question: categoryName, section: "Survivor", active: true,
      predictionGame: true, questionType: "sports-survivor", scoringEngine: "sports",
      selectionMode: rules.requiredSelections > 1 ? "multiple" : "single", entryType: "team",
      oddsMode: settings.showOdds ? "display" : "none", resultSource: "sports-engine", roundNumber: week,
      sportsProvider: "ESPN", sportsLeague: settings.league, sportsMarket: rules.resultMode === "spread" ? "spread" : "moneyline",
      payloadJSON: JSON.stringify({ sportsSurvivor: true, week: week, rules: rules, firstKickoff: firstKickoff }),
      sourceSystem: "sports-survivor-v1.2.18y"
    });
  }
  if (typeof normalizedStorageUpsertOptionsBulk_ === "function") {
    normalizedStorageUpsertOptionsBulk_(teams.map(function(item, index) {
      return {
        gameId: gameId, questionId: categoryId, optionId: item.nomineeId, option: item.nominee,
        shortAnswer: item.shortAnswer, logoUrl: item.logoUrl, active: true, displayOrder: index + 1,
        payloadJSON: JSON.stringify(item._meta), sourceSystem: "sports-survivor-v1.2.18y"
      };
    }));
  }
  sportsSurvivorUpsertResults_(gameId, categoryId, week, scores);
  if (typeof clearGameDataCaches === "function") clearGameDataCaches(gameId, ["Categories", "CategorySettings", "Questions", "QuestionOptions"]);
  return { success: true, duplicate: false, gameId: gameId, categoryId: categoryId, week: week, teams: teams.length, games: scores.length, rules: rules };
}

function sportsSurvivorResultComplete_(score) {
  const state = sportsSurvivorKey_(score.State || score.state);
  const status = sportsSurvivorKey_(score.Status || score.status);
  return sportsSurvivorBool_(score.Completed || score.completed, false) || state === "post" || state === "final" || status.indexOf("final") !== -1 || status.indexOf("complete") !== -1;
}

function sportsSurvivorResultCancelled_(score) {
  const text = sportsSurvivorKey_((score.Status || "") + " " + (score.State || ""));
  return text.indexOf("cancel") !== -1 || text.indexOf("postpon") !== -1 || text.indexOf("abandon") !== -1 || text.indexOf("suspend") !== -1;
}

function sportsSurvivorUpsertResults_(gameId, categoryId, week, scores) {
  const sh = sportsSurvivorEnsureSheet_(SPORTS_SURVIVOR_RESULTS_SHEET, SPORTS_SURVIVOR_RESULTS_HEADERS);
  const rows = sportsSurvivorSheetObjects_(sh);
  (scores || []).forEach(function(score) {
    const sportsGameId = sportsSurvivorString_(score.GameId || score.ESPNEventId);
    if (!sportsGameId) return;
    const existing = rows.find(function(row) {
      return sportsSurvivorString_(row.GameId) === gameId && sportsSurvivorKey_(row.CategoryId) === sportsSurvivorKey_(categoryId) &&
        sportsSurvivorString_(row.SportsGameId || row.ESPNEventId) === sportsGameId;
    });
    sportsSurvivorWriteObjectRow_(sh, SPORTS_SURVIVOR_RESULTS_HEADERS, existing && existing.__rowNumber, {
      GameId: gameId, CategoryId: categoryId, Week: week, SportsGameId: sportsSurvivorString_(score.GameId),
      ESPNEventId: sportsSurvivorString_(score.ESPNEventId), HomeTeam: sportsSurvivorString_(score.HomeTeam),
      AwayTeam: sportsSurvivorString_(score.AwayTeam), HomeScore: score.HomeScore, AwayScore: score.AwayScore,
      Status: sportsSurvivorString_(score.Status), State: sportsSurvivorString_(score.State),
      Completed: sportsSurvivorResultComplete_(score), Cancelled: sportsSurvivorResultCancelled_(score),
      GameDateTime: sportsSurvivorString_(score.GameDateTime), UpdatedAt: new Date()
    });
  });
}

function sportsSurvivorResultsForGame_(gameId) {
  if (typeof SpreadsheetApp === "undefined") return {};
  const sh = sportsSurvivorEnsureSheet_(SPORTS_SURVIVOR_RESULTS_SHEET, SPORTS_SURVIVOR_RESULTS_HEADERS);
  const map = {};
  sportsSurvivorSheetObjects_(sh).forEach(function(row) {
    if (sportsSurvivorString_(row.GameId) !== sportsSurvivorString_(gameId)) return;
    const categoryId = sportsSurvivorKey_(row.CategoryId);
    const sportsGameId = sportsSurvivorString_(row.SportsGameId || row.ESPNEventId);
    if (!categoryId || !sportsGameId) return;
    if (!map[categoryId]) map[categoryId] = {};
    map[categoryId][sportsGameId] = row;
  });
  return map;
}

function sportsSurvivorSyncWeek_(gameId, week, options) {
  options = options || {};
  const settings = survivorGetSettings_(gameId);
  const categoryId = sportsSurvivorCategoryId_(settings, week);
  const scores = sportsSurvivorFetchScores_(settings, { week: week });
  sportsSurvivorUpsertResults_(gameId, categoryId, week, scores);
  if ((options.refreshOdds === true || settings.autoRefreshOdds) && sportsSurvivorQuestionExists_(gameId, categoryId)) {
    sportsSurvivorRefreshOddsForWeek_(gameId, categoryId, scores);
  }
  return { success: true, gameId: gameId, week: week, categoryId: categoryId, games: scores.length };
}

function sportsSurvivorRefreshOddsForWeek_(gameId, categoryId, scores) {
  const settings = survivorGetSettings_(gameId);
  if (settings.oddsFreezeMode === "build") return 0;
  const kickoffs = (scores || []).map(function(score) { return new Date(score.GameDateTime || 0).getTime(); }).filter(function(value) { return Number.isFinite(value) && value > 0; });
  if (settings.oddsFreezeMode === "weekly-lock" && kickoffs.length && Date.now() >= Math.min.apply(Math, kickoffs)) return 0;
  if (!settings.showOdds && settings.resultMode !== "spread" && !sportsSurvivorWeekIn_(sportsSurvivorRoundWeek_({id: categoryId}, 0), settings.underdogWeeks)) return 0;
  const eligibleScores = settings.oddsFreezeMode === "closing"
    ? (scores || []).filter(function(score) { const t = new Date(score.GameDateTime || 0).getTime(); return !t || Date.now() < t; })
    : (scores || []);
  const oddsMap = sportsSurvivorFetchOddsBulk_(eligibleScores);
  const metaByGame = sportsSurvivorOptionMetaForGame_(gameId);
  const categoryMeta = metaByGame[sportsSurvivorKey_(categoryId)] || {};
  const update = [];
  eligibleScores.forEach(function(score) {
    const odds = oddsMap[sportsSurvivorString_(score.GameId || score.ESPNEventId)];
    if (!odds) return;
    Object.keys(categoryMeta).forEach(function(optionId) {
      const meta = categoryMeta[optionId];
      if (sportsSurvivorString_(meta.sportsGameId) !== sportsSurvivorString_(score.GameId)) return;
      const home = sportsSurvivorKey_(meta.side) === "home";
      meta.spread = home ? odds.homeSpread : odds.awaySpread;
      meta.moneyline = home ? odds.homeOdds : odds.awayOdds;
      meta.spreadOdds = home ? odds.homeSpreadOdds : odds.awaySpreadOdds;
      meta.oddsSource = odds.source || "";
      meta.oddsLastUpdated = odds.lastUpdated || new Date().toISOString();
      update.push({
        gameId: gameId, questionId: categoryId, optionId: optionId, option: meta.name || meta.team,
        shortAnswer: meta.shortAnswer || meta.team, logoUrl: meta.logoUrl || "", active: true,
        payloadJSON: JSON.stringify(meta), sourceSystem: "sports-survivor-v1.2.18y"
      });
    });
  });
  if (update.length && typeof normalizedStorageUpsertOptionsBulk_ === "function") normalizedStorageUpsertOptionsBulk_(update);
  return update.length;
}

function sportsSurvivorPickMetaRows_(gameId) {
  if (typeof SpreadsheetApp === "undefined") return [];
  const sh = sportsSurvivorEnsureSheet_(SPORTS_SURVIVOR_PICK_META_SHEET, SPORTS_SURVIVOR_PICK_META_HEADERS);
  return sportsSurvivorSheetObjects_(sh).filter(function(row) { return sportsSurvivorString_(row.GameId) === sportsSurvivorString_(gameId); });
}

function sportsSurvivorPickMetaMap_(gameId) {
  const map = {};
  sportsSurvivorPickMetaRows_(gameId).forEach(function(row) {
    const user = sportsSurvivorKey_(row.Username);
    const category = sportsSurvivorKey_(row.CategoryId);
    if (!user || !category) return;
    if (!map[user]) map[user] = {};
    map[user][category] = {
      nomineeIds: sportsSurvivorJsonParse_(row.NomineeIdsJSON, []),
      snapshots: sportsSurvivorJsonParse_(row.SnapshotJSON, []),
      confidencePoints: Math.max(0, sportsSurvivorNumber_(row.ConfidencePoints, 0)),
      updatedAt: row.UpdatedAt || ""
    };
  });
  return map;
}

function sportsSurvivorSavePickMeta_(gameId, username, categoryId, nomineeIds, snapshots, confidencePoints) {
  const sh = sportsSurvivorEnsureSheet_(SPORTS_SURVIVOR_PICK_META_SHEET, SPORTS_SURVIVOR_PICK_META_HEADERS);
  const rows = sportsSurvivorSheetObjects_(sh);
  const existing = rows.find(function(row) {
    return sportsSurvivorString_(row.GameId) === gameId && sportsSurvivorKey_(row.Username) === sportsSurvivorKey_(username) && sportsSurvivorKey_(row.CategoryId) === sportsSurvivorKey_(categoryId);
  });
  sportsSurvivorWriteObjectRow_(sh, SPORTS_SURVIVOR_PICK_META_HEADERS, existing && existing.__rowNumber, {
    GameId: gameId, Username: username, CategoryId: categoryId, NomineeIdsJSON: JSON.stringify(nomineeIds || []),
    SnapshotJSON: JSON.stringify(snapshots || []), ConfidencePoints: Math.max(0, sportsSurvivorNumber_(confidencePoints, 0)), UpdatedAt: new Date()
  });
}

function sportsSurvivorCategoryResolved_(categoryId, optionMeta, resultMap) {
  const options = optionMeta[sportsSurvivorKey_(categoryId)] || {};
  const resultRows = resultMap[sportsSurvivorKey_(categoryId)] || {};
  const gameIds = {};
  Object.keys(options).forEach(function(optionId) {
    const id = sportsSurvivorString_(options[optionId].sportsGameId || options[optionId].espnEventId);
    if (id) gameIds[id] = true;
  });
  const ids = Object.keys(gameIds);
  if (!ids.length) return false;
  return ids.every(function(id) {
    const row = resultRows[id];
    return !!(row && (sportsSurvivorBool_(row.Completed, false) || sportsSurvivorBool_(row.Cancelled, false)));
  });
}

function sportsSurvivorGradeSelection_(snapshot, currentMeta, resultRows, resultMode, freezeMode) {
  const meta = sportsSurvivorKey_(freezeMode) === "pick"
    ? Object.assign({}, currentMeta || {}, snapshot || {})
    : Object.assign({}, snapshot || {}, currentMeta || {});
  const sportsGameId = sportsSurvivorString_(meta.sportsGameId || meta.espnEventId);
  const result = resultRows && resultRows[sportsGameId];
  if (!result) return { resolved: false, outcome: "pending" };
  if (sportsSurvivorBool_(result.Cancelled, false)) return { resolved: true, outcome: "push", reason: "cancelled" };
  if (!sportsSurvivorBool_(result.Completed, false)) return { resolved: false, outcome: "pending" };
  const isHome = sportsSurvivorKey_(meta.side) === "home";
  const teamScore = sportsSurvivorNumber_(isHome ? result.HomeScore : result.AwayScore, NaN);
  const opponentScore = sportsSurvivorNumber_(isHome ? result.AwayScore : result.HomeScore, NaN);
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) return { resolved: false, outcome: "pending" };
  let adjusted = teamScore;
  let spread = 0;
  if (resultMode === "spread") {
    spread = sportsSurvivorNumber_(meta.spread, NaN);
    if (!Number.isFinite(spread)) return { resolved: false, outcome: "pending-line" };
    adjusted += spread;
  }
  const outcome = adjusted > opponentScore ? "win" : adjusted < opponentScore ? "loss" : "push";
  return { resolved: true, outcome: outcome, teamScore: teamScore, opponentScore: opponentScore, spread: resultMode === "spread" ? spread : "" };
}

function sportsSurvivorEvaluateUser_(username, gameId, categories, settings, optionMeta, resultMap, pickMetaMap) {
  const userKey = sportsSurvivorKey_(username);
  const userPicks = pickMetaMap[userKey] || {};
  let alive = true;
  let eliminatedRound = 0;
  let eliminatedReason = "";
  let lossesUsed = 0;
  let earnedLives = 0;
  let roundsSurvived = 0;
  let winStreak = 0;
  let bestStreak = 0;
  let totalPoints = 0;
  let currentRoundIndex = -1;
  let blockedByEarlierUnresolved = false;
  const usage = {};
  const rounds = [];

  (categories || []).forEach(function(category, index) {
    const categoryId = sportsSurvivorKey_(category.id);
    const week = sportsSurvivorRoundWeek_(category, index);
    const rules = sportsSurvivorRoundRules_(settings, week);
    const roundEligible = !blockedByEarlierUnresolved;
    if (roundEligible && !alive && rules.secondChance) {
      alive = true;
      eliminatedRound = 0;
      eliminatedReason = "";
      lossesUsed = 0;
      winStreak = 0;
    }
    const pick = userPicks[categoryId] || { nomineeIds: [], snapshots: [], confidencePoints: 0 };
    const nomineeIds = Array.isArray(pick.nomineeIds) ? pick.nomineeIds.map(sportsSurvivorKey_).filter(Boolean) : [];
    nomineeIds.forEach(function(id) { usage[id] = (usage[id] || 0) + 1; });
    const sourceResolved = sportsSurvivorCategoryResolved_(categoryId, optionMeta, resultMap);
    let resolved = roundEligible && sourceResolved;
    if (roundEligible && !sourceResolved && currentRoundIndex === -1 && alive) currentRoundIndex = index;
    let status = resolved ? "resolved" : (currentRoundIndex === index && alive ? (nomineeIds.length ? "picked" : "open") : "upcoming");
    let outcome = "pending";
    let earnedPoints = 0;
    let multiplier = 1;
    let lifeEarned = false;
    let safeApplied = false;
    let lossApplied = false;
    let missed = false;
    const selectionResults = [];

    if (resolved && alive) {
      if (nomineeIds.length < rules.requiredSelections) {
        missed = true;
        outcome = "loss";
        status = "missed";
        if (settings.missedPickRule === "eliminate") {
          alive = false;
          eliminatedRound = week;
          eliminatedReason = "missed";
        } else if (settings.missedPickRule === "no-result") {
          outcome = "push";
        }
      } else {
        nomineeIds.forEach(function(nomineeId, selectionIndex) {
          const currentMeta = (optionMeta[categoryId] || {})[nomineeId] || {};
          const snapshot = (pick.snapshots || [])[selectionIndex] || {};
          selectionResults.push(sportsSurvivorGradeSelection_(snapshot, currentMeta, resultMap[categoryId] || {}, rules.resultMode, settings.oddsFreezeMode));
        });
        if (selectionResults.some(function(row) { return !row.resolved; })) {
          resolved = false;
          if (currentRoundIndex === -1 && alive) currentRoundIndex = index;
          status = "pending";
        } else {
          const outcomes = selectionResults.map(function(row) { return row.outcome; });
          if (rules.selectionRule === "any") outcome = outcomes.indexOf("win") !== -1 ? "win" : (outcomes.every(function(v) { return v === "push"; }) ? "push" : "loss");
          else outcome = outcomes.indexOf("loss") !== -1 ? "loss" : (outcomes.indexOf("push") !== -1 ? "push" : "win");
        }
      }

      if (outcome === "push") {
        if (settings.pushRule === "loss") outcome = "loss";
        else if (settings.pushRule === "no-result" || settings.pushRule === "survive") {
          status = "push";
          if (settings.mode === "streak-survivor") winStreak = 0;
        }
      }

      if (outcome === "win") {
        roundsSurvived++;
        winStreak++;
        bestStreak = Math.max(bestStreak, winStreak);
        if (settings.mode === "streak-survivor") {
          multiplier = 1 + Math.max(0, winStreak - 1) * settings.kothMultiplierStep;
          if (settings.kothMaxMultiplier > 0) multiplier = Math.min(settings.kothMaxMultiplier, multiplier);
          earnedPoints = settings.kothBasePoints * multiplier;
        } else {
          earnedPoints = Math.max(0, sportsSurvivorNumber_(category.points, 1));
        }
        if (rules.confidence) earnedPoints += Math.max(0, Math.min(settings.maxConfidenceRisk, sportsSurvivorNumber_(pick.confidencePoints, 0)));
        totalPoints += earnedPoints;
        status = "survived";
        if (settings.earnLifeEnabled && settings.maxEarnedLives > earnedLives && winStreak > 0 && winStreak % settings.earnLifeWinStreak === 0) {
          earnedLives++;
          lifeEarned = true;
        }
      } else if (outcome === "loss") {
        if (rules.safe) {
          safeApplied = true;
          status = "safe-loss";
        } else if (settings.mode === "streak-survivor") {
          lossApplied = true;
          if (rules.confidence) totalPoints -= Math.max(0, Math.min(settings.maxConfidenceRisk, sportsSurvivorNumber_(pick.confidencePoints, 0)));
          if (settings.kothLossBehavior === "drop-one") winStreak = Math.max(0, winStreak - 1);
          else if (settings.kothLossBehavior === "half") winStreak = Math.floor(winStreak / 2);
          else winStreak = 0;
          status = "loss-reset";
        } else {
          lossApplied = true;
          lossesUsed++;
          winStreak = 0;
          const availableLosses = settings.lossesAllowed + earnedLives;
          if (lossesUsed > availableLosses) {
            alive = false;
            eliminatedRound = week;
            eliminatedReason = missed ? "missed" : "loss";
            status = "eliminated";
          } else {
            status = "life-used";
          }
        }
      }
    } else if (resolved && !alive) {
      status = "after-elimination";
    }

    rounds.push({
      round: index + 1, week: week, categoryId: category.id, name: category.name, resolved: resolved,
      nomineeIds: nomineeIds, pickNomineeId: nomineeIds[0] || "", selectionResults: selectionResults,
      requiredSelections: rules.requiredSelections, selectionRule: rules.selectionRule, resultMode: rules.resultMode,
      outcome: outcome, status: status, earnedPoints: earnedPoints, multiplier: multiplier,
      winStreak: winStreak, bestStreak: bestStreak, lossesUsed: lossesUsed,
      livesRemaining: Math.max(0, settings.lossesAllowed + earnedLives - lossesUsed),
      earnedLives: earnedLives, lifeEarned: lifeEarned, safeApplied: safeApplied, lossApplied: lossApplied,
      missed: missed, rules: rules, confidencePoints: sportsSurvivorNumber_(pick.confidencePoints, 0)
    });

    if (roundEligible && !resolved) blockedByEarlierUnresolved = true;
  });

  const lastBuiltWeek = (categories || []).reduce(function(maxWeek, category, index) {
    return Math.max(maxWeek, sportsSurvivorRoundWeek_(category, index));
  }, 0);
  const complete = (categories || []).length > 0 && lastBuiltWeek >= settings.endWeek && rounds.every(function(round) {
    return round.resolved === true;
  });
  return {
    username: username, alive: settings.mode === "streak-survivor" ? true : alive,
    winner: settings.mode === "streak-survivor" ? complete : (alive && complete), complete: complete,
    eliminatedRound: eliminatedRound, eliminatedReason: eliminatedReason, roundsSurvived: roundsSurvived,
    totalPoints: totalPoints, currentRoundIndex: currentRoundIndex, rounds: rounds, usage: usage,
    lossesUsed: lossesUsed, earnedLives: earnedLives,
    livesRemaining: Math.max(0, settings.lossesAllowed + earnedLives - lossesUsed),
    winStreak: winStreak, bestStreak: bestStreak,
    currentMultiplier: settings.mode === "streak-survivor"
      ? Math.min(settings.kothMaxMultiplier > 0 ? settings.kothMaxMultiplier : 999999, 1 + Math.max(0, winStreak) * settings.kothMultiplierStep)
      : 1
  };
}

function sportsSurvivorOptionEligible_(meta, rules, usage, currentSelected, settings) {
  const id = sportsSurvivorKey_(meta.optionId || meta.teamId);
  const used = sportsSurvivorNumber_(usage[id], 0) - (currentSelected.indexOf(id) !== -1 ? 1 : 0);
  if (settings.teamUseLimit > 0 && used >= settings.teamUseLimit) return { eligible: false, reason: "used" };
  const kickoff = meta.kickoff ? new Date(meta.kickoff) : null;
  if (settings.pickLockMode === "team-kickoff" && kickoff && !isNaN(kickoff.getTime()) && Date.now() >= kickoff.getTime() && currentSelected.indexOf(id) === -1) return { eligible: false, reason: "started" };
  if (rules.roadOnly && sportsSurvivorKey_(meta.side) !== "away") return { eligible: false, reason: "road-only" };
  if (rules.underdogsOnly) {
    const spread = sportsSurvivorNumber_(meta.spread, NaN);
    if (!Number.isFinite(spread) || spread <= 0) return { eligible: false, reason: "underdogs-only" };
  }
  if (rules.divisionOnly && meta.divisionGame === false) return { eligible: false, reason: "division-only" };
  return { eligible: true, reason: "" };
}

function sportsSurvivorStandings_(gameId, extraUsernames) {
  const settings = survivorGetSettings_(gameId);
  const categories = survivorGameCategories_(gameId);
  const optionMeta = sportsSurvivorOptionMetaForGame_(gameId);
  const resultMap = sportsSurvivorResultsForGame_(gameId);
  const pickMetaMap = sportsSurvivorPickMetaMap_(gameId);
  const legacyPickMaps = typeof survivorAllPickMaps_ === "function" ? survivorAllPickMaps_(gameId) : {};
  const participants = typeof survivorParticipantUsernames_ === "function"
    ? survivorParticipantUsernames_(gameId, legacyPickMaps, extraUsernames)
    : Object.keys(pickMetaMap);
  const known = {};
  Object.keys(pickMetaMap).forEach(function(userKey) { known[userKey] = userKey; });
  participants.forEach(function(username) { known[sportsSurvivorKey_(username)] = username; });
  const rows = Object.keys(known).map(function(key) {
    const username = known[key];
    const evaluation = sportsSurvivorEvaluateUser_(username, gameId, categories, settings, optionMeta, resultMap, pickMetaMap);
    const profile = typeof getLeaderboardUserProfile_ === "function" ? (getLeaderboardUserProfile_(username, gameId) || {}) : {};
    return {
      user: username, username: username, displayName: profile.displayName || username, avatar: profile.avatar || "👤",
      themeColor: profile.themeColor || profile.profileColor || "#354785", profileColor: profile.profileColor || profile.themeColor || "#354785",
      profileColorMode: profile.profileColorMode || "solid", profileColor2: profile.profileColor2 || "#354785", profileGradientAngle: profile.profileGradientAngle || "135",
      total: evaluation.totalPoints, remaining: 0, max: evaluation.totalPoints, statues: 0,
      fixedPointsEnabled: true, fixedPoints: evaluation.totalPoints, fixedRemaining: 0,
      survivorAlive: evaluation.alive, survivorWinner: evaluation.winner, survivorComplete: evaluation.complete,
      survivorRoundsSurvived: evaluation.roundsSurvived, survivorEliminatedRound: evaluation.eliminatedRound,
      survivorEliminatedReason: evaluation.eliminatedReason, survivorLossesUsed: evaluation.lossesUsed,
      survivorLivesRemaining: evaluation.livesRemaining, survivorEarnedLives: evaluation.earnedLives,
      survivorWinStreak: evaluation.winStreak, survivorBestStreak: evaluation.bestStreak,
      survivorMultiplier: evaluation.currentMultiplier, eliminated: !evaluation.alive,
      winChance: 0, scoringMode: settings.mode === "streak-survivor" ? "streak-survivor" : "survivor",
      leaderboardScoreMode: settings.mode === "streak-survivor" ? "streak-survivor" : "survivor"
    };
  });
  if (settings.mode !== "streak-survivor" && settings.endMode === "sole-survivor") {
    const aliveRows = rows.filter(function(row) { return row.survivorAlive; });
    const anyResolved = categories.some(function(category) { return sportsSurvivorCategoryResolved_(category.id, optionMeta, resultMap); });
    if (anyResolved && aliveRows.length === 1) aliveRows[0].survivorWinner = true;
  }
  return rows.sort(function(a, b) {
    if (settings.mode === "streak-survivor") {
      if (b.total !== a.total) return b.total - a.total;
      if (b.survivorWinStreak !== a.survivorWinStreak) return b.survivorWinStreak - a.survivorWinStreak;
      if (b.survivorBestStreak !== a.survivorBestStreak) return b.survivorBestStreak - a.survivorBestStreak;
    } else {
      if (!!a.survivorWinner !== !!b.survivorWinner) return a.survivorWinner ? -1 : 1;
      if (!!a.survivorAlive !== !!b.survivorAlive) return a.survivorAlive ? -1 : 1;
      if (b.survivorRoundsSurvived !== a.survivorRoundsSurvived) return b.survivorRoundsSurvived - a.survivorRoundsSurvived;
    }
    return sportsSurvivorString_(a.displayName).localeCompare(sportsSurvivorString_(b.displayName));
  });
}

function apiGetSportsSurvivorState_(payload) {
  payload = payload || {};
  const gameId = sportsSurvivorString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  const username = sportsSurvivorString_(payload.username);
  if (!gameId || !username) throw new Error("Username and GameId are required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || sportsSurvivorKey_(game.type) !== "survivor") throw new Error("This game is not a Survivor / Elimination game.");
  const settings = survivorGetSettings_(gameId);
  const categories = survivorGameCategories_(gameId);
  const optionMeta = sportsSurvivorOptionMetaForGame_(gameId);
  const resultMap = sportsSurvivorResultsForGame_(gameId);
  const pickMetaMap = sportsSurvivorPickMetaMap_(gameId);
  const evaluation = sportsSurvivorEvaluateUser_(username, gameId, categories, settings, optionMeta, resultMap, pickMetaMap);
  const standings = sportsSurvivorStandings_(gameId, [username]);
  const viewerStanding = standings.find(function(row) { return sportsSurvivorKey_(row.username) === sportsSurvivorKey_(username); });
  const winner = !!(viewerStanding && viewerStanding.survivorWinner);
  const currentIndex = evaluation.currentRoundIndex;
  const category = currentIndex >= 0 ? categories[currentIndex] : null;
  const round = currentIndex >= 0 ? evaluation.rounds[currentIndex] : null;
  let currentRound = null;
  if (category && round) {
    const categoryId = sportsSurvivorKey_(category.id);
    const rules = sportsSurvivorRoundRules_(settings, round.week);
    const selected = round.nomineeIds || [];
    const metas = optionMeta[categoryId] || {};
    const nominees = (category.nominees || []).map(function(nominee) {
      const id = sportsSurvivorKey_(nominee.id);
      const meta = Object.assign({ optionId: id, team: nominee.name, logoUrl: nominee.image || "" }, metas[id] || {});
      const eligibility = sportsSurvivorOptionEligible_(meta, rules, evaluation.usage, selected, settings);
      return {
        id: nominee.id, name: nominee.name, shortAnswer: nominee.shortAnswer || nominee.name,
        image: meta.logoUrl || nominee.image || "", teamRecord: settings.showRecords ? (meta.teamRecord || "") : "",
        opponent: settings.showOpponent ? (meta.opponent || "") : "", opponentRecord: settings.showRecords ? (meta.opponentRecord || "") : "",
        side: meta.side || "", homeAway: meta.homeAway || "", kickoff: meta.kickoff || "",
        spread: settings.showOdds || rules.resultMode === "spread" ? meta.spread : "",
        moneyline: settings.showOdds ? meta.moneyline : "", spreadOdds: settings.showOdds ? meta.spreadOdds : "",
        oddsSource: settings.showOdds ? meta.oddsSource : "", usedCount: Math.max(0, sportsSurvivorNumber_(evaluation.usage[id], 0) - (selected.indexOf(id) !== -1 ? 1 : 0)),
        useLimit: settings.teamUseLimit, eligible: eligibility.eligible || selected.indexOf(id) !== -1,
        unavailableReason: eligibility.eligible ? "" : eligibility.reason, selected: selected.indexOf(id) !== -1
      };
    });
    const categoryLocked = survivorCategoryLocked_(game, category);
    const selectedStarted = selected.some(function(id) {
      const kickoff = metas[id] && metas[id].kickoff ? new Date(metas[id].kickoff) : null;
      return settings.pickLockMode === "team-kickoff" && kickoff && !isNaN(kickoff.getTime()) && Date.now() >= kickoff.getTime();
    });
    currentRound = {
      round: currentIndex + 1, week: round.week, categoryId: category.id, name: category.name,
      points: Math.max(0, sportsSurvivorNumber_(category.points, 1)), locked: categoryLocked,
      lockDateTime: category.lockDateTime || "", pickNomineeId: selected[0] || "", pickNomineeIds: selected,
      canPick: evaluation.alive && !categoryLocked && !selectedStarted, nominees: nominees, rules: rules,
      requiredSelections: rules.requiredSelections, selectionRule: rules.selectionRule,
      confidenceEnabled: rules.confidence, maxConfidenceRisk: settings.maxConfidenceRisk,
      confidencePoints: round.confidencePoints || 0
    };
  }
  const usedTeams = {};
  Object.keys(evaluation.usage || {}).forEach(function(id) {
    if (evaluation.usage[id] > 0) usedTeams[id] = evaluation.usage[id];
  });
  return {
    success: true, sportsMode: true, mode: settings.mode, gameId: gameId, gameName: game.name || gameId,
    alive: evaluation.alive, winner: winner, eliminatedRound: evaluation.eliminatedRound,
    eliminatedReason: evaluation.eliminatedReason, roundsSurvived: evaluation.roundsSurvived,
    totalPoints: evaluation.totalPoints, complete: evaluation.complete, lossesUsed: evaluation.lossesUsed,
    lossesAllowed: settings.lossesAllowed, earnedLives: evaluation.earnedLives, livesRemaining: evaluation.livesRemaining,
    winStreak: evaluation.winStreak, bestStreak: evaluation.bestStreak, currentMultiplier: evaluation.currentMultiplier,
    teamUseLimit: settings.teamUseLimit, usedTeams: usedTeams, settings: settings,
    currentRound: currentRound, rounds: evaluation.rounds, standings: standings
  };
}

function sportsSurvivorSavePick_(payload) {
  payload = payload || {};
  const gameId = sportsSurvivorString_(payload.gameId);
  const username = sportsSurvivorString_(payload.username);
  const categoryId = sportsSurvivorKey_(payload.categoryId);
  let nomineeIds = Array.isArray(payload.nomineeIds) ? payload.nomineeIds : sportsSurvivorJsonParse_(payload.nomineeIdsJSON, []);
  if (!nomineeIds.length && payload.nomineeId) nomineeIds = [payload.nomineeId];
  nomineeIds = nomineeIds.map(sportsSurvivorKey_).filter(Boolean).filter(function(value, index, array) { return array.indexOf(value) === index; });
  if (!gameId || !username || !categoryId || !nomineeIds.length) throw new Error("Username, GameId, round, and Survivor team selection are required.");
  const state = apiGetSportsSurvivorState_({ username: username, gameId: gameId });
  if (!state.alive && state.mode !== "streak-survivor") throw new Error("Your Survivor entry has already been eliminated.");
  if (!state.currentRound || sportsSurvivorKey_(state.currentRound.categoryId) !== categoryId) throw new Error("Only the current Survivor week can be picked.");
  if (!state.currentRound.canPick) throw new Error("The current Survivor week is locked.");
  if (nomineeIds.length !== state.currentRound.requiredSelections) throw new Error("This week requires exactly " + state.currentRound.requiredSelections + " team selection" + (state.currentRound.requiredSelections === 1 ? "" : "s") + ".");
  const nomineeMap = {};
  (state.currentRound.nominees || []).forEach(function(nominee) { nomineeMap[sportsSurvivorKey_(nominee.id)] = nominee; });
  nomineeIds.forEach(function(id) {
    if (!nomineeMap[id]) throw new Error("That team is not available in this Survivor week.");
    if (!nomineeMap[id].eligible && !nomineeMap[id].selected) throw new Error(nomineeMap[id].name + " is not eligible: " + (nomineeMap[id].unavailableReason || "unavailable") + ".");
  });
  const confidencePoints = state.currentRound.confidenceEnabled
    ? Math.max(0, Math.min(state.currentRound.maxConfidenceRisk, sportsSurvivorNumber_(payload.confidencePoints, 0)))
    : 0;
  const snapshots = nomineeIds.map(function(id) {
    const nominee = nomineeMap[id];
    return {
      optionId: id, team: nominee.name, sportsGameId: nominee.sportsGameId || "",
      espnEventId: nominee.espnEventId || "", side: nominee.side || "", kickoff: nominee.kickoff || "",
      spread: nominee.spread, moneyline: nominee.moneyline, spreadOdds: nominee.spreadOdds,
      oddsSource: nominee.oddsSource || "", frozenAt: new Date().toISOString()
    };
  });
  // Use normalized metadata for IDs hidden from the public state object.
  const meta = sportsSurvivorOptionMetaForGame_(gameId)[categoryId] || {};
  snapshots.forEach(function(snapshot, index) {
    const source = meta[nomineeIds[index]] || {};
    snapshot.sportsGameId = source.sportsGameId || snapshot.sportsGameId;
    snapshot.espnEventId = source.espnEventId || snapshot.espnEventId;
    snapshot.side = source.side || snapshot.side;
    snapshot.spread = source.spread !== undefined ? source.spread : snapshot.spread;
    snapshot.moneyline = source.moneyline !== undefined ? source.moneyline : snapshot.moneyline;
  });
  sportsSurvivorSavePickMeta_(gameId, username, categoryId, nomineeIds, snapshots, confidencePoints);
  // Preserve compatibility with generic Picks/participant discovery using the primary team.
  const result = savePick({ username: username, gameId: gameId, categoryId: categoryId, nomineeId: nomineeIds[0], confidencePoints: 0, stakePoints: 0 });
  return { success: true, saved: true, nomineeIds: nomineeIds, confidencePoints: confidencePoints, result: result };
}

function apiGetSportsSurvivorTeamSchedule_(payload) {
  payload = payload || {};
  const gameId = sportsSurvivorString_(payload.gameId);
  const team = sportsSurvivorString_(payload.team);
  if (!gameId || !team) throw new Error("GameId and team are required.");
  const settings = survivorGetSettings_(gameId);
  if (!settings.showSchedule) return { success: true, team: team, schedule: [] };
  const scores = sportsSurvivorFetchScores_(settings, { team: team });
  return {
    success: true, team: team,
    schedule: scores.map(function(score) {
      const home = sportsSurvivorKey_(score.HomeTeam) === sportsSurvivorKey_(team);
      return {
        week: score.Week || "", opponent: home ? score.AwayTeam : score.HomeTeam, homeAway: home ? "HOME" : "AWAY",
        opponentRecord: home ? score.AwayRecord : score.HomeRecord, teamRecord: home ? score.HomeRecord : score.AwayRecord,
        kickoff: score.GameDateTime || "", status: score.Status || "", completed: sportsSurvivorResultComplete_(score),
        teamScore: home ? score.HomeScore : score.AwayScore, opponentScore: home ? score.AwayScore : score.HomeScore
      };
    }).sort(function(a, b) { return sportsSurvivorNumber_(a.week, 999) - sportsSurvivorNumber_(b.week, 999); })
  };
}

function sportsSurvivorUserScoring_(username, gameId) {
  const settings = survivorGetSettings_(gameId);
  const categories = survivorGameCategories_(gameId);
  const optionMeta = sportsSurvivorOptionMetaForGame_(gameId);
  const resultMap = sportsSurvivorResultsForGame_(gameId);
  const pickMeta = sportsSurvivorPickMetaMap_(gameId);
  const evaluation = sportsSurvivorEvaluateUser_(username, gameId, categories, settings, optionMeta, resultMap, pickMeta);
  const scoring = {};
  evaluation.rounds.forEach(function(round, index) {
    const category = categories[index] || {};
    scoring[sportsSurvivorKey_(round.categoryId)] = {
      shortName: category.shortName || category.name || round.name,
      nomineeId: round.pickNomineeId || "", winnerNomineeId: "", earnedPoints: round.earnedPoints,
      remainingPoints: 0, finalPointsAvailable: settings.mode === "streak-survivor" ? settings.kothBasePoints * (settings.kothMaxMultiplier || 1) : Math.max(0, sportsSurvivorNumber_(category.points, 1)),
      locked: round.resolved, resolved: round.resolved, correct: round.outcome === "win", wrong: round.outcome === "loss",
      push: round.outcome === "push", status: round.status,
      scoringMode: settings.mode === "streak-survivor" ? "streak-survivor" : "survivor", confidenceScoringMode: ""
    };
  });
  return scoring;
}

function sportsSurvivorNextWeekToBuild_(gameId, settings, categories) {
  const built = {};
  (categories || []).forEach(function(category, index) { built[String(sportsSurvivorRoundWeek_(category, index))] = true; });
  for (let week = settings.startWeek; week <= settings.endWeek; week++) if (!built[String(week)]) return week;
  return 0;
}

function survivorRunSportsAutomation_(gameId, options) {
  options = options || {};
  const settings = survivorGetSettings_(gameId);
  if (settings.mode === "king-of-the-hill" && typeof kingOfHillRunAutomation_ === "function") {
    return kingOfHillRunAutomation_(gameId, {
      manual: options.manual === true,
      week: options.week || 0,
      maxWeeks: options.maxWeeks || (options.manual === true ? 18 : 2)
    });
  }
  if (settings.mode === "manual-elimination") return { success: true, skipped: true, reason: "manual-elimination" };
  let categories = survivorGameCategories_(gameId);
  const actions = [];
  if (!categories.length && settings.autoBuildNextWeek) {
    actions.push({ build: sportsSurvivorBuildWeek_(gameId, settings.startWeek, {}) });
    categories = survivorGameCategories_(gameId);
  }
  let optionMeta = sportsSurvivorOptionMetaForGame_(gameId);
  let resultMap = sportsSurvivorResultsForGame_(gameId);
  categories.forEach(function(category, index) {
    const week = sportsSurvivorRoundWeek_(category, index);
    if (week >= settings.startWeek && week <= settings.endWeek && !sportsSurvivorCategoryResolved_(category.id, optionMeta, resultMap)) {
      try { actions.push({ sync: sportsSurvivorSyncWeek_(gameId, week, { refreshOdds: settings.autoRefreshOdds }) }); }
      catch (err) { actions.push({ week: week, error: err.message }); }
    }
  });
  if (settings.autoBuildNextWeek) {
    optionMeta = sportsSurvivorOptionMetaForGame_(gameId);
    resultMap = sportsSurvivorResultsForGame_(gameId);
    const allBuiltResolved = categories.length > 0 && categories.every(function(category) { return sportsSurvivorCategoryResolved_(category.id, optionMeta, resultMap); });
    if (allBuiltResolved && settings.mode !== "streak-survivor" && settings.endMode === "sole-survivor") {
      const standings = sportsSurvivorStandings_(gameId, []);
      const alive = standings.filter(function(row) { return row.survivorAlive; });
      if (standings.length > 1 && alive.length === 1) {
        return { success: true, gameId: gameId, complete: true, soleSurvivor: alive[0].username, actions: actions };
      }
      if (standings.length > 1 && alive.length === 0) {
        return { success: true, gameId: gameId, needsAdminReview: true, reason: "all-eliminated", actions: actions };
      }
    }
    if (allBuiltResolved) {
      const nextWeek = sportsSurvivorNextWeekToBuild_(gameId, settings, categories);
      if (nextWeek) {
        try { actions.push({ build: sportsSurvivorBuildWeek_(gameId, nextWeek, {}) }); }
        catch (err) { actions.push({ week: nextWeek, buildError: err.message }); }
      }
    }
  }
  return { success: true, gameId: gameId, actions: actions };
}

function survivorSportsAutomationTick() {
  const games = typeof getGames === "function" ? getGames() : [];
  const results = [];
  (games || []).forEach(function(game) {
    const gameId = sportsSurvivorString_(game.gameId || game.GameId);
    if (!gameId || sportsSurvivorKey_(game.type || game.Type) !== "survivor") return;
    const settings = survivorGetSettings_(gameId);
    if (!settings.automationEnabled || settings.mode === "manual-elimination") return;
    try { results.push(survivorRunSportsAutomation_(gameId, {})); }
    catch (err) { results.push({ success: false, gameId: gameId, error: err.message }); }
  });
  return results;
}

function survivorEnsureSportsAutomationTrigger_() {
  if (typeof ScriptApp === "undefined") return { success: false, unsupported: true };
  const functionName = "survivorSportsAutomationTick";
  const existing = ScriptApp.getProjectTriggers().filter(function(trigger) { return trigger.getHandlerFunction() === functionName; });
  if (!existing.length) ScriptApp.newTrigger(functionName).timeBased().everyMinutes(15).create();
  return { success: true, installed: existing.length === 0, active: true };
}

function apiAdminBuildSportsSurvivorWeek_(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  const gameId = sportsSurvivorString_(payload.gameId);
  if (!gameId) throw new Error("GameId is required.");
  const settings = survivorGetSettings_(gameId);
  if (settings.mode === "king-of-the-hill" && typeof kothProcessWeek_ === "function") {
    const week = Math.floor(sportsSurvivorNumber_(payload.week, settings.startWeek));
    return kothProcessWeek_(gameId, week, { allowGeneric: true });
  }
  return sportsSurvivorBuildWeek_(gameId, payload.week, { refresh: sportsSurvivorBool_(payload.refresh, false) });
}

function apiAdminRunSportsSurvivor_(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  const gameId = sportsSurvivorString_(payload.gameId);
  if (!gameId) throw new Error("GameId is required.");
  return survivorRunSportsAutomation_(gameId, { manual: true, week: payload.week || 0, maxWeeks: 18 });
}

function apiAdminInstallSportsSurvivorAutomation_(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return survivorEnsureSportsAutomationTrigger_();
}
