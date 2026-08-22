const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const ui = read('frontend/js/pages/adminUi.js');
const css = read('frontend/css/styles.css');
const app = read('frontend/js/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Auto-help no longer manufactures vague descriptions for unknown controls.
assert(ui.includes('return "";'));
assert(!ui.includes('Review the value before saving because it can affect future application behavior.'));
assert(!ui.includes('return "Controls " + labelText'));

// Exact descriptions prevent broad words such as Status/Layout from hijacking unrelated Studio fields.
assert(ui.includes('"status alignment":'));
assert(ui.includes('"game default question layout":'));
assert(ui.includes('"image canvas mode":'));
assert(ui.includes('"scoreboard background":'));
assert(ui.includes('"question area designer":'));

// Existing label title nodes are reused and legacy duplicate auto-labels are repaired.
assert(ui.includes('function adminUiFindTitleHost_'));
assert(ui.includes('function adminUiRemoveDuplicateTitleNodes_'));
assert(ui.includes('function adminUiRepairLegacyDuplicateLabels_'));
assert(ui.includes('host.classList.add("admin-field-label-auto-host")'));
assert(css.includes('.admin-field-label-auto-host'));

// Section help is only added when useful help text exists.
assert(ui.includes('if (!help) return;'));

// Cache marker forces the repaired shared admin module to load on all admin routes.
assert(app.includes('v1217u-admin-help'));
assert(html.includes('v1217u-admin-help'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

console.log('PASS admin_help_quality_v1217u_tests');
