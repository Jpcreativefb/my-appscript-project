const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const storage = fs.readFileSync(
  path.join(root, 'backend/engines/NormalizedQuestionStorageEngine.js'),
  'utf8'
);
const categories = fs.readFileSync(
  path.join(root, 'backend/admin/AdminCategories.js'),
  'utf8'
);
const backendApi = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const setup = fs.readFileSync(
  path.join(root, 'frontend/js/pages/adminGameSetup.js'),
  'utf8'
);
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(storage.includes('function normalizedStorageGetQuestionSetup_(gameId, options)'));
assert(storage.includes('bypassRuntimeCache: options.bypassRuntimeCache === true'));
assert(storage.includes('trustIndex: options.trustIndex !== false'));
assert(storage.includes('The Game Setup editor is an administrative source-of-truth view.'));
assert(storage.includes('bypassRuntimeCache: true'));
assert(storage.includes('trustIndex: false'));
assert(categories.includes('typeof normalizedStorageClearCaches_'));
assert(categories.includes('function adminDeleteNominee(payload)'));
assert(categories.includes('function adminCatAnswerRowsInSheet_'));
assert(categories.includes('Use Archive Answer to preserve history.'));
assert(backendApi.includes('"adminDeleteNominee"'));
assert(backendApi.includes('adminDeleteNominee('));
assert(frontendApi.includes('async function apiAdminDeleteNominee'));
assert(setup.includes('Delete Answer'));
assert(setup.includes('Archive Answer'));
assert(setup.includes('async function adminSetupDeleteNominee'));
assert(setup.includes('apiAdminDeleteNominee(gameId, categoryId, nomineeId)'));
assert(sw.includes('awards-app-v263-canonical-question-scoremode'));

console.log('game-setup-canonical-reload-and-answer-delete-tests: PASS');
