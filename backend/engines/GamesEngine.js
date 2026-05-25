/* =========================
GAMES ENGINE
========================= */

const GAMES_SHEET = "Games";
const GAMES_CACHE_KEY = "games_v1";

/* =========================
HELPERS
========================= */

function getGamesSheet_() {

const sh = SpreadsheetApp
.getActive()
.getSheetByName(GAMES_SHEET);

if (!sh) {
throw new Error("Games sheet missing");
}

return sh;

}

function normalizeGameValue_(value) {

return String(value || "").trim();

}

function normalizeGameBoolean_(value) {

return (
value === true ||
String(value).toLowerCase() === "true"
);

}

function getGamesColumnMap_(headers) {

return {
  gameId: headers.indexOf("GameId"),
  name: headers.indexOf("Name"),
  year: headers.indexOf("Year"),
  type: headers.indexOf("Type"),
  active: headers.indexOf("Active"),
  archived: headers.indexOf("Archived"),

  defaultGame: headers.indexOf("DefaultGame"),

  predictionEnabled:
    headers.indexOf("PredictionEnabled"),

  rankingEnabled:
    headers.indexOf("RankingEnabled"),

  themeColor:
    headers.indexOf("ThemeColor"),

  icon:
    headers.indexOf("Icon"),

  sortOrder:
    headers.indexOf("SortOrder"),

  status:
    headers.indexOf("Status"),

  lockAllPicks:
    headers.indexOf("LockAllPicks")
};

}

function validateGamesColumns_(col) {

  const required = [
    "gameId",
    "name",
    "active"
  ];

  const missing =
    required.filter(key =>
      col[key] === -1
    );

  if (missing.length) {

    throw new Error(
      "Games sheet missing columns: " +
      missing.join(", ")
    );

  }

}

/* =========================
GET ALL GAMES
========================= */

function getGames() {

const cache = CacheService.getScriptCache();

const cached = cache.get(GAMES_CACHE_KEY);

if (cached) {


try {

  return JSON.parse(cached);

} catch (err) {

  Logger.log("Games cache parse failed");

}


}

const sh = getGamesSheet_();

const data = sh.getDataRange().getValues();

if (data.length <= 1) {
return [];
}

const headers = data[0];

const col = getGamesColumnMap_(headers);

validateGamesColumns_(col);

const games = [];

for (let i = 1; i < data.length; i++) {

const row = data[i];

const gameId = normalizeGameValue_(
  row[col.gameId]
);

if (!gameId) {
  continue;
}

games.push({

  gameId:
    gameId,

  name:
    normalizeGameValue_(
      row[col.name]
    ),

  year:
    row[col.year]
      ? Number(row[col.year])
      : null,

  type:
    normalizeGameValue_(
      row[col.type]
    ),

  active:
    normalizeGameBoolean_(
      row[col.active]
    ),

  archived:
    normalizeGameBoolean_(
      row[col.archived]
    ),

  defaultGame:
    normalizeGameBoolean_(
      row[col.defaultGame]
    ),

  predictionEnabled:
    normalizeGameBoolean_(
      row[col.predictionEnabled]
    ),

  rankingEnabled:
    normalizeGameBoolean_(
      row[col.rankingEnabled]
    ),

  themeColor:
    normalizeGameValue_(
      row[col.themeColor]
    ),

  icon:
    normalizeGameValue_(
      row[col.icon]
    ),

  sortOrder:
    Number(
      row[col.sortOrder]
    ) || 999,

  status:
    normalizeGameValue_(
      row[col.status]
    ),

  lockAllPicks:
    normalizeGameBoolean_(
      row[col.lockAllPicks]
    )

});

}

games.sort((a,b)=>
  a.sortOrder - b.sortOrder
);

cache.put(
GAMES_CACHE_KEY,
JSON.stringify(games),
300
);

Logger.log(JSON.stringify(games));

return games;

}

/* =========================
GET GAME
========================= */

function getGame(gameId) {

  gameId =
    normalizeGameValue_(gameId);

  if (!gameId) {
    return null;
  }

  const games = getGames();

  for (let i = 0; i < games.length; i++) {

    if (games[i].gameId === gameId) {
      return games[i];
    }

  }

  return null;

}

/* =========================
ACTIVE GAMES
========================= */

function getActiveGames() {

const games = getGames();

return games.filter(function(game){

return (
game.active === true &&
game.archived !== true
);

});

}

/* =========================
DEFAULT GAME
========================= */

function getDefaultGameId() {

  const games =
    getGames();

  const explicitDefault =
    games.find(g =>

      g.defaultGame === true &&
      g.active === true &&
      g.archived !== true

    );

  if (explicitDefault) {

    return explicitDefault.gameId;

  }

  const activeGame =
    games.find(g =>

      g.active === true &&
      g.archived !== true

    );

  if (activeGame) {

    return activeGame.gameId;

  }

  throw new Error(
    "No active game found"
  );

}

/* =========================
VALIDATE GAME
========================= */

function validateGameId(gameId) {

if (!gameId) {

throw new Error(
  "Missing gameId"
);

}

const game = getGame(gameId);

if (!game) {

throw new Error(
  "Invalid gameId: " + gameId
);


}

return true;

}

/* =========================
CACHE
========================= */

function clearGamesCache() {

CacheService
.getScriptCache()
.remove(GAMES_CACHE_KEY);

}