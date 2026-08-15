/* ======================
   START APP
====================== */

document.addEventListener("DOMContentLoaded", async () => {

  const session =
     getSession();

  showLoader({
    percent: 6,
    detail: "Checking your session…",
    title: "Opening Awards App"
  });

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

    updateLoaderProgress(14, "Validating account access…");

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
  updateLoaderProgress(22, "Preparing navigation…");
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
   ROLE-AWARE LOADER CONTROL
====================== */

const APP_LOADER_STATE = {
  visible: false,
  percent: 0,
  detail: "",
  hideTimer: null
};

function isAdminPage_(page) {
  page = String(page || APP_STATE.currentPage || "");
  return page === "admin" ||
    page === "admin-games" ||
    page === "admin-awards" ||
    page === "admin-reality-tv" ||
    page.indexOf("admin-game-setup:") === 0;
}

function loaderUsesAdminDetails_() {
  return isAdminSession(getSession()) && isAdminPage_(APP_STATE.currentPage || window.location.hash.replace("#", ""));
}

function showLoader(options) {
  options = options || {};
  const loader = document.getElementById("loader");
  if (!loader) return;

  if (APP_LOADER_STATE.hideTimer) {
    clearTimeout(APP_LOADER_STATE.hideTimer);
    APP_LOADER_STATE.hideTimer = null;
  }

  APP_LOADER_STATE.visible = true;
  loader.classList.remove("hidden");
  loader.classList.toggle("is-admin", loaderUsesAdminDetails_());

  const title = document.getElementById("loaderTitle");
  if (title) title.textContent = options.title || (loaderUsesAdminDetails_() ? "Loading Admin Tools" : "Loading");

  updateLoaderProgress(
    options.percent === undefined ? Math.max(APP_LOADER_STATE.percent, 4) : options.percent,
    options.detail || APP_LOADER_STATE.detail || "Preparing page…"
  );
}

function updateLoaderProgress(percent, detail) {
  const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
  APP_LOADER_STATE.percent = normalized;
  if (detail !== undefined) APP_LOADER_STATE.detail = String(detail || "");

  const bar = document.getElementById("loaderBar");
  const percentNode = document.getElementById("loaderPercent");
  const detailNode = document.getElementById("loaderDetail");

  if (bar) bar.style.width = normalized + "%";
  if (percentNode) percentNode.textContent = Math.round(normalized) + "%";
  if (detailNode && detail !== undefined) detailNode.textContent = APP_LOADER_STATE.detail;
}

function setPageLoadStep(percent, adminDetail) {
  if (!APP_LOADER_STATE.visible) return;
  updateLoaderProgress(percent, adminDetail || APP_LOADER_STATE.detail);
}

let APP_PAGE_LOAD_PULSE_TIMER = null;

function startPageLoadPulse_() {
  stopPageLoadPulse_();
  APP_PAGE_LOAD_PULSE_TIMER = setInterval(function() {
    if (!APP_LOADER_STATE.visible) return stopPageLoadPulse_();
    const current = Number(APP_LOADER_STATE.percent || 0);
    if (current >= 90) return;
    const step = current < 60 ? 3 : current < 78 ? 2 : 1;
    updateLoaderProgress(Math.min(90, current + step), APP_LOADER_STATE.detail);
  }, 850);
}

function stopPageLoadPulse_() {
  if (!APP_PAGE_LOAD_PULSE_TIMER) return;
  clearInterval(APP_PAGE_LOAD_PULSE_TIMER);
  APP_PAGE_LOAD_PULSE_TIMER = null;
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;

  updateLoaderProgress(100, loaderUsesAdminDetails_() ? "Ready" : "");
  APP_LOADER_STATE.hideTimer = setTimeout(function() {
    loader.classList.add("hidden");
    loader.classList.remove("is-admin");
    APP_LOADER_STATE.visible = false;
    APP_LOADER_STATE.percent = 0;
    APP_LOADER_STATE.detail = "";
  }, 120);
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
   ROUTE-BASED PAGE MODULES
====================== */

const APP_ASSET_VERSION = "319-home-dashboard-progress-v1216";
const APP_ROUTE_HOTFIX_VERSION = "v12161-home-dashboard-progress";
const APP_LOADED_SCRIPTS = {};

const APP_MAIN_SCRIPT_URL = (function() {
  const current = document.currentScript && document.currentScript.src;
  return new URL(current || "./js/app.js", document.baseURI);
})();

const APP_PAGE_SCRIPT_BASE_URL = APP_MAIN_SCRIPT_URL.pathname.indexOf("/js/app.js") !== -1
  ? new URL("./pages/", APP_MAIN_SCRIPT_URL)
  : new URL("./js/pages/", APP_MAIN_SCRIPT_URL);

const APP_PAGE_MODULES = {
  "dashboard": ["dashboard"],
  "picks": ["picks"],
  "game-hub": ["gameModeHub"],
  "betting": ["betting"],
  "leaderboard": ["leaderboard"],
  "season-hub": ["seasonHub"],
  "leagues": ["leagues"],
  "admin": ["admin", "adminUi"],
  "admin-games": ["admin", "adminUi", "adminGames"],
  "admin-awards": ["admin", "adminUi", "adminAwards"],
  "admin-game-setup": ["admin", "adminUi", "adminGameSetup"],
  "admin-reality-tv": ["admin", "adminUi", "adminRealityTv"],
  "profile": ["profile"],
  "history": ["archiveHistory"]
};

function pageModuleKey_(page) {
  return String(page || "").indexOf("admin-game-setup:") === 0
    ? "admin-game-setup"
    : String(page || "");
}

function appPageScriptUrl_(name, retryToken) {
  const url = new URL(name + ".js", APP_PAGE_SCRIPT_BASE_URL);
  url.searchParams.set("v", APP_ASSET_VERSION);
  url.searchParams.set("hotfix", APP_ROUTE_HOTFIX_VERSION);
  if (retryToken) url.searchParams.set("retry", retryToken);
  return url.href;
}

function appendPageScript_(name, url) {
  return new Promise(function(resolve, reject) {
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    script.dataset.pageModule = name;
    script.addEventListener("load", function() {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", function() {
      script.remove();
      reject(new Error("Could not load the " + name + " page module from " + url));
    }, { once: true });
    document.head.appendChild(script);
  });
}

function loadPageScript_(name) {
  if (APP_LOADED_SCRIPTS[name]) return APP_LOADED_SCRIPTS[name];

  APP_LOADED_SCRIPTS[name] = (async function() {
    const existing = document.querySelector('script[data-page-module="' + name + '"][data-loaded="true"]');
    if (existing) return;

    const primaryUrl = appPageScriptUrl_(name, "");
    try {
      await appendPageScript_(name, primaryUrl);
      return;
    } catch (firstError) {
      console.warn("Page module first load failed; retrying without cache:", name, firstError);
    }

    const retryUrl = appPageScriptUrl_(name, String(Date.now()));
    try {
      await appendPageScript_(name, retryUrl);
    } catch (retryError) {
      delete APP_LOADED_SCRIPTS[name];
      throw new Error(
        "Could not load the " + name + " page module. " +
        "Confirm this file exists: " + new URL(name + ".js", APP_PAGE_SCRIPT_BASE_URL).pathname
      );
    }
  })();

  return APP_LOADED_SCRIPTS[name];
}

async function ensurePageModules_(page) {
  const names = APP_PAGE_MODULES[pageModuleKey_(page)] || [];
  if (!names.length) return;

  for (let index = 0; index < names.length; index += 1) {
    const percent = 18 + Math.round(((index + 1) / names.length) * 18);
    setPageLoadStep(percent, "Loading " + names[index].replace(/([A-Z])/g, " $1").trim() + " tools…");
    await loadPageScript_(names[index]);
  }
}

/* ======================
   NAVIGATION CORE
====================== */

async function navigate(page, options) {

  options = options || {};

  if (
    options.skipUnsavedCheck !== true &&
    typeof adminConfirmLeaveDirtyGameForms_ === "function" &&
    !adminConfirmLeaveDirtyGameForms_(page)
  ) {
    return;
  }

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

  APP_STATE.currentPage = page;
  const usePageLoader = options.suppressLoader !== true;
  if (usePageLoader) {
    showLoader({
      percent: 8,
      title: isAdminPage_(page) ? "Loading Admin Tools" : "Loading",
      detail: isAdminPage_(page) ? "Preparing " + page.replace(/[-:]/g, " ") + "…" : ""
    });
  }

  window.location.hash = page;

  try {

    await ensurePageModules_(page);
    setPageLoadStep(42, isAdminPage_(page) ? "Requesting page data…" : "");
    startPageLoadPulse_();
    await renderPage(page);
    stopPageLoadPulse_();
    if (isAdminPage_(page) && typeof adminUiEnhancePage === "function") {
      adminUiEnhancePage(app);
    }
    setPageLoadStep(94, isAdminPage_(page) ? "Finishing page layout…" : "");

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

    stopPageLoadPulse_();

    requestAnimationFrame(() => {

      app.classList.remove("page-enter");

      app.classList.add("page-enter-active");

      if (usePageLoader) hideLoader();

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
    page === "admin-awards" ||
    page === "admin-reality-tv" ||
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

  /*
    Mixed and legacy Combo games can contain both pick-style questions and
    wagers. Open one simple mode chooser instead of silently hiding part of
    the game on the Picks page.
  */
  if (
    gameType === "mixed" ||
    gameType === "hybrid" ||
    gameType === "combo"
  ) {

    await navigate("game-hub");
    return;

  }

  if (
    gameType === "prediction" ||
    gameType === "confidence" ||
    gameType === "head-to-head" ||
    gameType === "staked-prediction" ||
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

    case "game-hub":

      app.innerHTML =
        await renderGameModeHubPage();

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
      if (typeof adminUiEnhancePage === "function") {
        setTimeout(function() { adminUiEnhancePage(app); }, 0);
      }

      break;
 
    case "admin-games":

      app.innerHTML =
        await renderAdminGamesPanel();

      break; 

    case "admin-awards":

      if (typeof renderAdminAwardsPage !== "function") {
        throw new Error("Awards Manager script is not loaded.");
      }

      app.innerHTML =
        await renderAdminAwardsPage();

      break;
    case "admin-reality-tv":

      if (typeof renderAdminRealityTvPage !== "function") {
        throw new Error("Reality TV Season Manager script is not loaded.");
      }

      app.innerHTML =
        await renderAdminRealityTvPage();

      break;

    case "history":

      if (typeof renderArchiveHistoryPage !== "function") {
        throw new Error("Archive history page script is not loaded.");
      }

      app.innerHTML =
        await renderArchiveHistoryPage();

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
      APP_STATE.currentPage === "season-hub" ||
      APP_STATE.currentPage === "game-hub"
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
