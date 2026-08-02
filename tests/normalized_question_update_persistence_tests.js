const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'backend/engines/NormalizedQuestionStorageEngine.js'),
  'utf8'
);

const context = {
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

vm.createContext(context);
vm.runInContext(source, context);

const existingQuestion = {
  GameId: 'stake-test',
  QuestionId: 'question-1',
  Question: 'Original question',
  Section: 'Original section',
  CategoryImage: 'old-image',
  Active: true,
  PredictionGame: true,
  CommunityRank: false,
  QuestionType: 'award-single-winner',
  ScoringEngine: 'manual',
  SelectionMode: 'single',
  EntryType: '',
  OddsMode: 'none',
  ResultSource: 'manual',
  SportsLeague: '',
  SportsGameId: '',
  ESPNEventId: '',
  PayloadJSON: '{}',
  SourceSystem: 'admin-normalized',
  CreatedAt: new Date('2026-01-01T00:00:00Z')
};

const updatedQuestion = context.normalizedStorageQuestionObject_({
  gameId: 'stake-test',
  categoryId: 'question-1',
  category: 'Original question 2',
  section: 'Updated section',
  categoryImage: 'new-image',
  active: false,
  predictionGame: false,
  communityRank: true,
  questionType: 'sports-prop',
  scoringEngine: 'sports',
  selectionMode: 'multiple',
  entryType: 'stake',
  oddsMode: 'american',
  resultSource: 'espn',
  sportsLeague: 'nfl',
  sportsGameId: 'sports-123',
  espnEventId: 'espn-456'
}, existingQuestion);

assert.strictEqual(updatedQuestion.Question, 'Original question 2');
assert.strictEqual(updatedQuestion.Section, 'Updated section');
assert.strictEqual(updatedQuestion.CategoryImage, 'new-image');
assert.strictEqual(updatedQuestion.Active, false);
assert.strictEqual(updatedQuestion.PredictionGame, false);
assert.strictEqual(updatedQuestion.CommunityRank, true);
assert.strictEqual(updatedQuestion.QuestionType, 'sports-prop');
assert.strictEqual(updatedQuestion.ScoringEngine, 'sports');
assert.strictEqual(updatedQuestion.SelectionMode, 'multiple');
assert.strictEqual(updatedQuestion.EntryType, 'stake');
assert.strictEqual(updatedQuestion.OddsMode, 'american');
assert.strictEqual(updatedQuestion.ResultSource, 'espn');
assert.strictEqual(updatedQuestion.SportsLeague, 'nfl');
assert.strictEqual(updatedQuestion.SportsGameId, 'sports-123');
assert.strictEqual(updatedQuestion.ESPNEventId, 'espn-456');

const existingOption = {
  GameId: 'stake-test',
  QuestionId: 'question-1',
  OptionId: 'answer-1',
  Option: 'Original answer',
  ShortAnswer: 'Original',
  FileID: 'old-file',
  Active: true,
  DisplayOrder: 1,
  PayloadJSON: '{}',
  SourceSystem: 'admin-normalized',
  CreatedAt: new Date('2026-01-01T00:00:00Z')
};

const updatedOption = context.normalizedStorageOptionObject_({
  gameId: 'stake-test',
  categoryId: 'question-1',
  nomineeId: 'answer-1',
  nominee: 'Updated answer',
  shortAnswer: 'Updated',
  fileId: 'new-file',
  active: false,
  displayOrder: 9
}, existingOption);

assert.strictEqual(updatedOption.Option, 'Updated answer');
assert.strictEqual(updatedOption.ShortAnswer, 'Updated');
assert.strictEqual(updatedOption.FileID, 'new-file');
assert.strictEqual(updatedOption.Active, false);
assert.strictEqual(updatedOption.DisplayOrder, 9);

console.log('normalized-question-update-persistence-tests: PASS');
