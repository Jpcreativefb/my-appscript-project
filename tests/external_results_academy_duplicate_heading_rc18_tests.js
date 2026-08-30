const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const source = fs.readFileSync('external-engines/external-results-hub/OfficialAwardsAdapters.js', 'utf8');
const duplicateFixture = fs.readFileSync('tests/fixtures/academy_2026_duplicate_best_picture.html', 'utf8');

function key(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
function str(v) { return String(v == null ? '' : v).trim(); }
function sha(v) { return crypto.createHash('sha256').update(String(v)).digest('hex'); }

const ctx = { Object, Math, Number, String, Date, JSON, RegExp, Error, erhKey_: key, erhString_: str, erhSha256_: sha };
vm.createContext(ctx);
vm.runInContext(source, ctx);

// RC18 live reproduction: duplicate Best Picture category text exists, but only one
// occurrence is a real award-result block with an explicit Winner marker.
const parsed = ctx.erhParseAcademyCeremonyCategory_(duplicateFixture, 'Best Picture', 1);
assert.strictEqual(parsed.winner, 'One Battle After Another');
assert.strictEqual(parsed.category, 'Best Picture');
assert.strictEqual(parsed.fingerprint.length, 64);
assert(parsed.lines.includes('Winner'));
assert(parsed.lines.includes('One Battle After Another'));

// Preserve fail-closed behavior: two result-like Best Picture blocks remain ambiguous.
const ambiguous = duplicateFixture.replace(
  '</body>',
  '<section><h3>Best Picture</h3><div>Winner</div><div>Sinners</div><div>Nominees</div><div>Film X</div></section></body>'
);
assert.throws(
  () => ctx.erhParseAcademyCeremonyCategory_(ambiguous, 'Best Picture', 1),
  /expected exactly one category heading.*2 unambiguous award-result sections/
);

// Preserve fail-closed behavior when duplicate text exists but no result block is usable.
const noResult = '<html><body><h2>WINNERS &amp; NOMINEES</h2><nav><h3>Best Picture</h3></nav><div><h3>Best Picture</h3><p>Coming soon</p></div></body></html>';
assert.throws(
  () => ctx.erhParseAcademyCeremonyCategory_(noResult, 'Best Picture', 1),
  /0 unambiguous award-result sections/
);

// Safety contracts remain in the production adapter.
assert(source.includes('match.length!==1'), 'winner must still map exactly once');
assert(source.includes('mappings.length!==Number(policy.ExpectedNomineeCount||0)'), 'mapping completeness must remain required');
assert(source.includes('stats.observationId'), 'provider observation identity must remain wired through Academy sync');
assert(!source.toLowerCase().includes('google.com/search'), 'official adapter must not use generic web search');

console.log('external-results-academy-duplicate-heading-rc18-tests: PASS');
