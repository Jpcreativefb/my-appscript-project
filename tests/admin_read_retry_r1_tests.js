'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let source = fs.readFileSync('functions/api/app.js', 'utf8');

// The Pages Function uses ES module exports. Strip the export keyword so the
// functions can be exercised in the isolated VM test harness.
source = source.replace(/\bexport\s+/g, '');

function makeUpstream(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(payload || {});
    }
  };
}

class TestResponse {
  constructor(body, init) {
    this.body = String(body || '');
    this.status = Number(init && init.status || 200);
    this.headers = init && init.headers || {};
  }

  async text() {
    return this.body;
  }

  async json() {
    return JSON.parse(this.body);
  }
}

async function runRequest(action, responses) {
  let calls = 0;

  const context = {
    URL,
    Set,
    Promise,
    JSON,
    String,
    Number,
    RegExp,
    Response: TestResponse,
    console,
    setTimeout(fn) {
      // Keep the regression test fast while still exercising retry flow.
      fn();
      return 1;
    },
    fetch: async function() {
      const index = calls++;
      const value = responses[index];

      if (value instanceof Error) {
        throw value;
      }

      if (!value) {
        throw new Error('Unexpected extra fetch call');
      }

      return value;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  const requestContext = {
    request: {
      url: 'https://my-appscript-project.pages.dev/api/app',
      async text() {
        return JSON.stringify({
          action,
          token: 'test-token',
          username: 'testuser'
        });
      }
    },
    env: {}
  };

  const result = await context.onRequestPost(requestContext);

  return {
    calls,
    status: result.status,
    body: JSON.parse(await result.text())
  };
}

(async function() {
  // 1. Approved read retries once and succeeds.
  let result = await runRequest('adminGetGames', [
    makeUpstream(404, { message: 'temporary rejection' }),
    makeUpstream(200, { success: true, games: [] })
  ]);

  assert.strictEqual(result.calls, 2);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.success, true);

  // Gateway-style transient failure is also retried for the read allowlist.
  result = await runRequest('adminGetAppearanceDashboard', [
    makeUpstream(503, { message: 'temporary gateway failure' }),
    makeUpstream(200, { success: true })
  ]);

  assert.strictEqual(result.calls, 2);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.success, true);

  // 2. Admin write must never retry.
  result = await runRequest('adminSaveAppearanceOverride', [
    makeUpstream(503, { message: 'write failed' }),
    makeUpstream(200, { success: true })
  ]);

  assert.strictEqual(result.calls, 1);
  assert.strictEqual(result.status, 502);
  assert.strictEqual(result.body.success, false);

  // 3. Home is not added to the bridge retry allowlist.
  // Its existing frontend fallback contract remains separate and unchanged.
  result = await runRequest('getDashboardGamesHub', [
    makeUpstream(503, { message: 'home transient' }),
    makeUpstream(200, { success: true })
  ]);

  assert.strictEqual(result.calls, 1);
  assert.strictEqual(result.status, 502);

  // 4. A second read failure is returned; there is no retry loop.
  result = await runRequest('adminGetGames', [
    makeUpstream(504, { message: 'first failure' }),
    makeUpstream(504, { message: 'second failure' })
  ]);

  assert.strictEqual(result.calls, 2);
  assert.strictEqual(result.status, 502);
  assert.strictEqual(result.body.success, false);
  assert.strictEqual(result.body.status, 504);

  // Network exception gets one bounded retry for approved reads only.
  result = await runRequest('adminGetGameSetup', [
    new Error('temporary network failure'),
    makeUpstream(200, { success: true })
  ]);

  assert.strictEqual(result.calls, 2);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.success, true);

  console.log('Admin read retry R1: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
