const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const adapterSource = fs.readFileSync('external-engines/external-results-hub/OfficialAwardsAdapters.js', 'utf8');
const policySource = fs.readFileSync('external-engines/external-results-hub/ResultSourcePolicy.js', 'utf8');
const oneRealFixture = fs.readFileSync('tests/fixtures/academy_2026_duplicate_best_picture.html', 'utf8');
const equivalentFixture = fs.readFileSync('tests/fixtures/academy_2026_live_best_picture_duplicate_semantic.html', 'utf8');

function key(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
function str(v) { return String(v == null ? '' : v).trim(); }
function sha(v) { return crypto.createHash('sha256').update(String(v)).digest('hex'); }

const ctx = { Object, Math, Number, String, Date, JSON, RegExp, Error, isFinite, erhKey_: key, erhString_: str, erhSha256_: sha };
vm.createContext(ctx);
vm.runInContext(adapterSource, ctx);
vm.runInContext(policySource, ctx);

// 1. Duplicate headings + one real result section remains deterministic.
const oneReal = ctx.erhParseAcademyCeremonyCategory_(oneRealFixture, 'Best Picture', 1);
assert.strictEqual(ctx.erhAcademyNorm_(oneReal.winner), 'one battle after another');
assert.strictEqual(oneReal.fingerprint.length, 64);

// 2. Two equivalent result representations of the same winner collapse to one result.
const equivalent = ctx.erhParseAcademyCeremonyCategory_(equivalentFixture, 'Best Picture', 1);
assert.strictEqual(ctx.erhAcademyNorm_(equivalent.winner), 'one battle after another');
assert.strictEqual(equivalent.equivalentSections, 2);
assert.strictEqual(equivalent.fingerprint.length, 64);

// The choice of representative evidence is deterministic, not first/last DOM order.
const firstSection = equivalentFixture.match(/<section data-sanitized-representation="a">[\s\S]*?<\/section>/)[0];
const secondSection = equivalentFixture.match(/<section data-sanitized-representation="b">[\s\S]*?<\/section>/)[0];
const reordered = equivalentFixture.replace(firstSection, '__FIRST__').replace(secondSection, firstSection).replace('__FIRST__', secondSection);
const equivalentReordered = ctx.erhParseAcademyCeremonyCategory_(reordered, 'Best Picture', 1);
assert.strictEqual(equivalentReordered.fingerprint, equivalent.fingerprint,
  'duplicate presentation order must not change selected evidence fingerprint');

// 3. Conflicting candidate winners remain fail-closed.
const conflicting = equivalentFixture.replace(
  '<div>One Battle After Another</div>',
  '<div>Sinners</div>'
);
assert.throws(
  () => ctx.erhParseAcademyCeremonyCategory_(conflicting, 'Best Picture', 1),
  /2 unambiguous award-result sections/
);

// 4. No deterministic winner remains fail-closed.
const noWinner = '<html><body><h2>WINNERS &amp; NOMINEES</h2>' +
  '<section><h3>Best Picture</h3><div>Nominees</div><div>Film A</div></section>' +
  '<section><h3>Best Picture</h3><div>Coming soon</div></section></body></html>';
assert.throws(
  () => ctx.erhParseAcademyCeremonyCategory_(noWinner, 'Best Picture', 1),
  /0 unambiguous award-result sections/
);

// 5. Observation identity/idempotency remains intact.
let state = ctx.erhPolicyObservationState_({DetectedFingerprint:'',LastObservationId:'',StableCheckCount:0}, equivalent.fingerprint, 'academy-run-1');
assert.strictEqual(state.distinct, true);
assert.strictEqual(state.stableCheckCount, 1);
state = ctx.erhPolicyObservationState_({DetectedFingerprint:equivalent.fingerprint,LastObservationId:'academy-run-1',StableCheckCount:1}, equivalent.fingerprint, 'academy-run-1');
assert.strictEqual(state.distinct, false);
assert.strictEqual(state.stableCheckCount, 1, 'same observation cannot count twice');
state = ctx.erhPolicyObservationState_({DetectedFingerprint:equivalent.fingerprint,LastObservationId:'academy-run-1',StableCheckCount:1}, equivalent.fingerprint, 'academy-run-2');
assert.strictEqual(state.distinct, true);
assert.strictEqual(state.stableCheckCount, 2, 'later distinct matching observation may advance stability');
state = ctx.erhPolicyObservationState_({DetectedFingerprint:equivalent.fingerprint,LastObservationId:'academy-run-2',StableCheckCount:2}, sha('changed-result'), 'academy-run-3');
assert.strictEqual(state.stableCheckCount, 1, 'changed fingerprint restarts stability');

// Existing source-policy safety wiring remains present.
assert(adapterSource.includes('match.length!==1'), 'winner must still map exactly once');
assert(adapterSource.includes('mappings.length!==Number(policy.ExpectedNomineeCount||0)'), 'mapping completeness must remain required');
assert(adapterSource.includes('stats.observationId'), 'Academy sync must retain provider-run observation identity');
assert(policySource.includes('REALITY_NATIVE_REVIEW_REQUIRED'), 'Reality native-review safety must remain');
assert(policySource.includes('CORROBORATION'), 'corroboration tier safety must remain');

console.log('external-results-academy-semantic-duplicate-rc19-tests: PASS');
