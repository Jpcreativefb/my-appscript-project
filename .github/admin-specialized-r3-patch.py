from pathlib import Path
import re

ROOT = Path('.')
admin_path = ROOT / 'frontend/js/pages/admin.js'
app_path = ROOT / 'frontend/js/app.js'
games_path = ROOT / 'frontend/js/pages/adminGamesRc24e.js'
test_path = ROOT / 'tests/admin_specialized_manager_pages_r3_tests.js'

admin = admin_path.read_text()
app = app_path.read_text()
games = games_path.read_text()

# 1) Admin landing: remove R2 focus helper and route only true specialized destinations.
admin = re.sub(
    r'^var ADMIN_SPORTS_MANAGE_GAMES_TARGET_R2_ = "";\n\nfunction adminOpenSportsManageGamesR2_\(target\) \{.*?\n\}\n\n',
    '', admin, count=1, flags=re.S
)
admin = admin.replace('onclick="adminOpenSportsManageGamesR2_(\'confidence\')">Confidence</button>', 'onclick="navigate(\'admin-games\')">Confidence</button>')
admin = admin.replace('onclick="adminOpenSportsManageGamesR2_(\'survivor\')">Survivor</button>', 'onclick="navigate(\'admin-games\')">Survivor</button>')
admin = admin.replace('onclick="adminOpenSportsManageGamesR2_(\'playoff-race\')">Playoff Race</button>', 'onclick="navigate(\'admin-playoff-race\')">Playoff Race</button>')
admin = admin.replace('onclick="adminOpenSportsManageGamesR2_(\'nfl-cup\')">Cups / Combined Competitions → NFL Cup</button>', 'onclick="navigate(\'admin-nfl-cup\')">Cups / Combined Competitions → NFL Cup</button>')
admin = admin.replace(
    '<button class="button admin-button secondary" onclick="navigate(\'admin-games\')">NFL 2026 Shared Game Settings</button>',
    '<button class="button admin-button secondary" onclick="navigate(\'admin-nfl-season-setup\')">Season / Sports Setup → NFL Sports Pack</button>\n                  <button class="button admin-button secondary" onclick="navigate(\'admin-games\')">NFL 2026 Shared Game Settings</button>'
)
admin = admin.replace(
    '<button class="button admin-button secondary" onclick="adminOpenSportsControls()">Sports Engine Controls</button>\n                  </div>\n                  <div id="adminSportsControlMessage" class="admin-message"></div>\n                  <div id="adminSportsControlPanel" class="admin-list"></div>',
    '<button class="button admin-button secondary" onclick="navigate(\'admin-sports-engine\')">Sports Engine Controls</button>\n                  </div>'
)
admin_path.write_text(admin)

# 2) App routes for true dedicated destinations.
route_anchor = '  "admin-team-fantasy": ["admin", "adminUi", "adminTeamFantasy"],\n'
route_add = (
    route_anchor +
    '  "admin-nfl-cup": ["admin", "adminUi", "adminGamesRc24e", "adminSportsManagersR3"],\n'
    '  "admin-nfl-season-setup": ["admin", "adminUi", "adminGamesRc24e", "adminSportsManagersR3"],\n'
    '  "admin-playoff-race": ["admin", "adminUi", "adminGamesRc24e", "adminSportsManagersR3"],\n'
    '  "admin-sports-engine": ["admin", "adminUi", "adminSportsManagersR3"],\n'
)
if '"admin-nfl-cup"' not in app:
    app = app.replace(route_anchor, route_add, 1)

switch_anchor = '''    case "admin-team-fantasy":\n      if (typeof renderAdminTeamFantasyPage !== "function") throw new Error("Team Fantasy admin script is not loaded.");\n      app.innerHTML = await renderAdminTeamFantasyPage();\n      break;\n'''
switch_add = switch_anchor + '''\n    case "admin-nfl-cup":\n      if (typeof renderAdminNflCupPage !== "function") throw new Error("NFL Cup admin script is not loaded.");\n      app.innerHTML = await renderAdminNflCupPage();\n      break;\n\n    case "admin-nfl-season-setup":\n      if (typeof renderAdminNflSeasonSetupPage !== "function") throw new Error("NFL season setup admin script is not loaded.");\n      app.innerHTML = await renderAdminNflSeasonSetupPage();\n      break;\n\n    case "admin-playoff-race":\n      if (typeof renderAdminPlayoffRacePage !== "function") throw new Error("Playoff Race admin script is not loaded.");\n      app.innerHTML = await renderAdminPlayoffRacePage();\n      break;\n\n    case "admin-sports-engine":\n      if (typeof renderAdminSportsEnginePage !== "function") throw new Error("Sports Engine admin script is not loaded.");\n      app.innerHTML = await renderAdminSportsEnginePage();\n      break;\n'''
if 'case "admin-nfl-cup"' not in app:
    app = app.replace(switch_anchor, switch_add, 1)

# Admin route/nav recognition.
app = app.replace(
    '    page === "admin-reality-tv" || page.indexOf("admin-game-setup:") === 0;',
    '    page === "admin-reality-tv" || page === "admin-nfl-cup" || page === "admin-nfl-season-setup" || page === "admin-playoff-race" || page === "admin-sports-engine" || page.indexOf("admin-game-setup:") === 0;'
)
app = app.replace(
    '      page === "admin-reality-tv" || page === "admin-appearance" ||\n      page.indexOf("admin-game-setup:") === 0 || page === "hub:general") {',
    '      page === "admin-reality-tv" || page === "admin-appearance" || page === "admin-nfl-cup" ||\n      page === "admin-nfl-season-setup" || page === "admin-playoff-race" || page === "admin-sports-engine" ||\n      page.indexOf("admin-game-setup:") === 0 || page === "hub:general") {'
)
app_path.write_text(app)

# 3) Manage Games: remove obsolete R2 focus machinery entirely.
games = re.sub(
    r'\n/\* ADMIN_SPORTS_GAME_ORGANIZATION_R2_FOCUS_START \*/.*?/\* ADMIN_SPORTS_GAME_ORGANIZATION_R2_FOCUS_END \*/\n',
    '\n', games, count=1, flags=re.S
)
games = games.replace(
    'window.setTimeout(function() { adminManageGamesApplyCleanupR1_(); adminManageGamesScheduleFocusR2_(0); }, 0);',
    'window.setTimeout(adminManageGamesApplyCleanupR1_, 0);'
)

# Sports Pack / Playoff Timing: keep card builders + handlers, stop injecting Manage Games.
old_pack_wrap = '''const base=root.renderAdminGamesPage;if(typeof base==="function"){root.renderAdminGamesPage=async function(){const html=String(await base()),card=nflSeasonPackAdminCard_(),timing=nflPlayoffRaceTimingAdminCard_(),match=html.match(/<div class="page[^>]*>/);setTimeout(function(){if(root.nflPlayoffRaceAdminLoad_)root.nflPlayoffRaceAdminLoad_();},300);return match?html.replace(match[0],match[0]+card+timing):card+timing+html;};}})(window);'''
new_pack_wrap = '''root.nflSeasonPackAdminCardR3_=nflSeasonPackAdminCard_;root.nflPlayoffRaceTimingAdminCardR3_=nflPlayoffRaceTimingAdminCard_;})(window);'''
if old_pack_wrap not in games:
    raise SystemExit('NFL Sports Pack wrapper signature changed')
games = games.replace(old_pack_wrap, new_pack_wrap, 1)

# Futures: expose its existing presentation card for the Cup page, stop Manage Games injection.
futures_pattern = re.compile(r'''const BASE=root\.renderAdminGamesPage;\nif\(typeof BASE==='function'\)\{root\.renderAdminGamesPage=async function\(\)\{\n  const html=String\(await BASE\(\)\);\n  const card='(<section class=\\"card admin-card\\".*?</section>)';\n  const pos=html\.indexOf\('<div class=\\"page'\);if\(pos<0\)return card\+html;\n  const end=html\.indexOf\('>',pos\);return html\.slice\(0,end\+1\)\+card\+html\.slice\(end\+1\);\n\};\}''', re.S)
m = futures_pattern.search(games)
if not m:
    raise SystemExit('NFL Futures wrapper signature changed')
card_literal = m.group(1)
games = games[:m.start()] + "root.nflCupFuturesAdminCardR3_=function(){return '" + card_literal + "';};" + games[m.end():]

# Cup Control: expose existing layout as a dedicated renderer, stop injecting Manage Games.
cup_pattern = re.compile(r'''  const BASE = root\.renderAdminGamesPage;\n  if \(typeof BASE === 'function'\) root\.renderAdminGamesPage = async function \(\) \{.*?\n  \};\n\}\)\(window\);''', re.S)
m = cup_pattern.search(games)
if not m:
    raise SystemExit('NFL Cup Control wrapper signature changed')
cup_replacement = '''  root.pattcCupControlAdminCardR3_ = async function () {\n    const response = await apiAdminGetGames();\n    if (resultError(response)) return '';\n    return layout(response.games || []);\n  };\n})(window);'''
games = games[:m.start()] + cup_replacement + games[m.end():]

# Weekly/season extension belongs to the Cup renderer instead of Manage Games.
games = games.replace('var BASE=root.renderAdminGamesPage;\n if(typeof BASE===\'function\')root.renderAdminGamesPage=async function(){', 'var BASE=root.pattcCupControlAdminCardR3_;\n if(typeof BASE===\'function\')root.pattcCupControlAdminCardR3_=async function(){', 1)

games_path.write_text(games)

# 4) Focused R3 contract tests.
test_path.write_text(r'''const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const admin = read('frontend/js/pages/admin.js');
const app = read('frontend/js/app.js');
const games = read('frontend/js/pages/adminGamesRc24e.js');
const managers = read('frontend/js/pages/adminSportsManagersR3.js');

assert.doesNotThrow(() => new Function(admin));
assert.doesNotThrow(() => new Function(app));
assert.doesNotThrow(() => new Function(games));
assert.doesNotThrow(() => new Function(managers));

// Confidence + Survivor remain ordinary Manage Games navigation.
assert(admin.includes("onclick=\"navigate('admin-games')\">Confidence</button>"));
assert(admin.includes("onclick=\"navigate('admin-games')\">Survivor</button>"));
assert(!admin.includes('adminOpenSportsManageGamesR2_'));
assert(!games.includes('adminManageGamesApplyFocusR2_'));
assert(!games.includes('adminManageGamesScheduleFocusR2_'));

// Dedicated destinations.
assert(admin.includes("navigate('admin-team-fantasy')">Team Fantasy Football"));
assert(admin.includes("navigate('admin-playoff-race')">Playoff Race"));
assert(admin.includes("navigate('admin-nfl-cup')">Cups / Combined Competitions → NFL Cup"));
assert(admin.includes("navigate('admin-nfl-season-setup')">Season / Sports Setup → NFL Sports Pack"));
assert(admin.includes("navigate('admin-sports-engine')">Sports Engine Controls"));
assert.strictEqual((admin.match(/Sports Scores &amp; Game Builder/g) || []).length, 1);
assert(!admin.includes('id="adminSportsControlPanel"'), 'Sports Engine panel must not render on Admin landing');

['admin-nfl-cup','admin-nfl-season-setup','admin-playoff-race','admin-sports-engine'].forEach(route => {
  assert(app.includes('"' + route + '"'), 'route missing: ' + route);
  assert(app.includes('case "' + route + '"'), 'render switch missing: ' + route);
});

// Existing operational implementations remain, but no longer wrap Manage Games.
assert(games.includes('root.nflSeasonPackAdminCardR3_=nflSeasonPackAdminCard_'));
assert(games.includes('root.nflPlayoffRaceTimingAdminCardR3_=nflPlayoffRaceTimingAdminCard_'));
assert(games.includes('root.nflCupFuturesAdminCardR3_=function()'));
assert(games.includes('root.pattcCupControlAdminCardR3_ = async function'));
assert(!games.includes('const base=root.renderAdminGamesPage;if(typeof base==="function"){root.renderAdminGamesPage=async function(){const html=String(await base()),card=nflSeasonPackAdminCard_()'));
assert(!games.includes("const BASE=root.renderAdminGamesPage;\nif(typeof BASE==='function'){root.renderAdminGamesPage=async function(){"));
assert(!games.includes('const BASE = root.renderAdminGamesPage;\n  if (typeof BASE === \'function\') root.renderAdminGamesPage = async function () {'));
assert(games.includes("var BASE=root.pattcCupControlAdminCardR3_"), 'Cup weekly/season extension must decorate dedicated Cup renderer');

// New pages reuse existing functions/handlers rather than fork APIs.
assert(managers.includes('nflCupFuturesAdminCardR3_()'));
assert(managers.includes('await pattcCupControlAdminCardR3_()'));
assert(managers.includes('nflSeasonPackAdminCardR3_()'));
assert(managers.includes('nflPlayoffRaceTimingAdminCardR3_()'));
assert(managers.includes('adminOpenSportsControls()'));
['apiAdminUpdateGame','apiAdminFinalizeGamePublication','adminBuildNflSeasonPack','adminSaveNflPlayoffRaceSettings'].forEach(token => {
  assert(!managers.includes(token), 'new presentation page must not fork API ownership: ' + token);
});

// Protected backend/engine sources are untouched by this presentation test contract.
console.log('PASS admin specialized manager pages R3');
''')
