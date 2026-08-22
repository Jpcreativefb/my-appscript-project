const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

// Confidence review/sort contract.
assert(picks.includes('function setConfidenceSortMode_'));
assert(picks.includes('function buildConfidenceSortOrder_'));
assert(picks.includes('function getCompactConfidenceDisplayCategories_'));
assert(picks.includes('PICKS_CONFIDENCE_SORT_STALE = true'));
assert(picks.includes('Re-sort Confidence'));
assert(picks.includes('Game Time'));
assert(picks.includes('Confidence ↓'));

// Live scoreboard contract.
assert(picks.includes('function refreshConfidenceLiveSports_'));
assert(picks.includes('function fetchConfidenceLiveScores_'));
assert(picks.includes('PICKS_CONFIDENCE_LIVE_REFRESH_MS = 30000'));
assert(picks.includes('category.sportsClock'));
assert(picks.includes('category.sportsPeriod'));
assert(picks.includes('confidence-team-score'));
assert(picks.includes('getConfidenceLiveResult_'));
assert(picks.includes('confidenceResultPointsLabel_'));

// Details load odds only when a row is expanded.
assert(picks.includes('function toggleConfidenceDetails_'));
assert(picks.includes('function loadConfidenceOdds_'));
assert(picks.includes('getSportsOdds'));
assert(picks.includes('Odds · Records · Favorite'));
assert(picks.includes('confidenceFavoriteName_'));

// Draft picks remain client-side; live refresh updates category data, not baseline/draft maps.
const liveFnStart = picks.indexOf('async function refreshConfidenceLiveSports_');
const liveFnEnd = picks.indexOf('function mountConfidenceLiveSports_', liveFnStart);
const liveFn = picks.slice(liveFnStart, liveFnEnd);
assert(!liveFn.includes('PICKS_CONFIDENCE_BASELINE_PICKS'));
assert(!liveFn.includes('PICKS_PAGE_DATA.picks ='));

// Styling contract for final results and expanded info.
assert(css.includes('.confidence-team-choice.not-selected.actual-winner'));
assert(css.includes('.confidence-result-points.correct'));
assert(css.includes('.confidence-result-points.wrong'));
assert(css.includes('.confidence-game-details'));
assert(css.includes('.confidence-toolbar-sort button.stale'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

console.log('confidence live review v1.2.17b tests passed');
