const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/SportsConfidenceBuilderEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const sports = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');

assert(api.includes('adminGetSportsConfidenceBuilderScores'));
assert(api.includes('apiAdminGetSportsConfidenceBuilderScores'));
assert(sports.includes('sportsConfidenceLoadGamesViaAwardsBackend_'));
assert(sports.includes('"adminGetSportsConfidenceBuilderScores"'));

const confidenceFn = sports.match(/async function createSportsConfidenceWeekFromSection_\(\)[\s\S]*?\n}\n\nasync function createSportsAdvancedQuestionFromSection_/);
assert(confidenceFn, 'Confidence builder function should exist');
assert(confidenceFn[0].includes('sportsConfidenceLoadGamesViaAwardsBackend_(session, context)'));
assert(!confidenceFn[0].includes('sportsAdvancedLoadGamesForContext_(context)'), 'Confidence builder must not use browser Sports JSONP loader');

let adminChecked = false;
let fetchParams = null;
const context = {
  String, Array, Object, JSON, Date,
  requireAdmin_() { adminChecked = true; },
  sportsWagerFetchJson_(params, label) {
    fetchParams = { params: Object.assign({}, params), label };
    return {
      success: true,
      count: 16,
      scores: [
        { GameId: 'nfl_1', ESPNEventId: '1', League: 'nfl', Week: 3 }
      ],
      filters: { week: '3' }
    };
  }
};
vm.createContext(context);
vm.runInContext(engine, context);

const result = context.apiAdminGetSportsConfidenceBuilderScores({
  username: 'admin',
  token: 'token',
  sport: 'football',
  league: 'nfl',
  seasonYear: '2026',
  seasonType: '1',
  seasonPhase: 'PRESEASON',
  week: '3'
});

assert.strictEqual(adminChecked, true);
assert.strictEqual(result.success, true);
assert.strictEqual(result.scores.length, 1);
assert.strictEqual(fetchParams.params.action, 'getSportsScores');
assert.strictEqual(fetchParams.params.sport, 'football');
assert.strictEqual(fetchParams.params.league, 'nfl');
assert.strictEqual(fetchParams.params.seasonYear, '2026');
assert.strictEqual(fetchParams.params.seasonType, '1');
assert.strictEqual(fetchParams.params.seasonPhase, 'PRESEASON');
assert.strictEqual(fetchParams.params.week, '3');
assert.strictEqual(fetchParams.label, 'Sports Confidence week loader');

console.log('sports-confidence-server-loader-v1216-tests: PASS');
