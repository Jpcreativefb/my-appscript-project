/* =========================
   PICKS PAGE
========================= */

let PICKS_PAGE_DATA = {
  session: null,
  gameId: "",
  game: null,
  isConfidenceGame: false,
  confidenceScoringMode: "win_only",
  categories: [],
  picks: {},
  changeCounts: {},
  originalPicks: {},
  confidencePoints: {},
  stakePoints: {},
  stakeSummary: {},
  pickMeta: {},
  seasonAnchor: null
};

let PICKS_COUNTDOWN_TIMER = null;

function isHybridPicksGame_() {

  const game =
    PICKS_PAGE_DATA.game || {};

  const type =
    String(game.type || localStorage.getItem("gameMode") || "")
      .trim()
      .toLowerCase();

  const format =
    String(game.gameFormat || "")
      .trim()
      .toLowerCase();

  return (
    type === "mixed" ||
    type === "hybrid" ||
    type === "combo" ||
    format === "hybrid" ||
    game.mixedGame === true
  );

}

function renderHybridPicksBackButton_() {

  if (!isHybridPicksGame_()) {
    return "";
  }

  return `
    <button
      type="button"
      class="dashboard-action-button secondary"
      onclick="navigate('game-hub')"
    >
      ← Back to Game Sections
    </button>
  `;

}


function formatSeasonAnchorMultiplier_(value) {
  const number = Number(value);
  return (Number.isFinite(number) ? number : 1).toFixed(2) + "x";
}

function formatSeasonAnchorLock_(value) {
  if (!value) return "No lock time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderSeasonAnchorPickCard_() {
  const anchor = PICKS_PAGE_DATA.seasonAnchor;
  if (!anchor || anchor.enabled !== true) return "";
  const settings = anchor.settings || {};
  const user = anchor.user || null;
  const entities = Array.isArray(anchor.entities) ? anchor.entities : [];
  const currentId = user ? String(user.currentEntityId || "") : "";
  const needsPick = !user || String(user.status || "NEEDS_PICK").toUpperCase() === "NEEDS_PICK" || !currentId;
  const currentMultiplier = user ? Number(user.currentMultiplier || settings.StartMultiplier || 1) : Number(settings.StartMultiplier || 1);
  const growth = Number(settings.GrowthPerSuccess || 0);
  const cap = Number(settings.MaxMultiplier || currentMultiplier);
  const nextMultiplier = Math.min(cap, currentMultiplier + growth);
  const canChoose = anchor.canChoose === true;
  const locked = anchor.locked === true;
  const switchText = user && currentId && !needsPick
    ? (settings.ManualSwitchAllowed ? "Changing before lock resets the streak and multiplier." : "Manual switching is disabled until this pick is eliminated.")
    : "Choose any currently active contestant. Late starters begin at the base multiplier.";
  const optionHtml = entities.map(function(item) {
    return `<option value="${escapeAttr(item.id)}" ${String(item.id) === currentId ? "selected" : ""}>${escapeHtml(item.name)}${item.teamOrTribe ? " — " + escapeHtml(item.teamOrTribe) : ""}</option>`;
  }).join("");
  const currentSummary = needsPick
    ? `<div class="season-anchor-current-pick needs-pick">
        <span class="season-anchor-label">New selection needed</span>
        <strong>${user && user.currentEntityName ? escapeHtml(user.currentEntityName) + " was eliminated" : "Choose an active contestant"}</strong>
        <span>Your next pick starts at ${formatSeasonAnchorMultiplier_(settings.StartMultiplier || 1)}.</span>
      </div>`
    : `<div class="season-anchor-current-pick">
        <span class="season-anchor-label">Current pick</span>
        <strong>${escapeHtml(user.currentEntityName || currentId)}</strong>
        <span>${Number(user.streak || 0)} successful episode${Number(user.streak || 0) === 1 ? "" : "s"}</span>
      </div>`;

  return `
    <section class="season-anchor-card ${needsPick ? "needs-pick" : "active"}">
      <div class="season-anchor-card-header">
        <div>
          <span class="season-anchor-eyebrow">Optional season bonus</span>
          <h2>${escapeHtml(settings.DisplayLabel || "Season Survivor Pick")}</h2>
          <p>Keep the same contestant while they remain active. Your normal picks still score at their regular value.</p>
        </div>
        <span class="season-anchor-status ${locked ? "locked" : "open"}">${locked ? "Locked" : "Open"}</span>
      </div>
      <div class="season-anchor-summary-grid">
        ${currentSummary}
        <div><span>Current multiplier</span><strong>${formatSeasonAnchorMultiplier_(currentMultiplier)}</strong></div>
        <div><span>Next survival</span><strong>${formatSeasonAnchorMultiplier_(nextMultiplier)}</strong></div>
        <div><span>Maximum weekly bonus</span><strong>${Number(anchor.maxWeeklyBonus || 0).toLocaleString()} pts</strong></div>
        <div><span>${escapeHtml(anchor.episode ? anchor.episode.episodeName : "Current period")}</span><strong>${escapeHtml(formatSeasonAnchorLock_(anchor.episode && anchor.episode.lockDateTime))}</strong></div>
      </div>
      ${canChoose ? `
        <div class="season-anchor-picker">
          <label for="seasonAnchorEntitySelect">${needsPick ? "Select your contestant" : "Keep or change your contestant"}</label>
          <div class="season-anchor-picker-row">
            <select id="seasonAnchorEntitySelect" class="input">
              <option value="">Choose a contestant…</option>
              ${optionHtml}
            </select>
            <button type="button" class="button" onclick="saveSeasonAnchorPick_()">${needsPick ? "Save Survivor Pick" : "Update Pick"}</button>
          </div>
          <small>${escapeHtml(switchText)}</small>
        </div>
      ` : `<div class="season-anchor-locked-note">${locked ? "The selection window is closed for this episode." : escapeHtml(switchText)}</div>`}
      <div class="season-anchor-rules-line">
        Growth: +${Number(settings.GrowthPerSuccess || 0).toFixed(2)}x · Cap: ${formatSeasonAnchorMultiplier_(settings.MaxMultiplier || 1)} · Eligible points cap: ${Number(settings.EligiblePointsCap || 0)} · Loss penalty: -${Number(settings.LossPenalty || 0)}
      </div>
    </section>
  `;
}

async function saveSeasonAnchorPick_() {
  const anchor = PICKS_PAGE_DATA.seasonAnchor || {};
  const select = document.getElementById("seasonAnchorEntitySelect");
  const entityId = select ? String(select.value || "") : "";
  if (!entityId) {
    showPicksMessage("Choose a contestant first.", true);
    return;
  }
  const existingId = anchor.user ? String(anchor.user.currentEntityId || "") : "";
  if (existingId && existingId !== entityId) {
    if (!window.confirm("Change your Season Survivor pick?\n\nYour streak and multiplier will reset to the starting value.")) return;
  }
  showPicksMessage("Saving Season Survivor pick…", false);
  try {
    const response = await apiSaveSeasonAnchorPick(PICKS_PAGE_DATA.gameId, entityId);
    if (!response || response.success === false) throw new Error((response && (response.error || response.message)) || "Could not save the Season Survivor pick.");
    clearStartupPayload();
    showPicksMessage(response.message || "Season Survivor pick saved.", false);
    navigate("picks");
  } catch (err) {
    showPicksMessage(err.message || String(err), true);
  }
}

/* =========================
   RENDER PAGE
========================= */

async function renderPicksPage() {

  const session =
    getSession();

  if (!session || !session.username) {
    return `
      <div class="page picks-page">
        <h1>Make Your Picks</h1>

        <div class="card">
          You must be logged in.
        </div>
      </div>
    `;
  }

  let payload;

  try {

    payload =
      await loadStartupPayload();

  } catch (err) {

    console.error(
      "PICKS STARTUP PAYLOAD ERROR",
      err
    );

    return `
      <div class="page picks-page">
        <h1>Make Your Picks</h1>

        ${renderErrorCard(
          "Could not load picks",
          err.message ||
          "The picks data failed to load. Please refresh and try again."
        )}
      </div>
    `;

  }

  const gameId =
  payload.gameId ||
  session.gameId ||
  getFrontendGameId() ||
  "";

const game =
  payload.game ||
  payload.gameConfig ||
  null;

const isConfidenceGame =
  !!(
    game &&
    (
      game.type === "confidence" ||
      game.confidenceEnabled === true
    )
  );

const confidenceScoringMode =
  game && game.confidenceScoringMode
    ? game.confidenceScoringMode
    : "win_only";  


PICKS_PAGE_DATA.session =
  session;

PICKS_PAGE_DATA.gameId =
  gameId;

PICKS_PAGE_DATA.game =
  game;

PICKS_PAGE_DATA.isConfidenceGame =
  isConfidenceGame;

PICKS_PAGE_DATA.confidenceScoringMode =
  confidenceScoringMode;  

  const categories =
    payload.categories || [];

  const picksResponse =
    payload.picks || {};

  PICKS_PAGE_DATA.categories =
    Array.isArray(categories)
      ? categories
      : [];

  PICKS_PAGE_DATA.picks =
    picksResponse.picks || {};

  PICKS_PAGE_DATA.changeCounts =
    picksResponse.changeCounts || {};

  PICKS_PAGE_DATA.originalPicks =
    picksResponse.originalPicks || {};
  
  PICKS_PAGE_DATA.confidencePoints =
    picksResponse.confidencePoints || {};

  PICKS_PAGE_DATA.stakePoints =
    picksResponse.stakePoints || {};

  PICKS_PAGE_DATA.stakeSummary =
    picksResponse.stakeSummary || {};
  
  PICKS_PAGE_DATA.pickMeta =
    picksResponse.pickMeta || {};

  PICKS_PAGE_DATA.seasonAnchor =
    payload.seasonAnchor || null;

  setTimeout(
    mountPicksPage,
    0
  );

  return `
    <div class="page picks-page">

      ${renderHybridPicksBackButton_()}

      <div class="picks-page-header">
        <h1>Make Your Picks</h1>
        <p>
          ${
            hasConfidencePointsCategories() && hasStakedPointsCategories()
              ? "This hybrid game includes confidence and staked predictions. Each question shows the scoring method it uses."
              : hasConfidencePointsCategories()
                ? getConfidenceGameInstructions()
                : hasStakedPointsCategories()
                  ? "Choose how many prediction points to risk first. Then choose an answer and confirm the pick. Pending stakes reduce the points available for other questions."
                  : "Pick changes may reduce available points. Locked categories cannot be changed."
          }
        </p>

        ${hasConfidencePointsCategories() ? renderConfidenceSummaryBar() : ""}
        ${hasStakedPointsCategories() ? renderStakedPointsSummaryBar() : ""}

      </div>

      ${renderSeasonAnchorPickCard_()}

      <div id="picksPageMessage" class="picks-message hidden"></div>

      <div id="picksCategoryList" class="picks-category-list">
        ${renderPicksCategoryList()}
      </div>

    </div>
  `;

}

function getConfidenceGameInstructions() {

  if (
    PICKS_PAGE_DATA.confidenceScoringMode ===
    "risk_penalty"
  ) {

    return "Choose a pick and assign each confidence number once. Correct picks gain points; wrong picks lose the points assigned.";

  }

  return "Choose a pick and assign each confidence number once. Correct picks gain points; wrong picks receive zero.";

}

function normalizePicksScoreMode_(value) {
  const mode = String(value || "correct-pick")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (
    mode === "staked" ||
    mode === "stake" ||
    mode === "staked-points" ||
    mode === "confidence-stake"
  ) {
    return "staked-points";
  }

  if (
    mode === "wager" ||
    mode === "wager-odds" ||
    mode === "sports-wager"
  ) {
    return "wager";
  }

  if (mode === "ranking" || mode === "ranked") {
    return "ranking";
  }

  if (
    mode === "confidence" ||
    mode === "confidence-points" ||
    mode === "confidence-pool"
  ) {
    return "confidence-points";
  }

  if (
    mode === "fixed" ||
    mode === "fixed-points" ||
    mode === "standard-points"
  ) {
    return "fixed-points";
  }

  return "correct-pick";
}

function isStakedPointsCategory(category) {
  return normalizePicksScoreMode_(
    category && category.scoreMode
  ) === "staked-points";
}

function usesConfidencePointsCategory(category) {
  const mode = normalizePicksScoreMode_(
    category && category.scoreMode
  );

  return (
    mode === "confidence-points" ||
    (
      PICKS_PAGE_DATA.isConfidenceGame === true &&
      mode === "correct-pick"
    )
  );
}

function isPicksPageCategory(category) {
  const mode = normalizePicksScoreMode_(
    category && category.scoreMode
  );

  if (mode === "wager" || mode === "ranking") {
    return false;
  }

  if (mode === "confidence-points") {
    return !!(
      PICKS_PAGE_DATA.game &&
      PICKS_PAGE_DATA.game.confidenceEnabled === true
    );
  }

  if (mode === "staked-points") {
    return !!(
      PICKS_PAGE_DATA.game &&
      PICKS_PAGE_DATA.game.stakedPointsEnabled === true
    );
  }

  return true;
}

function hasConfidencePointsCategories() {
  return (PICKS_PAGE_DATA.categories || []).some(
    category => usesConfidencePointsCategory(category)
  );
}

function hasStakedPointsCategories() {
  if (
    !PICKS_PAGE_DATA.game ||
    PICKS_PAGE_DATA.game.stakedPointsEnabled !== true
  ) {
    return false;
  }

  return (PICKS_PAGE_DATA.categories || []).some(
    category => isStakedPointsCategory(category)
  );
}

function getStakedPointsRules(category) {
  const game = PICKS_PAGE_DATA.game || {};

  const numberOrFallback = (value, fallback) => {
    if (value === "" || value === null || value === undefined) {
      return fallback;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const categoryMin = numberOrFallback(category && category.minStake, 0);
  const categoryMax = numberOrFallback(category && category.maxStake, 0);
  const categoryIncrement = numberOrFallback(category && category.stakeIncrement, 0);
  const categoryWin = numberOrFallback(category && category.stakeWinMultiplier, 0);
  const categoryLoss = numberOrFallback(category && category.stakeLossMultiplier, 0);

  const minStake = Math.max(
    1,
    categoryMin > 0
      ? categoryMin
      : numberOrFallback(game.minStake, 10)
  );

  const stakeIncrement = Math.max(
    1,
    Math.floor(
      categoryIncrement > 0
        ? categoryIncrement
        : numberOrFallback(game.stakeIncrement, 10)
    )
  );

  const requestedMaxStake = Math.max(
    minStake,
    Math.floor(
      categoryMax > 0
        ? categoryMax
        : numberOrFallback(game.maxStake, 100)
    )
  );

  const maxStake =
    minStake +
    Math.floor(
      (requestedMaxStake - minStake) / stakeIncrement
    ) * stakeIncrement;

  const hasCategoryWinMultiplier =
    category &&
    category.stakeWinMultiplier !== "" &&
    category.stakeWinMultiplier !== null &&
    category.stakeWinMultiplier !== undefined;

  const hasCategoryLossMultiplier =
    category &&
    category.stakeLossMultiplier !== "" &&
    category.stakeLossMultiplier !== null &&
    category.stakeLossMultiplier !== undefined;

  return {
    startingPoints: Math.max(0, numberOrFallback(game.startingPoints, 1000)),
    minStake: Math.floor(minStake),
    maxStake: maxStake,
    stakeIncrement: stakeIncrement,
    winMultiplier:
      hasCategoryWinMultiplier
        ? Math.max(0, categoryWin)
        : Math.max(0, numberOrFallback(game.stakeWinMultiplier, 1)),
    lossMultiplier:
      hasCategoryLossMultiplier
        ? Math.max(0, categoryLoss)
        : Math.max(0, numberOrFallback(game.stakeLossMultiplier, 1)),
  };
}

function getStakedPointsSummary() {
  const game = PICKS_PAGE_DATA.game || {};
  const summary = PICKS_PAGE_DATA.stakeSummary || {};

  if (game.stakedPointsEnabled !== true) {
    return {
      enabled: false,
      startingPoints: 0,
      currentBalance: 0,
      pendingStakes: 0,
      availablePoints: 0,
      settledNet: 0,
    };
  }

  const startingPoints =
    summary.startingPoints !== undefined &&
    summary.startingPoints !== null &&
    summary.startingPoints !== ""
      ? Number(summary.startingPoints)
      : game.startingPoints !== undefined &&
        game.startingPoints !== null &&
        game.startingPoints !== ""
        ? Number(game.startingPoints)
        : 1000;

  const currentBalance =
    summary.currentBalance == null
      ? startingPoints
      : Number(summary.currentBalance) || 0;

  const pendingStakes = Number(summary.pendingStakes) || 0;
  const availablePoints =
    summary.availablePoints == null
      ? Math.max(0, currentBalance - pendingStakes)
      : Number(summary.availablePoints) || 0;

  return Object.assign({}, summary, {
    startingPoints: startingPoints,
    currentBalance: currentBalance,
    pendingStakes: pendingStakes,
    availablePoints: availablePoints,
    settledNet: Number(summary.settledNet) || 0,
  });
}

function formatPicksPoints_(value) {
  return Math.round(Number(value) || 0).toLocaleString();
}

function renderStakedPointsSummaryBar() {
  const summary = getStakedPointsSummary();
  const net = Number(summary.settledNet) || 0;

  return `
    <div class="stake-summary-bar">
      <div>
        <strong>Staked Prediction Points</strong>
        <span>
          Balance ${formatPicksPoints_(summary.currentBalance)}
          · Available ${formatPicksPoints_(summary.availablePoints)}
        </span>
      </div>

      <div class="stake-summary-values">
        <span>Pending: ${formatPicksPoints_(summary.pendingStakes)}</span>
        <span>Net: ${net >= 0 ? "+" : ""}${formatPicksPoints_(net)}</span>
      </div>
    </div>
  `;
}

function getStakePresetValues(category, usablePoints) {
  const rules = getStakedPointsRules(category);
  const values = [];
  const availableCap =
    usablePoints === undefined || usablePoints === null
      ? rules.maxStake
      : Math.max(0, Math.floor(Number(usablePoints) || 0));

  function add(value) {
    value = Math.floor(Number(value) || 0);

    if (
      value < rules.minStake ||
      value > rules.maxStake ||
      value > availableCap ||
      (value - rules.minStake) % rules.stakeIncrement !== 0 ||
      values.indexOf(value) !== -1
    ) {
      return;
    }

    values.push(value);
  }

  add(rules.minStake);
  add(rules.minStake + rules.stakeIncrement);
  add(25);
  add(50);
  add(100);
  add(rules.maxStake);

  return values.sort((a, b) => a - b).slice(0, 6);
}

function updateStakeForCategory(categoryId, value) {
  const input = document.getElementById("stake-" + categoryId);

  if (input) {
    input.value = Math.floor(Number(value) || 0) || "";
  }

  syncStakedPickControls(categoryId);
}

function getStakedCategoryById_(categoryId) {
  return (PICKS_PAGE_DATA.categories || []).find(category =>
    normalizeId(category && category.id) === normalizeId(categoryId)
  ) || null;
}

function getSelectedStakeForCategory_(categoryId) {
  const input = document.getElementById("stake-" + categoryId);

  if (input) {
    return Math.floor(Number(input.value) || 0);
  }

  return Math.floor(
    Number(PICKS_PAGE_DATA.stakePoints[categoryId]) || 0
  );
}

function validateSelectedStakeForCategory_(category, stakePoints) {
  if (!category || !isStakedPointsCategory(category)) {
    return { valid: true, message: "" };
  }

  const rules = getStakedPointsRules(category);
  const summary = getStakedPointsSummary();
  const existingStake = Number(PICKS_PAGE_DATA.stakePoints[category.id]) || 0;
  const usablePoints = Math.max(0, summary.availablePoints + existingStake);

  if (usablePoints < rules.minStake) {
    return {
      valid: false,
      message:
        "You need at least " + rules.minStake +
        " available points to enter this question."
    };
  }

  if (stakePoints <= 0) {
    return {
      valid: false,
      message: "Choose your risk amount first."
    };
  }

  if (stakePoints < rules.minStake || stakePoints > rules.maxStake) {
    return {
      valid: false,
      message:
        "Choose between " + rules.minStake + " and " +
        Math.min(rules.maxStake, usablePoints) + " points."
    };
  }

  if ((stakePoints - rules.minStake) % rules.stakeIncrement !== 0) {
    return {
      valid: false,
      message: "Use " + rules.stakeIncrement + "-point increments."
    };
  }

  if (stakePoints > usablePoints) {
    return {
      valid: false,
      message: "Only " + usablePoints + " points are available."
    };
  }

  return {
    valid: true,
    message:
      "Risking " + stakePoints + " point" +
      (stakePoints === 1 ? "" : "s") +
      ". Now choose your answer."
  };
}

function syncStakedPickControls(categoryId) {
  const category = getStakedCategoryById_(categoryId);

  if (!category || !isStakedPointsCategory(category)) {
    return;
  }

  const card = document.querySelector(
    `[data-category-id="${cssEscape(categoryId)}"]`
  );

  if (!card) {
    return;
  }

  const stakePoints = getSelectedStakeForCategory_(categoryId);
  const validation = validateSelectedStakeForCategory_(category, stakePoints);
  const locked = isCategoryLocked(category);
  const input = document.getElementById("stake-" + categoryId);
  const status = document.getElementById("stake-step-status-" + categoryId);

  if (input) {
    input.classList.toggle("is-ready", validation.valid && !locked);
    input.classList.toggle("is-invalid", !validation.valid && stakePoints > 0);
  }

  card.querySelectorAll(".stake-preset-button").forEach(button => {
    const buttonValue = Number(button.dataset.stakeValue) || 0;
    button.classList.toggle(
      "selected",
      validation.valid && buttonValue === stakePoints
    );
  });

  card.querySelectorAll(".nominee-choice").forEach(button => {
    button.disabled = locked || !validation.valid;
    button.classList.toggle("stake-waiting", !locked && !validation.valid);
  });

  if (status) {
    status.textContent = locked
      ? "This question is locked."
      : validation.message;
    status.classList.toggle("is-ready", validation.valid && !locked);
    status.classList.toggle("is-waiting", !validation.valid && !locked);
  }
}

function renderStakedPointsControl(category, locked) {
  if (!isStakedPointsCategory(category)) {
    return "";
  }

  const rules = getStakedPointsRules(category);
  const summary = getStakedPointsSummary();
  const existingStake = Number(PICKS_PAGE_DATA.stakePoints[category.id]) || 0;
  const usablePoints = Math.max(0, summary.availablePoints + existingStake);
  const insufficientPoints = existingStake <= 0 && usablePoints < rules.minStake;
  const controlDisabled = locked || insufficientPoints;
  const availableMaxStake = usablePoints < rules.minStake
    ? rules.minStake
    : rules.minStake + Math.floor(
        (Math.min(rules.maxStake, usablePoints) - rules.minStake) /
        rules.stakeIncrement
      ) * rules.stakeIncrement;
  const currentValue = existingStake > 0
    ? existingStake
    : "";

  return `
    <div class="stake-control before-nominees ${existingStake > 0 ? "has-saved-stake" : "needs-stake"}">
      <div class="stake-step-badge">STEP 1</div>

      <div class="stake-control-heading">
        <label for="stake-${escapeAttr(category.id)}">Choose Points to Risk</label>
        <span>Available for this question: ${formatPicksPoints_(usablePoints)}</span>
      </div>

      <div class="stake-input-row">
        <input
          type="number"
          id="stake-${escapeAttr(category.id)}"
          value="${currentValue}"
          placeholder="Choose amount"
          min="${rules.minStake}"
          max="${availableMaxStake}"
          step="${rules.stakeIncrement}"
          aria-describedby="stake-step-status-${escapeAttr(category.id)}"
          ${controlDisabled ? "disabled" : ""}
          oninput="updateStakeForCategory('${escapeJs(category.id)}', this.value)"
          onchange="updateStakeForCategory('${escapeJs(category.id)}', this.value)"
        >
        <span>points</span>
      </div>

      <div class="stake-preset-row">
        ${getStakePresetValues(category, usablePoints).map(value => `
          <button
            type="button"
            class="stake-preset-button ${existingStake === value ? "selected" : ""}"
            data-stake-value="${value}"
            onclick="updateStakeForCategory('${escapeJs(category.id)}', ${value})"
            ${controlDisabled ? "disabled" : ""}
          >
            ${value}
          </button>
        `).join("")}
      </div>

      <div class="stake-help">
        ${
          insufficientPoints
            ? `You need at least ${rules.minStake} available points to enter this question.`
            : `No amount is selected automatically. Correct: +${rules.winMultiplier}× stake · Wrong: −${rules.lossMultiplier}× stake · Push: stake returned`
        }
      </div>
    </div>
  `;
}

function renderConfidenceSummaryBar() {

  const used =
    getUsedConfidencePoints();

  const max =
    getMaxConfidencePoints();

  const remaining =
    [];

  for (
    let i = 1;
    i <= max;
    i++
  ) {

    if (
      used.indexOf(i) === -1
    ) {
      remaining.push(i);
    }

  }

  return `
    <div class="confidence-summary-bar">

      <div>
        <strong>
          Confidence Pool
        </strong>

        <span>
          ${
            PICKS_PAGE_DATA.confidenceScoringMode === "risk_penalty"
              ? "Risk Penalty Mode"
              : "Win Only Mode"
          }
        </span>
      </div>

      <div class="confidence-number-list">
        <span>
          Used:
          ${used.length ? used.join(", ") : "none"}
        </span>

        <span>
          Remaining:
          ${remaining.length ? remaining.join(", ") : "none"}
        </span>
      </div>

    </div>
  `;

}

/* =========================
   CATEGORY LIST
========================= */

function renderPicksCategoryList() {

  const categories =
    (PICKS_PAGE_DATA.categories || [])
      .filter(category =>
        isPicksPageCategory(category)
      );

  const parents =
    categories.filter(cat =>
      !cat.parentCategoryId
    );

  return parents.map(parent => {

    const children =
      getChildCategories(parent);

    return `
      <div class="picks-parent-block">

        ${renderCategoryCard(parent, false)}

        ${children.length ? `
          <div class="child-category-wrapper">
            ${children.map(child =>
              renderCategoryCard(child, true, parent)
            ).join("")}
          </div>
        ` : ""}

      </div>
    `;

  }).join("");

}

/* =========================
   CHILD CATEGORY HELPERS
========================= */

function getChildCategories(parent) {

  const categories =
    (PICKS_PAGE_DATA.categories || [])
      .filter(category =>
        isPicksPageCategory(category)
      );

  return categories.filter(cat => {

    if (
      cat.parentCategoryId &&
      normalizeId(cat.parentCategoryId) === normalizeId(parent.id)
    ) {
      return shouldShowChildCategory(parent, cat);
    }

    if (
      parent.followUpCategoryId &&
      normalizeId(parent.followUpCategoryId) === normalizeId(cat.id)
    ) {
      return shouldShowChildCategory(parent, cat);
    }

    return false;

  });

}

function shouldShowChildCategory(parent, child) {

  const map =
    parseFollowUpMap(parent.followUpMapJSON);

  const selectedNomineeId =
    PICKS_PAGE_DATA.picks[parent.id];

  if (!map) {
    return true;
  }

  if (!selectedNomineeId) {
    return false;
  }

  const mapped =
    map[selectedNomineeId];

  if (Array.isArray(mapped)) {
    return mapped
      .map(normalizeId)
      .includes(normalizeId(child.id));
  }

  return normalizeId(mapped) === normalizeId(child.id);

}

function parseFollowUpMap(value) {

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn(
      "Invalid FollowUpMapJSON",
      value
    );
    return null;
  }

}

/* =========================
   CATEGORY CARD
========================= */
function renderCategoryCard(category, isChild, parent) {

  const selectedNomineeId =
    PICKS_PAGE_DATA.picks[category.id] || "";

  const selectedNominee =
    getSelectedNominee(category);

  const confidencePoints =
    Number(
      PICKS_PAGE_DATA.confidencePoints[category.id]
    ) || 0;

  const stakedPointsCategory =
    isStakedPointsCategory(category);

  const confidencePointsCategory =
    usesConfidencePointsCategory(category);

  const stakePoints =
    Number(
      PICKS_PAGE_DATA.stakePoints[category.id]
    ) || 0;

  const hasPick =
    Boolean(selectedNominee);

  const locked =
    isCategoryLocked(category);

  const status =
    getPickStatus(category, selectedNomineeId);

  const winnerNominee =
    getWinnerNominee(category);
  
  const originalNominee =
    getOriginalNominee(category);
  
  const thirdLineText =
    getThirdLineText(
      category,
      selectedNominee,
      winnerNominee,
      status
    );  

  const changeCount =
    Number(
      PICKS_PAGE_DATA.changeCounts[category.id]
    ) || 0;

  const maxChanges =
    Number(category.maxChanges) || 0;

  const changesLeft =
    Math.max(
      maxChanges - changeCount,
      0
    );

  const totalPoints =
    Number(category.points) || 0;

  const penalty =
    Number(category.changePenalty) || 0;

  const adjustedPoints =
    Math.max(
      totalPoints - changeCount * penalty,
      0
    );

  const collapsedClass =
    hasPick ? "collapsed" : "";

  const childClass =
    isChild ? "child-category-card" : "";

  return `
    <section
      class="pick-category-card ${collapsedClass} ${childClass} ${status.className}"
      data-category-id="${escapeAttr(category.id)}"
    >

    <button
      type="button"
      class="pick-card-header"
      onclick="togglePickCategory('${escapeJs(category.id)}')"
    >

      <div class="pick-header-main">

        <div class="pick-header-topline">

          <div class="pick-title-wrap">

           ${status.icon ? `
             <span class="pick-status-icon">${status.icon}</span>
           ` : ""}

        <h2>
           ${escapeHtml(getCategoryDisplayTitle(category))}
        </h2>

      </div>

      ${
        !confidencePointsCategory
          ? `
            <div class="points-pill ${stakedPointsCategory ? "stake-points-pill" : ""}">
              ${
                stakedPointsCategory
                  ? status.className === "push"
                    ? "Stake returned"
                    : status.className === "cancelled"
                      ? "Cancelled"
                      : stakePoints > 0
                        ? `${stakePoints} at risk`
                        : "Choose stake"
                  : status.className === "push"
                    ? "Push"
                    : status.className === "cancelled"
                      ? "Cancelled"
                      : `${adjustedPoints}/${totalPoints} pts`
              }
            </div>
          `
          : ""
      }

     </div>

     ${selectedNominee ? `
        <div class="selected-pick-summary">

        <img
          src="${escapeAttr(selectedNominee.image)}"
          alt=""
        />

        <span>
          ${escapeHtml(selectedNominee.name)}
          ${
            confidencePointsCategory
              ? `
                <span class="selected-confidence-pill">
                  Confidence ${confidencePoints || "not set"} 
                </span>
              `
              : stakedPointsCategory
                ? `
                  <span class="selected-stake-pill">
                    ${
                      status.className === "push" ||
                      status.className === "cancelled"
                        ? `${stakePoints || 0} point${stakePoints === 1 ? "" : "s"} returned`
                        : `${stakePoints || "No"} point${stakePoints === 1 ? "" : "s"} at risk`
                    }
                  </span>
                `
                : ""
          }
        </span>

      </div>
    ` : `
      <div class="selected-pick-summary empty">
         <span>No pick selected</span>
      </div>
    `}

      <div
        class="pick-third-line"
        data-lock-time="${escapeAttr(category.lockDateTime || "")}"
        data-locked="${locked ? "true" : "false"}"
        data-default-text="${escapeAttr(thirdLineText)}"
      >
        ${escapeHtml(thirdLineText)}
      </div>

     </div>

    </button>  
    
    ${
      !confidencePointsCategory
        ? stakedPointsCategory
          ? `
            <div class="pick-rules-row stake-rules-row">
              <div class="penalty-note">
                Your selected stake is reserved until this question settles.
              </div>
              <div class="changes-pill body-pill">
                ${changesLeft} changes left
              </div>
            </div>
          `
          : `
            <div class="pick-rules-row">
              <div class="penalty-note">
                Penalty: ${penalty} point${penalty === 1 ? "" : "s"}
              </div>
              <div class="changes-pill body-pill">
                ${changesLeft} changes left
              </div>
            </div>
          `
        : ""
    }
    
    
    ${originalNominee ? `
      <div class="original-pick-note">
        Original Pick:
        <strong>${escapeHtml(originalNominee.name)}</strong>
      </div>
    ` : ""}

${renderStakedPointsControl(
  category,
  locked
)}

${stakedPointsCategory ? `
  <div class="stake-pick-step">
    <div class="stake-step-badge">STEP 2</div>
    <div>
      <strong>Choose Your Pick</strong>
      <span
        id="stake-step-status-${escapeAttr(category.id)}"
        class="stake-step-status ${stakePoints > 0 ? "is-ready" : "is-waiting"}"
      >
        ${
          locked
            ? "This question is locked."
            : stakePoints > 0
              ? `Risking ${stakePoints} point${stakePoints === 1 ? "" : "s"}. Choose an answer to confirm or update the pick.`
              : "Choose your risk amount above before selecting an answer."
        }
      </span>
    </div>
  </div>
` : ""}

    <div class="${getLayoutClass(category)}">

  ${category.nominees.map(nominee =>
    renderNomineeButton(
      category,
      nominee,
      selectedNomineeId,
      locked
    )
  ).join("")}

</div>

${renderConfidenceControl(
  category,
  locked
)}

</section>
  `;

}

/* =========================
   CONFIDENCE CONTROL
========================= */

function renderConfidenceControl(
  category,
  locked
) {

  if (!usesConfidencePointsCategory(category)) {
    return "";
  }

  const currentValue =
    Number(
      PICKS_PAGE_DATA.confidencePoints[category.id]
    ) || "";

  return `
    <div class="confidence-control after-nominees">

      <label>
        <span>
          Confidence Points
        </span>

        <select
          id="confidence-${escapeAttr(category.id)}"
          ${locked ? "disabled" : ""}
          onchange="updateConfidenceForCategory('${escapeJs(category.id)}', this.value)"
        >
          <option value="">
            Choose confidence
          </option>

          ${renderConfidenceOptionsForCategory(
            category.id,
            currentValue
          )}

        </select>
      </label>

      <div class="confidence-help">
        ${
          PICKS_PAGE_DATA.confidenceScoringMode === "risk_penalty"
            ? "Correct picks gain this amount. Wrong picks lose this amount."
            : "Correct picks gain this amount. Wrong picks score zero."
        }
      </div>

    </div>
  `;

}

function getMaxConfidencePoints() {

  return getMaxAvailableConfidencePoints();

}

function getUsedConfidencePointsForOtherCategories(
  categoryId
) {

  const used = [];

  Object.keys(
    PICKS_PAGE_DATA.confidencePoints || {}
  ).forEach(otherCategoryId => {

    if (
      normalizeId(otherCategoryId) ===
      normalizeId(categoryId)
    ) {
      return;
    }

    const otherCategory =
      (PICKS_PAGE_DATA.categories || []).find(category =>
        normalizeId(category.id) === normalizeId(otherCategoryId)
      );

    if (!usesConfidencePointsCategory(otherCategory)) {
      return;
    }

    const otherHasPick =
      Boolean(
        PICKS_PAGE_DATA.picks[otherCategoryId]
      );

    if (!otherHasPick) {
      return;
    }

    const value =
      Number(
        PICKS_PAGE_DATA.confidencePoints[otherCategoryId]
      ) || 0;

    if (
      value > 0 &&
      used.indexOf(value) === -1
    ) {
      used.push(value);
    }

  });

  return used;

}

function getUsedConfidencePoints() {

  const used = [];

  Object.keys(
    PICKS_PAGE_DATA.confidencePoints || {}
  ).forEach(categoryId => {

    const category =
      (PICKS_PAGE_DATA.categories || []).find(item =>
        normalizeId(item.id) === normalizeId(categoryId)
      );

    if (!usesConfidencePointsCategory(category)) {
      return;
    }

    const hasPick =
      Boolean(
        PICKS_PAGE_DATA.picks[categoryId]
      );

    if (!hasPick) {
      return;
    }

    const value =
      Number(
        PICKS_PAGE_DATA.confidencePoints[categoryId]
      ) || 0;

    if (
      value > 0 &&
      used.indexOf(value) === -1
    ) {

      used.push(value);

    }

  });

  used.sort((a, b) =>
    b - a
  );

  return used;

}

function updateConfidenceForCategory(
  categoryId,
  value
) {

  PICKS_PAGE_DATA.confidencePoints[categoryId] =
    Number(value) || 0;

}

/* =========================
   NOMINEE BUTTON
========================= */

function renderNomineeButton(
  category,
  nominee,
  selectedNomineeId,
  locked
) {

  const selected =
    normalizeId(nominee.id) ===
    normalizeId(selectedNomineeId);

  const layoutType =
    String(category.layoutType || "image")
      .toLowerCase();

  const existingStake =
    Number(PICKS_PAGE_DATA.stakePoints[category.id]) || 0;

  const stakeMustBeChosenFirst =
    isStakedPointsCategory(category) && existingStake <= 0;

  const disabled =
    locked || stakeMustBeChosenFirst ? "disabled" : "";

  if (
    layoutType === "text" ||
    layoutType === "short-answer"
  ) {

    return `
      <button
        type="button"
        class="nominee-choice text-choice ${selected ? "selected" : ""}"
        onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
        ${disabled}
      >
        ${escapeHtml(nominee.shortAnswer || nominee.name)}
      </button>
    `;

  }

  if (
    layoutType === "compact" ||
    layoutType === "list"
  ) {

    return `
      <button
        type="button"
        class="nominee-choice list-choice ${selected ? "selected" : ""}"
        onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
        ${disabled}
      >

        <img
          src="${escapeAttr(nominee.image)}"
          alt=""
        />

        <span>
          ${escapeHtml(nominee.name)}
        </span>

      </button>
    `;

  }

  return `
    <button
      type="button"
      class="nominee-choice image-choice ${selected ? "selected" : ""}"
      onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
      ${disabled}
    >

      <img
        src="${escapeAttr(nominee.image)}"
        alt=""
      />

      <span>
        ${escapeHtml(nominee.name)}
      </span>

    </button>
  `;

}

/* =========================
   PICK ACTIONS
========================= */

async function selectNominee(categoryId, nomineeId) {

  const session =
    PICKS_PAGE_DATA.session ||
    getSession();

  const category =
    PICKS_PAGE_DATA.categories.find(cat =>
      normalizeId(cat.id) === normalizeId(categoryId)
    );

  if (!category) {
    showPicksMessage(
      "Category not found.",
      true
    );
    return;
  }

  if (isCategoryLocked(category)) {
    showPicksMessage(
      "This category is locked.",
      true
    );
    return;
  }

  const previousPick =
    PICKS_PAGE_DATA.picks[categoryId];

  const isChange =
    previousPick &&
    normalizeId(previousPick) !== normalizeId(nomineeId);

  const changeCount =
    Number(
      PICKS_PAGE_DATA.changeCounts[categoryId]
    ) || 0;

  const maxChanges =
    Number(category.maxChanges) || 0;

  if (
    isChange &&
    changeCount >= maxChanges
  ) {
    showPicksMessage(
      "No pick changes left for this category.",
      true
    );
    return;
  }

  let confidencePoints = 0;

  if (usesConfidencePointsCategory(category)) {

    const confidenceInput =
      document.getElementById(
       "confidence-" + categoryId
    );

    confidencePoints =
      confidenceInput
        ? Number(confidenceInput.value) || 0
        : Number(
            PICKS_PAGE_DATA.confidencePoints[categoryId]
          ) || 0;

    console.log(
      "CONFIDENCE SAVE CHECK",
      {
        categoryId: categoryId,
        nomineeId: nomineeId,
        confidencePoints: confidencePoints,
        inputFound: Boolean(confidenceInput),
        inputValue: confidenceInput ? confidenceInput.value : null
      }
    );

    if (confidencePoints <= 0) {

      showPicksMessage(
        "Choose confidence points before saving this pick.",
        true
      );

      return;

    }

    if (
      getUsedConfidencePointsForOtherCategories(
        categoryId
      ).includes(confidencePoints)
    ) {
    
      showPicksMessage(
        "You already used " +
        confidencePoints +
        " confidence point" +
        (confidencePoints === 1 ? "" : "s") +
        ". Choose a different number.",
        true
      );
    
      return;
    
    }

  }

  let stakePoints = 0;

  if (isStakedPointsCategory(category)) {
    const rules = getStakedPointsRules(category);
    const stakeInput = document.getElementById("stake-" + categoryId);

    stakePoints = Math.floor(
      stakeInput
        ? Number(stakeInput.value) || 0
        : Number(PICKS_PAGE_DATA.stakePoints[categoryId]) || 0
    );

    if (stakePoints < rules.minStake || stakePoints > rules.maxStake) {
      showPicksMessage(
        "Choose a stake between " + rules.minStake + " and " + rules.maxStake + " points.",
        true
      );
      return;
    }

    if ((stakePoints - rules.minStake) % rules.stakeIncrement !== 0) {
      showPicksMessage(
        "Stake must increase by " + rules.stakeIncrement + " points.",
        true
      );
      return;
    }

    const summary = getStakedPointsSummary();
    const existingStake = Number(PICKS_PAGE_DATA.stakePoints[categoryId]) || 0;
    const usablePoints = summary.availablePoints + existingStake;

    if (stakePoints > usablePoints) {
      showPicksMessage(
        "Only " + usablePoints + " prediction points are available for this question.",
        true
      );
      return;
    }
  }

  if (isStakedPointsCategory(category)) {
    const nominee = (category.nominees || []).find(item =>
      normalizeId(item && item.id) === normalizeId(nomineeId)
    );

    const nomineeName = nominee
      ? String(nominee.name || nominee.shortAnswer || "this answer")
      : "this answer";

    const actionText = previousPick
      ? "Update your pick to "
      : "Save ";

    const confirmationMessage =
      actionText + nomineeName + " with " + stakePoints +
      " point" + (stakePoints === 1 ? "" : "s") +
      " at risk?";

    if (
      typeof window !== "undefined" &&
      typeof window.confirm === "function" &&
      !window.confirm(confirmationMessage)
    ) {
      showPicksMessage(
        "Pick not saved. You can change the risk amount or answer.",
        false
      );
      return;
    }
  }

  showPicksMessage(
    "Saving pick...",
    false
  );

  const result =
    await apiSavePick({
      username:
        session.username,

      gameId:
        PICKS_PAGE_DATA.gameId,

      categoryId:
        categoryId,

      nomineeId:
        nomineeId,

      confidencePoints:
        confidencePoints,

      stakePoints:
        stakePoints
    });

  console.log(
    "SAVE PICK RESULT",
    result
  );

  if (!result.success) {
    showPicksMessage(
      result.message || "Could not save pick.",
      true
    );
    return;
  }

  clearStartupPayload();

  PICKS_PAGE_DATA.picks[categoryId] =
    nomineeId;

  PICKS_PAGE_DATA.changeCounts[categoryId] =
    Number(result.changeCount) || 0;

  PICKS_PAGE_DATA.originalPicks[categoryId] =
    result.originalNomineeId || nomineeId;

  if (usesConfidencePointsCategory(category)) {

    PICKS_PAGE_DATA.confidencePoints[categoryId] =
      Number(
        result.confidencePoints
      ) || confidencePoints;

  }

  if (isStakedPointsCategory(category)) {
    PICKS_PAGE_DATA.stakePoints[categoryId] =
      Number(result.stakePoints) || stakePoints;

    PICKS_PAGE_DATA.stakeSummary =
      result.stakeSummary || PICKS_PAGE_DATA.stakeSummary || {};
  }

  if (result.pickMeta) {

    PICKS_PAGE_DATA.pickMeta[categoryId] =
      result.pickMeta;

  }

  refreshPicksPage();

  showPicksMessage(
    "Pick saved.",
    false
  );

}

function refreshPicksPage() {

  const el =
    document.getElementById("picksCategoryList");

  if (!el) {
    return;
  }

  el.innerHTML =
    renderPicksCategoryList();

  const confidenceSummary =
    document.querySelector(".confidence-summary-bar");

  if (confidenceSummary && hasConfidencePointsCategories()) {
    confidenceSummary.outerHTML =
      renderConfidenceSummaryBar();
  }

  const stakeSummary =
    document.querySelector(".stake-summary-bar");

  if (stakeSummary && hasStakedPointsCategories()) {
    stakeSummary.outerHTML =
      renderStakedPointsSummaryBar();
  }

  mountPicksPage();

}

/* =========================
   COLLAPSE
========================= */

function togglePickCategory(categoryId) {

  const card =
    document.querySelector(
      `[data-category-id="${cssEscape(categoryId)}"]`
    );

  if (!card) {
    return;
  }

  card.classList.toggle("collapsed");

}

/* =========================
   MOUNT / COUNTDOWN
========================= */

function mountPicksPage() {

  if (PICKS_COUNTDOWN_TIMER) {
    clearInterval(PICKS_COUNTDOWN_TIMER);
  }

  updateCountdowns();

  (PICKS_PAGE_DATA.categories || [])
    .filter(category => isStakedPointsCategory(category))
    .forEach(category => syncStakedPickControls(category.id));

  PICKS_COUNTDOWN_TIMER =
    setInterval(
      updateCountdowns,
      1000
    );

}

function updateCountdowns() {

  document
    .querySelectorAll(".pick-third-line")
    .forEach(el => {

      const defaultText =
        el.dataset.defaultText || "";

      const alreadyLocked =
        el.dataset.locked === "true";

      const lockTime =
        el.dataset.lockTime;

      if (
        defaultText === "Winner" ||
        (
          defaultText &&
          defaultText !== "Make Pick Now ↓" &&
          defaultText !== "Locked"
        )
      ) {
        el.innerText =
          defaultText;
        return;
      }

      if (alreadyLocked) {
        el.innerText =
          "Locked";
        return;
      }

      if (!lockTime) {
        el.innerText =
          defaultText || "Make Pick Now ↓";
        return;
      }

      const lockDate =
        new Date(lockTime);

      if (isNaN(lockDate.getTime())) {
        el.innerText =
          defaultText || "Make Pick Now ↓";
        return;
      }

      const diff =
        lockDate.getTime() -
        Date.now();

      if (diff <= 0) {
        el.innerText =
          "Locked";
        el.dataset.locked =
          "true";
        return;
      }

      el.innerText =
        "Make Pick Now ↓  •  Locks in " +
        formatCountdown(diff);

    });

}

function formatCountdown(ms) {

  const totalSeconds =
    Math.floor(ms / 1000);

  const days =
    Math.floor(totalSeconds / 86400);

  const hours =
    Math.floor((totalSeconds % 86400) / 3600);

  const minutes =
    Math.floor((totalSeconds % 3600) / 60);

  const seconds =
    totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;

}

/* =========================
   STATUS HELPERS
========================= */

function getCategoryResultStatus(category) {

  category =
    category || {};

  const rawStatus =
    String(
      category.settlementStatus ||
      category.resultStatus ||
      category.wagerResultType ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

  if (
    rawStatus === "push" ||
    rawStatus === "pushed" ||
    rawStatus === "void"
  ) {
    return "push";
  }

  if (
    rawStatus === "cancelled" ||
    rawStatus === "canceled" ||
    rawStatus === "no-contest" ||
    rawStatus === "no-contest-return-stakes"
  ) {
    return "cancelled";
  }

  if (
    normalizeId(category.winnerNomineeId)
  ) {
    return "winner";
  }

  return "pending";

}

function getPickStatus(category, selectedNomineeId) {

  const resultStatus =
    getCategoryResultStatus(category);

  if (resultStatus === "push") {
    return {
      label: "Push — Stakes Returned",
      className: "push",
      icon: "↩"
    };
  }

  if (resultStatus === "cancelled") {
    return {
      label: "Cancelled — Stakes Returned",
      className: "cancelled",
      icon: "↩"
    };
  }

  const winner =
    normalizeId(category.winnerNomineeId);

  const pick =
    normalizeId(selectedNomineeId);

  if (!winner || !pick) {
    return {
      label: "Pending",
      className: "pending",
      icon: ""
    };
  }

  if (winner === pick) {
    return {
      label: "Winner",
      className: "correct",
      icon: "🏆"
    };
  }

  return {
    label: "Incorrect",
    className: "wrong",
    icon: ""
  };

}

function getCategoryTitle(category, status) {

  if (status.className === "correct") {
    return `${category.name} — Correct`;
  }

  if (status.className === "wrong") {
    return `${category.name} — Wrong`;
  }

  if (status.className === "push") {
    return `${category.name} — Push`;
  }

  if (status.className === "cancelled") {
    return `${category.name} — Cancelled`;
  }

  return category.name;

}

function getCategoryDisplayTitle(category) {

  return (
    category.question ||
    category.Question ||
    category.category ||
    category.Category ||
    category.name ||
    category.displayName ||
    category.id ||
    "Category"
  );

}

function getSelectedNominee(category) {

  const selectedId =
    PICKS_PAGE_DATA.picks[category.id];

  if (!selectedId) {
    return null;
  }

  return category.nominees.find(n =>
    normalizeId(n.id) === normalizeId(selectedId)
  ) || null;

}

function getWinnerNominee(category) {

  const winnerId =
    category.winnerNomineeId;

  if (!winnerId) {
    return null;
  }

  return category.nominees.find(n =>
    normalizeId(n.id) === normalizeId(winnerId)
  ) || null;

}

function getOriginalNominee(category) {

  const originalId =
    PICKS_PAGE_DATA.originalPicks[category.id];

  const currentId =
    PICKS_PAGE_DATA.picks[category.id];

  if (
    !originalId ||
    normalizeId(originalId) === normalizeId(currentId)
  ) {
    return null;
  }

  return category.nominees.find(n =>
    normalizeId(n.id) === normalizeId(originalId)
  ) || null;

}

function getThirdLineText(
  category,
  selectedNominee,
  winnerNominee,
  status
) {

  const resultStatus =
    getCategoryResultStatus(category);

  if (resultStatus === "push") {
    return isStakedPointsCategory(category)
      ? "Push — Stakes Returned"
      : "Push — No Points Awarded";
  }

  if (resultStatus === "cancelled") {
    return isStakedPointsCategory(category)
      ? "Cancelled — Stakes Returned"
      : "Cancelled — No Points Awarded";
  }

  const locked =
    isCategoryLocked(category);

  const hasWinner =
    Boolean(winnerNominee);

  if (!hasWinner) {

    if (locked) {
      return "Locked";
    }

    return "Make Pick Now ↓";

  }

  if (status.className === "correct") {
    return "Winner";
  }

  return winnerNominee.name;

}

function isCategoryLocked(category) {

  const resultStatus =
    getCategoryResultStatus(category);

  if (
    resultStatus === "winner" ||
    resultStatus === "push" ||
    resultStatus === "cancelled"
  ) {
    return true;
  }

  if (category.locked === true) {
    return true;
  }

  if (!category.lockDateTime) {
    return false;
  }

  const lockDate =
    new Date(category.lockDateTime);

  if (isNaN(lockDate.getTime())) {
    return false;
  }

  return Date.now() >= lockDate.getTime();

}

function getLockLabel(category) {

  if (isCategoryLocked(category)) {
    return "Locked";
  }

  if (!category.lockDateTime) {
    return "No lock time set";
  }

  return "Loading countdown...";

}

function getLayoutClass(category) {

  const layout =
    String(category.layoutType || "image")
      .toLowerCase();

  if (
    layout === "text" ||
    layout === "short-answer"
  ) {
    return "nominee-layout nominee-layout-text";
  }

  if (
    layout === "compact" ||
    layout === "list"
  ) {
    return "nominee-layout nominee-layout-list";
  }

  return "nominee-layout nominee-layout-image";

}

function getConfidenceEligibleCategories() {

  const categories =
    PICKS_PAGE_DATA.categories || [];

  return categories.filter(cat =>
    !cat.parentCategoryId &&
    usesConfidencePointsCategory(cat)
  );

}

function getLockedUnpickedConfidenceCount() {

  const categories =
    getConfidenceEligibleCategories();

  return categories.filter(cat => {

    const categoryId =
      cat.id;

    const hasPick =
      Boolean(
        PICKS_PAGE_DATA.picks[categoryId]
      );

    return (
      isCategoryLocked(cat) &&
      !hasPick
    );

  }).length;

}

function getMaxAvailableConfidencePoints() {

  const total =
    getConfidenceEligibleCategories()
      .length;

  const lockedUnpicked =
    getLockedUnpickedConfidenceCount();

  return Math.max(
    total - lockedUnpicked,
    1
  );

}

function renderConfidenceOptionsForCategory(
  categoryId,
  currentValue
) {

  const maxConfidence =
    getMaxAvailableConfidencePoints();

  const usedValues =
    getUsedConfidencePointsForOtherCategories(
      categoryId
    );

  const current =
    Number(currentValue) || 0;

  const values = [];

  for (
    let value = maxConfidence;
    value >= 1;
    value--
  ) {

    if (
      usedValues.indexOf(value) !== -1 &&
      value !== current
    ) {
      continue;
    }

    values.push(value);

  }

  if (
    current > maxConfidence &&
    values.indexOf(current) === -1
  ) {

    values.unshift(current);

  }

  return values.map(value => `
    <option
      value="${value}"
      ${value === current ? "selected" : ""}
    >
      ${value}
    </option>
  `).join("");

}

/* =========================
   MESSAGE
========================= */

function showPicksMessage(message, isError) {

  const el =
    document.getElementById("picksPageMessage");

  if (!el) {
    return;
  }

  el.innerText =
    message;

  el.classList.remove(
    "hidden",
    "error",
    "success"
  );

  el.classList.add(
    isError ? "error" : "success"
  );

  if (!isError) {

    setTimeout(() => {
      el.classList.add("hidden");
    }, 1800);

  }

}

/* =========================
   SAFETY HELPERS
========================= */

function normalizeId(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function escapeAttr(value) {

  return escapeHtml(value);

}

function escapeJs(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

}

function cssEscape(value) {

  if (window.CSS && CSS.escape) {
    return CSS.escape(value);
  }

  return String(value || "")
    .replace(/"/g, '\\"');

}