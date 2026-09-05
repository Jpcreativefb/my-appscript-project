/* =========================================================
   PERMANENT GAME PURGE — RC24B DRY-RUN / FIXTURE GATE

   Baseline reviewed:
     architecture-cleanup
     e3627c57da015ac08eb65cd928378fdcb63d2cdc
     Awards App v379

   SAFETY GATE:
   - Production purge is intentionally DISABLED in RC24B.
   - The production API exposes a read-only Dry Run only.
   - No partial / wildcard / display-name deletion is supported.
   - Fixture execution is available only through an injected in-memory
     adapter used by focused tests; it never opens SpreadsheetApp.
========================================================= */

const PERMANENT_GAME_PURGE_RC24B_VERSION = "rc24b-dryrun-v1";
const PERMANENT_GAME_PURGE_PRODUCTION_ENABLED = false;
const PERMANENT_GAME_PURGE_AUDIT_SHEET = "PermanentGamePurgeAudit";

const PERMANENT_GAME_PURGE_AUDIT_HEADERS = [
  "Timestamp", "Action", "GameId", "GameName", "RequestedBy",
  "DiscoveredCountsJSON", "DeletedCountsJSON", "BlockedDependenciesJSON",
  "RetainedSharedAssetsJSON", "FinalResult", "RemainingReferenceCount",
  "ErrorMessage", "Version"
];

/*
  Explicit allowlist only.  This is deliberately not a generic spreadsheet
  cleanup utility.  Every store is here because the e3627c5 codebase contains
  a known GameId/equivalent ownership path or a previously-audited Reality /
  Awards path.

  phase is the future child-first deletion order.  Games is always phase 1000.
*/
const PERMANENT_GAME_PURGE_OWNED_SPECS = [
  // Durable jobs / queues / operational traces first.
  { scope:"MAIN", sheet:"ExternalResultsHubOutbox", match:"OUTBOX", phase:5, area:"External Results", source:"ExternalResultsHubBridgeEngine.js", note:"Target can be in EntityKey/PayloadJSON. Quiesce worker before any future deletion." },
  { scope:"MAIN", sheet:"RealityNextEpisodeJobs", key:"GameId", phase:5, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealityQuestionBuildJobs", key:"GameId", phase:5, area:"Reality", source:"RealityTvQuestionPackEngine.js" },
  { scope:"MAIN", sheet:"ScoringRuns", key:"GameId", phase:10, area:"Derived scoring", source:"ScoringAutomationEngine.js" },
  { scope:"MAIN", sheet:"ResultEvents", key:"GameId", phase:10, area:"Derived scoring", source:"ScoringAutomationEngine.js" },
  { scope:"MAIN", sheet:"NotificationLog", key:"GameId", phase:10, area:"Notifications", source:"NotificationsEngine.js" },
  { scope:"MAIN", sheet:"StorageMigrationLog", key:"GameId", phase:10, area:"Storage history", source:"NormalizedQuestionStorageEngine.js", note:"Strict owner request treats old target migration trace as purge-owned; purge audit is separate and retained." },
  { scope:"MAIN", sheet:"ArchiveManifest", key:"GameId", phase:10, area:"Archive history", source:"NormalizedQuestionStorageEngine.js / ArchiveHistoryEngine.js", note:"Manifest row is target-owned; referenced archive file may be shared and is never auto-deleted in RC24B." },

  { scope:"MAIN", sheet:"RealityResultQueue", key:"GameId", phase:15, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealityQuestionResultQueue", key:"GameId", phase:15, area:"Reality", source:"RealityTvQuestionPackEngine.js" },
  { scope:"MAIN", sheet:"UserNotifications", key:"GameId", phase:15, area:"Notifications", source:"NotificationsEngine.js" },

  // Picks / selections / user choices.
  { scope:"MAIN", sheet:"Picks", key:"GameId", phase:20, area:"Prediction", source:"PicksEngine.js" },
  { scope:"MAIN", sheet:"Bets", key:"GameId", phase:20, area:"Wager", source:"BettingEngine.js" },
  { scope:"MAIN", sheet:"RankingEntryItems", key:"GameId", phase:20, area:"Ranking", source:"RankingGameEngine.js" },
  { scope:"MAIN", sheet:"CompetitionVotes", key:"GameId", phase:20, area:"Voting competition", source:"VotingCompetitionEngine.js" },
  { scope:"MAIN", sheet:"SurvivorPicks", key:"GameId", phase:20, area:"KOTH", source:"KingOfHillEngine.js" },
  { scope:"MAIN", sheet:"RealityEpisodeVotes", key:"GameId", phase:20, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"UserSeasonAnchors", key:"GameId", phase:20, area:"Reality / Sole Survivor", source:"SeasonAnchorEngine.js" },

  // Scores / results / history.
  { scope:"MAIN", sheet:"CategoryResults", key:"GameId", phase:30, area:"Results", source:"CategoryResultsEngine.js" },
  { scope:"MAIN", sheet:"LiveLeaderboardSnapshot", key:"GameId", phase:30, area:"Derived scoring", source:"ScoringAutomationEngine.js" },
  { scope:"MAIN", sheet:"CompetitionResults", key:"GameId", phase:30, area:"Voting competition", source:"VotingCompetitionEngine.js" },
  { scope:"MAIN", sheet:"SurvivorEliminations", key:"GameId", phase:30, area:"KOTH", source:"KingOfHillEngine.js" },
  { scope:"MAIN", sheet:"SeasonAnchorHistory", key:"GameId", phase:30, area:"Reality / Sole Survivor", source:"SeasonAnchorEngine.js" },

  // League / access relationships. Leagues and LeagueMembers themselves are shared.
  { scope:"MAIN", sheet:"LeagueSeasonMembership", key:"SeasonGameId", phase:40, area:"League access", source:"LeagueAccessEngine.js" },
  { scope:"MAIN", sheet:"LeagueGames", key:"GameId", phase:40, area:"League access", source:"LeagueAccessEngine.js" },
  { scope:"MAIN", sheet:"GameFeatureAccess", key:"GameId", phase:40, area:"League access", source:"LeagueAccessEngine.js" },

  // Entries.
  { scope:"MAIN", sheet:"RankingEntries", key:"GameId", phase:50, area:"Ranking", source:"RankingGameEngine.js" },
  { scope:"MAIN", sheet:"CompetitionEntries", key:"GameId", phase:50, area:"Voting competition", source:"VotingCompetitionEngine.js" },

  // External/local staging and provider configuration owned by the app game.
  { scope:"MAIN", sheet:"ExternalResultsInbox", key:"AppGameId", phase:55, area:"External Results", source:"ExternalResultsHubBridgeEngine.js" },
  { scope:"MAIN", sheet:"InternetResultImports", key:"GameId", phase:55, area:"Internet results", source:"InternetResultsEngine.js" },
  { scope:"MAIN", sheet:"ManualResultSuggestions", key:"GameId", phase:55, area:"Internet results", source:"InternetResultsEngine.js" },

  // Generic question/settings layer. CategorySettings is special because GameId is optional.
  { scope:"MAIN", sheet:"CategorySettings", match:"CATEGORY_SETTINGS", phase:60, area:"Question settings", source:"SettingsEngine.js", note:"GameId can be blank. Ownership is derived from the pre-captured target CategoryId/QuestionId map. Ambiguity blocks." },
  { scope:"MAIN", sheet:"InternetResultSources", key:"GameId", phase:60, area:"Internet results", source:"InternetResultsEngine.js" },
  { scope:"MAIN", sheet:"SurvivorGameSettings", key:"GameId", phase:60, area:"Survivor / elimination", source:"SurvivorGameEngine.js" },
  { scope:"MAIN", sheet:"SurvivorSettings", key:"GameId", phase:60, area:"KOTH", source:"KingOfHillEngine.js", note:"Other games' source JSON is scanned separately as an inbound dependency." },
  { scope:"MAIN", sheet:"RealityQuestionTemplates", key:"GameId", phase:60, area:"Reality", source:"RealityTvQuestionPackEngine.js" },
  { scope:"MAIN", sheet:"RealityEpisodeQuestions", key:"GameId", phase:60, area:"Reality", source:"RealityTvQuestionPackEngine.js" },
  { scope:"MAIN", sheet:"SeasonAnchorSettings", key:"GameId", phase:60, area:"Reality / Sole Survivor", source:"SeasonAnchorEngine.js" },

  // Reality child model.
  { scope:"MAIN", sheet:"RealityContestantGroupHistory", key:"GameId", phase:62, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealitySpoilerShield", key:"GameId", phase:62, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealityGroups", key:"GameId", phase:64, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealityContestants", key:"GameId", phase:64, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealityCastImport", key:"GameId", phase:64, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealityEpisodes", key:"GameId", phase:66, area:"Reality", source:"RealityTvSeasonEngine.js" },
  { scope:"MAIN", sheet:"RealitySeasons", key:"GameId", phase:68, area:"Reality", source:"RealityTvSeasonEngine.js" },

  // Per-game profile/appearance only; shared profile scopes/packs are preserved.
  { scope:"MAIN", sheet:"UserGameProfiles", key:"GameId", phase:70, area:"Profiles", source:"ProfileEngine.js" },
  { scope:"MAIN", sheet:"AppearanceOverrides", key:"GameId", phase:70, area:"Appearance", source:"AppearanceEngine.js" },
  { scope:"MAIN", sheet:"GameAppearance", key:"GameId", phase:72, area:"Appearance", source:"AppearanceEngine.js" },

  // Canonical/legacy question rows after settings association has been captured.
  { scope:"MAIN", sheet:"QuestionOptions", key:"GameId", phase:75, area:"Question storage", source:"NormalizedQuestionStorageEngine.js" },
  { scope:"MAIN", sheet:"Questions", key:"GameId", phase:76, area:"Question storage", source:"NormalizedQuestionStorageEngine.js" },
  { scope:"MAIN", sheet:"Categories", key:"GameId", phase:77, area:"Legacy question projection", source:"CategoriesEngine.js" },

  // Derived index last among data rows.
  { scope:"MAIN", sheet:"DataIndex", key:"GameId", phase:80, area:"Index", source:"NormalizedQuestionStorageEngine.js" },

  // Hub rows are in the separate External Results Hub spreadsheet.
  { scope:"HUB", sheet:"AppMappings", key:"AppGameId", phase:50, area:"External Results Hub", source:"external-results-hub/HubCore.js / ResultSourcePolicy.js" },
  { scope:"HUB", sheet:"ResultSourcePolicies", key:"AppGameId", phase:50, area:"External Results Hub", source:"external-results-hub/HubCore.js / ResultSourcePolicy.js" },

  // Core identity is deliberately last.
  { scope:"MAIN", sheet:"Games", key:"GameId", phase:1000, area:"Core game identity", source:"GamesEngine.js", note:"Must be deleted last in a future authorized purge." }
];

const PERMANENT_GAME_PURGE_CONDITIONAL_SPECS = [
  { scope:"MAIN", sheet:"Votes", key:"CommunityGameId", area:"Legacy community voting", source:"VotingEngine.js", classification:"REFERENCE — CHECK/BLOCK", note:"CommunityGameId is not proven identical to PATTC GameId for every game type. Matching rows require explicit ownership confirmation before deletion." },
  { scope:"MAIN", sheet:"ResultsSnapshots", key:"GameId", area:"Legacy results snapshot", source:"ResultsEngine.js", classification:"NOT APPLICABLE", note:"Exact baseline declares RESULTS_SNAPSHOT_SHEET but the audited ResultsEngine did not show an active persistence path. Preserve until another writer/schema proves ownership." }
];

const PERMANENT_GAME_PURGE_SHARED_SPECS = [
  { scope:"MAIN", sheet:"Leagues", area:"League access", source:"LeagueAccessEngine.js", classification:"SHARED — PRESERVE", note:"League entity has no GameId." },
  { scope:"MAIN", sheet:"LeagueMembers", area:"League access", source:"LeagueAccessEngine.js", classification:"SHARED — PRESERVE", note:"Membership is league-level; target game assignment is in LeagueGames/LeagueSeasonMembership." },
  { scope:"MAIN", sheet:"LeaguePlanAccess", area:"League access", source:"LeagueAccessEngine.js", classification:"SHARED — PRESERVE" },
  { scope:"MAIN", sheet:"Users", area:"Profiles/auth-adjacent data", source:"ProfileEngine.js", classification:"SHARED — PRESERVE", note:"General user profile is shared. Purge must not delete user/auth records." },
  { scope:"MAIN", sheet:"UserProfileScopes", area:"Profiles", source:"ProfileEngine.js", classification:"SHARED — PRESERVE", note:"Season/profile scopes are reusable across games and have no GameId." },
  { scope:"MAIN", sheet:"UserNotificationPreferences", area:"Notifications", source:"NotificationsEngine.js", classification:"SHARED — PRESERVE" },
  { scope:"MAIN", sheet:"AppearanceImagePacks", area:"Appearance", source:"AppearanceEngine.js", classification:"SHARED — PRESERVE" },
  { scope:"MAIN", sheet:"AppearanceImagePackItems", area:"Appearance", source:"AppearanceEngine.js", classification:"SHARED — PRESERVE" },
  { scope:"MAIN", sheet:"AppearanceThemePacks", area:"Appearance", source:"AppearanceEngine.js", classification:"SHARED — PRESERVE" },
  { scope:"MAIN", sheet:"AppearanceHubSettings", area:"Appearance", source:"AppearanceEngine.js", classification:"SHARED — PRESERVE" },
  { scope:"MAIN", sheet:PERMANENT_GAME_PURGE_AUDIT_SHEET, area:"Purge audit", source:"PermanentGamePurgeEngine.js", classification:"SHARED — PRESERVE", note:"Intentional retained audit trail. Its GameId is excluded from zero-removable-reference success." },

  { scope:"HUB", sheet:"ProviderSettings", area:"External Results Hub", source:"external-results-hub/HubCore.js", classification:"SHARED — PRESERVE" },
  { scope:"HUB", sheet:"ExternalEvents", area:"External Results Hub", source:"external-results-hub/HubCore.js", classification:"SHARED — PRESERVE" },
  { scope:"HUB", sheet:"ExternalMarkets", area:"External Results Hub", source:"external-results-hub/HubCore.js", classification:"SHARED — PRESERVE" },
  { scope:"HUB", sheet:"ExternalSubjects", area:"External Results Hub", source:"external-results-hub/HubCore.js", classification:"SHARED — PRESERVE" },
  { scope:"HUB", sheet:"ImportedResults", area:"External Results Hub", source:"external-results-hub/HubCore.js / ReviewAndBridge.js", classification:"SHARED — PRESERVE", note:"Provider observation can fan out to multiple AppMappings/games." },
  { scope:"HUB", sheet:"ReviewQueue", area:"External Results Hub", source:"external-results-hub/HubCore.js / ReviewAndBridge.js", classification:"SHARED — PRESERVE", note:"Review row is provider-result owned and carries no AppGameId." },
  { scope:"HUB", sheet:"SyncLog", area:"External Results Hub", source:"external-results-hub/HubCore.js", classification:"SHARED — PRESERVE" },
  { scope:"HUB", sheet:"ManualEntry", area:"External Results Hub", source:"external-results-hub/HubCore.js", classification:"SHARED — PRESERVE" }
];

const PERMANENT_GAME_PURGE_SPORTS_BOUNDARY = [
  { sheet:"SportsScores", key:"GameId", decision:"SHARED/PROTECTED — PRESERVE", reason:"Sports Engine v55 uses GameId for sports-event identity; it is not proven to be PATTC app GameId." },
  { sheet:"SportsSnapshots", key:"GameId", decision:"SHARED/PROTECTED — PRESERVE", reason:"Sports event snapshots; no app-game ownership is inferred." },
  { sheet:"SportsGames", key:"GameId", decision:"SHARED/PROTECTED — PRESERVE", reason:"Sports event registry. PATTC questions reference it through SportsGameId/ESPNEventId." },
  { sheet:"SportsOdds", key:"OddsId / event fields", decision:"SHARED/PROTECTED — PRESERVE", reason:"Provider odds are reusable across app games." },
  { sheet:"SportsSettings", key:"sport/league/job settings", decision:"SHARED/PROTECTED — PRESERVE", reason:"Shared Sports Engine configuration." },
  { sheet:"SportsLogs", key:"operational", decision:"SHARED/PROTECTED — PRESERVE", reason:"Shared Sports Engine logs." }
];

const PERMANENT_GAME_PURGE_FILE_REFERENCE_SPECS = [
  { scope:"MAIN", sheet:"Games", columns:["HeroImageFileID"] },
  { scope:"MAIN", sheet:"Categories", columns:["FileID", "CategoryImage"] },
  { scope:"MAIN", sheet:"QuestionOptions", columns:["FileID"] },
  { scope:"MAIN", sheet:"CompetitionEntries", columns:["EntryImageFileID"] },
  { scope:"MAIN", sheet:"UserGameProfiles", columns:["AvatarFileId"] },
  { scope:"MAIN", sheet:"UserProfileScopes", columns:["AvatarFileId"] },
  { scope:"MAIN", sheet:"Users", columns:["AvatarFileId"] },
  { scope:"MAIN", sheet:"AppearanceOverrides", columns:["ImageFileId"] },
  { scope:"MAIN", sheet:"AppearanceImagePackItems", columns:["ImageFileId"] },
  { scope:"MAIN", sheet:"AppearanceHubSettings", columns:["ImageFileId", "IconFileId"] }
];

const PERMANENT_GAME_PURGE_JSON_SINGLE_GAME_KEYS = [
  "gameId", "GameId", "appGameId", "AppGameId",
  "sourceGameId", "SourceGameId", "combinedSourceGameId", "CombinedSourceGameId",
  "parentGameId", "ParentGameId"
];

const PERMANENT_GAME_PURGE_JSON_MULTI_GAME_KEYS = [
  "gameIds", "GameIds", "sourceGameIds", "SourceGameIds",
  "combinedSourceGameIds", "CombinedSourceGameIds"
];

function permanentGamePurgeString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function permanentGamePurgeBool_(value, fallback) {
  if (value === "" || value === undefined || value === null) return fallback === true;
  if (value === true || value === false) return value;
  return ["true", "1", "yes", "on"].indexOf(permanentGamePurgeString_(value).toLowerCase()) !== -1;
}

function permanentGamePurgeNowIso_() {
  return new Date().toISOString();
}

function permanentGamePurgeExact_(value, gameId) {
  return permanentGamePurgeString_(value) === gameId;
}

function permanentGamePurgeParseJson_(value, fallback) {
  if (value && typeof value === "object") return value;
  const text = permanentGamePurgeString_(value);
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (err) { return fallback; }
}

function permanentGamePurgeArrayContainsExact_(value, gameId) {
  if (Array.isArray(value)) {
    return value.some(function(item) { return permanentGamePurgeString_(item) === gameId; });
  }
  const text = permanentGamePurgeString_(value);
  if (!text) return false;
  const parsed = permanentGamePurgeParseJson_(text, null);
  if (Array.isArray(parsed)) return permanentGamePurgeArrayContainsExact_(parsed, gameId);
  return text.split(/\s*,\s*|\s*\|\s*/).some(function(item) {
    return permanentGamePurgeString_(item) === gameId;
  });
}

function permanentGamePurgeJsonReferencesGame_(value, gameId) {
  const root = permanentGamePurgeParseJson_(value, value && typeof value === "object" ? value : null);
  if (!root || typeof root !== "object") return false;
  let found = false;

  function walk(node) {
    if (found || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    Object.keys(node).forEach(function(key) {
      if (found) return;
      const item = node[key];
      if (PERMANENT_GAME_PURGE_JSON_SINGLE_GAME_KEYS.indexOf(key) !== -1) {
        if (permanentGamePurgeString_(item) === gameId) found = true;
        return;
      }
      if (PERMANENT_GAME_PURGE_JSON_MULTI_GAME_KEYS.indexOf(key) !== -1) {
        if (permanentGamePurgeArrayContainsExact_(item, gameId)) found = true;
        return;
      }
      if (item && typeof item === "object") walk(item);
    });
  }

  walk(root);
  return found;
}

function permanentGamePurgeOutboxReferencesGame_(row, gameId) {
  row = row || {};
  const entityKey = permanentGamePurgeString_(row.EntityKey);
  if (entityKey && entityKey.split("|").some(function(token) {
    return permanentGamePurgeString_(token) === gameId;
  })) return true;
  return permanentGamePurgeJsonReferencesGame_(row.PayloadJSON, gameId);
}

function permanentGamePurgeRows_(adapter, scope, sheetName) {
  try {
    return adapter.getRows(scope, sheetName) || [];
  } catch (err) {
    throw new Error("Read failed for " + scope + ":" + sheetName + " — " + (err && err.message ? err.message : err));
  }
}

function permanentGamePurgeBuildQuestionOwnership_(adapter) {
  const owners = {};
  function add(scope, sheet, idField) {
    permanentGamePurgeRows_(adapter, scope, sheet).forEach(function(row) {
      const gameId = permanentGamePurgeString_(row.GameId);
      const id = permanentGamePurgeString_(row[idField]).toLowerCase();
      if (!gameId || !id) return;
      if (!owners[id]) owners[id] = {};
      owners[id][gameId] = true;
    });
  }
  add("MAIN", "Questions", "QuestionId");
  add("MAIN", "Categories", "CategoryId");
  return owners;
}

function permanentGamePurgeBuildTargetCategorySet_(adapter, gameId) {
  const ids = {};
  function add(scope, sheet, gameField, idFields) {
    permanentGamePurgeRows_(adapter, scope, sheet).forEach(function(row) {
      if (!permanentGamePurgeExact_(row[gameField], gameId)) return;
      (idFields || []).forEach(function(idField) {
        const id = permanentGamePurgeString_(row[idField]).toLowerCase();
        if (id) ids[id] = true;
      });
    });
  }
  add("MAIN", "Questions", "GameId", ["QuestionId"]);
  add("MAIN", "Categories", "GameId", ["CategoryId"]);
  add("MAIN", "CategoryResults", "GameId", ["CategoryId"]);
  add("MAIN", "Picks", "GameId", ["CategoryId"]);
  add("MAIN", "RealityEpisodes", "GameId", ["CategoryId"]);
  add("MAIN", "RealityEpisodeQuestions", "GameId", ["CategoryId"]);
  add("MAIN", "RealityResultQueue", "GameId", ["CategoryId"]);
  add("MAIN", "RealityQuestionResultQueue", "GameId", ["CategoryId"]);
  add("MAIN", "ExternalResultsInbox", "AppGameId", ["CategoryId"]);
  add("HUB", "AppMappings", "AppGameId", ["CategoryId"]);
  add("HUB", "ResultSourcePolicies", "AppGameId", ["CategoryId"]);
  return ids;
}

function permanentGamePurgeContext_(adapter, gameId) {
  return {
    gameId: gameId,
    categoryOwners: permanentGamePurgeBuildQuestionOwnership_(adapter),
    targetCategoryIds: permanentGamePurgeBuildTargetCategorySet_(adapter, gameId),
    ambiguousCategorySettings: []
  };
}

function permanentGamePurgeCategorySettingsOwned_(row, ctx) {
  const rowGameId = permanentGamePurgeString_(row.GameId);
  if (rowGameId) return rowGameId === ctx.gameId;
  const categoryId = permanentGamePurgeString_(row.CategoryId).toLowerCase();
  if (!categoryId || !ctx.targetCategoryIds[categoryId]) return false;
  const owners = Object.keys(ctx.categoryOwners[categoryId] || {});
  const foreignOwners = owners.filter(function(owner) { return owner !== ctx.gameId; });
  if (foreignOwners.length) {
    ctx.ambiguousCategorySettings.push({
      categoryId: categoryId,
      owners: owners.slice(),
      rowNumber: row.__rowNumber || ""
    });
    return false;
  }
  return true;
}

function permanentGamePurgeSpecMatches_(spec, row, ctx) {
  if (!spec || !row) return false;
  if (spec.match === "OUTBOX") return permanentGamePurgeOutboxReferencesGame_(row, ctx.gameId);
  if (spec.match === "CATEGORY_SETTINGS") return permanentGamePurgeCategorySettingsOwned_(row, ctx);
  return permanentGamePurgeExact_(row[spec.key], ctx.gameId);
}

function permanentGamePurgeActiveGameMap_(games) {
  const map = {};
  (games || []).forEach(function(row) {
    const id = permanentGamePurgeString_(row.GameId);
    if (!id) return;
    map[id] = permanentGamePurgeBool_(row.Active, true) && !permanentGamePurgeBool_(row.Archived, false);
  });
  return map;
}

function permanentGamePurgeFindInboundDependencies_(adapter, game, ctx) {
  const deps = [];
  const warnings = [];
  const games = permanentGamePurgeRows_(adapter, "MAIN", "Games");
  const activeMap = permanentGamePurgeActiveGameMap_(games);

  // Active child / parent relationships from the canonical Games model.
  games.forEach(function(row) {
    const otherId = permanentGamePurgeString_(row.GameId);
    if (!otherId || otherId === ctx.gameId) return;
    if (!permanentGamePurgeExact_(row.ParentGameId, ctx.gameId)) return;
    const item = {
      type: "PARENT_CHILD",
      referencedByGameId: otherId,
      field: "Games.ParentGameId",
      message: "BLOCKED — REFERENCED BY " + otherId + " / Games.ParentGameId"
    };
    if (activeMap[otherId] !== false) deps.push(item); else warnings.push(item);
  });

  const parentId = permanentGamePurgeString_(game.ParentGameId);
  if (parentId && permanentGamePurgeBool_(game.IncludeInParent, true) && activeMap[parentId] !== false) {
    deps.push({
      type: "PARENT_CHILD",
      referencedByGameId: parentId,
      field: "target Games.ParentGameId + IncludeInParent",
      message: "BLOCKED — REFERENCED BY " + parentId + " / parent season aggregation"
    });
  }

  if (permanentGamePurgeBool_(game.DefaultGame, false)) {
    deps.push({
      type: "DEFAULT_GAME",
      referencedByGameId: ctx.gameId,
      field: "Games.DefaultGame",
      message: "BLOCKED — REFERENCED BY default-game configuration; choose/verify replacement before purge"
    });
  }

  // KOTH source-game and combined-source references. The exact key family is
  // compatible with the protected SportsSurvivorEngine reader without editing it.
  permanentGamePurgeRows_(adapter, "MAIN", "SurvivorSettings").forEach(function(row) {
    const ownerGameId = permanentGamePurgeString_(row.GameId);
    if (!ownerGameId || ownerGameId === ctx.gameId) return;
    const hit = permanentGamePurgeJsonReferencesGame_(row.TeamSourceConfigJSON, ctx.gameId) ||
      permanentGamePurgeJsonReferencesGame_(row.EliminationSourceConfigJSON, ctx.gameId);
    if (!hit) return;
    const item = {
      type: "KOTH_SOURCE",
      referencedByGameId: ownerGameId,
      field: "SurvivorSettings.TeamSourceConfigJSON/EliminationSourceConfigJSON",
      message: "BLOCKED — REFERENCED BY " + ownerGameId + " / KOTH source game"
    };
    if (activeMap[ownerGameId] !== false) deps.push(item); else warnings.push(item);
  });

  // Explicit foreign source configurations in current main-app engines.
  [
    { sheet:"InternetResultSources", ownerField:"GameId", jsonFields:["SourceConfigJSON"] },
    { sheet:"CategorySettings", ownerField:"GameId", jsonFields:["SourceConfigJSON"] }
  ].forEach(function(spec) {
    permanentGamePurgeRows_(adapter, "MAIN", spec.sheet).forEach(function(row) {
      let ownerGameId = permanentGamePurgeString_(row[spec.ownerField]);
      if (!ownerGameId && spec.sheet === "CategorySettings") {
        const categoryId = permanentGamePurgeString_(row.CategoryId).toLowerCase();
        const owners = Object.keys(ctx.categoryOwners[categoryId] || {});
        if (owners.length === 1) ownerGameId = owners[0];
      }
      if (!ownerGameId || ownerGameId === ctx.gameId) return;
      const hit = spec.jsonFields.some(function(field) {
        return permanentGamePurgeJsonReferencesGame_(row[field], ctx.gameId);
      });
      if (!hit) return;
      const item = {
        type: "SCORING_SOURCE",
        referencedByGameId: ownerGameId,
        field: spec.sheet + ".SourceConfigJSON",
        message: "BLOCKED — REFERENCED BY " + ownerGameId + " / " + spec.sheet + ".SourceConfigJSON"
      };
      if (activeMap[ownerGameId] !== false) deps.push(item); else warnings.push(item);
    });
  });

  // Cross-spreadsheet Hub mapping source-config references owned by another app game.
  permanentGamePurgeRows_(adapter, "HUB", "AppMappings").forEach(function(row) {
    const ownerGameId = permanentGamePurgeString_(row.AppGameId);
    if (!ownerGameId || ownerGameId === ctx.gameId) return;
    if (!permanentGamePurgeJsonReferencesGame_(row.SourceConfigJSON, ctx.gameId)) return;
    const item = {
      type: "EXTERNAL_RESULTS_SOURCE",
      referencedByGameId: ownerGameId,
      field: "Hub AppMappings.SourceConfigJSON",
      message: "BLOCKED — REFERENCED BY " + ownerGameId + " / External Results mapping source"
    };
    if (activeMap[ownerGameId] !== false) deps.push(item); else warnings.push(item);
  });

  if (ctx.ambiguousCategorySettings.length) {
    ctx.ambiguousCategorySettings.forEach(function(item) {
      deps.push({
        type: "AMBIGUOUS_CATEGORY_SETTINGS",
        referencedByGameId: item.owners.join(", "),
        field: "CategorySettings.CategoryId",
        message: "BLOCKED — REFERENCED BY ambiguous CategoryId " + item.categoryId + " / owners: " + item.owners.join(", ")
      });
    });
  }

  const hubStatus = typeof adapter.getHubStatus === "function" ? adapter.getHubStatus() : { configured:true, readable:true };
  if (hubStatus && hubStatus.configured && hubStatus.readable === false) {
    deps.push({
      type:"HUB_SCAN_FAILED",
      referencedByGameId:"",
      field:"External Results Hub",
      message:"BLOCKED — ROY DECISION REQUIRED / External Results Hub could not be read: " + permanentGamePurgeString_(hubStatus.error)
    });
  }

  return { blockers: deps, warnings: warnings };
}

function permanentGamePurgeTargetOwnedRow_(sheet, row, gameId, ctx) {
  if (!row) return false;
  if (sheet === "CategorySettings") return permanentGamePurgeCategorySettingsOwned_(row, ctx);
  if (sheet === "LeagueSeasonMembership") return permanentGamePurgeExact_(row.SeasonGameId, gameId);
  if (sheet === "ExternalResultsInbox") return permanentGamePurgeExact_(row.AppGameId, gameId);
  if (sheet === "ExternalResultsHubOutbox") return permanentGamePurgeOutboxReferencesGame_(row, gameId);
  if (sheet === "AppMappings" || sheet === "ResultSourcePolicies") return permanentGamePurgeExact_(row.AppGameId, gameId);
  if (sheet === "Votes") return permanentGamePurgeExact_(row.CommunityGameId, gameId);
  return permanentGamePurgeExact_(row.GameId, gameId);
}

function permanentGamePurgeCollectAssets_(adapter, ctx, matchRowsByStore) {
  const candidate = {};

  PERMANENT_GAME_PURGE_FILE_REFERENCE_SPECS.forEach(function(spec) {
    const storeKey = spec.scope + ":" + spec.sheet;
    const matched = matchRowsByStore[storeKey] || [];
    matched.forEach(function(row) {
      spec.columns.forEach(function(column) {
        const fileId = permanentGamePurgeString_(row[column]);
        if (!fileId) return;
        if (!candidate[fileId]) candidate[fileId] = { fileId:fileId, targetReferences:[], otherReferences:[] };
        candidate[fileId].targetReferences.push(storeKey + "." + column);
      });
    });
  });

  Object.keys(candidate).forEach(function(fileId) {
    PERMANENT_GAME_PURGE_FILE_REFERENCE_SPECS.forEach(function(spec) {
      permanentGamePurgeRows_(adapter, spec.scope, spec.sheet).forEach(function(row) {
        spec.columns.forEach(function(column) {
          if (permanentGamePurgeString_(row[column]) !== fileId) return;
          const isTarget = permanentGamePurgeTargetOwnedRow_(spec.sheet, row, ctx.gameId, ctx);
          const ref = spec.scope + ":" + spec.sheet + "." + column;
          if (!isTarget && candidate[fileId].otherReferences.indexOf(ref) === -1) {
            candidate[fileId].otherReferences.push(ref);
          }
        });
      });
    });

    const explicit = typeof adapter.getAssetOwnership === "function"
      ? adapter.getAssetOwnership(fileId)
      : null;
    const provenOwned = !!(explicit && explicit.ownerGameId === ctx.gameId);
    const hasOtherRefs = candidate[fileId].otherReferences.length > 0;
    candidate[fileId].provenOwnedByTarget = provenOwned;
    candidate[fileId].knownShared = hasOtherRefs || !!(explicit && explicit.shared === true);
    candidate[fileId].decision = provenOwned && !candidate[fileId].knownShared
      ? "OWNED — DELETE (fixture/proven ownership only)"
      : "SHARED/UNPROVEN — PRESERVE";
    if (!provenOwned) {
      candidate[fileId].reason = hasOtherRefs
        ? "Other surviving references exist."
        : "No explicit production ownership registry proves this Drive file belongs exclusively to the target GameId.";
    }
  });

  return Object.keys(candidate).map(function(fileId) { return candidate[fileId]; });
}

function permanentGamePurgeCachePlan_(adapter, ctx, matchRowsByStore) {
  const gameId = ctx.gameId;
  const users = {};
  const episodes = {};

  ["MAIN:Picks", "MAIN:Bets", "MAIN:RealitySpoilerShield", "MAIN:UserGameProfiles", "MAIN:UserSeasonAnchors"].forEach(function(key) {
    (matchRowsByStore[key] || []).forEach(function(row) {
      const username = permanentGamePurgeString_(row.Username);
      if (username) users[username] = true;
    });
  });
  (matchRowsByStore["MAIN:RealityEpisodes"] || []).forEach(function(row) {
    const n = permanentGamePurgeString_(row.EpisodeNumber);
    if (n) episodes[n] = true;
  });

  const scoped = [
    "survivor_state_v1_" + gameId,
    "survivor_game_v1__" + gameId,
    "ranking_leaderboard_v1__" + gameId,
    "competition_entries_v1__" + gameId,
    "competition_leaderboard_v1__" + gameId,
    "external_live_probabilities_v1_" + gameId.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0,120),
    "results_v4__" + gameId.toLowerCase(),
    "rtv_user_core_" + gameId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  ];
  Object.keys(episodes).forEach(function(n) {
    scoped.push("rtv_episode_compare_" + gameId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "_" + n);
  });

  return {
    scopedKeys: scoped,
    perUserPatterns: Object.keys(users).map(function(username) {
      return {
        username:username,
        keys:[
          "user_picks_v1_<MD5(" + username.toLowerCase() + "|" + gameId + ")>",
          "bets_user_v2_<MD5(...)>",
          "bets_game_v1_<MD5(...)>",
          "startup_payload_v1_<" + username.toLowerCase() + ">_<" + gameId.toLowerCase() + ">",
          "rtv_player_stats_<" + gameId + ">_<" + username + ">"
        ]
      };
    }),
    surgicalSharedContainers:[
      {
        key:"games_v3_hybrid_standard_predictions",
        action:"REWRITE WITHOUT TARGET; DO NOT GLOBAL-FLUSH",
        reason:"GamesEngine stores the entire game list in one shared cache key."
      },
      {
        key:"normalized_question_game_map_v1 / NORMALIZED_STORAGE_RUNTIME_CACHE",
        action:"REBUILD/REWRITE WITHOUT TARGET ASSOCIATIONS; DO NOT GLOBAL-FLUSH UNRELATED DATA",
        reason:"Normalized storage keeps a shared question→game map/runtime index."
      }
    ],
    intentionallyUntouchedGlobalCaches:[
      "votes_v3 (unless legacy CommunityGameId ownership is separately certified)",
      "appearance hub/global caches that contain no target GameId record",
      "Sports Engine v55 caches"
    ]
  };
}

function permanentGamePurgeDryRunWithAdapter_(adapter, requestedGameId, options) {
  options = options || {};
  const supplied = permanentGamePurgeString_(requestedGameId);
  const timestamp = permanentGamePurgeNowIso_();
  const report = {
    success:false,
    readOnly:true,
    version:PERMANENT_GAME_PURGE_RC24B_VERSION,
    requestedGameId:supplied,
    gameId:supplied,
    game:{ exists:false, name:"", type:"", year:"" },
    stores:[],
    dependencies:[],
    dependencyWarnings:[],
    sharedAssetsRetained:[],
    cacheIndexPlan:{},
    sportsBoundary:{ status:"PROTECTED — NO WRITES", engineVersion:"v55", locations:PERMANENT_GAME_PURGE_SPORTS_BOUNDARY.slice() },
    blockers:[],
    canProceedToPermanentDelete:false,
    productionPurgeEnabled:false,
    auditRecordPreview:null
  };

  if (!supplied) {
    report.blockers.push({ type:"GAME_ID_REQUIRED", message:"Exact GameId is required." });
    report.auditRecordPreview = permanentGamePurgeAuditPreview_(report, timestamp, options.requestedBy);
    return report;
  }

  const games = permanentGamePurgeRows_(adapter, "MAIN", "Games");
  const exact = games.filter(function(row) { return permanentGamePurgeExact_(row.GameId, supplied); });
  if (exact.length !== 1) {
    report.blockers.push({
      type: exact.length > 1 ? "DUPLICATE_GAME_ID" : "GAME_NOT_FOUND",
      message: exact.length > 1
        ? "Exact GameId matched multiple Games rows. Fail closed."
        : "Exact GameId was not found. Partial/display-name matching is not permitted."
    });
    report.auditRecordPreview = permanentGamePurgeAuditPreview_(report, timestamp, options.requestedBy);
    return report;
  }

  const game = exact[0];
  report.game = {
    exists:true,
    name:permanentGamePurgeString_(game.Name || game.GameName),
    type:permanentGamePurgeString_(game.Type),
    year:game.Year === undefined || game.Year === null ? "" : game.Year,
    active:permanentGamePurgeBool_(game.Active, true),
    archived:permanentGamePurgeBool_(game.Archived, false),
    defaultGame:permanentGamePurgeBool_(game.DefaultGame, false),
    parentGameId:permanentGamePurgeString_(game.ParentGameId),
    gameRole:permanentGamePurgeString_(game.GameRole),
    heroImageFileId:permanentGamePurgeString_(game.HeroImageFileID)
  };

  const ctx = permanentGamePurgeContext_(adapter, supplied);
  const matchRowsByStore = {};

  PERMANENT_GAME_PURGE_OWNED_SPECS.forEach(function(spec) {
    const rows = permanentGamePurgeRows_(adapter, spec.scope, spec.sheet);
    const matched = rows.filter(function(row) { return permanentGamePurgeSpecMatches_(spec, row, ctx); });
    const key = spec.scope + ":" + spec.sheet;
    matchRowsByStore[key] = matched;
    report.stores.push({
      scope:spec.scope,
      sheet:spec.sheet,
      area:spec.area,
      source:spec.source,
      classification:"OWNED — DELETE",
      ownershipKey:spec.match === "OUTBOX" ? "EntityKey/PayloadJSON exact GameId" : (spec.match === "CATEGORY_SETTINGS" ? "GameId or pre-captured unambiguous CategoryId" : spec.key),
      matchingRows:matched.length,
      phase:spec.phase,
      note:spec.note || ""
    });
  });

  PERMANENT_GAME_PURGE_CONDITIONAL_SPECS.forEach(function(spec) {
    const rows = permanentGamePurgeRows_(adapter, spec.scope, spec.sheet);
    const matched = rows.filter(function(row) { return permanentGamePurgeExact_(row[spec.key], supplied); });
    report.stores.push({
      scope:spec.scope,
      sheet:spec.sheet,
      area:spec.area,
      source:spec.source,
      classification:spec.classification,
      ownershipKey:spec.key,
      matchingRows:matched.length,
      phase:null,
      note:spec.note || ""
    });
    if (spec.sheet === "Votes" && matched.length) {
      report.blockers.push({
        type:"LEGACY_COMMUNITY_ID_AMBIGUOUS",
        message:"BLOCKED — legacy Votes rows match CommunityGameId, but GameId↔CommunityGameId ownership must be explicitly certified before deletion.",
        count:matched.length
      });
    }
  });

  PERMANENT_GAME_PURGE_SHARED_SPECS.forEach(function(spec) {
    let exists = true;
    if (typeof adapter.hasStore === "function") exists = adapter.hasStore(spec.scope, spec.sheet);
    report.stores.push({
      scope:spec.scope,
      sheet:spec.sheet,
      area:spec.area,
      source:spec.source,
      classification:spec.classification,
      ownershipKey:"shared/no target ownership key",
      matchingRows:0,
      exists:exists,
      phase:null,
      note:spec.note || ""
    });
  });

  const dependencies = permanentGamePurgeFindInboundDependencies_(adapter, game, ctx);
  report.dependencies = dependencies.blockers;
  report.dependencyWarnings = dependencies.warnings;
  dependencies.blockers.forEach(function(item) { report.blockers.push(item); });

  report.sharedAssetsRetained = permanentGamePurgeCollectAssets_(adapter, ctx, matchRowsByStore);
  report.cacheIndexPlan = permanentGamePurgeCachePlan_(adapter, ctx, matchRowsByStore);

  const counts = {};
  report.stores.forEach(function(store) {
    if (store.classification === "OWNED — DELETE") counts[store.scope + ":" + store.sheet] = store.matchingRows;
  });
  report.counts = counts;
  report.totalOwnedRows = Object.keys(counts).reduce(function(total, key) { return total + Number(counts[key] || 0); }, 0);

  report.success = report.blockers.length === 0;
  report.canProceedToPermanentDelete = report.success && PERMANENT_GAME_PURGE_PRODUCTION_ENABLED === true;
  report.status = report.blockers.length
    ? "BLOCKED"
    : "DRY RUN COMPLETE — FIXTURE/ROY REVIEW ONLY";
  report.auditRecordPreview = permanentGamePurgeAuditPreview_(report, timestamp, options.requestedBy);
  return report;
}

function permanentGamePurgeAuditPreview_(report, timestamp, requestedBy) {
  const counts = report && report.counts ? report.counts : {};
  return {
    Timestamp:timestamp || permanentGamePurgeNowIso_(),
    Action:"DRY_RUN",
    GameId:report ? report.gameId : "",
    GameName:report && report.game ? report.game.name : "",
    RequestedBy:permanentGamePurgeString_(requestedBy),
    DiscoveredCountsJSON:JSON.stringify(counts),
    DeletedCountsJSON:"{}",
    BlockedDependenciesJSON:JSON.stringify(report && report.dependencies ? report.dependencies : []),
    RetainedSharedAssetsJSON:JSON.stringify(report && report.sharedAssetsRetained ? report.sharedAssetsRetained : []),
    FinalResult:report && report.status ? report.status : "DRY RUN",
    RemainingReferenceCount:"",
    ErrorMessage:"",
    Version:PERMANENT_GAME_PURGE_RC24B_VERSION
  };
}

function permanentGamePurgeVerifyZeroWithAdapter_(adapter, gameId, capturedContext) {
  const supplied = permanentGamePurgeString_(gameId);
  const ctx = capturedContext || permanentGamePurgeContext_(adapter, supplied);
  const remaining = [];
  PERMANENT_GAME_PURGE_OWNED_SPECS.forEach(function(spec) {
    const rows = permanentGamePurgeRows_(adapter, spec.scope, spec.sheet);
    const count = rows.filter(function(row) { return permanentGamePurgeSpecMatches_(spec, row, ctx); }).length;
    if (count) remaining.push({ scope:spec.scope, sheet:spec.sheet, count:count, classification:"OWNED — DELETE" });
  });
  return {
    success:remaining.length === 0,
    gameId:supplied,
    remainingReferenceCount:remaining.reduce(function(total, item) { return total + item.count; }, 0),
    remaining:remaining,
    intentionalAuditReferenceExcluded:true
  };
}

/* =========================================================
   PRODUCTION READ-ONLY ADAPTER
========================================================= */
function permanentGamePurgeReadObjectsFromSheet_(sheet) {
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values[0].map(permanentGamePurgeString_);
  return values.slice(1).map(function(row, index) {
    const object = { __rowNumber:index + 2 };
    headers.forEach(function(header, col) { if (header) object[header] = row[col]; });
    return object;
  }).filter(function(object) {
    return headers.some(function(header) { return header && permanentGamePurgeString_(object[header]) !== ""; });
  });
}

function permanentGamePurgeProductionAdapter_() {
  const main = SpreadsheetApp.getActive();
  let hubResolved = false;
  let hubSpreadsheet = null;
  let hubStatus = { configured:false, readable:true, error:"" };

  function resolveHub() {
    if (hubResolved) return hubSpreadsheet;
    hubResolved = true;
    try {
      const propertyName = typeof EXTERNAL_RESULTS_BRIDGE_HUB_PROPERTY !== "undefined"
        ? EXTERNAL_RESULTS_BRIDGE_HUB_PROPERTY
        : "EXTERNAL_RESULTS_HUB_SPREADSHEET_ID";
      const id = permanentGamePurgeString_(PropertiesService.getScriptProperties().getProperty(propertyName));
      if (!id) {
        hubStatus = { configured:false, readable:true, error:"" };
        return null;
      }
      hubStatus.configured = true;
      hubSpreadsheet = SpreadsheetApp.openById(id);
      hubStatus.readable = !!hubSpreadsheet;
      if (!hubSpreadsheet) hubStatus.error = "Configured Hub spreadsheet could not be opened.";
      return hubSpreadsheet;
    } catch (err) {
      hubStatus = { configured:true, readable:false, error:err && err.message ? err.message : String(err) };
      return null;
    }
  }

  return {
    mode:"production-read-only",
    getRows:function(scope, sheetName) {
      const ss = scope === "HUB" ? resolveHub() : main;
      if (!ss) return [];
      return permanentGamePurgeReadObjectsFromSheet_(ss.getSheetByName(sheetName));
    },
    hasStore:function(scope, sheetName) {
      const ss = scope === "HUB" ? resolveHub() : main;
      return !!(ss && ss.getSheetByName(sheetName));
    },
    getHubStatus:function() {
      resolveHub();
      return Object.assign({}, hubStatus);
    },
    getAssetOwnership:function() {
      // Production has no audited owner registry for these Drive IDs.
      return null;
    }
  };
}

function apiAdminPermanentGamePurgeDryRun(payload) {
  payload = payload || {};
  if (typeof requireAdmin_ === "function") requireAdmin_(payload);
  const requested = permanentGamePurgeString_(payload.gameId || payload.GameId);
  return permanentGamePurgeDryRunWithAdapter_(
    permanentGamePurgeProductionAdapter_(),
    requested,
    { requestedBy:payload.requestedBy || payload.username || "" }
  );
}

/*
  Intentional hard gate.  This function contains no deletion calls.
  It verifies exact confirmation and dependency state, then stops.
*/
function apiAdminPermanentGamePurge(payload) {
  payload = payload || {};
  if (typeof requireAdmin_ === "function") requireAdmin_(payload);
  const gameId = permanentGamePurgeString_(payload.gameId || payload.GameId);
  const typed = String(payload.confirmGameId === undefined || payload.confirmGameId === null ? "" : payload.confirmGameId);
  if (!gameId) return { success:false, blocked:true, code:"GAME_ID_REQUIRED", message:"Exact GameId is required." };
  if (typed !== gameId) {
    return {
      success:false,
      blocked:true,
      code:"CONFIRMATION_MISMATCH",
      message:"TYPE " + gameId + " TO CONFIRM. Exact case-sensitive GameId match is required."
    };
  }

  const dryRun = permanentGamePurgeDryRunWithAdapter_(
    permanentGamePurgeProductionAdapter_(),
    gameId,
    { requestedBy:payload.requestedBy || payload.username || "" }
  );
  if (!dryRun.game.exists || dryRun.blockers.length) {
    return {
      success:false,
      blocked:true,
      code:"DRY_RUN_BLOCKED",
      message:dryRun.blockers.length ? dryRun.blockers[0].message : "Exact GameId was not found.",
      dryRun:dryRun
    };
  }

  return {
    success:false,
    blocked:true,
    code:"RC24B_FIXTURE_ONLY",
    message:"RC24B is fixture/dry-run only. Production purge is disabled until Roy explicitly authorizes the destructive stage.",
    dryRun:dryRun
  };
}

function showPermanentGamePurgeManager() {
  if (typeof HtmlService === "undefined" || typeof SpreadsheetApp === "undefined") {
    throw new Error("Permanent Game Purge manager is available only in the Apps Script admin spreadsheet context.");
  }
  const html = HtmlService.createHtmlOutputFromFile("PermanentGamePurgeManager")
    .setTitle("Permanent Delete Game — RC24B Preview");
  SpreadsheetApp.getUi().showSidebar(html);
}

/* =========================================================
   FUTURE AUDIT WRITER — NOT CALLED BY RC24B DRY RUN.

   The assignment requires both a truly read-only Dry Run and a persistent
   audit trail for every Dry Run. Those requirements conflict. RC24B chooses
   the explicit read-only requirement: Dry Run returns auditRecordPreview but
   does not persist it. A future Roy decision can call this writer from a
   separate confirmed audit action or relax read-only semantics.
========================================================= */
function permanentGamePurgeAppendAuditRecord_(record) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(PERMANENT_GAME_PURGE_AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PERMANENT_GAME_PURGE_AUDIT_SHEET);
    sheet.getRange(1, 1, 1, PERMANENT_GAME_PURGE_AUDIT_HEADERS.length)
      .setValues([PERMANENT_GAME_PURGE_AUDIT_HEADERS]);
  }
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), PERMANENT_GAME_PURGE_AUDIT_HEADERS.length)).getValues()[0]
    .map(permanentGamePurgeString_);
  const missing = PERMANENT_GAME_PURGE_AUDIT_HEADERS.filter(function(header) { return headers.indexOf(header) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    missing.forEach(function(header) { headers.push(header); });
  }
  sheet.appendRow(headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(record || {}, header) ? record[header] : "";
  }));
  return { success:true, rowNumber:sheet.getLastRow() };
}

/* =========================================================
   FIXTURE-ONLY EXECUTOR

   This path requires adapter.mode === "fixture". It cannot receive the
   production adapter. It exists so the destructive order and protections can
   be certified without touching Google Sheets or Drive.
========================================================= */
function permanentGamePurgeExecuteFixture_(adapter, gameId, typedConfirmation, options) {
  options = options || {};
  if (!adapter || adapter.mode !== "fixture" || typeof adapter.deleteRows !== "function") {
    return { success:false, blocked:true, code:"FIXTURE_ADAPTER_REQUIRED", message:"Fixture executor cannot operate on production storage." };
  }
  const supplied = permanentGamePurgeString_(gameId);
  if (!supplied) return { success:false, blocked:true, code:"GAME_ID_REQUIRED" };
  if (String(typedConfirmation === undefined || typedConfirmation === null ? "" : typedConfirmation) !== supplied) {
    return { success:false, blocked:true, code:"CONFIRMATION_MISMATCH", message:"Exact typed GameId required." };
  }

  const existingGames = permanentGamePurgeRows_(adapter, "MAIN", "Games")
    .filter(function(row) { return permanentGamePurgeExact_(row.GameId, supplied); });
  if (!existingGames.length) {
    return { success:true, alreadyAbsent:true, gameId:supplied, message:"GameId is already absent; no fixture rows were deleted." };
  }

  const dry = permanentGamePurgeDryRunWithAdapter_(adapter, supplied, { requestedBy:options.requestedBy || "fixture-admin" });
  if (!dry.game.exists || dry.blockers.length) {
    return { success:false, blocked:true, code:"DEPENDENCY_BLOCK", dryRun:dry, message:dry.blockers.length ? dry.blockers[0].message : "Game not found." };
  }

  const capturedCtx = permanentGamePurgeContext_(adapter, supplied);
  const trace = [];
  const deletedCounts = {};
  const retainedAssets = [];
  let failure = "";

  try {
    PERMANENT_GAME_PURGE_OWNED_SPECS
      .filter(function(spec) { return spec.sheet !== "Games"; })
      .slice()
      .sort(function(a,b) { return a.phase - b.phase || (a.scope + a.sheet).localeCompare(b.scope + b.sheet); })
      .forEach(function(spec) {
        if (typeof adapter.beforeDelete === "function") adapter.beforeDelete(spec.scope, spec.sheet, spec.phase);
        const deleted = adapter.deleteRows(spec.scope, spec.sheet, function(row) {
          return permanentGamePurgeSpecMatches_(spec, row, capturedCtx);
        });
        deletedCounts[spec.scope + ":" + spec.sheet] = deleted;
        trace.push({ phase:spec.phase, scope:spec.scope, sheet:spec.sheet, deleted:deleted });
      });

    if (typeof adapter.deleteGameCaches === "function") {
      const cacheResult = adapter.deleteGameCaches(supplied) || { deleted:0 };
      trace.push({ phase:90, scope:"CACHE", sheet:"GameScopedCaches", deleted:Number(cacheResult.deleted || 0) });
      deletedCounts["CACHE:GameScopedCaches"] = Number(cacheResult.deleted || 0);
    }

    dry.sharedAssetsRetained.forEach(function(asset) {
      const ownership = typeof adapter.getAssetOwnership === "function" ? adapter.getAssetOwnership(asset.fileId) : null;
      const canDelete = ownership && ownership.ownerGameId === supplied && ownership.shared !== true && asset.otherReferences.length === 0;
      if (canDelete && typeof adapter.deleteAsset === "function") {
        adapter.deleteAsset(asset.fileId);
        trace.push({ phase:95, scope:"DRIVE", sheet:asset.fileId, deleted:1 });
      } else {
        retainedAssets.push(asset);
      }
    });

    // Games last, by invariant.
    const gameSpec = PERMANENT_GAME_PURGE_OWNED_SPECS.filter(function(spec) { return spec.sheet === "Games"; })[0];
    if (typeof adapter.beforeDelete === "function") adapter.beforeDelete("MAIN", "Games", 1000);
    const gameDeleted = adapter.deleteRows("MAIN", "Games", function(row) {
      return permanentGamePurgeExact_(row.GameId, supplied);
    });
    deletedCounts["MAIN:Games"] = gameDeleted;
    trace.push({ phase:1000, scope:"MAIN", sheet:"Games", deleted:gameDeleted });

    const verify = permanentGamePurgeVerifyZeroWithAdapter_(adapter, supplied, capturedCtx);
    const audit = {
      Timestamp:permanentGamePurgeNowIso_(), Action:"PURGE", GameId:supplied,
      GameName:dry.game.name, RequestedBy:options.requestedBy || "fixture-admin",
      DiscoveredCountsJSON:JSON.stringify(dry.counts || {}),
      DeletedCountsJSON:JSON.stringify(deletedCounts),
      BlockedDependenciesJSON:"[]",
      RetainedSharedAssetsJSON:JSON.stringify(retainedAssets),
      FinalResult:verify.success ? "SUCCESS" : "FAILED — REFERENCES REMAIN",
      RemainingReferenceCount:verify.remainingReferenceCount,
      ErrorMessage:"", Version:PERMANENT_GAME_PURGE_RC24B_VERSION
    };
    if (typeof adapter.appendAudit === "function") adapter.appendAudit(audit);

    return {
      success:verify.success,
      fixtureOnly:true,
      gameId:supplied,
      deletedCounts:deletedCounts,
      retainedSharedAssets:retainedAssets,
      deletionTrace:trace,
      zeroReferenceVerification:verify,
      auditRecord:audit
    };
  } catch (err) {
    failure = err && err.message ? err.message : String(err);
    const verify = permanentGamePurgeVerifyZeroWithAdapter_(adapter, supplied, capturedCtx);
    const audit = {
      Timestamp:permanentGamePurgeNowIso_(), Action:"PURGE", GameId:supplied,
      GameName:dry.game.name, RequestedBy:options.requestedBy || "fixture-admin",
      DiscoveredCountsJSON:JSON.stringify(dry.counts || {}),
      DeletedCountsJSON:JSON.stringify(deletedCounts),
      BlockedDependenciesJSON:"[]",
      RetainedSharedAssetsJSON:JSON.stringify(retainedAssets),
      FinalResult:"ERROR — PARTIAL FIXTURE PURGE",
      RemainingReferenceCount:verify.remainingReferenceCount,
      ErrorMessage:failure, Version:PERMANENT_GAME_PURGE_RC24B_VERSION
    };
    if (typeof adapter.appendAudit === "function") adapter.appendAudit(audit);
    return {
      success:false,
      blocked:false,
      fixtureOnly:true,
      code:"PARTIAL_FAILURE",
      message:failure,
      deletionTrace:trace,
      deletedCounts:deletedCounts,
      zeroReferenceVerification:verify,
      auditRecord:audit
    };
  }
}
