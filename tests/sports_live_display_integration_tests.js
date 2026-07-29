const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const backend = read('backend/engines/SportsLiveDisplayEngine.js');
const api = read('backend/Api.js');
const sports = read('frontend/js/sports.js');
const betting = read('frontend/js/pages/betting.js');
const sportsCss = read('frontend/css/sports.css');
const bettingCss = read('frontend/css/betting.css');
const sw = read('frontend/sw.js');

assert(api.includes('getSportsGameDetails'));
assert(api.includes('getSportsLiveQuestionStatus'));
assert(sports.includes('Create Stat Comparison'));
assert(!sports.includes('${renderCreatePlayerMatchupButton(game)}'));
assert(sports.includes('sportsHelpButton_'));
assert(sports.includes('sportsAdvancedDivisionSelect'));
assert(sports.includes('Select Loaded Teams'));
assert(sports.includes('getSportsGameDetails'));
assert(betting.includes('getSportsLiveQuestionStatus'));
assert(betting.includes('renderBettingLiveStatTracker_'));
assert(betting.includes('renderBettingStartingPitchers_'));
assert(sportsCss.includes('.sports-help-popover'));
assert(sportsCss.includes('.sports-starters'));
assert(bettingCss.includes('.betting-live-stat-panel'));
assert(sw.includes('awards-app-v250-standalone-stat-comparison'));

const context = {
  console,
  Date,
  JSON,
  Math,
  isFinite,
  encodeURIComponent,
  decodeURIComponent
};
vm.createContext(context);
vm.runInContext(backend, context);

const advancedSetting = {
  sportsMarket: 'sports-stat-question',
  sportsLeague: 'mlb',
  sourceConfigJSON: JSON.stringify({
    questionKind: 'highest',
    questionMode: 'wager',
    statType: 'runs',
    checkpointType: 'FINAL',
    entities: [
      {
        nomineeId: 'cubs',
        entityType: 'TEAM',
        entityId: '16',
        entityName: 'Chicago Cubs',
        teamId: '16',
        espnEventId: 'game-cubs'
      },
      {
        nomineeId: 'white-sox',
        entityType: 'TEAM',
        entityId: '4',
        entityName: 'Chicago White Sox',
        teamId: '4',
        espnEventId: 'game-sox'
      }
    ]
  })
};

const tracker = context.sportsLiveDisplayNormalizeTracker_('chicago-runs', advancedSetting);
const finalized = context.sportsLiveDisplayFinalizeTracker_(tracker, {
  'game-cubs': {
    score: {
      ESPNEventId: 'game-cubs',
      League: 'mlb',
      AwayTeam: 'St. Louis Cardinals',
      AwayScore: 2,
      HomeTeam: 'Chicago Cubs',
      HomeTeamId: '16',
      HomeScore: 5,
      Status: 'In Progress',
      State: 'in',
      Clock: 'Bottom 7th',
      Completed: false
    },
    teamStats: [],
    playerStats: [],
    errors: []
  },
  'game-sox': {
    score: {
      ESPNEventId: 'game-sox',
      League: 'mlb',
      AwayTeam: 'Chicago White Sox',
      AwayTeamId: '4',
      AwayScore: 3,
      HomeTeam: 'Milwaukee Brewers',
      HomeScore: 1,
      Status: 'In Progress',
      State: 'in',
      Clock: 'Top 6th',
      Completed: false
    },
    teamStats: [],
    playerStats: [],
    errors: []
  }
});

assert.strictEqual(finalized.entities[0].value, 5);
assert.strictEqual(finalized.entities[1].value, 3);
assert.deepStrictEqual(Array.from(finalized.leaderNomineeIds), ['cubs']);
assert(finalized.currentResult.includes('Chicago Cubs'));
assert.strictEqual(finalized.state, 'live');

const propTracker = context.sportsLiveDisplayNormalizeTracker_('pitcher-k-prop', {
  sportsMarket: 'player-prop',
  sourceConfigJSON: JSON.stringify({
    playerId: 'p1',
    playerName: 'Test Pitcher',
    statType: 'strikeouts',
    line: 5.5,
    espnEventId: 'game-pitcher'
  })
});

const propFinalized = context.sportsLiveDisplayFinalizeTracker_(propTracker, {
  'game-pitcher': {
    score: { Status: 'In Progress', State: 'in', Clock: 'Top 6th', Completed: false },
    teamStats: [],
    playerStats: [{
      PlayerId: 'p1',
      PlayerName: 'Test Pitcher',
      StatType: 'strikeouts',
      StatValue: 7,
      Completed: false
    }],
    errors: []
  }
});
assert.strictEqual(propFinalized.currentValue, 7);
assert.strictEqual(propFinalized.currentResult, 'Over is currently ahead');

const summary = {
  header: {
    competitions: [{
      competitors: [
        {
          homeAway: 'away',
          team: { id: '1', displayName: 'Away Club' },
          probables: [{ athlete: { id: 'ap', displayName: 'Away Probable' } }]
        },
        {
          homeAway: 'home',
          team: { id: '2', displayName: 'Home Club' },
          probables: [{ athlete: { id: 'hp', displayName: 'Home Probable' } }]
        }
      ]
    }]
  },
  boxscore: {
    players: [{
      team: { id: '2', displayName: 'Home Club' },
      statistics: [{
        name: 'pitching',
        labels: ['IP', 'H', 'ER', 'BB', 'K'],
        athletes: [{
          starter: true,
          athlete: { id: 'hs', displayName: 'Home Starter' },
          stats: ['5.0', '4', '1', '2', '7']
        }]
      }]
    }]
  }
};

const details = context.sportsLiveDisplayParseGameSummary_('event-1', summary);
assert.strictEqual(details.awayStarter.name, 'Away Probable');
assert.strictEqual(details.awayStarter.confirmed, false);
assert.strictEqual(details.homeStarter.name, 'Home Starter');
assert.strictEqual(details.homeStarter.confirmed, true);
assert(details.homeStarter.statLine.includes('7 K'));

console.log('Sports live display integration tests passed.');
