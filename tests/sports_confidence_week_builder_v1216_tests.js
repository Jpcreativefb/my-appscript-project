const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/SportsConfidenceBuilderEngine.js'), 'utf8');
const wager = fs.readFileSync(path.join(root, 'backend/engines/SportsWagerEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const sports = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');

assert(api.includes('adminGetSportsConfidenceGames'));
assert(api.includes('adminCreateSportsConfidenceQuestionsBulk'));
assert(sports.includes('Pick Games for Confidence'));
assert(sports.includes('adminCreateSportsConfidenceQuestionsBulk'));
assert(sports.includes('Select All Pregame'));
assert(engine.includes('scoreMode: "confidence-points"'));
assert(engine.includes('lockDateTime: score.GameDateTime'));
assert(engine.includes('sportsGameId: sportsConfidenceString_(score.GameId)'));
assert(engine.includes('espnEventId: sportsConfidenceString_(score.ESPNEventId)'));
assert(engine.includes('sportsConfidencePatchCategoryRows_'));
assert(wager.includes('sportsWagerKey_(item.scoreMode) === "confidence-points"'));
assert(wager.includes('confidence-tie-push-from-source-scores'));

const context = {
  String,
  Array,
  Object,
  JSON,
  Date,
  requireAdmin_() {},
  getGames() {
    return [
      { gameId: 'setup-confidence', name: 'Setup Confidence', type: 'confidence', status: 'Setup', active: false, archived: false, confidenceEnabled: true },
      { gameId: 'setup-hybrid', name: 'Setup Hybrid', type: 'mixed', status: 'Setup', active: false, archived: false, confidenceEnabled: true },
      { gameId: 'preview-confidence', name: 'Preview Confidence', type: 'confidence', status: 'Preview', active: true, archived: false, confidenceEnabled: true },
      { gameId: 'live-confidence', name: 'Live Confidence', type: 'confidence', status: 'Live', active: true, archived: false, confidenceEnabled: true },
      { gameId: 'draft-confidence', name: 'Draft Confidence', type: 'confidence', status: 'Draft', active: false, archived: false, confidenceEnabled: true },
      { gameId: 'archived-confidence', name: 'Archived Confidence', type: 'confidence', status: 'Setup', active: false, archived: true, confidenceEnabled: true },
      { gameId: 'setup-wager', name: 'Setup Wager', type: 'wager', status: 'Setup', active: false, archived: false, confidenceEnabled: false },
      { gameId: 'legacy-confidence', name: 'Legacy Confidence', type: 'confidence', status: '', active: true, archived: false, confidenceEnabled: true }
    ];
  },
  getActiveGames() { return []; }
};

vm.createContext(context);
vm.runInContext(engine, context);

const result = context.apiAdminGetSportsConfidenceGames({ username: 'admin', token: 'token' });
assert.strictEqual(result.success, true);
assert.deepStrictEqual(Array.from(result.games, g => g.gameId), [
  'setup-confidence',
  'setup-hybrid',
  'preview-confidence',
  'live-confidence',
  'legacy-confidence'
]);

assert.strictEqual(
  context.sportsConfidenceQuestionName_({ AwayTeam: 'Chicago Bears', HomeTeam: 'Green Bay Packers' }),
  'Who will win? Chicago Bears @ Green Bay Packers'
);
assert.strictEqual(context.sportsConfidenceSection_({ League: 'nfl', Week: 2 }), 'NFL Week 2');
assert.strictEqual(context.sportsConfidenceScoreStarted_({ State: 'pre', Status: 'STATUS_SCHEDULED', Completed: false }), false);
assert.strictEqual(context.sportsConfidenceScoreStarted_({ State: 'in', Status: 'STATUS_IN_PROGRESS', Completed: false }), true);
assert.strictEqual(context.sportsConfidenceScoreStarted_({ State: 'post', Status: 'STATUS_FINAL', Completed: true }), true);

// End-to-end builder payload smoke test with Apps Script dependencies stubbed.
const categoryCalls = [];
const nomineeCalls = [];
let normalizedQuestion = null;
context.getGame = function(gameId) {
  return { gameId, type: 'confidence', status: 'Setup', active: false, archived: false, confidenceEnabled: true };
};
context.fetchSportsScoreForWager_ = function() {
  return {
    GameId: 'nfl_401999999',
    ESPNEventId: '401999999',
    Sport: 'football',
    League: 'nfl',
    AwayTeam: 'Chicago Bears',
    HomeTeam: 'Green Bay Packers',
    AwayLogo: 'away.png',
    HomeLogo: 'home.png',
    AwayRecord: '1-0',
    HomeRecord: '1-0',
    AwayScore: 0,
    HomeScore: 0,
    State: 'pre',
    Status: 'STATUS_SCHEDULED',
    Completed: false,
    GameDateTime: '2026-09-13T17:00:00Z',
    SeasonYear: 2026,
    SeasonType: 2,
    SeasonPhase: 'REGULAR SEASON',
    Week: 1
  };
};
context.sportsWagerSlug_ = function(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};
context.sportsWagerCategoryExists_ = function() { return false; };
context.adminCreateCategory = function(payload) { categoryCalls.push(payload); return { success: true }; };
context.adminCreateNominee = function(payload) { nomineeCalls.push(payload); return { success: true }; };
context.normalizedStorageUpsertQuestion_ = function(payload) { normalizedQuestion = payload; return payload; };
context.sportsConfidencePatchCategoryRows_ = function() { return 2; };
context.SpreadsheetApp = { flush() {} };
context.clearAppCaches = function() {};
context.adminDeleteCategory = function() {};

const built = context.createSportsConfidenceQuestionFromScore({
  awardsGameId: 'confidence-2026',
  sportsGameId: 'nfl_401999999',
  espnEventId: '401999999'
});
assert.strictEqual(built.success, true);
assert.strictEqual(built.duplicate, false);
assert.strictEqual(categoryCalls.length, 1);
assert.strictEqual(categoryCalls[0].scoreMode, 'confidence-points');
assert.strictEqual(categoryCalls[0].lockDateTime, '2026-09-13T17:00:00Z');
assert.strictEqual(categoryCalls[0].sportsGameId, 'nfl_401999999');
assert.strictEqual(categoryCalls[0].espnEventId, '401999999');
assert.strictEqual(categoryCalls[0].autoSettle, true);
assert.strictEqual(nomineeCalls.length, 2);
assert.deepStrictEqual(Array.from(nomineeCalls, item => item.nominee), ['Chicago Bears', 'Green Bay Packers']);
assert.strictEqual(normalizedQuestion.homeTeam, 'Green Bay Packers');
assert.strictEqual(normalizedQuestion.awayTeam, 'Chicago Bears');

console.log('sports-confidence-week-builder-v1216-tests: PASS');
