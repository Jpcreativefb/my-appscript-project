const fs = require("fs");
const assert = require("assert");

const bridge = fs.readFileSync("functions/api/app.js", "utf8");
const setBlock = bridge.match(
  /const SURVIVOR_R3_PREVIEW_READ_ACTIONS = new Set\(\[([\s\S]*?)\]\);/
);

assert(setBlock, "Preview routing set missing");
assert(setBlock[1].includes('"getSurvivorState"'));
assert(setBlock[1].includes('"getSurvivorTeamSchedule"'));
assert(setBlock[1].includes('"adminBuildNflSeasonPack"'));
assert(bridge.includes("SURVIVOR_R3_PREVIEW_READ_ACTIONS.has(action)"));
assert(bridge.includes("SURVIVOR_R3_PREVIEW_API_URL"));

console.log("PATTC NFL Sports Pack Preview Route tests: PASS");
