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
assert(sw.includes("v1217h-appearance-images"), "Service-worker cache was not bumped for v1.2.17h.");
assert(app.includes("v1217h-appearance-images"), "Route module cache was not bumped for the Appearance Manager fix.");

console.log("PASS: Appearance image upload + pack display v1.2.17h");
