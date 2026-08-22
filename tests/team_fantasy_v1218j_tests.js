const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function text(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function has(rel, needle) { assert(text(rel).includes(needle), `${rel} missing: ${needle}`); }

const engine = text('backend/engines/SportsTeamFantasyEngine.js');
[
  'TEAM_FANTASY_POSITIONS = ["QB", "RB", "WRTE", "K", "OL", "DL", "LB", "DB"]',
  'TeamFantasySettings', 'TeamFantasyScoringRules', 'TeamFantasyEntries', 'TeamFantasyLeagues',
  'TeamFantasyLeagueMemberships', 'TeamFantasyPicks', 'TeamFantasyUnitScores', 'TeamFantasyWeekScores',
  'function apiGetTeamFantasyState', 'function apiSaveTeamFantasyPick', 'function apiAutoPickTeamFantasy',
  'function apiRandomTeamFantasyPicks', 'function apiGetTeamFantasyHeadToHead', 'function teamFantasyBuildStandings_',
  'function apiAdminSendTeamFantasyReminder', 'function apiAdminCreateTeamFantasyLeague',
  'function apiAdminAssignTeamFantasyLeagueMember', 'function teamFantasyPreflightIssues_',
  'missing.length === 0 || weekClosed === true'
].forEach(n => assert(engine.includes(n), `engine missing ${n}`));

// A pick belongs to an entry, not a league. This is what lets the exact same
// lineup count in Complete League plus any number of subleagues.
const picksHeader = engine.match(/TEAM_FANTASY_HEADERS\[TEAM_FANTASY_SHEETS\.PICKS\] = \[([\s\S]*?)\];/);
assert(picksHeader, 'TeamFantasyPicks header not found');
assert(!picksHeader[1].includes('LeagueId'), 'TeamFantasyPicks must not duplicate picks by league');
assert(picksHeader[1].includes('EntryId'), 'TeamFantasyPicks must be entry-scoped');

has('backend/Api.js', 'action === "saveTeamFantasyPick"');
has('backend/Api.js', 'action === "getTeamFantasyState"');
has('backend/Api.js', 'action === "getTeamFantasyHeadToHead"');
has('backend/Api.js', 'action === "adminGetTeamFantasyDashboard"');
has('backend/engines/GamesEngine.js', 'id: "team-fantasy"');
has('backend/admin/AdminPreflight.js', 'gameType !== "team-fantasy"');
has('backend/admin/AdminPreflight.js', 'teamFantasyPreflightIssues_');
has('backend/engines/NotificationsEngine.js', 'teamFantasyNotificationOutstandingSummary_');
has('frontend/js/app.js', '"team-fantasy": ["teamFantasy"]');
has('frontend/js/app.js', 'case "team-fantasy":');
has('frontend/js/app.js', 'case "admin-team-fantasy":');
has('frontend/sw.js', 'v1218j-team-fantasy');
has('frontend/js/pages/teamFantasy.js', 'True Head to Head');
has('frontend/js/pages/adminTeamFantasy.js', 'AFC + NFC Entries');
has('frontend/js/pages/adminTeamFantasy.js', 'Cumulative Postseason');

// Pure scoring/normalization checks in a sandbox. No spreadsheet calls execute.
const context = { console, Date, Math, JSON, String, Number, Array, Object, isNaN, encodeURIComponent };
vm.createContext(context);
vm.runInContext(engine, context);
assert.strictEqual(context.teamFantasyNormalizePosition_('WR/TE'), 'WRTE');
assert.strictEqual(context.teamFantasyNormalizeTeam_('WSH'), 'WAS');
assert.strictEqual(context.teamFantasyPhaseForWeek_({ regularSeasonEndWeek: 18 }, 19), 'wild-card');
assert.strictEqual(context.teamFantasyPhaseForWeek_({ regularSeasonEndWeek: 18 }, 22), 'super-bowl');
assert.strictEqual(context.teamFantasyScheduleWeek_({ regularSeasonEndWeek: 18 }, 22), 5); // skip ESPN Pro Bowl week 4
const score = context.teamFantasyScoreStats_([
  { active: true, position: 'QB', statKey: 'passingYards', ruleType: 'unit', pointsPerUnit: 0.04, threshold: null, bonusPoints: 0, ruleId: 'yd', label: 'Yards' },
  { active: true, position: 'QB', statKey: 'passingTouchdowns', ruleType: 'unit', pointsPerUnit: 4, threshold: null, bonusPoints: 0, ruleId: 'td', label: 'TD' },
  { active: true, position: 'QB', statKey: 'passingYards', ruleType: 'bonus', pointsPerUnit: 0, threshold: 300, bonusPoints: 3, ruleId: '300', label: '300+' }
], 'QB', { passingYards: 325, passingTouchdowns: 3 });
assert.strictEqual(score.points, 28); // 13 + 12 + 3

console.log('Team Fantasy Football v1.2.18j tests passed.');
