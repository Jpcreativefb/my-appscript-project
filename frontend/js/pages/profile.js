/* ======================
   PROFILE PAGE
   General profile + per-game profile overrides
   Supports initials, emoji, internet image, uploaded image
====================== */

const PROFILE_DEFAULT_COLOR = "#facc15";
const PROFILE_DEFAULT_EMOJI = "🏆";

/* ======================
   PAGE RENDER
====================== */

async function renderProfilePage() {

  setPageLoadStep(50, "Loading profile and history…");

  const session = getSessionSafe_();
  const username = session && session.username ? session.username : "";
  const editContext = getProfileEditContext_();

  const playableGames = await loadProfilePlayableGames_();

  const currentGameId =
    editContext.gameId ||
    getProfileGameId_(playableGames);

  const profileRequests = await Promise.all([
    apiGetEditableProfile(username, currentGameId),
    username
      ? apiGetUserProfileHistory(username, "")
      : Promise.resolve({
          success: true,
          summary: { archivedGames: 0 },
          games: []
        }),
    typeof apiGetNotificationPreferences === "function"
      ? apiGetNotificationPreferences().catch(function() {
          return { success: true, preferences: null };
        })
      : Promise.resolve({ success: true, preferences: null })
  ]);

  const res = profileRequests[0];
  const historyRes = profileRequests[1] || {
    success: true,
    summary: { archivedGames: 0 },
    games: []
  };
  const notificationRes = profileRequests[2] || {
    success: true,
    preferences: null
  };

  APP_STATE.profileHistory = historyRes;

  const profile =
    res && res.success
      ? res.profile
      : getProfileFallback_(username, currentGameId);

  APP_STATE.profile = profile;
  APP_STATE.profileData =
    res && res.success
      ? res
      : {
          success: true,
          profile: profile,
          generalProfile: profile,
          gameProfile: {},
          scopedProfile: {},
          profileMode: "game",
          reusableProfiles: []
        };

  APP_STATE.profileGames = playableGames;
  APP_STATE.notificationPreferences =
    notificationRes && notificationRes.preferences
      ? notificationRes.preferences
      : {
          appNotificationsEnabled: true,
          notifyMakePicks: true,
          notifyLockApproaching: true,
          notifyFinalResults: true,
          notifyNewGames: true
        };

  const selectedGame = profileFindGame_(playableGames, currentGameId);
  const selectedGameName = selectedGame
    ? getGameNameFromGame_(selectedGame)
    : currentGameId || "Selected game";

  const profileMode =
    editContext.onboarding
      ? "general"
      : String(APP_STATE.profileData.profileMode || "game").toLowerCase();

  const profileScope =
    editContext.onboarding
      ? "general"
      : editContext.gameId
        ? (profileMode === "season" ? "season" : profileMode === "general" ? "general" : "game")
        : "general";

  const isLockedContext =
    editContext.onboarding === true ||
    Boolean(editContext.gameId);

  const saveLabel =
    editContext.gameId
      ? "Save & Continue to " + selectedGameName
      : "Save Profile & Return Home";

  applyProfileColor_(profile);

  setTimeout(function() {

    populateProfileGameSelect_(playableGames, currentGameId);

    const scopeSelect = document.getElementById("profileScope");
    if (scopeSelect) scopeSelect.value = profileScope;

    if (editContext.gameId) {
      const gameSelect = document.getElementById("profileGameId");
      if (gameSelect) gameSelect.value = currentGameId;
    }

    updateProfileGameVisibility_();

    const data = APP_STATE.profileData || {};
    let selectedProfile = data.generalProfile || profile;

    if (profileScope === "game") {
      selectedProfile = data.gameProfile || {};
    } else if (profileScope === "season") {
      selectedProfile = data.scopedProfile || {};
    }

    populateProfileForm_(
      selectedProfile,
      profileScope === "general"
    );

    updateProfilePreview();
    updateProfileSaveButtonLabel_();
    updateNotificationPreferenceVisibility_();
    refreshProfilePushStatus_();

  }, 0);

  return `
    <div class="page profile-page">

      <div class="profile-page-title-row">
        <div>
          <h1>${editContext.onboarding ? "Set Up Your Profile" : "Profile"}</h1>
          <p class="profile-page-subtitle">
            ${
              editContext.onboarding
                ? "Choose how you want to appear in the app. You can change this later."
                : editContext.gameId
                  ? "You are editing the profile used for " + escapeProfileHtml_(selectedGameName) + "."
                  : "Edit your default identity or choose how you appear in a specific game."
            }
          </p>
        </div>
        ${
          editContext.onboarding
            ? ""
            : `
              <button class="button secondary profile-title-history-button" type="button" onclick="navigate('history')">
                Archived Games
              </button>
            `
        }
      </div>

      <div
        id="profileCardPreview"
        class="profile-card-preview"
        style="--profile-color:${escapeProfileAttr_(profile.profileColor || PROFILE_DEFAULT_COLOR)};"
      >

        <div
          id="profilePreviewAvatar"
          class="profile-avatar-large"
          style="--profile-color:${escapeProfileAttr_(profile.profileColor || PROFILE_DEFAULT_COLOR)}"
        >
          ${renderProfileAvatar_(profile)}
        </div>

        <div class="profile-preview-copy">
          <div id="profilePreviewName" class="profile-preview-name">
            ${escapeProfileHtml_(profile.displayName || username || "Player")}
          </div>

          <div id="profilePreviewBio" class="profile-preview-bio ${profile.bio ? "" : "hidden"}">
            ${escapeProfileHtml_(profile.bio || "")}
          </div>
        </div>

      </div>

      <div class="profile-preview-variants" aria-label="Profile previews">
        <div class="profile-preview-variant">
          <span class="profile-preview-variant-label">App</span>
          <div id="profileAppPreviewMini" class="profile-mini-app-preview"></div>
        </div>
        <div class="profile-preview-variant">
          <span class="profile-preview-variant-label">Leaderboard</span>
          <div id="profileLeaderboardPreviewMini" class="profile-mini-leaderboard-preview"></div>
        </div>
        <div class="profile-preview-variant">
          <span class="profile-preview-variant-label">Compact</span>
          <div id="profileCompactPreviewMini" class="profile-mini-compact-preview"></div>
        </div>
      </div>

      <div class="card profile-form-card">

        <div class="profile-editor-heading">
          <div>
            <h2>Profile to Edit</h2>
            <p>
              ${
                editContext.onboarding
                  ? "General Profile"
                  : editContext.gameId
                    ? escapeProfileHtml_(
                        profileScope === "season"
                          ? (APP_STATE.profileData.profileScopeLabel || selectedGameName)
                          : profileScope === "general"
                            ? "General Profile"
                            : selectedGameName
                      )
                    : "Choose General or a game below."
              }
            </p>
          </div>
          ${
            editContext.gameId
              ? `<span class="profile-context-badge">${escapeProfileHtml_(profileScope === "season" ? "League / Season" : profileScope === "general" ? "General" : "Game")}</span>`
              : ""
          }
        </div>

        ${
          isLockedContext
            ? `
              <input id="profileScope" type="hidden" value="${escapeProfileAttr_(profileScope)}">
              ${
                editContext.gameId
                  ? `<input id="profileGameId" type="hidden" value="${escapeProfileAttr_(currentGameId)}">`
                  : ""
              }
            `
            : `
              <label class="profile-label" for="profileScope">
                Profile level
              </label>

              <select
                id="profileScope"
                class="input profile-input"
                onchange="onProfileScopeChange()"
              >
                <option value="general">General profile</option>
                <option value="game">Game / league profile</option>
              </select>

              <div class="profile-help">
                The app will use the profile rules selected by the Admin for each game.
              </div>

              <div
                id="profileGameSelectWrap"
                class="profile-game-select-wrap hidden"
              >
                <label class="profile-label" for="profileGameId">
                  Game
                </label>

                <select
                  id="profileGameId"
                  class="input profile-input"
                  onchange="onProfileGameChange()"
                ></select>
              </div>
            `
        }

        ${
          !editContext.onboarding
            ? renderProfileReuseSection_(APP_STATE.profileData.reusableProfiles || [])
            : ""
        }

        <label class="profile-label" for="profileDisplayName">
          Display name
        </label>
        <input
          id="profileDisplayName"
          class="input profile-input"
          maxlength="40"
          placeholder="Name shown in the app and leaderboards"
          oninput="updateProfilePreview()"
        >

        <label class="profile-label" for="profileRealName">
          Real name
        </label>
        <input
          id="profileRealName"
          class="input profile-input"
          maxlength="60"
          placeholder="Optional — never required on leaderboards"
          oninput="updateProfilePreview()"
        >

        <label class="profile-label" for="profileAvatarType">
          Profile image
        </label>
        <select
          id="profileAvatarType"
          class="input profile-input"
          onchange="onProfileAvatarTypeChange()"
        >
          <option value="initials">Initials</option>
          <option value="emoji">Emoji / icon</option>
          <option value="url">Image from internet</option>
          <option value="upload">Upload photo</option>
        </select>

        <div id="profileAvatarInitialsWrap" class="profile-avatar-option">
          <label class="profile-label" for="profileAvatarInitials">Initials</label>
          <input
            id="profileAvatarInitials"
            class="input profile-input"
            maxlength="4"
            placeholder="Auto from name"
            oninput="updateProfilePreview()"
          >
        </div>

        <div id="profileAvatarEmojiWrap" class="profile-avatar-option">
          <label class="profile-label" for="profileAvatarEmoji">Avatar emoji / icon</label>
          <input
            id="profileAvatarEmoji"
            class="input profile-input"
            maxlength="32"
            placeholder="🏆"
            oninput="updateProfilePreview()"
          >
          <div class="profile-help profile-help-callout">
            Use emoji just like texting. Phone/tablet: open the emoji keyboard. Mac: Control + Command + Space. Windows: Windows + .
          </div>
        </div>

        <div id="profileAvatarUrlWrap" class="profile-avatar-option">
          <label class="profile-label" for="profileAvatarUrl">Avatar image URL</label>
          <input
            id="profileAvatarUrl"
            class="input profile-input"
            placeholder="https://example.com/photo.jpg"
            oninput="updateProfilePreview()"
          >
          <div class="profile-help profile-help-callout">
            Paste a direct HTTPS image link. On a website, open the image itself or use Copy Image Address / Copy Image Link, then paste it here. The profile preview above updates automatically. If it stays blank, try a different direct image link.
          </div>
        </div>

        <div id="profileAvatarUploadWrap" class="profile-avatar-option">
          <label class="profile-label" for="profileAvatarFile">Upload photo</label>
          <input
            id="profileAvatarFile"
            class="input profile-input"
            type="file"
            accept="image/*"
            onchange="onProfileUploadPreview()"
          >
          <input id="profileAvatarFileId" type="hidden">
          <div class="profile-help profile-help-callout">
            On a phone, tap Choose File to use the normal device picker. Depending on your phone it can offer Take Photo / Camera, Photo Library, or Choose File / Files. Large photos are resized automatically before upload.
          </div>
          <div id="profileUploadStatus" class="profile-upload-status hidden" role="status" aria-live="polite"></div>
          <div id="profileUploadPreviewWrap" class="profile-upload-full-preview hidden">
            <div id="profileUploadFullPreview"></div>
          </div>
        </div>

        <div class="profile-style-section">
          <div class="profile-style-heading">
            <h3>Profile Style</h3>
            <span>Used on profile surfaces and as your player accent.</span>
          </div>

          <label class="profile-label" for="profileColorMode">Background</label>
          <select
            id="profileColorMode"
            class="input profile-input"
            onchange="updateProfileStyleVisibility_(); updateProfilePreview();"
          >
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
          </select>

          <div class="profile-color-grid">
            <label>
              Color 1
              <input
                id="profileColor"
                class="input profile-color-input"
                type="color"
                value="${escapeProfileAttr_(profile.profileColor || PROFILE_DEFAULT_COLOR)}"
                oninput="updateProfilePreview()"
              >
            </label>

            <label id="profileColor2Wrap">
              Color 2
              <input
                id="profileColor2"
                class="input profile-color-input"
                type="color"
                value="${escapeProfileAttr_(profile.profileColor2 || "#354785")}"
                oninput="updateProfilePreview()"
              >
            </label>
          </div>

          <label id="profileGradientAngleWrap" class="profile-gradient-angle">
            Gradient Angle
            <div class="profile-range-line">
              <input
                id="profileGradientAngle"
                type="range"
                min="0"
                max="360"
                step="5"
                value="${escapeProfileAttr_(profile.profileGradientAngle || "135")}"
                oninput="updateProfileGradientAngleLabel_(); updateProfilePreview();"
              >
              <span id="profileGradientAngleLabel">135°</span>
            </div>
          </label>
        </div>

        <label class="profile-label" for="profileBio">
          Short profile note
        </label>
        <textarea
          id="profileBio"
          class="input profile-textarea"
          maxlength="160"
          placeholder="Optional. Leave blank and it will not be shown."
          oninput="updateProfilePreview()"
        ></textarea>

        <button
          id="profileSaveButton"
          class="button profile-save-button"
          onclick="saveProfileForm()"
        >
          ${escapeProfileHtml_(saveLabel)}
        </button>

        <div id="profileMessage" class="profile-message hidden"></div>

      </div>

      ${renderProfileNotificationPreferences_(APP_STATE.notificationPreferences)}

      ${renderProfileHistorySection_(historyRes, username)}

    </div>
  `;

}

function getProfileEditContext_() {

  let context = {
    gameId: "",
    gameType: "",
    leagueId: "",
    gameRole: "",
    hubMode: "",
    onboarding: false
  };

  try {
    const raw = localStorage.getItem("profileEditContext");
    if (raw) {
      context = Object.assign(context, JSON.parse(raw) || {});
    }
    if (localStorage.getItem("profileOnboardingGeneral") === "1") {
      context.onboarding = true;
      context.gameId = "";
    }
  } catch (err) {}

  context.gameId = String(context.gameId || "").trim();
  context.gameType = String(context.gameType || "").trim();
  context.leagueId = String(context.leagueId || "").trim();
  context.gameRole = String(context.gameRole || "").trim();
  context.hubMode = String(context.hubMode || "").trim();

  return context;
}

function clearProfileEditContext_() {
  try {
    localStorage.removeItem("profileEditContext");
    localStorage.removeItem("profileOpenGameSpecific");
    localStorage.removeItem("profileOnboardingGeneral");
  } catch (err) {}
}

function profileFindGame_(games, gameId) {
  games = Array.isArray(games) ? games : [];
  return games.find(function(game) {
    return String(getGameIdFromGame_(game)) === String(gameId || "");
  }) || null;
}

function renderProfileReuseSection_(profiles) {

  profiles = Array.isArray(profiles) ? profiles : [];
  if (!profiles.length) return "";

  return `
    <details class="profile-reuse-section">
      <summary>
        <span>Reuse an Old Profile</span>
        <small>Copy a previous look into this profile</small>
      </summary>

      <div class="profile-reuse-body">
        <select id="profileReuseSelect" class="input profile-input">
          ${profiles.map(function(item, index) {
            return `
              <option value="${index}">
                ${escapeProfileHtml_(item.label || "Saved Profile")}
              </option>
            `;
          }).join("")}
        </select>

        <button class="button secondary profile-small-action" type="button" onclick="applyReusableProfile_()">
          Use This Profile
        </button>

        <div class="profile-help">
          This copies the name, image, note and colors. It does not permanently link the profiles.
        </div>
      </div>
    </details>
  `;
}

function applyReusableProfile_() {

  const select = document.getElementById("profileReuseSelect");
  const profiles = APP_STATE.profileData && Array.isArray(APP_STATE.profileData.reusableProfiles)
    ? APP_STATE.profileData.reusableProfiles
    : [];

  if (!select || !profiles.length) return;

  const item = profiles[Number(select.value || 0)] || profiles[0];
  if (!item || !item.profile) return;

  populateProfileForm_(item.profile, true);
  showProfileMessage_("Profile copied. Review it, then Save.", "success");
  updateProfilePreview();
}

function renderProfileNotificationPreferences_(prefs) {

  prefs = prefs || {};

  return `
    <section class="card profile-notification-card">
      <div class="profile-notification-heading">
        <div>
          <h2>Notifications</h2>
          <p>Choose which Awards App updates you want. Phone push delivery will use these choices when the Cloudflare sender is enabled.</p>
        </div>
        <button class="button secondary profile-small-action" type="button" onclick="navigate('notifications')">
          Notification Center
        </button>
      </div>

      <label class="profile-notification-master">
        <input
          id="profileNotifyEnabled"
          type="checkbox"
          ${prefs.appNotificationsEnabled !== false ? "checked" : ""}
          onchange="updateNotificationPreferenceVisibility_()"
        >
        <span>
          <strong>Receive app notifications</strong>
          <small>Controls the notification categories below.</small>
        </span>
      </label>

      <div id="profileNotificationChoices" class="profile-notification-options">
        <label><input id="profileNotifyPicks" type="checkbox" ${prefs.notifyMakePicks !== false ? "checked" : ""}> Make your picks / new questions</label>
        <label><input id="profileNotifyLock" type="checkbox" ${prefs.notifyLockApproaching !== false ? "checked" : ""}> Game lock time approaching</label>
        <label><input id="profileNotifyFinal" type="checkbox" ${prefs.notifyFinalResults !== false ? "checked" : ""}> Final results available</label>
        <label><input id="profileNotifyNewGames" type="checkbox" ${prefs.notifyNewGames !== false ? "checked" : ""}> New games added</label>
      </div>

      <div class="profile-device-notification-status">
        <div>
          <strong>Push on this device:</strong>
          <span id="profilePushStatus">Checking…</span>
        </div>
        <div class="profile-push-device-actions">
          <button id="profileEnablePushButton" class="button" type="button" onclick="enableProfilePushOnThisDevice_()">
            Enable Push on This Device
          </button>
          <button id="profileDisablePushButton" class="button secondary" type="button" onclick="disableProfilePushOnThisDevice_()" style="display:none;">
            Disable on This Device
          </button>
        </div>
        <small>On iPhone/iPad, push works from the Awards App installed on the Home Screen. The permission prompt only appears after you tap Enable.</small>
      </div>

      <button class="button secondary profile-notification-save" type="button" onclick="saveProfileNotificationPreferences_()">
        Save Notification Preferences
      </button>

      <div id="profileNotificationMessage" class="profile-message hidden"></div>
    </section>
  `;
}

let PROFILE_PUSH_STATUS_REQUEST_ = 0;

function profileBrowserNotificationStatus_() {
  if (typeof awardsPushSupported_ === "function" && !awardsPushSupported_()) {
    return "Not available here — on iPhone, open the installed Home Screen app";
  }
  if (typeof Notification === "undefined") return "Not supported in this browser";
  if (Notification.permission === "denied") return "Blocked on this device";
  if (Notification.permission === "granted") return "Checking subscription…";
  return "Not enabled on this device yet";
}

async function refreshProfilePushStatus_() {
  const requestId = ++PROFILE_PUSH_STATUS_REQUEST_;
  const status = document.getElementById("profilePushStatus");
  const enableButton = document.getElementById("profileEnablePushButton");
  const disableButton = document.getElementById("profileDisablePushButton");
  if (!status) return;

  if (typeof awardsPushGetDeviceStatus_ !== "function") {
    status.textContent = profileBrowserNotificationStatus_();
    return;
  }

  try {
    const device = await awardsPushGetDeviceStatus_();
    if (requestId !== PROFILE_PUSH_STATUS_REQUEST_) return;
    const fullyRegistered = device.subscribed === true && device.registered === true;
    status.textContent = device.label || profileBrowserNotificationStatus_();
    if (enableButton) {
      enableButton.style.display = fullyRegistered ? "none" : "";
      enableButton.disabled = device.supported === false || device.permission === "denied";
      enableButton.textContent = device.subscribed && !device.registered
        ? "Repair Push Registration"
        : "Enable Push on This Device";
    }
    if (disableButton) {
      disableButton.style.display = device.subscribed ? "" : "none";
    }
  } catch (err) {
    if (requestId !== PROFILE_PUSH_STATUS_REQUEST_) return;
    status.textContent = err.message || "Could not check push status";
  }
}

async function enableProfilePushOnThisDevice_() {
  // Invalidate any older status request before registration starts.
  PROFILE_PUSH_STATUS_REQUEST_++;
  const status = document.getElementById("profilePushStatus");
  const button = document.getElementById("profileEnablePushButton");
  const message = document.getElementById("profileNotificationMessage");
  if (button) {
    button.disabled = true;
    button.textContent = "Enabling…";
  }
  if (status) status.textContent = "Requesting permission…";

  try {
    if (typeof awardsPushEnableOnThisDevice_ !== "function") {
      throw new Error("Push setup is not loaded.");
    }
    const res = await awardsPushEnableOnThisDevice_();
    if (message) {
      message.textContent = res.message || "Push enabled on this device ✓";
      message.className = "profile-message success";
    }
  } catch (err) {
    if (message) {
      message.textContent = err.message || "Could not enable push on this device.";
      message.className = "profile-message error";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Enable Push on This Device";
    }
    await refreshProfilePushStatus_();
  }
}

async function disableProfilePushOnThisDevice_() {
  const button = document.getElementById("profileDisablePushButton");
  const message = document.getElementById("profileNotificationMessage");
  if (button) {
    button.disabled = true;
    button.textContent = "Disabling…";
  }
  try {
    if (typeof awardsPushDisableOnThisDevice_ !== "function") {
      throw new Error("Push setup is not loaded.");
    }
    const res = await awardsPushDisableOnThisDevice_();
    if (message) {
      message.textContent = res.message || "Push disabled on this device.";
      message.className = "profile-message success";
    }
  } catch (err) {
    if (message) {
      message.textContent = err.message || "Could not disable push on this device.";
      message.className = "profile-message error";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Disable on This Device";
    }
    refreshProfilePushStatus_();
  }
}

function updateNotificationPreferenceVisibility_() {
  const enabled = document.getElementById("profileNotifyEnabled");
  const choices = document.getElementById("profileNotificationChoices");
  if (choices) {
    choices.classList.toggle("is-disabled", enabled ? !enabled.checked : false);
  }
}

async function saveProfileNotificationPreferences_() {

  if (typeof apiSaveNotificationPreferences !== "function") return;

  const button = document.querySelector(".profile-notification-save");
  const message = document.getElementById("profileNotificationMessage");

  if (button) {
    button.disabled = true;
    button.textContent = "Saving…";
  }

  try {
    const res = await apiSaveNotificationPreferences({
      appNotificationsEnabled: !!(document.getElementById("profileNotifyEnabled") || {}).checked,
      notifyMakePicks: !!(document.getElementById("profileNotifyPicks") || {}).checked,
      notifyLockApproaching: !!(document.getElementById("profileNotifyLock") || {}).checked,
      notifyFinalResults: !!(document.getElementById("profileNotifyFinal") || {}).checked,
      notifyNewGames: !!(document.getElementById("profileNotifyNewGames") || {}).checked
    });

    if (!res || res.success === false) throw new Error(res && (res.message || res.error) || "Could not save preferences.");

    APP_STATE.notificationPreferences = res.preferences || APP_STATE.notificationPreferences;
    if (message) {
      message.textContent = "Notification preferences saved ✓";
      message.className = "profile-message success";
    }
  } catch (err) {
    if (message) {
      message.textContent = err.message || "Could not save notification preferences.";
      message.className = "profile-message error";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save Notification Preferences";
    }
  }
}

/* ======================
   PROFILE SCOPE / GAME
====================== */

function getProfileEffectiveScope_() {

  const raw = getProfileInputValue_("profileScope") || "general";

  if (raw === "general") return "general";

  const mode = String(
    APP_STATE.profileData && APP_STATE.profileData.profileMode
      ? APP_STATE.profileData.profileMode
      : "game"
  ).toLowerCase();

  if (mode === "season") return "season";
  if (mode === "general") return "general";
  return "game";
}

function onProfileScopeChange() {

  updateProfileGameVisibility_();

  const scope = getProfileEffectiveScope_();
  const data = APP_STATE.profileData || {};

  const selectedProfile =
    scope === "game"
      ? (data.gameProfile || {})
      : scope === "season"
        ? (data.scopedProfile || {})
        : (data.generalProfile || data.profile || {});

  populateProfileForm_(
    selectedProfile,
    scope === "general"
  );

  updateProfilePreview();

}

async function onProfileGameChange() {

  const session =
    getSessionSafe_();

  const username =
    session && session.username
      ? session.username
      : "";

  const gameId =
    getProfileSelectedGameId_();

  if (!username || !gameId) {
    return;
  }

  showProfileMessage_(
    "Loading game profile...",
    "success"
  );

  const res =
    await apiGetEditableProfile(
      username,
      gameId
    );

  if (!res || !res.success) {

    showProfileMessage_(
      res && (res.message || res.error)
        ? (res.message || res.error)
        : "Could not load profile for this game.",
      "error"
    );

    return;

  }

  APP_STATE.profileData = res;

  const rawScope = getProfileInputValue_("profileScope") || "general";
  const scope = rawScope === "general" ? "general" : getProfileEffectiveScope_();

  populateProfileForm_(
    scope === "game"
      ? (res.gameProfile || {})
      : scope === "season"
        ? (res.scopedProfile || {})
        : (res.generalProfile || res.profile || {}),
    scope === "general"
  );

  updateProfilePreview();
  clearProfileMessage_();

}

function updateProfileGameVisibility_() {

  const rawScope = getProfileInputValue_("profileScope") || "general";

  const wrap =
    document.getElementById(
      "profileGameSelectWrap"
    );

  if (wrap) {
    wrap.classList.toggle(
      "hidden",
      rawScope === "general"
    );
  }

}

function populateProfileGameSelect_(
  games,
  selectedGameId
) {

  const select =
    document.getElementById(
      "profileGameId"
    );

  if (!select) {
    return;
  }

  games =
    Array.isArray(games)
      ? games
      : [];

  if (!games.length) {

    select.innerHTML = `
      <option value="${escapeProfileAttr_(selectedGameId || "")}">
        ${escapeProfileHtml_(selectedGameId || "Current game")}
      </option>
    `;

    return;

  }

  select.innerHTML =
    games.map(game => {

      const gameId =
        getGameIdFromGame_(game);

      const name =
        getGameNameFromGame_(game);

      const selected =
        String(gameId) === String(selectedGameId)
          ? " selected"
          : "";

      return `
        <option value="${escapeProfileAttr_(gameId)}"${selected}>
          ${escapeProfileHtml_(name)}
        </option>
      `;

    }).join("");

}

/* ======================
   AVATAR FORM
====================== */

function onProfileAvatarTypeChange() {

  updateAvatarOptionVisibility_();
  updateProfilePreview();

}

async function onProfileUploadPreview() {

  const fileInput = document.getElementById("profileAvatarFile");
  const file =
    fileInput && fileInput.files && fileInput.files[0]
      ? fileInput.files[0]
      : null;

  APP_STATE.profilePreparedAvatar = null;

  if (!file) {
    profileSetUploadStatus_("", "");
    profileSetUploadPreview_("");
    updateProfilePreview();
    return;
  }

  if (!String(file.type || "").toLowerCase().startsWith("image/")) {
    profileSetUploadStatus_("Please choose an image file.", "error");
    fileInput.value = "";
    return;
  }

  profileSetUploadStatus_("Preparing photo…", "working");
  clearProfileMessage_();

  try {
    const prepared = await prepareProfileAvatarFile_(file);
    APP_STATE.profilePreparedAvatar = prepared;

    setProfileInputValue_("profileAvatarUrl", prepared.dataUrl);
    setProfileInputValue_("profileAvatarFileId", "");
    profileSetUploadPreview_(prepared.dataUrl);

    const beforeKb = Math.max(1, Math.round((file.size || 0) / 1024));
    const afterKb = Math.max(1, Math.round((prepared.sizeBytes || 0) / 1024));
    const detail = prepared.optimized
      ? "Photo ready ✓ Resized from " + beforeKb + " KB to " + afterKb + " KB."
      : "Photo ready ✓ " + afterKb + " KB.";

    profileSetUploadStatus_(detail, "success");
    updateProfilePreview();
  } catch (err) {
    APP_STATE.profilePreparedAvatar = null;
    fileInput.value = "";
    profileSetUploadPreview_("");
    profileSetUploadStatus_(
      err && err.message ? err.message : "Could not prepare that photo.",
      "error"
    );
  }
}

function profileSetUploadStatus_(message, state) {
  const el = document.getElementById("profileUploadStatus");
  if (!el) return;
  const text = String(message || "");
  el.textContent = text;
  el.className = "profile-upload-status" +
    (text ? " " + (state || "working") : " hidden");
}

function profileSetUploadPreview_(src) {
  const wrap = document.getElementById("profileUploadPreviewWrap");
  const slot = document.getElementById("profileUploadFullPreview");
  if (!wrap || !slot) return;

  const value = String(src || "");
  wrap.classList.toggle("hidden", !value);
  slot.innerHTML = value
    ? platformImgHtml(value, {
        className: "profile-upload-full-preview-image",
        variant: "profile",
        alt: "Selected profile photo preview",
        critical: true
      })
    : "";
}

function profileDataUrlBytes_(dataUrl) {
  const value = String(dataUrl || "");
  const comma = value.indexOf(",");
  if (comma < 0) return 0;
  const base64 = value.slice(comma + 1).replace(/\s/g, "");
  return Math.floor(base64.length * 3 / 4);
}

function loadProfileImageFromDataUrl_(dataUrl) {
  return new Promise(function(resolve, reject) {
    const image = new Image();
    image.onload = function() { resolve(image); };
    image.onerror = function() { reject(new Error("This image format could not be prepared. Try JPG, PNG, WEBP, or a different photo.")); };
    image.src = dataUrl;
  });
}

async function prepareProfileAvatarFile_(file) {
  const sourceDataUrl = await readProfileFileAsDataUrl_(file);
  const sourceType = String(file && file.type || "").toLowerCase();
  const maxServerBytes = 2 * 1024 * 1024;
  const targetBytes = 1600 * 1024;

  // Preserve animated GIFs; resizing through canvas would remove animation.
  if (sourceType === "image/gif") {
    if ((file.size || 0) > maxServerBytes) {
      throw new Error("Animated GIFs must be 2 MB or smaller. Choose a smaller GIF or a photo.");
    }
    return {
      dataUrl: sourceDataUrl,
      mimeType: "image/gif",
      fileName: file.name || "profile.gif",
      sizeBytes: file.size || profileDataUrlBytes_(sourceDataUrl),
      optimized: false
    };
  }

  const image = await loadProfileImageFromDataUrl_(sourceDataUrl);
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const sourceMax = Math.max(sourceWidth, sourceHeight);

  if (sourceMax <= 1200 && (file.size || 0) <= targetBytes &&
      /^(image\/(jpeg|png|webp))$/i.test(sourceType)) {
    return {
      dataUrl: sourceDataUrl,
      mimeType: sourceType === "image/jpg" ? "image/jpeg" : sourceType,
      fileName: file.name || "profile-photo",
      sizeBytes: file.size || profileDataUrlBytes_(sourceDataUrl),
      optimized: false
    };
  }

  const maxDimensions = [1200, 1000, 850];
  const qualities = [0.86, 0.76, 0.66, 0.56];
  let best = null;

  for (let d = 0; d < maxDimensions.length; d += 1) {
    const maxDimension = Math.min(maxDimensions[d], sourceMax);
    const scale = Math.min(1, maxDimension / sourceMax);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not resize the photo.");
    ctx.drawImage(image, 0, 0, width, height);

    for (let q = 0; q < qualities.length; q += 1) {
      let mimeType = "image/webp";
      let dataUrl = canvas.toDataURL(mimeType, qualities[q]);
      if (!/^data:image\/webp;base64,/i.test(dataUrl)) {
        mimeType = "image/jpeg";
        dataUrl = canvas.toDataURL(mimeType, qualities[q]);
      }
      const sizeBytes = profileDataUrlBytes_(dataUrl);
      best = { dataUrl: dataUrl, mimeType: mimeType, sizeBytes: sizeBytes };
      if (sizeBytes <= targetBytes) break;
    }
    if (best && best.sizeBytes <= targetBytes) break;
  }

  if (!best || best.sizeBytes > maxServerBytes) {
    throw new Error("That photo is still too large after resizing. Try another photo.");
  }

  const extension = best.mimeType === "image/webp" ? ".webp" : ".jpg";
  return {
    dataUrl: best.dataUrl,
    mimeType: best.mimeType,
    fileName: "profile-photo" + extension,
    sizeBytes: best.sizeBytes,
    optimized: true
  };
}

/* ======================
   SAVE
====================== */

async function saveProfileForm() {

  const session = getSessionSafe_();
  const username = session && session.username ? session.username : "";
  const scope = getProfileEffectiveScope_();
  const gameId =
    scope === "general"
      ? getProfileGameId_(APP_STATE.profileGames || [])
      : getProfileSelectedGameId_();

  if (!username) {
    showProfileMessage_("Missing username. Please log in again.", "error");
    return;
  }

  if ((scope === "game" || scope === "season") && !gameId) {
    showProfileMessage_("Choose a game for this profile.", "error");
    return;
  }

  const avatarType = getProfileInputValue_("profileAvatarType") || "initials";
  clearProfileMessage_();

  let avatarUrl = getProfileInputValue_("profileAvatarUrl");
  let avatarFileId = getProfileInputValue_("profileAvatarFileId");

  if (avatarType === "url" && avatarUrl && !/^https:\/\//i.test(avatarUrl)) {
    showProfileMessage_("Internet image must start with https://", "error");
    return;
  }

  if (avatarType === "upload") {

    const fileInput = document.getElementById("profileAvatarFile");
    const file =
      fileInput && fileInput.files && fileInput.files[0]
        ? fileInput.files[0]
        : null;

    if (file) {

      let prepared = APP_STATE.profilePreparedAvatar;
      if (!prepared || !prepared.dataUrl) {
        profileSetUploadStatus_("Preparing photo…", "working");
        prepared = await prepareProfileAvatarFile_(file);
        APP_STATE.profilePreparedAvatar = prepared;
      }

      showProfileMessage_("Uploading photo…", "success");
      profileSetUploadStatus_("Uploading photo…", "working");

      const uploadRes = await apiUploadProfileAvatar({
        username: username,
        gameId: gameId,
        scope: scope,
        profileScopeKey:
          APP_STATE.profileData && APP_STATE.profileData.profileScopeKey
            ? APP_STATE.profileData.profileScopeKey
            : "",
        fileName: prepared.fileName || file.name,
        mimeType: prepared.mimeType || file.type,
        dataUrl: prepared.dataUrl
      });

      if (!uploadRes || !uploadRes.success) {
        showProfileMessage_(
          uploadRes && (uploadRes.message || uploadRes.error)
            ? (uploadRes.message || uploadRes.error)
            : "Could not upload avatar.",
          "error"
        );
        return;
      }

      avatarUrl = uploadRes.avatarUrl || "";
      avatarFileId = uploadRes.avatarFileId || "";

      setProfileInputValue_("profileAvatarUrl", avatarUrl);
      setProfileInputValue_("profileAvatarFileId", avatarFileId);
      profileSetUploadPreview_(avatarUrl);
      profileSetUploadStatus_("Photo uploaded ✓", "success");
    }

    if (!avatarUrl || !/^https:\/\//i.test(avatarUrl)) {
      showProfileMessage_(
        "Choose a photo to upload, or select Initials, Emoji, or Image from internet.",
        "error"
      );
      return;
    }
  }

  const payload = {
    username: username,
    gameId: gameId,
    scope: scope,
    profileScopeKey:
      scope === "season" &&
      APP_STATE.profileData &&
      APP_STATE.profileData.profileScopeKey
        ? APP_STATE.profileData.profileScopeKey
        : "",
    profileScopeLabel:
      scope === "season" &&
      APP_STATE.profileData &&
      APP_STATE.profileData.profileScopeLabel
        ? APP_STATE.profileData.profileScopeLabel
        : "",
    displayName: getProfileInputValue_("profileDisplayName"),
    realName: getProfileInputValue_("profileRealName"),
    avatarType: avatarType,
    avatarInitials: getProfileInputValue_("profileAvatarInitials"),
    avatarEmoji: getProfileInputValue_("profileAvatarEmoji"),
    avatarUrl:
      avatarType === "url" || avatarType === "upload"
        ? avatarUrl
        : "",
    avatarFileId:
      avatarType === "upload"
        ? avatarFileId
        : "",
    profileColor: getProfileInputValue_("profileColor") || PROFILE_DEFAULT_COLOR,
    profileColorMode: getProfileInputValue_("profileColorMode") || "solid",
    profileColor2: getProfileInputValue_("profileColor2") || "#354785",
    profileGradientAngle: getProfileInputValue_("profileGradientAngle") || "135",
    bio: getProfileInputValue_("profileBio")
  };

  const saveButton = document.getElementById("profileSaveButton");
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
  }

  showProfileMessage_("Saving profile…", "success");

  try {

    const res = await apiSaveEditableProfile(payload);

    if (!res || !res.success) {
      throw new Error(
        res && (res.message || res.error)
          ? (res.message || res.error)
          : "Could not save profile."
      );
    }

    APP_STATE.profile = res.profile;
    APP_STATE.profileData = res;

    applyProfileColor_(res.profile || {});
    updateHeaderProfile(res.profile);

    showProfileMessage_(
      scope === "general"
        ? "General profile saved ✓"
        : scope === "season"
          ? "League / season profile saved ✓"
          : "Game profile saved ✓",
      "success"
    );

    const context = getProfileEditContext_();

    if (scope === "general" || context.onboarding) {
      clearProfileEditContext_();
      window.setTimeout(function() {
        navigate("dashboard");
      }, 260);
      return;
    }

    if (context.gameId) {
      try {
        const promptKey =
          "gameProfilePrompt:" +
          String(username || "").trim().toLowerCase() +
          ":" +
          String(context.gameId || "").trim();
        localStorage.setItem(promptKey, "done");
      } catch (err) {}

      clearProfileEditContext_();
      window.setTimeout(function() {
        if (typeof enterGame === "function") {
          enterGame(
            context.gameId,
            context.gameType,
            context.leagueId,
            context.gameRole,
            context.hubMode
          );
        } else {
          navigate("dashboard");
        }
      }, 260);
      return;
    }

    window.setTimeout(function() {
      navigate("dashboard");
    }, 260);

  } catch (err) {

    showProfileMessage_(
      err && err.message ? err.message : "Could not save profile.",
      "error"
    );

    if (saveButton) {
      saveButton.disabled = false;
      updateProfileSaveButtonLabel_();
    }
  }

}

function updateProfileSaveButtonLabel_() {

  const button = document.getElementById("profileSaveButton");
  if (!button) return;

  const context = getProfileEditContext_();

  if (context.gameId) {
    const game = profileFindGame_(APP_STATE.profileGames || [], context.gameId);
    const name = game ? getGameNameFromGame_(game) : context.gameId;
    button.textContent = "Save & Continue to " + (name || "Game");
  } else {
    button.textContent = "Save Profile & Return Home";
  }
}

/* ======================
   FORM POPULATION / PREVIEW
====================== */

function populateProfileForm_(
  profile,
  useDefaults
) {

  profile =
    profile || {};

  useDefaults =
    useDefaults !== false;

  setProfileInputValue_(
    "profileDisplayName",
    profile.displayName || ""
  );

  setProfileInputValue_(
    "profileRealName",
    profile.realName || ""
  );

  setProfileInputValue_(
    "profileAvatarType",
    profile.avatarType || "initials"
  );

  setProfileInputValue_(
    "profileAvatarInitials",
    profile.avatarInitials || ""
  );

  setProfileInputValue_(
    "profileAvatarEmoji",
    profile.avatarEmoji || (useDefaults ? PROFILE_DEFAULT_EMOJI : "")
  );

  setProfileInputValue_(
    "profileAvatarUrl",
    profile.avatarUrl || ""
  );

  setProfileInputValue_(
    "profileAvatarFileId",
    profile.avatarFileId || ""
  );

  setProfileInputValue_(
    "profileColor",
    profile.profileColor || PROFILE_DEFAULT_COLOR
  );

  setProfileInputValue_(
    "profileColorMode",
    profile.profileColorMode || "solid"
  );

  setProfileInputValue_(
    "profileColor2",
    profile.profileColor2 || "#354785"
  );

  setProfileInputValue_(
    "profileGradientAngle",
    profile.profileGradientAngle || "135"
  );

  setProfileInputValue_(
    "profileBio",
    profile.bio || ""
  );

  const fileInput =
    document.getElementById(
      "profileAvatarFile"
    );

  if (fileInput) {
    fileInput.value = "";
  }
  APP_STATE.profilePreparedAvatar = null;
  profileSetUploadStatus_("", "");
  profileSetUploadPreview_(
    String(profile.avatarType || "").toLowerCase() === "upload"
      ? (profile.avatarUrl || "")
      : ""
  );

  updateAvatarOptionVisibility_();
  updateProfileStyleVisibility_();
  updateProfileGradientAngleLabel_();
  updateProfilePreview();

}

function updateAvatarOptionVisibility_() {

  const type =
    getProfileInputValue_(
      "profileAvatarType"
    ) || "initials";

  [
    "Initials",
    "Emoji",
    "Url",
    "Upload"
  ].forEach(name => {

    const el =
      document.getElementById(
        "profileAvatar" + name + "Wrap"
      );

    if (el) {

      el.classList.toggle(
        "hidden",
        name.toLowerCase() !== type
      );

    }

  });

}

function updateProfileStyleVisibility_() {

  const mode = getProfileInputValue_("profileColorMode") || "solid";
  const color2 = document.getElementById("profileColor2Wrap");
  const angle = document.getElementById("profileGradientAngleWrap");

  if (color2) color2.classList.toggle("hidden", mode !== "gradient");
  if (angle) angle.classList.toggle("hidden", mode !== "gradient");
}

function updateProfileGradientAngleLabel_() {
  const input = document.getElementById("profileGradientAngle");
  const label = document.getElementById("profileGradientAngleLabel");
  if (input && label) label.textContent = String(input.value || "135") + "°";
}

function profilePreviewBackground_(profile) {
  profile = profile || {};
  const color1 = /^#[0-9a-f]{6}$/i.test(String(profile.profileColor || ""))
    ? profile.profileColor
    : PROFILE_DEFAULT_COLOR;
  const color2 = /^#[0-9a-f]{6}$/i.test(String(profile.profileColor2 || ""))
    ? profile.profileColor2
    : "#354785";
  const angle = Math.max(0, Math.min(360, Number(profile.profileGradientAngle || 135)));

  return String(profile.profileColorMode || "solid").toLowerCase() === "gradient"
    ? "linear-gradient(" + angle + "deg, " + color1 + ", " + color2 + ")"
    : color1;
}

function updateProfilePreview() {

  const formProfile = {
    username: getSessionSafe_().username || "",
    gameId: getProfileSelectedGameId_(),
    displayName: getProfileInputValue_("profileDisplayName"),
    realName: getProfileInputValue_("profileRealName"),
    avatarType: getProfileInputValue_("profileAvatarType") || "initials",
    avatarInitials: getProfileInputValue_("profileAvatarInitials"),
    avatarEmoji: getProfileInputValue_("profileAvatarEmoji"),
    avatarUrl: getProfileInputValue_("profileAvatarUrl"),
    avatarFileId: getProfileInputValue_("profileAvatarFileId"),
    profileColor: getProfileInputValue_("profileColor") || PROFILE_DEFAULT_COLOR,
    profileColorMode: getProfileInputValue_("profileColorMode") || "solid",
    profileColor2: getProfileInputValue_("profileColor2") || "#354785",
    profileGradientAngle: getProfileInputValue_("profileGradientAngle") || "135",
    bio: getProfileInputValue_("profileBio")
  };

  const scope = getProfileEffectiveScope_();

  const data =
    APP_STATE.profileData || {};

  const profile =
    scope === "game" || scope === "season"
      ? mergeProfilePreview_(
          data.generalProfile || data.profile || getProfileFallback_(formProfile.username, formProfile.gameId),
          formProfile
        )
      : mergeProfilePreview_(
          getProfileFallback_(formProfile.username, formProfile.gameId),
          formProfile
        );

  const name = document.getElementById("profilePreviewName");
  const bio = document.getElementById("profilePreviewBio");
  const avatar = document.getElementById("profilePreviewAvatar");
  const card = document.getElementById("profileCardPreview");

  if (name) {
    name.innerText = profile.displayName || profile.username || "Profile";
  }

  if (bio) {
    bio.innerText = profile.bio || "";
    bio.classList.toggle("hidden", !profile.bio);
  }

  if (avatar) {
    avatar.style.setProperty("--profile-color", profile.profileColor || PROFILE_DEFAULT_COLOR);
    avatar.style.background = profilePreviewBackground_(profile);
    avatar.innerHTML = renderProfileAvatar_(profile);
  }

  if (card) {
    card.style.background = profilePreviewBackground_(profile);
  }

  const miniAvatar = `
    <span class="profile-mini-avatar" style="background:${escapeProfileAttr_(profilePreviewBackground_(profile))}">
      ${renderProfileAvatar_(profile)}
    </span>
  `;

  const displayName = escapeProfileHtml_(profile.displayName || profile.username || "Player");
  const note = profile.bio ? `<small>${escapeProfileHtml_(profile.bio)}</small>` : "";

  const appPreview = document.getElementById("profileAppPreviewMini");
  if (appPreview) {
    appPreview.innerHTML = `${miniAvatar}<span><strong>${displayName}</strong>${note}</span>`;
    appPreview.style.background = profilePreviewBackground_(profile);
  }

  const leaderboardPreview = document.getElementById("profileLeaderboardPreviewMini");
  if (leaderboardPreview) {
    leaderboardPreview.innerHTML = `<span class="profile-preview-rank">#3</span>${miniAvatar}<span><strong>${displayName}</strong><small>84 pts</small></span>`;
  }

  const compactPreview = document.getElementById("profileCompactPreviewMini");
  if (compactPreview) {
    compactPreview.innerHTML = `${miniAvatar}<strong>${displayName}</strong>`;
  }

  applyProfileColor_(profile);

}

function mergeProfilePreview_(
  baseProfile,
  overrideProfile
) {

  const merged =
    Object.assign(
      {},
      baseProfile || {}
    );

  [
    "username",
    "gameId",
    "displayName",
    "realName",
    "avatarType",
    "avatarInitials",
    "avatarEmoji",
    "avatarUrl",
    "avatarFileId",
    "profileColor",
    "profileColorMode",
    "profileColor2",
    "profileGradientAngle",
    "bio"
  ].forEach(key => {

    const value =
      overrideProfile && overrideProfile[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {

      merged[key] = value;

    }

  });

  if (!merged.avatarType) {
    merged.avatarType = "initials";
  }

  if (!merged.avatarEmoji) {
    merged.avatarEmoji = PROFILE_DEFAULT_EMOJI;
  }

  if (!merged.profileColor) {
    merged.profileColor = PROFILE_DEFAULT_COLOR;
  }

  if (!merged.profileColorMode) {
    merged.profileColorMode = "solid";
  }

  if (!merged.profileColor2) {
    merged.profileColor2 = "#354785";
  }

  if (!merged.profileGradientAngle) {
    merged.profileGradientAngle = "135";
  }

  if (!merged.avatarInitials) {
    merged.avatarInitials =
      buildProfileInitials_(
        merged.realName ||
        merged.displayName ||
        merged.username ||
        "Player"
      );
  }

  return merged;

}

/* ======================
   HEADER PROFILE
====================== */

function updateHeaderProfile(
  profile
) {

  const headerUser =
    document.getElementById(
      "headerUser"
    );

  if (!headerUser || !profile) {
    return;
  }

  const resolvedProfile =
    mergeProfilePreview_(
      getProfileFallback_(
        profile.username || "User",
        profile.gameId || ""
      ),
      profile
    );

  applyProfileColor_(resolvedProfile);

  headerUser.classList.add(
    "header-user-profiled"
  );

  headerUser.style.setProperty(
    "--profile-color",
    resolvedProfile.profileColor || PROFILE_DEFAULT_COLOR
  );
  headerUser.style.setProperty(
    "--profile-background",
    profilePreviewBackground_(resolvedProfile)
  );

  headerUser.innerHTML = `
    <span
      class="header-profile-avatar"
      style="--profile-color:${escapeProfileAttr_(resolvedProfile.profileColor || PROFILE_DEFAULT_COLOR)};background:${escapeProfileAttr_(profilePreviewBackground_(resolvedProfile))};"
    >
      ${renderProfileAvatar_(resolvedProfile)}
    </span>
    <span class="header-profile-name">
      ${escapeProfileHtml_(resolvedProfile.displayName || resolvedProfile.username || "User")}
    </span>
  `;

  headerUser.title =
    "Profile";

  headerUser.onclick =
    function() {

      if (typeof navigate === "function") {
        navigate("profile");
      }

    };

}

async function loadActiveProfile() {

  const session =
    getSessionSafe_();

  if (!session || !session.username) {
    return;
  }

  if (
    APP_STATE.profile &&
    APP_STATE.profileData &&
    APP_STATE.profileData.username === session.username
  ) {

    updateHeaderProfile(
      APP_STATE.profile
    );

    return;

  }

  const gameId =
    getProfileGameId_(
      APP_STATE.profileGames || []
    );

  const res =
    await apiGetEditableProfile(
      session.username,
      gameId
    );

  if (res && res.success) {

    APP_STATE.profile =
      res.profile;

    APP_STATE.profileData =
      Object.assign(
        {},
        res,
        {
          username: session.username,
          gameId: gameId
        }
      );

    updateHeaderProfile(
      res.profile
    );

  } else {

    updateHeaderProfile(
      getProfileFallback_(
        session.username,
        gameId
      )
    );

  }

}

function applyProfileColor_(profileOrColor) {

  const profile =
    profileOrColor && typeof profileOrColor === "object"
      ? profileOrColor
      : { profileColor: profileOrColor };

  const safeColor = /^#[0-9a-f]{6}$/i.test(String(profile.profileColor || ""))
    ? profile.profileColor
    : PROFILE_DEFAULT_COLOR;
  const safeColor2 = /^#[0-9a-f]{6}$/i.test(String(profile.profileColor2 || ""))
    ? profile.profileColor2
    : "#354785";
  const angle = Math.max(0, Math.min(360, Number(profile.profileGradientAngle || 135)));
  const mode = String(profile.profileColorMode || "solid").toLowerCase() === "gradient"
    ? "gradient"
    : "solid";
  const background = mode === "gradient"
    ? "linear-gradient(" + angle + "deg, " + safeColor + ", " + safeColor2 + ")"
    : safeColor;

  document.documentElement.style.setProperty("--profile-color", safeColor);
  document.documentElement.style.setProperty("--profile-color2", safeColor2);
  document.documentElement.style.setProperty("--profile-gradient-angle", angle + "deg");
  document.documentElement.style.setProperty("--profile-background", background);
}

/* ======================
   AVATAR RENDER
====================== */

function renderProfileAvatar_(
  profile
) {

  profile =
    mergeProfilePreview_(
      getProfileFallback_("", ""),
      profile || {}
    );

  const type =
    profile.avatarType || "initials";

  if (
    (type === "url" || type === "upload") &&
    profile.avatarUrl
  ) {

    const url =
      String(profile.avatarUrl || "");

    if (
      /^data:image\//i.test(url) ||
      /^https:\/\//i.test(url)
    ) {

      return `
        ${platformImgHtml(url, { className: "profile-avatar-img", variant: "avatar", alt: "Profile image" })}
      `;

    }

  }

  if (type === "emoji") {

    return escapeProfileHtml_(
      profile.avatarEmoji || PROFILE_DEFAULT_EMOJI
    );

  }

  return `
    <span class="profile-avatar-initials">
      ${escapeProfileHtml_(profile.avatarInitials || buildProfileInitials_(profile.realName || profile.displayName || "P"))}
    </span>
  `;

}

/* ======================
   GAMES HELPERS
====================== */

async function loadProfilePlayableGames_() {

  if (
    APP_STATE.profileGames &&
    Array.isArray(APP_STATE.profileGames) &&
    APP_STATE.profileGames.length
  ) {

    return APP_STATE.profileGames;

  }

  if (typeof apiGetActiveGames !== "function") {
    return [];
  }

  const res =
    await apiGetActiveGames();

  const games =
    res && Array.isArray(res.games)
      ? res.games
      : [];

  APP_STATE.profileGames =
    games;

  if (res && res.currentGameId && !APP_STATE.gameId) {
    APP_STATE.gameId = res.currentGameId;
  }

  if (res && res.defaultGameId && !APP_STATE.gameId) {
    APP_STATE.gameId = res.defaultGameId;
  }

  return games;

}

function getProfileGameId_(
  games
) {

  if (
    typeof getFrontendGameId === "function"
  ) {

    const frontendGameId =
      getFrontendGameId();

    if (frontendGameId) {
      return frontendGameId;
    }

  }

  if (
    typeof APP_STATE !== "undefined" &&
    APP_STATE.gameId
  ) {
    return APP_STATE.gameId;
  }

  const session =
    getSessionSafe_();

  const stored =
    session.gameId ||
    localStorage.getItem("activeGameId") ||
    localStorage.getItem("gameId") ||
    "";

  if (stored) {
    return stored;
  }

  games =
    Array.isArray(games)
      ? games
      : [];

  if (games.length) {
    return getGameIdFromGame_(games[0]);
  }

  return "";

}

function getProfileSelectedGameId_() {

  const select =
    document.getElementById(
      "profileGameId"
    );

  if (select && select.value) {
    return select.value;
  }

  return getProfileGameId_(
    APP_STATE.profileGames || []
  );

}

function getGameIdFromGame_(
  game
) {

  return String(
    game.GameId ||
    game.gameId ||
    game.id ||
    game.ID ||
    ""
  ).trim();

}

function getGameNameFromGame_(
  game
) {

  const gameId =
    getGameIdFromGame_(game);

  const name =
    game.Name ||
    game.name ||
    game.GameName ||
    game.title ||
    gameId ||
    "Game";

  const year =
    game.Year ||
    game.year ||
    "";

  return year && String(name).indexOf(String(year)) === -1
    ? name + " " + year
    : name;

}

/* ======================
   GENERAL HELPERS
====================== */

function getProfileFallback_(
  username,
  gameId
) {

  return {
    username: username || "",
    gameId: gameId || "",
    displayName: username || "Player",
    realName: "",
    avatarType: "initials",
    avatarInitials: buildProfileInitials_(username || "Player"),
    avatarEmoji: PROFILE_DEFAULT_EMOJI,
    avatarUrl: "",
    avatarFileId: "",
    profileColor: PROFILE_DEFAULT_COLOR,
    bio: ""
  };

}

function buildProfileInitials_(
  value
) {

  const words =
    String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!words.length) {
    return "P";
  }

  if (words.length === 1) {

    return words[0]
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase() || "P";

  }

  return (
    words[0].charAt(0) +
    words[words.length - 1].charAt(0)
  )
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase() || "P";

}

function readProfileFileAsDataUrl_(
  file
) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload =
      function(event) {
        resolve(event.target.result);
      };

    reader.onerror =
      function() {
        reject(
          new Error("Could not read avatar image.")
        );
      };

    reader.readAsDataURL(
      file
    );

  });

}

function getSessionSafe_() {

  if (typeof getSession === "function") {
    return getSession() || {};
  }

  try {
    return JSON.parse(
      localStorage.getItem("session") || "{}"
    ) || {};
  } catch (err) {
    return {};
  }

}

function getProfileInputValue_(
  id
) {

  const el =
    document.getElementById(id);

  return el && el.value !== undefined
    ? String(el.value).trim()
    : "";

}

function setProfileInputValue_(
  id,
  value
) {

  const el =
    document.getElementById(id);

  if (el) {
    el.value = value || "";
  }

}

function showProfileMessage_(
  message,
  type
) {

  const msg =
    document.getElementById(
      "profileMessage"
    );

  if (!msg) {
    return;
  }

  msg.innerText =
    message || "";

  msg.className =
    "profile-message " + (type || "success");

}

function clearProfileMessage_() {

  const msg =
    document.getElementById(
      "profileMessage"
    );

  if (!msg) {
    return;
  }

  msg.innerText = "";
  msg.className = "profile-message hidden";

}

function escapeProfileHtml_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function escapeProfileAttr_(value) {

  return escapeProfileHtml_(
    value
  );

}

/* ======================
   AUTO HEADER REFRESH
   This makes the header update even if app.js does not call loadActiveProfile yet.
====================== */

(function installProfileAutoHeaderRefresh_() {

  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("DOMContentLoaded", () => {

    setTimeout(() => {

      if (typeof loadActiveProfile === "function") {
        loadActiveProfile();
      }

    }, 150);

  });

  window.addEventListener("hashchange", () => {

    setTimeout(() => {

      if (typeof loadActiveProfile === "function") {
        loadActiveProfile();
      }

    }, 150);

  });

})();


/* ======================
   ARCHIVED CAREER HISTORY
====================== */

function renderProfileHistorySection_(history, username) {

  history = history || {};

  if (history.success === false) {
    return `
      <section class="card profile-history-card">
        <div class="profile-history-heading-row">
          <div>
            <h2>Career History</h2>
            <p>Archived games, picks, leaderboards, and fun facts.</p>
          </div>
        </div>
        <div class="profile-history-empty">
          Historical stats could not be loaded right now.
        </div>
      </section>
    `;
  }

  const summary = history.summary || {};
  const games = Array.isArray(history.games)
    ? history.games
    : [];

  if (!games.length) {
    return `
      <section class="card profile-history-card">
        <div class="profile-history-heading-row">
          <div>
            <h2>Career History</h2>
            <p>Archived games, picks, leaderboards, and fun facts.</p>
          </div>
        </div>
        <div class="profile-history-empty">
          No archived game history yet. Completed archived games will appear here automatically.
        </div>
      </section>
    `;
  }

  const funFacts = Array.isArray(summary.funFacts)
    ? summary.funFacts
    : [];

  return `
    <section class="card profile-history-card">
      <div class="profile-history-heading-row">
        <div>
          <h2>Career History</h2>
          <p>Read-only results from verified game archives.</p>
        </div>
        <span class="profile-history-badge">
          ${escapeProfileHtml_(summary.archivedGames || games.length)} games
        </span>
      </div>

      <div class="profile-history-stats">
        ${renderProfileHistoryStat_("Accuracy", formatProfileHistoryPercent_(summary.accuracy))}
        ${renderProfileHistoryStat_("Correct", summary.correctPicks || 0)}
        ${renderProfileHistoryStat_("1st Place", summary.firstPlaceFinishes || 0)}
        ${renderProfileHistoryStat_("Best Streak", summary.longestCorrectStreak || 0)}
        ${renderProfileHistoryStat_("Prediction Pts", formatProfileHistoryNumber_(summary.totalPredictionPoints || 0))}
        ${renderProfileHistoryStat_("Wager Net", formatProfileHistorySigned_(summary.totalWagerNet || 0))}
      </div>

      ${funFacts.length ? `
        <div class="profile-history-fun-facts">
          <h3>Fun Facts</h3>
          <ul>
            ${funFacts.map(function(fact) {
              return `<li>${escapeProfileHtml_(fact)}</li>`;
            }).join("")}
          </ul>
        </div>
      ` : ""}

      <div class="profile-history-games">
        ${games.map(function(game) {
          return renderProfileHistoryGameCard_(game, username);
        }).join("")}
      </div>
    </section>
  `;

}

function renderProfileHistoryStat_(label, value) {

  return `
    <div class="profile-history-stat">
      <strong>${escapeProfileHtml_(value)}</strong>
      <span>${escapeProfileHtml_(label)}</span>
    </div>
  `;

}

function renderProfileHistoryGameCard_(game, username) {

  game = game || {};

  const gameId =
    String(game.gameId || "").trim();

  const detailId =
    "archiveHistoryDetail_" +
    gameId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const rankText =
    game.rank
      ? "#" + game.rank +
        (game.totalPlayers ? " of " + game.totalPlayers : "")
      : "No rank";

  return `
    <article class="profile-history-game">
      <div class="profile-history-game-main">
        <div>
          <h3>${escapeProfileHtml_(game.name || gameId)}</h3>
          <div class="profile-history-game-meta">
            ${escapeProfileHtml_(game.year || "")}
            · ${escapeProfileHtml_(rankText)}
            · ${escapeProfileHtml_(formatProfileHistoryPercent_(game.accuracy))}
          </div>
        </div>

        <button
          type="button"
          class="button profile-history-view-button"
          data-game-id="${escapeProfileAttr_(gameId)}"
          data-username="${escapeProfileAttr_(username || "")}"
          data-target-id="${escapeProfileAttr_(detailId)}"
          onclick="loadArchivedGameHistory_(this)"
        >
          View History
        </button>
      </div>

      <div class="profile-history-game-summary">
        <span>${escapeProfileHtml_(game.correctPicks || 0)} correct</span>
        <span>${escapeProfileHtml_(formatProfileHistoryNumber_(game.totalScore || 0))} score</span>
        ${Number(game.bets || 0) > 0
          ? `<span>${escapeProfileHtml_(formatProfileHistorySigned_(game.wagerNet || 0))} wagers</span>`
          : ""}
      </div>

      <div
        id="${escapeProfileAttr_(detailId)}"
        class="profile-history-detail hidden"
      ></div>
    </article>
  `;

}

async function loadArchivedGameHistory_(button) {

  if (!button) {
    return;
  }

  const gameId =
    String(button.dataset.gameId || "").trim();

  const username =
    String(button.dataset.username || "").trim();

  const target =
    document.getElementById(
      button.dataset.targetId || ""
    );

  if (!gameId || !target) {
    return;
  }

  if (target.dataset.loaded === "true") {
    const willShow =
      target.classList.contains("hidden");

    target.classList.toggle("hidden");
    button.textContent = willShow
      ? "Hide History"
      : "View History";
    return;
  }

  button.disabled = true;
  button.textContent = "Loading…";
  target.classList.remove("hidden");
  target.innerHTML = `
    <div class="profile-history-loading">
      Loading archived picks and leaderboard…
    </div>
  `;

  const response =
    await apiGetArchivedGameHistory(
      gameId,
      username
    );

  button.disabled = false;

  if (!response || response.success === false) {
    button.textContent = "Try Again";
    target.innerHTML = `
      <div class="profile-history-error">
        ${escapeProfileHtml_(
          response && (response.message || response.error)
            ? response.message || response.error
            : "Could not load archived history."
        )}
      </div>
    `;
    return;
  }

  target.dataset.loaded = "true";
  button.textContent = "Hide History";
  target.innerHTML =
    renderArchivedGameDetail_(response);

}

function renderArchivedGameDetail_(response) {

  const user = response.user || {};
  const picks = Array.isArray(user.picks)
    ? user.picks
    : [];
  const leaderboard = Array.isArray(response.leaderboard)
    ? response.leaderboard
    : [];
  const wagerLeaderboard = Array.isArray(response.wagerLeaderboard)
    ? response.wagerLeaderboard
    : [];

  return `
    <div class="profile-history-detail-grid">
      <section>
        <h4>Final Leaderboard</h4>
        <div class="profile-history-leaderboard">
          ${leaderboard.length
            ? leaderboard.map(function(row) {
                return `
                  <div class="profile-history-leaderboard-row ${
                    archiveHistoryUsernameMatches_(row.username, user.username)
                      ? "is-current-user"
                      : ""
                  }">
                    <strong>#${escapeProfileHtml_(row.rank || "-")}</strong>
                    <span>${escapeProfileHtml_(row.displayName || row.username)}</span>
                    <b>${escapeProfileHtml_(formatProfileHistoryNumber_(row.totalScore || 0))}</b>
                  </div>
                `;
              }).join("")
            : `<div class="profile-history-empty-small">No prediction leaderboard rows.</div>`}
        </div>
      </section>

      ${wagerLeaderboard.length ? `
        <section>
          <h4>Wager Leaderboard</h4>
          <div class="profile-history-leaderboard">
            ${wagerLeaderboard.map(function(row) {
              return `
                <div class="profile-history-leaderboard-row ${
                  archiveHistoryUsernameMatches_(row.username, user.username)
                    ? "is-current-user"
                    : ""
                }">
                  <strong>#${escapeProfileHtml_(row.rank || "-")}</strong>
                  <span>${escapeProfileHtml_(row.displayName || row.username)}</span>
                  <b>${escapeProfileHtml_(formatProfileHistorySigned_(row.net || 0))}</b>
                </div>
              `;
            }).join("")}
          </div>
        </section>
      ` : ""}
    </div>

    <section class="profile-history-picks-section">
      <h4>My Archived Picks</h4>
      <div class="profile-history-picks">
        ${picks.length
          ? picks.map(renderArchivedPickRow_).join("")
          : `<div class="profile-history-empty-small">No archived picks for this user.</div>`}
      </div>
    </section>
  `;

}

function renderArchivedPickRow_(pick) {

  pick = pick || {};

  const status =
    String(pick.status || "pending")
      .trim()
      .toLowerCase();

  const statusLabel =
    status === "correct"
      ? "Correct"
      : status === "wrong"
        ? "Wrong"
        : status === "push"
          ? "Push"
          : "Pending";

  return `
    <div class="profile-history-pick is-${escapeProfileAttr_(status)}">
      <div class="profile-history-pick-copy">
        <strong>${escapeProfileHtml_(pick.question || pick.categoryId)}</strong>
        <span>Your pick: ${escapeProfileHtml_(pick.selectedOption || pick.selectedNomineeId || "—")}</span>
        <span>Result: ${escapeProfileHtml_(pick.winnerOption || "—")}</span>
      </div>
      <div class="profile-history-pick-result">
        <b>${escapeProfileHtml_(statusLabel)}</b>
        ${Number(pick.pointsEarned || 0) !== 0
          ? `<span>${escapeProfileHtml_(formatProfileHistorySigned_(pick.pointsEarned))} pts</span>`
          : ""}
      </div>
    </div>
  `;

}

function archiveHistoryUsernameMatches_(left, right) {

  return String(left || "")
    .trim()
    .toLowerCase() ===
    String(right || "")
      .trim()
      .toLowerCase();

}

function formatProfileHistoryPercent_(value) {

  const number = Number(value || 0);

  return (
    Math.round(number * 10) / 10
  ) + "%";

}

function formatProfileHistoryNumber_(value) {

  const number = Number(value || 0);

  return Number.isInteger(number)
    ? String(number)
    : String(Math.round(number * 100) / 100);

}

function formatProfileHistorySigned_(value) {

  const number = Number(value || 0);
  const formatted = formatProfileHistoryNumber_(number);

  return number > 0
    ? "+" + formatted
    : formatted;

}
