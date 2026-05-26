/* ======================
   APP STATE
====================== */

const APP_STATE = {

  session: null,

  user: null,

  picks: {},

  currentPage: "dashboard"

};

/* ======================
   SESSION CONFIG
====================== */

function getSessionTtlMs() {

  const hours =
    Number(
      CONFIG.SESSION_TTL_HOURS
    ) || 168;

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

function getSession() {

  try {

    const raw =
      localStorage.getItem(
        "session"
      );

    if (!raw) {
      return null;
    }

    const session =
      JSON.parse(raw);

    if (
      !session ||
      !session.username
    ) {

      clearSession();

      return null;

    }

    /*
      Upgrade older stored sessions that
      existed before createdAt was added.
    */
    if (!session.createdAt) {

      session.createdAt =
        Date.now();

      localStorage.setItem(
        "session",
        JSON.stringify(session)
      );

    }

    if (
      !isSessionValid(session)
    ) {

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

  if (
    !session ||
    !session.username
  ) {

    clearSession();

    return null;

  }

  const normalizedSession = {
    ...session,

    createdAt:
      session.createdAt ||
      Date.now()
  };

  APP_STATE.session =
    normalizedSession;

  APP_STATE.user = {
    username:
      normalizedSession.username,

    displayName:
      normalizedSession.displayName ||
      normalizedSession.username
  };

  localStorage.setItem(
    "session",
    JSON.stringify(
      normalizedSession
    )
  );

  return normalizedSession;

}

function clearSession() {

  APP_STATE.session = null;
  APP_STATE.user = null;
  APP_STATE.picks = {};

  localStorage.removeItem(
    "session"
  );

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