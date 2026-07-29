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

  const awardsPromise = context.sportsAwardsApi_(
    'adminGetSportsPlayerPropPlayers',
    { username: 'admin', token: 'token', league: 'mlb', sport: 'baseball' }
  );
  const awardsUrl = new URL(appendedScript.src);
  assert(
    awardsUrl.searchParams.get('action') === 'adminGetSportsPlayerPropPlayers',
    'Awards Sports API action was not sent through JSONP'
  );
  const awardsCallback = awardsUrl.searchParams.get('callback');
  windowStub[awardsCallback]({ success: true, players: [] });
  const awardsResult = await awardsPromise;
  assert(awardsResult.success === true, 'Awards Sports JSONP request failed');

  console.log('Sports page stats runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
