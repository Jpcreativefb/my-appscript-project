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
      const entityType = String(nominee.entryType || category.entryType || "nominee").trim().toLowerCase() || "nominee";
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

function adminAppearanceThemeEditor_() {
  const selectedId = ADMIN_APPEARANCE_STATE.selectedThemePackId || adminAppearanceDefaultTheme_();
  const row = ADMIN_APPEARANCE_STATE.themeNewMode ? null : adminAppearanceThemeById_(selectedId);
  const theme = adminAppearanceJson_(row && row.ThemeJSON);
  const team = theme.team || {};
  const result = theme.result || {};
  const rowTheme = theme.row || {};
  const colors = theme.colors || {};
  const themeId = row ? row.ThemePackId : "";
  const themeName = row ? row.ThemeName : "";
  const baseTheme = row ? row.BaseThemeId : "app-default";

  function option(value, current, label) {
    return '<option value="' + value + '"' + (String(current || "") === value ? ' selected' : '') + '>' + (label || value) + '</option>';
  }

  return `
    <div class="appearance-theme-editor">
      <div class="appearance-theme-editor-header">
        <label>Theme to edit
          <select class="input" onchange="adminAppearanceSelectThemeEditor_(this.value)">
            ${adminAppearanceThemeOptions_(selectedId, false)}
          </select>
        </label>
        <button type="button" class="button secondary" onclick="adminAppearanceNewTheme_()">+ New Theme Pack</button>
      </div>

      <div class="appearance-theme-grid">
        <label>Theme Name<input id="appearanceThemeName" class="input" value="${adminAppearanceEscape_(themeName)}" placeholder="My Theme"></label>
        <label>Theme ID<input id="appearanceThemeId" class="input" value="${adminAppearanceEscape_(themeId)}" placeholder="auto-generated when blank" ${row ? 'readonly' : ''}></label>
        <label>Base Theme<select id="appearanceThemeBase" class="input">${adminAppearanceThemeOptions_(baseTheme, true)}</select></label>
        <label>Density<select id="appearanceThemeDensity" class="input">${option('compact', theme.density || 'compact', 'Compact')}${option('standard', theme.density, 'Standard')}${option('comfortable', theme.density, 'Comfortable')}</select></label>
        <label>City Size<select id="appearanceThemeCity" class="input">${option('small', team.cityScale || 'small', 'Small')}${option('medium', team.cityScale, 'Medium')}</select></label>
        <label>Team Name Size<select id="appearanceThemeNameScale" class="input">${option('medium', team.nameScale, 'Medium')}${option('large', team.nameScale || 'large', 'Large')}${option('xlarge', team.nameScale, 'Extra Large')}</select></label>
        <label>Unselected Team<select id="appearanceThemeUnselected" class="input">${option('grayscale', team.unselectedTreatment || 'grayscale', 'Black & White')}${option('dim', team.unselectedTreatment, 'Dim')}${option('none', team.unselectedTreatment, 'Keep Full Color')}</select></label>
        <label>Corners<select id="appearanceThemeCorners" class="input">${option('square', rowTheme.corners, 'Square')}${option('soft', rowTheme.corners || 'soft', 'Soft')}${option('rounded', rowTheme.corners, 'Rounded')}</select></label>
        <label>Spacing<select id="appearanceThemeSpacing" class="input">${option('tight', rowTheme.spacing || 'tight', 'Tight')}${option('normal', rowTheme.spacing, 'Normal')}</select></label>
        <label>Accent<input id="appearanceThemeAccent" type="color" value="${adminAppearanceEscape_(colors.accent || '#60a5fa')}"></label>
        <label>Surface<input id="appearanceThemeSurface" type="color" value="${adminAppearanceEscape_(colors.surface || '#0f172a')}"></label>
        <label>Text<input id="appearanceThemeText" type="color" value="${adminAppearanceEscape_(colors.text || '#ffffff')}"></label>
        <label>Correct Pick<input id="appearanceThemeCorrect" type="color" value="${adminAppearanceEscape_(colors.correct || '#22c55e')}"></label>
        <label>Wrong Pick<input id="appearanceThemeIncorrect" type="color" value="${adminAppearanceEscape_(colors.incorrect || '#ef4444')}"></label>
        <label>Live<input id="appearanceThemeLive" type="color" value="${adminAppearanceEscape_(colors.live || '#ef4444')}"></label>
      </div>

      ${adminAppearanceThemePreview_(theme)}

      <div class="admin-actions">
        <button type="button" class="button" onclick="adminAppearanceSaveTheme_()">Save Theme Pack</button>
      </div>
    </div>`;
}

function adminAppearanceThemePreview_(theme) {
  theme = theme || {};
  const team = theme.team || {};
  const row = theme.row || {};
  const colors = theme.colors || {};
  const classes = [
    'appearance-preview-density-' + adminAppearanceEscape_(theme.density || 'compact'),
    'appearance-preview-city-' + adminAppearanceEscape_(team.cityScale || 'small'),
    'appearance-preview-name-' + adminAppearanceEscape_(team.nameScale || 'large'),
    'appearance-preview-corners-' + adminAppearanceEscape_(row.corners || 'soft')
  ].join(' ');
  const style = [
    '--ap-accent:' + (colors.accent || '#60a5fa'),
    '--ap-surface:' + (colors.surface || '#0f172a'),
    '--ap-text:' + (colors.text || '#ffffff'),
    '--ap-correct:' + (colors.correct || '#22c55e')
  ].join(';');
  return `<div id="appearanceThemePreview" class="appearance-theme-preview unselected-${adminAppearanceEscape_(team.unselectedTreatment || 'grayscale')} ${classes}" style="${adminAppearanceEscape_(style)}">
    <div class="appearance-preview-team selected"><small>Chicago</small><strong>BEARS</strong><span>🐻</span></div>
    <b class="appearance-preview-vs">VS</b>
    <div class="appearance-preview-team muted"><small>Detroit</small><strong>LIONS</strong><span>🦁</span></div>
    <div class="appearance-preview-confidence"><small>Confidence</small><strong>16</strong></div>
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
        <div><h1>Appearance Manager</h1><div class="admin-sub">Reusable artwork and visual themes for Sports, Awards, Reality TV, Prediction, Hybrid, and future games.</div></div>
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
        <summary><strong>Theme Packs</strong><span>Reusable visual treatment without changing game logic</span></summary>
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
      imageUrl: "",
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
      imageUrl: "",
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
}

function adminAppearanceUpdateThemePreview_() {
  const preview = document.getElementById("appearanceThemePreview");
  if (!preview) return;
  function value(id, fallback) {
    const el = document.getElementById(id);
    return el ? String(el.value || fallback || "") : (fallback || "");
  }
  const density = value("appearanceThemeDensity", "compact");
  const city = value("appearanceThemeCity", "small");
  const name = value("appearanceThemeNameScale", "large");
  const corners = value("appearanceThemeCorners", "soft");
  const unselected = value("appearanceThemeUnselected", "grayscale");
  preview.className = [
    "appearance-theme-preview",
    "unselected-" + unselected,
    "appearance-preview-density-" + density,
    "appearance-preview-city-" + city,
    "appearance-preview-name-" + name,
    "appearance-preview-corners-" + corners
  ].join(" ");
  preview.style.setProperty("--ap-accent", value("appearanceThemeAccent", "#60a5fa"));
  preview.style.setProperty("--ap-surface", value("appearanceThemeSurface", "#0f172a"));
  preview.style.setProperty("--ap-text", value("appearanceThemeText", "#ffffff"));
  preview.style.setProperty("--ap-correct", value("appearanceThemeCorrect", "#22c55e"));
}

async function adminAppearanceSaveTheme_() {
  const name = String(document.getElementById("appearanceThemeName") && document.getElementById("appearanceThemeName").value || "").trim();
  if (!name) {
    ADMIN_APPEARANCE_STATE.message = "Enter a Theme Pack name first.";
    adminAppearancePaint_();
    return;
  }
  const theme = {
    density: document.getElementById("appearanceThemeDensity").value,
    team: {
      cityScale: document.getElementById("appearanceThemeCity").value,
      nameScale: document.getElementById("appearanceThemeNameScale").value,
      selectedTreatment: "full-color",
      unselectedTreatment: document.getElementById("appearanceThemeUnselected").value,
      imageVariant: "default"
    },
    result: {
      correctTreatment: "green-outline",
      incorrectTreatment: "red-outline"
    },
    row: {
      corners: document.getElementById("appearanceThemeCorners").value,
      spacing: document.getElementById("appearanceThemeSpacing").value
    },
    colors: {
      accent: document.getElementById("appearanceThemeAccent").value,
      surface: document.getElementById("appearanceThemeSurface").value,
      text: document.getElementById("appearanceThemeText").value,
      correct: document.getElementById("appearanceThemeCorrect").value,
      incorrect: document.getElementById("appearanceThemeIncorrect").value,
      live: document.getElementById("appearanceThemeLive").value,
      muted: "#94a3b8"
    }
  };
  const result = await apiAdminSaveAppearanceThemePack({
    themePackId: String(document.getElementById("appearanceThemeId").value || "").trim(),
    themeName: name,
    baseThemeId: document.getElementById("appearanceThemeBase").value || "",
    theme: theme,
    active: true
  });
  if (!result || result.success === false) {
    ADMIN_APPEARANCE_STATE.message = result && (result.message || result.error) || "Could not save Theme Pack.";
    adminAppearancePaint_();
    return;
  }
  ADMIN_APPEARANCE_STATE.selectedThemePackId = result.themePackId || ADMIN_APPEARANCE_STATE.selectedThemePackId;
  ADMIN_APPEARANCE_STATE.themeNewMode = false;
  await adminAppearanceRefresh_("Theme Pack saved. Assign it to a game above to use it.");
  ADMIN_APPEARANCE_STATE.selectedThemePackId = result.themePackId || ADMIN_APPEARANCE_STATE.selectedThemePackId;
  adminAppearancePaint_();
}
