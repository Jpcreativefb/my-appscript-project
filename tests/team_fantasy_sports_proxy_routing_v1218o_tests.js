const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const routes = JSON.parse(read('frontend/_routes.json'));
assert(routes.include.includes('/api/team-fantasy'), 'Cloudflare _routes.json must include /api/team-fantasy');
assert(routes.include.includes('/api/espn-proxy'), 'Existing ESPN proxy route must remain enabled');

const tf = read('backend/engines/SportsTeamFantasyEngine.js');
assert(tf.includes('teamFantasySportsEngineJson_'), 'Team Fantasy Sports Engine request helper missing');
assert(tf.includes('getTeamFantasyNflSchedule'), 'Team Fantasy schedule must use Sports Scores Engine bridge');
assert(tf.includes('getTeamFantasyNflSummary'), 'Team Fantasy summary must use Sports Scores Engine bridge');
assert(tf.includes('Direct ESPN fetch is disabled because ESPN blocks Google Apps Script with HTTP 403'), 'Direct ESPN 403 guard missing');
const summaryStart = tf.indexOf('function teamFantasyFetchEspnSummary_');
const summaryEnd = tf.indexOf('\n}', summaryStart);
const summaryBody = tf.slice(summaryStart, summaryEnd + 2);
assert(!summaryBody.includes('site.api.espn.com'), 'Team Fantasy summary must not directly call ESPN');

const sports = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');
assert(sports.includes('TEAM FANTASY NFL DATA BRIDGE — v1.2.18o'), 'Sports bridge marker missing');
assert(sports.includes('action === "getTeamFantasyNflSchedule"'), 'Sports doGet schedule action missing');
assert(sports.includes('action === "getTeamFantasyNflSummary"'), 'Sports doGet summary action missing');
assert(sports.includes('sportsEspnFetch_(url'), 'Sports Team Fantasy bridge must use shared authenticated ESPN proxy transport');
assert(sports.includes('site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event='), 'NFL summary URL missing in Sports bridge');
assert(sports.includes('site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?'), 'NFL scoreboard URL missing in Sports bridge');

const cloudflareFn = read('functions/api/team-fantasy.js');
assert(cloudflareFn.includes('onRequestPost'), 'Team Fantasy Cloudflare POST function missing');

console.log('Team Fantasy v1.2.18o sports proxy/routing tests passed.');
