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
  const safeGameId =
    String(gameId || "").trim();

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

  const res =
    await apiAdminGetGameSetup(
      safeGameId
    );

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

  const categories =
    Array.isArray(res.categories)
      ? res.categories
      : [];

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
          onclick="adminSetupScoringAutomationSetup('${adminSetupEscapeHtml(
            safeGameId
          )}')"
        >
          Setup Scoring
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminSetupRunScoringAutomation('${adminSetupEscapeHtml(
            safeGameId
          )}')"
        >
          Run Scoring Now
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminSetupStartAutoScoring()"
        >
          Start Auto Scoring
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminSetupStopAutoScoring()"
        >
          Stop Auto Scoring
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

        <details
          class="card admin-card admin-collapsible-card admin-categories-main-card"
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

            <div class="admin-card-actions">

            <button
              class="admin-small-button secondary"
              onclick="adminSetupScoringAutomationSetup('${adminSetupEscapeHtml(
                safeGameId
              )}')"
            >
              Setup Scoring
            </button>

            <button
              class="admin-small-button secondary"
              onclick="adminSetupRunScoringAutomation('${adminSetupEscapeHtml(
                safeGameId
              )}')"
            >
              Run Scoring Now
            </button>

            <button
              class="admin-small-button secondary"
              onclick="adminSetupStartAutoScoring()"
            >
              Start Auto Scoring
            </button>

            <button
              class="admin-small-button secondary"
              onclick="adminSetupStopAutoScoring()"
            >
              Stop Auto Scoring
            </button>

          </div>

          <details class="admin-advanced-details" open>

          <summary>
            Internet Results Import
          </summary>

          <div class="admin-control-grid">

            <label class="admin-field">
              <span>Source ID</span>

              <input
                type="text"
                id="internetSourceId"
                value="manual-results"
                placeholder="espn-nfl-scoreboard"
              >
            </label>

            <label class="admin-field">
              <span>Source Name</span>

              <input
                type="text"
                id="internetSourceName"
                value="Manual Results"
                placeholder="ESPN NFL Scoreboard"
              >
            </label>

            <label class="admin-field">
              <span>Source Type</span>

              <select id="internetSourceType">

                <option value="manual">
                  Manual Text
                </option>

                <option value="webpage">
                  Webpage / HTML
                </option>

                <option value="json">
                  JSON / API
                </option>

                <option value="csv">
                  CSV / Text
                </option>

              </select>
            </label>

            <label class="admin-field">
              <span>Parser Type</span>

              <select id="internetParserType">

                <option value="manual-text">
                  Manual Text
                </option>

                <option value="webpage-text">
                  Webpage Text
                </option>

                <option value="json">
                  JSON
                </option>

                <option value="csv">
                  CSV / Text
                </option>

              </select>
            </label>

            <label class="admin-field">
              <span>Match Mode</span>

              <select id="internetMatchMode">

                <option value="nominee-name">
                  Nominee Name
                </option>

                <option value="category-name">
                  Category Name
                </option>

                <option value="team-name">
                  Team Name
                </option>

                <option value="market-title">
                  Market Title
                </option>

                <option value="raw">
                  Raw Only
                </option>

              </select>
            </label>

            <label class="admin-field">
              <span>Trust Level</span>

              <select id="internetTrustLevel">

                <option value="low">
                  Low
                </option>

                <option value="medium" selected>
                  Medium
                </option>

                <option value="high">
                  High
                </option>

                <option value="official">
                  Official
                </option>

              </select>
            </label>

          </div>

          <label class="admin-field">
            <span>URL</span>

            <input
              type="url"
              id="internetSourceUrl"
              placeholder="https://example.com/results"
            >
          </label>

          <label class="admin-field">
            <span>Manual Results Text</span>

            <textarea
              id="internetManualText"
              rows="6"
              placeholder="Paste results here. Example: Best Picture: Anora"
            ></textarea>
          </label>

          <div class="admin-card-actions">

          <button
            class="admin-small-button secondary"
            onclick="adminSetupLoadInternetSources('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Load Saved Sources
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupSaveInternetSource('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Save Source
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupInternetResultsSetup('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Setup Internet Imports
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupPullInternetResults('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Pull Internet Results
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupViewLastInternetImport('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            View Last Import
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupGenerateResultSuggestions('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Generate Suggestions
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupParseSportsScoreboard('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Parse Sports Scoreboard
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupViewResultSuggestions('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            View Suggestions
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupApplyHighConfidenceSuggestions('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Apply High Confidence
          </button>

        </div>

          <div class="admin-control-grid">

          <label class="admin-field">
            <span>Bulk Apply Min Confidence</span>

            <input
              type="number"
              id="internetSuggestionMinConfidence"
              value="90"
              min="0"
              max="100"
            >
          </label>

        </div>

          <div
            id="internetImportMessage"
            class="admin-message"
          ></div>

          <div
            id="internetSourcesPanel"
            class="admin-sources-panel"
          ></div>

          <pre
            id="internetImportPreview"
            class="admin-code-preview"
          ></pre>

          <div
            id="resultSuggestionsPanel"
            class="admin-suggestions-panel"
          ></div>

          <div
            id="sportsScoreboardPanel"
            class="admin-sources-panel"
          ></div>

        </details>

            ${
              categories.length
                ? `
                  <div class="admin-list admin-category-list">
                    ${categories
                      .map(category =>
                        renderAdminSetupCategoryCard(category)
                      )
                      .join("")}
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
  
    adminSetupRefreshImagePreview(
      categoryId,
      nomineeId
    );
  
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
  
    adminSetupRefreshImagePreview(
      categoryId,
      nomineeId
    );
  
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

function adminSetupRefreshImagePreview(
  categoryId,
  nomineeId
) {

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const previewEl =
    document.getElementById(
      "imagePreviewTools_" +
      categoryId +
      "_" +
      nomineeId
    );

  if (!fileIdInput || !previewEl) {
    return;
  }

  const fileId =
    adminSetupExtractDriveFileId(
      fileIdInput.value
    );

  fileIdInput.value =
    fileId;

  previewEl.innerHTML =
    renderAdminSetupFileTools(
      fileId,
      fileIdInput.id
    );

}

function adminSetupClearNomineeImage(
  categoryId,
  nomineeId
) {

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

  if (fileIdInput) {

    fileIdInput.value =
      "";
      adminSetupRefreshImagePreview(
        categoryId,
        nomineeId
      );

  }

  adminSetupSetMessage(
    messageId,
    "Image cleared. Click Save Nominee to keep this change.",
    false
  );

}

async function adminSetupDeleteNomineeImageFromDrive(
  categoryId,
  nomineeId
) {

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

  const fileId =
    fileIdInput
      ? fileIdInput.value.trim()
      : "";

  if (!fileId) {

    adminSetupSetMessage(
      messageId,
      "No File ID to delete.",
      true
    );

    return;

  }

  const ok =
    confirm(
      "Move this image to Google Drive trash and clear it from this nominee?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    messageId,
    "Deleting image from Drive...",
    false
  );

  const res =
    await apiAdminDeleteImageFromDrive({
      fileId:
        fileId
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not delete image from Drive.",
      true
    );

    return;

  }

  if (fileIdInput) {

    fileIdInput.value =
      "";

    adminSetupRefreshImagePreview(
      categoryId,
      nomineeId
    );

  }

  adminSetupSetMessage(
    messageId,
    "Image moved to Drive trash. Click Save Nominee to remove the File ID.",
    false
  );

}

/* ======================
   CATEGORY CARD
====================== */

function renderAdminSetupCategoryCard(category) {
  const settings =
    category.settings || {};

  const nominees =
    Array.isArray(category.nominees)
      ? category.nominees
      : [];

  const gameId =
    adminSetupEscapeHtml(category.gameId);

  const categoryId =
    adminSetupEscapeHtml(category.categoryId);

  const categoryTitle =
    adminSetupEscapeHtml(
      category.category || category.categoryId
    );

  const section =
    adminSetupEscapeHtml(
      category.section || "Other"
    );

  const groupId =
    adminSetupEscapeHtml(
      settings.groupId || "default"
    );

  return `
    <details class="admin-category-card admin-collapsible-category">

      <summary class="admin-category-summary">

        <div class="admin-category-header">

          <div>
            <strong>
              ${categoryTitle}
            </strong>

            <div class="admin-sub">
              ${categoryId}
              ·
              ${section}
              ·
              ${groupId}
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
                value="${section}"
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
                  value="${groupId}"
                  placeholder="default"
                >
              </label>

              <label class="admin-field">
                <span>Parent Category ID</span>

                <input
                  type="text"
                  id="editCategoryParentCategoryId_${categoryId}"
                  value="${adminSetupEscapeHtml(settings.parentCategoryId || "")}"
                  placeholder="Optional parent category"
                >
              </label>

              <label class="admin-field">
                <span>Follow-Up Category ID</span>

                <input
                  type="text"
                  id="editCategoryFollowUpCategoryId_${categoryId}"
                  value="${adminSetupEscapeHtml(settings.followUpCategoryId || "")}"
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
              >${adminSetupEscapeHtml(settings.followUpMapJSON || "")}</textarea>
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

            <h3>
              Nominees / Answers
            </h3>

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
                    .map(nominee =>
                      renderAdminSetupNomineeRow(category, nominee)
                    )
                    .join("")
                : `
                  <div class="admin-sub">
                    No nominees added yet.
                  </div>
                `
            }

            ${renderAdminSetupInlineAddNomineeCard(category)}

          </div>

        </details>

      </div>

    </details>
  `;
}

/* ======================
   RESULTS / WINNERS PANEL
====================== */

function renderAdminResultsPanel(category, nominees, settings) {
  const gameId =
    adminSetupEscapeHtml(category.gameId);

  const categoryId =
    adminSetupEscapeHtml(category.categoryId);

  const winnerNomineeId =
    String(settings.winnerNomineeId || "").trim();

  const favoriteNomineeId =
    String(settings.favoriteNomineeId || "").trim();

  const nomineeOptions =
    nominees
      .filter(nominee => nominee.active !== false)
      .map(nominee => {
        const nomineeId =
          String(nominee.nomineeId || "").trim();

        const nomineeName =
          nominee.nominee || nominee.nomineeId;

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

  const favoriteOptions =
    nominees
      .filter(nominee => nominee.active !== false)
      .map(nominee => {
        const nomineeId =
          String(nominee.nomineeId || "").trim();

        const nomineeName =
          nominee.nominee || nominee.nomineeId;

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
  const gameId =
    adminSetupEscapeHtml(category.gameId);

  const categoryId =
    adminSetupEscapeHtml(category.categoryId);

  const nomineeId =
    adminSetupEscapeHtml(nominee.nomineeId);

  const fileId =
    String(nominee.fileId || "").trim();

  const fileInputId =
    "editNomineeFileId_" +
    categoryId +
    "_" +
    nomineeId;

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

        <details class="admin-image-details">

          <summary class="admin-image-summary">

            <div>
              <strong>
                Image / File ID
              </strong>

              <div class="admin-sub">
                ${
                  fileId
                    ? "Current File ID: " + adminSetupEscapeHtml(fileId)
                    : "No image set"
                }
              </div>
            </div>

            <span class="admin-collapse-icon">
              ▾
            </span>

          </summary>

          <div class="admin-image-body">

            <label class="admin-field">
              <span>Current File ID</span>

              <input
                type="text"
                id="${fileInputId}"
                value="${adminSetupEscapeHtml(fileId)}"
                placeholder="Paste Drive File ID or Drive link"
                oninput="adminSetupRefreshImagePreview('${categoryId}', '${nomineeId}')"
                onchange="adminSetupRefreshImagePreview('${categoryId}', '${nomineeId}')"
              >
            </label>

            <div
                id="imagePreviewTools_${categoryId}_${nomineeId}"
                class="admin-live-image-preview"
            >
                ${renderAdminSetupFileTools(fileId, fileInputId)}
            </div>

            <div class="admin-card-actions">

              <button
                type="button"
                class="admin-small-button secondary"
                onclick="adminSetupClearNomineeImage('${categoryId}', '${nomineeId}')"
              >
                Clear Current Image
              </button>

              <button
                type="button"
                class="admin-danger-button"
                onclick="adminSetupDeleteNomineeImageFromDrive('${categoryId}', '${nomineeId}')"
              >
                Delete from Drive
              </button>

            </div>

            <details class="admin-image-source-details">

              <summary>
                Change / Upload Image
              </summary>

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

              <div class="admin-sub">
                This product uses the TMDb API but is not endorsed or certified by TMDb.
              </div>

              <div
                id="tmdbPosterResults_${categoryId}_${nomineeId}"
                class="admin-tmdb-results"
              ></div>

            </details>

          </div>

        </details>

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

function renderAdminSetupInlineAddNomineeCard(category) {

  const gameId =
    adminSetupEscapeHtml(
      category.gameId
    );

  const categoryId =
    adminSetupEscapeHtml(
      category.categoryId
    );

  const categoryName =
    adminSetupEscapeHtml(
      category.category || category.categoryId
    );

  return `
    <details class="admin-inline-add-answer">

      <summary class="admin-inline-add-summary">

        <strong>
          + Add Answer
        </strong>

        <span class="admin-sub">
          Add another nominee/answer to this question.
        </span>

      </summary>

      <div class="admin-inline-add-body">

        <div class="admin-control-grid nominee-grid">

          <label class="admin-field">
            <span>Nominee / Answer</span>

            <input
              type="text"
              id="inlineNewNomineeName_${categoryId}"
              placeholder="New answer"
              oninput="adminSetupAutoFillInlineNomineeFields('${categoryId}')"
            >
          </label>

          <label class="admin-field">
            <span>Short Answer</span>

            <input
              type="text"
              id="inlineNewNomineeShortAnswer_${categoryId}"
              placeholder="Auto-filled"
            >
          </label>

          <label class="admin-field">
            <span>Nominee ID</span>

            <input
              type="text"
              id="inlineNewNomineeId_${categoryId}"
              placeholder="auto-generated"
            >
          </label>

          <label class="admin-field">
            <span>File ID</span>

            <input
              type="text"
              id="inlineNewNomineeFileId_${categoryId}"
              placeholder="Optional Google Drive File ID"
            >
          </label>

          <label class="admin-field">
            <span>Section</span>

            <input
              type="text"
              id="inlineNewNomineeSection_${categoryId}"
              value="Main"
            >
          </label>

        </div>

        <div class="admin-card-actions">

          <button
            type="button"
            class="admin-small-button"
            onclick="adminSetupCreateInlineNominee('${gameId}', '${categoryId}', '${categoryName}')"
          >
            Add Answer
          </button>

        </div>

        <div
          id="inlineNewNomineeMessage_${categoryId}"
          class="admin-message"
        ></div>

      </div>

    </details>
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

function adminSetupAutoFillInlineNomineeFields(categoryId) {

  const nomineeInput =
    document.getElementById(
      "inlineNewNomineeName_" +
      categoryId
    );

  const nomineeIdInput =
    document.getElementById(
      "inlineNewNomineeId_" +
      categoryId
    );

  const shortAnswerInput =
    document.getElementById(
      "inlineNewNomineeShortAnswer_" +
      categoryId
    );

  if (!nomineeInput) {
    return;
  }

  const nomineeName =
    nomineeInput.value.trim();

  if (nomineeIdInput) {
    nomineeIdInput.value =
      adminSetupSlugify(
        nomineeName
      );
  }

  if (shortAnswerInput) {
    shortAnswerInput.value =
      nomineeName;
  }

}

async function adminSetupCreateInlineNominee(
  gameId,
  categoryId,
  categoryName
) {

  const nomineeInput =
    document.getElementById(
      "inlineNewNomineeName_" +
      categoryId
    );

  const nomineeIdInput =
    document.getElementById(
      "inlineNewNomineeId_" +
      categoryId
    );

  const shortAnswerInput =
    document.getElementById(
      "inlineNewNomineeShortAnswer_" +
      categoryId
    );

  const fileIdInput =
    document.getElementById(
      "inlineNewNomineeFileId_" +
      categoryId
    );

  const sectionInput =
    document.getElementById(
      "inlineNewNomineeSection_" +
      categoryId
    );

  const messageId =
    "inlineNewNomineeMessage_" +
    categoryId;

  const nomineeName =
    nomineeInput
      ? nomineeInput.value.trim()
      : "";

  const nomineeId =
    adminSetupSlugify(
      nomineeIdInput && nomineeIdInput.value.trim()
        ? nomineeIdInput.value.trim()
        : nomineeName
    );

  if (
    !nomineeName ||
    !nomineeId
  ) {

    adminSetupSetMessage(
      messageId,
      "Answer name is required.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Adding answer...",
    false
  );

  const res =
    await apiAdminCreateNominee({
      gameId:
        gameId,

      categoryId:
        categoryId,

      category:
        categoryName,

      nominee:
        nomineeName,

      nomineeId:
        nomineeId,

      shortAnswer:
        shortAnswerInput && shortAnswerInput.value.trim()
          ? shortAnswerInput.value.trim()
          : nomineeName,

      fileId:
        fileIdInput
          ? fileIdInput.value.trim()
          : "",

      section:
        sectionInput && sectionInput.value.trim()
          ? sectionInput.value.trim()
          : "Main",

      active:
        true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add answer.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Answer added.",
    false
  );

  navigate(
    "admin-game-setup:" +
    gameId
  );

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

  const winnerInput =
    document.getElementById(
      "resultWinner_" + categoryId
    );

  const favoriteInput =
    document.getElementById(
      "resultFavorite_" + categoryId
    );

  const winnerNomineeId =
    winnerInput
      ? winnerInput.value.trim()
      : "";

  const favoriteNomineeId =
    favoriteInput
      ? favoriteInput.value.trim()
      : "";

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Saving results...",
    false
  );

  const res =
    await apiAdminUpdateCategory({
      gameId:
        gameId,
      categoryId:
        categoryId,
      winnerNomineeId:
        winnerNomineeId,
      favoriteNomineeId:
        favoriteNomineeId,
      notes:
        "Winner selected from Manage Games panel"
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
    "Results saved. Running scoring automation...",
    false
  );

  const scoringRes =
    await apiAdminRunScoringAutomation(
      gameId
    );

  if (!scoringRes || scoringRes.success === false) {

    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      scoringRes && (scoringRes.message || scoringRes.error)
        ? scoringRes.message || scoringRes.error
        : "Results saved, but scoring automation failed.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results saved and scoring updated.",
    false
  );

}

/* ======================
   CLEAR RESULTS / WINNERS
====================== */

async function adminSetupClearResults(gameId, categoryId) {

  const ok =
    confirm(
      "Clear winner and favorite for this category?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Clearing results...",
    false
  );

  const res =
    await apiAdminUpdateCategory({
      gameId:
        gameId,
      categoryId:
        categoryId,
      winnerNomineeId:
        "",
      favoriteNomineeId:
        "",
      notes:
        "Winner and favorite cleared from Manage Games panel"
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

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results cleared. Running scoring automation...",
    false
  );

  const scoringRes =
    await apiAdminRunScoringAutomation(
      gameId
    );

  if (!scoringRes || scoringRes.success === false) {

    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      scoringRes && (scoringRes.message || scoringRes.error)
        ? scoringRes.message || scoringRes.error
        : "Results cleared, but scoring automation failed.",
      true
    );

    return;

  }

  if (document.getElementById("resultWinner_" + categoryId)) {
    document.getElementById("resultWinner_" + categoryId).value = "";
  }

  if (document.getElementById("resultFavorite_" + categoryId)) {
    document.getElementById("resultFavorite_" + categoryId).value = "";
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results cleared and scoring updated.",
    false
  );

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

  await apiAdminRunScoringAutomation(gameId);

  navigate("admin-game-setup:" + gameId);
}


/* ======================
   SCORING AUTOMATION
====================== */

async function adminSetupScoringAutomationSetup(gameId) {

  adminSetupSetMessage(
    "adminSetupMessage",
    "Setting up scoring automation...",
    false
  );

  const res =
    await apiAdminSetupScoringAutomationSystem(
      gameId
    );

  adminSetupSetMessage(
    "adminSetupMessage",
    res && res.success
      ? "Scoring automation ready. ScoringRuns and LiveLeaderboardSnapshot are ready."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not setup scoring automation.",
    !(res && res.success)
  );

}

async function adminSetupRunScoringAutomation(gameId) {

  adminSetupSetMessage(
    "adminSetupMessage",
    "Running scoring automation...",
    false
  );

  const res =
    await apiAdminRunScoringAutomation(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "adminSetupMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not run scoring automation.",
      true
    );

    return;

  }

  const run =
    res.runs && res.runs.length
      ? res.runs[0]
      : null;

  adminSetupSetMessage(
    "adminSetupMessage",
    run
      ? `Scoring updated. Leader: ${run.leaderDisplayName || run.leaderUser || "None"} with ${run.leaderScore || 0} points.`
      : "Scoring automation completed.",
    false
  );

}

async function adminSetupStartAutoScoring() {

  const ok =
    confirm(
      "Start automatic scoring every 1 minute for active games?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "adminSetupMessage",
    "Starting automatic scoring...",
    false
  );

  const res =
    await apiAdminInstallScoringAutomationTrigger();

  adminSetupSetMessage(
    "adminSetupMessage",
    res && res.success
      ? "Automatic scoring started. It will run every 1 minute."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not start automatic scoring.",
    !(res && res.success)
  );

}

async function adminSetupStopAutoScoring() {

  const ok =
    confirm(
      "Stop automatic scoring?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "adminSetupMessage",
    "Stopping automatic scoring...",
    false
  );

  const res =
    await apiAdminUninstallScoringAutomationTrigger();

  adminSetupSetMessage(
    "adminSetupMessage",
    res && res.success
      ? "Automatic scoring stopped."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not stop automatic scoring.",
    !(res && res.success)
  );

}

/* ======================
   INTERNET RESULTS IMPORT
====================== */

function adminSetupGetInternetImportPayload(gameId) {

  const sourceIdInput =
    document.getElementById(
      "internetSourceId"
    );

  const sourceNameInput =
    document.getElementById(
      "internetSourceName"
    );

  const sourceTypeInput =
    document.getElementById(
      "internetSourceType"
    );

  const parserTypeInput =
    document.getElementById(
      "internetParserType"
    );

  const matchModeInput =
    document.getElementById(
      "internetMatchMode"
    );

  const trustLevelInput =
    document.getElementById(
      "internetTrustLevel"
    );

  const urlInput =
    document.getElementById(
      "internetSourceUrl"
    );

  const manualTextInput =
    document.getElementById(
      "internetManualText"
    );

  return {
    gameId:
      gameId,

    sourceId:
      sourceIdInput
        ? sourceIdInput.value.trim()
        : "manual-results",

    name:
      sourceNameInput
        ? sourceNameInput.value.trim()
        : "Manual Results",

    sourceType:
      sourceTypeInput
        ? sourceTypeInput.value
        : "manual",

    parserType:
      parserTypeInput
        ? parserTypeInput.value
        : "manual-text",

    matchMode:
      matchModeInput
        ? matchModeInput.value
        : "nominee-name",

    trustLevel:
      trustLevelInput
        ? trustLevelInput.value
        : "medium",

    url:
      urlInput
        ? urlInput.value.trim()
        : "",

    manualText:
      manualTextInput
        ? manualTextInput.value.trim()
        : "",

    notes:
      "Pulled from Manage Games internet import panel"
  };

}

function adminSetupShowInternetPreview(res) {

  const preview =
    document.getElementById(
      "internetImportPreview"
    );

  if (!preview) {
    return;
  }

  if (!res) {

    preview.innerText =
      "";

    return;

  }

  const text =
    res.rawTextPreview ||
    res.rawJsonPreview ||
    (
      res.import &&
      (
        res.import.rawTextPreview ||
        res.import.rawJsonPreview
      )
    ) ||
    "";

  preview.innerText =
    text ||
    "No preview available.";

}

async function adminSetupInternetResultsSetup(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Setting up internet import sheets...",
    false
  );

  const res =
    await apiAdminSetupInternetResultsSystem(
      gameId
    );

  adminSetupSetMessage(
    "internetImportMessage",
    res && res.success
      ? "Internet import system ready. InternetSources and InternetImports are ready."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not setup internet imports.",
    !(res && res.success)
  );

}

async function adminSetupPullInternetResults(gameId) {

  const payload =
    adminSetupGetInternetImportPayload(
      gameId
    );

  if (
    payload.sourceType !== "manual" &&
    !payload.url
  ) {

    adminSetupSetMessage(
      "internetImportMessage",
      "URL is required unless Source Type is Manual Text.",
      true
    );

    return;

  }

  if (
    payload.sourceType === "manual" &&
    !payload.manualText
  ) {

    adminSetupSetMessage(
      "internetImportMessage",
      "Manual Results Text is required for manual imports.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Pulling internet results...",
    false
  );

  adminSetupShowInternetPreview(null);

  const res =
    await apiAdminPullInternetResults(
      payload
    );

  adminSetupSetMessage(
    "internetImportMessage",
    res && res.success
      ? "Import saved to InternetImports."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Internet import failed.",
    !(res && res.success)
  );

  adminSetupShowInternetPreview(
    res
  );

}

async function adminSetupViewLastInternetImport(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Loading last import...",
    false
  );

  const res =
    await apiAdminGetLastInternetImport(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not load last import.",
      true
    );

    return;

  }

  if (!res.import) {

    adminSetupSetMessage(
      "internetImportMessage",
      "No internet imports found for this game yet.",
      false
    );

    adminSetupShowInternetPreview(null);

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Last import loaded: " +
      (res.import.sourceName || res.import.sourceId || ""),
    false
  );

  adminSetupShowInternetPreview(
    res
  );

}

/* ======================
   RESULT SUGGESTIONS
====================== */

function adminSetupRenderResultSuggestions(
  gameId,
  suggestions
) {

  const panel =
    document.getElementById(
      "resultSuggestionsPanel"
    );

  if (!panel) {
    return;
  }

  suggestions =
    Array.isArray(suggestions)
      ? suggestions
      : [];

  if (!suggestions.length) {

    panel.innerHTML =
      `
        <div class="admin-sub">
          No result suggestions found.
        </div>
      `;

    return;

  }

  panel.innerHTML =
    `
      <div class="admin-suggestions-list">

        <h3>
          Result Suggestions
        </h3>

        ${suggestions
          .map(item => {

            const status =
              String(item.status || "pending");

            const canAct =
              status.toLowerCase() === "pending";

            return `
              <div class="admin-suggestion-card">

                <div>
                  <strong>
                    ${adminSetupEscapeHtml(item.categoryName || item.categoryId)}
                  </strong>

                  <div class="admin-sub">
                    Suggested Winner:
                    ${adminSetupEscapeHtml(item.suggestedNomineeName || item.suggestedNomineeId)}
                  </div>

                  <div class="admin-sub">
                    Confidence:
                    ${Number(item.confidence) || 0}%
                    · Status:
                    ${adminSetupEscapeHtml(status)}
                  </div>

                  <div class="admin-sub">
                    Matched:
                    ${adminSetupEscapeHtml(item.matchedText || "")}
                  </div>
                </div>

                ${
                  canAct
                    ? `
                      <div class="admin-card-actions">

                        <button
                          class="admin-small-button"
                          onclick="adminSetupApplyResultSuggestion('${adminSetupEscapeHtml(
                            gameId
                          )}', '${adminSetupEscapeHtml(
                            item.suggestionId
                          )}')"
                        >
                          Apply
                        </button>

                        <button
                          class="admin-danger-button"
                          onclick="adminSetupRejectResultSuggestion('${adminSetupEscapeHtml(
                            gameId
                          )}', '${adminSetupEscapeHtml(
                            item.suggestionId
                          )}')"
                        >
                          Reject
                        </button>

                      </div>
                    `
                    : ""
                }

              </div>
            `;

          })
          .join("")}

      </div>
    `;

}

async function adminSetupGenerateResultSuggestions(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Generating result suggestions...",
    false
  );

  const res =
    await apiAdminGenerateResultSuggestions(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not generate suggestions.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Generated " +
      (res.count || 0) +
      " suggestion(s).",
    false
  );

  adminSetupRenderResultSuggestions(
    gameId,
    res.suggestions || []
  );

}

async function adminSetupViewResultSuggestions(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Loading result suggestions...",
    false
  );

  const res =
    await apiAdminGetResultSuggestions(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not load suggestions.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Suggestions loaded.",
    false
  );

  adminSetupRenderResultSuggestions(
    gameId,
    res.suggestions || []
  );

}

async function adminSetupApplyResultSuggestion(
  gameId,
  suggestionId
) {

  const ok =
    confirm(
      "Apply this suggestion as the official winner?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Applying suggestion...",
    false
  );

  const res =
    await apiAdminApplyResultSuggestion(
      gameId,
      suggestionId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not apply suggestion.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Suggestion applied and scoring updated.",
    false
  );

  await adminSetupViewResultSuggestions(
    gameId
  );

}

async function adminSetupRejectResultSuggestion(
  gameId,
  suggestionId
) {

  const ok =
    confirm(
      "Reject this suggestion?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Rejecting suggestion...",
    false
  );

  const res =
    await apiAdminRejectResultSuggestion(
      gameId,
      suggestionId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not reject suggestion.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Suggestion rejected.",
    false
  );

  await adminSetupViewResultSuggestions(
    gameId
  );

}

async function adminSetupApplyHighConfidenceSuggestions(gameId) {

  const input =
    document.getElementById(
      "internetSuggestionMinConfidence"
    );

  const minConfidence =
    input
      ? Number(input.value || 90)
      : 90;

  const ok =
    confirm(
      "Apply all pending suggestions from the latest import with confidence " +
      minConfidence +
      "% or higher?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Applying high-confidence suggestions...",
    false
  );

  const res =
    await apiAdminApplyHighConfidenceSuggestions(
      gameId,
      minConfidence
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not apply high-confidence suggestions.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Applied " +
      (res.appliedCount || 0) +
      " suggestion(s). Failed: " +
      (res.failedCount || 0) +
      ". Scoring updated.",
    false
  );

  await adminSetupViewResultSuggestions(
    gameId
  );

}

/* ======================
   SAVED INTERNET SOURCES
====================== */

function adminSetupFillInternetSourceForm(source) {

  source =
    source || {};

  const sourceIdInput =
    document.getElementById(
      "internetSourceId"
    );

  const sourceNameInput =
    document.getElementById(
      "internetSourceName"
    );

  const sourceTypeInput =
    document.getElementById(
      "internetSourceType"
    );

  const parserTypeInput =
    document.getElementById(
      "internetParserType"
    );

  const matchModeInput =
    document.getElementById(
      "internetMatchMode"
    );

  const trustLevelInput =
    document.getElementById(
      "internetTrustLevel"
    );

  const urlInput =
    document.getElementById(
      "internetSourceUrl"
    );

  if (sourceIdInput) {
    sourceIdInput.value =
      source.sourceId || "";
  }

  if (sourceNameInput) {
    sourceNameInput.value =
      source.name || "";
  }

  if (sourceTypeInput) {
    sourceTypeInput.value =
      source.sourceType || "webpage";
  }

  if (parserTypeInput) {
    parserTypeInput.value =
      source.parserType || "webpage-text";
  }

  if (matchModeInput) {
    matchModeInput.value =
      source.matchMode || "nominee-name";
  }

  if (trustLevelInput) {
    trustLevelInput.value =
      source.trustLevel || "medium";
  }

  if (urlInput) {
    urlInput.value =
      source.url || "";
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Loaded source: " +
      (source.name || source.sourceId || ""),
    false
  );

}

function adminSetupRenderInternetSources(
  gameId,
  sources
) {

  const panel =
    document.getElementById(
      "internetSourcesPanel"
    );

  if (!panel) {
    return;
  }

  sources =
    Array.isArray(sources)
      ? sources
      : [];

  if (!sources.length) {

    panel.innerHTML =
      `
        <div class="admin-sub">
          No saved internet sources found for this game yet.
        </div>
      `;

    return;

  }

  panel.innerHTML =
    `
      <div class="admin-sources-list">

        <h3>
          Saved Internet Sources
        </h3>

        ${sources
          .map(source => `
            <div class="admin-source-card">

              <div>
                <strong>
                  ${adminSetupEscapeHtml(source.name || source.sourceId)}
                </strong>

                <div class="admin-sub">
                  ${adminSetupEscapeHtml(source.sourceType || "")}
                  ·
                  ${adminSetupEscapeHtml(source.parserType || "")}
                  ·
                  ${adminSetupEscapeHtml(source.trustLevel || "")}
                </div>

                <div class="admin-sub">
                  ${adminSetupEscapeHtml(source.url || "Manual source")}
                </div>

                <div class="admin-sub">
                  Last Status:
                  ${adminSetupEscapeHtml(source.lastStatus || "Never pulled")}
                </div>
              </div>

              <div class="admin-card-actions">

                <button
                  class="admin-small-button secondary"
                  onclick='adminSetupFillInternetSourceForm(${JSON.stringify(source)})'
                >
                  Load
                </button>

                <button
                  class="admin-small-button"
                  onclick='adminSetupFillInternetSourceForm(${JSON.stringify(source)}); adminSetupPullInternetResults("${adminSetupEscapeHtml(gameId)}");'
                >
                  Pull
                </button>

              </div>

            </div>
          `)
          .join("")}

      </div>
    `;

}

async function adminSetupLoadInternetSources(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Loading saved internet sources...",
    false
  );

  const res =
    await apiAdminGetInternetSources(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not load saved sources.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Loaded " +
      (res.sources ? res.sources.length : 0) +
      " saved source(s).",
    false
  );

  adminSetupRenderInternetSources(
    gameId,
    res.sources || []
  );

}

async function adminSetupSaveInternetSource(gameId) {

  const payload =
    adminSetupGetInternetImportPayload(
      gameId
    );

  adminSetupSetMessage(
    "internetImportMessage",
    "Saving internet source...",
    false
  );

  const res =
    await apiAdminSaveInternetSource(
      payload
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save internet source.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Internet source saved.",
    false
  );

  await adminSetupLoadInternetSources(
    gameId
  );

}

/* ======================
   SPORTS SCOREBOARD PARSER
====================== */

function adminSetupRenderSportsScoreboard(res) {

  const panel =
    document.getElementById(
      "sportsScoreboardPanel"
    );

  if (!panel) {
    return;
  }

  if (!res) {

    panel.innerHTML =
      "";

    return;

  }

  const games =
    Array.isArray(res.games)
      ? res.games
      : [];

  const suggestions =
    Array.isArray(res.suggestions)
      ? res.suggestions
      : [];

  panel.innerHTML =
    `
      <div class="admin-sources-list">

        <h3>
          Sports Scoreboard Parse
        </h3>

        <div class="admin-sub">
          Parsed Games:
          ${Number(res.parsedGameCount) || 0}
          · Final Games:
          ${Number(res.finalGameCount) || 0}
          · Suggestions:
          ${Number(res.suggestionCount) || 0}
        </div>

        ${
          games.length
            ? games
                .map(game => `
                  <div class="admin-source-card">

                    <div>
                      <strong>
                        ${adminSetupEscapeHtml(game.awayName)}
                        ${adminSetupEscapeHtml(game.awayScore)}
                        @
                        ${adminSetupEscapeHtml(game.homeName)}
                        ${adminSetupEscapeHtml(game.homeScore)}
                      </strong>

                      <div class="admin-sub">
                        Winner:
                        ${adminSetupEscapeHtml(game.winnerName || "")}
                      </div>

                      <div class="admin-sub">
                        Status:
                        ${adminSetupEscapeHtml(game.status || "Final")}
                      </div>

                    </div>

                  </div>
                `)
                .join("")
            : `
              <div class="admin-sub">
                No final scoreboard games found.
              </div>
            `
        }

        ${
          suggestions.length
            ? `
              <div class="admin-sub">
                Sports suggestions were added to ResultSuggestions.
                Use View Suggestions or Apply High Confidence next.
              </div>
            `
            : ""
        }

      </div>
    `;

}

async function adminSetupParseSportsScoreboard(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Parsing sports scoreboard...",
    false
  );

  adminSetupRenderSportsScoreboard(null);

  const res =
    await apiAdminParseSportsScoreboard(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not parse sports scoreboard.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Sports scoreboard parsed. Final games: " +
      (res.finalGameCount || 0) +
      ". Suggestions: " +
      (res.suggestionCount || 0) +
      ".",
    false
  );

  adminSetupRenderSportsScoreboard(
    res
  );

  if (
    res.suggestions &&
    res.suggestions.length
  ) {

    adminSetupRenderResultSuggestions(
      gameId,
      res.suggestions
    );

  }

}