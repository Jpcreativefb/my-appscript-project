const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const admin = read("frontend/js/pages/adminAppearance.js");
const api = read("frontend/js/api.js");
const apiMirror = read("frontend/api.js");
const pwa = read("frontend/js/pwa.js");
const sw = read("frontend/sw.js");
const app = read("frontend/js/app.js");

assert(api === apiMirror, "Frontend API mirrors are not synchronized.");
assert(admin.includes("adminAppearancePrepareUpload_"), "Appearance uploads do not prepare/optimize large images.");
assert(admin.includes('canvas.toBlob'), "Appearance image optimization does not encode a smaller browser image.");
assert(admin.includes('"image/webp"'), "Appearance image optimization does not use the supported WebP upload format.");
assert(admin.includes('accept="image/*"'), "Appearance file picker does not accept iPhone/browser image formats for conversion.");
assert(admin.includes("adminAppearanceReloadDashboardOnly_"), "Appearance uploads still reload the entire game setup after each image.");
assert(admin.includes("Saving to Image Pack"), "Appearance Image Pack upload does not expose completion progress.");
assert(admin.includes("upload.fileId"), "Appearance Image Pack upload does not persist the uploaded Drive file ID.");

assert(api.includes('return api("adminSaveAppearanceImagePackItem"'), "Image Pack metadata still routes through the upload Worker.");
assert(api.includes('return api("adminSaveGameAppearance"'), "Game Appearance assignment still routes through the upload Worker.");
assert(api.includes("apiAppearanceDirectPayload_"), "Appearance direct writes do not serialize theme payloads safely.");
assert(api.includes("JSON.stringify(next.theme)"), "Theme object is not serialized before direct Apps Script transport.");

assert(pwa.includes("v1217h-appearance-images"), "PWA registration was not bumped for v1.2.17h.");
assert(sw.includes("awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts"), "Service-worker cache was not bumped for v1.2.17h.");
assert(app.includes("v1217h-appearance-images"), "Route module cache was not bumped for the Appearance Manager fix.");

console.log("PASS: Appearance image upload + pack display v1.2.17h");
