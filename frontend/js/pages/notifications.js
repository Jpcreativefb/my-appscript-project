/* ======================
   NOTIFICATION CENTER
   v1.2.18e
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

async function renderNotificationsPage() {
  setPageLoadStep(50, "Loading notifications…");

  let res = null;
  try {
    res = typeof apiGetUserNotifications === "function"
      ? await apiGetUserNotifications(75)
      : null;
  } catch (err) {
    res = null;
  }

  const notifications = res && Array.isArray(res.notifications)
    ? res.notifications
    : [];

  const unreadCount = Number(res && res.unreadCount) || 0;

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
          <strong>${notificationCenterEscape_(item.title || "Awards App")}</strong>
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
