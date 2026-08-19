const assert = require('assert');
const fs = require('fs');

const manager = fs.readFileSync('frontend/js/pages/adminAppearance.js', 'utf8');
const engine = fs.readFileSync('backend/engines/AppearanceEngine.js', 'utf8');
const sw = fs.readFileSync('frontend/sw.js', 'utf8');
const pwa = fs.readFileSync('frontend/js/pwa.js', 'utf8');

// Newly created packs must be visible immediately in both editor and game assignment selectors.
assert(manager.includes('pendingGameImagePackId'));
assert(manager.includes('pendingImagePackRow'));
assert(manager.includes('newly created'));
assert(manager.includes('has not been applied to the game yet'));
assert(manager.includes('ADMIN_APPEARANCE_STATE.pendingGameImagePackId || assignment.ImagePackId || currentPack'));

// The server-confirmation pass retries rather than silently losing a just-created pack.
assert(manager.includes('for (let attempt = 0; attempt < 4; attempt++)'));
assert(manager.includes('setTimeout(resolve, 250 * (attempt + 1))'));
assert(manager.includes('The pack is visible locally, but the server list has not confirmed it yet'));

// Save/duplicate flush the spreadsheet and return the actual persisted pack row.
assert(engine.includes('SpreadsheetApp.flush();'));
assert(engine.includes('return { success: true, packId: packId, pack: savedPack }'));
assert(engine.includes('copiedItems: items.length, sourcePackId: sourcePackId, pack: savedPack'));

// New frontend bundle must evict stale pack-management code on mobile/PWA.
assert(sw.includes('v1217y-pack-visibility'));
assert(pwa.includes('v1217y-pack-visibility'));

console.log('PASS appearance pack visibility v1.2.17y');
