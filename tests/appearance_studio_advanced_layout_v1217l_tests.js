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

// Responsive preview modes are first-class Studio controls.
['desktop','tablet','mobile'].forEach(device => {
  assert(manager.includes(`data-preview-device="${device}"`), `Missing ${device} preview mode`);
});
assert(manager.includes('adminAppearanceSetPreviewDevice_'));
assert(appearanceCss.includes('.preview-device-mobile'));
assert(appearanceCss.includes('.preview-device-tablet'));

// Full-image controls and placement are persisted in ThemeJSON.
['appearanceThemeImageFit','appearanceThemeImageZoom','appearanceThemeImageX','appearanceThemeImageY','appearanceThemeScoreAnchor','appearanceThemeTextOffsetX','appearanceThemeTextOffsetY'].forEach(token => assert(manager.includes(token), `Missing Studio control ${token}`));
assert(manager.includes('fit: String(adminAppearanceStudioValue_("appearanceThemeImageFit"'));
assert(picks.includes('confidence-theme-image-fit-'));
assert(picksCss.includes('.confidence-theme-image-fit-full-bleed'));
assert(picksCss.includes('object-position:var(--confidence-image-x) var(--confidence-image-y)'));

// Visibility supports master plus device-specific overrides.
assert(manager.includes('ADMIN_APPEARANCE_VISIBILITY_ELEMENTS'));
assert(manager.includes('appearanceThemeVisDesktop_'));
assert(manager.includes('appearanceThemeVisTablet_'));
assert(manager.includes('appearanceThemeVisMobile_'));
assert(picks.includes('confidence-hide-" + key + "-" + device'));
assert(picksCss.includes('@media (min-width:601px) and (max-width:900px)'));
assert(picksCss.includes('@media (max-width:600px)'));

// Result typography can independently recolor every key result font including Confidence.
['appearanceThemeCorrectTextCity','appearanceThemeCorrectTextName','appearanceThemeCorrectTextScore','appearanceThemeCorrectTextStatus','appearanceThemeCorrectTextConfidence','appearanceThemeCorrectTextLabel','appearanceThemeCorrectTextPoints','appearanceThemeIncorrectTextConfidence'].forEach(token => assert(manager.includes(token), `Missing result color control ${token}`));
assert(picks.includes('--confidence-correct-value:'));
assert(picks.includes('--confidence-wrong-value:'));
assert(picksCss.includes('.confidence-game-row.correct .confidence-row-value select'));
assert(picksCss.includes('.confidence-game-row.wrong .confidence-result-points'));

// Layer controls are represented both in preview and game runtime.
['appearanceThemeSelectedOverlayOpacity','appearanceThemeUnselectedOverlayOpacity','appearanceThemeCorrectOverlayOpacity','appearanceThemeIncorrectOverlayOpacity','appearanceThemeLiveOverlayOpacity','appearanceThemeFinalOverlayOpacity'].forEach(token => assert(manager.includes(token), `Missing overlay control ${token}`));
assert(picks.includes('--confidence-selected-overlay:'));
assert(picksCss.includes('background:var(--confidence-correct-overlay)'));

// Live/final elements are independently targetable for visibility.
assert(picks.includes('confidence-live-badge'));
assert(picks.includes('confidence-live-clock'));
assert(picks.includes('confidence-final-badge'));
assert(picks.includes('confidence-detail-moneyline'));
assert(picks.includes('confidence-detail-spread'));
assert(picks.includes('confidence-detail-over-under'));

// Force browser/PWA refresh for the advanced Studio assets.
assert(app.includes('v1217l-advanced-layout'));
assert(pwa.includes('v1217l-advanced-layout'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));
assert(html.includes('v1217l-advanced-layout'));

console.log('PASS: Appearance Studio Advanced Layout v1.2.17l');
