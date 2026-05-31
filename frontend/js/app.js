/* ======================
   START APP
====================== */

document.addEventListener("DOMContentLoaded", () => {

  const session =
     getSession();

  // 🔒 AUTH GUARD
   if (
     !session ||
     !session.username ||
     !isSessionValid(session)
    ) {

     clearSession();

     window.location.href =
        "./index.html";

     return;

  }

  setSession(session);

  // 👤 HEADER USER
  const headerUser =
    document.getElementById(
      "headerUser"
    );

  if (headerUser) {

    headerUser.innerText =
      getCurrentUsername();

  }

  // 🚀 INIT APP
  initApp();

});


/* ======================
   INIT APP
====================== */

function initApp(session) {

  console.log("🚀 App initialized");

  const activeSession =
    session ||
    getSession();

  console.log(
    "INIT SESSION:",
    activeSession
  );

  hideLoader();

  bindGlobalEvents();

  setupAdminNav(activeSession);

  setTimeout(function() {
    setupAdminNav(getSession());
  }, 250);

  const hash =
    window.location.hash
      .replace("#", "");

  navigate(hash || "dashboard");

}

/* ======================
   ADMIN SESSION CHECK
====================== */

function isAdminSession(session) {

  if (!session) {
    return false;
  }

  const value =
    session.isAdmin !== undefined
      ? session.isAdmin
      : session.user && session.user.isAdmin !== undefined
        ? session.user.isAdmin
        : false;

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
      .toLowerCase() === "admin"
  );

}

/* ======================
   ADMIN NAV
====================== */

function setupAdminNav(session) {

  const adminButton =
    document.getElementById("adminNavButton");

  if (!adminButton) {
    console.warn("Admin nav button missing");
    return;
  }

  const activeSession =
    session ||
    getSession();

  const isAdmin =
    isAdminSession(activeSession);

  console.log(
    "ADMIN NAV CHECK:",
    isAdmin,
    activeSession
  );

  adminButton.style.display =
    isAdmin
      ? ""
      : "none";

}

/* ======================
   LOADER CONTROL
====================== */

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.remove("hidden");
  }
}

/* ======================
   STARTUP PAYLOAD CACHE
====================== */

async function loadStartupPayload(forceRefresh) {

  if (
    APP_STATE.startupPayload &&
    forceRefresh !== true
  ) {
    return APP_STATE.startupPayload;
  }

  const res =
    await apiGetStartupPayload();

  if (!res.success) {
    throw new Error(
      res.error ||
      res.message ||
      "Failed to load startup payload"
    );
  }

  APP_STATE.startupPayload =
    res;

  APP_STATE.gameId =
    res.gameId ||
    APP_STATE.gameId;

  return res;

}

function getStartupPayload() {

  return APP_STATE.startupPayload || null;

}

function clearStartupPayload() {

  APP_STATE.startupPayload =
    null;

}

/* ======================
   LOGOUT
====================== */

function logout() {

  clearSession();

  window.location.href =
    "./index.html";

}


/* ======================
   NAVIGATION CORE
====================== */

async function navigate(page) {

  if (!page) {
    page = "dashboard";
  }

  const app =
    document.getElementById("app");

  if (!app) {
    console.error("App container missing");
    return;
  }

  app.classList.add("page-enter");

  showLoader();

  window.location.hash = page;

  try {

    await renderPage(page);

  } catch (err) {

    console.error(
      "PAGE RENDER ERROR",
      page,
      err
    );

    app.innerHTML = `
      <div class="page">
        <div class="card error-card">
          Page failed to load.
          <br>
          ${err.message || err}
        </div>
      </div>
    `;

  } finally {

    requestAnimationFrame(() => {

      app.classList.remove("page-enter");

      app.classList.add("page-enter-active");

      hideLoader();

      setActiveNav(page);

    });

  }

}

/* ======================
   ACTIVE NAV
====================== */

function setActiveNav(page) {

  const navPage =
    page === "admin-games" ||
    page.indexOf("admin-game-setup:") === 0
      ? "admin"
      : page;

  document
    .querySelectorAll(".bottom-nav button")
    .forEach(btn => {

      btn.classList.remove("active");

      if (
        btn.dataset.page === navPage
      ) {
        btn.classList.add("active");
      }

    });

}


/* ======================
   PAGE ROUTER
====================== */

async function renderPage(page) {

  const app =
    document.getElementById("app");

  if (!app) {
    throw new Error("App container missing");
  }

  APP_STATE.currentPage =
    page;

  if (
    page.indexOf("admin-game-setup:") === 0
  ) {

    const gameId =
      page.split(":")[1];

    app.innerHTML =
      await renderAdminGameSetupPage(
        gameId
      );

    return;

  }

  switch (page) {

    case "dashboard":

      app.innerHTML =
        await renderDashboardPage();

      break;

    case "picks":

      app.innerHTML =
        await renderPicksPage();

      break;

    case "leaderboard":

      app.innerHTML =
        await renderLeaderboardPage();

      break;

    case "admin":

      app.innerHTML =
        await renderAdminPage();

      break;
 
    case "admin-games":

      app.innerHTML =
        await renderAdminGamesPage();

      break; 

    default:

      app.innerHTML =
        `
          <div class="page">
            <div class="card">
              Page Not Found
            </div>
          </div>
        `;

  }

}


/* ======================
   SAMPLE PAGES (TEMP PLACEHOLDERS)
====================== */

function renderDashboard() {
  return `
    <h1>Dashboard</h1>
    <p>Welcome to the app</p>
  `;
}

function renderPicks() {
  return `
    <h1>Picks</h1>
    <p>Picks page loaded</p>
  `;
}


/* ======================
   GLOBAL EVENT BINDING
====================== */

function bindGlobalEvents() {

  debugLog("🔗 Binding navigation");

  // Example: safe nav binding if needed later
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      debugLog("Button clicked:", btn.innerText);
    });
  });

}

/* =========================
   FRONTEND GAME ID
========================= */

function getFrontendGameId() {

  let session = {};

  try {

    session =
      getSession
        ? getSession()
        : JSON.parse(
            localStorage.getItem("session") || "{}"
          );

  } catch (err) {

    session = {};

  }

  return String(
    session.gameId ||
    localStorage.getItem("gameId") ||
    ""
  ).trim();

}