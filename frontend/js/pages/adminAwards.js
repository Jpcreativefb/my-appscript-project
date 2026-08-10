
/* =====================================================
   AWARDS MANAGER — Admin Page v1.2.12
===================================================== */

const AWARDS_MANAGER_STATE = {
  dashboard: null,
  results: [],
  selectedMarket: null,
  targetSetup: null,
  mode: ""
};

function awardsAdminEsc_(value) {
  if (typeof escapeHtml_ === "function") return escapeHtml_(String(value || ""));
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function awardsAdminPct_(value) {
  const n = Number(value);
  return isFinite(n) ? n.toFixed(1) + "%" : "—";
}
function awardsAdminGameOptions_(selected) {
  const games = (AWARDS_MANAGER_STATE.dashboard && AWARDS_MANAGER_STATE.dashboard.games) || [];
  return `<option value="">Choose game…</option>` + games.map(function(game) {
    const id = String(game.gameId || game.id || "");
    const name = game.name || id;
    const suffix = game.archived === true ? " — archived" : game.active === false ? " — inactive" : "";
    return `<option value="${awardsAdminEsc_(id)}" ${id === selected ? "selected" : ""}>${awardsAdminEsc_(name)} (${awardsAdminEsc_(id)})${suffix}</option>`;
  }).join("");
}

async function renderAdminAwardsPage() {
  const session = getSession();
  if (!isAdminSession(session)) {
    return `<div class="page admin-page"><h1>Awards Manager</h1><div class="card error-card">Administrator access required.</div></div>`;
  }

  setPageLoadStep(55, "Loading Awards Manager…");
  const dashboard = await apiAdminAwardsGetDashboard();
  if (!dashboard || dashboard.success === false) {
    return `<div class="page admin-page"><h1>Awards Manager</h1><div class="card error-card">${awardsAdminEsc_((dashboard && (dashboard.error || dashboard.message)) || "Could not load Awards Manager.")}</div></div>`;
  }

  AWARDS_MANAGER_STATE.dashboard = dashboard;
  AWARDS_MANAGER_STATE.results = [];
  AWARDS_MANAGER_STATE.selectedMarket = null;
  AWARDS_MANAGER_STATE.targetSetup = null;
  AWARDS_MANAGER_STATE.mode = "";

  return `
    <div class="page admin-page awards-manager-page">
      <div class="admin-page-header">
        <div>
          <p class="dashboard-kicker dark">Awards Manager v${awardsAdminEsc_(dashboard.version || "1.2.12")}</p>
          <h1>Awards & External Markets</h1>
          <div class="admin-sub">
            Search Kalshi and Polymarket live, create or link Awards App questions,
            and send only selected markets into the External Results Hub.
          </div>
        </div>
        <div class="admin-header-actions">
          <button class="admin-small-button secondary" onclick="navigate('admin')">Back to Admin</button>
        </div>
      </div>

      <div class="admin-section">
        <div class="card admin-card">
          <h2>1. Search Live Providers</h2>
          <div class="admin-sub">
            Searches the provider now. Results do not have to exist in ExternalMarkets first.
          </div>

          <div class="admin-control-grid" style="margin-top:12px;">
            <label class="admin-field">
              <span>Provider</span>
              <select id="awardsProvider">
                <option value="both">Kalshi + Polymarket</option>
                <option value="kalshi">Kalshi</option>
                <option value="polymarket">Polymarket</option>
              </select>
            </label>

            <label class="admin-field" style="grid-column:span 2;">
              <span>Find market or event</span>
              <input id="awardsSearchQuery" type="text"
                placeholder="Best Picture, Oscars, Survivor, World Cup…"
                onkeydown="if(event.key==='Enter'){adminAwardsSearch(this.closest('.card').querySelector('button'))}">
            </label>
          </div>

          <div class="admin-actions">
            <button class="button admin-button" onclick="adminAwardsSearch(this)">Search Providers</button>
          </div>

          <div id="awardsSearchStatus" class="admin-message"></div>
          <div id="awardsSearchResults" class="admin-list"></div>
        </div>

        <div class="card admin-card">
          <h2>2. Build or Link the Question</h2>
          <div id="awardsSelectedMarket" class="admin-sub">Choose a provider market above.</div>
          <div id="awardsTargetBuilder"></div>
        </div>

        <div class="card admin-card">
          <h2>3. Result Safety</h2>
          <div class="admin-list">
            <div class="admin-list-row">
              <div><b>Live market source</b><div class="admin-sub">Kalshi / Polymarket probability.</div></div>
              <span class="admin-pill">Read only</span>
            </div>
            <div class="admin-list-row">
              <div><b>External Results Hub</b><div class="admin-sub">Stores selected markets, mappings, watch state, reviews, and audit history.</div></div>
              <span class="admin-pill">${dashboard.hubConfigured ? "Connected" : "Setup needed"}</span>
            </div>
            <div class="admin-list-row">
              <div><b>Final scoring result</b><div class="admin-sub">Still requires administrator review.</div></div>
              <span class="admin-pill">Auto-settle OFF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function adminAwardsSearch(button) {
  const queryNode = document.getElementById("awardsSearchQuery");
  const providerNode = document.getElementById("awardsProvider");
  const status = document.getElementById("awardsSearchStatus");
  const resultsNode = document.getElementById("awardsSearchResults");
  if (!queryNode || !providerNode || !status || !resultsNode) return;

  const query = String(queryNode.value || "").trim();
  if (query.length < 2) {
    status.className = "admin-message warning";
    status.textContent = "Enter at least 2 characters.";
    return;
  }

  if (button) button.disabled = true;
  status.className = "admin-message";
  status.textContent = "Searching live providers…";
  resultsNode.innerHTML = "";

  try {
    const res = await apiAdminAwardsSearchExternalMarkets(providerNode.value, query);
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Search failed.");

    AWARDS_MANAGER_STATE.results = Array.isArray(res.results) ? res.results : [];
    const errors = Array.isArray(res.errors) ? res.errors : [];
    status.className = "admin-message " + (errors.length ? "warning" : "success");
    status.textContent = AWARDS_MANAGER_STATE.results.length +
      " live market" + (AWARDS_MANAGER_STATE.results.length === 1 ? "" : "s") +
      " found." + (errors.length ? " " + errors.join(" · ") : "");

    resultsNode.innerHTML = AWARDS_MANAGER_STATE.results.length
      ? AWARDS_MANAGER_STATE.results.map(function(market, index) {
          const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
          const priceText = outcomes.slice(0, 4).map(function(outcome) {
            const pct = market.prices && market.prices[outcome] !== undefined
              ? awardsAdminPct_(market.prices[outcome])
              : "—";
            return awardsAdminEsc_(outcome) + " " + pct;
          }).join(" · ");

          return `
            <div class="admin-category-card">
              <div class="admin-category-header">
                <div>
                  <strong>${awardsAdminEsc_(market.marketQuestion || market.eventName || market.externalMarketId)}</strong>
                  <div class="admin-sub">${awardsAdminEsc_(market.provider)} · ${awardsAdminEsc_(market.eventName || market.externalEventId)}</div>
                  <div class="admin-sub">${priceText || "Probability unavailable"}</div>
                  ${market.closeTime ? `<div class="admin-sub">Closes: ${awardsAdminEsc_(market.closeTime)}</div>` : ""}
                </div>
                <span class="admin-pill">${awardsAdminEsc_(market.status || "open")}</span>
              </div>
              <div class="admin-actions">
                <button class="admin-small-button" onclick="adminAwardsChooseMarket(${index}, 'create')">Create Question</button>
                <button class="admin-small-button secondary" onclick="adminAwardsChooseMarket(${index}, 'link')">Link Existing</button>
              </div>
            </div>
          `;
        }).join("")
      : `<div class="admin-sub">No matching live markets found. Try a broader term or the other provider.</div>`;
  } catch (err) {
    status.className = "admin-message error";
    status.textContent = err && err.message ? err.message : String(err);
  } finally {
    if (button) button.disabled = false;
  }
}

function adminAwardsChooseMarket(index, mode) {
  const market = AWARDS_MANAGER_STATE.results[index];
  if (!market) return;

  AWARDS_MANAGER_STATE.selectedMarket = market;
  AWARDS_MANAGER_STATE.mode = mode;
  AWARDS_MANAGER_STATE.targetSetup = null;

  const summary = document.getElementById("awardsSelectedMarket");
  if (summary) {
    summary.innerHTML = `
      <b>${awardsAdminEsc_(market.provider)}</b> ·
      ${awardsAdminEsc_(market.marketQuestion || market.externalMarketId)}
      <div class="admin-sub">${awardsAdminEsc_(market.externalMarketId)}</div>
    `;
  }

  const builder = document.getElementById("awardsTargetBuilder");
  if (!builder) return;

  if (mode === "create") {
    builder.innerHTML = `
      <div class="admin-control-grid" style="margin-top:12px;">
        <label class="admin-field">
          <span>Awards App Game</span>
          <select id="awardsCreateGame">${awardsAdminGameOptions_("")}</select>
        </label>
        <label class="admin-field" style="grid-column:span 2;">
          <span>Question</span>
          <input id="awardsCreateQuestion" type="text" value="${awardsAdminEsc_(market.marketQuestion || "")}">
        </label>
        <label class="admin-field">
          <span>Section</span>
          <input id="awardsCreateSection" type="text" value="Awards">
        </label>
        <label class="admin-field">
          <span>Points</span>
          <input id="awardsCreatePoints" type="number" min="0" value="1">
        </label>
      </div>
      <div class="admin-sub" style="margin-top:10px;">
        Answers created from provider outcomes:
        ${(market.outcomes || []).map(awardsAdminEsc_).join(", ")}
      </div>
      <div class="admin-actions">
        <button class="button admin-button" onclick="adminAwardsCreateFromMarket(this)">Create & Link Question</button>
      </div>
      <div id="awardsBuilderStatus" class="admin-message"></div>
    `;
    return;
  }

  builder.innerHTML = `
    <div class="admin-control-grid" style="margin-top:12px;">
      <label class="admin-field">
        <span>Awards App Game</span>
        <select id="awardsLinkGame" onchange="adminAwardsLoadGameQuestions(this.value)">
          ${awardsAdminGameOptions_("")}
        </select>
      </label>
      <label class="admin-field">
        <span>Question</span>
        <select id="awardsLinkQuestion" onchange="adminAwardsRenderOutcomeMap()">
          <option value="">Choose game first…</option>
        </select>
      </label>
    </div>
    <div id="awardsOutcomeMap"></div>
    <div class="admin-actions">
      <button class="button admin-button" onclick="adminAwardsLinkMarket(this)">Save Link</button>
    </div>
    <div id="awardsBuilderStatus" class="admin-message"></div>
  `;
}

async function adminAwardsLoadGameQuestions(gameId) {
  const questionNode = document.getElementById("awardsLinkQuestion");
  const mapNode = document.getElementById("awardsOutcomeMap");
  if (!questionNode || !mapNode) return;

  questionNode.innerHTML = `<option value="">Loading questions…</option>`;
  mapNode.innerHTML = "";

  if (!gameId) {
    questionNode.innerHTML = `<option value="">Choose game first…</option>`;
    return;
  }

  try {
    const res = await apiAdminAwardsGetGameSetup(gameId);
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not load questions.");

    AWARDS_MANAGER_STATE.targetSetup = res;
    const categories = Array.isArray(res.categories) ? res.categories : [];
    questionNode.innerHTML = `<option value="">Choose question…</option>` +
      categories.map(function(category) {
        return `<option value="${awardsAdminEsc_(category.categoryId)}">${awardsAdminEsc_(category.category || category.name || category.categoryId)}</option>`;
      }).join("");
  } catch (err) {
    questionNode.innerHTML = `<option value="">Could not load questions</option>`;
    const status = document.getElementById("awardsBuilderStatus");
    if (status) {
      status.className = "admin-message error";
      status.textContent = err.message || String(err);
    }
  }
}

function adminAwardsRenderOutcomeMap() {
  const categoryId = String((document.getElementById("awardsLinkQuestion") || {}).value || "");
  const mapNode = document.getElementById("awardsOutcomeMap");
  const market = AWARDS_MANAGER_STATE.selectedMarket;
  const setup = AWARDS_MANAGER_STATE.targetSetup;
  if (!mapNode || !market || !setup || !categoryId) {
    if (mapNode) mapNode.innerHTML = "";
    return;
  }

  const category = (setup.categories || []).find(function(item) {
    return String(item.categoryId || "") === categoryId;
  });
  if (!category) return;

  const nominees = Array.isArray(category.nominees) ? category.nominees : [];
  mapNode.innerHTML = `
    <h3 style="margin-top:14px;">Map provider outcomes to answers</h3>
    <div class="admin-control-grid">
      ${(market.outcomes || []).map(function(outcome, index) {
        return `
          <label class="admin-field">
            <span>${awardsAdminEsc_(outcome)}</span>
            <select id="awardsOutcome-${index}" data-outcome="${awardsAdminEsc_(outcome)}">
              <option value="">Do not map</option>
              ${nominees.map(function(nominee) {
                return `<option value="${awardsAdminEsc_(nominee.nomineeId)}">${awardsAdminEsc_(nominee.nominee || nominee.name || nominee.shortAnswer || nominee.nomineeId)}</option>`;
              }).join("")}
            </select>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

async function adminAwardsCreateFromMarket(button) {
  const market = AWARDS_MANAGER_STATE.selectedMarket;
  const gameId = String((document.getElementById("awardsCreateGame") || {}).value || "");
  const question = String((document.getElementById("awardsCreateQuestion") || {}).value || "").trim();
  const section = String((document.getElementById("awardsCreateSection") || {}).value || "Awards").trim();
  const points = Number((document.getElementById("awardsCreatePoints") || {}).value || 1);
  const status = document.getElementById("awardsBuilderStatus");

  if (!market || !gameId || !question) {
    if (status) {
      status.className = "admin-message warning";
      status.textContent = "Choose a game and enter the question text.";
    }
    return;
  }

  if (button) button.disabled = true;
  if (status) {
    status.className = "admin-message";
    status.textContent = "Creating question and queuing Hub mapping…";
  }

  try {
    const res = await apiAdminAwardsCreateQuestionFromMarket({
      gameId: gameId,
      question: question,
      section: section,
      points: points,
      marketJSON: JSON.stringify(market)
    });
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not create question.");

    if (status) {
      status.className = "admin-message success";
      status.textContent = res.message || "Question created and linked.";
    }
  } catch (err) {
    if (status) {
      status.className = "admin-message error";
      status.textContent = err.message || String(err);
    }
  } finally {
    if (button) button.disabled = false;
  }
}

async function adminAwardsLinkMarket(button) {
  const market = AWARDS_MANAGER_STATE.selectedMarket;
  const gameId = String((document.getElementById("awardsLinkGame") || {}).value || "");
  const categoryId = String((document.getElementById("awardsLinkQuestion") || {}).value || "");
  const status = document.getElementById("awardsBuilderStatus");

  if (!market || !gameId || !categoryId) {
    if (status) {
      status.className = "admin-message warning";
      status.textContent = "Choose the game and question.";
    }
    return;
  }

  const outcomeMap = {};
  document.querySelectorAll("#awardsOutcomeMap select[data-outcome]").forEach(function(select) {
    if (select.value) outcomeMap[select.dataset.outcome] = select.value;
  });

  if (!Object.keys(outcomeMap).length) {
    if (status) {
      status.className = "admin-message warning";
      status.textContent = "Map at least one provider outcome to an Awards App answer.";
    }
    return;
  }

  if (button) button.disabled = true;
  if (status) {
    status.className = "admin-message";
    status.textContent = "Saving mapping to the Hub bridge…";
  }

  try {
    const res = await apiAdminAwardsLinkMarket({
      gameId: gameId,
      categoryId: categoryId,
      outcomeMapJSON: JSON.stringify(outcomeMap),
      marketJSON: JSON.stringify(market)
    });
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not save mapping.");

    if (status) {
      status.className = "admin-message success";
      status.textContent = res.message || "Provider market linked.";
    }
  } catch (err) {
    if (status) {
      status.className = "admin-message error";
      status.textContent = err.message || String(err);
    }
  } finally {
    if (button) button.disabled = false;
  }
}
