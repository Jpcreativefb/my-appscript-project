/* ======================
   START APP
====================== */

document.addEventListener("DOMContentLoaded", async () => {

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

  if (
    session.token &&
    typeof apiValidateSession === "function"
  ) {

    const validation =
      await apiValidateSession(
        session.token
      );

    if (
      !validation ||
      !validation.success
    ) {

      const message =
        validation && validation.message
          ? String(validation.message)
          : "";

      if (
        message
          .toLowerCase()
          .indexOf("network") > -1
      ) {

        setSession(session);

      } else {

        clearSession();

        window.location.href =
          "./index.html";

        return;

      }

    } else {

      setSession({
        ...session,
        ...validation
      });

    }

  } else {

    setSession(session);

  }

  // 👤 HEADER USER
  const headerUser =
    document.getElementById(
      "headerUser"
    );

  if (headerUser) {

    headerUser.innerText =
      getCurrentUsername();

  }

  // Profile data is now loaded only when needed.
  // This keeps the first dashboard render from making an extra Apps Script call.

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
   GAME SWITCHER
====================== */

async function renderGameSwitcher() {

  const target =
    document.getElementById(
      "gameSwitcher"
    );

  if (!target) {
    return;
  }

  const res =
    await apiGetActiveGames();

  if (
    !res ||
    res.success === false ||
    !Array.isArray(res.games) ||
    !res.games.length
  ) {

    target.innerHTML = "";
    return;

  }

  APP_STATE.gameSwitcherGames = res.games.slice();

  const selectedGameId =
    getFrontendGameId() ||
    res.currentGameId ||
    res.defaultGameId ||
    (
      res.games[0] &&
      res.games[0].gameId
    );

  if (
    selectedGameId &&
    selectedGameId !== APP_STATE.gameId
  ) {

    setFrontendGameId(
      selectedGameId
    );

  }

  if (res.games.length <= 1) {

    const game =
      res.games[0];

    target.innerHTML = `
      <div class="game-switcher-single">
        <span class="game-switcher-label">
          Game
        </span>
        <strong>
          ${escapeHtmlForApp_(game.name || game.gameId)}
        </strong>
      </div>
    `;

    return;

  }

  target.innerHTML = `
    <label class="game-switcher">
      <span class="game-switcher-label">
        Game
      </span>

      <select
        id="gameSwitcherSelect"
        onchange="handleGameSwitch(this.value)"
      >
        ${res.games.map(game => `
          <option
            value="${escapeHtmlForApp_(game.gameId)}"
            ${game.gameId === selectedGameId ? "selected" : ""}
          >
            ${escapeHtmlForApp_(game.icon ? game.icon + " " : "")}${escapeHtmlForApp_(game.name || game.gameId)}
          </option>
        `).join("")}
      </select>
    </label>
  `;

}




/* ======================
   GAME CARD ACTIONS
====================== */

async function enterGame(
  gameId,
  gameType,
  leagueId,
  gameRole,
  hubMode
) {

  gameId =
    String(gameId || "")
      .trim();

  gameType =
    String(gameType || "")
      .trim()
      .toLowerCase();

  gameRole =
    String(gameRole || "")
      .trim()
      .toLowerCase();

  hubMode =
    String(hubMode || "")
      .trim()
      .toLowerCase();

  if (!gameId) {
    return;
  }

  setFrontendGameId(
    gameId
  );

  if (leagueId !== undefined) {
    setFrontendLeagueId(leagueId);
  }

  localStorage.setItem(
    "gameMode",
    gameType
  );

  localStorage.setItem(
    "leaderboardMode",
    (gameType === "wager" || gameType === "racing-wager")
      ? "wager"
      : "standard"
  );

  clearStartupPayload();

  if (gameRole === "parent") {
    localStorage.setItem("seasonHubMode", hubMode || "playable-aggregate");
    await navigate("season-hub");
    return;
  }

  if (
    gameType === "wager" ||
    gameType === "betting" ||
    gameType === "racing-wager"
  ) {

    await navigate("betting");
    return;

  }

  if (
    gameType === "prediction" ||
    gameType === "confidence" ||
    gameType === "head-to-head" ||
    gameType === "combo" ||
    gameType === "mixed" ||
    gameType === "survivor"
  ) {

    await navigate("picks");
    return;

  }

  if (gameType === "ranking") {

    await navigate("leaderboard");
    return;

  }

  await navigate("dashboard");

}

async function viewGameLeaderboard(
  gameId,
  gameType,
  leagueId
) {

  gameId =
    String(gameId || "")
      .trim();

  gameType =
    String(gameType || "")
      .trim()
      .toLowerCase();

  if (!gameId) {
    return;
  }

  setFrontendGameId(
    gameId
  );

  if (leagueId !== undefined) {
    setFrontendLeagueId(leagueId);
  }

  localStorage.setItem(
    "leaderboardMode",
    (gameType === "wager" || gameType === "racing-wager")
      ? "wager"
      : "standard"
  );

  clearStartupPayload();

  await navigate("leaderboard");

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

    case "betting":

      app.innerHTML =
        await renderBettingPage();
    
      break;   

    case "leaderboard":

      app.innerHTML =
        await renderLeaderboardPage();

      break;

    case "season-hub":

      app.innerHTML =
        await renderSeasonHubPage();

      break;

    case "leagues":

      app.innerHTML =
        await renderLeaguesPage();

      break;

    case "admin":

      app.innerHTML =
        await renderAdminPage();

      if (typeof adminEnhanceMainAdminSections === "function") {
        adminEnhanceMainAdminSections();
      }

      break;
 
    case "admin-games":

      app.innerHTML =
        await renderAdminGamesPanel();

      break; 

    case "profile":

      if (typeof renderProfilePage !== "function") {
        throw new Error("Profile page script is not loaded.");
      }

      app.innerHTML =
        await renderProfilePage();

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

async function handleGameSwitch(gameId) {

  gameId = String(gameId || "").trim();

  if (!gameId) {
    return;
  }

  const games =
    Array.isArray(APP_STATE.gameSwitcherGames)
      ? APP_STATE.gameSwitcherGames
      : [];

  const selectedGame =
    games.find(function(game) {
      return game && game.gameId === gameId;
    }) || null;

  setFrontendGameId(
    gameId
  );

  if (
    typeof loadActiveProfile === "function"
  ) {

    try {
      loadActiveProfile();
    } catch (err) {
      console.warn("Profile refresh after game switch failed", err);
    }

  }

  clearStartupPayload();

  if (
    selectedGame &&
    (
      selectedGame.gameRole === "parent" ||
      APP_STATE.currentPage === "season-hub"
    )
  ) {
    await enterGame(
      selectedGame.gameId,
      selectedGame.type,
      typeof getFrontendLeagueId === "function"
        ? getFrontendLeagueId()
        : "",
      selectedGame.gameRole || "standalone",
      selectedGame.hubMode || "playable-aggregate"
    );
    return;
  }

  await navigate(
    APP_STATE.currentPage || "dashboard"
  );

}

function escapeHtmlForApp_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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
    APP_STATE.gameId ||
    localStorage.getItem("gameId") ||
    session.gameId ||
    ""
  ).trim();

}

function setFrontendGameId(gameId) {

  gameId =
    String(gameId || "")
      .trim();

  if (!gameId) {
    return;
  }

  APP_STATE.gameId =
    gameId;

  localStorage.setItem(
    "gameId",
    gameId
  );

  localStorage.setItem(
    "activeGameId",
    gameId
  );

  const session =
    getSession();

  if (session) {

    session.gameId =
      gameId;

    setSession(
      session
    );

  }

}

/* =========================
   FRONTEND LEAGUE ID
========================= */

function getFrontendLeagueId() {

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
    APP_STATE.leagueId ||
    localStorage.getItem("leagueId") ||
    localStorage.getItem("activeLeagueId") ||
    session.leagueId ||
    ""
  ).trim();

}

function setFrontendLeagueId(leagueId) {

  leagueId =
    String(leagueId || "")
      .trim();

  APP_STATE.leagueId =
    leagueId;

  if (leagueId) {
    localStorage.setItem("leagueId", leagueId);
    localStorage.setItem("activeLeagueId", leagueId);
  } else {
    localStorage.removeItem("leagueId");
    localStorage.removeItem("activeLeagueId");
  }

  const session =
    getSession();

  if (session) {
    session.leagueId = leagueId;
    setSession(session);
  }

}
