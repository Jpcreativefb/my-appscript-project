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

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const playerPropEngine = read('backend/engines/SportsPlayerPropEngine.js');
const wagerEngine = read('backend/engines/SportsWagerEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const sportsPage = read('frontend/js/sports.js');
const sportsCss = read('frontend/css/sports.css');
const serviceWorker = read('frontend/sw.js');

[
  'adminGetSportsPlayerPropPlayers',
  'adminGetSportsPlayerPropStatTypes',
  'adminCreateSportsPlayerProp',
  'adminSettleSportsPlayerProps'
].forEach((action) => {
  requireText(backendApi, `"${action}"`, 'Backend API');
  requireText(frontendApi, `"${action}"`, 'Frontend API');
  requireText(frontendApiMirror, `"${action}"`, 'Frontend API mirror');
});

[
  'function createSportsPlayerProp(payload)',
  'function settleSportsPlayerProps(payload)',
  'function sportsPlayerPropResolveValue_(value, line)',
  'SportsPlayerId',
  'SportsPlayerName',
  'SportsStatType',
  'SportsPropLine',
  'SportsPropSide'
].forEach((expected) => requireText(playerPropEngine, expected, 'Sports Player Prop Engine'));

[
  'market === "player-prop"',
  'settleSportsPlayerProps({',
  'settleSportsPlayerPropsForAllGames_({',
  'sportsPlayerPropRefreshStatsForLeagues_'
].forEach((expected) => requireText(wagerEngine, expected, 'Sports Wager integration'));

[
  'data-create-player-prop-game-id',
  'Create Player Prop',
  'adminGetSportsPlayerPropPlayers',
  'adminCreateSportsPlayerProp',
  'sportsPropLine',
  'overOdds',
  'underOdds'
].forEach((expected) => requireText(sportsPage, expected, 'Sports page'));

requireText(sportsCss, '.sports-player-prop-overlay', 'Sports CSS');
requireText(playerPropEngine, 'sportsAdminBridgeCall_(', 'Secure player-stat refresh bridge');
requireText(playerPropEngine, 'sportsPlayerPropRequireWagerGame_(', 'Wager-enabled destination validation');
requireText(playerPropEngine, 'testLatestSportsPlayerPropWagerReadiness', 'Player-prop wager readiness diagnostic');
requireText(serviceWorker, 'awards-app-v257-game-setup-save-compatibility', 'Service worker cache');

const backendContext = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  isFinite
};
vm.createContext(backendContext);
vm.runInContext(playerPropEngine, backendContext);

const mlbStats = backendContext.sportsPlayerPropStatOptions_('mlb', 'baseball');
const nflStats = backendContext.sportsPlayerPropStatOptions_('nfl', 'football');
assert(mlbStats.some((item) => item[0] === 'home-runs'), 'MLB home-runs stat is missing');
assert(mlbStats.some((item) => item[0] === 'pitching-strikeouts'), 'MLB pitching-strikeouts stat is missing');
assert(nflStats.some((item) => item[0] === 'passing-yards'), 'NFL passing-yards stat is missing');
assert(nflStats.some((item) => item[0] === 'receiving-yards'), 'NFL receiving-yards stat is missing');

assert(
  backendContext.sportsPlayerPropResolveValue_(327, 275.5).winnerSide === 'over',
  'Over result failed'
);
assert(
  backendContext.sportsPlayerPropResolveValue_(250, 275.5).winnerSide === 'under',
  'Under result failed'
);
const push = backendContext.sportsPlayerPropResolveValue_(2, 2);
assert(push.winnerSide === 'push' && push.wagerResultType === 'push', 'Push result failed');

assert(
  backendContext.sportsPlayerPropTeamMatchesGame_(
    { Team: 'New York Yankees' },
    { HomeTeam: 'New York Yankees', AwayTeam: 'Boston Red Sox' }
  ),
  'Player/game team match failed'
);
assert(
  !backendContext.sportsPlayerPropTeamMatchesGame_(
    { Team: 'Chicago Cubs' },
    { HomeTeam: 'New York Yankees', AwayTeam: 'Boston Red Sox' }
  ),
  'Cross-team player was incorrectly accepted'
);

const noop = () => {};
const sessionJson = JSON.stringify({ username: 'admin', token: 'token', isAdmin: true });
const documentStub = {
  addEventListener: noop,
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    classList: { add: noop, remove: noop },
    addEventListener: noop,
    appendChild: noop,
    remove: noop,
    style: {},
    options: []
  }),
  body: { appendChild: noop }
};
const windowStub = { addEventListener: noop };
const frontendContext = {
  console,
  document: documentStub,
  window: windowStub,
  localStorage: { getItem: () => sessionJson, setItem: noop },
  URL,
  fetch: async () => ({ json: async () => ({ success: true }) }),
  alert: noop,
  confirm: () => true,
  setTimeout: () => 1,
  clearTimeout: noop,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  isFinite
};
windowStub.document = documentStub;
vm.createContext(frontendContext);
vm.runInContext(sportsPage, frontendContext);

const button = frontendContext.renderCreatePlayerPropButton({
  GameId: 'mlb_123',
  League: 'mlb',
  Sport: 'baseball',
  HomeTeam: 'New York Yankees',
  AwayTeam: 'Boston Red Sox'
});
assert(button.includes('Create Player Prop'), 'MLB player-prop button did not render');

const unsupportedButton = frontendContext.renderCreatePlayerPropButton({
  GameId: 'nba_123',
  League: 'nba',
  Sport: 'basketball',
  HomeTeam: 'Chicago Bulls',
  AwayTeam: 'New York Knicks'
});
assert(unsupportedButton.includes('Create Player Prop'), 'NBA player-prop button did not render');

assert(
  frontendContext.sportsPlayerTeamMatchesGame_(
    { Team: 'Kansas City Chiefs' },
    { HomeTeam: 'Kansas City Chiefs', AwayTeam: 'Denver Broncos' }
  ),
  'Frontend team filtering failed'
);

console.log('Sports Player Props integration tests passed.');
