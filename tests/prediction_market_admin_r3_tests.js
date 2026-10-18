const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const {
  predictionMarketAdminR3CreateService,
  predictionMarketAdminR3AllowedActions_
} = require('../backend/admin/AdminPredictionMarketsR3.js');
const {
  predictionMarketR2CreateMemoryRepository,
  predictionMarketR2CreateEngine
} = require('../backend/engines/PredictionMarketEngineR2.js');

const adminSource = read('frontend/js/pages/admin.js');
const appSource = read('frontend/js/app.js');
const managerSource = read('frontend/js/pages/adminPredictionMarketsR3.js');
const apiSource = read('backend/Api.js');
const securitySource = read('backend/core/ApiSecurity.js');
const serviceSource = read('backend/admin/AdminPredictionMarketsR3.js');
const gamesSource = read('backend/engines/GamesEngine.js');
const sportsWagerSource = read('backend/engines/SportsWagerEngine.js');
const shellSource = read('frontend/js/adminGameBuilderNavigationShellR2.js');

assert.doesNotThrow(() => new Function(managerSource));
assert.doesNotThrow(() => new Function(serviceSource));

// 1/5/6/7 — separate Games & Design destination and dedicated route without Sports pollution.
assert(adminSource.includes('Games &amp; Design → Prediction Markets'));
assert(adminSource.includes("navigate('admin-prediction-markets')"));
assert(appSource.includes('"admin-prediction-markets"'));
assert(appSource.includes('case "admin-prediction-markets"'));
assert(appSource.includes('renderAdminPredictionMarketsPage'));
assert(adminSource.includes("onclick=\"navigate('admin-games')\">Confidence</button>"));
assert(adminSource.includes("onclick=\"navigate('admin-games')\">Survivor</button>"));
assert(adminSource.includes(`navigate('admin-team-fantasy')">Team Fantasy Football`));
assert(adminSource.includes(`navigate('admin-playoff-race')">Playoff Race`));
assert(adminSource.includes(`navigate('admin-nfl-cup')">Cups / Combined Competitions → NFL Cup`));
assert(adminSource.includes(`navigate('admin-sports-engine')">Sports Engine Controls`));
assert(!adminSource.includes('adminOpenSportsManageGamesR2_'));

// 2/3 — canonical General / Custom registry is exactly the accepted eight.
const canonical = ['prediction','head-to-head','staked-prediction','wager','racing-wager','voting','ranking','mixed'];
canonical.forEach(type => assert(shellSource.includes('"' + type + '"'), 'missing canonical type ' + type));
assert(!/id:\s*["']prediction-market["']/.test(gamesSource));
assert(!shellSource.includes('"prediction-market"'));

// 4 — Sports Wager remains independent and untouched in authority naming.
assert(sportsWagerSource.includes('SPORTS WAGER ENGINE'));
assert(!managerSource.includes('SportsWagerEngine'));

// 8–13 — Admin adapter delegates every mutation to accepted R2 methods.
const calls = [];
const fakeEngine = {
  getMarkets: () => [{marketId:'m1',status:'DRAFT'}],
  createMarket: (ctx,payload) => (calls.push(['createMarket',ctx,payload]), Object.assign({status:'DRAFT'},payload)),
  editDraftMarket: (ctx,id,payload) => (calls.push(['editDraftMarket',ctx,id,payload]), Object.assign({marketId:id,status:'DRAFT'},payload)),
  setManualPrice: (ctx,id,yes,no,asOf) => (calls.push(['setManualPrice',ctx,id,yes,no,asOf]), {marketId:id,status:'OPEN',referenceYesPrice:yes,referenceNoPrice:no}),
  openMarket: (ctx,id) => (calls.push(['openMarket',ctx,id]), {marketId:id,status:'OPEN'}),
  lockMarket: (ctx,id) => (calls.push(['lockMarket',ctx,id]), {marketId:id,status:'LOCKED'}),
  resolveMarket: (ctx,id,outcome) => (calls.push(['resolveMarket',ctx,id,outcome]), {marketId:id,status:'RESOLVED',winningOutcome:outcome}),
  voidMarket: (ctx,id) => (calls.push(['voidMarket',ctx,id]), {marketId:id,status:'VOID'})
};
const svc = predictionMarketAdminR3CreateService({engine:fakeEngine});
assert.equal(svc.list('director').markets[0].allowedAdminActions.includes('OPEN'), true);
svc.create('director',{marketId:'new',title:'New',referenceYesPrice:0.5,referenceNoPrice:0.5,providerMetadata:'{}'});
svc.edit('director',{marketId:'new',title:'Edited',referenceYesPrice:0.5,referenceNoPrice:0.5,providerMetadata:'{}'});
svc.price('director',{marketId:'new',referenceYesPrice:0.6,referenceNoPrice:0.4,referencePriceAsOf:'2026-10-18T00:00:00Z'});
svc.open('director',{marketId:'new'});
svc.lock('director',{marketId:'new'});
svc.resolve('director',{marketId:'new',winningOutcome:'YES'});
svc.resolve('director',{marketId:'new',winningOutcome:'NO'});
svc.voidMarket('director',{marketId:'new'});
['createMarket','editDraftMarket','setManualPrice','openMarket','lockMarket','resolveMarket','voidMarket'].forEach(name => assert(calls.some(c => c[0] === name), 'missing R2 delegation '+name));
assert(calls.every(c => !c[1] || c[1].role === 'ADMIN'));
assert.throws(() => svc.create('',{}), /Authenticated Admin username/);

// R2 lifecycle remains authoritative: resolved/void cannot reopen.
let nowMs = Date.parse('2026-10-18T12:00:00.000Z');
function realService() {
  const repository = predictionMarketR2CreateMemoryRepository();
  const engine = predictionMarketR2CreateEngine({repository, now:() => new Date(nowMs)});
  return {service:predictionMarketAdminR3CreateService({engine}), engine};
}
let real = realService();
real.service.create('director',{marketId:'resolved',title:'Resolved?',referenceYesPrice:0.5,referenceNoPrice:0.5,referencePriceAsOf:new Date(nowMs).toISOString(),providerKind:'MANUAL',lockTime:new Date(nowMs+3600000).toISOString()});
real.service.open('director',{marketId:'resolved'}); real.service.lock('director',{marketId:'resolved'}); real.service.resolve('director',{marketId:'resolved',winningOutcome:'YES'});
assert.throws(() => real.service.open('director',{marketId:'resolved'}), /Invalid/);
real = realService();
real.service.create('director',{marketId:'voided',title:'Void?',referenceYesPrice:0.5,referenceNoPrice:0.5,referencePriceAsOf:new Date(nowMs).toISOString(),providerKind:'MANUAL',lockTime:new Date(nowMs+3600000).toISOString()});
real.service.voidMarket('director',{marketId:'voided'});
assert.throws(() => real.service.open('director',{marketId:'voided'}), /Invalid/);
assert.deepEqual(predictionMarketAdminR3AllowedActions_('RESOLVED'), []);
assert.deepEqual(predictionMarketAdminR3AllowedActions_('VOID'), []);

// API routes run behind the existing admin session security boundary.
assert(apiSource.includes('apiAdminPredictionMarketR3Dispatch'));
assert(securitySource.includes('if (apiSecurityIsAdminAction_(action))'));
assert(securitySource.includes('payload.username = sessionUsername'));

// 14 — browser manager never owns raw Prediction Market stores or account mutation.
['SpreadsheetApp','PredictionMarketWallets','PredictionMarketTransactions','PredictionMarketPositions','PredictionMarketSettlements','saveWallet','savePosition','commitTrade','commitSettlement'].forEach(token => {
  assert(!managerSource.includes(token), 'client must not mutate storage: '+token);
});
assert(managerSource.includes('window.confirm'));
assert(managerSource.includes('adminResolvePredictionMarket'));
assert(managerSource.includes('adminVoidPredictionMarket'));

console.log('PASS prediction_market_admin_r3_tests');
