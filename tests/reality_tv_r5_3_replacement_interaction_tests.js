const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const modulePath = path.join(__dirname, '..', 'frontend', 'js', 'pages', 'realityR53Deterministic.js');
const source = fs.readFileSync(modulePath, 'utf8');
const r53 = require(modulePath);

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (error) {
    console.error('FAIL', name);
    throw error;
  }
}

test('Cast Previous/Next advances exactly one card and clamps at edges', () => {
  assert.strictEqual(r53.nextCastIndex(4, 10, 'next'), 5);
  assert.strictEqual(r53.nextCastIndex(4, 10, 'prev'), 3);
  assert.strictEqual(r53.nextCastIndex(0, 10, 'prev'), 0);
  assert.strictEqual(r53.nextCastIndex(9, 10, 'next'), 9);
});

test('Replacement contains real Cast arrow buttons and keeps Bio outside arrow activation', () => {
  assert(source.includes('data-reality-r53-cast="prev"'));
  assert(source.includes('data-reality-r53-cast="next"'));
  assert(source.includes('event.stopPropagation();\n        activateCastStep_'));
  assert(!source.includes('PICKS_REALITY_CAST_DRAG'));
});

test('No rejected global pointer/synthetic-click bridge remains', () => {
  for (const forbidden of [
    'pointerdown',
    'pointerup',
    'PICKS_REALITY_INTERACTION_BRIDGE_BOUND',
    'PICKS_REALITY_SUPPRESS_CLICK',
    'stopImmediatePropagation',
    'dispatchEvent(new MouseEvent',
    'synthetic-click'
  ]) {
    assert(!source.includes(forbidden), `unexpected rejected interaction mechanism: ${forbidden}`);
  }
});

test('Section open/closed state survives a rerender-style remount lookup', () => {
  assert.strictEqual(r53.stateOpen('current-episode', true), true);
  r53.setStateOpen('current-episode', false);
  assert.strictEqual(r53.stateOpen('current-episode', true), false);
  r53.setStateOpen('current-episode', true);
  assert.strictEqual(r53.stateOpen('current-episode', false), true);
});

test('Native details are used for accepted collapses while custom headers get real buttons', () => {
  assert(source.includes('bindNativeDetails_(sole, "sole-survivor"'));
  assert(source.includes('bindNativeDetails_(previous, "previous-episodes"'));
  assert(source.includes('bindNativeDetails_(compare, "standings-compare"'));
  assert(source.includes('bindNativeDetails_(help, "help"'));
  assert(source.includes('button.type = "button"'));
  assert(source.includes('className = "reality-r53-heading-toggle"'));
});

test('Bio and More Stats CSS is viewport safe with internal scrolling and reachable heading/close', () => {
  const css = r53.css;
  assert(css.includes('max-height:calc(100dvh - 24px)!important'));
  assert(css.includes('.reality-contestant-modal-body{'));
  assert(css.includes('overflow-y:auto!important'));
  assert(css.includes('.reality-contestant-modal-heading'));
  assert(css.includes('.season-anchor-stats-modal-heading'));
  assert(css.includes('position:sticky!important'));
  assert(css.includes('.season-anchor-stats-close'));
  assert(css.includes('body.reality-r53-modal-open'));
});

test('Classic-script patch replaces Compare selection before first Reality render', () => {
  const context = vm.createContext({
    console,
    setTimeout(fn) { fn(); },
    document: {
      head: { appendChild() {} },
      documentElement: { appendChild() {} },
      body: { classList: { toggle() {} } },
      querySelector() { return null; },
      getElementById() { return null; },
      createElement() { return {}; }
    }
  });
  vm.runInContext(`
    let PICKS_PAGE_DATA = {
      session: { username: 'joel' },
      realityTvView: { enabled: true, playerStats: { compactLeaderboard: [
        { username: 'alex' }, { username: 'joel', isCurrent: true }, { username: 'sam' }
      ] } },
      episodeComparison: { rows: [
        { username: 'alex' }, { username: 'joel' }, { username: 'sam' }
      ] }
    };
    let PICKS_REALITY_COMPARE_USER_KEYS = [];
    let PICKS_REALITY_COMPARE_USERS_INITIALIZED = false;
    let PICKS_REALITY_STANDINGS_COMPARE_TAB = 'standings';
    function realityTvCompareSelectedRows_(rows) { return rows; }
    function addRealityTvCompareUser_() {}
    function removeRealityTvCompareUser_() {}
    function setRealityTvStandingsCompareTab_() {}
    async function selectRealityTvComparisonEpisode_() {}
  `, context);
  vm.runInContext(source, context);
  const selected = JSON.parse(vm.runInContext(`JSON.stringify(realityTvCompareSelectedRows_(
    PICKS_PAGE_DATA.episodeComparison.rows,
    PICKS_PAGE_DATA.realityTvView.playerStats.compactLeaderboard
  ).map(r => r.username))`, context));
  assert.deepStrictEqual(selected, ['joel']);
});

test('Compare current user resolves from signed-in/standing data', () => {
  const compare = [
    { username: 'alex' },
    { username: 'joel' },
    { username: 'sam' }
  ];
  const standings = [
    { username: 'alex' },
    { username: 'joel', isCurrent: true },
    { username: 'sam' }
  ];
  assert.strictEqual(r53.currentCompareKeyFromData(compare, standings, 'joel'), 'joel');
});

test('Compare current user is always column 2 and extra users retain stable order', () => {
  const keys = r53.orderedCompareKeys(
    ['alex', 'joel', 'sam', 'mia'],
    'joel',
    ['sam', 'joel', 'mia'],
    true
  );
  assert.deepStrictEqual(keys, ['joel', 'sam', 'mia']);
  assert.deepStrictEqual(
    r53.orderedCompareKeys(['alex', 'joel', 'sam'], 'joel', [], false),
    ['joel']
  );
});

test('Compare current user cannot be removed', () => {
  assert.strictEqual(r53.canRemoveCompareKey('joel', 'joel'), false);
  assert.strictEqual(r53.canRemoveCompareKey('sam', 'joel'), true);
  assert(source.includes('if (!canRemoveCompareKey_(key, current)) return;'));
});

test('Compare preserves open state, Compare tab, and horizontal position across rerender', () => {
  assert(source.includes('captureCompareUi_()'));
  assert(source.includes('scrollLeft: 0'));
  assert(source.includes('wrap.scrollLeft = Math.max(0, Number(state.scrollLeft || 0))'));
  assert(source.includes('PICKS_REALITY_STANDINGS_COMPARE_TAB = "compare"'));
  assert(source.includes('state.open = true'));
});

test('Compare full-width frozen columns and three-line player header contract exist', () => {
  const css = r53.css;
  assert(css.includes('.reality-standings-compare-body'));
  assert(css.includes('padding-left:0!important'));
  assert(css.includes('.reality-compare-question-label{'));
  assert(css.includes('position:sticky!important'));
  assert(css.includes('left:0!important'));
  assert(css.includes('.reality-compare-grid-cell.is-current-reference'));
  assert(css.includes('left:var(--reality-r53-label-width)!important'));
  assert(source.includes('name.textContent = displayName'));
  assert(source.includes('points.textContent = formatPoints_(total) + " pts"'));
  assert(source.includes('rankLine.textContent = rank ? "Rank #" + rank : "Rank —"'));
});

test('Spoiler reveal and future-results preference are separate ordinary button handlers', () => {
  assert(source.includes('shell.removeAttribute("onclick")'));
  assert(source.includes('main.addEventListener("click"'));
  assert(source.includes('preference.addEventListener("click"'));
  assert(source.includes('revealRealityTvEpisode_(episodeId)'));
  assert(source.includes('saveRealityTvSpoilerPreference_(!current)'));
});

console.log(`\n${passed} focused Reality R5.3 replacement tests passed.`);
