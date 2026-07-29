const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sportsSource = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');
const sportsHtml = fs.readFileSync(path.join(root, 'frontend/sports.html'), 'utf8');
const engineSource = fs.readFileSync(
  path.join(root, 'external-engines/sports-scoring-engine/src/SportsScoresEngine.js'),
  'utf8'
);

const documentStub = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => ({}),
  body: { appendChild: () => {} }
};
const windowStub = { addEventListener: () => {}, visualViewport: null };
const frontendContext = {
  console,
  document: documentStub,
  window: windowStub,
  localStorage: { getItem: () => '' },
  URL,
  URLSearchParams,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  Promise,
  setTimeout: () => 1,
  clearTimeout: () => {},
  alert: () => {},
  confirm: () => true
};
windowStub.document = documentStub;
vm.createContext(frontendContext);
vm.runInContext(sportsSource, frontendContext);

assert(sportsHtml.includes('sportsAdvancedBuilderSection'), 'Standalone comparison section is missing');
assert(sportsSource.includes('createSportsAdvancedQuestionFromSection_'), 'Standalone comparison action is missing');
assert(sportsSource.includes('sportsAdvancedLoadGamesForContext_'), 'Independent league/date/week loader is missing');
assert(sportsSource.includes('sportsAdvancedBuilderWeekSupported_'), 'Week scope gating is missing');

assert.strictEqual(
  frontendContext.sportsAdvancedQuestionSearchMatches_('Chicago White Sox CWS', 'Cubs, White Sox'),
  true,
  'Comma-separated OR search should match the second team'
);
assert.strictEqual(
  frontendContext.sportsAdvancedQuestionSearchMatches_('Chicago Cubs CHC', 'Cubs, White Sox'),
  true,
  'Comma-separated OR search should match the first team'
);

const pageTeamTokens = Array.from(frontendContext.sportsPageTeamSearchTokens_('Cubs, White Sox'));
assert.deepStrictEqual(pageTeamTokens, ['cubs', 'white sox']);
assert.strictEqual(
  frontendContext.sportsPageGameMatchesTeamSearch_({
    HomeTeam: 'Chicago White Sox', HomeAbbreviation: 'CWS', AwayTeam: 'Milwaukee Brewers'
  }, pageTeamTokens),
  true,
  'Sports page Team filter should match the second comma-separated team'
);

const footballPresets = frontendContext.sportsAdvancedPositionPresets_('nfl');
assert(footballPresets.some((item) => item.label === 'OFF' && item.positions.includes('QB')));
assert(footballPresets.some((item) => item.label === 'DEF' && item.positions.includes('CB')));
assert(footballPresets.some((item) => item.label === 'WR/TE/RB' && item.positions.includes('WR')));

const mlbPresets = frontendContext.sportsAdvancedPositionPresets_('mlb');
assert(mlbPresets.some((item) => item.label === 'Pitchers' && item.positions.includes('SP')));
assert(mlbPresets.some((item) => item.label === 'Infield' && item.positions.includes('1B')));
assert.strictEqual(frontendContext.sportsAdvancedNormalizePosition_('Starting Pitcher'), 'SP');

const label = frontendContext.sportsAdvancedQuestionEntityLabel_({
  entityType: 'PLAYER',
  entityName: 'Example Quarterback',
  position: 'QB',
  teamAbbreviation: 'CHI',
  game: {
    AwayTeam: 'Chicago Bears',
    HomeTeam: 'Green Bay Packers',
    GameDateTime: '2026-09-13T17:00:00Z'
  }
});
assert(label.includes('Example Quarterback · QB · CHI'), 'Player label should show position before team');

const engineContext = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  Boolean,
  RegExp,
  isFinite,
  parseInt,
  parseFloat
};
vm.createContext(engineContext);
vm.runInContext(engineSource, engineContext);
engineContext.readSportsScoresRows_ = () => [
  {
    GameId: 'mlb_1', Sport: 'baseball', League: 'mlb',
    HomeTeam: 'Chicago Cubs', HomeAbbreviation: 'CHC',
    AwayTeam: 'St. Louis Cardinals', AwayAbbreviation: 'STL',
    GameDateTime: '2026-07-29T19:00:00Z', SeasonYear: 2026, SeasonType: 2, Week: ''
  },
  {
    GameId: 'mlb_2', Sport: 'baseball', League: 'mlb',
    HomeTeam: 'Chicago White Sox', HomeAbbreviation: 'CWS',
    AwayTeam: 'Milwaukee Brewers', AwayAbbreviation: 'MIL',
    GameDateTime: '2026-07-29T20:00:00Z', SeasonYear: 2026, SeasonType: 2, Week: ''
  },
  {
    GameId: 'nfl_1', Sport: 'football', League: 'nfl',
    HomeTeam: 'Chicago Bears', HomeAbbreviation: 'CHI',
    AwayTeam: 'Green Bay Packers', AwayAbbreviation: 'GB',
    GameDateTime: '2026-09-13T17:00:00Z', SeasonYear: 2026, SeasonType: 2, Week: 1
  },
  {
    GameId: 'nfl_2', Sport: 'football', League: 'nfl',
    HomeTeam: 'Detroit Lions', HomeAbbreviation: 'DET',
    AwayTeam: 'Minnesota Vikings', AwayAbbreviation: 'MIN',
    GameDateTime: '2026-09-20T17:00:00Z', SeasonYear: 2026, SeasonType: 2, Week: 2
  }
];

const teams = engineContext.apiGetSportsScores_({
  sport: 'baseball', league: 'mlb', team: 'Cubs, White Sox',
  dateFrom: '2026-07-29', dateTo: '2026-07-29'
});
assert.deepStrictEqual(Array.from(teams.scores, (item) => item.GameId), ['mlb_1', 'mlb_2']);

const abbreviationTeams = engineContext.apiGetSportsScores_({
  sport: 'baseball', league: 'mlb', team: 'CHC, CWS'
});
assert.deepStrictEqual(Array.from(abbreviationTeams.scores, (item) => item.GameId), ['mlb_1', 'mlb_2']);

const week = engineContext.apiGetSportsScores_({
  sport: 'football', league: 'nfl', seasonYear: '2026', seasonType: '2', week: '1'
});
assert.deepStrictEqual(Array.from(week.scores, (item) => item.GameId), ['nfl_1']);

console.log('Sports standalone comparison builder tests passed.');
