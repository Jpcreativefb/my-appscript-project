const assert = require('assert');
const fs = require('fs');

const manager = fs.readFileSync('frontend/js/pages/adminAppearance.js', 'utf8');
const css = fs.readFileSync('frontend/css/appearance.css', 'utf8');
const engine = fs.readFileSync('backend/engines/AppearanceEngine.js', 'utf8');
const adminImages = fs.readFileSync('backend/admin/AdminImages.js', 'utf8');
const router = fs.readFileSync('backend/Api.js', 'utf8');
const api = fs.readFileSync('frontend/js/api.js', 'utf8');

// Duplicate/create must immediately adopt the newly-created pack in the editor.
assert(manager.includes('function adminAppearanceAdoptNewPackLocally_'));
assert(manager.includes('function adminAppearanceSyncSelectedPack_'));
assert(manager.includes('It is selected and ready to edit'));
assert(api.includes('async function apiAdminGetAppearanceDashboard(gameId, forceFresh)'));

// Image source workflow is explicit and camera friendly.
assert(manager.includes('Use External URL'));
assert(manager.includes('Import URL to Drive'));
assert(manager.includes('Choose Photo'));
assert(manager.includes('Take Photo'));
assert(manager.includes('capture="environment"'));
assert(manager.includes('function adminAppearanceChooseMedia_'));
assert(manager.includes('adminAppearanceImportPackUrl_'));
assert(manager.includes('adminAppearanceImportOverrideUrl_'));
assert(manager.includes('sourceType: "external-url"'));
assert(manager.includes('sourceType: "drive-import"'));
assert(manager.includes('sourceType: "drive-upload"'));

// Internet import uses the existing Drive-backed admin image engine.
assert(api.includes('async function apiAdminImportImageFromUrl'));
assert(router.includes('action === "adminImportImageFromUrl"'));
assert(adminImages.includes('function adminImportImageFromUrl'));
assert(adminImages.includes('folder.createFile'));

// Source metadata survives reloads and Image Pack duplication.
assert(engine.includes('"SourceType"'));
assert(engine.includes('"SourceUrl"'));
assert(engine.includes('SourceType: appearanceString_(row.SourceType)'));
assert(engine.includes('SourceUrl: appearanceString_(row.SourceUrl)'));
assert(engine.includes('SourceType: appearanceString_(payload.sourceType || payload.SourceType)'));
assert(engine.includes('SourceUrl: appearanceString_(payload.sourceUrl || payload.SourceUrl)'));
assert(manager.includes('Drive Upload'));
assert(manager.includes('Drive Import'));
assert(manager.includes('External URL'));

// Pack/theme action bars are intentionally compact.
assert(css.includes('compact pack actions + clear image source workflow'));
assert(css.includes('.appearance-media-actions'));
assert(css.includes('.appearance-source-chip'));
assert(css.includes('min-height:25px'));

console.log('PASS appearance pack media workflow v1.2.17x');
