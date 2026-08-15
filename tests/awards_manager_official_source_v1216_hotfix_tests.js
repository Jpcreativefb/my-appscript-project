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
assert(app.includes('325-game-load-question-controls-v1216'), 'Main frontend asset marker missing.');
assert(appMirror.includes('325-game-load-question-controls-v1216'), 'Frontend mirror asset marker missing.');
assert(html.includes('325-game-load-question-controls-v1216'), 'HTML asset marker missing.');
assert(sw.includes('awards-app-v325-game-load-question-controls-v1216'), 'Service-worker cache marker missing.');

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
