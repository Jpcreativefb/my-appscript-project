const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const engine = read('backend/engines/VotingCompetitionEngine.js');
const security = read('backend/core/ApiSecurity.js');
const page = read('frontend/js/pages/voting.js');
const admin = read('frontend/js/pages/adminGameSetup.js');
const client = read('frontend/js/api.js');
const css = read('frontend/css/pages.css');
const generalContract = read('tests/admin_general_custom_r8_r2_tests.js');

assert(!engine.includes('CookoffEngine'), 'Cookoff must extend VotingCompetitionEngine, not create a parallel engine');
assert(engine.includes('VOTING_COMPETITION_EVALUATIONS_SHEET = "VotingCompetitionEvaluations"'), 'server evaluation persistence sheet missing');
assert(engine.includes('function votingCompetitionSaveEvaluationStateUnlocked_'), 'evaluation upsert authority missing');
assert(engine.includes('function votingCompetitionWeightedCriteriaScore_'), 'weighted criteria authority missing');
assert(engine.includes('function votingCompetitionCoverageWeight_'), 'coverage weighting authority missing');
assert(engine.includes('function votingCompetitionDeadlinePassed_'), 'deadline authority missing');
assert(engine.includes('existingBallots.length && votingCompetitionScoringContractChanged_'), 'scoring contract lock missing');
assert(engine.includes('matchingRows') && engine.includes('deleteRow'), 'retry-safe logical ballot replacement missing');

const sandbox = { console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set, isFinite, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(engine, sandbox);

const defaults = sandbox.votingCompetitionDefaultSettings_('cookoff-v1');

// 1-5: Backward compatibility with existing rank ballot behavior.
assert.strictEqual(sandbox.votingCompetitionBallotLimit_(Object.assign({}, defaults, { votingMethod: 'favorite' }), 20), 1, 'Favorite must remain one choice');
assert.strictEqual(sandbox.votingCompetitionBallotLimit_(Object.assign({}, defaults, { votingMethod: 'top-n', rankLimit: 3 }), 9), 3, 'Top-N must remain rankLimit choices');
assert.strictEqual(sandbox.votingCompetitionBallotLimit_(Object.assign({}, defaults, { votingMethod: 'rank-all' }), 9), 9, 'Rank All must remain all entries');
assert.strictEqual(sandbox.votingCompetitionPointsForRank_(2, Object.assign({}, defaults, { scoringMode: 'borda' }), 5), 4, 'Borda scoring regressed');
assert.strictEqual(sandbox.votingCompetitionPointsForRank_(2, Object.assign({}, defaults, { scoringMode: 'custom-points', pointValues: [10, 7, 5] }), 3), 7, 'custom rank points regressed');

// 6-9: Persisted evaluated state, tasted-only eligibility, and minimum enforcement.
assert(engine.includes('row[col.evaluated]') && engine.includes('row[col.criteriajson]'), 'evaluation state is not persisted server-side');
const entries = [{entryId:'a'},{entryId:'b'},{entryId:'c'}];
const evalMap = { a:{entryId:'a',evaluated:true}, b:{entryId:'b',evaluated:true}, c:{entryId:'c',evaluated:false} };
const eligible = sandbox.votingCompetitionEligibleEntries_(entries, evalMap, Object.assign({}, defaults, { evaluatedOnly:true }));
assert.deepStrictEqual(Array.from(eligible, row => row.entryId), ['a','b'], 'evaluated-only eligibility must filter untasted entries');
assert.throws(() => sandbox.votingCompetitionValidateBallot_([{entryId:'a',rank:1},{entryId:'c',rank:2}], eligible, Object.assign({}, defaults, {rankLimit:2})), /Invalid competition entry/i, 'untasted entry must be rejected server-side');
assert.throws(() => sandbox.votingCompetitionAssertMinimumEvaluated_({minimumEvaluatedEntries:3}, 2), /Evaluate at least 3/i, 'minimum evaluated rejection missing');
assert.doesNotThrow(() => sandbox.votingCompetitionAssertMinimumEvaluated_({minimumEvaluatedEntries:2}, 2), 'minimum evaluated acceptance failed');

// 10-13: Criteria schema/scores and authoritative weighted/combined formulas.
const criteria = sandbox.votingCompetitionNormalizeCriteria_([
  {id:'taste',label:'Taste',minScore:1,maxScore:10,weight:40},
  {id:'texture',label:'Texture',minScore:1,maxScore:5,weight:60}
], true);
assert.strictEqual(criteria.length, 2, 'valid criterion schema rejected');
assert.throws(() => sandbox.votingCompetitionNormalizeCriteria_([{id:'bad',label:'Bad',minScore:1,maxScore:1,weight:1}], true), /criterion/i, 'invalid criterion range accepted');
assert.throws(() => sandbox.votingCompetitionNormalizeCriteria_([{id:'bad',label:'Bad',minScore:0,maxScore:10,weight:-1}], true), /criterion/i, 'negative criterion weight accepted');
assert.throws(() => sandbox.votingCompetitionValidateCriterionScores_(criteria, {taste:11,texture:3}, true), /Taste must be between/i, 'out-of-range score accepted');
assert.throws(() => sandbox.votingCompetitionValidateCriterionScores_(criteria, {taste:8,unknown:3}, true), /Unknown judging criterion/i, 'unknown criterion accepted');
const criteriaScore = sandbox.votingCompetitionWeightedCriteriaScore_(criteria, {taste:10,texture:5});
assert.strictEqual(criteriaScore, 100, 'perfect weighted criteria score must equal 100');
const halfScore = sandbox.votingCompetitionWeightedCriteriaScore_(criteria, {taste:5.5,texture:3});
assert.strictEqual(halfScore, 50, 'normalized weighted criteria score formula mismatch');
const combined = sandbox.votingCompetitionCombinedScore_(10, 10, 50, {combinedRankWeight:1,combinedCriteriaWeight:1});
assert.strictEqual(combined, 75, 'combined rank + criteria formula mismatch');

// 14-15: Equal and coverage ballot weighting.
assert.strictEqual(sandbox.votingCompetitionCoverageWeight_(2, 4, 'equal'), 1, 'equal ballot weighting must be 1');
assert.strictEqual(sandbox.votingCompetitionCoverageWeight_(1, 4, 'coverage'), 0.5, 'coverage weighting must use sqrt(evaluated/total)');
assert.strictEqual(sandbox.votingCompetitionCoverageWeight_(4, 4, 'coverage'), 1, 'full coverage must equal 1');

// 16: Deadline is authoritative in the backend, independent of UI.
const past = new Date(Date.now() - 60000).toISOString();
const future = new Date(Date.now() + 60000).toISOString();
assert.strictEqual(sandbox.votingCompetitionDeadlinePassed_({votingDeadline:past}), true, 'past deadline must be closed');
assert.strictEqual(sandbox.votingCompetitionDeadlinePassed_({votingDeadline:future}), false, 'future deadline must remain open');
assert.strictEqual(sandbox.votingCompetitionVotingOpen_({votingLocked:false,votingDeadline:past}, {votingLocked:false,lockAllPicks:false}), false, 'save-path deadline gate missing');
assert(engine.includes('"Voting deadline has passed."'), 'authoritative save path must reject after deadline');

// 17: Every unsafe Cookoff scoring field participates in the existing first-ballot contract lock.
const contractBase = Object.assign({}, defaults, {criteria, judgingMode:'combined', evaluatedOnly:true, minimumEvaluatedEntries:2, ballotWeighting:'equal'});
assert.strictEqual(sandbox.votingCompetitionScoringContractChanged_(contractBase, Object.assign({}, contractBase)), false, 'identical scoring contract should not change');
assert.strictEqual(sandbox.votingCompetitionScoringContractChanged_(contractBase, Object.assign({}, contractBase, {minimumEvaluatedEntries:3})), true, 'minimum evaluated must be locked');
assert.strictEqual(sandbox.votingCompetitionScoringContractChanged_(contractBase, Object.assign({}, contractBase, {ballotWeighting:'coverage'})), true, 'ballot weighting must be locked');
assert.strictEqual(sandbox.votingCompetitionScoringContractChanged_(contractBase, Object.assign({}, contractBase, {combinedRankWeight:.8,combinedCriteriaWeight:.2})), true, 'combined weights must be locked');

// 18: Existing edit/retry authority is preserved instead of duplicate append-only ballots.
assert(engine.includes('const matchingRows=[]') || engine.includes('const matchingRows = []'), 'existing ballot rows must be located for retry/edit');
assert(engine.includes('const reuse=') || engine.includes('const reuse ='), 'existing ballot rows must be reused');

// 19: Deterministic tie handling remains the accepted chain.
const tieParticipants = [
  {entryId:'a',entryName:'Alpha',status:'approved',published:true},
  {entryId:'b',entryName:'Bravo',status:'approved',published:true}
];
const tieResults = sandbox.votingCompetitionResults_('g', defaults, tieParticipants, [
  {username:'u1',entryId:'a',rank:1,points:10}, {username:'u1',entryId:'b',rank:2,points:10},
  {username:'u2',entryId:'b',rank:1,points:10}, {username:'u2',entryId:'a',rank:2,points:10}
]);
assert.strictEqual(tieResults.results[0].entryId, 'a', 'entryName must be deterministic final display tiebreak');
assert.strictEqual(tieResults.results[0].position, 1);
assert.strictEqual(tieResults.results[1].position, 1, 'identical competitive metrics must share placement');

// 20: Reveal remains server controlled.
assert.strictEqual(sandbox.votingCompetitionResultsVisible_({resultsVisibility:'hidden',votingLocked:true,votingDeadline:''}, {resultsFinalized:true}), false, 'hidden results must remain hidden');
assert.strictEqual(sandbox.votingCompetitionResultsVisible_({resultsVisibility:'live',votingLocked:false,votingDeadline:''}, {}), true, 'live results must remain live');
assert.strictEqual(sandbox.votingCompetitionResultsVisible_({resultsVisibility:'after-close',votingLocked:false,votingDeadline:''}, {resultsFinalized:false,votingLocked:false}), false, 'after-close results leaked early');
assert(engine.includes('results:resultsVisible?') || engine.includes('results: resultsVisible ?'), 'player payload must server-filter unrevealed results');

// 21: Existing persisted session identity remains authoritative; spoofing stays rejected.
assert(security.includes('payload.username = sessionUsername'), 'session username binding removed');
assert(security.includes('Session user does not match request user'), 'identity-spoof rejection removed');
assert(security.includes('if (!isAdmin(sessionUsername))'), 'Admin authority removed');

// 22: Frontend uses the authenticated API only; no raw VotingCompetition storage writes.
assert(page.includes('apiSaveVotingCompetitionBallot'), 'player must persist evaluation/ballot through API');
assert(!page.includes('VotingCompetitionEvaluations'), 'player must not reference raw evaluation storage');
assert(!page.includes('SpreadsheetApp') && !page.includes('DriveApp'), 'browser must not mutate backend storage directly');
assert(client.includes('apiPost("saveVotingCompetitionBallot", payload)'), 'competition write must use POST bridge');

// 23-24: General / Custom canonical set remains exactly eight and Cookoff is not a type.
const exactBlock = generalContract.match(/const EXACT_TYPES = \[([\s\S]*?)\];/);
assert(exactBlock, 'canonical General / Custom contract missing');
const exactTypes = Array.from(exactBlock[1].matchAll(/'([^']+)'/g), match => match[1]);
assert.deepStrictEqual(exactTypes, ['prediction','head-to-head','staked-prediction','wager','racing-wager','mixed','voting','ranking'], 'canonical General / Custom set changed');
assert(!exactTypes.includes('cookoff'), 'cookoff must not become a canonical type');

// Admin/player presentation and mobile source-layout contracts.
['adminVotingEvaluatedOnly','adminVotingMinimumEvaluated','adminVotingJudgingMode','adminVotingCriteria','adminVotingCombinedRankWeight','adminVotingCombinedCriteriaWeight','adminVotingBallotWeighting','adminVotingDeadline'].forEach(marker => assert(admin.includes(marker), 'missing Admin Cookoff control ' + marker));
assert(page.includes('Tasted / Evaluated'), 'player evaluated control missing');
assert(page.includes('votingCriterionChanged_'), 'player criteria input missing');
assert(css.includes('COOKOFF V1 ADVANCED CONTROLS'), 'Cookoff layout CSS missing');
assert(css.includes('@media (max-width: 480px)') && css.includes('padding-bottom: calc(96px + env(safe-area-inset-bottom))'), '360/390/430 mobile bottom-nav safety contract missing');

console.log('cookoff-v1-final-tests: PASS');
