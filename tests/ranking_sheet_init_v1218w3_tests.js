const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/RankingGameEngine.js'), 'utf8');

assert(engine.includes('RANKING GAME ENGINE v1.2.18w3'), 'w3 engine marker missing');
assert(engine.includes('const lock = LockService.getScriptLock();'), 'RankingEntries creation must use a script lock');
assert(engine.includes('lock.waitLock(10000);'), 'RankingEntries creation must wait for the creation lock');
assert(engine.includes('sh = ss.getSheetByName(RANKING_ENTRIES_SHEET);\n      if (!sh) {'), 'RankingEntries must be re-checked after acquiring the lock');
assert(engine.includes('if (locked) lock.releaseLock();'), 'RankingEntries creation lock must always be released');
assert(engine.includes('sh = ss.getSheetByName(RANKING_ENTRIES_SHEET);\n          if (!sh) throw error;'), 'insertSheet race must fall back to the existing sheet');

const insertOccurrences = (engine.match(/insertSheet\(RANKING_ENTRIES_SHEET\)/g) || []).length;
assert.strictEqual(insertOccurrences, 1, 'RankingEntries should have one controlled insert point');

console.log('Ranking sheet initialization v1.2.18w3 tests passed.');
