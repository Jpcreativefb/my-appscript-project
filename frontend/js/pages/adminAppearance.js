/* =========================================================
   APPEARANCE MANAGER — v1.2.17d
   Reusable Image Packs + Theme Packs for all game types.
========================================================= */

let ADMIN_APPEARANCE_STATE = {
  games: [],
  dashboard: null,
  gameSetup: null,
  selectedGameId: "",
  selectedImagePackId: "",
  selectedThemePackId: "",
  themeNewMode: false,
  themePreviewState: "pregame",
  themePreviewDevice: "desktop",
  themePreviewSurface: "matchup",
  themeActionState: "",
  packActionState: "",
  pendingGameImagePackId: "",
  selectedHubSettingKey: "sports",
  busy: false,
  message: ""
};

function adminAppearanceEscape_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminAppearanceJs_(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function adminAppearanceKey_(value) {
  return String(value || "").trim().toLowerCase();
}

function adminAppearanceBool_(value, fallback) {
  if (value === true || value === false) return value;
  const text = adminAppearanceKey_(value);
  if (["true", "1", "yes", "on"].indexOf(text) !== -1) return true;
  if (["false", "0", "no", "off"].indexOf(text) !== -1) return false;
  return fallback === true;
}

function adminAppearanceJson_(value) {
  if (!value) return {};
  if (Object.prototype.toString.call(value) === "[object Object]") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && Object.prototype.toString.call(parsed) === "[object Object]" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function adminAppearanceDriveUrl_(fileId, size) {
  const id = String(fileId || "").trim();
  return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=" + encodeURIComponent(size || "w640") : "";
}

function adminAppearanceGameName_(game) {
  return String(game && (game.name || game.Name || game.gameName || game.GameName || game.gameId || game.GameId) || "Game").trim();
}

function adminAppearanceGameId_(game) {
  return String(game && (game.gameId || game.GameId || game.id || game.Id) || "").trim();
}

function adminAppearanceGameType_(game) {
  return String(game && (game.type || game.Type || game.gameType || game.GameType) || "").trim().toLowerCase();
}

function adminAppearanceActiveRows_(rows) {
  return (rows || []).filter(function(row) { return adminAppearanceBool_(row.Active, true); });
}

function adminAppearancePackById_(packId) {
  return adminAppearanceActiveRows_(ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.imagePacks)
    .find(function(row) { return adminAppearanceKey_(row.PackId) === adminAppearanceKey_(packId); }) || null;
}

function adminAppearanceThemeById_(themeId) {
  return adminAppearanceActiveRows_(ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.themePacks)
    .find(function(row) { return adminAppearanceKey_(row.ThemePackId) === adminAppearanceKey_(themeId); }) || null;
}

function adminAppearanceAssignment_() {
  return ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.gameAppearance || {};
}

function adminAppearanceHubRows_() {
  return adminAppearanceActiveRows_(ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.hubAppearance);
}

function adminAppearanceHubRow_(settingKey) {
  const key = adminAppearanceKey_(settingKey || ADMIN_APPEARANCE_STATE.selectedHubSettingKey || "sports");
  return adminAppearanceHubRows_().find(function(row) {
    return adminAppearanceKey_(row.SettingKey) === key;
  }) || null;
}

function adminAppearanceHubAssetUrl_(row, kind) {
  row = row || {};
  if (kind === "icon") {
    return String(row.IconUrl || "").trim() || adminAppearanceDriveUrl_(row.IconFileId, "w240");
  }
  return String(row.ImageUrl || "").trim() || adminAppearanceDriveUrl_(row.ImageFileId, "w900");
}

function adminAppearanceHubGroupLabel_(row) {
  row = row || {};
  const category = String(row.HubCategory || "").trim().toLowerCase();
  const group = String(row.HubGroup || "").trim();
  if (category === "league") {
    return "League Card — " + String(row.DisplayName || group || "League");
  }
  if (!group) {
    if (category === "home") return "Navigation — Home";
    if (category === "more") return "Navigation — More";
    return "Main Hub — " + String(row.DisplayName || category || "Hub");
  }
  const parent = category === "sports" ? "Sports" : category === "reality" ? "Reality" : category === "awards" ? "Awards" : "General";
  return "Subhub Card — " + parent + " / " + group;
}

function adminAppearanceHubOptions_() {
  const selected = adminAppearanceKey_(ADMIN_APPEARANCE_STATE.selectedHubSettingKey || "sports");
  const rows = adminAppearanceHubRows_().slice().sort(function(a, b) {
    const ak = String(a.SettingKey || "");
    const bk = String(b.SettingKey || "");
    const order = { home: 0, sports: 1, reality: 2, awards: 3, general: 4, more: 5 };
    const ao = Object.prototype.hasOwnProperty.call(order, ak) ? order[ak] : 50;
    const bo = Object.prototype.hasOwnProperty.call(order, bk) ? order[bk] : 50;
    if (ao !== bo) return ao - bo;
    return adminAppearanceHubGroupLabel_(a).localeCompare(adminAppearanceHubGroupLabel_(b));
  });
  return rows.map(function(row) {
    const key = String(row.SettingKey || "");
    return '<option value="' + adminAppearanceEscape_(key) + '"' + (adminAppearanceKey_(key) === selected ? ' selected' : '') + '>' + adminAppearanceEscape_(adminAppearanceHubGroupLabel_(row)) + '</option>';
  }).join("");
}

function adminAppearanceHubManager_() {
  const row = adminAppearanceHubRow_() || adminAppearanceHubRows_()[0] || {};
  if (!ADMIN_APPEARANCE_STATE.selectedHubSettingKey && row.SettingKey) {
    ADMIN_APPEARANCE_STATE.selectedHubSettingKey = String(row.SettingKey);
  }
  const category = String(row.HubCategory || "").toLowerCase();
  const isLeagueCard = category === "league";
  const isSubhub = !isLeagueCard && !!String(row.HubGroup || "").trim();
  const topNav = ["home", "sports", "reality", "awards", "more"].indexOf(category) !== -1 && !String(row.HubGroup || "").trim();
  const imageUrl = adminAppearanceHubAssetUrl_(row, "image");
  const iconUrl = adminAppearanceHubAssetUrl_(row, "icon");
  const color = String(row.Color || "#354785");
  const colorMode = String(row.ColorMode || "solid").toLowerCase() === "gradient" ? "gradient" : "solid";
  const gradientStart = String(row.GradientStart || color || "#354785");
  const gradientEnd = String(row.GradientEnd || color || "#20284a");
  const gradientAngle = Math.max(0, Math.min(360, Number(row.GradientAngle) || 135));
  const imageOpacity = Math.max(0, Math.min(100, row.ImageOpacity == null || row.ImageOpacity === "" ? 100 : Number(row.ImageOpacity)));
  const imageDarken = Math.max(0, Math.min(100, row.ImageDarken == null || row.ImageDarken === "" ? 35 : Number(row.ImageDarken)));
  const panelTint = Math.max(0, Math.min(70, row.PanelTint == null || row.PanelTint === "" ? 18 : Number(row.PanelTint)));
  const previewBackground = colorMode === "gradient"
    ? "linear-gradient(" + gradientAngle + "deg," + gradientStart + "," + gradientEnd + ")"
    : color;
  const imagePreview = imageUrl
    ? '<img src="' + adminAppearanceEscape_(imageUrl) + '" alt="Hub background">'
    : '<span class="appearance-hub-preview-fallback">No hub image</span>';
  const iconPreview = iconUrl
    ? '<img src="' + adminAppearanceEscape_(iconUrl) + '" alt="Hub icon">'
    : '<span>' + adminAppearanceEscape_(row.IconText || "★") + '</span>';
  const previewName = String(row.DisplayName || row.HubGroup || adminAppearanceHubGroupLabel_(row) || "Hub");
  const imageSourceLabel = adminAppearanceHubSourceLabel_(row.ImageSourceType, !!imageUrl);
  const iconSourceLabel = adminAppearanceHubSourceLabel_(row.IconSourceType, !!iconUrl);

  return `
    <details class="card admin-collapsible-card appearance-hub-editor" open>
      <summary><strong>Hub + Navigation Appearance</strong><span>Main hubs, subhub cards, gradients, artwork and bottom-nav icons</span></summary>
      <div class="appearance-card-body">
        <div class="admin-sub">Pick a main hub or a Subhub Card such as Sports / NFL or Reality / Survivor. The color/gradient controls change the collapsed card itself; Subhub Cards also have an Expanded Area Tint control. Every image area can use a web image directly, import it into Google Drive, choose a photo/file, or take a photo.</div>

        <div class="appearance-hub-live-preview" id="appearanceHubLivePreview">
          <div class="appearance-hub-live-fill" id="appearanceHubLiveFill" style="background:${adminAppearanceEscape_(previewBackground)}"></div>
          ${imageUrl ? '<img id="appearanceHubLiveImage" class="appearance-hub-live-image" src="' + adminAppearanceEscape_(imageUrl) + '" alt="Hub preview" style="opacity:' + (imageOpacity / 100) + '">' : '<img id="appearanceHubLiveImage" class="appearance-hub-live-image" alt="Hub preview" hidden style="opacity:' + (imageOpacity / 100) + '">'}
          <div class="appearance-hub-live-shade" id="appearanceHubLiveShade" style="background:rgba(0,0,0,${imageDarken / 100})"></div>
          <div class="appearance-hub-live-content">
            <div class="appearance-hub-live-icon" id="appearanceHubLiveIcon">${iconPreview}</div>
            <div class="appearance-hub-live-copy">
              <small>${isSubhub ? "SUBHUB CARD PREVIEW" : "LIVE PREVIEW"}</small>
              <strong id="appearanceHubLiveName">${adminAppearanceEscape_(previewName)}</strong>
              <span id="appearanceHubLiveMeta">${adminAppearanceEscape_(colorMode === "gradient" ? "Gradient " + gradientAngle + "°" : "Solid " + color)}</span>
            </div>
          </div>
          <span class="appearance-hub-save-state is-saved" id="appearanceHubSaveState">✓ Saved</span>
        </div>

        <div class="appearance-hub-editor-grid">
          <label>Area to Edit
            <select id="appearanceHubSettingSelect" class="input" onchange="adminAppearanceSelectHubSetting_(this.value)">${adminAppearanceHubOptions_()}</select>
          </label>
          <label>${isLeagueCard ? "League Card Label" : "Display Name"}
            <input id="appearanceHubDisplayName" class="input" value="${adminAppearanceEscape_(row.DisplayName || "")}" oninput="adminAppearanceMarkHubDirty_();adminAppearanceUpdateHubLivePreview_()">
            ${isLeagueCard ? '<span class="admin-sub">Appearance label only — this does not rename the league.</span>' : isSubhub ? '<span class="admin-sub">This is the label players see on the collapsed subhub card.</span>' : ''}
          </label>
          <label>${isSubhub ? "Subhub Card Color Style" : "Color Style"}
            <select id="appearanceHubColorMode" class="input" onchange="adminAppearanceMarkHubDirty_();adminAppearancePreviewHubColor_()">
              <option value="solid" ${colorMode === "solid" ? "selected" : ""}>Solid</option>
              <option value="gradient" ${colorMode === "gradient" ? "selected" : ""}>Gradient</option>
            </select>
          </label>
          <label>Fallback Icon / Emoji
            <input id="appearanceHubIconText" class="input" maxlength="8" value="${adminAppearanceEscape_(row.IconText || "")}" placeholder="🏈" oninput="adminAppearanceMarkHubDirty_();adminAppearanceUpdateHubLivePreview_()">
          </label>
        </div>

        <div class="appearance-hub-gradient-grid">
          <label>Solid / Accent Color
            <div class="appearance-hub-color-row"><input id="appearanceHubColor" type="color" value="${adminAppearanceEscape_(color)}" oninput="adminAppearanceSyncHubColorPicker_(this.value)"><input id="appearanceHubColorText" class="input" value="${adminAppearanceEscape_(color)}" oninput="adminAppearanceSyncHubColor_(this.value)"></div>
          </label>
          <label>Gradient Start
            <div class="appearance-hub-color-row"><input id="appearanceHubGradientStart" type="color" value="${adminAppearanceEscape_(gradientStart)}" oninput="adminAppearanceSyncHubGradientPicker_('start',this.value)"><input id="appearanceHubGradientStartText" class="input" value="${adminAppearanceEscape_(gradientStart)}" oninput="adminAppearanceSyncHubGradientText_('start',this.value)"></div>
          </label>
          <label>Gradient End
            <div class="appearance-hub-color-row"><input id="appearanceHubGradientEnd" type="color" value="${adminAppearanceEscape_(gradientEnd)}" oninput="adminAppearanceSyncHubGradientPicker_('end',this.value)"><input id="appearanceHubGradientEndText" class="input" value="${adminAppearanceEscape_(gradientEnd)}" oninput="adminAppearanceSyncHubGradientText_('end',this.value)"></div>
          </label>
          <label>Gradient Angle
            <div class="appearance-hub-angle-row"><input id="appearanceHubGradientAngle" type="range" min="0" max="360" step="1" value="${gradientAngle}" oninput="adminAppearanceMarkHubDirty_();adminAppearancePreviewHubColor_()"><output id="appearanceHubGradientAngleValue">${gradientAngle}°</output></div>
          </label>
        </div>

        <div class="appearance-hub-color-preview" id="appearanceHubColorPreview" style="background:${adminAppearanceEscape_(previewBackground)}">${isSubhub ? "Collapsed subhub card color / gradient" : "Color / gradient preview"}</div>

        ${isSubhub ? `
          <div class="appearance-subhub-panel-control">
            <label>Expanded Area Tint <span class="admin-sub">0% is nearly clear · higher values pull more of the subhub color into the expanded sections</span>
              <div class="appearance-hub-angle-row"><input id="appearanceHubPanelTint" type="range" min="0" max="70" step="1" value="${panelTint}" oninput="adminAppearanceMarkHubDirty_();adminAppearancePreviewHubPanelTint_()"><output id="appearanceHubPanelTintValue">${panelTint}%</output></div>
            </label>
            <div id="appearanceHubPanelTintPreview" class="appearance-subhub-panel-preview" style="--appearance-subhub-panel-color:${adminAppearanceEscape_(color)};--appearance-subhub-panel-tint:${panelTint}%">Expanded section preview</div>
          </div>
        ` : ""}

        <div class="appearance-hub-media-grid">
          <div class="appearance-hub-media-card">
            <strong>${isSubhub ? "Subhub Card Image" : isLeagueCard ? "League Card Image" : "Hub Image"}</strong>
            <div class="appearance-hub-image-preview" id="appearanceHubImagePreview" style="background:${adminAppearanceEscape_(previewBackground)};--appearance-hub-image-opacity:${imageOpacity / 100};--appearance-hub-image-darken:${imageDarken / 100}">${imagePreview}<span class="appearance-hub-image-darken-layer" aria-hidden="true"></span></div>
            <div class="appearance-hub-image-controls">
              <label>Image Opacity <span class="admin-sub">0% invisible · 100% full image</span>
                <div class="appearance-hub-angle-row"><input id="appearanceHubImageOpacity" type="range" min="0" max="100" step="1" value="${imageOpacity}" oninput="adminAppearanceMarkHubDirty_();adminAppearancePreviewHubImageTone_()"><output id="appearanceHubImageOpacityValue">${imageOpacity}%</output></div>
              </label>
              <label>Darken Image <span class="admin-sub">Adds a dark layer behind the text</span>
                <div class="appearance-hub-angle-row"><input id="appearanceHubImageDarken" type="range" min="0" max="100" step="1" value="${imageDarken}" oninput="adminAppearanceMarkHubDirty_();adminAppearancePreviewHubImageTone_()"><output id="appearanceHubImageDarkenValue">${imageDarken}%</output></div>
              </label>
            </div>
            <div class="appearance-hub-asset-state is-saved" id="appearanceHubImageState">✓ Saved · ${adminAppearanceEscape_(imageSourceLabel)}</div>
            <label class="appearance-hub-url-label">Web Image URL<input id="appearanceHubImageUrlInput" class="input" value="${adminAppearanceEscape_(row.ImageSourceUrl || (row.ImageSourceType === "external-url" ? row.ImageUrl : "") || "")}" placeholder="https://example.com/image.jpg" oninput="adminAppearancePreviewHubUrl_('image',this.value)"></label>
            <input id="appearanceHubImageFile" class="appearance-hidden-file" type="file" accept="image/*" onchange="adminAppearanceUploadHubAsset_('image', 'appearanceHubImageFile')">
            <input id="appearanceHubImageCamera" class="appearance-hidden-file" type="file" accept="image/*" capture="environment" onchange="adminAppearanceUploadHubAsset_('image', 'appearanceHubImageCamera')">
            <div class="appearance-compact-action-row appearance-hub-media-actions">
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceUseHubAssetUrl_('image', false)">Use Web URL</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceUseHubAssetUrl_('image', true)">Import URL to Drive</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearanceHubImageFile')">Choose Image</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearanceHubImageCamera')">Take Photo</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceClearHubAsset_('image')">Clear</button>
            </div>
          </div>
          <div class="appearance-hub-media-card">
            <strong>${isSubhub ? "Subhub Card Icon / Logo" : isLeagueCard ? "League Card Icon / Logo" : "Hub / Bottom Nav Icon"}</strong>
            <div class="appearance-hub-icon-preview" id="appearanceHubIconPreview">${iconPreview}</div>
            <div class="appearance-hub-asset-state is-saved" id="appearanceHubIconState">✓ Saved · ${adminAppearanceEscape_(iconSourceLabel)}</div>
            <label class="appearance-hub-url-label">Web Icon URL<input id="appearanceHubIconUrlInput" class="input" value="${adminAppearanceEscape_(row.IconSourceUrl || (row.IconSourceType === "external-url" ? row.IconUrl : "") || "")}" placeholder="https://example.com/icon.png" oninput="adminAppearancePreviewHubUrl_('icon',this.value)"></label>
            <input id="appearanceHubIconFile" class="appearance-hidden-file" type="file" accept="image/*" onchange="adminAppearanceUploadHubAsset_('icon', 'appearanceHubIconFile')">
            <input id="appearanceHubIconCamera" class="appearance-hidden-file" type="file" accept="image/*" capture="environment" onchange="adminAppearanceUploadHubAsset_('icon', 'appearanceHubIconCamera')">
            <div class="appearance-compact-action-row appearance-hub-media-actions">
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceUseHubAssetUrl_('icon', false)">Use Web URL</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceUseHubAssetUrl_('icon', true)">Import URL to Drive</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearanceHubIconFile')">Choose Icon</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearanceHubIconCamera')">Take Photo</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceClearHubAsset_('icon')">Use Fallback</button>
            </div>
          </div>
        </div>

        ${topNav ? `<label class="appearance-hub-label-toggle"><input id="appearanceHubShowNavLabel" type="checkbox" ${adminAppearanceBool_(row.ShowNavLabel, true) ? 'checked' : ''} onchange="adminAppearanceMarkHubDirty_()"><span>Show the name under this icon in the bottom navigation</span></label>` : ''}
        <details class="appearance-entity-technical"><summary>Advanced / Technical</summary><small>Setting ID: ${adminAppearanceEscape_(row.SettingKey || "")}<br>Hub: ${adminAppearanceEscape_(row.HubCategory || "")}${row.HubGroup ? '<br>Subhub: ' + adminAppearanceEscape_(row.HubGroup) : ''}<br>Image source: ${adminAppearanceEscape_(row.ImageSourceType || "default")}<br>Icon source: ${adminAppearanceEscape_(row.IconSourceType || "default")}</small></details>
        <div class="admin-actions appearance-compact-actions"><button class="admin-small-button" id="appearanceHubSaveButton" type="button" onclick="adminAppearanceSaveHubSetting_()">Save Changes</button></div>
      </div>
    </details>`;
}

function adminAppearanceHubSourceLabel_(sourceType, hasAsset) {
  const type = String(sourceType || "").toLowerCase();
  if (type === "drive-upload") return "Google Drive upload";
  if (type === "drive-import") return "Google Drive import";
  if (type === "external-url") return "External web URL";
  return hasAsset ? "Saved image" : "Default / fallback";
}

function adminAppearanceSetHubStatus_(message, state) {
  const el = document.getElementById("appearanceHubSaveState");
  if (!el) return;
  const mode = state || "dirty";
  el.className = "appearance-hub-save-state is-" + mode;
  el.textContent = String(message || "");
}

function adminAppearanceSetHubAssetState_(kind, message, state) {
  const el = document.getElementById(kind === "icon" ? "appearanceHubIconState" : "appearanceHubImageState");
  if (!el) return;
  const mode = state || "dirty";
  el.className = "appearance-hub-asset-state is-" + mode;
  el.textContent = String(message || "");
}

function adminAppearanceMarkHubDirty_() {
  adminAppearanceSetHubStatus_("Unsaved changes", "dirty");
}

function adminAppearanceUpdateHubLivePreview_() {
  const name = document.getElementById("appearanceHubLiveName");
  const display = document.getElementById("appearanceHubDisplayName");
  if (name && display) name.textContent = String(display.value || "Hub").trim() || "Hub";

  const iconHost = document.getElementById("appearanceHubLiveIcon");
  const iconPreview = document.getElementById("appearanceHubIconPreview");
  if (iconHost && iconPreview) iconHost.innerHTML = iconPreview.innerHTML;

  const mode = String(document.getElementById("appearanceHubColorMode") && document.getElementById("appearanceHubColorMode").value || "solid");
  const solid = adminAppearanceValidHubHex_(document.getElementById("appearanceHubColorText") && document.getElementById("appearanceHubColorText").value, "#354785");
  const start = adminAppearanceValidHubHex_(document.getElementById("appearanceHubGradientStartText") && document.getElementById("appearanceHubGradientStartText").value, solid);
  const end = adminAppearanceValidHubHex_(document.getElementById("appearanceHubGradientEndText") && document.getElementById("appearanceHubGradientEndText").value, solid);
  const angle = Math.max(0, Math.min(360, Number(document.getElementById("appearanceHubGradientAngle") && document.getElementById("appearanceHubGradientAngle").value) || 135));
  const meta = document.getElementById("appearanceHubLiveMeta");
  if (meta) meta.textContent = mode === "gradient" ? "Gradient " + angle + "° · " + start + " → " + end : "Solid · " + solid;
}

function adminAppearanceSetHubAssetPreview_(kind, url) {
  const isIcon = kind === "icon";
  const preview = document.getElementById(isIcon ? "appearanceHubIconPreview" : "appearanceHubImagePreview");
  const liveImage = document.getElementById("appearanceHubLiveImage");
  const value = String(url || "").trim();

  if (preview) {
    preview.innerHTML = "";
    if (value) {
      const img = document.createElement("img");
      img.src = value;
      img.alt = isIcon ? "Hub icon preview" : "Hub image preview";
      preview.appendChild(img);
    } else if (isIcon) {
      const span = document.createElement("span");
      const iconText = document.getElementById("appearanceHubIconText");
      span.textContent = String(iconText && iconText.value || "★");
      preview.appendChild(span);
    } else {
      const span = document.createElement("span");
      span.className = "appearance-hub-preview-fallback";
      span.textContent = "No hub image";
      preview.appendChild(span);
    }
  }

  if (!isIcon && liveImage) {
    if (value) {
      liveImage.src = value;
      liveImage.hidden = false;
    } else {
      liveImage.removeAttribute("src");
      liveImage.hidden = true;
    }
  }
  adminAppearancePreviewHubImageTone_();
  adminAppearanceUpdateHubLivePreview_();
}

function adminAppearancePreviewHubUrl_(kind, value) {
  const url = String(value || "").trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) return;
  adminAppearanceSetHubAssetPreview_(kind, url);
  adminAppearanceSetHubAssetState_(kind, "Preview only · choose Use Web URL or Import to Drive to save", "dirty");
  adminAppearanceSetHubStatus_("Image preview is not saved yet", "dirty");
}

function adminAppearancePreviewHubLocalFile_(kind, file) {
  if (!file || typeof FileReader === "undefined") return;
  const reader = new FileReader();
  reader.onload = function() {
    adminAppearanceSetHubAssetPreview_(kind, String(reader.result || ""));
  };
  reader.readAsDataURL(file);
}

function adminAppearanceUpdateLocalHubRow_(savedSetting) {
  if (!savedSetting) return;
  const current = adminAppearanceHubRow_();
  if (current) Object.assign(current, savedSetting);
}

function adminAppearanceSelectHubSetting_(settingKey) {
  ADMIN_APPEARANCE_STATE.selectedHubSettingKey = String(settingKey || "sports");
  ADMIN_APPEARANCE_STATE.message = "";
  adminAppearancePaint_();
}

function adminAppearanceValidHubHex_(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : String(fallback || "#354785");
}

function adminAppearanceSyncHubColor_(value) {
  const picker = document.getElementById("appearanceHubColor");
  const text = String(value || "").trim();
  if (picker && /^#[0-9a-f]{6}$/i.test(text)) picker.value = text;
  adminAppearanceMarkHubDirty_();
  adminAppearancePreviewHubColor_();
}

function adminAppearanceSyncHubColorPicker_(value) {
  const text = document.getElementById("appearanceHubColorText");
  if (text) text.value = String(value || "");
  adminAppearanceMarkHubDirty_();
  adminAppearancePreviewHubColor_();
}

function adminAppearanceSyncHubGradientPicker_(which, value) {
  const text = document.getElementById(which === "end" ? "appearanceHubGradientEndText" : "appearanceHubGradientStartText");
  if (text) text.value = String(value || "");
  adminAppearanceMarkHubDirty_();
  adminAppearancePreviewHubColor_();
}

function adminAppearanceSyncHubGradientText_(which, value) {
  const picker = document.getElementById(which === "end" ? "appearanceHubGradientEnd" : "appearanceHubGradientStart");
  const text = String(value || "").trim();
  if (picker && /^#[0-9a-f]{6}$/i.test(text)) picker.value = text;
  adminAppearanceMarkHubDirty_();
  adminAppearancePreviewHubColor_();
}

function adminAppearancePreviewHubColor_() {
  const preview = document.getElementById("appearanceHubColorPreview");
  const imagePreview = document.querySelector(".appearance-hub-image-preview");
  const mode = String(document.getElementById("appearanceHubColorMode") && document.getElementById("appearanceHubColorMode").value || "solid");
  const solid = adminAppearanceValidHubHex_(document.getElementById("appearanceHubColorText") && document.getElementById("appearanceHubColorText").value, "#354785");
  const start = adminAppearanceValidHubHex_(document.getElementById("appearanceHubGradientStartText") && document.getElementById("appearanceHubGradientStartText").value, solid);
  const end = adminAppearanceValidHubHex_(document.getElementById("appearanceHubGradientEndText") && document.getElementById("appearanceHubGradientEndText").value, solid);
  const angleInput = document.getElementById("appearanceHubGradientAngle");
  const angle = Math.max(0, Math.min(360, Number(angleInput && angleInput.value) || 135));
  const angleValue = document.getElementById("appearanceHubGradientAngleValue");
  if (angleValue) angleValue.textContent = angle + "°";
  const background = mode === "gradient" ? "linear-gradient(" + angle + "deg," + start + "," + end + ")" : solid;
  if (preview) preview.style.background = background;
  if (imagePreview && !imagePreview.querySelector("img")) imagePreview.style.background = background;
  const liveFill = document.getElementById("appearanceHubLiveFill");
  if (liveFill) liveFill.style.background = background;
  adminAppearancePreviewHubPanelTint_();
  adminAppearanceUpdateHubLivePreview_();
}

function adminAppearancePreviewHubPanelTint_() {
  const input = document.getElementById("appearanceHubPanelTint");
  const value = Math.max(0, Math.min(70, Number(input && input.value != null ? input.value : 18)));
  const output = document.getElementById("appearanceHubPanelTintValue");
  if (output) output.textContent = value + "%";
  const preview = document.getElementById("appearanceHubPanelTintPreview");
  const color = adminAppearanceValidHubHex_(
    document.getElementById("appearanceHubColorText") && document.getElementById("appearanceHubColorText").value,
    "#354785"
  );
  if (preview) {
    preview.style.setProperty("--appearance-subhub-panel-color", color);
    preview.style.setProperty("--appearance-subhub-panel-tint", value + "%");
  }
}

function adminAppearancePreviewHubImageTone_() {
  const opacityInput = document.getElementById("appearanceHubImageOpacity");
  const darkenInput = document.getElementById("appearanceHubImageDarken");
  const opacity = Math.max(0, Math.min(100, Number(opacityInput && opacityInput.value != null ? opacityInput.value : 100)));
  const darken = Math.max(0, Math.min(100, Number(darkenInput && darkenInput.value != null ? darkenInput.value : 35)));
  const opacityValue = document.getElementById("appearanceHubImageOpacityValue");
  const darkenValue = document.getElementById("appearanceHubImageDarkenValue");
  if (opacityValue) opacityValue.textContent = opacity + "%";
  if (darkenValue) darkenValue.textContent = darken + "%";
  const liveImage = document.getElementById("appearanceHubLiveImage");
  const liveShade = document.getElementById("appearanceHubLiveShade");
  if (liveImage) liveImage.style.opacity = String(opacity / 100);
  if (liveShade) liveShade.style.background = "rgba(0,0,0," + (darken / 100) + ")";
  const imagePreview = document.getElementById("appearanceHubImagePreview");
  if (imagePreview) {
    imagePreview.style.setProperty("--appearance-hub-image-opacity", String(opacity / 100));
    imagePreview.style.setProperty("--appearance-hub-image-darken", String(darken / 100));
  }
}

function adminAppearanceCollectHubSetting_() {
  const row = adminAppearanceHubRow_() || {};
  const colorPicker = document.getElementById("appearanceHubColor");
  const colorText = document.getElementById("appearanceHubColorText");
  const colorMode = document.getElementById("appearanceHubColorMode");
  const gradientStart = document.getElementById("appearanceHubGradientStartText");
  const gradientEnd = document.getElementById("appearanceHubGradientEndText");
  const gradientAngle = document.getElementById("appearanceHubGradientAngle");
  const imageOpacity = document.getElementById("appearanceHubImageOpacity");
  const imageDarken = document.getElementById("appearanceHubImageDarken");
  const panelTint = document.getElementById("appearanceHubPanelTint");
  const display = document.getElementById("appearanceHubDisplayName");
  const iconText = document.getElementById("appearanceHubIconText");
  const showLabel = document.getElementById("appearanceHubShowNavLabel");
  const solid = adminAppearanceValidHubHex_(String(colorText && colorText.value || colorPicker && colorPicker.value || row.Color || "#354785"), row.Color || "#354785");
  return {
    settingKey: String(row.SettingKey || ADMIN_APPEARANCE_STATE.selectedHubSettingKey || "sports"),
    hubCategory: String(row.HubCategory || "general"),
    hubGroup: String(row.HubGroup || ""),
    displayName: String(display && display.value || row.DisplayName || "").trim(),
    color: solid,
    colorMode: String(colorMode && colorMode.value || row.ColorMode || "solid") === "gradient" ? "gradient" : "solid",
    gradientStart: adminAppearanceValidHubHex_(String(gradientStart && gradientStart.value || row.GradientStart || solid), solid),
    gradientEnd: adminAppearanceValidHubHex_(String(gradientEnd && gradientEnd.value || row.GradientEnd || solid), solid),
    gradientAngle: Math.max(0, Math.min(360, Number(gradientAngle && gradientAngle.value != null ? gradientAngle.value : row.GradientAngle) || 135)),
    imageUrl: String(row.ImageUrl || ""),
    imageFileId: String(row.ImageFileId || ""),
    imageSourceType: String(row.ImageSourceType || ""),
    imageSourceUrl: String(row.ImageSourceUrl || ""),
    imageOpacity: Math.max(0, Math.min(100, Number(imageOpacity && imageOpacity.value != null ? imageOpacity.value : (row.ImageOpacity == null || row.ImageOpacity === "" ? 100 : row.ImageOpacity)))),
    imageDarken: Math.max(0, Math.min(100, Number(imageDarken && imageDarken.value != null ? imageDarken.value : (row.ImageDarken == null || row.ImageDarken === "" ? 35 : row.ImageDarken)))),
    panelTint: Math.max(0, Math.min(70, Number(panelTint && panelTint.value != null ? panelTint.value : (row.PanelTint == null || row.PanelTint === "" ? 18 : row.PanelTint)))),
    iconText: String(iconText && iconText.value || row.IconText || "").trim(),
    iconUrl: String(row.IconUrl || ""),
    iconFileId: String(row.IconFileId || ""),
    iconSourceType: String(row.IconSourceType || ""),
    iconSourceUrl: String(row.IconSourceUrl || ""),
    showNavLabel: showLabel ? showLabel.checked : adminAppearanceBool_(row.ShowNavLabel, true),
    active: true
  };
}

async function adminAppearanceSaveHubSetting_() {
  const button = document.getElementById("appearanceHubSaveButton");
  try {
    const payload = adminAppearanceCollectHubSetting_();
    adminAppearanceSetHubStatus_("Saving…", "loading");
    if (button) { button.disabled = true; button.textContent = "Saving…"; }
    const result = await apiAdminSaveAppearanceHubSetting(payload);
    if (!result || result.success === false) throw new Error(result && (result.message || result.error) || "Could not save hub appearance.");
    adminAppearanceUpdateLocalHubRow_(result.setting || payload);
    adminAppearanceSetHubStatus_("✓ Saved", "saved");
    if (button) button.textContent = "Saved ✓";
    window.setTimeout(function() { if (button) button.textContent = "Save Changes"; }, 1400);
  } catch (err) {
    adminAppearanceSetHubStatus_("Save failed", "error");
    ADMIN_APPEARANCE_STATE.message = err.message || String(err);
  } finally {
    if (button) button.disabled = false;
  }
}

async function adminAppearanceUseHubAssetUrl_(kind, importToDrive) {
  const input = document.getElementById(kind === "icon" ? "appearanceHubIconUrlInput" : "appearanceHubImageUrlInput");
  const url = String(input && input.value || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    adminAppearanceSetHubAssetState_(kind, "Enter a full http:// or https:// image URL first", "error");
    return;
  }
  const payload = adminAppearanceCollectHubSetting_();
  const current = adminAppearanceHubRow_() || {};
  try {
    adminAppearanceSetHubAssetPreview_(kind, url);
    adminAppearanceSetHubAssetState_(kind, importToDrive ? "Importing to Google Drive…" : "Saving external URL…", "loading");
    adminAppearanceSetHubStatus_("Saving image…", "loading");
    let savedUrl = url;
    let fileId = "";
    let sourceType = "external-url";
    if (importToDrive) {
      const imported = await apiAdminImportImageFromUrl({
        gameId: "hub-appearance",
        categoryId: String(current.SettingKey || ADMIN_APPEARANCE_STATE.selectedHubSettingKey || "hub"),
        nomineeId: kind,
        imageUrl: url
      });
      if (!imported || imported.success === false) throw new Error(imported && (imported.message || imported.error) || "Could not import the web image to Google Drive.");
      fileId = String(imported.fileId || "");
      savedUrl = String(imported.thumbnailUrl || adminAppearanceDriveUrl_(fileId, kind === "icon" ? "w240" : "w900"));
      sourceType = "drive-import";
    }
    if (kind === "icon") {
      payload.iconUrl = savedUrl;
      payload.iconFileId = fileId;
      payload.iconSourceType = sourceType;
      payload.iconSourceUrl = url;
    } else {
      payload.imageUrl = savedUrl;
      payload.imageFileId = fileId;
      payload.imageSourceType = sourceType;
      payload.imageSourceUrl = url;
    }
    const save = await apiAdminSaveAppearanceHubSetting(payload);
    if (!save || save.success === false) throw new Error(save && (save.message || save.error) || "Image was prepared but could not be assigned to the hub.");
    adminAppearanceUpdateLocalHubRow_(save.setting || payload);
    adminAppearanceSetHubAssetPreview_(kind, savedUrl);
    adminAppearanceSetHubAssetState_(kind, importToDrive ? "✓ Saved to Google Drive" : "✓ External URL saved", "saved");
    adminAppearanceSetHubStatus_("✓ Saved", "saved");
  } catch (err) {
    adminAppearanceSetHubAssetState_(kind, "Save failed · " + (err.message || String(err)), "error");
    adminAppearanceSetHubStatus_("Save failed", "error");
  }
}

async function adminAppearanceUploadHubAsset_(kind, inputId) {
  const input = document.getElementById(inputId);
  const file = input && input.files && input.files[0];
  if (!file) return;
  const formPayload = adminAppearanceCollectHubSetting_();
  try {
    adminAppearancePreviewHubLocalFile_(kind, file);
    adminAppearanceSetHubAssetState_(kind, "Uploading to Google Drive…", "loading");
    adminAppearanceSetHubStatus_("Uploading image…", "loading");
    const prepared = await adminAppearancePrepareUpload_(file);
    const current = adminAppearanceHubRow_() || {};
    const upload = await apiAdminUploadImage({
      gameId: "hub-appearance",
      categoryId: String(current.SettingKey || ADMIN_APPEARANCE_STATE.selectedHubSettingKey || "hub"),
      nomineeId: kind,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      base64: prepared.base64
    });
    if (!upload || upload.success === false) throw new Error(upload && (upload.message || upload.error) || "Hub image upload failed.");
    const payload = formPayload;
    const url = upload.thumbnailUrl || adminAppearanceDriveUrl_(upload.fileId, kind === "icon" ? "w240" : "w900");
    if (kind === "icon") {
      payload.iconUrl = url;
      payload.iconFileId = upload.fileId || "";
      payload.iconSourceType = "drive-upload";
      payload.iconSourceUrl = "";
    } else {
      payload.imageUrl = url;
      payload.imageFileId = upload.fileId || "";
      payload.imageSourceType = "drive-upload";
      payload.imageSourceUrl = "";
    }
    const save = await apiAdminSaveAppearanceHubSetting(payload);
    if (!save || save.success === false) throw new Error(save && (save.message || save.error) || "Hub asset uploaded but could not be assigned.");
    adminAppearanceUpdateLocalHubRow_(save.setting || payload);
    adminAppearanceSetHubAssetPreview_(kind, url);
    adminAppearanceSetHubAssetState_(kind, "✓ Uploaded + saved to Google Drive", "saved");
    adminAppearanceSetHubStatus_("✓ Saved", "saved");
  } catch (err) {
    adminAppearanceSetHubAssetState_(kind, "Upload failed · " + (err.message || String(err)), "error");
    adminAppearanceSetHubStatus_("Upload failed", "error");
  } finally {
    if (input) input.value = "";
  }
}

async function adminAppearanceClearHubAsset_(kind) {
  try {
    const payload = adminAppearanceCollectHubSetting_();
    adminAppearanceSetHubAssetState_(kind, "Saving fallback…", "loading");
    if (kind === "icon") {
      payload.iconUrl = "";
      payload.iconFileId = "";
      payload.iconSourceType = "";
      payload.iconSourceUrl = "";
    } else {
      payload.imageUrl = "";
      payload.imageFileId = "";
      payload.imageSourceType = "";
      payload.imageSourceUrl = "";
    }
    const save = await apiAdminSaveAppearanceHubSetting(payload);
    if (!save || save.success === false) throw new Error(save && (save.message || save.error) || "Could not clear hub asset.");
    adminAppearanceUpdateLocalHubRow_(save.setting || payload);
    adminAppearanceSetHubAssetPreview_(kind, "");
    adminAppearanceSetHubAssetState_(kind, kind === "icon" ? "✓ Fallback icon saved" : "✓ Image cleared", "saved");
    adminAppearanceSetHubStatus_("✓ Saved", "saved");
  } catch (err) {
    adminAppearanceSetHubAssetState_(kind, "Save failed · " + (err.message || String(err)), "error");
    adminAppearanceSetHubStatus_("Save failed", "error");
  }
}

function adminAppearanceUniqueEntities_() {
  const setup = ADMIN_APPEARANCE_STATE.gameSetup || {};
  const seen = {};
  const entities = [];

  (setup.categories || []).forEach(function(category) {
    (category.nominees || []).forEach(function(nominee) {
      const explicitEntityType = String(nominee.entryType || category.entryType || "").trim().toLowerCase();
      const questionType = String(category.questionType || category.settings && category.settings.questionType || "").trim().toLowerCase();
      const scoringEngine = String(category.scoringEngine || category.settings && category.settings.scoringEngine || "").trim().toLowerCase();
      const sportsGameId = String(category.sportsGameId || category.settings && category.settings.sportsGameId || "").trim();
      const entityType = explicitEntityType ||
        (questionType === "team-matchup" || scoringEngine === "sports" || sportsGameId ? "team" : "nominee");
      const entityId = String(nominee.id || nominee.nomineeId || "").trim();
      if (!entityId) return;
      const key = entityType + "::" + adminAppearanceKey_(entityId);
      const imageUrl = String(nominee.image || nominee.imageUrl || nominee.logoUrl || "").trim();
      if (seen[key]) {
        if (!seen[key].defaultImageUrl && imageUrl) seen[key].defaultImageUrl = imageUrl;
        return;
      }
      const item = {
        key: key,
        entityType: entityType,
        entityId: entityId,
        entityName: String(nominee.name || nominee.nominee || nominee.shortAnswer || entityId).trim(),
        defaultImageUrl: imageUrl
      };
      seen[key] = item;
      entities.push(item);
    });
  });

  return entities.sort(function(a, b) {
    return a.entityName.localeCompare(b.entityName);
  });
}

function adminAppearanceInferScope_() {
  const setup = ADMIN_APPEARANCE_STATE.gameSetup || {};
  const game = setup.game || ADMIN_APPEARANCE_STATE.games.find(function(item) {
    return adminAppearanceGameId_(item) === ADMIN_APPEARANCE_STATE.selectedGameId;
  }) || {};
  const leagues = {};
  (setup.categories || []).forEach(function(category) {
    const value = String(category && category.settings && category.settings.sportsLeague || category.sportsLeague || "").trim();
    if (value) leagues[value] = true;
  });
  const leagueList = Object.keys(leagues);
  if (leagueList.length === 1) return { scopeType: "sports", scopeValue: leagueList[0] };
  const type = adminAppearanceGameType_(game);
  if (type) return { scopeType: type, scopeValue: "" };
  return { scopeType: "all", scopeValue: "" };
}

function adminAppearanceDefaultImagePack_() {
  const assignment = adminAppearanceAssignment_();
  if (assignment.ImagePackId) return String(assignment.ImagePackId);
  const setup = ADMIN_APPEARANCE_STATE.gameSetup || {};
  const sports = (setup.categories || []).some(function(category) {
    return !!String(category && category.settings && category.settings.sportsLeague || category.sportsLeague || "").trim();
  });
  return sports ? "sports-default" : "";
}

function adminAppearanceDefaultTheme_() {
  const assignment = adminAppearanceAssignment_();
  if (assignment.ThemePackId) return String(assignment.ThemePackId);
  const game = (ADMIN_APPEARANCE_STATE.gameSetup || {}).game || {};
  const type = adminAppearanceGameType_(game);
  const confidence = type === "confidence" || game.confidenceEnabled === true;
  return confidence ? "confidence-pro" : "app-default";
}

async function adminAppearanceLoadGame_(gameId) {
  const id = String(gameId || "").trim();
  ADMIN_APPEARANCE_STATE.selectedGameId = id;
  if (!id) {
    ADMIN_APPEARANCE_STATE.gameSetup = null;
    return;
  }
  localStorage.setItem("appearanceManagerGameId", id);
  const result = await apiAdminGetGameSetup(id);
  if (!result || result.success === false) {
    throw new Error(result && (result.message || result.error) || "Could not load game appearance data.");
  }
  ADMIN_APPEARANCE_STATE.gameSetup = result;
  const dashboard = await apiAdminGetAppearanceDashboard(id);
  if (!dashboard || dashboard.success === false) {
    throw new Error(dashboard && (dashboard.message || dashboard.error) || "Could not load appearance settings.");
  }
  ADMIN_APPEARANCE_STATE.dashboard = dashboard;
  ADMIN_APPEARANCE_STATE.selectedImagePackId = adminAppearanceDefaultImagePack_();
  ADMIN_APPEARANCE_STATE.selectedThemePackId = adminAppearanceDefaultTheme_();
}

async function adminAppearanceInitialLoad_() {
  const gamesResult = await apiAdminGetGames();
  if (!gamesResult || gamesResult.success === false) {
    throw new Error(gamesResult && (gamesResult.message || gamesResult.error) || "Could not load games.");
  }
  ADMIN_APPEARANCE_STATE.games = gamesResult.games || [];

  let dashboard = await apiAdminGetAppearanceDashboard("");
  if (!dashboard || dashboard.success === false) {
    throw new Error(dashboard && (dashboard.message || dashboard.error) || "Could not load appearance system.");
  }

  // Large production workbooks can time out when several new sheets are inserted
  // in one Apps Script execution. Create one missing Appearance sheet at a time,
  // then re-check readiness before continuing.
  for (let setupAttempt = 0; dashboard.setupComplete !== true && setupAttempt < 8; setupAttempt++) {
    const setup = await apiAdminSetupAppearanceSystem();
    if (!setup || setup.success === false) {
      throw new Error(setup && (setup.message || setup.error) || "Could not initialize appearance system.");
    }

    dashboard = await apiAdminGetAppearanceDashboard("");
    if (!dashboard || dashboard.success === false) {
      throw new Error(dashboard && (dashboard.message || dashboard.error) || "Could not reload appearance system.");
    }
  }

  if (dashboard.setupComplete !== true) {
    throw new Error("Appearance setup is incomplete. Refresh Appearance Manager to continue setup.");
  }

  ADMIN_APPEARANCE_STATE.dashboard = dashboard;

  const saved = String(localStorage.getItem("appearanceManagerGameId") || "").trim();
  const current = typeof getFrontendGameId === "function" ? String(getFrontendGameId() || "").trim() : "";
  const ids = ADMIN_APPEARANCE_STATE.games.map(adminAppearanceGameId_);
  const first = ids[0] || "";
  const selected = ids.indexOf(saved) !== -1 ? saved : ids.indexOf(current) !== -1 ? current : first;
  await adminAppearanceLoadGame_(selected);
}

async function renderAdminAppearancePage() {
  const session = getSession();
  if (!session || !isAdminSession(session)) {
    return '<div class="page admin-page"><h1>Appearance Manager</h1><div class="card error-card">Administrator access is required.</div></div>';
  }

  try {
    await adminAppearanceInitialLoad_();
    setTimeout(adminAppearanceMountThemePreview_, 0);
    return adminAppearanceBuildHtml_();
  } catch (err) {
    return '<div class="page admin-page"><h1>Appearance Manager</h1><div class="card error-card">' + adminAppearanceEscape_(err.message || err) + '</div><button class="button secondary" onclick="navigate(\'admin\')">← Back to Admin</button></div>';
  }
}

function adminAppearancePaint_() {
  const app = document.getElementById("app");
  if (app) app.innerHTML = adminAppearanceBuildHtml_();
  if (typeof adminUiEnhancePage === "function" && app) setTimeout(function() { adminUiEnhancePage(app); }, 0);
  setTimeout(adminAppearanceMountThemePreview_, 0);
}

function adminAppearanceGameOptions_() {
  return ADMIN_APPEARANCE_STATE.games.map(function(game) {
    const id = adminAppearanceGameId_(game);
    const selected = id === ADMIN_APPEARANCE_STATE.selectedGameId ? " selected" : "";
    return '<option value="' + adminAppearanceEscape_(id) + '"' + selected + '>' + adminAppearanceEscape_(adminAppearanceGameName_(game)) + '</option>';
  }).join("");
}

function adminAppearanceImagePackOptions_(selectedId) {
  const rows = adminAppearanceActiveRows_(ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.imagePacks);
  const options = ['<option value=""' + (!selectedId ? ' selected' : '') + '>Use existing / default images</option>'];
  let selectedFound = !selectedId;
  rows.forEach(function(row) {
    const selected = adminAppearanceKey_(row.PackId) === adminAppearanceKey_(selectedId) ? " selected" : "";
    if (selected) selectedFound = true;
    options.push('<option value="' + adminAppearanceEscape_(row.PackId) + '"' + selected + '>' + adminAppearanceEscape_(row.PackName || row.PackId) + '</option>');
  });
  // Defensive fallback: a freshly created pack is adopted locally before the
  // follow-up dashboard read completes. Never let that pack disappear from a
  // selector during the confirmation round-trip.
  if (selectedId && !selectedFound) {
    const pending = ADMIN_APPEARANCE_STATE.pendingImagePackRow || {};
    const label = String(pending.PackName || pending.packName || selectedId);
    options.push('<option value="' + adminAppearanceEscape_(selectedId) + '" selected>' + adminAppearanceEscape_(label) + ' · newly created</option>');
  }
  return options.join("");
}

function adminAppearanceThemeOptions_(selectedId, allowBlank) {
  const rows = adminAppearanceActiveRows_(ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.themePacks);
  const options = allowBlank ? ['<option value="">No base theme</option>'] : [];
  rows.forEach(function(row) {
    const selected = adminAppearanceKey_(row.ThemePackId) === adminAppearanceKey_(selectedId) ? " selected" : "";
    options.push('<option value="' + adminAppearanceEscape_(row.ThemePackId) + '"' + selected + '>' + adminAppearanceEscape_(row.ThemeName || row.ThemePackId) + '</option>');
  });
  return options.join("");
}

function adminAppearanceSelectedPackItem_(entity) {
  const packId = ADMIN_APPEARANCE_STATE.selectedImagePackId;
  return (ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.imagePackItems || []).find(function(row) {
    return adminAppearanceBool_(row.Active, true) &&
      adminAppearanceKey_(row.PackId) === adminAppearanceKey_(packId) &&
      adminAppearanceKey_(row.EntityType) === adminAppearanceKey_(entity.entityType) &&
      adminAppearanceKey_(row.EntityId) === adminAppearanceKey_(entity.entityId) &&
      ["", "default"].indexOf(adminAppearanceKey_(row.Variant || "default")) !== -1;
  }) || null;
}

function adminAppearanceGameOverride_(entity) {
  return (ADMIN_APPEARANCE_STATE.dashboard && ADMIN_APPEARANCE_STATE.dashboard.overrides || []).find(function(row) {
    return adminAppearanceBool_(row.Active, true) &&
      adminAppearanceKey_(row.EntityType) === adminAppearanceKey_(entity.entityType) &&
      adminAppearanceKey_(row.EntityId) === adminAppearanceKey_(entity.entityId);
  }) || null;
}

function adminAppearanceSourceLabel_(row, prefix) {
  row = row || {};
  const raw = adminAppearanceKey_(row.SourceType || row.sourceType || "");
  let label = "";
  if (raw === "drive-upload") label = "Drive Upload";
  else if (raw === "drive-import") label = "Drive Import";
  else if (raw === "external-url") label = "External URL";
  else if (String(row.ImageFileId || "").trim()) label = "Drive Image";
  else if (String(row.ImageUrl || "").trim()) label = "External URL";
  else label = "Default";
  return prefix ? prefix + " · " + label : label;
}

function adminAppearanceResolvedPreview_(entity) {
  const override = adminAppearanceGameOverride_(entity);
  if (override) {
    const url = String(override.ImageUrl || "").trim() || adminAppearanceDriveUrl_(override.ImageFileId, "w360");
    if (url) return { url: url, source: adminAppearanceSourceLabel_(override, "Game override") };
  }
  const item = adminAppearanceSelectedPackItem_(entity);
  if (item) {
    const url = String(item.ImageUrl || "").trim() || adminAppearanceDriveUrl_(item.ImageFileId, "w360");
    if (url) return { url: url, source: adminAppearanceSourceLabel_(item, "Image pack") };
  }
  return { url: entity.defaultImageUrl || "", source: "Existing game image" };
}

function adminAppearanceEntityCard_(entity, index) {
  const pack = adminAppearanceSelectedPackItem_(entity);
  const override = adminAppearanceGameOverride_(entity);
  const resolved = adminAppearanceResolvedPreview_(entity);
  const disabledPack = !ADMIN_APPEARANCE_STATE.selectedImagePackId || ADMIN_APPEARANCE_STATE.selectedImagePackId === "sports-default";
  const imageHtml = resolved.url
    ? '<img id="appearanceEntityPreview_' + index + '" src="' + adminAppearanceEscape_(resolved.url) + '" alt="' + adminAppearanceEscape_(entity.entityName) + '">'
    : '<div id="appearanceEntityPreview_' + index + '" class="appearance-image-empty">No image</div>';
  const packSource = pack ? adminAppearanceSourceLabel_(pack, "") : "Default";
  const overrideSource = override ? adminAppearanceSourceLabel_(override, "") : "None";

  return `
    <div class="appearance-entity-card">
      <div class="appearance-entity-preview">${imageHtml}<small>${adminAppearanceEscape_(resolved.source)}</small></div>
      <div class="appearance-entity-copy">
        <strong>${adminAppearanceEscape_(entity.entityName)}</strong>
        <span>${pack ? 'Custom image in this pack' : 'Using fallback/default image'}</span>
        <div class="appearance-source-row"><span class="appearance-source-chip">Pack: ${adminAppearanceEscape_(packSource)}</span><span class="appearance-source-chip">Game: ${adminAppearanceEscape_(overrideSource)}</span></div>
        <details class="appearance-entity-technical"><summary>Advanced / Technical</summary><small>Entity type: ${adminAppearanceEscape_(entity.entityType)}<br>Entity ID: ${adminAppearanceEscape_(entity.entityId)}${pack && pack.SourceUrl ? '<br>Pack source URL: ' + adminAppearanceEscape_(pack.SourceUrl) : ''}${override && override.SourceUrl ? '<br>Override source URL: ' + adminAppearanceEscape_(override.SourceUrl) : ''}</small></details>
      </div>
      <details class="appearance-entity-editor">
        <summary>Change Image</summary>
        <div class="appearance-entity-fields">
          <div>
            <b>Image Pack Image</b>
            <small>Reusable anywhere this same entity ID appears with this Image Pack.</small>
            ${disabledPack ? '<div class="admin-sub">Create/select a custom Image Pack to edit pack artwork.</div>' : `
              <label class="appearance-media-url-label">External image URL<input id="appearancePackUrl_${index}" class="input" type="url" value="${adminAppearanceEscape_(pack && pack.SourceType === 'external-url' ? pack.ImageUrl : pack && pack.SourceUrl || pack && !pack.ImageFileId ? pack.ImageUrl : '')}" placeholder="https://…"></label>
              <input id="appearancePackFile_${index}" class="appearance-hidden-file" type="file" accept="image/*" onchange="adminAppearanceUploadPackImage_(${index}, 'appearancePackFile_${index}')">
              <input id="appearancePackCamera_${index}" class="appearance-hidden-file" type="file" accept="image/*" capture="environment" onchange="adminAppearanceUploadPackImage_(${index}, 'appearancePackCamera_${index}')">
              <div class="appearance-media-actions">
                <button class="admin-small-button" type="button" onclick="adminAppearanceSavePackImage_(${index})">Use External URL</button>
                <button class="admin-small-button secondary" type="button" onclick="adminAppearanceImportPackUrl_(${index})">Import URL to Drive</button>
                <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearancePackFile_${index}')">Choose Photo</button>
                <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearancePackCamera_${index}')">Take Photo</button>
                <button class="admin-small-button secondary" type="button" onclick="adminAppearanceClearPackImage_(${index})">Use Default</button>
              </div>
              <small class="appearance-media-help">External URL stays on the source website. Import/Choose/Take saves a copy in the PATTC Predicts Google Drive image folder.</small>
              <small id="appearancePackStatus_${index}" class="appearance-upload-status"></small>`}
          </div>
          <div>
            <b>This Game Only</b>
            <small>Overrides the selected Image Pack only for this game.</small>
            <label class="appearance-media-url-label">External image URL<input id="appearanceOverrideUrl_${index}" class="input" type="url" value="${adminAppearanceEscape_(override && override.SourceType === 'external-url' ? override.ImageUrl : override && override.SourceUrl || override && !override.ImageFileId ? override.ImageUrl : '')}" placeholder="https://…"></label>
            <input id="appearanceOverrideFile_${index}" class="appearance-hidden-file" type="file" accept="image/*" onchange="adminAppearanceUploadOverride_(${index}, 'appearanceOverrideFile_${index}')">
            <input id="appearanceOverrideCamera_${index}" class="appearance-hidden-file" type="file" accept="image/*" capture="environment" onchange="adminAppearanceUploadOverride_(${index}, 'appearanceOverrideCamera_${index}')">
            <div class="appearance-media-actions">
              <button class="admin-small-button" type="button" onclick="adminAppearanceSaveOverride_(${index})">Use External URL</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceImportOverrideUrl_(${index})">Import URL to Drive</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearanceOverrideFile_${index}')">Choose Photo</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceChooseMedia_('appearanceOverrideCamera_${index}')">Take Photo</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceClearOverride_(${index})">Clear Override</button>
            </div>
            <small class="appearance-media-help">Use a URL temporarily, or import/upload/capture it to keep a Drive-owned copy.</small>
            <small id="appearanceOverrideStatus_${index}" class="appearance-upload-status"></small>
          </div>
        </div>
      </details>
    </div>`;
}

function adminAppearanceStudioClamp_(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

const ADMIN_APPEARANCE_VISIBILITY_ELEMENTS = [
  ["city", "City"],
  ["teamName", "Team Name"],
  ["teamImage", "Team Image"],
  ["score", "Score"],
  ["versus", "VS Divider"],
  ["gameTime", "Game Date / Time"],
  ["liveBadge", "Live Badge"],
  ["clock", "Quarter / Clock"],
  ["finalBadge", "Final Badge"],
  ["confidenceLabel", "Confidence Label"],
  ["confidenceValue", "Confidence Number"],
  ["points", "Points Earned"],
  ["resultIndicator", "Pick / Result Indicator"],
  ["detailsBar", "Expand / Details Bar"],
  ["records", "Records"],
  ["favorite", "Favorite"],
  ["moneyline", "Moneyline"],
  ["spread", "Spread"],
  ["overUnder", "Over / Under"]
];

function adminAppearanceStudioVisibilityDefaults_(visibility) {
  visibility = visibility || {};
  const elements = visibility.elements || {};
  const devices = visibility.devices || {};
  const out = { elements: {}, devices: { desktop: {}, tablet: {}, mobile: {} } };
  ADMIN_APPEARANCE_VISIBILITY_ELEMENTS.forEach(function(item) {
    const key = item[0];
    out.elements[key] = adminAppearanceBool_(elements[key], true);
    ["desktop", "tablet", "mobile"].forEach(function(device) {
      const source = devices[device] || {};
      out.devices[device][key] = adminAppearanceBool_(source[key], true);
    });
  });
  return out;
}


const ADMIN_APPEARANCE_QUESTION_LAYOUTS = [
  ["inherit", "Use Question / Game Setting"],
  ["text", "Text"],
  ["compact", "Compact"],
  ["image", "Image"],
  ["list", "List"],
  ["short-answer", "Short Answer"],
  ["wager", "Wager / Market"]
];

function adminAppearanceQuestionSectionKey_(category) {
  return String(category && (category.sectionId || category.SectionId || category.section || category.Section || category.groupName || category.GroupName || category.parentCategoryId || "Questions") || "Questions").trim();
}

function adminAppearanceQuestionLayoutRows_() {
  return ((ADMIN_APPEARANCE_STATE.gameSetup || {}).categories || []).filter(function(category) {
    return category && String(category.id || category.categoryId || "").trim();
  });
}

function adminAppearanceQuestionOverridesHtml_(theme) {
  const questions = theme.questions || {};
  const overrides = questions.overrides || {};
  const sectionOverrides = questions.sectionOverrides || {};
  const rows = adminAppearanceQuestionLayoutRows_();
  const sections = {};
  rows.forEach(function(category) { sections[adminAppearanceQuestionSectionKey_(category)] = true; });
  const optionHtml = function(value, allowInherit) {
    const list = allowInherit ? ADMIN_APPEARANCE_QUESTION_LAYOUTS : ADMIN_APPEARANCE_QUESTION_LAYOUTS.filter(function(item){ return item[0] !== "inherit"; });
    return list.map(function(item){ return '<option value="'+adminAppearanceEscape_(item[0])+'"'+(String(value||"")===item[0]?' selected':'')+'>'+adminAppearanceEscape_(item[1])+'</option>'; }).join('');
  };
  const sectionHtml = Object.keys(sections).map(function(key) {
    return '<label class="appearance-question-override-row"><span>'+adminAppearanceEscape_(key)+'</span><select class="input" data-question-section-id="'+adminAppearanceEscape_(key)+'">'+optionHtml(sectionOverrides[key] || "inherit", true)+'</select></label>';
  }).join('');
  const questionHtml = rows.map(function(category) {
    const id = String(category.id || category.categoryId || "");
    const title = String(category.title || category.name || category.category || category.question || category.Question || id);
    const current = overrides[id] || "inherit";
    return '<label class="appearance-question-override-row"><span title="'+adminAppearanceEscape_(title)+'">'+adminAppearanceEscape_(title)+'</span><select class="input" data-question-layout-id="'+adminAppearanceEscape_(id)+'">'+optionHtml(current, true)+'</select></label>';
  }).join('');
  return '<div class="appearance-question-override-grid"><h4>Section Overrides</h4>'+(sectionHtml||'<small>No sections detected.</small>')+'<h4>Individual Question Overrides</h4>'+(questionHtml||'<small>No questions found in this game.</small>')+'</div>';
}

function adminAppearanceStudioDefaults_(theme) {
  theme = theme || {};
  const team = theme.team || {};
  const row = theme.row || {};
  const colors = theme.colors || {};
  const layout = theme.layout || {};
  const typography = theme.typography || {};
  const images = theme.images || {};
  const selection = theme.selection || {};
  const result = theme.result || {};
  const live = theme.live || {};
  const background = theme.background || {};
  const confidence = theme.confidence || {};
  const score = theme.score || {};
  const leaderboard = theme.leaderboard || {};
  const page = theme.page || {};
  const questions = theme.questions || {};
  const details = theme.details || {};
  const bars = theme.bars || {};
  const textBackdrop = theme.textBackdrop || {};
  const winner = theme.winner || {};
  const positioning = theme.positioning || {};
  const overlays = theme.overlays || {};
  const resultTypography = theme.resultTypography || {};
  const correctType = resultTypography.correct || {};
  const incorrectType = resultTypography.incorrect || {};
  const storedStudioVersion = Number(theme.studioVersion) || 0;
  const rawImageLayer = String(images.layer || "").trim().toLowerCase();
  const allowedImageLayers = ["inline", "inline-background", "floating", "background"];
  let normalizedImageLayer = allowedImageLayers.indexOf(rawImageLayer) !== -1 ? rawImageLayer : "inline";
  // v1.2.17o stored "inline" while labeling it as Floating Art. Preserve the
  // visual intent of already-saved v5 themes; newly-saved v6 themes use the
  // four explicit modes below.
  if (storedStudioVersion > 0 && storedStudioVersion < 6 && rawImageLayer === "inline") normalizedImageLayer = "floating";
  if (String(images.fit || "").toLowerCase() === "full-bleed") normalizedImageLayer = "background";
  const rawSideLayout = theme.sideLayout || {};
  const mirrorSides = rawSideLayout.mirrored === true;

  return {
    studioVersion: 7,
    density: theme.density || "compact",
    layout: {
      rowHeight: adminAppearanceStudioClamp_(layout.rowHeight, 60, 160, 76),
      rowPadding: adminAppearanceStudioClamp_(layout.rowPadding, 0, 24, 7),
      teamGap: adminAppearanceStudioClamp_(layout.teamGap, 0, 28, 7),
      versusWidth: adminAppearanceStudioClamp_(layout.versusWidth, 0, 52, 32),
      confidenceWidth: adminAppearanceStudioClamp_(layout.confidenceWidth, 44, 160, 92),
      teamOrder: layout.teamOrder || "away-home"
    },
    typography: {
      citySize: adminAppearanceStudioClamp_(typography.citySize, 7, 24, team.cityScale === "medium" ? 12 : 10),
      cityWeight: adminAppearanceStudioClamp_(typography.cityWeight, 300, 1000, 700),
      cityOpacity: adminAppearanceStudioClamp_(typography.cityOpacity, 0, 100, 62),
      teamNameSize: adminAppearanceStudioClamp_(typography.teamNameSize, 10, 36, team.nameScale === "xlarge" ? 18 : team.nameScale === "medium" ? 14 : 16),
      teamNameWeight: adminAppearanceStudioClamp_(typography.teamNameWeight, 300, 1000, 950),
      teamNameSpacing: adminAppearanceStudioClamp_(typography.teamNameSpacing, -3, 14, 2.5),
      uppercase: typography.uppercase !== false,
      scoreSize: adminAppearanceStudioClamp_(typography.scoreSize, 9, 34, 12),
      confidenceSize: adminAppearanceStudioClamp_(typography.confidenceSize, 11, 38, 16)
    },
    images: {
      size: adminAppearanceStudioClamp_(images.size, 20, 140, 38),
      opacity: adminAppearanceStudioClamp_(images.opacity, 0, 100, 100),
      shape: images.shape || "square",
      verticalAlign: images.verticalAlign || "center",
      oversize: images.oversize === true,
      fit: images.fit || "contain",
      layer: normalizedImageLayer,
      zoom: adminAppearanceStudioClamp_(images.zoom, 50, 220, 100),
      x: adminAppearanceStudioClamp_(images.x, 0, 100, 50),
      y: adminAppearanceStudioClamp_(images.y, 0, 100, 50)
    },
    positioning: {
      cityAlign: positioning.cityAlign || "left",
      nameAlign: positioning.nameAlign || "left",
      textVertical: positioning.textVertical || "center",
      textOffsetX: adminAppearanceStudioClamp_(positioning.textOffsetX, -30, 30, 0),
      textOffsetY: adminAppearanceStudioClamp_(positioning.textOffsetY, -30, 30, 0),
      scoreAnchor: positioning.scoreAnchor || "bottom-left",
      scoreOffsetX: adminAppearanceStudioClamp_(positioning.scoreOffsetX, -50, 50, 0),
      scoreOffsetY: adminAppearanceStudioClamp_(positioning.scoreOffsetY, -50, 50, 0),
      confidenceVertical: positioning.confidenceVertical || "center",
      statusAlign: positioning.statusAlign || "left"
    },
    sideLayout: {
      separate: true,
      mirrored: mirrorSides,
      away: {
        textAlign: theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.textAlign || positioning.nameAlign || "left",
        textVertical: theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.textVertical || positioning.textVertical || "center",
        textOffsetX: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.textOffsetX, -40, 40, positioning.textOffsetX == null ? 0 : positioning.textOffsetX),
        textOffsetY: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.textOffsetY, -40, 40, positioning.textOffsetY == null ? 0 : positioning.textOffsetY),
        scoreAnchor: theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.scoreAnchor || positioning.scoreAnchor || "bottom-left",
        scoreOffsetX: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.scoreOffsetX, -50, 50, positioning.scoreOffsetX == null ? 0 : positioning.scoreOffsetX),
        scoreOffsetY: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.scoreOffsetY, -50, 50, positioning.scoreOffsetY == null ? 0 : positioning.scoreOffsetY),
        imageX: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.imageX, 0, 100, images.x == null ? 50 : images.x),
        imageY: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.away && theme.sideLayout.away.imageY, 0, 100, images.y == null ? 50 : images.y)
      },
      home: {
        textAlign: theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.textAlign || positioning.nameAlign || "left",
        textVertical: theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.textVertical || positioning.textVertical || "center",
        textOffsetX: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.textOffsetX, -40, 40, positioning.textOffsetX == null ? 0 : positioning.textOffsetX),
        textOffsetY: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.textOffsetY, -40, 40, positioning.textOffsetY == null ? 0 : positioning.textOffsetY),
        scoreAnchor: theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.scoreAnchor || positioning.scoreAnchor || "bottom-left",
        scoreOffsetX: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.scoreOffsetX, -50, 50, positioning.scoreOffsetX == null ? 0 : positioning.scoreOffsetX),
        scoreOffsetY: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.scoreOffsetY, -50, 50, positioning.scoreOffsetY == null ? 0 : positioning.scoreOffsetY),
        imageX: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.imageX, 0, 100, images.x == null ? 50 : images.x),
        imageY: adminAppearanceStudioClamp_(theme.sideLayout && theme.sideLayout.home && theme.sideLayout.home.imageY, 0, 100, images.y == null ? 50 : images.y)
      }
    },
    selection: {
      selectedBorderColor: selection.selectedBorderColor || colors.accent || "#60a5fa",
      selectedBorderWidth: adminAppearanceStudioClamp_(selection.selectedBorderWidth, 0, 10, 2),
      selectedTint: selection.selectedTint || colors.accent || "#2563eb",
      selectedTintOpacity: adminAppearanceStudioClamp_(selection.selectedTintOpacity, 0, 80, 20),
      unselectedTreatment: selection.unselectedTreatment || team.unselectedTreatment || "grayscale",
      unselectedGrayscale: adminAppearanceStudioClamp_(selection.unselectedGrayscale, 0, 100, 100),
      unselectedOpacity: adminAppearanceStudioClamp_(selection.unselectedOpacity, 0, 100, 48)
    },
    result: {
      correctTreatment: result.correctTreatment || "green-outline",
      incorrectTreatment: result.incorrectTreatment || "red-outline",
      borderWidth: adminAppearanceStudioClamp_(result.borderWidth, 0, 10, 2)
    },
    resultTypography: {
      correct: {
        city: correctType.city || colors.text || "#ffffff",
        teamName: correctType.teamName || colors.text || "#ffffff",
        score: correctType.score || colors.correct || "#22c55e",
        status: correctType.status || colors.correct || "#22c55e",
        confidenceNumber: correctType.confidenceNumber || colors.correct || "#22c55e",
        confidenceLabel: correctType.confidenceLabel || colors.muted || "#94a3b8",
        points: correctType.points || colors.correct || "#22c55e"
      },
      incorrect: {
        city: incorrectType.city || colors.text || "#ffffff",
        teamName: incorrectType.teamName || colors.text || "#ffffff",
        score: incorrectType.score || colors.incorrect || "#ef4444",
        status: incorrectType.status || colors.incorrect || "#ef4444",
        confidenceNumber: incorrectType.confidenceNumber || colors.incorrect || "#ef4444",
        confidenceLabel: incorrectType.confidenceLabel || colors.muted || "#94a3b8",
        points: incorrectType.points || colors.incorrect || "#ef4444"
      }
    },
    overlays: {
      selectedColor: overlays.selectedColor || selection.selectedTint || "#2563eb",
      selectedOpacity: adminAppearanceStudioClamp_(overlays.selectedOpacity, 0, 80, selection.selectedTintOpacity == null ? 20 : selection.selectedTintOpacity),
      unselectedColor: overlays.unselectedColor || "#020617",
      unselectedOpacity: adminAppearanceStudioClamp_(overlays.unselectedOpacity, 0, 80, 12),
      correctMode: overlays.correctMode || "solid",
      correctColor: overlays.correctColor || colors.correct || "#22c55e",
      correctColor2: overlays.correctColor2 || "#14532d",
      correctOpacity: adminAppearanceStudioClamp_(overlays.correctOpacity, 0, 100, 12),
      correctOpacity2: adminAppearanceStudioClamp_(overlays.correctOpacity2, 0, 100, overlays.correctOpacity == null ? 12 : overlays.correctOpacity),
      correctAngle: adminAppearanceStudioClamp_(overlays.correctAngle, 0, 360, 135),
      incorrectMode: overlays.incorrectMode || "solid",
      incorrectColor: overlays.incorrectColor || colors.incorrect || "#ef4444",
      incorrectColor2: overlays.incorrectColor2 || "#7f1d1d",
      incorrectOpacity: adminAppearanceStudioClamp_(overlays.incorrectOpacity, 0, 100, 12),
      incorrectOpacity2: adminAppearanceStudioClamp_(overlays.incorrectOpacity2, 0, 100, overlays.incorrectOpacity == null ? 12 : overlays.incorrectOpacity),
      incorrectAngle: adminAppearanceStudioClamp_(overlays.incorrectAngle, 0, 360, 135),
      liveColor: overlays.liveColor || colors.live || "#ef4444",
      liveOpacity: adminAppearanceStudioClamp_(overlays.liveOpacity, 0, 60, 0),
      finalColor: overlays.finalColor || colors.final || "#e2e8f0",
      finalOpacity: adminAppearanceStudioClamp_(overlays.finalOpacity, 0, 60, 0)
    },
    visibility: adminAppearanceStudioVisibilityDefaults_(theme.visibility),
    row: {
      corners: row.corners || "soft",
      radius: adminAppearanceStudioClamp_(row.radius, 0, 32, row.corners === "rounded" ? 18 : row.corners === "square" ? 0 : 10),
      spacing: row.spacing || "tight",
      shadow: row.shadow || "soft"
    },
    live: {
      badgeStyle: live.badgeStyle || "text",
      finalBadgeStyle: live.finalBadgeStyle || "text"
    },
    background: {
      mode: background.mode || "gradient",
      solid: background.solid || colors.surface || "#0f172a",
      gradientStart: background.gradientStart || colors.surface || "#1e293b",
      gradientEnd: background.gradientEnd || "#0f172a",
      gradientAngle: adminAppearanceStudioClamp_(background.gradientAngle, 0, 360, 180),
      overlayOpacity: adminAppearanceStudioClamp_(background.overlayOpacity, 0, 80, 0)
    },
    confidence: {
      style: confidence.style || "filled",
      background: confidence.background || "#0b1220",
      text: confidence.text || colors.text || "#ffffff",
      border: confidence.border || colors.accent || "#60a5fa",
      radius: adminAppearanceStudioClamp_(confidence.radius, 0, 28, 8),
      lockedOpacity: adminAppearanceStudioClamp_(confidence.lockedOpacity, 20, 100, 62),
      mobileArrowSize: adminAppearanceStudioClamp_(confidence.mobileArrowSize, 0, 10, 4),
      mobileArrowColor: confidence.mobileArrowColor || colors.muted || "#94a3b8"
    },
    score: {
      background: score.background || "#e2e8f0",
      backgroundOpacity: adminAppearanceStudioClamp_(score.backgroundOpacity, 0, 100, 100),
      text: score.text || "#0f172a",
      border: score.border || "#0f172a",
      borderOpacity: adminAppearanceStudioClamp_(score.borderOpacity, 0, 100, 100),
      radius: adminAppearanceStudioClamp_(score.radius, 0, 24, 7),
      paddingX: adminAppearanceStudioClamp_(score.paddingX, 0, 20, 4),
      paddingY: adminAppearanceStudioClamp_(score.paddingY, 0, 14, 2)
    },
    scoreboard: {
      background: theme.scoreboard && theme.scoreboard.background || "#0b1220",
      backgroundOpacity: adminAppearanceStudioClamp_(theme.scoreboard && theme.scoreboard.backgroundOpacity, 0, 100, 72),
      text: theme.scoreboard && theme.scoreboard.text || colors.muted || "#94a3b8",
      border: theme.scoreboard && theme.scoreboard.border || "#334155",
      borderOpacity: adminAppearanceStudioClamp_(theme.scoreboard && theme.scoreboard.borderOpacity, 0, 100, 32),
      height: adminAppearanceStudioClamp_(theme.scoreboard && theme.scoreboard.height, 18, 64, 26),
      radius: adminAppearanceStudioClamp_(theme.scoreboard && theme.scoreboard.radius, 0, 20, 0),
      fontSize: adminAppearanceStudioClamp_(theme.scoreboard && theme.scoreboard.fontSize, 7, 20, 10)
    },
    leaderboard: {
      layout: leaderboard.layout || "cards",
      density: leaderboard.density || "standard",
      cardMode: leaderboard.cardMode || "gradient",
      cardBackground: leaderboard.cardBackground || "#20284a",
      gradientStart: leaderboard.gradientStart || leaderboard.cardBackground || "#20284a",
      gradientEnd: leaderboard.gradientEnd || "#354785",
      gradientAngle: adminAppearanceStudioClamp_(leaderboard.gradientAngle, 0, 360, 135),
      cardOpacity: adminAppearanceStudioClamp_(leaderboard.cardOpacity, 20, 100, 100),
      text: leaderboard.text || "#ffffff",
      muted: leaderboard.muted || "#cbd5e1",
      border: leaderboard.border || "#475569",
      borderOpacity: adminAppearanceStudioClamp_(leaderboard.borderOpacity, 0, 100, 30),
      radius: adminAppearanceStudioClamp_(leaderboard.radius, 0, 32, 18),
      rowGap: adminAppearanceStudioClamp_(leaderboard.rowGap, 0, 28, 12),
      rankStyle: leaderboard.rankStyle || "circle",
      rankBackground: leaderboard.rankBackground || "#ffffff",
      rankOpacity: adminAppearanceStudioClamp_(leaderboard.rankOpacity, 0, 100, 16),
      rankText: leaderboard.rankText || "#ffffff",
      showAvatar: leaderboard.showAvatar !== false,
      avatarShape: leaderboard.avatarShape || "round",
      avatarSize: adminAppearanceStudioClamp_(leaderboard.avatarSize, 24, 72, 42),
      showCareerLink: leaderboard.showCareerLink !== false,
      showCompare: leaderboard.showCompare !== false,
      highlightTopThree: leaderboard.highlightTopThree !== false,
      gold: leaderboard.gold || "#facc15",
      silver: leaderboard.silver || "#cbd5e1",
      bronze: leaderboard.bronze || "#d97706",
      highlightCurrent: leaderboard.highlightCurrent !== false,
      currentColor: leaderboard.currentColor || colors.accent || "#60a5fa",
      currentOpacity: adminAppearanceStudioClamp_(leaderboard.currentOpacity, 0, 100, 18),
      showScore: leaderboard.showScore !== false,
      showRemaining: leaderboard.showRemaining !== false,
      showWinChance: leaderboard.showWinChance !== false,
      showStatues: leaderboard.showStatues !== false,
      showWagerStats: leaderboard.showWagerStats !== false,
      showMiniGames: leaderboard.showMiniGames !== false,
      showSeasonPick: leaderboard.showSeasonPick !== false,
      miniPanelMode: leaderboard.miniPanelMode || "gradient",
      miniPanelBackground: leaderboard.miniPanelBackground || "#0f172a",
      miniPanelGradientStart: leaderboard.miniPanelGradientStart || "#0f172a",
      miniPanelGradientEnd: leaderboard.miniPanelGradientEnd || "#1e293b",
      miniPanelAngle: adminAppearanceStudioClamp_(leaderboard.miniPanelAngle, 0, 360, 135)
    },
    page: {
      backgroundMode: page.backgroundMode || "solid",
      background: page.background || "#020617",
      gradientStart: page.gradientStart || page.background || "#020617",
      gradientEnd: page.gradientEnd || "#0f172a",
      gradientAngle: adminAppearanceStudioClamp_(page.gradientAngle, 0, 360, 180),
      headerMode: page.headerMode || "solid",
      headerBackground: page.headerBackground || "#0f172a",
      headerGradientStart: page.headerGradientStart || page.headerBackground || "#0f172a",
      headerGradientEnd: page.headerGradientEnd || "#1e293b",
      headerGradientAngle: adminAppearanceStudioClamp_(page.headerGradientAngle, 0, 360, 135),
      headerOpacity: adminAppearanceStudioClamp_(page.headerOpacity, 0, 100, 100),
      headerText: page.headerText || "#ffffff",
      headerMuted: page.headerMuted || "#94a3b8",
      headerRadius: adminAppearanceStudioClamp_(page.headerRadius, 0, 32, 16),
      sectionGap: adminAppearanceStudioClamp_(page.sectionGap, 4, 36, 18)
    },
    questions: {
      defaultLayout: questions.defaultLayout || "inherit",
      cardMode: questions.cardMode || "solid",
      cardBackground: questions.cardBackground || "#0f172a",
      cardGradientStart: questions.cardGradientStart || questions.cardBackground || "#0f172a",
      cardGradientEnd: questions.cardGradientEnd || "#1e293b",
      cardGradientAngle: adminAppearanceStudioClamp_(questions.cardGradientAngle, 0, 360, 180),
      cardOpacity: adminAppearanceStudioClamp_(questions.cardOpacity, 0, 100, 96),
      headerMode: questions.headerMode || "solid",
      headerBackground: questions.headerBackground || "#111111",
      headerGradientStart: questions.headerGradientStart || questions.headerBackground || "#111111",
      headerGradientEnd: questions.headerGradientEnd || "#1e293b",
      headerGradientAngle: adminAppearanceStudioClamp_(questions.headerGradientAngle, 0, 360, 90),
      headerOpacity: adminAppearanceStudioClamp_(questions.headerOpacity, 0, 100, 100),
      titleColor: questions.titleColor || "#ffffff",
      titleSize: adminAppearanceStudioClamp_(questions.titleSize, 10, 28, 16),
      answerMode: questions.answerMode || "solid",
      answerBackground: questions.answerBackground || "#1e293b",
      answerGradientStart: questions.answerGradientStart || questions.answerBackground || "#1e293b",
      answerGradientEnd: questions.answerGradientEnd || "#0f172a",
      answerGradientAngle: adminAppearanceStudioClamp_(questions.answerGradientAngle, 0, 360, 180),
      answerText: questions.answerText || "#ffffff",
      answerBorder: questions.answerBorder || "#334155",
      selectedMode: questions.selectedMode || "solid",
      selectedBackground: questions.selectedBackground || "#854d0e",
      selectedGradientStart: questions.selectedGradientStart || questions.selectedBackground || "#854d0e",
      selectedGradientEnd: questions.selectedGradientEnd || "#f59e0b",
      selectedGradientAngle: adminAppearanceStudioClamp_(questions.selectedGradientAngle, 0, 360, 135),
      selectedText: questions.selectedText || "#fde68a",
      selectedBorder: questions.selectedBorder || "#facc15",
      correctColor: questions.correctColor || "#22c55e",
      incorrectColor: questions.incorrectColor || "#ef4444",
      radius: adminAppearanceStudioClamp_(questions.radius, 0, 32, 16),
      gap: adminAppearanceStudioClamp_(questions.gap, 2, 28, 12),
      textColumns: adminAppearanceStudioClamp_(questions.textColumns, 1, 4, 2),
      compactColumns: adminAppearanceStudioClamp_(questions.compactColumns, 1, 4, 1),
      compactImageSize: adminAppearanceStudioClamp_(questions.compactImageSize, 0, 90, 44),
      imageColumns: adminAppearanceStudioClamp_(questions.imageColumns, 1, 6, 4),
      imageAspect: questions.imageAspect || "2/3",
      imageFit: questions.imageFit || "cover",
      imageZoom: adminAppearanceStudioClamp_(questions.imageZoom, 50, 220, 100),
      imageX: adminAppearanceStudioClamp_(questions.imageX, 0, 100, 50),
      imageY: adminAppearanceStudioClamp_(questions.imageY, 0, 100, 50),
      imageOpacity: adminAppearanceStudioClamp_(questions.imageOpacity, 0, 100, 100),
      imageTextOverlay: questions.imageTextOverlay === true,
      imageOverlayMode: questions.imageOverlayMode || "gradient",
      imageOverlayColor: questions.imageOverlayColor || "#000000",
      imageOverlayColor2: questions.imageOverlayColor2 || "#000000",
      imageOverlayAngle: adminAppearanceStudioClamp_(questions.imageOverlayAngle, 0, 360, 0),
      imageOverlayPlacement: questions.imageOverlayPlacement || "bottom",
      imageOverlayOpacity: adminAppearanceStudioClamp_(questions.imageOverlayOpacity, 0, 100, 35),
      imageOverlayOpacity2: adminAppearanceStudioClamp_(questions.imageOverlayOpacity2, 0, 100, questions.imageOverlayOpacity == null ? 0 : questions.imageOverlayOpacity),
      wagerColumns: adminAppearanceStudioClamp_(questions.wagerColumns, 1, 3, 2),
      overrides: Object.assign({}, questions.overrides || {}),
      sectionOverrides: Object.assign({}, questions.sectionOverrides || {})
    },
    details: {
      background: details.background || "#0b1220",
      opacity: adminAppearanceStudioClamp_(details.opacity, 0, 100, 86),
      text: details.text || "#cbd5e1",
      border: details.border || "#334155",
      radius: adminAppearanceStudioClamp_(details.radius, 0, 24, 10)
    },
    bars: {
      sortMode: bars.sortMode || "solid",
      sortBackground: bars.sortBackground || "#0f172a",
      sortGradientStart: bars.sortGradientStart || bars.sortBackground || "#0f172a",
      sortGradientEnd: bars.sortGradientEnd || "#1e293b",
      sortGradientAngle: adminAppearanceStudioClamp_(bars.sortGradientAngle, 0, 360, 90),
      sortText: bars.sortText || "#ffffff",
      saveMode: bars.saveMode || "solid",
      saveBackground: bars.saveBackground || "#2563eb",
      saveGradientStart: bars.saveGradientStart || bars.saveBackground || "#2563eb",
      saveGradientEnd: bars.saveGradientEnd || "#1d4ed8",
      saveGradientAngle: adminAppearanceStudioClamp_(bars.saveGradientAngle, 0, 360, 90),
      saveText: bars.saveText || "#ffffff",
      buttonRadius: adminAppearanceStudioClamp_(bars.buttonRadius, 0, 24, 9)
    },
    textBackdrop: {
      enabled: textBackdrop.enabled === true,
      mode: textBackdrop.mode || "gradient",
      color: textBackdrop.color || "#000000",
      color2: textBackdrop.color2 || "#000000",
      opacity: adminAppearanceStudioClamp_(textBackdrop.opacity, 0, 100, 45),
      angle: adminAppearanceStudioClamp_(textBackdrop.angle, 0, 360, 90),
      padding: adminAppearanceStudioClamp_(textBackdrop.padding, 0, 24, 6),
      radius: adminAppearanceStudioClamp_(textBackdrop.radius, 0, 24, 6)
    },
    winner: {
      overlayType: winner.overlayType || "none",
      color: winner.color || "#22c55e",
      color2: winner.color2 || "#14532d",
      opacity: adminAppearanceStudioClamp_(winner.opacity, 0, 100, 20),
      angle: adminAppearanceStudioClamp_(winner.angle, 0, 360, 135),
      placement: winner.placement || "full",
      decoration: winner.decoration || "none",
      decorationPosition: winner.decorationPosition || "top-right",
      decorationSize: adminAppearanceStudioClamp_(winner.decorationSize, 12, 64, 28),
      decorationColor: winner.decorationColor || "#facc15"
    },
    colors: {
      accent: colors.accent || "#60a5fa",
      surface: colors.surface || "#0f172a",
      text: colors.text || "#ffffff",
      muted: colors.muted || "#94a3b8",
      correct: colors.correct || "#22c55e",
      incorrect: colors.incorrect || "#ef4444",
      live: colors.live || "#ef4444",
      final: colors.final || "#e2e8f0"
    },
    team: {
      cityScale: team.cityScale || "small",
      nameScale: team.nameScale || "large",
      selectedTreatment: team.selectedTreatment || "full-color",
      unselectedTreatment: selection.unselectedTreatment || team.unselectedTreatment || "grayscale",
      imageVariant: team.imageVariant || "default"
    }
  };
}

function adminAppearanceStudioRange_(id, label, value, min, max, step, suffix) {
  return `<label class="appearance-studio-range"><span>${label}<output id="${id}Out">${adminAppearanceEscape_(value)}${adminAppearanceEscape_(suffix || "")}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${adminAppearanceEscape_(value)}" data-output="${id}Out" data-suffix="${adminAppearanceEscape_(suffix || "")}"></label>`;
}

function adminAppearanceStudioColor_(id, label, value) {
  return `<label class="appearance-studio-color"><span>${label}</span><input id="${id}" type="color" value="${adminAppearanceEscape_(value)}"></label>`;
}

function adminAppearanceStudioSelect_(id, label, value, options) {
  return `<label><span>${label}</span><select id="${id}" class="input">${options.map(function(item) { const pair = Array.isArray(item) ? item : [item, item]; return '<option value="' + adminAppearanceEscape_(pair[0]) + '"' + (String(value) === String(pair[0]) ? ' selected' : '') + '>' + adminAppearanceEscape_(pair[1]) + '</option>'; }).join('')}</select></label>`;
}

function adminAppearanceStudioVisibilityMatrix_(theme) {
  const visibility = adminAppearanceStudioVisibilityDefaults_(theme && theme.visibility);
  return `<div class="appearance-visibility-scroll" tabindex="0" aria-label="Element visibility device columns. Scroll horizontally for Tablet and Mobile."><div class="appearance-visibility-matrix">
    <div class="appearance-visibility-head"><span>Element</span><b>All</b><b>Desktop</b><b>Tablet</b><b>Mobile</b></div>
    ${ADMIN_APPEARANCE_VISIBILITY_ELEMENTS.map(function(item) {
      const key = item[0];
      const label = item[1];
      return `<div class="appearance-visibility-row">
        <span>${adminAppearanceEscape_(label)}</span>
        <input type="checkbox" id="appearanceThemeVis_${key}" ${visibility.elements[key] ? 'checked' : ''} aria-label="Show ${adminAppearanceEscape_(label)}">
        <input type="checkbox" id="appearanceThemeVisDesktop_${key}" ${visibility.devices.desktop[key] ? 'checked' : ''} aria-label="Show ${adminAppearanceEscape_(label)} on desktop">
        <input type="checkbox" id="appearanceThemeVisTablet_${key}" ${visibility.devices.tablet[key] ? 'checked' : ''} aria-label="Show ${adminAppearanceEscape_(label)} on tablet">
        <input type="checkbox" id="appearanceThemeVisMobile_${key}" ${visibility.devices.mobile[key] ? 'checked' : ''} aria-label="Show ${adminAppearanceEscape_(label)} on mobile">
      </div>`;
    }).join('')}
  </div></div>`;
}

function adminAppearanceStudioResultColors_(prefix, title, colors) {
  return `<div class="appearance-result-color-group"><strong>${adminAppearanceEscape_(title)}</strong>
    ${adminAppearanceStudioColor_(prefix + "City", "City", colors.city)}
    ${adminAppearanceStudioColor_(prefix + "Name", "Team Name", colors.teamName)}
    ${adminAppearanceStudioColor_(prefix + "Score", "Score", colors.score)}
    ${adminAppearanceStudioColor_(prefix + "Status", "Status", colors.status)}
    ${adminAppearanceStudioColor_(prefix + "Confidence", "Confidence #", colors.confidenceNumber)}
    ${adminAppearanceStudioColor_(prefix + "Label", "Confidence Label", colors.confidenceLabel)}
    ${adminAppearanceStudioColor_(prefix + "Points", "Points", colors.points)}
  </div>`;
}

function adminAppearancePreviewEntities_() {
  const entities = ADMIN_APPEARANCE_STATE.entities || adminAppearanceUniqueEntities_();
  const defaults = [
    { entityName: "Chicago Bears", defaultImageUrl: "", entityType: "team", entityId: "CHI" },
    { entityName: "Detroit Lions", defaultImageUrl: "", entityType: "team", entityId: "DET" }
  ];
  return [entities[0] || defaults[0], entities[1] || defaults[1]].map(function(entity) {
    const parts = String(entity.entityName || "Team").trim().split(/\s+/);
    const nickname = parts.pop() || "TEAM";
    const city = parts.join(" ") || "Team";
    const resolved = adminAppearanceResolvedPreview_(entity);
    return { city: city, nickname: nickname, imageUrl: resolved.url || entity.defaultImageUrl || "" };
  });
}

function adminAppearanceThemeEditor_() {
  const selectedId = ADMIN_APPEARANCE_STATE.selectedThemePackId || adminAppearanceDefaultTheme_();
  const row = ADMIN_APPEARANCE_STATE.themeNewMode ? null : adminAppearanceThemeById_(selectedId);
  const theme = adminAppearanceStudioDefaults_(adminAppearanceJson_(row && row.ThemeJSON));
  const themeId = row ? row.ThemePackId : "";
  const themeName = row ? row.ThemeName : "";
  const baseTheme = row ? row.BaseThemeId : "app-default";

  return `
    <div class="appearance-theme-editor appearance-studio" data-theme-id="${adminAppearanceEscape_(themeId)}">
      <div class="appearance-editor-manager">
        <div class="appearance-editor-manager-main">
          <label>Theme to Edit<select class="input" onchange="adminAppearanceSelectThemeEditor_(this.value)">${adminAppearanceThemeOptions_(selectedId, false)}</select></label>
          <label>Theme Name<input id="appearanceThemeName" class="input" value="${adminAppearanceEscape_(themeName)}" placeholder="My Theme"></label>
        </div>
        <div class="appearance-editor-mode-note">${row ? 'Editing existing theme <strong>' + adminAppearanceEscape_(themeName || themeId) + '</strong>. <b>Save Changes</b> updates only this theme; changing its name keeps the same internal ID.' : 'Creating a new theme. Its internal ID will be generated automatically when saved.'}</div>
        <div class="appearance-editor-manager-actions">
          <button type="button" class="button secondary" onclick="adminAppearanceDuplicateTheme_()">Duplicate Theme</button>
          <button type="button" class="button secondary" onclick="adminAppearanceCreateBlankTheme_()">Create New Theme</button>
        </div>
        <details class="appearance-technical-details">
          <summary>Advanced / Technical Details</summary>
          <div class="appearance-technical-grid">
            <label>Theme ID<input id="appearanceThemeId" class="input" value="${adminAppearanceEscape_(themeId)}" placeholder="Generated automatically" readonly></label>
            <label>Base Theme<select id="appearanceThemeBase" class="input">${adminAppearanceThemeOptions_(baseTheme, true)}</select></label>
          </div>
          <div class="admin-sub">The Theme ID is permanent. Renaming a theme changes its display name only. Duplicate/Create New generates a separate ID.</div>
        </details>
      </div>
      <div class="appearance-studio-presets">
        <strong>Quick Presets</strong>
        <button type="button" class="button secondary" onclick="adminAppearanceApplyPreset_('basic')">Basic</button>
        <button type="button" class="button secondary" onclick="adminAppearanceApplyPreset_('simple')">Simple</button>
        <button type="button" class="button secondary" onclick="adminAppearanceApplyPreset_('advanced')">Advanced</button>
        <button type="button" class="button secondary" onclick="adminAppearanceApplyPreset_('mobile')">Mobile Friendly</button>
        <small>Presets change the visible controls only. Save when you like the result.</small>
      </div>

      <div class="appearance-studio-shell">
        <aside class="appearance-studio-controls">
          <details open><summary>Layout & Density</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeDensity", "Density Preset", theme.density, [["compact","Compact"],["standard","Standard"],["comfortable","Comfortable"]])}
            ${adminAppearanceStudioRange_("appearanceThemeRowHeight", "Row Height", theme.layout.rowHeight, 60, 140, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeRowPadding", "Row Padding", theme.layout.rowPadding, 2, 20, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeGap", "Team Gap", theme.layout.teamGap, 0, 24, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeVsWidth", "VS Width", theme.layout.versusWidth, 12, 48, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeConfidenceWidth", "Confidence Width", theme.layout.confidenceWidth, 52, 140, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeTeamOrder", "Team Order", theme.layout.teamOrder, [["away-home","Away Left · Home Right"],["home-away","Home Left · Away Right"]])}
            ${adminAppearanceStudioRange_("appearanceThemeRadius", "Row Corners", theme.row.radius, 0, 28, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeShadow", "Shadow", theme.row.shadow, [["none","None"],["soft","Soft"],["strong","Strong"]])}
          </div></details>

          <details><summary>Typography</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioRange_("appearanceThemeCitySize", "City Size", theme.typography.citySize, 8, 18, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeCityWeight", "City Weight", theme.typography.cityWeight, 400, 900, 100, "")}
            ${adminAppearanceStudioRange_("appearanceThemeCityOpacity", "City Opacity", theme.typography.cityOpacity, 20, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeNameSize", "Team Name Size", theme.typography.teamNameSize, 11, 28, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeNameWeight", "Team Name Weight", theme.typography.teamNameWeight, 500, 1000, 50, "")}
            ${adminAppearanceStudioRange_("appearanceThemeNameSpacing", "Name Letter Spacing", theme.typography.teamNameSpacing, -2, 12, .5, "px")}
            <label class="appearance-studio-check"><input id="appearanceThemeUppercase" type="checkbox" ${theme.typography.uppercase ? 'checked' : ''}><span>Uppercase team name</span></label>
            ${adminAppearanceStudioRange_("appearanceThemeScoreSize", "Score Size", theme.typography.scoreSize, 10, 26, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeConfidenceSize", "Confidence Number Size", theme.typography.confidenceSize, 12, 30, 1, "px")}
          </div></details>

          <details open><summary>Images & Canvas Mode</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeImageLayer", "Image Canvas Mode", theme.images.layer, [["inline","Inline Logo/Image"],["inline-background","Inline + Background Art"],["floating","Floating Art · Anywhere on Button"],["background","Full Button Background · Text & Score on Top"]])}
            <div class="appearance-studio-inline-note">Four real renderers — not one image box with competing overrides. Full Button owns the whole button surface.</div>
            ${adminAppearanceStudioRange_("appearanceThemeImageSize", "Image / Art Size", theme.images.size, 20, 220, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeImageOpacity", "Image Opacity", theme.images.opacity, 0, 100, 1, "%")}
            <div data-image-modes="inline inline-background floating">
              ${adminAppearanceStudioSelect_("appearanceThemeImageShape", "Image Shape", theme.images.shape, [["square","Square"],["soft","Soft"],["round","Round"]])}
            </div>
            <div data-image-modes="inline">
              ${adminAppearanceStudioSelect_("appearanceThemeImageAlign", "Vertical Align", theme.images.verticalAlign, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
              <div class="appearance-studio-inline-note">Inline uses Image / Art Size. X/Y and Zoom are intentionally not used in classic inline layout.</div>
            </div>
            <div data-image-modes="inline-background floating background">
              ${adminAppearanceStudioSelect_("appearanceThemeImageFit", "Image Fit", theme.images.fit, [["contain","Contain"],["cover","Cover"],["full-bleed","Full Button Cover"]])}
              ${adminAppearanceStudioRange_("appearanceThemeImageZoom", "Image Zoom", theme.images.zoom, 50, 300, 1, "%")}
              ${adminAppearanceStudioRange_("appearanceThemeImageX", "Image X Position", theme.images.x, 0, 100, 1, "%")}
              ${adminAppearanceStudioRange_("appearanceThemeImageY", "Image Y Position", theme.images.y, 0, 100, 1, "%")}
            </div>
            <div data-image-modes="inline-background floating">
              <label class="appearance-studio-check"><input id="appearanceThemeImageOversize" type="checkbox" ${theme.images.oversize ? 'checked' : ''}><span>Allow artwork to oversize</span></label>
            </div>
            <div data-image-modes="background" class="appearance-studio-inline-note">Full Button ignores Image / Art Size. Fit + Zoom + X/Y frame the image across the entire button.</div>
          </div></details>

          <details><summary>Team Text Readability Overlay</summary><div class="appearance-studio-panel">
            <label class="appearance-studio-check"><input id="appearanceThemeTextBackdropEnabled" type="checkbox" ${theme.textBackdrop.enabled ? 'checked' : ''}><span>Overlay behind City / Team text</span></label>
            ${adminAppearanceStudioSelect_("appearanceThemeTextBackdropMode", "Overlay Type", theme.textBackdrop.mode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeTextBackdropColor", "Overlay Color", theme.textBackdrop.color)}
            ${adminAppearanceStudioColor_("appearanceThemeTextBackdropColor2", "Gradient Color 2", theme.textBackdrop.color2)}
            ${adminAppearanceStudioRange_("appearanceThemeTextBackdropOpacity", "Overlay Opacity", theme.textBackdrop.opacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeTextBackdropAngle", "Gradient Angle", theme.textBackdrop.angle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeTextBackdropPadding", "Text Overlay Padding", theme.textBackdrop.padding, 0, 24, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeTextBackdropRadius", "Text Overlay Corners", theme.textBackdrop.radius, 0, 24, 1, "px")}
            <div class="admin-sub">This layer sits in front of the team image but behind City / Team lettering.</div>
          </div></details>

          <details><summary>Element Positioning</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeCityAlign", "City Alignment", theme.positioning.cityAlign, [["left","Left"],["center","Center"],["right","Right"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeNameAlign", "Team Name Alignment", theme.positioning.nameAlign, [["left","Left"],["center","Center"],["right","Right"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeTextVertical", "Text Vertical", theme.positioning.textVertical, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
            ${adminAppearanceStudioRange_("appearanceThemeTextOffsetX", "Text X Offset", theme.positioning.textOffsetX, -30, 30, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeTextOffsetY", "Text Y Offset", theme.positioning.textOffsetY, -30, 30, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeScoreAnchor", "Score Position", theme.positioning.scoreAnchor, [["inline-left","Inline Left"],["inline-right","Inline Right"],["center","Center"],["top-left","Top Left"],["top-right","Top Right"],["bottom-left","Bottom Left"],["bottom-right","Bottom Right"]])}
            ${adminAppearanceStudioRange_("appearanceThemeScoreOffsetX", "Score X Offset", theme.positioning.scoreOffsetX, -50, 50, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeScoreOffsetY", "Score Y Offset", theme.positioning.scoreOffsetY, -50, 50, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeConfidenceVertical", "Confidence Vertical", theme.positioning.confidenceVertical, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeStatusAlign", "Status Alignment", theme.positioning.statusAlign, [["left","Left"],["center","Center"],["right","Right"]])}
          </div></details>

          <details><summary>Home / Away Layout</summary><div class="appearance-studio-panel">
            <label class="appearance-studio-check"><input id="appearanceThemeMirrorSides" type="checkbox" ${theme.sideLayout.mirrored ? 'checked' : ''}><span>Mirror Home / Away layout</span></label>
            <div class="appearance-studio-inline-note">Mirror ON: design Away once and Home automatically flips left/right, score anchor, X offsets and image X. Mirror OFF: Away and Home are edited independently.</div>
            <div class="appearance-side-layout-grid" id="appearanceSideLayoutGrid">
              <fieldset><legend id="appearanceAwayLayoutTitle">Away / Base Layout</legend>
                ${adminAppearanceStudioSelect_("appearanceThemeAwayTextAlign", "Text Alignment", theme.sideLayout.away.textAlign, [["left","Left"],["center","Center"],["right","Right"]])}
                ${adminAppearanceStudioSelect_("appearanceThemeAwayTextVertical", "Text Vertical", theme.sideLayout.away.textVertical, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
                ${adminAppearanceStudioRange_("appearanceThemeAwayTextX", "Text X", theme.sideLayout.away.textOffsetX, -40, 40, 1, "px")}
                ${adminAppearanceStudioRange_("appearanceThemeAwayTextY", "Text Y", theme.sideLayout.away.textOffsetY, -40, 40, 1, "px")}
                ${adminAppearanceStudioSelect_("appearanceThemeAwayScoreAnchor", "Score Position", theme.sideLayout.away.scoreAnchor, [["inline-left","Inline Left"],["inline-right","Inline Right"],["center","Center"],["top-left","Top Left"],["top-right","Top Right"],["bottom-left","Bottom Left"],["bottom-right","Bottom Right"]])}
                ${adminAppearanceStudioRange_("appearanceThemeAwayScoreX", "Score X", theme.sideLayout.away.scoreOffsetX, -50, 50, 1, "px")}
                ${adminAppearanceStudioRange_("appearanceThemeAwayScoreY", "Score Y", theme.sideLayout.away.scoreOffsetY, -50, 50, 1, "px")}
                ${adminAppearanceStudioRange_("appearanceThemeAwayImageX", "Image X", theme.sideLayout.away.imageX, 0, 100, 1, "%")}
                ${adminAppearanceStudioRange_("appearanceThemeAwayImageY", "Image Y", theme.sideLayout.away.imageY, 0, 100, 1, "%")}
              </fieldset>
              <fieldset id="appearanceHomeIndependentControls"><legend>Home · Independent</legend>
                ${adminAppearanceStudioSelect_("appearanceThemeHomeTextAlign", "Text Alignment", theme.sideLayout.home.textAlign, [["left","Left"],["center","Center"],["right","Right"]])}
                ${adminAppearanceStudioSelect_("appearanceThemeHomeTextVertical", "Text Vertical", theme.sideLayout.home.textVertical, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
                ${adminAppearanceStudioRange_("appearanceThemeHomeTextX", "Text X", theme.sideLayout.home.textOffsetX, -40, 40, 1, "px")}
                ${adminAppearanceStudioRange_("appearanceThemeHomeTextY", "Text Y", theme.sideLayout.home.textOffsetY, -40, 40, 1, "px")}
                ${adminAppearanceStudioSelect_("appearanceThemeHomeScoreAnchor", "Score Position", theme.sideLayout.home.scoreAnchor, [["inline-left","Inline Left"],["inline-right","Inline Right"],["center","Center"],["top-left","Top Left"],["top-right","Top Right"],["bottom-left","Bottom Left"],["bottom-right","Bottom Right"]])}
                ${adminAppearanceStudioRange_("appearanceThemeHomeScoreX", "Score X", theme.sideLayout.home.scoreOffsetX, -50, 50, 1, "px")}
                ${adminAppearanceStudioRange_("appearanceThemeHomeScoreY", "Score Y", theme.sideLayout.home.scoreOffsetY, -50, 50, 1, "px")}
                ${adminAppearanceStudioRange_("appearanceThemeHomeImageX", "Image X", theme.sideLayout.home.imageX, 0, 100, 1, "%")}
                ${adminAppearanceStudioRange_("appearanceThemeHomeImageY", "Image Y", theme.sideLayout.home.imageY, 0, 100, 1, "%")}
              </fieldset>
            </div>
          </div></details>

          <details><summary>Selection & Results</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioColor_("appearanceThemeSelectedBorder", "Selected Border", theme.selection.selectedBorderColor)}
            ${adminAppearanceStudioRange_("appearanceThemeSelectedBorderWidth", "Selected Border Width", theme.selection.selectedBorderWidth, 0, 8, 1, "px")}
            ${adminAppearanceStudioColor_("appearanceThemeSelectedTint", "Selected Tint", theme.selection.selectedTint)}
            ${adminAppearanceStudioRange_("appearanceThemeSelectedTintOpacity", "Selected Tint", theme.selection.selectedTintOpacity, 0, 70, 1, "%")}
            ${adminAppearanceStudioSelect_("appearanceThemeUnselected", "Unselected Team", theme.selection.unselectedTreatment, [["grayscale","Black & White"],["dim","Dim"],["none","Full Color"]])}
            ${adminAppearanceStudioRange_("appearanceThemeUnselectedGray", "Grayscale Strength", theme.selection.unselectedGrayscale, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeUnselectedOpacity", "Unselected Opacity", theme.selection.unselectedOpacity, 10, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeCorrect", "Correct Pick", theme.colors.correct)}
            ${adminAppearanceStudioColor_("appearanceThemeIncorrect", "Wrong Pick", theme.colors.incorrect)}
            ${adminAppearanceStudioRange_("appearanceThemeResultBorderWidth", "Result Border Width", theme.result.borderWidth, 0, 10, 1, "px")}
            ${adminAppearanceStudioResultColors_("appearanceThemeCorrectText", "Correct Pick Font Colors", theme.resultTypography.correct)}
            ${adminAppearanceStudioResultColors_("appearanceThemeIncorrectText", "Incorrect Pick Font Colors", theme.resultTypography.incorrect)}
          </div></details>

          <!-- Compatibility marker: Background & Overlay -->
          <details open><summary>Overlays — Background / Selected / Correct / Incorrect / Live</summary><div class="appearance-studio-panel">
            <div class="admin-sub">Result overlays sit above team artwork and below City / Team / Score. Correct and Incorrect can be solid or two-color gradients with independent opacity.</div>
            ${adminAppearanceStudioSelect_("appearanceThemeBackgroundMode", "Row Background", theme.background.mode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeSurface", "Solid Surface", theme.background.solid)}
            ${adminAppearanceStudioColor_("appearanceThemeGradientStart", "Gradient Start", theme.background.gradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeGradientEnd", "Gradient End", theme.background.gradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeGradientAngle", "Gradient Angle", theme.background.gradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeOverlayOpacity", "Whole Row Dark Overlay", theme.background.overlayOpacity, 0, 80, 1, "%")}
            <h4>Selection</h4>
            ${adminAppearanceStudioColor_("appearanceThemeSelectedOverlayColor", "Selected Overlay", theme.overlays.selectedColor)}
            ${adminAppearanceStudioRange_("appearanceThemeSelectedOverlayOpacity", "Selected Overlay Opacity", theme.overlays.selectedOpacity, 0, 80, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeUnselectedOverlayColor", "Unselected Overlay", theme.overlays.unselectedColor)}
            ${adminAppearanceStudioRange_("appearanceThemeUnselectedOverlayOpacity", "Unselected Overlay Opacity", theme.overlays.unselectedOpacity, 0, 80, 1, "%")}
            <h4>Correct Result</h4>
            ${adminAppearanceStudioSelect_("appearanceThemeCorrectOverlayMode", "Correct Overlay Type", theme.overlays.correctMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeCorrectOverlayColor", "Correct Color 1", theme.overlays.correctColor)}
            ${adminAppearanceStudioRange_("appearanceThemeCorrectOverlayOpacity", "Correct Color 1 Opacity", theme.overlays.correctOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeCorrectOverlayColor2", "Correct Color 2", theme.overlays.correctColor2)}
            ${adminAppearanceStudioRange_("appearanceThemeCorrectOverlayOpacity2", "Correct Color 2 Opacity", theme.overlays.correctOpacity2, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeCorrectOverlayAngle", "Correct Gradient Angle", theme.overlays.correctAngle, 0, 360, 1, "°")}
            <h4>Incorrect Result</h4>
            ${adminAppearanceStudioSelect_("appearanceThemeIncorrectOverlayMode", "Incorrect Overlay Type", theme.overlays.incorrectMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeIncorrectOverlayColor", "Incorrect Color 1", theme.overlays.incorrectColor)}
            ${adminAppearanceStudioRange_("appearanceThemeIncorrectOverlayOpacity", "Incorrect Color 1 Opacity", theme.overlays.incorrectOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeIncorrectOverlayColor2", "Incorrect Color 2", theme.overlays.incorrectColor2)}
            ${adminAppearanceStudioRange_("appearanceThemeIncorrectOverlayOpacity2", "Incorrect Color 2 Opacity", theme.overlays.incorrectOpacity2, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeIncorrectOverlayAngle", "Incorrect Gradient Angle", theme.overlays.incorrectAngle, 0, 360, 1, "°")}
            <h4>Game State</h4>
            ${adminAppearanceStudioColor_("appearanceThemeLiveOverlayColor", "Live Row Tint", theme.overlays.liveColor)}
            ${adminAppearanceStudioRange_("appearanceThemeLiveOverlayOpacity", "Live Tint Opacity", theme.overlays.liveOpacity, 0, 60, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeFinalOverlayColor", "Final Row Tint", theme.overlays.finalColor)}
            ${adminAppearanceStudioRange_("appearanceThemeFinalOverlayOpacity", "Final Tint Opacity", theme.overlays.finalOpacity, 0, 60, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeText", "Primary Text", theme.colors.text)}
            ${adminAppearanceStudioColor_("appearanceThemeMuted", "Muted Text", theme.colors.muted)}
          </div></details>

          <details><summary>Element Visibility</summary><div class="appearance-studio-panel appearance-studio-visibility-panel">
            <div class="admin-sub">Master switch plus independent Desktop / Tablet / Mobile visibility. Turning an element off never removes its game data.</div>
            ${adminAppearanceStudioVisibilityMatrix_(theme)}
          </div></details>

          <details><summary>Score Styling</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioColor_("appearanceThemeScoreBg", "Score Background", theme.score.background)}
            ${adminAppearanceStudioRange_("appearanceThemeScoreBgOpacity", "Score Background Opacity", theme.score.backgroundOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeScoreText", "Score Font Color", theme.score.text)}
            ${adminAppearanceStudioColor_("appearanceThemeScoreBorder", "Score Border", theme.score.border)}
            ${adminAppearanceStudioRange_("appearanceThemeScoreBorderOpacity", "Score Border Opacity", theme.score.borderOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeScorePaddingX", "Score Horizontal Padding", theme.score.paddingX, 0, 20, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeScorePaddingY", "Score Vertical Padding", theme.score.paddingY, 0, 14, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeScoreRadius", "Score Corners", theme.score.radius, 0, 24, 1, "px")}
            <div class="admin-sub appearance-studio-inline-note">Score font size remains under Typography. Correct / Incorrect score font colors still override this normal score color in final-result states.</div>
          </div></details>

          <details><summary>Scoreboard & Confidence</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioColor_("appearanceThemeLive", "Live Color", theme.colors.live)}
            ${adminAppearanceStudioColor_("appearanceThemeFinal", "Final Color", theme.colors.final)}
            ${adminAppearanceStudioSelect_("appearanceThemeLiveBadge", "Live Badge", theme.live.badgeStyle, [["text","Text"],["outline","Outline"],["pill","Pill"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeFinalBadge", "Final Badge", theme.live.finalBadgeStyle, [["text","Text"],["outline","Outline"],["pill","Pill"]])}
            ${adminAppearanceStudioColor_("appearanceThemeScoreboardBg", "Scoreboard Background", theme.scoreboard.background)}
            ${adminAppearanceStudioRange_("appearanceThemeScoreboardBgOpacity", "Scoreboard Background Opacity", theme.scoreboard.backgroundOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeScoreboardText", "Scoreboard Text", theme.scoreboard.text)}
            ${adminAppearanceStudioColor_("appearanceThemeScoreboardBorder", "Scoreboard Border", theme.scoreboard.border)}
            ${adminAppearanceStudioRange_("appearanceThemeScoreboardBorderOpacity", "Scoreboard Border Opacity", theme.scoreboard.borderOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeScoreboardHeight", "Scoreboard Height", theme.scoreboard.height, 18, 64, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeScoreboardRadius", "Scoreboard Corners", theme.scoreboard.radius, 0, 20, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeScoreboardFontSize", "Scoreboard Font Size", theme.scoreboard.fontSize, 7, 20, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeConfidenceStyle", "Confidence Box", theme.confidence.style, [["filled","Filled"],["outline","Outline"],["minimal","Minimal"]])}
            ${adminAppearanceStudioColor_("appearanceThemeConfidenceBg", "Confidence Background", theme.confidence.background)}
            ${adminAppearanceStudioColor_("appearanceThemeConfidenceText", "Confidence Text", theme.confidence.text)}
            ${adminAppearanceStudioColor_("appearanceThemeConfidenceBorder", "Confidence Border", theme.confidence.border)}
            ${adminAppearanceStudioRange_("appearanceThemeConfidenceRadius", "Confidence Corners", theme.confidence.radius, 0, 24, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeLockedOpacity", "Locked Opacity", theme.confidence.lockedOpacity, 30, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeMobileArrowSize", "Mobile Selector Arrow", theme.confidence.mobileArrowSize, 0, 10, 1, "px")}
            ${adminAppearanceStudioColor_("appearanceThemeMobileArrowColor", "Mobile Arrow Color", theme.confidence.mobileArrowColor)}
            <div class="admin-sub appearance-studio-inline-note">Set Mobile Selector Arrow to 0px to hide it completely. The confidence number remains centered.</div>
          </div></details>

          <details open><summary>Leaderboard / Standings</summary><div class="appearance-studio-panel appearance-leaderboard-editor-panel">
            <div class="admin-sub">One reusable standings style for the full Leaderboard page, Wager standings, compact Reality standings, and the small league scoreboard on Home. Public rows use game-specific Display Names; usernames remain internal for scoring and career history.</div>
            ${adminAppearanceStudioSelect_("appearanceThemeLeaderboardLayout", "Leaderboard Layout", theme.leaderboard.layout, [["cards","Cards"],["compact","Compact Rows"],["table","Table-Like Rows"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeLeaderboardDensity", "Density", theme.leaderboard.density, [["compact","Compact"],["standard","Standard"],["comfortable","Comfortable"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeLeaderboardCardMode", "Row Background", theme.leaderboard.cardMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardCardBg", "Solid Background", theme.leaderboard.cardBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardGradientStart", "Gradient Start", theme.leaderboard.gradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardGradientEnd", "Gradient End", theme.leaderboard.gradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardGradientAngle", "Gradient Angle", theme.leaderboard.gradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardCardOpacity", "Row Background Opacity", theme.leaderboard.cardOpacity, 20, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardText", "Main Text", theme.leaderboard.text)}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardMuted", "Secondary Text", theme.leaderboard.muted)}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardBorder", "Border", theme.leaderboard.border)}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardBorderOpacity", "Border Opacity", theme.leaderboard.borderOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardRadius", "Row Corners", theme.leaderboard.radius, 0, 32, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardGap", "Row Spacing", theme.leaderboard.rowGap, 0, 28, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeLeaderboardRankStyle", "Rank Style", theme.leaderboard.rankStyle, [["circle","Circle"],["pill","Pill"],["plain","Plain Number"]])}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardRankBg", "Rank Background", theme.leaderboard.rankBackground)}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardRankOpacity", "Rank Background Opacity", theme.leaderboard.rankOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardRankText", "Rank Text", theme.leaderboard.rankText)}
            <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowAvatar" type="checkbox" ${theme.leaderboard.showAvatar ? 'checked' : ''}><span>Show player photo/avatar</span></label>
            ${adminAppearanceStudioSelect_("appearanceThemeLeaderboardAvatarShape", "Player Photo Shape", theme.leaderboard.avatarShape, [["round","Round"],["soft","Soft Square"],["square","Square"]])}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardAvatarSize", "Player Photo Size", theme.leaderboard.avatarSize, 24, 72, 1, "px")}
            <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardCareer" type="checkbox" ${theme.leaderboard.showCareerLink ? 'checked' : ''}><span>Show Career Stats link</span></label>
            <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardCompare" type="checkbox" ${theme.leaderboard.showCompare ? 'checked' : ''}><span>Show Compare / Pick + Wager button</span></label>
            <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardTopThree" type="checkbox" ${theme.leaderboard.highlightTopThree ? 'checked' : ''}><span>Highlight Top 3</span></label>
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardGold", "1st Place", theme.leaderboard.gold)}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardSilver", "2nd Place", theme.leaderboard.silver)}
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardBronze", "3rd Place", theme.leaderboard.bronze)}
            <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardCurrent" type="checkbox" ${theme.leaderboard.highlightCurrent ? 'checked' : ''}><span>Highlight the current player</span></label>
            ${adminAppearanceStudioColor_("appearanceThemeLeaderboardCurrentColor", "Current Player Highlight", theme.leaderboard.currentColor)}
            ${adminAppearanceStudioRange_("appearanceThemeLeaderboardCurrentOpacity", "Current Player Highlight Opacity", theme.leaderboard.currentOpacity, 0, 100, 1, "%")}
            <div class="appearance-leaderboard-stat-options">
              <strong>Stats to Show</strong>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowScore" type="checkbox" ${theme.leaderboard.showScore ? 'checked' : ''}><span>Score / Bankroll</span></label>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowRemaining" type="checkbox" ${theme.leaderboard.showRemaining ? 'checked' : ''}><span>Remaining / Max</span></label>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowWinChance" type="checkbox" ${theme.leaderboard.showWinChance ? 'checked' : ''}><span>Win Chance</span></label>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowStatues" type="checkbox" ${theme.leaderboard.showStatues ? 'checked' : ''}><span>Statues / Awards</span></label>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowWager" type="checkbox" ${theme.leaderboard.showWagerStats ? 'checked' : ''}><span>Wager Stats</span></label>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowMini" type="checkbox" ${theme.leaderboard.showMiniGames ? 'checked' : ''}><span>Mini Games Counted</span></label>
              <label class="appearance-studio-check"><input id="appearanceThemeLeaderboardShowSeason" type="checkbox" ${theme.leaderboard.showSeasonPick ? 'checked' : ''}><span>Season / Survivor Pick Stats</span></label>
            </div>
            <div class="appearance-leaderboard-mini-panel-controls">
              <strong>Home / Hub Mini Scoreboard</strong>
              ${adminAppearanceStudioSelect_("appearanceThemeLeaderboardMiniMode", "Mini Scoreboard Background", theme.leaderboard.miniPanelMode, [["solid","Solid"],["gradient","Gradient"]])}
              ${adminAppearanceStudioColor_("appearanceThemeLeaderboardMiniBg", "Solid Background", theme.leaderboard.miniPanelBackground)}
              ${adminAppearanceStudioColor_("appearanceThemeLeaderboardMiniStart", "Gradient Start", theme.leaderboard.miniPanelGradientStart)}
              ${adminAppearanceStudioColor_("appearanceThemeLeaderboardMiniEnd", "Gradient End", theme.leaderboard.miniPanelGradientEnd)}
              ${adminAppearanceStudioRange_("appearanceThemeLeaderboardMiniAngle", "Gradient Angle", theme.leaderboard.miniPanelAngle, 0, 360, 1, "°")}
            </div>
            <div id="appearanceLeaderboardPreview" class="appearance-leaderboard-preview">
              <div class="leaderboard-list">
                <div class="leaderboard-card lb-top-1 lb-current-user"><div class="leaderboard-rank">#1</div><div class="leaderboard-main"><div class="leaderboard-top-row"><div class="leaderboard-user"><span class="leaderboard-avatar">JM</span><div class="leaderboard-user-text"><h2 class="leaderboard-name">Sunday Hero</h2><span class="leaderboard-career-link">Career stats</span></div></div><button class="leaderboard-compare-btn" type="button">Compare</button></div><div class="leaderboard-stats-grid"><p class="leaderboard-stat leaderboard-stat-score">Score: <strong>94</strong></p><p class="leaderboard-stat leaderboard-stat-remaining">Remaining: 12 / 106</p><p class="leaderboard-stat leaderboard-stat-statues">Statues: 3</p><p class="leaderboard-stat leaderboard-stat-winchance">Win Chance: 62%</p></div></div></div>
                <div class="leaderboard-card lb-top-2"><div class="leaderboard-rank">#2</div><div class="leaderboard-main"><div class="leaderboard-top-row"><div class="leaderboard-user"><span class="leaderboard-avatar">🏈</span><div class="leaderboard-user-text"><h2 class="leaderboard-name">Da Bears Guy</h2><span class="leaderboard-career-link">Career stats</span></div></div></div><div class="leaderboard-stats-grid"><p class="leaderboard-stat leaderboard-stat-score">Score: <strong>88</strong></p><p class="leaderboard-stat leaderboard-stat-remaining">Remaining: 8 / 96</p></div></div></div>
              </div>
            </div>
          </div></details>

          <details><summary>Winner Overlay / Decoration</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeWinnerOverlayType", "Winning Pick Overlay", theme.winner.overlayType, [["none","None"],["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeWinnerColor", "Winner Overlay Color", theme.winner.color)}
            ${adminAppearanceStudioColor_("appearanceThemeWinnerColor2", "Winner Gradient Color 2", theme.winner.color2)}
            ${adminAppearanceStudioRange_("appearanceThemeWinnerOpacity", "Winner Overlay Opacity", theme.winner.opacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeWinnerAngle", "Winner Gradient Angle", theme.winner.angle, 0, 360, 1, "°")}
            ${adminAppearanceStudioSelect_("appearanceThemeWinnerPlacement", "Overlay Placement", theme.winner.placement, [["full","Full Pick"],["top","Top Band"],["bottom","Bottom Band"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeWinnerDecoration", "Winner Element", theme.winner.decoration, [["none","None"],["trophy","Trophy"],["crown","Crown"],["medal","Medal"],["star","Star"],["check","Check"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeWinnerDecorationPosition", "Element Position", theme.winner.decorationPosition, [["top-left","Top Left"],["top-right","Top Right"],["bottom-left","Bottom Left"],["bottom-right","Bottom Right"],["center","Center"]])}
            ${adminAppearanceStudioRange_("appearanceThemeWinnerDecorationSize", "Element Size", theme.winner.decorationSize, 12, 64, 1, "px")}
            ${adminAppearanceStudioColor_("appearanceThemeWinnerDecorationColor", "Element Color", theme.winner.decorationColor)}
            <div class="admin-sub">Used for a correctly selected winner in Matchup and normal question layouts.</div>
          </div></details>

          <details open><summary>Page / Header / Bars</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemePageBgMode", "Page Background Type", theme.page.backgroundMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemePageBg", "Page Background", theme.page.background)}
            ${adminAppearanceStudioColor_("appearanceThemePageGradientStart", "Page Gradient Start", theme.page.gradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemePageGradientEnd", "Page Gradient End", theme.page.gradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemePageGradientAngle", "Page Gradient Angle", theme.page.gradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioSelect_("appearanceThemeHeaderBgMode", "Header Background Type", theme.page.headerMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeHeaderBg", "Header Background", theme.page.headerBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeHeaderGradientStart", "Header Gradient Start", theme.page.headerGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeHeaderGradientEnd", "Header Gradient End", theme.page.headerGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeHeaderGradientAngle", "Header Gradient Angle", theme.page.headerGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeHeaderOpacity", "Header Background Opacity", theme.page.headerOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeHeaderText", "Header Title", theme.page.headerText)}
            ${adminAppearanceStudioColor_("appearanceThemeHeaderMuted", "Header Secondary Text", theme.page.headerMuted)}
            ${adminAppearanceStudioRange_("appearanceThemeHeaderRadius", "Header Corners", theme.page.headerRadius, 0, 32, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeSectionGap", "Section Spacing", theme.page.sectionGap, 4, 36, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeSortBgMode", "Sort / Toolbar Background Type", theme.bars.sortMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeSortBg", "Sort / Toolbar Background", theme.bars.sortBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeSortGradientStart", "Sort Gradient Start", theme.bars.sortGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeSortGradientEnd", "Sort Gradient End", theme.bars.sortGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeSortGradientAngle", "Sort Gradient Angle", theme.bars.sortGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioColor_("appearanceThemeSortText", "Sort / Toolbar Text", theme.bars.sortText)}
            ${adminAppearanceStudioSelect_("appearanceThemeSaveBgMode", "Save Button Background Type", theme.bars.saveMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeSaveBg", "Save Button Background", theme.bars.saveBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeSaveGradientStart", "Save Gradient Start", theme.bars.saveGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeSaveGradientEnd", "Save Gradient End", theme.bars.saveGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeSaveGradientAngle", "Save Gradient Angle", theme.bars.saveGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioColor_("appearanceThemeSaveText", "Save Button Text", theme.bars.saveText)}
            ${adminAppearanceStudioRange_("appearanceThemeBarRadius", "Toolbar Button Corners", theme.bars.buttonRadius, 0, 24, 1, "px")}
          </div></details>

          <details open><summary>Question Area Designer</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeQuestionDefault", "Game Default Question Layout", theme.questions.defaultLayout, ADMIN_APPEARANCE_QUESTION_LAYOUTS)}
            ${adminAppearanceStudioSelect_("appearanceThemeQuestionCardMode", "Question Card Background Type", theme.questions.cardMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionCardBg", "Question Card Background", theme.questions.cardBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionCardGradientStart", "Question Card Gradient Start", theme.questions.cardGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionCardGradientEnd", "Question Card Gradient End", theme.questions.cardGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionCardGradientAngle", "Question Card Gradient Angle", theme.questions.cardGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionCardOpacity", "Question Card Opacity", theme.questions.cardOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioSelect_("appearanceThemeQuestionHeaderMode", "Question Header Background Type", theme.questions.headerMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionHeaderBg", "Question Header Background", theme.questions.headerBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionHeaderGradientStart", "Question Header Gradient Start", theme.questions.headerGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionHeaderGradientEnd", "Question Header Gradient End", theme.questions.headerGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionHeaderGradientAngle", "Question Header Gradient Angle", theme.questions.headerGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionHeaderOpacity", "Question Header Opacity", theme.questions.headerOpacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeQuestionTitle", "Question Title", theme.questions.titleColor)}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionTitleSize", "Question Title Size", theme.questions.titleSize, 10, 28, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeAnswerMode", "Answer Background Type", theme.questions.answerMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerBg", "Answer Background", theme.questions.answerBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerGradientStart", "Answer Gradient Start", theme.questions.answerGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerGradientEnd", "Answer Gradient End", theme.questions.answerGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeAnswerGradientAngle", "Answer Gradient Angle", theme.questions.answerGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerText", "Answer Text", theme.questions.answerText)}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerBorder", "Answer Border", theme.questions.answerBorder)}
            ${adminAppearanceStudioSelect_("appearanceThemeAnswerSelectedMode", "Selected Answer Background Type", theme.questions.selectedMode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerSelectedBg", "Selected Answer Background", theme.questions.selectedBackground)}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerSelectedGradientStart", "Selected Gradient Start", theme.questions.selectedGradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerSelectedGradientEnd", "Selected Gradient End", theme.questions.selectedGradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeAnswerSelectedGradientAngle", "Selected Gradient Angle", theme.questions.selectedGradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerSelectedText", "Selected Answer Text", theme.questions.selectedText)}
            ${adminAppearanceStudioColor_("appearanceThemeAnswerSelectedBorder", "Selected Answer Border", theme.questions.selectedBorder)}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionRadius", "Question / Answer Corners", theme.questions.radius, 0, 32, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeQuestionGap", "Answer Gap", theme.questions.gap, 2, 28, 1, "px")}
          </div></details>

          <details><summary>Question Layout Types</summary><div class="appearance-studio-panel">
            <h4>Text</h4>${adminAppearanceStudioRange_("appearanceThemeTextColumns", "Columns", theme.questions.textColumns, 1, 4, 1, "")}
            <h4>Compact</h4>${adminAppearanceStudioRange_("appearanceThemeCompactColumns", "Columns", theme.questions.compactColumns, 1, 4, 1, "")}${adminAppearanceStudioRange_("appearanceThemeCompactImage", "Image / Logo Size", theme.questions.compactImageSize, 0, 90, 1, "px")}
            <h4>Image</h4>${adminAppearanceStudioRange_("appearanceThemeImageColumns", "Columns", theme.questions.imageColumns, 1, 6, 1, "")}${adminAppearanceStudioSelect_("appearanceThemeImageAspect", "Image Ratio", theme.questions.imageAspect, [["2/3","Portrait 2:3"],["1/1","Square"],["16/9","Landscape 16:9"],["4/3","Landscape 4:3"]])}${adminAppearanceStudioSelect_("appearanceThemeQuestionImageFit", "Image Fit", theme.questions.imageFit, [["cover","Cover"],["contain","Contain"]])}${adminAppearanceStudioRange_("appearanceThemeQuestionImageZoom", "Image Zoom", theme.questions.imageZoom, 50, 220, 1, "%")}${adminAppearanceStudioRange_("appearanceThemeQuestionImageX", "Image X Position", theme.questions.imageX, 0, 100, 1, "%")}${adminAppearanceStudioRange_("appearanceThemeQuestionImageY", "Image Y Position", theme.questions.imageY, 0, 100, 1, "%")}${adminAppearanceStudioRange_("appearanceThemeQuestionImageOpacity", "Image Opacity", theme.questions.imageOpacity, 0, 100, 1, "%")}<label class="appearance-studio-check"><input id="appearanceThemeImageTextOverlay" type="checkbox" ${theme.questions.imageTextOverlay ? 'checked' : ''}><span>Put answer text over image</span></label>${adminAppearanceStudioSelect_("appearanceThemeQuestionImageOverlayMode", "Text Overlay Type", theme.questions.imageOverlayMode, [["solid","Solid"],["gradient","Gradient"]])}${adminAppearanceStudioColor_("appearanceThemeQuestionImageOverlayColor", "Text Overlay Color 1", theme.questions.imageOverlayColor)}${adminAppearanceStudioRange_("appearanceThemeQuestionImageOverlay", "Color 1 Opacity", theme.questions.imageOverlayOpacity, 0, 100, 1, "%")}${adminAppearanceStudioColor_("appearanceThemeQuestionImageOverlayColor2", "Text Overlay Color 2", theme.questions.imageOverlayColor2)}${adminAppearanceStudioRange_("appearanceThemeQuestionImageOverlay2", "Color 2 Opacity", theme.questions.imageOverlayOpacity2, 0, 100, 1, "%")}${adminAppearanceStudioSelect_("appearanceThemeQuestionImageOverlayPlacement", "Text Overlay Placement", theme.questions.imageOverlayPlacement, [["bottom","Bottom"],["top","Top"],["full","Full Image"]])}${adminAppearanceStudioRange_("appearanceThemeQuestionImageOverlayAngle", "Text Overlay Angle", theme.questions.imageOverlayAngle, 0, 360, 1, "°")}
            <h4>Wager / Market</h4>${adminAppearanceStudioRange_("appearanceThemeWagerColumns", "Columns", theme.questions.wagerColumns, 1, 3, 1, "")}
            <div class="admin-sub">List and Short Answer reuse the shared answer styling. Changing layout here changes presentation only — scoring/play type stays untouched.</div>
          </div></details>

          <details><summary>Section / Question Layout Overrides</summary><div class="appearance-studio-panel">
            <div class="admin-sub">Game Default → Section Override → Individual Question Override. Use “Question / Game Setting” to fall back without deleting the original question layout.</div>
            ${adminAppearanceQuestionOverridesHtml_(theme)}
          </div></details>

          <details><summary>Expandable Details</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioColor_("appearanceThemeDetailsBg", "Details Background", theme.details.background)}
            ${adminAppearanceStudioRange_("appearanceThemeDetailsOpacity", "Details Opacity", theme.details.opacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeDetailsText", "Details Text", theme.details.text)}
            ${adminAppearanceStudioColor_("appearanceThemeDetailsBorder", "Details Border", theme.details.border)}
            ${adminAppearanceStudioRange_("appearanceThemeDetailsRadius", "Details Corners", theme.details.radius, 0, 24, 1, "px")}
          </div></details>
        </aside>

        <main class="appearance-studio-canvas">
          ${adminAppearanceThemePreview_(theme)}
        </main>

      </div>
      <div class="appearance-studio-actions appearance-studio-actions-bar">
        <strong>Theme Actions</strong>
        <button type="button" id="appearanceThemeSaveButton" class="button" onclick="adminAppearanceSaveTheme_()">${ADMIN_APPEARANCE_STATE.themeActionState === "saved" ? "Saved Changes ✓" : ADMIN_APPEARANCE_STATE.themeActionState === "saving" ? "Saving…" : "Save Changes"}</button>
        <button type="button" id="appearanceThemeApplyButton" class="button secondary" onclick="adminAppearanceApplyThemeToGame_()">${ADMIN_APPEARANCE_STATE.themeActionState === "applied" ? "Applied to Game ✓" : ADMIN_APPEARANCE_STATE.themeActionState === "applying" ? "Applying…" : "Apply Theme to Game"}</button>
        <button type="button" class="button secondary" onclick="adminAppearanceResetTheme_()">Reset Unsaved Changes</button>
        <small><b>Save Changes</b> edits the selected Theme Pack. <b>Apply Theme to Game</b> only assigns that saved theme to the selected game. Theme changes affect appearance only. Picks, scoring, schedules and Image Packs are untouched.</small>
      </div>
    </div>`;
}

function adminAppearanceThemePreview_(theme) {
  theme = adminAppearanceStudioDefaults_(theme);
  const entities = adminAppearancePreviewEntities_();
  const imageHtml = function(entity) {
    return entity && entity.imageUrl
      ? '<img class="confidence-team-logo" src="' + adminAppearanceEscape_(entity.imageUrl) + '" alt="">'
      : '<span class="appearance-preview-placeholder confidence-team-logo">★</span>';
  };
  function teamHtml(entity, selected, side) {
    return `<button type="button" class="confidence-team-choice confidence-team-${side} ${selected ? 'selected' : 'not-selected'}" aria-pressed="${selected ? 'true' : 'false'}">
      <span class="confidence-team-visual confidence-element-team-image" data-ap-element="teamImage">${imageHtml(entity)}</span>
      <span class="confidence-team-text">
        <span class="confidence-team-city confidence-element-city" data-ap-element="city">${adminAppearanceEscape_(entity.city)}</span>
        <strong class="confidence-team-nickname confidence-element-team-name" data-ap-element="teamName">${adminAppearanceEscape_(entity.nickname)}</strong>
      </span>
      <strong class="confidence-team-score confidence-element-score appearance-preview-score" data-ap-element="score">21</strong>
      ${selected ? '<span class="confidence-selected-mark confidence-element-result-indicator appearance-preview-result-indicator" data-ap-element="resultIndicator">✓</span><span class="confidence-winner-decoration" aria-hidden="true"></span>' : ''}
    </button>`;
  }
  function questionCard(layout, title, answers) {
    const layoutClass = layout === 'compact' || layout === 'list'
      ? 'nominee-layout nominee-layout-list nominee-layout-' + layout
      : layout === 'wager'
        ? 'nominee-layout nominee-layout-wager'
        : layout === 'image'
          ? 'nominee-layout nominee-layout-image'
          : 'nominee-layout nominee-layout-text';
    return `<section class="pick-category-card question-layout-${layout} appearance-question-runtime-preview" data-question-preview="${layout}">
      <button type="button" class="pick-card-header"><div class="pick-header-main"><div class="pick-header-topline"><div class="pick-title-wrap"><h2>${adminAppearanceEscape_(title)}</h2></div><div class="points-pill">10 pts</div></div></div></button>
      <div class="pick-card-body"><div class="${layoutClass}">${answers}</div></div>
    </section>`;
  }
  const textAnswers = '<button type="button" class="nominee-choice text-choice">Film Alpha</button><button type="button" class="nominee-choice text-choice selected">Film Bravo</button><button type="button" class="nominee-choice text-choice">Film Charlie</button><button type="button" class="nominee-choice text-choice">Film Delta</button>';
  const compactAnswers = '<button type="button" class="nominee-choice list-choice"><span class="appearance-question-thumb">KC</span><span>Kansas City Chiefs</span></button><button type="button" class="nominee-choice list-choice selected"><span class="appearance-question-thumb">BUF</span><span>Buffalo Bills</span></button>';
  const listAnswers = '<button type="button" class="nominee-choice list-choice"><span class="appearance-question-thumb">A</span><span>Nominee Alpha</span></button><button type="button" class="nominee-choice list-choice selected"><span class="appearance-question-thumb">B</span><span>Nominee Bravo</span></button><button type="button" class="nominee-choice list-choice"><span class="appearance-question-thumb">C</span><span>Nominee Charlie</span></button>';
  const shortAnswers = '<button type="button" class="nominee-choice text-choice short-answer-choice">Over</button><button type="button" class="nominee-choice text-choice short-answer-choice selected">Under</button>';
  const img = entities[0] && entities[0].imageUrl ? adminAppearanceEscape_(entities[0].imageUrl) : '';
  const imageCell = function(letter, name, selected) {
    const art = img ? '<img class="nominee-card-image" src="'+img+'" alt="">' : '<span class="appearance-question-image-placeholder">'+letter+'</span>';
    return '<button type="button" class="nominee-choice image-choice '+(selected?'selected':'')+'">'+art+'<span>'+name+'</span></button>';
  };
  const imageAnswers = imageCell('A','Nominee Alpha',false)+imageCell('B','Nominee Bravo',true)+imageCell('C','Nominee Charlie',false);
  const wagerAnswers = '<button type="button" class="nominee-choice wager-choice"><span>Chicago</span><b>-145</b></button><button type="button" class="nominee-choice wager-choice selected"><span>Detroit</span><b>+125</b></button>';

  return `<div class="appearance-studio-preview-wrap">
    <div class="appearance-studio-preview-toolbar">
      <div class="appearance-studio-preview-surface-tabs">
        <button type="button" data-preview-surface="matchup" onclick="adminAppearanceSetPreviewSurface_('matchup')">Matchup</button>
        <button type="button" data-preview-surface="text" onclick="adminAppearanceSetPreviewSurface_('text')">Text</button>
        <button type="button" data-preview-surface="compact" onclick="adminAppearanceSetPreviewSurface_('compact')">Compact</button>
        <button type="button" data-preview-surface="image" onclick="adminAppearanceSetPreviewSurface_('image')">Image</button>
        <button type="button" data-preview-surface="list" onclick="adminAppearanceSetPreviewSurface_('list')">List</button>
        <button type="button" data-preview-surface="short-answer" onclick="adminAppearanceSetPreviewSurface_('short-answer')">Short</button>
        <button type="button" data-preview-surface="wager" onclick="adminAppearanceSetPreviewSurface_('wager')">Wager</button>
      </div>
      <div class="appearance-studio-preview-tabs">
        <button type="button" data-preview-state="pregame" onclick="adminAppearanceSetPreviewState_('pregame')">Pregame</button>
        <button type="button" data-preview-state="live" onclick="adminAppearanceSetPreviewState_('live')">Live</button>
        <button type="button" data-preview-state="final-win" onclick="adminAppearanceSetPreviewState_('final-win')">Final Win</button>
        <button type="button" data-preview-state="final-loss" onclick="adminAppearanceSetPreviewState_('final-loss')">Final Loss</button>
      </div>
      <div class="appearance-studio-device-tools">
        <div class="appearance-studio-device-tabs" aria-label="Preview size">
          <button type="button" data-preview-device="desktop" onclick="adminAppearanceSetPreviewDevice_('desktop')">Desktop</button>
          <button type="button" data-preview-device="tablet" onclick="adminAppearanceSetPreviewDevice_('tablet')">Tablet</button>
          <button type="button" data-preview-device="mobile" onclick="adminAppearanceSetPreviewDevice_('mobile')">Mobile</button>
        </div>
        <button type="button" id="appearanceStudioFullPreviewButton" class="appearance-studio-full-preview" onclick="adminAppearanceToggleFullPreview_()">Full Preview</button>
      </div>
    </div>
    <div class="appearance-preview-stage">
      <div id="appearanceThemePreviewFrame" class="appearance-preview-device-frame preview-device-desktop">
        <div id="appearanceThemePreview" class="appearance-theme-preview appearance-studio-preview-state-pregame" data-preview-surface="matchup">
          <div id="appearancePagePreviewShell" class="picks-page picks-appearance-active appearance-preview-page-shell">
            <header class="picks-page-header appearance-preview-page-header"><h1>Weekly Picks</h1><p>Make your picks, review the card, then save.</p></header>
            <div class="confidence-compact-toolbar appearance-preview-sortbar"><strong>Week 3</strong><div class="confidence-toolbar-sort"><span>Sort</span><button type="button">Game Time</button><button type="button">Confidence</button></div></div>
            <div id="appearanceRuntimeMatchupPreview" class="confidence-compact-slate appearance-runtime-matchup-preview" data-question-preview="matchup">
              <article id="appearanceRuntimeGameRow" class="confidence-game-row phase-pregame pending">
                <div class="confidence-game-main">
                  ${teamHtml(entities[0], true, 'away')}
                  <div class="confidence-versus confidence-element-versus" data-ap-element="versus">VS</div>
                  ${teamHtml(entities[1], false, 'home')}
                  <label class="confidence-row-value"><span class="confidence-value-label" data-ap-element="confidenceLabel">Confidence</span><select class="confidence-value-input" data-ap-element="confidenceValue"><option>16</option></select><strong class="confidence-result-points correct" data-ap-element="points">+16</strong></label>
                </div>
                <details class="confidence-game-details" open data-ap-element="detailsBar"><summary class="confidence-game-meta"><strong class="confidence-live-status"><span class="appearance-preview-game-time" data-ap-element="gameTime">SUN 12:00 PM</span><span class="appearance-preview-live-badge" data-ap-element="liveBadge"> LIVE</span><span class="appearance-preview-clock" data-ap-element="clock"> Q3 6:42</span><span class="appearance-preview-final-badge" data-ap-element="finalBadge"> FINAL</span></strong><span>Odds · Records · Favorite</span></summary><div class="confidence-details-grid"><div>CHI <strong data-ap-element="records">6-2</strong></div><div><strong data-ap-element="moneyline">-145</strong><br><span data-ap-element="favorite">Favorite</span></div><div>DET <strong>5-3</strong></div></div></details>
              </article>
            </div>
            ${questionCard('text','Who wins Best Picture?',textAnswers)}
            ${questionCard('compact','Who wins this matchup?',compactAnswers)}
            ${questionCard('image','Choose the winner',imageAnswers)}
            ${questionCard('list','Ranked nominees',listAnswers)}
            ${questionCard('short-answer','Will the total go over?',shortAnswers)}
            ${questionCard('wager','Moneyline',wagerAnswers)}
            <div class="appearance-preview-savebar"><button type="button" class="confidence-save-all-button">Save Picks</button></div>
          </div>
        </div>
      </div>
    </div>
    <div class="appearance-studio-preview-note"><span id="appearancePreviewSizeLabel">Desktop · 1180px</span> · Preview and live Picks page now use the same theme serializer and runtime CSS.</div>
  </div>`;
}

function adminAppearanceImagePackManager_(currentPack, scope) {
  const row = adminAppearancePackById_(currentPack);
  const isDefault = !row || adminAppearanceKey_(currentPack) === "sports-default";
  const packName = row ? String(row.PackName || row.PackId || "") : "Sports Default Logos";
  const packId = row ? String(row.PackId || "") : "";
  const scopeType = row ? String(row.ScopeType || scope.scopeType || "all") : String(scope.scopeType || "all");
  const scopeValue = row ? String(row.ScopeValue || scope.scopeValue || "") : String(scope.scopeValue || "");
  const description = row ? String(row.Description || "") : "";
  const actionLabel = ADMIN_APPEARANCE_STATE.packActionState === "saved" ? "Saved Changes ✓" : ADMIN_APPEARANCE_STATE.packActionState === "saving" ? "Saving…" : "Save Changes";
  return `
    <div class="appearance-editor-manager appearance-pack-manager">
      <div class="appearance-editor-manager-main">
        <label>Image Pack to Edit<select class="input" onchange="adminAppearanceSelectImagePack_(this.value)">${adminAppearanceImagePackOptions_(currentPack)}</select></label>
        <label>Pack Name<input id="appearancePackName" class="input" value="${adminAppearanceEscape_(packName)}" ${isDefault ? 'readonly' : ''}></label>
      </div>
      <div class="appearance-editor-mode-note">${isDefault
        ? 'Using the built-in <strong>Sports Default Logos</strong>. Duplicate it to make an editable custom pack; the original default is never changed.'
        : 'Editing existing Image Pack <strong>' + adminAppearanceEscape_(packName) + '</strong>. <b>Save Changes</b> updates this pack only; changing its name keeps the same internal ID.'}</div>
      <div class="appearance-editor-manager-actions">
        ${isDefault ? '' : '<button id="appearancePackSaveButton" class="button" type="button" onclick="adminAppearanceSavePackMetadata_()">' + actionLabel + '</button>'}
        <button class="button secondary" type="button" onclick="adminAppearanceDuplicatePack_()">Duplicate Pack</button>
        <button class="button secondary" type="button" onclick="adminAppearanceCreateBlankPack_()">Create New Pack</button>
        <small class="appearance-manager-example">Example: NFL Helmets 2026</small>
      </div>
      <details class="appearance-technical-details">
        <summary>Advanced / Technical Details</summary>
        <div class="appearance-technical-grid">
          <label>Pack ID<input id="appearancePackId" class="input" value="${adminAppearanceEscape_(packId)}" placeholder="Generated automatically" readonly></label>
          <label>Scope Type<input id="appearancePackScopeType" class="input" value="${adminAppearanceEscape_(scopeType)}" ${isDefault ? 'readonly' : ''}></label>
          <label>League / Scope<input id="appearancePackScopeValue" class="input" value="${adminAppearanceEscape_(scopeValue)}" ${isDefault ? 'readonly' : ''}></label>
          <label>Description<input id="appearancePackDescription" class="input" value="${adminAppearanceEscape_(description)}" ${isDefault ? 'readonly' : ''} placeholder="Optional description"></label>
        </div>
        <div class="admin-sub">The Pack ID is permanent. Renaming a pack changes its display name only. Duplicate/Create New generates a separate ID.</div>
      </details>
    </div>`;
}

function adminAppearanceBuildHtml_() {
  const dashboard = ADMIN_APPEARANCE_STATE.dashboard || {};
  const assignment = adminAppearanceAssignment_();
  const entities = adminAppearanceUniqueEntities_();
  ADMIN_APPEARANCE_STATE.entities = entities;
  const currentPack = ADMIN_APPEARANCE_STATE.selectedImagePackId || adminAppearanceDefaultImagePack_();
  const currentTheme = adminAppearanceDefaultTheme_();
  const scope = adminAppearanceInferScope_();

  return `
    <div class="page admin-page appearance-manager-page">
      <div class="appearance-page-heading">
        <div><h1>Appearance Manager</h1><div class="admin-sub">Image Packs + Appearance Studio visual templates for Sports, Awards, Reality TV, Prediction, Hybrid, and future games.</div></div>
        <button class="button secondary" onclick="navigate('admin')">← Back to Admin</button>
      </div>

      ${ADMIN_APPEARANCE_STATE.message ? '<div class="admin-message appearance-message">' + adminAppearanceEscape_(ADMIN_APPEARANCE_STATE.message) + '</div>' : ''}

      ${adminAppearanceHubManager_()}

      <section class="card appearance-assignment-card">
        <h2>Game Appearance</h2>
        <div class="appearance-assignment-grid">
          <label>Game<select id="appearanceGameSelect" class="input" onchange="adminAppearanceSelectGame_(this.value)">${adminAppearanceGameOptions_()}</select></label>
          <label>Image Pack<select id="appearanceGameImagePack" class="input">${adminAppearanceImagePackOptions_(ADMIN_APPEARANCE_STATE.pendingGameImagePackId || assignment.ImagePackId || currentPack)}</select></label>
          <label>Theme Pack<select id="appearanceGameThemePack" class="input">${adminAppearanceThemeOptions_(assignment.ThemePackId || currentTheme, false)}</select></label>
        </div>
        <div class="admin-actions"><button class="button" onclick="adminAppearanceSaveGameAssignment_()">Apply Selected Packs to Game</button></div>
        <div class="admin-sub">This section assigns packs to the selected game; it does not edit the Theme Pack or Image Pack itself. Image priority: Game override → Image Pack → existing game image.</div>
        ${ADMIN_APPEARANCE_STATE.pendingGameImagePackId ? '<div class="appearance-pack-pending-note">New Image Pack is selected here but <b>has not been applied to the game yet</b>. Click <b>Apply Selected Packs to Game</b> when you are ready.</div>' : ''}
      </section>

      <details class="card admin-collapsible-card appearance-pack-card" open>
        <summary><strong>Image Packs</strong><span>Reusable image sets + individual game overrides</span></summary>
        <div class="appearance-card-body">
          ${adminAppearanceImagePackManager_(currentPack, scope)}
          <div class="admin-sub">${entities.length} unique ${entities.length === 1 ? 'entity' : 'entities'} found in this game. Open <b>Advanced / Technical</b> only when you need IDs or source details.</div>
          <div class="appearance-entity-list">
            ${entities.length ? entities.map(adminAppearanceEntityCard_).join('') : '<div class="admin-sub">No nominees/teams were found in this game.</div>'}
          </div>
        </div>
      </details>

      <details class="card admin-collapsible-card appearance-theme-card" open>
        <summary><strong>Appearance Studio / Theme Packs</strong><span>Visual template controls with live Confidence preview</span></summary>
        <div class="appearance-card-body">${adminAppearanceThemeEditor_()}</div>
      </details>
    </div>`;
}

async function adminAppearanceRefresh_(message) {
  const id = ADMIN_APPEARANCE_STATE.selectedGameId;
  const imagePackId = ADMIN_APPEARANCE_STATE.selectedImagePackId;
  const themePackId = ADMIN_APPEARANCE_STATE.selectedThemePackId;
  const themeNewMode = ADMIN_APPEARANCE_STATE.themeNewMode;
  const selectedHubSettingKey = ADMIN_APPEARANCE_STATE.selectedHubSettingKey;
  await adminAppearanceLoadGame_(id);
  if (imagePackId !== undefined) ADMIN_APPEARANCE_STATE.selectedImagePackId = imagePackId;
  if (themePackId) ADMIN_APPEARANCE_STATE.selectedThemePackId = themePackId;
  ADMIN_APPEARANCE_STATE.themeNewMode = themeNewMode;
  ADMIN_APPEARANCE_STATE.selectedHubSettingKey = selectedHubSettingKey || ADMIN_APPEARANCE_STATE.selectedHubSettingKey || "sports";
  if (message) ADMIN_APPEARANCE_STATE.message = message;
  adminAppearancePaint_();
}

async function adminAppearanceSelectGame_(gameId) {
  try {
    ADMIN_APPEARANCE_STATE.message = "Loading game appearance…";
    adminAppearancePaint_();
    await adminAppearanceLoadGame_(gameId);
    ADMIN_APPEARANCE_STATE.message = "";
    adminAppearancePaint_();
  } catch (err) {
    ADMIN_APPEARANCE_STATE.message = err.message || String(err);
    adminAppearancePaint_();
  }
}

function adminAppearanceSelectImagePack_(packId) {
  const id = String(packId || "");
  ADMIN_APPEARANCE_STATE.selectedImagePackId = id;
  if (adminAppearanceKey_(id) !== adminAppearanceKey_(ADMIN_APPEARANCE_STATE.pendingGameImagePackId)) {
    ADMIN_APPEARANCE_STATE.pendingImagePackRow = null;
  }
  ADMIN_APPEARANCE_STATE.packActionState = "";
  ADMIN_APPEARANCE_STATE.message = "";
  adminAppearancePaint_();
}

function adminAppearanceSelectThemeEditor_(themeId) {
  ADMIN_APPEARANCE_STATE.selectedThemePackId = String(themeId || "");
  ADMIN_APPEARANCE_STATE.themeNewMode = false;
  ADMIN_APPEARANCE_STATE.message = "";
  adminAppearancePaint_();
}

async function adminAppearanceSaveGameAssignment_() {
  const imagePack = document.getElementById("appearanceGameImagePack");
  const themePack = document.getElementById("appearanceGameThemePack");
  const result = await apiAdminSaveGameAppearance({
    gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
    imagePackId: imagePack ? imagePack.value : "",
    themePackId: themePack ? themePack.value : "",
    imageMode: imagePack && imagePack.value ? "pack" : "default",
    themeMode: "pack",
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not apply game appearance.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.pendingGameImagePackId = "";
  ADMIN_APPEARANCE_STATE.pendingImagePackRow = null;
  await adminAppearanceRefresh_("Selected Theme Pack and Image Pack were applied to this game.");
}

async function adminAppearanceSavePackMetadata_() {
  const row = adminAppearancePackById_(ADMIN_APPEARANCE_STATE.selectedImagePackId);
  if (!row || adminAppearanceKey_(row.PackId) === "sports-default") {
    ADMIN_APPEARANCE_STATE.message = "Duplicate the default pack before editing it.";
    adminAppearancePaint_();
    return;
  }
  const name = String(document.getElementById("appearancePackName") && document.getElementById("appearancePackName").value || "").trim();
  const scopeType = String(document.getElementById("appearancePackScopeType") && document.getElementById("appearancePackScopeType").value || row.ScopeType || "all");
  const scopeValue = String(document.getElementById("appearancePackScopeValue") && document.getElementById("appearancePackScopeValue").value || row.ScopeValue || "");
  const description = String(document.getElementById("appearancePackDescription") && document.getElementById("appearancePackDescription").value || row.Description || "");
  if (!name) {
    ADMIN_APPEARANCE_STATE.message = "Enter an Image Pack name.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.packActionState = "saving";
  adminAppearancePaint_();
  const result = await apiAdminSaveAppearanceImagePack({
    packId: row.PackId,
    packName: name,
    scopeType: scopeType,
    scopeValue: scopeValue,
    description: description,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.packActionState = "";
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save Image Pack changes.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.selectedImagePackId = result.packId || row.PackId;
  ADMIN_APPEARANCE_STATE.packActionState = "saved";
  await adminAppearanceRefresh_("Image Pack saved. Existing pack ID was preserved.");
  ADMIN_APPEARANCE_STATE.packActionState = "saved";
  setTimeout(function() {
    ADMIN_APPEARANCE_STATE.packActionState = "";
    const button = document.getElementById("appearancePackSaveButton");
    if (button) button.textContent = "Save Changes";
  }, 1800);
}

function adminAppearanceAdoptNewPackLocally_(packId, packName, sourceId, copiedItems, savedPackRow) {
  const id = String(packId || "").trim();
  if (!id) return;
  const dashboard = ADMIN_APPEARANCE_STATE.dashboard || {};
  const packs = Array.isArray(dashboard.imagePacks) ? dashboard.imagePacks.slice() : [];
  const items = Array.isArray(dashboard.imagePackItems) ? dashboard.imagePackItems.slice() : [];
  const source = adminAppearancePackById_(sourceId) || {};
  const sourceKey = adminAppearanceKey_(sourceId);

  const nextPack = {
    ...source,
    ...(savedPackRow || {}),
    PackId: id,
    PackName: String((savedPackRow && savedPackRow.PackName) || packName || id),
    IsDefault: false,
    Active: true
  };
  dashboard.imagePacks = packs.filter(function(row) {
    return adminAppearanceKey_(row && row.PackId) !== adminAppearanceKey_(id);
  }).concat([nextPack]);

  if (sourceKey) {
    const cloned = items.filter(function(row) {
      return adminAppearanceKey_(row && row.PackId) === sourceKey;
    }).map(function(row) {
      return { ...row, PackId: id, Active: true };
    });
    dashboard.imagePackItems = items.filter(function(row) {
      return adminAppearanceKey_(row && row.PackId) !== adminAppearanceKey_(id);
    }).concat(cloned);
  }

  ADMIN_APPEARANCE_STATE.dashboard = dashboard;
  ADMIN_APPEARANCE_STATE.selectedImagePackId = id;
  ADMIN_APPEARANCE_STATE.pendingGameImagePackId = id;
  ADMIN_APPEARANCE_STATE.pendingImagePackRow = nextPack;
  ADMIN_APPEARANCE_STATE.packActionState = "";
  ADMIN_APPEARANCE_STATE.message = 'Created \"' + String(packName || id) + '\"' +
    (copiedItems != null ? " with " + Number(copiedItems || 0) + " copied image mappings." : ".") +
    " It is now open for editing; Original pack was not changed.";
  adminAppearancePaint_();
}

async function adminAppearanceSyncSelectedPack_(packId, fallbackMessage) {
  const id = String(packId || "").trim();
  if (!id) return false;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const dashboard = await apiAdminGetAppearanceDashboard(ADMIN_APPEARANCE_STATE.selectedGameId, true);
      if (dashboard && dashboard.success !== false) {
        const pack = (dashboard.imagePacks || []).find(function(row) {
          return adminAppearanceKey_(row && row.PackId) === adminAppearanceKey_(id);
        });
        if (pack) {
          ADMIN_APPEARANCE_STATE.dashboard = dashboard;
          ADMIN_APPEARANCE_STATE.selectedImagePackId = id;
          ADMIN_APPEARANCE_STATE.pendingGameImagePackId = id;
          ADMIN_APPEARANCE_STATE.pendingImagePackRow = pack;
          if (fallbackMessage) ADMIN_APPEARANCE_STATE.message = fallbackMessage;
          adminAppearancePaint_();
          return true;
        }
      }
    } catch (err) {
      // Retry below; keep the locally adopted pack visible in the meantime.
    }
    if (attempt < 3) await new Promise(function(resolve) { setTimeout(resolve, 250 * (attempt + 1)); });
  }

  ADMIN_APPEARANCE_STATE.message = (fallbackMessage ? fallbackMessage + " " : "") +
    "The pack is visible locally, but the server list has not confirmed it yet. Refresh Appearance Manager before adding images.";
  adminAppearancePaint_();
  return false;
}

async function adminAppearanceDuplicatePack_() {
  const sourceId = ADMIN_APPEARANCE_STATE.selectedImagePackId || "sports-default";
  const source = adminAppearancePackById_(sourceId);
  const sourceName = String(source && source.PackName || "Sports Default Logos").trim();
  const newName = window.prompt("Name for the duplicated Image Pack. The original will not be changed.", sourceName + " Copy");
  if (newName == null) return;
  const cleanName = String(newName || "").trim();
  if (!cleanName) {
    ADMIN_APPEARANCE_STATE.message = "Duplicate cancelled: enter a name for the new Image Pack.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.message = "Duplicating Image Pack…";
  adminAppearancePaint_();
  const result = await apiAdminDuplicateAppearanceImagePack({ sourcePackId: sourceId, newPackName: cleanName });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not duplicate Image Pack.";
    adminAppearancePaint_();
    return;
  }
  const newPackId = String(result.packId || "").trim();
  adminAppearanceAdoptNewPackLocally_(newPackId, cleanName, sourceId, result.copiedItems, result.pack || null);
  await adminAppearanceSyncSelectedPack_(newPackId,
    'Created \"' + cleanName + '\" with ' + Number(result.copiedItems || 0) + ' copied image mappings. It is selected and ready to edit.');
}

async function adminAppearanceCreateBlankPack_() {
  const inferred = adminAppearanceInferScope_();
  const newName = window.prompt("Name for the new blank Image Pack.", "New Image Pack");
  if (newName == null) return;
  const cleanName = String(newName || "").trim();
  if (!cleanName) return;
  const result = await apiAdminSaveAppearanceImagePack({
    packName: cleanName,
    scopeType: inferred.scopeType || "all",
    scopeValue: inferred.scopeValue || "",
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not create Image Pack.";
    adminAppearancePaint_();
    return;
  }
  const newPackId = String(result.packId || "").trim();
  adminAppearanceAdoptNewPackLocally_(newPackId, cleanName, "", null, result.pack || null);
  await adminAppearanceSyncSelectedPack_(newPackId,
    "Created new blank Image Pack \"" + cleanName + "\". It is selected and ready to edit.");
}

function adminAppearanceEntityAt_(index) {
  return (ADMIN_APPEARANCE_STATE.entities || [])[Number(index)] || null;
}

function adminAppearanceReadDataUrl_(fileOrBlob) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function() { resolve(String(reader.result || "")); };
    reader.onerror = function() { reject(reader.error || new Error("Could not read image.")); };
    reader.readAsDataURL(fileOrBlob);
  });
}

function adminAppearanceBase64FromDataUrl_(value) {
  const result = String(value || "");
  return result.indexOf(",") !== -1 ? result.split(",").pop() : result;
}

function adminAppearanceReadImageElement_(dataUrl) {
  return new Promise(function(resolve, reject) {
    const image = new Image();
    image.onload = function() { resolve(image); };
    image.onerror = function() { reject(new Error("Could not decode the selected image.")); };
    image.src = dataUrl;
  });
}

function adminAppearanceCanvasBlob_(canvas, mimeType, quality) {
  return new Promise(function(resolve) {
    if (!canvas || typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob(function(blob) { resolve(blob || null); }, mimeType, quality);
  });
}

async function adminAppearancePrepareUpload_(file) {
  const originalDataUrl = await adminAppearanceReadDataUrl_(file);
  const original = {
    base64: adminAppearanceBase64FromDataUrl_(originalDataUrl),
    fileName: file.name || "image",
    mimeType: file.type || "image/jpeg",
    optimized: false,
    originalBytes: Number(file.size || 0),
    uploadBytes: Number(file.size || 0)
  };

  const supportedUploadTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const needsFormatConversion = supportedUploadTypes.indexOf(String(file.type || "").toLowerCase()) === -1;

  // Small supported files already use the same proven upload path as Game
  // images. Large camera photos and iPhone HEIC/HEIF selections are converted
  // before base64 transport so the upload Worker receives a compact WebP.
  if (!file || (!needsFormatConversion && file.type === "image/gif") || (!needsFormatConversion && Number(file.size || 0) <= 900000)) {
    return original;
  }

  try {
    const image = await adminAppearanceReadImageElement_(originalDataUrl);
    const maxDimension = 1400;
    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);
    if (!width || !height) return original;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return original;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // WebP keeps transparency for logo art and substantially reduces large
    // phone/photo uploads. Apps Script's image upload engine already accepts it.
    const blob = await adminAppearanceCanvasBlob_(canvas, "image/webp", 0.88);
    if (!blob || !blob.size || blob.size >= Number(file.size || 0)) return original;

    const optimizedDataUrl = await adminAppearanceReadDataUrl_(blob);
    const baseName = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
    return {
      base64: adminAppearanceBase64FromDataUrl_(optimizedDataUrl),
      fileName: baseName + ".webp",
      mimeType: "image/webp",
      optimized: true,
      originalBytes: Number(file.size || 0),
      uploadBytes: Number(blob.size || 0)
    };
  } catch (err) {
    console.warn("Appearance image optimization skipped", err);
    if (needsFormatConversion) {
      throw new Error("This image format could not be converted. Try a JPEG, PNG, or WebP image.");
    }
    return original;
  }
}

function adminAppearanceUploadStatus_(index, kind, message, busy) {
  const key = kind === "override" ? "Override" : "Pack";
  const status = document.getElementById("appearance" + key + "Status_" + index);
  const button = document.getElementById("appearance" + key + "Upload_" + index);
  if (status) status.textContent = String(message || "");
  if (button) button.disabled = busy === true;
}

function adminAppearancePreviewUpload_(index, url) {
  const current = document.getElementById("appearanceEntityPreview_" + index);
  if (!current || !url) return;
  const separator = String(url).indexOf("?") === -1 ? "?" : "&";
  const cacheBusted = String(url) + separator + "v=" + Date.now();
  if (String(current.tagName || "").toLowerCase() === "img") {
    current.src = cacheBusted;
    return;
  }
  const img = document.createElement("img");
  img.id = current.id;
  img.src = cacheBusted;
  img.alt = "Uploaded image";
  current.replaceWith(img);
}

async function adminAppearanceReloadDashboardOnly_(message) {
  const dashboard = await apiAdminGetAppearanceDashboard(ADMIN_APPEARANCE_STATE.selectedGameId);
  if (!dashboard || dashboard.success === false) {
    throw new Error(dashboard && (dashboard.message || dashboard.error) || "Could not reload appearance settings.");
  }
  ADMIN_APPEARANCE_STATE.dashboard = dashboard;
  if (message) ADMIN_APPEARANCE_STATE.message = message;
  adminAppearancePaint_();
}

function adminAppearanceChooseMedia_(inputId) {
  const input = document.getElementById(String(inputId || ""));
  if (input) input.click();
}

async function adminAppearanceSavePackImage_(index) {
  const entity = adminAppearanceEntityAt_(index);
  if (!entity || !ADMIN_APPEARANCE_STATE.selectedImagePackId) return;
  const input = document.getElementById("appearancePackUrl_" + index);
  const url = input ? input.value.trim() : "";
  if (!url) {
    ADMIN_APPEARANCE_STATE.message = "Paste an external image URL first.";
    adminAppearancePaint_();
    return;
  }
  const result = await apiAdminSaveAppearanceImagePackItem({
    packId: ADMIN_APPEARANCE_STATE.selectedImagePackId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    entityName: entity.entityName,
    variant: "default",
    imageUrl: url,
    imageFileId: "",
    sourceType: "external-url",
    sourceUrl: url,
    altText: entity.entityName,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save pack image.";
    adminAppearancePaint_();
    return;
  }
  await adminAppearanceReloadDashboardOnly_(entity.entityName + " is using an External URL. The source website still owns that image.");
}

async function adminAppearanceImportPackUrl_(index) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById("appearancePackUrl_" + index);
  const url = input ? input.value.trim() : "";
  if (!entity || !ADMIN_APPEARANCE_STATE.selectedImagePackId || !url) {
    ADMIN_APPEARANCE_STATE.message = "Paste an image URL to import first.";
    adminAppearancePaint_();
    return;
  }
  adminAppearanceUploadStatus_(index, "pack", "Importing URL to Drive…", true);
  try {
    const upload = await apiAdminImportImageFromUrl({
      gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
      categoryId: "appearance-pack-" + ADMIN_APPEARANCE_STATE.selectedImagePackId,
      nomineeId: entity.entityId,
      imageUrl: url
    });
    if (!upload || upload.success === false) throw new Error(upload && (upload.message || upload.error) || "Image import failed.");
    const previewUrl = upload.thumbnailUrl || adminAppearanceDriveUrl_(upload.fileId, "w360");
    adminAppearancePreviewUpload_(index, previewUrl);
    const save = await apiAdminSaveAppearanceImagePackItem({
      packId: ADMIN_APPEARANCE_STATE.selectedImagePackId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      entityName: entity.entityName,
      variant: "default",
      imageUrl: upload.thumbnailUrl || "",
      imageFileId: upload.fileId || "",
      sourceType: "drive-import",
      sourceUrl: url,
      altText: entity.entityName,
      active: true
    });
    if (!save || save.success === false) throw new Error(save && (save.message || save.error) || "Image imported but pack assignment could not be saved.");
    await adminAppearanceReloadDashboardOnly_(entity.entityName + " imported to Drive and saved to the Image Pack.");
  } catch (err) {
    adminAppearanceUploadStatus_(index, "pack", err.message || "Import failed.", false);
    ADMIN_APPEARANCE_STATE.message = err.message || "Image import failed.";
  }
}

async function adminAppearanceUploadPackImage_(index, inputId) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById(inputId || ("appearancePackFile_" + index));
  const file = input && input.files && input.files[0];
  if (!entity || !file || !ADMIN_APPEARANCE_STATE.selectedImagePackId) {
    ADMIN_APPEARANCE_STATE.message = "Choose an image file first.";
    adminAppearancePaint_();
    return;
  }

  adminAppearanceUploadStatus_(index, "pack", "Preparing image…", true);
  try {
    const prepared = await adminAppearancePrepareUpload_(file);
    adminAppearanceUploadStatus_(index, "pack", prepared.optimized ? "Optimized. Uploading…" : "Uploading…", true);

    const upload = await apiAdminUploadImage({
      gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
      categoryId: "appearance-pack-" + ADMIN_APPEARANCE_STATE.selectedImagePackId,
      nomineeId: entity.entityId,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      base64: prepared.base64
    });
    if (!upload || upload.success === false) {
      throw new Error(upload && (upload.message || upload.error) || "Image upload failed.");
    }

    const previewUrl = upload.thumbnailUrl || adminAppearanceDriveUrl_(upload.fileId, "w360");
    adminAppearancePreviewUpload_(index, previewUrl);
    adminAppearanceUploadStatus_(index, "pack", "Saving to Image Pack…", true);

    const save = await apiAdminSaveAppearanceImagePackItem({
      packId: ADMIN_APPEARANCE_STATE.selectedImagePackId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      entityName: entity.entityName,
      variant: "default",
      imageUrl: upload.thumbnailUrl || "",
      imageFileId: upload.fileId || "",
      sourceType: "drive-upload",
      sourceUrl: "",
      altText: entity.entityName,
      active: true
    });
    if (!save || save.success === false) {
      throw new Error(save && (save.message || save.error) || "Image uploaded but pack assignment could not be saved.");
    }

    const sizeNote = prepared.optimized
      ? " Image optimized for fast app loading."
      : "";
    await adminAppearanceReloadDashboardOnly_(entity.entityName + " uploaded to the Image Pack." + sizeNote);
  } catch (err) {
    adminAppearanceUploadStatus_(index, "pack", err.message || "Upload failed.", false);
    ADMIN_APPEARANCE_STATE.message = err.message || "Image upload failed.";
  } finally {
    if (input) input.value = "";
  }
}

async function adminAppearanceClearPackImage_(index) {
  const entity = adminAppearanceEntityAt_(index);
  if (!entity || !ADMIN_APPEARANCE_STATE.selectedImagePackId) return;
  await apiAdminSaveAppearanceImagePackItem({
    packId: ADMIN_APPEARANCE_STATE.selectedImagePackId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    entityName: entity.entityName,
    variant: "default",
    imageUrl: "",
    imageFileId: "",
    sourceType: "",
    sourceUrl: "",
    active: false
  });
  await adminAppearanceRefresh_(entity.entityName + " reset to its existing/default image.");
}

async function adminAppearanceSaveOverride_(index) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById("appearanceOverrideUrl_" + index);
  const url = input ? input.value.trim() : "";
  if (!entity) return;
  if (!url) {
    ADMIN_APPEARANCE_STATE.message = "Paste an external image URL first.";
    adminAppearancePaint_();
    return;
  }
  const result = await apiAdminSaveAppearanceOverride({
    gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    imageUrl: url,
    imageFileId: "",
    sourceType: "external-url",
    sourceUrl: url,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save game image override.";
    adminAppearancePaint_();
    return;
  }
  await adminAppearanceReloadDashboardOnly_(entity.entityName + " game-only image is using an External URL.");
}

async function adminAppearanceImportOverrideUrl_(index) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById("appearanceOverrideUrl_" + index);
  const url = input ? input.value.trim() : "";
  if (!entity || !url) {
    ADMIN_APPEARANCE_STATE.message = "Paste an image URL to import first.";
    adminAppearancePaint_();
    return;
  }
  adminAppearanceUploadStatus_(index, "override", "Importing URL to Drive…", true);
  try {
    const upload = await apiAdminImportImageFromUrl({
      gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
      categoryId: "appearance-override",
      nomineeId: entity.entityId,
      imageUrl: url
    });
    if (!upload || upload.success === false) throw new Error(upload && (upload.message || upload.error) || "Image import failed.");
    const previewUrl = upload.thumbnailUrl || adminAppearanceDriveUrl_(upload.fileId, "w360");
    adminAppearancePreviewUpload_(index, previewUrl);
    const save = await apiAdminSaveAppearanceOverride({
      gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      imageUrl: upload.thumbnailUrl || "",
      imageFileId: upload.fileId || "",
      sourceType: "drive-import",
      sourceUrl: url,
      active: true
    });
    if (!save || save.success === false) throw new Error(save && (save.message || save.error) || "Image imported but game override could not be saved.");
    await adminAppearanceReloadDashboardOnly_(entity.entityName + " game-only image imported to Drive.");
  } catch (err) {
    adminAppearanceUploadStatus_(index, "override", err.message || "Import failed.", false);
    ADMIN_APPEARANCE_STATE.message = err.message || "Image import failed.";
  }
}

async function adminAppearanceUploadOverride_(index, inputId) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById(inputId || ("appearanceOverrideFile_" + index));
  const file = input && input.files && input.files[0];
  if (!entity || !file) {
    ADMIN_APPEARANCE_STATE.message = "Choose an image file first.";
    adminAppearancePaint_();
    return;
  }

  adminAppearanceUploadStatus_(index, "override", "Preparing image…", true);
  try {
    const prepared = await adminAppearancePrepareUpload_(file);
    adminAppearanceUploadStatus_(index, "override", prepared.optimized ? "Optimized. Uploading…" : "Uploading…", true);

    const upload = await apiAdminUploadImage({
      gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
      categoryId: "appearance-override",
      nomineeId: entity.entityId,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      base64: prepared.base64
    });
    if (!upload || upload.success === false) {
      throw new Error(upload && (upload.message || upload.error) || "Image upload failed.");
    }

    const previewUrl = upload.thumbnailUrl || adminAppearanceDriveUrl_(upload.fileId, "w360");
    adminAppearancePreviewUpload_(index, previewUrl);
    adminAppearanceUploadStatus_(index, "override", "Saving game override…", true);

    const save = await apiAdminSaveAppearanceOverride({
      gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      imageUrl: upload.thumbnailUrl || "",
      imageFileId: upload.fileId || "",
      sourceType: "drive-upload",
      sourceUrl: "",
      active: true
    });
    if (!save || save.success === false) {
      throw new Error(save && (save.message || save.error) || "Image uploaded but override could not be saved.");
    }

    const sizeNote = prepared.optimized ? " Image optimized for fast app loading." : "";
    await adminAppearanceReloadDashboardOnly_(entity.entityName + " game-only image uploaded." + sizeNote);
  } catch (err) {
    adminAppearanceUploadStatus_(index, "override", err.message || "Upload failed.", false);
    ADMIN_APPEARANCE_STATE.message = err.message || "Image upload failed.";
  } finally {
    if (input) input.value = "";
  }
}

async function adminAppearanceClearOverride_(index) {
  const entity = adminAppearanceEntityAt_(index);
  if (!entity) return;
  await apiAdminSaveAppearanceOverride({
    gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    imageUrl: "",
    imageFileId: "",
    sourceType: "",
    sourceUrl: "",
    active: false
  });
  await adminAppearanceRefresh_(entity.entityName + " game-only override cleared.");
}

function adminAppearanceMountThemePreview_() {
  const editor = document.querySelector(".appearance-theme-editor");
  if (!editor || editor.dataset.previewBound === "true") return;
  editor.dataset.previewBound = "true";
  editor.addEventListener("input", adminAppearanceUpdateThemePreview_);
  editor.addEventListener("change", adminAppearanceUpdateThemePreview_);
  adminAppearanceUpdateThemePreview_();
  adminAppearanceUpdateModeControlVisibility_();
  adminAppearanceSetPreviewState_(ADMIN_APPEARANCE_STATE.themePreviewState || "pregame");
  adminAppearanceSetPreviewDevice_(ADMIN_APPEARANCE_STATE.themePreviewDevice || "desktop");
  adminAppearanceSetPreviewSurface_(ADMIN_APPEARANCE_STATE.themePreviewSurface || "matchup", true);
}

function adminAppearanceStudioValue_(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  if (el.type === "checkbox") return el.checked;
  return el.value === "" ? fallback : el.value;
}

function adminAppearanceStudioNumber_(id, fallback) {
  const value = Number(adminAppearanceStudioValue_(id, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function adminAppearanceStudioHexRgba_(hex, opacityPercent) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!match) return "rgba(37,99,235," + (Number(opacityPercent || 0) / 100) + ")";
  const value = parseInt(match[1], 16);
  return "rgba(" + ((value >> 16) & 255) + "," + ((value >> 8) & 255) + "," + (value & 255) + "," + (Number(opacityPercent || 0) / 100) + ")";
}

function adminAppearanceReadThemeControls_() {
  const unselected = String(adminAppearanceStudioValue_("appearanceThemeUnselected", "grayscale"));
  const density = String(adminAppearanceStudioValue_("appearanceThemeDensity", "compact"));
  const visibility = { elements: {}, devices: { desktop: {}, tablet: {}, mobile: {} } };
  ADMIN_APPEARANCE_VISIBILITY_ELEMENTS.forEach(function(item) {
    const key = item[0];
    visibility.elements[key] = adminAppearanceStudioValue_("appearanceThemeVis_" + key, true) === true;
    visibility.devices.desktop[key] = adminAppearanceStudioValue_("appearanceThemeVisDesktop_" + key, true) === true;
    visibility.devices.tablet[key] = adminAppearanceStudioValue_("appearanceThemeVisTablet_" + key, true) === true;
    visibility.devices.mobile[key] = adminAppearanceStudioValue_("appearanceThemeVisMobile_" + key, true) === true;
  });
  return {
    studioVersion: 6,
    density: density,
    layout: {
      rowHeight: adminAppearanceStudioNumber_("appearanceThemeRowHeight", 76),
      rowPadding: adminAppearanceStudioNumber_("appearanceThemeRowPadding", 7),
      teamGap: adminAppearanceStudioNumber_("appearanceThemeGap", 7),
      versusWidth: adminAppearanceStudioNumber_("appearanceThemeVsWidth", 32),
      confidenceWidth: adminAppearanceStudioNumber_("appearanceThemeConfidenceWidth", 92),
      teamOrder: String(adminAppearanceStudioValue_("appearanceThemeTeamOrder", "away-home"))
    },
    typography: {
      citySize: adminAppearanceStudioNumber_("appearanceThemeCitySize", 10),
      cityWeight: adminAppearanceStudioNumber_("appearanceThemeCityWeight", 700),
      cityOpacity: adminAppearanceStudioNumber_("appearanceThemeCityOpacity", 62),
      teamNameSize: adminAppearanceStudioNumber_("appearanceThemeNameSize", 16),
      teamNameWeight: adminAppearanceStudioNumber_("appearanceThemeNameWeight", 950),
      teamNameSpacing: adminAppearanceStudioNumber_("appearanceThemeNameSpacing", 2.5),
      uppercase: adminAppearanceStudioValue_("appearanceThemeUppercase", true) === true,
      scoreSize: adminAppearanceStudioNumber_("appearanceThemeScoreSize", 12),
      confidenceSize: adminAppearanceStudioNumber_("appearanceThemeConfidenceSize", 16)
    },
    images: {
      size: adminAppearanceStudioNumber_("appearanceThemeImageSize", 38),
      opacity: adminAppearanceStudioNumber_("appearanceThemeImageOpacity", 100),
      shape: String(adminAppearanceStudioValue_("appearanceThemeImageShape", "square")),
      verticalAlign: String(adminAppearanceStudioValue_("appearanceThemeImageAlign", "center")),
      oversize: adminAppearanceStudioValue_("appearanceThemeImageOversize", false) === true,
      fit: String(adminAppearanceStudioValue_("appearanceThemeImageFit", "contain")),
      layer: String(adminAppearanceStudioValue_("appearanceThemeImageFit", "contain")) === "full-bleed" ? "background" : String(adminAppearanceStudioValue_("appearanceThemeImageLayer", "inline")),
      zoom: adminAppearanceStudioNumber_("appearanceThemeImageZoom", 100),
      x: adminAppearanceStudioNumber_("appearanceThemeImageX", 50),
      y: adminAppearanceStudioNumber_("appearanceThemeImageY", 50)
    },
    positioning: {
      cityAlign: String(adminAppearanceStudioValue_("appearanceThemeCityAlign", "left")),
      nameAlign: String(adminAppearanceStudioValue_("appearanceThemeNameAlign", "left")),
      textVertical: String(adminAppearanceStudioValue_("appearanceThemeTextVertical", "center")),
      textOffsetX: adminAppearanceStudioNumber_("appearanceThemeTextOffsetX", 0),
      textOffsetY: adminAppearanceStudioNumber_("appearanceThemeTextOffsetY", 0),
      scoreAnchor: String(adminAppearanceStudioValue_("appearanceThemeScoreAnchor", "bottom-left")),
      scoreOffsetX: adminAppearanceStudioNumber_("appearanceThemeScoreOffsetX", 0),
      scoreOffsetY: adminAppearanceStudioNumber_("appearanceThemeScoreOffsetY", 0),
      confidenceVertical: String(adminAppearanceStudioValue_("appearanceThemeConfidenceVertical", "center")),
      statusAlign: String(adminAppearanceStudioValue_("appearanceThemeStatusAlign", "left"))
    },
    sideLayout: {
      separate: true,
      mirrored: adminAppearanceStudioValue_("appearanceThemeMirrorSides", false) === true,
      away: {
        textAlign: String(adminAppearanceStudioValue_("appearanceThemeAwayTextAlign", "left")),
        textVertical: String(adminAppearanceStudioValue_("appearanceThemeAwayTextVertical", "center")),
        textOffsetX: adminAppearanceStudioNumber_("appearanceThemeAwayTextX", 0),
        textOffsetY: adminAppearanceStudioNumber_("appearanceThemeAwayTextY", 0),
        scoreAnchor: String(adminAppearanceStudioValue_("appearanceThemeAwayScoreAnchor", "bottom-left")),
        scoreOffsetX: adminAppearanceStudioNumber_("appearanceThemeAwayScoreX", 0),
        scoreOffsetY: adminAppearanceStudioNumber_("appearanceThemeAwayScoreY", 0),
        imageX: adminAppearanceStudioNumber_("appearanceThemeAwayImageX", 50),
        imageY: adminAppearanceStudioNumber_("appearanceThemeAwayImageY", 50)
      },
      home: {
        textAlign: String(adminAppearanceStudioValue_("appearanceThemeHomeTextAlign", "left")),
        textVertical: String(adminAppearanceStudioValue_("appearanceThemeHomeTextVertical", "center")),
        textOffsetX: adminAppearanceStudioNumber_("appearanceThemeHomeTextX", 0),
        textOffsetY: adminAppearanceStudioNumber_("appearanceThemeHomeTextY", 0),
        scoreAnchor: String(adminAppearanceStudioValue_("appearanceThemeHomeScoreAnchor", "bottom-left")),
        scoreOffsetX: adminAppearanceStudioNumber_("appearanceThemeHomeScoreX", 0),
        scoreOffsetY: adminAppearanceStudioNumber_("appearanceThemeHomeScoreY", 0),
        imageX: adminAppearanceStudioNumber_("appearanceThemeHomeImageX", 50),
        imageY: adminAppearanceStudioNumber_("appearanceThemeHomeImageY", 50)
      }
    },
    selection: {
      selectedBorderColor: String(adminAppearanceStudioValue_("appearanceThemeSelectedBorder", "#60a5fa")),
      selectedBorderWidth: adminAppearanceStudioNumber_("appearanceThemeSelectedBorderWidth", 2),
      selectedTint: String(adminAppearanceStudioValue_("appearanceThemeSelectedTint", "#2563eb")),
      selectedTintOpacity: adminAppearanceStudioNumber_("appearanceThemeSelectedTintOpacity", 20),
      unselectedTreatment: unselected,
      unselectedGrayscale: adminAppearanceStudioNumber_("appearanceThemeUnselectedGray", 100),
      unselectedOpacity: adminAppearanceStudioNumber_("appearanceThemeUnselectedOpacity", 48)
    },
    result: {
      correctTreatment: "green-outline",
      incorrectTreatment: "red-outline",
      borderWidth: adminAppearanceStudioNumber_("appearanceThemeResultBorderWidth", 2)
    },
    resultTypography: {
      correct: {
        city: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextCity", "#ffffff")),
        teamName: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextName", "#ffffff")),
        score: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextScore", "#22c55e")),
        status: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextStatus", "#22c55e")),
        confidenceNumber: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextConfidence", "#22c55e")),
        confidenceLabel: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextLabel", "#94a3b8")),
        points: String(adminAppearanceStudioValue_("appearanceThemeCorrectTextPoints", "#22c55e"))
      },
      incorrect: {
        city: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextCity", "#ffffff")),
        teamName: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextName", "#ffffff")),
        score: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextScore", "#ef4444")),
        status: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextStatus", "#ef4444")),
        confidenceNumber: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextConfidence", "#ef4444")),
        confidenceLabel: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextLabel", "#94a3b8")),
        points: String(adminAppearanceStudioValue_("appearanceThemeIncorrectTextPoints", "#ef4444"))
      }
    },
    overlays: {
      selectedColor: String(adminAppearanceStudioValue_("appearanceThemeSelectedOverlayColor", "#2563eb")),
      selectedOpacity: adminAppearanceStudioNumber_("appearanceThemeSelectedOverlayOpacity", 20),
      unselectedColor: String(adminAppearanceStudioValue_("appearanceThemeUnselectedOverlayColor", "#020617")),
      unselectedOpacity: adminAppearanceStudioNumber_("appearanceThemeUnselectedOverlayOpacity", 12),
      correctMode: String(adminAppearanceStudioValue_("appearanceThemeCorrectOverlayMode", "solid")),
      correctColor: String(adminAppearanceStudioValue_("appearanceThemeCorrectOverlayColor", "#22c55e")),
      correctColor2: String(adminAppearanceStudioValue_("appearanceThemeCorrectOverlayColor2", "#14532d")),
      correctOpacity: adminAppearanceStudioNumber_("appearanceThemeCorrectOverlayOpacity", 12),
      correctOpacity2: adminAppearanceStudioNumber_("appearanceThemeCorrectOverlayOpacity2", 12),
      correctAngle: adminAppearanceStudioNumber_("appearanceThemeCorrectOverlayAngle", 135),
      incorrectMode: String(adminAppearanceStudioValue_("appearanceThemeIncorrectOverlayMode", "solid")),
      incorrectColor: String(adminAppearanceStudioValue_("appearanceThemeIncorrectOverlayColor", "#ef4444")),
      incorrectColor2: String(adminAppearanceStudioValue_("appearanceThemeIncorrectOverlayColor2", "#7f1d1d")),
      incorrectOpacity: adminAppearanceStudioNumber_("appearanceThemeIncorrectOverlayOpacity", 12),
      incorrectOpacity2: adminAppearanceStudioNumber_("appearanceThemeIncorrectOverlayOpacity2", 12),
      incorrectAngle: adminAppearanceStudioNumber_("appearanceThemeIncorrectOverlayAngle", 135),
      liveColor: String(adminAppearanceStudioValue_("appearanceThemeLiveOverlayColor", "#ef4444")),
      liveOpacity: adminAppearanceStudioNumber_("appearanceThemeLiveOverlayOpacity", 0),
      finalColor: String(adminAppearanceStudioValue_("appearanceThemeFinalOverlayColor", "#e2e8f0")),
      finalOpacity: adminAppearanceStudioNumber_("appearanceThemeFinalOverlayOpacity", 0)
    },
    visibility: visibility,
    row: {
      corners: "custom",
      radius: adminAppearanceStudioNumber_("appearanceThemeRadius", 10),
      spacing: density === "compact" ? "tight" : "normal",
      shadow: String(adminAppearanceStudioValue_("appearanceThemeShadow", "soft"))
    },
    live: {
      badgeStyle: String(adminAppearanceStudioValue_("appearanceThemeLiveBadge", "text")),
      finalBadgeStyle: String(adminAppearanceStudioValue_("appearanceThemeFinalBadge", "text"))
    },
    background: {
      mode: String(adminAppearanceStudioValue_("appearanceThemeBackgroundMode", "gradient")),
      solid: String(adminAppearanceStudioValue_("appearanceThemeSurface", "#0f172a")),
      gradientStart: String(adminAppearanceStudioValue_("appearanceThemeGradientStart", "#1e293b")),
      gradientEnd: String(adminAppearanceStudioValue_("appearanceThemeGradientEnd", "#0f172a")),
      gradientAngle: adminAppearanceStudioNumber_("appearanceThemeGradientAngle", 180),
      overlayOpacity: adminAppearanceStudioNumber_("appearanceThemeOverlayOpacity", 0)
    },
    confidence: {
      style: String(adminAppearanceStudioValue_("appearanceThemeConfidenceStyle", "filled")),
      background: String(adminAppearanceStudioValue_("appearanceThemeConfidenceBg", "#0b1220")),
      text: String(adminAppearanceStudioValue_("appearanceThemeConfidenceText", "#ffffff")),
      border: String(adminAppearanceStudioValue_("appearanceThemeConfidenceBorder", "#60a5fa")),
      radius: adminAppearanceStudioNumber_("appearanceThemeConfidenceRadius", 8),
      lockedOpacity: adminAppearanceStudioNumber_("appearanceThemeLockedOpacity", 62),
      mobileArrowSize: adminAppearanceStudioNumber_("appearanceThemeMobileArrowSize", 4),
      mobileArrowColor: String(adminAppearanceStudioValue_("appearanceThemeMobileArrowColor", "#94a3b8"))
    },
    score: {
      background: String(adminAppearanceStudioValue_("appearanceThemeScoreBg", "#e2e8f0")),
      backgroundOpacity: adminAppearanceStudioNumber_("appearanceThemeScoreBgOpacity", 100),
      text: String(adminAppearanceStudioValue_("appearanceThemeScoreText", "#0f172a")),
      border: String(adminAppearanceStudioValue_("appearanceThemeScoreBorder", "#0f172a")),
      borderOpacity: adminAppearanceStudioNumber_("appearanceThemeScoreBorderOpacity", 100),
      radius: adminAppearanceStudioNumber_("appearanceThemeScoreRadius", 7),
      paddingX: adminAppearanceStudioNumber_("appearanceThemeScorePaddingX", 4),
      paddingY: adminAppearanceStudioNumber_("appearanceThemeScorePaddingY", 2)
    },
    scoreboard: {
      background: String(adminAppearanceStudioValue_("appearanceThemeScoreboardBg", "#0b1220")),
      backgroundOpacity: adminAppearanceStudioNumber_("appearanceThemeScoreboardBgOpacity", 72),
      text: String(adminAppearanceStudioValue_("appearanceThemeScoreboardText", "#94a3b8")),
      border: String(adminAppearanceStudioValue_("appearanceThemeScoreboardBorder", "#334155")),
      borderOpacity: adminAppearanceStudioNumber_("appearanceThemeScoreboardBorderOpacity", 32),
      height: adminAppearanceStudioNumber_("appearanceThemeScoreboardHeight", 26),
      radius: adminAppearanceStudioNumber_("appearanceThemeScoreboardRadius", 0),
      fontSize: adminAppearanceStudioNumber_("appearanceThemeScoreboardFontSize", 10)
    },
    leaderboard: {
      layout: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardLayout", "cards")),
      density: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardDensity", "standard")),
      cardMode: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardCardMode", "gradient")),
      cardBackground: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardCardBg", "#20284a")),
      gradientStart: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardGradientStart", "#20284a")),
      gradientEnd: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardGradientEnd", "#354785")),
      gradientAngle: adminAppearanceStudioNumber_("appearanceThemeLeaderboardGradientAngle", 135),
      cardOpacity: adminAppearanceStudioNumber_("appearanceThemeLeaderboardCardOpacity", 100),
      text: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardText", "#ffffff")),
      muted: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardMuted", "#cbd5e1")),
      border: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardBorder", "#475569")),
      borderOpacity: adminAppearanceStudioNumber_("appearanceThemeLeaderboardBorderOpacity", 30),
      radius: adminAppearanceStudioNumber_("appearanceThemeLeaderboardRadius", 18),
      rowGap: adminAppearanceStudioNumber_("appearanceThemeLeaderboardGap", 12),
      rankStyle: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardRankStyle", "circle")),
      rankBackground: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardRankBg", "#ffffff")),
      rankOpacity: adminAppearanceStudioNumber_("appearanceThemeLeaderboardRankOpacity", 16),
      rankText: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardRankText", "#ffffff")),
      showAvatar: !!(document.getElementById("appearanceThemeLeaderboardShowAvatar") && document.getElementById("appearanceThemeLeaderboardShowAvatar").checked),
      avatarShape: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardAvatarShape", "round")),
      avatarSize: adminAppearanceStudioNumber_("appearanceThemeLeaderboardAvatarSize", 42),
      showCareerLink: !!(document.getElementById("appearanceThemeLeaderboardCareer") && document.getElementById("appearanceThemeLeaderboardCareer").checked),
      showCompare: !!(document.getElementById("appearanceThemeLeaderboardCompare") && document.getElementById("appearanceThemeLeaderboardCompare").checked),
      highlightTopThree: !!(document.getElementById("appearanceThemeLeaderboardTopThree") && document.getElementById("appearanceThemeLeaderboardTopThree").checked),
      gold: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardGold", "#facc15")),
      silver: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardSilver", "#cbd5e1")),
      bronze: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardBronze", "#d97706")),
      highlightCurrent: !!(document.getElementById("appearanceThemeLeaderboardCurrent") && document.getElementById("appearanceThemeLeaderboardCurrent").checked),
      currentColor: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardCurrentColor", "#60a5fa")),
      currentOpacity: adminAppearanceStudioNumber_("appearanceThemeLeaderboardCurrentOpacity", 18),
      showScore: !!(document.getElementById("appearanceThemeLeaderboardShowScore") && document.getElementById("appearanceThemeLeaderboardShowScore").checked),
      showRemaining: !!(document.getElementById("appearanceThemeLeaderboardShowRemaining") && document.getElementById("appearanceThemeLeaderboardShowRemaining").checked),
      showWinChance: !!(document.getElementById("appearanceThemeLeaderboardShowWinChance") && document.getElementById("appearanceThemeLeaderboardShowWinChance").checked),
      showStatues: !!(document.getElementById("appearanceThemeLeaderboardShowStatues") && document.getElementById("appearanceThemeLeaderboardShowStatues").checked),
      showWagerStats: !!(document.getElementById("appearanceThemeLeaderboardShowWager") && document.getElementById("appearanceThemeLeaderboardShowWager").checked),
      showMiniGames: !!(document.getElementById("appearanceThemeLeaderboardShowMini") && document.getElementById("appearanceThemeLeaderboardShowMini").checked),
      showSeasonPick: !!(document.getElementById("appearanceThemeLeaderboardShowSeason") && document.getElementById("appearanceThemeLeaderboardShowSeason").checked),
      miniPanelMode: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardMiniMode", "gradient")),
      miniPanelBackground: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardMiniBg", "#0f172a")),
      miniPanelGradientStart: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardMiniStart", "#0f172a")),
      miniPanelGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeLeaderboardMiniEnd", "#1e293b")),
      miniPanelAngle: adminAppearanceStudioNumber_("appearanceThemeLeaderboardMiniAngle", 135)
    },
    page: {
      backgroundMode: String(adminAppearanceStudioValue_("appearanceThemePageBgMode", "solid")),
      background: String(adminAppearanceStudioValue_("appearanceThemePageBg", "#020617")),
      gradientStart: String(adminAppearanceStudioValue_("appearanceThemePageGradientStart", "#020617")),
      gradientEnd: String(adminAppearanceStudioValue_("appearanceThemePageGradientEnd", "#0f172a")),
      gradientAngle: adminAppearanceStudioNumber_("appearanceThemePageGradientAngle", 180),
      headerMode: String(adminAppearanceStudioValue_("appearanceThemeHeaderBgMode", "solid")),
      headerBackground: String(adminAppearanceStudioValue_("appearanceThemeHeaderBg", "#0f172a")),
      headerGradientStart: String(adminAppearanceStudioValue_("appearanceThemeHeaderGradientStart", "#0f172a")),
      headerGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeHeaderGradientEnd", "#1e293b")),
      headerGradientAngle: adminAppearanceStudioNumber_("appearanceThemeHeaderGradientAngle", 135),
      headerOpacity: adminAppearanceStudioNumber_("appearanceThemeHeaderOpacity", 100),
      headerText: String(adminAppearanceStudioValue_("appearanceThemeHeaderText", "#ffffff")),
      headerMuted: String(adminAppearanceStudioValue_("appearanceThemeHeaderMuted", "#94a3b8")),
      headerRadius: adminAppearanceStudioNumber_("appearanceThemeHeaderRadius", 16),
      sectionGap: adminAppearanceStudioNumber_("appearanceThemeSectionGap", 18)
    },
    questions: (function(){
      const overrides = {}, sectionOverrides = {};
      document.querySelectorAll("[data-question-layout-id]").forEach(function(el){ overrides[String(el.dataset.questionLayoutId||"")] = String(el.value||"inherit"); });
      document.querySelectorAll("[data-question-section-id]").forEach(function(el){ sectionOverrides[String(el.dataset.questionSectionId||"")] = String(el.value||"inherit"); });
      return {
        defaultLayout: String(adminAppearanceStudioValue_("appearanceThemeQuestionDefault", "inherit")),
        cardMode: String(adminAppearanceStudioValue_("appearanceThemeQuestionCardMode", "solid")),
        cardBackground: String(adminAppearanceStudioValue_("appearanceThemeQuestionCardBg", "#0f172a")),
        cardGradientStart: String(adminAppearanceStudioValue_("appearanceThemeQuestionCardGradientStart", "#0f172a")),
        cardGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeQuestionCardGradientEnd", "#1e293b")),
        cardGradientAngle: adminAppearanceStudioNumber_("appearanceThemeQuestionCardGradientAngle", 180),
        cardOpacity: adminAppearanceStudioNumber_("appearanceThemeQuestionCardOpacity", 96),
        headerMode: String(adminAppearanceStudioValue_("appearanceThemeQuestionHeaderMode", "solid")),
        headerBackground: String(adminAppearanceStudioValue_("appearanceThemeQuestionHeaderBg", "#111111")),
        headerGradientStart: String(adminAppearanceStudioValue_("appearanceThemeQuestionHeaderGradientStart", "#111111")),
        headerGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeQuestionHeaderGradientEnd", "#1e293b")),
        headerGradientAngle: adminAppearanceStudioNumber_("appearanceThemeQuestionHeaderGradientAngle", 90),
        headerOpacity: adminAppearanceStudioNumber_("appearanceThemeQuestionHeaderOpacity", 100),
        titleColor: String(adminAppearanceStudioValue_("appearanceThemeQuestionTitle", "#ffffff")),
        titleSize: adminAppearanceStudioNumber_("appearanceThemeQuestionTitleSize", 16),
        answerMode: String(adminAppearanceStudioValue_("appearanceThemeAnswerMode", "solid")),
        answerBackground: String(adminAppearanceStudioValue_("appearanceThemeAnswerBg", "#1e293b")),
        answerGradientStart: String(adminAppearanceStudioValue_("appearanceThemeAnswerGradientStart", "#1e293b")),
        answerGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeAnswerGradientEnd", "#0f172a")),
        answerGradientAngle: adminAppearanceStudioNumber_("appearanceThemeAnswerGradientAngle", 180),
        answerText: String(adminAppearanceStudioValue_("appearanceThemeAnswerText", "#ffffff")),
        answerBorder: String(adminAppearanceStudioValue_("appearanceThemeAnswerBorder", "#334155")),
        selectedMode: String(adminAppearanceStudioValue_("appearanceThemeAnswerSelectedMode", "solid")),
        selectedBackground: String(adminAppearanceStudioValue_("appearanceThemeAnswerSelectedBg", "#854d0e")),
        selectedGradientStart: String(adminAppearanceStudioValue_("appearanceThemeAnswerSelectedGradientStart", "#854d0e")),
        selectedGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeAnswerSelectedGradientEnd", "#f59e0b")),
        selectedGradientAngle: adminAppearanceStudioNumber_("appearanceThemeAnswerSelectedGradientAngle", 135),
        selectedText: String(adminAppearanceStudioValue_("appearanceThemeAnswerSelectedText", "#fde68a")),
        selectedBorder: String(adminAppearanceStudioValue_("appearanceThemeAnswerSelectedBorder", "#facc15")),
        correctColor: "#22c55e", incorrectColor: "#ef4444",
        radius: adminAppearanceStudioNumber_("appearanceThemeQuestionRadius", 16),
        gap: adminAppearanceStudioNumber_("appearanceThemeQuestionGap", 12),
        textColumns: adminAppearanceStudioNumber_("appearanceThemeTextColumns", 2),
        compactColumns: adminAppearanceStudioNumber_("appearanceThemeCompactColumns", 1),
        compactImageSize: adminAppearanceStudioNumber_("appearanceThemeCompactImage", 44),
        imageColumns: adminAppearanceStudioNumber_("appearanceThemeImageColumns", 4),
        imageAspect: String(adminAppearanceStudioValue_("appearanceThemeImageAspect", "2/3")),
        imageFit: String(adminAppearanceStudioValue_("appearanceThemeQuestionImageFit", "cover")),
        imageZoom: adminAppearanceStudioNumber_("appearanceThemeQuestionImageZoom", 100),
        imageX: adminAppearanceStudioNumber_("appearanceThemeQuestionImageX", 50),
        imageY: adminAppearanceStudioNumber_("appearanceThemeQuestionImageY", 50),
        imageOpacity: adminAppearanceStudioNumber_("appearanceThemeQuestionImageOpacity", 100),
        imageTextOverlay: adminAppearanceStudioValue_("appearanceThemeImageTextOverlay", false) === true,
        imageOverlayMode: String(adminAppearanceStudioValue_("appearanceThemeQuestionImageOverlayMode", "gradient")),
        imageOverlayColor: String(adminAppearanceStudioValue_("appearanceThemeQuestionImageOverlayColor", "#000000")),
        imageOverlayColor2: String(adminAppearanceStudioValue_("appearanceThemeQuestionImageOverlayColor2", "#000000")),
        imageOverlayAngle: adminAppearanceStudioNumber_("appearanceThemeQuestionImageOverlayAngle", 0),
        imageOverlayPlacement: String(adminAppearanceStudioValue_("appearanceThemeQuestionImageOverlayPlacement", "bottom")),
        imageOverlayOpacity: adminAppearanceStudioNumber_("appearanceThemeQuestionImageOverlay", 35),
        imageOverlayOpacity2: adminAppearanceStudioNumber_("appearanceThemeQuestionImageOverlay2", 0),
        wagerColumns: adminAppearanceStudioNumber_("appearanceThemeWagerColumns", 2),
        overrides: overrides, sectionOverrides: sectionOverrides
      };
    })(),
    details: {
      background: String(adminAppearanceStudioValue_("appearanceThemeDetailsBg", "#0b1220")),
      opacity: adminAppearanceStudioNumber_("appearanceThemeDetailsOpacity", 86),
      text: String(adminAppearanceStudioValue_("appearanceThemeDetailsText", "#cbd5e1")),
      border: String(adminAppearanceStudioValue_("appearanceThemeDetailsBorder", "#334155")),
      radius: adminAppearanceStudioNumber_("appearanceThemeDetailsRadius", 10)
    },
    bars: {
      sortMode: String(adminAppearanceStudioValue_("appearanceThemeSortBgMode", "solid")),
      sortBackground: String(adminAppearanceStudioValue_("appearanceThemeSortBg", "#0f172a")),
      sortGradientStart: String(adminAppearanceStudioValue_("appearanceThemeSortGradientStart", "#0f172a")),
      sortGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeSortGradientEnd", "#1e293b")),
      sortGradientAngle: adminAppearanceStudioNumber_("appearanceThemeSortGradientAngle", 90),
      sortText: String(adminAppearanceStudioValue_("appearanceThemeSortText", "#ffffff")),
      saveMode: String(adminAppearanceStudioValue_("appearanceThemeSaveBgMode", "solid")),
      saveBackground: String(adminAppearanceStudioValue_("appearanceThemeSaveBg", "#2563eb")),
      saveGradientStart: String(adminAppearanceStudioValue_("appearanceThemeSaveGradientStart", "#2563eb")),
      saveGradientEnd: String(adminAppearanceStudioValue_("appearanceThemeSaveGradientEnd", "#1d4ed8")),
      saveGradientAngle: adminAppearanceStudioNumber_("appearanceThemeSaveGradientAngle", 90),
      saveText: String(adminAppearanceStudioValue_("appearanceThemeSaveText", "#ffffff")),
      buttonRadius: adminAppearanceStudioNumber_("appearanceThemeBarRadius", 9)
    },
    textBackdrop: {
      enabled: adminAppearanceStudioValue_("appearanceThemeTextBackdropEnabled", false) === true,
      mode: String(adminAppearanceStudioValue_("appearanceThemeTextBackdropMode", "gradient")),
      color: String(adminAppearanceStudioValue_("appearanceThemeTextBackdropColor", "#000000")),
      color2: String(adminAppearanceStudioValue_("appearanceThemeTextBackdropColor2", "#000000")),
      opacity: adminAppearanceStudioNumber_("appearanceThemeTextBackdropOpacity", 45),
      angle: adminAppearanceStudioNumber_("appearanceThemeTextBackdropAngle", 90),
      padding: adminAppearanceStudioNumber_("appearanceThemeTextBackdropPadding", 6),
      radius: adminAppearanceStudioNumber_("appearanceThemeTextBackdropRadius", 6)
    },
    winner: {
      overlayType: String(adminAppearanceStudioValue_("appearanceThemeWinnerOverlayType", "none")),
      color: String(adminAppearanceStudioValue_("appearanceThemeWinnerColor", "#22c55e")),
      color2: String(adminAppearanceStudioValue_("appearanceThemeWinnerColor2", "#14532d")),
      opacity: adminAppearanceStudioNumber_("appearanceThemeWinnerOpacity", 20),
      angle: adminAppearanceStudioNumber_("appearanceThemeWinnerAngle", 135),
      placement: String(adminAppearanceStudioValue_("appearanceThemeWinnerPlacement", "full")),
      decoration: String(adminAppearanceStudioValue_("appearanceThemeWinnerDecoration", "none")),
      decorationPosition: String(adminAppearanceStudioValue_("appearanceThemeWinnerDecorationPosition", "top-right")),
      decorationSize: adminAppearanceStudioNumber_("appearanceThemeWinnerDecorationSize", 28),
      decorationColor: String(adminAppearanceStudioValue_("appearanceThemeWinnerDecorationColor", "#facc15"))
    },
    colors: {
      accent: String(adminAppearanceStudioValue_("appearanceThemeSelectedBorder", "#60a5fa")),
      surface: String(adminAppearanceStudioValue_("appearanceThemeSurface", "#0f172a")),
      text: String(adminAppearanceStudioValue_("appearanceThemeText", "#ffffff")),
      muted: String(adminAppearanceStudioValue_("appearanceThemeMuted", "#94a3b8")),
      correct: String(adminAppearanceStudioValue_("appearanceThemeCorrect", "#22c55e")),
      incorrect: String(adminAppearanceStudioValue_("appearanceThemeIncorrect", "#ef4444")),
      live: String(adminAppearanceStudioValue_("appearanceThemeLive", "#ef4444")),
      final: String(adminAppearanceStudioValue_("appearanceThemeFinal", "#e2e8f0"))
    },
    team: {
      cityScale: "small",
      nameScale: "large",
      selectedTreatment: "full-color",
      unselectedTreatment: unselected,
      imageVariant: "default"
    }
  };
}

function adminAppearanceMirrorAlign_(value) {
  value = String(value || "left");
  return value === "left" ? "right" : value === "right" ? "left" : value;
}

function adminAppearanceMirrorScoreAnchor_(value) {
  value = String(value || "inline-right");
  const map = {
    "inline-left":"inline-right", "inline-right":"inline-left",
    "top-left":"top-right", "top-right":"top-left",
    "bottom-left":"bottom-right", "bottom-right":"bottom-left"
  };
  return map[value] || value;
}

function adminAppearanceApplyMirroredSideLayout_(theme) {
  if (!theme || !theme.sideLayout || theme.sideLayout.mirrored !== true) return theme;
  const away = theme.sideLayout.away || {};
  theme.sideLayout.separate = true;
  theme.sideLayout.home = {
    textAlign: adminAppearanceMirrorAlign_(away.textAlign),
    textVertical: away.textVertical || "center",
    textOffsetX: -Number(away.textOffsetX || 0),
    textOffsetY: Number(away.textOffsetY || 0),
    scoreAnchor: adminAppearanceMirrorScoreAnchor_(away.scoreAnchor),
    scoreOffsetX: -Number(away.scoreOffsetX || 0),
    scoreOffsetY: Number(away.scoreOffsetY || 0),
    imageX: 100 - Number(away.imageX == null ? 50 : away.imageX),
    imageY: Number(away.imageY == null ? 50 : away.imageY)
  };
  return theme;
}

function adminAppearanceUpdateModeControlVisibility_() {
  const layerEl = document.getElementById("appearanceThemeImageLayer");
  let mode = layerEl ? String(layerEl.value || "inline") : "inline";
  const fitEl = document.getElementById("appearanceThemeImageFit");
  if (fitEl && fitEl.value === "full-bleed" && mode !== "background") {
    // Full Button Cover belongs only to the true background renderer. When the
    // user changes to Inline/Floating, keep them in that mode and downgrade
    // the stale fit value to Cover instead of snapping the mode back.
    fitEl.value = "cover";
  }
  document.querySelectorAll("[data-image-modes]").forEach(function(el) {
    const allowed = String(el.getAttribute("data-image-modes") || "").split(/\s+/).filter(Boolean);
    el.hidden = allowed.indexOf(mode) === -1;
  });
  const mirror = document.getElementById("appearanceThemeMirrorSides");
  const home = document.getElementById("appearanceHomeIndependentControls");
  if (home) home.hidden = Boolean(mirror && mirror.checked);
  const title = document.getElementById("appearanceAwayLayoutTitle");
  if (title) title.textContent = mirror && mirror.checked ? "Away / Base Layout (Home mirrors this)" : "Away · Independent";
}

function adminAppearanceUpdateThemePreview_(event) {
  const preview = document.getElementById("appearanceThemePreview");
  if (!preview) return;
  if (event && event.target && event.target.id === "appearanceThemeQuestionDefault") {
    const requestedSurface = String(event.target.value || "");
    if (["text","compact","image","list","short-answer","wager"].indexOf(requestedSurface) !== -1) {
      ADMIN_APPEARANCE_STATE.themePreviewSurface = requestedSurface;
    }
  }
  adminAppearanceUpdateModeControlVisibility_();
  let theme = adminAppearanceReadThemeControls_();
  theme = adminAppearanceApplyMirroredSideLayout_(theme);

  // v1.2.17s: drive the Studio with the same serializer used by the live Picks page.
  // This removes the old preview-only interpretation that allowed the two views to drift.
  if (window.AppearanceThemeRuntime) {
    const runtimeMatchup = document.getElementById("appearanceRuntimeMatchupPreview");
    if (runtimeMatchup && typeof window.AppearanceThemeRuntime.confidencePresentation === "function") {
      const runtimePresentation = window.AppearanceThemeRuntime.confidencePresentation(theme);
      runtimeMatchup.className = "confidence-compact-slate appearance-runtime-matchup-preview " + runtimePresentation.className;
      runtimeMatchup.setAttribute("style", runtimePresentation.style);
    }
    const pageShell = document.getElementById("appearancePagePreviewShell");
    if (pageShell && typeof window.AppearanceThemeRuntime.pagePresentation === "function") {
      const pagePresentation = window.AppearanceThemeRuntime.pagePresentation(theme);
      pageShell.className = "picks-page picks-appearance-active appearance-preview-page-shell " + String(pagePresentation.className || "");
      pageShell.setAttribute("style", pagePresentation.style);
    }
  }
  document.querySelectorAll('.appearance-studio-range input[type="range"]').forEach(function(input) {
    const output = document.getElementById(input.dataset.output || "");
    if (output) output.textContent = input.value + String(input.dataset.suffix || "");
  });

  preview.className = [
    "appearance-theme-preview",
    "appearance-studio-preview-state-" + (ADMIN_APPEARANCE_STATE.themePreviewState || "pregame"),
    "unselected-" + theme.selection.unselectedTreatment,
    "image-shape-" + theme.images.shape,
    "image-align-" + theme.images.verticalAlign,
    "image-fit-" + theme.images.fit,
    "image-layer-" + theme.images.layer,
    "team-order-" + theme.layout.teamOrder,
    theme.sideLayout.separate ? "side-layout-separate" : "side-layout-shared",
    "away-align-" + theme.sideLayout.away.textAlign,
    "home-align-" + theme.sideLayout.home.textAlign,
    "away-vertical-" + theme.sideLayout.away.textVertical,
    "home-vertical-" + theme.sideLayout.home.textVertical,
    "away-score-anchor-" + theme.sideLayout.away.scoreAnchor,
    "home-score-anchor-" + theme.sideLayout.home.scoreAnchor,
    "city-align-" + theme.positioning.cityAlign,
    "name-align-" + theme.positioning.nameAlign,
    "text-vertical-" + theme.positioning.textVertical,
    "score-anchor-" + theme.positioning.scoreAnchor,
    "confidence-vertical-" + theme.positioning.confidenceVertical,
    "status-align-" + theme.positioning.statusAlign,
    "shadow-" + theme.row.shadow,
    "background-" + theme.background.mode,
    "confidence-style-" + theme.confidence.style,
    "live-badge-" + theme.live.badgeStyle,
    "final-badge-" + theme.live.finalBadgeStyle,
    theme.typography.uppercase ? "team-uppercase" : "team-naturalcase",
    theme.images.oversize ? "image-oversize" : ""
  ].filter(Boolean).join(" ");

  const vars = {
    "--ap-row-height": theme.layout.rowHeight + "px",
    "--ap-row-padding": theme.layout.rowPadding + "px",
    "--ap-gap": theme.layout.teamGap + "px",
    "--ap-vs-width": theme.layout.versusWidth + "px",
    "--ap-confidence-width": theme.layout.confidenceWidth + "px",
    "--ap-radius": theme.row.radius + "px",
    "--ap-city-size": theme.typography.citySize + "px",
    "--ap-city-weight": theme.typography.cityWeight,
    "--ap-city-opacity": theme.typography.cityOpacity / 100,
    "--ap-name-size": theme.typography.teamNameSize + "px",
    "--ap-name-weight": theme.typography.teamNameWeight,
    "--ap-name-spacing": theme.typography.teamNameSpacing + "px",
    "--ap-score-size": theme.typography.scoreSize + "px",
    "--ap-confidence-size": theme.typography.confidenceSize + "px",
    "--ap-image-size": theme.images.size + "px",
    "--ap-image-opacity": theme.images.opacity / 100,
    "--ap-image-zoom": theme.images.zoom / 100,
    "--ap-image-x": theme.images.x + "%",
    "--ap-image-y": theme.images.y + "%",
    "--ap-away-image-x": adminAppearanceStudioClamp_(theme.images.x + (theme.sideLayout.away.imageX - 50), 0, 100, theme.images.x) + "%",
    "--ap-away-image-y": adminAppearanceStudioClamp_(theme.images.y + (theme.sideLayout.away.imageY - 50), 0, 100, theme.images.y) + "%",
    "--ap-home-image-x": adminAppearanceStudioClamp_(theme.images.x + (theme.sideLayout.home.imageX - 50), 0, 100, theme.images.x) + "%",
    "--ap-home-image-y": adminAppearanceStudioClamp_(theme.images.y + (theme.sideLayout.home.imageY - 50), 0, 100, theme.images.y) + "%",
    "--ap-away-text-x": theme.sideLayout.away.textOffsetX + "px",
    "--ap-away-text-y": theme.sideLayout.away.textOffsetY + "px",
    "--ap-home-text-x": theme.sideLayout.home.textOffsetX + "px",
    "--ap-home-text-y": theme.sideLayout.home.textOffsetY + "px",
    "--ap-text-offset-x": theme.positioning.textOffsetX + "px",
    "--ap-text-offset-y": theme.positioning.textOffsetY + "px",
    "--ap-score-x": theme.positioning.scoreOffsetX + "px",
    "--ap-score-y": theme.positioning.scoreOffsetY + "px",
    "--ap-away-score-x": theme.sideLayout.away.scoreOffsetX + "px",
    "--ap-away-score-y": theme.sideLayout.away.scoreOffsetY + "px",
    "--ap-home-score-x": theme.sideLayout.home.scoreOffsetX + "px",
    "--ap-home-score-y": theme.sideLayout.home.scoreOffsetY + "px",
    "--ap-selected-border": theme.selection.selectedBorderColor,
    "--ap-selected-width": theme.selection.selectedBorderWidth + "px",
    "--ap-selected-bg": adminAppearanceStudioHexRgba_(theme.selection.selectedTint, theme.selection.selectedTintOpacity),
    "--ap-unselected-gray": theme.selection.unselectedGrayscale / 100,
    "--ap-unselected-opacity": theme.selection.unselectedOpacity / 100,
    "--ap-correct": theme.colors.correct,
    "--ap-incorrect": theme.colors.incorrect,
    "--ap-result-width": theme.result.borderWidth + "px",
    "--ap-surface": theme.background.solid,
    "--ap-gradient": "linear-gradient(" + theme.background.gradientAngle + "deg," + theme.background.gradientStart + "," + theme.background.gradientEnd + ")",
    "--ap-overlay": theme.background.overlayOpacity / 100,
    "--ap-selected-overlay": adminAppearanceStudioHexRgba_(theme.overlays.selectedColor, theme.overlays.selectedOpacity),
    "--ap-unselected-overlay": adminAppearanceStudioHexRgba_(theme.overlays.unselectedColor, theme.overlays.unselectedOpacity),
    "--ap-correct-overlay": theme.overlays.correctMode === "gradient" ? "linear-gradient(" + theme.overlays.correctAngle + "deg," + adminAppearanceStudioHexRgba_(theme.overlays.correctColor, theme.overlays.correctOpacity) + "," + adminAppearanceStudioHexRgba_(theme.overlays.correctColor2, theme.overlays.correctOpacity2) + ")" : adminAppearanceStudioHexRgba_(theme.overlays.correctColor, theme.overlays.correctOpacity),
    "--ap-incorrect-overlay": theme.overlays.incorrectMode === "gradient" ? "linear-gradient(" + theme.overlays.incorrectAngle + "deg," + adminAppearanceStudioHexRgba_(theme.overlays.incorrectColor, theme.overlays.incorrectOpacity) + "," + adminAppearanceStudioHexRgba_(theme.overlays.incorrectColor2, theme.overlays.incorrectOpacity2) + ")" : adminAppearanceStudioHexRgba_(theme.overlays.incorrectColor, theme.overlays.incorrectOpacity),
    "--ap-live-overlay": adminAppearanceStudioHexRgba_(theme.overlays.liveColor, theme.overlays.liveOpacity),
    "--ap-final-overlay": adminAppearanceStudioHexRgba_(theme.overlays.finalColor, theme.overlays.finalOpacity),
    "--ap-text": theme.colors.text,
    "--ap-muted": theme.colors.muted,
    "--ap-live": theme.colors.live,
    "--ap-final": theme.colors.final,
    "--ap-confidence-bg": theme.confidence.background,
    "--ap-confidence-text": theme.confidence.text,
    "--ap-confidence-border": theme.confidence.border,
    "--ap-confidence-radius": theme.confidence.radius + "px",
    "--ap-locked-opacity": theme.confidence.lockedOpacity / 100,
    "--ap-mobile-arrow-size": theme.confidence.mobileArrowSize + "px",
    "--ap-mobile-arrow-color": theme.confidence.mobileArrowColor,
    "--ap-score-bg": adminAppearanceStudioHexRgba_(theme.score.background, theme.score.backgroundOpacity),
    "--ap-score-text": theme.score.text,
    "--ap-score-border": adminAppearanceStudioHexRgba_(theme.score.border, theme.score.borderOpacity),
    "--ap-score-radius": theme.score.radius + "px",
    "--ap-score-padding-x": theme.score.paddingX + "px",
    "--ap-score-padding-y": theme.score.paddingY + "px",
    "--ap-scoreboard-bg": adminAppearanceStudioHexRgba_(theme.scoreboard.background, theme.scoreboard.backgroundOpacity),
    "--ap-scoreboard-text": theme.scoreboard.text,
    "--ap-scoreboard-border": adminAppearanceStudioHexRgba_(theme.scoreboard.border, theme.scoreboard.borderOpacity),
    "--ap-scoreboard-height": theme.scoreboard.height + "px",
    "--ap-scoreboard-radius": theme.scoreboard.radius + "px",
    "--ap-scoreboard-font-size": theme.scoreboard.fontSize + "px",
    "--ap-correct-city": theme.resultTypography.correct.city,
    "--ap-correct-name": theme.resultTypography.correct.teamName,
    "--ap-correct-score": theme.resultTypography.correct.score,
    "--ap-correct-status": theme.resultTypography.correct.status,
    "--ap-correct-confidence": theme.resultTypography.correct.confidenceNumber,
    "--ap-correct-label": theme.resultTypography.correct.confidenceLabel,
    "--ap-correct-points": theme.resultTypography.correct.points,
    "--ap-wrong-city": theme.resultTypography.incorrect.city,
    "--ap-wrong-name": theme.resultTypography.incorrect.teamName,
    "--ap-wrong-score": theme.resultTypography.incorrect.score,
    "--ap-wrong-status": theme.resultTypography.incorrect.status,
    "--ap-wrong-confidence": theme.resultTypography.incorrect.confidenceNumber,
    "--ap-wrong-label": theme.resultTypography.incorrect.confidenceLabel,
    "--ap-wrong-points": theme.resultTypography.incorrect.points
  };
  Object.assign(vars, {
    "--ap-page-bg": theme.page.background,
    "--ap-question-card-bg": adminAppearanceStudioHexRgba_(theme.questions.cardBackground, theme.questions.cardOpacity),
    "--ap-question-header-bg": adminAppearanceStudioHexRgba_(theme.questions.headerBackground, theme.questions.headerOpacity),
    "--ap-question-title": theme.questions.titleColor,
    "--ap-question-title-size": theme.questions.titleSize + "px",
    "--ap-answer-bg": theme.questions.answerBackground,
    "--ap-answer-text": theme.questions.answerText,
    "--ap-answer-border": theme.questions.answerBorder,
    "--ap-answer-selected-bg": theme.questions.selectedBackground,
    "--ap-answer-selected-text": theme.questions.selectedText,
    "--ap-answer-selected-border": theme.questions.selectedBorder,
    "--ap-question-radius": theme.questions.radius + "px",
    "--ap-question-gap": theme.questions.gap + "px",
    "--ap-text-columns": theme.questions.textColumns,
    "--ap-compact-columns": theme.questions.compactColumns,
    "--ap-compact-image": theme.questions.compactImageSize + "px",
    "--ap-image-columns": theme.questions.imageColumns,
    "--ap-image-aspect": String(theme.questions.imageAspect || "2/3").replace("/", " / "),
    "--ap-question-image-fit": theme.questions.imageFit,
    "--ap-question-image-overlay": theme.questions.imageOverlayOpacity / 100,
    "--ap-question-image-overlay2": theme.questions.imageOverlayOpacity2 / 100,
    "--ap-wager-columns": theme.questions.wagerColumns,
    "--ap-details-bg": adminAppearanceStudioHexRgba_(theme.details.background, theme.details.opacity),
    "--ap-details-text": theme.details.text,
    "--ap-details-border": theme.details.border,
    "--ap-details-radius": theme.details.radius + "px"
  });
  Object.keys(vars).forEach(function(key) { preview.style.setProperty(key, vars[key]); });

  const leaderboardPreview = document.getElementById("appearanceLeaderboardPreview");
  if (leaderboardPreview && window.AppearanceThemeRuntime && typeof window.AppearanceThemeRuntime.leaderboardPresentation === "function") {
    const lbPresentation = window.AppearanceThemeRuntime.leaderboardPresentation(theme);
    leaderboardPreview.className = "appearance-leaderboard-preview leaderboard-appearance-root " + String(lbPresentation.className || "");
    leaderboardPreview.setAttribute("style", lbPresentation.style || "");
  }

  const device = ADMIN_APPEARANCE_STATE.themePreviewDevice || "desktop";
  preview.querySelectorAll("[data-ap-element]").forEach(function(el) {
    const key = el.dataset.apElement;
    const visible = theme.visibility.elements[key] !== false && theme.visibility.devices[device][key] !== false;
    el.classList.toggle("appearance-element-hidden", !visible);
  });

  adminAppearanceSetPreviewState_(ADMIN_APPEARANCE_STATE.themePreviewState || "pregame", true);
  adminAppearanceSetPreviewDevice_(device, true);
  adminAppearanceSetPreviewSurface_(ADMIN_APPEARANCE_STATE.themePreviewSurface || "matchup", true);
}


function adminAppearanceSetPreviewSurface_(surface, skipUpdate) {
  surface = ["matchup","text","compact","image","list","short-answer","wager"].indexOf(String(surface||"")) !== -1 ? String(surface) : "matchup";
  ADMIN_APPEARANCE_STATE.themePreviewSurface = surface;
  const preview = document.getElementById("appearanceThemePreview");
  if (preview) preview.setAttribute("data-preview-surface", surface);
  document.querySelectorAll("[data-preview-surface]").forEach(function(button){
    if (button.tagName === "BUTTON") button.classList.toggle("active", button.dataset.previewSurface === surface);
  });
  if (!skipUpdate && preview) adminAppearanceUpdateThemePreview_();
}

function adminAppearanceSetPreviewState_(state, skipUpdate) {
  ADMIN_APPEARANCE_STATE.themePreviewState = String(state || "pregame");
  const preview = document.getElementById("appearanceThemePreview");
  if (preview) {
    ["pregame", "live", "final-win", "final-loss"].forEach(function(name) {
      preview.classList.toggle("appearance-studio-preview-state-" + name, name === ADMIN_APPEARANCE_STATE.themePreviewState);
    });
    const scores = preview.querySelectorAll(".appearance-preview-score");
    scores.forEach(function(score, index) {
      score.textContent = state === "final-loss" ? (index === 0 ? "17" : "24") : (index === 0 ? "28" : "21");
    });
    preview.querySelectorAll(".appearance-preview-result-indicator").forEach(function(mark, index) {
      mark.textContent = state === "final-loss" && index === 0 ? "✕" : "✓";
    });
    preview.querySelectorAll(".appearance-question-runtime-preview").forEach(function(card) {
      card.classList.remove("correct", "wrong");
      if (state === "final-win") card.classList.add("correct");
      if (state === "final-loss") card.classList.add("wrong");
    });
    const row = document.getElementById("appearanceRuntimeGameRow");
    if (row) {
      row.classList.remove("phase-pregame", "phase-live", "phase-final", "pending", "correct", "wrong");
      row.classList.add(state === "live" ? "phase-live" : (state === "final-win" || state === "final-loss") ? "phase-final" : "phase-pregame");
      row.classList.add(state === "final-win" ? "correct" : state === "final-loss" ? "wrong" : "pending");
    }
    const gameTime = preview.querySelector(".appearance-preview-game-time");
    const liveBadge = preview.querySelector(".appearance-preview-live-badge");
    const clock = preview.querySelector(".appearance-preview-clock");
    const finalBadge = preview.querySelector(".appearance-preview-final-badge");
    if (gameTime) gameTime.style.display = state === "pregame" ? "" : "none";
    if (liveBadge) liveBadge.style.display = state === "live" ? "" : "none";
    if (clock) clock.style.display = state === "live" ? "" : "none";
    if (finalBadge) finalBadge.style.display = state === "final-win" || state === "final-loss" ? "" : "none";
    preview.querySelectorAll(".appearance-preview-score").forEach(function(score) { score.style.display = state === "pregame" ? "none" : ""; });
    preview.querySelectorAll(".confidence-result-points").forEach(function(points) { points.style.display = state === "final-win" || state === "final-loss" ? "" : "none"; });
  }
  document.querySelectorAll("[data-preview-state]").forEach(function(button) {
    button.classList.toggle("active", button.dataset.previewState === ADMIN_APPEARANCE_STATE.themePreviewState);
  });
  if (!skipUpdate && preview) adminAppearanceUpdateThemePreview_();
}

function adminAppearanceSetPreviewDevice_(device, skipUpdate) {
  device = ["desktop", "tablet", "mobile"].indexOf(String(device || "")) !== -1 ? String(device) : "desktop";
  ADMIN_APPEARANCE_STATE.themePreviewDevice = device;
  const frame = document.getElementById("appearanceThemePreviewFrame");
  if (frame) frame.className = "appearance-preview-device-frame preview-device-" + device;
  const sizeLabel = document.getElementById("appearancePreviewSizeLabel");
  if (sizeLabel) sizeLabel.textContent = device === "desktop" ? "Desktop · 1180px" : device === "tablet" ? "Tablet · 820px" : "Mobile · 390px";
  document.querySelectorAll("[data-preview-device]").forEach(function(button) {
    button.classList.toggle("active", button.dataset.previewDevice === device);
  });
  if (!skipUpdate) adminAppearanceUpdateThemePreview_();
}

function adminAppearanceToggleFullPreview_() {
  const editor = document.querySelector(".appearance-theme-editor");
  if (!editor) return;
  const active = !editor.classList.contains("appearance-studio-preview-only");
  editor.classList.toggle("appearance-studio-preview-only", active);
  const button = document.getElementById("appearanceStudioFullPreviewButton");
  if (button) button.textContent = active ? "Show Controls" : "Full Preview";
  window.setTimeout(function() { adminAppearanceUpdateThemePreview_(); }, 0);
}


function adminAppearanceSetThemeActionState_(state) {
  ADMIN_APPEARANCE_STATE.themeActionState = String(state || "");
  const save = document.getElementById("appearanceThemeSaveButton");
  const apply = document.getElementById("appearanceThemeApplyButton");
  if (save) {
    save.dataset.state = state;
    save.textContent = state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save";
    save.disabled = state === "saving" || state === "applying";
  }
  if (apply) {
    apply.dataset.state = state;
    apply.textContent = state === "applying" ? "Applying…" : state === "applied" ? "Applied ✓" : "Apply to Game";
    apply.disabled = state === "saving" || state === "applying";
  }
}

function adminAppearanceClearThemeActionStateLater_() {
  window.setTimeout(function() {
    ADMIN_APPEARANCE_STATE.themeActionState = "";
    adminAppearanceSetThemeActionState_("");
  }, 2400);
}

function adminAppearanceSetControl_(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = value === true;
  else el.value = String(value);
}

function adminAppearanceApplyPreset_(preset) {
  const values = {
    basic: {appearanceThemeBackgroundMode:"solid",appearanceThemeImageLayer:"inline",appearanceThemeQuestionCardMode:"solid",appearanceThemeAnswerMode:"solid",appearanceThemeWinnerOverlayType:"none",appearanceThemeTextBackdropEnabled:false},
    simple: {appearanceThemeDensity:"compact",appearanceThemeImageLayer:"inline-background",appearanceThemeImageFit:"contain",appearanceThemeQuestionCardMode:"solid",appearanceThemeAnswerMode:"solid",appearanceThemePageBgMode:"solid",appearanceThemeWinnerDecoration:"check",appearanceThemeWinnerOverlayType:"solid",appearanceThemeWinnerOpacity:10},
    advanced: {appearanceThemeBackgroundMode:"gradient",appearanceThemeImageLayer:"background",appearanceThemeImageFit:"cover",appearanceThemeTextBackdropEnabled:true,appearanceThemeTextBackdropMode:"gradient",appearanceThemePageBgMode:"gradient",appearanceThemeHeaderBgMode:"gradient",appearanceThemeQuestionCardMode:"gradient",appearanceThemeQuestionHeaderMode:"gradient",appearanceThemeAnswerMode:"gradient",appearanceThemeAnswerSelectedMode:"gradient",appearanceThemeWinnerOverlayType:"gradient",appearanceThemeWinnerDecoration:"trophy"},
    mobile: {appearanceThemeDensity:"compact",appearanceThemeRowHeight:64,appearanceThemeRowPadding:4,appearanceThemeGap:3,appearanceThemeVsWidth:12,appearanceThemeConfidenceWidth:58,appearanceThemeCitySize:8,appearanceThemeNameSize:13,appearanceThemeScoreSize:11,appearanceThemeConfidenceSize:15,appearanceThemeMobileArrowSize:0}
  };
  const selected = values[String(preset || "")] || values.basic;
  Object.keys(selected).forEach(function(id) { adminAppearanceSetControl_(id, selected[id]); });
  if (preset === "mobile") {
    ["city","versus","confidenceLabel"].forEach(function(key) {
      const el = document.getElementById("appearanceThemeVisMobile_" + key);
      if (el) el.checked = false;
    });
  }
  ADMIN_APPEARANCE_STATE.message = "Preset applied to the preview. Save to keep it.";
  adminAppearanceUpdateThemePreview_();
}
async function adminAppearancePersistTheme_(options) {
  options = options || {};
  const nameEl = document.getElementById("appearanceThemeName");
  let name = String(nameEl && nameEl.value || "").trim();
  if (options.name) name = options.name;
  if (!name) {
    ADMIN_APPEARANCE_STATE.message = "Enter a Theme Pack name first.";
    adminAppearancePaint_();
    return null;
  }
  const themeIdEl = document.getElementById("appearanceThemeId");
  const baseEl = document.getElementById("appearanceThemeBase");
  let themePayload = adminAppearanceReadThemeControls_();
  themePayload = adminAppearanceApplyMirroredSideLayout_(themePayload);
  const result = await apiAdminSaveAppearanceThemePack({
    themePackId: options.newTheme ? "" : String(themeIdEl && themeIdEl.value || "").trim(),
    themeName: name,
    baseThemeId: String(baseEl && baseEl.value || ""),
    theme: themePayload,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save Theme Pack.";
    adminAppearancePaint_();
    return null;
  }
  ADMIN_APPEARANCE_STATE.selectedThemePackId = result.themePackId || ADMIN_APPEARANCE_STATE.selectedThemePackId;
  ADMIN_APPEARANCE_STATE.themeNewMode = false;
  await adminAppearanceRefresh_(options.message || "Theme Pack saved.");
  return result;
}

async function adminAppearanceSaveTheme_() {
  adminAppearanceSetThemeActionState_("saving");
  const saved = await adminAppearancePersistTheme_({ message: "Theme Pack saved. Preview and game runtime now share the same controls." });
  if (!saved) { adminAppearanceSetThemeActionState_(""); return; }
  adminAppearanceSetThemeActionState_("saved");
  adminAppearanceClearThemeActionStateLater_();
}

async function adminAppearanceDuplicateTheme_() {
  const row = adminAppearanceThemeById_(ADMIN_APPEARANCE_STATE.selectedThemePackId);
  const baseName = String(row && row.ThemeName || document.getElementById("appearanceThemeName") && document.getElementById("appearanceThemeName").value || "Theme").trim();
  const newName = window.prompt("Name for the duplicated Theme Pack. The original will not be changed.", baseName + " Copy");
  if (newName == null) return;
  const cleanName = String(newName || "").trim();
  if (!cleanName) return;
  const saved = await adminAppearancePersistTheme_({ newTheme: true, name: cleanName, message: "Created \"" + cleanName + "\". Original theme was not changed." });
  if (saved) ADMIN_APPEARANCE_STATE.message = "Created \"" + cleanName + "\". Original theme was not changed.";
}

async function adminAppearanceCreateBlankTheme_() {
  const newName = window.prompt("Name for the new Theme Pack.", "New Theme");
  if (newName == null) return;
  const cleanName = String(newName || "").trim();
  if (!cleanName) return;
  const blankTheme = adminAppearanceStudioDefaults_({});
  const result = await apiAdminSaveAppearanceThemePack({
    themeName: cleanName,
    baseThemeId: "app-default",
    theme: blankTheme,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not create Theme Pack.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.selectedThemePackId = result.themePackId || "";
  ADMIN_APPEARANCE_STATE.themeNewMode = false;
  await adminAppearanceRefresh_("Created new Theme Pack \"" + cleanName + "\". Its internal ID was generated automatically.");
}

async function adminAppearanceApplyThemeToGame_() {
  adminAppearanceSetThemeActionState_("applying");
  const saved = await adminAppearancePersistTheme_({ message: "Theme saved. Applying it to this game…" });
  if (!saved) { adminAppearanceSetThemeActionState_(""); return; }
  const imagePack = document.getElementById("appearanceGameImagePack");
  const result = await apiAdminSaveGameAppearance({
    gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
    imagePackId: imagePack ? imagePack.value : adminAppearanceDefaultImagePack_(),
    themePackId: saved.themePackId,
    imageMode: imagePack && imagePack.value ? "pack" : "default",
    themeMode: "pack",
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Theme saved but could not be assigned to the game.";
    adminAppearanceSetThemeActionState_("");
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.themeActionState = "applied";
  await adminAppearanceRefresh_("Theme saved and applied to this game.");
  adminAppearanceSetThemeActionState_("applied");
  adminAppearanceClearThemeActionStateLater_();
}

function adminAppearanceResetTheme_() {
  const row = ADMIN_APPEARANCE_STATE.themeNewMode ? null : adminAppearanceThemeById_(ADMIN_APPEARANCE_STATE.selectedThemePackId);
  if (row) {
    ADMIN_APPEARANCE_STATE.message = "Theme controls reset to the last saved values.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.themeNewMode = true;
  adminAppearancePaint_();
}


// v1.2.17w compatibility aliases retained for older admin regression contracts.
function adminAppearanceCreatePack_() { return adminAppearanceCreateBlankPack_(); }
function adminAppearanceNewTheme_() { return adminAppearanceCreateBlankTheme_(); }
function adminAppearanceSaveThemeAsNew_() { return adminAppearanceDuplicateTheme_(); }
