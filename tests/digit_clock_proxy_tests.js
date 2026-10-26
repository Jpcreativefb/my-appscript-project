const assert = require("assert");
const fs = require("fs");
(async () => {
  const code = fs.readFileSync("functions/api/digit-clock.js", "utf8");
  const { onRequestGet } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const call = query => onRequestGet({ request: new Request(`https://example.test/api/digit-clock?${query}`) });
  const original = global.fetch;
  const calls = [];
  try {
    global.fetch = async url => { calls.push(String(url)); throw new Error("Network should not run"); };
    assert.equal((await call("event=https://evil.test")).status, 400);
    assert.equal((await call("date=bad")).status, 400);
    assert.equal((await call("league=https://evil.test")).status, 400);
    assert.equal((await call("league=__proto__")).status, 400);
    assert.equal(calls.length, 0);
    const summary = require("./fixtures/digit_clock_espn_401547417.json");
    summary.header.competitions[0].date = "2023-09-17T17:00Z";
    global.fetch = async url => {
      calls.push(String(url));
      if (String(url).includes("/summary?")) return Response.json(summary);
      return Response.json({ events: [{ id: "401547417", status: { period: 4 } }] });
    };
    let response = await call("event=401547417");
    assert.equal(response.status, 200);
    let data = await response.json();
    assert.equal(data.summary.header.competitions[0].id, "401547417");
    assert.equal(data.scoreboardEvent.id, "401547417");
    assert(calls.at(-1).includes("dates=20230917"));
    calls.length = 0;
    global.fetch = async url => {
      calls.push(String(url));
      return String(url).includes("site.api.espn.com") ? new Response("Blocked", { status: 403 }) : Response.json({ events: [] });
    };
    response = await call("date=20261025&url=https://evil.test");
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert(calls.every(url => /^https:\/\/site\.(web\.)?api\.espn\.com\/apis\/site\/v2\/sports\/football\/nfl\/scoreboard\?/.test(url)));
    calls.length = 0;
    await call("league=nba&date=20261025");
    assert(calls.every(url => url.includes("/sports/basketball/nba/scoreboard?")));
    calls.length = 0;
    await call("league=mlb&date=20261025");
    assert(calls.every(url => url.includes("/sports/baseball/mlb/scoreboard?")));
    calls.length = 0;
    await call("league=nhl&date=20261025");
    assert(calls.every(url => url.includes("/sports/hockey/nhl/scoreboard?")));
    global.fetch = async () => new Response("Unavailable", { status: 503 });
    assert.equal((await call("event=401547417")).status, 502);
  } finally { global.fetch = original; }
  console.log("Digit Clock proxy: validation, fixed-host routing, ESPN fallback, scoreboard synchronization, and unavailable-feed checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
