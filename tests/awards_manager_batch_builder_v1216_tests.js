const fs = require('fs');
function read(path){ return fs.readFileSync(path,'utf8'); }
function assert(ok,msg){ if(!ok){ console.error('FAIL:',msg); process.exit(1); } }
const adminAwards=read('frontend/js/pages/adminAwards.js');
const awardsEngine=read('backend/engines/AwardsManagerEngine.js');
const picks=read('frontend/js/pages/picks.js');
const app=read('frontend/js/app.js');
const sw=read('frontend/sw.js');

assert(adminAwards.includes('1. Game & Default Settings'), 'Section 1 game/source setup missing.');
assert(adminAwards.includes('Official Website URL'), 'Official Website must be in Section 1.');
assert(adminAwards.includes('Show Market Odds to Players'), 'Game-level probability display control missing.');
assert(adminAwards.includes('Question Display') && adminAwards.includes('Text') && adminAwards.includes('Compact') && adminAwards.includes('Image'), 'Text/Compact/Image display choices missing.');
assert(adminAwards.includes('Pick Changes') && adminAwards.includes('Unlimited until lock'), 'Number-of-changes control missing.');
assert(adminAwards.includes('Check All Results') && adminAwards.includes('Load Selected Events & Questions'), 'Multi-event select/load controls missing.');
assert(adminAwards.includes('Question Order') && adminAwards.includes('Default Section') && adminAwards.includes('Default Points'), 'Question grid configuration controls missing.');
assert(adminAwards.includes('Markets / Answers') && adminAwards.includes('Show Odds') && adminAwards.includes('Include All'), 'Market-grid popup controls missing.');
assert(adminAwards.includes("adminAwardsToggleBatchAnswer_") && adminAwards.includes("'include'") && adminAwards.includes("'showProbability'"), 'Individual answer include/probability switches missing.');
assert(adminAwards.includes('selectedOutcomesJSON') && adminAwards.includes('groupMarketsJSON'), 'Batch builder must support both outcome and grouped-market selection.');
assert(awardsEngine.includes('layoutType: layoutType') && awardsEngine.includes('displayOrder: displayOrder'), 'Awards backend must persist display/order fields.');
assert(awardsEngine.includes('showMarketProbabilities: showMarketProbabilities'), 'Awards backend must persist question probability visibility.');
assert(awardsEngine.includes('probabilityDisplayByNomineeId'), 'Awards backend must persist per-answer probability visibility.');
assert(awardsEngine.includes('selectedOutcomesJSON'), 'Awards backend must honor selected single-market outcomes.');
assert(picks.includes('sourceConfig.showMarketProbabilities === false'), 'Player picks must hide question-level market probabilities.');
assert(picks.includes('probabilityDisplayByNomineeId') && picks.includes('perAnswer[nomineeId] === false'), 'Player picks must hide answer-level probabilities.');
assert(app.includes('326-question-position-controls-v1216'), 'v323 Awards batch-builder asset marker missing.');
assert(sw.includes('awards-app-v326-question-position-controls-v1216'), 'v323 Awards batch-builder service-worker cache missing.');
console.log('PASS: Awards Manager v1.2.16 batch-builder tests');
