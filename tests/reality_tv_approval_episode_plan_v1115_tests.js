const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const questions = fs.readFileSync(path.join(root, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const clientCompat = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

assert(season.includes('function apiAdminResetRealityTvApproval'), 'Stage-aware approval reset backend is missing');
assert(season.includes('existingNext || realityTvString_(queue.NextEpisodeId)'), 'Approval reset must detect an already-created next episode');
assert(season.includes('const isPush = outcomeType === "no-elimination";'), 'Only no-elimination should push the main question');
assert(season.includes('winnerIds.forEach(function(id)'), 'Multiple eliminated contestants must be stored as winners');
assert(season.includes('realityTvBool_(freshSeason.AutoCreateNextEpisode)'), 'Automatic next-episode creation must remain enabled');
assert(season.includes('realityTvQuestionTemplatesForSeason_(season.SeasonId)'), 'Next episode must inherit enabled season question templates');

assert(questions.includes('function apiAdminApplyRealityTvEpisodeQuestionPlan'), 'This-episode-only question plan backend is missing');
assert(questions.includes('Future episode defaults were not changed'), 'Episode override response must state that defaults are preserved');
assert(questions.includes('Enabled: !realityTvBool_(payload.episodeOnly)'), 'One-time custom questions must stay disabled for future episodes');
assert(questions.includes('realityTvDeleteEpisodeQuestionForPlan_'), 'Safe one-episode question removal is missing');

['adminResetRealityTvApproval', 'adminApplyRealityTvEpisodeQuestionPlan'].forEach(action => {
  assert(api.includes(`"${action}"`), `Backend API action missing: ${action}`);
  assert(client.includes(action), `Frontend API wrapper missing: ${action}`);
});
assert.strictEqual(client, clientCompat, 'Both frontend API copies must match');

assert(ui.includes('Reset Stuck Approval'), 'Approval reset button is missing');
assert(ui.includes('Update This Episode Only'), 'One-episode Extra Question button is missing');
assert(ui.includes('each is a winner'), 'Multiple elimination UI must explain winner scoring');
assert(ui.includes('This episode only — do not enable for future episodes'), 'One-time custom-question option is missing');

assert(app.includes('v1115-reality-tv-approval-episode-plan'), 'New route cache key is missing');
assert.strictEqual(app, appCompat, 'Both app loader copies must match');
assert(html.includes('hotfix=v1115-reality-tv-approval-episode-plan'), 'App shell cache key is missing');

console.log('Reality TV approval reset and episode question plan v1.1.15 tests passed.');
