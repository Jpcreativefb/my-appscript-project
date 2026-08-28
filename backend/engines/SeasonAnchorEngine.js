/* =========================
   SEASON ANCHOR ENGINE
   Phase 2C v1.0.31

   Optional season-long survivor selection for Reality TV now, with a
   normalized provider-neutral model ready for Sports adapters later.
========================= */

const SEASON_ANCHOR_SETTINGS_SHEET = "SeasonAnchorSettings";
const SEASON_ANCHOR_USERS_SHEET = "UserSeasonAnchors";
const SEASON_ANCHOR_HISTORY_SHEET = "SeasonAnchorHistory";

const SEASON_ANCHOR_SETTINGS_HEADERS = [
  "GameId", "SeasonId", "Enabled", "DisplayLabel", "EntityType",
  "SurvivalMode", "StartMultiplier", "GrowthPerSuccess", "MaxMultiplier",
  "EligiblePointsCap", "LossPenalty", "NoResultBehavior",
  "WithdrawalBehavior", "ManualSwitchAllowed", "SourceType",
  "CreatedAt", "UpdatedAt"
];

const SEASON_ANCHOR_USER_HEADERS = [
  "GameId", "SeasonId", "Username", "CurrentEntityId", "CurrentEntityName",
  "SelectedEpisodeId", "SelectedEpisodeNumber", "Streak", "CurrentMultiplier",
  "Status", "PickedAt", "LastSettledEpisodeId", "LastSettledEpisodeNumber",
  "Active", "CreatedAt", "UpdatedAt"
];

const SEASON_ANCHOR_HISTORY_HEADERS = [
  "HistoryId", "GameId", "SeasonId", "Username", "EpisodeId", "EpisodeNumber",
  "EntityId", "EntityName", "Outcome", "StreakBefore", "StreakAfter",
  "MultiplierApplied", "EligiblePointsCapApplied", "EligiblePoints", "BonusPoints", "PenaltyPoints",
  "NetAdjustment", "ResultSource", "SettledAt", "Notes", "CreatedAt", "UpdatedAt"
];

function seasonAnchorString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function seasonAnchorKey_(value) {
  return seasonAnchorString_(value).toLowerCase();
}

function seasonAnchorBool_(value) {
  return value === true || ["true", "1", "yes", "on"].indexOf(seasonAnchorKey_(value)) !== -1;
}

function seasonAnchorNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function seasonAnchorRound_(value) {
  return Math.round((seasonAnchorNumber_(value, 0) + Number.EPSILON) * 100) / 100;
}

function seasonAnchorGetOrCreateSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  const lastColumn = sheet.getLastColumn();
  const existing = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(seasonAnchorString_)
    : [];
  if (!existing.length || existing.every(function(value) { return !value; })) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });
    if (missing.length) sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).setFontWeight("bold");
  return sheet;
}

function seasonAnchorEnsureSystem_() {
  const ss = SpreadsheetApp.getActive();
  seasonAnchorGetOrCreateSheet_(ss, SEASON_ANCHOR_SETTINGS_SHEET, SEASON_ANCHOR_SETTINGS_HEADERS);
  seasonAnchorGetOrCreateSheet_(ss, SEASON_ANCHOR_USERS_SHEET, SEASON_ANCHOR_USER_HEADERS);
  seasonAnchorGetOrCreateSheet_(ss, SEASON_ANCHOR_HISTORY_SHEET, SEASON_ANCHOR_HISTORY_HEADERS);
  return { success: true };
}

function seasonAnchorReadObjects_(sheetName, skipEnsure) {
  if (!skipEnsure) seasonAnchorEnsureSystem_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(seasonAnchorString_);
  return values.slice(1).map(function(row, index) {
    const item = { __rowNumber: index + 2 };
    headers.forEach(function(header, column) { item[header] = row[column]; });
    return item;
  }).filter(function(item) {
    return headers.some(function(header) { return seasonAnchorString_(item[header]) !== ""; });
  });
}

function seasonAnchorHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(seasonAnchorString_);
  const map = {};
  headers.forEach(function(header, index) { map[header] = index; });
  return { headers: headers, map: map };
}

function seasonAnchorAppendObject_(sheet, payload) {
  const schema = seasonAnchorHeaderMap_(sheet);
  sheet.appendRow(schema.headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(payload, header) ? payload[header] : "";
  }));
  return sheet.getLastRow();
}

function seasonAnchorUpdateObjectRow_(sheet, rowNumber, patch) {
  const schema = seasonAnchorHeaderMap_(sheet);
  const range = sheet.getRange(rowNumber, 1, 1, schema.headers.length);
  const row = range.getValues()[0];
  Object.keys(patch || {}).forEach(function(header) {
    if (schema.map[header] !== undefined) row[schema.map[header]] = patch[header];
  });
  range.setValues([row]);
}

function seasonAnchorUpsert_(sheetName, headers, keyFields, payload) {
  const sheet = seasonAnchorGetOrCreateSheet_(SpreadsheetApp.getActive(), sheetName, headers);
  const found = seasonAnchorReadObjects_(sheetName).find(function(row) {
    return keyFields.every(function(field) {
      return seasonAnchorKey_(row[field]) === seasonAnchorKey_(payload[field]);
    });
  });
  if (found) {
    seasonAnchorUpdateObjectRow_(sheet, found.__rowNumber, payload);
    return found.__rowNumber;
  }
  return seasonAnchorAppendObject_(sheet, payload);
}

function seasonAnchorDefaultSettings_(gameId, seasonId) {
  return {
    GameId: seasonAnchorString_(gameId),
    SeasonId: seasonAnchorString_(seasonId || gameId),
    Enabled: false,
    DisplayLabel: "Season Survivor Pick",
    EntityType: "contestant",
    SurvivalMode: "active",
    StartMultiplier: 1,
    GrowthPerSuccess: 0.05,
    MaxMultiplier: 1.4,
    EligiblePointsCap: 20,
    LossPenalty: 5,
    NoResultBehavior: "preserve",
    WithdrawalBehavior: "penalty",
    ManualSwitchAllowed: false,
    SourceType: "reality-tv",
    CreatedAt: "",
    UpdatedAt: ""
  };
}

function seasonAnchorNormalizeSettings_(payload, existing) {
  const gameId = seasonAnchorString_(payload.gameId || payload.GameId || (existing && existing.GameId));
  const seasonId = seasonAnchorString_(payload.seasonId || payload.SeasonId || (existing && existing.SeasonId) || gameId);
  const defaults = seasonAnchorDefaultSettings_(gameId, seasonId);
  const source = existing || {};
  const start = Math.max(1, Math.min(3, seasonAnchorNumber_(payload.startMultiplier !== undefined ? payload.startMultiplier : source.StartMultiplier, defaults.StartMultiplier)));
  const growth = Math.max(0, Math.min(1, seasonAnchorNumber_(payload.growthPerSuccess !== undefined ? payload.growthPerSuccess : source.GrowthPerSuccess, defaults.GrowthPerSuccess)));
  const cap = Math.max(start, Math.min(5, seasonAnchorNumber_(payload.maxMultiplier !== undefined ? payload.maxMultiplier : source.MaxMultiplier, defaults.MaxMultiplier)));
  return {
    GameId: gameId,
    SeasonId: seasonId,
    Enabled: payload.enabled !== undefined ? seasonAnchorBool_(payload.enabled) : seasonAnchorBool_(source.Enabled),
    DisplayLabel: seasonAnchorString_(payload.displayLabel !== undefined ? payload.displayLabel : source.DisplayLabel) || defaults.DisplayLabel,
    EntityType: seasonAnchorKey_(payload.entityType !== undefined ? payload.entityType : source.EntityType) || defaults.EntityType,
    SurvivalMode: seasonAnchorKey_(payload.survivalMode !== undefined ? payload.survivalMode : source.SurvivalMode) || defaults.SurvivalMode,
    StartMultiplier: seasonAnchorRound_(start),
    GrowthPerSuccess: seasonAnchorRound_(growth),
    MaxMultiplier: seasonAnchorRound_(cap),
    EligiblePointsCap: Math.max(0, Math.min(1000, seasonAnchorNumber_(payload.eligiblePointsCap !== undefined ? payload.eligiblePointsCap : source.EligiblePointsCap, defaults.EligiblePointsCap))),
    LossPenalty: Math.max(0, Math.min(1000, seasonAnchorNumber_(payload.lossPenalty !== undefined ? payload.lossPenalty : source.LossPenalty, defaults.LossPenalty))),
    NoResultBehavior: seasonAnchorKey_(payload.noResultBehavior !== undefined ? payload.noResultBehavior : source.NoResultBehavior) || defaults.NoResultBehavior,
    WithdrawalBehavior: seasonAnchorKey_(payload.withdrawalBehavior !== undefined ? payload.withdrawalBehavior : source.WithdrawalBehavior) || defaults.WithdrawalBehavior,
    ManualSwitchAllowed: payload.manualSwitchAllowed !== undefined ? seasonAnchorBool_(payload.manualSwitchAllowed) : (source.ManualSwitchAllowed === "" || source.ManualSwitchAllowed === undefined ? defaults.ManualSwitchAllowed : seasonAnchorBool_(source.ManualSwitchAllowed)),
    SourceType: seasonAnchorKey_(payload.sourceType !== undefined ? payload.sourceType : source.SourceType) || defaults.SourceType,
    CreatedAt: source.CreatedAt || new Date(),
    UpdatedAt: new Date()
  };
}

function seasonAnchorGetSettings_(gameId) {
  const normalizedGameId = seasonAnchorKey_(gameId);
  const row = seasonAnchorReadObjects_(SEASON_ANCHOR_SETTINGS_SHEET, true).find(function(item) {
    return seasonAnchorKey_(item.GameId) === normalizedGameId;
  });
  if (!row) return null;
  return seasonAnchorNormalizeSettings_({}, row);
}

function seasonAnchorSaveSettings_(payload) {
  seasonAnchorEnsureSystem_();
  const gameId = seasonAnchorString_(payload.gameId || payload.GameId);
  if (!gameId) throw new Error("Game ID is required for Season Survivor Pick settings.");
  const existing = seasonAnchorGetSettings_(gameId);
  const settings = seasonAnchorNormalizeSettings_(payload, existing);
  seasonAnchorUpsert_(SEASON_ANCHOR_SETTINGS_SHEET, SEASON_ANCHOR_SETTINGS_HEADERS, ["GameId"], settings);
  const userSheet = SpreadsheetApp.getActive().getSheetByName(SEASON_ANCHOR_USERS_SHEET);
  seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET).forEach(function(row) {
    if (seasonAnchorKey_(row.GameId) !== seasonAnchorKey_(gameId)) return;
    const current = seasonAnchorNumber_(row.CurrentMultiplier, settings.StartMultiplier);
    if (current > settings.MaxMultiplier) {
      seasonAnchorUpdateObjectRow_(userSheet, row.__rowNumber, {
        CurrentMultiplier: settings.MaxMultiplier,
        UpdatedAt: new Date()
      });
    }
  });
  if (typeof clearGameCaches === "function") clearGameCaches(gameId);
  return settings;
}

function apiAdminSaveSeasonAnchorSettings(payload) {
  requireAdmin_(payload || {});
  const settings = seasonAnchorSaveSettings_(payload || {});
  return {
    success: true,
    message: settings.Enabled ? "Season Survivor Pick settings saved and enabled." : "Season Survivor Pick settings saved and disabled.",
    settings: settings
  };
}

function seasonAnchorGetUserRow_(gameId, username) {
  return seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET).find(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(gameId) &&
      seasonAnchorKey_(row.Username) === seasonAnchorKey_(username);
  }) || null;
}

function seasonAnchorRealitySeasonForGame_(gameId) {
  if (typeof realityTvEnsureSystem_ !== "function") return null;
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(gameId);
  }) || null;
}

function seasonAnchorCurrentRealityEpisode_(season) {
  if (!season) return null;
  const episodes = realityTvEpisodesForSeason_(season.SeasonId);
  if (!episodes.length) return null;
  const currentNumber = seasonAnchorNumber_(season.CurrentEpisodeNumber, 0);
  return episodes.find(function(row) {
    return seasonAnchorNumber_(row.EpisodeNumber, 0) === currentNumber;
  }) || episodes[episodes.length - 1];
}


function seasonAnchorResolveRealityEpisodeView_(view) {
  if (!view || !view.season) return null;
  const episodes = Array.isArray(view.episodes) ? view.episodes.slice() : [];
  const currentNumber = Math.max(1, seasonAnchorNumber_(view.season.currentEpisodeNumber, 1));
  const now = new Date().getTime();
  const isSelectable = function(row) {
    if (!row || seasonAnchorKey_(row.status || "open") !== "open") return false;
    const value = row.lockDateTime || "";
    if (!value) return true;
    const lockDate = new Date(value);
    return isNaN(lockDate.getTime()) || lockDate.getTime() > now;
  };

  let episode = episodes.find(function(row) {
    return seasonAnchorNumber_(row.episodeNumber, 0) === currentNumber && isSelectable(row);
  }) || episodes.find(isSelectable) || episodes.find(function(row) {
    return seasonAnchorNumber_(row.episodeNumber, 0) === currentNumber;
  }) || episodes[0] || null;

  if (!episode && typeof getCategoriesCached === "function") {
    const categoryId = "episode-" + currentNumber + "-eliminated";
    const category = (getCategoriesCached(view.season.gameId) || []).find(function(row) {
      return seasonAnchorKey_(row.id || row.categoryId) === seasonAnchorKey_(categoryId);
    }) || null;
    if (category) {
      episode = {
        episodeId: view.season.seasonId + "-episode-" + currentNumber,
        episodeNumber: currentNumber,
        episodeName: seasonAnchorString_(category.shortName || category.name || ((view.season.periodLabel || "Episode") + " " + currentNumber)),
        lockDateTime: category.lockDateTime || category.LockDateTime || "",
        status: seasonAnchorBool_(category.locked) ? "LOCKED" : "OPEN",
        categoryId: categoryId,
        derivedFromCategory: true
      };
    }
  }
  return episode;
}

function seasonAnchorRealityEntities_(season, activeOnly) {
  if (!season) return [];
  const view = typeof realityTvUserGameViewPayload_ === "function" ? realityTvUserGameViewPayload_(season.GameId) : null;
  const rows = view && Array.isArray(view.participants)
    ? view.participants
    : realityTvContestantsForSeason_(season.SeasonId).map(function(row) {
        return {
          id: row.ContestantId, name: row.Name, imageUrl: row.ImageUrl,
          teamOrTribe: row.TeamOrTribe, teamColor: row.TeamColor,
          fullName: row.FullName, age: row.Age, hometown: row.Hometown,
          occupation: row.Occupation, biography: row.Biography,
          member1: row.Member1, member2: row.Member2, relationship: row.Relationship,
          status: row.Status, active: realityTvBool_(row.Active), eliminatedEpisode: row.EliminatedEpisode
        };
      });
  return rows.filter(function(row) {
    return activeOnly === false || (row.active === true && seasonAnchorKey_(row.status || "active") === "active");
  });
}

function seasonAnchorUserHistorySummary_(gameId, username) {
  const rows = seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET).filter(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(gameId) && seasonAnchorKey_(row.Username) === seasonAnchorKey_(username);
  });
  let bonus = 0, penalty = 0, net = 0, longest = 0, survived = 0;
  rows.forEach(function(row) {
    bonus += seasonAnchorNumber_(row.BonusPoints, 0);
    penalty += seasonAnchorNumber_(row.PenaltyPoints, 0);
    net += seasonAnchorNumber_(row.NetAdjustment, 0);
    longest = Math.max(longest, seasonAnchorNumber_(row.StreakAfter, 0));
    if (seasonAnchorKey_(row.Outcome) === "survived") survived += 1;
  });
  return {
    totalBonus: seasonAnchorRound_(bonus),
    totalPenalty: seasonAnchorRound_(penalty),
    netAdjustment: seasonAnchorRound_(net),
    longestStreak: longest,
    successfulPeriods: survived,
    settledPeriods: rows.length,
    recent: rows.sort(function(a, b) { return seasonAnchorNumber_(b.EpisodeNumber, 0) - seasonAnchorNumber_(a.EpisodeNumber, 0); }).slice(0, 5).map(function(row) {
      return {
        episodeNumber: seasonAnchorNumber_(row.EpisodeNumber, 0), entityName: seasonAnchorString_(row.EntityName),
        outcome: seasonAnchorString_(row.Outcome), multiplier: seasonAnchorNumber_(row.MultiplierApplied, 1),
        bonus: seasonAnchorNumber_(row.BonusPoints, 0), penalty: seasonAnchorNumber_(row.PenaltyPoints, 0), net: seasonAnchorNumber_(row.NetAdjustment, 0)
      };
    })
  };
}

function seasonAnchorUserPayload_(username, gameId) {
  const settings = seasonAnchorGetSettings_(gameId);
  if (!settings || !settings.Enabled) return { enabled: false };
  if (settings.SourceType !== "reality-tv") {
    return { enabled: false, unsupported: true, message: "This Season Survivor source is not active yet." };
  }

  const view = typeof realityTvUserGameViewPayload_ === "function"
    ? realityTvUserGameViewPayload_(gameId, username, { includePlayerStats: false })
    : null;
  if (!view || view.enabled !== true || !view.season) {
    return { enabled: false, message: "Reality TV season record was not found." };
  }

  const episode = seasonAnchorResolveRealityEpisodeView_(view);

  const user = seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET, true).find(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(gameId) &&
      seasonAnchorKey_(row.Username) === seasonAnchorKey_(username);
  }) || null;

  const allEntities = Array.isArray(view.participants) ? view.participants : [];
  const entities = allEntities.filter(function(row) {
    return row.active === true && seasonAnchorKey_(row.status || "active") === "active";
  });
  const currentEntity = user ? (allEntities.find(function(item) {
    return seasonAnchorKey_(item.id) === seasonAnchorKey_(user.CurrentEntityId);
  }) || null) : null;
  const currentEntityActive = !!(user && entities.some(function(item) {
    return seasonAnchorKey_(item.id) === seasonAnchorKey_(user.CurrentEntityId);
  }));

  const historyRows = seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET, true).filter(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(gameId) &&
      seasonAnchorKey_(row.Username) === seasonAnchorKey_(username);
  });
  let bonus = 0, penalty = 0, net = 0, longest = 0, survived = 0;
  historyRows.forEach(function(row) {
    bonus += seasonAnchorNumber_(row.BonusPoints, 0);
    penalty += seasonAnchorNumber_(row.PenaltyPoints, 0);
    net += seasonAnchorNumber_(row.NetAdjustment, 0);
    longest = Math.max(longest, seasonAnchorNumber_(row.StreakAfter, 0));
    if (seasonAnchorKey_(row.Outcome) === "survived") survived += 1;
  });
  const stats = {
    totalBonus: seasonAnchorRound_(bonus),
    totalPenalty: seasonAnchorRound_(penalty),
    netAdjustment: seasonAnchorRound_(net),
    longestStreak: longest,
    successfulPeriods: survived,
    settledPeriods: historyRows.length,
    recent: historyRows.sort(function(a, b) {
      return seasonAnchorNumber_(b.EpisodeNumber, 0) - seasonAnchorNumber_(a.EpisodeNumber, 0);
    }).slice(0, 5).map(function(row) {
      return {
        episodeNumber: seasonAnchorNumber_(row.EpisodeNumber, 0),
        entityName: seasonAnchorString_(row.EntityName),
        outcome: seasonAnchorString_(row.Outcome),
        multiplier: seasonAnchorNumber_(row.MultiplierApplied, 1),
        bonus: seasonAnchorNumber_(row.BonusPoints, 0),
        penalty: seasonAnchorNumber_(row.PenaltyPoints, 0),
        net: seasonAnchorNumber_(row.NetAdjustment, 0)
      };
    })
  };

  const now = new Date();
  const lockDate = episode && episode.lockDateTime ? new Date(episode.lockDateTime) : null;
  const locked = !episode || seasonAnchorKey_(episode.status) !== "open" ||
    (lockDate && !isNaN(lockDate.getTime()) && now.getTime() >= lockDate.getTime());

  return {
    enabled: true,
    settings: settings,
    season: {
      seasonId: view.season.seasonId,
      showName: view.season.showName,
      seasonName: view.season.seasonName,
      periodLabel: view.season.periodLabel || "Episode",
      participantLabel: view.season.participantLabel || "Contestant",
      groupLabel: view.season.groupLabel || "Group"
    },
    episode: episode ? {
      episodeId: episode.episodeId,
      episodeNumber: seasonAnchorNumber_(episode.episodeNumber, 0),
      episodeName: episode.episodeName,
      lockDateTime: episode.lockDateTime,
      status: episode.status
    } : null,
    user: user ? {
      currentEntityId: seasonAnchorString_(user.CurrentEntityId),
      currentEntityName: seasonAnchorString_(user.CurrentEntityName),
      streak: seasonAnchorNumber_(user.Streak, 0),
      currentMultiplier: seasonAnchorNumber_(user.CurrentMultiplier, settings.StartMultiplier),
      status: seasonAnchorString_(user.Status || "NEEDS_PICK").toUpperCase(),
      selectedEpisodeNumber: seasonAnchorNumber_(user.SelectedEpisodeNumber, 0),
      lastSettledEpisodeNumber: seasonAnchorNumber_(user.LastSettledEpisodeNumber, 0),
      currentEntityActive: currentEntityActive
    } : null,
    entities: entities,
    allEntities: allEntities,
    currentEntity: currentEntity,
    stats: stats,
    locked: !!locked,
    finalized: !!(user && user.CurrentEntityId && seasonAnchorKey_(user.Status) === "active" && currentEntityActive),
    canChoose: !locked && (!user || seasonAnchorKey_(user.Status) === "needs_pick" || !user.CurrentEntityId || !currentEntityActive),
    maxWeeklyBonus: seasonAnchorRound_(settings.EligiblePointsCap * Math.max(0, settings.MaxMultiplier - 1))
  };
}

function apiGetSeasonAnchor(payload) {
  payload = payload || {};
  const username = seasonAnchorString_(payload.username);
  const gameId = seasonAnchorString_(payload.gameId);
  const token = seasonAnchorString_(payload.token);
  if (!username || !gameId) throw new Error("Username and Game ID are required.");
  if (!token) throw new Error("Session expired. Please log in again.");
  if (typeof validateUserSession_ === "function") validateUserSession_(username, token);
  const view = seasonAnchorUserPayload_(username, gameId);
  const spoiler = typeof realityTvSpoilerStateForGame_ === "function"
    ? realityTvSpoilerStateForGame_(username, gameId)
    : { hasHiddenResults: false };
  if (view && view.enabled === true && spoiler && spoiler.hasHiddenResults === true) {
    return {
      success: true,
      seasonAnchor: {
        enabled: true,
        hiddenBySpoiler: true,
        spoilerShield: spoiler,
        message: "Sole Survivor status is hidden until you reveal the settled episode."
      }
    };
  }
  return { success: true, seasonAnchor: view };
}

function seasonAnchorPersistUserPick_(existing, row) {
  const spreadsheet = SpreadsheetApp.getActive();
  // apiSaveSeasonAnchorPick reaches this helper only after the authoritative
  // Season Anchor payload/read path has ensured the system sheets. Reuse the
  // already-existing users sheet so finalization does not pay another header
  // inspection/formatting pass. Fall back to ensure only for defensive direct
  // calls or a newly repaired workbook.
  const sheet = spreadsheet.getSheetByName(SEASON_ANCHOR_USERS_SHEET) ||
    seasonAnchorGetOrCreateSheet_(spreadsheet, SEASON_ANCHOR_USERS_SHEET, SEASON_ANCHOR_USER_HEADERS);
  if (existing && existing.__rowNumber) {
    seasonAnchorUpdateObjectRow_(sheet, existing.__rowNumber, row);
    return existing.__rowNumber;
  }
  return seasonAnchorAppendObject_(sheet, row);
}

function seasonAnchorSavedView_(view, row, entity) {
  const next = Object.assign({}, view || {});
  next.user = {
    currentEntityId: seasonAnchorString_(row.CurrentEntityId),
    currentEntityName: seasonAnchorString_(row.CurrentEntityName),
    streak: seasonAnchorNumber_(row.Streak, 0),
    currentMultiplier: seasonAnchorNumber_(row.CurrentMultiplier, 1),
    status: seasonAnchorString_(row.Status || "ACTIVE").toUpperCase(),
    selectedEpisodeNumber: seasonAnchorNumber_(row.SelectedEpisodeNumber, 0),
    lastSettledEpisodeNumber: seasonAnchorNumber_(row.LastSettledEpisodeNumber, 0),
    currentEntityActive: true
  };
  next.currentEntity = entity || null;
  next.finalized = true;
  next.canChoose = false;
  return next;
}

function apiSaveSeasonAnchorPick(payload) {
  payload = payload || {};
  const username = seasonAnchorString_(payload.username);
  const gameId = seasonAnchorString_(payload.gameId);
  const token = seasonAnchorString_(payload.token);
  const entityId = seasonAnchorString_(payload.entityId);
  if (!username || !gameId || !entityId) throw new Error("Username, Game ID, and selection are required.");
  if (!token) throw new Error("Session expired. Please log in again.");
  if (typeof validateUserSession_ === "function") validateUserSession_(username, token);
  const spoiler = typeof realityTvSpoilerStateForGame_ === "function"
    ? realityTvSpoilerStateForGame_(username, gameId)
    : { hasHiddenResults: false };
  if (spoiler && spoiler.hasHiddenResults === true) {
    throw new Error("Reveal the settled Reality episode before changing the Sole Survivor selection.");
  }

  // Build the authoritative view once. This is the expensive Reality/Season
  // Anchor read; the successful response below projects the saved user state
  // onto this already-loaded view instead of rebuilding the same payload.
  const view = seasonAnchorUserPayload_(username, gameId);
  if (!view.enabled) throw new Error(view.message || "Season Survivor Pick is not enabled for this game.");
  if (view.locked) throw new Error("The Season Survivor selection is locked for this episode.");
  const entity = (view.entities || []).find(function(item) {
    return seasonAnchorKey_(item.id) === seasonAnchorKey_(entityId);
  });
  if (!entity) throw new Error("Choose an active contestant.");

  let userLock = null;
  try {
    if (typeof LockService !== "undefined" && LockService && typeof LockService.getUserLock === "function") {
      userLock = LockService.getUserLock();
      if (userLock && typeof userLock.tryLock === "function" && !userLock.tryLock(2000)) {
        throw new Error("Your Sole Survivor pick is already being finalized. Please wait for the current save to finish.");
      }
    }

    const settings = view.settings;
    const existing = seasonAnchorGetUserRow_(gameId, username);
    const changing = existing && existing.CurrentEntityId && seasonAnchorKey_(existing.CurrentEntityId) !== seasonAnchorKey_(entity.id);
    const existingStillActive = !!(existing && seasonAnchorKey_(existing.Status) === "active" && (view.entities || []).some(function(item) {
      return seasonAnchorKey_(item.id) === seasonAnchorKey_(existing.CurrentEntityId);
    }));
    if (changing && existingStillActive) {
      throw new Error("This Sole Survivor pick is finalized. You can choose again only after the contestant is eliminated.");
    }
    if (existingStillActive && !changing) {
      return {
        success: true,
        message: "Finalized Pick: " + seasonAnchorString_(existing.CurrentEntityName || entity.name),
        alreadyFinalized: true,
        seasonAnchor: view
      };
    }

    const reset = !existing || changing || seasonAnchorKey_(existing.Status) === "needs_pick" || !existingStillActive;
    const now = new Date();
    const row = {
      GameId: gameId,
      SeasonId: view.season.seasonId,
      Username: username,
      CurrentEntityId: entity.id,
      CurrentEntityName: entity.name,
      SelectedEpisodeId: view.episode.episodeId,
      SelectedEpisodeNumber: view.episode.episodeNumber,
      Streak: reset ? 0 : seasonAnchorNumber_(existing.Streak, 0),
      CurrentMultiplier: reset ? settings.StartMultiplier : seasonAnchorNumber_(existing.CurrentMultiplier, settings.StartMultiplier),
      Status: "ACTIVE",
      PickedAt: now,
      LastSettledEpisodeId: existing ? existing.LastSettledEpisodeId : "",
      LastSettledEpisodeNumber: existing ? existing.LastSettledEpisodeNumber : "",
      Active: true,
      CreatedAt: existing && existing.CreatedAt ? existing.CreatedAt : now,
      UpdatedAt: now
    };

    // The existing row was already located above. Write that exact row (or
    // append once) instead of scanning SeasonAnchorUsers again through upsert.
    seasonAnchorPersistUserPick_(existing, row);

    return {
      success: true,
      message: "Finalized Pick: " + seasonAnchorString_(entity.name),
      seasonAnchor: seasonAnchorSavedView_(view, row, entity)
    };
  } finally {
    if (userLock && typeof userLock.releaseLock === "function") {
      try { userLock.releaseLock(); } catch (err) {}
    }
  }
}

function seasonAnchorEpisodeCategoryIds_(seasonId, episodeId) {
  const ids = [];
  if (typeof realityTvGetEpisode_ === "function") {
    const episode = realityTvGetEpisode_(episodeId);
    if (episode && episode.CategoryId) ids.push(seasonAnchorKey_(episode.CategoryId));
  }
  if (typeof REALITY_TV_EPISODE_QUESTIONS_SHEET !== "undefined") {
    realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET).forEach(function(row) {
      if (seasonAnchorKey_(row.SeasonId) === seasonAnchorKey_(seasonId) &&
          seasonAnchorKey_(row.EpisodeId) === seasonAnchorKey_(episodeId) && row.CategoryId &&
          (row.Enabled === "" || row.Enabled === undefined || seasonAnchorBool_(row.Enabled))) {
        ids.push(seasonAnchorKey_(row.CategoryId));
      }
    });
  }
  const seen = {};
  return ids.filter(function(id) {
    if (!id || seen[id]) return false;
    seen[id] = true;
    return true;
  });
}

function seasonAnchorUserFixedPointsForCategories_(gameId, username, categoryIds) {
  if (!categoryIds.length || typeof buildUserPicksMap_ !== "function" || typeof getCategorySettings !== "function") return 0;
  const picks = buildUserPicksMap_(gameId)[username] || {};
  const settings = getCategorySettings(gameId) || {};
  const resolutions = typeof getCategoryResultsResolutionMap === "function" ? getCategoryResultsResolutionMap(gameId) : {};
  let total = 0;
  categoryIds.forEach(function(categoryId) {
    const config = settings[categoryId] || {};
    const pick = picks[categoryId];
    if (!pick) return;
    const scoreMode = typeof normalizeCategoryScoreMode_ === "function"
      ? normalizeCategoryScoreMode_(config.scoreMode)
      : seasonAnchorKey_(config.scoreMode || "correct-pick");
    if (["wager", "ranking", "staked-points", "confidence-points"].indexOf(scoreMode) !== -1) return;
    const resolution = typeof getHybridCategoryResolution_ === "function"
      ? getHybridCategoryResolution_(categoryId, config, resolutions)
      : { resolved: !!resolutions[categoryId], result: "winner", winnerNomineeId: resolutions[categoryId] || config.winnerNomineeId || "" };
    if (!resolution || !resolution.resolved || resolution.result !== "winner") return;
    const winnerIds = Array.isArray(resolution.winnerNomineeIds) && resolution.winnerNomineeIds.length
      ? resolution.winnerNomineeIds.map(seasonAnchorKey_).filter(Boolean)
      : [seasonAnchorKey_(resolution.winnerNomineeId)].filter(Boolean);
    if (winnerIds.indexOf(seasonAnchorKey_(pick.nomineeId)) === -1) return;
    const base = seasonAnchorNumber_(config.points, 0);
    const penalty = seasonAnchorNumber_(config.changePenalty, 0);
    const changes = seasonAnchorNumber_(pick.changeCount, 0);
    total += Math.max(0, base - (penalty * changes));
  });
  return seasonAnchorRound_(total);
}

function seasonAnchorRecalculateEpisodeScores_(gameId, seasonId, episodeId) {
  const settings = seasonAnchorGetSettings_(gameId);
  if (!settings || !settings.Enabled) return { success: true, skipped: true };
  const categories = seasonAnchorEpisodeCategoryIds_(seasonId, episodeId);
  const historySheet = SpreadsheetApp.getActive().getSheetByName(SEASON_ANCHOR_HISTORY_SHEET);
  const rows = seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET).filter(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(gameId) && seasonAnchorKey_(row.EpisodeId) === seasonAnchorKey_(episodeId);
  });
  rows.forEach(function(row) {
    const outcome = seasonAnchorKey_(row.Outcome);
    const earned = outcome === "survived"
      ? seasonAnchorUserFixedPointsForCategories_(gameId, seasonAnchorString_(row.Username), categories)
      : 0;
    const appliedPointsCap = seasonAnchorNumber_(row.EligiblePointsCapApplied, settings.EligiblePointsCap);
    const eligible = outcome === "survived" ? Math.min(appliedPointsCap, earned) : 0;
    const multiplier = seasonAnchorNumber_(row.MultiplierApplied, settings.StartMultiplier);
    const bonus = outcome === "survived" ? seasonAnchorRound_(eligible * Math.max(0, multiplier - 1)) : 0;
    const penalty = seasonAnchorNumber_(row.PenaltyPoints, 0);
    seasonAnchorUpdateObjectRow_(historySheet, row.__rowNumber, {
      EligiblePoints: eligible,
      BonusPoints: bonus,
      NetAdjustment: seasonAnchorRound_(bonus - penalty),
      UpdatedAt: new Date()
    });
  });
  if (typeof clearGameCaches === "function") clearGameCaches(gameId);
  return { success: true, historyRows: rows.length, categoryCount: categories.length };
}

function seasonAnchorSettleRealityEpisode_(season, episode, selectedIds, outcomeType, reviewer) {
  const settings = seasonAnchorGetSettings_(season.GameId);
  if (!settings || !settings.Enabled || settings.SourceType !== "reality-tv") return { success: true, skipped: true };
  seasonAnchorEnsureSystem_();
  const selected = (selectedIds || []).map(seasonAnchorKey_);
  const users = seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET).filter(function(row) {
    return seasonAnchorKey_(row.GameId) === seasonAnchorKey_(season.GameId) &&
      seasonAnchorBool_(row.Active) && row.CurrentEntityId &&
      seasonAnchorNumber_(row.SelectedEpisodeNumber, 0) <= seasonAnchorNumber_(episode.EpisodeNumber, 0) &&
      seasonAnchorNumber_(row.LastSettledEpisodeNumber, 0) < seasonAnchorNumber_(episode.EpisodeNumber, 0);
  });
  const userSheet = SpreadsheetApp.getActive().getSheetByName(SEASON_ANCHOR_USERS_SHEET);
  const now = new Date();
  users.forEach(function(user) {
    const entityLost = selected.indexOf(seasonAnchorKey_(user.CurrentEntityId)) !== -1;
    const type = seasonAnchorKey_(outcomeType);
    const noResult = type === "no-elimination";
    const withdrawal = entityLost && (type === "medical-withdrawal" || type === "quit");
    const freeReset = withdrawal && settings.WithdrawalBehavior === "free-reset";
    let outcome = "SURVIVED";
    let streakAfter = seasonAnchorNumber_(user.Streak, 0) + 1;
    let nextMultiplier = Math.min(settings.MaxMultiplier, settings.StartMultiplier + (settings.GrowthPerSuccess * streakAfter));
    let penalty = 0;
    let status = "ACTIVE";
    let notes = "Selection remained active.";

    if (noResult) {
      outcome = "PRESERVED";
      streakAfter = seasonAnchorNumber_(user.Streak, 0);
      nextMultiplier = seasonAnchorNumber_(user.CurrentMultiplier, settings.StartMultiplier);
      notes = "No elimination; streak and multiplier preserved without a bonus increase.";
    } else if (entityLost) {
      outcome = freeReset ? "RESET" : "LOSS";
      streakAfter = 0;
      nextMultiplier = settings.StartMultiplier;
      penalty = freeReset ? 0 : settings.LossPenalty;
      status = "NEEDS_PICK";
      notes = freeReset ? "Forced reset without penalty." : "Selection was eliminated; replacement required.";
    }

    const history = {
      HistoryId: season.GameId + "-" + seasonAnchorKey_(user.Username) + "-" + episode.EpisodeId,
      GameId: season.GameId,
      SeasonId: season.SeasonId,
      Username: user.Username,
      EpisodeId: episode.EpisodeId,
      EpisodeNumber: episode.EpisodeNumber,
      EntityId: user.CurrentEntityId,
      EntityName: user.CurrentEntityName,
      Outcome: outcome,
      StreakBefore: seasonAnchorNumber_(user.Streak, 0),
      StreakAfter: streakAfter,
      MultiplierApplied: seasonAnchorNumber_(user.CurrentMultiplier, settings.StartMultiplier),
      EligiblePointsCapApplied: settings.EligiblePointsCap,
      EligiblePoints: 0,
      BonusPoints: 0,
      PenaltyPoints: penalty,
      NetAdjustment: -penalty,
      ResultSource: "manual-reality-tv",
      SettledAt: now,
      Notes: notes + " Approved by " + (reviewer || "administrator") + ".",
      CreatedAt: now,
      UpdatedAt: now
    };
    seasonAnchorUpsert_(SEASON_ANCHOR_HISTORY_SHEET, SEASON_ANCHOR_HISTORY_HEADERS, ["HistoryId"], history);
    const userPatch = {
      Streak: streakAfter,
      CurrentMultiplier: seasonAnchorRound_(nextMultiplier),
      Status: status,
      LastSettledEpisodeId: episode.EpisodeId,
      LastSettledEpisodeNumber: episode.EpisodeNumber,
      UpdatedAt: now
    };
    if (entityLost) {
      // History retains the eliminated/withdrawn selection. Clearing the live
      // selection makes the replacement state unambiguous to the player UI,
      // dashboard progress, and cached payloads.
      userPatch.CurrentEntityId = "";
      userPatch.CurrentEntityName = "";
    }
    seasonAnchorUpdateObjectRow_(userSheet, user.__rowNumber, userPatch);
  });
  seasonAnchorRecalculateEpisodeScores_(season.GameId, season.SeasonId, episode.EpisodeId);
  return { success: true, usersSettled: users.length };
}

function seasonAnchorDashboardProgress_(username, gameId) {
  const settings = seasonAnchorGetSettings_(gameId);
  if (!settings || !settings.Enabled || settings.SourceType !== "reality-tv") {
    return { required: 0, made: 0, outstanding: 0, finalized: false };
  }
  const user = seasonAnchorGetUserRow_(gameId, username);
  if (!user) return { required: 1, made: 0, outstanding: 1, finalized: false };
  const needsPick = seasonAnchorKey_(user.Status || "needs_pick") === "needs_pick" || !seasonAnchorString_(user.CurrentEntityId);
  const finalized = !needsPick && seasonAnchorKey_(user.Status || "active") === "active";
  const spoiler = typeof realityTvSpoilerStateForGame_ === "function"
    ? realityTvSpoilerStateForGame_(username, gameId)
    : { hasHiddenResults: false };
  // Do not let the Home Hub announce that a finalized anchor was eliminated
  // before this player reveals the episode. A player who never selected an
  // anchor still remains outstanding as before.
  const wasPreviouslyFinalized = !!seasonAnchorString_(user.CurrentEntityId) || seasonAnchorNumber_(user.LastSettledEpisodeNumber, 0) > 0;
  const concealReopen = spoiler && spoiler.hasHiddenResults === true && wasPreviouslyFinalized;
  const made = finalized || concealReopen ? 1 : 0;
  return {
    required: 1,
    made: made,
    outstanding: made ? 0 : 1,
    finalized: finalized,
    hiddenBySpoiler: concealReopen
  };
}

function seasonAnchorAdjustmentsForGame_(gameId) {
  const settings = seasonAnchorGetSettings_(gameId);
  if (!settings) return {};
  const map = {};
  seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET).forEach(function(row) {
    if (seasonAnchorKey_(row.GameId) !== seasonAnchorKey_(gameId)) return;
    const username = seasonAnchorString_(row.Username);
    if (!username) return;
    if (!map[username]) map[username] = { bonus: 0, penalty: 0, net: 0, longestStreak: 0 };
    map[username].bonus += seasonAnchorNumber_(row.BonusPoints, 0);
    map[username].penalty += seasonAnchorNumber_(row.PenaltyPoints, 0);
    map[username].net += seasonAnchorNumber_(row.NetAdjustment, 0);
    map[username].longestStreak = Math.max(map[username].longestStreak, seasonAnchorNumber_(row.StreakAfter, 0));
  });
  seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET).forEach(function(row) {
    if (seasonAnchorKey_(row.GameId) !== seasonAnchorKey_(gameId)) return;
    const username = seasonAnchorString_(row.Username);
    if (!username) return;
    if (!map[username]) map[username] = { bonus: 0, penalty: 0, net: 0, longestStreak: 0 };
    map[username].currentStreak = seasonAnchorNumber_(row.Streak, 0);
    map[username].currentMultiplier = seasonAnchorNumber_(row.CurrentMultiplier, settings.StartMultiplier);
    map[username].currentEntityName = seasonAnchorString_(row.CurrentEntityName);
    map[username].status = seasonAnchorString_(row.Status);
  });
  Object.keys(map).forEach(function(username) {
    map[username].bonus = seasonAnchorRound_(map[username].bonus);
    map[username].penalty = seasonAnchorRound_(map[username].penalty);
    map[username].net = seasonAnchorRound_(map[username].net);
  });
  return map;
}
