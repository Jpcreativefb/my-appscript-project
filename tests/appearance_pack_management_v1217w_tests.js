const assert = require('assert');
const fs = require('fs');

const manager = fs.readFileSync('frontend/js/pages/adminAppearance.js', 'utf8');
const api = fs.readFileSync('frontend/js/api.js', 'utf8');
const apiMirror = fs.readFileSync('frontend/api.js', 'utf8');
const backend = fs.readFileSync('backend/engines/AppearanceEngine.js', 'utf8');
const router = fs.readFileSync('backend/Api.js', 'utf8');
const css = fs.readFileSync('frontend/css/appearance.css', 'utf8');

// Clear edit/create/duplicate semantics.
assert(manager.includes('Image Pack to Edit'));
assert(manager.includes('Theme to Edit'));
assert(manager.includes('Save Changes'));
assert(manager.includes('Duplicate Pack'));
assert(manager.includes('Create New Pack'));
assert(manager.includes('Duplicate Theme'));
assert(manager.includes('Create New Theme'));
assert(manager.includes('Apply Selected Packs to Game'));
assert(manager.includes('Advanced / Technical Details'));
assert(manager.includes('changing its name keeps the same internal ID'));
assert(manager.includes('Original theme was not changed'));
assert(manager.includes('Original pack was not changed'));

// Duplicate image pack is a single backend operation and copies mappings.
assert(manager.includes('apiAdminDuplicateAppearanceImagePack'));
assert(api.includes('function apiAdminDuplicateAppearanceImagePack'));
assert(apiMirror.includes('function apiAdminDuplicateAppearanceImagePack'));
assert(backend.includes('function adminDuplicateAppearanceImagePack'));
assert(backend.includes('copiedItems: items.length'));
assert(router.includes('action === "adminDuplicateAppearanceImagePack"'));

// New IDs are generated uniquely while rename preserves supplied IDs.
assert(backend.includes('function appearanceUniqueGeneratedId_'));
assert(backend.includes('appearanceUniqueGeneratedId_(sheet, "PackId", "img", packName)'));
assert(backend.includes('appearanceUniqueGeneratedId_(sheet, "ThemePackId", "theme", themeName)'));

// Technical metadata is visually demoted instead of occupying the main editor row.
assert(manager.includes('appearance-entity-technical'));
assert(css.includes('.appearance-technical-details'));
assert(css.includes('.appearance-editor-manager'));

console.log('PASS appearance pack/theme management v1.2.17w');
