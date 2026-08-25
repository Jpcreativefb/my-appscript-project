/* ======================
   START APP
====================== */

document.addEventListener("DOMContentLoaded", async () => {

  const session =
     getSession();

  showLoader({
    percent: 6,
    detail: "Checking your session…",
    title: "Opening PATTC Predicts"
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

    const recentlyValidated =
      Number(session.validatedAt || 0) > 0 &&
      Date.now() - Number(session.validatedAt || 0) < 5 * 60 * 1000;

    if (recentlyValidated) {
      setSession(session);
    } else {
      updateLoaderProgress(14, "Validating this device…");

      try {
        const validation = await apiValidateSession(session.token);

        if (!validation || !validation.success) {
          clearSession();
          window.location.replace("./index.html");
          return;
        }

        setSession({
          ...session,
          ...validation,
          validatedAt: Date.now()
        });
      } catch (err) {
        console.warn("Session validation temporarily unavailable", err);

        // Do not bounce a locally unexpired remembered device back to login
        // because Apps Script or the network had a transient startup error.
        if (isSessionValid(session)) {
          setSession(session);
        } else {
          clearSession();
          window.location.replace("./index.html");
          return;
        }
      }
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

  setTimeout(function() {
    refreshNotificationBadge_();
  }, 350);

  const hash =
    window.location.hash
      .replace("#", "");

  let onboardingProfile = false;
  try {
    onboardingProfile = localStorage.getItem("profileOnboardingGeneral") === "1";
  } catch (err) {}

  navigate(onboardingProfile ? "profile" : (hash || "dashboard"));

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

async function refreshNotificationBadge_() {

  const badge = document.getElementById("headerNotificationBadge");
  if (!badge || typeof apiGetUserNotifications !== "function") return;

  try {
    const res = await apiGetUserNotifications(25);
    const count = Number(res && res.unreadCount) || 0;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.toggle("hidden", count <= 0);
  } catch (err) {
    // Badge failure should never block app navigation.
  }
}

/* ======================
   LOGOUT
====================== */

async function logout() {

  const session = typeof getSession === "function" ? getSession() : null;

  try {
    if (session && session.token && typeof apiLogout === "function") {
      await apiLogout(session.token);
    }
  } catch (err) {
    console.warn("Logout revoke warning", err);
  } finally {
    clearSession();
    window.location.replace("./index.html");
  }

}


/* ======================
   ROUTE-BASED PAGE MODULES
====================== */

const APP_ASSET_VERSION = "327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts-v1218k-reality-cast-import-v1218n-reality-production-automation-v1218v4-reality-draft-switch-v1218w-survivor-ranking-v1218w4-survivor-edge-cases-v1218x1b-performance-v1218x2-fast-nav-batch-picks-v1218x2c-confidence-appearance-v1218y-survivor-koth-strikes-v1218z-voting-competition-v1219rc2-performance-certification";
const APP_ROUTE_HOTFIX_VERSION = "v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts-v1218n-reality-production-automation";
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
  "hub": ["dashboard"],
  "trophy-room": ["dashboard"],
  "more": ["dashboard"],
  "picks": ["picks"],
  "survivor": ["survivor"],
  "voting": ["voting"],
  "ranking": ["ranking"],
  "game-hub": ["gameModeHub"],
  "betting": ["betting"],
  "team-fantasy": ["teamFantasy"],
  "leaderboard": ["leaderboard"],
  "season-hub": ["seasonHub"],
  "leagues": ["leagues"],
  "admin": ["admin", "adminUi", "adminTeamFantasy"],
  "admin-games": ["admin", "adminUi", "adminGames"],
  "admin-awards": ["admin", "adminUi", "adminAwards"],
  "admin-game-setup": ["admin", "adminUi", "adminGameSetup"],
  "admin-reality-tv": ["admin", "adminUi", "adminRealityTv"],
  "admin-team-fantasy": ["admin", "adminUi", "adminTeamFantasy"],
  "admin-appearance": ["admin", "adminUi", "adminAppearance"],
  "profile": ["profile"],
  "notifications": ["notifications"],
  "history": ["archiveHistory"]
};

function pageModuleKey_(page) {
  const value = String(page || "");
  if (value.indexOf("admin-game-setup:") === 0) return "admin-game-setup";
  if (value.indexOf("hub:") === 0) return "hub";
  return value;
}

function appPageScriptUrl_(name, retryToken) {
  const url = new URL(name + ".js", APP_PAGE_SCRIPT_BASE_URL);
  url.searchParams.set("v", APP_ASSET_VERSION);
  url.searchParams.set("hotfix", APP_ROUTE_HOTFIX_VERSION);
  if (name === "notifications") url.searchParams.set("module", "v1218j-automatic-pick-reminders");
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
   FAST PAGE SNAPSHOTS
   v1.2.18x1b

   Public play pages are expensive because their server payloads aggregate
   several Sheets. Keep the most recently rendered DOM in memory so normal
   back-and-forth navigation paints immediately. Fresh snapshots are reused
   directly; older snapshots paint first and refresh quietly in the background.
====================== */

const APP_PAGE_SNAPSHOT_CACHE = {};
const APP_PAGE_SNAPSHOT_FRESH_MS = 45 * 1000;
const APP_PAGE_SNAPSHOT_MAX_MS = 10 * 60 * 1000;
const APP_PAGE_SNAPSHOT_STORAGE_PREFIX = "pattcPageSnapshot:";
const APP_PAGE_SNAPSHOT_STORAGE_MAX_CHARS = 700000;

function appPageSnapshotEligible_(page) {
  page = String(page || "");
  if (!page) return false;
  if (page.indexOf("admin") === 0) return false;
  return page === "dashboard" ||
    page.indexOf("hub:") === 0 ||
    page === "picks" ||
    page === "game-hub" ||
    page === "survivor" ||
    page === "voting" ||
    page === "ranking" ||
    page === "team-fantasy" ||
    page === "betting" ||
    page === "leaderboard" ||
    page === "season-hub" ||
    page === "trophy-room" ||
    page === "more";
}

function appPageSnapshotKey_(page) {
  const session = typeof getSession === "function" ? getSession() : null;
  const username = String(session && session.username || "").trim().toLowerCase();
  const pageName = String(page || "");

  // Home/hub pages are account views, not game views. Keying Home by the
  // currently selected game made a perfectly good snapshot miss after a game
  // switch and forced another Dashboard rebuild.
  if (
    pageName === "dashboard" ||
    pageName === "more" ||
    pageName === "trophy-room" ||
    pageName.indexOf("hub:") === 0
  ) {
    return [username, "account", pageName].join("|");
  }

  const gameId = typeof getFrontendGameId === "function" ? String(getFrontendGameId() || "").trim() : String(APP_STATE.gameId || "").trim();
  const leagueId = typeof getFrontendLeagueId === "function" ? String(getFrontendLeagueId() || "").trim() : "";
  const mode = String(localStorage.getItem("gameMode") || "").trim().toLowerCase();
  return [username, gameId, leagueId, mode, pageName].join("|");
}

function appPageSnapshotStorageKey_(key) {
  return APP_PAGE_SNAPSHOT_STORAGE_PREFIX + encodeURIComponent(String(key || ""));
}
function appCapturePageSnapshot_(page, app) {
  if (!app || !appPageSnapshotEligible_(page)) return;
  const html = String(app.innerHTML || "");
  if (!html || html.indexOf("Page failed to load") !== -1) return;
  const key = appPageSnapshotKey_(page);
  const item = { html: html, savedAt: Date.now() };
  APP_PAGE_SNAPSHOT_CACHE[key] = item;

  // sessionStorage survives hash/full-shell navigation in the same tab/PWA
  // session, so a browser repaint cannot destroy the fast return path.
  if (html.length <= APP_PAGE_SNAPSHOT_STORAGE_MAX_CHARS) {
    try {
      sessionStorage.setItem(appPageSnapshotStorageKey_(key), JSON.stringify(item));
    } catch (err) {}
    if (String(page || "") === "dashboard" || String(page || "").indexOf("hub:") === 0) {
      try { localStorage.setItem(appPageSnapshotStorageKey_(key), JSON.stringify(item)); } catch (err) {}
    }
  }
}
function appReadPageSnapshot_(page) {
  if (!appPageSnapshotEligible_(page)) return null;
  const key = appPageSnapshotKey_(page);
  let item = APP_PAGE_SNAPSHOT_CACHE[key] || null;

  if (!item) {
    try {
      const raw = sessionStorage.getItem(appPageSnapshotStorageKey_(key));
      if (raw) {
        item = JSON.parse(raw);
        if (item && item.html) APP_PAGE_SNAPSHOT_CACHE[key] = item;
      }
    } catch (err) {
      item = null;
    }
  }

  if (!item && (String(page || "") === "dashboard" || String(page || "").indexOf("hub:") === 0)) {
    try {
      const raw = localStorage.getItem(appPageSnapshotStorageKey_(key));
      if (raw) {
        item = JSON.parse(raw);
        if (item && item.html) APP_PAGE_SNAPSHOT_CACHE[key] = item;
      }
    } catch (err) { item = null; }
  }

  if (!item) return null;
  const age = Date.now() - Number(item.savedAt || 0);
  if (age > APP_PAGE_SNAPSHOT_MAX_MS) {
    delete APP_PAGE_SNAPSHOT_CACHE[key];
    try { sessionStorage.removeItem(appPageSnapshotStorageKey_(key)); } catch (err) {}
    return null;
  }
  return { key: key, html: item.html, age: age };
}
function invalidateAppPageSnapshots(gameId) {
  gameId = String(gameId || "").trim();
  Object.keys(APP_PAGE_SNAPSHOT_CACHE).forEach(function(key) {
    if (!gameId || key.indexOf("|" + gameId + "|") !== -1) {
      delete APP_PAGE_SNAPSHOT_CACHE[key];
    }
  });
}

function appRefreshSnapshotQuietly_(page, snapshotKey) {
  window.setTimeout(async function() {
    try {
      await ensurePageModules_(page);
      if (APP_STATE.currentPage !== page || appPageSnapshotKey_(page) !== snapshotKey) return;
      const app = document.getElementById("app");
      if (!app) return;
      await renderPage(page);
      if (APP_STATE.currentPage !== page || appPageSnapshotKey_(page) !== snapshotKey) return;
      appCapturePageSnapshot_(page, app);
      if (isAdminPage_(page) && typeof adminUiEnhancePage === "function") adminUiEnhancePage(app);
    } catch (err) {
      console.warn("Quiet page refresh skipped", page, err);
    }
  }, 0);
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

  const previousPage = APP_STATE.currentPage;
  if (previousPage && previousPage !== page) {
    appCapturePageSnapshot_(previousPage, app);
  }

  app.classList.add("page-enter");

  APP_STATE.currentPage = page;
  const snapshot = options.forceRefresh === true ? null : appReadPageSnapshot_(page);
  const usePageLoader = options.suppressLoader !== true;

  window.location.hash = page;

  if (snapshot) {
    app.innerHTML = snapshot.html;
    app.classList.remove("page-enter");
    app.classList.add("page-enter-active");
    setActiveNav(page);
    if (usePageLoader && APP_LOADER_STATE.visible) hideLoader();

    // Fresh snapshots return immediately. Stale-but-valid snapshots remain
    // visible while the page refreshes quietly, avoiding another full-screen loader.
    if (snapshot.age >= APP_PAGE_SNAPSHOT_FRESH_MS || options.refreshCached === true) {
      appRefreshSnapshotQuietly_(page, snapshot.key);
    }
    return;
  }

  if (usePageLoader) {
    showLoader({
      percent: 8,
      title: isAdminPage_(page) ? "Loading Admin Tools" : "Loading",
      detail: isAdminPage_(page) ? "Preparing " + page.replace(/[-:]/g, " ") + "…" : ""
    });
  }

  try {

    await ensurePageModules_(page);
    setPageLoadStep(42, isAdminPage_(page) ? "Requesting page data…" : "");
    startPageLoadPulse_();
    await renderPage(page);
    stopPageLoadPulse_();
    if (isAdminPage_(page) && typeof adminUiEnhancePage === "function") {
      adminUiEnhancePage(app);
    }
    appCapturePageSnapshot_(page, app);
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

  let navPage = page;

  if (page === "profile" || page === "notifications" || page === "leagues" || page === "trophy-room" || page === "more" ||
      page === "admin" || page === "admin-games" || page === "admin-awards" ||
      page === "admin-reality-tv" || page === "admin-appearance" ||
      page.indexOf("admin-game-setup:") === 0 || page === "hub:general") {
    navPage = "more";
  }

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
   GAME-SPECIFIC PROFILE PROMPT
====================== */

function gameProfilePromptCacheKey_(gameId) {
  let username = "";
  try {
    username = typeof getCurrentUsername === "function" ? getCurrentUsername() : "";
  } catch (err) {
    username = "";
  }
  return "gameProfilePrompt:" + String(username || "").trim().toLowerCase() + ":" + String(gameId || "").trim();
}

function gameProfileDashboardRow_(gameId) {
  const payload = typeof APP_STATE !== "undefined" ? APP_STATE.dashboardHomePayload : null;
  if (!payload) return null;
  const games = []
    .concat(Array.isArray(payload.activeGames) ? payload.activeGames : [])
    .concat(Array.isArray(payload.pastGames) ? payload.pastGames : []);
  return games.find(function(game) {
    return String(game && game.gameId || "").trim() === String(gameId || "").trim();
  }) || null;
}

function showGameProfileChoiceModal_(gameId, profile, profileMode, profileScopeLabel) {
  return new Promise(function(resolve) {
    const existing = document.getElementById("gameProfileChoiceModal");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    const name = String(profile && profile.displayName || "your regular profile").trim();
    profileMode = String(profileMode || "game").toLowerCase();
    const isSeasonProfile = profileMode === "season";
    const scopeLabel = String(profileScopeLabel || "").trim();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div id="gameProfileChoiceModal" class="game-profile-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="gameProfileChoiceTitle">
        <div class="game-profile-choice-card">
          <button type="button" class="game-profile-choice-close" data-choice="later" aria-label="Close">×</button>
          <div class="game-profile-choice-kicker">NEW GAME</div>
          <h2 id="gameProfileChoiceTitle">${isSeasonProfile ? "Use a profile for this league / season?" : "Use a different profile for this game?"}</h2>
          <p>You can keep <strong>${escapeHtmlForApp_(name)}</strong>, or ${isSeasonProfile ? "create/reuse one profile for " + escapeHtmlForApp_(scopeLabel || "this league / season") : "use a different display name/photo just for this game"}.</p>
          <div class="game-profile-choice-note">Scores, career stats and trophies still stay attached to your account username.</div>
          <div class="game-profile-choice-actions">
            <button type="button" class="button" data-choice="general">Use Regular Profile</button>
            <button type="button" class="button secondary" data-choice="custom">${isSeasonProfile ? "Customize League / Season Profile" : "Customize for This Game"}</button>
            <button type="button" class="game-profile-choice-later" data-choice="later">Not now</button>
          </div>
        </div>
      </div>
    `;

    const modal = wrapper.firstElementChild;
    document.body.appendChild(modal);
    document.body.classList.add("game-profile-choice-open");

    function finish(choice) {
      document.body.classList.remove("game-profile-choice-open");
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
      resolve(choice || "later");
    }

    modal.addEventListener("click", function(event) {
      if (event.target === modal) {
        finish("later");
        return;
      }
      const button = event.target.closest("[data-choice]");
      if (button) finish(button.getAttribute("data-choice"));
    });
  });
}

async function maybeOfferGameProfile_(gameId) {
  gameId = String(gameId || "").trim();
  if (!gameId || typeof apiGetEditableProfile !== "function") return "continue";

  const cacheKey = gameProfilePromptCacheKey_(gameId);
  try {
    if (localStorage.getItem(cacheKey) === "done") return "continue";
  } catch (err) {}

  // Do not retroactively interrupt games the player has already started.
  const dashboardGame = gameProfileDashboardRow_(gameId);
  if (dashboardGame && dashboardGame.hasStarted === true) {
    try { localStorage.setItem(cacheKey, "done"); } catch (err) {}
    return "continue";
  }

  let username = "";
  try {
    username = typeof getCurrentUsername === "function" ? getCurrentUsername() : "";
  } catch (err) {}
  if (!username) return "continue";

  let result = null;
  try {
    result = await apiGetEditableProfile(username, gameId);
  } catch (err) {
    return "continue";
  }

  if (!result || result.success === false) return "continue";

  if (String(result.profileMode || "game").toLowerCase() === "general") {
    try { localStorage.setItem(cacheKey, "done"); } catch (err) {}
    return "continue";
  }

  if (result.gameProfilePromptCompleted === true) {
    try { localStorage.setItem(cacheKey, "done"); } catch (err) {}
    return "continue";
  }

  const choice = await showGameProfileChoiceModal_(
    gameId,
    result.profile || result.generalProfile || {},
    result.profileMode || "game",
    result.profileScopeLabel || ""
  );
  if (choice === "later") return "continue";

  if (choice === "custom") {
    // Do not mark the prompt complete until the player actually saves the
    // custom profile. If they leave Profile without saving, offer it again
    // the next time they enter this new game.
    try { localStorage.setItem("profileOpenGameSpecific", gameId); } catch (err) {}
    return "custom";
  }

  try {
    if (typeof apiSetGameProfilePromptChoice === "function") {
      const saved = await apiSetGameProfilePromptChoice(gameId, "general");
      if (!saved || saved.success === false) return "continue";
    }
    localStorage.setItem(cacheKey, "done");
  } catch (err) {
    return "continue";
  }

  return "continue";
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

  const profileChoice = await maybeOfferGameProfile_(gameId);
  if (profileChoice === "custom") {
    try {
      localStorage.setItem(
        "profileEditContext",
        JSON.stringify({
          gameId: gameId,
          gameType: gameType,
          leagueId: leagueId === undefined ? "" : leagueId,
          gameRole: gameRole,
          hubMode: hubMode
        })
      );
    } catch (err) {}
    await navigate("profile");
    return;
  }

  if (gameRole === "parent") {
    localStorage.setItem("seasonHubMode", hubMode || "playable-aggregate");
    await navigate("season-hub");
    return;
  }

  /* TEAM FANTASY v1.2.18j GAME ROUTE */
  if (gameType === "team-fantasy") {
    await navigate("team-fantasy");
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
    gameType === "staked-prediction"
  ) {

    await navigate("picks");
    return;

  }

  if (gameType === "survivor") {
    await navigate("survivor");
    return;
  }

  if (gameType === "voting") {
    await navigate("voting");
    return;
  }

  if (gameType === "ranking") {
    await navigate("ranking");
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

  if (page.indexOf("hub:") === 0) {
    const hubCategory = String(page.split(":")[1] || "general").toLowerCase();
    app.innerHTML = await renderDashboardHubPage_(hubCategory);

    if (typeof dashboardHydrateGameStandings_ === "function") {
      window.setTimeout(function() {
        const payload = typeof APP_STATE !== "undefined" ? APP_STATE.dashboardHomePayload : null;
        const active = payload && Array.isArray(payload.activeGames) ? payload.activeGames : [];
        const hubGames = active.filter(function(game) {
          return String(game && (game.hubCategory || "general") || "general").toLowerCase() === hubCategory;
        });
        dashboardHydrateGameStandings_(
          typeof dashboardGetPlayingGames_ === "function" ? dashboardGetPlayingGames_(hubGames) : hubGames,
          "hub:" + hubCategory
        ).catch(function(err) {
          console.warn("Hub standings could not be loaded", err);
        });
      }, 0);
    }
    return;
  }

  switch (page) {

    case "dashboard":

      app.innerHTML =
        await renderDashboardPage();

      if (typeof hydrateDashboardHomeExtras_ === "function") {
        // Home itself is intentionally fast. Give the player time to enter a
        // game before starting optional career/league/standings calls; those
        // requests otherwise keep Apps Script busy while the game is opening.
        window.setTimeout(function() {
          if (typeof APP_STATE !== "undefined" && APP_STATE.currentPage !== "dashboard") return;
          hydrateDashboardHomeExtras_().catch(function(err) {
            console.warn("Dashboard extras could not be loaded", err);
          });
        }, 1800);
      }

      break;

    case "trophy-room":
      app.innerHTML = await renderDashboardTrophyRoomPage_();
      break;

    case "more":
      app.innerHTML = await renderDashboardMorePage_();
      break;

    case "picks":

      app.innerHTML =
        await renderPicksPage();

      break;

    case "survivor":
      if (typeof renderSurvivorPage !== "function") throw new Error("Survivor page script is not loaded.");
      app.innerHTML = await renderSurvivorPage();
      break;

    case "voting":
      if (typeof renderVotingPage !== "function") throw new Error("Voting page script is not loaded.");
      app.innerHTML = await renderVotingPage();
      break;

    case "ranking":
      if (typeof renderRankingPage !== "function") throw new Error("Ranking page script is not loaded.");
      app.innerHTML = await renderRankingPage();
      break;

    case "game-hub":

      app.innerHTML =
        await renderGameModeHubPage();

      break;

    case "team-fantasy":
      if (typeof renderTeamFantasyPage !== "function") throw new Error("Team Fantasy page script is not loaded.");
      app.innerHTML = await renderTeamFantasyPage();
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
      /* TEAM FANTASY v1.2.18j ADMIN LAUNCHER */
      if (typeof teamFantasyEnhanceAdminLanding_ === "function") {
        setTimeout(function() { teamFantasyEnhanceAdminLanding_(); }, 0);
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
    case "admin-team-fantasy":
      if (typeof renderAdminTeamFantasyPage !== "function") throw new Error("Team Fantasy admin script is not loaded.");
      app.innerHTML = await renderAdminTeamFantasyPage();
      break;

    case "admin-reality-tv":

      if (typeof renderAdminRealityTvPage !== "function") {
        throw new Error("Reality TV Season Manager script is not loaded.");
      }

      app.innerHTML =
        await renderAdminRealityTvPage();

      break;

    case "admin-appearance":

      if (typeof renderAdminAppearancePage !== "function") {
        throw new Error("Appearance Manager script is not loaded.");
      }

      app.innerHTML =
        await renderAdminAppearancePage();

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

    case "notifications":

      if (typeof renderNotificationsPage !== "function") {
        throw new Error("Notification Center script is not loaded.");
      }

      app.innerHTML =
        await renderNotificationsPage();

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
