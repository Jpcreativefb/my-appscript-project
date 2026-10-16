const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const app = read('frontend/js/app.js');
const wrapper = read('frontend/js/pages/adminGamesRc24e.js');
const legacyAdmin = read('frontend/js/pages/admin.js');

function has(text, pattern, message) {
  assert(pattern.test(text), message);
}

// 1. Manage Existing Games remains the existing admin-games route.
has(app, /case\s+["']admin-games["'][\s\S]*renderAdminGamesPage/, 'admin-games must dispatch to renderAdminGamesPage');
has(wrapper, /async function renderAdminGamesPage\s*\(\)[\s\S]*renderAdminGamesPanel\s*\(/, 'renderAdminGamesPage must delegate to the legacy full editor');

// 2-6. Existing management capabilities remain available.
has(legacyAdmin, /async function renderAdminGamesPanel\s*\(/, 'legacy Manage Games renderer must remain present');
has(legacyAdmin + wrapper, /Create(?:\s+New)?\s+Game|New Game/, 'Create New Game must remain available');
has(legacyAdmin + wrapper, /Clone Game Setup|Clone/, 'Clone must remain available');
has(wrapper, /data-admin-game-filter=["']archived["']|Archived\s*·/, 'archived lifecycle filter must remain available');
has(wrapper, /data-admin-game-filter=["'](?:draft|setup|preview|live)["']/, 'lifecycle filters must remain available');
has(legacyAdmin + wrapper, /Permanent Game Purge|Cleanup Candidates|cleanup/i, 'cleanup controls must remain available');

// 7. Team Fantasy keeps the exact data-contract handoff.
has(wrapper, /String\(game\.type\s*\|\|\s*["']{2}\)\.toLowerCase\(\)\s*===\s*["']team-fantasy["'][\s\S]*admin-team-fantasy/, 'Team Fantasy handoff must remain exact and type-based');

// 8. Other specialized NFL managers remain outside ordinary Manage Games routing.
for (const route of [
  'admin-nfl-cup',
  'admin-nfl-season-setup',
  'admin-playoff-race',
  'admin-sports-engine'
]) {
  assert(!wrapper.includes(`navigate('${route}')`), `${route} must not be a Manage Games handoff`);
  assert(app.includes(route), `${route} dedicated Admin destination must remain available`);
}

// Execute only the presentation helper block so behavior, not just source text, is verified.
const helperStart = wrapper.indexOf('/* ADMIN_GAMES_DESIGN_R1_START */');
const helperEnd = wrapper.indexOf('/* ADMIN_GAMES_DESIGN_R1_END */');
assert(helperStart >= 0 && helperEnd > helperStart, 'Manage Games presentation helper block missing');
const helperSource = wrapper.slice(helperStart, helperEnd);
const sandbox = {
  document: { querySelector() { return null; } },
  adminGamesEscapeHtml: String
};
vm.createContext(sandbox);
vm.runInContext(helperSource, sandbox);

// 9. Explicit stored context fields are authoritative and may be displayed.
const explicit = {
  hubFamily: 'Sports',
  hubGroup: 'NFL',
  seasonYear: '2026',
  leagueSeasonScope: 'sports:nfl:2026'
};
assert.strictEqual(sandbox.adminManageGamesInferHubFamilyR1_(explicit), 'Sports');
assert.strictEqual(sandbox.adminManageGamesInferHubGroupR1_(explicit), 'NFL');
assert.strictEqual(sandbox.adminManageGamesInferSeasonR1_(explicit), '2026');
assert.strictEqual(sandbox.adminManageGamesInferScopeR1_(explicit), 'sports:nfl:2026');
assert.strictEqual(sandbox.adminManageGamesInferHubFamilyR1_({hub: 'Reality'}), 'Reality');
assert.strictEqual(sandbox.adminManageGamesInferHubFamilyR1_({family: 'Awards'}), 'Awards');
assert.strictEqual(sandbox.adminManageGamesInferHubGroupR1_({group: 'DWTS'}), 'DWTS');
assert.strictEqual(sandbox.adminManageGamesInferHubGroupR1_({league: 'MLB'}), 'MLB');
assert.strictEqual(sandbox.adminManageGamesInferSeasonR1_({season: 's5'}), 's5');
assert.strictEqual(sandbox.adminManageGamesInferSeasonR1_({year: 2027}), '2027');
assert.strictEqual(sandbox.adminManageGamesInferScopeR1_({seasonScope: 'reality:traitors:s5'}), 'reality:traitors:s5');
assert.strictEqual(sandbox.adminManageGamesInferScopeR1_({scopeId: 'awards:oscars:2027'}), 'awards:oscars:2027');

// 10-12. Names, GameIds, and type-like keywords never establish context or synthesize scope.
const keywordCases = [
  { gameId: 'nfl-2026', name: 'NFL 2026' },
  { gameId: 'confidence-2026', name: 'NFL Confidence 2026', type: 'confidence' },
  { gameId: 'oscars-2027', name: 'Oscars 2027' },
  { gameId: 'emmys-2027', name: 'Emmys 2027' },
  { gameId: 'traitors-s5', name: 'The Traitors Season 5' },
  { gameId: 'dwts-s35', name: 'DWTS Season 35' }
];
for (const game of keywordCases) {
  assert.strictEqual(sandbox.adminManageGamesInferHubFamilyR1_(game), 'Unassigned', `${game.name} must not infer Hub Family`);
  assert.strictEqual(sandbox.adminManageGamesInferHubGroupR1_(game), 'Unassigned', `${game.name} must not infer Hub Group`);
  assert.strictEqual(sandbox.adminManageGamesInferSeasonR1_(game), '', `${game.name} must not infer season/year`);
  assert.strictEqual(sandbox.adminManageGamesInferScopeR1_(game), '', `${game.name} must not synthesize scope`);
}

assert(!helperSource.includes('adminManageGamesR1Haystack_'), 'keyword haystack inference helper must be removed');
assert(!helperSource.includes('adminManageGamesR1Slug_'), 'synthetic scope slug helper must be removed');

console.log('PASS admin-manage-existing-games-cleanup-r4');
