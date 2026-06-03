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

          <div
            id="adminMessage"
            class="admin-message"
          ></div>

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

      <h1>Manage Games</h1>

      <div class="admin-section">

        <div class="admin-section-header">
          <div>
            <h2>Games Panel</h2>
            <p class="admin-sub">
              Create and configure prediction, confidence, wager, and ranking games.
            </p>
          </div>

          <button
            class="button admin-button secondary"
            onclick="navigate('admin')"
          >
            Back to Admin
          </button>
        </div>

        ${renderAdminGameForm(
          null,
          gameTypes
        )}

        <div class="admin-games-list">
          ${games.map(game =>
            renderAdminGameForm(
              game,
              gameTypes
            )
          ).join("")}
        </div>

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
      themeColor: "",
      icon: "",
      sortOrder: 999,
      status: "",
      lockAllPicks: false,
      showLeaderboard: true,
      showResultsBeforeLock: false,
      resultsFinalized: false,
      votingLocked: false
    };

  return `
    <form
      class="card admin-card admin-game-card"
      onsubmit="adminSaveGameFromForm(event, this)"
    >

      <div class="admin-card-header">
        <div>
          <h3>
            ${isNew ? "Create New Game" : escapeHtml_(game.name || game.gameId)}
          </h3>
          <p class="muted">
            ${isNew ? "Add a new game shell." : escapeHtml_(game.gameId)}
          </p>
        </div>

        <button
          type="button"
          class="secondary-btn"
          onclick="adminToggleGameAdvanced(this)"
        >
          Advanced
        </button>
      </div>

      <div class="form-grid">

        <label>
          Game Name
          <input
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

      <div class="admin-game-advanced hidden">

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

        </div>

        <h4>Display</h4>

        <div class="form-grid">

          <label>
            Theme Color
            <input
              name="themeColor"
              value="${escapeHtml_(game.themeColor || "")}"
              placeholder="#c8a24a"
            />
          </label>

          <label>
            Icon
            <input
              name="icon"
              value="${escapeHtml_(game.icon || "")}"
              placeholder="🏆"
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

      </div>

      <div class="admin-card-actions">

         <button type="submit">
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

  const res =
    await apiAdminSaveGame(
      game
    );

  if (
    !res ||
    res.success === false
  ) {

    alert(
      "Could not save game: " +
      (
        res && res.error
          ? res.error
          : res && res.message
            ? res.message
            : "Unknown error"
      )
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

    themeColor:
      form.themeColor.value.trim(),

    icon:
      form.icon.value.trim(),

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

    form.predictionEnabled.checked = true;
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
  
    const res =
      await apiAdminUpdateCategorySetting(
        categoryId,
        {
          points:
            pointsInput
              ? pointsInput.value
              : "",
          winnerNomineeId:
            winnerInput
              ? winnerInput.value
              : ""
        }
      );
  
    if (message) {
      message.innerText =
        res.success
          ? "Category saved."
          : res.error || res.message || "Unable to save category.";
    }
  
    if (res.success) {
      await navigate("admin");
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
          locked: locked
        }
      );
  
    if (message) {
      message.innerText =
        res.success
          ? "Category updated."
          : res.error || res.message || "Unable to update category.";
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
  
    if (message) {
      message.innerText =
        res.success
          ? "Winner cleared."
          : res.error || res.message || "Unable to clear winner.";
    }
  
    if (res.success) {
      await navigate("admin");
    }
  
  }

  async function adminCreateUser() {

    const message =
      document.getElementById("adminMessage");
  
    const usernameInput =
      document.getElementById("newUserUsername");
  
    const pinInput =
      document.getElementById("newUserPin");
  
    const avatarInput =
      document.getElementById("newUserAvatar");
  
    const themeColorInput =
      document.getElementById("newUserThemeColor");
  
    const isAdminInput =
      document.getElementById("newUserIsAdmin");
  
    const username =
      usernameInput
        ? usernameInput.value.trim()
        : "";
  
    const pin =
      pinInput
        ? pinInput.value.trim()
        : "";
  
    if (!username) {
      alert("Username is required.");
      return;
    }
  
    if (!pin) {
      alert("PIN is required.");
      return;
    }
  
    if (message) {
      message.innerText =
        "Creating user...";
    }
  
    const res =
      await apiAdminCreateUser({
        username: username,
        pin: pin,
        avatar:
          avatarInput
            ? avatarInput.value.trim()
            : "avatar1",
        themeColor:
          themeColorInput
            ? themeColorInput.value.trim()
            : "#ffcc00",
        isAdmin:
          isAdminInput
            ? isAdminInput.checked
            : false
      });
  
    if (message) {
      message.innerText =
        res.success
          ? "User created."
          : res.error || res.message || "Unable to create user.";
    }
  
    if (res.success) {
      await navigate("admin");
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