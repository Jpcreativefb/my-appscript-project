/* =========================
   MOVIE TRACKER ENGINE
   PRODUCTION READY
========================= */

const SEEN_MOVIES_SHEET =
  "SeenMovies";

/* =========================
   HELPERS
========================= */

function normalizeMovieTrackerValue_(value){

  return String(value || "")
    .trim();

}

function normalizeMovieTrackerBoolean_(value){

  return (
    value === true ||
    String(value)
      .trim()
      .toLowerCase() === "true"
  );

}

function getSeenMoviesSheet_(){

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SEEN_MOVIES_SHEET
    );

  if(!sh){

    sh =
      ss.insertSheet(
        SEEN_MOVIES_SHEET
      );

    sh.appendRow([
      "Username",
      "MovieId",
      "Seen",
      "Updated"
    ]);

  }

  return sh;

}

/* =========================
   GET MOVIES FROM CATEGORIES

   Builds reusable movie tracker
   database from Categories
========================= */

function getMoviesFromCategories(){

  const ss =
    SpreadsheetApp.getActive();

  const categoriesSheet =
    ss.getSheetByName(
      "Categories"
    );

  const settingsSheet =
    ss.getSheetByName(
      "CategorySettings"
    );

  if(!categoriesSheet){

    throw new Error(
      "Categories sheet not found"
    );

  }

  const normalize =
    h => String(h)
      .trim()
      .toLowerCase()
      .replace(/\s+/g,"");

  /* =========================
     CATEGORIES
  ========================= */

  const data =
    categoriesSheet
      .getDataRange()
      .getValues();

  if(data.length <= 1){
    return [];
  }

  const headers =
    data[0].map(normalize);

  const rows =
    data.slice(1);

  const col =
    name => headers.indexOf(name);

  const movieIdCol =
    col("movieid");

  const movieCol =
    col("movie");

  const personCol =
    col("person");

  const categoryCol =
    col("category");

  const categoryIdCol =
    col("categoryid");

  const nomineeIdCol =
    col("nomineeid");

  const fileIdCol =
    col("fileid");

  const activeCol =
    col("active");

  const communityRankCol =
    col("communityrank");

  if(
    movieIdCol === -1 ||
    categoryIdCol === -1
  ){

    throw new Error(
      "MovieId or CategoryId column missing"
    );

  }

  /* =========================
     CATEGORY SETTINGS MAP
  ========================= */

  const settingsMap = {};

  if(settingsSheet){

    const sData =
      settingsSheet
        .getDataRange()
        .getValues();

    if(sData.length > 1){

      const sHeaders =
        sData[0].map(normalize);

      const sRows =
        sData.slice(1);

      const sCatCol =
        sHeaders.indexOf(
          "categoryid"
        );

      const sOrderCol =
        sHeaders.indexOf(
          "displayorder"
        );

      const sWinnerCol =
        sHeaders.indexOf(
          "winnernomineeid"
        );

      sRows.forEach(row => {

        const categoryId =
          normalizeMovieTrackerValue_(
            row[sCatCol]
          );

        if(!categoryId){
          return;
        }

        settingsMap[
          categoryId
        ] = {

          order:
            Number(
              row[sOrderCol]
            ) || 999,

          winnerId:
            normalizeMovieTrackerValue_(
              row[sWinnerCol]
            )

        };

      });

    }

  }

  /* =========================
     BUILD MOVIE MAP
  ========================= */

  const movieMap = {};

  rows.forEach(row => {

    const active =
      activeCol > -1
        ? normalizeMovieTrackerBoolean_(
            row[activeCol]
          )
        : true;

    if(!active){
      return;
    }

    const communityRank =
      communityRankCol > -1
        ? normalizeMovieTrackerBoolean_(
            row[communityRankCol]
          )
        : true;

    if(!communityRank){
      return;
    }

    const movieId =
      normalizeMovieTrackerValue_(
        row[movieIdCol]
      );

    if(!movieId){
      return;
    }

    const movie =
      movieCol > -1
        ? normalizeMovieTrackerValue_(
            row[movieCol]
          )
        : "";

    if(!movie){
      return;
    }

    const person =
      personCol > -1
        ? normalizeMovieTrackerValue_(
            row[personCol]
          )
        : "";

    const category =
      categoryCol > -1
        ? normalizeMovieTrackerValue_(
            row[categoryCol]
          )
        : "";

    const categoryId =
      normalizeMovieTrackerValue_(
        row[categoryIdCol]
      );

    const nomineeId =
      nomineeIdCol > -1
        ? normalizeMovieTrackerValue_(
            row[nomineeIdCol]
          )
        : "";

    const fileId =
      fileIdCol > -1
        ? normalizeMovieTrackerValue_(
            row[fileIdCol]
          )
        : "";

    if(!categoryId){
      return;
    }

    /* =========================
       CREATE MOVIE ENTRY
    ========================= */

    if(!movieMap[movieId]){

      movieMap[movieId] = {

        movieId:
          movieId,

        movie:
          movie,

        image:
          fileId
            ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w240-h360`
            : "",

        nominationCount:
          0,

        wins:
          0,

        nominations: []

      };

    }

    /* =========================
       FILL IMAGE IF EMPTY
    ========================= */

    if(
      fileId &&
      !movieMap[movieId].image
    ){

      movieMap[movieId].image =
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w240-h360`;

    }

    /* =========================
       LABEL
    ========================= */

    let label =
      category;

    if(person){

      label +=
        ` (${person})`;

    }

    /* =========================
       SETTINGS
    ========================= */

    const setting =
      settingsMap[
        categoryId
      ] || {};

    const isWinner = (

      nomineeId &&
      setting.winnerId &&
      nomineeId === setting.winnerId

    );

    if(isWinner){

      movieMap[movieId]
        .wins++;

    }

    movieMap[movieId]
      .nominations
      .push({

        categoryId:
          categoryId,

        label:
          label,

        order:
          setting.order || 999,

        winner:
          isWinner

      });

  });

  /* =========================
     FINAL FORMAT
  ========================= */

  const result =
    Object.values(movieMap)
      .map(movie => {

        movie.nominations
          .sort(
            (a,b)=>
              a.order - b.order
          );

        movie.nominationCount =
          movie.nominations.length;

        return movie;

      });

  result.sort((a,b)=>{

    if(
      b.wins !== a.wins
    ){

      return b.wins - a.wins;

    }

    return (
      b.nominationCount -
      a.nominationCount
    );

  });

  return result;

}

/* =========================
   GET SEEN MOVIES
========================= */

function getSeenMovies(username){

  username =
    normalizeMovieTrackerValue_(
      username
    );

  if(!username){
    return {};
  }

  const sh =
    getSeenMoviesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if(data.length <= 1){
    return {};
  }

  const headers =
    data[0];

  const col = {

    username:
      headers.indexOf(
        "Username"
      ),

    movieId:
      headers.indexOf(
        "MovieId"
      ),

    seen:
      headers.indexOf(
        "Seen"
      )

  };

  const seenMap = {};

  for(let i = 1; i < data.length; i++){

    const row =
      data[i];

    const rowUser =
      normalizeMovieTrackerValue_(
        row[col.username]
      );

    if(rowUser !== username){
      continue;
    }

    const movieId =
      normalizeMovieTrackerValue_(
        row[col.movieId]
      );

    if(!movieId){
      continue;
    }

    seenMap[movieId] =
      normalizeMovieTrackerBoolean_(
        row[col.seen]
      );

  }

  return seenMap;

}

/* =========================
   SAVE SEEN MOVIES
========================= */

function saveSeenMovies(
  username,
  seenData
){

  username =
    normalizeMovieTrackerValue_(
      username
    );

  if(
    !username ||
    !seenData
  ){

    return {
      success: false
    };

  }

  const sh =
    getSeenMoviesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0];

  const col = {

    username:
      headers.indexOf(
        "Username"
      ),

    movieId:
      headers.indexOf(
        "MovieId"
      ),

    seen:
      headers.indexOf(
        "Seen"
      ),

    updated:
      headers.indexOf(
        "Updated"
      )

  };

  const existingMap = {};

  for(let i = 1; i < data.length; i++){

    const row =
      data[i];

    const rowUser =
      normalizeMovieTrackerValue_(
        row[col.username]
      );

    if(rowUser !== username){
      continue;
    }

    const movieId =
      normalizeMovieTrackerValue_(
        row[col.movieId]
      );

    if(!movieId){
      continue;
    }

    existingMap[movieId] =
      i + 1;

  }

  Object.keys(seenData)
    .forEach(movieId => {

      const seen =
        seenData[movieId] === true;

      const rowIndex =
        existingMap[movieId];

      if(rowIndex){

        sh.getRange(
          rowIndex,
          col.seen + 1
        ).setValue(seen);

        if(col.updated > -1){

          sh.getRange(
            rowIndex,
            col.updated + 1
          ).setValue(
            new Date()
          );

        }

      } else {

        sh.appendRow([

          username,

          movieId,

          seen,

          new Date()

        ]);

      }

    });

  return {
    success: true
  };

}

/* =========================
   MOVIE TRACKER DATA
========================= */

function getMovieTrackerData(
  username
){

  return {

    movies:
      getMoviesFromCategories(),

    seen:
      getSeenMovies(
        username
      )

  };

}