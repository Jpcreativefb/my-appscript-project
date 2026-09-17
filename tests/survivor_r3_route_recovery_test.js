const assert = require('assert');

function survivorString_(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}
function survivorKey_(value) {
  return survivorString_(value).toLowerCase();
}
let categoriesByGame = {};
function survivorGameCategories_(gameId) {
  return categoriesByGame[gameId] || [];
}
let configuredSports = {};
function survivorSportsModeEnabled_(gameId) {
  return configuredSports[gameId] === true;
}
function survivorSportsRuntimeEvidence_(gameId) {
  const cleanGameId = survivorString_(gameId);
  if (!cleanGameId) return false;
  try {
    const categories = survivorGameCategories_(cleanGameId);
    return (categories || []).some(function(category) {
      const id = survivorKey_(category && (category.id || category.categoryId));
      const groupId = survivorKey_(category && (category.groupId || category.GroupId));
      const questionType = survivorKey_(category && (category.questionType || category.QuestionType));
      const scoringEngine = survivorKey_(category && (category.scoringEngine || category.ScoringEngine));
      const resultSource = survivorKey_(category && (category.resultSource || category.ResultSource));
      const sourceConfig = survivorString_(category && (category.sourceConfigJSON || category.SourceConfigJSON)).toLowerCase();
      return /^sports-survivor-.*-week-\d+$/.test(id) ||
        groupId === 'sports-survivor' ||
        questionType === 'sports-survivor' ||
        (scoringEngine === 'sports' && sourceConfig.indexOf('sports-survivor') !== -1) ||
        (resultSource.indexOf('sports') !== -1 && sourceConfig.indexOf('sports-survivor') !== -1);
    });
  } catch (err) {
    return false;
  }
}
function survivorSportsRuntimeEnabled_(gameId) {
  if (typeof survivorSportsModeEnabled_ === 'function') {
    try {
      if (survivorSportsModeEnabled_(gameId)) return true;
    } catch (err) {}
  }
  return survivorSportsRuntimeEvidence_(gameId);
}

// Explicit modern setting still works.
configuredSports.explicit = true;
assert.strictEqual(survivorSportsRuntimeEnabled_('explicit'), true);

// The exact persisted CategoryId emitted by sportsSurvivorBuildWeek_ recovers the route.
categoriesByGame.recoveredById = [{ id: 'sports-survivor-nfl-week-3' }];
assert.strictEqual(survivorSportsRuntimeEnabled_('recoveredById'), true);

// Other persisted ownership markers also recover renamed/migrated weeks.
categoriesByGame.recoveredByType = [{ id: 'week-3', questionType: 'sports-survivor' }];
assert.strictEqual(survivorSportsRuntimeEnabled_('recoveredByType'), true);
categoriesByGame.recoveredBySource = [{ id: 'week-4', scoringEngine: 'sports', sourceConfigJSON: '{"source":"sports-survivor-v1.2.18y"}' }];
assert.strictEqual(survivorSportsRuntimeEnabled_('recoveredBySource'), true);

// Ordinary/manual Survivor remains manual.
categoriesByGame.manual = [{ id: 'round-1', groupId: 'reality', questionType: 'elimination' }];
assert.strictEqual(survivorSportsRuntimeEnabled_('manual'), false);

// Generic sports questions do not get misclassified without Survivor ownership evidence.
categoriesByGame.genericSports = [{ id: 'nfl-week-1', scoringEngine: 'sports', resultSource: 'sports-engine', sourceConfigJSON: '{"source":"confidence"}' }];
assert.strictEqual(survivorSportsRuntimeEnabled_('genericSports'), false);

console.log('Sports Survivor R3 real-route recovery tests: PASS');
