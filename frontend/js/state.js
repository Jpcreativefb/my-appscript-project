/* ======================
   APP STATE
====================== */

const APP_STATE = {

  session: null,

  user: null,

  picks: {},

  currentPage: "dashboard",

  gameId: "",

  startupPayload: null,

  profile: null,

  profileData: null,

  profileGames: []

};

/* ======================
   SESSION CONFIG
====================== */

function getSessionTtlMs() {

  const hours =
    typeof CONFIG !== "undefined"
      ? Number(
          CONFIG.SESSION_TTL_HOURS
        ) || 2160
      : 2160;

  return (
    hours *
    60 *
    60 *
    1000
  );

}

/* ======================
   SESSION STORAGE
====================== */

function readSessionStorageValue_(storage) {
  try {
    return storage ? storage.getItem("session") : null;
  } catch (err) {
    return null;
  }
}

function getSession() {

  try {

    // Remembered sessions live in localStorage. Session-only logins live in
    // sessionStorage so the checkbox finally controls persistence.
    const localRaw = readSessionStorageValue_(window.localStorage);
    const tabRaw = readSessionStorageValue_(window.sessionStorage);
    const raw = localRaw || tabRaw;

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);

    if (!session || !session.username) {
      clearSession();
      return null;
    }

    if (!session.createdAt) {
      session.createdAt = Date.now();
      const storage = session.rememberMe === false ? window.sessionStorage : window.localStorage;
      storage.setItem("session", JSON.stringify(session));
    }

    if (!isSessionValid(session)) {
      clearSession();
      return null;
    }

    return session;

  } catch (e) {
    clearSession();
    return null;
  }
}

function setSession(session) {

  if (!session || !session.username) {
    clearSession();
    return null;
  }

  const normalizedSession = {
    ...session,
    rememberMe: session.rememberMe !== false,
    createdAt: session.createdAt || Date.now(),
    validatedAt: session.validatedAt || 0,
    expiresAt:
      session.expiresAt ||
      session.sessionExpiresAt ||
      session.SessionExpiresAt ||
      ""
  };

  APP_STATE.session = normalizedSession;
  APP_STATE.user = {
    username: normalizedSession.username,
    displayName:
      normalizedSession.displayName ||
      normalizedSession.DisplayName ||
      normalizedSession.realName ||
      normalizedSession.RealName ||
      normalizedSession.username,
    isAdmin:
      normalizedSession.isAdmin !== undefined
        ? normalizedSession.isAdmin
        : normalizedSession.IsAdmin
  };

  if (normalizedSession.gameId && !APP_STATE.gameId) {
    APP_STATE.gameId = normalizedSession.gameId;
  }

  try {
    window.localStorage.removeItem("session");
    window.sessionStorage.removeItem("session");
    const storage = normalizedSession.rememberMe === false
      ? window.sessionStorage
      : window.localStorage;
    storage.setItem("session", JSON.stringify(normalizedSession));
  } catch (err) {
    // Storage restrictions should not crash a successful login.
  }

  return normalizedSession;
}

function clearSession() {

  if (typeof APP_STATE !== "undefined") {
    APP_STATE.session = null;
    APP_STATE.user = null;
    APP_STATE.picks = {};
    APP_STATE.startupPayload = null;
    APP_STATE.profile = null;
    APP_STATE.profileData = null;
  }

  try { window.localStorage.removeItem("session"); } catch (err) {}
  try { window.sessionStorage.removeItem("session"); } catch (err) {}
}

/* ======================
   SESSION VALIDATION
====================== */

function isSessionValid(session) {

  if (
    !session ||
    !session.username
  ) {

    return false;

  }

  const expiresAt =
    session.expiresAt ||
    session.sessionExpiresAt ||
    session.SessionExpiresAt;

  if (expiresAt) {

    const expiresMs =
      new Date(expiresAt)
        .getTime();

    if (
      expiresMs &&
      Date.now() > expiresMs
    ) {
      return false;
    }

  }

  const createdAt =
    Number(session.createdAt);

  if (!createdAt) {

    return false;

  }

  const age =
    Date.now() - createdAt;

  return age <= getSessionTtlMs();

}

function isSessionExpired(session) {

  return Boolean(
    session &&
    session.createdAt &&
    !isSessionValid(session)
  );

}

/* ======================
   SESSION HELPERS
====================== */

function getCurrentSession() {

  if (
    APP_STATE.session &&
    isSessionValid(
      APP_STATE.session
    )
  ) {

    return APP_STATE.session;

  }

  const session =
    getSession();

  if (session) {

    setSession(session);

  }

  return session;

}

function getCurrentUsername() {

  const session =
    getCurrentSession();

  return session && session.username
    ? session.username
    : "";

}

function isLoggedIn() {

  return Boolean(
    getCurrentUsername()
  );

}

function isCurrentUserAdmin() {

  const session =
    getCurrentSession() || {};

  const value =
    session.isAdmin !== undefined
      ? session.isAdmin
      : session.IsAdmin;

  return (
    value === true ||
    value === 1 ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "")
      .trim()
      .toLowerCase() === "admin" ||
    String(value || "")
      .trim() === "1"
  );

}

/* ======================
   GAME STATE HELPERS
====================== */

function setActiveGameId(gameId) {

  const cleanGameId =
    String(gameId || "")
      .trim();

  APP_STATE.gameId =
    cleanGameId;

  if (cleanGameId) {

    localStorage.setItem(
      "gameId",
      cleanGameId
    );

    localStorage.setItem(
      "activeGameId",
      cleanGameId
    );

  }

  const session =
    getCurrentSession();

  if (session) {

    session.gameId =
      cleanGameId;

    localStorage.setItem(
      "session",
      JSON.stringify(session)
    );

    APP_STATE.session =
      session;

  }

  return cleanGameId;

}

function getStoredGameId() {

  const session =
    getCurrentSession();

  return String(
    APP_STATE.gameId ||
    localStorage.getItem("activeGameId") ||
    localStorage.getItem("gameId") ||
    (
      session && session.gameId
        ? session.gameId
        : ""
    ) ||
    ""
  ).trim();

}
