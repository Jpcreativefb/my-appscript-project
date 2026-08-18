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
  rows.forEach(function(row) {
    const selected = adminAppearanceKey_(row.PackId) === adminAppearanceKey_(selectedId) ? " selected" : "";
    options.push('<option value="' + adminAppearanceEscape_(row.PackId) + '"' + selected + '>' + adminAppearanceEscape_(row.PackName || row.PackId) + '</option>');
  });
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

function adminAppearanceResolvedPreview_(entity) {
  const override = adminAppearanceGameOverride_(entity);
  if (override) {
    const url = String(override.ImageUrl || "").trim() || adminAppearanceDriveUrl_(override.ImageFileId, "w360");
    if (url) return { url: url, source: "Game override" };
  }
  const item = adminAppearanceSelectedPackItem_(entity);
  if (item) {
    const url = String(item.ImageUrl || "").trim() || adminAppearanceDriveUrl_(item.ImageFileId, "w360");
    if (url) return { url: url, source: "Image pack" };
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

  return `
    <div class="appearance-entity-card">
      <div class="appearance-entity-preview">${imageHtml}<small>${adminAppearanceEscape_(resolved.source)}</small></div>
      <div class="appearance-entity-copy">
        <strong>${adminAppearanceEscape_(entity.entityName)}</strong>
        <span>${adminAppearanceEscape_(entity.entityType)} · ${adminAppearanceEscape_(entity.entityId)}</span>
      </div>
      <details class="appearance-entity-editor">
        <summary>Change Image</summary>
        <div class="appearance-entity-fields">
          <div>
            <b>Image Pack Image</b>
            <small>Reusable anywhere this same entity ID appears with this Image Pack.</small>
            ${disabledPack ? '<div class="admin-sub">Create/select a custom Image Pack to edit pack artwork.</div>' : `
              <input id="appearancePackUrl_${index}" class="input" type="url" value="${adminAppearanceEscape_(pack && pack.ImageUrl || "")}" placeholder="https://…">
              <input id="appearancePackFile_${index}" class="input" type="file" accept="image/*">
              <div class="admin-actions compact">
                <button class="admin-small-button" type="button" onclick="adminAppearanceSavePackImage_(${index})">Save URL</button>
                <button id="appearancePackUpload_${index}" class="admin-small-button secondary" type="button" onclick="adminAppearanceUploadPackImage_(${index})">Upload</button>
                <button class="admin-small-button secondary" type="button" onclick="adminAppearanceClearPackImage_(${index})">Use Default</button>
              </div>
              <small id="appearancePackStatus_${index}" class="appearance-upload-status"></small>`}
          </div>
          <div>
            <b>This Game Only</b>
            <small>Overrides the selected Image Pack only for this game.</small>
            <input id="appearanceOverrideUrl_${index}" class="input" type="url" value="${adminAppearanceEscape_(override && override.ImageUrl || "")}" placeholder="https://…">
            <input id="appearanceOverrideFile_${index}" class="input" type="file" accept="image/*">
            <div class="admin-actions compact">
              <button class="admin-small-button" type="button" onclick="adminAppearanceSaveOverride_(${index})">Save Override</button>
              <button id="appearanceOverrideUpload_${index}" class="admin-small-button secondary" type="button" onclick="adminAppearanceUploadOverride_(${index})">Upload</button>
              <button class="admin-small-button secondary" type="button" onclick="adminAppearanceClearOverride_(${index})">Clear Override</button>
            </div>
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
  const positioning = theme.positioning || {};
  const overlays = theme.overlays || {};
  const resultTypography = theme.resultTypography || {};
  const correctType = resultTypography.correct || {};
  const incorrectType = resultTypography.incorrect || {};

  return {
    studioVersion: 2,
    density: theme.density || "compact",
    layout: {
      rowHeight: adminAppearanceStudioClamp_(layout.rowHeight, 60, 160, 76),
      rowPadding: adminAppearanceStudioClamp_(layout.rowPadding, 0, 24, 7),
      teamGap: adminAppearanceStudioClamp_(layout.teamGap, 0, 28, 7),
      versusWidth: adminAppearanceStudioClamp_(layout.versusWidth, 0, 52, 32),
      confidenceWidth: adminAppearanceStudioClamp_(layout.confidenceWidth, 44, 160, 92)
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
      confidenceVertical: positioning.confidenceVertical || "center",
      statusAlign: positioning.statusAlign || "left"
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
      correctColor: overlays.correctColor || colors.correct || "#22c55e",
      correctOpacity: adminAppearanceStudioClamp_(overlays.correctOpacity, 0, 80, 12),
      incorrectColor: overlays.incorrectColor || colors.incorrect || "#ef4444",
      incorrectOpacity: adminAppearanceStudioClamp_(overlays.incorrectOpacity, 0, 80, 12),
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
      lockedOpacity: adminAppearanceStudioClamp_(confidence.lockedOpacity, 20, 100, 62)
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
  return `<div class="appearance-visibility-matrix">
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
  </div>`;
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
      <div class="appearance-studio-topbar">
        <label>Theme to edit<select class="input" onchange="adminAppearanceSelectThemeEditor_(this.value)">${adminAppearanceThemeOptions_(selectedId, false)}</select></label>
        <label>Theme Name<input id="appearanceThemeName" class="input" value="${adminAppearanceEscape_(themeName)}" placeholder="My Theme"></label>
        <label>Theme ID<input id="appearanceThemeId" class="input" value="${adminAppearanceEscape_(themeId)}" placeholder="auto-generated" ${row ? 'readonly' : ''}></label>
        <label>Base Theme<select id="appearanceThemeBase" class="input">${adminAppearanceThemeOptions_(baseTheme, true)}</select></label>
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
            ${adminAppearanceStudioRange_("appearanceThemeRadius", "Row Corners", theme.row.radius, 0, 28, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeShadow", "Shadow", theme.row.shadow, [["none","None"],["soft","Soft"],["strong","Strong"]])}
          </div></details>

          <details open><summary>Typography</summary><div class="appearance-studio-panel">
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

          <details open><summary>Images & Full Image Mode</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeImageFit", "Image Mode", theme.images.fit, [["contain","Contain"],["cover","Cover Frame"],["full-bleed","Full Image Button"]])}
            ${adminAppearanceStudioRange_("appearanceThemeImageSize", "Image Size", theme.images.size, 20, 140, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeImageZoom", "Image Zoom", theme.images.zoom, 50, 220, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeImageX", "Image X Position", theme.images.x, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeImageY", "Image Y Position", theme.images.y, 0, 100, 1, "%")}
            ${adminAppearanceStudioRange_("appearanceThemeImageOpacity", "Image Opacity", theme.images.opacity, 0, 100, 1, "%")}
            ${adminAppearanceStudioSelect_("appearanceThemeImageShape", "Image Shape", theme.images.shape, [["square","Square"],["soft","Soft"],["round","Round"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeImageAlign", "Vertical Align", theme.images.verticalAlign, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
            <label class="appearance-studio-check"><input id="appearanceThemeImageOversize" type="checkbox" ${theme.images.oversize ? 'checked' : ''}><span>Allow image to oversize panel</span></label>
          </div></details>

          <details open><summary>Element Positioning</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeCityAlign", "City Alignment", theme.positioning.cityAlign, [["left","Left"],["center","Center"],["right","Right"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeNameAlign", "Team Name Alignment", theme.positioning.nameAlign, [["left","Left"],["center","Center"],["right","Right"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeTextVertical", "Text Vertical", theme.positioning.textVertical, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
            ${adminAppearanceStudioRange_("appearanceThemeTextOffsetX", "Text X Offset", theme.positioning.textOffsetX, -30, 30, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeTextOffsetY", "Text Y Offset", theme.positioning.textOffsetY, -30, 30, 1, "px")}
            ${adminAppearanceStudioSelect_("appearanceThemeScoreAnchor", "Score Position", theme.positioning.scoreAnchor, [["top-left","Top Left"],["top-right","Top Right"],["bottom-left","Bottom Left"],["bottom-right","Bottom Right"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeConfidenceVertical", "Confidence Vertical", theme.positioning.confidenceVertical, [["top","Top"],["center","Center"],["bottom","Bottom"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeStatusAlign", "Status Alignment", theme.positioning.statusAlign, [["left","Left"],["center","Center"],["right","Right"]])}
          </div></details>

          <details open><summary>Selection & Results</summary><div class="appearance-studio-panel">
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

          <details><summary>Background & Overlay Layers</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioSelect_("appearanceThemeBackgroundMode", "Background", theme.background.mode, [["solid","Solid"],["gradient","Gradient"]])}
            ${adminAppearanceStudioColor_("appearanceThemeSurface", "Solid Surface", theme.background.solid)}
            ${adminAppearanceStudioColor_("appearanceThemeGradientStart", "Gradient Start", theme.background.gradientStart)}
            ${adminAppearanceStudioColor_("appearanceThemeGradientEnd", "Gradient End", theme.background.gradientEnd)}
            ${adminAppearanceStudioRange_("appearanceThemeGradientAngle", "Gradient Angle", theme.background.gradientAngle, 0, 360, 1, "°")}
            ${adminAppearanceStudioRange_("appearanceThemeOverlayOpacity", "Whole Row Dark Overlay", theme.background.overlayOpacity, 0, 80, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeSelectedOverlayColor", "Selected Overlay", theme.overlays.selectedColor)}
            ${adminAppearanceStudioRange_("appearanceThemeSelectedOverlayOpacity", "Selected Overlay Opacity", theme.overlays.selectedOpacity, 0, 80, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeUnselectedOverlayColor", "Unselected Overlay", theme.overlays.unselectedColor)}
            ${adminAppearanceStudioRange_("appearanceThemeUnselectedOverlayOpacity", "Unselected Overlay Opacity", theme.overlays.unselectedOpacity, 0, 80, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeCorrectOverlayColor", "Correct Overlay", theme.overlays.correctColor)}
            ${adminAppearanceStudioRange_("appearanceThemeCorrectOverlayOpacity", "Correct Overlay Opacity", theme.overlays.correctOpacity, 0, 80, 1, "%")}
            ${adminAppearanceStudioColor_("appearanceThemeIncorrectOverlayColor", "Incorrect Overlay", theme.overlays.incorrectColor)}
            ${adminAppearanceStudioRange_("appearanceThemeIncorrectOverlayOpacity", "Incorrect Overlay Opacity", theme.overlays.incorrectOpacity, 0, 80, 1, "%")}
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

          <details><summary>Scoreboard & Confidence</summary><div class="appearance-studio-panel">
            ${adminAppearanceStudioColor_("appearanceThemeLive", "Live Color", theme.colors.live)}
            ${adminAppearanceStudioColor_("appearanceThemeFinal", "Final Color", theme.colors.final)}
            ${adminAppearanceStudioSelect_("appearanceThemeLiveBadge", "Live Badge", theme.live.badgeStyle, [["text","Text"],["outline","Outline"],["pill","Pill"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeFinalBadge", "Final Badge", theme.live.finalBadgeStyle, [["text","Text"],["outline","Outline"],["pill","Pill"]])}
            ${adminAppearanceStudioSelect_("appearanceThemeConfidenceStyle", "Confidence Box", theme.confidence.style, [["filled","Filled"],["outline","Outline"],["minimal","Minimal"]])}
            ${adminAppearanceStudioColor_("appearanceThemeConfidenceBg", "Confidence Background", theme.confidence.background)}
            ${adminAppearanceStudioColor_("appearanceThemeConfidenceText", "Confidence Text", theme.confidence.text)}
            ${adminAppearanceStudioColor_("appearanceThemeConfidenceBorder", "Confidence Border", theme.confidence.border)}
            ${adminAppearanceStudioRange_("appearanceThemeConfidenceRadius", "Confidence Corners", theme.confidence.radius, 0, 24, 1, "px")}
            ${adminAppearanceStudioRange_("appearanceThemeLockedOpacity", "Locked Opacity", theme.confidence.lockedOpacity, 30, 100, 1, "%")}
          </div></details>
        </aside>

        <main class="appearance-studio-canvas">
          ${adminAppearanceThemePreview_(theme)}
        </main>

        <aside class="appearance-studio-actions">
          <h3>Theme Actions</h3>
          <button type="button" class="button" onclick="adminAppearanceSaveTheme_()">Save Theme</button>
          <button type="button" class="button secondary" onclick="adminAppearanceDuplicateTheme_()">Duplicate Theme</button>
          <button type="button" class="button secondary" onclick="adminAppearanceSaveThemeAsNew_()">Save As New</button>
          <button type="button" class="button secondary" onclick="adminAppearanceApplyThemeToGame_()">Apply to This Game</button>
          <button type="button" class="button secondary" onclick="adminAppearanceResetTheme_()">Reset Theme Controls</button>
          <button type="button" class="button secondary" onclick="adminAppearanceNewTheme_()">+ Blank Theme</button>
          <div class="admin-sub">Theme changes affect appearance only. Picks, scoring, schedules and Image Packs are untouched.</div>
        </aside>
      </div>
    </div>`;
}

function adminAppearanceThemePreview_(theme) {
  theme = adminAppearanceStudioDefaults_(theme);
  const entities = adminAppearancePreviewEntities_();
  function teamHtml(entity, selected) {
    const image = entity.imageUrl
      ? '<img src="' + adminAppearanceEscape_(entity.imageUrl) + '" alt="">'
      : '<span class="appearance-preview-placeholder">★</span>';
    return `<button type="button" class="appearance-preview-team ${selected ? 'selected' : 'muted'}">
      <small data-ap-element="city">${adminAppearanceEscape_(entity.city)}</small>
      <strong data-ap-element="teamName">${adminAppearanceEscape_(entity.nickname)}</strong>
      <span class="appearance-preview-image"><span class="appearance-preview-image-art" data-ap-element="teamImage">${image}</span><b class="appearance-preview-score" data-ap-element="score">21</b></span>
      <span class="appearance-preview-result-indicator" data-ap-element="resultIndicator">✓</span>
    </button>`;
  }
  return `<div class="appearance-studio-preview-wrap">
    <div class="appearance-studio-preview-toolbar">
      <div class="appearance-studio-preview-tabs">
        <button type="button" data-preview-state="pregame" onclick="adminAppearanceSetPreviewState_('pregame')">Pregame</button>
        <button type="button" data-preview-state="live" onclick="adminAppearanceSetPreviewState_('live')">Live</button>
        <button type="button" data-preview-state="final-win" onclick="adminAppearanceSetPreviewState_('final-win')">Final Win</button>
        <button type="button" data-preview-state="final-loss" onclick="adminAppearanceSetPreviewState_('final-loss')">Final Loss</button>
      </div>
      <div class="appearance-studio-device-tabs" aria-label="Preview size">
        <button type="button" data-preview-device="desktop" onclick="adminAppearanceSetPreviewDevice_('desktop')">Desktop</button>
        <button type="button" data-preview-device="tablet" onclick="adminAppearanceSetPreviewDevice_('tablet')">Tablet</button>
        <button type="button" data-preview-device="mobile" onclick="adminAppearanceSetPreviewDevice_('mobile')">Mobile</button>
      </div>
    </div>
    <div id="appearanceThemePreviewFrame" class="appearance-preview-device-frame preview-device-desktop">
      <div id="appearanceThemePreview" class="appearance-theme-preview appearance-studio-preview-state-pregame">
        <div class="appearance-preview-main">
          ${teamHtml(entities[0], true)}
          <b class="appearance-preview-vs" data-ap-element="versus">VS</b>
          ${teamHtml(entities[1], false)}
          <div class="appearance-preview-confidence">
            <small data-ap-element="confidenceLabel">Confidence</small>
            <strong data-ap-element="confidenceValue">16</strong>
            <em data-ap-element="points">+16</em>
          </div>
        </div>
        <div class="appearance-preview-meta" data-ap-element="detailsBar">
          <strong class="appearance-preview-status">
            <span class="appearance-preview-game-time" data-ap-element="gameTime">SUN 12:00 PM</span>
            <span class="appearance-preview-live-badge" data-ap-element="liveBadge">LIVE</span>
            <span class="appearance-preview-clock" data-ap-element="clock">Q3 6:42</span>
            <span class="appearance-preview-final-badge" data-ap-element="finalBadge">FINAL</span>
          </strong>
          <span class="appearance-preview-details-text"><span data-ap-element="moneyline">Odds</span> · <span data-ap-element="records">Records</span> · <span data-ap-element="favorite">Favorite</span></span>
        </div>
      </div>
    </div>
    <div class="appearance-studio-preview-note">Switch Desktop / Tablet / Mobile above. Live preview uses the first two entities from the selected game when available.</div>
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

      <section class="card appearance-assignment-card">
        <h2>Game Appearance</h2>
        <div class="appearance-assignment-grid">
          <label>Game<select id="appearanceGameSelect" class="input" onchange="adminAppearanceSelectGame_(this.value)">${adminAppearanceGameOptions_()}</select></label>
          <label>Image Pack<select id="appearanceGameImagePack" class="input">${adminAppearanceImagePackOptions_(assignment.ImagePackId || currentPack)}</select></label>
          <label>Theme Pack<select id="appearanceGameThemePack" class="input">${adminAppearanceThemeOptions_(assignment.ThemePackId || currentTheme, false)}</select></label>
        </div>
        <div class="admin-actions"><button class="button" onclick="adminAppearanceSaveGameAssignment_()">Save Game Appearance</button></div>
        <div class="admin-sub">Image priority: Game override → Image Pack → existing game image. Changing appearance never rebuilds questions or schedules.</div>
      </section>

      <details class="card admin-collapsible-card appearance-pack-card" open>
        <summary><strong>Image Packs</strong><span>Reusable image sets + individual game overrides</span></summary>
        <div class="appearance-card-body">
          <div class="appearance-pack-toolbar">
            <label>Pack to edit<select class="input" onchange="adminAppearanceSelectImagePack_(this.value)">${adminAppearanceImagePackOptions_(currentPack)}</select></label>
            <div class="appearance-new-pack">
              <input id="appearanceNewPackName" class="input" placeholder="New pack name — e.g. NFL Helmets 2026">
              <input id="appearanceNewPackScopeType" class="input" value="${adminAppearanceEscape_(scope.scopeType)}" placeholder="Scope type">
              <input id="appearanceNewPackScopeValue" class="input" value="${adminAppearanceEscape_(scope.scopeValue)}" placeholder="League / scope (optional)">
              <button class="button secondary" onclick="adminAppearanceCreatePack_()">+ Create Image Pack</button>
            </div>
          </div>
          <div class="admin-sub">${entities.length} unique ${entities.length === 1 ? 'entity' : 'entities'} found in this game. Team/nominee IDs are reused by packs wherever the same IDs appear.</div>
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
  await adminAppearanceLoadGame_(id);
  if (imagePackId !== undefined) ADMIN_APPEARANCE_STATE.selectedImagePackId = imagePackId;
  if (themePackId) ADMIN_APPEARANCE_STATE.selectedThemePackId = themePackId;
  ADMIN_APPEARANCE_STATE.themeNewMode = themeNewMode;
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
  ADMIN_APPEARANCE_STATE.selectedImagePackId = String(packId || "");
  ADMIN_APPEARANCE_STATE.message = "";
  adminAppearancePaint_();
}

function adminAppearanceSelectThemeEditor_(themeId) {
  ADMIN_APPEARANCE_STATE.selectedThemePackId = String(themeId || "");
  ADMIN_APPEARANCE_STATE.themeNewMode = false;
  adminAppearancePaint_();
}

function adminAppearanceNewTheme_() {
  ADMIN_APPEARANCE_STATE.themeNewMode = true;
  ADMIN_APPEARANCE_STATE.message = "Creating a new Theme Pack. Give it a name and save it.";
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
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save game appearance.";
    adminAppearancePaint_();
    return;
  }
  await adminAppearanceRefresh_("Game appearance saved. Player pages will use it on their next refresh.");
}

async function adminAppearanceCreatePack_() {
  const name = String(document.getElementById("appearanceNewPackName") && document.getElementById("appearanceNewPackName").value || "").trim();
  if (!name) {
    ADMIN_APPEARANCE_STATE.message = "Enter an Image Pack name first.";
    adminAppearancePaint_();
    return;
  }
  const result = await apiAdminSaveAppearanceImagePack({
    packName: name,
    scopeType: document.getElementById("appearanceNewPackScopeType").value || "all",
    scopeValue: document.getElementById("appearanceNewPackScopeValue").value || "",
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not create Image Pack.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.selectedImagePackId = result.packId || "";
  await adminAppearanceRefresh_("Image Pack created. Add images below, then assign it to a game.");
  ADMIN_APPEARANCE_STATE.selectedImagePackId = result.packId || "";
  adminAppearancePaint_();
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

async function adminAppearanceSavePackImage_(index) {
  const entity = adminAppearanceEntityAt_(index);
  if (!entity || !ADMIN_APPEARANCE_STATE.selectedImagePackId) return;
  const input = document.getElementById("appearancePackUrl_" + index);
  const result = await apiAdminSaveAppearanceImagePackItem({
    packId: ADMIN_APPEARANCE_STATE.selectedImagePackId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    entityName: entity.entityName,
    variant: "default",
    imageUrl: input ? input.value.trim() : "",
    imageFileId: "",
    altText: entity.entityName,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save pack image.";
    adminAppearancePaint_();
    return;
  }
  await adminAppearanceRefresh_(entity.entityName + " pack image saved.");
}

async function adminAppearanceUploadPackImage_(index) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById("appearancePackFile_" + index);
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
    const button = document.getElementById("appearancePackUpload_" + index);
    if (button) button.disabled = false;
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
    active: false
  });
  await adminAppearanceRefresh_(entity.entityName + " reset to its existing/default image.");
}

async function adminAppearanceSaveOverride_(index) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById("appearanceOverrideUrl_" + index);
  if (!entity) return;
  const result = await apiAdminSaveAppearanceOverride({
    gameId: ADMIN_APPEARANCE_STATE.selectedGameId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    imageUrl: input ? input.value.trim() : "",
    imageFileId: "",
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save game image override.";
    adminAppearancePaint_();
    return;
  }
  await adminAppearanceRefresh_(entity.entityName + " game-only image override saved.");
}

async function adminAppearanceUploadOverride_(index) {
  const entity = adminAppearanceEntityAt_(index);
  const input = document.getElementById("appearanceOverrideFile_" + index);
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
    const button = document.getElementById("appearanceOverrideUpload_" + index);
    if (button) button.disabled = false;
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
  adminAppearanceSetPreviewState_(ADMIN_APPEARANCE_STATE.themePreviewState || "pregame");
  adminAppearanceSetPreviewDevice_(ADMIN_APPEARANCE_STATE.themePreviewDevice || "desktop");
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
    studioVersion: 2,
    density: density,
    layout: {
      rowHeight: adminAppearanceStudioNumber_("appearanceThemeRowHeight", 76),
      rowPadding: adminAppearanceStudioNumber_("appearanceThemeRowPadding", 7),
      teamGap: adminAppearanceStudioNumber_("appearanceThemeGap", 7),
      versusWidth: adminAppearanceStudioNumber_("appearanceThemeVsWidth", 32),
      confidenceWidth: adminAppearanceStudioNumber_("appearanceThemeConfidenceWidth", 92)
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
      confidenceVertical: String(adminAppearanceStudioValue_("appearanceThemeConfidenceVertical", "center")),
      statusAlign: String(adminAppearanceStudioValue_("appearanceThemeStatusAlign", "left"))
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
      correctColor: String(adminAppearanceStudioValue_("appearanceThemeCorrectOverlayColor", "#22c55e")),
      correctOpacity: adminAppearanceStudioNumber_("appearanceThemeCorrectOverlayOpacity", 12),
      incorrectColor: String(adminAppearanceStudioValue_("appearanceThemeIncorrectOverlayColor", "#ef4444")),
      incorrectOpacity: adminAppearanceStudioNumber_("appearanceThemeIncorrectOverlayOpacity", 12),
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
      lockedOpacity: adminAppearanceStudioNumber_("appearanceThemeLockedOpacity", 62)
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

function adminAppearanceUpdateThemePreview_() {
  const preview = document.getElementById("appearanceThemePreview");
  if (!preview) return;
  const theme = adminAppearanceReadThemeControls_();
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
    "--ap-text-offset-x": theme.positioning.textOffsetX + "px",
    "--ap-text-offset-y": theme.positioning.textOffsetY + "px",
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
    "--ap-correct-overlay": adminAppearanceStudioHexRgba_(theme.overlays.correctColor, theme.overlays.correctOpacity),
    "--ap-incorrect-overlay": adminAppearanceStudioHexRgba_(theme.overlays.incorrectColor, theme.overlays.incorrectOpacity),
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
  Object.keys(vars).forEach(function(key) { preview.style.setProperty(key, vars[key]); });

  const device = ADMIN_APPEARANCE_STATE.themePreviewDevice || "desktop";
  preview.querySelectorAll("[data-ap-element]").forEach(function(el) {
    const key = el.dataset.apElement;
    const visible = theme.visibility.elements[key] !== false && theme.visibility.devices[device][key] !== false;
    el.classList.toggle("appearance-element-hidden", !visible);
  });

  adminAppearanceSetPreviewState_(ADMIN_APPEARANCE_STATE.themePreviewState || "pregame", true);
  adminAppearanceSetPreviewDevice_(device, true);
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
  document.querySelectorAll("[data-preview-device]").forEach(function(button) {
    button.classList.toggle("active", button.dataset.previewDevice === device);
  });
  if (!skipUpdate) adminAppearanceUpdateThemePreview_();
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
  const result = await apiAdminSaveAppearanceThemePack({
    themePackId: options.newTheme ? "" : String(themeIdEl && themeIdEl.value || "").trim(),
    themeName: name,
    baseThemeId: String(baseEl && baseEl.value || ""),
    theme: adminAppearanceReadThemeControls_(),
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
  await adminAppearancePersistTheme_({ message: "Theme Pack saved. Preview and game runtime now share the same controls." });
}

async function adminAppearanceSaveThemeAsNew_() {
  const name = String(document.getElementById("appearanceThemeName") && document.getElementById("appearanceThemeName").value || "").trim();
  const nextName = name ? name + " Copy" : "New Theme";
  await adminAppearancePersistTheme_({ newTheme: true, name: nextName, message: "Saved as a new Theme Pack." });
}

async function adminAppearanceDuplicateTheme_() {
  const row = adminAppearanceThemeById_(ADMIN_APPEARANCE_STATE.selectedThemePackId);
  const baseName = String(row && row.ThemeName || document.getElementById("appearanceThemeName") && document.getElementById("appearanceThemeName").value || "Theme").trim();
  await adminAppearancePersistTheme_({ newTheme: true, name: baseName + " Copy", message: "Theme duplicated. You can keep editing the copy." });
}

async function adminAppearanceApplyThemeToGame_() {
  const saved = await adminAppearancePersistTheme_({ message: "Theme saved. Applying it to this game…" });
  if (!saved) return;
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
    adminAppearancePaint_();
    return;
  }
  await adminAppearanceRefresh_("Theme saved and applied to this game.");
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

