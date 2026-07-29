const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const requireText = (text, expected, label) => {
  if (!text.includes(expected)) throw new Error(`${label}: missing ${expected}`);
};

const engine = read('backend/engines/SportsAdvancedQuestionEngine.js');
const wagerEngine = read('backend/engines/SportsWagerEngine.js');
const bridge = read('backend/engines/SportsAdminBridgeEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const frontendMirror = read('frontend/api.js');
const sportsPage = read('frontend/js/sports.js');
const sportsCss = read('frontend/css/sports.css');
const sw = read('frontend/sw.js');
const scoresEngine = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');

[
  'adminGetSportsAdvancedQuestionOptions',
  'adminCreateSportsAdvancedQuestion',
  'adminSettleSportsAdvancedQuestions',
  'adminSetupSportsAdvancedStats',
  'adminRefreshSportsAdvancedStats',
  'adminGetSportsAdvancedStatsStatus'
].forEach((action) => {
  requireText(backendApi, `"${action}"`, 'Backend API');
  requireText(frontendApi, `"${action}"`, 'Frontend API');
  requireText(frontendMirror, `"${action}"`, 'Frontend API mirror');
});

[
  'function createSportsAdvancedQuestion(payload)',
  'function settleSportsAdvancedQuestions(payload)',
  'function settleSportsAdvancedQuestionsForAllGames_(payload)',
  'SportsEntityConfigJSON',
  'EXACT_BOUNDARY_REQUIRED',
  'review-if-imprecise',
  '["goals", "Goals"]',
  '["three-pointers-made", "Three-pointers Made"]'
].forEach((expected) => requireText(engine, expected, 'Advanced question engine'));

[
  'refreshSportsAdvancedStatsAdmin',
  'getSportsAdvancedStatsStatusAdmin'
].forEach((expected) => requireText(bridge, expected, 'Sports admin bridge'));

[
  'market === "sports-stat-question"',
  'settleSportsAdvancedQuestions({',
  'settleSportsAdvancedQuestionsForAllGames_({'
].forEach((expected) => requireText(wagerEngine, expected, 'Sports wager integration'));

[
  'Create Stat Comparison',
  'data-create-advanced-question-game-id',
  'function showSportsAdvancedQuestionModal_',
  'function createSportsAdvancedQuestionFromCard',
  'players or teams from any loaded',
  'Checkpoint questions auto-settle only when an exact boundary snapshot was captured'
].forEach((expected) => requireText(sportsPage, expected, 'Sports page'));

requireText(scoresEngine, 'HomeConferenceName', 'Sports Scores college metadata');
requireText(scoresEngine, 'AwayConferenceName', 'Sports Scores college metadata');
requireText(scoresEngine, 'HomeAbbreviation', 'Sports Scores team abbreviation metadata');
requireText(sportsCss, '.sports-advanced-question-modal', 'Sports CSS');
requireText(sw, 'awards-app-v240-all-league-player-stats', 'Service worker cache');

class Range {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet; this.row = row; this.col = col; this.numRows = numRows; this.numCols = numCols;
  }
  getValues() {
    return Array.from({ length: this.numRows }, (_, r) =>
      Array.from({ length: this.numCols }, (_, c) =>
        ((this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? '')
      )
    );
  }
  setValues(values) {
    values.forEach((row, r) => {
      const target = this.row - 1 + r;
      while (this.sheet.rows.length <= target) this.sheet.rows.push([]);
      row.forEach((value, c) => { this.sheet.rows[target][this.col - 1 + c] = value; });
    });
    return this;
  }
  setValue(value) { return this.setValues([[value]]); }
}
class Sheet {
  constructor(name, headers) { this.name = name; this.rows = [headers.slice()]; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map((row) => row.length)); }
  getRange(row, col, numRows = 1, numCols = 1) { return new Range(this, row, col, numRows, numCols); }
  getDataRange() { return new Range(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() {}
}

const commonHeaders = [
  'SportsEntityType','SportsEntityId','SportsEntityName','SportsEntityGameId','SportsEntityEventId',
  'SportsEntityTeamId','SportsQuestionKind','SportsCheckpointType','SportsCheckpointLabel',
  'SportsCheckpointPrecision','SportsComparisonOperator','SportsThreshold','SportsEntityConfigJSON',
  'SportsPlayerId','SportsPlayerName','SportsStatType','SportsComparisonMode','SportsQuestionMode','SportsTieMode'
];
const categoryHeaders = [
  'GameId','Category','CategoryId','Nominee','NomineeId','Section','ShortAnswer','Active','PredictionGame',
  'CommunityRank','QuestionType','ScoringEngine','SelectionMode','EntryType','OddsMode','ResultSource',
  'SportsProvider','SportsGameId','ESPNEventId','SportsLeague','SportsMarket','SportsSelection','HomeTeam',
  'AwayTeam','BettingOdds','OddsSource','OddsLastUpdated','LogoUrl', ...commonHeaders
];
const settingsHeaders = [
  'GameId','CategoryId','Points','Locked','WinnerNomineeId','ChangePenalty','MaxChanges','LockDateTime',
  'DisplayOrder','GroupId','LayoutType','ShortName','CountsAsStatue','ScoreVersion','QuestionType',
  'ScoringEngine','SelectionMode','ScoreMode','OddsMode','ResultSource','SettlementStatus','SportsGameId',
  'ESPNEventId','SportsMarket','SportsLeague','WagerResultType','AutoSettle','RequireAdminReview',
  'SourceConfigJSON','Notes', ...commonHeaders
];
const sheets = {
  Categories: new Sheet('Categories', categoryHeaders),
  CategorySettings: new Sheet('CategorySettings', settingsHeaders)
};

const games = {
  'mlb_1': {
    GameId: 'mlb_1', ESPNEventId: '1', League: 'mlb', Sport: 'baseball',
    AwayTeamId: '10', AwayTeam: 'New York Yankees', HomeTeamId: '20', HomeTeam: 'Boston Red Sox',
    AwayLogo: 'nyy.png', HomeLogo: 'bos.png', GameDateTime: '2026-08-01T18:00:00Z'
  },
  'mlb_2': {
    GameId: 'mlb_2', ESPNEventId: '2', League: 'mlb', Sport: 'baseball',
    AwayTeamId: '30', AwayTeam: 'Chicago Cubs', HomeTeamId: '40', HomeTeam: 'St. Louis Cardinals',
    AwayLogo: 'chc.png', HomeLogo: 'stl.png', GameDateTime: '2026-08-01T20:00:00Z'
  }
};
const players = {
  'mlb-judge': {
    PlayerId: 'mlb-judge', ESPNPlayerId: 'judge', FullName: 'Aaron Judge', TeamId: '10',
    Team: 'New York Yankees', HeadshotUrl: 'judge.png'
  }
};

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, isFinite,
  CATEGORIES_SHEET: 'Categories', CATEGORY_SETTINGS_SHEET: 'CategorySettings',
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (name) => sheets[name] || null,
      insertSheet: (name) => (sheets[name] = new Sheet(name, []))
    }),
    flush: () => {}
  },
  sportsWagerEnsureColumns_: () => ({ success: true, added: [] }),
  sportsPlayerPropStatOptions_: () => [
    ['hits', 'Hits'], ['home-runs', 'Home Runs'], ['runs', 'Runs'], ['strikeouts', 'Strikeouts']
  ],
  sportsPlayerPropLeagueSport_: () => ({ league: 'mlb', sport: 'baseball' }),
  sportsPlayerPropGetGame_: (gameId, eventId) => {
    const game = games[gameId] || Object.values(games).find((item) => item.ESPNEventId === String(eventId));
    if (!game) throw new Error('Game not found');
    return game;
  },
  sportsPlayerPropGetPlayer_: (playerId) => {
    const player = players[playerId];
    if (!player) throw new Error('Player not found');
    return player;
  },
  sportsPlayerPropTeamMatchesGame_: (player, game) => [game.HomeTeamId, game.AwayTeamId].includes(player.TeamId),
  sportsPlayerPropRequireWagerGame_: () => ({ enabled: true }),
  sportsPlayerMatchupRequirePredictionGame_: () => true,
  sportsPlayerPropCategoryExists_: () => false,
  sportsPlayerPropFetch_: (params) => {
    if (params.action === 'getSportsPlayerGameStats') {
      return { success: true, stats: [{ PlayerId: 'mlb-judge', StatType: 'hits', StatValue: 2, Completed: true, LastUpdated: new Date() }] };
    }
    if (params.action === 'getSportsTeamGameStats') {
      return { success: true, stats: [{ TeamId: '40', StatType: 'hits', StatValue: 8, Completed: true, LastUpdated: new Date() }] };
    }
    if (params.action === 'getSportsStatCheckpoints') {
      return {
        success: true,
        checkpoints: [{ EntityId: 'mlb-judge', StatType: 'hits', StatValue: 1, Precision: 'EXACT_BOUNDARY', CapturedAt: new Date() }]
      };
    }
    throw new Error(`Unexpected action ${params.action}`);
  },
  clearAppCaches: () => {},
  validateGameId: () => true,
  sportsWagerSetCategorySettingWinnerAllMatches_: (gameId, categoryId, winner, resultType, status) => {
    const col = Object.fromEntries(settingsHeaders.map((h, i) => [h, i]));
    let updated = 0;
    for (let i = 1; i < sheets.CategorySettings.rows.length; i++) {
      const row = sheets.CategorySettings.rows[i];
      if (row[col.GameId] === gameId && row[col.CategoryId] === categoryId) {
        row[col.Locked] = true; row[col.WinnerNomineeId] = winner;
        row[col.WagerResultType] = resultType; row[col.SettlementStatus] = status; updated++;
      }
    }
    return updated;
  },
  sportsWagerUpsertCategoryResultForSettlement_: () => ({ success: true })
};
vm.createContext(context);
vm.runInContext(engine, context);

const comparison = context.createSportsAdvancedQuestion({
  awardsGameId: 'wager-game', questionMode: 'wager', questionKind: 'highest',
  statType: 'hits', checkpointType: 'FINAL',
  entitiesJSON: JSON.stringify([
    { entityType: 'PLAYER', entityId: 'mlb-judge', sportsGameId: 'mlb_1', espnEventId: '1', odds: 1.8 },
    { entityType: 'TEAM', entityId: '40', entityName: 'St. Louis Cardinals', teamId: '40', sportsGameId: 'mlb_2', espnEventId: '2', odds: 2.1 }
  ])
});
assert(comparison.success && comparison.entityCount === 2, 'Cross-game player/team comparison creation failed');
assert(comparison.expectedSheet === 'Bets', 'Wager comparison should write to Bets');

const threshold = context.createSportsAdvancedQuestion({
  awardsGameId: 'prediction-game', questionMode: 'prediction', questionKind: 'threshold',
  statType: 'hits', checkpointType: 'END_INNING_3', operator: 'gte', threshold: 1,
  entitiesJSON: JSON.stringify([
    { entityType: 'PLAYER', entityId: 'mlb-judge', sportsGameId: 'mlb_1', espnEventId: '1' }
  ])
});
assert(threshold.success && threshold.expectedSheet === 'Picks', 'Checkpoint threshold creation failed');

const settle = context.settleSportsAdvancedQuestions({ force: true, refreshStats: false });
assert(settle.settled === 2, 'Advanced sports questions did not settle');
const settingsCol = Object.fromEntries(settingsHeaders.map((h, i) => [h, i]));
const comparisonSetting = sheets.CategorySettings.rows[1];
const thresholdSetting = sheets.CategorySettings.rows[2];
assert(comparisonSetting[settingsCol.WinnerNomineeId].includes('team-40-2'), 'Team should win cross-game hits comparison');
assert(thresholdSetting[settingsCol.WinnerNomineeId] === 'yes', 'Player hit checkpoint should resolve Yes');

const tie = context.sportsAdvancedQuestionResolve_({ questionKind: 'highest' }, [
  { nomineeId: 'a', value: 2 }, { nomineeId: 'b', value: 2 }
]);
assert(tie.tied && tie.winnerNomineeId === 'push', 'Tie should resolve to push');
assert(context.sportsAdvancedQuestionThresholdPasses_(1, 'gte', 1), 'Threshold gte failed');

console.log('Sports Advanced Questions integration tests passed.');
