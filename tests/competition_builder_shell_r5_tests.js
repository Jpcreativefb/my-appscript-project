const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const managerPath = path.join(root, 'frontend/js/pages/adminSportsManagersR3.js');
const shellSource = fs.readFileSync(shellPath, 'utf8');
const managerSource = fs.readFileSync(managerPath, 'utf8');

assert.doesNotThrow(() => new Function(shellSource), 'Competition Builder R5 shell must parse');

// 1. Competitions remains one of five lifecycle groups.
for (const heading of [
  '1. Game Builder',
  '2. Manage Existing Games',
  '3. Competitions',
  '4. League / Season Data',
  '5. Operations'
]) {
  assert(shellSource.includes(heading), 'missing lifecycle group: ' + heading);
}

// 2-5. Compact competition selector, full-width workspace, authoritative Cup route, no duplicated Cup controls.
assert(/Competition Type[\s\S]*value="cup"[\s\S]*>Cup<\/option>[\s\S]*value="series"[\s\S]*>Series<\/option>[\s\S]*value="tournament"[\s\S]*>Tournament<\/option>/.test(shellSource), 'Competition selector must include Cup, Series, Tournament');
assert(shellSource.includes('data-admin-r5-competition-host'), 'full-width Competition workspace host missing');
assert(shellSource.indexOf('data-admin-r5-competition-host') > shellSource.indexOf('5. Operations'), 'Competition workspace must render below lifecycle cards');
assert(shellSource.includes("navigate('admin-nfl-cup')"), 'Cup must retain admin-nfl-cup route');
assert(shellSource.includes('Open NFL Cup Control Center'), 'Cup workspace must expose one authoritative manager action');
assert(!shellSource.includes('pattcCupControlAdminCardR3_'), 'shared shell must not duplicate Cup Control Center renderer');
assert(managerSource.includes('async function renderAdminNflCupPage()'), 'dedicated NFL Cup page must remain authoritative');
assert(managerSource.includes('pattcCupControlAdminCardR3_'), 'dedicated NFL Cup page must continue delegating to existing Cup Control Center');

// 6-10. Series/Tournament are presentation-only; no game creation, new canonical types, or fake persistence.
assert(shellSource.includes('Selected Competition — Series'), 'Series workspace missing');
assert(shellSource.includes('Selected Competition — Tournament'), 'Tournament workspace missing');
assert((shellSource.match(/Competition creation is not available yet\./g) || []).length >= 2, 'Series/Tournament must explicitly say creation is unavailable');
assert(shellSource.includes('does not create Games rows'), 'Series/Tournament no-create boundary must be explicit');
assert(!/type\s*:\s*["']series["']/.test(shellSource), 'must not emit series as a canonical Games type');
assert(!/type\s*:\s*["']tournament["']/.test(shellSource), 'must not emit tournament as a canonical Games type');
assert(!/localStorage|sessionStorage|indexedDB/i.test(shellSource), 'Competition shell must not introduce browser persistence authority');

function runtime() {
  const calls = { api: [], nav: [] };
  const builderHost = { innerHTML: '' };
  const competitionHost = { innerHTML: '' };
  const message = { textContent: '' };
  const mountHost = {
    innerHTML: '',
    attrs: {},
    getAttribute(k) { return this.attrs[k] || ''; },
    setAttribute(k, v) { this.attrs[k] = String(v); }
  };
  const shell = {
    querySelector(selector) {
      if (selector === '[data-admin-r3b-builder-host]') return builderHost;
      if (selector === '[data-admin-r5-competition-host]') return competitionHost;
      if (selector === '[data-admin-r2-selection-message]') return message;
      return null;
    },
    querySelectorAll() { return []; }
  };
  const context = {
    window: {},
    document: {
      querySelector(selector) {
        if (selector === '[data-admin-games-design-r1="1"]') return mountHost;
        if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]') return shell;
        return null;
      }
    },
    console,
    navigate(route) { calls.nav.push(route); },
    apiAdminCreateGame(payload) { calls.api.push(payload); return Promise.resolve({ success: true }); },
    setFrontendGameId() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(shellSource, context);
  return { context, calls, competitionHost, mountHost };
}

{
  const state = runtime();
  assert.strictEqual(state.context.pattcAdminGameBuilderNavigationShellR2Mount(), true, 'shell must mount');
  const html = state.mountHost.innerHTML;

  // 11-16. R3/R4 routing and builder boundaries remain intact.
  for (const label of ['Confidence', 'Survivor', 'Team Fantasy', 'Playoff / Forecast', 'Other Game']) {
    assert(html.includes(label), 'Game Builder behavior missing: ' + label);
  }
  assert(html.includes("navigate('admin-games')"), 'Manage Existing Games must remain admin-games');
  assert(html.includes("navigate('admin-nfl-season-setup')"), 'NFL Sports Pack must remain dedicated');
  assert(html.includes("navigate('admin-sports-engine')"), 'Sports Engine Controls must remain dedicated');
  assert(shellSource.includes("navigate('admin-team-fantasy')"), 'Team Fantasy must remain dedicated after exact type handoff');
  assert(shellSource.includes("navigate(\"admin-playoff-race\")"), 'Playoff Race must remain dedicated');

  state.context.pattcAdminGameBuilderR2Select_('series', 'competition');
  assert(state.competitionHost.innerHTML.includes('Selected Competition — Series'), 'Series selection must open selected workspace');
  assert.strictEqual(state.calls.api.length, 0, 'Series selection must never call apiAdminCreateGame');

  state.context.pattcAdminGameBuilderR2Select_('tournament', 'competition');
  assert(state.competitionHost.innerHTML.includes('Selected Competition — Tournament'), 'Tournament selection must open selected workspace');
  assert.strictEqual(state.calls.api.length, 0, 'Tournament selection must never call apiAdminCreateGame');

  state.context.pattcAdminGameBuilderR2Select_('cup', 'competition');
  assert(state.competitionHost.innerHTML.includes('Selected Competition — Cup'), 'Cup selection must open selected workspace');
  assert(state.competitionHost.innerHTML.includes('Open NFL Cup Control Center'), 'Cup selected workspace must retain dedicated action');
  assert.strictEqual(state.calls.api.length, 0, 'Cup shell selection must not create a Game');
}

console.log('PASS Competition Builder shell R5 source and runtime boundaries');
