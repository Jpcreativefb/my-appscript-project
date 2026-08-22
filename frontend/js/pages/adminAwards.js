
/* =====================================================
   AWARDS MANAGER — Admin Page v1.2.15
===================================================== */

const AWARDS_MANAGER_STATE = {
  dashboard: null,
  results: [],
  events: [],
  selectedEvent: null,
  eventMarkets: [],
  selectedMarket: null,
  targetSetup: null,
  mode: "",
  searchState: {},
  hasMore: false,
  lastSearch: null,
  selectedEventKeys: {},
  batchGameId: "",
  eventDetailsByKey: {},
  batchRows: [],
  marketModalRowIndex: -1,
  eventDraftsByKey: {},
  dragRowIndex: -1
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
function awardsAdminCanonicalGameType_(game) {
  const raw = String(game && (game.type || game.gameType) || "prediction").trim().toLowerCase();
  if (raw === "hybrid" || raw === "combo") return "mixed";
  return raw || "prediction";
}
function awardsAdminGameTypeLabel_(game) {
  const type = awardsAdminCanonicalGameType_(game);
  const labels = {
    prediction: "Prediction",
    "head-to-head": "Head-to-Head",
    confidence: "Confidence",
    "staked-prediction": "Staked",
    wager: "Wager",
    "racing-wager": "Racing Wager",
    mixed: "Hybrid",
    ranking: "Ranking",
    survivor: "Survivor"
  };
  return labels[type] || type;
}
function awardsAdminGameById_(gameId) {
  const key = String(gameId || "").trim().toLowerCase();
  const games = (AWARDS_MANAGER_STATE.dashboard && AWARDS_MANAGER_STATE.dashboard.games) || [];
  return games.find(function(game) {
    return String(game.gameId || game.id || "").trim().toLowerCase() === key;
  }) || null;
}
function awardsAdminDefaultScoreModeForGame_(gameId) {
  const type = awardsAdminCanonicalGameType_(awardsAdminGameById_(gameId));
  if (type === "confidence") return "confidence-points";
  if (type === "staked-prediction") return "staked-points";
  if (type === "wager" || type === "racing-wager") return "wager";
  if (type === "ranking") return "ranking";
  return "fixed-points";
}
function awardsAdminProviderBadge_(provider) {
  const key = String(provider || "").trim().toLowerCase();
  return key === "kalshi" ? "K" : key === "polymarket" ? "P" : "M";
}
function awardsAdminGameOptions_(selected) {
  const games = (AWARDS_MANAGER_STATE.dashboard && AWARDS_MANAGER_STATE.dashboard.games) || [];
  return `<option value="">Choose game…</option>` + games.map(function(game) {
    const id = String(game.gameId || game.id || "");
    const name = game.name || id;
    const suffix = game.archived === true ? " — archived" : game.active === false ? " — inactive" : "";
    const typeLabel = awardsAdminGameTypeLabel_(game);
    return `<option value="${awardsAdminEsc_(id)}" ${id === selected ? "selected" : ""}>${awardsAdminEsc_(name)} · ${awardsAdminEsc_(typeLabel)}${suffix}</option>`;
  }).join("");
}
function awardsAdminScoreModeOptions_(selected) {
  const value = String(selected || "auto");
  const rows = [
    ["auto", "Follow Game Type"],
    ["fixed-points", "Standard Pick / Fixed Points"],
    ["confidence-points", "Confidence Points"],
    ["staked-points", "Staked Prediction"],
    ["wager", "Wager / Chips"],
    ["ranking", "Ranking (engine still in development)"]
  ];
  return rows.map(function(row) {
    return `<option value="${row[0]}" ${value === row[0] ? "selected" : ""}>${row[1]}</option>`;
  }).join("");
}
function awardsAdminQuestionTypeOptions_(selected) {
  const value = String(selected || "category-winner");
  const rows = [
    ["category-winner", "Winner / Category"],
    ["yes-no", "Yes / No"],
    ["head-to-head", "Head-to-Head"],
    ["over-under", "Over / Under"],
    ["tiebreaker", "Tiebreaker"],
    ["ranking", "Ranking"]
  ];
  return rows.map(function(row) {
    return `<option value="${row[0]}" ${value === row[0] ? "selected" : ""}>${row[1]}</option>`;
  }).join("");
}
function awardsAdminPickChangeOptions_(selected) {
  const value = String(selected === undefined || selected === null || selected === "" ? -1 : selected);
  const rows = [["-1", "Unlimited until lock"], ["0", "No changes"], ["1", "1 change"], ["2", "2 changes"], ["3", "3 changes"], ["5", "5 changes"]];
  return rows.map(function(row) {
    return `<option value="${row[0]}" ${value === row[0] ? "selected" : ""}>${row[1]}</option>`;
  }).join("");
}

function awardsAdminLayoutOptions_(selected) {
  const value = String(selected || "image").toLowerCase();
  const rows = [
    ["text", "Text"],
    ["compact", "Compact"],
    ["image", "Image"]
  ];
  return rows.map(function(row) {
    return `<option value="${row[0]}" ${value === row[0] ? "selected" : ""}>${row[1]}</option>`;
  }).join("");
}

function awardsAdminProbabilityOptions_(selected, includeDefault) {
  const value = String(selected === undefined || selected === null || selected === "" ? (includeDefault ? "default" : "show") : selected);
  const rows = includeDefault
    ? [["default", "Use Game Setting"], ["show", "Show"], ["hide", "Hide"]]
    : [["show", "Show"], ["hide", "Hide"]];
  return rows.map(function(row) {
    return `<option value="${row[0]}" ${value === row[0] ? "selected" : ""}>${row[1]}</option>`;
  }).join("");
}


function awardsAdminRelatedMarkets_(market) {
  if (!market) return [];

  const provider = String(market.provider || "").toLowerCase();
  const eventId = String(market.externalEventId || "").toLowerCase();

  if (!provider || !eventId) {
    return [{
      market: market,
      index: AWARDS_MANAGER_STATE.results.indexOf(market)
    }];
  }

  return (AWARDS_MANAGER_STATE.results || [])
    .map(function(item, index) {
      return {
        market: item,
        index: index
      };
    })
    .filter(function(entry) {
      return (
        String(entry.market.provider || "").toLowerCase() === provider &&
        String(entry.market.externalEventId || "").toLowerCase() === eventId
      );
    });
}

function awardsAdminGroupedAnswerLabel_(market) {
  market = market || {};
  const raw = market.raw || {};

  const explicit = String(
    raw.yes_sub_title ||
    raw.yesTitle ||
    raw.yes_title ||
    raw.outcomeLabel ||
    raw.answerLabel ||
    ""
  ).trim();

  if (explicit) return explicit;

  const question = String(
    market.marketQuestion ||
    market.eventName ||
    market.externalMarketId ||
    ""
  ).trim();

  const match = question.match(
    /^Will\s+(.+?)\s+(?:win|be|become|receive|take|finish|lead|earn)\b/i
  );

  return match && match[1]
    ? String(match[1]).trim()
    : question;
}

function awardsAdminRenderCreateAnswersPreview_() {
  const preview = document.getElementById("awardsCreateAnswersPreview");
  const groupToggle = document.getElementById("awardsCreateGrouped");
  const market = AWARDS_MANAGER_STATE.selectedMarket;

  if (!preview || !market) return;

  const related = awardsAdminRelatedMarkets_(market);
  const grouped = !!(
    groupToggle &&
    groupToggle.checked &&
    related.length >= 2
  );

  if (!grouped) {
    preview.innerHTML = `
      <div class="admin-sub">
        Answers created from provider outcomes:
        ${(market.outcomes || []).map(awardsAdminEsc_).join(", ")}
      </div>
    `;
    return;
  }

  preview.innerHTML = `
    <div class="admin-sub" style="margin-bottom:8px;">
      One PATTC Predicts question will be created with one answer per selected provider market.
      Edit any answer name before saving.
    </div>

    <div class="admin-list">
      ${related.map(function(entry, groupIndex) {
        const item = entry.market;
        const label = awardsAdminGroupedAnswerLabel_(item);
        const yesValue = item.prices && item.prices.Yes !== undefined
          ? item.prices.Yes
          : item.primaryProbability;

        return `
          <div class="admin-list-row" style="align-items:flex-start;">
            <label style="display:flex;gap:8px;align-items:center;min-width:34px;">
              <input
                type="checkbox"
                class="awards-group-market-use"
                data-result-index="${entry.index}"
                checked
              >
            </label>

            <div style="flex:1;min-width:0;">
              <div class="admin-sub">
                ${awardsAdminEsc_(item.marketQuestion || item.externalMarketId)}
              </div>

              <label class="admin-field" style="margin-top:6px;">
                <span>Answer ${groupIndex + 1}</span>
                <input
                  type="text"
                  class="awards-group-answer-label"
                  data-result-index="${entry.index}"
                  value="${awardsAdminEsc_(label)}"
                >
              </label>
            </div>

            <span class="admin-pill">
              ${awardsAdminPct_(yesValue)}
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
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
  AWARDS_MANAGER_STATE.events = [];
  AWARDS_MANAGER_STATE.selectedEvent = null;
  AWARDS_MANAGER_STATE.eventMarkets = [];
  AWARDS_MANAGER_STATE.selectedMarket = null;
  AWARDS_MANAGER_STATE.targetSetup = null;
  AWARDS_MANAGER_STATE.mode = "";
  AWARDS_MANAGER_STATE.searchState = {};
  AWARDS_MANAGER_STATE.hasMore = false;
  AWARDS_MANAGER_STATE.lastSearch = null;
  AWARDS_MANAGER_STATE.selectedEventKeys = {};
  AWARDS_MANAGER_STATE.batchGameId = "";
  AWARDS_MANAGER_STATE.eventDetailsByKey = {};
  AWARDS_MANAGER_STATE.batchRows = [];
  AWARDS_MANAGER_STATE.marketModalRowIndex = -1;
  AWARDS_MANAGER_STATE.eventDraftsByKey = {};
  AWARDS_MANAGER_STATE.dragRowIndex = -1;

  return `
    <div class="page admin-page awards-manager-page">
      <div class="admin-page-header">
        <div>
          <p class="dashboard-kicker dark">Awards Manager v${awardsAdminEsc_(dashboard.version || "1.2.16")}</p>
          <h1>Awards & External Markets</h1>
          <div class="admin-sub">
            Pick the game once, select the events and answers you want, configure the question grid, then build the batch.
          </div>
        </div>
        <div class="admin-header-actions">
          <button class="admin-small-button secondary" onclick="navigate('admin')">Back to Admin</button>
        </div>
      </div>

      <div class="admin-section awards-manager-sections">
        <details id="awardsSection1" class="card admin-card admin-collapsible-card awards-manager-section" open>
          <summary class="admin-card-summary awards-section-summary">
            <div>
              <h2>1. Game & Default Settings</h2>
              <div class="admin-sub">Choose the destination game and the defaults that new Awards questions will inherit. You can override any question later.</div>
            </div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body awards-section-body">
            <div class="awards-section-help">
              <strong>What this section does:</strong>
              Pick the PATTC Predicts game once. Set the official results site, player display style, market-odds visibility, pick-change rule, points, section, and starting order. These defaults are copied into every event you load.
            </div>

            <div class="admin-control-grid">
              <label class="admin-field">
                <span>PATTC Predicts Game</span>
                <select id="awardsBatchGame" onchange="adminAwardsSyncBatchModeForGame_(this.value)">
                  ${awardsAdminGameOptions_("")}
                </select>
                <span id="awardsBatchGameTypeNote" class="admin-sub">Choose a game to set its play type.</span>
              </label>

              <label class="admin-field">
                <span>Default Play Type</span>
                <select id="awardsBatchScoreMode">${awardsAdminScoreModeOptions_("auto")}</select>
                <span id="awardsBatchScoreModeNote" class="admin-sub">Prediction, Confidence, Staked, and Wager games control this automatically. Hybrid games may mix play types by question.</span>
              </label>

              <label class="admin-field awards-field-wide">
                <span>Official Website URL</span>
                <div class="awards-inline-input-action">
                  <input id="awardsOfficialSourceUrl" type="url" placeholder="https://www.emmys.com/awards/nominees-winners">
                  <button type="button" class="admin-small-button secondary" onclick="adminAwardsOpenOfficialSource()">Open Official Site</button>
                </div>
                <span class="admin-sub">Preferred human result/reference source. Kalshi/Polymarket remain attached for market data.</span>
              </label>

              <label class="admin-field">
                <span>Question Display</span>
                <select id="awardsBatchLayoutType">${awardsAdminLayoutOptions_("image")}</select>
                <span class="admin-sub">Text = names only. Compact = small image/list cards. Image = larger answer cards.</span>
              </label>

              <label class="admin-field">
                <span>Show Market Odds to Players</span>
                <select id="awardsBatchShowProbabilities">${awardsAdminProbabilityOptions_("show", false)}</select>
                <span class="admin-sub">Turns K/P percentages on or off by default. Market data is still stored when hidden.</span>
              </label>

              <label class="admin-field">
                <span>Pick Changes</span>
                <select id="awardsBatchMaxChanges">${awardsAdminPickChangeOptions_(-1)}</select>
                <span class="admin-sub">Unlimited until lock is recommended for most Awards games.</span>
              </label>

              <label class="admin-field">
                <span>Default Section</span>
                <input id="awardsBatchSection" type="text" value="Awards">
                <span class="admin-sub">Example: Drama, Comedy, Acting, Main Awards.</span>
              </label>

              <label class="admin-field">
                <span>Default Points</span>
                <input id="awardsBatchPoints" type="number" min="0" value="1">
              </label>

              <label class="admin-field">
                <span>First Question Order</span>
                <input id="awardsBatchStartOrder" type="number" min="0" value="10">
                <span class="admin-sub">Questions are spaced by 10 so you can insert others later.</span>
              </label>
            </div>

            <div class="admin-actions">
              <button type="button" class="admin-small-button secondary" onclick="adminAwardsApplyDefaultsToLoaded_()">Apply These Defaults to Loaded Questions</button>
            </div>
          </div>
        </details>

        <details id="awardsSection2" class="card admin-card admin-collapsible-card awards-manager-section" open>
          <summary class="admin-card-summary awards-section-summary">
            <div>
              <h2>2. Find & Choose Events</h2>
              <div class="admin-sub">Search K/P events, check the ones you want, optionally inspect/edit an event, then load the selected events into the build queue.</div>
            </div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body awards-section-body">
            <div class="awards-section-help">
              <strong>What this section does:</strong>
              Search the live provider catalogs. Checking an event adds it to your selection. Use <b>Configure</b> only when you want to inspect or change that event before loading. The final button at the bottom loads every checked event into Section 3.
            </div>

            <div class="admin-control-grid">
              <label class="admin-field">
                <span>Provider</span>
                <select id="awardsProvider">
                  <option value="both">Kalshi + Polymarket</option>
                  <option value="kalshi">Kalshi only</option>
                  <option value="polymarket">Polymarket only</option>
                </select>
              </label>

              <label class="admin-field awards-field-wide">
                <span>Find Event</span>
                <input id="awardsSearchQuery" type="text" placeholder="Emmys, Best Drama, Survivor, World Cup…" onkeydown="if(event.key==='Enter'){adminAwardsSearch(document.getElementById('awardsSearchButton'))}">
                <span class="admin-sub">Searches event titles and, by default, the markets inside each event.</span>
              </label>
            </div>

            <details class="awards-subdetails">
              <summary>Advanced Search</summary>
              <div class="admin-control-grid awards-advanced-grid">
                <label class="admin-field">
                  <span>Category</span>
                  <select id="awardsSearchCategory">
                    <option value="">Any category</option>
                  </select>
                  <span class="admin-sub">Categories populate from provider results after your first search so you do not have to know provider category names.</span>
                </label>
                <label class="admin-field">
                  <span>Search In</span>
                  <select id="awardsSearchIn">
                    <option value="both">Event + markets</option>
                    <option value="event">Event title/context only</option>
                    <option value="markets">Market questions only</option>
                  </select>
                  <span class="admin-sub">Use Event + markets unless you are narrowing a very large search.</span>
                </label>
                <label class="admin-field">
                  <span>Closing Window</span>
                  <select id="awardsSearchCloseDays">
                    <option value="0">Any future date</option>
                    <option value="1">Next 24 hours</option>
                    <option value="7">Next 7 days</option>
                    <option value="30">Next 30 days</option>
                    <option value="90">Next 90 days</option>
                  </select>
                </label>
                <label class="admin-field">
                  <span>Sort Search Results</span>
                  <select id="awardsSearchSort">
                    <option value="relevance">Relevance</option>
                    <option value="title">Event title</option>
                    <option value="closing">Closing soon</option>
                  </select>
                </label>
                <label class="admin-list-row awards-checkbox-row">
                  <span><b>Exact phrase</b><div class="admin-sub">Require the typed phrase in provider text.</div></span>
                  <input id="awardsSearchExact" type="checkbox">
                </label>
              </div>
            </details>

            <div class="admin-actions awards-search-actions">
              <button id="awardsSearchButton" type="button" class="button admin-button" onclick="adminAwardsSearch(this)">Search Events</button>
              <button id="awardsLoadMoreButton" type="button" class="admin-small-button secondary" onclick="adminAwardsLoadMore(this)" style="display:none;">Load More</button>
              <button id="awardsToggleAllEventsButton" type="button" class="admin-small-button secondary" onclick="adminAwardsToggleAllEvents_()">Check All Results</button>
            </div>

            <div id="awardsSearchStatus" class="admin-message"></div>
            <div class="admin-list-row awards-selection-summary">
              <div><b>Selected Events</b><div class="admin-sub">Checked events will be loaded into the final review/build queue.</div></div>
              <span id="awardsBatchCount" class="admin-pill">0 selected</span>
            </div>

            <div id="awardsSearchResults" class="admin-list awards-event-results"></div>

            <div class="admin-actions awards-section-final-actions">
              <button type="button" class="button admin-button" onclick="adminAwardsLoadSelectedEvents(this)">Load Selected Events & Questions</button>
            </div>
          </div>
        </details>

        <details id="awardsSection3" class="card admin-card admin-collapsible-card awards-manager-section" open>
          <summary class="admin-card-summary awards-section-summary">
            <div>
              <h2>3. Review, Sort & Build Questions</h2>
              <div class="admin-sub">This is the final queue. Reorder questions here, edit only what you need, then build them into the selected PATTC Predicts game.</div>
            </div>
            <div class="awards-summary-right">
              <span id="awardsLoadedCount" class="admin-pill">0 loaded</span>
              <span class="admin-collapse-icon">▾</span>
            </div>
          </summary>
          <div class="admin-collapsible-body awards-section-body">
            <div class="awards-section-help">
              <strong>What this section does:</strong>
              The order shown here becomes the question order in the game. Use ↑/↓ for small moves, type a position such as 4 for a large jump, or drag cards on desktop. Cards stay collapsed to the question title until you open one.
            </div>

            <div class="admin-actions awards-question-list-actions">
              <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetBatchCardsExpanded_(false)">Collapse All Questions</button>
              <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetBatchCardsExpanded_(true)">Expand All Questions</button>
            </div>

            <div id="awardsBuildProgressWrap" class="awards-build-progress" hidden>
              <div class="awards-build-progress-head">
                <strong id="awardsBuildProgressText">Preparing build…</strong>
                <span id="awardsBuildProgressPct">0%</span>
              </div>
              <div class="awards-build-progress-track"><div id="awardsBuildProgressBar" class="awards-build-progress-bar" style="width:0%;"></div></div>
            </div>

            <div class="admin-message warning awards-build-browser-note">
              Build All saves one question at a time to avoid Apps Script timeouts. Keep this Awards Manager page open while the build is running. Each completed question is safe even if a later question fails.
            </div>

            <div id="awardsBatchQuestionGrid" class="admin-list awards-build-queue"><div class="admin-sub">Select events above, then load them here.</div></div>

            <div class="admin-actions awards-section-final-actions">
              <button type="button" class="button admin-button" onclick="adminAwardsBuildLoadedQuestions(this)">Build All Unbuilt Questions</button>
              <button type="button" class="admin-small-button secondary" onclick="adminAwardsClearLoadedQuestions_()">Clear Loaded</button>
            </div>
            <div id="awardsBatchStatus" class="admin-message"></div>
          </div>
        </details>

        <details id="awardsSection4" class="card admin-card admin-collapsible-card awards-manager-section">
          <summary class="admin-card-summary awards-section-summary">
            <div>
              <h2>4. Result Safety</h2>
              <div class="admin-sub">How market data and final results are handled after questions are created.</div>
            </div>
            <span class="admin-collapse-icon">▾</span>
          </summary>
          <div class="admin-collapsible-body awards-section-body">
            <div class="admin-list">
              <div class="admin-list-row"><div><b>Live market source</b><div class="admin-sub">K/P probabilities are read-only. Showing odds to players is optional.</div></div><span class="admin-pill">Read only</span></div>
              <div class="admin-list-row"><div><b>External Results Hub</b><div class="admin-sub">Stores the selected provider markets, answer mappings, review state, and audit history.</div></div><span class="admin-pill">${dashboard.hubConfigured ? "Connected" : "Setup needed"}</span></div>
              <div class="admin-list-row"><div><b>Final scoring result</b><div class="admin-sub">The official website is preferred when supplied. Final settlement still requires administrator review.</div></div><span class="admin-pill">Auto-settle OFF</span></div>
            </div>
          </div>
        </details>
      </div>
      <div id="awardsMarketGridModalHost"></div>
    </div>
  `;
}

function awardsAdminSearchOptions_() {
  const category =
    document.getElementById(
      "awardsSearchCategory"
    );

  const searchIn =
    document.getElementById(
      "awardsSearchIn"
    );

  const closeDays =
    document.getElementById(
      "awardsSearchCloseDays"
    );

  const sort =
    document.getElementById(
      "awardsSearchSort"
    );

  const exact =
    document.getElementById(
      "awardsSearchExact"
    );

  return {
    category: category
      ? String(category.value || "").trim()
      : "",
    searchIn: searchIn
      ? String(searchIn.value || "both")
      : "both",
    closeDays: closeDays
      ? Number(closeDays.value || 0)
      : 0,
    sort: sort
      ? String(sort.value || "relevance")
      : "relevance",
    exactPhrase: !!(
      exact &&
      exact.checked
    )
  };
}

function awardsAdminEventKey_(event) {
  return [
    event && event.provider,
    event && event.externalEventId
  ]
    .map(function(value) {
      return String(value || "")
        .toLowerCase();
    })
    .join("|");
}

function awardsAdminMergeEvents_(current, incoming) {
  const byKey = {};
  const order = [];

  (current || [])
    .concat(incoming || [])
    .forEach(function(event) {
      if (!event) return;

      const key =
        awardsAdminEventKey_(event);

      if (!key) return;

      if (!byKey[key]) {
        order.push(key);
      }

      byKey[key] = event;
    });

  return order.map(function(key) {
    return byKey[key];
  });
}

function awardsAdminSortLoadedEvents_(events, sortMode) {
  const mode = String(
    sortMode || "relevance"
  ).toLowerCase();

  if (mode === "relevance") {
    return (events || []).slice();
  }

  return (events || []).slice().sort(
    function(a, b) {
      if (mode === "closing") {
        const aMs = Date.parse(
          a.closeTime || ""
        );

        const bMs = Date.parse(
          b.closeTime || ""
        );

        if (
          isFinite(aMs) &&
          isFinite(bMs) &&
          aMs !== bMs
        ) {
          return aMs - bMs;
        }
      }

      return String(
        a.eventName ||
        a.externalEventId ||
        ""
      ).localeCompare(
        String(
          b.eventName ||
          b.externalEventId ||
          ""
        )
      );
    }
  );
}

function awardsAdminExternalLink_(url, label) {
  const safe = String(url || "").trim();

  if (!safe) return "";

  return `
    <a
      class="admin-small-button secondary"
      href="${awardsAdminEsc_(safe)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${awardsAdminEsc_(
        label || "Open Provider"
      )}
    </a>
  `;
}

function awardsAdminOfficialSourceUrl_() {
  const input = document.getElementById("awardsOfficialSourceUrl");
  const value = String(input && input.value || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) {
    throw new Error("Official Website URL must start with http:// or https://.");
  }
  return value;
}

function adminAwardsOpenOfficialSource() {
  const status = document.getElementById("awardsBuilderStatus") || document.getElementById("awardsBatchStatus") || document.getElementById("awardsSearchStatus");
  try {
    const url = awardsAdminOfficialSourceUrl_() || String((AWARDS_MANAGER_STATE.selectedEvent || {}).officialSourceUrl || "").trim();
    if (!url) {
      throw new Error("Paste an official website URL first, or open an event that provides an official settlement source.");
    }
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    if (status) {
      status.className = "admin-message warning";
      status.textContent = err && err.message ? err.message : String(err);
    }
  }
}


function awardsAdminRefreshCategoryOptions_() {
  const select = document.getElementById("awardsSearchCategory");
  if (!select) return;
  const previous = String(select.value || "");
  const categories = [];
  (AWARDS_MANAGER_STATE.events || []).forEach(function(event) {
    const value = String(event && event.category || "").trim();
    if (value && categories.indexOf(value) === -1) categories.push(value);
  });
  categories.sort(function(a, b) { return a.localeCompare(b); });
  select.innerHTML = '<option value="">Any category</option>' + categories.map(function(value) {
    return '<option value="' + awardsAdminEsc_(value) + '">' + awardsAdminEsc_(value) + '</option>';
  }).join("");
  if (previous && categories.indexOf(previous) !== -1) select.value = previous;
}

function awardsAdminAllEventsSelected_() {
  const events = AWARDS_MANAGER_STATE.events || [];
  if (!events.length) return false;
  return events.every(function(event) {
    return !!AWARDS_MANAGER_STATE.selectedEventKeys[awardsAdminEventKey_(event)];
  });
}

function awardsAdminUpdateToggleAllButton_() {
  const button = document.getElementById("awardsToggleAllEventsButton");
  if (!button) return;
  button.textContent = awardsAdminAllEventsSelected_() ? "Clear Event Checks" : "Check All Results";
}

function adminAwardsToggleAllEvents_() {
  adminAwardsSetAllEvents_(!awardsAdminAllEventsSelected_());
}

function awardsAdminEventDraft_(event, detail) {
  const key = awardsAdminEventKey_(event);
  if (AWARDS_MANAGER_STATE.eventDraftsByKey[key]) return AWARDS_MANAGER_STATE.eventDraftsByKey[key];
  const defaults = awardsAdminCurrentDefaults_();
  const row = awardsAdminMakeBatchRow_(event, detail, 0, defaults);
  row.showProbabilities = "default";
  AWARDS_MANAGER_STATE.eventDraftsByKey[key] = row;
  return row;
}

function awardsAdminAnswerCardsHtml_(row, rowIndex, mode) {
  const editable = mode !== "inspect";
  const draftMode = mode === "draft";
  const answers = row.answers || [];
  if (!answers.length) return '<div class="admin-sub">No live markets/answers were returned for this event.</div>';
  return '<div class="awards-answer-card-list">' + answers.map(function(answer, answerIndex) {
    const updatePrefix = draftMode
      ? "adminAwardsUpdateDraftAnswer_("
      : "adminAwardsToggleBatchAnswer_(";
    const source = awardsAdminExternalLink_(answer.sourceUrl, "Open");
    return `
      <div class="awards-answer-card ${answer.include ? "" : "is-disabled"}">
        <div class="awards-answer-toggle-row">
          <label class="awards-switch-label">
            <input type="checkbox" ${answer.include ? "checked" : ""} ${editable ? `onchange="${updatePrefix}${rowIndex}, ${answerIndex}, 'include', this.checked)"` : "disabled"}>
            <span>Include</span>
          </label>
          <label class="awards-switch-label">
            <input type="checkbox" ${answer.showProbability ? "checked" : ""} ${editable ? `onchange="${updatePrefix}${rowIndex}, ${answerIndex}, 'showProbability', this.checked)"` : "disabled"}>
            <span>Show Odds</span>
          </label>
          <span class="admin-pill">${awardsAdminEsc_(awardsAdminProviderBadge_(answer.provider))} · ${awardsAdminPct_(answer.probability)}</span>
        </div>
        <label class="admin-field">
          <span>Answer Text</span>
          ${editable
            ? `<input type="text" value="${awardsAdminEsc_(answer.label)}" oninput="${updatePrefix}${rowIndex}, ${answerIndex}, 'label', this.value)">`
            : `<div class="awards-answer-readonly">${awardsAdminEsc_(answer.label)}</div>`}
        </label>
        <div class="admin-sub awards-answer-market-question">${awardsAdminEsc_(answer.marketQuestion)}</div>
        ${source ? `<div class="awards-answer-source">${source}</div>` : ""}
      </div>
    `;
  }).join("") + '</div>';
}

function awardsAdminRenderSearchResults_() {
  const resultsNode =
    document.getElementById(
      "awardsSearchResults"
    );

  const loadMore =
    document.getElementById(
      "awardsLoadMoreButton"
    );

  if (!resultsNode) return;

  const options =
    AWARDS_MANAGER_STATE.lastSearch &&
    AWARDS_MANAGER_STATE.lastSearch.options
      ? AWARDS_MANAGER_STATE.lastSearch.options
      : {};

  AWARDS_MANAGER_STATE.events =
    awardsAdminSortLoadedEvents_(
      AWARDS_MANAGER_STATE.events,
      options.sort
    );

  resultsNode.innerHTML =
    AWARDS_MANAGER_STATE.events.length
      ? AWARDS_MANAGER_STATE.events
          .map(function(event, index) {
            const contextBits = [
              event.category,
              event.contextSubtitle,
              event.seriesTicker
            ]
              .map(function(value) {
                return String(
                  value || ""
                ).trim();
              })
              .filter(Boolean);

            const contextLine =
              contextBits.join(" · ");

            const weakContext =
              event.contextComplete === false;

            const count =
              Number(
                event.liveMarketCount ||
                event.markets &&
                event.markets.length ||
                0
              );

            const matching =
              Number(
                event.matchingMarketCount ||
                0
              );
            const eventKey = awardsAdminEventKey_(event);
            const isSelected = !!AWARDS_MANAGER_STATE.selectedEventKeys[eventKey];

            return `
              <div class="admin-category-card">
                <div class="admin-category-header">
                  <div style="min-width:0;">
                    <strong>
                      ${awardsAdminEsc_(
                        event.eventName ||
                        event.externalEventId
                      )}
                    </strong>

                    <div class="admin-sub">
                      <b>${awardsAdminEsc_(awardsAdminProviderBadge_(event.provider))}</b>
                      ${
                        contextLine
                          ? " · " +
                            awardsAdminEsc_(
                              contextLine
                            )
                          : ""
                      }
                    </div>

                    ${
                      event.closeTime
                        ? `
                          <div class="admin-sub">
                            Closes:
                            ${awardsAdminEsc_(
                              event.closeTime
                            )}
                          </div>
                        `
                        : ""
                    }

                    <div class="admin-sub">
                      ${
                        count
                          ? count +
                            " live market" +
                            (count === 1 ? "" : "s")
                          : "Open event to load live markets"
                      }
                      ${
                        matching
                          ? " · " +
                            matching +
                            " matched your search"
                          : ""
                      }
                    </div>

                    ${
                      weakContext
                        ? `
                          <div
                            class="admin-message warning"
                            style="margin-top:8px;"
                          >
                            Context unavailable or incomplete.
                            Verify the original provider market before using it.
                          </div>
                        `
                        : ""
                    }
                  </div>

                  <label class="admin-pill" style="display:flex;gap:6px;align-items:center;cursor:pointer;">
                    <input type="checkbox" class="awards-event-select" ${isSelected ? "checked" : ""} onchange="adminAwardsToggleEventSelected(${index}, this.checked)">
                    Add
                  </label>
                </div>

                <div class="admin-actions awards-event-card-actions">
                  <button
                    type="button"
                    class="admin-small-button"
                    onclick="adminAwardsOpenEvent(${index}, this)"
                  >
                    Configure
                  </button>

                  ${awardsAdminExternalLink_(
                    event.originalMarketUrl ||
                    event.sourceUrl,
                    weakContext
                      ? "Open Original Market"
                      : "Open Provider Event"
                  )}
                </div>
                <div id="awardsInlineWorkspace-${index}" class="awards-inline-workspace"></div>
              </div>
            `;
          })
          .join("")
      : `
          <div class="admin-sub">
            No matching live events were found in the provider pages scanned so far.
            ${
              AWARDS_MANAGER_STATE.hasMore
                ? "Use Load More Events to continue through the provider catalog."
                : "No more provider pages remain for this search."
            }
          </div>
        `;

  if (loadMore) {
    loadMore.style.display =
      AWARDS_MANAGER_STATE.hasMore
        ? ""
        : "none";
  }

  awardsAdminRefreshCategoryOptions_();
  awardsAdminUpdateBatchCount_();
  awardsAdminUpdateToggleAllButton_();
}

async function adminAwardsRunSearch_(
  button,
  append
) {
  const queryNode =
    document.getElementById(
      "awardsSearchQuery"
    );

  const providerNode =
    document.getElementById(
      "awardsProvider"
    );

  const status =
    document.getElementById(
      "awardsSearchStatus"
    );

  if (
    !queryNode ||
    !providerNode ||
    !status
  ) {
    return;
  }

  const query = String(
    queryNode.value || ""
  ).trim();

  if (query.length < 2) {
    status.className =
      "admin-message warning";

    status.textContent =
      "Enter at least 2 characters.";

    return;
  }

  const options =
    awardsAdminSearchOptions_();

  if (!append) {
    AWARDS_MANAGER_STATE.events = [];
    AWARDS_MANAGER_STATE.results = [];
    AWARDS_MANAGER_STATE.selectedEventKeys = {};
    awardsAdminUpdateBatchCount_();
    AWARDS_MANAGER_STATE.searchState = {};
    AWARDS_MANAGER_STATE.hasMore = false;
    AWARDS_MANAGER_STATE.selectedEvent = null;
    AWARDS_MANAGER_STATE.eventMarkets = [];
    AWARDS_MANAGER_STATE.selectedMarket = null;
  }

  AWARDS_MANAGER_STATE.lastSearch = {
    query: query,
    provider:
      providerNode.value,
    options: options
  };

  if (button) button.disabled = true;

  status.className = "admin-message";
  status.textContent = append
    ? "Loading more provider event pages…"
    : "Searching live provider events…";

  try {
    const res =
      await apiAdminAwardsSearchExternalMarkets(
        providerNode.value,
        query,
        {
          category: options.category,
          searchIn: options.searchIn,
          closeDays: options.closeDays,
          sort: options.sort,
          exactPhrase:
            options.exactPhrase,
          searchState: append
            ? AWARDS_MANAGER_STATE.searchState
            : {}
        }
      );

    if (!res || res.success === false) {
      throw new Error(
        (
          res &&
          (res.error || res.message)
        ) ||
        "Search failed."
      );
    }

    const incoming =
      Array.isArray(res.events)
        ? res.events
        : [];

    AWARDS_MANAGER_STATE.events =
      awardsAdminMergeEvents_(
        append
          ? AWARDS_MANAGER_STATE.events
          : [],
        incoming
      );

    AWARDS_MANAGER_STATE.searchState =
      res.searchState || {};

    AWARDS_MANAGER_STATE.hasMore =
      res.hasMore === true;

    const errors =
      Array.isArray(res.errors)
        ? res.errors
        : [];

    const scanned = res.scannedPages || {};
    const scanBits = [];

    if (scanned.kalshi) {
      scanBits.push(
        "Kalshi scanned " +
        scanned.kalshi +
        " page" +
        (
          Number(scanned.kalshi) === 1
            ? ""
            : "s"
        )
      );
    }

    if (scanned.polymarket) {
      scanBits.push(
        "Polymarket scanned " +
        scanned.polymarket +
        " page" +
        (
          Number(scanned.polymarket) === 1
            ? ""
            : "s"
        )
      );
    }

    status.className =
      "admin-message " +
      (
        errors.length
          ? "warning"
          : "success"
      );

    status.textContent =
      AWARDS_MANAGER_STATE.events.length +
      " unique live event" +
      (
        AWARDS_MANAGER_STATE.events.length === 1
          ? ""
          : "s"
      ) +
      " loaded." +
      (
        AWARDS_MANAGER_STATE.hasMore
          ? " More provider pages are available."
          : " Search exhausted."
      ) +
      (
        scanBits.length
          ? " " +
            scanBits.join(" · ") +
            "."
          : ""
      ) +
      (
        errors.length
          ? " " +
            errors.join(" · ")
          : ""
      );

    awardsAdminRenderSearchResults_();
  } catch (err) {
    status.className =
      "admin-message error";

    status.textContent =
      err && err.message
        ? err.message
        : String(err);
  } finally {
    if (button) button.disabled = false;
  }
}

async function adminAwardsSearch(button) {
  return adminAwardsRunSearch_(
    button,
    false
  );
}

async function adminAwardsLoadMore(button) {
  if (!AWARDS_MANAGER_STATE.hasMore) {
    return;
  }

  return adminAwardsRunSearch_(
    button,
    true
  );
}

function awardsAdminSetAllEventMarkets_(checked) {
  document.querySelectorAll(".awards-event-market-use").forEach(function(input) {
    input.checked = checked === true;
  });
  document.querySelectorAll(".awards-event-outcome-use").forEach(function(input) {
    input.checked = checked === true;
  });
}

function awardsAdminCurrentDefaults_() {
  const gameId = String((document.getElementById("awardsBatchGame") || {}).value || "").trim();
  const requestedMode = String((document.getElementById("awardsBatchScoreMode") || {}).value || "auto");
  const resolvedMode = requestedMode === "auto" ? awardsAdminDefaultScoreModeForGame_(gameId) : requestedMode;
  return {
    gameId: gameId,
    scoreMode: resolvedMode || "fixed-points",
    layoutType: String((document.getElementById("awardsBatchLayoutType") || {}).value || "image"),
    showProbabilities: String((document.getElementById("awardsBatchShowProbabilities") || {}).value || "show"),
    maxChanges: Number((document.getElementById("awardsBatchMaxChanges") || {}).value || -1),
    section: String((document.getElementById("awardsBatchSection") || {}).value || "Awards").trim() || "Awards",
    points: Math.max(0, Number((document.getElementById("awardsBatchPoints") || {}).value || 1) || 0),
    startOrder: Math.max(0, Number((document.getElementById("awardsBatchStartOrder") || {}).value || 10) || 0)
  };
}

function adminAwardsSyncBatchModeForGame_(gameId) {
  AWARDS_MANAGER_STATE.batchGameId = String(gameId || "");
  const game = awardsAdminGameById_(gameId);
  const type = awardsAdminCanonicalGameType_(game);
  const scoreNode = document.getElementById("awardsBatchScoreMode");
  const note = document.getElementById("awardsBatchGameTypeNote");
  const scoreNote = document.getElementById("awardsBatchScoreModeNote");
  if (!scoreNode) return;

  if (!game) {
    scoreNode.value = "auto";
    scoreNode.disabled = true;
    if (note) note.textContent = "Choose a game to set its play type.";
    if (scoreNote) scoreNote.textContent = "The selected game determines the default play type.";
    return;
  }

  if (type !== "mixed") {
    const mode = awardsAdminDefaultScoreModeForGame_(gameId);
    scoreNode.value = mode;
    scoreNode.disabled = true;
    if (note) note.textContent = "Game type: " + awardsAdminGameTypeLabel_(game) + ".";
    if (scoreNote) scoreNote.textContent = "Controlled by the game type. Choose a Hybrid game if you need different play types on different questions.";
  } else {
    scoreNode.disabled = false;
    if (!scoreNode.value || scoreNode.value === "auto") scoreNode.value = "fixed-points";
    if (note) note.textContent = "Game type: Hybrid.";
    if (scoreNote) scoreNote.textContent = "Hybrid game: choose the default here, then override individual questions in Section 3.";
  }
}
function awardsAdminUpdateBatchCount_() {
  const count = Object.keys(AWARDS_MANAGER_STATE.selectedEventKeys || {}).filter(function(key) {
    return AWARDS_MANAGER_STATE.selectedEventKeys[key];
  }).length;
  const node = document.getElementById("awardsBatchCount");
  if (node) node.textContent = count + " selected";
}

function adminAwardsToggleEventSelected(index, checked) {
  const event = AWARDS_MANAGER_STATE.events[index];
  if (!event) return;
  const key = awardsAdminEventKey_(event);
  if (checked) AWARDS_MANAGER_STATE.selectedEventKeys[key] = true;
  else delete AWARDS_MANAGER_STATE.selectedEventKeys[key];
  awardsAdminUpdateBatchCount_();
  awardsAdminUpdateToggleAllButton_();
}

function adminAwardsSetAllEvents_(checked) {
  (AWARDS_MANAGER_STATE.events || []).forEach(function(event) {
    const key = awardsAdminEventKey_(event);
    if (checked) AWARDS_MANAGER_STATE.selectedEventKeys[key] = true;
    else delete AWARDS_MANAGER_STATE.selectedEventKeys[key];
  });
  document.querySelectorAll("#awardsSearchResults .awards-event-select").forEach(function(input) {
    input.checked = checked === true;
  });
  awardsAdminUpdateBatchCount_();
  awardsAdminUpdateToggleAllButton_();
}

function adminAwardsClearSelectedEvents_() {
  adminAwardsSetAllEvents_(false);
  const status = document.getElementById("awardsBatchStatus");
  if (status) { status.className = "admin-message"; status.textContent = ""; }
}

async function awardsAdminGetEventDetailCached_(event) {
  const key = awardsAdminEventKey_(event);
  if (AWARDS_MANAGER_STATE.eventDetailsByKey[key]) return AWARDS_MANAGER_STATE.eventDetailsByKey[key];
  const detail = await apiAdminAwardsGetExternalEvent(event.provider, event.externalEventId);
  if (!detail || detail.success === false) {
    throw new Error((detail && (detail.error || detail.message)) || "Could not load event.");
  }
  AWARDS_MANAGER_STATE.eventDetailsByKey[key] = detail;
  return detail;
}

function awardsAdminBatchAnswersFromDetail_(detail) {
  const markets = Array.isArray(detail && detail.markets) ? detail.markets : [];
  if (!markets.length) return [];

  if (markets.length >= 2) {
    return markets.map(function(item, index) {
      const yesValue = item.prices && item.prices.Yes !== undefined ? item.prices.Yes : item.primaryProbability;
      return {
        key: "market:" + String(item.externalMarketId || index),
        kind: "market",
        marketIndex: index,
        marketId: String(item.externalMarketId || ""),
        outcome: "Yes",
        label: awardsAdminGroupedAnswerLabel_(item),
        include: true,
        showProbability: true,
        probability: yesValue,
        provider: item.provider || detail.provider || "",
        marketQuestion: item.marketQuestion || item.externalMarketId || "",
        sourceUrl: item.sourceUrl || ""
      };
    });
  }

  const market = markets[0];
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
  return outcomes.map(function(outcome, index) {
    const probability = market.prices && market.prices[outcome] !== undefined ? market.prices[outcome] : "";
    return {
      key: "outcome:" + String(outcome),
      kind: "outcome",
      marketIndex: 0,
      marketId: String(market.externalMarketId || ""),
      outcome: String(outcome),
      label: String(outcome),
      include: true,
      showProbability: true,
      probability: probability,
      provider: market.provider || detail.provider || "",
      marketQuestion: market.marketQuestion || detail.eventName || market.externalMarketId || "",
      sourceUrl: market.sourceUrl || ""
    };
  });
}

function awardsAdminMakeBatchRow_(event, detail, rowIndex, defaults) {
  const markets = Array.isArray(detail.markets) ? detail.markets : [];
  const first = markets[0] || {};
  return {
    key: awardsAdminEventKey_(event),
    provider: detail.provider || event.provider || "",
    externalEventId: detail.externalEventId || event.externalEventId || "",
    eventName: detail.eventName || event.eventName || detail.externalEventId || event.externalEventId || "",
    detail: detail,
    include: true,
    question: detail.eventName || event.eventName || first.marketQuestion || "",
    section: defaults.section,
    points: defaults.points,
    displayOrder: defaults.startOrder + (rowIndex * 10),
    layoutType: defaults.layoutType,
    scoreMode: defaults.scoreMode,
    maxChanges: defaults.maxChanges,
    showProbabilities: "default",
    officialSourceUrl: detail.officialSourceUrl || "",
    answers: awardsAdminBatchAnswersFromDetail_(detail),
    buildStatus: ""
  };
}

async function adminAwardsLoadSelectedEvents(button) {
  const status = document.getElementById("awardsBatchStatus");
  const defaults = awardsAdminCurrentDefaults_();
  const selected = (AWARDS_MANAGER_STATE.events || []).filter(function(event) {
    return !!AWARDS_MANAGER_STATE.selectedEventKeys[awardsAdminEventKey_(event)];
  });

  if (!defaults.gameId) {
    if (status) { status.className = "admin-message warning"; status.textContent = "Choose the PATTC Predicts game in Section 1 first."; }
    return;
  }
  if (!selected.length) {
    if (status) { status.className = "admin-message warning"; status.textContent = "Check at least one event first."; }
    return;
  }

  if (button) button.disabled = true;
  if (status) { status.className = "admin-message"; status.textContent = "Loading " + selected.length + " selected event" + (selected.length === 1 ? "" : "s") + "…"; }

  const rows = [];
  const failures = [];
  try {
    for (let i = 0; i < selected.length; i += 1) {
      const event = selected[i];
      try {
        const detail = await awardsAdminGetEventDetailCached_(event);
        const draft = AWARDS_MANAGER_STATE.eventDraftsByKey[awardsAdminEventKey_(event)];
        const row = draft
          ? Object.assign({}, draft, {
              detail: detail,
              answers: (draft.answers || []).map(function(answer) { return Object.assign({}, answer); }),
              buildStatus: draft.buildStatus || ""
            })
          : awardsAdminMakeBatchRow_(event, detail, rows.length, defaults);
        if (!row.answers.length) throw new Error("No live markets/answers were available.");
        if (!draft) row.displayOrder = defaults.startOrder + (rows.length * 10);
        rows.push(row);
      } catch (err) {
        failures.push((event.eventName || event.externalEventId) + " — " + (err && err.message ? err.message : String(err)));
      }
      if (status) status.textContent = "Loaded " + (i + 1) + " of " + selected.length + " selected events…";
    }
    AWARDS_MANAGER_STATE.batchRows = rows;
    adminAwardsRenumberBatchRows_(false);
    awardsAdminRenderBatchQuestionGrid_();
    const section3 = document.getElementById("awardsSection3");
    if (section3) {
      section3.open = true;
      if (typeof section3.scrollIntoView === "function") section3.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (status) {
      status.className = failures.length ? "admin-message warning" : "admin-message success";
      status.textContent = rows.length + " question" + (rows.length === 1 ? "" : "s") + " loaded into the grid." + (failures.length ? " Failed: " + failures.join(" | ") : "");
    }
  } finally {
    if (button) button.disabled = false;
  }
}

function awardsAdminRenderBatchQuestionGrid_() {
  const grid = document.getElementById("awardsBatchQuestionGrid");
  const loadedCount = document.getElementById("awardsLoadedCount");
  const rows = AWARDS_MANAGER_STATE.batchRows || [];
  if (loadedCount) loadedCount.textContent = rows.length + " loaded";
  if (!grid) return;

  if (!rows.length) {
    grid.innerHTML = `<div class="admin-sub">Select events above, then load them here.</div>`;
    return;
  }

  const game = awardsAdminGameById_(awardsAdminCurrentDefaults_().gameId);
  const gameType = awardsAdminCanonicalGameType_(game);
  const scoreDisabled = game && gameType !== "mixed";

  grid.innerHTML = rows.map(function(row, index) {
    const includedAnswers = (row.answers || []).filter(function(answer) { return answer.include; }).length;
    const answerCount = (row.answers || []).length;
    const built = row.buildStatus && row.buildStatus.indexOf("Built") === 0;
    const failed = row.buildStatus && row.buildStatus.indexOf("Error") === 0;
    const statusClass = built ? "success" : failed ? "warning" : "";
    const statusLabel = built ? "Built" : failed ? "Needs retry" : row.buildStatus || "Ready";
    const position = index + 1;
    return `
      <details
        class="admin-category-card awards-build-card awards-question-order-card ${built ? "is-built" : ""}"
        data-awards-batch-row="${index}"
        ondragover="adminAwardsBatchDragOver_(event)"
        ondrop="adminAwardsBatchDrop_(event, ${index})"
      >
        <summary class="awards-build-card-summary">
          <div class="awards-order-controls" title="Reorder question">
            <button type="button" class="admin-small-button secondary awards-order-button" onclick="event.preventDefault();event.stopPropagation();adminAwardsMoveBatchRowToPosition_(${index}, ${position - 1}, event)" ${index === 0 ? "disabled" : ""} title="Move up one position">↑</button>
            <label class="awards-position-jump" onclick="event.stopPropagation()" title="Type a destination position, then press Enter or leave the field">
              <span class="sr-only">Move question to position</span>
              <input
                type="number"
                min="1"
                max="${rows.length}"
                value="${position}"
                inputmode="numeric"
                aria-label="Move question to position ${position}"
                onchange="event.stopPropagation();adminAwardsMoveBatchRowToPosition_(${index}, this.value, event)"
                onkeydown="if(event.key==='Enter'){event.preventDefault();event.stopPropagation();this.blur();}"
              >
            </label>
            <button type="button" class="admin-small-button secondary awards-order-button" onclick="event.preventDefault();event.stopPropagation();adminAwardsMoveBatchRowToPosition_(${index}, ${position + 1}, event)" ${index === rows.length - 1 ? "disabled" : ""} title="Move down one position">↓</button>
            <span class="awards-drag-handle" draggable="true" ondragstart="event.stopPropagation();adminAwardsBatchDragStart_(event, ${index})" onclick="event.preventDefault();event.stopPropagation()" title="Drag to reorder" aria-label="Drag question to reorder" role="button" tabindex="0">⋮⋮</span>
          </div>

          <div class="awards-build-card-main awards-collapsed-question-main">
            <div class="awards-question-summary-title"><span class="admin-question-position-badge">#${position}</span><strong>${awardsAdminEsc_(row.question || ("Question " + position))}</strong></div>
            <div class="awards-build-card-meta">
              <span class="admin-pill">${awardsAdminEsc_(awardsAdminProviderBadge_(row.provider))}</span>
              <span>${includedAnswers}/${answerCount} answers</span>
              <span class="awards-row-status ${statusClass}">${awardsAdminEsc_(statusLabel)}</span>
            </div>
          </div>

          <span class="admin-collapse-icon">▾</span>
        </summary>

        <div class="awards-build-card-body">
          <div class="awards-build-card-head awards-build-editor-head">
            <div class="awards-build-card-main">
              <label class="admin-field awards-question-field">
                <span>Question ${position}</span>
                <input type="text" value="${awardsAdminEsc_(row.question)}" oninput="adminAwardsUpdateBatchRow_(${index}, 'question', this.value)">
              </label>
            </div>

            <label class="awards-build-toggle">
              <input type="checkbox" ${row.include ? "checked" : ""} onchange="adminAwardsUpdateBatchRow_(${index}, 'include', this.checked)">
              <span>Build</span>
            </label>
          </div>

          <details class="awards-subdetails awards-question-advanced">
            <summary>Advanced Settings</summary>
            <div class="admin-control-grid awards-advanced-grid">
              <label class="admin-field"><span>Section</span><input type="text" value="${awardsAdminEsc_(row.section)}" oninput="adminAwardsUpdateBatchRow_(${index}, 'section', this.value)"></label>
              <label class="admin-field"><span>Points</span><input type="number" min="0" value="${Number(row.points) || 0}" oninput="adminAwardsUpdateBatchRow_(${index}, 'points', this.value)"></label>
              <label class="admin-field"><span>Stored Display Order</span><input type="number" min="0" value="${Number(row.displayOrder) || 0}" readonly><span class="admin-sub">Updated automatically when you reorder this batch.</span></label>
              <label class="admin-field"><span>Question Display</span><select onchange="adminAwardsUpdateBatchRow_(${index}, 'layoutType', this.value)">${awardsAdminLayoutOptions_(row.layoutType)}</select></label>
              <label class="admin-field">
                <span>Play Type</span>
                <select ${scoreDisabled ? "disabled" : ""} onchange="adminAwardsUpdateBatchRow_(${index}, 'scoreMode', this.value)">${awardsAdminScoreModeOptions_(row.scoreMode)}</select>
                <span class="admin-sub">${scoreDisabled ? "Controlled by the selected game type." : "Hybrid game: this question can use a different play type."}</span>
              </label>
              <label class="admin-field"><span>Pick Changes</span><select onchange="adminAwardsUpdateBatchRow_(${index}, 'maxChanges', this.value)">${awardsAdminPickChangeOptions_(row.maxChanges)}</select></label>
              <label class="admin-field"><span>Market Odds Display</span><select onchange="adminAwardsUpdateBatchRow_(${index}, 'showProbabilities', this.value)">${awardsAdminProbabilityOptions_(row.showProbabilities, true)}</select></label>
            </div>
          </details>

          <details class="awards-subdetails awards-market-answer-details">
            <summary>
              <span>Markets / Answers</span>
              <span class="admin-pill">${includedAnswers}/${answerCount} included</span>
            </summary>
            <div class="admin-sub awards-market-help">Turn individual answers on/off, hide/show K/P odds, or edit the player-facing Answer Text. Provider mapping stays tied to the original market.</div>
            <div class="admin-actions">
              <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllBatchAnswersInline_(${index}, true)">Include All</button>
              <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllBatchAnswersInline_(${index}, false)">Clear All</button>
            </div>
            ${awardsAdminAnswerCardsHtml_(row, index, "batch")}
          </details>

          <div class="admin-actions awards-build-card-actions">
            ${awardsAdminExternalLink_(row.detail && row.detail.sourceUrl, "Open Provider")}
            ${awardsAdminExternalLink_(row.officialSourceUrl, "Open Official Site")}
            <button type="button" class="admin-small-button secondary" onclick="adminAwardsRemoveBatchRow_(${index})">Remove</button>
          </div>
          ${row.buildStatus ? `<div class="admin-message ${statusClass}" style="margin-top:8px;">${awardsAdminEsc_(row.buildStatus)}</div>` : ""}
        </div>
      </details>
    `;
  }).join("");
}

function adminAwardsRenumberBatchRows_(force) {
  const defaults = awardsAdminCurrentDefaults_();
  (AWARDS_MANAGER_STATE.batchRows || []).forEach(function(row, index) {
    if (force !== false || !Number.isFinite(Number(row.displayOrder))) {
      row.displayOrder = defaults.startOrder + (index * 10);
    }
  });
}

function adminAwardsMoveBatchRowToPosition_(index, targetPosition, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const rows = AWARDS_MANAGER_STATE.batchRows || [];
  if (index < 0 || index >= rows.length || !rows.length) return;
  const requested = Math.max(1, Math.min(rows.length, Math.round(Number(targetPosition) || 1)));
  const targetIndex = requested - 1;
  if (targetIndex === index) return;
  const item = rows.splice(index, 1)[0];
  rows.splice(targetIndex, 0, item);
  adminAwardsRenumberBatchRows_(true);
  awardsAdminRenderBatchQuestionGrid_();
}

function adminAwardsMoveBatchRow_(index, direction) {
  adminAwardsMoveBatchRowToPosition_(index, index + 1 + Number(direction || 0));
}

function adminAwardsSetBatchCardsExpanded_(expanded) {
  document.querySelectorAll("details.awards-question-order-card").forEach(function(card) {
    card.open = expanded === true;
  });
}

function adminAwardsBatchDragStart_(event, index) {
  AWARDS_MANAGER_STATE.dragRowIndex = index;
  if (event && event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    try { event.dataTransfer.setData("text/plain", String(index)); } catch (ignore) {}
  }
}

function adminAwardsBatchDragOver_(event) {
  if (!event) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function adminAwardsBatchDrop_(event, targetIndex) {
  if (event) event.preventDefault();
  const rows = AWARDS_MANAGER_STATE.batchRows || [];
  let from = Number(AWARDS_MANAGER_STATE.dragRowIndex);
  if ((!Number.isFinite(from) || from < 0) && event && event.dataTransfer) {
    from = Number(event.dataTransfer.getData("text/plain"));
  }
  AWARDS_MANAGER_STATE.dragRowIndex = -1;
  if (!Number.isFinite(from) || from < 0 || from >= rows.length || targetIndex < 0 || targetIndex >= rows.length || from === targetIndex) return;
  adminAwardsMoveBatchRowToPosition_(from, targetIndex + 1);
}

function adminAwardsSetAllBatchAnswersInline_(rowIndex, checked) {
  const row = (AWARDS_MANAGER_STATE.batchRows || [])[rowIndex];
  if (!row) return;
  (row.answers || []).forEach(function(answer) { answer.include = checked === true; });
  awardsAdminRenderBatchQuestionGrid_();
}

function awardsAdminSetBuildProgress_(done, total, label) {
  const wrap = document.getElementById("awardsBuildProgressWrap");
  const text = document.getElementById("awardsBuildProgressText");
  const pct = document.getElementById("awardsBuildProgressPct");
  const bar = document.getElementById("awardsBuildProgressBar");
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeDone = Math.max(0, Math.min(safeTotal || 0, Number(done) || 0));
  const value = safeTotal ? Math.round((safeDone / safeTotal) * 100) : 0;
  if (wrap) wrap.hidden = safeTotal < 1;
  if (text) text.textContent = label || (safeDone + " of " + safeTotal + " complete");
  if (pct) pct.textContent = value + "%";
  if (bar) bar.style.width = value + "%";
}
function adminAwardsUpdateBatchRow_(index, field, value) {
  const row = (AWARDS_MANAGER_STATE.batchRows || [])[index];
  if (!row) return;
  if (field === "include") row.include = value === true;
  else if (field === "points") row.points = Math.max(0, Number(value) || 0);
  else if (field === "displayOrder") row.displayOrder = Math.max(0, Number(value) || 0);
  else if (field === "maxChanges") row.maxChanges = Number(value);
  else row[field] = String(value === undefined || value === null ? "" : value);
}

function adminAwardsRemoveBatchRow_(index) {
  if (index < 0 || index >= (AWARDS_MANAGER_STATE.batchRows || []).length) return;
  AWARDS_MANAGER_STATE.batchRows.splice(index, 1);
  awardsAdminRenderBatchQuestionGrid_();
}

function adminAwardsClearLoadedQuestions_() {
  AWARDS_MANAGER_STATE.batchRows = [];
  awardsAdminRenderBatchQuestionGrid_();
  const status = document.getElementById("awardsBatchStatus");
  if (status) { status.className = "admin-message"; status.textContent = "Loaded question grid cleared."; }
}

function adminAwardsApplyDefaultsToLoaded_() {
  const defaults = awardsAdminCurrentDefaults_();
  (AWARDS_MANAGER_STATE.batchRows || []).forEach(function(row, index) {
    row.section = defaults.section;
    row.points = defaults.points;
    row.displayOrder = defaults.startOrder + (index * 10);
    row.layoutType = defaults.layoutType;
    row.scoreMode = defaults.scoreMode;
    row.maxChanges = defaults.maxChanges;
    row.showProbabilities = "default";
  });
  awardsAdminRenderBatchQuestionGrid_();
  const status = document.getElementById("awardsBatchStatus");
  if (status) { status.className = "admin-message success"; status.textContent = "Section 1 defaults applied to the loaded question grid."; }
}

function awardsAdminMarketGridHtml_(row, rowIndex, editable) {
  const globalSetting = awardsAdminCurrentDefaults_().showProbabilities === "hide" ? "Hide" : "Show";
  return `
    <div class="awards-market-modal-backdrop" onclick="if(event.target===this)adminAwardsCloseMarketGrid_()">
      <div class="card admin-card awards-market-modal">
        <div class="awards-market-modal-head">
          <div>
            <h2>Markets / Answers</h2>
            <div class="admin-sub">${awardsAdminEsc_(row.eventName)} · ${awardsAdminEsc_(awardsAdminProviderBadge_(row.provider))}</div>
          </div>
          <button type="button" class="admin-small-button secondary" onclick="adminAwardsCloseMarketGrid_()">Close</button>
        </div>
        <div class="admin-message">
          Question odds display: <b>${awardsAdminEsc_(row.showProbabilities === "default" ? "Use Game Setting (" + globalSetting + ")" : (row.showProbabilities === "hide" ? "Hide" : "Show"))}</b>.
          Include controls whether an answer exists in the game. Show Odds only controls the player-facing K/P percentage.
        </div>
        ${editable ? `<div class="admin-actions"><button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllBatchAnswers_(${rowIndex}, true)">Include All</button><button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllBatchAnswers_(${rowIndex}, false)">Clear All</button></div>` : ""}
        ${awardsAdminAnswerCardsHtml_(row, rowIndex, editable ? "batch" : "inspect")}
        <div class="admin-actions"><button type="button" class="button admin-button" onclick="adminAwardsCloseMarketGrid_()">Done</button></div>
      </div>
    </div>
  `;
}
function adminAwardsOpenMarketGrid_(rowIndex) {
  const row = (AWARDS_MANAGER_STATE.batchRows || [])[rowIndex];
  const host = document.getElementById("awardsMarketGridModalHost");
  if (!row || !host) return;
  AWARDS_MANAGER_STATE.marketModalRowIndex = rowIndex;
  host.innerHTML = awardsAdminMarketGridHtml_(row, rowIndex, true);
}

async function adminAwardsOpenMarketGridFromSearch(index, button) {
  const event = (AWARDS_MANAGER_STATE.events || [])[index];
  const host = document.getElementById("awardsMarketGridModalHost");
  if (!event || !host) return;
  const oldText = button ? button.textContent : "";
  if (button) { button.disabled = true; button.textContent = "Loading…"; }
  try {
    const detail = await awardsAdminGetEventDetailCached_(event);
    const defaults = awardsAdminCurrentDefaults_();
    const row = awardsAdminMakeBatchRow_(event, detail, 0, defaults);
    host.innerHTML = awardsAdminMarketGridHtml_(row, -1, false);
  } catch (err) {
    host.innerHTML = `<div style="position:fixed;inset:0;background:rgba(2,6,23,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="adminAwardsCloseMarketGrid_()"><div class="card admin-card"><div class="admin-message error">${awardsAdminEsc_(err && err.message ? err.message : String(err))}</div><button type="button" class="admin-small-button secondary" onclick="adminAwardsCloseMarketGrid_()">Close</button></div></div>`;
  } finally {
    if (button) { button.disabled = false; button.textContent = oldText || "Market Grid"; }
  }
}

function adminAwardsCloseMarketGrid_() {
  const host = document.getElementById("awardsMarketGridModalHost");
  if (host) host.innerHTML = "";
  AWARDS_MANAGER_STATE.marketModalRowIndex = -1;
  awardsAdminRenderBatchQuestionGrid_();
}

function adminAwardsSetAllBatchAnswers_(rowIndex, checked) {
  const row = (AWARDS_MANAGER_STATE.batchRows || [])[rowIndex];
  if (!row) return;
  (row.answers || []).forEach(function(answer) { answer.include = checked === true; });
  adminAwardsOpenMarketGrid_(rowIndex);
}

function adminAwardsToggleBatchAnswer_(rowIndex, answerIndex, field, value) {
  const row = (AWARDS_MANAGER_STATE.batchRows || [])[rowIndex];
  const answer = row && (row.answers || [])[answerIndex];
  if (!answer) return;
  if (field === "include" || field === "showProbability") answer[field] = value === true;
  else answer[field] = String(value === undefined || value === null ? "" : value);
}

function awardsAdminEffectiveShowProbabilities_(row) {
  if (row.showProbabilities === "show") return true;
  if (row.showProbabilities === "hide") return false;
  return awardsAdminCurrentDefaults_().showProbabilities !== "hide";
}

function awardsAdminBuildPayloadForRow_(row) {
  const defaults = awardsAdminCurrentDefaults_();
  const gameId = defaults.gameId;
  const markets = Array.isArray(row.detail && row.detail.markets) ? row.detail.markets : [];
  const includedAnswers = (row.answers || []).filter(function(answer) { return answer.include && String(answer.label || "").trim(); });
  if (!gameId) throw new Error("Choose the PATTC Predicts game in Section 1.");
  if (!row.question || !String(row.question).trim()) throw new Error("Question text is required.");
  if (includedAnswers.length < 2) throw new Error("Select at least two markets/answers.");
  if (!markets.length) throw new Error("No live markets are loaded for this event.");

  const officialInput = String((document.getElementById("awardsOfficialSourceUrl") || {}).value || "").trim();
  let officialSourceUrl = officialInput || row.officialSourceUrl || "";
  if (officialSourceUrl && !/^https?:\/\//i.test(officialSourceUrl)) throw new Error("Official Website URL must begin with http:// or https://.");

  const labels = {};
  const probabilityDisplay = {};
  let marketJSON = "";
  let groupMarketsJSON = "";
  let selectedOutcomesJSON = "";

  if (markets.length >= 2) {
    const selectedMarkets = [];
    includedAnswers.forEach(function(answer) {
      const item = markets[answer.marketIndex];
      if (!item) return;
      selectedMarkets.push(item);
      labels[String(item.externalMarketId || "")] = String(answer.label || "").trim();
      probabilityDisplay[String(item.externalMarketId || "")] = answer.showProbability !== false;
    });
    if (selectedMarkets.length < 2) throw new Error("Select at least two provider markets for this event question.");
    marketJSON = JSON.stringify(selectedMarkets[0]);
    groupMarketsJSON = JSON.stringify(selectedMarkets);
  } else {
    const market = markets[0];
    const selectedOutcomes = [];
    includedAnswers.forEach(function(answer) {
      selectedOutcomes.push(answer.outcome);
      labels["outcome:" + String(answer.outcome)] = String(answer.label || "").trim();
      probabilityDisplay["outcome:" + String(answer.outcome)] = answer.showProbability !== false;
    });
    marketJSON = JSON.stringify(market);
    selectedOutcomesJSON = JSON.stringify(selectedOutcomes);
  }

  const scoreMode = row.scoreMode || defaults.scoreMode || "fixed-points";
  return {
    gameId: gameId,
    question: String(row.question || "").trim(),
    section: String(row.section || defaults.section || "Awards").trim() || "Awards",
    points: Math.max(0, Number(row.points) || 0),
    displayOrder: Math.max(0, Number(row.displayOrder) || 0),
    layoutType: row.layoutType || defaults.layoutType || "image",
    scoreMode: scoreMode,
    questionType: scoreMode === "ranking" ? "ranking" : "category-winner",
    selectionMode: scoreMode === "ranking" ? "ranking" : "single",
    maxChanges: Number(row.maxChanges),
    changePenalty: 0,
    showMarketProbabilities: awardsAdminEffectiveShowProbabilities_(row),
    probabilityDisplayJSON: JSON.stringify(probabilityDisplay),
    officialSourceUrl: officialSourceUrl,
    marketJSON: marketJSON,
    groupMarketsJSON: groupMarketsJSON,
    selectedOutcomesJSON: selectedOutcomesJSON,
    answerLabelsJSON: JSON.stringify(labels)
  };
}

async function adminAwardsBuildLoadedQuestions(button) {
  const status = document.getElementById("awardsBatchStatus");
  const defaults = awardsAdminCurrentDefaults_();
  const allRows = AWARDS_MANAGER_STATE.batchRows || [];
  const rows = allRows.filter(function(row) {
    return row.include !== false && !(row.buildStatus && row.buildStatus.indexOf("Built") === 0);
  });

  if (!defaults.gameId) {
    if (status) { status.className = "admin-message warning"; status.textContent = "Choose the PATTC Predicts game in Section 1 first."; }
    return;
  }
  if (!rows.length) {
    const alreadyBuilt = allRows.some(function(row) { return row.buildStatus && row.buildStatus.indexOf("Built") === 0; });
    if (status) {
      status.className = alreadyBuilt ? "admin-message success" : "admin-message warning";
      status.textContent = alreadyBuilt ? "All included questions in this queue are already built." : "Load at least one question first.";
    }
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Building…";
  }

  let built = 0;
  const failures = [];
  awardsAdminSetBuildProgress_(0, rows.length, "Starting " + rows.length + " question" + (rows.length === 1 ? "" : "s") + "…");

  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      row.buildStatus = "Building…";
      awardsAdminRenderBatchQuestionGrid_();
      awardsAdminSetBuildProgress_(i, rows.length, "Building " + (i + 1) + " of " + rows.length + ": " + row.question);
      if (status) {
        status.className = "admin-message";
        status.textContent = "Building " + (i + 1) + " of " + rows.length + ": " + row.question;
      }

      try {
        const payload = awardsAdminBuildPayloadForRow_(row);
        const response = await apiAdminAwardsCreateQuestionFromMarket(payload);
        if (!response || response.success === false) {
          throw new Error((response && (response.error || response.message)) || "Create failed.");
        }
        row.buildStatus = "Built · " + (response.categoryId || "question created") +
          (response.questionConfig && response.questionConfig.maxChanges < 0 ? " · changes unlimited until lock" : "");
        built += 1;
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        row.buildStatus = "Error · " + message;
        failures.push(row.eventName + " — " + message);
      }

      awardsAdminRenderBatchQuestionGrid_();
      awardsAdminSetBuildProgress_(i + 1, rows.length, (i + 1) + " of " + rows.length + " processed");
    }

    if (status) {
      status.className = failures.length ? "admin-message warning" : "admin-message success";
      status.textContent =
        built + " of " + rows.length + " unbuilt question" + (rows.length === 1 ? "" : "s") + " built." +
        (failures.length
          ? " Failed: " + failures.join(" | ")
          : " All selected provider markets were queued to the Hub with administrator review required.");
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Build All Unbuilt Questions";
    }
  }
}
// Backward-compatible name retained for older buttons/cache during the hotfix rollout.
async function adminAwardsBatchCreateSelected(button) {
  return adminAwardsLoadSelectedEvents(button);
}


function adminAwardsUpdateEventDraft_(eventIndex, field, value) {
  const event = (AWARDS_MANAGER_STATE.events || [])[eventIndex];
  if (!event) return;
  const key = awardsAdminEventKey_(event);
  const row = AWARDS_MANAGER_STATE.eventDraftsByKey[key];
  if (!row) return;
  if (field === "points") row.points = Math.max(0, Number(value) || 0);
  else if (field === "displayOrder") row.displayOrder = Math.max(0, Number(value) || 0);
  else if (field === "maxChanges") row.maxChanges = Number(value);
  else if (field === "include") row.include = value === true;
  else row[field] = String(value === undefined || value === null ? "" : value);
}

function adminAwardsUpdateDraftAnswer_(eventIndex, answerIndex, field, value) {
  const event = (AWARDS_MANAGER_STATE.events || [])[eventIndex];
  if (!event) return;
  const row = AWARDS_MANAGER_STATE.eventDraftsByKey[awardsAdminEventKey_(event)];
  const answer = row && (row.answers || [])[answerIndex];
  if (!answer) return;
  if (field === "include" || field === "showProbability") answer[field] = value === true;
  else answer[field] = String(value === undefined || value === null ? "" : value);
  const card = document.querySelector('#awardsInlineWorkspace-' + eventIndex + ' .awards-event-editor');
  if (card && field === "include") {
    const count = (row.answers || []).filter(function(item) { return item.include; }).length;
    const countNode = card.querySelector('[data-awards-draft-answer-count]');
    if (countNode) countNode.textContent = count + "/" + (row.answers || []).length + " included";
  }
}

function adminAwardsSetAllDraftAnswers_(eventIndex, checked) {
  const event = (AWARDS_MANAGER_STATE.events || [])[eventIndex];
  if (!event) return;
  const row = AWARDS_MANAGER_STATE.eventDraftsByKey[awardsAdminEventKey_(event)];
  if (!row) return;
  (row.answers || []).forEach(function(answer) { answer.include = checked === true; });
  awardsAdminRenderCompactEventEditor_(eventIndex, event, row.detail, row);
}

function awardsAdminRenderCompactEventEditor_(eventIndex, event, detail, existingRow) {
  const workspace = document.getElementById("awardsInlineWorkspace-" + eventIndex);
  if (!workspace) return;
  const row = existingRow || awardsAdminEventDraft_(event, detail);
  const game = awardsAdminGameById_(awardsAdminCurrentDefaults_().gameId);
  const gameType = awardsAdminCanonicalGameType_(game);
  const scoreDisabled = game && gameType !== "mixed";
  const includedAnswers = (row.answers || []).filter(function(answer) { return answer.include; }).length;
  const answerCount = (row.answers || []).length;

  workspace.innerHTML = `
    <div class="awards-event-editor">
      <div class="awards-event-editor-head">
        <div>
          <strong>${awardsAdminEsc_(row.eventName)}</strong>
          <div class="admin-sub"><b>${awardsAdminEsc_(awardsAdminProviderBadge_(row.provider))}</b> · ${answerCount} live market/answer${answerCount === 1 ? "" : "s"}</div>
        </div>
        <button type="button" class="admin-small-button secondary" onclick="adminAwardsCloseEventEditor_(${eventIndex})">Close</button>
      </div>

      <label class="admin-field awards-question-field">
        <span>Question</span>
        <input type="text" value="${awardsAdminEsc_(row.question)}" oninput="adminAwardsUpdateEventDraft_(${eventIndex}, 'question', this.value)">
        <span class="admin-sub">Change this only if you want different player-facing wording from the provider event title.</span>
      </label>

      <details class="awards-subdetails awards-event-advanced">
        <summary>Advanced Settings</summary>
        <div class="admin-control-grid awards-advanced-grid">
          <label class="admin-field"><span>Section</span><input type="text" value="${awardsAdminEsc_(row.section)}" oninput="adminAwardsUpdateEventDraft_(${eventIndex}, 'section', this.value)"></label>
          <label class="admin-field"><span>Points</span><input type="number" min="0" value="${Number(row.points) || 0}" oninput="adminAwardsUpdateEventDraft_(${eventIndex}, 'points', this.value)"></label>
          <label class="admin-field"><span>Question Order</span><input type="number" min="0" value="${Number(row.displayOrder) || 0}" oninput="adminAwardsUpdateEventDraft_(${eventIndex}, 'displayOrder', this.value)"></label>
          <label class="admin-field"><span>Question Display</span><select onchange="adminAwardsUpdateEventDraft_(${eventIndex}, 'layoutType', this.value)">${awardsAdminLayoutOptions_(row.layoutType)}</select></label>
          <label class="admin-field">
            <span>Play Type</span>
            <select ${scoreDisabled ? "disabled" : ""} onchange="adminAwardsUpdateEventDraft_(${eventIndex}, 'scoreMode', this.value)">${awardsAdminScoreModeOptions_(row.scoreMode)}</select>
            <span class="admin-sub">${scoreDisabled ? "Controlled by the selected game type." : "Hybrid games may override the play type for this question."}</span>
          </label>
          <label class="admin-field"><span>Pick Changes</span><select onchange="adminAwardsUpdateEventDraft_(${eventIndex}, 'maxChanges', this.value)">${awardsAdminPickChangeOptions_(row.maxChanges)}</select></label>
          <label class="admin-field"><span>Market Odds Display</span><select onchange="adminAwardsUpdateEventDraft_(${eventIndex}, 'showProbabilities', this.value)">${awardsAdminProbabilityOptions_(row.showProbabilities, true)}</select></label>
        </div>
      </details>

      <details class="awards-subdetails awards-market-answer-details">
        <summary>
          <span>Markets / Answers</span>
          <span class="admin-pill" data-awards-draft-answer-count>${includedAnswers}/${answerCount} included</span>
        </summary>
        <div class="admin-sub awards-market-help">Include controls whether the answer is created. Show Odds controls only whether the K/P percentage is visible to players. Answer Text can be renamed without changing the provider mapping.</div>
        <div class="admin-actions">
          <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllDraftAnswers_(${eventIndex}, true)">Include All</button>
          <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllDraftAnswers_(${eventIndex}, false)">Clear All</button>
        </div>
        ${awardsAdminAnswerCardsHtml_(row, eventIndex, "draft")}
      </details>

      <details class="awards-subdetails awards-existing-link-tools">
        <summary>Advanced Tool: Link Provider Market to an Existing Question</summary>
        <div class="admin-sub">Use this only when the PATTC Predicts question already exists and you want to attach a K/P market to it. Normal new questions should use Section 3 Build All instead.</div>
        <div class="admin-control-grid awards-advanced-grid">
          <label class="admin-field"><span>Provider Market</span><select id="awardsLinkMarket" onchange="adminAwardsSelectLinkMarket_(this.value)">${(detail.markets || []).map(function(item, index) { return `<option value="${index}">${awardsAdminEsc_(awardsAdminProviderBadge_(item.provider))} · ${awardsAdminEsc_(item.marketQuestion || item.externalMarketId)}</option>`; }).join("")}</select></label>
          <label class="admin-field"><span>PATTC Predicts Game</span><select id="awardsLinkGame" onchange="adminAwardsLoadGameQuestions(this.value)">${awardsAdminGameOptions_(awardsAdminCurrentDefaults_().gameId)}</select></label>
          <label class="admin-field"><span>Existing Question</span><select id="awardsLinkQuestion" onchange="adminAwardsRenderOutcomeMap()"><option value="">Choose game first…</option></select></label>
        </div>
        <div id="awardsOutcomeMap"></div>
        <div class="admin-actions"><button type="button" class="admin-small-button" onclick="adminAwardsLinkMarket(this)">Link Selected Market</button></div>
      </details>

      <div class="awards-event-editor-links">
        ${awardsAdminExternalLink_(detail.sourceUrl, "Open Provider")}
        ${awardsAdminExternalLink_(detail.officialSourceUrl || row.officialSourceUrl, "Open Official Site")}
      </div>
      <div id="awardsBuilderStatus" class="admin-message"></div>
    </div>
  `;

  AWARDS_MANAGER_STATE.selectedEvent = detail;
  AWARDS_MANAGER_STATE.eventMarkets = Array.isArray(detail.markets) ? detail.markets : [];
  AWARDS_MANAGER_STATE.selectedMarket = AWARDS_MANAGER_STATE.eventMarkets[0] || null;
  const presetGameId = awardsAdminCurrentDefaults_().gameId;
  if (presetGameId) adminAwardsLoadGameQuestions(presetGameId);
}

function adminAwardsCloseEventEditor_(eventIndex) {
  const workspace = document.getElementById("awardsInlineWorkspace-" + eventIndex);
  if (workspace) workspace.innerHTML = "";
}

function awardsAdminRenderEventBuilder_() {
  const builder = document.getElementById("awardsTargetBuilder");
  const event = AWARDS_MANAGER_STATE.selectedEvent;
  const markets = AWARDS_MANAGER_STATE.eventMarkets || [];
  if (!builder || !event) return;

  if (!markets.length) {
    builder.innerHTML = `<div class="admin-message warning">This provider event currently has no live markets.</div>`;
    return;
  }

  const defaults = awardsAdminCurrentDefaults_();
  const presetGameId = defaults.gameId || AWARDS_MANAGER_STATE.batchGameId || "";
  const presetScoreMode = presetGameId ? awardsAdminDefaultScoreModeForGame_(presetGameId) : defaults.scoreMode;
  const grouped = markets.length >= 2;
  const first = markets[0];

  builder.innerHTML = `
    <div class="admin-message" style="margin-top:10px;">
      This event uses the Section 1 official website and probability defaults unless you override them below. Use <b>Market Grid</b> in the batch builder when you want to configure many events together.
    </div>

    <div class="admin-control-grid" style="margin-top:12px;">
      <label class="admin-field">
        <span>PATTC Predicts Game</span>
        <select id="awardsCreateGame" onchange="adminAwardsSyncQuestionModeForGame_()">${awardsAdminGameOptions_(presetGameId)}</select>
        <span id="awardsCreateGameTypeNote" class="admin-sub"></span>
      </label>

      <label class="admin-field">
        <span>Question Play Type</span>
        <select id="awardsCreateScoreMode">${awardsAdminScoreModeOptions_(presetScoreMode || "fixed-points")}</select>
      </label>

      <label class="admin-field">
        <span>Question Display</span>
        <select id="awardsCreateLayoutType">${awardsAdminLayoutOptions_(defaults.layoutType)}</select>
      </label>

      <label class="admin-field">
        <span>Probability Display</span>
        <select id="awardsCreateShowProbabilities">${awardsAdminProbabilityOptions_("default", true)}</select>
      </label>

      <label class="admin-field">
        <span>Number of Changes</span>
        <select id="awardsCreateMaxChanges">${awardsAdminPickChangeOptions_(defaults.maxChanges)}</select>
      </label>

      <label class="admin-field" style="grid-column:span 2;">
        <span>Question</span>
        <input id="awardsCreateQuestion" type="text" value="${awardsAdminEsc_(event.eventName || first.marketQuestion || "")}">
      </label>

      <label class="admin-field"><span>Section</span><input id="awardsCreateSection" type="text" value="${awardsAdminEsc_(defaults.section)}"></label>
      <label class="admin-field"><span>Points</span><input id="awardsCreatePoints" type="number" min="0" value="${Number(defaults.points) || 0}"></label>
      <label class="admin-field"><span>Question Order</span><input id="awardsCreateDisplayOrder" type="number" min="0" value="${Number(defaults.startOrder) || 10}"></label>
      <label class="admin-field"><span>Change Penalty</span><input id="awardsCreateChangePenalty" type="number" min="0" value="0"></label>
    </div>

    <div class="admin-list-row" style="margin-top:12px;">
      <div>
        <b>Select Markets / Answers</b>
        <div class="admin-sub">Turn individual answers on/off. Show Odds controls the K/P percentage for that answer when question-level probabilities are enabled.</div>
      </div>
      <div class="admin-actions">
        <button type="button" class="admin-small-button secondary" onclick="awardsAdminSetAllEventMarkets_(true)">Select All</button>
        <button type="button" class="admin-small-button secondary" onclick="awardsAdminSetAllEventMarkets_(false)">Clear All</button>
      </div>
    </div>

    <div class="admin-list">
      ${grouped
        ? markets.map(function(item, index) {
            const label = awardsAdminGroupedAnswerLabel_(item);
            const yesValue = item.prices && item.prices.Yes !== undefined ? item.prices.Yes : item.primaryProbability;
            return `
              <div class="admin-list-row" style="align-items:flex-start;">
                <label style="display:flex;gap:8px;align-items:center;min-width:34px;"><input type="checkbox" class="awards-event-market-use" data-event-market-index="${index}" checked></label>
                <div style="flex:1;min-width:0;">
                  <div class="admin-sub">${awardsAdminEsc_(item.marketQuestion || item.externalMarketId)}</div>
                  <label class="admin-field" style="margin-top:6px;"><span>Answer ${index + 1}</span><input type="text" class="awards-event-answer-label" data-event-market-index="${index}" value="${awardsAdminEsc_(label)}"></label>
                  ${item.sourceUrl ? `<div style="margin-top:6px;">${awardsAdminExternalLink_(item.sourceUrl, "Open Original Market")}</div>` : ""}
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                  <span class="admin-pill">${awardsAdminEsc_(awardsAdminProviderBadge_(item.provider))} · ${awardsAdminPct_(yesValue)}</span>
                  <label class="admin-sub" style="display:flex;gap:5px;align-items:center;"><input type="checkbox" class="awards-event-market-probability" data-event-market-index="${index}" checked> Show Odds</label>
                </div>
              </div>`;
          }).join("")
        : (first.outcomes || []).map(function(outcome, index) {
            const probability = first.prices && first.prices[outcome] !== undefined ? first.prices[outcome] : "";
            return `
              <div class="admin-list-row" style="align-items:flex-start;">
                <label style="display:flex;gap:8px;align-items:center;min-width:34px;"><input type="checkbox" class="awards-event-outcome-use" data-event-outcome-index="${index}" data-outcome="${awardsAdminEsc_(outcome)}" checked></label>
                <div style="flex:1;min-width:0;">
                  <div class="admin-sub">${awardsAdminEsc_(first.marketQuestion || first.externalMarketId)}</div>
                  <label class="admin-field" style="margin-top:6px;"><span>Answer ${index + 1}</span><input type="text" class="awards-event-outcome-label" data-event-outcome-index="${index}" data-outcome="${awardsAdminEsc_(outcome)}" value="${awardsAdminEsc_(outcome)}"></label>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                  <span class="admin-pill">${awardsAdminEsc_(awardsAdminProviderBadge_(first.provider))} · ${awardsAdminPct_(probability)}</span>
                  <label class="admin-sub" style="display:flex;gap:5px;align-items:center;"><input type="checkbox" class="awards-event-outcome-probability" data-event-outcome-index="${index}" data-outcome="${awardsAdminEsc_(outcome)}" checked> Show Odds</label>
                </div>
              </div>`;
          }).join("")}
    </div>

    <div class="admin-actions"><button class="button admin-button" onclick="adminAwardsCreateFromMarket(this)">Create & Link Question</button></div>

    <details style="margin-top:12px;">
      <summary style="cursor:pointer;font-weight:800;">Link Provider Market to an Existing Question</summary>
      <div class="admin-sub" style="margin-top:6px;">Choose one provider market, then map its outcomes to answers that already exist in the selected PATTC Predicts question.</div>
      <div class="admin-control-grid" style="margin-top:10px;">
        <label class="admin-field"><span>Provider Market</span><select id="awardsLinkMarket" onchange="adminAwardsSelectLinkMarket_(this.value)">${markets.map(function(item, index) { return `<option value="${index}">${awardsAdminEsc_(awardsAdminProviderBadge_(item.provider))} · ${awardsAdminEsc_(item.marketQuestion || item.externalMarketId)}</option>`; }).join("")}</select></label>
        <label class="admin-field"><span>PATTC Predicts Game</span><select id="awardsLinkGame" onchange="adminAwardsLoadGameQuestions(this.value)">${awardsAdminGameOptions_(presetGameId)}</select></label>
        <label class="admin-field"><span>Existing Question</span><select id="awardsLinkQuestion" onchange="adminAwardsRenderOutcomeMap()"><option value="">${presetGameId ? "Loading questions…" : "Choose game first…"}</option></select></label>
      </div>
      <div id="awardsOutcomeMap"></div>
      <div class="admin-actions"><button type="button" class="admin-small-button" onclick="adminAwardsLinkMarket(this)">Link Selected Market</button></div>
    </details>

    <div id="awardsBuilderStatus" class="admin-message"></div>
  `;

  adminAwardsSyncQuestionModeForGame_();
  AWARDS_MANAGER_STATE.selectedMarket = first;
  if (presetGameId) adminAwardsLoadGameQuestions(presetGameId);
}


function adminAwardsSelectLinkMarket_(value) {
  const index = Number(value);
  const markets = AWARDS_MANAGER_STATE.eventMarkets || [];
  AWARDS_MANAGER_STATE.selectedMarket = markets[index] || markets[0] || null;
  adminAwardsRenderOutcomeMap();
}

function adminAwardsSyncQuestionModeForGame_() {
  const gameId = String((document.getElementById("awardsCreateGame") || {}).value || "");
  const scoreNode = document.getElementById("awardsCreateScoreMode");
  const note = document.getElementById("awardsCreateGameTypeNote");
  const game = awardsAdminGameById_(gameId);
  const type = awardsAdminCanonicalGameType_(game);
  if (!gameId || !game) {
    if (note) note.textContent = "";
    return;
  }
  const defaultMode = awardsAdminDefaultScoreModeForGame_(gameId);
  if (scoreNode && type !== "mixed") {
    scoreNode.value = defaultMode;
    scoreNode.disabled = true;
  } else if (scoreNode) {
    scoreNode.disabled = false;
  }
  if (note) {
    note.textContent = "Game Type: " + awardsAdminGameTypeLabel_(game) +
      (type === "ranking" ? " · Ranking creation is available, but the Ranking player engine is still being finished." : "");
  }
}

async function adminAwardsOpenEvent(index, button) {
  const event = (AWARDS_MANAGER_STATE.events || [])[index];
  if (!event) return;

  const workspace = document.getElementById("awardsInlineWorkspace-" + index);
  if (workspace && workspace.innerHTML.trim()) {
    workspace.innerHTML = "";
    if (button) button.textContent = "Configure";
    return;
  }

  document.querySelectorAll(".awards-inline-workspace").forEach(function(node) {
    if (node !== workspace) node.innerHTML = "";
  });

  const originalButtonText = button && button.textContent ? button.textContent : "Configure";
  if (button) {
    button.disabled = true;
    button.textContent = "Loading…";
  }
  if (workspace) workspace.innerHTML = '<div class="admin-message">Loading live markets…</div>';

  try {
    const detail = await awardsAdminGetEventDetailCached_(event);
    const row = awardsAdminEventDraft_(event, detail);
    awardsAdminRenderCompactEventEditor_(index, event, detail, row);
    if (workspace && typeof workspace.scrollIntoView === "function") {
      workspace.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } catch (err) {
    if (workspace) {
      workspace.innerHTML = '<div class="admin-message error">' + awardsAdminEsc_(err && err.message ? err.message : String(err)) + '</div>';
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalButtonText;
    }
  }
}
function adminAwardsChooseMarket(index, mode) {
  const market =
    AWARDS_MANAGER_STATE.results[index];

  if (!market) return;

  if (mode === "create") {
    const eventIndex =
      AWARDS_MANAGER_STATE.events.findIndex(
        function(event) {
          return (
            String(event.provider || "") ===
              String(market.provider || "") &&
            String(event.externalEventId || "") ===
              String(market.externalEventId || "")
          );
        }
      );

    if (eventIndex >= 0) {
      return adminAwardsOpenEvent(eventIndex);
    }
  }

  AWARDS_MANAGER_STATE.selectedMarket = market;
  AWARDS_MANAGER_STATE.mode = mode;
  AWARDS_MANAGER_STATE.targetSetup = null;

  const summary =
    document.getElementById(
      "awardsSelectedMarket"
    );

  if (summary) {
    summary.innerHTML = `
      <b>${awardsAdminEsc_(market.provider)}</b>
      ·
      ${awardsAdminEsc_(
        market.marketQuestion ||
        market.externalMarketId
      )}

      <div class="admin-sub">
        ${awardsAdminEsc_(
          market.externalMarketId
        )}
      </div>
    `;
  }

  const builder =
    document.getElementById(
      "awardsTargetBuilder"
    );

  if (!builder) return;

  builder.innerHTML = `
    <div class="admin-message warning">
      Event-first mode is active.
      Open the provider event to create a new question.
      Existing-question event mapping will be added separately.
    </div>
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
  const eventMarkets = Array.isArray(AWARDS_MANAGER_STATE.eventMarkets) ? AWARDS_MANAGER_STATE.eventMarkets : [];
  const market = eventMarkets[0] || AWARDS_MANAGER_STATE.selectedMarket;
  const gameId = String((document.getElementById("awardsCreateGame") || {}).value || "");
  const question = String((document.getElementById("awardsCreateQuestion") || {}).value || "").trim();
  const section = String((document.getElementById("awardsCreateSection") || {}).value || "Awards").trim() || "Awards";
  const points = Math.max(0, Number((document.getElementById("awardsCreatePoints") || {}).value || 0) || 0);
  const displayOrder = Math.max(0, Number((document.getElementById("awardsCreateDisplayOrder") || {}).value || 10) || 0);
  const layoutType = String((document.getElementById("awardsCreateLayoutType") || {}).value || "image");
  const scoreMode = String((document.getElementById("awardsCreateScoreMode") || {}).value || awardsAdminDefaultScoreModeForGame_(gameId));
  const maxChanges = Number((document.getElementById("awardsCreateMaxChanges") || {}).value || -1);
  const changePenalty = Math.max(0, Number((document.getElementById("awardsCreateChangePenalty") || {}).value || 0) || 0);
  const probabilityMode = String((document.getElementById("awardsCreateShowProbabilities") || {}).value || "default");
  const showMarketProbabilities = probabilityMode === "show" ? true : probabilityMode === "hide" ? false : awardsAdminCurrentDefaults_().showProbabilities !== "hide";
  const questionType = scoreMode === "ranking" ? "ranking" : "category-winner";
  const selectionMode = scoreMode === "ranking" ? "ranking" : "single";
  const status = document.getElementById("awardsBuilderStatus");

  let officialSourceUrl = "";
  try {
    officialSourceUrl = awardsAdminOfficialSourceUrl_() || String((AWARDS_MANAGER_STATE.selectedEvent || {}).officialSourceUrl || "").trim();
  } catch (urlErr) {
    if (status) { status.className = "admin-message warning"; status.textContent = urlErr.message || String(urlErr); }
    return;
  }

  if (!market || !gameId || !question) {
    if (status) { status.className = "admin-message warning"; status.textContent = "Choose a game and enter the question text."; }
    return;
  }

  const labels = {};
  const probabilityDisplay = {};
  const grouped = eventMarkets.length >= 2;
  let groupMarkets = [];
  let selectedOutcomes = [];

  if (grouped) {
    document.querySelectorAll(".awards-event-market-use[data-event-market-index]").forEach(function(checkbox) {
      if (!checkbox.checked) return;
      const index = Number(checkbox.dataset.eventMarketIndex);
      const item = eventMarkets[index];
      if (!item) return;
      const labelInput = document.querySelector('.awards-event-answer-label[data-event-market-index="' + index + '"]');
      const probabilityInput = document.querySelector('.awards-event-market-probability[data-event-market-index="' + index + '"]');
      const label = String(labelInput ? labelInput.value : awardsAdminGroupedAnswerLabel_(item)).trim();
      if (!label) return;
      groupMarkets.push(item);
      labels[String(item.externalMarketId || "")] = label;
      probabilityDisplay[String(item.externalMarketId || "")] = !probabilityInput || probabilityInput.checked;
    });

    if (groupMarkets.length < 2) {
      if (status) { status.className = "admin-message warning"; status.textContent = "Choose at least two markets/answers from this event."; }
      return;
    }
  } else {
    const first = eventMarkets[0] || market;
    document.querySelectorAll(".awards-event-outcome-use[data-outcome]").forEach(function(checkbox) {
      if (!checkbox.checked) return;
      const outcome = String(checkbox.dataset.outcome || "");
      if (!outcome) return;
      const index = Number(checkbox.dataset.eventOutcomeIndex);
      const labelInput = document.querySelector('.awards-event-outcome-label[data-event-outcome-index="' + index + '"]');
      const probabilityInput = document.querySelector('.awards-event-outcome-probability[data-event-outcome-index="' + index + '"]');
      const label = String(labelInput ? labelInput.value : outcome).trim();
      if (!label) return;
      selectedOutcomes.push(outcome);
      labels["outcome:" + outcome] = label;
      probabilityDisplay["outcome:" + outcome] = !probabilityInput || probabilityInput.checked;
    });

    if (!selectedOutcomes.length) {
      selectedOutcomes = Array.isArray(first.outcomes) ? first.outcomes.slice() : [];
      selectedOutcomes.forEach(function(outcome) {
        labels["outcome:" + outcome] = outcome;
        probabilityDisplay["outcome:" + outcome] = true;
      });
    }
    if (selectedOutcomes.length < 2) {
      if (status) { status.className = "admin-message warning"; status.textContent = "Choose at least two answers from this market."; }
      return;
    }
  }

  if (button) button.disabled = true;
  if (status) { status.className = "admin-message"; status.textContent = grouped ? "Creating one question from the selected event markets…" : "Creating question from the selected market answers…"; }

  try {
    const res = await apiAdminAwardsCreateQuestionFromMarket({
      gameId: gameId,
      question: question,
      section: section,
      points: points,
      displayOrder: displayOrder,
      layoutType: layoutType,
      scoreMode: scoreMode,
      questionType: questionType,
      selectionMode: selectionMode,
      maxChanges: maxChanges,
      changePenalty: changePenalty,
      showMarketProbabilities: showMarketProbabilities,
      probabilityDisplayJSON: JSON.stringify(probabilityDisplay),
      officialSourceUrl: officialSourceUrl,
      marketJSON: JSON.stringify(grouped ? groupMarkets[0] : market),
      groupMarketsJSON: grouped ? JSON.stringify(groupMarkets) : "",
      selectedOutcomesJSON: grouped ? "" : JSON.stringify(selectedOutcomes),
      answerLabelsJSON: JSON.stringify(labels)
    });

    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not create question.");
    if (status) {
      status.className = "admin-message success";
      status.textContent = (res.message || "Question created and linked.") + (officialSourceUrl ? " Official website saved as the preferred result reference." : "");
    }
  } catch (err) {
    if (status) { status.className = "admin-message error"; status.textContent = err.message || String(err); }
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
      status.textContent = "Map at least one provider outcome to an PATTC Predicts answer.";
    }
    return;
  }

  if (button) button.disabled = true;
  if (status) {
    status.className = "admin-message";
    status.textContent = "Saving mapping to the Hub bridge…";
  }

  try {
    const officialSourceUrl = document.getElementById("awardsOfficialSourceUrl")
      ? awardsAdminOfficialSourceUrl_()
      : "";
    const res = await apiAdminAwardsLinkMarket({
      gameId: gameId,
      categoryId: categoryId,
      outcomeMapJSON: JSON.stringify(outcomeMap),
      officialSourceUrl: officialSourceUrl,
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
