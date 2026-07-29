const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireText(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`);
  }
}

const bridge = read('backend/engines/SportsAdminBridgeEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const adminCode = read('frontend/js/pages/admin.js');

[
  'getSportsPlayerStatusAdmin',
  'syncSportsPlayersAdmin',
  'refreshSportsPlayerGameStatsAdmin'
].forEach((action) => requireText(bridge, action, 'Sports admin bridge'));

[
  'adminGetSportsPlayerStatus',
  'adminSyncSportsPlayers',
  'adminRefreshSportsPlayerGameStats'
].forEach((action) => {
  requireText(backendApi, `"${action}"`, 'Backend API');
  requireText(frontendApi, `"${action}"`, 'Frontend API');
});

const noop = () => {};
const documentStub = {
  addEventListener: noop,
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: () => null,
  createElement: () => ({
    setAttribute: noop,
    appendChild: noop,
    classList: { add: noop, remove: noop, toggle: noop },
    style: {},
    dataset: {}
  }),
  body: { appendChild: noop, contains: () => true }
};
const windowStub = {
  addEventListener: noop,
  innerWidth: 1200,
  innerHeight: 800,
  visualViewport: null
};
windowStub.window = windowStub;

const context = {
  console,
  document: documentStub,
  window: windowStub,
  requestAnimationFrame: (fn) => { fn(); return 1; },
  cancelAnimationFrame: noop,
  setTimeout: () => 1,
  clearTimeout: noop,
  URL,
  localStorage: { getItem: () => '', setItem: noop },
  confirm: () => true
};
windowStub.document = documentStub;
Object.assign(windowStub, context);
vm.createContext(context);
vm.runInContext(adminCode, context);

const html = context.adminRenderSportsControlDashboard_({
  sportsSettings: [
    {
      sport: 'baseball',
      league: 'mlb',
      enabled: true,
      seasonActive: true,
      seasonTitle: '2026'
    },
    {
      sport: 'basketball',
      league: 'nba',
      enabled: true,
      seasonActive: true,
      seasonTitle: '2026-27'
    }
  ],
  odds: { settings: [], usage: {} },
  leagueHealth: { leagues: [], totals: {} },
  players: {
    playerCount: 1200,
    statRowCount: 555,
    leagues: [
      {
        sport: 'baseball',
        league: 'mlb',
        playerCount: 1200,
        activePlayerCount: 1180,
        statRowCount: 555,
        lastPlayerUpdated: '2026-07-27T02:00:00.000Z',
        lastStatsUpdated: '2026-07-27T02:05:00.000Z'
      }
    ]
  }
}, []);

[
  'Players: 1200',
  'Player stat rows: 555',
  'Roster: 1180 active / 1200 total',
  'Sync Players',
  'Refresh Current Game Stats',
  'adminSyncSportsPlayers(&#039;mlb&#039;, &#039;baseball&#039;)',
  'adminSyncSportsPlayers(&#039;nba&#039;, &#039;basketball&#039;)'
].forEach((expected) => requireText(html, expected, 'Rendered Sports Controls'));

console.log('Sports Players Controls integration tests passed.');
