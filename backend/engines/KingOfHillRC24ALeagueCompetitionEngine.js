/* =========================================================
   RC24A FINAL SPORTS CORRECTIONS
   KOTH LEAGUE-AWARE COMPETITION EXTENSION
   Loads after KingOfHillEngine.js.
   This is not a second scoring engine: it reuses the existing
   KOTH source aggregation, pacing, tie, strike, and end-state helpers.
   Sports Engine v55 is not referenced or modified.
   ========================================================= */

(function() {
  if (typeof KOTH_HISTORY_HEADERS !== "undefined" &&
      KOTH_HISTORY_HEADERS.indexOf("LeagueId") === -1) {
    KOTH_HISTORY_HEADERS.splice(1, 0, "LeagueId");
  }

  function kothLeagueCompetitionEnabled_(gameId, settings) {
    settings = settings || (typeof kothSettings_ === "function" ? kothSettings_(gameId) : {});
    var value = settings.kothLeagueCompetitionEnabled;
    if (value === true) return true;
    var key = typeof kothKey_ === "function" ? kothKey_(value) : String(value || "").toLowerCase();
    if (key === "true" || key === "yes" || key === "1" || key === "on") return true;
    var scope = typeof kothKey_ === "function"
      ? kothKey_(settings.kothCompetitionScope || settings.kothLeagueMode || "")
      : String(settings.kothCompetitionScope || settings.kothLeagueMode || "").toLowerCase();
    return scope === "league" || scope === "league-aware" || scope === "league-specific";
  }

  function kothLeagueId_(value) {
    if (typeof normalizeLeagueId_ === "function") return normalizeLeagueId_(value || "");
    return String(value || "").trim();
  }

  function kothLeagueMemberSet_(leagueId) {
    var set = {};
    leagueId = kothLeagueId_(leagueId);
    if (!leagueId || typeof getActiveLeagueMembers_ !== "function") return set;
    (getActiveLeagueMembers_(leagueId) || []).forEach(function(member) {
      var username = typeof kothString_ === "function"
        ? kothString_(member && (member.username || member.Username))
        : String(member && (member.username || member.Username) || "").trim();
      if (username) set[kothKey_(username)] = true;
    });
    return set;
  }

  function kothCompetitionLeagueIds_(gameId) {
    var ids = [""];
    if (typeof getActiveLeagueGamesForGame_ !== "function") return ids;
    (getActiveLeagueGamesForGame_(gameId) || []).forEach(function(row) {
      var id = kothLeagueId_(row && (row.leagueId || row.LeagueId));
      if (id && ids.indexOf(id) === -1) ids.push(id);
    });
    return ids;
  }

  function kothHistoryRowsForLeague_(gameId, leagueId) {
    leagueId = kothLeagueId_(leagueId);
    return (kothHistoryRows_(gameId) || []).filter(function(row) {
      return kothLeagueId_(row.LeagueId || "") === leagueId;
    });
  }

  function kothScoresForLeague_(scores, leagueId) {
    leagueId = kothLeagueId_(leagueId);
    if (!leagueId) return (scores || []).slice();
    var members = kothLeagueMemberSet_(leagueId);
    return (scores || []).filter(function(row) {
      return members[kothKey_(row.username)] === true;
    });
  }

  function kothLeagueName_(leagueId) {
    leagueId = kothLeagueId_(leagueId);
    if (!leagueId) return "Overall";
    if (typeof getLeagueMap_ === "function") {
      var map = getLeagueMap_() || {};
      var row = map[leagueId] || map[kothKey_(leagueId)] || {};
      return String(row.leagueName || row.LeagueName || leagueId);
    }
    return leagueId;
  }

  function kothBackfillLeagueHistoryFromOverall_(gameId, leagueId, settings) {
    leagueId = kothLeagueId_(leagueId);
    if (!leagueId) return { success: true, skipped: true, weeks: [] };
    var overall = kothHistoryRowsForLeague_(gameId, "");
    var leagueRows = kothHistoryRowsForLeague_(gameId, leagueId);
    var processed = {};
    leagueRows.forEach(function(row) { processed[String(Math.floor(kothNumber_(row.Week, 0)))] = true; });
    var weeks = [];
    overall.forEach(function(row) {
      var week = Math.floor(kothNumber_(row.Week, 0));
      if (week > 0 && weeks.indexOf(week) === -1) weeks.push(week);
    });
    weeks.sort(function(a,b){ return a-b; });
    var results = [];
    weeks.forEach(function(week) {
      if (processed[String(week)]) return;
      var weekRows = overall.filter(function(row) {
        return Math.floor(kothNumber_(row.Week, 0)) === week;
      });
      var collection = {
        ready: true,
        sourceResults: [],
        scores: weekRows.map(function(row) {
          return {
            username: kothString_(row.Username),
            displayName: kothString_(row.DisplayName) || kothString_(row.Username),
            score: kothNumber_(row.WeekScore, 0),
            sourceScores: kothJsonParse_(row.SourceScoresJSON, {})
          };
        })
      };
      if (collection.scores.length) {
        results.push(kothProcessWeekForLeague_(gameId, week, leagueId, settings, collection));
      }
    });
    return { success: true, skipped: !results.length, weeks: results.map(function(row){return row.week;}) };
  }

  function kothProcessWeekForLeague_(gameId, week, leagueId, settings, collection) {
    leagueId = kothLeagueId_(leagueId);
    var historyRows = kothHistoryRowsForLeague_(gameId, leagueId);
    if (historyRows.some(function(row) {
      return Math.floor(kothNumber_(row.Week, 0)) === week;
    })) {
      return {
        success: true,
        duplicate: true,
        gameId: gameId,
        leagueId: leagueId,
        leagueName: kothLeagueName_(leagueId),
        week: week,
        standings: kingOfHillLeaderboardDataLeague_(gameId, leagueId)
      };
    }

    var competitionScores = kothScoresForLeague_(collection.scores, leagueId);
    var previousState = kothLatestStateMap_(historyRows, week);
    var hasPrevious = Object.keys(previousState).length > 0;
    var scoreByKey = {};
    competitionScores.forEach(function(row) {
      scoreByKey[kothKey_(row.username)] = row;
    });

    var activePlayers = [];
    if (hasPrevious) {
      Object.keys(previousState).forEach(function(key) {
        var state = previousState[key];
        if (state.eliminated) return;
        var score = scoreByKey[key];
        if (!score) {
          throw new Error(
            "Week " + week + " is missing a finalized KOTH source score for active " +
            (leagueId ? ("League " + leagueId + " ") : "") + "player " + state.username + "."
          );
        }
        activePlayers.push({
          username: state.username,
          displayName: score.displayName || state.displayName || state.username,
          score: score.score,
          sourceScores: score.sourceScores,
          strikes: state.strikes,
          eliminated: false
        });
      });
    } else {
      activePlayers = competitionScores.map(function(score) {
        return {
          username: score.username,
          displayName: score.displayName || score.username,
          score: score.score,
          sourceScores: score.sourceScores,
          strikes: 0,
          eliminated: false
        };
      });
    }

    if (activePlayers.length <= 1) {
      return {
        success: true,
        complete: true,
        gameId: gameId,
        leagueId: leagueId,
        leagueName: kothLeagueName_(leagueId),
        week: week,
        soleSurvivor: activePlayers.length ? activePlayers[0].username : "",
        standings: kingOfHillLeaderboardDataLeague_(gameId, leagueId)
      };
    }

    var plan = kothWeekPlan_(activePlayers, week, settings, historyRows);
    var recipientSet = {};
    plan.selection.recipients.forEach(function(player) {
      recipientSet[kothKey_(player.username)] = true;
    });

    var ranked = activePlayers.slice().sort(function(a, b) {
      if (a.score !== b.score) return b.score - a.score;
      return kothString_(a.username).localeCompare(kothString_(b.username));
    });
    var rankMap = {};
    ranked.forEach(function(player, index) {
      rankMap[kothKey_(player.username)] = index + 1;
    });

    var historySheet = kothEnsureSheet_(KOTH_HISTORY_SHEET, KOTH_HISTORY_HEADERS);
    var now = new Date();
    activePlayers.forEach(function(player) {
      var key = kothKey_(player.username);
      var strike = recipientSet[key] === true;
      var strikesAfter = kothStrikeCountAfter_(player, strike, settings, plan.terminalFinish);
      var eliminated = strikesAfter >= settings.kothStrikeLimit;
      kothAppendObject_(historySheet, {
        GameId: gameId,
        LeagueId: leagueId,
        Week: week,
        Username: player.username,
        DisplayName: player.displayName || player.username,
        WeekScore: player.score,
        Rank: rankMap[key] || "",
        StrikesBefore: player.strikes,
        StrikeAwarded: strike,
        StrikeCountAfter: strikesAfter,
        Status: eliminated
          ? (plan.terminalFinish ? "FINAL-ELIMINATED" : "ELIMINATED")
          : (strike ? "STRIKE" : "SAFE"),
        Eliminated: eliminated,
        EliminatedWeek: eliminated ? week : "",
        SourceScoresJSON: JSON.stringify(player.sourceScores || {}),
        RecipientTarget: plan.recipientTarget,
        ActualRecipients: plan.selection.recipients.length,
        CutoffScore: plan.selection.cutoffScore,
        TieApplied: plan.selection.tieApplied,
        FinalStretch: plan.selection.finalStretch || plan.terminalFinish,
        ProcessedAt: now
      });
    });

    var standings = kingOfHillLeaderboardDataLeague_(gameId, leagueId);
    var alive = standings.filter(function(row) { return row.survivorAlive; });
    return {
      success: true,
      gameId: gameId,
      leagueId: leagueId,
      leagueName: kothLeagueName_(leagueId),
      week: week,
      recipientTarget: plan.recipientTarget,
      actualRecipients: plan.selection.recipients.length,
      recipients: plan.selection.recipients.map(function(player) { return player.username; }),
      cutoffScore: plan.selection.cutoffScore,
      tieApplied: plan.selection.tieApplied,
      finalStretch: plan.selection.finalStretch || plan.terminalFinish,
      terminalFinish: plan.terminalFinish,
      complete: standings.length > 1 && alive.length === 1,
      soleSurvivor: standings.length > 1 && alive.length === 1 ? alive[0].username : "",
      standings: standings
    };
  }

  function kingOfHillLeaderboardDataLeague_(gameId, leagueId, extraUsernames) {
    var settings = kothSettings_(gameId);
    leagueId = kothLeagueId_(leagueId);
    var rows = kothHistoryRowsForLeague_(gameId, leagueId);
    var state = kothLatestStateMap_(rows, 0);

    (extraUsernames || []).forEach(function(username) {
      var key = kothKey_(username);
      if (key && !state[key]) {
        state[key] = {
          username: username,
          displayName: username,
          week: 0,
          strikes: 0,
          eliminated: false,
          eliminatedWeek: 0,
          latestScore: 0
        };
      }
    });

    var keys = Object.keys(state);
    var aliveCount = keys.filter(function(key) { return !state[key].eliminated; }).length;
    var complete = keys.length > 1 && aliveCount === 1;
    var leaderboard = keys.map(function(key) {
      var item = state[key];
      var userRows = rows.filter(function(row) { return kothKey_(row.Username) === key; });
      var scores = userRows.map(function(row) {
        return kothNumber_(row.WeekScore, NaN);
      }).filter(Number.isFinite);
      var average = scores.length
        ? scores.reduce(function(sum, value) { return sum + value; }, 0) / scores.length
        : 0;
      var profile = typeof getLeaderboardUserProfile_ === "function"
        ? (getLeaderboardUserProfile_(item.username, gameId) || {})
        : {};
      var winner = complete && !item.eliminated;
      return {
        user: item.username,
        username: item.username,
        displayName: profile.displayName || item.displayName || item.username,
        avatar: profile.avatar || "👤",
        themeColor: profile.themeColor || profile.profileColor || "#354785",
        profileColor: profile.profileColor || profile.themeColor || "#354785",
        profileColorMode: profile.profileColorMode || "solid",
        profileColor2: profile.profileColor2 || "#354785",
        profileGradientAngle: profile.profileGradientAngle || "135",
        total: kothRound_(average),
        remaining: 0,
        max: kothRound_(average),
        statues: 0,
        survivorAlive: !item.eliminated,
        survivorWinner: winner,
        survivorComplete: complete,
        survivorRoundsSurvived: userRows.length,
        survivorEliminatedRound: item.eliminatedWeek || 0,
        survivorEliminatedReason: item.eliminated ? "strikes" : "",
        eliminated: item.eliminated,
        kothStrikes: item.strikes,
        kothStrikeLimit: settings.kothStrikeLimit,
        kothLatestScore: item.latestScore,
        kothSeasonAverage: kothRound_(average),
        kothLeagueId: leagueId,
        scoringMode: "king-of-the-hill",
        leaderboardScoreMode: "king-of-the-hill"
      };
    });

    leaderboard.sort(function(a, b) {
      if (!!a.survivorWinner !== !!b.survivorWinner) return a.survivorWinner ? -1 : 1;
      if (!!a.survivorAlive !== !!b.survivorAlive) return a.survivorAlive ? -1 : 1;
      if (a.kothStrikes !== b.kothStrikes) return a.kothStrikes - b.kothStrikes;
      if (a.kothSeasonAverage !== b.kothSeasonAverage) return b.kothSeasonAverage - a.kothSeasonAverage;
      return kothString_(a.displayName).localeCompare(kothString_(b.displayName));
    });
    return leaderboard;
  }

  var KOTH_RC24A_ORIGINAL_PROCESS_WEEK_ = typeof kothProcessWeek_ === "function" ? kothProcessWeek_ : null;
  var KOTH_RC24A_ORIGINAL_LEADERBOARD_ = typeof kingOfHillLeaderboardData_ === "function" ? kingOfHillLeaderboardData_ : null;
  var KOTH_RC24A_ORIGINAL_STATE_ = typeof apiGetKingOfHillState_ === "function" ? apiGetKingOfHillState_ : null;

  if (KOTH_RC24A_ORIGINAL_PROCESS_WEEK_) {
    kothProcessWeek_ = function(gameId, week, options) {
      options = options || {};
      gameId = kothString_(gameId);
      week = Math.floor(kothNumber_(week, 0));
      var settings = kothSettings_(gameId);
      if (!kothLeagueCompetitionEnabled_(gameId, settings)) {
        return KOTH_RC24A_ORIGINAL_PROCESS_WEEK_(gameId, week, options);
      }

      var collection = kothCollectWeekScores_(gameId, week, settings, {
        allowGeneric: options.allowGeneric === true
      });
      if (!collection.ready) {
        return {
          success: false,
          pending: true,
          gameId: gameId,
          week: week,
          manualRequired: collection.manualRequired === true,
          error: collection.error || "KOTH source scores are not ready."
        };
      }

      var leagueIds = kothCompetitionLeagueIds_(gameId);
      // If league-aware KOTH is enabled after game-wide weeks already exist,
      // deterministically replay those archived overall scores into each league
      // before processing the new week. Source scores are not re-fetched.
      leagueIds.filter(Boolean).forEach(function(leagueId) {
        kothBackfillLeagueHistoryFromOverall_(gameId, leagueId, settings);
      });
      var competitionResults = leagueIds.map(function(leagueId) {
        return kothProcessWeekForLeague_(gameId, week, leagueId, settings, collection);
      });

      // Source snapshots remain game/source owned. They are not duplicated by LeagueId.
      if (!competitionResults.every(function(row) { return row.duplicate === true; })) {
        kothSaveSnapshots_(gameId, week, collection);
      }

      var overall = competitionResults.filter(function(row) { return !row.leagueId; })[0] || competitionResults[0] || {};
      return Object.assign({}, overall, {
        success: competitionResults.every(function(row) { return row.success !== false; }),
        leagueAware: true,
        leagueResults: competitionResults
      });
    };
  }

  if (KOTH_RC24A_ORIGINAL_LEADERBOARD_) {
    kingOfHillLeaderboardData_ = function(gameId, extraUsernames, leagueId) {
      var settings = kothSettings_(gameId);
      if (!kothLeagueCompetitionEnabled_(gameId, settings)) {
        return KOTH_RC24A_ORIGINAL_LEADERBOARD_(gameId, extraUsernames);
      }
      return kingOfHillLeaderboardDataLeague_(gameId, leagueId || "", extraUsernames);
    };
  }

  if (KOTH_RC24A_ORIGINAL_STATE_) {
    apiGetKingOfHillState_ = function(payload) {
      payload = payload || {};
      var gameId = kothString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
      var username = kothString_(payload.username);
      var settings = kothSettings_(gameId);
      if (!kothLeagueCompetitionEnabled_(gameId, settings)) {
        return KOTH_RC24A_ORIGINAL_STATE_(payload);
      }

      var requestedLeagueId = kothLeagueId_(payload.leagueId || payload.activeLeagueId || "");
      if (requestedLeagueId && typeof getAccessibleLeaguesForGame_ === "function") {
        var allowed = (getAccessibleLeaguesForGame_(username, gameId) || []).some(function(row) {
          return kothLeagueId_(row.leagueId || row.LeagueId) === requestedLeagueId;
        });
        if (!allowed) throw new Error("You do not have access to this KOTH league.");
      }

      var game = kothSourceGame_(gameId) || {};
      var history = kothHistoryRowsForLeague_(gameId, requestedLeagueId);
      var standings = kingOfHillLeaderboardDataLeague_(gameId, requestedLeagueId, [username]);
      var me = standings.filter(function(row) {
        return kothKey_(row.username) === kothKey_(username);
      })[0] || {};
      var processedWeeks = Object.keys(kothProcessedWeeks_(history))
        .map(Number).sort(function(a, b) { return a - b; });
      var latestWeek = processedWeeks.length ? processedWeeks[processedWeeks.length - 1] : 0;
      var latestRows = latestWeek ? history.filter(function(row) { return Number(row.Week) === latestWeek; }) : [];
      var userHistory = history.filter(function(row) {
        return kothKey_(row.Username) === kothKey_(username);
      }).sort(function(a, b) {
        return Number(a.Week) - Number(b.Week);
      }).map(function(row) {
        return {
          week: Math.floor(kothNumber_(row.Week, 0)),
          leagueId: requestedLeagueId,
          score: kothNumber_(row.WeekScore, 0),
          rank: Math.floor(kothNumber_(row.Rank, 0)),
          strikeAwarded: kothBool_(row.StrikeAwarded, false),
          strikesAfter: Math.floor(kothNumber_(row.StrikeCountAfter, 0)),
          status: kothString_(row.Status),
          eliminated: kothBool_(row.Eliminated, false),
          sourceScores: kothJsonParse_(row.SourceScoresJSON, {}),
          cutoffScore: row.CutoffScore === "" ? null : kothNumber_(row.CutoffScore, null),
          tieApplied: kothBool_(row.TieApplied, false)
        };
      });

      return {
        success: true,
        gameId: gameId,
        gameName: game.name || game.Name || gameId,
        mode: "king-of-the-hill",
        passiveKoth: true,
        sportsMode: false,
        leagueAware: true,
        leagueId: requestedLeagueId,
        leagueName: kothLeagueName_(requestedLeagueId),
        alive: me.survivorAlive !== false,
        winner: me.survivorWinner === true,
        complete: me.survivorComplete === true,
        strikes: Math.floor(kothNumber_(me.kothStrikes, 0)),
        strikeLimit: settings.kothStrikeLimit,
        latestScore: kothNumber_(me.kothLatestScore, 0),
        seasonAverage: kothNumber_(me.kothSeasonAverage, 0),
        latestWeek: latestWeek,
        nextWeek: latestWeek ? latestWeek + 1 : settings.startWeek,
        startWeek: settings.startWeek,
        endWeek: settings.endWeek,
        recipientTarget: latestRows.length ? Math.floor(kothNumber_(latestRows[0].RecipientTarget, 0)) : 0,
        actualRecipients: latestRows.length ? Math.floor(kothNumber_(latestRows[0].ActualRecipients, 0)) : 0,
        sourceGameIds: settings.kothSourceGameIds,
        combineMode: settings.kothCombineMode,
        entryAggregation: settings.kothEntryAggregation,
        pacingMode: settings.kothPacingMode,
        tieRule: settings.kothTieRule,
        history: userHistory,
        standings: standings
      };
    };
  }

  // Export helpers into Apps Script global scope.
  this.kothLeagueCompetitionEnabled_ = kothLeagueCompetitionEnabled_;
  this.kothCompetitionLeagueIds_ = kothCompetitionLeagueIds_;
  this.kothHistoryRowsForLeague_ = kothHistoryRowsForLeague_;
  this.kothBackfillLeagueHistoryFromOverall_ = kothBackfillLeagueHistoryFromOverall_;
  this.kingOfHillLeaderboardDataLeague_ = kingOfHillLeaderboardDataLeague_;
}).call(this);
