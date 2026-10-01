const fs = require("fs");
const assert = require("assert");
const vm = require("vm");

const source = fs.readFileSync("functions/api/app.js", "utf8").replace(/\bexport\s+/g, "");
const calls = [];
const sandbox = {
  console,
  URL,
  Response,
  Set,
  Promise,
  JSON,
  String,
  Number,
  Object,
  RegExp,
  setTimeout,
  fetch: async function(url) {
    calls.push(String(url));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "functions/api/app.js" });

const PREVIEW_URL = "https://script.google.com/macros/s/AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0/exec";
const PRODUCTION_URL = "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

async function upstreamFor(hostname, action) {
  calls.length = 0;
  const body = JSON.stringify({ action, gameId: "team-fantasy-nfl-2026" });
  const response = await sandbox.onRequestPost({
    request: {
      url: "https://" + hostname + "/api",
      text: async () => body
    },
    env: {}
  });
  assert.strictEqual(response.status, 200, action + " bridge response should succeed");
  assert.strictEqual(calls.length, 1, action + " should make exactly one upstream request");
  return calls[0];
}

(async function() {
  const previewHost = "team-fantasy-auto-week-r1.my-appscript-project.pages.dev";
  const productionHost = "my-appscript-project.pages.dev";

  assert.strictEqual(
    await upstreamFor(previewHost, "getTeamFantasyState"),
    PREVIEW_URL,
    "Cloudflare Preview getTeamFantasyState must use Preview Apps Script"
  );
  assert.strictEqual(
    await upstreamFor(previewHost, "getTeamFantasyGameDayState"),
    PREVIEW_URL,
    "Cloudflare Preview getTeamFantasyGameDayState must use Preview Apps Script"
  );

  assert.strictEqual(
    await upstreamFor(productionHost, "getTeamFantasyState"),
    PRODUCTION_URL,
    "production getTeamFantasyState must remain on production Apps Script"
  );
  assert.strictEqual(
    await upstreamFor(productionHost, "getTeamFantasyGameDayState"),
    PRODUCTION_URL,
    "production getTeamFantasyGameDayState must remain on production Apps Script"
  );

  assert.strictEqual(
    await upstreamFor(previewHost, "saveTeamFantasyPick"),
    PRODUCTION_URL,
    "Team Fantasy pick writes must not be newly routed to Preview Apps Script"
  );
  assert.strictEqual(
    await upstreamFor(previewHost, "autoPickTeamFantasy"),
    PRODUCTION_URL,
    "Team Fantasy Auto Pick writes must not be newly routed to Preview Apps Script"
  );

  console.log("PATTC Team Fantasy Preview Read Routing R1 tests: PASS");
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
