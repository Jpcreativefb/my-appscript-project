const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const requireText = (text, expected, label) => {
  if (!text.includes(expected)) throw new Error(`${label}: missing ${expected}`);
};

const engine = read('backend/engines/SportsPlayerPropEngine.js');
const wagerEngine = read('backend/engines/SportsWagerEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const sportsPage = read('frontend/js/sports.js');
const sportsCss = read('frontend/css/sports.css');
const serviceWorker = read('frontend/sw.js');

[
  'adminCreateSportsPlayerMatchup',
  'adminSettleSportsPlayerMatchups'
].forEach((action) => {
  requireText(backendApi, `"${action}"`, 'Backend API');
  requireText(frontendApi, `"${action}"`, 'Frontend API');
  requireText(frontendApiMirror, `"${action}"`, 'Frontend API mirror');
});

[
  'function createSportsPlayerMatchup(payload)',
  'function settleSportsPlayerMatchups(payload)',
  'function settleSportsPlayerMatchupsForAllGames_(payload)',
  'function sportsPlayerMatchupResolve_(entries)',
  'SPORTS_PLAYER_MATCHUP_MARKET',
  'SportsComparisonMode',
  'SportsQuestionMode',
  'SportsTieMode'
].forEach((expected) => requireText(engine, expected, 'Player matchup engine'));

[
  'market === "player-matchup"',
  'settleSportsPlayerMatchups({',
  'settleSportsPlayerMatchupsForAllGames_({',
  'playerMatchups: playerMatchups'
].forEach((expected) => requireText(wagerEngine, expected, 'Sports Wager integration'));

[
  'data-create-player-matchup-game-id',
  'Create Player Matchup',
  'function showSportsPlayerMatchupModal_',
  'function createSportsPlayerMatchupFromCard',
  'adminCreateSportsPlayerMatchup',
  'playersJSON: JSON.stringify(config.players)',
  'Prediction — writes to Picks',
  'Wager — writes to Bets'
].forEach((expected) => requireText(sportsPage, expected, 'Sports page'));

requireText(sportsCss, '.sports-player-matchup-player-list', 'Sports CSS');
requireText(serviceWorker, 'awards-app-v256-game-setup-save-delete', 'Service worker cache');

const backendContext = {
  console, Date, JSON, Math, Number, String, Array, Object, isFinite
};
vm.createContext(backendContext);
vm.runInContext(engine, backendContext);

const winner = backendContext.sportsPlayerMatchupResolve_([
  { nomineeId: 'mahomes', playerName: 'Patrick Mahomes', value: 3 },
  { nomineeId: 'allen', playerName: 'Josh Allen', value: 2 },
  { nomineeId: 'burrow', playerName: 'Joe Burrow', value: 1 }
]);
assert(winner.resolved === true, 'Matchup did not resolve');
assert(winner.winnerNomineeId === 'mahomes', 'Highest stat did not win');
assert(winner.wagerResultType === 'win', 'Winner result type is wrong');

const tie = backendContext.sportsPlayerMatchupResolve_([
  { nomineeId: 'judge', playerName: 'Aaron Judge', value: 2 },
  { nomineeId: 'ohtani', playerName: 'Shohei Ohtani', value: 2 }
]);
assert(tie.resolved === true && tie.tied === true, 'Tie was not detected');
assert(tie.winnerNomineeId === 'push', 'Tie did not resolve to push');
assert(tie.wagerResultType === 'push', 'Tie wager result is not push');

const parsed = backendContext.sportsPlayerMatchupParsePlayers_(JSON.stringify([
  { playerId: 'mlb-1', odds: 1.91 },
  { playerId: 'mlb-2', odds: 2.1 }
]));
assert(parsed.length === 2, 'Players JSON did not parse');
assert(
  backendContext.sportsPlayerMatchupQuestion_('Passing Touchdowns') ===
    'Which player will record the most passing touchdowns?',
  'Default matchup question is wrong'
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
    querySelectorAll: () => [],
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
  Date, JSON, Math, Number, String, Array, Object, isFinite
};
windowStub.document = documentStub;
vm.createContext(frontendContext);
vm.runInContext(sportsPage, frontendContext);

const button = frontendContext.renderCreatePlayerMatchupButton({
  GameId: 'nfl_123',
  League: 'nfl',
  Sport: 'football',
  HomeTeam: 'Kansas City Chiefs',
  AwayTeam: 'Buffalo Bills'
});
assert(button.includes('Create Player Matchup'), 'Matchup button did not render');

const unsupportedButton = frontendContext.renderCreatePlayerMatchupButton({
  GameId: 'nba_123',
  League: 'nba',
  Sport: 'basketball',
  HomeTeam: 'Chicago Bulls',
  AwayTeam: 'New York Knicks'
});
assert(unsupportedButton.includes('Create Player Matchup'), 'NBA matchup button did not render');

console.log('Sports Player Matchups integration tests passed.');
