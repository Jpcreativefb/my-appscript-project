const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const picks = read("frontend/js/pages/picks.js");
const admin = read("frontend/js/pages/adminAppearance.js");
const api = read("frontend/js/api.js");
const apiMirror = read("frontend/api.js");
const pwa = read("frontend/js/pwa.js");
const sw = read("frontend/sw.js");
const app = read("frontend/js/app.js");

assert(api === apiMirror, "Frontend API mirrors are not synchronized.");

assert(
  picks.includes('questionType === "team-matchup" || scoringEngine === "sports" || sportsGameId'),
  "Confidence runtime does not infer Sports team entities."
);
assert(
  picks.includes("match = activeRows.find(rowMatchesId_)"),
  "Confidence Image Pack resolver does not fall back to stable EntityId."
);
assert(
  picks.includes("rowMatchesName_"),
  "Confidence Image Pack resolver lacks compatibility fallback for legacy entity names."
);
assert(
  picks.includes("nominee.img") && picks.includes("nominee.logoUrl"),
  "Confidence image fallback does not support existing nominee image shapes."
);
assert(
  api.includes("appearanceNonce: Date.now()"),
  "Game Appearance reads may still reuse a stale cached response."
);
assert(
  admin.includes('imageUrl: upload.thumbnailUrl || ""'),
  "Appearance upload does not persist the public uploaded image URL."
);
assert(
  admin.includes('questionType === "team-matchup" || scoringEngine === "sports" || sportsGameId'),
  "Appearance Manager does not infer Sports team entities consistently."
);
assert(pwa.includes("v1217i-appearance-runtime"), "PWA version was not bumped.");
assert(sw.includes("awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts"), "Service-worker cache was not bumped.");
assert(app.includes("v1217i-appearance-runtime"), "App route asset version was not bumped.");

console.log("PASS: Appearance runtime image resolution v1.2.17i");
