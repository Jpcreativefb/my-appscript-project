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
  seasonAnchor: null,
  episodeComparison: null,
  realityTvView: null,
  appearance: null
};

let PICKS_COUNTDOWN_TIMER = null;
let PICKS_ENHANCEMENTS_REQUEST = null;
const PICKS_ENHANCEMENTS_CACHE = {};
const PICKS_PENDING_SAVES = {};
let PICKS_AUTO_ADVANCE_TIMER = null;
let PICKS_TEMP_OPEN_CATEGORY_ID = "";
let PICKS_SEASON_ANCHOR_DRAFT_ID = "";
let PICKS_CONFIDENCE_BASELINE_PICKS = {};
let PICKS_CONFIDENCE_BASELINE_POINTS = {};
let PICKS_CONFIDENCE_BASE_SIGNATURE = "";
let PICKS_CONFIDENCE_BATCH_SAVING = false;
let PICKS_CONFIDENCE_SORT_MODE = "time";
let PICKS_CONFIDENCE_SORT_ORDER = [];
let PICKS_CONFIDENCE_SORT_STALE = false;
let PICKS_CONFIDENCE_EXPANDED = new Set();
let PICKS_CONFIDENCE_LIVE_TIMER = null;
let PICKS_CONFIDENCE_LIVE_IN_FLIGHT = false;
let PICKS_CONFIDENCE_ODDS_BY_CATEGORY = {};
let PICKS_CONFIDENCE_ODDS_IN_FLIGHT = {};
let PICKS_CONFIDENCE_APPEARANCE_REQUEST = null;
let PICKS_CONFIDENCE_APPEARANCE_GAME_ID = "";

const PICKS_CONFIDENCE_SPORTS_API_URL =
  "https://script.google.com/macros/s/AKfycbwVlgZa1FBvt99dpwr4PbrdBOs9IRcZ6BFlr-t6scTRNcVgQsJKpCWk1d8nxC681Sy0/exec";
const PICKS_CONFIDENCE_LIVE_REFRESH_MS = 30000;
const PICKS_CONFIDENCE_SPORTS_TIMEOUT_MS = 45000;


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

function realityTvSafeColor_(value) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : "#64748B";
}

function realityTvProfileDetailsHtml_(item) {
  item = item || {};
  const facts = [];
  if (item.fullName && item.fullName !== item.name) facts.push(["Full name", item.fullName]);
  if (item.member1 || item.member2) facts.push(["Members", [item.member1, item.member2].filter(Boolean).join(" & ")]);
  if (item.relationship) facts.push(["Relationship", item.relationship]);
  if (item.age) facts.push(["Age", item.age]);
  if (item.hometown) facts.push(["Hometown", item.hometown]);
  if (item.occupation) facts.push(["Occupation", item.occupation]);
  if (item.startingGroup) facts.push(["Starting group", item.startingGroup]);
  if (item.currentGroup) facts.push(["Current group", item.currentGroup]);
  if (item.finalGroup && item.finalGroup !== item.currentGroup) facts.push(["Final / latest group", item.finalGroup]);
  if (!item.startingGroup && item.teamOrTribe) facts.push(["Team / group", item.teamOrTribe]);
  const history = Array.isArray(item.groupHistory) ? item.groupHistory : [];
  const historyHtml = history.length ? `<div class="reality-profile-group-history"><span>Group history</span>${history.map(function(entry) {
    const end = Number(entry.endEpisode || 0);
    return `<div><strong>${escapeHtml(entry.groupName || "Unassigned")}</strong><small>Episode ${Number(entry.startEpisode || 1)}${end ? "–" + end : "+"}</small></div>`;
  }).join("")}</div>` : "";
  return `<div class="reality-profile-facts">${facts.map(function(pair) { return `<div><span>${escapeHtml(pair[0])}</span><strong>${escapeHtml(pair[1])}</strong></div>`; }).join("")}</div>${historyHtml}${item.biography ? `<p class="reality-profile-bio">${escapeHtml(item.biography)}</p>` : ""}`;
}


function realityTvFormatPoints_(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function realityTvMovementHtml_(value) {
  const movement = Number(value || 0);
  if (movement > 0) return `<span class="reality-stat-movement up">▲${movement}</span>`;
  if (movement < 0) return `<span class="reality-stat-movement down">▼${Math.abs(movement)}</span>`;
  return `<span class="reality-stat-movement even">—</span>`;
}

function renderRealityTvPlayerSummary_() {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  if (view.enabled !== true || !view.playerStats || !view.playerStats.overall) return "";
  const overall = view.playerStats.overall || {};
  const rows = Array.isArray(view.playerStats.compactLeaderboard) ? view.playerStats.compactLeaderboard : [];
  const leaderboard = rows.length ? `<div class="reality-compact-leaderboard">${rows.map(function(row) {
    return `<div class="reality-compact-leaderboard-row ${row.isCurrent ? "is-current" : ""} ${row.separated ? "is-separated" : ""}"><span class="reality-compact-rank">#${Number(row.rank || 0) || "—"}</span><span class="reality-compact-avatar">${escapeHtml(row.avatar || "👤")}</span><strong>${escapeHtml(row.displayName || row.username || "Player")}</strong><span>${realityTvFormatPoints_(row.total)} pts</span></div>`;
  }).join("")}</div>` : `<div class="reality-compact-empty">Leaderboard appears after players submit picks.</div>`;
  return `<section class="reality-player-summary-card">
    <div class="reality-player-summary-heading"><div><span class="season-anchor-eyebrow">Your season</span><h2>Score & Standings</h2></div><div class="reality-player-score-total"><strong>${realityTvFormatPoints_(overall.totalPoints)}</strong><span>Total points</span></div></div>
    <div class="reality-player-summary-stats">
      <div><span>Current place</span><strong>${Number(overall.rank || 0) ? "#" + Number(overall.rank) : "—"}</strong><small>${Number(overall.totalPlayers || 0)} player${Number(overall.totalPlayers || 0) === 1 ? "" : "s"}</small></div>
      <div><span>Correct answers</span><strong>${Number(overall.correct || 0)} of ${Number(overall.settled || 0)}</strong><small>Settled questions</small></div>
      <div><span>Survivor adjustment</span><strong>${Number(overall.seasonAnchorNet || 0) >= 0 ? "+" : ""}${realityTvFormatPoints_(overall.seasonAnchorNet)}</strong><small>Bonus minus penalties</small></div>
    </div>
    <details class="reality-compact-leaderboard-shell" open><summary>Compact leaderboard</summary>${leaderboard}</details>
  </section>`;
}

function seasonAnchorEntityById_(entityId) {
  const anchor = PICKS_PAGE_DATA.seasonAnchor || {};
  const all = Array.isArray(anchor.allEntities) ? anchor.allEntities : [];
  const active = Array.isArray(anchor.entities) ? anchor.entities : [];
  return all.concat(active).find(function(item) {
    return normalizeId(item && item.id) === normalizeId(entityId);
  }) || null;
}

function seasonAnchorImageHtml_(profile, eliminated) {
  profile = profile || {};
  const image = profile.imageUrl || profile.ImageUrl || profile.logoUrl || profile.groupImageUrl || "";
  const initials = String(profile.name || "?").split(/\s+/).map(function(part) {
    return part.slice(0, 1);
  }).join("").slice(0, 2).toUpperCase() || "?";
  return `<div class="season-anchor-profile-image ${eliminated ? "is-eliminated" : ""}">
    <span class="season-anchor-image-fallback" aria-hidden="true">${escapeHtml(initials)}</span>
    ${image ? platformImgHtml(image, { className: "season-anchor-current-image", variant: "profile", alt: profile.name || "Survivor pick", critical: true }) : ""}
    ${eliminated ? `<div class="reality-eliminated-overlay">ELIMINATED</div>` : ""}
  </div>`;
}

function seasonAnchorActiveBioBrowserHtml_(entities) {
  if (!Array.isArray(entities) || !entities.length) return "";
  return `<details class="season-anchor-cast-bios">
    <summary>Browse contestant bios before finalizing</summary>
    <div class="season-anchor-bio-browser">${entities.map(function(item) {
      const image = item.imageUrl || item.ImageUrl || item.logoUrl || "";
      return `<article class="season-anchor-bio-card">
        <button type="button" class="season-anchor-bio-preview" onclick="previewSeasonAnchorPick_('${escapeJs(item.id)}')">
          ${image ? platformImgHtml(image, { className: "season-anchor-bio-thumb", variant: "thumb", alt: item.name || "Contestant" }) : `<span class="season-anchor-bio-initials">${escapeHtml(String(item.name || "?").slice(0, 2).toUpperCase())}</span>`}
          <span><strong>${escapeHtml(item.name || "Contestant")}</strong>${item.teamOrTribe ? `<small>${escapeHtml(item.teamOrTribe)}</small>` : ""}</span>
        </button>
        <details><summary>Bio & details</summary>${realityTvProfileDetailsHtml_(item)}</details>
      </article>`;
    }).join("")}</div>
  </details>`;
}

function previewSeasonAnchorPick_(entityId) {
  PICKS_SEASON_ANCHOR_DRAFT_ID = String(entityId || "");
  const mount = document.getElementById("seasonAnchorPickMount");
  if (mount) {
    mount.innerHTML = renderSeasonAnchorPickCard_();
    if (window.PlatformImageEngine) window.PlatformImageEngine.process(mount);
  }
}

function renderSeasonAnchorPickCard_() {
  const anchor = PICKS_PAGE_DATA.seasonAnchor;
  if (anchor && anchor.deferred === true) {
    return `<section class="season-anchor-card loading" aria-live="polite">
      <div class="season-anchor-card-header"><div><span class="season-anchor-eyebrow">Pinned season feature</span><h2>Season Survivor Pick</h2><p>Loading the current survivor selection and active participants…</p></div><span class="season-anchor-status open">Loading</span></div>
    </section>`;
  }
  if (!anchor || anchor.enabled !== true) return "";

  const settings = anchor.settings || {};
  const user = anchor.user || null;
  const entities = Array.isArray(anchor.entities) ? anchor.entities : [];
  const currentId = user ? String(user.currentEntityId || "") : "";
  const currentProfile = anchor.currentEntity || seasonAnchorEntityById_(currentId);
  const stats = anchor.stats || {};
  const needsPick = !user || String(user.status || "NEEDS_PICK").toUpperCase() === "NEEDS_PICK" || !currentId || user.currentEntityActive === false;
  const finalized = !needsPick && !!currentId;
  const locked = anchor.locked === true;
  const canChoose = anchor.canChoose === true && needsPick && !locked;

  if (!canChoose) PICKS_SEASON_ANCHOR_DRAFT_ID = "";
  const draftId = canChoose ? String(PICKS_SEASON_ANCHOR_DRAFT_ID || "") : "";
  const draftProfile = draftId ? seasonAnchorEntityById_(draftId) : null;
  const previewProfile = draftProfile || currentProfile || null;
  const previewIsEliminated = !!(previewProfile && String(previewProfile.status || "ACTIVE").toUpperCase() !== "ACTIVE");
  const currentWasEliminated = !!(needsPick && currentProfile && String(currentProfile.status || "ACTIVE").toUpperCase() !== "ACTIVE");
  const color = realityTvSafeColor_(previewProfile && previewProfile.teamColor);

  const currentMultiplier = user ? Number(user.currentMultiplier || settings.StartMultiplier || 1) : Number(settings.StartMultiplier || 1);
  const growth = Number(settings.GrowthPerSuccess || 0);
  const cap = Number(settings.MaxMultiplier || currentMultiplier);
  const nextMultiplier = Math.min(cap, currentMultiplier + growth);

  const optionHtml = entities.map(function(item) {
    return `<option value="${escapeAttr(item.id)}" ${String(item.id) === draftId ? "selected" : ""}>${escapeHtml(item.name)}${item.teamOrTribe ? " — " + escapeHtml(item.teamOrTribe) : ""}</option>`;
  }).join("");

  const statusText = locked ? "Locked" : finalized ? "Finalized" : "Open";
  const statusClass = locked ? "locked" : finalized ? "finalized" : "open";
  const summaryHtml = finalized
    ? `<div class="season-anchor-current-pick"><span class="season-anchor-label">Finalized pick</span><strong>${escapeHtml(user.currentEntityName || currentId)}</strong><span>This selection stays active until the contestant is eliminated.</span></div>`
    : currentWasEliminated && !draftProfile
      ? `<div class="season-anchor-current-pick needs-pick"><span class="season-anchor-label">Eliminated pick</span><strong>${escapeHtml(user.currentEntityName || currentId)}</strong><span>Select a remaining contestant below and finalize a new pick.</span></div>`
      : `<div class="season-anchor-current-pick needs-pick"><span class="season-anchor-label">${draftProfile ? "Ready to finalize" : "New selection needed"}</span><strong>${escapeHtml(previewProfile ? previewProfile.name : "Choose an active contestant")}</strong><span>${draftProfile ? "Review the bio, then finalize this pick." : "Choose from the dropdown or browse the bios below."}</span></div>`;

  const pickerHtml = canChoose ? `<div class="season-anchor-picker">
    <label for="seasonAnchorEntitySelect">Choose your Sole Survivor pick</label>
    <div class="season-anchor-picker-row">
      <select id="seasonAnchorEntitySelect" class="input" onchange="previewSeasonAnchorPick_(this.value)"><option value="">Choose an active contestant…</option>${optionHtml}</select>
      <button type="button" class="button season-anchor-finalize-button" onclick="saveSeasonAnchorPick_()" ${draftId ? "" : "disabled"}>Finalize Pick</button>
    </div>
    <small>Once finalized, this selector disappears. It returns only after the pick is eliminated.</small>
  </div>` : finalized
    ? `<div class="season-anchor-locked-note finalized">Your Sole Survivor pick is finalized. You can choose again only if this contestant is eliminated.</div>`
    : `<div class="season-anchor-locked-note">${locked ? "The Sole Survivor selection window is closed for this episode." : "A new selection is not available yet."}</div>`;

  return `<section class="season-anchor-card ${needsPick ? "needs-pick" : "active"}">
    <div class="season-anchor-card-header"><div><span class="season-anchor-eyebrow">Pinned season feature</span><h2>${escapeHtml(settings.DisplayLabel || "Season Survivor Pick")}</h2><p>Finalize one active contestant. The pick remains until that contestant is eliminated.</p></div><span class="season-anchor-status ${statusClass}">${statusText}</span></div>
    <div class="season-anchor-feature-grid">
      <div class="season-anchor-profile ${previewIsEliminated ? "is-eliminated" : ""}" style="--reality-team-color:${escapeAttr(color)}">
        ${seasonAnchorImageHtml_(previewProfile, previewIsEliminated)}
        ${pickerHtml}
        ${summaryHtml}
        ${previewProfile ? `<details class="reality-profile-details" ${draftProfile ? "open" : ""}><summary>Bio & details</summary>${realityTvProfileDetailsHtml_(previewProfile)}</details>` : ""}
      </div>
      <div class="season-anchor-summary-grid">
        <div><span>Current multiplier</span><strong>${formatSeasonAnchorMultiplier_(currentMultiplier)}</strong></div>
        <div><span>Next survival</span><strong>${formatSeasonAnchorMultiplier_(nextMultiplier)}</strong></div>
        <div><span>Current streak</span><strong>${Number(user && user.streak || 0)}</strong></div>
        <div><span>Longest streak</span><strong>${Number(stats.longestStreak || 0)}</strong></div>
        <div><span>Total bonus</span><strong>+${Number(stats.totalBonus || 0).toLocaleString()} pts</strong></div>
        <div><span>Total penalties</span><strong>-${Number(stats.totalPenalty || 0).toLocaleString()} pts</strong></div>
        <div><span>Net adjustment</span><strong>${Number(stats.netAdjustment || 0) >= 0 ? "+" : ""}${Number(stats.netAdjustment || 0).toLocaleString()} pts</strong></div>
        <div><span>Maximum weekly bonus</span><strong>${Number(anchor.maxWeeklyBonus || 0).toLocaleString()} pts</strong></div>
        <div class="season-anchor-current-episode"><span>Current ${escapeHtml((anchor.season && anchor.season.periodLabel) || "Episode")}: ${escapeHtml(anchor.episode ? anchor.episode.episodeName : "Not scheduled")}</span><strong>${escapeHtml(formatSeasonAnchorLock_(anchor.episode && anchor.episode.lockDateTime))}</strong></div>
      </div>
    </div>
    ${canChoose ? seasonAnchorActiveBioBrowserHtml_(entities) : ""}
    <div class="season-anchor-rules-line">Growth: +${Number(settings.GrowthPerSuccess || 0).toFixed(2)}x · Cap: ${formatSeasonAnchorMultiplier_(settings.MaxMultiplier || 1)} · Eligible points cap: ${Number(settings.EligiblePointsCap || 0)} · Loss penalty: -${Number(settings.LossPenalty || 0)}</div>
  </section>`;
}

async function saveSeasonAnchorPick_() {
  const anchor = PICKS_PAGE_DATA.seasonAnchor || {};
  const entityId = String(PICKS_SEASON_ANCHOR_DRAFT_ID || (document.getElementById("seasonAnchorEntitySelect") || {}).value || "");
  if (!entityId) {
    showPicksMessage("Choose a contestant before finalizing.", true);
    return;
  }
  const profile = seasonAnchorEntityById_(entityId);
  if (!window.confirm("Finalize " + (profile && profile.name ? profile.name : "this contestant") + " as your Sole Survivor pick?\n\nYou cannot change this pick unless the contestant is eliminated.")) return;

  showPicksMessage("Finalizing Sole Survivor pick…", false);
  try {
    const response = await apiSaveSeasonAnchorPick(PICKS_PAGE_DATA.gameId, entityId);
    if (!response || response.success === false) throw new Error((response && (response.error || response.message)) || "Could not finalize the Sole Survivor pick.");
    clearStartupPayload();
    PICKS_SEASON_ANCHOR_DRAFT_ID = "";
    if (response.seasonAnchor) PICKS_PAGE_DATA.seasonAnchor = response.seasonAnchor;
    const key = picksEnhancementKey_();
    PICKS_ENHANCEMENTS_CACHE[key] = Object.assign({}, PICKS_ENHANCEMENTS_CACHE[key] || {}, { seasonAnchor: PICKS_PAGE_DATA.seasonAnchor });
    refreshPicksEnhancementUi_();
    showPicksMessage(response.message || "Sole Survivor pick finalized.", false);
  } catch (err) {
    showPicksMessage(err.message || String(err), true);
  }
}


function renderRealityTvEpisodeComparison_() {
  const comparison = PICKS_PAGE_DATA.episodeComparison;
  if (!comparison || comparison.enabled !== true || comparison.available !== true) return "";
  const columns = Array.isArray(comparison.columns) ? comparison.columns : [];
  const rows = Array.isArray(comparison.rows) ? comparison.rows : [];
  const episode = comparison.episode || {};
  return `<details class="reality-tv-comparison-card">
    <summary>
      <span><span class="season-anchor-eyebrow">Visible after lock</span><strong>${escapeHtml(episode.episodeName || "Episode group comparison")}</strong></span>
      <span>${Number(comparison.playerCount || rows.length)} player${Number(comparison.playerCount || rows.length) === 1 ? "" : "s"}</span>
    </summary>
    <p>Compare everyone’s finalized Sole Survivor pick and weekly answers. This grid appears only after the episode locks.</p>
    <div class="reality-tv-comparison-scroll">
      <table class="reality-tv-comparison-grid">
        <thead><tr><th>Player</th><th>Sole Pick</th>${columns.map(function(column) {
          return `<th title="${escapeAttr(column.fullLabel || column.label || "Question")}">${escapeHtml(column.label || column.fullLabel || "Question")}</th>`;
        }).join("")}</tr></thead>
        <tbody>${rows.length ? rows.map(function(row) {
          return `<tr><th>${escapeHtml(row.displayName || row.username || "Player")}</th><td>${escapeHtml(row.survivorPick || "—")}</td>${columns.map(function(column) {
            return `<td>${escapeHtml(row.answers && row.answers[column.id] || "—")}</td>`;
          }).join("")}</tr>`;
        }).join("") : `<tr><td colspan="${columns.length + 2}">No locked picks were submitted.</td></tr>`}</tbody>
      </table>
    </div>
  </details>`;
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

  setPageLoadStep(46, "Loading questions, saved picks, and game rules…");

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

  setPageLoadStep(84, "Preparing Reality TV questions and saved selections…");

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

  resetConfidenceViewState_();
  initializeConfidenceDraft_();

  PICKS_PAGE_DATA.seasonAnchor =
    payload.seasonAnchor || null;

  PICKS_PAGE_DATA.realityTvView =
    payload.realityTvView || null;

  const enhancementKey = picksEnhancementKey_();
  const cachedEnhancements = PICKS_ENHANCEMENTS_CACHE[enhancementKey] || null;
  if (cachedEnhancements) {
    if (cachedEnhancements.seasonAnchor) PICKS_PAGE_DATA.seasonAnchor = cachedEnhancements.seasonAnchor;
    if (cachedEnhancements.episodeComparison) PICKS_PAGE_DATA.episodeComparison = cachedEnhancements.episodeComparison;
    if (cachedEnhancements.playerStats && PICKS_PAGE_DATA.realityTvView) {
      PICKS_PAGE_DATA.realityTvView.playerStats = cachedEnhancements.playerStats;
      PICKS_PAGE_DATA.realityTvView.playerStatsDeferred = false;
    }
  }

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

      <div id="realityTvPlayerSummaryMount">${renderRealityTvPlayerSummary_()}</div>

      <div id="seasonAnchorPickMount">${renderSeasonAnchorPickCard_()}</div>

      <div id="realityTvEpisodeComparisonMount">${renderRealityTvEpisodeComparison_()}</div>

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


/* =========================
   COMPACT CONFIDENCE CARD — v1.2.17a
========================= */

function getCompactConfidenceCategories_() {

  return (PICKS_PAGE_DATA.categories || []).filter(function(category) {
    return (
      isPicksPageCategory(category) &&
      !category.parentCategoryId &&
      usesConfidencePointsCategory(category)
    );
  });

}

function shouldRenderCompactConfidenceSlate_() {

  if (PICKS_PAGE_DATA.isConfidenceGame !== true) return false;
  if (hasStakedPointsCategories()) return false;

  const categories = getCompactConfidenceCategories_();

  return !!(
    categories.length &&
    categories.every(function(category) {
      return Array.isArray(category.nominees) && category.nominees.length === 2;
    })
  );

}

function resetConfidenceViewState_() {

  if (PICKS_CONFIDENCE_LIVE_TIMER) {
    clearInterval(PICKS_CONFIDENCE_LIVE_TIMER);
    PICKS_CONFIDENCE_LIVE_TIMER = null;
  }

  PICKS_CONFIDENCE_SORT_MODE = "time";
  PICKS_CONFIDENCE_SORT_ORDER = [];
  PICKS_CONFIDENCE_SORT_STALE = false;
  PICKS_CONFIDENCE_EXPANDED = new Set();
  PICKS_CONFIDENCE_ODDS_BY_CATEGORY = {};
  PICKS_CONFIDENCE_ODDS_IN_FLIGHT = {};
  PICKS_CONFIDENCE_APPEARANCE_REQUEST = null;
  PICKS_CONFIDENCE_APPEARANCE_GAME_ID = "";
  PICKS_PAGE_DATA.appearance = null;

}

function confidenceSortTimestamp_(category) {

  const raw = category && (category.lockDateTime || category.gameDateTime || "");
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : Number.MAX_SAFE_INTEGER;

}

function confidenceTimeSortedCategories_() {

  return getCompactConfidenceCategories_().slice().sort(function(a, b) {
    const diff = confidenceSortTimestamp_(a) - confidenceSortTimestamp_(b);
    if (diff !== 0) return diff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

}

function buildConfidenceSortOrder_() {

  return getCompactConfidenceCategories_().slice().sort(function(a, b) {
    const aValue = Number(PICKS_PAGE_DATA.confidencePoints[a.id]) || 0;
    const bValue = Number(PICKS_PAGE_DATA.confidencePoints[b.id]) || 0;

    if (aValue !== bValue) return bValue - aValue;

    const timeDiff = confidenceSortTimestamp_(a) - confidenceSortTimestamp_(b);
    if (timeDiff !== 0) return timeDiff;

    return String(a.id || "").localeCompare(String(b.id || ""));
  }).map(function(category) {
    return category.id;
  });

}

function getCompactConfidenceDisplayCategories_() {

  if (PICKS_CONFIDENCE_SORT_MODE !== "confidence") {
    return confidenceTimeSortedCategories_();
  }

  if (!PICKS_CONFIDENCE_SORT_ORDER.length) {
    PICKS_CONFIDENCE_SORT_ORDER = buildConfidenceSortOrder_();
  }

  const byId = {};
  getCompactConfidenceCategories_().forEach(function(category) {
    byId[normalizeId(category.id)] = category;
  });

  const ordered = [];
  PICKS_CONFIDENCE_SORT_ORDER.forEach(function(categoryId) {
    const category = byId[normalizeId(categoryId)];
    if (!category) return;
    ordered.push(category);
    delete byId[normalizeId(categoryId)];
  });

  Object.keys(byId).forEach(function(key) {
    ordered.push(byId[key]);
  });

  return ordered;

}

function setConfidenceSortMode_(mode) {

  const nextMode = mode === "confidence" ? "confidence" : "time";

  if (nextMode === "confidence") {
    PICKS_CONFIDENCE_SORT_MODE = "confidence";
    PICKS_CONFIDENCE_SORT_ORDER = buildConfidenceSortOrder_();
    PICKS_CONFIDENCE_SORT_STALE = false;
  } else {
    PICKS_CONFIDENCE_SORT_MODE = "time";
    PICKS_CONFIDENCE_SORT_ORDER = [];
    PICKS_CONFIDENCE_SORT_STALE = false;
  }

  refreshPicksPage();

}

function normalizeConfidenceSportsKey_(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function getConfidenceSportsPhase_(category) {

  category = category || {};
  const state = normalizeConfidenceSportsKey_(category.sportsState);
  const status = normalizeConfidenceSportsKey_(category.sportsStatus);

  if (
    state === "post" ||
    status.indexOf("final") !== -1 ||
    status.indexOf("complete") !== -1
  ) {
    return "final";
  }

  if (
    state === "in" ||
    state === "live" ||
    status.indexOf("in-progress") !== -1 ||
    status.indexOf("inprogress") !== -1 ||
    status.indexOf("live") !== -1
  ) {
    return "live";
  }

  return "pregame";

}

function isCompactConfidenceLocked_(category) {
  const phase = getConfidenceSportsPhase_(category);
  return isCategoryLocked(category) || phase === "live" || phase === "final";
}

function confidenceNomineeSide_(category, nominee) {

  const selection = normalizeConfidenceSportsKey_(nominee && nominee.sportsSelection);
  if (selection === "home" || selection === "away") return selection;

  const name = normalizeConfidenceSportsKey_(nominee && (nominee.name || nominee.shortAnswer));
  const home = normalizeConfidenceSportsKey_(category && category.homeTeam);
  const away = normalizeConfidenceSportsKey_(category && category.awayTeam);

  if (home && name === home) return "home";
  if (away && name === away) return "away";
  return "";

}

function confidenceNomineeForSide_(category, side) {
  return (category.nominees || []).find(function(nominee) {
    return confidenceNomineeSide_(category, nominee) === side;
  }) || null;
}

function confidenceScoreValue_(category, side) {
  const value = side === "home" ? category.homeScore : category.awayScore;
  if (value === "" || value === null || value === undefined) return "";
  return value;
}

function getConfidenceLiveResult_(category, selectedNomineeId) {

  const settled = getPickStatus(category, selectedNomineeId);
  if (settled.className === "correct" || settled.className === "wrong") {
    const winners = getWinnerNominees(category);
    return {
      className: settled.className,
      winnerNomineeId: winners.length === 1 ? winners[0].id : "",
      final: true
    };
  }

  if (getConfidenceSportsPhase_(category) !== "final") {
    return { className: "pending", winnerNomineeId: "", final: false };
  }

  const home = Number(category.homeScore);
  const away = Number(category.awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return { className: "pending", winnerNomineeId: "", final: true };
  }

  const winningSide = home > away ? "home" : "away";
  const winner = confidenceNomineeForSide_(category, winningSide);
  const winnerId = winner ? winner.id : "";

  if (!winnerId || !selectedNomineeId) {
    return { className: "pending", winnerNomineeId: winnerId, final: true };
  }

  return {
    className: normalizeId(winnerId) === normalizeId(selectedNomineeId) ? "correct" : "wrong",
    winnerNomineeId: winnerId,
    final: true
  };

}

function formatConfidenceSportsStatus_(category) {

  const phase = getConfidenceSportsPhase_(category);

  if (phase === "final") return "FINAL";

  if (phase === "live") {
    const pieces = ["LIVE"];
    const period = String(category.sportsPeriod || "").trim();
    const clock = String(category.sportsClock || "").trim();
    if (period) pieces.push("Q" + period);
    if (clock) pieces.push(clock);
    return pieces.join(" · ");
  }

  const raw = category.lockDateTime || category.gameDateTime || "";
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "OPEN";

  return date.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });

}

function confidenceResultPointsLabel_(category, result) {

  if (!result || (result.className !== "correct" && result.className !== "wrong")) return "";
  const value = Number(PICKS_PAGE_DATA.confidencePoints[category.id]) || 0;
  if (!value) return "";
  if (result.className === "correct") return "+" + value;
  return PICKS_PAGE_DATA.confidenceScoringMode === "risk_penalty" ? "-" + value : "0";

}

function confidenceOddsToAmerican_(value) {

  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "—";

  if (Math.abs(number) >= 100) {
    return number > 0 ? "+" + Math.round(number) : String(Math.round(number));
  }

  if (number <= 1) return String(number);

  const american = number >= 2
    ? Math.round((number - 1) * 100)
    : Math.round(-100 / (number - 1));

  return american > 0 ? "+" + american : String(american);

}

function confidenceSpreadLabel_(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number > 0 ? "+" + number : String(number);
}

function confidenceFavoriteName_(category, odds) {

  odds = odds || {};

  const homeSpread = Number(odds.homeSpread);
  const awaySpread = Number(odds.awaySpread);
  if (Number.isFinite(homeSpread) && Number.isFinite(awaySpread) && homeSpread !== awaySpread) {
    if (homeSpread < 0) return category.homeTeam || "Home";
    if (awaySpread < 0) return category.awayTeam || "Away";
  }

  const homeOdds = Number(odds.homeOdds);
  const awayOdds = Number(odds.awayOdds);
  if (homeOdds > 1 && awayOdds > 1 && homeOdds !== awayOdds) {
    return homeOdds < awayOdds ? (category.homeTeam || "Home") : (category.awayTeam || "Away");
  }

  const configured = category.favoriteNomineeId;
  if (configured) {
    const nominee = (category.nominees || []).find(function(item) {
      return normalizeId(item.id) === normalizeId(configured);
    });
    if (nominee) return nominee.name || nominee.shortAnswer || "";
  }

  return "—";

}

function confidenceFallbackOdds_(category) {

  const result = { found: false };
  (category.nominees || []).forEach(function(nominee) {
    const side = confidenceNomineeSide_(category, nominee);
    const value = nominee.bettingOdds !== undefined && nominee.bettingOdds !== ""
      ? nominee.bettingOdds
      : nominee.odds;
    if (!side || value === undefined || value === "") return;
    result[side + "Odds"] = value;
    result.found = true;
  });
  return result;

}

function renderConfidenceStatusParts_(category, phase) {
  const status = escapeHtml(formatConfidenceSportsStatus_(category));
  if (phase === "live") {
    return `<span class="confidence-live-badge">LIVE</span><span class="confidence-live-clock">${status}</span>`;
  }
  if (phase === "final") {
    return `<span class="confidence-final-badge">FINAL</span>`;
  }
  return `<span class="confidence-game-time">${status}</span>`;
}

function renderConfidenceDetails_(category, dirty, locked, phase) {

  const odds = PICKS_CONFIDENCE_ODDS_BY_CATEGORY[category.id] || confidenceFallbackOdds_(category);
  const loading = PICKS_CONFIDENCE_ODDS_IN_FLIGHT[category.id] === true;
  const home = category.homeTeam || (confidenceNomineeForSide_(category, "home") || {}).name || "Home";
  const away = category.awayTeam || (confidenceNomineeForSide_(category, "away") || {}).name || "Away";
  const favorite = confidenceFavoriteName_(category, odds);
  const source = odds.bookmaker || odds.source || category.oddsSource || "";
  const total = odds.totalPoints !== "" && odds.totalPoints !== undefined ? odds.totalPoints : "—";

  return `
    <details
      class="confidence-game-details"
      ${PICKS_CONFIDENCE_EXPANDED.has(category.id) ? "open" : ""}
      ontoggle="toggleConfidenceDetails_('${escapeJs(category.id)}', this.open)"
    >
      <summary class="confidence-game-meta">
        <strong class="confidence-live-status ${phase}">${renderConfidenceStatusParts_(category, phase)}</strong>
        <span class="confidence-game-question">${escapeHtml(getCategoryDisplayTitle(category))}</span>
        <span class="confidence-details-prompt">Odds · Records · Favorite</span>
        ${dirty ? `<strong>Unsaved</strong>` : locked ? `<strong>Locked</strong>` : `<span></span>`}
      </summary>
      <div class="confidence-details-grid">
        <div class="confidence-detail-team">
          <strong>${escapeHtml(away)}</strong>
          <span class="confidence-detail-record">Record ${escapeHtml(category.awayRecord || "—")}</span>
          <span class="confidence-detail-moneyline">ML ${escapeHtml(confidenceOddsToAmerican_(odds.awayOdds))}</span>
          <span class="confidence-detail-spread">Spread ${escapeHtml(confidenceSpreadLabel_(odds.awaySpread))}</span>
        </div>
        <div class="confidence-detail-center">
          <span class="confidence-detail-favorite-label">Favorite</span>
          <strong class="confidence-detail-favorite">${escapeHtml(favorite)}</strong>
          <small class="confidence-detail-over-under">O/U ${escapeHtml(String(total))}</small>
          ${loading ? `<small>Loading odds…</small>` : source ? `<small>${escapeHtml(source)}</small>` : ""}
        </div>
        <div class="confidence-detail-team home">
          <strong>${escapeHtml(home)}</strong>
          <span class="confidence-detail-record">Record ${escapeHtml(category.homeRecord || "—")}</span>
          <span class="confidence-detail-moneyline">ML ${escapeHtml(confidenceOddsToAmerican_(odds.homeOdds))}</span>
          <span class="confidence-detail-spread">Spread ${escapeHtml(confidenceSpreadLabel_(odds.homeSpread))}</span>
        </div>
      </div>
    </details>
  `;

}

function confidenceSportsJsonp_(url) {

  return new Promise(function(resolve, reject) {
    const callbackName = "__confidenceSportsCallback_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
    const script = document.createElement("script");
    const separator = url.indexOf("?") === -1 ? "?" : "&";
    let done = false;

    function cleanup_(keepLateCallback) {
      if (script.parentNode) script.parentNode.removeChild(script);
      if (keepLateCallback) {
        window[callbackName] = function() {};
        setTimeout(function() {
          try { delete window[callbackName]; } catch (err) { window[callbackName] = undefined; }
        }, 60000);
      } else {
        try { delete window[callbackName]; } catch (err) { window[callbackName] = undefined; }
      }
    }

    const timeout = setTimeout(function() {
      if (done) return;
      done = true;
      cleanup_(true);
      reject(new Error("Sports Scores Engine request timed out"));
    }, PICKS_CONFIDENCE_SPORTS_TIMEOUT_MS);

    window[callbackName] = function(data) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      cleanup_(false);
      resolve(data || {});
    };

    script.onerror = function() {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      cleanup_(true);
      reject(new Error("Sports Scores Engine request failed"));
    };

    script.src = url + separator + "callback=" + encodeURIComponent(callbackName) + "&_ts=" + Date.now();
    document.body.appendChild(script);
  });

}

function buildConfidenceSportsApiUrl_(action, params) {

  const query = new URLSearchParams({ action: action });
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (value === "" || value === null || value === undefined) return;
    query.set(key, value);
  });
  return PICKS_CONFIDENCE_SPORTS_API_URL + "?" + query.toString();

}

function confidenceIsoDate_(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function confidenceDateOffset_(isoDate, days) {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

async function fetchConfidenceLiveScores_() {

  const categories = getCompactConfidenceCategories_();
  const groups = {};
  const fallbackEvents = {};

  categories.forEach(function(category) {
    const league = String(category.sportsLeague || "").trim();
    const date = confidenceIsoDate_(category.lockDateTime || category.gameDateTime || "");

    if (league && date) {
      if (!groups[league]) groups[league] = { minDate: date, maxDate: date };
      if (date < groups[league].minDate) groups[league].minDate = date;
      if (date > groups[league].maxDate) groups[league].maxDate = date;
      return;
    }

    const eventId = String(category.espnEventId || "").trim();
    if (eventId) fallbackEvents[eventId] = true;
  });

  const requests = [];
  Object.keys(groups).forEach(function(league) {
    const group = groups[league];
    requests.push(confidenceSportsJsonp_(buildConfidenceSportsApiUrl_("getSportsScores", {
      league: league,
      dateFrom: confidenceDateOffset_(group.minDate, -1),
      dateTo: confidenceDateOffset_(group.maxDate, 1)
    })));
  });

  Object.keys(fallbackEvents).slice(0, 30).forEach(function(eventId) {
    requests.push(confidenceSportsJsonp_(buildConfidenceSportsApiUrl_("getSportsScores", {
      espnEventId: eventId
    })));
  });

  if (!requests.length) return [];

  const results = await Promise.allSettled(requests);
  const scores = [];
  const seen = {};

  results.forEach(function(result) {
    if (result.status !== "fulfilled" || !result.value || result.value.success === false) return;
    (result.value.scores || []).forEach(function(score) {
      const key = String(score.ESPNEventId || score.GameId || "").trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      scores.push(score);
    });
  });

  return scores;

}

function applyConfidenceLiveScores_(scores) {

  const byEvent = {};
  const byGame = {};
  (scores || []).forEach(function(score) {
    const eventId = String(score.ESPNEventId || "").trim();
    const gameId = String(score.GameId || "").trim();
    if (eventId) byEvent[eventId] = score;
    if (gameId) byGame[gameId] = score;
  });

  let changed = false;

  getCompactConfidenceCategories_().forEach(function(category) {
    const score = byEvent[String(category.espnEventId || "").trim()] || byGame[String(category.sportsGameId || "").trim()];
    if (!score) return;

    const before = JSON.stringify([
      category.homeScore, category.awayScore, category.sportsStatus, category.sportsState,
      category.sportsClock, category.sportsPeriod, category.homeRecord, category.awayRecord
    ]);

    category.homeTeam = score.HomeTeam || category.homeTeam || "";
    category.awayTeam = score.AwayTeam || category.awayTeam || "";
    category.homeScore = score.HomeScore !== undefined && score.HomeScore !== null ? score.HomeScore : category.homeScore;
    category.awayScore = score.AwayScore !== undefined && score.AwayScore !== null ? score.AwayScore : category.awayScore;
    category.sportsStatus = score.Status || category.sportsStatus || "";
    category.sportsState = score.State || category.sportsState || "";
    category.sportsClock = score.Clock || category.sportsClock || "";
    category.sportsPeriod = score.Period !== undefined && score.Period !== null ? score.Period : category.sportsPeriod;
    category.homeRecord = score.HomeRecord || category.homeRecord || "";
    category.awayRecord = score.AwayRecord || category.awayRecord || "";
    category.gameDateTime = score.GameDateTime || category.gameDateTime || category.lockDateTime || "";

    (category.nominees || []).forEach(function(nominee) {
      const side = confidenceNomineeSide_(category, nominee);
      if (side === "home" && score.HomeLogo) nominee.image = score.HomeLogo;
      if (side === "away" && score.AwayLogo) nominee.image = score.AwayLogo;
    });

    const after = JSON.stringify([
      category.homeScore, category.awayScore, category.sportsStatus, category.sportsState,
      category.sportsClock, category.sportsPeriod, category.homeRecord, category.awayRecord
    ]);

    if (before !== after) changed = true;
  });

  return changed;

}

function shouldConfidenceLiveRerenderNow_() {
  const active = document.activeElement;
  if (!active || active === document.body) return true;
  if (typeof active.closest === "function" && active.closest(".confidence-game-row")) return false;
  return true;
}

async function refreshConfidenceLiveSports_() {

  if (PICKS_CONFIDENCE_LIVE_IN_FLIGHT || !shouldRenderCompactConfidenceSlate_()) return;
  if (!document.querySelector(".picks-page")) return;

  PICKS_CONFIDENCE_LIVE_IN_FLIGHT = true;
  try {
    const scores = await fetchConfidenceLiveScores_();
    const changed = applyConfidenceLiveScores_(scores);
    if (changed && shouldConfidenceLiveRerenderNow_()) refreshPicksPage();
  } catch (err) {
    console.warn("Confidence live scoreboard refresh skipped", err);
  } finally {
    PICKS_CONFIDENCE_LIVE_IN_FLIGHT = false;
  }

}

function mountConfidenceLiveSports_() {

  if (!shouldRenderCompactConfidenceSlate_()) return;

  if (!PICKS_CONFIDENCE_LIVE_TIMER) {
    refreshConfidenceLiveSports_();
    PICKS_CONFIDENCE_LIVE_TIMER = setInterval(function() {
      if (!document.querySelector(".picks-page")) {
        clearInterval(PICKS_CONFIDENCE_LIVE_TIMER);
        PICKS_CONFIDENCE_LIVE_TIMER = null;
        return;
      }
      refreshConfidenceLiveSports_();
    }, PICKS_CONFIDENCE_LIVE_REFRESH_MS);
  }

}

async function loadConfidenceOdds_(categoryId) {

  const category = getCompactConfidenceCategories_().find(function(item) {
    return normalizeId(item.id) === normalizeId(categoryId);
  });

  if (!category || PICKS_CONFIDENCE_ODDS_IN_FLIGHT[category.id]) return;
  if (PICKS_CONFIDENCE_ODDS_BY_CATEGORY[category.id]) return;

  PICKS_CONFIDENCE_ODDS_IN_FLIGHT[category.id] = true;
  refreshPicksPage();

  try {
    const result = await confidenceSportsJsonp_(buildConfidenceSportsApiUrl_("getSportsOdds", {
      gameId: category.sportsGameId || "",
      espnEventId: category.espnEventId || "",
      league: category.sportsLeague || "",
      homeTeam: category.homeTeam || "",
      awayTeam: category.awayTeam || "",
      gameDateTime: category.lockDateTime || category.gameDateTime || "",
      market: "moneyline"
    }));
    PICKS_CONFIDENCE_ODDS_BY_CATEGORY[category.id] = result || { success: false, found: false };
  } catch (err) {
    PICKS_CONFIDENCE_ODDS_BY_CATEGORY[category.id] = { success: false, found: false, message: err.message || String(err) };
  } finally {
    PICKS_CONFIDENCE_ODDS_IN_FLIGHT[category.id] = false;
    refreshPicksPage();
  }

}

function toggleConfidenceDetails_(categoryId, open) {

  const category = getCompactConfidenceCategories_().find(function(item) {
    return normalizeId(item.id) === normalizeId(categoryId);
  });
  if (!category) return;

  if (open) {
    PICKS_CONFIDENCE_EXPANDED.add(category.id);
    if (!PICKS_CONFIDENCE_ODDS_BY_CATEGORY[category.id]) loadConfidenceOdds_(category.id);
  } else {
    PICKS_CONFIDENCE_EXPANDED.delete(category.id);
  }

}

function confidenceSnapshotSignature_(picks, points) {

  const rows = getCompactConfidenceCategories_()
    .map(function(category) {
      const categoryId = category.id;
      return [
        normalizeId(categoryId),
        normalizeId((picks || {})[categoryId] || ""),
        Number((points || {})[categoryId]) || 0
      ];
    })
    .sort(function(a, b) {
      return String(a[0]).localeCompare(String(b[0]));
    });

  return JSON.stringify(rows);

}

function confidenceDraftStorageKey_() {

  const session = PICKS_PAGE_DATA.session || {};
  return [
    "awards-confidence-draft-v1217a",
    String(PICKS_PAGE_DATA.gameId || ""),
    String(session.username || "").trim().toLowerCase()
  ].join("::");

}

function initializeConfidenceDraft_() {

  PICKS_CONFIDENCE_BASELINE_PICKS = {};
  PICKS_CONFIDENCE_BASELINE_POINTS = {};
  PICKS_CONFIDENCE_BASE_SIGNATURE = "";
  PICKS_CONFIDENCE_BATCH_SAVING = false;

  if (!shouldRenderCompactConfidenceSlate_()) return;

  getCompactConfidenceCategories_().forEach(function(category) {
    PICKS_CONFIDENCE_BASELINE_PICKS[category.id] =
      PICKS_PAGE_DATA.picks[category.id] || "";
    PICKS_CONFIDENCE_BASELINE_POINTS[category.id] =
      Number(PICKS_PAGE_DATA.confidencePoints[category.id]) || 0;
  });

  PICKS_CONFIDENCE_BASE_SIGNATURE = confidenceSnapshotSignature_(
    PICKS_CONFIDENCE_BASELINE_PICKS,
    PICKS_CONFIDENCE_BASELINE_POINTS
  );

  if (typeof window === "undefined" || !window.localStorage) return;

  try {

    const raw = window.localStorage.getItem(confidenceDraftStorageKey_());
    if (!raw) return;

    const draft = JSON.parse(raw);

    if (!draft || draft.baseSignature !== PICKS_CONFIDENCE_BASE_SIGNATURE) {
      window.localStorage.removeItem(confidenceDraftStorageKey_());
      return;
    }

    const draftPicks = draft.picks || {};
    const draftPoints = draft.confidencePoints || {};

    getCompactConfidenceCategories_().forEach(function(category) {

      if (isCompactConfidenceLocked_(category)) return;

      const categoryId = category.id;
      const draftPick = draftPicks[categoryId];
      const draftConfidence = Number(draftPoints[categoryId]) || 0;

      if (draftPick) PICKS_PAGE_DATA.picks[categoryId] = draftPick;
      if (draftConfidence > 0) {
        PICKS_PAGE_DATA.confidencePoints[categoryId] = draftConfidence;
      }

    });

  } catch (err) {
    console.warn("Confidence draft restore skipped", err);
  }

}

function confidenceCategoryIsDirty_(categoryId) {

  return (
    normalizeId(PICKS_PAGE_DATA.picks[categoryId] || "") !==
      normalizeId(PICKS_CONFIDENCE_BASELINE_PICKS[categoryId] || "") ||
    Number(PICKS_PAGE_DATA.confidencePoints[categoryId] || 0) !==
      Number(PICKS_CONFIDENCE_BASELINE_POINTS[categoryId] || 0)
  );

}

function getConfidenceDirtyCategories_() {

  if (!shouldRenderCompactConfidenceSlate_()) return [];

  return getCompactConfidenceCategories_().filter(function(category) {
    return confidenceCategoryIsDirty_(category.id);
  });

}

function persistConfidenceDraft_() {

  if (!shouldRenderCompactConfidenceSlate_()) return;
  if (typeof window === "undefined" || !window.localStorage) return;

  try {

    const key = confidenceDraftStorageKey_();
    const dirty = getConfidenceDirtyCategories_();

    if (!dirty.length) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(
      key,
      JSON.stringify({
        baseSignature: PICKS_CONFIDENCE_BASE_SIGNATURE,
        picks: Object.assign({}, PICKS_PAGE_DATA.picks || {}),
        confidencePoints: Object.assign({}, PICKS_PAGE_DATA.confidencePoints || {}),
        savedAt: new Date().toISOString()
      })
    );

  } catch (err) {
    console.warn("Confidence draft persistence skipped", err);
  }

}

function confidenceAppearanceBool_(value, defaultValue) {
  if (value === true || value === false) return value;
  const text = String(value == null ? "" : value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].indexOf(text) !== -1) return true;
  if (["false", "0", "no", "off"].indexOf(text) !== -1) return false;
  return defaultValue === true;
}

function confidenceAppearanceKey_(value) {
  return String(value || "").trim().toLowerCase();
}

function confidenceAppearanceEntityType_(category, nominee) {
  const explicit = String(
    nominee && nominee.entryType ||
    category && category.entryType ||
    ""
  ).trim().toLowerCase();

  if (explicit) return explicit;

  const questionType = String(category && category.questionType || "").trim().toLowerCase();
  const scoringEngine = String(category && category.scoringEngine || "").trim().toLowerCase();
  const sportsGameId = String(category && category.sportsGameId || "").trim();

  if (questionType === "team-matchup" || scoringEngine === "sports" || sportsGameId) {
    return "team";
  }

  return "nominee";
}

function confidenceAppearanceDriveUrl_(fileId) {
  const id = String(fileId || "").trim();
  return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w640" : "";
}

function confidenceAppearanceResolvedImage_(category, nominee) {
  const bundle = PICKS_PAGE_DATA.appearance || {};
  const assignment = bundle.assignment || {};
  const entityType = confidenceAppearanceEntityType_(category, nominee);
  const entityId = String(nominee && nominee.id || "").trim();
  const entityName = String(nominee && nominee.name || "").trim();
  const gameId = String(PICKS_PAGE_DATA.gameId || "").trim();

  function rowMatchesId_(row) {
    return confidenceAppearanceKey_(row && row.EntityId) === confidenceAppearanceKey_(entityId);
  }

  function rowMatchesName_(row) {
    return !!entityName &&
      confidenceAppearanceKey_(row && row.EntityName) === confidenceAppearanceKey_(entityName);
  }

  function bestEntityMatch_(rows, extraMatch) {
    const activeRows = (rows || []).filter(function(row) {
      return confidenceAppearanceBool_(row && row.Active, true) &&
        (!extraMatch || extraMatch(row));
    });

    let match = activeRows.find(function(row) {
      return confidenceAppearanceKey_(row.EntityType) === confidenceAppearanceKey_(entityType) &&
        rowMatchesId_(row);
    });
    if (match) return match;

    match = activeRows.find(rowMatchesId_);
    if (match) return match;

    match = activeRows.find(function(row) {
      return confidenceAppearanceKey_(row.EntityType) === confidenceAppearanceKey_(entityType) &&
        rowMatchesName_(row);
    });
    return match || activeRows.find(rowMatchesName_) || null;
  }

  const override = bestEntityMatch_(bundle.overrides || [], function(row) {
    return confidenceAppearanceKey_(row.GameId || gameId) === confidenceAppearanceKey_(gameId);
  });

  if (override) {
    const url = String(override.ImageUrl || "").trim() || confidenceAppearanceDriveUrl_(override.ImageFileId);
    if (url) return { imageUrl: url, source: "override" };
  }

  const imagePackId = String(bundle.imagePackId || assignment.ImagePackId || "").trim();
  const imageMode = confidenceAppearanceKey_(assignment.ImageMode || "pack");

  if (imagePackId && imageMode !== "default") {
    const item = bestEntityMatch_(bundle.imagePackItems || [], function(row) {
      const variant = confidenceAppearanceKey_(row.Variant || "default");
      return confidenceAppearanceKey_(row.PackId) === confidenceAppearanceKey_(imagePackId) &&
        (variant === "default" || !variant);
    });

    if (item) {
      const url = String(item.ImageUrl || "").trim() || confidenceAppearanceDriveUrl_(item.ImageFileId);
      if (url) return { imageUrl: url, source: "image-pack" };
    }
  }

  return {
    imageUrl: String(
      nominee && (
        nominee.image ||
        nominee.img ||
        nominee.imageUrl ||
        nominee.logoUrl
      ) || ""
    ).trim(),
    source: "default"
  };
}

function confidenceThemeToken_(value, allowed, fallback) {
  const key = String(value || "").trim().toLowerCase();
  return allowed.indexOf(key) !== -1 ? key : fallback;
}

function confidenceThemeSafeColor_(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function confidenceThemeNumber_(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function confidenceThemeHexRgba_(value, opacityPercent, fallback) {
  const color = confidenceThemeSafeColor_(value, fallback || "#2563eb");
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return "rgba(37,99,235," + (Number(opacityPercent || 0) / 100) + ")";
  const parsed = parseInt(match[1], 16);
  return "rgba(" + ((parsed >> 16) & 255) + "," + ((parsed >> 8) & 255) + "," + (parsed & 255) + "," + (Number(opacityPercent || 0) / 100) + ")";
}

function confidenceThemePresentation_() {
  const theme = (PICKS_PAGE_DATA.appearance && PICKS_PAGE_DATA.appearance.theme) || {};
  if (window.AppearanceThemeRuntime && typeof window.AppearanceThemeRuntime.confidencePresentation === "function") {
    return window.AppearanceThemeRuntime.confidencePresentation(theme);
  }
  const team = theme.team || {};
  const row = theme.row || {};
  const colors = theme.colors || {};
  const layout = theme.layout || {};
  const typography = theme.typography || {};
  const images = theme.images || {};
  const selection = theme.selection || {};
  const result = theme.result || {};
  const live = theme.live || {};
  const background = theme.background || {};
  const confidence = theme.confidence || {};
  const score = theme.score || {};
  const scoreboard = theme.scoreboard || {};
  const positioning = theme.positioning || {};
  const overlays = theme.overlays || {};
  const visibility = theme.visibility || {};
  const visElements = visibility.elements || {};
  const visDevices = visibility.devices || {};
  const resultTypography = theme.resultTypography || {};
  const correctType = resultTypography.correct || {};
  const wrongType = resultTypography.incorrect || {};
  const sideLayout = theme.sideLayout || {};
  const awayLayout = Object.assign({}, sideLayout.away || {});
  let homeLayout = Object.assign({}, sideLayout.home || {});
  if (sideLayout.mirrored === true) {
    const mirrorAlign = function(value) { return value === "left" ? "right" : value === "right" ? "left" : (value || "center"); };
    const mirrorScore = function(value) {
      const map = {"inline-left":"inline-right","inline-right":"inline-left","top-left":"top-right","top-right":"top-left","bottom-left":"bottom-right","bottom-right":"bottom-left"};
      return map[value] || value || "inline-left";
    };
    homeLayout = {
      textAlign: mirrorAlign(awayLayout.textAlign || positioning.nameAlign || "left"),
      textVertical: awayLayout.textVertical || positioning.textVertical || "center",
      textOffsetX: -Number(awayLayout.textOffsetX || 0),
      textOffsetY: Number(awayLayout.textOffsetY || 0),
      scoreAnchor: mirrorScore(awayLayout.scoreAnchor || positioning.scoreAnchor || "inline-right"),
      scoreOffsetX: -Number(awayLayout.scoreOffsetX || 0),
      scoreOffsetY: Number(awayLayout.scoreOffsetY || 0),
      imageX: 100 - Number(awayLayout.imageX == null ? (images.x == null ? 50 : images.x) : awayLayout.imageX),
      imageY: Number(awayLayout.imageY == null ? (images.y == null ? 50 : images.y) : awayLayout.imageY)
    };
  }

  const unselected = confidenceThemeToken_(selection.unselectedTreatment || team.unselectedTreatment, ["grayscale", "dim", "none"], "grayscale");
  const imageFit = confidenceThemeToken_(images.fit, ["contain", "cover", "full-bleed"], "contain");
  const imageLayer = imageFit === "full-bleed"
    ? "background"
    : confidenceThemeToken_(images.layer, ["inline", "inline-background", "floating", "background"], "inline");
  const teamOrder = confidenceThemeToken_(layout.teamOrder, ["away-home", "home-away"], "away-home");
  const classes = [
    "confidence-theme-density-" + confidenceThemeToken_(theme.density, ["compact", "standard", "comfortable"], "compact"),
    "confidence-theme-city-" + confidenceThemeToken_(team.cityScale, ["small", "medium"], "small"),
    "confidence-theme-name-" + confidenceThemeToken_(team.nameScale, ["medium", "large", "xlarge"], "large"),
    "confidence-theme-unselected-" + unselected,
    "confidence-theme-corners-" + confidenceThemeToken_(row.corners, ["square", "soft", "rounded", "custom"], "soft"),
    "confidence-theme-spacing-" + confidenceThemeToken_(row.spacing, ["tight", "normal"], "tight"),
    "confidence-theme-shadow-" + confidenceThemeToken_(row.shadow, ["none", "soft", "strong"], "soft"),
    "confidence-theme-image-shape-" + confidenceThemeToken_(images.shape, ["square", "soft", "round"], "square"),
    "confidence-theme-image-align-" + confidenceThemeToken_(images.verticalAlign, ["top", "center", "bottom"], "center"),
    "confidence-theme-image-fit-" + imageFit,
    "confidence-theme-image-layer-" + imageLayer,
    "confidence-theme-team-order-" + teamOrder,
    sideLayout.separate === true || sideLayout.mirrored === true ? "confidence-theme-side-layout-separate" : "confidence-theme-side-layout-shared",
    sideLayout.mirrored === true ? "confidence-theme-side-layout-mirrored" : "confidence-theme-side-layout-independent",
    "confidence-theme-away-align-" + confidenceThemeToken_(awayLayout.textAlign, ["left", "center", "right"], positioning.nameAlign || "left"),
    "confidence-theme-home-align-" + confidenceThemeToken_(homeLayout.textAlign, ["left", "center", "right"], positioning.nameAlign || "left"),
    "confidence-theme-away-vertical-" + confidenceThemeToken_(awayLayout.textVertical, ["top", "center", "bottom"], positioning.textVertical || "center"),
    "confidence-theme-home-vertical-" + confidenceThemeToken_(homeLayout.textVertical, ["top", "center", "bottom"], positioning.textVertical || "center"),
    "confidence-theme-away-score-anchor-" + confidenceThemeToken_(awayLayout.scoreAnchor, ["top-left", "top-right", "bottom-left", "bottom-right", "inline-left", "inline-right", "center"], positioning.scoreAnchor || "bottom-left"),
    "confidence-theme-home-score-anchor-" + confidenceThemeToken_(homeLayout.scoreAnchor, ["top-left", "top-right", "bottom-left", "bottom-right", "inline-left", "inline-right", "center"], positioning.scoreAnchor || "bottom-left"),
    "confidence-theme-city-align-" + confidenceThemeToken_(positioning.cityAlign, ["left", "center", "right"], "left"),
    "confidence-theme-name-align-" + confidenceThemeToken_(positioning.nameAlign, ["left", "center", "right"], "left"),
    "confidence-theme-text-vertical-" + confidenceThemeToken_(positioning.textVertical, ["top", "center", "bottom"], "center"),
    "confidence-theme-score-anchor-" + confidenceThemeToken_(positioning.scoreAnchor, ["top-left", "top-right", "bottom-left", "bottom-right", "inline-left", "inline-right", "center"], "bottom-left"),
    "confidence-theme-confidence-vertical-" + confidenceThemeToken_(positioning.confidenceVertical, ["top", "center", "bottom"], "center"),
    "confidence-theme-status-align-" + confidenceThemeToken_(positioning.statusAlign, ["left", "center", "right"], "left"),
    "confidence-theme-background-" + confidenceThemeToken_(background.mode, ["solid", "gradient"], "gradient"),
    "confidence-theme-confidence-" + confidenceThemeToken_(confidence.style, ["filled", "outline", "minimal"], "filled"),
    "confidence-theme-live-badge-" + confidenceThemeToken_(live.badgeStyle, ["text", "outline", "pill"], "text"),
    "confidence-theme-final-badge-" + confidenceThemeToken_(live.finalBadgeStyle, ["text", "outline", "pill"], "text"),
    typography.uppercase === false ? "confidence-theme-team-naturalcase" : "confidence-theme-team-uppercase"
  ];

  const visibilityKeys = ["city","teamName","teamImage","score","versus","gameTime","liveBadge","clock","finalBadge","confidenceLabel","confidenceValue","points","resultIndicator","detailsBar","records","favorite","moneyline","spread","overUnder"];
  visibilityKeys.forEach(function(key) {
    if (visElements[key] === false) classes.push("confidence-hide-" + key);
    ["desktop", "tablet", "mobile"].forEach(function(device) {
      const deviceMap = visDevices[device] || {};
      if (deviceMap[key] === false) classes.push("confidence-hide-" + key + "-" + device);
    });
  });

  if (images.oversize === true) classes.push("confidence-theme-image-oversize");
  if (Object.keys(colors).length || Number(theme.studioVersion) >= 1) classes.push("confidence-theme-custom-colors");

  const rowHeight = confidenceThemeNumber_(layout.rowHeight, 60, 160, 76);
  const rowPadding = confidenceThemeNumber_(layout.rowPadding, 0, 24, 7);
  const teamGap = confidenceThemeNumber_(layout.teamGap, 0, 28, 7);
  const versusWidth = confidenceThemeNumber_(layout.versusWidth, 0, 52, 32);
  const confidenceWidth = confidenceThemeNumber_(layout.confidenceWidth, 44, 160, 92);
  const citySize = confidenceThemeNumber_(typography.citySize, 7, 24, 10);
  const cityWeight = confidenceThemeNumber_(typography.cityWeight, 300, 1000, 700);
  const cityOpacity = confidenceThemeNumber_(typography.cityOpacity, 0, 100, 62);
  const nameSize = confidenceThemeNumber_(typography.teamNameSize, 10, 36, 16);
  const nameWeight = confidenceThemeNumber_(typography.teamNameWeight, 300, 1000, 950);
  const nameSpacing = confidenceThemeNumber_(typography.teamNameSpacing, -3, 14, 2.5);
  const scoreSize = confidenceThemeNumber_(typography.scoreSize, 9, 34, 12);
  const confidenceSize = confidenceThemeNumber_(typography.confidenceSize, 11, 38, 16);
  const imageSize = confidenceThemeNumber_(images.size, 20, 140, 38);
  const imageOpacity = confidenceThemeNumber_(images.opacity, 0, 100, 100);
  const imageZoom = confidenceThemeNumber_(images.zoom, 50, 220, 100);
  const imageX = confidenceThemeNumber_(images.x, 0, 100, 50);
  const imageY = confidenceThemeNumber_(images.y, 0, 100, 50);
  const awayImageX = confidenceThemeNumber_(awayLayout.imageX, 0, 100, imageX);
  const awayImageY = confidenceThemeNumber_(awayLayout.imageY, 0, 100, imageY);
  const homeImageX = confidenceThemeNumber_(homeLayout.imageX, 0, 100, imageX);
  const homeImageY = confidenceThemeNumber_(homeLayout.imageY, 0, 100, imageY);
  const awayTextOffsetX = confidenceThemeNumber_(awayLayout.textOffsetX, -40, 40, positioning.textOffsetX || 0);
  const awayTextOffsetY = confidenceThemeNumber_(awayLayout.textOffsetY, -40, 40, positioning.textOffsetY || 0);
  const homeTextOffsetX = confidenceThemeNumber_(homeLayout.textOffsetX, -40, 40, positioning.textOffsetX || 0);
  const homeTextOffsetY = confidenceThemeNumber_(homeLayout.textOffsetY, -40, 40, positioning.textOffsetY || 0);
  const textOffsetX = confidenceThemeNumber_(positioning.textOffsetX, -30, 30, 0);
  const textOffsetY = confidenceThemeNumber_(positioning.textOffsetY, -30, 30, 0);
  const scoreOffsetX = confidenceThemeNumber_(positioning.scoreOffsetX, -50, 50, 0);
  const scoreOffsetY = confidenceThemeNumber_(positioning.scoreOffsetY, -50, 50, 0);
  const awayScoreOffsetX = confidenceThemeNumber_(awayLayout.scoreOffsetX, -50, 50, scoreOffsetX);
  const awayScoreOffsetY = confidenceThemeNumber_(awayLayout.scoreOffsetY, -50, 50, scoreOffsetY);
  const homeScoreOffsetX = confidenceThemeNumber_(homeLayout.scoreOffsetX, -50, 50, scoreOffsetX);
  const homeScoreOffsetY = confidenceThemeNumber_(homeLayout.scoreOffsetY, -50, 50, scoreOffsetY);
  const selectedBorderWidth = confidenceThemeNumber_(selection.selectedBorderWidth, 0, 10, 2);
  const selectedTintOpacity = confidenceThemeNumber_(selection.selectedTintOpacity, 0, 80, 20);
  const unselectedGray = confidenceThemeNumber_(selection.unselectedGrayscale, 0, 100, 100);
  const unselectedOpacity = confidenceThemeNumber_(selection.unselectedOpacity, 0, 100, 48);
  const resultWidth = confidenceThemeNumber_(result.borderWidth, 0, 10, 2);
  const radius = confidenceThemeNumber_(row.radius, 0, 32, row.corners === "rounded" ? 18 : row.corners === "square" ? 0 : 10);
  const gradientAngle = confidenceThemeNumber_(background.gradientAngle, 0, 360, 180);
  const overlayOpacity = confidenceThemeNumber_(background.overlayOpacity, 0, 80, 0);
  const confidenceRadius = confidenceThemeNumber_(confidence.radius, 0, 28, 8);
  const lockedOpacity = confidenceThemeNumber_(confidence.lockedOpacity, 20, 100, 62);
  const scoreBgOpacity = confidenceThemeNumber_(score.backgroundOpacity, 0, 100, 100);
  const scoreBorderOpacity = confidenceThemeNumber_(score.borderOpacity, 0, 100, 100);
  const scoreRadius = confidenceThemeNumber_(score.radius, 0, 24, 7);
  const scorePaddingX = confidenceThemeNumber_(score.paddingX, 0, 20, 4);
  const scorePaddingY = confidenceThemeNumber_(score.paddingY, 0, 14, 2);
  const scoreboardOpacity = confidenceThemeNumber_(scoreboard.backgroundOpacity, 0, 100, 72);
  const scoreboardBorderOpacity = confidenceThemeNumber_(scoreboard.borderOpacity, 0, 100, 32);
  const scoreboardHeight = confidenceThemeNumber_(scoreboard.height, 18, 64, 26);
  const scoreboardRadius = confidenceThemeNumber_(scoreboard.radius, 0, 20, 0);
  const scoreboardFontSize = confidenceThemeNumber_(scoreboard.fontSize, 7, 20, 10);

  const vars = [
    "--confidence-theme-accent:" + confidenceThemeSafeColor_(colors.accent || selection.selectedBorderColor, "#60a5fa"),
    "--confidence-theme-surface:" + confidenceThemeSafeColor_(background.solid || colors.surface, "#0f172a"),
    "--confidence-theme-text:" + confidenceThemeSafeColor_(colors.text, "#ffffff"),
    "--confidence-theme-muted:" + confidenceThemeSafeColor_(colors.muted, "#94a3b8"),
    "--confidence-theme-correct:" + confidenceThemeSafeColor_(colors.correct, "#22c55e"),
    "--confidence-theme-incorrect:" + confidenceThemeSafeColor_(colors.incorrect, "#ef4444"),
    "--confidence-theme-live:" + confidenceThemeSafeColor_(colors.live, "#ef4444"),
    "--confidence-theme-final:" + confidenceThemeSafeColor_(colors.final, "#e2e8f0"),
    "--confidence-row-height:" + rowHeight + "px",
    "--confidence-row-padding:" + rowPadding + "px",
    "--confidence-team-gap:" + teamGap + "px",
    "--confidence-versus-width:" + versusWidth + "px",
    "--confidence-value-width:" + confidenceWidth + "px",
    "--confidence-row-radius:" + radius + "px",
    "--confidence-city-size:" + citySize + "px",
    "--confidence-city-weight:" + cityWeight,
    "--confidence-city-opacity:" + (cityOpacity / 100),
    "--confidence-name-size:" + nameSize + "px",
    "--confidence-name-weight:" + nameWeight,
    "--confidence-name-spacing:" + nameSpacing + "px",
    "--confidence-score-size:" + scoreSize + "px",
    "--confidence-value-size:" + confidenceSize + "px",
    "--confidence-image-size:" + imageSize + "px",
    "--confidence-image-opacity:" + (imageOpacity / 100),
    "--confidence-image-zoom:" + (imageZoom / 100),
    "--confidence-image-x:" + imageX + "%",
    "--confidence-image-y:" + imageY + "%",
    "--confidence-away-image-x:" + awayImageX + "%",
    "--confidence-away-image-y:" + awayImageY + "%",
    "--confidence-home-image-x:" + homeImageX + "%",
    "--confidence-home-image-y:" + homeImageY + "%",
    "--confidence-away-text-x:" + awayTextOffsetX + "px",
    "--confidence-away-text-y:" + awayTextOffsetY + "px",
    "--confidence-home-text-x:" + homeTextOffsetX + "px",
    "--confidence-home-text-y:" + homeTextOffsetY + "px",
    "--confidence-text-offset-x:" + textOffsetX + "px",
    "--confidence-text-offset-y:" + textOffsetY + "px",
    "--confidence-score-offset-x:" + scoreOffsetX + "px",
    "--confidence-score-offset-y:" + scoreOffsetY + "px",
    "--confidence-away-score-x:" + awayScoreOffsetX + "px",
    "--confidence-away-score-y:" + awayScoreOffsetY + "px",
    "--confidence-home-score-x:" + homeScoreOffsetX + "px",
    "--confidence-home-score-y:" + homeScoreOffsetY + "px",
    "--confidence-selected-border:" + confidenceThemeSafeColor_(selection.selectedBorderColor || colors.accent, "#60a5fa"),
    "--confidence-selected-width:" + selectedBorderWidth + "px",
    "--confidence-selected-bg:" + confidenceThemeHexRgba_(selection.selectedTint || colors.accent, selectedTintOpacity, "#2563eb"),
    "--confidence-unselected-gray:" + (unselectedGray / 100),
    "--confidence-unselected-opacity:" + (unselectedOpacity / 100),
    "--confidence-result-width:" + resultWidth + "px",
    "--confidence-gradient:" + "linear-gradient(" + gradientAngle + "deg," + confidenceThemeSafeColor_(background.gradientStart, "#1e293b") + "," + confidenceThemeSafeColor_(background.gradientEnd, "#0f172a") + ")",
    "--confidence-overlay-opacity:" + (overlayOpacity / 100),
    "--confidence-selected-overlay:" + confidenceThemeHexRgba_(overlays.selectedColor || selection.selectedTint, confidenceThemeNumber_(overlays.selectedOpacity,0,80,20), "#2563eb"),
    "--confidence-unselected-overlay:" + confidenceThemeHexRgba_(overlays.unselectedColor, confidenceThemeNumber_(overlays.unselectedOpacity,0,80,12), "#020617"),
    "--confidence-correct-overlay:" + confidenceThemeHexRgba_(overlays.correctColor || colors.correct, confidenceThemeNumber_(overlays.correctOpacity,0,80,12), "#22c55e"),
    "--confidence-incorrect-overlay:" + confidenceThemeHexRgba_(overlays.incorrectColor || colors.incorrect, confidenceThemeNumber_(overlays.incorrectOpacity,0,80,12), "#ef4444"),
    "--confidence-live-overlay:" + confidenceThemeHexRgba_(overlays.liveColor || colors.live, confidenceThemeNumber_(overlays.liveOpacity,0,60,0), "#ef4444"),
    "--confidence-final-overlay:" + confidenceThemeHexRgba_(overlays.finalColor || colors.final, confidenceThemeNumber_(overlays.finalOpacity,0,60,0), "#e2e8f0"),
    "--confidence-value-bg:" + confidenceThemeSafeColor_(confidence.background, "#0b1220"),
    "--confidence-value-text:" + confidenceThemeSafeColor_(confidence.text || colors.text, "#ffffff"),
    "--confidence-value-border:" + confidenceThemeSafeColor_(confidence.border || colors.accent, "#60a5fa"),
    "--confidence-value-radius:" + confidenceRadius + "px",
    "--confidence-locked-opacity:" + (lockedOpacity / 100),
    "--confidence-mobile-arrow-size:" + confidenceThemeNumber_(confidence.mobileArrowSize, 0, 10, 4) + "px",
    "--confidence-mobile-arrow-color:" + confidenceThemeSafeColor_(confidence.mobileArrowColor || colors.muted, "#94a3b8"),
    "--confidence-score-bg:" + confidenceThemeHexRgba_(score.background || "#e2e8f0", scoreBgOpacity, "#e2e8f0"),
    "--confidence-score-text:" + confidenceThemeSafeColor_(score.text || "#0f172a", "#0f172a"),
    "--confidence-score-border:" + confidenceThemeHexRgba_(score.border || "#0f172a", scoreBorderOpacity, "#0f172a"),
    "--confidence-score-radius:" + scoreRadius + "px",
    "--confidence-score-padding-x:" + scorePaddingX + "px",
    "--confidence-score-padding-y:" + scorePaddingY + "px",
    "--confidence-scoreboard-bg:" + confidenceThemeHexRgba_(scoreboard.background || "#0b1220", scoreboardOpacity, "#0b1220"),
    "--confidence-scoreboard-text:" + confidenceThemeSafeColor_(scoreboard.text || colors.muted, "#94a3b8"),
    "--confidence-scoreboard-border:" + confidenceThemeHexRgba_(scoreboard.border || "#334155", scoreboardBorderOpacity, "#334155"),
    "--confidence-scoreboard-height:" + scoreboardHeight + "px",
    "--confidence-scoreboard-radius:" + scoreboardRadius + "px",
    "--confidence-scoreboard-font-size:" + scoreboardFontSize + "px",
    "--confidence-correct-city:" + confidenceThemeSafeColor_(correctType.city || colors.text, "#ffffff"),
    "--confidence-correct-name:" + confidenceThemeSafeColor_(correctType.teamName || colors.text, "#ffffff"),
    "--confidence-correct-score:" + confidenceThemeSafeColor_(correctType.score || colors.correct, "#22c55e"),
    "--confidence-correct-status:" + confidenceThemeSafeColor_(correctType.status || colors.correct, "#22c55e"),
    "--confidence-correct-value:" + confidenceThemeSafeColor_(correctType.confidenceNumber || colors.correct, "#22c55e"),
    "--confidence-correct-label:" + confidenceThemeSafeColor_(correctType.confidenceLabel || colors.muted, "#94a3b8"),
    "--confidence-correct-points:" + confidenceThemeSafeColor_(correctType.points || colors.correct, "#22c55e"),
    "--confidence-wrong-city:" + confidenceThemeSafeColor_(wrongType.city || colors.text, "#ffffff"),
    "--confidence-wrong-name:" + confidenceThemeSafeColor_(wrongType.teamName || colors.text, "#ffffff"),
    "--confidence-wrong-score:" + confidenceThemeSafeColor_(wrongType.score || colors.incorrect, "#ef4444"),
    "--confidence-wrong-status:" + confidenceThemeSafeColor_(wrongType.status || colors.incorrect, "#ef4444"),
    "--confidence-wrong-value:" + confidenceThemeSafeColor_(wrongType.confidenceNumber || colors.incorrect, "#ef4444"),
    "--confidence-wrong-label:" + confidenceThemeSafeColor_(wrongType.confidenceLabel || colors.muted, "#94a3b8"),
    "--confidence-wrong-points:" + confidenceThemeSafeColor_(wrongType.points || colors.incorrect, "#ef4444")
  ];

  return { className: classes.join(" "), style: vars.join(";") };
}

async function hydrateConfidenceAppearance_() {
  if (typeof apiGetGameAppearance !== "function") return;

  const gameId = String(PICKS_PAGE_DATA.gameId || "").trim();
  if (!gameId) return;

  if (PICKS_PAGE_DATA.appearance && PICKS_CONFIDENCE_APPEARANCE_GAME_ID === gameId) return;
  if (PICKS_CONFIDENCE_APPEARANCE_REQUEST && PICKS_CONFIDENCE_APPEARANCE_GAME_ID === gameId) return PICKS_CONFIDENCE_APPEARANCE_REQUEST;

  PICKS_CONFIDENCE_APPEARANCE_GAME_ID = gameId;
  PICKS_CONFIDENCE_APPEARANCE_REQUEST = (async function() {
    try {
      const result = await apiGetGameAppearance(gameId);
      if (result && result.success !== false && String(PICKS_PAGE_DATA.gameId || "") === gameId) {
        PICKS_PAGE_DATA.appearance = result;
        refreshPicksPage();
      }
    } catch (err) {
      console.warn("Confidence appearance load skipped", err);
    } finally {
      PICKS_CONFIDENCE_APPEARANCE_REQUEST = null;
    }
  })();

  return PICKS_CONFIDENCE_APPEARANCE_REQUEST;
}

function splitConfidenceTeamName_(name) {

  const words = String(name || "Team")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 1) {
    return {
      city: "",
      nickname: words[0] || "Team"
    };
  }

  return {
    city: words.slice(0, -1).join(" "),
    nickname: words[words.length - 1]
  };

}

function formatCompactConfidenceLock_(category) {

  if (isCategoryLocked(category)) return "LOCKED";

  const raw = category && category.lockDateTime;
  if (!raw) return "Open for picks";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Open for picks";

  return "Locks " + date.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });

}

function renderCompactConfidenceTeam_(category, nominee, selectedNomineeId, locked, result) {

  const selected = normalizeId(selectedNomineeId) === normalizeId(nominee && nominee.id);
  const hasSelection = Boolean(selectedNomineeId);
  const parts = splitConfidenceTeamName_(nominee && nominee.name);
  const side = confidenceNomineeSide_(category, nominee);
  const score = confidenceScoreValue_(category, side);
  const phase = getConfidenceSportsPhase_(category);
  const actualWinner = Boolean(result && result.winnerNomineeId && normalizeId(result.winnerNomineeId) === normalizeId(nominee && nominee.id));
  const appearanceImage = confidenceAppearanceResolvedImage_(category, nominee);

  return `
    <button
      type="button"
      class="confidence-team-choice confidence-team-${side || "team"} ${selected ? "selected" : ""} ${hasSelection && !selected ? "not-selected" : ""} ${actualWinner ? "actual-winner" : ""}"
      onclick="draftConfidenceNominee_('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
      aria-pressed="${selected ? "true" : "false"}"
      aria-label="Pick ${escapeAttr(nominee.name || "team")}"
      ${locked || PICKS_CONFIDENCE_BATCH_SAVING ? "disabled" : ""}
    >
      <span class="confidence-team-visual confidence-element-team-image">
        ${platformImgHtml(appearanceImage.imageUrl, {
          className: "confidence-team-logo",
          variant: "thumb",
          alt: nominee.name || "Team"
        })}
      </span>
      <span class="confidence-team-text">
        <span class="confidence-team-city confidence-element-city">${escapeHtml(parts.city)}</span>
        <strong class="confidence-team-nickname confidence-element-team-name">${escapeHtml(parts.nickname)}</strong>
      </span>
      ${phase !== "pregame" && score !== "" ? `<strong class="confidence-team-score confidence-element-score">${escapeHtml(String(score))}</strong>` : ""}
      ${selected ? `<span class="confidence-selected-mark confidence-element-result-indicator">✓</span>` : ""}
      ${actualWinner && phase === "final" ? `<span class="confidence-winner-mark">W</span>` : ""}
    </button>
  `;

}

function renderCompactConfidenceRow_(category) {

  const nominees = Array.isArray(category.nominees) ? category.nominees : [];

  if (nominees.length !== 2) {
    return renderCategoryCard(category, false);
  }

  const selectedNomineeId = PICKS_PAGE_DATA.picks[category.id] || "";
  const confidencePoints = Number(PICKS_PAGE_DATA.confidencePoints[category.id]) || 0;
  const locked = isCompactConfidenceLocked_(category);
  const result = getConfidenceLiveResult_(category, selectedNomineeId);
  const dirty = confidenceCategoryIsDirty_(category.id);
  const phase = getConfidenceSportsPhase_(category);
  const resultPoints = confidenceResultPointsLabel_(category, result);

  return `
    <article
      class="confidence-game-row ${result.className || "pending"} phase-${phase} ${dirty ? "is-dirty" : ""}"
      data-category-id="${escapeAttr(category.id)}"
      data-locked="${locked ? "true" : "false"}"
    >
      <div class="confidence-game-main">
        ${renderCompactConfidenceTeam_(category, nominees[0], selectedNomineeId, locked, result)}

        <div class="confidence-versus confidence-element-versus" aria-hidden="true">VS</div>

        ${renderCompactConfidenceTeam_(category, nominees[1], selectedNomineeId, locked, result)}

        <label class="confidence-row-value">
          <span class="confidence-value-label">Confidence</span>
          <select class="confidence-value-input"
            id="confidence-${escapeAttr(category.id)}"
            onchange="updateConfidenceForCategory('${escapeJs(category.id)}', this.value)"
            ${locked || PICKS_CONFIDENCE_BATCH_SAVING ? "disabled" : ""}
          >
            <option value="">—</option>
            ${renderConfidenceOptionsForCategory(category.id, confidencePoints)}
          </select>
          ${resultPoints ? `<strong class="confidence-result-points confidence-element-points ${result.className}">${escapeHtml(resultPoints)}</strong>` : ""}
        </label>
      </div>

      ${renderConfidenceDetails_(category, dirty, locked, phase)}
    </article>
  `;

}

function renderCompactConfidenceSlate_() {

  const categories = getCompactConfidenceDisplayCategories_();
  const presentation = confidenceThemePresentation_();

  return `
    <div class="confidence-compact-slate ${escapeAttr(presentation.className)}" style="${escapeAttr(presentation.style)}">
      ${categories.map(renderCompactConfidenceRow_).join("")}
    </div>
  `;

}

function renderCompactConfidenceToolbar_() {

  const categories = getCompactConfidenceCategories_();
  const used = getUsedConfidencePoints();
  const dirty = getConfidenceDirtyCategories_();
  const pickedCount = categories.filter(function(category) {
    return Boolean(PICKS_PAGE_DATA.picks[category.id]);
  }).length;
  const rankedCount = categories.filter(function(category) {
    return Number(PICKS_PAGE_DATA.confidencePoints[category.id]) > 0;
  }).length;

  return `
    <div class="confidence-summary-bar confidence-compact-toolbar">
      <div class="confidence-toolbar-progress">
        <strong>Confidence Card</strong>
        <span>${pickedCount}/${categories.length} winners · ${rankedCount}/${categories.length} ranked</span>
      </div>

      <div class="confidence-toolbar-sort" aria-label="Sort Confidence games">
        <span>Sort</span>
        <button
          type="button"
          class="${PICKS_CONFIDENCE_SORT_MODE === "time" ? "active" : ""}"
          onclick="setConfidenceSortMode_('time')"
        >Game Time</button>
        <button
          type="button"
          class="${PICKS_CONFIDENCE_SORT_MODE === "confidence" ? "active" : ""} ${PICKS_CONFIDENCE_SORT_STALE ? "stale" : ""}"
          onclick="setConfidenceSortMode_('confidence')"
        >${PICKS_CONFIDENCE_SORT_MODE === "confidence" && PICKS_CONFIDENCE_SORT_STALE ? "Re-sort Confidence" : "Confidence ↓"}</button>
      </div>

      <div class="confidence-toolbar-used" title="Confidence values currently assigned">
        Used: ${used.length ? used.join(", ") : "none"}
      </div>

      <button
        type="button"
        class="confidence-save-all-button"
        onclick="saveConfidenceDraft_()"
        ${PICKS_CONFIDENCE_BATCH_SAVING || !dirty.length ? "disabled" : ""}
      >
        ${
          PICKS_CONFIDENCE_BATCH_SAVING
            ? "Saving…"
            : dirty.length
              ? `Save All Picks (${dirty.length})`
              : "All Picks Saved"
        }
      </button>
    </div>
  `;

}

function draftConfidenceNominee_(categoryId, nomineeId) {

  if (!shouldRenderCompactConfidenceSlate_()) {
    selectNominee(categoryId, nomineeId);
    return;
  }

  const category = getCompactConfidenceCategories_().find(function(item) {
    return normalizeId(item.id) === normalizeId(categoryId);
  });

  if (!category) {
    showPicksMessage("Game not found.", true);
    return;
  }

  if (isCompactConfidenceLocked_(category)) {
    showPicksMessage("This game has started and is locked.", true);
    return;
  }

  PICKS_PAGE_DATA.picks[category.id] = nomineeId;
  persistConfidenceDraft_();
  refreshPicksPage();
  showPicksMessage("Draft updated. Save the card when you are ready.", false);

}

async function saveConfidenceDraft_() {

  if (!shouldRenderCompactConfidenceSlate_()) return;
  if (PICKS_CONFIDENCE_BATCH_SAVING) return;

  const dirty = getConfidenceDirtyCategories_();

  if (!dirty.length) {
    showPicksMessage("All Confidence picks are already saved.", false);
    return;
  }

  const incomplete = dirty.filter(function(category) {
    return !PICKS_PAGE_DATA.picks[category.id] ||
      Number(PICKS_PAGE_DATA.confidencePoints[category.id]) <= 0;
  });

  if (incomplete.length) {
    showPicksMessage(
      "Finish both the winner and confidence value for " +
      incomplete.length +
      " unsaved game" +
      (incomplete.length === 1 ? "" : "s") +
      " before saving.",
      true
    );
    return;
  }

  const session = PICKS_PAGE_DATA.session || getSession();
  const batch = dirty.map(function(category) {
    return {
      categoryId: category.id,
      nomineeId: PICKS_PAGE_DATA.picks[category.id],
      confidencePoints: Number(PICKS_PAGE_DATA.confidencePoints[category.id]) || 0
    };
  });

  PICKS_CONFIDENCE_BATCH_SAVING = true;
  refreshPicksPage();
  showPicksMessage("Saving your Confidence card…", false);

  let result;

  try {
    result = await apiSaveConfidencePicksBatch({
      username: session.username,
      gameId: PICKS_PAGE_DATA.gameId,
      picks: batch
    });
  } catch (err) {
    result = {
      success: false,
      message: err && err.message ? err.message : "Could not save Confidence picks."
    };
  }

  PICKS_CONFIDENCE_BATCH_SAVING = false;

  if (!result || result.success !== true) {
    refreshPicksPage();
    showPicksMessage(
      (result && (result.message || result.error)) || "Could not save Confidence picks.",
      true
    );
    return;
  }

  (result.results || []).forEach(function(saved) {

    const category = getCompactConfidenceCategories_().find(function(item) {
      return normalizeId(item.id) === normalizeId(saved.categoryId);
    });

    if (!category) return;

    PICKS_PAGE_DATA.picks[category.id] = saved.nomineeId;
    PICKS_PAGE_DATA.confidencePoints[category.id] = Number(saved.confidencePoints) || 0;
    PICKS_PAGE_DATA.changeCounts[category.id] = Number(saved.changeCount) || 0;
    PICKS_PAGE_DATA.originalPicks[category.id] = saved.originalNomineeId || saved.nomineeId;
    if (saved.pickMeta) PICKS_PAGE_DATA.pickMeta[category.id] = saved.pickMeta;

    PICKS_CONFIDENCE_BASELINE_PICKS[category.id] = saved.nomineeId;
    PICKS_CONFIDENCE_BASELINE_POINTS[category.id] = Number(saved.confidencePoints) || 0;

  });

  PICKS_CONFIDENCE_BASE_SIGNATURE = confidenceSnapshotSignature_(
    PICKS_CONFIDENCE_BASELINE_PICKS,
    PICKS_CONFIDENCE_BASELINE_POINTS
  );

  persistConfidenceDraft_();
  clearStartupPayload();
  refreshPicksPage();

  showPicksMessage(
    (Number(result.savedCount) || 0) +
      " Confidence pick" +
      ((Number(result.savedCount) || 0) === 1 ? "" : "s") +
      " saved.",
    false
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

  if (shouldRenderCompactConfidenceSlate_()) {
    return renderCompactConfidenceToolbar_();
  }

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

function renderPicksCategoryCards_(categories) {
  const ids = {};
  (categories || []).forEach(function(item) { ids[normalizeId(item.id)] = true; });
  const parents = (categories || []).filter(function(cat) {
    return !cat.parentCategoryId || !ids[normalizeId(cat.parentCategoryId)];
  });
  return parents.map(function(parent) {
    const children = getChildCategories(parent).filter(function(child) { return ids[normalizeId(child.id)]; });
    return `<div class="picks-parent-block">${renderCategoryCard(parent, false)}${children.length ? `<div class="child-category-wrapper">${children.map(function(child) { return renderCategoryCard(child, true, parent); }).join("")}</div>` : ""}</div>`;
  }).join("");
}

function realityTvEpisodeCategoryMap_() {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  const map = {};
  (view.episodes || []).forEach(function(episode) {
    if (episode.categoryId) map[normalizeId(episode.categoryId)] = Number(episode.episodeNumber || 0);
  });
  (view.episodeQuestions || []).forEach(function(question) {
    if (question.categoryId) map[normalizeId(question.categoryId)] = Number(question.episodeNumber || 0);
  });
  return map;
}


function realityTvEpisodeNumberForCategory_(categoryId) {
  return Number(realityTvEpisodeCategoryMap_()[normalizeId(categoryId)] || 0);
}

function realityTvEpisodeHeaderStats_(episode, itemCount, pickedCount) {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  const stats = view.playerStats && view.playerStats.episodes
    ? (view.playerStats.episodes[String(Number(episode.episodeNumber || 0))] || {})
    : {};
  const eliminated = Array.isArray(episode.eliminated) ? episode.eliminated : [];
  const eliminatedText = eliminated.length
    ? `Eliminated: ${eliminated.map(function(item) { return item.name; }).join(", ")}`
    : (String(episode.status || "").toUpperCase() === "FINAL" ? "No elimination recorded" : "Result pending");
  return `<div class="reality-episode-header-stats" data-reality-episode-stats="${Number(episode.episodeNumber || 0)}">
    <div><span>Week points</span><strong>${realityTvFormatPoints_(stats.points || 0)}</strong></div>
    <div><span>Place</span><strong>${Number(stats.place || 0) ? "#" + Number(stats.place) : "—"}</strong></div>
    <div><span>Position</span><strong>${realityTvMovementHtml_(stats.positionChange)}</strong></div>
    <div><span>Correct</span><strong>${Number(stats.correct || 0)} of ${Number(stats.settled || 0)}</strong></div>
    <div class="reality-episode-header-eliminated"><span>${escapeHtml(eliminatedText)}</span><small>${pickedCount}/${itemCount} picks saved</small></div>
  </div>`;
}

function realityTvEpisodeScheduleText_(episode) {
  const status = String(episode.scheduleStatus || "SCHEDULED").toUpperCase();
  if (status === "TBA") return "Air date TBA · picks remain open";
  const lock = formatSeasonAnchorLock_(episode.lockDateTime);
  if (status === "DELAYED") return "Delayed · " + lock;
  if (status === "RESCHEDULED") return "Rescheduled · " + lock;
  return lock;
}

function realityTvEpisodeVoteDetailsHtml_(episode) {
  const details = episode && episode.voteDetails;
  if (!details || String(episode.status || "").toUpperCase() !== "FINAL") return "";
  const tallies = Array.isArray(details.tallies) ? details.tallies : [];
  const rows = Array.isArray(details.rows) ? details.rows : [];
  if (!tallies.length && !rows.length) return "";
  const statusLabel = function(status) {
    const labels = { VALID: "Valid", NULLIFIED: "Nullified", "NOT-READ": "Not read", "LOST-VOTE": "Lost vote", ABSTAINED: "Abstained" };
    return labels[String(status || "VALID").toUpperCase()] || String(status || "");
  };
  return `<details class="reality-player-vote-details">
    <summary><span><strong>Episode Vote Details</strong><small>${rows.length} recorded ballot${rows.length === 1 ? "" : "s"}</small></span><span>View tally</span></summary>
    <div class="reality-player-vote-body">
      ${tallies.length ? `<div class="reality-player-vote-tallies">${tallies.map(function(tally) {
        const notes = [];
        if (Number(tally.nullified || 0)) notes.push(Number(tally.nullified) + " nullified");
        if (Number(tally.notRead || 0)) notes.push(Number(tally.notRead) + " not read");
        return `<div><strong>${escapeHtml(tally.contestantName || tally.contestantId || "Unknown")}</strong><span>${Number(tally.valid || 0)} valid / ${Number(tally.cast || 0)} cast</span>${notes.length ? `<small>${escapeHtml(notes.join(" · "))}</small>` : ""}</div>`;
      }).join("")}</div>` : ""}
      ${rows.length ? `<div class="reality-player-vote-table-wrap"><table class="reality-player-vote-table"><thead><tr><th>Round</th><th>Voter</th><th>Voted for</th><th>Status</th><th>Value</th></tr></thead><tbody>${rows.map(function(row) {
        const target = row.targetName || (String(row.status || "").toUpperCase() === "LOST-VOTE" ? "No vote" : String(row.status || "").toUpperCase() === "ABSTAINED" ? "Abstained" : "—");
        return `<tr><td>${escapeHtml(row.round || "Initial Vote")}</td><td>${escapeHtml(row.voterName || "Unknown")}</td><td>${escapeHtml(target)}</td><td>${escapeHtml(statusLabel(row.status))}</td><td>${Number(row.value || 0)}</td></tr>`;
      }).join("")}</tbody></table></div>` : ""}
    </div>
  </details>`;
}

function renderRealityTvEpisodeSections_(categories) {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  const episodes = (view.episodes || []).slice().sort(function(a, b) { return Number(b.episodeNumber || 0) - Number(a.episodeNumber || 0); });
  const categoryMap = realityTvEpisodeCategoryMap_();
  const used = {};
  const sections = episodes.map(function(episode, index) {
    const items = categories.filter(function(category) {
      const match = categoryMap[normalizeId(category.id)] === Number(episode.episodeNumber || 0);
      if (match) used[normalizeId(category.id)] = true;
      return match;
    });
    if (!items.length) return "";
    const latest = index === 0;
    const picked = items.filter(function(item) { return !!PICKS_PAGE_DATA.picks[item.id]; }).length;
    return `<details class="reality-episode-picks-section ${latest ? "latest" : ""}" ${latest ? "open" : ""}><summary><div class="reality-episode-summary-title"><span class="reality-episode-kicker">${latest ? "Latest" : "Previous"} ${escapeHtml((view.season && view.season.periodLabel) || "Episode")}</span><h2>${escapeHtml(episode.episodeName || ((view.season && view.season.periodLabel) || "Episode") + " " + episode.episodeNumber)}</h2><span>${escapeHtml(realityTvEpisodeScheduleText_(episode))}</span>${episode.scheduleNotes ? `<small>${escapeHtml(episode.scheduleNotes)}</small>` : ""}</div>${realityTvEpisodeHeaderStats_(episode, items.length, picked)}<span class="reality-episode-status">${escapeHtml(episode.status || "OPEN")}</span></summary><div class="reality-episode-picks-body">${renderPicksCategoryCards_(items)}${realityTvEpisodeVoteDetailsHtml_(episode)}</div></details>`;
  }).join("");
  const remaining = categories.filter(function(category) { return !used[normalizeId(category.id)]; });
  return sections + (remaining.length ? `<details class="reality-episode-picks-section other" open><summary><div><span class="reality-episode-kicker">Other</span><h2>Season Questions</h2><span>${remaining.length} question${remaining.length === 1 ? "" : "s"}</span></div></summary><div class="reality-episode-picks-body">${renderPicksCategoryCards_(remaining)}</div></details>` : "");
}

function renderPicksCategoryList() {
  if (shouldRenderCompactConfidenceSlate_()) return renderCompactConfidenceSlate_();
  const categories = (PICKS_PAGE_DATA.categories || []).filter(function(category) { return isPicksPageCategory(category); });
  if (PICKS_PAGE_DATA.realityTvView && PICKS_PAGE_DATA.realityTvView.enabled === true) return renderRealityTvEpisodeSections_(categories);
  return renderPicksCategoryCards_(categories);
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

  const rawMaxChanges = Number(category.maxChanges);
  const maxChanges = Number.isFinite(rawMaxChanges) ? rawMaxChanges : 0;
  const unlimitedChanges = maxChanges < 0;

  const changesLeft = unlimitedChanges
    ? null
    : Math.max(maxChanges - changeCount, 0);

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
    hasPick && normalizeId(PICKS_TEMP_OPEN_CATEGORY_ID) !== normalizeId(category.id) ? "collapsed" : "";

  const childClass =
    isChild ? "child-category-card" : "";

  const savingClass = PICKS_PENDING_SAVES[category.id] ? "is-saving" : "";

  return `
    <section
      class="pick-category-card question-layout-${escapeAttr(picksResolvedQuestionLayout_(category))} ${collapsedClass} ${childClass} ${status.className} ${savingClass}"
      data-category-id="${escapeAttr(category.id)}"
      data-has-pick="${hasPick ? "true" : "false"}"
      data-locked="${locked ? "true" : "false"}"
    >

    <button
      type="button"
      class="pick-card-header"
      aria-expanded="${collapsedClass ? "false" : "true"}"
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

        ${platformImgHtml(selectedNominee.image, { className: "selected-pick-image", variant: "thumb", alt: selectedNominee.name || "Selected pick" })}

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

    <div class="pick-card-body">
    ${
      !confidencePointsCategory
        ? stakedPointsCategory
          ? `
            <div class="pick-rules-row stake-rules-row">
              <div class="penalty-note">
                Your selected stake is reserved until this question settles.
              </div>
              ${maxChanges > 0 ? `<div class="changes-pill body-pill">${changesLeft} changes left</div>` : ""}
            </div>
          `
          : (penalty > 0 || maxChanges > 0)
            ? `
              <div class="pick-rules-row">
                ${penalty > 0 ? `<div class="penalty-note">Penalty: ${penalty} point${penalty === 1 ? "" : "s"}</div>` : ""}
                ${maxChanges > 0 ? `<div class="changes-pill body-pill">${changesLeft} changes left</div>` : ""}
              </div>
            `
            : ""
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

  ${renderCategoryNominees_(category, selectedNomineeId, locked)}

</div>

${renderConfidenceControl(
  category,
  locked
)}

    </div>
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

    if (!otherHasPick && !shouldRenderCompactConfidenceSlate_()) {
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

    if (!hasPick && !shouldRenderCompactConfidenceSlate_()) {
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

  const nextValue = Number(value) || 0;

  if (
    nextValue > 0 &&
    getUsedConfidencePointsForOtherCategories(categoryId).includes(nextValue)
  ) {
    showPicksMessage(
      "Confidence " + nextValue + " is already assigned to another game.",
      true
    );
    refreshPicksPage();
    return;
  }

  PICKS_PAGE_DATA.confidencePoints[categoryId] = nextValue;

  if (shouldRenderCompactConfidenceSlate_()) {
    if (PICKS_CONFIDENCE_SORT_MODE === "confidence") {
      PICKS_CONFIDENCE_SORT_STALE = true;
    }
    persistConfidenceDraft_();
    refreshPicksPage();
  }

}

/* =========================
   NOMINEE BUTTON
========================= */


function realityTvQuestionVisual_(category) {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  const categoryId = normalizeId(category && category.id);
  const supplemental = (view.episodeQuestions || []).find(function(item) {
    return normalizeId(item.categoryId) === categoryId;
  });
  if (supplemental) {
    return {
      layoutType: String(supplemental.layoutType || category.layoutType || "auto").toLowerCase(),
      imageSource: String(supplemental.imageSource || "auto").toLowerCase()
    };
  }
  const mainEpisode = (view.episodes || []).find(function(item) {
    return normalizeId(item.categoryId) === categoryId;
  });
  if (mainEpisode) {
    return {
      layoutType: String((view.season && view.season.eliminationLayoutType) || category.layoutType || "auto").toLowerCase(),
      imageSource: String((view.season && view.season.eliminationImageSource) || "roster").toLowerCase()
    };
  }
  return {
    layoutType: String(category && category.layoutType || "auto").toLowerCase(),
    imageSource: "auto"
  };
}

function realityTvNomineeMeta_(nominee, category) {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  const id = normalizeId(nominee && nominee.id);
  const participant = (view.participants || []).find(function(item) { return normalizeId(item.id) === id; });
  if (participant) {
    const copy = Object.assign({ kind: "participant" }, participant);
    const episodeNumber = realityTvEpisodeNumberForCategory_(category && category.id);
    if (episodeNumber > 0 && Array.isArray(copy.groupHistory)) {
      const assignment = copy.groupHistory.filter(function(entry) {
        const start = Number(entry.startEpisode || 1);
        const end = Number(entry.endEpisode || 0);
        return start <= episodeNumber && (!end || end >= episodeNumber);
      }).slice(-1)[0];
      if (assignment && assignment.groupName) copy.teamOrTribe = assignment.groupName;
    }
    const group = (view.groups || []).find(function(item) { return normalizeId(item.name) === normalizeId(copy.teamOrTribe); }) || {};
    copy.teamColor = group.color || copy.teamColor;
    copy.groupImageUrl = group.imageUrl || copy.groupImageUrl;
    return copy;
  }
  const group = (view.groups || []).find(function(item) {
    const groupId = normalizeId(item.id);
    const groupName = normalizeId(item.name);
    return groupId === id || groupName === id || (groupName && id.endsWith("-" + groupName));
  });
  if (group) return { kind: "group", id: group.id, name: group.name, imageUrl: group.imageUrl, groupImageUrl: group.imageUrl, teamColor: group.color, status: group.active ? "ACTIVE" : "INACTIVE", biography: "" };
  return null;
}


function realityTvWinnerIds_(category) {
  const values = Array.isArray(category && category.winnerNomineeIds)
    ? category.winnerNomineeIds
    : [];
  const ids = values.map(function(value) { return normalizeId(value); }).filter(Boolean);
  const single = normalizeId(category && category.winnerNomineeId);
  if (single && ids.indexOf(single) === -1) ids.push(single);
  return ids;
}

function realityTvQuestionType_(category) {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  const categoryId = normalizeId(category && category.id);
  const supplemental = (view.episodeQuestions || []).find(function(item) {
    return normalizeId(item.categoryId) === categoryId;
  });
  if (supplemental && supplemental.questionType) return normalizeId(supplemental.questionType);
  const mainEpisode = (view.episodes || []).find(function(item) {
    return normalizeId(item.categoryId) === categoryId;
  });
  if (mainEpisode) return "elimination";
  return normalizeId((category && category.questionType) || "");
}

function realityTvResultLabel_(category) {
  const type = realityTvQuestionType_(category);
  const labels = {
    "elimination": "ELIMINATED",
    "eliminated": "ELIMINATED",
    "immunity-winner": "IMMUNITY",
    "reward-winner": "REWARD",
    "idol-finder": "IDOL",
    "tribal-attendee": "TRIBAL",
    "individual-challenge-winner": "WINNER",
    "team-challenge-winner": "WINNER",
    "safety-winner": "SAFE",
    "team-safety-winner": "SAFE",
    "shield-winner": "SAFE",
    "bottom-finish": "BOTTOM",
    "lowest-score": "BOTTOM",
    "last-place-team": "BOTTOM",
    "highest-score": "WINNER",
    "perfect-score": "PERFECT",
    "mission-winner": "WINNER",
    "leg-winner": "WINNER",
    "murdered-player": "MURDERED",
    "banished-player": "BANISHED",
    "traitor-banished": "BANISHED",
    "fast-forward": "FAST FORWARD",
    "u-turn-recipient": "U-TURN",
    "time-penalty": "PENALTY"
  };
  if (labels[type]) return labels[type];
  const title = String(getCategoryDisplayTitle(category) || "").toLowerCase();
  if (/eliminat|leave the game|voted out/.test(title)) return "ELIMINATED";
  if (/safe|safety|protected|shield/.test(title)) return "SAFE";
  if (/immunity/.test(title)) return "IMMUNITY";
  if (/reward/.test(title)) return "REWARD";
  if (/idol/.test(title)) return "IDOL";
  if (/tribal/.test(title)) return "TRIBAL";
  if (/bottom|last place|lowest/.test(title)) return "BOTTOM";
  if (/winner|wins|won|highest|first place/.test(title)) return "WINNER";
  return "RESULT";
}

function realityTvNomineeResultState_(category, nominee) {
  const winnerIds = realityTvWinnerIds_(category);
  const nomineeId = normalizeId(nominee && nominee.id);
  const matched = !!nomineeId && winnerIds.indexOf(nomineeId) !== -1;
  const label = matched ? realityTvResultLabel_(category) : "";
  return {
    matched: matched,
    label: label,
    elimination: matched && label === "ELIMINATED"
  };
}


function toggleRealityNomineeBio_(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

function renderRealityNomineeButton_(category, nominee, selectedNomineeId, locked) {
  const meta = realityTvNomineeMeta_(nominee, category) || {};
  const selected = normalizeId(nominee.id) === normalizeId(selectedNomineeId);
  const existingStake = Number(PICKS_PAGE_DATA.stakePoints[category.id]) || 0;
  const disabled = locked || (isStakedPointsCategory(category) && existingStake <= 0) ? "disabled" : "";
  const color = realityTvSafeColor_(meta.teamColor);
  const resultState = realityTvNomineeResultState_(category, nominee);
  const eliminated = resultState.elimination;
  const visual = realityTvQuestionVisual_(category);
  const layout = ["image", "compact", "list", "text", "short-answer"].includes(visual.layoutType) ? visual.layoutType : "image";
  let image = nominee.image || "";
  if (visual.imageSource === "roster") image = meta.kind === "participant" ? (meta.imageUrl || "") : (meta.imageUrl || nominee.image || "");
  else if (visual.imageSource === "group") image = meta.groupImageUrl || (meta.kind === "group" ? meta.imageUrl : "") || "";
  else if (visual.imageSource === "none") image = "";
  else if (!image) image = meta.imageUrl || "";
  const showImage = layout !== "text" && layout !== "short-answer" && !!image;
  const bioId = "realityBio_" + String(category.id).replace(/[^a-z0-9_-]/gi, "_") + "_" + String(nominee.id).replace(/[^a-z0-9_-]/gi, "_");
  return `<div class="nominee-choice reality-profile-choice reality-layout-${escapeAttr(layout)} ${selected ? "selected" : ""} ${resultState.matched ? "is-result" : ""} ${eliminated ? "is-eliminated" : ""} ${showImage ? "has-image" : "no-image"}" style="--reality-team-color:${escapeAttr(color)}">
    <button type="button" class="reality-profile-select" onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')" ${disabled}>
      ${showImage ? `<span class="reality-profile-image">${platformImgHtml(image, { className: "reality-profile-choice-image", variant: layout === "compact" || layout === "list" ? "thumb" : "card", alt: nominee.name || "Contestant" })}${eliminated ? `<span class="reality-eliminated-overlay">ELIMINATED</span>` : (resultState.matched ? `<span class="reality-result-overlay">${escapeHtml(resultState.label)}</span>` : "")}</span>` : `<span class="reality-profile-text-marker ${resultState.matched ? "is-result" : ""}">${resultState.matched ? escapeHtml(resultState.label) : escapeHtml((nominee.name || "?").slice(0, 2).toUpperCase())}</span>`}
      <span class="reality-profile-name">${escapeHtml(nominee.name)}</span>
      ${meta.teamOrTribe ? `<span class="reality-profile-team">${escapeHtml(meta.teamOrTribe)}</span>` : ""}
      ${resultState.matched ? `<span class="reality-result-badge">${escapeHtml(resultState.label)}</span>` : ""}
      ${selected ? `<span class="reality-user-pick-badge">YOUR PICK</span>` : ""}
    </button>
    ${(meta.biography || meta.hometown || meta.occupation || meta.age || meta.member1 || meta.member2 || meta.relationship) ? `<button type="button" class="reality-profile-toggle" onclick="toggleRealityNomineeBio_('${escapeJs(bioId)}')">Bio & details</button><div id="${escapeAttr(bioId)}" class="reality-profile-panel" hidden>${realityTvProfileDetailsHtml_(meta)}</div>` : ""}
  </div>`;
}

function renderCategoryNominees_(category, selectedNomineeId, locked) {
  const isReality = PICKS_PAGE_DATA.realityTvView && PICKS_PAGE_DATA.realityTvView.enabled === true;
  if (!isReality) return (category.nominees || []).map(function(nominee) { return renderNomineeButton(category, nominee, selectedNomineeId, locked); }).join("");
  const grouped = {};
  const order = [];
  (category.nominees || []).forEach(function(nominee) {
    const meta = realityTvNomineeMeta_(nominee, category) || {};
    const label = meta.teamOrTribe || "";
    if (!grouped[label]) { grouped[label] = []; order.push(label); }
    grouped[label].push(nominee);
  });
  const hasGroups = order.filter(Boolean).length > 1;
  return order.map(function(label) {
    const group = (PICKS_PAGE_DATA.realityTvView.groups || []).find(function(item) { return normalizeId(item.name) === normalizeId(label); }) || {};
    const color = realityTvSafeColor_(group.color);
    const content = grouped[label].map(function(nominee) { return renderRealityNomineeButton_(category, nominee, selectedNomineeId, locked); }).join("");
    if (!hasGroups || !label) return content;
    return `<section class="reality-nominee-group" style="--reality-team-color:${escapeAttr(color)}"><div class="reality-nominee-group-header">${group.imageUrl ? platformImgHtml(group.imageUrl, { className: "reality-nominee-group-image", variant: "logo", alt: label }) : ""}<strong>${escapeHtml(label)}</strong></div><div class="reality-nominee-group-grid">${content}</div></section>`;
  }).join("");
}

function renderNomineeLiveProbability_(category, nominee) {
  if (!nominee) return "";

  let sourceConfig = null;
  if (category) {
    if (category.__marketProbabilityDisplayConfig !== undefined) {
      sourceConfig = category.__marketProbabilityDisplayConfig;
    } else {
      const rawConfig = category.sourceConfigJSON || category.SourceConfigJSON || "";
      if (rawConfig && typeof rawConfig === "object") {
        sourceConfig = rawConfig;
      } else if (rawConfig) {
        try { sourceConfig = JSON.parse(String(rawConfig)); } catch (err) { sourceConfig = null; }
      }
      try { category.__marketProbabilityDisplayConfig = sourceConfig || null; } catch (err) {}
    }
  }

  if (sourceConfig && sourceConfig.showMarketProbabilities === false) return "";

  const nomineeId = String(nominee.id || nominee.nomineeId || "");
  const perAnswer = sourceConfig && sourceConfig.probabilityDisplayByNomineeId;
  if (perAnswer && nomineeId && perAnswer[nomineeId] === false) return "";

  const raw = nominee.liveProbability;
  if (raw === "" || raw === null || raw === undefined) return "";

  const probability = Number(raw);
  if (!Number.isFinite(probability)) return "";

  const provider = String(nominee.liveProbabilityProvider || "market").trim().toLowerCase();
  const providerLabel = provider === "kalshi" ? "K" : provider === "polymarket" ? "P" : "M";
  const rounded = Math.abs(probability - Math.round(probability)) < 0.05 ? probability.toFixed(0) : probability.toFixed(1);

  return '<small class="nominee-live-probability" style="display:block;margin-top:4px;font-size:.78em;opacity:.78;">' +
    escapeHtml(providerLabel) + " · " + escapeHtml(rounded) + "%</small>";
}


function picksAppearanceTheme_() {
  return (PICKS_PAGE_DATA.appearance && PICKS_PAGE_DATA.appearance.theme) || {};
}

function picksQuestionSectionKey_(category) {
  return String(category && (category.sectionId || category.SectionId || category.section || category.Section || category.groupName || category.GroupName || category.parentCategoryId || "Questions") || "Questions").trim();
}

function picksResolvedQuestionLayout_(category) {
  const theme = picksAppearanceTheme_();
  const questions = theme.questions || {};
  const id = String(category && (category.id || category.categoryId) || "");
  const override = questions.overrides && questions.overrides[id];
  const section = picksQuestionSectionKey_(category);
  const sectionOverride = questions.sectionOverrides && questions.sectionOverrides[section];
  const chosen = [override, sectionOverride, questions.defaultLayout].find(function(value){ return value && value !== "inherit"; });
  const original = String(category && category.layoutType || "image").toLowerCase();
  const layout = String(chosen || original || "image").toLowerCase();
  return ["text","compact","image","list","short-answer","wager"].indexOf(layout) !== -1 ? layout : original;
}

function picksAppearanceHexRgba_(hex, opacity, fallback) {
  const value = /^#[0-9a-f]{6}$/i.test(String(hex||"")) ? String(hex) : (fallback || "#0f172a");
  const parsed = parseInt(value.slice(1),16);
  return "rgba("+((parsed>>16)&255)+","+((parsed>>8)&255)+","+(parsed&255)+","+(Number(opacity==null?100:opacity)/100)+")";
}

function picksAppearancePresentation_() {
  const theme = picksAppearanceTheme_();
  if (window.AppearanceThemeRuntime && typeof window.AppearanceThemeRuntime.pagePresentation === "function") {
    return window.AppearanceThemeRuntime.pagePresentation(theme);
  }
  const page = theme.page || {}, q = theme.questions || {}, details = theme.details || {}, bars = theme.bars || {};
  const style = [
    "--picks-theme-page-bg:"+(page.background||"#020617"),
    "--picks-theme-header-bg:"+(page.headerBackground||"#0f172a"),
    "--picks-theme-header-text:"+(page.headerText||"#ffffff"),
    "--picks-theme-header-muted:"+(page.headerMuted||"#94a3b8"),
    "--picks-theme-header-radius:"+(Number(page.headerRadius)||16)+"px",
    "--picks-theme-section-gap:"+(Number(page.sectionGap)||18)+"px",
    "--picks-theme-question-bg:"+picksAppearanceHexRgba_(q.cardBackground,q.cardOpacity,"#0f172a"),
    "--picks-theme-question-header-bg:"+picksAppearanceHexRgba_(q.headerBackground,q.headerOpacity,"#111111"),
    "--picks-theme-question-title:"+(q.titleColor||"#ffffff"),
    "--picks-theme-question-title-size:"+(Number(q.titleSize)||16)+"px",
    "--picks-theme-answer-bg:"+(q.answerBackground||"#1e293b"),
    "--picks-theme-answer-text:"+(q.answerText||"#ffffff"),
    "--picks-theme-answer-border:"+(q.answerBorder||"#334155"),
    "--picks-theme-selected-bg:"+(q.selectedBackground||"#854d0e"),
    "--picks-theme-selected-text:"+(q.selectedText||"#fde68a"),
    "--picks-theme-selected-border:"+(q.selectedBorder||"#facc15"),
    "--picks-theme-question-radius:"+(Number(q.radius)||16)+"px",
    "--picks-theme-question-gap:"+(Number(q.gap)||12)+"px",
    "--picks-theme-text-columns:"+(Number(q.textColumns)||2),
    "--picks-theme-compact-columns:"+(Number(q.compactColumns)||1),
    "--picks-theme-compact-image:"+(Number(q.compactImageSize)||44)+"px",
    "--picks-theme-image-columns:"+(Number(q.imageColumns)||4),
    "--picks-theme-image-aspect:"+String(q.imageAspect||"2/3").replace("/"," / "),
    "--picks-theme-image-fit:"+(q.imageFit||"cover"),
    "--picks-theme-image-overlay:"+(Number(q.imageOverlayOpacity||35)/100),
    "--picks-theme-wager-columns:"+(Number(q.wagerColumns)||2),
    "--picks-theme-details-bg:"+picksAppearanceHexRgba_(details.background,details.opacity,"#0b1220"),
    "--picks-theme-details-text:"+(details.text||"#cbd5e1"),
    "--picks-theme-details-border:"+(details.border||"#334155"),
    "--picks-theme-details-radius:"+(Number(details.radius)||10)+"px",
    "--picks-theme-sort-bg:"+(bars.sortBackground||"#0f172a"),
    "--picks-theme-sort-text:"+(bars.sortText||"#ffffff"),
    "--picks-theme-save-bg:"+(bars.saveBackground||"#2563eb"),
    "--picks-theme-save-text:"+(bars.saveText||"#ffffff"),
    "--picks-theme-bar-radius:"+(Number(bars.buttonRadius)||9)+"px"
  ].join(";");
  return { style: style };
}

function applyPicksAppearanceToPage_() {
  const page = document.querySelector(".picks-page");
  if (!page) return;
  const presentation = picksAppearancePresentation_();
  page.setAttribute("style", presentation.style);
  page.classList.toggle("picks-appearance-active", !!PICKS_PAGE_DATA.appearance);
  page.classList.toggle("picks-theme-image-text-overlay", String(presentation.className || "").split(/\s+/).indexOf("picks-theme-image-text-overlay") !== -1);
}

function renderNomineeButton(
  category,
  nominee,
  selectedNomineeId,
  locked
) {

  const selected =
    normalizeId(nominee.id) ===
    normalizeId(selectedNomineeId);

  const layoutType = picksResolvedQuestionLayout_(category);

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
        class="nominee-choice text-choice ${layoutType === "short-answer" ? "short-answer-choice" : ""} ${selected ? "selected" : ""}"
        onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
        ${disabled}
      >
        ${escapeHtml(nominee.shortAnswer || nominee.name)}
    ${renderNomineeLiveProbability_(category, nominee)}
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

        ${platformImgHtml(nominee.image, { className: "nominee-list-image", variant: "thumb", alt: nominee.name || "Nominee" })}

        <span>
          ${escapeHtml(nominee.name)}
      ${renderNomineeLiveProbability_(category, nominee)}
        </span>

      </button>
    `;

  }

  if (layoutType === "wager") {
    return `
      <button type="button" class="nominee-choice wager-choice ${selected ? "selected" : ""}" onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')" ${disabled}>
        <span>${escapeHtml(nominee.name)}</span>
        <b>${escapeHtml(nominee.odds || nominee.liveOdds || nominee.moneyline || "Pick")}</b>
        ${renderNomineeLiveProbability_(category, nominee)}
      </button>`;
  }

  return `
    <button
      type="button"
      class="nominee-choice image-choice ${selected ? "selected" : ""}"
      onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
      ${disabled}
    >

      ${platformImgHtml(nominee.image, { className: "nominee-card-image", variant: "card", alt: nominee.name || "Nominee" })}

      <span>
        ${escapeHtml(nominee.name)}
      ${renderNomineeLiveProbability_(category, nominee)}
      </span>

    </button>
  `;

}

/* =========================
   PICK ACTIONS
========================= */

async function selectNominee(categoryId, nomineeId) {

  if (PICKS_PENDING_SAVES[categoryId]) {
    showPicksMessage("This pick is already saving…", false);
    return;
  }

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

  const rawMaxChanges = Number(category.maxChanges);
  const maxChanges = Number.isFinite(rawMaxChanges) ? rawMaxChanges : 0;

  if (
    isChange &&
    maxChanges >= 0 &&
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

  const optimisticPreviousPick = previousPick || "";
  const optimisticPreviousConfidence = Number(PICKS_PAGE_DATA.confidencePoints[categoryId]) || 0;
  const optimisticPreviousStake = Number(PICKS_PAGE_DATA.stakePoints[categoryId]) || 0;

  PICKS_PENDING_SAVES[categoryId] = true;
  PICKS_TEMP_OPEN_CATEGORY_ID = categoryId;
  PICKS_PAGE_DATA.picks[categoryId] = nomineeId;
  if (usesConfidencePointsCategory(category)) PICKS_PAGE_DATA.confidencePoints[categoryId] = confidencePoints;
  if (isStakedPointsCategory(category)) PICKS_PAGE_DATA.stakePoints[categoryId] = stakePoints;
  refreshPicksPage();
  showPicksMessage("Saving pick…", false);

  let result;
  try {
    result = await apiSavePick({
      username: session.username,
      gameId: PICKS_PAGE_DATA.gameId,
      categoryId: categoryId,
      nomineeId: nomineeId,
      confidencePoints: confidencePoints,
      stakePoints: stakePoints
    });
  } catch (saveError) {
    result = { success: false, message: saveError && saveError.message ? saveError.message : "Could not save pick." };
  }

  delete PICKS_PENDING_SAVES[categoryId];

  console.log("SAVE PICK RESULT", result);

  if (!result || !result.success) {
    if (optimisticPreviousPick) PICKS_PAGE_DATA.picks[categoryId] = optimisticPreviousPick;
    else delete PICKS_PAGE_DATA.picks[categoryId];
    PICKS_PAGE_DATA.confidencePoints[categoryId] = optimisticPreviousConfidence;
    PICKS_PAGE_DATA.stakePoints[categoryId] = optimisticPreviousStake;
    PICKS_TEMP_OPEN_CATEGORY_ID = "";
    refreshPicksPage();
    showPicksMessage((result && result.message) || "Could not save pick.", true);
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

  PICKS_TEMP_OPEN_CATEGORY_ID = categoryId;
  refreshPicksPage();

  showPicksMessage("Pick saved.", false);
  scheduleRealityTvPickAutoAdvance_(categoryId);

}

function scheduleRealityTvPickAutoAdvance_(categoryId) {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  if (view.enabled !== true) {
    PICKS_TEMP_OPEN_CATEGORY_ID = "";
    refreshPicksPage();
    return;
  }
  if (PICKS_AUTO_ADVANCE_TIMER) clearTimeout(PICKS_AUTO_ADVANCE_TIMER);

  requestAnimationFrame(function() {
    const savedCard = document.querySelector('[data-category-id="' + cssEscape(categoryId) + '"]');
    if (savedCard) savedCard.classList.remove("collapsed");
  });

  PICKS_AUTO_ADVANCE_TIMER = setTimeout(function() {
    PICKS_TEMP_OPEN_CATEGORY_ID = "";
    const current = document.querySelector('[data-category-id="' + cssEscape(categoryId) + '"]');
    if (current) {
      current.classList.add("collapsed");
      const currentHeader = current.querySelector(".pick-card-header");
      if (currentHeader) currentHeader.setAttribute("aria-expanded", "false");
    }

    const cards = Array.from(document.querySelectorAll(".pick-category-card[data-category-id]"));
    const currentIndex = cards.findIndex(function(card) {
      return normalizeId(card.dataset.categoryId) === normalizeId(categoryId);
    });
    if (currentIndex < 0) return;

    let next = cards.slice(currentIndex + 1).find(function(card) {
      return card.dataset.locked !== "true" && card.dataset.hasPick !== "true";
    });
    if (!next) {
      next = cards.slice(0, currentIndex).find(function(card) {
        return card.dataset.locked !== "true" && card.dataset.hasPick !== "true";
      });
    }
    if (!next) return;

    const episode = next.closest("details.reality-episode-picks-section");
    if (episode) episode.open = true;
    next.classList.remove("collapsed");
    const nextHeader = next.querySelector(".pick-card-header");
    if (nextHeader) nextHeader.setAttribute("aria-expanded", "true");
    setTimeout(function() {
      next.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, 1500);
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
  const header = card.querySelector(".pick-card-header");
  if (header) header.setAttribute("aria-expanded", card.classList.contains("collapsed") ? "false" : "true");

}

/* =========================
   MOUNT / COUNTDOWN
========================= */

function picksEnhancementKey_() {
  const session = PICKS_PAGE_DATA.session || {};
  return String(PICKS_PAGE_DATA.gameId || "") + "::" + String(session.username || "");
}

function refreshPicksEnhancementUi_() {
  const summaryMount = document.getElementById("realityTvPlayerSummaryMount");
  if (summaryMount) summaryMount.innerHTML = renderRealityTvPlayerSummary_();

  const anchorMount = document.getElementById("seasonAnchorPickMount");
  if (anchorMount) anchorMount.innerHTML = renderSeasonAnchorPickCard_();

  const comparisonMount = document.getElementById("realityTvEpisodeComparisonMount");
  if (comparisonMount) comparisonMount.innerHTML = renderRealityTvEpisodeComparison_();

  if (window.PlatformImageEngine) {
    if (anchorMount) window.PlatformImageEngine.process(anchorMount);
    if (comparisonMount) window.PlatformImageEngine.process(comparisonMount);
  }

  const categoryMap = realityTvEpisodeCategoryMap_();
  (PICKS_PAGE_DATA.realityTvView && PICKS_PAGE_DATA.realityTvView.episodes || []).forEach(function(episode) {
    const episodeNumber = Number(episode.episodeNumber || 0);
    const items = (PICKS_PAGE_DATA.categories || []).filter(function(category) {
      return Number(categoryMap[normalizeId(category.id)] || 0) === episodeNumber;
    });
    const picked = items.filter(function(item) { return !!PICKS_PAGE_DATA.picks[item.id]; }).length;
    const current = document.querySelector('[data-reality-episode-stats="' + episodeNumber + '"]');
    if (!current) return;
    const holder = document.createElement("div");
    holder.innerHTML = realityTvEpisodeHeaderStats_(episode, items.length, picked);
    const replacement = holder.firstElementChild;
    if (replacement) current.replaceWith(replacement);
  });
  updateCountdowns();
}

async function hydratePicksEnhancements_() {
  const view = PICKS_PAGE_DATA.realityTvView || {};
  if (view.enabled !== true) return;

  const key = picksEnhancementKey_();
  if (PICKS_ENHANCEMENTS_REQUEST && PICKS_ENHANCEMENTS_REQUEST.key === key) {
    return PICKS_ENHANCEMENTS_REQUEST.promise;
  }

  const promise = (async function() {
    const cached = PICKS_ENHANCEMENTS_CACHE[key] || {};

    // The pinned Season Survivor feature is visually above the questions, so load
    // it before the heavier weekly leaderboard/statistics request.
    if (!cached.seasonAnchor && (!PICKS_PAGE_DATA.seasonAnchor || PICKS_PAGE_DATA.seasonAnchor.deferred === true)) {
      try {
        const response = await apiGetSeasonAnchor(PICKS_PAGE_DATA.gameId);
        if (response && response.success !== false && response.seasonAnchor) {
          cached.seasonAnchor = response.seasonAnchor;
          PICKS_PAGE_DATA.seasonAnchor = response.seasonAnchor;
          refreshPicksEnhancementUi_();
        }
      } catch (error) {
        console.warn("Season Survivor details loaded later or were skipped:", error);
      }
    }

    if (!cached.episodeComparison) {
      try {
        const response = await apiGetRealityTvEpisodeComparison(PICKS_PAGE_DATA.gameId);
        if (response && response.success !== false && response.comparison) {
          cached.episodeComparison = response.comparison;
          PICKS_PAGE_DATA.episodeComparison = response.comparison;
          refreshPicksEnhancementUi_();
        }
      } catch (error) {
        console.warn("Locked Reality TV episode comparison loaded later or was skipped:", error);
      }
    }

    if (!cached.playerStats && (!view.playerStats || view.playerStatsDeferred === true)) {
      try {
        const response = await apiGetRealityTvPlayerStats(PICKS_PAGE_DATA.gameId);
        if (response && response.success !== false && response.playerStats) {
          cached.playerStats = response.playerStats;
          if (PICKS_PAGE_DATA.realityTvView) {
            PICKS_PAGE_DATA.realityTvView.playerStats = response.playerStats;
            PICKS_PAGE_DATA.realityTvView.playerStatsDeferred = false;
          }
          refreshPicksEnhancementUi_();
        }
      } catch (error) {
        console.warn("Reality TV player statistics loaded later or were skipped:", error);
      }
    }

    PICKS_ENHANCEMENTS_CACHE[key] = cached;
    refreshPicksEnhancementUi_();
  })();

  PICKS_ENHANCEMENTS_REQUEST = { key: key, promise: promise };
  try {
    await promise;
  } finally {
    if (PICKS_ENHANCEMENTS_REQUEST && PICKS_ENHANCEMENTS_REQUEST.key === key) {
      PICKS_ENHANCEMENTS_REQUEST = null;
    }
  }
}

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

  applyPicksAppearanceToPage_();

  // Optional Reality TV statistics and Season Survivor details load after
  // the core questions and saved picks are already usable.
  hydratePicksEnhancements_();

  // Confidence games keep the same dense weekly card in pregame, live, and final states.
  mountConfidenceLiveSports_();
  hydrateConfidenceAppearance_();

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

  if (realityTvWinnerIds_(category).length) {
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

  const winners = realityTvWinnerIds_(category);

  const pick =
    normalizeId(selectedNomineeId);

  if (!winners.length || !pick) {
    return {
      label: "Pending",
      className: "pending",
      icon: ""
    };
  }

  if (winners.indexOf(pick) !== -1) {
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

function getWinnerNominees(category) {

  const winnerIds = realityTvWinnerIds_(category);

  if (!winnerIds.length) {
    return [];
  }

  return (category.nominees || []).filter(function(nominee) {
    return winnerIds.indexOf(normalizeId(nominee.id)) !== -1;
  });

}

function getWinnerNominee(category) {
  return getWinnerNominees(category)[0] || null;
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

  const winnerNominees = getWinnerNominees(category);
  const hasWinner = winnerNominees.length > 0;

  if (!hasWinner) {

    if (locked) {
      return "Locked";
    }

    if (selectedNominee) {
      const rawMaxChanges = Number(category && category.maxChanges);
      const maxChanges = Number.isFinite(rawMaxChanges) ? rawMaxChanges : 0;
      const changeCount = Number(PICKS_PAGE_DATA.changeCounts && PICKS_PAGE_DATA.changeCounts[category.id]) || 0;
      if (maxChanges < 0) {
        return "Pick saved · Tap to change until lock ↓";
      }
      if (changeCount < maxChanges) {
        const left = Math.max(maxChanges - changeCount, 0);
        return "Pick saved · " + left + " change" + (left === 1 ? "" : "s") + " left · Tap to change ↓";
      }
      return "Pick saved · No changes remaining";
    }

    return "Make Pick Now ↓";

  }

  if (status.className === "correct") {
    return winnerNominees.length > 1
      ? "Correct — " + winnerNominees.map(function(item) { return item.name; }).join(", ")
      : "Winner";
  }

  return winnerNominees.map(function(item) { return item.name; }).join(", ");

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

  const layout = picksResolvedQuestionLayout_(category);

  if (
    layout === "text" ||
    layout === "short-answer"
  ) {
    return "nominee-layout nominee-layout-text";
  }

  if (layout === "compact" || layout === "list") return "nominee-layout nominee-layout-list nominee-layout-" + layout;
  if (layout === "wager") return "nominee-layout nominee-layout-wager";

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
