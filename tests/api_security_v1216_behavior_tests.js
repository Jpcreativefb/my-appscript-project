'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const securitySource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'core', 'ApiSecurity.js'),
  'utf8'
);

const usersByToken = {
  'user-token': { user: { Username: 'Alice' } },
  'admin-token': { user: { Username: 'Admin' } }
};

const context = {
  findUserRecordBySessionToken_: token => usersByToken[token] || null,
  isAdmin: username => String(username || '').toLowerCase() === 'admin',
  console
};
vm.createContext(context);
vm.runInContext(securitySource, context);

// Public actions remain callable before authentication.
assert.strictEqual(
  context.apiSecurityAuthorizeRequest_('login', { username: 'Alice', pin: '1234' }).public,
  true
);

// Protected reads require a real persisted session.
assert.throws(
  () => context.apiSecurityAuthorizeRequest_('getCategories', {}),
  /Authentication required/
);

// Browser-supplied actor identity cannot impersonate another user.
assert.throws(
  () => context.apiSecurityAuthorizeRequest_('getCategories', {
    token: 'user-token',
    username: 'Bob'
  }),
  /Session user does not match request user/
);

const ownRequest = { token: 'user-token' };
const ownAuth = context.apiSecurityAuthorizeRequest_('getCategories', ownRequest);
assert.strictEqual(ownAuth.username, 'Alice');
assert.strictEqual(ownRequest.username, 'Alice');

// Cross-user display actions separate the actor from the display target.
const profileRequest = {
  token: 'user-token',
  username: 'Bob'
};
context.apiSecurityAuthorizeRequest_('getUserProfile', profileRequest);
assert.strictEqual(profileRequest.username, 'Alice');
assert.strictEqual(profileRequest.targetUsername, 'Bob');

const breakdownRequest = {
  token: 'user-token',
  targetUsername: 'Bob'
};
context.apiSecurityAuthorizeRequest_('userBreakdown', breakdownRequest);
assert.strictEqual(breakdownRequest.username, 'Alice');
assert.strictEqual(breakdownRequest.targetUsername, 'Bob');

// Unknown future authenticated routes are default-safe too.
const futureRequest = { token: 'user-token' };
context.apiSecurityAuthorizeRequest_('futureGameFeature', futureRequest);
assert.strictEqual(futureRequest.username, 'Alice');

// Admin prefix is protected automatically, including future admin actions.
assert.throws(
  () => context.apiSecurityAuthorizeRequest_('adminFutureFeature', {
    token: 'user-token',
    username: 'Alice'
  }),
  /Admin access denied/
);

const adminRequest = { token: 'admin-token' };
const adminAuth = context.apiSecurityAuthorizeRequest_('adminFutureFeature', adminRequest);
assert.strictEqual(adminAuth.isAdmin, true);
assert.strictEqual(adminRequest.username, 'Admin');

console.log('API security v1.2.16 behavior tests passed.');
