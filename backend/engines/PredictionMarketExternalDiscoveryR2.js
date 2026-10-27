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
  if (closeAfter && closeBefore && Date.parse(closeAfter)>Date.parse(closeBefore)) throw new Error("Close on/after must be before Close on/before.");
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

// Match a visible event title or one child at a time, never unrelated rule text or separate siblings.
function predictionMarketExternalDiscoveryR2Matches_(event, query, options) {
  function text(parts) { return parts.map(predictionMarketExternalDiscoveryR2Key_).join(' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim(); }
  function matches(parts) {
    var hay=' '+text(parts)+' ', wanted=text([query]);
    if(options.exactPhrase)return hay.indexOf(' '+wanted+' ')!==-1;
    return wanted.split(' ').every(function(token){return hay.indexOf(' '+token+' ')!==-1;});
  }
  var category=predictionMarketExternalDiscoveryR2Key_(options.category);
  if(category&&category!=='all'&&text([event.category,event.subcategory].concat((event.tags||[]).map(function(tag){return typeof tag==='string'?tag:tag.label||tag.slug;}))).indexOf(category)===-1)return false;
  var parent=[event.title,event.sub_title,event.subtitle], children=Array.isArray(event.markets)?event.markets:[];
  var eventMatch=matches(parent), childMatch=children.some(function(m){return matches((options.searchIn==='markets'?[]:parent).concat([m.title,m.subtitle,m.question,m.yes_sub_title,m.no_sub_title]));});
  // A ticker is useful for a single short league/code search (NFL), but rules/descriptions are not search titles.
  if(!options.exactPhrase&&/^[a-z0-9]{2,8}$/i.test(query))eventMatch=eventMatch||text([event.series_ticker,event.ticker]).indexOf(query.toLowerCase())!==-1||(query.toLowerCase()==='nfl'&&text(parent).indexOf('pro football')!==-1);
  if(!(options.searchIn==='event'?eventMatch:options.searchIn==='markets'?childMatch:eventMatch||childMatch))return false;
  if(!predictionMarketExternalDiscoveryR2PassesType_(event,options))return false;
  var close=awardsManagerEventCloseTime_(event), ms=predictionMarketExternalDiscoveryR2DateMs_(close);
  if((options.closeAfter||options.closeBefore||options.closeDays>0)&&ms===null)return false;
  if(!predictionMarketExternalDiscoveryR2PassesDate_(close,options))return false;
  if(options.closeDays>0&&(ms<Date.now()||ms>Date.now()+options.closeDays*86400000))return false;
  return true;
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

function predictionMarketExternalDiscoveryR2RawSearchProvider_(provider, query, options, state) {
  state=state||{};if(state.done)return {events:[],scannedPages:0,state:state};
  var url, rows, data, next;
  if(provider==='kalshi'){
    var phase=Math.max(0,Math.min(1,Number(state.phase||0))), statuses=['closed','settled'];
    url=AWARDS_MANAGER_KALSHI_BASE+'/events?status='+statuses[phase]+'&limit=50&with_nested_markets=true'+(state.cursor?'&cursor='+encodeURIComponent(state.cursor):'');
    data=awardsManagerFetchJson_(url);rows=Array.isArray(data.events)?data.events:[];
    var cursor=awardsManagerString_(data.cursor);next={phase:cursor?phase:phase+1,cursor:cursor,done:!cursor&&phase===1};
  }else{
    var page=Math.max(1,Math.min(10000,Number(state.page||1)));
    url=AWARDS_MANAGER_POLYMARKET_BASE+'/public-search?q='+encodeURIComponent(query)+'&limit_per_type=20&page='+page+'&search_profiles=false&keep_closed_markets=1';
    data=awardsManagerFetchJson_(url);rows=Array.isArray(data.events)?data.events:[];next={page:page+1,done:!rows.length||!(data.pagination&&data.pagination.hasMore)};
  }
  var events=rows.filter(function(event){return predictionMarketExternalDiscoveryR2EventStatus_(event)==='closed'&&predictionMarketExternalDiscoveryR2Matches_(event,query,options);}).map(function(event){return provider==='kalshi'?predictionMarketExternalDiscoveryR2KalshiSummary_(event,query):predictionMarketExternalDiscoveryR2PolymarketSummary_(event,query);});
  return {events:events,scannedPages:1,state:next};
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
  var prior=awardsManagerParseJson_(payload.searchStateJSON,{})||{}, next={open:prior.open||{},closed:Object.assign({},prior.closed||{})},hasMore=false;

  if (options.status === "open" || options.status === "all") {
    var openPayload = Object.assign({}, payload, options, { provider:provider, status:"open", searchStateJSON:JSON.stringify(prior.open||{}),maxPagesPerRequest:1,eventFilter:function(event){return predictionMarketExternalDiscoveryR2Matches_(event,query,options);} });
    try {
      var openResult = apiAdminAwardsSearchExternalMarkets(openPayload);
      (Array.isArray(openResult && openResult.events) ? openResult.events : []).forEach(function(event) {
        event = Object.assign({}, event, { status:event.status || "open", groupedEvent:true, logicalQuestion:event.eventName || event.externalEventId, childMarketCount:event.childMarketCount == null ? (event.liveMarketCount || 0) : event.childMarketCount });
        if (predictionMarketExternalDiscoveryR2PassesDate_(event.closeTime, options)) events.push(event);
      });
      var scans=openResult&&openResult.scannedPages||{};scannedPages+=typeof scans==="number"?scans:Object.keys(scans).reduce(function(n,k){return n+Number(scans[k]||0);},0);
      next.open=openResult.searchState||{};hasMore=!!openResult.hasMore;
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
        var closed = predictionMarketExternalDiscoveryR2RawSearchProvider_(name, query, options, prior.closed&&prior.closed[name]);
        next.closed[name]=closed.state;hasMore=hasMore||!closed.state.done;
        events = events.concat(closed.events || []);
        scannedPages += Number(closed.scannedPages || 0);
      } catch (err) {
        hasMore=true;
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
    searchState:next,
    hasMore:hasMore,
    coverage:"Provider API results are paged; this is not a complete copy of either website.",
    errors: errors
  };
}

function predictionMarketExternalDiscoveryR2RawDetail_(provider, eventId) {
  var event;
  var rawMarkets;
  var markets;
  if (provider === "kalshi") {
    var data = awardsManagerFetchJson_(AWARDS_MANAGER_KALSHI_BASE + "/events/" + encodeURIComponent(eventId) + "?with_nested_markets=true");
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
  var input=predictionMarketExternalDiscoveryR2String_(value),hint=predictionMarketExternalDiscoveryR2Key_(providerHint||'auto');
  if(!input)throw new Error('Paste the specific event or market page URL.');
  var result={input:input,provider:'',eventId:'',marketId:'',slug:''};
  if(/^https?:\/\//i.test(input)){
    var url=input.match(/^https?:\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?/i),host=url&&url[1].toLowerCase(),parts=(url&&url[2]||'').split('/').filter(Boolean).map(decodeURIComponent),query=url&&url[3]||'';
    if(host==='kalshi.com'||host==='www.kalshi.com'){
      result.provider='kalshi';var x=parts.indexOf('x');if(x!==-1)result.eventId=parts[x+1]||'';
      else if(parts[0]==='markets'&&parts.length>=3&&parts[parts.length-1].toUpperCase().indexOf(parts[1].toUpperCase()+'-')===0)result.eventId=parts[parts.length-1].toUpperCase();
      else if(parts[0]==='markets'&&parts[1]){result.collection='kalshi-series';result.seriesTicker=parts[1].toUpperCase();}
      var ticker=query.match(/(?:^|&)op_market_ticker=([^&]+)/i);if(ticker)result.marketId=decodeURIComponent(ticker[1]);
    }else if(host==='polymarket.com'||host==='www.polymarket.com'){
      result.provider='polymarket';if(parts[0]==='sports'&&((parts[1]==='futures'&&parts[2])||(parts.length===2&&parts[1]!=='futures'))){result.collection='polymarket-sports';result.sport=parts[1]==='futures'?parts[2]:parts[1];result.futures=parts[1]==='futures';}
      else if(parts.length===1&&['politics','culture','weather','climate-science','economics','finance','crypto','tech','geopolitics'].indexOf(parts[0])!==-1){result.collection='polymarket-section';result.section=parts[0];}
      else if(parts[0]==='event')result.slug=parts[1]||'';else if(parts[0]==='market')result.marketSlug=parts[1]||'';
      else throw new Error('That is a Polymarket listing/category page, not a single event. Open a specific question first, then copy its /event/ page address.');
    }else throw new Error('Only official kalshi.com or polymarket.com event/market page URLs are supported.');
  }else{
    result.provider=hint==='kalshi'||hint==='polymarket'?hint:/^(?:market:)?\d+$/i.test(input)?'polymarket':/^[a-z0-9]+-[a-z0-9-]+$/i.test(input)?'kalshi':'';
    if(result.provider==='kalshi')result.marketId=input.toUpperCase();
    if(result.provider==='polymarket'){if(/^market:\d+$/i.test(input))result.marketId=input.slice(7);else if(/^\d+$/.test(input))result.eventId=input;else result.slug=input;}
  }
  if(!result.provider)throw new Error('Choose a provider for an ID, or paste its specific event page URL.');
  if(!result.eventId&&!result.marketId&&!result.slug&&!result.marketSlug&&!result.collection)throw new Error('Open a specific event on the provider site and copy its full address, not the homepage or category listing.');
  return result;
}

// Browse official provider collections through their APIs, never scrape or auto-import a page.
function predictionMarketExternalDiscoveryR2Browse_(parsed,payload) {
  var state=awardsManagerParseJson_(payload.searchStateJSON,{})||{},rows,data,next,hasMore,label;
  if(parsed.collection==='polymarket-sports'||parsed.collection==='polymarket-section'){
    var sport={name:parsed.section},tagSlug=parsed.section==='culture'?'pop-culture':parsed.section;
    if(parsed.collection==='polymarket-sports'){
    var sports=awardsManagerFetchJson_(AWARDS_MANAGER_POLYMARKET_BASE+'/sports');
    sport=(Array.isArray(sports)?sports:[]).find(function(row){return predictionMarketExternalDiscoveryR2Key_(row.sport)===parsed.sport.toLowerCase();});
    if(!sport)throw new Error('That sports listing is not supported by the provider API. Choose a league-specific futures page.');
    tagSlug=parsed.sport;}
    var tag=awardsManagerFetchJson_(AWARDS_MANAGER_POLYMARKET_BASE+'/tags/slug/'+encodeURIComponent(tagSlug));
    if(!/^\d+$/.test(String(tag.id)))throw new Error('Provider did not return a valid league tag.');
    var offset=Math.max(0,Math.min(100000,Math.floor(Number(state.offset||0)))),limit=50,url=AWARDS_MANAGER_POLYMARKET_BASE+'/events?tag_id='+encodeURIComponent(tag.id);
    if(parsed.futures){var gamesTag=awardsManagerFetchJson_(AWARDS_MANAGER_POLYMARKET_BASE+'/tags/slug/games');if(!/^\d+$/.test(String(gamesTag.id)))throw new Error('Provider did not return the Games tag for futures filtering.');url+='&exclude_tag_id='+encodeURIComponent(gamesTag.id);}
    url+='&closed=false&active=true&limit='+limit+'&offset='+offset+'&order=volume24hr&ascending=false';
    data=awardsManagerFetchJson_(url);if(!Array.isArray(data))throw new Error('Provider returned an unsupported event listing.');rows=data;hasMore=rows.length===limit;next={offset:offset+limit};label=(tag.label||sport.name||parsed.sport.toUpperCase())+(parsed.futures?' futures':' events');
  }else{
    var url=AWARDS_MANAGER_KALSHI_BASE+'/events?series_ticker='+encodeURIComponent(parsed.seriesTicker)+'&status=open&limit=50&with_nested_markets=true'+(state.cursor?'&cursor='+encodeURIComponent(state.cursor):'');
    data=awardsManagerFetchJson_(url);rows=Array.isArray(data.events)?data.events:[];next={cursor:awardsManagerString_(data.cursor)};hasMore=!!next.cursor;label='Kalshi series '+parsed.seriesTicker;
  }
  var keyword=predictionMarketExternalDiscoveryR2String_(payload.sectionKeyword),options=predictionMarketExternalDiscoveryR2Options_({});
  var events=rows.filter(function(e){return awardsManagerMarketIsLive_(null,e)&&(!keyword||predictionMarketExternalDiscoveryR2Matches_(e,keyword,options));}).map(function(e){return parsed.provider==='polymarket'?predictionMarketExternalDiscoveryR2PolymarketSummary_(e,''):predictionMarketExternalDiscoveryR2KalshiSummary_(e,'');});
  return {success:true,contractVersion:PREDICTION_MARKET_EXTERNAL_DISCOVERY_R2_CONTRACT,collection:true,collectionLabel:label,resolvedReference:parsed,events:events,searchState:next,hasMore:hasMore,scannedPages:1,errors:[],coverage:parsed.futures?'League-tagged active events excluding the provider Games tag; website curation and ordering may differ.':'Active events in the provider collection; website curation and ordering may differ.'};
}

function predictionMarketExternalDiscoveryR2Resolve(payload) {
  awardsManagerRequireAdmin_(payload);payload=payload||{};
  var parsed=predictionMarketExternalDiscoveryR2ParseReference_(payload.reference||payload.urlOrId||payload.providerReference,payload.providerHint||payload.provider),eventId=parsed.eventId,raw;
  if(parsed.collection)return predictionMarketExternalDiscoveryR2Browse_(parsed,payload);
  if(parsed.provider==='polymarket'&&!eventId){
    if(parsed.slug){raw=awardsManagerFetchJson_(AWARDS_MANAGER_POLYMARKET_BASE+'/events/slug/'+encodeURIComponent(parsed.slug));if(predictionMarketExternalDiscoveryR2Key_(raw.slug)!==predictionMarketExternalDiscoveryR2Key_(parsed.slug))throw new Error('Provider did not return that exact event.');eventId=awardsManagerString_(raw.id);}
    else{raw=awardsManagerFetchJson_(AWARDS_MANAGER_POLYMARKET_BASE+(parsed.marketSlug?'/markets/slug/'+encodeURIComponent(parsed.marketSlug):'/markets/'+encodeURIComponent(parsed.marketId)));eventId=awardsManagerString_(raw.events&&raw.events[0]&&raw.events[0].id);}
  }else if(parsed.provider==='kalshi'&&!eventId){
    // Event and market tickers both contain hyphens. Try an exact event first, then an exact market on 404 only.
    try{raw=awardsManagerFetchJson_(AWARDS_MANAGER_KALSHI_BASE+'/events/'+encodeURIComponent(parsed.marketId));eventId=awardsManagerString_(raw.event&&raw.event.event_ticker);if(eventId)parsed.marketId='';}
    catch(error){if(!/404/.test(error.message))throw error;}
    if(!eventId){raw=awardsManagerFetchJson_(AWARDS_MANAGER_KALSHI_BASE+'/markets/'+encodeURIComponent(parsed.marketId));if(awardsManagerString_(raw.market&&raw.market.ticker).toUpperCase()!==parsed.marketId.toUpperCase())throw new Error('Provider did not return that exact market.');eventId=awardsManagerString_(raw.market.event_ticker);}
  }
  if(!eventId)throw new Error('The provider could not identify a parent event for that exact URL or ID.');
  var detail=predictionMarketExternalDiscoveryR2Detail(Object.assign({},payload,{provider:parsed.provider,eventId:eventId,includeClosed:true,status:'all'}));
  if(!detail.markets||!detail.markets.length)throw new Error('That event returned no supported markets. Check the specific event URL or ID.');
  if(parsed.marketId&&!detail.markets.some(function(m){return predictionMarketExternalDiscoveryR2Key_(m.externalMarketId)===predictionMarketExternalDiscoveryR2Key_(parsed.marketId);}))throw new Error('That exact market was not found in the provider event.');
  return {success:true,contractVersion:PREDICTION_MARKET_EXTERNAL_DISCOVERY_R2_CONTRACT,resolvedReference:Object.assign({},parsed,{eventId:eventId}),event:detail};
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
