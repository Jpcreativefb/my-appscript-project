const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/SportsSurvivorEngine.js'), 'utf8');
const survivorEngine = fs.readFileSync(path.join(root, 'backend/engines/SurvivorGameEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'frontend/js/pages/admin.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/js/pages/survivor.js'), 'utf8');

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set,
  isFinite, parseInt, parseFloat
};
vm.createContext(context);
vm.runInContext(engine, context);

// Settings are league-aware instead of accidentally sending every league as football.
let settings = context.sportsSurvivorNormalizeSettings_({ mode: 'sports-survivor', league: 'nba', sport: 'football' }, 'g');
assert.strictEqual(settings.mode, 'sports-survivor');
assert.strictEqual(settings.sport, 'basketball');
assert.strictEqual(settings.teamUseLimit, 1);

// NFL divisional twists work even when the upstream score row has no explicit division flag.
assert.strictEqual(context.sportsSurvivorNflDivision_('Chicago Bears'), 'nfc-north');
assert.strictEqual(context.sportsSurvivorDivisionGame_({ league: 'nfl' }, { HomeTeam: 'Chicago Bears', AwayTeam: 'Green Bay Packers' }), true);
assert.strictEqual(context.sportsSurvivorDivisionGame_({ league: 'nfl' }, { HomeTeam: 'Chicago Bears', AwayTeam: 'Dallas Cowboys' }), false);

settings = context.sportsSurvivorNormalizeSettings_({
  mode: 'sports-survivor', league: 'nfl', lossesAllowed: 1, endWeek: 2,
  atsWeeks: '2', doublePickWeeks: '4', redemptionWeeks: '5', safeWeeks: '6',
  roadOnlyWeeks: '7', underdogWeeks: '8', secondChanceWeeks: '9', confidenceWeeks: '10'
}, 'g');
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 2).resultMode, 'spread');
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 4).requiredSelections, 2);
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 4).selectionRule, 'all');
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 5).selectionRule, 'any');
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 6).safe, true);
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 7).roadOnly, true);
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 8).underdogsOnly, true);
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 9).secondChance, true);
assert.strictEqual(context.sportsSurvivorRoundRules_(settings, 10).confidence, true);

// Straight-up and ATS grading use the frozen/current line correctly.
const resultRows = {
  game1: { Completed: true, HomeScore: 20, AwayScore: 24, Cancelled: false }
};
let grade = context.sportsSurvivorGradeSelection_({}, { sportsGameId: 'game1', side: 'home' }, resultRows, 'straight-up', 'weekly-lock');
assert.strictEqual(grade.outcome, 'loss');
grade = context.sportsSurvivorGradeSelection_({ sportsGameId: 'game1', side: 'home', spread: 6.5 }, { sportsGameId: 'game1', side: 'home', spread: 3.5 }, resultRows, 'spread', 'pick');
assert.strictEqual(grade.outcome, 'win', 'Pick-time ATS should grade the stored +6.5 snapshot.');
grade = context.sportsSurvivorGradeSelection_({ sportsGameId: 'game1', side: 'home', spread: 6.5 }, { sportsGameId: 'game1', side: 'home', spread: 3.5 }, resultRows, 'spread', 'weekly-lock');
assert.strictEqual(grade.outcome, 'loss', 'Weekly-lock ATS should grade the common current +3.5 line.');

function category(week) { return { id: 'w' + week, name: 'Week ' + week, roundNumber: week, points: 1 }; }
function option(team, game, side) { return { optionId: team, teamId: team, team: team, sportsGameId: game, side: side || 'home', kickoff: '2099-01-01T00:00:00Z' }; }
function result(game, home, away) { return { [game]: { Completed: true, Cancelled: false, HomeScore: home, AwayScore: away } }; }

// One allowed loss means the first wrong pick continues and the second eliminates.
const cats = [category(1), category(2)];
const metas = { w1: { a: option('a', 'g1', 'home') }, w2: { b: option('b', 'g2', 'home') } };
const results = { w1: result('g1', 10, 20), w2: result('g2', 7, 14) };
const picks = { user: {
  w1: { nomineeIds: ['a'], snapshots: [{ sportsGameId: 'g1', side: 'home' }], confidencePoints: 0 },
  w2: { nomineeIds: ['b'], snapshots: [{ sportsGameId: 'g2', side: 'home' }], confidencePoints: 0 }
} };
const lifeSettings = context.sportsSurvivorNormalizeSettings_({ mode: 'sports-survivor', league: 'nfl', lossesAllowed: 1, endWeek: 2 }, 'g');
let evalRow = context.sportsSurvivorEvaluateUser_('user', 'g', cats, lifeSettings, metas, results, picks);
assert.strictEqual(evalRow.rounds[0].status, 'life-used');
assert.strictEqual(evalRow.rounds[0].livesRemaining, 0);
assert.strictEqual(evalRow.alive, false);
assert.strictEqual(evalRow.eliminatedRound, 2);

// A Safe Week loss does not consume a life.
const safeSettings = context.sportsSurvivorNormalizeSettings_({ mode: 'sports-survivor', league: 'nfl', lossesAllowed: 0, safeWeeks: '1', endWeek: 1 }, 'g');
evalRow = context.sportsSurvivorEvaluateUser_('user', 'g', [category(1)], safeSettings, { w1: { a: option('a','g1','home') } }, { w1: result('g1', 3, 10) }, { user: { w1: { nomineeIds:['a'], snapshots:[{sportsGameId:'g1',side:'home'}] } } });
assert.strictEqual(evalRow.alive, true);
assert.strictEqual(evalRow.lossesUsed, 0);
assert.strictEqual(evalRow.rounds[0].status, 'safe-loss');

// Streak Survivor pays 1x/2x/3x and resets the streak on a loss.
const koth = context.sportsSurvivorNormalizeSettings_({ mode: 'streak-survivor', league: 'nfl', endWeek: 4, kothBasePoints: 10, kothMultiplierStep: 1, kothMaxMultiplier: 5 }, 'g');
const kcats = [1,2,3,4].map(category);
const km = {}, kr = {}, kp = { user: {} };
[1,2,3,4].forEach(i => {
  km['w'+i] = {}; km['w'+i]['t'+i] = option('t'+i, 'kg'+i, 'home');
  kr['w'+i] = result('kg'+i, i === 4 ? 10 : 20, i === 4 ? 20 : 10);
  kp.user['w'+i] = { nomineeIds:['t'+i], snapshots:[{ sportsGameId:'kg'+i, side:'home' }], confidencePoints:0 };
});
evalRow = context.sportsSurvivorEvaluateUser_('user', 'g', kcats, koth, km, kr, kp);
assert.strictEqual(evalRow.totalPoints, 60);
assert.strictEqual(evalRow.winStreak, 0);
assert.strictEqual(evalRow.bestStreak, 3);
assert.strictEqual(evalRow.alive, true);
assert.strictEqual(evalRow.complete, true);

// Source integration markers.
assert(survivorEngine.includes('survivorSportsModeEnabled_'));
assert(survivorEngine.includes('sportsSurvivorStandings_'));
assert(api.includes('adminBuildSportsSurvivorWeek'));
assert(api.includes('getSurvivorTeamSchedule'));
assert(frontApi.includes('apiAdminRunSportsSurvivor'));
assert(frontApi.includes('apiGetSurvivorTeamSchedule'));
assert(admin.includes('Survivor / Elimination Rules'));
assert(admin.includes('Double Pick Weeks'));
assert(admin.includes('Streak Survivor / Win Multiplier'));
assert(admin.includes('King of the Hill — Score Strikes'));
assert(page.includes('survivor-team-card'));
assert(page.includes('AGAINST THE SPREAD'));
assert(page.includes("standingLabel = row.survivorWinner ? 'WINNER'"));
assert(page.includes("payload.winner ? 'You Won Survivor'"));
assert(page.includes('You survived every round and finished as a Survivor winner.'));

console.log('sports-survivor-v1218y-tests: PASS');
