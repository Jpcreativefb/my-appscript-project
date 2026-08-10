
/* =====================================================
   AWARDS MANAGER — Admin Page v1.2.14
===================================================== */

const AWARDS_MANAGER_STATE = {
  dashboard: null,
  results: [],
  events: [],
  selectedEvent: null,
  eventMarkets: [],
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

function awardsAdminSearchEvents_(results) {
  const byKey = {};
  const order = [];

  (Array.isArray(results) ? results : [])
    .forEach(function(market) {
      if (!market) return;

      const provider = String(
        market.provider || ""
      ).toLowerCase();

      const eventId = String(
        market.externalEventId ||
        market.externalMarketId ||
        ""
      );

      const key = provider + "|" + eventId;

      if (!byKey[key]) {
        byKey[key] = {
          provider: provider,
          externalEventId: eventId,
          eventName:
            market.eventName ||
            market.marketQuestion ||
            eventId,
          markets: []
        };
        order.push(key);
      }

      byKey[key].markets.push(market);
    });

  return order.map(function(key) {
    return byKey[key];
  });
}

async function adminAwardsSearch(button) {
  const queryNode =
    document.getElementById("awardsSearchQuery");

  const providerNode =
    document.getElementById("awardsProvider");

  const status =
    document.getElementById("awardsSearchStatus");

  const resultsNode =
    document.getElementById("awardsSearchResults");

  if (
    !queryNode ||
    !providerNode ||
    !status ||
    !resultsNode
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

  if (button) button.disabled = true;

  status.className = "admin-message";
  status.textContent =
    "Searching live provider events…";

  resultsNode.innerHTML = "";

  try {
    const res =
      await apiAdminAwardsSearchExternalMarkets(
        providerNode.value,
        query
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

    AWARDS_MANAGER_STATE.results =
      Array.isArray(res.results)
        ? res.results
        : [];

    AWARDS_MANAGER_STATE.events =
      awardsAdminSearchEvents_(
        AWARDS_MANAGER_STATE.results
      );

    AWARDS_MANAGER_STATE.selectedEvent = null;
    AWARDS_MANAGER_STATE.eventMarkets = [];
    AWARDS_MANAGER_STATE.selectedMarket = null;

    const errors =
      Array.isArray(res.errors)
        ? res.errors
        : [];

    status.className =
      "admin-message " +
      (
        errors.length
          ? "warning"
          : "success"
      );

    status.textContent =
      AWARDS_MANAGER_STATE.events.length +
      " live event" +
      (
        AWARDS_MANAGER_STATE.events.length === 1
          ? ""
          : "s"
      ) +
      " found." +
      (
        errors.length
          ? " " + errors.join(" · ")
          : ""
      );

    resultsNode.innerHTML =
      AWARDS_MANAGER_STATE.events.length
        ? AWARDS_MANAGER_STATE.events
            .map(function(event, index) {
              const sample =
                event.markets &&
                event.markets[0];

              return `
                <div class="admin-category-card">
                  <div class="admin-category-header">
                    <div>
                      <strong>
                        ${awardsAdminEsc_(
                          event.eventName ||
                          event.externalEventId
                        )}
                      </strong>

                      <div class="admin-sub">
                        ${awardsAdminEsc_(
                          event.provider
                        )}
                        ·
                        ${awardsAdminEsc_(
                          event.externalEventId
                        )}
                      </div>

                      <div class="admin-sub">
                        ${
                          event.markets.length
                        }
                        matching market${
                          event.markets.length === 1
                            ? ""
                            : "s"
                        }
                        found in this search.
                        Open the event to load all live markets.
                      </div>

                      ${
                        sample &&
                        sample.closeTime
                          ? `
                            <div class="admin-sub">
                              Example close:
                              ${awardsAdminEsc_(
                                sample.closeTime
                              )}
                            </div>
                          `
                          : ""
                      }
                    </div>

                    <span class="admin-pill">
                      event
                    </span>
                  </div>

                  <div class="admin-actions">
                    <button
                      type="button"
                      class="admin-small-button"
                      onclick="adminAwardsOpenEvent(${index})"
                    >
                      View Event
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")
        : `
            <div class="admin-sub">
              No matching live events found.
              Try a broader term or the other provider.
            </div>
          `;
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

function awardsAdminSetAllEventMarkets_(checked) {
  document
    .querySelectorAll(
      ".awards-event-market-use"
    )
    .forEach(function(input) {
      input.checked = checked === true;
    });
}

function awardsAdminRenderEventBuilder_() {
  const builder =
    document.getElementById(
      "awardsTargetBuilder"
    );

  const event =
    AWARDS_MANAGER_STATE.selectedEvent;

  const markets =
    AWARDS_MANAGER_STATE.eventMarkets || [];

  if (!builder || !event) return;

  if (!markets.length) {
    builder.innerHTML = `
      <div class="admin-message warning">
        This provider event currently has no live markets.
      </div>
    `;
    return;
  }

  const grouped = markets.length >= 2;

  builder.innerHTML = `
    <div class="admin-control-grid" style="margin-top:12px;">
      <label class="admin-field">
        <span>Awards App Game</span>
        <select id="awardsCreateGame">
          ${awardsAdminGameOptions_("")}
        </select>
      </label>

      <label
        class="admin-field"
        style="grid-column:span 2;"
      >
        <span>Question</span>
        <input
          id="awardsCreateQuestion"
          type="text"
          value="${awardsAdminEsc_(
            event.eventName ||
            markets[0].marketQuestion ||
            ""
          )}"
        >
      </label>

      <label class="admin-field">
        <span>Section</span>
        <input
          id="awardsCreateSection"
          type="text"
          value="Awards"
        >
      </label>

      <label class="admin-field">
        <span>Points</span>
        <input
          id="awardsCreatePoints"
          type="number"
          min="0"
          value="1"
        >
      </label>
    </div>

    ${
      grouped
        ? `
          <div
            class="admin-list-row"
            style="margin-top:12px;"
          >
            <div>
              <b>Select Markets / Answers</b>
              <div class="admin-sub">
                ${markets.length}
                live markets are in this provider event.
                Each checked market becomes one answer.
              </div>
            </div>

            <div class="admin-actions">
              <button
                type="button"
                class="admin-small-button secondary"
                onclick="awardsAdminSetAllEventMarkets_(true)"
              >
                Select All
              </button>

              <button
                type="button"
                class="admin-small-button secondary"
                onclick="awardsAdminSetAllEventMarkets_(false)"
              >
                Clear All
              </button>
            </div>
          </div>

          <div class="admin-list">
            ${markets
              .map(function(item, index) {
                const label =
                  awardsAdminGroupedAnswerLabel_(
                    item
                  );

                const yesValue =
                  item.prices &&
                  item.prices.Yes !== undefined
                    ? item.prices.Yes
                    : item.primaryProbability;

                return `
                  <div
                    class="admin-list-row"
                    style="align-items:flex-start;"
                  >
                    <label
                      style="
                        display:flex;
                        gap:8px;
                        align-items:center;
                        min-width:34px;
                      "
                    >
                      <input
                        type="checkbox"
                        class="awards-event-market-use"
                        data-event-market-index="${index}"
                        checked
                      >
                    </label>

                    <div style="flex:1;min-width:0;">
                      <div class="admin-sub">
                        ${awardsAdminEsc_(
                          item.marketQuestion ||
                          item.externalMarketId
                        )}
                      </div>

                      <label
                        class="admin-field"
                        style="margin-top:6px;"
                      >
                        <span>
                          Answer ${index + 1}
                        </span>

                        <input
                          type="text"
                          class="awards-event-answer-label"
                          data-event-market-index="${index}"
                          value="${awardsAdminEsc_(
                            label
                          )}"
                        >
                      </label>
                    </div>

                    <span class="admin-pill">
                      ${awardsAdminPct_(
                        yesValue
                      )}
                    </span>
                  </div>
                `;
              })
              .join("")}
          </div>
        `
        : `
          <div
            id="awardsCreateAnswersPreview"
            style="margin-top:10px;"
          >
            <div class="admin-sub">
              Single-market event.
              Answers:
              ${(markets[0].outcomes || [])
                .map(awardsAdminEsc_)
                .join(", ")}
            </div>
          </div>
        `
    }

    <div class="admin-actions">
      <button
        class="button admin-button"
        onclick="adminAwardsCreateFromMarket(this)"
      >
        Create & Link Question
      </button>
    </div>

    <div
      id="awardsBuilderStatus"
      class="admin-message"
    ></div>
  `;
}

async function adminAwardsOpenEvent(index) {
  const event =
    AWARDS_MANAGER_STATE.events[index];

  if (!event) return;

  AWARDS_MANAGER_STATE.mode = "create";
  AWARDS_MANAGER_STATE.selectedEvent = null;
  AWARDS_MANAGER_STATE.eventMarkets = [];
  AWARDS_MANAGER_STATE.selectedMarket =
    event.markets &&
    event.markets[0]
      ? event.markets[0]
      : null;

  const summary =
    document.getElementById(
      "awardsSelectedMarket"
    );

  const builder =
    document.getElementById(
      "awardsTargetBuilder"
    );

  if (summary) {
    summary.innerHTML = `
      <b>
        ${awardsAdminEsc_(
          event.provider
        )}
      </b>
      ·
      ${awardsAdminEsc_(
        event.eventName ||
        event.externalEventId
      )}

      <div class="admin-sub">
        ${awardsAdminEsc_(
          event.externalEventId
        )}
      </div>
    `;
  }

  if (builder) {
    builder.innerHTML = `
      <div class="admin-message">
        Loading full provider event and all live markets…
      </div>
    `;
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
          ${awardsAdminEsc_(
            res.provider ||
            event.provider
          )}
        </b>
        ·
        ${awardsAdminEsc_(
          res.eventName ||
          event.eventName ||
          event.externalEventId
        )}

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
  const eventMarkets =
    Array.isArray(
      AWARDS_MANAGER_STATE.eventMarkets
    )
      ? AWARDS_MANAGER_STATE.eventMarkets
      : [];

  const market =
    eventMarkets[0] ||
    AWARDS_MANAGER_STATE.selectedMarket;

  const gameId = String(
    (
      document.getElementById(
        "awardsCreateGame"
      ) || {}
    ).value || ""
  );

  const question = String(
    (
      document.getElementById(
        "awardsCreateQuestion"
      ) || {}
    ).value || ""
  ).trim();

  const section = String(
    (
      document.getElementById(
        "awardsCreateSection"
      ) || {}
    ).value || "Awards"
  ).trim();

  const points = Number(
    (
      document.getElementById(
        "awardsCreatePoints"
      ) || {}
    ).value || 1
  );

  const status =
    document.getElementById(
      "awardsBuilderStatus"
    );

  if (
    !market ||
    !gameId ||
    !question
  ) {
    if (status) {
      status.className =
        "admin-message warning";

      status.textContent =
        "Choose a game and enter the question text.";
    }
    return;
  }

  const groupMarkets = [];
  const answerLabels = {};
  const grouped =
    eventMarkets.length >= 2;

  if (grouped) {
    document
      .querySelectorAll(
        ".awards-event-market-use[data-event-market-index]"
      )
      .forEach(function(checkbox) {
        if (!checkbox.checked) return;

        const index = Number(
          checkbox.dataset
            .eventMarketIndex
        );

        const item =
          eventMarkets[index];

        if (!item) return;

        const labelInput =
          document.querySelector(
            '.awards-event-answer-label[data-event-market-index="' +
            index +
            '"]'
          );

        const label = String(
          labelInput
            ? labelInput.value
            : awardsAdminGroupedAnswerLabel_(
                item
              )
        ).trim();

        if (!label) return;

        groupMarkets.push(item);

        answerLabels[
          item.externalMarketId
        ] = label;
      });

    if (groupMarkets.length < 2) {
      if (status) {
        status.className =
          "admin-message warning";

        status.textContent =
          "Choose at least two markets/answers from this event.";
      }
      return;
    }
  }

  if (button) button.disabled = true;

  if (status) {
    status.className =
      "admin-message";

    status.textContent = grouped
      ? "Creating one question from the selected event markets…"
      : "Creating question with batched answers and queuing Hub mapping…";
  }

  try {
    const res =
      await apiAdminAwardsCreateQuestionFromMarket({
        gameId: gameId,
        question: question,
        section: section,
        points: points,
        marketJSON:
          JSON.stringify(market),
        groupMarketsJSON: grouped
          ? JSON.stringify(
              groupMarkets
            )
          : "",
        answerLabelsJSON: grouped
          ? JSON.stringify(
              answerLabels
            )
          : ""
      });

    if (!res || res.success === false) {
      throw new Error(
        (
          res &&
          (res.error || res.message)
        ) ||
        "Could not create question."
      );
    }

    if (status) {
      status.className =
        "admin-message success";

      status.textContent =
        res.message ||
        "Question created and linked.";
    }
  } catch (err) {
    if (status) {
      status.className =
        "admin-message error";

      status.textContent =
        err.message ||
        String(err);
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
