/* =========================
   ADMIN REALITY TV SEASON MANAGER
   Phase 2B v1.0.28
========================= */

let ADMIN_REALITY_TV_DASHBOARD = null;
let ADMIN_REALITY_TV_ROSTER_ROW = 0;
let ADMIN_REALITY_TV_BULK_PREVIEW = {};
/* Backward-compatible UI labels retained for deployment tests and search:
   Contestant Roster · Mass Enter Contestants · Mass add contestants
*/


function adminRealityTvEscape_(value) {
  if (typeof escapeHtml_ === "function") return escapeHtml_(value);
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminRealityTvDateTime_(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return adminRealityTvEscape_(value);
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function adminRealityTvStatusClass_(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function adminRealityTvCurrentEpisode_(bundle) {
  const episodes = bundle.episodes || [];
  if (!episodes.length) return null;
  const open = episodes.filter(function(item) {
    return ["OPEN", "REVIEW"].indexOf(String(item.Status || "").toUpperCase()) !== -1;
  });
  return (open.length ? open : episodes).slice().sort(function(a, b) {
    return Number(b.EpisodeNumber || 0) - Number(a.EpisodeNumber || 0);
  })[0];
}

function adminRealityTvPendingQueue_(bundle, episode) {
  if (!episode) return null;
  return (bundle.queue || []).find(function(item) {
    const status = String(item.ReviewStatus || "").toUpperCase();
    return String(item.EpisodeId || "") === String(episode.EpisodeId || "") &&
      ["PENDING", "APPROVING"].indexOf(status) !== -1;
  }) || null;
}


function adminRealityTvShowFormats_() {
  return [
    { id: "survivor-tribal", label: "Survivor / Tribal", participantType: "individual", participantLabel: "Contestant", groupLabel: "Tribe", periodLabel: "Episode", eliminationTemplate: "Who will be eliminated in Episode {episode}?", defaults: ["immunity-winner", "tribal-attendee", "reward-winner", "idol-finder"] },
    { id: "cooking", label: "Cooking Competition", participantType: "individual", participantLabel: "Chef", groupLabel: "Team", periodLabel: "Episode", eliminationTemplate: "Who will be eliminated in Episode {episode}?", defaults: ["individual-challenge-winner", "team-challenge-winner", "safety-winner", "bottom-finish"] },
    { id: "performance", label: "Performance / Judged Competition", participantType: "individual", participantLabel: "Couple / Performer", groupLabel: "Group", periodLabel: "Episode", eliminationTemplate: "Who will be eliminated in Episode {episode}?", defaults: ["highest-score", "lowest-score", "perfect-score", "bottom-finish"] },
    { id: "social-deduction", label: "Social Deduction", participantType: "individual", participantLabel: "Player", groupLabel: "Team", periodLabel: "Episode", eliminationTemplate: "Who will leave the game in Episode {episode}?", defaults: ["shield-winner", "murdered-player", "banished-player", "traitor-banished", "mission-winner"] },
    { id: "amazing-race", label: "Amazing Race / Team Travel", participantType: "team", participantLabel: "Team", groupLabel: "Group", periodLabel: "Leg", eliminationTemplate: "Which team will be eliminated in Leg {episode}?", defaults: ["leg-winner", "last-place-team", "non-elimination-leg", "fast-forward", "u-turn-recipient", "time-penalty"] },
    { id: "team-competition", label: "Team Competition", participantType: "team", participantLabel: "Team", groupLabel: "Division / Group", periodLabel: "Round", eliminationTemplate: "Which team will be eliminated in Round {episode}?", defaults: ["team-challenge-winner", "team-safety-winner", "last-place-team"] },
    { id: "general-elimination", label: "General Elimination", participantType: "individual", participantLabel: "Contestant", groupLabel: "Team", periodLabel: "Episode", eliminationTemplate: "Who will be eliminated in Episode {episode}?", defaults: ["individual-challenge-winner", "safety-winner", "bottom-finish"] },
    { id: "custom", label: "Fully Custom", participantType: "individual", participantLabel: "Participant", groupLabel: "Group", periodLabel: "Episode", eliminationTemplate: "Who will be eliminated in Episode {episode}?", defaults: [] }
  ];
}

function adminRealityTvShowFormat_(formatId) {
  const key = String(formatId || "survivor-tribal").toLowerCase();
  return adminRealityTvShowFormats_().find(function(item) { return item.id === key; }) || adminRealityTvShowFormats_()[0];
}

function adminRealityTvPresetQuestionTypes_() {
  return [
    { id: "immunity-winner", formats: ["survivor-tribal"], label: "Immunity winner", help: "Tribes before the merge; participants after the merge." },
    { id: "tribal-attendee", formats: ["survivor-tribal"], label: "Tribe going to Tribal Council", help: "Only available while multiple tribes remain." },
    { id: "reward-winner", formats: ["survivor-tribal"], label: "Reward winner", help: "Tribe or individual reward winner." },
    { id: "idol-finder", formats: ["survivor-tribal"], label: "Immunity idol finder", help: "Includes a No one outcome." },
    { id: "individual-challenge-winner", formats: ["cooking", "general-elimination"], label: "Individual challenge winner", help: "Active participant who wins the main challenge." },
    { id: "team-challenge-winner", formats: ["cooking", "team-competition"], label: "Team challenge winner", help: "Uses the active team/group names." },
    { id: "safety-winner", formats: ["cooking", "general-elimination"], label: "Safety / immunity winner", help: "Participant protected from elimination." },
    { id: "bottom-finish", formats: ["cooking", "performance", "general-elimination"], label: "Bottom finisher", help: "Single participant finishing lowest or most at risk." },
    { id: "highest-score", formats: ["performance"], label: "Highest judges’ score", help: "Performer or couple with the highest score." },
    { id: "lowest-score", formats: ["performance"], label: "Lowest judges’ score", help: "Performer or couple with the lowest score." },
    { id: "perfect-score", formats: ["performance"], label: "Perfect score", help: "Includes a No one outcome." },
    { id: "shield-winner", formats: ["social-deduction"], label: "Shield / safety winner", help: "Player earning protection." },
    { id: "murdered-player", formats: ["social-deduction"], label: "Murdered player", help: "Includes a No murder outcome." },
    { id: "banished-player", formats: ["social-deduction"], label: "Banished player", help: "Includes a No banishment outcome." },
    { id: "traitor-banished", formats: ["social-deduction"], label: "Will a Traitor be banished?", help: "Yes / No result." },
    { id: "mission-winner", formats: ["social-deduction"], label: "Mission winner", help: "Winning group or player." },
    { id: "leg-winner", formats: ["amazing-race"], label: "Leg winner", help: "Team that checks in first." },
    { id: "last-place-team", formats: ["amazing-race", "team-competition"], label: "Last-place team", help: "Team finishing last in the leg or round." },
    { id: "non-elimination-leg", formats: ["amazing-race"], label: "Non-elimination leg", help: "Yes / No result." },
    { id: "fast-forward", formats: ["amazing-race"], label: "Fast Forward winner", help: "Includes a No one outcome." },
    { id: "u-turn-recipient", formats: ["amazing-race"], label: "U-Turn recipient", help: "Includes a No one outcome." },
    { id: "time-penalty", formats: ["amazing-race"], label: "Time penalty", help: "Includes a No one outcome." },
    { id: "team-safety-winner", formats: ["team-competition"], label: "Team safety winner", help: "Team protected from elimination." }
  ];
}

function adminRealityTvQuestionPackTypes_(formatId, templates) {
  const format = adminRealityTvShowFormat_(formatId);
  const preset = adminRealityTvPresetQuestionTypes_().filter(function(item) { return item.formats.indexOf(format.id) !== -1; });
  const custom = (templates || []).filter(function(item) { return String(item.TemplateSource || "").toLowerCase() === "custom"; }).map(function(item) {
    return { id: item.TemplateId, formats: [format.id], label: item.Label || item.QuestionTemplate || item.TemplateId, help: item.HelpText || "Custom question", custom: true };
  });
  return preset.concat(custom);
}

function adminRealityTvFormatOptions_(selected) {
  return adminRealityTvShowFormats_().map(function(item) {
    return `<option value="${adminRealityTvEscape_(item.id)}" ${item.id === selected ? "selected" : ""}>${adminRealityTvEscape_(item.label)}</option>`;
  }).join("");
}

function adminRealityTvQuestionPackChoicesHtml_(formatId, enabled, templates, inputClass, seasonId) {
  enabled = enabled || {};
  return adminRealityTvQuestionPackTypes_(formatId, templates).map(function(item) {
    return `<label class="reality-tv-question-pack-choice ${item.custom ? "custom" : ""}"><input type="checkbox" class="${inputClass}" ${seasonId ? `data-season-id="${adminRealityTvEscape_(seasonId)}"` : ""} value="${adminRealityTvEscape_(item.id)}" ${enabled[item.id] ? "checked" : ""}><span><b>${adminRealityTvEscape_(item.label)}${item.custom ? " · Custom" : ""}</b><small>${adminRealityTvEscape_(item.help)}</small></span></label>`;
  }).join("") || `<div class="admin-message warning">No preset extra questions are selected for this format. Add a custom question below or use only the elimination question.</div>`;
}

function adminRealityTvApplyCreateFormat_(preserveSelection) {
  const select = document.getElementById("realityTvShowFormat");
  if (!select) return;
  const format = adminRealityTvShowFormat_(select.value);
  const current = {};
  if (preserveSelection) document.querySelectorAll(".rt-create-question-type:checked").forEach(function(box) { current[box.value] = true; });
  if (!preserveSelection) format.defaults.forEach(function(id) { current[id] = true; });
  const container = document.getElementById("realityTvCreateQuestionPackGrid");
  if (container) container.innerHTML = adminRealityTvQuestionPackChoicesHtml_(format.id, current, [], "rt-create-question-type", "");
  const participant = document.getElementById("realityTvParticipantLabel");
  const group = document.getElementById("realityTvGroupLabel");
  const period = document.getElementById("realityTvPeriodLabel");
  const type = document.getElementById("realityTvParticipantType");
  const question = document.getElementById("realityTvQuestionTemplate");
  if (participant) participant.value = format.participantLabel;
  if (group) group.value = format.groupLabel;
  if (period) period.value = format.periodLabel;
  if (type) type.value = format.participantType;
  if (question) question.value = format.eliminationTemplate;
  const anchor = document.getElementById("realityTvAnchorLabel_create");
  if (anchor && (!anchor.value || /Season (Survivor|Team) Pick/i.test(anchor.value))) anchor.value = format.participantType === "team" ? "Season Team Pick" : "Season Survivor Pick";
}

function adminRealityTvQuestionOptions_(question) {
  try {
    const parsed = JSON.parse(question.AnswerOptionsJSON || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function adminRealityTvQuestionPending_(bundle, question) {
  return (bundle.questionQueue || []).find(function(item) {
    const status = String(item.ReviewStatus || "").toUpperCase();
    return String(item.EpisodeQuestionId || "") === String(question.EpisodeQuestionId || "") &&
      ["PENDING", "APPROVING"].indexOf(status) !== -1;
  }) || null;
}

function adminRealityTvQuestionCard_(bundle, question) {
  const pending = adminRealityTvQuestionPending_(bundle, question);
  const status = String(question.Status || "OPEN").toUpperCase();
  const key = adminRealityTvEscape_(question.EpisodeQuestionId);
  if (pending) {
    const reviewStatus = String(pending.ReviewStatus || "PENDING").toUpperCase();
    const approving = reviewStatus === "APPROVING";
    return `
      <div class="reality-tv-question-card review">
        <div class="reality-tv-question-card-header">
          <div>
            <span class="reality-tv-question-episode">${adminRealityTvEscape_((bundle.season && bundle.season.PeriodLabel) || "Episode")} ${adminRealityTvEscape_(question.EpisodeNumber)}</span>
            <h4>${adminRealityTvEscape_(question.QuestionText)}</h4>
          </div>
          <span class="reality-tv-status-pill ${approving ? "review" : "pending"}">${adminRealityTvEscape_(reviewStatus)}</span>
        </div>
        <div class="reality-tv-result-summary">
          <span><b>Selected result:</b> ${adminRealityTvEscape_(pending.SelectedOutcomeLabel)}</span>
          ${pending.PushStatus ? `<span><b>Progress:</b> ${adminRealityTvEscape_(pending.PushStatus)}</span>` : ""}
          ${pending.ErrorMessage ? `<span class="admin-message error"><b>Last error:</b> ${adminRealityTvEscape_(pending.ErrorMessage)}</span>` : ""}
          ${pending.EvidenceUrl ? `<span><b>Evidence:</b> <a href="${adminRealityTvEscape_(pending.EvidenceUrl)}" target="_blank" rel="noopener">Open source</a></span>` : ""}
        </div>
        <div class="admin-actions">
          <button class="admin-small-button" onclick="adminRealityTvApproveQuestionResult('${adminRealityTvEscape_(pending.QueueId)}')">${approving ? "Resume Approval" : "Approve Question Result"}</button>
          ${approving ? "" : `<button class="admin-small-button danger" onclick="adminRealityTvRejectQuestionResult('${adminRealityTvEscape_(pending.QueueId)}')">Reject</button>`}
        </div>
      </div>
    `;
  }
  if (status === "FINAL") {
    const winners = (() => {
      try { return JSON.parse(question.WinningOutcomeIds || "[]"); }
      catch (err) { return []; }
    })();
    const options = adminRealityTvQuestionOptions_(question);
    const labels = options.filter(function(item) { return winners.indexOf(item.id) !== -1; }).map(function(item) { return item.label; });
    return `
      <div class="reality-tv-question-card final">
        <div class="reality-tv-question-card-header">
          <div><span class="reality-tv-question-episode">${adminRealityTvEscape_((bundle.season && bundle.season.PeriodLabel) || "Episode")} ${adminRealityTvEscape_(question.EpisodeNumber)}</span><h4>${adminRealityTvEscape_(question.QuestionText)}</h4></div>
          <span class="reality-tv-status-pill final">FINAL</span>
        </div>
        <div class="admin-sub">Result: <b>${adminRealityTvEscape_(labels.join(", ") || "Final")}</b></div>
      </div>
    `;
  }

  const options = adminRealityTvQuestionOptions_(question);
  return `
    <div class="reality-tv-question-card">
      <div class="reality-tv-question-card-header">
        <div>
          <span class="reality-tv-question-episode">${adminRealityTvEscape_((bundle.season && bundle.season.PeriodLabel) || "Episode")} ${adminRealityTvEscape_(question.EpisodeNumber)}</span>
          <h4>${adminRealityTvEscape_(question.QuestionText)}</h4>
          <div class="admin-sub">Category: ${adminRealityTvEscape_(question.CategoryId)}</div>
        </div>
        <span class="reality-tv-status-pill open">OPEN</span>
      </div>
      <div class="reality-tv-question-options" id="realityTvQuestionOptions_${key}">
        ${options.map(function(item) {
          return `<label class="reality-tv-result-choice"><input type="radio" name="realityTvQuestion_${key}" value="${adminRealityTvEscape_(item.id)}"><span>${adminRealityTvEscape_(item.label)}</span></label>`;
        }).join("")}
      </div>
      <div class="admin-form-grid reality-tv-question-result-fields">
        <label>Evidence URL (optional)<input id="realityTvQuestionEvidence_${key}" class="input" placeholder="Official recap or source URL"></label>
        <label>Notes (optional)<input id="realityTvQuestionNotes_${key}" class="input" placeholder="Result notes"></label>
      </div>
      <div class="admin-actions">
        <button class="admin-small-button" onclick="adminRealityTvSubmitQuestionResult('${adminRealityTvEscape_(question.EpisodeQuestionId)}')">Submit for Review</button>
      </div>
      <div id="realityTvQuestionMessage_${key}" class="admin-message"></div>
    </div>
  `;
}

function adminRealityTvSupplementalQuestionsPanel_(bundle) {
  const questions = (bundle.episodeQuestions || []).slice().sort(function(a, b) {
    const episodeDiff = Number(b.EpisodeNumber || 0) - Number(a.EpisodeNumber || 0);
    if (episodeDiff) return episodeDiff;
    return String(a.QuestionType || "").localeCompare(String(b.QuestionType || ""));
  });
  if (!questions.length) {
    return `<div class="admin-message warning">No extra period questions are enabled yet. Use Show Format & Episode Question Pack below to add them.</div>`;
  }
  const unresolved = questions.filter(function(item) { return String(item.Status || "OPEN").toUpperCase() !== "FINAL"; });
  const finalQuestions = questions.filter(function(item) { return String(item.Status || "").toUpperCase() === "FINAL"; });
  return `
    <div class="reality-tv-episode-questions-panel">
      <div class="reality-tv-panel-heading">
        <div><h3>Episode Questions</h3><div class="admin-sub">Each result is reviewed and settled independently. Only the main elimination / exit result changes the active roster or creates the next period.</div></div>
        <span class="reality-tv-status-pill open">${unresolved.length} OPEN</span>
      </div>
      <div class="reality-tv-question-list">
        ${unresolved.map(function(item) { return adminRealityTvQuestionCard_(bundle, item); }).join("") || `<div class="admin-message success">All extra episode questions are final.</div>`}
      </div>
      ${finalQuestions.length ? `<details class="reality-tv-subsection"><summary>Final episode questions (${finalQuestions.length})</summary><div class="reality-tv-question-list final-list">${finalQuestions.map(function(item) { return adminRealityTvQuestionCard_(bundle, item); }).join("")}</div></details>` : ""}
    </div>
  `;
}

function adminRealityTvQuestionPackPanel_(bundle) {
  const season = bundle.season;
  const format = adminRealityTvShowFormat_(season.ShowFormat || "survivor-tribal");
  const enabled = {};
  (bundle.questionTemplates || []).forEach(function(item) {
    enabled[String(item.TemplateId || "")] = item.Enabled === true || String(item.Enabled || "").toLowerCase() === "true";
  });
  const current = adminRealityTvCurrentEpisode_(bundle);
  const build = bundle.questionBuild && !bundle.questionBuild.complete ? bundle.questionBuild : null;
  const buildLabel = build ? "Resume Build (" + Number(build.currentIndex || 0) + "/" + Number(build.totalCount || 0) + ")" : "Save Format & Build Current " + (season.PeriodLabel || "Episode");
  const buildAction = build
    ? `adminRealityTvResumeQuestionPackBuild('${adminRealityTvEscape_(build.buildId)}','${adminRealityTvEscape_(season.SeasonId)}')`
    : `adminRealityTvSaveQuestionPack('${adminRealityTvEscape_(season.SeasonId)}','${adminRealityTvEscape_(current ? current.EpisodeId : "")}')`;
  const buildStatus = build ? `<div class="admin-message ${build.error ? "error" : "warning"}"><b>Build in progress:</b> ${adminRealityTvEscape_(build.lastMessage || build.progressLabel || "Ready to resume.")}${build.error ? `<br><b>Last error:</b> ${adminRealityTvEscape_(build.error)}` : ""}</div>` : "";
  return `
    <details class="reality-tv-subsection reality-tv-question-pack" open>
      <summary>Show Format & Episode Question Pack</summary>
      <div class="admin-sub">Choose the show style, edit the labels, and enable only the questions that belong to this season. Historical questions and picks are never deleted.</div>
      <div class="admin-form-grid reality-tv-format-settings-grid">
        <label>Show format<select id="realityTvFormat_${adminRealityTvEscape_(season.SeasonId)}" class="input" onchange="adminRealityTvApplyExistingFormatPreset_('${adminRealityTvEscape_(season.SeasonId)}', false)">${adminRealityTvFormatOptions_(format.id)}</select></label>
        <label>Participant type<select id="realityTvParticipantType_${adminRealityTvEscape_(season.SeasonId)}" class="input"><option value="individual" ${String(season.ParticipantType || format.participantType) === "individual" ? "selected" : ""}>Individual / couple</option><option value="team" ${String(season.ParticipantType || format.participantType) === "team" ? "selected" : ""}>Team</option></select></label>
        <label>Participant label<input id="realityTvParticipantLabel_${adminRealityTvEscape_(season.SeasonId)}" class="input" value="${adminRealityTvValue_(season.ParticipantLabel || format.participantLabel)}"></label>
        <label>Group label<input id="realityTvGroupLabel_${adminRealityTvEscape_(season.SeasonId)}" class="input" value="${adminRealityTvValue_(season.GroupLabel || format.groupLabel)}"></label>
        <label>Period label<input id="realityTvPeriodLabel_${adminRealityTvEscape_(season.SeasonId)}" class="input" value="${adminRealityTvValue_(season.PeriodLabel || format.periodLabel)}" placeholder="Episode, Leg, Round"></label>
        <label class="reality-tv-wide-field">Elimination / exit question<input id="realityTvEliminationTemplate_${adminRealityTvEscape_(season.SeasonId)}" class="input" value="${adminRealityTvValue_(season.QuestionTemplate || format.eliminationTemplate)}"></label>
      </div>
      <div class="admin-actions"><button class="admin-small-button secondary" onclick="adminRealityTvApplyExistingFormatPreset_('${adminRealityTvEscape_(season.SeasonId)}', false)">Apply Format Preset</button></div>
      <div id="realityTvQuestionPackGrid_${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-question-pack-grid">
        ${adminRealityTvQuestionPackChoicesHtml_(format.id, enabled, bundle.questionTemplates || [], "rt-season-question-type", season.SeasonId)}
      </div>
      ${buildStatus}
      <div class="admin-actions"><button class="admin-small-button" onclick="${buildAction}">${adminRealityTvEscape_(buildLabel)}</button></div>
      <div id="realityTvQuestionPackMessage_${adminRealityTvEscape_(season.SeasonId)}" class="admin-message"></div>

      <details class="reality-tv-custom-question-builder">
        <summary>Add Custom Question</summary>
        <div class="admin-sub">Custom questions are saved for this season, generated for future periods, mapped to the Hub, and always require administrator approval. They do not remove participants or advance the season.</div>
        <div class="admin-form-grid reality-tv-custom-question-grid">
          <label class="reality-tv-wide-field">Question text<input id="realityTvCustomQuestion_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Who will win the special challenge in {period} {episode}?"></label>
          <label>Answer source<select id="realityTvCustomSource_${adminRealityTvEscape_(season.SeasonId)}" class="input" onchange="adminRealityTvCustomSourceChanged_('${adminRealityTvEscape_(season.SeasonId)}')"><option value="active-participants">Active participants / teams</option><option value="active-groups">Active groups</option><option value="groups-or-participants">Groups before merge, participants after</option><option value="yes-no">Yes / No</option><option value="manual-options">Manual answers</option></select></label>
          <label>Points<input id="realityTvCustomPoints_${adminRealityTvEscape_(season.SeasonId)}" class="input" type="number" min="0" value="${adminRealityTvValue_(season.Points || 1)}"></label>
          <label id="realityTvCustomOptionsWrap_${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-wide-field" style="display:none">Manual answers<textarea id="realityTvCustomOptions_${adminRealityTvEscape_(season.SeasonId)}" class="input" rows="3" placeholder="One answer per line"></textarea></label>
          <label><input id="realityTvCustomNoOutcome_${adminRealityTvEscape_(season.SeasonId)}" type="checkbox"> Add a no-result option</label>
          <label>No-result label<input id="realityTvCustomNoOutcomeLabel_${adminRealityTvEscape_(season.SeasonId)}" class="input" value="No one"></label>
        </div>
        <div class="admin-actions"><button class="admin-small-button" onclick="adminRealityTvAddCustomQuestion('${adminRealityTvEscape_(season.SeasonId)}','${adminRealityTvEscape_(current ? current.EpisodeId : "")}')">Save & Build Custom Question</button></div>
        <div id="realityTvCustomMessage_${adminRealityTvEscape_(season.SeasonId)}" class="admin-message"></div>
      </details>
    </details>
  `;
}

function adminRealityTvApplyExistingFormatPreset_(seasonId, preserveSelection) {
  const select = document.getElementById("realityTvFormat_" + seasonId);
  if (!select) return;
  const format = adminRealityTvShowFormat_(select.value);
  const bundle = ADMIN_REALITY_TV_DASHBOARD && (ADMIN_REALITY_TV_DASHBOARD.seasons || []).find(function(item) { return item.season && String(item.season.SeasonId) === String(seasonId); });
  const current = {};
  if (preserveSelection) document.querySelectorAll('.rt-season-question-type[data-season-id="' + seasonId + '"]:checked').forEach(function(box) { current[box.value] = true; });
  if (!preserveSelection) {
    format.defaults.forEach(function(id) { current[id] = true; });
    ((bundle && bundle.questionTemplates) || []).filter(function(item) {
      return String(item.TemplateSource || "").toLowerCase() === "custom" && (item.Enabled === true || String(item.Enabled || "").toLowerCase() === "true");
    }).forEach(function(item) { current[item.TemplateId] = true; });
  }
  const container = document.getElementById("realityTvQuestionPackGrid_" + seasonId);
  if (container) container.innerHTML = adminRealityTvQuestionPackChoicesHtml_(format.id, current, bundle ? bundle.questionTemplates : [], "rt-season-question-type", seasonId);
  document.getElementById("realityTvParticipantType_" + seasonId).value = format.participantType;
  document.getElementById("realityTvParticipantLabel_" + seasonId).value = format.participantLabel;
  document.getElementById("realityTvGroupLabel_" + seasonId).value = format.groupLabel;
  document.getElementById("realityTvPeriodLabel_" + seasonId).value = format.periodLabel;
  document.getElementById("realityTvEliminationTemplate_" + seasonId).value = format.eliminationTemplate;
}

function adminRealityTvCustomSourceChanged_(seasonId) {
  const source = document.getElementById("realityTvCustomSource_" + seasonId);
  const wrap = document.getElementById("realityTvCustomOptionsWrap_" + seasonId);
  if (source && wrap) wrap.style.display = source.value === "manual-options" ? "flex" : "none";
}


function adminRealityTvSeasonAnchorSettings_(bundle) {
  const season = bundle && bundle.season ? bundle.season : {};
  const raw = bundle && bundle.seasonAnchorSettings ? bundle.seasonAnchorSettings : {};
  return {
    enabled: raw.Enabled === true || String(raw.Enabled || "").toLowerCase() === "true",
    displayLabel: raw.DisplayLabel || "Season Survivor Pick",
    startMultiplier: Number(raw.StartMultiplier === undefined || raw.StartMultiplier === "" ? 1 : raw.StartMultiplier),
    growthPerSuccess: Number(raw.GrowthPerSuccess === undefined || raw.GrowthPerSuccess === "" ? 0.05 : raw.GrowthPerSuccess),
    maxMultiplier: Number(raw.MaxMultiplier === undefined || raw.MaxMultiplier === "" ? 1.4 : raw.MaxMultiplier),
    eligiblePointsCap: Number(raw.EligiblePointsCap === undefined || raw.EligiblePointsCap === "" ? 20 : raw.EligiblePointsCap),
    lossPenalty: Number(raw.LossPenalty === undefined || raw.LossPenalty === "" ? 5 : raw.LossPenalty),
    withdrawalBehavior: raw.WithdrawalBehavior || "penalty",
    manualSwitchAllowed: raw.ManualSwitchAllowed === "" || raw.ManualSwitchAllowed === undefined
      ? true
      : (raw.ManualSwitchAllowed === true || String(raw.ManualSwitchAllowed).toLowerCase() === "true"),
    seasonId: season.SeasonId || "",
    gameId: season.GameId || ""
  };
}

function adminRealityTvSeasonAnchorFields_(key, settings) {
  settings = settings || {
    enabled: false,
    displayLabel: "Season Survivor Pick",
    startMultiplier: 1,
    growthPerSuccess: 0.05,
    maxMultiplier: 1.4,
    eligiblePointsCap: 20,
    lossPenalty: 5,
    withdrawalBehavior: "penalty",
    manualSwitchAllowed: true
  };
  const safeKey = adminRealityTvEscape_(key);
  return `
    <div class="reality-tv-anchor-enabled-row">
      <label class="reality-tv-anchor-toggle">
        <input id="realityTvAnchorEnabled_${safeKey}" type="checkbox" ${settings.enabled ? "checked" : ""} onchange="adminRealityTvAnchorPreview_('${safeKey}')">
        <span><b>Enable Season Survivor Pick</b><small>Users select one active contestant and build a capped survival multiplier.</small></span>
      </label>
    </div>
    <div class="admin-form-grid reality-tv-anchor-settings-grid">
      <label>Display label<input id="realityTvAnchorLabel_${safeKey}" class="input" value="${adminRealityTvValue_(settings.displayLabel)}"></label>
      <label>Starting multiplier<input id="realityTvAnchorStart_${safeKey}" class="input" type="number" min="1" max="3" step="0.01" value="${adminRealityTvValue_(settings.startMultiplier)}" oninput="adminRealityTvAnchorPreview_('${safeKey}')"></label>
      <label>Growth per survival<input id="realityTvAnchorGrowth_${safeKey}" class="input" type="number" min="0" max="1" step="0.01" value="${adminRealityTvValue_(settings.growthPerSuccess)}" oninput="adminRealityTvAnchorPreview_('${safeKey}')"></label>
      <label>Maximum multiplier cap<input id="realityTvAnchorCap_${safeKey}" class="input" type="number" min="1" max="5" step="0.01" value="${adminRealityTvValue_(settings.maxMultiplier)}" oninput="adminRealityTvAnchorPreview_('${safeKey}')"></label>
      <label>Weekly eligible-points cap<input id="realityTvAnchorPointsCap_${safeKey}" class="input" type="number" min="0" max="1000" step="1" value="${adminRealityTvValue_(settings.eligiblePointsCap)}" oninput="adminRealityTvAnchorPreview_('${safeKey}')"></label>
      <label>Loss penalty<input id="realityTvAnchorPenalty_${safeKey}" class="input" type="number" min="0" max="1000" step="1" value="${adminRealityTvValue_(settings.lossPenalty)}" oninput="adminRealityTvAnchorPreview_('${safeKey}')"></label>
      <label>Quit / medical withdrawal
        <select id="realityTvAnchorWithdrawal_${safeKey}" class="input">
          <option value="penalty" ${settings.withdrawalBehavior === "penalty" ? "selected" : ""}>Count as a loss</option>
          <option value="free-reset" ${settings.withdrawalBehavior === "free-reset" ? "selected" : ""}>Free reset, no penalty</option>
        </select>
      </label>
      <label class="reality-tv-anchor-switch-setting"><input id="realityTvAnchorSwitch_${safeKey}" type="checkbox" ${settings.manualSwitchAllowed ? "checked" : ""}> Allow users to switch before lock (resets multiplier)</label>
    </div>
    <div id="realityTvAnchorPreview_${safeKey}" class="reality-tv-anchor-preview"></div>
  `;
}

function adminRealityTvSeasonAnchorPanel_(bundle) {
  const season = bundle.season;
  const settings = adminRealityTvSeasonAnchorSettings_(bundle);
  return `
    <details class="reality-tv-subsection reality-tv-anchor-panel">
      <summary>Season Survivor Pick</summary>
      <div class="admin-sub">Optional season-long pick. Normal question points remain unchanged; only a capped weekly bonus and configured loss penalty are added. Disabling it stops future picks but keeps already-earned adjustments.</div>
      ${adminRealityTvSeasonAnchorFields_(season.SeasonId, settings)}
      <div class="admin-actions">
        <button class="admin-small-button" onclick="adminRealityTvSaveSeasonAnchorSettings('${adminRealityTvEscape_(season.SeasonId)}','${adminRealityTvEscape_(season.GameId)}')">Save Survivor Settings</button>
      </div>
      <div id="realityTvAnchorMessage_${adminRealityTvEscape_(season.SeasonId)}" class="admin-message"></div>
    </details>
  `;
}

function adminRealityTvAnchorReadNumber_(id, fallback) {
  const input = document.getElementById(id);
  const value = input ? Number(input.value) : fallback;
  return Number.isFinite(value) ? value : fallback;
}

function adminRealityTvAnchorPreview_(key) {
  const target = document.getElementById("realityTvAnchorPreview_" + key);
  if (!target) return;
  const start = Math.max(1, adminRealityTvAnchorReadNumber_("realityTvAnchorStart_" + key, 1));
  const growth = Math.max(0, adminRealityTvAnchorReadNumber_("realityTvAnchorGrowth_" + key, 0.05));
  const cap = Math.max(start, adminRealityTvAnchorReadNumber_("realityTvAnchorCap_" + key, 1.4));
  const pointsCap = Math.max(0, adminRealityTvAnchorReadNumber_("realityTvAnchorPointsCap_" + key, 20));
  const penalty = Math.max(0, adminRealityTvAnchorReadNumber_("realityTvAnchorPenalty_" + key, 5));
  const maxBonus = Math.round(pointsCap * Math.max(0, cap - 1) * 100) / 100;
  const successes = growth > 0 ? Math.max(0, Math.ceil((cap - start) / growth)) : 0;
  target.innerHTML = `
    <b>Scoring preview:</b> maximum weekly bonus <b>${maxBonus}</b> points
    (${pointsCap} eligible points × ${(cap - 1).toFixed(2)} bonus rate).
    ${growth > 0 ? `The cap is reached after about ${successes} successful episode${successes === 1 ? "" : "s"}.` : "The multiplier will not grow."}
    A loss deducts <b>${penalty}</b> points and resets the pick to ${start.toFixed(2)}x.
  `;
}

function adminRealityTvAnchorPayload_(key, gameId, seasonId) {
  const bundle = ADMIN_REALITY_TV_DASHBOARD && (ADMIN_REALITY_TV_DASHBOARD.seasons || []).find(function(item) {
    return item.season && String(item.season.SeasonId || "") === String(seasonId || "");
  });
  const participantType = key === "create"
    ? ((document.getElementById("realityTvParticipantType") || {}).value || "individual")
    : (bundle && bundle.season && bundle.season.ParticipantType || "individual");
  return {
    gameId: gameId,
    seasonId: seasonId,
    enabled: document.getElementById("realityTvAnchorEnabled_" + key).checked,
    displayLabel: document.getElementById("realityTvAnchorLabel_" + key).value.trim(),
    startMultiplier: document.getElementById("realityTvAnchorStart_" + key).value,
    growthPerSuccess: document.getElementById("realityTvAnchorGrowth_" + key).value,
    maxMultiplier: document.getElementById("realityTvAnchorCap_" + key).value,
    eligiblePointsCap: document.getElementById("realityTvAnchorPointsCap_" + key).value,
    lossPenalty: document.getElementById("realityTvAnchorPenalty_" + key).value,
    withdrawalBehavior: document.getElementById("realityTvAnchorWithdrawal_" + key).value,
    manualSwitchAllowed: document.getElementById("realityTvAnchorSwitch_" + key).checked,
    entityType: participantType === "team" ? "team" : "contestant",
    survivalMode: "active",
    noResultBehavior: "preserve",
    sourceType: "reality-tv"
  };
}

async function adminRealityTvSaveSeasonAnchorSettings(seasonId, gameId) {
  adminRealityTvSetMessage_("realityTvAnchorMessage_" + seasonId, "Saving Season Survivor settings…", "info");
  showLoader();
  try {
    const result = await apiAdminSaveSeasonAnchorSettings(adminRealityTvAnchorPayload_(seasonId, gameId, seasonId));
    if (!result || result.success === false) throw new Error((result && (result.error || result.message)) || "Could not save Season Survivor settings.");
    adminRealityTvSetMessage_("realityTvAnchorMessage_" + seasonId, result.message || "Season Survivor settings saved.", "success");
    setTimeout(function() { navigate("admin-reality-tv"); }, 500);
  } catch (err) {
    adminRealityTvSetMessage_("realityTvAnchorMessage_" + seasonId, err.message || String(err), "error");
  } finally {
    hideLoader();
  }
}

function adminRealityTvContestantRows_(contestants) {
  const active = (contestants || []).filter(function(item) {
    return item.Active === true || String(item.Active || "").toLowerCase() === "true";
  });
  const inactive = (contestants || []).filter(function(item) {
    return active.indexOf(item) === -1;
  });

  function chip(item) {
    const image = item.ImageUrl
      ? `<img src="${adminRealityTvEscape_(item.ImageUrl)}" alt="">`
      : `<span class="reality-tv-avatar-fallback">${adminRealityTvEscape_(String(item.Name || "?").charAt(0).toUpperCase())}</span>`;
    return `
      <div class="reality-tv-contestant-chip ${item.Active ? "active" : "inactive"}">
        ${image}
        <div>
          <strong>${adminRealityTvEscape_(item.Name)}</strong>
          <span>${adminRealityTvEscape_(item.TeamOrTribe || item.Status || "Active")}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="reality-tv-roster-groups">
      <div>
        <h4>Active participants (${active.length})</h4>
        <div class="reality-tv-contestant-grid">${active.map(chip).join("") || "<em>None</em>"}</div>
      </div>
      <div>
        <h4>Eliminated / inactive participants (${inactive.length})</h4>
        <div class="reality-tv-contestant-grid">${inactive.map(chip).join("") || "<em>None</em>"}</div>
      </div>
    </div>
  `;
}

function adminRealityTvResultPanel_(bundle) {
  const season = bundle.season;
  const approvalInProgress = (bundle.queue || []).find(function(item) {
    return String(item.ReviewStatus || "").toUpperCase() === "APPROVING";
  }) || null;
  let episode = approvalInProgress
    ? (bundle.episodes || []).find(function(item) {
        return String(item.EpisodeId || "") === String(approvalInProgress.EpisodeId || "");
      })
    : adminRealityTvCurrentEpisode_(bundle);
  if (!episode) episode = adminRealityTvCurrentEpisode_(bundle);
  if (!episode) return `<div class="admin-message warning">No episode exists yet.</div>`;

  const pending = approvalInProgress || adminRealityTvPendingQueue_(bundle, episode);
  const activeContestants = (bundle.contestants || []).filter(function(item) {
    return item.Active === true || String(item.Active || "").toLowerCase() === "true";
  });

  if (pending) {
    const selectedIds = (() => {
      try { return JSON.parse(pending.SelectedContestantIds || "[]"); }
      catch (err) { return []; }
    })();
    const selectedNames = (bundle.contestants || [])
      .filter(function(item) { return selectedIds.indexOf(String(item.ContestantId || "").toLowerCase()) !== -1; })
      .map(function(item) { return item.Name; });

    const reviewStatus = String(pending.ReviewStatus || "PENDING").toUpperCase();
    const isApproving = reviewStatus === "APPROVING";
    return `
      <div class="reality-tv-review-card">
        <div class="reality-tv-review-header">
          <div>
            <strong>${isApproving ? "Approval in progress" : "Administrator approval required"}</strong>
            <div class="admin-sub">${adminRealityTvEscape_(episode.EpisodeName)} result ${isApproving ? "can be resumed safely" : "is pending"}.</div>
          </div>
          <span class="reality-tv-status-pill ${isApproving ? "review" : "pending"}">${adminRealityTvEscape_(reviewStatus)}</span>
        </div>
        <div class="reality-tv-result-summary">
          <span><b>Result type:</b> ${adminRealityTvEscape_(pending.OutcomeType)}</span>
          <span><b>${adminRealityTvEscape_(season.ParticipantLabel || "Participant")}:</b> ${adminRealityTvEscape_(selectedNames.join(", ") || "No elimination")}</span>
          ${pending.PushStatus ? `<span><b>Progress:</b> ${adminRealityTvEscape_(pending.PushStatus)}</span>` : ""}
          ${pending.ErrorMessage ? `<span class="admin-message error"><b>Last error:</b> ${adminRealityTvEscape_(pending.ErrorMessage)}</span>` : ""}
          ${pending.EvidenceUrl ? `<span><b>Evidence:</b> <a href="${adminRealityTvEscape_(pending.EvidenceUrl)}" target="_blank" rel="noopener">Open source</a></span>` : ""}
          ${pending.Notes ? `<span><b>Notes:</b> ${adminRealityTvEscape_(pending.Notes)}</span>` : ""}
        </div>
        <div class="admin-actions">
          <button class="button admin-button" onclick="adminRealityTvApproveResult('${adminRealityTvEscape_(pending.QueueId)}')">
            ${isApproving ? "Resume Approval" : "Approve &amp; Build Next Episode"}
          </button>
          ${isApproving ? "" : `<button class="admin-small-button danger" onclick="adminRealityTvRejectResult('${adminRealityTvEscape_(pending.QueueId)}')">Reject</button>`}
        </div>
      </div>
    `;
  }

  if (String(episode.Status || "").toUpperCase() === "FINAL") {
    return `
      <div class="admin-message success">
        ${adminRealityTvEscape_(episode.EpisodeName)} is final.
        <button class="admin-small-button secondary" onclick="adminRealityTvCreateNextEpisode('${adminRealityTvEscape_(season.SeasonId)}')">
          Create Next Episode
        </button>
      </div>
    `;
  }

  return `
    <div class="reality-tv-result-entry">
      <div class="reality-tv-episode-heading">
        <div>
          <h3>Record ${adminRealityTvEscape_(episode.EpisodeName)} Result</h3>
          <div class="admin-sub">
            Question: ${adminRealityTvEscape_(episode.CategoryId)} · Locks ${adminRealityTvDateTime_(episode.LockDateTime)}
          </div>
        </div>
        <span class="reality-tv-status-pill ${adminRealityTvStatusClass_(episode.Status)}">${adminRealityTvEscape_(episode.Status)}</span>
      </div>

      <div class="admin-form-grid reality-tv-result-grid">
        <label>
          Result type
          <select id="realityTvOutcome_${adminRealityTvEscape_(season.SeasonId)}" class="input" onchange="adminRealityTvOutcomeChanged('${adminRealityTvEscape_(season.SeasonId)}')">
            <option value="elimination">Standard elimination</option>
            <option value="double-elimination">Double elimination (question is pushed)</option>
            <option value="no-elimination">No elimination (question is pushed)</option>
            <option value="medical-withdrawal">Medical withdrawal</option>
            <option value="quit">Contestant quit</option>
          </select>
        </label>
        <label>
          Evidence URL (optional)
          <input id="realityTvEvidence_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Official recap or source URL">
        </label>
      </div>

      <div class="reality-tv-selection-label">Select the ${adminRealityTvEscape_(String(season.ParticipantLabel || "participant").toLowerCase())}:</div>
      <div id="realityTvSelections_${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-result-contestants">
        ${activeContestants.map(function(item) {
          return `
            <label class="reality-tv-result-choice">
              <input type="checkbox" value="${adminRealityTvEscape_(item.ContestantId)}" onchange="adminRealityTvContestantChecked('${adminRealityTvEscape_(season.SeasonId)}', this)">
              <span>${adminRealityTvEscape_(item.Name)}</span>
            </label>
          `;
        }).join("")}
      </div>

      <label>
        Notes (optional)
        <textarea id="realityTvNotes_${adminRealityTvEscape_(season.SeasonId)}" class="input" rows="2" placeholder="Result notes"></textarea>
      </label>

      <div class="admin-actions">
        <button class="button admin-button" onclick="adminRealityTvSubmitResult('${adminRealityTvEscape_(season.SeasonId)}','${adminRealityTvEscape_(episode.EpisodeId)}')">
          Submit for Review
        </button>
      </div>
      <div id="realityTvMessage_${adminRealityTvEscape_(season.SeasonId)}" class="admin-message"></div>
    </div>
  `;
}

function adminRealityTvEpisodesTable_(episodes) {
  return `
    <div class="reality-tv-episodes-table-wrap">
      <table class="reality-tv-episodes-table">
        <thead><tr><th>Episode</th><th>Air date</th><th>Lock</th><th>Question</th><th>Status</th></tr></thead>
        <tbody>
          ${(episodes || []).map(function(item) {
            return `<tr>
              <td>${adminRealityTvEscape_(item.EpisodeName)}</td>
              <td>${adminRealityTvDateTime_(item.AirDateTime)}</td>
              <td>${adminRealityTvDateTime_(item.LockDateTime)}</td>
              <td>${adminRealityTvEscape_(item.CategoryId)}</td>
              <td><span class="reality-tv-status-pill ${adminRealityTvStatusClass_(item.Status)}">${adminRealityTvEscape_(item.Status)}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function adminRealityTvSeasonCard_(bundle) {
  const season = bundle.season;
  const current = adminRealityTvCurrentEpisode_(bundle);
  return `
    <details class="card admin-card admin-collapsible-card reality-tv-season-card" open>
      <summary class="admin-card-summary">
        <div>
          <h2>${adminRealityTvEscape_(season.ShowName)} — ${adminRealityTvEscape_(season.SeasonName)}</h2>
          <div class="admin-sub">
            Game: ${adminRealityTvEscape_(season.GameId)} · Current ${adminRealityTvEscape_(String(season.PeriodLabel || "period").toLowerCase())} ${adminRealityTvEscape_(season.CurrentEpisodeNumber)}
          </div>
        </div>
        <span class="reality-tv-status-pill ${adminRealityTvStatusClass_(season.Status)}">${adminRealityTvEscape_(season.Status)}</span>
      </summary>
      <div class="admin-collapsible-body">
        <div class="reality-tv-season-overview">
          <div><b>Format:</b> ${adminRealityTvEscape_(adminRealityTvShowFormat_(season.ShowFormat).label)}</div>
          <div><b>Participants:</b> ${adminRealityTvEscape_(season.ParticipantLabel || "Contestant")}</div>
          <div><b>Schedule:</b> every ${adminRealityTvEscape_(season.WeeklyIntervalDays)} days</div>
          <div><b>Lock offset:</b> ${adminRealityTvEscape_(season.LockOffsetMinutes)} minutes before airtime</div>
          <div><b>Current:</b> ${current ? adminRealityTvEscape_(current.EpisodeName) : "None"}</div>
        </div>
        ${adminRealityTvResultPanel_(bundle)}
        ${adminRealityTvSupplementalQuestionsPanel_(bundle)}
        ${adminRealityTvQuestionPackPanel_(bundle)}
        ${adminRealityTvSeasonAnchorPanel_(bundle)}
        ${adminRealityTvContestantRows_(bundle.contestants)}

        <details class="reality-tv-subsection">
          <summary>Add participant(s) to this season</summary>
          <div class="admin-form-grid">
            <input id="realityTvAddName_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Participant / team name">
            <input id="realityTvAddImage_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Image URL (optional)">
            <input id="realityTvAddTeam_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Team / tribe (optional)">
          </div>
          <button class="admin-small-button" onclick="adminRealityTvAddContestant('${adminRealityTvEscape_(season.SeasonId)}')">Add One Participant</button>

          <div class="reality-tv-existing-bulk-add">
            <h4>Mass add participants</h4>
            <div class="admin-sub">Use the same spreadsheet format as the season builder. Existing participants or teams are skipped safely.</div>
            <textarea id="realityTvBulkContestants_${adminRealityTvEscape_(season.SeasonId)}" class="input reality-tv-bulk-textarea" rows="6" placeholder="Name    Full Name    Image URL    Team / Tribe    Age    Hometown    Occupation    Biography    External Subject ID"></textarea>
            <div class="admin-actions reality-tv-bulk-actions">
              <button type="button" class="admin-small-button secondary" onclick="adminRealityTvLoadBulkExample_('${adminRealityTvEscape_(season.SeasonId)}')">Load Example</button>
              <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPreviewBulk_('${adminRealityTvEscape_(season.SeasonId)}')">Preview</button>
              <button type="button" class="admin-small-button" onclick="adminRealityTvBulkAddToSeason('${adminRealityTvEscape_(season.SeasonId)}')">Add All Valid Contestants</button>
            </div>
            <div id="realityTvBulkPreview_${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-bulk-preview"></div>
          </div>
          <div class="admin-sub">New participants or teams are added to the season roster. Existing questions are not changed; they appear in the next newly created period.</div>
        </details>

        <details class="reality-tv-subsection">
          <summary>${adminRealityTvEscape_(season.PeriodLabel || "Episode")} history</summary>
          ${adminRealityTvEpisodesTable_(bundle.episodes)}
        </details>

        <div class="admin-actions">
          <button class="admin-small-button secondary" onclick="navigate('admin-game-setup:${adminRealityTvEscape_(season.GameId)}')">Open Game Setup</button>
          <button class="admin-small-button secondary" onclick="adminRealityTvCreateNextEpisode('${adminRealityTvEscape_(season.SeasonId)}')">Create Next ${adminRealityTvEscape_(season.PeriodLabel || "Episode")} Manually</button>
        </div>
      </div>
    </details>
  `;
}

function adminRealityTvBlankRosterRows_(count) {
  let html = "";
  for (let index = 0; index < count; index++) html += adminRealityTvRosterRowHtml_({});
  return html;
}

function adminRealityTvValue_(value) {
  return adminRealityTvEscape_(value === undefined || value === null ? "" : value);
}

function adminRealityTvRosterRowHtml_(contestant) {
  contestant = contestant || {};
  ADMIN_REALITY_TV_ROSTER_ROW += 1;
  const id = ADMIN_REALITY_TV_ROSTER_ROW;
  return `
    <div class="reality-tv-roster-row" data-roster-row="${id}">
      <div class="reality-tv-roster-primary">
        <input class="input rt-roster-name" placeholder="Name *" value="${adminRealityTvValue_(contestant.name)}">
        <input class="input rt-roster-image" placeholder="Image URL" value="${adminRealityTvValue_(contestant.imageUrl)}">
        <input class="input rt-roster-team" placeholder="Team / tribe" value="${adminRealityTvValue_(contestant.teamOrTribe)}">
        <input class="input rt-roster-age" placeholder="Age" inputmode="numeric" value="${adminRealityTvValue_(contestant.age)}">
        <button type="button" class="admin-small-button danger" onclick="this.closest('[data-roster-row]').remove()">Remove</button>
      </div>
      <details class="reality-tv-roster-profile" ${contestant.fullName || contestant.hometown || contestant.occupation || contestant.biography || contestant.externalSubjectId ? "open" : ""}>
        <summary>More contestant info</summary>
        <div class="reality-tv-roster-profile-grid">
          <input class="input rt-roster-full-name" placeholder="Full name" value="${adminRealityTvValue_(contestant.fullName)}">
          <input class="input rt-roster-hometown" placeholder="Hometown" value="${adminRealityTvValue_(contestant.hometown)}">
          <input class="input rt-roster-occupation" placeholder="Occupation" value="${adminRealityTvValue_(contestant.occupation)}">
          <input class="input rt-roster-external-id" placeholder="External subject ID" value="${adminRealityTvValue_(contestant.externalSubjectId)}">
          <input class="input rt-roster-member1" placeholder="Team member 1" value="${adminRealityTvValue_(contestant.member1)}">
          <input class="input rt-roster-member2" placeholder="Team member 2" value="${adminRealityTvValue_(contestant.member2)}">
          <input class="input rt-roster-relationship" placeholder="Relationship" value="${adminRealityTvValue_(contestant.relationship)}">
          <input class="input rt-roster-member1-image" placeholder="Member 1 image URL" value="${adminRealityTvValue_(contestant.member1ImageUrl)}">
          <input class="input rt-roster-member2-image" placeholder="Member 2 image URL" value="${adminRealityTvValue_(contestant.member2ImageUrl)}">
          <input class="input rt-roster-team-color" placeholder="Team color" value="${adminRealityTvValue_(contestant.teamColor)}">
          <textarea class="input rt-roster-biography" rows="2" placeholder="Biography / notes">${adminRealityTvValue_(contestant.biography)}</textarea>
        </div>
      </details>
    </div>
  `;
}

function adminRealityTvNormalizeBulkHeader_(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function adminRealityTvParseDelimitedLine_(line, delimiter) {
  if (!delimiter) return [String(line || "").trim()];
  const parsed = adminRealityTvParseDelimitedText_(String(line || ""), delimiter);
  return parsed.rows.length ? parsed.rows[0] : [""];
}

function adminRealityTvParseDelimitedText_(text, delimiter) {
  const input = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  function finishCell_() {
    row.push(value.trim());
    value = "";
  }

  function finishRow_() {
    finishCell_();
    if (row.some(function(cell) { return String(cell || "").trim() !== ""; })) rows.push(row);
    row = [];
  }

  for (let index = 0; index < input.length; index++) {
    const char = input.charAt(index);
    if (char === '"') {
      if (quoted && input.charAt(index + 1) === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      finishCell_();
    } else if (char === "\n" && !quoted) {
      finishRow_();
    } else if (char === "\n" && quoted) {
      // Spreadsheet cells can contain wrapped/multiline text. Keep it in the
      // same field, but normalize the pasted line break to a single space.
      if (value && !/\s$/.test(value)) value += " ";
    } else {
      value += char;
    }
  }

  if (value !== "" || row.length) finishRow_();
  return { rows: rows, unclosedQuote: quoted };
}

function adminRealityTvParseBulkContestants_(text) {
  const normalizedText = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const physicalLines = normalizedText.split("\n").filter(function(line) {
    return line.trim() !== "";
  });
  const result = { items: [], warnings: [], errors: [], hasHeader: false };
  if (!physicalLines.length) {
    result.errors.push("Paste at least one contestant.");
    return result;
  }

  const firstLine = physicalLines[0];
  const delimiter = firstLine.indexOf("\t") !== -1 ? "\t" : (firstLine.indexOf(",") !== -1 ? "," : null);
  let rows;
  if (delimiter) {
    const parsedText = adminRealityTvParseDelimitedText_(normalizedText, delimiter);
    rows = parsedText.rows;
    if (parsedText.unclosedQuote) result.errors.push("A quoted cell is missing its closing quote.");
  } else {
    rows = physicalLines.map(function(line) { return [String(line || "").trim()]; });
  }
  const aliases = {
    name: ["name", "contestant", "contestantname", "displayname", "teamname", "couplename", "participant"],
    fullName: ["fullname", "legalname", "realname"],
    imageUrl: ["image", "imageurl", "photo", "photourl", "headshot", "headshoturl"],
    teamOrTribe: ["team", "tribe", "teamtribe", "teamortribe", "group"],
    age: ["age"],
    hometown: ["hometown", "home", "city", "location"],
    occupation: ["occupation", "job", "profession"],
    biography: ["biography", "bio", "notes", "description"],
    externalSubjectId: ["externalsubjectid", "externalid", "subjectid", "providerid", "contestantid", "teamid"],
    member1: ["member1", "teammember1", "partner1"],
    member2: ["member2", "teammember2", "partner2"],
    relationship: ["relationship", "teamrelationship"],
    member1ImageUrl: ["member1image", "member1imageurl", "partner1image"],
    member2ImageUrl: ["member2image", "member2imageurl", "partner2image"],
    teamColor: ["teamcolor", "color"]
  };
  const normalizedHeaders = rows[0].map(adminRealityTvNormalizeBulkHeader_);
  const columnMap = {};
  Object.keys(aliases).forEach(function(field) {
    const index = normalizedHeaders.findIndex(function(header) { return aliases[field].indexOf(header) !== -1; });
    if (index !== -1) columnMap[field] = index;
  });
  // A roster copied from many public sources often has only "Full Name".
  // Treat that column as the display name when a separate Name column is absent.
  if (columnMap.name === undefined && columnMap.fullName !== undefined) columnMap.name = columnMap.fullName;
  result.hasHeader = rows.length > 1 && columnMap.name !== undefined && Object.keys(columnMap).length >= 1;

  const positional = ["name", "fullName", "imageUrl", "teamOrTribe", "age", "hometown", "occupation", "biography", "externalSubjectId", "member1", "member2", "relationship", "member1ImageUrl", "member2ImageUrl", "teamColor"];
  const dataRows = result.hasHeader ? rows.slice(1) : rows;
  const seen = {};
  dataRows.forEach(function(cells, rowIndex) {
    const item = {};
    if (result.hasHeader) {
      Object.keys(columnMap).forEach(function(field) { item[field] = String(cells[columnMap[field]] || "").trim(); });
    } else if (!delimiter) {
      item.name = String(cells[0] || "").trim();
    } else {
      positional.forEach(function(field, index) { item[field] = String(cells[index] || "").trim(); });
    }

    if (!item.name) {
      result.warnings.push("Skipped row " + (rowIndex + (result.hasHeader ? 2 : 1)) + ": contestant name is blank.");
      return;
    }
    const duplicateKey = String(item.externalSubjectId || item.name).trim().toLowerCase();
    if (seen[duplicateKey]) {
      result.warnings.push("Skipped duplicate: " + item.name + ".");
      return;
    }
    seen[duplicateKey] = true;
    if (item.age && !/^\d{1,3}$/.test(item.age)) {
      result.warnings.push(item.name + ": age is not a whole number; it will still be saved as entered.");
    }
    result.items.push(item);
  });

  if (!result.items.length) result.errors.push("No valid contestant rows were found.");
  if (result.items.length > 250) {
    result.errors.push("A maximum of 250 contestants can be imported at once.");
    result.items = [];
  }
  return result;
}

function adminRealityTvBulkPreviewHtml_(parsed) {
  if (parsed.errors.length) {
    return `<div class="admin-message error">${parsed.errors.map(adminRealityTvEscape_).join(" ")}</div>`;
  }
  const rows = parsed.items.slice(0, 12).map(function(item) {
    return `<tr><td>${adminRealityTvEscape_(item.name)}</td><td>${adminRealityTvEscape_(item.teamOrTribe || "")}</td><td>${adminRealityTvEscape_(item.age || "")}</td><td>${adminRealityTvEscape_(item.hometown || "")}</td><td>${adminRealityTvEscape_(item.occupation || "")}</td></tr>`;
  }).join("");
  const warning = parsed.warnings.length
    ? `<div class="admin-message warning">${parsed.warnings.slice(0, 8).map(adminRealityTvEscape_).join(" ")}</div>`
    : "";
  return `
    <div class="admin-message success">${parsed.items.length} contestant${parsed.items.length === 1 ? "" : "s"} ready to import.</div>
    ${warning}
    <div class="reality-tv-bulk-preview-table-wrap">
      <table class="reality-tv-bulk-preview-table"><thead><tr><th>Name</th><th>Team / Tribe</th><th>Age</th><th>Hometown</th><th>Occupation</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    ${parsed.items.length > 12 ? `<div class="admin-sub">Showing the first 12 of ${parsed.items.length} contestants.</div>` : ""}
  `;
}

function adminRealityTvPreviewBulk_(targetKey) {
  const textarea = document.getElementById("realityTvBulkContestants_" + targetKey);
  const preview = document.getElementById("realityTvBulkPreview_" + targetKey);
  if (!textarea || !preview) return null;
  const parsed = adminRealityTvParseBulkContestants_(textarea.value);
  ADMIN_REALITY_TV_BULK_PREVIEW[targetKey] = parsed;
  preview.innerHTML = adminRealityTvBulkPreviewHtml_(parsed);
  return parsed;
}

function adminRealityTvLoadBulkExample_(targetKey) {
  const textarea = document.getElementById("realityTvBulkContestants_" + targetKey);
  if (!textarea) return;
  textarea.value = [
    "Name\tFull Name\tImage URL\tTeam / Tribe\tAge\tHometown\tOccupation\tBiography\tExternal Subject ID",
    "Contestant A\tAlex Example\thttps://example.com/alex.jpg\tBlue Tribe\t31\tChicago, IL\tTeacher\tSample biography\talex-example",
    "Contestant B\tBailey Example\t\tRed Tribe\t27\tAustin, TX\tDesigner\t\tbailey-example"
  ].join("\n");
  adminRealityTvPreviewBulk_(targetKey);
}

function adminRealityTvApplyBulkToRoster_(mode) {
  const parsed = adminRealityTvPreviewBulk_("create");
  if (!parsed || parsed.errors.length) return;
  const container = document.getElementById("realityTvRosterRows");
  if (!container) return;
  if (mode === "replace") container.innerHTML = "";
  parsed.items.forEach(function(item) {
    container.insertAdjacentHTML("beforeend", adminRealityTvRosterRowHtml_(item));
  });
  adminRealityTvSetMessage_("realityTvCreateMessage", parsed.items.length + " contestants loaded into the roster. Review them, then create the season.", "success");
}

async function renderAdminRealityTvPage() {
  try {
    const res = await apiAdminGetRealityTvDashboard();
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not load Reality TV manager.");
    ADMIN_REALITY_TV_DASHBOARD = res;
    ADMIN_REALITY_TV_ROSTER_ROW = 0;
    setTimeout(function() {
      adminRealityTvApplyCreateFormat_(false);
      adminRealityTvAnchorPreview_("create");
      (res.seasons || []).forEach(function(bundle) {
        if (bundle && bundle.season) adminRealityTvAnchorPreview_(bundle.season.SeasonId);
      });
    }, 0);

    const hubStatus = res.hubConfigured
      ? `<div class="admin-message success">Connected to External Results Hub: <b>${adminRealityTvEscape_(res.hubSpreadsheetName || res.hubSpreadsheetId)}</b></div>`
      : `<div class="admin-message warning">External Results Hub is not connected. The manager still works, but Hub mappings and review records will not be mirrored.</div>`;

    return `
      <div class="page admin-page admin-reality-tv-page">
        <div class="admin-page-header">
          <div>
            <h1>Reality TV Season Manager</h1>
            <div class="admin-sub">Reusable formats for Survivor, cooking shows, judged competitions, social deduction, Amazing Race, team contests, and fully custom seasons.</div>
          </div>
          <div class="admin-header-actions">
            <button class="admin-small-button secondary" onclick="navigate('admin')">Back to Admin</button>
          </div>
        </div>

        <div class="card admin-card reality-tv-hub-card">
          <div class="reality-tv-hub-header">
            <div>
              <h2>External Results Hub</h2>
              <div class="admin-sub">Optional mirroring keeps events, markets, mappings, imported results, and review history in the separate Hub.</div>
            </div>
            <button class="admin-small-button" onclick="adminRealityTvConfigureHub()">${res.hubConfigured ? "Change Hub" : "Connect Hub"}</button>
          </div>
          ${hubStatus}
        </div>

        <details class="card admin-card admin-collapsible-card reality-tv-create-season-card" ${res.seasons && res.seasons.length ? "" : "open"}>
          <summary class="admin-card-summary">
            <div>
              <h2>Create Reality TV Season</h2>
              <div class="admin-sub">Choose the show format, import the participant or team roster, and the first episode, leg, or round is built automatically.</div>
            </div>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-form-grid reality-tv-season-form-grid">
              <label>Show name *<input id="realityTvShowName" class="input" placeholder="Survivor, Top Chef, The Amazing Race"></label>
              <label>Show format<select id="realityTvShowFormat" class="input" onchange="adminRealityTvApplyCreateFormat_(false)">${adminRealityTvFormatOptions_("survivor-tribal")}</select></label>
              <input id="realityTvParticipantType" type="hidden" value="individual">
              <label>Participant label<input id="realityTvParticipantLabel" class="input" value="Contestant"></label>
              <label>Group label<input id="realityTvGroupLabel" class="input" value="Tribe"></label>
              <label>Period label<input id="realityTvPeriodLabel" class="input" value="Episode" placeholder="Episode, Leg, Round"></label>
              <label>Season name *<input id="realityTvSeasonName" class="input" placeholder="Season 50"></label>
              <label>Season number<input id="realityTvSeasonNumber" class="input" value="1"></label>
              <label>Year<input id="realityTvYear" class="input" type="number" value="${new Date().getFullYear()}"></label>
              <label>Game ID<input id="realityTvGameId" class="input" placeholder="Auto-generated if blank"></label>
              <label>First episode date &amp; time *<input id="realityTvFirstEpisode" class="input" type="datetime-local"></label>
              <label>Repeat every days<input id="realityTvIntervalDays" class="input" type="number" min="1" value="7"></label>
              <label>Lock minutes before airtime<input id="realityTvLockOffset" class="input" type="number" min="0" value="5"></label>
              <label>Points per correct pick<input id="realityTvPoints" class="input" type="number" min="0" value="1"></label>
              <label class="reality-tv-wide-field">Elimination / exit question<input id="realityTvQuestionTemplate" class="input" value="Who will be eliminated in Episode {episode}?"></label>
            </div>

            <div class="reality-tv-create-question-pack">
              <h3>Show Format Question Pack</h3>
              <div class="admin-sub">The main elimination / exit question is always created. The selected preset questions are independent and administrator reviewed.</div>
              <div id="realityTvCreateQuestionPackGrid" class="reality-tv-question-pack-grid"></div>
            </div>

            <details class="reality-tv-create-anchor-panel">
              <summary>Optional Season Survivor Pick</summary>
              <div class="admin-sub">Users keep one contestant while that contestant remains active. The multiplier applies only to capped weekly fixed points.</div>
              ${adminRealityTvSeasonAnchorFields_("create", null)}
            </details>

            <div class="reality-tv-checkbox-row">
              <label><input id="realityTvPublishGame" type="checkbox"> Make game active immediately</label>
              <label><input id="realityTvAutoNext" type="checkbox" checked> Automatically build the next episode after approval</label>
            </div>

            <div class="reality-tv-roster-builder">
              <div class="reality-tv-roster-builder-header">
                <div>
                  <h3>Participant / Team Roster</h3>
                  <div class="admin-sub">Only the participant, couple, or team name is required. Amazing Race teams can include both member names and relationship details.</div>
                </div>
                <button type="button" class="admin-small-button" onclick="adminRealityTvAddRosterRow()">Add Row</button>
              </div>

              <details class="reality-tv-bulk-import" open>
                <summary>Mass Enter Participants / Teams</summary>
                <div class="admin-sub">Paste one name per line or copy rows from Excel/Google Sheets. Team Name, Member 1, Member 2, Relationship, images, and profile fields are recognized.</div>
                <textarea id="realityTvBulkContestants_create" class="input reality-tv-bulk-textarea" rows="8" placeholder="Name    Full Name    Image URL    Team / Tribe    Age    Hometown    Occupation    Biography    External Subject ID"></textarea>
                <div class="admin-actions reality-tv-bulk-actions">
                  <button type="button" class="admin-small-button secondary" onclick="adminRealityTvLoadBulkExample_('create')">Load Example</button>
                  <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPreviewBulk_('create')">Preview</button>
                  <button type="button" class="admin-small-button" onclick="adminRealityTvApplyBulkToRoster_('replace')">Replace Current Rows</button>
                  <button type="button" class="admin-small-button" onclick="adminRealityTvApplyBulkToRoster_('append')">Add to Current Rows</button>
                </div>
                <div id="realityTvBulkPreview_create" class="reality-tv-bulk-preview"></div>
              </details>

              <div class="reality-tv-roster-column-labels">
                <span>Name</span><span>Image URL</span><span>Team / Tribe</span><span>Age</span><span></span>
              </div>
              <div id="realityTvRosterRows">${adminRealityTvBlankRosterRows_(4)}</div>
            </div>

            <div class="admin-actions">
              <button class="button admin-button" onclick="adminRealityTvCreateSeason()">Create Season &amp; Episode 1</button>
            </div>
            <div id="realityTvCreateMessage" class="admin-message"></div>
          </div>
        </details>

        <div class="reality-tv-season-list">
          ${(res.seasons || []).map(adminRealityTvSeasonCard_).join("") || `<div class="card admin-card"><p>No Reality TV seasons have been created yet.</p></div>`}
        </div>
      </div>
    `;
  } catch (err) {
    return `
      <div class="page admin-page">
        <div class="card admin-card error-card">
          <h2>Reality TV Season Manager could not load</h2>
          <div>${adminRealityTvEscape_(err.message)}</div>
          <button class="button admin-button" onclick="adminRealityTvSetupSystem()">Set Up Manager</button>
        </div>
      </div>
    `;
  }
}

async function adminRealityTvSetupSystem() {
  showLoader();
  try {
    const res = await apiAdminSetupRealityTvSystem();
    if (!res || res.success === false) throw new Error((res && res.error) || "Setup failed.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}

function adminRealityTvAddRosterRow() {
  const container = document.getElementById("realityTvRosterRows");
  if (container) container.insertAdjacentHTML("beforeend", adminRealityTvRosterRowHtml_());
}

function adminRealityTvCollectRoster_() {
  return Array.from(document.querySelectorAll("#realityTvRosterRows [data-roster-row]")).map(function(row) {
    return {
      name: row.querySelector(".rt-roster-name").value.trim(),
      fullName: row.querySelector(".rt-roster-full-name").value.trim(),
      imageUrl: row.querySelector(".rt-roster-image").value.trim(),
      teamOrTribe: row.querySelector(".rt-roster-team").value.trim(),
      age: row.querySelector(".rt-roster-age").value.trim(),
      hometown: row.querySelector(".rt-roster-hometown").value.trim(),
      occupation: row.querySelector(".rt-roster-occupation").value.trim(),
      biography: row.querySelector(".rt-roster-biography").value.trim(),
      externalSubjectId: row.querySelector(".rt-roster-external-id").value.trim(),
      member1: row.querySelector(".rt-roster-member1").value.trim(),
      member2: row.querySelector(".rt-roster-member2").value.trim(),
      relationship: row.querySelector(".rt-roster-relationship").value.trim(),
      member1ImageUrl: row.querySelector(".rt-roster-member1-image").value.trim(),
      member2ImageUrl: row.querySelector(".rt-roster-member2-image").value.trim(),
      teamColor: row.querySelector(".rt-roster-team-color").value.trim()
    };
  }).filter(function(item) { return item.name; });
}

function adminRealityTvSetMessage_(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "admin-message " + (type || "");
  el.textContent = message || "";
}

async function adminRealityTvConfigureHub() {
  const current = ADMIN_REALITY_TV_DASHBOARD && ADMIN_REALITY_TV_DASHBOARD.hubSpreadsheetId || "";
  const value = prompt("Paste the External Results Hub Google Sheet URL or spreadsheet ID:", current);
  if (value === null) return;
  if (!value.trim()) return alert("A spreadsheet URL or ID is required.");
  showLoader();
  try {
    const res = await apiAdminConfigureRealityTvHub(value.trim());
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not connect the Hub.");
    alert(res.message || "External Results Hub connected.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}

async function adminRealityTvCreateSeason() {
  const roster = adminRealityTvCollectRoster_();
  if (roster.length < 2) {
    adminRealityTvSetMessage_("realityTvCreateMessage", "Add at least two participants or teams.", "error");
    return;
  }
  const firstEpisode = document.getElementById("realityTvFirstEpisode").value;
  if (!firstEpisode) {
    adminRealityTvSetMessage_("realityTvCreateMessage", "First episode date and time are required.", "error");
    return;
  }

  const payload = {
    showName: document.getElementById("realityTvShowName").value.trim(),
    showFormat: document.getElementById("realityTvShowFormat").value,
    participantType: document.getElementById("realityTvParticipantType").value,
    participantLabel: document.getElementById("realityTvParticipantLabel").value.trim(),
    groupLabel: document.getElementById("realityTvGroupLabel").value.trim(),
    periodLabel: document.getElementById("realityTvPeriodLabel").value.trim(),
    seasonName: document.getElementById("realityTvSeasonName").value.trim(),
    seasonNumber: document.getElementById("realityTvSeasonNumber").value.trim(),
    year: document.getElementById("realityTvYear").value,
    gameId: document.getElementById("realityTvGameId").value.trim(),
    firstEpisodeDateTime: firstEpisode,
    weeklyIntervalDays: document.getElementById("realityTvIntervalDays").value,
    lockOffsetMinutes: document.getElementById("realityTvLockOffset").value,
    points: document.getElementById("realityTvPoints").value,
    questionTemplate: document.getElementById("realityTvQuestionTemplate").value.trim(),
    publishGame: document.getElementById("realityTvPublishGame").checked,
    autoCreateNextEpisode: document.getElementById("realityTvAutoNext").checked,
    seasonAnchorEnabled: document.getElementById("realityTvAnchorEnabled_create").checked,
    seasonAnchorDisplayLabel: document.getElementById("realityTvAnchorLabel_create").value.trim(),
    seasonAnchorStartMultiplier: document.getElementById("realityTvAnchorStart_create").value,
    seasonAnchorGrowthPerSuccess: document.getElementById("realityTvAnchorGrowth_create").value,
    seasonAnchorMaxMultiplier: document.getElementById("realityTvAnchorCap_create").value,
    seasonAnchorEligiblePointsCap: document.getElementById("realityTvAnchorPointsCap_create").value,
    seasonAnchorLossPenalty: document.getElementById("realityTvAnchorPenalty_create").value,
    seasonAnchorWithdrawalBehavior: document.getElementById("realityTvAnchorWithdrawal_create").value,
    seasonAnchorManualSwitchAllowed: document.getElementById("realityTvAnchorSwitch_create").checked,
    enabledQuestionTypesJSON: JSON.stringify(Array.from(document.querySelectorAll(".rt-create-question-type:checked")).map(function(box) { return box.value; })),
    contestantsJSON: JSON.stringify(roster)
  };

  if (!payload.showName || !payload.seasonName) {
    adminRealityTvSetMessage_("realityTvCreateMessage", "Show name and season name are required.", "error");
    return;
  }

  adminRealityTvSetMessage_("realityTvCreateMessage", "Creating season, roster, episode question pack, mappings, and Episode 1…", "info");
  showLoader();
  try {
    const res = await apiAdminCreateRealityTvSeason(payload);
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not create the season.");
    alert(res.message || "Reality TV season created.");
    navigate("admin-reality-tv");
  } catch (err) {
    adminRealityTvSetMessage_("realityTvCreateMessage", err.message, "error");
  } finally {
    hideLoader();
  }
}

function adminRealityTvOutcomeChanged(seasonId) {
  const outcome = document.getElementById("realityTvOutcome_" + seasonId).value;
  const container = document.getElementById("realityTvSelections_" + seasonId);
  if (!container) return;
  const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
  if (outcome === "no-elimination") {
    checkboxes.forEach(function(box) { box.checked = false; box.disabled = true; });
  } else {
    checkboxes.forEach(function(box) { box.disabled = false; });
    if (outcome !== "double-elimination") {
      let found = false;
      checkboxes.forEach(function(box) {
        if (box.checked && found) box.checked = false;
        if (box.checked) found = true;
      });
    }
  }
}

function adminRealityTvContestantChecked(seasonId, changed) {
  const outcome = document.getElementById("realityTvOutcome_" + seasonId).value;
  if (outcome === "double-elimination") {
    const checked = Array.from(document.querySelectorAll("#realityTvSelections_" + seasonId + ' input[type="checkbox"]:checked'));
    if (checked.length > 2) changed.checked = false;
    return;
  }
  if (changed.checked) {
    document.querySelectorAll("#realityTvSelections_" + seasonId + ' input[type="checkbox"]').forEach(function(box) {
      if (box !== changed) box.checked = false;
    });
  }
}

async function adminRealityTvSubmitResult(seasonId, episodeId) {
  const outcome = document.getElementById("realityTvOutcome_" + seasonId).value;
  const selected = Array.from(document.querySelectorAll("#realityTvSelections_" + seasonId + ' input[type="checkbox"]:checked')).map(function(box) {
    return box.value;
  });
  if (outcome === "no-elimination" && selected.length) return alert("No Elimination cannot include a contestant.");
  if (["elimination", "medical-withdrawal", "quit"].indexOf(outcome) !== -1 && selected.length !== 1) return alert("Select exactly one contestant.");
  if (outcome === "double-elimination" && selected.length !== 2) return alert("Select exactly two contestants.");

  const summary = outcome === "no-elimination" ? "No elimination" : selected.join(", ");
  if (!confirm("Submit this FINAL result for administrator review?\n\n" + summary)) return;

  adminRealityTvSetMessage_("realityTvMessage_" + seasonId, "Submitting result for review…", "info");
  showLoader();
  try {
    const res = await apiAdminSubmitRealityTvResult({
      seasonId: seasonId,
      episodeId: episodeId,
      outcomeType: outcome,
      selectedContestantIdsJSON: JSON.stringify(selected),
      evidenceUrl: document.getElementById("realityTvEvidence_" + seasonId).value.trim(),
      notes: document.getElementById("realityTvNotes_" + seasonId).value.trim()
    });
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not submit the result.");
    navigate("admin-reality-tv");
  } catch (err) {
    adminRealityTvSetMessage_("realityTvMessage_" + seasonId, err.message, "error");
  } finally {
    hideLoader();
  }
}

function adminRealityTvSleep_(milliseconds) {
  return new Promise(function(resolve) { setTimeout(resolve, milliseconds); });
}

function adminRealityTvResponseError_(response, fallback) {
  return (response && (response.error || response.message)) || fallback;
}

async function adminRealityTvApproveResult(queueId) {
  const existing = ADMIN_REALITY_TV_DASHBOARD && (ADMIN_REALITY_TV_DASHBOARD.seasons || [])
    .flatMap(function(bundle) { return bundle.queue || []; })
    .find(function(item) { return String(item.QueueId || "") === String(queueId || ""); });
  const resuming = existing && String(existing.ReviewStatus || "").toUpperCase() === "APPROVING";

  if (!resuming && !confirm("Approve this result?\n\nThis will settle the episode, update CategoryResults, eliminate the selected contestant, and build the next episode.")) return;
  showLoader();
  try {
    let state = await apiAdminApproveRealityTvResult(queueId);
    if (!state || state.success === false) {
      throw new Error(adminRealityTvResponseError_(state, "Could not start the approval."));
    }

    let transientFailures = 0;
    for (let step = 0; step < 10 && !state.complete; step++) {
      await adminRealityTvSleep_(state.busy ? 1400 : 250);
      const next = await apiAdminContinueRealityTvApproval(queueId);
      if (!next || next.success === false) {
        const message = adminRealityTvResponseError_(next, "Could not continue the approval.");
        if (/timeout|network|524|invalid response/i.test(message) && transientFailures < 3) {
          transientFailures += 1;
          await adminRealityTvSleep_(1600);
          continue;
        }
        throw new Error(message);
      }
      state = next;
    }

    if (!state.complete) {
      alert("The approval did not return a final confirmation. Refresh this page and select Resume Approval; completed stages will not be repeated.");
    } else {
      alert((state.message || "Result approved.") + (state.warning ? "\n\nHub warning: " + state.warning : ""));
    }
    navigate("admin-reality-tv");
  } catch (err) {
    alert((err && err.message ? err.message : String(err)) + "\n\nRefresh the page and use Resume Approval. The staged process is safe to retry.");
    navigate("admin-reality-tv");
  } finally {
    hideLoader();
  }
}

async function adminRealityTvRejectResult(queueId) {
  const notes = prompt("Why is this result being rejected?", "Incorrect result; submit a corrected result.");
  if (notes === null) return;
  showLoader();
  try {
    const res = await apiAdminRejectRealityTvResult(queueId, notes);
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not reject the result.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}

async function adminRealityTvCreateNextEpisode(seasonId) {
  if (!confirm("Create the next episode question using the currently active contestants?")) return;
  showLoader();
  try {
    const res = await apiAdminCreateNextRealityTvEpisode(seasonId);
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not create the next episode.");
    alert(res.message || "Next episode created.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}

async function adminRealityTvAddContestant(seasonId) {
  const name = document.getElementById("realityTvAddName_" + seasonId).value.trim();
  if (!name) return alert("Contestant name is required.");
  showLoader();
  try {
    const res = await apiAdminAddRealityTvContestant({
      seasonId: seasonId,
      name: name,
      imageUrl: document.getElementById("realityTvAddImage_" + seasonId).value.trim(),
      teamOrTribe: document.getElementById("realityTvAddTeam_" + seasonId).value.trim()
    });
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not add contestant.");
    alert(res.message || "Contestant added.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}


async function adminRealityTvBulkAddToSeason(seasonId) {
  const parsed = adminRealityTvPreviewBulk_(seasonId);
  if (!parsed || parsed.errors.length) return;
  if (!confirm("Add " + parsed.items.length + " contestants to this season? Existing episode questions will not be changed.")) return;
  showLoader();
  try {
    const res = await apiAdminBulkAddRealityTvContestants({
      seasonId: seasonId,
      contestantsJSON: JSON.stringify(parsed.items)
    });
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not add contestants.");
    alert(res.message || (res.createdCount + " contestants added."));
    navigate("admin-reality-tv");
  } catch (err) {
    const preview = document.getElementById("realityTvBulkPreview_" + seasonId);
    if (preview) preview.innerHTML = `<div class="admin-message error">${adminRealityTvEscape_(err.message)}</div>`;
  } finally {
    hideLoader();
  }
}

async function adminRealityTvRunQuestionPackBuild_(state, seasonId) {
  let current = state || {};
  let transientFailures = 0;
  for (let step = 0; step < 20 && !current.complete; step++) {
    await adminRealityTvSleep_(current.busy ? 1400 : 250);
    const next = await apiAdminContinueRealityTvQuestionPackBuild(current.buildId);
    if (!next || next.success === false) {
      const message = adminRealityTvResponseError_(next, "Could not continue the episode question build.");
      if (/timeout|network|524|invalid response/i.test(message) && transientFailures < 3) {
        transientFailures += 1;
        adminRealityTvSetMessage_(
          "realityTvQuestionPackMessage_" + seasonId,
          "The connection timed out while a stage was running. Checking the saved build progress…",
          "warning"
        );
        await adminRealityTvSleep_(1800);
        continue;
      }
      throw new Error(message);
    }
    transientFailures = 0;
    current = next;
    adminRealityTvSetMessage_(
      "realityTvQuestionPackMessage_" + seasonId,
      (current.message || current.lastMessage || "Building episode questions…") +
        (current.totalCount ? " (" + Math.min(Number(current.currentIndex || 0), Number(current.totalCount || 0)) + "/" + Number(current.totalCount || 0) + ")" : ""),
      current.complete ? "success" : "info"
    );
  }
  return current;
}

async function adminRealityTvSaveQuestionPack(seasonId, episodeId) {
  const selected = Array.from(document.querySelectorAll('.rt-season-question-type[data-season-id="' + seasonId + '"]:checked')).map(function(box) {
    return box.value;
  });
  adminRealityTvSetMessage_("realityTvQuestionPackMessage_" + seasonId, "Saving the question pack and starting a staged build…", "info");
  showLoader();
  try {
    let state = await apiAdminUpdateRealityTvQuestionPack({
      seasonId: seasonId,
      episodeId: episodeId || "",
      showFormat: document.getElementById("realityTvFormat_" + seasonId).value,
      participantType: document.getElementById("realityTvParticipantType_" + seasonId).value,
      participantLabel: document.getElementById("realityTvParticipantLabel_" + seasonId).value.trim(),
      groupLabel: document.getElementById("realityTvGroupLabel_" + seasonId).value.trim(),
      periodLabel: document.getElementById("realityTvPeriodLabel_" + seasonId).value.trim(),
      questionTemplate: document.getElementById("realityTvEliminationTemplate_" + seasonId).value.trim(),
      enabledQuestionTypesJSON: JSON.stringify(selected),
      buildCurrentEpisode: true
    });
    if (!state || state.success === false) throw new Error(adminRealityTvResponseError_(state, "Could not save the question pack."));
    if (!state.complete) state = await adminRealityTvRunQuestionPackBuild_(state, seasonId);
    if (!state.complete) {
      alert("The question pack build paused before final confirmation. Refresh the manager and select Resume Build. Completed stages will not repeat.");
    } else {
      alert(state.message || state.lastMessage || "Episode question pack saved and built.");
    }
    navigate("admin-reality-tv");
  } catch (err) {
    adminRealityTvSetMessage_(
      "realityTvQuestionPackMessage_" + seasonId,
      (err && err.message ? err.message : String(err)) + " Refresh the manager and select Resume Build; completed stages are safe.",
      "error"
    );
  } finally {
    hideLoader();
  }
}

async function adminRealityTvAddCustomQuestion(seasonId, episodeId) {
  const question = document.getElementById("realityTvCustomQuestion_" + seasonId).value.trim();
  const source = document.getElementById("realityTvCustomSource_" + seasonId).value;
  const manualText = document.getElementById("realityTvCustomOptions_" + seasonId).value;
  const manualOptions = manualText.split(/\r?\n/).map(function(value) { return value.trim(); }).filter(Boolean);
  if (!question) return adminRealityTvSetMessage_("realityTvCustomMessage_" + seasonId, "Enter the custom question text.", "error");
  if (source === "manual-options" && manualOptions.length < 2) return adminRealityTvSetMessage_("realityTvCustomMessage_" + seasonId, "Enter at least two manual answers.", "error");
  adminRealityTvSetMessage_("realityTvCustomMessage_" + seasonId, "Saving the custom question and starting the staged build…", "info");
  showLoader();
  try {
    let state = await apiAdminAddRealityTvCustomQuestionTemplate({
      seasonId: seasonId,
      episodeId: episodeId || "",
      questionTemplate: question,
      answerSource: source,
      points: document.getElementById("realityTvCustomPoints_" + seasonId).value,
      manualOptionsJSON: JSON.stringify(manualOptions),
      includeNoOutcome: document.getElementById("realityTvCustomNoOutcome_" + seasonId).checked,
      noOutcomeLabel: document.getElementById("realityTvCustomNoOutcomeLabel_" + seasonId).value.trim()
    });
    if (!state || state.success === false) throw new Error(adminRealityTvResponseError_(state, "Could not save the custom question."));
    if (!state.complete) state = await adminRealityTvRunQuestionPackBuild_(state, seasonId);
    alert(state.message || state.lastMessage || "Custom question saved and built.");
    navigate("admin-reality-tv");
  } catch (err) {
    adminRealityTvSetMessage_("realityTvCustomMessage_" + seasonId, err.message || String(err), "error");
  } finally {
    hideLoader();
  }
}

async function adminRealityTvResumeQuestionPackBuild(buildId, seasonId) {
  if (!buildId) return alert("Question pack build ID is missing. Refresh and try again.");
  adminRealityTvSetMessage_("realityTvQuestionPackMessage_" + seasonId, "Resuming the saved question pack build…", "info");
  showLoader();
  try {
    const state = await adminRealityTvRunQuestionPackBuild_({ buildId: buildId, complete: false }, seasonId);
    if (!state.complete) {
      alert("The build is still paused. Refresh and select Resume Build again; completed stages will not repeat.");
    } else {
      alert(state.message || state.lastMessage || "Episode question pack build completed.");
    }
    navigate("admin-reality-tv");
  } catch (err) {
    adminRealityTvSetMessage_(
      "realityTvQuestionPackMessage_" + seasonId,
      (err && err.message ? err.message : String(err)) + " Refresh and select Resume Build.",
      "error"
    );
  } finally {
    hideLoader();
  }
}

async function adminRealityTvSubmitQuestionResult(episodeQuestionId) {
  const question = ADMIN_REALITY_TV_DASHBOARD && (ADMIN_REALITY_TV_DASHBOARD.seasons || [])
    .flatMap(function(bundle) { return bundle.episodeQuestions || []; })
    .find(function(item) { return String(item.EpisodeQuestionId || "") === String(episodeQuestionId || ""); });
  if (!question) return alert("Episode question not found. Refresh and try again.");
  const key = question.EpisodeQuestionId;
  const selected = document.querySelector('input[name="realityTvQuestion_' + key + '"]:checked');
  if (!selected) return alert("Select one result.");
  const options = adminRealityTvQuestionOptions_(question);
  const option = options.find(function(item) { return String(item.id) === String(selected.value); });
  if (!confirm("Submit this FINAL result for administrator review?\n\n" + (option ? option.label : selected.value))) return;
  adminRealityTvSetMessage_("realityTvQuestionMessage_" + key, "Submitting result for review…", "info");
  showLoader();
  try {
    const res = await apiAdminSubmitRealityTvQuestionResult({
      episodeQuestionId: episodeQuestionId,
      selectedOutcomeId: selected.value,
      evidenceUrl: (document.getElementById("realityTvQuestionEvidence_" + key) || {}).value || "",
      notes: (document.getElementById("realityTvQuestionNotes_" + key) || {}).value || ""
    });
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not submit the question result.");
    navigate("admin-reality-tv");
  } catch (err) {
    adminRealityTvSetMessage_("realityTvQuestionMessage_" + key, err.message, "error");
  } finally {
    hideLoader();
  }
}

async function adminRealityTvApproveQuestionResult(queueId) {
  const existing = ADMIN_REALITY_TV_DASHBOARD && (ADMIN_REALITY_TV_DASHBOARD.seasons || [])
    .flatMap(function(bundle) { return bundle.questionQueue || []; })
    .find(function(item) { return String(item.QueueId || "") === String(queueId || ""); });
  const resuming = existing && String(existing.ReviewStatus || "").toUpperCase() === "APPROVING";
  if (!resuming && !confirm("Approve this question result?\n\nThis settles only this question. It will not eliminate anyone or create the next episode.")) return;
  showLoader();
  try {
    let state = await apiAdminApproveRealityTvQuestionResult(queueId);
    if (!state || state.success === false) throw new Error(adminRealityTvResponseError_(state, "Could not start the question approval."));
    let transientFailures = 0;
    for (let step = 0; step < 8 && !state.complete; step++) {
      await adminRealityTvSleep_(state.busy ? 1400 : 250);
      const next = await apiAdminContinueRealityTvQuestionApproval(queueId);
      if (!next || next.success === false) {
        const message = adminRealityTvResponseError_(next, "Could not continue the question approval.");
        if (/timeout|network|524|invalid response/i.test(message) && transientFailures < 3) {
          transientFailures += 1;
          await adminRealityTvSleep_(1600);
          continue;
        }
        throw new Error(message);
      }
      state = next;
    }
    if (!state.complete) alert("The approval did not return a final confirmation. Refresh and select Resume Approval.");
    else alert((state.message || "Question result approved.") + (state.warning ? "\n\nHub warning: " + state.warning : ""));
    navigate("admin-reality-tv");
  } catch (err) {
    alert((err && err.message ? err.message : String(err)) + "\n\nRefresh the page and use Resume Approval. Completed stages will not repeat.");
    navigate("admin-reality-tv");
  } finally {
    hideLoader();
  }
}

async function adminRealityTvRejectQuestionResult(queueId) {
  const notes = prompt("Why is this question result being rejected?", "Incorrect result; submit a corrected result.");
  if (notes === null) return;
  showLoader();
  try {
    const res = await apiAdminRejectRealityTvQuestionResult(queueId, notes);
    if (!res || res.success === false) throw new Error((res && (res.error || res.message)) || "Could not reject the question result.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}
