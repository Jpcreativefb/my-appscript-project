const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.argv[2] || path.resolve(__dirname, '..');
const engineText = fs.readFileSync(path.join(root, 'backend/engines/KingOfHillEngine.js'), 'utf8');
const survivorText = fs.readFileSync(path.join(root, 'backend/engines/SurvivorGameEngine.js'), 'utf8');
const sportsText = fs.readFileSync(path.join(root, 'backend/engines/SportsSurvivorEngine.js'), 'utf8');
const adminText = fs.readFileSync(path.join(root, 'frontend/js/pages/admin.js'), 'utf8');
const pageText = fs.readFileSync(path.join(root, 'frontend/js/pages/survivor.js'), 'utf8');

const context = { console, Number, Math, JSON, Date, Object, Array, String };
vm.createContext(context);
vm.runInContext(engineText, context);

function players(count, strikes) {
  return Array.from({ length: count }, (_, i) => ({ username: 'u' + (i + 1), strikes: strikes || 0, eliminated: false, score: 100 - i }));
}

// User's pacing examples: 14 players x 3 strikes over 14 weeks ~= bottom 3.
assert.strictEqual(context.kothAutomaticRecipientCount_(players(14, 0), 1, 14, 3, 1, 0), 3);
// 20 players x 3 strikes over 14 weeks ~= bottom 4.
assert.strictEqual(context.kothAutomaticRecipientCount_(players(20, 0), 1, 14, 3, 1, 0), 4);
// Late season with players on two strikes narrows to one recipient.
assert.strictEqual(context.kothAutomaticRecipientCount_(players(5, 2), 13, 17, 3, 1, 0), 1);

assert.strictEqual(context.kothCustomRecipientCount_('1-4:4, 5-8:3, 9-12:2, 13-17:1', 2), 4);
assert.strictEqual(context.kothCustomRecipientCount_('1-4:4, 5-8:3, 9-12:2, 13-17:1', 15), 1);
assert.strictEqual(context.kothAggregateValues_([10, 20, 30], 'sum'), 60);
assert.strictEqual(context.kothAggregateValues_([10, 20, 30], 'average'), 20);
assert.strictEqual(context.kothAggregateValues_([10, 20, 30], 'highest'), 30);
assert.strictEqual(context.kothAggregateValues_([10, 20, 30], 'lowest'), 10);

// Include all ties at an ordinary cutoff.
let selection = context.kothSelectRecipients_([
  { username: 'a', score: 100, strikes: 0, eliminated: false },
  { username: 'b', score: 90, strikes: 0, eliminated: false },
  { username: 'c', score: 80, strikes: 0, eliminated: false },
  { username: 'd', score: 80, strikes: 0, eliminated: false },
  { username: 'e', score: 70, strikes: 0, eliminated: false }
], 2, { endWeek: 17, kothTieRule: 'include-all', kothStrikeLimit: 3 }, [], 2);
assert.deepStrictEqual(Array.from(selection.recipients.map(x => x.username)).sort(), ['c', 'd', 'e']);
assert.strictEqual(selection.tieApplied, true);

// Final stretch breaks a tied cutoff to avoid multiple eliminations.
selection = context.kothSelectRecipients_([
  { username: 'a', score: 80, strikes: 2, eliminated: false },
  { username: 'b', score: 80, strikes: 2, eliminated: false },
  { username: 'c', score: 100, strikes: 1, eliminated: false }
], 1, { endWeek: 17, kothTieRule: 'include-all', kothStrikeLimit: 3 }, [], 16);
assert.strictEqual(selection.recipients.length, 1);
assert.strictEqual(selection.tieApplied, true);

// Integration markers: KOTH is passive and separate from active Streak Survivor.
assert(sportsText.includes('"streak-survivor", "king-of-the-hill"'));
assert(sportsText.includes('kingOfHillRunAutomation_'));
assert(survivorText.includes('apiGetKingOfHillState_'));
assert(survivorText.includes('King of the Hill is automatic. There is no weekly KOTH pick to submit.'));
assert(adminText.includes('name="kothSourceGameId"'));
assert(adminText.includes('Combine Multiple Games'));
assert(adminText.includes('Automatic — Recommended'));
assert(pageText.includes('renderKingOfHillPage_'));
assert(pageText.includes('You do not need to submit an extra pick'));
assert(engineText.includes('KingOfHillHistory'));
assert(engineText.includes('KingOfHillSourceSnapshots'));
assert(engineText.includes('duplicate: true'));

console.log('king-of-the-hill-score-strikes-v1218y-tests: PASS');
