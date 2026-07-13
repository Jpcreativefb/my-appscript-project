async function renderAdminPage() {

  const session =
    getSession();

  const isAdmin =
    isAdminSession(session);

  console.log(
    "ADMIN PAGE CHECK:",
    isAdmin,
    session
  );

  if (!isAdmin) {
    return `
      <div class="page admin-page">
        <h1>Admin</h1>

        <div class="card admin-card">
          You do not have admin access.
        </div>
      </div>
    `;
  }

  const res =
    await apiAdminSummary();

  if (!res.success) {
    return `
      <div class="page admin-page">
        <h1>Admin</h1>

        <div class="card admin-card error-card">
          ${res.error || res.message || "Failed to load admin data"}
        </div>
      </div>
    `;
  }

  const counts =
    res.counts || {};

  return `
    <div class="page admin-page">

      <h1>Admin</h1>

      <div class="admin-section">

        <div class="card admin-card">
          <div class="admin-label">
            Current Game
          </div>

          <div class="admin-value">
            ${res.game && res.game.name
              ? res.game.name
              : res.gameId}
          </div>

          <div class="admin-sub">
            ${res.gameId}
          </div>
        </div>

        <div class="admin-grid">

          <div class="card admin-stat">
            <div class="admin-label">Users</div>
            <div class="admin-number">${counts.users || 0}</div>
          </div>

          <div class="card admin-stat">
            <div class="admin-label">Games</div>
            <div class="admin-number">${counts.games || 0}</div>
          </div>

          <div class="card admin-stat">
            <div class="admin-label">Categories</div>
            <div class="admin-number">${counts.categories || 0}</div>
          </div>

          <div class="card admin-stat">
            <div class="admin-label">Locked</div>
            <div class="admin-number">${counts.lockedCategories || 0}</div>
          </div>

        </div>

        <div class="card">

          <h2>Tools</h2>

          <button
            class="button admin-button"
            onclick="adminClearCaches()"
          >
            Clear App Caches
          </button>

          <button
            class="button admin-button secondary"
            onclick="adminSetupLiveResultsSystem()"
          >
            Setup Live Results
          </button>

          <div
            id="adminMessage"
            class="admin-message"
          ></div>

        </div>

                <div class="card admin-card">

          <h2>Sports Engine Controls</h2>

          <div class="admin-sub">
            One button checks the Sports Controls setup, opens the dashboard, and keeps the full sync controls in one place.
          </div>

          <div class="admin-actions">

            <button
              class="button admin-button"
              onclick="adminOpenSportsControls()"
            >
              Open Sports Controls
            </button>

          </div>

          <div
            id="adminSportsControlMessage"
            class="admin-message"
          ></div>

          <div
            id="adminSportsControlPanel"
            class="admin-list"
          ></div>

        </div>

        <div class="card admin-card">

          <h2>League Access</h2>

          <div class="admin-sub">
            Create leagues, add members, assign private games, and set feature access.
          </div>

          <button
            class="button admin-button"
            onclick="navigate('leagues')"
          >
            Open League Manager
          </button>

        </div>

        <div class="card admin-card">

         <h2>Manage Games</h2>

         <div class="admin-sub">
            Create draft games, clone previous games, archive games, and open game setup.
         </div>

         <button
            class="button admin-button"
            onclick="navigate('admin-games')"
         >
             Open Manage Games
         </button>

        </div>

        <div class="card">

          <h2>Category Controls</h2>

          <div class="admin-list">

            ${(res.categories || []).map(cat => `
              <div class="admin-category-card">

                <div class="admin-category-header">

                  <div>
                    <strong>
                      ${cat.name || cat.id}
                    </strong>

                    <div class="admin-sub">
                      ${cat.id}
                      ·
                      ${(cat.nominees || []).length} nominees
                    </div>
                  </div>

                  <div class="admin-pill ${cat.locked ? "locked" : ""}">
                    ${cat.locked ? "Locked" : "Open"}
                  </div>

                </div>

                <div class="admin-control-grid">

                  <label class="admin-field">
                    <span>Points</span>

                    <input
                      type="number"
                      id="points-${cat.id}"
                      value="${cat.points || 0}"
                      min="0"
                    >
                  </label>

                  <label class="admin-field">
                    <span>Winner</span>

                    <select id="winner-${cat.id}">
                      <option value="">
                        No winner selected
                      </option>

                      ${(cat.nominees || []).map(nominee => `
                        <option
                          value="${nominee.id}"
                          ${
                            String(nominee.id || "")
                              .trim()
                              .toLowerCase() ===
                            String(cat.winnerNomineeId || "")
                              .trim()
                              .toLowerCase()
                              ? "selected"
                              : ""
                          }
                        >
                          ${nominee.name || nominee.id}
                        </option>
                      `).join("")}
                    </select>
                  </label>

                </div>

                <div class="admin-actions">

                  <button
                    class="admin-small-button"
                    onclick="adminSaveCategory('${cat.id}')"
                  >
                    Save
                  </button>

                  <button
                    class="admin-small-button secondary"
                    onclick="adminToggleCategoryLock('${cat.id}', ${cat.locked ? "false" : "true"})"
                  >
                    ${cat.locked ? "Unlock" : "Lock"}
                  </button>

                  <button
                    class="admin-small-button danger"
                    onclick="adminClearWinner('${cat.id}')"
                  >
                    Clear Winner
                  </button>

                </div>

              </div>
            `).join("")}

          </div>

        </div>

        <div class="card">

          <h2>User Controls</h2>

          <div class="admin-user-create">

            <h3>Create User</h3>

            <div class="admin-control-grid">

              <label class="admin-field">
                <span>Username</span>

                <input
                  type="text"
                  id="newUserUsername"
                  placeholder="username"
                >
              </label>

              <label class="admin-field">
                <span>PIN</span>

                <input
                  type="text"
                  id="newUserPin"
                  placeholder="1234"
                >
              </label>

              <label class="admin-field">
                <span>Avatar</span>

                <input
                  type="text"
                  id="newUserAvatar"
                  value="avatar1"
                >
              </label>

              <label class="admin-field">
                <span>Theme Color</span>

                <input
                  type="text"
                  id="newUserThemeColor"
                  value="#ffcc00"
                >
              </label>

            </div>

            <label class="admin-check-row">
              <input
                type="checkbox"
                id="newUserIsAdmin"
              >

              <span>
                Make admin
              </span>
            </label>

            <button
              class="admin-small-button"
              onclick="adminCreateUser()"
            >
              Create User
            </button>

          </div>

          <hr class="admin-divider">

          <h3>Existing Users</h3>

          <div class="admin-list">

            ${(res.users || []).map(user => `
              <div class="admin-user-card">

                <div class="admin-user-header">

                  <div>
                    <strong>
                      ${user.username}
                    </strong>

                    <div class="admin-sub">
                      ${user.isAdmin ? "Administrator" : "Player"}
                      ·
                      ${user.active === false ? "Inactive" : "Active"}
                    </div>
                  </div>

                  <div class="admin-pill ${user.active === false ? "inactive" : user.isAdmin ? "admin" : ""}">
                    ${user.active === false ? "Inactive" : user.isAdmin ? "Admin" : "Player"}
                  </div>

                </div>

                <div class="admin-actions">

                  <button
                    class="admin-small-button secondary"
                    onclick="adminPromptResetPin('${user.username}')"
                  >
                    Reset PIN
                  </button>

                  <button
                    class="admin-small-button ${user.isAdmin ? "danger" : "secondary"}"
                    onclick="adminToggleUserAdmin('${user.username}', ${user.isAdmin ? "false" : "true"})"
                  >
                    ${user.isAdmin ? "Remove Admin" : "Make Admin"}
                  </button>

                  <button
                    class="admin-small-button ${user.active === false ? "secondary" : "danger"}"
                    onclick="adminToggleUserActive('${user.username}', ${user.active === false ? "true" : "false"})"
                  >
                    ${user.active === false ? "Reactivate" : "Deactivate"}
                  </button>

                </div>

              </div>
            `).join("")}

          </div>

        </div>

      </div>

    </div>
  `;

}

/* =========================
   ADMIN GAMES PANEL
========================= */

async function renderAdminGamesPanel() {

  const res =
    await apiAdminGetGames();

  if (
    !res ||
    res.success === false
  ) {

    return `
      <div class="page admin-page">

        <h1>Manage Games</h1>

        <div class="card admin-card error-card">
          Could not load games.

          <div class="admin-sub">
            ${res && res.error ? escapeHtml_(res.error) : ""}
          </div>
        </div>

      </div>
    `;

  }

  const games =
    res.games || [];

  const gameTypes =
    res.gameTypes || [];

  return `
    <div class="page admin-page">

      <div class="admin-page-header">

        <div>
          <h1>Manage Games</h1>

          <div class="admin-sub">
            Create and configure prediction, confidence, wager, and ranking games.
          </div>
        </div>

        <button
          class="admin-small-button secondary"
          onclick="navigate('admin')"
        >
          Back to Admin
        </button>

      </div>

      <div class="admin-section">

        <details
          class="card admin-card admin-collapsible-card admin-games-create-card"
        >

          <summary class="admin-card-summary">

            <div>
              <h2>Create New Game</h2>

              <div class="admin-sub">
                Add a new game shell.
              </div>
            </div>

            <span class="admin-collapse-icon">
              ▾
            </span>

          </summary>

          <div class="admin-collapsible-body">

            ${renderAdminGameForm(
              null,
              gameTypes
            )}

          </div>

        </details>

        ${typeof renderAdminCloneGameCard === "function"
          ? renderAdminCloneGameCard(games)
          : ""}

        <details
          class="card admin-card admin-collapsible-card admin-games-panel"
          open
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

            <div class="admin-games-list">

              ${games.map(game =>
                renderAdminGameForm(
                  game,
                  gameTypes
                )
              ).join("")}

            </div>

          </div>

        </details>

      </div>

    </div>
  `;

}

function renderAdminGameForm(
  game,
  gameTypes
) {

  const isNew =
    !game;

  game =
    game || {
      gameId: "",
      name: "",
      year: "",
      type: "prediction",
      active: true,
      archived: false,
      defaultGame: false,
      predictionEnabled: true,
      rankingEnabled: false,
      confidenceEnabled: false,
      confidenceScoringMode: "win_only",
      wagerEnabled: false,
      startingBankroll: 100,
      minWager: 1,
      maxWager: 100,
      allowBetRemoval: false,
      wagerEditMode: "editable_until_lock",
      themeColor: "",
      icon: "",
      sortOrder: 999,
      status: "",
      description: "",
      lockLabel: "",
      availableFrom: "",
      availableUntil: "",
      heroImageFileId: "",
      heroImagePosition: "center center",
      lockAllPicks: false,
      showLeaderboard: true,
      showResultsBeforeLock: false,
      resultsFinalized: false,
      votingLocked: false
    };

  const title =
    isNew
      ? "Create New Game"
      : escapeHtml_(game.name || game.gameId);

  const subtitle =
    isNew
      ? "Add a new game shell."
      : escapeHtml_(game.gameId);

  const openAttr =
    isNew || game.defaultGame || game.active
      ? "open"
      : "";

  const rawGameId =
    game.gameId || "new-game";

  const domId =
    typeof adminGameDomId_ === "function"
      ? adminGameDomId_(rawGameId)
      : String(rawGameId)
          .replace(/[^a-zA-Z0-9_-]/g, "_");

  const heroImageFileId =
    game.heroImageFileId ||
    game.heroImageFileID ||
    "";

  const heroImageUrl =
    heroImageFileId && typeof adminGameHeroThumbnail_ === "function"
      ? adminGameHeroThumbnail_(heroImageFileId)
      : "";

  return `
    <details
      class="admin-game-form-details admin-collapsible-card"
      ${openAttr}
    >

      <summary class="admin-card-summary admin-game-form-summary">

        <div>
          <h3>
            ${title}
          </h3>

          <div class="admin-sub">
            ${subtitle}
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <form
          class="admin-game-form"
          onsubmit="adminSaveGameFromForm(event, this)"
        >

          <div class="form-grid">

            <label>
              Game Name

              <input
                id="adminGameName_${domId}"
                name="name"
                value="${escapeHtml_(game.name)}"
                placeholder="Oscars 2026"
                required
              />
            </label>

            <label>
              Game ID

              <input
                name="gameId"
                value="${escapeHtml_(game.gameId)}"
                placeholder="oscars-2026"
                ${isNew ? "" : "readonly"}
                required
              />
            </label>

            <label>
              Year

              <input
                name="year"
                type="number"
                value="${escapeHtml_(game.year || "")}"
                placeholder="2026"
              />
            </label>

            <label>
              Game Type

              <select
                name="type"
                onchange="adminApplyGameTypeDefaults(this.form)"
              >
                ${renderGameTypeOptions_(
                  game.type,
                  gameTypes
                )}
              </select>
            </label>

          </div>

          <div class="form-grid">

            <label>
              Confidence Scoring

              <select name="confidenceScoringMode">

                <option
                  value="win_only"
                  ${game.confidenceScoringMode === "risk_penalty" ? "" : "selected"}
                >
                  Win only — wrong picks get 0
                </option>

                <option
                  value="risk_penalty"
                  ${game.confidenceScoringMode === "risk_penalty" ? "selected" : ""}
                >
                  Risk penalty — wrong picks lose confidence points
                </option>

              </select>
            </label>

          </div>

          <div class="admin-checkbox-row">

            ${renderAdminCheckbox_(
              "active",
              "Active",
              game.active
            )}

            ${renderAdminCheckbox_(
              "defaultGame",
              "Default Game",
              game.defaultGame
            )}

            ${renderAdminCheckbox_(
              "archived",
              "Archived",
              game.archived
            )}

            ${renderAdminCheckbox_(
              "lockAllPicks",
              "Lock All Picks",
              game.lockAllPicks
            )}

          </div>

          <details class="admin-advanced-details">

            <summary>
              Advanced game behavior
            </summary>

            <h4>Game Behavior</h4>

            <div class="admin-checkbox-row">

              ${renderAdminCheckbox_(
                "predictionEnabled",
                "Prediction Enabled",
                game.predictionEnabled
              )}

              ${renderAdminCheckbox_(
                "rankingEnabled",
                "Ranking Enabled",
                game.rankingEnabled
              )}

              ${renderAdminCheckbox_(
                "confidenceEnabled",
                "Confidence Enabled",
                game.confidenceEnabled
              )}

              ${renderAdminCheckbox_(
                "wagerEnabled",
                "Wager Enabled",
                game.wagerEnabled
              )}

              ${renderAdminCheckbox_(
                "showLeaderboard",
                "Show Leaderboard",
                game.showLeaderboard
              )}

              ${renderAdminCheckbox_(
                "showResultsBeforeLock",
                "Show Results Before Lock",
                game.showResultsBeforeLock
              )}

              ${renderAdminCheckbox_(
                "resultsFinalized",
                "Results Finalized",
                game.resultsFinalized
              )}

              ${renderAdminCheckbox_(
                "votingLocked",
                "Voting Locked",
                game.votingLocked
              )}

            </div>

            <h4>Wager Settings</h4>

            <div class="form-grid">

              <label>
                Starting Bankroll

                <input
                  name="startingBankroll"
                  type="number"
                  value="${escapeHtml_(game.startingBankroll || 100)}"
                />
              </label>

              <label>
                Min Wager

                <input
                  name="minWager"
                  type="number"
                  value="${escapeHtml_(game.minWager || 1)}"
                />
              </label>

              <label>
                Max Wager

                <input
                  name="maxWager"
                  type="number"
                  value="${escapeHtml_(game.maxWager || 100)}"
                />
              </label>

              <label>
                Wager Edit Mode

                <select name="wagerEditMode">
                  <option
                    value="editable_until_lock"
                    ${String(game.wagerEditMode || "editable_until_lock") === "final_once_selected" ? "" : "selected"}
                  >
                    Editable until game locks
                  </option>

                  <option
                    value="final_once_selected"
                    ${String(game.wagerEditMode || "") === "final_once_selected" ? "selected" : ""}
                  >
                    Final once selected
                  </option>
                </select>
              </label>

            </div>

            <div class="admin-checkbox-row">
              ${renderAdminCheckbox_(
                "allowBetRemoval",
                "Allow Take Back Before Lock",
                game.allowBetRemoval
              )}
            </div>

            <h4>Display</h4>

            <div class="form-grid">

              <label>
                Theme Color

                <input
                  id="adminGameThemeColor_${domId}"
                  name="themeColor"
                  value="${escapeHtml_(game.themeColor || "")}"
                  placeholder="#c8a24a"
                />
              </label>

              <label>
                Sort Order

                <input
                  name="sortOrder"
                  type="number"
                  value="${escapeHtml_(game.sortOrder || 999)}"
                />
              </label>

              <label>
                Status

                <input
                  name="status"
                  value="${escapeHtml_(game.status || "")}"
                  placeholder="Open, Locked, Complete"
                />
              </label>

            </div>

            <h4>Dashboard Card Settings</h4>

            <p class="admin-muted">
              The dashboard title uses Game Name. The subtitle uses the selected Game Type.
            </p>

            <div class="form-grid">

              <label class="admin-wide-field">
                Description

                <textarea
                  id="adminGameDescription_${domId}"
                  name="description"
                  rows="4"
                  placeholder="Briefly explain how this game works."
                >${escapeHtml_(game.description || "")}</textarea>
              </label>

              <label>
                Lock Label

                <input
                  id="adminGameLockLabel_${domId}"
                  name="lockLabel"
                  value="${escapeHtml_(game.lockLabel || "")}"
                  placeholder="Locks before ceremony"
                />
              </label>

              <label>
                Available From

                <input
                  id="adminGameAvailableFrom_${domId}"
                  name="availableFrom"
                  type="datetime-local"
                  value="${escapeHtml_(game.availableFrom || "")}"
                />
              </label>

              <label>
                Available Until

                <input
                  id="adminGameAvailableUntil_${domId}"
                  name="availableUntil"
                  type="datetime-local"
                  value="${escapeHtml_(game.availableUntil || "")}"
                />
              </label>

              <label>
                Hero Image File ID

                <input
                  id="adminGameHeroImageFileId_${domId}"
                  name="heroImageFileId"
                  value="${escapeHtml_(heroImageFileId)}"
                  placeholder="Google Drive File ID"
                  oninput="adminPreviewGameHeroImage('${escapeJs(rawGameId)}')"
                />
              </label>

              <label>
                Hero Image Position

                <input
                  id="adminGameHeroImagePosition_${domId}"
                  name="heroImagePosition"
                  value="${escapeHtml_(game.heroImagePosition || "center center")}"
                  placeholder="center center"
                />
              </label>

            </div>

            ${!isNew ? `
              <div
                id="adminGameHeroPreview_${domId}"
                class="admin-game-hero-preview ${heroImageUrl ? "has-image" : ""}"
                style="--admin-game-hero-image: ${heroImageUrl ? `url('${heroImageUrl}')` : "none"};"
              >
                <div class="admin-game-hero-preview-overlay">
                  Hero image preview
                </div>
              </div>

              <div class="admin-form-grid admin-game-image-tools">

                <label>
                  Upload Hero Image

                  <input
                    id="adminGameHeroFile_${domId}"
                    class="input admin-input"
                    type="file"
                    accept="image/*"
                  >
                </label>

                <label>
                  Import Image URL

                  <input
                    id="adminGameHeroUrl_${domId}"
                    class="input admin-input"
                    placeholder="https://example.com/image.jpg"
                  >
                </label>

              </div>

              <div class="admin-card-actions">

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminUploadGameHeroImage('${escapeJs(rawGameId)}')"
                >
                  Upload Image
                </button>

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminImportGameHeroImageFromUrl('${escapeJs(rawGameId)}')"
                >
                  Import URL
                </button>

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminClearGameHeroImage('${escapeJs(rawGameId)}')"
                >
                  Clear Image
                </button>

              </div>

              <div
                id="adminGameDashboardMessage_${domId}"
                class="admin-message"
              ></div>
            ` : ""}

          </details>

          <div class="admin-card-actions">

            <button
              type="submit"
              class="admin-small-button"
            >
              ${isNew ? "Create Game" : "Save Game"}
            </button>

            ${!isNew ? `
              <button
                type="button"
                class="admin-small-button secondary"
                onclick="navigate('admin-game-setup:${escapeHtml_(game.gameId)}')"
              >
                Categories / Questions / Nominees
              </button>
            ` : ""}

          </div>

        </form>

      </div>

    </details>
  `;

}

function renderGameTypeOptions_(
  selectedType,
  gameTypes
) {

  gameTypes =
    gameTypes || [];

  if (!gameTypes.length) {

    gameTypes = [
      {
        id: "prediction",
        label: "Prediction Game"
      },
      {
        id: "confidence",
        label: "Confidence Pool"
      },
      {
        id: "wager",
        label: "Wager / Chips Game"
      },
      {
        id: "ranking",
        label: "Ranking Game"
      }
    ];

  }

  return gameTypes.map(type => `
    <option
      value="${escapeHtml_(type.id)}"
      ${type.id === selectedType ? "selected" : ""}
    >
      ${escapeHtml_(type.label)}
    </option>
  `).join("");

}

function renderAdminCheckbox_(
  name,
  label,
  checked
) {

  return `
    <label class="admin-checkbox">
      <input
        type="checkbox"
        name="${escapeHtml_(name)}"
        ${checked ? "checked" : ""}
      />
      <span>${escapeHtml_(label)}</span>
    </label>
  `;

}

function escapeHtml_(
  value
) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

const ADMIN_LEGACY_GAME_SAVE_ACTIONS = {};

function adminLegacySetSaving_(form, isSaving) {

  if (!form) {
    return;
  }

  const button =
    form.querySelector(
      'button[type="submit"], .admin-action-button, button'
    );

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
      "Saving...";

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

function adminLegacyShowSavingProgress_(form) {

  let box =
    form.querySelector(
      ".admin-save-inline-progress"
    );

  if (!box) {

    box =
      document.createElement("div");

    box.className =
      "admin-save-inline-progress admin-message is-saving";

    form.appendChild(box);

  }

  box.innerHTML =
    `<div class="admin-save-status">
      <span class="admin-save-spinner" aria-hidden="true"></span>
      <span>Saving game...</span>
    </div>
    <div class="admin-save-progress" role="progressbar" aria-label="Saving">
      <span></span>
    </div>`;

}

function adminLegacyClearSavingProgress_(form) {

  const box =
    form && form.querySelector(
      ".admin-save-inline-progress"
    );

  if (box) {
    box.remove();
  }

}

async function adminSaveGameFromForm(
  event,
  form
) {

  event.preventDefault();

  const game =
    adminGetGamePayloadFromForm_(
      form
    );

  if (!game.gameId) {
    alert("Game ID is required.");
    return;
  }

  if (!game.name) {
    alert("Game name is required.");
    return;
  }

  const saveKey =
    "legacy-admin-game-save:" + game.gameId;

  if (ADMIN_LEGACY_GAME_SAVE_ACTIONS[saveKey]) {
    alert("Save already running. Please wait for it to finish.");
    return;
  }

  ADMIN_LEGACY_GAME_SAVE_ACTIONS[saveKey] = true;

  adminLegacySetSaving_(
    form,
    true
  );

  adminLegacyShowSavingProgress_(
    form
  );

  let res;

  try {

    res =
      await apiAdminSaveGame(
        game
      );

  } finally {

    delete ADMIN_LEGACY_GAME_SAVE_ACTIONS[saveKey];

    adminLegacySetSaving_(
      form,
      false
    );

    adminLegacyClearSavingProgress_(
      form
    );

  }

  if (
    !res ||
    res.success === false
  ) {

    const saveErrorMessage =
      res && res.error
        ? res.error
        : res && res.message
          ? res.message
          : "Unknown error";

    alert(
      /^Could not save game:/i.test(saveErrorMessage)
        ? saveErrorMessage
        : "Could not save game: " + saveErrorMessage
    );

    return;

  }

  alert(
    "Game saved."
  );

  await navigate(
    "admin-games"
  );

}

function adminGetGamePayloadFromForm_(
  form
) {

  return {
    gameId:
      form.gameId.value.trim(),

    name:
      form.name.value.trim(),

    year:
      form.year.value.trim(),

    type:
      form.type.value,

    active:
      form.active.checked,

    archived:
      form.archived.checked,

    defaultGame:
      form.defaultGame.checked,

    predictionEnabled:
      form.predictionEnabled.checked,

    rankingEnabled:
      form.rankingEnabled.checked,

    confidenceEnabled:
      form.confidenceEnabled.checked,

    confidenceScoringMode:
      form.confidenceScoringMode
        ? form.confidenceScoringMode.value
        : "win_only",  

    wagerEnabled:
      form.wagerEnabled.checked,

    startingBankroll:
      form.startingBankroll.value,

    minWager:
      form.minWager.value,

    maxWager:
      form.maxWager.value,

    allowBetRemoval:
      form.allowBetRemoval
        ? form.allowBetRemoval.checked
        : false,

    wagerEditMode:
      form.wagerEditMode
        ? form.wagerEditMode.value
        : "editable_until_lock",

    themeColor:
      form.themeColor.value.trim(),

    description:
      form.description
        ? form.description.value.trim()
        : "",

    lockLabel:
      form.lockLabel
        ? form.lockLabel.value.trim()
        : "",

    availableFrom:
      form.availableFrom
        ? form.availableFrom.value.trim()
        : "",

    availableUntil:
      form.availableUntil
        ? form.availableUntil.value.trim()
        : "",

    heroImageFileId:
      form.heroImageFileId
        ? form.heroImageFileId.value.trim()
        : "",

    heroImagePosition:
      form.heroImagePosition
        ? form.heroImagePosition.value.trim() || "center center"
        : "center center",

    icon:
      form.icon
        ? form.icon.value.trim()
        : "",

    sortOrder:
      form.sortOrder.value,

    status:
      form.status.value.trim(),

    lockAllPicks:
      form.lockAllPicks.checked,

    showLeaderboard:
      form.showLeaderboard.checked,

      showResultsBeforeLock:
      form.showResultsBeforeLock.checked,
    
    resultsFinalized:
      form.resultsFinalized
        ? form.resultsFinalized.checked
        : false,
    
    votingLocked:
      form.votingLocked
        ? form.votingLocked.checked
        : false
  };

}

function adminToggleGameAdvanced(
  button
) {

  const card =
    button.closest(
      ".admin-game-card"
    );

  if (!card) {
    return;
  }

  const advanced =
    card.querySelector(
      ".admin-game-advanced"
    );

  if (!advanced) {
    return;
  }

  advanced.classList.toggle(
    "hidden"
  );

}

function adminApplyGameTypeDefaults(
  form
) {

  const type =
    form.type.value;

  if (type === "prediction") {

    form.predictionEnabled.checked = true;
    form.rankingEnabled.checked = false;
    form.confidenceEnabled.checked = false;
    form.wagerEnabled.checked = false;

  }

  if (type === "confidence") {

    form.predictionEnabled.checked = true;
    form.rankingEnabled.checked = false;
    form.confidenceEnabled.checked = true;
    form.wagerEnabled.checked = false;

  }

  if (type === "wager") {

    form.predictionEnabled.checked = false;
    form.rankingEnabled.checked = false;
    form.confidenceEnabled.checked = false;
    form.wagerEnabled.checked = true;

  }

  if (type === "ranking") {

    form.predictionEnabled.checked = false;
    form.rankingEnabled.checked = true;
    form.confidenceEnabled.checked = false;
    form.wagerEnabled.checked = false;

  }

}

async function adminClearCaches() {
  
    const message =
      document.getElementById("adminMessage");
  
    if (message) {
      message.innerText =
        "Clearing caches...";
    }
  
    const res =
      await apiAdminClearCaches();
  
    if (message) {
      message.innerText =
        res.success
          ? "Caches cleared."
          : res.error || res.message || "Unable to clear caches.";
    }
  
}

async function adminSetupLiveResultsSystem() {

  const message =
    document.getElementById("adminMessage");

  if (message) {
    message.innerText =
      "Setting up live results...";
  }

  const res =
    await apiAdminSetupLiveResultsSystem();

  if (message) {
    message.innerText =
      res.success
        ? "Live results system ready."
        : res.error || res.message || "Unable to setup live results.";
  }

}

async function adminSaveCategory(categoryId) {

  const message =
    document.getElementById("adminMessage");

  const pointsInput =
    document.getElementById(
      "points-" + categoryId
    );

  const winnerInput =
    document.getElementById(
      "winner-" + categoryId
    );

  if (message) {
    message.innerText =
      "Saving category...";
  }

  let pointsRes = {
    success: true
  };

  if (pointsInput) {

    pointsRes =
      await apiAdminUpdateCategorySetting(
        categoryId,
        {
          points:
            pointsInput.value
        }
      );

  }

  if (!pointsRes.success) {

    if (message) {
      message.innerText =
        pointsRes.error ||
        pointsRes.message ||
        "Unable to save points.";
    }

    return;

  }

  const winnerNomineeId =
    winnerInput
      ? String(winnerInput.value || "")
          .trim()
      : "";

  let winnerRes = {
    success: true
  };

  if (winnerNomineeId) {

    winnerRes =
      await apiAdminUpdateCategorySetting(
        categoryId,
        {
          winnerNomineeId:
            winnerNomineeId,

          notes:
            "Winner selected from admin panel"
        }
      );

  }

  if (message) {

    if (!winnerRes.success) {

      message.innerText =
        winnerRes.error ||
        winnerRes.message ||
        "Unable to save winner.";

    } else if (winnerNomineeId) {

      message.innerText =
        "Category saved. Winner logged in ResultEvents.";

    } else {

      message.innerText =
        "Category saved. No winner change was made.";

    }

  }

}
  
async function adminToggleCategoryLock(categoryId, locked) {

  const message =
    document.getElementById("adminMessage");

  if (message) {
    message.innerText =
      locked
        ? "Locking category..."
        : "Unlocking category...";
  }

  const res =
    await apiAdminUpdateCategorySetting(
      categoryId,
      {
        locked:
          locked
      }
    );

  if (message) {
    message.innerText =
      res.success
        ? "Category lock updated."
        : res.error || res.message || "Unable to update category.";
  }

}
  
async function adminClearWinner(categoryId) {

  const confirmed =
    window.confirm(
      "Clear winner for this category?"
    );

  if (!confirmed) {
    return;
  }

  const message =
    document.getElementById("adminMessage");

  if (message) {
    message.innerText =
      "Clearing winner...";
  }

  const res =
    await apiAdminClearLiveWinner(
      categoryId
    );

  if (message) {
    message.innerText =
      res.success
        ? "Winner cleared and leaderboard updated."
        : res.error || res.message || "Unable to clear winner.";
  }

  if (res.success) {
    await navigate("admin");
  }

}

async function adminClearWinner(categoryId) {

  const confirmed =
    window.confirm(
      "Clear winner for this category?"
    );

  if (!confirmed) {
    return;
  }

  const message =
    document.getElementById("adminMessage");

  if (message) {
    message.innerText =
      "Clearing winner...";
  }

  const res =
    await apiAdminClearCategoryWinner(
      categoryId
    );

  if (res.success) {

    const winnerInput =
      document.getElementById(
        "winner-" + categoryId
      );

    if (winnerInput) {
      winnerInput.value = "";
    }

  }

  if (message) {
    message.innerText =
      res.success
        ? "Winner cleared and logged in ResultEvents."
        : res.error || res.message || "Unable to clear winner.";
  }

}
  
async function adminPromptResetPin(username) {
  
    const pin =
      window.prompt(
        "Enter new PIN for " + username
      );
  
    if (pin === null) {
      return;
    }
  
    const cleanPin =
      String(pin || "")
        .trim();
  
    if (!cleanPin) {
      alert("PIN cannot be blank.");
      return;
    }
  
    const message =
      document.getElementById("adminMessage");
  
    if (message) {
      message.innerText =
        "Resetting PIN...";
    }
  
    const res =
      await apiAdminResetUserPin(
        username,
        cleanPin
      );
  
    if (message) {
      message.innerText =
        res.success
          ? "PIN reset."
          : res.error || res.message || "Unable to reset PIN.";
    }
  
  }
  
async function adminToggleUserAdmin(username, isAdmin) {
  
    const confirmed =
      window.confirm(
        isAdmin
          ? "Make " + username + " an admin?"
          : "Remove admin access from " + username + "?"
      );
  
    if (!confirmed) {
      return;
    }
  
    const message =
      document.getElementById("adminMessage");
  
    if (message) {
      message.innerText =
        "Updating user...";
    }
  
    const res =
      await apiAdminToggleUserAdmin(
        username,
        isAdmin
      );
  
    if (message) {
      message.innerText =
        res.success
          ? "User updated."
          : res.error || res.message || "Unable to update user.";
    }
  
    if (res.success) {
      await navigate("admin");
    }
  
  }

async function adminToggleUserActive(username, active) {

    const confirmed =
      window.confirm(
        active
          ? "Reactivate " + username + "?"
          : "Deactivate " + username + "? This user will no longer be able to log in."
      );
  
    if (!confirmed) {
      return;
    }
  
    const message =
      document.getElementById("adminMessage");
  
    if (message) {
      message.innerText =
        active
          ? "Reactivating user..."
          : "Deactivating user...";
    }
  
    const res =
      await apiAdminToggleUserActive(
        username,
        active
      );
  
    if (message) {
      message.innerText =
        res.success
          ? res.message
          : res.error || res.message || "Unable to update user.";
    }
  
    if (res.success) {
      await navigate("admin");
    }
  
  }

/* =========================
   SPORTS ENGINE ADMIN PANEL
========================= */

function adminSportsEscape_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}



function adminSportsKey_(
  value
) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function adminSportsInputId_(
  prefix,
  league
) {

  return (
    prefix +
    "_" +
    String(league || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );

}

function adminSportsInfoText_(
  key
) {

  const map = {
    season:
      "Season label used for this league, usually the year such as 2026. Date windows still decide when the season is active.",
    leagueOn:
      "Master league switch. When OFF, smart automation skips schedule, score, odds, snapshot, and archive-preview actions for this league.",
    seasonStart:
      "First date this league season should be considered active for schedule building and smart automation.",
    seasonEnd:
      "Last date this league season should be considered active. After this date, use End Season to stop pulls.",
    scoresOn:
      "Turns ESPN score pulls on or off for this league. If OFF, scores/clocks/finals are not refreshed for this league.",
    oddsOn:
      "Turns odds pulls and odds sync on or off for this league. Odds limits still apply when this is ON.",
    snapshots:
      "Saves period/quarter/final snapshots for history. Useful for future period bets, but OFF is faster for simple moneyline wagers.",
    pregame:
      "Minimum minutes between pregame score checks. Higher numbers reduce ESPN calls before games start.",
    live:
      "Minimum minutes between live score checks. Apps Script should normally use 5 minutes or more.",
    final:
      "How often to recheck recently final games for corrections and settlement follow-up.",
    oddsCooldown:
      "Minimum minutes between odds pulls for this league. This protects the odds API limit.",
    oddsDaily:
      "Maximum odds pulls allowed for this league in one day. Set low for leagues with many games.",
    oddsMonthly:
      "Maximum odds pulls allowed for this league in one month. This helps protect your paid/free odds API quota.",
    archiveDays:
      "How many days after completed/settled games before they appear in archive preview. Preview only does not delete rows.",
    snapshotDays:
      "How many days to keep live snapshot rows before they appear in cleanup/archive preview.",
    logDays:
      "How many days to keep live sports log rows before they appear in cleanup preview.",
    advancedWindows:
      "Optional detailed windows for preseason, regular season, postseason, tournaments, and bowls. These help smart automation avoid off-season pulls.",
    preseasonStart:
      "Start date for preseason games, if this league uses preseason.",
    preseasonEnd:
      "End date for preseason games.",
    regularStart:
      "Start date for regular season games.",
    regularEnd:
      "End date for regular season games.",
    postseasonStart:
      "Start date for postseason/playoff games.",
    postseasonEnd:
      "End date for postseason/playoff games.",
    tournamentStart:
      "Start date for tournament-style play, such as group or knockout rounds.",
    tournamentEnd:
      "End date for tournament-style play.",
    bowlStart:
      "Start date for bowl/playoff window, mainly useful for college football.",
    bowlEnd:
      "End date for bowl/playoff window.",
    defaults:
      "Fills safe default settings on this card. Click Save afterward to store them.",
    save:
      "Saves this league card settings to SportsSettings.",
    leagueState:
      "Turns this league on or off. Turning off stops schedule, scores, odds, snapshots, and smart sync for this league.",
    buildSchedule:
      "Creates a schedule/season job for this league using the selected season start and end dates.",
    previewArchive:
      "Shows what rows would be eligible for archive/cleanup. This preview does not move or delete anything."
  };

  return map[key] || "More information about this setting.";

}

function adminSportsInfoButton_(
  key,
  league,
  label
) {

  const safeKey =
    String(key || "info")
      .replace(/[^a-zA-Z0-9_\-]+/g, "_");

  const safeLeague =
    String(league || "global")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const id =
    "sportsInfo_" +
    safeLeague +
    "_" +
    safeKey;

  return `
    <span class="sports-info-wrap">
      <button
        type="button"
        class="sports-info-button"
        aria-label="Info: ${adminSportsEscape_(label || key)}"
        aria-expanded="false"
        aria-controls="${id}"
        onclick="adminToggleSportsInfo_(event, '${id}')"
      >i</button>
      <span
        id="${id}"
        class="sports-info-pop"
        hidden
      >${adminSportsEscape_(adminSportsInfoText_(key))}</span>
    </span>
  `;

}

function adminSportsLabel_(
  label,
  key,
  league
) {

  return `
    <span class="sports-setting-title">
      <span>${adminSportsEscape_(label)}</span>
      ${adminSportsInfoButton_(key, league, label)}
    </span>
  `;

}

function adminToggleSportsInfo_(
  event,
  id
) {

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const box =
    document.getElementById(id);

  const button =
    event && event.currentTarget;

  if (!box) {
    return;
  }

  const shouldShow =
    box.hasAttribute("hidden");

  box.toggleAttribute(
    "hidden",
    !shouldShow
  );

  if (button) {
    button.setAttribute(
      "aria-expanded",
      shouldShow ? "true" : "false"
    );
  }

}


function adminSportsDateValue_(value, fallback) {

  const raw =
    String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return fallback || "";

}

function adminSportsSeasonYear_(season) {

  const match =
    String(season || "").match(/(20\d{2}|19\d{2})/);

  return match
    ? match[1]
    : String(new Date().getFullYear());

}

function adminSportsGetOpenLeagueKeys_() {

  return Array.from(
    document.querySelectorAll(
      "details[data-sports-league][open]"
    )
  ).map(function(el) {
    return el.getAttribute("data-sports-league") || "";
  }).filter(Boolean);

}

function adminSportsIsChecked_(id) {

  const el =
    document.getElementById(id);

  return !!(el && el.checked);

}

function adminSportsSetCheckbox_(id, checked) {

  const el =
    document.getElementById(id);

  if (el) {
    el.checked = !!checked;
  }

}

function adminSportsNumberValue_(id, fallback) {

  const el =
    document.getElementById(id);

  if (!el || el.value === "") {
    return fallback;
  }

  return el.value;

}

function adminSportsTextValue_(id, fallback) {

  const el =
    document.getElementById(id);

  if (!el) {
    return fallback || "";
  }

  return el.value || fallback || "";

}

function adminSportsBool_(value) {

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true"
  );

}

function adminSportsMessage_(
  message,
  isError
) {

  const el =
    document.getElementById(
      "adminSportsControlMessage"
    );

  if (!el) {
    return;
  }

  el.innerText =
    message || "";

  el.classList.toggle(
    "error-card",
    !!isError
  );

}

async function adminOpenSportsControls() {

  adminSportsMessage_(
    "Opening Sports Controls...",
    false
  );

  let setupRes = null;

  try {

    setupRes =
      await apiAdminSetupSportsControls();

  } catch (err) {

    setupRes = {
      success: false,
      error: err && err.message
        ? err.message
        : String(err || "Setup check failed")
    };

  }

  if (!setupRes || setupRes.success === false) {

    adminSportsMessage_(
      (setupRes && (setupRes.error || setupRes.message))
        ? "Sports setup check failed; trying to load existing controls. " +
          (setupRes.error || setupRes.message)
        : "Sports setup check failed; trying to load existing controls.",
      true
    );

  }

  await adminLoadSportsControls();

}

async function adminSetupSportsControls() {

  await adminOpenSportsControls();

}

async function adminLoadSportsControls(options) {

  options = options || {};

  const openLeagueKeys =
    options.openLeagueKeys ||
    (options.preserveOpen ? adminSportsGetOpenLeagueKeys_() : []);

  const panel =
    document.getElementById(
      "adminSportsControlPanel"
    );

  if (!panel) {
    return;
  }

  panel.innerHTML =
    `
      <div class="admin-sub">
        Loading Sports Engine controls...
      </div>
    `;

  adminSportsMessage_(
    "Loading Sports Engine dashboard...",
    false
  );

  const res =
    await apiAdminGetSportsControlDashboard();

  if (res && res.success !== false) {

    try {
      const wagerSyncStatus =
        await apiAdminGetSmartSportsAutomationStatus();

      res.wagerAutoSyncTriggers =
        wagerSyncStatus && wagerSyncStatus.success
          ? wagerSyncStatus.triggers || []
          : [];
    } catch (err) {
      res.wagerAutoSyncTriggers = [];
    }

  }

  if (!res || res.success === false) {

    panel.innerHTML =
      `
        <div class="admin-category-card">
          <strong>Unable to load Sports Controls</strong>

          <div class="admin-sub">
            ${adminSportsEscape_(
              res && (res.error || res.message)
                ? res.error || res.message
                : "Unknown error"
            )}
          </div>
        </div>
      `;

    adminSportsMessage_(
      "Unable to load Sports Controls.",
      true
    );

    return;

  }

  panel.innerHTML =
    adminRenderSportsControlDashboard_(
      res,
      openLeagueKeys
    );

  adminSportsMessage_(
    "Sports Controls loaded.",
    false
  );

}

function adminRenderSportsControlDashboard_(
  data,
  openLeagueKeys
) {

  const sportsSettings =
    data.sportsSettings || [];

  const odds =
    data.odds || {};

  const oddsSettings =
    odds.settings || [];

  const usage =
    odds.usage || {};

  const scoreTriggers =
    data.scoreTriggers || [];

  const scoreWindowTriggers =
    data.scoreWindowTriggers || [];

  const seasonBatchTriggers =
    data.seasonBatchTriggers || [];

  const wagerAutoSyncTriggers =
    data.wagerAutoSyncTriggers || [];

  return `
    ${adminRenderSportsTriggerControls_(
      scoreTriggers,
      scoreWindowTriggers,
      seasonBatchTriggers,
      usage,
      wagerAutoSyncTriggers
    )}

    ${adminRenderScoreLeagueControls_(
      sportsSettings,
      data.leagueHealth || {},
      oddsSettings,
      openLeagueKeys || []
    )}
  `;

}

function adminRenderSportsTriggerControls_(
  scoreTriggers,
  scoreWindowTriggers,
  seasonBatchTriggers,
  usage,
  wagerAutoSyncTriggers
) {

  scoreWindowTriggers =
    scoreWindowTriggers || [];

  wagerAutoSyncTriggers =
    wagerAutoSyncTriggers || [];

  return `
    <div class="admin-category-card">

      <style>
        .sports-setting-title {
          align-items: center;
          display: inline-flex;
          gap: 5px;
          line-height: 1.2;
          min-width: 0;
          position: relative;
        }
        .sports-info-wrap {
          display: inline-flex;
          position: relative;
        }
        .sports-info-button {
          align-items: center;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(100, 116, 139, 0.55);
          border-radius: 999px;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          font-size: 11px;
          font-weight: 800;
          height: 17px;
          justify-content: center;
          line-height: 1;
          margin: 0;
          padding: 0;
          width: 17px;
        }
        .sports-info-button:hover,
        .sports-info-button[aria-expanded="true"] {
          background: #e0f2fe;
          border-color: #0284c7;
          color: #075985;
        }
        .sports-info-pop {
          background: #0f172a;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.28);
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
          left: -8px;
          line-height: 1.35;
          max-width: min(260px, 78vw);
          min-width: 210px;
          padding: 9px 10px;
          position: absolute;
          top: 24px;
          white-space: normal;
          z-index: 50;
        }
        .sports-info-pop[hidden] {
          display: none !important;
        }
        @media (max-width: 640px) {
          .sports-info-pop {
            left: auto;
            right: -12px;
            min-width: 220px;
          }
        }
      </style>

      <div class="admin-category-header">
        <div>
          <strong>Sports Automation & Usage</strong>

          <div class="admin-sub">
            Live score triggers: ${scoreTriggers.length || 0}
            ·
            Score window triggers: ${scoreWindowTriggers.length || 0}
            ·
            Wager auto-sync triggers: ${wagerAutoSyncTriggers.length || 0}
            ·
            Schedule triggers: ${seasonBatchTriggers.length || 0}
            ·
            Odds calls this month: ${usage.totalCallsUsed || 0} / ${usage.hardCap || 500}
          </div>
        </div>
      </div>

      <div class="admin-sub">
        Use <strong>Run Smart Sports Sync Now</strong> when odds, scores, schedules, or settlements look stale. Use <strong>Install Smart Sports Automation</strong> once; it runs every 5 minutes but only calls leagues that are active, inside a season window, and due by that league's limits.
      </div>

      <div class="admin-actions">

        <button
          class="admin-small-button"
          onclick="adminRunFullSportsSyncNow()"
        >
          Run Smart Sports Sync Now
        </button>

        <button
          class="admin-small-button"
          onclick="adminInstallSportsAutomation()"
        >
          Install Smart Sports Automation
        </button>

        <button
          class="admin-small-button danger"
          onclick="adminRemoveSportsAutomation()"
        >
          Remove Smart Sports Automation
        </button>

      </div>

    </div>
  `;

}


function adminRenderSportsDateField_(
  label,
  prefix,
  leagueCode,
  value,
  infoKey
) {

  return `
    <label class="admin-field" style="gap:6px;">
      ${adminSportsLabel_(label, infoKey || prefix, leagueCode)}
      <input
        type="date"
        id="${adminSportsInputId_(prefix, leagueCode)}"
        value="${adminSportsEscape_(adminSportsDateValue_(value, ""))}"
      >
    </label>
  `;

}

function adminRenderScoreLeagueControls_(
  leagues,
  leagueHealth,
  oddsSettings,
  openLeagueKeys
) {

  leagueHealth =
    leagueHealth || {};

  oddsSettings =
    oddsSettings || [];

  openLeagueKeys =
    openLeagueKeys || [];

  const healthByLeague = {};

  (leagueHealth.leagues || []).forEach(function(item) {
    healthByLeague[
      adminSportsKey_(item.league)
    ] = item;
  });

  const oddsByLeague = {};

  oddsSettings.forEach(function(item) {
    const key =
      adminSportsKey_(
        item.League || item.league
      );

    if (key) {
      oddsByLeague[key] = item;
    }
  });

  const totals =
    leagueHealth.totals || {};

  if (!leagues.length) {
    return `
      <div class="admin-category-card">
        <strong>League Smart Controls</strong>

        <div class="admin-sub">
          No SportsSettings rows found.
        </div>
      </div>
    `;
  }

  return `
    <div class="admin-category-card">

      <div class="admin-category-header">
        <div>
          <strong>League Smart Controls</strong>

          <div class="admin-sub">
            Compact per-league controls for season windows, scores, odds, schedule/season refresh, safe limits, and archive preview. Archive preview does not delete rows.
          </div>

          <div class="admin-sub">
            Live scores: ${totals.liveScores || 0}
            · Odds rows: ${totals.liveOdds || 0}
            · Snapshots: ${totals.liveSnapshots || 0}
            · Logs: ${totals.logs || 0}
            · Score archive candidates: ${totals.scoreArchiveCandidates || 0}
          </div>
        </div>
      </div>

      <div class="admin-actions">
        <button
          class="admin-small-button secondary"
          onclick="adminRepairSportsScoreDisplay()"
        >
          Repair Records / Clocks
        </button>
      </div>

      <div class="admin-list">

        ${leagues.map(league => {

          const rawLeague =
            String(league.league || "").trim();

          const leagueCode =
            adminSportsEscape_(rawLeague);

          const leagueKey =
            adminSportsKey_(rawLeague);

          const sport =
            adminSportsEscape_(
              league.sport
            );

          const health =
            healthByLeague[leagueKey] || {};

          const oddsUsage =
            oddsByLeague[leagueKey] || {};

          const enabled =
            adminSportsBool_(
              league.enabled
            );

          const seasonActive =
            league.seasonActive === undefined
              ? true
              : adminSportsBool_(league.seasonActive);

          const oddsEnabled =
            league.oddsEnabled === undefined
              ? true
              : adminSportsBool_(league.oddsEnabled);

          const snapshotsEnabled =
            adminSportsBool_(league.savePeriodSnapshots);

          const forceOpen =
            openLeagueKeys.indexOf(leagueKey) !== -1;

          const openAttr =
            forceOpen ? "open" : "";

          const healthText =
            adminSportsEscape_(health.health || "Good");

          const oddsToday =
            oddsUsage.CallsToday || oddsUsage.callsToday || 0;

          const oddsMonth =
            oddsUsage.CallsThisMonth || oddsUsage.callsThisMonth || 0;

          const oddsBudget =
            oddsUsage.MonthlyBudget || oddsUsage.monthlyBudget || league.oddsMonthlyMaxPulls || 30;

          const seasonLabel =
            seasonActive ? "League ON" : "League OFF";

          const leagueOn =
            seasonActive;

          const controlsDisabled =
            leagueOn ? "" : "disabled";

          const seasonYear =
            adminSportsSeasonYear_(
              league.season || health.season
            );

          const seasonStartDate =
            adminSportsDateValue_(
              league.seasonStartDate || health.seasonStartDate,
              seasonYear + "-01-01"
            );

          const seasonEndDate =
            adminSportsDateValue_(
              league.seasonEndDate || health.seasonEndDate,
              seasonYear + "-12-31"
            );

          return `
            <details
              class="admin-user-card"
              data-sports-league="${leagueKey}"
              ${openAttr}
            >

              <summary class="admin-user-header" style="cursor:pointer; gap:10px; align-items:flex-start;">

                <div style="min-width:0; flex:1;">
                  <strong>
                    ${leagueCode.toUpperCase()} ${league.season ? "· " + adminSportsEscape_(league.season) : ""}
                  </strong>

                  <div class="admin-sub">
                    ${sport}
                    · ${seasonLabel}
                    · Scores ${enabled ? "ON" : "OFF"}
                    · Odds ${oddsEnabled ? "ON" : "OFF"}
                    · API ${oddsToday}/${oddsMonth}/${oddsBudget}
                  </div>

                  <div class="admin-sub">
                    Scores ${health.liveScores || 0}
                    · Odds rows ${health.liveOdds || 0}
                    · Snapshots ${health.liveSnapshots || 0}
                    · Ready archive ${health.scoreArchiveCandidates || 0}
                    · ${healthText}
                  </div>
                </div>

                <div class="admin-pill ${leagueOn && enabled ? "admin" : "inactive"}" style="white-space:nowrap;">
                  ${leagueOn && enabled ? "Active" : "Paused"}
                </div>

              </summary>

              <div class="admin-sub" style="margin-top:8px;">
                Games ${health.liveGames || 0}
                · Scores ${health.liveScores || 0}
                · Odds ${health.liveOdds || 0}
                · Logs ${health.logs || 0}
                · Snap cleanup ${health.snapshotArchiveCandidates || 0}
                · Log trim ${health.logTrimCandidates || 0}
                · Last score ${adminSportsEscape_(health.lastScoreRefresh || "") || "Never"}
                · Last odds ${adminSportsEscape_(health.lastOddsRefresh || oddsUsage.LastRefreshStatus || "") || "Never"}
              </div>

              <div
                class="admin-control-grid"
                style="grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap:8px; margin-top:10px;"
              >

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Season", "season", leagueCode)}
                  <input
                    type="text"
                    id="${adminSportsInputId_("sportsSeason", leagueCode)}"
                    value="${adminSportsEscape_(league.season || health.season || new Date().getFullYear())}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("League ON", "leagueOn", leagueCode)}
                  <input
                    type="checkbox"
                    id="${adminSportsInputId_("sportsSeasonActive", leagueCode)}"
                    ${seasonActive ? "checked" : ""}
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Start", "seasonStart", leagueCode)}
                  <input
                    type="date"
                    id="${adminSportsInputId_("sportsSeasonStart", leagueCode)}"
                    value="${adminSportsEscape_(seasonStartDate)}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("End", "seasonEnd", leagueCode)}
                  <input
                    type="date"
                    id="${adminSportsInputId_("sportsSeasonEnd", leagueCode)}"
                    value="${adminSportsEscape_(seasonEndDate)}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Scores ON", "scoresOn", leagueCode)}
                  <input
                    type="checkbox"
                    id="${adminSportsInputId_("sportsScoresEnabled", leagueCode)}"
                    ${controlsDisabled}
                    ${enabled ? "checked" : ""}
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Odds ON", "oddsOn", leagueCode)}
                  <input
                    type="checkbox"
                    id="${adminSportsInputId_("sportsOddsEnabled", leagueCode)}"
                    ${controlsDisabled}
                    ${oddsEnabled ? "checked" : ""}
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Snapshots", "snapshots", leagueCode)}
                  <input
                    type="checkbox"
                    id="${adminSportsInputId_("sportsSnapshots", leagueCode)}"
                    ${controlsDisabled}
                    ${snapshotsEnabled ? "checked" : ""}
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Pregame min", "pregame", leagueCode)}
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    id="${adminSportsInputId_("sportsPre", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.pollPreGameMinutes || 60}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Live min", "live", leagueCode)}
                  <input
                    type="number"
                    min="5"
                    max="60"
                    id="${adminSportsInputId_("sportsLive", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.pollLiveMinutes || 5}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Final min", "final", leagueCode)}
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    id="${adminSportsInputId_("sportsFinal", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.pollFinalMinutes || 120}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Odds cool min", "oddsCooldown", leagueCode)}
                  <input
                    type="number"
                    min="30"
                    max="10080"
                    id="${adminSportsInputId_("sportsOddsCooldown", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.oddsCooldownMinutes || 240}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Odds/day", "oddsDaily", leagueCode)}
                  <input
                    type="number"
                    min="0"
                    max="24"
                    id="${adminSportsInputId_("sportsOddsDaily", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.oddsDailyMaxPulls || 2}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Odds/month", "oddsMonthly", leagueCode)}
                  <input
                    type="number"
                    min="0"
                    max="500"
                    id="${adminSportsInputId_("sportsOddsMonthly", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.oddsMonthlyMaxPulls || 30}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Archive days", "archiveDays", leagueCode)}
                  <input
                    type="number"
                    min="1"
                    max="365"
                    id="${adminSportsInputId_("sportsArchiveDays", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.archiveAfterDays || health.archiveAfterDays || 14}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Snap days", "snapshotDays", leagueCode)}
                  <input
                    type="number"
                    min="1"
                    max="365"
                    id="${adminSportsInputId_("sportsSnapshotDays", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.keepSnapshotsDays || health.keepSnapshotsDays || 14}"
                  >
                </label>

                <label class="admin-field" style="gap:6px;">
                  ${adminSportsLabel_("Log days", "logDays", leagueCode)}
                  <input
                    type="number"
                    min="1"
                    max="365"
                    id="${adminSportsInputId_("sportsLogDays", leagueCode)}"
                    ${controlsDisabled}
                    value="${league.keepLogsDays || health.keepLogsDays || 14}"
                  >
                </label>

              </div>

              <details class="admin-sub" style="margin-top:8px;">
                <summary style="cursor:pointer;">Advanced season windows ${adminSportsInfoButton_("advancedWindows", leagueCode, "Advanced season windows")}</summary>

                <div
                  class="admin-control-grid"
                  style="grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap:8px; margin-top:8px;"
                >
                  ${adminRenderSportsDateField_("Pre start", "sportsPreseasonStart", leagueCode, league.preseasonStartDate || health.preseasonStartDate, "preseasonStart")}
                  ${adminRenderSportsDateField_("Pre end", "sportsPreseasonEnd", leagueCode, league.preseasonEndDate || health.preseasonEndDate, "preseasonEnd")}
                  ${adminRenderSportsDateField_("Reg start", "sportsRegularStart", leagueCode, league.regularSeasonStartDate || health.regularSeasonStartDate, "regularStart")}
                  ${adminRenderSportsDateField_("Reg end", "sportsRegularEnd", leagueCode, league.regularSeasonEndDate || health.regularSeasonEndDate, "regularEnd")}
                  ${adminRenderSportsDateField_("Post start", "sportsPostseasonStart", leagueCode, league.postseasonStartDate || health.postseasonStartDate, "postseasonStart")}
                  ${adminRenderSportsDateField_("Post end", "sportsPostseasonEnd", leagueCode, league.postseasonEndDate || health.postseasonEndDate, "postseasonEnd")}
                  ${adminRenderSportsDateField_("Tournament start", "sportsTournamentStart", leagueCode, league.tournamentStartDate || health.tournamentStartDate, "tournamentStart")}
                  ${adminRenderSportsDateField_("Tournament end", "sportsTournamentEnd", leagueCode, league.tournamentEndDate || health.tournamentEndDate, "tournamentEnd")}
                  ${adminRenderSportsDateField_("Bowl start", "sportsBowlStart", leagueCode, league.bowlStartDate || health.bowlStartDate, "bowlStart")}
                  ${adminRenderSportsDateField_("Bowl end", "sportsBowlEnd", leagueCode, league.bowlEndDate || health.bowlEndDate, "bowlEnd")}
                </div>
              </details>

              <div class="admin-actions" style="gap:6px; flex-wrap:wrap;">

                <button
                  class="admin-small-button secondary"
                  onclick="adminApplySportsLeagueDefaults('${leagueCode}')"
                >
                  Defaults
                </button>

                <button
                  class="admin-small-button"
                  onclick="adminSaveSportsScoreLeagueSettings('${leagueCode}', '${sport}')"
                >
                  Save
                </button>

                <button
                  class="admin-small-button ${leagueOn ? "danger" : "secondary"}"
                  onclick="adminSetSportsLeagueSeasonState('${leagueCode}', '${sport}', ${leagueOn ? "false" : "true"})"
                >
                  ${leagueOn ? "Turn League Off" : "Turn League On"}
                </button>

                <button
                  class="admin-small-button secondary"
                  ${controlsDisabled}
                  onclick="adminCreateSportsLeagueSeasonJobs('${leagueCode}', '${sport}')"
                >
                  Build Schedule
                </button>

                <button
                  class="admin-small-button secondary"
                  ${controlsDisabled}
                  onclick="adminPreviewSportsLeagueArchive('${leagueCode}')"
                >
                  Preview Archive
                </button>

              </div>

            </details>
          `;

        }).join("")}

      </div>

    </div>
  `;

}

function adminRenderScheduleControls_() {

  return `
    <div class="admin-category-card">

      <div class="admin-category-header">
        <div>
          <strong>Schedule / Season Loader</strong>

          <div class="admin-sub">
            Create and run season schedule batch jobs.
          </div>
        </div>
      </div>

      <div class="admin-control-grid">

        <label class="admin-field">
          <span>Start Date</span>

          <input
            type="date"
            id="sportsScheduleStartDate"
            value="2026-01-01"
          >
        </label>

        <label class="admin-field">
          <span>End Date</span>

          <input
            type="date"
            id="sportsScheduleEndDate"
            value="2026-12-31"
          >
        </label>

        <label class="admin-field">
          <span>Batch Days</span>

          <input
            type="number"
            id="sportsScheduleBatchDays"
            value="2"
            min="1"
            max="7"
          >
        </label>

      </div>

      <div class="admin-actions">

        <button
          class="admin-small-button"
          onclick="adminCreateSportsSeasonJobs()"
        >
          Create Season Jobs
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminRunSportsSeasonBatch()"
        >
          Run Batch Now
        </button>

        <button
          class="admin-small-button"
          onclick="adminInstallSportsSeasonBatchTrigger()"
        >
          Install Schedule Trigger
        </button>

        <button
          class="admin-small-button danger"
          onclick="adminRemoveSportsSeasonBatchTrigger()"
        >
          Remove Schedule Trigger
        </button>

      </div>

    </div>
  `;

}

function adminRenderOddsControls_(
  oddsSettings,
  usage
) {

  if (!oddsSettings.length) {
    return `
      <div class="admin-category-card">
        <strong>Odds Controls</strong>

        <div class="admin-sub">
          No SportsOddsSettings rows found.
        </div>
      </div>
    `;
  }

  return `
    <div class="admin-category-card">

      <div class="admin-category-header">
        <div>
          <strong>Odds Controls</strong>

          <div class="admin-sub">
            Monthly usage: ${usage.totalCallsUsed || 0} / ${usage.hardCap || 500}
            ·
            Auto refresh should stay limited for the 500/month plan.
          </div>
        </div>
      </div>

      <div class="admin-actions">

        <button
          class="admin-small-button secondary"
          onclick="adminRunSportsOddsHybridRefresh()"
        >
          Run Hybrid Odds Refresh Now
        </button>

      </div>

      <div class="admin-list">

        ${oddsSettings.map(setting => {

          const league =
            adminSportsEscape_(
              setting.League || setting.league
            );

          const oddsEnabled =
            adminSportsBool_(
              setting.OddsEnabled
            );

          const autoEnabled =
            adminSportsBool_(
              setting.AutoRefreshEnabled
            );

          const manualEnabled =
            adminSportsBool_(
              setting.ManualRefreshEnabled
            );

          return `
            <div class="admin-user-card">

              <div class="admin-user-header">

                <div>
                  <strong>
                    ${league}
                  </strong>

                  <div class="admin-sub">
                    Auto: ${autoEnabled ? "ON" : "OFF"}
                    ·
                    Manual: ${manualEnabled ? "ON" : "OFF"}
                    ·
                    Calls today: ${setting.CallsToday || 0}
                    ·
                    Month: ${setting.CallsThisMonth || 0}/${setting.MonthlyBudget || 0}
                    ·
                    Last: ${setting.LastRefreshStatus || "NEVER"}
                  </div>
                </div>

                <div class="admin-pill ${oddsEnabled ? "admin" : "inactive"}">
                  ${oddsEnabled ? "Odds ON" : "Odds OFF"}
                </div>

              </div>

              <div class="admin-actions">

                <button
                  class="admin-small-button ${oddsEnabled ? "danger" : "secondary"}"
                  onclick="adminToggleSportsOddsEnabled('${league}', ${oddsEnabled ? "false" : "true"})"
                >
                  ${oddsEnabled ? "Disable Odds" : "Enable Odds"}
                </button>

                <button
                  class="admin-small-button ${autoEnabled ? "danger" : "secondary"}"
                  onclick="adminToggleSportsOddsAuto('${league}', ${autoEnabled ? "false" : "true"})"
                >
                  ${autoEnabled ? "Auto Off" : "Auto On"}
                </button>

                <button
                  class="admin-small-button secondary"
                  onclick="adminRefreshSportsOddsLeague('${league}')"
                >
                  Refresh Now
                </button>

              </div>

            </div>
          `;

        }).join("")}

      </div>

    </div>
  `;

}

/* =========================
   SPORTS ADMIN ACTIONS
========================= */


async function adminSaveSportsScoreLeagueSettings(
  league,
  sport
) {

  const preEl =
    document.getElementById(
      adminSportsInputId_("sportsPre", league)
    );

  const liveEl =
    document.getElementById(
      adminSportsInputId_("sportsLive", league)
    );

  const finalEl =
    document.getElementById(
      adminSportsInputId_("sportsFinal", league)
    );

  const snapshotsEl =
    document.getElementById(
      adminSportsInputId_("sportsSnapshots", league)
    );

  const scoresEnabledEl =
    document.getElementById(
      adminSportsInputId_("sportsScoresEnabled", league)
    );

  const seasonActiveEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonActive", league)
    );

  const seasonEl =
    document.getElementById(
      adminSportsInputId_("sportsSeason", league)
    );

  const oddsEnabledEl =
    document.getElementById(
      adminSportsInputId_("sportsOddsEnabled", league)
    );

  const oddsCooldownEl =
    document.getElementById(
      adminSportsInputId_("sportsOddsCooldown", league)
    );

  const oddsDailyEl =
    document.getElementById(
      adminSportsInputId_("sportsOddsDaily", league)
    );

  const oddsMonthlyEl =
    document.getElementById(
      adminSportsInputId_("sportsOddsMonthly", league)
    );

  const archiveDaysEl =
    document.getElementById(
      adminSportsInputId_("sportsArchiveDays", league)
    );

  const snapshotDaysEl =
    document.getElementById(
      adminSportsInputId_("sportsSnapshotDays", league)
    );

  const logDaysEl =
    document.getElementById(
      adminSportsInputId_("sportsLogDays", league)
    );

  function leagueDateValue_(prefix) {
    const el =
      document.getElementById(
        adminSportsInputId_(prefix, league)
      );

    return el ? el.value : "";
  }

  adminSportsMessage_(
    "Saving league settings for " + league + "...",
    false
  );

  const res =
    await apiAdminUpdateSportsLeagueSetting(
      league,
      scoresEnabledEl ? scoresEnabledEl.checked : true,
      {
        sport: sport,
        pollPreGameMinutes: preEl ? preEl.value : 60,
        pollLiveMinutes: liveEl ? liveEl.value : 5,
        pollFinalMinutes: finalEl ? finalEl.value : 120,
        savePeriodSnapshots: snapshotsEl ? snapshotsEl.checked : false,
        season: seasonEl ? seasonEl.value : "",
        seasonActive: seasonActiveEl ? seasonActiveEl.checked : true,
        seasonStartDate: leagueDateValue_("sportsSeasonStart"),
        seasonEndDate: leagueDateValue_("sportsSeasonEnd"),
        preseasonStartDate: leagueDateValue_("sportsPreseasonStart"),
        preseasonEndDate: leagueDateValue_("sportsPreseasonEnd"),
        regularSeasonStartDate: leagueDateValue_("sportsRegularStart"),
        regularSeasonEndDate: leagueDateValue_("sportsRegularEnd"),
        postseasonStartDate: leagueDateValue_("sportsPostseasonStart"),
        postseasonEndDate: leagueDateValue_("sportsPostseasonEnd"),
        tournamentStartDate: leagueDateValue_("sportsTournamentStart"),
        tournamentEndDate: leagueDateValue_("sportsTournamentEnd"),
        bowlStartDate: leagueDateValue_("sportsBowlStart"),
        bowlEndDate: leagueDateValue_("sportsBowlEnd"),
        oddsEnabled: oddsEnabledEl ? oddsEnabledEl.checked : true,
        oddsCooldownMinutes: oddsCooldownEl ? oddsCooldownEl.value : 240,
        oddsDailyMaxPulls: oddsDailyEl ? oddsDailyEl.value : 2,
        oddsMonthlyMaxPulls: oddsMonthlyEl ? oddsMonthlyEl.value : 30,
        archiveAfterDays: archiveDaysEl ? archiveDaysEl.value : 14,
        keepSnapshotsDays: snapshotDaysEl ? snapshotDaysEl.value : 14,
        keepLogsDays: logDaysEl ? logDaysEl.value : 14
      }
    );

  adminSportsMessage_(
    res && res.success
      ? "Smart poll settings saved."
      : (res && (res.error || res.message)) ||
        "Unable to save smart poll settings.",
    !(res && res.success)
  );

  if (res && res.success) {
    await adminLoadSportsControls({ preserveOpen: true });
  }

}

function adminApplySportsLeagueDefaults(
  league
) {

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsSeasonActive", league),
    true
  );

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsScoresEnabled", league),
    true
  );

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsOddsEnabled", league),
    true
  );

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsSnapshots", league),
    false
  );

  const seasonEl =
    document.getElementById(
      adminSportsInputId_("sportsSeason", league)
    );

  const seasonYear =
    adminSportsSeasonYear_(
      seasonEl ? seasonEl.value : ""
    );

  const seasonStartEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonStart", league)
    );

  const seasonEndEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonEnd", league)
    );

  if (seasonStartEl) {
    seasonStartEl.value = seasonYear + "-01-01";
  }

  if (seasonEndEl) {
    seasonEndEl.value = seasonYear + "-12-31";
  }

  const defaults = {
    sportsPre: 60,
    sportsLive: 5,
    sportsFinal: 120,
    sportsOddsCooldown: 240,
    sportsOddsDaily: 2,
    sportsOddsMonthly: 30,
    sportsArchiveDays: 14,
    sportsSnapshotDays: 14,
    sportsLogDays: 14
  };

  Object.keys(defaults).forEach(function(prefix) {
    const el =
      document.getElementById(
        adminSportsInputId_(prefix, league)
      );

    if (el) {
      el.value = defaults[prefix];
    }
  });

  adminSportsMessage_(
    "Default smart settings filled for " + league + ". Click Save to store them.",
    false
  );

}

async function adminSetSportsLeagueSeasonState(
  league,
  sport,
  active
) {

  const action =
    active ? "Turn on" : "Turn off";

  const ok =
    window.confirm(
      action +
      " league " +
      league +
      "? This " +
      (active
        ? "turns season, score pulling, and odds pulling back on."
        : "turns season, score pulling, odds pulling, and snapshots off so it stops using calls.")
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    action + "ing season for " + league + "...",
    false
  );

  const res =
    await apiAdminUpdateSportsLeagueSetting(
      league,
      active,
      {
        sport: sport,
        seasonActive: active,
        oddsEnabled: active,
        savePeriodSnapshots: false
      }
    );

  adminSportsMessage_(
    res && res.success
      ? (active ? "Season started." : "Season ended. Scores, odds, and snapshots are off for this league.")
      : (res && (res.error || res.message)) ||
        "Unable to update season state.",
    !(res && res.success)
  );

  if (res && res.success) {
    await adminLoadSportsControls({ preserveOpen: true });
  }

}

async function adminToggleSportsScoreLeague(
  league,
  enabled
) {

  const ok =
    window.confirm(
      (enabled ? "Enable" : "Disable") +
      " score pulling for " +
      league +
      "?"
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Updating " + league + " score setting...",
    false
  );

  const res =
    await apiAdminUpdateSportsLeagueSetting(
      league,
      enabled
    );

  adminSportsMessage_(
    res && res.success
      ? "Score setting updated."
      : (res && (res.error || res.message)) ||
        "Unable to update score setting.",
    !(res && res.success)
  );

  if (res && res.success) {
    await adminLoadSportsControls({ preserveOpen: true });
  }

}

async function adminInstallSportsScoresTrigger() {

  const res =
    await apiAdminInstallSportsScoresTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Score trigger installed."
      : (res && (res.error || res.message)) ||
        "Unable to install score trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRemoveSportsScoresTrigger() {

  const res =
    await apiAdminRemoveSportsScoresTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Score trigger removed."
      : (res && (res.error || res.message)) ||
        "Unable to remove score trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRefreshSportsScoresNow() {

  adminSportsMessage_(
    "Refreshing current ESPN scoreboards...",
    false
  );

  const res =
    await apiAdminRefreshSportsScoresNow();

  adminSportsMessage_(
    res && res.success
      ? "Current score refresh complete. Games fetched: " +
        (res.gamesFetched || 0)
      : (res && (res.error || res.message || res.reason)) ||
        "Current score refresh failed.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRunFullSportsSyncNow() {

  adminSportsMessage_(
    "Running smart sports sync for due wager leagues..."
  );

  try {

    const res =
      await apiAdminRunSportsFullSync();

    if (!res || res.success === false) {
      throw new Error(
        (res && (res.error || res.message)) ||
        "Full sports sync failed."
      );
    }

    const sync =
      res.sync || res || {};

    if (res.queued || sync.queued) {

      const immediateFinalizer =
        res.immediateFinalizer ||
        sync.preFinalizer ||
        {};

      adminSportsMessage_(
        "Smart Sports Sync queued. Finished-game finalizer ran now: finalized " +
        (immediateFinalizer.finalized || 0) +
        ", checked " +
        (immediateFinalizer.checked || 0) +
        ". Source scores/odds will finish in the background shortly; reload Sports Controls in a minute.",
        false
      );

      await adminLoadSportsControls({ preserveOpen: true });
      return;

    }

    const results =
      sync.results || [];

    const totals =
      results.reduce(function(acc, item) {
        const refresh = item.refresh || {};
        const autoOdds = item.autoOdds || {};
        const settle = item.settle || {};

        acc.updated += refresh.updated || 0;
        acc.oddsUpdated += autoOdds.updatedRows || 0;
        acc.protected += autoOdds.protected || 0;
        acc.settled += settle.settled || 0;
        acc.skipped += settle.skipped || 0;

        return acc;
      }, {
        updated: 0,
        oddsUpdated: 0,
        protected: 0,
        settled: 0,
        skipped: 0
      });

    const preFinalizer =
      sync.preFinalizer || {};

    const postFinalizer =
      sync.postFinalizer || {};

    const finalized =
      (preFinalizer.finalized || 0) +
      (postFinalizer.finalized || 0);

    adminSportsMessage_(
      "Smart sports sync complete. Score rows: " +
      totals.updated +
      ", odds rows: " +
      totals.oddsUpdated +
      ", protected odds: " +
      totals.protected +
      ", settled from engine: " +
      totals.settled +
      ", finalized from Categories: " +
      finalized +
      ", skipped settlements: " +
      totals.skipped,
      false
    );

    await adminLoadSportsControls({ preserveOpen: true });

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Unable to run full sports sync.",
      true
    );

  }

}

async function adminInstallSportsAutomation() {

  adminSportsMessage_(
    "Installing smart sports automation..."
  );

  try {

    const res =
      await apiAdminInstallSmartSportsAutomation();

    adminSportsMessage_(
      res && res.success
        ? "Smart Sports Automation installed. One trigger runs every 5 minutes and only calls due leagues."
        : (res && (res.error || res.message)) ||
          "Unable to install smart sports automation.",
      !(res && res.success)
    );

    await adminLoadSportsControls({ preserveOpen: true });

    return res;

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Unable to install smart sports automation.",
      true
    );

  }

}

async function adminRemoveSportsAutomation() {

  if (!confirm("Remove smart sports automation trigger?")) {
    return;
  }

  adminSportsMessage_(
    "Removing smart sports automation trigger..."
  );

  try {

    const res =
      await apiAdminRemoveSmartSportsAutomation();

    adminSportsMessage_(
      res && res.success
        ? "Smart Sports Automation removed."
        : (res && (res.error || res.message)) ||
          "Unable to remove smart sports automation.",
      !(res && res.success)
    );

    await adminLoadSportsControls({ preserveOpen: true });

    return res;

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Unable to remove smart sports automation.",
      true
    );

  }

}

async function adminRefreshSportsScoresWindow() {

  const ok =
    window.confirm(
      "Refresh recent and upcoming scores now? This checks 2 days back and 7 days forward for enabled leagues."
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Refreshing recent/upcoming ESPN score window...",
    false
  );

  const res =
    await apiAdminRefreshSportsScoresWindow(
      2,
      7
    );

  adminSportsMessage_(
    res && res.success
      ? "Score window refresh complete. Unique games: " +
        (res.uniqueGames || 0) +
        ", fetched rows: " +
        (res.gamesFetched || 0)
      : (res && (res.error || res.message || res.reason)) ||
        "Score window refresh failed.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminInstallSportsScoresWindowTrigger() {

  const res =
    await apiAdminInstallSportsScoresWindowTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Score window trigger installed."
      : (res && (res.error || res.message)) ||
        "Unable to install score window trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRemoveSportsScoresWindowTrigger() {

  const res =
    await apiAdminRemoveSportsScoresWindowTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Score window trigger removed."
      : (res && (res.error || res.message)) ||
        "Unable to remove score window trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminInstallSportsWagerAutoSyncTrigger() {

  const res =
    await apiAdminInstallSportsWagerAutoSyncTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Wager auto-sync trigger installed."
      : (res && (res.error || res.message)) ||
        "Unable to install wager auto-sync trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRemoveSportsWagerAutoSyncTrigger() {

  const res =
    await apiAdminRemoveSportsWagerAutoSyncTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Wager auto-sync trigger removed."
      : (res && (res.error || res.message)) ||
        "Unable to remove wager auto-sync trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminCreateSportsSeasonJobs() {

  const startDate =
    document
      .getElementById("sportsScheduleStartDate")
      .value;

  const endDate =
    document
      .getElementById("sportsScheduleEndDate")
      .value;

  const batchDays =
    document
      .getElementById("sportsScheduleBatchDays")
      .value;

  if (!startDate || !endDate) {
    alert("Start date and end date are required.");
    return;
  }

  const ok =
    window.confirm(
      "Create season schedule jobs from " +
      startDate +
      " to " +
      endDate +
      "?"
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Creating season jobs...",
    false
  );

  const res =
    await apiAdminCreateSportsSeasonJobs(
      startDate,
      endDate,
      batchDays
    );

  adminSportsMessage_(
    res && res.success
      ? "Season jobs created/updated."
      : (res && (res.error || res.message)) ||
        "Unable to create season jobs.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRunSportsSeasonBatch() {

  const ok =
    window.confirm(
      "Run one sports season schedule batch now?"
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Running season batch...",
    false
  );

  const res =
    await apiAdminRunSportsSeasonBatch();

  adminSportsMessage_(
    res && res.success
      ? "Season batch complete."
      : (res && (res.error || res.message)) ||
        "Season batch failed.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminInstallSportsSeasonBatchTrigger() {

  const res =
    await apiAdminInstallSportsSeasonBatchTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Schedule batch trigger installed."
      : (res && (res.error || res.message)) ||
        "Unable to install schedule trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRemoveSportsSeasonBatchTrigger() {

  const res =
    await apiAdminRemoveSportsSeasonBatchTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Schedule batch trigger removed."
      : (res && (res.error || res.message)) ||
        "Unable to remove schedule trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminToggleSportsOddsEnabled(
  league,
  enabled
) {

  const ok =
    window.confirm(
      (enabled ? "Enable" : "Disable") +
      " odds for " +
      league +
      "?"
    );

  if (!ok) {
    return;
  }

  const res =
    await apiAdminUpdateSportsOddsSetting(
      league,
      {
        oddsEnabled:
          enabled
      }
    );

  adminSportsMessage_(
    res && res.success
      ? "Odds setting updated."
      : (res && (res.error || res.message)) ||
        "Unable to update odds setting.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminToggleSportsOddsAuto(
  league,
  enabled
) {

  const ok =
    window.confirm(
      (enabled ? "Enable" : "Disable") +
      " auto odds refresh for " +
      league +
      "?"
    );

  if (!ok) {
    return;
  }

  const res =
    await apiAdminUpdateSportsOddsSetting(
      league,
      {
        autoRefreshEnabled:
          enabled
      }
    );

  adminSportsMessage_(
    res && res.success
      ? "Auto odds setting updated."
      : (res && (res.error || res.message)) ||
        "Unable to update auto odds setting.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRefreshSportsOddsLeague(
  league
) {

  const ok =
    window.confirm(
      "Refresh odds for " +
      league +
      " now? This may use 1 Odds API call."
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Refreshing odds for " + league + "...",
    false
  );

  const res =
    await apiAdminRefreshSportsOddsLeague(
      league
    );

  adminSportsMessage_(
    res && res.success
      ? "Odds refresh complete."
      : (res && (res.error || res.message || res.reason)) ||
        "Odds refresh failed.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRunSportsOddsHybridRefresh() {

  const ok =
    window.confirm(
      "Run hybrid odds refresh now? This may use Odds API calls for enabled auto leagues only."
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Running hybrid odds refresh...",
    false
  );

  const res =
    await apiAdminRunSportsOddsHybridRefresh();

  adminSportsMessage_(
    res && res.success
      ? "Hybrid odds refresh complete."
      : (res && (res.error || res.message)) ||
        "Hybrid odds refresh failed.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminInstallSportsOddsHybridTrigger() {

  const res =
    await apiAdminInstallSportsOddsHybridTrigger(8);

  adminSportsMessage_(
    res && res.success
      ? "Hybrid odds trigger installed."
      : (res && (res.error || res.message)) ||
        "Unable to install hybrid odds trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

async function adminRemoveSportsOddsHybridTrigger() {

  const res =
    await apiAdminRemoveSportsOddsHybridTrigger();

  adminSportsMessage_(
    res && res.success
      ? "Hybrid odds trigger removed."
      : (res && (res.error || res.message)) ||
        "Unable to remove hybrid odds trigger.",
    !(res && res.success)
  );

  await adminLoadSportsControls({ preserveOpen: true });

}  

async function adminCreateSportsLeagueSeasonJobs(
  league,
  sport
) {

  const seasonEl =
    document.getElementById(
      adminSportsInputId_("sportsSeason", league)
    );

  const startEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonStart", league)
    );

  const endEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonEnd", league)
    );

  const season =
    seasonEl && seasonEl.value
      ? seasonEl.value
      : String(new Date().getFullYear());

  const year =
    adminSportsSeasonYear_(season);

  const startDate =
    startEl && startEl.value
      ? startEl.value
      : year + "-01-01";

  const endDate =
    endEl && endEl.value
      ? endEl.value
      : year + "-12-31";

  const ok =
    window.confirm(
      "Build schedule job for " +
      league +
      " from " +
      startDate +
      " to " +
      endDate +
      "? This creates a league-specific season job and does not pull odds."
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Creating schedule job for " + league + "...",
    false
  );

  const res =
    await apiAdminCreateSportsSeasonJobs(
      startDate,
      endDate,
      2,
      {
        league: league,
        sport: sport,
        season: season,
        seasonName: league + " " + season
      }
    );

  adminSportsMessage_(
    res && res.success
      ? (res.message || ("Schedule job ready for " + league + ". New jobs: " + (res.newJobs || 0)))
      : (res && (res.error || res.message)) ||
        "Unable to create schedule job.",
    !(res && res.success)
  );

  if (res && res.success) {
    await adminLoadSportsControls({ preserveOpen: true });
  }

}

async function adminPreviewSportsLeagueArchive(
  league
) {

  adminSportsMessage_(
    "Building safe archive preview for " + league + "...",
    false
  );

  const res =
    await apiAdminPreviewSportsLeagueArchive(
      league
    );

  if (!res || res.success === false) {
    adminSportsMessage_(
      (res && (res.error || res.message)) ||
      "Unable to build archive preview.",
      true
    );
    return;
  }

  const item =
    res.leagues && res.leagues.length
      ? res.leagues[0]
      : null;

  if (!item) {
    adminSportsMessage_(
      "No archive preview rows found for " + league + ".",
      false
    );
    return;
  }

  adminSportsMessage_(
    "Archive preview for " + league + ": scores " +
      (item.scoreArchiveCandidates || 0) +
      ", snapshots " +
      (item.snapshotArchiveCandidates || 0) +
      ", logs " +
      (item.logTrimCandidates || 0) +
      ". No rows were moved or deleted.",
    false
  );

}

async function adminRepairSportsScoreDisplay() {

  adminSportsMessage_(
    "Repairing bad record and clock display values...",
    false
  );

  const res =
    await apiAdminRepairSportsScoreDisplay();

  adminSportsMessage_(
    res && res.success
      ? "Record/clock repair complete. Rows repaired: " +
        (res.repaired || 0)
      : (res && (res.error || res.message)) ||
        "Unable to repair records/clocks.",
    !(res && res.success)
  );

  if (res && res.success) {
    await adminLoadSportsControls({ preserveOpen: true });
  }

}
