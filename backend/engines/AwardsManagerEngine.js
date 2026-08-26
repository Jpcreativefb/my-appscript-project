
/* =====================================================
   AWARDS MANAGER — v1.2.12
   Live Kalshi/Polymarket discovery + safe Hub mappings.
===================================================== */

const AWARDS_MANAGER_VERSION = "1.2.16";
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
function awardsManagerDecimalOddsFromProbability_(value) {
  const percent = awardsManagerPercent_(value);
  if (percent === null || percent <= 0 || percent >= 100) return "";
  return Math.round(Math.max(1.01, 100 / percent) * 10000) / 10000;
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

function awardsManagerSafeHttpUrl_(value) {
  const text = awardsManagerString_(value);
  if (!text) return "";
  if (!/^https?:\/\//i.test(text)) {
    throw new Error("Official Website URL must start with http:// or https://.");
  }
  return text.slice(0, 2000);
}

function awardsManagerExtractHttpUrl_(value) {
  const text = awardsManagerString_(value);
  if (!text) return "";
  const match = text.match(/https?:\/\/[^\s·<>"]+/i);
  if (!match) return "";
  return String(match[0] || "").replace(/[),.;]+$/, "");
}

function awardsManagerIsProviderUrl_(value) {
  const url = awardsManagerKey_(value);
  return url.indexOf("kalshi.com") !== -1 ||
    url.indexOf("polymarket.com") !== -1 ||
    url.indexOf("gamma-api.polymarket.com") !== -1;
}

function awardsManagerOfficialSourceUrl_(event, markets) {
  event = event || {};

  const settlementSources = Array.isArray(event.settlement_sources)
    ? event.settlement_sources
    : [];

  for (let i = 0; i < settlementSources.length; i += 1) {
    const candidate = awardsManagerExtractHttpUrl_(
      settlementSources[i] && settlementSources[i].url
    );
    if (candidate && !awardsManagerIsProviderUrl_(candidate)) return candidate;
  }

  const direct = [
    event.resolutionSource,
    event.resolution_source,
    event.rules_primary,
    event.rules_secondary
  ];

  for (let j = 0; j < direct.length; j += 1) {
    const candidate = awardsManagerExtractHttpUrl_(direct[j]);
    if (candidate && !awardsManagerIsProviderUrl_(candidate)) return candidate;
  }

  const rows = Array.isArray(markets) ? markets : [];
  for (let k = 0; k < rows.length; k += 1) {
    const market = rows[k] || {};
    const raw = market.raw || {};
    const rawSources = Array.isArray(raw.settlement_sources)
      ? raw.settlement_sources
      : [];

    for (let s = 0; s < rawSources.length; s += 1) {
      const candidate = awardsManagerExtractHttpUrl_(
        rawSources[s] && rawSources[s].url
      );
      if (candidate && !awardsManagerIsProviderUrl_(candidate)) return candidate;
    }

    const candidate = awardsManagerExtractHttpUrl_(market.resolutionSource);
    if (candidate && !awardsManagerIsProviderUrl_(candidate)) return candidate;
  }

  return "";
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
    sourceUrl:
      awardsManagerKalshiWebMarketUrl_(
        market,
        series || {}
      ),
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


function awardsManagerPolymarketResult_(market, event) {
  market = market || {};
  event = event || {};

  const outcomes = awardsManagerArray_(market.outcomes)
    .map(awardsManagerString_)
    .filter(Boolean);

  const rawPrices = awardsManagerArray_(market.outcomePrices);
  const prices = {};

  outcomes.forEach(function(outcome, index) {
    prices[outcome] = awardsManagerPercent_(rawPrices[index]);
  });

  const marketId = awardsManagerString_(
    market.id ||
    market.conditionId ||
    market.condition_id ||
    market.slug
  );

  if (!marketId) return null;

  const yesOutcome = outcomes.find(function(outcome) {
    return awardsManagerKey_(outcome) === "yes";
  });

  const firstOutcome = yesOutcome || outcomes[0] || "";
  const eventSlug = awardsManagerString_(event.slug);

  return {
    provider: "polymarket",
    externalEventId: awardsManagerString_(
      event.id || event.slug || event.ticker
    ),
    externalMarketId: marketId,
    eventName: awardsManagerString_(
      event.title || event.slug || event.id
    ),
    marketQuestion: awardsManagerString_(
      market.question ||
      market.title ||
      market.marketTitle ||
      event.title
    ),
    outcomes: outcomes.length ? outcomes : ["Yes", "No"],
    prices: prices,
    primaryProbability: firstOutcome
      ? prices[firstOutcome]
      : null,
    closeTime: awardsManagerString_(
      market.endDate || event.endDate
    ),
    status:
      market.closed === true || event.closed === true
        ? "closed"
        : "open",
    resolutionSource: awardsManagerString_(
      market.resolutionSource ||
      event.resolutionSource
    ),
    sourceUrl: eventSlug
      ? "https://polymarket.com/event/" +
        encodeURIComponent(eventSlug)
      : AWARDS_MANAGER_POLYMARKET_BASE +
        "/markets?id=" +
        encodeURIComponent(marketId),
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
  };
}

function awardsManagerKalshiEvent_(eventId) {
  const data = awardsManagerFetchJson_(
    AWARDS_MANAGER_KALSHI_BASE +
    "/events/" +
    encodeURIComponent(eventId)
  );

  const event = data && data.event
    ? data.event
    : {};

  const rawMarkets = Array.isArray(data && data.markets)
    ? data.markets
    : (
        Array.isArray(event.markets)
          ? event.markets
          : []
      );

  const eventName = awardsManagerString_(
    event.title ||
    event.sub_title ||
    event.event_ticker ||
    eventId
  );

  const markets = rawMarkets
    .filter(function(market) {
      return awardsManagerMarketIsLive_(market, event);
    })
    .map(function(market) {
      const result = awardsManagerKalshiResult_(
        market,
        event
      );

      result.eventName = eventName;
      result.externalEventId = awardsManagerString_(
        event.event_ticker ||
        market.event_ticker ||
        eventId
      );

      if (
        !result.resolutionSource &&
        Array.isArray(event.settlement_sources)
      ) {
        result.resolutionSource =
          awardsManagerKalshiSettlementSource_(event);
      }

      return result;
    });

  return {
    success: true,
    provider: "kalshi",
    externalEventId: awardsManagerString_(
      event.event_ticker || eventId
    ),
    eventName: eventName,
    contextSubtitle: awardsManagerString_(event.sub_title),
    category: awardsManagerString_(event.category),
    seriesTicker: awardsManagerString_(event.series_ticker),
    closeTime: awardsManagerEventCloseTime_(event),
    contextComplete: awardsManagerContextComplete_({
      eventName: eventName,
      contextSubtitle: event.sub_title,
      category: event.category,
      seriesTicker: event.series_ticker
    }),
    status: awardsManagerString_(event.status || "open"),
    sourceUrl:
      awardsManagerKalshiWebEventUrl_(event),
    officialSourceUrl: awardsManagerOfficialSourceUrl_(event, markets),
    markets: markets
  };
}

function awardsManagerPolymarketEvent_(eventId) {
  const data = awardsManagerFetchJson_(
    AWARDS_MANAGER_POLYMARKET_BASE +
    "/events/" +
    encodeURIComponent(eventId)
  );

  const event = data || {};
  const eventName = awardsManagerString_(
    event.title ||
    event.slug ||
    event.id ||
    eventId
  );

  const markets = (
    Array.isArray(event.markets)
      ? event.markets
      : []
  )
    .filter(function(market) {
      return awardsManagerMarketIsLive_(market, event);
    })
    .map(function(market) {
      return awardsManagerPolymarketResult_(
        market,
        event
      );
    })
    .filter(Boolean);

  return {
    success: true,
    provider: "polymarket",
    externalEventId: awardsManagerString_(
      event.id || event.slug || eventId
    ),
    eventName: eventName,
    contextSubtitle: awardsManagerString_(event.subtitle),
    category: awardsManagerString_(
      event.category || event.subcategory
    ),
    seriesTicker: awardsManagerString_(event.ticker),
    closeTime: awardsManagerEventCloseTime_(event),
    contextComplete: awardsManagerContextComplete_({
      eventName: eventName,
      contextSubtitle: event.subtitle,
      category: event.category || event.subcategory,
      seriesTicker: event.ticker
    }),
    status:
      event.closed === true
        ? "closed"
        : "open",
    sourceUrl: event.slug
      ? "https://polymarket.com/event/" +
        encodeURIComponent(event.slug)
      : AWARDS_MANAGER_POLYMARKET_BASE +
        "/events/" +
        encodeURIComponent(eventId),
    officialSourceUrl: awardsManagerOfficialSourceUrl_(event, markets),
    markets: markets
  };
}

function apiAdminAwardsGetExternalEvent(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};

  const provider = awardsManagerKey_(
    payload.provider
  );

  const eventId = awardsManagerString_(
    payload.eventId ||
    payload.externalEventId
  );

  if (
    AWARDS_MANAGER_PROVIDERS.indexOf(provider) === -1
  ) {
    throw new Error(
      "Provider must be Kalshi or Polymarket."
    );
  }

  if (!eventId) {
    throw new Error(
      "Selected provider event is missing its event ID."
    );
  }

  const result = provider === "kalshi"
    ? awardsManagerKalshiEvent_(eventId)
    : awardsManagerPolymarketEvent_(eventId);

  if (
    !result ||
    !Array.isArray(result.markets)
  ) {
    throw new Error(
      "Could not load provider event markets."
    );
  }

  return result;
}


function awardsManagerBool_(value) {
  if (value === true || value === false) return value;
  return ["1", "true", "yes", "on"].indexOf(
    awardsManagerKey_(value)
  ) !== -1;
}

function awardsManagerSearchTokens_(query) {
  return awardsManagerKey_(query)
    .split(/\s+/)
    .map(function(token) {
      return token.trim();
    })
    .filter(Boolean);
}

function awardsManagerSearchTextMatches_(parts, query, exactPhrase) {
  const haystack = (parts || [])
    .map(awardsManagerKey_)
    .filter(Boolean)
    .join(" ");

  const wanted = awardsManagerKey_(query);
  if (!wanted) return true;

  if (exactPhrase === true) {
    return haystack.indexOf(wanted) !== -1;
  }

  const tokens = awardsManagerSearchTokens_(wanted);
  return tokens.every(function(token) {
    return haystack.indexOf(token) !== -1;
  });
}

function awardsManagerEventCloseTime_(event) {
  event = event || {};

  const direct = awardsManagerString_(
    event.endDate ||
    event.end_date ||
    event.strike_date
  );
  if (direct) return direct;

  const markets = Array.isArray(event.markets)
    ? event.markets
    : [];

  const times = markets
    .map(function(market) {
      return awardsManagerString_(
        market.close_time ||
        market.endDate ||
        market.expected_expiration_time ||
        market.expiration_time
      );
    })
    .filter(Boolean)
    .sort();

  return times.length
    ? times[times.length - 1]
    : "";
}

function awardsManagerEventPassesCloseFilter_(event, closeDays) {
  const days = Number(closeDays || 0);
  if (!days || days < 1) return true;

  const closeTime = awardsManagerEventCloseTime_(event);
  const closeMs = awardsManagerDateMs_(closeTime);

  if (closeMs === null) return true;

  const maxMs =
    Date.now() +
    (days * 24 * 60 * 60 * 1000);

  return closeMs <= maxMs;
}

function awardsManagerEventPassesCategory_(event, category) {
  const wanted = awardsManagerKey_(category);
  if (!wanted || wanted === "all") return true;

  const haystack = [
    event && event.category,
    event && event.subcategory,
    event && event.series_ticker,
    event && event.title,
    event && event.sub_title,
    event && event.subtitle
  ]
    .map(awardsManagerKey_)
    .join(" ");

  return haystack.indexOf(wanted) !== -1;
}

function awardsManagerEventMatchesSearch_(event, query, options) {
  event = event || {};
  options = options || {};

  if (!awardsManagerEventPassesCategory_(
    event,
    options.category
  )) {
    return false;
  }

  if (!awardsManagerEventPassesCloseFilter_(
    event,
    options.closeDays
  )) {
    return false;
  }

  const eventParts = [
    event.title,
    event.sub_title,
    event.subtitle,
    event.description,
    event.category,
    event.subcategory,
    event.series_ticker,
    event.event_ticker,
    event.ticker,
    event.slug
  ];

  const markets = Array.isArray(event.markets)
    ? event.markets
    : [];

  const marketParts = [];

  markets.forEach(function(market) {
    marketParts.push(
      market.title,
      market.subtitle,
      market.question,
      market.yes_sub_title,
      market.no_sub_title,
      market.ticker,
      market.event_ticker,
      market.series_ticker
    );
  });

  const scope = awardsManagerKey_(
    options.searchIn || "both"
  );

  const parts = scope === "event"
    ? eventParts
    : scope === "markets"
      ? marketParts
      : eventParts.concat(marketParts);

  return awardsManagerSearchTextMatches_(
    parts,
    query,
    options.exactPhrase === true
  );
}

function awardsManagerKalshiWebEventUrl_(event) {
  event = event || {};

  const seriesTicker = awardsManagerKey_(
    event.series_ticker
  );

  const eventTicker = awardsManagerKey_(
    event.event_ticker
  );

  if (seriesTicker && eventTicker) {
    return "https://kalshi.com/markets/" +
      encodeURIComponent(seriesTicker) +
      "/x/" +
      encodeURIComponent(eventTicker);
  }

  return "https://kalshi.com/markets";
}

function awardsManagerKalshiWebMarketUrl_(market, event) {
  const eventUrl =
    awardsManagerKalshiWebEventUrl_(event);

  const ticker = awardsManagerString_(
    market && market.ticker
  );

  if (!ticker) return eventUrl;

  return eventUrl +
    "?op_market_ticker=" +
    encodeURIComponent(ticker);
}

function awardsManagerContextComplete_(summary) {
  summary = summary || {};

  const title = awardsManagerString_(
    summary.eventName
  );

  const detail = [
    summary.category,
    summary.contextSubtitle,
    summary.seriesTicker
  ]
    .map(awardsManagerString_)
    .filter(Boolean)
    .join(" ");

  if (title.length >= 12 && detail) {
    return true;
  }

  return title.length >= 22;
}

function awardsManagerKalshiEventSummary_(event, query) {
  event = event || {};

  const liveMarkets = (
    Array.isArray(event.markets)
      ? event.markets
      : []
  )
    .filter(function(market) {
      return awardsManagerMarketIsLive_(
        market,
        event
      );
    });

  const matchingMarkets = liveMarkets
    .filter(function(market) {
      return awardsManagerSearchTextMatches_(
        [
          market.title,
          market.subtitle,
          market.yes_sub_title,
          market.no_sub_title,
          market.ticker
        ],
        query,
        false
      );
    });

  const previewSource = matchingMarkets.length
    ? matchingMarkets
    : liveMarkets;

  const previewMarkets = previewSource
    .slice(0, 3)
    .map(function(market) {
      const row =
        awardsManagerKalshiResult_(
          market,
          event
        );

      row.sourceUrl =
        awardsManagerKalshiWebMarketUrl_(
          market,
          event
        );

      return row;
    });

  const summary = {
    provider: "kalshi",
    externalEventId: awardsManagerString_(
      event.event_ticker
    ),
    eventName: awardsManagerString_(
      event.title ||
      event.sub_title ||
      event.event_ticker
    ),
    contextSubtitle: awardsManagerString_(
      event.sub_title
    ),
    category: awardsManagerString_(
      event.category
    ),
    seriesTicker: awardsManagerString_(
      event.series_ticker
    ),
    closeTime: awardsManagerEventCloseTime_(event),
    liveMarketCount: liveMarkets.length,
    matchingMarketCount: matchingMarkets.length,
    markets: previewMarkets,
    sourceUrl:
      awardsManagerKalshiWebEventUrl_(event),
    originalMarketUrl:
      previewMarkets[0] &&
      previewMarkets[0].sourceUrl
        ? previewMarkets[0].sourceUrl
        : awardsManagerKalshiWebEventUrl_(event)
  };

  summary.contextComplete =
    awardsManagerContextComplete_(summary);

  return summary;
}

function awardsManagerPolymarketEventSummary_(event, query) {
  event = event || {};

  const liveMarkets = (
    Array.isArray(event.markets)
      ? event.markets
      : []
  )
    .filter(function(market) {
      return awardsManagerMarketIsLive_(
        market,
        event
      );
    });

  const matchingMarkets = liveMarkets
    .filter(function(market) {
      return awardsManagerSearchTextMatches_(
        [
          market.question,
          market.title,
          market.slug
        ],
        query,
        false
      );
    });

  const previewSource = matchingMarkets.length
    ? matchingMarkets
    : liveMarkets;

  const previewMarkets = previewSource
    .slice(0, 3)
    .map(function(market) {
      return awardsManagerPolymarketResult_(
        market,
        event
      );
    })
    .filter(Boolean);

  const eventSlug = awardsManagerString_(
    event.slug
  );

  const eventUrl = eventSlug
    ? "https://polymarket.com/event/" +
      encodeURIComponent(eventSlug)
    : AWARDS_MANAGER_POLYMARKET_BASE +
      "/events/" +
      encodeURIComponent(
        awardsManagerString_(
          event.id || event.ticker
        )
      );

  const summary = {
    provider: "polymarket",
    externalEventId: awardsManagerString_(
      event.id ||
      event.slug ||
      event.ticker
    ),
    eventName: awardsManagerString_(
      event.title ||
      event.subtitle ||
      event.slug ||
      event.id
    ),
    contextSubtitle: awardsManagerString_(
      event.subtitle
    ),
    category: awardsManagerString_(
      event.category ||
      event.subcategory
    ),
    seriesTicker: awardsManagerString_(
      event.ticker
    ),
    closeTime: awardsManagerEventCloseTime_(event),
    liveMarketCount: liveMarkets.length,
    matchingMarketCount: matchingMarkets.length,
    markets: previewMarkets,
    sourceUrl: eventUrl,
    originalMarketUrl:
      previewMarkets[0] &&
      previewMarkets[0].sourceUrl
        ? previewMarkets[0].sourceUrl
        : eventUrl
  };

  summary.contextComplete =
    awardsManagerContextComplete_(summary);

  return summary;
}

function awardsManagerSortEvents_(events, query, sortMode) {
  const wanted = awardsManagerKey_(query);
  const mode = awardsManagerKey_(
    sortMode || "relevance"
  );

  function relevance_(event) {
    const title = awardsManagerKey_(
      event.eventName
    );

    let score = 0;

    if (title === wanted) score += 100;
    if (
      wanted &&
      title.indexOf(wanted) === 0
    ) {
      score += 60;
    }
    if (
      wanted &&
      title.indexOf(wanted) !== -1
    ) {
      score += 40;
    }

    score += Math.min(
      20,
      Number(event.matchingMarketCount || 0)
    );

    return score;
  }

  return (events || []).slice().sort(
    function(a, b) {
      if (mode === "title") {
        return (
          awardsManagerKey_(a.eventName)
            .localeCompare(
              awardsManagerKey_(b.eventName)
            ) ||
          awardsManagerKey_(a.externalEventId)
            .localeCompare(
              awardsManagerKey_(b.externalEventId)
            )
        );
      }

      if (mode === "closing") {
        const aMs =
          awardsManagerDateMs_(a.closeTime);
        const bMs =
          awardsManagerDateMs_(b.closeTime);

        if (
          aMs !== null &&
          bMs !== null &&
          aMs !== bMs
        ) {
          return aMs - bMs;
        }
      }

      const scoreDiff =
        relevance_(b) -
        relevance_(a);

      if (scoreDiff) return scoreDiff;

      return (
        awardsManagerKey_(a.eventName)
          .localeCompare(
            awardsManagerKey_(b.eventName)
          ) ||
        awardsManagerKey_(a.externalEventId)
          .localeCompare(
            awardsManagerKey_(b.externalEventId)
          )
      );
    }
  );
}

function awardsManagerKalshiEventSearchPage_(
  query,
  options,
  state
) {
  options = options || {};
  state = state || {};

  if (state.done === true) {
    return {
      events: [],
      state: state,
      scannedPages: 0
    };
  }

  const matches = [];
  let cursor = awardsManagerString_(
    state.cursor
  );

  let pagesScanned = 0;
  const maxPagesPerRequest = 4;
  const targetMatches = 20;

  while (
    pagesScanned < maxPagesPerRequest &&
    matches.length < targetMatches
  ) {
    let url =
      AWARDS_MANAGER_KALSHI_BASE +
      "/events?status=open" +
      "&limit=50" +
      "&with_nested_markets=true";

    if (cursor) {
      url +=
        "&cursor=" +
        encodeURIComponent(cursor);
    }

    const data =
      awardsManagerFetchJson_(url);

    const rows = Array.isArray(data.events)
      ? data.events
      : [];

    rows.forEach(function(event) {
      if (
        awardsManagerEventMatchesSearch_(
          event,
          query,
          options
        )
      ) {
        matches.push(
          awardsManagerKalshiEventSummary_(
            event,
            query
          )
        );
      }
    });

    pagesScanned += 1;

    cursor = awardsManagerString_(
      data.cursor
    );

    if (!cursor || !rows.length) {
      break;
    }
  }

  return {
    events: matches,
    scannedPages: pagesScanned,
    state: {
      cursor: cursor,
      done: !cursor,
      totalScannedPages:
        Number(state.totalScannedPages || 0) +
        pagesScanned
    }
  };
}

function awardsManagerPolymarketEventSearchPage_(
  query,
  options,
  state
) {
  options = options || {};
  state = state || {};

  if (state.done === true) {
    return {
      events: [],
      state: state,
      scannedPages: 0
    };
  }

  let page = Math.max(
    1,
    Number(state.page || 1)
  );

  let pagesScanned = 0;
  let hasMore = true;

  const matches = [];
  const maxPagesPerRequest = 3;
  const targetMatches = 20;

  while (
    pagesScanned < maxPagesPerRequest &&
    matches.length < targetMatches &&
    hasMore
  ) {
    const url =
      AWARDS_MANAGER_POLYMARKET_BASE +
      "/public-search?q=" +
      encodeURIComponent(
        awardsManagerString_(query)
      ) +
      "&limit_per_type=20" +
      "&page=" +
      encodeURIComponent(page) +
      "&search_profiles=false" +
      "&keep_closed_markets=0";

    const data =
      awardsManagerFetchJson_(url);

    const rows = Array.isArray(data.events)
      ? data.events
      : [];

    rows.forEach(function(event) {
      if (
        awardsManagerMarketIsLive_(
          null,
          event
        ) &&
        awardsManagerEventMatchesSearch_(
          event,
          query,
          options
        )
      ) {
        matches.push(
          awardsManagerPolymarketEventSummary_(
            event,
            query
          )
        );
      }
    });

    hasMore = !!(
      data.pagination &&
      data.pagination.hasMore
    );

    page += 1;
    pagesScanned += 1;

    if (!rows.length) {
      hasMore = false;
    }
  }

  return {
    events: matches,
    scannedPages: pagesScanned,
    state: {
      page: page,
      done: !hasMore,
      totalScannedPages:
        Number(state.totalScannedPages || 0) +
        pagesScanned
    }
  };
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

  const query = awardsManagerString_(
    payload.query
  );

  const provider = awardsManagerKey_(
    payload.provider || "both"
  );

  if (query.length < 2) {
    throw new Error(
      "Enter at least 2 characters."
    );
  }

  if (
    ["both", "kalshi", "polymarket"]
      .indexOf(provider) === -1
  ) {
    throw new Error(
      "Provider must be Kalshi, Polymarket, or Both."
    );
  }

  const options = {
    category: awardsManagerString_(
      payload.category
    ),
    searchIn: awardsManagerKey_(
      payload.searchIn || "both"
    ),
    closeDays: Number(
      payload.closeDays || 0
    ),
    exactPhrase: awardsManagerBool_(
      payload.exactPhrase
    ),
    sort: awardsManagerKey_(
      payload.sort || "relevance"
    )
  };

  const searchState =
    awardsManagerParseJson_(
      payload.searchStateJSON,
      {}
    ) || {};

  let events = [];
  const errors = [];
  const providerState = {};
  const scanInfo = {};

  if (
    provider === "both" ||
    provider === "kalshi"
  ) {
    try {
      const kalshi =
        awardsManagerKalshiEventSearchPage_(
          query,
          options,
          searchState.kalshi || {}
        );

      events = events.concat(
        kalshi.events || []
      );

      providerState.kalshi =
        kalshi.state || {};

      scanInfo.kalshi =
        kalshi.scannedPages || 0;
    } catch (err) {
      errors.push(
        "Kalshi: " +
        (err.message || err)
      );

      providerState.kalshi =
        searchState.kalshi || {
          done: true
        };
    }
  }

  if (
    provider === "both" ||
    provider === "polymarket"
  ) {
    try {
      const polymarket =
        awardsManagerPolymarketEventSearchPage_(
          query,
          options,
          searchState.polymarket || {}
        );

      events = events.concat(
        polymarket.events || []
      );

      providerState.polymarket =
        polymarket.state || {};

      scanInfo.polymarket =
        polymarket.scannedPages || 0;
    } catch (err) {
      errors.push(
        "Polymarket: " +
        (err.message || err)
      );

      providerState.polymarket =
        searchState.polymarket || {
          done: true
        };
    }
  }

  const seen = {};

  events = events.filter(
    function(event) {
      const key = [
        event.provider,
        event.externalEventId
      ]
        .map(awardsManagerKey_)
        .join("|");

      if (!key || seen[key]) {
        return false;
      }

      seen[key] = true;
      return true;
    }
  );

  events =
    awardsManagerSortEvents_(
      events,
      query,
      options.sort
    );

  const kalshiMore =
    (
      provider === "both" ||
      provider === "kalshi"
    ) &&
    !(
      providerState.kalshi &&
      providerState.kalshi.done === true
    );

  const polymarketMore =
    (
      provider === "both" ||
      provider === "polymarket"
    ) &&
    !(
      providerState.polymarket &&
      providerState.polymarket.done === true
    );

  return {
    success: true,
    version: AWARDS_MANAGER_VERSION,
    query: query,
    provider: provider,
    events: events,
    results: [],
    options: options,
    searchState: providerState,
    hasMore: !!(
      kalshiMore ||
      polymarketMore
    ),
    scannedPages: scanInfo,
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
    officialSourceUrl: awardsManagerString_(market.officialSourceUrl),
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
function awardsManagerQueueMarketBundle_(market, gameId, categoryId, outcomeMap, officialSourceUrl, staleMappings) {
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
        resolutionSource: market.resolutionSource || "",
        officialSourceUrl: officialSourceUrl || "",
        providerSourceUrl: market.sourceUrl || "",
        sourcePriority: officialSourceUrl ? ["official", "provider", "manual"] : ["provider", "manual"]
      }),
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    });
  });
  if (!mappings.length) throw new Error("Map at least one provider outcome.");
  (Array.isArray(staleMappings) ? staleMappings : []).forEach(function(row) {
    if (row && awardsManagerString_(row.MappingId)) mappings.push(row);
  });

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


function awardsManagerGroupedAnswerLabel_(market) {
  market = market || {};
  const raw = market.raw || {};

  const explicit = awardsManagerString_(
    raw.yes_sub_title ||
    raw.yesTitle ||
    raw.yes_title ||
    raw.outcomeLabel ||
    raw.answerLabel
  );
  if (explicit) return explicit;

  const question = awardsManagerString_(
    market.marketQuestion ||
    market.eventName ||
    market.externalMarketId
  );

  const willMatch = question.match(
    /^Will\s+(.+?)\s+(?:win|be|become|receive|take|finish|lead|earn)\b/i
  );
  if (willMatch && awardsManagerString_(willMatch[1])) {
    return awardsManagerString_(willMatch[1]);
  }

  return question;
}

function awardsManagerQueueMarketGroup_(markets, gameId, categoryId, nomineeByMarketId, officialSourceUrl) {
  if (typeof externalResultsBridgeEnqueue_ !== "function") {
    throw new Error("External Results Hub bridge is unavailable.");
  }

  const usable = (Array.isArray(markets) ? markets : [])
    .filter(function(market) {
      return market &&
        awardsManagerString_(market.externalMarketId) &&
        awardsManagerString_(market.provider);
    });

  if (usable.length < 2) {
    throw new Error("Choose at least two related markets for a grouped question.");
  }

  const provider = awardsManagerKey_(usable[0].provider);
  const eventId = awardsManagerString_(usable[0].externalEventId);

  usable.forEach(function(market) {
    if (awardsManagerKey_(market.provider) !== provider) {
      throw new Error("Grouped markets must come from the same provider.");
    }
    if (
      eventId &&
      awardsManagerString_(market.externalEventId) &&
      awardsManagerKey_(market.externalEventId) !== awardsManagerKey_(eventId)
    ) {
      throw new Error("Grouped markets must belong to the same provider event.");
    }
  });

  const now = new Date();
  const first = usable[0];
  const marketRows = [];
  const mappings = [];

  usable.forEach(function(market) {
    const marketId = awardsManagerString_(market.externalMarketId);
    const nomineeId = awardsManagerString_(
      (nomineeByMarketId || {})[marketId]
    );

    marketRows.push({
      Provider: market.provider,
      ExternalMarketId: marketId,
      ExternalEventId: market.externalEventId || eventId,
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
    });

    if (!nomineeId) return;

    mappings.push({
      MappingId: awardsManagerMappingId_(
        gameId,
        categoryId,
        nomineeId,
        market.provider,
        marketId,
        "Yes"
      ),
      AppGameId: gameId,
      CategoryId: categoryId,
      NomineeId: nomineeId,
      Provider: market.provider,
      ExternalEventId: market.externalEventId || eventId,
      ExternalMarketId: marketId,
      ExternalSubjectId: "",
      ResultKey: "winning-outcome",
      ComparisonOperator: "",
      Threshold: "",
      ExpectedOutcome: "Yes",
      AutoSettle: false,
      RequireAdminReview: true,
      SourceUrl: market.sourceUrl,
      SourceConfigJSON: awardsManagerCompactJson_({
        source: "awards-manager",
        version: AWARDS_MANAGER_VERSION,
        groupedEvent: true,
        marketQuestion: market.marketQuestion,
        eventName: market.eventName,
        livePrices: market.prices,
        resolutionSource: market.resolutionSource || "",
        officialSourceUrl: officialSourceUrl || "",
        providerSourceUrl: market.sourceUrl || "",
        sourcePriority: officialSourceUrl ? ["official", "provider", "manual"] : ["provider", "manual"]
      }),
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    });
  });

  if (!mappings.length) {
    throw new Error("Grouped question did not produce any provider mappings.");
  }

  const closeTimes = usable
    .map(function(market) {
      return awardsManagerString_(market.closeTime);
    })
    .filter(Boolean)
    .sort();

  return externalResultsBridgeEnqueue_(
    "UPSERT_EXTERNAL_MARKET_GROUP",
    [provider, eventId || first.externalMarketId, gameId, categoryId].join("|"),
    provider,
    {
      event: {
        Provider: provider,
        ExternalEventId: eventId || first.externalMarketId,
        EventName: first.eventName || first.marketQuestion,
        EventType: "prediction-market",
        StartDate: "",
        EndDate: closeTimes.length ? closeTimes[closeTimes.length - 1] : "",
        Status: "active",
        SourceUrl: first.sourceUrl,
        LastUpdated: now,
        RawJSON: awardsManagerCompactJson_({
          source: "awards-manager",
          groupedEvent: true,
          provider: provider,
          officialSourceUrl: officialSourceUrl || "",
          providerSourceUrl: first.sourceUrl || "",
          marketIds: usable.map(function(market) {
            return market.externalMarketId;
          })
        }),
        CreatedAt: now
      },
      markets: marketRows,
      mappings: mappings
    }
  );
}

function awardsManagerValidateUniqueAnswerItems_(answerItems) {
  const seenIds = {};
  const seenLabels = {};
  (answerItems || []).forEach(function(item) {
    const label = awardsManagerString_(item && item.nominee);
    const id = awardsManagerKey_(item && item.nomineeId);
    const labelKey = awardsManagerKey_(label);
    if (!label || !id) throw new Error("Every answer needs a unique label and answer ID.");
    if (seenIds[id] || seenLabels[labelKey]) {
      throw new Error("Awards answer labels must be unique. Two selected answers resolve to the same answer ID: " + id + ".");
    }
    seenIds[id] = true;
    seenLabels[labelKey] = true;
  });
}

function awardsManagerExistingQuestion_(gameId, categoryId) {
  if (typeof adminGetGameSetup !== "function") return null;
  const setup = adminGetGameSetup({ gameId: gameId }) || {};
  return (setup.categories || []).find(function(item) {
    return awardsManagerKey_(item.categoryId || item.id) === awardsManagerKey_(categoryId);
  }) || null;
}

function awardsManagerVerifyResumeTarget_(existing, question, market, grouped) {
  if (!existing) return;
  const existingQuestion = awardsManagerString_(existing.category || existing.question || existing.name);
  if (existingQuestion && awardsManagerKey_(existingQuestion) !== awardsManagerKey_(question)) {
    throw new Error("Question ID already exists for a different question. Choose a different Question ID before building this Awards market.");
  }
  const provider = awardsManagerKey_(existing.resultProvider || existing.ResultProvider);
  if (provider && provider !== awardsManagerKey_(market.provider)) {
    throw new Error("Question ID already exists for a different Awards provider.");
  }
  const eventId = awardsManagerKey_(existing.externalEventId || existing.ExternalEventId);
  if (eventId && awardsManagerKey_(market.externalEventId) && eventId !== awardsManagerKey_(market.externalEventId)) {
    throw new Error("Question ID already exists for a different Awards event.");
  }
  const marketId = awardsManagerKey_(existing.externalMarketId || existing.ExternalMarketId);
  if (!grouped && marketId && awardsManagerKey_(market.externalMarketId) && marketId !== awardsManagerKey_(market.externalMarketId)) {
    throw new Error("Question ID already exists for a different Awards market.");
  }
}

function awardsManagerResumeSourceConfig_(existing) {
  if (!existing) return {};
  const settings = existing.settings || existing.Settings || {};
  const raw = existing.sourceConfigJSON || existing.SourceConfigJSON || settings.sourceConfigJSON || settings.SourceConfigJSON || existing.sourceConfig || settings.sourceConfig || {};
  return typeof raw === "object" && raw !== null ? raw : awardsManagerParseJson_(raw, {});
}

function awardsManagerSameKeySet_(left, right) {
  const a = (Array.isArray(left) ? left : []).map(awardsManagerKey_).filter(Boolean).sort();
  const b = (Array.isArray(right) ? right : []).map(awardsManagerKey_).filter(Boolean).sort();
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function awardsManagerVerifyResumeScope_(existing, grouped, markets, selectedOutcomes, answerItems) {
  if (!existing) return;
  const config = awardsManagerResumeSourceConfig_(existing);
  if (grouped) {
    const priorMarketIds = Array.isArray(config.marketIds) ? config.marketIds : [];
    const requestedMarketIds = (markets || []).map(function(item) { return item && item.externalMarketId; }).filter(Boolean);
    if (priorMarketIds.length && !awardsManagerSameKeySet_(priorMarketIds, requestedMarketIds)) {
      throw new Error("Question ID already exists for a different grouped Awards market set. Choose a different Question ID instead of resuming this build.");
    }
  } else {
    const priorOutcomes = Array.isArray(config.selectedOutcomes) ? config.selectedOutcomes : [];
    if (priorOutcomes.length && !awardsManagerSameKeySet_(priorOutcomes, selectedOutcomes || [])) {
      throw new Error("Question ID already exists with a different selected Awards outcome set. Choose a different Question ID instead of resuming this build.");
    }
  }

  const desiredIds = {};
  const desiredLabels = {};
  (answerItems || []).forEach(function(item) {
    desiredIds[awardsManagerKey_(item && item.nomineeId)] = true;
    desiredLabels[awardsManagerKey_(item && item.nominee)] = true;
  });
  const nominees = Array.isArray(existing.nominees) ? existing.nominees : [];
  const incompatible = nominees.some(function(nominee) {
    const id = awardsManagerKey_(nominee && (nominee.nomineeId || nominee.id));
    const label = awardsManagerKey_(nominee && (nominee.nominee || nominee.name || nominee.shortAnswer));
    return !!((id || label) && !desiredIds[id] && !desiredLabels[label]);
  });
  if (incompatible) {
    throw new Error("Question ID already contains Awards answers outside this retry request. Choose a different Question ID to avoid mixing answer sets.");
  }
}

function awardsManagerEnsureQuestionAnswers_(gameId, categoryId, question, section, answerItems, existingCategory) {
  const resolvedIds = new Array((answerItems || []).length);
  const missing = [];
  const existing = existingCategory && Array.isArray(existingCategory.nominees) ? existingCategory.nominees : [];

  (answerItems || []).forEach(function(item, index) {
    const desiredId = awardsManagerKey_(item.nomineeId);
    const desiredLabel = awardsManagerKey_(item.nominee);
    const match = existing.find(function(nominee) {
      return awardsManagerKey_(nominee.nomineeId || nominee.id) === desiredId ||
        awardsManagerKey_(nominee.nominee || nominee.name || nominee.shortAnswer) === desiredLabel;
    });
    if (match) {
      resolvedIds[index] = awardsManagerString_(match.nomineeId || match.id);
    } else {
      missing.push({ index: index, item: item });
    }
  });

  let createdResult = { success: true, createdCount: 0, created: [] };
  if (missing.length) {
    if (typeof adminBulkCreateNominees !== "function") throw new Error("Bulk answer creation is unavailable.");
    createdResult = adminBulkCreateNominees({
      gameId: gameId,
      categoryId: categoryId,
      category: question,
      section: section,
      itemsJSON: JSON.stringify(missing.map(function(entry) { return entry.item; }))
    }) || {};
    const created = Array.isArray(createdResult.created) ? createdResult.created : [];
    if (created.length !== missing.length) {
      throw new Error("Awards question build could not confirm every missing answer. Retry the build; existing answers will be preserved.");
    }
    missing.forEach(function(entry, createdIndex) {
      resolvedIds[entry.index] = awardsManagerString_(created[createdIndex] && created[createdIndex].nomineeId);
    });
  }

  if (resolvedIds.some(function(id) { return !id; })) {
    throw new Error("Awards question build could not resolve every answer ID.");
  }
  return {
    success: true,
    createdCount: Number(createdResult.createdCount || 0),
    existingCount: (answerItems || []).length - missing.length,
    created: Array.isArray(createdResult.created) ? createdResult.created : [],
    resolvedNomineeIds: resolvedIds
  };
}

function apiAdminAwardsCreateQuestionFromMarket(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};

  const gameId = awardsManagerString_(payload.gameId);
  if (!gameId) throw new Error("Choose the Awards App game.");

  const officialSourceUrl = awardsManagerSafeHttpUrl_(payload.officialSourceUrl || "");
  const groupRaw = awardsManagerParseJson_(payload.groupMarketsJSON, []);
  const grouped = Array.isArray(groupRaw) && groupRaw.length >= 2;

  let markets = [];
  let market = null;

  if (grouped) {
    markets = groupRaw.map(function(rawMarket) {
      return awardsManagerMarketPayload_({ marketJSON: JSON.stringify(rawMarket) });
    });

    const provider = awardsManagerKey_(markets[0].provider);
    const eventId = awardsManagerKey_(markets[0].externalEventId);
    markets.forEach(function(item) {
      if (awardsManagerKey_(item.provider) !== provider) throw new Error("Grouped markets must come from the same provider.");
      if (eventId && awardsManagerKey_(item.externalEventId) && awardsManagerKey_(item.externalEventId) !== eventId) {
        throw new Error("Grouped markets must belong to the same provider event.");
      }
    });
    market = markets[0];
  } else {
    market = awardsManagerMarketPayload_(payload);
    markets = [market];
  }

  const question = awardsManagerString_(payload.question || (grouped ? market.eventName : market.marketQuestion));
  if (!question) throw new Error("Question text is required.");

  const categoryId = awardsManagerSlug_(payload.categoryId || question);
  if (!categoryId) throw new Error("Could not create Question ID.");

  const section = awardsManagerString_(payload.section || "Awards");
  const requestedScoreMode = awardsManagerString_(payload.scoreMode || "");
  const resolvedScoreMode = typeof adminCatResolveScoreModeForGame_ === "function"
    ? adminCatResolveScoreModeForGame_(gameId, requestedScoreMode)
    : (requestedScoreMode || "fixed-points");
  const questionType = awardsManagerString_(payload.questionType || (resolvedScoreMode === "ranking" ? "ranking" : "category-winner"));
  const selectionMode = awardsManagerString_(payload.selectionMode || (resolvedScoreMode === "ranking" || questionType === "ranking" ? "ranking" : "single"));
  const maxChangesRaw = payload.maxChanges === undefined || payload.maxChanges === null || payload.maxChanges === "" ? -1 : Number(payload.maxChanges);
  const maxChanges = isFinite(maxChangesRaw) ? Math.max(-1, Math.floor(maxChangesRaw)) : -1;
  const changePenalty = Math.max(0, Number(payload.changePenalty || 0) || 0);
  const pointsRaw = payload.points === undefined || payload.points === null || payload.points === "" ? 1 : Number(payload.points);
  const points = isFinite(pointsRaw) ? Math.max(0, pointsRaw) : 1;
  const displayOrderRaw = Number(payload.displayOrder);
  const displayOrder = isFinite(displayOrderRaw) ? Math.max(0, Math.floor(displayOrderRaw)) : 999;
  const requestedLayout = awardsManagerKey_(payload.layoutType || "image");
  const layoutType = ["text", "compact", "image"].indexOf(requestedLayout) !== -1 ? requestedLayout : "image";
  const showMarketProbabilities = payload.showMarketProbabilities === false || awardsManagerKey_(payload.showMarketProbabilities) === "false" || awardsManagerKey_(payload.showMarketProbabilities) === "hide" ? false : true;
  const labels = awardsManagerParseJson_(payload.answerLabelsJSON, {});
  const probabilityDisplay = awardsManagerParseJson_(payload.probabilityDisplayJSON, {});

  let answerItems = [];
  let selectedOutcomes = [];
  const probabilityDisplayByNomineeId = {};
  const probabilityDisplayBySourceKey = {};

  if (grouped) {
    answerItems = markets.map(function(item) {
      const marketId = awardsManagerString_(item.externalMarketId);
      const label = awardsManagerString_(labels[marketId] || awardsManagerGroupedAnswerLabel_(item));
      if (!label) throw new Error("Every grouped market needs an answer label.");
      const nomineeId = awardsManagerSlug_(label);
      const yesValue = item.prices && item.prices.Yes !== undefined ? item.prices.Yes : item.primaryProbability;
      const answerShowProbability = probabilityDisplay[marketId] === false ? false : true;
      probabilityDisplayByNomineeId[nomineeId] = answerShowProbability;
      probabilityDisplayBySourceKey[marketId] = answerShowProbability;
      return {
        nominee: label,
        nomineeId: nomineeId,
        shortAnswer: label,
        section: section,
        active: true,
        predictionGame: true,
        bettingOdds: awardsManagerDecimalOddsFromProbability_(yesValue),
        oddsSource: item.provider || market.provider || "external-market",
        oddsLastUpdated: new Date()
      };
    });
  } else {
    const requestedOutcomes = awardsManagerParseJson_(payload.selectedOutcomesJSON, []);
    const available = Array.isArray(market.outcomes) ? market.outcomes.map(function(outcome) { return awardsManagerString_(outcome); }).filter(Boolean) : [];
    selectedOutcomes = Array.isArray(requestedOutcomes) && requestedOutcomes.length
      ? requestedOutcomes.map(function(outcome) { return awardsManagerString_(outcome); }).filter(function(outcome) { return available.indexOf(outcome) !== -1; })
      : available.slice();

    if (selectedOutcomes.length < 2) throw new Error("Select at least two answers from this market.");

    answerItems = selectedOutcomes.map(function(outcome) {
      const sourceKey = "outcome:" + outcome;
      const label = awardsManagerString_(labels[sourceKey] || labels[outcome] || outcome);
      if (!label) throw new Error("Every selected outcome needs an answer label.");
      const nomineeId = awardsManagerSlug_(label);
      const probability = market.prices && market.prices[outcome] !== undefined ? market.prices[outcome] : "";
      const answerShowProbability = probabilityDisplay[sourceKey] === false ? false : true;
      probabilityDisplayByNomineeId[nomineeId] = answerShowProbability;
      probabilityDisplayBySourceKey[sourceKey] = answerShowProbability;
      return {
        nominee: label,
        nomineeId: nomineeId,
        shortAnswer: label,
        section: section,
        active: true,
        predictionGame: true,
        bettingOdds: awardsManagerDecimalOddsFromProbability_(probability),
        oddsSource: market.provider || "external-market",
        oddsLastUpdated: new Date()
      };
    });
  }

  if (answerItems.length < 2) throw new Error("At least two answers are required.");
  awardsManagerValidateUniqueAnswerItems_(answerItems);

  const sourceConfig = {
    source: "awards-manager",
    version: AWARDS_MANAGER_VERSION,
    provider: market.provider,
    groupedEvent: grouped,
    marketQuestion: market.marketQuestion,
    eventName: market.eventName,
    marketIds: markets.map(function(item) { return item.externalMarketId; }),
    selectedOutcomes: grouped ? [] : selectedOutcomes,
    resolutionSource: market.resolutionSource,
    officialSourceUrl: officialSourceUrl || "",
    providerSourceUrl: market.sourceUrl || "",
    sourcePriority: officialSourceUrl ? ["official", "provider", "manual"] : ["provider", "manual"],
    showMarketProbabilities: showMarketProbabilities,
    probabilityDisplayByNomineeId: probabilityDisplayByNomineeId,
    probabilityDisplayBySourceKey: probabilityDisplayBySourceKey
  };

  const categoryPayload = {
    gameId: gameId,
    categoryId: categoryId,
    category: question,
    section: section,
    points: points,
    displayOrder: displayOrder,
    layoutType: layoutType,
    questionType: questionType,
    scoringEngine: "manual",
    selectionMode: selectionMode,
    scoreMode: resolvedScoreMode,
    changePenalty: changePenalty,
    maxChanges: maxChanges,
    oddsMode: "external-market",
    resultSource: "external-results-hub",
    resultSourceType: "prediction-market",
    resultProvider: market.provider,
    externalEventId: market.externalEventId,
    externalMarketId: grouped ? "" : market.externalMarketId,
    autoSettle: false,
    requireAdminReview: true,
    sourceUrl: officialSourceUrl || market.sourceUrl,
    sourceConfigJSON: awardsManagerCompactJson_(sourceConfig)
  };

  const existingCategory = awardsManagerExistingQuestion_(gameId, categoryId);
  awardsManagerVerifyResumeTarget_(existingCategory, question, market, grouped);
  awardsManagerVerifyResumeScope_(existingCategory, grouped, markets, selectedOutcomes, answerItems);
  const resumed = !!existingCategory;
  const categoryResult = resumed
    ? adminUpdateCategory(Object.assign({}, categoryPayload, { skipCategoryResultWrite: true }))
    : adminCreateCategory(categoryPayload);

  const nomineeResult = awardsManagerEnsureQuestionAnswers_(
    gameId,
    categoryId,
    question,
    section,
    answerItems,
    existingCategory
  );

  let bridge = null;
  if (grouped) {
    const nomineeByMarketId = {};
    markets.forEach(function(item, index) {
      nomineeByMarketId[awardsManagerString_(item.externalMarketId)] = nomineeResult.resolvedNomineeIds[index];
    });
    bridge = awardsManagerQueueMarketGroup_(markets, gameId, categoryId, nomineeByMarketId, officialSourceUrl);
  } else {
    const outcomeMap = {};
    selectedOutcomes.forEach(function(outcome, index) {
      outcomeMap[outcome] = nomineeResult.resolvedNomineeIds[index];
    });
    bridge = awardsManagerQueueMarketBundle_(market, gameId, categoryId, outcomeMap, officialSourceUrl);
  }

  return {
    success: true,
    grouped: grouped,
    resumed: resumed,
    message: resumed
      ? "Existing Awards question resumed safely; answers were reused and the provider mapping was queued again."
      : (grouped
        ? nomineeResult.createdCount + " answers created from " + markets.length + " selected markets; Hub group queued."
        : nomineeResult.createdCount + " selected answers created and provider market queued to the External Results Hub."),
    gameId: gameId,
    categoryId: categoryId,
    categoryResult: categoryResult,
    nomineeResult: nomineeResult,
    bridge: bridge,
    sources: {
      officialSourceUrl: officialSourceUrl || "",
      providerSourceUrl: market.sourceUrl || "",
      preferred: officialSourceUrl ? "official" : "provider"
    },
    questionConfig: {
      scoreMode: resolvedScoreMode || "fixed-points",
      questionType: questionType,
      selectionMode: selectionMode,
      maxChanges: maxChanges,
      changePenalty: changePenalty,
      layoutType: layoutType,
      displayOrder: displayOrder,
      showMarketProbabilities: showMarketProbabilities
    },
    safety: { autoSettle: false, requireAdminReview: true }
  };
}

function awardsManagerExistingOutcomeMap_(category) {
  category = category || {};
  const config = awardsManagerResumeSourceConfig_(category);
  if (config.outcomeMap && typeof config.outcomeMap === "object" && !Array.isArray(config.outcomeMap)) {
    return config.outcomeMap;
  }
  const outcomes = Array.isArray(config.selectedOutcomes) ? config.selectedOutcomes : [];
  const nominees = Array.isArray(category.nominees) ? category.nominees : [];
  const fallback = {};
  outcomes.forEach(function(outcome, index) {
    const nominee = nominees[index] || {};
    const nomineeId = awardsManagerString_(nominee.nomineeId || nominee.id);
    if (awardsManagerString_(outcome) && nomineeId) fallback[outcome] = nomineeId;
  });
  return fallback;
}

function awardsManagerStaleRelinkMappings_(category, gameId, categoryId, nextMarket, nextOutcomeMap) {
  category = category || {};
  const config = awardsManagerResumeSourceConfig_(category);
  const priorMap = awardsManagerExistingOutcomeMap_(category);
  const priorProvider = awardsManagerString_(config.provider || category.resultProvider || category.ResultProvider);
  const priorMarketId = awardsManagerString_(config.externalMarketId || (Array.isArray(config.marketIds) && config.marketIds.length === 1 ? config.marketIds[0] : "") || category.externalMarketId || category.ExternalMarketId);
  const priorEventId = awardsManagerString_(config.externalEventId || category.externalEventId || category.ExternalEventId);
  if (!priorProvider || !priorMarketId || !Object.keys(priorMap).length) return [];

  const now = new Date();
  const stale = [];
  Object.keys(priorMap).forEach(function(outcome) {
    const nomineeId = awardsManagerString_(priorMap[outcome]);
    if (!nomineeId) return;
    const unchanged = awardsManagerKey_(priorProvider) === awardsManagerKey_(nextMarket && nextMarket.provider) &&
      awardsManagerKey_(priorMarketId) === awardsManagerKey_(nextMarket && nextMarket.externalMarketId) &&
      awardsManagerKey_((nextOutcomeMap || {})[outcome]) === awardsManagerKey_(nomineeId);
    if (unchanged) return;
    stale.push({
      MappingId: awardsManagerMappingId_(gameId, categoryId, nomineeId, priorProvider, priorMarketId, outcome),
      AppGameId: gameId,
      CategoryId: categoryId,
      NomineeId: nomineeId,
      Provider: priorProvider,
      ExternalEventId: priorEventId,
      ExternalMarketId: priorMarketId,
      ExternalSubjectId: "",
      ResultKey: "winning-outcome",
      ComparisonOperator: "",
      Threshold: "",
      ExpectedOutcome: outcome,
      AutoSettle: false,
      RequireAdminReview: true,
      SourceUrl: awardsManagerString_(category.sourceUrl || category.SourceUrl),
      SourceConfigJSON: awardsManagerCompactJson_({ source: "awards-manager", relinkRetired: true }),
      Active: false,
      CreatedAt: now,
      UpdatedAt: now
    });
  });
  return stale;
}

function apiAdminAwardsLinkMarket(payload) {
  awardsManagerRequireAdmin_(payload);
  payload = payload || {};
  const gameId = awardsManagerString_(payload.gameId);
  const categoryId = awardsManagerString_(payload.categoryId);
  const officialSourceUrl = awardsManagerSafeHttpUrl_(
    payload.officialSourceUrl || ""
  );
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
  const staleMappings = awardsManagerStaleRelinkMappings_(category, gameId, categoryId, market, safeMap);

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
    sourceUrl: officialSourceUrl || market.sourceUrl,
    sourceConfigJSON: awardsManagerCompactJson_({
      source: "awards-manager",
      version: AWARDS_MANAGER_VERSION,
      provider: market.provider,
      externalEventId: market.externalEventId,
      externalMarketId: market.externalMarketId,
      marketIds: [market.externalMarketId],
      selectedOutcomes: Object.keys(safeMap),
      outcomeMap: safeMap,
      marketQuestion: market.marketQuestion,
      resolutionSource: market.resolutionSource,
      officialSourceUrl: officialSourceUrl || "",
      providerSourceUrl: market.sourceUrl || "",
      sourcePriority: officialSourceUrl ? ["official", "provider", "manual"] : ["provider", "manual"]
    }),
    skipCategoryResultWrite: true
  });

  const bridge = awardsManagerQueueMarketBundle_(market, gameId, categoryId, safeMap, officialSourceUrl, staleMappings);
  return {
    success: true,
    message: "Provider market linked and queued to the External Results Hub.",
    gameId: gameId,
    categoryId: categoryId,
    outcomeMap: safeMap,
    bridge: bridge,
    sources: {
      officialSourceUrl: officialSourceUrl || "",
      providerSourceUrl: market.sourceUrl || "",
      preferred: officialSourceUrl ? "official" : "provider"
    },
    safety: { autoSettle: false, requireAdminReview: true }
  };
}
