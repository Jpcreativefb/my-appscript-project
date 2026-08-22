'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const css = read('frontend/css/pages.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('<div class="dashboard-career-fixed-title">Career Stats</div>'),
  'Career Stats title should sit outside the collapsible details.');
assert(dashboard.includes('dashboard-career-primary dashboard-home-stats-bar'),
  'Primary Games/Wins/Top 3 row is missing.');
assert(dashboard.includes('<b>⌄</b><small>more</small>'),
  'Tiny more disclosure is missing.');
assert(css.includes('.dashboard-career-fixed-title'),
  'Fixed Career Stats title styling is missing.');
assert(css.includes('font-size: 28px'),
  'Primary career stat values were not enlarged.');
assert(css.includes('.dashboard-career-primary > span + span::before'),
  'Primary career stat white separators are missing.');
assert(css.includes('.dashboard-career-extra > span + span::before'),
  'Expanded career stat separator is missing.');
assert(css.includes('grid-template-columns: repeat(3,minmax(0,1fr))'),
  'Mobile Games/Wins/Top 3 layout should remain on one row.');
assert(app.includes('v1218d1-career-stats-cleanup'),
  'App asset marker missing v1.2.18d1.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(pwa.includes('v1218d1-career-stats-cleanup'),
  'PWA marker missing v1.2.18d1.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'),
  'Service-worker cache marker missing v1.2.18d1.');

console.log('v1.2.18d1 Home Career Stats cleanup tests passed.');
