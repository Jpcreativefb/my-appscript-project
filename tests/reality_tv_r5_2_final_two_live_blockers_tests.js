'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const reality = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');

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

const normalizeId = value => String(value == null ? '' : value).trim().toLowerCase();
const esc = value => String(value == null ? '' : value);

// 1) The deployed Reality payload contract still carries the canonical contestant
// ImageUrl on participants. R5.2 accepts both the explicit R5.1 provenance field
// and the legacy @390 imageUrl field that the authenticated frontend already sees.
{
  const payload = fnBlock(reality, 'realityTvUserGameViewPayload_');
  assert(payload.includes('imageUrl: authoritativeImageUrl'));
  assert(payload.includes('authoritativeImageUrl: authoritativeImageUrl'));

  const ctx = { URL, encodeURIComponent };
  vm.createContext(ctx);
  vm.runInContext(fnBlock(picks, 'realityTvBrowserImageUrl_') + '\n' + fnBlock(picks, 'realityTvContestantImageUrl_'), ctx);
  assert.strictEqual(ctx.realityTvContestantImageUrl_({ imageUrl:'https://cdn.example/cast/jamie.jpg' }), 'https://cdn.example/cast/jamie.jpg');
  assert.strictEqual(
    ctx.realityTvContestantImageUrl_({ imageUrl:'https://drive.google.com/file/d/ABC123/view?usp=sharing' }),
    'https://drive.google.com/thumbnail?id=ABC123&sz=w800'
  );
}

// 2) Real cast rendering no longer leaves a black portrait box while an image is
// lazy/failed. The browser receives the real URL in src immediately, plus a
// visible initials fallback that survives final image failure.
{
  const ctx = {
    URL, encodeURIComponent,
    escapeAttr: esc, escapeHtml: esc,
    platformImgHtml: (url, options) => {
      assert.strictEqual(options.critical, true, 'cast/modal portrait must not start as transparent lazy pixel');
      return `<img src="${url}" class="${options.className}" ${options.extraAttrs || ''}>`;
    }
  };
  vm.createContext(ctx);
  vm.runInContext(fnBlock(picks, 'realityTvBrowserImageUrl_') + '\n' + fnBlock(picks, 'realityTvImageWithFallbackHtml_'), ctx);
  const html = ctx.realityTvImageWithFallbackHtml_('https://cdn.example/jamie.jpg', 'Jamie Lee', 'reality-clean-cast-photo', 'card', 'reality-clean-cast-fallback');
  assert(html.includes('src="https://cdn.example/jamie.jpg"'));
  assert(html.includes('data-reality-source-url="https://cdn.example/jamie.jpg"'));
  assert(html.includes('reality-clean-cast-fallback'));
  assert(html.includes('JL'));
  assert(css.includes('img.reality-image-error'));
  assert(css.includes('img.platform-image-failed'));
}

// 3) Sparse authenticated cast rows are supplemented by safe question nominee
// metadata even when participants are spoiler-suppressed; this is the path that
// previously produced empty/black cards instead of using an already-known image.
{
  const castStart = picks.indexOf('  function cast_() {');
  const castEnd = picks.indexOf('\n  function eliminationEpisodeFor_', castStart);
  assert(castStart >= 0 && castEnd > castStart);
  const castSource = picks.slice(castStart, castEnd);
  assert(castSource.includes('direct.forEach(add)'));
  assert(castSource.includes('(PICKS_PAGE_DATA.categories || []).forEach'));
  assert(castSource.includes('byId[id][key] === ""'));
  assert(castSource.indexOf('direct.forEach(add)') < castSource.indexOf('(PICKS_PAGE_DATA.categories || []).forEach'), 'direct payload keeps precedence');
}

// 4) Historical Sole Survivor is mounted per episode and then refreshed when the
// authenticated Season Anchor enhancement arrives after initial page paint.
{
  const mount = {
    html: '',
    getAttribute(name) {
      if (name === 'data-reality-history-episode-id') return 'ep-2';
      if (name === 'data-reality-history-episode-number') return '2';
      return '';
    },
    set innerHTML(value) { this.html = value; },
    get innerHTML() { return this.html; }
  };
  const ctx = {
    PICKS_PAGE_DATA: {
      realityTvView: { episodes:[{episodeId:'ep-2', episodeNumber:2}] },
      seasonAnchor: { stats:{ history:[{
        episodeId:'ep-2', episodeNumber:2, entityId:'c2', entityName:'Taylor',
        entityImageUrl:'https://cdn.example/taylor.jpg', entityStatus:'SURVIVED',
        streak:3, multiplier:1.4, bonus:4
      }] } }
    },
    document: { querySelectorAll: () => [mount] },
    window: { PlatformImageEngine:{ process: () => {} } },
    normalizeId,
    realityTvContestantProfileByValue_: () => null,
    escapeAttr: esc, escapeHtml: esc,
    realityTvFormatPoints_: n => String(n),
    formatSeasonAnchorMultiplier_: n => `${n}x`,
    URL, encodeURIComponent,
    platformImgHtml: (url, options) => `<img src="${url}" class="${options.className}">`
  };
  vm.createContext(ctx);
  vm.runInContext([
    fnBlock(picks, 'realityTvBrowserImageUrl_'),
    fnBlock(picks, 'realityTvContestantImageUrl_'),
    fnBlock(picks, 'realityTvImageWithFallbackHtml_'),
    fnBlock(picks, 'realityTvHistoricalSeasonAnchorForEpisode_'),
    fnBlock(picks, 'realityTvHistoricalSeasonAnchorHtml_'),
    fnBlock(picks, 'refreshRealityTvHistoricalSeasonAnchorUi_')
  ].join('\n'), ctx);
  ctx.refreshRealityTvHistoricalSeasonAnchorUi_();
  assert(mount.html.includes('Taylor'));
  assert(mount.html.includes('https://cdn.example/taylor.jpg'));
  assert(mount.html.includes('SURVIVED'));
  assert(mount.html.includes('Streak 3'));
  assert(mount.html.includes('Bonus +4 pts'));
  assert(mount.html.includes('1.4x'));
}

// 5) Initial Previous Episode HTML contains a dedicated episode mount and never
// substitutes the current Sole Survivor when historical data has not hydrated.
{
  const historical = fnBlock(picks, 'realityTvHistoricalPickDetailsHtml_');
  assert(historical.includes('realityTvHistoricalSeasonAnchorMountHtml_(episode)'));
  assert(!historical.includes('Current Sole Survivor'));
  const refresh = fnBlock(picks, 'refreshPicksEnhancementUi_');
  assert(refresh.includes('refreshRealityTvHistoricalSeasonAnchorUi_()'));
  assert(css.includes('.reality-history-survivor-mount:empty{display:none!important}'));
}

console.log('PASS reality_tv_r5_2_final_two_live_blockers_tests.js');
