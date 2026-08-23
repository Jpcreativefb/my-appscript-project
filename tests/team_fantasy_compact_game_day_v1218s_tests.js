const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gameDay = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyGameDayEngine.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/js/pages/teamFantasy.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/team-fantasy.css'), 'utf8');

assert(gameDay.includes('TEAM_FANTASY_COMPACT_GAME_DAY_BACKEND_v1218s'), '18s backend marker missing.');
assert(gameDay.includes('teamFantasyGameDayApplyPositionRanks_'), 'Weekly position-rank helper missing.');
assert(gameDay.includes('teamFantasyGameDayAttachStandings_'), 'League rank/record helper missing.');
assert(gameDay.includes('pickMethod: teamFantasyGameDayPickMethod_'), 'AP/R method must be preserved in game-day slots.');
assert(page.includes('TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s'), '18s player UI marker missing.');
const teamFantasyCssCacheMatch = page.match(/team-fantasy\.css\?v=([A-Za-z0-9._-]+)/);
assert(teamFantasyCssCacheMatch && teamFantasyCssCacheMatch[1] !== '1218r1', 'Team Fantasy CSS cache marker must remain cache-busted for 18s or a later release.');
assert(page.includes('teamFantasyOpenTeamPicker_'), 'Logo/abbreviation team picker missing.');
assert(page.includes('team.eligible === true || String(team.abbr || \'\') === current'), 'Picker must omit unavailable/exhausted teams except current selection.');
assert(page.includes('tf-pick-method'), 'AP/R pick-method badge missing.');
assert(page.includes('tf-slot-rank'), 'Weekly position rank display missing.');
assert(page.includes('tf-compare-record'), 'League rank/record display missing.');
assert(page.includes('teamFantasyCompareLeaguePicker_'), 'Compare league selector missing.');
assert(!page.slice(page.indexOf('function teamFantasyRenderCompareSlot_'), page.indexOf('function teamFantasyRenderCompareBoard_')).includes('tf-status-badge'), 'Per-slot Live/Final/Upcoming badge should be removed.');
assert(css.includes('v1.2.18s compact game-day rankings + picker'), '18s CSS marker missing.');
assert(css.includes('.tf-compare-slot.is-live{border-color:#16a34a}'), 'Live border must be green.');
assert(css.includes('.tf-compare-slot.is-final{border-color:#2563eb'), 'Final border must be blue.');
assert(css.includes('.tf-compare-slot.is-upcoming{border-color:#94a3b8'), 'Upcoming border must be gray.');
assert(css.includes('.tf-compare-team-head{position:sticky'), 'Compare header must remain sticky while scrolling.');
assert(css.includes('.tf-compare-scroll{max-height:70vh;overflow:auto'), 'Compare board must support contained scrolling.');

const context = { console, Date, Math, JSON, encodeURIComponent };
vm.createContext(context);
vm.runInContext(gameDay, context, { filename: 'SportsTeamFantasyGameDayEngine.js' });
const now = Date.now();
const entries = [
  { EntryId:'e1', Username:'u1', EntryName:'One' },
  { EntryId:'e2', Username:'u2', EntryName:'Two' },
  { EntryId:'e3', Username:'u3', EntryName:'Three' }
];
const picks = [
  { EntryId:'e1', Position:'QB', TeamAbbr:'CHI', TeamName:'Chicago', PickMethod:'auto', GameDateTime:new Date(now-1000).toISOString() },
  { EntryId:'e2', Position:'QB', TeamAbbr:'GB', TeamName:'Green Bay', PickMethod:'random', GameDateTime:new Date(now-1000).toISOString() },
  { EntryId:'e3', Position:'QB', TeamAbbr:'DET', TeamName:'Detroit', PickMethod:'manual', GameDateTime:new Date(now-1000).toISOString() }
];
const scores = [
  { EntryId:'e1', Position:'QB', TeamAbbr:'CHI', FantasyPoints:18, Final:false },
  { EntryId:'e2', Position:'QB', TeamAbbr:'GB', FantasyPoints:24, Final:true },
  { EntryId:'e3', Position:'QB', TeamAbbr:'DET', FantasyPoints:18, Final:false }
];
const compare = context.teamFantasyGameDayBuildCompare_({ gameId:'g', week:1, leagueId:'l', viewerEntryIds:{e1:true}, entries, picks, scores, nowMs:now });
const byId = Object.fromEntries(compare.competitors.map(c => [c.entryId, c]));
assert.strictEqual(byId.e2.slots.find(s=>s.position==='QB').weekRank, 1, '24-point QB should rank #1.');
assert.strictEqual(byId.e1.slots.find(s=>s.position==='QB').weekRank, 2, '18-point QB should rank #2.');
assert.strictEqual(byId.e3.slots.find(s=>s.position==='QB').weekRank, 2, 'Tied 18-point QB should share #2.');
assert.strictEqual(byId.e1.slots.find(s=>s.position==='QB').pickMethod, 'AP', 'Auto pick should render AP.');
assert.strictEqual(byId.e2.slots.find(s=>s.position==='QB').pickMethod, 'R', 'Random pick should render R.');
context.teamFantasyGameDayAttachStandings_(compare, { success:true, league:{leagueName:'Test League', standingMode:'entries'}, rows:[
  {entryId:'e1',rank:3,regularWins:4,regularLosses:2,regularTies:0},
  {entryId:'e2',rank:1,regularWins:6,regularLosses:0,regularTies:0},
  {entryId:'e3',rank:2,regularWins:5,regularLosses:1,regularTies:0}
]});
assert.strictEqual(byId.e1.leagueRank, 3, 'League rank should attach to compare entry.');
assert.deepStrictEqual(JSON.parse(JSON.stringify(byId.e1.record)), {wins:4,losses:2,ties:0}, 'League W-L-T should attach to compare entry.');
assert.strictEqual(compare.leagueName, 'Test League');
console.log('Team Fantasy v1.2.18s compact game-day tests passed.');
