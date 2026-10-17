/* =====================================================
   AWARDS ADAPTATION R7 — ADMIN LIFECYCLE SHELL
   Ordinary PATTC game creation only. Awards Manager remains
   authoritative for questions, nominees, event/market mappings,
   result review, settlement preparation, and external sources.
===================================================== */

(function adminAwardsLifecycleR7Bootstrap_() {
  "use strict";

  const ADMIN_AWARDS_R7_TYPES = Object.freeze([
    "prediction",
    "confidence",
    "staked-prediction",
    "wager",
    "ranking",
    "mixed"
  ]);

  let createInFlight = false;
  let observer = null;

  function text_(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function escape_(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function value_(id) {
    const node = document.getElementById(id);
    return node ? text_(node.value) : "";
  }

  function typeOptions_() {
    const labels = {
      prediction: "Prediction",
      confidence: "Confidence",
      "staked-prediction": "Staked Prediction",
      wager: "Wager / Chips",
      ranking: "Ranking",
      mixed: "Hybrid"
    };

    return ADMIN_AWARDS_R7_TYPES.map(function(type) {
      return '<option value="' + escape_(type) + '"' +
        (type === "prediction" ? " selected" : "") + '>' +
        escape_(labels[type] || type) + "</option>";
    }).join("");
  }

  function buildCreatePayload_(input) {
    input = input || {};
    const type = text_(input.type || "prediction").toLowerCase();

    if (ADMIN_AWARDS_R7_TYPES.indexOf(type) === -1) {
      throw new Error("Choose a supported Awards play type.");
    }

    return {
      name: text_(input.name),
      gameId: text_(input.gameId),
      year: text_(input.year),
      type: type,
      active: false,
      archived: false,
      defaultGame: false,
      status: "Draft",
      lockAllPicks: true
    };
  }

  function setMessage_(message, isError) {
    const node = document.getElementById("adminAwardsR7Message");
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("error", !!isError);
    node.classList.toggle("success", !isError && !!message);
  }

  function lifecycleHtml_() {
    return `
      <div class="admin-category-card" data-admin-awards-adaptation-r7="1" style="margin-top:12px;">
        <div class="admin-sub"><strong>Admin → Games &amp; Design → Awards</strong></div>
        <div class="admin-sub">Create a normal PATTC game here, then use the existing Awards Manager to add Awards questions and explicit event/market result sources.</div>

        <div class="admin-list" style="margin-top:10px;">
          <div class="admin-list-row" style="display:block;">
            <div><strong>1. Game Builder</strong><div class="admin-sub">Creates a locked, inactive Draft game. No ceremony identity is stored on the Games row.</div></div>
            <div class="admin-form-grid" style="margin-top:10px;">
              <label>Game Name<input id="adminAwardsR7GameName" class="input admin-input" placeholder="2027 Oscars Pool"></label>
              <label>Game ID<input id="adminAwardsR7GameId" class="input admin-input" placeholder="oscars-2027"></label>
              <label>Year<input id="adminAwardsR7Year" class="input admin-input" inputmode="numeric" placeholder="2027"></label>
              <label>Play Type<select id="adminAwardsR7Type" class="input admin-input">${typeOptions_()}</select></label>
            </div>
            <div class="admin-actions" style="margin-top:10px;">
              <button id="adminAwardsR7CreateButton" type="button" class="button admin-button" onclick="adminAwardsR7CreateGame()">Create Awards Game</button>
            </div>
            <div id="adminAwardsR7Message" class="admin-message"></div>
          </div>

          <div class="admin-list-row">
            <div><strong>2. Manage Existing Games</strong><div class="admin-sub">Use ordinary Games administration for drafts, publishing, setup, cloning, and archive controls.</div></div>
            <button type="button" class="admin-small-button secondary" onclick="navigate('admin-games')">Manage Existing</button>
          </div>

          <div class="admin-list-row">
            <div><strong>3. Awards Manager</strong><div class="admin-sub">Authoritative Awards workflow for external event discovery, categories/questions, answers, sources, and event/market mappings.</div></div>
            <button type="button" class="admin-small-button secondary" onclick="navigate('admin-awards')">Open Awards Manager</button>
          </div>

          <div class="admin-list-row">
            <div><strong>4. Results / Operations</strong><div class="admin-sub">External result preparation and review remain in the existing Awards Manager and shared results infrastructure; R7 adds no settlement or scoring surface.</div></div>
            <button type="button" class="admin-small-button secondary" onclick="navigate('admin-awards')">Open Awards Results Workflow</button>
          </div>
        </div>
      </div>`;
  }

  function inject_() {
    if (!document || !document.querySelector) return false;
    if (document.querySelector('[data-admin-awards-adaptation-r7="1"]')) return true;

    const sportsCard = document.querySelector('.admin-page [data-admin-games-design-r1="1"]');
    if (!sportsCard || typeof sportsCard.insertAdjacentHTML !== "function") return false;

    sportsCard.insertAdjacentHTML("afterend", lifecycleHtml_());
    return true;
  }

  async function verifyGameIdAvailable_(gameId) {
    if (typeof window.apiAdminGetGames !== "function") {
      throw new Error("Games availability check is unavailable. No game was created.");
    }

    const result = await window.apiAdminGetGames();
    if (!result || result.success === false) {
      throw new Error(
        result && (result.error || result.message)
          ? result.error || result.message
          : "Could not verify the Game ID. No game was created."
      );
    }

    const wanted = text_(gameId).toLowerCase();
    const duplicate = (Array.isArray(result.games) ? result.games : []).some(function(game) {
      return text_(game && (game.gameId || game.id)).toLowerCase() === wanted;
    });

    return !duplicate;
  }

  async function createGame_() {
    if (createInFlight) {
      setMessage_("Creation is already in progress.", true);
      return { success: false, blocked: true, duplicateSubmit: true };
    }

    let payload = null;
    try {
      payload = buildCreatePayload_({
        name: value_("adminAwardsR7GameName"),
        gameId: value_("adminAwardsR7GameId"),
        year: value_("adminAwardsR7Year"),
        type: value_("adminAwardsR7Type") || "prediction"
      });
    } catch (error) {
      setMessage_(error && error.message ? error.message : String(error), true);
      return { success: false, validationError: true };
    }

    if (!payload.name || !payload.gameId || !payload.year) {
      setMessage_("Game Name, Game ID, and Year are required.", true);
      return { success: false, validationError: true };
    }

    if (typeof window.apiAdminCreateGame !== "function") {
      setMessage_("Game creation is unavailable. No game was created.", true);
      return { success: false, unavailable: true };
    }

    const button = document.getElementById("adminAwardsR7CreateButton");
    createInFlight = true;
    if (button) button.disabled = true;
    setMessage_("Checking Game ID and creating draft game…", false);

    try {
      const available = await verifyGameIdAvailable_(payload.gameId);
      if (!available) {
        setMessage_("Game ID already exists. Choose a different Game ID; nothing was created or changed.", true);
        return { success: false, duplicate: true, gameId: payload.gameId };
      }

      const result = await window.apiAdminCreateGame(payload);
      if (!result || result.success === false) {
        setMessage_(
          result && (result.error || result.message)
            ? result.error || result.message
            : "Could not create game. No success was recorded.",
          true
        );
        return result || { success: false };
      }

      if (result.duplicate === true) {
        setMessage_("Game ID already exists. Choose a different Game ID; nothing was created or changed.", true);
        return Object.assign({}, result, { success: false });
      }

      const createdGameId = text_(result.gameId || payload.gameId);
      setMessage_(
        "Created " + payload.name + " (" + createdGameId + "). Open Awards Manager to add categories and event sources.",
        false
      );

      if (typeof window.navigate === "function") {
        await window.navigate("admin-awards");
      }

      return result;
    } catch (error) {
      setMessage_(error && error.message ? error.message : "Could not create game.", true);
      return { success: false, error: error && error.message ? error.message : String(error) };
    } finally {
      createInFlight = false;
      if (button) button.disabled = false;
    }
  }

  function install_() {
    inject_();
    if (!observer && document.body && typeof MutationObserver === "function") {
      observer = new MutationObserver(function() { inject_(); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.ADMIN_AWARDS_R7_TYPES = ADMIN_AWARDS_R7_TYPES.slice();
  window.adminAwardsR7BuildCreatePayload_ = buildCreatePayload_;
  window.adminAwardsR7Inject_ = inject_;
  window.adminAwardsR7CreateGame = createGame_;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install_);
  } else {
    install_();
  }
})();
