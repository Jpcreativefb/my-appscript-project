const fs = require("fs");
const assert = require("assert");
const bridge = fs.readFileSync("functions/api/app.js", "utf8");
assert(!bridge.includes("SURVIVOR_R3_PREVIEW_READ_ACTIONS"), "Preview routing must not depend on a legacy action allowlist");
assert(bridge.includes("const upstreamUrl = productionRequest"));
assert(bridge.includes("APPS_SCRIPT_PREVIEW_API_URL"));
assert(bridge.includes('"adminBuildNflSeasonPack"'), "Shared-sheet season setup write remains blocked");
console.log("PATTC NFL Sports Pack Preview Route tests: PASS");
