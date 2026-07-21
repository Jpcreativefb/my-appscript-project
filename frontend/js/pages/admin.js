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
    seasonSection:
      "Season controls decide whether this league is active and which calendar windows count as preseason, regular season, postseason, tournament, or bowls.",
    scoringSection:
      "Score polling controls how often the engine checks ESPN before games, during live games, and after final games.",
    snapshotsSection:
      "Snapshots save quarter/period/final checkpoints. Leave this off for simpler moneyline-only wagers; turn it on when you want history or period-style betting later.",
    oddsSection:
      "Odds controls protect the Odds API budget. Keep limits low because the free plan is limited and many leagues can burn calls quickly.",
    archiveSection:
      "Archive settings keep old completed rows from slowing down the live sheets. Preview first; archive is meant for cleanup after games are safely final.",
    season:
      "Season title shown for this league, usually the year or label such as 2026, 2026-27, Regular Season, or World Cup 2026.",
    leagueOn:
      "Master league switch. When OFF, smart automation skips schedule, score, odds, snapshots, and archive actions for this league.",
    seasonStart:
      "First date this league should be considered active for schedule building and smart automation.",
    seasonEnd:
      "Last date this league should be considered active. After this date, turn the league off to stop all pulls.",
    preseasonEnabled:
      "Turns on the optional preseason window. Date fields show only when this is enabled.",
    postseasonEnabled:
      "Turns on the optional postseason/playoff window. Date fields show only when this is enabled.",
    tournamentEnabled:
      "Turns on the optional tournament window for events such as group/knockout rounds.",
    bowlEnabled:
      "Turns on the optional bowl window, mainly useful for college football.",
    preseasonStart:
      "Start date for preseason games.",
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
      "Start date for tournament-style play.",
    tournamentEnd:
      "End date for tournament-style play.",
    bowlStart:
      "Start date for bowl/playoff window.",
    bowlEnd:
      "End date for bowl/playoff window.",
    scheduleSource:
      "ESPN Season Types uses ESPN preseason/regular/postseason filters. Manual Dates uses only your date windows. Hybrid uses ESPN type filters when available and dates as a safety window.",
    seasonYear:
      "Season year sent to ESPN, such as 2026. This is separate from the display title.",
    scheduleBatchDays:
      "How many calendar days one schedule job should process at a time. Use 14 for normal speed, 7 for large college pulls, and 30 only if Apps Script does not time out.",
    espnSeasonTypes:
      "When ON, Build Schedule includes ESPN seasontype filters: 1 preseason, 2 regular season, 3 postseason.",
    espnPreseasonType:
      "ESPN seasontype for preseason. Default is 1.",
    espnRegularSeasonType:
      "ESPN seasontype for regular season. Default is 2.",
    espnPostseasonType:
      "ESPN seasontype for postseason/playoffs. Default is 3.",
    collegeCoverage:
      "College coverage controls whether ESPN pulls top 25 only, all D1/FBS groups, selected conference/group IDs, or selected school/team schedules.",
    espnGroupIds:
      "Comma-separated ESPN group or conference IDs. College football all FBS is usually 80. Men's college basketball D1 is usually 50.",
    espnResultLimit:
      "Maximum ESPN events to request per scoreboard call. College basketball may need 500 or more to avoid missing smaller schools.",
    selectedTeamIds:
      "Comma-separated ESPN team IDs. Use this for smaller schools that exist on ESPN but do not reliably appear in the main scoreboard feed.",
    scoresOn:
      "Turns ESPN score pulls on or off for this league. If OFF, scores, clocks, and finals are not refreshed for this league.",
    pregame:
      "Minimum minutes between pregame score checks. Higher numbers reduce ESPN calls before games start.",
    live:
      "Minimum minutes between live score checks. Apps Script should normally use 5 minutes or more.",
    final:
      "How often to recheck recently final games for corrections and settlement follow-up.",
    oddsOn:
      "Turns odds pulls and odds sync on or off for this league. Odds limits still apply when this is ON.",
    oddsCooldown:
      "Minimum minutes between odds pulls for this league. This protects the Odds API limit.",
    oddsDaily:
      "Maximum odds pulls allowed for this league in one day. Set low for leagues with many games.",
    oddsMonthly:
      "Maximum odds pulls allowed for this league in one month. This helps protect your monthly Odds API quota.",
    oddsUsage:
      "Shows this league's Odds API usage counters from SportsOddsSettings/SportsOddsLog.",
    refreshOdds:
      "Manually refreshes odds for this one league. This may use one Odds API call.",
    runHybridOdds:
      "Runs the hybrid odds refresh for enabled auto leagues only. Use sparingly to protect the API limit.",
    snapshots:
      "Saves period/quarter/final snapshots for history. Useful for future period bets; OFF is faster for simple moneyline wagers.",
    snapshotDays:
      "How many days to keep snapshot rows before archive/cleanup can move them.",
    archiveEnabled:
      "Turns archive cleanup on for this league. Leave OFF until you are comfortable with the preview results.",
    archiveDays:
      "How many days after completed/final games before rows become eligible for archive.",
    archiveMode:
      "MOVE removes old rows from live sheets after copying them to archive sheets. COPY keeps the live rows.",
    logDays:
      "How many days to keep live sports log rows before they become cleanup candidates.",
    defaults:
      "Fills safe default settings on this card. Click Save afterward to store them.",
    save:
      "Saves this league card settings to SportsSettings.",
    leagueState:
      "Turns the whole league on or off. Turning it off stops schedule, scores, odds, snapshots, and smart sync for this league.",
    buildSchedule:
      "Creates or refreshes SportsSeasonJobs for this league from the Season section date range. It builds the job list; the season batch runner does the ESPN pulls.",
    runSeasonBatch:
      "Runs pending SportsSeasonJobs now. Use this after Build Schedule to actually fetch ESPN games into SportsGames/SportsScores. This can take time for MLB, NFL, or college schedules.",
    previewArchive:
      "Shows what rows would be eligible for archive/cleanup. This preview does not move or delete anything.",
    runArchive:
      "Saves this league card, then runs archive cleanup now for this league only. COPY is safest for testing; MOVE removes copied rows from the live sheets.",
    repairRecords:
      "Repairs display fields such as team records and clocks when existing SportsScores rows look stale or malformed.",
    runSmartSync:
      "Runs smart sports sync immediately for scores, odds, wager sync, and settlements that are due.",
    refreshScoresNow:
      "Refreshes the current ESPN scoreboards in the external Sports Scores Engine. Use this when scores, records, or clocks look stale.",
    refreshScoresWindow:
      "Refreshes a date window around today in the external Sports Scores Engine. This catches yesterday, today, and upcoming games that may not be in the current scoreboard pull.",
    smartAutomationToggle:
      "One master button for Smart Sports Automation. Enabled installs the smart trigger; Disabled removes it.",
    automationSummary:
      "Shows current trigger counts and Odds API usage so you can see whether automation is active.",
    scheduleTrigger:
      "Legacy schedule batch trigger controls. Smart Sports Automation is preferred for normal use.",
    scoreWindowTrigger:
      "Legacy score-window trigger controls. Smart Sports Automation is preferred for normal use."
  };

  return map[key] || "More information about this setting.";

}


var adminSportsInfoTimers_ =
  adminSportsInfoTimers_ || {};

var adminSportsInfoHandlersReady_ =
  adminSportsInfoHandlersReady_ || false;

var adminSportsLoadSequence_ =
  adminSportsLoadSequence_ || 0;

function adminSportsRenderLoading_(
  title,
  detail,
  percent
) {

  const safeTitle =
    adminSportsEscape_(title || "Loading Sports Controls...");

  const safeDetail =
    adminSportsEscape_(detail || "Please wait while the dashboard loads.");

  const safePercent =
    Math.max(5, Math.min(100, Number(percent || 15)));

  return `
    <div class="admin-category-card sports-controls-loading-card">
      <strong>${safeTitle}</strong>
      <div class="admin-sub" style="margin-top:6px;">
        ${safeDetail}
      </div>
      <div
        class="sports-load-progress"
        aria-label="Sports Controls loading progress"
        style="margin-top:12px; height:10px; border-radius:999px; overflow:hidden; background:rgba(148,163,184,.24);"
      >
        <div
          style="height:100%; width:${safePercent}%; border-radius:999px; background:linear-gradient(90deg, #2563eb, #22c55e); transition:width .25s ease;"
        ></div>
      </div>
      <div class="admin-sub" style="margin-top:8px;">
        Do not press buttons again while this bar is showing.
      </div>
    </div>
  `;

}

function adminSportsSetPanelLoading_(
  panel,
  title,
  detail,
  percent
) {

  if (!panel) {
    return;
  }

  panel.innerHTML =
    adminSportsRenderLoading_(
      title,
      detail,
      percent
    );

}

function adminSportsDisplayValue_(value, fallback) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return value;

}

function adminSportsCloseInfoPopups_() {

  document
    .querySelectorAll(".sports-info-pop")
    .forEach(function(box) {
      box.setAttribute("hidden", "hidden");
      box.style.left = "";
      box.style.top = "";
    });

  document
    .querySelectorAll(".sports-info-button[aria-expanded='true']")
    .forEach(function(button) {
      button.setAttribute("aria-expanded", "false");
    });

  Object.keys(adminSportsInfoTimers_ || {})
    .forEach(function(timerKey) {
      clearTimeout(adminSportsInfoTimers_[timerKey]);
      delete adminSportsInfoTimers_[timerKey];
    });

}

function adminSportsPositionInfoPopup_(box, button) {

  if (!box || !button) {
    return;
  }

  const wrap =
    button.closest(".sports-info-wrap") ||
    button.parentElement;

  if (!wrap) {
    return;
  }

  const margin = 12;
  const viewportWidth =
    Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );
  const viewportHeight =
    Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );

  const buttonRect =
    button.getBoundingClientRect();

  const wrapRect =
    wrap.getBoundingClientRect();

  box.style.position = "absolute";
  box.style.transform = "none";
  box.style.left = "0px";
  box.style.right = "auto";
  box.style.top = "calc(100% + 7px)";
  box.style.bottom = "auto";
  box.style.maxWidth =
    Math.max(180, viewportWidth - margin * 2) + "px";

  const measured =
    box.getBoundingClientRect();

  const width =
    Math.min(
      measured.width || box.offsetWidth || 280,
      viewportWidth - margin * 2
    );

  const height =
    Math.min(
      measured.height || box.offsetHeight || 90,
      viewportHeight - margin * 2
    );

  const desiredLeftInViewport =
    buttonRect.left + buttonRect.width / 2 - width / 2;

  const leftInViewport =
    Math.max(
      margin,
      Math.min(
        desiredLeftInViewport,
        viewportWidth - width - margin
      )
    );

  box.style.left =
    Math.round(leftInViewport - wrapRect.left) + "px";

  const placeAbove =
    buttonRect.bottom + height + 10 > viewportHeight - margin &&
    buttonRect.top - height - 10 > margin;

  if (placeAbove) {
    box.style.top = "auto";
    box.style.bottom = "calc(100% + 7px)";
  } else {
    box.style.top = "calc(100% + 7px)";
    box.style.bottom = "auto";
  }

}

function adminSportsInitInfoHandlers_() {

  if (adminSportsInfoHandlersReady_) {
    return;
  }

  adminSportsInfoHandlersReady_ = true;

  document.addEventListener(
    "click",
    function(event) {

      const infoButton =
        event.target && event.target.closest
          ? event.target.closest(".sports-info-button")
          : null;

      if (infoButton) {
        const infoId =
          infoButton.getAttribute("data-sports-info-target") ||
          infoButton.getAttribute("aria-controls") ||
          "";

        adminToggleSportsInfo_(
          event,
          infoId,
          infoButton
        );

        return;
      }

      const actionButton =
        event.target && event.target.closest
          ? event.target.closest("[data-sports-click]")
          : null;

      if (actionButton) {
        adminSportsRunActionFromButton_(
          event,
          actionButton
        );
        return;
      }

      const localToggle =
        event.target && event.target.closest
          ? event.target.closest("[data-sports-local-toggle]")
          : null;

      if (localToggle) {
        adminSportsToggleLocalSwitch_(
          event,
          localToggle
        );
        return;
      }

      if (
        event.target &&
        event.target.closest &&
        event.target.closest(".sports-info-wrap")
      ) {
        return;
      }

      adminSportsCloseInfoPopups_();
    },
    true
  );

  window.addEventListener(
    "resize",
    adminSportsCloseInfoPopups_
  );

  window.addEventListener(
    "scroll",
    adminSportsCloseInfoPopups_,
    true
  );

  document.addEventListener(
    "keydown",
    function(event) {
      if (event.key === "Escape") {
        adminSportsCloseInfoPopups_();
      }
    }
  );

}


function adminSportsActionProgressText_(button) {

  const label =
    String(
      button && button.textContent
        ? button.textContent
        : ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  if (label.indexOf("save") >= 0) {
    return "Saving...";
  }

  if (label.indexOf("build") >= 0) {
    return "Building...";
  }

  if (label.indexOf("archive") >= 0) {
    return label.indexOf("preview") >= 0
      ? "Previewing..."
      : "Archiving...";
  }

  if (label.indexOf("refresh") >= 0) {
    return "Refreshing...";
  }

  if (label.indexOf("repair") >= 0) {
    return "Repairing...";
  }

  if (label.indexOf("default") >= 0) {
    return "Applying...";
  }

  return "Working...";

}

function adminSportsSetActionProgress_(button, message) {

  const wrap =
    button && button.closest
      ? button.closest(".sports-action-wrap")
      : null;

  if (!wrap) {
    if (button) {
      button.setAttribute(
        "data-sports-original-text",
        button.textContent || ""
      );
      button.textContent =
        message || "Working...";
      button.classList.add("is-working");
    }
    return;
  }

  const status =
    wrap.querySelector(".sports-action-status");

  const text =
    wrap.querySelector("[data-sports-status-text]");

  if (text) {
    text.textContent =
      message || "Working...";
  }

  if (status) {
    status.removeAttribute("hidden");
  }

  wrap.classList.add("is-working");

}

function adminSportsClearActionProgress_(button) {

  const wrap =
    button && button.closest
      ? button.closest(".sports-action-wrap")
      : null;

  if (!wrap) {
    if (button) {
      const inputId =
        button.getAttribute("data-sports-local-toggle") || "";

      if (inputId) {
        adminSportsSyncLocalToggleButtons_(
          inputId
        );
      } else if (button.hasAttribute("data-sports-original-text")) {
        button.textContent =
          button.getAttribute("data-sports-original-text") || button.textContent || "";
      }

      button.removeAttribute("data-sports-original-text");
      button.classList.remove("is-working");
    }
    return;
  }

  const status =
    wrap.querySelector(".sports-action-status");

  if (status) {
    status.setAttribute("hidden", "hidden");
  }

  wrap.classList.remove("is-working");

}

function adminSportsMarkDashboardStale_(message) {

  const panel =
    document.getElementById("adminSportsControlPanel");

  if (panel) {
    panel.setAttribute("data-sports-dashboard-stale", "true");
  }

  const reloadHint =
    document.getElementById("sportsControlsReloadHint");

  if (reloadHint) {
    reloadHint.textContent =
      message ||
      "Saved. Controls stayed open. Use Reload Sports Controls when you want fresh counts/status.";

    reloadHint.removeAttribute("hidden");
  }

}

async function adminReloadSportsControlsNow() {

  adminSportsMessage_(
    "Reloading Sports Controls...",
    false
  );

  await adminLoadSportsControls({ preserveOpen: true });

}

function adminSportsToggleLocalSwitch_(event, button) {

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!button || button.disabled) {
    return;
  }

  const inputId =
    button.getAttribute("data-sports-local-toggle") || "";

  const input =
    document.getElementById(inputId);

  if (!input) {
    return;
  }

  input.checked =
    !input.checked;

  adminSportsSyncLocalToggleButtons_(
    inputId
  );

}


async function adminToggleSportsLeagueState(
  league,
  sport
) {

  const seasonActiveInputId =
    adminSportsInputId_(
      "sportsSeasonActive",
      league
    );

  const currentlyOn =
    adminSportsIsChecked_(
      seasonActiveInputId
    );

  return await adminSetSportsLeagueSeasonState(
    league,
    sport,
    !currentlyOn
  );

}

function adminSportsParseActionArgs_(argsText) {

  const args = [];
  let current = "";
  let quote = "";
  let escaping = false;

  String(argsText || "")
    .split("")
    .forEach(function(ch) {

      if (escaping) {
        current += ch;
        escaping = false;
        return;
      }

      if (ch === "\\") {
        escaping = true;
        return;
      }

      if (quote) {
        if (ch === quote) {
          quote = "";
        } else {
          current += ch;
        }
        return;
      }

      if (ch === "'" || ch === '"') {
        quote = ch;
        return;
      }

      if (ch === ",") {
        args.push(current.trim());
        current = "";
        return;
      }

      current += ch;

    });

  if (current.trim() || argsText.trim()) {
    args.push(current.trim());
  }

  return args.map(function(value) {

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    if (value === "null") {
      return null;
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    return value;

  });

}

async function adminSportsRunActionFromButton_(
  event,
  button
) {

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!button || button.disabled) {
    return;
  }

  const actionText =
    button.getAttribute("data-sports-click") ||
    "";

  const match =
    String(actionText).match(/^([a-zA-Z_$][\w$]*)\((.*)\)$/);

  if (!match) {
    adminSportsMessage_(
      "Button action is not wired correctly: " + actionText,
      true
    );
    return;
  }

  const fnName =
    match[1];

  const fn =
    window[fnName];

  if (typeof fn !== "function") {
    adminSportsMessage_(
      "Button function is missing: " + fnName,
      true
    );
    return;
  }

  const oldDisabled =
    button.disabled;

  button.disabled = true;

  adminSportsSetActionProgress_(
    button,
    adminSportsActionProgressText_(button)
  );

  try {
    await fn.apply(
      window,
      adminSportsParseActionArgs_(match[2] || "")
    );
  } catch (err) {
    console.error(err);
    adminSportsMessage_(
      err && err.message
        ? err.message
        : String(err || "Sports action failed."),
      true
    );
  } finally {
    if (document.body.contains(button)) {
      button.disabled = oldDisabled;
      adminSportsClearActionProgress_(button);
    }
  }

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
        data-sports-info-target="${id}"
      >?</button>
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
  id,
  sourceButton
) {

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  adminSportsInitInfoHandlers_();

  const box =
    document.getElementById(id);

  const button =
    sourceButton ||
    (event && event.target && event.target.closest
      ? event.target.closest(".sports-info-button")
      : null);

  if (!box) {
    return;
  }

  const shouldShow =
    box.hasAttribute("hidden");

  adminSportsCloseInfoPopups_();

  if (!shouldShow) {
    return;
  }

  box.removeAttribute("hidden");

  if (button) {
    button.setAttribute(
      "aria-expanded",
      "true"
    );

    adminSportsPositionInfoPopup_(
      box,
      button
    );
  }

  adminSportsInfoTimers_[id] =
    setTimeout(function() {
      adminSportsCloseInfoPopups_();
    }, 6500);

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

  adminSportsSyncLocalToggleButtons_(
    id
  );

}

function adminSportsSyncLocalToggleButtons_(inputId) {

  if (!inputId) {
    return;
  }

  const input =
    document.getElementById(inputId);

  if (!input) {
    return;
  }

  document
    .querySelectorAll("[data-sports-local-toggle]")
    .forEach(function(button) {

      if (
        button.getAttribute("data-sports-local-toggle") !==
        inputId
      ) {
        return;
      }

      const label =
        button.getAttribute("data-sports-toggle-label") ||
        "Setting";

      const state =
        input.checked ? "ON" : "OFF";

      button.textContent =
        label + " " + state;

      button.setAttribute(
        "aria-pressed",
        input.checked ? "true" : "false"
      );

      button.classList.toggle(
        "is-on",
        input.checked
      );

      button.classList.toggle(
        "is-off",
        !input.checked
      );

    });

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

  const panel =
    document.getElementById(
      "adminSportsControlPanel"
    );

  adminSportsSetPanelLoading_(
    panel,
    "Opening Sports Controls",
    "Checking the Sports Engine setup before loading the dashboard...",
    10
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

  const loadSequence =
    ++adminSportsLoadSequence_;

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

  adminSportsSetPanelLoading_(
    panel,
    "Loading Sports Controls",
    "Step 1 of 3: getting the Sports Engine dashboard...",
    20
  );

  adminSportsMessage_(
    "Loading Sports Engine dashboard...",
    false
  );

  let res = null;

  try {

    res =
      await apiAdminGetSportsControlDashboard();

  } catch (err) {

    res = {
      success: false,
      error: err && err.message
        ? err.message
        : String(err || "Unable to load Sports Controls.")
    };

  }

  if (loadSequence !== adminSportsLoadSequence_) {
    return;
  }

  if (res && res.success !== false) {

    adminSportsSetPanelLoading_(
      panel,
      "Loading Sports Controls",
      "Step 2 of 3: checking automation status...",
      65
    );

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

  if (loadSequence !== adminSportsLoadSequence_) {
    return;
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

          <div class="admin-actions" style="margin-top:12px;">
            <button
              type="button"
              class="admin-small-button secondary"
              data-sports-click="adminReloadSportsControlsNow()"
            >
              Try Again
            </button>
          </div>
        </div>
      `;

    adminSportsInitInfoHandlers_();

    adminSportsMessage_(
      "Unable to load Sports Controls.",
      true
    );

    return;

  }

  adminSportsSetPanelLoading_(
    panel,
    "Loading Sports Controls",
    "Step 3 of 3: drawing league controls...",
    90
  );

  panel.innerHTML =
    adminRenderSportsControlDashboard_(
      res,
      openLeagueKeys
    );

  adminSportsInitInfoHandlers_();

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
      wagerAutoSyncTriggers,
      data.smartAutomation || {}
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
  wagerAutoSyncTriggers,
  smartAutomation
) {

  scoreWindowTriggers =
    scoreWindowTriggers || [];

  wagerAutoSyncTriggers =
    wagerAutoSyncTriggers || [];

  smartAutomation =
    smartAutomation || {};

  const externalDetails =
    smartAutomation.details || {};

  const externalTriggerCount =
    Number(externalDetails.scoreUpdater || 0) +
    Number(externalDetails.seasonLoader || 0) +
    Number(externalDetails.oddsUpdater || 0) +
    Number(externalDetails.archiveUpdater || 0);

  const smartEnabled =
    !!(
      smartAutomation.enabled ||
      smartAutomation.fullyEnabled ||
      wagerAutoSyncTriggers.length ||
      externalTriggerCount
    );

  const smartPartial =
    !!smartAutomation.partiallyEnabled;

  return `
    <div class="admin-category-card sports-controls-root">

      <style>
        .sports-controls-root .admin-actions {
          align-items: center;
          gap: 8px;
        }
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
          line-height: 1;
          position: relative;
          vertical-align: middle;
        }
        .sports-info-button {
          align-items: center;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(100, 116, 139, 0.55);
          border-radius: 999px;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          font-size: 11px;
          font-weight: 900;
          height: 18px;
          justify-content: center;
          line-height: 1;
          margin: 0;
          padding: 0;
          width: 18px;
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
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.35);
          box-sizing: border-box;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
          left: 0;
          line-height: 1.35;
          max-width: calc(100vw - 24px);
          min-width: 0;
          overflow-wrap: anywhere;
          padding: 9px 10px;
          pointer-events: none;
          position: absolute;
          right: auto;
          top: calc(100% + 7px);
          white-space: normal;
          width: min(280px, calc(100vw - 24px));
          z-index: 9999;
        }
        .sports-info-pop[hidden] {
          display: none !important;
        }
        .sports-action-wrap {
          align-items: flex-start;
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
          min-width: 118px;
        }
        .sports-action-row {
          align-items: center;
          display: inline-flex;
          gap: 4px;
          width: 100%;
        }
        .sports-action-status {
          color: #334155;
          display: block;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          width: 100%;
        }
        .sports-action-status[hidden] {
          display: none !important;
        }
        .sports-action-progress {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
          display: block;
          height: 5px;
          margin: 2px 0 4px;
          overflow: hidden;
          width: 100%;
        }
        .sports-action-progress span {
          animation: sportsActionProgress 1s ease-in-out infinite;
          background: rgba(37, 99, 235, 0.9);
          border-radius: 999px;
          display: block;
          height: 100%;
          width: 45%;
        }
        @keyframes sportsActionProgress {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(250%); }
        }
        .sports-control-section {
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 12px;
          margin-top: 10px;
          overflow: visible;
        }
        .sports-control-section > summary {
          align-items: center;
          cursor: pointer;
          display: flex;
          font-weight: 800;
          gap: 8px;
          justify-content: space-between;
          padding: 10px 12px;
        }
        .sports-section-title {
          align-items: center;
          display: inline-flex;
          gap: 6px;
          min-width: 0;
        }
        .sports-section-controls {
          align-items: center;
          display: inline-flex;
          flex-shrink: 0;
          gap: 8px;
        }
        .sports-state-toggle {
          border: 1px solid rgba(148, 163, 184, 0.55);
          border-radius: 999px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.02em;
          line-height: 1;
          padding: 7px 10px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .sports-state-toggle.is-on {
          background: #dcfce7;
          border-color: #16a34a;
          color: #166534;
        }
        .sports-state-toggle.is-off {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #475569;
        }
        .sports-state-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .sports-state-toggle.is-working {
          opacity: 0.82;
          position: relative;
        }
        .sports-toggle-hidden-input {
          height: 1px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          width: 1px !important;
        }
        .sports-league-topline {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          justify-content: space-between;
        }
        .sports-control-section-body {
          border-top: 1px solid rgba(148, 163, 184, 0.22);
          padding: 10px 12px 12px;
        }
        .sports-phase-window {
          border: 1px dashed rgba(148, 163, 184, 0.45);
          border-radius: 10px;
          padding: 8px;
        }
        .sports-phase-dates {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
          margin-top: 8px;
        }
        .sports-checkbox-field {
          align-items: center;
          display: flex;
          flex-direction: row !important;
          justify-content: space-between;
        }
        .sports-league-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        @media (max-width: 640px) {
          .sports-league-actions,
          .sports-controls-root .admin-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .sports-action-wrap,
          .sports-action-wrap button,
          .sports-action-row {
            width: 100%;
          }
          .sports-action-wrap {
            align-items: stretch;
          }
          .sports-control-section > summary {
            align-items: flex-start;
          }
          .sports-section-controls {
            align-items: flex-end;
            flex-direction: column-reverse;
            gap: 5px;
          }
        }
      </style>

      <div class="admin-category-header">
        <div>
          <strong>
            Sports Automation & Usage
            ${adminSportsInfoButton_("automationSummary", "global", "Sports Automation & Usage")}
          </strong>

          <div class="admin-sub">
            Smart automation: ${smartEnabled ? "Enabled" : "Disabled"}${smartPartial ? " / partial" : ""}
            · Live score triggers: ${scoreTriggers.length || 0}
            · Score window triggers: ${scoreWindowTriggers.length || 0}
            · Wager smart triggers: ${wagerAutoSyncTriggers.length || 0}
            · Schedule batch triggers: ${seasonBatchTriggers.length || 0}
            · Schedule reconcile: ${(smart.details && smart.details.scheduleReconcile) || 0}
            · Odds calls this month: ${usage.totalCallsUsed || 0} / ${usage.hardCap || 500}
          </div>
        </div>
      </div>

      <div class="admin-sub">
        Use <strong>Run Smart Sports Sync Now</strong> when odds, scores, schedules, or settlements look stale. Use the master automation button for normal scheduled running.
      </div>

      <div class="admin-actions">
        ${adminSportsActionButton_(
          "Run Smart Sports Sync Now",
          "admin-small-button",
          "adminRunFullSportsSyncNow()",
          "runSmartSync",
          "global"
        )}

        ${adminSportsActionButton_(
          "Refresh ESPN Scores Now",
          "admin-small-button secondary",
          "adminRefreshSportsScoresNow()",
          "refreshScoresNow",
          "global"
        )}

        ${adminSportsActionButton_(
          "Refresh Score Window",
          "admin-small-button secondary",
          "adminRefreshSportsScoresWindow()",
          "refreshScoresWindow",
          "global"
        )}

        ${adminSportsActionButton_(
          "Recheck Schedule Now",
          "admin-small-button secondary",
          "adminRunSportsScheduleReconcile()",
          "scheduleReconcile",
          "global"
        )}

        ${adminSportsActionButton_(
          "Run Season Batch",
          "admin-small-button secondary",
          "adminRunSportsSeasonBatch()",
          "runSeasonBatch",
          "global"
        )}

        ${adminSportsActionButton_(
          smartEnabled
            ? "Smart Sports Automation Enabled"
            : "Smart Sports Automation Disabled",
          smartEnabled
            ? "admin-small-button danger"
            : "admin-small-button secondary",
          "adminToggleSportsAutomation(" + (smartEnabled ? "false" : "true") + ")",
          "smartAutomationToggle",
          "global"
        )}

        ${adminSportsActionButton_(
          "Reload Sports Controls",
          "admin-small-button secondary",
          "adminReloadSportsControlsNow()",
          "reloadSportsControls",
          "global"
        )}
      </div>

      <div
        id="sportsControlsReloadHint"
        class="admin-sub"
        hidden
        style="margin-top:8px; font-weight:700;"
      >
        Saved. Controls stayed open. Use Reload Sports Controls when you want fresh counts/status.
      </div>

    </div>
  `;

}


function adminRenderSportsDateField_(
  label,
  prefix,
  leagueCode,
  value,
  infoKey,
  disabledAttr
) {

  return `
    <label class="admin-field" style="gap:6px;">
      ${adminSportsLabel_(label, infoKey || prefix, leagueCode)}
      <input
        type="date"
        id="${adminSportsInputId_(prefix, leagueCode)}"
        value="${adminSportsEscape_(adminSportsDateValue_(value, ""))}"
        ${disabledAttr || ""}
      >
    </label>
  `;

}

function adminRenderSportsTextField_(
  label,
  prefix,
  leagueCode,
  value,
  fallback,
  infoKey,
  disabledAttr
) {

  return `
    <label class="admin-field" style="gap:6px;">
      ${adminSportsLabel_(label, infoKey || prefix, leagueCode)}
      <input
        type="text"
        id="${adminSportsInputId_(prefix, leagueCode)}"
        value="${adminSportsEscape_(adminSportsDisplayValue_(value, fallback || ""))}"
        ${disabledAttr || ""}
      >
    </label>
  `;

}

function adminRenderSportsNumberField_(
  label,
  prefix,
  leagueCode,
  value,
  fallback,
  min,
  max,
  infoKey,
  disabledAttr
) {

  return `
    <label class="admin-field" style="gap:6px;">
      ${adminSportsLabel_(label, infoKey || prefix, leagueCode)}
      <input
        type="number"
        min="${adminSportsEscape_(min)}"
        max="${adminSportsEscape_(max)}"
        id="${adminSportsInputId_(prefix, leagueCode)}"
        value="${adminSportsEscape_(adminSportsDisplayValue_(value, fallback))}"
        ${disabledAttr || ""}
      >
    </label>
  `;

}

function adminRenderSportsCheckboxField_(
  label,
  prefix,
  leagueCode,
  checked,
  infoKey,
  disabledAttr,
  extraAttrs
) {

  return `
    <label class="admin-field sports-checkbox-field" style="gap:6px;">
      ${adminSportsLabel_(label, infoKey || prefix, leagueCode)}
      <input
        type="checkbox"
        id="${adminSportsInputId_(prefix, leagueCode)}"
        ${checked ? "checked" : ""}
        ${disabledAttr || ""}
        ${extraAttrs || ""}
      >
    </label>
  `;

}

function adminRenderSportsSelectField_(
  label,
  prefix,
  leagueCode,
  value,
  options,
  infoKey,
  disabledAttr
) {

  value =
    String(value || "").toUpperCase();

  return `
    <label class="admin-field" style="gap:6px;">
      ${adminSportsLabel_(label, infoKey || prefix, leagueCode)}
      <select
        id="${adminSportsInputId_(prefix, leagueCode)}"
        ${disabledAttr || ""}
      >
        ${(options || []).map(function(option) {
          const optionValue =
            String(option.value || option).toUpperCase();

          return `
            <option
              value="${adminSportsEscape_(optionValue)}"
              ${optionValue === value ? "selected" : ""}
            >${adminSportsEscape_(option.label || optionValue)}</option>
          `;
        }).join("")}
      </select>
    </label>
  `;

}

function adminRenderSportsHeaderSwitch_(
  label,
  prefix,
  leagueCode,
  checked,
  infoKey,
  disabledAttr,
  extraAttrs,
  className
) {

  const inputId =
    adminSportsInputId_(prefix, leagueCode);

  const state =
    checked ? "ON" : "OFF";

  const actionAttrs =
    String(extraAttrs || "").indexOf("data-sports-click") >= 0
      ? extraAttrs
      : "";

  const localAttrs =
    `data-sports-local-toggle="${inputId}" data-sports-toggle-label="${adminSportsEscape_(label || "Setting")}"`;

  return `
    <span class="sports-toggle-wrap ${adminSportsEscape_(className || "")}" data-sports-summary-control="true">
      <input
        type="checkbox"
        class="sports-toggle-hidden-input"
        id="${inputId}"
        ${checked ? "checked" : ""}
        ${disabledAttr || ""}
      >
      <button
        type="button"
        class="sports-state-toggle ${checked ? "is-on" : "is-off"}"
        aria-pressed="${checked ? "true" : "false"}"
        ${disabledAttr || ""}
        ${localAttrs} ${actionAttrs}
      >${adminSportsEscape_(String(label || "Setting") + " " + state)}</button>
    </span>
  `;

}

function adminSportsSection_(
  title,
  key,
  leagueCode,
  body,
  open,
  headerControl
) {

  return `
    <details class="sports-control-section" ${open ? "open" : ""}>
      <summary>
        <span class="sports-section-title">
          <span>${adminSportsEscape_(title)}</span>
        </span>
        <span
          class="sports-section-controls"
          data-sports-summary-control="true"
        >
          ${headerControl || ""}
          ${adminSportsInfoButton_(key, leagueCode, title)}
        </span>
      </summary>
      <div class="sports-control-section-body">
        ${body}
      </div>
    </details>
  `;

}

function adminSportsActionButton_(
  label,
  className,
  onclick,
  infoKey,
  leagueCode,
  extraAttrs
) {

  return `
    <span class="sports-action-wrap">
      <span class="sports-action-row">
        <button
          type="button"
          class="${adminSportsEscape_(className || "admin-small-button")}"
          data-sports-click="${adminSportsEscape_(onclick || "")}"
          ${extraAttrs || ""}
        >
          ${adminSportsEscape_(label)}
        </button>
        ${adminSportsInfoButton_(infoKey || "save", leagueCode || "global", label)}
      </span>
      <span class="sports-action-status" hidden>
        <span class="sports-action-progress"><span></span></span>
        <span data-sports-status-text>Working...</span>
      </span>
    </span>
  `;

}

function adminToggleSportsPhase_(
  leagueCode,
  phasePrefix
) {

  const checkbox =
    document.getElementById(
      adminSportsInputId_(
        "sports" + phasePrefix + "Enabled",
        leagueCode
      )
    );

  const wrap =
    document.getElementById(
      adminSportsInputId_(
        "sports" + phasePrefix + "Fields",
        leagueCode
      )
    );

  if (wrap) {
    wrap.style.display =
      checkbox && checkbox.checked
        ? ""
        : "none";
  }

}

function adminRenderSportsPhaseWindow_(
  label,
  phasePrefix,
  leagueCode,
  enabled,
  startValue,
  endValue,
  startKey,
  endKey,
  disabledAttr
) {

  const checked =
    !!enabled;

  return `
    <div class="sports-phase-window">
      ${adminRenderSportsCheckboxField_(
        "Use " + label,
        "sports" + phasePrefix + "Enabled",
        leagueCode,
        checked,
        String(label || "").toLowerCase() + "Enabled",
        disabledAttr,
        `onclick="adminToggleSportsPhase_('${leagueCode}', '${phasePrefix}')"`
      )}
      <div
        class="sports-phase-dates"
        id="${adminSportsInputId_("sports" + phasePrefix + "Fields", leagueCode)}"
        style="${checked ? "" : "display:none;"}"
      >
        ${adminRenderSportsDateField_(label + " start", "sports" + phasePrefix + "Start", leagueCode, startValue, startKey, disabledAttr)}
        ${adminRenderSportsDateField_(label + " end", "sports" + phasePrefix + "End", leagueCode, endValue, endKey, disabledAttr)}
      </div>
    </div>
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
          <strong>
            League Smart Controls
            ${adminSportsInfoButton_("leagueOn", "global", "League Smart Controls")}
          </strong>

          <div class="admin-sub">
            Per-league controls are grouped into Season, Scoring, Snapshots, Odds, and Archive sections for phone-friendly admin use.
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
        ${adminSportsActionButton_(
          "Repair Records / Clocks",
          "admin-small-button secondary",
          "adminRepairSportsScoreDisplay()",
          "repairRecords",
          "global"
        )}
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

          const inSeason =
            league.seasonActive === undefined
              ? true
              : adminSportsBool_(league.seasonActive);

          const oddsEnabled =
            league.oddsEnabled === undefined
              ? true
              : adminSportsBool_(league.oddsEnabled);

          const snapshotsEnabled =
            adminSportsBool_(league.savePeriodSnapshots);

          const archiveEnabled =
            adminSportsBool_(league.archiveEnabled);

          const forceOpen =
            openLeagueKeys.indexOf(leagueKey) !== -1;

          const openAttr =
            forceOpen ? "open" : "";

          const healthText =
            adminSportsEscape_(health.health || "Good");

          const oddsToday =
            oddsUsage.CallsToday || oddsUsage.callsToday || oddsUsage.requestsToday || 0;

          const oddsMonth =
            oddsUsage.CallsThisMonth || oddsUsage.callsThisMonth || oddsUsage.requestsThisMonth || 0;

          const oddsBudget =
            oddsUsage.MonthlyBudget || oddsUsage.monthlyBudget || league.oddsMonthlyMaxPulls || 30;

          const leagueOn =
            enabled;

          /*
            Keep league settings editable even when the league is OFF.
            The old UI disabled every input when League was OFF, which made it
            impossible to prepare MLB/NFL settings before turning the league on.
          */
          const controlsDisabled =
            "";

          const leagueToggleControl =
            adminRenderSportsHeaderSwitch_(
              "League",
              "sportsSeasonActive",
              leagueCode,
              leagueOn,
              "leagueState",
              "",
              `data-sports-click="adminToggleSportsLeagueState('${leagueCode}', '${sport}')"`,
              "sports-league-toggle"
            );

          const snapshotsHeaderControl =
            adminRenderSportsHeaderSwitch_(
              "Snapshots",
              "sportsSnapshots",
              leagueCode,
              snapshotsEnabled,
              "snapshots",
              controlsDisabled,
              "",
              "sports-header-toggle"
            );

          const oddsHeaderControl =
            adminRenderSportsHeaderSwitch_(
              "Odds",
              "sportsOddsEnabled",
              leagueCode,
              oddsEnabled,
              "oddsOn",
              controlsDisabled,
              "",
              "sports-header-toggle"
            );

          const archiveHeaderControl =
            adminRenderSportsHeaderSwitch_(
              "Archive",
              "sportsArchiveEnabled",
              leagueCode,
              archiveEnabled,
              "archiveEnabled",
              controlsDisabled,
              "",
              "sports-header-toggle"
            );

          const isCollegeLeague =
            ["college-football", "mens-college-basketball", "womens-college-basketball"].indexOf(String(leagueCode || "").toLowerCase()) !== -1;

          const seasonYear =
            adminSportsSeasonYear_(
              league.seasonTitle || league.season || health.season
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

          const phaseLabel =
            adminSportsEscape_(
              league.seasonPhase ||
              health.seasonPhase ||
              (inSeason ? "IN_SEASON" : "OFF_SEASON")
            );

          const seasonBody = `
            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px;">
              ${adminRenderSportsTextField_("Season title", "sportsSeasonTitle", leagueCode, league.seasonTitle || league.season || health.season, seasonYear, "season", "")}
              ${adminRenderSportsNumberField_("Season year", "sportsSeasonYear", leagueCode, league.seasonYear || health.seasonYear || seasonYear, seasonYear, 2000, 2100, "seasonYear", controlsDisabled)}
              ${adminRenderSportsSelectField_("Schedule source", "sportsScheduleSource", leagueCode, league.scheduleSource || "HYBRID", [
                { value: "HYBRID", label: "ESPN + Dates" },
                { value: "ESPN_TYPES", label: "ESPN Season Types" },
                { value: "MANUAL", label: "Manual Dates" }
              ], "scheduleSource", controlsDisabled)}
              ${adminRenderSportsNumberField_("Batch days", "sportsScheduleBatchDaysLeague", leagueCode, league.scheduleBatchDays, isCollegeLeague ? 7 : 14, 1, 30, "scheduleBatchDays", controlsDisabled)}
              ${adminRenderSportsHeaderSwitch_("ESPN Types", "sportsESPNSeasonTypesEnabled", leagueCode, league.espnSeasonTypesEnabled !== false, "espnSeasonTypes", controlsDisabled, "", "sports-header-toggle")}
            </div>

            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:8px; margin-top:8px;">
              ${adminRenderSportsNumberField_("Pre type", "sportsESPNPreseasonType", leagueCode, league.espnPreseasonType, 1, 1, 9, "espnPreseasonType", controlsDisabled)}
              ${adminRenderSportsNumberField_("Regular type", "sportsESPNRegularType", leagueCode, league.espnRegularSeasonType, 2, 1, 9, "espnRegularSeasonType", controlsDisabled)}
              ${adminRenderSportsNumberField_("Post type", "sportsESPNPostseasonType", leagueCode, league.espnPostseasonType, 3, 1, 9, "espnPostseasonType", controlsDisabled)}
            </div>

            <details style="margin-top:8px;" ${isCollegeLeague ? "open" : ""}>
              <summary style="cursor:pointer; font-weight:700;">Advanced dates / college coverage</summary>
              <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-top:8px;">
                ${adminRenderSportsDateField_("Start", "sportsSeasonStart", leagueCode, seasonStartDate, "seasonStart", controlsDisabled)}
                ${adminRenderSportsDateField_("End", "sportsSeasonEnd", leagueCode, seasonEndDate, "seasonEnd", controlsDisabled)}
                ${adminRenderSportsDateField_("Regular start", "sportsRegularStart", leagueCode, league.regularSeasonStartDate || health.regularSeasonStartDate, "regularStart", controlsDisabled)}
                ${adminRenderSportsDateField_("Regular end", "sportsRegularEnd", leagueCode, league.regularSeasonEndDate || health.regularSeasonEndDate, "regularEnd", controlsDisabled)}
              </div>
              ${isCollegeLeague ? `
                <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-top:8px;">
                  ${adminRenderSportsSelectField_("College coverage", "sportsCollegeCoverageMode", leagueCode, league.collegeCoverageMode || "ALL_D1", [
                    { value: "TOP_25", label: "Top 25 only" },
                    { value: "ALL_D1", label: "All D1 / FBS" },
                    { value: "CONFERENCES", label: "Selected groups" },
                    { value: "SELECTED_SCHOOLS", label: "Selected schools" }
                  ], "collegeCoverage", controlsDisabled)}
                  ${adminRenderSportsTextField_("Group IDs", "sportsESPNGroupIds", leagueCode, league.espnGroupIds || "", leagueCode === "college-football" ? "80" : "50", "espnGroupIds", controlsDisabled)}
                  ${adminRenderSportsNumberField_("Result limit", "sportsESPNResultLimit", leagueCode, league.espnResultLimit, 500, 25, 1000, "espnResultLimit", controlsDisabled)}
                  ${adminRenderSportsTextField_("Team IDs", "sportsSelectedTeamIds", leagueCode, league.selectedTeamIds || "", "", "selectedTeamIds", controlsDisabled)}
                </div>
              ` : ""}
            </details>

            <div class="admin-sub" style="margin-top:8px;">
              Current phase: ${phaseLabel}. Optional phase date fields appear only when the phase is enabled.
            </div>

            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:8px;">
              ${adminRenderSportsPhaseWindow_("Preseason", "Preseason", leagueCode, league.preseasonEnabled, league.preseasonStartDate || health.preseasonStartDate, league.preseasonEndDate || health.preseasonEndDate, "preseasonStart", "preseasonEnd", controlsDisabled)}
              ${adminRenderSportsPhaseWindow_("Postseason", "Postseason", leagueCode, league.postseasonEnabled, league.postseasonStartDate || health.postseasonStartDate, league.postseasonEndDate || health.postseasonEndDate, "postseasonStart", "postseasonEnd", controlsDisabled)}
              ${adminRenderSportsPhaseWindow_("Tournament", "Tournament", leagueCode, league.tournamentEnabled, league.tournamentStartDate || health.tournamentStartDate, league.tournamentEndDate || health.tournamentEndDate, "tournamentStart", "tournamentEnd", controlsDisabled)}
              ${adminRenderSportsPhaseWindow_("Bowl", "Bowl", leagueCode, league.bowlEnabled, league.bowlStartDate || health.bowlStartDate, league.bowlEndDate || health.bowlEndDate, "bowlStart", "bowlEnd", controlsDisabled)}
            </div>

            <div class="sports-league-actions">
              ${adminSportsActionButton_("Build Schedule", "admin-small-button secondary", "adminCreateSportsLeagueSeasonJobs('" + leagueCode + "', '" + sport + "')", "buildSchedule", leagueCode, controlsDisabled)}
              ${adminSportsActionButton_("Recheck Schedule", "admin-small-button secondary", "adminRunSportsScheduleReconcile('" + leagueCode + "')", "scheduleReconcile", leagueCode, controlsDisabled)}
              ${adminSportsActionButton_("Run Season Batch", "admin-small-button", "adminRunSportsSeasonBatch()", "runSeasonBatch", leagueCode, controlsDisabled)}
            </div>
          `;

          const scoringBody = `
            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap:8px;">
              ${adminRenderSportsNumberField_("Pregame min", "sportsPre", leagueCode, league.pollPreGameMinutes, 60, 15, 1440, "pregame", controlsDisabled)}
              ${adminRenderSportsNumberField_("Live min", "sportsLive", leagueCode, league.pollLiveMinutes, 5, 5, 60, "live", controlsDisabled)}
              ${adminRenderSportsNumberField_("Final min", "sportsFinal", leagueCode, league.pollFinalMinutes, 120, 15, 1440, "final", controlsDisabled)}
            </div>
          `;

          const snapshotsBody = `
            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px;">
              ${adminRenderSportsNumberField_("Snapshot days", "sportsSnapshotDays", leagueCode, league.snapshotRetentionDays || league.keepSnapshotsDays || health.keepSnapshotsDays, 14, 1, 365, "snapshotDays", controlsDisabled)}
            </div>
          `;

          const oddsBody = `
            <div class="admin-sub" style="margin-bottom:8px;">
              ${adminSportsLabel_("Odds API usage", "oddsUsage", leagueCode)}
              Today ${oddsToday} · Month ${oddsMonth}/${oddsBudget} · Last ${adminSportsEscape_(health.lastOddsRefresh || oddsUsage.LastRefreshStatus || "Never")}
            </div>

            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap:8px;">
              ${adminRenderSportsNumberField_("Cooldown min", "sportsOddsCooldown", leagueCode, league.oddsCooldownMinutes, 240, 30, 10080, "oddsCooldown", controlsDisabled)}
              ${adminRenderSportsNumberField_("Odds/day", "sportsOddsDaily", leagueCode, league.oddsDailyMaxPulls, 2, 0, 24, "oddsDaily", controlsDisabled)}
              ${adminRenderSportsNumberField_("Odds/month", "sportsOddsMonthly", leagueCode, league.oddsMonthlyMaxPulls, 30, 0, 500, "oddsMonthly", controlsDisabled)}
            </div>

            <div class="sports-league-actions">
              ${adminSportsActionButton_("Refresh Odds Now", "admin-small-button secondary", "adminRefreshSportsOddsLeague('" + leagueCode + "')", "refreshOdds", leagueCode, controlsDisabled)}
            </div>
          `;

          const archiveBody = `
            <div class="admin-sub" style="margin-bottom:8px;">
              Games ${health.liveGames || 0} · Scores ${health.liveScores || 0} · Ready archive ${health.scoreArchiveCandidates || 0} · Snapshot cleanup ${health.snapshotArchiveCandidates || 0} · Log trim ${health.logTrimCandidates || 0}
            </div>

            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px;">
              ${adminRenderSportsNumberField_("Archive days", "sportsArchiveDays", leagueCode, league.archiveAfterDays || health.archiveAfterDays, 30, 1, 365, "archiveDays", controlsDisabled)}
              ${adminRenderSportsSelectField_("Archive mode", "sportsArchiveMode", leagueCode, league.archiveMode || "MOVE", [{ value: "MOVE", label: "Move" }, { value: "COPY", label: "Copy" }], "archiveMode", controlsDisabled)}
              ${adminRenderSportsNumberField_("Log days", "sportsLogDays", leagueCode, league.keepLogsDays || health.keepLogsDays, 14, 1, 365, "logDays", controlsDisabled)}
            </div>

            <div class="sports-league-actions">
              ${adminSportsActionButton_("Preview Archive", "admin-small-button secondary", "adminPreviewSportsLeagueArchive('" + leagueCode + "')", "previewArchive", leagueCode, controlsDisabled)}
              ${adminSportsActionButton_("Run Archive Now", "admin-small-button", "adminRunSportsLeagueArchiveNow('" + leagueCode + "', '" + sport + "')", "runArchive", leagueCode, controlsDisabled)}
            </div>
          `;

          return `
            <details
              class="admin-user-card"
              data-sports-league="${leagueKey}"
              ${openAttr}
            >

              <summary class="admin-user-header" style="cursor:pointer; gap:10px; align-items:flex-start;">

                <div style="min-width:0; flex:1;">
                  <div class="sports-league-topline">
                    <strong>
                      ${leagueCode.toUpperCase()} ${league.seasonTitle || league.season ? "· " + adminSportsEscape_(league.seasonTitle || league.season) : ""}
                    </strong>
                    ${leagueToggleControl}
                  </div>

                  <div class="admin-sub">
                    ${sport}
                    · ${leagueOn ? "League ON" : "League OFF"}
                    · Season ${phaseLabel}
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
                Last score ${adminSportsEscape_(health.lastScoreRefresh || "") || "Never"}
                · Last odds ${adminSportsEscape_(health.lastOddsRefresh || oddsUsage.LastRefreshStatus || "") || "Never"}
              </div>

              ${adminSportsSection_("Season", "seasonSection", leagueCode, seasonBody, true)}
              ${adminSportsSection_("Scoring", "scoringSection", leagueCode, scoringBody, false)}
              ${adminSportsSection_("Snapshots", "snapshotsSection", leagueCode, snapshotsBody, false, snapshotsHeaderControl)}
              ${adminSportsSection_("Odds", "oddsSection", leagueCode, oddsBody, false, oddsHeaderControl)}
              ${adminSportsSection_("Archive", "archiveSection", leagueCode, archiveBody, false, archiveHeaderControl)}

              <div class="sports-league-actions">
                ${adminSportsActionButton_("Defaults", "admin-small-button secondary", "adminApplySportsLeagueDefaults('" + leagueCode + "')", "defaults", leagueCode, "")}
                ${adminSportsActionButton_("Save", "admin-small-button", "adminSaveSportsScoreLeagueSettings('" + leagueCode + "', '" + sport + "')", "save", leagueCode, "")}
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
            value="14"
            min="1"
            max="30"
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
  sport,
  options
) {

  options =
    options || {};

  function leagueEl_(prefix) {
    return document.getElementById(
      adminSportsInputId_(prefix, league)
    );
  }

  function leagueDateValue_(prefix) {
    const el =
      leagueEl_(prefix);

    return el ? el.value : "";
  }

  function leagueChecked_(prefix, fallback) {
    const el =
      leagueEl_(prefix);

    return el ? el.checked : !!fallback;
  }

  function leagueValue_(prefix, fallback) {
    const el =
      leagueEl_(prefix);

    if (!el || el.value === "") {
      return fallback;
    }

    return el.value;
  }

  const leagueKey =
    adminSportsKey_(league);

  const isCollegeLeague =
    [
      "college-football",
      "mens-college-basketball",
      "womens-college-basketball"
    ].indexOf(leagueKey) !== -1;

  const leagueActive =
    options.overrideSeasonActive === undefined
      ? leagueChecked_("sportsSeasonActive", true)
      : !!options.overrideSeasonActive;

  if (!options.silent) {
    adminSportsMessage_(
      "Saving league settings for " + league + "...",
      false
    );
  }

  const res =
    await apiAdminUpdateSportsLeagueSetting(
      league,
      leagueActive,
      {
        sport: sport,
        pollPreGameMinutes: leagueValue_("sportsPre", 60),
        pollLiveMinutes: leagueValue_("sportsLive", 5),
        pollFinalMinutes: leagueValue_("sportsFinal", 120),
        savePeriodSnapshots: leagueActive
          ? leagueChecked_("sportsSnapshots", false)
          : false,
        season: leagueValue_("sportsSeasonTitle", ""),
        seasonTitle: leagueValue_("sportsSeasonTitle", ""),
        seasonYear: leagueValue_("sportsSeasonYear", adminSportsSeasonYear_(leagueValue_("sportsSeasonTitle", ""))),
        scheduleSource: leagueValue_("sportsScheduleSource", "HYBRID"),
        scheduleBatchDays: leagueValue_("sportsScheduleBatchDaysLeague", isCollegeLeague ? 7 : 14),
        espnSeasonTypesEnabled: leagueChecked_("sportsESPNSeasonTypesEnabled", true),
        espnPreseasonType: leagueValue_("sportsESPNPreseasonType", 1),
        espnRegularSeasonType: leagueValue_("sportsESPNRegularType", 2),
        espnPostseasonType: leagueValue_("sportsESPNPostseasonType", 3),
        collegeCoverageMode: leagueValue_("sportsCollegeCoverageMode", "ALL_D1"),
        espnGroupIds: leagueValue_("sportsESPNGroupIds", ""),
        espnResultLimit: leagueValue_("sportsESPNResultLimit", 500),
        selectedTeamIds: leagueValue_("sportsSelectedTeamIds", ""),
        seasonActive: leagueActive,
        seasonStartDate: leagueDateValue_("sportsSeasonStart"),
        seasonEndDate: leagueDateValue_("sportsSeasonEnd"),
        regularSeasonStartDate: leagueDateValue_("sportsRegularStart"),
        regularSeasonEndDate: leagueDateValue_("sportsRegularEnd"),
        preseasonEnabled: leagueChecked_("sportsPreseasonEnabled", false),
        preseasonStartDate: leagueChecked_("sportsPreseasonEnabled", false) ? leagueDateValue_("sportsPreseasonStart") : "",
        preseasonEndDate: leagueChecked_("sportsPreseasonEnabled", false) ? leagueDateValue_("sportsPreseasonEnd") : "",
        postseasonEnabled: leagueChecked_("sportsPostseasonEnabled", false),
        postseasonStartDate: leagueChecked_("sportsPostseasonEnabled", false) ? leagueDateValue_("sportsPostseasonStart") : "",
        postseasonEndDate: leagueChecked_("sportsPostseasonEnabled", false) ? leagueDateValue_("sportsPostseasonEnd") : "",
        tournamentEnabled: leagueChecked_("sportsTournamentEnabled", false),
        tournamentStartDate: leagueChecked_("sportsTournamentEnabled", false) ? leagueDateValue_("sportsTournamentStart") : "",
        tournamentEndDate: leagueChecked_("sportsTournamentEnabled", false) ? leagueDateValue_("sportsTournamentEnd") : "",
        bowlEnabled: leagueChecked_("sportsBowlEnabled", false),
        bowlStartDate: leagueChecked_("sportsBowlEnabled", false) ? leagueDateValue_("sportsBowlStart") : "",
        bowlEndDate: leagueChecked_("sportsBowlEnabled", false) ? leagueDateValue_("sportsBowlEnd") : "",
        oddsEnabled: leagueActive
          ? leagueChecked_("sportsOddsEnabled", true)
          : false,
        oddsCooldownMinutes: leagueValue_("sportsOddsCooldown", 240),
        oddsDailyMaxPulls: leagueValue_("sportsOddsDaily", 2),
        oddsMonthlyMaxPulls: leagueValue_("sportsOddsMonthly", 30),
        snapshotRetentionDays: leagueValue_("sportsSnapshotDays", 14),
        archiveEnabled: leagueChecked_("sportsArchiveEnabled", false),
        archiveAfterDays: leagueValue_("sportsArchiveDays", 30),
        archiveMode: leagueValue_("sportsArchiveMode", "MOVE"),
        keepSnapshotsDays: leagueValue_("sportsSnapshotDays", 14),
        keepLogsDays: leagueValue_("sportsLogDays", 14)
      }
    );

  if (!options.silent) {
    adminSportsMessage_(
      res && res.success
        ? "Smart poll settings saved. Sports Controls stayed open."
        : (res && (res.error || res.message)) ||
          "Unable to save smart poll settings.",
      !(res && res.success)
    );
  }

  return res;

}


function adminApplySportsLeagueDefaults(
  league
) {

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsSeasonActive", league),
    true
  );


  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsESPNSeasonTypesEnabled", league),
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

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsArchiveEnabled", league),
    false
  );

  [
    "Preseason",
    "Postseason",
    "Tournament",
    "Bowl"
  ].forEach(function(phasePrefix) {
    adminSportsSetCheckbox_(
      adminSportsInputId_("sports" + phasePrefix + "Enabled", league),
      false
    );

    adminToggleSportsPhase_(league, phasePrefix);
  });

  const seasonEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonTitle", league)
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

  const regularStartEl =
    document.getElementById(
      adminSportsInputId_("sportsRegularStart", league)
    );

  const regularEndEl =
    document.getElementById(
      adminSportsInputId_("sportsRegularEnd", league)
    );

  if (seasonStartEl) {
    seasonStartEl.value = seasonYear + "-01-01";
  }

  if (seasonEndEl) {
    seasonEndEl.value = seasonYear + "-12-31";
  }

  if (regularStartEl) {
    regularStartEl.value = seasonYear + "-01-01";
  }

  if (regularEndEl) {
    regularEndEl.value = seasonYear + "-12-31";
  }

  const defaults = {
    sportsPre: 60,
    sportsLive: 5,
    sportsFinal: 120,
    sportsOddsCooldown: 240,
    sportsOddsDaily: 2,
    sportsOddsMonthly: 30,
    sportsArchiveDays: 30,
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

  const archiveModeEl =
    document.getElementById(
      adminSportsInputId_("sportsArchiveMode", league)
    );

  if (archiveModeEl) {
    archiveModeEl.value = "MOVE";
  }

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

  const seasonActiveInputId =
    adminSportsInputId_("sportsSeasonActive", league);

  const previousSeasonActive =
    adminSportsIsChecked_(seasonActiveInputId);

  adminSportsSetCheckbox_(
    seasonActiveInputId,
    active
  );

  if (!active) {
    adminSportsSetCheckbox_(
      adminSportsInputId_("sportsOddsEnabled", league),
      false
    );

    adminSportsSetCheckbox_(
      adminSportsInputId_("sportsSnapshots", league),
      false
    );
  }

  const res =
    await adminSaveSportsScoreLeagueSettings(
      league,
      sport,
      {
        silent: true,
        overrideSeasonActive: active
      }
    );

  adminSportsMessage_(
    res && res.success
      ? (active
        ? "League ON saved to SportsSettings."
        : "League OFF saved to SportsSettings. Scores, odds, and snapshots are off for this league.")
      : (res && (res.error || res.message)) ||
        "Unable to update league state.",
    !(res && res.success)
  );

  if (res && res.success) {
    adminSportsSetCheckbox_(
      seasonActiveInputId,
      active
    );

    adminSportsMarkDashboardStale_(
      "Saved. League state changed. Use Reload Sports Controls when you want refreshed counts/status."
    );
  } else {
    adminSportsSetCheckbox_(
      seasonActiveInputId,
      previousSeasonActive
    );
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
    adminSportsMarkDashboardStale_();
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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

      adminSportsMarkDashboardStale_();
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

    adminSportsMarkDashboardStale_();

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Unable to run full sports sync.",
      true
    );

  }

}

async function adminToggleSportsAutomation(
  enabled
) {

  const ok =
    window.confirm(
      enabled
        ? "Turn Smart Sports Automation ON?"
        : "Turn Smart Sports Automation OFF?"
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    enabled
      ? "Enabling Smart Sports Automation..."
      : "Disabling Smart Sports Automation...",
    false
  );

  try {

    const res =
      enabled
        ? await apiAdminInstallSmartSportsAutomation()
        : await apiAdminRemoveSmartSportsAutomation();

    adminSportsMessage_(
      res && res.success
        ? (enabled
          ? "Smart Sports Automation Enabled."
          : "Smart Sports Automation Disabled.")
        : (res && (res.error || res.message)) ||
          "Unable to update Smart Sports Automation.",
      !(res && res.success)
    );

    adminSportsMarkDashboardStale_();

    return res;

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Unable to update Smart Sports Automation.",
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

    adminSportsMarkDashboardStale_();

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

    adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

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

  adminSportsMarkDashboardStale_();

}  

async function adminCreateSportsLeagueSeasonJobs(
  league,
  sport
) {

  const seasonEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonTitle", league)
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

  const seasonYearEl =
    document.getElementById(
      adminSportsInputId_("sportsSeasonYear", league)
    );

  const sourceEl =
    document.getElementById(
      adminSportsInputId_("sportsScheduleSource", league)
    );

  const year =
    seasonYearEl && seasonYearEl.value
      ? seasonYearEl.value
      : adminSportsSeasonYear_(season);

  const startDate =
    startEl && startEl.value
      ? startEl.value
      : year + "-01-01";

  const endDate =
    endEl && endEl.value
      ? endEl.value
      : year + "-12-31";

  const batchDaysEl =
    document.getElementById(
      adminSportsInputId_("sportsScheduleBatchDaysLeague", league)
    );

  const batchDays =
    batchDaysEl && batchDaysEl.value
      ? batchDaysEl.value
      : (league === "college-football" || league === "mens-college-basketball" || league === "womens-college-basketball" ? 7 : 14);

  const ok =
    window.confirm(
      "Build schedule job for " +
      league +
      " from " +
      startDate +
      " to " +
      endDate +
      " using " +
      batchDays +
      " day batches? This creates a league-specific season job and does not pull odds."
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
      batchDays,
      {
        league: league,
        sport: sport,
        season: season,
        seasonYear: year,
        scheduleSource: sourceEl && sourceEl.value ? sourceEl.value : "HYBRID",
        seasonName: league + " " + season
      }
    );

  adminSportsMessage_(
    res && res.success
      ? (res.message || ("Schedule job ready for " + league + ". New jobs: " + (res.newJobs || 0) + ", updated jobs: " + (res.updatedJobs || 0)))
      : (res && (res.error || res.message)) ||
        "Unable to create schedule job.",
    !(res && res.success)
  );

  if (res && res.success) {
    adminSportsMarkDashboardStale_();
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

async function adminRunSportsLeagueArchiveNow(
  league,
  sport
) {

  const ok =
    window.confirm(
      "Save current archive settings and run archive now for " +
      league +
      "? Use COPY mode first if you are testing."
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    "Saving settings before archive for " + league + "...",
    false
  );

  const saveRes =
    await adminSaveSportsScoreLeagueSettings(
      league,
      sport || "",
      { silent: true }
    );

  if (!saveRes || saveRes.success === false) {
    adminSportsMessage_(
      (saveRes && (saveRes.error || saveRes.message)) ||
      "Unable to save archive settings before running archive.",
      true
    );
    return;
  }

  adminSportsMessage_(
    "Running archive for " + league + "...",
    false
  );

  const res =
    await apiAdminRunSportsArchiveNow(
      league
    );

  if (!res || res.success === false) {
    const firstError =
      res && res.errors && res.errors.length
        ? res.errors[0].league + ": " + res.errors[0].error
        : "";

    adminSportsMessage_(
      (res && (res.error || res.message)) ||
      firstError ||
      "Unable to run archive.",
      true
    );
    return;
  }

  const totalChanged =
    Number(res.scoresCopied || 0) +
    Number(res.scoresRemoved || 0) +
    Number(res.snapshotsCopied || 0) +
    Number(res.snapshotsRemoved || 0);

  let archiveMessage =
    "Archive complete for " + league +
      ": scores copied " + (res.scoresCopied || 0) +
      ", scores removed " + (res.scoresRemoved || 0) +
      ", snapshots copied " + (res.snapshotsCopied || 0) +
      ", snapshots removed " + (res.snapshotsRemoved || 0) + ".";

  if (!totalChanged) {
    archiveMessage +=
      " No eligible rows were old enough to archive. Try Preview Archive or lower Archive days/Snapshot days for testing.";
  }

  adminSportsMessage_(
    archiveMessage,
    false
  );

  adminSportsMarkDashboardStale_();

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
    adminSportsMarkDashboardStale_();
  }

}
