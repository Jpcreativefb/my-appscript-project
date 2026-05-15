/* =========================
   COMMUNITY GAMES ENGINE
========================= */

const COMMUNITY_GAMES_SHEET =
  "CommunityGames";

const COMMUNITY_GAMES_CACHE_KEY =
  "community_games_v1";

/* =========================
   HELPERS
========================= */

function getCommunityGamesSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        COMMUNITY_GAMES_SHEET
      );

  if(!sh){

    throw new Error(
      "CommunityGames sheet not found"
    );

  }

  return sh;

}

function normalizeCommunityGameValue_(value){

  return String(value || "")
    .trim();

}

function normalizeCommunityGameBoolean_(value){

  return (
    value === true ||

    String(value)
      .toLowerCase()
      .trim() === "true"
  );

}

function getCommunityGamesColumnMap_(headers){

  return {

    communityGameId:
      headers.indexOf(
        "CommunityGameId"
      ),

    name:
      headers.indexOf("Name"),

    active:
      headers.indexOf("Active"),

    defaultGame:
      headers.indexOf(
        "DefaultGame"
      ),

    revealResults:
      headers.indexOf(
        "RevealResults"
      ),

    locked:
      headers.indexOf("Locked"),

    theme:
      headers.indexOf("Theme"),

    sortOrder:
      headers.indexOf(
        "SortOrder"
      )

  };

}

function validateCommunityGamesColumns_(col){

  const required = [

    "communityGameId",
    "name",
    "active"

  ];

  const missing =
    required.filter(
      key => col[key] === -1
    );

  if(missing.length){

    throw new Error(
      "Missing CommunityGames headers: " +
      missing.join(", ")
    );

  }

}

/* =========================
   GET COMMUNITY GAMES
========================= */

function getCommunityGames(){

  const cache =
    CacheService.getScriptCache();

  const cached =
    cache.get(
      COMMUNITY_GAMES_CACHE_KEY
    );

  if(cached){

    try {

      return JSON.parse(cached);

    } catch(err){

      Logger.log(
        "CommunityGames cache parse failed"
      );

    }

  }

  const sh =
    getCommunityGamesSheet_();

  const data =
    sh.getDataRange().getValues();

  if(data.length <= 1){
    return [];
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getCommunityGamesColumnMap_(
      headers
    );

  validateCommunityGamesColumns_(col);

  const games = [];

  for(let i = 1; i < data.length; i++){

    const row = data[i];

    const communityGameId =
      normalizeCommunityGameValue_(
        row[col.communityGameId]
      );

    if(!communityGameId){
      continue;
    }

    games.push({

      communityGameId:
        communityGameId,

      name:
        normalizeCommunityGameValue_(
          row[col.name]
        ),

      active:
        normalizeCommunityGameBoolean_(
          row[col.active]
        ),

      defaultGame:
        normalizeCommunityGameBoolean_(
          row[col.defaultGame]
        ),

      revealResults:
        normalizeCommunityGameBoolean_(
          row[col.revealResults]
        ),

      locked:
        normalizeCommunityGameBoolean_(
          row[col.locked]
        ),

      theme:
        normalizeCommunityGameValue_(
          row[col.theme]
        ),

      sortOrder:
        Number(
          row[col.sortOrder]
        ) || 999

    });

  }

  games.sort((a,b)=>
    a.sortOrder - b.sortOrder
  );

  cache.put(
    COMMUNITY_GAMES_CACHE_KEY,
    JSON.stringify(games),
    300
  );

  return games;

}

/* =========================
   GET COMMUNITY GAME
========================= */

function getCommunityGame(
  communityGameId
){

  if(!communityGameId){
    return null;
  }

  communityGameId =
    normalizeCommunityGameValue_(
      communityGameId
    );

  const games =
    getCommunityGames();

  return (

    games.find(g =>

      g.communityGameId ===
      communityGameId

    ) || null

  );

}

/* =========================
   ACTIVE COMMUNITY GAMES
========================= */

function getActiveCommunityGames(){

  return getCommunityGames()
    .filter(g =>
      g.active === true
    );

}

/* =========================
   DEFAULT COMMUNITY GAME
========================= */

function getDefaultCommunityGameId(){

  const games =
    getActiveCommunityGames();

  const explicitDefault =
    games.find(g =>

      g.defaultGame === true

    );

  if(explicitDefault){

    return explicitDefault
      .communityGameId;

  }

  if(games.length){

    return games[0]
      .communityGameId;

  }

  throw new Error(
    "No active CommunityGame found"
  );

}

/* =========================
   VALIDATE COMMUNITY GAME
========================= */

function validateCommunityGameId(
  communityGameId
){

  if(!communityGameId){

    throw new Error(
      "Missing CommunityGameId"
    );

  }

  const game =
    getCommunityGame(
      communityGameId
    );

  if(!game){

    throw new Error(
      "Invalid CommunityGameId: " +
      communityGameId
    );

  }

  return true;

}

/* =========================
   CACHE
========================= */

function clearCommunityGamesCache(){

  CacheService
    .getScriptCache()
    .remove(
      COMMUNITY_GAMES_CACHE_KEY
    );

}
