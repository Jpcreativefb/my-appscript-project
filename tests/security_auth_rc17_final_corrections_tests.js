'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const securitySource = read('backend/core/ApiSecurity.js');
const apiSource = read('backend/Api.js');
const picksSource = read('backend/engines/PicksEngine.js');
const usersSource = read('backend/engines/UsersEngine.js');
const usersRepoSource = read('backend/repositories/UsersRepo.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const frontendApi = read('frontend/js/api.js');

// ---------------------------------------------------------------------------
// validateSession is still public pre-auth, but bearer transport is POST-only.
// ---------------------------------------------------------------------------
{
  const ctx = {
    findUserRecordBySessionToken_: () => null,
    isAdmin: () => false,
    console
  };
  vm.createContext(ctx);
  vm.runInContext(securitySource, ctx);

  assert.strictEqual(ctx.apiSecurityIsPublicAction_('validateSession'), true);
  assert.strictEqual(ctx.apiSecurityRequiresPost_('validateSession'), true);
  assert.strictEqual(ctx.apiSecurityAllowsGet_('validateSession'), false);
  assert(/async function apiValidateSession\(token\)[\s\S]*return api\("validateSession"/.test(frontendApi),
    'Frontend session validation helper should retain the central API transport helper.');
}

// ---------------------------------------------------------------------------
// Cross-user userBreakdown: unlocked selections are hidden; category/game lock
// restores the established post-lock visibility contract. Own-user remains visible.
// ---------------------------------------------------------------------------
{
  const ctx = {
    console,
    Utilities: {
      DigestAlgorithm: { MD5: 'MD5' },
      computeDigest: () => [1, 2, 3]
    },
    CacheService: {
      getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} })
    },
    getDefaultGameId: () => 'game-1',
    getUserPicks: () => [{
      categoryId: 'cat-1',
      nomineeId: 'bob-live-choice',
      originalNomineeId: 'bob-original-choice',
      changeCount: 2,
      confidencePoints: 8,
      stakePoints: 25
    }],
    getCategorySettings: () => ({
      'cat-1': {
        points: 10,
        changePenalty: 1,
        maxChanges: 3,
        winnerNomineeId: 'winner-1',
        scoreMode: 'correct-pick',
        locked: false
      }
    }),
    normalizeCategoryScoreMode_: value => String(value || 'correct-pick').toLowerCase(),
    isLeaderboardCompareGameLocked_: () => false,
    isLeaderboardCompareCategoryLocked_: () => false
  };

  vm.createContext(ctx);
  vm.runInContext(picksSource, ctx);
  // Full PicksEngine defines its repository-backed readers; override them with
  // deterministic fixtures after evaluation.
  ctx.getUserPicks = () => [{
    categoryId: 'cat-1', nomineeId: 'bob-live-choice', originalNomineeId: 'bob-original-choice',
    changeCount: 2, confidencePoints: 8, stakePoints: 25
  }];
  ctx.getCategorySettings = () => ({
    'cat-1': { points: 10, changePenalty: 1, maxChanges: 3, winnerNomineeId: 'winner-1', scoreMode: 'correct-pick', locked: false }
  });

  const hidden = ctx.getUserBreakdown('Bob', 'game-1', { hideUnlockedSelections: true });
  assert.strictEqual(hidden.length, 1);
  assert.strictEqual(hidden[0].selectionHidden, true);
  assert.strictEqual(hidden[0].pick, '');
  assert.strictEqual(hidden[0].originalNomineeId, '');
  assert.strictEqual(hidden[0].confidencePoints, 0);
  assert.strictEqual(hidden[0].stakePoints, 0);
  assert.strictEqual(hidden[0].status, 'hidden');
  assert.strictEqual(hidden[0].changeCount, 0);
  assert.strictEqual(hidden[0].adjustedPoints, 0);

  const own = ctx.getUserBreakdown('Alice', 'game-1', { hideUnlockedSelections: false });
  assert.strictEqual(own[0].selectionHidden, false);
  assert.strictEqual(own[0].pick, 'bob-live-choice');
  assert.strictEqual(own[0].originalNomineeId, 'bob-original-choice');
  assert.strictEqual(own[0].confidencePoints, 8);
  assert.strictEqual(own[0].stakePoints, 25);

  ctx.isLeaderboardCompareCategoryLocked_ = () => true;
  const categoryLocked = ctx.getUserBreakdown('Bob', 'game-1', { hideUnlockedSelections: true });
  assert.strictEqual(categoryLocked[0].selectionHidden, false);
  assert.strictEqual(categoryLocked[0].pick, 'bob-live-choice');
  assert.strictEqual(categoryLocked[0].confidencePoints, 8);
  assert.strictEqual(categoryLocked[0].stakePoints, 25);

  ctx.isLeaderboardCompareCategoryLocked_ = () => false;
  ctx.isLeaderboardCompareGameLocked_ = () => true;
  const gameLocked = ctx.getUserBreakdown('Bob', 'game-1', { hideUnlockedSelections: true });
  assert.strictEqual(gameLocked[0].selectionHidden, false);
  assert.strictEqual(gameLocked[0].pick, 'bob-live-choice');
}

assert(apiSource.includes('hideUnlockedSelections:'),
  'userBreakdown API route must explicitly request cross-user unlocked hiding.');
assert(apiSource.includes('!isAdmin(params.username)'),
  'Admin access should remain an explicit exception to player-to-player hiding.');
assert(apiSource.includes('apiSecurityNormalizeUsername_(breakdownTarget)'),
  'Breakdown target must be compared to the authenticated actor, not trusted browser state.');

// ---------------------------------------------------------------------------
// PIN reset: cryptographically stronger UUID/SHA entropy, persisted attempt
// counter, fifth failure invalidates, fresh code resets counter, success consumes
// code and revokes all prior device sessions.
// ---------------------------------------------------------------------------
{
  let uuidCounter = 0;
  const sent = [];
  const revoked = [];
  const headers = [
    'Username', 'Email', 'PIN', 'ResetCodeHash', 'ResetCodeExpiresAt',
    'ResetRequestedAt', 'ResetCodeFailedAttempts', 'SessionToken',
    'SessionExpiresAt', 'LastUpdated'
  ];
  const col = {
    username: 0,
    email: 1,
    pin: 2,
    resetCodeHash: 3,
    resetCodeExpiresAt: 4,
    resetRequestedAt: 5,
    resetCodeFailedAttempts: 6,
    sessionToken: 7,
    sessionExpiresAt: 8,
    lastUpdated: 9
  };
  const row = ['Alice', 'alice@example.com', 'old-pin-hash', '', '', '', 0, 'old-session', 'future', ''];
  const fieldIndex = {
    pin: col.pin,
    resetCodeHash: col.resetCodeHash,
    resetCodeExpiresAt: col.resetCodeExpiresAt,
    resetRequestedAt: col.resetRequestedAt,
    resetCodeFailedAttempts: col.resetCodeFailedAttempts,
    sessionToken: col.sessionToken,
    sessionExpiresAt: col.sessionExpiresAt,
    lastUpdated: col.lastUpdated
  };

  const ctx = {
    console,
    Date,
    Math,
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid: () => `12345678-1234-4abc-9def-${String(++uuidCounter).padStart(12, '0')}`,
      computeDigest: (_alg, value) => Array.from(crypto.createHash('sha256').update(String(value)).digest()).map(v => v > 127 ? v - 256 : v),
      base64EncodeWebSafe: bytes => Buffer.from(bytes.map(v => v < 0 ? v + 256 : v)).toString('base64url')
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    MailApp: {
      sendEmail: (to, subject, body) => sent.push({ to, subject, body })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => 'test-pepper',
        setProperty: () => {}
      })
    },
    CacheService: {
      getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} })
    },
    authAllowResetRequest_: () => true,
    findUserRecordByIdentifier_: () => ({
      user: { Username: 'Alice' }, row, rowNumber: 2, headers, col
    }),
    updateUserFields_: (_rowNumber, fields) => {
      Object.entries(fields).forEach(([key, value]) => {
        const idx = fieldIndex[key];
        if (idx !== undefined) row[idx] = value;
      });
    },
    hashUserPinForStorage_: pin => `pin-hash:${pin}`,
    authRevokeAllDeviceSessionsForUser_: username => revoked.push(username)
  };

  vm.createContext(ctx);
  vm.runInContext(usersSource, ctx);
  // Keep production reset flow while replacing only the PIN hashing side effect
  // that depends on Apps Script private properties in this Node harness.
  ctx.hashUserPinForStorage_ = pin => `pin-hash:${pin}`;

  const sampleCode = ctx.generatePinResetCode_();
  assert(/^\d{6}$/.test(sampleCode), 'Generated reset code must retain six-digit UX format.');
  const generatorSource = usersSource.slice(usersSource.indexOf('function generatePinResetCode_'), usersSource.indexOf('var PIN_RESET_MAX_FAILED_ATTEMPTS_'));
  assert(!/Math\.random\(\)/.test(generatorSource), 'Reset-code generation must not use Math.random().');
  assert.strictEqual(ctx.PIN_RESET_MAX_FAILED_ATTEMPTS_, 5);

  const requested = ctx.requestPinReset('alice@example.com');
  assert.strictEqual(requested.success, true);
  assert.strictEqual(row[col.resetCodeFailedAttempts], 0);
  assert(sent.length >= 1, 'Reset request must still email a code for a valid account.');
  const issued = sent[sent.length - 1].body.match(/(\d{6})/)[1];
  assert.strictEqual(row[col.resetCodeHash], ctx.hashResetCode_('alice@example.com', issued));

  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = ctx.resetPin('alice@example.com', '000000', '4321');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, 'Invalid or expired reset code');
    assert.strictEqual(row[col.resetCodeFailedAttempts], attempt);
  }
  assert.strictEqual(row[col.resetCodeHash], '', 'Fifth wrong guess must invalidate the issued code.');
  assert.strictEqual(row[col.resetCodeExpiresAt], '', 'Invalidated code must lose its expiry token too.');

  const blockedCorrectGuess = ctx.resetPin('alice@example.com', issued, '4321');
  assert.strictEqual(blockedCorrectGuess.success, false, 'Invalidated code must remain unusable even if later guessed correctly.');
  assert.strictEqual(row[col.pin], 'old-pin-hash');

  ctx.requestPinReset('alice@example.com');
  const freshCode = sent[sent.length - 1].body.match(/(\d{6})/)[1];
  assert.strictEqual(row[col.resetCodeFailedAttempts], 0, 'Fresh issued code must reset its own attempt counter.');

  const success = ctx.resetPin('alice@example.com', freshCode, '4321');
  assert.strictEqual(success.success, true);
  assert.strictEqual(row[col.pin], 'pin-hash:4321');
  assert.strictEqual(row[col.resetCodeHash], '');
  assert.strictEqual(row[col.resetCodeExpiresAt], '');
  assert.strictEqual(row[col.resetCodeFailedAttempts], 0);
  assert.deepStrictEqual(revoked, ['Alice'], 'Successful reset must revoke all previous device sessions.');

  const consumed = ctx.resetPin('alice@example.com', freshCode, '4321');
  assert.strictEqual(consumed.success, false, 'Successful reset must consume the code exactly once.');

  // Expiration remains authoritative.
  ctx.requestPinReset('alice@example.com');
  const expiredCode = sent[sent.length - 1].body.match(/(\d{6})/)[1];
  row[col.resetCodeExpiresAt] = new Date(Date.now() - 1000).toISOString();
  const expired = ctx.resetPin('alice@example.com', expiredCode, '9876');
  assert.strictEqual(expired.success, false);
  assert.strictEqual(expired.message, 'Invalid or expired reset code');
}

assert(usersRepoSource.includes('"ResetCodeFailedAttempts"'),
  'Users sheet migration must persist the reset verification attempt counter.');
assert(usersSource.includes('resetCodeFailedAttempts: 0'),
  'Every new reset code must start with a fresh attempt counter.');
assert(usersSource.includes('lock.waitLock(10000)'),
  'Reset verification must serialize attempts so concurrent guesses cannot race the ceiling.');

// ---------------------------------------------------------------------------
// Signup duplicate identity responses are field-agnostic, and bearer session
// objects are no longer dumped to production browser logs.
// ---------------------------------------------------------------------------
assert(!usersSource.includes('Username already exists'));
assert(!usersSource.includes('Email already has an account'));
assert(!usersSource.includes('Phone number already has an account'));
assert(usersSource.includes('Unable to create account with those details. Try signing in or PIN recovery.'));

assert(!app.includes('INIT SESSION:'), 'Production app must not log live session bearer objects.');
assert(!app.includes('ADMIN NAV CHECK:'), 'Admin navigation must not log the live session object.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors must remain byte-for-byte synchronized.');

console.log('security-auth-rc17-final-corrections-tests: PASS');
