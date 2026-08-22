const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manager = fs.readFileSync(path.join(root, 'frontend/js/pages/adminAppearance.js'), 'utf8');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const appHtml = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const appearanceCss = fs.readFileSync(path.join(root, 'frontend/css/appearance.css'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'backend/engines/AppearanceEngine.js'), 'utf8');

// Admin route and page are wired.
assert(app.includes('"admin-appearance": ["admin", "adminUi", "adminAppearance"]'));
assert(app.includes('case "admin-appearance"'));
assert(appHtml.includes('./css/appearance.css'));
assert(sw.includes('./js/pages/adminAppearance.js'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

// Manager supports pack creation, pack items, game assignments, theme editing and per-game overrides.
assert(manager.includes('function adminAppearanceCreatePack_'));
assert(manager.includes('function adminAppearanceUploadPackImage_'));
assert(manager.includes('function adminAppearanceSaveGameAssignment_'));
assert(manager.includes('function adminAppearanceSaveTheme_'));
assert(manager.includes('function adminAppearanceSaveOverride_'));
assert(manager.includes('Image priority: Game override → Image Pack → existing game image'));
assert(manager.includes('NFL Helmets 2026'));

// API client exposes all foundation routes.
[
  'apiAdminSetupAppearanceSystem',
  'apiAdminGetAppearanceDashboard',
  'apiAdminSaveAppearanceImagePack',
  'apiAdminSaveAppearanceImagePackItem',
  'apiAdminSaveAppearanceThemePack',
  'apiAdminSaveGameAppearance',
  'apiAdminSaveAppearanceOverride',
  'apiGetGameAppearance'
].forEach(name => assert(api.includes('function ' + name), 'Missing client helper ' + name));

// Confidence consumes runtime image packs/themes without changing pick logic.
assert(picks.includes('function hydrateConfidenceAppearance_'));
assert(picks.includes('function confidenceAppearanceResolvedImage_'));
assert(picks.includes('function confidenceThemePresentation_'));
assert(picks.includes('appearanceImage.imageUrl'));
assert(picks.includes('hydrateConfidenceAppearance_();'));
assert(css.includes('--confidence-theme-correct'));
assert(css.includes('.confidence-theme-unselected-grayscale'));

// Theme pack now carries editable semantic colors and manager CSS exists.
assert(engine.includes('colors: {'));
assert(engine.includes('correct: "#22c55e"'));
assert(appearanceCss.includes('.appearance-theme-preview'));
assert(appearanceCss.includes('.appearance-entity-card'));

console.log('appearance manager + confidence integration v1.2.17d tests passed');
