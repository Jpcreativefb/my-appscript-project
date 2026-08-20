/* ======================
   DASHBOARD / GAMES HUB
====================== */

async function renderDashboardPage() {

  const username =
    getCurrentUsername();

  if (!username) {

    return `
      <div class="page">
        <h1>Dashboard</h1>
        <div class="card">
          You must be logged in.
        </div>
      </div>
    `;

  }

  let payload;

  setPageLoadStep(50, "Loading games dashboard…");

  try {

    payload =
      await apiGetDashboardGamesHub();

  } catch (err) {

    console.error(
      "DASHBOARD GAMES HUB ERROR",
      err
    );

    return `
      <div class="page dashboard-page">
        <h1>Home</h1>
        ${renderErrorCard(
          "Could not load games",
          err.message ||
          "The games dashboard failed to load. Please refresh and try again."
        )}
      </div>
    `;

  }

  if (
    !payload ||
    payload.success === false
  ) {

    return `
      <div class="page dashboard-page">
        <h1>Home</h1>
        ${renderErrorCard(
          "Could not load games",
          payload && (payload.error || payload.message)
            ? payload.error || payload.message
            : "Dashboard data was not available."
        )}
      </div>
    `;

  }

  setPageLoadStep(82, "Building your home screen…");

  const activeProfile =
    (
      typeof APP_STATE !== "undefined" &&
      APP_STATE.profile
    )
      ? APP_STATE.profile
      : {};

  const profileRaw =
    Object.keys(activeProfile).length
      ? activeProfile
      : payload.profile || {};

  const profile =
    profileRaw.profile ||
    profileRaw ||
    {};

  const activeGames =
    Array.isArray(payload.activeGames)
      ? payload.activeGames
      : [];

  const pastGames =
    Array.isArray(payload.pastGames)
      ? payload.pastGames
      : [];

  const displayName =
    profile.displayName ||
    profile.DisplayName ||
    profile.realName ||
    profile.RealName ||
    username;

  const themeColor =
    profile.profileColor ||
    profile.ProfileColor ||
    profile.themeColor ||
    profile.ThemeColor ||
    "#354785";

  const defaultGameId =
    String(payload.defaultGameId || "").trim();

  const featuredGame =
    activeGames.find(function(game) {
      return defaultGameId && String(game.gameId || "") === defaultGameId;
    }) ||
    activeGames[0] ||
    null;

  const otherActiveGames =
    featuredGame
      ? activeGames.filter(function(game) {
          return String(game.gameId || "") !== String(featuredGame.gameId || "");
        })
      : activeGames;

  if (typeof APP_STATE !== "undefined") {
    APP_STATE.dashboardHomePayload = payload;
    APP_STATE.dashboardHomeHydrationId = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }

  return `
    <div class="page dashboard-page dashboard-games-hub-page dashboard-home-v1218b">

      <section
        class="dashboard-home-hero"
        style="--profile-theme-color: ${escapeAttr(themeColor)};"
      >
        <div class="dashboard-home-hero-copy">
          <p class="dashboard-kicker">Welcome back</p>
          <h1>${escapeHtml(displayName)}</h1>
          <p class="dashboard-home-hero-subtitle">
            Your games, standings and accomplishments in one place.
          </p>
        </div>

        <button
          type="button"
          class="dashboard-home-profile-button"
          onclick="navigate('profile')"
        >
          Profile
        </button>
      </section>

      ${renderDashboardCareerStatsShell_()}

      ${featuredGame ? renderDashboardFeaturedGame_(featuredGame) : `
        <section class="dashboard-home-empty card">
          <strong>No active games right now.</strong>
          <span>Your next playable game will appear here.</span>
        </section>
      `}

      <section id="dashboardLeagueHomeSection" class="dashboard-home-section" hidden>
        <div class="dashboard-home-section-heading">
          <div>
            <p class="dashboard-kicker dark">My Leagues</p>
            <h2>Current Standings</h2>
          </div>
          <button type="button" class="dashboard-home-text-button" onclick="navigate('leagues')">All Leagues</button>
        </div>
        <div id="dashboardLeagueHomeCards" class="dashboard-league-home-strip"></div>
      </section>

      <section class="dashboard-home-section">
        <div class="dashboard-home-section-heading">
          <div>
            <p class="dashboard-kicker dark">Play Now</p>
            <h2>${featuredGame ? "More Active Games" : "Active Games"}</h2>
          </div>
          <span class="dashboard-section-count">${otherActiveGames.length}</span>
        </div>

        <div class="dashboard-home-active-grid">
          ${
            otherActiveGames.length
              ? otherActiveGames.map(renderDashboardCompactActiveGame_).join("")
              : `<div class="dashboard-home-muted-card">${featuredGame ? "Your featured game is the only active game right now." : "No active games are available right now."}</div>`
          }
        </div>
      </section>

      ${renderDashboardTrophyRoomShell_()}

      <details class="dashboard-home-past-section">
        <summary>
          <span>
            <small>Archive</small>
            Past Games
          </span>
          <strong>${pastGames.length}</strong>
        </summary>

        <div class="dashboard-home-past-grid">
          ${
            pastGames.length
              ? pastGames.map(renderDashboardPastGameCompact_).join("")
              : `<div class="dashboard-home-muted-card">Finished or archived games will appear here.</div>`
          }
        </div>
      </details>

    </div>
  `;

}

function renderDashboardCareerStatsShell_() {
  const stats = [
    ["—", "Games"],
    ["—", "Wins"],
    ["—", "Top 3"],
    ["—", "Avg Finish"],
    ["—", "Accuracy"]
  ];

  return `
    <section class="dashboard-home-stats-shell" aria-label="Career stats">
      <div class="dashboard-home-stats-heading">
        <span>Career</span>
        <small id="dashboardCareerStatsStatus">Loading archived standings…</small>
      </div>
      <div id="dashboardCareerStatsBar" class="dashboard-home-stats-bar">
        ${stats.map(function(stat, index) {
          return `
            <div class="dashboard-home-stat" data-career-stat-index="${index}">
              <strong>${stat[0]}</strong>
              <span>${stat[1]}</span>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderDashboardFeaturedGame_(game) {
  game = game || {};

  const heroImage = String(game.heroImage || game.heroImageUrl || "").trim();
  const heroPosition = String(game.heroImagePosition || "center center").trim();
  const progressValue = Math.max(0, Math.min(100, Number(game.progressValue) || 0));
  const progressAvailable = game.progressAvailable === true;
  const actionLabel = getDashboardGameActionLabel_(game, false, progressValue);
  const enterDisabled = game.disableEnter === true || game.available === false;
  const isSeasonHub = game.gameRole === "parent";
  const click = enterDisabled
    ? ""
    : `enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'), '${escapeJs(game.gameRole || 'standalone')}', '${escapeJs(game.hubMode || 'playable-aggregate')}')`;

  return `
    <section class="dashboard-featured-section">
      <div class="dashboard-home-section-heading featured-heading">
        <div>
          <p class="dashboard-kicker dark">Featured Game</p>
          <h2>Current Game</h2>
        </div>
      </div>

      <article
        class="dashboard-featured-game ${heroImage ? "has-hero-image" : ""}"
        ${heroImage ? platformBackgroundAttrs(heroImage, { variant: "hero", cssVariable: "--game-hero-image" }) : ""}
        style="--game-theme-color:${escapeAttr(game.themeColor || "#354785")};--game-hero-image:none;--game-hero-position:${escapeAttr(heroPosition)};"
      >
        <div class="dashboard-featured-art">
          <div class="dashboard-featured-status-row">
            <span class="dashboard-featured-status">${escapeHtml(game.lockLabel || game.statusLabel || "Open")}</span>
            ${game.typeLabel ? `<span class="dashboard-featured-type">${escapeHtml(game.typeLabel)}</span>` : ""}
          </div>

          <div class="dashboard-featured-title">
            <h2>${escapeHtml(game.name || game.gameId || "Game")}</h2>
            <p>${escapeHtml(game.subtitle || game.typeLabel || "Game")}</p>
          </div>
        </div>

        <div class="dashboard-featured-body">
          ${renderDashboardLeaguePicker_(game)}

          ${game.availabilityLabel && enterDisabled ? `<div class="dashboard-availability-note">${escapeHtml(game.availabilityLabel)}</div>` : ""}

          <div class="dashboard-featured-progress">
            <div>
              <span>${escapeHtml(game.progressLabel || (progressAvailable ? "Game progress" : "Ready to play"))}</span>
              <strong>${progressAvailable ? progressValue + "%" : "Ready"}</strong>
            </div>
            ${progressAvailable ? `<div class="dashboard-game-progress-bar"><span style="width:${progressValue}%"></span></div>` : ""}
          </div>

          <div class="dashboard-featured-actions">
            <button
              type="button"
              class="dashboard-action-button primary ${enterDisabled ? "disabled" : ""}"
              ${enterDisabled ? "disabled" : `onclick="${click}"`}
            >${escapeHtml(isSeasonHub ? "Open Season Hub" : actionLabel)}</button>

            ${game.showLeaderboard === false ? "" : `
              <button
                type="button"
                class="dashboard-action-button secondary"
                onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'))"
              >Standings</button>
            `}
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderDashboardCompactActiveGame_(game) {
  game = game || {};
  const progressValue = Math.max(0, Math.min(100, Number(game.progressValue) || 0));
  const actionLabel = getDashboardGameActionLabel_(game, false, progressValue);
  const enterDisabled = game.disableEnter === true || game.available === false;
  const heroImage = String(game.heroImage || game.heroImageUrl || "").trim();
  const preferredLeagueId = String(
    game.leagueId ||
    (Array.isArray(game.leagues) && game.leagues[0] && game.leagues[0].leagueId) ||
    ""
  );

  return `
    <article
      class="dashboard-compact-game ${heroImage ? "has-image" : ""}"
      ${heroImage ? platformBackgroundAttrs(heroImage, { variant: "hero", cssVariable: "--compact-game-image" }) : ""}
      style="--game-theme-color:${escapeAttr(game.themeColor || "#354785")};--compact-game-image:none;"
    >
      <div class="dashboard-compact-game-art">
        <span>${escapeHtml(game.lockLabel || game.statusLabel || "Open")}</span>
        <div>
          <h3>${escapeHtml(game.name || game.gameId || "Game")}</h3>
          <p>${escapeHtml(game.typeLabel || game.subtitle || "Game")}</p>
        </div>
      </div>
      <div class="dashboard-compact-game-body">
        <div class="dashboard-compact-progress">
          <span>${escapeHtml(game.progressLabel || "Ready to play")}</span>
          <strong>${game.progressAvailable === true ? progressValue + "%" : "—"}</strong>
        </div>
        <button
          type="button"
          class="dashboard-compact-play-button"
          ${enterDisabled ? "disabled" : `onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', '${escapeJs(preferredLeagueId)}', '${escapeJs(game.gameRole || 'standalone')}', '${escapeJs(game.hubMode || 'playable-aggregate')}')"`}
        >${escapeHtml(enterDisabled ? (game.availabilityLabel || actionLabel) : actionLabel)}</button>
      </div>
    </article>
  `;
}

function renderDashboardPastGameCompact_(game) {
  game = game || {};
  return `
    <article class="dashboard-past-compact">
      <div>
        <strong>${escapeHtml(game.name || game.gameId || "Game")}</strong>
        <span>${escapeHtml(game.typeLabel || game.subtitle || "Finished")}</span>
      </div>
      <button
        type="button"
        onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', '')"
      >Results</button>
    </article>
  `;
}

function renderDashboardTrophyRoomShell_() {
  return `
    <section class="dashboard-trophy-room-preview">
      <div class="dashboard-trophy-room-copy">
        <p class="dashboard-kicker">Trophy Room</p>
        <h2>Your accomplishments live here.</h2>
        <p>Game wins and podium finishes are counted now. Admin-created trophies and achievements are the next step.</p>
      </div>

      <div id="dashboardTrophyPreviewStats" class="dashboard-trophy-preview-stats">
        <div><strong>—</strong><span>Game Wins</span></div>
        <div><strong>—</strong><span>Podiums</span></div>
        <div><strong>Coming Soon</strong><span>Admin Awards</span></div>
      </div>
    </section>
  `;
}

async function hydrateDashboardHomeExtras_() {
  if (typeof APP_STATE === "undefined" || APP_STATE.currentPage !== "dashboard") return;

  const hydrationId = APP_STATE.dashboardHomeHydrationId || "";
  const payload = APP_STATE.dashboardHomePayload || {};
  const username = getCurrentUsername();
  if (!username) return;

  const careerPromise = typeof apiGetUserProfileHistory === "function"
    ? apiGetUserProfileHistory(username, "")
    : Promise.resolve(null);

  const leaguesPromise = typeof apiGetMyLeagues === "function"
    ? apiGetMyLeagues("")
    : Promise.resolve(null);

  const results = await Promise.allSettled([careerPromise, leaguesPromise]);

  if (
    typeof APP_STATE === "undefined" ||
    APP_STATE.currentPage !== "dashboard" ||
    APP_STATE.dashboardHomeHydrationId !== hydrationId
  ) return;

  const career = results[0].status === "fulfilled" ? results[0].value : null;
  const leagues = results[1].status === "fulfilled" ? results[1].value : null;

  hydrateDashboardCareerStats_(career);
  await hydrateDashboardLeagueStandings_(leagues, payload, hydrationId);
}

function hydrateDashboardCareerStats_(response) {
  const summary = response && response.success !== false ? (response.summary || {}) : {};
  const games = Array.isArray(summary.games) ? summary.games : [];
  const ranked = games.filter(function(game) { return Number(game.rank) > 0; });
  const avgFinish = ranked.length
    ? ranked.reduce(function(total, game) { return total + Number(game.rank || 0); }, 0) / ranked.length
    : 0;

  const values = [
    Number(summary.archivedGames) || 0,
    Number(summary.firstPlaceFinishes) || 0,
    Number(summary.topThreeFinishes) || 0,
    avgFinish ? avgFinish.toFixed(1) : "—",
    (Number(summary.accuracy) || 0) + "%"
  ];

  const bar = document.getElementById("dashboardCareerStatsBar");
  if (bar) {
    Array.from(bar.querySelectorAll(".dashboard-home-stat")).forEach(function(node, index) {
      const strong = node.querySelector("strong");
      if (strong) strong.textContent = values[index] !== undefined ? values[index] : "—";
    });
  }

  const status = document.getElementById("dashboardCareerStatsStatus");
  if (status) {
    status.textContent = Number(summary.archivedGames) > 0
      ? "Verified from archived game standings"
      : "Career stats begin as games are archived";
  }

  const trophy = document.getElementById("dashboardTrophyPreviewStats");
  if (trophy) {
    const strongs = trophy.querySelectorAll("strong");
    if (strongs[0]) strongs[0].textContent = String(Number(summary.firstPlaceFinishes) || 0);
    if (strongs[1]) strongs[1].textContent = String(Number(summary.topThreeFinishes) || 0);
  }
}

async function hydrateDashboardLeagueStandings_(response, payload, hydrationId) {
  const leagues = response && response.success !== false && Array.isArray(response.leagues)
    ? response.leagues
    : [];

  const section = document.getElementById("dashboardLeagueHomeSection");
  const cards = document.getElementById("dashboardLeagueHomeCards");
  if (!section || !cards || !leagues.length) return;

  section.hidden = false;

  const activeGames = Array.isArray(payload.activeGames) ? payload.activeGames : [];
  const leagueItems = leagues.slice(0, 8).map(function(league) {
    const leagueId = String(league.leagueId || "");
    const game = activeGames.find(function(candidate) {
      return Array.isArray(candidate.leagues) && candidate.leagues.some(function(item) {
        return String(item.leagueId || "") === leagueId;
      });
    }) || null;
    return { league: league, game: game };
  });

  cards.innerHTML = leagueItems.map(function(item, index) {
    return renderDashboardLeagueStandingCard_(item.league, item.game, null, index);
  }).join("");

  const jobs = leagueItems.map(async function(item, index) {
    if (!item.game || typeof apiGetLeaderboardForLeague !== "function") return;
    try {
      const standings = await apiGetLeaderboardForLeague(item.game.gameId, item.league.leagueId || "");
      if (
        typeof APP_STATE === "undefined" ||
        APP_STATE.currentPage !== "dashboard" ||
        APP_STATE.dashboardHomeHydrationId !== hydrationId
      ) return;
      const node = document.getElementById("dashboardLeagueStanding-" + index);
      if (node) node.outerHTML = renderDashboardLeagueStandingCard_(item.league, item.game, standings, index);
    } catch (err) {
      console.warn("Dashboard league standings unavailable", err);
    }
  });

  await Promise.allSettled(jobs);
}

function renderDashboardLeagueStandingCard_(league, game, standings, index) {
  league = league || {};
  game = game || null;
  const rows = standings && Array.isArray(standings.leaderboard)
    ? standings.leaderboard
    : [];
  const username = String(getCurrentUsername() || "").toLowerCase();
  const userRow = rows.find(function(row) {
    return String(row.username || row.user || row.Username || "").toLowerCase() === username;
  }) || null;
  const leader = rows[0] || null;
  const rank = userRow ? Number(userRow.rank || userRow.Rank) || (rows.indexOf(userRow) + 1) : 0;
  const score = userRow ? dashboardLeaderboardScore_(userRow) : "—";
  const leaderScore = leader ? dashboardLeaderboardScore_(leader) : "—";

  return `
    <article id="dashboardLeagueStanding-${index}" class="dashboard-league-home-card">
      <div class="dashboard-league-home-topline">
        <div>
          <strong>${escapeHtml(league.leagueName || league.leagueId || "League")}</strong>
          <span>${escapeHtml(league.role || "member")}</span>
        </div>
        ${rank ? `<b>#${rank}</b>` : `<b>—</b>`}
      </div>

      <div class="dashboard-league-home-game">
        ${game ? escapeHtml(game.name || game.gameId || "Current game") : "No active league game"}
      </div>

      <div class="dashboard-league-scoreboard">
        <div>
          <span>Your Standing</span>
          <strong>${rank ? "#" + rank + " of " + rows.length : (game ? "Loading / no score yet" : "—")}</strong>
          <small>${game ? "Score " + escapeHtml(score) : "No active standings"}</small>
        </div>
        <div>
          <span>Leader</span>
          <strong>${leader ? escapeHtml(leader.displayName || leader.username || "Leader") : "—"}</strong>
          <small>${leader ? "Score " + escapeHtml(leaderScore) : ""}</small>
        </div>
      </div>

      ${game ? `
        <button
          type="button"
          class="dashboard-league-open-button"
          onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', '${escapeJs(league.leagueId || "")}')"
        >Open Standings</button>
      ` : ""}
    </article>
  `;
}

function dashboardLeaderboardScore_(row) {
  row = row || {};
  const candidates = [
    row.totalScore,
    row.score,
    row.points,
    row.TotalScore,
    row.Score,
    row.Points,
    row.finalBankroll,
    row.balance
  ];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i] !== undefined && candidates[i] !== null && candidates[i] !== "") {
      const numeric = Number(candidates[i]);
      if (Number.isFinite(numeric)) return String(Math.round(numeric * 100) / 100);
      return String(candidates[i]);
    }
  }
  return "—";
}

function renderDashboardGameCard(
  game,
  isPast
) {

  game =
    game || {};

  const leaderboardPreview =
    Array.isArray(game.leaderboardPreview)
      ? game.leaderboardPreview
      : [];

  const userStats =
    Array.isArray(game.userStats)
      ? game.userStats
      : [];

  const progressValue =
    Math.max(
      0,
      Math.min(
        100,
        Number(game.progressValue) || 0
      )
    );

  const progressAvailable =
    game.progressAvailable === true ||
    (
      game.progressAvailable !== false &&
      (
        Number(game.totalCount) > 0 ||
        progressValue > 0
      )
    );

  const heroImage =
    String(
      game.heroImage ||
      game.heroImageUrl ||
      ""
    ).trim();

  const heroPosition =
    String(
      game.heroImagePosition ||
      "center center"
    ).trim();

  const lockLabel =
    game.lockLabel ||
    game.statusLabel ||
    "Lock time TBD";

  const actionLabel =
    getDashboardGameActionLabel_(
      game,
      isPast,
      progressValue
    );

  const leagues =
    Array.isArray(game.leagues)
      ? game.leagues
      : [];

  const leaguePicker =
    renderDashboardLeaguePicker_(
      game
    );

  const selectedLeagueArg =
    `getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}')`;

  const enterDisabled =
    game.disableEnter === true ||
    game.available === false;

  const isSeasonHub =
    game.gameRole === "parent";

  const actionButton =
    isSeasonHub
      ? `
        <button
          class="dashboard-action-button primary ${enterDisabled && !isPast ? "disabled" : ""}"
          ${enterDisabled && !isPast ? "disabled" : ""}
          onclick="${enterDisabled && !isPast ? "" : `enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'), 'parent', '${escapeJs(game.hubMode || 'playable-aggregate')}')`}"
        >
          ${isPast ? "View Season Hub" : escapeHtml(actionLabel)}
        </button>
      `
      : isPast
        ? `
          <button
            class="dashboard-action-button primary"
            onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'))"
          >
            View Results
          </button>
        `
      : enterDisabled
        ? `
          <button
            class="dashboard-action-button primary disabled"
            disabled
            title="${escapeAttr(game.availabilityLabel || actionLabel)}"
          >
            ${escapeHtml(actionLabel)}
          </button>
        `
        : `
          <button
            class="dashboard-action-button primary"
            onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'), '${escapeJs(game.gameRole || 'standalone')}', '${escapeJs(game.hubMode || 'playable-aggregate')}')"
          >
            ${escapeHtml(actionLabel)}
          </button>
        `;

  const leaderboardButton =
    game.showLeaderboard === false
      ? ""
      : `
        <button
          class="dashboard-action-button secondary"
          onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'))"
        >
          Open Full Leaderboard
        </button>
      `;

  return `
    <article
      class="card dashboard-game-card dashboard-game-card-with-hero ${heroImage ? "has-hero-image" : ""} ${isPast ? "past-game-card" : ""} ${enterDisabled ? "game-unavailable" : ""}"
      ${heroImage ? platformBackgroundAttrs(heroImage, { variant: "hero", cssVariable: "--game-hero-image" }) : ""}
      style="--game-theme-color: ${escapeAttr(game.themeColor || "#354785")}; --game-hero-image: none; --game-hero-position: ${escapeAttr(heroPosition)};"
    >

      <div class="dashboard-game-hero-band">

        <div class="dashboard-game-topline">
          <span class="dashboard-game-lock-label">
            ${escapeHtml(lockLabel)}
          </span>
        </div>

        <div class="dashboard-game-title-block">
          <h3>
            ${escapeHtml(game.name || game.gameId || "Game")}
          </h3>

          <p class="dashboard-game-subtitle">
            ${escapeHtml(game.typeLabel || game.subtitle || "Game")}
          </p>
        </div>

      </div>

      ${leaguePicker}

      ${
        game.availabilityLabel && enterDisabled
          ? `
            <div class="dashboard-availability-note">
              ${escapeHtml(game.availabilityLabel)}
            </div>
          `
          : ""
      }

      <details class="dashboard-game-description">
        <summary>
          Game details
        </summary>

        <p>
          ${escapeHtml(game.description || "Game details will appear here.")}
        </p>
      </details>

      <div class="dashboard-game-progress-wrap">
        <div class="dashboard-game-progress-meta">
          <span>
            ${escapeHtml(game.progressLabel || "Ready to play")}
          </span>

          <strong>
            ${progressAvailable ? `${progressValue}%` : "—"}
          </strong>
        </div>

        ${
          progressAvailable
            ? `
              <div class="dashboard-game-progress-bar">
                <span style="width: ${progressValue}%;"></span>
              </div>
            `
            : ""
        }
      </div>

      <div class="dashboard-user-stats-card">
        <h4>
          Your Stats
        </h4>

        <div class="dashboard-user-stats-grid">
          ${
            userStats.length
              ? userStats
                  .map(stat => `
                    <div class="dashboard-user-stat">
                      <span>
                        ${escapeHtml(stat.label || "Stat")}
                      </span>

                      <strong>
                        ${escapeHtml(stat.value !== undefined ? stat.value : "—")}
                      </strong>
                    </div>
                  `)
                  .join("")
              : `
                <p class="dashboard-muted">
                  No stats yet.
                </p>
              `
          }
        </div>
      </div>

      <details class="dashboard-leaderboard-details">
        <summary>
          Leaderboard
        </summary>

        <div class="dashboard-mini-leaderboard">
          ${
            leaderboardPreview.length
              ? leaderboardPreview
                  .map(row => `
                    <div class="dashboard-mini-leaderboard-row">
                      <span>
                        #${Number(row.rank) || ""}
                        ${escapeHtml(row.displayName || row.username || "Player")}
                      </span>

                      <strong>
                        ${escapeHtml(row.scoreLabel || "Score")}:
                        ${escapeHtml(row.score)}
                      </strong>
                    </div>
                  `)
                  .join("")
              : `<p class="dashboard-muted">No leaderboard yet.</p>`
          }

          ${leaderboardButton}
        </div>
      </details>

      <div class="dashboard-game-actions">
        ${actionButton}
      </div>

    </article>
  `;

}


function renderDashboardLeaguePicker_(game) {

  game = game || {};

  const leagues =
    Array.isArray(game.leagues)
      ? game.leagues
      : [];

  if (!leagues.length) {
    return `
      <div class="dashboard-league-badge public-game-badge">
        Public Game
      </div>
    `;
  }

  if (leagues.length === 1) {

    const league = leagues[0];

    return `
      <div class="dashboard-league-badge">
        League:
        <strong>${escapeHtml(league.leagueName || league.leagueId || "League")}</strong>
      </div>
    `;

  }

  const selectedLeagueId =
    game.leagueId ||
    (
      typeof getFrontendLeagueId === "function"
        ? getFrontendLeagueId()
        : ""
    ) ||
    (leagues[0] && leagues[0].leagueId) ||
    "";

  return `
    <label class="dashboard-league-picker">
      <span>League</span>
      <select id="dashboardLeagueSelect-${escapeAttr(game.gameId || "")}">
        ${leagues.map(league => `
          <option
            value="${escapeAttr(league.leagueId || "") }"
            ${league.leagueId === selectedLeagueId ? "selected" : ""}
          >
            ${escapeHtml(league.leagueName || league.leagueId || "League")}
            ${league.role ? " · " + escapeHtml(league.role) : ""}
          </option>
        `).join("")}
      </select>
    </label>
  `;

}

function getDashboardSelectedLeagueId_(gameId) {

  const select =
    document.getElementById(
      "dashboardLeagueSelect-" + String(gameId || "")
    );

  if (select) {
    return select.value || "";
  }

  return "";

}

function getDashboardGameActionLabel_(
  game,
  isPast,
  progressValue
) {

  if (isPast) {
    return "View Results";
  }

  if (game.disableEnter === true || game.available === false) {

    const disabledLabel =
      String(
        game.enterLabel ||
        game.actionLabel ||
        game.availabilityLabel ||
        "Check Status"
      ).trim();

    return disabledLabel || "Check Status";

  }

  const backendLabel =
    String(
      game.enterLabel ||
      game.actionLabel ||
      ""
    ).trim();

  if (
    backendLabel &&
    backendLabel !== "Play Now"
  ) {
    return backendLabel;
  }

  const type =
    String(game.type || game.rawType || "")
      .trim()
      .toLowerCase();

  const madeCount =
    Number(game.madeCount) ||
    getDashboardMadeCountFromStats_(game);

  const totalCount =
    Number(game.totalCount) || 0;

  const hasStarted =
    game.hasStarted === true ||
    madeCount > 0 ||
    progressValue > 0;

  if (!hasStarted) {
    return "Play Now";
  }

  const complete =
    totalCount > 0 &&
    madeCount >= totalCount;

  if (
    type === "wager" ||
    type === "betting"
  ) {
    return complete
      ? "Review Wagers"
      : "Manage Wagers";
  }

  if (type === "confidence") {
    return complete
      ? "View Confidence Picks"
      : "Continue Confidence Picks";
  }

  if (type === "ranking") {
    return "Check Status";
  }

  return complete
    ? "View Picks"
    : "Continue Picks";

}

function getDashboardMadeCountFromStats_(game) {

  const stats =
    Array.isArray(game.userStats)
      ? game.userStats
      : [];

  for (let i = 0; i < stats.length; i++) {

    const label =
      String(stats[i].label || "")
        .trim()
        .toLowerCase();

    const value =
      String(stats[i].value || "")
        .trim();

    if (
      label === "wagers" ||
      label === "picks" ||
      label === "confidence picks"
    ) {

      const match =
        value.match(/^\d+/);

      return match
        ? Number(match[0]) || 0
        : 0;

    }

  }

  return 0;

}
