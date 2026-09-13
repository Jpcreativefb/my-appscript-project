const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

// Backend Sports Hub discovery must use SurvivorSettings, not display-name guesses.
const backendContext = {
  console,
  survivorGetSettings_: gameId => {
    if (gameId === 'sports-survivor-no-nfl-name') return { mode: 'sports-survivor', league: 'nfl' };
    if (gameId === 'streak-no-nfl-name') return { mode: 'streak-survivor', league: 'nfl' };
    if (gameId === 'koth-no-nfl-name') return { mode: 'king-of-the-hill', league: 'nfl' };
    if (gameId === 'ncaa-survivor') return { mode: 'sports-survivor', league: 'ncaa' };
    return { mode: 'manual-elimination', league: 'nfl' };
  }
};
vm.createContext(backendContext);
vm.runInContext(read('backend/engines/AppDataEngine.js'), backendContext, { filename: 'AppDataEngine.js' });

let placement = backendContext.getDashboardHubPlacement_({
  gameId: 'sports-survivor-no-nfl-name', name: 'Last Team Standing', type: 'survivor'
}, 'survivor');
assert.strictEqual(placement.category, 'sports');
assert.strictEqual(placement.group, 'NFL');
assert.strictEqual(placement.survivorMode, 'sports-survivor');
assert.strictEqual(placement.sportsLeague, 'nfl');

placement = backendContext.getDashboardHubPlacement_({
  gameId: 'koth-no-nfl-name', name: 'Avoid the Bottom', type: 'survivor'
}, 'survivor');
assert.strictEqual(placement.category, 'sports');
assert.strictEqual(placement.group, 'NFL');
assert.strictEqual(placement.survivorMode, 'king-of-the-hill');

placement = backendContext.getDashboardHubPlacement_({
  gameId: 'manual-survivor', name: 'Survivor Season 50', type: 'survivor'
}, 'survivor');
assert.strictEqual(placement.category, 'reality');
assert.strictEqual(placement.group, 'Survivor');

placement = backendContext.getDashboardHubPlacement_({
  gameId: 'ncaa-survivor', name: 'Campus Last Team Standing', type: 'survivor'
}, 'survivor');
assert.strictEqual(placement.category, 'sports');
assert.strictEqual(placement.group, 'NCAA');

// Frontend slot discovery must trust sports hub classification and not require "NFL" in names.
const sportsContext = { console };
vm.createContext(sportsContext);
vm.runInContext(read('frontend/js/pages/sportsLaunchCore.js'), sportsContext, { filename: 'sportsLaunchCore.js' });
const core = sportsContext.PATTCSportsLaunchCore;
assert(core, 'Sports Launch Core did not load');

const hubModel = core.sportsHubModel([
  { gameId:'sports-survivor-no-nfl-name', name:'Last Team Standing', type:'survivor', hubCategory:'sports', hubGroup:'NFL', sportsLeague:'nfl', survivorMode:'sports-survivor', active:true },
  { gameId:'koth-no-nfl-name', name:'Avoid the Bottom', type:'survivor', hubCategory:'sports', hubGroup:'NFL', sportsLeague:'nfl', survivorMode:'king-of-the-hill', active:true },
  { gameId:'ncaa-survivor', name:'Campus Last Team Standing', type:'survivor', hubCategory:'sports', hubGroup:'NCAA', sportsLeague:'ncaa', survivorMode:'sports-survivor', active:true }
], []);
const survivorSlot = hubModel.slots.find(s => s.slot === 'survivor');
const kothSlot = hubModel.slots.find(s => s.slot === 'koth');
assert(survivorSlot && survivorSlot.game, 'Sports Survivor slot is empty');
assert.strictEqual(survivorSlot.game.gameId, 'sports-survivor-no-nfl-name');
assert(kothSlot && kothSlot.game, 'KOTH slot is empty');
assert.strictEqual(kothSlot.game.gameId, 'koth-no-nfl-name');

// Confidence optional contract: source must preserve blank-confidence base pick and autosave behavior.
const scoring = read('backend/engines/ScoringEngine.js');
const picks = read('frontend/js/pages/picks.js');
assert(scoring.includes('saved team + blank confidence = basic +1 / 0 pick.'));
assert(scoring.includes('return selectedConfidence > 0') && scoring.includes(': 1;'));
// Current compact Confidence UX intentionally removes the redundant intro
// while preserving immediate winner autosave + optional Confidence behavior.
assert(!picks.includes('Pick the winner first. The team saves immediately. Confidence is optional.'));
assert(picks.includes('function confidenceAutosaveActionsHtml_()'));
assert(picks.includes('Complete for now — your picks are saved.'));
assert(picks.includes('No confidence · +1 / 0'));
assert(picks.includes('await rc24kSaveConfidenceRow_(category.id);'));
assert(picks.includes('Pick a team before assigning confidence.'));

// KOTH passive contract must remain protected in dashboard progress and launch action behavior.
const appData = read('backend/engines/AppDataEngine.js');
const launch = read('frontend/js/pages/sportsLaunchCore.js');
assert(appData.includes('Automatic — no weekly pick required'));
assert(appData.includes('state.passiveKoth === true'));
assert(launch.includes('KOTH is passive by contract'));

console.log('Ed RC24M functional recovery tests: PASS');

// Sports Survivor build/refresh must self-heal from an empty or partial week and
// tolerate valid Sports Scores Engine response envelopes without manual team entry.
const survivorContext = { console };
vm.createContext(survivorContext);
vm.runInContext(read('backend/engines/SportsSurvivorEngine.js'), survivorContext, { filename: 'SportsSurvivorEngine.js' });

const survivorSettings = Object.assign(
  {},
  survivorContext.sportsSurvivorDefaultSettings_('fixture-survivor'),
  {
    gameId: 'fixture-survivor',
    mode: 'sports-survivor',
    sport: 'football',
    league: 'nfl',
    seasonYear: '2026',
    seasonType: '2',
    seasonPhase: 'regular',
    startWeek: 1,
    endWeek: 18,
    resultMode: 'straight-up',
    showOdds: false,
    autoRefreshOdds: false,
    autoBuildNextWeek: true,
    automationEnabled: true
  }
);
const scoreFixture = {
  GameId: 'nfl_1', ESPNEventId: '1', Sport: 'football', League: 'nfl',
  HomeTeam: 'Chicago Bears', AwayTeam: 'Green Bay Packers',
  HomeLogo: 'https://example.test/chi.png', AwayLogo: 'https://example.test/gb.png',
  HomeRecord: '1-0', AwayRecord: '0-1', GameDateTime: '2026-09-13T17:00:00Z'
};

let fetchParams = null;
survivorContext.sportsWagerFetchJson_ = params => {
  fetchParams = params;
  return { success: true, events: [scoreFixture] };
};
survivorContext.sportsWagerNormalizeScore_ = score => score;
let fetched = survivorContext.sportsSurvivorFetchScores_(survivorSettings, { week: 1 });
assert.strictEqual(fetched.length, 1, 'events response envelope must be accepted');
assert.strictEqual(fetchParams.week, 1);
assert.strictEqual(fetchParams.seasonType, '2');
assert(!Object.prototype.hasOwnProperty.call(fetchParams, 'seasonPhase'), 'Survivor must not over-filter live Sports Scores by UI seasonPhase label');
survivorContext.sportsWagerFetchJson_ = () => ({ success: true, data: { games: [scoreFixture] } });
fetched = survivorContext.sportsSurvivorFetchScores_(survivorSettings, { week: 1 });
assert.strictEqual(fetched.length, 1, 'nested data.games response envelope must be accepted');

let categoriesFixture = [];
let normalizedFixture = {};
let normalizedQuestion = null;
let bulkCalls = [];
let resultWrites = 0;
let cacheClears = 0;
survivorContext.survivorGetSettings_ = () => survivorSettings;
survivorContext.getCategories = () => categoriesFixture;
survivorContext.survivorGameCategories_ = () => categoriesFixture;
survivorContext.sportsSurvivorFetchScores_ = () => [scoreFixture];
survivorContext.sportsSurvivorFetchOddsBulk_ = () => ({});
survivorContext.adminCreateCategory = payload => {
  categoriesFixture.push({ id: payload.categoryId, roundNumber: payload.roundNumber, displayOrder: payload.displayOrder, nominees: [] });
  return { success: true };
};
survivorContext.adminBulkCreateNominees = payload => {
  bulkCalls.push(payload.items.map(item => item.nomineeId));
  const category = categoriesFixture.find(item => item.id === payload.categoryId);
  payload.items.forEach(item => category.nominees.push({ id: item.nomineeId, nomineeId: item.nomineeId, name: item.nominee }));
  return { success: true };
};
survivorContext.sportsSurvivorOptionMetaForGame_ = () => normalizedFixture;
survivorContext.normalizedStorageUpsertQuestion_ = payload => { normalizedQuestion = payload; };
survivorContext.normalizedStorageUpsertOptionsBulk_ = rows => {
  rows.forEach(row => {
    if (!normalizedFixture[row.questionId]) normalizedFixture[row.questionId] = {};
    normalizedFixture[row.questionId][row.optionId] = Object.assign({}, JSON.parse(row.payloadJSON), { optionId: row.optionId, name: row.option, logoUrl: row.logoUrl });
  });
};
survivorContext.sportsSurvivorUpsertResults_ = () => { resultWrites += 1; };
survivorContext.clearGameDataCaches = () => { cacheClears += 1; };

let build = survivorContext.sportsSurvivorBuildWeek_('fixture-survivor', 1, { refresh: true });
assert.strictEqual(build.success, true);
assert.strictEqual(build.createdCategory, true);
assert.strictEqual(build.teams, 2);
assert.strictEqual(build.createdTeams, 2);
assert.strictEqual(categoriesFixture[0].nominees.length, 2);
assert(normalizedQuestion && normalizedQuestion.questionId === build.categoryId);
assert.strictEqual(Object.keys(normalizedFixture[build.categoryId]).length, 2);
const bears = normalizedFixture[build.categoryId]['chicago-bears'];
assert(bears, 'home team normalized option missing');
assert.strictEqual(bears.opponent, 'Green Bay Packers');
assert.strictEqual(bears.homeAway, 'HOME');
assert.strictEqual(bears.sportsGameId, 'nfl_1');
assert.strictEqual(bears.espnEventId, '1');
assert.strictEqual(bears.teamRecord, '1-0');
assert.strictEqual(bears.opponentRecord, '0-1');
assert.strictEqual(bears.kickoff, '2026-09-13T17:00:00Z');
assert.strictEqual(resultWrites, 1);
assert.strictEqual(cacheClears, 1);

// Simulate a failed historical build that left only the category + one legacy team.
const categoryId = build.categoryId;
categoriesFixture = [{ id: categoryId, roundNumber: 1, displayOrder: 1, nominees: [{ id: 'green-bay-packers', nomineeId: 'green-bay-packers' }] }];
normalizedFixture = {};
bulkCalls = [];
build = survivorContext.sportsSurvivorBuildWeek_('fixture-survivor', 1, { refresh: true });
assert.strictEqual(build.repaired, true, 'partial category must be repaired rather than treated as duplicate');
assert.strictEqual(build.createdCategory, false);
assert.strictEqual(build.createdTeams, 1, 'only the missing legacy team should be inserted');
assert.deepStrictEqual(JSON.parse(JSON.stringify(bulkCalls)), [['chicago-bears']]);
assert.strictEqual(build.repairedNormalizedOptions, 2);
assert.strictEqual(categoriesFixture[0].nominees.length, 2);
assert.strictEqual(Object.keys(normalizedFixture[categoryId]).length, 2);

// A complete week remains idempotent: no duplicate legacy answer rows are appended.
bulkCalls = [];
build = survivorContext.sportsSurvivorBuildWeek_('fixture-survivor', 1, { refresh: true });
assert.strictEqual(build.duplicate, true);
assert.strictEqual(build.createdTeams, 0);
assert.strictEqual(bulkCalls.length, 0);
assert.strictEqual(Object.keys(normalizedFixture[categoryId]).length, 2);

// Empty-game automation must call StartWeek automatically when enabled.
let automationCategoryCalls = 0;
let automationBuiltWeek = 0;
survivorContext.survivorGetSettings_ = () => survivorSettings;
survivorContext.survivorGameCategories_ = () => (++automationCategoryCalls === 1 ? [] : [{ id: categoryId, roundNumber: 1 }]);
survivorContext.sportsSurvivorBuildWeek_ = (gameId, week) => {
  automationBuiltWeek = week;
  return { success: true, gameId, week, categoryId, teams: 2 };
};
survivorContext.sportsSurvivorOptionMetaForGame_ = () => ({});
survivorContext.sportsSurvivorResultsForGame_ = () => ({});
survivorContext.sportsSurvivorCategoryResolved_ = () => false;
const automation = survivorContext.survivorRunSportsAutomation_('fixture-survivor', {});
assert.strictEqual(automation.success, true);
assert.strictEqual(automationBuiltWeek, 1, 'zero-category automation must build configured StartWeek');
assert(automation.actions.some(action => action.build && action.build.week === 1));

console.log('Ed RC24M Survivor builder recovery tests: PASS');

// Survivor Compare privacy: viewer keeps own pre-kickoff pick; rival data is
// redacted server-side until the established reveal rule permits it.
const futureKickoff = '2099-09-13T17:00:00Z';
survivorContext.sportsSurvivorStandings_ = () => [
  { username: 'viewer', displayName: 'Viewer' },
  { username: 'rival', displayName: 'Rival' }
];
survivorContext.getGameRuntimeConfig = () => ({ gameId: 'fixture-survivor', type: 'survivor' });
survivorContext.survivorCategoryLocked_ = () => false;
survivorContext.sportsSurvivorEvaluateUser_ = username => ({
  alive: true,
  totalPoints: username === 'viewer' ? 4 : 7,
  winStreak: username === 'viewer' ? 2 : 3,
  lossesUsed: username === 'viewer' ? 0 : 1,
  livesRemaining: username === 'viewer' ? 1 : 0,
  rounds: [{
    week: 1,
    categoryId: 'week-1',
    nomineeIds: [username === 'viewer' ? 'chicago-bears' : 'green-bay-packers'],
    resolved: false,
    outcome: 'pending',
    earnedPoints: 0,
    winStreak: username === 'viewer' ? 2 : 3,
    lossesUsed: username === 'viewer' ? 0 : 1,
    livesRemaining: username === 'viewer' ? 1 : 0,
    selectionResults: [{ teamScore: 0, opponentScore: 0 }]
  }]
});
const comparePrivacy = survivorContext.sportsSurvivorRc24aCompare_(
  'viewer',
  'fixture-survivor',
  { leagueId: '' },
  [{ id: 'week-1' }],
  survivorSettings,
  {
    'week-1': {
      'chicago-bears': { team: 'Chicago Bears', opponent: 'Green Bay Packers', logoUrl: 'chi.png', kickoff: futureKickoff },
      'green-bay-packers': { team: 'Green Bay Packers', opponent: 'Chicago Bears', logoUrl: 'gb.png', kickoff: futureKickoff }
    }
  },
  {},
  {}
);
const viewerCompare = comparePrivacy.find(row => row.username === 'viewer');
const rivalCompare = comparePrivacy.find(row => row.username === 'rival');
assert(viewerCompare && rivalCompare, 'Compare fixture must include viewer and rival');
assert.strictEqual(viewerCompare.weeks[0].hidden, false, 'viewer own saved pick must stay visible before kickoff');
assert.strictEqual(viewerCompare.weeks[0].teamId, 'chicago-bears');
assert.strictEqual(viewerCompare.weeks[0].team, 'Chicago Bears');
assert.strictEqual(rivalCompare.weeks[0].hidden, true, 'rival pre-kickoff pick must remain hidden');
[
  'teamId', 'team', 'logoUrl', 'opponent', 'finalScore', 'result',
  'weeklyPoints', 'streak', 'lossesUsed', 'livesRemaining'
].forEach(field => assert.strictEqual(rivalCompare.weeks[0][field], null, `hidden rival ${field} must be redacted by backend`));

// The shared adapter must carry backend redaction through as a null cell value;
// the browser is never asked to hide a populated rival selection.
const sharedCompareSource = read('backend/engines/SharedCompareEngine.js');
assert(sharedCompareSource.includes("if (item && item.hidden === true) return { username: username, hidden: true, value: null };"));

console.log('Ed RC24M Survivor Compare privacy tests: PASS');
