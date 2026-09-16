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
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON, Boolean, Promise, Set, setTimeout, clearTimeout }, context);
  vm.createContext(sandbox);
  names.forEach(name => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

const esc = value => String(value == null ? '' : value);
const normalizeId = value => String(value == null ? '' : value).trim().toLowerCase();

// 1) Spoiler current-result state is explicit and separate from future-result preference.
{
  const hiddenCtx = runFunctions(picks, ['renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => ({ episodeId: 'ep-5' }), escapeJs: esc, escapeHtml: esc
  });
  const hidden = hiddenCtx.renderRealityTvSpoilerShield_();
  assert(hidden.includes('Results Hidden'));
  assert(hidden.includes('Reveal Results'));
  assert(hidden.includes('Future results: Protected'));
  assert(hidden.includes('data-reality-spoiler-reveal="ep-5"'));
  assert(hidden.includes('data-reality-spoiler-preference="false"'));
  assert(!hidden.includes('onclick="activateRealityTvSpoilerShield_'));

  const revealedCtx = runFunctions(picks, ['renderRealityTvSpoilerShield_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: false } } },
    realityTvBlockingHiddenEpisode_: () => null, escapeJs: esc, escapeHtml: esc
  });
  const revealed = revealedCtx.renderRealityTvSpoilerShield_();
  assert(revealed.includes('Results Revealed'));
  assert(revealed.includes('Episode results are visible'));
  assert(revealed.includes('Future results: Auto reveal'));
  assert(!revealed.includes('role="button"'), 'revealed current-result state must not fake a reversible reveal toggle');

  assert(functionSource(picks, 'saveRealityTvSpoilerPreference_').includes('Saving future-results preference'));
  assert(functionSource(picks, 'revealRealityTvEpisode_').includes('apiRevealRealityTvEpisode'));
}

// 2) Sole Survivor is an ordinary collapsible section and the old runtime only tears down sticky listeners/state.
{
  const anchor = functionSource(picks, 'renderSeasonAnchorPickCard_');
  assert(anchor.includes('<details class="season-anchor-card reality-sole-survivor-card'));
  assert(anchor.includes('<summary class="season-anchor-card-header reality-sole-survivor-sticky-header">'));
  assert(anchor.includes('reality-sole-survivor-heading-line'));
  assert(anchor.includes('season-anchor-status'));
  assert(anchor.includes('Multiplier ${formatSeasonAnchorMultiplier_(currentMultiplier)}'));
  assert(anchor.includes('reality-sole-survivor-more-button'));

  const classes = new Set(['is-scroll-compact']);
  const removedProps = [];
  const card = {
    classList: { remove: name => classes.delete(name) },
    querySelector: () => ({ style: { removeProperty: name => removedProps.push(name) } })
  };
  const updateCtx = runFunctions(picks, ['updateRealityTvSoleSurvivorSticky_'], { document: { querySelector: () => card } });
  updateCtx.updateRealityTvSoleSurvivorSticky_();
  assert(!classes.has('is-scroll-compact'));
  assert.deepStrictEqual(removedProps.sort(), ['--reality-sticky-left', '--reality-sticky-top', '--reality-sticky-width'].sort());

  const mount = functionSource(picks, 'mountRealityTvSoleSurvivorSticky_');
  assert(mount.includes('removeEventListener("scroll"'));
  assert(mount.includes('removeEventListener("resize"'));
  assert(!mount.includes('addEventListener("scroll"'));
  assert(!mount.includes('addEventListener("resize"'));
}

// 3) Current Episode compact saved card uses title + simple points over a faded image; question choices do not contain bio UI.
{
  const card = functionSource(picks, 'renderCategoryCard');
  assert(card.includes('realityEpisodeCategory'));
  assert(card.includes('? `${adjustedPoints} pts`'));
  assert(card.includes('reality-selected-points'));
  assert(!card.includes('`${adjustedPoints}/${totalPoints} pts`') || card.includes(': `${adjustedPoints}/${totalPoints} pts`'), 'non-Reality games may keep x/y points, Reality branch must use x pts');
  const nominee = functionSource(picks, 'renderRealityNomineeButton_');
  assert(!nominee.includes('reality-profile-toggle'));
  assert(!nominee.includes('showRealityTvContestantDetailModal_'));
  assert(css.includes('.selected-pick-summary>span{top:9px!important;left:8px!important'));
  assert(css.includes('background:transparent!important'));
  assert(css.includes('.reality-selected-points{display:block!important'));
  assert(css.includes('object-fit:cover!important'));
}

// 4) Previous Episodes retain Sole Survivor/Streak/Multiplier, points, compact chevrons, and result coloring.
{
  const data = {
    seasonAnchor: {
      user: { currentEntityName: 'Taylor', streak: 4, currentMultiplier: 1.25 },
      stats: { history: [{ episodeId: 'e3', episodeNumber: 3, entityName: 'Taylor', streak: 4, multiplier: 1.25, bonus: 3 }] },
      settings: {}
    },
    picks: { q1: 'a' }, changeCounts: {}, confidencePoints: {}, confidenceScoringMode: 'win_only', game: {}
  };
  const ctx = runFunctions(picks, ['normalizePicksScoreMode_', 'realityTvFormatPoints_', 'formatSeasonAnchorMultiplier_', 'realityTvHistoricalPointsAwarded_', 'realityTvBrowserImageUrl_', 'realityTvContestantImageUrl_', 'realityTvImageWithFallbackHtml_', 'realityTvHistoricalSeasonAnchorForEpisode_', 'realityTvHistoricalSeasonAnchorHtml_', 'realityTvHistoricalSeasonAnchorMountHtml_', 'realityTvHistoricalPickDetailsHtml_'], {
    PICKS_PAGE_DATA: data,
    escapeHtml: esc, escapeAttr: esc, normalizeId,
    getSelectedNominee: category => category.nominees[0],
    getWinnerNominees: category => category.nominees,
    realityTvQuestionType_: () => 'reward',
    realityTvEpisodeEliminatedText_: () => 'Nobody',
    getCategoryDisplayTitle: category => category.question
  });
  const html = ctx.realityTvHistoricalPickDetailsHtml_({ episodeId: 'e3', episodeNumber: 3 }, [{ id: 'q1', question: 'Who wins?', points: 10, nominees: [{ id: 'a', name: 'Alex' }] }]);
  assert(html.includes('Sole Survivor'));
  assert(!html.includes('Current Sole Survivor'), 'historical rows should show that episode\'s Sole Survivor, not the current-season label');
  assert(html.includes('Taylor'));
  assert(html.includes('Streak 4'));
  assert(html.includes('1.25x'));
  assert.strictEqual(ctx.realityTvHistoricalPointsAwarded_({ id:'q1', points:10 }, 'correct'), 10, 'historical correct-pick display points remain +10');
  assert(css.includes('.reality-previous-episodes-body{display:grid;gap:0!important'));
  assert(css.includes('content:"⌄"'));
  assert(css.includes('.reality-history-answer-row.correct'));
  assert(css.includes('.reality-history-answer-row.wrong'));
}

// 5) Vote Details stays compact; eliminated recipient gets explicit red-state class.
{
  const ctx = runFunctions(picks, ['realityTvEpisodeVoteDetailsHtml_'], { escapeHtml: esc, normalizeId });
  const html = ctx.realityTvEpisodeVoteDetailsHtml_({
    status: 'FINAL', eliminated: [{ name: 'Jamie' }],
    voteDetails: {
      tallies: [{ contestantName: 'Jamie', valid: 3, cast: 3 }],
      rows: [{ voterName: 'Chris', targetName: 'Jamie', round: 'Initial Vote', status: 'VALID', value: 1 }]
    }
  });
  assert(html.includes('<strong>Vote Details</strong>'));
  assert(html.includes('<th>Voter</th><th>Voted for</th><th>Round</th><th>Status</th><th>Value</th>'));
  assert((html.match(/is-eliminated/g) || []).length >= 2);
  assert(css.includes('.reality-player-vote-table td:nth-child(2){font-size:.6rem!important'));
  assert(css.includes('.reality-player-vote-tallies>div.is-eliminated strong'));
}

// 6) Season Cast uses canonical image/profile data, tribe color, shared modal, horizontal rail, latest-eliminated centering.
{
  const cast = functionSource(picks, 'castHtml_');
  assert(cast.includes('realityTvContestantProfileById_'));
  assert(cast.includes('const resolvedImage = realityTvContestantImageUrl_(meta) || realityTvContestantImageUrl_(nominee)'), 'Season Cast should use the richer R5 contestant image resolver before falling back');
  assert(cast.includes('--reality-team-color'));
  assert(cast.includes('data-reality-latest-eliminated="true"'));
  assert(cast.includes('data-reality-open-contestant'));
  assert(!cast.includes('onclick="activateRealityTvContestantCard_'));
  assert(cast.includes('Bio &amp; Details'));
  const center = functionSource(picks, 'centerLatestEliminatedCast_');
  assert(center.includes('data-reality-latest-eliminated="true"'));
  assert(center.includes('rail.scrollTo'));
  assert(center.includes('realityInitialCentered'));
  assert(css.includes('.reality-clean-cast-rail {display:flex') || css.includes('.reality-clean-cast-rail{gap:7px'));
  assert(css.includes('border:2px solid color-mix(in srgb,var(--reality-team-color'));
  assert(css.includes('color:#7dd3fc!important'));
}

// 7) Your Season uses compact common styling and preserves three stats on one mobile row.
{
  const summaryCtx = runFunctions(picks, ['realityTvFormatPoints_', 'renderRealityTvPlayerSummary_'], {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { hasHiddenResults: false }, playerStats: { overall: { totalPoints: 88, rank: 2, totalPlayers: 10, correct: 5, settled: 7, seasonAnchorNet: 4 } } } }
  });
  const html = summaryCtx.renderRealityTvPlayerSummary_();
  assert(html.includes('<h2>Your Season</h2>'));
  assert(html.includes('<span>PTS</span>'));
  assert(html.includes('<span>Multiplier</span>'));
  assert(!html.includes('Survivor Adjustment'));
  assert(!html.includes('TOTAL POINTS'));
  assert(css.includes('.reality-player-summary-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important'));
}

// 8) Standings & Compare uses common shell, requested standings columns, vertical player columns and historical selector.
{
  const standings = functionSource(picks, 'realityTvCommonStandingsHtml_');
  for (const label of ['Rank', 'User', 'Total Pts', 'Pts Behind', 'Streak', 'Multiplier Bonus', 'Sole Survivor']) {
    assert(standings.includes(`<th>${label}</th>`), `missing standings column ${label}`);
  }
  const compare = functionSource(picks, 'renderRealityTvEpisodeComparison_');
  assert(compare.includes('Standings &amp; Compare'));
  assert(compare.includes('reality-standings-compare-tabs'));
  assert(compare.includes('reality-compare-episode-picker'));
  assert(compare.includes('reality-compare-matrix'));
  assert(compare.includes('reality-compare-player-column-head'));
  assert(compare.includes('reality-compare-pick-cell'));
  assert(compare.includes('reality-compare-contestant-image'));
  assert(compare.includes('Locked &amp; revealed episodes only'));
}

// 9) Help / How to Play is populated from config/existing mechanics and defaults collapsed.
{
  const ctx = runFunctions(picks, ['realityTvConfiguredText_', 'renderRealityTvRulesHelp_'], {
    PICKS_PAGE_DATA: {
      game: { rules: 'Use the configured rules.', howToPlay: 'Make your picks.' },
      seasonAnchor: { enabled: true }, episodeComparison: { enabled: true },
      realityTvView: { enabled: true, season: { periodLabel: 'Episode', showFormat: 'DWTS' }, spoilerShield: { enabled: true }, episodeQuestions: [{ questionType: 'winner' }] }
    }, escapeHtml: esc
  });
  const html = ctx.renderRealityTvRulesHelp_();
  assert(html.includes('Help / How to Play'));
  assert(html.includes('Use the configured rules.'));
  assert(html.includes('Make your picks.'));
  assert(html.includes('DWTS configured question types'));
  assert(html.includes('Sole Survivor'));
  assert(html.includes('Spoiler Shield'));
  assert(!html.includes('reality-help-shell" open'));
}

// 10) Mobile density and uniform header contracts: condensed desktop, no mobile single-column fallback.
{
  const r4 = css.slice(css.indexOf('PATTC REALITY R4'));
  assert(/reality-clean-hero\s*\{[\s\S]*?min-height:188px!important/.test(r4));
  assert(r4.includes('.reality-clean-hero{min-height:168px!important'));
  assert(r4.includes('.reality-sole-survivor-grid{grid-template-columns:minmax(126px,.76fr) minmax(0,1.24fr)!important'));
  assert(r4.includes('.pick-header-main{grid-template-columns:minmax(0,55%) minmax(0,45%)!important'));
  assert(r4.includes('.reality-player-summary-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important'));
  assert(!/reality-sole-survivor-grid\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(r4));
  assert(!/pick-header-main\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(r4));
  for (const selector of ['reality-current-question-heading', 'reality-clean-section-heading', 'reality-player-summary-heading', 'reality-previous-episodes>summary', 'reality-standings-compare-shell>summary', 'reality-help-shell>summary']) {
    assert(r4.includes(selector), `R4 shared header rule missing ${selector}`);
  }
}

// 11) Historical points helper remains display-only and mirrors existing display scoring contract; no R4 backend/API/scoring expansion.
{
  const ctx = runFunctions(picks, ['normalizePicksScoreMode_', 'realityTvHistoricalPointsAwarded_'], {
    PICKS_PAGE_DATA: { game: {}, changeCounts: {}, confidencePoints: {}, confidenceScoringMode: 'win_only' }
  });
  assert.strictEqual(ctx.realityTvHistoricalPointsAwarded_({ id: 'q', scoreMode: 'correct-pick', points: 10 }, 'correct'), 10);
  assert.strictEqual(ctx.realityTvHistoricalPointsAwarded_({ id: 'q', scoreMode: 'correct-pick', points: 10 }, 'wrong'), 0);
  const helper = functionSource(picks, 'realityTvHistoricalPointsAwarded_');
  assert(!/apiSave|SpreadsheetApp|setValue|appendRow|savePick|write/i.test(helper));
}

// Appearance Manager expansion is intentionally deferred; no admin/appearance architecture is introduced in this pass.
assert(!picks.includes('R4 Appearance Manager'));

console.log('Reality TV R4 browser acceptance focused tests passed.');
