const fs = require("fs");
const assert = require("assert");

const be = fs.readFileSync("backend/engines/NflSeasonPackEngine.js", "utf8");

assert(be.includes('NFL_SEASON_PACK_VERSION_ = "nfl-sports-pack-r1.2"'));
assert(be.includes("function nflSeasonPackEnsureNomineesBulk_"));
assert(be.includes("adminBulkCreateNominees"));
assert(be.includes("itemsJSON:JSON.stringify(items)"));
assert(be.includes('tasks.push({type:"game"'));
assert(be.includes('type:"category"'));
assert(!be.includes('tasks.push({type:"nominee"'));
assert(be.includes("Math.min(2,requestedBatch)"));
assert(be.includes("nflSeasonPackEnsureNomineesBulk_(task.payload)"));
assert(be.includes("nextCursor"));

console.log("PATTC NFL Sports Pack Fast Builder R1.2 tests: PASS");
