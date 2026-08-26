const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'backend/engines/SportsAdminBridgeEngine.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const sportsHtml = fs.readFileSync(path.join(root, 'frontend/sports.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fetchCalls = [];
const documentStub = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => []
};
const context = {
  console,
  document: documentStub,
  window: { document: documentStub },
  localStorage: {
    getItem: () => JSON.stringify({ username: 'admin', token: 'token', isAdmin: true })
  },
  URL,
  URLSearchParams,
  CONFIG: { API_URL: 'https://awards.example.test/exec' },
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  Promise,
  alert: () => {},
  confirm: () => true,
  AbortController,
  setTimeout,
  clearTimeout,
  async fetch(url, options) {
    fetchCalls.push({ url: String(url), options: options || {} });
    const body = JSON.parse((options && options.body) || '{}');
    const payload = body.action === 'adminGetSportsEngineScores'
      ? { success: true, count: 1, scores: [{ GameId: 'mlb-1' }] }
      : { success: true, players: [] };
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify(payload); }
    };
  }
};

vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  assert(
    !source.includes('function sportsJsonp(') && !source.includes('buildSportsApiUrl('),
    'Sports Scores & Game Builder must not use browser JSONP/script loading'
  );
  assert(
    !source.includes('SPORTS_API_URL'),
    'Sports page must not embed the separate Apps Script web-app URL in browser code'
  );
  assert(
    source.includes('adminGetSportsEngineLeagues') &&
      source.includes('adminGetSportsEngineScores') &&
      source.includes('adminGetSportsEngineSnapshots'),
    'Sports page is missing server-bridge read actions'
  );
  assert(
    bridge.includes('function apiAdminGetSportsEngineScores') &&
      bridge.includes('sportsAdminBridgeCall_(\n    "getSportsScores"'),
    'Awards backend is missing the server-side Sports Scores bridge'
  );
  assert(
    apiSource.includes('action === "adminGetSportsEngineScores"'),
    'Awards API router is missing Sports Engine score transport'
  );
  assert(
    !source.includes('await apiAdminGetSportsAdvancedQuestionOptions(league, sport)'),
    'Advanced stat options still depend on an unloaded frontend API wrapper'
  );
  assert(
    !source.includes('const result = await apiAdminCreateSportsAdvancedQuestion({'),
    'Advanced stat creation still depends on an unloaded frontend API wrapper'
  );
  assert(sportsHtml.includes('./js/sports.js'), 'Sports page script is missing');

  const engineResult = await context.sportsScoresEngineApi_(
    'adminGetSportsEngineScores',
    { league: 'mlb', dateFrom: '2026-08-25', dateTo: '2026-08-26' }
  );
  const engineCall = fetchCalls[fetchCalls.length - 1];
  assert(engineCall.url === './api/app', 'Sports Engine read did not use same-origin Awards POST bridge');
  assert(engineCall.options.method === 'POST', 'Sports Engine read was not sent with POST');
  const engineBody = JSON.parse(engineCall.options.body || '{}');
  assert(engineBody.action === 'adminGetSportsEngineScores', 'Sports Engine POST action missing');
  assert(engineBody.username === 'admin' && engineBody.token === 'token', 'Sports Engine POST is missing admin session');
  assert(engineBody.league === 'mlb', 'Sports Engine filters were not preserved');
  assert(engineResult.success === true && engineResult.scores.length === 1, 'Sports Engine POST response failed');

  const awardsResult = await context.sportsAwardsApi_(
    'adminGetSportsPlayerPropPlayers',
    { username: 'admin', token: 'token', league: 'mlb', sport: 'baseball' }
  );
  const awardsCall = fetchCalls[fetchCalls.length - 1];
  assert(awardsCall && awardsCall.url === './api/app', 'Awards Sports API did not use the repo-owned POST bridge');
  assert(awardsCall.options && awardsCall.options.method === 'POST', 'Awards Sports API was not sent with POST');
  const awardsBody = JSON.parse(awardsCall.options.body || '{}');
  assert(awardsBody.action === 'adminGetSportsPlayerPropPlayers', 'Awards Sports API action missing from POST body');
  assert(awardsBody.token === 'token', 'Awards Sports API session token missing from POST body');
  assert(!awardsCall.url.includes('token='), 'Awards Sports API leaked the session token into the URL');
  assert(awardsResult.success === true, 'Awards Sports POST request failed');

  console.log('Sports page stats runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
