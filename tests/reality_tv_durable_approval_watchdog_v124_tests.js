const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
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
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

assert(season.includes('"ApprovalQuestionCompletedCount"'), 'Main queue must persist completed Extra Question count');
assert(season.includes('"ApprovalQuestionTotalCount"'), 'Main queue must persist total Extra Question count');
assert(season.includes('"ApprovalQuestionScoresRecalculated"'), 'Main queue must persist score recalculation checkpoint');

const schedule = functionSource(season, 'realityTvScheduleApprovalContinuation_');
assert(schedule.includes('everyMinutes(1)'), 'Approval continuation must use a persistent one-minute watchdog');
assert(schedule.includes('realityTvScheduleApprovalKick_()'), 'Approval continuation must also schedule the fast durable kick');
assert(functionSource(season, 'realityTvScheduleApprovalKick_').includes('after(10000)'), 'Fast durable continuation should target about ten seconds');
assert(functionSource(season, 'realityTvContinuePendingApprovalKick').includes('realityTvDeleteApprovalKickTriggers_()'), 'Fast kick must clear itself before scheduling the next kick');
const worker = functionSource(season, 'realityTvContinuePendingApprovals');
assert(!worker.includes('while ('), 'Approval watchdog must process only one durable unit per invocation');
assert(worker.includes('realityTvContinueRealityTvApprovalInternal_'), 'Approval watchdog must continue one server unit');
const nextSchedule = functionSource(season, 'realityTvScheduleNextEpisodeContinuation_');
assert(nextSchedule.includes('everyMinutes(1)'), 'Next-episode continuation must use a persistent watchdog');
const nextWorker = functionSource(season, 'realityTvContinueNextEpisodeJobs');
assert(!nextWorker.includes('while ('), 'Next-episode watchdog must process only one durable stage per invocation');

const settleOne = functionSource(season, 'realityTvSettleNextEpisodeQuestionQueue_');
assert(settleOne.includes('const queue = before.pending[0]'), 'Extra Question settlement must take only the next unfinished queue');
assert(settleOne.includes('skipScoreRecalc: true'), 'Per-question settlement must defer the episode score recalculation');
assert(settleOne.includes('["FINAL", "CLOSED"]'), 'Killed executions must recover idempotently from already-final questions');
const approvalInternal = functionSource(season, 'realityTvContinueRealityTvApprovalInternal_');
assert(approvalInternal.includes('stage === "SCORE_QUESTIONS"'), 'Score recalculation must be a separate durable stage');
assert(approvalInternal.includes('realityTvSettleNextEpisodeQuestionQueue_'), 'Master finalizer must use one-question settlement');
assert(!approvalInternal.includes('return realityTvSettleEpisodeQuestionQueues_(season, episode, queue, reviewer)'), 'Master finalizer must not call the old batch loop');
const getState = functionSource(season, 'apiAdminGetRealityTvApprovalState');
assert(getState.includes('realityTvScheduleApprovalContinuation_()'), 'Polling an approving episode must repair a missing watchdog');

assert(ui.includes('durable checkpoint after each question'), 'UI must explain durable per-question checkpoints');
assert(ui.includes('persistent server watchdog'), 'UI must explain persistent watchdog ownership');
assert(ui.includes('Emergency recovery — normally not needed'), 'Reset must be emergency-only');
assert(!ui.includes('use Reset Stuck Approval, then Resume Approval'), 'Normal UI must not instruct Reset + Resume');
assert(ui.includes('{ id: "SCORE_QUESTIONS", label: "Score episode" }'), 'UI must display the separate score checkpoint');
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1240-durable-reality-approval"'), 'v1.2.4 route cache version is missing');
assert.strictEqual(app, appCompat, 'Both app-loader copies must match');
assert(html.includes('hotfix=v1240-durable-reality-approval'), 'App shell must request v1.2.4 assets');


const ownerRuntime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(ownerRuntime);
vm.runInContext(`
  function realityTvString_(value) { return String(value == null ? '' : value).trim(); }
  function realityTvNumber_(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  const REALITY_TV_RESULTS_QUEUE_SHEET = 'RealityResultQueue';
  ${functionSource(season, 'realityTvApprovalIsProcessingStatus_')}
  ${functionSource(season, 'realityTvApprovalQueueOwner_')}
`, ownerRuntime);
ownerRuntime.SpreadsheetApp = { getActive: () => ({}) };
const now = Date.now();
ownerRuntime.realityTvReadObjects_ = () => [
  { QueueId: 'stale-only', ReviewStatus: 'APPROVING', PushStatus: 'SETTLING EXTRA RESULTS', ApprovalStartedAt: new Date(now - 600000), ApprovalHeartbeatAt: new Date(now - 300000), __rowNumber: 2 }
];
assert.strictEqual(ownerRuntime.realityTvApprovalQueueOwner_().QueueId, 'stale-only', 'A stale in-progress approval must be reclaimed automatically when it is the remaining job');

const runtime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(runtime);
vm.runInContext(`
  function realityTvString_(value) { return String(value == null ? '' : value).trim(); }
  function realityTvKey_(value) { return realityTvString_(value).toLowerCase(); }
  function realityTvNumber_(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  function realityTvParseJson_(value, fallback) { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch (err) { return fallback; } }
  const REALITY_TV_QUESTION_QUEUE_SHEET = 'RealityQuestionResultQueue';
  ${functionSource(season, 'realityTvEpisodeQuestionQueueProgress_')}
  ${functionSource(season, 'realityTvSettleNextEpisodeQuestionQueue_')}
`, runtime);

let settleCalls = 0;
let rowUpdates = 0;
const rows = [
  { QueueId: 'q1', SeasonId: 's1', EpisodeId: 'e1', EpisodeQuestionId: 'eq1', ReviewStatus: 'APPROVING', __rowNumber: 2 },
  { QueueId: 'q2', SeasonId: 's1', EpisodeId: 'e1', EpisodeQuestionId: 'eq2', ReviewStatus: 'APPROVING', __rowNumber: 3 }
];
runtime.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => ({}) }) };
runtime.realityTvReadObjects_ = () => rows;
runtime.realityTvGetEpisodeQuestion_ = id => ({ EpisodeQuestionId: id, QuestionText: id === 'eq1' ? 'Question One' : 'Question Two', Status: 'OPEN' });
runtime.adminGetGameSetup = () => ({ categories: [] });
runtime.realityTvSettleSupplementalQuestion_ = () => { settleCalls += 1; return {}; };
runtime.realityTvUpdateHubReview_ = () => ({});
runtime.realityTvUpdateObjectRow_ = () => { rowUpdates += 1; };

const unit = runtime.realityTvSettleNextEpisodeQuestionQueue_(
  { SeasonId: 's1', GameId: 'g1' },
  { EpisodeId: 'e1' },
  { ApprovalQuestionQueueIdsJSON: JSON.stringify(['q1','q2']) },
  'admin'
);
assert.strictEqual(settleCalls, 1, 'A server pass must settle exactly one Extra Question');
assert.strictEqual(unit.completedCount, 1, 'First durable pass must checkpoint one completed question');
assert.strictEqual(unit.remainingCount, 1, 'First durable pass must leave one question for a later watchdog run');
assert.strictEqual(unit.queueId, 'q1', 'First pending queue should be settled first');
assert(rowUpdates >= 1, 'Question queue completion must be persisted');


const flowRuntime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(flowRuntime);
vm.runInContext(`
  function realityTvString_(value) { return String(value == null ? '' : value).trim(); }
  function realityTvKey_(value) { return realityTvString_(value).toLowerCase(); }
  function realityTvNumber_(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  function realityTvBool_(value) { return value === true || String(value || '').toLowerCase() === 'true'; }
  function realityTvParseJson_(value, fallback) { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch (err) { return fallback; } }
  const REALITY_TV_RESULTS_QUEUE_SHEET = 'RealityResultQueue';
  const REALITY_TV_QUESTION_QUEUE_SHEET = 'RealityQuestionResultQueue';
  ${functionSource(season, 'realityTvEpisodeQuestionQueueProgress_')}
  ${functionSource(season, 'realityTvSettleNextEpisodeQuestionQueue_')}
  ${functionSource(season, 'realityTvContinueRealityTvApprovalInternal_')}
`, flowRuntime);

const mainQueue = {
  QueueId: 'main1', SeasonId: 's1', GameId: 'g1', EpisodeId: 'e1',
  ReviewStatus: 'APPROVING', ApprovalStage: 'SETTLE_QUESTIONS', PushStatus: 'QUEUED',
  ReviewedBy: 'admin', EpisodeFinalizeMode: 'ALL_RESULTS',
  ApprovalQuestionQueueIdsJSON: JSON.stringify(['q1','q2','q3','q4']),
  ApprovalQuestionCompletedCount: 0, ApprovalQuestionTotalCount: 4,
  ApprovalQuestionScoresRecalculated: false, __rowNumber: 2
};
const flowRows = ['q1','q2','q3','q4'].map((id, i) => ({
  QueueId: id, SeasonId: 's1', EpisodeId: 'e1', EpisodeQuestionId: 'eq' + (i + 1),
  ReviewStatus: 'APPROVING', __rowNumber: i + 2
}));
const questionStatus = { eq1: 'OPEN', eq2: 'OPEN', eq3: 'OPEN', eq4: 'OPEN' };
let flowSettleCalls = 0;
let scoreCalls = 0;
const mainSheet = { name: 'RealityResultQueue' };
const questionSheet = { name: 'RealityQuestionResultQueue' };
flowRuntime.SpreadsheetApp = { getActive: () => ({ getSheetByName: name => name === 'RealityResultQueue' ? mainSheet : questionSheet }) };
flowRuntime.realityTvEnsureSystem_ = () => {};
flowRuntime.realityTvSpreadsheetRetry_ = (label, fn) => fn();
flowRuntime.realityTvGetQueue_ = () => ({ ...mainQueue });
flowRuntime.realityTvApprovalWaitingFor_ = () => null;
flowRuntime.realityTvClaimApprovalStage_ = () => ({ busy: false, changed: false, queue: { ...mainQueue }, attempts: 1 });
flowRuntime.realityTvGetSeason_ = () => ({ SeasonId: 's1', GameId: 'g1' });
flowRuntime.realityTvGetEpisode_ = () => ({ EpisodeId: 'e1', SeasonId: 's1', Status: 'OPEN' });
flowRuntime.realityTvReadObjects_ = (ss, sheetName) => sheetName === 'RealityQuestionResultQueue' ? flowRows.map(row => ({ ...row })) : [];
flowRuntime.realityTvGetEpisodeQuestion_ = id => ({ EpisodeQuestionId: id, QuestionText: id, Status: questionStatus[id], __rowNumber: 2 });
flowRuntime.adminGetGameSetup = () => ({ categories: [] });
flowRuntime.realityTvSettleSupplementalQuestion_ = question => { flowSettleCalls += 1; questionStatus[question.EpisodeQuestionId] = 'FINAL'; };
flowRuntime.realityTvUpdateHubReview_ = () => ({});
flowRuntime.realityTvUpdateObjectRow_ = (sheet, rowNumber, patch) => {
  if (sheet === mainSheet) Object.assign(mainQueue, patch);
  else {
    const row = flowRows.find(item => item.__rowNumber === rowNumber);
    if (row) Object.assign(row, patch);
  }
};
flowRuntime.realityTvScheduleApprovalContinuation_ = () => true;
flowRuntime.realityTvApprovalState_ = () => ({ success: true, complete: false, stage: mainQueue.ApprovalStage });
flowRuntime.seasonAnchorRecalculateEpisodeScores_ = () => { scoreCalls += 1; return { success: true }; };

for (let i = 1; i <= 4; i += 1) {
  flowRuntime.realityTvContinueRealityTvApprovalInternal_({ queueId: 'main1', username: 'admin' });
  assert.strictEqual(flowSettleCalls, i, `Watchdog pass ${i} must settle exactly one Extra Question`);
  assert.strictEqual(mainQueue.ApprovalQuestionCompletedCount, i, `Watchdog pass ${i} must save the completed count`);
  if (i < 4) assert.strictEqual(mainQueue.ApprovalStage, 'SETTLE_QUESTIONS', 'Stage must remain on Extra Questions until the last queue is complete');
}
assert.strictEqual(mainQueue.ApprovalStage, 'SCORE_QUESTIONS', 'Last Extra Question pass must advance to a separate score stage');
flowRuntime.realityTvContinueRealityTvApprovalInternal_({ queueId: 'main1', username: 'admin' });
assert.strictEqual(scoreCalls, 1, 'Episode score recalculation must run exactly once in its own pass');
assert.strictEqual(mainQueue.ApprovalStage, 'SETTLE', 'Score pass must advance to elimination settlement');
assert.strictEqual(mainQueue.ApprovalQuestionScoresRecalculated, true, 'Score checkpoint must be persisted');

const progressRuntime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(progressRuntime);
vm.runInContext(season, progressRuntime);
progressRuntime.realityTvQuestionTemplatesForSeason_ = () => [];
progressRuntime.realityTvLatestQuestionBuildStateForSeason_ = () => null;
progressRuntime.realityTvLatestCompletedQuestionBuildStateForSeason_ = () => null;
const progress = progressRuntime.realityTvApprovalProgress_({
  ReviewStatus: 'APPROVING',
  ApprovalStage: 'SETTLE_QUESTIONS',
  PushStatus: 'SETTLING EXTRA RESULTS',
  ApprovalQuestionQueueIdsJSON: JSON.stringify(['q1','q2','q3','q4']),
  ApprovalQuestionCompletedCount: 2,
  ApprovalQuestionTotalCount: 4,
  ApprovalCurrentQuestionLabel: 'Team challenge winner',
  ApprovalStartedAt: new Date(),
  ApprovalStageStartedAt: new Date(),
  ApprovalHeartbeatAt: new Date()
});
assert(progress.label.includes('2 of 4'), 'Progress must show durable completed/total Extra Question count');
assert(progress.detail.includes('Team challenge winner'), 'Progress must show the last completed question');

console.log('Reality TV durable approval watchdog v1.2.4 tests passed.');
