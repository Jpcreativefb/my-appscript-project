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
   SESSION STORAGE
====================== */

function getSession() {

  try {

    return JSON.parse(
      localStorage.getItem("session")
    );

  } catch (e) {

    return null;

  }

}

function setSession(session) {

  APP_STATE.session =
    session || null;

  APP_STATE.user =
    session && session.username
      ? {
          username: session.username,
          displayName:
            session.displayName ||
            session.username
        }
      : null;

  if (session) {

    localStorage.setItem(
      "session",
      JSON.stringify(session)
    );

  }

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
   SESSION HELPERS
====================== */

function getCurrentSession() {

  return APP_STATE.session ||
    getSession();

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