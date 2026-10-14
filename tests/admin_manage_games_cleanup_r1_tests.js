const assert = require('assert');
const cleanup = require('../frontend/js/pages/adminGamesRc24e.js');

assert.strictEqual(cleanup.PARENT_WEIGHT_STEP, 0.05);
assert.strictEqual(cleanup.numberStepAccepts(1.25, 0, cleanup.PARENT_WEIGHT_STEP), true, '1.25 must satisfy the corrected native step');
assert.strictEqual(cleanup.numberStepAccepts(1.25, 0, 0.1), false, 'regression proof: 1.25 is invalid with the historical 0.1 step');

assert.strictEqual(cleanup.inferHubFamily({ gameId: 'emmys-2027', name: 'Emmys 2027', hubFamily: 'General' }), 'Awards');
assert.strictEqual(cleanup.inferHubGroup({ gameId: 'emmys-2027', name: 'Emmys 2027' }), 'Emmys');
assert.strictEqual(cleanup.inferLeagueSeasonScope({ gameId: 'nfl-confidence-2026', name: 'NFL Confidence', year: 2026 }), 'sports:nfl:2026');
assert.strictEqual(cleanup.inferLeagueSeasonScope({ gameId: 'traitors-s5', name: 'The Traitors Season 5' }), 'reality:traitors:s5');
assert.strictEqual(cleanup.inferLeagueSeasonScope({ gameId: 'oscars-2027', name: 'Oscars 2027' }), 'awards:oscars:2027');

assert.strictEqual(cleanup.fieldAppliesToGame('nominee settings', { gameId: 'nfl-confidence-2026' }), false);
assert.strictEqual(cleanup.fieldAppliesToGame('contestant roster', { gameId: 'oscars-2027' }), false);
assert.strictEqual(cleanup.fieldAppliesToGame('sports odds', { gameId: 'traitors-s5' }), false);
assert.strictEqual(cleanup.fieldAppliesToGame('parentContributionWeight', { gameId: 'nfl-playoff-race-2026' }), true);

const legacy = { gameId: 'legacy-game', name: 'Legacy Game', customField: 'preserve-me' };
const before = JSON.stringify(legacy);
cleanup.inferHubFamily(legacy);
cleanup.inferHubGroup(legacy);
cleanup.inferLeagueSeasonScope(legacy);
assert.strictEqual(JSON.stringify(legacy), before, 'classification must not mutate legacy game data');

console.log('Admin / Manage Games Cleanup R1 tests: PASS');
