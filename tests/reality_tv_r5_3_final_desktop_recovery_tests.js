'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const picks = read('frontend/js/pages/picks.js');
const css = read('frontend/css/picks.css');

function fnBlock(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) {
    start = source.indexOf(marker);
    if (start >= 0) break;
  }
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
  throw new Error(`unclosed function ${name}`);
}

function normalized(value) {
  return JSON.parse(JSON.stringify(value));
}

function exactRules(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(source.matchAll(new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'g'))).map(match => match[1]);
}

function lastExactRule(source, selector) {
  const rules = exactRules(source, selector);
  assert(rules.length, `missing CSS rule ${selector}`);
  return rules[rules.length - 1];
}

let passed = 0;
const pending = [];
function test(name, fn) {
  const result = fn();
  if (result && typeof result.then === 'function') {
    pending.push(result.then(() => {
      passed++;
      console.log('PASS', name);
    }));
    return;
  }
  passed++;
  console.log('PASS', name);
}

const cleanStart = picks.indexOf('(function realityEnhancedCleanR3_');
const cleanEnd = picks.indexOf('/* =========================================================\n   PATTC REALITY CINEMATIC', cleanStart);
assert(cleanStart >= 0 && cleanEnd > cleanStart, 'Clean R3 owner block missing');
const clean = picks.slice(cleanStart, cleanEnd);

function makeCard(id) {
  return {
    id,
    hidden: false,
    attrs: {},
    style: {},
    setAttribute(name, value) { this.attrs[name] = String(value); }
  };
}

function makeCastHarness(width = 1200, count = 6) {
  let activeSection = null;
  const resizeHandlers = [];
  let observerCallback = null;
  const appRoot = {};
  const context = {
    console, Math, Number, String, Array, Object, Boolean, Set, JSON,
    PICKS_PAGE_DATA: { realityTvView: { enabled: false } },
    document: {
      body: {},
      readyState: 'complete',
      querySelector: () => null,
      getElementById: id => id === 'app' ? appRoot : (id === 'realityEnhancedCleanCast' ? activeSection : null),
      addEventListener() {}
    },
    MutationObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe() {}
    },
    innerWidth: width,
    matchMedia: query => ({ matches: /max-width:\s*760px/.test(query) && context.innerWidth <= 760 }),
    requestAnimationFrame: fn => fn(),
    setTimeout: fn => fn(),
    addEventListener: (type, handler) => { if (type === 'resize') resizeHandlers.push(handler); }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(clean, context);

  function rebuildCards(nextCount = count) {
    const cards = Array.from({ length: nextCount }, (_, i) => makeCard(`c${i + 1}`));
    const rail = { style: {} };
    const previous = { disabled: false };
    const next = { disabled: false };
    const position = { textContent: '' };
    activeSection = {
      cards,
      rail,
      previous,
      next,
      position,
      querySelector(selector) {
        if (selector === '.reality-clean-cast-rail') return rail;
        if (selector === '[data-reality-cast-prev]') return previous;
        if (selector === '[data-reality-cast-next]') return next;
        if (selector === '[data-reality-cast-position]') return position;
        return null;
      },
      querySelectorAll(selector) { return selector === '.reality-clean-cast-card' ? cards : []; }
    };
    return activeSection;
  }

  rebuildCards(count);
  return {
    context,
    get section() { return activeSection; },
    rebuildCards,
    resize() { resizeHandlers.forEach(fn => fn()); },
    observerPass() { if (observerCallback) observerCallback([]); }
  };
}

// 1-2: Clean R3 is the single Cast behavior owner and keeps state outside rerender functions.
test('Season Cast state is owned inside stable Clean R3 lifecycle', () => {
  assert(clean.includes('let castIndex = 0;'));
  assert(clean.includes('let castSignature = "";'));
  assert(clean.includes('stepCast: stepCast_'));
});

test('normal Clean R3 enhance source does not reset Cast index', () => {
  const enhance = fnBlock(clean, 'enhance_');
  assert(!/castIndex\s*=\s*0/.test(enhance));
  assert(enhance.includes('applyCastWindow_();'));
  assert.strictEqual((clean.match(/new MutationObserver\(/g) || []).length, 1);
});

// 3-5: exact +/-1 and clamping behavior.
test('Prev changes logical index exactly -1', () => {
  const h = makeCastHarness(1200, 6);
  h.context.PATTCRealityLayoutR3.stepCast(1);
  h.context.PATTCRealityLayoutR3.stepCast(1);
  assert.strictEqual(h.section.position.textContent, '3 of 6');
  h.context.PATTCRealityLayoutR3.stepCast(-1);
  assert.strictEqual(h.section.position.textContent, '2 of 6');
});

test('Next changes logical index exactly +1', () => {
  const h = makeCastHarness(1200, 6);
  h.context.PATTCRealityLayoutR3.stepCast(1);
  assert.strictEqual(h.section.position.textContent, '2 of 6');
  h.context.PATTCRealityLayoutR3.stepCast(1);
  assert.strictEqual(h.section.position.textContent, '3 of 6');
});

test('Cast index clamps at beginning and end', () => {
  const h = makeCastHarness(1200, 6);
  h.context.PATTCRealityLayoutR3.stepCast(-1);
  assert.strictEqual(h.section.position.textContent, '1 of 6');
  for (let i = 0; i < 10; i++) h.context.PATTCRealityLayoutR3.stepCast(1);
  assert.strictEqual(h.section.position.textContent, '6 of 6');
  assert.strictEqual(h.section.next.disabled, true);
  h.context.PATTCRealityLayoutR3.stepCast(1);
  assert.strictEqual(h.section.position.textContent, '6 of 6');
});

// 6-7: responsive visible counts.
test('desktop Cast window exposes exactly four contestants', () => {
  const h = makeCastHarness(1200, 6);
  h.context.PATTCRealityLayoutR3.stepCast(-1);
  assert.strictEqual(h.section.cards.filter(card => !card.hidden).length, 4);
  assert.strictEqual(h.section.rail.style.gridTemplateColumns, 'repeat(4, minmax(0, 1fr))');
});

test('760px-and-under Cast window exposes exactly two contestants', () => {
  const h = makeCastHarness(760, 6);
  h.context.PATTCRealityLayoutR3.stepCast(-1);
  assert.strictEqual(h.section.cards.filter(card => !card.hidden).length, 2);
  assert.strictEqual(h.section.rail.style.gridTemplateColumns, 'repeat(2, minmax(0, 1fr))');
});

// 8: no geometry/scroll navigation.
test('Cast owner contains no scroll or card-geometry navigation', () => {
  for (const token of ['scrollLeft', 'scrollTo', 'offsetLeft', 'clientWidth']) {
    assert(!clean.includes(token), `unexpected ${token}`);
  }
  assert(!clean.includes('centerLatestEliminatedCast_'));
});

// 9-10: Bio activation and nav isolation.
test('Cast Bio activation remains available after window updates', () => {
  let opened = '';
  const context = { showRealityTvContestantDetailModal_: id => { opened = id; } };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'activateRealityTvContestantCard_'), context);
  context.activateRealityTvContestantCard_({ type:'click', target:{ closest:() => null }, preventDefault(){} }, 'contestant-4');
  assert.strictEqual(opened, 'contestant-4');
  const cast = fnBlock(clean, 'castHtml_');
  assert(cast.includes('activateRealityTvContestantCard_(event, this.dataset.realityContestantId)'));
});

test('Prev and Next explicitly suppress propagation and never invoke Bio', () => {
  const cast = fnBlock(clean, 'castHtml_');
  assert(cast.includes('event.preventDefault();event.stopPropagation();window.PATTCRealityLayoutR3.stepCast(-1)'));
  assert(cast.includes('event.preventDefault();event.stopPropagation();window.PATTCRealityLayoutR3.stepCast(1)'));
  assert(!/data-reality-cast-(?:prev|next)[\s\S]{0,180}showRealityTvContestantDetailModal_/.test(cast));
});

// 11-12: eliminated styles and CSS cascade.
test('eliminated Cast presentation remains available', () => {
  const cast = fnBlock(clean, 'castHtml_');
  assert(cast.includes('status === "eliminated"'));
  assert(cast.includes('reality-clean-cast-eliminated'));
  assert(cast.includes('data-reality-latest-eliminated="true"'));
  assert(css.includes('.reality-clean-cast-card.status-eliminated .reality-clean-cast-image img'));
});

test('final active Cast CSS overrides obsolete horizontal carousel rules', () => {
  const rail = lastExactRule(css, '.reality-player-page.reality-clean-enhanced .reality-clean-cast-rail');
  const card = lastExactRule(css, '.reality-player-page.reality-clean-enhanced .reality-clean-cast-card');
  assert(/display\s*:\s*grid\s*!important/i.test(rail));
  assert(/overflow-x\s*:\s*hidden\s*!important/i.test(rail));
  assert(/scroll-snap-type\s*:\s*none\s*!important/i.test(rail));
  assert(!/display\s*:\s*flex\s*!important/i.test(rail));
  assert(!/overflow-x\s*:\s*auto\s*!important/i.test(rail));
  assert(/min-width\s*:\s*0\s*!important/i.test(card));
  assert(!/flex\s*:\s*0\s+0\s+\d+px\s*!important/i.test(card));
  assert(css.includes('.reality-player-page.reality-clean-enhanced .reality-clean-cast-card[hidden]{display:none!important}'));
});

// Lifecycle rebuild preservation: replace the DOM nodes and reapply the same owner state.
test('Clean R3 state survives a Cast DOM rebuild', () => {
  const h = makeCastHarness(1200, 6);
  h.context.PATTCRealityLayoutR3.stepCast(1);
  h.context.PATTCRealityLayoutR3.stepCast(1);
  assert.strictEqual(h.section.position.textContent, '3 of 6');
  h.rebuildCards(6);
  h.resize();
  assert.strictEqual(h.section.position.textContent, '3 of 6');
  assert.strictEqual(h.section.cards.filter(card => !card.hidden).length, 4);
});

// 13-14: Current Episode outer collapse without replacing question mechanics.
test('Current Episode outer collapse repeatedly removes/restores body state', () => {
  const body = { hidden:false, classList:{ contains:name => name === 'reality-episode-picks-body' } };
  const section = { children:[body] };
  const attrs = {};
  const heading = { closest:selector => selector === '.reality-episode-picks-section.current' ? section : null, setAttribute:(k,v) => { attrs[k] = v; } };
  const context = { Array };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'toggleRealityCurrentEpisode_'), context);
  context.toggleRealityCurrentEpisode_(heading, { type:'click', preventDefault(){} });
  assert.strictEqual(body.hidden, true);
  assert.strictEqual(attrs['aria-expanded'], 'false');
  context.toggleRealityCurrentEpisode_(heading, { type:'click', preventDefault(){} });
  assert.strictEqual(body.hidden, false);
  assert.strictEqual(attrs['aria-expanded'], 'true');
  const hiddenRule = lastExactRule(css, '.reality-player-page.reality-clean-enhanced .reality-episode-picks-section.current>.reality-episode-picks-body[hidden]');
  assert(/display\s*:\s*none\s*!important/i.test(hiddenRule));
});

test('individual question collapse mechanics remain untouched', () => {
  const toggle = fnBlock(picks, 'toggleRealityCurrentEpisode_');
  assert(!toggle.includes('pick-category-card'));
  assert(!toggle.includes('togglePickCategory'));
  const renderer = fnBlock(picks, 'renderRealityTvEpisodeSections_');
  assert(renderer.includes('renderPicksCategoryCards_(currentItems)'));
  assert(picks.includes('onclick="togglePickCategory('));
});

// 15: body-mounted Bio containment only, preserving JS architecture.
test('Bio modal is viewport-contained without replacing Bio JS', () => {
  const bio = fnBlock(picks, 'showRealityTvContestantDetailModal_');
  assert(bio.includes('realityTvProfileDetailsHtml_(profile)'));
  assert(bio.includes('document.body.appendChild(modal)'));
  assert(bio.includes('closeRealityTvContestantDetailModal_()'));
  const modalRules = exactRules(css, 'body > .season-anchor-confirm-backdrop.reality-contestant-modal-backdrop .reality-contestant-modal-card');
  const desktopRule = modalRules.find(rule => /100vw - 36px/.test(rule));
  const mobileRule = modalRules.find(rule => /100vw - 20px/.test(rule));
  assert(desktopRule, 'desktop viewport containment rule missing');
  assert(mobileRule, 'narrow viewport containment rule missing');
  assert(/max-width\s*:\s*calc\(100vw - 36px\)\s*!important/i.test(desktopRule));
  assert(/min-width\s*:\s*0\s*!important/i.test(desktopRule));
  assert(/box-sizing\s*:\s*border-box\s*!important/i.test(desktopRule));
  assert(/overflow-x\s*:\s*hidden\s*!important/i.test(desktopRule));
});

// 16-20: future-result preference explicit/local/persistent state.
test('future-results button exposes explicit ON/OFF states', () => {
  const context = {
    PICKS_PAGE_DATA:{ realityTvView:{ enabled:true, spoilerShield:{ enabled:true } } },
    realityTvBlockingHiddenEpisode_:() => null,
    escapeJs:String, escapeHtml:String
  };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'renderRealityTvSpoilerShield_'), context);
  const on = context.renderRealityTvSpoilerShield_();
  assert(on.includes('Future results protection: ON'));
  context.PICKS_PAGE_DATA.realityTvView.spoilerShield.enabled = false;
  const off = context.renderRealityTvSpoilerShield_();
  assert(off.includes('Future results protection: OFF'));
});

test('future-results aria-pressed and next action track current state', () => {
  const context = {
    PICKS_PAGE_DATA:{ realityTvView:{ enabled:true, spoilerShield:{ enabled:true } } },
    realityTvBlockingHiddenEpisode_:() => null,
    escapeJs:String, escapeHtml:String
  };
  vm.createContext(context);
  vm.runInContext(fnBlock(picks, 'renderRealityTvSpoilerShield_'), context);
  const on = context.renderRealityTvSpoilerShield_();
  assert(on.includes('aria-pressed="true"'));
  assert(on.includes('saveRealityTvSpoilerPreference_(false)'));
  context.PICKS_PAGE_DATA.realityTvView.spoilerShield.enabled = false;
  const off = context.renderRealityTvSpoilerShield_();
  assert(off.includes('aria-pressed="false"'));
  assert(off.includes('saveRealityTvSpoilerPreference_(true)'));
});

test('future-results Saving/Saved/Error feedback is local', () => {
  const render = fnBlock(picks, 'renderRealityTvSpoilerShield_');
  const save = fnBlock(picks, 'saveRealityTvSpoilerPreference_');
  assert(render.includes('realitySpoilerPreferenceFeedback'));
  assert(render.includes('role="status"'));
  assert(save.includes('setRealityTvSpoilerPreferenceFeedback_("Saving…", false)'));
  assert(save.includes('setRealityTvSpoilerPreferenceFeedback_("Saved…", false)'));
  assert(save.includes('setRealityTvSpoilerPreferenceFeedback_("Error… "'));
});

test('routine future preference save never uses generic Picks message area', () => {
  const save = fnBlock(picks, 'saveRealityTvSpoilerPreference_');
  assert(!save.includes('showPicksMessage('));
});

test('successful future preference remains authoritative after stale refresh', async () => {
  const mount = { innerHTML:'' };
  const feedback = { textContent:'', classList:{ toggle(){} } };
  const button = { disabled:false, attrs:{}, setAttribute(k,v){this.attrs[k]=v;}, removeAttribute(k){delete this.attrs[k];} };
  const context = {
    PICKS_PAGE_DATA:{ gameId:'g1', realityTvView:{ enabled:true, spoilerShield:{ enabled:false } } },
    realityTvBlockingHiddenEpisode_:() => null,
    escapeJs:String, escapeHtml:String,
    document:{
      getElementById:id => id === 'realityTvSpoilerShieldMount' ? mount : (id === 'realitySpoilerPreferenceFeedback' ? feedback : null),
      querySelector:selector => selector === '.reality-spoiler-preference-button' ? button : null
    },
    apiSaveRealityTvSpoilerPreference:async () => ({success:true}),
    refreshRealityTvAfterSpoilerChange_:async () => { context.PICKS_PAGE_DATA.realityTvView.spoilerShield.enabled = false; }
  };
  vm.createContext(context);
  for (const name of ['renderRealityTvSpoilerShield_', 'setRealityTvSpoilerPreferenceFeedback_', 'applyRealityTvSpoilerPreferenceState_', 'saveRealityTvSpoilerPreference_']) {
    vm.runInContext(fnBlock(picks, name), context);
  }
  await context.saveRealityTvSpoilerPreference_(true);
  assert.strictEqual(context.PICKS_PAGE_DATA.realityTvView.spoilerShield.enabled, true);
  assert(mount.innerHTML.includes('Future results protection: ON'));
  assert(mount.innerHTML.includes('aria-pressed="true"'));
  assert(mount.innerHTML.includes('saveRealityTvSpoilerPreference_(false)'));
  assert.strictEqual(feedback.textContent, 'Saved…');
});

// Current-result spoiler control remains separate.
test('current-result Spoiler Shield remains separate from future preference', () => {
  const render = fnBlock(picks, 'renderRealityTvSpoilerShield_');
  assert(render.includes('Results Hidden'));
  assert(render.includes('Reveal Results'));
  assert(render.includes('Results Revealed'));
  assert(render.includes('Future results protection: ON'));
});

// 21-25: accepted native sections and More Stats remain unchanged in architecture.
test('Previous Episodes remains native details architecture', () => {
  assert(picks.includes('<details class="reality-previous-episodes">'));
});

test('Standings & Compare remains native details architecture', () => {
  assert(picks.includes('<details class="card reality-standings-compare-shell"'));
});

test('Help / How to Play remains native details architecture', () => {
  assert(picks.includes('<details class="reality-help-bottom reality-help-shell"'));
});

test('Sole Survivor remains native details architecture', () => {
  assert(picks.includes('<details class="season-anchor-card reality-sole-survivor-card'));
});

test('More Stats implementation remains intact', () => {
  const stats = fnBlock(picks, 'showSeasonAnchorStatsModal_');
  assert(stats.includes('More Stats'));
  assert(stats.includes('document.body.appendChild(modal)'));
  assert(picks.includes('onclick="showSeasonAnchorStatsModal_()">More Stats</button>'));
});

// Architecture guard: no new generic native-details manager or synthetic bridge.
test('R5.3 does not introduce generic native-details interception', () => {
  assert(!picks.includes('bindNativeDetails'));
  const toggle = fnBlock(picks, 'toggleRealityCurrentEpisode_');
  assert(!toggle.includes('.open'));
  assert(!toggle.includes('dispatchEvent'));
  assert(!toggle.includes('MutationObserver'));
});

Promise.all(pending).then(() => {
  console.log(`${passed}/28 focused Reality R5.3 final desktop recovery tests passed.`);
}).catch(err => {
  console.error(err);
  process.exitCode = 1;
});
