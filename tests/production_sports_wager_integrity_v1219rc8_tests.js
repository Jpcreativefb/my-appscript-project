const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sports = fs.readFileSync(path.join(root, 'backend/engines/SportsWagerEngine.js'), 'utf8');
const preflight = fs.readFileSync(path.join(root, 'backend/admin/AdminPreflight.js'), 'utf8');

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} missing`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} closing brace missing`);
}

assert(
  sports.includes('sportsWagerRepairSetupIntegrity_(awardsGameId);'),
  'sports wager create must repair normalized question/options storage'
);
assert(
  sports.includes('CacheService.getScriptCache().remove("normalized_sync_" + gameId)'),
  'sports wager cache clear must invalidate normalized legacy-sync marker'
);
assert(
  /\["wager", "racing-wager"\][\s\S]*sportsWagerRepairSetupIntegrity_\(gameId\)/.test(preflight),
  'wager preflight must repair legacy/normalized setup before validation'
);

const fn = extractFunction(sports, 'sportsWagerRepairDuplicateDisplayOrders_');
let written = null;
const data = [
  ['GameId', 'CategoryId', 'DisplayOrder'],
  ['game-1', 'a', 1000],
  ['game-1', 'b', 1000],
  ['game-1', 'c', 1001],
  ['game-2', 'd', 1000]
];
const sheet = {
  getDataRange() { return { getValues() { return data.map(row => row.slice()); } }; },
  getRange(row, col, rows, cols) {
    return {
      setValues(values) { written = { row, col, rows, cols, values }; }
    };
  }
};
const context = {
  isFinite,
  Number,
  String,
  CATEGORY_SETTINGS_SHEET: 'CategorySettings',
  sportsWagerNormalizeGameId_: value => String(value || '').trim(),
  sportsWagerGetSheet_: () => sheet,
  sportsWagerHeaderMap_: headers => Object.fromEntries(headers.map((h, i) => [h, i])),
  sportsWagerKey_: value => String(value || '').trim().toLowerCase()
};
vm.createContext(context);
vm.runInContext(fn, context);
const repaired = context.sportsWagerRepairDuplicateDisplayOrders_('game-1');
assert.strictEqual(repaired.repaired, 2, 'duplicate sports wager display orders should be repaired');
assert(written, 'display-order repair should write repaired values');
const game1Orders = written.values.slice(0, 3).map(row => row[0]);
assert.strictEqual(new Set(game1Orders).size, 3, 'repaired wager display orders must be unique');
assert.strictEqual(written.values[3][0], 1000, 'other games must not be reordered');

console.log('production-sports-wager-integrity-v1.2.19-rc8-tests: PASS');
