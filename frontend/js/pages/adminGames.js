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

  const res =
    await apiAdminGetGames();

  if (
    !res ||
    res.success === false
  ) {

    return `
      <div class="page">

        <h1>Manage Games</h1>

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
          <p>
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

      <div class="admin-section-title">
        Existing Games
      </div>

      ${
        games.length
          ? `
            <div class="admin-game-list">
              ${games
                .map(renderAdminGameCard)
                .join("")}
            </div>
          `
          : `
            <div class="card">
              No games found.
            </div>
          `
      }

    </div>
  `;

}

/* ======================
   NEW GAME CARD
====================== */

function renderAdminNewGameCard() {

  return `
    <div class="card admin-card">

      <h2>New Game</h2>

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

      </div>

      <button
        class="button admin-action-button"
        onclick="adminCreateGameFromForm()"
      >
        Create Draft Game
      </button>

      <div
        id="adminNewGameMessage"
        class="admin-message"
      ></div>

    </div>
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
    <div class="card admin-card">

      <h2>Clone Game Setup</h2>

      <p class="admin-muted">
        Clone a previous game into a new draft game. Winners and favorites are cleared.
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
        class="button admin-action-button"
        onclick="adminCloneGameFromForm()"
      >
        Clone Game
      </button>

      <div
        id="adminCloneGameMessage"
        class="admin-message"
      ></div>

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

  return `
    <div class="card admin-game-card">

      <div class="admin-game-card-head">

        <div>
          <h2>${name}</h2>

          <div class="admin-game-id">
            ${gameId}
          </div>
        </div>

        <div class="admin-status-stack">
          ${adminGamesStatusBadge(game)}
          ${game.defaultGame
            ? adminGamesBoolBadge(true, "Default", "")
            : ""}
        </div>

      </div>

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
          onclick="adminPrefillCloneGame('${gameId}', '${name}')"
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

      ${renderAdminPublishControls(game)}

      <div
        id="adminPreflightResult_${gameId}"
        class="admin-preflight-result"
      ></div>

    </div>
  `;

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
          class="admin-publish-button"
          onclick="adminSetGameDraft('${gameId}')"
        >
          Draft
        </button>

        <button
          class="admin-publish-button"
          onclick="adminSetGameSetup('${gameId}')"
        >
          Setup
        </button>

        <button
          class="admin-publish-button"
          onclick="adminSetGamePreview('${gameId}')"
        >
          Preview
        </button>

        <button
          class="admin-publish-button active"
          onclick="adminSetGameActive('${gameId}')"
        >
          Activate
        </button>

        <button
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

  el.innerText =
    message || "";

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

  if (!name || !gameId) {

    adminSetMessage(
      "adminNewGameMessage",
      "Game name and Game ID are required.",
      true
    );

    return;

  }

  adminSetMessage(
    "adminNewGameMessage",
    "Creating game...",
    false
  );

  const res =
    await apiAdminCreateGame({
      name: name,
      gameId: gameId,
      year: year,
      type: type,
      themeColor: themeColor,
      active: false,
      archived: false,
      defaultGame: false,
      predictionEnabled: false,
      rankingEnabled: false,
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

}

function adminPrefillCloneGame(gameId, name) {

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

  if (source) {
    source.value = gameId;
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

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

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

  adminSetMessage(
    "adminCloneGameMessage",
    "Cloning game...",
    false
  );

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
      predictionEnabled: false,
      rankingEnabled: false,
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
      predictionEnabled: false,
      rankingEnabled: false,
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
      "Move this game to Preview? It will be active for testing, but predictions and rankings stay off."
    );

  if (!ok) {
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
      predictionEnabled: false,
      rankingEnabled: false,
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

  const ok =
    confirm(
      "Activate this game? It will become active with predictions and rankings enabled, but it will not become the default game yet."
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
      predictionEnabled: true,
      rankingEnabled: true,
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
      predictionEnabled: true,
      rankingEnabled: true,
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

    </div>
  `;

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