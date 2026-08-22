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

assert(shared.includes('Shared Appearance Theme Runtime'));
assert(shared.includes('confidencePresentation'));
assert(shared.includes('pagePresentation'));
assert(picks.includes('window.AppearanceThemeRuntime.confidencePresentation(theme)'));
assert(picks.includes('window.AppearanceThemeRuntime.pagePresentation(theme)'));
assert(manager.includes('appearanceRuntimeMatchupPreview'));
assert(manager.includes('appearancePagePreviewShell'));
assert(manager.includes('window.AppearanceThemeRuntime.confidencePresentation(theme)'));
assert(manager.includes('window.AppearanceThemeRuntime.pagePresentation(theme)'));
['matchup','text','compact','image','list','short-answer','wager'].forEach(surface => {
  assert(manager.includes(`data-preview-surface="${surface}"`), `missing ${surface} preview tab`);
});
['text','compact','image','list','short-answer','wager'].forEach(surface => {
  assert(manager.includes(`questionCard('${surface}'`), `missing ${surface} preview surface`);
});
assert(manager.includes('data-question-preview="matchup"'), 'missing matchup preview surface');
assert(manager.includes('event.target.id === "appearanceThemeQuestionDefault"'));
assert(css.includes('Studio preview uses the same page/card markup and theme CSS as runtime'));
assert(css.includes('[data-preview-surface="short-answer"]'));
assert(picksCss.includes('picks-theme-image-text-overlay'));
assert(picks.includes('String(presentation.className || "").split(/\\s+/).filter(Boolean)'));
assert(picks.includes('if (name.indexOf("picks-theme-") === 0) page.classList.remove(name)'));
assert(html.includes('appearanceThemeRuntime.js?v=v1217s-preview-runtime-sync'));
assert(sw.includes('./js/appearanceThemeRuntime.js'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));
console.log('PASS appearance_studio_preview_runtime_sync_v1217s_tests');
