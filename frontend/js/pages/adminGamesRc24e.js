window.PATTC_ADMIN_GAMES_VERSION = "rc24e-admin-games-live-r1";
window.PATTC_ADMIN_GAMES_RESTORE_VERSION = "rc24g-full-editor-plus-cleanup-r1";
window.PATTC_ADMIN_GAMES_RC24H_VERSION = "rc24h-lifecycle-filters-preview-r2";
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

function adminGamesStage_(game) {
  game = game || {};
  if (game.archived === true || String(game.status || "").toLowerCase() === "archived") return "Archived";
  const raw = String(game.status || "").trim().toLowerCase();
  if (raw === "active" || raw === "live") return "Live";
  if (raw === "preview") return "Preview";
  if (raw === "setup") return "Setup";
  return "Draft";
}

function adminGamesStatusBadge(game) {
  const stage = adminGamesStage_(game);
  return `
    <span class="admin-badge admin-game-stage-badge stage-${adminGamesEscapeHtml(stage.toLowerCase())}">
      STAGE · ${adminGamesEscapeHtml(stage.toUpperCase())}
    </span>
  `;
}

function adminGamesIsCleanupCandidate_(game) {

  game = game || {};

  const haystack = [
    game.gameId,
    game.name,
    game.status
  ].join(" ").toLowerCase();

  return /(^|[^a-z])(test|testing|dummy|cert|certification|production-test|rc\d{1,3})([^a-z]|$)/i.test(haystack) ||
    /(^|[-_])test([-_]|$)/i.test(String(game.gameId || ""));

}

function adminGamesFilterMarkup_(games) {
  games = Array.isArray(games) ? games : [];
  const counts = { Draft:0, Setup:0, Preview:0, Live:0, Archived:0 };
  games.forEach(function(game){ const stage=adminGamesStage_(game); if(counts.hasOwnProperty(stage)) counts[stage]+=1; });
  const cleanupCount = games.filter(adminGamesIsCleanupCandidate_).length;

  return `
    <div class="admin-games-cleanup-tools" style="display:grid;gap:8px;margin-bottom:12px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.035)">
      <div>
        <strong>Game List</strong>
        <div class="admin-sub">Filter by the actual game lifecycle stage. Archived remains separate and Cleanup Candidate never deletes anything.</div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button type="button" class="admin-small-button secondary" data-admin-game-filter="all" onclick="adminGamesApplyFilter_('all')">All · ${games.length}</button>
        <button type="button" class="admin-small-button secondary" data-admin-game-filter="draft" onclick="adminGamesApplyFilter_('draft')">Draft · ${counts.Draft}</button>
        <button type="button" class="admin-small-button secondary" data-admin-game-filter="setup" onclick="adminGamesApplyFilter_('setup')">Setup · ${counts.Setup}</button>
        <button type="button" class="admin-small-button secondary" data-admin-game-filter="preview" onclick="adminGamesApplyFilter_('preview')">Preview · ${counts.Preview}</button>
        <button type="button" class="admin-small-button secondary" data-admin-game-filter="live" onclick="adminGamesApplyFilter_('live')">Live · ${counts.Live}</button>
        <button type="button" class="admin-small-button secondary" data-admin-game-filter="archived" onclick="adminGamesApplyFilter_('archived')">Archived · ${counts.Archived}</button>
        <button type="button" class="admin-small-button danger" data-admin-game-filter="cleanup" onclick="adminGamesApplyFilter_('cleanup')">Cleanup Candidates · ${cleanupCount}</button>
      </div>
      <input id="adminGamesSearch" class="input admin-input" placeholder="Search name or GameId…" oninput="adminGamesApplyFilter_(window.__PATTC_ADMIN_GAMES_FILTER__ || 'all')">
      <div id="adminGamesFilterSummary" class="admin-sub">${games.length} games shown.</div>
    </div>
  `;
}

function adminGamesApplyFilter_(filter) {
  filter = String(filter || "all").toLowerCase();
  window.__PATTC_ADMIN_GAMES_FILTER__ = filter;

  const query = String((document.getElementById("adminGamesSearch") || {}).value || "").trim().toLowerCase();
  const cards = Array.from(document.querySelectorAll('.admin-games-list [data-admin-game-filterable="true"], .admin-games-list .admin-game-card[data-admin-game-id]'));
  let visible = 0;

  cards.forEach(function(card) {
    const name = String(card.getAttribute("data-admin-game-name") || "").toLowerCase();
    const id = String(card.getAttribute("data-admin-game-id") || "").toLowerCase();
    const status = String(card.getAttribute("data-admin-game-status") || "").toLowerCase();
    const archived = card.getAttribute("data-admin-game-archived") === "true";
    const cleanup = card.getAttribute("data-admin-game-cleanup") === "true";
    const stage = archived || status === "archived" ? "archived"
      : (status === "active" || status === "live") ? "live"
      : status === "preview" ? "preview"
      : status === "setup" ? "setup"
      : "draft";

    let match = filter === "all" || filter === stage;
    if (filter === "cleanup") match = cleanup;
    if (query && (name + " " + id).indexOf(query) === -1) match = false;

    card.hidden = !match;
    if (match) visible += 1;
  });

  document.querySelectorAll("[data-admin-game-filter]").forEach(function(button) {
    const selected = button.getAttribute("data-admin-game-filter") === filter;
    button.style.outline = selected ? "2px solid rgba(116,159,255,.95)" : "";
  });

  const summary = document.getElementById("adminGamesFilterSummary");
  if (summary) summary.textContent = visible + " game" + (visible === 1 ? "" : "s") + " shown.";
}

async function renderAdminGamesPage() {
  if (typeof renderAdminGamesPanel !== "function") {
    throw new Error("Manage Games full editor script is not loaded.");
  }
  return renderAdminGamesPanel();
}

async function renderAdminGamesCompactPage_() {

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

      ${renderAdminPermanentPurgeDangerZone(games)}

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

          ${adminGamesFilterMarkup_(games)}

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
      data-admin-game-id="${adminGamesEscapeHtml(game.gameId || "")}"
      data-admin-game-name="${adminGamesEscapeHtml(game.name || game.gameId || "")}"
      data-admin-game-status="${adminGamesEscapeHtml(game.status || "")}"
      data-admin-game-active="${game.active === true ? "true" : "false"}"
      data-admin-game-archived="${game.archived === true ? "true" : "false"}"
      data-admin-game-cleanup="${adminGamesIsCleanupCandidate_(game) ? "true" : "false"}"
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
            ${adminGamesIsCleanupCandidate_(game) ? '<span class="admin-badge" style="border-color:rgba(255,154,102,.7);color:#ffb184">Cleanup Candidate</span>' : ''}
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

          <label>
            Player Profile Scope

            <select
              id="adminGamePlayerProfileScope_${domId}"
              class="input admin-input"
              onchange="adminUpdatePlayerProfileScopeVisibility_('${adminGamesEscapeJs(rawGameId)}')"
            >
              <option value="general" ${(game.playerProfileScope || "game") === "general" ? "selected" : ""}>General profile only</option>
              <option value="season" ${(game.playerProfileScope || "game") === "season" ? "selected" : ""}>League / season shared profile</option>
              <option value="game" ${(game.playerProfileScope || "game") === "game" ? "selected" : ""}>Game-specific profile</option>
            </select>

            <span class="admin-help-text">
              Controls whether players keep their normal profile, share one profile across a league/season, or customize this game only.
            </span>
          </label>

          <label id="adminGamePlayerProfileGroupKeyWrap_${domId}" class="${(game.playerProfileScope || "game") === "season" ? "" : "hidden"}">
            League / Season Profile Key

            <input
              id="adminGamePlayerProfileGroupKey_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(game.playerProfileGroupKey || "")}"
              placeholder="nfl-2026"
            >

            <span class="admin-help-text">
              Use the exact same key on every game that should share one player profile.
            </span>
          </label>

          <label id="adminGamePlayerProfileGroupLabelWrap_${domId}" class="${(game.playerProfileScope || "game") === "season" ? "" : "hidden"}">
            League / Season Profile Name

            <input
              id="adminGamePlayerProfileGroupLabel_${domId}"
              class="input admin-input"
              value="${adminGamesEscapeHtml(game.playerProfileGroupLabel || "")}"
              placeholder="NFL 2026"
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

function adminUpdatePlayerProfileScopeVisibility_(gameId) {

  const domId = adminGameDomId_(gameId);
  const scope = adminGetInputValue_("adminGamePlayerProfileScope_" + domId) || "game";
  const showSeason = scope === "season";

  [
    "adminGamePlayerProfileGroupKeyWrap_" + domId,
    "adminGamePlayerProfileGroupLabelWrap_" + domId
  ].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !showSeason);
  });

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
      ) || "center center",

    playerProfileScope:
      adminGetInputValue_(
        "adminGamePlayerProfileScope_" + domId
      ) || "game",

    playerProfileGroupKey:
      adminGetInputValue_(
        "adminGamePlayerProfileGroupKey_" + domId
      ),

    playerProfileGroupLabel:
      adminGetInputValue_(
        "adminGamePlayerProfileGroupLabel_" + domId
      )
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

/* RC24B_MANAGE_GAMES_PURGE_DANGER_ZONE */
function renderAdminPermanentPurgeDangerZone(games) {
  games = Array.isArray(games) ? games : [];
  const options = games.map(function(game) {
    const id = adminGamesEscapeHtml(game.gameId || "");
    const name = adminGamesEscapeHtml(game.name || game.gameId || "");
    return `<option value="${id}">${name} · ${id}</option>`;
  }).join("");

  return `
    <details id="adminPermanentPurgeDangerZone" class="card admin-card admin-collapsible-card" style="border-color:rgba(226,76,76,.62)">
      <summary class="admin-card-summary">
        <div>
          <h2 style="color:#ff8a8a">Danger Zone · Permanent Game Purge</h2><div class="admin-sub"><strong>RC24E LIVE CLEANUP</strong> · This tool is intentionally placed above the long game list so it is always easy to find.</div>
          <div class="admin-sub">Production cleanup: always run the read-only preview first. Permanent deletion requires an exact GameId match, no dependency blockers, and the target game must be inactive or archived.</div>
        </div>
        <span class="admin-collapse-icon">▾</span>
      </summary>
      <div class="admin-collapsible-body">
        <div class="admin-form-grid">
          <label>Game to inspect
            <select id="adminPurgeGameSelect" class="input admin-input" onchange="adminPurgeSelectChanged_()">
              <option value="">Select a game…</option>${options}
            </select>
          </label>
          <label>Exact GameId
            <input id="adminPurgeGameId" class="input admin-input" autocomplete="off" spellcheck="false" placeholder="exact-game-id">
          </label>
        </div>
        <button id="adminPurgePreviewButton" class="admin-danger-button" onclick="adminPermanentPurgeRunPreview_()">Run Deletion Preview</button>
        <div id="adminPurgePreviewResult" class="admin-preflight-result" style="margin-top:10px"></div>
        <div id="adminPurgeConfirmWrap" hidden style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(226,76,76,.35)">
          <label>Type the exact GameId to confirm
            <input id="adminPurgeConfirmId" class="input admin-input" autocomplete="off" spellcheck="false" oninput="adminPermanentPurgeSyncDelete_()">
          </label>
          <button id="adminPurgeDeleteButton" class="admin-danger-button" disabled onclick="adminPermanentPurgeAttemptDelete_()">PERMANENT DELETE GAME</button>
          <div class="admin-sub" style="margin-top:6px">Permanent deletion removes PATTC-owned rows for this GameId from the app Sheets and External Results mappings, then verifies zero owned references remain. Shared/unproven Drive files are preserved.</div>
        </div>
      </div>
    </details>`;
}

function adminPurgeSelectChanged_() {
  const select = document.getElementById("adminPurgeGameSelect");
  const input = document.getElementById("adminPurgeGameId");
  if (select && input) input.value = String(select.value || "");
}

function adminPermanentPurgeSetBusy_(busy, text) {
  const button = document.getElementById("adminPurgePreviewButton");
  if (button) button.disabled = !!busy;
  const result = document.getElementById("adminPurgePreviewResult");
  if (result && text) result.innerHTML = `<div class="admin-sub">${adminGamesEscapeHtml(text)}</div>`;
}

async function adminPermanentPurgeRunPreview_() {
  const gameId = String((document.getElementById("adminPurgeGameId") || {}).value || "").trim();
  if (!gameId) {
    adminPermanentPurgeSetBusy_(false, "Enter the exact GameId first.");
    return;
  }
  adminPermanentPurgeSetBusy_(true, "Scanning PATTC data references…");
  let result = null;
  try {
    result = await apiPost("adminPermanentGamePurgeDryRun", { gameId: gameId });
  } catch (err) {
    result = { success:false, error: err && err.message ? err.message : String(err || "Unknown error") };
  }
  adminPermanentPurgeSetBusy_(false, "");
  adminPermanentPurgeRenderPreview_(result);
}

function adminPermanentPurgeRenderPreview_(result) {
  const el = document.getElementById("adminPurgePreviewResult");
  const wrap = document.getElementById("adminPurgeConfirmWrap");
  if (!el) return;
  if (!result || result.success === false) {
    el.innerHTML = `<div class="admin-message error">${adminGamesEscapeHtml((result && (result.error || result.message)) || "Dry Run failed.")}</div>`;
    if (wrap) wrap.hidden = true;
    return;
  }
  window.__PATTC_PURGE_PREVIEW__ = result;
  const game = result.game || {};
  const blockers = Array.isArray(result.blockers) ? result.blockers : [];
  const stores = Array.isArray(result.stores) ? result.stores : [];
  const matched = stores.filter(function(row){ return Number(row.matchingRows || 0) > 0; });
  const rows = matched.slice(0, 24).map(function(row) {
    return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)"><span>${adminGamesEscapeHtml((row.scope ? row.scope + ":" : "") + (row.sheet || row.area || "Store"))}</span><strong>${Number(row.matchingRows || 0)}</strong></div>`;
  }).join("");
  const blockerHtml = blockers.length
    ? `<div class="admin-message error"><strong>BLOCKED</strong><br>${blockers.map(function(b){return adminGamesEscapeHtml(b.message || b.code || "Dependency blocker");}).join("<br>")}</div>`
    : (game.active === true && game.archived !== true
        ? `<div class="admin-message error"><strong>READY AFTER ONE SAFETY STEP</strong><br>Deactivate or archive this game before permanent deletion.</div>`
        : `<div class="admin-message"><strong>No dependency blocker found by Dry Run.</strong><br>This inactive/archived game is eligible for exact-confirmation deletion.</div>`);
  el.innerHTML = `
    <div class="card" style="margin:0">
      <div><strong>${adminGamesEscapeHtml(game.name || result.gameId || "Game")}</strong></div>
      <div class="admin-sub">GameId: ${adminGamesEscapeHtml(result.gameId || "")} · ${adminGamesEscapeHtml(game.type || "")} ${adminGamesEscapeHtml(game.year || "")}</div>
      <div style="margin-top:8px"><strong>${Number(result.totalOwnedRows || 0)}</strong> owned rows found across ${matched.length} populated locations.</div>
      ${rows || '<div class="admin-sub" style="margin-top:8px">No owned rows found in populated stores.</div>'}
      ${matched.length > 24 ? `<div class="admin-sub">+ ${matched.length - 24} more populated locations in the full Dry Run report.</div>` : ''}
      <div style="margin-top:10px">${blockerHtml}</div>
      <div class="admin-sub" style="margin-top:8px">Shared/unproven assets retained: ${Array.isArray(result.sharedAssetsRetained) ? result.sharedAssetsRetained.length : 0}. Sports Engine v55 remains protected.</div>
    </div>`;
  if (wrap) wrap.hidden = false;
  const confirm = document.getElementById("adminPurgeConfirmId");
  if (confirm) confirm.value = "";
  adminPermanentPurgeSyncDelete_();
}

function adminPermanentPurgeSyncDelete_() {
  const preview = window.__PATTC_PURGE_PREVIEW__ || null;
  const typed = String((document.getElementById("adminPurgeConfirmId") || {}).value || "");
  const button = document.getElementById("adminPurgeDeleteButton");
  if (!button) return;
  const exact = !!(preview && typed === String(preview.gameId || ""));
  const blockers = preview && Array.isArray(preview.blockers) ? preview.blockers : [];
  const game = preview && preview.game ? preview.game : {};
  const inactive = game.active !== true || game.archived === true;
  const ready = exact && blockers.length === 0 && inactive && preview.productionPurgeEnabled === true;
  button.disabled = !ready;
  if (!exact) button.textContent = "PERMANENT DELETE · TYPE EXACT GAMEID";
  else if (blockers.length) button.textContent = "PERMANENT DELETE · DEPENDENCY BLOCKED";
  else if (!inactive) button.textContent = "PERMANENT DELETE · DEACTIVATE FIRST";
  else if (preview.productionPurgeEnabled !== true) button.textContent = "PERMANENT DELETE · SERVER DISABLED";
  else button.textContent = "PERMANENT DELETE GAME";
}

async function adminPermanentPurgeAttemptDelete_() {
  const preview = window.__PATTC_PURGE_PREVIEW__ || null;
  if (!preview) return;
  const typed = String((document.getElementById("adminPurgeConfirmId") || {}).value || "");
  const button = document.getElementById("adminPurgeDeleteButton");
  if (button) { button.disabled = true; button.textContent = "DELETING…"; }
  let result = null;
  try {
    result = await apiPost("adminPermanentGamePurge", { gameId: preview.gameId, confirmGameId: typed });
  } catch (err) {
    result = { success:false, error:err && err.message ? err.message : String(err || "Unknown error") };
  }
  const el = document.getElementById("adminPurgePreviewResult");
  if (el) el.insertAdjacentHTML("beforeend", `<div class="admin-message ${result && result.success ? '' : 'error'}" style="margin-top:8px">${adminGamesEscapeHtml((result && (result.message || result.error || result.code)) || "Delete request was blocked.")}</div>`);
  if (result && result.success) {
    window.__PATTC_PURGE_PREVIEW__ = null;
    const wrap = document.getElementById("adminPurgeConfirmWrap");
    if (wrap) wrap.hidden = true;
    setTimeout(function(){ if (typeof navigate === "function") navigate("admin-games"); }, 350);
  } else {
    adminPermanentPurgeSyncDelete_();
  }
}

/* PATTC NFL SPORTS PACK R1 — Manage Games builder */
(function(root){"use strict";function nflSeasonPackAdminCard_(){const year=new Date().getFullYear();return `<section class="card admin-card" style="margin-bottom:12px;border:1px solid rgba(68,223,105,.42);background:linear-gradient(180deg,rgba(5,36,58,.96),rgba(2,19,31,.96));"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><div style="font-size:11px;font-weight:950;color:#55eb76">NFL SPORTS PACK</div><div class="admin-sub">Build NFL Cup + Playoff Race + Full League Forecast + Bottom Dwellers as Draft games. Safe to run again.</div></div><div style="display:flex;gap:7px;align-items:center"><input id="nflSeasonPackYear" class="input admin-input" type="number" min="2020" max="2100" value="${year}" style="width:92px"><button id="nflSeasonPackBuildButton" class="admin-small-button" type="button" onclick="nflSeasonPackAdminBuild_()">Build / Repair NFL Pack</button></div></div><div style="height:7px;margin-top:9px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><div id="nflSeasonPackProgress" style="height:100%;width:0;background:#45e76b;transition:width .18s ease"></div></div><div id="nflSeasonPackStatus" class="admin-sub" style="margin-top:6px">Creates Draft setup only. Nothing is published Live automatically.</div></section>`;}function nflPlayoffRaceTimingAdminCard_(){
  return `<details class="card admin-card admin-collapsible-card" open style="margin-bottom:12px;border:1px solid rgba(68,202,255,.38)">
    <summary class="admin-card-summary"><div><h2 style="margin:0;color:#7ee7ff">NFL Playoff Race Timing</h2><div class="admin-sub">Season timing and forecast adjustment controls.</div></div><span class="admin-collapse-icon">▾</span></summary>
    <div class="admin-collapsible-body">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px">
        <label class="admin-sub">Season Start Date<input id="nflRaceStartDate" class="input admin-input" type="date"></label>
        <label class="admin-sub">Current Week Mode<select id="nflRaceWeekMode" class="input admin-input"><option value="auto">Auto</option><option value="override">Override</option></select></label>
        <label class="admin-sub">Week Override<input id="nflRaceWeekOverride" class="input admin-input" type="number" min="1" max="18" value="2"></label>
        <label class="admin-sub">Update Window<select id="nflRaceWindowMode" class="input admin-input"><option value="auto">Auto</option><option value="open">Open Now</option><option value="closed">Closed</option></select></label>
        <label class="admin-sub">Window Week<input id="nflRaceWindowWeek" class="input admin-input" type="number" min="1" max="18" value="2"></label>
        <label class="admin-sub">Multiplier Override<input id="nflRaceMultiplier" class="input admin-input" type="number" min=".4" max="1" step=".05" value="1.00"></label>
      </div>
      <div class="admin-sub" style="margin-top:8px">Normal production: Auto. For testing now, use Week Override 2 + Open Now. Multiplier applies to the whole saved forecast, including playoff bonuses.</div>
      <div class="admin-card-actions" style="margin-top:10px">
        <button class="admin-small-button secondary" type="button" onclick="nflPlayoffRaceAdminLoad_()">Load Timing</button>
        <button id="nflRaceSaveButton" class="admin-small-button" type="button" onclick="nflPlayoffRaceAdminSave_()">Save Timing</button>
      </div>
      <div style="height:6px;margin-top:9px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><div id="nflRaceTimingProgress" style="height:100%;width:0;background:#45e76b;transition:width .18s ease"></div></div>
      <div id="nflRaceTimingStatus" class="admin-sub" style="margin-top:6px">Auto mode uses NFL/Team Fantasy timing.</div>
    </div>
  </details>`;
}
function nflPlayoffRaceAdminGameId_(){
  const year=Math.max(2020,Math.min(2100,Number((document.getElementById("nflSeasonPackYear")||{}).value)||new Date().getFullYear()));
  return "nfl-playoff-race-"+year;
}
root.nflPlayoffRaceAdminLoad_=async function(){
  const status=document.getElementById("nflRaceTimingStatus"),bar=document.getElementById("nflRaceTimingProgress");
  if(status)status.textContent="Loading Playoff Race timing…";if(bar)bar.style.width="25%";
  try{
    const res=await api("adminGetNflPlayoffRaceSettings",{gameId:nflPlayoffRaceAdminGameId_()});
    if(!res||res.success===false)throw new Error(res&&(res.error||res.message)||"Could not load timing.");
    const s=res.settings||{},set=(id,value)=>{const node=document.getElementById(id);if(node)node.value=value===undefined||value===null?"":value;};
    set("nflRaceStartDate",s.seasonStartDate||"");set("nflRaceWeekMode",s.currentWeekMode||"auto");
    set("nflRaceWeekOverride",s.currentWeekOverride||2);set("nflRaceWindowMode",s.updateWindowMode||"auto");
    set("nflRaceWindowWeek",s.updateWindowWeek||2);set("nflRaceMultiplier",s.multiplierOverride||1);
    if(bar)bar.style.width="100%";if(status)status.textContent="Loaded "+nflPlayoffRaceAdminGameId_()+" timing.";
  }catch(err){if(bar)bar.style.width="0";if(status)status.textContent=err&&err.message?err.message:"Could not load timing.";}
};
root.nflPlayoffRaceAdminSave_=async function(){
  const status=document.getElementById("nflRaceTimingStatus"),bar=document.getElementById("nflRaceTimingProgress"),button=document.getElementById("nflRaceSaveButton");
  const val=id=>String((document.getElementById(id)||{}).value||"").trim();
  if(button)button.disabled=true;if(bar)bar.style.width="35%";if(status)status.textContent="Saving Playoff Race timing…";
  try{
    const res=await apiPost("adminSaveNflPlayoffRaceSettings",{
      gameId:nflPlayoffRaceAdminGameId_(),seasonStartDate:val("nflRaceStartDate"),
      currentWeekMode:val("nflRaceWeekMode")||"auto",currentWeekOverride:Number(val("nflRaceWeekOverride")||1),
      updateWindowMode:val("nflRaceWindowMode")||"auto",updateWindowWeek:Number(val("nflRaceWindowWeek")||0),
      multiplierOverride:Number(val("nflRaceMultiplier")||0)
    });
    if(!res||res.success===false)throw new Error(res&&(res.error||res.message)||"Could not save timing.");
    if(bar)bar.style.width="100%";if(status)status.textContent="Playoff Race timing saved ✓";
  }catch(err){if(bar)bar.style.width="0";if(status)status.textContent=err&&err.message?err.message:"Could not save timing.";}
  finally{if(button)button.disabled=false;}
};
root.nflSeasonPackAdminBuild_=async function(){const yearNode=document.getElementById("nflSeasonPackYear"),button=document.getElementById("nflSeasonPackBuildButton"),status=document.getElementById("nflSeasonPackStatus"),bar=document.getElementById("nflSeasonPackProgress"),year=Math.max(2020,Math.min(2100,Number(yearNode&&yearNode.value)||new Date().getFullYear()));let cursor=0,guard=0;if(button)button.disabled=true;try{while(guard++<30){if(status)status.textContent="Building NFL Sports Pack… "+cursor;const res=await api("adminBuildNflSeasonPack",{year:year,cursor:cursor,batchSize:10});if(!res||res.success===false)throw new Error(res&&(res.error||res.message)||"NFL Sports Pack setup failed.");cursor=Number(res.nextCursor)||0;if(bar)bar.style.width=Math.max(0,Math.min(100,Number(res.percent)||0))+"%";if(status)status.textContent=res.message||("NFL setup "+cursor+" / "+res.total);if(res.done){if(status)status.textContent="NFL Sports Pack ready in Draft · NFL Cup + 3 ranking mini-games.";if(button)button.textContent="NFL Pack Ready ✓";return;}}throw new Error("NFL Sports Pack setup did not finish within the safety loop.");}catch(err){if(status)status.textContent=err&&err.message?err.message:"NFL Sports Pack setup failed.";if(button)button.disabled=false;}};const base=root.renderAdminGamesPage;if(typeof base==="function"){root.renderAdminGamesPage=async function(){const html=String(await base()),card=nflSeasonPackAdminCard_(),timing=nflPlayoffRaceTimingAdminCard_(),match=html.match(/<div class="page[^>]*>/);setTimeout(function(){if(root.nflPlayoffRaceAdminLoad_)root.nflPlayoffRaceAdminLoad_();},300);return match?html.replace(match[0],match[0]+card+timing):card+timing+html;};}})(window);


/* PATTC NFL CUP + FUTURES R1 — progressive Draft-only admin builder */
(function(root){'use strict';
root.nflCupFuturesAdminBuild_=async function(){
  const button=document.getElementById('nflCupFuturesBuildButton');
  const status=document.getElementById('nflCupFuturesStatus');
  const bar=document.getElementById('nflCupFuturesProgress');
  const year=Number((document.getElementById('nflSeasonPackYear')||{}).value)||2026;
  let cursor=0; if(button)button.disabled=true;
  try {for(let guard=0;guard<22;guard++){
    const result=await apiPost('adminPrepareNflCupFuturesR1',{year:year,cursor:cursor});
    if(!result||result.success===false)throw Error(result&&(result.error||result.message)||'Cup / Futures setup failed');
    cursor=Number(result.nextCursor);
    if(bar)bar.style.width=String(Number(result.percent)||0)+'%';
    if(status)status.textContent=result.message||('Preparing '+cursor+'/'+result.total);
    if(result.done){if(button)button.textContent='Cup + Futures Draft Ready ✓';return;}
  }throw Error('Setup stopped before completion; retry is safe.');}
  catch(err){if(status)status.textContent=err&&err.message?err.message:'Build failed. Retry is safe.';}
  finally{if(button)button.disabled=false;}
};
const BASE=root.renderAdminGamesPage;
if(typeof BASE==='function'){root.renderAdminGamesPage=async function(){
  const html=String(await BASE());
  const card='<section class="card admin-card" style="padding:12px;border:1px solid #2a7da8;margin-bottom:12px;background:#05263c;color:#d8f1ff"><h2 style="margin:0;font-size:16px">🏆 NFL CUP + FUTURES 2026</h2><p class="admin-sub">Link existing Confidence / Survivor / Fantasy / Playoff Race. Create 13 team Futures markets as a locked Draft. Does not publish or unlock any game.</p><button type="button" id="nflCupFuturesBuildButton" class="admin-small-button" onclick="nflCupFuturesAdminBuild_()">Prepare Cup + Futures Draft</button><div style="height:6px;margin-top:8px;background:#13374f;border-radius:4px;overflow:hidden"><div id="nflCupFuturesProgress" style="width:0;height:100%;background:#5fe88b"></div></div><div id="nflCupFuturesStatus" class="admin-sub" style="margin-top:6px">Review multipliers and preflight before setting Live.</div></section>';
  const pos=html.indexOf('<div class="page');if(pos<0)return card+html;
  const end=html.indexOf('>',pos);return html.slice(0,end+1)+card+html.slice(end+1);
};}
})(window);


/* PATTC NFL Cup Admin Control Center R1; front-end only; no automatic publishing. */
(function (root) {
  'use strict';
  if (root.__PATTC_CUP_CONTROL_R1__) return;
  root.__PATTC_CUP_CONTROL_R1__ = true;
  const CUP_ID = 'nfl-cup-2026';
  const FALLBACK = {points:[25,20,16,13,11,9,7,6,5,4,3,2,1],minPlayers:4,fullFieldSize:8,minParticipationPct:50,fieldAdjustment:true};
  let busy = false;
  const escape = value => String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const bool = v => v === true || String(v).toLowerCase() === 'true';
  const status = g => String(g.status || '').trim().toLowerCase() === 'active' && bool(g.active) && !bool(g.lockAllPicks) ? 'LIVE' : String(g.status || 'DRAFT').toUpperCase();
  function rulesOf(game) {
    let p = {};
    try {p = JSON.parse(game.placementPointsJSON || '{}') || {};} catch (_) {}
    return Object.assign({}, FALLBACK, p, {points:Array.isArray(p.points) ? p.points : FALLBACK.points});
  }
  function note(message, error) {
    const el = byId('pattcCupCtrlMessage');
    if (el) {el.textContent = message;el.style.color = error ? '#ffb2b2' : '#a8efbc';}
  }
  function resultError(res) {
    if (!res || res.success === false || res.result && res.result.success === false) return res && (res.error || res.message || res.result && (res.result.error || res.result.message)) || 'Request failed';
    return '';
  }
  function refreshRow(g) {
    const el = byId('pattcCupRowStatus_' + g.gameId);
    if (el) el.textContent = status(g) + (g.includeInParent === false ? ' · OUT OF CUP' : ' · IN CUP');
  }
  function layout(games) {
    const parent = games.find(g => g.gameId === CUP_ID);
    if (!parent) return '';
    const rules = rulesOf(parent);
    const children = games.filter(g => g.parentGameId === CUP_ID && g.gameRole === 'mini');
    const extra = games.filter(g => /^nfl-king-of-the-hill-2026$/.test(String(g.gameId || '')) && g.parentGameId !== CUP_ID);
    return `<section id="pattcCupControlR1" class="card admin-card" style="padding:14px;margin:12px 0;border:1px solid #478aa6;background:#12283c;color:#edf6ff">
      <style>#pattcCupControlR1 .cup-ctrl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px}#pattcCupControlR1 input,#pattcCupControlR1 select{width:100%;min-width:0;box-sizing:border-box;background:#091c2f;color:#fff;border:1px solid #547189;border-radius:7px;padding:9px;font-size:14px}#pattcCupControlR1 .cup-ctrl-row{padding:10px 0;border-bottom:1px solid #365268}#pattcCupControlR1 button{cursor:pointer;min-height:36px;margin:3px;padding:7px 10px;border:1px solid #6084a5;border-radius:7px;background:#183d5b;color:#fff}#pattcCupControlR1 button:disabled{opacity:.5;cursor:not-allowed}#pattcCupControlR1 .cup-ctrl-primary{background:#e7b335;color:#071829;border-color:#e7b335;font-weight:bold}#pattcCupControlR1 label{display:block;margin:4px 0;color:#bcd9e9;font-size:12px}#pattcCupControlR1 summary{font-weight:750;cursor:pointer;padding:7px 0}#pattcCupControlR1 .cup-ctrl-muted{color:#b1c7d7;font-size:12px}</style>
      <h2 style="margin:0 0 5px">🏆 NFL Cup · Control Center</h2><p class="cup-ctrl-muted">Manage participation, weights, Cup scoring, and individual game release. Each save is independent; nothing goes Live automatically.</p>
      <p style="font-size:13px"><b>Cup:</b> ${escape(status(parent))} · <b>Connected mini-games:</b> ${children.length} · <b>Counted:</b> ${children.filter(g=>g.includeInParent!==false).length}</p>
      <details open><summary>1 · Mini-games, weights &amp; launch</summary>
      ${children.map(g => `<div class="cup-ctrl-row"><b>${escape(g.name || g.gameId)}</b><div class="cup-ctrl-muted" id="pattcCupRowStatus_${escape(g.gameId)}">${escape(status(g))} · ${g.includeInParent === false ? 'OUT OF CUP' : 'IN CUP'}</div>
        <div class="cup-ctrl-grid"><div><label for="pattcCupWeight_${escape(g.gameId)}">Cup weight</label><input id="pattcCupWeight_${escape(g.gameId)}" type="number" min="0" max="10" step="0.05" value="${escape(g.parentContributionWeight == null ? 1 : g.parentContributionWeight)}"></div>
        <div><label for="pattcCupInclude_${escape(g.gameId)}">Cup contribution</label><select id="pattcCupInclude_${escape(g.gameId)}"><option value="false" ${g.includeInParent === false ? 'selected' : ''}>Off · excluded</option><option value="true" ${g.includeInParent === false ? '' : 'selected'}>On · count</option></select></div></div>
        <div><button type="button" onclick="pattcCupSaveChildR1_('${escape(g.gameId)}')">Save Cup settings</button><button type="button" onclick="pattcCupCheckR1_('${escape(g.gameId)}')">Run Check</button><button type="button" onclick="pattcCupHoldR1_('${escape(g.gameId)}')">Put on hold</button><button type="button" class="cup-ctrl-primary" onclick="pattcCupLiveR1_('${escape(g.gameId)}')">Publish Live</button></div>
        <small class="cup-ctrl-muted">Publish Live requires the game's preflight and your confirmation. On Hold locks new picks and removes Cup points, without deleting results.</small></div>`).join('')}
      ${extra.map(g=>`<div class="cup-ctrl-row"><b>${escape(g.name)}</b> <span class="cup-ctrl-muted">Separate game · not linked to Cup · in development</span><button type="button" onclick="navigate('admin-game-setup:${escape(g.gameId)}')">Open setup</button></div>`).join('')}
      </details><details><summary>2 · Cup points &amp; field protection</summary>
        <div class="cup-ctrl-grid"><div><label for="pattcCupPoints">Placement points · comma separated</label><input id="pattcCupPoints" value="${escape(rules.points.join(','))}"></div><div><label for="pattcCupBest">Best mini-games (0 = all)</label><input id="pattcCupBest" type="number" min="0" max="100" step="1" value="${escape(parent.parentBestCount || 0)}"></div>
        <div><label for="pattcCupMin">Minimum entrants</label><input id="pattcCupMin" type="number" min="1" step="1" value="${escape(rules.minPlayers)}"></div><div><label for="pattcCupFull">Full field size</label><input id="pattcCupFull" type="number" min="1" step="1" value="${escape(rules.fullFieldSize)}"></div><div><label for="pattcCupPct">Minimum field participation %</label><input id="pattcCupPct" type="number" min="0" max="100" step="1" value="${escape(rules.minParticipationPct)}"></div><div><label for="pattcCupAdjust">Smaller-field adjustment</label><select id="pattcCupAdjust"><option value="true" ${rules.fieldAdjustment !== false ? 'selected' : ''}>Enabled</option><option value="false" ${rules.fieldAdjustment === false ? 'selected' : ''}>Disabled</option></select></div></div>
        <p class="cup-ctrl-muted">Qualifying field → placement points × field multiplier × mini-game weight. Changing published scoring rules can change existing Cup standings.</p><button type="button" class="cup-ctrl-primary" onclick="pattcCupSaveRulesR1_()">Save Cup scoring rules</button>
      </details><details><summary>3 · Cup publication</summary><p class="cup-ctrl-muted">The Cup is a leaderboard-only parent; mini-games must be published separately. Leave incomplete games on hold.</p><button type="button" onclick="pattcCupCheckR1_('${CUP_ID}')">Run Cup Check</button><button type="button" class="cup-ctrl-primary" onclick="pattcCupLiveR1_('${CUP_ID}')">Publish Cup Live</button></details>
      <div id="pattcCupCtrlMessage" role="status" aria-live="polite" style="min-height:20px;margin-top:8px;color:#a8efbc;font-size:13px">Saved changes appear after reloading Manage Games.</div></section>`;
  }
  async function latest(gameId) {
    const r = await apiAdminGetGames();
    if (resultError(r)) throw Error(resultError(r));
    const g = (r.games || []).find(x => x.gameId === gameId);
    if (!g) throw Error('Game no longer exists: ' + gameId);
    return g;
  }
  async function write(payload) {
    const r = await apiAdminUpdateGame(payload);
    if (resultError(r)) throw Error(resultError(r));
    return latest(payload.gameId);
  }
  async function operation(label, fn) {
    if (busy) return;
    busy = true;
    const root = byId('pattcCupControlR1');
    if (root) root.querySelectorAll('button').forEach(button => {button.disabled = true;});
    note(label + '…');
    try { await fn(); } catch (err) {note(err && err.message || String(err), true);} finally {
      busy = false;
      if (root) root.querySelectorAll('button').forEach(button => {button.disabled = false;});
    }
  }
  root.pattcCupSaveRulesR1_ = function () {return operation('Saving Cup scoring rules', async function () {
    const parent = await latest(CUP_ID);
    const raw = String(byId('pattcCupPoints').value || '').trim();
    const tokens = raw.split(',').map(x => x.trim());
    const points = tokens.map(Number);
    if (!raw || tokens.some(x => !x) || points.length > 100 || points.some(x => !Number.isFinite(x) || x < 0)) throw Error('Enter 1–100 non-negative placement points separated by commas.');
    const whole = (id, minimum, maximum) => {
      const rawNumber = String(byId(id).value || '').trim(), n = Number(rawNumber);
      if (!rawNumber || !Number.isInteger(n) || n < minimum || n > maximum) throw Error(id + ': enter a whole number between ' + minimum + ' and ' + maximum + '.');
      return n;
    };
    const best = whole('pattcCupBest',0,100), min = whole('pattcCupMin',1,1000), full = whole('pattcCupFull',1,1000), percent = whole('pattcCupPct',0,100);
    if (full < min) throw Error('Full field size cannot be smaller than minimum entrants.');
    let current = {};
    try {current = JSON.parse(parent.placementPointsJSON || '{}');} catch (_) {throw Error('Existing Cup scoring JSON is invalid. Repair it in Cup Setup before saving.');}
    if (!current || Array.isArray(current) || typeof current !== 'object') throw Error('Existing Cup scoring must be a JSON object.');
    const next = Object.assign({},current,{points:points,minPlayers:min,fullFieldSize:full,minParticipationPct:percent,fieldAdjustment:byId('pattcCupAdjust').value === 'true'});
    if (String(parent.status || '').toLowerCase() === 'active' && !root.confirm('Changing LIVE Cup rules can recalculate standings. Save these changes?')) return;
    const saved = await write({gameId:CUP_ID,placementPointsJSON:JSON.stringify(next),parentBestCount:best});
    if (Number(saved.parentBestCount) !== best || String(saved.placementPointsJSON) !== JSON.stringify(next)) throw Error('Scoring save not verified. Reload and check Cup Setup.');
    note('Cup scoring rules saved and verified.');
  });};
  root.pattcCupSaveChildR1_ = function (gameId) {return operation('Saving mini-game settings', async function () {
    const g = await latest(gameId);
    if (g.parentGameId !== CUP_ID) throw Error('Game is not linked to this Cup.');
    const weight = Number(byId('pattcCupWeight_' + gameId).value);
    const include = byId('pattcCupInclude_' + gameId).value === 'true';
    if (!Number.isFinite(weight) || weight < 0 || weight > 10) throw Error('Cup weight must be between 0 and 10.');
    if (include && status(g) !== 'LIVE') throw Error('Publish the mini-game Live before including it in Cup scoring.');
    if ((g.includeInParent !== include || Number(g.parentContributionWeight || 0) !== weight) && !root.confirm('Change Cup contribution or weight for ' + g.name + '? This can recalculate standings.')) return;
    const saved = await write({gameId:gameId,includeInParent:include,parentContributionWeight:weight});
    if (saved.includeInParent !== include || Number(saved.parentContributionWeight) !== weight) throw Error('Save was not verified. Reload and check settings.');
    refreshRow(saved);
    note(g.name + ': Cup settings saved and verified.');
  });};
  root.pattcCupHoldR1_ = function (gameId) {return operation('Holding mini-game', async function () {
    const g = await latest(gameId);
    if (g.parentGameId !== CUP_ID) throw Error('Game is not linked to this Cup.');
    if (!root.confirm('Put ' + g.name + ' on hold? New picks will lock; this game will stop contributing to Cup standings. Existing picks stay stored.')) return;
    const saved = await write({gameId:gameId,status:'Draft',active:false,lockAllPicks:true,defaultGame:false,includeInParent:false});
    if (bool(saved.active) || !bool(saved.lockAllPicks) || saved.includeInParent !== false) throw Error('Hold was not verified; inspect the game in Admin.');
    byId('pattcCupInclude_' + gameId).value = 'false';refreshRow(saved);note(g.name + ': on hold, new picks locked, excluded from Cup.');
  });};
  root.pattcCupCheckR1_ = function (gameId) {return operation('Running preflight', async function () {
    const r = await apiAdminRunGamePreflight(gameId);
    if (resultError(r)) throw Error(resultError(r));
    const errors = Number(r.errorCount || 0), warnings = Number(r.warningCount || 0);
    const detail = Array.isArray(r.issues) ? r.issues.slice(0,4).map(x=>x.message).filter(Boolean).join(' · ') : '';
    note(gameId + ': ' + errors + ' error(s), ' + warnings + ' warning(s). ' + detail, errors > 0);
  });};
  root.pattcCupLiveR1_ = function (gameId) {return operation('Checking launch readiness', async function () {
    const g = await latest(gameId);
    if (gameId !== CUP_ID && g.parentGameId !== CUP_ID) throw Error('Game is not linked to this Cup.');
    const check = await apiAdminRunGamePreflight(gameId);
    if (resultError(check)) throw Error(resultError(check));
    const errors = Number(check.errorCount || 0), warnings = Number(check.warningCount || 0);
    if (errors > 0) throw Error(g.name + ' has ' + errors + ' preflight error(s). Open its settings and repair these before publishing.');
    const warningText = Array.isArray(check.issues) ? check.issues.filter(x=>x.severity === 'warning').map(x=>x.message).join('\n') : '';
    const question = 'Publish ' + g.name + ' LIVE and unlock game-wide picks?\n' + warnings + ' preflight warning(s).\n' + warningText + '\n\nConfirm the current-week schedule and game rules yourself before publishing. Do not reopen started matchups.';
    if (!root.confirm(question)) {note('Publication cancelled. No game state changed.');return;}
    const res = await apiAdminFinalizeGamePublication({gameId:gameId,defaultGame:false,lockAllPicks:gameId === CUP_ID,warningsApproved:warnings > 0});
    if (resultError(res) || res.activated !== true) throw Error(resultError(res) || res.message || 'Publication was not confirmed.');
    let saved = await latest(gameId);
    if (!bool(saved.active) || String(saved.status).toLowerCase() !== 'active') throw Error('Live state could not be verified; check game settings.');
    if (gameId !== CUP_ID && g.includeInParent === false) {
      // Inclusion is a separate, explicit action: publication does not automatically award Cup points.
      note(g.name + ' published LIVE. Cup contribution remains OFF; enable it and Save Cup settings when ready.');
    } else note(g.name + ' published LIVE and verified.');
    refreshRow(saved);
  });};
  const BASE = root.renderAdminGamesPage;
  if (typeof BASE === 'function') root.renderAdminGamesPage = async function () {
    const [html, response] = await Promise.all([BASE(), apiAdminGetGames()]);
    if (resultError(response)) return String(html);
    const card = layout(response.games || []);
    if (!card) return String(html);
    const markup = String(html);
    const old = markup.indexOf('id="nflCupFuturesBuildButton"');
    if (old >= 0) {const end = markup.indexOf('</section>', old);if (end >= 0) return markup.slice(0,end+10)+card+markup.slice(end+10);}
    const start = markup.indexOf('<div class="page');
    if (start < 0) return card+markup;
    const tagEnd = markup.indexOf('>', start);
    return markup.slice(0, tagEnd+1) + card + markup.slice(tagEnd+1);
  };
})(window);
