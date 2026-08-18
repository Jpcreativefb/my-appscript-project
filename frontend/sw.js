// Previous cache: awards-app-v313-external-results-hub-end-to-end
const AWARDS_CACHE = "awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217b-confidence-live-v1217f-appearance-setup";

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
  "./css/picks.css",
  "./css/appearance.css",
  "./js/config.js",
  "./assets/images/image-manifest.js",
  "./js/imageEngine.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/state.js",
  "./js/app.js",
  "./js/pwa.js",
  "./js/pages/adminGames.js",
  "./js/pages/adminAppearance.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(AWARDS_CACHE)
      .then(cache => Promise.all(APP_SHELL.map(asset =>
        cache.add(asset).catch(err => {
          console.warn("Awards App shell cache warning:", asset, err);
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
