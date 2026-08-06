const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const seasonSource = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const questionSource = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const normalizedSource = fs.readFileSync(path.join(root, 'backend/engines/NormalizedQuestionStorageEngine.js'), 'utf8');

assert(questionSource.includes('function realityTvMaterializeEpisodeQuestionPackBulk_'), 'Bulk episode question materializer is missing');
assert(questionSource.includes('function realityTvQuestionAnswerContext_'), 'Roster and group answer context must be compiled once');
assert(questionSource.includes('normalizedStorageUpsertOptionsBulk_(normalizedOptions)'), 'Answers must be written through one normalized bulk operation');
assert(questionSource.includes('legacyNomineeRows.length'), 'Legacy answer projection must be appended as one batch');
assert(questionSource.includes('realityTvBulkUpsertCategorySettings_(settingsPayloads)'), 'Question settings must be written as one batch');
assert(questionSource.includes('realityTvBulkUpsertObjects_(\n      ss,\n      REALITY_TV_EPISODE_QUESTIONS_SHEET'), 'Episode-question links must be bulk-upserted');
assert(seasonSource.includes('realityTvMaterializeEpisodeQuestionPackBulk_(season, nextEpisode'), 'Approval must use the bulk materializer');
assert(!seasonSource.includes('realityTvAdvanceQuestionPackBuild_(questionBuild, 1, 8000'), 'Approval must not use the old one-question worker');
assert(seasonSource.includes('expected === "BUILDING EXTRA QUESTIONS"'), 'Bulk checkpoints must remain owned by the active approval');
assert(seasonSource.includes('"COMPILING QUESTION PACK",\n      "WRITING QUESTION PACK",\n      "VERIFYING QUESTION PACK"'), 'Bulk checkpoint statuses must count as active processing');
assert(seasonSource.includes('realityTvSpreadsheetRetry_("Materialize Reality TV Extra Questions in bulk"'), 'Bulk materialization must retry transient Sheets and lock failures');
['COMPILING QUESTION PACK', 'WRITING QUESTION PACK', 'VERIFYING QUESTION PACK'].forEach(status => {
  assert(seasonSource.includes(`"${status}"`), `Approval progress checkpoint missing: ${status}`);
});

const calls = { bulkObjects: [], options: 0, settings: 0, categoryRows: 0, checkpoints: [] };
const categoryHeaders = ['GameId','Category','CategoryId','Nominee','NomineeId','Section','FileId','ShortAnswer','CategoryImage','MovieId','Movie','Person','Active','PredictionGame','CommunityRank'];
const categorySheet = {
  values: [categoryHeaders],
  getDataRange() { return { getValues: () => this.values.map(row => row.slice()) }; },
  getLastRow() { return this.values.length; },
  getRange(row, col, rows, cols) {
    return {
      setValues: values => {
        calls.categoryRows += values.length;
        values.forEach(value => this.values.push(value.slice()));
      }
    };
  }
};

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  Utilities: { getUuid: () => 'uuid-1' },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
  LockService: {
    getDocumentLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
    getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} })
  },
  SpreadsheetApp: { getActive: () => ({}), flush: () => {} },
  Session: { getScriptTimeZone: () => 'America/Chicago' }
};
vm.createContext(context);
vm.runInContext(normalizedSource, context);
vm.runInContext(seasonSource, context);
vm.runInContext(questionSource, context);

context.realityTvEnsureQuestionPackSystem_ = () => {};
context.realityTvQuestionTemplatesForSeason_ = () => [
  { TemplateId: 'winner', QuestionType: 'winner', QuestionTemplate: 'Who wins {period} {episode}?', AnswerSource: 'active-participants', Points: 10, Enabled: true, DisplayOrder: 20, Label: 'Winner', ResultKey: 'winner', IncludeNoOutcome: false, LayoutType: 'text', ImageSource: 'none' },
  { TemplateId: 'yes-no', QuestionType: 'yes-no', QuestionTemplate: 'Will it happen?', AnswerSource: 'yes-no', Points: 5, Enabled: true, DisplayOrder: 30, Label: 'Yes or No', ResultKey: 'yes-no', IncludeNoOutcome: false, LayoutType: 'text', ImageSource: 'none' }
];
context.realityTvQuestionAnswerContext_ = () => ({
  groups: [],
  contestants: [
    { id: 'a', label: 'A', imageUrl: '', subjectType: 'contestant', externalSubjectId: 'a' },
    { id: 'b', label: 'B', imageUrl: '', subjectType: 'contestant', externalSubjectId: 'b' }
  ]
});
context.realityTvEpisodeQuestionsForSeason_ = () => [];
context.normalizedStorageGetQuestionSetup_ = () => ({ questions: [], options: [] });
context.normalizedStorageQuestionObject_ = payload => ({ GameId: payload.gameId, QuestionId: payload.questionId, Question: payload.question });
context.normalizedStorageOptionObject_ = payload => ({ GameId: payload.gameId, QuestionId: payload.questionId, OptionId: payload.optionId, Option: payload.option });
context.normalizedStorageUpsertOptionsBulk_ = rows => { calls.options += rows.length; return rows; };
context.normalizedStorageRebuildIndexForSheet_ = () => {};
context.normalizedStorageClearCaches_ = () => {};
context.getCategoriesSheet_ = () => categorySheet;
context.getCategorySettingsSheet_ = () => ({});
context.getCategoriesColumnMap_ = () => ({ gameId:0, category:1, categoryId:2, nominee:3, nomineeId:4, section:5, fileId:6, shortAnswer:7, categoryImage:8, movieId:9, movie:10, person:11, active:12, predictionGame:13, communityRank:14 });
context.validateCategoriesColumns_ = () => {};
context.adminCatNormalizeGameId_ = value => String(value || '').trim();
context.adminCatNormalizeId_ = value => String(value || '').trim().toLowerCase();
context.adminCatBuildNomineeRow_ = (headers, col, payload) => [payload.gameId,payload.category,payload.categoryId,payload.nominee,payload.nomineeId,payload.section,'',payload.shortAnswer,'','','',payload.person,true,true,false];
context.adminCatBuildSettingsRow_ = () => [];
context.adminCatFindSettingsRows_ = () => [];
context.adminCatValidateQuestionSettingsPayload_ = () => {};
context.adminCatEnsureHybridHeaders_ = () => {};
context.realityTvBulkUpsertCategorySettings_ = payloads => { calls.settings += payloads.length; return { total: payloads.length }; };
context.realityTvBulkUpsertObjects_ = (ss, sheet, headers, keys, rows) => { calls.bulkObjects.push({ sheet, count: rows.length }); return { total: rows.length }; };
context.realityTvFinalizeBulkQuestionBuildJob_ = (season, episode, ids) => ({ buildId: 'bulk-build', complete: true, currentIndex: ids.length, totalCount: ids.length });
context.adminCatClearCaches_ = () => {};
context.realityTvClearRuntimeCaches_ = () => {};
context.realityTvPickRules_ = () => ({ maxChanges: 1, changePenalty: 0 });
context.realityTvNormalizeLayoutType_ = value => value || 'text';
context.realityTvNormalizeImageSource_ = value => value || 'none';

const result = context.realityTvMaterializeEpisodeQuestionPackBulk_(
  { SeasonId:'s1', GameId:'g1', PeriodLabel:'Episode', Points:10, ParticipantType:'contestant', ShowFormat:'cooking', CurrentEpisodeNumber:2, PickChangesAllowed:true, MaxPickChanges:1, PickChangePenalty:0 },
  { EpisodeId:'e2', EpisodeNumber:2, LockDateTime:new Date(), ExternalEventId:'event-2' },
  { managedBy:'APPROVAL', checkpoint: status => calls.checkpoints.push(status) }
);

assert.strictEqual(result.complete, true);
assert.strictEqual(result.built, 2);
assert.strictEqual(result.totalCount, 2);
assert.strictEqual(calls.settings, 2, 'Both question settings should be written in one batch');
assert.strictEqual(calls.options, 4, 'Two contestant answers plus Yes/No should be written in one option bulk operation');
assert.strictEqual(calls.categoryRows, 4, 'Legacy answer rows should be appended together');
assert.deepStrictEqual(calls.checkpoints, ['COMPILING QUESTION PACK','WRITING QUESTION PACK','VERIFYING QUESTION PACK']);
assert(calls.bulkObjects.some(call => call.count === 2), 'Question and episode-question bulk upserts should contain both questions');

console.log('Reality TV bulk question materializer v1.1.18 tests passed.');
