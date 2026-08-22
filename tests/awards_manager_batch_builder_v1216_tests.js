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
assert(app.includes('327-question-drag-order-v1216'), 'v323 Awards batch-builder asset marker missing.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'v323 Awards batch-builder service-worker cache missing.');
console.log('PASS: Awards Manager v1.2.16 batch-builder tests');
