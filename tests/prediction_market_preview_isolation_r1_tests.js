'use strict';
// Source-only isolation tests. No Apps Script, Google Sheets or network writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const engine = require('../backend/engines/PredictionMarketEngineR2.js');
const store = require('../backend/engines/PredictionMarketStoreR2.js');
const source = name => fs.readFileSync(path.join(root,name),'utf8');
const PROD_SCRIPT='production-script-fixture', PREVIEW_SCRIPT='preview-script-fixture';
const PROD_SHEET='production-sheet-fixture', PREVIEW_SHEET='preview-sheet-fixture';
const settings = {
  PATTC_PM_ENV:'PREVIEW',
  PATTC_PM_PRODUCTION_SCRIPT_ID:PROD_SCRIPT,
  PATTC_PM_PREVIEW_SCRIPT_ID:PREVIEW_SCRIPT,
  PATTC_PM_PRODUCTION_SPREADSHEET_ID:PROD_SHEET,
  PATTC_PM_PREVIEW_SPREADSHEET_ID:PREVIEW_SHEET
};
let properties = {...settings}, scriptId = PREVIEW_SCRIPT, activeCalls=0, previewOpens=0, activeFeeCalls=0, writes=0;
class Sheet {
  constructor(headers){this.rows=[headers.slice()]}
  getLastColumn(){return this.rows[0].length}
  getLastRow(){return this.rows.length}
  getRange(row,col,numRows,numCols){return {getValues:()=>this.rows.slice(row-1,row-1+numRows).map(a=>a.slice(col-1,col-1+numCols))}}
  getDataRange(){return {getValues:()=>this.rows.map(x=>x.slice())}}
  appendRow(){writes++;throw Error('Unexpected spreadsheet mutation')}
}
class Workbook {
  constructor(id) {this.id=id;this.sheets={};Object.keys(engine.PREDICTION_MARKET_R2_SHEETS).forEach(key=>{
    this.sheets[engine.PREDICTION_MARKET_R2_SHEETS[key]]=new Sheet(engine.PREDICTION_MARKET_R2_HEADERS[key]);
  })}
  getId(){return this.id}
  getSheetByName(name){return this.sheets[name]||null}
  insertSheet(){writes++;throw Error('Unexpected store initialization')}
}
const preview=new Workbook(PREVIEW_SHEET),production=new Workbook(PROD_SHEET);
let openTarget=preview;
const saved={PropertiesService:global.PropertiesService,ScriptApp:global.ScriptApp,SpreadsheetApp:global.SpreadsheetApp,
  PREDICTION_MARKET_R2_SHEETS:global.PREDICTION_MARKET_R2_SHEETS,
  PREDICTION_MARKET_R2_HEADERS:global.PREDICTION_MARKET_R2_HEADERS};
global.PREDICTION_MARKET_R2_SHEETS=engine.PREDICTION_MARKET_R2_SHEETS;
global.PREDICTION_MARKET_R2_HEADERS=engine.PREDICTION_MARKET_R2_HEADERS;
global.PropertiesService={getScriptProperties:()=>({getProperty:name=>properties[name]||null})};
global.ScriptApp={getScriptId:()=>scriptId};
global.SpreadsheetApp={
  openById:id=>{previewOpens++;assert.equal(id,PREVIEW_SHEET);return openTarget},
  getActive:()=>{activeCalls++;return production},
  getActiveSpreadsheet:()=>{activeFeeCalls++;throw Error('Unsafe active fee read')}
};
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name)}
function reject(name,fn){check(name,()=>assert.throws(fn,/Prediction Market|Preview/))}
async function main(){
  try{
    reject('missing environment fails closed',()=>{properties={...settings};delete properties.PATTC_PM_ENV;store.predictionMarketR2SelectSpreadsheet_()});
    reject('missing Preview spreadsheet ID fails closed',()=>{properties={...settings};delete properties.PATTC_PM_PREVIEW_SPREADSHEET_ID;store.predictionMarketR2SelectSpreadsheet_()});
    reject('missing production identity fails closed',()=>{properties={...settings};delete properties.PATTC_PM_PRODUCTION_SCRIPT_ID;store.predictionMarketR2SelectSpreadsheet_()});
    reject('wrong Apps Script ID fails closed',()=>{properties={...settings};scriptId='wrong-project';store.predictionMarketR2SelectSpreadsheet_()});
    reject('same Apps Script project rejected',()=>{properties={...settings,PATTC_PM_PREVIEW_SCRIPT_ID:PROD_SCRIPT};scriptId=PROD_SCRIPT;store.predictionMarketR2SelectSpreadsheet_()});
    reject('Preview and production spreadsheet collision rejected',()=>{properties={...settings,PATTC_PM_PREVIEW_SPREADSHEET_ID:PROD_SHEET};scriptId=PREVIEW_SCRIPT;store.predictionMarketR2SelectSpreadsheet_()});
    reject('openById returning production spreadsheet rejected',()=>{properties={...settings};openTarget=production;store.predictionMarketR2SelectSpreadsheet_();});
    reject('missing Preview store rejected',()=>{openTarget=preview;const key='PredictionMarketSettlements',prior=preview.sheets[key];delete preview.sheets[key];try{store.predictionMarketR2SelectSpreadsheet_()}finally{preview.sheets[key]=prior}});
    reject('wrong Preview store schema rejected',()=>{const sheet=preview.sheets.PredictionMarketWallets, prior=sheet.rows[0];sheet.rows[0]=['INVALID'];try{store.predictionMarketR2SelectSpreadsheet_()}finally{sheet.rows[0]=prior}});
    check('valid Preview repository selects isolated workbook',()=>{const repo=store.predictionMarketR2CreateAppsScriptRepository();assert.equal(repo.spreadsheet,preview);assert.deepEqual(repo.listMarkets(),[]);assert.deepEqual(repo.listWallets(),[]);assert.deepEqual(repo.listTransactions(),[]);assert.deepEqual(repo.listPositions(),[])});
    check('Preview isolation never accesses getActive',()=>assert.equal(activeCalls,0));
    reject('unauthorized Preview market write cannot reach stores',()=>{properties={...settings};scriptId='unapproved-preview-project';const r=store.predictionMarketR2CreateAppsScriptRepository();r.saveMarket({})});
    check('wrong environment rejected before storage mutation',()=>assert.equal(writes,0));
    reject('production script project mismatch rejected',()=>{properties={...settings,PATTC_PM_ENV:'PRODUCTION'};scriptId=PREVIEW_SCRIPT;store.predictionMarketR2SelectSpreadsheet_()});
    check('configured production uses existing active workbook',()=>{properties={...settings,PATTC_PM_ENV:'PRODUCTION'};scriptId=PROD_SCRIPT;assert.equal(store.predictionMarketR2SelectSpreadsheet_(),production)});
    reject('production active workbook mismatch rejected',()=>{properties={...settings,PATTC_PM_ENV:'PRODUCTION',PATTC_PM_PRODUCTION_SPREADSHEET_ID:'other-production'};store.predictionMarketR2SelectSpreadsheet_()});
    check('Preview fee reads use repository only',()=>{
      properties={...settings};scriptId=PREVIEW_SCRIPT;
      const repo=store.predictionMarketR2CreateAppsScriptRepository();
      const tx=preview.sheets.PredictionMarketTransactions;
      const row=tx.rows[0].map(header=>({
        TransactionId:'fee-fixture',PlayerId:'test-player',MarketId:'test-market',Outcome:'YES',
        Status:'COMMITTED',CommittedResultJson:JSON.stringify({feeCredits:0.25})
      })[header]||'');
      tx.rows.push(row);
      try{
        const feeContext={predictionMarketTradingFeesR1Round_:n=>Math.round(Number(n||0)*1e6)/1e6,PREDICTION_MARKET_R2_SHEETS:engine.PREDICTION_MARKET_R2_SHEETS};
        vm.createContext(feeContext);vm.runInContext(source('backend/engines/PredictionMarketTradingFeesR1.js'),feeContext);
        const charges=feeContext.predictionMarketTradingFeesR1FeeCharges_(repo,'test-player','test-market');
        assert.equal(charges.length,1);assert.equal(charges[0].feeCredits,0.25);
        const stats=feeContext.predictionMarketTradingFeesR1Stats_(repo);
        assert.equal(stats.chargedFeeCredits,0.25);assert.equal(stats.refundedFeeCredits,0);
      }finally{tx.rows.pop()}
      assert.equal(activeFeeCalls,0);
    });
    check('fee read with missing repository fails closed',()=>{
      const ctx={PREDICTION_MARKET_R2_SHEETS:engine.PREDICTION_MARKET_R2_SHEETS};vm.createContext(ctx);
      vm.runInContext(source('backend/engines/PredictionMarketTradingFeesR1.js'),ctx);
      assert.throws(()=>ctx.predictionMarketTradingFeesR1RowsFromSheet_('transactions',{}),/repository spreadsheet/);
    });
    const cloudflare=source('functions/api/app.js').replace(/^export /gm,'');
    let networkCalls=[];
    const gateway={URL,Response,Set,Promise,fetch:async(url,options)=>{networkCalls.push({url:String(url),body:JSON.parse(options.body)});return{ok:true,status:200,text:async()=>JSON.stringify({success:true})}}};
    vm.createContext(gateway);vm.runInContext(cloudflare,gateway);
    const post=(action,env={})=>gateway.onRequestPost({request:new Request('https://feature-r1.my-appscript-project.pages.dev/api/app',{method:'POST',body:JSON.stringify({action})}),env});
    for(const action of ['adminCreatePredictionMarket','adminOpenPredictionMarket','adminRefreshPredictionMarketReference','bootstrapPredictionMarketWallet','executePredictionMarketTrade','adminVoidPredictionMarket']){
      const response=await post(action);
      check('Preview '+action+' blocked by default',()=>{assert.equal(response.status,403);assert.equal(networkCalls.length,0)});
    }
    check('misconfigured Preview custom host cannot become production',()=>{const r=gateway.pattcCupProductionRequest_({request:{url:'https://feature-r1.my-appscript-project.pages.dev/api/app'},env:{PATTC_PRODUCTION_HOSTNAME:'feature-r1.my-appscript-project.pages.dev'}});assert.equal(r,false)});
    check('production canonical hostname stays production',()=>assert.equal(gateway.pattcCupProductionRequest_({request:{url:'https://my-appscript-project.pages.dev/api/app'},env:{}}),true));
    const response=await post('adminOpenPredictionMarket',{PATTC_PM_PREVIEW_FINANCIAL_WRITES_ENABLED:'true',PATTC_PM_PREVIEW_SCRIPT_ID:'same',PATTC_PM_PRODUCTION_SCRIPT_ID:'same',PATTC_PM_PREVIEW_SPREADSHEET_ID:'sheet1',PATTC_PM_PRODUCTION_SPREADSHEET_ID:'sheet2'});
    check('gateway rejects enabled flag with script collision',()=>{assert.equal(response.status,403);assert.equal(networkCalls.length,0)});
    const enabledResponse=await post('adminOpenPredictionMarket',{PATTC_PM_PREVIEW_FINANCIAL_WRITES_ENABLED:'true',PATTC_PM_PREVIEW_SCRIPT_ID:PREVIEW_SCRIPT,PATTC_PM_PRODUCTION_SCRIPT_ID:PROD_SCRIPT,PATTC_PM_PREVIEW_SPREADSHEET_ID:PREVIEW_SHEET,PATTC_PM_PRODUCTION_SPREADSHEET_ID:PROD_SHEET});
    check('verified opt-in routes to Preview backend, never production',()=>{assert.equal(enabledResponse.status,200);assert.equal(networkCalls.length,1);assert(networkCalls[0].url.includes('AKfycbywlPw_'));assert(!networkCalls[0].url.includes('AKfycbyDdfv-'));assert.equal(networkCalls[0].body.__pattcPmExpectedEnv,'PREVIEW')});
    check('Preview-marked request rejected before production sheet access',()=>{
      properties={...settings,PATTC_PM_ENV:'PRODUCTION'};scriptId=PROD_SCRIPT;
      const before=activeCalls;
      assert.throws(()=>store.predictionMarketR2AssertRequestEnvironment_(networkCalls[0].body.__pattcPmExpectedEnv),/request environment does not match/);
      assert.equal(activeCalls,before);
      properties={...settings};scriptId=PREVIEW_SCRIPT;
    });
    check('matched Preview request marker selects only Preview spreadsheet',()=>{
      assert.equal(store.predictionMarketR2AssertRequestEnvironment_('PREVIEW'),preview);
    });
    const readResult=await post('getPredictionMarketPlayerState');
    check('Preview read requests carry server-enforced environment marker',()=>{
      assert.equal(readResult.status,200);assert.equal(networkCalls.length,2);
      assert.equal(networkCalls[1].body.__pattcPmExpectedEnv,'PREVIEW');
      assert(networkCalls[1].url.includes('AKfycbywlPw_'));
    });
    check('no test wrote to any sheet',()=>assert.equal(writes,0));
    console.log('PASS prediction_market_preview_isolation_r1_tests ('+count+' checks)');
  }finally{for(const [name,value]of Object.entries(saved)){if(value===undefined)delete global[name];else global[name]=value}}
}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1});
