/* ======================
   ADMIN GAMES PAGE
====================== */

function adminGamesEscapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function adminGamesEscapeJs(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");

}

function adminGamesBoolBadge(value, trueText, falseText) {

  return `
    <span class="admin-badge ${value ? "is-on" : "is-off"}">
      ${value ? trueText : falseText}
    </span>
  `;

}

function adminGamesStatusBadge(game) {

  const status =
    game.status ||
    (
      game.archived
        ? "Archived"
        : game.active
          ? "Active"
          : "Draft"
    );

  return `
    <span class="admin-badge">
      ${adminGamesEscapeHtml(status)}
    </span>
  `;

}

async function renderAdminGamesPage() {

  setPageLoadStep(50, "Loading games and publishing controls…");

  const res =
    await apiAdminGetGames();

  if (
    !res ||
    res.success === false
  ) {

    return `
      <div class="page">

        <h1>Manage Games TEST</h1>

        <div class="card">
          Could not load games.
          ${adminGamesEscapeHtml(
            res && (res.message || res.error)
              ? res.message || res.error
              : "Please refresh and try again."
          )}
        </div>

      </div>
    `;

  }

  const games =
    Array.isArray(res.games)
      ? res.games
      : [];

  return `
    <div class="page admin-games-page admin-page">

      <div class="admin-page-header">

        <div>
          <h1>Manage Games</h1>

          <p class="admin-sub">
            Create, clone, archive, and open game setup.
          </p>
        </div>

        <button
          class="admin-small-button secondary"
          onclick="navigate('admin')"
        >
          Back to Admin
        </button>

      </div>

      ${renderAdminNewGameCard()}

      ${renderAdminCloneGameCard(games)}

      <details
        class="card admin-card admin-collapsible-card admin-games-panel"
      >

        <summary class="admin-card-summary">

          <div>
            <h2>Existing Games</h2>

            <div class="admin-sub">
              ${games.length} games configured.
            </div>
          </div>

          <span class="admin-collapse-icon">
            ▾
          </span>

        </summary>

        <div class="admin-collapsible-body">

          ${
            games.length
              ? `
                <div class="admin-games-list">
                  ${games
                    .map(renderAdminGameCard)
                    .join("")}
                </div>
              `
              : `
                <div class="admin-sub">
                  No games found.
                </div>
              `
          }

        </div>

      </details>

    </div>
  `;

}

/* ======================
   GAME CARD
====================== */

function renderAdminGameCard(game) {

  const gameId =
    adminGamesEscapeHtml(game.gameId);

  const name =
    adminGamesEscapeHtml(
      game.name || game.gameId
    );

  const openAttr =
    "";

  return `
    <details
      class="card admin-game-card admin-collapsible-card"
      ${openAttr}
    >

      <summary class="admin-card-summary admin-game-card-summary">

        <div class="admin-game-card-head">

          <div>
            <h2>${name}</h2>

            <div class="admin-game-id">
              ${gameId}
            </div>
          </div>

          <div class="admin-status-stack">
            ${adminGamesStatusBadge(game)}
            ${
              game.defaultGame
                ? adminGamesBoolBadge(true, "Default", "")
                : ""
            }
          </div>

        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <div class="admin-game-meta">

          <div>
            <strong>Year</strong>
            <span>${adminGamesEscapeHtml(game.year || "")}</span>
          </div>

          <div>
            <strong>Type</strong>
            <span>${adminGamesEscapeHtml(game.type || "")}</span>
          </div>

          <div>
            <strong>Predictions</strong>
            ${adminGamesBoolBadge(
              game.predictionEnabled,
              "On",
              "Off"
            )}
          </div>

          <div>
            <strong>Ranking</strong>
            ${adminGamesBoolBadge(
              game.rankingEnabled,
              "On",
              "Off"
            )}
          </div>

          <div>
            <strong>Active</strong>
            ${adminGamesBoolBadge(
              game.active,
              "Yes",
              "No"
            )}
          </div>

          <div>
            <strong>Archived</strong>
            ${adminGamesBoolBadge(
              game.archived,
              "Yes",
              "No"
            )}
          </div>

        </div>

        ${renderAdminGameDashboardSettings(game)}

        <div class="admin-card-actions">

          <button
            class="admin-secondary-button"
            onclick="navigate('admin-game-setup:${gameId}')"
          >
            Open Setup
          </button>

          <button
            class="admin-secondary-button"
            onclick="adminRunPreflightCheck('${gameId}')"
          >
            Run Check
          </button>

          <button
            class="admin-secondary-button"
            onclick="adminPrefillCloneGame('${adminGamesEscapeJs(
              game.gameId
            )}', '${adminGamesEscapeJs(game.name || game.gameId)}')"
          >
            Clone
          </button>

          <button
            class="admin-danger-button"
            onclick="adminArchiveGameConfirm('${gameId}')"
          >
            Archive
          </button>

        </div>

        <div
          id="adminPreflightResult_${gameId}"
          class="admin-preflight-result"
        ></div>

      </div>

    </details>
  `;

}

/* ======================
   NEW GAME CARD
====================== */

function renderAdminNewGameCard() {

  return `
    <details
      class="card admin-card admin-collapsible-card admin-games-create-card"
    >

      <summary class="admin-card-summary">

        <div>
          <h2>New Game</h2>

          <div class="admin-sub">
            Create a new draft/inactive game.
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <p class="admin-muted">
          New games are created as draft/inactive by default.
        </p>

        <div class="admin-form-grid">

          <label>
            Game Name

            <input
              id="adminNewGameName"
              class="input admin-input"
              placeholder="Oscars 2027"
            >
          </label>

          <label>
            Game ID

            <input
              id="adminNewGameId"
              class="input admin-input"
              placeholder="oscars-2027"
            >
          </label>

          <label>
            Year

            <input
              id="adminNewGameYear"
              class="input admin-input"
              placeholder="2027"
              inputmode="numeric"
            >
          </label>

          <label>
            Type

            <input
              id="adminNewGameType"
              class="input admin-input"
              placeholder="oscars"
            >
          </label>

          <label>
            Theme Color

            <input
              id="adminNewThemeColor"
              class="input admin-input"
              placeholder="#d4af37"
            >
          </label>

          <label>
            Lock Label

            <input
              id="adminNewLockLabel"
              class="input admin-input"
              placeholder="Locks before ceremony"
            >
          </label>

          <label>
            Available From

            <input
              id="adminNewAvailableFrom"
              class="input admin-input"
              type="datetime-local"
            >
          </label>

          <label>
            Available Until

            <input
              id="adminNewAvailableUntil"
              class="input admin-input"
              type="datetime-local"
            >
          </label>

          <label>
            Hero Image File ID

            <input
              id="adminNewHeroImageFileId"
              class="input admin-input"
              placeholder="Google Drive File ID"
            >
          </label>

          <label>
            Hero Image Position

            <input
              id="adminNewHeroImagePosition"
              class="input admin-input"
              placeholder="center center"
            >
          </label>

          <label class="admin-wide-field">
            Description

            <textarea
              id="adminNewGameDescription"
              class="input admin-input"
              rows="4"
              placeholder="Briefly explain how this game works."
            ></textarea>
          </label>

        </div>

        <button
          id="adminNewGameSaveButton"
          class="button admin-action-button admin-save-button"
          onclick="adminCreateGameFromForm()"
        >
          Create Draft Game
        </button>

        <div
          id="adminNewGameMessage"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;

}

/* ======================
   CLONE GAME CARD
====================== */

function renderAdminCloneGameCard(games) {

  const options =
    games
      .map(game => `
        <option value="${adminGamesEscapeHtml(game.gameId)}">
          ${adminGamesEscapeHtml(game.name || game.gameId)}
        </option>
      `)
      .join("");

  return `
    <details
      id="adminCloneGameCard"
      class="card admin-card admin-collapsible-card admin-games-clone-card"
    >

      <summary class="admin-card-summary">

        <div>
          <h2>Clone Game Setup</h2>

          <div class="admin-sub">
            Clone a previous game into a new draft game.
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <p class="admin-muted">
          Winners and favorites are cleared when cloning.
        </p>

        <div class="admin-form-grid">

          <label>
            Source Game

            <select
              id="adminCloneSourceGameId"
              class="input admin-input"
            >
              ${options}
            </select>
          </label>

          <label>
            New Game Name

            <input
              id="adminCloneNewName"
              class="input admin-input"
              placeholder="Oscars 2028"
            >
          </label>

          <label>
            New Game ID

            <input
              id="adminCloneNewGameId"
              class="input admin-input"
              placeholder="oscars-2028"
            >
          </label>

          <label>
            New Year

            <input
              id="adminCloneNewYear"
              class="input admin-input"
              placeholder="2028"
              inputmode="numeric"
            >
          </label>

        </div>

        <div class="admin-checkbox-row">

          <label>
            <input
              id="adminCloneSettings"
              type="checkbox"
              checked
            >
            Clone settings
          </label>

          <label>
            <input
              id="adminCloneNominees"
              type="checkbox"
              checked
            >
            Clone nominees
          </label>

          <label>
            <input
              id="adminCloneLocked"
              type="checkbox"
              checked
            >
            Lock cloned categories
          </label>

        </div>

        <button
          id="adminCloneGameSaveButton"
          class="button admin-action-button admin-save-button"
          onclick="adminCloneGameFromForm()"
        >
          Clone Game
        </button>

        <div
          id="adminCloneGameMessage"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;

}

/* ======================
   DASHBOARD DISPLAY SETTINGS
====================== */

function adminGameDomId_(gameId) {

  return String(gameId || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_");

}

function adminGetInputValue_(id) {

  const el =
    document.getElementById(id);

  return el
    ? String(el.value || "").trim()
    : "";

}

function adminSetInputValue_(id, value) {

  const el =
    document.getElementById(id);

  if (el) {
    el.value = value || "";
  }

}

function adminGameHeroThumbnail_(fileId) {

  fileId =
    String(fileId || "").trim();

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(fileId) +
    "&sz=w800"
  );

}

function renderAdminGameDashboardSettings(game) {

  const rawGameId =
    game.gameId || "";

  const domId =
    adminGameDomId_(rawGameId);

  const title =
    game.name || rawGameId;

  const subtitle =
    game.typeLabel || game.type || "Game";

  const heroFileId =
    game.heroImageFileId || "";

  const heroUrl =
    game.heroImage || adminGameHeroThumbnail_(heroFileId);

  return `
    <details class="admin-card admin-collapsible-card admin-game-dashboard-settings">

      <summary class="admin-card-summary">
        <div>
          <h3>Dashboard Card Settings</h3>

          <div class="admin-sub">
            Controls the Home/Dashboard description, lock label, availability window, and card image.
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>
      </summary>

      <div class="admin-collapsible-body">

        <div
          id="adminGameHeroPreview_${domId}"
          class="admin-game-hero-preview ${heroUrl ? "has-image" : ""}"
          ${heroUrl ? platformBackgroundAttrs(heroUrl, { variant: "hero", cssVariable: "--admin-game-hero-image", eager: true }) : ""}
          style="--admin-game-theme-color: ${adminGamesEscapeHtml(game.themeColor || "#354785")}; --admin-game-hero-image: none;"
        >
          <div class="admin-game-hero-preview-inner">
            <div class="admin-game-hero-preview-kicker">
              ${adminGamesEscapeHtml(game.lockLabel || "Lock label preview")}
            </div>

            <div class="admin-game-hero-preview-title">
              ${adminGamesEscapeHtml(title)}
            </div>

            <div class="admin-game-hero-preview-subtitle">
              ${adminGamesEscapeHtml(subtitle)}
            </div>
          </div>
        </div>

        <div class="admin-form-grid">

          <label>
            Game Name / Title

            <input
              id="adminGameName_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(game.name || "")}"
            >
          </label>

          <label>
            Theme Color

            <input
              id="adminGameThemeColor_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(game.themeColor || "")}"
              placeholder="#d4af37"
            >
          </label>

          <label>
            Lock Label

            <input
              id="adminGameLockLabel_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(game.lockLabel || "")}"
              placeholder="Locks before ceremony"
            >
          </label>

          <label>
            Available From

            <input
              id="adminGameAvailableFrom_${domId}"
              class="input admin-input"
              type="datetime-local"
              value="${adminGamesEscapeHtml(game.availableFrom || "")}"
            >
          </label>

          <label>
            Available Until

            <input
              id="adminGameAvailableUntil_${domId}"
              class="input admin-input"
              type="datetime-local"
              value="${adminGamesEscapeHtml(game.availableUntil || "")}"
            >
          </label>

          <label>
            Hero Image File ID

            <input
              id="adminGameHeroImageFileId_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(heroFileId)}"
              placeholder="Google Drive File ID"
              oninput="adminPreviewGameHeroImage('${adminGamesEscapeJs(rawGameId)}')"
            >
          </label>

          <label>
            Hero Image Position

            <input
              id="adminGameHeroImagePosition_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(game.heroImagePosition || "center center")}"
              placeholder="center center"
            >
          </label>

          <label class="admin-wide-field">
            Description

            <textarea
              id="adminGameDescription_${domId}"
              class="input admin-input"
              rows="4"
              placeholder="Briefly explain how this game works."
            >${adminGamesEscapeHtml(game.description || "")}</textarea>
          </label>

        </div>

        <div class="admin-game-dashboard-tools">

          <div class="admin-game-image-actions">
            <input
              id="adminGameHeroFile_${domId}"
              type="file"
              accept="image/*"
            >

            <button
              class="admin-secondary-button"
              onclick="adminUploadGameHeroImage('${adminGamesEscapeJs(rawGameId)}')"
            >
              Upload Image
            </button>

            <button
              class="admin-secondary-button"
              onclick="adminClearGameHeroImage('${adminGamesEscapeJs(rawGameId)}')"
            >
              Clear Image
            </button>
          </div>

          <div class="admin-game-image-actions">
            <input
              id="adminGameHeroUrl_${domId}"
              class="input admin-input"
              placeholder="Paste image URL to import"
            >

            <button
              class="admin-secondary-button"
              onclick="adminImportGameHeroImageFromUrl('${adminGamesEscapeJs(rawGameId)}')"
            >
              Import URL
            </button>
          </div>

          <button
            id="adminGameDashboardSaveButton_${domId}"
            class="button admin-action-button admin-save-button"
            onclick="adminSaveGameDashboardSettings('${adminGamesEscapeJs(rawGameId)}')"
          >
            Save Dashboard Settings
          </button>

          <div
            id="adminGameDashboardMessage_${domId}"
            class="admin-message"
          ></div>

        </div>

      </div>

    </details>
  `;

}

function adminReadFileAsBase64_(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = () => {

      const result =
        String(reader.result || "");

      const base64 =
        result.indexOf(",") === -1
          ? result
          : result.split(",").pop();

      resolve(base64);

    };

    reader.onerror = () => {
      reject(new Error("Could not read image file."));
    };

    reader.readAsDataURL(file);

  });

}

function adminPreviewGameHeroImage(gameId) {

  const domId =
    adminGameDomId_(gameId);

  const fileId =
    adminGetInputValue_(
      "adminGameHeroImageFileId_" + domId
    );

  const preview =
    document.getElementById(
      "adminGameHeroPreview_" + domId
    );

  if (!preview) {
    return;
  }

  const url =
    adminGameHeroThumbnail_(fileId);

  preview.classList.toggle(
    "has-image",
    Boolean(url)
  );

  preview.style.setProperty(
    "--admin-game-hero-image",
    url
      ? "url('" + platformImageUrl(url, "hero") + "')"
      : "none"
  );

}

async function adminSaveGameDashboardSettings(gameId) {

  const domId =
    adminGameDomId_(gameId);

  const messageId =
    "adminGameDashboardMessage_" + domId;

  const actionKey =
    "dashboard:" + gameId;

  if (!adminBeginGamePageAction_(
    actionKey,
    messageId,
    "adminGameDashboardSaveButton_" + domId,
    "Saving dashboard settings..."
  )) {
    return false;
  }

  try {

  const payload = {
    gameId:
      gameId,

    name:
      adminGetInputValue_(
        "adminGameName_" + domId
      ),

    description:
      adminGetInputValue_(
        "adminGameDescription_" + domId
      ),

    lockLabel:
      adminGetInputValue_(
        "adminGameLockLabel_" + domId
      ),

    availableFrom:
      adminGetInputValue_(
        "adminGameAvailableFrom_" + domId
      ),

    availableUntil:
      adminGetInputValue_(
        "adminGameAvailableUntil_" + domId
      ),

    themeColor:
      adminGetInputValue_(
        "adminGameThemeColor_" + domId
      ),

    heroImageFileId:
      adminGetInputValue_(
        "adminGameHeroImageFileId_" + domId
      ),

    heroImagePosition:
      adminGetInputValue_(
        "adminGameHeroImagePosition_" + domId
      ) || "center center"
  };

  const res =
    await apiAdminUpdateGame(
      payload
    );

  if (
    !res ||
    res.success === false
  ) {

    adminSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save dashboard settings.",
      true
    );

    return false;

  }

  adminSetMessage(
    messageId,
    "Dashboard settings saved.",
    false
  );

  return true;

  } finally {

    adminEndGamePageAction_(actionKey);

  }

}

async function adminUploadGameHeroImage(gameId) {

  const domId =
    adminGameDomId_(gameId);

  const messageId =
    "adminGameDashboardMessage_" + domId;

  const input =
    document.getElementById(
      "adminGameHeroFile_" + domId
    );

  if (
    !input ||
    !input.files ||
    !input.files.length
  ) {

    adminSetMessage(
      messageId,
      "Choose an image first.",
      true
    );

    return;

  }

  const file =
    input.files[0];

  adminSetMessage(
    messageId,
    "Uploading hero image...",
    false
  );

  try {

    const base64 =
      await adminReadFileAsBase64_(
        file
      );

    const res =
      await apiAdminUploadImage({
        gameId:
          gameId,

        categoryId:
          "game-hero",

        nomineeId:
          gameId + "-hero",

        fileName:
          file.name,

        mimeType:
          file.type,

        base64:
          base64
      });

    if (
      !res ||
      res.success === false
    ) {
      throw new Error(
        res && (res.message || res.error)
          ? res.message || res.error
          : "Image upload failed."
      );
    }

    adminSetInputValue_(
      "adminGameHeroImageFileId_" + domId,
      res.fileId || ""
    );

    adminPreviewGameHeroImage(
      gameId
    );

    await adminSaveGameDashboardSettings(
      gameId
    );

  } catch (err) {

    adminSetMessage(
      messageId,
      err.message || "Could not upload image.",
      true
    );

  }

}

async function adminImportGameHeroImageFromUrl(gameId) {

  const domId =
    adminGameDomId_(gameId);

  const messageId =
    "adminGameDashboardMessage_" + domId;

  const imageUrl =
    adminGetInputValue_(
      "adminGameHeroUrl_" + domId
    );

  if (!imageUrl) {

    adminSetMessage(
      messageId,
      "Paste an image URL first.",
      true
    );

    return;

  }

  adminSetMessage(
    messageId,
    "Importing image...",
    false
  );

  const res =
    await apiAdminImportImageFromUrl({
      gameId:
        gameId,

      categoryId:
        "game-hero",

      nomineeId:
        gameId + "-hero",

      imageUrl:
        imageUrl
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not import image.",
      true
    );

    return;

  }

  adminSetInputValue_(
    "adminGameHeroImageFileId_" + domId,
    res.fileId || ""
  );

  adminPreviewGameHeroImage(
    gameId
  );

  await adminSaveGameDashboardSettings(
    gameId
  );

}

async function adminClearGameHeroImage(gameId) {

  const domId =
    adminGameDomId_(gameId);

  adminSetInputValue_(
    "adminGameHeroImageFileId_" + domId,
    ""
  );

  adminPreviewGameHeroImage(
    gameId
  );

  await adminSaveGameDashboardSettings(
    gameId
  );

}


/* ======================
   PUBLISH CONTROLS
====================== */

function renderAdminPublishControls(game) {

  const gameId =
    adminGamesEscapeHtml(
      game.gameId
    );

  const status =
    game.status ||
    (
      game.archived
        ? "Archived"
        : game.active
          ? "Active"
          : "Draft"
    );

  return `
    <div class="admin-publish-panel">

      <div class="admin-publish-head">

        <div>
          <strong>Publish Controls</strong>

          <div class="admin-muted small">
            Move this game through setup, preview, active, and default states.
          </div>
        </div>

        <span class="admin-badge">
          ${adminGamesEscapeHtml(status)}
        </span>

      </div>

      <div class="admin-publish-grid">

        <button
          type="button"
          class="admin-publish-button"
          onclick="adminSetGameDraft('${gameId}')"
        >
          Draft
        </button>

        <button
          type="button"
          class="admin-publish-button"
          onclick="adminSetGameSetup('${gameId}')"
        >
          Setup
        </button>

        <button
          type="button"
          class="admin-publish-button"
          onclick="adminSetGamePreview('${gameId}')"
        >
          Preview
        </button>

        <button
          type="button"
          class="admin-publish-button active"
          onclick="adminSetGameActive('${gameId}')"
        >
          Activate
        </button>

        <button
          type="button"
          class="admin-publish-button default"
          onclick="adminSetGameDefault('${gameId}')"
        >
          Make Default
        </button>

      </div>

      <div
        id="adminPublishMessage_${gameId}"
        class="admin-message"
      ></div>

    </div>
  `;

}

/* ======================
   ACTIONS
====================== */

function adminSetMessage(id, message, isError) {

  const el =
    document.getElementById(id);

  if (!el) {
    return;
  }

  el.classList.toggle(
    "is-error",
    Boolean(isError)
  );

  el.classList.remove(
    "is-saving"
  );

  el.innerText =
    message || "";

}

function adminSetSavingMessage_(id, message) {

  const el =
    document.getElementById(id);

  if (!el) {
    return;
  }

  el.classList.remove(
    "is-error"
  );

  el.classList.add(
    "is-saving"
  );

  el.innerHTML =
    `<div class="admin-save-status">
      <span class="admin-save-spinner" aria-hidden="true"></span>
      <span>${adminGamesEscapeHtml(message || "Saving...")}</span>
    </div>
    <div class="admin-save-progress" role="progressbar" aria-label="Saving">
      <span></span>
    </div>`;

}

function adminSetSavingButton_(buttonId, isSaving, label) {

  const button =
    document.getElementById(buttonId);

  if (!button) {
    return;
  }

  if (isSaving) {

    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel =
        button.textContent.trim();
    }

    button.disabled =
      true;

    button.classList.add(
      "is-saving"
    );

    button.textContent =
      label || "Saving...";

    return;

  }

  button.disabled =
    false;

  button.classList.remove(
    "is-saving"
  );

  if (button.dataset.originalLabel) {
    button.textContent =
      button.dataset.originalLabel;
  }

}

const ADMIN_GAME_PAGE_ACTIONS = {};

function adminBeginGamePageAction_(key, messageId, buttonId, savingMessage) {

  if (ADMIN_GAME_PAGE_ACTIONS[key]) {
    adminSetMessage(
      messageId,
      "Save already running. Please wait for it to finish.",
      true
    );
    return false;
  }

  ADMIN_GAME_PAGE_ACTIONS[key] = {
    buttonId: buttonId || "",
    messageId: messageId || ""
  };

  adminSetSavingButton_(
    buttonId,
    true,
    "Saving..."
  );

  adminSetSavingMessage_(
    messageId,
    savingMessage || "Saving..."
  );

  return true;

}

function adminEndGamePageAction_(key) {

  const action =
    ADMIN_GAME_PAGE_ACTIONS[key];

  if (action && action.buttonId) {
    adminSetSavingButton_(
      action.buttonId,
      false
    );
  }

  delete ADMIN_GAME_PAGE_ACTIONS[key];

}

function adminSlugify(value) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

async function adminCreateGameFromForm() {

  const name =
    document
      .getElementById("adminNewGameName")
      .value
      .trim();

  const typedGameId =
    document
      .getElementById("adminNewGameId")
      .value
      .trim();

  const gameId =
    adminSlugify(
      typedGameId || name
    );

  const year =
    document
      .getElementById("adminNewGameYear")
      .value
      .trim();

  const type =
    document
      .getElementById("adminNewGameType")
      .value
      .trim();

  const themeColor =
    document
      .getElementById("adminNewThemeColor")
      .value
      .trim();

  const description =
    document
      .getElementById("adminNewGameDescription")
      .value
      .trim();

  const lockLabel =
    document
      .getElementById("adminNewLockLabel")
      .value
      .trim();

  const availableFrom =
    document
      .getElementById("adminNewAvailableFrom")
      .value
      .trim();

  const availableUntil =
    document
      .getElementById("adminNewAvailableUntil")
      .value
      .trim();

  const heroImageFileId =
    document
      .getElementById("adminNewHeroImageFileId")
      .value
      .trim();

  const heroImagePosition =
    document
      .getElementById("adminNewHeroImagePosition")
      .value
      .trim();

  if (!name || !gameId) {

    adminSetMessage(
      "adminNewGameMessage",
      "Game name and Game ID are required.",
      true
    );

    return;

  }

  const actionKey =
    "create:" + gameId;

  if (!adminBeginGamePageAction_(
    actionKey,
    "adminNewGameMessage",
    "adminNewGameSaveButton",
    "Creating draft game..."
  )) {
    return;
  }

  try {

  const res =
    await apiAdminCreateGame({
      name: name,
      gameId: gameId,
      year: year,
      type: type,
      themeColor: themeColor,
      description: description,
      lockLabel: lockLabel,
      availableFrom: availableFrom,
      availableUntil: availableUntil,
      heroImageFileId: heroImageFileId,
      heroImagePosition: heroImagePosition || "center center",
      active: false,
      archived: false,
      defaultGame: false,
      status: "Draft",
      lockAllPicks: true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetMessage(
      "adminNewGameMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not create game.",
      true
    );

    return;

  }

  adminSetMessage(
    "adminNewGameMessage",
    "Game created.",
    false
  );

  navigate("admin-games");

  } finally {

    adminEndGamePageAction_(actionKey);

  }

}

function adminPrefillCloneGame(gameId, name) {

  const cloneCard =
    document.getElementById(
      "adminCloneGameCard"
    );

  const source =
    document.getElementById(
      "adminCloneSourceGameId"
    );

  const newName =
    document.getElementById(
      "adminCloneNewName"
    );

  const newGameId =
    document.getElementById(
      "adminCloneNewGameId"
    );

  if (cloneCard) {
    cloneCard.open =
      true;
  }

  if (source) {
    source.value =
      gameId;
  }

  if (newName) {
    newName.value =
      String(name || "") + " Copy";
  }

  if (newGameId) {
    newGameId.value =
      adminSlugify(
        String(gameId || "") + "-copy"
      );
  }

  if (cloneCard) {

    cloneCard.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start"
    });

  } else {

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });

  }

}

async function adminCloneGameFromForm() {

  const sourceGameId =
    document
      .getElementById("adminCloneSourceGameId")
      .value
      .trim();

  const newName =
    document
      .getElementById("adminCloneNewName")
      .value
      .trim();

  const newGameId =
    adminSlugify(
      document
        .getElementById("adminCloneNewGameId")
        .value
        .trim()
    );

  const newYear =
    document
      .getElementById("adminCloneNewYear")
      .value
      .trim();

  const cloneSettings =
    document
      .getElementById("adminCloneSettings")
      .checked;

  const cloneNominees =
    document
      .getElementById("adminCloneNominees")
      .checked;

  const lockClonedCategories =
    document
      .getElementById("adminCloneLocked")
      .checked;

  if (
    !sourceGameId ||
    !newName ||
    !newGameId
  ) {

    adminSetMessage(
      "adminCloneGameMessage",
      "Source game, new name, and new Game ID are required.",
      true
    );

    return;

  }

  const actionKey =
    "clone:" + sourceGameId + ":" + newGameId;

  if (!adminBeginGamePageAction_(
    actionKey,
    "adminCloneGameMessage",
    "adminCloneGameSaveButton",
    "Cloning game..."
  )) {
    return;
  }

  try {

    const res =
      await apiAdminCloneGame({
        sourceGameId: sourceGameId,
        newGameId: newGameId,
        newName: newName,
        newYear: newYear,
        cloneSetup: true,
        cloneSettings: cloneSettings,
        cloneNominees: cloneNominees,
        clearWinners: true,
        lockClonedCategories: lockClonedCategories,
        keepActiveState: true
      });

    if (
      !res ||
      res.success === false
    ) {

      adminSetMessage(
        "adminCloneGameMessage",
        res && (res.message || res.error)
          ? res.message || res.error
          : "Could not clone game.",
        true
      );

      return;

    }

    adminSetMessage(
      "adminCloneGameMessage",
      "Game cloned.",
      false
    );

    navigate("admin-games");

  } finally {

    adminEndGamePageAction_(actionKey);

  }

}

async function adminArchiveGameConfirm(gameId) {

  const ok =
    confirm(
      "Archive this game? It will be inactive, removed as default, and hidden from live play."
    );

  if (!ok) {
    return;
  }

  const res =
    await apiAdminArchiveGame(
      gameId
    );

  if (
    !res ||
    res.success === false
  ) {

    alert(
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not archive game."
    );

    return;

  }

  navigate("admin-games");

}

/* ======================
   PUBLISH ACTIONS
====================== */

async function adminRequirePreflightBeforePublish(
  gameId,
  actionLabel
) {

  const target =
    document.getElementById(
      "adminPreflightResult_" + gameId
    );

  if (target) {

    target.innerHTML = `
      <div class="admin-preflight-card">
        Running preflight before ${adminGamesEscapeHtml(actionLabel)}...
      </div>
    `;

  }

  const res =
    await apiAdminRunGamePreflight(
      gameId
    );

  if (target) {

    target.innerHTML =
      adminRenderPreflightResult(
        res
      );

  }

  if (
    !res ||
    res.success === false
  ) {

    alert(
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not run preflight check."
    );

    return false;

  }

  if (
    Number(res.errorCount) > 0
  ) {

    alert(
      "This game has preflight errors. Fix them before publishing."
    );

    return false;

  }

  if (
    Number(res.warningCount) > 0
  ) {

    return confirm(
      "This game has " +
      res.warningCount +
      " preflight warning(s). Continue anyway?"
    );

  }

  return true;

}

function adminPublishMessage(
  gameId,
  message,
  isError
) {

  adminSetMessage(
    "adminPublishMessage_" + gameId,
    message,
    isError
  );

}

async function adminSetGameDraft(gameId) {

  const ok =
    confirm(
      "Move this game back to Draft? It will be inactive and hidden from live play."
    );

  if (!ok) {
    return;
  }

  const saved = await adminSavePendingGameChangesBeforeAction_(gameId);

  if (!saved) {
    return;
  }

  adminPublishMessage(
    gameId,
    "Moving to Draft...",
    false
  );

  const res =
    await apiAdminUpdateGame({
      gameId: gameId,
      status: "Draft",
      active: false,
      archived: false,
      defaultGame: false,
      lockAllPicks: true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminPublishMessage(
      gameId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not update game.",
      true
    );

    return;

  }

  navigate("admin-games");

}

async function adminSetGameSetup(gameId) {

  const saved = await adminSavePendingGameChangesBeforeAction_(gameId);

  if (!saved) {
    return;
  }

  adminPublishMessage(
    gameId,
    "Moving to Setup...",
    false
  );

  const res =
    await apiAdminUpdateGame({
      gameId: gameId,
      status: "Setup",
      active: false,
      archived: false,
      defaultGame: false,
      lockAllPicks: true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminPublishMessage(
      gameId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not update game.",
      true
    );

    return;

  }

  navigate("admin-games");

}

async function adminSetGamePreview(gameId) {

  const ok =
    confirm(
      "Move this game to Preview? It will be visible for testing, but all entries stay locked. The configured game type and scoring features will be preserved."
    );

  if (!ok) {
    return;
  }

  const saved = await adminSavePendingGameChangesBeforeAction_(gameId);

  if (!saved) {
    return;
  }

  adminPublishMessage(
    gameId,
    "Moving to Preview...",
    false
  );

  const res =
    await apiAdminUpdateGame({
      gameId: gameId,
      status: "Preview",
      active: true,
      archived: false,
      defaultGame: false,
      lockAllPicks: true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminPublishMessage(
      gameId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not update game.",
      true
    );

    return;

  }

  navigate("admin-games");

}

async function adminSetGameActive(gameId) {

  const saved = await adminSavePendingGameChangesBeforeAction_(gameId);

  if (!saved) {
    return;
  }

  const preflightOk =
    await adminRequirePreflightBeforePublish(
      gameId,
      "activation"
    );

  if (!preflightOk) {
    return;
  }

  const ok =
    confirm(
      "Activate this game? It will use the game type and scoring features already configured in Setup, but it will not become the default game yet."
    );

  if (!ok) {
    return;
  }

  adminPublishMessage(
    gameId,
    "Activating game...",
    false
  );

  const res =
    await apiAdminUpdateGame({
      gameId: gameId,
      status: "Active",
      active: true,
      archived: false,
      defaultGame: false,
      lockAllPicks: false
    });

  if (
    !res ||
    res.success === false
  ) {

    adminPublishMessage(
      gameId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not activate game.",
      true
    );

    return;

  }

  navigate("admin-games");

}

async function adminSetGameDefault(gameId) {

  const saved = await adminSavePendingGameChangesBeforeAction_(gameId);

  if (!saved) {
    return;
  }

  const preflightOk =
    await adminRequirePreflightBeforePublish(
      gameId,
      "making default"
    );

  if (!preflightOk) {
    return;
  }

  const ok =
    confirm(
      "Make this the default game? This changes what users see by default."
    );

  if (!ok) {
    return;
  }

  adminPublishMessage(
    gameId,
    "Making default game...",
    false
  );

  const res =
    await apiAdminUpdateGame({
      gameId: gameId,
      status: "Active",
      active: true,
      archived: false,
      defaultGame: true,
      lockAllPicks: false
    });

  if (
    !res ||
    res.success === false
  ) {

    adminPublishMessage(
      gameId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not make default game.",
      true
    );

    return;

  }

  navigate("admin-games");

}

/* ======================
   PREFLIGHT CHECKS
====================== */

function adminRenderPreflightResult(res) {

  if (
    !res ||
    res.success === false
  ) {

    return `
      <div class="admin-preflight-card is-error">
        Could not run check.
        ${
          res && (res.message || res.error)
            ? adminGamesEscapeHtml(res.message || res.error)
            : ""
        }
      </div>
    `;

  }

  const issues =
    Array.isArray(res.issues)
      ? res.issues
      : [];

  if (!issues.length) {

    return `
      <div class="admin-preflight-card is-ready">
        ✅ Ready to publish. No issues found.
      </div>
    `;

  }

  return `
    <div class="admin-preflight-card ${res.ready ? "is-warning" : "is-error"}">

      <div class="admin-preflight-summary">
        ${
          res.ready
            ? "⚠️ Ready with warnings"
            : "❌ Needs attention"
        }
        —
        ${Number(res.errorCount) || 0} errors,
        ${Number(res.warningCount) || 0} warnings
      </div>

      <ul class="admin-preflight-list">
        ${issues
          .map(issue => `
            <li class="${issue.severity === "error" ? "error" : "warning"}">
              <strong>
                ${issue.severity === "error" ? "Error" : "Warning"}:
              </strong>
              ${adminGamesEscapeHtml(issue.message)}
            </li>
          `)
          .join("")}
      </ul>

      ${res.canRepairRealityTv ? `<div class="admin-actions"><button class="admin-small-button" onclick="adminRepairRealityTvFromPreflight('${adminGamesEscapeHtml(res.gameId || "")}')">Repair Reality TV Setup</button><span class="admin-sub">Repairs missing episode questions and answers without duplicating existing rows.</span></div>` : ""}

    </div>
  `;

}

async function adminRepairRealityTvFromPreflight(gameId) {
  const target = document.getElementById("adminPreflightResult_" + gameId);
  if (target) target.innerHTML = `<div class="admin-preflight-card"><strong>Repairing Reality TV setup…</strong><div class="admin-sub">Checking the main exit question and answer roster.</div></div>`;
  try {
    let result = await apiAdminRepairRealityTvSetup({ gameId: gameId });
    if (!result || result.success === false) throw new Error((result && (result.error || result.message)) || "Could not repair the Reality TV setup.");
    let build = result.questionBuild || null;
    let steps = 0;
    const maxSteps = Math.max(30, Number(build && build.totalCount || 0) * 5 + 10);
    while (build && !build.complete && steps < maxSteps) {
      if (target) target.innerHTML = `<div class="admin-preflight-card"><strong>Repairing Reality TV setup…</strong><div class="admin-sub">${adminGamesEscapeHtml(build.lastMessage || build.progressLabel || "Building checked extra questions")}</div></div>`;
      await new Promise(function(resolve) { setTimeout(resolve, build.busy ? 1200 : 250); });
      build = await apiAdminContinueRealityTvQuestionPackBuild(build.buildId);
      if (!build || build.success === false) throw new Error((build && (build.error || build.message)) || "Could not continue the Reality TV repair.");
      if (!build.busy) steps += 1;
    }
    const check = await apiAdminRunGamePreflight(gameId);
    if (target) target.innerHTML = adminRenderPreflightResult(check);
    if (check && check.ready) alert("Reality TV setup repaired. The game now passes the activation check.");
    else alert("Repair finished, but the check still found items that need attention. Review the list shown under Run Check.");
  } catch (err) {
    if (target) target.innerHTML = `<div class="admin-preflight-card is-error"><strong>Repair failed.</strong><div>${adminGamesEscapeHtml(err.message || String(err))}</div><div class="admin-sub">The repair is retry-safe. Run Check and select Repair Reality TV Setup again.</div></div>`;
  }
}

async function adminRunPreflightCheck(gameId) {

  const target =
    document.getElementById(
      "adminPreflightResult_" + gameId
    );

  if (target) {

    target.innerHTML = `
      <div class="admin-preflight-card">
        Running check...
      </div>
    `;

  }

  const res =
    await apiAdminRunGamePreflight(
      gameId
    );

  if (target) {

    target.innerHTML =
      adminRenderPreflightResult(
        res
      );

  }

}
