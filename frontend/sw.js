// Reality cache compatibility markers: v1219rc16-reality-player-followup v1219rc16-reality-results-ready
const PATTC_SW_RELEASE_MARKER = "v1219rc20-postdeploy-first-entry-performance-r2"; // audit marker only; cache still derives from ?v=
// Previous cache: awards-app-v313-external-results-hub-end-to-end
// Legacy cache-lineage marker retained for historical regression contracts only.
// const AWARDS_CACHE = "awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts-v1218k-reality-cast-import-v1218n-reality-production-automation-v1218v4-reality-draft-switch-v1218j-team-fantasy-v1218j1-team-fantasy-create-v1218j2-team-fantasy-controls-route-assets-327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts-v1218k-reality-cast-import-v1218n-reality-production-automation-v1218v4-reality-draft-switch-v1218w-survivor-ranking-v1218w4-survivor-edge-cases-v1218x1b-performance-v1218x2-fast-nav-batch-picks-v1218x2c-confidence-appearance-v1218y-survivor-koth-strikes-v1218z-voting-competition-v1219rc3-final-performance-v1219rc6-admin-question-ux-performance-v1219rc7-pick-lock-integrity";
// The page registers this worker as sw.js?v=<PATTC_FRONTEND_RELEASE>.
// Derive the cache namespace from that canonical release boundary so a new
// frontend release necessarily gets a new worker URL and a new shell cache.
const AWARDS_RELEASE = (() => {
  try {
    return String(new URL(self.location.href).searchParams.get("v") || "legacy")
      .replace(/[^a-zA-Z0-9_.-]+/g, "-")
      .slice(0, 160);
  } catch (err) {
    return "legacy";
  }
})();
const AWARDS_CACHE = "awards-app-" + AWARDS_RELEASE;


const APP_SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./css/styles.css",
  "./css/components.css",
  "./css/pages.css",
  "./css/rc19-mobile-pwa.css",
  "./css/team-fantasy.css",
  "./css/picks.css",
  "./css/appearance.css",
  "./js/config.js",
  "./assets/images/image-manifest.js",
  "./js/imageEngine.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/state.js",
  "./js/appearanceThemeRuntime.js",
  "./js/app.js",
  "./js/pwa.js",
  "./js/pages/adminGames.js",
  "./js/pages/adminAppearance.js",
  "./js/pages/teamFantasy.js",
  "./js/pages/adminTeamFantasy.js",
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(AWARDS_CACHE)
      .then(cache => Promise.all(APP_SHELL.map(asset =>
        cache.add(asset).catch(err => {
          console.warn("PATTC Predicts shell cache warning:", asset, err);
          return null;
        })
      )))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.indexOf("awards-app-") === 0 && key !== AWARDS_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Do not touch Apps Script/API calls or any outside requests.
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(AWARDS_CACHE);

  try {
    const fresh = await fetch(request);

    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }

    return fresh;
  } catch (err) {
    let cached = await cache.match(request);

    if (!cached) {
      cached = await cache.match(request, { ignoreSearch: true });
    }

    if (cached) return cached;

    if (request.mode === "navigate") {
      const path = String(new URL(request.url).pathname || "").toLowerCase();
      if (path.endsWith("/app.html") || path.endsWith("app.html")) {
        return cache.match("./app.html");
      }
      return cache.match("./index.html");
    }

    throw err;
  }
}

// production hardening: v300

// Compatibility history retained for release-regression checks:
// awards-app-v264-question-mode-table-repair-v265-game-setup-visibility-v266-reality-tv-season-manager-v267-reality-tv-route-hotfix-v268-reality-tv-bulk-import-v269-reality-tv-multiline-import-v270-reality-tv-large-roster-fix-v271-reality-tv-staged-approval-v272-reality-tv-question-packs-v273-reality-tv-staged-question-build-v274-reality-tv-question-contrast-v275-season-survivor-pick-v280-reality-tv-show-formats-v281-reality-tv-question-points-v282-reality-tv-question-build-verification-v283-reality-tv-visual-roster-v284-reality-tv-weekly-stats
// Lazy assets cached on first route request (network-first):
// "./css/frontend-leaderboard-profile.css"
// "./js/pages/gameModeHub.js"
// "./js/pages/adminRealityTv.js"
// "./js/pages/archiveHistory.js"
// "./css/archive-history.css"

// v1.2.17d: Appearance Manager + Confidence Image/Theme integration.

// v1.2.17f: Appearance setup transport/reliability hotfix.

// v1.2.17g: iPhone/PWA startup recovery.

// v1.2.17h: Appearance image upload + pack display reliability.

// v1.2.17i: Confidence Image Pack runtime identity/cache compatibility hotfix.

// v1.2.17k: Appearance Studio Core visual theme controls.

// v1.2.18a: persistent per-device login sessions + refreshed auth screen.

// v1.2.18a1: repair Sign Up / Reset PIN auth-tab navigation.

// v1.2.18b: refreshed Home shell/cache for stats, league standings, and trophy-room foundation.

// v1.2.18d: reusable Scoreboard / Leaderboard Appearance system.

// v1.2.18e: player identity onboarding + notification center foundation.

/* ==============================
   v1.2.18f WEB PUSH DELIVERY
============================== */

self.addEventListener("push", event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    try {
      payload = { title: "PATTC Predicts", body: event.data ? event.data.text() : "" };
    } catch (innerErr) {
      payload = { title: "PATTC Predicts", body: "You have a new notification." };
    }
  }

  const title = String(payload.title || "PATTC Predicts");
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};
  const options = {
    body: String(payload.body || payload.message || ""),
    icon: payload.icon || "./icons/icon-192.png",
    badge: payload.badge || "./icons/icon-192.png",
    tag: payload.tag || "awards-app-notification",
    renotify: payload.renotify === true,
    requireInteraction: payload.requireInteraction === true,
    data: {
      url: data.url || "./app.html#notifications",
      route: data.route || "notifications",
      gameId: data.gameId || "",
      type: data.type || "custom"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function awardsPushNotificationTargetUrl_(data) {
  data = data && typeof data === "object" ? data : {};
  const route = String(data.route || "notifications").trim().toLowerCase();
  const gameId = String(data.gameId || "").trim();
  let target;
  try {
    target = new URL(data.url || "./app.html", self.registration.scope);
  } catch (err) {
    target = new URL("./app.html", self.registration.scope);
  }

  if (gameId) {
    target.searchParams.set("notificationGameId", gameId);
  }
  if (route && /^[a-z0-9:_-]+$/.test(route)) {
    target.hash = route;
  } else if (!target.hash) {
    target.hash = "notifications";
  }
  return target.href;
}

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const data = event.notification && event.notification.data
    ? event.notification.data
    : {};

  const targetUrl = awardsPushNotificationTargetUrl_(data);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          try {
            const clientUrl = new URL(client.url);
            const target = new URL(targetUrl);
            if (clientUrl.origin === target.origin && "focus" in client) {
              if ("navigate" in client) {
                return client.navigate(targetUrl).then(() => client.focus());
              }
              return client.focus();
            }
          } catch (err) {}
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});

// v1.2.18f: push event always produces a user-visible notification.
