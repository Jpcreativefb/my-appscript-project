/* =========================
   LEAGUE ACCESS ENGINE
   Private games + multi-league membership

   Model:
   - One user can belong to multiple leagues for the same game.
   - Picks/wagers stay tied to Username + GameId.
   - Leaderboards and compare views are filtered by LeagueId.
   - If a game has no active LeagueGames rows, it remains public.
   - If a game has active LeagueGames rows, only members of those leagues can see it.
========================= */

const LEAGUES_SHEET = "Leagues";
const LEAGUE_MEMBERS_SHEET = "LeagueMembers";
const LEAGUE_GAMES_SHEET = "LeagueGames";
const GAME_FEATURE_ACCESS_SHEET = "GameFeatureAccess";

const LEAGUES_HEADERS = [
  "LeagueId",
  "LeagueName",
  "OwnerUsername",
  "Visibility",
  "JoinMode",
  "JoinCode",
  "Active",
  "CreatedAt",
  "UpdatedAt",
  "Notes"
];

const LEAGUE_MEMBERS_HEADERS = [
  "LeagueId",
  "Username",
  "Role",
  "Status",
  "InvitedBy",
  "JoinedAt",
  "UpdatedAt"
];

const LEAGUE_GAMES_HEADERS = [
  "LeagueId",
  "GameId",
  "AccessMode",
  "PickScope",
  "Active",
  "CreatedAt",
  "AddedBy"
];

const GAME_FEATURE_ACCESS_HEADERS = [
  "GameId",
  "LeagueId",
  "Feature",
  "AccessRule",
  "RolesAllowed",
  "UsersAllowed",
  "UsersBlocked",
  "Active",
  "UpdatedAt"
];

const LEAGUE_ACCESS_PUBLIC_LEAGUE_ID = "public";

var LEAGUE_ACCESS_RUNTIME_CACHE = LEAGUE_ACCESS_RUNTIME_CACHE || {};

/* =========================
   SETUP
========================= */

function apiSetupLeagueAccessSystem(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);

  if (username && token) {
    validateUserSession_(username, token);

    if (!isAdmin(username)) {
      return {
        success: false,
        error: "Admin access required"
      };
    }
  }

  leagueEnsureSheet_(LEAGUES_SHEET, LEAGUES_HEADERS);
  leagueEnsureSheet_(LEAGUE_MEMBERS_SHEET, LEAGUE_MEMBERS_HEADERS);
  leagueEnsureSheet_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS);
  leagueEnsureSheet_(GAME_FEATURE_ACCESS_SHEET, GAME_FEATURE_ACCESS_HEADERS);

  return {
    success: true,
    message: "League access sheets are ready.",
    sheets: [
      LEAGUES_SHEET,
      LEAGUE_MEMBERS_SHEET,
      LEAGUE_GAMES_SHEET,
      GAME_FEATURE_ACCESS_SHEET
    ]
  };

}

function leagueEnsureSheet_(sheetName, headers) {

  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(sheetName);

  if (!sh) {
    sh = ss.insertSheet(sheetName);
    clearLeagueAccessRuntimeCache_(sheetName);
  }

  const range = sh.getDataRange();
  const values = range.getValues();

  if (!values.length || !values[0].filter(String).length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    clearLeagueAccessRuntimeCache_(sheetName);
    return sh;
  }

  const existing = values[0].map(function(h) {
    return String(h || "").trim();
  });

  headers.forEach(function(header) {
    if (existing.indexOf(header) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(header);
      existing.push(header);
      clearLeagueAccessRuntimeCache_(sheetName);
    }
  });

  sh.setFrozenRows(1);
  return sh;

}

/* =========================
   PUBLIC / API HELPERS
========================= */

function apiGetMyLeagues(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const gameId = normalizeGameId_(payload.gameId || "");

  if (!username) {
    return { success: false, error: "Missing username" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const leagues = gameId
    ? getAccessibleLeaguesForGame_(username, gameId)
    : getLeaguesForUser_(username);

  return {
    success: true,
    username: username,
    gameId: gameId,
    leagues: leagues
  };

}

function leagueNormalizeGameAccessMode_(value) {

  const mode = String(value || "private")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (
    mode === "public-leaderboard" ||
    mode === "public-leaderboards" ||
    mode === "both" ||
    mode === "shared" ||
    mode === "league-leaderboard" ||
    mode === "league-leaderboards"
  ) {
    return "public_leaderboard";
  }

  if (mode === "public") {
    return "public";
  }

  return "private";

}

function leagueNormalizePickScope_(value) {

  const scope = String(value || "universal")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (
    scope === "league" ||
    scope === "league-specific" ||
    scope === "different" ||
    scope === "different-per-league"
  ) {
    return "league_specific";
  }

  return "universal";

}

function leagueCsvToGameIds_(value) {

  if (Array.isArray(value)) {
    return value
      .map(function(item) { return normalizeGameId_(item); })
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map(function(item) { return normalizeGameId_(item); })
    .filter(Boolean)
    .filter(function(item, index, arr) {
      return arr.indexOf(item) === index;
    });

}


function apiCreateLeague(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueName = leagueNormalizeString_(payload.leagueName || payload.name);

  if (!username) {
    return { success: false, error: "Missing username" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  if (!leagueName) {
    return { success: false, error: "Missing league name" };
  }

  const leagueId = normalizeLeagueId_(payload.leagueId || leagueName);
  const gameIds = leagueCsvToGameIds_(payload.gameIds || payload.gameId || "");
  const accessMode = leagueNormalizeGameAccessMode_(payload.accessMode || payload.gameAccessMode || payload.visibility || "private");
  const pickScope = leagueNormalizePickScope_(payload.pickScope || "universal");
  const now = new Date().toISOString();

  const leaguesSheet = leagueEnsureSheet_(LEAGUES_SHEET, LEAGUES_HEADERS);
  const leagues = leagueReadSheetObjects_(LEAGUES_SHEET, LEAGUES_HEADERS);

  const existing = leagues.find(function(league) {
    return normalizeLeagueId_(league.LeagueId) === leagueId;
  });

  if (existing) {
    return {
      success: false,
      error: "League already exists: " + leagueId
    };
  }

  leagueAppendObject_(leaguesSheet, LEAGUES_HEADERS, {
    LeagueId: leagueId,
    LeagueName: leagueName,
    OwnerUsername: username,
    Visibility: payload.visibility || "private",
    JoinMode: payload.joinMode || "invite",
    JoinCode: payload.joinCode || generateLeagueJoinCode_(),
    Active: true,
    CreatedAt: now,
    UpdatedAt: now,
    Notes: payload.notes || ""
  });

  ensureLeagueMember_(leagueId, username, "owner", "active", username);

  gameIds.forEach(function(gameId) {
    validateGameId(gameId);
    ensureLeagueGame_(leagueId, gameId, username, accessMode, pickScope);
  });

  return {
    success: true,
    leagueId: leagueId,
    leagueName: leagueName,
    gameIds: gameIds,
    accessMode: accessMode,
    pickScope: pickScope
  };

}

function apiAddLeagueMember(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);
  const memberUsername = leagueNormalizeString_(payload.memberUsername || payload.targetUsername);
  const role = leagueNormalizeRole_(payload.role || "member");

  if (!username || !leagueId || !memberUsername) {
    return { success: false, error: "Missing username, leagueId, or memberUsername" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);

  if (!canManage.allowed) {
    return { success: false, error: canManage.reason || "You cannot manage this league." };
  }

  ensureLeagueMember_(leagueId, memberUsername, role, "active", username);

  return {
    success: true,
    leagueId: leagueId,
    memberUsername: memberUsername,
    role: role
  };

}

function apiRemoveLeagueMember(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);
  const memberUsername = leagueNormalizeString_(payload.memberUsername || payload.targetUsername);

  if (!username || !leagueId || !memberUsername) {
    return { success: false, error: "Missing username, leagueId, or memberUsername" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);

  if (!canManage.allowed) {
    return { success: false, error: canManage.reason || "You cannot manage this league." };
  }

  updateLeagueMemberStatus_(leagueId, memberUsername, "removed");

  return {
    success: true,
    leagueId: leagueId,
    memberUsername: memberUsername,
    status: "removed"
  };

}

function apiAssignGameToLeague(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);
  const gameId = normalizeGameId_(payload.gameId);

  if (!username || !leagueId || !gameId) {
    return { success: false, error: "Missing username, leagueId, or gameId" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);

  if (!canManage.allowed && !isAdmin(username)) {
    return { success: false, error: canManage.reason || "You cannot manage this league." };
  }

  validateGameId(gameId);
  ensureLeagueGame_(
    leagueId,
    gameId,
    username,
    payload.accessMode || payload.gameAccessMode || "private",
    payload.pickScope || "universal"
  );

  return {
    success: true,
    leagueId: leagueId,
    gameId: gameId
  };

}

function apiSaveLeagueFeatureAccess(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);
  const gameId = normalizeGameId_(payload.gameId);
  const feature = leagueNormalizeFeature_(payload.feature);

  if (!username || !leagueId || !gameId || !feature) {
    return { success: false, error: "Missing username, leagueId, gameId, or feature" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);

  if (!canManage.allowed && !isAdmin(username)) {
    return { success: false, error: canManage.reason || "You cannot manage this league." };
  }

  const sheet = leagueEnsureSheet_(GAME_FEATURE_ACCESS_SHEET, GAME_FEATURE_ACCESS_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  const now = new Date().toISOString();

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (
      normalizeGameId_(data[i][col.GameId]) === gameId &&
      normalizeLeagueId_(data[i][col.LeagueId]) === leagueId &&
      leagueNormalizeFeature_(data[i][col.Feature]) === feature
    ) {
      rowIndex = i + 1;
      break;
    }
  }

  const obj = {
    GameId: gameId,
    LeagueId: leagueId,
    Feature: feature,
    AccessRule: payload.accessRule || "league-members",
    RolesAllowed: payload.rolesAllowed || "owner,admin,member,viewer",
    UsersAllowed: payload.usersAllowed || "",
    UsersBlocked: payload.usersBlocked || "",
    Active: payload.active === undefined ? true : leagueNormalizeBoolean_(payload.active),
    UpdatedAt: now
  };

  if (rowIndex > -1) {
    GAME_FEATURE_ACCESS_HEADERS.forEach(function(header, index) {
      const colIndex = headers.indexOf(header);
      if (colIndex > -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(obj[header]);
      }
    });
  } else {
    leagueAppendObject_(sheet, GAME_FEATURE_ACCESS_HEADERS, obj);
  }

  clearLeagueAccessRuntimeCache_(GAME_FEATURE_ACCESS_SHEET);

  return {
    success: true,
    gameId: gameId,
    leagueId: leagueId,
    feature: feature
  };

}

function apiGetLeagueMembers(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);

  if (!username || !leagueId) {
    return { success: false, error: "Missing username or leagueId" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);
  const isMember = isUserActiveLeagueMember_(username, leagueId);

  if (!canManage.allowed && !isMember && !isAdmin(username)) {
    return { success: false, error: "You do not have access to this league." };
  }

  return {
    success: true,
    leagueId: leagueId,
    members: getActiveLeagueMembers_(leagueId)
  };

}


/* =========================
   ADMIN LEAGUE DASHBOARD / VISIBILITY
========================= */

function apiAdminGetLeagueAccessDashboard(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);

  if (!username) {
    return { success: false, error: "Missing username" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  if (!isAdmin(username)) {
    return { success: false, error: "Admin access required" };
  }

  apiSetupLeagueAccessSystem({});

  const games =
    typeof getGames === "function"
      ? getGames()
      : [];

  const leagueMap = getLeagueMap_();
  const memberships = getAllLeagueMembershipRows_();
  const leagueGames = getAllLeagueGameRows_();
  const featureRules = getAllLeagueFeatureRuleRows_();
  const users =
    typeof adminGetUsers_ === "function"
      ? adminGetUsers_()
      : getUsers().map(function(username) {
          return {
            username: username,
            isAdmin: false,
            active: true
          };
        });

  const leagues = Object.keys(leagueMap)
    .map(function(leagueId) {

      const league = leagueMap[leagueId] || {};
      const members = memberships.filter(function(member) {
        return member.leagueId === leagueId && member.status === "active";
      });
      const assignedGames = leagueGames.filter(function(row) {
        return row.leagueId === leagueId && row.active === true;
      });

      return {
        leagueId: leagueId,
        leagueName: league.leagueName || leagueId,
        ownerUsername: league.ownerUsername || "",
        visibility: league.visibility || "private",
        joinMode: league.joinMode || "invite",
        joinCode: league.joinCode || "",
        active: league.active !== false,
        memberCount: members.length,
        members: members,
        gameCount: assignedGames.length,
        games: assignedGames
      };

    })
    .sort(function(a, b) {
      return String(a.leagueName || a.leagueId).localeCompare(String(b.leagueName || b.leagueId));
    });

  const gameAccess = (Array.isArray(games) ? games : [])
    .map(function(game) {

      const gameId = normalizeGameId_(game.gameId || game.GameId || "");
      const assigned = leagueGames.filter(function(row) {
        return row.gameId === gameId && row.active === true;
      });

      const assignedLeagues = assigned.map(function(row) {
        const league = leagueMap[row.leagueId] || {};
        return {
          leagueId: row.leagueId,
          leagueName: league.leagueName || row.leagueId,
          active: row.active === true,
          accessMode: row.accessMode || "private",
          pickScope: row.pickScope || "universal"
        };
      });

      const hasPrivateAccess = assignedLeagues.some(function(row) {
        return row.accessMode === "private";
      });

      return {
        gameId: gameId,
        name: game.name || game.Name || gameId,
        type: game.type || game.Type || "",
        active: game.active === true || game.Active === true,
        archived: game.archived === true || game.Archived === true,
        accessMode: hasPrivateAccess
          ? "private"
          : assignedLeagues.length
            ? "public_leaderboard"
            : "public",
        leagueScoped: assignedLeagues.length > 0,
        leagues: assignedLeagues
      };

    })
    .filter(function(game) {
      return !!game.gameId;
    });

  return {
    success: true,
    leagues: leagues,
    games: gameAccess,
    users: users.map(function(user) {
      return {
        username: user.username || user.Username || "",
        isAdmin: user.isAdmin === true,
        active: user.active !== false
      };
    }),
    featureRules: featureRules,
    counts: {
      leagues: leagues.length,
      privateGames: gameAccess.filter(function(game) { return game.accessMode === "private"; }).length,
      publicGames: gameAccess.filter(function(game) { return game.accessMode === "public"; }).length,
      publicLeagueGames: gameAccess.filter(function(game) { return game.accessMode === "public_leaderboard"; }).length,
      featureRules: featureRules.length
    }
  };

}

function apiSetGameLeagueVisibility(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const gameId = normalizeGameId_(payload.gameId);
  const accessMode = leagueNormalizeGameAccessMode_(payload.accessMode || payload.mode || "private");

  if (!username || !gameId) {
    return { success: false, error: "Missing username or gameId" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  if (!isAdmin(username)) {
    return { success: false, error: "Admin access required" };
  }

  validateGameId(gameId);
  apiSetupLeagueAccessSystem({});

  if (accessMode === "public") {
    const removed = deactivateLeagueGamesForGame_(gameId, "");
    clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);
    return {
      success: true,
      gameId: gameId,
      accessMode: "public",
      removed: removed,
      message: "Game is now public."
    };
  }

  const leagueIds = leagueCsvToKeys_(payload.leagueIds || payload.leagueId || "")
    .map(normalizeLeagueId_)
    .filter(Boolean);

  if (!leagueIds.length) {
    return { success: false, error: "Choose at least one league for private access." };
  }

  if (String(payload.replace || "true").toLowerCase() !== "false") {
    deactivateLeagueGamesForGame_(gameId, "");
  }

  const normalizedAccessMode =
    accessMode === "public_leaderboard"
      ? "public_leaderboard"
      : "private";

  const pickScope = leagueNormalizePickScope_(payload.pickScope || "universal");

  leagueIds.forEach(function(leagueId) {
    ensureLeagueGame_(leagueId, gameId, username, normalizedAccessMode, pickScope);
  });

  clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);

  return {
    success: true,
    gameId: gameId,
    accessMode: normalizedAccessMode,
    pickScope: pickScope,
    leagueIds: leagueIds,
    message: normalizedAccessMode === "private"
      ? "Game is now private to selected league(s)."
      : "Game stays public and league leaderboards are enabled."
  };

}

function apiRemoveGameFromLeague(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);
  const gameId = normalizeGameId_(payload.gameId);

  if (!username || !leagueId || !gameId) {
    return { success: false, error: "Missing username, leagueId, or gameId" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);

  if (!canManage.allowed && !isAdmin(username)) {
    return { success: false, error: canManage.reason || "You cannot manage this league." };
  }

  const removed = deactivateLeagueGamesForGame_(gameId, leagueId);

  return {
    success: true,
    leagueId: leagueId,
    gameId: gameId,
    removed: removed
  };

}

function apiUpdateLeague(payload) {

  payload = payload || {};

  const username = leagueNormalizeString_(payload.username);
  const token = leagueNormalizeString_(payload.token);
  const leagueId = normalizeLeagueId_(payload.leagueId);

  if (!username || !leagueId) {
    return { success: false, error: "Missing username or leagueId" };
  }

  if (token) {
    validateUserSession_(username, token);
  }

  const canManage = userCanManageLeague_(username, leagueId);

  if (!canManage.allowed && !isAdmin(username)) {
    return { success: false, error: canManage.reason || "You cannot manage this league." };
  }

  const sheet = leagueEnsureSheet_(LEAGUES_SHEET, LEAGUES_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (normalizeLeagueId_(data[i][col.LeagueId]) === leagueId) {

      if ("leagueName" in payload || "name" in payload) {
        sheet.getRange(i + 1, col.LeagueName + 1).setValue(leagueNormalizeString_(payload.leagueName || payload.name));
      }
      if ("visibility" in payload) {
        sheet.getRange(i + 1, col.Visibility + 1).setValue(leagueNormalizeString_(payload.visibility || "private").toLowerCase());
      }
      if ("joinMode" in payload) {
        sheet.getRange(i + 1, col.JoinMode + 1).setValue(leagueNormalizeString_(payload.joinMode || "invite").toLowerCase());
      }
      if ("active" in payload) {
        sheet.getRange(i + 1, col.Active + 1).setValue(leagueNormalizeBoolean_(payload.active));
      }
      if ("notes" in payload) {
        sheet.getRange(i + 1, col.Notes + 1).setValue(leagueNormalizeString_(payload.notes));
      }

      sheet.getRange(i + 1, col.UpdatedAt + 1).setValue(now);

      if ("gameIds" in payload || "gameId" in payload) {

        const gameIds = leagueCsvToGameIds_(payload.gameIds || payload.gameId || "");
        const accessMode = leagueNormalizeGameAccessMode_(payload.accessMode || payload.gameAccessMode || payload.visibility || "private");
        const pickScope = leagueNormalizePickScope_(payload.pickScope || "universal");

        deactivateLeagueGamesForLeague_(leagueId);

        gameIds.forEach(function(gameId) {
          validateGameId(gameId);
          ensureLeagueGame_(leagueId, gameId, username, accessMode, pickScope);
        });

      }

      clearLeagueAccessRuntimeCache_(LEAGUES_SHEET);
      clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);

      return {
        success: true,
        leagueId: leagueId,
        message: "League updated"
      };

    }
  }

  return { success: false, error: "League not found: " + leagueId };

}

function getAllLeagueMembershipRows_() {

  return leagueReadSheetObjects_(LEAGUE_MEMBERS_SHEET, LEAGUE_MEMBERS_HEADERS)
    .map(function(row) {
      return {
        leagueId: normalizeLeagueId_(row.LeagueId),
        username: leagueNormalizeString_(row.Username),
        role: leagueNormalizeRole_(row.Role || "member"),
        status: leagueNormalizeString_(row.Status || "active").toLowerCase(),
        invitedBy: leagueNormalizeString_(row.InvitedBy),
        joinedAt: row.JoinedAt || "",
        updatedAt: row.UpdatedAt || ""
      };
    })
    .filter(function(row) {
      return row.leagueId && row.username;
    });

}

function getAllLeagueGameRows_() {

  return leagueReadSheetObjects_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS)
    .map(function(row) {
      return {
        leagueId: normalizeLeagueId_(row.LeagueId),
        gameId: normalizeGameId_(row.GameId),
        accessMode: leagueNormalizeGameAccessMode_(row.AccessMode || "private"),
        pickScope: leagueNormalizePickScope_(row.PickScope || "universal"),
        active: leagueNormalizeBoolean_(row.Active),
        createdAt: row.CreatedAt || "",
        addedBy: leagueNormalizeString_(row.AddedBy)
      };
    })
    .filter(function(row) {
      return row.leagueId && row.gameId;
    });

}

function getAllLeagueFeatureRuleRows_() {

  return leagueReadSheetObjects_(GAME_FEATURE_ACCESS_SHEET, GAME_FEATURE_ACCESS_HEADERS)
    .map(function(row) {
      return {
        gameId: normalizeGameId_(row.GameId),
        leagueId: normalizeLeagueId_(row.LeagueId),
        feature: leagueNormalizeFeature_(row.Feature),
        accessRule: leagueNormalizeString_(row.AccessRule || "league-members"),
        rolesAllowed: leagueNormalizeString_(row.RolesAllowed || "owner,admin,member,viewer"),
        usersAllowed: leagueNormalizeString_(row.UsersAllowed),
        usersBlocked: leagueNormalizeString_(row.UsersBlocked),
        active: row.Active === "" || row.Active === undefined ? true : leagueNormalizeBoolean_(row.Active),
        updatedAt: row.UpdatedAt || ""
      };
    })
    .filter(function(row) {
      return row.gameId && row.leagueId && row.feature;
    });

}

function deactivateLeagueGamesForLeague_(leagueId) {

  leagueId = normalizeLeagueId_(leagueId);

  const sheet = leagueEnsureSheet_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return 0;
  }

  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  let changed = 0;

  const values = data.slice(1).map(function(row) {

    const rowLeagueId = normalizeLeagueId_(row[col.LeagueId]);
    const rowActive = leagueNormalizeBoolean_(row[col.Active]);

    if (rowLeagueId === leagueId && rowActive === true) {
      changed++;
      return [false];
    }

    return [row[col.Active]];

  });

  if (values.length) {
    sheet.getRange(2, col.Active + 1, values.length, 1).setValues(values);
  }

  clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);
  return changed;

}

function deactivateLeagueGamesForGame_(gameId, leagueId) {

  gameId = normalizeGameId_(gameId);
  leagueId = normalizeLeagueId_(leagueId || "");

  const sheet = leagueEnsureSheet_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return 0;
  }

  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  let changed = 0;

  const values = data.slice(1).map(function(row) {

    const rowLeagueId = normalizeLeagueId_(row[col.LeagueId]);
    const rowGameId = normalizeGameId_(row[col.GameId]);
    const rowActive = leagueNormalizeBoolean_(row[col.Active]);

    if (
      rowGameId === gameId &&
      rowActive === true &&
      (!leagueId || rowLeagueId === leagueId)
    ) {
      changed++;
      return [false];
    }

    return [row[col.Active]];

  });

  if (values.length) {
    sheet.getRange(2, col.Active + 1, values.length, 1).setValues(values);
  }

  clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);
  return changed;

}

/* =========================
   ACCESS DECISIONS
========================= */

function userCanAccessGameFeature_(username, gameId, feature, leagueId) {

  username = leagueNormalizeString_(username);
  gameId = normalizeGameId_(gameId);
  feature = leagueNormalizeFeature_(feature || "viewGame");
  leagueId = normalizeLeagueId_(leagueId || "");

  if (!gameId) {
    return { allowed: false, reason: "missing-game" };
  }

  if (username && isAdmin(username)) {
    return {
      allowed: true,
      reason: "app-admin",
      leagueId: leagueId,
      role: "admin"
    };
  }

  const activeLeagueGames = getActiveLeagueGamesForGame_(gameId);
  const privateLeagueGames = activeLeagueGames.filter(function(row) {
    return row.accessMode === "private";
  });

  if (!privateLeagueGames.length) {
    return {
      allowed: true,
      reason: activeLeagueGames.length ? "public-game-league-leaderboard" : "public-game",
      leagueId: "",
      role: "public"
    };
  }

  if (!username) {
    return { allowed: false, reason: "login-required" };
  }

  const memberLeagues = getAccessibleLeaguesForGame_(username, gameId);

  if (!memberLeagues.length) {
    return { allowed: false, reason: "not-a-league-member" };
  }

  let activeLeague = null;

  if (leagueId) {
    activeLeague = memberLeagues.find(function(league) {
      return normalizeLeagueId_(league.leagueId) === leagueId;
    }) || null;

    if (!activeLeague) {
      return { allowed: false, reason: "not-a-member-of-selected-league" };
    }
  } else {
    activeLeague = memberLeagues[0];
    leagueId = activeLeague.leagueId;
  }

  const rule = getLeagueFeatureRule_(gameId, leagueId, feature);
  const role = leagueNormalizeRole_(activeLeague.role || "member");

  if (rule && rule.active === false) {
    return { allowed: false, reason: "feature-disabled", leagueId: leagueId, role: role };
  }

  if (rule) {
    const blocked = leagueCsvToKeys_(rule.usersBlocked);
    if (blocked.indexOf(leagueNormalizeKey_(username)) !== -1) {
      return { allowed: false, reason: "user-blocked", leagueId: leagueId, role: role };
    }

    const accessRule = leagueNormalizeString_(rule.accessRule).toLowerCase();
    const usersAllowed = leagueCsvToKeys_(rule.usersAllowed);
    let rolesAllowed = leagueCsvToKeys_(rule.rolesAllowed || "owner,admin,member,viewer");

    if (accessRule === "disabled" || accessRule === "none") {
      return { allowed: false, reason: "feature-disabled", leagueId: leagueId, role: role };
    }

    if (accessRule === "owner-admin" || accessRule === "owner-admin-only") {
      rolesAllowed = ["owner", "admin"];
    }

    if (accessRule === "league-members" && !rolesAllowed.length) {
      rolesAllowed = ["owner", "admin", "member", "viewer"];
    }

    if (accessRule === "users-only") {
      const allowed = usersAllowed.indexOf(leagueNormalizeKey_(username)) !== -1;
      return {
        allowed: allowed,
        reason: allowed ? "users-only" : "not-in-users-allowed",
        leagueId: leagueId,
        role: role
      };
    }

    if (rolesAllowed.length && rolesAllowed.indexOf(leagueNormalizeKey_(role)) === -1) {
      return { allowed: false, reason: "role-not-allowed", leagueId: leagueId, role: role };
    }
  }

  return {
    allowed: true,
    reason: "league-member",
    leagueId: leagueId,
    role: role,
    leagueName: activeLeague.leagueName || ""
  };

}

function requireGameFeatureAccess_(username, gameId, feature, leagueId) {

  const access = userCanAccessGameFeature_(username, gameId, feature, leagueId);

  if (!access.allowed) {
    throw new Error("Access denied: " + access.reason);
  }

  return access;

}

function filterGamesForUser_(games, username) {

  games = Array.isArray(games) ? games : [];
  username = leagueNormalizeString_(username);

  return games
    .map(function(game) {

      if (!game || !game.gameId) {
        return null;
      }

      const access = userCanAccessGameFeature_(username, game.gameId, "viewGame", "");

      if (!access.allowed) {
        return null;
      }

      const leagues = getAccessibleLeaguesForGame_(username, game.gameId);

      const clone = Object.assign({}, game);
      clone.leagues = leagues;
      clone.leagueId = access.leagueId || (leagues[0] && leagues[0].leagueId) || "";
      clone.leagueName = access.leagueName || (leagues[0] && leagues[0].leagueName) || "";
      clone.leagueScoped = leagues.length > 0;

      return clone;

    })
    .filter(Boolean);

}

function getPublicActiveGamesForUser_(username) {

  return filterGamesForUser_(getActiveGames(), username)
    .map(function(game) {
      return buildLeaguePublicGameObject_(game);
    });

}

function buildLeaguePublicGameObject_(game) {

  return {
    gameId: game.gameId,
    name: game.name,
    year: game.year,
    type: game.type,
    typeLabel: game.typeLabel,
    defaultGame: game.defaultGame === true,
    predictionEnabled: game.predictionEnabled === true,
    rankingEnabled: game.rankingEnabled === true,
    confidenceEnabled: game.confidenceEnabled === true,
    confidenceScoringMode: game.confidenceScoringMode || "win_only",
    wagerEnabled: game.wagerEnabled === true,
    themeColor: game.themeColor || "",
    icon: game.icon || "",
    leagues: game.leagues || [],
    leagueId: game.leagueId || "",
    leagueName: game.leagueName || "",
    leagueScoped: game.leagueScoped === true
  };

}

function filterLeaderboardRowsForLeague_(rows, gameId, leagueId) {

  rows = Array.isArray(rows) ? rows : [];
  gameId = normalizeGameId_(gameId);
  leagueId = normalizeLeagueId_(leagueId || "");

  if (!leagueId) {
    return rows;
  }

  const members = getActiveLeagueMembers_(leagueId).map(function(member) {
    return leagueNormalizeKey_(member.username);
  });

  return rows.filter(function(row) {
    const username = row.username || row.user || row.Username || row.User || "";
    return members.indexOf(leagueNormalizeKey_(username)) !== -1;
  });

}

function resolveLeagueIdForUserGame_(username, gameId, leagueId) {

  const access = userCanAccessGameFeature_(username, gameId, "viewGame", leagueId);

  return access.allowed
    ? access.leagueId || ""
    : "";

}

function getAccessibleLeaguesForGame_(username, gameId) {

  username = leagueNormalizeString_(username);
  gameId = normalizeGameId_(gameId);

  const activeLeagueGames = getActiveLeagueGamesForGame_(gameId);

  if (!activeLeagueGames.length) {
    return [];
  }

  const userMemberships = getActiveMembershipsForUser_(username);
  const userLeagueIds = userMemberships.map(function(member) {
    return normalizeLeagueId_(member.leagueId);
  });

  const leagueMap = getLeagueMap_();

  return activeLeagueGames
    .filter(function(lg) {
      return userLeagueIds.indexOf(normalizeLeagueId_(lg.leagueId)) !== -1;
    })
    .map(function(lg) {
      const member = userMemberships.find(function(m) {
        return normalizeLeagueId_(m.leagueId) === normalizeLeagueId_(lg.leagueId);
      }) || {};

      const league = leagueMap[normalizeLeagueId_(lg.leagueId)] || {};

      if (league.active === false) {
        return null;
      }

      return {
        leagueId: normalizeLeagueId_(lg.leagueId),
        leagueName: league.leagueName || lg.leagueId,
        role: member.role || "member",
        status: member.status || "active",
        gameId: gameId
      };
    })
    .filter(Boolean);

}

function getLeaguesForUser_(username) {

  username = leagueNormalizeString_(username);
  const memberships = getActiveMembershipsForUser_(username);
  const leagueMap = getLeagueMap_();

  return memberships.map(function(member) {
    const league = leagueMap[normalizeLeagueId_(member.leagueId)] || {};

    if (league.active === false) {
      return null;
    }

    return {
      leagueId: member.leagueId,
      leagueName: league.leagueName || member.leagueId,
      role: member.role,
      status: member.status,
      visibility: league.visibility || "private",
      joinMode: league.joinMode || "invite"
    };
  }).filter(Boolean);

}

/* =========================
   MEMBERS / LEAGUES
========================= */

function ensureLeagueMember_(leagueId, username, role, status, invitedBy) {

  leagueId = normalizeLeagueId_(leagueId);
  username = leagueNormalizeString_(username);
  role = leagueNormalizeRole_(role || "member");
  status = leagueNormalizeString_(status || "active").toLowerCase();

  const sheet = leagueEnsureSheet_(LEAGUE_MEMBERS_SHEET, LEAGUE_MEMBERS_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (
      normalizeLeagueId_(data[i][col.LeagueId]) === leagueId &&
      leagueNormalizeKey_(data[i][col.Username]) === leagueNormalizeKey_(username)
    ) {
      sheet.getRange(i + 1, col.Role + 1).setValue(role);
      sheet.getRange(i + 1, col.Status + 1).setValue(status);
      sheet.getRange(i + 1, col.UpdatedAt + 1).setValue(now);
      clearLeagueAccessRuntimeCache_(LEAGUE_MEMBERS_SHEET);
      return true;
    }
  }

  leagueAppendObject_(sheet, LEAGUE_MEMBERS_HEADERS, {
    LeagueId: leagueId,
    Username: username,
    Role: role,
    Status: status,
    InvitedBy: invitedBy || "",
    JoinedAt: now,
    UpdatedAt: now
  });

  return true;

}

function updateLeagueMemberStatus_(leagueId, username, status) {

  leagueId = normalizeLeagueId_(leagueId);
  username = leagueNormalizeString_(username);
  status = leagueNormalizeString_(status || "removed").toLowerCase();

  const sheet = leagueEnsureSheet_(LEAGUE_MEMBERS_SHEET, LEAGUE_MEMBERS_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (
      normalizeLeagueId_(data[i][col.LeagueId]) === leagueId &&
      leagueNormalizeKey_(data[i][col.Username]) === leagueNormalizeKey_(username)
    ) {
      sheet.getRange(i + 1, col.Status + 1).setValue(status);
      sheet.getRange(i + 1, col.UpdatedAt + 1).setValue(now);
      clearLeagueAccessRuntimeCache_(LEAGUE_MEMBERS_SHEET);
      return true;
    }
  }

  return false;

}

function ensureLeagueGame_(leagueId, gameId, addedBy, accessMode, pickScope) {

  leagueId = normalizeLeagueId_(leagueId);
  gameId = normalizeGameId_(gameId);
  accessMode = leagueNormalizeGameAccessMode_(accessMode || "private");
  pickScope = leagueNormalizePickScope_(pickScope || "universal");

  const sheet = leagueEnsureSheet_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h || "").trim(); });
  const col = leagueColumnMap_(headers);
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (
      normalizeLeagueId_(data[i][col.LeagueId]) === leagueId &&
      normalizeGameId_(data[i][col.GameId]) === gameId
    ) {
      if (typeof col.AccessMode === "number") {
        sheet.getRange(i + 1, col.AccessMode + 1).setValue(accessMode);
      }
      if (typeof col.PickScope === "number") {
        sheet.getRange(i + 1, col.PickScope + 1).setValue(pickScope);
      }
      sheet.getRange(i + 1, col.Active + 1).setValue(true);
      clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);
      return true;
    }
  }

  leagueAppendObject_(sheet, LEAGUE_GAMES_HEADERS, {
    LeagueId: leagueId,
    GameId: gameId,
    AccessMode: accessMode,
    PickScope: pickScope,
    Active: true,
    CreatedAt: now,
    AddedBy: addedBy || ""
  });

  return true;

}

function userCanManageLeague_(username, leagueId) {

  username = leagueNormalizeString_(username);
  leagueId = normalizeLeagueId_(leagueId);

  if (isAdmin(username)) {
    return { allowed: true, reason: "app-admin", role: "admin" };
  }

  const member = getLeagueMember_(leagueId, username);

  if (!member) {
    return { allowed: false, reason: "not-a-member" };
  }

  const role = leagueNormalizeRole_(member.role);
  const allowed = role === "owner" || role === "admin";

  return {
    allowed: allowed,
    reason: allowed ? "league-admin" : "not-league-admin",
    role: role
  };

}

function isUserActiveLeagueMember_(username, leagueId) {

  return !!getLeagueMember_(leagueId, username);

}

function getLeagueMember_(leagueId, username) {

  leagueId = normalizeLeagueId_(leagueId);
  username = leagueNormalizeString_(username);

  return getActiveLeagueMembers_(leagueId).find(function(member) {
    return leagueNormalizeKey_(member.username) === leagueNormalizeKey_(username);
  }) || null;

}

function getActiveLeagueMembers_(leagueId) {

  leagueId = normalizeLeagueId_(leagueId);

  return leagueReadSheetObjects_(LEAGUE_MEMBERS_SHEET, LEAGUE_MEMBERS_HEADERS)
    .map(function(row) {
      return {
        leagueId: normalizeLeagueId_(row.LeagueId),
        username: leagueNormalizeString_(row.Username),
        role: leagueNormalizeRole_(row.Role || "member"),
        status: leagueNormalizeString_(row.Status || "active").toLowerCase()
      };
    })
    .filter(function(row) {
      return row.leagueId === leagueId && row.username && row.status === "active";
    });

}

function getActiveMembershipsForUser_(username) {

  username = leagueNormalizeString_(username);

  return leagueReadSheetObjects_(LEAGUE_MEMBERS_SHEET, LEAGUE_MEMBERS_HEADERS)
    .map(function(row) {
      return {
        leagueId: normalizeLeagueId_(row.LeagueId),
        username: leagueNormalizeString_(row.Username),
        role: leagueNormalizeRole_(row.Role || "member"),
        status: leagueNormalizeString_(row.Status || "active").toLowerCase()
      };
    })
    .filter(function(row) {
      return row.username && leagueNormalizeKey_(row.username) === leagueNormalizeKey_(username) && row.status === "active";
    });

}

function getActiveLeagueGamesForGame_(gameId) {

  gameId = normalizeGameId_(gameId);

  const leagueMap = getLeagueMap_();

  return leagueReadSheetObjects_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS)
    .map(function(row) {
      return {
        leagueId: normalizeLeagueId_(row.LeagueId),
        gameId: normalizeGameId_(row.GameId),
        accessMode: leagueNormalizeGameAccessMode_(row.AccessMode || "private"),
        pickScope: leagueNormalizePickScope_(row.PickScope || "universal"),
        active: leagueNormalizeBoolean_(row.Active)
      };
    })
    .filter(function(row) {
      const league = leagueMap[row.leagueId] || {};
      return row.gameId === gameId && row.leagueId && row.active === true && league.active !== false;
    });

}

function getLeagueMap_() {

  const map = {};

  leagueReadSheetObjects_(LEAGUES_SHEET, LEAGUES_HEADERS)
    .forEach(function(row) {
      const leagueId = normalizeLeagueId_(row.LeagueId);
      if (!leagueId) {
        return;
      }
      map[leagueId] = {
        leagueId: leagueId,
        leagueName: leagueNormalizeString_(row.LeagueName) || leagueId,
        ownerUsername: leagueNormalizeString_(row.OwnerUsername),
        visibility: leagueNormalizeString_(row.Visibility || "private").toLowerCase(),
        joinMode: leagueNormalizeString_(row.JoinMode || "invite").toLowerCase(),
        accessMode: leagueNormalizeGameAccessMode_(row.AccessMode || "private"),
        pickScope: leagueNormalizePickScope_(row.PickScope || "universal"),
        active: leagueNormalizeBoolean_(row.Active)
      };
    });

  return map;

}

function getLeagueFeatureRule_(gameId, leagueId, feature) {

  gameId = normalizeGameId_(gameId);
  leagueId = normalizeLeagueId_(leagueId);
  feature = leagueNormalizeFeature_(feature);

  const rows = leagueReadSheetObjects_(GAME_FEATURE_ACCESS_SHEET, GAME_FEATURE_ACCESS_HEADERS);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (
      normalizeGameId_(row.GameId) === gameId &&
      normalizeLeagueId_(row.LeagueId) === leagueId &&
      leagueNormalizeFeature_(row.Feature) === feature
    ) {
      return {
        gameId: gameId,
        leagueId: leagueId,
        feature: feature,
        accessRule: row.AccessRule || "league-members",
        rolesAllowed: row.RolesAllowed || "owner,admin,member,viewer",
        usersAllowed: row.UsersAllowed || "",
        usersBlocked: row.UsersBlocked || "",
        active: row.Active === "" || row.Active === undefined ? true : leagueNormalizeBoolean_(row.Active)
      };
    }
  }

  return null;

}

/* =========================
   SHEET UTILITIES
========================= */

function leagueReadSheetObjects_(sheetName, headers) {

  const cacheKey =
    "league_sheet_objects_" + sheetName;
  const scriptCacheKey =
    "league_sheet_v1219rc2_" + String(sheetName || "").replace(/[^a-z0-9_-]+/gi, "_");

  if (
    LEAGUE_ACCESS_RUNTIME_CACHE &&
    Object.prototype.hasOwnProperty.call(LEAGUE_ACCESS_RUNTIME_CACHE, cacheKey)
  ) {
    return LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey];
  }

  // The old runtime cache only survived one Apps Script execution. Home, game
  // startup and leaderboard calls therefore re-read the same four league
  // sheets repeatedly. Keep a short cross-execution copy and invalidate it on
  // every league/access write.
  if (typeof CacheService !== "undefined") {
    try {
      const cached = CacheService.getScriptCache().get(scriptCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey] = Array.isArray(parsed) ? parsed : [];
        return LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey];
      }
    } catch (cacheReadError) {}
  }

  const sh = leagueEnsureSheet_(sheetName, headers);
  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey] = [];
    if (typeof CacheService !== "undefined") {
      try { CacheService.getScriptCache().put(scriptCacheKey, "[]", 900); } catch (cacheWriteError) {}
    }
    return [];
  }

  const actualHeaders = data[0].map(function(h) {
    return String(h || "").trim();
  });

  const rows = data.slice(1).map(function(row) {
    const obj = {};
    actualHeaders.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });

  LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey] = rows;

  if (typeof CacheService !== "undefined") {
    try {
      const serialized = JSON.stringify(rows);
      if (serialized.length < 95000) {
        CacheService.getScriptCache().put(scriptCacheKey, serialized, 900);
      }
    } catch (cacheWriteError) {}
  }

  return rows;

}

function leagueAppendObject_(sheet, headers, obj) {

  const values = headers.map(function(header) {
    return obj[header] !== undefined ? obj[header] : "";
  });

  sheet.appendRow(values);
  clearLeagueAccessRuntimeCache_(
    sheet && typeof sheet.getName === "function"
      ? sheet.getName()
      : ""
  );

}

function leagueColumnMap_(headers) {

  const col = {};
  headers.forEach(function(header, index) {
    col[header] = index;
  });
  return col;

}

function clearLeagueAccessRuntimeCache_(sheetName) {

  if (!LEAGUE_ACCESS_RUNTIME_CACHE) {
    LEAGUE_ACCESS_RUNTIME_CACHE = {};
  }

  const clearScriptKey = function(name) {
    if (typeof CacheService === "undefined") return;
    const key = "league_sheet_v1219rc2_" + String(name || "").replace(/[^a-z0-9_-]+/gi, "_");
    try { CacheService.getScriptCache().remove(key); } catch (err) {}
  };

  if (!sheetName) {
    LEAGUE_ACCESS_RUNTIME_CACHE = {};
    [LEAGUES_SHEET, LEAGUE_MEMBERS_SHEET, LEAGUE_GAMES_SHEET, GAME_FEATURE_ACCESS_SHEET].forEach(clearScriptKey);
    return;
  }

  delete LEAGUE_ACCESS_RUNTIME_CACHE[
    "league_sheet_objects_" + sheetName
  ];
  clearScriptKey(sheetName);

}

function normalizeLeagueId_(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}

function leagueNormalizeString_(value) {

  return String(value || "").trim();

}

function leagueNormalizeKey_(value) {

  return String(value || "").trim().toLowerCase();

}

function leagueNormalizeFeature_(value) {

  return String(value || "")
    .trim()
    .replace(/\s+/g, "");

}

function leagueNormalizeRole_(value) {

  const role = String(value || "member").trim().toLowerCase();

  if (role === "owner" || role === "admin" || role === "viewer" || role === "blocked") {
    return role;
  }

  return "member";

}

function leagueNormalizeBoolean_(value) {

  return (
    value === true ||
    value === 1 ||
    String(value || "").trim().toLowerCase() === "true" ||
    String(value || "").trim().toLowerCase() === "yes" ||
    String(value || "").trim() === "1"
  );

}

function leagueCsvToKeys_(value) {

  return String(value || "")
    .split(",")
    .map(function(item) {
      return leagueNormalizeKey_(item);
    })
    .filter(Boolean);

}

function generateLeagueJoinCode_() {

  return Utilities.getUuid()
    .split("-")[0]
    .toUpperCase();

}
