const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const nflSource = fs.readFileSync(path.join(root, 'backend/engines/NflCurrentWeekEngine.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyEngine.js'), 'utf8');
const gameDaySource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyGameDayEngine.js'), 'utf8');

const context = { console, Date, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Math };
vm.createContext(context);
vm.runInContext(nflSource, context, { filename: 'NflCurrentWeekEngine.js' });
vm.runInContext(engineSource, context, { filename: 'SportsTeamFantasyEngine.js' });

function game(date, completed) {
  return { gameDateTime: date, completed: completed === true, state: completed ? 'post' : 'pre', status: completed ? 'Final' : 'Scheduled' };
}

// Shared resolver: fully final current estimate advances only when the next schedule exists.
{
  const day = 24 * 60 * 60 * 1000;
  const week1 = Date.UTC(2026, 8, 10, 0, 0, 0);
  const schedules = {
    1: [game(new Date(week1).toISOString(), true)],
    3: [game(new Date(week1 + 14 * day).toISOString(), true)],
    4: [game(new Date(week1 + 21 * day).toISOString(), false)]
  };
  let timing = context.pattcNflResolveCurrentWeek_({
    startWeek: 1, endWeek: 18, fallbackWeek: 2, nowMs: week1 + 14 * day + 3600000,
    fetchWeek: week => schedules[week] || []
  });
  assert.strictEqual(timing.week, 4, 'fully final week + next schedule must advance');

  schedules[3] = [game(new Date(week1 + 14 * day).toISOString(), false)];
  timing = context.pattcNflResolveCurrentWeek_({
    startWeek: 1, endWeek: 18, fallbackWeek: 2, nowMs: week1 + 14 * day + 3600000,
    fetchWeek: week => schedules[week] || []
  });
  assert.strictEqual(timing.week, 3, 'unresolved week must not advance early');
}

// Team Fantasy wrapper: NFL Week 1 is the anchor; stored CurrentWeek is fallback/admin context.
{
  const day = 24 * 60 * 60 * 1000;
  const week1 = Date.UTC(2026, 8, 10, 0, 0, 0);
  const settings = { currentWeek: 2, seasonYear: 2026 };
  const schedules = {
    1: { games: [game(new Date(week1).toISOString(), true)] },
    3: { games: [game(new Date(week1 + 14 * day).toISOString(), true)] },
    4: { games: [game(new Date(week1 + 21 * day).toISOString(), false)] }
  };
  context.teamFantasyFetchWeekSchedule_ = (gameId, week) => schedules[week] || { games: [], byTeam: {} };
  const timing = context.teamFantasyNflWeekTiming_('g', settings, { nowMs: week1 + 14 * day + 3600000 });
  assert.strictEqual(timing.week, 4);
  assert.strictEqual(timing.storedWeek, 2);
  assert.strictEqual(timing.mode, 'auto');
}

const fixedTiming = { week: 4, mode: 'auto', source: 'nfl-schedule-state', storedWeek: 2, scheduleByWeek: {} };
context.teamFantasyNflWeekTiming_ = () => ({ ...fixedTiming, scheduleByWeek: {} });
const settings = {
  gameId: 'g', seasonYear: 2026, currentWeek: 2, regularSeasonEndWeek: 18, teamUseLimit: 3,
  playoffUsageMode: 'reset', reminderEnabled: true, reminderThursday: true, reminderSunday: true,
  reminderFinalWindow: true, allowRandomPick: true, allowSmartAutoPick: true
};
context.teamFantasyGetSettings_ = () => settings;
context.teamFantasyRequireGameAccess_ = () => ({ allowed: true });
context.teamFantasyIsGame_ = () => true;
context.teamFantasyEnsureEntriesForUser_ = () => [];
context.teamFantasyPostseasonEligibility_ = () => ({});
context.teamFantasyEnsureRankingUniverseBeforeWeek_ = () => ({ success: true });
context.teamFantasyReadRows_ = () => [];
context.teamFantasyLeaguesForEntries_ = () => [];
context.teamFantasyBuildStandings_ = () => ({ success: false });
context.teamFantasyRules_ = () => [];
context.teamFantasyGetPlayerPreference_ = () => ({ mode: 'manual', scope: 'season' });
context.teamFantasyAutoFillActivation_ = () => ({ available: false, activeAtMs: 0 });
let fetchedWeeks = [];
context.teamFantasyFetchWeekSchedule_ = (gameId, week) => {
  fetchedWeeks.push(Number(week));
  return { games: [], byTeam: {} };
};

// Stored CurrentWeek=2, resolved=4: default player state is 4; explicit Week 2 stays historical Week 2.
{
  let state = context.apiGetTeamFantasyState({ username: 'alice', gameId: 'g' });
  assert.strictEqual(state.week, 4);
  assert.strictEqual(state.currentWeek, 4);
  assert.strictEqual(state.storedCurrentWeek, 2);
  assert.strictEqual(state.historicalWeekRequested, false);

  state = context.apiGetTeamFantasyState({ username: 'alice', gameId: 'g', week: 2 });
  assert.strictEqual(state.week, 2);
  assert.strictEqual(state.currentWeek, 4);
  assert.strictEqual(state.historicalWeekRequested, true);
  assert(fetchedWeeks.includes(2), 'explicit historical Week 2 must be honored');
}

// Automatic Fill uses the resolved week.
{
  let autoWeek = 0;
  let scheduleWeek = 0;
  context.teamFantasyGetPlayerPreference_ = () => ({ mode: 'auto', scope: 'season' });
  context.teamFantasyFetchWeekSchedule_ = (gameId, week) => { scheduleWeek = Number(week); return { games: [], byTeam: {} }; };
  context.teamFantasyAutoFillActivation_ = () => ({ available: true, activeAtMs: 0 });
  context.teamFantasyAutoPick_ = payload => { autoWeek = Number(payload.week); return { success: true }; };
  const result = context.teamFantasyRunAutomaticFillForPlayer_('g', 'alice', Date.now());
  assert.strictEqual(scheduleWeek, 4);
  assert.strictEqual(autoWeek, 4);
  assert.strictEqual(result.currentWeek, 4);
}

// Week-only protection expires after resolved week advances.
{
  context.teamFantasyGetPlayerPreference_ = () => ({ mode: 'auto', scope: 'week', autoFillWeek: 3 });
  const result = context.teamFantasyRunAutomaticFillForPlayer_('g', 'alice', Date.now());
  assert.strictEqual(result.reason, 'week-only-scope-expired');
  assert.strictEqual(result.currentWeek, 4);
  assert.strictEqual(result.targetWeek, 3);
}

// Reminder windows use resolved Week 4.
{
  let reminderWeek = 0;
  context.teamFantasyFetchWeekSchedule_ = (gameId, week) => {
    reminderWeek = Number(week);
    return { games: [{ gameDateTime: '2026-10-01T18:00:00Z' }], byTeam: {} };
  };
  const result = context.teamFantasyReminderKickoffWindows_('g', Date.UTC(2026, 9, 1, 12, 0, 0));
  assert.strictEqual(reminderWeek, 4);
  assert.strictEqual(result.policy.currentWeek, 4);
  assert.strictEqual(result.policy.storedCurrentWeek, 2);
}

// Game-day sync uses resolved Week 4.
{
  let gateWeek = 0, refreshWeek = 0;
  context.teamFantasyReadRows_ = name => name === context.TEAM_FANTASY_SHEETS.SETTINGS ? [{}] : [];
  context.teamFantasyNormalizeSettings_ = () => ({ ...settings, syncTriggerEnabled: true });
  context.teamFantasyGameDayTriggerWindow_ = (gameId, week) => { gateWeek = Number(week); return { active: true }; };
  context.teamFantasyRefreshAndScoreWeek_ = (gameId, week) => { refreshWeek = Number(week); return { success: true, week: Number(week), picks: 0, scored: 0, pending: 0, errors: [] }; };
  context.teamFantasyRecordSyncStatus_ = () => 'now';
  context.teamFantasySyncTriggerStatus_ = () => ({ active: true, count: 1 });
  const result = context.teamFantasySyncTriggerHandler();
  assert.strictEqual(gateWeek, 4);
  assert.strictEqual(refreshWeek, 4);
  assert.strictEqual(result.results[0].week, 4);
}

// Usage/history remains relative to the week being evaluated.
{
  context.teamFantasyReadRows_ = name => name === context.TEAM_FANTASY_SHEETS.PICKS ? [
    { GameId: 'g', SeasonYear: 2026, Week: 1, EntryId: 'e', Position: 'QB', TeamAbbr: 'BUF' },
    { GameId: 'g', SeasonYear: 2026, Week: 2, EntryId: 'e', Position: 'QB', TeamAbbr: 'BUF' },
    { GameId: 'g', SeasonYear: 2026, Week: 3, EntryId: 'e', Position: 'QB', TeamAbbr: 'BUF' }
  ] : [];
  const week2 = context.teamFantasyUsageCounts_('g', settings, 'e', 2);
  const week4 = context.teamFantasyUsageCounts_('g', settings, 'e', 4);
  assert.strictEqual(week2.QB.BUF, 1);
  assert.strictEqual(week4.QB.BUF, 3);
}

// No independent Tuesday/week arithmetic was introduced.
{
  const start = engineSource.indexOf('function teamFantasyNflWeekTiming_');
  const end = engineSource.indexOf('\nfunction teamFantasyPickRows_', start);
  const block = engineSource.slice(start, end);
  assert(block.includes('pattcNflResolveCurrentWeek_'));
  assert(block.includes('startWeek: 1'));
  assert(!/Tuesday|getDay\(|604800000|7\s*\*\s*24\s*\*\s*60/.test(block));
  assert(gameDaySource.includes('teamFantasyNflWeekTiming_'));
}

console.log('Team Fantasy Auto Week R1 tests: PASS');
