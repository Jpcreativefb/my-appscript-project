
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
  marketModalRowIndex: -1
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
      One Awards App question will be created with one answer per selected provider market.
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

      <div class="admin-section">
        <div class="card admin-card">
          <h2>1. Game & Source Setup</h2>
          <div class="admin-sub">
            These are the defaults for every selected event. Each loaded question can still be changed individually before you build it.
          </div>

          <div class="admin-control-grid" style="margin-top:12px;">
            <label class="admin-field">
              <span>Awards App Game</span>
              <select id="awardsBatchGame" onchange="adminAwardsSyncBatchModeForGame_(this.value)">
                ${awardsAdminGameOptions_("")}
              </select>
              <span id="awardsBatchGameTypeNote" class="admin-sub"></span>
            </label>

            <label class="admin-field" style="grid-column:span 2;">
              <span>Official Website URL (preferred result source)</span>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input id="awardsOfficialSourceUrl" type="url" placeholder="https://www.emmys.com/..." style="flex:1;min-width:240px;">
                <button type="button" class="admin-small-button secondary" onclick="adminAwardsOpenOfficialSource()">Open Official Site</button>
              </div>
              <span class="admin-sub">Optional game-wide default. If blank, an event's provider settlement source can supply the official reference.</span>
            </label>

            <label class="admin-field">
              <span>Question Play Type</span>
              <select id="awardsBatchScoreMode">${awardsAdminScoreModeOptions_("auto")}</select>
            </label>

            <label class="admin-field">
              <span>Question Display</span>
              <select id="awardsBatchLayoutType">${awardsAdminLayoutOptions_("image")}</select>
              <span class="admin-sub">Text, Compact, or Image answer cards.</span>
            </label>

            <label class="admin-field">
              <span>Display Market Probabilities</span>
              <select id="awardsBatchShowProbabilities">${awardsAdminProbabilityOptions_("show", false)}</select>
              <span class="admin-sub">Controls K/P percentages on the player pick screen. Market data is still stored when hidden.</span>
            </label>

            <label class="admin-field">
              <span>Number of Changes</span>
              <select id="awardsBatchMaxChanges">${awardsAdminPickChangeOptions_(-1)}</select>
            </label>

            <label class="admin-field">
              <span>Default Section</span>
              <input id="awardsBatchSection" type="text" value="Awards">
            </label>

            <label class="admin-field">
              <span>Default Points</span>
              <input id="awardsBatchPoints" type="number" min="0" value="1">
            </label>

            <label class="admin-field">
              <span>First Question Order</span>
              <input id="awardsBatchStartOrder" type="number" min="0" value="10">
              <span class="admin-sub">Loaded questions increase by 10 so you can insert questions later.</span>
            </label>
          </div>

          <div class="admin-actions">
            <button type="button" class="admin-small-button secondary" onclick="adminAwardsApplyDefaultsToLoaded_()">Apply Defaults to Loaded Questions</button>
          </div>
        </div>

        <div class="card admin-card">
          <h2>2. Find & Select Events</h2>
          <div class="admin-sub">
            Search Kalshi and Polymarket live. Check every event you want in the game. View Event still expands directly under the selected event.
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
              <span>Find event</span>
              <input id="awardsSearchQuery" type="text" placeholder="Emmys, Best Drama, Survivor, World Cup…" onkeydown="if(event.key==='Enter'){adminAwardsSearch(document.getElementById('awardsSearchButton'))}">
            </label>
          </div>

          <details style="margin-top:10px;">
            <summary style="cursor:pointer;font-weight:700;">Advanced Search</summary>
            <div class="admin-control-grid" style="margin-top:12px;">
              <label class="admin-field"><span>Category contains</span><input id="awardsSearchCategory" type="text" placeholder="Entertainment, Television…"></label>
              <label class="admin-field"><span>Search in</span><select id="awardsSearchIn"><option value="both">Event + markets</option><option value="event">Event context only</option><option value="markets">Market questions only</option></select></label>
              <label class="admin-field"><span>Closing</span><select id="awardsSearchCloseDays"><option value="0">Any future date</option><option value="1">Next 24 hours</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="90">Next 90 days</option></select></label>
              <label class="admin-field"><span>Sort</span><select id="awardsSearchSort"><option value="relevance">Relevance</option><option value="title">Event title</option><option value="closing">Closing soon</option></select></label>
              <label class="admin-list-row" style="align-self:end;"><span><b>Exact phrase</b><div class="admin-sub">Require the typed phrase in provider text.</div></span><input id="awardsSearchExact" type="checkbox"></label>
            </div>
          </details>

          <div class="admin-actions">
            <button id="awardsSearchButton" type="button" class="button admin-button" onclick="adminAwardsSearch(this)">Search Events</button>
            <button id="awardsLoadMoreButton" type="button" class="button admin-button secondary" onclick="adminAwardsLoadMore(this)" style="display:none;">Load More Events</button>
            <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllEvents_(true)">Check All Results</button>
            <button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllEvents_(false)">Clear Event Checks</button>
          </div>

          <div id="awardsSearchStatus" class="admin-message"></div>
          <div class="admin-list-row" style="margin-top:10px;">
            <div><b>Selected events</b><div class="admin-sub">Load the checked events into the editable question grid.</div></div>
            <span id="awardsBatchCount" class="admin-pill">0 selected</span>
          </div>
          <div class="admin-actions">
            <button type="button" class="button admin-button" onclick="adminAwardsLoadSelectedEvents(this)">Load Selected Events & Questions</button>
          </div>
          <div id="awardsSearchResults" class="admin-list"></div>
        </div>

        <div class="card admin-card">
          <div class="admin-list-row" style="align-items:flex-start;">
            <div>
              <h2 style="margin:0;">3. Configure & Build Questions</h2>
              <div class="admin-sub">Edit question wording, section, points, order, display, scoring, changes, probability visibility, and exactly which markets/answers are included.</div>
            </div>
            <span id="awardsLoadedCount" class="admin-pill">0 loaded</span>
          </div>
          <div class="admin-actions">
            <button type="button" class="button admin-button" onclick="adminAwardsBuildLoadedQuestions(this)">Build All Loaded Questions</button>
            <button type="button" class="admin-small-button secondary" onclick="adminAwardsClearLoadedQuestions_()">Clear Loaded</button>
          </div>
          <div id="awardsBatchQuestionGrid" class="admin-list" style="margin-top:12px;"><div class="admin-sub">Select events above, then load them here.</div></div>
          <div id="awardsBatchStatus" class="admin-message"></div>
        </div>

        <div class="card admin-card">
          <h2>4. Result Safety</h2>
          <div class="admin-list">
            <div class="admin-list-row"><div><b>Live market source</b><div class="admin-sub">K/P probabilities are read-only and can be shown or hidden from players.</div></div><span class="admin-pill">Read only</span></div>
            <div class="admin-list-row"><div><b>External Results Hub</b><div class="admin-sub">Stores selected markets, mappings, watch state, reviews, and audit history.</div></div><span class="admin-pill">${dashboard.hubConfigured ? "Connected" : "Setup needed"}</span></div>
            <div class="admin-list-row"><div><b>Final scoring result</b><div class="admin-sub">Official website is preferred when supplied; final settlement still requires administrator review.</div></div><span class="admin-pill">Auto-settle OFF</span></div>
          </div>
        </div>
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

                <div class="admin-actions">
                  <button
                    type="button"
                    class="admin-small-button"
                    onclick="adminAwardsOpenEvent(${index}, this)"
                  >
                    View Event
                  </button>

                  <button
                    type="button"
                    class="admin-small-button secondary"
                    onclick="adminAwardsOpenMarketGridFromSearch(${index}, this)"
                  >
                    Market Grid
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

  awardsAdminUpdateBatchCount_();
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
  if (!scoreNode) return;

  if (!game) {
    scoreNode.disabled = false;
    if (note) note.textContent = "";
    return;
  }

  if (type !== "mixed") {
    scoreNode.value = awardsAdminDefaultScoreModeForGame_(gameId);
    scoreNode.disabled = true;
    if (note) note.textContent = "This game uses " + awardsAdminGameTypeLabel_(game) + "; questions will follow that play type.";
  } else {
    scoreNode.disabled = false;
    if (scoreNode.value !== "auto" && !scoreNode.value) scoreNode.value = "auto";
    if (note) note.textContent = "Hybrid game: each loaded question may use a different play type.";
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
    if (status) { status.className = "admin-message warning"; status.textContent = "Choose the Awards App game in Section 1 first."; }
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
        const row = awardsAdminMakeBatchRow_(event, detail, rows.length, defaults);
        if (!row.answers.length) throw new Error("No live markets/answers were available.");
        rows.push(row);
      } catch (err) {
        failures.push((event.eventName || event.externalEventId) + " — " + (err && err.message ? err.message : String(err)));
      }
      if (status) status.textContent = "Loaded " + (i + 1) + " of " + selected.length + " selected events…";
    }
    AWARDS_MANAGER_STATE.batchRows = rows;
    awardsAdminRenderBatchQuestionGrid_();
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
    const statusClass = row.buildStatus && row.buildStatus.indexOf("Built") === 0 ? "success" : row.buildStatus && row.buildStatus.indexOf("Error") === 0 ? "warning" : "";
    return `
      <div class="admin-category-card" data-awards-batch-row="${index}">
        <div class="admin-category-header" style="align-items:flex-start;">
          <div style="min-width:0;flex:1;">
            <strong>${awardsAdminEsc_(row.eventName)}</strong>
            <div class="admin-sub"><b>${awardsAdminEsc_(awardsAdminProviderBadge_(row.provider))}</b> · ${awardsAdminEsc_(row.externalEventId)}</div>
          </div>
          <label class="admin-pill" style="display:flex;gap:6px;align-items:center;cursor:pointer;"><input type="checkbox" ${row.include ? "checked" : ""} onchange="adminAwardsUpdateBatchRow_(${index}, 'include', this.checked)"> Build</label>
        </div>

        <div class="admin-control-grid" style="margin-top:10px;">
          <label class="admin-field" style="grid-column:span 2;"><span>Question</span><input type="text" value="${awardsAdminEsc_(row.question)}" oninput="adminAwardsUpdateBatchRow_(${index}, 'question', this.value)"></label>
          <label class="admin-field"><span>Section</span><input type="text" value="${awardsAdminEsc_(row.section)}" oninput="adminAwardsUpdateBatchRow_(${index}, 'section', this.value)"></label>
          <label class="admin-field"><span>Points</span><input type="number" min="0" value="${Number(row.points) || 0}" oninput="adminAwardsUpdateBatchRow_(${index}, 'points', this.value)"></label>
          <label class="admin-field"><span>Question Order</span><input type="number" min="0" value="${Number(row.displayOrder) || 0}" oninput="adminAwardsUpdateBatchRow_(${index}, 'displayOrder', this.value)"></label>
          <label class="admin-field"><span>Question Display</span><select onchange="adminAwardsUpdateBatchRow_(${index}, 'layoutType', this.value)">${awardsAdminLayoutOptions_(row.layoutType)}</select></label>
          <label class="admin-field"><span>Play Type</span><select ${scoreDisabled ? "disabled" : ""} onchange="adminAwardsUpdateBatchRow_(${index}, 'scoreMode', this.value)">${awardsAdminScoreModeOptions_(row.scoreMode)}</select></label>
          <label class="admin-field"><span>Number of Changes</span><select onchange="adminAwardsUpdateBatchRow_(${index}, 'maxChanges', this.value)">${awardsAdminPickChangeOptions_(row.maxChanges)}</select></label>
          <label class="admin-field"><span>Probability Display</span><select onchange="adminAwardsUpdateBatchRow_(${index}, 'showProbabilities', this.value)">${awardsAdminProbabilityOptions_(row.showProbabilities, true)}</select></label>
        </div>

        <div class="admin-actions">
          <button type="button" class="admin-small-button" onclick="adminAwardsOpenMarketGrid_(${index})">Markets / Answers (${includedAnswers}/${answerCount})</button>
          ${awardsAdminExternalLink_(row.detail && row.detail.sourceUrl, "Open Provider Event")}
          ${awardsAdminExternalLink_(row.officialSourceUrl, "Open Event Official Source")}
          <button type="button" class="admin-small-button secondary" onclick="adminAwardsRemoveBatchRow_(${index})">Remove</button>
        </div>
        ${row.buildStatus ? `<div class="admin-message ${statusClass}" style="margin-top:8px;">${awardsAdminEsc_(row.buildStatus)}</div>` : ""}
      </div>
    `;
  }).join("");
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
  const answers = row.answers || [];
  const globalSetting = awardsAdminCurrentDefaults_().showProbabilities === "hide" ? "Hide" : "Show";
  return `
    <div style="position:fixed;inset:0;background:rgba(2,6,23,.78);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:4vh 12px;overflow:auto;" onclick="if(event.target===this)adminAwardsCloseMarketGrid_()">
      <div class="card admin-card" style="width:min(1100px,96vw);max-height:90vh;overflow:auto;box-shadow:0 24px 70px rgba(0,0,0,.5);">
        <div class="admin-list-row" style="align-items:flex-start;position:sticky;top:0;background:inherit;z-index:2;padding-bottom:10px;">
          <div><h2 style="margin:0;">Market / Answer Grid</h2><div class="admin-sub">${awardsAdminEsc_(row.eventName)} · ${awardsAdminEsc_(awardsAdminProviderBadge_(row.provider))}</div></div>
          <button type="button" class="admin-small-button secondary" onclick="adminAwardsCloseMarketGrid_()">Close</button>
        </div>
        <div class="admin-message" style="margin:8px 0;">Question probability setting: <b>${awardsAdminEsc_(row.showProbabilities === "default" ? "Use Game Setting (" + globalSetting + ")" : (row.showProbabilities === "hide" ? "Hide" : "Show"))}</b>. Each answer can also suppress its own K/P percentage.</div>
        ${editable ? `<div class="admin-actions"><button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllBatchAnswers_(${rowIndex}, true)">Include All</button><button type="button" class="admin-small-button secondary" onclick="adminAwardsSetAllBatchAnswers_(${rowIndex}, false)">Clear All</button></div>` : `<div class="admin-sub">Inspection only. Load this event into Section 3 to change included answers.</div>`}
        <div style="overflow-x:auto;margin-top:10px;">
          <table style="width:100%;border-collapse:collapse;min-width:820px;">
            <thead><tr><th style="text-align:left;padding:8px;">Include</th><th style="text-align:left;padding:8px;">Show Odds</th><th style="text-align:left;padding:8px;">Answer</th><th style="text-align:left;padding:8px;">Provider Market</th><th style="text-align:left;padding:8px;">Probability</th><th style="text-align:left;padding:8px;">Source</th></tr></thead>
            <tbody>
              ${answers.map(function(answer, answerIndex) {
                return `<tr style="border-top:1px solid rgba(148,163,184,.22);">
                  <td style="padding:8px;"><input type="checkbox" ${answer.include ? "checked" : ""} ${editable ? `onchange="adminAwardsToggleBatchAnswer_(${rowIndex}, ${answerIndex}, 'include', this.checked)"` : "disabled"}></td>
                  <td style="padding:8px;"><input type="checkbox" ${answer.showProbability ? "checked" : ""} ${editable ? `onchange="adminAwardsToggleBatchAnswer_(${rowIndex}, ${answerIndex}, 'showProbability', this.checked)"` : "disabled"}></td>
                  <td style="padding:8px;min-width:180px;">${editable ? `<input type="text" value="${awardsAdminEsc_(answer.label)}" style="width:100%;" oninput="adminAwardsToggleBatchAnswer_(${rowIndex}, ${answerIndex}, 'label', this.value)">` : awardsAdminEsc_(answer.label)}</td>
                  <td style="padding:8px;min-width:260px;">${awardsAdminEsc_(answer.marketQuestion)}</td>
                  <td style="padding:8px;white-space:nowrap;"><b>${awardsAdminEsc_(awardsAdminProviderBadge_(answer.provider))}</b> · ${awardsAdminPct_(answer.probability)}</td>
                  <td style="padding:8px;white-space:nowrap;">${awardsAdminExternalLink_(answer.sourceUrl, "Open")}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <div class="admin-actions" style="margin-top:12px;"><button type="button" class="button admin-button" onclick="adminAwardsCloseMarketGrid_()">Done</button></div>
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
  if (!gameId) throw new Error("Choose the Awards App game in Section 1.");
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
  const rows = (AWARDS_MANAGER_STATE.batchRows || []).filter(function(row) { return row.include !== false; });
  if (!defaults.gameId) {
    if (status) { status.className = "admin-message warning"; status.textContent = "Choose the Awards App game in Section 1 first."; }
    return;
  }
  if (!rows.length) {
    if (status) { status.className = "admin-message warning"; status.textContent = "Load at least one question first."; }
    return;
  }

  if (button) button.disabled = true;
  let built = 0;
  const failures = [];
  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      row.buildStatus = "Building…";
      awardsAdminRenderBatchQuestionGrid_();
      if (status) { status.className = "admin-message"; status.textContent = "Building " + (i + 1) + " of " + rows.length + ": " + row.question; }
      try {
        const payload = awardsAdminBuildPayloadForRow_(row);
        const response = await apiAdminAwardsCreateQuestionFromMarket(payload);
        if (!response || response.success === false) throw new Error((response && (response.error || response.message)) || "Create failed.");
        row.buildStatus = "Built · " + (response.categoryId || "question created");
        built += 1;
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        row.buildStatus = "Error · " + message;
        failures.push(row.eventName + " — " + message);
      }
      awardsAdminRenderBatchQuestionGrid_();
    }

    if (status) {
      status.className = failures.length ? "admin-message warning" : "admin-message success";
      status.textContent = built + " of " + rows.length + " question" + (rows.length === 1 ? "" : "s") + " built." + (failures.length ? " Failed: " + failures.join(" | ") : " All selected provider markets were queued to the Hub with administrator review required.");
    }
  } finally {
    if (button) button.disabled = false;
  }
}

// Backward-compatible name retained for older buttons/cache during the hotfix rollout.
async function adminAwardsBatchCreateSelected(button) {
  return adminAwardsLoadSelectedEvents(button);
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
        <span>Awards App Game</span>
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
      <div class="admin-sub" style="margin-top:6px;">Choose one provider market, then map its outcomes to answers that already exist in the selected Awards App question.</div>
      <div class="admin-control-grid" style="margin-top:10px;">
        <label class="admin-field"><span>Provider Market</span><select id="awardsLinkMarket" onchange="adminAwardsSelectLinkMarket_(this.value)">${markets.map(function(item, index) { return `<option value="${index}">${awardsAdminEsc_(awardsAdminProviderBadge_(item.provider))} · ${awardsAdminEsc_(item.marketQuestion || item.externalMarketId)}</option>`; }).join("")}</select></label>
        <label class="admin-field"><span>Awards App Game</span><select id="awardsLinkGame" onchange="adminAwardsLoadGameQuestions(this.value)">${awardsAdminGameOptions_(presetGameId)}</select></label>
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
  const event =
    AWARDS_MANAGER_STATE.events[index];

  if (!event) return;

  const originalButtonText =
    button && button.textContent
      ? button.textContent
      : "View Event";

  if (button) {
    button.disabled = true;
    button.textContent = "Loading Event…";
  }

  AWARDS_MANAGER_STATE.mode = "create";
  AWARDS_MANAGER_STATE.selectedEvent = null;
  AWARDS_MANAGER_STATE.eventMarkets = [];
  AWARDS_MANAGER_STATE.selectedMarket =
    event.markets &&
    event.markets[0]
      ? event.markets[0]
      : null;

  const workspace = document.getElementById("awardsInlineWorkspace-" + index);

  document.querySelectorAll(".awards-inline-workspace").forEach(function(node) {
    if (node !== workspace) node.innerHTML = "";
  });

  if (workspace) {
    workspace.innerHTML = `
      <div class="card admin-card" style="margin-top:12px;" tabindex="-1">
        <h3 style="margin-top:0;">Build or Link Questions</h3>
        <div id="awardsSelectedMarket" class="admin-sub">
          <b>${awardsAdminEsc_(awardsAdminProviderBadge_(event.provider))}</b> ·
          ${awardsAdminEsc_(event.eventName || event.externalEventId)}
          <div class="admin-sub">${awardsAdminEsc_(event.externalEventId)}</div>
        </div>
        <div id="awardsTargetBuilder">
          <div class="admin-message">Loading full provider event and all live markets…</div>
        </div>
      </div>
    `;
  }

  const summary = document.getElementById("awardsSelectedMarket");
  const builder = document.getElementById("awardsTargetBuilder");

  if (
    workspace &&
    typeof workspace.scrollIntoView === "function"
  ) {
    workspace.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

  try {
    const res =
      await apiAdminAwardsGetExternalEvent(
        event.provider,
        event.externalEventId
      );

    if (!res || res.success === false) {
      throw new Error(
        (
          res &&
          (res.error || res.message)
        ) ||
        "Could not load provider event."
      );
    }

    AWARDS_MANAGER_STATE.selectedEvent = res;

    AWARDS_MANAGER_STATE.eventMarkets =
      Array.isArray(res.markets)
        ? res.markets
        : [];

    AWARDS_MANAGER_STATE.selectedMarket =
      AWARDS_MANAGER_STATE.eventMarkets[0] ||
      AWARDS_MANAGER_STATE.selectedMarket;

    if (summary) {
      summary.innerHTML = `
        <b>
          ${awardsAdminEsc_(awardsAdminProviderBadge_(
            res.provider ||
            event.provider
          ))}
        </b>
        ·
        ${awardsAdminEsc_(
          res.eventName ||
          event.eventName ||
          event.externalEventId
        )}

        <div class="admin-sub">
          ${awardsAdminEsc_(
            [
              res.category,
              res.contextSubtitle,
              res.seriesTicker
            ]
              .filter(Boolean)
              .join(" · ")
          )}
        </div>

        <div class="admin-sub">
          ${awardsAdminEsc_(
            res.externalEventId ||
            event.externalEventId
          )}
          ·
          ${
            AWARDS_MANAGER_STATE
              .eventMarkets.length
          }
          live market${
            AWARDS_MANAGER_STATE
              .eventMarkets.length === 1
              ? ""
              : "s"
          }
        </div>

        ${
          res.contextComplete === false
            ? `
              <div
                class="admin-message warning"
                style="margin-top:8px;"
              >
                Context unavailable or incomplete.
                Verify the provider before creating or linking a question.
              </div>
            `
            : ""
        }

        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
          ${awardsAdminExternalLink_(
            res.sourceUrl,
            "Open Provider Event"
          )}
          ${awardsAdminExternalLink_(
            res.officialSourceUrl,
            "Open Official Website"
          )}
        </div>
      `;
    }

    awardsAdminRenderEventBuilder_();
  } catch (err) {
    if (builder) {
      builder.innerHTML = `
        <div class="admin-message error">
          ${awardsAdminEsc_(
            err && err.message
              ? err.message
              : String(err)
          )}
        </div>
      `;
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
