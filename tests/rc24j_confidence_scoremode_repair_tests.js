const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
function read(rel){ return fs.readFileSync(path.join(root, rel), "utf8"); }
function ok(cond, msg){ if(!cond) throw new Error(msg); }
const categories = read("backend/engines/CategoriesEngine.js");
ok(categories.includes('scoreMode:\n      headers.indexOf("ScoreMode")'), "Categories ScoreMode column must be mapped");
ok(categories.includes('col.scoreMode > -1'), "Categories ScoreMode row must be read");
ok(categories.includes('config.scoreMode ||\n          "correct-pick"'), "legacy config fallback must remain");
const startup = read("backend/engines/AppDataEngine.js");
ok(startup.includes("function appRepairSportsConfidenceScoreMode_"), "startup repair helper missing");
ok(startup.includes('id.indexOf("sports-confidence-") !== 0'), "repair must be limited to Sports Confidence ids");
ok(startup.includes('copy.scoreMode = "confidence-points"'), "Sports Confidence repair must set confidence-points");
const builder = read("backend/engines/SportsConfidenceBuilderEngine.js");
ok(builder.includes('sportsWagerSetIfExists_(row, col, "ScoreMode", "confidence-points")'), "builder must keep writing confidence-points");

const wager = read("backend/engines/SportsWagerEngine.js");
ok(wager.includes('cleanCategoryId.indexOf("sports-confidence-") === 0'), "Sports refresh must recognize generated Confidence category ids");
ok(wager.includes('isConfidenceMatchup ? "confidence-points" : "wager"'), "Sports refresh must preserve confidence-points while ordinary Wager remains wager");
const html = read("frontend/app.html");
ok(html.includes("v1219rc24j-confidence-scoremode-repair-r1") || html.includes("v1219rc24k-nfl-player-experience-r1"), "RC24J/RC24K frontend marker missing");
const appA = read("frontend/js/app.js");
const appB = read("frontend/app.js");
ok(appA === appB, "frontend app mirrors must match");
ok(appA.includes('pattcStartupPayload:rc24j:'), "RC24J browser startup cache key missing");
ok(appA.includes("rc24j-confidence-scoremode-repair-r1") || appA.includes("rc24k-nfl-player-experience-r1"), "RC24J/RC24K route hotfix marker missing");
console.log("RC24J Confidence ScoreMode repair tests: PASS");
