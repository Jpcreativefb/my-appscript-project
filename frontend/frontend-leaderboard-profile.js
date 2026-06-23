/* =========================
   FRONTEND LEADERBOARD PROFILE DISPLAY
   NEW DROP-IN FILE: frontend-leaderboard-profile.js

   Use renderLeaderboardUser(row) wherever the leaderboard
   currently displays row.username or row.user.
========================= */

function escapeLeaderboardHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  
  function renderLeaderboardUser(row) {
  
    row =
      row || {};
  
    const displayName =
      row.displayName ||
      row.profileName ||
      row.user ||
      row.username ||
      "Unknown User";
  
    const avatar =
      row.avatar || "👤";
  
    const isImageAvatar =
      typeof avatar === "string" &&
      (
        avatar.indexOf("http://") === 0 ||
        avatar.indexOf("https://") === 0 ||
        avatar.indexOf("data:image") === 0
      );
  
    const avatarHtml =
      isImageAvatar
        ? `<img class="leaderboard-avatar-img" src="${escapeLeaderboardHtml(avatar)}" alt="">`
        : `<span class="leaderboard-avatar">${escapeLeaderboardHtml(avatar)}</span>`;
  
    return `
      <div class="leaderboard-user">
        ${avatarHtml}
        <span class="leaderboard-name">${escapeLeaderboardHtml(displayName)}</span>
      </div>
    `;
  
  }
  
  
  function renderCompareButton(row) {
  
    row =
      row || {};
  
    const username =
      row.username || "";
  
    if (!username) {
      return "";
    }
  
    return `
      <button
        class="leaderboard-compare-btn"
        type="button"
        data-compare-username="${escapeLeaderboardHtml(username)}"
      >
        Compare
      </button>
    `;
  
  }
  