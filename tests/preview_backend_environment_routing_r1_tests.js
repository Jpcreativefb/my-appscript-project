'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const production = 'https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec';
const preview = 'https://script.google.com/macros/s/AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0/exec';
const bridge = fs.readFileSync('functions/api/app.js', 'utf8').replace(/\bexport\s+/g, '');
const frontend = fs.readFileSync('frontend/js/api.js', 'utf8');
assert.strictEqual(frontend, fs.readFileSync('frontend/api.js', 'utf8'));

async function request(host, body, env = {}) {
  const urls = [];
  const context = vm.createContext({URL, Response, console, setTimeout,
    fetch: async url => { urls.push(url); return new Response('{"success":true}'); }
  });
  vm.runInContext(bridge, context);
  const input = {request:{url:`https://${host}/api/app`,text:async()=>JSON.stringify(body)},env};
  const response = await context.onRequestPost(input);
  const diagnostic = await context.onRequestGet(input);
  return {urls, status:response.status, body:await response.json(), diagnostic:await diagnostic.json()};
}

function client(host, fetch) {
  const context = vm.createContext({location:{hostname:host}, URL, console, setTimeout, clearTimeout,
    localStorage:{getItem:()=>null}, fetch, getSession:()=>({}), Response});
  vm.runInContext(frontend, context);
  return context;
}

(async () => {
  const actions = ['login','getDashboardGamesHub','getSurvivorState','getSurvivorTeamSchedule',
    'getNflPlayoffRaceState','adminGetPredictionMarkets','getPredictionMarketPlayerState',
    'getMovieCommunityAwardsState','futureReadAction'];
  for (const [host, expected] of [
    ['my-appscript-project.pages.dev',production],
    ['release-integrated-rc-r1.my-appscript-project.pages.dev',preview],
    ['6116f561.my-appscript-project.pages.dev',preview]
  ]) {
    for (const action of actions) {
      const result = await request(host,{action});
      assert.deepStrictEqual(result.urls,[expected],`${host}: ${action}`);
      assert.strictEqual(result.diagnostic.apiUrl,expected);
    }
    const context = client(host,async()=>new Response('{"success":true}'));
    assert.strictEqual(vm.runInContext('API_BASE',context),expected,host);
    assert.strictEqual(String(vm.runInContext('buildApiUrl_("health")',context)).split('?')[0],expected);
  }
  assert.deepStrictEqual((await request('play.example.com',{action:'adminGetPredictionMarkets'},
    {PATTC_PRODUCTION_HOSTNAME:'play.example.com'})).urls,[production]);
  assert.strictEqual(vm.runInContext('API_BASE',client('play.example.com',()=>{})),production);

  // Every inherited Preview write guard must reject before touching either backend.
  const blocked = [
    ...['adminPrepareNflCupFuturesR1','adminBuildNflSeasonPack','adminSaveNflPlayoffRaceSettings',
      'saveNflPlayoffRaceRanking','saveNflPlayoffRaceDraft','finalizeNflPlayoffRaceForecast',
      'saveSurvivorPick','saveSportsSurvivorAutoPickPreference','saveConfidenceAutoPickPreference']
      .map(action=>({action})),
    {action:'saveRanking',gameId:'nfl-playoff-race-2026'},
    ...['saveBet','removeBet'].map(action=>({action,gameId:'nfl-futures-2026'})),
    ...['draft','published','version'].map(kind=>({action:'adminSaveAppearanceOverride',entityType:'visual-studio-'+kind}))
  ];
  for (const body of blocked) {
    const result=await request('branch.my-appscript-project.pages.dev',body);
    assert.deepStrictEqual(result.urls,[],JSON.stringify(body));
    assert.strictEqual(result.body.previewOnly,true);
    assert.strictEqual(result.body.success,false);
    assert.deepStrictEqual((await request('my-appscript-project.pages.dev',body)).urls,[production]);
  }

  // Preview must never fall back to the production-only legacy Worker.
  for (const failure of [404,405,502,503,504,524,'throw']) {
    for (const action of ['getDashboardGamesHub','adminGetPredictionMarkets']) {
      const calls=[];
      const context=client('branch.my-appscript-project.pages.dev',async url=>{
        calls.push(url);
        if(failure==='throw') throw new Error('network fixture');
        return new Response('{"success":false}',{status:failure});
      });
      await context.apiPostRaw_(action,{});
      assert.deepStrictEqual(calls,['./api/app'],`${failure}: ${action}`);
    }
    const calls=[];
    const context=client('my-appscript-project.pages.dev',async url=>{
      calls.push(url);
      if(calls.length===1) {
        if(failure==='throw') throw new Error('network fixture');
        return new Response('{"success":false}',{status:failure});
      }
      return new Response('{"success":true}');
    });
    await context.apiPostRaw_('getDashboardGamesHub',{});
    assert.deepStrictEqual(calls,['./api/app','https://awards-upload-proxy.jpcreativefb.workers.dev']);
  }
  console.log('PASS: hostname routing, all normal actions, custom production host, 15 write guards, Preview fallback isolation, production compatibility, mirrors');
})().catch(error=>{console.error(error);process.exitCode=1;});
