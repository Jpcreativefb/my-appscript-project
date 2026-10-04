'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const be=fs.readFileSync(path.join(root,'backend/engines/SportsSurvivorEngine.js'),'utf8');
const js=fs.readFileSync(path.join(root,'frontend/js/pages/survivor.js'),'utf8');
const r4=fs.readFileSync(path.join(root,'frontend/js/pages/survivorR4.js'),'utf8');
const css=fs.readFileSync(path.join(root,'frontend/css/survivor-r4.css'),'utf8');
const confidenceCss=fs.readFileSync(path.join(root,'frontend/css/confidence-r2.css'),'utf8');
const app=fs.readFileSync(path.join(root,'frontend/js/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'frontend/app.html'),'utf8');

// Gradient contract: Survivor mirrors Confidence's dual-radial / 145deg visual treatment.
assert(confidenceCss.includes('radial-gradient(circle at 28% 18%'));
assert(confidenceCss.includes('radial-gradient(circle at 82% 78%'));
assert(css.includes('NFL_SURVIVOR_LIVE_PRESENTATION_R2'));
assert(css.includes('radial-gradient(circle at 28% 18%,var(--survivor-team-primary-a),transparent 52%)'));
assert(css.includes('radial-gradient(circle at 82% 78%,var(--survivor-team-secondary-a),transparent 62%)'));
assert(css.includes('linear-gradient(145deg,rgba(5,31,50,.86),rgba(2,14,25,.91) 62%,rgba(5,24,39,.90))'));

// Shared score model already has Period/Clock; Survivor now persists them instead of dropping them.
assert(be.includes('"Status", "State", "Period", "Clock", "Completed"'));
assert(be.includes('Period: sportsSurvivorString_(score.Period), Clock: sportsSurvivorString_(score.Clock)'));
assert(be.includes('period: rr.Period || rr.SportsPeriod'));
assert(be.includes('clock: rr.Clock || rr.SportsClock'));

// Status presentation: no raw provider fallback; scheduled uses kickoff only, live uses clock/period or LIVE, final is FINAL.
assert(js.includes('if (state === "final") return "FINAL"'));
assert(js.includes('if (state === "live")'));
assert(js.includes('if (detail) return detail.toUpperCase()'));
assert(js.includes('return "LIVE";'));
assert(js.includes('return "";'));
assert(!js.includes('return "NOT STARTED";'));
assert(js.includes('if (/HALF/.test(rawStatus)'));
assert(js.includes("('Q'+String(period))"));
assert(js.includes("join(' ')"));
assert(!js.includes('"LIVE " + detail.toUpperCase()'));
assert(!js.includes('String(result.status || "").trim()'));
assert(!js.includes("survivorFinalLiveDetail_(payload,r)||r.status||'LIVE'"));

// Backend odds normalization distinguishes missing default zero from a priced real pick'em.
const context={console,Date,JSON,Math,Number,String,Array,Object,Boolean,RegExp,Set,isFinite,parseInt,parseFloat};
vm.createContext(context);
vm.runInContext(be,context);
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_('', 'spread', -110),'');
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(0, 'spread', ''),'');
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(0, 'spread', -110),0);
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(-3.5, 'spread', -110),-3.5);
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_('', 'moneyline'),'');
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(0, 'moneyline'),'');
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(-165, 'moneyline'),-165);
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_('', 'total'),'');
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(0, 'total'),'');
assert.strictEqual(context.sportsSurvivorNormalizeOddsValue_(44.5, 'total'),44.5);

// A failed requested market may still retain other real markets instead of erasing the entire matchup.
let partial=context.sportsSurvivorOddsFromResult_({
  success:false,found:false,source:'sports-odds',
  homeOdds:-165,awayOdds:145,
  homeSpread:0,awaySpread:0,homeSpreadOdds:0,awaySpreadOdds:0,
  totalPoints:44.5
});
assert(partial);
assert.strictEqual(partial.homeSpread,'');
assert.strictEqual(partial.homeOdds,-165);
assert.strictEqual(partial.totalPoints,44.5);

// Frontend per-market formatting.
assert(js.includes('function survivorRecoveryR2Spread_'));
assert(js.includes('if (number === 0) return "PK";'));
assert(js.includes('function survivorRecoveryR2Moneyline_'));
assert(js.includes('function survivorRecoveryR2Total_'));
assert(js.includes('GAME TOTAL / O-U'));
assert(r4.includes('root.survivorRecoveryR2Spread_(team.spread)'));
assert(r4.includes('root.survivorRecoveryR2Total_(rawTotal)'));

// Missing record/details no longer get fake numeric defaults.
assert(js.includes('if (key === "Record") return team.teamRecord || "NA";'));
assert(js.includes('if (key === "Opp. Record") return team.opponentRecord || "NA";'));

// No new player-page external NFL request.
assert(!js.includes('site.api.espn.com'));
assert(!r4.includes('site.api.espn.com'));
assert(!js.includes('UrlFetchApp'));
assert(!r4.includes('UrlFetchApp'));

// Survivor-only asset bump ensures live Preview loads this presentation code.
assert(app.includes('v1231-nfl-survivor-live-presentation-r2'));
assert(html.includes('survivorLive=v1231-nfl-survivor-live-presentation-r2'));

console.log('NFL Survivor Live Presentation R2 tests: PASS');
