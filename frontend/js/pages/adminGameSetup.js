/* ======================
   ADMIN GAME SETUP PAGE
====================== */
let adminSetupCategoryIdTouched = false;
let adminSetupNomineeIdTouched = false;
let adminSetupShortAnswerTouched = false;

function adminSetupEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminSetupSlugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function adminSetupFormatDateTimeLocal(value) {

  const text =
    String(value || "").trim();

  if (!text) {
    return "";
  }

  // Already valid for datetime-local:
  // yyyy-MM-ddThh:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  // Convert ISO string:
  // 2026-06-11T19:00:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return text.substring(0, 16);
  }

  return "";

}

function adminSetupAutoFillCategoryId() {
  const nameInput = document.getElementById("setupNewCategoryName");

  const idInput = document.getElementById("setupNewCategoryId");

  if (!nameInput || !idInput || adminSetupCategoryIdTouched) {
    return;
  }

  idInput.value = adminSetupSlugify(nameInput.value);
}

function adminSetupAutoFillNomineeFields() {
  const nomineeInput = document.getElementById("setupNewNomineeName");

  const nomineeIdInput = document.getElementById("setupNewNomineeId");

  const shortAnswerInput = document.getElementById(
    "setupNewNomineeShortAnswer"
  );

  if (!nomineeInput) {
    return;
  }

  const nomineeName = nomineeInput.value.trim();

  if (nomineeIdInput && !adminSetupNomineeIdTouched) {
    nomineeIdInput.value = adminSetupSlugify(nomineeName);
  }

  if (shortAnswerInput && !adminSetupShortAnswerTouched) {
    shortAnswerInput.value = nomineeName;
  }
}

function adminSetupBoolText(value) {
  return value ? "Yes" : "No";
}

function renderAdminSetupAddCategoryCard(gameId) {
  return `
    <details
      class="card admin-card admin-collapsible-card"
      open
    >

      <summary class="admin-card-summary">

        <div>
          <h2>Add Category / Question</h2>

          <div class="admin-sub">
            Enter the category/question name. The Category ID auto-generates.
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <div class="admin-control-grid">

          <label class="admin-field">
            <span>Category / Question</span>

            <input
              type="text"
              id="setupNewCategoryName"
              placeholder="Best Picture"
              oninput="adminSetupAutoFillCategoryId()"
            >
          </label>

          <label class="admin-field">
            <span>Points</span>

            <input
              type="number"
              id="setupNewCategoryPoints"
              value="1"
              min="0"
            >
          </label>

          <label class="admin-field">
            <span>Lock Date / Time</span>

            <input
              type="datetime-local"
              id="setupNewCategoryLockDateTime"
            >
          </label>

        </div>

        <details class="admin-advanced-details">

          <summary>
            Advanced category settings
          </summary>

          <div class="admin-control-grid">

            <label class="admin-field">
              <span>Category ID</span>

              <input
                type="text"
                id="setupNewCategoryId"
                placeholder="auto-generated"
                oninput="adminSetupCategoryIdTouched = true"
              >
            </label>

            <label class="admin-field">
              <span>Section</span>

              <input
                type="text"
                id="setupNewCategorySection"
                placeholder="Main"
                value="Main"
              >
            </label>

            <label class="admin-field">
              <span>Group ID</span>

              <input
                type="text"
                id="setupNewCategoryGroupId"
                placeholder="default"
                value="default"
              >
            </label>

            <label class="admin-field">
              <span>Display Order</span>

              <input
                type="number"
                id="setupNewCategoryDisplayOrder"
                value="999"
                min="0"
              >
            </label>

            <label class="admin-field">
              <span>Layout Type</span>

              <select id="setupNewCategoryLayoutType">
                <option value="image">Image</option>
                <option value="text">Text</option>
                <option value="compact">Compact</option>
                <option value="list">List</option>
              </select>
            </label>

            <label class="admin-field">
              <span>Parent Category ID</span>

              <input
                type="text"
                id="setupNewCategoryParentCategoryId"
                placeholder="Optional parent category"
              >
            </label>

            <label class="admin-field">
              <span>Follow-Up Category ID</span>

              <input
                type="text"
                id="setupNewCategoryFollowUpCategoryId"
                placeholder="Optional follow-up category"
              >
            </label>

          </div>

          <label class="admin-field">
            <span>Follow-Up Map JSON</span>

            <textarea
              id="setupNewCategoryFollowUpMapJSON"
              rows="4"
              placeholder='{"winner-id":"follow-up-category-id"}'
            ></textarea>
          </label>

          <label class="admin-check-row">
            <input
              type="checkbox"
              id="setupNewCategoryCountsAsStatue"
              checked
            >

            <span>
              Counts as statue
            </span>
          </label>

          <label class="admin-check-row">
            <input
              type="checkbox"
              id="setupNewCategoryLocked"
            >

            <span>
              Start locked
            </span>
          </label>

        </details>

        <button
          class="admin-small-button"
          onclick="adminSetupCreateCategory('${adminSetupEscapeHtml(gameId)}')"
        >
          Add Category
        </button>

        <div
          id="setupAddCategoryMessage"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;
}

async function renderAdminGameSetupPage(gameId) {
  const safeGameId = String(gameId || "").trim();

  if (!safeGameId) {
    return `
      <div class="page admin-page">
        <h1>Game Setup</h1>

        <div class="card admin-card error-card">
          Missing game ID.
        </div>
      </div>
    `;
  }

  const res = await apiAdminGetGameSetup(safeGameId);

  if (!res || res.success === false) {
    return `
      <div class="page admin-page">
        <h1>Game Setup</h1>

        <div class="card admin-card error-card">
          Could not load game setup.
          <br>
          ${adminSetupEscapeHtml(
            res && (res.message || res.error)
              ? res.message || res.error
              : "Please refresh and try again."
          )}
        </div>

        <button
          class="admin-small-button secondary"
          onclick="navigate('admin-games')"
        >
          Back to Manage Games
        </button>
      </div>
    `;
  }

  const categories = Array.isArray(res.categories) ? res.categories : [];

  return `
    <div class="page admin-page admin-game-setup-page">

      <div class="admin-page-header">

        <div>
          <h1>Game Setup</h1>

          <div class="admin-sub">
            ${adminSetupEscapeHtml(safeGameId)}
          </div>
        </div>

        <div class="admin-header-actions">

          <button
            class="admin-small-button"
            onclick="adminSetupFinalizeResults('${adminSetupEscapeHtml(
              safeGameId
            )}', true)"
          >
            Mark Results Finalized
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupFinalizeResults('${adminSetupEscapeHtml(
              safeGameId
            )}', false)"
          >
            Reopen Results
          </button>

          <button
            class="admin-small-button secondary"
            onclick="navigate('admin-games')"
          >
            Back to Manage Games
          </button>

        </div>

      </div>

      <div class="admin-section">

        ${renderAdminSetupAddCategoryCard(safeGameId)}

        ${renderAdminSetupAddNomineeCard(safeGameId, categories)}

        <details
  class="card admin-card admin-collapsible-card"
  open
>

  <summary class="admin-card-summary">

    <div>
      <h2>Categories / Questions</h2>

      <div class="admin-sub">
        ${categories.length} categories/questions configured.
      </div>
    </div>

    <span class="admin-collapse-icon">
      ▾
    </span>

  </summary>

  <div class="admin-collapsible-body">

    <div
      id="adminSetupMessage"
      class="admin-message"
    ></div>

    ${
      categories.length
        ? `
          <div class="admin-list">
            ${categories.map(renderAdminSetupCategoryCard).join("")}
          </div>
        `
        : `
          <div class="admin-sub">
            No categories found yet. Add your first category above.
          </div>
        `
    }

  </div>

</details>

      </div>

    </div>
  `;
}

function adminSetupOpenAttr(defaultOpen) {
  return defaultOpen ? "open" : "";
}

/* ======================
   ADMIN FILE ID HELPERS
====================== */

function adminSetupCleanFileId(value) {
  return String(value || "").trim();
}

function adminSetupExtractDriveFileId(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  // Already looks like a plain Drive file ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text) && text.indexOf("/") === -1) {
    return text;
  }

  // Format:
  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = text.match(/\/file\/d\/([^/]+)/);

  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }

  // Format:
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const idMatch = text.match(/[?&]id=([^&]+)/);

  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return text;
}

function adminSetupDriveThumbnailUrl(fileId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(fileId) +
    "&sz=w240-h360"
  );
}

function adminSetupDriveViewUrl(fileId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/file/d/" + encodeURIComponent(fileId) + "/view"
  );
}

function adminSetupDriveDownloadUrl(fileId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/uc?export=download&id=" +
    encodeURIComponent(fileId)
  );
}

function adminSetupCopyText(value) {
  const text = String(value || "").trim();

  if (!text) {
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function adminSetupNormalizeFileInput(inputId) {
  const input = document.getElementById(inputId);

  if (!input) {
    return;
  }

  input.value = adminSetupExtractDriveFileId(input.value);
}

function renderAdminSetupFileTools(fileId, inputId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return `
      <div class="admin-file-tools empty">

        <button
          type="button"
          class="admin-small-button secondary"
          onclick="adminSetupNormalizeFileInput('${adminSetupEscapeHtml(
            inputId
          )}')"
        >
          Extract ID from pasted Drive link
        </button>

        <span class="admin-sub">
          No File ID set yet.
        </span>

      </div>
    `;
  }

  const thumbnailUrl = adminSetupDriveThumbnailUrl(fileId);

  const viewUrl = adminSetupDriveViewUrl(fileId);

  const downloadUrl = adminSetupDriveDownloadUrl(fileId);

  return `
    <div class="admin-file-tools">

      <div class="admin-file-preview">
        <img
          src="${adminSetupEscapeHtml(thumbnailUrl)}"
          alt="Image preview"
          loading="lazy"
        >
      </div>

      <div class="admin-file-actions">

        <a
          class="admin-small-button secondary"
          href="${adminSetupEscapeHtml(viewUrl)}"
          target="_blank"
          rel="noopener"
        >
          View
        </a>

        <a
          class="admin-small-button secondary"
          href="${adminSetupEscapeHtml(downloadUrl)}"
          target="_blank"
          rel="noopener"
        >
          Download
        </a>

        <button
          type="button"
          class="admin-small-button secondary"
          onclick="adminSetupCopyText('${adminSetupEscapeHtml(fileId)}')"
        >
          Copy ID
        </button>

        <button
          type="button"
          class="admin-small-button secondary"
          onclick="adminSetupNormalizeFileInput('${adminSetupEscapeHtml(
            inputId
          )}')"
        >
          Extract ID
        </button>

      </div>

    </div>
  `;
}

/* ======================
   ADMIN IMAGE UPLOAD HELPERS
====================== */

function adminSetupFileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = () => {

      const result =
        String(reader.result || "");

      const base64 =
        result.indexOf(",") !== -1
          ? result.split(",")[1]
          : result;

      resolve(base64);

    };

    reader.onerror = () => {

      reject(
        new Error("Could not read image file.")
      );

    };

    reader.readAsDataURL(file);

  });

}

function adminSetupValidateImageFile(file) {

  if (!file) {

    return "Choose an image file first.";

  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif"
  ];

  if (
    allowedTypes.indexOf(file.type) === -1 &&
    file.type
  ) {

    return "Image must be JPG, PNG, WEBP, GIF, HEIC, or HEIF.";

  }

  const maxOriginalBytes =
    15 * 1024 * 1024;

  if (file.size > maxOriginalBytes) {

    return "Image must be 15MB or smaller before resizing.";

  }

  return "";

}

function adminSetupResizeImageFile(file) {

  return new Promise((resolve, reject) => {

    if (!file) {

      reject(
        new Error("No image file selected.")
      );

      return;

    }

    const image =
      new Image();

    const objectUrl =
      URL.createObjectURL(file);

    image.onload = () => {

      URL.revokeObjectURL(
        objectUrl
      );

      const maxWidth =
        900;

      const maxHeight =
        1350;

      let width =
        image.width;

      let height =
        image.height;

      const ratio =
        Math.min(
          maxWidth / width,
          maxHeight / height,
          1
        );

      width =
        Math.round(
          width * ratio
        );

      height =
        Math.round(
          height * ratio
        );

      const canvas =
        document.createElement("canvas");

      canvas.width =
        width;

      canvas.height =
        height;

      const ctx =
        canvas.getContext("2d");

      ctx.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(
        blob => {

          if (!blob) {

            reject(
              new Error("Could not resize image.")
            );

            return;

          }

          const safeName =
            String(file.name || "image")
              .replace(/\.[^/.]+$/, "") +
            ".jpg";

          const resizedFile =
            new File(
              [blob],
              safeName,
              {
                type:
                  "image/jpeg"
              }
            );

          resolve(
            resizedFile
          );

        },
        "image/jpeg",
        0.82
      );

    };

    image.onerror = () => {

      URL.revokeObjectURL(
        objectUrl
      );

      reject(
        new Error(
          "Could not load image. Try choosing a JPG or PNG instead."
        )
      );

    };

    image.src =
      objectUrl;

  });

}

async function adminSetupUploadNomineeImage(
  gameId,
  categoryId,
  nomineeId,
  source
) {

  console.log(
    "UPLOAD START",
    {
      gameId:
        gameId,
      categoryId:
        categoryId,
      nomineeId:
        nomineeId,
      source:
        source
    }
  );

  const chooseInputId =
    "uploadNomineeImage_" +
    categoryId +
    "_" +
    nomineeId;

  const captureInputId =
    "captureNomineeImage_" +
    categoryId +
    "_" +
    nomineeId;

  const selectedInputId =
    source === "capture"
      ? captureInputId
      : chooseInputId;

  const selectedInput =
    document.getElementById(
      selectedInputId
    );

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const file =
    selectedInput &&
    selectedInput.files &&
    selectedInput.files[0]
      ? selectedInput.files[0]
      : null;

  if (!file) {

    adminSetupSetMessage(
      messageId,
      source === "capture"
        ? "Take a photo first, then tap Upload Photo."
        : "Choose an image first, then tap Upload Chosen Image.",
      true
    );

    console.log(
      "UPLOAD STOP: no file selected",
      {
        selectedInputId:
          selectedInputId
      }
    );

    return;

  }

  console.log(
    "UPLOAD ORIGINAL FILE",
    {
      name:
        file.name,
      type:
        file.type,
      size:
        file.size
    }
  );

  const validationError =
    adminSetupValidateImageFile(
      file
    );

  if (validationError) {

    adminSetupSetMessage(
      messageId,
      validationError,
      true
    );

    console.log(
      "UPLOAD STOP: validation error",
      validationError
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Resizing image...",
    false
  );

  let uploadFile =
    file;

  try {

    uploadFile =
      await adminSetupResizeImageFile(
        file
      );

    console.log(
      "UPLOAD RESIZED FILE",
      {
        name:
          uploadFile.name,
        type:
          uploadFile.type,
        size:
          uploadFile.size
      }
    );

  } catch (err) {

    console.error(
      "UPLOAD RESIZE ERROR",
      err
    );

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Could not resize image.",
      true
    );

    return;

  }

  const maxUploadBytes =
    2 * 1024 * 1024;

  if (uploadFile.size > maxUploadBytes) {

    adminSetupSetMessage(
      messageId,
      "Image is still larger than 2MB after resizing. Try a smaller photo.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Reading resized image...",
    false
  );

  let base64 =
    "";

  try {

    base64 =
      await adminSetupFileToBase64(
        uploadFile
      );

    console.log(
      "UPLOAD BASE64 READY",
      {
        length:
          base64.length
      }
    );

  } catch (err) {

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Could not read image file.",
      true
    );

    console.error(
      "UPLOAD READ ERROR",
      err
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Uploading image to Drive...",
    false
  );

  let res;

  try {

    res =
      await Promise.race([
        apiAdminUploadImage({
          gameId:
            gameId,

          categoryId:
            categoryId,

          nomineeId:
            nomineeId,

          fileName:
            uploadFile.name,

          mimeType:
            uploadFile.type,

          base64:
            base64
        }),

        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success:
                  false,
                error:
                  "Upload timed out after 45 seconds."
              }),
            45000
          )
        )
      ]);

  } catch (err) {

    console.error(
      "UPLOAD API ERROR",
      err
    );

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Image upload failed.",
      true
    );

    return;

  }

  console.log(
    "UPLOAD RESPONSE",
    res
  );

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Image upload failed.",
      true
    );

    return;

  }

  if (fileIdInput) {

    fileIdInput.value =
      res.fileId || "";

  }

  adminSetupSetMessage(
    messageId,
    "Image uploaded. Click Save Nominee to keep this File ID.",
    false
  );

}

async function adminSetupImportNomineeImageFromUrl(
  gameId,
  categoryId,
  nomineeId
) {

  const urlInput =
    document.getElementById(
      "importNomineeImageUrl_" +
      categoryId +
      "_" +
      nomineeId
    );

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const imageUrl =
    urlInput
      ? urlInput.value.trim()
      : "";

  if (!imageUrl) {

    adminSetupSetMessage(
      messageId,
      "Paste an image URL first.",
      true
    );

    return;

  }

  if (
    imageUrl.indexOf("http://") !== 0 &&
    imageUrl.indexOf("https://") !== 0
  ) {

    adminSetupSetMessage(
      messageId,
      "Image URL must start with http:// or https://",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Importing image from URL...",
    false
  );

  let res;

  try {

    res =
      await Promise.race([
        apiAdminImportImageFromUrl({
          gameId:
            gameId,

          categoryId:
            categoryId,

          nomineeId:
            nomineeId,

          imageUrl:
            imageUrl
        }),

        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success:
                  false,
                error:
                  "Import timed out after 45 seconds."
              }),
            45000
          )
        )
      ]);

  } catch (err) {

    console.error(
      "IMPORT URL ERROR",
      err
    );

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Image import failed.",
      true
    );

    return;

  }

  console.log(
    "IMPORT URL RESPONSE",
    res
  );

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Image import failed.",
      true
    );

    return;

  }

  if (fileIdInput) {

    fileIdInput.value =
      res.fileId || "";

  }

  adminSetupSetMessage(
    messageId,
    "Image imported. Click Save Nominee to keep this File ID.",
    false
  );

}

async function adminSetupSearchTmdbPosters(
  gameId,
  categoryId,
  nomineeId
) {

  const searchInput =
    document.getElementById(
      "tmdbPosterSearch_" +
      categoryId +
      "_" +
      nomineeId
    );

  const resultsEl =
    document.getElementById(
      "tmdbPosterResults_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const query =
    searchInput
      ? searchInput.value.trim()
      : "";

  if (!query) {

    adminSetupSetMessage(
      messageId,
      "Enter a movie title to search TMDb.",
      true
    );

    return;

  }

  if (resultsEl) {
    resultsEl.innerHTML = "";
  }

  adminSetupSetMessage(
    messageId,
    "Searching TMDb...",
    false
  );

  const res =
    await apiAdminSearchTmdbMoviePosters({
      query:
        query
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "TMDb search failed.",
      true
    );

    return;

  }

  const results =
    Array.isArray(res.results)
      ? res.results
      : [];

  if (!results.length) {

    adminSetupSetMessage(
      messageId,
      "No TMDb posters found.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Choose a TMDb poster to import.",
    false
  );

  if (resultsEl) {

    resultsEl.innerHTML =
      results
        .map(item => `
          <div class="admin-tmdb-result">

            <img
              src="${adminSetupEscapeHtml(item.posterUrl)}"
              alt="${adminSetupEscapeHtml(item.title)} poster"
              loading="lazy"
            >

            <div class="admin-tmdb-result-body">

              <strong>
                ${adminSetupEscapeHtml(item.title)}
              </strong>

              <div class="admin-sub">
                ${adminSetupEscapeHtml(item.year || "Unknown year")}
              </div>

              <button
                type="button"
                class="admin-small-button secondary"
                onclick="adminSetupImportTmdbPoster('${gameId}', '${categoryId}', '${nomineeId}', '${adminSetupEscapeHtml(item.posterUrl)}')"
              >
                Import Poster
              </button>

            </div>

          </div>
        `)
        .join("");

  }

}

async function adminSetupImportTmdbPoster(
  gameId,
  categoryId,
  nomineeId,
  posterUrl
) {

  const urlInput =
    document.getElementById(
      "importNomineeImageUrl_" +
      categoryId +
      "_" +
      nomineeId
    );

  if (urlInput) {
    urlInput.value =
      posterUrl;
  }

  await adminSetupImportNomineeImageFromUrl(
    gameId,
    categoryId,
    nomineeId
  );

}

/* ======================
   CATEGORY CARD
====================== */

function renderAdminSetupCategoryCard(category) {
  const settings = category.settings || {};

  const nominees = Array.isArray(category.nominees) ? category.nominees : [];

  const gameId = adminSetupEscapeHtml(category.gameId);

  const categoryId = adminSetupEscapeHtml(category.categoryId);

  return `
    <details
      class="admin-category-card admin-collapsible-category"
    >

      <summary class="admin-category-summary">

        <div class="admin-category-header">

          <div>
            <strong>
              ${adminSetupEscapeHtml(category.category || category.categoryId)}
            </strong>

            <div class="admin-sub">
              ${categoryId}
              ·
              ${adminSetupEscapeHtml(category.section || "Other")}
              ·
              ${adminSetupEscapeHtml(settings.groupId || "default")}
              ·
              ${nominees.length} nominees
            </div>
          </div>

          <div class="admin-pill ${settings.locked ? "locked" : ""}">
            ${settings.locked ? "Locked" : "Open"}
          </div>

        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <div class="admin-edit-panel">

          <div class="admin-control-grid">

            <label class="admin-field">
              <span>Category / Question</span>

              <input
                type="text"
                id="editCategoryName_${categoryId}"
                value="${adminSetupEscapeHtml(category.category)}"
              >
            </label>

            <label class="admin-field">
              <span>Section</span>

              <input
                type="text"
                id="editCategorySection_${categoryId}"
                value="${adminSetupEscapeHtml(category.section || "Other")}"
              >
            </label>

            <label class="admin-field">
              <span>Points</span>

              <input
                type="number"
                id="editCategoryPoints_${categoryId}"
                value="${Number(settings.points) || 0}"
                min="0"
              >
            </label>

            <label class="admin-field">
              <span>Display Order</span>

              <input
                type="number"
                id="editCategoryOrder_${categoryId}"
                value="${Number(settings.displayOrder) || 999}"
                min="0"
              >
            </label>

            <label class="admin-field">
              <span>Layout Type</span>

              <select id="editCategoryLayout_${categoryId}">

                <option
                  value="image"
                  ${settings.layoutType === "image" ? "selected" : ""}
                >
                  Image
                </option>

                <option
                  value="text"
                  ${settings.layoutType === "text" ? "selected" : ""}
                >
                  Text
                </option>

                <option
                  value="compact"
                  ${settings.layoutType === "compact" ? "selected" : ""}
                >
                  Compact
                </option>

                <option
                  value="list"
                  ${settings.layoutType === "list" ? "selected" : ""}
                >
                  List
                </option>

              </select>
            </label>

          </div>

          <div class="admin-checkbox-row">

            <label>
              <input
                type="checkbox"
                id="editCategoryLocked_${categoryId}"
                ${settings.locked ? "checked" : ""}
              >
              Locked
            </label>

            <label>
              <input
                type="checkbox"
                id="editCategoryActive_${categoryId}"
                ${category.active !== false ? "checked" : ""}
              >
              Active
            </label>

            <label>
              <input
                type="checkbox"
                id="editCategoryPrediction_${categoryId}"
                ${category.predictionGame !== false ? "checked" : ""}
              >
              Prediction Game
            </label>

            <label>
              <input
                type="checkbox"
                id="editCategoryStatue_${categoryId}"
                ${settings.countsAsStatue ? "checked" : ""}
              >
              Counts as Statue
            </label>

          </div>

          <details class="admin-advanced-details">

            <summary>
              Advanced category settings
            </summary>

            <div class="admin-control-grid">

              <label class="admin-field">
                <span>Lock Date / Time</span>

                <input
                  type="datetime-local"
                  id="editCategoryLockDateTime_${categoryId}"
                  value="${adminSetupEscapeHtml(
                    adminSetupFormatDateTimeLocal(settings.lockDateTime)
                  )}"
                >
              </label>

              <label class="admin-field">
                <span>Group ID</span>

                <input
                  type="text"
                  id="editCategoryGroupId_${categoryId}"
                  value="${adminSetupEscapeHtml(settings.groupId || "default")}"
                  placeholder="default"
                >
              </label>

              <label class="admin-field">
                <span>Parent Category ID</span>

                <input
                  type="text"
                  id="editCategoryParentCategoryId_${categoryId}"
                  value="${adminSetupEscapeHtml(
                    settings.parentCategoryId || ""
                  )}"
                  placeholder="Optional parent category"
                >
              </label>

              <label class="admin-field">
                <span>Follow-Up Category ID</span>

                <input
                  type="text"
                  id="editCategoryFollowUpCategoryId_${categoryId}"
                  value="${adminSetupEscapeHtml(
                    settings.followUpCategoryId || ""
                  )}"
                  placeholder="Optional follow-up category"
                >
              </label>

            </div>

            <label class="admin-field">
              <span>Follow-Up Map JSON</span>

              <textarea
                id="editCategoryFollowUpMapJSON_${categoryId}"
                rows="4"
                placeholder='{"winner-id":"follow-up-category-id"}'
              >${adminSetupEscapeHtml(
                settings.followUpMapJSON || ""
              )}</textarea>
            </label>

          </details>

          <div class="admin-card-actions">

            <button
              class="admin-small-button"
              onclick="adminSetupUpdateCategory('${gameId}', '${categoryId}')"
            >
              Save Category
            </button>

            <button
              class="admin-danger-button"
              onclick="adminSetupArchiveCategory('${gameId}', '${categoryId}')"
            >
              Archive Category
            </button>

          </div>

          <div
            id="editCategoryMessage_${categoryId}"
            class="admin-message"
          ></div>

        </div>

        ${renderAdminResultsPanel(category, nominees, settings)}

        <details class="admin-setup-nominees">

          <summary class="admin-nominee-summary">

            <h3>Nominees / Answers</h3>

            <span class="admin-sub">
              ${nominees.length} total
            </span>

            <span class="admin-collapse-icon">
              ▾
            </span>

          </summary>

          <div class="admin-collapsible-body">

            ${
              nominees.length
                ? nominees
                    .map((nominee) =>
                      renderAdminSetupNomineeRow(category, nominee)
                    )
                    .join("")
                : `
                  <div class="admin-sub">
                    No nominees added yet.
                  </div>
                `
            }

          </div>

        </details>

      </div>

    </details>
  `;
}

/* ======================
   ADD NOMINEE CARD
====================== */

function renderAdminSetupAddNomineeCard(gameId, categories) {
  const options = categories
    .map(
      (cat) => `
        <option value="${adminSetupEscapeHtml(cat.categoryId)}">
          ${adminSetupEscapeHtml(cat.category || cat.categoryId)}
        </option>
      `
    )
    .join("");

  return `
    <details
      class="card admin-card admin-collapsible-card"
      open
    >

      <summary class="admin-card-summary">

        <div>
          <h2>Add Nominee / Answer</h2>

          <div class="admin-sub">
            Choose a category and enter the nominee/answer. ID and short answer are auto-filled.
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        ${
          categories.length
            ? `
              <div class="admin-control-grid">

                <label class="admin-field">
                  <span>Category</span>

                  <select id="setupNomineeCategoryId">
                    ${options}
                  </select>
                </label>

                <label class="admin-field">
                  <span>Nominee / Answer</span>

                  <input
                    type="text"
                    id="setupNewNomineeName"
                    placeholder="Movie Title"
                    oninput="adminSetupAutoFillNomineeFields()"
                  >
                </label>

              </div>

              <details class="admin-advanced-details">

                <summary>
                  Advanced fields
                </summary>

                <div class="admin-control-grid">

                  <label class="admin-field">
                    <span>Nominee ID</span>

                    <input
                      type="text"
                      id="setupNewNomineeId"
                      placeholder="auto-generated"
                      oninput="adminSetupNomineeIdTouched = true"
                    >
                  </label>

                  <label class="admin-field">
                    <span>Short Answer</span>

                    <input
                      type="text"
                      id="setupNewNomineeShortAnswer"
                      placeholder="auto-filled"
                      oninput="adminSetupShortAnswerTouched = true"
                    >
                  </label>

                  <label class="admin-field">
                    <span>File ID</span>

                    <input
                      type="text"
                      id="setupNewNomineeFileId"
                      placeholder="Optional Google Drive file ID"
                    >
                  </label>

                  <label class="admin-field">
                    <span>Section</span>

                    <input
                      type="text"
                      id="setupNewNomineeSection"
                      placeholder="Main"
                      value="Main"
                    >
                  </label>

                </div>

              </details>

              <button
                class="admin-small-button"
                onclick="adminSetupCreateNominee('${adminSetupEscapeHtml(
                  gameId
                )}')"
              >
                Add Nominee
              </button>
            `
            : `
              <div class="admin-sub">
                Add a category first before adding nominees.
              </div>
            `
        }

        <div
          id="setupAddNomineeMessage"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;
}

/* ======================
   RESULTS / WINNERS PANEL
====================== */

function renderAdminResultsPanel(category, nominees, settings) {
  const gameId = adminSetupEscapeHtml(category.gameId);

  const categoryId = adminSetupEscapeHtml(category.categoryId);

  const winnerNomineeId = String(settings.winnerNomineeId || "").trim();

  const favoriteNomineeId = String(settings.favoriteNomineeId || "").trim();

  const nomineeOptions = nominees
    .filter((nominee) => nominee.active !== false)
    .map((nominee) => {
      const nomineeId = String(nominee.nomineeId || "").trim();

      const nomineeName = nominee.nominee || nominee.nomineeId;

      return `
          <option
            value="${adminSetupEscapeHtml(nomineeId)}"
            ${nomineeId === winnerNomineeId ? "selected" : ""}
          >
            ${adminSetupEscapeHtml(nomineeName)}
          </option>
        `;
    })
    .join("");

  const favoriteOptions = nominees
    .filter((nominee) => nominee.active !== false)
    .map((nominee) => {
      const nomineeId = String(nominee.nomineeId || "").trim();

      const nomineeName = nominee.nominee || nominee.nomineeId;

      return `
          <option
            value="${adminSetupEscapeHtml(nomineeId)}"
            ${nomineeId === favoriteNomineeId ? "selected" : ""}
          >
            ${adminSetupEscapeHtml(nomineeName)}
          </option>
        `;
    })
    .join("");

  return `
    <details class="admin-results-panel">
  
      <summary class="admin-results-summary">
  
        <div class="admin-results-head">

        <div>
          <h3>Results / Winners</h3>

          <div class="admin-sub">
            Select the actual winner and optional favorite/projection.
          </div>
        </div>

      </div>

      </div>

      <span class="admin-collapse-icon">
        ▾
      </span>

    </summary>

    <div class="admin-collapsible-body">

      ${
        nominees.length
          ? `
            <div class="admin-control-grid">

              <label class="admin-field">
                <span>Winner Nominee</span>

                <select id="resultWinner_${categoryId}">
                  <option value="">Not selected</option>
                  ${nomineeOptions}
                </select>
              </label>

              <label class="admin-field">
                <span>Favorite Nominee</span>

                <select id="resultFavorite_${categoryId}">
                  <option value="">Not selected</option>
                  ${favoriteOptions}
                </select>
              </label>

            </div>

            <div class="admin-card-actions">

              <button
                class="admin-small-button"
                onclick="adminSetupSaveResults('${gameId}', '${categoryId}')"
              >
                Save Results
              </button>

              <button
                class="admin-danger-button"
                onclick="adminSetupClearResults('${gameId}', '${categoryId}')"
              >
                Clear Results
              </button>

            </div>
          `
          : `
            <div class="admin-sub">
              Add nominees before setting results.
            </div>
          `
      }

      <div
        id="resultMessage_${categoryId}"
        class="admin-message"
      ></div>

    </div>

    </details>
  `;
}

/* ======================
   ACTION HELPERS
====================== */

function adminSetupSetMessage(id, message, isError) {
  const el = document.getElementById(id);

  if (!el) {
    return;
  }

  el.classList.toggle("is-error", Boolean(isError));

  el.innerText = message || "";
}

function adminSetupGetCategoryNameById(categoryId) {
  const select = document.getElementById("setupNomineeCategoryId");

  if (!select) {
    return "";
  }

  const option = Array.from(select.options).find(
    (opt) => opt.value === categoryId
  );

  return option ? option.textContent.trim() : "";
}

function renderAdminSetupNomineeRow(category, nominee) {
  const gameId = adminSetupEscapeHtml(category.gameId);

  const categoryId = adminSetupEscapeHtml(category.categoryId);

  const nomineeId = adminSetupEscapeHtml(nominee.nomineeId);

  const fileInputId = "editNomineeFileId_" + categoryId + "_" + nomineeId;

  return `
    <div class="admin-setup-nominee-edit-row">

      <div class="admin-control-grid nominee-grid">

        <label class="admin-field">
          <span>Nominee / Answer</span>

          <input
            type="text"
            id="editNomineeName_${categoryId}_${nomineeId}"
            value="${adminSetupEscapeHtml(nominee.nominee)}"
          >
        </label>

        <label class="admin-field">
          <span>Short Answer</span>

          <input
            type="text"
            id="editNomineeShort_${categoryId}_${nomineeId}"
            value="${adminSetupEscapeHtml(
              nominee.shortAnswer || nominee.nominee
            )}"
          >
        </label>

          <label class="admin-field">
              <span>File ID</span>

            <input
              type="text"
              id="${fileInputId}"
              value="${adminSetupEscapeHtml(nominee.fileId || "")}"
              placeholder="Paste Drive File ID or Drive link"
            >
          </label>

          <div class="admin-upload-tools">

          <label class="admin-field">
            <span>Choose Image / Camera Roll</span>
        
            <input
              type="file"
              id="uploadNomineeImage_${categoryId}_${nomineeId}"
              accept="image/*"
            >
          </label>
        
          <button
            type="button"
            class="admin-small-button secondary"
            onclick="adminSetupUploadNomineeImage('${gameId}', '${categoryId}', '${nomineeId}', 'choose')"
          >
            Upload Chosen Image
          </button>
        
          <label class="admin-field">
            <span>Take Photo</span>
        
            <input
              type="file"
              id="captureNomineeImage_${categoryId}_${nomineeId}"
              accept="image/*"
              capture="environment"
            >
          </label>
        
          <button
            type="button"
            class="admin-small-button secondary"
            onclick="adminSetupUploadNomineeImage('${gameId}', '${categoryId}', '${nomineeId}', 'capture')"
          >
            Upload Photo
          </button>
        
        </div>

        <div class="admin-url-import-tools">

            <label class="admin-field">
              <span>Import Image from URL</span>

              <input
                 type="url"
                 id="importNomineeImageUrl_${categoryId}_${nomineeId}"
                 placeholder="https://example.com/image.jpg"
              >
            </label>

            <button
                 type="button"
                 class="admin-small-button secondary"
                 onclick="adminSetupImportNomineeImageFromUrl('${gameId}', '${categoryId}', '${nomineeId}')"
            >
                 Import URL
            </button>

        </div>

        <div class="admin-tmdb-tools">

            <label class="admin-field">
              <span>Search TMDb Movie Poster</span>
      
              <input
                 type="text"
                 id="tmdbPosterSearch_${categoryId}_${nomineeId}"
                 value="${adminSetupEscapeHtml(nominee.nominee || "")}"
                 placeholder="Movie title"
              >
            </label>
      
            <button
                 type="button"
                 class="admin-small-button secondary"
                 onclick="adminSetupSearchTmdbPosters('${gameId}', '${categoryId}', '${nomineeId}')"
            >
               Search TMDb
            </button>
      
        </div>
      
        <div
           id="tmdbPosterResults_${categoryId}_${nomineeId}"
           class="admin-tmdb-results"
        ></div>  
         
        <div class="admin-sub">
            This product uses the TMDb API but is not endorsed or certified by TMDb.
        </div>

      ${renderAdminSetupFileTools(nominee.fileId || "", fileInputId)}

      </div>

      <div class="admin-nominee-edit-footer">

        <label class="admin-check-row compact">
          <input
            type="checkbox"
            id="editNomineeActive_${categoryId}_${nomineeId}"
            ${nominee.active !== false ? "checked" : ""}
          >

          <span>
            Active
          </span>
        </label>

        <div class="admin-card-actions">

          <button
            class="admin-small-button"
            onclick="adminSetupUpdateNominee('${gameId}', '${categoryId}', '${nomineeId}')"
          >
            Save Nominee
          </button>

          <button
            class="admin-danger-button"
            onclick="adminSetupArchiveNominee('${gameId}', '${categoryId}', '${nomineeId}')"
          >
            Archive
          </button>

        </div>

      </div>

      <div
        id="editNomineeMessage_${categoryId}_${nomineeId}"
        class="admin-message"
      ></div>

    </div>
  `;
}

/* ======================
   CREATE CATEGORY
====================== */

async function adminSetupCreateCategory(gameId) {
  const nameInput = document.getElementById("setupNewCategoryName");

  const idInput = document.getElementById("setupNewCategoryId");

  const sectionInput = document.getElementById("setupNewCategorySection");

  const pointsInput = document.getElementById("setupNewCategoryPoints");

  const lockDateTimeInput = document.getElementById(
    "setupNewCategoryLockDateTime"
  );

  const groupIdInput = document.getElementById("setupNewCategoryGroupId");

  const parentCategoryIdInput = document.getElementById(
    "setupNewCategoryParentCategoryId"
  );

  const followUpCategoryIdInput = document.getElementById(
    "setupNewCategoryFollowUpCategoryId"
  );

  const followUpMapJSONInput = document.getElementById(
    "setupNewCategoryFollowUpMapJSON"
  );

  const displayOrderInput = document.getElementById(
    "setupNewCategoryDisplayOrder"
  );

  const layoutTypeInput = document.getElementById("setupNewCategoryLayoutType");

  const countsAsStatueInput = document.getElementById(
    "setupNewCategoryCountsAsStatue"
  );

  const lockedInput = document.getElementById("setupNewCategoryLocked");

  const categoryName = nameInput ? nameInput.value.trim() : "";

  const categoryId = adminSetupSlugify(
    idInput && idInput.value.trim() ? idInput.value.trim() : categoryName
  );

  if (!categoryName || !categoryId) {
    adminSetupSetMessage(
      "setupAddCategoryMessage",
      "Category name is required.",
      true
    );

    return;
  }

  const followUpMapJSON = followUpMapJSONInput
    ? followUpMapJSONInput.value.trim()
    : "";

  if (followUpMapJSON) {
    try {
      JSON.parse(followUpMapJSON);
    } catch (err) {
      adminSetupSetMessage(
        "setupAddCategoryMessage",
        "Follow-Up Map JSON is not valid JSON.",
        true
      );

      return;
    }
  }

  adminSetupSetMessage("setupAddCategoryMessage", "Adding category...", false);

  const res = await apiAdminCreateCategory({
    gameId: gameId,

    category: categoryName,

    categoryId: categoryId,

    section: sectionInput ? sectionInput.value.trim() : "Main",

    points: pointsInput ? pointsInput.value : 1,

    lockDateTime: lockDateTimeInput ? lockDateTimeInput.value : "",

    groupId:
      groupIdInput && groupIdInput.value.trim()
        ? groupIdInput.value.trim()
        : "default",

    parentCategoryId: parentCategoryIdInput
      ? adminSetupSlugify(parentCategoryIdInput.value.trim())
      : "",

    followUpCategoryId: followUpCategoryIdInput
      ? adminSetupSlugify(followUpCategoryIdInput.value.trim())
      : "",

    followUpMapJSON: followUpMapJSON,

    displayOrder: displayOrderInput ? displayOrderInput.value : 999,

    layoutType: layoutTypeInput ? layoutTypeInput.value : "image",

    countsAsStatue: countsAsStatueInput ? countsAsStatueInput.checked : true,

    locked: lockedInput ? lockedInput.checked : false,
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "setupAddCategoryMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add category.",
      true
    );

    return;
  }

  adminSetupSetMessage("setupAddCategoryMessage", "Category added.", false);

  adminSetupCategoryIdTouched = false;

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   CREATE NOMINEE
====================== */

async function adminSetupCreateNominee(gameId) {
  const categoryInput = document.getElementById("setupNomineeCategoryId");

  const nomineeInput = document.getElementById("setupNewNomineeName");

  const nomineeIdInput = document.getElementById("setupNewNomineeId");

  const shortAnswerInput = document.getElementById(
    "setupNewNomineeShortAnswer"
  );

  const fileIdInput = document.getElementById("setupNewNomineeFileId");

  const sectionInput = document.getElementById("setupNewNomineeSection");

  const categoryId = categoryInput ? categoryInput.value.trim() : "";

  const categoryName = adminSetupGetCategoryNameById(categoryId);

  const nomineeName = nomineeInput ? nomineeInput.value.trim() : "";

  const nomineeId = adminSetupSlugify(
    nomineeIdInput && nomineeIdInput.value.trim()
      ? nomineeIdInput.value.trim()
      : nomineeName
  );

  if (!categoryId || !nomineeName || !nomineeId) {
    adminSetupSetMessage(
      "setupAddNomineeMessage",
      "Category and nominee name are required.",
      true
    );

    return;
  }

  adminSetupSetMessage("setupAddNomineeMessage", "Adding nominee...", false);

  const res = await apiAdminCreateNominee({
    gameId: gameId,
    categoryId: categoryId,
    category: categoryName,
    nominee: nomineeName,
    nomineeId: nomineeId,
    shortAnswer:
      shortAnswerInput && shortAnswerInput.value.trim()
        ? shortAnswerInput.value.trim()
        : nomineeName,
    fileId: fileIdInput ? fileIdInput.value.trim() : "",
    section: sectionInput ? sectionInput.value.trim() : "Main",
    active: true,
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "setupAddNomineeMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add nominee.",
      true
    );

    return;
  }

  adminSetupSetMessage("setupAddNomineeMessage", "Nominee added.", false);

  adminSetupNomineeIdTouched = false;
  adminSetupShortAnswerTouched = false;

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   UPDATE CATEGORY
====================== */

async function adminSetupUpdateCategory(gameId, categoryId) {
  const nameInput = document.getElementById("editCategoryName_" + categoryId);

  const sectionInput = document.getElementById(
    "editCategorySection_" + categoryId
  );

  const pointsInput = document.getElementById(
    "editCategoryPoints_" + categoryId
  );

  const orderInput = document.getElementById("editCategoryOrder_" + categoryId);

  const layoutInput = document.getElementById(
    "editCategoryLayout_" + categoryId
  );

  const lockDateTimeInput = document.getElementById(
    "editCategoryLockDateTime_" + categoryId
  );

  const groupIdInput = document.getElementById(
    "editCategoryGroupId_" + categoryId
  );

  const parentCategoryIdInput = document.getElementById(
    "editCategoryParentCategoryId_" + categoryId
  );

  const followUpCategoryIdInput = document.getElementById(
    "editCategoryFollowUpCategoryId_" + categoryId
  );

  const followUpMapJSONInput = document.getElementById(
    "editCategoryFollowUpMapJSON_" + categoryId
  );

  const lockedInput = document.getElementById(
    "editCategoryLocked_" + categoryId
  );

  const activeInput = document.getElementById(
    "editCategoryActive_" + categoryId
  );

  const predictionInput = document.getElementById(
    "editCategoryPrediction_" + categoryId
  );

  const statueInput = document.getElementById(
    "editCategoryStatue_" + categoryId
  );

  const categoryName = nameInput ? nameInput.value.trim() : "";

  if (!categoryName) {
    adminSetupSetMessage(
      "editCategoryMessage_" + categoryId,
      "Category name is required.",
      true
    );

    return;
  }

  const followUpMapJSON = followUpMapJSONInput
    ? followUpMapJSONInput.value.trim()
    : "";

  if (followUpMapJSON) {
    try {
      JSON.parse(followUpMapJSON);
    } catch (err) {
      adminSetupSetMessage(
        "editCategoryMessage_" + categoryId,
        "Follow-Up Map JSON is not valid JSON.",
        true
      );

      return;
    }
  }

  adminSetupSetMessage(
    "editCategoryMessage_" + categoryId,
    "Saving category...",
    false
  );

  const res = await apiAdminUpdateCategory({
    gameId: gameId,

    categoryId: categoryId,

    category: categoryName,

    section: sectionInput ? sectionInput.value.trim() : "",

    points: pointsInput ? pointsInput.value : 0,

    displayOrder: orderInput ? orderInput.value : 999,

    layoutType: layoutInput ? layoutInput.value : "image",

    lockDateTime: lockDateTimeInput ? lockDateTimeInput.value : "",

    groupId:
      groupIdInput && groupIdInput.value.trim()
        ? groupIdInput.value.trim()
        : "default",

    parentCategoryId: parentCategoryIdInput
      ? adminSetupSlugify(parentCategoryIdInput.value.trim())
      : "",

    followUpCategoryId: followUpCategoryIdInput
      ? adminSetupSlugify(followUpCategoryIdInput.value.trim())
      : "",

    followUpMapJSON: followUpMapJSON,

    locked: lockedInput ? lockedInput.checked : false,

    active: activeInput ? activeInput.checked : true,

    predictionGame: predictionInput ? predictionInput.checked : true,

    countsAsStatue: statueInput ? statueInput.checked : false,
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editCategoryMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save category.",
      true
    );

    return;
  }

  adminSetupSetMessage(
    "editCategoryMessage_" + categoryId,
    "Category saved.",
    false
  );

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   ARCHIVE CATEGORY
====================== */

async function adminSetupArchiveCategory(gameId, categoryId) {
  const ok = confirm(
    "Archive this category? It will be marked inactive and locked."
  );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "editCategoryMessage_" + categoryId,
    "Archiving category...",
    false
  );

  const res = await apiAdminArchiveCategory(gameId, categoryId);

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editCategoryMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not archive category.",
      true
    );

    return;
  }

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   UPDATE NOMINEE
====================== */

async function adminSetupUpdateNominee(gameId, categoryId, nomineeId) {
  const nameInput = document.getElementById(
    "editNomineeName_" + categoryId + "_" + nomineeId
  );

  const shortInput = document.getElementById(
    "editNomineeShort_" + categoryId + "_" + nomineeId
  );

  const fileIdInput = document.getElementById(
    "editNomineeFileId_" + categoryId + "_" + nomineeId
  );

  const activeInput = document.getElementById(
    "editNomineeActive_" + categoryId + "_" + nomineeId
  );

  const nomineeName = nameInput ? nameInput.value.trim() : "";

  if (!nomineeName) {
    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      "Nominee name is required.",
      true
    );

    return;
  }

  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Saving nominee...",
    false
  );

  const res = await apiAdminUpdateNominee({
    gameId: gameId,
    categoryId: categoryId,
    nomineeId: nomineeId,
    nominee: nomineeName,
    shortAnswer:
      shortInput && shortInput.value.trim()
        ? shortInput.value.trim()
        : nomineeName,
    fileId: fileIdInput ? fileIdInput.value.trim() : "",
    active: activeInput ? activeInput.checked : true,
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save nominee.",
      true
    );

    return;
  }

  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Nominee saved.",
    false
  );

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   ARCHIVE NOMINEE
====================== */

async function adminSetupArchiveNominee(gameId, categoryId, nomineeId) {
  const ok = confirm("Archive this nominee? It will be marked inactive.");

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Archiving nominee...",
    false
  );

  const res = await apiAdminArchiveNominee(gameId, categoryId, nomineeId);

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not archive nominee.",
      true
    );

    return;
  }

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   SAVE RESULTS / WINNERS
====================== */

async function adminSetupSaveResults(gameId, categoryId) {
  const winnerInput = document.getElementById("resultWinner_" + categoryId);

  const favoriteInput = document.getElementById("resultFavorite_" + categoryId);

  const winnerNomineeId = winnerInput ? winnerInput.value.trim() : "";

  const favoriteNomineeId = favoriteInput ? favoriteInput.value.trim() : "";

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Saving results...",
    false
  );

  const res = await apiAdminUpdateCategory({
    gameId: gameId,
    categoryId: categoryId,
    winnerNomineeId: winnerNomineeId,
    favoriteNomineeId: favoriteNomineeId,
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save results.",
      true
    );

    return;
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results saved. Refreshing scoring...",
    false
  );

  await apiAdminRefreshResultsCaches(gameId);

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   CLEAR RESULTS / WINNERS
====================== */

async function adminSetupClearResults(gameId, categoryId) {
  const ok = confirm("Clear winner and favorite for this category?");

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Clearing results...",
    false
  );

  const res = await apiAdminUpdateCategory({
    gameId: gameId,
    categoryId: categoryId,
    winnerNomineeId: "",
    favoriteNomineeId: "",
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not clear results.",
      true
    );

    return;
  }

  await apiAdminRefreshResultsCaches(gameId);

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   FINALIZE / REOPEN RESULTS
====================== */

async function adminSetupFinalizeResults(gameId, finalized) {
  const ok = confirm(
    finalized
      ? "Mark results finalized for this game?"
      : "Reopen results for this game?"
  );

  if (!ok) {
    return;
  }

  const res = await apiAdminSetResultsFinalized(gameId, finalized);

  if (!res || res.success === false) {
    alert(
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not update results finalized state."
    );

    return;
  }

  await apiAdminRefreshResultsCaches(gameId);

  navigate("admin-game-setup:" + gameId);
}
