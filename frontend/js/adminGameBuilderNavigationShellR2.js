/* PATTC Shared Game Builder Navigation Shell R2 + Orchestration R3B
 * R2 lifecycle/navigation remains intact. R3B only orchestrates authoritative Draft game creation.
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
      series: "Series",
      tournaments: "Tournaments",
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
          <div class="admin-sub">
            New game creation is not available here yet. Use the existing Playoff Race configuration instead.
          </div>
          <div class="admin-actions" style="margin-top:10px">
            <button type="button" class="button admin-button" onclick="pattcAdminGameBuilderR3BOpenPlayoffRace_()">Open Playoff Race Configuration</button>
          </div>
        </div>
      `;
    }

    const type = DEDICATED_GAME_TYPES_R3B[choice] || "";
    if (!type && choice !== "other") return "";
    const label = shellChoiceLabel_(choice);
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
      </form>
    `;
  }

  function showBuilderR3B_(choice) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return false;
    const host = shell.querySelector("[data-admin-r3b-builder-host]");
    if (!host) return false;
    host.innerHTML = builderFormHtmlR3B_(choice);
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

    let type = DEDICATED_GAME_TYPES_R3B[String(choice || "")] || "";
    if (choice === "other") {
      type = readFormValueR3B_(form, "gameType");
      if (OTHER_GAME_TYPES_R3B.indexOf(type) === -1) {
        throw new Error("Unsupported Other Game type.");
      }
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
      if (!response || response.success !== true) {
        throw new Error(response && response.message ? response.message : "Game creation failed.");
      }

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

  window.pattcAdminGameBuilderR2Select_ = function (choice, kind) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return;

    const label = shellChoiceLabel_(choice);
    const message = shell.querySelector("[data-admin-r2-selection-message]");
    if (message) {
      const prefix = kind === "competition"
        ? "Competition shell selected"
        : kind === "season-data"
          ? "League / Season Data selected"
          : "Game Builder selected";
      message.textContent = prefix + ": " + label + ". Existing authoritative managers and APIs remain in control.";
    }

    shell.querySelectorAll("[data-admin-r2-shell-choice]").forEach(function (control) {
      if (control.tagName === "SELECT") {
        control.value = String(choice);
      } else {
        control.setAttribute("aria-pressed", control.getAttribute("data-admin-r2-shell-choice") === String(choice) ? "true" : "false");
      }
    });

    if (kind === "builder") showBuilderR3B_(choice);
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

  function shellHtml_() {
    return `
      <div ${MOUNTED_ATTR}="1" data-admin-sports-organization-r2="1">
        <style>
          [${MOUNTED_ATTR}="1"] .admin-r2-lifecycle-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:12px; align-items:start; }
          [${MOUNTED_ATTR}="1"] .admin-r2-destination { border:1px solid rgba(148,163,184,.32); border-radius:14px; padding:14px; min-width:0; }
          [${MOUNTED_ATTR}="1"] .admin-r2-destination h3, [${MOUNTED_ATTR}="1"] .admin-r3b-builder-card h4 { margin:0 0 6px; }
          [${MOUNTED_ATTR}="1"] .admin-r2-choice-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; align-items:center; }
          [${MOUNTED_ATTR}="1"] .admin-r2-selector { display:grid; gap:6px; margin-top:10px; }
          [${MOUNTED_ATTR}="1"] .admin-r2-selector select { width:100%; min-height:38px; }
          [${MOUNTED_ATTR}="1"] [data-admin-r2-shell-choice][aria-pressed="true"] { outline:2px solid currentColor; outline-offset:2px; }
          [${MOUNTED_ATTR}="1"] .admin-r2-rule { margin-top:12px; padding:10px 12px; border-radius:10px; background:rgba(148,163,184,.10); }
          [${MOUNTED_ATTR}="1"] .admin-r3b-workspace { margin-top:12px; border:1px solid rgba(148,163,184,.32); border-radius:14px; padding:14px; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-builder-card { margin:0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-top:10px; align-items:end; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-form-grid label { display:grid; gap:4px; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-type-note { align-self:end; padding:8px 0; }
          [${MOUNTED_ATTR}="1"] .admin-r3b-workspace-actions { margin-top:12px; display:flex; flex-wrap:wrap; gap:8px; }
          [${MOUNTED_ATTR}="1"] .admin-r2-secondary-links { display:grid; gap:8px; margin-top:12px; }
          @media (max-width:720px) {
            [${MOUNTED_ATTR}="1"] .admin-r2-lifecycle-grid { grid-template-columns:1fr; }
          }
        </style>

        <div class="admin-sub"><strong>Admin → Games &amp; Design → Sports → NFL → 2026</strong></div>
        <div class="admin-sub">One lifecycle, five destinations. Builders create Draft games. Managers edit. Engines support. Scope defines context. Competitions combine existing games.</div>

        <div class="admin-r2-lifecycle-grid">
          <section class="admin-r2-destination" data-admin-r2-destination="game-builder">
            <h3>1. Game Builder</h3>
            <div class="admin-sub">Choose what you want to create. The selected builder opens in the workspace below.</div>
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
            <h3>2. Manage Existing Games</h3>
            <div class="admin-sub">Edit ordinary existing game records and game-specific settings. Manage Games keeps its existing New Game capability.</div>
            <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-games')">Manage Existing Games</button></div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="competitions">
            <h3>3. Competitions</h3>
            <div class="admin-sub">Combine or organize existing authoritative Game IDs. Competitions do not duplicate the underlying games.</div>
            <div class="admin-actions">
              <button type="button" class="button admin-button" onclick="navigate('admin-nfl-cup')">Cups</button>
              <button type="button" class="button admin-button secondary" data-admin-r2-shell-choice="series" aria-pressed="false" onclick="pattcAdminGameBuilderR2Select_('series','competition')">Series</button>
              <button type="button" class="button admin-button secondary" data-admin-r2-shell-choice="tournaments" aria-pressed="false" onclick="pattcAdminGameBuilderR2Select_('tournaments','competition')">Tournaments</button>
            </div>
            <div class="admin-sub">NFL Cup keeps its dedicated page. Series and Tournaments remain visual destinations only.</div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="league-season-data">
            <h3>4. League / Season Data</h3>
            <div class="admin-sub">Shared NFL season context used by games and competitions. Existing Sports data tooling remains authoritative.</div>
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
              <button type="button" class="button admin-button secondary" onclick="navigate('admin-nfl-season-setup')">NFL Sports Pack Setup</button>
            </div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="operations">
            <h3>5. Operations</h3>
            <div class="admin-sub">Operate the shared Sports Engine. Engine controls stay separate from ordinary Manage Games.</div>
            <div class="admin-actions"><button type="button" class="button admin-button" onclick="navigate('admin-sports-engine')">Sports Engine Controls</button></div>
          </section>
        </div>

        <section class="admin-r3b-workspace" data-admin-r3b-builder-host>
          <div class="admin-sub"><strong>Game Builder Workspace</strong></div>
          <div class="admin-sub">Choose a game type above to create a Draft game or open the existing Playoff Race configuration.</div>
        </section>

        <div class="admin-message" data-admin-r2-selection-message>Select a Game Builder, Competition, or League / Season Data destination.</div>

        <div class="admin-r2-rule admin-sub"><strong>Preserved R3 boundaries:</strong> NFL Cup stays dedicated; NFL Sports Pack stays outside ordinary Manage Games; Playoff Race configuration stays dedicated; Sports Engine Controls stays dedicated; Team Fantasy keeps its manager.</div>

        <div class="admin-list" style="margin-top:12px">
          <div class="admin-list-row"><div><strong>Reality</strong><div class="admin-sub">Show/season managers such as The Traitors and DWTS remain in the existing Reality TV Manager.</div></div></div>
          <div class="admin-list-row"><div><strong>Awards</strong><div class="admin-sub">Ceremonies such as Oscars and Emmys remain in the existing Awards Manager.</div></div></div>
        </div>
      </div>
    `;
  }

  function mountShell_() {
    const host = document.querySelector(SHELL_SELECTOR);
    if (!host || host.getAttribute(MOUNTED_ATTR) === "1") return false;
    host.innerHTML = shellHtml_();
    host.setAttribute(MOUNTED_ATTR, "1");
    return true;
  }

  window.PATTC_ADMIN_OTHER_GAME_TYPES_R3B = OTHER_GAME_TYPES_R3B.slice();
  window.pattcAdminGameBuilderNavigationShellR2Mount = mountShell_;
})();