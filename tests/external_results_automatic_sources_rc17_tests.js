const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const hub = fs.readFileSync('external-engines/external-results-hub/HubCore.js','utf8');
const provider = fs.readFileSync('external-engines/external-results-hub/ProviderAdapters.js','utf8');
const policySource = fs.readFileSync('external-engines/external-results-hub/ResultSourcePolicy.js','utf8');
const academySource = fs.readFileSync('external-engines/external-results-hub/OfficialAwardsAdapters.js','utf8');
const review = fs.readFileSync('external-engines/external-results-hub/ReviewAndBridge.js','utf8');
const bridge = fs.readFileSync('backend/engines/ExternalResultsHubBridgeEngine.js','utf8');
const api = fs.readFileSync('backend/Api.js','utf8');
const ui = fs.readFileSync('external-engines/external-results-hub/AutomaticResultsSources.html','utf8');

function key(v){return String(v == null ? '' : v).trim().toLowerCase();}
function str(v){return String(v == null ? '' : v).trim();}
function bool(v, fallback){ if (typeof v === 'boolean') return v; const k=key(v); if(['true','1','yes','on'].includes(k)) return true; if(['false','0','no','off'].includes(k)) return false; return fallback===true; }
function sha(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function slug(v){return key(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

// Schema and Admin UX contract.
assert(hub.includes('const ERH_SCHEMA_VERSION = "2.3.1"'));
assert(hub.includes('POLICIES: "ResultSourcePolicies"'));
[
  'ResultSource','SourceTier','MonitorAutomatically','RequireAdminApproval','AutoApplyWhenVerified',
  'VerificationMode','LastChecked','LastError','SourceHealth','DetectedResult','LastObservationId','SourceAgreement',
  'Confidence','Finalized','FinalizedEvidenceUrl'
].forEach(field => assert(hub.includes('"'+field+'"'), 'missing policy field '+field));
assert(hub.includes('ProviderId: "official-academy"'), 'official Academy provider not seeded');
assert(/ProviderId: "kalshi"[\s\S]*?SourceTier: "CORROBORATION"/.test(hub));
assert(/ProviderId: "polymarket"[\s\S]*?SourceTier: "CORROBORATION"/.test(hub));
assert(/ProviderId: "manual-awards"[\s\S]*?SourceTier: "MANUAL"/.test(hub));
assert(ui.includes('Official — Academy Awards / Oscars'));
assert(ui.includes('Trusted Structured'));
assert(ui.includes('Monitor Automatically'));
assert(ui.includes('Require Admin Approval'));
assert(ui.includes('Auto Apply When Verified'));
assert(ui.includes('Source Agreement / Confidence'));
assert(ui.includes('Detected Result'));
assert(ui.includes('Finalized'));

// Existing pipeline must remain the only settlement path.
assert(review.includes('ExternalResultsInbox'), 'Hub delivery must continue through ExternalResultsInbox');
assert(!review.includes('CategoryResults'), 'Hub code must not directly write CategoryResults');
assert(bridge.includes('externalResultsInboxValidateGroup_(rows)'), 'main-app auto path must reuse Inbox validation');
assert(bridge.includes('externalResultsInboxApplyGeneric_(validation,rows,"automatic-results-policy")'), 'main-app auto path must reuse generic Inbox apply');
assert(bridge.includes('if(validation.route!=="GENERIC")'), 'Reality/native routes must be excluded from automatic apply');
assert(bridge.includes('externalResultsInboxAutoApplyWorker()'), 'permanent Hub worker must invoke automatic Inbox worker');
assert(bridge.includes('externalResultsInboxQueueHubAck_'), 'final application must continue acknowledging the Hub');
assert(bridge.includes('ResultSourcePolicies'), 'main app acknowledgement must support policy finalization evidence');

// Policy pure logic.
const policyCtx = {
  Object, Math, Number, String, Date, JSON, isFinite,
  erhKey_: key, erhString_: str, erhBoolean_: bool, erhSha256_: sha, erhSlug_: slug,
  erhNormalizeFinality_: v => str(v).toUpperCase(),
  erhWinningOutcomeList_: r => r && r.WinningOutcome ? [r.WinningOutcome] : [],
};
vm.createContext(policyCtx);
vm.runInContext(policySource, policyCtx);
assert.strictEqual(policyCtx.erhNormalizeSourceTier_('Official'),'OFFICIAL');
assert.strictEqual(policyCtx.erhNormalizeSourceTier_('Trusted Structured'),'TRUSTED_STRUCTURED');
assert.strictEqual(policyCtx.erhNormalizeSourceTier_('Kalshi / Polymarket Corroboration'),'CORROBORATION');
assert.strictEqual(policyCtx.erhNormalizeSourceTier_('garbage'),'MANUAL','unknown tier must fail closed to manual');
assert.strictEqual(policyCtx.erhNormalizeVerificationMode_('Auto Approve When Verified'),'AUTO_APPROVE_WHEN_VERIFIED');
assert.strictEqual(policyCtx.erhNormalizeVerificationMode_('Multi-Source Auto Approve'),'MULTI_SOURCE_AUTO_APPROVE');
assert.strictEqual(policyCtx.erhNormalizeVerificationMode_('unknown'),'MANUAL_APPROVAL','unknown mode must fail closed');

const basePolicy = {
  Domain:'AWARDS', MonitorAutomatically:true, AutoApplyWhenVerified:true, RequireAdminApproval:false,
  VerificationMode:'AUTO_APPROVE_WHEN_VERIFIED', SourceTier:'OFFICIAL', ExpectedWinnerCount:1,
  StableChecksRequired:2
};
const result = {Finality:'FINAL', WinningOutcome:'Film A'};
function elig(patch={}, opts={}) {
  return policyCtx.erhPolicyEligibility_(Object.assign({},basePolicy,patch), result, Object.assign({
    mappingState:{complete:true}, sourceHealthy:true, priorConflict:false,
    agreement:{conflict:false,qualifying:1}, stableCheckCount:2
  },opts));
}
assert.strictEqual(elig().eligible,true,'clean Tier 1 single winner must be eligible');
assert.strictEqual(elig({SourceTier:'CORROBORATION'}).eligible,false,'market corroboration cannot single-source auto approve');
assert.strictEqual(elig({Domain:'REALITY'}).eligible,false,'Reality must stay native-review gated in initial policy');
assert.strictEqual(elig({RequireAdminApproval:true}).eligible,false);
assert.strictEqual(elig({ExpectedWinnerCount:2}).eligible,false);
assert.strictEqual(elig({}, {mappingState:{complete:false}}).eligible,false);
assert.strictEqual(elig({}, {sourceHealthy:false}).eligible,false);
assert.strictEqual(elig({}, {priorConflict:true}).eligible,false);
assert.strictEqual(elig({}, {stableCheckCount:1}).eligible,false,'first observation cannot auto approve');
assert.strictEqual(elig({}, {agreement:{conflict:true,qualifying:1}}).eligible,false);
assert.strictEqual(elig({VerificationMode:'MULTI_SOURCE_AUTO_APPROVE'}, {agreement:{conflict:false,qualifying:1}}).eligible,false,'multi-source mode needs two qualifying sources');
assert.strictEqual(elig({VerificationMode:'MULTI_SOURCE_AUTO_APPROVE'}, {agreement:{conflict:false,qualifying:2}}).eligible,true,'two qualifying Tier 1/2 sources may qualify');
assert.strictEqual(elig({VerificationMode:'MULTI_SOURCE_AUTO_APPROVE'}, {agreement:{conflict:false,qualifying:0,corroboration:2}}).eligible,false,'Kalshi + Polymarket alone can never qualify');

// Agreement logic: Kalshi/Polymarket are corroboration and cannot count as qualifying sources.
const agreementCtx = {
  Object, Math, Number, String, Date, JSON, isFinite,
  erhKey_:key, erhString_:str, erhBoolean_:bool, erhSha256_:sha, erhSlug_:slug,
  erhNormalizeFinality_:v=>str(v).toUpperCase(), erhWinningOutcomeList_:r=>r.WinningOutcome?[r.WinningOutcome]:[],
};
let mappings=[
  {Active:true,AppGameId:'g',CategoryId:'c',Provider:'kalshi'},
  {Active:true,AppGameId:'g',CategoryId:'c',Provider:'polymarket'}
];
let results=[
  {Provider:'kalshi',Finality:'FINAL',WinningOutcome:'A',ProviderTimestamp:new Date('2026-01-01')},
  {Provider:'polymarket',Finality:'FINAL',WinningOutcome:'A',ProviderTimestamp:new Date('2026-01-01')}
];
agreementCtx.ERH_SHEETS={MAPPINGS:'m',RESULTS:'r'};
agreementCtx.erhReadObjects_ = sheet => sheet==='m'?mappings:results;
agreementCtx.erhGetProviderSetting_ = id => ({ProviderId:id,SourceTier:(id==='kalshi'||id==='polymarket')?'CORROBORATION':'OFFICIAL'});
vm.createContext(agreementCtx); vm.runInContext(policySource,agreementCtx);
let ag=agreementCtx.erhPolicyAgreement_({AppGameId:'g',CategoryId:'c'},{WinningOutcome:'A'});
assert.strictEqual(ag.qualifying,0); assert.strictEqual(ag.corroboration,2); assert(/MARKET ONLY/.test(ag.status));
mappings.push({Active:true,AppGameId:'g',CategoryId:'c',Provider:'official-academy'});
results.push({Provider:'official-academy',Finality:'FINAL',WinningOutcome:'A',ProviderTimestamp:new Date('2026-01-01')});
ag=agreementCtx.erhPolicyAgreement_({AppGameId:'g',CategoryId:'c'},{WinningOutcome:'A'});
assert.strictEqual(ag.qualifying,1); assert.strictEqual(ag.corroboration,2); assert.strictEqual(ag.status,'OFFICIAL + MARKET AGREE');
results[1].WinningOutcome='B';
ag=agreementCtx.erhPolicyAgreement_({AppGameId:'g',CategoryId:'c'},{WinningOutcome:'A'});
assert.strictEqual(ag.conflict,true); assert.strictEqual(ag.status,'SOURCE CONFLICT');

// Academy adapter: stable URL, explicit marker, exact category, one winner, fingerprint, fail closed.
const academyCtx={Object,Math,Number,String,Date,JSON,erhKey_:key,erhString_:str,erhSha256_:sha};
vm.createContext(academyCtx); vm.runInContext(academySource,academyCtx);
assert.strictEqual(academyCtx.erhValidateAcademySourceUrl_('https://www.oscars.org/oscars/ceremonies/2026','2026'),true);
assert.throws(()=>academyCtx.erhValidateAcademySourceUrl_('https://example.com/oscars/2026','2026'),/stable official ceremony URL/);
const fixture=`<html><body><h1>The 98th Academy Awards | 2026</h1><h2>WINNERS &amp; NOMINEES</h2><section><h3>Best Picture</h3><div>Winner</div><div>One Battle After Another</div><div>Nominees</div><div>Film B</div></section><section><h3>Actor in a Leading Role</h3><div>Winner</div><div>Michael B. Jordan</div><div>Nominees</div></section></body></html>`;
let parsed=academyCtx.erhParseAcademyCeremonyCategory_(fixture,'Best Picture',1);
assert.strictEqual(parsed.winner,'One Battle After Another'); assert.strictEqual(parsed.fingerprint.length,64);
parsed=academyCtx.erhParseAcademyCeremonyCategory_(fixture,'Actor in a Leading Role',1);
assert.strictEqual(parsed.winner,'Michael B. Jordan');
assert.throws(()=>academyCtx.erhParseAcademyCeremonyCategory_(fixture.replace('WINNERS &amp; NOMINEES','Awards'), 'Best Picture',1),/WINNERS & NOMINEES/);
assert.throws(()=>academyCtx.erhParseAcademyCeremonyCategory_(fixture,'Best Picture',2),/exactly one winner/);
assert.throws(()=>academyCtx.erhParseAcademyCeremonyCategory_(fixture+'<h3>Best Picture</h3><div>Winner</div><div>X</div>','Best Picture',1),/exactly one category heading/);
assert(academySource.includes('match.length!==1'), 'official adapter must fail when winner does not map exactly once');
assert(academySource.includes('mappings.length!==Number(policy.ExpectedNomineeCount||0)'), 'official adapter must require complete mapping');
assert(!academySource.toLowerCase().includes('google.com/search'), 'adapter must not use generic web search');

// Actual Academy sync + automatic pipeline orchestration: one real provider run is one stable observation.
const orchestrationSheets={POLICIES:'policies',MAPPINGS:'mappings',RESULTS:'results',REVIEW:'review'};
const orchestrationState={
  policies:[{
    PolicyId:'rsp-test',AppGameId:'g',CategoryId:'c',Domain:'AWARDS',ResultSource:'official-academy',SourceTier:'OFFICIAL',
    MonitorAutomatically:true,RequireAdminApproval:false,AutoApplyWhenVerified:true,VerificationMode:'AUTO_APPROVE_WHEN_VERIFIED',
    ExpectedWinnerCount:1,OfficialSourceUrl:'https://www.oscars.org/oscars/ceremonies/2026',OfficialCategoryName:'Best Picture',OfficialCeremonyYear:'2026',
    ExpectedNomineeCount:2,StableChecksRequired:2,StaleAfterMinutes:180,StableCheckCount:0,DetectedFingerprint:'',LastObservationId:'',SourceHealth:'HEALTHY'
  }],
  mappings:[
    {MappingId:'m1',Active:true,AppGameId:'g',CategoryId:'c',NomineeId:'n1',Provider:'official-academy',ExternalEventId:'oscars-2026',ExternalMarketId:'oscars-2026-best-picture',ResultKey:'winning-outcome',ExpectedOutcome:'Film A'},
    {MappingId:'m2',Active:true,AppGameId:'g',CategoryId:'c',NomineeId:'n2',Provider:'official-academy',ExternalEventId:'oscars-2026',ExternalMarketId:'oscars-2026-best-picture',ResultKey:'winning-outcome',ExpectedOutcome:'Film B'}
  ],
  results:[],reviews:[],logs:[],deliveries:0,fetches:0,
  provider:{ProviderId:'official-academy',Enabled:true,ReadOnly:true,DiscoveryConfigJSON:'{}',SourceTier:'OFFICIAL',SourceHealth:'HEALTHY',LastCheckedAt:new Date(),StaleAfterMinutes:180,ConsecutiveFailures:0,BackoffUntil:''}
};
let orchestrationWinner='Film A', orchestrationUuid=0;
const orchestrationCtx={
  Object,Math,Number,String,Date,JSON,isFinite,Array,RegExp,Error,
  ERH_SHEETS:orchestrationSheets,
  ERH_HEADERS:{policies:[],mappings:[],results:[],review:[]},
  SpreadsheetApp:{getActive:()=>({toast:()=>{}})},
  Utilities:{getUuid:()=>`sync-${++orchestrationUuid}`,sleep:()=>{}},
  erhKey_:key,erhString_:str,erhBoolean_:bool,erhSha256_:sha,erhSlug_:slug,
  erhParseJson_:(value,fallback)=>{try{return value?JSON.parse(value):fallback;}catch(_){return fallback;}},
  erhNormalizeFinality_:v=>str(v).toUpperCase(),
  erhWinningOutcomeList_:r=>r&&r.WinningOutcome?[r.WinningOutcome]:[],
  erhMappingMatchesResult_:(m,r)=>key(m.Provider)===key(r.Provider)&&key(m.ExternalEventId)===key(r.ExternalEventId)&&key(m.ExternalMarketId)===key(r.ExternalMarketId)&&key(m.ResultKey||'winning-outcome')===key(r.ResultKey||'winning-outcome'),
  erhEnsureHubReady_:()=>{},
  erhReadObjects_:sheet=>sheet===orchestrationSheets.POLICIES?orchestrationState.policies:sheet===orchestrationSheets.MAPPINGS?orchestrationState.mappings:sheet===orchestrationSheets.RESULTS?orchestrationState.results:sheet===orchestrationSheets.REVIEW?orchestrationState.reviews:[],
  erhFindObject_:(sheet,predicate)=>{
    const rows=sheet===orchestrationSheets.POLICIES?orchestrationState.policies:sheet===orchestrationSheets.MAPPINGS?orchestrationState.mappings:sheet===orchestrationSheets.RESULTS?orchestrationState.results:sheet===orchestrationSheets.REVIEW?orchestrationState.reviews:[];
    return rows.find(predicate)||null;
  },
  erhUpsertObject_:(sheet,_headers,keys,obj)=>{
    const rows=sheet===orchestrationSheets.POLICIES?orchestrationState.policies:sheet===orchestrationSheets.MAPPINGS?orchestrationState.mappings:sheet===orchestrationSheets.RESULTS?orchestrationState.results:orchestrationState.reviews;
    const found=rows.find(row=>keys.every(k=>key(row[k])===key(obj[k])));
    if(found)Object.assign(found,obj);else rows.push(Object.assign({},obj));
    return {created:!found,updated:!!found};
  },
  erhGetProviderSetting_:id=>key(id)==='official-academy'?orchestrationState.provider:null,
  erhUpdateProviderState_:(_id,patch)=>Object.assign(orchestrationState.provider,patch),
  erhAppendSyncLog_:row=>orchestrationState.logs.push(Object.assign({},row)),
  erhUpsertExternalEvent_:()=>({created:true,updated:false}),
  erhUpsertExternalMarket_:()=>({created:true,updated:false}),
  erhUpsertOutcomeSubjects_:()=>2,
  pushApprovedExternalResultsNow:()=>{orchestrationState.deliveries+=1;return {success:true,delivered:1};}
};
vm.createContext(orchestrationCtx);
vm.runInContext(provider,orchestrationCtx);
vm.runInContext(policySource,orchestrationCtx);
vm.runInContext(academySource,orchestrationCtx);
// ProviderAdapters defines its spreadsheet-backed logger; replace it only inside this in-memory orchestration fixture.
orchestrationCtx.erhAppendSyncLog_=row=>orchestrationState.logs.push(Object.assign({},row));
orchestrationCtx.erhFetchOfficialText_=(_url,stats)=>{
  orchestrationState.fetches+=1; stats.apiCalls+=1;
  return `<html><body><h1>Academy Awards 2026</h1><h2>WINNERS &amp; NOMINEES</h2><section><h3>Best Picture</h3><div>Winner</div><div>${orchestrationWinner}</div><div>Nominees</div><div>Film A</div><div>Film B</div></section></body></html>`;
};
orchestrationCtx.erhImportNormalizedResult_=input=>{
  const fingerprint=sha([input.Provider,input.ExternalEventId,input.ExternalMarketId,input.ResultKey,input.WinningOutcome,input.Finality].join('|'));
  let row=orchestrationState.results.find(r=>r.SourceFingerprint===fingerprint);
  const duplicate=!!row;
  if(!row){
    row=Object.assign({},input,{ImportedResultId:`result-${orchestrationState.results.length+1}`,SourceFingerprint:fingerprint,ReviewStatus:'PENDING',ReviewRequired:true});
    orchestrationState.results.push(row);
    orchestrationState.reviews.push({ReviewId:`review-${orchestrationState.reviews.length+1}`,ImportedResultId:row.ImportedResultId,ReviewStatus:'PENDING',PushStatus:'PENDING'});
  } else {
    row.ProviderTimestamp=input.ProviderTimestamp; row.ImportedAt=input.ImportedAt;
  }
  return {importedResultId:row.ImportedResultId,duplicate,queueCreated:!duplicate};
};

let orchestrationRun=orchestrationCtx.syncAutomaticResultSourcesNow();
assert.strictEqual(orchestrationRun.success,true);
assert.strictEqual(orchestrationState.fetches,1,'first orchestration must perform exactly one external Academy fetch');
assert.strictEqual(Number(orchestrationState.policies[0].StableCheckCount),1,'one provider fetch/run must count as exactly one stable observation');
assert.strictEqual(orchestrationState.policies[0].LastObservationId,'official-academy:sync-1');
assert.strictEqual(orchestrationState.reviews[0].ReviewStatus,'PENDING','one stable observation must not auto-approve a two-check policy');

orchestrationCtx.erhRunAutomaticResultPipelineNow_();
assert.strictEqual(orchestrationState.fetches,1,'pipeline reprocessing must not fetch again');
assert.strictEqual(Number(orchestrationState.policies[0].StableCheckCount),1,'same stored observation reprocessed by the pipeline must remain one');
const sameObservation=orchestrationState.policies[0].LastObservationId;
orchestrationCtx.erhPolicyObserveResult_(orchestrationState.results[0].ImportedResultId,orchestrationState.policies[0].DetectedFingerprint,sameObservation);
assert.strictEqual(Number(orchestrationState.policies[0].StableCheckCount),1,'retrying one processing cycle with the same observation identity must not fabricate stability');

orchestrationRun=orchestrationCtx.syncAutomaticResultSourcesNow();
assert.strictEqual(orchestrationRun.success,true);
assert.strictEqual(orchestrationState.fetches,2,'second verification must be a distinct external Academy fetch');
assert.strictEqual(Number(orchestrationState.policies[0].StableCheckCount),2,'later distinct provider fetch with same fingerprint must count as the second check');
assert.strictEqual(orchestrationState.policies[0].LastObservationId,'official-academy:sync-2');
assert.strictEqual(orchestrationState.reviews[0].ReviewStatus,'APPROVED','two distinct stable observations may satisfy the existing auto-approval policy');

orchestrationWinner='Film B';
orchestrationRun=orchestrationCtx.syncAutomaticResultSourcesNow();
assert.strictEqual(orchestrationRun.success,true);
assert.strictEqual(orchestrationState.fetches,3);
assert.strictEqual(Number(orchestrationState.policies[0].StableCheckCount),1,'changed fingerprint must restart stability at one');
assert.strictEqual(orchestrationState.policies[0].DetectedResult,'Film B');
assert.strictEqual(orchestrationState.policies[0].LastObservationId,'official-academy:sync-3');
assert(orchestrationState.logs.every(row=>JSON.parse(row.DetailsJSON).observationId),'provider sync log must durably retain the observation identity');

// Provider safety: bounded retry/backoff/staleness state exists.
const providerCtx={Math,Number,String,Date}; vm.createContext(providerCtx);
const helperBlock = provider.match(/function erhProviderBackoffDelayMinutes_[\s\S]*?(?=function erhRunProviderSync_)/)[0];
vm.runInContext(helperBlock,providerCtx);
assert.strictEqual(providerCtx.erhProviderBackoffDelayMinutes_(1),5);
assert.strictEqual(providerCtx.erhProviderBackoffDelayMinutes_(2),10);
assert(providerCtx.erhProviderBackoffDelayMinutes_(20)<=360);
assert.strictEqual(providerCtx.erhProviderRetryableHttpStatus_(429),true);
assert.strictEqual(providerCtx.erhProviderRetryableHttpStatus_(503),true);
assert.strictEqual(providerCtx.erhProviderRetryableHttpStatus_(404),false);
assert(provider.includes('ConsecutiveFailures'));
assert(provider.includes('BackoffUntil'));
assert(provider.includes('SourceHealth: "BACKOFF"'));
assert(provider.includes('maxAttempts = 3'));
assert(provider.includes('Utilities.sleep'));
assert(policySource.includes('StaleAfterMinutes'));
assert(policySource.includes('SOURCE_UNHEALTHY_OR_STALE'));

// Main-app auto config rejects market-only and allows policy-verified official source.
const bridgeCtx={JSON,String}; vm.createContext(bridgeCtx); vm.runInContext(bridge,bridgeCtx);
let cfg=bridgeCtx.externalResultsInboxAutoConfig_([{Provider:'kalshi',SourceConfigJSON:JSON.stringify({sourceTier:'CORROBORATION',verificationMode:'AUTO_APPROVE_WHEN_VERIFIED',autoApplyWhenVerified:true,requireAdminApproval:false,sourceHealth:'HEALTHY'})}]);
assert.strictEqual(cfg.eligible,false);
cfg=bridgeCtx.externalResultsInboxAutoConfig_([{Provider:'official-academy',SourceConfigJSON:JSON.stringify({sourceTier:'OFFICIAL',verificationMode:'AUTO_APPROVE_WHEN_VERIFIED',autoApplyWhenVerified:true,requireAdminApproval:false,sourceHealth:'HEALTHY'})}]);
assert.strictEqual(cfg.eligible,true);
cfg=bridgeCtx.externalResultsInboxAutoConfig_([{Provider:'official-academy',SourceConfigJSON:JSON.stringify({sourceTier:'OFFICIAL',verificationMode:'AUTO_APPROVE_WHEN_VERIFIED',autoApplyWhenVerified:true,requireAdminApproval:true,sourceHealth:'HEALTHY'})}]);
assert.strictEqual(cfg.eligible,false);

// Main Awards App Inbox provider contract: Academy is deliberately accepted, unknown providers remain fail-closed.
['manual-awards','manual-reality-tv','kalshi','polymarket','official-academy'].forEach(providerId=>{
  assert.strictEqual(bridgeCtx.externalResultsInboxProviderAllowed_(providerId),true,providerId+' must remain accepted by the Inbox provider contract');
});
assert.strictEqual(bridgeCtx.externalResultsInboxProviderAllowed_('arbitrary-unknown-provider'),false,'unknown provider must remain fail-closed');

const academyInboxRows=[
  {Status:'READY',Provider:'official-academy',AppGameId:'g',CategoryId:'c',Finality:'FINAL',NomineeId:'n1',IsWinner:true,ResultValue:'Film A',WinningOutcome:'Film A',ResultKey:'winning-outcome',ImportedResultId:'ir1',ReviewId:'rv1',DeliveryBatchId:'db1',ExternalEventId:'oscars-2026',ExternalMarketId:'oscars-2026-best-picture',SourceConfigJSON:JSON.stringify({sourceTier:'OFFICIAL',verificationMode:'AUTO_APPROVE_WHEN_VERIFIED',autoApplyWhenVerified:true,requireAdminApproval:false,sourceHealth:'HEALTHY'})},
  {Status:'READY',Provider:'official-academy',AppGameId:'g',CategoryId:'c',Finality:'FINAL',NomineeId:'n2',IsWinner:false,ResultValue:'Film A',WinningOutcome:'Film A',ResultKey:'winning-outcome',ImportedResultId:'ir1',ReviewId:'rv1',DeliveryBatchId:'db1',ExternalEventId:'oscars-2026',ExternalMarketId:'oscars-2026-best-picture',SourceConfigJSON:JSON.stringify({sourceTier:'OFFICIAL',verificationMode:'AUTO_APPROVE_WHEN_VERIFIED',autoApplyWhenVerified:true,requireAdminApproval:false,sourceHealth:'HEALTHY'})}
];
bridgeCtx.adminGetGameSetup=()=>({game:{type:'prediction'},categories:[{categoryId:'c',nominees:[{nomineeId:'n1'},{nomineeId:'n2'}]}]});
bridgeCtx.externalResultsInboxExistingRealityDelivery_=()=>null;
bridgeCtx.externalResultsInboxExistingResolution_=()=>null;
bridgeCtx.externalResultsInboxRealityMain_=()=>null;
bridgeCtx.externalResultsInboxRealityQuestion_=()=>null;
let academyValidation=bridgeCtx.externalResultsInboxValidateGroup_(academyInboxRows);
assert.strictEqual(academyValidation.ok,true,'official Academy Inbox delivery must validate');
assert.strictEqual(academyValidation.route,'GENERIC','ordinary Academy Awards result must use generic Awards settlement path');
let bulkApplied=null,categoryApplied=null,ackApplied=0;
bridgeCtx.requireAdmin_=()=>true;
bridgeCtx.externalResultsInboxGroups_=statuses=>statuses.some(status=>academyInboxRows.some(row=>row.Status===status))?{academy:academyInboxRows}:{};
bridgeCtx.externalResultsInboxPatchRows_=(rows,patch)=>rows.forEach(row=>Object.assign(row,patch));
bridgeCtx.externalResultsInboxSummary_=()=>({success:true});
bridgeCtx.upsertCategoryResultsBulk_=rows=>{bulkApplied=rows;};
bridgeCtx.adminUpdateCategory=payload=>{categoryApplied=payload;return {success:true};};
bridgeCtx.externalResultsInboxDedupeCategoryResults_=()=>({removed:0});
bridgeCtx.clearAppCaches=()=>{};
bridgeCtx.externalResultsInboxQueueHubAck_=()=>{ackApplied+=1;};
const academyValidateApi=bridgeCtx.apiAdminValidateExternalResultsInbox({username:'admin'});
assert.strictEqual(academyValidateApi.success,true);
assert.strictEqual(academyValidateApi.validated,1);
assert(academyInboxRows.every(row=>row.Status==='VALIDATED'),'official Academy delivery must advance READY → VALIDATED');
const academyApplyApi=bridgeCtx.apiAdminApplyExternalResultsInbox({username:'admin'});
assert.strictEqual(academyApplyApi.success,true);
assert.strictEqual(academyApplyApi.applied,1);
assert(academyInboxRows.every(row=>row.Status==='APPLIED'),'official Academy delivery must advance VALIDATED → APPLIED');
assert.strictEqual(bulkApplied.length,2,'generic Awards apply must write the complete nominee result set');
assert.strictEqual(bulkApplied.filter(row=>row.isWinner).length,1);
assert.strictEqual(categoryApplied.resultProvider,'official-academy');
assert.strictEqual(categoryApplied.autoSettle,true,'policy-verified Academy result may use existing generic Awards auto-settlement');
assert.strictEqual(ackApplied,1,'generic apply must retain Hub acknowledgement');

academyInboxRows.forEach(row=>{row.Status='READY';});
bridgeCtx.externalResultsInboxRealityMain_=()=>({EpisodeId:'ep1'});
const realityBlocked=bridgeCtx.externalResultsInboxValidateGroup_(academyInboxRows);
assert.strictEqual(realityBlocked.ok,false,'official Academy provider must never become a Reality native settlement provider');
assert(/Reality TV native settlement only accepts the manual-reality-tv provider/.test(realityBlocked.error));
assert(bridge.includes('if(validation.route!=="GENERIC")'),'automatic worker must continue skipping all native Reality routes');

// The existing permanent one-minute Hub worker is reused; no competing auto trigger is introduced.
assert(bridge.includes('EXTERNAL_RESULTS_BRIDGE_TRIGGER'));
assert(bridge.includes('.everyMinutes(1)'));
assert(!bridge.includes('EXTERNAL_RESULTS_AUTO_APPLY_TRIGGER'));
assert(!api.includes('adminInstallExternalResultsAutoApply'));

console.log('external-results-automatic-sources-rc17-tests: PASS');
