const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manager = read('frontend/js/pages/adminAppearance.js');
const picks = read('frontend/js/pages/picks.js');
const shared = read('frontend/js/appearanceThemeRuntime.js');
const css = read('frontend/css/appearance.css');
const picksCss = read('frontend/css/picks.css');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Visibility matrix can reach Mobile column instead of being clipped by the control rail.
assert(css.includes('.appearance-studio-visibility-panel{overflow-x:auto'));
assert(css.includes('.appearance-visibility-matrix{min-width:360px'));

// Page/header/bar and question gradients.
['appearanceThemePageBgMode','appearanceThemeHeaderBgMode','appearanceThemeSortBgMode','appearanceThemeSaveBgMode',
 'appearanceThemeQuestionCardMode','appearanceThemeQuestionHeaderMode','appearanceThemeAnswerMode','appearanceThemeAnswerSelectedMode']
 .forEach(id => assert(manager.includes(id), `missing ${id}`));
assert(shared.includes('picks-theme-page-bg-'));
assert(shared.includes('--picks-theme-question-gradient:linear-gradient'));
assert(picksCss.includes('.picks-theme-question-bg-gradient'));

// Image questions now have positioning/zoom and a configurable overlay layer.
['appearanceThemeQuestionImageZoom','appearanceThemeQuestionImageX','appearanceThemeQuestionImageY','appearanceThemeQuestionImageOpacity',
 'appearanceThemeQuestionImageOverlayMode','appearanceThemeQuestionImageOverlayColor','appearanceThemeQuestionImageOverlayPlacement']
 .forEach(id => assert(manager.includes(id), `missing ${id}`));
assert(shared.includes('--picks-theme-image-zoom:'));
assert(picksCss.includes('object-position:var(--picks-theme-image-x'));

// Team text readability overlay lives between full-button artwork and team lettering.
assert(manager.includes('Team Text Readability Overlay'));
assert(manager.includes('appearanceThemeTextBackdropEnabled'));
assert(shared.includes('confidence-theme-text-backdrop'));
assert(picksCss.includes('.confidence-theme-text-backdrop .confidence-team-text'));

// Winner overlays / decorations apply to matchup and regular question winners.
assert(manager.includes('Winner Overlay / Decoration'));
['trophy','crown','medal','star','check'].forEach(item => assert(manager.includes(`["${item}"`)));
assert(picks.includes('confidence-winner-decoration'));
assert(picksCss.includes('confidence-theme-winner-decoration-trophy'));
assert(picksCss.includes('.pick-category-card.correct .nominee-choice.selected::after'));

// Confidence width is serialized through the shared runtime and mobile no longer hard-caps it to 64/76px.
assert(shared.includes('"--confidence-value-width:" + confidenceWidth + "px"'));
assert(picksCss.includes('minmax(44px,var(--confidence-value-width))!important'));

// Save/apply controls provide visible confirmation.
assert(manager.includes('appearanceThemeSaveButton'));
assert(manager.includes('Saved ✓'));
assert(manager.includes('Applied ✓'));
assert(manager.includes('adminAppearanceSetThemeActionState_'));

// Presets and no base-game flash while appearance resolves.
['basic','simple','advanced','mobile'].forEach(preset => assert(manager.includes(`adminAppearanceApplyPreset_('${preset}')`)));
assert(picks.includes('picks-appearance-loading'));
assert(picksCss.includes('Loading game style…'));

// All page theme classes from the shared serializer are applied to the live page, not only image overlay.
assert(picks.includes('if (name.indexOf("picks-theme-") === 0) page.classList.remove(name)'));
assert(picks.includes('page.classList.add(name)'));

assert(html.includes('v1217t-studio-refinement'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));
console.log('PASS appearance_studio_refinement_v1217t_tests');
