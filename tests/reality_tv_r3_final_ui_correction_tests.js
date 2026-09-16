'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const picks = read('frontend/js/pages/picks.js');
const css = read('frontend/css/picks.css');

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

// 1) Whole-row Spoiler Shield action keeps existing reveal semantics.
{
  const ctx = runFunctions(picks, ['activateRealityTvSpoilerShield_', 'renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => ({ episodeId: 'ep-9' }),
    escapeJs: esc,
    escapeHtml: esc,
    revealRealityTvEpisode_: id => { ctx.revealed = id; }
  });
  const html = ctx.renderRealityTvSpoilerShield_();
  assert(html.includes('role="button" tabindex="0"'));
  assert(html.includes('onclick="activateRealityTvSpoilerShield_'));
  assert(html.includes('onkeydown="activateRealityTvSpoilerShield_'));
  ctx.activateRealityTvSpoilerShield_({ type: 'click', target: { closest: () => null }, preventDefault() {} }, 'ep-9');
  assert.strictEqual(ctx.revealed, 'ep-9');
}

// 2) R4 replaces sticky/disappearing behavior with a normal collapsible section.
{
  const anchor = functionSource(picks, 'renderSeasonAnchorPickCard_');
  assert(anchor.includes('<details class="season-anchor-card reality-sole-survivor-card'));
  assert(anchor.includes('<summary class="season-anchor-card-header reality-sole-survivor-sticky-header">'));
  assert(anchor.includes('reality-sole-survivor-heading-line'));
  assert(anchor.includes('open>'));

  const update = functionSource(picks, 'updateRealityTvSoleSurvivorSticky_');
  assert(update.includes('classList.remove("is-scroll-compact")'));
  assert(!update.includes('getBoundingClientRect'), 'R4 cleanup must not use scroll geometry');
  const mount = functionSource(picks, 'mountRealityTvSoleSurvivorSticky_');
  assert(mount.includes('removeEventListener("scroll"'));
  assert(mount.includes('removeEventListener("resize"'));
  assert(!mount.includes('addEventListener("scroll"'));
  assert(!mount.includes('addEventListener("resize"'));
  assert(css.includes('Sole Survivor is now a normal collapsible section'));
}

// 3) Shared contestant modal is wired to Sole Survivor and Season Cast; question cards stay compact.
{
  const modal = functionSource(picks, 'showRealityTvContestantDetailModal_');
  assert(modal.includes('realityTvContestantDetailModal'));
  assert(modal.includes('realityTvProfileDetailsHtml_'));
  const anchor = functionSource(picks, 'renderSeasonAnchorPickCard_');
  const nominee = functionSource(picks, 'renderRealityNomineeButton_');
  assert(anchor.includes('data-reality-contestant-id') && anchor.includes('showRealityTvContestantDetailModal_(this.dataset.realityContestantId)'));
  assert(!nominee.includes('showRealityTvContestantDetailModal_'), 'question-selection cards must not expand contestant bios/details in R4');
  assert(!nominee.includes('reality-profile-toggle'));
  assert(picks.includes('reality-clean-cast-eliminated'));
  assert(picks.includes('showRealityTvContestantDetailModal_'));
}

// 4) Previous Episodes remain deduped/idempotent and show current Sole Survivor.
{
  const historical = functionSource(picks, 'realityTvHistoricalPickDetailsHtml_');
  const historicalAnchor = functionSource(picks, 'realityTvHistoricalSeasonAnchorHtml_');
  assert(historical.includes('realityTvHistoricalSeasonAnchorMountHtml_(episode)'));
  assert(!historical.includes('Current Sole Survivor'));
  assert(historicalAnchor.includes('weeklyAnchor.entityName'));
  const sections = functionSource(picks, 'renderRealityTvEpisodeSections_');
  assert(sections.includes('const episodeSeen = {}'));
  assert(sections.includes('if (episodeSeen[key]) return false'));
  assert(sections.includes('currentHtml + previousHtml + otherHtml'));
  const refresh = functionSource(picks, 'refreshPicksPage');
  assert(refresh.includes('renderPicksCategoryList()'));
}

// 5) Locked order: Current + Previous remain together, cast then Your Season then combined shell then help.
{
  assert(picks.includes('Locked R3 Reality order: Hero -> Spoiler Shield -> Sole Survivor ->'));
  const orderBlockStart = picks.indexOf('Locked R3 Reality order: Hero -> Spoiler Shield -> Sole Survivor ->');
  const orderBlock = picks.slice(orderBlockStart, orderBlockStart + 2600);
  assert(orderBlock.indexOf('categoryList.insertAdjacentHTML("afterend", html)') < orderBlock.indexOf('cast.insertAdjacentElement("afterend", summaryMount)'));
  assert(orderBlock.indexOf('cast.insertAdjacentElement("afterend", summaryMount)') < orderBlock.indexOf('summaryMount.insertAdjacentElement("afterend", comparisonMount)'));
  assert(orderBlock.indexOf('summaryMount.insertAdjacentElement("afterend", comparisonMount)') < orderBlock.indexOf('comparisonMount.insertAdjacentElement("afterend", rulesMount)'));
}

// 6) Combined Standings & Compare shell uses tabs, selector, common standings, and defaults collapsed.
{
  const compare = functionSource(picks, 'renderRealityTvEpisodeComparison_');
  assert(compare.includes('Standings &amp; Compare'));
  assert(compare.includes('reality-standings-compare-tabs'));
  assert(compare.includes("setRealityTvStandingsCompareTab_('standings')"));
  assert(compare.includes("setRealityTvStandingsCompareTab_('compare')"));
  assert(compare.includes('realityTvCommonStandingsHtml_(rows)'));
  assert(compare.includes('reality-compare-episode-picker'));
  assert(compare.includes('reality-compare-matrix'));
  assert(compare.includes('reality-compare-player-column-head'));
  assert(!compare.includes('reality-standings-compare-shell" open'), 'R3 shell must default collapsed');
}

// 7) Help / How to Play is a single populated, collapsed bottom shell using configured Reality mechanics.
{
  const help = functionSource(picks, 'renderRealityTvRulesHelp_');
  assert(help.includes('reality-help-shell'));
  assert(help.includes('Help / How to Play'));
  assert(help.includes('game.rules || game.rulesText'));
  assert(help.includes('game.howToPlay || game.instructions'));
  assert(help.includes('Sole Survivor'));
  assert(help.includes('Spoiler Shield'));
  assert(!help.includes('reality-help-shell" open'), 'Help / How to Play must default collapsed');
  assert(picks.includes('id="realityTvRulesHelpMount"'));
}

// 8) Mobile contract: condensed desktop, not a stacked redesign.
{
  assert(css.includes('.reality-player-page.reality-clean-enhanced .reality-sole-survivor-grid{grid-template-columns:minmax(126px,.76fr) minmax(0,1.24fr)!important'));
  assert(css.includes('.reality-player-page.reality-clean-enhanced .reality-episode-picks-section.current .pick-category-card.collapsed .pick-header-main{grid-template-columns:minmax(0,55%) minmax(0,45%)!important'));
  assert(css.includes('.reality-player-page.reality-clean-enhanced .reality-compare-matrix{grid-template-columns:minmax(82px,.7fr) repeat(var(--reality-compare-players),minmax(104px,1fr))'));
  assert(css.includes('.reality-player-page.reality-clean-enhanced .reality-player-summary-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important'));
  const r4Css = css.slice(css.indexOf('PATTC REALITY R4'));
  assert(!/reality-sole-survivor-grid\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(r4Css));
  assert(!/pick-header-main\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(r4Css));
}

// 9) Saved Current Episode card keeps horizontal text/image composition and simplified points.
{
  assert(css.includes('grid-template-columns:minmax(0,55%) minmax(0,45%)!important'));
  assert(css.includes('.selected-pick-summary img{position:absolute;inset:0;width:100%!important;height:100%!important'));
  assert(css.includes('object-fit:cover!important'));
  assert(css.includes('.selected-pick-summary::after{content:"";position:absolute'));
  assert(css.includes('.reality-selected-points'));
  assert(css.includes('[data-locked="true"] .pick-third-line'));
  const cardRenderer = functionSource(picks, 'renderCategoryCard');
  assert(cardRenderer.includes('reality-selected-points'));
  assert(cardRenderer.includes('${adjustedPoints} pts'));
}

// 10) No new mechanics/API work is introduced by this UI-only R3 pass.
for (const token of ['apiSavePick', 'adminCreateRealityTvSeason', 'realityTvScore']) {
  assert(!functionSource(picks, 'renderRealityTvRulesHelp_').includes(token));
}

// 11) R3 v4 Previous Episode and Your Season final verification contracts.
{
  const vote = functionSource(picks, 'realityTvEpisodeVoteDetailsHtml_');
  assert(vote.includes('<strong>Vote Details</strong>'), 'player vote history header must be Vote Details');
  assert(!vote.includes('Episode Vote Details'), 'old player vote header must not return');

  const historical = functionSource(picks, 'realityTvHistoricalPickDetailsHtml_');
  const historicalAnchor = functionSource(picks, 'realityTvHistoricalSeasonAnchorHtml_');
  assert(historical.includes('realityTvHistoricalSeasonAnchorMountHtml_(episode)'));
  assert(!historical.includes('Current Sole Survivor'));
  assert(historicalAnchor.includes('const streak'));
  assert(historicalAnchor.includes('const bonus'));
  assert(historicalAnchor.includes('const multiplier'));
  assert(historical.includes('reality-history-points'));

  const pointsCtx = runFunctions(picks, ['normalizePicksScoreMode_', 'realityTvHistoricalPointsAwarded_'], {
    PICKS_PAGE_DATA: { game: {}, changeCounts: {}, confidencePoints: {}, confidenceScoringMode: 'win_only' }
  });
  assert.strictEqual(pointsCtx.realityTvHistoricalPointsAwarded_({ id: 'q', scoreMode: 'correct-pick', points: 10 }, 'correct'), 10);
  assert.strictEqual(pointsCtx.realityTvHistoricalPointsAwarded_({ id: 'q', scoreMode: 'correct-pick', points: 10 }, 'wrong'), 0);
  pointsCtx.PICKS_PAGE_DATA.game.confidenceEnabled = true;
  pointsCtx.PICKS_PAGE_DATA.confidencePoints.q = 12;
  pointsCtx.PICKS_PAGE_DATA.changeCounts.q = 1;
  pointsCtx.PICKS_PAGE_DATA.confidenceScoringMode = 'risk_penalty';
  assert.strictEqual(pointsCtx.realityTvHistoricalPointsAwarded_({ id: 'q', scoreMode: 'confidence-points', changePenalty: 2 }, 'correct'), 10);
  assert.strictEqual(pointsCtx.realityTvHistoricalPointsAwarded_({ id: 'q', scoreMode: 'confidence-points', changePenalty: 2 }, 'wrong'), -10);
  const pointsHelper = functionSource(picks, 'realityTvHistoricalPointsAwarded_');
  assert(!/apiSave|SpreadsheetApp|setValue|appendRow|savePick|write/i.test(pointsHelper), 'historical points helper must remain display-only');

  assert(css.includes('.reality-episode-picks-section.previous .reality-history-answer-row.correct{border-color:rgba(34,197,94,.42);background:rgba(34,197,94,.065)}'));
  assert(css.includes('.reality-episode-picks-section.previous .reality-history-answer-row.wrong{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.06)}'));
  assert(css.includes('.reality-episode-picks-section.previous .reality-player-vote-details{width:100%;box-sizing:border-box;margin:6px 0 0'));
  assert(css.includes('.reality-episode-picks-section.previous .reality-history-answer-list{width:100%;box-sizing:border-box;padding:6px 0 0}'));
  assert(css.includes('.reality-player-vote-details>summary strong{font-size:.7rem'));
  assert(css.includes('.reality-player-page.reality-clean-enhanced .reality-player-summary-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important'));
  assert(functionSource(picks, 'renderRealityTvPlayerSummary_').includes('<span>PTS</span>'));
  assert(functionSource(picks, 'renderRealityTvPlayerSummary_').includes('<span>Multiplier</span>'));
  assert(!functionSource(picks, 'renderRealityTvPlayerSummary_').includes('Survivor Adjustment'));
}

console.log('Reality TV R3 final UI correction focused tests passed.');
