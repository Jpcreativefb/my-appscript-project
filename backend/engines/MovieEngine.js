/* =========================
   MOVIE TRACKER ENGINE
   PRODUCTION READY
========================= */

const SEEN_MOVIES_SHEET = "SeenMovies";
const SEEN_MOVIES_HEADERS = ["Username", "GameId", "MovieId", "Seen", "Updated"];

function normalizeMovieTrackerValue_(value){
  return String(value || "").trim();
}

function normalizeMovieTrackerKey_(value){
  return normalizeMovieTrackerValue_(value).toLowerCase();
}

function normalizeMovieTrackerBoolean_(value){
  return value === true || String(value).trim().toLowerCase() === "true";
}

function getSeenMoviesSheet_(){
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SEEN_MOVIES_SHEET);
  if(!sh){
    sh = ss.insertSheet(SEEN_MOVIES_SHEET);
    sh.appendRow(SEEN_MOVIES_HEADERS);
    return sh;
  }

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  let headers = sh.getLastRow() >= 1
    ? sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(normalizeMovieTrackerValue_)
    : [];
  if(!headers.some(Boolean)){
    sh.getRange(1, 1, 1, SEEN_MOVIES_HEADERS.length).setValues([SEEN_MOVIES_HEADERS]);
    headers = SEEN_MOVIES_HEADERS.slice();
  }
  const missing = SEEN_MOVIES_HEADERS.filter(function(header){ return headers.indexOf(header) === -1; });
  if(missing.length){
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function movieTrackerColumnMap_(headers){
  const map = {};
  (headers || []).forEach(function(header, index){ map[normalizeMovieTrackerKey_(header)] = index; });
  return map;
}

/* =========================
   GET MOVIES FROM CATEGORIES
========================= */

function getMoviesFromCategories(gameId){
  gameId = normalizeMovieTrackerValue_(gameId);
  const ss = SpreadsheetApp.getActive();
  const categoriesSheet = ss.getSheetByName("Categories");
  const settingsSheet = ss.getSheetByName("CategorySettings");
  if(!categoriesSheet) throw new Error("Categories sheet not found");

  const normalize = h => String(h).trim().toLowerCase().replace(/\s+/g,"");
  const data = categoriesSheet.getDataRange().getValues();
  if(data.length <= 1) return [];
  const headers = data[0].map(normalize);
  const rows = data.slice(1);
  const col = name => headers.indexOf(name);
  const gameIdCol = col("gameid");
  const movieIdCol = col("movieid");
  const movieCol = col("movie");
  const personCol = col("person");
  const categoryCol = col("category");
  const categoryIdCol = col("categoryid");
  const nomineeIdCol = col("nomineeid");
  const fileIdCol = col("fileid");
  const activeCol = col("active");
  const communityRankCol = col("communityrank");
  if(movieIdCol === -1 || categoryIdCol === -1) throw new Error("MovieId or CategoryId column missing");

  const settingsMap = {};
  if(settingsSheet){
    const sData = settingsSheet.getDataRange().getValues();
    if(sData.length > 1){
      const sHeaders = sData[0].map(normalize);
      const sRows = sData.slice(1);
      const sGameCol = sHeaders.indexOf("gameid");
      const sCatCol = sHeaders.indexOf("categoryid");
      const sOrderCol = sHeaders.indexOf("displayorder");
      const sWinnerCol = sHeaders.indexOf("winnernomineeid");
      sRows.forEach(row => {
        if(gameId && sGameCol > -1 && normalizeMovieTrackerValue_(row[sGameCol]) !== gameId) return;
        const categoryId = normalizeMovieTrackerValue_(row[sCatCol]);
        if(!categoryId) return;
        settingsMap[categoryId] = {
          order: Number(row[sOrderCol]) || 999,
          winnerId: normalizeMovieTrackerValue_(row[sWinnerCol])
        };
      });
    }
  }

  const movieMap = {};
  rows.forEach(row => {
    if(gameId && gameIdCol > -1 && normalizeMovieTrackerValue_(row[gameIdCol]) !== gameId) return;
    const active = activeCol > -1 ? normalizeMovieTrackerBoolean_(row[activeCol]) : true;
    if(!active) return;
    const communityRank = communityRankCol > -1 ? normalizeMovieTrackerBoolean_(row[communityRankCol]) : true;
    if(!communityRank) return;
    const movieId = normalizeMovieTrackerKey_(row[movieIdCol]);
    if(!movieId) return;
    const movie = movieCol > -1 ? normalizeMovieTrackerValue_(row[movieCol]) : "";
    if(!movie) return;
    const person = personCol > -1 ? normalizeMovieTrackerValue_(row[personCol]) : "";
    const category = categoryCol > -1 ? normalizeMovieTrackerValue_(row[categoryCol]) : "";
    const categoryId = normalizeMovieTrackerValue_(row[categoryIdCol]);
    const nomineeId = nomineeIdCol > -1 ? normalizeMovieTrackerValue_(row[nomineeIdCol]) : "";
    const fileId = fileIdCol > -1 ? normalizeMovieTrackerValue_(row[fileIdCol]) : "";
    if(!categoryId) return;

    if(!movieMap[movieId]){
      movieMap[movieId] = {
        movieId: movieId,
        movie: movie,
        image: fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w240-h360` : "",
        nominationCount: 0,
        wins: 0,
        nominations: []
      };
    }
    if(fileId && !movieMap[movieId].image){
      movieMap[movieId].image = `https://drive.google.com/thumbnail?id=${fileId}&sz=w240-h360`;
    }
    let label = category;
    if(person) label += ` (${person})`;
    const setting = settingsMap[categoryId] || {};
    const isWinner = nomineeId && setting.winnerId && nomineeId === setting.winnerId;
    if(isWinner) movieMap[movieId].wins++;
    movieMap[movieId].nominations.push({
      categoryId: categoryId,
      label: label,
      order: setting.order || 999,
      winner: isWinner
    });
  });

  const result = Object.values(movieMap).map(movie => {
    movie.nominations.sort((a,b)=>a.order-b.order);
    movie.nominationCount = movie.nominations.length;
    return movie;
  });
  result.sort((a,b)=> b.wins !== a.wins ? b.wins-a.wins : b.nominationCount-a.nominationCount);
  return result;
}

/* =========================
   GET SEEN MOVIES
========================= */

function getSeenMovies(username, gameId){
  username = normalizeMovieTrackerValue_(username);
  gameId = normalizeMovieTrackerValue_(gameId);
  if(!username) return {};
  const sh = getSeenMoviesSheet_();
  const data = sh.getDataRange().getValues();
  if(data.length <= 1) return {};
  const headers = data[0].map(normalizeMovieTrackerValue_);
  const col = movieTrackerColumnMap_(headers);
  const seenMap = {};

  for(let i=1;i<data.length;i++){
    const row = data[i];
    if(normalizeMovieTrackerValue_(row[col.username]) !== username) continue;
    const rowGameId = col.gameid === undefined ? "" : normalizeMovieTrackerValue_(row[col.gameid]);
    // Event-aware calls only consume event-scoped rows. Legacy callers that do
    // not supply GameId retain the historical unscoped behavior.
    if(gameId && rowGameId !== gameId) continue;
    if(!gameId && rowGameId) continue;
    const movieId = normalizeMovieTrackerKey_(row[col.movieid]);
    if(!movieId) continue;
    seenMap[movieId] = normalizeMovieTrackerBoolean_(row[col.seen]);
  }
  return seenMap;
}

/* =========================
   SAVE SEEN MOVIES
========================= */

function saveSeenMovies(username, seenData, gameId){
  username = normalizeMovieTrackerValue_(username);
  gameId = normalizeMovieTrackerValue_(gameId);
  if(!username || !seenData) return {success:false};

  const eligible = gameId ? getMoviesFromCategories(gameId) : [];
  const eligibleMap = {};
  eligible.forEach(function(movie){ eligibleMap[normalizeMovieTrackerKey_(movie.movieId)] = true; });

  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
  lock.waitLock(4000);
  try {
    const sh = getSeenMoviesSheet_();
    const data = sh.getDataRange().getValues();
    const headers = data[0].map(normalizeMovieTrackerValue_);
    const col = movieTrackerColumnMap_(headers);
    const existingMap = {};

    for(let i=1;i<data.length;i++){
      const row = data[i];
      if(normalizeMovieTrackerValue_(row[col.username]) !== username) continue;
      const rowGameId = col.gameid === undefined ? "" : normalizeMovieTrackerValue_(row[col.gameid]);
      if(gameId ? rowGameId !== gameId : !!rowGameId) continue;
      const movieId = normalizeMovieTrackerKey_(row[col.movieid]);
      if(movieId) existingMap[movieId] = i + 1;
    }

    Object.keys(seenData).forEach(rawMovieId => {
      const movieId = normalizeMovieTrackerKey_(rawMovieId);
      if(!movieId) return;
      if(gameId && !eligibleMap[movieId]) throw new Error("Movie is not eligible for this event: " + movieId);
      const seen = seenData[rawMovieId] === true;
      const rowIndex = existingMap[movieId];
      const now = new Date();
      if(rowIndex){
        sh.getRange(rowIndex, col.seen + 1).setValue(seen);
        if(col.updated !== undefined) sh.getRange(rowIndex, col.updated + 1).setValue(now);
      } else {
        const row = new Array(headers.length).fill("");
        row[col.username] = username;
        if(col.gameid !== undefined) row[col.gameid] = gameId;
        row[col.movieid] = movieId;
        row[col.seen] = seen;
        if(col.updated !== undefined) row[col.updated] = now;
        sh.appendRow(row);
      }
    });
    SpreadsheetApp.flush();
    return {success:true, gameId:gameId};
  } finally {
    lock.releaseLock();
  }
}

/* =========================
   MOVIE TRACKER DATA
========================= */

function getMovieTrackerData(username, gameId){
  return {
    gameId: normalizeMovieTrackerValue_(gameId),
    movies: getMoviesFromCategories(gameId),
    seen: getSeenMovies(username, gameId)
  };
}
