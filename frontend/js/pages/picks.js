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
  realityTvView: null
};

let PICKS_COUNTDOWN_TIMER = null;
let PICKS_ENHANCEMENTS_REQUEST = null;
const PICKS_ENHANCEMENTS_CACHE = {};
const PICKS_PENDING_SAVES = {};
let PICKS_AUTO_ADVANCE_TIMER = null;
let PICKS_TEMP_OPEN_CATEGORY_ID = "";
let PICKS_SEASON_ANCHOR_DRAFT_ID = "";


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
      class="pick-category-card ${collapsedClass} ${childClass} ${status.className} ${savingClass}"
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

        ${platformImgHtml(nominee.image, { className: "nominee-list-image", variant: "thumb", alt: nominee.name || "Nominee" })}

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

      ${platformImgHtml(nominee.image, { className: "nominee-card-image", variant: "card", alt: nominee.name || "Nominee" })}

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

  // Optional Reality TV statistics and Season Survivor details load after
  // the core questions and saved picks are already usable.
  hydratePicksEnhancements_();

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