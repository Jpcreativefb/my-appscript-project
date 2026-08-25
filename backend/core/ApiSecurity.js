/* =========================================================
   API SECURITY BOUNDARY — v1.2.16
   Central request authentication/authorization for the
   anonymous Apps Script web-app surface.
========================================================= */

var API_PUBLIC_ACTIONS_ = {
  "": true,
  health: true,
  login: true,
  signup: true,
  requestPinReset: true,
  resetPin: true,
  validateSession: true
};

// These authenticated read actions intentionally display another player's
// information. For backward compatibility, an older caller-supplied username
// is copied into targetUsername before username is replaced by the session user.
var API_TARGET_USERNAME_ACTIONS_ = {
  getUserProfile: true,
  getUserProfileHistory: true,
  getArchivedGameHistory: true,
  userBreakdown: true
};

function apiSecurityIsPublicAction_(action) {
  return API_PUBLIC_ACTIONS_[String(action || "")] === true;
}

function apiSecurityIsAdminAction_(action) {
  return /^admin/.test(String(action || ""));
}

// Production transport contract. Every mutation requires POST. Read-only GET
// remains accepted by the backend for rollout/backward compatibility with an
// already-open old frontend tab, but the current frontend sends authenticated
// reads through POST so bearer tokens are not placed in URLs in steady state.
var API_EXPLICIT_POST_ACTIONS_ = {
  login: true, logout: true, signup: true, requestPinReset: true, resetPin: true,
  saveEditableProfile: true, saveUserProfile: true, uploadProfileAvatar: true,
  setGameProfilePromptChoice: true, setNotificationPreference: true,
  saveNotificationPreferences: true, markNotificationRead: true, markAllNotificationsRead: true,
  registerPushSubscription: true, removePushSubscription: true,
  savePick: true, savePicksBatch: true, saveConfidencePicksBatch: true, saveRanking: true,
  saveVotingParticipant: true, uploadVotingParticipantImage: true, saveVotingCompetitionBallot: true,
  saveSurvivorPick: true, saveSeasonAnchorPick: true, saveBet: true, removeBet: true,
  saveTeamFantasyPick: true, randomTeamFantasyPicks: true, autoPickTeamFantasy: true,
  createLeague: true, addLeagueMember: true, removeLeagueMember: true, assignGameToLeague: true,
  saveLeagueFeatureAccess: true, setGameLeagueVisibility: true, removeGameFromLeague: true, updateLeague: true
};

function apiSecurityAdminReadAction_(action) {
  action = String(action || "").trim();
  return action === "adminSummary" ||
    /^adminGet/.test(action) ||
    /^adminAwardsGet/.test(action) ||
    /^adminAwardsSearch/.test(action) ||
    /^adminPreview/.test(action) ||
    /^adminParse/.test(action);
}

function apiSecurityRequiresPost_(action) {
  action = String(action || "").trim();
  if (API_EXPLICIT_POST_ACTIONS_[action] === true) return true;
  if (apiSecurityIsAdminAction_(action)) return !apiSecurityAdminReadAction_(action);
  return false;
}

function apiSecurityAllowsGet_(action) {
  return !apiSecurityRequiresPost_(action);
}

function apiSecurityNormalizeUsername_(value) {
  return String(value || "").trim().toLowerCase();
}

function apiSecurityRequireSession_(payload) {
  payload = payload || {};

  const token = String(payload.token || "").trim();
  if (!token) {
    throw new Error("Authentication required");
  }

  // Deliberately validate against the persisted device-session store instead
  // of trusting CacheService as an authentication authority. This makes
  // logout, deactivation and PIN resets take effect immediately.
  const record =
    typeof findUserRecordBySessionToken_ === "function"
      ? findUserRecordBySessionToken_(token)
      : null;

  if (!record) {
    throw new Error("Invalid or expired session");
  }

  const username = String(
    record.user && record.user["Username"] || ""
  ).trim();

  if (!username) {
    throw new Error("Invalid or expired session");
  }

  return username;
}

function apiSecurityAuthorizeRequest_(action, payload) {
  action = String(action || "").trim();
  payload = payload || {};

  if (apiSecurityIsPublicAction_(action)) {
    return {
      public: true,
      username: "",
      isAdmin: false
    };
  }

  const sessionUsername = apiSecurityRequireSession_(payload);
  const suppliedUsername = String(payload.username || "").trim();
  const usernamesMatch =
    !suppliedUsername ||
    apiSecurityNormalizeUsername_(suppliedUsername) ===
      apiSecurityNormalizeUsername_(sessionUsername);

  if (apiSecurityIsAdminAction_(action)) {
    if (!isAdmin(sessionUsername)) {
      throw new Error("Admin access denied");
    }

    if (!usernamesMatch) {
      throw new Error("Invalid admin session");
    }

    payload.username = sessionUsername;

    return {
      public: false,
      username: sessionUsername,
      isAdmin: true
    };
  }

  if (API_TARGET_USERNAME_ACTIONS_[action] === true) {
    if (!payload.targetUsername && suppliedUsername && !usernamesMatch) {
      payload.targetUsername = suppliedUsername;
    }
  } else if (!usernamesMatch) {
    throw new Error("Session user does not match request user");
  }

  // Default-safe rule: on every authenticated non-admin route, `username`
  // always means the actor authenticated by the bearer session. A feature that
  // needs to display another user must use targetUsername/otherUsername.
  payload.username = sessionUsername;

  return {
    public: false,
    username: sessionUsername,
    isAdmin: false
  };
}
