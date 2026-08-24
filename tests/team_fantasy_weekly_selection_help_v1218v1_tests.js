const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'frontend/js/pages/teamFantasy.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/team-fantasy.css'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyEngine.js'), 'utf8');
const historicalR1 = fs.readFileSync(path.join(root, 'tests/team_fantasy_game_day_v1218r1_tests.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function fnBlock(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'Missing function ' + name);
  const next = source.indexOf('\nfunction ', start + 10);
  return source.slice(start, next >= 0 ? next : source.length);
}

assert(page.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'), '18v1 UI marker missing');
assert(backend.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_BACKEND_v1218v1'), '18v1 backend marker missing');
const v1CssCache = page.match(/team-fantasy\.css\?v=([A-Za-z0-9._-]+)/);
assert(v1CssCache && !['1218r1','1218s','1218t2','1218u1'].includes(v1CssCache[1]), '18v1-or-later CSS cache marker missing');
assert(css.includes('v1.2.18v1 weekly selection rules + scoring + position layout'), '18v1 CSS marker missing');

assert(backend.includes('scoringRules: teamFantasyRules_(gameId).filter(function(rule) { return rule.active; })'), 'Active scoring rules are not returned with Team Fantasy state');
assert(page.includes("function teamFantasyOpenRules_()"), 'Rules popup function missing');
assert(page.includes("function teamFantasyOpenScoring_()"), 'Scoring popup function missing');
assert(page.includes('Scoring & Position Stats'), 'Scoring & Position Stats player label missing');
assert(page.includes('📖 Rules'), 'Rules button missing');

const lineup = fnBlock(page, 'teamFantasyRenderLineup_');
assert(lineup.includes('tf-weekly-help-row'), 'Weekly Picks help controls missing');
assert(lineup.indexOf('tf-weekly-help-row') < lineup.indexOf('tf-lineup-actions'), 'Rules/scoring controls must appear before pick actions');
assert(lineup.includes('teamFantasyOpenRules_()'), 'Rules button is not wired');
assert(lineup.includes('teamFantasyOpenScoring_()'), 'Scoring button is not wired');

assert(css.includes('grid-template-areas:"qb k" "rb dl" "wrte lb" "ol db"'), 'Two-column offense-left / K-defense-right layout missing');
assert(css.includes('grid-template-areas:"qb" "rb" "wrte" "ol" "k" "dl" "lb" "db"'), 'One-column QB/RB/WRTE/OL/K/DL/LB/DB order missing');
assert(css.includes('.tf-lineup-card .tf-slot[id$="-OL"]{grid-area:ol}'), 'OL grid placement missing');

const gameDay = fnBlock(page, 'teamFantasyRenderGameDayIntoMount_');
assert(gameDay.includes('Weekly Standings'), 'Weekly Standings label missing');
assert(gameDay.includes('>Compare<'), 'Player-facing Compare tab must remain available');
assert(gameDay.includes('+ Add Team'), 'Player-facing Add Team compare control must remain available');
assert(gameDay.includes('teamFantasyRenderCompareBoard_'), 'Compare board renderer must remain wired');
assert(gameDay.includes('teamFantasyGameDayWeekPicker_'), 'Past-week selector must remain available');

const testLab = fnBlock(page, 'teamFantasyRunTestLab_');
assert(!testLab.includes('Six-Team Synthetic Compare'), 'Six-Team Synthetic Compare player/admin wording must be retired');
assert(!testLab.includes('Synthetic Weekly League Race'), 'Synthetic weekly race wording must be retired');
assert(testLab.includes('Weekly League Test Race'), 'Weekly League Test Race output missing');
assert(page.includes('Run Team Fantasy Test Lab'), 'Admin Team Fantasy Test Lab button must remain available');
assert(historicalR1.includes('Run Team Fantasy Test Lab'), 'Admin Test Lab compatibility must remain available while Compare is restored');

assert(page.includes('teamFantasyRenderWeekHistory_(res)'), 'Week History must remain on the player page');
assert(page.includes('teamFantasyPickerRemaining_'), 'Usage-limit picker behavior missing');
assert(page.includes('teamFantasyPickerIsBye_'), 'BYE picker behavior missing');

console.log('Team Fantasy v1.2.18v1 weekly selection help tests passed.');
