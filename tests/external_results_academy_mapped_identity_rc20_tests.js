const fs=require('fs');const vm=require('vm');const assert=require('assert');const crypto=require('crypto');
const adapter=fs.readFileSync('external-engines/external-results-hub/OfficialAwardsAdapters.js','utf8');
const policy=fs.readFileSync('external-engines/external-results-hub/ResultSourcePolicy.js','utf8');
const fixture=fs.readFileSync('tests/fixtures/academy_2026_best_picture_live_conflicting_identity_sanitized.html','utf8');
function key(v){return String(v==null?'':v).trim().toLowerCase();}function str(v){return String(v==null?'':v).trim();}function sha(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
const ctx={Object,Math,Number,String,Date,JSON,RegExp,Error,isFinite,erhKey_:key,erhString_:str,erhSha256_:sha};vm.createContext(ctx);vm.runInContext(adapter,ctx);vm.runInContext(policy,ctx);
const outcomes=['One Battle after Another','Bugonia','F1','Frankenstein','Hamnet','Marty Supreme','The Secret Agent','Sentimental Value','Sinners','Train Dreams'];
// 1 identical raw winners collapse.
let identical=fixture.replace('One Battle after Another Adam Somner, Sara Murphy and Paul Thomas Anderson, Producers','One Battle after Another');
let p=ctx.erhParseAcademyCeremonyCategory_(identical,'Best Picture',1,outcomes);assert.strictEqual(p.winner,'One Battle after Another');assert.strictEqual(p.equivalentSections,2);
// 2 same nominee with title + producer presentation differences resolves to one mapped identity.
p=ctx.erhParseAcademyCeremonyCategory_(fixture,'Best Picture',1,outcomes);assert.strictEqual(p.winner,'One Battle after Another');assert.strictEqual(p.candidateIdentities.length,2);assert.deepStrictEqual(Array.from(p.candidateIdentities).map(x=>x.mappedOutcome),['One Battle after Another','One Battle after Another']);
// 3 desktop/mobile duplicate block order does not matter and fingerprint is semantic.
const a=fixture.match(/<section data-representation="desktop">[\s\S]*?<\/section>/)[0],b=fixture.match(/<section data-representation="mobile-flat">[\s\S]*?<\/section>/)[0];
const reordered=fixture.replace(a,'__A__').replace(b,a).replace('__A__',b);const p2=ctx.erhParseAcademyCeremonyCategory_(reordered,'Best Picture',1,outcomes);assert.strictEqual(p2.winner,p.winner);assert.strictEqual(p2.fingerprint,p.fingerprint);
// 4 two genuinely different mapped nominees fail closed.
const conflicting=fixture.replace('One Battle after Another Adam Somner, Sara Murphy and Paul Thomas Anderson, Producers','Sinners Zinzi Coogler, Sev Ohanian and Ryan Coogler, Producers');
assert.throws(()=>ctx.erhParseAcademyCeremonyCategory_(conflicting,'Best Picture',1,outcomes),/conflicting mapped winners/);
// 5 one valid plus one indeterminate valid structural block fails closed.
const indeterminate=fixture.replace('One Battle after Another Adam Somner, Sara Murphy and Paul Thomas Anderson, Producers','Adam Somner, Sara Murphy and Paul Thomas Anderson, Producers');
assert.throws(()=>ctx.erhParseAcademyCeremonyCategory_(indeterminate,'Best Picture',1,outcomes),/could not map every valid/);
// Diagnostics expose only sanitized candidate identity/reason, not HTML.
try{ctx.erhParseAcademyCeremonyCategory_(conflicting,'Best Picture',1,outcomes);assert.fail('expected conflict');}catch(e){assert(e.message.includes('raw="'));assert(e.message.includes('mapped="Sinners"'));assert(!e.message.includes('<section'));}
// 6 same observation cannot advance twice.
let st=ctx.erhPolicyObservationState_({DetectedFingerprint:'',LastObservationId:'',StableCheckCount:0},p.fingerprint,'fetch-1');assert.strictEqual(st.stableCheckCount,1);st=ctx.erhPolicyObservationState_({DetectedFingerprint:p.fingerprint,LastObservationId:'fetch-1',StableCheckCount:1},p.fingerprint,'fetch-1');assert.strictEqual(st.distinct,false);assert.strictEqual(st.stableCheckCount,1);
// 7 later distinct matching observation may advance stability.
st=ctx.erhPolicyObservationState_({DetectedFingerprint:p.fingerprint,LastObservationId:'fetch-1',StableCheckCount:1},p.fingerprint,'fetch-2');assert.strictEqual(st.distinct,true);assert.strictEqual(st.stableCheckCount,2);
// Safety wiring preserved.
assert(adapter.includes('match.length!==1'));assert(adapter.includes('stats.observationId'));assert(policy.includes('REALITY_NATIVE_REVIEW_REQUIRED'));assert(policy.includes('CORROBORATION'));
console.log('external-results-academy-mapped-identity-rc20-tests: PASS');
