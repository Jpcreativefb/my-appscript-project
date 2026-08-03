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
assert(picks.includes('Save Survivor Pick'), 'User save button is missing');
assert(picks.includes('Maximum weekly bonus'), 'User bonus guardrail is missing');
assert(leaderboard.includes('Survivor Adjustment'), 'Leaderboard Survivor adjustment details are missing');
assert(css.includes('.season-anchor-card'), 'Season Survivor user styling is missing');
assert(css.includes('.reality-tv-anchor-preview'), 'Season Survivor admin preview styling is missing');
assert(html.includes('v275-season-survivor-pick'), 'Frontend cache-busting version is missing');
assert(sw.includes('v275-season-survivor-pick'), 'Service worker cache bump is missing');

assert(engine.includes('Math.min(settings.MaxMultiplier'), 'Multiplier cap enforcement is missing');
assert(engine.includes('settings.EligiblePointsCap'), 'Eligible points cap enforcement is missing');
assert(engine.includes('settings.LossPenalty'), 'Loss penalty application is missing');
assert(engine.includes('outcome = "PRESERVED"'), 'No-elimination preserve behavior is missing');
assert(engine.includes('status = "NEEDS_PICK"'), 'Replacement selection state is missing');

console.log('Season Anchor Engine tests passed.');
