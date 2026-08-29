/* =====================================================
   AUTOMATIC RESULTS SOURCES — RESULT SOURCE POLICY v1
   Fail-closed policy layer. It never writes CategoryResults.
===================================================== */

const ERH_SOURCE_TIERS = Object.freeze({ OFFICIAL: 1, TRUSTED_STRUCTURED: 2, CORROBORATION: 3, MANUAL: 4 });
const ERH_VERIFICATION_MODES = Object.freeze({
  MANUAL_APPROVAL: "MANUAL_APPROVAL",
  AUTO_APPROVE_WHEN_VERIFIED: "AUTO_APPROVE_WHEN_VERIFIED",
  MULTI_SOURCE_AUTO_APPROVE: "MULTI_SOURCE_AUTO_APPROVE"
});
const ERH_POLICY_AUTOMATION_ACTOR = "automatic-results-policy";

function erhNormalizeSourceTier_(value) {
  const key = erhKey_(value).replace(/[^a-z0-9]+/g, "");
  if (key === "official" || key === "1") return "OFFICIAL";
  if (key === "trustedstructured" || key === "trusted" || key === "2") return "TRUSTED_STRUCTURED";
  if (key === "corroboration" || key === "kalshipolymarketcorroboration" || key === "3") return "CORROBORATION";
  if (key === "manual" || key === "4") return "MANUAL";
  return "MANUAL";
}

function erhNormalizeVerificationMode_(value) {
  const key = erhKey_(value).replace(/[\s-]+/g, "_").toUpperCase();
  if (key === "AUTO_APPROVE_WHEN_VERIFIED") return ERH_VERIFICATION_MODES.AUTO_APPROVE_WHEN_VERIFIED;
  if (key === "MULTI_SOURCE_AUTO_APPROVE") return ERH_VERIFICATION_MODES.MULTI_SOURCE_AUTO_APPROVE;
  return ERH_VERIFICATION_MODES.MANUAL_APPROVAL;
}

function erhPolicyBool_(value, fallback) { return value === undefined || value === "" ? !!fallback : erhBoolean_(value, fallback); }
function erhPolicyNumber_(value, fallback) { const n=Number(value); return isFinite(n) ? n : Number(fallback || 0); }
function erhPolicyKey_(gameId, categoryId) { return erhKey_(gameId) + "|" + erhKey_(categoryId); }
function erhPolicyId_(gameId, categoryId) { return "rsp-" + erhSha256_(erhPolicyKey_(gameId, categoryId)).slice(0, 20); }
function erhAcademyEventId_(year) { return "oscars-" + String(year); }
function erhAcademyMarketId_(year, categoryName) { return erhAcademyEventId_(year) + "-" + erhSlug_(categoryName); }

function showAutomaticResultsSourcesManager() {
  erhEnsureHubReady_();
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile("AutomaticResultsSources").setTitle("Automatic Results Sources"));
}

function getAutomaticResultsSourcesBootstrap() {
  erhEnsureHubReady_();
  const targets = erhMappingManagerReadMainTargets_();
  return { success:true, games:targets.games, categories:targets.categories, policies:erhReadObjects_(ERH_SHEETS.POLICIES).map(erhPolicyPublicView_) };
}

function erhPolicyPublicView_(row) {
  return {
    policyId:erhString_(row.PolicyId), appGameId:erhString_(row.AppGameId), categoryId:erhString_(row.CategoryId), domain:erhString_(row.Domain),
    resultSource:erhString_(row.ResultSource), sourceTier:erhNormalizeSourceTier_(row.SourceTier), monitorAutomatically:erhPolicyBool_(row.MonitorAutomatically,false),
    requireAdminApproval:erhPolicyBool_(row.RequireAdminApproval,true), autoApplyWhenVerified:erhPolicyBool_(row.AutoApplyWhenVerified,false), verificationMode:erhNormalizeVerificationMode_(row.VerificationMode),
    expectedWinnerCount:erhPolicyNumber_(row.ExpectedWinnerCount,1), officialSourceUrl:erhString_(row.OfficialSourceUrl), officialCategoryName:erhString_(row.OfficialCategoryName), officialCeremonyYear:erhString_(row.OfficialCeremonyYear),
    expectedNomineeCount:erhPolicyNumber_(row.ExpectedNomineeCount,0), stableChecksRequired:Math.max(2,erhPolicyNumber_(row.StableChecksRequired,2)), staleAfterMinutes:Math.max(30,erhPolicyNumber_(row.StaleAfterMinutes,180)),
    lastChecked:erhString_(row.LastChecked), lastError:erhString_(row.LastError), sourceHealth:erhString_(row.SourceHealth)||"UNKNOWN", detectedResult:erhString_(row.DetectedResult), sourceAgreement:erhString_(row.SourceAgreement), confidence:erhString_(row.Confidence),
    finalized:erhPolicyBool_(row.Finalized,false), finalizedAt:erhString_(row.FinalizedAt), finalizedEvidenceUrl:erhString_(row.FinalizedEvidenceUrl), lastAutoAction:erhString_(row.LastAutoAction)
  };
}

function saveAutomaticResultSourcePolicy(payload) {
  erhEnsureHubReady_(); payload=payload||{};
  const gameId=erhString_(payload.appGameId), categoryId=erhString_(payload.categoryId);
  if (!gameId || !categoryId) throw new Error("Choose a game and category.");
  const targets=erhMappingManagerReadMainTargets_();
  const category=targets.categories.find(function(c){return erhKey_(c.gameId)===erhKey_(gameId)&&erhKey_(c.categoryId)===erhKey_(categoryId);});
  if (!category) throw new Error("The selected Awards category was not found in the main app.");
  const source=erhKey_(payload.resultSource || "manual-admin");
  const tier=source==="official-academy" ? "OFFICIAL" : (source==="trusted-structured" ? "TRUSTED_STRUCTURED" : (source==="kalshi"||source==="polymarket" ? "CORROBORATION" : "MANUAL"));
  const mode=erhNormalizeVerificationMode_(payload.verificationMode);
  let requireAdmin=erhPolicyBool_(payload.requireAdminApproval,true);
  let autoApply=erhPolicyBool_(payload.autoApplyWhenVerified,false);
  let monitor=erhPolicyBool_(payload.monitorAutomatically,false);
  const domain=erhKey_(payload.domain)==="reality" ? "REALITY" : "AWARDS";
  if (domain === "REALITY" || tier === "CORROBORATION" || tier === "MANUAL" || source === "trusted-structured") { requireAdmin=true; autoApply=false; }
  if (mode === ERH_VERIFICATION_MODES.MANUAL_APPROVAL) { requireAdmin=true; autoApply=false; }
  const now=new Date(), id=erhPolicyId_(gameId,categoryId);
  const existing=erhFindObject_(ERH_SHEETS.POLICIES,function(r){return erhKey_(r.PolicyId)===erhKey_(id);})||{};
  let year=erhString_(payload.officialCeremonyYear), officialCategory=erhString_(payload.officialCategoryName || category.categoryName), url=erhString_(payload.officialSourceUrl);
  if (source === "official-academy") {
    if (!/^\d{4}$/.test(year)) throw new Error("Academy source requires a four-digit ceremony year.");
    url=url || ("https://www.oscars.org/oscars/ceremonies/"+year);
    erhValidateAcademySourceUrl_(url,year);
    if (!officialCategory) throw new Error("Academy source requires the official category name.");
  }
  const row=Object.assign({},existing,{
    PolicyId:id,AppGameId:gameId,CategoryId:categoryId,ExternalEventId:source==="official-academy"?erhAcademyEventId_(year):erhString_(payload.externalEventId),Domain:domain,
    ResultSource:source,SourceTier:tier,MonitorAutomatically:monitor,RequireAdminApproval:requireAdmin,AutoApplyWhenVerified:autoApply,VerificationMode:mode,
    ExpectedWinnerCount:Math.max(1,erhPolicyNumber_(payload.expectedWinnerCount,1)),OfficialSourceUrl:url,OfficialCategoryName:officialCategory,OfficialCeremonyYear:year,
    ExpectedNomineeCount:category.nominees.filter(function(n){return n.active!==false;}).length,StableChecksRequired:Math.max(2,erhPolicyNumber_(payload.stableChecksRequired,2)),StaleAfterMinutes:Math.max(30,erhPolicyNumber_(payload.staleAfterMinutes,180)),
    LastChecked:existing.LastChecked||"",LastError:existing.LastError||"",SourceHealth:existing.SourceHealth||"UNKNOWN",DetectedResult:existing.DetectedResult||"",DetectedResultJSON:existing.DetectedResultJSON||"",DetectedFingerprint:existing.DetectedFingerprint||"",LastObservationId:existing.LastObservationId||"",StableCheckCount:existing.StableCheckCount||0,
    SourceAgreement:existing.SourceAgreement||"WAITING",Confidence:existing.Confidence||"REVIEW REQUIRED",Finalized:existing.Finalized||false,FinalizedAt:existing.FinalizedAt||"",FinalizedEvidenceUrl:existing.FinalizedEvidenceUrl||"",FinalizedFingerprint:existing.FinalizedFingerprint||"",LastAutoAction:existing.LastAutoAction||"",CreatedAt:existing.CreatedAt||now,UpdatedAt:now
  });
  delete row.__rowNumber;
  erhUpsertObject_(ERH_SHEETS.POLICIES,ERH_HEADERS[ERH_SHEETS.POLICIES],["PolicyId"],row);
  if (source === "official-academy") erhEnsureOfficialAcademyMappings_(row,category);
  return {success:true, policy:erhPolicyPublicView_(row)};
}

function erhEnsureOfficialAcademyMappings_(policy, category) {
  const now=new Date(), marketId=erhAcademyMarketId_(policy.OfficialCeremonyYear,policy.OfficialCategoryName), provider="official-academy";
  const mappings=erhReadObjects_(ERH_SHEETS.MAPPINGS);
  mappings.filter(function(m){return erhKey_(m.Provider)===provider&&erhPolicyKey_(m.AppGameId,m.CategoryId)===erhPolicyKey_(policy.AppGameId,policy.CategoryId);}).forEach(function(m){
    m.Active = erhKey_(m.ExternalMarketId)===erhKey_(marketId); m.UpdatedAt=now; delete m.__rowNumber;
    erhUpsertObject_(ERH_SHEETS.MAPPINGS,ERH_HEADERS[ERH_SHEETS.MAPPINGS],["MappingId"],m);
  });
  category.nominees.filter(function(n){return n.active!==false;}).forEach(function(n){
    const cfg={policyId:policy.PolicyId,sourceTier:"OFFICIAL",verificationMode:policy.VerificationMode,requireAdminApproval:erhPolicyBool_(policy.RequireAdminApproval,true),autoApplyWhenVerified:erhPolicyBool_(policy.AutoApplyWhenVerified,false),expectedWinnerCount:Number(policy.ExpectedWinnerCount||1),officialSourceUrl:policy.OfficialSourceUrl,officialCategoryName:policy.OfficialCategoryName};
    erhUpsertObject_(ERH_SHEETS.MAPPINGS,ERH_HEADERS[ERH_SHEETS.MAPPINGS],["MappingId"],{
      MappingId:"official-academy-"+erhSha256_([policy.AppGameId,policy.CategoryId,n.nomineeId].join("|")).slice(0,20),AppGameId:policy.AppGameId,CategoryId:policy.CategoryId,NomineeId:n.nomineeId,Provider:provider,ExternalEventId:policy.ExternalEventId,ExternalMarketId:marketId,
      ExternalSubjectId:marketId+":"+erhSlug_(n.nomineeName),ResultKey:"winning-outcome",ComparisonOperator:"eq",Threshold:"",ExpectedOutcome:n.nomineeName,AutoSettle:false,RequireAdminReview:true,SourceUrl:policy.OfficialSourceUrl,SourceConfigJSON:JSON.stringify(cfg),Active:true,CreatedAt:now,UpdatedAt:now
    });
  });
}

function erhPolicyForResult_(result) {
  const mappings=erhReadObjects_(ERH_SHEETS.MAPPINGS).filter(function(m){return erhBoolean_(m.Active,true)&&erhMappingMatchesResult_(m,result);});
  if (!mappings.length) return null;
  const first=mappings[0];
  return erhFindObject_(ERH_SHEETS.POLICIES,function(p){return erhPolicyKey_(p.AppGameId,p.CategoryId)===erhPolicyKey_(first.AppGameId,first.CategoryId);});
}

function erhPolicyMappingState_(policy,result) {
  const mappings=erhReadObjects_(ERH_SHEETS.MAPPINGS).filter(function(m){return erhBoolean_(m.Active,true)&&erhKey_(m.Provider)===erhKey_(result.Provider)&&erhPolicyKey_(m.AppGameId,m.CategoryId)===erhPolicyKey_(policy.AppGameId,policy.CategoryId)&&erhKey_(m.ExternalMarketId)===erhKey_(result.ExternalMarketId);});
  const ids={}; mappings.forEach(function(m){if(erhString_(m.NomineeId))ids[erhKey_(m.NomineeId)]=true;});
  const expected=Math.max(1,Number(policy.ExpectedNomineeCount||0));
  return {complete:mappings.length===expected&&Object.keys(ids).length===expected,count:mappings.length,expected:expected};
}

function erhPolicyHasPriorConflict_(policy,result) {
  const rows=erhReadObjects_(ERH_SHEETS.RESULTS).filter(function(r){return erhKey_(r.Provider)===erhKey_(result.Provider)&&erhKey_(r.ExternalEventId)===erhKey_(result.ExternalEventId)&&erhKey_(r.ExternalMarketId)===erhKey_(result.ExternalMarketId)&&erhKey_(r.ResultKey)===erhKey_(result.ResultKey)&&erhNormalizeFinality_(r.Finality)==="FINAL";});
  const win=erhKey_(result.WinningOutcome);
  return rows.some(function(r){return erhKey_(r.ImportedResultId)!==erhKey_(result.ImportedResultId)&&erhKey_(r.WinningOutcome)!==win;});
}

function erhPolicyProviderFreshHealthy_(policy,providerId,now) {
  const provider=erhGetProviderSetting_(providerId); if(!provider) return false;
  if (erhKey_(provider.SourceHealth)!=="healthy") return false;
  if (erhProviderBackoffActive_(provider,now||new Date())) return false;
  const checked=new Date(provider.LastCheckedAt||provider.LastSuccessfulSync||0);
  if(isNaN(checked.getTime())) return false;
  const stale=Math.max(30,Number(policy.StaleAfterMinutes||provider.StaleAfterMinutes||180));
  return (now||new Date()).getTime()-checked.getTime() <= stale*60000;
}

function erhPolicyWinnerList_(result){return erhWinningOutcomeList_(result).map(erhString_).filter(Boolean);}

function erhPolicyAgreement_(policy,result) {
  const primary=erhKey_(result.WinningOutcome); const qualifying={}, corroboration={}; let conflict=false;
  const mappings=erhReadObjects_(ERH_SHEETS.MAPPINGS).filter(function(m){return erhBoolean_(m.Active,true)&&erhPolicyKey_(m.AppGameId,m.CategoryId)===erhPolicyKey_(policy.AppGameId,policy.CategoryId);});
  const providers={}; mappings.forEach(function(m){providers[erhKey_(m.Provider)]=true;});
  const latest={}; erhReadObjects_(ERH_SHEETS.RESULTS).forEach(function(r){const pr=erhKey_(r.Provider);if(!providers[pr]||erhNormalizeFinality_(r.Finality)!=="FINAL")return;const t=new Date(r.ProviderTimestamp||r.ImportedAt||0).getTime()||0;if(!latest[pr]||t>=latest[pr].t)latest[pr]={row:r,t:t};});
  Object.keys(latest).forEach(function(pr){const r=latest[pr].row, provider=erhGetProviderSetting_(pr), tier=erhNormalizeSourceTier_(provider&&provider.SourceTier); if(erhKey_(r.WinningOutcome)!==primary){conflict=true;return;} if(tier==="OFFICIAL"||tier==="TRUSTED_STRUCTURED")qualifying[pr]=true; else if(tier==="CORROBORATION")corroboration[pr]=true;});
  if(conflict)return {status:"SOURCE CONFLICT",confidence:"BLOCKED",qualifying:0,corroboration:Object.keys(corroboration).length,conflict:true};
  const q=Object.keys(qualifying).length,c=Object.keys(corroboration).length;
  if(q>=2)return {status:"2 QUALIFYING SOURCES AGREE",confidence:"HIGH",qualifying:q,corroboration:c,conflict:false};
  if(q>=1&&c>=1)return {status:"OFFICIAL + MARKET AGREE",confidence:"HIGH",qualifying:q,corroboration:c,conflict:false};
  if(q>=1)return {status:"OFFICIAL VERIFIED",confidence:"VERIFIED",qualifying:q,corroboration:c,conflict:false};
  if(c>=1)return {status:"MARKET ONLY — REVIEW REQUIRED",confidence:"REVIEW REQUIRED",qualifying:0,corroboration:c,conflict:false};
  return {status:"WAITING FOR SOURCE",confidence:"REVIEW REQUIRED",qualifying:0,corroboration:0,conflict:false};
}

function erhPolicyEligibility_(policy,result,options) {
  options=options||{}; const reasons=[]; const mode=erhNormalizeVerificationMode_(policy&&policy.VerificationMode), tier=erhNormalizeSourceTier_(policy&&policy.SourceTier);
  if(!policy)reasons.push("NO_POLICY");
  if(erhKey_(policy&&policy.Domain)!=="awards")reasons.push("REALITY_NATIVE_REVIEW_REQUIRED");
  if(!erhPolicyBool_(policy&&policy.MonitorAutomatically,false))reasons.push("MONITOR_OFF");
  if(!erhPolicyBool_(policy&&policy.AutoApplyWhenVerified,false))reasons.push("AUTO_APPLY_OFF");
  if(erhPolicyBool_(policy&&policy.RequireAdminApproval,true))reasons.push("ADMIN_APPROVAL_REQUIRED");
  if(mode===ERH_VERIFICATION_MODES.MANUAL_APPROVAL)reasons.push("MANUAL_MODE");
  if(erhNormalizeFinality_(result&&result.Finality)!=="FINAL")reasons.push("NOT_FINAL");
  const winners=erhPolicyWinnerList_(result||{}); if(Number(policy&&policy.ExpectedWinnerCount||1)!==1||winners.length!==1)reasons.push("WINNER_COUNT");
  if(tier!=="OFFICIAL" && mode===ERH_VERIFICATION_MODES.AUTO_APPROVE_WHEN_VERIFIED) reasons.push("NOT_TIER1_OFFICIAL");
  const mapState=options.mappingState||{complete:false}; if(!mapState.complete)reasons.push("INCOMPLETE_MAPPING");
  if(options.sourceHealthy!==true)reasons.push("SOURCE_UNHEALTHY_OR_STALE");
  if(options.priorConflict===true)reasons.push("CORRECTED_OR_CONFLICTING_PRIOR_RESULT");
  const agreement=options.agreement||{conflict:false,qualifying:0}; if(agreement.conflict)reasons.push("SOURCE_CONFLICT");
  if(Number(options.stableCheckCount||0)<Math.max(2,Number(policy&&policy.StableChecksRequired||2)))reasons.push("NOT_STABLE_YET");
  if(mode===ERH_VERIFICATION_MODES.MULTI_SOURCE_AUTO_APPROVE && Number(agreement.qualifying||0)<2)reasons.push("NEEDS_TWO_QUALIFYING_SOURCES");
  return {eligible:reasons.length===0,reasons:reasons,mode:mode,tier:tier};
}

function erhPolicySetAutoApproved_(result,policy,eligibility,agreement) {
  const review=erhFindObject_(ERH_SHEETS.REVIEW,function(r){return erhKey_(r.ImportedResultId)===erhKey_(result.ImportedResultId);});
  if(!review||erhKey_(review.ReviewStatus)==="approved")return {approved:!!review,already:true};
  const now=new Date(); review.ReviewStatus="APPROVED";review.ReviewedBy=ERH_POLICY_AUTOMATION_ACTOR;review.ReviewedAt=now;review.ReviewNotes="Policy auto-approved: "+eligibility.mode+" · "+agreement.status;review.PushStatus="READY";review.UpdatedAt=now;delete review.__rowNumber;
  erhUpsertObject_(ERH_SHEETS.REVIEW,ERH_HEADERS[ERH_SHEETS.REVIEW],["ReviewId"],review);
  result.ReviewStatus="APPROVED";result.ReviewRequired=false;result.UpdatedAt=now;delete result.__rowNumber;
  erhUpsertObject_(ERH_SHEETS.RESULTS,ERH_HEADERS[ERH_SHEETS.RESULTS],["ImportedResultId"],result);
  return {approved:true,already:false};
}

function erhPolicyObservationState_(policy,evidenceFingerprint,observationId) {
  const fp=erhString_(evidenceFingerprint), observation=erhString_(observationId), priorFingerprint=erhString_(policy&&policy.DetectedFingerprint), priorObservation=erhString_(policy&&policy.LastObservationId), priorCount=Math.max(0,Number(policy&&policy.StableCheckCount||0));
  const distinct=!!observation && erhKey_(observation)!==erhKey_(priorObservation);
  if(!distinct)return {distinct:false,fingerprint:priorFingerprint||fp,observationId:priorObservation,stableCheckCount:priorCount};
  const sameFingerprint=!!fp && !!priorFingerprint && erhKey_(fp)===erhKey_(priorFingerprint);
  return {distinct:true,fingerprint:fp,observationId:observation,stableCheckCount:sameFingerprint?(priorCount>0?priorCount+1:1):1};
}

function erhPolicyObserveResult_(importedResultId,evidenceFingerprint,observationId) {
  const result=erhFindObject_(ERH_SHEETS.RESULTS,function(r){return erhKey_(r.ImportedResultId)===erhKey_(importedResultId);}); if(!result)return {success:false,error:"Imported result not found."};
  const policy=erhPolicyForResult_(result); if(!policy)return {success:true,manual:true,reason:"No Result Source Policy."};
  const now=new Date(), fp=erhString_(evidenceFingerprint||result.SourceFingerprint), observation=erhPolicyObservationState_(policy,fp,observationId);
  const agreement=erhPolicyAgreement_(policy,result), mappingState=erhPolicyMappingState_(policy,result), providerHealthy=erhPolicyProviderFreshHealthy_(policy,result.Provider,now), priorConflict=erhPolicyHasPriorConflict_(policy,result);
  policy.LastError="";policy.SourceHealth=providerHealthy?"HEALTHY":"STALE_OR_UNHEALTHY";policy.SourceAgreement=agreement.status;policy.Confidence=agreement.confidence;policy.UpdatedAt=now;
  if(observation.distinct){policy.LastChecked=now;policy.DetectedResult=erhString_(result.WinningOutcome||result.ResultValue);policy.DetectedResultJSON=JSON.stringify({provider:result.Provider,eventId:result.ExternalEventId,marketId:result.ExternalMarketId,winner:result.WinningOutcome,finality:result.Finality});policy.DetectedFingerprint=observation.fingerprint;policy.LastObservationId=observation.observationId;policy.StableCheckCount=observation.stableCheckCount;}
  const stable=Number(policy.StableCheckCount||0), eligibility=erhPolicyEligibility_(policy,result,{mappingState:mappingState,sourceHealthy:providerHealthy,priorConflict:priorConflict,agreement:agreement,stableCheckCount:stable});
  let approved=false;
  if(eligibility.eligible){const auto=erhPolicySetAutoApproved_(result,policy,eligibility,agreement);approved=auto.approved;policy.LastAutoAction=approved?"REVIEW AUTO-APPROVED":"";}
  else policy.LastAutoAction="MANUAL: "+eligibility.reasons.join(", ");
  erhUpsertObject_(ERH_SHEETS.POLICIES,ERH_HEADERS[ERH_SHEETS.POLICIES],["PolicyId"],policy);
  return {success:true,approved:approved,eligibility:eligibility,agreement:agreement,stableCheckCount:stable,distinctObservation:observation.distinct,observationId:erhString_(policy.LastObservationId)};
}

function erhPolicyMarkProviderHealth_(providerId, health, errorMessage, checkedAt) {
  erhReadObjects_(ERH_SHEETS.POLICIES).filter(function(p){return erhKey_(p.ResultSource)===erhKey_(providerId);}).forEach(function(p){p.LastChecked=checkedAt||new Date();p.LastError=erhString_(errorMessage);p.SourceHealth=erhString_(health)||"UNKNOWN";p.UpdatedAt=new Date();delete p.__rowNumber;erhUpsertObject_(ERH_SHEETS.POLICIES,ERH_HEADERS[ERH_SHEETS.POLICIES],["PolicyId"],p);});
}

function erhRunAutomaticResultPipelineNow_() {
  const results=erhReadObjects_(ERH_SHEETS.RESULTS).filter(function(r){return erhNormalizeFinality_(r.Finality)==="FINAL";});
  const evaluations=[]; results.forEach(function(r){const p=erhPolicyForResult_(r);if(!p||!erhPolicyBool_(p.MonitorAutomatically,false)||erhKey_(p.ResultSource)!==erhKey_(r.Provider))return;evaluations.push(erhPolicyObserveResult_(r.ImportedResultId,p.DetectedFingerprint||r.SourceFingerprint,""));});
  let delivery={success:true,skipped:true};
  if(evaluations.some(function(e){return e&&e.approved;})) delivery=pushApprovedExternalResultsNow();
  return {success:delivery.success!==false,evaluations:evaluations,delivery:delivery};
}

function syncAutomaticResultSourcesNow(){const official=syncOfficialAcademyResultsNow();const pipeline=erhRunAutomaticResultPipelineNow_();return {success:official.success!==false&&pipeline.success!==false,official:official,pipeline:pipeline};}
