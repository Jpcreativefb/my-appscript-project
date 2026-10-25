const assert = require("assert");
const E = require("../frontend/js/digitClockEngine.js");
const play = (id, period, clock, homeScore, awayScore, text = "Score") => ({ id, period: { number: period }, clock: { displayValue: clock }, homeScore, awayScore, text });
function payload(plays, home, away, period = 1, clock = "9:40", extra = {}) {
  return { header: { season: { type: 2 }, competitions: [{ id: "401547417", status: { period, displayClock: clock, type: { state: "in", ...extra } }, competitors: [
    { homeAway: "home", team: { displayName: "Home" }, score: String(home) }, { homeAway: "away", team: { displayName: "Away" }, score: String(away) }
  ] }] }, scoringPlays: plays };
}
function checked(data) {
  const game = E.normalize(data), result = E.tally(game);
  assert.equal(result.rows.reduce((s, r) => s + r.total, 0), game.through);
  for (const row of result.rows) {
    assert.equal(row.total, row.quarters.reduce((a, b) => a + b, 0) + row.ot);
    assert.equal(row.half, row.quarters[0] + row.quarters[1]);
  }
  return { game, ...result };
}
const first = play("td", 1, "11:40", 7, 0, "Touchdown + extra point");
const fg = play("fg", 1, "9:40", 7, 3);
let r = checked(payload([first, fg], 7, 3));
assert.equal(r.rows[0].total, 200);
assert.equal(r.rows[7].total, 120);
assert.equal(r.holder, 0);
r = checked(payload([first, fg], 7, 3, 1, "8:40"));
assert.equal(r.rows[0].total, 260);
assert.equal(r.stretch, 60);
// Repeated snapshots and duplicate events do not double-credit time.
assert.deepEqual(checked(payload([first, first, fg], 7, 3, 1, "8:40")).rows, r.rows);
assert.deepEqual(checked(payload([fg, first], 7, 3, 1, "8:40")).rows, r.rows);
// A zero-clock conversion gets zero seconds; its final digit owns the next interval.
r = checked(payload([play("td", 1, "11:40", 6, 0), play("pat", 1, "11:40", 7, 0)], 7, 0));
assert.equal(r.rows[6].total, 0);
assert.equal(r.rows[7].total, 120);
// Cross-quarter and halftime boundaries split correctly.
r = checked(payload([first], 7, 0, 3, "15:00"));
assert.equal(r.rows[7].half, 1600);
assert.equal(r.rows[7].quarters[0], 700);
assert.equal(r.rows[7].quarters[1], 900);
assert.equal(r.rows[7].quarters[2], 0);
assert.deepEqual(checked(payload([first], 7, 0, 2, "0:00")).rows, r.rows);
r = checked(payload([], 0, 0, 1, "15:00", { state: "pre" }));
assert.equal(r.rows[0].total, 0);
r = checked(payload([first, fg], 7, 3, 4, "0:00", { completed: true, state: "post" }));
assert.equal(r.game.through, 3600);
// NFL regular-season OT and postseason OT use different period lengths.
r = checked(payload([first, fg], 7, 3, 5, "7:00"));
assert.equal(r.game.through, 3780);
assert.equal(r.rows[0].ot, 180);
const postseason = payload([first, fg], 7, 3, 6, "14:00");
postseason.header.season.type = 3;
r = checked(postseason);
assert.equal(r.game.through, 4560);
assert.equal(r.rows[0].ot, 960);
// Missing clocks must never silently become exact timestamps.
assert.throws(() => E.normalize(payload([play("bad", 1, "bad", 3, 0)], 3, 0)), /clock/);
assert.equal(E.elapsed(1, "15:01", false), null);
assert.equal(E.elapsed(1, "4:99", false), null);
// Score/clock lag and corrections remain visible to the user.
assert(checked(payload([first], 10, 0)).game.warnings.some(x => /caught up/.test(x)));
assert(checked(payload([first], 7, 0, 1, "14:00")).game.warnings.some(x => /out of sync/.test(x)));
assert(checked(payload([first, play("correction", 1, "9:40", 6, 0)], 6, 0)).game.warnings.some(x => /correction/.test(x)));
// A refresh with corrected history fully rebuilds totals.
assert.notDeepEqual(checked(payload([play("td", 1, "12:00", 7, 0), fg], 7, 3)).rows, checked(payload([first, fg], 7, 3)).rows);
// The detailed source is preferred only when it reconciles and covers summary IDs.
const detailed = payload([first], 7, 0);
detailed.drives = { previous: [{ plays: [
  { ...play("td", 1, "11:40", 6, 0), sequenceNumber: "100", scoringPlay: true },
  { ...play("pat", 1, "11:40", 7, 0), sequenceNumber: "101", scoringPlay: true }
] }] };
r = checked(detailed);
assert.equal(r.game.events.length, 2);
assert.equal(r.game.events[0].source, "Play-by-play");
assert.equal(r.rows[6].total, 0);
detailed.drives.previous[0].plays.pop();
assert.equal(checked(detailed).game.events[0].source, "Scoring summary");
// Scoreboard status supersedes stale summary status.
const live = payload([first], 7, 0);
const envelope = { summary: live, scoreboardEvent: { status: { period: 2, displayClock: "10:00", type: { state: "in" } }, competitions: [{ competitors: live.header.competitions[0].competitors }] } };
assert.equal(checked(envelope).game.through, 1200);
// All target digits have legal complete scoring sequences, with accurate modulo math.
for (let total = 0; total < 100; total++) {
  E.paths(total).forEach((paths, digit) => {
    assert(paths.length > 0);
    paths.forEach(p => assert.equal(E.digit(total + p.points), digit));
  });
}
// Probability distributions conserve mass, respond to horizon, and never invent odds.
for (const horizon of [0, 1, 1800, 3600]) {
  const p = E.probabilities(17, horizon);
  assert(Math.abs(p.final.reduce((a, b) => a + b, 0) - 1) < 1e-10);
  p.final.forEach(n => assert(n >= 0 && n <= 1));
}
assert.equal(E.probabilities(17, 0).final[7], 1);
assert.equal(E.probabilities(17, 3600, { td: 0, fg: 0, safety: 0 }).final[7], 1);
const safetyOnly = E.probabilities(0, 3600, { td: 0, fg: 0, safety: 1 });
assert.equal(safetyOnly.final.filter((_, i) => i % 2).reduce((a, b) => a + b, 0), 0);
assert.throws(() => E.probabilities(0, 3600, { pat: 1.1 }));
assert.throws(() => E.probabilities(0, 3600, { td: -1 }));
const real = checked(require("./fixtures/digit_clock_espn_401547417.json"));
assert.deepEqual(real.rows.map(r => r.total), [1297, 0, 0, 709, 0, 0, 1125, 0, 0, 469]);
assert.equal(real.game.homeScore, 25);
assert.equal(real.game.awayScore, 24);
assert.equal(real.holder, 9);
assert.equal(real.game.warnings.length, 0);
assert.equal(E.combinationProbability({ td7: 2 }, { td7: 0 }), 0);
assert(Math.abs(E.combinationProbability({ fg: 1 }, { fg: 1 }) - (1 - Math.exp(-1))) < 1e-10);
const finalOT = payload([first, fg, play("otfg", 5, "5:42", 10, 3)], 10, 3, 5, "0:00", { completed: true });
assert.equal(checked(finalOT).game.through, 3858);
console.log("Digit Clock: time accounting, quarter/half/OT boundaries, corrections, data reconciliation, all digit paths, and probability checks passed.");
