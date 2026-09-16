/* =========================================================
   PATTC Reality TV R5.3 targeted desktop correction
   Baseline: 4fea38361d05dcf7a66f84094981f4d7bf0d54c3

   Small Reality-only layer loaded after pages/picks.js.
   Native <details>/<summary> controls are intentionally left to the browser.
   ========================================================= */
(function(global) {
  let observer = null;
  let mountQueued = false;
  let resizeBound = false;
  let comparePatched = false;
  let currentEpisodeOpen = true;
  let castIndex = null;
  let castSignature = "";
  const ORIGINALS = Object.create(null);
  const STYLE_ID = "pattc-reality-r53-targeted-style";

  const CSS = `
/* Current Episode keeps the accepted direct header-button behavior. */
.reality-player-page.reality-clean-enhanced .reality-current-question-heading{
  position:relative!important;
}
.reality-player-page.reality-clean-enhanced .reality-r53-current-toggle{
  position:absolute!important;
  inset:0!important;
  z-index:5!important;
  width:100%!important;
  height:100%!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  cursor:pointer!important;
  touch-action:manipulation!important;
}
.reality-player-page.reality-clean-enhanced .reality-r53-current-toggle:focus-visible{
  outline:2px solid currentColor!important;
  outline-offset:-3px!important;
  border-radius:inherit!important;
}

/* Season Cast uses an index-driven visible window. No horizontal scrolling. */
.reality-player-page.reality-clean-enhanced .reality-r53-cast-controls{
  display:grid!important;
  grid-template-columns:minmax(92px,auto) 1fr minmax(92px,auto)!important;
  align-items:center!important;
  gap:8px!important;
  padding:7px 8px 5px!important;
}
.reality-player-page.reality-clean-enhanced .reality-r53-cast-controls small{
  min-width:0!important;
  text-align:center!important;
  color:#94a3b8!important;
  font-size:.67rem!important;
  line-height:1.15!important;
}
.reality-player-page.reality-clean-enhanced .reality-r53-cast-arrow{
  min-height:36px!important;
  border:1px solid rgba(148,163,184,.28)!important;
  border-radius:7px!important;
  background:rgba(15,23,42,.88)!important;
  color:#f8fafc!important;
  font-weight:900!important;
  cursor:pointer!important;
  touch-action:manipulation!important;
}
.reality-player-page.reality-clean-enhanced .reality-r53-cast-arrow:disabled{
  opacity:.38!important;
  cursor:default!important;
}
.reality-player-page.reality-clean-enhanced .reality-clean-cast-rail{
  --reality-r53-cast-visible:4;
  display:grid!important;
  grid-template-columns:repeat(var(--reality-r53-cast-visible),minmax(0,1fr))!important;
  gap:8px!important;
  width:100%!important;
  max-width:100%!important;
  overflow:hidden!important;
  scroll-snap-type:none!important;
}
.reality-player-page.reality-clean-enhanced .reality-clean-cast-card{
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
  margin:0!important;
  scroll-snap-align:none!important;
}
.reality-player-page.reality-clean-enhanced .reality-clean-cast-card[hidden]{
  display:none!important;
}

/* Compare keeps full width with the question/current-user columns frozen. */
.reality-player-page.reality-clean-enhanced .reality-standings-compare-body,
.reality-player-page.reality-clean-enhanced .reality-standings-compare-panel,
.reality-player-page.reality-clean-enhanced .reality-compare-matrix-wrap{
  width:100%!important;
  max-width:none!important;
  box-sizing:border-box!important;
}
.reality-player-page.reality-clean-enhanced .reality-standings-compare-body{
  padding-left:0!important;
  padding-right:0!important;
}
.reality-player-page.reality-clean-enhanced .reality-standings-compare-tabs,
.reality-player-page.reality-clean-enhanced .reality-compare-matrix-wrap{
  margin-left:0!important;
  margin-right:0!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-matrix-wrap{
  overflow-x:auto!important;
  overscroll-behavior-x:contain!important;
  -webkit-overflow-scrolling:touch!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-matrix{
  --reality-r53-label-width:92px;
  --reality-r53-player-width:104px;
  grid-template-columns:var(--reality-r53-label-width) repeat(var(--reality-compare-players),minmax(var(--reality-r53-player-width),1fr))!important;
  min-width:max-content!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-question-label{
  position:sticky!important;
  left:0!important;
  z-index:7!important;
  width:var(--reality-r53-label-width)!important;
  box-sizing:border-box!important;
  background:#091425!important;
  box-shadow:1px 0 0 rgba(148,163,184,.16)!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-grid-cell.is-current-reference{
  position:sticky!important;
  left:var(--reality-r53-label-width)!important;
  z-index:6!important;
  background:#07111f!important;
  box-shadow:1px 0 0 rgba(96,165,250,.22),-1px 0 0 rgba(148,163,184,.08)!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-player-column-head.is-current-reference{
  z-index:9!important;
  background:#0a1a2f!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-question-label.is-heading{
  z-index:10!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-player-column-head{
  min-width:var(--reality-r53-player-width)!important;
  min-height:52px!important;
  padding:5px 4px!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-user-head{
  position:relative!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:1px!important;
  min-height:42px!important;
  padding:0 18px!important;
  text-align:center!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-user-head strong,
.reality-player-page.reality-clean-enhanced .reality-compare-user-head span,
.reality-player-page.reality-clean-enhanced .reality-compare-user-head small{
  display:block!important;
  width:100%!important;
  text-align:center!important;
  white-space:normal!important;
  overflow-wrap:anywhere!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-user-head strong{
  font-size:.62rem!important;
  line-height:1.08!important;
  font-weight:950!important;
  color:#fff!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-user-head span{
  font-size:.55rem!important;
  line-height:1.08!important;
  font-weight:850!important;
  color:#cbd5e1!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-user-head small{
  font-size:.50rem!important;
  line-height:1.08!important;
  font-weight:800!important;
  color:#7dd3fc!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-remove-user{
  position:absolute!important;
  top:0!important;
  right:0!important;
}

@media(max-width:760px){
  .reality-player-page.reality-clean-enhanced .reality-r53-cast-controls{
    grid-template-columns:minmax(82px,auto) 1fr minmax(82px,auto)!important;
    gap:5px!important;
    padding:6px!important;
  }
  .reality-player-page.reality-clean-enhanced .reality-clean-cast-rail{
    --reality-r53-cast-visible:2;
    gap:6px!important;
  }
  .reality-player-page.reality-clean-enhanced .reality-compare-matrix{
    --reality-r53-label-width:82px;
    --reality-r53-player-width:100px;
  }
  .reality-player-page.reality-clean-enhanced .reality-compare-user-head{
    padding:0 15px!important;
  }
}
`;

  function hasDom_() {
    return typeof document !== "undefined" && document && typeof document.querySelector === "function";
  }

  function key_(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function clamp_(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function nextCastIndex_(currentIndex, count, direction) {
    count = Math.max(0, Number(count || 0));
    if (!count) return -1;
    const current = clamp_(Number(currentIndex || 0), 0, count - 1);
    const step = direction === "prev" || Number(direction) < 0 ? -1 : 1;
    return clamp_(current + step, 0, count - 1);
  }

  function castWindow_(activeIndex, count, visibleCount) {
    count = Math.max(0, Number(count || 0));
    if (!count) return { active: -1, start: 0, end: 0, visible: 0 };
    const visible = clamp_(Number(visibleCount || 1), 1, count);
    const active = clamp_(Number(activeIndex || 0), 0, count - 1);
    let start = active - Math.floor((visible - 1) / 2);
    start = clamp_(start, 0, Math.max(0, count - visible));
    return { active: active, start: start, end: start + visible, visible: visible };
  }

  function applyCastWindow_(cards, activeIndex, visibleCount) {
    cards = Array.isArray(cards) ? cards : [];
    const windowState = castWindow_(activeIndex, cards.length, visibleCount);
    cards.forEach(function(card, index) {
      const shown = index >= windowState.start && index < windowState.end;
      card.hidden = !shown;
      if (card.classList && typeof card.classList.toggle === "function") {
        card.classList.toggle("is-reality-r53-active", index === windowState.active);
      }
      if (typeof card.setAttribute === "function") {
        if (index === windowState.active) card.setAttribute("aria-current", "true");
        else if (typeof card.removeAttribute === "function") card.removeAttribute("aria-current");
      }
    });
    return windowState;
  }

  function currentCompareKeyFromData_(compareRows, standingsRows, sessionUsername) {
    compareRows = Array.isArray(compareRows) ? compareRows : [];
    standingsRows = Array.isArray(standingsRows) ? standingsRows : [];
    const sessionKey = key_(sessionUsername);
    const standingBySession = sessionKey ? standingsRows.find(function(row) {
      return row && key_(row.username) === sessionKey;
    }) : null;
    const standingCurrent = standingBySession || standingsRows.find(function(row) {
      return row && row.isCurrent === true;
    });
    const standingKey = key_(standingCurrent && standingCurrent.username);
    if (standingKey) return standingKey;
    const compareBySession = sessionKey ? compareRows.find(function(row) {
      return row && key_(row.username || row.displayName || row.name) === sessionKey;
    }) : null;
    const compareCurrent = compareBySession || compareRows.find(function(row) {
      return row && row.isCurrent === true;
    });
    return key_(compareCurrent && (compareCurrent.username || compareCurrent.displayName || compareCurrent.name)) || sessionKey;
  }

  function orderedCompareKeys_(validKeys, currentKey, existingKeys, initialized) {
    validKeys = (Array.isArray(validKeys) ? validKeys : []).map(key_).filter(Boolean);
    const valid = Object.create(null);
    validKeys.forEach(function(item) { valid[item] = true; });
    currentKey = key_(currentKey);
    const ordered = [];
    if (currentKey && valid[currentKey]) ordered.push(currentKey);
    if (initialized === true) {
      (Array.isArray(existingKeys) ? existingKeys : []).map(key_).forEach(function(item) {
        if (item && item !== currentKey && valid[item] && ordered.indexOf(item) === -1) ordered.push(item);
      });
    }
    return ordered;
  }

  function injectStyle_() {
    if (!hasDom_() || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function realityEnabled_() {
    try {
      return typeof PICKS_PAGE_DATA !== "undefined" &&
        PICKS_PAGE_DATA && PICKS_PAGE_DATA.realityTvView &&
        PICKS_PAGE_DATA.realityTvView.enabled === true;
    } catch (err) {
      return false;
    }
  }

  function mountCurrentEpisode_(page) {
    const section = page && page.querySelector ? page.querySelector(".reality-episode-picks-section.current") : null;
    if (!section) return;
    const heading = section.querySelector(".reality-current-question-heading");
    const body = section.querySelector(".reality-episode-picks-body");
    if (!heading || !body) return;

    let button = heading.querySelector(":scope > .reality-r53-current-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "reality-r53-current-toggle";
      heading.appendChild(button);
    }
    body.hidden = !currentEpisodeOpen;
    button.setAttribute("aria-expanded", currentEpisodeOpen ? "true" : "false");
    button.setAttribute("aria-label", (currentEpisodeOpen ? "Collapse " : "Expand ") + "Current Episode");
    if (button.dataset.realityR53Bound === "true") return;
    button.dataset.realityR53Bound = "true";
    button.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      currentEpisodeOpen = !currentEpisodeOpen;
      body.hidden = !currentEpisodeOpen;
      button.setAttribute("aria-expanded", currentEpisodeOpen ? "true" : "false");
      button.setAttribute("aria-label", (currentEpisodeOpen ? "Collapse " : "Expand ") + "Current Episode");
    });
  }

  function castCards_(rail) {
    return rail ? Array.from(rail.querySelectorAll(".reality-clean-cast-card")) : [];
  }

  function castVisibleCount_() {
    try {
      if (global.matchMedia && global.matchMedia("(max-width: 760px)").matches) return 2;
    } catch (err) {}
    return 4;
  }

  function castSignatureFor_(cards) {
    return cards.map(function(card, index) {
      if (!card) return String(index);
      return String(card.getAttribute && (card.getAttribute("data-reality-contestant-id") || card.getAttribute("aria-label")) || index);
    }).join("|");
  }

  function initialCastIndex_(cards) {
    if (!cards.length) return -1;
    const latest = cards.findIndex(function(card) {
      return card && card.getAttribute && card.getAttribute("data-reality-latest-eliminated") === "true";
    });
    return latest >= 0 ? latest : 0;
  }

  function updateCast_(section) {
    if (!section) return -1;
    const rail = section.querySelector(".reality-clean-cast-rail");
    const controls = section.querySelector(".reality-r53-cast-controls");
    if (!rail || !controls) return -1;
    const cards = castCards_(rail);
    if (!cards.length) return -1;
    const signature = castSignatureFor_(cards);
    if (signature !== castSignature || castIndex === null) {
      castSignature = signature;
      castIndex = initialCastIndex_(cards);
    }
    castIndex = clamp_(Number(castIndex || 0), 0, cards.length - 1);
    const visibleCount = castVisibleCount_();
    rail.style.setProperty("--reality-r53-cast-visible", String(Math.min(visibleCount, cards.length)));
    const windowState = applyCastWindow_(cards, castIndex, visibleCount);
    const prev = controls.querySelector('[data-reality-r53-cast="prev"]');
    const next = controls.querySelector('[data-reality-r53-cast="next"]');
    if (prev) prev.disabled = castIndex <= 0;
    if (next) next.disabled = castIndex >= cards.length - 1;
    const status = controls.querySelector("[data-reality-r53-cast-status]");
    if (status) status.textContent = "Contestant " + (windowState.active + 1) + " of " + cards.length;
    return castIndex;
  }

  function stepCast_(section, direction) {
    if (!section) return -1;
    const rail = section.querySelector(".reality-clean-cast-rail");
    const cards = castCards_(rail);
    if (!cards.length) return -1;
    if (castIndex === null) castIndex = initialCastIndex_(cards);
    castIndex = nextCastIndex_(castIndex, cards.length, direction);
    updateCast_(section);
    return castIndex;
  }

  function mountCast_(page) {
    const section = page && page.querySelector ? page.querySelector("#realityEnhancedCleanCast.reality-clean-cast-section") : null;
    if (!section) return;
    const rail = section.querySelector(".reality-clean-cast-rail");
    const heading = section.querySelector(".reality-clean-section-heading");
    if (!rail || !heading) return;

    let controls = section.querySelector(".reality-r53-cast-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "reality-r53-cast-controls";
      controls.setAttribute("aria-label", "Season Cast navigation");
      controls.innerHTML = '<button type="button" class="reality-r53-cast-arrow" data-reality-r53-cast="prev" aria-label="Previous contestant">‹ Previous</button>' +
        '<small><span data-reality-r53-cast-status></span><br>Use the arrows to browse</small>' +
        '<button type="button" class="reality-r53-cast-arrow" data-reality-r53-cast="next" aria-label="Next contestant">Next ›</button>';
      rail.parentNode.insertBefore(controls, rail);
    }

    const hint = heading.querySelector("small");
    if (hint && hint.dataset.realityR53Hint !== "true") {
      hint.textContent = "Use Previous / Next to browse every contestant";
      hint.dataset.realityR53Hint = "true";
    }

    controls.querySelectorAll("[data-reality-r53-cast]").forEach(function(button) {
      if (button.dataset.realityR53Bound === "true") return;
      button.dataset.realityR53Bound = "true";
      button.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        stepCast_(section, button.getAttribute("data-reality-r53-cast"));
      });
    });

    updateCast_(section);
  }

  function currentCompareKey_() {
    let compareRows = [];
    let standingsRows = [];
    let sessionUsername = "";
    try {
      const comparison = PICKS_PAGE_DATA.episodeComparison || {};
      const view = PICKS_PAGE_DATA.realityTvView || {};
      compareRows = Array.isArray(comparison.rows) ? comparison.rows : [];
      standingsRows = view.playerStats && Array.isArray(view.playerStats.compactLeaderboard)
        ? view.playerStats.compactLeaderboard : [];
      sessionUsername = PICKS_PAGE_DATA.session && PICKS_PAGE_DATA.session.username || "";
    } catch (err) {}
    return currentCompareKeyFromData_(compareRows, standingsRows, sessionUsername);
  }

  function selectedRowsReplacement_(rows, standingsRows) {
    rows = Array.isArray(rows) ? rows : [];
    standingsRows = Array.isArray(standingsRows) ? standingsRows : [];
    const rowByKey = Object.create(null);
    rows.forEach(function(row) {
      const k = key_(row && (row.username || row.displayName || row.name));
      if (k) rowByKey[k] = row;
    });
    const validKeys = Object.keys(rowByKey);
    let existing = [];
    let initialized = false;
    try {
      existing = Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS.slice() : [];
      initialized = PICKS_REALITY_COMPARE_USERS_INITIALIZED === true;
    } catch (err) {}
    let sessionUsername = "";
    try { sessionUsername = PICKS_PAGE_DATA.session && PICKS_PAGE_DATA.session.username || ""; } catch (err) {}
    const currentKey = currentCompareKeyFromData_(rows, standingsRows, sessionUsername);
    const ordered = orderedCompareKeys_(validKeys, currentKey, existing, initialized);
    try {
      PICKS_REALITY_COMPARE_USER_KEYS = ordered;
      PICKS_REALITY_COMPARE_USERS_INITIALIZED = true;
    } catch (err) {}
    return ordered.map(function(k) { return rowByKey[k]; }).filter(Boolean);
  }

  function captureCompareUi_() {
    const state = { open: false, scrollLeft: 0 };
    if (!hasDom_()) return state;
    const mount = document.getElementById("realityTvEpisodeComparisonMount");
    const shell = mount && mount.querySelector(".reality-standings-compare-shell");
    const wrap = mount && mount.querySelector(".reality-compare-matrix-wrap");
    if (shell) state.open = shell.open === true;
    if (wrap) state.scrollLeft = Number(wrap.scrollLeft || 0);
    return state;
  }

  function restoreCompareUi_(state) {
    state = state || {};
    if (!hasDom_()) return;
    const mount = document.getElementById("realityTvEpisodeComparisonMount");
    if (!mount) return;
    const shell = mount.querySelector(".reality-standings-compare-shell");
    const wrap = mount.querySelector(".reality-compare-matrix-wrap");
    if (shell) shell.open = state.open === true;
    if (wrap) wrap.scrollLeft = Math.max(0, Number(state.scrollLeft || 0));
  }

  function rerenderCompare_(state) {
    if (!hasDom_()) return;
    const mount = document.getElementById("realityTvEpisodeComparisonMount");
    if (!mount || typeof renderRealityTvEpisodeComparison_ !== "function") return;
    mount.innerHTML = renderRealityTvEpisodeComparison_();
    decorateCompare_(mount.closest(".reality-player-page") || document);
    restoreCompareUi_(state);
  }

  function addCompareUserStable_(userKey) {
    const user = key_(userKey);
    const current = currentCompareKey_();
    if (!user || user === current) return;
    const state = captureCompareUi_();
    try {
      PICKS_REALITY_COMPARE_USERS_INITIALIZED = true;
      const existing = Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS.map(key_) : [];
      const next = current ? [current] : [];
      existing.forEach(function(item) {
        if (item && item !== current && next.indexOf(item) === -1) next.push(item);
      });
      if (next.indexOf(user) === -1) next.push(user);
      PICKS_REALITY_COMPARE_USER_KEYS = next;
      PICKS_REALITY_STANDINGS_COMPARE_TAB = "compare";
    } catch (err) {}
    state.open = true;
    rerenderCompare_(state);
  }

  function removeCompareUserStable_(userKey) {
    const user = key_(userKey);
    const current = currentCompareKey_();
    if (!user || user === current) return;
    const state = captureCompareUi_();
    try {
      PICKS_REALITY_COMPARE_USERS_INITIALIZED = true;
      PICKS_REALITY_COMPARE_USER_KEYS = (Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS : [])
        .map(key_)
        .filter(function(item) { return item && item !== user; });
      if (current && PICKS_REALITY_COMPARE_USER_KEYS.indexOf(current) === -1) PICKS_REALITY_COMPARE_USER_KEYS.unshift(current);
      PICKS_REALITY_STANDINGS_COMPARE_TAB = "compare";
    } catch (err) {}
    state.open = true;
    rerenderCompare_(state);
  }

  function setCompareTabStable_(tab) {
    const state = captureCompareUi_();
    try { PICKS_REALITY_STANDINGS_COMPARE_TAB = tab === "compare" ? "compare" : "standings"; } catch (err) {}
    state.open = true;
    rerenderCompare_(state);
  }

  async function selectCompareEpisodeStable_(episodeId) {
    const state = captureCompareUi_();
    state.open = true;
    try { PICKS_REALITY_STANDINGS_COMPARE_TAB = "compare"; } catch (err) {}
    if (typeof ORIGINALS.selectEpisode === "function") {
      await ORIGINALS.selectEpisode.call(global, episodeId);
    }
    try { PICKS_REALITY_STANDINGS_COMPARE_TAB = "compare"; } catch (err) {}
    decorateCompare_(document.querySelector(".reality-player-page") || document);
    restoreCompareUi_(state);
  }

  function installComparePatch_() {
    if (comparePatched) return;
    try {
      if (typeof realityTvCompareSelectedRows_ !== "function") return;
      ORIGINALS.selectEpisode = typeof selectRealityTvComparisonEpisode_ === "function" ? selectRealityTvComparisonEpisode_ : null;
      realityTvCompareSelectedRows_ = selectedRowsReplacement_;
      addRealityTvCompareUser_ = addCompareUserStable_;
      removeRealityTvCompareUser_ = removeCompareUserStable_;
      setRealityTvStandingsCompareTab_ = setCompareTabStable_;
      selectRealityTvComparisonEpisode_ = selectCompareEpisodeStable_;
      comparePatched = true;
    } catch (err) {
      comparePatched = false;
    }
  }

  function compareDataByKey_() {
    const byKey = Object.create(null);
    const standings = Object.create(null);
    try {
      const comparison = PICKS_PAGE_DATA.episodeComparison || {};
      const view = PICKS_PAGE_DATA.realityTvView || {};
      (Array.isArray(comparison.rows) ? comparison.rows : []).forEach(function(row) {
        const k = key_(row && (row.username || row.displayName || row.name));
        if (k) byKey[k] = row;
      });
      (view.playerStats && Array.isArray(view.playerStats.compactLeaderboard) ? view.playerStats.compactLeaderboard : []).forEach(function(row) {
        const k = key_(row && row.username);
        if (k) standings[k] = row;
      });
    } catch (err) {}
    return { rows: byKey, standings: standings };
  }

  function formatPoints_(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return "0";
    return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function makeCompareHead_(head, userKey, isCurrent) {
    const data = compareDataByKey_();
    const row = data.rows[userKey] || {};
    const standing = data.standings[userKey] || {};
    const displayName = String(row.displayName || row.username || standing.displayName || standing.username || userKey || "Player");
    const total = Number(row.totalPoints !== undefined ? row.totalPoints : row.total !== undefined ? row.total : standing.total || 0);
    const rank = Number(row.rank || standing.rank || 0);
    const fingerprint = [userKey, isCurrent === true ? "current" : "extra", displayName, total, rank].join("|");
    head.classList.toggle("is-current-reference", isCurrent === true);
    if (head.dataset.realityR53HeadFingerprint === fingerprint && head.querySelector(".reality-compare-user-head")) return;
    head.dataset.realityR53HeadFingerprint = fingerprint;
    head.textContent = "";
    const wrapper = document.createElement("div");
    wrapper.className = "reality-compare-user-head";
    const name = document.createElement("strong");
    name.textContent = displayName;
    const points = document.createElement("span");
    points.textContent = formatPoints_(total) + " pts";
    const rankLine = document.createElement("small");
    rankLine.textContent = rank ? "Rank #" + rank : "Rank —";
    wrapper.appendChild(name);
    wrapper.appendChild(points);
    wrapper.appendChild(rankLine);
    if (!isCurrent) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "reality-compare-remove-user";
      remove.setAttribute("aria-label", "Remove " + displayName + " from comparison");
      remove.textContent = "×";
      remove.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        removeCompareUserStable_(userKey);
      });
      wrapper.appendChild(remove);
    }
    head.appendChild(wrapper);
  }

  function decorateCompare_(page) {
    const mount = page && page.querySelector ? page.querySelector("#realityTvEpisodeComparisonMount") : null;
    if (!mount) return;
    const currentKey = currentCompareKey_();
    let selectedKeys = [];
    try { selectedKeys = Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS.map(key_).filter(Boolean) : []; } catch (err) {}
    if (currentKey && selectedKeys.indexOf(currentKey) === -1) selectedKeys.unshift(currentKey);

    const heads = Array.from(mount.querySelectorAll(".reality-compare-player-column-head"));
    heads.forEach(function(head, index) {
      const userKey = selectedKeys[index] || "";
      if (userKey) makeCompareHead_(head, userKey, index === 0 && userKey === currentKey);
    });

    mount.querySelectorAll(".reality-compare-question-label").forEach(function(label) {
      const currentCell = label.nextElementSibling;
      if (currentCell && currentCell.classList && currentCell.classList.contains("reality-compare-grid-cell")) {
        currentCell.classList.add("is-current-reference");
      }
    });

    const addSelect = mount.querySelector(".reality-compare-add-user select");
    if (addSelect && currentKey) {
      Array.from(addSelect.options || []).forEach(function(option) {
        if (key_(option.value) === currentKey) option.remove();
      });
    }
  }

  function mount_() {
    mountQueued = false;
    if (!hasDom_()) return;
    installComparePatch_();
    injectStyle_();
    if (!realityEnabled_()) return;
    const page = document.querySelector(".reality-player-page.reality-clean-enhanced, .reality-player-page");
    if (!page) return;
    mountCurrentEpisode_(page);
    mountCast_(page);
    decorateCompare_(page);
  }

  function scheduleMount_() {
    if (mountQueued) return;
    mountQueued = true;
    if (typeof global.requestAnimationFrame === "function") global.requestAnimationFrame(mount_);
    else if (typeof global.setTimeout === "function") global.setTimeout(mount_, 0);
    else mount_();
  }

  function start_() {
    if (!hasDom_()) return;
    installComparePatch_();
    injectStyle_();
    scheduleMount_();
    if (!observer && typeof MutationObserver !== "undefined") {
      const root = document.getElementById("app") || document.body;
      if (root) {
        observer = new MutationObserver(function() { scheduleMount_(); });
        observer.observe(root, { childList: true, subtree: true });
      }
    }
    if (!resizeBound && global.addEventListener) {
      resizeBound = true;
      global.addEventListener("resize", scheduleMount_);
    }
  }

  const api = {
    version: "reality-r5.3-targeted-2",
    css: CSS,
    nextCastIndex: nextCastIndex_,
    castWindow: castWindow_,
    applyCastWindow: applyCastWindow_,
    currentCompareKeyFromData: currentCompareKeyFromData_,
    orderedCompareKeys: orderedCompareKeys_,
    captureCompareUi: captureCompareUi_,
    restoreCompareUi: restoreCompareUi_,
    mount: mount_,
    start: start_
  };

  global.PATTCRealityR53Deterministic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  start_();
})(typeof window !== "undefined" ? window : globalThis);
