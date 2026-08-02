const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'backend/engines/QuestionModeEngine.js'),
  'utf8'
);
const normalized = fs.readFileSync(
  path.join(root, 'backend/engines/NormalizedQuestionStorageEngine.js'),
  'utf8'
);

function extractFunction(text, name) {
  const marker = `function ${name}`;
  const start = text.indexOf(marker);
  assert(start >= 0, `${name} missing`);
  const brace = text.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

const context = { String, Number, Array, Object };
vm.createContext(context);
[
  'questionModeString_',
  'questionModeKey_',
  'questionModeNormalize_',
  'questionModeIsRecognized_',
  'questionModeHeaderMap_',
  'questionModeRowLooksV115Shifted_'
].forEach(name => vm.runInContext(extractFunction(source, name), context));

const headers = [
  'GameId','QuestionId','Question','Section','CategoryImage','Active',
  'PredictionGame','CommunityRank','QuestionType','ScoringEngine',
  'SelectionMode','EntryType','OddsMode','ResultSource','RoundNumber',
  'SportsProvider','SportsLeague','SportsGameId','ESPNEventId','HomeTeam',
  'AwayTeam','HomeRecord','AwayRecord','HomeScore','AwayScore',
  'SportsStatus','SportsClock','SportsPeriod','SportsState','SportsMarket',
  'SportsSelection','SportsLine','BettingOdds','OddsSource','OddsLastUpdated',
  'PayloadJSON','SourceSystem','CreatedAt','UpdatedAt','StorageVersion','ScoreMode'
];

const shifted = new Array(headers.length).fill('');
shifted[0] = 'wagerhybrid';
shifted[1] = 'what-color-is-the-sky';
shifted[11] = 'fixed-points';
shifted[12] = '3';
shifted[13] = 'wager';
shifted[39] = '8/1/2026 17:46:14';
shifted[40] = '3';

assert.strictEqual(
  context.questionModeRowLooksV115Shifted_(headers, shifted),
  true,
  'The exact v1.0.15 shifted-row signature must be detected.'
);

const safe = shifted.slice();
safe[11] = '3';
safe[39] = '3';
safe[40] = 'fixed-points';
assert.strictEqual(
  context.questionModeRowLooksV115Shifted_(headers, safe),
  false,
  'A normally aligned row must not be marked as shifted.'
);

assert(!/const QUESTIONS_HEADERS = \[[\s\S]*?"ScoreMode"/.test(normalized));
assert(source.includes('backup.setName(backupName)'));
assert(source.includes('sh.deleteColumn(scoreModeCol + 1)'));
assert(source.includes('normalizedStorageSyncGameFromLegacy_'));

console.log('question-storage-v115-repair-tests: PASS');
