const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const adminPath = path.join(root, 'frontend/js/pages/admin.js');
const gamesPath = path.join(root, 'frontend/js/pages/adminGamesRc24e.js');
const helperPath = path.join(root, 'frontend/js/nflWeekSurvivorPlayoffR1.js');
const sidecarPath = path.join(root, 'frontend/js/adminSportsGameOrganizationR2.js');
const adminSource = fs.readFileSync(adminPath, 'utf8');
const gamesSource = fs.readFileSync(gamesPath, 'utf8');
const helperSource = fs.readFileSync(helperPath, 'utf8');

assert.strictEqual(fs.existsSync(sidecarPath), false, 'R2 side-car must be removed');
assert(!helperSource.includes('adminSportsGameOrganizationR2'), 'NFL helper must not load the removed R2 side-car');
assert.doesNotThrow(() => new Function(adminSource), 'authoritative Admin module must parse');
assert.doesNotThrow(() => new Function(gamesSource), 'authoritative Manage Games module must parse');

const adminStart = adminSource.indexOf('var ADMIN_SPORTS_MANAGE_GAMES_TARGET_R2_');
const adminEnd = adminSource.indexOf('\nasync function adminHydrateSummary_', adminStart);
assert(adminStart >= 0 && adminEnd > adminStart, 'authoritative Admin R2 render block missing');
const adminRuntime = adminSource.slice(adminStart, adminEnd);
const adminContext = {
  window: { setTimeout() {} },
  setPageLoadStep() {},
  getSession() { return { isAdmin: true }; },
  isAdminSession() { return true; },
  getStartupPayload() { return { gameId: 'nfl-confidence-2026', game: { name: 'NFL Confidence' } }; },
  APP_STATE: { gameId: 'nfl-confidence-2026' },
  escapeHtml_: value => String(value == null ? '' : value),
  escapeJs: value => String(value == null ? '' : value),
  console,
  navigate(page) { adminContext.lastNavigate = page; }
};
vm.createContext(adminContext);
vm.runInContext(adminRuntime, adminContext);

(async () => {
  const html = await adminContext.renderAdminPage();
  assert(html.includes('data-admin-sports-organization-r2="1"'), 'authoritative Admin module must render Sports R2 hierarchy');
  assert(html.includes('Sports → NFL → 2026'), 'NFL 2026 hierarchy missing');
  assert(html.includes('Cups / Combined Competitions → NFL Cup'), 'Cup hierarchy missing');
  assert.strictEqual((html.match(/Sports Scores &amp; Game Builder/g) || []).length, 1, 'Sports Scores & Game Builder must render once');
  assert.strictEqual((html.match(/Sports Engine Controls/g) || []).length, 1, 'Sports Engine Controls must render once');
  assert(html.includes("onclick=\"navigate('admin-team-fantasy')\">Team Fantasy Football"), 'Team Fantasy must keep dedicated admin route');

  for (const target of ['confidence', 'survivor', 'playoff-race', 'nfl-cup']) {
    adminContext.lastNavigate = '';
    adminContext.adminOpenSportsManageGamesR2_(target);
    assert.strictEqual(adminContext.window.PATTC_ADMIN_MANAGE_GAMES_TARGET_R2, target, target + ' must set explicit Manage Games focus');
    assert.strictEqual(adminContext.lastNavigate, 'admin-games', target + ' must use existing Manage Games route');
  }

  const focusStart = gamesSource.indexOf('/* ADMIN_SPORTS_GAME_ORGANIZATION_R2_FOCUS_START */');
  const focusEnd = gamesSource.indexOf('/* ADMIN_SPORTS_GAME_ORGANIZATION_R2_FOCUS_END */');
  assert(focusStart >= 0 && focusEnd > focusStart, 'Manage Games explicit R2 focus block missing');
  const focusSource = gamesSource.slice(focusStart, focusEnd);

  function focusContext(target) {
    const section = { open: false, scrollIntoView() {} };
    const settings = { open: false };
    const card = {
      open: false,
      querySelector(selector) {
        if (selector === '.admin-game-settings-shell') return settings;
        if (selector === '[data-admin-manager-section="' + target + '"]') return section;
        return null;
      }
    };
    const windowObj = { PATTC_ADMIN_MANAGE_GAMES_TARGET_R2: target, setTimeout(fn) { fn(); } };
    const context = {
      window: windowObj,
      document: {
        querySelector(selector) {
          if (selector === '[data-admin-game-filterable="true"][data-admin-game-type="' + target + '"]') return card;
          return null;
        },
        getElementById(id) {
          if (target === 'playoff-race' && id === 'pattcNflPlayoffRaceTimingAdmin') return section;
          if (target === 'nfl-cup' && id === 'pattcCupControlR1') return section;
          return null;
        }
      }
    };
    vm.createContext(context);
    vm.runInContext(focusSource, context);
    return { context, section, settings, card };
  }

  for (const target of ['confidence', 'survivor']) {
    const state = focusContext(target);
    assert.strictEqual(state.context.adminManageGamesApplyFocusR2_(), true, target + ' focus must resolve');
    assert.strictEqual(state.card.open, true, target + ' game card must open');
    assert.strictEqual(state.settings.open, true, target + ' settings shell must open');
    assert.strictEqual(state.section.open, true, target + ' authoritative section must open');
    assert.strictEqual(state.context.window.PATTC_ADMIN_MANAGE_GAMES_TARGET_R2, '', target + ' focus must clear after resolution');
  }

  {
    const state = focusContext('playoff-race');
    assert.strictEqual(state.context.adminManageGamesApplyFocusR2_(), true, 'Playoff Race focus must resolve explicit timing-control ID');
    assert.strictEqual(state.section.open, true, 'Playoff Race timing control must open');
  }
  {
    const state = focusContext('nfl-cup');
    assert.strictEqual(state.context.adminManageGamesApplyFocusR2_(), true, 'NFL Cup focus must resolve existing Cup Control Center ID');
  }

  assert(gamesSource.includes('id="pattcCupControlR1"'), 'existing NFL Cup Control Center must remain authoritative');
  assert(gamesSource.includes('id="pattcNflPlayoffRaceTimingAdmin"'), 'Playoff Race must have explicit authoritative focus ID');
  assert(adminSource.includes('data-admin-manager-section="confidence"'), 'Confidence must expose explicit authoritative section contract');
  assert(adminSource.includes('data-admin-manager-section="survivor"'), 'Survivor must expose explicit authoritative section contract');

  const diff = cp.execFileSync('git', ['diff', '--unified=0', '0683d871826a56deca9b21e8b1121a78414411a9', '--', 'backend', 'frontend/js/pages/admin.js', 'frontend/js/pages/adminGamesRc24e.js'], { cwd: root, encoding: 'utf8' });
  const added = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).join('\n');
  for (const forbidden of ['saveConfidencePicksBatch', 'saveSurvivorPick', 'sportsSurvivorSettle', 'nflPlayoffRaceSaveDraftR3_']) {
    assert(!added.includes(forbidden), 'R2 correction must not introduce protected gameplay/scoring write: ' + forbidden);
  }
  const backendDiff = cp.execFileSync('git', ['diff', '--name-only', '0683d871826a56deca9b21e8b1121a78414411a9', '--', 'backend'], { cwd: root, encoding: 'utf8' }).trim();
  assert.strictEqual(backendDiff, '', 'R2 correction must not change backend files');

  console.log('PASS admin sports / game manager organization R2 authoritative delivery');
})().catch(err => { console.error(err); process.exit(1); });
