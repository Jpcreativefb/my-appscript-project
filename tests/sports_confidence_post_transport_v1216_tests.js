const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sports = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const sportsHtml = fs.readFileSync(path.join(root, 'frontend/sports.html'), 'utf8');

assert(sports.includes('const SPORTS_AWARDS_POST_PROXY_URL'));
assert(sports.includes('async function sportsAwardsPost_(action, payload)'));
assert(sports.includes('method: "POST"'));
assert(sports.includes('body: JSON.stringify(Object.assign({ action: action }, payload || {}))'));

const destinationFn = sports.match(/async function apiAdminGetSportsConfidenceGames_\(session\)[\s\S]*?\n}\n\nasync function chooseSportsConfidenceGameId_/);
assert(destinationFn, 'Confidence destination loader should exist');
assert(destinationFn[0].includes('sportsAwardsPost_('));
assert(!destinationFn[0].includes('sportsAwardsApi_('), 'Confidence destination loader must not use JSONP');

const weekFn = sports.match(/async function sportsConfidenceLoadGamesViaAwardsBackend_\(session, context\)[\s\S]*?\n}\n\nfunction sportsConfidenceGameIsPregame_/);
assert(weekFn, 'Confidence week loader should exist');
assert(weekFn[0].includes('sportsAwardsPost_('));
assert(!weekFn[0].includes('sportsAwardsApi_('), 'Confidence week loader must not use JSONP');

const createFn = sports.match(/async function createSportsConfidenceWeekFromSection_\(\)[\s\S]*?\n}\n\nasync function createSportsAdvancedQuestionFromSection_/);
assert(createFn, 'Confidence create function should exist');
assert(createFn[0].includes('sportsAwardsPost_('));
assert(!createFn[0].includes('sportsAwardsApi_('), 'Confidence bulk create must not use JSONP');
assert(!createFn[0].includes('sportsJsonp('), 'Confidence bulk create must not call Sports JSONP directly');

for (const action of [
  'adminGetSportsConfidenceGames',
  'adminGetSportsConfidenceBuilderScores',
  'adminCreateSportsConfidenceQuestionsBulk'
]) {
  const re = new RegExp('if \\(action === "' + action + '"\\) \\{\\s*return json\\([^;]+\\(body\\)\\);', 'm');
  assert(re.test(api), action + ' must have a doPost(body) route');
}

assert(sportsHtml.includes('sports.js?v=329-sports-confidence-post-transport-v1216'));

console.log('sports-confidence-post-transport-v1216-tests: PASS');
