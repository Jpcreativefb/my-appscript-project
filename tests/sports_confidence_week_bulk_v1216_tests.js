const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(
  path.join(root, 'backend/engines/SportsConfidenceBuilderEngine.js'),
  'utf8'
);
const sports = fs.readFileSync(
  path.join(root, 'frontend/js/sports.js'),
  'utf8'
);

assert(sports.includes('game: item.game || {}'));
assert(engine.includes('sportsConfidenceWriteBatch_'));
assert(engine.includes('normalizedStorageReplaceGameRows_'));
assert(engine.includes('sportsConfidenceScoreFromSelected_'));

function fakeSheet(headers) {
  const writes = [];
  return {
    headers,
    writes,
    getDataRange() {
      return { getValues() { return [headers.slice()]; } };
    },
    getLastRow() { return 1; },
    getRange(row, col, numRows, numCols) {
      return {
        setValues(values) {
          writes.push({ row, col, numRows, numCols, values });
          return this;
        }
      };
    },
    deleteRows() {}
  };
}

const categoryHeaders = [
  'GameId','CategoryId','Category','Nominee','NomineeId','Section',
  'QuestionType','ScoringEngine','SelectionMode','EntryType','ScoreMode',
  'OddsMode','ResultSource','SportsProvider','SportsGameId','ESPNEventId',
  'SportsLeague','SportsMarket','SportsSelection','SportsLine','HomeTeam',
  'AwayTeam','HomeRecord','AwayRecord','HomeScore','AwayScore','SportsStatus',
  'SportsState','SportsClock','SportsPeriod','LogoUrl'
];
const settingHeaders = ['GameId','CategoryId','ScoreMode','SportsGameId','ESPNEventId','LockDateTime'];
const categoriesSheet = fakeSheet(categoryHeaders);
const settingsSheet = fakeSheet(settingHeaders);

let fetchCount = 0;
const replaceCalls = [];

function headerMap(headers) {
  const map = {};
  headers.forEach((h, i) => { map[h] = i; });
  return map;
}

const context = {
  String, Array, Object, JSON, Date,
  CATEGORIES_SHEET: 'Categories',
  CATEGORY_SETTINGS_SHEET: 'CategorySettings',
  QUESTIONS_SHEET: 'Questions',
  QUESTION_OPTIONS_SHEET: 'QuestionOptions',
  QUESTIONS_HEADERS: ['GameId','QuestionId','Question'],
  QUESTION_OPTIONS_HEADERS: ['GameId','QuestionId','OptionId','Option'],
  requireAdmin_() {},
  validateGameId() {},
  getGame(gameId) {
    return {
      gameId,
      type: 'confidence',
      status: 'Setup',
      active: false,
      archived: false,
      confidenceEnabled: true
    };
  },
  getGames() { return []; },
  sportsWagerNormalizeScore_(score) { return Object.assign({}, score); },
  fetchSportsScoreForWager_() { fetchCount++; throw new Error('should not fetch per game'); },
  sportsWagerSlug_(value) {
    return String(value || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },
  normalizedStorageReadQuestionsByGame_() { return []; },
  normalizedStorageReadOptionsByGame_() { return []; },
  normalizedStorageRowsToObjects_(rows) { return Array.isArray(rows) ? rows : []; },
  normalizedStorageQuestionObject_(payload) {
    return { GameId: payload.gameId, QuestionId: payload.questionId, Question: payload.question };
  },
  normalizedStorageOptionObject_(payload) {
    return { GameId: payload.gameId, QuestionId: payload.questionId, OptionId: payload.optionId, Option: payload.option };
  },
  normalizedStorageReplaceGameRows_(sheetName, headers, entityType, gameId, objects) {
    replaceCalls.push({ sheetName, entityType, gameId, objects: objects.slice() });
    return objects.length;
  },
  normalizedStorageClearCaches_() {},
  adminCatEnsureHybridHeaders_() {},
  getCategorySettingsSheet_() { return settingsSheet; },
  getCategorySettingsColumnMap_(headers) {
    const exact = headerMap(headers);
    return {
      gameId: exact.GameId,
      categoryId: exact.CategoryId,
      scoreMode: exact.ScoreMode,
      sportsGameId: exact.SportsGameId,
      espnEventId: exact.ESPNEventId,
      lockDateTime: exact.LockDateTime
    };
  },
  validateCategorySettingsColumns_() {},
  adminCatBuildSettingsRow_(headers, col, payload) {
    const row = new Array(headers.length).fill('');
    row[col.gameId] = payload.gameId;
    row[col.categoryId] = payload.categoryId;
    row[col.scoreMode] = payload.scoreMode;
    row[col.sportsGameId] = payload.sportsGameId;
    row[col.espnEventId] = payload.espnEventId;
    row[col.lockDateTime] = payload.lockDateTime;
    return row;
  },
  getCategoriesSheet_() { return categoriesSheet; },
  getCategoriesColumnMap_(headers) {
    const exact = headerMap(headers);
    return {
      gameId: exact.GameId,
      categoryId: exact.CategoryId,
      category: exact.Category,
      nominee: exact.Nominee,
      nomineeId: exact.NomineeId,
      section: exact.Section
    };
  },
  validateCategoriesColumns_() {},
  adminCatBuildNomineeRow_(headers, col, payload) {
    const row = new Array(headers.length).fill('');
    row[col.gameId] = payload.gameId;
    row[col.categoryId] = payload.categoryId;
    row[col.category] = payload.category;
    row[col.nominee] = payload.nominee;
    row[col.nomineeId] = payload.nomineeId;
    row[col.section] = payload.section;
    return row;
  },
  sportsWagerHeaderMap_: headerMap,
  sportsWagerSetIfExists_(row, col, key, value) {
    if (col[key] !== undefined) row[col[key]] = value;
  },
  sportsWagerGetSheet_: undefined,
  adminCatClearCaches_() {},
  clearAppCaches() {},
  SpreadsheetApp: { flush() {} },
  LockService: {
    getScriptLock() {
      return { waitLock() {}, releaseLock() {} };
    }
  }
};

vm.createContext(context);
vm.runInContext(engine, context);

const selected = [];
for (let i = 1; i <= 16; i++) {
  selected.push({
    sportsGameId: 'nfl_' + (401900000 + i),
    espnEventId: String(401900000 + i),
    game: {
      GameId: 'nfl_' + (401900000 + i),
      ESPNEventId: String(401900000 + i),
      Sport: 'football',
      League: 'nfl',
      AwayTeam: 'Away Team ' + i,
      HomeTeam: 'Home Team ' + i,
      AwayLogo: 'away-' + i + '.png',
      HomeLogo: 'home-' + i + '.png',
      State: 'pre',
      Status: 'STATUS_SCHEDULED',
      Completed: false,
      GameDateTime: '2026-08-' + String(20 + (i % 4)).padStart(2, '0') + 'T17:00:00Z',
      SeasonYear: 2026,
      SeasonType: 1,
      SeasonPhase: 'PRESEASON',
      Week: 3
    }
  });
}

const result = context.apiAdminCreateSportsConfidenceQuestionsBulk({
  username: 'admin',
  token: 'token',
  awardsGameId: 'confidence-2026',
  selectedGamesJson: JSON.stringify(selected)
});

assert.strictEqual(result.success, true);
assert.strictEqual(result.createdCount, 16);
assert.strictEqual(result.duplicateCount, 0);
assert.strictEqual(result.failedCount, 0);
assert.strictEqual(fetchCount, 0, 'week snapshots must avoid one Sports HTTP fetch per game');
assert.strictEqual(categoriesSheet.writes.length, 1);
assert.strictEqual(categoriesSheet.writes[0].values.length, 32);
assert.strictEqual(settingsSheet.writes.length, 1);
assert.strictEqual(settingsSheet.writes[0].values.length, 16);
assert.strictEqual(replaceCalls.length, 2);
assert.strictEqual(replaceCalls.find(x => x.entityType === 'Questions').objects.length, 16);
assert.strictEqual(replaceCalls.find(x => x.entityType === 'QuestionOptions').objects.length, 32);

const duplicateProbe = context.sportsConfidenceBuildBatchRecords_(
  selected,
  'confidence-2026',
  {
    'sports-confidence-nfl-401900001': true,
    'sports-confidence-nfl-401900002': true,
    'sports-confidence-nfl-401900003': true
  }
);
assert.strictEqual(duplicateProbe.records.length, 13);
assert.strictEqual(duplicateProbe.duplicates.length, 3);
assert.strictEqual(duplicateProbe.failed.length, 0);

console.log('sports-confidence-week-bulk-v1216-tests: PASS');
