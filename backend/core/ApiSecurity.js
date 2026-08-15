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

function apiSecurityNormalizeUsername_(value) {
  return String(value || "").trim().toLowerCase();
}

function apiSecurityRequireSession_(payload) {
  payload = payload || {};

  const token = String(payload.token || "").trim();
  if (!token) {
    throw new Error("Authentication required");
  }

  // Deliberately validate against the Users sheet instead of trusting
  // CacheService as an authentication authority. This makes deactivation,
  // PIN resets and token replacement take effect immediately.
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
