/* =====================================================
   SPORTS LIVE DISPLAY ENGINE v1.0
   Lives in Awards App backend.

   Purpose:
   - Build one batched live-status payload for regular sports wagers,
     player props, legacy player matchups, and advanced stat questions.
   - Keep the Sports Scores Engine admin key off the browser.
   - Add MLB probable/starting-pitcher details from ESPN summaries.
===================================================== */

const SPORTS_LIVE_DISPLAY_VERSION = "1.0";
const SPORTS_LIVE_DISPLAY_CACHE_SECONDS = 25;
const SPORTS_LIVE_DISPLAY_SUMMARY_CACHE_SECONDS = 45;
const SPORTS_LIVE_DISPLAY_MAX_EVENTS = 30;

function sportsLiveDisplayString_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function sportsLiveDisplayKey_(value) {
  return sportsLiveDisplayString_(value).toLowerCase();
}

function sportsLiveDisplaySlug_(value) {
  return sportsLiveDisplayKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sportsLiveDisplayNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return isFinite(number) ? number : fallback;
}

function sportsLiveDisplayBoolean_(value, fallback) {
  if (value === true || value === false) return value;
  const key = sportsLiveDisplayKey_(value);
  if (["true", "yes", "1", "on", "final", "completed", "complete", "post"].indexOf(key) !== -1) return true;
  if (["false", "no", "0", "off", "pre", "scheduled"].indexOf(key) !== -1) return false;
  return fallback;
}

function sportsLiveDisplayParseJSON_(value, fallback) {
  if (value && typeof value === "object") return value;
  const raw = sportsLiveDisplayString_(value);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    return fallback;
  }
}

function sportsLiveDisplayUnique_(values) {
  const seen = {};
  return (values || []).map(sportsLiveDisplayString_).filter(function(value) {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function sportsLiveDisplayParseEventIds_(payload) {
  payload = payload || {};
  let values = payload.espnEventIds || payload.eventIds || payload.espnEventId || payload.eventId || [];
  if (typeof values === "string") {
    const parsed = sportsLiveDisplayParseJSON_(values, null);
    values = Array.isArray(parsed) ? parsed : values.split(/[\s,|]+/);
  }
  if (!Array.isArray(values)) values = [values];
  return sportsLiveDisplayUnique_(values).slice(0, SPORTS_LIVE_DISPLAY_MAX_EVENTS);
}

function sportsLiveDisplayCache_() {
  try {
    return CacheService.getScriptCache();
  } catch (error) {
    return null;
  }
}

function sportsLiveDisplayCacheGet_(key) {
  const cache = sportsLiveDisplayCache_();
  if (!cache || !key) return null;
  try {
    return sportsLiveDisplayParseJSON_(cache.get(key), null);
  } catch (error) {
    return null;
  }
}

function sportsLiveDisplayCachePut_(key, value, seconds) {
  const cache = sportsLiveDisplayCache_();
  if (!cache || !key) return;
  try {
    cache.put(key, JSON.stringify(value), Math.max(1, Number(seconds) || 1));
  } catch (error) {
    // Cache limits should never stop the live display.
  }
}

function sportsLiveDisplayBuildEngineUrl_(action, params) {
  const query = {
    action: action,
    adminKey: sportsAdminBridgeGetKey_()
  };
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    query[key] = value;
  });
  const queryString = Object.keys(query).map(function(key) {
    return encodeURIComponent(key) + "=" + encodeURIComponent(query[key]);
  }).join("&");
  return sportsAdminBridgeGetUrl_() + "?" + queryString;
}

function sportsLiveDisplayParseResponse_(response, label) {
  const code = response.getResponseCode();
  const body = response.getContentText();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error((label || "Sports Engine") + " returned non-JSON HTTP " + code + ": " + body.slice(0, 180));
  }
  if (code < 200 || code >= 300 || (parsed && parsed.success === false)) {
    throw new Error(
      (parsed && (parsed.error || parsed.message || parsed.reason)) ||
      (label || "Sports Engine") + " returned HTTP " + code
    );
  }
  return parsed || {};
}

function sportsLiveDisplayFetchEngineData_(eventIds) {
  const result = {};
  const requests = [];
  const requestMeta = [];

  (eventIds || []).forEach(function(eventId) {
    result[eventId] = {
      score: null,
      playerStats: [],
      teamStats: [],
      errors: []
    };

    [
      { action: "getSportsScores", field: "score", params: { espnEventId: eventId } },
      { action: "getSportsPlayerGameStats", field: "playerStats", params: { espnEventId: eventId, limit: 10000 } },
      { action: "getSportsTeamGameStats", field: "teamStats", params: { espnEventId: eventId, limit: 10000 } }
    ].forEach(function(item) {
      const cacheKey = "sports-live:" + item.action + ":" + eventId;
      const cached = sportsLiveDisplayCacheGet_(cacheKey);
      if (cached) {
        if (item.field === "score") {
          result[eventId].score = Array.isArray(cached.scores) ? cached.scores[0] || null : cached.score || null;
        } else {
          result[eventId][item.field] = Array.isArray(cached.stats) ? cached.stats : [];
        }
        return;
      }

      requests.push({
        url: sportsLiveDisplayBuildEngineUrl_(item.action, item.params),
        method: "get",
        followRedirects: true,
        muteHttpExceptions: true
      });
      requestMeta.push({
        eventId: eventId,
        action: item.action,
        field: item.field,
        cacheKey: cacheKey
      });
    });
  });

  if (requests.length) {
    const responses = UrlFetchApp.fetchAll(requests);
    responses.forEach(function(response, index) {
      const meta = requestMeta[index];
      try {
        const parsed = sportsLiveDisplayParseResponse_(response, meta.action);
        sportsLiveDisplayCachePut_(meta.cacheKey, parsed, SPORTS_LIVE_DISPLAY_CACHE_SECONDS);
        if (meta.field === "score") {
          result[meta.eventId].score = Array.isArray(parsed.scores) ? parsed.scores[0] || null : parsed.score || null;
        } else {
          result[meta.eventId][meta.field] = Array.isArray(parsed.stats) ? parsed.stats : [];
        }
      } catch (error) {
        result[meta.eventId].errors.push({
          action: meta.action,
          error: error && error.message ? error.message : String(error)
        });
      }
    });
  }

  return result;
}

function sportsLiveDisplayAthlete_(value) {
  if (!value) return null;
  const athlete = value.athlete || value.player || value;
  const id = sportsLiveDisplayString_(athlete.id || athlete.uid || value.id);
  const name = sportsLiveDisplayString_(
    athlete.displayName || athlete.fullName || athlete.shortName || athlete.name || value.displayName || value.name
  );
  if (!id && !name) return null;
  const headshot = athlete.headshot && (athlete.headshot.href || athlete.headshot.url)
    ? athlete.headshot.href || athlete.headshot.url
    : athlete.headshot || value.headshot || "";
  return {
    id: id,
    name: name,
    shortName: sportsLiveDisplayString_(athlete.shortName || ""),
    headshot: sportsLiveDisplayString_(headshot),
    position: sportsLiveDisplayString_(
      athlete.position && (athlete.position.abbreviation || athlete.position.displayName) || athlete.position || value.position
    )
  };
}

function sportsLiveDisplayHeaderCompetition_(summary) {
  const competitions = summary && summary.header && Array.isArray(summary.header.competitions)
    ? summary.header.competitions
    : [];
  return competitions[0] || null;
}

function sportsLiveDisplayCompetitorSideMap_(summary) {
  const competition = sportsLiveDisplayHeaderCompetition_(summary);
  const map = {};
  (competition && competition.competitors || []).forEach(function(competitor) {
    const side = sportsLiveDisplayKey_(competitor.homeAway);
    const team = competitor.team || {};
    const id = sportsLiveDisplayString_(team.id || competitor.id);
    const name = sportsLiveDisplayString_(team.displayName || team.shortDisplayName || team.name);
    if (side === "home" || side === "away") {
      if (id) map[id] = side;
      if (name) map[sportsLiveDisplayKey_(name)] = side;
    }
  });
  return map;
}

function sportsLiveDisplayAppendProbableCandidates_(candidates, value, side) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach(function(item) {
      sportsLiveDisplayAppendProbableCandidates_(candidates, item, side);
    });
    return;
  }

  if (typeof value === "object") {
    // ESPN probable-pitcher containers can be side keyed instead of rows with
    // homeAway metadata: { home: {...}, away: {...} }. Select the requested
    // side before attempting athlete normalization.
    if (value.home || value.away) {
      if (value[side]) {
        sportsLiveDisplayAppendProbableCandidates_(
          candidates,
          value[side],
          side
        );
      }
      return;
    }
  }

  const rowSide = sportsLiveDisplayKey_(
    value.homeAway || value.side || value.teamSide
  );

  if (!rowSide || rowSide === side) {
    candidates.push(value);
  }
}

function sportsLiveDisplayProbableCandidates_(summary, side) {
  const candidates = [];
  const competition = sportsLiveDisplayHeaderCompetition_(summary);
  const competitors = competition && Array.isArray(competition.competitors)
    ? competition.competitors
    : [];

  competitors.forEach(function(competitor) {
    if (sportsLiveDisplayKey_(competitor.homeAway) !== side) return;
    [competitor.probables, competitor.probablePitchers, competitor.probablePitcher].forEach(function(value) {
      sportsLiveDisplayAppendProbableCandidates_(candidates, value, side);
    });
  });

  const gameInfo = summary && summary.gameInfo || {};
  [
    gameInfo.probables,
    gameInfo.probablePitchers,
    summary && summary.probables,
    summary && summary.probablePitchers,
    competition && competition.probables,
    competition && competition.probablePitchers
  ].forEach(function(value) {
    sportsLiveDisplayAppendProbableCandidates_(candidates, value, side);
  });

  // Some ESPN MLB summaries expose the announced starter only in a roster
  // block. Use it as a conservative fallback: the roster must resolve to the
  // requested side, the row must be marked starter, and the athlete position
  // must be pitcher/SP/P. This avoids treating ordinary lineup starters as the
  // probable pitcher.
  const sideMap = sportsLiveDisplayCompetitorSideMap_(summary);
  const rosters = summary && Array.isArray(summary.rosters) ? summary.rosters : [];
  rosters.forEach(function(rosterBlock) {
    rosterBlock = rosterBlock || {};
    const team = rosterBlock.team || {};
    const teamId = sportsLiveDisplayString_(team.id || rosterBlock.teamId);
    const teamName = sportsLiveDisplayString_(team.displayName || team.shortDisplayName || team.name);
    const rosterSide =
      sportsLiveDisplayKey_(rosterBlock.homeAway || rosterBlock.side) ||
      sideMap[teamId] ||
      sideMap[sportsLiveDisplayKey_(teamName)] ||
      "";
    if (rosterSide !== side) return;

    const rows =
      rosterBlock.roster ||
      rosterBlock.athletes ||
      rosterBlock.players ||
      [];

    (Array.isArray(rows) ? rows : []).forEach(function(row) {
      row = row || {};
      if (row.starter !== true) return;
      const athlete = row.athlete || row.player || row;
      const position = sportsLiveDisplayKey_(
        athlete && athlete.position && (athlete.position.abbreviation || athlete.position.name || athlete.position.displayName) ||
        row.position && (row.position.abbreviation || row.position.name || row.position.displayName) ||
        ""
      );
      if (["p", "sp", "pitcher", "starting pitcher"].indexOf(position) === -1) return;
      candidates.push(row);
    });
  });

  return candidates;
}

function sportsLiveDisplayFindProbable_(summary, side) {
  const candidates = sportsLiveDisplayProbableCandidates_(summary, side);
  for (let i = 0; i < candidates.length; i++) {
    const athlete = sportsLiveDisplayAthlete_(candidates[i]);
    if (!athlete) continue;
    athlete.role = "probable";
    athlete.confirmed = false;
    athlete.stats = {};
    athlete.statLine = "";
    return athlete;
  }
  return null;
}

function sportsLiveDisplayPitchingCategory_(teamBlock) {
  const categories = teamBlock && Array.isArray(teamBlock.statistics) ? teamBlock.statistics : [];
  return categories.find(function(category) {
    const name = sportsLiveDisplayKey_(category.name || category.displayName || category.type);
    return name.indexOf("pitch") !== -1;
  }) || null;
}

function sportsLiveDisplayPitcherStats_(category, athleteRow) {
  const labels = Array.isArray(category && category.labels) ? category.labels : [];
  const names = Array.isArray(category && category.names) ? category.names : [];
  const stats = Array.isArray(athleteRow && athleteRow.stats) ? athleteRow.stats : [];
  const map = {};
  stats.forEach(function(value, index) {
    const label = sportsLiveDisplayString_(labels[index] || names[index] || String(index));
    if (label) map[label] = value;
  });
  return map;
}

function sportsLiveDisplayPitcherStatValue_(stats, keys) {
  const normalized = {};
  Object.keys(stats || {}).forEach(function(key) {
    normalized[sportsLiveDisplaySlug_(key)] = stats[key];
  });
  for (let i = 0; i < keys.length; i++) {
    const value = normalized[sportsLiveDisplaySlug_(keys[i])];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function sportsLiveDisplayPitcherLine_(stats) {
  const ip = sportsLiveDisplayPitcherStatValue_(stats, ["IP", "innings pitched"]);
  const strikeouts = sportsLiveDisplayPitcherStatValue_(stats, ["K", "SO", "strikeouts"]);
  const earnedRuns = sportsLiveDisplayPitcherStatValue_(stats, ["ER", "earned runs"]);
  const parts = [];
  if (ip !== "") parts.push(ip + " IP");
  if (strikeouts !== "") parts.push(strikeouts + " K");
  if (earnedRuns !== "") parts.push(earnedRuns + " ER");
  return parts.join(" · ");
}

function sportsLiveDisplayFindStartingPitcher_(summary, side) {
  const sideMap = sportsLiveDisplayCompetitorSideMap_(summary);
  const teams = summary && summary.boxscore && Array.isArray(summary.boxscore.players)
    ? summary.boxscore.players
    : [];

  for (let i = 0; i < teams.length; i++) {
    const teamBlock = teams[i] || {};
    const team = teamBlock.team || {};
    const teamId = sportsLiveDisplayString_(team.id || teamBlock.teamId);
    const teamName = sportsLiveDisplayString_(team.displayName || team.shortDisplayName || team.name);
    const teamSide = sideMap[teamId] || sideMap[sportsLiveDisplayKey_(teamName)] || "";
    if (teamSide !== side) continue;

    const category = sportsLiveDisplayPitchingCategory_(teamBlock);
    if (!category || !Array.isArray(category.athletes)) continue;
    const rows = category.athletes;
    let selected = rows.find(function(row) { return row && row.starter === true; }) || null;
    if (!selected) {
      selected = rows.find(function(row) {
        const stats = sportsLiveDisplayPitcherStats_(category, row);
        const ip = sportsLiveDisplayNumber_(sportsLiveDisplayPitcherStatValue_(stats, ["IP", "innings pitched"]), 0);
        return ip > 0;
      }) || null;
    }
    if (!selected) continue;

    const athlete = sportsLiveDisplayAthlete_(selected);
    if (!athlete) continue;
    athlete.role = "starter";
    athlete.confirmed = true;
    athlete.stats = sportsLiveDisplayPitcherStats_(category, selected);
    athlete.statLine = sportsLiveDisplayPitcherLine_(athlete.stats);
    return athlete;
  }

  return null;
}

function sportsLiveDisplayTeamFromSummary_(summary, side) {
  const competition = sportsLiveDisplayHeaderCompetition_(summary);
  const competitor = (competition && competition.competitors || []).find(function(item) {
    return sportsLiveDisplayKey_(item.homeAway) === side;
  }) || {};
  const team = competitor.team || {};
  return {
    id: sportsLiveDisplayString_(team.id || competitor.id),
    name: sportsLiveDisplayString_(team.displayName || team.shortDisplayName || team.name),
    logo: sportsLiveDisplayString_(team.logo || "")
  };
}

function sportsLiveDisplayParseGameSummary_(eventId, summary) {
  const homeStarter = sportsLiveDisplayFindStartingPitcher_(summary, "home") || sportsLiveDisplayFindProbable_(summary, "home");
  const awayStarter = sportsLiveDisplayFindStartingPitcher_(summary, "away") || sportsLiveDisplayFindProbable_(summary, "away");
  return {
    espnEventId: sportsLiveDisplayString_(eventId),
    homeTeam: sportsLiveDisplayTeamFromSummary_(summary, "home"),
    awayTeam: sportsLiveDisplayTeamFromSummary_(summary, "away"),
    homeStarter: homeStarter,
    awayStarter: awayStarter,
    startersAvailable: Boolean(homeStarter || awayStarter)
  };
}

function sportsLiveDisplaySummarySuccess_(eventId, summary, transport) {
  const parsed = sportsLiveDisplayParseGameSummary_(eventId, summary || {});
  parsed.transportStatus = "ok";
  parsed.transport = sportsLiveDisplayString_(transport || "sports-engine");
  parsed.pitcherStatus = parsed.startersAvailable
    ? "available"
    : "upstream-tbd";
  parsed.error = "";
  return parsed;
}

function sportsLiveDisplaySummaryFailure_(eventId, error, transport, httpStatus) {
  return {
    espnEventId: sportsLiveDisplayString_(eventId),
    homeStarter: null,
    awayStarter: null,
    startersAvailable: false,
    pitcherStatus: "transport-error",
    transportStatus: "error",
    transport: sportsLiveDisplayString_(transport || "sports-engine"),
    httpStatus: sportsLiveDisplayNumber_(httpStatus, 0),
    error: sportsLiveDisplayString_(error || "MLB pitcher summary transport failed")
  };
}

function sportsLiveDisplayEngineSummaryResponse_(eventId, response) {
  const code = response.getResponseCode();
  const body = response.getContentText();
  let payload;

  try {
    payload = JSON.parse(body || "{}");
  } catch (error) {
    return {
      fallbackDirect: false,
      result: sportsLiveDisplaySummaryFailure_(
        eventId,
        "Sports Engine MLB summary endpoint returned non-JSON HTTP " + code,
        "sports-engine",
        code
      )
    };
  }

  const message = sportsLiveDisplayString_(
    payload && (payload.error || payload.message || payload.reason)
  );

  if (
    code >= 200 &&
    code < 300 &&
    payload &&
    payload.success === false &&
    /^Unknown action:\s*getSportsMlbSummary\b/i.test(message)
  ) {
    // Rolling-deployment compatibility only. Once the Sports Engine endpoint is
    // deployed, all summary traffic stays on its authenticated ESPN proxy path.
    return {
      fallbackDirect: true,
      result: null
    };
  }

  if (
    code < 200 ||
    code >= 300 ||
    !payload ||
    payload.success === false
  ) {
    return {
      fallbackDirect: false,
      result: sportsLiveDisplaySummaryFailure_(
        eventId,
        message || "Sports Engine MLB summary request failed with HTTP " + code,
        payload && payload.transport || "sports-engine",
        payload && payload.httpStatus !== undefined
          ? payload.httpStatus
          : code
      )
    };
  }

  if (!payload.summary || typeof payload.summary !== "object") {
    return {
      fallbackDirect: false,
      result: sportsLiveDisplaySummaryFailure_(
        eventId,
        "Sports Engine MLB summary response did not include an ESPN summary payload",
        payload.transport || "sports-engine",
        payload.httpStatus || code
      )
    };
  }

  return {
    fallbackDirect: false,
    result: sportsLiveDisplaySummarySuccess_(
      eventId,
      payload.summary,
      payload.transport || "sports-engine"
    )
  };
}

function sportsLiveDisplayDirectSummaryRequest_(eventId) {
  return {
    url:
      "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=" +
      encodeURIComponent(eventId),
    method: "get",
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      "User-Agent": "Mozilla/5.0 AwardsAppSports/1.0"
    }
  };
}

function sportsLiveDisplayDirectSummaryResponse_(eventId, response) {
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    return sportsLiveDisplaySummaryFailure_(
      eventId,
      "Sports Engine summary endpoint is not deployed and direct ESPN fallback returned HTTP " + code,
      "direct-fallback",
      code
    );
  }

  try {
    return sportsLiveDisplaySummarySuccess_(
      eventId,
      JSON.parse(response.getContentText() || "{}"),
      "direct-fallback"
    );
  } catch (error) {
    return sportsLiveDisplaySummaryFailure_(
      eventId,
      "Sports Engine summary endpoint is not deployed and direct ESPN fallback returned invalid JSON",
      "direct-fallback",
      code
    );
  }
}

function sportsLiveDisplayFetchEspnSummaries_(eventIds) {
  const result = {};
  const requests = [];
  const requestMeta = [];
  const fallbackRequests = [];
  const fallbackMeta = [];

  (eventIds || []).forEach(function(eventId) {
    const cacheKey = "sports-summary:mlb:" + eventId;
    const cached = sportsLiveDisplayCacheGet_(cacheKey);
    if (cached) {
      result[eventId] = cached;
      return;
    }

    requests.push({
      url: sportsLiveDisplayBuildEngineUrl_(
        "getSportsMlbSummary",
        { espnEventId: eventId }
      ),
      method: "get",
      followRedirects: true,
      muteHttpExceptions: true
    });
    requestMeta.push({ eventId: eventId, cacheKey: cacheKey });
  });

  if (requests.length) {
    let responses;
    try {
      responses = UrlFetchApp.fetchAll(requests);
    } catch (error) {
      requestMeta.forEach(function(meta) {
        result[meta.eventId] = sportsLiveDisplaySummaryFailure_(
          meta.eventId,
          "Sports Engine MLB summary transport failed: " +
            (error && error.message ? error.message : String(error)),
          "sports-engine",
          0
        );
      });
      responses = [];
    }

    responses.forEach(function(response, index) {
      const meta = requestMeta[index];
      const parsed = sportsLiveDisplayEngineSummaryResponse_(meta.eventId, response);

      if (parsed.fallbackDirect) {
        fallbackRequests.push(
          sportsLiveDisplayDirectSummaryRequest_(meta.eventId)
        );
        fallbackMeta.push(meta);
        return;
      }

      result[meta.eventId] = parsed.result;
      if (parsed.result && parsed.result.transportStatus === "ok") {
        sportsLiveDisplayCachePut_(
          meta.cacheKey,
          parsed.result,
          SPORTS_LIVE_DISPLAY_SUMMARY_CACHE_SECONDS
        );
      }
    });
  }

  if (fallbackRequests.length) {
    let fallbackResponses;
    try {
      fallbackResponses = UrlFetchApp.fetchAll(fallbackRequests);
    } catch (error) {
      fallbackMeta.forEach(function(meta) {
        result[meta.eventId] = sportsLiveDisplaySummaryFailure_(
          meta.eventId,
          "Sports Engine summary endpoint is not deployed and direct ESPN fallback failed: " +
            (error && error.message ? error.message : String(error)),
          "direct-fallback",
          0
        );
      });
      fallbackResponses = [];
    }

    fallbackResponses.forEach(function(response, index) {
      const meta = fallbackMeta[index];
      const parsed = sportsLiveDisplayDirectSummaryResponse_(meta.eventId, response);
      result[meta.eventId] = parsed;
      if (parsed.transportStatus === "ok") {
        sportsLiveDisplayCachePut_(
          meta.cacheKey,
          parsed,
          SPORTS_LIVE_DISPLAY_SUMMARY_CACHE_SECONDS
        );
      }
    });
  }

  return result;
}

function sportsLiveDisplayScoreCompleted_(score) {
  if (!score) return false;
  if (sportsLiveDisplayBoolean_(score.Completed, false)) return true;
  const combined = sportsLiveDisplayKey_(score.Status) + " " + sportsLiveDisplayKey_(score.State);
  return combined.indexOf("final") !== -1 || combined.indexOf("complete") !== -1 || combined.indexOf("post") !== -1;
}

function sportsLiveDisplayScoreState_(score) {
  if (!score) return "pending";
  if (sportsLiveDisplayScoreCompleted_(score)) return "final";
  const combined = sportsLiveDisplayKey_(score.Status) + " " + sportsLiveDisplayKey_(score.State);
  if (combined.indexOf("pre") !== -1 || combined.indexOf("schedule") !== -1 || combined.indexOf("not started") !== -1) return "pregame";
  return "live";
}

function sportsLiveDisplayGameLine_(score) {
  if (!score) return "Waiting for game data";
  const away = sportsLiveDisplayString_(score.AwayTeam || "Away");
  const home = sportsLiveDisplayString_(score.HomeTeam || "Home");
  const awayScore = score.AwayScore === undefined || score.AwayScore === null || score.AwayScore === "" ? "-" : score.AwayScore;
  const homeScore = score.HomeScore === undefined || score.HomeScore === null || score.HomeScore === "" ? "-" : score.HomeScore;
  const clock = sportsLiveDisplayString_(score.Clock);
  const status = sportsLiveDisplayScoreCompleted_(score) ? "Final" : clock || sportsLiveDisplayString_(score.Status || score.State);
  return away + " " + awayScore + " · " + home + " " + homeScore + (status ? " · " + status : "");
}

function sportsLiveDisplayEntityMatchesRow_(entity, row, entityType) {
  const wantedIds = sportsLiveDisplayUnique_([
    entity.entityId,
    entity.playerId,
    entity.espnPlayerId,
    entity.teamId
  ]).map(sportsLiveDisplayKey_);
  const rowIds = sportsLiveDisplayUnique_([
    row.PlayerId,
    row.ESPNPlayerId,
    row.AthleteId,
    row.TeamId,
    row.ESPNTeamId,
    row.EntityId
  ]).map(sportsLiveDisplayKey_);
  if (wantedIds.some(function(id) { return rowIds.indexOf(id) !== -1; })) return true;

  const wantedName = sportsLiveDisplayKey_(entity.entityName || entity.playerName || entity.teamName);
  const rowName = sportsLiveDisplayKey_(
    entityType === "TEAM"
      ? row.TeamName || row.Team || row.EntityName
      : row.PlayerName || row.FullName || row.AthleteName || row.EntityName
  );
  return Boolean(wantedName && rowName && (wantedName === rowName || wantedName.indexOf(rowName) !== -1 || rowName.indexOf(wantedName) !== -1));
}

function sportsLiveDisplayFindStatRow_(rows, entity, statType, entityType) {
  const statKey = sportsLiveDisplaySlug_(statType);
  return (rows || []).filter(function(row) {
    return sportsLiveDisplayEntityMatchesRow_(entity, row, entityType) &&
      sportsLiveDisplaySlug_(row.StatType || row.StatKey || row.Name) === statKey;
  }).sort(function(a, b) {
    return new Date(b.LastUpdated || b.UpdatedAt || 0).getTime() - new Date(a.LastUpdated || a.UpdatedAt || 0).getTime();
  })[0] || null;
}

function sportsLiveDisplayTeamSide_(entity, score) {
  if (!score) return "";
  const entityId = sportsLiveDisplayKey_(entity.entityId || entity.teamId);
  const entityName = sportsLiveDisplayKey_(entity.entityName || entity.teamName);
  const homeId = sportsLiveDisplayKey_(score.HomeTeamId);
  const awayId = sportsLiveDisplayKey_(score.AwayTeamId);
  const home = sportsLiveDisplayKey_(score.HomeTeam);
  const away = sportsLiveDisplayKey_(score.AwayTeam);
  if ((entityId && entityId === homeId) || (entityName && (entityName === home || entityName.indexOf(home) !== -1 || home.indexOf(entityName) !== -1))) return "home";
  if ((entityId && entityId === awayId) || (entityName && (entityName === away || entityName.indexOf(away) !== -1 || away.indexOf(entityName) !== -1))) return "away";
  return "";
}

function sportsLiveDisplayFallbackTeamValue_(entity, statType, score) {
  if (!score) return null;
  const scoreStats = ["runs", "points", "goals"];
  if (scoreStats.indexOf(sportsLiveDisplaySlug_(statType)) === -1) return null;
  const side = sportsLiveDisplayTeamSide_(entity, score);
  if (side === "home") return sportsLiveDisplayNumber_(score.HomeScore, null);
  if (side === "away") return sportsLiveDisplayNumber_(score.AwayScore, null);
  return null;
}

function sportsLiveDisplayResolveEntity_(entity, statType, eventData) {
  const type = sportsLiveDisplayString_(entity.entityType || entity.type || "PLAYER").toUpperCase();
  const rows = type === "TEAM" ? eventData.teamStats : eventData.playerStats;
  const row = sportsLiveDisplayFindStatRow_(rows, entity, statType, type);
  let value = row ? sportsLiveDisplayNumber_(row.StatValue, null) : null;
  if (value === null && type === "TEAM") value = sportsLiveDisplayFallbackTeamValue_(entity, statType, eventData.score);
  const completed = row ? sportsLiveDisplayBoolean_(row.Completed, sportsLiveDisplayScoreCompleted_(eventData.score)) : sportsLiveDisplayScoreCompleted_(eventData.score);
  return {
    nomineeId: sportsLiveDisplayString_(entity.nomineeId),
    entityType: type,
    entityId: sportsLiveDisplayString_(entity.entityId || entity.playerId || entity.teamId),
    entityName: sportsLiveDisplayString_(entity.entityName || entity.playerName || entity.teamName || row && (row.PlayerName || row.TeamName)),
    teamId: sportsLiveDisplayString_(entity.teamId || row && row.TeamId),
    sportsGameId: sportsLiveDisplayString_(entity.sportsGameId),
    espnEventId: sportsLiveDisplayString_(entity.espnEventId),
    statType: sportsLiveDisplaySlug_(statType),
    value: value,
    hasValue: value !== null,
    completed: completed,
    lastUpdated: sportsLiveDisplayString_(row && (row.LastUpdated || row.UpdatedAt) || eventData.score && eventData.score.LastUpdated),
    gameState: sportsLiveDisplayScoreState_(eventData.score),
    gameLine: sportsLiveDisplayGameLine_(eventData.score),
    score: eventData.score || null
  };
}

function sportsLiveDisplayNormalizeTracker_(categoryId, setting) {
  const market = sportsLiveDisplayKey_(setting.sportsMarket || setting.SportsMarket);
  const config = sportsLiveDisplayParseJSON_(setting.sourceConfigJSON || setting.SourceConfigJSON, {});
  const statType = sportsLiveDisplaySlug_(config.statType || setting.statKey || setting.sportsStatType);
  const tracker = {
    categoryId: sportsLiveDisplayString_(categoryId),
    market: market,
    questionKind: sportsLiveDisplayKey_(config.questionKind || config.comparisonMode || setting.comparisonOperator || "highest"),
    questionMode: sportsLiveDisplayKey_(config.questionMode || setting.sportsQuestionMode || setting.scoreMode),
    statType: statType,
    line: sportsLiveDisplayNumber_(config.line !== undefined ? config.line : setting.threshold, null),
    operator: sportsLiveDisplayKey_(config.operator || setting.comparisonOperator || "gte"),
    checkpointType: sportsLiveDisplayString_(config.checkpointType || "FINAL").toUpperCase(),
    entities: []
  };

  if (market === "player-prop" || config.playerId || setting.sportsPlayerId && !config.players && !config.entities) {
    tracker.questionKind = "over-under";
    tracker.entities = [{
      entityType: "PLAYER",
      entityId: config.playerId || setting.sportsPlayerId || setting.externalSubjectId,
      playerId: config.playerId || setting.sportsPlayerId || setting.externalSubjectId,
      espnPlayerId: config.espnPlayerId,
      entityName: config.playerName || setting.sportsPlayerName,
      sportsGameId: config.sportsGameId || setting.sportsGameId,
      espnEventId: config.espnEventId || setting.espnEventId,
      statType: statType
    }];
    return tracker;
  }

  if (market === "player-matchup" || Array.isArray(config.players)) {
    tracker.questionKind = "highest";
    tracker.entities = (config.players || []).map(function(player) {
      return {
        nomineeId: player.nomineeId,
        entityType: "PLAYER",
        entityId: player.playerId || player.espnPlayerId,
        playerId: player.playerId,
        espnPlayerId: player.espnPlayerId,
        entityName: player.playerName,
        sportsGameId: config.sportsGameId || setting.sportsGameId,
        espnEventId: config.espnEventId || setting.espnEventId,
        statType: statType
      };
    });
    return tracker;
  }

  if (market === "sports-stat-question" || Array.isArray(config.entities)) {
    tracker.questionKind = sportsLiveDisplayKey_(config.questionKind || "highest");
    tracker.entities = (config.entities || []).map(function(entity) {
      return {
        nomineeId: entity.nomineeId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        playerId: entity.entityType === "PLAYER" ? entity.entityId : "",
        espnPlayerId: entity.espnPlayerId,
        entityName: entity.entityName,
        teamId: entity.teamId,
        sportsGameId: entity.sportsGameId,
        espnEventId: entity.espnEventId,
        statType: entity.statType || statType
      };
    });
    return tracker;
  }

  return null;
}

function sportsLiveDisplayThresholdPasses_(value, operator, threshold) {
  if (operator === "gt") return value > threshold;
  if (operator === "lte") return value <= threshold;
  if (operator === "lt") return value < threshold;
  if (operator === "eq") return value === threshold;
  return value >= threshold;
}

function sportsLiveDisplayFinalizeTracker_(tracker, engineData) {
  tracker.entities = (tracker.entities || []).map(function(entity) {
    const eventId = sportsLiveDisplayString_(entity.espnEventId);
    const eventData = engineData[eventId] || { score: null, playerStats: [], teamStats: [], errors: [] };
    return sportsLiveDisplayResolveEntity_(entity, entity.statType || tracker.statType, eventData);
  });

  const values = tracker.entities.filter(function(entity) { return entity.hasValue; });
  tracker.allFinal = tracker.entities.length > 0 && tracker.entities.every(function(entity) { return entity.completed; });
  tracker.anyLive = tracker.entities.some(function(entity) { return entity.gameState === "live"; });
  tracker.state = tracker.allFinal ? "final" : tracker.anyLive ? "live" : "pregame";
  tracker.leaderNomineeIds = [];
  tracker.leadingValue = null;
  tracker.currentResult = "";

  if (tracker.questionKind === "over-under") {
    const current = values[0] || null;
    tracker.currentValue = current ? current.value : null;
    if (current && tracker.line !== null) {
      tracker.currentResult = current.value > tracker.line
        ? "Over is currently ahead"
        : current.value < tracker.line
          ? "Under is currently ahead"
          : "Currently on the line";
    }
    return tracker;
  }

  if (tracker.questionKind === "threshold") {
    const current = values[0] || null;
    tracker.currentValue = current ? current.value : null;
    tracker.thresholdPassed = current && tracker.line !== null
      ? sportsLiveDisplayThresholdPasses_(current.value, tracker.operator, tracker.line)
      : null;
    tracker.currentResult = tracker.thresholdPassed === null
      ? "Waiting for stat data"
      : tracker.thresholdPassed
        ? "Yes is currently ahead"
        : "No is currently ahead";
    return tracker;
  }

  if (values.length) {
    let max = -Infinity;
    values.forEach(function(entity) { max = Math.max(max, Number(entity.value)); });
    const leaders = values.filter(function(entity) { return Number(entity.value) === max; });
    tracker.leadingValue = max;
    tracker.leaderNomineeIds = leaders.map(function(entity) { return entity.nomineeId || entity.entityId; });
    tracker.currentResult = leaders.length === 1
      ? leaders[0].entityName + " currently leads"
      : "Currently tied: " + leaders.map(function(entity) { return entity.entityName; }).join(", ");
  } else {
    tracker.currentResult = "Waiting for stat data";
  }

  return tracker;
}

function sportsLiveDisplaySettingsForGame_(awardsGameId) {
  const map = typeof getCategorySettings === "function" ? getCategorySettings(awardsGameId) : {};
  return map && typeof map === "object" ? map : {};
}

function sportsLiveDisplayCollectEventsFromSettings_(settingsMap) {
  const eventLeagues = {};
  Object.keys(settingsMap || {}).forEach(function(categoryId) {
    const setting = settingsMap[categoryId] || {};
    const league = sportsLiveDisplayKey_(setting.sportsLeague || setting.SportsLeague);
    const directEventId = sportsLiveDisplayString_(setting.espnEventId || setting.ESPNEventId);
    if (directEventId) eventLeagues[directEventId] = league;
    const config = sportsLiveDisplayParseJSON_(setting.sourceConfigJSON || setting.SourceConfigJSON, {});
    const configEntities = Array.isArray(config.entities) ? config.entities : [];
    configEntities.forEach(function(entity) {
      const eventId = sportsLiveDisplayString_(entity.espnEventId);
      if (eventId) eventLeagues[eventId] = sportsLiveDisplayKey_(entity.league || config.league || league);
    });
    (Array.isArray(config.players) ? config.players : []).forEach(function() {
      const eventId = sportsLiveDisplayString_(config.espnEventId || directEventId);
      if (eventId) eventLeagues[eventId] = sportsLiveDisplayKey_(config.league || league);
    });
  });
  return eventLeagues;
}

function sportsLiveDisplayBuildGameDetails_(eventIds, eventLeagues, engineData, summaries) {
  const details = {};
  (eventIds || []).forEach(function(eventId) {
    const eventData = engineData[eventId] || {};
    const score = eventData.score || null;
    const summary = summaries[eventId] || {};
    details[eventId] = {
      espnEventId: eventId,
      league: eventLeagues[eventId] || sportsLiveDisplayKey_(score && score.League),
      state: sportsLiveDisplayScoreState_(score),
      completed: sportsLiveDisplayScoreCompleted_(score),
      gameLine: sportsLiveDisplayGameLine_(score),
      score: score,
      homeStarter: summary.homeStarter || null,
      awayStarter: summary.awayStarter || null,
      startersAvailable: Boolean(summary.homeStarter || summary.awayStarter),
      pitcherStatus:
        summary.pitcherStatus ||
        (summary.homeStarter || summary.awayStarter ? "available" : "upstream-tbd"),
      pitcherTransportStatus:
        summary.transportStatus ||
        "ok",
      pitcherTransport:
        summary.transport ||
        "",
      pitcherError:
        summary.error ||
        "",
      errors: eventData.errors || []
    };
  });
  return details;
}

function getSportsGameDetails(payload) {
  payload = payload || {};
  const eventIds = sportsLiveDisplayParseEventIds_(payload);
  const eventLeagues = sportsLiveDisplayParseJSON_(payload.eventLeaguesJSON || payload.eventLeagues, {}) || {};
  const mlbEventIds = eventIds.filter(function(eventId) {
    const league = sportsLiveDisplayKey_(eventLeagues[eventId] || payload.league);
    return !league || league === "mlb" || league === "baseball";
  });
  const summaries = sportsLiveDisplayFetchEspnSummaries_(mlbEventIds);
  return {
    success: true,
    version: SPORTS_LIVE_DISPLAY_VERSION,
    count: eventIds.length,
    gameDetails: summaries
  };
}

function getSportsLiveQuestionStatus(payload) {
  payload = payload || {};
  const awardsGameId = sportsLiveDisplayString_(payload.awardsGameId || payload.gameId);
  if (!awardsGameId) throw new Error("gameId is required.");

  const settingsMap = sportsLiveDisplaySettingsForGame_(awardsGameId);
  const eventLeagues = sportsLiveDisplayCollectEventsFromSettings_(settingsMap);
  const allEventIds = Object.keys(eventLeagues).slice(0, SPORTS_LIVE_DISPLAY_MAX_EVENTS);
  const trackerDefinitions = {};
  const trackerEventIds = [];

  Object.keys(settingsMap).forEach(function(categoryId) {
    const tracker = sportsLiveDisplayNormalizeTracker_(categoryId, settingsMap[categoryId] || {});
    if (!tracker || !tracker.entities.length) return;
    trackerDefinitions[categoryId] = tracker;
    tracker.entities.forEach(function(entity) {
      const eventId = sportsLiveDisplayString_(entity.espnEventId);
      if (eventId && trackerEventIds.indexOf(eventId) === -1) trackerEventIds.push(eventId);
    });
  });

  // Only stat-based questions need the three Sports Scores Engine reads.
  // Regular team wagers already receive their score feed directly in the browser.
  const engineData = sportsLiveDisplayFetchEngineData_(
    trackerEventIds.slice(0, SPORTS_LIVE_DISPLAY_MAX_EVENTS)
  );

  const mlbEventIds = allEventIds.filter(function(eventId) {
    const league = sportsLiveDisplayKey_(
      eventLeagues[eventId] ||
      engineData[eventId] && engineData[eventId].score && engineData[eventId].score.League
    );
    return league === "mlb";
  });
  const summaries = sportsLiveDisplayFetchEspnSummaries_(mlbEventIds);
  const gameDetails = sportsLiveDisplayBuildGameDetails_(allEventIds, eventLeagues, engineData, summaries);
  const trackers = {};

  Object.keys(trackerDefinitions).forEach(function(categoryId) {
    const finalized = sportsLiveDisplayFinalizeTracker_(trackerDefinitions[categoryId], engineData);
    finalized.entities.forEach(function(entity) {
      entity.gameDetails = gameDetails[entity.espnEventId] || null;
    });
    trackers[categoryId] = finalized;
  });

  return {
    success: true,
    version: SPORTS_LIVE_DISPLAY_VERSION,
    awardsGameId: awardsGameId,
    trackerCount: Object.keys(trackers).length,
    eventCount: allEventIds.length,
    statEventCount: trackerEventIds.length,
    trackers: trackers,
    gameDetails: gameDetails,
    timestamp: new Date().toISOString()
  };
}
