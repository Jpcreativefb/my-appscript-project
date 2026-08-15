'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { assertCurrentReleaseMarkers } = require('../tools/release_test_helpers');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const api = read('backend/Api.js');
const security = read('backend/core/ApiSecurity.js');
const auth = read('backend/AuthEngine.js');
const users = read('backend/engines/UsersEngine.js');
const usersRepo = read('backend/repositories/UsersRepo.js');
const admin = read('backend/admin/AdminTools.js');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

assert(security.includes('function apiSecurityAuthorizeRequest_'), 'Central API authorization boundary is missing.');
assert(security.includes('apiSecurityIsAdminAction_'), 'Admin action classification is missing.');
assert(security.includes('findUserRecordBySessionToken_'), 'API auth must validate the persisted session, not only browser identity.');
assert(security.includes('API_TARGET_USERNAME_ACTIONS_'), 'Explicit cross-user target action map is missing.');
assert(security.includes('payload.username = sessionUsername'), 'Every authenticated route must derive actor identity from the session.');
assert(security.includes('getUserProfile: true'), 'Cross-user profile views must use an explicit target identity.');
assert(security.includes('userBreakdown: true'), 'Cross-user leaderboard views must use an explicit target identity.');

assert(api.includes('apiSecurityAuthorizeRequest_(\n      action,\n      params'), 'GET requests must cross the central authorization boundary.');
assert(api.includes('apiSecurityAuthorizeRequest_(\n      action,\n      body'), 'POST requests must cross the central authorization boundary.');
assert(api.includes('error: "This action requires POST."'), 'Credential/write GET requests must be rejected.');
assert(api.includes('action === "savePick" ||'), 'savePick must be part of the GET rejection gate.');
assert(api.includes('action === "createLeague" ||'), 'League writes must be part of the GET rejection gate.');
assert(api.includes('if (action === "savePick")'), 'POST savePick route is missing.');
assert(api.includes('if (action === "saveBet")'), 'POST saveBet route is missing.');
assert(api.includes('if (action === "saveEditableProfile")'), 'POST profile-save route is missing.');

assert(frontendApi.includes('function apiAttachSession_'), 'Frontend must attach the current session to authenticated requests.');
assert(frontendApi.includes('return apiPost("login"'), 'Login must use POST.');
assert(frontendApi.includes('return apiPost("signup"'), 'Signup must use POST.');
assert(frontendApi.includes('return apiPost("requestPinReset"'), 'PIN reset requests must use POST.');
assert(frontendApi.includes('return apiPost("resetPin"'), 'PIN reset confirmation must use POST.');
assert(frontendApi.includes('return apiPost("savePick"'), 'Pick writes must use POST.');
assert(frontendApi.includes('return apiPost("saveBet"'), 'Bet writes must use POST.');
assert(frontendApi.includes('return apiPost("removeBet"'), 'Bet removal must use POST.');
assert(frontendApi.includes('return apiPost("saveEditableProfile"'), 'Profile writes must use POST.');
assert(frontendApi.includes('return apiPost("setNotificationPreference"'), 'Notification preference writes must use POST.');
assert(frontendApi.includes('return apiPost("createLeague"'), 'League creation must use POST.');
assert(frontendApi.includes('return apiPost("updateLeague"'), 'League updates must use POST.');
assert(frontendApi.includes('targetUsername: username'), 'Viewing another player must keep target identity separate from the authenticated actor.');
assert.strictEqual(frontendApi, frontendApiMirror, 'Frontend API compatibility mirror is out of sync.');

assert(users.includes('function hashUserPinForStorage_'), 'PIN hashing helper is missing.');
assert(users.includes('hmac-sha256-v1$'), 'PIN storage format must be versioned and hashed.');
assert(users.includes('AUTH_PIN_PEPPER_V1'), 'PIN hashes must use a Script Properties pepper.');
assert(users.includes('function storedSessionTokenMatches_'), 'Hashed session token comparison is missing.');
assert(users.includes('function migrateLegacyUserCredentialsV1216_'), 'One-time legacy credential migration is missing.');
assert(users.includes('sha256$'), 'Session tokens must be hashed at rest.');
assert(auth.includes('hashSessionTokenForStorage_(token)'), 'Login must store a hashed session token.');
assert(auth.includes('isLegacyStoredUserPin_(storedPin)'), 'Legacy plaintext PINs must auto-migrate after successful login.');
assert(auth.includes('authRecordLoginFailure_'), 'Login brute-force rate limiting is missing.');
assert(auth.includes('failures >= 5'), 'Login rate limit threshold is missing.');
assert(users.includes('authAllowResetRequest_'), 'PIN reset email throttling is missing.');
assert(usersRepo.includes('"Active"'), 'Users schema must include the Active state used by admin controls.');
assert(auth.includes('isUserRecordActive_(record)'), 'Session validation must honor account activation status.');
assert(admin.includes('sessionToken: ""'), 'PIN reset/deactivation paths must revoke sessions.');

assertCurrentReleaseMarkers(assert, app, html, sw);
assert.strictEqual(app, appMirror, 'Frontend app compatibility mirror is out of sync.');
assert(app.includes('324-awards-mobile-workflow-v1216'), 'v1.2.16 asset marker is missing.');

console.log('Production hardening v1.2.16 tests passed.');
