const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/AwardsManagerEngine.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/js/pages/adminAwards.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const appMirror = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(engine.includes('const AWARDS_MANAGER_VERSION = "1.2.16";'), 'Awards Manager version must be v1.2.16.');
assert(engine.includes('function awardsManagerOfficialSourceUrl_'), 'Official-source detector missing.');
assert(engine.includes('officialSourceUrl: awardsManagerOfficialSourceUrl_(event, markets)'), 'Provider event loader must expose officialSourceUrl.');
assert(engine.includes('sourceUrl: officialSourceUrl || market.sourceUrl'), 'Official URL must be preferred on the Awards App category.');
assert(engine.includes('providerSourceUrl: market.sourceUrl || ""'), 'Provider URL must remain preserved in source configuration.');
assert(engine.includes('sourcePriority: officialSourceUrl ? ["official", "provider", "manual"]'), 'Official/provider/manual source priority missing.');
assert(page.includes('Official Website URL'), 'Official Website field missing from Awards Manager.');
assert(page.includes('id="awardsOfficialSourceUrl"'), 'Official Website input missing.');
assert(page.includes('Open Official Site'), 'Official website open button missing.');
assert(page.includes('officialSourceUrl: officialSourceUrl'), 'Official source must be sent to the create/link backend payload.');
assert(app.includes('327-question-drag-order-v1216'), 'Main frontend asset marker missing.');
assert(appMirror.includes('327-question-drag-order-v1216'), 'Frontend mirror asset marker missing.');
assert(html.includes('327-question-drag-order-v1216'), 'HTML asset marker missing.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service-worker cache marker missing.');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(engine, sandbox);

const kalshiOfficial = sandbox.awardsManagerOfficialSourceUrl_(
  { settlement_sources: [{ name: 'Television Academy', url: 'https://www.televisionacademy.com/results' }] },
  []
);
assert(kalshiOfficial === 'https://www.televisionacademy.com/results', 'Kalshi settlement URL should auto-detect as official.');

const providerOnly = sandbox.awardsManagerOfficialSourceUrl_(
  { settlement_sources: [{ name: 'Kalshi', url: 'https://kalshi.com/markets/test' }] },
  []
);
assert(providerOnly === '', 'Provider URLs must not be mistaken for official sources.');

const resolutionUrl = sandbox.awardsManagerOfficialSourceUrl_(
  {},
  [{ resolutionSource: 'Per https://www.emmys.com/awards/nominees-winners the result is final.' }]
);
assert(resolutionUrl === 'https://www.emmys.com/awards/nominees-winners', 'Resolution-source URL should be detected.');

let threw = false;
try {
  sandbox.awardsManagerSafeHttpUrl_('javascript:alert(1)');
} catch (err) {
  threw = true;
}
assert(threw, 'Non-http(s) official URLs must be rejected.');

console.log('Awards Manager official-source v1.2.16 hotfix tests passed.');
