/* =====================================================
   PREDICTION MARKET EXTERNAL DISCOVERY R2
   Read-only discovery adapter over Awards external-market authority.
   Provider HTTP, mapping, and source URL ownership remains in AwardsManagerEngine.
===================================================== */

var PREDICTION_MARKET_EXTERNAL_DISCOVERY_R2_CONTRACT = "prediction-market-external-discovery-r2";

function predictionMarketExternalDiscoveryR2String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketExternalDiscoveryR2Key_(value) {
  return predictionMarketExternalDiscoveryR2String_(value).toLowerCase();
}

function predictionMarketExternalDiscoveryR2Status_(value) {
  var status = predictionMarketExternalDiscoveryR2Key_(value || "open");
  if (status === "live") status = "open";
  if (status === "resolved" || status === "settled") status = "closed";
  if (["open", "closed", "all"].indexOf(status) === -1) {
    throw new Error("Status must be Open, Closed/Resolved, or All.");
  }
  return status;
}

function predictionMarketExternalDiscoveryR2DateMs_(value) {
  var text = predictionMarketExternalDiscoveryR2String_(value);
  if (!text) return null;
  var ms = Date.parse(text);
  return isFinite(ms) ? ms : null;
}

function predictionMarketExternalDiscoveryR2Options_(payload) {
  payload = payload || {};
  var closeAfter = predictionMarketExternalDiscoveryR2String_(payload.closeAfter || payload.closeFrom);
  var closeBefore = predictionMarketExternalDiscoveryR2String_(payload.closeBefore || payload.closeTo);
  if (closeAfter && predictionMarketExternalDiscoveryR2DateMs_(closeAfter) === null) throw new Error("Close-after date is invalid.");
  if (closeBefore && predictionMarketExternalDiscoveryR2DateMs_(closeBefore) === null) throw new Error("Close-before date is invalid.");
  return {
    category: predictionMarketExternalDiscoveryR2String_(payload.category),
    marketType: predictionMarketExternalDiscoveryR2String_(payload.marketType),
    searchIn: predictionMarketExternalDiscoveryR2Key_(payload.searchIn || "both"),
    status: predictionMarketExternalDiscoveryR2Status_(payload.status || "open"),
    closeDays: Number(payload.closeDays || 0),
    closeAfter: closeAfter,
    closeBefore: closeBefore,
    exactPhrase: payload.exactPhrase === true || ["1", "true", "yes", "on"].indexOf(predictionMarketExternalDiscoveryR2Key_(payload.exactPhrase)) !== -1,
    sort: predictionMarketExternalDiscoveryR2Key_(payload.sort || "relevance")
  };
}

function predictionMarketExternalDiscoveryR2EventStatus_(event) {
  event = event || {};
  var status = predictionMarketExternalDiscoveryR2Key_(event.status);
  if (event.closed === true || event.resolved === true || event.settled === true) return "closed";
  if (["closed", "resolved", "settled", "finalized", "expired"].indexOf(status) !== -1) return "closed";
  return "open";
}

function predictionMarketExternalDiscoveryR2PassesDate_(closeTime, options) {
  var closeMs = predictionMarketExternalDiscoveryR2DateMs_(closeTime);
  if (closeMs === null) return true;
  var afterMs = predictionMarketExternalDiscoveryR2DateMs_(options.closeAfter);
  var beforeMs = predictionMarketExternalDiscoveryR2DateMs_(options.closeBefore);
  if (afterMs !== null && closeMs < afterMs) return false;
  if (beforeMs !== null && closeMs > beforeMs) return false;
  return true;
}

function predictionMarketExternalDiscoveryR2PassesType_(event, options) {
  var wanted = predictionMarketExternalDiscoveryR2Key_(options.marketType);
  if (!wanted || wanted === "all") return true;
  var markets = Array.isArray(event && event.markets) ? event.markets : [];
  var parts = [event && event.category, event && event.subcategory, event && event.type, event && event.market_type, event && event.series_ticker, event && event.ticker];
  markets.forEach(function(market) {
    parts.push(market && market.type, market && market.market_type, market && market.category, market && market.ticker, market && market.question, market && market.title);
  });
  return parts.map(predictionMarketExternalDiscoveryR2Key_).join(" ").indexOf(wanted) !== -1;
}

function predictionMarketExternalDiscoveryR2MarketMatches_(market, query) {
  if (!query) return true;
  return awardsManagerSearchTextMatches_([
    market && market.title,
    market && market.subtitle,
    market && market.question,
    market && market.yes_sub_title,
    market && market.no_sub_title,
    market && market.ticker,
    market && market.slug
  ], query, false);
}

function predictionMarketExternalDiscoveryR2Snapshot_(detail) {
  detail = detail || {};
  var markets = Array.isArray(detail.markets) ? detail.markets : [];
  return {
    provider: predictionMarketExternalDiscoveryR2String_(detail.provider),
    externalEventId: predictionMarketExternalDiscoveryR2String_(detail.externalEventId),
    eventName: predictionMarketExternalDiscoveryR2String_(detail.eventName),
    question: predictionMarketExternalDiscoveryR2String_(detail.eventName),
    closeTime: predictionMarketExternalDiscoveryR2String_(detail.closeTime),
    status: predictionMarketExternalDiscoveryR2String_(detail.status),
    childMarketIds: markets.map(function(row) { return predictionMarketExternalDiscoveryR2String_(row.externalMarketId); }).filter(Boolean),
    children: markets.map(function(row) {
      return {
        externalMarketId: predictionMarketExternalDiscoveryR2String_(row.externalMarketId),
        marketQuestion: predictionMarketExternalDiscoveryR2String_(row.marketQuestion),
        outcomes: Array.isArray(row.outcomes) ? row.outcomes.slice() : [],
        prices: row.prices && typeof row.prices === "object" ? Object.assign({}, row.prices) : {},
        primaryProbability: row.primaryProbability == null ? null : row.primaryProbability,
        closeTime: predictionMarketExternalDiscoveryR2String_(row.closeTime),
        status: predictionMarketExternalDiscoveryR2String_(row.status),
        sourceUrl: predictionMarketExternalDiscoveryR2String_(row.sourceUrl)
      };
    })
  };
}

function predictionMarketExternalDiscoveryR2EnrichDetail_(detail) {
  detail = detail || {};
  detail.groupedEvent = true;
  detail.logicalQuestion = predictionMarketExternalDiscoveryR2String_(detail.eventName || detail.externalEventId);
  detail.sourceSnapshot = predictionMarketExternalDiscoveryR2Snapshot_(detail);
  return detail;
}

function predictionMarketExternalDiscoveryR2KalshiSummary_(event, query) {
  event = event || {};
  var rawMarkets = Array.isArray(event.markets) ? event.markets : [];
  var matching = rawMarkets.filter(function(market) { return predictionMarketExternalDiscoveryR2MarketMatches_(market, query); });
  var source = matching.length ? matching : rawMarkets;
  var eventName = awardsManagerString_(event.title || event.sub_title || event.event_ticker);
  var markets = source.slice(0, 3).map(function(market) {
    var row = awardsManagerKalshiResult_(market, event);
    row.eventName = eventName;
    row.externalEventId = awardsManagerString_(event.event_ticker || market.event_ticker);
    row.sourceUrl = awardsManagerKalshiWebMarketUrl_(market, event);
    return row;
  });
  return {
    provider: "kalshi",
    externalEventId: awardsManagerString_(event.event_ticker),
    eventName: eventName,
    logicalQuestion: eventName,
    groupedEvent: true,
    contextSubtitle: awardsManagerString_(event.sub_title),
    category: awardsManagerString_(event.category),
    seriesTicker: awardsManagerString_(event.series_ticker),
    closeTime: awardsManagerEventCloseTime_(event),
    status: predictionMarketExternalDiscoveryR2EventStatus_(event),
    liveMarketCount: rawMarkets.filter(function(market) { return awardsManagerMarketIsLive_(market, event); }).length,
    matchingMarketCount: matching.length,
    childMarketCount: rawMarkets.length,
    markets: markets,
    sourceUrl: awardsManagerKalshiWebEventUrl_(event),
    originalMarketUrl: markets[0] && markets[0].sourceUrl || awardsManagerKalshiWebEventUrl_(event),
    contextComplete: awardsManagerContextComplete_({ eventName:eventName, contextSubtitle:event.sub_title, category:event.category, seriesTicker:event.series_ticker })
  };
}

function predictionMarketExternalDiscoveryR2PolymarketSummary_(event, query) {
  event = event || {};
  var rawMarkets = Array.isArray(event.markets) ? event.markets : [];
  var matching = rawMarkets.filter(function(market) { return predictionMarketExternalDiscoveryR2MarketMatches_(market, query); });
  var source = matching.length ? matching : rawMarkets;
  var eventName = awardsManagerString_(event.title || event.slug || event.id);
  var markets = source.slice(0, 3).map(function(market) { return awardsManagerPolymarketResult_(market, event); }).filter(Boolean);
  var slug = awardsManagerString_(event.slug);
  var eventUrl = slug ? "https://polymarket.com/event/" + encodeURIComponent(slug) : awardsManagerPolymarketResult_((rawMarkets[0] || {}), event).sourceUrl;
  return {
    provider: "polymarket",
    externalEventId: awardsManagerString_(event.id || event.slug || event.ticker),
    eventName: eventName,
    logicalQuestion: eventName,
    groupedEvent: true,
    contextSubtitle: awardsManagerString_(event.subtitle),
    category: awardsManagerString_(event.category || event.subcategory),
    seriesTicker: awardsManagerString_(event.ticker),
    closeTime: awardsManagerEventCloseTime_(event),
    status: predictionMarketExternalDiscoveryR2EventStatus_(event),
    liveMarketCount: rawMarkets.filter(function(market) { return awardsManagerMarketIsLive_(market, event); }).length,
    matchingMarketCount: matching.length,
    childMarketCount: rawMarkets.length,
    markets: markets,
    sourceUrl: eventUrl,
    originalMarketUrl: markets[0] && markets[0].sourceUrl || eventUrl,
    contextComplete: awardsManagerContextComplete_({ eventName:eventName, contextSubtitle:event.subtitle, category:event.category || event.subcategory, seriesTicker:event.ticker })
  };
}

function predictionMarketExternalDiscoveryR2RawSearchProvider_(provider, query, options) {
  var matches = [];
  var scannedPages = 0;
  if (provider === "kalshi") {
    var statuses = options.status === "all" ? ["closed", "settled"] : ["closed", "settled"];
    statuses.forEach(function(providerStatus) {
      var cursor = "";
      for (var page = 0; page < 4; page += 1) {
        var url = AWARDS_MANAGER_KALSHI_BASE + "/events?status=" + encodeURIComponent(providerStatus) + "&limit=50&with_nested_markets=true" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
        var data;
        try { data = awardsManagerFetchJson_(url); } catch (err) { break; }
        var rows = Array.isArray(data && data.events) ? data.events : [];
        rows.forEach(function(event) {
          if (!awardsManagerEventMatchesSearch_(event, query, options)) return;
          if (!predictionMarketExternalDiscoveryR2PassesType_(event, options)) return;
          var summary = predictionMarketExternalDiscoveryR2KalshiSummary_(event, query);
          if (!predictionMarketExternalDiscoveryR2PassesDate_(summary.closeTime, options)) return;
          matches.push(summary);
        });
        scannedPages += 1;
        cursor = awardsManagerString_(data && data.cursor);
        if (!cursor || !rows.length) break;
      }
    });
  } else {
    for (var polyPage = 1; polyPage <= 3; polyPage += 1) {
      var polyUrl = AWARDS_MANAGER_POLYMARKET_BASE + "/public-search?q=" + encodeURIComponent(awardsManagerString_(query)) + "&limit_per_type=20&page=" + encodeURIComponent(polyPage) + "&search_profiles=false&keep_closed_markets=1";
      var polyData = awardsManagerFetchJson_(polyUrl);
      var polyRows = Array.isArray(polyData && polyData.events) ? polyData.events : [];
      polyRows.forEach(function(event) {
        if (predictionMarketExternalDiscoveryR2EventStatus_(event) !== "closed") return;
        if (!awardsManagerEventMatchesSearch_(event, query, options)) return;
        if (!predictionMarketExternalDiscoveryR2PassesType_(event, options)) return;
        var summary = predictionMarketExternalDiscoveryR2PolymarketSummary_(event, query);
        if (!predictionMarketExternalDiscoveryR2PassesDate_(summary.closeTime, options)) return;
        matches.push(summary);
      });
      scannedPages += 1;
      if (!polyRows.length || !(polyData.pagination && polyData.pagination.hasMore)) break;
    }
  }
  return { events: matches, scannedPages: scannedPages };
}

function predictionMarketExternalDiscoveryR2Dedupe_(events) {
  var seen = {};
  return (events || []).filter(function(event) {
    var key = predictionMarketExternalDiscoveryR2Key_(event.provider) + "|" + predictionMarketExternalDiscoveryR2String_(event.externalEventId);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function predictionMarketExternalDiscoveryR2Search(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  var provider = predictionMarketExternalDiscoveryR2Key_(payload.provider || "both");
  if (provider === "all") provider = "both";
  if (["both", "kalshi", "polymarket"].indexOf(provider) === -1) throw new Error("Provider must be Kalshi, Polymarket, or Both.");
  var query = predictionMarketExternalDiscoveryR2String_(payload.query);
  if (query.length < 2) throw new Error("Enter at least 2 characters.");
  var options = predictionMarketExternalDiscoveryR2Options_(payload);
  var events = [];
  var errors = [];
  var scannedPages = 0;

  if (options.status === "open" || options.status === "all") {
    var openPayload = Object.assign({}, payload, options, { provider:provider, status:"open" });
    try {
      var openResult = apiAdminAwardsSearchExternalMarkets(openPayload);
      (Array.isArray(openResult && openResult.events) ? openResult.events : []).forEach(function(event) {
        event = Object.assign({}, event, { status:event.status || "open", groupedEvent:true, logicalQuestion:event.eventName || event.externalEventId, childMarketCount:event.childMarketCount == null ? (event.liveMarketCount || 0) : event.childMarketCount });
        if (predictionMarketExternalDiscoveryR2PassesDate_(event.closeTime, options)) events.push(event);
      });
      scannedPages += Number(openResult && openResult.scannedPages || 0);
      if (Array.isArray(openResult && openResult.errors)) errors = errors.concat(openResult.errors);
    } catch (err) {
      if (options.status === "open") throw err;
      errors.push(err && err.message ? err.message : String(err));
    }
  }

  if (options.status === "closed" || options.status === "all") {
    ["kalshi", "polymarket"].forEach(function(name) {
      if (provider !== "both" && provider !== name) return;
      try {
        var closed = predictionMarketExternalDiscoveryR2RawSearchProvider_(name, query, options);
        events = events.concat(closed.events || []);
        scannedPages += Number(closed.scannedPages || 0);
      } catch (err) {
        errors.push(name + ": " + (err && err.message ? err.message : String(err)));
      }
    });
  }

  events = predictionMarketExternalDiscoveryR2Dedupe_(events);
  events = awardsManagerSortEvents_(events, query, options.sort);
  return {
    success: true,
    contractVersion: PREDICTION_MARKET_EXTERNAL_DISCOVERY_R2_CONTRACT,
    query: query,
    provider: provider,
    events: events,
    results: [],
    options: options,
    scannedPages: scannedPages,
    errors: errors
  };
}

function predictionMarketExternalDiscoveryR2RawDetail_(provider, eventId) {
  var event;
  var rawMarkets;
  var markets;
  if (provider === "kalshi") {
    var data = awardsManagerFetchJson_(AWARDS_MANAGER_KALSHI_BASE + "/events/" + encodeURIComponent(eventId));
    event = data && data.event ? data.event : {};
    rawMarkets = Array.isArray(data && data.markets) ? data.markets : (Array.isArray(event.markets) ? event.markets : []);
    var eventName = awardsManagerString_(event.title || event.sub_title || event.event_ticker || eventId);
    markets = rawMarkets.map(function(market) {
      var result = awardsManagerKalshiResult_(market, event);
      result.eventName = eventName;
      result.externalEventId = awardsManagerString_(event.event_ticker || market.event_ticker || eventId);
      result.sourceUrl = awardsManagerKalshiWebMarketUrl_(market, event);
      if (!result.resolutionSource && Array.isArray(event.settlement_sources)) result.resolutionSource = awardsManagerKalshiSettlementSource_(event);
      return result;
    });
    return predictionMarketExternalDiscoveryR2EnrichDetail_({
      success:true, provider:"kalshi", externalEventId:awardsManagerString_(event.event_ticker || eventId), eventName:eventName,
      contextSubtitle:awardsManagerString_(event.sub_title), category:awardsManagerString_(event.category), seriesTicker:awardsManagerString_(event.series_ticker),
      closeTime:awardsManagerEventCloseTime_(event), status:predictionMarketExternalDiscoveryR2EventStatus_(event),
      sourceUrl:awardsManagerKalshiWebEventUrl_(event), officialSourceUrl:awardsManagerOfficialSourceUrl_(event, markets), markets:markets
    });
  }
  var poly = awardsManagerFetchJson_(AWARDS_MANAGER_POLYMARKET_BASE + "/events/" + encodeURIComponent(eventId));
  event = poly || {};
  rawMarkets = Array.isArray(event.markets) ? event.markets : [];
  markets = rawMarkets.map(function(market) { return awardsManagerPolymarketResult_(market, event); }).filter(Boolean);
  var polyName = awardsManagerString_(event.title || event.slug || event.id || eventId);
  return predictionMarketExternalDiscoveryR2EnrichDetail_({
    success:true, provider:"polymarket", externalEventId:awardsManagerString_(event.id || event.slug || eventId), eventName:polyName,
    contextSubtitle:awardsManagerString_(event.subtitle), category:awardsManagerString_(event.category || event.subcategory), seriesTicker:awardsManagerString_(event.ticker),
    closeTime:awardsManagerEventCloseTime_(event), status:predictionMarketExternalDiscoveryR2EventStatus_(event),
    sourceUrl:event.slug ? "https://polymarket.com/event/" + encodeURIComponent(event.slug) : "",
    officialSourceUrl:awardsManagerOfficialSourceUrl_(event, markets), markets:markets
  });
}

function predictionMarketExternalDiscoveryR2Detail(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  var provider = predictionMarketExternalDiscoveryR2Key_(payload.provider);
  var eventId = predictionMarketExternalDiscoveryR2String_(payload.eventId || payload.externalEventId);
  if (["kalshi", "polymarket"].indexOf(provider) === -1) throw new Error("Provider must be Kalshi or Polymarket.");
  if (!eventId) throw new Error("Selected provider event is missing its event ID.");
  var includeClosed = payload.includeClosed === true || predictionMarketExternalDiscoveryR2Status_(payload.status || "all") !== "open";
  var detail = includeClosed ? predictionMarketExternalDiscoveryR2RawDetail_(provider, eventId) : apiAdminAwardsGetExternalEvent(payload);
  return predictionMarketExternalDiscoveryR2EnrichDetail_(detail);
}

function predictionMarketExternalDiscoveryR2ParseReference_(value, providerHint) {
  var input = predictionMarketExternalDiscoveryR2String_(value);
  var hint = predictionMarketExternalDiscoveryR2Key_(providerHint || "auto");
  if (!input) throw new Error("Paste a Kalshi/Polymarket URL or provider event/market ID.");
  var result = { input:input, provider:"", eventId:"", marketId:"", slug:"" };
  var lower = input.toLowerCase();
  if (/^https?:\/\//i.test(input)) {
    if (lower.indexOf("kalshi.com/") !== -1) {
      result.provider = "kalshi";
      var kalshiEvent = input.match(/\/x\/([^/?#]+)/i);
      if (kalshiEvent) result.eventId = decodeURIComponent(kalshiEvent[1]);
      var kalshiMarket = input.match(/[?&]op_market_ticker=([^&#]+)/i);
      if (kalshiMarket) result.marketId = decodeURIComponent(kalshiMarket[1]);
    } else if (lower.indexOf("polymarket.com/") !== -1) {
      result.provider = "polymarket";
      var polyEvent = input.match(/\/event\/([^/?#]+)/i);
      if (polyEvent) result.slug = decodeURIComponent(polyEvent[1]);
    } else {
      throw new Error("Only official Kalshi or Polymarket URLs are supported.");
    }
  } else {
    if (hint === "kalshi" || hint === "polymarket") result.provider = hint;
    else if (/^kx[a-z0-9-]+$/i.test(input) || /^[A-Z0-9]+-[A-Z0-9-]+$/.test(input)) result.provider = "kalshi";
    else if (/^\d+$/.test(input)) result.provider = "polymarket";
    if (result.provider === "kalshi") {
      if (input.indexOf("-") !== -1) result.marketId = input;
      else result.eventId = input;
    } else if (result.provider === "polymarket") {
      if (/^\d+$/.test(input)) result.eventId = input;
      else result.slug = input;
    }
  }
  if (!result.provider) throw new Error("Choose Kalshi or Polymarket for an unrecognized provider ID.");
  if (!result.eventId && !result.marketId && !result.slug) throw new Error("Could not recognize a provider event or market identifier.");
  return result;
}

function predictionMarketExternalDiscoveryR2Resolve(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  var parsed = predictionMarketExternalDiscoveryR2ParseReference_(payload.reference || payload.urlOrId || payload.providerReference, payload.providerHint || payload.provider);
  var eventId = parsed.eventId;
  if (!eventId) {
    var searchText = parsed.marketId || parsed.slug;
    var search = predictionMarketExternalDiscoveryR2Search(Object.assign({}, payload, {
      provider:parsed.provider,
      query:searchText.replace(/[-_]+/g, " "),
      searchIn:parsed.marketId ? "markets" : "both",
      status:"all",
      exactPhrase:false
    }));
    var candidates = Array.isArray(search.events) ? search.events : [];
    var wanted = predictionMarketExternalDiscoveryR2Key_(parsed.slug || parsed.marketId);
    var match = candidates.filter(function(event) {
      if (parsed.slug && predictionMarketExternalDiscoveryR2Key_(event.sourceUrl).indexOf("/event/" + wanted) !== -1) return true;
      if (parsed.marketId && Array.isArray(event.markets)) {
        return event.markets.some(function(market) { return predictionMarketExternalDiscoveryR2Key_(market.externalMarketId) === wanted; });
      }
      return predictionMarketExternalDiscoveryR2Key_(event.externalEventId) === wanted;
    })[0] || candidates[0];
    if (!match) throw new Error("No provider event matched that URL or ID.");
    eventId = predictionMarketExternalDiscoveryR2String_(match.externalEventId);
  }
  var detail = predictionMarketExternalDiscoveryR2Detail(Object.assign({}, payload, { provider:parsed.provider, eventId:eventId, includeClosed:true, status:"all" }));
  return {
    success:true,
    contractVersion:PREDICTION_MARKET_EXTERNAL_DISCOVERY_R2_CONTRACT,
    resolvedReference:Object.assign({}, parsed, { eventId:eventId }),
    event:detail
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketExternalDiscoveryR2Options_: predictionMarketExternalDiscoveryR2Options_,
    predictionMarketExternalDiscoveryR2ParseReference_: predictionMarketExternalDiscoveryR2ParseReference_,
    predictionMarketExternalDiscoveryR2Snapshot_: predictionMarketExternalDiscoveryR2Snapshot_,
    predictionMarketExternalDiscoveryR2Search: predictionMarketExternalDiscoveryR2Search,
    predictionMarketExternalDiscoveryR2Detail: predictionMarketExternalDiscoveryR2Detail,
    predictionMarketExternalDiscoveryR2Resolve: predictionMarketExternalDiscoveryR2Resolve
  };
}
