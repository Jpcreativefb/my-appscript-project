/* ======================
   DASHBOARD / GAMES HUB
====================== */

async function renderDashboardPage() {

  const username = getCurrentUsername();

  if (!username) {
    return `
      <div class="page">
        <h1>Dashboard</h1>
        <div class="card">You must be logged in.</div>
      </div>
    `;
  }

  let payload;
  setPageLoadStep(50, "Loading games dashboard…");

  try {
    payload = await apiGetDashboardGamesHub();
  } catch (err) {
    console.error("DASHBOARD GAMES HUB ERROR", err);
    return `
      <div class="page dashboard-page">
        <h1>Home</h1>
        ${renderErrorCard(
          "Could not load games",
          err.message || "The games dashboard failed to load. Please refresh and try again."
        )}
      </div>
    `;
  }

  if (!payload || payload.success === false) {
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

  const activeProfile = (
    typeof APP_STATE !== "undefined" &&
    APP_STATE.profile &&
    Object.keys(APP_STATE.profile).length
  ) ? APP_STATE.profile : {};

  const profileRaw = Object.keys(activeProfile).length
    ? activeProfile
    : (payload.profile || {});

  const profile = profileRaw.profile || profileRaw || {};
  const activeGames = Array.isArray(payload.activeGames) ? payload.activeGames : [];
  const pastGames = Array.isArray(payload.pastGames) ? payload.pastGames : [];
  dashboardCacheHubAppearance_(payload.hubAppearance || []);

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

  const bio = String(profile.bio || profile.Bio || "").trim();
  const playingGames = dashboardGetPlayingGames_(activeGames);
  const attentionGames = dashboardGetAttentionGames_(playingGames);
  const offeredGames = activeGames.filter(function(game) {
    return playingGames.indexOf(game) === -1;
  });

  const snark = dashboardGetSnarkMessage_(
    attentionGames,
    playingGames,
    offeredGames,
    username
  );

  if (typeof APP_STATE !== "undefined") {
    APP_STATE.dashboardHomePayload = payload;
    APP_STATE.dashboardHomeHydrationId = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    if (!APP_STATE.profile || !Object.keys(APP_STATE.profile).length) {
      APP_STATE.profile = profile;
    }
  }

  return `
    <div class="page dashboard-page dashboard-games-hub-page dashboard-home-v1218c">

      <div id="dashboardPlayerSticky" class="dashboard-player-sticky" aria-hidden="true">
        ${renderDashboardProfileAvatar_(profile, displayName)}
        <strong>${escapeHtml(displayName)}</strong>
      </div>

      <section id="dashboardPlayerCard" class="dashboard-player-card" style="--profile-theme-color:${escapeAttr(themeColor)};">
        <div class="dashboard-snark-line">${escapeHtml(snark)}</div>

        <div class="dashboard-player-main">
          ${renderDashboardProfileAvatar_(profile, displayName)}
          <div class="dashboard-player-copy">
            <h1>${escapeHtml(displayName)}</h1>
            ${bio ? `<p class="dashboard-player-note">${escapeHtml(bio)}</p>` : ""}
            <div class="dashboard-player-quick-actions">
              <button type="button" class="dashboard-profile-mini-button" onclick="navigate('profile')">Profile</button>
              <button type="button" class="dashboard-trophy-button" onclick="navigate('trophy-room')">🏆 Trophy Room</button>
            </div>
          </div>
        </div>

        <details class="dashboard-career-details">
          ${renderDashboardCareerStatsShell_()}
        </details>
      </section>

      ${attentionGames.length ? `
        <section class="dashboard-home-section dashboard-attention-section">
          <div class="dashboard-home-section-heading">
            <div>
              <p class="dashboard-kicker dark">Needs Your Attention</p>
              <h2>What to do next</h2>
            </div>
            <span class="dashboard-section-count alert">${attentionGames.length}</span>
          </div>
          <div class="dashboard-attention-grid">
            ${attentionGames.map(renderDashboardAttentionGame_).join("")}
          </div>
        </section>
      ` : `
        <section class="dashboard-caught-up-banner">
          <strong>✓ You're caught up.</strong>
          <span>We'll flag games here when picks or questions need your attention.</span>
        </section>
      `}

      <section id="dashboardLeagueHomeSection" class="dashboard-home-section" aria-label="Current Standings" hidden>
        <div class="dashboard-home-section-heading">
          <div>
            <p class="dashboard-kicker dark">My Leagues</p>
            <h2>Current Scoreboard</h2>
          </div>
          <button type="button" class="dashboard-home-text-button" onclick="navigate('leagues')">All Leagues</button>
        </div>
        <div id="dashboardLeagueHomeCards" class="dashboard-league-home-strip"></div>
      </section>

      <section class="dashboard-home-section">
        <div class="dashboard-home-section-heading">
          <div>
            <p class="dashboard-kicker dark">My Games</p>
            <h2>Games You're Playing</h2>
          </div>
          <span class="dashboard-section-count">${playingGames.length}</span>
        </div>
        <div class="dashboard-home-active-grid dashboard-user-games-grid">
          ${playingGames.length
            ? playingGames.map(renderDashboardCompactActiveGame_).join("")
            : `<div class="dashboard-home-muted-card">You haven't started an active game yet. Pick something from New Games below.</div>`}
        </div>
      </section>

      ${renderDashboardHubLauncher_(activeGames, pastGames)}

      <section class="dashboard-home-section dashboard-discover-section">
        <div class="dashboard-home-section-heading">
          <div>
            <p class="dashboard-kicker dark">Discover</p>
            <h2>New Games Available</h2>
          </div>
          <span class="dashboard-section-count">${offeredGames.length}</span>
        </div>
        <div class="dashboard-discover-grid">
          ${offeredGames.length
            ? offeredGames.map(renderDashboardDiscoverGame_).join("")
            : `<div class="dashboard-home-muted-card">You've already started every active game currently offered.</div>`}
        </div>
      </section>

    </div>
  `;
}

function renderDashboardProfileAvatar_(profile, displayName) {
  profile = profile || {};
  const type = String(profile.avatarType || profile.AvatarType || "initials").trim().toLowerCase();
  const url = String(profile.avatarUrl || profile.AvatarUrl || "").trim();
  const emoji = String(profile.avatarEmoji || profile.AvatarEmoji || "🏆").trim();
  const initials = String(
    profile.avatarInitials ||
    profile.AvatarInitials ||
    String(displayName || "P")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function(part) { return part.charAt(0).toUpperCase(); })
      .join("") ||
    "P"
  );

  if ((type === "url" || type === "upload") && url) {
    return `<div class="dashboard-profile-photo">${platformImgHtml(url, { className: "dashboard-profile-photo-img", variant: "avatar", alt: displayName || "Profile photo" })}</div>`;
  }

  if (type === "emoji") {
    return `<div class="dashboard-profile-photo dashboard-profile-photo-fallback"><span>${escapeHtml(emoji || "🏆")}</span></div>`;
  }

  return `<div class="dashboard-profile-photo dashboard-profile-photo-fallback"><span>${escapeHtml(initials)}</span></div>`;
}

function dashboardCacheHubAppearance_(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const map = {};
  list.forEach(function(row) {
    const key = String(row && row.SettingKey || "").trim().toLowerCase();
    if (key) map[key] = row;
  });
  if (typeof APP_STATE !== "undefined") {
    APP_STATE.dashboardHubAppearanceRows = list;
    APP_STATE.dashboardHubAppearanceMap = map;
  }
  return map;
}

function dashboardHubSettingKey_(category, group) {
  const cat = String(category || "general").trim().toLowerCase();
  const grp = String(group || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return grp ? cat + ":" + grp : cat;
}

function dashboardHubSetting_(category, group) {
  const map = typeof APP_STATE !== "undefined" && APP_STATE.dashboardHubAppearanceMap
    ? APP_STATE.dashboardHubAppearanceMap
    : {};
  const exact = map[dashboardHubSettingKey_(category, group)];
  if (exact) return exact;
  return map[dashboardHubSettingKey_(category, "")] || {};
}


function dashboardHubColorSpec_(row, fallback) {
  row = row || {};
  const validHex = function(value, defaultValue) {
    const text = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text : defaultValue;
  };
  const color = validHex(row.Color, fallback || "#354785");
  const start = validHex(row.GradientStart, color);
  const end = validHex(row.GradientEnd, color);
  const rawAngle = Number(row.GradientAngle);
  const angle = isFinite(rawAngle) ? Math.max(0, Math.min(360, rawAngle)) : 135;
  const mode = String(row.ColorMode || "solid").toLowerCase() === "gradient" ? "gradient" : "solid";
  return {
    color: color,
    mode: mode,
    start: start,
    end: end,
    angle: angle,
    fill: mode === "gradient" ? "linear-gradient(" + angle + "deg," + start + "," + end + ")" : color
  };
}

function dashboardHubImageTone_(row) {
  row = row || {};
  const rawOpacity = Number(row.ImageOpacity);
  const rawDarken = Number(row.ImageDarken);
  return {
    opacity: isFinite(rawOpacity) ? Math.max(0, Math.min(100, rawOpacity)) / 100 : 1,
    darken: isFinite(rawDarken) ? Math.max(0, Math.min(100, rawDarken)) / 100 : 0.35
  };
}

function dashboardAppearanceAssetUrl_(row, kind) {
  row = row || {};
  const fileId = String(kind === "icon" ? row.IconFileId || "" : row.ImageFileId || "").trim();
  const explicit = String(kind === "icon" ? row.IconUrl || "" : row.ImageUrl || "").trim();
  if (explicit) return explicit;
  if (!fileId) return "";
  return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=" + (kind === "icon" ? "w240" : "w1200");
}

function dashboardHubIconHtml_(category, group, className) {
  const row = dashboardHubSetting_(category, group);
  const url = dashboardAppearanceAssetUrl_(row, "icon");
  const fallback = String(row.IconText || dashboardHubIcon_(category) || "★");
  if (url) {
    return platformImgHtml(url, {
      className: (className || "dashboard-hub-custom-icon") + " dashboard-hub-custom-icon",
      variant: "logo",
      eager: true,
      alt: row.DisplayName || group || dashboardHubDisplayName_(category)
    });
  }
  return '<span class="' + escapeAttr(className || "dashboard-hub-icon-text") + '">' + escapeHtml(fallback) + '</span>';
}

function dashboardApplyHubAppearance_() {
  const navMap = {
    dashboard: "home",
    "hub:sports": "sports",
    "hub:reality": "reality",
    "hub:awards": "awards",
    more: "more"
  };
  Object.keys(navMap).forEach(function(page) {
    const button = document.querySelector('.bottom-nav button[data-page="' + page + '"]');
    if (!button) return;
    const key = navMap[page];
    const row = dashboardHubSetting_(key, "");
    if (!row || !Object.keys(row).length) return;
    const icon = button.querySelector(".bottom-nav-icon");
    const label = button.querySelector(".bottom-nav-label");
    const iconUrl = dashboardAppearanceAssetUrl_(row, "icon");
    if (icon) {
      icon.innerHTML = iconUrl
        ? platformImgHtml(iconUrl, { className: "bottom-nav-custom-icon", variant: "logo", eager: true, alt: row.DisplayName || key })
        : escapeHtml(String(row.IconText || icon.textContent || "•"));
    }
    if (label) {
      label.textContent = String(row.DisplayName || label.textContent || "");
      label.hidden = row.ShowNavLabel === false || String(row.ShowNavLabel).toLowerCase() === "false";
    }
    const colors = dashboardHubColorSpec_(row, "#354785");
    button.style.setProperty("--bottom-nav-accent", colors.color);
    button.style.setProperty("--bottom-nav-accent-bg", colors.fill);
  });
  if (window.PlatformImageEngine && typeof window.PlatformImageEngine.process === "function") {
    window.PlatformImageEngine.process(document.querySelector(".bottom-nav") || document);
  }
}

function dashboardMountStickyPlayer_() {
  const card = document.getElementById("dashboardPlayerCard");
  const sticky = document.getElementById("dashboardPlayerSticky");
  if (!card || !sticky) return;

  if (typeof APP_STATE !== "undefined" && typeof APP_STATE.dashboardStickyCleanup === "function") {
    APP_STATE.dashboardStickyCleanup();
  }

  const update = function() {
    if (typeof APP_STATE !== "undefined" && APP_STATE.currentPage !== "dashboard") return;
    const rect = card.getBoundingClientRect();
    const active = rect.top < 12;
    sticky.classList.toggle("active", active);
    sticky.setAttribute("aria-hidden", active ? "false" : "true");
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();

  if (typeof APP_STATE !== "undefined") {
    APP_STATE.dashboardStickyCleanup = function() {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }
}

function dashboardGameCardAttrs_(game, cssVariable) {
  game = game || {};
  const heroFileId = String(game.heroImageFileId || "").trim();
  const heroImage = String(
    game.heroImage ||
    game.heroImageUrl ||
    (heroFileId ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(heroFileId) + "&sz=w1200" : "")
  ).trim();
  const color = String(game.themeColor || "#354785").trim() || "#354785";
  const attrs = heroImage ? platformBackgroundAttrs(heroImage, { variant: "hero", cssVariable: cssVariable || "--dashboard-game-card-image" }) : "";
  return {
    heroImage: heroImage,
    className: heroImage ? " has-game-image" : "",
    attrs: attrs,
    style: "--game-theme-color:" + escapeAttr(color) + ";" + (cssVariable || "--dashboard-game-card-image") + ":none;"
  };
}

function dashboardLeagueCardAppearance_(league, game) {
  league = league || {};
  game = game || null;
  const leagueId = String(league.leagueId || league.LeagueId || "").trim();
  const setting = leagueId ? dashboardHubSetting_("league", leagueId) : {};
  const fallbackColor = String(game && game.themeColor || "#354785").trim() || "#354785";
  const colors = dashboardHubColorSpec_(setting, fallbackColor);
  const tone = dashboardHubImageTone_(setting);
  const leagueImage = dashboardAppearanceAssetUrl_(setting, "image");
  const gameFileId = String(game && game.heroImageFileId || "").trim();
  const gameImage = String(
    game && (
      game.heroImage ||
      game.heroImageUrl ||
      (gameFileId ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(gameFileId) + "&sz=w1200" : "")
    ) || ""
  ).trim();
  const image = leagueImage || gameImage;
  const attrs = image ? platformBackgroundAttrs(image, { variant: "hero", cssVariable: "--dashboard-league-card-image" }) : "";
  return {
    setting: setting,
    colors: colors,
    image: image,
    className: image ? " has-league-image" : "",
    attrs: attrs,
    style: [
      "--dashboard-league-color:" + escapeAttr(colors.color),
      "--dashboard-league-fill:" + escapeAttr(colors.fill),
      "--dashboard-league-card-image:none",
      "--dashboard-league-image-opacity:" + tone.opacity,
      "--dashboard-league-image-darken:" + tone.darken
    ].join(";") + ";"
  };
}

function dashboardIsUserActiveGame_(game, allGames) {
  if (!game) return false;
  if (game.hasStarted === true || Number(game.madeCount) > 0) return true;

  if (game.gameRole === "parent") {
    return (Array.isArray(allGames) ? allGames : []).some(function(candidate) {
      return String(candidate.parentGameId || "") === String(game.gameId || "") &&
        (candidate.hasStarted === true || Number(candidate.madeCount) > 0);
    });
  }

  return false;
}

function dashboardGetPlayingGames_(activeGames) {
  const games = Array.isArray(activeGames) ? activeGames : [];
  return games.filter(function(game) {
    return dashboardIsUserActiveGame_(game, games);
  });
}

function dashboardGetAttentionGames_(playingGames) {
  return (Array.isArray(playingGames) ? playingGames : []).filter(function(game) {
    if (game.disableEnter === true || game.available === false) return false;
    const total = Number(game.totalCount) || 0;
    const made = Number(game.madeCount) || 0;
    return game.progressAvailable === true && total > 0 && made < total;
  });
}

function dashboardGetSnarkMessage_(attentionGames, playingGames, offeredGames, username) {
  const attention = Array.isArray(attentionGames) ? attentionGames : [];
  const playing = Array.isArray(playingGames) ? playingGames : [];
  const offered = Array.isArray(offeredGames) ? offeredGames : [];

  let situation = "quiet";
  let choices;

  if (attention.length) {
    situation = "attention";
    choices = [
      "New picks are waiting. Apparently they still won't make themselves.",
      "You've got unfinished picks. Your future bragging rights are at stake.",
      "Fresh decisions required. Try to make the good ones this time.",
      "The board changed. Time to pretend you knew this was coming.",
      "Picks need attention. Confidence is optional. Submitting them is not."
    ];
  } else if (playing.length) {
    situation = "caught-up";
    choices = [
      "You're actually caught up. Suspicious, but we'll allow it.",
      "Nothing due right now. Enjoy this rare moment of competence.",
      "All caught up. Go ahead and admire the standings.",
      "Your picks are in. Now comes the easy part: blaming bad luck.",
      "No homework right now. The scoreboard can do the stressing for you."
    ];
  } else if (offered.length) {
    situation = "new-games";
    choices = [
      "Fresh games are open. Surely one of them needs your questionable expertise.",
      "Nothing started yet. That's a lot of untapped bragging potential.",
      "New games are waiting. Choose your next bad decision wisely.",
      "The lobby is stocked. Time to put some opinions on the record."
    ];
  } else {
    choices = [
      "Nothing demanding your expertise right now. Enjoy the silence.",
      "The game board is quiet. It won't stay that way.",
      "No active business at the moment. Your reputation is safe for now."
    ];
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const seedText = [username || "player", dayKey, situation].join("|");
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = ((seed << 5) - seed) + seedText.charCodeAt(i);
    seed |= 0;
  }

  return choices[Math.abs(seed) % choices.length];
}

function renderDashboardAttentionGame_(game) {
  game = game || {};
  const total = Number(game.totalCount) || 0;
  const made = Number(game.madeCount) || 0;
  const remaining = Math.max(0, total - made);
  const noun = remaining === 1 ? "pick" : "picks";
  const preferredLeagueId = String(
    game.leagueId ||
    (Array.isArray(game.leagues) && game.leagues[0] && game.leagues[0].leagueId) ||
    ""
  );
  const card = dashboardGameCardAttrs_(game, "--dashboard-game-card-image");

  return `
    <article class="dashboard-attention-card dashboard-colored-game-card${card.className}" ${card.attrs} style="${card.style}">
      <div class="dashboard-colored-game-copy">
        <span class="dashboard-attention-badge">${remaining} ${noun} remaining</span>
        <h3>${escapeHtml(game.name || game.gameId || "Game")}</h3>
        <p>${escapeHtml(game.lockLabel || game.statusLabel || "Picks open")}</p>
      </div>
      <button type="button" onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', '${escapeJs(preferredLeagueId)}', '${escapeJs(game.gameRole || 'standalone')}', '${escapeJs(game.hubMode || 'playable-aggregate')}')">Make Picks</button>
    </article>
  `;
}

function renderDashboardDiscoverGame_(game) {
  game = game || {};
  const preferredLeagueId = String(
    game.leagueId ||
    (Array.isArray(game.leagues) && game.leagues[0] && game.leagues[0].leagueId) ||
    ""
  );
  const disabled = game.disableEnter === true || game.available === false;
  const card = dashboardGameCardAttrs_(game, "--dashboard-game-card-image");

  return `
    <article class="dashboard-discover-game dashboard-colored-game-card${card.className}" ${card.attrs} style="${card.style}">
      <div class="dashboard-colored-game-copy">
        <span>${escapeHtml(dashboardHubDisplayName_(game.hubCategory || "general"))} · ${escapeHtml(game.hubGroup || game.typeLabel || "Game")}</span>
        <strong>${escapeHtml(game.name || game.gameId || "Game")}</strong>
        <small>${escapeHtml(game.lockLabel || game.statusLabel || "Open")}</small>
      </div>
      <button type="button" ${disabled ? "disabled" : `onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', '${escapeJs(preferredLeagueId)}', '${escapeJs(game.gameRole || 'standalone')}', '${escapeJs(game.hubMode || 'playable-aggregate')}')"`}>${escapeHtml(disabled ? (game.availabilityLabel || "Unavailable") : "Play")}</button>
    </article>
  `;
}

function renderDashboardHubLauncher_(activeGames, pastGames) {
  const hubs = ["sports", "reality", "awards", "general"];
  const active = Array.isArray(activeGames) ? activeGames : [];
  const past = Array.isArray(pastGames) ? pastGames : [];

  return `
    <section class="dashboard-home-section dashboard-hub-launcher-section">
      <div class="dashboard-home-section-heading">
        <div>
          <p class="dashboard-kicker dark">Game Hubs</p>
          <h2>Everything in its lane</h2>
        </div>
      </div>
      <div class="dashboard-hub-launcher-grid">
        ${hubs.map(function(category) {
          const current = active.filter(function(game) { return (game.hubCategory || "general") === category; });
          const archived = past.filter(function(game) { return (game.hubCategory || "general") === category; });
          const playing = dashboardGetPlayingGames_(current);
          const offered = current.filter(function(game) { return playing.indexOf(game) === -1; });
          const setting = dashboardHubSetting_(category, "");
          const hubImage = dashboardAppearanceAssetUrl_(setting, "image");
          const attrs = hubImage ? platformBackgroundAttrs(hubImage, { variant: "hero", cssVariable: "--dashboard-hub-image" }) : "";
          const colors = dashboardHubColorSpec_(setting, "#354785");
          const tone = dashboardHubImageTone_(setting);
          return `
            <details class="dashboard-hub-launcher-card${hubImage ? ' has-hub-image' : ''}" ${attrs} style="--dashboard-hub-color:${escapeAttr(colors.color)};--dashboard-hub-fill:${escapeAttr(colors.fill)};--dashboard-hub-image:none;--dashboard-hub-image-opacity:${tone.opacity};--dashboard-hub-image-darken:${tone.darken};">
              <summary>
                <span class="dashboard-hub-icon">${dashboardHubIconHtml_(category, "", "dashboard-hub-icon-custom")}</span>
                <span><strong>${escapeHtml(dashboardHubDisplayName_(category))}</strong><small>${playing.length} playing · ${offered.length} available</small></span>
                <b>›</b>
              </summary>
              <div class="dashboard-hub-launcher-body">
                ${current.slice(0, 3).map(function(game) {
                  return `<span>${escapeHtml(game.name || game.gameId || "Game")}</span>`;
                }).join("") || `<span>No active games right now.</span>`}
                ${archived.length ? `<small>${archived.length} archived in this hub</small>` : ""}
                <button type="button" onclick="navigate('hub:${category}')">Open ${escapeHtml(dashboardHubDisplayName_(category))}</button>
              </div>
            </details>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function dashboardHubDisplayName_(category) {
  const key = String(category || "general");
  const setting = dashboardHubSetting_(key, "");
  if (setting && String(setting.DisplayName || "").trim()) return String(setting.DisplayName).trim();
  return ({
    sports: "Sports",
    reality: "Reality Shows",
    awards: "Awards Shows",
    general: "General Games",
    home: "Home",
    more: "More"
  })[key] || "General Games";
}

function dashboardHubIcon_(category) {
  return ({ sports: "🏈", reality: "📺", awards: "🏆", general: "🎲", league: "🏅" })[String(category || "general")] || "🎲";
}

function dashboardHubDescription_(category) {
  return ({
    sports: "Sports games organized by league, with current games, available games and history together.",
    reality: "Reality-show seasons and episode games organized by show.",
    awards: "Awards-show games organized by event, with current and historical games together.",
    general: "Prediction games, special events and anything that doesn't belong in another hub."
  })[String(category || "general")] || "Games and history.";
}

async function loadDashboardHubPayload_() {
  if (typeof APP_STATE !== "undefined" && APP_STATE.dashboardHomePayload) {
    return APP_STATE.dashboardHomePayload;
  }
  const payload = await apiGetDashboardGamesHub();
  if (typeof APP_STATE !== "undefined" && payload && payload.success !== false) {
    APP_STATE.dashboardHomePayload = payload;
    dashboardCacheHubAppearance_(payload.hubAppearance || []);
  }
  return payload;
}

async function renderDashboardHubPage_(category) {
  category = String(category || "general").toLowerCase();
  const payload = await loadDashboardHubPayload_();
  if (!payload || payload.success === false) {
    return `<div class="page"><h1>${escapeHtml(dashboardHubDisplayName_(category))}</h1>${renderErrorCard("Could not load hub", payload && (payload.error || payload.message) || "Hub data unavailable.")}</div>`;
  }
  dashboardCacheHubAppearance_(payload.hubAppearance || []);
  setTimeout(function() { dashboardApplyHubAppearance_(); }, 0);

  const active = (Array.isArray(payload.activeGames) ? payload.activeGames : []).filter(function(game) {
    return (game.hubCategory || "general") === category;
  });
  const past = (Array.isArray(payload.pastGames) ? payload.pastGames : []).filter(function(game) {
    return (game.hubCategory || "general") === category;
  });

  const groupNames = [];
  active.concat(past).forEach(function(game) {
    const group = String(game.hubGroup || "Other").trim() || "Other";
    if (groupNames.indexOf(group) === -1) groupNames.push(group);
  });
  groupNames.sort();

  const setting = dashboardHubSetting_(category, "");
  const hubImage = dashboardAppearanceAssetUrl_(setting, "image");
  const attrs = hubImage ? platformBackgroundAttrs(hubImage, { variant: "hero", cssVariable: "--dashboard-domain-image" }) : "";
  const colors = dashboardHubColorSpec_(setting, "#354785");
  const tone = dashboardHubImageTone_(setting);

  return `
    <div class="page dashboard-domain-hub dashboard-domain-${escapeAttr(category)}">
      <header class="dashboard-domain-header${hubImage ? ' has-domain-image' : ''}" ${attrs} style="--dashboard-domain-color:${escapeAttr(colors.color)};--dashboard-domain-fill:${escapeAttr(colors.fill)};--dashboard-domain-image:none;--dashboard-domain-image-opacity:${tone.opacity};--dashboard-domain-image-darken:${tone.darken};">
        <button type="button" class="dashboard-hub-back" onclick="navigate('dashboard')">← Home</button>
        <div class="dashboard-domain-title-row">
          <span>${dashboardHubIconHtml_(category, "", "dashboard-domain-custom-icon")}</span>
          <div><p>Game Hub</p><h1>${escapeHtml(dashboardHubDisplayName_(category))}</h1></div>
        </div>
        <p>${escapeHtml(dashboardHubDescription_(category))}</p>
      </header>

      ${groupNames.length ? groupNames.map(function(group) {
        return renderDashboardSubHub_(category, group, active, past);
      }).join("") : `
        <div class="dashboard-home-muted-card">No ${escapeHtml(dashboardHubDisplayName_(category).toLowerCase())} are available yet.</div>
      `}
    </div>
  `;
}

function renderDashboardSubHub_(category, group, activeGames, pastGames) {
  const current = activeGames.filter(function(game) { return String(game.hubGroup || "Other") === group; });
  const archived = pastGames.filter(function(game) { return String(game.hubGroup || "Other") === group; });
  const playing = dashboardGetPlayingGames_(current);
  const attention = dashboardGetAttentionGames_(playing);
  const offered = current.filter(function(game) { return playing.indexOf(game) === -1; });
  const setting = dashboardHubSetting_(category, group);
  const image = dashboardAppearanceAssetUrl_(setting, "image");
  const attrs = image ? platformBackgroundAttrs(image, { variant: "hero", cssVariable: "--dashboard-subhub-image" }) : "";
  const parentSetting = dashboardHubSetting_(category, "");
  const colors = dashboardHubColorSpec_(setting, String(parentSetting.Color || "#354785"));
  const tone = dashboardHubImageTone_(setting);
  const display = String(setting.DisplayName || group);

  return `
    <details class="dashboard-subhub${image ? ' has-subhub-image' : ''}" ${attrs} style="--dashboard-subhub-color:${escapeAttr(colors.color)};--dashboard-subhub-fill:${escapeAttr(colors.fill)};--dashboard-subhub-image:none;--dashboard-subhub-image-opacity:${tone.opacity};--dashboard-subhub-image-darken:${tone.darken};" open>
      <summary>
        <span class="dashboard-subhub-heading-icon">${dashboardHubIconHtml_(category, group, "dashboard-subhub-custom-icon")}</span>
        <span><strong>${escapeHtml(display)}</strong><small>${playing.length} playing · ${offered.length} available · ${archived.length} archived</small></span>
        <b>⌄</b>
      </summary>
      <div class="dashboard-subhub-body">
        ${attention.length ? `<div class="dashboard-subhub-block"><h3>Needs Attention</h3><div class="dashboard-attention-grid">${attention.map(renderDashboardAttentionGame_).join("")}</div></div>` : ""}
        <div class="dashboard-subhub-block"><h3>My Active Games</h3><div class="dashboard-home-active-grid">${playing.length ? playing.map(renderDashboardCompactActiveGame_).join("") : `<div class="dashboard-home-muted-card">No games started in ${escapeHtml(display)} yet.</div>`}</div></div>
        <div class="dashboard-subhub-block"><h3>Available to Play</h3><div class="dashboard-discover-grid">${offered.length ? offered.map(renderDashboardDiscoverGame_).join("") : `<div class="dashboard-home-muted-card">No additional games available right now.</div>`}</div></div>
        <details class="dashboard-subhub-archive">
          <summary>Past / Archived Games <strong>${archived.length}</strong></summary>
          <div class="dashboard-home-past-grid">${archived.length ? archived.map(renderDashboardPastGameCompact_).join("") : `<div class="dashboard-home-muted-card">No archived games yet.</div>`}</div>
        </details>
      </div>
    </details>
  `;
}

async function renderDashboardMorePage_() {
  const session = typeof getSession === "function" ? getSession() : {};
  const isAdmin = typeof isAdminSession === "function" && isAdminSession(session);
  return `
    <div class="page dashboard-more-page">
      <header class="dashboard-domain-header">
        <div class="dashboard-domain-title-row"><span>•••</span><div><p>Awards App</p><h1>More</h1></div></div>
        <p>General games, your player tools and app controls.</p>
      </header>
      <div class="dashboard-more-grid">
        <button type="button" onclick="navigate('hub:general')"><span>🎲</span><strong>General Games</strong><small>Prediction games, special events and oddball games.</small></button>
        <button type="button" onclick="navigate('trophy-room')"><span>🏆</span><strong>Trophy Room</strong><small>Wins, podiums and future admin-created awards.</small></button>
        <button type="button" onclick="navigate('profile')"><span>👤</span><strong>Profile</strong><small>Photo, display name, note and game-specific profiles.</small></button>
        <button type="button" onclick="navigate('leagues')"><span>📊</span><strong>My Leagues</strong><small>League memberships and standings.</small></button>
        ${isAdmin ? `<button type="button" onclick="navigate('admin')"><span>⚙️</span><strong>Admin</strong><small>Manage games, results and app settings.</small></button>` : ""}
        <button type="button" class="dashboard-more-logout" onclick="logout()"><span>↪</span><strong>Log Out</strong><small>Sign out on this device.</small></button>
      </div>
    </div>
  `;
}

async function renderDashboardTrophyRoomPage_() {
  const username = getCurrentUsername();
  let history = null;
  try {
    history = typeof apiGetUserProfileHistory === "function"
      ? await apiGetUserProfileHistory(username, "")
      : null;
  } catch (err) {
    history = null;
  }
  const summary = history && history.success !== false ? (history.summary || {}) : {};
  const games = Array.isArray(summary.games) ? summary.games : [];
  const ranked = games.filter(function(game) { return Number(game.rank) > 0; });
  const wins = Number(summary.firstPlaceFinishes) || 0;
  const podiums = Number(summary.topThreeFinishes) || 0;

  return `
    <div class="page dashboard-trophy-page">
      <header class="dashboard-domain-header trophy-header">
        <button type="button" class="dashboard-hub-back" onclick="navigate('dashboard')">← Home</button>
        <div class="dashboard-domain-title-row"><span>🏆</span><div><p>Player Collection</p><h1>Trophy Room</h1></div></div>
        <p>Your game accomplishments live here. Custom admin-created awards are the next Trophy Room phase.</p>
      </header>
      <div class="dashboard-trophy-summary-grid">
        <div><strong>${wins}</strong><span>Game Wins</span></div>
        <div><strong>${podiums}</strong><span>Podiums</span></div>
        <div><strong>${ranked.length}</strong><span>Ranked Finishes</span></div>
      </div>
      <section class="dashboard-trophy-future card">
        <span class="dashboard-trophy-big">🏅</span>
        <div><h2>Admin Awards</h2><p>Coming next: custom accomplishments created and awarded by an admin, then displayed here alongside game wins.</p></div>
      </section>
    </div>
  `;
}

function renderDashboardCareerStatsShell_() {
  return `
    <summary class="dashboard-career-summary">
      <span class="dashboard-career-title">Career Stats</span>
      <span id="dashboardCareerStatsBar" class="dashboard-career-primary dashboard-home-stats-bar">
        <span><strong data-career-stat="games">—</strong><small>Games</small></span>
        <span><strong data-career-stat="wins">—</strong><small>Wins</small></span>
        <span><strong data-career-stat="top3">—</strong><small>Top 3</small></span>
      </span>
      <span class="dashboard-career-more">⌄<small>more</small></span>
    </summary>
    <div class="dashboard-career-extra">
      <span><strong data-career-stat="avg">—</strong><small>Avg Finish</small></span>
      <span><strong data-career-stat="accuracy">—</strong><small>Accuracy</small></span>
    </div>
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
  const preferredLeagueId = String(
    game.leagueId ||
    (Array.isArray(game.leagues) && game.leagues[0] && game.leagues[0].leagueId) ||
    ""
  );
  const card = dashboardGameCardAttrs_(game, "--compact-game-image");

  return `
    <article class="dashboard-compact-game${card.className}" ${card.attrs} style="${card.style}">
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
  const card = dashboardGameCardAttrs_(game, "--dashboard-past-game-image");
  return `
    <article class="dashboard-past-compact dashboard-colored-game-card${card.className}" ${card.attrs} style="${card.style}">
      <div class="dashboard-colored-game-copy">
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

  dashboardApplyHubAppearance_();
  dashboardMountStickyPlayer_();

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

  const statValues = {
    games: values[0],
    wins: values[1],
    top3: values[2],
    avg: values[3],
    accuracy: values[4]
  };
  document.querySelectorAll("[data-career-stat]").forEach(function(node) {
    const key = node.getAttribute("data-career-stat");
    if (Object.prototype.hasOwnProperty.call(statValues, key)) {
      node.textContent = statValues[key];
    }
  });

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
  const card = dashboardLeagueCardAppearance_(league, game);
  const leagueId = String(league.leagueId || league.LeagueId || "");
  const leagueSetting = card.setting || {};
  const leagueDisplayName = String(leagueSetting.DisplayName || league.leagueName || league.leagueId || "League");
  const leagueIcon = leagueId ? dashboardHubIconHtml_("league", leagueId, "dashboard-league-card-icon") : "";

  return `
    <article id="dashboardLeagueStanding-${index}" class="dashboard-league-home-card${card.className}" ${card.attrs} style="${card.style}">
      <div class="dashboard-league-home-topline">
        <div class="dashboard-league-title-wrap">
          ${leagueIcon ? `<span class="dashboard-league-card-icon-wrap">${leagueIcon}</span>` : ""}
          <span class="dashboard-league-title-copy">
            <strong>${escapeHtml(leagueDisplayName)}</strong>
            <span>${escapeHtml(league.role || "member")}</span>
          </span>
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
