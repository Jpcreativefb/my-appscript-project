const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'external-engines', 'sports-scoring-engine', 'src', 'SportsScoresEngine.js');
const src = fs.readFileSync(file, 'utf8');

function requireText(text, label) {
  if (!src.includes(text)) throw new Error('Missing ' + label + ': ' + text);
}

requireText('const liveDates = buildSportsDateStrings_(1, 1);', 'small live score date window');
requireText('FetchMode: "LIVE_SCOREBOARD"', 'live scoreboard fetch mode');
requireText('const isDateScoped = !!espnDate;', 'date scoped request detection');
requireText('dates: espnDate,', 'ESPN date parameter');
requireText('limit: sportsV13IsCollegeLeague_(sport, league) ? resultLimit : ""', 'pro live request limit suppression');
requireText('Provider rejected the Apps Script fetch.', '403 diagnostic');

const liveBlockStart = src.indexOf('const liveDates = buildSportsDateStrings_(1, 1);');
const liveBlockEnd = src.indexOf('if (setting.SavePeriodSnapshots)', liveBlockStart);
const liveBlock = src.slice(liveBlockStart, liveBlockEnd);
if (liveBlock.includes('fetchAndNormalizeESPNScoreboardFromSetting_(setting);')) {
  throw new Error('Live updater still contains season-wide no-date fetch');
}

const pushStart = src.indexOf('function pushScoreboard_(groupId)');
const pushEnd = src.indexOf('requests.push({', pushStart);
const paramBlock = src.slice(pushStart, pushEnd);
if (!paramBlock.includes('const params = isDateScoped')) {
  throw new Error('Scoreboard params are not conditional on date scope');
}

console.log('Sports live score fetch hotfix tests passed.');
