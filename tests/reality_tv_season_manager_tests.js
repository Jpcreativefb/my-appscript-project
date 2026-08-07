const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

[
  'RealitySeasons',
  'RealityContestants',
  'RealityEpisodes',
  'RealityResultQueue'
].forEach(name => assert(engine.includes(name), `Missing normalized sheet ${name}`));

[
  'apiAdminSetupRealityTvSystem',
  'apiAdminConfigureRealityTvHub',
  'apiAdminGetRealityTvDashboard',
  'apiAdminCreateRealityTvSeason',
  'apiAdminBulkAddRealityTvContestants',
  'apiAdminSubmitRealityTvResult',
  'apiAdminApproveRealityTvResult',
  'apiAdminContinueRealityTvApproval',
  'apiAdminResetRealityTvApproval',
  'apiAdminRejectRealityTvResult',
  'apiAdminCreateNextRealityTvEpisode'
].forEach(name => {
  assert(engine.includes(`function ${name}`), `Missing backend function ${name}`);
  assert(api.includes(`"${name.replace(/^apiAdmin/, 'admin')}"`), `Missing API action ${name}`);
});

assert(engine.includes('requireAdminReview: true'), 'Episode questions must require administrator review');
assert(engine.includes('autoSettle: false'), 'Episode questions must not auto settle');
assert(engine.includes('realityTvCreateEpisode_'), 'Automatic episode creation is missing');
assert(engine.includes('NextEpisodeCreated'), 'Duplicate next-episode guard metadata is missing');
assert(engine.includes('manual-reality-tv'), 'Manual Reality TV provider is missing');
assert(engine.includes('realityTvSyncEpisodeToHub_'), 'External Results Hub mirroring is missing');
assert(engine.includes('ReviewStatus: "PENDING"'), 'Pending review state is missing');
assert(engine.includes('ApprovalStage'), 'Staged approval metadata is missing');
assert(engine.includes('BUILD_NEXT'), 'Next-episode approval stage is missing');
assert(engine.includes('SYNC_HUB'), 'Hub sync approval stage is missing');

assert(page.includes('Create Season &amp; Episode 1'), 'Season creation UI is missing');
assert(page.includes('Approve All &amp; Finalize Episode'), 'One-click episode finalization UI is missing');
assert(page.includes('Resume Approval'), 'Retry-safe approval UI is missing');
assert(page.includes('Reset Stuck Approval'), 'Stuck approval reset UI is missing');
assert(page.includes('Update This Episode Only'), 'Episode-only Extra Question controls are missing');
assert(page.includes('apiAdminContinueRealityTvApproval'), 'Staged approval client loop is missing');
assert(page.includes('Contestant Roster'), 'Contestant roster builder is missing');
assert(page.includes('Mass Enter Contestants'), 'Mass contestant entry UI is missing');
assert(page.includes('each is a winner'), 'Multiple-elimination winner behavior is missing');
assert(page.includes('No elimination (question is pushed)'), 'No-elimination safety behavior is missing');
assert(app.includes('case "admin-reality-tv"'), 'Reality TV route is missing');
assert(html.includes('adminRealityTv.js'), 'Reality TV page script is not loaded');
assert(sw.includes('adminRealityTv.js'), 'Reality TV page is not cached by service worker');

console.log('Reality TV Season Manager tests passed.');
