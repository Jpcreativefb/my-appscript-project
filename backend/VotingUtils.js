// =====================================================
// RESULTS CACHE INVALIDATION
// =====================================================

function clearResultsCaches(){

  const cache =
    CacheService.getScriptCache();

  const keys = [

    // voting
    "community_results",
    "community_rankings",

    // analytics
    "voting_analytics",
    "category_analytics",

    // leaderboards
    "leaderboard_data",

    // projections
    "projected_results"

  ];

  keys.forEach(k => cache.remove(k));

}

function overwriteVotes_(rowsToKeep, newRows){

  const sh =
    SpreadsheetApp.getActive()
      .getSheetByName("Votes");

  const headers =
    sh.getDataRange()
      .getValues()[0];

  const finalRows = [
    headers,
    ...rowsToKeep,
    ...newRows
  ];

  sh.clearContents();

  sh.getRange(
    1,
    1,
    finalRows.length,
    headers.length
  ).setValues(finalRows);

}

function applySharedRanks_(rows, scoreField){

  let currentRank = 1;

  rows.forEach((row,index)=>{

    if(index > 0){

      const prev =
        rows[index - 1];

      if(row[scoreField] <
         prev[scoreField]){

        currentRank = index + 1;

      }

    }

    row.position = currentRank;

  });

  return rows;

}

function invalidateVotingSystemCaches_(){

  clearVotesCache();
  clearResultsCaches();

}