/* =========================
   MOVIES ENGINE
========================= */

const MOVIES_SHEET = "Movies";
const MOVIES_CACHE_KEY = "movies_v1";

/* =========================
   HELPERS
========================= */

function getMoviesSheet_(){

  const sh = SpreadsheetApp
    .getActive()
    .getSheetByName(MOVIES_SHEET);

  if(!sh){

    throw new Error(
      "Movies sheet not found"
    );

  }

  return sh;

}

function normalizeMovieValue_(value){

  return String(value || "")
    .trim();

}

function normalizeMovieBoolean_(value){

  return (
    value === true ||

    String(value)
      .toLowerCase()
      .trim() === "true"
  );

}

function slugifyMovieId_(title, year){

  const cleanTitle =
    String(title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const cleanYear =
    String(year || "")
      .trim();

  if(!cleanTitle){
    return "";
  }

  return cleanYear
    ? `${cleanTitle}-${cleanYear}`
    : cleanTitle;

}

function getMoviesColumnMap_(headers){

  return {

    movieId:
      headers.indexOf("MovieId"),

    title:
      headers.indexOf("Title"),

    year:
      headers.indexOf("Year"),

    posterFileId:
      headers.indexOf("PosterFileId"),

    active:
      headers.indexOf("Active"),

    created:
      headers.indexOf("Created"),

    tmdbId:
      headers.indexOf("TMDBId"),

    imdbId:
      headers.indexOf("IMDbId"),

    runtime:
      headers.indexOf("Runtime"),

    genre:
      headers.indexOf("Genre")

  };

}

function validateMoviesColumns_(col){

  const required = [
    "movieId",
    "title",
    "active"
  ];

  const missing =
    required.filter(key =>
      col[key] === -1
    );

  if(missing.length){

    throw new Error(
      "Movies sheet missing columns: " +
      missing.join(", ")
    );

  }

}

/* =========================
   GET MOVIES
========================= */

function getMovies(){

  const cache =
    CacheService.getScriptCache();

  const cached =
    cache.get(MOVIES_CACHE_KEY);

  if(cached){

    try {

      return JSON.parse(cached);

    } catch(err){

      Logger.log(
        "Movies cache parse failed"
      );

    }

  }

  const sh =
    getMoviesSheet_();

  const data =
    sh.getDataRange().getValues();

  if(data.length <= 1){
    return [];
  }

  const headers = data[0];

  const col =
    getMoviesColumnMap_(headers);

  validateMoviesColumns_(col);

  const movies = [];

  for(let i = 1; i < data.length; i++){

    const row = data[i];

    const movieId =
      normalizeMovieValue_(
        row[col.movieId]
      );

    if(!movieId){
      continue;
    }

    const posterFileId =
      col.posterFileId > -1
        ? normalizeMovieValue_(
            row[col.posterFileId]
          )
        : "";

    movies.push({

      movieId:
        movieId,

      title:
        normalizeMovieValue_(
          row[col.title]
        ),

      year:
        row[col.year]
          ? Number(row[col.year])
          : null,

      posterFileId:
        posterFileId,

      image:
        posterFileId
          ? `https://drive.google.com/thumbnail?id=${posterFileId}&sz=w240-h360`
          : PLACEHOLDER_IMAGE,

      active:
        normalizeMovieBoolean_(
          row[col.active]
        ),

      created:
        row[col.created] || "",

      tmdbId:
        col.tmdbId > -1
          ? normalizeMovieValue_(
              row[col.tmdbId]
            )
          : "",

      imdbId:
        col.imdbId > -1
          ? normalizeMovieValue_(
              row[col.imdbId]
            )
          : "",

      runtime:
        col.runtime > -1
          ? row[col.runtime]
          : "",

      genre:
        col.genre > -1
          ? normalizeMovieValue_(
              row[col.genre]
            )
          : ""

    });

  }

  movies.sort((a,b)=>

    a.title.localeCompare(b.title)

  );

  cache.put(
    MOVIES_CACHE_KEY,
    JSON.stringify(movies),
    300
  );

  return movies;

}

/* =========================
   GET MOVIE
========================= */

function getMovie(movieId){

  if(!movieId){
    return null;
  }

  movieId =
    normalizeMovieValue_(movieId);

  const movies =
    getMovies();

  return (

    movies.find(m =>

      m.movieId === movieId

    ) || null

  );

}

/* =========================
   GET MOVIE BY TITLE/YEAR
========================= */

function getMovieByTitleAndYear(
  title,
  year
){

  title =
    normalizeMovieValue_(title)
      .toLowerCase();

  year =
    normalizeMovieValue_(year);

  const movies =
    getMovies();

  return (

    movies.find(m =>

      String(m.title)
        .toLowerCase() === title &&

      String(m.year || "")
        === year

    ) || null

  );

}

/* =========================
   CREATE MOVIE
========================= */

function createMovie(movie){

  if(!movie){

    throw new Error(
      "Movie payload missing"
    );

  }

  const title =
    normalizeMovieValue_(
      movie.title
    );

  if(!title){

    throw new Error(
      "Movie title required"
    );

  }

  const year =
    normalizeMovieValue_(
      movie.year
    );

  // AUTO GENERATE MOVIE ID
  let movieId =
    normalizeMovieValue_(
      movie.movieId
    );

  if(!movieId){

    movieId =
      slugifyMovieId_(
        title,
        year
      );

  }

  if(!movieId){

    throw new Error(
      "Failed generating MovieId"
    );

  }

  // DUPLICATE CHECK
  const existing =
    getMovie(movieId);

  if(existing){

    return {
      success: true,
      movieId: existing.movieId,
      existing: true
    };

  }

  const sh =
    getMoviesSheet_();

  sh.appendRow([

    movieId,

    title,

    year || "",

    movie.posterFileId || "",

    movie.active !== false,

    new Date(),

    movie.tmdbId || "",

    movie.imdbId || "",

    movie.runtime || "",

    movie.genre || ""

  ]);

  clearMoviesCache();

  return {
    success: true,
    movieId: movieId,
    existing: false
  };

}

/* =========================
   GENERATE MOVIE IDS
========================= */

function generateMovieIds(){

  const sh =
    getMoviesSheet_();

  const data =
    sh.getDataRange().getValues();

  if(data.length <= 1){
    return;
  }

  const headers =
    data[0];

  const col =
    getMoviesColumnMap_(headers);

  validateMoviesColumns_(col);

  const usedIds = {};

  for(let i = 1; i < data.length; i++){

    const row = data[i];

    const title =
      normalizeMovieValue_(
        row[col.title]
      );

    const year =
      normalizeMovieValue_(
        row[col.year]
      );

    if(!title){
      continue;
    }

    let movieId =
      slugifyMovieId_(
        title,
        year
      );

    let counter = 2;
    let uniqueId = movieId;

    while(usedIds[uniqueId]){

      uniqueId =
        `${movieId}-${counter}`;

      counter++;

    }

    usedIds[uniqueId] = true;

    sh.getRange(
      i + 1,
      col.movieId + 1
    ).setValue(uniqueId);

  }

  clearMoviesCache();

  Logger.log(
    "✅ Movie IDs generated"
  );

}

/* =========================
   CACHE
========================= */

function clearMoviesCache(){

  CacheService
    .getScriptCache()
    .remove(MOVIES_CACHE_KEY);

}

/* =========================
   CREATE MOVIE
========================= */

function createMovie(movie){

  if(!movie){
    throw new Error(
      "Movie payload missing"
    );
  }

  const movieId =
    normalizeMovieValue_(
      movie.movieId
    );

  const title =
    normalizeMovieValue_(
      movie.title
    );

  if(!movieId){

    throw new Error(
      "MovieId required"
    );

  }

  if(!title){

    throw new Error(
      "Movie title required"
    );

  }

  const existing =
    getMovie(movieId);

  if(existing){

    throw new Error(
      "Movie already exists: " +
      movieId
    );

  }

  const sh =
    getMoviesSheet_();

  sh.appendRow([

    movieId,

    title,

    movie.year || "",

    movie.posterFileId || "",

    movie.active !== false,

    new Date()

  ]);

  clearMoviesCache();

  return {
    success: true
  };

}

/* =========================
   LINK CATEGORY MOVIES
========================= */
/* =========================
   NORMALIZE MOVIE LOOKUP
========================= */

function normalizeMovieLookup_(value){

  return String(value || "")

    .toLowerCase()

    .normalize("NFD")

    // remove accents
    .replace(/[\u0300-\u036f]/g, "")

    // replace ampersands
    .replace(/&/g, "and")

    // remove apostrophes
    .replace(/['’]/g, "")

    // remove all non letters/numbers
    .replace(/[^a-z0-9]+/g, " ")

    // collapse spaces
    .replace(/\s+/g, " ")

    .trim();

}


function populateCategoryMovieIds(){

  const ss =
    SpreadsheetApp.getActive();

  const moviesSheet =
    ss.getSheetByName("Movies");

  const categoriesSheet =
    ss.getSheetByName("Categories");

  if(!moviesSheet || !categoriesSheet){

    throw new Error(
      "Movies or Categories sheet missing"
    );

  }

  /* =========================
     MOVIES
  ========================= */

  const moviesData =
    moviesSheet
      .getDataRange()
      .getValues();

  const movieHeaders =
    moviesData[0];

  const movieCol = {

    movieId:
      movieHeaders.indexOf("MovieId"),

    title:
      movieHeaders.indexOf("Title"),

    year:
      movieHeaders.indexOf("Year")

  };

  const movieMap = {};

  for(let i = 1; i < moviesData.length; i++){

    const row = moviesData[i];

    const movieId =
      String(
        row[movieCol.movieId] || ""
      ).trim();

    const title =
      normalizeMovieLookup_(
          row[movieCol.title]
      );

    const year =
      String(
        row[movieCol.year] || ""
      ).trim();

    if(!movieId || !title){
      continue;
    }

    const key =
      `${title}__${year}`;

    movieMap[key] =
      movieId;

  }

  /* =========================
     CATEGORIES
  ========================= */

  const catData =
    categoriesSheet
      .getDataRange()
      .getValues();

  const headers =
    catData[0];

  const col = {

    movie:
      headers.indexOf("Movie"),

    movieId:
      headers.indexOf("MovieId"),

    gameId:
      headers.indexOf("GameId")

  };

  if(
    col.movie === -1 ||
    col.movieId === -1
  ){

    throw new Error(
      "Movie or MovieId column missing in Categories"
    );

  }

  let updated = 0;

  for(let i = 1; i < catData.length; i++){

    const row = catData[i];

    const existing =
      String(
        row[col.movieId] || ""
      ).trim();

    if(existing){
      continue;
    }

    const movie =
      normalizeMovieLookup_(
         row[col.movie]
      );

    if(!movie){
      continue;
    }

    /* =========================
       TRY MATCH
    ========================= */

    const matches =
      Object.keys(movieMap)
        .filter(key =>
           key.startsWith(movie + "__")
        );

    const matchedId =
      matches.length
         ? movieMap[matches[0]]
         : "";;

    if(!matchedId){
      continue;
    }

    categoriesSheet
      .getRange(
        i + 1,
        col.movieId + 1
      )
      .setValue(
        matchedId
      );

    updated++;

  }

  Logger.log(
    "MovieIds populated: " +
    updated
  );

}
