/* =========================
   ADMIN IMAGE UPLOAD ENGINE
========================= */

/*
  Put your Google Drive folder ID here.

  This should be the folder where all app images/posters
  should be saved.
*/

const ADMIN_IMAGE_UPLOAD_FOLDER_ID =
  "1h8nqwWlU2M-bz5UrpDU5-pbwaa-gqEtN";

/* =========================================================
   HELPERS
========================================================= */

function adminImageNormalizeValue_(value) {

  return String(value || "")
    .trim();

}

function adminImageSafeFileName_(value) {

  return String(value || "image")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 120) || "image";

}

function adminImageGetUploadFolder_() {

  const folderId =
    adminImageNormalizeValue_(
      ADMIN_IMAGE_UPLOAD_FOLDER_ID
    );

  if (
    !folderId ||
    folderId === "PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE"
  ) {

    throw new Error(
      "Admin image upload folder ID is not configured."
    );

  }

  return DriveApp.getFolderById(
    folderId
  );

}

function adminImageMimeToExtension_(mimeType) {

  mimeType =
    adminImageNormalizeValue_(
      mimeType
    ).toLowerCase();

  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  if (mimeType === "image/gif") {
    return "gif";
  }

  return "";

}

function adminImageValidateUpload_(
  payload
) {

  if (!payload) {

    throw new Error(
      "Upload payload missing."
    );

  }

  const fileName =
    adminImageNormalizeValue_(
      payload.fileName
    );

  const mimeType =
    adminImageNormalizeValue_(
      payload.mimeType
    );

  const base64 =
    adminImageNormalizeValue_(
      payload.base64
    );

  if (!fileName) {

    throw new Error(
      "File name is required."
    );

  }

  if (!mimeType) {

    throw new Error(
      "Mime type is required."
    );

  }

  if (!base64) {

    throw new Error(
      "Image data is required."
    );

  }

  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  if (
    allowedMimeTypes.indexOf(
      mimeType
    ) === -1
  ) {

    throw new Error(
      "Unsupported image type: " +
      mimeType
    );

  }

}

/* =========================================================
   PUBLIC ADMIN IMAGE UPLOAD
========================================================= */

function adminUploadImage(payload) {

  adminImageValidateUpload_(
    payload
  );

  const folder =
    adminImageGetUploadFolder_();

  const gameId =
    adminImageSafeFileName_(
      payload.gameId || "game"
    );

  const categoryId =
    adminImageSafeFileName_(
      payload.categoryId || "category"
    );

  const nomineeId =
    adminImageSafeFileName_(
      payload.nomineeId || "nominee"
    );

  const originalFileName =
    adminImageSafeFileName_(
      payload.fileName || "image"
    );

  const mimeType =
    adminImageNormalizeValue_(
      payload.mimeType
    );

  const extension =
    adminImageMimeToExtension_(
      mimeType
    );

  const fileName =
    [
      gameId,
      categoryId,
      nomineeId,
      Date.now(),
      originalFileName
    ].join("-") +
    (
      extension &&
      originalFileName
        .toLowerCase()
        .indexOf("." + extension) === -1
        ? "." + extension
        : ""
    );

  const bytes =
    Utilities.base64Decode(
      payload.base64
    );

  const blob =
    Utilities.newBlob(
      bytes,
      mimeType,
      fileName
    );

  const file =
    folder.createFile(
      blob
    );

  /*
    Makes preview/view links easier.
    Remove this line if you want files private.
  */
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return {
    success:
      true,

    message:
      "Image uploaded",

    fileId:
      file.getId(),

    fileName:
      file.getName(),

    viewUrl:
      "https://drive.google.com/file/d/" +
      file.getId() +
      "/view",

    thumbnailUrl:
      "https://drive.google.com/thumbnail?id=" +
      file.getId() +
      "&sz=w240-h360"
  };

}

function testAdminImageFolderAccess() {

  const folder =
    adminImageGetUploadFolder_();

  Logger.log(
    folder.getName()
  );

}

/* =========================
   ADMIN IMAGE URL IMPORT
========================= */

function adminImageGetExtensionFromUrl_(url) {

  const cleanUrl =
    String(url || "")
      .split("?")[0]
      .split("#")[0]
      .toLowerCase();

  const match =
    cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)$/);

  if (!match) {
    return "";
  }

  return match[1] === "jpeg"
    ? "jpg"
    : match[1];

}

function adminImageGetMimeFromExtension_(extension) {

  extension =
    String(extension || "")
      .trim()
      .toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  return "";

}

function adminImageNormalizeImageUrl_(url) {

  url =
    String(url || "")
      .trim();

  if (!url) {
    throw new Error("Image URL is required.");
  }

  if (
    url.indexOf("http://") !== 0 &&
    url.indexOf("https://") !== 0
  ) {
    throw new Error("Image URL must start with http:// or https://");
  }

  return url;

}

function adminImportImageFromUrl(payload) {

  if (!payload) {
    throw new Error("Import payload missing.");
  }

  const imageUrl =
    adminImageNormalizeImageUrl_(
      payload.imageUrl
    );

  const folder =
    adminImageGetUploadFolder_();

  const gameId =
    adminImageSafeFileName_(
      payload.gameId || "game"
    );

  const categoryId =
    adminImageSafeFileName_(
      payload.categoryId || "category"
    );

  const nomineeId =
    adminImageSafeFileName_(
      payload.nomineeId || "nominee"
    );

  const response =
    UrlFetchApp.fetch(
      imageUrl,
      {
        muteHttpExceptions:
          true,

        followRedirects:
          true,

        headers: {
          "User-Agent":
            "Mozilla/5.0 AwardsAppImageImporter"
        }
      }
    );

  const status =
    response.getResponseCode();

  if (status < 200 || status >= 300) {
    throw new Error(
      "Could not fetch image URL. Status: " + status
    );
  }

  const headers =
    response.getHeaders();

  let mimeType =
    String(
      headers["Content-Type"] ||
      headers["content-type"] ||
      ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

  let extension =
    adminImageGetExtensionFromUrl_(
      imageUrl
    );

  if (!mimeType && extension) {
    mimeType =
      adminImageGetMimeFromExtension_(
        extension
      );
  }

  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  if (
    allowedMimeTypes.indexOf(mimeType) === -1
  ) {
    throw new Error(
      "URL did not return a supported image type. Found: " +
      (mimeType || "unknown")
    );
  }

  if (!extension) {
    extension =
      adminImageMimeToExtension_(
        mimeType
      );
  }

  const blob =
    response
      .getBlob()
      .setContentType(
        mimeType
      );

  const maxBytes =
    5 * 1024 * 1024;

  if (blob.getBytes().length > maxBytes) {
    throw new Error(
      "Imported image is too large. Use an image under 5MB."
    );
  }

  const fileName =
    [
      gameId,
      categoryId,
      nomineeId,
      Date.now(),
      "url-import"
    ].join("-") +
    (
      extension
        ? "." + extension
        : ""
    );

  blob.setName(
    fileName
  );

  const file =
    folder.createFile(
      blob
    );

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return {
    success:
      true,

    message:
      "Image imported",

    fileId:
      file.getId(),

    fileName:
      file.getName(),

    sourceUrl:
      imageUrl,

    viewUrl:
      "https://drive.google.com/file/d/" +
      file.getId() +
      "/view",

    thumbnailUrl:
      "https://drive.google.com/thumbnail?id=" +
      file.getId() +
      "&sz=w240-h360"
  };

}

/* =========================
   ADMIN TMDB IMAGE SEARCH
========================= */

function adminImageGetTmdbApiKey_() {

  const key =
    PropertiesService
      .getScriptProperties()
      .getProperty("TMDB_API_KEY");

  if (!key) {
    throw new Error("TMDb API key is not configured.");
  }

  return key;

}

function adminTmdbFetchJson_(url) {

  const response =
    UrlFetchApp.fetch(
      url,
      {
        muteHttpExceptions: true,
        headers: {
          "accept": "application/json"
        }
      }
    );

  const status =
    response.getResponseCode();

  const text =
    response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(
      "TMDb request failed. Status: " +
      status +
      " " +
      text.substring(0, 200)
    );
  }

  return JSON.parse(text);

}

function adminSearchTmdbMoviePosters(payload) {

  if (!payload) {
    throw new Error("TMDb search payload missing.");
  }

  const query =
    String(payload.query || "")
      .trim();

  if (!query) {
    throw new Error("Movie search term is required.");
  }

  const key =
    adminImageGetTmdbApiKey_();

  const searchUrl =
    "https://api.themoviedb.org/3/search/movie" +
    "?api_key=" +
    encodeURIComponent(key) +
    "&query=" +
    encodeURIComponent(query) +
    "&include_adult=false" +
    "&language=en-US" +
    "&page=1";

  const data =
    adminTmdbFetchJson_(
      searchUrl
    );

  const results =
    Array.isArray(data.results)
      ? data.results
      : [];

  const imageBase =
    "https://image.tmdb.org/t/p/w500";

  return {
    success: true,
    results:
      results
        .filter(movie => movie.poster_path)
        .slice(0, 8)
        .map(movie => {

          const year =
            movie.release_date
              ? String(movie.release_date).slice(0, 4)
              : "";

          return {
            tmdbId:
              movie.id,

            title:
              movie.title || movie.original_title || "",

            year:
              year,

            overview:
              movie.overview || "",

            posterPath:
              movie.poster_path,

            posterUrl:
              imageBase + movie.poster_path
          };

        })
  };

}