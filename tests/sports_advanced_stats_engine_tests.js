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


const nhlRows = context.sportsAdvancedNormalizeTeamStats_(
  {
    boxscore: {
      teams: [{
        team: { id: '55', displayName: 'Chicago Blackhawks' },
        statistics: [
          { name: 'shotsOnGoal', displayValue: '31', value: 31 },
          { name: 'powerPlayGoals', displayValue: '2-5' },
          { name: 'blockedShots', displayValue: '14', value: 14 }
        ]
      }]
    }
  },
  {
    GameId: 'nhl_1', ESPNEventId: '21', Sport: 'hockey', League: 'nhl',
    AwayTeamId: '55', AwayTeam: 'Chicago Blackhawks', AwayScore: 4,
    HomeTeamId: '66', HomeTeam: 'Detroit Red Wings', HomeScore: 2, Completed: true
  }
);
assert(nhlRows.some((row) => row.TeamId === '55' && row.StatType === 'goals' && row.StatValue === 4), 'NHL derived goals missing');
assert(nhlRows.some((row) => row.TeamId === '55' && row.StatType === 'shots-on-goal' && row.StatValue === 31), 'NHL shots on goal missing');
assert(nhlRows.some((row) => row.TeamId === '55' && row.StatType === 'power-play-goals' && row.StatValue === 2), 'NHL power-play goals missing');

const basketballRows = context.sportsAdvancedNormalizeTeamStats_(
  {
    boxscore: {
      teams: [{
        team: { id: '77', displayName: 'Chicago Bulls' },
        statistics: [
          { name: 'fieldGoalsMade', displayValue: '40-85' },
          { name: 'rebounds', displayValue: '46', value: 46 },
          { name: 'assists', displayValue: '27', value: 27 }
        ]
      }]
    }
  },
  {
    GameId: 'nba_1', ESPNEventId: '31', Sport: 'basketball', League: 'nba',
    AwayTeamId: '77', AwayTeam: 'Chicago Bulls', AwayScore: 112,
    HomeTeamId: '88', HomeTeam: 'Milwaukee Bucks', HomeScore: 109, Completed: true
  }
);
assert(basketballRows.some((row) => row.TeamId === '77' && row.StatType === 'points' && row.StatValue === 112), 'Basketball derived points missing');
assert(basketballRows.some((row) => row.TeamId === '77' && row.StatType === 'field-goals-made' && row.StatValue === 40), 'Basketball field goals made missing');
assert(basketballRows.some((row) => row.TeamId === '77' && row.StatType === 'rebounds' && row.StatValue === 46), 'Basketball rebounds missing');

const soccerRows = context.sportsAdvancedNormalizeTeamStats_(
  {
    boxscore: {
      teams: [{
        team: { id: '99', displayName: 'Chicago Fire FC' },
        statistics: [
          { name: 'totalShots', displayValue: '12', value: 12 },
          { name: 'shotsOnTarget', displayValue: '5', value: 5 },
          { name: 'possessionPct', displayValue: '58%', value: 58 },
          { name: 'wonCorners', displayValue: '7', value: 7 },
          { name: 'yellowCards', displayValue: '2', value: 2 }
        ]
      }]
    }
  },
  {
    GameId: 'soccer_1', ESPNEventId: '41', Sport: 'soccer', League: 'usa.1',
    AwayTeamId: '99', AwayTeam: 'Chicago Fire FC', AwayScore: 2,
    HomeTeamId: '100', HomeTeam: 'Columbus Crew', HomeScore: 1, Completed: true
  }
);
assert(soccerRows.some((row) => row.TeamId === '99' && row.StatType === 'goals' && row.StatValue === 2), 'Soccer derived goals missing');
assert(soccerRows.some((row) => row.TeamId === '99' && row.StatType === 'shots' && row.StatValue === 12), 'Soccer shots missing');
assert(soccerRows.some((row) => row.TeamId === '99' && row.StatType === 'shots-on-target' && row.StatValue === 5), 'Soccer shots on target missing');
assert(soccerRows.some((row) => row.TeamId === '99' && row.StatType === 'possession-percentage' && row.StatValue === 58), 'Soccer possession missing');
assert(soccerRows.some((row) => row.TeamId === '99' && row.StatType === 'corner-kicks' && row.StatValue === 7), 'Soccer corners missing');
assert(soccerRows.some((row) => row.TeamId === '99' && row.StatType === 'yellow-cards' && row.StatValue === 2), 'Soccer yellow cards missing');

const baseballDefinitions = context.sportsAdvancedCheckpointDefinitions_({ Sport: 'baseball' });
assert(baseballDefinitions.some((item) => item.type === 'END_INNING_3'), 'MLB inning checkpoint missing');
const footballDefinitions = context.sportsAdvancedCheckpointDefinitions_({ Sport: 'football' });
assert(footballDefinitions.some((item) => item.type === 'FIRST_HALF_2MIN'), 'NFL two-minute checkpoint missing');
const twoMinute = footballDefinitions.find((item) => item.type === 'FIRST_HALF_2MIN');
assert(twoMinute.reached({ Period: 2, Clock: '1:59', Completed: false }), 'Two-minute checkpoint not reached');
assert(twoMinute.exact({ Period: 2, Clock: '2:00' }), 'Exact two-minute checkpoint not detected');
assert(context.sportsAdvancedSelectCurrentCheckpoint_({ Sport: 'football', Completed: true }, footballDefinitions, {}) === null, 'Completed game should not select a checkpoint');

console.log('Sports Advanced Stats Engine tests passed.');
