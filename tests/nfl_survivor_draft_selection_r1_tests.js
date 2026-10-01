'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const rootDir=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(rootDir,'frontend/js/pages/survivorR4.js'),'utf8');
const start=source.indexOf('(function(root){\n  "use strict";\n  const MARK="NFL_SURVIVOR_WEEK_BROWSER_UI_R1"');
const end=source.indexOf('root.PATTC_NFL_SURVIVOR_WEEK_BROWSER_R1_MARKER=MARK;',start);
assert(start>=0&&end>start,'Week Browser UI block missing');
const block=source.slice(start,end)+'root.PATTC_NFL_SURVIVOR_WEEK_BROWSER_R1_MARKER=MARK;\n})(window);';

const context={
  console,
  window:{
    SURVIVOR_PAGE_STATE:{
      payload:{
        resolvedWeek:4,
        currentRound:null,
        weekRounds:[
          {week:3,pickNomineeIds:['saved-w3'],pickNomineeId:'saved-w3',requiredSelections:1,canPick:false,relation:'past',nominees:[]},
          {week:4,pickNomineeIds:[],pickNomineeId:'',requiredSelections:1,canPick:true,relation:'current',nominees:[{id:'a',eligible:true},{id:'b',eligible:true}]},
          {week:5,pickNomineeIds:['saved-w5'],pickNomineeId:'saved-w5',requiredSelections:1,canPick:true,relation:'future',nominees:[]}
        ]
      },
      selected:[]
    },
    renderSurvivorRecoveryR3WeeklyBrowser_:p=>'<section><div class="survivor-r3-browser-head"></div></section>',
    renderSurvivorRecoveryR3Finalize_:()=>'<section class="survivor-r3-finalize"></section>',
    renderSurvivorRecoveryR3Competition_:()=>'<section></section>',
    survivorRecoveryR3Refresh_:()=>{},
    survivorRecoveryR3RestoreMatchupIndex_:()=>{},
    survivorSaveCurrent_:async()=>{},
    survivorRecoveryR3OpenAutoPick_:()=>{},
    document:{querySelector:()=>null,querySelectorAll:()=>[]},
    confirm:()=>true
  },
  document:{querySelector:()=>null,querySelectorAll:()=>[]}
};
context.window.window=context.window;
context.window.document=context.window.document;
vm.createContext(context);
vm.runInContext(block,context);

const payload=context.window.SURVIVOR_PAGE_STATE.payload;

// Initial Week 4 load initializes from saved backend pick (empty).
context.window.renderSurvivorRecoveryR3WeeklyBrowser_(payload);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),[]);

// Manual draft survives same-week browser/finalize rerenders.
context.window.SURVIVOR_PAGE_STATE.selected=['a'];
context.window.renderSurvivorRecoveryR3WeeklyBrowser_(payload);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),['a']);
context.window.renderSurvivorRecoveryR3Finalize_(payload);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),['a']);

// Random Pick uses the same local selected state contract, so its draft also survives refresh.
context.window.SURVIVOR_PAGE_STATE.selected=['b'];
context.window.renderSurvivorRecoveryR3WeeklyBrowser_(payload);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),['b']);

// Changing weeks intentionally reloads that week's saved pick.
context.window.survivorRecoveryR5ChooseWeek_(5);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),['saved-w5']);

// Returning to Week 4 reloads Week 4's saved pick; no draft leaks across weeks.
context.window.survivorRecoveryR5ChooseWeek_(4);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),[]);

// Saved picks still initialize correctly for another week.
context.window.survivorRecoveryR5ChooseWeek_(3);
assert.deepStrictEqual(Array.from(context.window.SURVIVOR_PAGE_STATE.selected),['saved-w3']);

// Static contracts: same-week rerender does not overwrite selected from pickNomineeIds.
assert(source.includes('let selectionWeek=0'));
assert(source.includes('const weekChanged=!selectionWeek||Number(selectionWeek)!==targetWeek'));
assert(source.includes('if(weekChanged){'));
assert(source.includes('root.SURVIVOR_PAGE_STATE.selected=savedSelection(round)'));
assert(!source.includes('root.SURVIVOR_PAGE_STATE.selected=Array.isArray(round.pickNomineeIds)?round.pickNomineeIds.slice()'));

// No autosave was introduced.
const weekBlock=source.slice(source.indexOf('NFL_SURVIVOR_WEEK_BROWSER_UI_R1'),source.indexOf('root.PATTC_NFL_SURVIVOR_WEEK_BROWSER_R1_MARKER=MARK;'));
assert(!weekBlock.includes('apiSaveSurvivorPick({') || weekBlock.includes('survivorRecoveryR5ClearPick_'),'Week browser may only save through existing explicit Clear/Finalize actions');

console.log('NFL Survivor Draft Selection R1 tests: PASS');
