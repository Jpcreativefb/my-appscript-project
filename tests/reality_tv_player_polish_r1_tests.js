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
// 1) Spoiler Shield is a compact two-line action and preserves the reveal API.
// ---------------------------------------------------------------------------
{
  const on = runFunctions(picks, ['renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => ({ episodeId: 'ep-2', episodeNumber: 2 }),
    escapeJs: esc,
    escapeHtml: esc
  }).renderRealityTvSpoilerShield_();
  assert(on.includes('Spoiler Shield: ON'));
  assert(on.includes('Show Episode Results Now'));
  assert(on.includes("revealRealityTvEpisode_('ep-2')"), 'ON action must use existing reveal logic');
  assert(!on.includes('Episode 2 is protected'), 'Shield must remain a compact two-line main control');

  const off = runFunctions(picks, ['renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => null,
    escapeJs: esc,
    escapeHtml: esc
  }).renderRealityTvSpoilerShield_();
  assert(off.includes('Spoiler Shield: OFF'));
  assert(off.includes('Episode Results Revealed'));
  assert(/reality-spoiler-main-button" disabled/.test(off), 'revealed state must be informative, not another reveal action');

  const reveal = functionSource(picks, 'revealRealityTvEpisode_');
  assert(reveal.includes('apiRevealRealityTvEpisode'), 'existing reveal API must remain authoritative');
  assert(reveal.includes('refreshRealityTvAfterSpoilerChange_'));
}

// ---------------------------------------------------------------------------
// 2) Sole Survivor uses actual runtime scroll state, not CSS-only sticky.
// ---------------------------------------------------------------------------
{
  const classes = new Set();
  const props = {};
  const classList = {
    add: name => classes.add(name),
    remove: name => classes.delete(name),
    toggle: (name, on) => { if (on) classes.add(name); else classes.delete(name); }
  };
  let bodyBottom = 20;
  const style = {
    setProperty: (k, v) => { props[k] = v; },
    removeProperty: k => { delete props[k]; }
  };
  const header = { style };
  const body = { getBoundingClientRect: () => ({ bottom: bodyBottom }) };
  const card = {
    open: true,
    classList,
    querySelector: selector => selector.includes('sticky-header') ? header : selector.includes('card-body') ? body : null,
    getBoundingClientRect: () => ({ top: -200, left: 80, width: 640 })
  };
  const ctx = runFunctions(picks, ['updateRealityTvSoleSurvivorSticky_'], {
    document: { querySelector: () => card }
  });
  ctx.updateRealityTvSoleSurvivorSticky_();
  assert(classes.has('is-scroll-compact'), 'scrolling beyond the expanded body must enable compact sticky state');
  assert.strictEqual(props['--reality-sticky-left'], '80px');
  assert.strictEqual(props['--reality-sticky-width'], '640px');

  bodyBottom = 500;
  ctx.updateRealityTvSoleSurvivorSticky_();
  assert(!classes.has('is-scroll-compact'), 'scrolling back to the expanded body must restore expanded state');
  assert(!('--reality-sticky-left' in props));

  const mount = functionSource(picks, 'mountRealityTvSoleSurvivorSticky_');
  assert(mount.includes('addEventListener("scroll"'));
  assert(mount.includes('addEventListener("resize"'));
  assert(mount.includes('addEventListener("toggle"'), 'details open/close must also refresh sticky runtime state');
  assert(mount.includes('view.enabled !== true') && mount.includes('removeEventListener("scroll"'), 'sticky runtime must be gated to Reality and unbind outside it');
  assert(picksCss.includes('.reality-sole-survivor-card.is-scroll-compact .reality-sole-survivor-sticky-header'));
  assert(picks.includes('Sole Survivor · ${escapeHtml(selectedName)}'));
}

// More Stats and contestant detail hierarchy stays intentionally secondary/dense.
assert(picksCss.includes('.reality-sole-survivor-more-button { width:auto'));
assert(picksCss.includes('min-height:26px'));
assert(picksCss.includes('background:transparent!important'));
assert(picksCss.includes('.reality-sole-survivor-bio-copy { max-height:150px;overflow-y:auto'));
assert(picksCss.includes('.reality-profile-panel') && picksCss.includes('max-height:122px'));

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
    { id: 'q2', question: 'Who won reward?', nominees: [{ id: 'cara', name: 'Cara' }], winnerNomineeIds: ['cara'] },
    { id: 'q1', question: 'Who was eliminated?', questionType: 'elimination', nominees: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], winnerNomineeIds: ['bob'] }
  ];
  const data = { realityTvView: view, categories, picks: { q1: 'alice', q2: 'cara', q3: 'now' } };
  const ctx = runFunctions(picks, ['realityTvHistoricalPickDetailsHtml_', 'renderRealityTvEpisodeSections_'], {
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
assert(compareRender.includes('compare-picks-content'));
assert(compareRender.includes('compare-filter-bar compact'));
assert(compareRender.includes('compare-picks-list'));
assert(compareRender.includes('renderCompareProfile_'));
assert(compareRender.includes('reality-compare-episode-picker'));
assert(!compareRender.includes('reality-tv-comparison-grid'), 'old Reality-only compare table must not be emitted');
assert(!compareRender.includes('Visible After Lock'), 'old Reality-only comparison label must be gone');
assert(functionSource(picks, 'selectRealityTvComparisonEpisode_').includes('apiGetRealityTvEpisodeComparison(PICKS_PAGE_DATA.gameId, episodeId)'));

// ---------------------------------------------------------------------------
// 5) Common standings, vote detail, mobile, and no scope leakage.
// ---------------------------------------------------------------------------
const summary = functionSource(picks, 'renderRealityTvPlayerSummary_');
assert(summary.includes('reality-common-standings'));
assert(summary.includes('<summary>Standings</summary>'));
assert(summary.includes(' open>'), 'Standings must remain default-open');
assert(functionSource(picks, 'realityTvCommonStandingsHtml_').includes('leaderboard-card'));

const vote = functionSource(picks, 'realityTvEpisodeVoteDetailsHtml_');
assert(vote.includes('<th>Voter</th><th>Voted for</th><th>Round</th><th>Status</th><th>Value</th>'));

assert(picksCss.includes('@media(max-width:520px)'));
assert(picksCss.includes('.reality-clean-enhanced .reality-compare-player-row { grid-template-columns:1fr; }'));
assert(picksCss.includes('.reality-clean-enhanced .reality-sole-survivor-grid { grid-template-columns:1fr; }'));
assert(picksCss.includes('overflow-wrap:anywhere'));

// Narrow backend exception only: no scoring/storage/season-builder code is introduced here.
for (const banned of ['apiSavePick', 'adminCreateRealityTvSeason', 'realityTvScore', 'cast import']) {
  assert(!functionSource(reality, 'realityTvLockedEpisodeComparisonPayload_').toLowerCase().includes(banned.toLowerCase()), `comparison adapter must not introduce ${banned}`);
}

console.log('Reality TV Player Polish R1 browser-findings correction tests passed.');
