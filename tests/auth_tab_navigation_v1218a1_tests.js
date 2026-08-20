'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const index = read('frontend/index.html');
const auth = read('frontend/js/auth.js');
const authMirror = read('frontend/js/pages/auth.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(index.includes('data-auth-view="login"'), 'Login auth tab must identify its target.');
assert(index.includes('data-auth-view="signup"'), 'Sign Up auth tab must identify its target.');
assert(index.includes('data-auth-view="reset"'), 'Reset PIN auth tab must identify its target.');
assert(index.includes('type="button" data-auth-view="signup"'), 'Sign Up tab must be a non-submit button.');
assert(index.includes('type="button" data-auth-view="reset"'), 'Reset PIN tab must be a non-submit button.');
assert(!index.includes('onclick="showAuthView'), 'Auth tabs should not depend on inline click handlers.');
assert(auth.includes('login: "loginForm"'), 'Auth view switcher must target the real login form ID.');
assert(auth.includes('const panel = document.getElementById(viewIds[name])'), 'Auth view switcher must use explicit view IDs.');
assert(auth.includes('if (!panel) return;'), 'Missing auth panels must not crash tab switching.');
assert(auth.includes('function bindAuthTabs_()'), 'Auth tab click binding is missing.');
assert(auth.includes('showAuthView(tab.getAttribute("data-auth-view") || "login")'), 'Auth tabs must switch to their declared view.');
assert.strictEqual(auth, authMirror, 'Auth compatibility files are out of sync.');
assert(index.includes('v1218a1-auth-tabs'), 'Auth script cache marker was not bumped.');
assert(pwa.includes('v1218a1-auth-tabs'), 'PWA registration version was not bumped.');
assert(sw.includes('v1218a1-auth-tabs'), 'Service-worker cache version was not bumped.');

console.log('v1.2.18a1 auth tab navigation tests passed.');
