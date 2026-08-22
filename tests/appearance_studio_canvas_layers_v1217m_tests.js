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

// Preview canvas can break out of the control rail and show real device widths.
assert(manager.includes('adminAppearanceToggleFullPreview_'));
assert(manager.includes('appearanceStudioFullPreviewButton'));
assert(manager.includes('Desktop · 1180px'));
assert(manager.includes('Tablet · 820px'));
assert(manager.includes('Mobile · 390px'));
assert(appearanceCss.includes('.appearance-studio-preview-only .appearance-studio-controls'));
assert(appearanceCss.includes('.appearance-preview-device-frame.preview-device-desktop { width:1180px; }'));
assert(appearanceCss.includes('.appearance-preview-device-frame.preview-device-tablet { width:820px; }'));
assert(appearanceCss.includes('.appearance-preview-device-frame.preview-device-mobile { width:390px; }'));

// Theme actions are compact and below the editor rather than occupying a third rail.
assert(manager.includes('appearance-studio-actions-bar'));
assert(appearanceCss.includes('.appearance-studio-actions-bar'));
assert(appearanceCss.includes('grid-template-columns:minmax(220px,260px) minmax(0,1fr)'));

// Images can be a true bottom layer with content above them.
assert(manager.includes('appearanceThemeImageLayer'));
assert(manager.includes('Background · Text & Score on Top') || manager.includes('Bottom Layer · Text & Score on Top'));
assert(manager.includes('appearanceThemeImageLayer'));
assert(manager.includes('full-bleed') && manager.includes('? "background"'));
assert(picks.includes('confidence-theme-image-layer-'));
assert(picksCss.includes('.confidence-theme-image-layer-background .confidence-team-visual'));
assert(picksCss.includes('position:absolute;'));

// Home and Away can have independent layout and can swap sides.
['appearanceThemeTeamOrder','appearanceThemeMirrorSides','appearanceThemeAwayTextAlign','appearanceThemeHomeTextAlign','appearanceThemeAwayScoreAnchor','appearanceThemeHomeScoreAnchor','appearanceThemeAwayImageX','appearanceThemeHomeImageX'].forEach(token => {
  assert(manager.includes(token), `Missing Home/Away control ${token}`);
});
assert(picks.includes('confidence-team-${side || "team"}'));
assert(picks.includes('confidence-theme-team-order-'));
assert(picks.includes('confidence-theme-side-layout-separate'));
assert(picksCss.includes('.confidence-theme-team-order-home-away .confidence-team-home'));
assert(picksCss.includes('.confidence-theme-away-score-anchor-bottom-right'));
assert(picksCss.includes('.confidence-theme-home-score-anchor-bottom-right'));

// Score/result overlays are independent of the image box so they remain above background art.
const renderStart = picks.indexOf('function renderCompactConfidenceTeam_');
const renderEnd = picks.indexOf('function renderCompactConfidenceRow_', renderStart);
const renderBlock = picks.slice(renderStart, renderEnd);
assert(renderBlock.includes('</span>\n      ${phase !== "pregame" && score !== "" ? `<strong class="confidence-team-score'));

// Force frontend/PWA cache rollover for the Studio canvas update.
assert(app.includes('v1217m-studio-canvas'));
assert(pwa.includes('v1217m-studio-canvas'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));
assert(html.includes('v1217m-studio-canvas'));

console.log('PASS: Appearance Studio Canvas + Layers v1.2.17m');
