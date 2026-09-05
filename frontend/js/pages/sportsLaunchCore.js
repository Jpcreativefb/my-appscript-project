/* =========================================================
   RC24A SPORTS LAUNCH CORE
   Pure client-side Sports season/hub helpers.

   Visual contract: PATTC-RC24A-Sports-Default-Visual-Standard.
   No scoring, Sports Engine, auth, trigger, or provider behavior lives here.
========================================================= */
(function(global) {
  "use strict";

  const SLOT_ORDER = [
    "confidence",
    "wager",
    "survivor",
    "koth",
    "team-fantasy"
  ];

  const SLOT_LABELS = {
    confidence: "Confidence / Pick'em",
    wager: "Sports Wager",
    survivor: "Sports Survivor",
    koth: "King of the Hill",
    "team-fantasy": "Team Fantasy"
  };

  function text_(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function key_(value) {
    return text_(value).toLowerCase().replace(/_/g, "-");
  }

  function bool_(value) {
    if (value === true || value === 1) return true;
    const valueKey = key_(value);
    return valueKey === "true" || valueKey === "yes" || valueKey === "1" || valueKey === "on";
  }

  function number_(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
  }

  function gameId_(game) {
    game = game || {};
    return text_(game.gameId || game.GameId || game.id || game.Id);
  }

  function gameName_(game) {
    game = game || {};
    return text_(game.name || game.Name || game.gameName || game.GameName || gameId_(game));
  }

  function gameType_(game) {
    game = game || {};
    return key_(game.type || game.Type || game.gameType || game.GameType);
  }

  function weekNumber_(game) {
    game = game || {};
    const direct = [
      game.nflWeek,
      game.NFLWeek,
      game.week,
      game.Week,
      game.weekNumber,
      game.WeekNumber,
      game.currentWeek,
      game.CurrentWeek
    ];

    for (let i = 0; i < direct.length; i++) {
      const week = Math.floor(number_(direct[i], 0));
      if (week >= 1 && week <= 18) return week;
    }

    const searchable = [
      gameName_(game),
      gameId_(game),
      text_(game.description || game.Description)
    ].join(" ");

    const match = searchable.match(/(?:^|[^a-z0-9])(?:nfl\s*)?week[\s:_-]*(1[0-8]|[1-9])(?:[^0-9]|$)/i);
    if (match) return Number(match[1]);

    return 0;
  }

  function isComplete_(game) {
    game = game || {};
    if (game.resultsFinalized === true || game.ResultsFinalized === true) return true;
    if (game.isPast === true || game.past === true || game.archived === true || game.Archived === true) return true;
    const status = key_(game.status || game.Status || game.statusLabel || game.StatusLabel);
    return ["complete", "completed", "final", "finalized", "archived", "archive", "past"].indexOf(status) !== -1;
  }

  function isConfidenceGame_(game) {
    game = game || {};
    return gameType_(game) === "confidence" || bool_(game.confidenceEnabled || game.ConfidenceEnabled);
  }

  function isNflGame_(game) {
    game = game || {};
    const hubGroup = key_(game.hubGroup || game.HubGroup);
    const league = key_(game.sportsLeague || game.SportsLeague || game.league || game.League);
    const raw = [gameName_(game), gameId_(game)].map(key_).join(" ");
    return hubGroup === "nfl" || league === "nfl" || /(^|[^a-z])nfl([^a-z]|$)/.test(raw);
  }

  function classifySportsGame_(game) {
    game = game || {};
    const type = gameType_(game);
    const raw = [
      gameName_(game),
      gameId_(game),
      game.mode,
      game.Mode,
      game.survivorMode,
      game.SurvivorMode
    ].map(key_).join(" ");

    if (type === "survivor" && /(king-of-the-hill|king of the hill|\bkoth\b)/.test(raw)) return "koth";
    if (type === "team-fantasy" || type === "teamfantasy") return "team-fantasy";
    if (type === "wager" || type === "racing-wager" || bool_(game.wagerEnabled || game.WagerEnabled)) return "wager";
    if (isConfidenceGame_(game)) return "confidence";
    if (type === "survivor") return "survivor";
    return "";
  }

  function contributionRows_(leaderboardRows, childById) {
    const output = [];

    (leaderboardRows || []).forEach(function(row, rowIndex) {
      const username = text_(row.username || row.user || row.Username || row.User);
      const displayName = text_(row.displayName || row.name || row.DisplayName || username);
      const contributions = Array.isArray(row.miniGameContributions)
        ? row.miniGameContributions
        : (Array.isArray(row.MiniGameContributions) ? row.MiniGameContributions : []);

      contributions.forEach(function(item) {
        const childId = text_(item.gameId || item.GameId);
        if (!childId || !childById[childId]) return;
        output.push({
          childId: childId,
          username: username,
          displayName: displayName,
          rawScore: number_(item.rawScore !== undefined ? item.rawScore : item.RawScore, 0),
          contribution: number_(item.contribution !== undefined ? item.contribution : item.Contribution, 0),
          parentRowIndex: rowIndex
        });
      });
    });

    return output;
  }

  function rankScores_(rows) {
    const ranked = (rows || []).slice().sort(function(a, b) {
      if (number_(b.rawScore, 0) !== number_(a.rawScore, 0)) return number_(b.rawScore, 0) - number_(a.rawScore, 0);
      return text_(a.displayName || a.username).localeCompare(text_(b.displayName || b.username));
    });

    let lastScore = null;
    let lastRank = 0;
    ranked.forEach(function(row, index) {
      const score = number_(row.rawScore, 0);
      if (lastScore === null || score !== lastScore) lastRank = index + 1;
      row.weekRank = lastRank;
      lastScore = score;
    });
    return ranked;
  }

  function confidenceSeasonModel_(leaderboardRows, childGames) {
    const children = (childGames || []).filter(function(game) {
      const week = weekNumber_(game);
      return isConfidenceGame_(game) && week >= 1 && week <= 18;
    }).slice().sort(function(a, b) {
      const weekDiff = weekNumber_(a) - weekNumber_(b);
      if (weekDiff) return weekDiff;
      return number_(a.sortOrder || a.SortOrder, 999) - number_(b.sortOrder || b.SortOrder, 999);
    });

    if (!children.length) return null;

    const childById = {};
    children.forEach(function(game) {
      childById[gameId_(game)] = game;
    });

    const contributions = contributionRows_(leaderboardRows, childById);
    const weekBuckets = {};
    contributions.forEach(function(item) {
      if (!weekBuckets[item.childId]) weekBuckets[item.childId] = [];
      weekBuckets[item.childId].push(item);
    });

    const weekly = children.map(function(game) {
      const id = gameId_(game);
      const ranked = rankScores_(weekBuckets[id] || []);
      const complete = isComplete_(game);
      const topScore = ranked.length ? number_(ranked[0].rawScore, 0) : null;
      const topRows = ranked.filter(function(row) { return topScore !== null && number_(row.rawScore, 0) === topScore; });
      return {
        gameId: id,
        gameName: gameName_(game),
        week: weekNumber_(game),
        complete: complete,
        status: text_(game.statusLabel || game.status || (complete ? "Final" : "Open")),
        participantCount: ranked.length,
        topScore: topScore,
        winners: complete ? topRows.map(function(row) { return row.displayName || row.username; }) : [],
        leaders: complete ? [] : topRows.map(function(row) { return row.displayName || row.username; }),
        rows: ranked.map(function(row) {
          return {
            username: row.username,
            displayName: row.displayName,
            score: row.rawScore,
            rank: row.weekRank
          };
        })
      };
    });

    const weeklyById = {};
    weekly.forEach(function(week) { weeklyById[week.gameId] = week; });

    const standings = (leaderboardRows || []).map(function(row, index) {
      const username = text_(row.username || row.user || row.Username || row.User);
      const displayName = text_(row.displayName || row.name || row.DisplayName || username);
      const contributionsForUser = (Array.isArray(row.miniGameContributions) ? row.miniGameContributions : [])
        .filter(function(item) { return !!childById[text_(item.gameId || item.GameId)]; });

      const history = contributionsForUser.map(function(item) {
        const childId = text_(item.gameId || item.GameId);
        const week = weeklyById[childId] || null;
        const userWeek = week && week.rows.find(function(itemRow) {
          return key_(itemRow.username) === key_(username);
        });
        return {
          gameId: childId,
          week: week ? week.week : weekNumber_(childById[childId]),
          gameName: week ? week.gameName : gameName_(childById[childId]),
          score: number_(item.rawScore !== undefined ? item.rawScore : item.RawScore, 0),
          contribution: number_(item.contribution !== undefined ? item.contribution : item.Contribution, 0),
          rank: userWeek ? userWeek.rank : 0,
          complete: week ? week.complete : false
        };
      }).sort(function(a, b) { return a.week - b.week; });

      const weeklyWins = history.filter(function(item) {
        const week = weeklyById[item.gameId];
        return !!(week && week.complete && item.rank === 1);
      }).length;

      return {
        username: username,
        displayName: displayName,
        seasonRank: number_(row.rank || row.Rank, index + 1),
        seasonPoints: number_(row.total !== undefined ? row.total : row.Total, 0),
        weeklyWins: weeklyWins,
        weeksPlayed: history.length,
        history: history
      };
    }).sort(function(a, b) {
      if (a.seasonRank !== b.seasonRank) return a.seasonRank - b.seasonRank;
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      return a.displayName.localeCompare(b.displayName);
    });

    const configuredWeeks = {};
    children.forEach(function(game) { configuredWeeks[weekNumber_(game)] = true; });
    const missingWeeks = [];
    for (let week = 1; week <= 18; week++) {
      if (!configuredWeeks[week]) missingWeeks.push(week);
    }

    return {
      seasonWeeks: 18,
      configuredWeekCount: children.length,
      missingWeeks: missingWeeks,
      weekly: weekly,
      standings: standings,
      lateJoinAllowed: true,
      missedWeekAllowed: true
    };
  }

  function actionLabel_(game) {
    game = game || {};
    if (game.disableEnter === true || game.available === false) return text_(game.availabilityLabel || "Upcoming");

    const family = classifySportsGame_(game);
    const remaining = number_(game.remainingCount !== undefined ? game.remainingCount : game.remainingCategories, 0);
    const unsettled = number_(game.unsettledBets, 0);

    // KOTH is passive by contract. Never synthesize a pick CTA from generic
    // Dashboard progress counters that may be present on a Survivor-shaped game.
    if (family === "koth") {
      return text_(game.statusLabel || game.progressLabel || game.actionLabel || "Passive tracking");
    }

    if (family === "wager") {
      if (unsettled > 0) return unsettled + (unsettled === 1 ? " wager pending" : " wagers pending");
      return text_(game.statusLabel || game.progressLabel || game.actionLabel || "Open wagers");
    }

    if (remaining > 0) return remaining + (remaining === 1 ? " pick left" : " picks left");
    return text_(game.statusLabel || game.progressLabel || game.actionLabel || "Open game");
  }

  function timestamp_(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  }

  function sportsHubModel_(activeGames, pastGames) {
    const activeSports = (activeGames || []).filter(function(game) {
      return key_(game.hubCategory || game.HubCategory || "sports") === "sports";
    });
    const pastSports = (pastGames || []).filter(function(game) {
      return key_(game.hubCategory || game.HubCategory || "sports") === "sports";
    });

    const slots = SLOT_ORDER.map(function(slot) {
      const candidates = activeSports.filter(function(game) {
        return classifySportsGame_(game) === slot && isNflGame_(game);
      });
      candidates.sort(function(a, b) {
        if (isNflGame_(a) !== isNflGame_(b)) return isNflGame_(a) ? -1 : 1;
        const aWeek = weekNumber_(a);
        const bWeek = weekNumber_(b);
        if (aWeek && bWeek && aWeek !== bWeek) return bWeek - aWeek;
        return timestamp_(a.availableFrom || a.AvailableFrom) - timestamp_(b.availableFrom || b.AvailableFrom);
      });
      const game = candidates[0] || null;
      return {
        slot: slot,
        label: SLOT_LABELS[slot],
        game: game,
        action: game ? actionLabel_(game) : "Not active"
      };
    });

    const weeks = activeSports.filter(isNflGame_).map(weekNumber_).filter(function(week) { return week >= 1 && week <= 18; });
    const currentWeek = weeks.length ? Math.max.apply(null, weeks) : 0;

    const nextLockCandidates = activeSports.map(function(game) {
      const raw = game.nextLockDateTime || game.NextLockDateTime || game.nextLockAt || game.NextLockAt || game.lockDateTime || game.LockDateTime || "";
      return { game: game, raw: raw, time: timestamp_(raw) };
    }).filter(function(item) {
      return item.time > Date.now();
    }).sort(function(a, b) { return a.time - b.time; });

    const recent = pastSports.filter(isNflGame_).slice().sort(function(a, b) {
      const aTime = timestamp_(a.availableUntil || a.AvailableUntil || a.updatedAt || a.UpdatedAt);
      const bTime = timestamp_(b.availableUntil || b.AvailableUntil || b.updatedAt || b.UpdatedAt);
      return bTime - aTime;
    }).slice(0, 3);

    return {
      currentWeek: currentWeek,
      slots: slots,
      nextLock: nextLockCandidates.length ? nextLockCandidates[0] : null,
      recentResults: recent,
      activeCount: activeSports.length
    };
  }

  function escapeHtml_(value) {
    return text_(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeJs_(value) {
    return text_(value)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n");
  }

  function formatLock_(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return text_(value);
    try {
      return date.toLocaleString([], {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (err) {
      return date.toLocaleString();
    }
  }

  function renderConfidenceSeason_(model) {
    if (!model) return "";
    const configured = number_(model.configuredWeekCount, 0);
    const missing = Array.isArray(model.missingWeeks) ? model.missingWeeks : [];
    const standings = Array.isArray(model.standings) ? model.standings : [];
    const weekly = Array.isArray(model.weekly) ? model.weekly : [];
    const completedWeeks = weekly.filter(function(item) { return item.complete; }).length;
    const currentWeek = weekly.filter(function(item) { return !item.complete; }).map(function(item) { return item.week; })[0] || 0;

    return `
      <section class="dashboard-section rc24a-confidence-season">
        <div class="dashboard-section-header">
          <div>
            <p class="dashboard-kicker dark">NFL Season</p>
            <h2>Confidence Season Standings</h2>
          </div>
          <span class="dashboard-section-count">18 Weeks</span>
        </div>

        <div class="rc24a-confidence-season-summary">
          <div class="rc24a-confidence-season-stat"><span>Configured</span><strong>${configured} / 18</strong></div>
          <div class="rc24a-confidence-season-stat"><span>Completed</span><strong>${completedWeeks}</strong></div>
          <div class="rc24a-confidence-season-stat"><span>Active Week</span><strong>${currentWeek ? "Week " + currentWeek : "—"}</strong></div>
          <div class="rc24a-confidence-season-stat"><span>Participation</span><strong>Join Anytime</strong></div>
        </div>

        <p class="rc24a-confidence-season-note">
          Each NFL week is an independent Confidence game. Season points add across weeks; players may join late or miss a week and continue in later weeks.
        </p>
        ${missing.length ? `<p class="rc24a-confidence-season-note warning"><strong>Setup check:</strong> missing weekly mini-games: ${escapeHtml_(missing.join(", "))}.</p>` : ""}

        ${standings.length ? `
          <div class="rc24a-confidence-season-table" role="table" aria-label="Confidence season standings">
            <div class="rc24a-confidence-season-row header" role="row">
              <span>Rank</span><span>Player</span><span>Points</span><span>Wins</span><span>Weeks</span>
            </div>
            ${standings.slice(0, 10).map(function(row) {
              return `<div class="rc24a-confidence-season-row" role="row">
                <strong>#${number_(row.seasonRank, 0)}</strong>
                <span>${escapeHtml_(row.displayName || row.username)}</span>
                <strong>${number_(row.seasonPoints, 0)}</strong>
                <span>${number_(row.weeklyWins, 0)}</span>
                <span>${number_(row.weeksPlayed, 0)}</span>
              </div>`;
            }).join("")}
          </div>
        ` : `<p class="rc24a-confidence-season-note">Season standings will appear after players participate in a weekly game.</p>`}

        ${weekly.length ? `
          <div>
            <div class="dashboard-section-header">
              <div><p class="dashboard-kicker dark">Week by Week</p><h3>Weekly History</h3></div>
            </div>
            <div class="rc24a-confidence-week-list">
              <div class="rc24a-confidence-week-row header"><span>Week</span><span>Winner / Leader</span><span>Score</span><span>Leaderboard</span></div>
              ${weekly.map(function(week) {
                const names = week.complete ? week.winners : week.leaders;
                const label = names && names.length ? names.join(", ") : (week.complete ? "No winner recorded" : "Open / no leader yet");
                return `<div class="rc24a-confidence-week-row">
                  <strong>Week ${number_(week.week, 0)}</strong>
                  <span>${escapeHtml_(label)}</span>
                  <span>${week.topScore === null ? "—" : escapeHtml_(week.topScore)}</span>
                  <button type="button" onclick="viewGameLeaderboard('${escapeJs_(week.gameId)}', 'confidence', '')">View</button>
                </div>`;
              }).join("")}
            </div>
          </div>
        ` : ""}
      </section>
    `;
  }

  function renderSportsHub_(activeGames, pastGames) {
    const model = sportsHubModel_(activeGames, pastGames);
    const nextLock = model.nextLock;
    const recent = model.recentResults || [];

    return `
      <section class="rc24a-sports-launch sports-default-hub" aria-label="Sports launch core">
        <div class="rc24a-sports-launch-head">
          <div>
            <p>NFL Launch Core</p>
            <h2>Current Sports Games</h2>
          </div>
          <span class="rc24a-sports-week-pill">${model.currentWeek ? "NFL Week " + model.currentWeek : "NFL Season"}</span>
        </div>

        <div class="rc24a-sports-launch-grid">
          ${model.slots.map(function(slot) {
            const game = slot.game;
            const preferredLeagueId = game ? text_(game.leagueId || (Array.isArray(game.leagues) && game.leagues[0] && game.leagues[0].leagueId)) : "";
            return `<article class="rc24a-sports-launch-card sports-default-hub-card sports-default-hub-${escapeHtml_(slot.slot)}${game ? "" : " is-missing"}">
              <div class="sports-default-hub-copy">
                <span class="sports-default-hub-icon" aria-hidden="true"></span>
                <strong>${escapeHtml_(slot.label)}</strong>
                <small>${game ? escapeHtml_(gameName_(game)) : "No active NFL game"}</small>
              </div>
              <div>
                <small>${escapeHtml_(slot.action)}</small>
                <button type="button" ${game ? `onclick="enterGame('${escapeJs_(gameId_(game))}', '${escapeJs_(gameType_(game))}', '${escapeJs_(preferredLeagueId)}', '${escapeJs_(game.gameRole || 'standalone')}', '${escapeJs_(game.hubMode || 'playable-aggregate')}')"` : "disabled"}>${game ? "Open" : "Not Active"}</button>
              </div>
            </article>`;
          }).join("")}
        </div>

        <div class="rc24a-sports-launch-foot">
          <span><strong>Action required:</strong> ${model.slots.filter(function(slot) { return slot.game && (/pick|wagers? pending/i.test(slot.action)); }).length} game${model.slots.filter(function(slot) { return slot.game && (/pick|wagers? pending/i.test(slot.action)); }).length === 1 ? "" : "s"}</span>
          <span><strong>Next lock:</strong> ${nextLock ? escapeHtml_(gameName_(nextLock.game) + " · " + formatLock_(nextLock.raw)) : "Open a weekly game for exact lock"}</span>
          <span><strong>Recent:</strong> ${recent.length ? escapeHtml_(gameName_(recent[0])) : "No recent NFL result"}</span>
          <span><strong>Season status:</strong> ${escapeHtml_((model.slots[0] && model.slots[0].game && (model.slots[0].game.progressLabel || model.slots[0].game.statusLabel)) || (model.activeCount + " active Sports games"))}</span>
        </div>
      </section>
    `;
  }

  global.PATTCSportsLaunchCore = {
    version: "rc24a-sports-launch-core-corrected-art-1",
    slotOrder: SLOT_ORDER.slice(),
    slotLabels: Object.assign({}, SLOT_LABELS),
    weekNumber: weekNumber_,
    isComplete: isComplete_,
    isConfidenceGame: isConfidenceGame_,
    classifySportsGame: classifySportsGame_,
    confidenceSeasonModel: confidenceSeasonModel_,
    sportsHubModel: sportsHubModel_,
    renderConfidenceSeason: renderConfidenceSeason_,
    renderSportsHub: renderSportsHub_
  };
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
