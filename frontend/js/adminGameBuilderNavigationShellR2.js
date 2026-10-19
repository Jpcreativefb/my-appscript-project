/* PATTC Shared Game Builder Navigation Shell R2 + Orchestration R3B + Competition Builder R5 + General / Custom R8 R2
 * Builders create authoritative Draft games. Managers edit. Engines support. Scope defines context.
 * R5 competitions only orchestrate proven authoritative competition surfaces; they never create shadow Games.
 * R8 R2 adds a General / Custom entry point using only the existing generic creator and canonical types.
 * R3 organizes Games & Design with the existing Manage Games native details/summary accordion pattern.
 */
(function () {
  "use strict";

  const SHELL_SELECTOR = '[data-admin-games-design-r1="1"]';
  const MOUNTED_ATTR = "data-shared-game-builder-navigation-shell-r2";
  const OTHER_GAME_TYPES_R3B = Object.freeze([
    "prediction",
    "head-to-head",
    "staked-prediction",
    "wager",
    "racing-wager",
    "mixed",
    "voting",
    "ranking"
  ]);
  const OTHER_GAME_TYPE_LABELS_R3B = Object.freeze({
    prediction: "Prediction",
    "head-to-head": "Head-to-Head",
    "staked-prediction": "Staked Prediction",
    wager: "Wager",
    "racing-wager": "Racing Wager",
    mixed: "Mixed",
    voting: "Voting",
    ranking: "Ranking"
  });
  const DEDICATED_GAME_TYPES_R3B = Object.freeze({
    confidence: "confidence",
    survivor: "survivor",
    "team-fantasy": "team-fantasy"
  });
  const OTHER_GAME_PRODUCT_BUILDERS_R3 = Object.freeze({
    cookoff: Object.freeze({ label: "Cookoff", type: "voting" }),
    "movie-ranking": Object.freeze({ label: "Movie Ranking / Community Awards", type: "ranking" }),
    voting: Object.freeze({ label: "Voting / Competition", type: "voting" }),
    ranking: Object.freeze({ label: "Ranking", type: "ranking" })
  });

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shellChoiceLabel_(choice) {
    const labels = {
      confidence: "Confidence",
      survivor: "Survivor",
      "team-fantasy": "Team Fantasy",
      "playoff-forecast": "Playoff / Forecast",
      other: "Other Game",
      cup: "Cup",
      series: "Series",
      tournament: "Tournament",
      teams: "Teams",
      schedule: "Schedule",
      scores: "Scores",
      standings: "Standings",
      odds: "Odds",
      "season-timing": "Season Timing"
    };
    return labels[String(choice || "")] || String(choice || "");
  }

  function otherTypeOptionsR3B_() {
    return OTHER_GAME_TYPES_R3B.map(function (type) {
      const label = OTHER_GAME_TYPE_LABELS_R3B[type] || type;
      return `<option value="${escapeHtml_(type)}">${escapeHtml_(label)}</option>`;
    }).join("");
  }

  function builderFormHtmlR3B_(choice) {
    choice = String(choice || "");
    if (choice === "playoff-forecast") {
      return `
        <div class="admin-r3b-builder-card" data-admin-r3b-builder="playoff-forecast">
          <h4>Selected Builder — Playoff / Forecast</h4>
          <div class="admin-sub">New game creation is not available here yet. Use the existing Playoff Race configuration instead.</div>
          <div class="admin-actions" style="margin-top:10px">
            <button type="button" class="button admin-button" onclick="pattcAdminGameBuilderR3BOpenPlayoffRace_()">Open Playoff Race Configuration</button>
          </div>
        </div>`;
    }

    const productBuilder = OTHER_GAME_PRODUCT_BUILDERS_R3[choice] || null;
    const type = productBuilder ? productBuilder.type : (DEDICATED_GAME_TYPES_R3B[choice] || "");
    if (!type && choice !== "other") return "";
    const label = productBuilder ? productBuilder.label : shellChoiceLabel_(choice);
    const typeControl = choice === "other"
      ? `<label>Game Type<select name="gameType" required>${otherTypeOptionsR3B_()}</select></label>`
      : `<div class="admin-r3b-type-note">Game type: <code>${escapeHtml_(type)}</code></div>`;
    const existingManagerAction = choice === "team-fantasy"
      ? `<button type="button" class="button admin-button secondary" onclick="navigate('admin-team-fantasy')">Open Existing Team Fantasy Manager</button>`
      : "";

    return `
      <form class="admin-r3b-builder-card" data-admin-r3b-builder="${escapeHtml_(choice)}"
        onsubmit="pattcAdminGameBuilderR3BSubmit_(event,'${escapeHtml_(choice)}'); return false;">
        <h4>Selected Builder — ${escapeHtml_(label)}</h4>
        <div class="admin-sub">Create the authoritative Draft game here. Further setup stays on the existing manager.</div>
        <div class="admin-r3b-form-grid">
          <label>Game Name<input name="gameName" type="text" required autocomplete="off"></label>
          <label>Game ID<input name="gameId" type="text" required autocomplete="off"></label>
          <label>Year<input name="year" type="number" min="2000" max="2100" step="1" required></label>
          ${typeControl}
        </div>
        <div class="admin-actions admin-r3b-workspace-actions">
          <button type="submit" class="button admin-button" data-admin-r3b-submit>Create Draft Game</button>
          ${existingManagerAction}
        </div>
        <div class="admin-message" data-admin-r3b-status aria-live="polite"></div>
      </form>`;
  }

  function generalCustomWorkspaceHtmlR8R2_() {
    return `
      <section class="admin-r8r2-general-custom" data-admin-general-custom-r8-r2="1">
        <div class="admin-sub"><strong>General / Custom Game Builder</strong></div>
        <div class="admin-sub">Create an ordinary PATTC Draft game with the existing generic creator and canonical game types. Existing managers remain authoritative after creation.</div>
        <div class="admin-r8r2-general-grid">
          <section class="admin-r2-destination" data-admin-r8r2-destination="game-builder">
            <h3>Game Builder</h3>
            ${builderFormHtmlR3B_("other")}
          </section>
          <section class="admin-r2-destination" data-admin-r8r2-destination="manage-existing-games">
            <h3>Manage Existing Games</h3>
            <div class="admin-sub">Open the existing Manage Games surface for authoritative editing and lifecycle controls.</div>
            <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-games')">Manage Existing Games</button></div>
          </section>
        </div>
        <div class="admin-r2-rule admin-sub"><strong>Canonical General / Custom types:</strong> prediction · head-to-head · staked-prediction · wager · racing-wager · mixed · voting · ranking.</div>
      </section>`;
  }

  function competitionWorkspaceHtmlR5_(choice) {
    choice = String(choice || "cup");
    if (choice === "cup") {
      return `
        <div class="admin-r5-competition-card" data-admin-r5-competition="cup">
          <h4>Selected Competition — Cup</h4>
          <div class="admin-sub">Cup groups existing authoritative games. Configuration remains owned by the existing NFL Cup Control Center.</div>
          <div class="admin-actions admin-r3b-workspace-actions">
            <button type="button" class="button admin-button" onclick="navigate('admin-nfl-cup')">Open NFL Cup Control Center</button>
          </div>
        </div>`;
    }
    if (choice === "series") {
      return `
        <div class="admin-r5-competition-card" data-admin-r5-competition="series">
          <h4>Selected Competition — Series</h4>
          <div class="admin-sub">Series combines existing authoritative games.</div>
          <div class="admin-sub"><strong>Competition creation is not available yet.</strong> This shell does not create Games rows or persist a Series container.</div>
        </div>`;
    }
    if (choice === "tournament") {
      return `
        <div class="admin-r5-competition-card" data-admin-r5-competition="tournament">
          <h4>Selected Competition — Tournament</h4>
          <div class="admin-sub">Tournament combines existing authoritative games.</div>
          <div class="admin-sub"><strong>Competition creation is not available yet.</strong> This shell does not create Games rows or persist a Tournament container.</div>
        </div>`;
    }
    return "";
  }

  function showBuilderR3B_(choice) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return false;
    const host = shell.querySelector("[data-admin-r3b-builder-host]");
    if (!host) return false;
    host.innerHTML = builderFormHtmlR3B_(choice);
    return true;
  }

  function showOtherGameBuilderR3_(choice) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return false;
    const host = shell.querySelector("[data-admin-other-game-builder-host]");
    if (!host) return false;

    if (choice === "general-custom") {
      host.innerHTML = generalCustomWorkspaceHtmlR8R2_();
    } else if (OTHER_GAME_PRODUCT_BUILDERS_R3[choice]) {
      host.innerHTML = builderFormHtmlR3B_(choice);
    } else {
      return false;
    }

    if (typeof host.scrollIntoView === "function") {
      host.scrollIntoView({ block: "nearest" });
    }
    return true;
  }

  function showCompetitionR5_(choice) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return false;
    const host = shell.querySelector("[data-admin-r5-competition-host]");
    if (!host) return false;
    host.innerHTML = competitionWorkspaceHtmlR5_(choice);
    return true;
  }

  function readFormValueR3B_(form, name) {
    const field = form && form.elements ? form.elements[name] : null;
    return String(field && field.value != null ? field.value : "").trim();
  }

  function setStatusR3B_(form, message, state) {
    const status = form && typeof form.querySelector === "function"
      ? form.querySelector("[data-admin-r3b-status]")
      : null;
    if (!status) return;
    status.textContent = String(message || "");
    status.setAttribute("data-state", String(state || ""));
  }

  function setSubmittingR3B_(form, submitting) {
    if (!form) return;
    if (!form.dataset) form.dataset = {};
    form.dataset.adminR3bCreateInFlight = submitting ? "1" : "0";
    const button = typeof form.querySelector === "function"
      ? form.querySelector("[data-admin-r3b-submit]")
      : null;
    if (button) button.disabled = Boolean(submitting);
  }

  function createPayloadR3B_(form, choice) {
    const name = readFormValueR3B_(form, "gameName");
    const gameId = readFormValueR3B_(form, "gameId");
    const yearText = readFormValueR3B_(form, "year");
    const year = Number(yearText);
    if (!name) throw new Error("Game Name is required.");
    if (!gameId) throw new Error("Game ID is required.");
    if (!/^\d{4}$/.test(yearText) || !Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error("Year must be a four-digit year.");
    }

    const productBuilder = OTHER_GAME_PRODUCT_BUILDERS_R3[String(choice || "")] || null;
    let type = productBuilder ? productBuilder.type : (DEDICATED_GAME_TYPES_R3B[String(choice || "")] || "");
    if (choice === "other") {
      type = readFormValueR3B_(form, "gameType");
      if (OTHER_GAME_TYPES_R3B.indexOf(type) === -1) throw new Error("Unsupported Other Game type.");
    }
    if (!type) throw new Error("This builder does not create games.");

    return {
      name: name,
      gameId: gameId,
      year: year,
      type: type,
      active: false,
      archived: false,
      defaultGame: false,
      status: "Draft",
      lockAllPicks: true
    };
  }

  function openCreatedGameR3B_(choice, gameId) {
    if (choice === "team-fantasy") {
      if (typeof setFrontendGameId !== "function") throw new Error("Team Fantasy game selection is unavailable.");
      setFrontendGameId(gameId);
      navigate("admin-team-fantasy");
      return;
    }
    navigate("admin-game-setup:" + gameId);
  }

  window.pattcAdminGameBuilderR3BSubmit_ = async function (event, choice) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    const form = event && (event.currentTarget || event.target);
    if (!form) return false;
    if (form.dataset && form.dataset.adminR3bCreateInFlight === "1") return false;

    let payload;
    try {
      payload = createPayloadR3B_(form, String(choice || ""));
    } catch (err) {
      setStatusR3B_(form, err && err.message ? err.message : "Game creation validation failed.", "error");
      return false;
    }

    setSubmittingR3B_(form, true);
    setStatusR3B_(form, "Creating Draft game…", "working");
    try {
      if (typeof apiAdminCreateGame !== "function") throw new Error("Authoritative game creation API is unavailable.");
      const response = await apiAdminCreateGame(payload);
      if (!response || response.success !== true) throw new Error(response && response.message ? response.message : "Game creation failed.");

      const duplicate = Boolean(response.result && response.result.duplicate === true);
      setStatusR3B_(form,
        duplicate ? "Game ID already exists. Opening the existing game." : "Draft game created. Opening its authoritative manager.",
        duplicate ? "existing" : "success");
      openCreatedGameR3B_(String(choice || ""), payload.gameId);
      return true;
    } catch (err) {
      setStatusR3B_(form, err && err.message ? err.message : "Game creation failed.", "error");
      return false;
    } finally {
      setSubmittingR3B_(form, false);
    }
  };

  window.pattcAdminGameBuilderR3BOpenPlayoffRace_ = function () {
    navigate("admin-playoff-race");
  };

  window.pattcAdminOtherGameBuilderR3Select_ = function (choice) {
    return showOtherGameBuilderR3_(String(choice || ""));
  };

  window.pattcAdminGameBuilderR2Select_ = function (choice, kind) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return;

    const label = shellChoiceLabel_(choice);
    const message = shell.querySelector("[data-admin-r2-selection-message]");
    if (message) {
      const prefix = kind === "competition"
        ? "Competition selected"
        : kind === "season-data"
          ? "League / Season Data selected"
          : "Game Builder selected";
      message.textContent = prefix + ": " + label + ". Existing authoritative managers and APIs remain in control.";
    }

    shell.querySelectorAll("[data-admin-r2-shell-choice]").forEach(function (control) {
      if (control.tagName !== "SELECT") return;
      const controlKind = control.getAttribute ? control.getAttribute("data-admin-r2-shell-choice") : "";
      if ((kind === "builder" && controlKind === "game-builder") ||
          (kind === "competition" && controlKind === "competition") ||
          (kind === "season-data" && controlKind === "season-data")) {
        control.value = String(choice);
      }
    });

    if (kind === "builder") showBuilderR3B_(choice);
    if (kind === "competition") showCompetitionR5_(choice);
  };

  window.pattcAdminGameBuilderR3BBuilderSelect_ = function (select) {
    const choice = String(select && select.value || "");
    if (!choice) return false;
    window.pattcAdminGameBuilderR2Select_(choice, "builder");
    return true;
  };

  window.pattcAdminGameBuilderR3BSeasonSelect_ = function (select) {
    const choice = String(select && select.value || "");
    if (!choice) return false;
    window.pattcAdminGameBuilderR2Select_(choice, "season-data");
    return true;
  };

  window.pattcAdminCompetitionR5Select_ = function (select) {
    const choice = String(select && select.value || "cup");
    window.pattcAdminGameBuilderR2Select_(choice, "competition");
    return true;
  };

  function sectionHtml_(key, title, subtitle, body) {
    return `
      <details class="card admin-card admin-collapsible-card admin-games-design-section" data-admin-games-design-section="${escapeHtml_(key)}">
        <summary class="admin-card-summary">
          <div><h2>${escapeHtml_(title)}</h2><div class="admin-sub">${subtitle}</div></div>
          <span class="admin-collapse-icon">▾</span>
        </summary>
        <div class="admin-collapsible-body">${body}</div>
      </details>`;
  }

  function sportsHtml_() {
    const nfl2026 = `
      <details class="card admin-card admin-collapsible-card admin-games-design-nested" data-admin-sports-level="season">
        <summary class="admin-card-summary"><div><h3>2026</h3><div class="admin-sub">Current NFL season administration.</div></div><span class="admin-collapse-icon">▾</span></summary>
        <div class="admin-collapsible-body">
          <div class="admin-r2-lifecycle-grid">
            <section class="admin-r2-destination" data-admin-r2-destination="game-builder">
              <h3>Game Builder</h3>
              <div class="admin-sub">Create Draft games with the existing authoritative creator, or open the dedicated Playoff / Forecast controls.</div>
              <label class="admin-r2-selector">Game Type
                <select data-admin-r2-shell-choice="game-builder" onchange="pattcAdminGameBuilderR3BBuilderSelect_(this)">
                  <option value="">Choose a game type…</option>
                  <option value="confidence">Confidence</option>
                  <option value="survivor">Survivor</option>
                  <option value="team-fantasy">Team Fantasy</option>
                  <option value="playoff-forecast">Playoff / Forecast</option>
                  <option value="other">Other Game</option>
                </select>
              </label>
            </section>

            <section class="admin-r2-destination" data-admin-r2-destination="manage-existing-games">
              <h3>Manage Existing Games</h3>
              <div class="admin-sub">Existing generic Sports Manage Games authority.</div>
              <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-games')">Manage Existing Games</button></div>
            </section>

            <section class="admin-r2-destination" data-admin-r2-destination="competitions">
              <h3>Competitions</h3>
              <label class="admin-r2-selector">Competition Type
                <select data-admin-r2-shell-choice="competition" onchange="pattcAdminCompetitionR5Select_(this)">
                  <option value="cup" selected>Cups</option>
                  <option value="series">Series</option>
                  <option value="tournament">Tournaments</option>
                </select>
              </label>
              <div class="admin-actions" style="margin-top:8px"><button type="button" class="button admin-button secondary" onclick="navigate('admin-nfl-cup')">NFL Cup Control Center</button></div>
            </section>

            <section class="admin-r2-destination" data-admin-r2-destination="league-season-data">
              <h3>League / Season Data</h3>
              <div class="admin-sub">Teams, Schedule, Scores, Standings, Odds, and Season Timing continue to use the existing Sports/NFL data authorities.</div>
              <label class="admin-r2-selector">Season Data Tool
                <select data-admin-r2-shell-choice="season-data" onchange="pattcAdminGameBuilderR3BSeasonSelect_(this)">
                  <option value="">Choose a season data tool…</option>
                  <option value="teams">Teams</option>
                  <option value="schedule">Schedule</option>
                  <option value="scores">Scores</option>
                  <option value="standings">Standings</option>
                  <option value="odds">Odds</option>
                  <option value="season-timing">Season Timing</option>
                </select>
              </label>
              <div class="admin-r2-secondary-links">
                <button type="button" class="button admin-button secondary" onclick="window.location.href='./sports.html'">Sports Scores &amp; Game Builder</button>
                <button type="button" class="button admin-button secondary" onclick="navigate('admin-nfl-season-setup')">NFL Season Setup</button>
              </div>
            </section>

            <section class="admin-r2-destination" data-admin-r2-destination="operations">
              <h3>Operations</h3>
              <div class="admin-sub">Sports Engine Controls remain a separate Admin destination.</div>
              <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-sports-engine')">Sports Engine Controls</button></div>
            </section>
          </div>

          <section class="admin-r3b-workspace" data-admin-r3b-builder-host>
            <div class="admin-sub"><strong>Game Builder Workspace</strong></div>
            <div class="admin-sub">Choose a game type above to create a Draft game or open the existing Playoff Race configuration.</div>
          </section>
          <section class="admin-r5-competition-workspace" data-admin-r5-competition-host>${competitionWorkspaceHtmlR5_("cup")}</section>
          <div class="admin-message" data-admin-r2-selection-message>Select a Game Builder, Competition, or League / Season Data destination.</div>
        </div>
      </details>`;

    const nfl = `
      <details class="card admin-card admin-collapsible-card admin-games-design-nested" data-admin-sports-level="league-name">
        <summary class="admin-card-summary"><div><h3>NFL</h3><div class="admin-sub">National Football League.</div></div><span class="admin-collapse-icon">▾</span></summary>
        <div class="admin-collapsible-body">${nfl2026}</div>
      </details>`;

    return `
      <div class="admin-sub"><strong>Admin → Games &amp; Design → Sports → League → NFL → 2026</strong></div>
      <details class="card admin-card admin-collapsible-card admin-games-design-nested" data-admin-sports-level="league">
        <summary class="admin-card-summary"><div><h3>League</h3><div class="admin-sub">Expandable league organization. NFL is the current configured league.</div></div><span class="admin-collapse-icon">▾</span></summary>
        <div class="admin-collapsible-body">${nfl}</div>
      </details>`;
  }

  function realityHtml_() {
    return `
      <div class="admin-r3-section-grid">
        <section class="admin-r2-destination">
          <h3>Reality TV Manager</h3>
          <div class="admin-sub">Open the existing authoritative show/season manager. Existing configured shows, including The Traitors and DWTS where present, remain owned there.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-reality-tv')">Open Reality TV Manager</button></div>
        </section>
      </div>`;
  }

  function awardsHtml_() {
    return `
      <div class="admin-r3-section-grid">
        <section class="admin-r2-destination">
          <h3>Awards Game Builder</h3>
          <div class="admin-sub">Awards creation stays on the existing Awards authority rather than being permanently expanded on this hub.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-awards')">Open Awards Game Builder</button></div>
        </section>
        <section class="admin-r2-destination">
          <h3>Awards Manager</h3>
          <div class="admin-sub">Manage existing ceremonies/events such as Oscars and Emmys with the existing Awards manager.</div>
          <div class="admin-actions"><button type="button" class="button admin-button secondary" onclick="navigate('admin-awards')">Open Awards Manager</button></div>
        </section>
      </div>`;
  }

  function otherGamesHtml_() {
    return `
      <div class="admin-sub"><strong>CREATE / BUILD</strong></div>
      <div class="admin-r3-section-grid" data-admin-other-games-r3="1">
        <section class="admin-r2-destination" data-admin-other-game="cookoff">
          <h3>Cookoff</h3>
          <div class="admin-sub">Create a Cookoff Draft game using the existing game creator. Voting / Competition remains the underlying authoritative game type.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" data-admin-no-progress="true" onclick="pattcAdminOtherGameBuilderR3Select_('cookoff')">Build Cookoff</button></div>
        </section>
        <section class="admin-r2-destination" data-admin-other-game="movie-ranking">
          <h3>Movie Ranking / Community Awards</h3>
          <div class="admin-sub">Create a Movie Ranking / Community Awards Draft game using the existing Ranking authority.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" data-admin-no-progress="true" onclick="pattcAdminOtherGameBuilderR3Select_('movie-ranking')">Build Movie Ranking / Community Awards</button></div>
        </section>
        <section class="admin-r2-destination" data-admin-other-game="voting">
          <h3>Voting / Competition</h3>
          <div class="admin-sub">Create a Draft game with the existing canonical Voting / Competition game type.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" data-admin-no-progress="true" onclick="pattcAdminOtherGameBuilderR3Select_('voting')">Build Voting / Competition</button></div>
        </section>
        <section class="admin-r2-destination" data-admin-other-game="ranking">
          <h3>Ranking</h3>
          <div class="admin-sub">Create a Draft game with the existing canonical Ranking game type.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" data-admin-no-progress="true" onclick="pattcAdminOtherGameBuilderR3Select_('ranking')">Build Ranking</button></div>
        </section>
        <section class="admin-r2-destination" data-admin-other-game="general-custom">
          <h3>General / Custom</h3>
          <div class="admin-sub">Choose from the existing eight canonical General / Custom game types.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" data-admin-no-progress="true" onclick="pattcAdminOtherGameBuilderR3Select_('general-custom')">Open General / Custom Game Builder</button></div>
        </section>
      </div>

      <section class="admin-r3b-workspace" data-admin-other-game-builder-host>
        <div class="admin-sub"><strong>Other Games Builder Workspace</strong></div>
        <div class="admin-sub">Choose a Create / Build option above. Draft creation uses the existing authoritative game creator and setup flow.</div>
      </section>

      <div class="admin-sub" style="margin-top:12px"><strong>MANAGE</strong></div>
      <div class="admin-r3-section-grid">
        <section class="admin-r2-destination" data-admin-other-game="manage-existing">
          <h3>Manage Existing Games</h3>
          <div class="admin-sub">Edit games that already exist with the existing general Manage Games authority.</div>
          <div class="admin-actions"><button type="button" class="button admin-button secondary" onclick="navigate('admin-games')">Manage Existing Games</button></div>
        </section>
      </div>`;
  }

  function predictionMarketsHtml_() {
    return `
      <div class="admin-r3-section-grid">
        <section class="admin-r2-destination">
          <h3>Prediction Market Manager / Admin</h3>
          <div class="admin-sub">Dedicated market administration remains separate from General / Custom.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-prediction-markets')">Open Prediction Market Admin</button></div>
        </section>
        <section class="admin-r2-destination">
          <h3>Player Market Access</h3>
          <div class="admin-sub">Open the existing player-facing market surface, which includes the accepted portfolio and leaderboard experience.</div>
          <div class="admin-actions">
            <button type="button" class="button admin-button secondary" onclick="navigate('prediction-markets')">Open Markets / Portfolio</button>
            <button type="button" class="button admin-button secondary" onclick="navigate('leaderboard')">Open Leaderboard</button>
          </div>
        </section>
      </div>`;
  }

  function appearanceHtml_() {
    return `
      <div class="admin-r3-section-grid">
        <section class="admin-r2-destination">
          <h3>Appearance Manager / Visual Design</h3>
          <div class="admin-sub">Colors, icons, labels, navigation appearance, branding, layout, spacing, sizing, and positioning stay in the existing Appearance authority.</div>
          <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-appearance')">Open Appearance / Visual Design</button></div>
        </section>
      </div>`;
  }

  function shellHtml_() {
    return `
      <div ${MOUNTED_ATTR}="1" data-admin-sports-organization-r2="1" data-admin-competition-builder-r5="1" data-admin-general-custom-r8-r2-shell="1" data-admin-games-design-organization-r3="1">
        <style>
          [${MOUNTED_ATTR}="1"] { min-width:0; max-width:100%; overflow-wrap:anywhere; }
          [${MOUNTED_ATTR}="1"] .admin-games-design-section,
          [${MOUNTED_ATTR}="1"] .admin-games-design-nested { min-width:0; max-width:100%; }
          [${MOUNTED_ATTR}="1"] .admin-games-design-section + .admin-games-design-section { margin-top:12px; }
          [${MOUNTED_ATTR}="1"] .admin-games-design-nested { margin-top:10px; }
          [${MOUNTED_ATTR}="1"] .admin-card-summary { min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-card-summary > div { min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r2-lifecycle-grid,
          [${MOUNTED_ATTR}="1"] .admin-r8r2-general-grid,
          [${MOUNTED_ATTR}="1"] .admin-r3-section-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr)); gap:12px; margin-top:12px; align-items:start; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r2-destination { border:1px solid rgba(148,163,184,.32); border-radius:14px; padding:14px; min-width:0; max-width:100%; }
          [${MOUNTED_ATTR}="1"] .admin-r2-destination h3,
          [${MOUNTED_ATTR}="1"] .admin-r3b-builder-card h4,
          [${MOUNTED_ATTR}="1"] .admin-r5-competition-card h4 { margin:0 0 6px; }
          [${MOUNTED_ATTR}="1"] .admin-r2-selector { display:grid; gap:6px; margin-top:10px; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r2-selector select,
          [${MOUNTED_ATTR}="1"] input,
          [${MOUNTED_ATTR}="1"] select { width:100%; max-width:100%; min-width:0; min-height:38px; box-sizing:border-box; }
          [${MOUNTED_ATTR}="1"] .admin-r2-rule { margin-top:12px; padding:10px 12px; border-radius:10px; background:rgba(148,163,184,.10); }
          [${MOUNTED_ATTR}="1"] .admin-r3b-workspace,
          [${MOUNTED_ATTR}="1"] .admin-r5-competition-workspace,
          [${MOUNTED_ATTR}="1"] .admin-r8r2-general-custom { margin-top:12px; border:1px solid rgba(148,163,184,.32); border-radius:14px; padding:14px; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-builder-card { margin:0; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr)); gap:10px; margin-top:10px; align-items:end; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-form-grid label { display:grid; gap:4px; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-type-note { align-self:end; padding:8px 0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-workspace-actions,
          [${MOUNTED_ATTR}="1"] .admin-actions { flex-wrap:wrap; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r2-secondary-links { display:grid; gap:8px; margin-top:12px; min-width:0; }
          [${MOUNTED_ATTR}="1"] button { max-width:100%; white-space:normal; overflow-wrap:anywhere; }
          [${MOUNTED_ATTR}="1"] .admin-r8r2-general-grid [data-admin-r8r2-destination="game-builder"] { grid-column:1 / -1; }
          @media (max-width:720px) {
            [${MOUNTED_ATTR}="1"] .admin-r2-lifecycle-grid,
            [${MOUNTED_ATTR}="1"] .admin-r8r2-general-grid,
            [${MOUNTED_ATTR}="1"] .admin-r3-section-grid { grid-template-columns:minmax(0,1fr); }
            [${MOUNTED_ATTR}="1"] .admin-r2-destination,
            [${MOUNTED_ATTR}="1"] .admin-r3b-workspace,
            [${MOUNTED_ATTR}="1"] .admin-r5-competition-workspace,
            [${MOUNTED_ATTR}="1"] .admin-r8r2-general-custom { padding:12px; }
          }
        </style>

        <div class="admin-sub"><strong>Admin → Games &amp; Design</strong></div>
        <div class="admin-sub">Choose a product area. Each section reuses the existing Manage Games native collapsible pattern and opens the existing authoritative manager or route.</div>

        ${sectionHtml_("sports", "Sports", "League and season administration, game creation, competitions, data, and operations.", sportsHtml_())}
        ${sectionHtml_("reality-tv", "Reality TV", "Shows and seasons use the existing Reality TV Manager.", realityHtml_())}
        ${sectionHtml_("awards", "Awards", "Awards builders and ceremony/event management remain on the existing Awards authority.", awardsHtml_())}
        ${sectionHtml_("other-games", "Other Games", "Cookoff, Movie Ranking / Community Awards, generic Voting, Ranking, and General / Custom.", otherGamesHtml_())}
        ${sectionHtml_("prediction-markets", "Prediction Markets", "Dedicated market administration, player markets, portfolio, and leaderboard.", predictionMarketsHtml_())}
        ${sectionHtml_("appearance", "Appearance / Visual Design", "Visual presentation stays in the existing Appearance authority.", appearanceHtml_())}
      </div>`;
  }

  function mountShell_() {
    const host = document.querySelector(SHELL_SELECTOR);
    if (!host) return false;

    const body = host.closest ? host.closest(".admin-collapsible-body") : null;
    const mountTarget = body || host;
    if (mountTarget.querySelector && mountTarget.querySelector("[" + MOUNTED_ATTR + '="1"]')) return false;

    mountTarget.innerHTML = shellHtml_();
    mountTarget.setAttribute(MOUNTED_ATTR, "1");
    return true;
  }

  window.PATTC_ADMIN_OTHER_GAME_TYPES_R3B = OTHER_GAME_TYPES_R3B.slice();
  window.PATTC_ADMIN_GENERAL_CUSTOM_TYPES_R8_R2 = OTHER_GAME_TYPES_R3B.slice();
  window.pattcAdminGameBuilderNavigationShellR2Mount = mountShell_;
})();