/* =====================================================
   READ-ONLY PROVIDER ADAPTERS
   - Kalshi public event/market discovery
   - Polymarket public Gamma API discovery

   These adapters never place orders, modify markets, or
   bypass administrator review.
===================================================== */

function syncAllExternalProvidersNow() {
  erhEnsureHubReady_();
  const providers = erhReadObjects_(ERH_SHEETS.PROVIDERS);
  const summary = [];

  providers.forEach(function(provider) {
    if (!erhBoolean_(provider.Enabled, false)) return;
    const id = erhKey_(provider.ProviderId);
    if (id === "kalshi") summary.push(syncKalshiNow());
    if (id === "polymarket") summary.push(syncPolymarketNow());
  });

  SpreadsheetApp.getActive().toast(
    "Enabled read-only providers refreshed.",
    "External Results Hub",
    7
  );

  return { success: true, providers: summary };
}

function syncKalshiNow() {
  erhEnsureHubReady_();
  return erhRunProviderSync_("kalshi", function(provider, config, stats) {
    const baseUrl = erhString_(provider.BaseUrl) || "https://external-api.kalshi.com/trade-api/v2";
    const eventTickers = Array.isArray(config.eventTickers) ? config.eventTickers : [];
    const marketTickers = Array.isArray(config.marketTickers) ? config.marketTickers : [];
    const limit = Math.max(1, Math.min(Number(config.limit || 50), 200));
    const seenEvents = {};
    const seenMarkets = {};

    function processEvent(event) {
      if (!event) return;
      const eventId = erhString_(event.event_ticker || event.ticker || event.id);
      if (!eventId || seenEvents[eventId]) return;
      seenEvents[eventId] = true;

      const normalized = erhNormalizeKalshiEvent_(event, baseUrl);
      const result = erhUpsertExternalEvent_(normalized);
      if (result.created || result.updated) stats.eventsUpserted += 1;

      const markets = Array.isArray(event.markets) ? event.markets : [];
      markets.forEach(function(market) {
        processMarket(market, event);
      });
    }

    function processMarket(market, event) {
      if (!market) return;
      const marketId = erhString_(market.ticker || market.market_ticker || market.id);
      if (!marketId || seenMarkets[marketId]) return;
      seenMarkets[marketId] = true;

      const eventId = erhString_(market.event_ticker || (event && (event.event_ticker || event.ticker)));
      if (eventId && !seenEvents[eventId]) {
        processEvent(event || {
          event_ticker: eventId,
          title: eventId,
          category: "Kalshi",
          markets: []
        });
      }

      const normalized = erhNormalizeKalshiMarket_(market, event, baseUrl);
      const result = erhUpsertExternalMarket_(normalized);
      if (result.created || result.updated) stats.marketsUpserted += 1;

      stats.subjectsUpserted += erhUpsertOutcomeSubjects_(
        "kalshi",
        normalized.ExternalEventId,
        normalized.ExternalMarketId,
        ["Yes", "No"],
        "",
        normalized.SourceUrl,
        { marketQuestion: normalized.MarketQuestion }
      );

      const imported = erhMaybeImportKalshiResult_(market, event, normalized);
      if (imported && !imported.duplicate) stats.resultsImported += 1;
      if (imported && imported.queueCreated) stats.queueRowsCreated += 1;
    }

    if (eventTickers.length) {
      eventTickers.forEach(function(ticker) {
        const url = baseUrl + "/events/" + encodeURIComponent(ticker) + "?with_nested_markets=true";
        const payload = erhFetchJson_(url, stats);
        processEvent(payload.event || payload);
      });
    } else {
      const eventParams = {
        limit: limit,
        status: config.eventStatus || "open",
        with_nested_markets: config.includeNestedMarkets !== false
      };
      const payload = erhFetchJson_(baseUrl + "/events?" + erhQueryString_(eventParams), stats);
      (payload.events || []).forEach(processEvent);
    }

    marketTickers.forEach(function(ticker) {
      const payload = erhFetchJson_(baseUrl + "/markets/" + encodeURIComponent(ticker), stats);
      processMarket(payload.market || payload, null);
    });

    if (!marketTickers.length) {
      const openPayload = erhFetchJson_(
        baseUrl + "/markets?" + erhQueryString_({
          limit: limit,
          status: config.marketStatus || "open"
        }),
        stats
      );
      (openPayload.markets || []).forEach(function(market) {
        processMarket(market, null);
      });
    }

    if (config.includeSettled !== false) {
      const settledPayload = erhFetchJson_(
        baseUrl + "/markets?" + erhQueryString_({
          limit: Math.max(1, Math.min(Number(config.settledLimit || 50), 200)),
          status: "settled"
        }),
        stats
      );
      (settledPayload.markets || []).forEach(function(market) {
        processMarket(market, null);
      });
    }
  });
}

function syncPolymarketNow() {
  erhEnsureHubReady_();
  return erhRunProviderSync_("polymarket", function(provider, config, stats) {
    const baseUrl = erhString_(provider.BaseUrl) || "https://gamma-api.polymarket.com";
    const limit = Math.max(1, Math.min(Number(config.limit || 50), 100));
    const offset = Math.max(0, Number(config.offset || 0));
    const seenEvents = {};
    const seenMarkets = {};

    function processEvent(event) {
      if (!event) return;
      const eventId = erhString_(event.id || event.ticker || event.slug);
      if (!eventId || seenEvents[eventId]) return;
      seenEvents[eventId] = true;

      const normalized = erhNormalizePolymarketEvent_(event, baseUrl);
      const result = erhUpsertExternalEvent_(normalized);
      if (result.created || result.updated) stats.eventsUpserted += 1;

      const markets = Array.isArray(event.markets) ? event.markets : [];
      markets.forEach(function(market) {
        processMarket(market, event);
      });
    }

    function processMarket(market, event) {
      if (!market) return;
      const marketId = erhString_(market.id || market.conditionId || market.slug);
      if (!marketId || seenMarkets[marketId]) return;
      seenMarkets[marketId] = true;

      const normalized = erhNormalizePolymarketMarket_(market, event, baseUrl);
      const result = erhUpsertExternalMarket_(normalized);
      if (result.created || result.updated) stats.marketsUpserted += 1;

      const outcomes = erhParseArray_(market.outcomes || normalized.OutcomesJSON);
      stats.subjectsUpserted += erhUpsertOutcomeSubjects_(
        "polymarket",
        normalized.ExternalEventId,
        normalized.ExternalMarketId,
        outcomes,
        erhString_(market.image || market.icon),
        normalized.SourceUrl,
        { marketQuestion: normalized.MarketQuestion }
      );

      const imported = erhMaybeImportPolymarketResult_(market, event, normalized);
      if (imported && !imported.duplicate) stats.resultsImported += 1;
      if (imported && imported.queueCreated) stats.queueRowsCreated += 1;
    }

    const specificEventIds = Array.isArray(config.eventIds) ? config.eventIds : [];
    const specificEventSlugs = Array.isArray(config.eventSlugs) ? config.eventSlugs : [];

    if (specificEventIds.length || specificEventSlugs.length) {
      specificEventIds.forEach(function(id) {
        const payload = erhFetchJson_(baseUrl + "/events?" + erhQueryString_({ id: id }), stats);
        (Array.isArray(payload) ? payload : payload.events || []).forEach(processEvent);
      });
      specificEventSlugs.forEach(function(slug) {
        const payload = erhFetchJson_(baseUrl + "/events?" + erhQueryString_({ slug: slug }), stats);
        (Array.isArray(payload) ? payload : payload.events || []).forEach(processEvent);
      });
    } else {
      const payload = erhFetchJson_(
        baseUrl + "/events?" + erhQueryString_({
          limit: limit,
          offset: offset,
          active: config.active !== false,
          closed: config.closed === true
        }),
        stats
      );
      (Array.isArray(payload) ? payload : payload.events || []).forEach(processEvent);
    }

    const marketIds = Array.isArray(config.marketIds) ? config.marketIds : [];
    const marketSlugs = Array.isArray(config.marketSlugs) ? config.marketSlugs : [];

    marketIds.forEach(function(id) {
      const payload = erhFetchJson_(baseUrl + "/markets?" + erhQueryString_({ id: id }), stats);
      (Array.isArray(payload) ? payload : payload.markets || []).forEach(function(market) {
        processMarket(market, null);
      });
    });

    marketSlugs.forEach(function(slug) {
      const payload = erhFetchJson_(baseUrl + "/markets?" + erhQueryString_({ slug: slug }), stats);
      (Array.isArray(payload) ? payload : payload.markets || []).forEach(function(market) {
        processMarket(market, null);
      });
    });

    if (config.includeClosed !== false) {
      const payload = erhFetchJson_(
        baseUrl + "/events?" + erhQueryString_({
          limit: Math.max(1, Math.min(Number(config.closedLimit || 50), 100)),
          offset: 0,
          closed: true
        }),
        stats
      );
      (Array.isArray(payload) ? payload : payload.events || []).forEach(processEvent);
    }
  });
}

function erhRunProviderSync_(providerId, callback) {
  const provider = erhGetProviderSetting_(providerId);
  if (!provider) throw new Error("Provider not configured: " + providerId);
  if (!erhBoolean_(provider.Enabled, false)) {
    return { success: true, skipped: true, provider: providerId, message: "Provider disabled." };
  }
  if (!erhBoolean_(provider.ReadOnly, false)) {
    throw new Error(providerId + " must remain read-only in Phase 2.");
  }

  const startedAt = new Date();
  const syncId = Utilities.getUuid();
  const config = erhParseJson_(provider.DiscoveryConfigJSON, {});
  const stats = {
    eventsUpserted: 0,
    marketsUpserted: 0,
    subjectsUpserted: 0,
    resultsImported: 0,
    queueRowsCreated: 0,
    apiCalls: 0
  };

  erhUpdateProviderState_(providerId, {
    LastSyncStartedAt: startedAt,
    LastError: ""
  });

  try {
    callback(provider, config, stats);
    const finishedAt = new Date();

    erhAppendSyncLog_({
      SyncId: syncId,
      Provider: providerId,
      StartedAt: startedAt,
      FinishedAt: finishedAt,
      Status: "SUCCESS",
      EventsUpserted: stats.eventsUpserted,
      MarketsUpserted: stats.marketsUpserted,
      SubjectsUpserted: stats.subjectsUpserted,
      ResultsImported: stats.resultsImported,
      QueueRowsCreated: stats.queueRowsCreated,
      ApiCalls: stats.apiCalls,
      ErrorMessage: "",
      DetailsJSON: JSON.stringify({ config: config })
    });

    erhUpdateProviderState_(providerId, {
      LastSuccessfulSync: finishedAt,
      LastSyncFinishedAt: finishedAt,
      LastError: ""
    });

    return Object.assign({ success: true, provider: providerId }, stats);
  } catch (error) {
    const finishedAt = new Date();
    erhAppendSyncLog_({
      SyncId: syncId,
      Provider: providerId,
      StartedAt: startedAt,
      FinishedAt: finishedAt,
      Status: "ERROR",
      EventsUpserted: stats.eventsUpserted,
      MarketsUpserted: stats.marketsUpserted,
      SubjectsUpserted: stats.subjectsUpserted,
      ResultsImported: stats.resultsImported,
      QueueRowsCreated: stats.queueRowsCreated,
      ApiCalls: stats.apiCalls,
      ErrorMessage: error.message,
      DetailsJSON: JSON.stringify({ config: config, stack: error.stack || "" })
    });

    erhUpdateProviderState_(providerId, {
      LastSyncFinishedAt: finishedAt,
      LastError: error.message
    });

    SpreadsheetApp.getActive().toast(
      providerId + " sync failed: " + error.message,
      "Provider Sync",
      10
    );

    return Object.assign({ success: false, provider: providerId, error: error.message }, stats);
  }
}

function erhAppendSyncLog_(object) {
  const sh = erhEnsureSheet_(
    SpreadsheetApp.getActive(),
    ERH_SHEETS.SYNC_LOG,
    ERH_HEADERS[ERH_SHEETS.SYNC_LOG]
  );
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(erhString_);
  sh.appendRow(headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  }));
}

function erhFetchJson_(url, stats) {
  if (stats) stats.apiCalls += 1;
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      Accept: "application/json",
      "User-Agent": "Awards-App-External-Results-Hub/2.0"
    }
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error("HTTP " + status + " from " + url + ": " + text.slice(0, 300));
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Provider returned invalid JSON from " + url);
  }
}

function erhQueryString_(params) {
  return Object.keys(params || {})
    .filter(function(key) {
      return params[key] !== undefined && params[key] !== null && params[key] !== "";
    })
    .map(function(key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    })
    .join("&");
}

function erhNormalizeKalshiEvent_(event, baseUrl) {
  const id = erhString_(event.event_ticker || event.ticker || event.id);
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const dates = markets.map(function(market) {
    return market.close_time || market.expiration_time || market.expected_expiration_time || "";
  }).filter(Boolean);
  const sources = Array.isArray(event.settlement_sources) ? event.settlement_sources : [];

  return {
    Provider: "kalshi",
    ExternalEventId: id,
    EventName: erhString_(event.title || event.sub_title || id),
    EventType: erhString_(event.category || event.series_ticker || "prediction-market"),
    StartDate: event.strike_date || "",
    EndDate: dates.length ? dates.sort().slice(-1)[0] : "",
    Status: erhString_(event.status || "discovered"),
    SourceUrl: baseUrl + "/events/" + encodeURIComponent(id),
    LastUpdated: new Date(),
    RawJSON: JSON.stringify(event),
    CreatedAt: new Date()
  };
}

function erhNormalizeKalshiMarket_(market, event, baseUrl) {
  const id = erhString_(market.ticker || market.market_ticker || market.id);
  const eventId = erhString_(market.event_ticker || (event && (event.event_ticker || event.ticker)));
  const settlementRaw = market.settlement_value_dollars;
  const settlement = settlementRaw === undefined || settlementRaw === null || erhString_(settlementRaw) === ""
    ? NaN
    : Number(settlementRaw);
  const hasSettlement = Number.isFinite(settlement);
  const winner = hasSettlement && settlement === 1
    ? "Yes"
    : hasSettlement && settlement === 0
      ? "No"
      : erhString_(market.result || market.winning_outcome);
  const status = erhString_(market.status) || (market.settlement_ts ? "settled" : "discovered");
  const source = event && Array.isArray(event.settlement_sources) && event.settlement_sources.length
    ? erhString_(event.settlement_sources[0].url || event.settlement_sources[0].name)
    : erhString_(market.rules_primary);

  return {
    Provider: "kalshi",
    ExternalMarketId: id,
    ExternalEventId: eventId,
    MarketQuestion: erhString_(market.title || market.subtitle || id),
    OutcomesJSON: JSON.stringify(["Yes", "No"]),
    PricesJSON: JSON.stringify({
      yesBid: market.yes_bid_dollars || "",
      yesAsk: market.yes_ask_dollars || "",
      noBid: market.no_bid_dollars || "",
      noAsk: market.no_ask_dollars || "",
      last: market.last_price_dollars || ""
    }),
    ClosingTime: market.close_time || market.expiration_time || market.expected_expiration_time || "",
    ResolutionStatus: status,
    WinningOutcome: winner,
    ResolutionSource: source,
    SourceUrl: baseUrl + "/markets/" + encodeURIComponent(id),
    LastUpdated: market.updated_time || new Date(),
    RawJSON: JSON.stringify(market),
    CreatedAt: new Date()
  };
}

function erhMaybeImportKalshiResult_(market, event, normalized) {
  const settlementRaw = market.settlement_value_dollars;
  const settlement = settlementRaw === undefined || settlementRaw === null || erhString_(settlementRaw) === ""
    ? NaN
    : Number(settlementRaw);
  const resultText = erhKey_(market.result || market.winning_outcome);
  const status = erhKey_(market.status);
  const hasSettlementMarker = Boolean(market.settlement_ts) || status === "settled";
  let winner = hasSettlementMarker ? normalized.WinningOutcome : "";

  if (!hasSettlementMarker) return null;
  if (!winner && resultText === "yes") winner = "Yes";
  if (!winner && resultText === "no") winner = "No";
  if (!winner && Number.isFinite(settlement) && settlement === 1) winner = "Yes";
  if (!winner && Number.isFinite(settlement) && settlement === 0) winner = "No";
  if (!winner) return null;

  const finality = market.is_provisional === true ? "PROVISIONAL" : "FINAL";
  const evidenceUrl = normalized.ResolutionSource || normalized.SourceUrl;

  return erhImportNormalizedResult_({
    Provider: "kalshi",
    ExternalEventId: normalized.ExternalEventId,
    ExternalMarketId: normalized.ExternalMarketId,
    ResultKey: "winning-outcome",
    ResultValue: Number.isFinite(settlement) ? settlement : winner,
    Finality: finality,
    WinningOutcome: winner,
    ProviderTimestamp: market.settlement_ts || market.updated_time || new Date(),
    ImportedAt: new Date(),
    EvidenceUrl: evidenceUrl,
    SourceUrl: normalized.SourceUrl,
    RawJSON: JSON.stringify({ market: market, event: event || null })
  });
}

function erhNormalizePolymarketEvent_(event, baseUrl) {
  const id = erhString_(event.id || event.ticker || event.slug);
  const slug = erhString_(event.slug);
  const status = event.closed === true
    ? "closed"
    : event.active === true
      ? "open"
      : event.archived === true
        ? "archived"
        : "discovered";

  return {
    Provider: "polymarket",
    ExternalEventId: id,
    EventName: erhString_(event.title || event.subtitle || id),
    EventType: erhString_(event.category || event.subcategory || "prediction-market"),
    StartDate: event.startDate || event.creationDate || "",
    EndDate: event.endDate || "",
    Status: status,
    SourceUrl: slug ? "https://polymarket.com/event/" + slug : baseUrl + "/events?id=" + encodeURIComponent(id),
    LastUpdated: event.updatedAt || new Date(),
    RawJSON: JSON.stringify(event),
    CreatedAt: new Date()
  };
}

function erhNormalizePolymarketMarket_(market, event, baseUrl) {
  const id = erhString_(market.id || market.conditionId || market.slug);
  const eventId = erhString_(
    event && (event.id || event.ticker || event.slug) ||
    market.eventId ||
    (Array.isArray(market.events) && market.events.length ? market.events[0].id : "")
  );
  const outcomes = erhParseArray_(market.outcomes);
  const prices = erhParseArray_(market.outcomePrices);
  const winner = erhInferPolymarketWinner_(outcomes, prices, market);
  const slug = erhString_(market.slug);
  const status = erhString_(market.umaResolutionStatus) ||
    (market.closed === true ? "closed" : market.active === true ? "open" : "discovered");

  return {
    Provider: "polymarket",
    ExternalMarketId: id,
    ExternalEventId: eventId,
    MarketQuestion: erhString_(market.question || market.groupItemTitle || id),
    OutcomesJSON: JSON.stringify(outcomes),
    PricesJSON: JSON.stringify(prices),
    ClosingTime: market.endDate || market.endDateIso || market.closedTime || "",
    ResolutionStatus: status,
    WinningOutcome: winner,
    ResolutionSource: erhString_(market.resolutionSource || (event && event.resolutionSource)),
    SourceUrl: slug ? "https://polymarket.com/market/" + slug : baseUrl + "/markets?id=" + encodeURIComponent(id),
    LastUpdated: market.updatedAt || new Date(),
    RawJSON: JSON.stringify(market),
    CreatedAt: new Date()
  };
}

function erhInferPolymarketWinner_(outcomes, prices, market) {
  const explicit = erhString_(market.winningOutcome || market.winner || market.resolvedOutcome);
  if (explicit) return explicit;
  if (!Array.isArray(outcomes) || !Array.isArray(prices) || outcomes.length !== prices.length) return "";

  let winningIndex = -1;
  for (let i = 0; i < prices.length; i += 1) {
    const price = Number(prices[i]);
    if (price === 1) {
      if (winningIndex !== -1) return "";
      winningIndex = i;
    } else if (price !== 0) {
      return "";
    }
  }

  return winningIndex >= 0 ? erhString_(outcomes[winningIndex]) : "";
}

function erhMaybeImportPolymarketResult_(market, event, normalized) {
  const outcomes = erhParseArray_(market.outcomes);
  const prices = erhParseArray_(market.outcomePrices);
  const winner = normalized.WinningOutcome || erhInferPolymarketWinner_(outcomes, prices, market);
  if (!winner) return null;

  const resolutionKey = erhKey_(market.umaResolutionStatus);
  const finality = market.closed === true &&
    (resolutionKey.indexOf("resolved") !== -1 || resolutionKey.indexOf("final") !== -1 || prices.every(function(value) {
      const n = Number(value);
      return n === 0 || n === 1;
    }))
    ? "FINAL"
    : "PROVISIONAL";

  return erhImportNormalizedResult_({
    Provider: "polymarket",
    ExternalEventId: normalized.ExternalEventId,
    ExternalMarketId: normalized.ExternalMarketId,
    ResultKey: "winning-outcome",
    ResultValue: winner,
    Finality: finality,
    WinningOutcome: winner,
    ProviderTimestamp: market.updatedAt || market.closedTime || new Date(),
    ImportedAt: new Date(),
    EvidenceUrl: normalized.ResolutionSource || normalized.SourceUrl,
    SourceUrl: normalized.SourceUrl,
    RawJSON: JSON.stringify({ market: market, event: event || null })
  });
}


/* =====================================================
   MAPPED PROVIDER RESULT WATCH — Production v1.2.8

   Broad provider sync remains a manual discovery tool. The
   recurring watch polls only markets that have active AppMappings,
   so the Hub does not repeatedly crawl unrelated markets.
===================================================== */

const ERH_MAPPED_PROVIDER_TRIGGER = "erhScheduledMappedProviderSync";

function erhMappedProviderTargets_(providerId) {
  const providerKey = erhKey_(providerId);
  const mappings = erhReadObjects_(ERH_SHEETS.MAPPINGS).filter(function(mapping) {
    return erhBoolean_(mapping.Active, true) &&
      erhKey_(mapping.Provider) === providerKey &&
      Boolean(erhString_(mapping.ExternalMarketId));
  });
  const seen = {};
  return mappings.map(function(mapping) {
    return {
      externalMarketId: erhString_(mapping.ExternalMarketId),
      externalEventId: erhString_(mapping.ExternalEventId)
    };
  }).filter(function(target) {
    const key = erhKey_(target.externalMarketId);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function syncMappedExternalProvidersNow() {
  erhEnsureHubReady_();
  const results = [];
  const kalshi = erhGetProviderSetting_("kalshi");
  const polymarket = erhGetProviderSetting_("polymarket");
  if (kalshi && erhBoolean_(kalshi.Enabled, false)) results.push(syncMappedKalshiNow());
  if (polymarket && erhBoolean_(polymarket.Enabled, false)) results.push(syncMappedPolymarketNow());
  SpreadsheetApp.getActive().toast("Mapped provider results refreshed.", "External Results Hub", 7);
  return { success: results.every(function(result) { return result && result.success !== false; }), providers: results };
}

function syncMappedKalshiNow() {
  erhEnsureHubReady_();
  return erhRunProviderSync_("kalshi", function(provider, config, stats) {
    const baseUrl = erhString_(provider.BaseUrl) || "https://external-api.kalshi.com/trade-api/v2";
    const targets = erhMappedProviderTargets_("kalshi");
    stats.mappedTargets = targets.length;
    targets.forEach(function(target) {
      const payload = erhFetchKalshiMappedMarket_(baseUrl, target.externalMarketId, stats);
      const market = payload && (payload.market || (payload.markets && payload.markets[0]) || payload);
      if (!market || !erhString_(market.ticker || market.market_ticker || market.id)) {
        throw new Error("Kalshi mapped market was not found: " + target.externalMarketId);
      }

      let event = null;
      const eventTicker = erhString_(market.event_ticker || target.externalEventId);
      if (eventTicker) {
        try {
          const eventPayload = erhFetchJson_(baseUrl + "/events/" + encodeURIComponent(eventTicker), stats);
          event = eventPayload.event || eventPayload;
          const eventResult = erhUpsertExternalEvent_(erhNormalizeKalshiEvent_(event, baseUrl));
          if (eventResult.created || eventResult.updated) stats.eventsUpserted += 1;
        } catch (eventErr) {
          // A market result can still be processed when optional event metadata is unavailable.
        }
      }

      const normalized = erhNormalizeKalshiMarket_(market, event, baseUrl);
      const marketResult = erhUpsertExternalMarket_(normalized);
      if (marketResult.created || marketResult.updated) stats.marketsUpserted += 1;
      stats.subjectsUpserted += erhUpsertOutcomeSubjects_(
        "kalshi", normalized.ExternalEventId, normalized.ExternalMarketId,
        ["Yes", "No"], "", normalized.SourceUrl, { marketQuestion: normalized.MarketQuestion }
      );
      const imported = erhMaybeImportKalshiResult_(market, event, normalized);
      if (imported && !imported.duplicate) stats.resultsImported += 1;
      if (imported && imported.queueCreated) stats.queueRowsCreated += 1;
    });
  });
}

function erhFetchKalshiMappedMarket_(baseUrl, ticker, stats) {
  try {
    return erhFetchJson_(baseUrl + "/markets/" + encodeURIComponent(ticker), stats);
  } catch (err) {
    if (String(err && err.message || err).indexOf("HTTP 404") === -1) throw err;
    // Kalshi moves older settled markets to the historical endpoint.
    return erhFetchJson_(
      baseUrl + "/historical/markets?" + erhQueryString_({ tickers: ticker, limit: 10 }),
      stats
    );
  }
}

function syncMappedPolymarketNow() {
  erhEnsureHubReady_();
  return erhRunProviderSync_("polymarket", function(provider, config, stats) {
    const baseUrl = erhString_(provider.BaseUrl) || "https://gamma-api.polymarket.com";
    const targets = erhMappedProviderTargets_("polymarket");
    stats.mappedTargets = targets.length;
    targets.forEach(function(target) {
      const market = erhFetchPolymarketMappedMarket_(baseUrl, target.externalMarketId, stats);
      if (!market || !erhString_(market.id || market.conditionId || market.slug)) {
        throw new Error("Polymarket mapped market was not found: " + target.externalMarketId);
      }

      const linkedEvent = Array.isArray(market.events) && market.events.length ? market.events[0] : null;
      if (linkedEvent) {
        const eventResult = erhUpsertExternalEvent_(erhNormalizePolymarketEvent_(linkedEvent, baseUrl));
        if (eventResult.created || eventResult.updated) stats.eventsUpserted += 1;
      }
      const normalized = erhNormalizePolymarketMarket_(market, linkedEvent, baseUrl);
      const marketResult = erhUpsertExternalMarket_(normalized);
      if (marketResult.created || marketResult.updated) stats.marketsUpserted += 1;
      const outcomes = erhParseArray_(market.outcomes || normalized.OutcomesJSON);
      stats.subjectsUpserted += erhUpsertOutcomeSubjects_(
        "polymarket", normalized.ExternalEventId, normalized.ExternalMarketId,
        outcomes, erhString_(market.image || market.icon), normalized.SourceUrl,
        { marketQuestion: normalized.MarketQuestion }
      );
      const imported = erhMaybeImportPolymarketResult_(market, linkedEvent, normalized);
      if (imported && !imported.duplicate) stats.resultsImported += 1;
      if (imported && imported.queueCreated) stats.queueRowsCreated += 1;
    });
  });
}

function erhFetchPolymarketMappedMarket_(baseUrl, marketId, stats) {
  const target = erhString_(marketId);
  if (/^\d+$/.test(target)) {
    return erhFetchJson_(baseUrl + "/markets/" + encodeURIComponent(target), stats);
  }
  const payload = erhFetchJson_(baseUrl + "/markets?" + erhQueryString_({ slug: target }), stats);
  const rows = Array.isArray(payload) ? payload : (payload.markets || []);
  return rows[0] || null;
}

function erhProviderSyncDue_(provider, now) {
  if (!provider || !erhBoolean_(provider.Enabled, false)) return false;
  const intervalMinutes = Math.max(60, Number(provider.PollingIntervalMinutes || 60));
  const last = new Date(provider.LastSuccessfulSync || 0).getTime();
  if (!last || isNaN(last)) return true;
  return (now.getTime() - last) >= intervalMinutes * 60 * 1000;
}

function erhScheduledMappedProviderSync() {
  erhEnsureHubReady_();
  const now = new Date();
  const providers = erhReadObjects_(ERH_SHEETS.PROVIDERS);
  const result = { success: true, ran: [], skipped: [] };
  ["kalshi", "polymarket"].forEach(function(providerId) {
    const provider = providers.find(function(row) { return erhKey_(row.ProviderId) === providerId; });
    if (!erhProviderSyncDue_(provider, now)) {
      result.skipped.push(providerId);
      return;
    }
    const run = providerId === "kalshi" ? syncMappedKalshiNow() : syncMappedPolymarketNow();
    result.ran.push(run);
    if (run && run.success === false) result.success = false;
  });
  return result;
}

function installExternalResultsProviderWatch() {
  erhEnsureHubReady_();
  removeExternalResultsProviderWatch(true);
  ScriptApp.newTrigger(ERH_MAPPED_PROVIDER_TRIGGER)
    .timeBased()
    .everyHours(1)
    .create();
  SpreadsheetApp.getActive().toast(
    "Hourly watch installed. Only active mapped Kalshi/Polymarket markets are polled.",
    "External Results Hub",
    8
  );
  return { success: true, handler: ERH_MAPPED_PROVIDER_TRIGGER, everyHours: 1 };
}

function removeExternalResultsProviderWatch(silent) {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === ERH_MAPPED_PROVIDER_TRIGGER) {
      ScriptApp.deleteTrigger(trigger);
      removed += 1;
    }
  });
  if (!silent) {
    SpreadsheetApp.getActive().toast(removed + " mapped provider watch trigger(s) removed.", "External Results Hub", 6);
  }
  return { success: true, removed: removed };
}

function erhMappedProviderWatchInstalled_() {
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === ERH_MAPPED_PROVIDER_TRIGGER;
  });
}
