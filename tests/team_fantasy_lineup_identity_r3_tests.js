'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('frontend/js/pages/teamFantasy.js','utf8');
const code=src.slice(src.indexOf('function teamFantasySelectedTeam_('),src.indexOf('function teamFantasyFormatKickoff_('));
const c={window:{},teamFantasyPickMethodTag_:x=>x||'',console};vm.createContext(c);vm.runInContext(code,c);
const positions=['QB','RB','WRTE','OL','K','DL','LB','DB'];
for(const position of positions){
 c.window.TEAM_FANTASY_STATE={gameId:'game',week:3,selectedLeagueId:'league'};
 const live={position,teamAbbr:'BUF',status:'live',fantasyPoints:25,weekRank:1};
 c.window.TEAM_FANTASY_CURRENT_GAME_DAY={gameId:'game',week:3,leagueId:'league',competitors:[{entryId:'other',isViewer:true,slots:[live]}]};
 const slot={position,pick:{teamAbbr:'MIA'},teams:[{abbr:'MIA',rank:7,game:{status:'scheduled'}}]};
 assert.equal(c.teamFantasyPositionMetric_('mine',slot).points,0,position+': never use another entry');
 c.window.TEAM_FANTASY_CURRENT_GAME_DAY.competitors[0].entryId='mine';
 assert.equal(c.teamFantasyPositionMetric_('mine',slot).points,0,position+': never use a different selected team');
 live.teamAbbr='MIA';assert.equal(c.teamFantasyPositionMetric_('mine',slot).points,25);
 c.window.TEAM_FANTASY_CURRENT_GAME_DAY.week=2;assert.equal(c.teamFantasyPositionMetric_('mine',slot).points,0,position+': week isolation');
 c.window.TEAM_FANTASY_CURRENT_GAME_DAY.week=3;c.window.TEAM_FANTASY_CURRENT_GAME_DAY.leagueId='other';assert.equal(c.teamFantasyPositionMetric_('mine',slot).points,0,position+': league isolation');
 c.window.TEAM_FANTASY_CURRENT_GAME_DAY.leagueId='league';slot.pick=null;assert.equal(c.teamFantasyPositionMetric_('mine',slot).points,0,position+': empty picks must stay empty');
}
console.log('Team Fantasy all eight positions: entry, selected team, week, league and empty-slot isolation PASS');
