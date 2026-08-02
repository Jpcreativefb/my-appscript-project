const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const setup = fs.readFileSync(
  path.join(root, 'frontend/js/pages/adminGameSetup.js'),
  'utf8'
);
const categories = fs.readFileSync(
  path.join(root, 'backend/admin/AdminCategories.js'),
  'utf8'
);
const css = fs.readFileSync(
  path.join(root, 'frontend/css/styles.css'),
  'utf8'
);
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(setup.includes('ADMIN_SETUP_UI_ACTION_KEY'));
assert(setup.includes('adminSetupRememberUiAction_'));
assert(setup.includes('adminSetupScheduleUiActionReveal_'));
assert(setup.includes('Question cloned'));
assert(setup.includes('JUST CLONED'));
assert(setup.includes('Clone of ${adminSetupEscapeHtml(cloneSourceCategoryId)}'));
assert(setup.includes('id="answersPanel_${categoryId}"'));
assert(setup.includes('admin-new-answer-row'));
assert(setup.includes('admin-answer-quick-delete'));
assert(setup.includes('event.preventDefault(); event.stopPropagation(); adminSetupDeleteNominee'));
assert(setup.includes('type: "delete-answer"'));
assert(setup.includes('The remaining answers are shown below.'));

assert(categories.includes('Clone provenance is stored in the normalized Questions PayloadJSON.'));
assert(categories.includes('CloneSourceGameId'));
assert(categories.includes('CloneSourceCategoryId'));
assert(categories.includes('ClonedAt'));
assert(categories.includes('sourceSystem: "admin-clone"'));
assert(categories.includes('map[categoryId].cloneInfo = cloneInfoByCategory[categoryId] || null;'));

assert(css.includes('.admin-setup-action-banner'));
assert(css.includes('.admin-clone-origin-badge'));
assert(css.includes('.admin-answer-quick-delete'));
assert(css.includes('.admin-new-answer-row'));
assert(sw.includes('awards-app-v264-question-mode-table-repair-v265-game-setup-visibility'));

console.log('game-setup-clone-answer-visibility-tests: PASS');
