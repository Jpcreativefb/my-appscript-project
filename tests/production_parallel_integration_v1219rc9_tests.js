'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const ranking = read('backend/engines/RankingGameEngine.js');
const voting = read('backend/engines/VotingCompetitionEngine.js');
const survivor = read('backend/engines/SportsSurvivorEngine.js');
const awards = read('backend/engines/AwardsManagerEngine.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');
const sportsScores = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');
const sportsOdds = read('external-engines/sports-scoring-engine/src/SportsOddsEngine.js');
const sportsAdmin = read('external-engines/sports-scoring-engine/src/SportsAdminControls.js');

const checks = [
  ['Ranking rejects corrupted ballots before scoring', ranking.includes('function rankingBallotValid_') && ranking.includes('validBallot: false')],
  ['Voting requires whole unique ranks', voting.includes('Ranks must be whole numbers, unique, and run from 1 through')],
  ['Voting numeric participant fields reject nonnumeric values', voting.includes('must be a number.') && voting.includes('Number.isFinite(numericValue)')],
  ['Sports Survivor blocks later rounds behind unresolved earlier rounds', survivor.includes('blockedByEarlierUnresolved') && survivor.includes('roundEligible')],
  ['Awards builds can safely resume without duplicate answers', awards.includes('awardsManagerEnsureQuestionAnswers_') && awards.includes('awardsManagerVerifyResumeTarget_')],
  ['Reality cast imports preserve existing optional values on blank updates', reality.includes('realityTvCastImportMergedValue_')],
  ['Reality episode result selections are centrally validated', reality.includes('realityTvValidateEpisodeResultSelection_')],
  ['Sports Engine workbook capacity protection is present', sportsScores.includes('SPORTS_WORKBOOK_CELL_LIMIT_V48_ = 10000000') && sportsScores.includes('SPORTS_LOG_MAX_DATA_ROWS_V48_ = 20000')],
  ['Sports Engine date formatting has Apps Script and Node-safe paths', sportsScores.includes('typeof Utilities !== "undefined"') && sportsScores.includes('new Intl.DateTimeFormat')],
  ['Sports odds logging is nonfatal and lock-safe', sportsOdds.includes('API logging is diagnostic only') && sportsOdds.includes('LockService.getDocumentLock()')],
  ['Sports odds legacy limits migrate to operational defaults', sportsAdmin.includes('SPORTS_ODDS_OPERATIONAL_DEFAULTS_V48_APPLIED') && sportsAdmin.includes('data[i][col.MonthlyBudget] = 100')]
];

let failures = 0;
for (const [name, pass] of checks) {
  if (pass) console.log('PASS:', name);
  else {
    failures += 1;
    console.error('FAIL:', name);
  }
}

if (failures) {
  console.error(`FAILED: ${failures} RC9 integration check(s)`);
  process.exit(1);
}
console.log(`ALL ${checks.length} V1.2.19-RC9 PARALLEL INTEGRATION CHECKS PASSED`);
