const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bridge = fs.readFileSync(path.join(root, 'backend/engines/ExternalResultsHubBridgeEngine.js'), 'utf8');
const questions = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} is missing`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

const syncBatch = functionSource(questions, 'realityTvSyncSupplementalQuestionsToHubBatch_');
assert(syncBatch.includes('externalResultsBridgeEnqueue_'), 'Extra Question pack must use the verified outbox bridge');
assert(syncBatch.includes('UPSERT_REALITY_QUESTION_PACK'), 'Extra Question pack job type is missing');
assert(!syncBatch.includes('realityTvOpenHub_'), 'Extra Question pack must not open the Hub synchronously');
assert(!syncBatch.includes('SpreadsheetApp.openById'), 'Extra Question pack must not open the Hub synchronously');

const createResult = functionSource(questions, 'realityTvCreateSupplementalHubPendingResult_');
assert(createResult.includes('CREATE_RESULT_REVIEW'), 'Extra Question result must create its Hub review through the outbox');
assert(createResult.includes('externalResultsBridgeEnqueue_'), 'Extra Question result must enqueue Hub work');
assert(!createResult.includes('realityTvOpenHub_'), 'Extra Question result submission must not open the Hub directly');

const syncApproval = functionSource(questions, 'realityTvSyncSupplementalApprovalHub_');
assert(syncApproval.includes('realityTvSyncAllSupplementalQuestionsToHub_'), 'Approved Extra Question must refresh Hub market resolution asynchronously');
assert(syncApproval.includes('realityTvUpdateHubReview_'), 'Approved Extra Question must update Hub review state asynchronously');
assert(!syncApproval.includes('realityTvOpenHub_'), 'Extra Question approval must not open the Hub directly');

assert(functionSource(questions, 'realityTvMaterializeEpisodeQuestionPackBulk_').includes('realityTvSyncAllSupplementalQuestionsToHub_'), 'Bulk question materializer must queue the complete Hub question pack');
assert(functionSource(questions, 'apiAdminApplyRealityTvEpisodeQuestionPlan').includes('realityTvSyncAllSupplementalQuestionsToHub_'), 'Episode-only question plan edits must refresh the Hub question pack');
assert(functionSource(season, 'realityTvSyncEpisodeScheduleToHub_').includes('supplementalMarkets'), 'Schedule changes must update all Extra Question closing times');
assert(functionSource(season, 'realityTvSyncApprovalHub_').includes('realityTvQueueMainMarketResolution_'), 'Main elimination approval must resolve its Hub market');

assert(bridge.includes('UPSERT_REALITY_QUESTION_PACK'), 'Hub bridge must support complete Reality TV question packs');
assert(bridge.includes('UPSERT_MARKET_RESOLUTION'), 'Hub bridge must support main market resolution updates');
assert(bridge.includes('function externalResultsBridgeDeactivateStaleRealityQuestionPack_'), 'Removed episode questions must be deactivated in the Hub');
assert(bridge.includes('function externalResultsBridgeFindCreateDependency_'), 'Review dependency lookup is missing');
assert(bridge.includes('function externalResultsBridgeDependencyState_'), 'Review dependency gate is missing');
assert(bridge.includes('waitingOnDependencies'), 'Dependency waits must be reported without consuming normal retries');
assert(bridge.includes('externalResultsBridgeJobPriority_'), 'Outbox job ordering is missing');
assert(bridge.includes('Status: "ARCHIVED"'), 'Obsolete legacy dependency errors need an archive state');
assert(bridge.includes('function externalResultsBridgeRealityTvHealth_'), 'Reality TV Hub health summary is missing');
assert(bridge.includes('realityTv: realityTv'), 'Reality TV Hub health must be exposed to the manager');

assert(ui.includes('Repair / Retry Failed'), 'Hub repair/retry control is missing');
assert(ui.includes('realityTvHubMirrorStatus'), 'Reality TV Hub mirror status area is missing');
assert(ui.includes('Hub mirror complete'), 'Hub mirror completion label is missing');
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1260-external-results-inbox"'), 'v1.2.3 route cache version is missing');
assert.strictEqual(app, appCompat, 'Both app-loader copies must match');
assert(html.includes('hotfix=v1260-external-results-inbox'), 'App shell must load the v1.2.3 Reality TV Hub route');

const context = { console, JSON, String, Array, Object, Date };
vm.createContext(context);
vm.runInContext(`
  function realityTvString_(value) { return String(value == null ? '' : value).trim(); }
  function realityTvKey_(value) { return realityTvString_(value).toLowerCase(); }
  function realityTvParseJson_(value, fallback) { if (value && typeof value === 'object') return value; try { return JSON.parse(String(value || '')); } catch (err) { return fallback; } }
  ${functionSource(questions, 'realityTvBuildSupplementalHubPayload_')}
`, context);
const payload = context.realityTvBuildSupplementalHubPayload_(
  { SeasonId: 's1', GameId: 'g1', ShowName: 'MasterChef' },
  { EpisodeId: 'e6', EpisodeName: 'Episode 6', ExternalEventId: 'evt6', ExternalMarketId: 'elim6', LockDateTime: '2026-09-09', Status: 'OPEN' },
  [
    { question: { EpisodeQuestionId: 'q1', CategoryId: 'c1', ExternalMarketId: 'm1', QuestionText: 'Who wins?', QuestionType: 'challenge', ResultKey: 'challenge', Status: 'OPEN' }, answerOptions: [
      { id: 'a', label: 'A', subjectType: 'contestant', externalSubjectId: 'a' },
      { id: 'none', label: 'No one', subjectType: 'outcome' }
    ] },
    { question: { EpisodeQuestionId: 'q2', CategoryId: 'c2', ExternalMarketId: 'm2', QuestionText: 'Which team?', QuestionType: 'team', ResultKey: 'team', Status: 'OPEN' }, answerOptions: [
      { id: 'blue', label: 'Blue', subjectType: 'group', externalSubjectId: 'blue' },
      { id: 'red', label: 'Red', subjectType: 'group', externalSubjectId: 'red' }
    ] }
  ]
);
assert.strictEqual(payload.markets.length, 2, 'Every enabled Extra Question must become a Hub market');
assert.strictEqual(payload.mappings.length, 4, 'Every answer must receive an AppMapping');
assert.strictEqual(payload.subjects.length, 3, 'Outcome-only answers must not create fake external subjects');
assert.strictEqual(payload.replaceQuestionPack, true, 'Question pack sync must deactivate stale Hub mappings');

const depContext = { JSON, String, Array, Object };
vm.createContext(depContext);
vm.runInContext(`
  ${functionSource(bridge, 'externalResultsBridgeString_')}
  ${functionSource(bridge, 'externalResultsBridgeKey_')}
  ${functionSource(bridge, 'externalResultsBridgeParseJson_')}
  ${functionSource(bridge, 'externalResultsBridgeFindCreateDependency_')}
  ${functionSource(bridge, 'externalResultsBridgeJobPriority_')}
`, depContext);
const createJob = { JobId: 'create1', JobType: 'CREATE_RESULT_REVIEW', PayloadJSON: JSON.stringify({ importedResult: { ImportedResultId: 'r1' }, review: { ReviewId: 'v1' } }), Status: 'QUEUED' };
const updateJob = { JobId: 'update1', JobType: 'UPDATE_REVIEW', PayloadJSON: JSON.stringify({ importedResult: { ImportedResultId: 'r1' }, review: { ReviewId: 'v1' } }), Status: 'QUEUED' };
assert.strictEqual(depContext.externalResultsBridgeFindCreateDependency_([updateJob, createJob], updateJob).JobId, 'create1', 'Review update must locate its create dependency');
assert(depContext.externalResultsBridgeJobPriority_(createJob) < depContext.externalResultsBridgeJobPriority_(updateJob), 'CREATE_RESULT_REVIEW must run before UPDATE_REVIEW');

console.log('External Results Hub Reality TV complete mirror v1.2.3 tests passed.');
