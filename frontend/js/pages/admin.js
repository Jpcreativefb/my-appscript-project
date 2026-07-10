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

async function adminLoadSportsControls() {

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
      res
    );

  adminSportsMessage_(
    "Sports Controls loaded.",
    false
  );

}

function adminRenderSportsControlDashboard_(
  data
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
      sportsSettings
    )}

    ${adminRenderScheduleControls_()}

    ${adminRenderOddsControls_(
      oddsSettings,
      usage
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
        Use <strong>Run Smart Sports Sync Now</strong> when odds, scores, or settlements look stale. Use <strong>Install Smart Sports Automation</strong> once; it runs every 5 minutes but only calls leagues that have due wager games.
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

function adminRenderScoreLeagueControls_(
  leagues
) {

  if (!leagues.length) {
    return `
      <div class="admin-category-card">
        <strong>Score League Controls</strong>

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
          <strong>Score League Controls</strong>

          <div class="admin-sub">
            Turn ESPN score pulling on/off per league.
          </div>
        </div>
      </div>

      <div class="admin-list">

        ${leagues.map(league => {

          const leagueCode =
            adminSportsEscape_(
              league.league
            );

          const sport =
            adminSportsEscape_(
              league.sport
            );

          const enabled =
            adminSportsBool_(
              league.enabled
            );

          return `
            <div class="admin-user-card">

              <div class="admin-user-header">

                <div>
                  <strong>
                    ${leagueCode.toUpperCase()}
                  </strong>

                  <div class="admin-sub">
                    ${sport}
                    ·
                    Pregame: ${league.pollPreGameMinutes || 60} min
                    ·
                    Live: ${league.pollLiveMinutes || 5} min
                    ·
                    Final: ${league.pollFinalMinutes || 120} min
                    ·
                    Snapshots: ${adminSportsBool_(league.savePeriodSnapshots) ? "ON" : "OFF"}
                  </div>
                </div>

                <div class="admin-pill ${enabled ? "admin" : "inactive"}">
                  ${enabled ? "Scores ON" : "Scores OFF"}
                </div>

              </div>

              <div class="admin-control-grid">

                <label class="admin-field">
                  <span>Pregame min</span>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    id="${adminSportsInputId_("sportsPre", leagueCode)}"
                    value="${league.pollPreGameMinutes || 60}"
                  >
                </label>

                <label class="admin-field">
                  <span>Live min</span>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    id="${adminSportsInputId_("sportsLive", leagueCode)}"
                    value="${league.pollLiveMinutes || 5}"
                  >
                </label>

                <label class="admin-field">
                  <span>Final min</span>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    id="${adminSportsInputId_("sportsFinal", leagueCode)}"
                    value="${league.pollFinalMinutes || 120}"
                  >
                </label>

                <label class="admin-field">
                  <span>Snapshots</span>
                  <select id="${adminSportsInputId_("sportsSnapshots", leagueCode)}">
                    <option value="true" ${adminSportsBool_(league.savePeriodSnapshots) ? "selected" : ""}>ON</option>
                    <option value="false" ${adminSportsBool_(league.savePeriodSnapshots) ? "" : "selected"}>OFF</option>
                  </select>
                </label>

              </div>

              <div class="admin-actions">

                <button
                  class="admin-small-button ${enabled ? "danger" : "secondary"}"
                  onclick="adminToggleSportsScoreLeague('${leagueCode}', ${enabled ? "false" : "true"})"
                >
                  ${enabled ? "Disable Scores" : "Enable Scores"}
                </button>

                <button
                  class="admin-small-button secondary"
                  onclick="adminSaveSportsScoreLeagueSettings('${leagueCode}', '${sport}')"
                >
                  Save Poll Settings
                </button>

              </div>

            </div>
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

  adminSportsMessage_(
    "Saving smart poll settings for " + league + "...",
    false
  );

  const res =
    await apiAdminUpdateSportsLeagueSetting(
      league,
      true,
      {
        sport: sport,
        pollPreGameMinutes: preEl ? preEl.value : 60,
        pollLiveMinutes: liveEl ? liveEl.value : 5,
        pollFinalMinutes: finalEl ? finalEl.value : 120,
        savePeriodSnapshots: snapshotsEl ? snapshotsEl.value : false
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
    await adminLoadSportsControls();
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
    await adminLoadSportsControls();
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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

    adminSportsMessage_(
      "Smart sports sync complete. Score rows: " +
      totals.updated +
      ", odds rows: " +
      totals.oddsUpdated +
      ", protected odds: " +
      totals.protected +
      ", settled: " +
      totals.settled +
      ", skipped settlements: " +
      totals.skipped,
      false
    );

    await adminLoadSportsControls();

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

    await adminLoadSportsControls();

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

    await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

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

  await adminLoadSportsControls();

}  