'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const manifest = JSON.parse(read('backend/appsscript.json'));
const users = read('backend/engines/UsersEngine.js');
const security = read('backend/core/ApiSecurity.js');
const api = read('backend/Api.js');
const frontendApp = read('frontend/js/app.js');
const frontendMirror = read('frontend/app.js');

const scopes = Array.isArray(manifest.oauthScopes) ? manifest.oauthScopes : [];
assert(scopes.includes('https://www.googleapis.com/auth/script.send_mail'),
  'Awards App manifest must explicitly authorize MailApp via script.send_mail.');

assert(/function requestPinReset\(identifier\)/.test(users), 'requestPinReset must remain present.');
assert(/MailApp\.sendEmail\(/.test(users), 'PIN reset must still use server-side MailApp delivery.');
assert(/If that account exists and has an email on file/.test(users),
  'PIN reset public response must remain generic / anti-enumeration.');
assert(!/return\s*\{[^}]*email\s*:/s.test(users.match(/function requestPinReset\(identifier\)[\s\S]*?\n\}/)?.[0] || ''),
  'PIN reset response must not expose whether or where email was sent.');

assert(/PIN_RESET_MAX_FAILED_ATTEMPTS_\s*=\s*5/.test(users),
  'Five-attempt reset verification ceiling must remain 5.');
assert(/nextFailedAttempts\s*>=\s*PIN_RESET_MAX_FAILED_ATTEMPTS_[\s\S]*resetCodeHash\s*=\s*""[\s\S]*resetCodeExpiresAt\s*=\s*""/.test(users),
  'Fifth wrong reset verification must invalidate the issued challenge.');
assert(/resetCodeFailedAttempts:\s*0/.test(users),
  'A fresh reset challenge must reset failed-attempt state.');
assert(/authRevokeAllDeviceSessionsForUser_/.test(users),
  'Successful PIN reset must preserve session revocation behavior.');

assert(/validateSession:\s*true/.test(security),
  'validateSession must remain POST-only in explicit transport policy.');
assert(/requestPinReset:\s*true/.test(security) && /resetPin:\s*true/.test(security),
  'PIN reset actions must remain POST-only.');
assert(/API POST ERROR/.test(api), 'Existing POST error boundary must remain present.');

assert(!/INIT SESSION:\s*",?\s*activeSession/.test(frontendApp),
  'Frontend must not restore bearer-session object logging.');
assert(!/ADMIN NAV CHECK:[\s\S]{0,120}activeSession/.test(frontendApp),
  'Frontend must not restore admin-nav bearer-session logging.');
assert.strictEqual(frontendApp, frontendMirror,
  'Frontend app mirrors must remain byte-identical.');

console.log('security-auth-rc18-reset-mail-scope-tests: PASS');
