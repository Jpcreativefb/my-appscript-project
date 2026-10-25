const assert = require("assert");
const E = require("../frontend/js/digitClockSports.js");
const C = require("../frontend/js/digitClockCompetition.js");
function check(data) {
  const game = E.normalize(data), tally = E.tally(game);
  assert(Math.abs(tally.rows.reduce((n, r) => n + r.total, 0) - game.through) < 1e-7);
  return { game, ...tally };
}
let r = check(require("./fixtures/digit_clock_espn_nba.json"));
assert.equal(r.game.through, 48 * 60);
assert.equal(r.game.events.length, 122);
assert.equal(r.holder, 8);
assert.equal(r.game.warnings.length, 0);
assert(r.rows.some(row => !Number.isInteger(row.total)));
assert.equal(E.clockSeconds("43.2"), 43.2);
assert.equal(E.clockSeconds("0.0"), 0);
assert.equal(E.clockSeconds("1:02.5"), 62.5);
assert.equal(E.clockSeconds("15:99"), null);
assert.equal(E.formatProgress({ league: "nba" }, 62.5), "1:02.5");
r = check(require("./fixtures/digit_clock_espn_mlb.json"));
assert.equal(r.game.through, 54);
assert.equal(r.game.unit, "outs");
assert.equal(r.game.events.length, 6); // Repeated wild-pitch annotation does not change score twice.
assert.deepEqual(r.rows.map(row => row.total), [2, 15, 20, 1, 4, 2, 10, 0, 0, 0]);
assert.equal(r.game.events[1].at, 17); // Bottom 3rd, 2 outs: 12 + 3 + 2.
assert.equal(E.formatProgress(r.game, 14), "14 outs");
const mlb = r.game;
r = check(require("./fixtures/digit_clock_espn_nhl.json"));
assert.equal(r.game.through, 3900);
assert.equal(r.game.events[0].at, 591); // Hockey play clocks are elapsed, not remaining.
assert.equal(r.game.events.at(-1).text.includes("shootout"), true);
assert.equal(r.holder, 7);
assert.equal(r.rows[7].total, 0); // The shootout winner gets no timed seconds.
assert.equal(r.game.warnings.length, 0);
function sample(league, period, clock, completed = false, plays = [], scores = [0, 0], postseason = false) {
  return { league, summary: { header: { season: { type: postseason ? 3 : 2 }, competitions: [{ id: "401111111", status: { period, displayClock: clock, type: { state: completed ? "post" : "in", completed } }, competitors: [{ homeAway: "home", score: String(scores[0]), team: { displayName: "Home" } }, { homeAway: "away", score: String(scores[1]), team: { displayName: "Away" } }] }] }, plays } };
}
const play = (id, period, clock, homeScore, awayScore, more = {}) => ({ id, period: { number: period }, clock: { displayValue: clock }, homeScore, awayScore, scoringPlay: true, text: "Score", ...more });
assert.equal(check(sample("nba", 5, "3:00")).game.through, 3000);
assert.equal(check(sample("nba", 6, "0.0", true)).game.through, 3480);
assert.equal(check(sample("wnba", 4, "0:00", true)).game.through, 2400);
assert.equal(check(sample("ncaam", 2, "0:00", true)).game.through, 2400);
assert.equal(check(sample("ncaam", 3, "4:00")).game.through, 2460);
assert.equal(check(sample("ncaaw", 5, "4:00")).game.through, 2460);
const collegeOT = check(sample("cfb", 5, "0:00", true, [play("a", 4, "5:00", 7, 0), play("b", 5, "0:00", 7, 6)], [7, 6]));
assert.equal(collegeOT.game.through, 3600);
assert.equal(collegeOT.game.untimedPhase, true);
assert.equal(collegeOT.holder, 3);
assert.equal(collegeOT.rows[3].total, 0);
assert.equal(collegeOT.rows.reduce((n, row) => n + row.ot, 0), 0);
// Hockey playoff second OT ends at 2:00 elapsed: 60 + 20 + 2 minutes, not 100.
const playoff = check(sample("nhl", 5, "0:00", true, [play("goal", 5, "2:00", 1, 0)], [1, 0], true));
assert.equal(playoff.game.through, 4920);
assert.equal(playoff.rows[0].total, 4920);
assert.equal(check(sample("nhl", 4, "0:00", true, [play("goal", 4, "2:00", 1, 0)], [1, 0])).game.through, 3720);
// A top-3rd, 2-out score change is 14 outs. That play's out belongs to the old digit.
const baseballPlay = (id, inning, half, outs, homeScore, awayScore, scoringPlay = true) => ({ id, period: { number: inning, type: half }, outs, homeScore, awayScore, scoringPlay, text: "Baseball play" });
const base = sample("mlb", 3, "", false, [baseballPlay("a", 3, "Top", 2, 0, 1), baseballPlay("b", 3, "Top", 3, 0, 1, false)], [0, 1]);
let outs = check(base);
assert.equal(outs.game.events[0].at, 14);
assert.equal(outs.rows[0].total, 14);
assert.equal(outs.rows[1].total, 1);
// A home win after the top of the ninth ends at 51 outs; no bottom-three outs are invented.
const shortened = sample("mlb", 9, "", true, [baseballPlay("end", 9, "Top", 3, 0, 0, false)]);
assert.equal(check(shortened).game.through, 51);
// Same game ID in different sports never collides or shares a snapshot / roster.
const store = C.empty(), league = C.createLeague(store, "All sports"), season = C.createSeason(league, "2026");
const names = Array.from({ length: 10 }, (_, n) => `Player ${n}`);
const baseballEntry = C.addGame(league, season, mlb.id, "1", names, mlb);
const nba = E.normalize(require("./fixtures/digit_clock_espn_nba.json"));
C.addGame(league, season, nba.id, "1", names, nba);
const stats = C.standings(league, season);
assert.equal(stats.rows.reduce((n, row) => n + row.outs, 0), 54);
assert(Math.abs(stats.rows.reduce((n, row) => n + row.seconds, 0) - 2880) < 1e-7);
assert.equal(C.periodAwards(league, baseballEntry, season.rules).filter(a => a.key.startsWith("q")).length, 9);
assert.equal(C.periodAwards(league, baseballEntry, season.rules).find(a => a.key === "half"), undefined);
assert.equal(C.periodAwards(league, baseballEntry, season.rules).find(a => a.key === "ot"), undefined);
assert.equal(C.standings(league, season).rows.reduce((n, row) => n + row.points, 0), 13); // 9 innings + 4 quarters.
const sameID = { ...nba, id: mlb.id };
C.addGame(league, season, sameID.id, "2", names, sameID);
assert.equal(season.entries.length, 3);
C.validate(JSON.parse(JSON.stringify(store)));
// Sport-specific paths and probability distributions conserve mass for all supported types.
for (const league of ["nba", "ncaam", "mlb", "nhl"]) {
  const g = { league, homeScore: 7, awayScore: 10 };
  E.pathsFor(g, 17).forEach((paths, n) => { assert(paths.length); paths.forEach(path => assert.equal(E.digit(17 + path.points), n)); });
  for (const fraction of [0, 0.5, 1, 2]) {
    const distribution = E.sportProbabilities(g, E.regulation(g) * fraction);
    assert(Math.abs(distribution.final.reduce((n, p) => n + p, 0) - 1) < 1e-8);
    if (!fraction) assert.equal(distribution.final[7], 1);
  }
  assert.throws(() => E.sportProbabilities(g, 20, { v1: -1 }));
}
console.log("Digit Clock multi-sport checks passed: real NBA/MLB/NHL replays, fractional clocks, basketball/college OT, hockey elapsed clocks/shootout/playoff OT, MLB out attribution/shortened games, mixed-sport standings, inning awards, paths and probabilities.");
