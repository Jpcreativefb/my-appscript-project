/* =====================================================
   EXTERNAL RESULTS HUB — MAPPING MANAGER v1.2.11

   Spreadsheet sidebar for creating and maintaining
   AppMappings without editing rows by hand.

   Safety invariants:
   - Prediction providers remain read-only.
   - AutoSettle is always FALSE.
   - RequireAdminReview is always TRUE.
   - Existing result delivery and mapped-watch paths are reused.
===================================================== */

const ERH_MAPPING_MANAGER_VERSION = "1.2.11";
const ERH_MAPPING_MANAGER_PROVIDERS = ["kalshi", "polymarket"];

function showExternalResultsMappingManager() {
  erhEnsureHubReady_();

  const html = HtmlService
    .createHtmlOutputFromFile("MappingManager")
    .setTitle("External Results Mapping Manager");

  SpreadsheetApp.getUi().showSidebar(html);
}

function getExternalResultsMappingManagerBootstrap() {
  erhEnsureHubReady_();

  const targetData = erhMappingManagerReadMainTargets_();

  return {
    success: true,
    version: ERH_MAPPING_MANAGER_VERSION,
    mainSpreadsheetName: targetData.spreadsheetName,
    games: targetData.games,
    categories: targetData.categories,
    mappings: erhMappingManagerListMappings_(),
    providers: ERH_MAPPING_MANAGER_PROVIDERS.slice()
  };
}

function searchExternalResultsMappingMarkets(providerId, searchText) {
  erhEnsureHubReady_();

  const provider = erhKey_(providerId);
  if (ERH_MAPPING_MANAGER_PROVIDERS.indexOf(provider) === -1) {
    throw new Error("Mapping Manager supports Kalshi and Polymarket discovery markets.");
  }

  const query = erhKey_(searchText);
  const events = erhReadObjects_(ERH_SHEETS.EVENTS);
  const eventNames = {};

  events.forEach(function(event) {
    if (erhKey_(event.Provider) !== provider) return;
    eventNames[erhKey_(event.ExternalEventId)] = erhString_(event.EventName);
  });

  return erhReadObjects_(ERH_SHEETS.MARKETS)
    .filter(function(market) {
      if (erhKey_(market.Provider) !== provider) return false;
      if (!query) return true;

      const haystack = [
        market.ExternalMarketId,
        market.ExternalEventId,
        market.MarketQuestion,
        market.ResolutionStatus,
        market.WinningOutcome,
        eventNames[erhKey_(market.ExternalEventId)] || ""
      ].map(erhKey_).join(" ");

      return haystack.indexOf(query) !== -1;
    })
    .sort(function(a, b) {
      return erhMappingManagerTime_(b.LastUpdated || b.CreatedAt) -
        erhMappingManagerTime_(a.LastUpdated || a.CreatedAt);
    })
    .slice(0, 100)
    .map(function(market) {
      return {
        provider: provider,
        externalMarketId: erhString_(market.ExternalMarketId),
        externalEventId: erhString_(market.ExternalEventId),
        eventName: eventNames[erhKey_(market.ExternalEventId)] || erhString_(market.ExternalEventId),
        marketQuestion: erhString_(market.MarketQuestion) || erhString_(market.ExternalMarketId),
        outcomes: erhParseArray_(market.OutcomesJSON).map(erhString_).filter(Boolean),
        closingTime: erhMappingManagerDisplayValue_(market.ClosingTime),
        resolutionStatus: erhString_(market.ResolutionStatus),
        winningOutcome: erhString_(market.WinningOutcome),
        sourceUrl: erhString_(market.SourceUrl),
        lastUpdated: erhMappingManagerDisplayValue_(market.LastUpdated)
      };
    });
}

function saveExternalResultsMapping(payload) {
  erhEnsureHubReady_();
  payload = payload || {};

  const provider = erhKey_(payload.provider);
  const externalMarketId = erhString_(payload.externalMarketId);
  const appGameId = erhString_(payload.appGameId);
  const categoryId = erhString_(payload.categoryId);
  const nomineeId = erhString_(payload.nomineeId);
  const requestedOutcome = erhString_(payload.expectedOutcome);

  if (ERH_MAPPING_MANAGER_PROVIDERS.indexOf(provider) === -1) {
    throw new Error("Provider must be Kalshi or Polymarket.");
  }
  if (!externalMarketId) throw new Error("Choose an external market.");
  if (!requestedOutcome) throw new Error("Choose the provider outcome that means this answer wins.");
  if (!appGameId) throw new Error("Choose an Awards App game.");
  if (!categoryId) throw new Error("Choose an Awards App question.");
  if (!nomineeId) throw new Error("Choose an Awards App answer.");

  const market = erhFindObject_(ERH_SHEETS.MARKETS, function(row) {
    return erhKey_(row.Provider) === provider &&
      erhKey_(row.ExternalMarketId) === erhKey_(externalMarketId);
  });

  if (!market) {
    throw new Error("The selected external market is no longer present in ExternalMarkets.");
  }

  const outcomes = erhParseArray_(market.OutcomesJSON).map(erhString_).filter(Boolean);
  let expectedOutcome = requestedOutcome;

  if (outcomes.length) {
    const canonicalOutcome = outcomes.find(function(outcome) {
      return erhKey_(outcome) === erhKey_(requestedOutcome);
    });
    if (!canonicalOutcome) {
      throw new Error("The selected provider outcome is not available for this market.");
    }
    expectedOutcome = canonicalOutcome;
  }

  const targetData = erhMappingManagerReadMainTargets_();
  const category = targetData.categories.find(function(item) {
    return erhKey_(item.gameId) === erhKey_(appGameId) &&
      erhKey_(item.categoryId) === erhKey_(categoryId);
  });

  if (!category) {
    throw new Error("The selected Awards App question was not found in the connected main spreadsheet.");
  }

  const nominee = (category.nominees || []).find(function(item) {
    return erhKey_(item.nomineeId) === erhKey_(nomineeId);
  });

  if (!nominee) {
    throw new Error("The selected Awards App answer was not found for that question.");
  }

  const mappings = erhReadObjects_(ERH_SHEETS.MAPPINGS);
  const requestedMappingId = erhString_(payload.mappingId);

  let existing = null;
  if (requestedMappingId) {
    existing = mappings.find(function(mapping) {
      return erhKey_(mapping.MappingId) === erhKey_(requestedMappingId);
    }) || null;
    if (!existing) throw new Error("The mapping being edited was not found.");
  } else {
    existing = mappings.find(function(mapping) {
      return erhKey_(mapping.Provider) === provider &&
        erhKey_(mapping.ExternalMarketId) === erhKey_(externalMarketId) &&
        erhKey_(mapping.AppGameId) === erhKey_(appGameId) &&
        erhKey_(mapping.CategoryId) === erhKey_(categoryId) &&
        erhKey_(mapping.NomineeId) === erhKey_(nomineeId);
    }) || null;
  }

  const now = new Date();
  const identity = [
    provider,
    externalMarketId,
    appGameId,
    categoryId,
    nomineeId
  ].join("|");

  const mappingId = existing && erhString_(existing.MappingId)
    ? erhString_(existing.MappingId)
    : "map-" + erhSha256_(identity).slice(0, 20);

  const mapping = {
    MappingId: mappingId,
    AppGameId: appGameId,
    CategoryId: categoryId,
    NomineeId: nomineeId,
    Provider: provider,
    ExternalEventId: erhString_(market.ExternalEventId),
    ExternalMarketId: externalMarketId,
    ExternalSubjectId: externalMarketId + ":" + erhSlug_(expectedOutcome),
    ResultKey: "winning-outcome",
    ComparisonOperator: "",
    Threshold: "",
    ExpectedOutcome: expectedOutcome,
    AutoSettle: false,
    RequireAdminReview: true,
    SourceUrl: erhString_(market.SourceUrl),
    SourceConfigJSON: JSON.stringify({
      source: "mapping-manager",
      version: ERH_MAPPING_MANAGER_VERSION,
      marketQuestion: erhString_(market.MarketQuestion),
      appQuestion: category.categoryName,
      appAnswer: nominee.nomineeName
    }),
    Active: payload.active !== false,
    CreatedAt: existing && existing.CreatedAt ? existing.CreatedAt : now,
    UpdatedAt: now
  };

  erhUpsertObject_(
    ERH_SHEETS.MAPPINGS,
    ERH_HEADERS[ERH_SHEETS.MAPPINGS],
    ["MappingId"],
    mapping
  );

  return {
    success: true,
    mappingId: mappingId,
    message: existing ? "Mapping updated." : "Mapping created.",
    mappings: erhMappingManagerListMappings_()
  };
}

function setExternalResultsMappingActive(mappingId, active) {
  erhEnsureHubReady_();

  const id = erhString_(mappingId);
  if (!id) throw new Error("MappingId is required.");

  const existing = erhFindObject_(ERH_SHEETS.MAPPINGS, function(mapping) {
    return erhKey_(mapping.MappingId) === erhKey_(id);
  });

  if (!existing) throw new Error("Mapping not found: " + id);

  const next = Object.assign({}, existing, {
    MappingId: existing.MappingId,
    Active: active === true,
    AutoSettle: false,
    RequireAdminReview: true,
    UpdatedAt: new Date()
  });
  delete next.__rowNumber;

  erhUpsertObject_(
    ERH_SHEETS.MAPPINGS,
    ERH_HEADERS[ERH_SHEETS.MAPPINGS],
    ["MappingId"],
    next
  );

  return {
    success: true,
    mappingId: id,
    active: active === true,
    mappings: erhMappingManagerListMappings_()
  };
}

function erhMappingManagerReadMainTargets_() {
  const spreadsheetId = PropertiesService.getScriptProperties()
    .getProperty(ERH_MAIN_APP_SPREADSHEET_ID_PROPERTY);

  if (!spreadsheetId) {
    throw new Error("Configure the Main Awards App spreadsheet before using Mapping Manager.");
  }

  const mainSs = SpreadsheetApp.openById(spreadsheetId);
  const gamesSheet = mainSs.getSheetByName("Games");
  const categoriesSheet = mainSs.getSheetByName("Categories");

  if (!gamesSheet) throw new Error("Connected main spreadsheet is missing the Games sheet.");
  if (!categoriesSheet) throw new Error("Connected main spreadsheet is missing the Categories sheet.");

  const gameValues = gamesSheet.getDataRange().getValues();
  const categoryValues = categoriesSheet.getDataRange().getValues();

  const games = [];
  if (gameValues.length > 1) {
    const headers = gameValues[0].map(erhString_);
    const col = erhHeaderMap_(headers);

    if (col.gameid === undefined) throw new Error("Games sheet is missing GameId.");

    gameValues.slice(1).forEach(function(row) {
      const gameId = erhString_(row[col.gameid]);
      if (!gameId) return;

      games.push({
        gameId: gameId,
        name: col.name === undefined ? gameId : (erhString_(row[col.name]) || gameId),
        active: col.active === undefined ? true : erhBoolean_(row[col.active], true),
        archived: col.archived === undefined ? false : erhBoolean_(row[col.archived], false),
        status: col.status === undefined ? "" : erhString_(row[col.status])
      });
    });
  }

  games.sort(function(a, b) {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const categoryMap = {};
  if (categoryValues.length > 1) {
    const headers = categoryValues[0].map(erhString_);
    const col = erhHeaderMap_(headers);
    ["gameid", "category", "categoryid", "nominee"].forEach(function(required) {
      if (col[required] === undefined) {
        throw new Error("Categories sheet is missing " + required + ".");
      }
    });

    categoryValues.slice(1).forEach(function(row) {
      const gameId = erhString_(row[col.gameid]);
      const categoryId = erhString_(row[col.categoryid]);
      const categoryName = erhString_(row[col.category]);
      const nomineeName = erhString_(row[col.nominee]);
      if (!gameId || !categoryId || !categoryName || !nomineeName) return;

      const active = col.active === undefined ? true : erhBoolean_(row[col.active], true);
      const key = erhKey_(gameId) + "|" + erhKey_(categoryId);

      if (!categoryMap[key]) {
        categoryMap[key] = {
          gameId: gameId,
          categoryId: categoryId,
          categoryName: categoryName,
          section: col.section === undefined ? "" : erhString_(row[col.section]),
          active: active,
          nominees: []
        };
      }

      const nomineeId = col.nomineeid === undefined
        ? erhSlug_(nomineeName)
        : (erhString_(row[col.nomineeid]) || erhSlug_(nomineeName));

      if (!categoryMap[key].nominees.some(function(item) {
        return erhKey_(item.nomineeId) === erhKey_(nomineeId);
      })) {
        categoryMap[key].nominees.push({
          nomineeId: nomineeId,
          nomineeName: nomineeName,
          active: active
        });
      }
    });
  }

  const categories = Object.keys(categoryMap).map(function(key) {
    const category = categoryMap[key];
    category.nominees.sort(function(a, b) {
      return a.nomineeName.localeCompare(b.nomineeName);
    });
    return category;
  }).sort(function(a, b) {
    if (a.gameId !== b.gameId) return a.gameId.localeCompare(b.gameId);
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.categoryName.localeCompare(b.categoryName);
  });

  return {
    spreadsheetName: mainSs.getName(),
    games: games,
    categories: categories
  };
}

function erhMappingManagerListMappings_() {
  return erhReadObjects_(ERH_SHEETS.MAPPINGS)
    .map(function(mapping) {
      return {
        mappingId: erhString_(mapping.MappingId),
        appGameId: erhString_(mapping.AppGameId),
        categoryId: erhString_(mapping.CategoryId),
        nomineeId: erhString_(mapping.NomineeId),
        provider: erhKey_(mapping.Provider),
        externalEventId: erhString_(mapping.ExternalEventId),
        externalMarketId: erhString_(mapping.ExternalMarketId),
        expectedOutcome: erhString_(mapping.ExpectedOutcome),
        resultKey: erhString_(mapping.ResultKey || "winning-outcome"),
        active: erhBoolean_(mapping.Active, true),
        autoSettle: false,
        requireAdminReview: true,
        sourceUrl: erhString_(mapping.SourceUrl),
        updatedAt: erhMappingManagerDisplayValue_(mapping.UpdatedAt)
      };
    })
    .sort(function(a, b) {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

function erhMappingManagerDisplayValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone() || "America/Chicago",
      "yyyy-MM-dd HH:mm"
    );
  }
  return erhString_(value);
}

function erhMappingManagerTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.getTime();
  const time = new Date(value).getTime();
  return isNaN(time) ? 0 : time;
}
