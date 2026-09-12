/* =========================================================
   PATTC Predicts — Henry POSTCERT-R2 Presentation R1C1
   DOM-only presentation enhancer for Final Certified Ed R2.

   Hard contract:
   - no API/fetch/XHR
   - no polling/cache
   - no saves
   - no route navigation
   - no score/result inference
   - no Shared Compare persistence
   ========================================================= */
(function () {
  "use strict";

  var HENRY_PRESENTATION_STATE = {
    scheduled: false,
    wagerKey: "",
    appearanceOpen: Object.create(null)
  };

  // Runtime-only binding state. DOM snapshot HTML can preserve Henry's
  // decoration markers/buttons, but browser event listeners are never
  // serialized. WeakSets therefore track only the current live DOM nodes.
  var HENRY_SURVIVOR_BOUND_PREV = new WeakSet();
  var HENRY_SURVIVOR_BOUND_NEXT = new WeakSet();
  var HENRY_SURVIVOR_BOUND_SCROLL = new WeakSet();

  function scheduleEnhance_() {
    if (HENRY_PRESENTATION_STATE.scheduled) return;
    HENRY_PRESENTATION_STATE.scheduled = true;
    window.requestAnimationFrame(function () {
      HENRY_PRESENTATION_STATE.scheduled = false;
      enhanceAll_();
    });
  }

  function visible_(node) {
    return !!node && node.hidden !== true && node.getAttribute("aria-hidden") !== "true";
  }

  /* ---------- Survivor carousel presentation ---------- */
  function survivorCarouselCards_(scroll) {
    return Array.prototype.slice.call(scroll ? scroll.children : []).filter(function (child) {
      return child && child.classList && child.classList.contains("survivor-final-matchup");
    });
  }

  function survivorCarouselIndex_(scroll, cards) {
    if (!scroll || !cards.length) return 0;
    var left = Number(scroll.scrollLeft || 0);
    var best = 0;
    var distance = Infinity;
    cards.forEach(function (card, index) {
      var d = Math.abs(Number(card.offsetLeft || 0) - left);
      if (d < distance) {
        distance = d;
        best = index;
      }
    });
    return best;
  }

  function survivorCarouselUpdate_(section) {
    var scroll = section && section.querySelector(".survivor-final-matchup-scroll");
    var controls = section && section.querySelector(".henry-survivor-carousel-controls");
    if (!scroll || !controls) return;
    var cards = survivorCarouselCards_(scroll);
    var index = survivorCarouselIndex_(scroll, cards);
    var count = controls.querySelector(".henry-survivor-carousel-count");
    var prev = controls.querySelector("[data-henry-survivor-prev]");
    var next = controls.querySelector("[data-henry-survivor-next]");
    var countText = "GAME " + (cards.length ? index + 1 : 0) + " OF " + cards.length;
    if (count && count.textContent !== countText) count.textContent = countText;
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = !cards.length || index >= cards.length - 1;
  }

  function survivorCarouselMove_(section, delta) {
    var scroll = section && section.querySelector(".survivor-final-matchup-scroll");
    if (!scroll) return;
    var cards = survivorCarouselCards_(scroll);
    if (!cards.length) return;
    var index = survivorCarouselIndex_(scroll, cards);
    var nextIndex = Math.max(0, Math.min(cards.length - 1, index + delta));
    var target = cards[nextIndex];
    if (!target) return;
    scroll.scrollTo({ left: Number(target.offsetLeft || 0), behavior: "smooth" });
  }

  function bindSurvivorCarousel_(section, scroll, controls) {
    if (!section || !scroll || !controls) return;
    var prev = controls.querySelector("[data-henry-survivor-prev]");
    var next = controls.querySelector("[data-henry-survivor-next]");

    if (prev && !HENRY_SURVIVOR_BOUND_PREV.has(prev)) {
      HENRY_SURVIVOR_BOUND_PREV.add(prev);
      prev.addEventListener("click", function () {
        survivorCarouselMove_(section, -1);
      });
    }
    if (next && !HENRY_SURVIVOR_BOUND_NEXT.has(next)) {
      HENRY_SURVIVOR_BOUND_NEXT.add(next);
      next.addEventListener("click", function () {
        survivorCarouselMove_(section, 1);
      });
    }
    if (!HENRY_SURVIVOR_BOUND_SCROLL.has(scroll)) {
      HENRY_SURVIVOR_BOUND_SCROLL.add(scroll);
      scroll.addEventListener("scroll", function () {
        window.requestAnimationFrame(function () { survivorCarouselUpdate_(section); });
      }, { passive: true });
    }
  }

  function enhanceSurvivorCarousel_() {
    document.querySelectorAll(".survivor-page .survivor-final-browser").forEach(function (section) {
      var scroll = section.querySelector(".survivor-final-matchup-scroll");
      if (!scroll) return;
      var cards = survivorCarouselCards_(scroll);
      if (!cards.length) return;

      var controls = section.querySelector(".henry-survivor-carousel-controls");
      if (!controls) {
        section.dataset.henryCarousel = "1";
        controls = document.createElement("div");
        controls.className = "henry-survivor-carousel-controls";
        controls.innerHTML =
          '<button type="button" data-henry-survivor-prev aria-label="Previous matchup">‹</button>' +
          '<span class="henry-survivor-carousel-count" aria-live="polite"></span>' +
          '<button type="button" data-henry-survivor-next aria-label="Next matchup">›</button>';
        var heading = section.querySelector(".survivor-final-section-head");
        if (heading && heading.nextSibling) section.insertBefore(controls, heading.nextSibling);
        else if (heading) section.appendChild(controls);
        else section.insertBefore(controls, scroll);
      } else if (!section.dataset.henryCarousel) {
        section.dataset.henryCarousel = "1";
      }

      // Binding is intentionally independent of the persisted DOM marker.
      // Snapshot-restored nodes are new objects and therefore rebind here.
      bindSurvivorCarousel_(section, scroll, controls);
      survivorCarouselUpdate_(section);
    });
  }

  /* ---------- Wager feature presentation from already-rendered authoritative DOM ---------- */
  function wagerCardKey_(card) {
    if (!card) return "";
    var current = card.querySelector("[data-betting-current-category]");
    if (current) return String(current.getAttribute("data-betting-current-category") || "");
    var cards = Array.prototype.slice.call(card.parentNode ? card.parentNode.querySelectorAll(".betting-category-card") : []);
    return "market:" + String(card.getAttribute("data-sports-wager-market") || "") + ":" + Math.max(0, cards.indexOf(card));
  }

  function wagerFeatureSource_(page) {
    var cards = Array.prototype.slice.call(page.querySelectorAll(".betting-category-card.has-bet")).filter(visible_);
    if (!cards.length) return null;
    var selected = cards.find(function (card) { return wagerCardKey_(card) === HENRY_PRESENTATION_STATE.wagerKey; });
    return selected || cards[0];
  }

  function hashText_(text) {
    var value = String(text || "");
    var hash = 0;
    for (var i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return String(hash);
  }

  function presentationClone_(node) {
    if (!node) return null;
    var clone = node.cloneNode(true);
    var nodes = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
    nodes.forEach(function (item) {
      if (!item || !item.removeAttribute) return;
      item.removeAttribute("id");
      item.removeAttribute("data-betting-current-category");
      item.removeAttribute("data-betting-category");
      item.removeAttribute("data-betting-nominee");
      ["onclick", "onchange", "oninput", "onsubmit"].forEach(function (name) { item.removeAttribute(name); });
      if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(String(item.tagName || ""))) {
        item.disabled = true;
        item.tabIndex = -1;
      }
    });
    return clone;
  }

  function renderWagerFeature_(page) {
    if (!page) return;
    var source = wagerFeatureSource_(page);
    var existing = page.querySelector(".henry-wager-feature");
    if (!source) {
      if (existing) existing.remove();
      return;
    }

    HENRY_PRESENTATION_STATE.wagerKey = wagerCardKey_(source);
    page.querySelectorAll(".betting-category-card.is-henry-featured-wager").forEach(function (card) {
      if (card !== source) card.classList.remove("is-henry-featured-wager");
    });
    if (!source.classList.contains("is-henry-featured-wager")) source.classList.add("is-henry-featured-wager");

    var title = source.querySelector(".betting-category-title");
    var summaryMain = source.querySelector(".betting-summary-main");
    var tracker = source.querySelector(".betting-live-stat-panel");
    var current = source.querySelector("[data-betting-current-category]");
    var signature = hashText_([
      HENRY_PRESENTATION_STATE.wagerKey,
      title && title.textContent,
      summaryMain && summaryMain.innerHTML,
      tracker && tracker.innerHTML,
      current && current.innerHTML
    ].join("|"));

    var feature = existing || document.createElement("section");
    feature.className = "henry-wager-feature";
    feature.setAttribute("aria-label", "Featured wager");
    if (feature.dataset.signature === signature) return;
    feature.dataset.signature = signature;

    var head = document.createElement("div");
    head.className = "henry-wager-feature-head";
    var label = document.createElement("span");
    label.textContent = "FEATURED WAGER";
    var heading = document.createElement("strong");
    heading.textContent = String(title && title.textContent || "Saved wager").trim();
    head.appendChild(label);
    head.appendChild(heading);

    feature.replaceChildren(head);
    if (summaryMain) feature.appendChild(presentationClone_(summaryMain));
    if (tracker) feature.appendChild(presentationClone_(tracker));
    else if (current && !(summaryMain && summaryMain.contains(current))) {
      // Only add the compact fallback when the selected summary clone does not
      // already contain this authoritative current-result presentation.
      var compact = document.createElement("div");
      compact.className = "betting-current " + String(current.className || "").replace(/\bbetting-current\b/g, "").trim();
      compact.innerHTML = current.innerHTML;
      feature.appendChild(compact);
    }

    if (!existing) {
      var hero = page.querySelector(".pattc-sports-hero, .sports-rich-wager-hero, .sports-wager-default-hero");
      if (hero && hero.nextSibling) page.insertBefore(feature, hero.nextSibling);
      else if (hero) page.appendChild(feature);
      else page.insertBefore(feature, page.firstChild);
    }
  }

  function enhanceWager_() {
    document.querySelectorAll(".betting-page").forEach(renderWagerFeature_);
  }

  /* ---------- Appearance Manager visual grouping only ---------- */
  function appearanceSummary_(details) {
    var summary = details && details.querySelector(":scope > summary");
    return String(summary && summary.textContent || "").replace(/\s+/g, " ").trim();
  }

  function appearanceOpenKey_(details) {
    return String(details && details.className || "") + "|" + appearanceSummary_(details);
  }

  function appearanceRestoreOpen_(details) {
    var key = appearanceOpenKey_(details);
    if (Object.prototype.hasOwnProperty.call(HENRY_PRESENTATION_STATE.appearanceOpen, key)) {
      details.open = HENRY_PRESENTATION_STATE.appearanceOpen[key] === true;
    }
  }

  function appearanceGroupHeader_(label, id) {
    var header = document.createElement("div");
    header.className = "henry-appearance-control-group";
    header.textContent = label;
    if (id) header.id = id;
    return header;
  }

  function enhanceAppearanceControls_(page) {
    var controls = page.querySelector(".appearance-studio-controls");
    if (!controls || controls.dataset.henryGrouped) return;
    controls.dataset.henryGrouped = "1";

    var quick = {
      "Layout & Density": true,
      "Typography": true,
      "Images & Canvas Mode": true,
      "Selection & Results": true,
      "Page / Header / Bars": true
    };
    var questions = {
      "Question Area Designer": true,
      "Question Layout Types": true,
      "Section / Question Layout Overrides": true
    };
    var details = Array.prototype.slice.call(controls.children).filter(function (child) {
      return child && child.tagName === "DETAILS";
    });
    var buckets = { quick: [], questions: [], advanced: [] };
    details.forEach(function (detail) {
      appearanceRestoreOpen_(detail);
      var name = appearanceSummary_(detail);
      var group = quick[name] ? "quick" : questions[name] ? "questions" : "advanced";
      detail.dataset.henryAppearanceGroup = group;
      buckets[group].push(detail);
    });

    controls.appendChild(appearanceGroupHeader_("QUICK EDIT", "henryAppearanceQuick"));
    buckets.quick.forEach(function (detail) { controls.appendChild(detail); });
    controls.appendChild(appearanceGroupHeader_("QUESTIONS", "henryAppearanceQuestions"));
    buckets.questions.forEach(function (detail) { controls.appendChild(detail); });
    controls.appendChild(appearanceGroupHeader_("ADVANCED", "henryAppearanceAdvanced"));
    buckets.advanced.forEach(function (detail) { controls.appendChild(detail); });
  }

  function enhanceAppearance_() {
    document.querySelectorAll(".appearance-manager-page").forEach(function (page) {
      var assignment = page.querySelector(".appearance-assignment-card");
      var theme = page.querySelector(".appearance-theme-card");
      var pack = page.querySelector(".appearance-pack-card");
      var hub = page.querySelector(".appearance-hub-editor");
      var preview = page.querySelector(".appearance-studio-canvas");
      if (assignment) assignment.id = "henryAppearanceGame";
      if (theme) theme.id = "henryAppearanceStudio";
      if (pack) pack.id = "henryAppearanceImages";
      if (hub) hub.id = "henryAppearanceHub";
      if (preview) preview.id = "henryAppearancePreview";

      if (!page.querySelector(".henry-appearance-workspace-map")) {
        var map = document.createElement("div");
        map.className = "henry-appearance-workspace-map";
        [
          ["GAME", "henryAppearanceGame"],
          ["QUICK EDIT", "henryAppearanceQuick"],
          ["QUESTIONS", "henryAppearanceQuestions"],
          ["IMAGE PACK", "henryAppearanceImages"],
          ["PREVIEW", "henryAppearancePreview"],
          ["ADVANCED", "henryAppearanceAdvanced"]
        ].forEach(function (item) {
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = item[0];
          button.dataset.henryAppearanceTarget = item[1];
          map.appendChild(button);
        });
        var heading = page.querySelector(".appearance-page-heading");
        if (heading && heading.nextSibling) page.insertBefore(map, heading.nextSibling);
        else if (heading) page.appendChild(map);
        else page.insertBefore(map, page.firstChild);
      }

      [theme, pack, hub].forEach(function (detail) {
        if (detail && detail.tagName === "DETAILS") appearanceRestoreOpen_(detail);
      });
      enhanceAppearanceControls_(page);
    });
  }

  function markComparePresentation_() {
    document.querySelectorAll(
      ".rc24k-confidence-compare, .survivor-final-compare, .tf-compare-matrix-scroll, .koth-final-compare"
    ).forEach(function (node) {
      node.classList.add("henry-compare-presentation");
    });
  }

  function enhanceAll_() {
    enhanceSurvivorCarousel_();
    enhanceWager_();
    enhanceAppearance_();
    markComparePresentation_();
  }

  document.addEventListener("click", function (event) {
    var appearanceButton = event.target && event.target.closest && event.target.closest("[data-henry-appearance-target]");
    if (appearanceButton) {
      var target = document.getElementById(appearanceButton.dataset.henryAppearanceTarget || "");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    var summary = event.target && event.target.closest && event.target.closest(".betting-category-summary");
    var card = summary && summary.closest(".betting-category-card.has-bet");
    if (card) {
      HENRY_PRESENTATION_STATE.wagerKey = wagerCardKey_(card);
      window.requestAnimationFrame(function () {
        var page = card.closest(".betting-page");
        if (page) renderWagerFeature_(page);
      });
    }
  }, true);

  document.addEventListener("toggle", function (event) {
    var detail = event.target;
    if (!detail || detail.tagName !== "DETAILS" || !detail.closest(".appearance-manager-page")) return;
    HENRY_PRESENTATION_STATE.appearanceOpen[appearanceOpenKey_(detail)] = detail.open === true;
  }, true);

  function start_() {
    var app = document.getElementById("app");
    if (!app) return;
    var observer = new MutationObserver(scheduleEnhance_);
    observer.observe(app, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleEnhance_, { passive: true });
    scheduleEnhance_();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start_, { once: true });
  else start_();
})();
