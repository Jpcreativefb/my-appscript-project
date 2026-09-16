const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const picksPath = path.join(root, 'frontend/js/pages/picks.js');
const cssPath = path.join(root, 'frontend/css/picks.css');
const anchorPath = path.join(root, 'backend/engines/SeasonAnchorEngine.js');
const picks = fs.readFileSync(picksPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const anchor = fs.readFileSync(anchorPath, 'utf8');

function fnBlock(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', esc = false, templateDepth = 0;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (quote === '`' && ch === '$' && source[i + 1] === '{') { templateDepth++; i++; continue; }
      if (quote === '`' && templateDepth && ch === '}') { templateDepth--; continue; }
      if (ch === quote && (!templateDepth || quote !== '`')) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

// 1) Spoiler Shield: current-result state and future preference stay distinct,
// and the existing reveal path remains the action target.
{
  let revealed = '';
  const context = {
    PICKS_PAGE_DATA: { realityTvView: { enabled: true, spoilerShield: { enabled: true } } },
    realityTvBlockingHiddenEpisode_: () => ({ episodeId: 'ep-4' }),
    escapeJs: String,
    escapeHtml: String,
    revealRealityTvEpisode_: id => { revealed = id; }
  };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'activateRealityTvSpoilerShield_') + '\n' + fnBlock(picks, 'renderRealityTvSpoilerShield_'), context);
  const hidden = context.renderRealityTvSpoilerShield_();
  assert(hidden.includes('Results Hidden'));
  assert(hidden.includes('Reveal Results'));
  assert(hidden.includes('Future results: Protected'));
  context.activateRealityTvSpoilerShield_({ type: 'click', target: { closest: () => null }, preventDefault(){} }, 'ep-4');
  assert.strictEqual(revealed, 'ep-4');
  context.realityTvBlockingHiddenEpisode_ = () => null;
  const revealedHtml = context.renderRealityTvSpoilerShield_();
  assert(revealedHtml.includes('Results Revealed'));
  assert(revealedHtml.includes('Episode results are visible'));
}

// 2) Compare user selection is real runtime state: current user is permanent
// column 2, added users are stable/removable, and Compare stays open after edits.
{
  const rerenders = [];
  const context = {
    PICKS_REALITY_COMPARE_USER_KEYS: [],
    PICKS_REALITY_COMPARE_USERS_INITIALIZED: false,
    PICKS_REALITY_STANDINGS_COMPARE_TAB: 'standings',
    PICKS_REALITY_SECTION_OPEN_STATE: {},
    PICKS_PAGE_DATA: {
      session: { username: 'joel' },
      episodeComparison: { rows: [{ username:'amy' }, { username:'joel', isCurrent:true }, { username:'max' }, { username:'zoe' }] },
      realityTvView: { playerStats: { compactLeaderboard: [{ username:'joel', isCurrent:true }] } }
    },
    normalizeId: v => String(v || '').trim().toLowerCase(),
    realityTvCaptureComparisonUiState_: () => ({ open:true, scrollLeft:91 }),
    rerenderRealityTvEpisodeComparison_: state => rerenders.push(Object.assign({}, state))
  };
  vm.createContext(context);
  vm.runInContext([
    fnBlock(picks, 'realityTvCompareUserKey_'),
    fnBlock(picks, 'realityTvCompareCurrentUserKey_'),
    fnBlock(picks, 'realityTvCompareSelectedRows_'),
    fnBlock(picks, 'addRealityTvCompareUser_'),
    fnBlock(picks, 'removeRealityTvCompareUser_')
  ].join('\n'), context);
  const rows = context.PICKS_PAGE_DATA.episodeComparison.rows;
  const standings = context.PICKS_PAGE_DATA.realityTvView.playerStats.compactLeaderboard;
  const selected = context.realityTvCompareSelectedRows_(rows, standings);
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].username, 'joel');
  context.addRealityTvCompareUser_('zoe');
  context.addRealityTvCompareUser_('amy');
  assert.strictEqual(JSON.stringify(Array.from(context.PICKS_REALITY_COMPARE_USER_KEYS)), JSON.stringify(['zoe','amy']));
  context.removeRealityTvCompareUser_('zoe');
  assert.strictEqual(JSON.stringify(Array.from(context.PICKS_REALITY_COMPARE_USER_KEYS)), JSON.stringify(['amy']));
  context.removeRealityTvCompareUser_('joel');
  assert.strictEqual(JSON.stringify(Array.from(context.PICKS_REALITY_COMPARE_USER_KEYS)), JSON.stringify(['amy']), 'current user is not removable');
  assert.strictEqual(context.PICKS_REALITY_STANDINGS_COMPARE_TAB, 'compare');
  assert.strictEqual(context.PICKS_REALITY_SECTION_OPEN_STATE['standings-compare'], true);
  assert(rerenders.every(state => state.open === true && state.scrollLeft === 91));
}

// Compare presentation contract: three stacked header lines, current-user frozen
// reference column, contestant images, and Add User for non-current users.
assert(picks.includes('+ Add User'));
assert(picks.includes('<strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(realityTvFormatPoints_(total))} pts</span><small>${rank ? `Rank #'));
assert(picks.includes('is-current-reference'));
assert(picks.includes('reality-compare-remove-user'));
assert(picks.includes('realityTvContestantProfileByValue_(value)'));

// 3) Season Cast rich profile merge prevents a sparse Season Anchor record from
// hiding a richer Reality contestant image.
{
  const context = {
    PICKS_PAGE_DATA: {
      seasonAnchor: { entities: [{ id:'c1', name:'Chef One', imageUrl:'', status:'ACTIVE' }] },
      realityTvView: { participants: [{ id:'c1', name:'Chef One', imageUrl:'https://img.test/c1.jpg', teamOrTribe:'Blue' }] },
      categories: []
    },
    normalizeId: v => String(v || '').toLowerCase(),
    seasonAnchorEntityById_: id => ({ id:'c1', name:'Chef One', imageUrl:'', status:'ELIMINATED' }),
    realityTvNomineeMeta_: () => ({})
  };
  vm.createContext(context);
  context.URL = URL; context.encodeURIComponent = encodeURIComponent;
  vm.runInContext(fnBlock(picks, 'realityTvMergeContestantProfiles_') + '\n' + fnBlock(picks, 'realityTvContestantProfileById_') + '\n' + fnBlock(picks, 'realityTvBrowserImageUrl_') + '\n' + fnBlock(picks, 'realityTvContestantImageUrl_'), context);
  const profile = context.realityTvContestantProfileById_('c1');
  assert.strictEqual(profile.teamOrTribe, 'Blue');
  assert.strictEqual(profile.status, 'ELIMINATED', 'Season Anchor status must remain authoritative');
  assert.strictEqual(context.realityTvContestantImageUrl_(profile), 'https://img.test/c1.jpg');
}
assert(picks.includes('reality-clean-cast-team'));
assert(picks.includes('data-reality-open-contestant="${attr_(entityId)}"'));
assert(!picks.includes('onclick="activateRealityTvContestantCard_(event, this.dataset.realityContestantId)'));

// Latest eliminated centering is behavioral, not a CSS-only marker.
{
  const context = { setTimeout: fn => fn(), requestAnimationFrame: fn => fn() };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'centerLatestEliminatedCast_'), context);
  const latest = { offsetLeft:500, clientWidth:100, querySelector:() => null };
  let scrollToLeft = null;
  const rail = {
    clientWidth:300, scrollLeft:0, dataset:{},
    querySelector: sel => sel.includes('data-reality-latest-eliminated') ? latest : null,
    scrollTo: o => { scrollToLeft = o.left; }
  };
  const page = { querySelector: sel => sel.includes('reality-clean-cast-rail') ? rail : null };
  context.centerLatestEliminatedCast_(page);
  assert.strictEqual(rail.scrollLeft, 400);
  assert.strictEqual(scrollToLeft, 400);
  assert.strictEqual(rail.dataset.realityInitialCentered, 'true');
}

// 4) Weekly Previous Episode Sole Survivor uses the episode-specific history.
{
  const context = {
    PICKS_PAGE_DATA: { seasonAnchor: { stats: { history: [
      { episodeId:'e1', episodeNumber:1, entityName:'Alpha' },
      { episodeId:'e2', episodeNumber:2, entityName:'Bravo' }
    ] } } },
    normalizeId: v => String(v || '').toLowerCase()
  };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'realityTvHistoricalSeasonAnchorForEpisode_'), context);
  assert.strictEqual(context.realityTvHistoricalSeasonAnchorForEpisode_({ episodeId:'e1', episodeNumber:1 }).entityName, 'Alpha');
  assert.strictEqual(context.realityTvHistoricalSeasonAnchorForEpisode_({ episodeId:'e2', episodeNumber:2 }).entityName, 'Bravo');
}
assert(anchor.includes('history: historyRows.map(function(row) { return seasonAnchorHistoryViewRow_(row, historyEntityById); })'));
assert(anchor.includes('streak: seasonAnchorNumber_(row.StreakAfter, 0)'));
assert(anchor.includes('const entityId = seasonAnchorString_(row.EntityId)'));

// 5) Historical points stays display-only; no scoring/save/storage call was added.
{
  const body = fnBlock(picks, 'realityTvHistoricalPointsAwarded_');
  assert(!/api[A-Z]|save[A-Z]|SpreadsheetApp|setValue|appendRow|seasonAnchorSettle/i.test(body));
  const context = {
    PICKS_PAGE_DATA: { changeCounts:{q:1}, confidencePoints:{q:8}, game:{confidenceEnabled:true}, confidenceScoringMode:'risk_penalty' },
    normalizePicksScoreMode_: m => m,
  };
  vm.createContext(context);
  vm.runInContext(body, context);
  assert.strictEqual(context.realityTvHistoricalPointsAwarded_({id:'q', scoreMode:'correct-pick', points:10, changePenalty:2}, 'correct'), 6);
  assert.strictEqual(context.realityTvHistoricalPointsAwarded_({id:'q', scoreMode:'correct-pick', points:10, changePenalty:2}, 'wrong'), -6);
}

// 6) R5 visual contracts: configured hero fallback, centered episode art,
// horizontal cast rail, equal-column mobile modal, larger points, square family.
assert(picks.includes('appearanceValue_(season, keys) || appearanceValue_(game, keys)'));
assert(css.includes('--reality-hero-position:center center'));
assert(css.includes('object-position:center center!important'));
assert(css.includes('touch-action:pan-x!important'));
assert(css.includes('scrollbar-width:thin'));
assert(css.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important'));
assert(css.includes('.reality-player-score-total strong{\n  font-size:1.42rem!important'));
assert(css.includes('--reality-section-radius:8px'));
assert(css.includes('#realityTvEpisodeComparisonMount'));
assert(css.includes('width:100%!important;max-width:none!important'));

// No R5 sticky resurrection: mount remains teardown-only and R5 does not add
// scroll listeners back to Sole Survivor.
const sticky = fnBlock(picks, 'mountRealityTvSoleSurvivorSticky_');
assert(!sticky.includes('addEventListener("scroll"'));
assert(!sticky.includes("addEventListener('scroll'"));

console.log('PASS reality_tv_r5_final_live_findings_tests.js');
