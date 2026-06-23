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

  const res =
    await apiGetEditableProfile(
      username,
      currentGameId
    );

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
