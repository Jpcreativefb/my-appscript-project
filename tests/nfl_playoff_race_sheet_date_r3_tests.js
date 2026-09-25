'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const c={console,Date,Math,JSON,Number,String,Array,Object,RegExp};vm.createContext(c);
vm.runInContext(fs.readFileSync(process.argv[2]||'backend/engines/NflPlayoffRaceEngine.js','utf8'),c);
let start=new Date('2026-09-01T05:00:00Z'),week=3;
const header=['GameId','SeasonStartDate','CurrentWeekMode','CurrentWeekOverride','UpdateWindowMode','UpdateWindowWeek','MultiplierOverride','UpdatedAt','UpdatedBy'];
c.nflPlayoffRaceEnsureSettingsSheet_=()=>({getLastRow:()=>2,getDataRange:()=>({getValues:()=>[header,['nfl-playoff-race-2026',start,'override',week,'closed','','','','test']]})});
c.SpreadsheetApp={getActive:()=>({getSpreadsheetTimeZone:()=> 'America/Chicago'})};
c.Utilities={formatDate:(date,zone,format)=>{assert.equal(zone,'America/Chicago');assert.equal(format,'yyyy-MM-dd');const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const get=t=>parts.find(p=>p.type===t).value;return get('year')+'-'+get('month')+'-'+get('day');}};
c.nflPlayoffRaceSettingsWeek_=()=>1;
assert.equal(c.nflPlayoffRaceGetSettings_('nfl-playoff-race-2026').seasonStartDate,'2026-09-01','Sheet Date must normalize to calendar date');
for(const [w,rate] of [[3,1],[4,.95],[5,.90]]){week=w;const t=c.nflPlayoffRaceTiming_('nfl-playoff-race-2026');assert(t.seasonStarted);assert.equal(t.currentWeek,w);assert.equal(c.nflPlayoffRaceInitialMultiplier_('nfl-playoff-race-2026',w,t.seasonStarted),rate);}
start='2026-09-01';assert.equal(c.nflPlayoffRaceGetSettings_('nfl-playoff-race-2026').seasonStartDate,start);
console.log('Playoff Race Sheet Date normalization, started season, Week3 and delayed original rates PASS');
