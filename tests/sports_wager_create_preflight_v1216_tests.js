const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sports = fs.readFileSync(path.join(root, "frontend/js/sports.js"), "utf8");
const cats = fs.readFileSync(path.join(root, "backend/admin/AdminCategories.js"), "utf8");
const sportsHtml = fs.readFileSync(path.join(root, "frontend/sports.html"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const singleStart = sports.indexOf("function buildSportsWagerPayload_(");
const singleEnd = sports.indexOf("function getSelectedSportsWagerGames_", singleStart);
const singleBlock = sports.slice(singleStart, singleEnd > singleStart ? singleEnd : singleStart + 5000);
assert(singleStart >= 0, "single wager payload builder missing");
assert(!/refreshEngineFirst\s*:\s*[\"']true[\"']/.test(singleBlock), "single wager create must not force Sports Engine refresh");

const bulkStart = sports.indexOf("async function createSelectedSportsWagers(");
const bulkEnd = sports.indexOf("function renderCreateWagerButton", bulkStart);
const bulkBlock = sports.slice(bulkStart, bulkEnd);
assert(bulkStart >= 0 && bulkEnd > bulkStart, "bulk wager create block missing");
assert(!/refreshEngineFirst\s*:\s*[\"']true[\"']/.test(bulkBlock), "bulk wager create must not force Sports Engine refresh");

const setupStart = cats.indexOf("function adminGetGameSetup(payload)");
const setupEnd = cats.indexOf("return {", cats.indexOf("const categories =", setupStart));
const setupBlock = cats.slice(setupStart, setupEnd > setupStart ? setupEnd : setupStart + 40000);
assert(/sportsGameId\s*:\s*\n\s*settingsCol\.sportsGameId/.test(setupBlock), "admin game setup must expose sportsGameId");
assert(/espnEventId\s*:\s*\n\s*settingsCol\.espnEventId/.test(setupBlock), "admin game setup must expose espnEventId");
assert(/sportsMarket\s*:\s*\n\s*settingsCol\.sportsMarket/.test(setupBlock), "admin game setup must expose sportsMarket");
assert(/sportsLeague\s*:\s*\n\s*settingsCol\.sportsLeague/.test(setupBlock), "admin game setup must expose sportsLeague");

assert(sportsHtml.includes("sports.js?v=330-sports-wager-create-preflight-v1216"), "sports asset cache-buster not updated");

console.log("PASS: Sports wager create/preflight hotfix regression");
