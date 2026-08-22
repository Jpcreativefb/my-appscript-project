const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manager = read('frontend/js/pages/adminAppearance.js');
const appearanceCss = read('frontend/css/appearance.css');
const picks = read('frontend/js/pages/picks.js');
const picksCss = read('frontend/css/picks.css');
const app = read('frontend/js/app.js');
const mirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const html = read('frontend/app.html');

assert.strictEqual(app, mirror, 'Frontend app mirrors must remain synchronized.');

// Appearance Studio is a visual editor rather than a simple theme color form.
assert(manager.includes('appearance-studio-shell'));
assert(manager.includes('Layout & Density'));
assert(manager.includes('Typography'));
assert(manager.includes('Images'));
assert(manager.includes('Selection & Results'));
assert(manager.includes('Background & Overlay'));
assert(manager.includes('Scoreboard & Confidence'));
assert(manager.includes('appearanceThemeRowHeight'));
assert(manager.includes('appearanceThemeImageSize'));
assert(manager.includes('appearanceThemeSelectedTintOpacity'));
assert(manager.includes('appearanceThemeGradientAngle'));
assert(manager.includes('appearanceThemeConfidenceStyle'));
assert(manager.includes('adminAppearanceReadThemeControls_'));

// Preview is interactive and covers the four critical Confidence states.
['pregame', 'live', 'final-win', 'final-loss'].forEach(state => {
  assert(manager.includes(`data-preview-state="${state}"`), `Missing preview state ${state}`);
});
assert(manager.includes('adminAppearanceSetPreviewState_'));
assert(manager.includes('adminAppearancePreviewEntities_'));
assert(manager.includes('Preview and live Picks page now use the same theme serializer'));

// Theme actions support the edit workflow without changing gameplay logic.
assert(manager.includes('adminAppearanceDuplicateTheme_'));
assert(manager.includes('adminAppearanceSaveThemeAsNew_'));
assert(manager.includes('adminAppearanceApplyThemeToGame_'));
assert(manager.includes('adminAppearanceResetTheme_'));
assert(manager.includes('Theme changes affect appearance only. Picks, scoring, schedules and Image Packs are untouched.'));

// Confidence runtime consumes the numeric studio controls via CSS variables.
[
  '--confidence-row-height:',
  '--confidence-row-padding:',
  '--confidence-team-gap:',
  '--confidence-value-width:',
  '--confidence-city-size:',
  '--confidence-name-size:',
  '--confidence-image-size:',
  '--confidence-selected-bg:',
  '--confidence-unselected-gray:',
  '--confidence-result-width:',
  '--confidence-gradient:',
  '--confidence-value-radius:'
].forEach(token => assert(picks.includes(token), `Missing runtime theme variable ${token}`));
assert(picks.includes('confidence-theme-image-shape-'));
assert(picks.includes('confidence-theme-background-'));
assert(picks.includes('confidence-theme-confidence-'));
assert(picks.includes('confidence-theme-live-badge-'));

// CSS maps the studio variables onto the compact weekly card.
assert(appearanceCss.includes('v1.2.17k — Appearance Studio Core'));
assert(appearanceCss.includes('.appearance-studio-preview-tabs'));
assert(appearanceCss.includes('.appearance-studio-preview-state-final-loss'));
assert(picksCss.includes('v1.2.17k — Appearance Studio runtime controls'));
assert(picksCss.includes('grid-template-columns:minmax(0,1fr) var(--confidence-versus-width) minmax(0,1fr) var(--confidence-value-width)'));
assert(picksCss.includes('filter:grayscale(var(--confidence-unselected-gray))'));
assert(picksCss.includes('.confidence-theme-confidence-outline'));

// Force iPhone/PWA and route module cache refresh for the new studio assets.
assert(app.includes('v1217k-appearance-studio'));
assert(pwa.includes('v1217k-appearance-studio'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));
assert(html.includes('picks.css?v=v1217k-appearance-studio'));

console.log('PASS: Appearance Studio Core v1.2.17k');
