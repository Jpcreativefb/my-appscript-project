const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const engine = read('backend/engines/VotingCompetitionEngine.js');
const games = read('backend/engines/GamesEngine.js');
const api = read('backend/Api.js');
const security = read('backend/core/ApiSecurity.js');
const legacyVoting = read('backend/engines/VotingEngine.js');
const legacyBallot = read('backend/Ballot.js');
const ranking = read('backend/engines/RankingGameEngine.js');
const preflight = read('backend/admin/AdminPreflight.js');
const admin = read('frontend/js/pages/admin.js');
const setup = read('frontend/js/pages/adminGameSetup.js');
const page = read('frontend/js/pages/voting.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const client = read('frontend/js/api.js');
const clientMirror = read('frontend/api.js');
const css = read('frontend/css/pages.css');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

assert(games.includes('id: "voting"'), 'Voting game type missing from backend');
assert(games.includes('label: "Voting / Competition Game"'), 'Voting game label missing');
assert(admin.includes('["voting", "Voting / Competition Game"]'), 'Voting game missing from Manage Games type selector');
assert(app.includes('"voting": ["voting"]'), 'Voting page route module missing');
assert(app.includes('await navigate("voting")'), 'Voting player route missing');
assert(app.includes('case "voting":'), 'Voting render switch missing');
assert.strictEqual(app, appMirror, 'frontend app mirror must stay synchronized');
assert.strictEqual(client, clientMirror, 'frontend API mirror must stay synchronized');

[
  'getVotingCompetitionState',
  'saveVotingParticipant',
  'uploadVotingParticipantImage',
  'saveVotingCompetitionBallot',
  'adminGetVotingCompetitionDashboard',
  'adminSaveVotingCompetitionSettings',
  'adminUpdateVotingParticipant'
].forEach(action => assert(api.includes(`action === "${action}"`), `Missing API route: ${action}`));
assert(api.includes('userCanAccessGameFeature_(params.username, gameId, "viewGame", leagueId)'), 'Voting GET must enforce game access');
assert(api.includes('userCanAccessGameFeature_(body.username, postGameId, "makePicks", postLeagueId)'), 'Voting ballot write must enforce game access');
assert(security.includes('payload.username = sessionUsername'), 'Authenticated API username binding must remain enabled');

[
  'VotingCompetitionSettings',
  'VotingParticipants',
  'VotingCompetitionBallots',
  'function votingCompetitionSaveParticipant_',
  'function votingCompetitionUploadParticipantImage_',
  'function votingCompetitionSaveBallot_',
  'function votingCompetitionResults_',
  'function votingCompetitionPreflightIssues_'
].forEach(marker => assert(engine.includes(marker), `Competition engine missing ${marker}`));

assert(engine.includes('"image/jpeg": "jpg"') && engine.includes('"image/webp": "webp"'), 'Participant image types missing');
assert(engine.includes('4 * 1024 * 1024'), 'Participant image size guard missing');
assert(engine.includes('settings.showParticipantNames ? row.participantName : ""'), 'Blind-voting result identity protection missing');
assert(engine.includes('settings.showPhoto ? row.imageUrl : ""'), 'Result photo visibility protection missing');
assert(engine.includes('approvalRequired'), 'Participant approval flow missing');
assert(engine.includes('auto-sequential') && engine.includes('auto-palette'), 'Assigned display-card number/color options missing');
assert(preflight.includes('votingCompetitionPreflightIssues_'), 'Voting competition preflight integration missing');

assert(page.includes('capture="environment"'), 'Phone camera participant photo control missing');
assert(page.includes('Choose Photo') && page.includes('Take Photo'), 'Participant photo choices missing');
assert(page.includes('Drag & Drop') && page.includes('Up / Down Arrows') && page.includes('Numbered'), 'Voting ranking UI choices missing');
assert(page.includes('Ingredients / Useful Information'), 'Participant ingredients/useful-info field missing');
assert(page.includes('Additional Information'), 'Custom participant field rendering missing');
assert(setup.includes('Additional Participant Fields'), 'Admin custom field builder missing');
assert(setup.includes('Assigned Display Card'), 'Admin display-card setup missing');
assert(setup.includes('Rank Top N') && setup.includes('Rank All Entries') && setup.includes('Pick Favorite Only'), 'Admin ballot methods missing');
assert(setup.includes('Existing legacy Categories / Questions below are preserved for compatibility'), 'Legacy voting compatibility notice missing');
assert(css.includes('VOTING / COMPETITION v1.2.18z'), 'Voting competition CSS missing');
assert(html.includes('v1218z-voting-competition'), 'Frontend cache marker missing');
assert(sw.includes('v1218z-voting-competition'), 'Service worker cache marker missing');

// Legacy movie/awards community voting and prediction ranking remain separate.
assert(legacyVoting.includes('VOTES_SHEET') || legacyVoting.includes('"Votes"'), 'Legacy Votes engine must remain present');
assert(legacyBallot.includes('function') && legacyBallot.length > 100, 'Legacy Ballot engine must remain present');
assert(ranking.includes('rankingScoreBallot_'), 'Prediction Ranking engine must remain present');
assert(!engine.includes('VOTES_SHEET = "Votes"'), 'Competition engine must not overwrite legacy Votes sheet');
assert(!engine.includes('RankingEntries'), 'Competition engine must not reuse prediction RankingEntries');

const sandbox = { console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set, isFinite, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(engine, sandbox);

const defaultSettings = sandbox.votingCompetitionDefaultSettings_('cookoff');
assert.strictEqual(defaultSettings.votingMethod, 'top-n');
assert.strictEqual(defaultSettings.rankingUi, 'auto');
assert.strictEqual(defaultSettings.rankLimit, 5);
assert.deepStrictEqual(Array.from(defaultSettings.pointValues), [10, 7, 5, 3, 1]);
assert.strictEqual(defaultSettings.approvalRequired, true);
assert.strictEqual(defaultSettings.showParticipantNames, false);

assert.strictEqual(sandbox.votingCompetitionBallotLimit_(Object.assign({}, defaultSettings, { votingMethod: 'favorite' }), 20), 1);
assert.strictEqual(sandbox.votingCompetitionBallotLimit_(Object.assign({}, defaultSettings, { votingMethod: 'rank-all' }), 12), 12);
assert.strictEqual(sandbox.votingCompetitionBallotLimit_(Object.assign({}, defaultSettings, { votingMethod: 'top-n', rankLimit: 5 }), 3), 3);
assert.strictEqual(sandbox.votingCompetitionPointsForRank_(1, defaultSettings, 5), 10);
assert.strictEqual(sandbox.votingCompetitionPointsForRank_(5, defaultSettings, 5), 1);
assert.strictEqual(sandbox.votingCompetitionPointsForRank_(1, Object.assign({}, defaultSettings, { scoringMode: 'borda' }), 5), 5);
assert.strictEqual(sandbox.votingCompetitionPointsForRank_(5, Object.assign({}, defaultSettings, { scoringMode: 'borda' }), 5), 1);

const entries = [
  { entryId:'a', entryName:'Alpha', status:'approved', published:true },
  { entryId:'b', entryName:'Bravo', status:'approved', published:true },
  { entryId:'c', entryName:'Charlie', status:'approved', published:true }
];
assert.doesNotThrow(() => sandbox.votingCompetitionValidateBallot_([
  { entryId:'a', rank:1 }, { entryId:'b', rank:2 }, { entryId:'c', rank:3 }
], entries, Object.assign({}, defaultSettings, { rankLimit:3 })));
assert.throws(() => sandbox.votingCompetitionValidateBallot_([
  { entryId:'a', rank:1 }, { entryId:'b', rank:1 }, { entryId:'c', rank:3 }
], entries, Object.assign({}, defaultSettings, { rankLimit:3 })), /used once|rank/i);

const results = sandbox.votingCompetitionResults_('cookoff', defaultSettings, entries, [
  { username:'u1', entryId:'a', rank:1, points:10 },
  { username:'u1', entryId:'b', rank:2, points:7 },
  { username:'u1', entryId:'c', rank:3, points:5 },
  { username:'u2', entryId:'b', rank:1, points:10 },
  { username:'u2', entryId:'a', rank:2, points:7 },
  { username:'u2', entryId:'c', rank:3, points:5 },
  { username:'u3', entryId:'b', rank:1, points:10 },
  { username:'u3', entryId:'c', rank:2, points:7 },
  { username:'u3', entryId:'a', rank:3, points:5 }
]);
assert.strictEqual(results.ballotCount, 3);
assert.strictEqual(results.results[0].entryId, 'b');
assert.strictEqual(results.results[0].totalPoints, 27);
assert.strictEqual(results.results[0].firstPlaceVotes, 2);
assert.strictEqual(results.results[0].position, 1);

console.log('voting-competition-v1218z-tests: PASS');
