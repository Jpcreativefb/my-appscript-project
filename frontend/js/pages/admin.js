async function renderAdminPage() {

  setPageLoadStep(50, "Loading administrator dashboard…");

  const session = getSession();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return `
      <div class="page admin-page">
        <h1>Admin</h1>
        <div class="card admin-card">You do not have admin access.</div>
      </div>
    `;
  }

  // Render the Admin controls immediately. Summary counts are informational and
  // hydrate in the background so a slow Sheets read never blocks Admin use.
  const startup = typeof getStartupPayload === "function" ? (getStartupPayload() || {}) : {};
  const startupGame = startup.game || {};
  const currentGameId = String((typeof APP_STATE !== "undefined" && APP_STATE.gameId) || startup.gameId || "").trim();
  const currentGameName = String(startupGame.name || currentGameId || "Loading…");

  ADMIN_LAZY_DETAILS_CACHE_ = null;
  window.setTimeout(function() {
    adminHydrateSummary_().catch(function(err) {
      console.warn("Admin summary loaded later or was skipped", err);
    });
  }, 0);

  return `
    <div class="page admin-page">
      <div class="admin-section" data-admin-organized="1">

        <div class="card admin-card">
          <div class="admin-label">Current Game</div>
          <div class="admin-value">${escapeHtml_(currentGameName || "No default game")}</div>
          <div class="admin-sub"><span id="adminSummaryGameId">${escapeHtml_(currentGameId || "")}</span></div>

          <div class="admin-grid">
            <div class="card admin-stat"><div class="admin-label">Users</div><div class="admin-number"><span id="adminSummaryUsers">—</span></div></div>
            <div class="card admin-stat"><div class="admin-label">Games</div><div class="admin-number"><span id="adminSummaryGames">—</span></div></div>
            <div class="card admin-stat"><div class="admin-label">Questions</div><div class="admin-number"><span id="adminSummaryCategories">—</span></div></div>
            <div class="card admin-stat"><div class="admin-label">Locked</div><div class="admin-number"><span id="adminSummaryLocked">—</span></div></div>
          </div>

          <div class="admin-actions">
            <button class="button admin-button" onclick="navigate('admin-games')">Manage Games</button>
            <button class="button admin-button secondary" onclick="adminLoadAutomationHealth()">System Health</button>
          </div>
          <div id="adminMessage" class="admin-message"></div>
        </div>

        <details class="card admin-card admin-collapsible-card" open>
          <summary class="admin-card-summary">
            <div><h2>🎮 Games & Design</h2><div class="admin-sub">Create, configure, test, style and launch games.</div></div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-actions">
              <button class="button admin-button" onclick="navigate('admin-games')">Manage Games & Templates</button>
              <button class="button admin-button secondary" onclick="navigate('admin-appearance')">Appearance Manager</button>
              <button class="button admin-button secondary" onclick="navigate('admin-awards')">Awards Manager</button>
              <button class="button admin-button secondary" onclick="navigate('admin-reality-tv')">Reality TV Manager</button>
              <button class="button admin-button secondary" onclick="window.location.href='./sports.html'">Sports Scores & Game Builder</button>
              <button class="button admin-button secondary" onclick="adminOpenSportsControls()">Sports Engine Controls</button>
            </div>
            <div id="adminSportsControlMessage" class="admin-message"></div>
            <div id="adminSportsControlPanel" class="admin-list"></div>
          </div>
        </details>

        <details class="card admin-card admin-collapsible-card">
          <summary class="admin-card-summary">
            <div><h2>🏆 Results & Scoring</h2><div class="admin-sub">Approve external results or open manual result controls only when needed.</div></div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-actions">
              <button class="button admin-button" onclick="adminExternalResultsInboxRefresh(this)">Load External Results Inbox</button>
              <button class="button admin-button secondary" onclick="adminLoadLegacyControls_('categories')">Manual Category Results</button>
            </div>
            <div id="adminExternalResultsInboxStatus" class="admin-message">Status not loaded.</div>
            <div class="admin-actions">
              <button class="button admin-button secondary" onclick="adminExternalResultsInboxReconcile(this)">Sync Reality Status</button>
              <button class="button admin-button secondary" onclick="adminExternalResultsInboxValidate(this)">Validate Ready</button>
              <button class="button admin-button" onclick="adminExternalResultsInboxApply(this)">Apply Validated</button>
              <button class="button admin-button secondary" onclick="adminExternalResultsInboxRetry(this)">Retry Errors</button>
            </div>
            <div id="adminExternalResultsInboxBatches" class="admin-list"></div>
            <div id="adminLazyCategoryControls" class="admin-list"></div>
          </div>
        </details>

        <details class="card admin-card admin-collapsible-card">
          <summary class="admin-card-summary">
            <div><h2>👥 Players & Leagues</h2><div class="admin-sub">Manage players, admins, access and private leagues.</div></div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-actions">
              <button class="button admin-button" onclick="navigate('leagues')">League Manager</button>
              <button class="button admin-button secondary" onclick="adminLoadLegacyControls_('users')">Load User Controls</button>
            </div>
            <div id="adminLazyUserControls" class="admin-list"></div>
          </div>
        </details>

        <details class="card admin-card admin-collapsible-card" id="adminSystemHealthSection">
          <summary class="admin-card-summary">
            <div><h2>⚙️ System & Automation</h2><div class="admin-sub">Trigger usage, automation health, storage and caches.</div></div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-actions">
              <button class="button admin-button" onclick="adminLoadAutomationHealth()">Check Automation Health</button>
              <button class="button admin-button secondary" onclick="adminCheckStorageHealth('${escapeJs(currentGameId || "")}')">Check Storage Health</button>
              <button class="button admin-button secondary" onclick="adminClearCaches()">Clear App Caches</button>
            </div>
            <div id="adminAutomationHealth" class="admin-storage-health"></div>
            <div id="adminStorageHealth" class="admin-storage-health"></div>
          </div>
        </details>

        <details class="card admin-card admin-collapsible-card">
          <summary class="admin-card-summary">
            <div><h2>🛠 Advanced / Repair</h2><div class="admin-sub">Setup, migrations and repair tools. Normal game administration should not require these.</div></div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-actions">
              <button class="button admin-button secondary" onclick="adminSetupLiveResultsSystem()">Setup Live Results</button>
              <button class="button admin-button secondary" onclick="adminSetupNormalizedStorage()">Setup / Migrate Storage</button>
            </div>
          </div>
        </details>

      </div>
    </div>
  `;
}

async function adminHydrateSummary_() {
  const res = await apiAdminSummary(false);
  if (!res || res.success === false) return res;

  const counts = res.counts || {};
  const gameName = res.game && res.game.name ? res.game.name : (res.gameId || "No default game");

  const valueNode = document.querySelector(".admin-page .admin-value");
  if (valueNode) valueNode.textContent = gameName;

  const map = {
    adminSummaryGameId: res.gameId || "",
    adminSummaryUsers: Number(counts.users || 0),
    adminSummaryGames: Number(counts.games || 0),
    adminSummaryCategories: Number(counts.categories || 0),
    adminSummaryLocked: Number(counts.lockedCategories || 0)
  };
  Object.keys(map).forEach(function(id) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(map[id]);
  });

  return res;
}

var ADMIN_LAZY_DETAILS_CACHE_ = null;

function adminCategoryControlsHtml_(categories) {
  categories = Array.isArray(categories) ? categories : [];
  if (!categories.length) return `<div class="admin-sub">No questions/categories found for the current game.</div>`;

  return `
    <h3>Manual Category Results</h3>
    ${categories.map(function(cat) {
      return `
        <div class="admin-category-card">
          <div class="admin-category-header">
            <div><strong>${escapeHtml_(cat.name || cat.id)}</strong><div class="admin-sub">${escapeHtml_(cat.id || "")} · ${(cat.nominees || []).length} nominees</div></div>
            <div class="admin-pill ${cat.locked ? "locked" : ""}">${cat.locked ? "Locked" : "Open"}</div>
          </div>
          <div class="admin-control-grid">
            <label class="admin-field"><span>Points</span><input type="number" id="points-${escapeHtml_(cat.id)}" value="${Number(cat.points || 0)}" min="0"></label>
            <label class="admin-field"><span>Result Status</span>
              <select id="result-status-${escapeHtml_(cat.id)}" onchange="adminToggleCategoryResultStatus('${escapeJs(cat.id)}')">
                <option value="pending" ${cat.resultStatus === "pending" ? "selected" : ""}>Pending / Not Settled</option>
                <option value="winner" ${cat.resultStatus === "winner" ? "selected" : ""}>Final — Winner Selected</option>
                <option value="push" ${cat.resultStatus === "push" ? "selected" : ""}>Push — Return Stakes</option>
                <option value="cancelled" ${cat.resultStatus === "cancelled" ? "selected" : ""}>Cancelled / No Contest</option>
              </select>
            </label>
            <label class="admin-field"><span>Winner Nominee</span>
              <select id="winner-${escapeHtml_(cat.id)}" ${cat.resultStatus === "winner" ? "" : "disabled"}>
                <option value="">No winner selected</option>
                ${(cat.nominees || []).map(function(nominee) {
                  const selected = String(nominee.id || "").trim().toLowerCase() === String(cat.winnerNomineeId || "").trim().toLowerCase();
                  return `<option value="${escapeHtml_(nominee.id || "")}" ${selected ? "selected" : ""}>${escapeHtml_(nominee.name || nominee.id)}</option>`;
                }).join("")}
              </select>
            </label>
          </div>
          <div class="admin-actions">
            <button class="admin-small-button" onclick="adminSaveCategory('${escapeJs(cat.id)}')">Save</button>
            <button class="admin-small-button secondary" onclick="adminToggleCategoryLock('${escapeJs(cat.id)}', ${cat.locked ? "false" : "true"})">${cat.locked ? "Unlock" : "Lock"}</button>
            <button class="admin-small-button danger" onclick="adminClearWinner('${escapeJs(cat.id)}')">Reset to Pending</button>
          </div>
        </div>`;
    }).join("")}
  `;
}

function adminUserControlsHtml_(users) {
  users = Array.isArray(users) ? users : [];
  return `
    <div class="admin-user-create">
      <h3>Create User</h3>
      <div class="admin-control-grid">
        <label class="admin-field"><span>Username</span><input type="text" id="newUserUsername" placeholder="username"></label>
        <label class="admin-field"><span>PIN</span><input type="text" id="newUserPin" placeholder="1234"></label>
        <label class="admin-field"><span>Avatar</span><input type="text" id="newUserAvatar" value="avatar1"></label>
        <label class="admin-field"><span>Theme Color</span><input type="text" id="newUserThemeColor" value="#ffcc00"></label>
      </div>
      <label class="admin-check-row"><input type="checkbox" id="newUserIsAdmin"><span>Make admin</span></label>
      <button class="admin-small-button" onclick="adminCreateUser()">Create User</button>
    </div>
    <hr class="admin-divider">
    <h3>Existing Users</h3>
    ${users.length ? users.map(function(user) {
      return `
        <div class="admin-user-card">
          <div class="admin-user-header">
            <div><strong>${escapeHtml_(user.username || "")}</strong><div class="admin-sub">${user.isAdmin ? "Administrator" : "Player"} · ${user.active === false ? "Inactive" : "Active"}</div></div>
            <div class="admin-pill ${user.active === false ? "inactive" : user.isAdmin ? "admin" : ""}">${user.active === false ? "Inactive" : user.isAdmin ? "Admin" : "Player"}</div>
          </div>
          <div class="admin-actions">
            <button class="admin-small-button secondary" onclick="adminPromptResetPin('${escapeJs(user.username)}')">Reset PIN</button>
            <button class="admin-small-button ${user.isAdmin ? "danger" : "secondary"}" onclick="adminToggleUserAdmin('${escapeJs(user.username)}', ${user.isAdmin ? "false" : "true"})">${user.isAdmin ? "Remove Admin" : "Make Admin"}</button>
            <button class="admin-small-button ${user.active === false ? "secondary" : "danger"}" onclick="adminToggleUserActive('${escapeJs(user.username)}', ${user.active === false ? "true" : "false"})">${user.active === false ? "Reactivate" : "Deactivate"}</button>
          </div>
        </div>`;
    }).join("") : `<div class="admin-sub">No users found.</div>`}
  `;
}

async function adminLoadLegacyControls_(target) {
  const categoryHost = document.getElementById("adminLazyCategoryControls");
  const userHost = document.getElementById("adminLazyUserControls");
  const host = target === "users" ? userHost : categoryHost;
  if (!host) return;
  host.innerHTML = `<div class="admin-sub">Loading…</div>`;

  try {
    if (!ADMIN_LAZY_DETAILS_CACHE_) {
      const details = await apiAdminSummary(true);
      if (!details || details.success === false) throw new Error((details && (details.error || details.message)) || "Could not load admin controls.");
      ADMIN_LAZY_DETAILS_CACHE_ = details;
    }
    if (target === "users") userHost.innerHTML = adminUserControlsHtml_(ADMIN_LAZY_DETAILS_CACHE_.users || []);
    else categoryHost.innerHTML = adminCategoryControlsHtml_(ADMIN_LAZY_DETAILS_CACHE_.categories || []);
  } catch (err) {
    host.innerHTML = `<div class="admin-message error">${escapeHtml_(err && err.message ? err.message : String(err))}</div>`;
  }
}

function adminAutomationHealthRender_(res) {
  const host = document.getElementById("adminAutomationHealth");
  if (!host) return;
  if (!res || res.success === false) {
    host.innerHTML = `<div class="admin-message error">${escapeHtml_((res && (res.error || res.message)) || "Could not read automation health.")}</div>`;
    return;
  }

  const level = String(res.level || "healthy");
  const duplicates = Array.isArray(res.duplicates) ? res.duplicates : [];
  const durable = Array.isArray(res.durableTriggers) ? res.durableTriggers : [];
  const transient = Array.isArray(res.transientTriggers) ? res.transientTriggers : [];
  const others = Array.isArray(res.otherTriggers) ? res.otherTriggers : [];

  host.innerHTML = `
    <div class="admin-message ${level === "critical" ? "error" : level === "warning" ? "warning" : "success"}">
      <b>${Number(res.totalTriggers || 0)} / ${Number(res.triggerLimit || 20)}</b> Apps Script trigger slots used · <b>${Number(res.remainingSlots || 0)}</b> available.
      ${Number(res.duplicateDurableCount || 0) ? ` ${Number(res.duplicateDurableCount)} durable worker(s) have duplicates.` : " No duplicate durable workers detected."}
    </div>
    <div class="admin-list">
      ${durable.concat(transient).concat(others).map(function(row) {
        return `<div class="admin-list-row"><div><b>${escapeHtml_(row.label || row.handler)}</b><div class="admin-sub">${escapeHtml_(row.handler || "")} · ${escapeHtml_(row.kind || "")}</div></div><span class="admin-pill">${escapeHtml_(row.eventType || "Trigger")}</span></div>`;
      }).join("") || `<div class="admin-sub">No project triggers installed.</div>`}
    </div>
    ${duplicates.some(function(item) { return item.removable; }) ? `<button class="button admin-button secondary" onclick="adminCleanupAutomationDuplicates()">Remove Safe Duplicate Triggers</button>` : ""}
  `;
}

async function adminLoadAutomationHealth() {
  const section = document.getElementById("adminSystemHealthSection");
  if (section) section.open = true;
  const host = document.getElementById("adminAutomationHealth");
  if (host) host.innerHTML = `<div class="admin-sub">Checking automation health…</div>`;
  const res = await apiAdminGetAutomationHealth();
  adminAutomationHealthRender_(res);
}

async function adminCleanupAutomationDuplicates() {
  if (!confirm("Remove duplicate durable automation triggers while keeping one copy of each worker? Temporary Reality TV continuation triggers will not be touched.")) return;
  const res = await apiAdminCleanupDuplicateAutomationTriggers();
  adminAutomationHealthRender_(res);
}

function adminEnhanceMainAdminSections() {
  // v1.2.19-rc1 renders a purpose-built organized dashboard. Do not wrap its
  // cards again and do not auto-poll heavy result services on page startup.
  const root = document.querySelector(".admin-page > .admin-section");
  if (!root || root.dataset.adminOrganized === "1") return;
}

/* =========================
   ADMIN GAMES PANEL
========================= */


function adminExternalResultsInboxCount_(counts, key) {
  return Number((counts || {})[key] || 0);
}

function adminExternalResultsInboxRender_(res) {
  const status = document.getElementById("adminExternalResultsInboxStatus");
  const batches = document.getElementById("adminExternalResultsInboxBatches");
  if (!status || !res) return;
  const counts = res.counts || {};
  const ready = adminExternalResultsInboxCount_(counts, "READY");
  const validated = adminExternalResultsInboxCount_(counts, "VALIDATED");
  const staged = adminExternalResultsInboxCount_(counts, "STAGED_REALITY");
  const applied = adminExternalResultsInboxCount_(counts, "APPLIED");
  const rejected = adminExternalResultsInboxCount_(counts, "REJECTED");
  const errors = adminExternalResultsInboxCount_(counts, "ERROR");
  status.className = "admin-message " + (errors || rejected ? "warning" : (ready || validated || staged ? "" : "success"));
  status.innerHTML = `<b>${ready}</b> ready · <b>${validated}</b> validated · <b>${staged}</b> staged to Reality TV · <b>${applied}</b> applied · <b>${rejected}</b> rejected · <b>${errors}</b> errors · Automatic apply OFF`;
  if (!batches) return;
  const rows = Array.isArray(res.batches) ? res.batches.slice(0, 12) : [];
  batches.innerHTML = rows.length ? rows.map(function(row) {
    const winners = (row.winnerIds || []).join(", ") || "—";
    const native = row.nativeQueueId
      ? `<div class="admin-sub">Reality queue: ${escapeHtml_(row.nativeQueueId)} · ${escapeHtml_(row.nativeStatus || "PENDING")}</div>`
      : "";
    const error = row.error ? `<div class="admin-sub">${escapeHtml_(row.error)}</div>` : "";
    return `<div class="admin-list-row"><div><b>${escapeHtml_(row.gameId || "Unknown game")}</b> · ${escapeHtml_(row.categoryId || "Unknown category")}<div class="admin-sub">${escapeHtml_(row.provider || "")} · ${escapeHtml_(row.resultKey || "result")} · Winner(s): ${escapeHtml_(winners)}</div>${native}${error}</div><span class="admin-pill">${escapeHtml_(row.status || "")}</span></div>`;
  }).join("") : `<div class="admin-sub">No inbox deliveries yet.</div>`;
}

async function adminExternalResultsInboxRefresh(button, silent) {
  const status = document.getElementById("adminExternalResultsInboxStatus");
  if (!status) return;
  if (!silent) status.textContent = "Refreshing External Results Inbox…";
  if (button) button.disabled = true;
  try {
    const res = await apiAdminGetExternalResultsInboxStatus();
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not read External Results Inbox.");
    adminExternalResultsInboxRender_(res);
  } catch (err) {
    status.className = "admin-message error";
    status.textContent = err && err.message ? err.message : String(err);
  } finally {
    if (button) button.disabled = false;
  }
}

async function adminExternalResultsInboxReconcile(button) {
  if (button) button.disabled = true;
  try {
    const res = await apiAdminReconcileExternalResultsInbox();
    adminExternalResultsInboxRender_((res && res.summary) || res);
  } catch (err) {
    const status = document.getElementById("adminExternalResultsInboxStatus");
    if (status) { status.className = "admin-message error"; status.textContent = err.message || String(err); }
  } finally { if (button) button.disabled = false; }
}

async function adminExternalResultsInboxValidate(button) {
  if (button) button.disabled = true;
  try {
    const res = await apiAdminValidateExternalResultsInbox();
    adminExternalResultsInboxRender_((res && res.summary) || res);
  } catch (err) {
    const status = document.getElementById("adminExternalResultsInboxStatus");
    if (status) { status.className = "admin-message error"; status.textContent = err.message || String(err); }
  } finally { if (button) button.disabled = false; }
}

async function adminExternalResultsInboxApply(button) {
  if (!confirm("Apply all VALIDATED Awards/prediction results and stage validated Reality TV results into the Reality TV Manager? Sports/racing are excluded.")) return;
  if (button) button.disabled = true;
  try {
    const res = await apiAdminApplyExternalResultsInbox();
    adminExternalResultsInboxRender_((res && res.summary) || res);
    const status = document.getElementById("adminExternalResultsInboxStatus");
    if (status && res) status.title = `${Number(res.applied || 0)} applied; ${Number(res.stagedReality || 0)} staged to Reality TV; ${Number(res.errors || 0)} errors.`;
  } catch (err) {
    const status = document.getElementById("adminExternalResultsInboxStatus");
    if (status) { status.className = "admin-message error"; status.textContent = err.message || String(err); }
  } finally { if (button) button.disabled = false; }
}

async function adminExternalResultsInboxRetry(button) {
  if (button) button.disabled = true;
  try {
    const res = await apiAdminRetryExternalResultsInboxErrors();
    adminExternalResultsInboxRender_((res && res.summary) || res);
  } catch (err) {
    const status = document.getElementById("adminExternalResultsInboxStatus");
    if (status) { status.className = "admin-message error"; status.textContent = err.message || String(err); }
  } finally { if (button) button.disabled = false; }
}

async function renderAdminGamesPanel() {

  const responses = await Promise.all([
    apiAdminGetGames(),
    typeof apiAdminGetArchiveDashboard === "function"
      ? apiAdminGetArchiveDashboard().catch(function() {
          return { success: false, games: [] };
        })
      : Promise.resolve({ success: false, games: [] })
  ]);

  const res = responses[0];
  const archiveDashboard = responses[1] || { games: [] };

  APP_STATE.adminArchiveDashboard = {};
  (archiveDashboard.games || []).forEach(function(item) {
    APP_STATE.adminArchiveDashboard[String(item.gameId || "")] = item;
  });

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

        <div class="admin-header-actions">
          <button
            class="admin-small-button secondary"
            onclick="navigate('history')"
          >
            Archived Games
          </button>
          <button
            class="admin-small-button secondary"
            onclick="navigate('admin')"
          >
            Back to Admin
          </button>
        </div>

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
              gameTypes,
              games
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
                  gameTypes,
                  games
                )
              ).join("")}

            </div>

          </div>

        </details>

      </div>

    </div>
  `;

}

function adminCurrentYear_() {
  return new Date().getFullYear();
}

function renderAdminYearOptions_(selectedYear) {
  const currentYear = adminCurrentYear_();
  const selected = Number(selectedYear) || currentYear;
  const years = [];

  for (let year = currentYear - 2; year <= currentYear + 6; year++) {
    years.push(year);
  }

  if (years.indexOf(selected) === -1) {
    years.push(selected);
    years.sort(function(a, b) { return a - b; });
  }

  return years.map(function(year) {
    return `
      <option value="${year}" ${year === selected ? "selected" : ""}>
        ${year}
      </option>
    `;
  }).join("");
}

function adminSlugifyGameId_(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function adminAutoFillGameId(form) {
  if (!form || !form.gameId || form.gameId.readOnly) {
    return;
  }

  if (form.gameId.dataset.touched === "true") {
    return;
  }

  form.gameId.value = adminSlugifyGameId_(form.name ? form.name.value : "");
}

function adminNormalizeThemeColor_(value) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : "#c8a24a";
}

function adminExtractDriveFileId_(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const pathMatch = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  const queryMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) {
    return queryMatch[1];
  }

  return text;
}

function adminNormalizeHeroDriveInput(input, gameId) {
  if (!input) {
    return;
  }

  input.value = adminExtractDriveFileId_(input.value);

  if (typeof adminPreviewGameHeroImage === "function") {
    adminPreviewGameHeroImage(gameId);
  }
}

function adminSyncThemeColorText(form, picker) {
  if (!form || !form.themeColor || !picker) {
    return;
  }

  form.themeColor.value = picker.value;
}

function adminSyncThemeColorPicker(form, input) {
  if (!form || !input) {
    return;
  }

  const picker = form.querySelector('[data-theme-color-picker="true"]');
  if (!picker) {
    return;
  }

  if (/^#[0-9a-f]{6}$/i.test(String(input.value || "").trim())) {
    picker.value = input.value.trim();
  }
}

function adminHelpButton_(title, message) {
  return `
    <span class="admin-help-wrap">
      <button
        type="button"
        class="admin-help-button"
        aria-label="Help: ${escapeHtml_(title)}"
        aria-expanded="false"
        onclick="adminToggleHelpPopover(event, this)"
      >?</button>
      <span class="admin-help-popover" role="tooltip" hidden>
        <strong>${escapeHtml_(title)}</strong>
        <span>${escapeHtml_(message)}</span>
      </span>
    </span>
  `;
}

function adminFieldLabel_(title, message) {
  return `
    <span class="admin-field-label">
      <span>${escapeHtml_(title)}</span>
      ${message ? adminHelpButton_(title, message) : ""}
    </span>
  `;
}

function adminGetHelpPopover_(button) {
  if (!button) {
    return null;
  }

  return button.__adminHelpPopover || button.nextElementSibling || null;
}

function adminRestoreHelpPopover_(button, popover) {
  if (!popover) {
    return;
  }

  const wrap = button && button.isConnected
    ? button.closest(".admin-help-wrap")
    : null;

  if (wrap) {
    wrap.appendChild(popover);
  } else if (popover.parentNode) {
    popover.parentNode.removeChild(popover);
  }
}

function adminCloseHelpPopovers_(exceptButton) {
  document.querySelectorAll(".admin-help-button[aria-expanded='true']")
    .forEach(function(button) {
      if (button === exceptButton) {
        return;
      }

      button.setAttribute("aria-expanded", "false");
      const popover = adminGetHelpPopover_(button);

      if (popover) {
        popover.hidden = true;
        popover.classList.remove("is-open");
        popover.removeAttribute("data-placement");
        popover.style.removeProperty("left");
        popover.style.removeProperty("top");
        popover.style.removeProperty("visibility");
        popover.style.removeProperty("--admin-help-arrow-offset");
        adminRestoreHelpPopover_(button, popover);
      }
    });

  if (!exceptButton) {
    window.__adminActiveHelpButton = null;
  }
}

function adminClampHelpValue_(value, minimum, maximum) {
  if (maximum < minimum) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function adminPositionHelpPopover_(button, popover) {
  if (!button || !popover || popover.hidden || !button.isConnected) {
    return;
  }

  const rect = button.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportWidth = Math.max(240, viewport ? viewport.width : window.innerWidth);
  const viewportHeight = Math.max(240, viewport ? viewport.height : window.innerHeight);
  const margin = 10;
  const gap = 10;

  popover.style.maxWidth = Math.max(200, viewportWidth - (margin * 2)) + "px";
  popover.style.maxHeight = Math.max(150, viewportHeight - (margin * 2)) + "px";
  popover.style.left = margin + "px";
  popover.style.top = margin + "px";
  popover.style.visibility = "hidden";

  const popoverRect = popover.getBoundingClientRect();
  const width = Math.min(popoverRect.width, viewportWidth - (margin * 2));
  const height = Math.min(popoverRect.height, viewportHeight - (margin * 2));
  const centerX = rect.left + (rect.width / 2);
  const centerY = rect.top + (rect.height / 2);

  const candidates = [
    {
      placement: "right",
      left: rect.right + gap,
      top: centerY - (height / 2),
      preference: 4
    },
    {
      placement: "left",
      left: rect.left - width - gap,
      top: centerY - (height / 2),
      preference: 3
    },
    {
      placement: "below",
      left: centerX - (width / 2),
      top: rect.bottom + gap,
      preference: 2
    },
    {
      placement: "above",
      left: centerX - (width / 2),
      top: rect.top - height - gap,
      preference: 1
    }
  ];

  let best = null;

  candidates.forEach(function(candidate) {
    const visibleLeft = Math.max(margin, candidate.left);
    const visibleTop = Math.max(margin, candidate.top);
    const visibleRight = Math.min(viewportWidth - margin, candidate.left + width);
    const visibleBottom = Math.min(viewportHeight - margin, candidate.top + height);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const fullyVisible = visibleWidth >= width - 1 && visibleHeight >= height - 1;
    const score = (visibleWidth * visibleHeight) + (fullyVisible ? 1000000 : 0) + candidate.preference;

    if (!best || score > best.score) {
      best = Object.assign({}, candidate, { score: score });
    }
  });

  const left = adminClampHelpValue_(
    best.left,
    margin,
    viewportWidth - width - margin
  );
  const top = adminClampHelpValue_(
    best.top,
    margin,
    viewportHeight - height - margin
  );

  const arrowOffset = best.placement === "left" || best.placement === "right"
    ? adminClampHelpValue_(centerY - top, 16, Math.max(16, height - 16))
    : adminClampHelpValue_(centerX - left, 16, Math.max(16, width - 16));

  popover.dataset.placement = best.placement;
  popover.style.left = Math.round(left) + "px";
  popover.style.top = Math.round(top) + "px";
  popover.style.setProperty("--admin-help-arrow-offset", Math.round(arrowOffset) + "px");
  popover.style.visibility = "visible";
}

function adminScheduleHelpPopoverPosition_() {
  if (window.__adminHelpPositionFrame) {
    cancelAnimationFrame(window.__adminHelpPositionFrame);
  }

  window.__adminHelpPositionFrame = requestAnimationFrame(function() {
    window.__adminHelpPositionFrame = null;
    const button = window.__adminActiveHelpButton;
    const popover = adminGetHelpPopover_(button);

    if (button && popover && button.getAttribute("aria-expanded") === "true") {
      adminPositionHelpPopover_(button, popover);
    }
  });
}

function adminToggleHelpPopover(event, button) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!button) {
    return;
  }

  const popover = adminGetHelpPopover_(button);
  if (!popover) {
    return;
  }

  button.__adminHelpPopover = popover;
  popover.__adminHelpButton = button;

  const willOpen = button.getAttribute("aria-expanded") !== "true";
  adminCloseHelpPopovers_(willOpen ? button : null);

  button.setAttribute("aria-expanded", willOpen ? "true" : "false");
  popover.hidden = !willOpen;
  popover.classList.toggle("is-open", willOpen);

  if (!willOpen) {
    window.__adminActiveHelpButton = null;
    adminRestoreHelpPopover_(button, popover);
    return;
  }

  window.__adminActiveHelpButton = button;

  // Portal the popup to <body> so card overflow, transforms, and modal
  // containers cannot clip it or change the meaning of position: fixed.
  if (popover.parentElement !== document.body) {
    document.body.appendChild(popover);
  }

  adminScheduleHelpPopoverPosition_();
}

if (typeof document !== "undefined" && !window.__adminHelpDismissBound) {
  window.__adminHelpDismissBound = true;

  document.addEventListener("click", function(event) {
    if (
      !event.target.closest(".admin-help-button") &&
      !event.target.closest(".admin-help-popover")
    ) {
      adminCloseHelpPopovers_();
    }
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      adminCloseHelpPopovers_();
    }
  });

  window.addEventListener("resize", adminScheduleHelpPopoverPosition_);
  window.addEventListener("scroll", adminScheduleHelpPopoverPosition_, true);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", adminScheduleHelpPopoverPosition_);
    window.visualViewport.addEventListener("scroll", adminScheduleHelpPopoverPosition_);
  }
}

function adminCanonicalGameType_(value) {
  const type = String(value || "prediction").trim().toLowerCase();
  return (type === "combo" || type === "hybrid") ? "mixed" : type;
}

function adminBuiltInGameTemplates_() {
  return [
    { id: "prediction", label: "Standard Prediction", type: "prediction", scoringEngine: "manual" },
    { id: "confidence-nfl", label: "NFL Confidence Pool", type: "confidence", scoringEngine: "sports", league: "nfl" },
    { id: "sports-wager", label: "Sports Wager", type: "wager", scoringEngine: "sports" },
    { id: "ranking", label: "Ranking Game", type: "ranking", scoringEngine: "manual" },
    { id: "survivor-manual", label: "Manual Survivor / Elimination", type: "survivor", scoringEngine: "manual", survivorMode: "manual-elimination" },
    { id: "survivor-nfl", label: "NFL Survivor", type: "survivor", scoringEngine: "sports", survivorMode: "sports-survivor", league: "nfl" },
    { id: "streak-nfl", label: "NFL Streak Survivor", type: "survivor", scoringEngine: "sports", survivorMode: "streak-survivor", league: "nfl" },
    { id: "koth", label: "King of the Hill", type: "survivor", scoringEngine: "sports", survivorMode: "king-of-the-hill", league: "nfl" },
    { id: "team-fantasy", label: "Team Fantasy Football", type: "team-fantasy", scoringEngine: "sports", league: "nfl" },
    { id: "voting", label: "Voting / Competition", type: "voting", scoringEngine: "manual" },
    { id: "awards", label: "Awards Show", type: "prediction", scoringEngine: "internet" },
    { id: "reality", label: "Reality Competition", type: "prediction", scoringEngine: "internet" },
    { id: "hybrid", label: "Hybrid / Multi-Mode", type: "mixed", scoringEngine: "mixed" }
  ];
}

function renderAdminGameTemplateOptions_() {
  return `<option value="">Start from Game Type</option>` + adminBuiltInGameTemplates_().map(function(template) {
    return `<option value="${escapeHtml_(template.id)}">${escapeHtml_(template.label)}</option>`;
  }).join("");
}

function adminApplyGameTemplate(select) {
  const form = select && select.form;
  if (!form || !select.value) return;
  const template = adminBuiltInGameTemplates_().filter(function(item) { return item.id === select.value; })[0];
  if (!template) return;

  if (form.type) form.type.value = template.type;
  adminApplyGameTypeDefaults(form);
  if (form.scoringEngine && template.scoringEngine) form.scoringEngine.value = template.scoringEngine;
  if (form.survivorMode && template.survivorMode) form.survivorMode.value = template.survivorMode;
  if (form.survivorLeague && template.league) form.survivorLeague.value = template.league;
  if (form.survivorSport && template.league === "nfl") form.survivorSport.value = "football";

  if (template.id === "awards" && form.description && !form.description.value) {
    form.description.value = "Awards prediction game — build questions in Awards Manager.";
  }
  if (template.id === "reality" && form.description && !form.description.value) {
    form.description.value = "Reality competition game — manage cast and episodes in Reality TV Manager.";
  }

  if (typeof adminUpdateSurvivorRuleFields === "function") adminUpdateSurvivorRuleFields(form);
  adminUpdateGameTypeSections(form);
  adminMarkGameFormDirty(form);
}

function adminCanonicalGameStatus_(value, active, archived) {
  if (archived === true) {
    return "Archived";
  }

  const status = String(value || "").trim().toLowerCase();

  if (status === "setup") {
    return "Setup";
  }

  if (status === "preview") {
    return "Preview";
  }

  if (status === "active" || status === "live") {
    return "Active";
  }

  if (status === "draft") {
    return "Draft";
  }

  return active === true ? "Active" : "Draft";
}

function adminGameTypeFeatureFlags_(form) {
  const type = adminCanonicalGameType_(
    form && form.type ? form.type.value : "prediction"
  );

  const flags = {
    predictionEnabled: false,
    rankingEnabled: false,
    confidenceEnabled: false,
    wagerEnabled: false,
    fixedPointsEnabled: false,
    stakedPointsEnabled: false
  };

  if (["prediction", "head-to-head", "survivor"].indexOf(type) !== -1) {
    flags.predictionEnabled = true;
    flags.fixedPointsEnabled = true;
  } else if (type === "staked-prediction") {
    flags.predictionEnabled = true;
    flags.stakedPointsEnabled = true;
  } else if (type === "confidence") {
    flags.predictionEnabled = true;
    flags.confidenceEnabled = true;
  } else if (type === "wager" || type === "racing-wager") {
    flags.wagerEnabled = true;
  } else if (type === "ranking") {
    flags.rankingEnabled = true;
  } else if (type === "mixed") {
    // In a Hybrid game, "Standard Predictions" and fixed-point scoring are
    // one gameplay method. Keeping separate switches allowed a question to
    // appear on the Picks page while the backend rejected the submitted pick.
    const standardPredictionsEnabled = Boolean(
      form.fixedPointsEnabled && form.fixedPointsEnabled.checked
    );

    flags.predictionEnabled = standardPredictionsEnabled;
    flags.fixedPointsEnabled = standardPredictionsEnabled;
    flags.rankingEnabled = Boolean(form.rankingEnabled && form.rankingEnabled.checked);
    flags.confidenceEnabled = Boolean(form.confidenceEnabled && form.confidenceEnabled.checked);
    flags.wagerEnabled = Boolean(form.wagerEnabled && form.wagerEnabled.checked);
    flags.stakedPointsEnabled = Boolean(form.stakedPointsEnabled && form.stakedPointsEnabled.checked);
  }

  return flags;
}

function adminGameTypeSummaryText_(type, flags) {
  type = adminCanonicalGameType_(type);
  flags = flags || {};

  if (type === "wager") {
    return "Sports Wagers: ON • Predictions: OFF";
  }

  if (type === "racing-wager") {
    return "Racing Wagers: ON • Predictions: OFF";
  }

  if (type === "staked-prediction") {
    return "Staked Predictions: ON • Sports Wagers: OFF";
  }

  if (type === "confidence") {
    return "Predictions: ON • Confidence Pool: ON • Sports Wagers: OFF";
  }

  if (type === "ranking") {
    return "Prediction Rankings: ON • Predictions: OFF • Sports Wagers: OFF";
  }

  if (type === "voting") {
    return "Participant Entries + Community Voting • Legacy movie/awards voting remains separate";
  }

  if (type === "team-fantasy") {
    return "Team Fantasy Engine: ON • Normal Predictions/Wagers: OFF";
  }

  if (type === "mixed") {
    const enabled = [];
    if (flags.fixedPointsEnabled) enabled.push("Standard Predictions (Fixed Points)");
    if (flags.stakedPointsEnabled) enabled.push("Staked Points");
    if (flags.confidenceEnabled) enabled.push("Confidence");
    if (flags.wagerEnabled) enabled.push("Wagers");
    if (flags.rankingEnabled) enabled.push("Rankings");
    return "Hybrid methods: " + (enabled.length ? enabled.join(" • ") : "Choose methods below");
  }

  return "Predictions: ON • Sports Wagers: OFF";
}

function adminUpdateGameTypeSummary_(form) {
  if (!form || !form.type) {
    return;
  }

  const summary = form.querySelector("[data-admin-game-type-summary]");
  if (!summary) {
    return;
  }

  summary.textContent = adminGameTypeSummaryText_(
    form.type.value,
    adminGameTypeFeatureFlags_(form)
  );
}

function adminUpdateHybridScoringSections(form) {
  if (!form || !form.type) {
    return;
  }

  const type = adminCanonicalGameType_(form.type.value);

  form.querySelectorAll("[data-hybrid-feature-section]").forEach(function(section) {
    if (type !== "mixed") {
      return;
    }

    const fieldName = section.dataset.hybridFeatureSection;
    const control = form[fieldName];
    section.hidden = !(control && control.checked);
  });
}

function adminUpdateGameTypeSections(form) {
  if (!form || !form.type) {
    return;
  }

  const type = adminCanonicalGameType_(form.type.value);

  form.querySelectorAll("[data-game-types]").forEach(function(section) {
    const allowed = String(section.dataset.gameTypes || "")
      .split(/\s+/)
      .filter(Boolean);
    section.hidden = allowed.indexOf(type) === -1;
  });

  if (form.gameFormat) {
    form.gameFormat.value = type === "mixed" ? "hybrid" : "standard";
  }

  form.querySelectorAll('[data-game-types="mixed"] input[type="checkbox"]').forEach(function(input) {
    input.onchange = function() {
      adminUpdateHybridScoringSections(form);
    };
  });

  adminUpdateHybridScoringSections(form);
  if (typeof adminUpdateSurvivorRuleFields === "function") adminUpdateSurvivorRuleFields(form);
  adminUpdateGameTypeSummary_(form);
  adminUpdateHeroSource(form);
}

function adminUpdateHeroSource(form) {
  if (!form || !form.heroImageSource) {
    return;
  }

  const source = form.heroImageSource.value || "drive";
  form.querySelectorAll("[data-hero-source]").forEach(function(panel) {
    panel.hidden = panel.dataset.heroSource !== source;
  });
}

function renderAdminCheckboxWithHelp_(name, label, checked, helpText) {
  return `
    <span class="admin-checkbox-with-help">
      ${renderAdminCheckbox_(name, label, checked)}
      ${helpText ? adminHelpButton_(label, helpText) : ""}
    </span>
  `;
}

function renderAdminGameStateToggle_(
  name,
  title,
  checked,
  onText,
  offText,
  helpText,
  variant,
  disabled
) {

  const isOn = checked === true;
  const stateText = isOn ? onText : offText;

  return `
    <span class="admin-game-state-field">
      <span class="admin-game-state-title">${escapeHtml_(title)}</span>
      <span class="admin-game-state-control">
        <input
          type="checkbox"
          class="admin-game-state-input"
          name="${escapeHtml_(name)}"
          ${isOn ? "checked" : ""}
        />
        <button
          type="button"
          class="admin-game-state-button admin-game-state-${escapeHtml_(variant || "standard")} ${isOn ? "is-on" : "is-off"}"
          aria-pressed="${isOn ? "true" : "false"}"
          data-admin-game-state-toggle="true"
          data-on-text="${escapeHtml_(onText)}"
          data-off-text="${escapeHtml_(offText)}"
          onclick="adminToggleGameStateButton(event, this)"
          ${disabled ? 'disabled aria-disabled="true"' : ""}
        >${escapeHtml_(stateText)}</button>
        ${helpText ? adminHelpButton_(title, helpText) : ""}
      </span>
    </span>
  `;
}

function adminGameStatusDescription_(status) {
  if (status === "Setup") {
    return "SETUP: Admin-only work state. The game is hidden, picks are locked, and it cannot be the default game.";
  }

  if (status === "Preview") {
    return "PREVIEW: Visible for testing, but all picks and wagers stay locked. It cannot be the default game.";
  }

  if (status === "Active") {
    return "LIVE: Visible to players. Picks may be opened or locked separately, and the game may be made the default.";
  }

  if (status === "Archived") {
    return "ARCHIVED: Preserved but removed from normal play. Use Restore Game before changing its status.";
  }

  return "DRAFT: Admin-only starting state. The game is hidden, picks are locked, and it cannot be the default game.";
}

function renderAdminGameStatusControl_(game) {
  const status = adminCanonicalGameStatus_(game.status, game.active, game.archived);
  const isArchived = status === "Archived";
  const active = status === "Preview" || status === "Active";
  const statuses = [
    ["Draft", "DRAFT"],
    ["Setup", "SETUP"],
    ["Preview", "PREVIEW"],
    ["Active", "LIVE"]
  ];

  return `
    <div class="admin-game-status-field">
      <div class="admin-game-state-title-row">
        <span class="admin-game-state-title">Game Status</span>
        ${adminHelpButton_(
          "Game Status",
          "Draft and Setup are hidden from players. Preview is visible but locked. Live is visible and can accept picks when Picks is set to Open."
        )}
      </div>
      <input type="hidden" name="status" value="${escapeHtml_(status)}">
      <input type="checkbox" class="admin-game-state-input" name="active" ${active ? "checked" : ""}>
      <input type="checkbox" class="admin-game-state-input" name="archived" ${isArchived ? "checked" : ""}>
      ${isArchived ? `
        <div class="admin-game-status-archived">ARCHIVED — USE RESTORE GAME</div>
      ` : `
        <div class="admin-game-status-buttons" role="group" aria-label="Game status">
          ${statuses.map(function(item) {
            const value = item[0];
            const label = item[1];
            return `
              <button
                type="button"
                class="admin-game-status-button status-${value.toLowerCase()} ${status === value ? "is-selected" : ""}"
                data-game-status="${value}"
                aria-pressed="${status === value ? "true" : "false"}"
                onclick="adminSelectGameStatus(event, this)"
              >${label}</button>
            `;
          }).join("")}
        </div>
      `}
      <div class="admin-game-status-description" data-admin-game-status-description>
        ${escapeHtml_(adminGameStatusDescription_(status))}
      </div>
    </div>
  `;
}

function adminSyncGameStateButtonForInput_(input) {
  if (!input) {
    return;
  }

  const control = input.closest(".admin-game-state-control");
  const button = control
    ? control.querySelector("[data-admin-game-state-toggle='true']")
    : null;

  if (!button) {
    return;
  }

  button.classList.toggle("is-on", input.checked);
  button.classList.toggle("is-off", !input.checked);
  button.setAttribute("aria-pressed", input.checked ? "true" : "false");
  button.textContent = input.checked
    ? button.getAttribute("data-on-text") || "ON"
    : button.getAttribute("data-off-text") || "OFF";
}

function adminUpdateGameAccessAvailability_(form) {
  if (!form || !form.status) {
    return;
  }

  const isLive = form.status.value === "Active";

  ["lockAllPicks", "defaultGame"].forEach(function(name) {
    const input = form[name];
    const control = input ? input.closest(".admin-game-state-control") : null;
    const button = control
      ? control.querySelector("[data-admin-game-state-toggle='true']")
      : null;

    if (button) {
      button.disabled = !isLive;
      button.setAttribute("aria-disabled", isLive ? "false" : "true");
    }
  });
}

function adminSelectGameStatus(event, button) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!button || button.disabled) {
    return;
  }

  const form = button.closest("form");
  const status = button.getAttribute("data-game-status") || "Draft";

  if (!form || !form.status || !form.active || !form.lockAllPicks || !form.defaultGame) {
    return;
  }

  const previousStatus = form.status.value;
  form.status.value = status;
  form.active.checked = status === "Preview" || status === "Active";

  if (status !== "Active") {
    form.defaultGame.checked = false;
    form.lockAllPicks.checked = true;
  } else if (previousStatus !== "Active") {
    form.lockAllPicks.checked = false;
  }

  form.querySelectorAll("[data-game-status]").forEach(function(statusButton) {
    const selected = statusButton.getAttribute("data-game-status") === status;
    statusButton.classList.toggle("is-selected", selected);
    statusButton.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  const description = form.querySelector("[data-admin-game-status-description]");
  if (description) {
    description.textContent = adminGameStatusDescription_(status);
  }

  adminSyncGameStateButtonForInput_(form.defaultGame);
  adminSyncGameStateButtonForInput_(form.lockAllPicks);
  adminUpdateGameAccessAvailability_(form);
  form.status.dispatchEvent(new Event("change", { bubbles: true }));
}

function adminToggleGameStateButton(event, button) {

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!button || button.disabled) {
    return;
  }

  const control = button.closest(".admin-game-state-control");
  const input = control
    ? control.querySelector(".admin-game-state-input")
    : null;
  const form = button.closest("form");

  if (!input) {
    return;
  }

  const nextChecked = !input.checked;

  if (
    input.name === "defaultGame" &&
    nextChecked &&
    form &&
    form.status &&
    form.status.value !== "Active"
  ) {
    alert("Default Game can only be turned on when Game Status is LIVE.");
    return;
  }

  input.checked = nextChecked;
  adminSyncGameStateButtonForInput_(input);
  input.dispatchEvent(new Event("change", { bubbles: true }));

}


const ADMIN_GAME_FORM_SAVED_RESET_MS = 1800;

function adminGameFormSaveButton_(form) {

  return form
    ? form.querySelector("[data-admin-game-save-button]")
    : null;

}

function adminGameFormSaveFeedback_(form) {

  return form
    ? form.querySelector("[data-admin-game-save-feedback]")
    : null;

}

function adminSetGameFormSaveState_(form, state, message) {

  if (!form) {
    return;
  }

  const button = adminGameFormSaveButton_(form);
  const feedback = adminGameFormSaveFeedback_(form);

  if (!button) {
    return;
  }

  const cleanText = button.getAttribute("data-clean-text") || "SAVE GAME";

  button.classList.remove("is-dirty", "is-saved", "is-saving");

  if (state === "dirty") {
    button.classList.add("is-dirty");
    button.textContent = "CHANGES MADE — SAVE NOW";
    if (feedback) {
      feedback.hidden = false;
      feedback.className = "admin-game-save-feedback is-dirty";
      feedback.textContent = message || "Unsaved changes";
    }
    return;
  }

  if (state === "saving") {
    button.classList.add("is-saving");
    button.textContent = "SAVING...";
    if (feedback) {
      feedback.hidden = false;
      feedback.className = "admin-game-save-feedback is-saving";
      feedback.textContent = message || "Saving changes...";
    }
    return;
  }

  if (state === "saved") {
    button.classList.add("is-saved");
    button.textContent = "SAVED ✓";
    if (feedback) {
      feedback.hidden = false;
      feedback.className = "admin-game-save-feedback is-saved";
      feedback.textContent = message || "Changes saved";
    }
    return;
  }

  button.textContent = cleanText;
  if (feedback) {
    feedback.hidden = true;
    feedback.className = "admin-game-save-feedback";
    feedback.textContent = "";
  }

}

function adminMarkGameFormDirty(form) {

  if (!form || form.dataset.saving === "true" || form.dataset.suppressDirty === "true") {
    return;
  }

  if (form.dataset.dirty !== "true") {
    form.dataset.dirty = "true";
    adminSetGameFormSaveState_(form, "dirty", "Unsaved changes");
    return;
  }

  adminSetGameFormSaveState_(form, "dirty", "Unsaved changes");

}

function adminMarkGameFormClean_(form) {

  if (!form) {
    return;
  }

  form.dataset.dirty = "false";
  adminSetGameFormSaveState_(form, "clean");

}

function adminShowGameFormSaved_(form, message) {

  if (!form) {
    return;
  }

  form.dataset.dirty = "false";
  adminSetGameFormSaveState_(form, "saved", message || "Changes saved");

  const saveToken = String(Date.now());
  form.dataset.savedStateToken = saveToken;

  window.setTimeout(function() {
    if (
      form.isConnected &&
      form.dataset.savedStateToken === saveToken &&
      form.dataset.dirty !== "true" &&
      form.dataset.saving !== "true"
    ) {
      adminSetGameFormSaveState_(form, "clean");
    }
  }, ADMIN_GAME_FORM_SAVED_RESET_MS);

}

function adminHandleGameFormChange(form) {

  if (!form) {
    return;
  }

  adminUpdateHybridScoringSections(form);
  adminUpdateGameTypeSummary_(form);
  adminMarkGameFormDirty(form);

}

function adminDirtyGameForms_() {

  return Array.from(
    document.querySelectorAll(".admin-game-form[data-dirty='true']")
  ).filter(function(form) {
    return form.dataset.saving !== "true";
  });

}

function adminHasDirtyGameForms_() {

  return adminDirtyGameForms_().length > 0;

}

function adminConfirmLeaveDirtyGameForms_(targetPage) {

  if (!adminHasDirtyGameForms_()) {
    return true;
  }

  return confirm(
    "You have unsaved game changes. Leave this page without saving them?"
  );

}

function adminHandleGameCardToggle(details) {

  if (!details || details.open || details.dataset.reopening === "true") {
    return;
  }

  const form = details.querySelector(".admin-game-form[data-dirty='true']");

  if (!form || form.dataset.saving === "true") {
    return;
  }

  const closeAnyway = confirm(
    "This game has unsaved changes. Close this card anyway? The changes will remain unsaved until you save or leave the page."
  );

  if (!closeAnyway) {
    details.dataset.reopening = "true";
    details.open = true;
    window.setTimeout(function() {
      delete details.dataset.reopening;
    }, 0);
  }

}

function adminFindGameFormById_(gameId) {

  const wanted = String(gameId || "");

  return Array.from(document.querySelectorAll(".admin-game-form")).find(function(form) {
    return String(form.dataset.gameId || "") === wanted;
  }) || null;

}

async function adminSavePendingGameChangesBeforeAction_(gameId) {

  const form = adminFindGameFormById_(gameId);

  if (!form || form.dataset.dirty !== "true") {
    return true;
  }

  const saved = await adminSaveGameFromForm(
    null,
    form,
    {
      navigateAfterSave: false,
      suppressSuccessAlert: true,
      forceSetupState: true,
      savedMessage: "Changes saved. Continuing..."
    }
  );

  return saved === true;

}

if (
  typeof window !== "undefined" &&
  !window.__adminGameDirtyBeforeUnloadBound
) {
  window.__adminGameDirtyBeforeUnloadBound = true;
  window.addEventListener("beforeunload", function(event) {
    if (!adminHasDirtyGameForms_()) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });
}

function adminArchiveBadgeForGame_(gameId) {
  const map = APP_STATE.adminArchiveDashboard || {};
  const item = map[String(gameId || "")] || null;

  if (!item) {
    return `
      <span class="admin-archive-status-badge is-neutral">
        Archive unchecked
      </span>
    `;
  }

  const code = String(item.code || "NOT_ARCHIVED").toLowerCase();
  const verifiedAt = item.verifiedAt
    ? ` title="Verified ${escapeHtml_(item.verifiedAt)}"`
    : "";

  return `
    <span
      class="admin-archive-status-badge is-${escapeHtml_(code)}"
      ${verifiedAt}
    >
      ${escapeHtml_(item.label || "Not archived")}
    </span>
  `;
}

function renderAdminGameForm(
  game,
  gameTypes,
  allGames
) {

  const isNew = !game;
  const currentYear = adminCurrentYear_();

  game = game || {
    gameId: "",
    name: "",
    year: currentYear,
    type: "prediction",
    active: false,
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
    gameFormat: "standard",
    gameRole: "standalone",
    hubMode: "leaderboard-only",
    showMiniGameLinks: true,
    includeParentQuestions: false,
    parentGameId: "",
    includeInParent: true,
    parentContributionMode: "add-points",
    parentContributionWeight: 1,
    parentBestCount: 0,
    placementPointsJSON: "",
    leaderboardScoreMode: "combined-net",
    fixedPointsEnabled: true,
    stakedPointsEnabled: false,
    startingPoints: 1000,
    minStake: 10,
    maxStake: 100,
    stakeIncrement: 10,
    stakeWinMultiplier: 1,
    stakeLossMultiplier: 1,
    scoringEngine: "manual",
    themeColor: "#c8a24a",
    icon: "",
    sortOrder: 999,
    status: "Draft",
    description: "",
    lockLabel: "",
    availableFrom: "",
    availableUntil: "",
    heroImageFileId: "",
    heroImagePosition: "center center",
    lockAllPicks: true,
    showLeaderboard: true,
    showResultsBeforeLock: false,
    resultsFinalized: false,
    votingLocked: false
  };

  const gameRole = game.gameRole || "standalone";
  const isMiniGame = gameRole === "mini";
  const isParentGame = gameRole === "parent";
  const hubMode = game.hubMode || (isNew ? "leaderboard-only" : "playable-aggregate");
  const isLeaderboardOnlyHub = isParentGame && hubMode === "leaderboard-only";
  const canonicalType = adminCanonicalGameType_(game.type);
  const survivorSettings = Object.assign({
    mode: "manual-elimination", sport: "football", league: "nfl", seasonYear: currentYear, seasonType: "2", seasonPhase: "regular",
    startWeek: 1, endWeek: 18, resultMode: "straight-up", lossesAllowed: 0, teamUseLimit: 1, pickLockMode: "team-kickoff",
    missedPickRule: "loss", pushRule: "survive", endMode: "sole-survivor", showRecords: true, showOdds: true, showOpponent: true, showSchedule: true,
    oddsFreezeMode: "weekly-lock", kothBasePoints: 10, kothMultiplierStep: 1, kothMaxMultiplier: 5, kothLossBehavior: "reset",
    earnLifeEnabled: false, earnLifeWinStreak: 5, maxEarnedLives: 1, safeWeeks: "", atsWeeks: "", underdogWeeks: "", roadOnlyWeeks: "",
    divisionWeeks: "", doublePickWeeks: "", secondChanceWeeks: "", redemptionWeeks: "", confidenceWeeks: "", maxConfidenceRisk: 10,
    autoSettle: true, autoBuildNextWeek: true, autoRefreshOdds: true, automationEnabled: true,
    kothSourceGameIds: [], kothCombineMode: "sum", kothEntryAggregation: "sum", kothStrikeLimit: 3,
    kothPacingMode: "automatic", kothFixedRecipients: 3, kothCustomSchedule: "", kothTieRule: "include-all",
    kothMinRecipients: 1, kothMaxRecipients: 0, kothStartMode: "start-fresh", kothAutoProcess: true
  }, game.survivorSettings || {});
  const kothSourceGameIds = Array.isArray(survivorSettings.kothSourceGameIds) ? survivorSettings.kothSourceGameIds.map(String) : [];
  const workflowStatus = adminCanonicalGameStatus_(game.status, game.active, game.archived);
  const isLiveStatus = workflowStatus === "Active";

  const title = isNew
    ? "Create New Game"
    : escapeHtml_(game.name || game.gameId);

  const subtitle = isNew
    ? "Choose a game type and only the settings needed for that game will appear."
    : escapeHtml_(game.gameId);

  const openAttr = isNew ? "open" : "";
  const rawGameId = game.gameId || "new-game";
  const domId = typeof adminGameDomId_ === "function"
    ? adminGameDomId_(rawGameId)
    : String(rawGameId).replace(/[^a-zA-Z0-9_-]/g, "_");

  const heroImageFileId = game.heroImageFileId || game.heroImageFileID || "";
  const heroImageUrl = heroImageFileId && typeof adminGameHeroThumbnail_ === "function"
    ? adminGameHeroThumbnail_(heroImageFileId)
    : "";
  const themeColor = adminNormalizeThemeColor_(game.themeColor);

  return `
    <details class="admin-game-form-details admin-collapsible-card" ${openAttr} ontoggle="adminHandleGameCardToggle(this)">
      <summary class="admin-card-summary admin-game-form-summary">
        <div>
          <h3>${title}</h3>
          <div class="admin-sub">${subtitle}</div>
        </div>
        <div class="admin-game-summary-actions">
          ${isNew ? "" : adminArchiveBadgeForGame_(rawGameId)}
          <span class="admin-collapse-icon">▾</span>
        </div>
      </summary>

      <div class="admin-collapsible-body">
        <form
          class="admin-game-form admin-guided-game-form"
          onsubmit="adminSaveGameFromForm(event, this)"
          oninput="adminMarkGameFormDirty(this)"
          onchange="adminHandleGameFormChange(this)"
          data-new-game="${isNew ? "true" : "false"}"
          data-game-id="${escapeHtml_(rawGameId)}"
          data-dirty="false"
          data-saving="false"
        >
          ${!isNew ? `
            <details class="admin-game-settings-shell">
              <summary class="admin-game-settings-summary">
                <div>
                  <h4>Settings</h4>
                  <div class="admin-sub">Open to review or edit this game’s setup.</div>
                </div>
                <span class="admin-collapse-icon">▾</span>
              </summary>
              <div class="admin-game-settings-body">
          ` : ""}

          <details class="admin-form-section admin-form-section-details" ${isNew ? "open" : ""}>
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Game Basics</h4>
                <div class="admin-sub">Name the game and choose how players will participate.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>

            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Game Name", "The name players see on the dashboard and game page.")}
                <input
                  id="adminGameName_${domId}"
                  name="name"
                  value="${escapeHtml_(game.name)}"
                  placeholder="2026 NFL Season"
                  oninput="adminAutoFillGameId(this.form)"
                  required
                />
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Game ID", "A permanent URL-safe identifier. It auto-fills from the Game Name for new games.")}
                <input
                  name="gameId"
                  value="${escapeHtml_(game.gameId)}"
                  placeholder="2026-nfl-season"
                  ${isNew ? "oninput=\"this.dataset.touched='true'\"" : "readonly"}
                  required
                />
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Year", "Used to organize and label the game. The current year is selected automatically for new games.")}
                <select name="year">
                  ${renderAdminYearOptions_(game.year || currentYear)}
                </select>
              </label>

              ${isNew ? `
              <label class="admin-field">
                ${adminFieldLabel_("Start From Template", "Applies safe defaults for a common game. You can change every setting after the template is applied.")}
                <select name="gameTemplate" onchange="adminApplyGameTemplate(this)">
                  ${renderAdminGameTemplateOptions_()}
                </select>
              </label>
              ` : ""}

              <label class="admin-field">
                ${adminFieldLabel_("Game Type", "Controls which scoring and question settings are available. Hybrid is the only type that exposes multiple scoring systems.")}
                <select
                  name="type"
                  onchange="adminApplyGameTypeDefaults(this.form); adminUpdateGameTypeSections(this.form)"
                >
                  ${renderGameTypeOptions_(game.type, gameTypes)}
                </select>
              </label>
            </div>

            <div class="admin-game-type-summary">
              <strong>Gameplay enabled by Game Type</strong>
              <span data-admin-game-type-summary>${escapeHtml_(adminGameTypeSummaryText_(canonicalType, game))}</span>
              <small>Only Hybrid Game lets you manually combine gameplay methods. Other game types set these automatically.</small>
            </div>

            <input type="hidden" name="gameFormat" value="${canonicalType === "mixed" ? "hybrid" : "standard"}">
          </details>

          <details class="admin-form-section admin-form-section-details">
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Game Structure</h4>
                <div class="admin-sub">Choose whether this game stands alone, contains mini games, or contributes to a larger game.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>

            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Game Role", "Standalone is independent. Season / Series Hub combines mini-game standings and can optionally contain season-long questions. Mini Game can contribute to a hub leaderboard.")}
                <select name="gameRole" onchange="adminUpdateGameStructureFields(this.form)">
                  <option value="standalone" ${gameRole === "standalone" ? "selected" : ""}>Standalone Game</option>
                  <option value="parent" ${gameRole === "parent" ? "selected" : ""}>Season / Series Hub</option>
                  <option value="mini" ${gameRole === "mini" ? "selected" : ""}>Mini Game</option>
                </select>
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Default Result Source", "The default system used to resolve questions. Individual questions can override this later.")}
                <select name="scoringEngine">
                  ${[
                    ["manual", "Manual / Admin"],
                    ["sports", "Sports Scores Engine"],
                    ["internet", "External Results Hub"],
                    ["racing", "Racing Engine"],
                    ["mixed", "Mixed Sources"]
                  ].map(function(option) {
                    return `<option value="${option[0]}" ${(game.scoringEngine || "manual") === option[0] ? "selected" : ""}>${option[1]}</option>`;
                  }).join("")}
                </select>
              </label>
            </div>

            <div class="admin-role-panel" data-game-role-panel="mini" ${isMiniGame ? "" : "hidden"}>
              <div class="form-grid">
                <label class="admin-field">
                  ${adminFieldLabel_("Parent Game", "The full-season or parent game that receives this mini game's results.")}
                  <select name="parentGameId" ${isMiniGame ? "" : "disabled"}>
                    <option value="">Select parent game</option>
                    ${renderParentGameOptions_(game.parentGameId || "", allGames || [], game.gameId || "")}
                  </select>
                </label>

                <label class="admin-field">
                  ${adminFieldLabel_("How This Mini Game Counts", "Add Net Points uses the mini game's net score. Weighted Points multiplies it by the weight. Placement Points awards points based on finish position.")}
                  <select name="parentContributionMode" ${isMiniGame ? "" : "disabled"}>
                    <option value="add-points" ${(game.parentContributionMode || "add-points") === "add-points" ? "selected" : ""}>Add Net Points</option>
                    <option value="weighted-points" ${(game.parentContributionMode || "") === "weighted-points" ? "selected" : ""}>Weighted Points</option>
                    <option value="placement-points" ${(game.parentContributionMode || "") === "placement-points" ? "selected" : ""}>Placement Points</option>
                  </select>
                </label>

                <label class="admin-field">
                  ${adminFieldLabel_("Contribution Weight", "Used only with Weighted Points. A weight of 2 makes this mini game count twice.")}
                  <input name="parentContributionWeight" type="number" min="0" step="0.1" value="${escapeHtml_(game.parentContributionWeight === undefined ? 1 : game.parentContributionWeight)}" ${isMiniGame ? "" : "disabled"}>
                </label>
              </div>

              <div class="admin-checkbox-row">
                ${renderAdminCheckboxWithHelp_("includeInParent", "Include in Parent Standings", game.includeInParent !== false, "Turn this off when a mini game should have its own leaderboard but should not affect the parent season.")}
              </div>
            </div>

            <div class="admin-role-panel" data-game-role-panel="parent" ${isParentGame ? "" : "hidden"}>
              <div class="form-grid">
                <label class="admin-field">
                  ${adminFieldLabel_("Hub Mode", "Leaderboard Only creates a standings and mini-game navigation page with no parent questions. Playable + Aggregate also allows season-long questions in the hub.")}
                  <select name="hubMode" onchange="adminUpdateHubModeFields(this.form)" ${isParentGame ? "" : "disabled"}>
                    <option value="leaderboard-only" ${hubMode === "leaderboard-only" ? "selected" : ""}>Leaderboard Only</option>
                    <option value="playable-aggregate" ${hubMode === "playable-aggregate" ? "selected" : ""}>Playable + Aggregate</option>
                  </select>
                </label>

                <label class="admin-field">
                  ${adminFieldLabel_("Best N Mini Games", "Enter 0 to count every mini game. Enter a number to count only each player's best results.")}
                  <input name="parentBestCount" type="number" min="0" step="1" value="${escapeHtml_(game.parentBestCount || 0)}" placeholder="0 = count all" ${isParentGame ? "" : "disabled"}>
                </label>

                <label class="admin-field admin-wide-field">
                  ${adminFieldLabel_("Placement Points", "Used by mini games set to Placement Points. Example: [10,8,6,5,4,3,2,1].")}
                  <input name="placementPointsJSON" value="${escapeHtml_(game.placementPointsJSON || "")}" placeholder="[10,8,6,5,4,3,2,1]" ${isParentGame ? "" : "disabled"}>
                </label>
              </div>

              <div class="admin-checkbox-row">
                ${renderAdminCheckboxWithHelp_("showMiniGameLinks", "Show Mini-Game Links", game.showMiniGameLinks !== false, "Displays current, upcoming, and completed mini-game cards on the season hub page.")}
                <span data-parent-question-option ${isLeaderboardOnlyHub ? "hidden" : ""}>
                  ${renderAdminCheckboxWithHelp_("includeParentQuestions", "Include Parent Questions in Standings", game.includeParentQuestions !== false && !isLeaderboardOnlyHub, "Adds season-long questions created directly in the hub to the mini-game rollup total.")}
                </span>
              </div>

              <div class="admin-hub-mode-note" data-hub-mode-note="leaderboard-only" ${isLeaderboardOnlyHub ? "" : "hidden"}>
                This hub will show standings, season statistics, and mini-game links. Categories and questions created directly in the hub will not count.
              </div>

              <div class="admin-hub-mode-note" data-hub-mode-note="playable-aggregate" ${isLeaderboardOnlyHub ? "hidden" : ""}>
                This hub can contain season-long questions while also combining results from its mini games.
              </div>
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details" data-game-types="survivor" ${canonicalType === "survivor" ? "open" : "hidden"}>
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Survivor / Elimination Rules</h4>
                <div class="admin-sub">Use manual elimination for Reality TV, active Sports Survivor / Streak Survivor picks, or passive King of the Hill score strikes.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>

            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Survivor Mode", "Manual keeps the existing elimination-question behavior. Sports Survivor uses weekly team picks. Streak Survivor adds the consecutive-win multiplier. King of the Hill is the passive lowest-score strike game.")}
                <select name="survivorMode" onchange="adminUpdateSurvivorRuleFields(this.form)">
                  <option value="manual-elimination" ${survivorSettings.mode === "manual-elimination" ? "selected" : ""}>Manual / Reality Elimination</option>
                  <option value="sports-survivor" ${survivorSettings.mode === "sports-survivor" ? "selected" : ""}>Sports Survivor / Last Team Standing</option>
                  <option value="streak-survivor" ${survivorSettings.mode === "streak-survivor" ? "selected" : ""}>Streak Survivor / Win Multiplier</option>
                  <option value="king-of-the-hill" ${survivorSettings.mode === "king-of-the-hill" ? "selected" : ""}>King of the Hill — Score Strikes</option>
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("League", "Sports Scores Engine league code. NFL is the default, but this engine can also be used for other supported leagues.")}
                <select name="survivorLeague">
                  ${[["nfl","NFL"],["college-football","College Football"],["nba","NBA"],["mlb","MLB"],["nhl","NHL"]].map(function(row) { return `<option value="${row[0]}" ${String(survivorSettings.league || "nfl") === row[0] ? "selected" : ""}>${row[1]}</option>`; }).join("")}
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Season Year", "Year sent to the Sports Scores Engine when loading weekly games and schedules.")}
                <input name="survivorSeasonYear" type="number" min="2000" max="2100" value="${escapeHtml_(survivorSettings.seasonYear || currentYear)}">
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Start Week", "First league week included in this Survivor contest.")}
                <input name="survivorStartWeek" type="number" min="1" value="${escapeHtml_(survivorSettings.startWeek || 1)}">
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("End Week", "Last league week the automation may build.")}
                <input name="survivorEndWeek" type="number" min="1" value="${escapeHtml_(survivorSettings.endWeek || 18)}">
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Win Condition", "Straight Up uses the final score. Against the Spread uses the spread snapshot selected by the Freeze Line rule.")}
                <select name="survivorResultMode">
                  <option value="straight-up" ${survivorSettings.resultMode === "spread" ? "" : "selected"}>Straight Up</option>
                  <option value="spread" ${survivorSettings.resultMode === "spread" ? "selected" : ""}>Against the Spread</option>
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Allowed Losses / Lives", "0 is traditional one-loss-and-out Survivor. A player is eliminated only after losses exceed this allowance.")}
                <input name="survivorLossesAllowed" type="number" min="0" max="99" value="${escapeHtml_(survivorSettings.lossesAllowed || 0)}">
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Maximum Uses Per Team", "1 means a player can use each team only once. 0 means unlimited reuse.")}
                <input name="survivorTeamUseLimit" type="number" min="0" max="99" value="${escapeHtml_(survivorSettings.teamUseLimit === undefined ? 1 : survivorSettings.teamUseLimit)}">
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Pick Lock", "Team Kickoff lets later games remain selectable after early games start. First Game locks the whole week when the first matchup begins.")}
                <select name="survivorPickLockMode">
                  <option value="team-kickoff" ${survivorSettings.pickLockMode === "first-game" ? "" : "selected"}>Each Team at Its Kickoff</option>
                  <option value="first-game" ${survivorSettings.pickLockMode === "first-game" ? "selected" : ""}>Whole Week at First Kickoff</option>
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Freeze Spread / Odds", "Weekly Lock gives everyone the same line when refreshed before lock. Pick Time stores each player's exact line snapshot. Closing uses the latest synchronized line.")}
                <select name="survivorOddsFreezeMode">
                  <option value="weekly-lock" ${survivorSettings.oddsFreezeMode === "weekly-lock" ? "selected" : ""}>Weekly Lock</option>
                  <option value="pick" ${survivorSettings.oddsFreezeMode === "pick" ? "selected" : ""}>At Pick Time</option>
                  <option value="build" ${survivorSettings.oddsFreezeMode === "build" ? "selected" : ""}>When Week Is Built</option>
                  <option value="closing" ${survivorSettings.oddsFreezeMode === "closing" ? "selected" : ""}>Latest / Closing</option>
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Missed Pick", "Choose whether failing to submit uses a loss, immediately eliminates the player, or produces no result.")}
                <select name="survivorMissedPickRule">
                  <option value="loss" ${survivorSettings.missedPickRule === "loss" ? "selected" : ""}>Use a Loss / Life</option>
                  <option value="eliminate" ${survivorSettings.missedPickRule === "eliminate" ? "selected" : ""}>Immediate Elimination</option>
                  <option value="no-result" ${survivorSettings.missedPickRule === "no-result" ? "selected" : ""}>No Result</option>
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Tie / ATS Push", "Survive keeps the player alive without a win. Loss consumes a life. No Result ignores the week for that pick.")}
                <select name="survivorPushRule">
                  <option value="survive" ${survivorSettings.pushRule === "survive" ? "selected" : ""}>Survive</option>
                  <option value="loss" ${survivorSettings.pushRule === "loss" ? "selected" : ""}>Counts as Loss</option>
                  <option value="no-result" ${survivorSettings.pushRule === "no-result" ? "selected" : ""}>No Result</option>
                </select>
              </label>

              <label class="admin-field" data-survivor-sports-field>
                ${adminFieldLabel_("Game Ends", "Sole Survivor can declare the last active player the winner before the configured end week.")}
                <select name="survivorEndMode">
                  <option value="sole-survivor" ${survivorSettings.endMode === "sole-survivor" ? "selected" : ""}>When One Sole Survivor Remains</option>
                  <option value="end-week" ${survivorSettings.endMode === "end-week" ? "selected" : ""}>At Configured End Week</option>
                  <option value="season-end" ${survivorSettings.endMode === "season-end" ? "selected" : ""}>End of Season</option>
                </select>
              </label>
            </div>

            <div class="admin-checkbox-row" data-survivor-sports-field>
              ${renderAdminCheckboxWithHelp_("survivorShowRecords", "Show Team + Opponent Records", survivorSettings.showRecords !== false, "Shows both records on the weekly selection card.")}
              ${renderAdminCheckboxWithHelp_("survivorShowOdds", "Show Odds / Spread", survivorSettings.showOdds !== false, "Shows available moneyline/spread information on the team card.")}
              ${renderAdminCheckboxWithHelp_("survivorShowOpponent", "Show Opponent + Home/Away", survivorSettings.showOpponent !== false, "Shows the matchup and whether the selected team is home or away.")}
              ${renderAdminCheckboxWithHelp_("survivorShowSchedule", "Expandable Team Schedule", survivorSettings.showSchedule !== false, "Players can expand a team to inspect its season schedule before selecting it.")}
            </div>

            <div class="admin-survivor-subsection" data-survivor-streak-field>
              <h5>Streak Survivor Scoring</h5>
              <div class="form-grid">
                <label class="admin-field">${adminFieldLabel_("Base Points", "Points awarded for a win before the streak multiplier.")}<input name="survivorKothBasePoints" type="number" min="0" step="1" value="${escapeHtml_(survivorSettings.kothBasePoints || 10)}"></label>
                <label class="admin-field">${adminFieldLabel_("Multiplier Step", "1 creates 1x, 2x, 3x... on consecutive wins. 0.5 creates 1x, 1.5x, 2x...")}<input name="survivorKothMultiplierStep" type="number" min="0" step="0.1" value="${escapeHtml_(survivorSettings.kothMultiplierStep === undefined ? 1 : survivorSettings.kothMultiplierStep)}"></label>
                <label class="admin-field">${adminFieldLabel_("Maximum Multiplier", "0 means no cap.")}<input name="survivorKothMaxMultiplier" type="number" min="0" step="0.5" value="${escapeHtml_(survivorSettings.kothMaxMultiplier === undefined ? 5 : survivorSettings.kothMaxMultiplier)}"></label>
                <label class="admin-field">${adminFieldLabel_("On Loss", "Controls what happens to the active win streak.")}<select name="survivorKothLossBehavior"><option value="reset" ${survivorSettings.kothLossBehavior === "reset" ? "selected" : ""}>Reset to 0</option><option value="drop-one" ${survivorSettings.kothLossBehavior === "drop-one" ? "selected" : ""}>Drop Streak by 1</option><option value="half" ${survivorSettings.kothLossBehavior === "half" ? "selected" : ""}>Cut Streak in Half</option></select></label>
              </div>
            </div>

            <div class="admin-survivor-subsection" data-survivor-koth-field>
              <h5>King of the Hill — Score Strikes</h5>
              <div class="admin-sub">Passive side game: players make no extra pick. Final weekly scores from the selected source game or games are combined, the lowest scores receive strikes, and the last active player wins.</div>
              <div class="form-grid">
                <label class="admin-field">${adminFieldLabel_("Start Week", "Start Fresh begins with the first processed finalized week. Backfill processes stored finalized weekly scores beginning here.")}<input name="kothStartWeek" type="number" min="1" value="${escapeHtml_(survivorSettings.startWeek || 1)}"></label>
                <label class="admin-field">${adminFieldLabel_("End Week", "Last week used for automatic strike pacing.")}<input name="kothEndWeek" type="number" min="1" value="${escapeHtml_(survivorSettings.endWeek || 18)}"></label>
                <label class="admin-field">${adminFieldLabel_("Strikes to Eliminate", "Normally 3. A player is removed from KOTH when this strike count is reached.")}<input name="kothStrikeLimit" type="number" min="1" max="99" value="${escapeHtml_(survivorSettings.kothStrikeLimit || 3)}"></label>
                <label class="admin-field">${adminFieldLabel_("Combine Multiple Games", "How selected source-game weekly values become the one KOTH value for each user.")}<select name="kothCombineMode"><option value="sum" ${survivorSettings.kothCombineMode === "sum" ? "selected" : ""}>Sum</option><option value="average" ${survivorSettings.kothCombineMode === "average" ? "selected" : ""}>Average</option><option value="highest" ${survivorSettings.kothCombineMode === "highest" ? "selected" : ""}>Highest Source Score</option><option value="lowest" ${survivorSettings.kothCombineMode === "lowest" ? "selected" : ""}>Lowest Source Score</option></select></label>
                <label class="admin-field">${adminFieldLabel_("Multiple Entries in One Source", "If a user has more than one entry in a Team Fantasy source, choose how those entries become that source game's KOTH value.")}<select name="kothEntryAggregation"><option value="sum" ${survivorSettings.kothEntryAggregation === "sum" ? "selected" : ""}>Sum Entries</option><option value="average" ${survivorSettings.kothEntryAggregation === "average" ? "selected" : ""}>Average Entries</option><option value="highest" ${survivorSettings.kothEntryAggregation === "highest" ? "selected" : ""}>Best Entry</option><option value="lowest" ${survivorSettings.kothEntryAggregation === "lowest" ? "selected" : ""}>Lowest Entry</option></select></label>
                <label class="admin-field">${adminFieldLabel_("Start Behavior", "Start Fresh begins from the most recently finalized native weekly score. Backfill starts at the configured Start Week.")}<select name="kothStartMode"><option value="start-fresh" ${survivorSettings.kothStartMode === "backfill" ? "" : "selected"}>Start Fresh</option><option value="backfill" ${survivorSettings.kothStartMode === "backfill" ? "selected" : ""}>Backfill Previous Weeks</option></select></label>
              </div>
              <div class="admin-koth-source-list">
                <strong>Score Source Game(s)</strong>
                <div class="admin-sub">Select one or several. Team Fantasy sources automate from finalized weekly totals. Other game types can be captured with Run Now after their weekly scoring is final.</div>
                ${(allGames || []).filter(function(candidate) { return candidate && candidate.gameId && candidate.gameId !== game.gameId; }).map(function(candidate) { const sourceId = String(candidate.gameId || ""); const checked = kothSourceGameIds.indexOf(sourceId) !== -1; return `<label class="admin-koth-source-option"><input type="checkbox" name="kothSourceGameId" value="${escapeHtml_(sourceId)}" ${checked ? "checked" : ""}><span><strong>${escapeHtml_(candidate.name || sourceId)}</strong><small>${escapeHtml_(candidate.type || "game")} · ${escapeHtml_(sourceId)}</small></span></label>`; }).join("") || '<div class="admin-sub">Save another game first, then return here to select it as a KOTH score source.</div>'}
              </div>
              <h6>Strike Pacing</h6>
              <div class="form-grid">
                <label class="admin-field">${adminFieldLabel_("Distribution", "Automatic recalculates from players remaining, strikes already held, and weeks remaining. Fixed and Custom remain available for manual control.")}<select name="kothPacingMode"><option value="automatic" ${survivorSettings.kothPacingMode === "automatic" ? "selected" : ""}>Automatic — Recommended</option><option value="fixed" ${survivorSettings.kothPacingMode === "fixed" ? "selected" : ""}>Fixed Recipients Each Week</option><option value="custom" ${survivorSettings.kothPacingMode === "custom" ? "selected" : ""}>Custom Weekly Schedule</option></select></label>
                <label class="admin-field">${adminFieldLabel_("Fixed Recipients", "Used only with Fixed distribution.")}<input name="kothFixedRecipients" type="number" min="1" value="${escapeHtml_(survivorSettings.kothFixedRecipients || 3)}"></label>
                <label class="admin-field admin-wide-field">${adminFieldLabel_("Custom Schedule", "Example: 1-4:4, 5-8:3, 9-12:2, 13-17:1")}<input name="kothCustomSchedule" value="${escapeHtml_(survivorSettings.kothCustomSchedule || "")}" placeholder="1-4:4, 5-8:3, 9-12:2, 13-17:1"></label>
                <label class="admin-field">${adminFieldLabel_("Tie at Strike Line", "Include All Ties can award an extra strike. In the final stretch, KOTH automatically breaks a cutoff tie when needed to avoid multiple eliminations.")}<select name="kothTieRule"><option value="include-all" ${survivorSettings.kothTieRule === "include-all" ? "selected" : ""}>Include All Ties</option><option value="previous-week" ${survivorSettings.kothTieRule === "previous-week" ? "selected" : ""}>Lower Previous-Week Score</option><option value="season-average" ${survivorSettings.kothTieRule === "season-average" ? "selected" : ""}>Lower Season Average</option></select></label>
                <label class="admin-field">${adminFieldLabel_("Minimum Strike Recipients", "Floor used by automatic pacing early in the season.")}<input name="kothMinRecipients" type="number" min="1" value="${escapeHtml_(survivorSettings.kothMinRecipients || 1)}"></label>
                <label class="admin-field">${adminFieldLabel_("Maximum Strike Recipients", "0 means no manual cap; automatic pacing still protects the final survivor.")}<input name="kothMaxRecipients" type="number" min="0" value="${escapeHtml_(survivorSettings.kothMaxRecipients || 0)}"></label>
              </div>
              <div class="admin-checkbox-row">
                ${renderAdminCheckboxWithHelp_("kothAutoProcess", "Auto Process Final Weeks", survivorSettings.kothAutoProcess !== false, "The 15-minute Survivor automation checks selected native weekly score sources and processes each finalized KOTH week once.")}
                ${renderAdminCheckboxWithHelp_("kothAutomationEnabled", "15-Minute Automation", survivorSettings.automationEnabled !== false, "Uses the shared Survivor automation trigger. Duplicate-week protection prevents repeated strikes.")}
              </div>
              <div class="admin-action-row">
                <label class="admin-inline-field">Week <input name="kothProcessWeek" type="number" min="1" value="${escapeHtml_(survivorSettings.startWeek || 1)}"></label>
                <button type="button" class="secondary" onclick="adminProcessKothWeek(this.form, this)">Process / Recheck KOTH Week</button>
                <button type="button" class="secondary" onclick="adminRunSportsSurvivorAutomation(this.form, this)">Run KOTH Automation Now</button>
                <button type="button" class="secondary" onclick="adminInstallSportsSurvivorAutomation(this.form, this)">Install 15-Minute Automation</button>
              </div>
              <div class="admin-sub">Automatic pacing uses current strike totals, not just the original player count, so the weekly strike rate corrects itself as the season develops.</div>
              <div class="admin-sub" data-koth-action-status></div>
            </div>

            <div class="admin-survivor-subsection" data-survivor-sports-field>
              <h5>Lives & Earned Chances</h5>
              <div class="admin-checkbox-row">
                ${renderAdminCheckboxWithHelp_("survivorEarnLifeEnabled", "Earn Extra Life", survivorSettings.earnLifeEnabled === true, "Award an extra loss allowance after a configured consecutive-win streak.")}
              </div>
              <div class="form-grid">
                <label class="admin-field">${adminFieldLabel_("Wins to Earn Life", "Example: 5 means every 5 consecutive wins earns one life, up to the maximum.")}<input name="survivorEarnLifeWinStreak" type="number" min="1" value="${escapeHtml_(survivorSettings.earnLifeWinStreak || 5)}"></label>
                <label class="admin-field">${adminFieldLabel_("Maximum Earned Lives", "Caps lives gained from win streaks.")}<input name="survivorMaxEarnedLives" type="number" min="0" value="${escapeHtml_(survivorSettings.maxEarnedLives === undefined ? 1 : survivorSettings.maxEarnedLives)}"></label>
              </div>
            </div>

            <div class="admin-survivor-subsection" data-survivor-sports-field>
              <h5>Weekly Twists</h5>
              <div class="admin-sub">Enter week numbers separated by commas. Leave blank to disable a twist. Twists can overlap.</div>
              <div class="form-grid">
                <label class="admin-field">${adminFieldLabel_("Safe Weeks", "A losing pick does not consume a life or eliminate the player.")}<input name="survivorSafeWeeks" value="${escapeHtml_(survivorSettings.safeWeeks || "")}" placeholder="8, 14"></label>
                <label class="admin-field">${adminFieldLabel_("ATS Weeks", "Overrides Straight Up and grades that week against the spread.")}<input name="survivorATSWeeks" value="${escapeHtml_(survivorSettings.atsWeeks || "")}" placeholder="4, 12"></label>
                <label class="admin-field">${adminFieldLabel_("Underdogs Only Weeks", "Only teams with a positive spread are eligible.")}<input name="survivorUnderdogWeeks" value="${escapeHtml_(survivorSettings.underdogWeeks || "")}" placeholder="10"></label>
                <label class="admin-field">${adminFieldLabel_("Road Teams Only Weeks", "Only away teams are eligible.")}<input name="survivorRoadOnlyWeeks" value="${escapeHtml_(survivorSettings.roadOnlyWeeks || "")}" placeholder="6"></label>
                <label class="admin-field">${adminFieldLabel_("Division Weeks", "Restricts picks to matchups marked as divisional by the sports data source.")}<input name="survivorDivisionWeeks" value="${escapeHtml_(survivorSettings.divisionWeeks || "")}" placeholder="15"></label>
                <label class="admin-field">${adminFieldLabel_("Double Pick Weeks", "Player must select two teams and both must succeed.")}<input name="survivorDoublePickWeeks" value="${escapeHtml_(survivorSettings.doublePickWeeks || "")}" placeholder="13, 17"></label>
                <label class="admin-field">${adminFieldLabel_("Redemption Weeks", "Player selects two teams; either successful pick saves the week.")}<input name="survivorRedemptionWeeks" value="${escapeHtml_(survivorSettings.redemptionWeeks || "")}" placeholder="9"></label>
                <label class="admin-field">${adminFieldLabel_("Second Chance Weeks", "Players eliminated earlier are restored when this week is reached.")}<input name="survivorSecondChanceWeeks" value="${escapeHtml_(survivorSettings.secondChanceWeeks || "")}" placeholder="11"></label>
                <label class="admin-field">${adminFieldLabel_("Confidence / Risk Weeks", "Adds a player-selected risk amount to a win and subtracts it on a Streak Survivor loss.")}<input name="survivorConfidenceWeeks" value="${escapeHtml_(survivorSettings.confidenceWeeks || "")}" placeholder="16"></label>
                <label class="admin-field">${adminFieldLabel_("Maximum Confidence Risk", "Largest selectable bonus/risk amount on a Confidence Week.")}<input name="survivorMaxConfidenceRisk" type="number" min="0" value="${escapeHtml_(survivorSettings.maxConfidenceRisk || 10)}"></label>
              </div>
            </div>

            <div class="admin-survivor-subsection" data-survivor-sports-field>
              <h5>Automation</h5>
              <div class="admin-checkbox-row">
                ${renderAdminCheckboxWithHelp_("survivorAutoSettle", "Auto Grade Final Scores", survivorSettings.autoSettle !== false, "Uses Sports Scores Engine finals to grade picks automatically.")}
                ${renderAdminCheckboxWithHelp_("survivorAutoBuildNextWeek", "Auto Build Next Week", survivorSettings.autoBuildNextWeek !== false, "When all built weeks are settled, the next configured week is added automatically.")}
                ${renderAdminCheckboxWithHelp_("survivorAutoRefreshOdds", "Refresh Odds", survivorSettings.autoRefreshOdds !== false, "Refreshes available line data during Survivor automation.")}
                ${renderAdminCheckboxWithHelp_("survivorAutomationEnabled", "15-Minute Automation", survivorSettings.automationEnabled !== false, "Keeps results and future weeks moving without manual admin work.")}
              </div>
              <div class="admin-action-row">
                <label class="admin-inline-field">Week <input name="survivorBuildWeek" type="number" min="1" value="${escapeHtml_(survivorSettings.startWeek || 1)}"></label>
                <button type="button" class="secondary" onclick="adminBuildSportsSurvivorWeek(this.form, this)">Build / Refresh Week</button>
                <button type="button" class="secondary" onclick="adminRunSportsSurvivorAutomation(this.form, this)">Run Survivor Automation Now</button>
                <button type="button" class="secondary" onclick="adminInstallSportsSurvivorAutomation(this.form, this)">Install 15-Minute Automation</button>
              </div>
              <div class="admin-sub" data-survivor-action-status></div>
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details" data-game-types="mixed" ${canonicalType === "mixed" ? "" : "hidden"}>
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Hybrid Scoring Methods</h4>
                <div class="admin-sub">Choose only the scoring methods this hybrid game will use.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>

            <div class="admin-checkbox-row">
              ${renderAdminCheckboxWithHelp_("fixedPointsEnabled", "Standard Predictions (Fixed Points)", (game.fixedPointsEnabled === true || game.predictionEnabled === true), "Allows normal one-answer prediction questions. Correct answers receive the point value assigned to the question.")}
              ${renderAdminCheckboxWithHelp_("stakedPointsEnabled", "Staked Points", game.stakedPointsEnabled === true, "Players risk points based on confidence and win or lose those points.")}
              ${renderAdminCheckboxWithHelp_("confidenceEnabled", "Confidence Pool", game.confidenceEnabled, "Players assign unique confidence values across questions.")}
              ${renderAdminCheckboxWithHelp_("wagerEnabled", "Sports Wagers", game.wagerEnabled, "Players use a separate bankroll with odds and payouts.")}
              ${renderAdminCheckboxWithHelp_("rankingEnabled", "Rankings", game.rankingEnabled, "Players rank answers instead of choosing one winner.")}
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details" data-game-types="confidence mixed" data-hybrid-feature-section="confidenceEnabled" ${(canonicalType === "confidence" || (canonicalType === "mixed" && game.confidenceEnabled)) ? "" : "hidden"}>
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Confidence Scoring</h4>
                <div class="admin-sub">Controls how assigned confidence values affect the score.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>
            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Confidence Rule", "Win Only gives zero for wrong picks. Risk Penalty subtracts the confidence value for a wrong pick.")}
                <select name="confidenceScoringMode">
                  <option value="win_only" ${game.confidenceScoringMode === "risk_penalty" ? "" : "selected"}>Win only — wrong picks get 0</option>
                  <option value="risk_penalty" ${game.confidenceScoringMode === "risk_penalty" ? "selected" : ""}>Risk penalty — wrong picks lose confidence points</option>
                </select>
              </label>
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details" data-game-types="staked-prediction mixed" data-hybrid-feature-section="stakedPointsEnabled" ${(canonicalType === "staked-prediction" || (canonicalType === "mixed" && game.stakedPointsEnabled)) ? "" : "hidden"}>
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Staked Prediction Settings</h4>
                <div class="admin-sub">Players reserve points on predictions and receive them back only on a push or cancellation.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>
            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Starting Points", "Each player begins with this point balance for staked predictions.")}
                <input name="startingPoints" type="number" min="0" value="${escapeHtml_(game.startingPoints === undefined ? 1000 : game.startingPoints)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Minimum Stake", "The smallest point amount a player may risk on one question.")}
                <input name="minStake" type="number" min="1" value="${escapeHtml_(game.minStake === undefined ? 10 : game.minStake)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Maximum Stake", "The largest point amount a player may risk on one question.")}
                <input name="maxStake" type="number" min="1" value="${escapeHtml_(game.maxStake === undefined ? 100 : game.maxStake)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Stake Increment", "Allowed step between stake choices. Example: 10 creates 10, 20, 30 and so on.")}
                <input name="stakeIncrement" type="number" min="1" value="${escapeHtml_(game.stakeIncrement === undefined ? 10 : game.stakeIncrement)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Win Multiplier", "A value of 1 gives a net win equal to the stake. A value of 2 doubles the net win.")}
                <input name="stakeWinMultiplier" type="number" min="0" step="0.1" value="${escapeHtml_(game.stakeWinMultiplier === undefined ? 1 : game.stakeWinMultiplier)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Loss Multiplier", "A value of 1 loses the full stake. A value of 0.5 loses half.")}
                <input name="stakeLossMultiplier" type="number" min="0" step="0.1" value="${escapeHtml_(game.stakeLossMultiplier === undefined ? 1 : game.stakeLossMultiplier)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Leaderboard Score", "Choose whether the leaderboard combines fixed points and stake results or displays them separately.")}
                <select name="leaderboardScoreMode">
                  <option value="combined-net" ${(game.leaderboardScoreMode || "combined-net") === "combined-net" ? "selected" : ""}>Fixed Points + Stake Net</option>
                  <option value="fixed-only" ${(game.leaderboardScoreMode || "") === "fixed-only" ? "selected" : ""}>Fixed Points Only</option>
                  <option value="staked-balance" ${(game.leaderboardScoreMode || "") === "staked-balance" ? "selected" : ""}>Stake Balance</option>
                  <option value="separate" ${(game.leaderboardScoreMode || "") === "separate" ? "selected" : ""}>Display Separately</option>
                </select>
              </label>
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details" data-game-types="wager racing-wager mixed" data-hybrid-feature-section="wagerEnabled" ${(["wager", "racing-wager"].indexOf(canonicalType) !== -1 || (canonicalType === "mixed" && game.wagerEnabled)) ? "" : "hidden"}>
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Wager Settings</h4>
                <div class="admin-sub">Uses a separate bankroll and odds-based settlement.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>
            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Starting Bankroll", "The chips or play-money balance each player receives.")}
                <input name="startingBankroll" type="number" value="${escapeHtml_(game.startingBankroll || 100)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Minimum Wager", "The smallest wager allowed on one selection.")}
                <input name="minWager" type="number" value="${escapeHtml_(game.minWager || 1)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Maximum Wager", "The largest wager allowed on one selection.")}
                <input name="maxWager" type="number" value="${escapeHtml_(game.maxWager || 100)}">
              </label>
              <label class="admin-field">
                ${adminFieldLabel_("Wager Edit Rule", "Editable Until Lock permits changes before the event locks. Final Once Selected prevents changes immediately.")}
                <select name="wagerEditMode">
                  <option value="editable_until_lock" ${String(game.wagerEditMode || "editable_until_lock") === "final_once_selected" ? "" : "selected"}>Editable until game locks</option>
                  <option value="final_once_selected" ${String(game.wagerEditMode || "") === "final_once_selected" ? "selected" : ""}>Final once selected</option>
                </select>
              </label>
            </div>
            <div class="admin-checkbox-row">
              ${renderAdminCheckboxWithHelp_("allowBetRemoval", "Allow Take Back Before Lock", game.allowBetRemoval, "Allows a saved wager to be removed before its lock time.")}
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details">
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Availability</h4>
                <div class="admin-sub">Use one status control for the game workflow, then manage player access separately.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>

            ${renderAdminGameStatusControl_(game)}

            <div class="admin-game-state-grid admin-game-access-grid">
              ${renderAdminGameStateToggle_(
                "lockAllPicks",
                "Player Entries",
                game.lockAllPicks,
                "PICKS & WAGERS: LOCKED",
                "PICKS & WAGERS: OPEN",
                "OPEN allows players to submit or change entries before each question's own lock time. LOCKED immediately blocks all picks and wagers in this game.",
                "picks",
                !isLiveStatus
              )}
              ${renderAdminGameStateToggle_(
                "defaultGame",
                "Default Game",
                game.defaultGame,
                "DEFAULT GAME: YES",
                "DEFAULT GAME: NO",
                "YES makes this the first game users see when no game is selected. It can only be enabled while Game Status is LIVE.",
                "default",
                !isLiveStatus
              )}
              ${renderAdminGameStateToggle_(
                "showLeaderboard",
                "Leaderboard",
                game.showLeaderboard,
                "LEADERBOARD: SHOWN",
                "LEADERBOARD: HIDDEN",
                "SHOWN allows players to view standings for this game. HIDDEN keeps the leaderboard out of the player view.",
                "leaderboard",
                false
              )}
            </div>

            <div class="admin-game-state-note">
              <strong>Correct workflow:</strong> Draft → Setup → Preview → Live. Draft, Setup, and Preview automatically keep entries locked and Default Game off. Live opens entries by default; you may lock them again at any time. Archive and Restore remain deliberate buttons below the form.
            </div>
          </details>

          <details class="admin-form-section admin-form-section-details">
            <summary class="admin-section-heading admin-form-section-summary">
              <div>
                <h4>Display</h4>
                <div class="admin-sub">Customize the dashboard card and game-page appearance.</div>
              </div>
              <span class="admin-collapse-icon">▾</span>
            </summary>

            <div class="form-grid">
              <label class="admin-field">
                ${adminFieldLabel_("Theme Color", "Choose with the color picker or enter a six-digit hex value.")}
                <span class="admin-color-control">
                  <input
                    type="color"
                    data-theme-color-picker="true"
                    value="${themeColor}"
                    onchange="adminSyncThemeColorText(this.form, this)"
                    aria-label="Choose theme color"
                  >
                  <input
                    id="adminGameThemeColor_${domId}"
                    name="themeColor"
                    value="${escapeHtml_(game.themeColor || themeColor)}"
                    placeholder="#c8a24a"
                    oninput="adminSyncThemeColorPicker(this.form, this)"
                  >
                </span>
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Sort Order", "Lower numbers appear earlier in game lists.")}
                <input name="sortOrder" type="number" value="${escapeHtml_(game.sortOrder || 999)}">
              </label>

              <label class="admin-field admin-wide-field">
                ${adminFieldLabel_("Description", "A brief explanation shown on the dashboard or game page.")}
                <textarea id="adminGameDescription_${domId}" name="description" rows="4" placeholder="Briefly explain how this game works.">${escapeHtml_(game.description || "")}</textarea>
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Lock Label", "Player-facing text describing when picks lock.")}
                <input id="adminGameLockLabel_${domId}" name="lockLabel" value="${escapeHtml_(game.lockLabel || "")}" placeholder="Locks before kickoff">
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Available From", "Optional date and time when the game first becomes visible.")}
                <input id="adminGameAvailableFrom_${domId}" name="availableFrom" type="datetime-local" value="${escapeHtml_(game.availableFrom || "")}">
              </label>

              <label class="admin-field">
                ${adminFieldLabel_("Available Until", "Optional date and time when the game stops being available.")}
                <input id="adminGameAvailableUntil_${domId}" name="availableUntil" type="datetime-local" value="${escapeHtml_(game.availableUntil || "")}">
              </label>
            </div>

            <div class="admin-hero-source-card">
              <label class="admin-field">
                ${adminFieldLabel_("Hero Image Source", "Use a Google Drive file ID, upload an image, or import an image from a web address. Upload and URL import become available after the game is first saved.")}
                <select name="heroImageSource" onchange="adminUpdateHeroSource(this.form)">
                  <option value="drive" selected>Google Drive File ID</option>
                  <option value="upload">Upload Image</option>
                  <option value="url">Import Web Image URL</option>
                </select>
              </label>

              <div data-hero-source="drive">
                <div class="form-grid">
                  <label class="admin-field">
                    ${adminFieldLabel_("Google Drive File ID", "Paste a Google Drive file ID or a full share link; the form extracts the ID automatically.")}
                    <input id="adminGameHeroImageFileId_${domId}" name="heroImageFileId" value="${escapeHtml_(heroImageFileId)}" placeholder="Google Drive File ID or share link" oninput="adminPreviewGameHeroImage('${escapeJs(rawGameId)}')" onchange="adminNormalizeHeroDriveInput(this, '${escapeJs(rawGameId)}')">
                  </label>
                  <label class="admin-field">
                    ${adminFieldLabel_("Image Position", "CSS-style position such as center center, top center, or 50% 30%.")}
                    <input id="adminGameHeroImagePosition_${domId}" name="heroImagePosition" value="${escapeHtml_(game.heroImagePosition || "center center")}" placeholder="center center">
                  </label>
                </div>
              </div>

              <div data-hero-source="upload" hidden>
                ${isNew ? `
                  <div class="admin-info-box">Create the game first, then reopen it to upload an image.</div>
                ` : `
                  <label class="admin-field">
                    ${adminFieldLabel_("Upload Hero Image", "Select an image from this device. It will be stored through the app's image service.")}
                    <input id="adminGameHeroFile_${domId}" class="input admin-input" type="file" accept="image/*">
                  </label>
                  <button type="button" class="admin-small-button secondary" onclick="adminUploadGameHeroImage('${escapeJs(rawGameId)}')">Upload Image</button>
                `}
              </div>

              <div data-hero-source="url" hidden>
                ${isNew ? `
                  <div class="admin-info-box">Create the game first, then reopen it to import an image from a web address.</div>
                ` : `
                  <label class="admin-field">
                    ${adminFieldLabel_("Image Web Address", "Paste a direct image URL beginning with https://. The app imports it and stores the resulting Drive file ID.")}
                    <input id="adminGameHeroUrl_${domId}" class="input admin-input" placeholder="https://example.com/image.jpg">
                  </label>
                  <button type="button" class="admin-small-button secondary" onclick="adminImportGameHeroImageFromUrl('${escapeJs(rawGameId)}')">Import URL</button>
                `}
              </div>

              ${!isNew ? `
                <div id="adminGameHeroPreview_${domId}" class="admin-game-hero-preview ${heroImageUrl ? "has-image" : ""}" ${heroImageUrl ? platformBackgroundAttrs(heroImageUrl, { variant: "hero", cssVariable: "--admin-game-hero-image", eager: true }) : ""} style="--admin-game-hero-image: none;">
                  <div class="admin-game-hero-preview-overlay">Hero image preview</div>
                </div>
                <button type="button" class="admin-small-button secondary" onclick="adminClearGameHeroImage('${escapeJs(rawGameId)}')">Clear Image</button>
                <div id="adminGameDashboardMessage_${domId}" class="admin-message"></div>
              ` : ""}
            </div>
          </details>

          <details class="admin-advanced-details">
            <summary>Advanced game controls</summary>
            <div class="admin-sub">Use these only when reviewing or overriding game state.</div>
            <div class="admin-checkbox-row">
              ${renderAdminCheckboxWithHelp_("showResultsBeforeLock", "Show Results Before Lock", game.showResultsBeforeLock, "Allows result information to appear before the category or game locks.")}
              ${renderAdminCheckboxWithHelp_("resultsFinalized", "Results Finalized", game.resultsFinalized, "Marks the game results as complete for final standings.")}
              ${renderAdminCheckboxWithHelp_("votingLocked", "Voting Locked", game.votingLocked, "Prevents ranking or community voting changes.")}
            </div>
          </details>

          ${!isNew ? `
              </div>
            </details>
          ` : ""}

          <input type="hidden" name="icon" value="${escapeHtml_(game.icon || "")}">

          <div class="admin-card-actions admin-game-primary-actions">
            <div
              class="admin-game-save-feedback"
              data-admin-game-save-feedback="true"
              aria-live="polite"
              hidden
            ></div>
            <button
              type="submit"
              class="admin-small-button admin-game-save-button"
              data-admin-game-save-button="true"
              data-clean-text="${isNew ? "CREATE GAME" : "SAVE GAME"}"
            >${isNew ? "CREATE GAME" : "SAVE GAME"}</button>
            ${!isNew ? `
              <button type="button" class="admin-small-button secondary" onclick="navigate('admin-game-setup:${escapeHtml_(game.gameId)}')">
                Categories / Questions / Nominees
              </button>
              <button
                type="button"
                class="admin-small-button secondary"
                onclick="adminRunPreflightCheck('${escapeJs(rawGameId)}')"
              >
                Run Check
              </button>
              <button
                type="button"
                id="adminArchiveCopyButton_${domId}"
                class="admin-small-button secondary"
                onclick="adminArchiveGameDataCopy('${escapeJs(rawGameId)}')"
              >
                Archive Copy
              </button>
              <button
                type="button"
                id="adminArchiveMoveButton_${domId}"
                class="admin-small-button danger"
                onclick="adminArchiveGameDataMove('${escapeJs(rawGameId)}')"
              >
                Move to Archive
              </button>
              <button
                type="button"
                id="adminArchiveRestoreButton_${domId}"
                class="admin-small-button secondary"
                onclick="adminRestoreGameData('${escapeJs(rawGameId)}')"
              >
                Restore Game
              </button>
              <span
                id="adminArchiveStatus_${domId}"
                class="admin-sub"
                aria-live="polite"
              >COPY is non-destructive. MOVE requires a verified copy and finalized game.</span>
            ` : ""}
          </div>
          ${!isNew ? `
            <div
              id="adminPreflightResult_${escapeHtml_(rawGameId)}"
              class="admin-preflight-result"
            ></div>
          ` : ""}
        </form>

      </div>
    </details>
  `;
}


function renderParentGameOptions_(
  selectedParentGameId,
  games,
  currentGameId
) {

  return (games || [])
    .filter(function(candidate) {
      return (
        candidate &&
        candidate.gameId &&
        candidate.gameId !== currentGameId &&
        (
          candidate.gameRole === "parent"
        )
      );
    })
    .map(function(candidate) {
      return `
        <option
          value="${escapeHtml_(candidate.gameId)}"
          ${candidate.gameId === selectedParentGameId ? "selected" : ""}
        >
          ${escapeHtml_(candidate.name || candidate.gameId)}
        </option>
      `;
    })
    .join("");

}

function adminUpdateHubModeFields(form) {

  if (!form || !form.hubMode) {
    return;
  }

  const isParent =
    form.gameRole && form.gameRole.value === "parent";

  const mode = form.hubMode.value || "leaderboard-only";
  const leaderboardOnly = isParent && mode === "leaderboard-only";

  form.querySelectorAll("[data-parent-question-option]").forEach(function(wrapper) {
    wrapper.hidden = !isParent || leaderboardOnly;
  });

  form.querySelectorAll("[data-hub-mode-note]").forEach(function(note) {
    note.hidden = !isParent || note.dataset.hubModeNote !== mode;
  });

  if (form.includeParentQuestions) {
    form.includeParentQuestions.disabled = !isParent || leaderboardOnly;
    if (leaderboardOnly) {
      form.includeParentQuestions.checked = false;
    }
  }

  if (form.showMiniGameLinks) {
    form.showMiniGameLinks.disabled = !isParent;
  }
}

function adminUpdateGameStructureFields(form) {

  if (!form || !form.gameRole) {
    return;
  }

  const role = form.gameRole.value || "standalone";
  const isMini = role === "mini";
  const isParent = role === "parent";

  form.querySelectorAll("[data-game-role-panel]").forEach(function(panel) {
    panel.hidden = panel.dataset.gameRolePanel !== role;
  });

  [
    "parentGameId",
    "includeInParent",
    "parentContributionMode",
    "parentContributionWeight"
  ].forEach(function(fieldName) {
    if (form[fieldName]) {
      form[fieldName].disabled = !isMini;
    }
  });

  [
    "hubMode",
    "showMiniGameLinks",
    "includeParentQuestions",
    "parentBestCount",
    "placementPointsJSON"
  ].forEach(function(fieldName) {
    if (form[fieldName]) {
      form[fieldName].disabled = !isParent;
    }
  });

  adminUpdateHubModeFields(form);
}

function renderGameTypeOptions_(
  selectedType,
  gameTypes
) {

  const selected = adminCanonicalGameType_(selectedType);
  const sourceTypes = Array.isArray(gameTypes) ? gameTypes : [];
  const byId = {};

  sourceTypes.forEach(function(type) {
    if (type && type.id) {
      byId[type.id] = type;
    }
  });

  const orderedTypes = [
    ["prediction", "Prediction Game"],
    ["staked-prediction", "Staked Prediction Game"],
    ["confidence", "Confidence Pool"],
    ["wager", "Sports Wager Game"],
    ["racing-wager", "Racing Wager Game"],
    ["voting", "Voting / Competition Game"],
    ["ranking", "Ranking Prediction Game"],
    ["head-to-head", "Head-to-Head Game"],
    ["survivor", "Survivor / Elimination Game"],
    ["team-fantasy", "Team Fantasy Football"],
    ["mixed", "Hybrid Game"]
  ];

  return orderedTypes.map(function(entry) {
    const id = entry[0];
    const fallbackLabel = entry[1];
    const source = byId[id] || {};
    const label = id === "mixed"
      ? "Hybrid Game"
      : (source.label || fallbackLabel);

    return `
      <option value="${escapeHtml_(id)}" ${id === selected ? "selected" : ""}>
        ${escapeHtml_(label)}
      </option>
    `;
  }).join("");

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

  const button = adminGameFormSaveButton_(form);

  if (!button) {
    return;
  }

  form.dataset.saving = isSaving ? "true" : "false";
  button.disabled = isSaving;

  if (isSaving) {
    adminSetGameFormSaveState_(form, "saving", "Saving changes...");
    return;
  }

  adminSetGameFormSaveState_(
    form,
    form.dataset.dirty === "true" ? "dirty" : "clean"
  );

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
  form,
  options
) {

  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  options = options || {};

  const game =
    adminGetGamePayloadFromForm_(
      form
    );

  if (!game.gameId) {
    alert("Game ID is required.");
    return false;
  }

  if (!game.name) {
    alert("Game name is required.");
    return false;
  }

  if (game.status === "Archived") {
    game.active = false;
    game.defaultGame = false;
    game.lockAllPicks = true;
    game.archived = true;
  } else if (game.status === "Draft" || game.status === "Setup") {
    game.active = false;
    game.defaultGame = false;
    game.lockAllPicks = true;
    game.archived = false;
  } else if (game.status === "Preview") {
    game.active = true;
    game.defaultGame = false;
    game.lockAllPicks = true;
    game.archived = false;
  } else {
    game.status = "Active";
    game.active = true;
    game.archived = false;
  }

  if (game.defaultGame === true && game.status !== "Active") {
    alert("Default Game can only be enabled when Game Status is LIVE.");
    return false;
  }

  if (game.themeColor && !/^#[0-9a-f]{6}$/i.test(game.themeColor)) {
    alert("Theme Color must be a six-digit hex value such as #c8a24a.");
    return false;
  }

  if (game.gameRole === "mini" && !game.parentGameId) {
    alert("Choose a parent game for this mini game.");
    return false;
  }

  if (game.gameRole === "parent" && game.hubMode === "leaderboard-only") {
    game.includeParentQuestions = false;
  }

  const minStake = Number(game.minStake) || 0;
  const maxStake = Number(game.maxStake) || 0;
  const stakeIncrement = Number(game.stakeIncrement) || 0;

  if (game.stakedPointsEnabled) {
    if (minStake < 1 || maxStake < minStake) {
      alert("Staked prediction limits are invalid. Maximum stake must be at least the minimum stake.");
      return false;
    }

    if (stakeIncrement < 1) {
      alert("Stake increment must be at least 1 point.");
      return false;
    }

    if ((maxStake - minStake) % stakeIncrement !== 0) {
      alert("Maximum stake must align with the minimum stake and stake increment.");
      return false;
    }
  }

  if (game.gameRole === "parent" && game.placementPointsJSON) {
    try {
      const placementPoints = JSON.parse(game.placementPointsJSON);

      if (!Array.isArray(placementPoints) && (!placementPoints || typeof placementPoints !== "object")) {
        throw new Error("Placement points must be an array or object");
      }
    } catch (err) {
      alert("Placement Points JSON is not valid JSON.");
      return false;
    }
  }

  const saveKey =
    "legacy-admin-game-save:" + game.gameId;

  if (ADMIN_LEGACY_GAME_SAVE_ACTIONS[saveKey]) {
    alert("Save already running. Please wait for it to finish.");
    return false;
  }

  ADMIN_LEGACY_GAME_SAVE_ACTIONS[saveKey] = true;

  adminLegacySetSaving_(
    form,
    true
  );

  adminLegacyShowSavingProgress_(
    form
  );

  const forceSetupState = options.forceSetupState === true;

  const publishRequested =
    !forceSetupState &&
    game.status === "Active";

  const publishAsDefault =
    game.defaultGame === true;

  const savePayload =
    Object.assign({}, game);

  /*
    Save the complete setup in a locked/inactive state first. This lets the
    type-aware preflight inspect the newest questions and settings before the
    game can become visible to players.
  */
  if (forceSetupState || publishRequested) {
    savePayload.active = false;
    savePayload.defaultGame = false;
    savePayload.lockAllPicks = true;
    savePayload.status = "Setup";
  }

  let res;

  try {

    res =
      await apiAdminSaveGame(
        savePayload
      );

    if (
      res &&
      res.success !== false &&
      publishRequested
    ) {

      const preflight =
        await apiAdminRunGamePreflight(
          game.gameId
        );

      if (
        !preflight ||
        preflight.success === false
      ) {
        res = {
          success: false,
          error: preflight && (preflight.error || preflight.message)
            ? preflight.error || preflight.message
            : "Game setup was saved, but the production check could not run. The game remains in Setup and locked."
        };
      } else if (Number(preflight.errorCount) > 0) {
        res = {
          success: false,
          error: "Game setup was saved, but it was not activated because the production check found " + preflight.errorCount + " error(s). Run Check in Manage Games for details."
        };
      } else {

        const continueWithWarnings =
          Number(preflight.warningCount) === 0 ||
          confirm(
            "The production check found " +
            preflight.warningCount +
            " warning(s). Publish this game as LIVE anyway?"
          );

        if (!continueWithWarnings) {
          res = {
            success: true,
            setupOnly: true,
            message: "Game setup was saved. Activation was cancelled, so the game remains in Setup and locked."
          };
        } else {
          res = await apiAdminUpdateGame({
            gameId: game.gameId,
            status: "Active",
            active: true,
            archived: false,
            defaultGame: publishAsDefault,
            lockAllPicks: game.lockAllPicks === true
          });
        }

      }

    }

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

    const setupWasSaved =
      /^Game setup was saved/i.test(saveErrorMessage);

    if (setupWasSaved) {
      adminMarkGameFormClean_(form);
    } else {
      adminMarkGameFormDirty(form);
    }

    alert(
      /^(Could not save game:|Game setup was saved)/i.test(saveErrorMessage)
        ? saveErrorMessage
        : "Could not save game: " + saveErrorMessage
    );

    // Reload the live Manage Games state after a blocked publish. The setup
    // was saved inactive and locked, so leaving the requested Active checkbox
    // checked on screen would incorrectly imply that the game went live.
    if (setupWasSaved && options.navigateAfterSave !== false) {
      await navigate("admin-games", { skipUnsavedCheck: true });
    }

    return false;

  }

  const successMessage =
    options.savedMessage ||
    (
      res && res.message
        ? res.message
        : publishRequested
          ? "Game saved and activated."
          : "Game saved."
    );

  adminShowGameFormSaved_(form, successMessage);

  if (
    !options.suppressSuccessAlert &&
    res &&
    res.setupOnly === true
  ) {
    alert(successMessage);
  }

  if (options.navigateAfterSave !== false) {
    await new Promise(function(resolve) {
      window.setTimeout(resolve, 1200);
    });

    await navigate(
      "admin-games",
      { skipUnsavedCheck: true }
    );
  }

  return true;

}

function adminGetGamePayloadFromForm_(
  form
) {

  const featureFlags = adminGameTypeFeatureFlags_(form);
  const status = adminCanonicalGameStatus_(
    form.status ? form.status.value : "Draft",
    form.active ? form.active.checked : false,
    form.archived ? form.archived.checked : false
  );

  return {
    gameId:
      form.gameId.value.trim(),

    name:
      form.name.value.trim(),

    year:
      form.year.value.trim(),

    type:
      form.type.value,

    survivorSettingsJSON:
      JSON.stringify({
        mode: form.survivorMode ? form.survivorMode.value : "manual-elimination",
        sport: "football",
        league: form.survivorLeague ? form.survivorLeague.value : "nfl",
        seasonYear: form.survivorSeasonYear ? form.survivorSeasonYear.value : new Date().getFullYear(),
        seasonType: "2", seasonPhase: "regular",
        startWeek: form.survivorMode && form.survivorMode.value === "king-of-the-hill" ? (form.kothStartWeek ? form.kothStartWeek.value : 1) : (form.survivorStartWeek ? form.survivorStartWeek.value : 1),
        endWeek: form.survivorMode && form.survivorMode.value === "king-of-the-hill" ? (form.kothEndWeek ? form.kothEndWeek.value : 18) : (form.survivorEndWeek ? form.survivorEndWeek.value : 18),
        resultMode: form.survivorResultMode ? form.survivorResultMode.value : "straight-up",
        lossesAllowed: form.survivorLossesAllowed ? form.survivorLossesAllowed.value : 0,
        teamUseLimit: form.survivorTeamUseLimit ? form.survivorTeamUseLimit.value : 1,
        pickLockMode: form.survivorPickLockMode ? form.survivorPickLockMode.value : "team-kickoff",
        missedPickRule: form.survivorMissedPickRule ? form.survivorMissedPickRule.value : "loss",
        pushRule: form.survivorPushRule ? form.survivorPushRule.value : "survive",
        endMode: form.survivorEndMode ? form.survivorEndMode.value : "sole-survivor",
        showRecords: !!(form.survivorShowRecords && form.survivorShowRecords.checked),
        showOdds: !!(form.survivorShowOdds && form.survivorShowOdds.checked),
        showOpponent: !!(form.survivorShowOpponent && form.survivorShowOpponent.checked),
        showSchedule: !!(form.survivorShowSchedule && form.survivorShowSchedule.checked),
        oddsFreezeMode: form.survivorOddsFreezeMode ? form.survivorOddsFreezeMode.value : "weekly-lock",
        kothBasePoints: form.survivorKothBasePoints ? form.survivorKothBasePoints.value : 10,
        kothMultiplierStep: form.survivorKothMultiplierStep ? form.survivorKothMultiplierStep.value : 1,
        kothMaxMultiplier: form.survivorKothMaxMultiplier ? form.survivorKothMaxMultiplier.value : 5,
        kothLossBehavior: form.survivorKothLossBehavior ? form.survivorKothLossBehavior.value : "reset",
        kothSourceGameIds: Array.from(form.querySelectorAll('input[name="kothSourceGameId"]:checked')).map(function(input) { return input.value; }),
        kothCombineMode: form.kothCombineMode ? form.kothCombineMode.value : "sum",
        kothEntryAggregation: form.kothEntryAggregation ? form.kothEntryAggregation.value : "sum",
        kothStrikeLimit: form.kothStrikeLimit ? form.kothStrikeLimit.value : 3,
        kothPacingMode: form.kothPacingMode ? form.kothPacingMode.value : "automatic",
        kothFixedRecipients: form.kothFixedRecipients ? form.kothFixedRecipients.value : 3,
        kothCustomSchedule: form.kothCustomSchedule ? form.kothCustomSchedule.value.trim() : "",
        kothTieRule: form.kothTieRule ? form.kothTieRule.value : "include-all",
        kothMinRecipients: form.kothMinRecipients ? form.kothMinRecipients.value : 1,
        kothMaxRecipients: form.kothMaxRecipients ? form.kothMaxRecipients.value : 0,
        kothStartMode: form.kothStartMode ? form.kothStartMode.value : "start-fresh",
        kothAutoProcess: !!(form.kothAutoProcess && form.kothAutoProcess.checked),
        earnLifeEnabled: !!(form.survivorEarnLifeEnabled && form.survivorEarnLifeEnabled.checked),
        earnLifeWinStreak: form.survivorEarnLifeWinStreak ? form.survivorEarnLifeWinStreak.value : 5,
        maxEarnedLives: form.survivorMaxEarnedLives ? form.survivorMaxEarnedLives.value : 1,
        safeWeeks: form.survivorSafeWeeks ? form.survivorSafeWeeks.value.trim() : "",
        atsWeeks: form.survivorATSWeeks ? form.survivorATSWeeks.value.trim() : "",
        underdogWeeks: form.survivorUnderdogWeeks ? form.survivorUnderdogWeeks.value.trim() : "",
        roadOnlyWeeks: form.survivorRoadOnlyWeeks ? form.survivorRoadOnlyWeeks.value.trim() : "",
        divisionWeeks: form.survivorDivisionWeeks ? form.survivorDivisionWeeks.value.trim() : "",
        doublePickWeeks: form.survivorDoublePickWeeks ? form.survivorDoublePickWeeks.value.trim() : "",
        secondChanceWeeks: form.survivorSecondChanceWeeks ? form.survivorSecondChanceWeeks.value.trim() : "",
        redemptionWeeks: form.survivorRedemptionWeeks ? form.survivorRedemptionWeeks.value.trim() : "",
        confidenceWeeks: form.survivorConfidenceWeeks ? form.survivorConfidenceWeeks.value.trim() : "",
        maxConfidenceRisk: form.survivorMaxConfidenceRisk ? form.survivorMaxConfidenceRisk.value : 10,
        autoSettle: !!(form.survivorAutoSettle && form.survivorAutoSettle.checked),
        autoBuildNextWeek: !!(form.survivorAutoBuildNextWeek && form.survivorAutoBuildNextWeek.checked),
        autoRefreshOdds: !!(form.survivorAutoRefreshOdds && form.survivorAutoRefreshOdds.checked),
        automationEnabled: form.survivorMode && form.survivorMode.value === "king-of-the-hill"
          ? !!(form.kothAutomationEnabled && form.kothAutomationEnabled.checked)
          : !!(form.survivorAutomationEnabled && form.survivorAutomationEnabled.checked)
      }),

    active:
      form.active.checked,

    archived:
      form.archived.checked,

    defaultGame:
      form.defaultGame.checked,

    predictionEnabled:
      featureFlags.predictionEnabled,

    rankingEnabled:
      featureFlags.rankingEnabled,

    confidenceEnabled:
      featureFlags.confidenceEnabled,

    confidenceScoringMode:
      form.confidenceScoringMode
        ? form.confidenceScoringMode.value
        : "win_only",  

    wagerEnabled:
      featureFlags.wagerEnabled,

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

    gameFormat:
      form.gameFormat
        ? form.gameFormat.value
        : "standard",

    scoringMode:
      form.gameFormat
        ? form.gameFormat.value
        : "standard",

    mixedGame:
      form.gameFormat
        ? form.gameFormat.value === "hybrid"
        : false,

    scoringEngine:
      form.scoringEngine
        ? form.scoringEngine.value
        : "manual",

    gameRole:
      form.gameRole
        ? form.gameRole.value
        : "standalone",

    hubMode:
      form.hubMode
        ? form.hubMode.value
        : "playable-aggregate",

    showMiniGameLinks:
      form.showMiniGameLinks
        ? form.showMiniGameLinks.checked
        : true,

    includeParentQuestions:
      form.includeParentQuestions
        ? form.includeParentQuestions.checked
        : true,

    parentGameId:
      form.parentGameId
        ? form.parentGameId.value
        : "",

    includeInParent:
      form.includeInParent
        ? form.includeInParent.checked
        : true,

    parentContributionMode:
      form.parentContributionMode
        ? form.parentContributionMode.value
        : "add-points",

    parentContributionWeight:
      form.parentContributionWeight
        ? form.parentContributionWeight.value
        : 1,

    parentBestCount:
      form.parentBestCount
        ? form.parentBestCount.value
        : 0,

    placementPointsJSON:
      form.placementPointsJSON
        ? form.placementPointsJSON.value.trim()
        : "",

    leaderboardScoreMode:
      form.leaderboardScoreMode
        ? form.leaderboardScoreMode.value
        : "combined-net",

    fixedPointsEnabled:
      featureFlags.fixedPointsEnabled,

    stakedPointsEnabled:
      featureFlags.stakedPointsEnabled,

    startingPoints:
      form.startingPoints
        ? form.startingPoints.value
        : 1000,

    minStake:
      form.minStake
        ? form.minStake.value
        : 10,

    maxStake:
      form.maxStake
        ? form.maxStake.value
        : 100,

    stakeIncrement:
      form.stakeIncrement
        ? form.stakeIncrement.value
        : 10,

    stakeWinMultiplier:
      form.stakeWinMultiplier
        ? form.stakeWinMultiplier.value
        : 1,

    stakeLossMultiplier:
      form.stakeLossMultiplier
        ? form.stakeLossMultiplier.value
        : 1,

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
      status,

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

function adminUpdateSurvivorRuleFields(form) {
  if (!form) return;
  const mode = form.survivorMode ? form.survivorMode.value : "manual-elimination";
  const activePickMode = mode === "sports-survivor" || mode === "streak-survivor";
  form.querySelectorAll("[data-survivor-sports-field]").forEach(function(el) { el.hidden = !activePickMode; });
  form.querySelectorAll("[data-survivor-streak-field]").forEach(function(el) { el.hidden = mode !== "streak-survivor"; });
  form.querySelectorAll("[data-survivor-koth-field]").forEach(function(el) { el.hidden = mode !== "king-of-the-hill"; });
}

async function adminProcessKothWeek(form, button) {
  if (!form) return;
  const gameId = form.gameId.value.trim();
  if (!gameId) { alert("Save the game first so it has a Game ID."); return; }
  const status = form.querySelector("[data-koth-action-status]");
  if (status) status.textContent = "Checking finalized source scores and processing KOTH…";
  if (button) button.disabled = true;
  try {
    const saved = await apiAdminSaveGame(adminGetGamePayloadFromForm_(form));
    if (!saved || saved.success === false) throw new Error(saved && saved.error || "Could not save King of the Hill settings.");
    const res = await apiAdminBuildSportsSurvivorWeek({ gameId: gameId, week: form.kothProcessWeek ? form.kothProcessWeek.value : "" });
    if (!res || res.success === false) throw new Error(res && res.error || "Could not process King of the Hill week.");
    if (status) status.textContent = res.duplicate
      ? `Week ${res.week} was already processed; no duplicate strikes were added.`
      : `Week ${res.week} processed: ${res.actualRecipients || 0} strike recipient${Number(res.actualRecipients || 0) === 1 ? "" : "s"}${res.soleSurvivor ? ` · Sole Survivor: ${res.soleSurvivor}` : ""}.`;
    adminMarkGameFormClean_(form);
  } catch (err) {
    if (status) status.textContent = err.message || String(err);
    alert(err.message || err);
  } finally { if (button) button.disabled = false; }
}

async function adminBuildSportsSurvivorWeek(form, button) {
  if (!form) return;
  const gameId = form.gameId.value.trim();
  if (!gameId) { alert("Save the game first so it has a Game ID."); return; }
  const status = form.querySelector("[data-survivor-action-status]");
  if (status) status.textContent = "Building Survivor week…";
  if (button) button.disabled = true;
  try {
    // Save rule changes before the builder reads them.
    const saved = await apiAdminSaveGame(adminGetGamePayloadFromForm_(form));
    if (!saved || saved.success === false) throw new Error(saved && saved.error || "Could not save Survivor settings.");
    const res = await apiAdminBuildSportsSurvivorWeek({ gameId: gameId, week: form.survivorBuildWeek ? form.survivorBuildWeek.value : "" });
    if (!res || res.success === false) throw new Error(res && res.error || "Could not build Survivor week.");
    if (status) status.textContent = res.duplicate ? `Week ${res.week} already exists; current sports data was refreshed.` : `Week ${res.week} built with ${res.teams || 0} teams.`;
    adminMarkGameFormClean_(form);
  } catch (err) {
    if (status) status.textContent = err.message || String(err);
    alert(err.message || err);
  } finally { if (button) button.disabled = false; }
}

async function adminRunSportsSurvivorAutomation(form, button) {
  if (!form) return;
  const gameId = form.gameId.value.trim();
  const isKoth = !!(form.survivorMode && form.survivorMode.value === "king-of-the-hill");
  const status = form.querySelector(isKoth ? "[data-koth-action-status]" : "[data-survivor-action-status]");
  if (status) status.textContent = isKoth ? "Checking finalized source scores and KOTH strike pacing…" : "Syncing scores, grading, and checking the next week…";
  if (button) button.disabled = true;
  try {
    const saved = await apiAdminSaveGame(adminGetGamePayloadFromForm_(form));
    if (!saved || saved.success === false) throw new Error(saved && saved.error || "Could not save Survivor settings.");
    const res = await apiAdminRunSportsSurvivor({ gameId: gameId });
    if (!res || res.success === false) throw new Error(res && res.error || (isKoth ? "King of the Hill automation failed." : "Survivor automation failed."));
    if (status) {
      if (isKoth) {
        const processed = Array.isArray(res.results) ? res.results.filter(function(row) { return row && row.success && !row.duplicate; }).length : 0;
        const pending = Array.isArray(res.results) ? res.results.find(function(row) { return row && row.pending; }) : null;
        status.textContent = res.soleSurvivor
          ? `King of the Hill complete · Sole Survivor: ${res.soleSurvivor}`
          : (pending ? (pending.error || "Waiting for finalized KOTH source scores.") : `King of the Hill automation completed (${processed} week${processed === 1 ? "" : "s"} processed).`);
      } else {
        status.textContent = `Survivor automation completed (${(res.actions || []).length} action${(res.actions || []).length === 1 ? "" : "s"}).`;
      }
    }
    adminMarkGameFormClean_(form);
  } catch (err) { if (status) status.textContent = err.message || String(err); alert(err.message || err); }
  finally { if (button) button.disabled = false; }
}

async function adminInstallSportsSurvivorAutomation(form, button) {
  if (!form) return;
  const isKoth = !!(form.survivorMode && form.survivorMode.value === "king-of-the-hill");
  const status = form.querySelector(isKoth ? "[data-koth-action-status]" : "[data-survivor-action-status]");
  if (button) button.disabled = true;
  try {
    const res = await apiAdminInstallSportsSurvivorAutomation({ gameId: form.gameId.value.trim() });
    if (!res || res.success === false) throw new Error(res && res.error || "Could not install Survivor automation.");
    if (status) status.textContent = res.installed ? "15-minute Survivor automation installed." : "15-minute Survivor automation is already active.";
  } catch (err) { if (status) status.textContent = err.message || String(err); alert(err.message || err); }
  finally { if (button) button.disabled = false; }
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

  if (!form || !form.type) {
    return;
  }

  const type = adminCanonicalGameType_(form.type.value);

  const setChecked = function(name, checked) {
    if (form[name]) {
      form[name].checked = checked;
    }
  };

  setChecked("predictionEnabled", false);
  setChecked("rankingEnabled", false);
  setChecked("confidenceEnabled", false);
  setChecked("wagerEnabled", false);
  setChecked("fixedPointsEnabled", false);
  setChecked("stakedPointsEnabled", false);

  /* TEAM_FANTASY_V1218J1 DEFAULTS */
  if (type === "team-fantasy") {
    // Team Fantasy uses SportsTeamFantasyEngine rather than generic questions.
    // The common reset above intentionally leaves all generic scoring flags off.
  }

  if (["prediction", "head-to-head", "survivor"].indexOf(type) !== -1) {
    setChecked("predictionEnabled", true);
    setChecked("fixedPointsEnabled", true);
  }

  if (type === "staked-prediction") {
    setChecked("predictionEnabled", true);
    setChecked("stakedPointsEnabled", true);
  }

  if (type === "confidence") {
    setChecked("predictionEnabled", true);
    setChecked("confidenceEnabled", true);
  }

  if (type === "wager" || type === "racing-wager") {
    setChecked("wagerEnabled", true);
  }

  if (type === "ranking") {
    setChecked("rankingEnabled", true);
  }

  if (type === "voting") {
    // Voting / Competition uses VotingCompetitionEngine rather than generic question scoring.
  }

  if (type === "mixed") {
    // Standard Predictions is represented by the fixedPointsEnabled control.
    // predictionEnabled is derived from it when the form is saved.
    setChecked("predictionEnabled", true);
    setChecked("fixedPointsEnabled", true);
    setChecked("stakedPointsEnabled", true);
    setChecked("wagerEnabled", true);
  }

  if (form.gameFormat) {
    form.gameFormat.value = type === "mixed" ? "hybrid" : "standard";
  }

  adminUpdateGameTypeSections(form);
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

async function adminSetupNormalizedStorage() {

  const message = document.getElementById("adminMessage");

  if (message) {
    message.innerText = "Creating normalized storage and migrating existing questions...";
  }

  const res = await apiAdminSetupNormalizedQuestionStorage(false);

  if (message) {
    const migration = res && res.migration ? res.migration : null;
    message.innerText = res && res.success
      ? "Storage ready. " + (
          migration
            ? (migration.questions || 0) + " questions and " +
              (migration.options || 0) + " answers normalized."
            : ""
        )
      : (res && (res.error || res.message)) || "Unable to setup storage.";
  }

}

async function adminCheckStorageHealth(gameId) {

  const target = document.getElementById("adminStorageHealth");

  if (target) {
    target.innerHTML = '<div class="admin-info-box">Checking storage...</div>';
  }

  const res = await apiAdminGetStorageHealth(gameId || "");

  if (!target) {
    return;
  }

  if (!res || res.success === false) {
    target.innerHTML = `<div class="admin-info-box error-card">${escapeHtml_((res && (res.error || res.message)) || "Unable to load storage health.")}</div>`;
    return;
  }

  const game = res.game || null;
  const largest = (res.sheets || [])
    .slice()
    .sort(function(a, b) {
      return Number(b.cells || 0) - Number(a.cells || 0);
    })
    .slice(0, 5);

  target.innerHTML = `
    <div class="admin-storage-health-card">
      <div class="admin-storage-health-summary">
        <strong>${Number(res.totalCells || 0).toLocaleString()} active cells</strong>
        <span>${Number(res.estimatedPercentUsed || 0).toFixed(2)}% of the spreadsheet cell limit</span>
      </div>
      ${game ? `
        <div class="admin-storage-health-grid">
          <span>Questions <strong>${Number(game.questions || 0).toLocaleString()}</strong></span>
          <span>Answers <strong>${Number(game.options || 0).toLocaleString()}</strong></span>
          <span>Legacy rows <strong>${Number(game.legacyCategoryRows || 0).toLocaleString()}</strong></span>
        </div>
      ` : ""}
      <div class="admin-storage-sheet-list">
        ${largest.map(function(sheet) {
          return `<div><span>${escapeHtml_(sheet.sheetName)}</span><strong>${Number(sheet.cells || 0).toLocaleString()} cells</strong></div>`;
        }).join("")}
      </div>
    </div>
  `;

}

function adminArchiveControls_(gameId) {
  const domId = typeof adminGameDomId_ === "function"
    ? adminGameDomId_(gameId)
    : String(gameId).replace(/[^a-zA-Z0-9_-]/g, "_");

  return {
    domId: domId,
    status: document.getElementById(
      "adminArchiveStatus_" + domId
    ),
    copyButton: document.getElementById(
      "adminArchiveCopyButton_" + domId
    ),
    moveButton: document.getElementById(
      "adminArchiveMoveButton_" + domId
    ),
    restoreButton: document.getElementById(
      "adminArchiveRestoreButton_" + domId
    )
  };
}

function adminSetArchiveControlsBusy_(controls, busy, mode) {
  [
    controls.copyButton,
    controls.moveButton,
    controls.restoreButton
  ].forEach(function(button) {
    if (button) {
      button.disabled = busy === true;
    }
  });

  if (controls.copyButton) {
    controls.copyButton.textContent = busy && mode === "COPY"
      ? "Copying…"
      : "Archive Copy";
  }

  if (controls.moveButton) {
    controls.moveButton.textContent = busy && mode === "MOVE"
      ? "Moving…"
      : "Move to Archive";
  }

  if (controls.restoreButton) {
    controls.restoreButton.textContent = busy && mode === "RESTORE"
      ? "Restoring…"
      : "Restore Game";
  }
}

function adminShowArchiveProgress_(controls, progress) {
  const status = controls && controls.status;

  if (!status || !progress) {
    return;
  }

  if (progress.finalized === true) {
    status.textContent = progress.success === false
      ? "Archive workflow failed verification."
      : (progress.message || "Archive workflow verified.");
    return;
  }

  const next = progress.nextStep || "";
  const stage = progress.currentStage || "PREPARE";

  if (stage === "PREPARE") {
    const completed = Number(
      progress.preparationCompleted || 0
    );
    const total = Number(
      progress.preparationTotal || 0
    );

    if (progress.legacyJobReset === true) {
      status.textContent =
        "Outdated archive job reset — restarting safely…";
      return;
    }

    status.textContent = total > 0
      ? "Preparing " + completed + " of " + total +
        (next ? " — next: " + next : "")
      : "Preparing archive workflow…";
    return;
  }

  if (stage === "RESTORE") {
    const completed = Number(progress.restoreCompleted || 0);
    const total = Number(progress.restoreTotal || 0);

    status.textContent = total > 0
      ? "Restoring " + completed + " of " + total +
        (next ? " — next: " + next : "")
      : "Finalizing restore…";
    return;
  }

  const completed = Number(progress.archiveCompleted || 0);
  const total = Number(progress.archiveTotal || 0);

  const archiveVerb = progress.mode === "MOVE"
    ? "Verifying MOVE "
    : "Archiving ";

  status.textContent = total > 0
    ? archiveVerb + completed + " of " + total +
      (next ? " — next: " + next : "")
    : "Finalizing archive…";
}

async function adminRunGameArchiveWorkflow_(
  gameId,
  mode,
  notes,
  options
) {
  const controls = adminArchiveControls_(gameId);
  options = options || {};

  adminSetArchiveControlsBusy_(controls, true, mode);

  if (controls.status) {
    controls.status.textContent = mode === "RESTORE"
      ? "Starting restore job…"
      : "Starting archive job…";
  }

  try {
    const res = await apiAdminArchiveGameData(
      gameId,
      mode,
      notes,
      mode === "MOVE",
      function(progress) {
        adminShowArchiveProgress_(controls, progress);
      },
      options
    );

    if (!res || res.success === false) {
      const message =
        (res && (res.error || res.message)) ||
        "Archive workflow did not complete.";

      if (controls.status) {
        controls.status.textContent = message;
      }

      alert(message);
      return res;
    }

    if (controls.status) {
      controls.status.textContent = res.message || "Archive workflow verified.";
    }

    alert(
      (res.message || "Archive workflow verified.") +
      "\n\nArchive: " +
      (res.archiveSpreadsheetUrl ||
        res.archiveSpreadsheetId ||
        "Available")
    );

    if (mode === "MOVE" || mode === "RESTORE") {
      navigate("admin-games");
    }

    return res;
  } finally {
    adminSetArchiveControlsBusy_(controls, false, mode);
  }
}

async function adminArchiveGameDataCopy(gameId) {
  if (!gameId) {
    alert("GameId is required.");
    return;
  }

  const ok = confirm(
    "Create a verified archive copy of this game's questions, answers, results, picks, and wagers? Active data will not be removed."
  );

  if (!ok) {
    return;
  }

  return adminRunGameArchiveWorkflow_(
    gameId,
    "COPY",
    "Archive copy created from Manage Games",
    {}
  );
}

async function adminArchiveGameDataMove(gameId) {
  if (!gameId) {
    alert("GameId is required.");
    return;
  }

  const controls = adminArchiveControls_(gameId);

  if (controls.status) {
    controls.status.textContent = "Checking safe MOVE requirements…";
  }

  const status = await apiAdminGetArchiveGameStatus(gameId);

  if (!status || status.success === false) {
    alert(
      (status && (status.error || status.message)) ||
      "Could not check archive status."
    );
    return;
  }

  const readiness = status.moveReadiness || {};

  if (readiness.ready !== true) {
    const blockers = readiness.blockers || [
      "The game is not ready to move."
    ];
    const message = "MOVE is blocked:\n\n- " + blockers.join("\n- ");

    if (controls.status) {
      controls.status.textContent = blockers.join(" ");
    }

    alert(message);
    return;
  }

  const requiredText = "MOVE " + gameId;
  const typed = prompt(
    "This will remove active question, result, pick, wager, and settings rows after another full archive verification.\n\nThe game will remain in Manage Games as an inactive archived record.\n\nType exactly:\n" +
    requiredText
  );

  if (typed !== requiredText) {
    alert("MOVE cancelled. The confirmation text did not match.");
    return;
  }

  const confirmed = confirm(
    "Final confirmation: move " + gameId + " to the verified yearly archive?"
  );

  if (!confirmed) {
    return;
  }

  return adminRunGameArchiveWorkflow_(
    gameId,
    "MOVE",
    "Safe MOVE created from Manage Games",
    {
      confirmationText: typed
    }
  );
}

async function adminRestoreGameData(gameId) {
  if (!gameId) {
    alert("GameId is required.");
    return;
  }

  const controls = adminArchiveControls_(gameId);

  if (controls.status) {
    controls.status.textContent = "Checking restore availability…";
  }

  const status = await apiAdminGetArchiveGameStatus(gameId);

  if (!status || status.success === false) {
    alert(
      (status && (status.error || status.message)) ||
      "Could not check restore status."
    );
    return;
  }

  const readiness = status.restoreReadiness || {};

  if (readiness.ready !== true) {
    const message = readiness.error ||
      "Restore is blocked because active game data still exists or no verified archive is available.";

    if (controls.status) {
      controls.status.textContent = message;
    }

    alert(message);
    return;
  }

  const confirmed = confirm(
    "Restore all verified rows for " + gameId +
    " from the yearly archive? The archived game record will be replaced with its original saved Games row."
  );

  if (!confirmed) {
    return;
  }

  return adminRunGameArchiveWorkflow_(
    gameId,
    "RESTORE",
    "Verified archive restored from Manage Games",
    {
      confirmRestore: true
    }
  );
}

function adminToggleCategoryResultStatus(categoryId) {

  const statusInput =
    document.getElementById(
      "result-status-" + categoryId
    );

  const winnerInput =
    document.getElementById(
      "winner-" + categoryId
    );

  if (!winnerInput) {
    return;
  }

  const requiresWinner =
    !!statusInput &&
    statusInput.value === "winner";

  winnerInput.disabled =
    !requiresWinner;

  if (!requiresWinner) {
    winnerInput.value = "";
  }

}

async function adminSaveCategory(categoryId) {

  const message =
    document.getElementById("adminMessage");

  const pointsInput =
    document.getElementById(
      "points-" + categoryId
    );

  const statusInput =
    document.getElementById(
      "result-status-" + categoryId
    );

  const winnerInput =
    document.getElementById(
      "winner-" + categoryId
    );

  const selectedResultStatus =
    statusInput
      ? String(statusInput.value || "pending")
          .trim()
          .toLowerCase()
      : "pending";

  const winnerNomineeId =
    selectedResultStatus === "winner" &&
    winnerInput
      ? String(winnerInput.value || "")
          .trim()
      : "";

  if (
    selectedResultStatus === "winner" &&
    !winnerNomineeId
  ) {

    if (message) {
      message.innerText =
        "Select the winning nominee before saving a final result.";
    }

    return;

  }

  if (message) {
    message.innerText =
      "Saving category result...";
  }

  const settlementStatus =
    selectedResultStatus === "winner"
      ? "settled"
      : selectedResultStatus;

  const res =
    await apiAdminUpdateCategory({
      gameId:
        APP_STATE.gameId || "",

      categoryId:
        categoryId,

      points:
        pointsInput
          ? pointsInput.value
          : undefined,

      winnerNomineeId:
        winnerNomineeId,

      settlementStatus:
        settlementStatus,

      wagerResultType:
        selectedResultStatus === "push" ||
        selectedResultStatus === "cancelled"
          ? selectedResultStatus
          : "",

      notes:
        "Result saved from main Category Controls: " +
        selectedResultStatus
    });

  if (!res || res.success === false) {

    if (message) {
      message.innerText =
        res && (res.error || res.message)
          ? res.error || res.message
          : "Unable to save category result.";
    }

    return;

  }

  if (message) {

    if (selectedResultStatus === "winner") {
      message.innerText =
        "Category saved and winner finalized.";
    } else if (selectedResultStatus === "push") {
      message.innerText =
        "Category saved as a push. Stakes will be returned.";
    } else if (selectedResultStatus === "cancelled") {
      message.innerText =
        "Category cancelled. Stakes will be returned.";
    } else {
      message.innerText =
        "Category reset to pending.";
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
      "Reset this category result to Pending?"
    );

  if (!confirmed) {
    return;
  }

  const message =
    document.getElementById("adminMessage");

  if (message) {
    message.innerText =
      "Resetting category to pending...";
  }

  const res =
    await apiAdminUpdateCategory({
      gameId:
        APP_STATE.gameId || "",

      categoryId:
        categoryId,

      winnerNomineeId:
        "",

      settlementStatus:
        "pending",

      wagerResultType:
        "",

      notes:
        "Result reset to pending from main Category Controls"
    });

  if (res && res.success !== false) {

    const statusInput =
      document.getElementById(
        "result-status-" + categoryId
      );

    const winnerInput =
      document.getElementById(
        "winner-" + categoryId
      );

    if (statusInput) {
      statusInput.value = "pending";
    }

    if (winnerInput) {
      winnerInput.value = "";
      winnerInput.disabled = true;
    }

  }

  if (message) {
    message.innerText =
      res && res.success !== false
        ? "Category reset to pending."
        : res && (res.error || res.message)
          ? res.error || res.message
          : "Unable to reset category.";
  }

}
  
async function adminCreateUser() {
  const username = String((document.getElementById("newUserUsername") || {}).value || "").trim();
  const pin = String((document.getElementById("newUserPin") || {}).value || "").trim();
  const avatar = String((document.getElementById("newUserAvatar") || {}).value || "avatar1").trim() || "avatar1";
  const themeColor = String((document.getElementById("newUserThemeColor") || {}).value || "#ffcc00").trim() || "#ffcc00";
  const isAdmin = !!((document.getElementById("newUserIsAdmin") || {}).checked);
  const message = document.getElementById("adminMessage");

  if (!username || !pin) {
    if (message) message.innerText = "Username and PIN are required.";
    return;
  }

  if (message) message.innerText = "Creating user...";
  const res = await apiAdminCreateUser({ username: username, pin: pin, isAdmin: isAdmin, avatar: avatar, themeColor: themeColor });
  if (!res || res.success === false) {
    if (message) message.innerText = (res && (res.error || res.message)) || "Unable to create user.";
    return;
  }

  ADMIN_LAZY_DETAILS_CACHE_ = null;
  if (message) message.innerText = "User created.";
  await navigate("admin");
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
    playersSection:
      "Players syncs ESPN rosters into SportsPlayers and refreshes current-game box-score statistics into SportsPlayerGameStats. Supported team sports include baseball, football, basketball, hockey, and configured soccer competitions.",
    syncPlayers:
      "Syncs the complete current ESPN roster for this league, including player IDs, teams, positions, jersey numbers, headshots, and active status.",
    refreshPlayerStats:
      "Refreshes player box-score statistics for current, recent, and final games around today. Run score refresh first when a game is missing from SportsScores.",
    snapshotsSection:
      "Snapshots save quarter/period/final checkpoints. Leave this off for simpler moneyline-only wagers; turn it on when you want history or period-style betting later.",
    oddsSection:
      "Odds are simple on purpose: League must be ON, Odds must be ON, daily/monthly limits must allow it, and region is fixed to US. Odds Window controls how far ahead to check.",
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
      "Turns odds on for this league. If the League switch is OFF, odds are paused and cannot be refreshed.",
    oddsCooldown:
      "Legacy field only. The simplified admin uses daily and monthly limits instead.",
    oddsDaily:
      "Maximum odds refreshes allowed for this league today. Keep this at 1 while testing.",
    oddsMonthly:
      "Monthly budget for this league. This protects the 500-call Odds API limit.",
    oddsWindow:
      "How far ahead this league checks odds. Standard = 14 days, Long = 30 days, Half Season = half the remaining season, Full Season = through season end. Sportsbooks may not post odds that far ahead.",
    oddsUsage:
      "Shows the simple odds status, usage counters, last result, and remaining API calls.",
    refreshOdds:
      "Refreshes odds for this one league. It only works when the League switch is ON and odds limits allow it.",
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
    scheduleReconcile:
      "Rechecks ESPN for near-schedule changes, including postponed games, rescheduled games, and playoff/TBD teams. It updates SportsGames and SportsScores without deleting history.",
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
      "Shows current trigger counts and Odds API usage. Schedule reconcile is the automatic recheck that keeps postponed, rescheduled, and playoff/TBD games current after the original schedule is built.",
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

  if (label.indexOf("smart sports sync") >= 0) {
    return "Queueing sync...";
  }

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

function adminSportsHoldActionProgress_(button, message, holdMs) {
  if (!button) return;

  const wrap = button.closest
    ? button.closest(".sports-action-wrap")
    : null;
  const holdUntil = Date.now() + Math.max(10000, Number(holdMs || 15000));
  button.setAttribute("data-sports-hold-status-until", String(holdUntil));

  if (!wrap) return;
  const text = wrap.querySelector("[data-sports-status-text]");
  const status = wrap.querySelector(".sports-action-status");
  if (text) text.textContent = message || "Done.";
  if (status) status.removeAttribute("hidden");
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

  const holdUntil = Number(
    button.getAttribute("data-sports-hold-status-until") || 0
  );
  const remaining = holdUntil - Date.now();

  wrap.classList.remove("is-working");

  if (remaining > 0) {
    setTimeout(function() {
      if (!document.body.contains(button)) return;
      button.removeAttribute("data-sports-hold-status-until");
      adminSportsClearActionProgress_(button);
    }, remaining);
    return;
  }

  button.removeAttribute("data-sports-hold-status-until");

  if (status) {
    status.setAttribute("hidden", "hidden");
  }

}

function adminSportsMarkDashboardStale_(
  message,
  options
) {

  options =
    options || {};

  const panel =
    document.getElementById("adminSportsControlPanel");

  if (panel) {
    panel.setAttribute("data-sports-dashboard-stale", "true");
  }

  if (options.localOnly) {
    return;
  }

  adminSportsSetGlobalControlsStatus_(
    message ||
      "Done. Controls stayed open. Use Reload Sports Controls when you want fresh counts/status.",
    false
  );

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

function adminSportsLeagueStatusId_(league) {

  return "sportsLeagueSaveStatus_" +
    adminSportsKey_(league || "global");

}

function adminSportsSetLeagueStatus_(
  league,
  message,
  isError
) {

  const el =
    document.getElementById(
      adminSportsLeagueStatusId_(league)
    );

  if (!el) {
    adminSportsMessage_(
      message,
      isError
    );
    return;
  }

  el.textContent =
    message || "";

  el.hidden =
    !message;

  el.classList.toggle(
    "error-card",
    !!isError
  );

}

function adminSportsArchiveStatusId_(league) {

  return "sportsArchiveRunStatus_" +
    adminSportsKey_(league || "global");

}

function adminSportsSetArchiveStatus_(
  league,
  message,
  isError
) {

  const el =
    document.getElementById(
      adminSportsArchiveStatusId_(league)
    );

  if (!el) {
    adminSportsSetLeagueStatus_(
      league,
      message,
      isError
    );
    return;
  }

  el.textContent =
    message || "";

  el.hidden =
    !message;

  el.classList.toggle(
    "error-card",
    !!isError
  );

}

function adminSportsPlayerStatusId_(league) {

  return "sportsPlayerRunStatus_" +
    adminSportsKey_(league || "global");

}

function adminSportsSetPlayerStatus_(
  league,
  message,
  isError
) {

  const el =
    document.getElementById(
      adminSportsPlayerStatusId_(league)
    );

  if (!el) {
    adminSportsSetLeagueStatus_(
      league,
      message,
      isError
    );
    return;
  }

  el.textContent =
    message || "";

  el.hidden =
    !message;

  el.classList.toggle(
    "error-card",
    !!isError
  );

}

function adminSportsSetGlobalControlsStatus_(
  message,
  isError
) {

  const el =
    document.getElementById(
      "sportsControlsGlobalActionStatus"
    );

  if (!el) {
    return;
  }

  el.textContent =
    message || "";

  el.hidden =
    !message;

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

  // First paint is intentionally read-only and lightweight. Setup/migrations
  // remain an explicit admin action instead of blocking every dashboard open.
  await adminLoadSportsControls();

}

async function adminSetupSportsControls() {

  const panel =
    document.getElementById(
      "adminSportsControlPanel"
    );

  adminSportsSetPanelLoading_(
    panel,
    "Setting Up Sports Controls",
    "Checking sheets and applying safe Sports Engine migrations...",
    25
  );

  adminSportsMessage_(
    "Checking Sports Engine setup...",
    false
  );

  let setupRes = null;

  try {
    setupRes = await apiAdminSetupSportsControls();
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
        ? "Sports setup failed. " + (setupRes.error || setupRes.message)
        : "Sports setup failed.",
      true
    );
    await adminLoadSportsControls({ preserveOpen: true });
    return;
  }

  adminSportsMessage_(
    "Sports Engine setup checked. Reloading controls...",
    false
  );
  await adminLoadSportsControls({ preserveOpen: true });

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
    // Render the Sports Engine dashboard immediately. Awards App wager-trigger
    // status is supplemental and must not hold first paint open.
    res.wagerAutoSyncTriggers = res.wagerAutoSyncTriggers || [];
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
    "Drawing league controls...",
    90
  );

  panel.innerHTML =
    adminRenderSportsControlDashboard_(
      res,
      openLeagueKeys
    );

  adminSportsInitInfoHandlers_();

  adminSportsMessage_(
    "Sports Controls loaded. Loading player/stat diagnostics in the background...",
    false
  );

  // Player-game statistics and advanced checkpoint summaries can span large
  // sheets. Load them after first paint so they cannot hold the dashboard open.
  adminLoadSportsSupplementalStatus_(res, loadSequence);

}

async function adminLoadSportsSupplementalStatus_(dashboard, loadSequence) {

  const panel =
    document.getElementById(
      "adminSportsControlPanel"
    );

  if (!panel || !dashboard) return;

  const openLeagueKeys =
    adminSportsGetOpenLeagueKeys_();

  const results =
    await Promise.all([
      apiAdminGetSportsPlayerStatus()
        .catch(function(err) {
          return {
            success: false,
            error: err && err.message ? err.message : String(err || "Player status failed")
          };
        }),
      apiAdminGetSportsAdvancedStatsStatus()
        .catch(function(err) {
          return {
            success: false,
            error: err && err.message ? err.message : String(err || "Advanced status failed")
          };
        }),
      apiAdminGetSmartSportsAutomationStatus()
        .catch(function(err) {
          return {
            success: false,
            error: err && err.message ? err.message : String(err || "Wager automation status failed")
          };
        })
    ]);

  if (loadSequence !== adminSportsLoadSequence_) return;

  const playerStatus = results[0];
  const advancedStatus = results[1];
  const wagerSyncStatus = results[2];

  if (playerStatus && playerStatus.success !== false) {
    dashboard.players = playerStatus;
  }

  if (advancedStatus && advancedStatus.success !== false) {
    dashboard.advancedStats = advancedStatus;
  }

  if (wagerSyncStatus && wagerSyncStatus.success !== false) {
    dashboard.wagerAutoSyncTriggers = wagerSyncStatus.triggers || [];
  }

  panel.innerHTML =
    adminRenderSportsControlDashboard_(
      dashboard,
      openLeagueKeys
    );

  adminSportsInitInfoHandlers_();

  const errors = [playerStatus, advancedStatus, wagerSyncStatus]
    .filter(function(item) { return item && item.success === false; })
    .map(function(item) { return item.error || item.message || "diagnostic status failed"; });

  adminSportsMessage_(
    errors.length
      ? "Sports Controls loaded. Some background diagnostics were unavailable: " + errors.join(" · ")
      : "Sports Controls loaded.",
    errors.length > 0
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
      openLeagueKeys || [],
      data.players || {},
      data.advancedStats || {}
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
    Number(externalDetails.scheduleReconcile || 0) +
    Number(externalDetails.oddsUpdater || 0) +
    Number(externalDetails.archiveUpdater || 0);

  const smartEnabled =
    !!(
      smartAutomation.enabled ||
      smartAutomation.fullyEnabled ||
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
          align-items: flex-start;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .sports-league-save-status {
          background: rgba(220, 252, 231, 0.95);
          border: 1px solid rgba(22, 163, 74, 0.35);
          border-radius: 10px;
          color: #166534;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.25;
          margin-top: 8px;
          padding: 8px 10px;
        }
        .sports-league-save-status[hidden] {
          display: none !important;
        }
        .sports-league-save-status.error-card {
          background: rgba(254, 226, 226, 0.95);
          border-color: rgba(220, 38, 38, 0.45);
          color: #991b1b;
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
            · Schedule reconcile: ${(smartAutomation.details && smartAutomation.details.scheduleReconcile) || 0}
            · Odds calls this month: ${usage.totalCallsUsed || 0} / ${usage.hardCap || 500}
          </div>
        </div>
      </div>

      <div class="admin-sub">
        Use <strong>Recheck Schedule Now</strong> when postponed games, rescheduled games, or playoff/TBD teams may have changed. Use <strong>Run Smart Sports Sync Now</strong> when odds, scores, or settlements look stale.
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
        id="sportsControlsGlobalActionStatus"
        class="admin-sub"
        hidden
        style="margin-top:8px; font-weight:800;"
      ></div>

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


function adminRenderSportsOddsMarketCheckboxes_(
  leagueCode,
  selectedMarkets,
  disabledAttr
) {

  const selected = {};

  String(selectedMarkets || "h2h")
    .split(",")
    .forEach(function(market) {
      const key =
        String(market || "")
          .trim()
          .toLowerCase();
      if (key) {
        selected[key] = true;
      }
    });

  const options = [
    { value: "h2h", label: "Moneyline" },
    { value: "spreads", label: "Spread" },
    { value: "totals", label: "Over/Under" }
  ];

  return `
    <details style="margin-top:8px;">
      <summary style="cursor:pointer; font-weight:700;">Advanced markets</summary>
      <div class="admin-sub" style="margin-top:6px;">
        Region is fixed to US. Each checked market can increase Odds API cost.
      </div>
      <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-top:8px;">
        ${options.map(function(option) {
          const inputId =
            adminSportsInputId_(
              "sportsOddsMarket_" + option.value,
              leagueCode
            );
          return `
            <label class="admin-field sports-checkbox-field" style="gap:6px;">
              <span>${adminSportsEscape_(option.label)}</span>
              <input
                type="checkbox"
                id="${inputId}"
                ${selected[option.value] ? "checked" : ""}
                ${disabledAttr || ""}
              >
            </label>
          `;
        }).join("")}
      </div>
    </details>
  `;

}

function adminSportsSelectedOddsMarkets_(
  league
) {

  const markets = [];

  ["h2h", "spreads", "totals"].forEach(function(market) {
    const el =
      document.getElementById(
        adminSportsInputId_(
          "sportsOddsMarket_" + market,
          league
        )
      );

    if (el && el.checked) {
      markets.push(market);
    }
  });

  return markets.length
    ? markets.join(",")
    : "h2h";

}

function adminSportsOddsWindowLabel_(value) {

  const raw =
    String(value || "STANDARD")
      .toUpperCase();

  if (raw === "LONG") {
    return "Long · 30 days";
  }

  if (raw === "HALF_SEASON") {
    return "Half Season";
  }

  if (raw === "FULL_SEASON") {
    return "Full Season";
  }

  return "Standard · 14 days";

}

function adminSportsOddsWindowOptions_() {

  return [
    { value: "STANDARD", label: "Standard · 14 days" },
    { value: "LONG", label: "Long · 30 days" },
    { value: "HALF_SEASON", label: "Half Season" },
    { value: "FULL_SEASON", label: "Full Season" }
  ];

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

function adminSportsParseLocalDate_(value) {

  const raw =
    String(value || "")
      .trim();

  const match =
    raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const date =
    new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

  if (isNaN(date.getTime())) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;

}

function adminSportsIsTodayInRange_(startValue, endValue) {

  const start =
    adminSportsParseLocalDate_(startValue);

  const end =
    adminSportsParseLocalDate_(endValue);

  if (!start || !end) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return today >= start && today <= end;

}

function adminSportsFormatShortDate_(value) {

  const date =
    adminSportsParseLocalDate_(value);

  if (!date) {
    return "";
  }

  const mm =
    String(date.getMonth() + 1).padStart(2, "0");

  const dd =
    String(date.getDate()).padStart(2, "0");

  const yy =
    String(date.getFullYear()).slice(-2);

  return mm + "/" + dd + "/" + yy;

}

function adminSportsPhaseLabel_(value) {

  const raw =
    String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  if (!raw) {
    return "Regular Season";
  }

  if (raw.indexOf("pre") >= 0 || raw.indexOf("spring") >= 0) {
    return "Preseason";
  }

  if (raw.indexOf("post") >= 0 || raw.indexOf("playoff") >= 0) {
    return "Postseason";
  }

  if (raw.indexOf("tournament") >= 0) {
    return "Tournament";
  }

  if (raw.indexOf("bowl") >= 0) {
    return "Bowl Season";
  }

  if (raw.indexOf("off") >= 0) {
    return "Off Season";
  }

  return raw
    .split(" ")
    .map(function(part) {
      return part
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part;
    })
    .join(" ");

}

function adminSportsPhaseRangeText_(startValue, endValue) {

  const start =
    adminSportsFormatShortDate_(startValue);

  const end =
    adminSportsFormatShortDate_(endValue);

  if (start && end) {
    return "(" + start + "–" + end + ")";
  }

  if (start) {
    return "(starts " + start + ")";
  }

  if (end) {
    return "(through " + end + ")";
  }

  return "";

}

function adminSportsPhaseDisplay_(
  league,
  health,
  inSeason,
  seasonStartDate,
  seasonEndDate
) {

  league =
    league || {};

  health =
    health || {};

  if (!inSeason) {
    return {
      label: "Off Season",
      range: adminSportsPhaseRangeText_(seasonStartDate, seasonEndDate),
      header: "Off Season"
    };
  }

  const phaseWindows = [
    {
      label: "Tournament",
      enabled: league.tournamentEnabled,
      start: league.tournamentStartDate || health.tournamentStartDate,
      end: league.tournamentEndDate || health.tournamentEndDate
    },
    {
      label: "Bowl Season",
      enabled: league.bowlEnabled,
      start: league.bowlStartDate || health.bowlStartDate,
      end: league.bowlEndDate || health.bowlEndDate
    },
    {
      label: "Postseason",
      enabled: league.postseasonEnabled,
      start: league.postseasonStartDate || health.postseasonStartDate,
      end: league.postseasonEndDate || health.postseasonEndDate
    },
    {
      label: "Preseason",
      enabled: league.preseasonEnabled,
      start: league.preseasonStartDate || health.preseasonStartDate,
      end: league.preseasonEndDate || health.preseasonEndDate
    },
    {
      label: "Regular Season",
      enabled: true,
      start: league.regularSeasonStartDate || health.regularSeasonStartDate || seasonStartDate,
      end: league.regularSeasonEndDate || health.regularSeasonEndDate || seasonEndDate
    }
  ];

  for (let i = 0; i < phaseWindows.length; i++) {
    const phase =
      phaseWindows[i];

    if (
      phase.enabled !== false &&
      adminSportsIsTodayInRange_(
        phase.start,
        phase.end
      )
    ) {
      const range =
        adminSportsPhaseRangeText_(
          phase.start,
          phase.end
        );

      return {
        label: phase.label,
        range: range,
        header: "Phase: " + phase.label + (range ? " " + range : "")
      };
    }
  }

  const fallbackLabel =
    adminSportsPhaseLabel_(
      league.seasonPhase ||
      health.seasonPhase ||
      "Regular Season"
    );

  const fallbackRange =
    adminSportsPhaseRangeText_(
      seasonStartDate,
      seasonEndDate
    );

  return {
    label: fallbackLabel,
    range: fallbackRange,
    header: "Phase: " + fallbackLabel + (fallbackRange ? " " + fallbackRange : "")
  };

}


function adminRenderScoreLeagueControls_(
  leagues,
  leagueHealth,
  oddsSettings,
  openLeagueKeys,
  playersStatus,
  advancedStats
) {

  leagueHealth =
    leagueHealth || {};

  oddsSettings =
    oddsSettings || [];

  openLeagueKeys =
    openLeagueKeys || [];

  playersStatus =
    playersStatus || {};

  advancedStats =
    advancedStats || {};

  const playerDiagnosticsDeferred =
    playersStatus.deferred === true;

  const advancedDiagnosticsDeferred =
    advancedStats.deferred === true;

  const playerSummaryValue = function(value) {
    return playerDiagnosticsDeferred ? "loading…" : (value || 0);
  };

  const advancedSummaryValue = function(value) {
    return advancedDiagnosticsDeferred ? "loading…" : (value || 0);
  };

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

  const playersByLeague = {};

  (playersStatus.leagues || []).forEach(function(item) {
    const key =
      adminSportsKey_(
        item.league || item.League
      );

    if (key) {
      playersByLeague[key] = item;
    }
  });

  const advancedByLeague = {};

  (advancedStats.leagues || []).forEach(function(item) {
    const key =
      adminSportsKey_(
        item.league || item.League
      );

    if (key) {
      advancedByLeague[key] = item;
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
            Per-league controls are grouped into Season, Scoring, Players, Snapshots, Odds, and Archive sections for phone-friendly admin use.
          </div>

          <div class="admin-sub">
            Live scores: ${totals.liveScores || 0}
            · Odds rows: ${totals.liveOdds || 0}
            · Snapshots: ${totals.liveSnapshots || 0}
            · Players: ${playerSummaryValue(playersStatus.playerCount)}
            · Player stat rows: ${playerSummaryValue(playersStatus.statRowCount)}
            · Team stat rows: ${advancedSummaryValue(advancedStats.teamStatRowCount)}
            · Checkpoint rows: ${advancedSummaryValue(advancedStats.checkpointRowCount)}
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

          const rawSport = String(league.sport || "").trim();

          const sport =
            adminSportsEscape_(
              rawSport
            );

          const sportKey =
            adminSportsKey_(rawSport);

          const health =
            healthByLeague[leagueKey] || {};

          const oddsUsage =
            oddsByLeague[leagueKey] || {};

          const playerUsage =
            playersByLeague[leagueKey] || {};

          const advancedUsage =
            advancedByLeague[leagueKey] || {};

          const playerSupported =
            ["baseball", "football", "basketball", "hockey", "soccer"].indexOf(sportKey) !== -1;

          const playerCount =
            Number(playerUsage.playerCount || 0);

          const activePlayerCount =
            Number(playerUsage.activePlayerCount || 0);

          const playerStatRowCount =
            Number(playerUsage.statRowCount || 0);

          const lastPlayerUpdated =
            playerUsage.lastPlayerUpdated || "";

          const lastPlayerStatsUpdated =
            playerUsage.lastStatsUpdated || "";

          const teamStatRowCount =
            Number(advancedUsage.teamStatRowCount || 0);

          const checkpointRowCount =
            Number(advancedUsage.checkpointRowCount || 0);

          const checkpointCount =
            Number(advancedUsage.checkpointCount || 0);

          const lastTeamStatsUpdated =
            advancedUsage.lastTeamStatsUpdated || "";

          const lastCheckpointCaptured =
            advancedUsage.lastCheckpointCaptured || "";

          const enabled =
            adminSportsBool_(
              league.enabled
            );

          const playerActionsEnabled =
            playerSupported &&
            enabled;

          const inSeason =
            league.seasonActive === undefined
              ? true
              : adminSportsBool_(league.seasonActive);

          const sportsSettingsOddsEnabled =
            league.oddsEnabled === undefined
              ? false
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
            oddsUsage.MonthlyBudget || oddsUsage.monthlyBudget || league.oddsMonthlyMaxPulls || 100;

          const leagueOn =
            enabled;

          const oddsEnabled =
            oddsUsage.OddsEnabled !== undefined
              ? adminSportsBool_(oddsUsage.OddsEnabled)
              : sportsSettingsOddsEnabled;

          const oddsAutoEnabled =
            adminSportsBool_(oddsUsage.AutoRefreshEnabled);

          const oddsActive =
            leagueOn &&
            inSeason &&
            oddsEnabled;

          const oddsStatusText =
            !leagueOn
              ? "Paused — League OFF"
              : !inSeason
                ? (oddsEnabled
                    ? "ON — Paused until season starts"
                    : "OFF — Season inactive")
                : oddsEnabled
                  ? "Ready"
                  : "Odds OFF";

          /*
            Keep odds setup simple:
            - League OFF disables all odds setup and refresh.
            - League ON allows admins to prepare Odds ON/OFF, auto refresh,
              limits, and markets even before the season starts.
            - Refresh still requires League ON + active season + Odds ON.
          */
          const oddsControlsDisabled =
            leagueOn
              ? ""
              : "disabled";

          const oddsDailyLimit =
            oddsUsage.MaxRefreshesPerDay ||
            league.oddsDailyMaxPulls ||
            5;

          const oddsMonthlyBudget =
            oddsUsage.MonthlyBudget ||
            league.oddsMonthlyMaxPulls ||
            100;

          const oddsMarkets =
            oddsUsage.DefaultMarkets ||
            "h2h";

          const oddsWindow =
            String(oddsUsage.OddsWindow || "STANDARD")
              .toUpperCase();

          const oddsLastStatus =
            String(health.lastOddsRefresh || oddsUsage.LastRefreshStatus || "Never").trim();

          const oddsLastMessage =
            String(oddsUsage.LastRefreshMessage || "").trim();

          const oddsLastDisplay =
            String(oddsUsage.LastRefreshStatus || "").toUpperCase() === "ERROR" && oddsLastMessage
              ? oddsLastStatus + ": " + oddsLastMessage
              : oddsLastStatus;

          /*
            Keep league settings editable even when the league is OFF.
            The old UI disabled every input when League was OFF, which made it
            impossible to prepare league settings before turning the league on.
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
              oddsControlsDisabled,
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

          const phaseInfo =
            adminSportsPhaseDisplay_(
              league,
              health,
              inSeason,
              seasonStartDate,
              seasonEndDate
            );

          const phaseLabel =
            adminSportsEscape_(
              phaseInfo.label
            );

          const phaseHeaderText =
            adminSportsEscape_(
              phaseInfo.header
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

          const playersBody = `
            <div class="admin-sub" style="margin-bottom:8px;">
              ${playerSupported
                ? (playerDiagnosticsDeferred || advancedDiagnosticsDeferred
                    ? `Player/stat diagnostics are loading in the background. Controls are ready now.${playerActionsEnabled ? "" : " · Turn League ON to run player/team actions."}`
                    : `Roster: ${activePlayerCount} active / ${playerCount} total
                      · Player stat rows: ${playerStatRowCount}
                      · Team stat rows: ${teamStatRowCount}
                      · Checkpoints: ${checkpointCount} (${checkpointRowCount} rows)
                      · Last roster: ${adminSportsEscape_(lastPlayerUpdated || "Never")}
                      · Last player stats: ${adminSportsEscape_(lastPlayerStatsUpdated || "Never")}
                      · Last team stats: ${adminSportsEscape_(lastTeamStatsUpdated || "Never")}
                      · Last checkpoint: ${adminSportsEscape_(lastCheckpointCaptured || "Never")}
                      ${playerActionsEnabled ? "" : " · Turn League ON to run player/team actions."}`)
                : "Player sync is not enabled for this sport. Racing and combat sports use separate result engines."}
            </div>

            <div
              id="${adminSportsPlayerStatusId_(leagueCode)}"
              class="sports-league-save-status"
              style="margin:0 0 8px;"
              hidden
            ></div>

            <div class="sports-league-actions">
              ${adminSportsActionButton_(
                "Sync Players",
                playerActionsEnabled ? "admin-small-button secondary" : "admin-small-button secondary inactive",
                "adminSyncSportsPlayers('" + leagueCode + "', '" + sport + "')",
                "syncPlayers",
                leagueCode,
                playerActionsEnabled ? controlsDisabled : "disabled"
              )}
              ${adminSportsActionButton_(
                "Refresh Current Game Stats",
                playerActionsEnabled ? "admin-small-button secondary" : "admin-small-button secondary inactive",
                "adminRefreshSportsPlayerGameStats('" + leagueCode + "', '" + sport + "')",
                "refreshPlayerStats",
                leagueCode,
                playerActionsEnabled ? controlsDisabled : "disabled"
              )}
              ${adminSportsActionButton_(
                "Refresh Team / Checkpoint Stats",
                playerActionsEnabled ? "admin-small-button secondary" : "admin-small-button secondary inactive",
                "adminRefreshSportsAdvancedStats('" + leagueCode + "', '" + sport + "')",
                "refreshAdvancedStats",
                leagueCode,
                playerActionsEnabled ? controlsDisabled : "disabled"
              )}
            </div>

            <div class="admin-sub" style="margin-top:8px;">
              Player and team refreshes check games around today that already exist in SportsScores. Checkpoint rows are captured as score polling crosses innings, quarters, halftime, or the first-half two-minute boundary.
            </div>
          `;

          const snapshotsBody = `
            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px;">
              ${adminRenderSportsNumberField_("Snapshot days", "sportsSnapshotDays", leagueCode, league.snapshotRetentionDays || league.keepSnapshotsDays || health.keepSnapshotsDays, 14, 1, 365, "snapshotDays", controlsDisabled)}
            </div>
          `;

          const oddsBody = `
            <div class="admin-sub" style="margin-bottom:8px;">
              ${adminSportsLabel_("Odds status", "oddsUsage", leagueCode)}
              ${adminSportsEscape_(oddsStatusText)}
              · Today ${oddsToday}/${oddsDailyLimit}
              · Month ${oddsMonth}/${oddsMonthlyBudget}
              · API left ${oddsUsage.LastApiRemaining || "—"}
              · Window ${adminSportsEscape_(adminSportsOddsWindowLabel_(oddsWindow))}
              · Last ${adminSportsEscape_(oddsLastDisplay)}
            </div>

            <div class="admin-control-grid" style="grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap:8px;">
              ${adminRenderSportsCheckboxField_("Auto refresh", "sportsOddsAuto", leagueCode, oddsAutoEnabled, "runHybridOdds", oddsControlsDisabled)}
              ${adminRenderSportsNumberField_("Daily limit", "sportsOddsDaily", leagueCode, oddsDailyLimit, 5, 0, 24, "oddsDaily", oddsControlsDisabled)}
              ${adminRenderSportsNumberField_("Monthly budget", "sportsOddsMonthly", leagueCode, oddsMonthlyBudget, 100, 0, 500, "oddsMonthly", oddsControlsDisabled)}
              ${adminRenderSportsSelectField_("Odds Window", "sportsOddsWindow", leagueCode, oddsWindow, adminSportsOddsWindowOptions_(), "oddsWindow", oddsControlsDisabled)}
            </div>

            ${adminRenderSportsOddsMarketCheckboxes_(leagueCode, oddsMarkets, oddsControlsDisabled)}

            <div class="admin-sub" style="margin-top:8px;">
              Region: US only. Refresh is protected by League ON/OFF, season dates, and daily/monthly limits.
            </div>

            <div class="sports-league-actions">
              ${adminSportsActionButton_("Refresh Odds Now", oddsActive ? "admin-small-button secondary" : "admin-small-button secondary inactive", "adminRefreshSportsOddsLeague('" + leagueCode + "')", "refreshOdds", leagueCode, oddsActive ? controlsDisabled : "disabled")}
            </div>
          `;

          const archiveLastAt =
            league.archiveLastRunAt ||
            health.archiveLastRunAt ||
            "";

          const archiveLastStatus =
            league.archiveLastStatus ||
            health.archiveLastStatus ||
            "";

          const archiveRowsLastRun =
            league.archiveRowsLastRun ||
            health.archiveRowsLastRun ||
            0;

          const archiveLastText =
            archiveLastStatus
              ? "Last archive: " + archiveLastStatus +
                " · Rows last run " + archiveRowsLastRun +
                (archiveLastAt ? " · " + archiveLastAt : "")
              : "Last archive: Never";

          const archiveBody = `
            <div class="admin-sub" style="margin-bottom:8px;">
              Ready now: Games ${health.liveGames || 0} · Scores ${health.liveScores || 0} · Score rows ${health.scoreArchiveCandidates || 0} · Snapshot rows ${health.snapshotArchiveCandidates || 0} · Log rows ${health.logTrimCandidates || 0}
            </div>

            <div
              id="${adminSportsArchiveStatusId_(leagueCode)}"
              class="sports-league-save-status"
              style="margin:0 0 8px;"
              ${archiveLastStatus ? "" : "hidden"}
            >${adminSportsEscape_(archiveLastText)}</div>

            <div class="admin-sub" style="margin-bottom:8px;">
              COPY adds rows to archive and keeps live rows. MOVE removes live rows after copying. Test with COPY first.
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
                    ${leagueOn ? phaseHeaderText : "League OFF"}
                    · Scores ${enabled ? "ON" : "OFF"}
                    · Odds ${adminSportsEscape_(oddsStatusText)}
                    · API ${oddsToday}/${oddsMonth}/${oddsMonthlyBudget}
                  </div>

                  <div class="admin-sub">
                    Live: Scores ${health.liveScores || 0}
                    · Players ${playerCount}
                    · Player stats ${playerStatRowCount}
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
                · Last roster ${adminSportsEscape_(lastPlayerUpdated || "") || "Never"}
                · Last player stats ${adminSportsEscape_(lastPlayerStatsUpdated || "") || "Never"}
                · Last odds ${adminSportsEscape_(oddsLastDisplay) || "Never"}
              </div>

              ${adminSportsSection_("Season", "seasonSection", leagueCode, seasonBody, true)}
              ${adminSportsSection_("Scoring", "scoringSection", leagueCode, scoringBody, false)}
              ${adminSportsSection_("Players", "playersSection", leagueCode, playersBody, false)}
              ${adminSportsSection_("Snapshots", "snapshotsSection", leagueCode, snapshotsBody, false, snapshotsHeaderControl)}
              ${adminSportsSection_("Odds", "oddsSection", leagueCode, oddsBody, false, oddsHeaderControl)}
              ${adminSportsSection_("Archive", "archiveSection", leagueCode, archiveBody, false, archiveHeaderControl)}

              <div class="sports-league-actions">
                ${adminSportsActionButton_("Defaults", "admin-small-button secondary", "adminApplySportsLeagueDefaults('" + leagueCode + "')", "defaults", leagueCode, "")}
                ${adminSportsActionButton_("Save", "admin-small-button", "adminSaveSportsScoreLeagueSettings('" + leagueCode + "', '" + sport + "')", "save", leagueCode, "")}
              </div>

              <div
                id="${adminSportsLeagueStatusId_(leagueCode)}"
                class="sports-league-save-status"
                hidden
              ></div>

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
                    Last: ${adminSportsEscape_(
                      String(setting.LastRefreshStatus || "NEVER").toUpperCase() === "ERROR" && setting.LastRefreshMessage
                        ? String(setting.LastRefreshStatus || "ERROR") + ": " + String(setting.LastRefreshMessage)
                        : String(setting.LastRefreshStatus || "NEVER")
                    )}
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
    adminSportsSetLeagueStatus_(
      league,
      "Saving " + String(league || "league").toUpperCase() + " settings...",
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
          ? leagueChecked_("sportsOddsEnabled", false)
          : false,
        oddsCooldownMinutes: 240,
        oddsDailyMaxPulls: leagueValue_("sportsOddsDaily", 1),
        oddsMonthlyMaxPulls: leagueValue_("sportsOddsMonthly", 30),
        snapshotRetentionDays: leagueValue_("sportsSnapshotDays", 14),
        archiveEnabled: leagueChecked_("sportsArchiveEnabled", false),
        archiveAfterDays: leagueValue_("sportsArchiveDays", 30),
        archiveMode: leagueValue_("sportsArchiveMode", "MOVE"),
        keepSnapshotsDays: leagueValue_("sportsSnapshotDays", 14),
        keepLogsDays: leagueValue_("sportsLogDays", 14)
      }
    );

  if (res && res.success) {
    try {
      await apiAdminUpdateSportsOddsSetting(
        league,
        {
          oddsEnabled: leagueActive
            ? leagueChecked_("sportsOddsEnabled", false)
            : false,
          autoRefreshEnabled: leagueActive
            ? leagueChecked_("sportsOddsAuto", false)
            : false,
          manualRefreshEnabled: true,
          maxRefreshesPerDay: leagueValue_("sportsOddsDaily", 1),
          monthlyBudget: leagueValue_("sportsOddsMonthly", 30),
          oddsWindow: leagueValue_("sportsOddsWindow", "STANDARD"),
          stopAtMonthlyCalls: 450,
          defaultMarkets: adminSportsSelectedOddsMarkets_(league)
        }
      );
    } catch (oddsErr) {
      res.success = false;
      res.error =
        oddsErr && oddsErr.message
          ? oddsErr.message
          : String(oddsErr || "Unable to save odds settings.");
    }
  }

  if (!options.silent) {
    adminSportsSetLeagueStatus_(
      league,
      res && res.success
        ? String(league || "League").toUpperCase() + " saved. This card stayed open."
        : (res && (res.error || res.message)) ||
          "Unable to save league settings.",
      !(res && res.success)
    );
  }

  if (res && res.success) {
    adminSportsMarkDashboardStale_(
      "Saved. Reload Sports Controls when you want refreshed counts/status.",
      { localOnly: true }
    );
  }

  return res;

}


function adminApplySportsLeagueDefaults(
  league
) {

  adminSportsSetLeagueStatus_(
    league,
    "Defaults applied. Press Save to write them to the sheet.",
    false
  );

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
    adminSportsInputId_("sportsOddsAuto", league),
    false
  );

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsOddsMarket_h2h", league),
    true
  );

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsOddsMarket_spreads", league),
    false
  );

  adminSportsSetCheckbox_(
    adminSportsInputId_("sportsOddsMarket_totals", league),
    adminSportsInputId_("sportsOddsWindow", league),
    false
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
    sportsOddsDaily: 1,
    sportsOddsMonthly: 30,
    sportsOddsWindow: "STANDARD",
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

  const smartSyncButton = document.querySelector(
    '[data-sports-click^="adminRunFullSportsSyncNow("]'
  );

  adminSportsMessage_(
    "Queueing Smart Sports Sync...",
    false
  );

  // Give the browser one paint before the server request. On slower Apps Script
  // connections this makes the first click visibly acknowledge immediately.
  await new Promise(function(resolve) {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function() { resolve(); });
    } else {
      setTimeout(resolve, 0);
    }
  });

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

      adminSportsMessage_(
        "Smart Sports Sync queued. Scores, odds, wager settlement, and finalization will run in the background shortly; reload Sports Controls in about a minute.",
        false
      );

      adminSportsHoldActionProgress_(
        smartSyncButton,
        "Queued — background Sports sync will run shortly.",
        15000
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

    adminSportsHoldActionProgress_(
      smartSyncButton,
      "Smart Sports Sync complete.",
      15000
    );
    adminSportsMarkDashboardStale_();

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Unable to run full sports sync.",
      true
    );

    adminSportsHoldActionProgress_(
      smartSyncButton,
      "Smart Sports Sync failed — see message above.",
      15000
    );

  }

}

function adminSportsSetSmartAutomationButtonState_(enabled) {

  const buttons =
    document.querySelectorAll(
      '[data-sports-click^="adminToggleSportsAutomation"]'
    );

  buttons.forEach(function(button) {

    if (!button) {
      return;
    }

    button.textContent =
      enabled
        ? "Smart Sports Automation Enabled"
        : "Smart Sports Automation Disabled";

    button.setAttribute(
      "data-sports-click",
      "adminToggleSportsAutomation(" + (enabled ? "false" : "true") + ")"
    );

    button.classList.toggle(
      "danger",
      !!enabled
    );

    button.classList.toggle(
      "secondary",
      !enabled
    );

  });

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

    const success =
      !!(res && res.success);

    if (success) {
      const status =
        res.status || {};

      const finalEnabled =
        status.enabled !== undefined
          ? !!status.enabled
          : !!enabled;

      adminSportsSetSmartAutomationButtonState_(
        finalEnabled
      );
    }

    adminSportsMessage_(
      success
        ? (enabled
          ? "Smart Sports Automation Enabled."
          : "Smart Sports Automation Disabled.")
        : (res && (res.error || res.message)) ||
          "Unable to update Smart Sports Automation.",
      !success
    );

    adminSportsMarkDashboardStale_(
      success
        ? "Smart Sports Automation updated. Use Reload Sports Controls to refresh trigger counts."
        : undefined
    );

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

async function adminRunSportsScheduleReconcile(
  leagueCode
) {

  const league =
    String(leagueCode || "")
      .trim()
      .toLowerCase();

  const ok =
    window.confirm(
      league
        ? "Recheck ESPN schedule changes for " + league.toUpperCase() + " now?"
        : "Recheck ESPN schedule changes for enabled leagues now?"
    );

  if (!ok) {
    return;
  }

  adminSportsMessage_(
    league
      ? "Rechecking schedule for " + league.toUpperCase() + "..."
      : "Rechecking schedules for enabled leagues...",
    false
  );

  try {

    const res =
      await apiAdminRunSportsScheduleReconcile({
        league: league,
        daysBack: 1,
        daysForward: 21
      });

    const success =
      !!(res && res.success);

    adminSportsMessage_(
      success
        ? "Schedule recheck complete. League: " +
          (res.targetLeague || league || "ALL") +
          ". Unique games: " +
          (res.uniqueGames || 0) +
          ", fetched rows: " +
          (res.gamesFetched || 0) +
          ", dates checked: " +
          (res.datesChecked || 0) +
          "."
        : (res && (res.error || res.message || res.reason)) ||
          "Schedule recheck failed.",
      !success
    );

    adminSportsMarkDashboardStale_();

    return res;

  } catch (err) {

    adminSportsMessage_(
      err && err.message
        ? err.message
        : "Schedule recheck failed.",
      true
    );

  }

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

async function adminSyncSportsPlayers(
  league,
  sport
) {

  const openLeagueKeys =
    adminSportsGetOpenLeagueKeys_();

  adminSportsSetPlayerStatus_(
    league,
    "Syncing ESPN roster...",
    false
  );

  const res =
    await apiAdminSyncSportsPlayers(
      league,
      sport
    );

  if (!res) {
    const message =
      "Player roster sync returned no response.";

    adminSportsSetPlayerStatus_(
      league,
      message,
      true
    );

    throw new Error(message);
  }

  if (res.skipped) {
    adminSportsSetPlayerStatus_(
      league,
      res.reason || res.message || "Player roster sync was skipped.",
      false
    );
    return;
  }

  if (res.success === false && !res.partial) {
    const message =
      res.error ||
      res.message ||
      "Player roster sync failed.";

    adminSportsSetPlayerStatus_(
      league,
      message,
      true
    );

    throw new Error(message);
  }

  adminSportsSetPlayerStatus_(
    league,
    (res.partial ? "Partial roster sync complete. " : "Roster sync complete. ") +
      "Teams " +
      Number(res.teamsSynced || 0) +
      "/" +
      Number(res.teamsFound || 0) +
      " · players " +
      Number(res.playersFound || 0) +
      " · inserted " +
      Number(res.inserted || 0) +
      " · updated " +
      Number(res.updated || 0) +
      (res.errors && res.errors.length
        ? " · errors " + res.errors.length
        : "") +
      ". Reloading counts...",
    !!res.partial
  );

  await adminLoadSportsControls({
    preserveOpen: true,
    openLeagueKeys: openLeagueKeys
  });

}

async function adminRefreshSportsPlayerGameStats(
  league,
  sport
) {

  const openLeagueKeys =
    adminSportsGetOpenLeagueKeys_();

  adminSportsSetPlayerStatus_(
    league,
    "Refreshing current-game player stats...",
    false
  );

  const res =
    await apiAdminRefreshSportsPlayerGameStats(
      league,
      sport,
      {
        daysBack: 1,
        daysForward: 1,
        maxGames: 20
      }
    );

  if (!res) {
    const message =
      "Player game-stat refresh returned no response.";

    adminSportsSetPlayerStatus_(
      league,
      message,
      true
    );

    throw new Error(message);
  }

  if (res.skipped) {
    adminSportsSetPlayerStatus_(
      league,
      res.reason || res.message || "Player game-stat refresh was skipped.",
      false
    );
    return;
  }

  if (res.success === false && !res.partial) {
    const message =
      res.error ||
      res.message ||
      "Player game-stat refresh failed.";

    adminSportsSetPlayerStatus_(
      league,
      message,
      true
    );

    throw new Error(message);
  }

  const statsWrite =
    res.statsWrite || {};

  adminSportsSetPlayerStatus_(
    league,
    (res.partial ? "Partial player-stat refresh complete. " : "Player stats refreshed. ") +
      "Games " +
      Number(res.gamesRefreshed || 0) +
      "/" +
      Number(res.gamesFound || 0) +
      " · stats found " +
      Number(res.statsFound || 0) +
      " · inserted " +
      Number(statsWrite.inserted || 0) +
      " · updated " +
      Number(statsWrite.updated || 0) +
      (res.errors && res.errors.length
        ? " · errors " + res.errors.length
        : "") +
      ". Reloading counts...",
    !!res.partial
  );

  await adminLoadSportsControls({
    preserveOpen: true,
    openLeagueKeys: openLeagueKeys
  });

}

async function adminRefreshSportsAdvancedStats(
  league,
  sport
) {

  const openLeagueKeys =
    adminSportsGetOpenLeagueKeys_();

  adminSportsSetPlayerStatus_(
    league,
    "Refreshing team stats and checkpoint snapshots...",
    false
  );

  const res =
    await apiAdminRefreshSportsAdvancedStats({
      league: league,
      sport: sport,
      daysBack: 1,
      daysForward: 1,
      maxGames: 20
    });

  if (!res) {
    throw new Error("Advanced sports-stat refresh returned no response.");
  }

  if (res.success === false && !res.partial) {
    const message =
      res.error ||
      res.message ||
      "Advanced sports-stat refresh failed.";

    adminSportsSetPlayerStatus_(
      league,
      message,
      true
    );

    throw new Error(message);
  }

  adminSportsSetPlayerStatus_(
    league,
    (res.partial ? "Partial advanced-stat refresh complete. " : "Team/checkpoint stats refreshed. ") +
      "Games " + Number(res.gamesRefreshed || 0) + "/" + Number(res.gamesFound || 0) +
      " · player stats " + Number(res.playerStatsFound || 0) +
      " · team stats " + Number(res.teamStatsFound || 0) +
      (res.errors && res.errors.length ? " · errors " + res.errors.length : "") +
      ". Reloading counts...",
    !!res.partial
  );

  await adminLoadSportsControls({
    preserveOpen: true,
    openLeagueKeys: openLeagueKeys
  });

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
      " now? This may use 1 Odds API call and check this league's Odds Window."
    );

  if (!ok) {
    return;
  }

  adminSportsSetLeagueStatus_(
    league,
    "Refreshing odds for " + String(league || "League").toUpperCase() + "...",
    false
  );

  const res =
    await apiAdminRefreshSportsOddsLeague(
      league
    );

  let message =
    "Odds refresh failed.";

  let isWarning =
    true;

  if (res && (res.skipped || res.blocked)) {
    message =
      res.message ||
      res.reason ||
      "Odds refresh skipped.";
    isWarning =
      true;
  } else if (res && res.success) {
    const usable =
      res.result && res.result.usable !== undefined
        ? res.result.usable
        : "";

    message =
      usable !== ""
        ? "Odds refreshed. Usable odds rows: " + usable + "."
        : "Odds refreshed.";
    isWarning =
      false;
  } else if (res) {
    message =
      res.error ||
      res.message ||
      res.reason ||
      message;
  }

  adminSportsSetLeagueStatus_(
    league,
    message,
    isWarning
  );

  adminSportsMarkDashboardStale_(
    "Odds status changed. Use Reload Sports Controls when you want fresh counts/status.",
    { localOnly: true }
  );

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

  adminSportsSetLeagueStatus_(
    league,
    "Building safe archive preview for " + String(league || "League").toUpperCase() + "...",
    false
  );

  adminSportsSetArchiveStatus_(
    league,
    "Building archive preview...",
    false
  );

  const res =
    await apiAdminPreviewSportsLeagueArchive(
      league
    );

  if (!res || res.success === false) {
    const message =
      (res && (res.error || res.message)) ||
      "Unable to build archive preview.";

    adminSportsSetLeagueStatus_(
      league,
      message,
      true
    );

    adminSportsSetArchiveStatus_(
      league,
      message,
      true
    );

    return;
  }

  const item =
    res.leagues && res.leagues.length
      ? res.leagues[0]
      : null;

  if (!item) {
    const message =
      "No archive preview rows found for " + String(league || "League").toUpperCase() + ".";

    adminSportsSetLeagueStatus_(
      league,
      message,
      false
    );

    adminSportsSetArchiveStatus_(
      league,
      message,
      false
    );

    return;
  }

  const message =
    "Archive preview for " + String(league || "League").toUpperCase() +
      ": score rows " +
      (item.scoreArchiveCandidates || 0) +
      ", snapshot rows " +
      (item.snapshotArchiveCandidates || 0) +
      ", log rows " +
      (item.logTrimCandidates || 0) +
      ". No rows were copied, moved, or deleted.";

  adminSportsSetLeagueStatus_(
    league,
    message,
    false
  );

  adminSportsSetArchiveStatus_(
    league,
    message,
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

  adminSportsSetLeagueStatus_(
    league,
    "Saving archive settings for " + String(league || "League").toUpperCase() + "...",
    false
  );

  adminSportsSetArchiveStatus_(
    league,
    "Saving archive settings...",
    false
  );

  const saveRes =
    await adminSaveSportsScoreLeagueSettings(
      league,
      sport || "",
      { silent: true }
    );

  if (!saveRes || saveRes.success === false) {
    const message =
      (saveRes && (saveRes.error || saveRes.message)) ||
      "Unable to save archive settings before running archive.";

    adminSportsSetLeagueStatus_(
      league,
      message,
      true
    );

    adminSportsSetArchiveStatus_(
      league,
      message,
      true
    );

    return;
  }

  adminSportsSetLeagueStatus_(
    league,
    "Running archive for " + String(league || "League").toUpperCase() + "...",
    false
  );

  adminSportsSetArchiveStatus_(
    league,
    "Running archive...",
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

    const message =
      (res && (res.error || res.message)) ||
      firstError ||
      "Unable to run archive.";

    adminSportsSetLeagueStatus_(
      league,
      message,
      true
    );

    adminSportsSetArchiveStatus_(
      league,
      message,
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
    "Archive complete for " + String(league || "League").toUpperCase() +
      ": score rows copied " + (res.scoresCopied || 0) +
      ", score rows removed " + (res.scoresRemoved || 0) +
      ", snapshot rows copied " + (res.snapshotsCopied || 0) +
      ", snapshot rows removed " + (res.snapshotsRemoved || 0) + ".";

  if (!totalChanged) {
    archiveMessage +=
      " No eligible rows were old enough to archive. Try Preview Archive or lower Archive days/Snapshot days for testing.";
  }

  adminSportsSetLeagueStatus_(
    league,
    archiveMessage,
    false
  );

  adminSportsSetArchiveStatus_(
    league,
    archiveMessage,
    false
  );

  adminSportsMarkDashboardStale_(
    "Archive result saved. Use Reload Sports Controls when you want refreshed ready counts.",
    { localOnly: true }
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
    adminSportsMarkDashboardStale_();
  }

}
