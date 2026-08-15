const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const questions = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const clientCompat = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

assert(season.includes('function realityTvApprovalQueueOwner_'), 'Approvals must be serialized through one queue owner');
assert(season.includes('function realityTvContinuePendingApprovals'), 'Server-side approval continuation trigger is missing');
assert(season.includes('realityTvScheduleApprovalContinuation_();'), 'Incomplete approvals must schedule automatic continuation');
assert(season.includes('function apiAdminGetRealityTvApprovalState'), 'Read-only approval status endpoint is missing');
['PREPARING NEXT EPISODE', 'CREATING MAIN QUESTION', 'ADDING MAIN ANSWERS', 'SAVING NEXT EPISODE'].forEach(status => {
  assert(season.includes(`"${status}"`), `Next-episode checkpoint missing: ${status}`);
});
assert(season.includes('if (!createdCategory)'), 'A newly created main question should not be re-read and updated unnecessarily');
assert(season.includes('realityTvMaterializeEpisodeQuestionPackBulk_(season, nextEpisode'), 'Approval must use the bulk question materializer');
assert(season.includes('managedBy: "APPROVAL"'), 'Bulk approval question builds must be marked as approval-managed');

assert(questions.includes('"ManagedBy"'), 'Question build jobs must store their owner');
assert(questions.includes('row.ManagedBy'), 'Question worker must inspect the build owner');
assert(questions.includes('!== "APPROVAL"'), 'Generic question continuation must skip approval-managed builds');

assert(api.includes('action === "adminGetRealityTvApprovalState"'), 'Backend API route for approval polling is missing');
assert(client.includes('async function apiAdminGetRealityTvApprovalState'), 'Frontend approval polling wrapper is missing');
assert.strictEqual(client, clientCompat, 'Both frontend API copies must match');

assert(ui.includes('function adminRealityTvStartApprovalPoller_'), 'Approval checkpoint poller is missing');
assert(ui.includes('container.dataset.maxPercent'), 'Displayed approval progress must be monotonic');
assert(!ui.includes('const animatedPercent ='), 'Approval percentage must not simulate progress beyond saved checkpoints');
assert(ui.includes('Last checkpoint:'), 'Approval UI must show checkpoint age');
assert(ui.includes('state.waiting ? 3000'), 'Queued approvals must wait visibly rather than fail after a short busy loop');

assert.strictEqual(app, appCompat, 'Both app loader copies must match');

const runtime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(runtime);
vm.runInContext(season, runtime);
runtime.realityTvQuestionTemplatesForSeason_ = () => [{ Enabled: true }, { Enabled: true }, { Enabled: true }, { Enabled: true }];
runtime.realityTvLatestQuestionBuildStateForSeason_ = () => null;
runtime.realityTvLatestCompletedQuestionBuildStateForSeason_ = () => null;
runtime.realityTvGetHubId_ = () => '';

const mainQuestion = runtime.realityTvApprovalProgress_({
  ReviewStatus: 'APPROVING', ApprovalStage: 'BUILD_NEXT', PushStatus: 'CREATING MAIN QUESTION',
  ApprovalStartedAt: new Date(Date.now() - 10000), ApprovalStageStartedAt: new Date(Date.now() - 3000), ApprovalHeartbeatAt: new Date()
});
assert.strictEqual(mainQuestion.percent, 47, 'Main question checkpoint should report 47 percent');
assert(mainQuestion.label.includes('main elimination question'), 'Main question checkpoint label is incorrect');

const answers = runtime.realityTvApprovalProgress_({
  ReviewStatus: 'APPROVING', ApprovalStage: 'BUILD_NEXT', PushStatus: 'ADDING MAIN ANSWERS',
  ApprovalStartedAt: new Date(Date.now() - 10000), ApprovalStageStartedAt: new Date(Date.now() - 3000), ApprovalHeartbeatAt: new Date()
});
assert.strictEqual(answers.percent, 52, 'Main answer checkpoint should report 52 percent');

const saving = runtime.realityTvApprovalProgress_({
  ReviewStatus: 'APPROVING', ApprovalStage: 'BUILD_NEXT', PushStatus: 'SAVING NEXT EPISODE',
  ApprovalStartedAt: new Date(Date.now() - 10000), ApprovalStageStartedAt: new Date(Date.now() - 3000), ApprovalHeartbeatAt: new Date()
});
assert.strictEqual(saving.percent, 55, 'Next-episode save checkpoint should report 55 percent');



runtime.SpreadsheetApp = { getActive: () => ({}) };
const now = Date.now();
runtime.realityTvReadObjects_ = () => [
  { QueueId: 'older', ReviewStatus: 'APPROVING', PushStatus: 'BUILDING NEXT EPISODE', ApprovalStartedAt: new Date(now - 20000), ApprovalHeartbeatAt: new Date(now - 1000), __rowNumber: 2 },
  { QueueId: 'newer', ReviewStatus: 'APPROVING', PushStatus: 'QUEUED', ApprovalStartedAt: new Date(now - 10000), ApprovalHeartbeatAt: new Date(now - 1000), __rowNumber: 3 }
];
assert.strictEqual(runtime.realityTvApprovalQueueOwner_().QueueId, 'older', 'The oldest fresh approval must own the shared sheets');
runtime.realityTvReadObjects_ = () => [
  { QueueId: 'stale', ReviewStatus: 'APPROVING', PushStatus: 'BUILDING NEXT EPISODE', ApprovalStartedAt: new Date(now - 400000), ApprovalHeartbeatAt: new Date(now - 200000), __rowNumber: 2 },
  { QueueId: 'queued', ReviewStatus: 'APPROVING', PushStatus: 'QUEUED', ApprovalStartedAt: new Date(now - 10000), ApprovalHeartbeatAt: new Date(now - 1000), __rowNumber: 3 }
];
assert.strictEqual(runtime.realityTvApprovalQueueOwner_().QueueId, 'queued', 'A stale approval must not block a newer queued approval');

console.log('Reality TV approval queue and checkpoints v1.1.17 tests passed.');
