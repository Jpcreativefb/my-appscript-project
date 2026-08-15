const fs = require('fs');
function read(path){ return fs.readFileSync(path,'utf8'); }
function assert(ok,msg){ if(!ok){ console.error('FAIL:',msg); process.exit(1); } }
const adminAwards=read('frontend/js/pages/adminAwards.js');
const picks=read('frontend/js/pages/picks.js');
const appData=read('backend/engines/AppDataEngine.js');
const awardsEngine=read('backend/engines/AwardsManagerEngine.js');
const adminCategories=read('backend/admin/AdminCategories.js');
const normalized=read('backend/engines/NormalizedQuestionStorageEngine.js');
const app=read('frontend/js/app.js');
const sw=read('frontend/sw.js');

assert(appData.includes('realityTvView.enabled === true') && appData.includes('deferred: !!('), 'Season Survivor deferred payload must be gated to Reality TV games.');
assert(picks.includes('? "K"') && picks.includes('? "P"'), 'Player market probability labels must use K/P badges.');
assert(adminAwards.includes('Load Selected Events & Questions') && adminAwards.includes('Build All Unbuilt Questions'), 'Awards Manager must include staged multi-event batch workflow.');
assert(adminAwards.includes('adminAwardsBatchCreateSelected'), 'Awards Manager batch-create action missing.');
assert(adminAwards.includes('awardsInlineWorkspace-'), 'View Event must render an inline event workspace.');
assert(adminAwards.includes('Pick Changes') && adminAwards.includes('Unlimited until lock'), 'Awards Manager pick-change control missing.');
assert(adminAwards.includes('Default Play Type') && adminAwards.includes('Question Display'), 'Awards Manager play/display controls missing.');
assert(adminAwards.includes('Ranking (engine still in development)'), 'Ranking must be visibly marked as in development.');
assert(awardsEngine.includes('awardsManagerDecimalOddsFromProbability_'), 'Awards provider probability to wager odds conversion missing.');
assert(awardsEngine.includes('maxChangesRaw') && awardsEngine.includes('? -1'), 'Awards-created questions must default to changeable picks.');
assert(awardsEngine.includes('scoreMode: resolvedScoreMode'), 'Awards questions must inherit/use target game score mode.');
assert(adminCategories.includes('"bettingOdds"') && adminCategories.includes('payload.bettingOdds'), 'Bulk Awards answers must persist wager odds.');
assert(app.includes('324-awards-mobile-workflow-v1216'), 'Current Awards workflow asset marker missing.');
assert(sw.includes('awards-app-v324-awards-mobile-workflow-v1216'), 'Current service-worker cache marker missing.');
console.log('PASS: Awards Manager v1.2.16 workflow tests');
