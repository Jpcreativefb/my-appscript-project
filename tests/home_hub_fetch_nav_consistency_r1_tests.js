'use strict';

const fs=require('fs'),assert=require('assert');
const api=fs.readFileSync('frontend/js/api.js','utf8');
const apiMirror=fs.readFileSync('frontend/api.js','utf8');
const app=fs.readFileSync('frontend/js/app.js','utf8');
const appMirror=fs.readFileSync('frontend/app.js','utf8');
const dash=fs.readFileSync('frontend/js/pages/dashboard.js','utf8');
const nav=fs.readFileSync('frontend/js/navigationSlotsR1.js','utf8');
const backend=fs.readFileSync('backend/engines/AppDataEngine.js','utf8');
const html=fs.readFileSync('frontend/app.html','utf8');

assert.strictEqual(api,apiMirror);
assert.strictEqual(app,appMirror);
assert(api.includes('[502, 503, 504, 524]'));
assert(api.includes('Dashboard bridge fallback failed'));
assert(!backend.includes('fastHubAppearance'));

// Home keeps its existing fetch/compact-render behavior while navigationSlotsR1
// is the only renderer of Bottom Nav Appearance.
assert(dash.includes('appApplyNavigationSlots_(slotRows)'));
assert(!dash.includes('appRememberBottomNavAppearance_();'));
assert(!dash.includes('icon.innerHTML = iconUrl'));
assert(!dash.includes('label.textContent = String(row.DisplayName'));
assert(nav.includes('root.appRememberBottomNavAppearance_ = function() { return false; };'));
assert(nav.includes('root.appRestoreBottomNavAppearance_ = function() { return false; };'));
assert(nav.includes("if (str_(page) === 'dashboard' || str_(page) === 'team-fantasy')"));
assert(html.includes('home=v1233-home-hub-fetch-nav-r1'));

console.log('Home Hub fetch recovery + bottom nav consistency R1: PASS');
