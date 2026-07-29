const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(
  root,
  'external-engines',
  'sports-scoring-engine',
  'src',
  'SportsAdvancedStatsEngine.js'
);
const source = fs.readFileSync(sourcePath, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const context = { console, Date, JSON, Math, Number, String, Array, Object, isFinite };
vm.createContext(context);
vm.runInContext(source, context);

const mlbRows = context.sportsAdvancedNormalizeTeamStats_(
  {
    boxscore: {
      teams: [{
        team: { id: '10', displayName: 'New York Yankees' },
        statistics: [
          { name: 'hits', displayValue: '7', value: 7 },
          { name: 'homeRuns', displayValue: '2', value: 2 }
        ]
      }]
    }
  },
  {
    GameId: 'mlb_1', ESPNEventId: '1', Sport: 'baseball', League: 'mlb',
    AwayTeamId: '10', AwayTeam: 'New York Yankees', AwayScore: 4,
    HomeTeamId: '20', HomeTeam: 'Boston Red Sox', HomeScore: 3, Completed: true
  }
);
assert(mlbRows.some((row) => row.TeamId === '10' && row.StatType === 'hits' && row.StatValue === 7), 'MLB team hits missing');
assert(mlbRows.some((row) => row.TeamId === '10' && row.StatType === 'home-runs' && row.StatValue === 2), 'MLB team home runs missing');
assert(mlbRows.some((row) => row.TeamId === '10' && row.StatType === 'runs' && row.StatValue === 4), 'MLB derived runs missing');

const nflRows = context.sportsAdvancedNormalizeTeamStats_(
  {
    boxscore: { teams: [] },
    scoringPlays: [
      { text: 'Touchdown', team: { id: '1' } },
      { type: { text: 'Touchdown' }, team: { id: '1' } },
      { text: 'Field Goal', team: { id: '2' } }
    ]
  },
  {
    GameId: 'nfl_1', ESPNEventId: '11', Sport: 'football', League: 'nfl',
    AwayTeamId: '1', AwayTeam: 'Kansas City Chiefs', AwayScore: 14,
    HomeTeamId: '2', HomeTeam: 'Buffalo Bills', HomeScore: 3, Completed: false
  }
);
assert(nflRows.some((row) => row.TeamId === '1' && row.StatType === 'touchdowns' && row.StatValue === 2), 'NFL derived touchdowns missing');
assert(nflRows.some((row) => row.TeamId === '2' && row.StatType === 'points' && row.StatValue === 3), 'NFL derived points missing');

const baseballDefinitions = context.sportsAdvancedCheckpointDefinitions_({ Sport: 'baseball' });
assert(baseballDefinitions.some((item) => item.type === 'END_INNING_3'), 'MLB inning checkpoint missing');
const footballDefinitions = context.sportsAdvancedCheckpointDefinitions_({ Sport: 'football' });
assert(footballDefinitions.some((item) => item.type === 'FIRST_HALF_2MIN'), 'NFL two-minute checkpoint missing');
const twoMinute = footballDefinitions.find((item) => item.type === 'FIRST_HALF_2MIN');
assert(twoMinute.reached({ Period: 2, Clock: '1:59', Completed: false }), 'Two-minute checkpoint not reached');
assert(twoMinute.exact({ Period: 2, Clock: '2:00' }), 'Exact two-minute checkpoint not detected');

console.log('Sports Advanced Stats Engine tests passed.');
