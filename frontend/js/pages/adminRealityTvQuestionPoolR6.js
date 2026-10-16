/* =========================
   ADMIN REALITY TV — WEEKLY QUESTION POOL R6
   Additive UI for the existing Reality TV Manager.
========================= */

(function realityTvQuestionPoolR6Bootstrap_() {
  "use strict";

  const R6_STATE = {
    installed: false,
    observer: null,
    poller: null,
    originalUpdateApi: null
  };

  function bool_(value) {
    if (value === true || value === 1) return true;
    return ["true", "1", "yes", "on"].indexOf(String(value === undefined || value === null ? "" : value).trim().toLowerCase()) !== -1;
  }

  function escape_(value) {
    if (typeof adminRealityTvEscape_ === "function") return adminRealityTvEscape_(value);
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function selectorEscape_(value) {
    const text = String(value === undefined || value === null ? "" : value);
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") return CSS.escape(text);
    return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function dashboard_() {
    if (typeof ADMIN_REALITY_TV_DASHBOARD !== "undefined") return ADMIN_REALITY_TV_DASHBOARD;
    return window.ADMIN_REALITY_TV_DASHBOARD || null;
  }

  function bundle_(seasonId) {
    const dashboard = dashboard_();
    return dashboard && (dashboard.seasons || []).find(function(item) {
      return item && item.season && String(item.season.SeasonId || "") === String(seasonId || "");
    }) || null;
  }

  function currentEpisode_(bundle) {
    if (typeof adminRealityTvCurrentEpisode_ === "function") return adminRealityTvCurrentEpisode_(bundle || {});
    const episodes = bundle && bundle.episodes || [];
    return episodes.slice().sort(function(a, b) { return Number(b.EpisodeNumber || 0) - Number(a.EpisodeNumber || 0); })[0] || null;
  }

  function selectedRows_(bundle) {
    const episode = currentEpisode_(bundle);
    if (!bundle || !episode) return [];
    return (bundle.episodeQuestions || []).filter(function(row) {
      return String(row.EpisodeId || "") === String(episode.EpisodeId || "") &&
        (row.Enabled === "" || row.Enabled === undefined || bool_(row.Enabled));
    });
  }

  function selectedLabel_(bundle) {
    const templates = {};
    (bundle && bundle.questionTemplates || []).forEach(function(row) {
      templates[String(row.TemplateId || "")] = row.Label || row.QuestionType || row.TemplateId;
    });
    const rows = selectedRows_(bundle);
    if (!rows.length) return "No saved episode selection yet.";
    return rows.map(function(row) {
      const id = String(row.TemplateId || row.QuestionType || "");
      const label = templates[id] || row.QuestionType || id;
      return escape_(label) + " <code>" + escape_(id) + "</code>";
    }).join(" · ");
  }

  function controlsHtml_(seasonId, bundle) {
    const season = bundle && bundle.season || {};
    const episode = currentEpisode_(bundle);
    const status = String(episode && episode.Status || "OPEN").toUpperCase();
    const regenerateDisabled = ["LOCKED", "FINAL", "CLOSED"].indexOf(status) !== -1 ? " disabled" : "";
    return `
      <div class="reality-tv-r6-question-pool" data-r6-season-id="${escape_(seasonId)}" style="margin:14px 0;padding:14px;border:1px solid var(--border-color,#d1d5db);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <strong>Weekly Question Pool</strong>
            <div class="admin-sub">Keep core questions every week and rotate a saved random set from eligible templates.</div>
          </div>
          <label class="reality-tv-inline-option"><input class="rt-r6-pool-enabled" type="checkbox" ${bool_(season.QuestionPoolEnabled) ? "checked" : ""}><span>Question Pool On</span></label>
        </div>
        <div class="admin-form-grid reality-tv-format-settings-grid" style="margin-top:10px;">
          <label>Random Questions Per Episode<input class="input rt-r6-random-count" type="number" min="0" step="1" value="${escape_(season.RandomQuestionCount || 0)}"></label>
          <label>Avoid Recently Used<input class="input rt-r6-avoid-count" type="number" min="0" step="1" value="${escape_(season.AvoidRepeatEpisodes || 0)}"><span class="admin-sub">Episodes to prefer avoiding by saved TemplateId.</span></label>
        </div>
        <div class="admin-sub" style="margin-top:8px;"><b>Current ${escape_(season.PeriodLabel || "Episode")} selection:</b> <span class="rt-r6-selected-list">${selectedLabel_(bundle)}</span></div>
        <div class="admin-actions" style="margin-top:10px;">
          <button class="admin-small-button rt-r6-generate" type="button" data-season-id="${escape_(seasonId)}" data-episode-id="${escape_(episode && episode.EpisodeId || "")}">Generate Episode Questions</button>
          <button class="admin-small-button secondary rt-r6-regenerate" type="button" data-season-id="${escape_(seasonId)}" data-episode-id="${escape_(episode && episode.EpisodeId || "")}"${regenerateDisabled}>Regenerate Question Set</button>
        </div>
        <div class="admin-message rt-r6-message"></div>
      </div>`;
  }

  function decorateTemplateRows_(container, seasonId, bundle) {
    const templateById = {};
    (bundle && bundle.questionTemplates || []).forEach(function(row) {
      templateById[String(row.TemplateId || "")] = row;
    });
    const seasonSelector = selectorEscape_(seasonId);
    container.querySelectorAll('.rt-season-question-type[data-season-id="' + seasonSelector + '"]').forEach(function(enabledBox) {
      const templateId = String(enabledBox.value || "");
      const host = enabledBox.closest("label") || enabledBox.parentElement;
      const rowHost = enabledBox.closest(".reality-tv-question-pack-choice") || host && host.parentElement;
      if (!rowHost || rowHost.querySelector('.rt-r6-template-flags[data-template-id="' + selectorEscape_(templateId) + '"]')) return;
      const template = templateById[templateId] || {};
      const flags = document.createElement("div");
      flags.className = "rt-r6-template-flags reality-tv-checkbox-row";
      flags.dataset.templateId = templateId;
      flags.dataset.seasonId = String(seasonId);
      flags.innerHTML = `
        <label class="reality-tv-inline-option"><input type="checkbox" class="rt-r6-required" ${bool_(template.RequiredCore) ? "checked" : ""}><span>Required</span></label>
        <label class="reality-tv-inline-option"><input type="checkbox" class="rt-r6-random-eligible" ${bool_(template.RandomEligible) ? "checked" : ""}><span>Random Eligible</span></label>`;
      rowHost.appendChild(flags);
    });
  }

  function inject_() {
    document.querySelectorAll('[id^="realityTvQuestionPackGrid_"]').forEach(function(grid) {
      const seasonId = String(grid.id || "").replace("realityTvQuestionPackGrid_", "");
      if (!seasonId) return;
      const bundle = bundle_(seasonId);
      const section = grid.closest("details.reality-tv-config-section") || grid.parentElement;
      if (!section) return;
      if (!section.querySelector('.reality-tv-r6-question-pool[data-r6-season-id="' + selectorEscape_(seasonId) + '"]')) {
        grid.insertAdjacentHTML("beforebegin", controlsHtml_(seasonId, bundle));
      }
      decorateTemplateRows_(section, seasonId, bundle);
    });
  }

  function collect_(seasonId) {
    const escapedSeasonId = selectorEscape_(seasonId);
    const pool = document.querySelector('.reality-tv-r6-question-pool[data-r6-season-id="' + escapedSeasonId + '"]');
    if (!pool) return null;
    const required = [];
    const randomEligible = [];
    document.querySelectorAll('.rt-r6-template-flags[data-season-id="' + escapedSeasonId + '"]').forEach(function(row) {
      const id = row.dataset.templateId || "";
      if (id && row.querySelector(".rt-r6-required:checked")) required.push(id);
      if (id && row.querySelector(".rt-r6-random-eligible:checked")) randomEligible.push(id);
    });
    return {
      questionPoolEnabled: !!pool.querySelector(".rt-r6-pool-enabled:checked"),
      randomQuestionCount: Math.max(0, Math.floor(Number((pool.querySelector(".rt-r6-random-count") || {}).value || 0))),
      avoidRepeatEpisodes: Math.max(0, Math.floor(Number((pool.querySelector(".rt-r6-avoid-count") || {}).value || 0))),
      requiredQuestionTypesJSON: JSON.stringify(required),
      randomEligibleQuestionTypesJSON: JSON.stringify(randomEligible)
    };
  }

  function setMessage_(seasonId, text, isError) {
    const node = document.querySelector('.reality-tv-r6-question-pool[data-r6-season-id="' + selectorEscape_(seasonId) + '"] .rt-r6-message');
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("error", !!isError);
    node.classList.toggle("success", !isError && !!text);
  }

  async function saveSettings_(seasonId, episodeId) {
    const config = collect_(seasonId);
    if (!config || typeof R6_STATE.originalUpdateApi !== "function") return;
    await R6_STATE.originalUpdateApi(Object.assign({
      seasonId: seasonId,
      episodeId: episodeId || "",
      buildCurrentEpisode: false
    }, config));
  }

  async function generate_(button, regenerate) {
    const seasonId = button.dataset.seasonId || "";
    const episodeId = button.dataset.episodeId || "";
    if (!seasonId || typeof window.apiAdminBuildRealityTvEpisodeQuestions !== "function") return;
    button.disabled = true;
    setMessage_(seasonId, regenerate ? "Checking protection and regenerating…" : "Generating saved episode selection…", false);
    try {
      await saveSettings_(seasonId, episodeId);
      const result = await window.apiAdminBuildRealityTvEpisodeQuestions({
        seasonId: seasonId,
        episodeId: episodeId,
        regenerate: regenerate === true
      });
      if (result && result.success === false) throw new Error(result.error || "Question build failed.");
      setMessage_(seasonId, regenerate ? "Question set regenerated." : "Episode questions generated and saved.", false);
      if (typeof window.adminRealityTvLoad === "function") await window.adminRealityTvLoad();
      else if (typeof window.renderAdminRealityTv === "function") await window.renderAdminRealityTv();
      setTimeout(inject_, 0);
    } catch (error) {
      setMessage_(seasonId, error && error.message ? error.message : String(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function installApiAugment_() {
    if (R6_STATE.originalUpdateApi || typeof window.apiAdminUpdateRealityTvQuestionPack !== "function") return;
    R6_STATE.originalUpdateApi = window.apiAdminUpdateRealityTvQuestionPack;
    window.apiAdminUpdateRealityTvQuestionPack = function(payload) {
      const seasonId = payload && payload.seasonId;
      const config = seasonId ? collect_(seasonId) : null;
      return R6_STATE.originalUpdateApi(config ? Object.assign({}, payload, config) : payload);
    };
  }

  function install_() {
    installApiAugment_();
    inject_();
    if (!R6_STATE.observer && document.body) {
      R6_STATE.observer = new MutationObserver(function() { inject_(); installApiAugment_(); });
      R6_STATE.observer.observe(document.body, { childList: true, subtree: true });
    }
    if (!R6_STATE.installed) {
      document.addEventListener("click", function(event) {
        const generateButton = event.target.closest(".rt-r6-generate");
        if (generateButton) { event.preventDefault(); generate_(generateButton, false); return; }
        const regenerateButton = event.target.closest(".rt-r6-regenerate");
        if (regenerateButton) { event.preventDefault(); generate_(regenerateButton, true); }
      });
      R6_STATE.installed = true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install_);
  else install_();
  R6_STATE.poller = window.setInterval(function() {
    install_();
    if (R6_STATE.originalUpdateApi && document.body) {
      window.clearInterval(R6_STATE.poller);
      R6_STATE.poller = null;
    }
  }, 250);
})();
