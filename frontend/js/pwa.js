(function registerAwardsPwa() {
  if (!("serviceWorker" in navigator)) return;

  const PWA_VERSION = "v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217v-studio-control-fixes-v1217w-pack-management-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts-v1218x2c-confidence-appearance-v1219rc4-cache-persistence";
  const SW_URL = "./sw.js?v=" + encodeURIComponent(PWA_VERSION);
  const host = String(window.location.hostname || "").toLowerCase();
  const isLocalDevelopment = host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";

  function clearAwardsCaches_(keepName) {
    if (!window.caches || typeof window.caches.keys !== "function") {
      return Promise.resolve();
    }

    return window.caches.keys().then(function(keys) {
      return Promise.all(keys
        .filter(function(key) {
          return key.indexOf("awards-app-") === 0 && key !== keepName;
        })
        .map(function(key) {
          return window.caches.delete(key);
        }));
    });
  }

  // A service worker should never control VS Code Live Server.
  if (isLocalDevelopment) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.getRegistrations()
        .then(function(registrations) {
          return Promise.all(registrations.map(function(registration) {
            return registration.unregister();
          }));
        })
        .catch(function(err) {
          console.warn("Local service-worker cleanup warning", err);
        });

      clearAwardsCaches_("")
        .catch(function(err) {
          console.warn("Local cache cleanup warning", err);
        });
    });
    return;
  }

  window.addEventListener("load", function() {
    let didControllerReload = false;

    navigator.serviceWorker.addEventListener("controllerchange", function() {
      if (didControllerReload) return;

      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem("awardsPwaReload:" + PWA_VERSION) === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem("awardsPwaReload:" + PWA_VERSION, "1");
        }
      } catch (err) {
        alreadyReloaded = false;
      }

      if (alreadyReloaded) return;
      didControllerReload = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(SW_URL)
      .then(function(registration) {
        console.log("PATTC Predicts PWA ready", PWA_VERSION);

        // Force an update check now instead of waiting for Safari's normal
        // service-worker refresh interval. This is especially important for
        // iPhone home-screen installs after a production asset change.
        if (registration && typeof registration.update === "function") {
          registration.update().catch(function(err) {
            console.warn("PATTC Predicts PWA update check warning", err);
          });
        }

        try {
          localStorage.setItem("awardsPwaVersion", PWA_VERSION);
        } catch (err) {
          // Private browsing/storage restrictions should never block startup.
        }
      })
      .catch(function(err) {
        console.warn("PATTC Predicts PWA registration failed", err);
      });
  });
})();

// v1.2.18a1: repair Sign Up / Reset PIN auth-tab navigation.

// v1.2.18b: home hub with career stats, featured game, league standings, and trophy-room foundation.

// v1.2.18d: reusable Scoreboard / Leaderboard Appearance system.

// v1.2.18e: player identity onboarding + notification center foundation.

/* ==============================
   v1.2.18f WEB PUSH DEVICE SETUP
============================== */

function awardsPushSupported_() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function awardsPushBase64UrlToUint8Array_(base64String) {
  const padding = "=".repeat((4 - (String(base64String || "").length % 4)) % 4);
  const base64 = (String(base64String || "") + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function awardsPushArrayBufferToBase64Url_(value) {
  if (!value) return "";
  try {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  } catch (err) {
    return "";
  }
}

function awardsPushSubscriptionServerKey_(subscription) {
  try {
    return awardsPushArrayBufferToBase64Url_(
      subscription && subscription.options
        ? subscription.options.applicationServerKey
        : null
    );
  } catch (err) {
    return "";
  }
}

function awardsPushKeyMatches_(subscription, publicKey) {
  const existing = awardsPushSubscriptionServerKey_(subscription);
  if (!existing) return null;
  return existing === String(publicKey || "").trim();
}

async function awardsPushGetPublicKey_() {
  const response = await fetch("./api/push-public-key", {
    method: "GET",
    cache: "no-store",
    headers: { "Accept": "application/json" }
  });
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }
  if (!response.ok || !data || !data.publicKey) {
    throw new Error(
      data && (data.message || data.error)
        ? data.message || data.error
        : "Cloudflare push is not configured yet."
    );
  }
  return String(data.publicKey || "").trim();
}

function awardsPushDeviceId_() {
  return typeof apiGetOrCreateDeviceId_ === "function"
    ? apiGetOrCreateDeviceId_()
    : "push-device";
}

function awardsPushDeviceLabel_() {
  return typeof apiGetDeviceLabel_ === "function"
    ? apiGetDeviceLabel_()
    : "PATTC Predicts device";
}

async function awardsPushBackendDeviceStatus_(deviceId, endpoint) {
  if (typeof apiGetPushSubscriptionSummary !== "function") {
    return { checked: false, registered: false, activeDevices: 0 };
  }

  try {
    const summary = await apiGetPushSubscriptionSummary(
      deviceId || awardsPushDeviceId_(),
      endpoint || ""
    );
    if (!summary || summary.success === false) {
      return {
        checked: false,
        registered: false,
        activeDevices: 0,
        error: summary && (summary.message || summary.error) ? summary.message || summary.error : ""
      };
    }
    return {
      checked: true,
      registered: summary.thisDeviceActive === true,
      activeDevices: Number(summary.activeDevices || 0)
    };
  } catch (err) {
    return {
      checked: false,
      registered: false,
      activeDevices: 0,
      error: err && err.message ? err.message : String(err || "")
    };
  }
}

async function awardsPushGetDeviceStatus_() {
  if (!awardsPushSupported_()) {
    return {
      supported: false,
      permission: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
      subscribed: false,
      registered: false,
      label: "Push is not available in this browser. On iPhone, open the installed Home Screen app."
    };
  }

  let subscription = null;
  try {
    const registration = await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.getSubscription();
  } catch (err) {
    subscription = null;
  }

  const permission = Notification.permission;
  let keyMatches = null;
  if (subscription) {
    try {
      const canonicalPublicKey = await awardsPushGetPublicKey_();
      keyMatches = awardsPushKeyMatches_(subscription, canonicalPublicKey);
    } catch (err) {
      keyMatches = null;
    }
  }

  const backend = subscription
    ? await awardsPushBackendDeviceStatus_(
        awardsPushDeviceId_(),
        String(subscription.endpoint || "")
      )
    : { checked: true, registered: false, activeDevices: 0 };

  const registrationUsable = backend.registered === true && keyMatches !== false;
  let label = "Not enabled on this device";
  if (permission === "denied") {
    label = "Blocked in this device's notification settings";
  } else if (permission === "granted" && subscription && keyMatches === false) {
    label = "Push security key changed — repair this device";
  } else if (permission === "granted" && subscription && registrationUsable) {
    label = "Push enabled and registered on this device ✓";
  } else if (permission === "granted" && subscription) {
    label = backend.checked
      ? "Browser subscribed — repair PATTC Predicts registration"
      : "Browser subscribed — PATTC Predicts registration could not be verified";
  } else if (permission === "granted") {
    label = "Permission granted — finish device setup";
  }

  return {
    supported: true,
    permission: permission,
    subscribed: !!subscription,
    registered: registrationUsable,
    vapidKeyMatches: keyMatches,
    backendChecked: backend.checked === true,
    activeDevices: Number(backend.activeDevices || 0),
    endpoint: subscription ? String(subscription.endpoint || "") : "",
    label: label
  };
}

async function awardsPushVerifyBackendRegistration_(deviceId, endpoint) {
  const waits = [0, 250, 700];
  let last = null;

  for (let i = 0; i < waits.length; i++) {
    if (waits[i] > 0) {
      await new Promise(function(resolve) { setTimeout(resolve, waits[i]); });
    }
    last = await awardsPushBackendDeviceStatus_(deviceId, endpoint || "");
    if (last && last.registered === true) return last;
  }

  return last || { checked: false, registered: false, activeDevices: 0 };
}

async function awardsPushEnableOnThisDevice_() {
  if (!awardsPushSupported_()) {
    throw new Error("Push is not available here. On iPhone, install/open the PATTC Predicts from the Home Screen first.");
  }

  // Permission must be requested directly from the user's button tap.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked on this device. Enable them in device/browser settings."
        : "Notification permission was not granted."
    );
  }

  const publicKey = await awardsPushGetPublicKey_();
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const deviceId = awardsPushDeviceId_();

  // If Cloudflare's canonical VAPID key differs from the key used to create an
  // existing browser subscription, that subscription can never receive pushes.
  // Repair it in one tap instead of asking the user to edit cryptographic values.
  if (subscription && awardsPushKeyMatches_(subscription, publicKey) === false) {
    const oldEndpoint = String(subscription.endpoint || "");
    if (typeof apiRemovePushSubscription === "function") {
      try {
        await apiRemovePushSubscription(oldEndpoint, deviceId);
      } catch (err) {
        // Browser re-subscription is authoritative; stale backend rows are safe
        // to leave disabled/replace on the next successful registration.
      }
    }
    try {
      await subscription.unsubscribe();
    } catch (err) {}
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: awardsPushBase64UrlToUint8Array_(publicKey)
    });
  }

  if (typeof apiRegisterPushSubscription !== "function") {
    throw new Error("PATTC Predicts push registration API is not loaded.");
  }

  const result = await apiRegisterPushSubscription(
    subscription.toJSON ? subscription.toJSON() : subscription,
    deviceId,
    awardsPushDeviceLabel_()
  );

  if (!result || result.success === false) {
    throw new Error(
      result && (result.message || result.error)
        ? result.message || result.error
        : "Could not register this device for push."
    );
  }

  const verified = await awardsPushVerifyBackendRegistration_(
    deviceId,
    String(subscription.endpoint || "")
  );
  if (!verified || verified.registered !== true) {
    throw new Error(
      "Your browser is subscribed, but PATTC Predicts could not verify the stored device registration. Tap Repair Push Registration to retry."
    );
  }

  return {
    success: true,
    subscription: subscription,
    activeDevices: Number(verified.activeDevices || 1),
    message: "Push enabled and registered on this device ✓"
  };
}

async function awardsPushDisableOnThisDevice_() {
  if (!awardsPushSupported_()) {
    return { success: true, message: "Push is not enabled on this device." };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const endpoint = subscription ? String(subscription.endpoint || "") : "";

  if (typeof apiRemovePushSubscription === "function") {
    const result = await apiRemovePushSubscription(endpoint, awardsPushDeviceId_());
    if (result && result.success === false) {
      throw new Error(result.message || result.error || "Could not disable the stored push subscription.");
    }
  }

  if (subscription) {
    try {
      await subscription.unsubscribe();
    } catch (err) {
      // Backend disable is authoritative even if the browser already expired it.
    }
  }

  return { success: true, message: "Push disabled on this device." };
}

// v1.2.18f: standards-based Web Push subscription flow. Permission is only
// requested from an explicit user button tap; no startup permission prompts.
