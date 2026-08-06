const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const manager = fs.readFileSync(path.join(root, "frontend/js/pages/adminRealityTv.js"), "utf8");
const appJs = fs.readFileSync(path.join(root, "frontend/js/app.js"), "utf8");
const appCompat = fs.readFileSync(path.join(root, "frontend/app.js"), "utf8");

assert(!/\bshowLoader\s*\(/.test(manager), "Reality TV in-page actions must not open the full-page loader");
assert(!/\bhideLoader\s*\(/.test(manager), "Reality TV in-page actions must not manage the route loader");
assert(manager.includes('navigate("admin-reality-tv", { suppressLoader: true })'), "Fallback manager reloads must suppress the full-page overlay");
assert(manager.includes('await adminRealityTvRefreshSeasonDetails_(seasonId'), "Season actions must refresh the open season in place");
assert(appJs.includes('const usePageLoader = options.suppressLoader !== true;'), "Main app navigation must support suppressLoader");
assert(appJs.includes('if (usePageLoader) hideLoader();'), "Main app must not hide a loader it did not open");
assert.strictEqual(appJs, appCompat, "Both app loader copies must remain synchronized");
assert(appJs.includes('APP_ROUTE_HOTFIX_VERSION = \"v1118-reality-tv-bulk-question-pack\"'), "Route hotfix version must force fresh admin modules");
assert(fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8').includes('hotfix=v1118-reality-tv-bulk-question-pack'), "App shell must force a fresh app.js request");

console.log("Reality TV inline admin action v1.1.13 tests passed.");
