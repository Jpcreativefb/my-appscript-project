const fs = require("fs");
const assert = require("assert");

function read(path) { return fs.readFileSync(path, "utf8"); }

const backend = read("backend/engines/SportsSurvivorEngine.js");
const survivor = read("frontend/js/pages/survivor.js");
const tf = read("frontend/js/pages/teamFantasy.js");
const picks = read("frontend/js/pages/picks.js");

assert(backend.includes("NFL_PLAYER_EXPERIENCE_RECOVERY_R1"));
assert(backend.includes('settings.mode === "manual-elimination"'));
assert(backend.includes("survivorSportsRuntimeEvidence_(cleanGameId)"));
assert(backend.includes('settings.mode = "sports-survivor"'));
assert(backend.includes("settings.runtimeRecoveredMode = true"));

assert(survivor.includes("NFL_PLAYER_EXPERIENCE_RECOVERY_R1"));
assert(survivor.includes('return layout !== "legacy";'));
assert(!survivor.includes('return ["clean", "current", "classic", "legacy"].indexOf(layout) === -1;'));

assert(tf.includes("NFL_PLAYER_EXPERIENCE_RECOVERY_R1"));
assert(tf.includes('return layout !== "legacy";'));
assert(tf.includes('if (!sportsRichTfEnabled_(state)) return html;'));

assert(picks.includes("NFL_PLAYER_EXPERIENCE_RECOVERY_R1"));
assert(picks.includes('return layout !== "legacy";'));
assert(picks.includes('const rich = typeof sportsRichConfidenceEnabled_ === "function"'));
assert(picks.includes('if (!sportsRichConfidenceEnabled_())'));

console.log("PATTC NFL Player Experience Recovery R1 tests: PASS");
