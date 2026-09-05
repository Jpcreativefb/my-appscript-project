'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const enginePath = path.join(root, 'backend/engines/SportsSurvivorEngine.js');
const adminPath = path.join(root, 'frontend/js/pages/admin.js');
const corePath = path.join(root, 'frontend/js/pages/rc24aSurvivorConfidenceCore.js');
[enginePath, adminPath, corePath].forEach(p => assert(fs.existsSync(p), `required file missing: ${p}`));

const engine = fs.readFileSync(enginePath, 'utf8');
const admin = fs.readFileSync(adminPath, 'utf8');
const core = fs.readFileSync(corePath, 'utf8');
const context = { console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set, isFinite, parseInt, parseFloat };
vm.createContext(context);
vm.runInContext(engine, context);

function category(week) { return { id: 'w' + week, name: 'Week ' + week, roundNumber: week, points: 1 }; }
function option(team, game, side, spread) {
  return { optionId: team, teamId: team, team, sportsGameId: game, side: side || 'home', kickoff: '2099-01-01T00:00:00Z', spread: spread === undefined ? '' : spread };
}
function result(game, home, away) { return { [game]: { Completed: true, Cancelled: false, HomeScore: home, AwayScore: away } }; }
function buildEval(mode, rows, extraSettings) {
  const cats = rows.map((_, i) => category(i + 1));
  const metas = {}, results = {}, picks = { user: {} };
  rows.forEach((r, i) => {
    const week = i + 1, team = 't' + week, game = 'g' + week;
    metas['w' + week] = { [team]: option(team, game, 'home', r.spread) };
    results['w' + week] = result(game, r.home, r.away);
    picks.user['w' + week] = { nomineeIds: [team], snapshots: [{ sportsGameId: game, side: 'home', spread: r.spread }], confidencePoints: 0 };
  });
  const settings = context.sportsSurvivorNormalizeSettings_(Object.assign({
    mode, league: 'nfl', endWeek: rows.length, kothBasePoints: 10,
    kothMultiplierStep: 1, kothMaxMultiplier: 5, pushRule: 'survive'
  }, extraSettings || {}), 'g');
  return { settings, evaluation: context.sportsSurvivorEvaluateUser_('user', 'g', cats, settings, metas, results, picks) };
}

// A. Legacy v1.2.18y Streak Survivor is a score/streak mode, not strike elimination.
let legacy = buildEval('streak-survivor', [
  { home: 20, away: 10 }, { home: 20, away: 10 }, { home: 20, away: 10 }, { home: 10, away: 20 }
]);
assert.strictEqual(legacy.settings.mode, 'streak-survivor');
assert.strictEqual(legacy.evaluation.totalPoints, 60);
assert.strictEqual(legacy.evaluation.winStreak, 0);
assert.strictEqual(legacy.evaluation.bestStreak, 3);
assert.strictEqual(legacy.evaluation.lossesUsed, 0);
assert.strictEqual(legacy.evaluation.rounds[3].status, 'loss-reset');
assert.strictEqual(legacy.evaluation.alive, true);
assert.strictEqual(legacy.evaluation.complete, true);

// B. RC24A uses its own persisted mode so old games are not silently reinterpreted.
let cfg = context.sportsSurvivorNormalizeSettings_({ mode: 'streak-points-strikes', league: 'nfl', lossesAllowed: 1 }, 'g');
assert.strictEqual(cfg.mode, 'streak-points-strikes');
assert.strictEqual(cfg.lossesAllowed, 1);
assert.strictEqual(context.survivorSportsModeEnabled_(''), false, 'empty/default settings remain non-sports without a sheet');
assert(engine.includes('mode === "streak-points-strikes"'), 'engine contains explicit RC24A mode handling');

// C. Locked scoring: W1 10, W2 20, NFL tie W3 15, W4 40 = 85; tie uses no strike and advances streak.
let scored = buildEval('streak-points-strikes', [
  { home: 20, away: 10 }, { home: 20, away: 10 }, { home: 20, away: 20 }, { home: 20, away: 10 }
], { lossesAllowed: 1 });
assert.strictEqual(scored.evaluation.rounds[0].earnedPoints, 10);
assert.strictEqual(scored.evaluation.rounds[1].earnedPoints, 20);
assert.strictEqual(scored.evaluation.rounds[2].pushKind, 'tie');
assert.strictEqual(scored.evaluation.rounds[2].earnedPoints, 15);
assert.strictEqual(scored.evaluation.rounds[2].lossesUsed, 0);
assert.strictEqual(scored.evaluation.rounds[2].winStreak, 3);
assert.strictEqual(scored.evaluation.rounds[3].earnedPoints, 40);
assert.strictEqual(scored.evaluation.totalPoints, 85);
assert.strictEqual(scored.evaluation.winStreak, 4);
assert.strictEqual(scored.evaluation.bestStreak, 4);
assert.strictEqual(scored.evaluation.alive, true);

// D. One allowed strike: first loss resets streak and survives; second loss eliminates.
let strikes = buildEval('streak-points-strikes', [
  { home: 20, away: 10 }, { home: 10, away: 20 }, { home: 10, away: 20 }
], { lossesAllowed: 1 });
assert.strictEqual(strikes.evaluation.rounds[1].status, 'loss-reset');
assert.strictEqual(strikes.evaluation.rounds[1].lossesUsed, 1);
assert.strictEqual(strikes.evaluation.rounds[1].alive, undefined, 'round rows intentionally expose state through status/loss counters');
assert.strictEqual(strikes.evaluation.rounds[2].status, 'eliminated');
assert.strictEqual(strikes.evaluation.lossesUsed, 2);
assert.strictEqual(strikes.evaluation.alive, false);
assert.strictEqual(strikes.evaluation.eliminatedRound, 3);

// E. ATS push is distinct from an NFL tie: zero points, no strike, streak preserved when PushRule=survive.
const atsCats = [category(1), category(2)];
const atsMetas = {
  w1: { a: option('a', 'a1', 'home', 0) },
  w2: { b: option('b', 'a2', 'home', 3) }
};
const atsResults = { w1: result('a1', 20, 10), w2: result('a2', 20, 23) };
const atsPicks = { user: {
  w1: { nomineeIds: ['a'], snapshots: [{ sportsGameId: 'a1', side: 'home', spread: 0 }], confidencePoints: 0 },
  w2: { nomineeIds: ['b'], snapshots: [{ sportsGameId: 'a2', side: 'home', spread: 3 }], confidencePoints: 0 }
} };
const atsSettings = context.sportsSurvivorNormalizeSettings_({
  mode: 'streak-points-strikes', league: 'nfl', endWeek: 2, resultMode: 'spread',
  kothBasePoints: 10, kothMultiplierStep: 1, kothMaxMultiplier: 5, lossesAllowed: 1, pushRule: 'survive'
}, 'g');
const atsEval = context.sportsSurvivorEvaluateUser_('user', 'g', atsCats, atsSettings, atsMetas, atsResults, atsPicks);
assert.strictEqual(atsEval.rounds[1].outcome, 'push');
assert.strictEqual(atsEval.rounds[1].pushKind, 'ats-push');
assert.strictEqual(atsEval.rounds[1].earnedPoints, 0);
assert.strictEqual(atsEval.rounds[1].lossesUsed, 0);
assert.strictEqual(atsEval.rounds[1].winStreak, 1);
assert.strictEqual(atsEval.alive, true);

// F. Classic Sports Survivor still eliminates at the same loss boundary.
let classic = buildEval('sports-survivor', [{ home: 10, away: 20 }], { lossesAllowed: 0 });
assert.strictEqual(classic.evaluation.alive, false);
assert.strictEqual(classic.evaluation.rounds[0].status, 'eliminated');

// G. Owner/Admin can explicitly choose the new mode; legacy choice remains present.
assert(admin.includes('value="streak-survivor"'), 'legacy Streak Survivor Admin option retained');
assert(admin.includes('value="streak-points-strikes"'), 'RC24A Streak Points + Strikes Admin option exposed');
assert(admin.includes('mode === "streak-points-strikes"'), 'Admin field visibility recognizes the new mode');
assert(core.includes("'streak-points-strikes'"), 'RC24A browser scoring helper targets the distinct new mode');

console.log('PASS: RC24A Survivor semantic compatibility + Streak Points/Strikes regression contract');
