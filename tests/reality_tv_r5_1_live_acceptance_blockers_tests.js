'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const reality = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const anchor = fs.readFileSync(path.join(root, 'backend/engines/SeasonAnchorEngine.js'), 'utf8');

function fnBlock(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, templateDepth = 0;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && source[i + 1] === '{') { templateDepth++; i++; continue; }
      if (quote === '`' && templateDepth && ch === '}') { templateDepth--; continue; }
      if (ch === quote && (!templateDepth || quote !== '`')) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

// 1) The authenticated Reality participant payload exposes the canonical
// contestant ImageUrl explicitly and preserves the existing imageUrl contract.
{
  const payloadFn = fnBlock(reality, 'realityTvUserGameViewPayload_');
  assert(payloadFn.includes('const authoritativeImageUrl = realityTvString_(row.ImageUrl)'));
  assert(payloadFn.includes('authoritativeImageUrl: authoritativeImageUrl'));
  assert(payloadFn.includes('imageUrl: authoritativeImageUrl'));
}

// 2) Cast + Bio resolve the same canonical image even when an earlier sparse
// duplicate exists; Season Anchor remains authoritative for status only.
{
  const context = {
    PICKS_PAGE_DATA: {
      seasonAnchor: { entities: [{ id:'c1', name:'Jamie', imageUrl:'', status:'ELIMINATED' }] },
      realityTvView: {
        cast: [{ id:'c1', name:'Jamie', biography:'Long bio' }],
        contestants: [{ id:'c1', name:'Jamie', imageUrl:'' }],
        participants: [{ id:'c1', name:'Jamie', authoritativeImageUrl:'https://cdn.example/jamie.jpg', imageUrl:'https://cdn.example/jamie.jpg', teamOrTribe:'Blue' }]
      },
      categories: []
    },
    normalizeId: v => String(v || '').trim().toLowerCase(),
    seasonAnchorEntityById_: () => ({ id:'c1', name:'Jamie', status:'ELIMINATED', imageUrl:'' }),
    realityTvNomineeMeta_: () => ({})
  };
  vm.createContext(context);
  vm.runInContext([
    fnBlock(picks, 'realityTvMergeContestantProfiles_'),
    fnBlock(picks, 'realityTvContestantProfileById_'),
    fnBlock(picks, 'realityTvBrowserImageUrl_'),
    fnBlock(picks, 'realityTvContestantImageUrl_')
  ].join('\n'), context);
  const profile = context.realityTvContestantProfileById_('c1');
  assert.strictEqual(profile.status, 'ELIMINATED');
  assert.strictEqual(profile.biography, 'Long bio');
  assert.strictEqual(profile.teamOrTribe, 'Blue');
  assert.strictEqual(context.realityTvContestantImageUrl_(profile), 'https://cdn.example/jamie.jpg');
}

// 3) Body-mounted Bio and More Stats modals have selectors that actually match
// after appendChild(document.body), with 50/50 mobile columns and independent scrolling.
{
  assert(css.includes('body > .season-anchor-confirm-backdrop .reality-contestant-modal-card'));
  assert(css.includes('body > .season-anchor-confirm-backdrop .season-anchor-stats-close'));
  assert(css.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important'));
  assert(css.includes('max-height:60vh!important;overflow-y:auto!important'));
  assert(css.includes('object-fit:cover!important;object-position:center center!important'));
  const bioFn = fnBlock(picks, 'showRealityTvContestantDetailModal_');
  const statsFn = fnBlock(picks, 'showSeasonAnchorStatsModal_');
  assert(bioFn.includes('document.body.appendChild(modal)'));
  assert(statsFn.includes('document.body.appendChild(modal)'));
  assert(bioFn.includes('realityTvContestantImageUrl_(profile)'));
  assert(bioFn.includes('realityTvProfileDetailsHtml_(profile)'));
}

// 4) Eliminated styling cannot blank a valid portrait: card remains opaque and
// grayscale/fade is limited to the image itself.
{
  assert(css.includes('.reality-clean-cast-card.status-eliminated{\n  opacity:1!important;filter:none!important;'));
  assert(css.includes('.reality-clean-cast-card.status-eliminated .reality-clean-cast-image img{\n  opacity:.74!important;filter:grayscale(.88) saturate(.3)!important;'));
}

// 5) Previous Episodes use the historical row's own image/status/streak/multiplier/bonus.
{
  const context = {
    PICKS_PAGE_DATA: { seasonAnchor: { stats: { history: [{
      episodeId:'ep-2', episodeNumber:2, entityId:'c2', entityName:'Taylor',
      entityImageUrl:'https://cdn.example/taylor.jpg', entityStatus:'SURVIVED',
      streak:3, multiplier:1.4, bonus:4
    }] } }, picks:{} },
    normalizeId: v => String(v || '').trim().toLowerCase(),
    realityTvContestantProfileByValue_: () => null,
    realityTvContestantImageUrl_: () => '',
    platformImgHtml: (url, opts) => `<img src="${url}" alt="${opts.alt}">`,
    escapeHtml: String,
    realityTvFormatPoints_: n => String(n),
    formatSeasonAnchorMultiplier_: n => `${n}x`,
    getSelectedNominee: () => null,
    getWinnerNominees: () => [],
    realityTvQuestionType_: () => '',
    realityTvEpisodeEliminatedText_: () => '',
    realityTvHistoricalPointsAwarded_: () => null,
    getCategoryDisplayTitle: () => ''
  };
  vm.createContext(context);
  context.URL = URL;
  context.encodeURIComponent = encodeURIComponent;
  context.escapeAttr = String;
  vm.runInContext([
    fnBlock(picks, 'realityTvBrowserImageUrl_'),
    fnBlock(picks, 'realityTvContestantImageUrl_'),
    fnBlock(picks, 'realityTvImageWithFallbackHtml_'),
    fnBlock(picks, 'realityTvHistoricalSeasonAnchorForEpisode_'),
    fnBlock(picks, 'realityTvHistoricalSeasonAnchorHtml_'),
    fnBlock(picks, 'realityTvHistoricalSeasonAnchorMountHtml_'),
    fnBlock(picks, 'realityTvHistoricalPickDetailsHtml_')
  ].join('\n'), context);
  const html = context.realityTvHistoricalPickDetailsHtml_({episodeId:'ep-2', episodeNumber:2}, []);
  assert(html.includes('https://cdn.example/taylor.jpg'));
  assert(html.includes('Taylor'));
  assert(html.includes('Streak 3'));
  assert(html.includes('Bonus +4 pts'));
  assert(html.includes('1.4x'));
  assert(html.includes('SURVIVED'));
  assert(!html.includes('Current Sole Survivor'));
}

// 6) Spoiler privacy remains intact: only history before the blocking hidden
// episode is returned by the Season Anchor adapter.
{
  const context = {
    seasonAnchorString_: v => String(v || ''),
    validateUserSession_: () => {},
    seasonAnchorUserPayload_: () => ({ enabled:true, stats:{ history:[
      {episodeNumber:1, entityName:'A'},
      {episodeNumber:2, entityName:'B'},
      {episodeNumber:3, entityName:'C'}
    ] } }),
    realityTvSpoilerStateForGame_: () => ({ hasHiddenResults:true, blockingEpisodeNumber:3 }),
    seasonAnchorNumber_: (v, f) => Number(v || f || 0)
  };
  vm.createContext(context);
  vm.runInContext(fnBlock(anchor, 'apiGetSeasonAnchor'), context);
  const result = context.apiGetSeasonAnchor({username:'u', token:'t', gameId:'g'});
  assert.strictEqual(result.seasonAnchor.hiddenBySpoiler, true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.seasonAnchor.stats.history.map(r => r.episodeNumber))), [1,2]);
}

// No scoring/storage mechanics are introduced by this pass.
for (const name of ['realityTvContestantProfileById_', 'realityTvContestantImageUrl_', 'realityTvHistoricalSeasonAnchorForEpisode_', 'realityTvHistoricalPickDetailsHtml_']) {
  let body;
  if (name === 'realityTvHistoricalPickDetailsHtml_') {
    const start = picks.indexOf('function realityTvHistoricalPickDetailsHtml_(');
    const end = picks.indexOf('\nfunction renderRealityTvEpisodeSections_(', start);
    body = picks.slice(start, end);
  } else {
    body = fnBlock(picks, name);
  }
  assert(!/SpreadsheetApp|setValue|appendRow|apiSavePick|seasonAnchorSettleRealityEpisode_/i.test(body), `${name} must remain display/read-only`);
}

console.log('PASS reality_tv_r5_1_live_acceptance_blockers_tests.js');
