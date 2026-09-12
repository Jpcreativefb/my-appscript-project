const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'backend/engines/SharedCompareEngine.js'), 'utf8');
const context = { console, Date, JSON, Math, Number, Object, Array, String };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'SharedCompareEngine.js' });

// Authenticated frontend reads use POST. Shared Compare must therefore be wired
// through doPost as well as the legacy/direct GET dispatch surface.
const backendApiSource = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontendApiSource = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
assert(frontendApiSource.includes('async function apiGetSharedCompare'));
assert(frontendApiSource.includes('return api("getSharedCompare"'));
assert.strictEqual((backendApiSource.match(/if \(action === "getSharedCompare"\)/g) || []).length, 2, 'Shared Compare read must be wired in authenticated POST and direct GET dispatch');
assert(backendApiSource.includes('if (action === "saveSharedCompareRivals")'));

// Selection contract: viewer first, only scoped candidates, max 6 total columns.
context.sharedCompareCandidates_ = () => [
  { username: 'viewer', displayName: 'Viewer', isViewer: true },
  { username: 'r1' }, { username: 'r2' }, { username: 'r3' },
  { username: 'r4' }, { username: 'r5' }, { username: 'r6' }
];
let selection = context.sharedCompareResolveSelection_(
  'viewer', 'game-1', 'league-1', 'prediction',
  ['r1','r2','outsider','r3','r4','r5','r6']
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(selection.usernames)), ['viewer','r1','r2','r3','r4','r5']);
assert.strictEqual(selection.usernames[0], 'viewer');
assert.strictEqual(selection.usernames.length, 6);
assert(!selection.rivals.includes('outsider'));

// Mode adapters: KOTH remains passive, sports Survivor uses Survivor adapter,
// and wager mode is recognized only so Shared Compare can explicitly exclude it.
context.getDashboardGameMode_ = game => String(game.type || 'prediction');
context.survivorGetSettings_ = gameId => gameId === 'koth' ? { mode:'king-of-the-hill' } : { mode:'sports-survivor' };
assert.strictEqual(context.sharedCompareMode_('koth', { type:'survivor' }), 'king-of-the-hill');
assert.strictEqual(context.sharedCompareMode_('surv', { type:'survivor' }), 'survivor');
assert.strictEqual(context.sharedCompareMode_('wager', { type:'wager' }), 'sports-wager');

// Confidence: blank confidence is a valid base pick, not an incomplete row.
context.apiGetConfidenceCompare_ = () => ({
  players: [
    { username:'viewer', picks:{ c1:{ hidden:false, nomineeId:'a', confidencePoints:0, status:'pending' } } },
    { username:'r1', picks:{ c1:{ hidden:true } } }
  ],
  categoryIds:['c1']
});
context.getCategories = () => [{ id:'c1', name:'Matchup', nominees:[{ id:'a', name:'Alpha' }, { id:'b', name:'Beta' }] }];
let adapted = context.sharedCompareConfidenceAdapter_({ viewer:'viewer', gameId:'g', leagueId:'l', usernames:['viewer','r1'] });
assert.strictEqual(adapted.rows[0].cells[0].hidden, false);
assert.strictEqual(adapted.rows[0].cells[0].value.basePickOnly, true);
assert.strictEqual(adapted.rows[0].cells[0].value.basePickMessage, 'Base Pick · 1 pt if correct');
assert.strictEqual(adapted.rows[0].cells[1].hidden, true);
assert.strictEqual(adapted.rows[0].cells[1].value, null);

// Survivor adapter must never ask the browser to suppress populated hidden data.
context.survivorGameCategories_ = () => [{ id:'week-1' }];
context.sportsSurvivorOptionMetaForGame_ = () => ({});
context.sportsSurvivorResultsForGame_ = () => ({});
context.sportsSurvivorPickMetaMap_ = () => ({});
context.sportsSurvivorRc24aCompare_ = () => [
  { username:'viewer', weeks:[{ week:1, hidden:false, teamId:'chi', team:'Chicago Bears', opponent:'Packers', result:'pending', weeklyPoints:0, streak:1, lossesUsed:0, livesRemaining:1 }] },
  { username:'r1', weeks:[{ week:1, hidden:true, teamId:null, team:null, opponent:null, result:null, weeklyPoints:null, streak:null, lossesUsed:null, livesRemaining:null }] }
];
adapted = context.sharedCompareSurvivorAdapter_({ viewer:'viewer', gameId:'g', leagueId:'l', usernames:['viewer','r1'] });
assert.strictEqual(adapted.rows[0].cells[0].value.label, 'Chicago Bears');
assert.strictEqual(adapted.rows[0].cells[1].hidden, true);
assert.strictEqual(adapted.rows[0].cells[1].value, null);

// KOTH Compare is passive and uses score/strike history rather than fake picks.
context.apiGetKingOfHillState_ = ({username}) => ({
  history:[{ week:1, score: username === 'viewer' ? 100 : 90, strikesAfter: username === 'viewer' ? 0 : 1, strikeAwarded: username !== 'viewer', eliminated:false, status:'ALIVE', sourceScores:{tf:90} }]
});
adapted = context.sharedCompareKothAdapter_({ viewer:'viewer', gameId:'koth', usernames:['viewer','r1'] });
assert.strictEqual(adapted.passive, true);
assert.strictEqual(adapted.rows[0].rowType, 'koth-week');
assert.strictEqual(adapted.rows[0].cells[1].value.strikesAfter, 1);

// Sports Wager is intentionally outside Shared Compare. Dedicated Wager
// scoreboard support is separate and must not leak rival activity through this engine.
assert(!source.includes('function sharedCompareSportsWagerAdapter_'));
assert(!source.includes('wagerActivity'));
assert(!source.includes('commonWagers'));
assert(!source.includes('compareGetUserBets_'));
assert(!source.includes('secondaryAdapters = ["sports-wager"]'));
context.userCanAccessGameFeature_ = () => ({ allowed:true, leagueId:'league-1', leagueName:'League 1' });
context.sharedCompareGame_ = () => ({ gameId:'wager', type:'wager', name:'Wager' });
let selectionCalled = false;
context.sharedCompareResolveSelection_ = () => { selectionCalled = true; throw new Error('Wager must not resolve Shared Compare rivals'); };
let wagerResult = context.apiGetSharedCompare_({ username:'viewer', gameId:'wager', leagueId:'league-1' });
assert.strictEqual(wagerResult.success, false);
assert.strictEqual(wagerResult.excluded, true);
assert.strictEqual(wagerResult.mode, 'sports-wager');
assert.strictEqual(selectionCalled, false, 'Wager read must stop before rival selection/data access');
let wagerSave = context.apiSaveSharedCompareRivals_({ username:'viewer', gameId:'wager', leagueId:'league-1', rivalUsernames:['r1'] });
assert.strictEqual(wagerSave.success, false);
assert.strictEqual(wagerSave.excluded, true);
assert.strictEqual(selectionCalled, false, 'Wager rival-save path must also stop before selection/persistence');

// Hybrid prediction Compare may remain supported, but wager data is never injected.
context.sharedCompareGame_ = () => ({ gameId:'hybrid', type:'hybrid', wagerEnabled:true, name:'Hybrid' });
context.sharedCompareMode_ = () => 'prediction';
context.sharedCompareResolveSelection_ = () => ({ usernames:['viewer','r1'], rivals:['r1'], candidates:[] });
context.sharedCompareBuildAdapter_ = () => ({ adapter:'standard-picks', rows:[] });
context.sharedCompareProfile_ = username => ({ username:username });
const hybrid = context.apiGetSharedCompare_({ username:'viewer', gameId:'hybrid', leagueId:'league-1' });
assert.strictEqual(hybrid.success, true);
assert.strictEqual(Object.prototype.hasOwnProperty.call(hybrid, 'wagerActivity'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(hybrid, 'commonWagers'), false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(hybrid.secondaryAdapters)), []);

console.log('Ed shared Compare data/privacy contract tests: PASS');
