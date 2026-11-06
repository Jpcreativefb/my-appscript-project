const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'backend/engines/VotingCompetitionEngine.js'),'utf8');
const page=fs.readFileSync(path.join(root,'frontend/js/pages/voting.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'frontend/js/pages/adminGameSetup.js'),'utf8');
const ctx={console,Math,Date,JSON,Number,String,Object,Array,Boolean,RegExp,Set,parseInt,parseFloat,isFinite};
vm.createContext(ctx);
vm.runInContext(engine,ctx);
const settings=Object.assign({},ctx.votingCompetitionDefaultSettings_('cookoff-r9'),{
  entryIdentifierMode:'color',entryColorPalette:['Red','Blue'],allowMultipleEntries:true,
  maxEntriesPerParticipant:0,entryCategories:[
    {id:'overall',label:'Best Overall',defaultSelected:true,audience:'both'},
    {id:'creative',label:'Most Creative',defaultSelected:true,audience:'public'},
    {id:'heat',label:'Bring the HEAT!',defaultSelected:true,audience:'judges'}
  ],officialJudges:['judge1'],judgeMultiplier:3
});
assert.strictEqual(ctx.votingCompetitionRegistrationOpen_(settings),true);
const first=ctx.votingCompetitionAssignIdentity_(settings,[]);
const second=ctx.votingCompetitionAssignIdentity_(settings,[first]);
assert.notStrictEqual(first.displayColor,second.displayColor,'Duplicate colors must not be assigned');
assert.throws(()=>ctx.votingCompetitionAssignIdentity_(settings,[first,second]),/colors are assigned/);
const combo=Object.assign({},settings,{entryIdentifierMode:'combo',entryColorPalette:['Red']});
const c1=ctx.votingCompetitionAssignIdentity_(combo,[]);
const c2=ctx.votingCompetitionAssignIdentity_(combo,[c1]);
assert.notStrictEqual(c1.displayColor+'|'+c1.displayNumber,c2.displayColor+'|'+c2.displayNumber);
const nums=Object.assign({},settings,{entryIdentifierMode:'number'});
const n1=ctx.votingCompetitionAssignIdentity_(nums,[]);
const n2=ctx.votingCompetitionAssignIdentity_(nums,[n1]);
assert.notStrictEqual(n1.displayNumber,n2.displayNumber);
assert.strictEqual(ctx.votingCompetitionJudgeRole_(settings,'judge1','overall').multiplier,3);
assert.strictEqual(ctx.votingCompetitionJudgeRole_(settings,'judge1','creative').multiplier,1);
assert.throws(()=>ctx.votingCompetitionJudgeRole_(settings,'public1','heat'),/appointed judges/);
assert.strictEqual(ctx.votingCompetitionJudgeRole_(settings,'judge1','heat').multiplier,3);
assert.strictEqual(ctx.votingCompetitionEntryCategories_([
 {label:'Best Overall',audience:'both',defaultSelected:true},
 {label:'Bring the HEAT!',audience:'judges',defaultSelected:true}
]).length,2);
const dishes=[
 {entryId:'a',customData:{cookoffCategoryIds:['overall']}},
 {entryId:'b',customData:{cookoffCategoryIds:['overall','heat']}},
 {entryId:'c',customData:{cookoffCategoryIds:[]}},
 {entryId:'legacy',customData:{}}
];
assert.deepStrictEqual(Array.from(ctx.votingCompetitionEntriesForCategory_(dishes,'heat'),e=>e.entryId),['b','legacy']);
assert.deepStrictEqual(Array.from(ctx.votingCompetitionEntriesForCategory_(dishes,'overall'),e=>e.entryId),['a','b','legacy']);
assert.throws(()=>ctx.votingCompetitionCategoryId_(settings,'unknown'),/category/);
assert.strictEqual(ctx.votingCompetitionCategoryId_(settings,'overall'),'overall');
const past=Object.assign({},settings,{registrationDeadline:'2020-01-01T00:00:00Z'});
assert.strictEqual(ctx.votingCompetitionRegistrationOpen_(past),false);
assert(page.includes('votingPageOwnEntriesHtml_')&&page.includes('votingPageDirectRank_'));
assert(page.includes('votingPageCategorySelector_')&&page.includes('categoryId: votingPageActiveCategoryId_'));
assert(admin.includes('adminVotingEntryIdentifierMode')&&admin.includes('adminVotingOfficialJudges'));
const rankedDishes = [
  {entryId:'a',username:'Contestant'},
  {entryId:'b',username:'contestant'},
  {entryId:'c',username:'other'}
];
const selfRank = rankings => ctx.votingCompetitionSelfRankEntries_(rankedDishes, rankings, 'contestant', false);
assert.deepStrictEqual(Array.from(selfRank([{entryId:'b',rank:1},{entryId:'c',rank:2}]), e => e.entryId), ['b','c']);
assert.throws(() => selfRank([{entryId:'a',rank:1},{entryId:'b',rank:2}]), /lock at #1/);
assert.throws(() => selfRank([{entryId:'c',rank:1},{entryId:'b',rank:2}]), /lock at #1/);
assert.deepStrictEqual(Array.from(ctx.votingCompetitionEntryDivisions_(['Chili','Dessert','chili',''])), ['Chili','Dessert']);
// Criteria drafts deliberately contain no ranks. Deadline finalization must
// still pass them to the same server-side scoring path as manual submission.
const deadlineSettings = Object.assign({}, settings, {
  autoFinalizeDrafts: true,
  votingDeadline: '2020-01-01T00:00:00Z'
});
ctx.votingCompetitionReadDrafts_ = () => [
  { gameId: 'criteria', username: 'voter', categoryId: 'overall', rankings: [] },
  { gameId: 'rank', username: 'voter', categoryId: 'overall', rankings: [] }
];
ctx.votingCompetitionGetSettings_ = gameId => Object.assign({}, deadlineSettings, {
  judgingMode: gameId
});
const finalizedDrafts = [];
ctx.votingCompetitionSaveBallot_ = (payload, options) => {
  assert.strictEqual(options.serverDeadlineFinalization, true);
  finalizedDrafts.push(payload.gameId);
};
const finalization = ctx.votingCompetitionFinalizeDueDrafts_();
assert.deepStrictEqual(finalizedDrafts, ['criteria']);
assert.strictEqual(finalization.finalized, 1);
assert.strictEqual(finalization.skipped, 1);
console.log('cookoff-r9-integration-tests: PASS');
