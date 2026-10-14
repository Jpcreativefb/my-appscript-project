const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const organizationPath = path.join(root, 'frontend/js/adminSportsGameOrganizationR2.js');
const loaderPath = path.join(root, 'frontend/js/nflWeekSurvivorPlayoffR1.js');

const organization = fs.readFileSync(organizationPath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');

assert.doesNotThrow(() => new Function(organization), 'R2 organization script must parse');
assert.doesNotThrow(() => new Function(loader), 'existing NFL helper plus R2 loader must parse');

assert(organization.includes('data-admin-sports-organization-r2'), 'Sports organization marker missing');
assert(organization.includes('Sports → NFL → 2026'), 'NFL 2026 hierarchy missing');
assert(organization.includes('Cups / Combined Competitions'), 'generic Cup terminology missing');
assert(organization.includes('One game record; no copied games'), 'single authoritative game record rule missing');

['Confidence', 'Survivor', 'Team Fantasy Football', 'Playoff Race', 'NFL Cup'].forEach(label => {
  assert(organization.includes(label), `${label} must be represented in NFL 2026 navigation`);
});

assert(organization.includes("navigate('admin-team-fantasy')"), 'Team Fantasy must preserve dedicated admin route');
assert(organization.includes("navigate('admin-games')"), 'embedded managers must preserve Manage Games route');
assert(organization.includes('buttonIn_(oldActions'), 'existing R1 game-navigation buttons must be reused from their own action group');

assert(organization.includes('buttonByOnclick_("./sports.html")'), 'Sports Scores & Game Builder must reuse existing route button');
assert(organization.includes("buttonByOnclick_('adminOpenSportsControls()')"), 'Sports Engine Controls must reuse existing control button');
assert(organization.includes('appendChild(sportsScores)'), 'Sports Scores button must be moved, not duplicated');
assert(organization.includes('appendChild(sportsEngine)'), 'Sports Engine button must be moved, not duplicated');
assert(organization.includes('appendChild(message)'), 'Sports Engine message must move with Sports Operations');
assert(organization.includes('appendChild(panel)'), 'Sports Engine panel must move with Sports Operations');

assert(organization.includes("document.getElementById('pattcCupControlR1')"), 'NFL Cup route must target the existing Cup Control Center');
assert(organization.includes("findCardByText_('NFL Playoff Race Timing')"), 'Playoff Race route must target existing timing controls');
assert(organization.includes("t.indexOf('confidence scoring')"), 'Confidence route must open existing Confidence controls');
assert(organization.includes("t.indexOf('survivor / elimination rules')"), 'Survivor route must open existing Survivor controls');

['apiAdminUpdateGame', 'apiAdminFinalizeGamePublication', 'apiAdminRunSportsSurvivor', 'saveConfidencePicksBatch', 'saveSurvivorPick'].forEach(forbidden => {
  assert(!organization.includes(forbidden), `R2 navigation layer must not own protected write path: ${forbidden}`);
});

assert(loader.includes('./js/adminSportsGameOrganizationR2.js?release=admin-sports-game-organization-r2'), 'base-loaded NFL helper must load the R2 organization script');
assert(loader.includes('data-pattc-admin-sports-r2'), 'R2 loader must prevent duplicate script injection');

console.log('PASS admin sports / game manager organization R2');
