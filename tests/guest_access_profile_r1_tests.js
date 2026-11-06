'use strict';
/* Guest Access R1 regression: run with node tests/guest_access_profile_r1_tests.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({
  console,
  LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) }
});
vm.runInContext(read('backend/engines/UsersEngine.js'), context);
assert.equal(context.guestUsernameForName_('Sam Jones'), 'guestsamjones');
assert.equal(context.guestUsernameForName_('S'), '');
assert.equal(context.guestUsernameForName_('  '), '');
let created;
context.createUser = (...args) => { created = args; return {success:true}; };
assert.equal(context.createGuestUser_('Sam Jones', '1234').success, true);
assert.equal(created[0], 'guestsamjones');
assert.equal(created[1], 'Sam Jones');
assert.equal(created[2], '1234');
assert.equal(created[6], 'guest');
assert.equal(created[3], '');
assert.equal(created[4], '');
let record = null;
context.findUserRecordByUsername_ = () => record;
context.loginUser = () => ({success:true,accountType:'guest'});
assert.equal(context.loginGuestUser_('Sam Jones','1234').success, false);
record = {user:{AccountType:'member'},rowNumber:2};
assert.equal(context.loginGuestUser_('Sam Jones','1234').success, false);
record = {user:{AccountType:'guest', Email:'', Phone:''},rowNumber:2};
assert.equal(context.loginGuestUser_('Sam Jones','1234').success, true);
assert.equal(context.getAccountContacts_('guestsamjones').success, true);
let saved = null;
context.findUserRecordByEmail_ = () => null;
context.findUserRecordByPhone_ = () => null;
context.updateUserFields_ = (row, fields) => { saved = {row,fields}; };
assert.equal(context.saveAccountContacts_('guestsamjones','test@example.com','','email').success, true);
assert.equal(saved.fields.email, 'test@example.com');
assert.equal(saved.fields.preferredContactMethod, 'email');
assert.equal(context.saveAccountContacts_('guestsamjones','','','email').success, false);
context.findUserRecordByEmail_ = () => ({rowNumber:99});
assert.equal(context.saveAccountContacts_('guestsamjones','test@example.com','','email').success, false);

const security = vm.createContext({
  console,
  findUserRecordBySessionToken_: () => ({user:{Username:'guestsamjones',AccountType:'guest'}}),
  isAdmin: () => false
});
vm.runInContext(read('backend/core/ApiSecurity.js'), security);
assert.equal(security.apiSecurityIsPublicAction_('guestSignup'), true);
assert.equal(security.apiSecurityRequiresPost_('guestSignup'), true);
assert.equal(security.apiSecurityRequiresPost_('guestLogin'), true);
assert.equal(security.apiSecurityAuthorizeRequest_('saveVotingCompetitionBallot',{token:'valid'}).username,'guestsamjones');
assert.throws(() => security.apiSecurityAuthorizeRequest_('savePick',{token:'valid'}),/full PATTC account/);
assert.throws(() => security.apiSecurityAuthorizeRequest_('adminSummary',{token:'valid'}),/Admin access denied/);
assert.throws(() => security.apiSecurityAuthorizeRequest_('saveAccountContacts',{token:'valid',username:'otheruser'}),/Session user/);
assert.throws(() => security.apiSecurityAuthorizeRequest_('saveAccountContacts',{}),/Authentication required/);

const html=read('frontend/index.html');
assert.match(html,/data-auth-view="guest"/);
assert.match(html,/id="guestName"/);
assert.match(html,/id="guestPin"/);
assert.doesNotMatch(html,/id="signupEmail"/);
assert.doesNotMatch(html,/id="signupPhone"/);
assert.doesNotMatch(html,/name="signupContactMethod"/);
assert.equal(read('frontend/api.js'),read('frontend/js/api.js'));
assert.equal(read('frontend/js/auth.js'),read('frontend/js/pages/auth.js'));
assert.match(read('frontend/js/pages/profile.js'),/renderProfileAccountContacts_/);
assert.match(read('backend/Api.js'),/guestSignup/);
assert.match(read('backend/Api.js'),/saveAccountContacts/);
console.log('Guest Access R1: 29 assertions PASS');
