const assert = require("assert");
const E = require("../frontend/js/digitClockEngine.js");
const C = require("../frontend/js/digitClockCompetition.js");
const game = E.normalize(require("./fixtures/digit_clock_espn_401547417.json"));
const store = C.empty(), family = C.createLeague(store, "Family"), work = C.createLeague(store, "Work");
const season = C.createSeason(family, "2026"), other = C.createSeason(work, "2026");
const names = Array.from({ length: 10 }, (_, n) => `Player ${n}`);
const entry = C.addGame(family, season, game.id, "1", names, game);
const sameGame = C.addGame(work, other, game.id, "4", names.map(n => `Work ${n}`), game);
assert.notEqual(entry.id, sameGame.id);
assert.notEqual(entry.assignments[0], sameGame.assignments[0]);
assert.equal(C.lineup(work, sameGame)[0], "Work Player 0");
assert.throws(() => C.addGame(family, season, game.id, "2", names, game), /already/);
const get = n => C.standings(family, season).rows.find(r => r.id === entry.assignments[n]);
// Real fixture: quarter time winners 0, 0, 6, 6. Final score holder is 9.
assert.equal(get(0).points, 2);
assert.equal(get(6).points, 2);
assert.equal(get(0).seconds, 1297);
assert.equal(get(6).seconds, 1125);
assert.equal(get(9).seconds, 469);
assert.equal(C.standings(family, season).rows.reduce((s, r) => s + r.seconds, 0), 3600);
season.rules = { ...C.defaults, q1: 2, q2: 4, q3: 6, q4: 8 };
assert.equal(get(0).points, 6);
assert.equal(get(6).points, 14);
entry.rules = { ...C.defaults, q1: 10, q2: 20, q3: 30, q4: 40 };
assert.equal(get(0).points, 30);
assert.equal(get(6).points, 70);
assert.equal(C.standings(work, other).rows.find(r => r.id === sameGame.assignments[0]).points, 2);
// Format presets disable unused awards, and game-specific score-holder scoring works.
entry.rules = { ...C.formats.halfFinal.rules, basis: "score", half: 5, total: 10 };
assert.equal(get(9).points, 15); // 10–9 at half; 25–24 final: both digit 9.
assert.equal(get(0).points, 0);
entry.rules = C.formats.timeOnly.rules;
assert.equal(get(0).points, 0);
assert.equal(get(0).seconds, 1297);
entry.rules = null;
// Multiple weeks aggregate by stable member identity, even when digits change.
const g2 = { ...game, id: "401547418" };
const entry2 = C.addGame(family, season, g2.id, "2", [...names.slice(1), names[0]], g2);
const firstPlayer = family.members.find(m => m.name === "Player 0");
assert.equal(entry2.assignments[9], firstPlayer.id);
assert.equal(C.standings(family, season, "1").rows.find(r => r.id === firstPlayer.id).seconds, 1297);
assert.equal(C.standings(family, season, "2").rows.find(r => r.id === firstPlayer.id).seconds, 469);
assert.equal(C.standings(family, season).rows.find(r => r.id === firstPlayer.id).seconds, 1766);
firstPlayer.name = "Renamed person";
assert.equal(C.lineup(family, entry)[0], "Renamed person");
assert.equal(C.lineup(family, entry2)[9], "Renamed person");
// Moving a game changes weekly totals but does not duplicate season totals.
entry2.week = "1";
assert.equal(C.standings(family, season, "2").entries.length, 0);
assert.equal(C.standings(family, season, "1").rows.find(r => r.id === firstPlayer.id).seconds, 1766);
// Live periods give confirmed completed-quarter awards only; projections remain separate.
const liveSeason = C.createSeason(family, "Live"), live = { ...game, through: 1200, completed: false, period: 2, clock: "10:00", events: game.events.filter(p => p.at <= 1200) };
const liveEntry = C.addGame(family, liveSeason, game.id, "1", names, live);
const liveStats = C.standings(family, liveSeason);
assert.equal(liveStats.rows.reduce((s, r) => s + r.points, 0), 1);
assert.equal(liveStats.rows.reduce((s, r) => s + r.projected, 0), 2);
assert.equal(liveStats.rows.reduce((s, r) => s + r.confirmedSeconds, 0), 0);
liveEntry.error = "Offline";
assert.equal(C.standings(family, liveSeason).rows.reduce((s, r) => s + r.points, 0), 0);
assert(C.standings(family, liveSeason).rows.some(r => r.seconds > 0));
liveEntry.error = "";
liveEntry.snapshot = { ...live, warnings: ["Clock mismatch"] };
assert.equal(C.standings(family, liveSeason).rows.reduce((s, r) => s + r.points, 0), 0);
// Tie splitting conserves points; a shared player on two digits combines their time.
const tieGame = { ...game, id: "401547419", through: 900, completed: false, period: 1, events: [{ at: 450, period: 1, home: 7, away: 0 }], warnings: [] };
const tieSeason = C.createSeason(family, "Ties"), tie = C.addGame(family, tieSeason, tieGame.id, "1", names, tieGame);
let awards = C.periodAwards(family, tie, tieSeason.rules);
assert.equal(awards[0].winners.length, 2); assert.equal(awards[0].perWinner, 0.5);
tie.rules = { ...C.defaults, ties: "full" };
assert.equal(C.periodAwards(family, tie, tieSeason.rules)[0].perWinner, 1);
tie.assignments[7] = tie.assignments[0];
assert.equal(C.periodAwards(family, tie, tieSeason.rules)[0].winners.length, 1);
assert.equal(C.periodAwards(family, tie, tieSeason.rules)[0].winningSeconds, 900);
// Unassigned top digits never hand points to a runner-up.
tie.assignments[0] = null; tie.assignments[7] = null;
assert(C.periodAwards(family, tie, tieSeason.rules)[0].winners.every(x => x === null));
assert.equal(C.standings(family, tieSeason).rows.reduce((s, r) => s + r.points, 0), 0);
// Score exactly at the next quarter's start does not change the previous quarter winner.
tie.snapshot = { ...tieGame, through: 901, events: [{ at: 900, period: 2, home: 7, away: 0 }] };
tie.rules = { ...C.defaults, basis: "score" };
assert.equal(C.periodAwards(family, tie, tieSeason.rules)[0].scoreDigit, 0);
// OT warnings hold OT/game awards, while clean regulation quarters stay confirmed.
entry.rules = { ...C.defaults, ot: 5, total: 10 };
entry.snapshot = { ...game, through: 3780, period: 5, warnings: ["Overtime final clock needs review"] };
awards = C.periodAwards(family, entry, season.rules);
assert(awards[0].verified); assert(!awards.find(a => a.key === "ot").verified);
entry.verifiedOT = true;
assert(C.periodAwards(family, entry, season.rules).find(a => a.key === "ot").verified);
// Backup roundtrip, structural validation and invalid settings.
assert.equal(JSON.stringify(C.validate(JSON.parse(JSON.stringify(store)))), JSON.stringify(store));
assert.throws(() => C.validate({ version: 99, leagues: [] }));
assert.throws(() => C.rules({ q2: -1 }));
assert.throws(() => C.rules({ basis: "bad" }));
const invalid = JSON.parse(JSON.stringify(store)); invalid.leagues[0].seasons[0].entries[0].assignments[0] = "unknown";
assert.throws(() => C.validate(invalid), /lineup/);
console.log("Digit Clock leagues: independent leagues/seasons, per-quarter/game points, formats, stable player IDs, weekly aggregation, live/confirmed awards, ties, unassigned digits, OT review, and backup validation passed.");
