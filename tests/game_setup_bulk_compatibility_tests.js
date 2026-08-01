const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'frontend/js/pages/adminGameSetup.js'), 'utf8');

assert(api.includes('/Unknown action:\\s*adminBulkUpdateGameSetup/i'));
assert(api.includes('apiAdminUpdateCategory({'));
assert(api.includes('apiAdminUpdateNominee({'));
assert(api.includes('All Game Setup changes saved using compatibility mode.'));
assert(api.includes('compatibilityFallback: true'));
assert(setup.includes('The app used compatibility save mode because the Apps Script deployment is one version behind.'));
assert(setup.includes('id="categoryTitle_${categoryId}"'));
assert(setup.includes('id="nomineeTitle_${categoryId}_${nomineeId}"'));
assert(setup.includes('adminSetupSyncQuestionDisplay_(categoryId);'));
assert(setup.includes('adminSetupSyncAnswerDisplay_(categoryId, nomineeId);'));

console.log('game-setup-bulk-compatibility-tests: PASS');
