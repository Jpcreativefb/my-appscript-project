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

// Ranking: only a complete permutation of the category nominees may score.
{
  const context = engineContext('backend/engines/RankingGameEngine.js');
  const category = {
    id: 'final-order',
    points: 10,
    nominees: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  };
  const official = { a: 1, b: 2, c: 3 };
  const perfect = context.rankingScoreBallot_(category, [
    { nomineeId: 'a', rank: 1 }, { nomineeId: 'b', rank: 2 }, { nomineeId: 'c', rank: 3 }
  ], official);
  assert.strictEqual(perfect.earnedPoints, 10);
  assert.strictEqual(perfect.validBallot, true);

  const duplicateNominee = context.rankingScoreBallot_(category, [
    { nomineeId: 'a', rank: 1 }, { nomineeId: 'a', rank: 2 }, { nomineeId: 'c', rank: 3 }
  ], official);
  assert.strictEqual(duplicateNominee.earnedPoints, 0, 'Corrupt duplicate-nominee ballots must not receive partial credit.');
  assert.strictEqual(duplicateNominee.validBallot, false);

  const duplicateRank = context.rankingScoreBallot_(category, [
    { nomineeId: 'a', rank: 1 }, { nomineeId: 'b', rank: 1 }, { nomineeId: 'c', rank: 3 }
  ], official);
  assert.strictEqual(duplicateRank.earnedPoints, 0, 'Corrupt duplicate-rank ballots must not receive partial credit.');
  assert.strictEqual(duplicateRank.validBallot, false);

  const pendingCorrupt = context.rankingScoreBallot_(category, [
    { nomineeId: 'a', rank: 1 }, { nomineeId: 'a', rank: 2 }, { nomineeId: 'c', rank: 3 }
  ], {});
  assert.strictEqual(pendingCorrupt.resolved, false);
  assert.strictEqual(pendingCorrupt.remainingPoints, 0, 'Invalid stored ballots must not advertise pending points.');
}

// Voting: ranks must be integral and numeric custom fields must reject invalid text.
{
  const context = engineContext('backend/engines/VotingCompetitionEngine.js');
  const settings = Object.assign({}, context.votingCompetitionDefaultSettings_('cookoff'), { rankLimit: 3 });
  const entries = [{ entryId: 'a' }, { entryId: 'b' }, { entryId: 'c' }];

  assert.throws(() => context.votingCompetitionValidateBallot_([
    { entryId: 'a', rank: 1.5 }, { entryId: 'b', rank: 2 }, { entryId: 'c', rank: 3 }
  ], entries, settings), /whole numbers|rank/i, 'Fractional ranks must not be silently floored.');
  assert.throws(() => context.votingCompetitionValidateBallot_([
    { entryId: 'a', rank: 'first' }, { entryId: 'b', rank: 2 }, { entryId: 'c', rank: 3 }
  ], entries, settings), /whole numbers|rank/i, 'Nonnumeric ranks must be rejected.');

  const customSettings = Object.assign({}, settings, {
    customFields: [{ id: 'heat', label: 'Heat Level', type: 'number', required: false, options: [] }]
  });
  assert.throws(() => context.votingCompetitionValidateCustomData_(customSettings, { heat: 'spicy' }), /Heat Level must be a number/);
  assert.strictEqual(context.votingCompetitionValidateCustomData_(customSettings, { heat: '7.5' }).heat, 7.5);
  assert.strictEqual(context.votingCompetitionValidateCustomData_(customSettings, { heat: '' }).heat, '');
}

// Sports Survivor: a finalized future week cannot settle before an earlier open week.
{
  const context = engineContext('backend/engines/SportsSurvivorEngine.js');
  const categories = [
    { id: 'w1', name: 'Week 1', points: 1, displayOrder: 1 },
    { id: 'w2', name: 'Week 2', points: 1, displayOrder: 2 }
  ];
  const settings = Object.assign({}, context.sportsSurvivorDefaultSettings_('survivor'), {
    startWeek: 1,
    endWeek: 2,
    mode: 'survivor',
    lossesAllowed: 0,
    pushRule: 'survive',
    missedPickRule: 'eliminate'
  });
  const optionMeta = {
    w1: { team1: { sportsGameId: 'g1', side: 'home' } },
    w2: { team2: { sportsGameId: 'g2', side: 'home' } }
  };
  const results = {
    w1: { g1: { Completed: false } },
    w2: { g2: { Completed: true, HomeScore: 10, AwayScore: 20 } }
  };
  const pickMeta = {
    player: {
      w1: { nomineeIds: ['team1'], snapshots: [{ sportsGameId: 'g1', side: 'home' }], confidencePoints: 0 },
      w2: { nomineeIds: ['team2'], snapshots: [{ sportsGameId: 'g2', side: 'home' }], confidencePoints: 0 }
    }
  };

  const evaluation = context.sportsSurvivorEvaluateUser_('player', 'survivor', categories, settings, optionMeta, results, pickMeta);
  assert.strictEqual(evaluation.alive, true, 'A future finalized loss must not eliminate a player while an earlier week is unresolved.');
  assert.strictEqual(evaluation.currentRoundIndex, 0);
  assert.strictEqual(evaluation.rounds[0].resolved, false);
  assert.strictEqual(evaluation.rounds[0].status, 'picked');
  assert.strictEqual(evaluation.rounds[1].resolved, false);
  assert.strictEqual(evaluation.rounds[1].status, 'upcoming');
  assert.strictEqual(evaluation.rounds[1].outcome, 'pending');
}

// KOTH: preserve late-season funnel and never award strikes to the entire active field.
{
  const context = engineContext('backend/engines/KingOfHillEngine.js');
  const players = [
    { username: 'a', score: 80, strikes: 2, eliminated: false },
    { username: 'b', score: 80, strikes: 2, eliminated: false },
    { username: 'c', score: 80, strikes: 2, eliminated: false }
  ];
  const selection = context.kothSelectRecipients_(players, 2, {
    endWeek: 17,
    kothTieRule: 'include-all',
    kothStrikeLimit: 3
  }, [], 2);
  assert(selection.recipients.length < players.length, 'Tie expansion must never eliminate the full active field.');

  assert.strictEqual(context.kothRecipientCount_([
    { username: 'a', strikes: 0, eliminated: false },
    { username: 'b', strikes: 0, eliminated: false }
  ], 1, {
    kothPacingMode: 'fixed',
    kothFixedRecipients: 5,
    endWeek: 17,
    kothStrikeLimit: 3,
    kothMinRecipients: 1,
    kothMaxRecipients: 0
  }), 1, 'Fixed pacing must preserve at least one active survivor.');

  assert.strictEqual(context.kothCustomRecipientCount_('{"3":4,"4":2}', 3), 4);
  assert.strictEqual(context.kothCustomRecipientCount_('1-4:4, 5-8:3, 9-12:2, 13-17:1', 14), 1);
}

console.log('parallel-game-hardening-ba38ccd-tests: PASS');
