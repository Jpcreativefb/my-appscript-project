const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const cleanup = read('frontend/js/pages/adminGamesRc24e.js');
const admin = read('frontend/js/pages/admin.js');
const teamFantasy = read('frontend/js/pages/adminTeamFantasy.js');
const app = read('frontend/js/app.js');

assert(!fs.existsSync(path.join(root, 'frontend/js/pages/adminGamesRc24eBase.js')), 'duplicate base module must be removed');
assert(!cleanup.includes('adminGamesRc24eBase.js'), 'active Manage Games source must not depend on a duplicate base module');
assert(cleanup.includes('ADMIN_GAMES_DESIGN_R1_START'), 'R1 logic must live directly in active Manage Games source');
assert(cleanup.includes('window.setTimeout(adminManageGamesApplyCleanupR1_, 0)'), 'active Manage Games renderer must activate R1 UI behavior');

const weightInput = /<input name="parentContributionWeight"[^>]*step="([^"]+)"[^>]*>/m.exec(admin);
assert(weightInput, 'actual parentContributionWeight input not found');
assert.strictEqual(weightInput[1], '0.05', 'actual parentContributionWeight input must use step 0.05');
const units = 1.25 / Number(weightInput[1]);
assert(Math.abs(units - Math.round(units)) < 1e-9, '1.25 must be valid for the actual 0.05 step');

const helperStart = cleanup.indexOf('/* ADMIN_GAMES_DESIGN_R1_START */');
const helperEnd = cleanup.indexOf('/* ADMIN_GAMES_DESIGN_R1_END */');
assert(helperStart >= 0 && helperEnd > helperStart, 'R1 helper block missing');
const helperSource = cleanup.slice(helperStart, helperEnd);
const sandbox = { document: { querySelector(){ return null; } }, adminGamesEscapeHtml: String };
vm.createContext(sandbox);
vm.runInContext(helperSource, sandbox);
assert.strictEqual(sandbox.adminManageGamesInferHubFamilyR1_({gameId:'emmys-2027', name:'Emmys 2027', hubFamily:'General'}), 'Awards');
assert.strictEqual(sandbox.adminManageGamesInferScopeR1_({gameId:'nfl-confidence-2026', name:'NFL Confidence', year:2026}), 'sports:nfl:2026');
assert.strictEqual(sandbox.adminManageGamesInferScopeR1_({gameId:'traitors-s5', name:'The Traitors Season 5'}), 'reality:traitors:s5');
assert.strictEqual(sandbox.adminManageGamesInferScopeR1_({gameId:'oscars-2027', name:'Oscars 2027'}), 'awards:oscars:2027');
const legacy = {gameId:'legacy-game', name:'Legacy Game', customField:'preserve-me'};
const before = JSON.stringify(legacy);
sandbox.adminManageGamesInferHubFamilyR1_(legacy);
sandbox.adminManageGamesInferHubGroupR1_(legacy);
sandbox.adminManageGamesInferScopeR1_(legacy);
assert.strictEqual(JSON.stringify(legacy), before, 'location inference must not mutate legacy data');

const conditionalStart = admin.indexOf('function adminUpdateGameTypeSections(form) {');
const conditionalEnd = admin.indexOf('\nfunction adminUpdateHeroSource(form)', conditionalStart);
assert(conditionalStart >= 0 && conditionalEnd > conditionalStart, 'real conditional section function missing');
const conditionalSource = admin.slice(conditionalStart, conditionalEnd);
const sections = [
  {dataset:{gameTypes:'survivor'}, hidden:false},
  {dataset:{gameTypes:'confidence mixed'}, hidden:false},
  {dataset:{gameTypes:'wager racing-wager mixed'}, hidden:false}
];
const conditionalSandbox = {
  adminCanonicalGameType_: value => String(value || '').toLowerCase(),
  adminUpdateHybridScoringSections(){},
  adminUpdateSurvivorRuleFields(){},
  adminUpdateGameTypeSummary_(){},
  adminUpdateHeroSource(){}
};
vm.createContext(conditionalSandbox);
vm.runInContext(conditionalSource, conditionalSandbox);
const fakeForm = {
  type:{value:'survivor'},
  gameFormat:{value:''},
  querySelectorAll(selector){
    if (selector === '[data-game-types]') return sections;
    return [];
  }
};
conditionalSandbox.adminUpdateGameTypeSections(fakeForm);
assert.strictEqual(sections[0].hidden, false, 'Survivor section must remain visible for Survivor');
assert.strictEqual(sections[1].hidden, true, 'Confidence section must be hidden for Survivor');
assert.strictEqual(sections[2].hidden, true, 'Wager section must be hidden for Survivor');
assert(cleanup.includes('adminUpdateGameTypeSections(form)'), 'active Manage Games must invoke the real conditional section path');
assert(!cleanup.includes('fieldAppliesToGame'), 'unused field-level classifier must be removed');

assert(admin.includes('adminLegacySetSaving_(\n    form,\n    true'), 'real save path must enter authoritative Saving state');
assert(admin.includes('adminSetGameFormSaveState_(form, "saving", "Saving changes...")'), 'Saving feedback must come from authoritative save state');
assert(admin.includes('adminShowGameFormSaved_(form, successMessage);'), 'Saved feedback must follow authoritative success');
assert(admin.includes('adminShowGameFormError_(form, saveErrorMessage);'), 'actual save error must reach inline feedback');
assert(admin.includes('options.navigateAfterSave === true'), 'normal Save must stay on the current Admin page');
assert(!helperSource.includes('addEventListener("click"'), 'R1 must not fake save status with a generic click handler');
assert(!helperSource.includes("addEventListener('click'"), 'R1 must not fake save status with a generic click handler');

assert(admin.includes('data-admin-games-design-r1="1"'), 'Games & Design hierarchy missing');
assert(admin.includes('Sports → NFL → 2026'), 'NFL 2026 hierarchy missing');
assert(admin.includes("onclick=\"navigate('admin-team-fantasy')\">Team Fantasy Football"), 'Team Fantasy must route from Games & Design to its existing manager');
assert(app.includes('"admin-team-fantasy": ["admin", "adminUi", "adminTeamFantasy"]'), 'existing Team Fantasy manager route must remain authoritative');
assert(teamFantasy.includes('tf-admin-breadcrumbs'), 'Team Fantasy breadcrumb missing');
assert(teamFantasy.includes('← Back to NFL'), 'Team Fantasy parent return path missing');
assert(!teamFantasy.includes("card.id = 'teamFantasyAdminLauncher'"), 'legacy duplicate root Team Fantasy launcher must be removed');
assert(!teamFantasy.includes('root.appendChild(card)'), 'Team Fantasy manager must not create a duplicate landing control surface');

['Create and configure games, seasons, hubs','Review, validate, approve, or manually enter results','Manage users, administrators, league membership','Review automation health, trigger status'].forEach(text => {
  assert(admin.includes(text), 'missing plain-English Admin section description: ' + text);
});
assert(admin.includes('Manage colors, icons, labels, navigation appearance, and branding.'), 'Appearance description missing');
assert(admin.includes('Manage page layout, spacing, sizing, and positioning.'), 'Visual Studio description missing');
const toolsStart = admin.indexOf('data-admin-system-data-tools-r1="1"');
const toolsEnd = admin.indexOf('<h2>🛠 Advanced / Repair</h2>', toolsStart);
assert(toolsStart >= 0 && toolsEnd > toolsStart, 'System / Data Tools section missing');
const tools = admin.slice(toolsStart, toolsEnd);
assert(tools.includes('READ ONLY'), 'System / Data Tools must identify read-only diagnostics');
['adminSetupNormalizedStorage','adminPermanentPurge','apiAdminUpdateGame(','deleteSheet'].forEach(token => {
  assert(!tools.includes(token), 'System / Data Tools must not expose destructive R1 action: ' + token);
});
assert(tools.includes('Primary Hub + Primary League + Season'), 'future multi-membership model note missing');

console.log('Admin / Games & Design R1 correction tests: PASS');
