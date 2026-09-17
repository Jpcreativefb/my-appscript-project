'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const picks = read('frontend/js/pages/picks.js');
const picksCss = read('frontend/css/picks.css');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const backendApi = read('backend/Api.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');

function functionSource(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) {
    start = source.indexOf(marker);
    if (start >= 0) break;
  }
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
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON, Boolean, Promise, setTimeout, clearTimeout }, context);
  vm.createContext(sandbox);
  names.forEach(name => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

const normalizeId = value => String(value == null ? '' : value).trim().toLowerCase();
const esc = value => String(value == null ? '' : value);

// ---------------------------------------------------------------------------
// 1) Spoiler Shield is a compact current-result action with separate future preference.
// ---------------------------------------------------------------------------
{
  const hidden = runFunctions(picks, ['renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => ({ episodeId: 'ep-2', episodeNumber: 2 }),
    escapeJs: esc,
    escapeHtml: esc
  }).renderRealityTvSpoilerShield_();
  assert(hidden.includes('Results Hidden'));
  assert(hidden.includes('Reveal Results'));
  assert(hidden.includes('Future results protection: ON'));
  assert(hidden.includes('role="button"') && hidden.includes('activateRealityTvSpoilerShield_'), 'hidden current results must make the whole Shield row actionable');
  assert(functionSource(picks, 'activateRealityTvSpoilerShield_').includes('revealRealityTvEpisode_'), 'whole-row action must route through existing reveal logic');

  const revealed = runFunctions(picks, ['renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => null,
    escapeJs: esc,
    escapeHtml: esc
  }).renderRealityTvSpoilerShield_();
  assert(revealed.includes('Results Revealed'));
  assert(revealed.includes('Episode results are visible'));
  assert(revealed.includes('role="group"') && revealed.includes('aria-disabled="true"'), 'revealed state must be informative, not fake a reversible current-result toggle');

  const reveal = functionSource(picks, 'revealRealityTvEpisode_');
  assert(reveal.includes('apiRevealRealityTvEpisode'), 'existing reveal API must remain authoritative');
  assert(reveal.includes('refreshRealityTvAfterSpoilerChange_'));
  const pref = functionSource(picks, 'saveRealityTvSpoilerPreference_');
  assert(pref.includes('setRealityTvSpoilerPreferenceFeedback_("Saving…", false)'), 'future-results preference save must use local status feedback');
}

// ---------------------------------------------------------------------------
// 2) Sole Survivor is a normal collapsible section; old sticky runtime only cleans up.
// ---------------------------------------------------------------------------
{
  const anchor = functionSource(picks, 'renderSeasonAnchorPickCard_');
  assert(anchor.includes('<details class="season-anchor-card reality-sole-survivor-card'));
  assert(anchor.includes('reality-sole-survivor-heading-line'));
  assert(anchor.includes('season-anchor-status'));
  assert(anchor.includes('open>'), 'Sole Survivor should start expanded but remain a normal details control');

  const update = functionSource(picks, 'updateRealityTvSoleSurvivorSticky_');
  assert(update.includes('classList.remove("is-scroll-compact")'));
  assert(!update.includes('getBoundingClientRect'), 'R4 must abandon scroll geometry transitions');
  const mount = functionSource(picks, 'mountRealityTvSoleSurvivorSticky_');
  assert(mount.includes('removeEventListener("scroll"'));
  assert(mount.includes('removeEventListener("resize"'));
  assert(!mount.includes('addEventListener("scroll"'));
  assert(!mount.includes('addEventListener("resize"'));
  assert(picksCss.includes('.reality-sole-survivor-card.is-scroll-compact .reality-sole-survivor-sticky-header'));
}

// More Stats and contestant detail hierarchy stays intentionally secondary/dense.
assert(picksCss.includes('.reality-sole-survivor-actions'));
assert(picksCss.includes('reality-sole-survivor-more-button'));
assert(picks.includes('showRealityTvContestantDetailModal_'));
assert(picksCss.includes('.reality-contestant-modal-body'));

// ---------------------------------------------------------------------------
// 3) Historical episode renderer is data-deduped and keeps pick/result details.
// ---------------------------------------------------------------------------
{
  const view = {
    enabled: true,
    season: { periodLabel: 'Episode' },
    spoilerShield: { hiddenEpisodeIds: [] },
    episodes: [
      { episodeId: 'ep-3', episodeNumber: 3, episodeName: 'Episode 3', status: 'OPEN' },
      { episodeId: 'ep-2', episodeNumber: 2, episodeName: 'Episode 2', status: 'FINAL', eliminated: [{ name: 'Cara' }] },
      { episodeId: 'ep-1', episodeNumber: 1, episodeName: 'Episode 1', status: 'FINAL', eliminated: [{ name: 'Bob' }] },
      { episodeId: 'ep-1', episodeNumber: 1, episodeName: 'Episode 1 DUPLICATE', status: 'FINAL', eliminated: [{ name: 'Bob' }] }
    ]
  };
  const categories = [
    { id: 'q3', question: 'Current question', nominees: [{ id: 'now', name: 'Now' }] },
    { id: 'q2', question: 'Who won reward?', points: 10, nominees: [{ id: 'cara', name: 'Cara' }], winnerNomineeIds: ['cara'] },
    { id: 'q1', question: 'Who was eliminated?', questionType: 'elimination', points: 1, nominees: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], winnerNomineeIds: ['bob'] }
  ];
  const data = { realityTvView: view, categories, picks: { q1: 'alice', q2: 'cara', q3: 'now' }, changeCounts: {}, confidencePoints: {}, confidenceScoringMode: 'win_only', game: {}, seasonAnchor: { user: { currentEntityName: 'Charlie', streak: 3, currentMultiplier: 1.15 }, stats: { recent: [{ bonus: 1.1 }], history: [{ episodeId:'ep-1', episodeNumber:1, entityName:'Charlie', streak:3, multiplier:1.15, bonus:1.1, outcome:'SURVIVED' }, { episodeId:'ep-2', episodeNumber:2, entityName:'Charlie', streak:3, multiplier:1.15, bonus:1.1, outcome:'SURVIVED' }] }, settings: { StartMultiplier: 1 } } };
  const ctx = runFunctions(picks, ['normalizePicksScoreMode_', 'realityTvFormatPoints_', 'formatSeasonAnchorMultiplier_', 'realityTvHistoricalPointsAwarded_', 'realityTvBrowserImageUrl_', 'realityTvContestantImageUrl_', 'realityTvImageWithFallbackHtml_', 'realityTvHistoricalSeasonAnchorForEpisode_', 'realityTvHistoricalSeasonAnchorHtml_', 'realityTvHistoricalSeasonAnchorMountHtml_', 'realityTvHistoricalPickDetailsHtml_', 'renderRealityTvEpisodeSections_'], {
    PICKS_PAGE_DATA: data,
    normalizeId,
    escapeHtml: esc,
    escapeAttr: esc,
    realityTvCurrentEpisode_: () => view.episodes[0],
    realityTvBlockingHiddenEpisode_: () => null,
    realityTvEpisodeCategoryMap_: () => ({ q1: 1, q2: 2, q3: 3 }),
    realityTvEpisodeResultState_: () => 'Results Pending',
    realityTvEpisodeHeaderStats_: () => '<div class="stats">stats</div>',
    realityTvFinalizedAtText_: episode => `Finalized Episode ${episode.episodeNumber}`,
    realityTvEpisodeEliminatedText_: episode => (episode.eliminated || []).map(x => x.name).join(', ') || 'None',
    realityTvEpisodeVoteDetailsHtml_: () => '',
    renderPicksCategoryCards_: items => `<div class="current-cards">${items.map(x => x.id).join(',')}</div>`,
    getSelectedNominee: category => (category.nominees || []).find(n => normalizeId(n.id) === normalizeId(data.picks[category.id])) || null,
    getWinnerNominees: category => (category.nominees || []).filter(n => (category.winnerNomineeIds || []).map(normalizeId).includes(normalizeId(n.id))),
    realityTvQuestionType_: category => normalizeId(category.questionType),
    getCategoryDisplayTitle: category => category.question || category.name || category.id
  });
  const html = ctx.renderRealityTvEpisodeSections_(categories);
  assert.strictEqual((html.match(/data-reality-history-episode="ep-1"/g) || []).length, 1, 'duplicate source episode rows must render once');
  assert.strictEqual((html.match(/<details class="reality-previous-episodes">/g) || []).length, 1, 'Previous Episodes wrapper must render once');
  assert(html.includes('Episode 1</h3><span>Eliminated: Bob'));
  assert(!html.includes('Previous Episode</'), 'old repeated Previous Episode tag must not return');
  assert(html.includes('<span>Your pick</span><strong>Alice</strong>'));
  assert(html.includes('<span>Eliminated</span><strong>Bob</strong>'));
  assert(html.includes('<span>Your pick</span><strong>Cara</strong>'));
  assert(html.includes('<span>Result</span><strong>Cara</strong>'));
  assert(html.includes('Sole Survivor') && html.includes('<strong>Charlie</strong>'));
  assert(!html.includes('Current Sole Survivor'), 'historical rows must not substitute the current pick');
  assert(html.includes('Streak 3') && html.includes('Bonus +1.1 pts · 1.15x'));
  assert(html.includes('Points +10 pts'), 'correct historical question should show points awarded');
  assert(html.includes('Points 0 pts'), 'wrong historical question should show zero points awarded');
  assert(!html.includes('reality-profile-bio'), 'historical episode answers must not repeat contestant biographies');
}

// DOM refresh must remove any detached/moved history block before rebuilding.
{
  let removes = 0;
  const history = { parentNode: { removeChild: node => { assert.strictEqual(node, history); removes++; history.parentNode = null; } } };
  const categoryList = { innerHTML: '', contains: () => false };
  const doc = {
    getElementById: id => id === 'picksCategoryList' ? categoryList : null,
    querySelectorAll: selector => selector === '.reality-previous-episodes' ? [history] : [],
    querySelector: () => null
  };
  const ctx = runFunctions(picks, ['refreshPicksPage'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true } },
    document: doc,
    renderPicksCategoryList: () => '<div>fresh</div>',
    hasConfidencePointsCategories: () => false,
    hasStakedPointsCategories: () => false,
    mountPicksPage: () => {}
  });
  ctx.refreshPicksPage();
  ctx.refreshPicksPage();
  assert.strictEqual(removes, 1, 'repeated refreshes must not append/retain another moved Previous Episodes block');
  assert.strictEqual(categoryList.innerHTML, '<div>fresh</div>');
}

// ---------------------------------------------------------------------------
// 4) Historical Compare adapter: latest eligible by default, older selectable,
// hidden/unlocked episodes never reach group-pick reads.
// ---------------------------------------------------------------------------
{
  let hiddenEp2 = true;
  let picksReads = 0;
  const coreForUser = () => ({
    enabled: true,
    season: { seasonId: 'season-1', periodLabel: 'Episode', currentEpisodeNumber: 3 },
    episodes: [
      { episodeId: 'ep-3', episodeNumber: 3, episodeName: 'Episode 3', status: 'OPEN', resultsHidden: false },
      { episodeId: 'ep-2', episodeNumber: 2, episodeName: 'Episode 2', status: 'FINAL', resultsHidden: hiddenEp2 },
      { episodeId: 'ep-1', episodeNumber: 1, episodeName: 'Episode 1', status: 'FINAL', resultsHidden: false }
    ],
    episodeQuestions: []
  });
  const categories = [
    { id: 'q1', name: 'Episode 1 pick', nominees: [{ id: 'n1', name: 'Alpha' }] },
    { id: 'q2', name: 'Episode 2 pick', nominees: [{ id: 'n2', name: 'Bravo' }] }
  ];
  const ctx = runFunctions(reality, ['realityTvEpisodeLockedForComparison_', 'realityTvLockedEpisodeComparisonPayload_'], {
    realityTvUserGameViewPayload_: () => JSON.parse(JSON.stringify(coreForUser())),
    realityTvNumber_: (v, f) => Number.isFinite(Number(v)) ? Number(v) : Number(f || 0),
    realityTvKey_: normalizeId,
    realityTvString_: esc,
    realityTvSlug_: normalizeId,
    realityTvEpisodeStatsCategoryMap_: () => ({ 1: ['q1'], 2: ['q2'] }),
    getCategoriesCached: () => categories,
    buildUserPicksMap_: () => { picksReads++; return { alice: { q1: { nomineeId: 'n1' }, q2: { nomineeId: 'n2' } } }; }
  });

  picksReads = 0;
  let payload = ctx.realityTvLockedEpisodeComparisonPayload_('game-1', 'viewer', '');
  assert.strictEqual(payload.available, true);
  assert.strictEqual(payload.episode.episodeId, 'ep-1', 'default must choose latest locked episode that is eligible/revealed');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(payload.eligibleEpisodes.map(x => x.episodeId))), ['ep-1']);
  assert.strictEqual(picksReads, 1);

  picksReads = 0;
  payload = ctx.realityTvLockedEpisodeComparisonPayload_('game-1', 'viewer', 'ep-2');
  assert.strictEqual(payload.available, false);
  assert.strictEqual(payload.hiddenBySpoiler, true);
  assert.strictEqual(picksReads, 0, 'hidden episode request must be rejected before reading group picks');

  picksReads = 0;
  payload = ctx.realityTvLockedEpisodeComparisonPayload_('game-1', 'viewer', 'ep-3');
  assert.strictEqual(payload.available, false);
  assert.strictEqual(payload.invalidEpisode, true);
  assert.strictEqual(picksReads, 0, 'unlocked episode request must be rejected before reading group picks');

  hiddenEp2 = false;
  picksReads = 0;
  payload = ctx.realityTvLockedEpisodeComparisonPayload_('game-1', 'viewer', '');
  assert.strictEqual(payload.episode.episodeId, 'ep-2', 'after reveal, latest eligible locked episode must become default');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(payload.eligibleEpisodes.map(x => x.episodeId))), ['ep-2', 'ep-1']);
  assert.strictEqual(picksReads, 1);
}

assert.strictEqual(frontendApi, frontendApiMirror, 'frontend API mirrors must remain byte-identical');
assert(functionSource(frontendApi, 'apiGetRealityTvEpisodeComparison').includes('episodeId: episodeId || ""'));
assert(backendApi.includes('episodeId: params.episodeId'));
assert(functionSource(reality, 'apiGetRealityTvEpisodeComparison').includes('payload.episodeId'));

const compareRender = functionSource(picks, 'renderRealityTvEpisodeComparison_');
assert(compareRender.includes('reality-standings-compare-shell'));
assert(compareRender.includes('Standings &amp; Compare'));
assert(compareRender.includes('reality-standings-compare-tabs'));
assert(compareRender.includes('compare-filter-bar compact'));
assert(compareRender.includes('reality-compare-matrix'));
assert(compareRender.includes('reality-compare-player-column-head'));
assert(compareRender.includes('reality-compare-pick-cell'));
assert(compareRender.includes('reality-compare-episode-picker'));
assert(!compareRender.includes('<details class="card reality-standings-compare-shell" open'), 'combined shell must default collapsed');
assert(!compareRender.includes('reality-tv-comparison-grid'), 'old Reality-only compare table must not be emitted');
assert(!compareRender.includes('Visible After Lock'), 'old Reality-only comparison label must be gone');
assert(functionSource(picks, 'selectRealityTvComparisonEpisode_').includes('apiGetRealityTvEpisodeComparison(PICKS_PAGE_DATA.gameId, episodeId)'));

// ---------------------------------------------------------------------------
// 5) Common standings, vote detail, mobile, and no scope leakage.
// ---------------------------------------------------------------------------
const summary = functionSource(picks, 'renderRealityTvPlayerSummary_');
assert(summary.includes('Your Season'));
assert(summary.includes('<span>PTS</span>'));
assert(summary.includes('<span>Multiplier</span>'));
assert(!summary.includes('<summary>Standings</summary>'), 'Standings must no longer live inside Your Season');
assert(functionSource(picks, 'realityTvCommonStandingsHtml_').includes('reality-common-standings-table'));
assert(functionSource(picks, 'realityTvCommonStandingsHtml_').includes('<th>Rank</th><th>User</th><th>Total Pts</th><th>Pts Behind</th><th>Streak</th><th>Multiplier Bonus</th><th>Sole Survivor</th>'));
assert(compareRender.includes('realityTvCommonStandingsHtml_'));

const vote = functionSource(picks, 'realityTvEpisodeVoteDetailsHtml_');
assert(vote.includes('<th>Voter</th><th>Voted for</th><th>Round</th><th>Status</th><th>Value</th>'));

assert(picksCss.includes('@media(max-width:760px)'));
assert(picksCss.includes('.reality-player-page.reality-clean-enhanced .reality-sole-survivor-grid{grid-template-columns:minmax(126px,.76fr) minmax(0,1.24fr)!important'));
assert(picksCss.includes('.reality-player-page.reality-clean-enhanced .reality-compare-matrix{grid-template-columns:minmax(82px,.7fr) repeat(var(--reality-compare-players),minmax(104px,1fr))'));
assert(picksCss.includes('overflow-wrap:anywhere'));

// Narrow backend exception only: no scoring/storage/season-builder code is introduced here.
for (const banned of ['apiSavePick', 'adminCreateRealityTvSeason', 'realityTvScore', 'cast import']) {
  assert(!functionSource(reality, 'realityTvLockedEpisodeComparisonPayload_').toLowerCase().includes(banned.toLowerCase()), `comparison adapter must not introduce ${banned}`);
}

console.log('Reality TV Player Polish R1 browser-findings correction tests passed.');
