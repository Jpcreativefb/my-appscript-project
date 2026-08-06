const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const questions = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

assert(season.includes('"ApprovalStageStartedAt", "ApprovalHeartbeatAt", "ApprovalQuestionBuildId"'), 'Approval queue must store stage timing and question-build linkage');
assert(season.includes('function realityTvApprovalProgress_'), 'Backend approval progress calculation is missing');
assert(season.includes('const nextStage = build.nextEpisode && enabledTypes.length ? "BUILD_QUESTIONS" : "FINALIZE";'), 'Approval must expose a separate Extra Question stage');
assert(season.includes('realityTvAdvanceQuestionPackBuild_(questionBuild, 1, 8000)'), 'Extra Questions should advance one visible checkpoint per request');
assert(season.includes('ApprovalStage: complete ? "FINALIZE" : "BUILD_QUESTIONS"'), 'Question build must advance to finalization only when complete');
assert(season.includes('if (realityTvGetHubId_())'), 'Unconfigured External Results Hub must be skipped without delaying local approval');
assert(season.includes('stalledAfterSeconds: 150'), 'Main approval stalled threshold is missing');
assert(questions.includes('progressLabel: label'), 'Supplemental question approvals must return progress data');
assert(questions.includes('ApprovalStageStartedAt: now'), 'Question approval stage timing is missing');

['adminRealityTvApprovalProgressHtml_', 'adminRealityTvStartApprovalTicker_', 'adminRealityTvUpdateApprovalProgress_', 'Estimated remaining: about', 'Taking longer than estimated'].forEach(token => {
  assert(ui.includes(token), `Approval progress UI missing: ${token}`);
});
['Settle result', 'Create next episode', 'Build Extra Questions', 'Finalize', 'Ready'].forEach(label => {
  assert(ui.includes(label), `Main approval step missing: ${label}`);
});
assert(ui.includes('completedStages < 60'), 'Main approval loop must allow enough calls for large question packs');
assert(css.includes('.reality-tv-approval-progress-track'), 'Approval progress-bar styles are missing');
assert(css.includes('@keyframes realityTvApprovalShimmer'), 'Working animation is missing');
assert(app.includes('v1116-reality-tv-approval-progress'), 'New route cache key is missing');
assert.strictEqual(app, appCompat, 'Both app loader copies must match');
assert(html.includes('hotfix=v1116-reality-tv-approval-progress'), 'App shell cache key is missing');


const runtime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(runtime);
vm.runInContext(season, runtime);
runtime.realityTvQuestionTemplatesForSeason_ = () => [
  { Enabled: true }, { Enabled: true }, { Enabled: true }, { Enabled: true }
];
runtime.realityTvLatestQuestionBuildStateForSeason_ = () => ({
  totalCount: 4,
  currentIndex: 2,
  lastMessage: 'Reward winner was built and verified.',
  complete: false
});
runtime.realityTvLatestCompletedQuestionBuildStateForSeason_ = () => null;
runtime.realityTvGetHubId_ = () => '';

const building = runtime.realityTvApprovalProgress_({
  QueueId: 'q1', SeasonId: 's1', NextEpisodeId: 'e2', ReviewStatus: 'APPROVING', ApprovalStage: 'BUILD_QUESTIONS',
  PushStatus: 'BUILDING QUESTIONS 2/4', ApprovalStartedAt: new Date(Date.now() - 30000),
  ApprovalStageStartedAt: new Date(Date.now() - 10000), ApprovalHeartbeatAt: new Date()
});
assert.strictEqual(building.questionDone, 2, 'Question progress should expose completed question count');
assert.strictEqual(building.questionTotal, 4, 'Question progress should expose total question count');
assert(building.percent > 57 && building.percent < 90, 'Question build percentage should be between creation and finalization stages');
assert(building.label.includes('2 of 4'), 'Question build label should show the visible count');
assert(building.estimatedRemainingSeconds > 0, 'Question build should return an approximate ETA');

const stale = runtime.realityTvApprovalProgress_({
  QueueId: 'q2', SeasonId: 's1', ReviewStatus: 'APPROVING', ApprovalStage: 'SETTLE',
  PushStatus: 'SETTLING EPISODE', ApprovalStartedAt: new Date(Date.now() - 200000),
  ApprovalStageStartedAt: new Date(Date.now() - 200000), ApprovalHeartbeatAt: new Date(Date.now() - 160000)
});
assert.strictEqual(stale.stalled, true, 'Approval should be marked stalled after the heartbeat threshold');

const complete = runtime.realityTvApprovalProgress_({ ReviewStatus: 'APPROVED', ApprovalStage: 'COMPLETE' });
assert.strictEqual(complete.percent, 100, 'Completed approvals must report 100 percent');

console.log('Reality TV staged approval progress v1.1.16 tests passed.');
