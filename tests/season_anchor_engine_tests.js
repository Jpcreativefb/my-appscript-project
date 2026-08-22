const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/SeasonAnchorEngine.js'), 'utf8');
const reality = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const questionPack = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const scoring = fs.readFileSync(path.join(root, 'backend/engines/ScoringEngine.js'), 'utf8');
const appData = fs.readFileSync(path.join(root, 'backend/engines/AppDataEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const leaderboard = fs.readFileSync(path.join(root, 'frontend/js/pages/leaderboard.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

['SeasonAnchorSettings', 'UserSeasonAnchors', 'SeasonAnchorHistory'].forEach(name => {
  assert(engine.includes(name), `Missing normalized Season Anchor sheet ${name}`);
});

[
  'apiAdminSaveSeasonAnchorSettings',
  'apiGetSeasonAnchor',
  'apiSaveSeasonAnchorPick',
  'seasonAnchorSettleRealityEpisode_',
  'seasonAnchorRecalculateEpisodeScores_',
  'seasonAnchorAdjustmentsForGame_'
].forEach(name => assert(engine.includes(`function ${name}`), `Missing ${name}`));

assert(api.includes('"adminSaveSeasonAnchorSettings"'), 'Admin settings API action is missing');
assert(api.includes('action === "getSeasonAnchor"'), 'User Season Anchor read action is missing');
assert(api.includes('action === "saveSeasonAnchorPick"'), 'User Season Anchor save action is missing');
assert(frontendApi.includes('apiSaveSeasonAnchorPick'), 'Frontend user save API wrapper is missing');
assert(frontendApi.includes('apiAdminSaveSeasonAnchorSettings'), 'Frontend admin settings API wrapper is missing');

assert(reality.includes('seasonAnchorSaveSettings_'), 'Reality TV season creation does not save anchor settings');
assert(reality.includes('seasonAnchorSettleRealityEpisode_'), 'Reality TV elimination approval does not settle anchor picks');
assert(questionPack.includes('seasonAnchorRecalculateEpisodeScores_'), 'Supplemental question settlement does not refresh anchor bonus');
assert(appData.includes('seasonAnchorUserPayload_'), 'Picks startup payload is missing Season Anchor data');
assert(scoring.includes('seasonAnchorAdjustmentsForGame_'), 'Leaderboard does not include Season Anchor adjustments');
assert(scoring.includes('seasonAnchorBonus'), 'Leaderboard Season Anchor fields are missing');

[
  'Starting multiplier',
  'Growth per survival',
  'Maximum multiplier cap',
  'Weekly eligible-points cap',
  'Loss penalty',
  'Save Survivor Settings'
].forEach(text => assert(admin.includes(text), `Admin control missing: ${text}`));

assert(picks.includes('renderSeasonAnchorPickCard_'), 'Picks page Season Survivor card is missing');
assert(picks.includes('Finalize Pick'), 'User finalize button is missing');
assert(picks.includes('Maximum weekly bonus'), 'User bonus guardrail is missing');
assert(leaderboard.includes('Survivor Adjustment'), 'Leaderboard Survivor adjustment details are missing');
assert(css.includes('.season-anchor-card'), 'Season Survivor user styling is missing');
assert(css.includes('.reality-tv-anchor-preview'), 'Season Survivor admin preview styling is missing');
assert(html.includes('v275-season-survivor-pick'), 'Frontend cache-busting version is missing');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service worker cache bump is missing');

assert(engine.includes('Math.min(settings.MaxMultiplier'), 'Multiplier cap enforcement is missing');
assert(engine.includes('settings.EligiblePointsCap'), 'Eligible points cap enforcement is missing');
assert(engine.includes('settings.LossPenalty'), 'Loss penalty application is missing');
assert(engine.includes('outcome = "PRESERVED"'), 'No-elimination preserve behavior is missing');
assert(engine.includes('status = "NEEDS_PICK"'), 'Replacement selection state is missing');

console.log('Season Anchor Engine tests passed.');
