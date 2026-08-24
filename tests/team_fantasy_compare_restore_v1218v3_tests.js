const fs = require('fs');
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root,'frontend/js/pages/teamFantasy.js'),'utf8');
const css = fs.readFileSync(path.join(root,'frontend/css/team-fantasy.css'),'utf8');
function assert(v,m){ if(!v) throw new Error(m); }
function fnBlock(source,name){
  const starts=[source.indexOf('function '+name+'('),source.indexOf('async function '+name+'(')].filter(i=>i>=0);
  assert(starts.length,'Missing function '+name);
  const start=Math.min(...starts);
  const next=source.indexOf('\nfunction ',start+10);
  const nextAsync=source.indexOf('\nasync function ',start+10);
  const ends=[next,nextAsync].filter(i=>i>=0);
  return source.slice(start,ends.length?Math.min(...ends):source.length);
}
assert(page.includes('TEAM_FANTASY_COMPARE_RESTORE_UI_v1218v3'),'18v3 compare restore UI marker missing');
assert(page.includes('team-fantasy.css?v=1218v3'),'18v3 CSS cache marker missing');
assert(css.includes('v1.2.18v3 compare restore + frozen viewer header repair'),'18v3 CSS marker missing');
const gameDay=fnBlock(page,'teamFantasyRenderGameDayIntoMount_');
assert(gameDay.includes("window.TEAM_FANTASY_GAME_DAY_VIEW || 'league'"),'Compare/standings selected view state missing');
assert(gameDay.includes('>Weekly Standings<'),'Weekly Standings tab missing');
assert(gameDay.includes('>Compare<'),'Compare tab missing');
assert(gameDay.includes('+ Add Team'),'Compare Add Team control missing');
assert(gameDay.includes('selected.length < 6'),'2-6 team compare cap missing');
assert(gameDay.includes('teamFantasyRenderCompareBoard_'),'Compare board renderer not wired');
assert(gameDay.includes('teamFantasyGameDayWeekPicker_'),'Past-week selector missing from Compare/Standings');
assert(gameDay.includes('tf-privacy-note'),'Opponent-pick privacy note missing from Compare');
assert(page.includes('Weekly standings and lineup comparison. Opponent picks stay hidden until kickoff.'),'Compare description/privacy wording missing');
assert(page.includes('Run Team Fantasy Test Lab'),'Admin Team Fantasy Test Lab must remain available during testing');
assert(page.includes('function teamFantasyOpenRules_()'),'Rules popup lost during Compare restore');
assert(page.includes('function teamFantasyOpenScoring_()'),'Scoring popup lost during Compare restore');
assert(css.includes('grid-template-areas:"qb k" "rb dl" "wrte lb" "ol db"'),'Two-column offense-left layout lost');
assert(css.includes('grid-template-areas:"qb" "rb" "wrte" "ol" "k" "dl" "lb" "db"'),'One-column OL-before-K layout lost');
assert(css.includes('.tf-compare-team.is-viewer{position:sticky!important;left:0!important;z-index:20!important}'),'Viewer compare column high-priority sticky-left rule missing');
assert(css.includes('.tf-compare-team.is-viewer .tf-compare-team-head{position:sticky!important;left:0!important;top:0!important;z-index:30!important'),'Viewer compare header freeze/stacking repair missing');
assert(css.includes('.tf-compare-team:not(.is-viewer) .tf-compare-team-head{z-index:8!important}'),'Scrolling compare header stack level missing');
console.log('Team Fantasy v1.2.18v3 Compare restore + frozen viewer header tests passed.');
