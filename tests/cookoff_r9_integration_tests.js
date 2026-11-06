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
// Palette editor R1: custom paper-matching HEX colors and legacy labels coexist.
assert.deepStrictEqual(Array.from(ctx.votingCompetitionColorPalette_(['Red','#E87924','#e87924','NotAColor'])), ['Red','#E87924']);
const customized = Object.assign({},settings,{entryIdentifierMode:'color',entryColorPalette:['#E87924','#1D72B8']});
const customFirst = ctx.votingCompetitionAssignIdentity_(customized,[]);
assert(/^#[0-9a-f]{6}$/i.test(customFirst.displayColor),'A custom paper color is assigned');
assert.strictEqual(ctx.votingCompetitionAssignIdentity_(customized,[customFirst]).displayColor.toLowerCase(),
  (customFirst.displayColor.toLowerCase()==='#e87924'?'#1d72b8':'#e87924'));
const legacyCustom = Object.assign({},settings,{entryIdentifierMode:'legacy',entryColorPalette:['#E87924']});
assert.strictEqual(ctx.votingCompetitionAssignIdentity_(legacyCustom,[]).displayColor,'#E87924');
const categoriesWithHelp = ctx.votingCompetitionEntryCategories_([
  {id:'overall',label:'Best Overall',description:'Consider flavor and texture.',defaultSelected:true,audience:'public'},
  {id:'heat',label:'Bring the HEAT!',description:'Choose the most balanced heat.',defaultSelected:false,audience:'both'}
]);
assert.strictEqual(categoriesWithHelp[0].description,'Consider flavor and texture.');
assert.strictEqual(categoriesWithHelp[1].id,'heat');
assert.strictEqual(categoriesWithHelp[1].defaultSelected,false);
assert(page.includes('cookoff-category-description'),'Voter page displays the active category description');
assert(admin.includes('adminVotingPaletteEditor_')&&admin.includes('adminVotingAwardEditor_'),'Admin palette and award editors render');
assert(admin.includes('adminVotingCollectAwardCategories_()'),'Admin saves descriptions with category identities');
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
ctx.getGameRuntimeConfig = () => ({type:'voting'});
ctx.votingCompetitionReadParticipants_ = () => [{
  entryId:'dish', entryName:'Sample chili', description:'Mild', ingredients:'Beans',
  username:'private-account', participantName:'Private Person', rowNumber:2,
  status:'approved', published:true, customData:{_cookoffSubmissionId:'private-token'}
}];
ctx.votingCompetitionReadBallots_ = () => [];
const dashboard = ctx.adminGetVotingCompetitionDashboard_({gameId:'cookoff'});
assert.strictEqual(dashboard.participants[0].description, 'Mild');
assert.strictEqual(dashboard.results[0].entryName, 'Sample chili');
assert(!/private-account|Private Person|private-token|rowNumber/.test(JSON.stringify(dashboard)));
console.log('cookoff-r9-integration-tests: PASS');
