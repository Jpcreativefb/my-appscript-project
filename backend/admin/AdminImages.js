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