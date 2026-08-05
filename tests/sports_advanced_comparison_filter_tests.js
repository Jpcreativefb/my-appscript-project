const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/sports.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

const documentStub = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => ({}),
  body: { appendChild: () => {} }
};
const windowStub = { addEventListener: () => {}, visualViewport: null };
const context = {
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
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(
  context.sportsAdvancedQuestionSearchMatches_('team chicago cubs chc', 'Cubs, White Sox'),
  true,
  'Comma-separated search should match the Cubs token'
);
assert.strictEqual(
  context.sportsAdvancedQuestionSearchMatches_('team chicago white sox cws', 'Cubs, White Sox'),
  true,
  'Comma-separated search should match the White Sox token'
);
assert.strictEqual(
  context.sportsAdvancedQuestionSearchMatches_('team milwaukee brewers mil', 'Cubs, White Sox'),
  false,
  'Unrelated teams should remain filtered out'
);

const nflEntities = [
  { entityType: 'TEAM', groupName: 'AFC East' },
  { entityType: 'TEAM', groupName: 'AFC East' },
  { entityType: 'TEAM', groupName: 'NFC North' }
];
const nflGroups = context.sportsAdvancedQuestionGroupInfo_('nfl', nflEntities);
assert.strictEqual(context.sportsAdvancedQuestionsSupported_({ League: 'nhl' }), true);
assert.strictEqual(context.sportsAdvancedQuestionsSupported_({ League: 'college-football' }), true);
const nhlMeta = context.sportsAdvancedTeamMeta_('nhl', 'Chicago Blackhawks');
assert.strictEqual(nhlMeta.abbreviation, 'CHI');
assert.strictEqual(nhlMeta.group, 'Central');

assert.strictEqual(nflGroups.label, 'NFL Division');
assert.deepStrictEqual(
  Array.from(nflGroups.groups, item => item.name),
  ['AFC East', 'NFC North']
);

const collegeEntities = context.sportsAdvancedQuestionBuildEntities_([{
  GameId: 'college-football_1', ESPNEventId: 'cf1', League: 'college-football', Sport: 'football',
  AwayTeam: 'Iowa Hawkeyes', AwayTeamId: '2294', AwayAbbreviation: 'IOWA', AwayConferenceName: 'Big Ten',
  HomeTeam: 'Wisconsin Badgers', HomeTeamId: '275', HomeAbbreviation: 'WIS', HomeConferenceName: 'Big Ten',
  GameDateTime: '2026-10-10T17:00:00Z'
}], []);
const collegeGroups = context.sportsAdvancedQuestionGroupInfo_('college-football', collegeEntities);
assert.strictEqual(collegeGroups.label, 'NCAA Conference');
assert.deepStrictEqual(Array.from(collegeGroups.groups, item => item.name), ['Big Ten']);

const games = [{
  GameId: 'mlb_1',
  ESPNEventId: '1',
  League: 'mlb',
  Sport: 'baseball',
  AwayTeam: 'St. Louis Cardinals',
  AwayTeamId: '24',
  HomeTeam: 'Chicago Cubs',
  HomeTeamId: '16',
  GameDateTime: '2026-07-29T19:05:00Z'
}];
const players = [{
  PlayerId: 'mlb_123',
  ESPNPlayerId: '123',
  TeamId: '16',
  Team: 'Chicago Cubs',
  FullName: 'Example Pitcher',
  Position: 'P'
}];
const entities = context.sportsAdvancedQuestionBuildEntities_(games, players);
const player = entities.find(item => item.entityType === 'PLAYER');
assert(player, 'Expected player entity');
assert.strictEqual(player.teamAbbreviation, 'CHC');
assert.strictEqual(player.position, 'P');
const playerLabel = context.sportsAdvancedQuestionEntityLabel_(player);
assert(playerLabel.includes('Example Pitcher · P · CHC'));

const cubs = entities.find(item => item.entityType === 'TEAM' && item.entityName === 'Chicago Cubs');
assert.strictEqual(cubs.groupName, 'NL Central');
assert.strictEqual(cubs.teamAbbreviation, 'CHC');

assert(source.includes('data-advanced-group='));
assert(!source.includes('data-advanced-division='));
assert(source.includes('sportsAdvancedQuestionSearchTokens_'));
assert(source.includes('groupInfo.label'));
assert(html.includes('sports.js?v=308-reality-tv-episode-recovery'));
assert(sw.includes('awards-app-v264-question-mode-table-repair'));

console.log('Sports advanced comparison filter tests passed.');
