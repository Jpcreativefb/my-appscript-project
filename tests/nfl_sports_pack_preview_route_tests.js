const fs = require("fs");
const assert = require("assert");

const bridge = fs.readFileSync("functions/api/app.js", "utf8");
const setBlock = bridge.match(
  /const SURVIVOR_R3_PREVIEW_READ_ACTIONS = new Set\(\[([\s\S]*?)\]\);/
);

assert(setBlock, "Preview routing set missing");
assert(!setBlock[1].includes('"getSurvivorState"'));
assert(setBlock[1].includes('"getSurvivorTeamSchedule"'));
assert(setBlock[1].includes('"adminBuildNflSeasonPack"'));
assert(bridge.includes("SURVIVOR_R3_PREVIEW_READ_ACTIONS.has(action)"));
assert(bridge.includes('const APPS_SCRIPT_API_URL ='));
assert(bridge.includes('const SURVIVOR_R3_PREVIEW_API_URL ='));
assert(/const APPS_SCRIPT_API_URL\s*=\s*"https:\/\/script\.google\.com\/macros\/s\//.test(bridge));
assert(/const SURVIVOR_R3_PREVIEW_API_URL\s*=\s*"https:\/\/script\.google\.com\/macros\/s\//.test(bridge));

console.log("PATTC NFL Sports Pack Preview Route tests: PASS");
