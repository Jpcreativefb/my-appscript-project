/* ======================
   LEAGUE MANAGER PAGE
   Stage 2B condensed workflow.

   Workflow:
   Setup sheets -> Create/Edit League -> Pick game access mode -> Add members -> Test visibility.
====================== */

const LEAGUE_MANAGER_FEATURES = [
  { value: "viewGame", label: "View Game" },
  { value: "makePicks", label: "Make Picks" },
  { value: "makeWagers", label: "Make Wagers" },
  { value: "viewLeaderboard", label: "View Leaderboard" },
  { value: "viewWagerLeaderboard", label: "View Wager Leaderboard" },
  { value: "comparePicks", label: "Compare Picks" },
  { value: "compareWagers", label: "Compare Wagers" },
  { value: "viewOtherUsersPicks", label: "View Other Users' Picks" },
  { value: "viewOtherUsersWagers", label: "View Other Users' Wagers" }
];

const LEAGUE_MANAGER_RULES = [
  { value: "league-members", label: "League Members" },
  { value: "owner-admin", label: "Owner/Admin Only" },
  { value: "users-only", label: "Specific Users Only" },
  { value: "disabled", label: "Disabled" }
];

async function renderLeaguesPage() {

  const session = getSession();

  if (!session || !session.username) {
    return `
      <div class="page leagues-page">
        <h1>Leagues</h1>
        <div class="card">You must be logged in.</div>
      </div>
    `;
  }

  const isAdmin = isAdminSession(session);

  const [leaguesRes, gamesRes, adminDashboardRes] = await Promise.all([
    apiGetMyLeagues(""),
    leagueManagerLoadGames_(),
    isAdmin && typeof apiAdminGetLeagueAccessDashboard === "function"
      ? apiAdminGetLeagueAccessDashboard()
      : Promise.resolve(null)
  ]);

  const leagues =
    leaguesRes && leaguesRes.success && Array.isArray(leaguesRes.leagues)
      ? leaguesRes.leagues
      : [];

  const games =
    gamesRes && gamesRes.success && Array.isArray(gamesRes.games)
      ? gamesRes.games
      : [];

  const adminDashboard =
    adminDashboardRes && adminDashboardRes.success
      ? adminDashboardRes
      : null;

  const adminLeagues =
    adminDashboard && Array.isArray(adminDashboard.leagues)
      ? adminDashboard.leagues
      : leagues;

  const adminGames =
    adminDashboard && Array.isArray(adminDashboard.games)
      ? adminDashboard.games
      : games;

  const activeLeagueId =
    getFrontendLeagueId() ||
    (adminLeagues[0] && adminLeagues[0].leagueId) ||
    (leagues[0] && leagues[0].leagueId) ||
    "";

  const selectedLeague =
    adminLeagues.find(league => String(league.leagueId || "") === String(activeLeagueId || "")) ||
    leagues.find(league => String(league.leagueId || "") === String(activeLeagueId || "")) ||
    adminLeagues[0] ||
    leagues[0] ||
    null;

  return `
    <div class="page leagues-page">

      <div class="league-page-header">
        <div>
          <h1>Leagues</h1>
          <p class="league-sub">
            Set up public leagues, private leagues, league leaderboards, game access, and members from one page.
          </p>
        </div>

        <div class="league-actions-row">
          <button class="button secondary" onclick="leagueShowHelpGuide()">League Help</button>
          <button class="button secondary" onclick="navigate('dashboard')">Back</button>
        </div>
      </div>

      <div id="leagueManagerMessage" class="league-message hidden"></div>

      ${isAdmin ? renderLeagueSetupCard_() : ""}

      ${isAdmin ? renderLeagueWorkflowCard_(adminDashboard, adminLeagues, adminGames, activeLeagueId) : ""}

      ${isAdmin ? renderLeagueMemberManagerCard_(adminDashboard, adminLeagues, activeLeagueId) : ""}

      ${isAdmin ? renderLeagueAccessOverview_(adminDashboard) : ""}

      ${isAdmin ? renderLeagueFeatureParkedCard_() : ""}

      ${renderMyLeaguesList_(leagues, activeLeagueId)}

      ${renderLeagueMembersPanel_(selectedLeague)}

      ${renderLeagueHelpModal_()}

    </div>
  `;

}

async function leagueManagerLoadGames_() {

  if (typeof apiAdminGetGames === "function") {
    const adminGames = await apiAdminGetGames();
    if (adminGames && adminGames.success && Array.isArray(adminGames.games)) {
      return adminGames;
    }
  }

  return apiGetActiveGames();

}

function renderLeagueSetupCard_() {

  return `
    <div class="card league-card league-setup-card">
      <div class="league-section-header compact">
        <div>
          <h2>1. League System Setup</h2>
          <p class="league-sub">Run once to create or repair the Leagues, LeagueMembers, LeagueGames, and GameFeatureAccess sheets.</p>
        </div>
        <button class="button" onclick="leagueSetupSystem()">Setup League Sheets</button>
      </div>
    </div>
  `;

}

function renderLeagueWorkflowCard_(dashboard, leagues, games, activeLeagueId) {

  const counts = dashboard && dashboard.counts
    ? dashboard.counts
    : {
        publicGames: 0,
        privateGames: 0,
        publicLeagueGames: 0,
        leagues: leagues.length
      };

  return `
    <div class="card league-card league-workflow-card">

      <div class="league-section-header">
        <div>
          <h2>2. Create / Edit League</h2>
          <p class="league-sub">
            League ID is auto-created from the League Name. Assign one or more games here; no separate Assign Game section needed.
          </p>
        </div>

        <div class="league-count-row">
          <span>${counts.leagues || leagues.length} leagues</span>
          <span>${counts.publicGames || 0} public games</span>
          <span>${counts.privateGames || 0} private games</span>
          <span>${counts.publicLeagueGames || 0} league boards</span>
        </div>
      </div>

      <div class="league-workflow-grid">

        <label class="league-field">
          <span>Create New or Edit Existing</span>
          <select id="leagueWorkflowExistingId" onchange="leaguePopulateExistingLeagueForm()">
            <option value="">Create new league</option>
            ${renderLeagueOptions_(leagues, activeLeagueId, true)}
          </select>
        </label>

        <label class="league-field">
          <span>League Name</span>
          <input id="leagueWorkflowName" type="text" placeholder="Family League" oninput="leagueUpdateLeagueIdPreview()">
          <small class="league-id-preview">League ID: <strong id="leagueWorkflowIdPreview">family-league</strong></small>
        </label>

        <label class="league-field">
          <span>League Type / Game Access</span>
          <select id="leagueWorkflowAccessMode">
            <option value="public">Public league - everyone can see the game</option>
            <option value="private" selected>Private league - only selected members see the game</option>
            <option value="public_leaderboard">Public game + league leaderboard - same game/picks, separate leaderboard</option>
          </select>
        </label>

        <label class="league-field">
          <span>Pick Scope</span>
          <select id="leagueWorkflowPickScope">
            <option value="universal" selected>Universal picks - one pick per user/game across all leagues</option>
            <option value="league_specific" disabled>Different picks per league - future scoring update</option>
          </select>
        </label>

      </div>

      <label class="league-field">
        <span>Games in this League</span>
        <select id="leagueWorkflowGameIds" multiple size="7">
          ${renderLeagueGameOptions_(games, "")}
        </select>
        <small class="league-help-text">Hold Command on Mac to select multiple games. A league can host multiple games.</small>
      </label>

      <div class="league-actions-row">
        <button class="button" onclick="leagueSaveWorkflowLeague()">Create / Update League</button>
        <button class="button secondary" onclick="navigate('admin-games')">Create New Game</button>
        <button class="button secondary" onclick="leagueClearWorkflowForm()">Clear</button>
        <button class="button secondary" onclick="leagueRefreshPage_()">Refresh</button>
      </div>

    </div>
  `;

}

function renderLeagueMemberManagerCard_(dashboard, leagues, activeLeagueId) {

  const users =
    dashboard && Array.isArray(dashboard.users)
      ? dashboard.users.filter(user => user && user.username && user.active !== false)
      : [];

  return `
    <div class="card league-card league-member-manager-card">

      <div class="league-section-header">
        <div>
          <h2>3. Members</h2>
          <p class="league-sub">
            Pick users already in the app and assign them to one or more leagues. Public league membership is optional; private league membership controls visibility.
          </p>
        </div>
      </div>

      <div class="league-workflow-grid">

        <label class="league-field">
          <span>User</span>
          <select id="leagueMemberUsername">
            ${renderLeagueUserOptions_(users)}
          </select>
        </label>

        <label class="league-field">
          <span>Role</span>
          <select id="leagueMemberRole">
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="admin">League Admin</option>
            <option value="owner">Owner</option>
          </select>
        </label>

        <label class="league-field league-wide-field">
          <span>Assign to League(s)</span>
          <select id="leagueMemberLeagueIds" multiple size="6">
            ${renderLeagueOptions_(leagues, activeLeagueId, true)}
          </select>
          <small class="league-help-text">A member can belong to multiple private leagues, even if those leagues use the same game.</small>
        </label>

      </div>

      <div class="league-actions-row">
        <button class="button" onclick="leagueAddMemberToSelectedLeagues()">Add / Update Member</button>
        <button class="button secondary" onclick="leagueLoadMembersFromMemberCard()">Load Selected League Members</button>
        <button class="button secondary" onclick="leagueCopyInviteText()">Copy Invite Text</button>
      </div>

      <p class="league-sub league-mini-note">
        Text-link invite sending is a future step. For now, this copies a message with the selected league name/code that you can text manually.
      </p>

    </div>
  `;

}

function renderLeagueFeatureParkedCard_() {

  return `
    <div class="card league-card league-feature-parked-card">
      <h2>4. Feature Access Later</h2>
      <p class="league-sub">
        Feature Access is intentionally parked for now. Once public/private leagues and game visibility are working, we can add controls for leaderboard visibility, compare picks, wager access, and league-admin permissions.
      </p>
    </div>
  `;

}

function renderLeagueAccessOverview_(dashboard) {

  if (!dashboard || !Array.isArray(dashboard.games)) {
    return "";
  }

  const games = dashboard.games || [];

  return `
    <section class="league-section league-overview-section">
      <div class="league-section-header">
        <div>
          <h2>Game Visibility Overview</h2>
          <p class="league-sub">Public = all users. Private = only selected league members. League Board = public game with separate league leaderboard.</p>
        </div>
      </div>

      <div class="league-overview-list">
        ${games.length ? games.map(renderLeagueOverviewGameRow_).join("") : `<div class="card">No games found.</div>`}
      </div>
    </section>
  `;

}

function renderLeagueOverviewGameRow_(game) {

  const mode = String(game.accessMode || "public");
  const isPrivate = mode === "private";
  const isLeagueBoard = mode === "public_leaderboard";
  const leagues = Array.isArray(game.leagues) ? game.leagues : [];

  return `
    <div class="league-overview-row ${isPrivate ? "private" : isLeagueBoard ? "leagueboard" : "public"}">

      <div>
        <strong>${leagueEscapeHtml_(game.name || game.gameId)}</strong>
        <span>${leagueEscapeHtml_(game.gameId)}${game.type ? " · " + leagueEscapeHtml_(game.type) : ""}</span>
      </div>

      <div class="league-overview-middle">
        <span class="league-mode-pill ${isPrivate ? "private" : isLeagueBoard ? "leagueboard" : "public"}">
          ${isPrivate ? "Private" : isLeagueBoard ? "League Board" : "Public"}
        </span>
        ${renderLeagueAssignedBadges_(game)}
      </div>

      <div class="league-overview-actions">
        ${
          leagues.length
            ? `<button class="button secondary small" onclick="leagueMakeGamePublicFromOverview('${leagueEscapeJs_(game.gameId)}')">Make Public</button>`
            : ""
        }
        ${leagues.map(league => `
          <button class="league-small-danger" onclick="leagueRemoveGameAssignment('${leagueEscapeJs_(league.leagueId)}','${leagueEscapeJs_(game.gameId)}')">
            Remove ${leagueEscapeHtml_(league.leagueName || league.leagueId)}
          </button>
        `).join("")}
      </div>

    </div>
  `;

}

function renderLeagueAssignedBadges_(game) {

  const leagues = Array.isArray(game.leagues) ? game.leagues : [];

  if (!leagues.length) {
    return `<span class="league-muted">Visible to all users</span>`;
  }

  return `
    <div class="league-badge-row">
      ${leagues.map(league => `
        <span class="league-assigned-badge">
          ${leagueEscapeHtml_(league.leagueName || league.leagueId)}
          ${league.accessMode === "public_leaderboard" ? " · leaderboard" : ""}
        </span>
      `).join("")}
    </div>
  `;

}

function renderMyLeaguesList_(leagues, activeLeagueId) {

  return `
    <section class="league-section">
      <div class="league-section-header">
        <div>
          <h2>My Leagues</h2>
          <p class="league-sub">Users can belong to multiple leagues for the same game.</p>
        </div>
        <span class="league-count">${leagues.length}</span>
      </div>

      <div class="league-list">
        ${
          leagues.length
            ? leagues.map(league => `
                <button class="league-list-card ${String(league.leagueId || "") === String(activeLeagueId || "") ? "active" : ""}" onclick="leagueSelectLeague('${leagueEscapeJs_(league.leagueId)}')">
                  <strong>${leagueEscapeHtml_(league.leagueName || league.leagueId)}</strong>
                  <span>${leagueEscapeHtml_(league.leagueId)}</span>
                  <em>${leagueEscapeHtml_(league.role || "member")}</em>
                </button>
              `).join("")
            : `<div class="card">No leagues yet. Create one above.</div>`
        }
      </div>
    </section>
  `;

}

function renderLeagueMembersPanel_(league) {

  if (!league) {
    return "";
  }

  return `
    <section class="league-section">
      <div class="league-section-header">
        <div>
          <h2>Members</h2>
          <p class="league-sub">${leagueEscapeHtml_(league.leagueName || league.leagueId)}</p>
        </div>
        <button class="button secondary" onclick="leagueLoadMembers('${leagueEscapeJs_(league.leagueId)}')">Load Members</button>
      </div>

      <div id="leagueMembersPanel" class="league-members-panel card">Click Load Members.</div>
    </section>
  `;

}

function renderLeagueHelpModal_() {

  return `
    <div id="leagueHelpModal" class="league-help-modal hidden">
      <div class="league-help-dialog card">
        <div class="league-section-header">
          <div>
            <h2>League Help Guide</h2>
            <p class="league-sub">Simple order: create league, attach games, add members, test visibility.</p>
          </div>
          <button class="button secondary" onclick="leagueHideHelpGuide()">Close</button>
        </div>

        <ol class="league-help-list">
          <li><strong>Setup League Sheets</strong> first if the sheets are missing.</li>
          <li><strong>Create/Edit League</strong> is now the main control area. League ID is automatic.</li>
          <li><strong>Private</strong> means only selected league members can see/play the game.</li>
          <li><strong>Public Game + League Leaderboard</strong> means the game remains public, picks stay universal, but league members can have a separate leaderboard.</li>
          <li><strong>Universal Picks</strong> means one user makes one pick per game, even if they are in multiple leagues.</li>
          <li><strong>Different Picks per League</strong> needs a later scoring/Picks sheet update, so it is disabled for now.</li>
          <li><strong>Members</strong> are pulled from the current Users sheet. Add members to one or more leagues.</li>
          <li><strong>Feature Access</strong> comes later after the league/game visibility workflow is stable.</li>
        </ol>
      </div>
    </div>
  `;

}

function renderLeagueOptions_(leagues, selectedLeagueId, includeAll) {

  if (!leagues.length) {
    return `<option value="">Create a league first</option>`;
  }

  return leagues.map(league => {

    const assignedGames = Array.isArray(league.games) ? league.games : [];
    const gameIds = assignedGames
      .map(game => game.gameId || game.GameId || "")
      .filter(Boolean)
      .join(",");
    const firstGame = assignedGames[0] || {};
    const accessMode = firstGame.accessMode || league.visibility || "private";
    const pickScope = firstGame.pickScope || "universal";

    return `
      <option
        value="${leagueEscapeAttr_(league.leagueId)}"
        data-league-name="${leagueEscapeAttr_(league.leagueName || league.leagueId)}"
        data-game-ids="${leagueEscapeAttr_(gameIds)}"
        data-access-mode="${leagueEscapeAttr_(accessMode)}"
        data-pick-scope="${leagueEscapeAttr_(pickScope)}"
        ${String(league.leagueId || "") === String(selectedLeagueId || "") ? "selected" : ""}
      >
        ${leagueEscapeHtml_(league.leagueName || league.leagueId)}
      </option>
    `;

  }).join("");

}

function renderLeagueGameOptions_(games, selectedGameId) {

  if (!games.length) {
    return `<option value="">No games available</option>`;
  }

  return games.map(game => {
    const gameId = game.gameId || game.GameId || game.id || "";
    const name = game.name || game.Name || gameId;
    return `
      <option value="${leagueEscapeAttr_(gameId)}" ${String(gameId || "") === String(selectedGameId || "") ? "selected" : ""}>
        ${leagueEscapeHtml_(name)}
      </option>
    `;
  }).join("");

}

function renderLeagueUserOptions_(users) {

  if (!users.length) {
    return `<option value="">No users found</option>`;
  }

  return users.map(user => `
    <option value="${leagueEscapeAttr_(user.username)}">
      ${leagueEscapeHtml_(user.username)}${user.isAdmin ? " · admin" : ""}
    </option>
  `).join("");

}

/* ======================
   ACTIONS
====================== */

async function leagueSetupSystem() {

  leagueSetMessage_("Setting up league sheets...", "info");

  const res = await apiAdminSetupLeagueAccessSystem();

  if (!res || res.success === false) {
    leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "League setup failed.", "error");
    return;
  }

  leagueSetMessage_("League sheets are ready.", "success");

}

async function leagueSaveWorkflowLeague() {

  const existingLeagueId = getLeagueInputValue_("leagueWorkflowExistingId");
  const leagueName = getLeagueInputValue_("leagueWorkflowName");
  const leagueId = existingLeagueId || leagueSlugify_(leagueName);
  const accessMode = getLeagueInputValue_("leagueWorkflowAccessMode") || "private";
  const pickScope = getLeagueInputValue_("leagueWorkflowPickScope") || "universal";
  const gameIds = getLeagueSelectedValues_("leagueWorkflowGameIds");

  if (!leagueName && !existingLeagueId) {
    leagueSetMessage_("Enter a league name.", "error");
    return;
  }

  if (!leagueId) {
    leagueSetMessage_("League ID could not be created. Check the league name.", "error");
    return;
  }

  leagueSetMessage_(existingLeagueId ? "Updating league..." : "Creating league...", "info");

  const payload = {
    leagueId: leagueId,
    leagueName: leagueName,
    visibility: accessMode === "public" ? "public" : "private",
    accessMode: accessMode,
    pickScope: pickScope,
    gameIds: gameIds.join(","),
    joinMode: "invite"
  };

  const res = existingLeagueId
    ? await apiUpdateLeague(payload)
    : await apiCreateLeague(payload);

  if (!res || res.success === false) {
    leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "Could not save league.", "error");
    return;
  }

  setFrontendLeagueId(leagueId);

  if (gameIds.length) {
    setFrontendGameId(gameIds[0]);
  }

  leagueSetMessage_(existingLeagueId ? "League updated." : "League created.", "success");

  setTimeout(function() {
    navigate("leagues");
  }, 700);

}

async function leagueAddMemberToSelectedLeagues() {

  const memberUsername = getLeagueInputValue_("leagueMemberUsername");
  const role = getLeagueInputValue_("leagueMemberRole") || "member";
  const leagueIds = getLeagueSelectedValues_("leagueMemberLeagueIds");

  if (!memberUsername) {
    leagueSetMessage_("Choose a user.", "error");
    return;
  }

  if (!leagueIds.length) {
    leagueSetMessage_("Choose at least one league.", "error");
    return;
  }

  leagueSetMessage_("Adding member to selected league(s)...", "info");

  for (let i = 0; i < leagueIds.length; i++) {
    const res = await apiAddLeagueMember({
      leagueId: leagueIds[i],
      memberUsername: memberUsername,
      role: role
    });

    if (!res || res.success === false) {
      leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "Could not add member.", "error");
      return;
    }
  }

  setFrontendLeagueId(leagueIds[0]);
  leagueSetMessage_("Member added/updated in " + leagueIds.length + " league(s).", "success");
  await leagueLoadMembers(leagueIds[0]);

}

function leagueLoadMembersFromMemberCard() {

  const leagueIds = getLeagueSelectedValues_("leagueMemberLeagueIds");
  const leagueId = leagueIds[0] || getFrontendLeagueId();

  if (!leagueId) {
    leagueSetMessage_("Choose a league first.", "error");
    return;
  }

  leagueLoadMembers(leagueId);

}

function leagueCopyInviteText() {

  const leagueIds = getLeagueSelectedValues_("leagueMemberLeagueIds");
  const leagueId = leagueIds[0] || getFrontendLeagueId();

  if (!leagueId) {
    leagueSetMessage_("Choose a league first.", "error");
    return;
  }

  const text =
    "You are invited to join league: " + leagueId +
    ". Open the app, sign in, and ask the admin for access/password.";

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    leagueSetMessage_("Invite text copied. You can paste it into a text message.", "success");
  } else {
    leagueSetMessage_(text, "info");
  }

}

async function leagueSetGameVisibility() {

  const gameId = getLeagueInputValue_("leagueQuickGameId");
  const accessMode = getLeagueInputValue_("leagueQuickAccessMode") || "public";
  const leagueId = getLeagueInputValue_("leagueQuickLeagueId");

  if (!gameId) {
    leagueSetMessage_("Choose a game.", "error");
    return;
  }

  if (accessMode !== "public" && !leagueId) {
    leagueSetMessage_("Choose a league.", "error");
    return;
  }

  leagueSetMessage_("Saving game access...", "info");

  const res = await apiSetGameLeagueVisibility({
    gameId: gameId,
    accessMode: accessMode,
    leagueId: leagueId,
    replace: true,
    pickScope: "universal"
  });

  if (!res || res.success === false) {
    leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "Could not save game access.", "error");
    return;
  }

  if (accessMode !== "public") {
    setFrontendLeagueId(leagueId);
  }

  setFrontendGameId(gameId);
  leagueSetMessage_(res.message || "Game access saved.", "success");

  setTimeout(function() {
    navigate("leagues");
  }, 700);

}

async function leagueMakeGamePublicFromOverview(gameId) {

  if (!gameId) {
    return;
  }

  if (!window.confirm("Make this game public for all users and remove league assignments?")) {
    return;
  }

  leagueSetMessage_("Making game public...", "info");

  const res = await apiSetGameLeagueVisibility({
    gameId: gameId,
    accessMode: "public"
  });

  if (!res || res.success === false) {
    leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "Could not make game public.", "error");
    return;
  }

  leagueSetMessage_("Game is now public.", "success");

  setTimeout(function() {
    navigate("leagues");
  }, 700);

}

async function leagueRemoveGameAssignment(leagueId, gameId) {

  if (!leagueId || !gameId) {
    return;
  }

  if (!window.confirm("Remove this game from this league?")) {
    return;
  }

  leagueSetMessage_("Removing game from league...", "info");

  const res = await apiRemoveGameFromLeague({
    leagueId: leagueId,
    gameId: gameId
  });

  if (!res || res.success === false) {
    leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "Could not remove game from league.", "error");
    return;
  }

  leagueSetMessage_("Game removed from league.", "success");

  setTimeout(function() {
    navigate("leagues");
  }, 700);

}

async function leagueLoadMembers(leagueId) {

  leagueId = String(leagueId || getFrontendLeagueId() || "").trim();

  if (!leagueId) {
    leagueSetMessage_("Choose a league first.", "error");
    return;
  }

  setFrontendLeagueId(leagueId);

  const panel = document.getElementById("leagueMembersPanel");

  if (panel) {
    panel.innerHTML = "Loading members...";
  }

  const res = await apiGetLeagueMembers(leagueId);

  if (!res || res.success === false) {
    if (panel) {
      panel.innerHTML = leagueEscapeHtml_(res && (res.error || res.message) ? res.error || res.message : "Could not load members.");
    }
    return;
  }

  const members = Array.isArray(res.members) ? res.members : [];

  if (panel) {
    panel.innerHTML = members.length
      ? `
        <div class="league-member-list">
          ${members.map(member => `
            <div class="league-member-row">
              <div>
                <strong>${leagueEscapeHtml_(member.username)}</strong>
                <span>${leagueEscapeHtml_(member.role || "member")}</span>
              </div>
              <button class="league-small-danger" onclick="leagueRemoveMember('${leagueEscapeJs_(leagueId)}','${leagueEscapeJs_(member.username)}')">Remove</button>
            </div>
          `).join("")}
        </div>
      `
      : "No active members.";
  }

}

async function leagueRemoveMember(leagueId, memberUsername) {

  if (!leagueId || !memberUsername) {
    return;
  }

  if (!window.confirm("Remove " + memberUsername + " from this league?")) {
    return;
  }

  const res = await apiRemoveLeagueMember({
    leagueId: leagueId,
    memberUsername: memberUsername
  });

  if (!res || res.success === false) {
    leagueSetMessage_(res && (res.error || res.message) ? res.error || res.message : "Could not remove member.", "error");
    return;
  }

  leagueSetMessage_("Member removed.", "success");
  await leagueLoadMembers(leagueId);

}

function leagueSelectLeague(leagueId) {
  setFrontendLeagueId(leagueId);
  navigate("leagues");
}

function leagueRefreshPage_() {
  navigate("leagues");
}

function leagueShowHelpGuide() {
  const el = document.getElementById("leagueHelpModal");
  if (el) {
    el.classList.remove("hidden");
  }
}

function leagueHideHelpGuide() {
  const el = document.getElementById("leagueHelpModal");
  if (el) {
    el.classList.add("hidden");
  }
}

function leagueUpdateLeagueIdPreview() {
  const name = getLeagueInputValue_("leagueWorkflowName");
  const preview = document.getElementById("leagueWorkflowIdPreview");
  if (preview) {
    preview.innerText = leagueSlugify_(name) || "league-id";
  }
}

function leaguePopulateExistingLeagueForm() {

  const leagueId = getLeagueInputValue_("leagueWorkflowExistingId");

  if (!leagueId) {
    leagueClearWorkflowForm(false);
    return;
  }

  setFrontendLeagueId(leagueId);

  const select = document.getElementById("leagueWorkflowExistingId");
  const option = select ? select.options[select.selectedIndex] : null;
  const nameInput = document.getElementById("leagueWorkflowName");
  const accessMode = document.getElementById("leagueWorkflowAccessMode");
  const pickScope = document.getElementById("leagueWorkflowPickScope");
  const games = document.getElementById("leagueWorkflowGameIds");

  if (nameInput && option) {
    nameInput.value = option.dataset.leagueName || String(option.textContent || "").trim();
  }

  if (accessMode && option && option.dataset.accessMode) {
    accessMode.value = option.dataset.accessMode === "public" ? "public" : option.dataset.accessMode === "public_leaderboard" ? "public_leaderboard" : "private";
  }

  if (pickScope && option && option.dataset.pickScope) {
    pickScope.value = option.dataset.pickScope === "league_specific" ? "league_specific" : "universal";
  }

  if (games && option) {
    const selectedGameIds = String(option.dataset.gameIds || "")
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);

    Array.from(games.options).forEach(gameOption => {
      gameOption.selected = selectedGameIds.indexOf(String(gameOption.value || "")) !== -1;
    });
  }

  leagueUpdateLeagueIdPreview();

}

function leagueClearWorkflowForm(resetExisting) {

  if (resetExisting !== false) {
    const existing = document.getElementById("leagueWorkflowExistingId");
    if (existing) {
      existing.value = "";
    }
  }

  const name = document.getElementById("leagueWorkflowName");
  if (name) {
    name.value = "";
  }

  const games = document.getElementById("leagueWorkflowGameIds");
  if (games) {
    Array.from(games.options).forEach(option => {
      option.selected = false;
    });
  }

  leagueUpdateLeagueIdPreview();

}

/* ======================
   BACKWARD-COMPATIBILITY ACTIONS
   Older buttons may still call these in cached frontend builds.
====================== */

async function leagueCreateLeague() {
  return leagueSaveWorkflowLeague();
}

async function leagueAssignGame() {
  return leagueSetGameVisibility();
}

async function leagueAddMember() {
  return leagueAddMemberToSelectedLeagues();
}

async function leagueSaveFeatureAccess() {
  leagueSetMessage_("Feature Access is parked for the next pass. Use league/game visibility first.", "info");
}

/* ======================
   HELPERS
====================== */

function getLeagueInputValue_(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function getLeagueSelectedValues_(id) {
  const el = document.getElementById(id);
  if (!el) {
    return [];
  }
  return Array.from(el.selectedOptions || [])
    .map(option => String(option.value || "").trim())
    .filter(Boolean);
}

function leagueSetMessage_(message, type) {

  const el = document.getElementById("leagueManagerMessage");

  if (!el) {
    return;
  }

  el.classList.remove("hidden", "success", "error", "info");
  el.classList.add(type || "info");
  el.innerText = message || "";

}

function leagueSlugify_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function leagueEscapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function leagueEscapeAttr_(value) {
  return leagueEscapeHtml_(value);
}

function leagueEscapeJs_(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function leagueEscapeCss_(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value || "").replace(/'/g, "\\'");
}
