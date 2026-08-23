const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const appData = fs.readFileSync(path.join(root, "backend/engines/AppDataEngine.js"), "utf8");
const app = fs.readFileSync(path.join(root, "frontend/js/app.js"), "utf8");
const preflight = fs.readFileSync(path.join(root, "backend/admin/AdminPreflight.js"), "utf8");

assert(
  /"team-fantasy"/.test(appData),
  "Dashboard mode resolver must recognize team-fantasy explicitly."
);
assert(
  appData.includes('return "Team Fantasy Football";'),
  "Dashboard must label Team Fantasy correctly."
);
assert(
  appData.includes('"Continue Lineup"') && appData.includes('"Make Lineup"'),
  "Dashboard action must be lineup-oriented."
);
assert(
  (appData.match(/progressLabel: "Weekly lineup"/g) || []).length >= 2,
  "Lite and full Team Fantasy progress must bypass generic Categories."
);
assert(
  appData.includes('return { category: "sports", group: "NFL" };'),
  "Team Fantasy must route to Sports / NFL hub."
);
assert(
  appData.includes('lockLabel = "Locks by NFL kickoff";'),
  "Lite Home payload must use NFL kickoff locking."
);
assert(
  appData.includes('return "Locks by NFL kickoff";'),
  "Full Dashboard lock helper must use NFL kickoff locking."
);
assert(
  app.includes('if (gameType === "team-fantasy")') &&
    app.includes('await navigate("team-fantasy")'),
  "Player router must send Team Fantasy to its dedicated page."
);
assert(
  app.includes('"team-fantasy": ["teamFantasy"]'),
  "Team Fantasy player module must remain registered."
);
assert(
  preflight.includes('adminPreflightGameType_(game) === "team-fantasy"'),
  "v1.2.18p Team Fantasy fast preflight must remain installed."
);
console.log("Team Fantasy v1.2.18q2 player routing tests passed.");
