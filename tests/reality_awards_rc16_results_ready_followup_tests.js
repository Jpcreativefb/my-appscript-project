'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const season = read('backend/engines/RealityTvSeasonEngine.js');
const appData = read('backend/engines/AppDataEngine.js');
const api = read('backend/Api.js');
const anchor = read('backend/engines/SeasonAnchorEngine.js');
const admin = read('frontend/js/pages/adminRealityTv.js');
const picks = read('frontend/js/pages/picks.js');
const styles = read('frontend/css/styles.css');
const html = read('frontend/app.html');
const app = read('frontend/app.js');
const appMirror = read('frontend/js/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

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
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

function runFunctions(source, names, context = {}) {
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON, Boolean, Promise }, context);
  vm.createContext(sandbox);
  names.forEach(name => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

// ---------------------------------------------------------------------------
// 1) Spoiler Shield defaults ON for a new Reality player/game, but an explicit
// opt-out remains authoritative.
// ---------------------------------------------------------------------------
{
  const ctx = runFunctions(season, ['realityTvSpoilerStateFromRows_'], {
    realityTvKey_: value => String(value == null ? '' : value).trim().toLowerCase(),
    realityTvBool_: value => value === true || String(value).toLowerCase() === 'true',
    realityTvString_: value => String(value == null ? '' : value).trim(),
    realityTvNumber_: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : Number(fallback || 0)
  });
  const episodes = [
    { episodeId: 'ep-1', episodeNumber: 1, status: 'FINAL' },
    { episodeId: 'ep-2', episodeNumber: 2, status: 'OPEN' }
  ];
  const defaultOn = ctx.realityTvSpoilerStateFromRows_('alice', 'game-1', 'season-1', episodes, []);
  assert.strictEqual(defaultOn.enabled, true, 'new Reality player/game must default Spoiler Shield ON');
  assert.strictEqual(defaultOn.explicitPreference, false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(defaultOn.hiddenEpisodeIds)), ['ep-1']);
  assert.strictEqual(defaultOn.blockingEpisodeNumber, 1);

  const explicitOff = ctx.realityTvSpoilerStateFromRows_('alice', 'game-1', 'season-1', episodes, [{
    Username: 'alice', GameId: 'game-1', RecordType: 'preference', ShieldEnabled: false, EpisodeNumber: 0
  }]);
  assert.strictEqual(explicitOff.enabled, false, 'explicit opt-out must not be overwritten by new default');
  assert.strictEqual(explicitOff.explicitPreference, true);
  assert.strictEqual(explicitOff.hasHiddenResults, false);

  const explicitOnRevealed = ctx.realityTvSpoilerStateFromRows_('alice', 'game-1', 'season-1', episodes, [
    { Username: 'alice', GameId: 'game-1', RecordType: 'preference', ShieldEnabled: true, EpisodeNumber: 0 },
    { Username: 'alice', GameId: 'game-1', RecordType: 'reveal', EpisodeId: 'ep-1', Revealed: true }
  ]);
  assert.strictEqual(explicitOnRevealed.enabled, true);
  assert.strictEqual(explicitOnRevealed.hasHiddenResults, false, 'per-episode reveal must clear the block without disabling Shield');
}

assert(functionSource(season, 'realityTvSpoilerPreference_').includes(': true'), 'preference lookup must default ON when no row exists');
const preferenceMapSrc = functionSource(season, 'realityTvSpoilerPreferenceMap_');
assert(preferenceMapSrc.includes('wanted[key] = true'), 'notification preference map must default new Reality users ON');
assert(preferenceMapSrc.includes('realityTvBool_(row.ShieldEnabled)'), 'explicit notification preference must still override default');

// ---------------------------------------------------------------------------
// 2) Hidden Episode 1 blocks Episode 2 data and writes, not merely post-submit.
// ---------------------------------------------------------------------------
{
  const blockFn = functionSource(season, 'realityTvSpoilerBlockedCategoryIds_');
  assert(blockFn.includes('episodeNumber') && blockFn.includes('blockingEpisodeNumber'));
  const applySrc = functionSource(season, 'realityTvApplySpoilerShield_');
  assert(applySrc.includes('payload.participants = []'), 'changed post-elimination roster must not be sent while result is hidden');
  assert(applySrc.includes('rosterHiddenBySpoiler = true'));
  assert(appData.includes('copy.nominees = []'), 'future episode answer list must be stripped from startup payload');
  assert(appData.includes('copy.spoilerShieldBlocked = true'));
  assert(appData.includes('copy.locked = true'));

  const guardSrc = functionSource(api, 'apiRealityTvSpoilerPickGuard_');
  assert(guardSrc.includes('REALITY_REVEAL_REQUIRED'));
  assert(guardSrc.includes('results are ready. Reveal them before making Episode'));
  for (const marker of ['savePicksBatch', 'saveConfidencePicksBatch', 'savePick']) {
    assert(api.includes(marker), `API route ${marker} must remain present`);
  }
  assert((api.match(/apiRealityTvSpoilerPickGuard_\(/g) || []).length >= 5, 'batch, confidence and both modern/legacy single-save paths must use the guard');

  const anchorSave = functionSource(anchor, 'apiSaveSeasonAnchorPick');
  assert(anchorSave.includes('hasHiddenResults'), 'Sole Survivor save must preserve its hidden-result server guard');
}

// ---------------------------------------------------------------------------
// 3) Player Results Ready flow and layout: Current Episode -> Results Ready ->
// Sole Survivor/current questions -> collapsed Previous Episodes after reveal.
// ---------------------------------------------------------------------------
function makePicksContext(hiddenIds) {
  const data = {
    realityTvView: {
      enabled: true,
      season: { periodLabel: 'Episode' },
      spoilerShield: { enabled: true, hiddenEpisodeIds: hiddenIds.slice(), hasHiddenResults: hiddenIds.length > 0 },
      episodes: [
        { episodeId: 'ep-1', episodeNumber: 1, episodeName: 'Episode 1', status: 'FINAL', finalizedAt: '2026-08-28T12:00:00Z', categoryId: 'elim-1' },
        { episodeId: 'ep-2', episodeNumber: 2, episodeName: 'Episode 2', status: 'OPEN', categoryId: 'elim-2' }
      ],
      episodeQuestions: [
        { episodeId: 'ep-1', episodeNumber: 1, categoryId: 'q-1' },
        { episodeId: 'ep-2', episodeNumber: 2, categoryId: 'q-2' }
      ]
    },
    picks: {},
    categories: []
  };
  let cards = 0;
  const ctx = runFunctions(picks, [
    'realityTvHiddenEpisodes_',
    'realityTvBlockingHiddenEpisode_',
    'realityTvCurrentEpisode_',
    'realityTvFinalizedAtText_',
    'realityTvSpoilerBlockMessage_',
    'renderRealityTvSpoilerShield_',
    'renderRealityTvEpisodeSections_'
  ], {
    PICKS_PAGE_DATA: data,
    normalizeId: value => String(value == null ? '' : value).trim().toLowerCase(),
    escapeHtml: value => String(value == null ? '' : value),
    escapeJs: value => String(value == null ? '' : value).replace(/'/g, "\\'"),
    realityTvEpisodeScheduleText_: () => 'Friday 8:00 PM',
    realityTvEpisodeCategoryMap_: () => ({ 'q-1': 1, 'elim-1': 1, 'q-2': 2, 'elim-2': 2 }),
    realityTvEpisodeHeaderStats_: () => '<span class="stats"></span>',
    realityTvEpisodeVoteDetailsHtml_: () => '<div class="vote-details"></div>',
    renderPicksCategoryCards_: items => { cards++; return `<div class="cards">${items.map(i => i.id).join(',')}</div>`; }
  });
  return { ctx, data, getCards: () => cards };
}

{
  const hidden = makePicksContext(['ep-1']);
  const top = hidden.ctx.renderRealityTvSpoilerShield_();
  assert(top.includes('Current Episode'));
  assert(top.includes('Episode 2'));
  assert(top.includes('Episode 1 Results Ready'));
  assert(top.includes('Finalized Aug') || top.includes('Finalized '), 'Results Ready card must show finalized date/time');
  assert(top.includes('SHOW EPISODE 1 RESULTS'));
  assert(top.includes('Episode 1 results are ready. Reveal them before making Episode 2 picks.'));
  assert(top.includes('<details class="reality-spoiler-settings">'), 'global preference must be secondary/collapsed rather than a primary Hide Results control');
  assert(!top.includes('Hide Reality Results'), 'confusing old Hide Reality Results copy must not be primary UI');

  const cats = [
    { id: 'q-1' }, { id: 'elim-1' }, { id: 'q-2' }, { id: 'elim-2' }
  ];
  const sections = hidden.ctx.renderRealityTvEpisodeSections_(cats);
  assert(sections.includes('Episode 1 results are ready. Reveal them before making Episode 2 picks.'));
  assert(sections.includes('next roster and answer choices stay hidden'));
  assert.strictEqual(hidden.getCards(), 0, 'blocked Episode 2 must render no actionable category controls');
  assert(!sections.includes('Previous Episodes'), 'hidden finalized episode must not appear in Previous Episodes before reveal');
}

{
  const revealed = makePicksContext([]);
  const cats = [
    { id: 'q-1' }, { id: 'elim-1' }, { id: 'q-2' }, { id: 'elim-2' }
  ];
  const sections = revealed.ctx.renderRealityTvEpisodeSections_(cats);
  assert(sections.includes('Current Episode'));
  assert(sections.includes('q-2,elim-2'), 'Episode 2 questions become available after reveal');
  assert(sections.includes('<details class="reality-previous-episodes">'), 'revealed Episode 1 must move into Previous Episodes');
  assert(!sections.includes('<details class="reality-previous-episodes" open'), 'Previous Episodes must be collapsed by default');
  assert(sections.includes('q-1,elim-1'));
}

const revealSrc = functionSource(picks, 'revealRealityTvEpisode_');
assert(revealSrc.includes('refreshRealityTvAfterSpoilerChange_'));
assert(!revealSrc.includes('window.location.reload'), 'episode reveal must update the page without a full reload');
assert(revealSrc.includes('The next episode is now available'));
const prefSrc = functionSource(picks, 'saveRealityTvSpoilerPreference_');
assert(!prefSrc.includes('window.location.reload'));

const refreshSrc = functionSource(picks, 'refreshRealityTvAfterSpoilerChange_');
assert(refreshSrc.includes('loadStartupPayload(true)'));
assert(refreshSrc.includes('refreshPicksPage()'));
assert(refreshSrc.includes('hydratePicksEnhancements_'));

// Owner-approved Reality hierarchy: Current Episode / Results Ready comes first,
// current episode questions get primary visual priority, then the season-long
// Sole Survivor feature, with secondary Reality summary/standings below.
const pageSrc = functionSource(picks, 'renderPicksPage');
assert(pageSrc.indexOf('realityTvSpoilerShieldMount') < pageSrc.indexOf('picksCategoryList'), 'Current Episode/Results Ready must be above current episode questions');
assert(pageSrc.indexOf('picksCategoryList') < pageSrc.indexOf('seasonAnchorPickMount'), 'current episode questions must be above Sole Survivor');
assert(pageSrc.indexOf('picksCategoryList') < pageSrc.indexOf('realityTvPlayerSummaryMount'), 'current questions/Previous Episodes must be above secondary Reality summary');

// ---------------------------------------------------------------------------
// 4) Settlement response boundary: browser queues once; Episode N settlement
// advances to FINALIZE_CURRENT, which queues N+1 using existing durable job.
// ---------------------------------------------------------------------------
{
  const approvalSrc = functionSource(admin, 'adminRealityTvApproveResult');
  assert(approvalSrc.includes('apiAdminApproveRealityTvResult(queueId)'));
  assert(approvalSrc.includes('adminRealityTvStartApprovalPoller_'));
  assert(!approvalSrc.includes('while ('), 'browser must not synchronously drive the approval state machine');
  assert(!approvalSrc.includes('apiAdminContinueRealityTvApproval'), 'browser must not wait through continuation stages');

  const finalizeSrc = functionSource(admin, 'adminRealityTvFinalizeEpisode');
  assert(finalizeSrc.includes('apiAdminFinalizeRealityTvEpisode(queueId)'));
  assert(finalizeSrc.includes('adminRealityTvStartApprovalPoller_'));
  assert(!finalizeSrc.includes('adminRealityTvRefreshSeasonDetails_'), 'queued finalize must not immediately reload the heavy dashboard');

  const continuation = functionSource(season, 'realityTvContinueRealityTvApprovalInternal_');
  assert(continuation.includes('ApprovalStage: "FINALIZE_CURRENT"'), 'SETTLE must stop at durable current-episode finalization instead of inline next build');
  assert(continuation.includes('Episode finalized — next episode is being prepared…'));
  assert(continuation.includes('realityTvQueueNextEpisodePreparation_'), 'N+1 must use durable RealityNextEpisodeJobs path');
  assert(season.includes('function realityTvContinueNextEpisodeJobs('), 'next-episode continuation trigger entry point must remain present');
  assert(season.includes('realityTvScheduleNextEpisodeContinuation_'), 'durable next-episode job must retain trigger scheduling');
}

// ---------------------------------------------------------------------------
// 5) Styling + cache delivery markers.
// ---------------------------------------------------------------------------
for (const cls of [
  '.reality-player-top-stack', '.reality-current-episode-card', '.reality-results-ready-card',
  '.reality-results-ready-button', '.reality-spoiler-pick-block', '.reality-previous-episodes'
]) assert(styles.includes(cls), `missing Results Ready style ${cls}`);
assert.strictEqual(app, appMirror, 'frontend app mirrors must remain byte-identical');
for (const source of [html, app, appMirror, pwa, sw]) {
  assert(source.includes('v1219rc16-reality-results-ready'), 'all delivery/cache surfaces must carry the Results Ready marker');
}

console.log('reality-awards-rc16-results-ready-followup-tests: PASS');
