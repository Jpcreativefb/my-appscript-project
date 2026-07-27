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

  const session =
    getSessionSafe_();

  const username =
    session && session.username
      ? session.username
      : "";

  const playableGames =
    await loadProfilePlayableGames_();

  const currentGameId =
    getProfileGameId_(
      playableGames
    );

  const profileRequests =
    await Promise.all([
      apiGetEditableProfile(
        username,
        currentGameId
      ),
      username
        ? apiGetUserProfileHistory(username, "")
        : Promise.resolve({
            success: true,
            summary: { archivedGames: 0 },
            games: []
          })
    ]);

  const res =
    profileRequests[0];

  const historyRes =
    profileRequests[1] || {
      success: true,
      summary: { archivedGames: 0 },
      games: []
    };

  APP_STATE.profileHistory =
    historyRes;

  const profile =
    res && res.success
      ? res.profile
      : getProfileFallback_(
          username,
          currentGameId
        );

  APP_STATE.profile =
    profile;

  APP_STATE.profileData =
    res && res.success
      ? res
      : {
          success: true,
          profile: profile,
          generalProfile: profile,
          gameProfile: {}
        };

  APP_STATE.profileGames =
    playableGames;

  applyProfileColor_(
    profile.profileColor
  );

  setTimeout(() => {

    populateProfileGameSelect_(
      playableGames,
      currentGameId
    );

    populateProfileForm_(
      APP_STATE.profileData.generalProfile || profile,
      true
    );

    updateProfileGameVisibility_();
    updateProfilePreview();

  }, 0);

  return `
    <div class="page profile-page">

      <div class="profile-page-title-row">
        <div>
          <h1>Profile</h1>
          <p class="profile-page-subtitle">
            Edit your default profile or create a profile just for one game.
          </p>
        </div>
        <button class="button secondary" type="button" onclick="navigate('history')">
          Archived Games
        </button>
      </div>

      <div class="profile-card-preview">

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

          <div id="profilePreviewSub" class="profile-preview-sub">
            ${escapeProfileHtml_(profile.realName || username || "")}
          </div>

          <div id="profilePreviewBio" class="profile-preview-bio">
            ${escapeProfileHtml_(profile.bio || "")}
          </div>
        </div>

      </div>

      ${renderProfileHistorySection_(historyRes, username)}

      <div class="card profile-form-card">

        <label class="profile-label" for="profileScope">
          Profile to edit
        </label>

        <select
          id="profileScope"
          class="input profile-input"
          onchange="onProfileScopeChange()"
        >
          <option value="general">General profile</option>
          <option value="game">Game-specific profile</option>
        </select>

        <div class="profile-help">
          General is your default across every game. Game-specific profile overrides the default only for the selected game. Blank game fields fall back to your general profile.
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

          <div class="profile-help">
            This list shows playable games from the active games endpoint.
          </div>
        </div>

        <label class="profile-label" for="profileDisplayName">
          Display name
        </label>
        <input
          id="profileDisplayName"
          class="input profile-input"
          maxlength="40"
          placeholder="Name shown in the app"
          oninput="updateProfilePreview()"
        >

        <label class="profile-label" for="profileRealName">
          Real name
        </label>
        <input
          id="profileRealName"
          class="input profile-input"
          maxlength="60"
          placeholder="Optional real name"
          oninput="updateProfilePreview()"
        >

        <label class="profile-label" for="profileAvatarType">
          Avatar style
        </label>
        <select
          id="profileAvatarType"
          class="input profile-input"
          onchange="onProfileAvatarTypeChange()"
        >
          <option value="initials">Initials</option>
          <option value="emoji">Emoji / generic icon</option>
          <option value="url">Image from internet</option>
          <option value="upload">Upload photo</option>
        </select>

        <div
          id="profileAvatarInitialsWrap"
          class="profile-avatar-option"
        >
          <label class="profile-label" for="profileAvatarInitials">
            Initials
          </label>
          <input
            id="profileAvatarInitials"
            class="input profile-input"
            maxlength="4"
            placeholder="Auto from first and last name"
            oninput="updateProfilePreview()"
          >
          <div class="profile-help">
            Leave blank to auto-create from your first and last name.
          </div>
        </div>

        <div
          id="profileAvatarEmojiWrap"
          class="profile-avatar-option"
        >
          <label class="profile-label" for="profileAvatarEmoji">
            Avatar emoji / generic icon
          </label>
          <input
            id="profileAvatarEmoji"
            class="input profile-input"
            maxlength="8"
            placeholder="🏆"
            oninput="updateProfilePreview()"
          >
        </div>

        <div
          id="profileAvatarUrlWrap"
          class="profile-avatar-option"
        >
          <label class="profile-label" for="profileAvatarUrl">
            Avatar image URL
          </label>
          <input
            id="profileAvatarUrl"
            class="input profile-input"
            placeholder="https://example.com/photo.jpg"
            oninput="updateProfilePreview()"
          >
          <div class="profile-help">
            Use a public https image URL.
          </div>
        </div>

        <div
          id="profileAvatarUploadWrap"
          class="profile-avatar-option"
        >
          <label class="profile-label" for="profileAvatarFile">
            Upload photo
          </label>
          <input
            id="profileAvatarFile"
            class="input profile-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onchange="onProfileUploadPreview()"
          >
          <input
            id="profileAvatarFileId"
            type="hidden"
          >
          <div class="profile-help">
            JPG, PNG, WEBP, or GIF. Keep it under 2 MB.
          </div>
        </div>

        <label class="profile-label" for="profileColor">
          Profile color
        </label>
        <input
          id="profileColor"
          class="input profile-color-input"
          type="color"
          value="${escapeProfileAttr_(profile.profileColor || PROFILE_DEFAULT_COLOR)}"
          oninput="updateProfilePreview()"
        >
        <div class="profile-help">
          This changes the initials avatar color, profile preview accent, and header profile chip.
        </div>

        <label class="profile-label" for="profileBio">
          Short profile note
        </label>
        <textarea
          id="profileBio"
          class="input profile-textarea"
          maxlength="160"
          placeholder="Example: Awards nerd, risky bettor, movie lover."
          oninput="updateProfilePreview()"
        ></textarea>

        <button
          class="button profile-save-button"
          onclick="saveProfileForm()"
        >
          Save Profile
        </button>

        <div
          id="profileMessage"
          class="profile-message hidden"
        ></div>

      </div>

    </div>
  `;

}

/* ======================
   PROFILE SCOPE / GAME
====================== */

function onProfileScopeChange() {

  updateProfileGameVisibility_();

  const scope =
    getProfileInputValue_(
      "profileScope"
    ) || "general";

  const data =
    APP_STATE.profileData || {};

  const selectedProfile =
    scope === "game"
      ? (data.gameProfile || {})
      : (data.generalProfile || data.profile || {});

  populateProfileForm_(
    selectedProfile,
    scope !== "game"
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

  APP_STATE.profileData =
    res;

  const scope =
    getProfileInputValue_(
      "profileScope"
    ) || "general";

  populateProfileForm_(
    scope === "game"
      ? (res.gameProfile || {})
      : (res.generalProfile || res.profile || {}),
    scope !== "game"
  );

  updateProfilePreview();
  clearProfileMessage_();

}

function updateProfileGameVisibility_() {

  const scope =
    getProfileInputValue_(
      "profileScope"
    ) || "general";

  const wrap =
    document.getElementById(
      "profileGameSelectWrap"
    );

  if (wrap) {
    wrap.classList.toggle(
      "hidden",
      scope !== "game"
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

function onProfileUploadPreview() {

  const fileInput =
    document.getElementById(
      "profileAvatarFile"
    );

  const file =
    fileInput && fileInput.files && fileInput.files[0]
      ? fileInput.files[0]
      : null;

  if (!file) {
    updateProfilePreview();
    return;
  }

  if (file.size > 2 * 1024 * 1024) {

    showProfileMessage_(
      "Avatar image must be 2 MB or smaller.",
      "error"
    );

    fileInput.value = "";
    return;

  }

  const reader =
    new FileReader();

  reader.onload =
    function(event) {

      setProfileInputValue_(
        "profileAvatarUrl",
        event.target.result
      );

      updateProfilePreview();

    };

  reader.readAsDataURL(
    file
  );

}

/* ======================
   SAVE
====================== */

async function saveProfileForm() {

  const session =
    getSessionSafe_();

  const username =
    session && session.username
      ? session.username
      : "";

  const scope =
    getProfileInputValue_(
      "profileScope"
    ) || "general";

  const gameId =
    scope === "game"
      ? getProfileSelectedGameId_()
      : getProfileGameId_(
          APP_STATE.profileGames || []
        );

  if (!username) {

    showProfileMessage_(
      "Missing username. Please log in again.",
      "error"
    );

    return;

  }

  if (scope === "game" && !gameId) {

    showProfileMessage_(
      "Choose a game for this game-specific profile.",
      "error"
    );

    return;

  }

  const avatarType =
    getProfileInputValue_(
      "profileAvatarType"
    ) || "initials";

  clearProfileMessage_();

  let avatarUrl =
    getProfileInputValue_(
      "profileAvatarUrl"
    );

  let avatarFileId =
    getProfileInputValue_(
      "profileAvatarFileId"
    );

  if (avatarType === "url") {

    if (
      avatarUrl &&
      !/^https:\/\//i.test(avatarUrl)
    ) {

      showProfileMessage_(
        "Internet image must start with https://",
        "error"
      );

      return;

    }

  }

  if (avatarType === "upload") {

    const fileInput =
      document.getElementById(
        "profileAvatarFile"
      );

    const file =
      fileInput && fileInput.files && fileInput.files[0]
        ? fileInput.files[0]
        : null;

    if (file) {

      showProfileMessage_(
        "Uploading avatar...",
        "success"
      );

      const dataUrl =
        await readProfileFileAsDataUrl_(
          file
        );

      const uploadRes =
        await apiUploadProfileAvatar({
          username: username,
          gameId: gameId,
          scope: scope,
          fileName: file.name,
          mimeType: file.type,
          dataUrl: dataUrl
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

      avatarUrl =
        uploadRes.avatarUrl || "";

      avatarFileId =
        uploadRes.avatarFileId || "";

      setProfileInputValue_(
        "profileAvatarUrl",
        avatarUrl
      );

      setProfileInputValue_(
        "profileAvatarFileId",
        avatarFileId
      );

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
    displayName: getProfileInputValue_("profileDisplayName"),
    realName: getProfileInputValue_("profileRealName"),
    avatarType: avatarType,
    avatarInitials: getProfileInputValue_("profileAvatarInitials"),
    avatarEmoji: getProfileInputValue_("profileAvatarEmoji"),
    avatarUrl: avatarType === "url" || avatarType === "upload"
      ? avatarUrl
      : "",
    avatarFileId: avatarType === "upload"
      ? avatarFileId
      : "",
    profileColor: getProfileInputValue_("profileColor") || PROFILE_DEFAULT_COLOR,
    bio: getProfileInputValue_("profileBio")
  };

  showProfileMessage_(
    "Saving profile...",
    "success"
  );

  const res =
    await apiSaveEditableProfile(
      payload
    );

  if (!res || !res.success) {

    showProfileMessage_(
      res && (res.message || res.error)
        ? (res.message || res.error)
        : "Could not save profile.",
      "error"
    );

    return;

  }

  APP_STATE.profile =
    res.profile;

  APP_STATE.profileData =
    res;

  applyProfileColor_(
    res.profile && res.profile.profileColor
  );

  updateHeaderProfile(
    res.profile
  );

  showProfileMessage_(
    scope === "game"
      ? "Game profile saved."
      : "General profile saved.",
    "success"
  );

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

  updateAvatarOptionVisibility_();
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
    bio: getProfileInputValue_("profileBio")
  };

  const scope =
    getProfileInputValue_(
      "profileScope"
    ) || "general";

  const data =
    APP_STATE.profileData || {};

  const profile =
    scope === "game"
      ? mergeProfilePreview_(
          data.generalProfile || data.profile || getProfileFallback_(formProfile.username, formProfile.gameId),
          formProfile
        )
      : mergeProfilePreview_(
          getProfileFallback_(formProfile.username, formProfile.gameId),
          formProfile
        );

  const name =
    document.getElementById(
      "profilePreviewName"
    );

  const sub =
    document.getElementById(
      "profilePreviewSub"
    );

  const bio =
    document.getElementById(
      "profilePreviewBio"
    );

  const avatar =
    document.getElementById(
      "profilePreviewAvatar"
    );

  if (name) {
    name.innerText =
      profile.displayName || profile.username || "Profile";
  }

  if (sub) {
    sub.innerText =
      profile.realName || profile.username || "";
  }

  if (bio) {
    bio.innerText =
      profile.bio || "";
  }

  if (avatar) {

    avatar.style.setProperty(
      "--profile-color",
      profile.profileColor || PROFILE_DEFAULT_COLOR
    );

    avatar.innerHTML =
      renderProfileAvatar_(
        profile
      );

  }

  applyProfileColor_(
    profile.profileColor
  );

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

  applyProfileColor_(
    resolvedProfile.profileColor
  );

  headerUser.classList.add(
    "header-user-profiled"
  );

  headerUser.style.setProperty(
    "--profile-color",
    resolvedProfile.profileColor || PROFILE_DEFAULT_COLOR
  );

  headerUser.innerHTML = `
    <span
      class="header-profile-avatar"
      style="--profile-color:${escapeProfileAttr_(resolvedProfile.profileColor || PROFILE_DEFAULT_COLOR)};"
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

function applyProfileColor_(
  color
) {

  const safeColor =
    /^#[0-9a-f]{6}$/i.test(
      String(color || "")
    )
      ? color
      : PROFILE_DEFAULT_COLOR;

  document.documentElement.style.setProperty(
    "--profile-color",
    safeColor
  );

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
        <img
          src="${escapeProfileAttr_(url)}"
          alt=""
          class="profile-avatar-img"
        >
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
