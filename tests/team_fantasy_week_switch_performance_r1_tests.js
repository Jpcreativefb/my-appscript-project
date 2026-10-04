const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(root,'backend/engines/SportsTeamFantasyEngine.js'),'utf8');
const frontendSource = fs.readFileSync(path.join(root,'frontend/js/pages/teamFantasy.js'),'utf8');
const apiSource = fs.readFileSync(path.join(root,'backend/Api.js'),'utf8');
const gameDaySource = fs.readFileSync(path.join(root,'backend/engines/SportsTeamFantasyGameDayEngine.js'),'utf8');

function block(source, startText, endText) {
  const start = source.indexOf(startText);
  assert(start >= 0, 'Missing block: '+startText);
  const end = endText ? source.indexOf(endText, start + startText.length) : -1;
  return source.slice(start, end >= 0 ? end : source.length);
}

// 1. Week dropdown must use the in-place lightweight path, not full navigation.
const changeBlock = block(frontendSource,'async function teamFantasyChangeMainWeek_','async function renderTeamFantasyPage');
assert(changeBlock.includes('teamFantasyLoadWeekState_'),'week switch calls lightweight week-state loader');
assert(changeBlock.includes('teamFantasyApplyWeekState_'),'week switch applies selected week in place');
assert(!changeBlock.includes("navigate('team-fantasy'"),'week switch must not navigate the entire Team Fantasy page');
assert(!changeBlock.includes('teamFantasyReload_('),'week switch must not invoke full Team Fantasy reload');
assert(!changeBlock.includes('renderTeamFantasyPage('),'week switch must not rerender the full page');

// 2-4. Lightweight backend must not repeat static/season work or scoring/backfill work.
const weekApi = block(engineSource,'function apiGetTeamFantasyWeekState','function apiGetTeamFantasyState');
[
  'teamFantasyNflWeekTiming_',
  'teamFantasyGetSettings_',
  'teamFantasyEnsureEntriesForUser_',
  'teamFantasyLeaguesForEntries_',
  'teamFantasyBuildStandings_',
  'teamFantasyGetPlayerPreference_',
  'teamFantasyAutoFillActivation_',
  'teamFantasyEnsureRankingUniverseBeforeWeek_',
  'teamFantasyBackfillRecentCompletedWeeks_',
  'teamFantasyFetchEspnSummary_',
  'teamFantasySportsEngineJson_("getTeamFantasyNflSummary"'
].forEach(name=>assert(!weekApi.includes(name),'light week-state must not invoke '+name));
assert(weekApi.includes('teamFantasyEntriesForUser_'),'entry ownership is still resolved server-side');
assert(weekApi.includes('teamFantasyFetchWeekSchedule_'),'selected week schedule is the one intentional schedule read');
assert(weekApi.includes('TEAM_FANTASY_SHEETS.PICKS'),'selected week reconstructs from persisted picks');
assert(weekApi.includes('TEAM_FANTASY_SHEETS.UNIT_SCORES'),'selected week reconstructs from persisted unit scores');

// Route must exist.
assert(apiSource.includes('action === "getTeamFantasyWeekState"'),'lightweight week-state API route must exist');

// 5. Execute a historical Week 2 lightweight read with persisted pick/score data.
{
  const ctx = { console, Date, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Math };
  vm.createContext(ctx);
  vm.runInContext(engineSource, ctx, {filename:'SportsTeamFantasyEngine.js'});

  const calls = { settings:0, timing:0, standings:0, leagues:0, autoFill:0, repair:0, backfill:0, summary:0, schedule:0 };
  ctx.teamFantasyRequireGameAccess_=()=>true;
  ctx.teamFantasyIsGame_=()=>true;
  ctx.teamFantasyGetSettings_=()=>{calls.settings++;throw new Error('settings reread forbidden');};
  ctx.teamFantasyNflWeekTiming_=()=>{calls.timing++;throw new Error('timing resolve forbidden');};
  ctx.teamFantasyBuildStandings_=()=>{calls.standings++;throw new Error('standings rebuild forbidden');};
  ctx.teamFantasyLeaguesForEntries_=()=>{calls.leagues++;throw new Error('league reread forbidden');};
  ctx.teamFantasyGetPlayerPreference_=()=>{calls.autoFill++;throw new Error('AutoFill reread forbidden');};
  ctx.teamFantasyEnsureRankingUniverseBeforeWeek_=()=>{calls.repair++;throw new Error('repair forbidden');};
  ctx.teamFantasyBackfillRecentCompletedWeeks_=()=>{calls.backfill++;throw new Error('backfill forbidden');};
  ctx.teamFantasyFetchEspnSummary_=()=>{calls.summary++;throw new Error('summary fetch forbidden');};

  const entry={entryId:'entry-alice',username:'alice',conference:'ALL',entryName:'Alice'};
  ctx.teamFantasyEntriesForUser_=()=>[entry];
  ctx.teamFantasyFetchWeekSchedule_=()=>{calls.schedule++;return {
    games:[{eventId:'evt2',gameDateTime:'2099-09-20T18:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',completed:false,state:'pre',status:'Scheduled'}],
    byTeam:{BUF:{eventId:'evt2',gameDateTime:'2099-09-20T18:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',completed:false,state:'pre',status:'Scheduled'},MIA:{eventId:'evt2',gameDateTime:'2099-09-20T18:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',completed:false,state:'pre',status:'Scheduled'}}
  };};

  const pick={
    GameId:'g',SeasonYear:2026,Week:2,EntryId:'entry-alice',Position:'QB',TeamAbbr:'BUF',TeamName:'Buffalo Bills',
    ESPNEventId:'evt2',GameDateTime:'2099-09-20T18:00:00Z',PickMethod:'manual',AutoPickPenalty:0
  };
  const unit={
    GameId:'g',SeasonYear:2026,Week:2,EntryId:'entry-alice',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF',
    ESPNEventId:'evt2',FantasyPoints:22.5,StatsJSON:'{}',ScoreDetailJSON:'[]',Final:true
  };
  ctx.teamFantasyReadRows_=(sheet)=>{
    if (sheet===ctx.TEAM_FANTASY_SHEETS.PICKS) return [pick];
    if (sheet===ctx.TEAM_FANTASY_SHEETS.UNIT_SCORES) return [unit];
    return [];
  };

  const res=ctx.apiGetTeamFantasyWeekState({
    gameId:'g',username:'alice',week:2,
    browseContext:JSON.stringify({
      settings:{gameId:'g',seasonYear:2026,currentWeek:4,teamUseLimit:3,regularSeasonEndWeek:18,playoffUsageMode:'reset'},
      currentWeek:4,availableWeeks:[1,2,3,4,5]
    }),
    postseasonEligibleEntryIds:JSON.stringify(['entry-alice'])
  });
  assert.strictEqual(res.success,true);
  assert.strictEqual(res.lightweight,true);
  assert.strictEqual(res.week,2);
  assert.strictEqual(res.currentWeek,4);
  assert.strictEqual(res.lineups.length,1);
  assert.strictEqual(res.lineups[0].slots.find(s=>s.position==='QB').pick.teamAbbr,'BUF','historical persisted pick is returned');
  assert.strictEqual(res.lineups[0].weekPoints,22.5,'historical persisted score is returned');
  assert.deepStrictEqual(calls,{settings:0,timing:0,standings:0,leagues:0,autoFill:0,repair:0,backfill:0,summary:0,schedule:1});
}

// 6-7. Current week remains default on first render; future week note stays minimal.
const renderBlock = block(frontendSource,'async function renderTeamFantasyPage','function teamFantasySetStatus_');
assert(renderBlock.includes('selectedWeek = Number(window.TEAM_FANTASY_SELECTED_WEEK || 0) > 0'),'initial page still defaults to backend-resolved current week when no explicit selection exists');
assert(renderBlock.includes('teamFantasyLoadState_'),'initial full Team Fantasy page still uses the established full state API');

const browserStart=frontendSource.indexOf('function teamFantasyMainWeekBrowser_');
const browserEnd=frontendSource.indexOf('function teamFantasyWeekBrowseContext_',browserStart);
const ui={};
vm.createContext(ui);
vm.runInContext(frontendSource.slice(browserStart,browserEnd),ui);
const currentHtml=ui.teamFantasyMainWeekBrowser_({week:4,currentWeek:4,availableWeeks:[1,2,3,4,5]});
assert(currentHtml.includes('value="4" selected'),'current week remains selected');
assert(!currentHtml.includes('has not started yet.'),'current week has no future note');
const futureHtml=ui.teamFantasyMainWeekBrowser_({week:5,currentWeek:4,availableWeeks:[1,2,3,4,5]});
assert(futureHtml.includes('Week 5 has not started yet.'),'future week keeps the exact minimal note');

// 8. Game Day polling remains persisted-row/cache only.
const gdStart=gameDaySource.indexOf('function apiGetTeamFantasyGameDayState');
const gdEnd=gameDaySource.indexOf('function teamFantasyBuildSyntheticGameDayLab_',gdStart);
const gdApi=gameDaySource.slice(gdStart,gdEnd);
assert(!gdApi.includes('teamFantasyFetchEspnSummary_'),'Game Day polling cannot fetch ESPN summaries');
assert(!gdApi.includes('UrlFetchApp'),'Game Day polling cannot make external HTTP calls');
assert(!gdApi.includes('teamFantasyFetchWeekSchedule_'),'Game Day polling stays persisted-row/cache only');

// 9. Initial page path is unchanged: full state request is still exactly one established call.
const loadStateBlock=block(frontendSource,'function teamFantasyLoadState_','function teamFantasyPrewarmState_');
assert(loadStateBlock.includes('api("getTeamFantasyState", payload)'),'initial load still uses established state API');
assert(!loadStateBlock.includes('getTeamFantasyWeekState'),'light week API is not added to initial first paint');

// Static performance evidence: full state repeats expensive work; light state eliminates it.
const fullApi=block(engineSource,'function apiGetTeamFantasyState','function teamFantasyNotificationOutstandingSummary_');
const fullOps=[
  'teamFantasyNflWeekTiming_','teamFantasyEnsureEntriesForUser_','teamFantasyLeaguesForEntries_',
  'teamFantasyBuildStandings_','teamFantasyGetPlayerPreference_','teamFantasyAutoFillActivation_'
].filter(name=>fullApi.includes(name));
const lightOps=[
  'teamFantasyNflWeekTiming_','teamFantasyEnsureEntriesForUser_','teamFantasyLeaguesForEntries_',
  'teamFantasyBuildStandings_','teamFantasyGetPlayerPreference_','teamFantasyAutoFillActivation_'
].filter(name=>weekApi.includes(name));
assert(fullOps.length>=6,'baseline full state should exhibit the repeated expensive work');
assert.strictEqual(lightOps.length,0,'light week state eliminates all six repeated static/season operations');

console.log('PASS team_fantasy_week_switch_performance_r1_tests');
console.log('Baseline repeated operations:',fullOps.join(', '));
console.log('Light week-state repeated operations:',lightOps.length);
