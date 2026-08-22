/* ======================
   NOTIFICATION CENTER
   v1.2.18g
====================== */

function notificationCenterEscape_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function notificationCenterIcon_(type) {
  const key = String(type || "info").toLowerCase();
  if (key.indexOf("pick") !== -1) return "✍️";
  if (key.indexOf("lock") !== -1) return "⏰";
  if (key.indexOf("final") !== -1 || key.indexOf("result") !== -1) return "🏆";
  if (key.indexOf("game") !== -1) return "🎮";
  return "🔔";
}

function notificationCenterTime_(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch (err) {
    return date.toLocaleString();
  }
}

const NOTIFICATION_ADMIN_STATE = {
  control: null
};

async function renderNotificationsPage() {
  setPageLoadStep(50, "Loading notifications…");

  let res = null;
  let adminControl = null;
  try {
    res = typeof apiGetUserNotifications === "function"
      ? await apiGetUserNotifications(75)
      : null;
  } catch (err) {
    res = null;
  }

  const adminSession = typeof isAdminSession === "function" && isAdminSession(getSession ? getSession() : null);
  if (adminSession && typeof apiAdminGetPushControlCenter === "function") {
    try {
      adminControl = await apiAdminGetPushControlCenter();
      if (!adminControl || adminControl.success === false) adminControl = null;
    } catch (err) {
      adminControl = null;
    }
  }

  NOTIFICATION_ADMIN_STATE.control = adminControl;

  const notifications = res && Array.isArray(res.notifications)
    ? res.notifications
    : [];

  const unreadCount = Number(res && res.unreadCount) || 0;

  setTimeout(function() {
    if (adminControl) {
      notificationAdminApplySelectedGame_();
      if (typeof previewAdminPushAudience_ === "function") previewAdminPushAudience_();
    }
    if (typeof refreshNotificationCenterPushStatus_ === "function") {
      refreshNotificationCenterPushStatus_();
    }
  }, 0);

  return `
    <div class="page notification-center-page">
      <header class="notification-center-header">
        <div>
          <p class="notification-center-kicker">Player Alerts</p>
          <h1>Notification Center</h1>
          <p>${unreadCount ? unreadCount + " unread" : "You're caught up"}</p>
        </div>
        <div class="notification-center-actions">
          ${unreadCount ? `<button class="button secondary" type="button" onclick="markAllNotificationsRead_()">Mark all read</button>` : ""}
          <button class="button secondary" type="button" onclick="navigate('profile')">Preferences</button>
        </div>
      </header>

      ${adminControl ? renderNotificationAdminControlCenter_(adminControl) : ""}

      ${notifications.length ? `
        <div class="notification-center-list">
          ${notifications.map(renderNotificationCenterItem_).join("")}
        </div>
      ` : `
        <div class="notification-center-empty card">
          <span>🔔</span>
          <h2>No notifications yet</h2>
          <p>Pick reminders, lock warnings, final results and new-game alerts will collect here.</p>
        </div>
      `}
    </div>
  `;
}

function renderNotificationAdminControlCenter_(control) {
  control = control || {};
  const games = Array.isArray(control.games) ? control.games : [];
  const gateway = control.gateway || {};
  const stats = control.subscriptionStats || {};
  const recent = Array.isArray(control.recent) ? control.recent : [];
  const firstGame = games[0] || {};
  const defaultGatewayUrl = gateway.url || (
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin.replace(/\/$/, "") + "/api/push-send"
      : ""
  );

  return `
    <section class="notification-admin-panel card">
      <div class="notification-admin-title-row">
        <div>
          <p class="notification-center-kicker">Admin Push Controls</p>
          <h2>Push Notification System</h2>
          <p>OFF blocks everything. TEST sends only to your signed-in admin account. LIVE uses the selected audience and each player's preferences.</p>
        </div>
        <div class="notification-admin-status ${String(control.globalMode || "OFF").toLowerCase()}">
          ${notificationCenterEscape_(control.globalMode || "OFF")}
        </div>
      </div>

      <div class="notification-admin-grid">
        <div class="notification-admin-box">
          <h3>1. Global Safety Switch</h3>
          <label>
            <span>Global mode</span>
            <select id="notificationGlobalMode">
              <option value="OFF" ${control.globalMode === "OFF" ? "selected" : ""}>OFF — send nothing</option>
              <option value="TEST" ${control.globalMode === "TEST" ? "selected" : ""}>TEST — admin only</option>
              <option value="LIVE" ${control.globalMode === "LIVE" ? "selected" : ""}>LIVE — normal delivery</option>
            </select>
          </label>
          <button class="button" type="button" onclick="saveNotificationGlobalMode_()">Save Global Mode</button>
          <small>${Number(stats.activeUsers || 0)} user(s) · ${Number(stats.activeSubscriptions || 0)} active device subscription(s)</small>
        </div>

        <div class="notification-admin-box">
          <h3>2. Cloudflare Gateway</h3>
          <p class="notification-admin-inline-status ${gateway.configured ? "ready" : "not-ready"}">
            ${gateway.configured ? "Configured ✓" : "Not configured yet"}
          </p>
          <label>
            <span>Gateway URL</span>
            <input id="notificationGatewayUrl" type="url" value="${notificationCenterEscape_(defaultGatewayUrl)}" placeholder="https://your-app-domain/api/push-send">
          </label>
          <label>
            <span>Gateway token ${gateway.hasToken ? "(leave blank to keep current token)" : ""}</span>
            <input id="notificationGatewayToken" type="password" autocomplete="new-password" placeholder="Paste PUSH_GATEWAY_TOKEN">
          </label>
          <button class="button secondary" type="button" onclick="saveNotificationGateway_()">Save Cloudflare Gateway</button>
        </div>

        <div class="notification-admin-box">
          <h3>3. Per-Game Controls</h3>
          ${games.length ? `
            <label>
              <span>Game</span>
              <select id="notificationGameSelect" onchange="notificationAdminApplySelectedGame_()">
                ${games.map(function(game) {
                  return `<option value="${notificationCenterEscape_(game.gameId)}">${notificationCenterEscape_(game.gameName || game.gameId)}</option>`;
                }).join("")}
              </select>
            </label>
            <label class="notification-admin-check"><input id="notificationGameEnabled" type="checkbox"> <span><strong>Notifications ON for this game</strong><small>Must be on before this game can send.</small></span></label>
            <label class="notification-admin-check"><input id="notificationGamePaused" type="checkbox"> <span><strong>Pause this game</strong><small>Temporary stop without losing settings.</small></span></label>
            <label class="notification-admin-check"><input id="notificationGameTestOnly" type="checkbox"> <span><strong>Test only</strong><small>Forces delivery to the signed-in admin only even when global mode is LIVE.</small></span></label>
            <button class="button secondary" type="button" onclick="saveNotificationGameSettings_()">Save Game Controls</button>
          ` : `<p>No games are available.</p>`}
        </div>

        <div class="notification-admin-box notification-admin-compose">
          <h3>4. Send / Test Notification</h3>
          <label>
            <span>Game</span>
            <select id="notificationComposeGame" onchange="previewAdminPushAudience_()">
              <option value="">No specific game</option>
              ${games.map(function(game) {
                return `<option value="${notificationCenterEscape_(game.gameId)}" ${firstGame.gameId === game.gameId ? "" : ""}>${notificationCenterEscape_(game.gameName || game.gameId)}</option>`;
              }).join("")}
            </select>
          </label>
          <label>
            <span>Audience</span>
            <select id="notificationComposeAudience" onchange="previewAdminPushAudience_()">
              <option value="self">Just me / admin test</option>
              <option value="game">Players in this game only</option>
              <option value="missing_picks">Players who still owe picks</option>
              <option value="all">All PATTC Predicts users</option>
            </select>
          </label>
          <small class="notification-admin-compose-help">“Players who still owe picks” excludes players who already completed every currently open pick question.</small>
          <label>
            <span>Type</span>
            <select id="notificationComposeType" onchange="previewAdminPushAudience_()">
              <option value="custom">Custom announcement</option>
              <option value="make_picks">Make picks / new questions</option>
              <option value="lock">Lock approaching</option>
              <option value="results">Results available</option>
              <option value="new_game">New game</option>
            </select>
          </label>
          <label><span>Title</span><input id="notificationComposeTitle" maxlength="120" value="PATTC Predicts"></label>
          <label><span>Message</span><textarea id="notificationComposeMessage" maxlength="500" rows="3" placeholder="Type the notification message…"></textarea></label>
          <div id="notificationAudiencePreview" class="notification-admin-inline-status">Checking audience…</div>
          <button class="button" type="button" onclick="sendAdminPushNotification_()">Send Notification</button>
          <div id="notificationAdminMessage" class="profile-message hidden"></div>
        </div>
      </div>

      ${recent.length ? `
        <details class="notification-admin-history">
          <summary>Recent Push History</summary>
          <div class="notification-admin-history-list">
            ${recent.map(function(item) {
              return `<div><strong>${notificationCenterEscape_(item.title || "Notification")}</strong><span>${notificationCenterEscape_(notificationCenterTime_(item.timestamp))} · ${notificationCenterEscape_(item.globalMode || "")} · ${Number(item.sent || 0)} sent / ${Number(item.failed || 0)} failed</span></div>`;
            }).join("")}
          </div>
        </details>
      ` : ""}
    </section>
  `;
}

function notificationAdminShowMessage_(text, isError) {
  const el = document.getElementById("notificationAdminMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "profile-message " + (isError ? "error" : "success");
}

function notificationAdminSelectedGame_() {
  const control = NOTIFICATION_ADMIN_STATE.control || {};
  const games = Array.isArray(control.games) ? control.games : [];
  const select = document.getElementById("notificationGameSelect");
  const gameId = select ? String(select.value || "") : "";
  return games.find(function(game) { return String(game.gameId || "") === gameId; }) || games[0] || null;
}

function notificationAdminApplySelectedGame_() {
  const game = notificationAdminSelectedGame_();
  if (!game) return;
  const enabled = document.getElementById("notificationGameEnabled");
  const paused = document.getElementById("notificationGamePaused");
  const testOnly = document.getElementById("notificationGameTestOnly");
  if (enabled) enabled.checked = game.enabled === true;
  if (paused) paused.checked = game.paused === true;
  if (testOnly) testOnly.checked = game.testOnly !== false;
}

async function saveNotificationGlobalMode_() {
  const select = document.getElementById("notificationGlobalMode");
  const requestedMode = select ? String(select.value || "OFF").trim().toUpperCase() : "OFF";
  const button = select && select.closest(".notification-admin-box")
    ? select.closest(".notification-admin-box").querySelector("button")
    : null;

  if (button) {
    button.disabled = true;
    button.textContent = "Saving…";
  }

  try {
    const res = await apiAdminSavePushSystemMode(requestedMode);
    if (!res || res.success === false) {
      notificationAdminShowMessage_(res && (res.message || res.error) || "Could not save global mode.", true);
      return;
    }

    const persistedMode = String(res.persistedMode || res.mode || "").trim().toUpperCase();
    if (persistedMode !== requestedMode) {
      notificationAdminShowMessage_(
        "Mode was not saved. Requested " + requestedMode + " but server returned " + (persistedMode || "no mode") + ".",
        true
      );
      if (select && persistedMode) select.value = persistedMode;
      return;
    }

    if (select) select.value = persistedMode;
    const badge = document.querySelector(".notification-admin-status");
    if (badge) {
      badge.textContent = persistedMode;
      badge.classList.remove("off", "test", "live");
      badge.classList.add(persistedMode.toLowerCase());
    }
    notificationAdminShowMessage_("Global notification mode saved: " + persistedMode + " ✓", false);

    // Read the control center back from the server before repainting so a save
    // can never appear successful and then silently fall back to OFF.
    const verify = await apiAdminGetPushControlCenter();
    const verifiedMode = String(verify && verify.globalMode || "").trim().toUpperCase();
    if (!verify || verify.success === false || verifiedMode !== persistedMode) {
      notificationAdminShowMessage_(
        "Saved " + persistedMode + ", but verification read back " + (verifiedMode || "no mode") + ". Please retry.",
        true
      );
      return;
    }

    await navigate("notifications", { suppressLoader: true });
  } finally {
    if (button && document.body.contains(button)) {
      button.disabled = false;
      button.textContent = "Save Global Mode";
    }
  }
}

async function saveNotificationGateway_() {
  const url = String((document.getElementById("notificationGatewayUrl") || {}).value || "").trim();
  const token = String((document.getElementById("notificationGatewayToken") || {}).value || "").trim();
  const res = await apiAdminSavePushGatewayConfig(url, token);
  if (!res || res.success === false) {
    notificationAdminShowMessage_(res && (res.message || res.error) || "Could not save Cloudflare gateway.", true);
    return;
  }
  notificationAdminShowMessage_("Cloudflare gateway saved ✓", false);
  navigate("notifications", { suppressLoader: true });
}

async function saveNotificationGameSettings_() {
  const game = notificationAdminSelectedGame_();
  if (!game) return;
  const payload = {
    gameId: game.gameId,
    enabled: !!(document.getElementById("notificationGameEnabled") || {}).checked,
    paused: !!(document.getElementById("notificationGamePaused") || {}).checked,
    testOnly: !!(document.getElementById("notificationGameTestOnly") || {}).checked
  };
  const res = await apiAdminSaveGameNotificationSettings(payload);
  if (!res || res.success === false) {
    notificationAdminShowMessage_(res && (res.message || res.error) || "Could not save game controls.", true);
    return;
  }
  notificationAdminShowMessage_("Game notification controls saved ✓", false);
  navigate("notifications", { suppressLoader: true });
}


async function previewAdminPushAudience_() {
  const el = document.getElementById("notificationAudiencePreview");
  if (!el || typeof apiAdminSendPushNotification !== "function") return;

  const payload = {
    gameId: String((document.getElementById("notificationComposeGame") || {}).value || "").trim(),
    audience: String((document.getElementById("notificationComposeAudience") || {}).value || "self").trim(),
    type: String((document.getElementById("notificationComposeType") || {}).value || "custom").trim(),
    title: "Audience preview",
    message: "Preview only",
    route: String((document.getElementById("notificationComposeAudience") || {}).value || "") === "missing_picks" ? "picks" : "notifications",
    previewOnly: true
  };

  el.textContent = "Checking audience…";
  el.className = "notification-admin-inline-status";

  try {
    const res = await apiAdminSendPushNotification(payload);
    if (!res || res.success === false) {
      el.textContent = res && (res.message || res.error) || "Could not preview this audience.";
      el.classList.add("not-ready");
      return;
    }

    el.textContent = res.message || "Audience preview ready.";
    if (res.blocked) el.classList.add("not-ready");
    else el.classList.add("ready");
  } catch (err) {
    el.textContent = "Could not preview this audience.";
    el.classList.add("not-ready");
  }
}

async function sendAdminPushNotification_() {
  const payload = {
    gameId: String((document.getElementById("notificationComposeGame") || {}).value || "").trim(),
    audience: String((document.getElementById("notificationComposeAudience") || {}).value || "self").trim(),
    type: String((document.getElementById("notificationComposeType") || {}).value || "custom").trim(),
    title: String((document.getElementById("notificationComposeTitle") || {}).value || "").trim(),
    message: String((document.getElementById("notificationComposeMessage") || {}).value || "").trim(),
    route: String((document.getElementById("notificationComposeAudience") || {}).value || "") === "missing_picks" ? "picks" : "notifications"
  };
  notificationAdminShowMessage_("Sending…", false);
  const res = await apiAdminSendPushNotification(payload);
  if (!res || res.success === false) {
    notificationAdminShowMessage_(res && (res.message || res.error) || "Push could not be sent.", true);
    return;
  }
  const detail = Array.isArray(res.failureDetails) && res.failureDetails.length
    ? res.failureDetails.join(" | ")
    : "";
  let resultMessage = res.message || (detail ? "Push failed: " + detail : "Notification sent ✓");
  if (payload.audience === "missing_picks") {
    resultMessage += " Pick reminder: " + Number(res.requiredPickQuestions || 0) +
      " open question(s), " + Number(res.noPicksUsers || 0) +
      " no picks, " + Number(res.incompletePicksUsers || 0) +
      " incomplete, " + Number(res.missingPicksUsers || 0) +
      " still owe picks, " + Number(res.missingPicksActiveDevices || 0) +
      " active device(s).";
  } else if (payload.audience === "game") {
    resultMessage += " Game audience: " + Number(res.gameParticipants || 0) +
      " player(s), " + Number(res.gameEligibleUsers || 0) +
      " eligible, " + Number(res.gameActiveDevices || 0) + " active device(s).";
  }
  notificationAdminShowMessage_(
    resultMessage,
    Number(res.failed || 0) > 0
  );
  if (typeof refreshNotificationBadge_ === "function") refreshNotificationBadge_();
  if (typeof previewAdminPushAudience_ === "function") await previewAdminPushAudience_();
}

async function refreshNotificationCenterPushStatus_() {
  // Reserved for a compact device-state chip in the Notification Center.
  // Profile remains the canonical place for enabling/disabling this device.
  return true;
}

function renderNotificationCenterItem_(item) {
  item = item || {};
  const id = notificationCenterEscape_(item.notificationId || "");
  const route = notificationCenterEscape_(item.route || "");
  const gameId = notificationCenterEscape_(item.gameId || "");
  return `
    <article class="notification-center-item ${item.isRead ? "is-read" : "is-unread"}" data-notification-id="${id}">
      <button
        type="button"
        class="notification-center-item-button"
        onclick="openNotificationCenterItem_('${id}', '${route}', '${gameId}')"
      >
        <span class="notification-center-icon">${notificationCenterIcon_(item.type)}</span>
        <span class="notification-center-copy">
          <strong>${notificationCenterEscape_(item.title || "PATTC Predicts")}</strong>
          ${item.message ? `<span>${notificationCenterEscape_(item.message)}</span>` : ""}
          <small>${notificationCenterEscape_(notificationCenterTime_(item.createdAt))}</small>
        </span>
        ${item.isRead ? "" : `<span class="notification-center-unread-dot" aria-label="Unread"></span>`}
      </button>
    </article>
  `;
}

async function openNotificationCenterItem_(notificationId, route, gameId) {
  try {
    if (notificationId && typeof apiMarkNotificationRead === "function") {
      await apiMarkNotificationRead(notificationId);
    }
  } catch (err) {}

  if (typeof refreshNotificationBadge_ === "function") {
    refreshNotificationBadge_();
  }

  route = String(route || "").trim();
  gameId = String(gameId || "").trim();

  if (gameId && typeof setFrontendGameId === "function") {
    setFrontendGameId(gameId);
  }

  if (route) {
    navigate(route);
    return;
  }

  if (gameId) {
    navigate("picks");
    return;
  }

  navigate("dashboard");
}

async function markAllNotificationsRead_() {
  try {
    if (typeof apiMarkAllNotificationsRead === "function") {
      await apiMarkAllNotificationsRead();
    }
  } catch (err) {}

  if (typeof refreshNotificationBadge_ === "function") {
    refreshNotificationBadge_();
  }

  navigate("notifications", { suppressLoader: true });
}
