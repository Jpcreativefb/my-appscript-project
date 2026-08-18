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
assert(sw.includes("v1217i-appearance-runtime"), "Service-worker cache was not bumped.");
assert(app.includes("v1217i-appearance-runtime"), "App route asset version was not bumped.");

console.log("PASS: Appearance runtime image resolution v1.2.17i");
