const assert = require('assert');
const fs = require('fs');

const manager = fs.readFileSync('frontend/js/pages/adminAppearance.js', 'utf8');
const engine = fs.readFileSync('backend/engines/AppearanceEngine.js', 'utf8');
const sw = fs.readFileSync('frontend/sw.js', 'utf8');
const pwa = fs.readFileSync('frontend/js/pwa.js', 'utf8');

// Newly created packs must be visible immediately in both editor and game assignment selectors.
assert(manager.includes('pendingGameImagePackId'));
assert(manager.includes('pendingImagePackRow'));
assert(manager.includes('newly created'));
assert(manager.includes('has not been applied to the game yet'));
assert(manager.includes('ADMIN_APPEARANCE_STATE.pendingGameImagePackId || assignment.ImagePackId || currentPack'));

// The server-confirmation pass retries rather than silently losing a just-created pack.
assert(manager.includes('for (let attempt = 0; attempt < 4; attempt++)'));
assert(manager.includes('setTimeout(resolve, 250 * (attempt + 1))'));
assert(manager.includes('The pack is visible locally, but the server list has not confirmed it yet'));

// Save/duplicate flush the spreadsheet and return the actual persisted pack row.
assert(engine.includes('SpreadsheetApp.flush();'));
assert(engine.includes('return { success: true, packId: packId, pack: savedPack }'));
assert(engine.includes('copiedItems: items.length, sourcePackId: sourcePackId, pack: savedPack'));

// New frontend bundle must evict stale pack-management code on mobile/PWA.
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));
assert(pwa.includes('v1217y-pack-visibility'));

console.log('PASS appearance pack visibility v1.2.17y');
