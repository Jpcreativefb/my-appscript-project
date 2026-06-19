/* =========================
   WAGER PAGE
   Keeps Betting* function names for route/API compatibility.
========================= */

let BETTING_AUTO_REFRESH_TIMER = null;

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

function getBettingWinnings_(bankroll, startingBankroll){

  return Number(bankroll || 0) -
    Number(startingBankroll || 0);

}

function getBettingWinningsClass_(value){

  const n =
    Number(value || 0);

  if (n > 0) {
    return "positive";
  }

  if (n < 0) {
    return "negative";
  }

  return "neutral";

}

function getBettingUserPlace_(rows, username){

  const target =
    String(username || "")
      .trim()
      .toLowerCase();

  if (!target || !rows || !rows.length) {
    return "";
  }

  for (let i = 0; i < rows.length; i++) {

    const rowUser =
      String(rows[i].user || rows[i].username || "")
        .trim()
        .toLowerCase();

    if (rowUser === target) {
      return i + 1;
    }

  }

  return "";

}

function getBettingAverageWinnings_(rows, startingBankroll){

  if (!rows || !rows.length) {
    return 0;
  }

  const total =
    rows.reduce(function(sum, row){

      return sum + getBettingWinnings_(
        row.bankroll,
        startingBankroll
      );

    }, 0);

  return total / rows.length;

}

function renderBettingSummary_(summary, leaderboardRows, username, config){

  const startingBankroll =
    Number(
      config.startingBankroll || 0
    );

  const userPlace =
    getBettingUserPlace_(
      leaderboardRows,
      username
    );

  const userWinnings =
    getBettingWinnings_(
      summary.bankroll,
      startingBankroll
    );

  const avgWinnings =
    getBettingAverageWinnings_(
      leaderboardRows,
      startingBankroll
    );

  return `
    <div class="betting-summary-grid compact">

      <div class="betting-summary-card">
        <div class="betting-label">Place</div>
        <div class="betting-value">
          ${userPlace ? "#" + userPlace : "-"}
        </div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Bankroll</div>
        <div class="betting-value">${money_(summary.bankroll)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Winnings</div>
        <div class="betting-value betting-money-${getBettingWinningsClass_(userWinnings)}">
          ${userWinnings > 0 ? "+" : ""}${money_(userWinnings)}
        </div>
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
        <div class="betting-label">Pending</div>
        <div class="betting-value">${summary.pendingBets || 0}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Avg Winnings</div>
        <div class="betting-value betting-money-${getBettingWinningsClass_(avgWinnings)}">
          ${avgWinnings > 0 ? "+" : ""}${money_(avgWinnings)}
        </div>
      </div>

    </div>
  `;

}

function formatBettingGameDate_(value){

  if (!value) {
    return "";
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

}

function getBettingCountdown_(value, locked){

  if (locked) {
    return "Locked";
  }

  if (!value) {
    return "";
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return "";
  }

  const diff = d.getTime() - Date.now();

  if (diff <= 0) {
    return "Locks now";
  }

  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return `Locks in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Locks in ${hours}h ${mins}m`;
  }

  return `Locks in ${mins}m`;

}

function getBettingNomineeRecord_(category, nominee){

  const name =
    String(nominee.name || nominee.shortAnswer || "")
      .trim()
      .toLowerCase();

  const home =
    String(category.homeTeam || "")
      .trim()
      .toLowerCase();

  const away =
    String(category.awayTeam || "")
      .trim()
      .toLowerCase();

  if (name && home && name === home) {
    return category.homeRecord || "";
  }

  if (name && away && name === away) {
    return category.awayRecord || "";
  }

  return "";

}

function getBettingNomineeScore_(category, nominee){

  const name =
    String(nominee.name || nominee.shortAnswer || "")
      .trim()
      .toLowerCase();

  const home =
    String(category.homeTeam || "")
      .trim()
      .toLowerCase();

  const away =
    String(category.awayTeam || "")
      .trim()
      .toLowerCase();

  if (name && home && name === home && category.homeScore !== "") {
    return category.homeScore;
  }

  if (name && away && name === away && category.awayScore !== "") {
    return category.awayScore;
  }

  return "";

}

function formatBettingOrdinal_(value){

  const n =
    Number(value || 0);

  if (!n) {
    return "";
  }

  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? "st"
      : n % 10 === 2 && n % 100 !== 12
        ? "nd"
        : n % 10 === 3 && n % 100 !== 13
          ? "rd"
          : "th";

  return n + suffix;

}

function getBettingGameStateLabel_(category){

  const status =
    String(category.sportsStatus || "")
      .trim()
      .toLowerCase();

  const state =
    String(category.sportsState || "")
      .trim()
      .toLowerCase();

  const combined =
    status + " " + state;

  if (
    combined.includes("final") ||
    combined.includes("complete") ||
    combined.includes("completed") ||
    combined.includes("post")
  ) {
    return "Final";
  }

  if (
    combined.includes("pre") ||
    combined.includes("scheduled") ||
    combined.includes("not_started") ||
    combined.includes("not started")
  ) {
    return "Pregame";
  }

  return "";

}

function formatBettingPeriodLabel_(category){

  const period =
    category.sportsPeriod;

  if (
    period === "" ||
    period === undefined ||
    period === null
  ) {
    return "";
  }

  const league =
    String(
      category.league ||
      category.section ||
      ""
    )
      .trim()
      .toLowerCase();

  const n =
    Number(period);

  if (
    league === "nfl" ||
    league === "nba" ||
    league === "wnba" ||
    league === "ncaaf"
  ) {
    return "Q" + period;
  }

  if (
    league === "ncaamb" ||
    league === "ncaawb"
  ) {
    if (n === 1) {
      return "1st Half";
    }

    if (n === 2) {
      return "2nd Half";
    }

    return "OT";
  }

  if (league === "nhl") {
    return "P" + period;
  }

  if (league === "mlb") {
    return formatBettingOrdinal_(period) + " Inning";
  }

  if (
    league === "epl" ||
    league === "soccer"
  ) {
    return n <= 1
      ? "1st Half"
      : "2nd Half";
  }

  if (
    league === "nascar" ||
    league === "f1" ||
    league === "racing"
  ) {
    return "Lap " + period;
  }

  return "Period " + period;

}

function formatBettingClockLine_(category){

  const gameStateLabel =
    getBettingGameStateLabel_(
      category
    );

  if (gameStateLabel) {
    return gameStateLabel;
  }

  const clock =
    String(category.sportsClock || "")
      .trim();

  const league =
    String(
      category.league ||
      category.section ||
      ""
    )
      .trim()
      .toLowerCase();

  const periodLabel =
    formatBettingPeriodLabel_(
      category
    );

  if (
    !clock &&
    !periodLabel
  ) {
    return "";
  }

  /*
    MLB does not have a real game clock.
    ESPN usually sends values like:
    Top 3rd, Bottom 7th, Mid 5th, End 8th.
    Show that directly instead of "Clock:".
  */
  if (league === "mlb") {

    if (clock) {
      return clock;
    }

    return periodLabel;

  }

  /*
    Racing uses laps, not clock.
  */
  if (
    league === "nascar" ||
    league === "f1" ||
    league === "racing"
  ) {
    return periodLabel || clock;
  }

  if (
    clock &&
    periodLabel
  ) {
    return "Clock: " + clock + " · " + periodLabel;
  }

  if (clock) {
    return "Clock: " + clock;
  }

  return periodLabel;

}

function renderBettingCategory_(category, bet, config){

  const inputId =
    getBetAmountInputId_(category.id);

  const defaultAmount = bet
    ? bet.betAmount
    : (config.minWager || config.minBet);

  const locked =
    category.locked === true;

  const currentPick = bet
    ? getBettingNomineeName_(category, bet.nomineeId)
    : "";

  const gameDate =
    formatBettingGameDate_(category.lockDateTime);

  const countdown =
    getBettingCountdown_(category.lockDateTime, locked);

  const league =
    category.league || category.section || "";

    const clockLine =
    formatBettingClockLine_(
      category
    );

  return `
    <details class="betting-category-card ${locked ? "locked" : ""} ${bet ? "has-bet" : ""}">

      <summary class="betting-category-summary">

        <div class="betting-summary-main">
          <div class="betting-category-title">
            ${escapeBettingHtml_(category.shortName || category.name)}
          </div>

          <div class="betting-game-meta">
            ${league ? `
              <span>${escapeBettingHtml_(String(league).toUpperCase())}</span>
            ` : ""}

            ${gameDate ? `
              <span>${escapeBettingHtml_(gameDate)}</span>
            ` : ""}

            ${clockLine ? `
              <span class="betting-clock-pill">
                 ${escapeBettingHtml_(clockLine)}
              </span>
              ` : ""}

          </div>

          ${bet ? `
            <div class="betting-current">
              Current: ${money_(bet.betAmount)} on ${escapeBettingHtml_(currentPick)}
            </div>
          ` : `
            <div class="betting-current muted">
              Tap to place bet
            </div>
          `}
        </div>

        <div class="betting-summary-side">

          ${bet ? `
            <div class="betting-header-bet-marker">
              $
            </div>
          ` : ""}

          ${countdown ? `
            <div class="betting-countdown ${locked ? "locked" : ""}">
              ${escapeBettingHtml_(countdown)}
            </div>
          ` : ""}

          <div class="betting-expand-icon">⌄</div>
        </div>

      </summary>

      <div class="betting-collapsible-body">

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
          data-betting-amount-category="${escapeBettingHtml_(category.id)}"
          oninput="updateBettingReturnsForCategory('${category.id}')"
          ${locked ? "disabled" : ""}
        >

        <div class="betting-nominee-grid">
          ${(category.nominees || []).map(nominee => {

            const selected = bet &&
              bet.nomineeId === nominee.id;

            const potential =
              Number(defaultAmount || 0) *
              Number(nominee.odds || 0);

            const record =
              getBettingNomineeRecord_(category, nominee);

            const score =
              getBettingNomineeScore_(category, nominee);

            return `
              <button
                class="betting-nominee-card ${selected ? "selected" : ""}"
                onclick="saveBetSelection('${category.id}', '${nominee.id}')"
                ${locked ? "disabled" : ""}
              >
              <div class="betting-logo-score-area">

                ${nominee.image ? `
                  <img
                   class="betting-logo-fill"
                   src="${escapeBettingHtml_(nominee.image)}"
                   alt=""
                   loading="lazy"
                  >
                ` : `
                  <div class="betting-logo-placeholder"></div>
                `}

                ${score !== "" ? `
                  <div class="betting-logo-score">
                    ${escapeBettingHtml_(score)}
                  </div>
                ` : ""}

              </div>
            

                <div class="betting-nominee-name">
                  ${escapeBettingHtml_(nominee.shortAnswer || nominee.name)}

                  ${record ? `
                    <span class="betting-team-record">
                      ${escapeBettingHtml_(record)}
                    </span>
                  ` : ""}
                </div>

                <div class="betting-odds-row">
                   <span>${odds_(nominee.odds)}</span>

                   <span
                     class="betting-return-value"
                     data-betting-return-category="${escapeBettingHtml_(category.id)}"
                     data-betting-odds="${escapeBettingHtml_(nominee.odds)}"
                   >
                      Return ${money_(potential)}
                   </span>
                </div>

              </button>
            `;

          }).join("")}
        </div>

      </div>

    </details>
  `;

}

function renderBettingLeaderboardPreview_(rows, config){

  if (!rows || !rows.length) {
    return "";
  }

  const startingBankroll =
    Number(
      config.startingBankroll || 0
    );

  const leader =
    rows[0];

  const leaderWinnings =
    getBettingWinnings_(
      leader.bankroll,
      startingBankroll
    );

  return `
    <details class="betting-leaderboard-card betting-leaderboard-collapse">

      <summary class="betting-leaderboard-summary">
        <div>
          <div class="betting-section-title">Wager Leaderboard</div>

          <div class="betting-leaderboard-subtitle">
            #1 ${escapeBettingHtml_(leader.user || leader.username || "")}
            · ${money_(leader.bankroll)}
            ·
            <span class="betting-money-${getBettingWinningsClass_(leaderWinnings)}">
              ${leaderWinnings > 0 ? "+" : ""}${money_(leaderWinnings)}
            </span>
          </div>
        </div>

        <div class="betting-expand-icon">⌄</div>
      </summary>

      <div class="betting-leaderboard-body">

        ${rows.slice(0, 10).map((row, index) => {

          const winnings =
            getBettingWinnings_(
              row.bankroll,
              startingBankroll
            );

          return `
            <div class="betting-leaderboard-row">

              <div class="betting-place-pill">
                #${index + 1}
              </div>

              <div class="betting-leaderboard-user">
                <strong>${escapeBettingHtml_(row.user || row.username || "")}</strong>

                <div class="betting-row-sub">
                  ${row.wonBets || 0} won · ${row.pendingBets || 0} pending
                </div>
              </div>

              <div class="betting-row-score">
                <div>${money_(row.bankroll)}</div>

                <div class="betting-row-winnings betting-money-${getBettingWinningsClass_(winnings)}">
                  ${winnings > 0 ? "+" : ""}${money_(winnings)}
                </div>
              </div>

            </div>
          `;

        }).join("")}

      </div>

    </details>
  `;

}

function isBettingFinalCategory_(category){

  const label =
    typeof getBettingGameStateLabel_ === "function"
      ? getBettingGameStateLabel_(category)
      : "";

  if (label === "Final") {
    return true;
  }

  const status =
    String(category.sportsStatus || "")
      .trim()
      .toLowerCase();

  const state =
    String(category.sportsState || "")
      .trim()
      .toLowerCase();

  const combined =
    status + " " + state;

  return (
    combined.includes("final") ||
    combined.includes("complete") ||
    combined.includes("completed") ||
    combined.includes("post")
  );

}

function getBettingCategorySortTime_(category){

  const d =
    new Date(category.lockDateTime || "");

  const t =
    d.getTime();

  if (isNaN(t)) {
    return 9999999999999;
  }

  return t;

}

function getBettingDateKey_(category){

  const d =
    new Date(category.lockDateTime || "");

  if (isNaN(d.getTime())) {
    return "date-tbd";
  }

  const year =
    d.getFullYear();

  const month =
    String(d.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(d.getDate())
      .padStart(2, "0");

  return year + "-" + month + "-" + day;

}

function getBettingDateLabel_(category){

  const d =
    new Date(category.lockDateTime || "");

  if (isNaN(d.getTime())) {
    return "Date TBD";
  }

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

}

function getBettingLeagueLabel_(category){

  const league =
    String(
      category.league ||
      category.section ||
      "Other"
    )
      .trim();

  return league
    ? league.toUpperCase()
    : "OTHER";

}

function groupBettingCategoriesByDateAndLeague_(categories, newestFirst){

  const dateMap = {};

  categories.forEach(function(category){

    const dateKey =
      getBettingDateKey_(category);

    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        key: dateKey,
        label: getBettingDateLabel_(category),
        sortTime: getBettingCategorySortTime_(category),
        leagues: {}
      };
    }

    const leagueLabel =
      getBettingLeagueLabel_(category);

    if (!dateMap[dateKey].leagues[leagueLabel]) {
      dateMap[dateKey].leagues[leagueLabel] = {
        label: leagueLabel,
        categories: []
      };
    }

    dateMap[dateKey]
      .leagues[leagueLabel]
      .categories
      .push(category);

    dateMap[dateKey].sortTime =
      Math.min(
        dateMap[dateKey].sortTime,
        getBettingCategorySortTime_(category)
      );

  });

  return Object.values(dateMap)
    .sort(function(a, b){

      return newestFirst
        ? b.sortTime - a.sortTime
        : a.sortTime - b.sortTime;

    })
    .map(function(dateGroup){

      dateGroup.leagueGroups =
        Object.values(dateGroup.leagues)
          .sort(function(a, b){
            return a.label.localeCompare(b.label);
          })
          .map(function(leagueGroup){

            leagueGroup.categories.sort(function(a, b){

              return newestFirst
                ? getBettingCategorySortTime_(b) - getBettingCategorySortTime_(a)
                : getBettingCategorySortTime_(a) - getBettingCategorySortTime_(b);

            });

            return leagueGroup;

          });

      return dateGroup;

    });

}

function bettingGameCountLabel_(count){

  return count === 1
    ? "1 game"
    : count + " games";

}

function bettingCategoryHasBet_(category, betMap){

  return !!(
    betMap &&
    category &&
    category.id &&
    betMap[category.id]
  );

}

function countBettingBetsInCategories_(categories, betMap){

  return (categories || [])
    .filter(function(category){
      return bettingCategoryHasBet_(
        category,
        betMap
      );
    })
    .length;

}

function renderBettingBetMarker_(show){

  if (!show) {
    return "";
  }

  return `
    <span class="betting-bet-marker">
      $
    </span>
  `;

}

function renderBettingLeagueGroup_(leagueGroup, betMap, config, open){

  const openAttr =
    open ? " open" : "";

  const betCount =
    countBettingBetsInCategories_(
      leagueGroup.categories,
      betMap
    );

  const hasBets =
    betCount > 0;

  return `
    <details class="betting-league-group ${hasBets ? "has-bet" : ""}"${openAttr}>

      <summary class="betting-group-summary betting-league-summary">
        <span class="betting-group-title">
          ${escapeBettingHtml_(leagueGroup.label)}
        </span>

        <span class="betting-group-side">
        

          <span class="betting-group-count ${hasBets ? "has-bet" : ""}">
            ${escapeBettingHtml_(bettingGameCountLabel_(leagueGroup.categories.length))}
          </span>

          <span class="betting-group-arrow">⌄</span>
        </span>
      </summary>

      <div class="betting-league-body">
        ${leagueGroup.categories.map(function(category){
          return renderBettingCategory_(
            category,
            betMap[category.id],
            config
          );
        }).join("")}
      </div>

    </details>
  `;

}

function renderBettingDateGroup_(dateGroup, betMap, config, open){

  const openAttr =
    open ? " open" : "";

  const categories = [];

  dateGroup.leagueGroups.forEach(function(leagueGroup){

    categories.push.apply(
      categories,
      leagueGroup.categories
    );

  });

  const count =
    categories.length;

  const betCount =
    countBettingBetsInCategories_(
      categories,
      betMap
    );

  const hasBets =
    betCount > 0;

  return `
    <details class="betting-date-group ${hasBets ? "has-bet" : ""}"${openAttr}>

      <summary class="betting-group-summary betting-date-summary">
        <span class="betting-group-title">
          ${escapeBettingHtml_(dateGroup.label)}
        </span>

        <span class="betting-group-side">
          <span class="betting-group-count ${hasBets ? "has-bet" : ""}">
            ${escapeBettingHtml_(bettingGameCountLabel_(count))}
          </span>

          <span class="betting-group-arrow">⌄</span>
        </span>
      </summary>

      <div class="betting-date-body">
        ${dateGroup.leagueGroups.map(function(leagueGroup){
          return renderBettingLeagueGroup_(
            leagueGroup,
            betMap,
            config,
            true
          );
        }).join("")}
      </div>

    </details>
  `;

}

function renderBettingFinalGamesGroup_(finalCategories, betMap, config){

  if (!finalCategories.length) {
    return "";
  }

  const finalGroups =
    groupBettingCategoriesByDateAndLeague_(
      finalCategories,
      true
    );

  return `
    <details class="betting-final-group">

      <summary class="betting-group-summary betting-final-summary">
        <span class="betting-group-title">
          Finished Games
        </span>

        <span class="betting-group-side">
          <span class="betting-group-count">
            ${escapeBettingHtml_(bettingGameCountLabel_(finalCategories.length))}
          </span>
          <span class="betting-group-arrow">⌄</span>
        </span>
      </summary>

      <div class="betting-final-body">
        ${finalGroups.map(function(dateGroup){
          return renderBettingDateGroup_(
            dateGroup,
            betMap,
            config,
            false
          );
        }).join("")}
      </div>

    </details>
  `;

}

function renderBettingGroupedCategories_(categories, betMap, config){

  const activeCategories =
    [];

  const finalCategories =
    [];

  categories.forEach(function(category){

    if (isBettingFinalCategory_(category)) {
      finalCategories.push(category);
    } else {
      activeCategories.push(category);
    }

  });

  const activeGroups =
    groupBettingCategoriesByDateAndLeague_(
      activeCategories,
      false
    );

  return `
    <div class="betting-category-list betting-grouped-list">

      ${activeCategories.length ? `
        <div class="betting-group-section-label">
          Active & Upcoming Games
        </div>

        ${activeGroups.map(function(dateGroup, index){
          return renderBettingDateGroup_(
            dateGroup,
            betMap,
            config,
            index === 0
          );
        }).join("")}
      ` : ""}

      ${renderBettingFinalGamesGroup_(
        finalCategories,
        betMap,
        config
      )}

    </div>
  `;

}

function renderBettingAdminControls_(session){

  if (
    !session ||
    session.isAdmin !== true
  ) {
    return "";
  }

  return `
    <div class="betting-admin-controls">

      <button
        class="betting-admin-btn"
        type="button"
        onclick="refreshWagerScoresFromPage_()"
      >
        Refresh Scores / Records
      </button>

      <button
        class="betting-admin-btn tertiary"
        type="button"
        onclick="autoSetWagerOddsFromPage_()"
      >
        Auto Odds
      </button>

      <button
        class="betting-admin-btn secondary"
        type="button"
        onclick="settleWagersFromPage_()"
      >
        Settle Final Games
      </button>

    </div>
  `;

}

async function renderBettingPage(){

  const session = getBettingSession_();
  const username = session.username || "";
  const gameId = getBettingGameId_();

  setTimeout(
    startBettingAutoRefresh_,
    0
  );

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

      ${renderBettingAdminControls_(session)}

      <p class="betting-intro">
        Start with ${money_(config.startingBankroll)} chips. Pick one nominee per category and wager between ${money_(config.minWager || config.minBet)} and ${money_(config.maxWager || config.maxBet)} chips.
      </p>

      ${renderBettingSummary_(
  summary,
  leaderboardRes || [],
  username,
  config
)}

${renderBettingLeaderboardPreview_(
  leaderboardRes || [],
  config
)}

      ${renderBettingGroupedCategories_(
        categories,
        betMap,
        config
      )}

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

function updateBettingReturnsForCategory(categoryId){

  const inputId =
    getBetAmountInputId_(categoryId);

  const input =
    document.getElementById(inputId);

  if (!input) {
    return;
  }

  const amount =
    Number(input.value || 0);

  const returnEls =
    document.querySelectorAll(
      `[data-betting-return-category="${categoryId}"]`
    );

  returnEls.forEach(function(el){

    const odds =
      Number(
        el.getAttribute("data-betting-odds") || 0
      );

    const potential =
      amount * odds;

    el.textContent =
      "Return " + money_(potential);

  });

}

function startBettingAutoRefresh_(){

  if (BETTING_AUTO_REFRESH_TIMER) {
    clearInterval(
      BETTING_AUTO_REFRESH_TIMER
    );
  }

  BETTING_AUTO_REFRESH_TIMER =
    setInterval(async function(){

      if (BETTING_STATE.saving) {
        return;
      }

      const app =
        document.getElementById("app");

      if (!app) {
        return;
      }

      const isWagerPage =
        app.querySelector(".betting-page");

      if (!isWagerPage) {
        clearInterval(
          BETTING_AUTO_REFRESH_TIMER
        );

        BETTING_AUTO_REFRESH_TIMER = null;
        return;
      }

      app.innerHTML =
        await renderBettingPage();

    }, 60000);

}

async function refreshWagerScoresFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Refreshing scores and records...",
        ""
      );
  }

  const res =
    await apiAdminRefreshSportsWagerScores(
      gameId
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not refresh wager scores.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Scores and records refreshed. Updated rows: " +
        (res.updated || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}

async function settleWagersFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Settling final games...",
        ""
      );
  }

  const res =
    await apiAdminSettleSportsWagers(
      gameId
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not settle final games.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Settlement complete. Settled: " +
        (res.settled || 0) +
        ", skipped: " +
        (res.skipped || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}

async function autoSetWagerOddsFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Updating automatic odds. Games with existing bets will be protected...",
        ""
      );
  }

  const res =
    await apiAdminAutoSetSportsWagerOdds(
      gameId
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not update automatic odds.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Auto odds updated. Rows updated: " +
        (res.updatedRows || 0) +
        ". Protected games with bets: " +
        (res.protected || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}
