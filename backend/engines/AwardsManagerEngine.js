
/* =====================================================
   AWARDS MANAGER — v1.2.12
   Live Kalshi/Polymarket discovery + safe Hub mappings.
===================================================== */

const AWARDS_MANAGER_VERSION = "1.2.12";
const AWARDS_MANAGER_KALSHI_BASE = "https://external-api.kalshi.com/trade-api/v2";
const AWARDS_MANAGER_POLYMARKET_BASE = "https://gamma-api.polymarket.com";
const AWARDS_MANAGER_PROVIDERS = ["kalshi", "polymarket"];

function awardsManagerString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
function awardsManagerKey_(value) {
  return awardsManagerString_(value).toLowerCase();
}
function awardsManagerSlug_(value) {
  return awardsManagerKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}
function awardsManagerParseJson_(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  const text = awardsManagerString_(value);
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (err) { return fallback; }
}
function awardsManagerCompactJson_(value, maxChars) {
  const limit = Math.max(1000, Number(maxChars || 24000));
  let text = "{}";
  try { text = JSON.stringify(value || {}); } catch (err) {}
  return text.length <= limit
    ? text
    : JSON.stringify({ truncated: true, preview: text.slice(0, limit - 100) });
}
function awardsManagerRequireAdmin_(payload) {
  if (typeof requireAdmin_ !== "function") {
    throw new Error("Administrator validation is unavailable.");
  }
  requireAdmin_(payload || {});
}
function awardsManagerFetchJson_(url) {
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      Accept: "application/json",
      "User-Agent": "AwardsApp-AwardsManager/" + AWARDS_MANAGER_VERSION
    }
  });
  const code = Number(response.getResponseCode() || 0);
  if (code < 200 || code >= 300) {
    throw new Error("Provider request failed (" + code + ").");
  }
  try { return JSON.parse(response.getContentText() || "{}"); }
  catch (err) { throw new Error("Provider returned invalid JSON."); }
}
function awardsManagerNumber_(value, fallback) {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}
function awardsManagerPercent_(value) {
  const n = awardsManagerNumber_(value, null);
  if (n === null) return null;
  return Math.max(0, Math.min(100, (n > 1 ? n / 100 : n) * 100));
}
function awardsManagerArray_(value) {
  const parsed = awardsManagerParseJson_(value, value);
  return Array.isArray(parsed) ? parsed : [];
}
function awardsManagerDateMs_(value) {
  const text = awardsManagerString_(value);
  if (!text) return null;

  const ms = Date.parse(text);
  return isNaN(ms) ? null : ms;
}

function awardsManagerMarketIsLive_(market, event) {
  market = market || {};
  event = event || {};

  const status = awardsManagerKey_(
    market.status ||
    event.status ||
    ""
  );

  if (
    status === "closed" ||
    status === "settled" ||
    status === "resolved" ||
    status === "archived"
  ) {
    return false;
  }

  if (
    market.closed === true ||
    event.closed === true ||
    market.archived === true ||
    event.archived === true ||
    market.active === false ||
    event.active === false
  ) {
    return false;
  }

  const closeMs = awardsManagerDateMs_(
    market.close_time ||
    market.endDate ||
    market.expected_expiration_time ||
    market.expiration_time ||
    event.endDate
  );

  if (closeMs !== null && closeMs < Date.now()) {
    return false;
  }

  return true;
}

function awardsManagerKalshiProbability_(market) {
  const last = awardsManagerNumber_(market.last_price_dollars, null);
  if (last !== null && last >= 0 && last <= 1) return last * 100;
  const bid = awardsManagerNumber_(market.yes_bid_dollars, null);
  const ask = awardsManagerNumber_(market.yes_ask_dollars, null);
  if (bid !== null && ask !== null) return ((bid + ask) / 2) * 100;
  if (bid !== null) return bid * 100;
  if (ask !== null) return ask * 100;
  return null;
}
function awardsManagerKalshiSettlementSource_(series) {
  const sources = Array.isArray(series && series.settlement_sources)
    ? series.settlement_sources
    : [];
  if (!sources.length) return "";
  return sources.map(function(source) {
    const name = awardsManagerString_(source && source.name);
    const url = awardsManagerString_(source && source.url);
    return [name, url].filter(Boolean).join(" — ");
  }).filter(Boolean).join(" · ");
}
function awardsManagerKalshiResult_(market, series) {
  const yesPct = awardsManagerKalshiProbability_(market);
  return {
    provider: "kalshi",
    externalEventId: awardsManagerString_(market.event_ticker),
    externalMarketId: awardsManagerString_(market.ticker),
    eventName: awardsManagerString_(
      market.title || (series && series.title) || market.event_ticker
    ),
    marketQuestion: awardsManagerString_(
      market.subtitle || market.title || market.yes_sub_title || market.ticker
    ),
    outcomes: ["Yes", "No"],
    prices: {
      Yes: yesPct,
      No: yesPct === null ? null : Math.max(0, 100 - yesPct)
    },
    primaryProbability: yesPct,
    closeTime: awardsManagerString_(
      market.close_time || market.expected_expiration_time || market.expiration_time
    ),
    status: awardsManagerString_(market.status || "open"),
    resolutionSource:
      awardsManagerKalshiSettlementSource_(series) ||
      awardsManagerString_(market.rules_primary || market.rules_secondary),
    sourceUrl: AWARDS_MANAGER_KALSHI_BASE +
      "/markets/" + encodeURIComponent(awardsManagerString_(market.ticker)),
    raw: {
      ticker: market.ticker,
      event_ticker: market.event_ticker,
      series_ticker: market.series_ticker || (series && series.ticker),
      title: market.title,
      subtitle: market.subtitle,
      yes_sub_title: market.yes_sub_title,
      no_sub_title: market.no_sub_title,
      yes_bid_dollars: market.yes_bid_dollars,
      yes_ask_dollars: market.yes_ask_dollars,
      last_price_dollars: market.last_price_dollars,
      close_time: market.close_time,
      status: market.status,
      rules_primary: market.rules_primary,
      rules_secondary: market.rules_secondary,
      settlement_sources: series && series.settlement_sources || []
    }
  };
}
function awardsManagerKalshiMarketMatches_(market, query) {
  const wanted = awardsManagerKey_(query);
  if (!wanted) return true;
  const haystack = [
    market.title, market.subtitle, market.yes_sub_title,
    market.no_sub_title, market.ticker, market.event_ticker,
    market.series_ticker
  ].map(awardsManagerKey_).join(" ");
  return haystack.indexOf(wanted) !== -1;
}

function awardsManagerKalshiSearch_(query, limit) {
  const wanted = awardsManagerKey_(query);
  const maxResults = Math.max(1, Math.min(Number(limit || 30), 60));
  const results = [];
  const seen = {};

  function addMarket_(market, series, allowSeriesMatch) {
    if (!market || results.length >= maxResults) return;
    if (!awardsManagerMarketIsLive_(market, null)) return;
    const ticker = awardsManagerString_(market.ticker);
    if (!ticker || seen[ticker]) return;
    if (!allowSeriesMatch && !awardsManagerKalshiMarketMatches_(market, wanted)) return;
    seen[ticker] = true;
    results.push(awardsManagerKalshiResult_(market, series || null));
  }

  // Kalshi does not expose a general free-text market endpoint.
  // Search series metadata first so broad terms such as MLB/Oscars can
  // discover the right family of markets without preloading ExternalMarkets.
  let matchingSeries = [];
  try {
    const seriesData = awardsManagerFetchJson_(AWARDS_MANAGER_KALSHI_BASE + "/series");
    const seriesRows = Array.isArray(seriesData.series) ? seriesData.series : [];
    matchingSeries = seriesRows.filter(function(series) {
      const haystack = [
        series.ticker,
        series.title,
        series.category,
        (series.tags || []).join(" ")
      ].map(awardsManagerKey_).join(" ");
      return wanted && haystack.indexOf(wanted) !== -1;
    }).slice(0, 8);
  } catch (err) {
    matchingSeries = [];
  }

  matchingSeries.forEach(function(series) {
    if (results.length >= maxResults) return;
    try {
      const url = AWARDS_MANAGER_KALSHI_BASE +
        "/markets?status=open&limit=1000&mve_filter=exclude&series_ticker=" +
        encodeURIComponent(awardsManagerString_(series.ticker));
      const data = awardsManagerFetchJson_(url);
      (Array.isArray(data.markets) ? data.markets : []).forEach(function(market) {
        addMarket_(market, series, true);
      });
    } catch (err) {}
  });

  // Direct market-title/ticker fallback catches entity names such as teams,
  // players, candidates, and movies that may not appear in the series title.
  let cursor = "";
  let page = 0;
  while (page < 2 && results.length < maxResults) {
    let url = AWARDS_MANAGER_KALSHI_BASE +
      "/markets?status=open&limit=1000&mve_filter=exclude";
    if (cursor) url += "&cursor=" + encodeURIComponent(cursor);

    const data = awardsManagerFetchJson_(url);
    const markets = Array.isArray(data.markets) ? data.markets : [];
    markets.forEach(function(market) {
      addMarket_(market, null, false);
    });

    cursor = awardsManagerString_(data.cursor);
    if (!cursor || !markets.length) break;
    page += 1;
  }

  return results;
}

function awardsManagerPolymarketSearch_(query, limit) {
  const maxResults = Math.max(1, Math.min(Number(limit || 30), 60));
  const url = AWARDS_MANAGER_POLYMARKET_BASE +
    "/public-search?q=" + encodeURIComponent(awardsManagerString_(query)) +
    "&limit_per_type=" + encodeURIComponent(Math.min(maxResults, 50)) +
    "&search_profiles=false&keep_closed_markets=0";

  const data = awardsManagerFetchJson_(url);
  const events = Array.isArray(data.events) ? data.events : [];
  const results = [];

  events.forEach(function(event) {
    const markets = Array.isArray(event.markets) ? event.markets : [];
    markets.forEach(function(market) {
      if (results.length >= maxResults) return;
      if (!awardsManagerMarketIsLive_(market, event)) return;

      const outcomes = awardsManagerArray_(market.outcomes)
        .map(awardsManagerString_)
        .filter(Boolean);
      const rawPrices = awardsManagerArray_(market.outcomePrices);
      const prices = {};
      outcomes.forEach(function(outcome, index) {
        prices[outcome] = awardsManagerPercent_(rawPrices[index]);
      });

      const marketId = awardsManagerString_(
        market.id || market.conditionId || market.condition_id || market.slug
      );
      if (!marketId) return;

      const yesOutcome = outcomes.find(function(outcome) {
        return awardsManagerKey_(outcome) === "yes";
      });
      const firstOutcome = yesOutcome || outcomes[0] || "";
      const eventSlug = awardsManagerString_(event.slug);

      results.push({
        provider: "polymarket",
        externalEventId: awardsManagerString_(event.id || event.slug || event.ticker),
        externalMarketId: marketId,
        eventName: awardsManagerString_(event.title || event.slug || event.id),
        marketQuestion: awardsManagerString_(
          market.question || market.title || market.marketTitle || event.title
        ),
        outcomes: outcomes.length ? outcomes : ["Yes", "No"],
        prices: prices,
        primaryProbability: firstOutcome ? prices[firstOutcome] : null,
        closeTime: awardsManagerString_(market.endDate || event.endDate),
        status: market.closed === true || event.closed === true ? "closed" : "open",
        resolutionSource: awardsManagerString_(
          market.resolutionSource || event.resolutionSource
        ),
        sourceUrl: eventSlug
          ? "https://polymarket.com/event/" + encodeURIComponent(eventSlug)
          : AWARDS_MANAGER_POLYMARKET_BASE + "/markets?id=" + encodeURIComponent(marketId),
        raw: {
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          marketId: market.id,
          conditionId: market.conditionId,
          marketSlug: market.slug,
          question: market.question,
          outcomes: market.outcomes,
          outcomePrices: market.outcomePrices,
          endDate: market.endDate,
          resolutionSource: market.resolutionSource,
          active: market.active,
          closed: market.closed
        }
      });
    });
  });

  return results;
}

function apiAdminAwardsGetDashboard(payload) {
  awardsManagerRequireAdmin_(payload);
  const gamesResult = typeof adminGetGames === "function"
    ? adminGetGames()
    : { success: true, games: typeof getGames === "function" ? getGames() : [] };

  return {
    success: true,
    version: AWARDS_MANAGER_VERSION,
    games: gamesResult.games || [],
    hubConfigured:
      typeof externalResultsBridgeGetHubId_ === "function" &&
      !!externalResultsBridgeGetHubId_(),
    providers: [
      { id: "kalshi", name: "Kalshi", liveSearch: true },
      { id: "polymarket", name: "Polymarket", liveSearch: true }
    ],
    safety: {
      readOnlyProviders: true,
      autoSettle: false,
      requireAdminReview: true
    }
  };
}
function apiAdminAwardsGetGameSetup(payload) {
  awardsManagerRequireAdmin_(payload);
  const gameId = awardsManagerString_((payload || {}).gameId);
  if (!gameId) throw new Error("Choose an Awards App game.");
  return adminGetGameSetup({ gameId: gameId });
}
function apiAdminAwardsSearchExternalMarkets(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  const query = awardsManagerString_(payload.query);
  const provider = awardsManagerKey_(payload.provider || "both");
  const limit = Math.max(1, Math.min(Number(payload.limit || 40), 60));

  if (query.length < 2) throw new Error("Enter at least 2 characters.");
  if (["both", "kalshi", "polymarket"].indexOf(provider) === -1) {
    throw new Error("Provider must be Kalshi, Polymarket, or Both.");
  }

  let results = [];
  const errors = [];
  if (provider === "both" || provider === "kalshi") {
    try { results = results.concat(awardsManagerKalshiSearch_(query, limit)); }
    catch (err) { errors.push("Kalshi: " + (err.message || err)); }
  }
  if (provider === "both" || provider === "polymarket") {
    try { results = results.concat(awardsManagerPolymarketSearch_(query, limit)); }
    catch (err) { errors.push("Polymarket: " + (err.message || err)); }
  }

  return {
    success: true,
    query: query,
    provider: provider,
    results: results.slice(0, limit),
    errors: errors
  };
}

function awardsManagerMarketPayload_(payload) {
  const market = awardsManagerParseJson_((payload || {}).marketJSON, null);
  if (!market || typeof market !== "object") {
    throw new Error("Selected provider market is missing.");
  }

  const provider = awardsManagerKey_(market.provider);
  if (AWARDS_MANAGER_PROVIDERS.indexOf(provider) === -1) {
    throw new Error("Market must come from Kalshi or Polymarket.");
  }

  const externalMarketId = awardsManagerString_(market.externalMarketId);
  if (!externalMarketId) throw new Error("Selected market has no market ID.");

  const outcomes = (Array.isArray(market.outcomes) ? market.outcomes : [])
    .map(awardsManagerString_)
    .filter(Boolean);

  return {
    provider: provider,
    externalEventId: awardsManagerString_(market.externalEventId || externalMarketId),
    externalMarketId: externalMarketId,
    eventName: awardsManagerString_(market.eventName || market.marketQuestion || externalMarketId),
    marketQuestion: awardsManagerString_(market.marketQuestion || market.eventName || externalMarketId),
    outcomes: outcomes.length ? outcomes : ["Yes", "No"],
    prices: market.prices && typeof market.prices === "object" ? market.prices : {},
    closeTime: awardsManagerString_(market.closeTime),
    status: awardsManagerString_(market.status || "open"),
    resolutionSource: awardsManagerString_(market.resolutionSource),
    sourceUrl: awardsManagerString_(market.sourceUrl),
    raw: market.raw || {}
  };
}
function awardsManagerMappingId_(gameId, categoryId, nomineeId, provider, marketId, outcome) {
  return [
    "map", awardsManagerSlug_(gameId), awardsManagerSlug_(categoryId),
    awardsManagerSlug_(nomineeId), awardsManagerSlug_(provider),
    awardsManagerSlug_(marketId).slice(-40), awardsManagerSlug_(outcome)
  ].filter(Boolean).join("-").slice(0, 220);
}
function awardsManagerQueueMarketBundle_(market, gameId, categoryId, outcomeMap) {
  if (typeof externalResultsBridgeEnqueue_ !== "function") {
    throw new Error("External Results Hub bridge is unavailable.");
  }

  const now = new Date();
  const mappings = [];
  Object.keys(outcomeMap || {}).forEach(function(outcome) {
    const nomineeId = awardsManagerString_(outcomeMap[outcome]);
    if (!nomineeId) return;

    mappings.push({
      MappingId: awardsManagerMappingId_(
        gameId, categoryId, nomineeId, market.provider,
        market.externalMarketId, outcome
      ),
      AppGameId: gameId,
      CategoryId: categoryId,
      NomineeId: nomineeId,
      Provider: market.provider,
      ExternalEventId: market.externalEventId,
      ExternalMarketId: market.externalMarketId,
      ExternalSubjectId: "",
      ResultKey: "winning-outcome",
      ComparisonOperator: "",
      Threshold: "",
      ExpectedOutcome: outcome,
      AutoSettle: false,
      RequireAdminReview: true,
      SourceUrl: market.sourceUrl,
      SourceConfigJSON: awardsManagerCompactJson_({
        source: "awards-manager",
        version: AWARDS_MANAGER_VERSION,
        marketQuestion: market.marketQuestion,
        eventName: market.eventName,
        livePrices: market.prices,
        resolutionSource: market.resolutionSource || ""
      }),
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    });
  });
  if (!mappings.length) throw new Error("Map at least one provider outcome.");

  return externalResultsBridgeEnqueue_(
    "UPSERT_EXTERNAL_MARKET_MAPPING",
    [market.provider, market.externalMarketId, gameId, categoryId].join("|"),
    market.provider,
    {
      event: {
        Provider: market.provider,
        ExternalEventId: market.externalEventId,
        EventName: market.eventName,
        EventType: "prediction-market",
        StartDate: "",
        EndDate: market.closeTime,
        Status: market.status || "active",
        SourceUrl: market.sourceUrl,
        LastUpdated: now,
        RawJSON: awardsManagerCompactJson_(market.raw),
        CreatedAt: now
      },
      market: {
        Provider: market.provider,
        ExternalMarketId: market.externalMarketId,
        ExternalEventId: market.externalEventId,
        MarketQuestion: market.marketQuestion,
        OutcomesJSON: JSON.stringify(market.outcomes || []),
        PricesJSON: JSON.stringify(market.prices || {}),
        ClosingTime: market.closeTime,
        ResolutionStatus: market.status || "open",
        WinningOutcome: "",
        ResolutionSource: market.resolutionSource,
        SourceUrl: market.sourceUrl,
        LastUpdated: now,
        RawJSON: awardsManagerCompactJson_(market.raw),
        CreatedAt: now
      },
      mappings: mappings
    }
  );
}

function apiAdminAwardsCreateQuestionFromMarket(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  const gameId = awardsManagerString_(payload.gameId);
  if (!gameId) throw new Error("Choose the Awards App game.");

  const market = awardsManagerMarketPayload_(payload);
  const question = awardsManagerString_(payload.question || market.marketQuestion);
  if (!question) throw new Error("Question text is required.");

  const categoryId = awardsManagerSlug_(payload.categoryId || question);
  if (!categoryId) throw new Error("Could not create Question ID.");

  const categoryResult = adminCreateCategory({
    gameId: gameId,
    categoryId: categoryId,
    category: question,
    section: awardsManagerString_(payload.section || "Awards"),
    points: Number(payload.points || 1),
    questionType: "award-single-winner",
    scoringEngine: "manual",
    selectionMode: "single",
    scoreMode: "fixed-points",
    oddsMode: "external-market",
    resultSource: "external-results-hub",
    resultSourceType: "prediction-market",
    resultProvider: market.provider,
    externalEventId: market.externalEventId,
    externalMarketId: market.externalMarketId,
    autoSettle: false,
    requireAdminReview: true,
    sourceUrl: market.sourceUrl,
    sourceConfigJSON: awardsManagerCompactJson_({
      source: "awards-manager",
      version: AWARDS_MANAGER_VERSION,
      provider: market.provider,
      marketQuestion: market.marketQuestion,
      resolutionSource: market.resolutionSource
    })
  });

  const outcomeMap = {};
  market.outcomes.forEach(function(outcome) {
    const nomineeId = awardsManagerSlug_(outcome);
    if (!nomineeId) return;
    adminCreateNominee({
      gameId: gameId,
      categoryId: categoryId,
      category: question,
      nomineeId: nomineeId,
      nominee: outcome,
      shortAnswer: outcome,
      section: awardsManagerString_(payload.section || "Awards"),
      active: true,
      predictionGame: true
    });
    outcomeMap[outcome] = nomineeId;
  });

  const bridge = awardsManagerQueueMarketBundle_(market, gameId, categoryId, outcomeMap);
  return {
    success: true,
    message: "Question created and provider market queued to the External Results Hub.",
    gameId: gameId,
    categoryId: categoryId,
    categoryResult: categoryResult,
    bridge: bridge,
    safety: { autoSettle: false, requireAdminReview: true }
  };
}

function apiAdminAwardsLinkMarket(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  const gameId = awardsManagerString_(payload.gameId);
  const categoryId = awardsManagerString_(payload.categoryId);
  if (!gameId) throw new Error("Choose the Awards App game.");
  if (!categoryId) throw new Error("Choose the Awards App question.");

  const market = awardsManagerMarketPayload_(payload);
  const setup = adminGetGameSetup({ gameId: gameId });
  const category = (setup.categories || []).find(function(item) {
    return awardsManagerKey_(item.categoryId) === awardsManagerKey_(categoryId);
  });
  if (!category) throw new Error("Selected question was not found.");

  const nomineeLookup = {};
  (category.nominees || []).forEach(function(nominee) {
    nomineeLookup[awardsManagerKey_(nominee.nomineeId)] = true;
  });

  const requested = awardsManagerParseJson_(payload.outcomeMapJSON, {});
  const safeMap = {};
  market.outcomes.forEach(function(outcome) {
    const nomineeId = awardsManagerString_(requested[outcome]);
    if (!nomineeId) return;
    if (!nomineeLookup[awardsManagerKey_(nomineeId)]) {
      throw new Error("Mapped answer not found: " + nomineeId);
    }
    safeMap[outcome] = nomineeId;
  });
  if (!Object.keys(safeMap).length) throw new Error("Map at least one provider outcome.");

  adminUpdateCategory({
    gameId: gameId,
    categoryId: categoryId,
    resultSource: "external-results-hub",
    resultSourceType: "prediction-market",
    resultProvider: market.provider,
    externalEventId: market.externalEventId,
    externalMarketId: market.externalMarketId,
    autoSettle: false,
    requireAdminReview: true,
    sourceUrl: market.sourceUrl,
    sourceConfigJSON: awardsManagerCompactJson_({
      source: "awards-manager",
      version: AWARDS_MANAGER_VERSION,
      provider: market.provider,
      marketQuestion: market.marketQuestion,
      resolutionSource: market.resolutionSource
    }),
    skipCategoryResultWrite: true
  });

  const bridge = awardsManagerQueueMarketBundle_(market, gameId, categoryId, safeMap);
  return {
    success: true,
    message: "Provider market linked and queued to the External Results Hub.",
    gameId: gameId,
    categoryId: categoryId,
    outcomeMap: safeMap,
    bridge: bridge,
    safety: { autoSettle: false, requireAdminReview: true }
  };
}
