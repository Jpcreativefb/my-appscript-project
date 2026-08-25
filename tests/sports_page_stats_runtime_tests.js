const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');
const sportsHtml = fs.readFileSync(path.join(root, 'frontend/sports.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const timers = [];
let appendedScript = null;
let timerId = 0;
const fetchCalls = [];

const documentStub = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    src: '',
    onerror: null,
    parentNode: null
  }),
  body: {
    appendChild(script) {
      appendedScript = script;
      script.parentNode = {
        removeChild(node) {
          if (node === script) script.parentNode = null;
        }
      };
    }
  }
};

const windowStub = {};
const context = {
  console,
  document: documentStub,
  window: windowStub,
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
  async fetch(url, options) {
    fetchCalls.push({ url: String(url), options: options || {} });
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify({ success: true, players: [] }); }
    };
  },
  setTimeout(fn, delay) {
    const id = ++timerId;
    timers.push({ id, fn, delay, cleared: false });
    return id;
  },
  clearTimeout(id) {
    const timer = timers.find((item) => item.id === id);
    if (timer) timer.cleared = true;
  }
};
windowStub.document = documentStub;

vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  assert(
    source.includes('SPORTS_JSONP_TIMEOUT_MS') && source.includes('SPORTS_JSONP_LATE_CALLBACK_MS'),
    'Sports JSONP timeout hardening is missing'
  );
  assert(
    !source.includes('await apiAdminGetSportsAdvancedQuestionOptions(league, sport)'),
    'Advanced stat options still depend on an unloaded frontend API wrapper'
  );
  assert(
    !source.includes('const result = await apiAdminCreateSportsAdvancedQuestion({'),
    'Advanced stat creation still depends on an unloaded frontend API wrapper'
  );
  assert(
    sportsHtml.includes('./js/sports.js'),
    'Sports page script is missing'
  );

  const successPromise = context.sportsJsonp(
    'https://example.test/exec?action=getSportsScores',
    { timeoutMs: 5000 }
  );

  assert(appendedScript && appendedScript.src.includes('callback='), 'JSONP script was not appended');
  const successUrl = new URL(appendedScript.src);
  const successCallback = successUrl.searchParams.get('callback');
  assert(typeof windowStub[successCallback] === 'function', 'JSONP callback was not registered');
  windowStub[successCallback]({ success: true, count: 1 });
  const successResult = await successPromise;
  assert(successResult.success === true && successResult.count === 1, 'JSONP success response failed');

  const timeoutPromise = context.sportsJsonp(
    'https://example.test/exec?action=getSportsScores',
    { timeoutMs: 1000 }
  ).then(
    () => ({ resolved: true }),
    (error) => ({ resolved: false, error })
  );

  const timeoutUrl = new URL(appendedScript.src);
  const timeoutCallback = timeoutUrl.searchParams.get('callback');
  const timeoutTimer = timers.find((item) => item.delay === 1000 && !item.cleared);
  assert(timeoutTimer, 'JSONP timeout timer was not created');
  timeoutTimer.fn();
  const timeoutResult = await timeoutPromise;
  assert(timeoutResult.resolved === false, 'JSONP timeout did not reject');
  assert(
    typeof windowStub[timeoutCallback] === 'function',
    'Late JSONP callback was deleted immediately after timeout'
  );
  windowStub[timeoutCallback]({ success: true });

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
