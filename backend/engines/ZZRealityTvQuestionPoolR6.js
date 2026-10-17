/* =========================
   REALITY TV WEEKLY QUESTION POOL — R6

   Additive adapter around the existing Reality TV question-pack engine.
   The existing materializer remains authoritative for category/question
   creation, result review, settlement and scoring.
========================= */

var REALITY_TV_QUESTION_POOL_R6 = {
  installed: false,
  originals: {}
};

function realityTvR6Integer_(value, fallback) {
  var number = Number(value);
  if (!isFinite(number)) number = Number(fallback || 0);
  return Math.max(0, Math.floor(number));
}

function realityTvR6Bool_(value) {
  if (typeof realityTvBool_ === "function") return realityTvBool_(value);
  if (value === true || value === 1) return true;
  var normalized = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function realityTvR6Key_(value) {
  if (typeof realityTvKey_ === "function") return realityTvKey_(value);
  return String(value || "").trim().toLowerCase();
}

function realityTvR6PushHeader_(headers, name) {
  if (!Array.isArray(headers) || headers.indexOf(name) !== -1) return;
  headers.push(name);
}

function realityTvR6EnsureSchemaHeaders_() {
  if (typeof REALITY_TV_QUESTION_TEMPLATE_HEADERS !== "undefined") {
    realityTvR6PushHeader_(REALITY_TV_QUESTION_TEMPLATE_HEADERS, "RequiredCore");
    realityTvR6PushHeader_(REALITY_TV_QUESTION_TEMPLATE_HEADERS, "RandomEligible");
  }
  if (typeof REALITY_TV_SEASON_HEADERS !== "undefined") {
    realityTvR6PushHeader_(REALITY_TV_SEASON_HEADERS, "QuestionPoolEnabled");
    realityTvR6PushHeader_(REALITY_TV_SEASON_HEADERS, "RandomQuestionCount");
    realityTvR6PushHeader_(REALITY_TV_SEASON_HEADERS, "AvoidRepeatEpisodes");
  }
}

function realityTvR6EnsureSchema_() {
  realityTvR6EnsureSchemaHeaders_();
  if (typeof SpreadsheetApp === "undefined" || typeof realityTvGetOrCreateSheet_ !== "function") return;
  var ss = SpreadsheetApp.getActive();
  if (typeof REALITY_TV_QUESTION_TEMPLATES_SHEET !== "undefined" && typeof REALITY_TV_QUESTION_TEMPLATE_HEADERS !== "undefined") {
    realityTvGetOrCreateSheet_(ss, REALITY_TV_QUESTION_TEMPLATES_SHEET, REALITY_TV_QUESTION_TEMPLATE_HEADERS);
  }
  if (typeof REALITY_TV_SEASONS_SHEET !== "undefined" && typeof REALITY_TV_SEASON_HEADERS !== "undefined") {
    realityTvGetOrCreateSheet_(ss, REALITY_TV_SEASONS_SHEET, REALITY_TV_SEASON_HEADERS);
  }
}

function realityTvR6PoolSettings_(season) {
  return {
    enabled: !!(season && realityTvR6Bool_(season.QuestionPoolEnabled)),
    randomCount: realityTvR6Integer_(season && season.RandomQuestionCount, 0),
    avoidRepeatEpisodes: realityTvR6Integer_(season && season.AvoidRepeatEpisodes, 0)
  };
}

function realityTvR6UniqueTemplates_(templates) {
  var seen = {};
  return (templates || []).filter(function(template) {
    var id = realityTvR6Key_(template && template.TemplateId);
    if (!id || seen[id]) return false;
    seen[id] = true;
    return true;
  });
}

function realityTvR6Shuffle_(items, rng) {
  var random = typeof rng === "function" ? rng : Math.random;
  var result = (items || []).slice();
  for (var index = result.length - 1; index > 0; index -= 1) {
    var swap = Math.floor(random() * (index + 1));
    var item = result[index];
    result[index] = result[swap];
    result[swap] = item;
  }
  return result;
}

function realityTvR6RecentUsage_(rows, currentEpisodeNumber, avoidRepeatEpisodes) {
  var current = realityTvR6Integer_(currentEpisodeNumber, 0);
  var windowSize = realityTvR6Integer_(avoidRepeatEpisodes, 0);
  var minimumEpisode = windowSize > 0 ? Math.max(1, current - windowSize) : current;
  var usage = {};
  if (!windowSize || !current) return usage;
  (rows || []).forEach(function(row) {
    var episodeNumber = realityTvR6Integer_(row && row.EpisodeNumber, 0);
    var templateId = realityTvR6Key_(row && row.TemplateId);
    if (!templateId || !episodeNumber || episodeNumber >= current || episodeNumber < minimumEpisode) return;
    if (!usage[templateId] || episodeNumber > usage[templateId]) usage[templateId] = episodeNumber;
  });
  return usage;
}

function realityTvR6SelectTemplates_(templates, settings, recentUsage, rng) {
  var enabled = realityTvR6UniqueTemplates_((templates || []).filter(function(template) {
    return template && realityTvR6Bool_(template.Enabled);
  }));
  if (!settings || settings.enabled !== true) return enabled;

  var required = enabled.filter(function(template) {
    return realityTvR6Bool_(template.RequiredCore);
  });
  var requiredIds = {};
  required.forEach(function(template) { requiredIds[realityTvR6Key_(template.TemplateId)] = true; });

  var candidates = enabled.filter(function(template) {
    var id = realityTvR6Key_(template.TemplateId);
    return !requiredIds[id] && realityTvR6Bool_(template.RandomEligible);
  });
  var recent = recentUsage || {};
  var fresh = [];
  var fallback = [];
  candidates.forEach(function(template) {
    var id = realityTvR6Key_(template.TemplateId);
    if (recent[id]) fallback.push(template);
    else fresh.push(template);
  });

  fresh = realityTvR6Shuffle_(fresh, rng);
  fallback = realityTvR6Shuffle_(fallback, rng).sort(function(a, b) {
    return Number(recent[realityTvR6Key_(a.TemplateId)] || 0) - Number(recent[realityTvR6Key_(b.TemplateId)] || 0);
  });

  var requested = realityTvR6Integer_(settings.randomCount, 0);
  var randomSelection = fresh.concat(fallback).slice(0, requested);
  return realityTvR6UniqueTemplates_(required.concat(randomSelection));
}

function realityTvR6EpisodeQuestions_(seasonId, episodeId) {
  if (typeof realityTvEpisodeQuestionsForSeason_ !== "function") return [];
  return realityTvEpisodeQuestionsForSeason_(seasonId).filter(function(row) {
    return !episodeId || realityTvR6Key_(row.EpisodeId) === realityTvR6Key_(episodeId);
  });
}

function realityTvR6ExistingSelection_(seasonId, episodeId) {
  return realityTvR6EpisodeQuestions_(seasonId, episodeId).filter(function(row) {
    if (!row || !row.TemplateId) return false;
    return typeof realityTvEpisodeQuestionEnabled_ !== "function" || realityTvEpisodeQuestionEnabled_(row);
  }).map(function(row) { return realityTvR6Key_(row.TemplateId); }).filter(Boolean);
}

function realityTvR6AllEnabledTemplateIds_(seasonId) {
  if (typeof realityTvQuestionTemplatesForSeason_ !== "function") return [];
  return realityTvQuestionTemplatesForSeason_(seasonId).filter(function(row) {
    return realityTvR6Bool_(row.Enabled);
  }).map(function(row) { return realityTvR6Key_(row.TemplateId); }).filter(Boolean).sort();
}

function realityTvR6RequestedLooksExplicit_(seasonId, requested) {
  if (!Array.isArray(requested)) return false;
  var all = realityTvR6AllEnabledTemplateIds_(seasonId);
  var normalized = requested.map(realityTvR6Key_).filter(Boolean).sort();
  if (all.length !== normalized.length) return true;
  for (var index = 0; index < all.length; index += 1) {
    if (all[index] !== normalized[index]) return true;
  }
  return false;
}

function realityTvR6SelectForEpisode_(season, episode, options) {
  options = options || {};
  var settings = realityTvR6PoolSettings_(season);
  var templates = typeof realityTvQuestionTemplatesForSeason_ === "function"
    ? realityTvQuestionTemplatesForSeason_(season.SeasonId)
    : [];
  if (!settings.enabled) {
    return realityTvR6UniqueTemplates_(templates.filter(function(row) { return realityTvR6Bool_(row.Enabled); }));
  }

  if (!options.regenerate) {
    var existingIds = realityTvR6ExistingSelection_(season.SeasonId, episode.EpisodeId);
    if (existingIds.length) {
      var existingMap = {};
      existingIds.forEach(function(id) { existingMap[id] = true; });
      return realityTvR6UniqueTemplates_(templates.filter(function(row) {
        return existingMap[realityTvR6Key_(row.TemplateId)] && realityTvR6Bool_(row.Enabled);
      }));
    }
  }

  var historyRows = typeof realityTvEpisodeQuestionsForSeason_ === "function"
    ? realityTvEpisodeQuestionsForSeason_(season.SeasonId)
    : [];
  var recent = realityTvR6RecentUsage_(historyRows, episode.EpisodeNumber, settings.avoidRepeatEpisodes);
  return realityTvR6SelectTemplates_(templates, settings, recent, options.rng);
}

function realityTvR6AssertRegenerateSafe_(season, episode) {
  var status = String(episode && episode.Status || "OPEN").trim().toUpperCase();
  if (["LOCKED", "FINAL", "CLOSED"].indexOf(status) !== -1) {
    throw new Error("This episode is " + status + ". Regenerate is not allowed.");
  }
  var rows = realityTvR6EpisodeQuestions_(season.SeasonId, episode.EpisodeId);
  var protectedState = null;
  var blocked = rows.find(function(row) {
    if (typeof realityTvEpisodeQuestionHasProtectedState_ !== "function") return false;
    var state = realityTvEpisodeQuestionHasProtectedState_(season, row);
    if (state && state.blocked === true) {
      protectedState = state;
      return true;
    }
    return false;
  });
  if (blocked) {
    var reason = String(protectedState && protectedState.reason || "").trim();
    throw new Error(reason
      ? "This question set cannot be regenerated: " + reason
      : "This question set has protected picks, wagers, results, or review history and cannot be regenerated.");
  }
  return rows;
}

function realityTvR6DeleteExistingSelection_(season, episode) {
  var rows = realityTvR6AssertRegenerateSafe_(season, episode);
  rows.forEach(function(row) {
    if (typeof realityTvDeleteEpisodeQuestionForPlan_ !== "function") {
      throw new Error("Reality episode-plan deletion protection is unavailable.");
    }
    realityTvDeleteEpisodeQuestionForPlan_(season, row);
  });
  return rows.length;
}

function realityTvR6PersistPoolSettings_(payload) {
  realityTvR6EnsureSchema_();
  if (!payload || !payload.seasonId || typeof SpreadsheetApp === "undefined") return;
  var ss = SpreadsheetApp.getActive();
  var season = typeof realityTvGetSeason_ === "function" ? realityTvGetSeason_(payload.seasonId) : null;
  if (!season) return;
  var seasonSheet = ss.getSheetByName(REALITY_TV_SEASONS_SHEET);
  if (seasonSheet && season.__rowNumber) {
    var patch = {};
    if (Object.prototype.hasOwnProperty.call(payload, "questionPoolEnabled")) patch.QuestionPoolEnabled = realityTvR6Bool_(payload.questionPoolEnabled);
    if (Object.prototype.hasOwnProperty.call(payload, "randomQuestionCount")) patch.RandomQuestionCount = realityTvR6Integer_(payload.randomQuestionCount, 0);
    if (Object.prototype.hasOwnProperty.call(payload, "avoidRepeatEpisodes")) patch.AvoidRepeatEpisodes = realityTvR6Integer_(payload.avoidRepeatEpisodes, 0);
    if (Object.keys(patch).length) {
      patch.UpdatedAt = new Date();
      realityTvUpdateObjectRow_(seasonSheet, season.__rowNumber, patch);
    }
  }

  var requiredIds = payload.requiredQuestionTypesJSON;
  if (!Array.isArray(requiredIds)) {
    try { requiredIds = JSON.parse(requiredIds || "[]"); } catch (err) { requiredIds = []; }
  }
  var randomIds = payload.randomEligibleQuestionTypesJSON;
  if (!Array.isArray(randomIds)) {
    try { randomIds = JSON.parse(randomIds || "[]"); } catch (err2) { randomIds = []; }
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "requiredQuestionTypesJSON") &&
      !Object.prototype.hasOwnProperty.call(payload, "randomEligibleQuestionTypesJSON")) return;

  var requiredMap = {};
  var randomMap = {};
  (requiredIds || []).forEach(function(id) { requiredMap[realityTvR6Key_(id)] = true; });
  (randomIds || []).forEach(function(id) { randomMap[realityTvR6Key_(id)] = true; });
  var templateSheet = ss.getSheetByName(REALITY_TV_QUESTION_TEMPLATES_SHEET);
  if (!templateSheet) return;
  (typeof realityTvQuestionTemplatesForSeason_ === "function" ? realityTvQuestionTemplatesForSeason_(payload.seasonId) : []).forEach(function(row) {
    var id = realityTvR6Key_(row.TemplateId);
    realityTvUpdateObjectRow_(templateSheet, row.__rowNumber, {
      RequiredCore: !!requiredMap[id],
      RandomEligible: !!randomMap[id],
      UpdatedAt: new Date()
    });
  });
}

function realityTvR6Install_() {
  if (REALITY_TV_QUESTION_POOL_R6.installed) return true;
  realityTvR6EnsureSchemaHeaders_();
  if (typeof realityTvMaterializeEpisodeQuestionPackBulk_ !== "function" ||
      typeof apiAdminUpdateRealityTvQuestionPack !== "function" ||
      typeof apiAdminBuildRealityTvEpisodeQuestions !== "function") {
    return false;
  }

  var originals = REALITY_TV_QUESTION_POOL_R6.originals;
  originals.materialize = realityTvMaterializeEpisodeQuestionPackBulk_;
  originals.updatePack = apiAdminUpdateRealityTvQuestionPack;
  originals.buildPack = apiAdminBuildRealityTvEpisodeQuestions;

  realityTvMaterializeEpisodeQuestionPackBulk_ = function(season, episode, options) {
    options = options || {};
    realityTvR6EnsureSchema_();
    var settings = realityTvR6PoolSettings_(season);
    if (!settings.enabled || options.__r6Resolved === true || realityTvR6RequestedLooksExplicit_(season.SeasonId, options.enabledTypes)) {
      return originals.materialize(season, episode, options);
    }
    var selected = realityTvR6SelectForEpisode_(season, episode, {
      regenerate: options.regenerate === true,
      rng: options.rng
    }).map(function(row) { return realityTvR6Key_(row.TemplateId); });
    var nextOptions = Object.assign({}, options, { enabledTypes: selected, __r6Resolved: true });
    return originals.materialize(season, episode, nextOptions);
  };

  apiAdminUpdateRealityTvQuestionPack = function(payload) {
    payload = payload || {};
    realityTvR6EnsureSchema_();
    var wantsBuild = payload.buildCurrentEpisode === true || String(payload.buildCurrentEpisode || "").toLowerCase() === "true";
    var delegated = Object.assign({}, payload);
    if (wantsBuild && Object.prototype.hasOwnProperty.call(payload, "questionPoolEnabled") && realityTvR6Bool_(payload.questionPoolEnabled)) {
      delegated.buildCurrentEpisode = false;
    }
    var result = originals.updatePack(delegated);
    realityTvR6PersistPoolSettings_(payload);
    if (wantsBuild && realityTvR6Bool_(payload.questionPoolEnabled)) {
      var buildPayload = {
        seasonId: payload.seasonId,
        episodeId: payload.episodeId || payload.currentEpisodeId || ""
      };
      result = Object.assign({}, result || {}, { build: apiAdminBuildRealityTvEpisodeQuestions(buildPayload) });
    }
    return result;
  };

  apiAdminBuildRealityTvEpisodeQuestions = function(payload) {
    payload = payload || {};
    realityTvR6EnsureSchema_();
    var season = typeof realityTvGetSeason_ === "function" ? realityTvGetSeason_(payload.seasonId) : null;
    if (!season) return originals.buildPack(payload);
    var settings = realityTvR6PoolSettings_(season);
    if (!settings.enabled) return originals.buildPack(payload);
    var episode = null;
    if (payload.episodeId && typeof realityTvGetEpisode_ === "function") episode = realityTvGetEpisode_(payload.episodeId);
    if (!episode && typeof realityTvEpisodesForSeason_ === "function") {
      var episodes = realityTvEpisodesForSeason_(season.SeasonId);
      var targetNumber = realityTvR6Integer_(payload.episodeNumber || season.CurrentEpisodeNumber, 0);
      episode = episodes.find(function(row) { return realityTvR6Integer_(row.EpisodeNumber, 0) === targetNumber; }) || episodes[0] || null;
    }
    if (!episode) return originals.buildPack(payload);

    if (payload.regenerate === true || String(payload.regenerate || "").toLowerCase() === "true") {
      realityTvR6DeleteExistingSelection_(season, episode);
    }
    var selected = realityTvR6SelectForEpisode_(season, episode, {
      regenerate: payload.regenerate === true || String(payload.regenerate || "").toLowerCase() === "true"
    }).map(function(row) { return realityTvR6Key_(row.TemplateId); });
    return originals.materialize(season, episode, {
      enabledTypes: selected,
      managedBy: "ADMIN",
      regenerate: payload.regenerate === true || String(payload.regenerate || "").toLowerCase() === "true",
      __r6Resolved: true
    });
  };

  REALITY_TV_QUESTION_POOL_R6.installed = true;
  return true;
}

// Apps Script loads project files into one global runtime. This additive R6 file
// is named after the existing Reality engines and installs only after the
// authoritative functions are available. If a test harness evaluates files in
// a different order it may call realityTvR6Install_() explicitly.
realityTvR6Install_();