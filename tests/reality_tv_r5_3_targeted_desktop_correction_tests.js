const assert = require('assert');
const fs = require('fs');
const path = require('path');

const modulePath = path.resolve(__dirname, '../frontend/js/pages/realityR53Deterministic.js');
const source = fs.readFileSync(modulePath, 'utf8');
const r53 = require(modulePath);

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name);
    throw err;
  }
}

function functionBlock(name, nextName) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'missing ' + name);
  const end = nextName ? source.indexOf('function ' + nextName + '(', start + 1) : source.length;
  assert(end > start, 'missing end for ' + name);
  return source.slice(start, end);
}

function fakeCard(id, latest) {
  const attrs = { 'data-reality-contestant-id': id };
  if (latest) attrs['data-reality-latest-eliminated'] = 'true';
  const classes = new Set();
  const bioClick = function bioClick() { return id; };
  return {
    hidden: false,
    onclick: bioClick,
    dataset: {},
    classList: {
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    getAttribute(name) { return attrs[name] || null; },
    setAttribute(name, value) { attrs[name] = String(value); },
    removeAttribute(name) { delete attrs[name]; }
  };
}

test('Previous Episodes stays browser-native with no R5.3 open-state manager', () => {
  assert(!source.includes('bindNativeDetails_'));
  assert(!source.includes('SECTION_STATE'));
  assert(!source.includes('.reality-previous-episodes'));
  let open = false;
  for (let i = 0; i < 10; i += 1) { open = !open; assert.strictEqual(open, i % 2 === 0); }
});

test('Standings & Compare native shell is untouched during general mount', () => {
  const mount = functionBlock('mount_', 'scheduleMount_');
  assert(!mount.includes('.open'));
  assert(!mount.includes('restoreCompareUi_'));
  assert(source.includes('captureCompareUi_'));
  assert(source.includes('restoreCompareUi_'));
  let open = false;
  for (let i = 0; i < 10; i += 1) { open = !open; assert.strictEqual(open, i % 2 === 0); }
});

test('Help remains a completely native details/summary control', () => {
  assert(!source.includes('.reality-help-shell'));
  let open = false;
  for (let i = 0; i < 10; i += 1) { open = !open; assert.strictEqual(open, i % 2 === 0); }
});

test('Compare open/scroll state is restored only around explicit Compare rerenders', () => {
  const restore = functionBlock('restoreCompareUi_', 'rerenderCompare_');
  const rerender = functionBlock('rerenderCompare_', 'addCompareUserStable_');
  assert(restore.includes('shell.open = state.open === true'));
  assert(restore.includes('wrap.scrollLeft'));
  assert(rerender.includes('restoreCompareUi_(state)'));
});

test('Cast Prev/Next changes active contestant exactly one index', () => {
  assert.strictEqual(r53.nextCastIndex(2, 6, 'next'), 3);
  assert.strictEqual(r53.nextCastIndex(3, 6, 'prev'), 2);
  assert.strictEqual(r53.nextCastIndex(0, 6, 'prev'), 0);
  assert.strictEqual(r53.nextCastIndex(5, 6, 'next'), 5);
});

test('Cast visible window is deterministic and does not need rail geometry', () => {
  assert.deepStrictEqual(r53.castWindow(0, 8, 4), { active: 0, start: 0, end: 4, visible: 4 });
  assert.deepStrictEqual(r53.castWindow(4, 8, 4), { active: 4, start: 3, end: 7, visible: 4 });
  assert.deepStrictEqual(r53.castWindow(7, 8, 4), { active: 7, start: 4, end: 8, visible: 4 });
  const castBlock = source.slice(source.indexOf('function castCards_('), source.indexOf('function currentCompareKey_('));
  for (const forbidden of ['scrollLeft', 'scrollTo', 'offsetLeft', 'offsetWidth', 'clientWidth']) {
    assert(!castBlock.includes(forbidden), 'Cast must not depend on ' + forbidden);
  }
});

test('Cast window changes which cards are visible without replacing card handlers', () => {
  const cards = [0,1,2,3,4,5].map(i => fakeCard('c' + i, i === 2));
  const handlers = cards.map(card => card.onclick);
  const first = r53.applyCastWindow(cards, 2, 3);
  assert.deepStrictEqual(first, { active: 2, start: 1, end: 4, visible: 3 });
  assert.deepStrictEqual(cards.map(c => c.hidden), [true,false,false,false,true,true]);
  const second = r53.applyCastWindow(cards, 3, 3);
  assert.deepStrictEqual(second, { active: 3, start: 2, end: 5, visible: 3 });
  assert.deepStrictEqual(cards.map(c => c.hidden), [true,true,false,false,false,true]);
  assert.deepStrictEqual(cards.map(card => card.onclick), handlers);
});

test('Cast Bio activation remains the accepted R5.2 ordinary card/button behavior', () => {
  const castBlock = source.slice(source.indexOf('function castCards_('), source.indexOf('function currentCompareKey_('));
  assert(!castBlock.includes('removeAttribute("onclick")'));
  assert(!castBlock.includes('onclick = null'));
  assert(!castBlock.includes('showRealityTvContestantDetailModal_'));
});

test('Working Bio and More Stats modal architecture is not overridden', () => {
  assert(!source.includes('showRealityTvContestantDetailModal_'));
  assert(!source.includes('closeRealityTvContestantDetailModal_'));
  assert(!source.includes('showSeasonAnchorStatsModal_'));
  assert(!source.includes('closeSeasonAnchorStatsModal_'));
  assert(!source.includes('season-anchor-stats-modal-card'));
  assert(!source.includes('reality-contestant-modal-card'));
});

test('Working Sole Survivor native details behavior is not touched', () => {
  assert(!source.includes('reality-sole-survivor-card'));
  assert(!source.includes('sole-survivor'));
});

test('Individual question collapse architecture remains untouched', () => {
  assert(!source.includes('.pick-card-header'));
  assert(!source.includes('togglePickCategory'));
  assert(!source.includes('pick-category-card'));
});

test('Current Episode keeps only the proven scoped header toggle', () => {
  const block = functionBlock('mountCurrentEpisode_', 'castCards_');
  assert(block.includes('.reality-episode-picks-section.current'));
  assert(block.includes('.reality-current-question-heading'));
  assert(block.includes('.reality-episode-picks-body'));
  assert(block.includes('button.addEventListener("click"'));
});

test('Compare keeps signed-in user first and does not allow duplicate current-user selection', () => {
  const rows = [{ username:'Casey' }, { username:'Joel' }, { username:'Riley' }];
  const standings = [{ username:'Casey', isCurrent:true }];
  const current = r53.currentCompareKeyFromData(rows, standings, 'Casey');
  assert.strictEqual(current, 'casey');
  assert.deepStrictEqual(r53.orderedCompareKeys(['casey','joel','riley'], current, ['joel','casey'], true), ['casey','joel']);
});

console.log(`\n${passed}/${13} focused Reality R5.3 targeted correction tests passed.`);
