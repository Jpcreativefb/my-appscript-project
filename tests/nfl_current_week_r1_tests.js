'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'backend/engines/NflCurrentWeekEngine.js'),'utf8');
const c={Date,Number,String,Array,Object,Math,RegExp,console};vm.createContext(c);vm.runInContext(code,c);
const day=24*60*60*1000, first=Date.parse('2026-09-10T00:00:00Z');
const schedule={};
function game(ms,final){return {GameDateTime:new Date(ms).toISOString(),Completed:final,Status:final?'Final':'Scheduled'};}
for(let w=1;w<=18;w++)schedule[w]=[game(first+(w-1)*7*day,true)];
schedule[4]=[game(first+3*7*day,false)];
let r=c.pattcNflResolveCurrentWeek_({mode:'auto',nowMs:first+2.5*7*day,fetchWeek:w=>schedule[w],fallbackWeek:1});
assert.equal(r.week,4,'fully final prior week advances to next scheduled week');
r=c.pattcNflResolveCurrentWeek_({mode:'override',overrideWeek:7,nowMs:first+2.5*7*day,fetchWeek:w=>schedule[w]});
assert.equal(r.week,7);assert.equal(r.mode,'override');
r=c.pattcNflResolveCurrentWeek_({mode:'auto',overrideWeek:7,nowMs:first+2.5*7*day,fetchWeek:w=>schedule[w],fallbackWeek:1});
assert.equal(r.week,4,'stale numeric override is ignored after override mode is removed');
console.log('NFL current-week R1: automatic advance, explicit override, override removal PASS');
