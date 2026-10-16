const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const app = read('frontend/js/app.js');
const wrapper = read('frontend/js/pages/adminGamesRc24e.js');
const legacyAdmin = read('frontend/js/pages/admin.js');

function has(text, pattern, message) {
  assert(pattern.test(text), message);
}

// 1. Manage Existing Games remains the existing admin-games route.
has(app, /route\s*===\s*["']admin-games["'][\s\S]*renderAdminGamesPage/, 'admin-games must dispatch to renderAdminGamesPage');
has(wrapper, /async function renderAdminGamesPage\s*\(\)[\s\S]*renderAdminGamesPanel\s*\(/, 'renderAdminGamesPage must delegate to the legacy full editor');

// 2-6. Ordinary Game Setup and the existing management capabilities stay owned by the legacy editor.
has(legacyAdmin, /async function renderAdminGamesPanel\s*\(/, 'legacy Manage Games renderer must remain present');
has(legacyAdmin + wrapper, /Create(?:\s+New)?\s+Game|New Game/, 'Create New Game must remain available');
has(legacyAdmin + wrapper, /Clone Game Setup|Clone/, 'Clone must remain available');
has(wrapper, /data-admin-game-filter=["']archived["']|Archived\s*·/, 'archived lifecycle filter must remain available');
has(wrapper, /data-admin-game-filter=["'](?:draft|setup|preview|live)["']/, 'lifecycle filters must remain available');
has(legacyAdmin + wrapper, /Permanent Game Purge|Cleanup Candidates|cleanup/i, 'cleanup controls must remain available');

// 7. Ordinary Manage Games must not embed specialized NFL manager routes.
const prohibitedEmbeddedRoutes = [
  'admin-nfl-cup',
  'admin-nfl-season-setup',
  'admin-playoff-race',
  'admin-sports-engine'
];
for (const route of prohibitedEmbeddedRoutes) {
  assert(!wrapper.includes(route), `${route} must not be embedded in ordinary Manage Games`);
}

// 8. Team Fantasy is the one currently proven specialized handoff in Manage Games.
has(wrapper, /String\(game\.type\s*\|\|\s*["']{2}\)\.toLowerCase\(\)\s*===\s*["']team-fantasy["'][\s\S]*admin-team-fantasy/, 'Team Fantasy handoff must be based on the explicit game type');

// 9-12. Dedicated specialized Admin destinations remain available outside Manage Games.
const allAdminSource = app + '\n' + legacyAdmin;
for (const route of [
  'admin-team-fantasy',
  'admin-nfl-cup',
  'admin-nfl-season-setup',
  'admin-playoff-race',
  'admin-sports-engine'
]) {
  assert(allAdminSource.includes(route), `${route} dedicated Admin destination must remain available`);
}

// 13. This R4 guard is frontend/Admin-only; it must never become an engine/backend test fixture.
for (const forbiddenPath of ['functions/', 'backend/', 'apps-script/']) {
  assert(!__filename.replace(/\\/g, '/').includes(`/${forbiddenPath}`), 'R4 test must remain frontend/Admin scoped');
}

console.log('PASS admin-manage-existing-games-cleanup-r4');
