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
  assert(hidden.includes('Future results protection: ON'));
  context.activateRealityTvSpoilerShield_({ type: 'click', target: { closest: () => null }, preventDefault(){} }, 'ep-4');
  assert.strictEqual(revealed, 'ep-4');
  context.realityTvBlockingHiddenEpisode_ = () => null;
  const revealedHtml = context.renderRealityTvSpoilerShield_();
  assert(revealedHtml.includes('Results Revealed'));
  assert(revealedHtml.includes('Episode results are visible'));
}

// 2) Compare user selection is real runtime state: defaults, + Add User, and remove.
{
  const mount = { innerHTML: '' };
  const context = {
    PICKS_REALITY_COMPARE_USER_KEYS: [],
    PICKS_REALITY_COMPARE_USERS_INITIALIZED: false,
    PICKS_REALITY_STANDINGS_COMPARE_TAB: 'standings',
    PICKS_PAGE_DATA: {
      session: { username: 'joel' },
      episodeComparison: { rows: [{ username:'amy' }, { username:'joel' }, { username:'max' }, { username:'zoe' }] },
      realityTvView: { playerStats: { compactLeaderboard: [{ username:'joel', isCurrent:true }] } }
    },
    normalizeId: v => String(v || '').trim().toLowerCase(),
    rerenderRealityTvCompareMount_: () => { mount.innerHTML = '<compare />'; }
  };
  vm.createContext(context);
  vm.runInContext([
    fnBlock(picks, 'realityTvCompareUserKey_'),
    fnBlock(picks, 'realityTvCurrentCompareUserKey_'),
    fnBlock(picks, 'realityTvCompareSelectedRows_'),
    fnBlock(picks, 'addRealityTvCompareUser_'),
    fnBlock(picks, 'removeRealityTvCompareUser_')
  ].join('\n'), context);
  const rows = [{ username:'amy' }, { username:'joel' }, { username:'max' }, { username:'zoe' }];
  const standings = [{ username:'joel', isCurrent:true }];
  const selected = context.realityTvCompareSelectedRows_(rows, standings);
  assert.deepStrictEqual(Array.from(selected, row => row.username), ['joel']);
  context.addRealityTvCompareUser_('zoe');
  assert.deepStrictEqual(Array.from(context.PICKS_REALITY_COMPARE_USER_KEYS), ['joel', 'zoe']);
  context.removeRealityTvCompareUser_('joel');
  assert.deepStrictEqual(Array.from(context.PICKS_REALITY_COMPARE_USER_KEYS), ['joel', 'zoe']);
  context.removeRealityTvCompareUser_('zoe');
  assert.deepStrictEqual(Array.from(context.PICKS_REALITY_COMPARE_USER_KEYS), ['joel']);
  assert.strictEqual(context.PICKS_REALITY_STANDINGS_COMPARE_TAB, 'compare');
  assert.strictEqual(mount.innerHTML, '<compare />');
}

// Compare presentation contract: user headers include points/rank; contestant
// answers use the shared rich contestant resolver and Add User is present.
assert(picks.includes('+ Add User'));
assert(picks.includes('${escapeHtml(realityTvFormatPoints_(total))} pts'));
assert(picks.includes('Rank #${rank}'));
assert(picks.includes('reality-compare-current-column'));
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
assert(picks.includes('activateRealityTvContestantCard_(event, this.dataset.realityContestantId)'));

// Clean R3 now owns deterministic Cast index/window behavior instead of rail geometry.
{
  const context = { Math, Number };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'clampCastIndex_') + '\n' + fnBlock(picks, 'castWindow_'), context);
  assert.strictEqual(context.clampCastIndex_(-1, 6), 0);
  assert.strictEqual(context.clampCastIndex_(9, 6), 5);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(context.castWindow_(0, 6, 4))), { start:0, end:4 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(context.castWindow_(5, 6, 4))), { start:2, end:6 });
  const cleanStart = picks.indexOf('(function realityEnhancedCleanR3_');
  const cleanEnd = picks.indexOf('PATTC REALITY CINEMATIC', cleanStart);
  const clean = picks.slice(cleanStart, cleanEnd);
  for (const token of ['scrollLeft', 'scrollTo', 'offsetLeft', 'clientWidth']) assert(!clean.includes(token));
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
// deterministic cast window, equal-column mobile modal, larger points, square family.
assert(picks.includes('appearanceValue_(season, keys) || appearanceValue_(game, keys)'));
assert(css.includes('--reality-hero-position:center center'));
assert(css.includes('object-position:center center!important'));
const r53Css = css.slice(css.indexOf('PATTC REALITY R5.3'));
assert(r53Css.includes('display:grid!important'));
assert(r53Css.includes('overflow-x:hidden!important'));
assert(r53Css.includes('touch-action:auto!important'));
assert(r53Css.includes('.reality-clean-cast-card[hidden]{display:none!important}'));
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
