const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const root = process.argv[2] || process.cwd();
const page = fs.readFileSync(path.join(root,'frontend/js/pages/teamFantasy.js'),'utf8');
const css = fs.readFileSync(path.join(root,'frontend/css/team-fantasy.css'),'utf8');
const backend = fs.readFileSync(path.join(root,'backend/engines/SportsTeamFantasyGameDayEngine.js'),'utf8');
assert(page.includes('TEAM_FANTASY_WEEKLY_HUB_UI_v1218t2'), '18t UI marker missing');
assert(backend.includes('TEAM_FANTASY_WEEKLY_HUB_BACKEND_v1218t2'), '18t backend marker missing');
assert(page.includes('<h2>Weekly Picks</h2>'), 'Weekly Picks header missing');
assert(page.includes("teamFantasyLineupComplete_(lineup)"), 'complete-lineup collapse missing');
assert(page.includes('League View') && page.includes('Compare'), 'League/Compare view switch missing');
assert(page.includes('+ Add Team'), 'single Add Team control missing');
assert(!page.includes('>H2H</button>') && !page.includes('>2–6</button>'), 'old compare preset buttons remain');
assert(page.includes('teamFantasyRenderWeeklyLeague_'), 'weekly league renderer missing');
assert(page.includes('pointsBehindLeader') && page.includes('pointsToMoveUp') && page.includes('cushionOverBelow'), 'weekly movement fields missing from UI');
assert(backend.includes('teamFantasyGameDayBuildWeeklyLeaderboard_'), 'weekly leaderboard builder missing');
assert(backend.includes('out.leagues = leagues.map'), 'game-day league list missing');
assert(backend.includes('out.weeklyLeaderboard = teamFantasyGameDayBuildWeeklyLeaderboard_(out)'), 'weekly leaderboard not attached to API');
assert(css.includes('.tf-weekly-picks-head') && css.includes('background:#0f172a') && css.includes('color:#f8fafc'), 'high-contrast Weekly Picks header missing');
assert(css.includes('.tf-compare-team-head{background:#0f172a!important;color:#f8fafc!important'), 'high-contrast compare header missing');
const t2CssCache = page.match(/team-fantasy\.css\?v=([A-Za-z0-9._-]+)/);
assert(t2CssCache && !['1218r1','1218s'].includes(t2CssCache[1]), '18t2-or-later CSS cache marker missing');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(backend, sandbox);
const compare = {
  week: 1, leagueId:'complete', leagueName:'Complete League',
  competitors: [
    {entryId:'a',label:'A',isViewer:true,totalPoints:30,counts:{final:2,live:3,upcoming:3},record:{wins:2,losses:0,ties:0},leagueRank:1},
    {entryId:'b',label:'B',totalPoints:28,counts:{final:3,live:2,upcoming:3},record:{wins:1,losses:1,ties:0},leagueRank:2},
    {entryId:'c',label:'C',totalPoints:28,counts:{final:1,live:4,upcoming:3},record:{wins:1,losses:1,ties:0},leagueRank:3},
    {entryId:'d',label:'D',totalPoints:20,counts:{final:4,live:1,upcoming:3},record:{wins:0,losses:2,ties:0},leagueRank:4}
  ]
};
const lb = sandbox.teamFantasyGameDayBuildWeeklyLeaderboard_(compare);
assert.strictEqual(lb.rows.length,4);
assert.strictEqual(lb.rows[0].weekRank,1);
assert.strictEqual(lb.rows[1].weekRank,2);
assert.strictEqual(lb.rows[2].weekRank,2, 'ties should share weekly rank');
assert.strictEqual(lb.rows[3].pointsBehindLeader,10);
assert(lb.rows[1].pointsToMoveUp > 2 && lb.rows[1].pointsToMoveUp < 2.02, 'move-up target should be just over 2 points');
assert.strictEqual(lb.rows[0].cushionOverBelow,2);
console.log('Team Fantasy v1.2.18t2 Weekly Hub tests passed.');
