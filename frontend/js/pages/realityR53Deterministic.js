/* =========================================================
   PATTC Reality TV R5.3 replacement — deterministic interaction layer
   Baseline: 4fea38361d05dcf7a66f84094981f4d7bf0d54c3

   Reality-only enhancement loaded after pages/picks.js.
   Deliberately avoids global pointer/touch event rerouting.
   ========================================================= */
(function(global) {
  const SECTION_STATE = Object.create(null);
  const ORIGINALS = Object.create(null);
  let comparePatched = false;
  let observer = null;
  let mountQueued = false;

  const STYLE_ID = "pattc-reality-r53-deterministic-style";

  const CSS = `
/* R5.3 replacement: ordinary controls + viewport-safe modals only. */
.reality-player-page.reality-clean-enhanced .reality-r53-heading-toggle{
  position:absolute!important;
  inset:0!important;
  z-index:5!important;
  width:100%!important;
  min-height:100%!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  cursor:pointer!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:rgba(125,211,252,.16)!important;
}
.reality-player-page.reality-clean-enhanced .reality-r53-heading-toggle:focus-visible{
  outline:2px solid currentColor!important;
  outline-offset:-3px!important;
  border-radius:inherit!important;
}
.reality-player-page.reality-clean-enhanced .reality-current-question-heading,
.reality-player-page.reality-clean-enhanced .reality-clean-section-heading,
.reality-player-page.reality-clean-enhanced .reality-player-summary-heading{
  position:relative!important;
}
.reality-player-page.reality-clean-enhanced [hidden],
.reality-player-page.reality-clean-enhanced .reality-r53-hidden{
  display:none!important;
}

/* Season Cast: explicit one-card-step controls; swipe remains optional. */
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
  overflow-x:auto!important;
  overflow-y:hidden!important;
  scroll-snap-type:x proximity!important;
  scroll-behavior:smooth!important;
  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-x:contain!important;
}
.reality-player-page.reality-clean-enhanced .reality-clean-cast-card{
  scroll-snap-align:center!important;
  scroll-snap-stop:always!important;
}

/* Bio + More Stats: body-mounted, viewport-safe and impossible to trap. */
body.reality-r53-modal-open{
  overflow:hidden!important;
  overscroll-behavior:none!important;
}
body > .season-anchor-confirm-backdrop{
  box-sizing:border-box!important;
  padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))!important;
  overflow:hidden!important;
}
body > .season-anchor-confirm-backdrop .reality-contestant-modal-card,
body > .season-anchor-confirm-backdrop .season-anchor-stats-modal-card{
  box-sizing:border-box!important;
  width:min(760px,100%)!important;
  max-width:100%!important;
  max-height:calc(100dvh - 24px)!important;
  min-height:0!important;
}
@supports not (height:100dvh){
  body > .season-anchor-confirm-backdrop .reality-contestant-modal-card,
  body > .season-anchor-confirm-backdrop .season-anchor-stats-modal-card{
    max-height:calc(100vh - 24px)!important;
  }
}
body > .season-anchor-confirm-backdrop .reality-contestant-modal-card{
  display:flex!important;
  flex-direction:column!important;
  overflow:hidden!important;
}
body > .season-anchor-confirm-backdrop .reality-contestant-modal-heading,
body > .season-anchor-confirm-backdrop .season-anchor-stats-modal-heading{
  position:sticky!important;
  top:0!important;
  z-index:12!important;
  flex:0 0 auto!important;
}
body > .season-anchor-confirm-backdrop .reality-contestant-modal-body{
  min-height:0!important;
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
}
body > .season-anchor-confirm-backdrop .season-anchor-stats-modal-card{
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
}
body > .season-anchor-confirm-backdrop .season-anchor-stats-close{
  position:relative!important;
  top:auto!important;
  right:auto!important;
  z-index:20!important;
  flex:0 0 auto!important;
  touch-action:manipulation!important;
}

/* Standings & Compare: normal Reality inner width, two frozen reference columns. */
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
.reality-player-page.reality-clean-enhanced .reality-standings-compare-tabs{
  margin-left:0!important;
  margin-right:0!important;
}
.reality-player-page.reality-clean-enhanced .reality-compare-matrix-wrap{
  margin-left:0!important;
  margin-right:0!important;
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
  touch-action:manipulation!important;
}

/* All ordinary Reality action controls get normal tap behavior, not pointer routing. */
.reality-player-page.reality-clean-enhanced button,
body > .season-anchor-confirm-backdrop button{
  touch-action:manipulation;
}

@media(max-width:760px){
  .reality-player-page.reality-clean-enhanced .reality-r53-cast-controls{
    grid-template-columns:minmax(82px,auto) 1fr minmax(82px,auto)!important;
    gap:5px!important;
    padding:6px!important;
  }
  .reality-player-page.reality-clean-enhanced .reality-r53-cast-controls small{
    font-size:.59rem!important;
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

  function canRemoveCompareKey_(candidateKey, currentKey) {
    const candidate = key_(candidateKey);
    const current = key_(currentKey);
    return !!candidate && candidate !== current;
  }

  function orderedCompareKeys_(validKeys, currentKey, existingKeys, initialized) {
    validKeys = (Array.isArray(validKeys) ? validKeys : []).map(key_).filter(Boolean);
    const valid = Object.create(null);
    validKeys.forEach(function(item) { valid[item] = true; });
    currentKey = key_(currentKey);
    const extras = (initialized === true && Array.isArray(existingKeys) ? existingKeys : [])
      .map(key_)
      .filter(function(item, index, all) {
        return item && item !== currentKey && valid[item] && all.indexOf(item) === index;
      });
    const ordered = [];
    if (currentKey && valid[currentKey]) ordered.push(currentKey);
    extras.forEach(function(item) { ordered.push(item); });
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

  function stateOpen_(key, defaultOpen) {
    if (!Object.prototype.hasOwnProperty.call(SECTION_STATE, key)) {
      SECTION_STATE[key] = defaultOpen === true;
    }
    return SECTION_STATE[key] === true;
  }

  function setStateOpen_(key, open) {
    SECTION_STATE[key] = open === true;
    return SECTION_STATE[key];
  }

  function bindNativeDetails_(node, key, defaultOpen) {
    if (!node || String(node.tagName || "").toLowerCase() !== "details") return;
    node.open = stateOpen_(key, defaultOpen === true);
    node.dataset.realityR53StateKey = key;
    if (node.dataset.realityR53ToggleBound === "true") return;
    node.dataset.realityR53ToggleBound = "true";
    node.addEventListener("toggle", function() {
      setStateOpen_(key, node.open === true);
    });
  }

  function ensureHeadingToggle_(host, heading, bodies, key, label, defaultOpen) {
    if (!host || !heading) return;
    bodies = (Array.isArray(bodies) ? bodies : []).filter(Boolean);
    const open = stateOpen_(key, defaultOpen === true);
    bodies.forEach(function(body) { body.hidden = !open; });

    let button = heading.querySelector(":scope > .reality-r53-heading-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "reality-r53-heading-toggle";
      button.setAttribute("aria-label", (open ? "Collapse " : "Expand ") + label);
      button.setAttribute("title", (open ? "Collapse " : "Expand ") + label);
      heading.appendChild(button);
    }
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.dataset.realityR53StateKey = key;
    if (button.dataset.realityR53ClickBound === "true") return;
    button.dataset.realityR53ClickBound = "true";
    button.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = !stateOpen_(key, defaultOpen === true);
      setStateOpen_(key, nextOpen);
      bodies.forEach(function(body) { body.hidden = !nextOpen; });
      button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      button.setAttribute("aria-label", (nextOpen ? "Collapse " : "Expand ") + label);
      button.setAttribute("title", (nextOpen ? "Collapse " : "Expand ") + label);
    });
  }

  function mountSectionState_(page) {
    if (!page) return;

    const sole = page.querySelector(".reality-sole-survivor-card");
    if (sole && String(sole.tagName || "").toLowerCase() === "details") {
      bindNativeDetails_(sole, "sole-survivor", true);
    }

    const previous = page.querySelector(".reality-previous-episodes");
    if (previous) bindNativeDetails_(previous, "previous-episodes", previous.open === true);
    page.querySelectorAll(".reality-episode-picks-section.previous[data-reality-history-episode]").forEach(function(node) {
      const episodeKey = "previous-episode:" + key_(node.getAttribute("data-reality-history-episode"));
      bindNativeDetails_(node, episodeKey, node.open === true);
    });

    const compare = page.querySelector(".reality-standings-compare-shell");
    if (compare) bindNativeDetails_(compare, "standings-compare", compare.open === true);

    const help = page.querySelector(".reality-help-shell");
    if (help) bindNativeDetails_(help, "help", help.open === true);

    const current = page.querySelector(".reality-episode-picks-section.current");
    if (current) {
      const heading = current.querySelector(".reality-current-question-heading");
      const body = current.querySelector(".reality-episode-picks-body");
      if (heading && body) ensureHeadingToggle_(current, heading, [body], "current-episode", "Current Episode", true);
    }

    const yourSeason = page.querySelector(".reality-your-season-card");
    if (yourSeason) {
      const heading = yourSeason.querySelector(".reality-player-summary-heading");
      if (heading) {
        const bodies = Array.from(yourSeason.children).filter(function(child) { return child !== heading; });
        ensureHeadingToggle_(yourSeason, heading, bodies, "your-season", "Your Season", true);
      }
    }
  }

  function castCards_(rail) {
    return rail ? Array.from(rail.querySelectorAll(".reality-clean-cast-card")) : [];
  }

  function castCurrentIndex_(rail, cards) {
    cards = Array.isArray(cards) ? cards : castCards_(rail);
    if (!rail || !cards.length) return -1;
    const center = Number(rail.scrollLeft || 0) + Number(rail.clientWidth || 0) / 2;
    let best = 0;
    let bestDistance = Infinity;
    cards.forEach(function(card, index) {
      const cardCenter = Number(card.offsetLeft || 0) + Number(card.offsetWidth || card.clientWidth || 0) / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  function castTargetLeft_(rail, card) {
    if (!rail || !card) return 0;
    const railWidth = Number(rail.clientWidth || 0);
    const cardWidth = Number(card.offsetWidth || card.clientWidth || 0);
    return Math.max(0, Number(card.offsetLeft || 0) - Math.max(0, (railWidth - cardWidth) / 2));
  }

  function scrollCastToIndex_(rail, cards, index, behavior) {
    cards = Array.isArray(cards) ? cards : castCards_(rail);
    if (!rail || !cards.length) return -1;
    index = clamp_(Number(index || 0), 0, cards.length - 1);
    const left = castTargetLeft_(rail, cards[index]);
    if (typeof rail.scrollTo === "function") {
      rail.scrollTo({ left: left, behavior: behavior || "smooth" });
    } else {
      rail.scrollLeft = left;
    }
    return index;
  }

  function updateCastControls_(section) {
    if (!section) return;
    const rail = section.querySelector(".reality-clean-cast-rail");
    const controls = section.querySelector(".reality-r53-cast-controls");
    if (!rail || !controls) return;
    const cards = castCards_(rail);
    const current = castCurrentIndex_(rail, cards);
    const prev = controls.querySelector('[data-reality-r53-cast="prev"]');
    const next = controls.querySelector('[data-reality-r53-cast="next"]');
    if (prev) prev.disabled = current <= 0;
    if (next) next.disabled = current < 0 || current >= cards.length - 1;
    const status = controls.querySelector("[data-reality-r53-cast-status]");
    if (status) status.textContent = cards.length && current >= 0 ? (current + 1) + " of " + cards.length : "";
  }

  function activateCastStep_(section, direction) {
    if (!section) return -1;
    const rail = section.querySelector(".reality-clean-cast-rail");
    const cards = castCards_(rail);
    if (!rail || !cards.length) return -1;
    const current = castCurrentIndex_(rail, cards);
    const target = nextCastIndex_(current < 0 ? 0 : current, cards.length, direction);
    scrollCastToIndex_(rail, cards, target, "smooth");
    if (typeof global.requestAnimationFrame === "function") {
      global.requestAnimationFrame(function() { updateCastControls_(section); });
    } else {
      updateCastControls_(section);
    }
    return target;
  }

  function centerLatestEliminated_(section) {
    if (!section) return;
    const rail = section.querySelector(".reality-clean-cast-rail");
    if (!rail || rail.dataset.realityR53InitialCentered === "true") return;
    const latest = rail.querySelector('[data-reality-latest-eliminated="true"]');
    const cards = castCards_(rail);
    if (!latest || !cards.length || !Number(rail.clientWidth || 0)) return;
    const index = cards.indexOf(latest);
    if (index < 0 || !Number(latest.offsetWidth || latest.clientWidth || 0)) return;
    scrollCastToIndex_(rail, cards, index, "auto");
    rail.dataset.realityR53InitialCentered = "true";
  }

  function mountCastSlider_(page) {
    const section = page && page.querySelector("#realityEnhancedCleanCast.reality-clean-cast-section");
    if (!section) return;
    const rail = section.querySelector(".reality-clean-cast-rail");
    const heading = section.querySelector(".reality-clean-section-heading");
    if (!rail || !heading) return;

    let controls = section.querySelector(".reality-r53-cast-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "reality-r53-cast-controls";
      controls.setAttribute("aria-label", "Season Cast slider controls");
      controls.innerHTML = '<button type="button" class="reality-r53-cast-arrow" data-reality-r53-cast="prev" aria-label="Previous contestant">‹ Previous</button>' +
        '<small><span data-reality-r53-cast-status></span><br>Swipe is optional</small>' +
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
        activateCastStep_(section, button.getAttribute("data-reality-r53-cast"));
      });
    });

    if (rail.dataset.realityR53ScrollBound !== "true") {
      rail.dataset.realityR53ScrollBound = "true";
      rail.addEventListener("scroll", function() {
        updateCastControls_(section);
      }, { passive: true });
    }

    ensureHeadingToggle_(section, heading, [controls, rail], "season-cast", "Season Cast", true);

    const centerAndUpdate = function() {
      centerLatestEliminated_(section);
      updateCastControls_(section);
    };
    if (typeof global.requestAnimationFrame === "function") global.requestAnimationFrame(centerAndUpdate);
    else centerAndUpdate();
  }

  function mountSpoilerButtons_(page) {
    const shell = page && page.querySelector(".reality-spoiler-action");
    if (!shell) return;

    shell.removeAttribute("onclick");
    shell.removeAttribute("onkeydown");
    shell.removeAttribute("role");
    shell.removeAttribute("tabindex");

    let main = shell.querySelector(".reality-spoiler-main-button");
    if (main && String(main.tagName || "").toLowerCase() !== "button") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = main.className;
      while (main.firstChild) button.appendChild(main.firstChild);
      main.parentNode.replaceChild(button, main);
      main = button;
    }
    if (main) {
      const hidden = shell.classList.contains("is-hidden");
      main.disabled = !hidden;
      if (main.dataset.realityR53Bound !== "true") {
        main.dataset.realityR53Bound = "true";
        main.addEventListener("click", function(event) {
          event.preventDefault();
          if (!shell.classList.contains("is-hidden")) return;
          let blocking = null;
          try {
            if (typeof realityTvBlockingHiddenEpisode_ === "function") blocking = realityTvBlockingHiddenEpisode_();
          } catch (err) {}
          const episodeId = String(blocking && blocking.episodeId || "").trim();
          if (episodeId && typeof revealRealityTvEpisode_ === "function") revealRealityTvEpisode_(episodeId);
        });
      }
    }

    const preference = shell.querySelector(".reality-spoiler-preference-button");
    if (preference) {
      preference.removeAttribute("onclick");
      if (preference.dataset.realityR53Bound !== "true") {
        preference.dataset.realityR53Bound = "true";
        preference.addEventListener("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
          const current = preference.getAttribute("aria-pressed") === "true";
          if (typeof saveRealityTvSpoilerPreference_ === "function") saveRealityTvSpoilerPreference_(!current);
        });
      }
    }
  }

  function modalLock_() {
    if (!hasDom_() || !document.body) return;
    const modal = document.getElementById("realityTvContestantDetailModal") || document.getElementById("seasonAnchorStatsModal");
    document.body.classList.toggle("reality-r53-modal-open", !!modal);
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
    const state = {
      open: stateOpen_("standings-compare", false),
      scrollLeft: 0
    };
    if (!hasDom_()) return state;
    const mount = document.getElementById("realityTvEpisodeComparisonMount");
    const shell = mount && mount.querySelector(".reality-standings-compare-shell");
    const wrap = mount && mount.querySelector(".reality-compare-matrix-wrap");
    if (shell) state.open = shell.open === true;
    if (wrap) state.scrollLeft = Number(wrap.scrollLeft || 0);
    setStateOpen_("standings-compare", state.open);
    return state;
  }

  function restoreCompareUi_(state) {
    state = state || {};
    if (!hasDom_()) return;
    const mount = document.getElementById("realityTvEpisodeComparisonMount");
    if (!mount) return;
    const shell = mount.querySelector(".reality-standings-compare-shell");
    const wrap = mount.querySelector(".reality-compare-matrix-wrap");
    if (shell) {
      shell.open = state.open === true;
      setStateOpen_("standings-compare", shell.open === true);
    }
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
    const key = key_(userKey);
    if (!key || key === currentCompareKey_()) return;
    const state = captureCompareUi_();
    try {
      PICKS_REALITY_COMPARE_USERS_INITIALIZED = true;
      const current = currentCompareKey_();
      const existing = Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS.slice() : [];
      const next = [];
      if (current) next.push(current);
      existing.forEach(function(item) {
        item = key_(item);
        if (item && item !== current && next.indexOf(item) === -1) next.push(item);
      });
      if (next.indexOf(key) === -1) next.push(key);
      PICKS_REALITY_COMPARE_USER_KEYS = next;
      PICKS_REALITY_STANDINGS_COMPARE_TAB = "compare";
    } catch (err) {}
    state.open = true;
    rerenderCompare_(state);
  }

  function removeCompareUserStable_(userKey) {
    const key = key_(userKey);
    const current = currentCompareKey_();
    if (!canRemoveCompareKey_(key, current)) return;
    const state = captureCompareUi_();
    try {
      PICKS_REALITY_COMPARE_USERS_INITIALIZED = true;
      PICKS_REALITY_COMPARE_USER_KEYS = (Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS : [])
        .map(key_)
        .filter(function(item) { return item && item !== key; });
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
      ORIGINALS.selectedRows = realityTvCompareSelectedRows_;
      ORIGINALS.addUser = typeof addRealityTvCompareUser_ === "function" ? addRealityTvCompareUser_ : null;
      ORIGINALS.removeUser = typeof removeRealityTvCompareUser_ === "function" ? removeRealityTvCompareUser_ : null;
      ORIGINALS.setTab = typeof setRealityTvStandingsCompareTab_ === "function" ? setRealityTvStandingsCompareTab_ : null;
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

  function formatPoints_(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return "0";
    return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function compareDataByKey_() {
    const byKey = Object.create(null);
    const standingByKey = Object.create(null);
    try {
      const comparison = PICKS_PAGE_DATA.episodeComparison || {};
      const view = PICKS_PAGE_DATA.realityTvView || {};
      (Array.isArray(comparison.rows) ? comparison.rows : []).forEach(function(row) {
        const k = key_(row && (row.username || row.displayName || row.name));
        if (k) byKey[k] = row;
      });
      (view.playerStats && Array.isArray(view.playerStats.compactLeaderboard) ? view.playerStats.compactLeaderboard : []).forEach(function(row) {
        const k = key_(row && row.username);
        if (k) standingByKey[k] = row;
      });
    } catch (err) {}
    return { rows: byKey, standings: standingByKey };
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
    const shell = mount.querySelector(".reality-standings-compare-shell");
    if (shell) bindNativeDetails_(shell, "standings-compare", shell.open === true);

    let currentKey = currentCompareKey_();
    let selectedKeys = [];
    try { selectedKeys = Array.isArray(PICKS_REALITY_COMPARE_USER_KEYS) ? PICKS_REALITY_COMPARE_USER_KEYS.map(key_).filter(Boolean) : []; } catch (err) {}
    if (currentKey && selectedKeys.indexOf(currentKey) === -1) selectedKeys.unshift(currentKey);

    const heads = Array.from(mount.querySelectorAll(".reality-compare-player-column-head"));
    heads.forEach(function(head, index) {
      const userKey = selectedKeys[index] || "";
      if (!userKey) return;
      makeCompareHead_(head, userKey, index === 0 && userKey === currentKey);
    });

    mount.querySelectorAll(".reality-compare-question-label").forEach(function(label) {
      const currentCell = label.nextElementSibling;
      if (currentCell && currentCell.classList && currentCell.classList.contains("reality-compare-grid-cell")) {
        currentCell.classList.add("is-current-reference");
      }
    });

    const addSelect = mount.querySelector(".reality-compare-add-user select");
    if (addSelect) {
      Array.from(addSelect.options || []).forEach(function(option) {
        if (currentKey && key_(option.value) === currentKey) option.remove();
      });
      addSelect.onchange = null;
      addSelect.removeAttribute("onchange");
      if (addSelect.dataset.realityR53Bound !== "true") {
        addSelect.dataset.realityR53Bound = "true";
        addSelect.addEventListener("change", function() {
          const value = addSelect.value;
          addSelect.value = "";
          if (value) addCompareUserStable_(value);
        });
      }
    }

    const tabs = Array.from(mount.querySelectorAll(".reality-standings-compare-tabs button"));
    tabs.forEach(function(button, index) {
      button.onclick = null;
      button.removeAttribute("onclick");
      if (button.dataset.realityR53Bound === "true") return;
      button.dataset.realityR53Bound = "true";
      button.addEventListener("click", function(event) {
        event.preventDefault();
        setCompareTabStable_(index === 1 ? "compare" : "standings");
      });
    });

    const episodeSelect = mount.querySelector(".reality-compare-episode-picker select");
    if (episodeSelect) {
      episodeSelect.onchange = null;
      episodeSelect.removeAttribute("onchange");
      if (episodeSelect.dataset.realityR53Bound !== "true") {
        episodeSelect.dataset.realityR53Bound = "true";
        episodeSelect.addEventListener("change", function() {
          if (episodeSelect.value) selectCompareEpisodeStable_(episodeSelect.value);
        });
      }
    }
  }

  function mount_() {
    mountQueued = false;
    if (!hasDom_()) return;
    installComparePatch_();
    injectStyle_();
    modalLock_();
    if (!realityEnabled_()) return;
    const page = document.querySelector(".reality-player-page.reality-clean-enhanced, .reality-player-page");
    if (!page) return;
    mountCastSlider_(page);
    mountSectionState_(page);
    mountSpoilerButtons_(page);
    decorateCompare_(page);
    modalLock_();
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
    if (observer || typeof MutationObserver === "undefined") return;
    const root = document.getElementById("app") || document.body;
    if (!root) return;
    observer = new MutationObserver(function() { scheduleMount_(); });
    observer.observe(root, { childList: true, subtree: true });
  }

  const api = {
    version: "reality-r5.3-replacement-deterministic-1",
    css: CSS,
    nextCastIndex: nextCastIndex_,
    currentCompareKeyFromData: currentCompareKeyFromData_,
    orderedCompareKeys: orderedCompareKeys_,
    canRemoveCompareKey: canRemoveCompareKey_,
    stateOpen: stateOpen_,
    setStateOpen: setStateOpen_,
    mount: mount_,
    start: start_
  };

  global.PATTCRealityR53Deterministic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  start_();
})(typeof window !== "undefined" ? window : globalThis);
