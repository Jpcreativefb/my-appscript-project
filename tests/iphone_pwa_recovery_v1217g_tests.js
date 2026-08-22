const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const pwa = read("frontend/js/pwa.js");
const sw = read("frontend/sw.js");
const appHtml = read("frontend/app.html");
const indexHtml = read("frontend/index.html");

assert(pwa.includes('v1217g-iphone-pwa-recovery'), "PWA registration version was not bumped for v1.2.17g.");
assert(pwa.includes('registration.update()'), "PWA does not force an immediate service-worker update check.");
assert(pwa.includes('controllerchange'), "PWA does not reload once when the replacement worker takes control.");
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), "Service-worker cache was not bumped for v1.2.17g.");
assert(sw.includes('{ ignoreSearch: true }'), "Versioned asset requests cannot fall back to core cached assets.");
assert(sw.includes('return cache.match("./app.html")'), "Authenticated app navigation does not fall back to app.html.");
assert(appHtml.includes('js/pwa.js?v=v1217g-iphone-pwa-recovery'), "Authenticated shell does not request the v1.2.17g PWA bootstrap.");
assert(indexHtml.includes('js/pwa.js?v=v1217g-iphone-pwa-recovery'), "Login shell does not request the v1.2.17g PWA bootstrap.");
assert(appHtml.includes('js/api.js?v=v1217g-iphone-pwa-recovery'), "Authenticated shell does not bust the API client cache.");
assert(indexHtml.includes('js/api.js?v=v1217g-iphone-pwa-recovery'), "Login shell does not bust the API client cache.");

console.log("PASS: iPhone PWA recovery v1.2.17g");
