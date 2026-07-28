const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'backend/engines/SportsPlayerPropEngine.js'), 'utf8');

class Range {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push((this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? '');
      }
      out.push(row);
    }
    return out;
  }
  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const targetRow = this.row - 1 + r;
      while (this.sheet.rows.length <= targetRow) this.sheet.rows.push([]);
      for (let c = 0; c < values[r].length; c++) {
        this.sheet.rows[targetRow][this.col - 1 + c] = values[r][c];
      }
    }
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

const categoryHeaders = [
  'GameId','Category','CategoryId','Nominee','NomineeId','Section','ShortAnswer','Active',
  'PredictionGame','CommunityRank','QuestionType','ScoringEngine','SelectionMode','EntryType',
  'OddsMode','ResultSource','SportsProvider','SportsGameId','ESPNEventId','SportsLeague','SportsMarket',
  'SportsSelection','HomeTeam','AwayTeam','SportsStatus','SportsState','SportsClock','SportsPeriod',
  'BettingOdds','OddsSource','OddsLastUpdated','LogoUrl','SportsPlayerId','SportsPlayerName',
  'SportsStatType','SportsPropLine','SportsPropSide','SportsComparisonMode','SportsQuestionMode','SportsTieMode'
];
const settingsHeaders = [
  'GameId','CategoryId','Points','Locked','WinnerNomineeId','ChangePenalty','MaxChanges','LockDateTime',
  'DisplayOrder','GroupId','LayoutType','ShortName','CountsAsStatue','ScoreVersion','QuestionType',
  'ScoringEngine','SelectionMode','ScoreMode','OddsMode','ResultSource','SettlementStatus','SportsGameId',
  'ESPNEventId','SportsMarket','SportsLeague','WagerResultType','OddsReady','OddsSource','OddsLastUpdated',
  'VotingTypes','ResultSourceType','ResultProvider','ExternalEventId','ExternalSubjectId','StatKey',
  'ComparisonOperator','Threshold','AutoSettle','RequireAdminReview','SportsPlayerId','SportsPlayerName',
  'SportsStatType','SportsPropLine','SportsPropSide','SportsComparisonMode','SportsQuestionMode','SportsTieMode',
  'SourceConfigJSON'
];

const sheets = {
  Categories: new Sheet('Categories', categoryHeaders),
  CategorySettings: new Sheet('CategorySettings', settingsHeaders)
};
const players = {
  'nfl-1': { PlayerId: 'nfl-1', ESPNPlayerId: '1', FullName: 'Patrick Mahomes', Team: 'Kansas City Chiefs', HeadshotUrl: 'mahomes.png' },
  'nfl-2': { PlayerId: 'nfl-2', ESPNPlayerId: '2', FullName: 'Josh Allen', Team: 'Buffalo Bills', HeadshotUrl: 'allen.png' },
  'nfl-3': { PlayerId: 'nfl-3', ESPNPlayerId: '3', FullName: 'Travis Kelce', Team: 'Kansas City Chiefs', HeadshotUrl: 'kelce.png' }
};

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, isFinite,
  CATEGORIES_SHEET: 'Categories',
  CATEGORY_SETTINGS_SHEET: 'CategorySettings',
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (name) => sheets[name] || null,
      insertSheet: (name) => (sheets[name] = new Sheet(name, []))
    }),
    flush: () => {}
  },
  sportsWagerEnsureColumns_: () => ({ success: true, added: [] }),
  sportsWagerFetchJson_: (params) => {
    if (params.action === 'getSportsScores') {
      return {
        success: true,
        scores: [{
          GameId: 'nfl_123', ESPNEventId: '123', League: 'nfl', Sport: 'football',
          HomeTeam: 'Kansas City Chiefs', AwayTeam: 'Buffalo Bills',
          GameDateTime: '2026-08-01T00:00:00Z', Status: 'Scheduled', State: 'pre'
        }]
      };
    }
    if (params.action === 'getSportsPlayers') {
      const player = players[params.playerId];
      return { success: true, players: player ? [player] : [] };
    }
    if (params.action === 'getSportsPlayerGameStats') {
      return {
        success: true,
        stats: [
          { ESPNEventId: '123', PlayerId: 'nfl-1', PlayerName: 'Patrick Mahomes', StatType: 'passing-touchdowns', StatValue: 3, Completed: true },
          { ESPNEventId: '123', PlayerId: 'nfl-2', PlayerName: 'Josh Allen', StatType: 'passing-touchdowns', StatValue: 2, Completed: true },
          { ESPNEventId: '123', PlayerId: 'nfl-3', PlayerName: 'Travis Kelce', StatType: 'passing-touchdowns', StatValue: 0, Completed: true }
        ]
      };
    }
    throw new Error(`Unexpected action: ${params.action}`);
  },
  validateGameId: () => true,
  getBettingGameConfig: (gameId) => ({ enabled: gameId === 'wager-game' }),
  gameSupportsFeature: (gameId, feature) => gameId === 'prediction-game' && feature === 'prediction',
  clearAppCaches: () => {},
  sportsWagerSetCategorySettingWinnerAllMatches_: (gameId, categoryId, winnerNomineeId, wagerResultType, status) => {
    const headerMap = Object.fromEntries(settingsHeaders.map((h, i) => [h, i]));
    let updated = 0;
    for (let i = 1; i < sheets.CategorySettings.rows.length; i++) {
      const row = sheets.CategorySettings.rows[i];
      if (row[headerMap.GameId] === gameId && row[headerMap.CategoryId] === categoryId) {
        row[headerMap.Locked] = true;
        row[headerMap.WinnerNomineeId] = winnerNomineeId;
        row[headerMap.WagerResultType] = wagerResultType;
        row[headerMap.SettlementStatus] = status;
        updated++;
      }
    }
    return updated;
  },
  sportsWagerUpsertCategoryResultForSettlement_: () => ({ success: true })
};
vm.createContext(context);
vm.runInContext(source, context);

const selectedPlayers = [
  { playerId: 'nfl-1', odds: 1.8 },
  { playerId: 'nfl-2', odds: 2.1 },
  { playerId: 'nfl-3', odds: 3.25 }
];

const wagerResult = context.createSportsPlayerMatchup({
  awardsGameId: 'wager-game', sportsGameId: 'nfl_123', espnEventId: '123',
  league: 'nfl', sport: 'football', statType: 'passing-touchdowns',
  questionMode: 'wager', playersJSON: JSON.stringify(selectedPlayers)
});
if (!wagerResult.success || wagerResult.playerCount !== 3) throw new Error('Wager matchup creation failed');

const catCol = Object.fromEntries(categoryHeaders.map((h, i) => [h, i]));
const wagerRows = sheets.Categories.rows.slice(1, 4);
if (wagerRows.length !== 3) throw new Error('Expected three wager nominees');
if (!wagerRows.every((row) => row[catCol.SportsMarket] === 'player-matchup')) throw new Error('Wrong wager market');
if (wagerRows.map((row) => row[catCol.BettingOdds]).join(',') !== '1.8,2.1,3.25') throw new Error('Per-player odds were not saved');

const settingsCol = Object.fromEntries(settingsHeaders.map((h, i) => [h, i]));
const wagerSetting = sheets.CategorySettings.rows[1];
if (wagerSetting[settingsCol.ScoreMode] !== 'wager') throw new Error('Wager ScoreMode is wrong');
if (wagerSetting[settingsCol.LayoutType] !== 'wager') throw new Error('Wager LayoutType is wrong');
if (wagerSetting[settingsCol.VotingTypes] !== 'wager') throw new Error('Wager VotingTypes is wrong');

const predictionResult = context.createSportsPlayerMatchup({
  awardsGameId: 'prediction-game', sportsGameId: 'nfl_123', espnEventId: '123',
  league: 'nfl', sport: 'football', statType: 'passing-touchdowns',
  questionMode: 'prediction', points: 2, categoryName: 'Which QB throws more touchdowns?',
  playersJSON: JSON.stringify(selectedPlayers.slice(0, 2))
});
if (!predictionResult.success || predictionResult.questionMode !== 'prediction') throw new Error('Prediction matchup creation failed');

const predictionSetting = sheets.CategorySettings.rows[2];
if (predictionSetting[settingsCol.ScoreMode] !== 'correct-pick') throw new Error('Prediction ScoreMode is wrong');
if (predictionSetting[settingsCol.LayoutType] !== 'list') throw new Error('Prediction LayoutType is wrong');
if (predictionSetting[settingsCol.VotingTypes] !== 'prediction') throw new Error('Prediction VotingTypes is wrong');
if (predictionSetting[settingsCol.Points] !== 2) throw new Error('Prediction points were not saved');

const settlement = context.settleSportsPlayerMatchups({ force: true, refreshStats: false });
if (!settlement.success || settlement.settled !== 2) throw new Error('Player matchup settlement failed');
if (sheets.CategorySettings.rows[1][settingsCol.WinnerNomineeId] !== 'nfl-1') throw new Error('Wager matchup winner was not saved');
if (sheets.CategorySettings.rows[2][settingsCol.WinnerNomineeId] !== 'nfl-1') throw new Error('Prediction matchup winner was not saved');
if (sheets.CategorySettings.rows[1][settingsCol.Locked] !== true) throw new Error('Settled wager matchup was not locked');
if (sheets.CategorySettings.rows[2][settingsCol.Locked] !== true) throw new Error('Settled prediction matchup was not locked');

console.log('Sports Player Matchup creation and settlement tests passed.');
