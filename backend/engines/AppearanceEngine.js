/* =========================================================
   APPEARANCE ENGINE — v1.2.17c

   Shared appearance foundation for every Awards App game type.
   Image resolution order:
     1. Per-game/entity override
     2. Assigned image pack
     3. Existing/default image supplied by the game
     4. Blank (frontend generic fallback)

   Theme resolution order:
     1. Default theme pack
     2. Assigned theme pack (+ BaseThemeId chain)
     3. Per-game theme override
     4. Per-entity theme override
========================================================= */

const APPEARANCE_IMAGE_PACKS_SHEET = "AppearanceImagePacks";
const APPEARANCE_IMAGE_ITEMS_SHEET = "AppearanceImagePackItems";
const APPEARANCE_THEME_PACKS_SHEET = "AppearanceThemePacks";
const APPEARANCE_GAME_ASSIGNMENTS_SHEET = "GameAppearance";
const APPEARANCE_OVERRIDES_SHEET = "AppearanceOverrides";
const APPEARANCE_HUB_SETTINGS_SHEET = "AppearanceHubSettings";

function appearanceSpreadsheet_() {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const spreadsheet = SpreadsheetApp.getActive();
      if (spreadsheet) return spreadsheet;
    } catch (err) {
      lastError = err;
    }
    if (attempt < 2) Utilities.sleep(350 * (attempt + 1));
  }
  if (lastError) throw lastError;
  throw new Error("Could not access the Awards App spreadsheet.");
}

const APPEARANCE_IMAGE_PACK_HEADERS = [
  "PackId",
  "PackName",
  "ScopeType",
  "ScopeValue",
  "Description",
  "Active",
  "IsDefault",
  "CreatedAt",
  "UpdatedAt"
];

const APPEARANCE_IMAGE_ITEM_HEADERS = [
  "PackId",
  "EntityType",
  "EntityId",
  "EntityName",
  "Variant",
  "ImageUrl",
  "ImageFileId",
  "SourceType",
  "SourceUrl",
  "AltText",
  "Active",
  "UpdatedAt"
];

const APPEARANCE_THEME_PACK_HEADERS = [
  "ThemePackId",
  "ThemeName",
  "Description",
  "BaseThemeId",
  "ThemeJSON",
  "Active",
  "IsDefault",
  "CreatedAt",
  "UpdatedAt"
];

const APPEARANCE_GAME_ASSIGNMENT_HEADERS = [
  "GameId",
  "ImagePackId",
  "ThemePackId",
  "ImageMode",
  "ThemeMode",
  "ThemeOverrideJSON",
  "Active",
  "UpdatedAt"
];

const APPEARANCE_OVERRIDE_HEADERS = [
  "GameId",
  "EntityType",
  "EntityId",
  "ImageUrl",
  "ImageFileId",
  "SourceType",
  "SourceUrl",
  "ThemeOverrideJSON",
  "Active",
  "UpdatedAt"
];

const APPEARANCE_HUB_SETTING_HEADERS = [
  "SettingKey",
  "HubCategory",
  "HubGroup",
  "DisplayName",
  "Color",
  "ColorMode",
  "GradientStart",
  "GradientEnd",
  "GradientAngle",
  "ImageUrl",
  "ImageFileId",
  "ImageSourceType",
  "ImageSourceUrl",
  "ImageOpacity",
  "ImageDarken",
  "PanelTint",
  "IconText",
  "IconUrl",
  "IconFileId",
  "IconSourceType",
  "IconSourceUrl",
  "ShowNavLabel",
  "Active",
  "UpdatedAt"
];

function appearanceHubDefaultRows_() {
  return [
    { SettingKey: "home", HubCategory: "home", HubGroup: "", DisplayName: "Home", Color: "#20284a", IconText: "⌂", ShowNavLabel: true, Active: true },
    { SettingKey: "sports", HubCategory: "sports", HubGroup: "", DisplayName: "Sports", Color: "#1f5f45", IconText: "🏈", ShowNavLabel: true, Active: true },
    { SettingKey: "reality", HubCategory: "reality", HubGroup: "", DisplayName: "Reality", Color: "#6d3aa8", IconText: "📺", ShowNavLabel: true, Active: true },
    { SettingKey: "awards", HubCategory: "awards", HubGroup: "", DisplayName: "Awards", Color: "#9a6a13", IconText: "🏆", ShowNavLabel: true, Active: true },
    { SettingKey: "general", HubCategory: "general", HubGroup: "", DisplayName: "General Games", Color: "#4452a4", IconText: "🎲", ShowNavLabel: true, Active: true },
    { SettingKey: "more", HubCategory: "more", HubGroup: "", DisplayName: "More", Color: "#374151", IconText: "•••", ShowNavLabel: true, Active: true },

    { SettingKey: "sports:nfl", HubCategory: "sports", HubGroup: "NFL", DisplayName: "NFL", Color: "#24456f", IconText: "🏈", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:mlb", HubCategory: "sports", HubGroup: "MLB", DisplayName: "MLB", Color: "#8c2f39", IconText: "⚾", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:nba", HubCategory: "sports", HubGroup: "NBA", DisplayName: "NBA", Color: "#a85518", IconText: "🏀", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:nhl", HubCategory: "sports", HubGroup: "NHL", DisplayName: "NHL", Color: "#334155", IconText: "🏒", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:ncaa", HubCategory: "sports", HubGroup: "NCAA", DisplayName: "NCAA", Color: "#344b77", IconText: "🎓", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:nascar", HubCategory: "sports", HubGroup: "NASCAR", DisplayName: "NASCAR", Color: "#991b1b", IconText: "🏁", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:formula-1", HubCategory: "sports", HubGroup: "Formula 1", DisplayName: "Formula 1", Color: "#b91c1c", IconText: "🏎️", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:soccer", HubCategory: "sports", HubGroup: "Soccer", DisplayName: "Soccer", Color: "#276749", IconText: "⚽", ShowNavLabel: true, Active: true },
    { SettingKey: "sports:other-sports", HubCategory: "sports", HubGroup: "Other Sports", DisplayName: "Other Sports", Color: "#315b4b", IconText: "🏟️", ShowNavLabel: true, Active: true },

    { SettingKey: "reality:survivor", HubCategory: "reality", HubGroup: "Survivor", DisplayName: "Survivor", Color: "#4d7c0f", IconText: "🔥", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:masterchef", HubCategory: "reality", HubGroup: "MasterChef", DisplayName: "MasterChef", Color: "#9f1239", IconText: "🍽️", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:top-chef", HubCategory: "reality", HubGroup: "Top Chef", DisplayName: "Top Chef", Color: "#7c2d12", IconText: "👨‍🍳", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:the-traitors", HubCategory: "reality", HubGroup: "The Traitors", DisplayName: "The Traitors", Color: "#4c1d95", IconText: "🗡️", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:the-amazing-race", HubCategory: "reality", HubGroup: "The Amazing Race", DisplayName: "Amazing Race", Color: "#0369a1", IconText: "✈️", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:dancing-with-the-stars", HubCategory: "reality", HubGroup: "Dancing with the Stars", DisplayName: "DWTS", Color: "#9d174d", IconText: "💃", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:big-brother", HubCategory: "reality", HubGroup: "Big Brother", DisplayName: "Big Brother", Color: "#4338ca", IconText: "👁️", ShowNavLabel: true, Active: true },
    { SettingKey: "reality:other-reality", HubCategory: "reality", HubGroup: "Other Reality", DisplayName: "Other Reality", Color: "#6d3aa8", IconText: "📺", ShowNavLabel: true, Active: true },

    { SettingKey: "awards:oscars", HubCategory: "awards", HubGroup: "Oscars", DisplayName: "Oscars", Color: "#8a6914", IconText: "🏆", ShowNavLabel: true, Active: true },
    { SettingKey: "awards:emmys", HubCategory: "awards", HubGroup: "Emmys", DisplayName: "Emmys", Color: "#a16207", IconText: "📺", ShowNavLabel: true, Active: true },
    { SettingKey: "awards:grammys", HubCategory: "awards", HubGroup: "Grammys", DisplayName: "Grammys", Color: "#854d0e", IconText: "🎵", ShowNavLabel: true, Active: true },
    { SettingKey: "awards:golden-globes", HubCategory: "awards", HubGroup: "Golden Globes", DisplayName: "Golden Globes", Color: "#92400e", IconText: "🌐", ShowNavLabel: true, Active: true },
    { SettingKey: "awards:tony-awards", HubCategory: "awards", HubGroup: "Tony Awards", DisplayName: "Tony Awards", Color: "#7e22ce", IconText: "🎭", ShowNavLabel: true, Active: true },
    { SettingKey: "awards:other-awards", HubCategory: "awards", HubGroup: "Other Awards", DisplayName: "Other Awards", Color: "#9a6a13", IconText: "🏅", ShowNavLabel: true, Active: true }
  ];
}

function appearanceHubSettingKey_(category, group) {
  const cat = appearanceString_(category || "general").toLowerCase();
  const grp = appearanceString_(group).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return grp ? cat + ":" + grp : cat;
}

function appearanceLeagueDefaultRows_(spreadsheet) {
  const ss = spreadsheet || appearanceSpreadsheet_();
  const sheet = ss && ss.getSheetByName ? ss.getSheetByName("Leagues") : null;
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];

  const rows = appearanceSheetRowsToObjects_(
    sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues()
  ).filter(function(row) {
    return appearanceBool_(row.Active, true) && !!appearanceString_(row.LeagueId);
  });

  const palette = [
    ["#315a8a", "#1d3454"],
    ["#7c3f72", "#4a2545"],
    ["#34735a", "#1f4938"],
    ["#9a5b24", "#5f3715"],
    ["#6550a7", "#392b68"],
    ["#a13d4b", "#5d2430"],
    ["#287188", "#174754"],
    ["#5f6f2d", "#38421a"]
  ];

  function paletteIndex(value) {
    const text = appearanceString_(value).toLowerCase();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % palette.length;
  }

  return rows.map(function(league) {
    const leagueId = appearanceString_(league.LeagueId);
    const pair = palette[paletteIndex(leagueId)];
    return {
      SettingKey: appearanceHubSettingKey_("league", leagueId),
      HubCategory: "league",
      HubGroup: leagueId,
      DisplayName: appearanceString_(league.LeagueName || leagueId),
      Color: pair[0],
      ColorMode: "gradient",
      GradientStart: pair[0],
      GradientEnd: pair[1],
      GradientAngle: 135,
      ImageOpacity: 100,
      ImageDarken: 35,
      IconText: "🏅",
      ShowNavLabel: true,
      Active: true
    };
  });
}

function appearanceGetHubAppearanceRows_(spreadsheet) {
  const cache = !spreadsheet && typeof CacheService !== "undefined" ? CacheService.getScriptCache() : null;
  if (cache) {
    try {
      const cached = cache.get("appearance-hub-settings-v1218c6");
      if (cached) return JSON.parse(cached);
    } catch (err) {}
  }

  const ss = spreadsheet || appearanceSpreadsheet_();
  const defaults = appearanceHubDefaultRows_().concat(appearanceLeagueDefaultRows_(ss));
  const byKey = {};
  defaults.forEach(function(row) {
    byKey[appearanceNormalizeId_(row.SettingKey)] = Object.assign({}, row);
  });

  const sheet = ss.getSheetByName(APPEARANCE_HUB_SETTINGS_SHEET);
  if (sheet) {
    appearanceReadObjects_(APPEARANCE_HUB_SETTINGS_SHEET, ss).forEach(function(row) {
      const key = appearanceNormalizeId_(row.SettingKey || appearanceHubSettingKey_(row.HubCategory, row.HubGroup));
      if (!key) return;
      byKey[key] = Object.assign({}, byKey[key] || {}, row, { SettingKey: row.SettingKey || key });
    });
  }

  const rows = Object.keys(byKey).map(function(key) {
    const row = byKey[key];
    if (!appearanceString_(row.ImageUrl) && appearanceString_(row.ImageFileId)) {
      row.ImageUrl = appearanceDriveThumbnailUrl_(row.ImageFileId);
    }
    if (!appearanceString_(row.IconUrl) && appearanceString_(row.IconFileId)) {
      row.IconUrl = appearanceDriveThumbnailUrl_(row.IconFileId);
    }
    row.Color = appearanceString_(row.Color || "#354785") || "#354785";
    row.ColorMode = appearanceString_(row.ColorMode || "solid").toLowerCase() === "gradient" ? "gradient" : "solid";
    row.GradientStart = appearanceString_(row.GradientStart || row.Color || "#354785") || "#354785";
    row.GradientEnd = appearanceString_(row.GradientEnd || row.Color || "#20284a") || "#20284a";
    const angle = Number(row.GradientAngle);
    row.GradientAngle = isFinite(angle) ? Math.max(0, Math.min(360, angle)) : 135;
    const imageOpacity = Number(row.ImageOpacity);
    const imageDarken = Number(row.ImageDarken);
    row.ImageOpacity = isFinite(imageOpacity) ? Math.max(0, Math.min(100, imageOpacity)) : 100;
    row.ImageDarken = isFinite(imageDarken) ? Math.max(0, Math.min(100, imageDarken)) : 35;
    const panelTint = Number(row.PanelTint);
    row.PanelTint = isFinite(panelTint) ? Math.max(0, Math.min(70, panelTint)) : 18;
    row.ShowNavLabel = appearanceBool_(row.ShowNavLabel, true);
    row.Active = appearanceBool_(row.Active, true);
    return row;
  });

  if (cache) {
    try { cache.put("appearance-hub-settings-v1218c6", JSON.stringify(rows), 300); } catch (err) {}
  }
  return rows;
}

function appearanceString_(value) {
  return value == null ? "" : String(value).trim();
}

function appearanceNormalizeId_(value) {
  return appearanceString_(value).toLowerCase();
}

function appearanceBool_(value, defaultValue) {
  if (value === true || value === false) return value;
  const normalized = appearanceString_(value).toLowerCase();
  if (["true", "1", "yes", "y", "on"].indexOf(normalized) !== -1) return true;
  if (["false", "0", "no", "n", "off"].indexOf(normalized) !== -1) return false;
  return defaultValue === true;
}

function appearanceJsonObject_(value) {
  if (!value) return {};
  if (Object.prototype.toString.call(value) === "[object Object]") {
    return value;
  }
  try {
    const parsed = JSON.parse(String(value));
    return parsed && Object.prototype.toString.call(parsed) === "[object Object]"
      ? parsed
      : {};
  } catch (err) {
    return {};
  }
}

function appearanceJsonString_(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    const parsed = appearanceJsonObject_(value);
    return JSON.stringify(parsed);
  }
  return JSON.stringify(appearanceJsonObject_(value));
}

function appearanceMergeObjects_(base, overlay) {
  const output = {};
  const left = appearanceJsonObject_(base);
  const right = appearanceJsonObject_(overlay);

  Object.keys(left).forEach(function(key) {
    const value = left[key];
    if (value && Object.prototype.toString.call(value) === "[object Object]") {
      output[key] = appearanceMergeObjects_(value, {});
    } else {
      output[key] = value;
    }
  });

  Object.keys(right).forEach(function(key) {
    const value = right[key];
    if (
      value &&
      Object.prototype.toString.call(value) === "[object Object]" &&
      output[key] &&
      Object.prototype.toString.call(output[key]) === "[object Object]"
    ) {
      output[key] = appearanceMergeObjects_(output[key], value);
    } else if (value && Object.prototype.toString.call(value) === "[object Object]") {
      output[key] = appearanceMergeObjects_({}, value);
    } else {
      output[key] = value;
    }
  });

  return output;
}

function appearanceSafeGeneratedId_(prefix, value) {
  const clean = appearanceString_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
  return appearanceString_(prefix || "appearance") + "-" + (clean || String(Date.now()));
}

function appearanceUniqueGeneratedId_(sheet, idColumn, prefix, value) {
  const base = appearanceSafeGeneratedId_(prefix, value);
  if (!sheet || !appearanceFindRow_(sheet, { [idColumn]: base })) return base;
  let suffix = 2;
  let candidate = base + "-" + suffix;
  while (appearanceFindRow_(sheet, { [idColumn]: candidate })) {
    suffix += 1;
    candidate = base + "-" + suffix;
  }
  return candidate;
}

function appearanceDriveThumbnailUrl_(fileId) {
  const id = appearanceString_(fileId);
  return id
    ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w640"
    : "";
}

function appearanceSheetRowsToObjects_(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(function(value) { return appearanceString_(value); });
  return values.slice(1).filter(function(row) {
    return row.some(function(value) { return appearanceString_(value) !== ""; });
  }).map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      if (header) obj[header] = row[index];
    });
    return obj;
  });
}

function appearanceEnsureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return appearanceString_(value); });

  const missing = headers.filter(function(header) {
    return existing.indexOf(header) === -1;
  });

  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function appearanceReadObjects_(sheetName, spreadsheet) {
  const ss = spreadsheet || appearanceSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  return appearanceSheetRowsToObjects_(
    sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues()
  );
}

function appearanceFindRow_(sheet, keyMap) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return appearanceString_(value); });
  const indexes = {};

  Object.keys(keyMap).forEach(function(key) {
    indexes[key] = headers.indexOf(key);
  });

  for (let r = 1; r < values.length; r++) {
    let matches = true;
    Object.keys(keyMap).forEach(function(key) {
      const index = indexes[key];
      if (index === -1 || appearanceNormalizeId_(values[r][index]) !== appearanceNormalizeId_(keyMap[key])) {
        matches = false;
      }
    });
    if (matches) {
      return { rowNumber: r + 1, headers: headers, row: values[r] };
    }
  }

  return null;
}

function appearanceUpsertObject_(sheet, keyMap, objectValue) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(value) { return appearanceString_(value); });
  const existing = appearanceFindRow_(sheet, keyMap);
  const current = existing ? existing.row.slice() : new Array(headers.length).fill("");

  headers.forEach(function(header, index) {
    if (Object.prototype.hasOwnProperty.call(objectValue, header)) {
      current[index] = objectValue[header];
    }
  });

  if (existing) {
    sheet.getRange(existing.rowNumber, 1, 1, headers.length).setValues([current]);
    return existing.rowNumber;
  }

  sheet.appendRow(current);
  return sheet.getLastRow();
}

function appearanceSetupSystem(payload) {
  payload = payload || {};
  const singleStep = appearanceBool_(payload.singleStep, false);
  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());

  if (!lock.tryLock(4000)) {
    return {
      success: false,
      setupComplete: false,
      message: "Appearance setup is already running. Try again in a moment."
    };
  }

  try {
    const ss = appearanceSpreadsheet_();
    const specs = [
      { name: APPEARANCE_IMAGE_PACKS_SHEET, headers: APPEARANCE_IMAGE_PACK_HEADERS },
      { name: APPEARANCE_IMAGE_ITEMS_SHEET, headers: APPEARANCE_IMAGE_ITEM_HEADERS },
      { name: APPEARANCE_THEME_PACKS_SHEET, headers: APPEARANCE_THEME_PACK_HEADERS },
      { name: APPEARANCE_GAME_ASSIGNMENTS_SHEET, headers: APPEARANCE_GAME_ASSIGNMENT_HEADERS },
      { name: APPEARANCE_OVERRIDES_SHEET, headers: APPEARANCE_OVERRIDE_HEADERS },
      { name: APPEARANCE_HUB_SETTINGS_SHEET, headers: APPEARANCE_HUB_SETTING_HEADERS }
    ];

    const missingBefore = specs.filter(function(spec) {
      return !ss.getSheetByName(spec.name);
    });

    if (singleStep && missingBefore.length) {
      const spec = missingBefore[0];
      appearanceEnsureSheet_(ss, spec.name, spec.headers);

      const remaining = specs.filter(function(item) {
        return !ss.getSheetByName(item.name);
      }).map(function(item) { return item.name; });

      if (remaining.length) {
        return {
          success: true,
          setupComplete: false,
          createdSheet: spec.name,
          remainingSheets: remaining,
          message: "Appearance setup created " + spec.name + "."
        };
      }
      // The last storage sheet was just created. Fall through and seed the
      // built-in image/theme packs in the same request before reporting ready.
    }

    specs.forEach(function(spec) {
      appearanceEnsureSheet_(ss, spec.name, spec.headers);
    });

    const imagePacks = ss.getSheetByName(APPEARANCE_IMAGE_PACKS_SHEET);
    const themes = ss.getSheetByName(APPEARANCE_THEME_PACKS_SHEET);
    const now = new Date();

    if (!appearanceFindRow_(imagePacks, { PackId: "sports-default" })) {
      appearanceUpsertObject_(imagePacks, { PackId: "sports-default" }, {
        PackId: "sports-default",
        PackName: "Sports Default Logos",
        ScopeType: "sports",
        ScopeValue: "",
        Description: "Uses the existing sports/provider image unless a pack item or override is assigned.",
        Active: true,
        IsDefault: false,
        CreatedAt: now,
        UpdatedAt: now
      });
    }

    if (!appearanceFindRow_(themes, { ThemePackId: "app-default" })) {
      appearanceUpsertObject_(themes, { ThemePackId: "app-default" }, {
        ThemePackId: "app-default",
        ThemeName: "App Default",
        Description: "Base Awards App appearance. Individual game types keep their current styling until a theme opts in.",
        BaseThemeId: "",
        ThemeJSON: "{}",
        Active: true,
        IsDefault: true,
        CreatedAt: now,
        UpdatedAt: now
      });
    }

    if (!appearanceFindRow_(themes, { ThemePackId: "confidence-pro" })) {
      appearanceUpsertObject_(themes, { ThemePackId: "confidence-pro" }, {
        ThemePackId: "confidence-pro",
        ThemeName: "Confidence Pro",
        Description: "Compact scoreboard-style Confidence game presentation.",
        BaseThemeId: "app-default",
        ThemeJSON: JSON.stringify({
          density: "compact",
          team: {
            cityScale: "small",
            nameScale: "large",
            imageVariant: "logo",
            selectedTreatment: "full-color",
            unselectedTreatment: "grayscale"
          },
          result: {
            correctTreatment: "green-outline",
            incorrectTreatment: "red-outline"
          },
          row: {
            corners: "soft",
            spacing: "tight"
          },
          colors: {
            accent: "#60a5fa",
            surface: "#0f172a",
            text: "#ffffff",
            muted: "#94a3b8",
            correct: "#22c55e",
            incorrect: "#ef4444",
            live: "#ef4444"
          }
        }),
        Active: true,
        IsDefault: false,
        CreatedAt: now,
        UpdatedAt: now
      });
    }

    return {
      success: true,
      setupComplete: true,
      message: "Appearance system ready.",
      sheets: specs.map(function(spec) { return spec.name; })
    };
  } finally {
    lock.releaseLock();
  }
}

function appearanceIsActiveRow_(row) {
  return appearanceBool_(row && row.Active, true);
}

function appearanceFindById_(rows, idField, idValue) {
  const wanted = appearanceNormalizeId_(idValue);
  return (rows || []).find(function(row) {
    return appearanceIsActiveRow_(row) && appearanceNormalizeId_(row[idField]) === wanted;
  }) || null;
}

function appearanceFindDefaultTheme_(themeRows) {
  return (themeRows || []).find(function(row) {
    return appearanceIsActiveRow_(row) && appearanceBool_(row.IsDefault, false);
  }) || null;
}

function appearanceResolveThemeFromRows_(input) {
  input = input || {};
  const themeRows = input.themePacks || [];
  const assignment = input.assignment || {};
  const entityOverride = input.entityOverride || null;
  const defaultTheme = appearanceFindDefaultTheme_(themeRows);
  const selectedThemeId = appearanceString_(assignment.ThemePackId) || appearanceString_(defaultTheme && defaultTheme.ThemePackId);
  const seen = {};

  function resolvePack_(themeId, depth) {
    if (!themeId || depth > 8 || seen[appearanceNormalizeId_(themeId)]) return {};
    seen[appearanceNormalizeId_(themeId)] = true;
    const row = appearanceFindById_(themeRows, "ThemePackId", themeId);
    if (!row) return {};
    const base = resolvePack_(appearanceString_(row.BaseThemeId), depth + 1);
    return appearanceMergeObjects_(base, appearanceJsonObject_(row.ThemeJSON));
  }

  let theme = {};
  if (defaultTheme) {
    theme = appearanceMergeObjects_(theme, resolvePack_(defaultTheme.ThemePackId, 0));
  }

  // Reset cycle tracking so an assigned theme that inherits the default can resolve normally.
  Object.keys(seen).forEach(function(key) { delete seen[key]; });
  if (selectedThemeId) {
    theme = appearanceMergeObjects_(theme, resolvePack_(selectedThemeId, 0));
  }

  theme = appearanceMergeObjects_(theme, appearanceJsonObject_(assignment.ThemeOverrideJSON));
  if (entityOverride && appearanceIsActiveRow_(entityOverride)) {
    theme = appearanceMergeObjects_(theme, appearanceJsonObject_(entityOverride.ThemeOverrideJSON));
  }

  return {
    themePackId: selectedThemeId || "",
    theme: theme
  };
}

function appearanceFindImagePackItem_(items, packId, entityType, entityId, variant) {
  const wantedPack = appearanceNormalizeId_(packId);
  const wantedType = appearanceNormalizeId_(entityType);
  const wantedId = appearanceNormalizeId_(entityId);
  const wantedVariant = appearanceNormalizeId_(variant || "default");
  let generic = null;

  (items || []).forEach(function(row) {
    if (!appearanceIsActiveRow_(row)) return;
    if (appearanceNormalizeId_(row.PackId) !== wantedPack) return;
    if (appearanceNormalizeId_(row.EntityType) !== wantedType) return;
    if (appearanceNormalizeId_(row.EntityId) !== wantedId) return;
    const rowVariant = appearanceNormalizeId_(row.Variant || "default");
    if (rowVariant === wantedVariant) generic = row;
    else if (!generic && (rowVariant === "default" || rowVariant === "")) generic = row;
  });

  return generic;
}

function appearanceResolveImageFromRows_(input) {
  input = input || {};
  const assignment = input.assignment || {};
  const entityType = appearanceString_(input.entityType);
  const entityId = appearanceString_(input.entityId);
  const variant = appearanceString_(input.variant || "default");
  const defaultImageUrl = appearanceString_(input.defaultImageUrl);
  const override = input.entityOverride || null;

  if (override && appearanceIsActiveRow_(override)) {
    const overrideUrl = appearanceString_(override.ImageUrl) || appearanceDriveThumbnailUrl_(override.ImageFileId);
    if (overrideUrl) {
      return {
        imageUrl: overrideUrl,
        source: "override",
        imagePackId: appearanceString_(assignment.ImagePackId),
        entityType: entityType,
        entityId: entityId,
        variant: variant
      };
    }
  }

  const imagePackId = appearanceString_(assignment.ImagePackId);
  if (imagePackId && appearanceNormalizeId_(assignment.ImageMode || "pack") !== "default") {
    const packItem = appearanceFindImagePackItem_(
      input.imagePackItems || [],
      imagePackId,
      entityType,
      entityId,
      variant
    );
    if (packItem) {
      const packUrl = appearanceString_(packItem.ImageUrl) || appearanceDriveThumbnailUrl_(packItem.ImageFileId);
      if (packUrl) {
        return {
          imageUrl: packUrl,
          source: "image-pack",
          imagePackId: imagePackId,
          entityType: entityType,
          entityId: entityId,
          variant: appearanceString_(packItem.Variant || variant)
        };
      }
    }
  }

  return {
    imageUrl: defaultImageUrl,
    source: defaultImageUrl ? "default" : "fallback",
    imagePackId: imagePackId,
    entityType: entityType,
    entityId: entityId,
    variant: variant
  };
}

function appearanceGetGameAssignmentFromRows_(gameId, rows) {
  const wanted = appearanceNormalizeId_(gameId);
  return (rows || []).find(function(row) {
    return appearanceIsActiveRow_(row) && appearanceNormalizeId_(row.GameId) === wanted;
  }) || {};
}

function appearanceGetEntityOverrideFromRows_(gameId, entityType, entityId, rows) {
  const wantedGame = appearanceNormalizeId_(gameId);
  const wantedType = appearanceNormalizeId_(entityType);
  const wantedId = appearanceNormalizeId_(entityId);
  return (rows || []).find(function(row) {
    return appearanceIsActiveRow_(row) &&
      appearanceNormalizeId_(row.GameId) === wantedGame &&
      appearanceNormalizeId_(row.EntityType) === wantedType &&
      appearanceNormalizeId_(row.EntityId) === wantedId;
  }) || null;
}

function appearanceGetRuntimeBundle(gameId) {
  const normalizedGameId = appearanceString_(gameId);
  const ss = appearanceSpreadsheet_();
  const imagePacks = appearanceReadObjects_(APPEARANCE_IMAGE_PACKS_SHEET, ss);
  const imagePackItems = appearanceReadObjects_(APPEARANCE_IMAGE_ITEMS_SHEET, ss);
  const themePacks = appearanceReadObjects_(APPEARANCE_THEME_PACKS_SHEET, ss);
  const assignments = appearanceReadObjects_(APPEARANCE_GAME_ASSIGNMENTS_SHEET, ss);
  const overrides = appearanceReadObjects_(APPEARANCE_OVERRIDES_SHEET, ss);
  const assignment = appearanceGetGameAssignmentFromRows_(normalizedGameId, assignments);
  const themeResult = appearanceResolveThemeFromRows_({
    themePacks: themePacks,
    assignment: assignment
  });
  const assignedPackId = appearanceString_(assignment.ImagePackId);

  return {
    success: true,
    gameId: normalizedGameId,
    assignment: assignment,
    themePackId: themeResult.themePackId,
    theme: themeResult.theme,
    imagePackId: assignedPackId,
    imagePackItems: imagePackItems.filter(function(row) {
      return appearanceIsActiveRow_(row) && appearanceNormalizeId_(row.PackId) === appearanceNormalizeId_(assignedPackId);
    }),
    overrides: overrides.filter(function(row) {
      return appearanceIsActiveRow_(row) && appearanceNormalizeId_(row.GameId) === appearanceNormalizeId_(normalizedGameId);
    })
  };
}

function appearanceResolveImage(gameId, entityType, entityId, defaultImageUrl, variant) {
  const bundle = appearanceGetRuntimeBundle(gameId);
  const entityOverride = appearanceGetEntityOverrideFromRows_(
    gameId,
    entityType,
    entityId,
    bundle.overrides
  );
  return appearanceResolveImageFromRows_({
    assignment: bundle.assignment,
    imagePackItems: bundle.imagePackItems,
    entityOverride: entityOverride,
    entityType: entityType,
    entityId: entityId,
    variant: variant,
    defaultImageUrl: defaultImageUrl
  });
}

function appearanceResolveTheme(gameId, entityType, entityId) {
  const bundle = appearanceGetRuntimeBundle(gameId);
  const entityOverride = entityType && entityId
    ? appearanceGetEntityOverrideFromRows_(gameId, entityType, entityId, bundle.overrides)
    : null;
  const themePacks = appearanceReadObjects_(APPEARANCE_THEME_PACKS_SHEET);
  return appearanceResolveThemeFromRows_({
    themePacks: themePacks,
    assignment: bundle.assignment,
    entityOverride: entityOverride
  });
}

function adminGetAppearanceDashboard(payload) {
  payload = payload || {};
  const ss = appearanceSpreadsheet_();
  const requiredSheets = [
    APPEARANCE_IMAGE_PACKS_SHEET,
    APPEARANCE_IMAGE_ITEMS_SHEET,
    APPEARANCE_THEME_PACKS_SHEET,
    APPEARANCE_GAME_ASSIGNMENTS_SHEET,
    APPEARANCE_OVERRIDES_SHEET,
    APPEARANCE_HUB_SETTINGS_SHEET
  ];
  const sheetsComplete = requiredSheets.every(function(name) { return !!ss.getSheetByName(name); });
  const gameId = appearanceString_(payload.gameId);

  if (!sheetsComplete) {
    return {
      success: true,
      setupComplete: false,
      imagePacks: [],
      imagePackItems: [],
      themePacks: [],
      gameAppearance: {},
      overrides: [],
      hubAppearance: appearanceGetHubAppearanceRows_(ss)
    };
  }

  const imagePacks = appearanceReadObjects_(APPEARANCE_IMAGE_PACKS_SHEET, ss);
  const imagePackItems = appearanceReadObjects_(APPEARANCE_IMAGE_ITEMS_SHEET, ss);
  const themePacks = appearanceReadObjects_(APPEARANCE_THEME_PACKS_SHEET, ss);
  const assignments = appearanceReadObjects_(APPEARANCE_GAME_ASSIGNMENTS_SHEET, ss);
  const overrides = appearanceReadObjects_(APPEARANCE_OVERRIDES_SHEET, ss);
  const seedComplete = !!appearanceFindById_(imagePacks, "PackId", "sports-default") &&
    !!appearanceFindById_(themePacks, "ThemePackId", "app-default") &&
    !!appearanceFindById_(themePacks, "ThemePackId", "confidence-pro");

  return {
    success: true,
    setupComplete: seedComplete,
    imagePacks: imagePacks,
    imagePackItems: imagePackItems,
    themePacks: themePacks,
    gameAppearance: gameId ? appearanceGetGameAssignmentFromRows_(gameId, assignments) : {},
    hubAppearance: appearanceGetHubAppearanceRows_(ss),
    overrides: gameId ? overrides.filter(function(row) {
      return appearanceNormalizeId_(row.GameId) === appearanceNormalizeId_(gameId);
    }) : overrides
  };
}

function adminSaveAppearanceImagePack(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const sheet = appearanceSpreadsheet_().getSheetByName(APPEARANCE_IMAGE_PACKS_SHEET);
  const packName = appearanceString_(payload.packName || payload.PackName);
  const packId = appearanceString_(payload.packId || payload.PackId) || appearanceUniqueGeneratedId_(sheet, "PackId", "img", packName);
  if (!packName) throw new Error("Image pack name is required.");
  const existing = appearanceFindRow_(sheet, { PackId: packId });
  const now = new Date();

  appearanceUpsertObject_(sheet, { PackId: packId }, {
    PackId: packId,
    PackName: packName,
    ScopeType: appearanceString_(payload.scopeType || payload.ScopeType || "all"),
    ScopeValue: appearanceString_(payload.scopeValue || payload.ScopeValue),
    Description: appearanceString_(payload.description || payload.Description),
    Active: appearanceBool_(payload.active != null ? payload.active : payload.Active, true),
    IsDefault: appearanceBool_(payload.isDefault != null ? payload.isDefault : payload.IsDefault, false),
    CreatedAt: existing ? existing.row[existing.headers.indexOf("CreatedAt")] || now : now,
    UpdatedAt: now
  });

  SpreadsheetApp.flush();
  const savedPack = appearanceFindById_(appearanceReadObjects_(APPEARANCE_IMAGE_PACKS_SHEET, appearanceSpreadsheet_()), "PackId", packId) || {
    PackId: packId,
    PackName: packName,
    Active: true,
    IsDefault: false
  };
  return { success: true, packId: packId, pack: savedPack };
}

function adminDuplicateAppearanceImagePack(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const ss = appearanceSpreadsheet_();
  const packSheet = ss.getSheetByName(APPEARANCE_IMAGE_PACKS_SHEET);
  const itemSheet = ss.getSheetByName(APPEARANCE_IMAGE_ITEMS_SHEET);
  const sourcePackId = appearanceString_(payload.sourcePackId || payload.SourcePackId || payload.packId || payload.PackId);
  const newName = appearanceString_(payload.newPackName || payload.NewPackName || payload.packName || payload.PackName);
  if (!sourcePackId) throw new Error("Source Image Pack is required.");
  if (!newName) throw new Error("New Image Pack name is required.");

  const packs = appearanceReadObjects_(APPEARANCE_IMAGE_PACKS_SHEET, ss);
  const source = appearanceFindById_(packs, "PackId", sourcePackId);
  if (!source) throw new Error("Source Image Pack was not found.");

  const newPackId = appearanceUniqueGeneratedId_(packSheet, "PackId", "img", newName);
  const now = new Date();
  appearanceUpsertObject_(packSheet, { PackId: newPackId }, {
    PackId: newPackId,
    PackName: newName,
    ScopeType: appearanceString_(payload.scopeType || payload.ScopeType || source.ScopeType || "all"),
    ScopeValue: appearanceString_(payload.scopeValue || payload.ScopeValue || source.ScopeValue),
    Description: appearanceString_(payload.description || payload.Description || source.Description),
    Active: true,
    IsDefault: false,
    CreatedAt: now,
    UpdatedAt: now
  });

  const items = appearanceReadObjects_(APPEARANCE_IMAGE_ITEMS_SHEET, ss).filter(function(row) {
    return appearanceNormalizeId_(row.PackId) === appearanceNormalizeId_(sourcePackId) && appearanceBool_(row.Active, true);
  });
  items.forEach(function(row) {
    appearanceUpsertObject_(itemSheet, {
      PackId: newPackId,
      EntityType: appearanceString_(row.EntityType),
      EntityId: appearanceString_(row.EntityId),
      Variant: appearanceString_(row.Variant || "default")
    }, {
      PackId: newPackId,
      EntityType: appearanceString_(row.EntityType),
      EntityId: appearanceString_(row.EntityId),
      EntityName: appearanceString_(row.EntityName),
      Variant: appearanceString_(row.Variant || "default"),
      ImageUrl: appearanceString_(row.ImageUrl),
      ImageFileId: appearanceString_(row.ImageFileId),
      SourceType: appearanceString_(row.SourceType),
      SourceUrl: appearanceString_(row.SourceUrl),
      AltText: appearanceString_(row.AltText),
      Active: true,
      UpdatedAt: now
    });
  });

  SpreadsheetApp.flush();
  const savedPack = appearanceFindById_(appearanceReadObjects_(APPEARANCE_IMAGE_PACKS_SHEET, ss), "PackId", newPackId) || {
    PackId: newPackId,
    PackName: newName,
    Active: true,
    IsDefault: false
  };
  return { success: true, packId: newPackId, copiedItems: items.length, sourcePackId: sourcePackId, pack: savedPack };
}

function adminSaveAppearanceImagePackItem(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const sheet = appearanceSpreadsheet_().getSheetByName(APPEARANCE_IMAGE_ITEMS_SHEET);
  const packId = appearanceString_(payload.packId || payload.PackId);
  const entityType = appearanceString_(payload.entityType || payload.EntityType);
  const entityId = appearanceString_(payload.entityId || payload.EntityId);
  const variant = appearanceString_(payload.variant || payload.Variant || "default");
  if (!packId || !entityType || !entityId) {
    throw new Error("PackId, EntityType and EntityId are required.");
  }

  appearanceUpsertObject_(sheet, {
    PackId: packId,
    EntityType: entityType,
    EntityId: entityId,
    Variant: variant
  }, {
    PackId: packId,
    EntityType: entityType,
    EntityId: entityId,
    EntityName: appearanceString_(payload.entityName || payload.EntityName),
    Variant: variant,
    ImageUrl: appearanceString_(payload.imageUrl || payload.ImageUrl),
    ImageFileId: appearanceString_(payload.imageFileId || payload.ImageFileId),
    SourceType: appearanceString_(payload.sourceType || payload.SourceType),
    SourceUrl: appearanceString_(payload.sourceUrl || payload.SourceUrl),
    AltText: appearanceString_(payload.altText || payload.AltText),
    Active: appearanceBool_(payload.active != null ? payload.active : payload.Active, true),
    UpdatedAt: new Date()
  });

  return { success: true, packId: packId, entityType: entityType, entityId: entityId, variant: variant };
}

function adminSaveAppearanceHubSetting(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const ss = appearanceSpreadsheet_();
  const sheet = ss.getSheetByName(APPEARANCE_HUB_SETTINGS_SHEET);
  const category = appearanceString_(payload.hubCategory || payload.HubCategory || "general").toLowerCase();
  const group = appearanceString_(payload.hubGroup || payload.HubGroup);
  const settingKey = appearanceString_(payload.settingKey || payload.SettingKey) || appearanceHubSettingKey_(category, group);
  if (!settingKey) throw new Error("Hub appearance setting key is required.");

  appearanceUpsertObject_(sheet, { SettingKey: settingKey }, {
    SettingKey: settingKey,
    HubCategory: category,
    HubGroup: group,
    DisplayName: appearanceString_(payload.displayName || payload.DisplayName),
    Color: appearanceString_(payload.color || payload.Color || "#354785"),
    ColorMode: appearanceString_(payload.colorMode || payload.ColorMode || "solid").toLowerCase() === "gradient" ? "gradient" : "solid",
    GradientStart: appearanceString_(payload.gradientStart || payload.GradientStart || payload.color || payload.Color || "#354785"),
    GradientEnd: appearanceString_(payload.gradientEnd || payload.GradientEnd || payload.color || payload.Color || "#20284a"),
    GradientAngle: Math.max(0, Math.min(360, Number(payload.gradientAngle != null ? payload.gradientAngle : payload.GradientAngle) || 135)),
    ImageUrl: appearanceString_(payload.imageUrl || payload.ImageUrl),
    ImageFileId: appearanceString_(payload.imageFileId || payload.ImageFileId),
    ImageSourceType: appearanceString_(payload.imageSourceType || payload.ImageSourceType),
    ImageSourceUrl: appearanceString_(payload.imageSourceUrl || payload.ImageSourceUrl),
    ImageOpacity: Math.max(0, Math.min(100, Number(payload.imageOpacity != null ? payload.imageOpacity : (payload.ImageOpacity != null ? payload.ImageOpacity : 100)))),
    ImageDarken: Math.max(0, Math.min(100, Number(payload.imageDarken != null ? payload.imageDarken : (payload.ImageDarken != null ? payload.ImageDarken : 35)))),
    PanelTint: Math.max(0, Math.min(70, Number(payload.panelTint != null ? payload.panelTint : (payload.PanelTint != null ? payload.PanelTint : 18)))),
    IconText: appearanceString_(payload.iconText || payload.IconText),
    IconUrl: appearanceString_(payload.iconUrl || payload.IconUrl),
    IconFileId: appearanceString_(payload.iconFileId || payload.IconFileId),
    IconSourceType: appearanceString_(payload.iconSourceType || payload.IconSourceType),
    IconSourceUrl: appearanceString_(payload.iconSourceUrl || payload.IconSourceUrl),
    ShowNavLabel: appearanceBool_(payload.showNavLabel != null ? payload.showNavLabel : payload.ShowNavLabel, true),
    Active: appearanceBool_(payload.active != null ? payload.active : payload.Active, true),
    UpdatedAt: new Date()
  });
  SpreadsheetApp.flush();
  try {
    const cache = CacheService.getScriptCache();
    cache.remove("appearance-hub-settings-v1218c2");
    cache.remove("appearance-hub-settings-v1218c4");
    cache.remove("appearance-hub-settings-v1218c6");
  } catch (err) {}
  const saved = appearanceGetHubAppearanceRows_(ss).find(function(row) {
    return appearanceNormalizeId_(row.SettingKey) === appearanceNormalizeId_(settingKey);
  }) || {};
  return { success: true, settingKey: settingKey, setting: saved };
}

function adminSaveAppearanceThemePack(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const sheet = appearanceSpreadsheet_().getSheetByName(APPEARANCE_THEME_PACKS_SHEET);
  const themeName = appearanceString_(payload.themeName || payload.ThemeName);
  const themePackId = appearanceString_(payload.themePackId || payload.ThemePackId) || appearanceUniqueGeneratedId_(sheet, "ThemePackId", "theme", themeName);
  if (!themeName) throw new Error("Theme pack name is required.");
  const existing = appearanceFindRow_(sheet, { ThemePackId: themePackId });
  const now = new Date();

  appearanceUpsertObject_(sheet, { ThemePackId: themePackId }, {
    ThemePackId: themePackId,
    ThemeName: themeName,
    Description: appearanceString_(payload.description || payload.Description),
    BaseThemeId: appearanceString_(payload.baseThemeId || payload.BaseThemeId),
    ThemeJSON: appearanceJsonString_(payload.theme || payload.themeJSON || payload.ThemeJSON),
    Active: appearanceBool_(payload.active != null ? payload.active : payload.Active, true),
    IsDefault: appearanceBool_(payload.isDefault != null ? payload.isDefault : payload.IsDefault, false),
    CreatedAt: existing ? existing.row[existing.headers.indexOf("CreatedAt")] || now : now,
    UpdatedAt: now
  });

  return { success: true, themePackId: themePackId };
}

function adminSaveGameAppearance(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const sheet = appearanceSpreadsheet_().getSheetByName(APPEARANCE_GAME_ASSIGNMENTS_SHEET);
  const gameId = appearanceString_(payload.gameId || payload.GameId);
  if (!gameId) throw new Error("GameId is required.");

  appearanceUpsertObject_(sheet, { GameId: gameId }, {
    GameId: gameId,
    ImagePackId: appearanceString_(payload.imagePackId || payload.ImagePackId),
    ThemePackId: appearanceString_(payload.themePackId || payload.ThemePackId),
    ImageMode: appearanceString_(payload.imageMode || payload.ImageMode || "pack"),
    ThemeMode: appearanceString_(payload.themeMode || payload.ThemeMode || "pack"),
    ThemeOverrideJSON: appearanceJsonString_(payload.themeOverride || payload.themeOverrideJSON || payload.ThemeOverrideJSON),
    Active: appearanceBool_(payload.active != null ? payload.active : payload.Active, true),
    UpdatedAt: new Date()
  });

  return { success: true, gameId: gameId };
}

function adminSaveAppearanceOverride(payload) {
  payload = payload || {};
  appearanceSetupSystem();
  const sheet = appearanceSpreadsheet_().getSheetByName(APPEARANCE_OVERRIDES_SHEET);
  const gameId = appearanceString_(payload.gameId || payload.GameId);
  const entityType = appearanceString_(payload.entityType || payload.EntityType);
  const entityId = appearanceString_(payload.entityId || payload.EntityId);
  if (!gameId || !entityType || !entityId) {
    throw new Error("GameId, EntityType and EntityId are required.");
  }

  appearanceUpsertObject_(sheet, { GameId: gameId, EntityType: entityType, EntityId: entityId }, {
    GameId: gameId,
    EntityType: entityType,
    EntityId: entityId,
    ImageUrl: appearanceString_(payload.imageUrl || payload.ImageUrl),
    ImageFileId: appearanceString_(payload.imageFileId || payload.ImageFileId),
    SourceType: appearanceString_(payload.sourceType || payload.SourceType),
    SourceUrl: appearanceString_(payload.sourceUrl || payload.SourceUrl),
    ThemeOverrideJSON: appearanceJsonString_(payload.themeOverride || payload.themeOverrideJSON || payload.ThemeOverrideJSON),
    Active: appearanceBool_(payload.active != null ? payload.active : payload.Active, true),
    UpdatedAt: new Date()
  });

  return { success: true, gameId: gameId, entityType: entityType, entityId: entityId };
}

function apiAdminSetupAppearanceSystem(payload) {
  return appearanceSetupSystem(payload);
}

function apiAdminGetAppearanceDashboard(payload) {
  return adminGetAppearanceDashboard(payload);
}

function apiAdminSaveAppearanceImagePack(payload) {
  return adminSaveAppearanceImagePack(payload);
}

function apiAdminSaveAppearanceImagePackItem(payload) {
  return adminSaveAppearanceImagePackItem(payload);
}

function apiAdminDuplicateAppearanceImagePack(payload) {
  return adminDuplicateAppearanceImagePack(payload);
}

function apiAdminSaveAppearanceHubSetting(payload) {
  return adminSaveAppearanceHubSetting(payload);
}

function apiAdminSaveAppearanceThemePack(payload) {
  return adminSaveAppearanceThemePack(payload);
}

function apiAdminSaveGameAppearance(payload) {
  return adminSaveGameAppearance(payload);
}

function apiAdminSaveAppearanceOverride(payload) {
  return adminSaveAppearanceOverride(payload);
}

function apiGetGameAppearance(payload) {
  payload = payload || {};
  return appearanceGetRuntimeBundle(payload.gameId || "");
}
