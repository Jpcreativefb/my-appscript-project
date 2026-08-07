const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const questions = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const frontendApiCompat = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

assert(season.includes('const REALITY_TV_NEXT_EPISODE_JOBS_SHEET = "RealityNextEpisodeJobs"'), 'Separate next-episode job sheet is missing');
assert(season.includes('function apiAdminFinalizeRealityTvEpisode'), 'One-click episode finalization API is missing');
assert(season.includes('ApprovalStage: "SETTLE_QUESTIONS"'), 'Episode finalizer must settle Extra Questions first');
assert(season.includes('function realityTvSettleEpisodeQuestionQueues_'), 'Batch Extra Question settlement is missing');
assert(season.includes('skipScoreRecalc: true'), 'Batch settlement should defer repeated score recalculation');
assert(questions.includes('options.setup || adminGetGameSetup'), 'Supplemental settlement must reuse one Game Setup read during batch finalization');
assert(questions.includes('!options.skipScoreRecalc'), 'Supplemental settlement must support one final score recalculation');
assert(season.includes('ApprovalStage: allResultsMode ? "FINALIZE_CURRENT" : "BUILD_NEXT"'), 'Current episode must finalize before next-episode preparation in one-click mode');
assert(season.includes('realityTvQueueNextEpisodePreparation_(season, episode, reviewer)'), 'Current finalization must queue next episode separately');
assert(season.includes('function realityTvContinueNextEpisodeJobs'), 'Server-owned next-episode worker is missing');
assert(season.includes('ScriptApp.newTrigger("realityTvContinueNextEpisodeJobs")'), 'Next-episode worker trigger is missing');
assert(season.includes('The server will retry this stage automatically.'), 'Automatic retry for transient approval errors is missing');
assert(season.includes('Status: retryable ? "RETRY" : "NEEDS_ATTENTION"'), 'Next-episode retry/attention state is missing');
assert(season.includes('realityTvMaterializeEpisodeQuestionPackBulk_'), 'Next-episode worker must use the bulk question materializer');
assert(season.includes('realityTvSyncEpisodeToHub_'), 'Next-episode Hub synchronization should remain queued after local readiness');

assert(api.includes('"adminFinalizeRealityTvEpisode"'), 'Backend API route for finalization is missing');
assert(frontendApi.includes('apiAdminFinalizeRealityTvEpisode'), 'Frontend API helper for finalization is missing');
assert.strictEqual(frontendApi, frontendApiCompat, 'Frontend API copies must match');
assert(ui.includes('Approve All &amp; Finalize Episode'), 'Master finalization button is missing');
assert(ui.includes('Working automatically.'), 'UI must tell the admin the server owns the job');
assert(ui.includes('You may leave this page'), 'Set-and-forget guidance is missing');
assert(ui.includes('Recovery tools — only if marked stalled'), 'Reset/Resume must be demoted to recovery tools');
assert(ui.includes('adminRealityTvStartApprovalPoller_(item.QueueId)'), 'Reopened approving episodes should resume read-only progress polling');
assert(ui.includes('This is separate from the finalized episode. You do not need to keep this page open.'), 'Separate next-episode status UI is missing');
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1230-reality-tv-hub-complete-mirror"'), 'Finalizer cache version is missing');
assert.strictEqual(app, appCompat, 'App loader copies must match');
assert(html.includes('hotfix=v1230-reality-tv-hub-complete-mirror'), 'App shell must load the finalizer cache version');

const runtime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(runtime);
vm.runInContext(season, runtime);
runtime.realityTvQuestionTemplatesForSeason_ = () => [{ Enabled: true }, { Enabled: true }, { Enabled: true }, { Enabled: true }];
runtime.realityTvLatestQuestionBuildStateForSeason_ = () => null;
runtime.realityTvLatestCompletedQuestionBuildStateForSeason_ = () => null;
const progress = runtime.realityTvApprovalProgress_({
  ReviewStatus: 'APPROVING', ApprovalStage: 'SETTLE_QUESTIONS', PushStatus: 'SETTLING EXTRA RESULTS',
  ApprovalStartedAt: new Date(Date.now() - 5000), ApprovalStageStartedAt: new Date(Date.now() - 3000), ApprovalHeartbeatAt: new Date()
});
assert.strictEqual(progress.label, 'Settling all Extra Question results');
assert(progress.percent > 0 && progress.percent < 50, 'Extra Question batch settlement should be the first visible phase');

const jobState = runtime.realityTvNextEpisodeJobState_({
  JobId: 'j1', SeasonId: 's1', SourceEpisodeId: 'e1', TargetEpisodeNumber: 2,
  Status: 'RUNNING', Stage: 'BUILD_QUESTIONS', ProgressLabel: 'Verifying Extra Questions', ProgressDetail: 'Verifying.'
});
assert(jobState.percent >= 90, 'Verification should report late-stage next-episode progress');
assert.strictEqual(jobState.complete, false);

console.log('Reality TV episode finalizer v1.2.2 tests passed.');
