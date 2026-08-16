const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const playersSource = fs.readFileSync(path.join(
  root,
  'external-engines',
  'sports-scoring-engine',
  'src',
  'SportsPlayersEngine.js'
), 'utf8');

const playersContext = {
  console, Date, JSON, Math, Number, String, Array, Object,
  Boolean, RegExp, isFinite
};
vm.createContext(playersContext);
vm.runInContext(playersSource, playersContext);

[
  ['nfl', 'football'],
  ['college-football', 'football'],
  ['mlb', 'baseball'],
  ['nba', 'basketball'],
  ['wnba', 'basketball'],
  ['mens-college-basketball', 'basketball'],
  ['womens-college-basketball', 'basketball'],
  ['nhl', 'hockey'],
  ['usa.1', 'soccer'],
  ['eng.1', 'soccer'],
  ['uefa.champions', 'soccer']
].forEach(([league, sport]) => {
  assert.strictEqual(
    playersContext.sportsPlayersAssertSupportedLeague_(league, sport),
    league,
    `${league} should be supported`
  );
});

const basketball = playersContext.sportsPlayersNormalizeSummary_({
  boxscore: {
    players: [{
      team: { id: '4', displayName: 'Chicago Bulls', abbreviation: 'CHI' },
      statistics: [{
        name: 'statistics',
        labels: ['MIN', 'FG', '3PT', 'FT', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', '+/-'],
        names: ['minutes', 'fieldGoalsMade-fieldGoalsAttempted', 'threePointFieldGoalsMade-threePointFieldGoalsAttempted', 'freeThrowsMade-freeThrowsAttempted', 'offensiveRebounds', 'defensiveRebounds', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'personalFouls', 'plusMinus'],
        athletes: [{
          athlete: {
            id: '100', fullName: 'Example Guard', shortName: 'E. Guard',
            position: { abbreviation: 'G' }, jersey: '1'
          },
          stats: ['35:30', '9/18', '3/7', '4/4', '1', '5', '6', '8', '2', '1', '3', '2', '+11']
        }]
      }]
    }]
  }
}, {
  GameId: 'nba_1', ESPNEventId: '1', Sport: 'basketball', League: 'nba', Completed: false
});

const basketballStats = Object.fromEntries(basketball.stats.map(row => [row.StatType, row.StatValue]));
assert.strictEqual(basketball.players[0].TeamAbbreviation, 'CHI');
assert.strictEqual(basketballStats.points, undefined, 'Points should not be invented when source omits PTS');
assert.strictEqual(basketballStats['field-goals-made'], 9);
assert.strictEqual(basketballStats['field-goals-attempted'], 18);
assert.strictEqual(basketballStats['three-pointers-made'], 3);
assert.strictEqual(basketballStats.rebounds, 6);
assert.strictEqual(basketballStats.assists, 8);
assert(Math.abs(basketballStats.minutes - 35.5) < 0.001);

const hockey = playersContext.sportsPlayersNormalizeSummary_({
  boxscore: {
    players: [{
      team: { id: '16', displayName: 'Chicago Blackhawks', abbreviation: 'CHI' },
      statistics: [{
        name: 'skaters',
        labels: ['G', 'A', 'PTS', '+/-', 'S', 'PIM', 'HITS', 'BLK', 'TOI'],
        athletes: [{
          athlete: { id: '200', fullName: 'Example Center', position: { abbreviation: 'C' } },
          stats: ['2', '1', '3', '+2', '5', '2', '4', '3', '21:15']
        }]
      }]
    }]
  }
}, {
  GameId: 'nhl_1', ESPNEventId: '2', Sport: 'hockey', League: 'nhl', Completed: true
});
const hockeyStats = Object.fromEntries(hockey.stats.map(row => [row.StatType, row.StatValue]));
assert.strictEqual(hockeyStats.goals, 2);
assert.strictEqual(hockeyStats.assists, 1);
assert.strictEqual(hockeyStats.points, 3);
assert.strictEqual(hockeyStats.shots, 5);
assert.strictEqual(hockeyStats['blocked-shots'], 3);
assert(Math.abs(hockeyStats.minutes - 21.25) < 0.001);

const soccer = playersContext.sportsPlayersNormalizeSummary_({
  rosters: [{
    team: { id: '19', displayName: 'Chicago Fire FC', abbreviation: 'CHI' },
    roster: [{
      athlete: {
        id: '300', fullName: 'Example Forward', shortName: 'E. Forward',
        position: { abbreviation: 'F' }, jersey: '9'
      },
      statistics: [
        { name: 'minutes', displayValue: '90' },
        { name: 'goals', displayValue: '1' },
        { name: 'assists', displayValue: '1' },
        { name: 'shots', displayValue: '4' },
        { name: 'shotsOnGoal', displayValue: '2' },
        { name: 'foulsCommitted', displayValue: '1' },
        { name: 'yellowCards', displayValue: '1' },
        { name: 'passesCompleted', displayValue: '22' }
      ]
    }]
  }]
}, {
  GameId: 'usa.1_1', ESPNEventId: '3', Sport: 'soccer', League: 'usa.1', Completed: true
});
const soccerStats = Object.fromEntries(soccer.stats.map(row => [row.StatType, row.StatValue]));
assert.strictEqual(soccer.players.length, 1, 'Soccer roster fallback should create player');
assert.strictEqual(soccer.players[0].TeamAbbreviation, 'CHI');
assert.strictEqual(soccer.players[0].Position, 'F');
assert.strictEqual(soccerStats.goals, 1);
assert.strictEqual(soccerStats.assists, 1);
assert.strictEqual(soccerStats.shots, 4);
assert.strictEqual(soccerStats['shots-on-target'], 2);
assert.strictEqual(soccerStats['yellow-cards'], 1);
assert.strictEqual(soccerStats['passes-completed'], 22);

const propSource = fs.readFileSync(path.join(root, 'backend', 'engines', 'SportsPlayerPropEngine.js'), 'utf8');
const propContext = { console, Date, JSON, Math, Number, String, Array, Object, Boolean, isFinite };
vm.createContext(propContext);
vm.runInContext(propSource, propContext);

assert(propContext.sportsPlayerPropStatOptions_('nba', 'basketball').some(item => item[0] === 'points'));
assert(propContext.sportsPlayerPropStatOptions_('wnba', 'basketball').some(item => item[0] === 'rebounds'));
assert(propContext.sportsPlayerPropStatOptions_('nhl', 'hockey').some(item => item[0] === 'saves'));
assert(propContext.sportsPlayerPropStatOptions_('college-football', 'football').some(item => item[0] === 'passing-yards'));
assert(propContext.sportsPlayerPropStatOptions_('usa.1', 'soccer').some(item => item[0] === 'shots-on-target'));


const scoresSource = fs.readFileSync(path.join(
  root,
  'external-engines',
  'sports-scoring-engine',
  'src',
  'SportsScoresEngine.js'
), 'utf8');
[
  '"eng.2", false',
  '"ned.1", false',
  '"por.1", false',
  '"sco.1", false',
  '"bra.1", false',
  '"arg.1", false',
  '"usa.nwsl", false',
  '"eng.w.1", false',
  '"uefa.wchampions", false',
  '"fifa.wwc", false',
  '"uefa.europa.conf", false',
  '"concacaf.champions", false',
  '"conmebol.libertadores", false',
  '"conmebol.sudamericana", false',
  '"fifa.cwc", false',
  '"club.friendly", false',
  '"fifa.friendly", false'
].forEach(token => assert(scoresSource.includes(token), `Missing soccer library token: ${token}`));

const sportsFrontendSource = fs.readFileSync(path.join(root, 'frontend', 'js', 'sports.js'), 'utf8');
assert(sportsFrontendSource.includes('"soccer|usa.nwsl"'), 'NWSL frontend metadata missing');
assert(sportsFrontendSource.includes('"soccer|uefa.europa.conf"'), 'Conference League frontend metadata missing');
assert(sportsFrontendSource.includes('"soccer|conmebol.libertadores"'), 'Libertadores frontend metadata missing');
assert(sportsFrontendSource.includes('sport === "soccer"'), 'Generic soccer player support missing');

const sportsHtml = fs.readFileSync(path.join(root, 'frontend', 'sports.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'frontend', 'sw.js'), 'utf8');
assert(sportsHtml.includes('sports.js?v=329-sports-confidence-post-transport-v1216'), 'Sports page cache buster missing');
assert(serviceWorker.includes('awards-app-v264-question-mode-table-repair'), 'Service worker cache version missing');

console.log('All-league player stats tests passed.');
