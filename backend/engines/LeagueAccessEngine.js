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

  if (payload.gameId) {
    ensureLeagueGame_(leagueId, payload.gameId, username);
  }

  return {
    success: true,
    leagueId: leagueId,
    leagueName: leagueName
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
  ensureLeagueGame_(leagueId, gameId, username);

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
    RolesAllowed: payload.rolesAllowed || "owner,admin,member",
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

  if (!activeLeagueGames.length) {
    return {
      allowed: true,
      reason: "public-game",
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
    const rolesAllowed = leagueCsvToKeys_(rule.rolesAllowed || "owner,admin,member");

    if (accessRule === "disabled" || accessRule === "none") {
      return { allowed: false, reason: "feature-disabled", leagueId: leagueId, role: role };
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

      return {
        leagueId: normalizeLeagueId_(lg.leagueId),
        leagueName: league.leagueName || lg.leagueId,
        role: member.role || "member",
        status: member.status || "active",
        gameId: gameId
      };
    });

}

function getLeaguesForUser_(username) {

  username = leagueNormalizeString_(username);
  const memberships = getActiveMembershipsForUser_(username);
  const leagueMap = getLeagueMap_();

  return memberships.map(function(member) {
    const league = leagueMap[normalizeLeagueId_(member.leagueId)] || {};
    return {
      leagueId: member.leagueId,
      leagueName: league.leagueName || member.leagueId,
      role: member.role,
      status: member.status,
      visibility: league.visibility || "private",
      joinMode: league.joinMode || "invite"
    };
  });

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

function ensureLeagueGame_(leagueId, gameId, addedBy) {

  leagueId = normalizeLeagueId_(leagueId);
  gameId = normalizeGameId_(gameId);

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
      sheet.getRange(i + 1, col.Active + 1).setValue(true);
      clearLeagueAccessRuntimeCache_(LEAGUE_GAMES_SHEET);
      return true;
    }
  }

  leagueAppendObject_(sheet, LEAGUE_GAMES_HEADERS, {
    LeagueId: leagueId,
    GameId: gameId,
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

  return leagueReadSheetObjects_(LEAGUE_GAMES_SHEET, LEAGUE_GAMES_HEADERS)
    .map(function(row) {
      return {
        leagueId: normalizeLeagueId_(row.LeagueId),
        gameId: normalizeGameId_(row.GameId),
        active: leagueNormalizeBoolean_(row.Active)
      };
    })
    .filter(function(row) {
      return row.gameId === gameId && row.leagueId && row.active === true;
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
        rolesAllowed: row.RolesAllowed || "owner,admin,member",
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

  if (
    LEAGUE_ACCESS_RUNTIME_CACHE &&
    LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey]
  ) {
    return LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey];
  }

  const sh = leagueEnsureSheet_(sheetName, headers);
  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    LEAGUE_ACCESS_RUNTIME_CACHE[cacheKey] = [];
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
    return;
  }

  if (!sheetName) {
    LEAGUE_ACCESS_RUNTIME_CACHE = {};
    return;
  }

  delete LEAGUE_ACCESS_RUNTIME_CACHE[
    "league_sheet_objects_" + sheetName
  ];

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
