'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const seasonSource = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');

function functionSource(source, name) {
  const asyncMarker = `async function ${name}(`;
  const marker = `function ${name}(`;
  let start = source.indexOf(asyncMarker);
  if (start < 0) start = source.indexOf(marker);
  assert(start >= 0, `Missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '`') {
      // Template literals in these target functions do not contain raw braces
      // that affect the function-level parser in this test harness.
      quote = ch; continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

function context(extra = {}) {
  const sandbox = Object.assign({ console, Date, JSON, Math, Number, String, Array, Object, Boolean, Error, Promise, setTimeout, clearTimeout }, extra);
  vm.createContext(sandbox);
  return sandbox;
}

// ---------------------------------------------------------------------------
// 1) Episode 2 + three OPEN Extra Questions: OPEN alone is not enough to know
// whether finalization is blocked. No queue => exactly three blockers.
// ---------------------------------------------------------------------------
{
  let questionQueue = [];
  const ctx = context({
    REALITY_TV_EPISODE_QUESTIONS_SHEET: 'Questions',
    REALITY_TV_QUESTION_QUEUE_SHEET: 'QuestionQueue',
    SpreadsheetApp: { getActive: () => ({}) },
    realityTvReadObjects_: (_ss, sheet) => sheet === 'Questions' ? [
      { SeasonId: 's1', EpisodeId: 'e2', EpisodeQuestionId: 'q1', QuestionText: 'Q1', Status: 'OPEN', Enabled: true },
      { SeasonId: 's1', EpisodeId: 'e2', EpisodeQuestionId: 'q2', QuestionText: 'Q2', Status: 'OPEN', Enabled: true },
      { SeasonId: 's1', EpisodeId: 'e2', EpisodeQuestionId: 'q3', QuestionText: 'Q3', Status: 'OPEN', Enabled: true }
    ] : questionQueue,
    realityTvKey_: v => String(v == null ? '' : v).trim().toLowerCase(),
    realityTvString_: v => String(v == null ? '' : v).trim(),
    realityTvBool_: v => v === true || String(v).toLowerCase() === 'true'
  });
  vm.runInContext(functionSource(seasonSource, 'realityTvEpisodeFinalizeReadiness_'), ctx);
  let readiness = ctx.realityTvEpisodeFinalizeReadiness_('s1', 'e2');
  assert.strictEqual(readiness.ready, false);
  assert.strictEqual(readiness.missingCount, 3);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(readiness.missing.map(x => x.episodeQuestionId))), ['q1', 'q2', 'q3']);

  // The same three OPEN question rows become ready once result queues exist.
  questionQueue = ['q1', 'q2', 'q3'].map((id, i) => ({
    QueueId: `rq${i + 1}`, SeasonId: 's1', EpisodeId: 'e2', EpisodeQuestionId: id,
    ReviewStatus: 'PENDING', SubmittedAt: `2026-08-28T12:0${i}:00Z`
  }));
  readiness = ctx.realityTvEpisodeFinalizeReadiness_('s1', 'e2');
  assert.strictEqual(readiness.ready, true, 'OPEN question rows with PENDING result queues are ready for batch finalization');
  assert.strictEqual(readiness.pendingCount, 3);
  assert.strictEqual(readiness.missingCount, 0);
}

// ---------------------------------------------------------------------------
// 2) Fail-fast blocker: missing Extra Question results must not queue a watchdog
// or mutate the main approval row merely to discover the blocker.
// ---------------------------------------------------------------------------
{
  let scheduled = 0;
  let writes = 0;
  const main = { QueueId: 'main', SeasonId: 's1', EpisodeId: 'e2', EpisodeNumber: 2, ReviewStatus: 'PENDING', __rowNumber: 7 };
  const ctx = context({
    requireAdmin_: () => {}, realityTvEnsureSystem_: () => {},
    realityTvGetQueue_: () => main,
    realityTvGetSeason_: () => ({ SeasonId: 's1' }),
    realityTvGetEpisode_: () => ({ EpisodeId: 'e2', EpisodeNumber: 2 }),
    realityTvEpisodeFinalizeReadiness_: () => ({ ready: false, missing: [{}, {}, {}], questionQueueIds: [], pendingCount: 0 }),
    realityTvString_: v => String(v == null ? '' : v).trim(),
    realityTvKey_: v => String(v == null ? '' : v).trim().toLowerCase(),
    realityTvNumber_: (v, f) => Number.isFinite(Number(v)) ? Number(v) : Number(f || 0),
    realityTvScheduleApprovalContinuation_: () => { scheduled++; },
    realityTvUpdateObjectRow_: () => { writes++; },
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({}) }) },
    REALITY_TV_RESULTS_QUEUE_SHEET: 'Results', REALITY_TV_QUESTION_QUEUE_SHEET: 'QuestionQueue'
  });
  vm.runInContext(functionSource(seasonSource, 'apiAdminFinalizeRealityTvEpisode'), ctx);
  const result = ctx.apiAdminFinalizeRealityTvEpisode({ queueId: 'main', username: 'admin' });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, 'MISSING_EPISODE_RESULTS');
  assert.strictEqual(result.missingCount, 3);
  assert(result.message.includes('Cannot finalize Episode 2 yet — 3 Episode Question results still need results or Push.'));
  assert.strictEqual(writes, 0, 'blocker check must happen before approval writes');
  assert.strictEqual(scheduled, 0, 'blocker check must not launch the watchdog');
}

// ---------------------------------------------------------------------------
// 3) All results ready: browser-facing API only queues durable work. It must not
// execute settlement or Episode 3 construction in the request.
// ---------------------------------------------------------------------------
{
  const finalizeSrc = functionSource(seasonSource, 'apiAdminFinalizeRealityTvEpisode');
  assert(finalizeSrc.includes('ApprovalStage: "SETTLE_QUESTIONS"'));
  assert(finalizeSrc.includes('realityTvScheduleApprovalContinuation_()'));
  assert(!finalizeSrc.includes('realityTvSettleEpisodeOnly_('), 'browser request must not settle the episode inline');
  assert(!finalizeSrc.includes('realityTvQueueNextEpisodePreparation_('), 'browser request must not prepare Episode 3 inline');
  assert(!finalizeSrc.includes('realityTvContinueNextEpisodeJob_('), 'browser request must not run next-episode worker inline');
}

// Legacy main-result approval is no longer an unsafe bypass.
{
  const approveSrc = functionSource(seasonSource, 'apiAdminApproveRealityTvResult');
  assert(approveSrc.includes('return apiAdminFinalizeRealityTvEpisode(payload);'));
  assert(!approveSrc.includes('ApprovalStage: "SETTLE"'));
}

// ---------------------------------------------------------------------------
// 4) Interrupted/resumed settlement: FINAL episode with the same result is a
// durable checkpoint. Replay repairs Sole Survivor if necessary but skips roster
// and category settlement mutation.
// ---------------------------------------------------------------------------
{
  let anchorCalls = 0;
  const ctx = context({
    realityTvKey_: v => String(v == null ? '' : v).trim().toLowerCase(),
    realityTvString_: v => String(v == null ? '' : v).trim(),
    realityTvParseJson_: (v, f) => { try { return JSON.parse(v); } catch (_) { return f; } },
    realityTvBool_: v => v === true || String(v).toLowerCase() === 'true',
    realityTvGetEpisode_: () => ({ EpisodeId: 'e2', EpisodeNumber: 2, Status: 'FINAL', OutcomeType: 'elimination', EliminatedContestantIds: '["c1"]' }),
    realityTvContestantsForSeason_: () => [{ ContestantId: 'c2', Active: true, Status: 'active' }],
    seasonAnchorSettleRealityEpisode_: () => { anchorCalls++; return { success: true }; }
  });
  vm.runInContext(functionSource(seasonSource, 'realityTvSettleEpisodeOnly_'), ctx);
  const result = ctx.realityTvSettleEpisodeOnly_(
    { SeasonId: 's1', GameId: 'g1' },
    { EpisodeId: 'e2', EpisodeNumber: 2 },
    { OutcomeType: 'elimination', SelectedContestantIds: '["c1"]', ExitReasonsJSON: '{}' },
    'admin'
  );
  assert.strictEqual(result.alreadySettled, true);
  assert.strictEqual(result.remainingCount, 1);
  assert.strictEqual(anchorCalls, 1, 'resume must repair/check Sole Survivor settlement without repeating roster mutation');
}

// Recovery lease matches the live ~7 minute root cause and is corrected.
assert(seasonSource.includes('const processingLeaseMs = 120000;'));
assert(!seasonSource.includes('const processingLeaseMs = 420000;'));
assert(seasonSource.includes('stalledAfterSeconds: 120'));

// ---------------------------------------------------------------------------
// 5) Duplicate Approve click: first click marks local request active before the
// server await. A second click cannot issue a duplicate API call.
// ---------------------------------------------------------------------------
(async () => {
  let apiCalls = 0;
  let resolveApi;
  const pending = new Promise(resolve => { resolveApi = resolve; });
  const ctx = context({
    ADMIN_REALITY_TV_APPROVAL_REQUESTS: {},
    adminRealityTvFinalizeBlocker_: () => null,
    adminRealityTvSetMessage_: () => {},
    adminRealityTvApplyApprovalStateToCard_: () => {},
    adminRealityTvStartApprovalTicker_: () => {},
    adminRealityTvStartApprovalPoller_: () => {},
    adminRealityTvResponseError_: (_r, f) => f,
    confirm: () => true,
    alert: () => {},
    document: { querySelector: () => ({ disabled: false, textContent: '' }) },
    apiAdminFinalizeRealityTvEpisode: () => { apiCalls++; return pending; }
  });
  vm.runInContext(functionSource(uiSource, 'adminRealityTvFinalizeEpisode'), ctx);
  const first = ctx.adminRealityTvFinalizeEpisode('main', 's1');
  const second = ctx.adminRealityTvFinalizeEpisode('main', 's1');
  await Promise.resolve();
  assert.strictEqual(apiCalls, 1, 'duplicate click must not create a second approval request');
  resolveApi({ success: true, queueId: 'main', seasonId: 's1', reviewStatus: 'APPROVING', stage: 'SETTLE_QUESTIONS', pushStatus: 'QUEUED' });
  await Promise.all([first, second]);

  // -------------------------------------------------------------------------
  // 6) 51-second browser delay removed: submit no longer awaits heavy season
  // details before showing Administrator approval required.
  // -------------------------------------------------------------------------
  const submitSrc = functionSource(uiSource, 'adminRealityTvSubmitResult');
  assert(submitSrc.includes('bundle.queue.push(res.queue)'));
  assert(submitSrc.includes('Result submitted — administrator approval required.'));
  assert(!submitSrc.includes('await adminRealityTvRefreshSeasonDetails_'), 'submit must not put full dashboard reload on critical path');

  // -------------------------------------------------------------------------
  // 7) Polling transition updates card directly and never waits on a heavy reload.
  // -------------------------------------------------------------------------
  const pollerSrc = functionSource(uiSource, 'adminRealityTvStartApprovalPoller_');
  assert(pollerSrc.includes('adminRealityTvApplyApprovalStateToCard_(queueId, state)'));
  assert(pollerSrc.includes('state.nextEpisodeJob'));
  assert(!pollerSrc.includes('adminRealityTvRefreshSeasonDetails_'), 'approval polling must remain lightweight');
  assert(uiSource.includes('data-role="approval-card-title"'));
  assert(uiSource.includes('data-role="approval-card-pill"'));

  // Missing results button is intentionally clickable so it can explain the blocker.
  const panelSrc = functionSource(uiSource, 'adminRealityTvResultPanel_');
  assert(panelSrc.includes('data-reality-tv-finalize-queue='));
  assert(!panelSrc.includes('${finalizeReadiness.ready ? "" : "disabled"}'), 'missing-result state must not render a dead disabled button');
  assert(uiSource.includes('Cannot finalize Episode '));

  // -------------------------------------------------------------------------
  // 8) Episode 2 -> Episode 3 queueing is idempotent by source episode.
  // -------------------------------------------------------------------------
  let appendCount = 0;
  let scheduleCount = 0;
  const existingJob = { JobId: 'job-e2-e3', SeasonId: 's1', SourceEpisodeId: 'e2', TargetEpisodeNumber: 3, Status: 'QUEUED', Stage: 'CREATE_EPISODE' };
  const jobCtx = context({
    realityTvContestantsForSeason_: () => [{ Active: true, Status: 'active' }, { Active: true, Status: 'active' }],
    realityTvBool_: v => v === true || String(v).toLowerCase() === 'true',
    realityTvKey_: v => String(v == null ? '' : v).trim().toLowerCase(),
    realityTvString_: v => String(v == null ? '' : v).trim(),
    realityTvNumber_: (v, f) => Number.isFinite(Number(v)) ? Number(v) : Number(f || 0),
    realityTvLatestNextEpisodeJobForSource_: () => existingJob,
    realityTvScheduleNextEpisodeContinuation_: () => { scheduleCount++; },
    realityTvNextEpisodeJobState_: job => ({ jobId: job.JobId, status: job.Status, complete: false }),
    realityTvAppendObject_: () => { appendCount++; },
    realityTvEpisodesForSeason_: () => [],
    realityTvId_: () => 'new-job',
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({}) }) },
    REALITY_TV_NEXT_EPISODE_JOBS_SHEET: 'Jobs',
    realityTvGetNextEpisodeJob_: () => existingJob
  });
  vm.runInContext(functionSource(seasonSource, 'realityTvQueueNextEpisodePreparation_'), jobCtx);
  const job = jobCtx.realityTvQueueNextEpisodePreparation_(
    { SeasonId: 's1', GameId: 'g1', AutoCreateNextEpisode: true },
    { EpisodeId: 'e2', EpisodeNumber: 2 },
    'admin'
  );
  assert.strictEqual(job.job.JobId, 'job-e2-e3');
  assert.strictEqual(appendCount, 0, 'repeat Episode 2 finalization must not create a second Episode 3 job');
  assert.strictEqual(scheduleCount, 1, 'existing unfinished Episode 3 job should simply be re-kicked');

  console.log('reality-tv-rc17-live-finalization-hotfix-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
