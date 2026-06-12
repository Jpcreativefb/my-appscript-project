/* =========================
   WAGER PAGE
   Keeps Betting* function names for route/API compatibility.
========================= */

const BETTING_STATE = {
  saving: false
};

function getBettingSession_(){

  if (typeof getSession === "function") {
    return getSession() || {};
  }

  try {
    return JSON.parse(
      localStorage.getItem("session") || "{}"
    );
  } catch (err) {
    return {};
  }

}

function getBettingGameId_(){

  if (typeof getFrontendGameId === "function") {
    return getFrontendGameId();
  }

  const session = getBettingSession_();

  return (
    session.gameId ||
    window.FRONTEND_GAME_ID ||
    "oscars-2026"
  );

}

function escapeBettingHtml_(value){

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function money_(value){

  const n = Number(value || 0);

  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2
  });

}

function odds_(value){

  const n = Number(value || 0);

  return n.toFixed(2).replace(/\.00$/, "") + "x";

}

function safeBettingDomId_(value){

  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

}

function getBetAmountInputId_(categoryId){

  return "betAmount-" +
    safeBettingDomId_(categoryId);

}

function buildBetMap_(summary){

  const map = {};

  ((summary && summary.bets) || [])
    .forEach(bet => {
      map[bet.categoryId] = bet;
    });

  return map;

}

function getBettingNomineeName_(category, nomineeId){

  const nominee = (category.nominees || [])
    .find(n => n.id === nomineeId);

  return nominee
    ? nominee.shortAnswer || nominee.name
    : nomineeId;

}

function renderBettingNotice_(message, type){

  if (!message) {
    return "";
  }

  return `
    <div class="betting-notice ${type || ""}">
      ${escapeBettingHtml_(message)}
    </div>
  `;

}

function renderBettingSummary_(summary){

  return `
    <div class="betting-summary-grid">

      <div class="betting-summary-card">
        <div class="betting-label">Bankroll</div>
        <div class="betting-value">${money_(summary.bankroll)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Wagered</div>
        <div class="betting-value">${money_(summary.totalStaked)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Possible Max</div>
        <div class="betting-value">${money_(summary.maxBankroll)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Pending Wagers</div>
        <div class="betting-value">${summary.pendingBets || 0}</div>
      </div>

    </div>
  `;

}

function renderBettingCategory_(category, bet, config){

  const inputId = getBetAmountInputId_(category.id);

  const defaultAmount = bet
    ? bet.betAmount
    : (config.minWager || config.minBet);

  const locked = category.locked === true;

  const currentPick = bet
    ? getBettingNomineeName_(category, bet.nomineeId)
    : "";

  return `
    <section class="betting-category-card ${locked ? "locked" : ""}">

      <div class="betting-category-head">
        <div>
          <div class="betting-category-title">
            ${escapeBettingHtml_(category.shortName || category.name)}
          </div>

          ${bet ? `
            <div class="betting-current">
              Current bet: ${money_(bet.betAmount)} on ${escapeBettingHtml_(currentPick)}
            </div>
          ` : `
            <div class="betting-current muted">
              No bet placed yet
            </div>
          `}
        </div>

        ${locked ? `
          <div class="betting-lock-badge">Locked</div>
        ` : ""}
      </div>

      <label class="betting-amount-label" for="${inputId}">
        Bet amount
      </label>

      <input
        id="${inputId}"
        class="betting-amount-input"
        type="number"
        inputmode="numeric"
        min="${config.minWager || config.minBet}"
        max="${config.maxWager || config.maxBet}"
        step="1"
        value="${defaultAmount}"
        ${locked ? "disabled" : ""}
      >

      <div class="betting-nominee-grid">
        ${(category.nominees || []).map(nominee => {

          const selected = bet &&
            bet.nomineeId === nominee.id;

          const potential = Number(defaultAmount || 0) *
            Number(nominee.odds || 0);

          return `
            <button
              class="betting-nominee-card ${selected ? "selected" : ""}"
              onclick="saveBetSelection('${category.id}', '${nominee.id}')"
              ${locked ? "disabled" : ""}
            >
              ${nominee.image ? `
                <img
                  src="${escapeBettingHtml_(nominee.image)}"
                  alt=""
                  loading="lazy"
                >
              ` : ""}

              <div class="betting-nominee-name">
                ${escapeBettingHtml_(nominee.shortAnswer || nominee.name)}
              </div>

              <div class="betting-odds-row">
                <span>${odds_(nominee.odds)}</span>
                <span>Return ${money_(potential)}</span>
              </div>
            </button>
          `;

        }).join("")}
      </div>

    </section>
  `;

}

function renderBettingLeaderboardPreview_(rows){

  if (!rows || !rows.length) {
    return "";
  }

  return `
    <section class="betting-leaderboard-card">
      <div class="betting-section-title">Wager Leaderboard</div>

      ${rows.slice(0, 5).map((row, index) => `
        <div class="betting-leaderboard-row">
          <div>
            <strong>${index + 1}. ${escapeBettingHtml_(row.user)}</strong>
            <div class="betting-row-sub">
              ${row.wonBets || 0} won · ${row.pendingBets || 0} pending
            </div>
          </div>

          <div class="betting-row-score">
            ${money_(row.bankroll)}
          </div>
        </div>
      `).join("")}
    </section>
  `;

}

async function renderBettingPage(){

  const session = getBettingSession_();
  const username = session.username || "";
  const gameId = getBettingGameId_();

  if (!username) {

    return `
      <div class="page">
        <h1>Wager</h1>
        ${renderBettingNotice_("Please log in again.", "error")}
      </div>
    `;

  }

  const [optionsRes, betsRes, leaderboardRes] =
    await Promise.all([
      apiGetBettingOptions(gameId),
      apiGetMyBets(username, gameId),
      apiBettingLeaderboard(gameId)
    ]);

  if (!optionsRes || optionsRes.success === false) {

    return `
      <div class="page">
        <h1>Wager</h1>
        ${renderBettingNotice_(
          (optionsRes && (optionsRes.message || optionsRes.error)) ||
          "Could not load wager options.",
          "error"
        )}
      </div>
    `;

  }

  const config = optionsRes.config || {};

  if (config.enabled === false) {

    return `
      <div class="page betting-page">
        <h1>Wager</h1>
        ${renderBettingNotice_(
          "Wagering is not enabled for this game yet. Set Type to wager or WagerEnabled to TRUE in the Games sheet.",
          "warning"
        )}
      </div>
    `;

  }

  const emptySummary = {
    bankroll: config.startingBankroll || 0,
    totalStaked: 0,
    maxBankroll: config.startingBankroll || 0,
    pendingBets: 0,
    bets: []
  };

  const summary =
    betsRes && betsRes.summary
      ? betsRes.summary
      : emptySummary;

  const betMap = buildBetMap_(summary);

  const categories = optionsRes.categories || [];

  return `
    <div class="page betting-page">

      <h1>Wager</h1>

      <div id="bettingNotice"></div>

      <p class="betting-intro">
        Start with ${money_(config.startingBankroll)} chips. Pick one nominee per category and wager between ${money_(config.minWager || config.minBet)} and ${money_(config.maxWager || config.maxBet)} chips.
      </p>

      ${renderBettingSummary_(summary)}

      ${renderBettingLeaderboardPreview_(leaderboardRes || [])}

      <div class="betting-category-list">
        ${categories.map(category =>
          renderBettingCategory_(
            category,
            betMap[category.id],
            config
          )
        ).join("")}
      </div>

    </div>
  `;

}

async function saveBetSelection(categoryId, nomineeId){

  if (BETTING_STATE.saving) {
    return;
  }

  BETTING_STATE.saving = true;

  const session = getBettingSession_();
  const username = session.username || "";
  const gameId = getBettingGameId_();
  const input = document.getElementById(
    getBetAmountInputId_(categoryId)
  );

  const betAmount = input
    ? input.value
    : "";

  const notice = document.getElementById("bettingNotice");

  if (notice) {
    notice.innerHTML = renderBettingNotice_(
      "Saving bet...",
      ""
    );
  }

  const res = await apiSaveBet({
    username: username,
    gameId: gameId,
    categoryId: categoryId,
    nomineeId: nomineeId,
    betAmount: betAmount
  });

  BETTING_STATE.saving = false;

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML = renderBettingNotice_(
        (res && (res.message || res.error)) ||
        "Could not save bet.",
        "error"
      );
    }

    return;

  }

  const app = document.getElementById("app");

  if (app) {
    app.innerHTML = await renderBettingPage();
  }

}
