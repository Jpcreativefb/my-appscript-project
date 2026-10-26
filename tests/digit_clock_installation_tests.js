const assert = require("assert");
const fs = require("fs");
const read = p => fs.readFileSync(p, "utf8");
assert(JSON.parse(read("frontend/_routes.json")).include.includes("/api/digit-clock"));
assert(read("frontend/js/pages/dashboard.js").includes('href="./digit-clock.html"'));
assert(read("frontend/js/pages/admin.js").includes("./digit-clock.html#digit-clock-admin"));
assert(read("frontend/sports.html").includes("./digit-clock.html"));
assert(read("frontend/sw.js").includes('if (url.pathname === "/api/digit-clock") return;'));
for (const asset of ["digit-clock.html", "css/digit-clock.css", "js/digitClockEngine.js", "js/digitClockSports.js", "js/digitClockCompetition.js", "js/digitClockLeagues.js", "js/digitClock.js"]) {
  assert(fs.existsSync(`frontend/${asset}`));
  assert(read("frontend/sw.js").includes(`"./${asset}"`));
}
assert(read("frontend/app.html").includes("-digit-clock-r1"));
assert(read("frontend/index.html").includes("-digit-clock-r1"));
console.log("Digit Clock installation: app/admin navigation, Pages routing, assets, release cache markers and live-feed cache bypass passed.");
