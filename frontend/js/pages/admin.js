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