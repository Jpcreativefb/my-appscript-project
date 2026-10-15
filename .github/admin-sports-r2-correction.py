from pathlib import Path

admin_path = Path('frontend/js/pages/admin.js')
games_path = Path('frontend/js/pages/adminGamesRc24e.js')
test_path = Path('tests/admin_sports_game_organization_r2_tests.js')

admin = admin_path.read_text()

helper = '''var ADMIN_SPORTS_MANAGE_GAMES_TARGET_R2_ = "";

function adminOpenSportsManageGamesR2_(target) {
  target = String(target || "").trim().toLowerCase();
  if (["confidence", "survivor", "playoff-race", "nfl-cup"].indexOf(target) === -1) return;
  ADMIN_SPORTS_MANAGE_GAMES_TARGET_R2_ = target;
  if (typeof window !== "undefined") window.PATTC_ADMIN_MANAGE_GAMES_TARGET_R2 = target;
  navigate("admin-games");
}

'''
marker = 'async function renderAdminPage() {'
if 'function adminOpenSportsManageGamesR2_' not in admin:
    if marker not in admin:
        raise SystemExit('admin.js render marker missing')
    admin = admin.replace(marker, helper + marker, 1)

sports_start = admin.index('            <div class="admin-category-card" data-admin-games-design-r1="1">')
appearance_start = admin.index('            <div class="admin-category-card">\n              <strong>Appearance</strong>', sports_start)
sports_block = '''            <div class="admin-category-card" data-admin-games-design-r1="1" data-admin-sports-organization-r2="1">
              <div class="admin-sub"><strong>Admin → Games &amp; Design → Sports</strong></div>
              <div class="admin-sub">Organize sports administration by League → Season → Game / Cup / Sports Operations. Existing managers, routes, APIs, and game records remain authoritative.</div>
              <div class="admin-list" style="margin-top:10px;">
                <div class="admin-list-row"><div><strong>Sports → NFL → 2026</strong><div class="admin-sub">Confidence, Survivor, Team Fantasy Football, Playoff Race, and Cups / Combined Competitions.</div></div></div>
                <div class="admin-actions" data-admin-nfl-2026-r2="1">
                  <button class="button admin-button" onclick="adminOpenSportsManageGamesR2_('confidence')">Confidence</button>
                  <button class="button admin-button" onclick="adminOpenSportsManageGamesR2_('survivor')">Survivor</button>
                  <button class="button admin-button" onclick="navigate('admin-team-fantasy')">Team Fantasy Football</button>
                  <button class="button admin-button" onclick="adminOpenSportsManageGamesR2_('playoff-race')">Playoff Race</button>
                  <button class="button admin-button" onclick="adminOpenSportsManageGamesR2_('nfl-cup')">Cups / Combined Competitions → NFL Cup</button>
                  <button class="button admin-button secondary" onclick="navigate('admin-games')">NFL 2026 Shared Game Settings</button>
                </div>
                <div class="admin-sub">A Cup references existing authoritative Game IDs. One game record; no copied games. R2 does not migrate Cup schema or generalize scoring ownership.</div>
                <div class="admin-category-card" data-admin-sports-operations-r2="1" style="margin-top:10px;">
                  <strong>Sports Operations</strong><div class="admin-sub">Existing sports tools stay on their current routes and APIs.</div>
                  <div class="admin-actions">
                    <button class="button admin-button secondary" onclick="window.location.href='./sports.html'">Sports Scores &amp; Game Builder</button>
                    <button class="button admin-button secondary" onclick="adminOpenSportsControls()">Sports Engine Controls</button>
                  </div>
                  <div id="adminSportsControlMessage" class="admin-message"></div>
                  <div id="adminSportsControlPanel" class="admin-list"></div>
                </div>
                <div class="admin-list-row"><div><strong>Reality</strong><div class="admin-sub">Show/season managers such as The Traitors and DWTS remain in the existing Reality TV Manager.</div></div></div>
                <div class="admin-list-row"><div><strong>Awards</strong><div class="admin-sub">Ceremonies such as Oscars and Emmys remain in the existing Awards Manager. Emmys belongs under Awards, not General.</div></div></div>
              </div>
            </div>
'''
admin = admin[:sports_start] + sports_block + admin[appearance_start:]

actions_start = admin.index('            <div class="admin-actions">\n              <button class="button admin-button" onclick="navigate(\'admin-games\')">Manage Games & Templates</button>', appearance_start)
panel_line = '            <div id="adminSportsControlPanel" class="admin-list"></div>\n'
actions_end = admin.index(panel_line, actions_start) + len(panel_line)
general_actions = '''            <div class="admin-actions">
              <button class="button admin-button" onclick="navigate('admin-games')">Manage Games & Templates</button>
              <button class="button admin-button secondary" onclick="navigate('admin-appearance')">Appearance Manager</button>
              <button class="button admin-button secondary" onclick="navigate('admin-awards')">Awards Manager</button>
              <button class="button admin-button secondary" onclick="navigate('admin-reality-tv')">Reality TV Manager</button>
            </div>
'''
admin = admin[:actions_start] + general_actions + admin[actions_end:]

game_name_line = '      data-admin-game-name="${escapeHtml_(game.name || rawGameId)}"\n'
game_type_line = '      data-admin-game-type="${escapeHtml_(canonicalType)}"\n'
if game_type_line not in admin:
    if game_name_line not in admin:
        raise SystemExit('game card name marker missing')
    admin = admin.replace(game_name_line, game_name_line + game_type_line, 1)

survivor_old = '<details class="admin-form-section admin-form-section-details" data-game-types="survivor" ${canonicalType === "survivor" ? "open" : "hidden"}>'
survivor_new = '<details class="admin-form-section admin-form-section-details" data-admin-manager-section="survivor" data-game-types="survivor" ${canonicalType === "survivor" ? "open" : "hidden"}>'
if survivor_new not in admin:
    if survivor_old not in admin:
        raise SystemExit('Survivor manager section marker missing')
    admin = admin.replace(survivor_old, survivor_new, 1)

confidence_old = '<details class="admin-form-section admin-form-section-details" data-game-types="confidence mixed" data-hybrid-feature-section="confidenceEnabled" ${(canonicalType === "confidence" || (canonicalType === "mixed" && game.confidenceEnabled)) ? "" : "hidden"}>'
confidence_new = '<details class="admin-form-section admin-form-section-details" data-admin-manager-section="confidence" data-game-types="confidence mixed" data-hybrid-feature-section="confidenceEnabled" ${(canonicalType === "confidence" || (canonicalType === "mixed" && game.confidenceEnabled)) ? "" : "hidden"}>'
if confidence_new not in admin:
    if confidence_old not in admin:
        raise SystemExit('Confidence manager section marker missing')
    admin = admin.replace(confidence_old, confidence_new, 1)

admin_path.write_text(admin)

games = games_path.read_text()
focus_marker = '\n\n/* ADMIN_GAMES_DESIGN_R1_START */'
focus_code = r'''

/* ADMIN_SPORTS_GAME_ORGANIZATION_R2_FOCUS_START */
function adminManageGamesFocusTargetR2_() {
  if (typeof window === "undefined") return "";
  return String(window.PATTC_ADMIN_MANAGE_GAMES_TARGET_R2 || "").trim().toLowerCase();
}

function adminManageGamesApplyFocusR2_() {
  const target = adminManageGamesFocusTargetR2_();
  if (!target) return true;

  let node = null;
  let card = null;

  if (target === "confidence" || target === "survivor") {
    card = document.querySelector('[data-admin-game-filterable="true"][data-admin-game-type="' + target + '"]');
    node = card && card.querySelector('[data-admin-manager-section="' + target + '"]');
    if (!node) return false;
    card.open = true;
    const settings = card.querySelector(".admin-game-settings-shell");
    if (settings) settings.open = true;
    node.open = true;
  } else if (target === "playoff-race") {
    node = document.getElementById("pattcNflPlayoffRaceTimingAdmin");
    if (!node) return false;
    node.open = true;
  } else if (target === "nfl-cup") {
    node = document.getElementById("pattcCupControlR1");
    if (!node) return false;
  } else {
    window.PATTC_ADMIN_MANAGE_GAMES_TARGET_R2 = "";
    return true;
  }

  window.PATTC_ADMIN_MANAGE_GAMES_TARGET_R2 = "";
  if (node && typeof node.scrollIntoView === "function") {
    window.setTimeout(function() { node.scrollIntoView({ block: "start" }); }, 0);
  }
  return true;
}

function adminManageGamesScheduleFocusR2_(attempt) {
  attempt = Number(attempt || 0);
  if (adminManageGamesApplyFocusR2_()) return;
  if (!adminManageGamesFocusTargetR2_() || attempt >= 20) return;
  window.setTimeout(function() { adminManageGamesScheduleFocusR2_(attempt + 1); }, 100);
}
/* ADMIN_SPORTS_GAME_ORGANIZATION_R2_FOCUS_END */
'''
if 'function adminManageGamesApplyFocusR2_' not in games:
    if focus_marker not in games:
        raise SystemExit('Manage Games R1 insertion marker missing')
    games = games.replace(focus_marker, focus_code + focus_marker, 1)

timing_old = 'return `<details class="card admin-card admin-collapsible-card" open style="margin-bottom:12px;border:1px solid rgba(68,202,255,.38)">'
timing_new = 'return `<details id="pattcNflPlayoffRaceTimingAdmin" data-admin-manager-section="playoff-race" class="card admin-card admin-collapsible-card" open style="margin-bottom:12px;border:1px solid rgba(68,202,255,.38)">'
if timing_new not in games:
    if timing_old not in games:
        raise SystemExit('Playoff Race timing card marker missing')
    games = games.replace(timing_old, timing_new, 1)

cleanup_anchor = '    window.setTimeout(adminManageGamesApplyCleanupR1_, 0);'
focus_schedule = '    window.setTimeout(function() { adminManageGamesScheduleFocusR2_(0); }, 0);'
if focus_schedule not in games:
    if cleanup_anchor not in games:
        raise SystemExit('Manage Games cleanup scheduling marker missing')
    games = games.replace(cleanup_anchor, cleanup_anchor + '\n' + focus_schedule, 1)

games_path.write_text(games)

test_path.write_text(r'''const fs = require('fs');
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
''')
