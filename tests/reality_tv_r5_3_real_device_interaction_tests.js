'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');

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

function runFunctions(names, context = {}) {
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON, Boolean, Promise, Set }, context);
  vm.createContext(sandbox);
  names.forEach(name => vm.runInContext(functionSource(picks, name), sandbox));
  return sandbox;
}

function classList(initial = []) {
  const set = new Set(initial);
  return {
    add: (...names) => names.forEach(n => set.add(n)),
    remove: (...names) => names.forEach(n => set.delete(n)),
    contains: name => set.has(name),
    toggle: (name, force) => {
      if (force === undefined) force = !set.has(name);
      if (force) set.add(name); else set.delete(name);
      return force;
    },
    values: () => Array.from(set)
  };
}

function fakeAttrElement(tagName, attrs = {}, parent = null) {
  const data = Object.assign({}, attrs);
  const el = {
    tagName: tagName.toUpperCase(),
    parentElement: parent,
    children: [],
    classList: classList((attrs.class || '').split(/\s+/).filter(Boolean)),
    dataset: {},
    open: false,
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(data, name); },
    getAttribute(name) { return this.hasAttribute(name) ? String(data[name]) : null; },
    setAttribute(name, value) { data[name] = String(value); },
    querySelector(selector) {
      if (selector === '[data-reality-section-toggle]') return this.children.find(c => c.hasAttribute && c.hasAttribute('data-reality-section-toggle')) || null;
      return null;
    },
    closest(selector) {
      const parts = selector.split(',').map(s => s.trim());
      let node = this;
      while (node) {
        for (const part of parts) {
          if (part === '.reality-player-page' && node.classList && node.classList.contains('reality-player-page')) return node;
          if (part === '.reality-clean-cast-rail' && node.classList && node.classList.contains('reality-clean-cast-rail')) return node;
          if (part === '#seasonAnchorStatsModal,#realityTvContestantDetailModal') {
            if (node.getAttribute && ['seasonAnchorStatsModal','realityTvContestantDetailModal'].includes(node.getAttribute('id'))) return node;
          }
          if (part.startsWith('#') && node.getAttribute && node.getAttribute('id') === part.slice(1)) return node;
          if (part === 'summary' && node.tagName === 'SUMMARY') return node;
          if (/^\[([^\]]+)\]$/.test(part)) {
            const name = part.slice(1, -1);
            if (node.hasAttribute && node.hasAttribute(name)) return node;
          }
          if (part === 'button' && node.tagName === 'BUTTON') return node;
          if (part === 'a' && node.tagName === 'A') return node;
          if (part === 'select' && node.tagName === 'SELECT') return node;
          if (part === 'input' && node.tagName === 'INPUT') return node;
        }
        node = node.parentElement;
      }
      return null;
    }
  };
  Object.keys(attrs).forEach(k => {
    if (k.startsWith('data-')) {
      const prop = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el.dataset[prop] = String(attrs[k]);
    }
  });
  return el;
}

// 1) R5.3 uses one delegated interaction bridge that survives rerender and mounts once.
{
  const listeners = [];
  const document = { addEventListener(type, fn, options) { listeners.push({ type, fn, options }); } };
  const ctx = runFunctions([
    'mountRealityTvInteractionBridge_'
  ], {
    document,
    PICKS_REALITY_INTERACTION_BRIDGE_BOUND: false,
    realityTvHandlePointerDown_: () => {}, realityTvHandlePointerMove_: () => {}, realityTvHandlePointerUp_: () => {},
    realityTvHandleClick_: () => {}, realityTvHandleKeydown_: () => {}, realityTvHandleCastWheel_: () => {},
    PICKS_REALITY_POINTER_START: null, PICKS_REALITY_CAST_DRAG: null
  });
  ctx.mountRealityTvInteractionBridge_();
  ctx.mountRealityTvInteractionBridge_();
  const counts = listeners.reduce((m, item) => (m[item.type] = (m[item.type] || 0) + 1, m), {});
  for (const type of ['pointerdown','pointermove','pointerup','pointercancel','click','keydown','wheel']) {
    assert.strictEqual(counts[type], 1, `${type} listener must mount exactly once`);
  }
}

// 2) Section toggling is explicit and does not depend on native mobile details behavior.
{
  const page = fakeAttrElement('div', { class: 'reality-player-page' });
  const section = fakeAttrElement('section', { 'data-reality-section-key': 'current-episode' }, page);
  const header = fakeAttrElement('div', { 'data-reality-section-toggle': '', 'aria-expanded': 'true' }, section);
  section.children.push(header);
  header.closest = function(selector) {
    if (selector === '[data-reality-section-key]') return section;
    if (selector === '.reality-player-page') return page;
    return fakeAttrElement('div').closest.call(this, selector);
  };
  const ctx = runFunctions(['realityTvSectionHostFromToggle_', 'realityTvSetSectionOpen_', 'realityTvToggleSection_'], {
    PICKS_REALITY_SECTION_OPEN_STATE: {}
  });
  assert.strictEqual(ctx.realityTvToggleSection_(header), true);
  assert(section.classList.contains('is-reality-section-collapsed'));
  assert.strictEqual(header.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(ctx.realityTvToggleSection_(header), true);
  assert(!section.classList.contains('is-reality-section-collapsed'));
  assert.strictEqual(header.getAttribute('aria-expanded'), 'true');

  const details = fakeAttrElement('details', { 'data-reality-section-key': 'previous-episodes' }, page);
  details.open = false;
  const summary = fakeAttrElement('summary', {}, details);
  details.children.push(summary);
  assert.strictEqual(ctx.realityTvToggleSection_(summary), true);
  assert.strictEqual(details.open, true);
  assert.strictEqual(ctx.realityTvToggleSection_(summary), true);
  assert.strictEqual(details.open, false);
}

// 3) Touch activation fires once on pointerup and suppresses the synthetic follow-up click.
{
  let opened = 0;
  const page = fakeAttrElement('div', { class: 'reality-player-page' });
  const button = fakeAttrElement('button', { 'data-reality-open-contestant': 'c-7' }, page);
  const ctx = runFunctions([
    'realityTvActivationElement_', 'realityTvHandleActivation_', 'realityTvPointerMoved_', 'realityTvHandlePointerUp_', 'realityTvHandleClick_'
  ], {
    PICKS_REALITY_POINTER_START: { pointerId: 5, pointerType: 'touch', x: 20, y: 20, moved: false },
    PICKS_REALITY_CAST_DRAG: null, PICKS_REALITY_CAST_DRAG_SUPPRESS_UNTIL: 0,
    PICKS_REALITY_SUPPRESS_CLICK_ELEMENT: null, PICKS_REALITY_SUPPRESS_CLICK_UNTIL: 0,
    showRealityTvContestantDetailModal_: id => { assert.strictEqual(id, 'c-7'); opened++; },
    closeRealityTvContestantDetailModal_: () => {}, closeSeasonAnchorStatsModal_: () => {}, showSeasonAnchorStatsModal_: () => {},
    revealRealityTvEpisode_: () => {}, saveRealityTvSpoilerPreference_: () => {}, realityTvToggleSection_: () => false
  });
  ctx.realityTvHandlePointerUp_({ pointerId: 5, clientX: 21, clientY: 20, target: button });
  assert.strictEqual(opened, 1, 'touch pointerup must open exactly one contestant modal');
  let prevented = false;
  ctx.realityTvHandleClick_({ target: button, preventDefault(){prevented=true;}, stopImmediatePropagation(){} });
  assert.strictEqual(opened, 1, 'synthetic click after touch must not open a second modal');
  assert(prevented, 'synthetic click must be suppressed');
}


// 3b) Both the Season Cast card and Bio button resolve the selected contestant through the same delegated path; close works by touch.
{
  const page = fakeAttrElement('div', { class: 'reality-player-page' });
  const card = fakeAttrElement('article', { 'data-reality-open-contestant': 'c-8' }, page);
  const cardText = fakeAttrElement('span', {}, card);
  const bio = fakeAttrElement('button', { 'data-reality-open-contestant': 'c-9' }, card);
  const modal = fakeAttrElement('div', { id: 'realityTvContestantDetailModal', class: 'season-anchor-confirm-backdrop' });
  const close = fakeAttrElement('button', { 'data-reality-modal-close': 'contestant' }, modal);
  let opened = [], closed = 0;
  const ctx = runFunctions(['realityTvActivationElement_', 'realityTvHandleActivation_'], {
    showRealityTvContestantDetailModal_: id => opened.push(id),
    closeRealityTvContestantDetailModal_: () => { closed++; }, closeSeasonAnchorStatsModal_: () => {}, showSeasonAnchorStatsModal_: () => {},
    revealRealityTvEpisode_: () => {}, saveRealityTvSpoilerPreference_: () => {}, realityTvToggleSection_: () => false
  });
  const cardActivation = ctx.realityTvActivationElement_(cardText);
  assert.strictEqual(cardActivation, card);
  assert(ctx.realityTvHandleActivation_({ target: cardText }, cardActivation));
  const bioActivation = ctx.realityTvActivationElement_(bio);
  assert.strictEqual(bioActivation, bio);
  assert(ctx.realityTvHandleActivation_({ target: bio }, bioActivation));
  assert.deepStrictEqual(opened, ['c-8','c-9']);
  assert(ctx.realityTvHandleActivation_({ target: close }, close));
  assert.strictEqual(closed, 1);
}

// 4) Spoiler reveal and future preference go through delegated controls rather than dead inline handlers.
{
  let revealed = '', pref = null;
  const page = fakeAttrElement('div', { class: 'reality-player-page' });
  const reveal = fakeAttrElement('button', { 'data-reality-spoiler-reveal': 'ep-9' }, page);
  const preference = fakeAttrElement('button', { 'data-reality-spoiler-preference': 'false' }, page);
  const ctx = runFunctions(['realityTvHandleActivation_'], {
    revealRealityTvEpisode_: id => { revealed = id; },
    saveRealityTvSpoilerPreference_: value => { pref = value; },
    showRealityTvContestantDetailModal_: () => {}, showSeasonAnchorStatsModal_: () => {},
    closeRealityTvContestantDetailModal_: () => {}, closeSeasonAnchorStatsModal_: () => {}, realityTvToggleSection_: () => false
  });
  assert(ctx.realityTvHandleActivation_({ target: reveal }, reveal));
  assert.strictEqual(revealed, 'ep-9');
  assert(ctx.realityTvHandleActivation_({ target: preference }, preference));
  assert.strictEqual(pref, false);
  const render = functionSource(picks, 'renderRealityTvSpoilerShield_');
  assert(render.includes('data-reality-spoiler-reveal'));
  assert(render.includes('data-reality-spoiler-preference'));
  assert(!render.includes('onclick="activateRealityTvSpoilerShield_'));
  assert(functionSource(picks, 'revealRealityTvEpisode_').includes('apiRevealRealityTvEpisode'));
  assert(functionSource(picks, 'revealRealityTvEpisode_').includes('refreshRealityTvAfterSpoilerChange_'));
  assert(functionSource(picks, 'saveRealityTvSpoilerPreference_').includes('apiSaveRealityTvSpoilerPreference'));
  assert(functionSource(picks, 'saveRealityTvSpoilerPreference_').includes('refreshRealityTvAfterSpoilerChange_'));
}

// 5) Cast rail supports wheel scrolling and mouse drag while touch remains native horizontal pan.
{
  const page = fakeAttrElement('div', { class: 'reality-player-page' });
  const rail = fakeAttrElement('div', { class: 'reality-clean-cast-rail' }, page);
  rail.clientWidth = 300; rail.scrollWidth = 900; rail.scrollLeft = 100;
  const child = fakeAttrElement('div', {}, rail);
  let prevented = false;
  const ctx = runFunctions(['realityTvHandleCastWheel_', 'realityTvHandlePointerDown_', 'realityTvHandlePointerMove_', 'realityTvHandlePointerUp_', 'realityTvPointerMoved_'], {
    PICKS_REALITY_POINTER_START: null, PICKS_REALITY_CAST_DRAG: null, PICKS_REALITY_CAST_DRAG_SUPPRESS_UNTIL: 0,
    PICKS_REALITY_SUPPRESS_CLICK_ELEMENT: null, PICKS_REALITY_SUPPRESS_CLICK_UNTIL: 0,
    realityTvActivationElement_: () => null, realityTvHandleActivation_: () => false
  });
  ctx.realityTvHandleCastWheel_({ target: child, deltaX: 0, deltaY: 45, preventDefault(){prevented=true;} });
  assert.strictEqual(rail.scrollLeft, 145);
  assert(prevented);

  ctx.realityTvHandlePointerDown_({ isPrimary:true, pointerType:'mouse', pointerId:2, button:0, clientX:200, clientY:20, target:child });
  ctx.realityTvHandlePointerMove_({ pointerId:2, clientX:150, clientY:20, preventDefault(){} });
  assert.strictEqual(rail.scrollLeft, 195, 'mouse drag should move horizontal rail');
  ctx.realityTvHandlePointerUp_({ pointerId:2, clientX:150, clientY:20, target:child });
  assert(!rail.classList.contains('is-dragging'));
  assert(css.includes('touch-action:pan-x pan-y!important'));
}

// 6) Bio + More Stats use body-mounted delegated open/close and body scroll lock.
{
  const showBio = functionSource(picks, 'showRealityTvContestantDetailModal_');
  const showStats = functionSource(picks, 'showSeasonAnchorStatsModal_');
  const closeBio = functionSource(picks, 'closeRealityTvContestantDetailModal_');
  const closeStats = functionSource(picks, 'closeSeasonAnchorStatsModal_');
  assert(showBio.includes('realityTvContestantProfileById_(entityId)'));
  assert(showBio.includes('data-reality-modal-close="contestant"'));
  assert(showBio.includes('realityTvSyncBodyModalLock_()'));
  assert(showStats.includes('data-reality-modal-close="season-stats"'));
  assert(showStats.includes('realityTvSyncBodyModalLock_()'));
  assert(closeBio.includes('realityTvSyncBodyModalLock_()'));
  assert(closeStats.includes('realityTvSyncBodyModalLock_()'));
  assert(picks.includes('data-reality-open-contestant="${attr_(entityId)}"'));
  assert(picks.includes('data-reality-more-stats="1"'));
  assert(css.includes('body.reality-modal-open'));
  assert(css.includes('body > .season-anchor-confirm-backdrop [data-reality-modal-close]'));
}

// 7) Hydration/rerender applies remembered open state and reuses delegated listeners.
{
  const refresh = functionSource(picks, 'refreshRealityTvInteractionBridge_');
  assert(refresh.includes('mountRealityTvInteractionBridge_()'));
  assert(refresh.includes('applyRealityTvSectionOpenState_'));
  assert(picks.includes('refreshRealityTvInteractionBridge_(page)'));
  for (const key of ['current-episode','previous-episodes','season-cast','your-season','standings-compare','help']) {
    assert(picks.includes(`data-reality-section-key="${key}"`), `missing section state key ${key}`);
  }
}

console.log('Reality TV R5.3 real-device interaction focused tests passed.');
