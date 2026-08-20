'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const pagesCss = read('frontend/css/pages.css');
const stylesCss = read('frontend/css/styles.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const appHtml = read('frontend/app.html');
const appData = read('backend/engines/AppDataEngine.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('dashboard-player-card'), 'Player-first Home card is missing.');
assert(dashboard.includes('dashboard-snark-line'), 'Snark message line is missing.');
assert(dashboard.includes('dashboardGetSnarkMessage_'), 'Situation-based snark helper is missing.');
assert(dashboard.includes('dashboard-profile-photo'), 'Profile photo block is missing.');
assert(dashboard.includes('profile.bio || profile.Bio'), 'Short profile note is not wired into Home.');
assert(dashboard.includes('dashboard-career-details'), 'Career stats should be collapsible inside the player card.');
assert(dashboard.includes("navigate('trophy-room')"), 'Trophy Room button/page route is missing.');
assert(dashboard.includes('renderDashboardTrophyRoomPage_'), 'Trophy Room foundation page is missing.');
assert(dashboard.includes('Needs Your Attention'), 'Needs-attention section is missing.');
assert(dashboard.includes("total > 0 && made < total"), 'Newly-added/unmade picks should return a game to Needs Attention.');
assert(dashboard.includes("Games You're Playing"), 'Home should show user-started games separately.');
assert(dashboard.includes('New Games Available'), 'Available/new game discovery section is missing.');
assert(!dashboard.includes('<small>Archive</small>\n            Past Games'), 'Archived games should no longer live on Home.');
assert(dashboard.includes('renderDashboardHubLauncher_'), 'Collapsible Home hub launcher is missing.');
assert(dashboard.includes('renderDashboardSubHub_'), 'League/show/event subhub renderer is missing.');
assert(dashboard.includes('Past / Archived Games'), 'Archive should live inside its respective subhub.');
assert(dashboard.includes('sports: "Sports"'), 'Sports hub is missing.');
assert(dashboard.includes('reality: "Reality Shows"'), 'Reality hub is missing.');
assert(dashboard.includes('awards: "Awards Shows"'), 'Awards hub is missing.');
assert(dashboard.includes('general: "General Games"'), 'General hub is missing.');

assert(appData.includes('apiGetEditableProfile(username, "")'), 'Dashboard payload should carry the lightweight general profile without another browser request.');
assert(appData.includes('hubCategory:'), 'Dashboard game payload should include hub category.');
assert(appData.includes('hubGroup:'), 'Dashboard game payload should include hub subgroup.');
assert(appData.includes('function getDashboardHubPlacement_'), 'Backend hub placement helper is missing.');
assert(appData.includes('category: "sports"'), 'Sports classification is missing.');
assert(appData.includes('category: "reality"'), 'Reality classification is missing.');
assert(appData.includes('category: "awards"'), 'Awards classification is missing.');

assert(app.includes('"hub": ["dashboard"]'), 'Dynamic hub routes must load the Dashboard module.');
assert(app.includes('page.indexOf("hub:") === 0'), 'Dynamic hub route handling is missing.');
assert(app.includes('renderDashboardHubPage_'), 'Hub route renderer is missing.');
assert(app.includes('renderDashboardMorePage_'), 'More route renderer is missing.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

assert(appHtml.includes('data-page="hub:sports"'), 'Sports bottom nav button is missing.');
assert(appHtml.includes('data-page="hub:reality"'), 'Reality bottom nav button is missing.');
assert(appHtml.includes('data-page="hub:awards"'), 'Awards bottom nav button is missing.');
assert(appHtml.includes('data-page="more"'), 'More bottom nav button is missing.');
assert(!appHtml.includes('data-page="profile"'), 'Profile should no longer consume a bottom-nav slot.');

assert(pagesCss.includes('.dashboard-player-card'), 'Player card styles are missing.');
assert(pagesCss.includes('.dashboard-hub-launcher-grid'), 'Hub launcher styles are missing.');
assert(pagesCss.includes('.dashboard-subhub'), 'Subhub styles are missing.');
assert(stylesCss.includes('.bottom-nav-icon'), 'Condensed bottom-nav icon styling is missing.');

assert(app.includes('v1218c-player-hubs'), 'App asset version was not bumped for v1.2.18c.');
assert(pwa.includes('v1218c-player-hubs'), 'PWA version was not bumped for v1.2.18c.');
assert(sw.includes('v1218c-player-hubs'), 'Service worker cache was not bumped for v1.2.18c.');

console.log('v1.2.18c player Home + game hub tests passed.');
