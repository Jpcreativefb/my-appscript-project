/* ======================
   LEAGUE MANAGER PAGE
   In-app league setup and management.

   Uses logged-in session automatically.
   No manual token copy/paste needed.
====================== */

const LEAGUE_MANAGER_FEATURES = [
  {
    value: "viewGame",
    label: "View Game"
  },
  {
    value: "makePicks",
    label: "Make Picks"
  },
  {
    value: "makeWagers",
    label: "Make Wagers"
  },
  {
    value: "viewLeaderboard",
    label: "View Leaderboard"
  },
  {
    value: "viewWagerLeaderboard",
    label: "View Wager Leaderboard"
  },
  {
    value: "comparePicks",
    label: "Compare Picks"
  },
  {
    value: "compareWagers",
    label: "Compare Wagers"
  },
  {
    value: "viewOtherUsersPicks",
    label: "View Other Users' Picks"
  },
  {
    value: "viewOtherUsersWagers",
    label: "View Other Users' Wagers"
  }
];

const LEAGUE_MANAGER_RULES = [
  {
    value: "league-members",
    label: "League Members"
  },
  {
    value: "owner-admin",
    label: "Owner/Admin Only"
  },
  {
    value: "users-only",
    label: "Specific Users Only"
  },
  {
    value: "disabled",
    label: "Disabled"
  }
];

async function renderLeaguesPage() {

  const session =
    getSession();

  if (
    !session ||
    !session.username
  ) {
    return `
      <div class="page leagues-page">
        <h1>Leagues</h1>
        <div class="card">
          You must be logged in.
        </div>
      </div>
    `;
  }

  const isAdmin =
    isAdminSession(session);

  const [
    leaguesRes,
    gamesRes
  ] =
    await Promise.all([
      apiGetMyLeagues(""),
      leagueManagerLoadGames_()
    ]);

  const leagues =
    leaguesRes &&
    leaguesRes.success &&
    Array.isArray(leaguesRes.leagues)
      ? leaguesRes.leagues
      : [];

  const games =
    gamesRes &&
    gamesRes.success &&
    Array.isArray(gamesRes.games)
      ? gamesRes.games
      : [];

  const activeLeagueId =
    getFrontendLeagueId() ||
    (
      leagues[0] &&
      leagues[0].leagueId
    ) ||
    "";

  const selectedLeague =
    leagues.find(league =>
      String(league.leagueId || "") ===
      String(activeLeagueId || "")
    ) || leagues[0] || null;

  return `
    <div class="page leagues-page">

      <div class="league-page-header">

        <div>
          <h1>Leagues</h1>

          <p class="league-sub">
            Create leagues, invite members, assign games, and control feature access.
          </p>
        </div>

        <button
          class="button secondary"
          onclick="navigate('dashboard')"
        >
          Back
        </button>

      </div>

      <div
        id="leagueManagerMessage"
        class="league-message hidden"
      ></div>

      ${
        isAdmin
          ? renderLeagueSetupCard_()
          : ""
      }

      <div class="league-admin-grid">

        ${renderCreateLeagueCard_(games)}

        ${renderAssignGameCard_(leagues, games, activeLeagueId)}

        ${renderAddMemberCard_(leagues, activeLeagueId)}

        ${renderFeatureAccessCard_(leagues, games, activeLeagueId)}

      </div>

      ${renderMyLeaguesList_(leagues, activeLeagueId)}

      ${renderLeagueMembersPanel_(selectedLeague)}

    </div>
  `;

}


async function leagueManagerLoadGames_() {

  if (
    typeof apiAdminGetGames === "function"
  ) {

    const adminGames =
      await apiAdminGetGames();

    if (
      adminGames &&
      adminGames.success &&
      Array.isArray(adminGames.games)
    ) {
      return adminGames;
    }

  }

  return apiGetActiveGames();

}


function renderLeagueSetupCard_() {

  return `
    <div class="card league-card league-setup-card">

      <h2>League System Setup</h2>

      <p class="league-sub">
        Run this once to create or repair League sheets.
      </p>

      <button
        class="button"
        onclick="leagueSetupSystem()"
      >
        Setup League Sheets
      </button>

    </div>
  `;

}


function renderCreateLeagueCard_(
  games
) {

  return `
    <div class="card league-card">

      <h2>Create League</h2>

      <label class="league-field">
        <span>League Name</span>
        <input
          id="leagueCreateName"
          type="text"
          placeholder="Family League"
        >
      </label>

      <label class="league-field">
        <span>Optional League ID</span>
        <input
          id="leagueCreateId"
          type="text"
          placeholder="family-league"
        >
      </label>

      <label class="league-field">
        <span>Attach Game Now</span>
        <select id="leagueCreateGameId">
          <option value="">
            No game yet
          </option>
          ${renderLeagueGameOptions_(games, "")}
        </select>
      </label>

      <button
        class="button"
        onclick="leagueCreateLeague()"
      >
        Create League
      </button>

    </div>
  `;

}


function renderAssignGameCard_(
  leagues,
  games,
  activeLeagueId
) {

  return `
    <div class="card league-card">

      <h2>Assign Game to League</h2>

      <p class="league-sub">
        Once a game is assigned to at least one league, it becomes league-controlled.
      </p>

      <label class="league-field">
        <span>League</span>
        <select id="leagueAssignLeagueId">
          ${renderLeagueOptions_(leagues, activeLeagueId)}
        </select>
      </label>

      <label class="league-field">
        <span>Game</span>
        <select id="leagueAssignGameId">
          ${renderLeagueGameOptions_(games, getFrontendGameId())}
        </select>
      </label>

      <button
        class="button"
        onclick="leagueAssignGame()"
      >
        Assign Game
      </button>

    </div>
  `;

}


function renderAddMemberCard_(
  leagues,
  activeLeagueId
) {

  return `
    <div class="card league-card">

      <h2>Add Member</h2>

      <label class="league-field">
        <span>League</span>
        <select id="leagueMemberLeagueId">
          ${renderLeagueOptions_(leagues, activeLeagueId)}
        </select>
      </label>

      <label class="league-field">
        <span>Username</span>
        <input
          id="leagueMemberUsername"
          type="text"
          placeholder="Stacey"
        >
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

      <button
        class="button"
        onclick="leagueAddMember()"
      >
        Add / Update Member
      </button>

    </div>
  `;

}


function renderFeatureAccessCard_(
  leagues,
  games,
  activeLeagueId
) {

  return `
    <div class="card league-card">

      <h2>Feature Access</h2>

      <p class="league-sub">
        Control who can use features inside a league/game.
      </p>

      <label class="league-field">
        <span>League</span>
        <select id="leagueFeatureLeagueId">
          ${renderLeagueOptions_(leagues, activeLeagueId)}
        </select>
      </label>

      <label class="league-field">
        <span>Game</span>
        <select id="leagueFeatureGameId">
          ${renderLeagueGameOptions_(games, getFrontendGameId())}
        </select>
      </label>

      <label class="league-field">
        <span>Feature</span>
        <select id="leagueFeatureName">
          ${
            LEAGUE_MANAGER_FEATURES
              .map(feature => `
                <option value="${leagueEscapeAttr_(feature.value)}">
                  ${leagueEscapeHtml_(feature.label)}
                </option>
              `)
              .join("")
          }
        </select>
      </label>

      <label class="league-field">
        <span>Access Rule</span>
        <select id="leagueFeatureAccessRule">
          ${
            LEAGUE_MANAGER_RULES
              .map(rule => `
                <option value="${leagueEscapeAttr_(rule.value)}">
                  ${leagueEscapeHtml_(rule.label)}
                </option>
              `)
              .join("")
          }
        </select>
      </label>

      <label class="league-field">
        <span>Roles Allowed</span>
        <input
          id="leagueFeatureRolesAllowed"
          type="text"
          value="owner,admin,member"
        >
      </label>

      <label class="league-field">
        <span>Specific Users Allowed</span>
        <input
          id="leagueFeatureUsersAllowed"
          type="text"
          placeholder="Only for users-only rule"
        >
      </label>

      <button
        class="button"
        onclick="leagueSaveFeatureAccess()"
      >
        Save Feature Access
      </button>

    </div>
  `;

}


function renderMyLeaguesList_(
  leagues,
  activeLeagueId
) {

  return `
    <section class="league-section">

      <div class="league-section-header">
        <div>
          <h2>My Leagues</h2>
          <p class="league-sub">
            You can belong to multiple leagues for the same game.
          </p>
        </div>

        <span class="league-count">
          ${leagues.length}
        </span>
      </div>

      <div class="league-list">
        ${
          leagues.length
            ? leagues
                .map(league => `
                  <button
                    class="league-list-card ${
                      String(league.leagueId || "") ===
                      String(activeLeagueId || "")
                        ? "active"
                        : ""
                    }"
                    onclick="leagueSelectLeague('${leagueEscapeJs_(league.leagueId)}')"
                  >
                    <strong>
                      ${leagueEscapeHtml_(league.leagueName || league.leagueId)}
                    </strong>

                    <span>
                      ${leagueEscapeHtml_(league.leagueId)}
                    </span>

                    <em>
                      ${leagueEscapeHtml_(league.role || "member")}
                    </em>
                  </button>
                `)
                .join("")
            : `
              <div class="card">
                No leagues yet. Create one above.
              </div>
            `
        }
      </div>

    </section>
  `;

}


function renderLeagueMembersPanel_(
  league
) {

  if (!league) {
    return "";
  }

  return `
    <section class="league-section">

      <div class="league-section-header">
        <div>
          <h2>Members</h2>
          <p class="league-sub">
            ${leagueEscapeHtml_(league.leagueName || league.leagueId)}
          </p>
        </div>

        <button
          class="button secondary"
          onclick="leagueLoadMembers('${leagueEscapeJs_(league.leagueId)}')"
        >
          Load Members
        </button>
      </div>

      <div
        id="leagueMembersPanel"
        class="league-members-panel card"
      >
        Click Load Members.
      </div>

    </section>
  `;

}


function renderLeagueOptions_(
  leagues,
  selectedLeagueId
) {

  if (!leagues.length) {
    return `
      <option value="">
        Create a league first
      </option>
    `;
  }

  return leagues
    .map(league => `
      <option
        value="${leagueEscapeAttr_(league.leagueId)}"
        ${
          String(league.leagueId || "") ===
          String(selectedLeagueId || "")
            ? "selected"
            : ""
        }
      >
        ${leagueEscapeHtml_(league.leagueName || league.leagueId)}
      </option>
    `)
    .join("");

}


function renderLeagueGameOptions_(
  games,
  selectedGameId
) {

  if (!games.length) {
    return `
      <option value="">
        No games available
      </option>
    `;
  }

  return games
    .map(game => {

      const gameId =
        game.gameId ||
        game.GameId ||
        game.id ||
        "";

      const name =
        game.name ||
        game.Name ||
        gameId;

      return `
        <option
          value="${leagueEscapeAttr_(gameId)}"
          ${
            String(gameId || "") ===
            String(selectedGameId || "")
              ? "selected"
              : ""
          }
        >
          ${leagueEscapeHtml_(name)}
        </option>
      `;

    })
    .join("");

}


/* ======================
   ACTIONS
====================== */

async function leagueSetupSystem() {

  leagueSetMessage_(
    "Setting up league sheets...",
    "info"
  );

  const res =
    await apiAdminSetupLeagueAccessSystem();

  if (
    !res ||
    res.success === false
  ) {
    leagueSetMessage_(
      res && (res.error || res.message)
        ? res.error || res.message
        : "League setup failed.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "League sheets are ready.",
    "success"
  );

}


async function leagueCreateLeague() {

  const leagueName =
    getLeagueInputValue_("leagueCreateName");

  const leagueId =
    getLeagueInputValue_("leagueCreateId");

  const gameId =
    getLeagueInputValue_("leagueCreateGameId");

  if (!leagueName) {
    leagueSetMessage_(
      "Enter a league name.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Creating league...",
    "info"
  );

  const res =
    await apiCreateLeague({
      leagueName:
        leagueName,
      leagueId:
        leagueId,
      gameId:
        gameId
    });

  if (
    !res ||
    res.success === false
  ) {
    leagueSetMessage_(
      res && (res.error || res.message)
        ? res.error || res.message
        : "Could not create league.",
      "error"
    );
    return;
  }

  if (res.leagueId) {
    setFrontendLeagueId(
      res.leagueId
    );
  }

  leagueSetMessage_(
    "League created.",
    "success"
  );

  setTimeout(function() {
    navigate("leagues");
  }, 650);

}


async function leagueAssignGame() {

  const leagueId =
    getLeagueInputValue_("leagueAssignLeagueId");

  const gameId =
    getLeagueInputValue_("leagueAssignGameId");

  if (
    !leagueId ||
    !gameId
  ) {
    leagueSetMessage_(
      "Choose a league and game.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Assigning game...",
    "info"
  );

  const res =
    await apiAssignGameToLeague({
      leagueId:
        leagueId,
      gameId:
        gameId
    });

  if (
    !res ||
    res.success === false
  ) {
    leagueSetMessage_(
      res && (res.error || res.message)
        ? res.error || res.message
        : "Could not assign game.",
      "error"
    );
    return;
  }

  setFrontendLeagueId(
    leagueId
  );

  setFrontendGameId(
    gameId
  );

  leagueSetMessage_(
    "Game assigned to league. This game is now league-controlled.",
    "success"
  );

}


async function leagueAddMember() {

  const leagueId =
    getLeagueInputValue_("leagueMemberLeagueId");

  const memberUsername =
    getLeagueInputValue_("leagueMemberUsername");

  const role =
    getLeagueInputValue_("leagueMemberRole") ||
    "member";

  if (
    !leagueId ||
    !memberUsername
  ) {
    leagueSetMessage_(
      "Choose a league and enter a username.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Adding member...",
    "info"
  );

  const res =
    await apiAddLeagueMember({
      leagueId:
        leagueId,
      memberUsername:
        memberUsername,
      role:
        role
    });

  if (
    !res ||
    res.success === false
  ) {
    leagueSetMessage_(
      res && (res.error || res.message)
        ? res.error || res.message
        : "Could not add member.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Member added/updated.",
    "success"
  );

  await leagueLoadMembers(
    leagueId
  );

}


async function leagueSaveFeatureAccess() {

  const leagueId =
    getLeagueInputValue_("leagueFeatureLeagueId");

  const gameId =
    getLeagueInputValue_("leagueFeatureGameId");

  const feature =
    getLeagueInputValue_("leagueFeatureName");

  const accessRule =
    getLeagueInputValue_("leagueFeatureAccessRule");

  const rolesAllowed =
    getLeagueInputValue_("leagueFeatureRolesAllowed");

  const usersAllowed =
    getLeagueInputValue_("leagueFeatureUsersAllowed");

  if (
    !leagueId ||
    !gameId ||
    !feature
  ) {
    leagueSetMessage_(
      "Choose league, game, and feature.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Saving feature access...",
    "info"
  );

  const res =
    await apiSaveLeagueFeatureAccess({
      leagueId:
        leagueId,
      gameId:
        gameId,
      feature:
        feature,
      accessRule:
        accessRule,
      rolesAllowed:
        rolesAllowed,
      usersAllowed:
        usersAllowed
    });

  if (
    !res ||
    res.success === false
  ) {
    leagueSetMessage_(
      res && (res.error || res.message)
        ? res.error || res.message
        : "Could not save feature access.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Feature access saved.",
    "success"
  );

}


async function leagueLoadMembers(
  leagueId
) {

  leagueId =
    String(leagueId || getFrontendLeagueId() || "")
      .trim();

  if (!leagueId) {
    leagueSetMessage_(
      "Choose a league first.",
      "error"
    );
    return;
  }

  setFrontendLeagueId(
    leagueId
  );

  const panel =
    document.getElementById(
      "leagueMembersPanel"
    );

  if (panel) {
    panel.innerHTML =
      "Loading members...";
  }

  const res =
    await apiGetLeagueMembers(
      leagueId
    );

  if (
    !res ||
    res.success === false
  ) {

    if (panel) {
      panel.innerHTML =
        leagueEscapeHtml_(
          res && (res.error || res.message)
            ? res.error || res.message
            : "Could not load members."
        );
    }

    return;

  }

  const members =
    Array.isArray(res.members)
      ? res.members
      : [];

  if (panel) {
    panel.innerHTML =
      members.length
        ? `
          <div class="league-member-list">
            ${
              members
                .map(member => `
                  <div class="league-member-row">

                    <div>
                      <strong>
                        ${leagueEscapeHtml_(member.username)}
                      </strong>

                      <span>
                        ${leagueEscapeHtml_(member.role || "member")}
                      </span>
                    </div>

                    <button
                      class="league-small-danger"
                      onclick="leagueRemoveMember('${leagueEscapeJs_(leagueId)}','${leagueEscapeJs_(member.username)}')"
                    >
                      Remove
                    </button>

                  </div>
                `)
                .join("")
            }
          </div>
        `
        : "No active members.";
  }

}


async function leagueRemoveMember(
  leagueId,
  memberUsername
) {

  if (
    !leagueId ||
    !memberUsername
  ) {
    return;
  }

  if (
    !window.confirm(
      "Remove " + memberUsername + " from this league?"
    )
  ) {
    return;
  }

  const res =
    await apiRemoveLeagueMember({
      leagueId:
        leagueId,
      memberUsername:
        memberUsername
    });

  if (
    !res ||
    res.success === false
  ) {
    leagueSetMessage_(
      res && (res.error || res.message)
        ? res.error || res.message
        : "Could not remove member.",
      "error"
    );
    return;
  }

  leagueSetMessage_(
    "Member removed.",
    "success"
  );

  await leagueLoadMembers(
    leagueId
  );

}


function leagueSelectLeague(
  leagueId
) {

  setFrontendLeagueId(
    leagueId
  );

  navigate(
    "leagues"
  );

}


/* ======================
   HELPERS
====================== */

function getLeagueInputValue_(
  id
) {

  const el =
    document.getElementById(id);

  return el
    ? String(el.value || "").trim()
    : "";

}


function leagueSetMessage_(
  message,
  type
) {

  const el =
    document.getElementById(
      "leagueManagerMessage"
    );

  if (!el) {
    return;
  }

  el.classList.remove(
    "hidden",
    "success",
    "error",
    "info"
  );

  el.classList.add(
    type || "info"
  );

  el.innerText =
    message || "";

}


function leagueEscapeHtml_(
  value
) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function leagueEscapeAttr_(
  value
) {

  return leagueEscapeHtml_(
    value
  );

}


function leagueEscapeJs_(
  value
) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");

}
