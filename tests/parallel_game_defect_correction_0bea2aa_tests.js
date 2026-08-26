const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function engineContext(relative, extra = {}) {
  const context = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, isFinite, parseInt, parseFloat, ...extra
  };
  vm.createContext(context);
  vm.runInContext(read(relative), context);
  return context;
}

function sportsMissingLineCase(mode) {
  const context = engineContext('backend/engines/SportsSurvivorEngine.js');
  const categories = [
    { id: 'w1', name: 'Week 1', points: 10, displayOrder: 1 },
    { id: 'w2', name: 'Week 2', points: 10, displayOrder: 2 }
  ];
  const settings = Object.assign({}, context.sportsSurvivorDefaultSettings_('survivor'), {
    mode,
    startWeek: 1,
    endWeek: 2,
    resultMode: 'spread',
    lossesAllowed: 0,
    pushRule: 'survive',
    missedPickRule: 'eliminate',
    kothBasePoints: 10,
    kothMultiplierStep: 1,
    kothMaxMultiplier: 5
  });
  const optionMeta = {
    w1: { team1: { sportsGameId: 'g1', side: 'home' } }, // finalized game, but no ATS line
    w2: { team2: { sportsGameId: 'g2', side: 'home', spread: 0 } }
  };
  const results = {
    w1: { g1: { Completed: true, HomeScore: 24, AwayScore: 20 } },
    w2: { g2: { Completed: true, HomeScore: 10, AwayScore: 20 } }
  };
  const pickMeta = {
    player: {
      w1: { nomineeIds: ['team1'], snapshots: [{ sportsGameId: 'g1', side: 'home' }], confidencePoints: 0 },
      w2: { nomineeIds: ['team2'], snapshots: [{ sportsGameId: 'g2', side: 'home', spread: 0 }], confidencePoints: 0 }
    }
  };

  return context.sportsSurvivorEvaluateUser_('player', 'survivor', categories, settings, optionMeta, results, pickMeta);
}

// Sports Survivor: a finalized ATS source without a grading line remains unresolved
// and must block a later finalized week.
{
  const evaluation = sportsMissingLineCase('sports-survivor');
  assert.strictEqual(evaluation.alive, true, 'Week 2 loss must not eliminate while Week 1 ATS line is unresolved.');
  assert.strictEqual(evaluation.complete, false, 'The Survivor season cannot complete while an ATS line is unresolved.');
  assert.strictEqual(evaluation.currentRoundIndex, 0);
  assert.strictEqual(evaluation.rounds[0].resolved, false);
  assert.strictEqual(evaluation.rounds[0].status, 'pending');
  assert.strictEqual(evaluation.rounds[0].selectionResults[0].outcome, 'pending-line');
  assert.strictEqual(evaluation.rounds[1].resolved, false);
  assert.strictEqual(evaluation.rounds[1].status, 'upcoming');
  assert.strictEqual(evaluation.rounds[1].outcome, 'pending');
}

// Streak Survivor shares the same evaluator. A future result must not advance the
// streak or score while the earlier ATS round is still missing its grading line.
{
  const evaluation = sportsMissingLineCase('streak-survivor');
  assert.strictEqual(evaluation.alive, true);
  assert.strictEqual(evaluation.complete, false);
  assert.strictEqual(evaluation.currentRoundIndex, 0);
  assert.strictEqual(evaluation.rounds[0].resolved, false);
  assert.strictEqual(evaluation.rounds[0].selectionResults[0].outcome, 'pending-line');
  assert.strictEqual(evaluation.rounds[1].resolved, false);
  assert.strictEqual(evaluation.rounds[1].status, 'upcoming');
  assert.strictEqual(evaluation.totalPoints, 0, 'Blocked future weeks must not score in Streak Survivor.');
  assert.strictEqual(evaluation.winStreak, 0, 'Blocked future weeks must not change the streak.');
}

// Once the missing line becomes available, settlement resumes in order.
{
  const context = engineContext('backend/engines/SportsSurvivorEngine.js');
  const categories = [
    { id: 'w1', name: 'Week 1', points: 10, displayOrder: 1 },
    { id: 'w2', name: 'Week 2', points: 10, displayOrder: 2 }
  ];
  const optionMeta = {
    w1: { team1: { sportsGameId: 'g1', side: 'home', spread: -2 } },
    w2: { team2: { sportsGameId: 'g2', side: 'home', spread: 0 } }
  };
  const results = {
    w1: { g1: { Completed: true, HomeScore: 24, AwayScore: 20 } },
    w2: { g2: { Completed: true, HomeScore: 10, AwayScore: 20 } }
  };
  const picks = { player: {
    w1: { nomineeIds: ['team1'], snapshots: [{ sportsGameId: 'g1', side: 'home' }], confidencePoints: 0 },
    w2: { nomineeIds: ['team2'], snapshots: [{ sportsGameId: 'g2', side: 'home', spread: 0 }], confidencePoints: 0 }
  } };
  const sportsSettings = Object.assign({}, context.sportsSurvivorDefaultSettings_('survivor'), {
    mode: 'sports-survivor', startWeek: 1, endWeek: 2, resultMode: 'spread', lossesAllowed: 0
  });
  const sports = context.sportsSurvivorEvaluateUser_('player', 'survivor', categories, sportsSettings, optionMeta, results, picks);
  assert.strictEqual(sports.rounds[0].outcome, 'win');
  assert.strictEqual(sports.rounds[1].outcome, 'loss');
  assert.strictEqual(sports.alive, false);
  assert.strictEqual(sports.eliminatedRound, 2);
  assert.strictEqual(sports.complete, true);

  const streakSettings = Object.assign({}, sportsSettings, { mode: 'streak-survivor', kothBasePoints: 10, kothLossBehavior: 'reset' });
  const streak = context.sportsSurvivorEvaluateUser_('player', 'survivor', categories, streakSettings, optionMeta, results, picks);
  assert.strictEqual(streak.rounds[0].outcome, 'win');
  assert.strictEqual(streak.rounds[1].outcome, 'loss');
  assert.strictEqual(streak.totalPoints, 10);
  assert.strictEqual(streak.winStreak, 0);
  assert.strictEqual(streak.bestStreak, 1);
  assert.strictEqual(streak.complete, true);
}

// Voting: scoring behavior becomes immutable after the first ballot. This avoids
// mixing ballots calculated under different point tables/methods.
{
  const context = engineContext('backend/engines/VotingCompetitionEngine.js');
  const base = context.votingCompetitionDefaultSettings_('cookoff');

  assert.strictEqual(context.votingCompetitionScoringContractChanged_(base, Object.assign({}, base, {
    resultsVisibility: 'live', rankingUi: 'drag', showPhoto: false
  })), false, 'Non-scoring presentation settings may still change after voting begins.');
  assert.strictEqual(context.votingCompetitionScoringContractChanged_(base, Object.assign({}, base, {
    pointValues: [20, 10, 5, 2, 1]
  })), true);
  assert.strictEqual(context.votingCompetitionScoringContractChanged_(base, Object.assign({}, base, {
    scoringMode: 'borda'
  })), true);
  assert.strictEqual(context.votingCompetitionScoringContractChanged_(base, Object.assign({}, base, {
    votingMethod: 'favorite', rankLimit: 1
  })), true);
  assert.strictEqual(context.votingCompetitionScoringContractChanged_(base, Object.assign({}, base, {
    rankLimit: 3
  })), true);

  context.getGame = () => ({ id: 'cookoff', type: 'voting' });
  context.votingCompetitionGetSettings_ = () => base;
  context.votingCompetitionReadBallots_ = () => [{ username: 'u1', entryId: 'a', rank: 1, points: 10 }];
  context.votingCompetitionEnsureSheet_ = () => { throw new Error('settings write should not occur'); };
  const changedPayload = Object.assign({}, base, { pointValues: [25, 15, 10, 5, 1] });
  assert.throws(
    () => context.votingCompetitionSaveSettings_('cookoff', changedPayload),
    /cannot change after the first ballot|locked once voting begins/i,
    'A scoring change must be rejected before any settings row is written.'
  );
}

// Ranking leaderboard contract: Ranking is participation/entry based, matching the
// generic Picks leaderboard. A registered app user with no RankingEntries ballot is
// intentionally absent until their first ballot is saved.
{
  const context = engineContext('backend/engines/RankingGameEngine.js');
  context.getGame = () => ({ id: 'ranking', type: 'ranking' });
  context.rankingGameCategories_ = () => [];
  context.rankingGetEntriesByUser_ = () => ({});
  context.rankingFinalRanksForGame_ = () => ({});
  assert.strictEqual(context.rankingLeaderboardData_('ranking').length, 0);
}

function createKothSettings(context, tieRule) {
  return {
    kothPacingMode: 'automatic',
    kothFixedRecipients: 3,
    kothCustomSchedule: '',
    kothMinRecipients: 1,
    kothMaxRecipients: 0,
    kothTieRule: tieRule || 'include-all',
    kothStrikeLimit: 3,
    startWeek: 1,
    endWeek: 17
  };
}

function simulateKothSeason(context, name, scoreFor, options = {}) {
  const settings = createKothSettings(context, options.tieRule || 'include-all');
  const playerCount = options.playerCount || 14;
  let state = Array.from({ length: playerCount }, (_, index) => ({
    username: 'p' + (index + 1),
    displayName: 'P' + (index + 1),
    strikes: 0,
    eliminated: false
  }));
  const history = [];
  let sawShrink = false;
  let sawTie = false;
  let sawTerminalFinish = false;
  let priorAlive = playerCount;

  for (let week = settings.startWeek; week <= settings.endWeek; week++) {
    const alive = state.filter(player => !player.eliminated);
    if (alive.length <= 1) break;
    const activePlayers = alive.map((player, index) => Object.assign({}, player, {
      score: Number(scoreFor({ week, index, player, alive: alive.slice(), history: history.slice() }))
    }));

    const plan = context.kothWeekPlan_(activePlayers, week, settings, history);
    const recipients = Array.from(plan.selection.recipients || []);
    if (plan.terminalFinish) {
      assert(recipients.length < activePlayers.length, name + ': terminal convergence must protect exactly one survivor.');
    } else {
      assert(context.kothProjectedAliveCount_(activePlayers, plan.selection, settings.kothStrikeLimit) >= 1, name + ': ordinary tie expansion must never eliminate the entire active field.');
    }
    assert(plan.recipientTarget <= activePlayers.length - 1, name + ': recipient target must preserve a survivor.');
    sawTie = sawTie || plan.selection.tieApplied === true;
    sawTerminalFinish = sawTerminalFinish || plan.terminalFinish === true;
    const recipientSet = new Set(recipients.map(row => String(row.username).toLowerCase()));

    state = state.map(player => {
      if (player.eliminated) return player;
      const scored = activePlayers.find(row => row.username === player.username);
      const receivesStrike = recipientSet.has(player.username.toLowerCase());
      const strikesAfter = context.kothStrikeCountAfter_(scored, receivesStrike, settings, plan.terminalFinish);
      const eliminated = strikesAfter >= settings.kothStrikeLimit;
      history.push({
        GameId: 'koth-test',
        Week: week,
        Username: player.username,
        DisplayName: player.displayName,
        WeekScore: scored.score,
        StrikeCountAfter: strikesAfter,
        StrikeAwarded: receivesStrike,
        Eliminated: eliminated,
        EliminatedWeek: eliminated ? week : ''
      });
      return Object.assign({}, player, { strikes: strikesAfter, eliminated, score: scored.score });
    });

    const nowAlive = state.filter(player => !player.eliminated).length;
    if (nowAlive < priorAlive) sawShrink = true;
    priorAlive = nowAlive;
  }

  const survivors = state.filter(player => !player.eliminated);
  assert.strictEqual(survivors.length, 1, name + ': automatic KOTH must finish the configured season with one survivor.');
  state.filter(player => player.eliminated).forEach(player => {
    assert(player.strikes >= settings.kothStrikeLimit, name + ': every eliminated player must finish at the strike limit.');
  });
  assert(survivors[0].strikes < settings.kothStrikeLimit, name + ': the winner must remain below the strike limit.');
  assert(sawShrink, name + ': simulation must exercise shrinking player counts.');

  context.kothSettings_ = () => settings;
  context.kothHistoryRows_ = () => history;
  context.getLeaderboardUserProfile_ = () => ({});
  const standings = context.kingOfHillLeaderboardData_('koth-test');
  const winners = standings.filter(row => row.survivorWinner === true);
  assert.strictEqual(winners.length, 1, name + ': leaderboard completion must identify exactly one winner.');
  assert.strictEqual(winners[0].username, survivors[0].username, name + ': leaderboard winner must match the simulated survivor.');
  assert(standings.every(row => row.survivorComplete === true), name + ': completed KOTH standings must mark the season complete.');

  return { survivor: survivors[0], state, history, standings, sawTie, sawTerminalFinish };
}

// KOTH: previously non-converging two-player final-week state. One player has one
// strike and the other has none; a normal one-strike week would finish 2/3 vs 0/3.
{
  const context = engineContext('backend/engines/KingOfHillEngine.js');
  const settings = createKothSettings(context, 'include-all');
  const active = [
    { username: 'low', score: 80, strikes: 1, eliminated: false },
    { username: 'high', score: 100, strikes: 0, eliminated: false }
  ];
  const plan = context.kothWeekPlan_(active, 17, settings, []);
  assert.strictEqual(plan.terminalFinish, true);
  assert.strictEqual(plan.selection.recipients.length, 1);
  assert.strictEqual(plan.selection.recipients[0].username, 'low');
  assert.strictEqual(context.kothStrikeCountAfter_(active[0], true, settings, true), 3);
  assert.strictEqual(context.kothStrikeCountAfter_(active[1], false, settings, true), 0);
}

// KOTH: tied final fields protect exactly one player, never wipe out everyone.
{
  const context = engineContext('backend/engines/KingOfHillEngine.js');
  const settings = createKothSettings(context, 'include-all');
  const active = [
    { username: 'a', score: 80, strikes: 1, eliminated: false },
    { username: 'b', score: 80, strikes: 0, eliminated: false },
    { username: 'c', score: 80, strikes: 0, eliminated: false }
  ];
  const plan = context.kothWeekPlan_(active, 17, settings, []);
  assert.strictEqual(plan.terminalFinish, true);
  assert.strictEqual(plan.selection.recipients.length, 2);
  const protectedPlayers = active.filter(player => !plan.selection.recipients.some(row => row.username === player.username));
  assert.strictEqual(protectedPlayers.length, 1);
}

// KOTH deterministic full-season certification: fixed lows (a previously
// non-converging pattern), rotating lows, all-tie weeks, previous-week and
// season-average tie breaks, plus many seeded score distributions.
{
  const context = engineContext('backend/engines/KingOfHillEngine.js');

  const fixed = simulateKothSeason(context, 'fixed-low-order', ({ player }) => Number(player.username.slice(1)));
  assert.strictEqual(fixed.sawTerminalFinish, true, 'The known fixed-order non-converging case must exercise terminal convergence.');

  simulateKothSeason(context, 'rotating-low-order', ({ week, player }) => (Number(player.username.slice(1)) + week) % 14);
  const allTies = simulateKothSeason(context, 'all-ties', () => 100);
  assert.strictEqual(allTies.sawTie, true, 'All-tie simulation must exercise tie handling.');
  simulateKothSeason(context, 'previous-week-ties', ({ week, index }) => (week + index) % 4, { tieRule: 'previous-week' });
  simulateKothSeason(context, 'season-average-ties', ({ week, index }) => (week * 3 + index) % 5, { tieRule: 'season-average' });

  for (let seed = 1; seed <= 64; seed++) {
    simulateKothSeason(context, 'seed-' + seed, ({ week, player }) => {
      const playerNo = Number(player.username.slice(1));
      // Integer range deliberately creates ties while still varying weekly order.
      return (seed * 97 + week * 53 + playerNo * 31 + ((week * playerNo) % 17) * 11) % 101;
    });
  }
}

// Fixed/custom pacing remains admin-controlled and is not silently converted into
// automatic final-week convergence.
{
  const context = engineContext('backend/engines/KingOfHillEngine.js');
  const active = [
    { username: 'a', score: 70, strikes: 0, eliminated: false },
    { username: 'b', score: 80, strikes: 0, eliminated: false }
  ];
  const fixedSettings = Object.assign(createKothSettings(context), { kothPacingMode: 'fixed', kothFixedRecipients: 1 });
  const plan = context.kothWeekPlan_(active, 17, fixedSettings, []);
  assert.strictEqual(plan.terminalFinish, false);
  assert.strictEqual(context.kothStrikeCountAfter_(active[0], true, fixedSettings, plan.terminalFinish), 1);
}

console.log('parallel-game-defect-correction-0bea2aa-tests: PASS');
