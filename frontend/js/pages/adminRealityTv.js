/* =========================
   ADMIN REALITY TV SEASON MANAGER
   Phase 2B v1.0.25
========================= */

let ADMIN_REALITY_TV_DASHBOARD = null;
let ADMIN_REALITY_TV_ROSTER_ROW = 0;
let ADMIN_REALITY_TV_BULK_PREVIEW = {};

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


function adminRealityTvQuestionPackTypes_() {
  return [
    { id: "immunity-winner", label: "Immunity winner", help: "Uses tribes before the merge and contestants after the merge." },
    { id: "tribal-attendee", label: "Tribe going to Tribal Council", help: "Created only while two or more active tribes remain." },
    { id: "reward-winner", label: "Reward winner", help: "Uses tribes before the merge and contestants after the merge." },
    { id: "idol-finder", label: "Immunity idol finder", help: "Contestants plus a No one option." }
  ];
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
            <span class="reality-tv-question-episode">Episode ${adminRealityTvEscape_(question.EpisodeNumber)}</span>
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
          <div><span class="reality-tv-question-episode">Episode ${adminRealityTvEscape_(question.EpisodeNumber)}</span><h4>${adminRealityTvEscape_(question.QuestionText)}</h4></div>
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
          <span class="reality-tv-question-episode">Episode ${adminRealityTvEscape_(question.EpisodeNumber)}</span>
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
    return `<div class="admin-message warning">No extra episode questions are enabled yet. Use Episode Question Pack below to add them.</div>`;
  }
  const unresolved = questions.filter(function(item) { return String(item.Status || "OPEN").toUpperCase() !== "FINAL"; });
  const finalQuestions = questions.filter(function(item) { return String(item.Status || "").toUpperCase() === "FINAL"; });
  return `
    <div class="reality-tv-episode-questions-panel">
      <div class="reality-tv-panel-heading">
        <div><h3>Episode Questions</h3><div class="admin-sub">Each result is reviewed and settled independently. These questions never eliminate a contestant or create the next episode.</div></div>
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
  const enabled = {};
  (bundle.questionTemplates || []).forEach(function(item) {
    enabled[String(item.TemplateId || "")] = item.Enabled === true || String(item.Enabled || "").toLowerCase() === "true";
  });
  const current = adminRealityTvCurrentEpisode_(bundle);
  const build = bundle.questionBuild && !bundle.questionBuild.complete ? bundle.questionBuild : null;
  const buildLabel = build
    ? "Resume Build (" + Number(build.currentIndex || 0) + "/" + Number(build.totalCount || 0) + ")"
    : "Save & Build Current Episode";
  const buildAction = build
    ? `adminRealityTvResumeQuestionPackBuild('${adminRealityTvEscape_(build.buildId)}','${adminRealityTvEscape_(season.SeasonId)}')`
    : `adminRealityTvSaveQuestionPack('${adminRealityTvEscape_(season.SeasonId)}','${adminRealityTvEscape_(current ? current.EpisodeId : "")}')`;
  const buildStatus = build ? `
    <div class="admin-message ${build.error ? "error" : "warning"}">
      <b>Build in progress:</b> ${adminRealityTvEscape_(build.lastMessage || build.progressLabel || "Ready to resume.")}
      ${build.error ? `<br><b>Last error:</b> ${adminRealityTvEscape_(build.error)}` : ""}
    </div>` : "";
  return `
    <details class="reality-tv-subsection reality-tv-question-pack" ${(bundle.questionTemplates && bundle.questionTemplates.some(function(item) { return item.Enabled === true || String(item.Enabled || "").toLowerCase() === "true"; })) || build ? "open" : ""}>
      <summary>Episode Question Pack</summary>
      <div class="admin-sub">Elimination is always included. Select the additional questions that should be generated for every new episode.</div>
      <div class="reality-tv-question-pack-grid">
        ${adminRealityTvQuestionPackTypes_().map(function(item) {
          return `<label class="reality-tv-question-pack-choice"><input type="checkbox" class="rt-season-question-type" data-season-id="${adminRealityTvEscape_(season.SeasonId)}" value="${adminRealityTvEscape_(item.id)}" ${enabled[item.id] ? "checked" : ""}><span><b>${adminRealityTvEscape_(item.label)}</b><small>${adminRealityTvEscape_(item.help)}</small></span></label>`;
        }).join("")}
      </div>
      ${buildStatus}
      <div class="admin-actions">
        <button class="admin-small-button" onclick="${buildAction}">${adminRealityTvEscape_(buildLabel)}</button>
      </div>
      <div id="realityTvQuestionPackMessage_${adminRealityTvEscape_(season.SeasonId)}" class="admin-message"></div>
    </details>
  `;
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
        <h4>Active contestants (${active.length})</h4>
        <div class="reality-tv-contestant-grid">${active.map(chip).join("") || "<em>None</em>"}</div>
      </div>
      <div>
        <h4>Eliminated / inactive (${inactive.length})</h4>
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
          <span><b>Contestant:</b> ${adminRealityTvEscape_(selectedNames.join(", ") || "No elimination")}</span>
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

      <div class="reality-tv-selection-label">Select the contestant:</div>
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
        <textarea id="realityTvNotes_${adminRealityTvEscape_(season.SeasonId)}" class="input" rows="2" placeholder="Episode result notes"></textarea>
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
            Game: ${adminRealityTvEscape_(season.GameId)} · Current episode ${adminRealityTvEscape_(season.CurrentEpisodeNumber)}
          </div>
        </div>
        <span class="reality-tv-status-pill ${adminRealityTvStatusClass_(season.Status)}">${adminRealityTvEscape_(season.Status)}</span>
      </summary>
      <div class="admin-collapsible-body">
        <div class="reality-tv-season-overview">
          <div><b>Weekly schedule:</b> every ${adminRealityTvEscape_(season.WeeklyIntervalDays)} days</div>
          <div><b>Lock offset:</b> ${adminRealityTvEscape_(season.LockOffsetMinutes)} minutes before airtime</div>
          <div><b>Current:</b> ${current ? adminRealityTvEscape_(current.EpisodeName) : "None"}</div>
        </div>
        ${adminRealityTvResultPanel_(bundle)}
        ${adminRealityTvSupplementalQuestionsPanel_(bundle)}
        ${adminRealityTvQuestionPackPanel_(bundle)}
        ${adminRealityTvContestantRows_(bundle.contestants)}

        <details class="reality-tv-subsection">
          <summary>Add contestant(s) to this season</summary>
          <div class="admin-form-grid">
            <input id="realityTvAddName_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Contestant name">
            <input id="realityTvAddImage_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Image URL (optional)">
            <input id="realityTvAddTeam_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Team / tribe (optional)">
          </div>
          <button class="admin-small-button" onclick="adminRealityTvAddContestant('${adminRealityTvEscape_(season.SeasonId)}')">Add One Contestant</button>

          <div class="reality-tv-existing-bulk-add">
            <h4>Mass add contestants</h4>
            <div class="admin-sub">Use the same spreadsheet format as the season builder. Existing contestants are skipped safely.</div>
            <textarea id="realityTvBulkContestants_${adminRealityTvEscape_(season.SeasonId)}" class="input reality-tv-bulk-textarea" rows="6" placeholder="Name    Full Name    Image URL    Team / Tribe    Age    Hometown    Occupation    Biography    External Subject ID"></textarea>
            <div class="admin-actions reality-tv-bulk-actions">
              <button type="button" class="admin-small-button secondary" onclick="adminRealityTvLoadBulkExample_('${adminRealityTvEscape_(season.SeasonId)}')">Load Example</button>
              <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPreviewBulk_('${adminRealityTvEscape_(season.SeasonId)}')">Preview</button>
              <button type="button" class="admin-small-button" onclick="adminRealityTvBulkAddToSeason('${adminRealityTvEscape_(season.SeasonId)}')">Add All Valid Contestants</button>
            </div>
            <div id="realityTvBulkPreview_${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-bulk-preview"></div>
          </div>
          <div class="admin-sub">New contestants are added to the season roster. Existing episode questions are not changed; they will appear in the next newly created episode.</div>
        </details>

        <details class="reality-tv-subsection">
          <summary>Episode history</summary>
          ${adminRealityTvEpisodesTable_(bundle.episodes)}
        </details>

        <div class="admin-actions">
          <button class="admin-small-button secondary" onclick="navigate('admin-game-setup:${adminRealityTvEscape_(season.GameId)}')">Open Game Setup</button>
          <button class="admin-small-button secondary" onclick="adminRealityTvCreateNextEpisode('${adminRealityTvEscape_(season.SeasonId)}')">Create Next Episode Manually</button>
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
    name: ["name", "contestant", "contestantname", "displayname"],
    fullName: ["fullname", "legalname", "realname"],
    imageUrl: ["image", "imageurl", "photo", "photourl", "headshot", "headshoturl"],
    teamOrTribe: ["team", "tribe", "teamtribe", "teamortribe", "group"],
    age: ["age"],
    hometown: ["hometown", "home", "city", "location"],
    occupation: ["occupation", "job", "profession"],
    biography: ["biography", "bio", "notes", "description"],
    externalSubjectId: ["externalsubjectid", "externalid", "subjectid", "providerid", "contestantid"]
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

  const positional = ["name", "fullName", "imageUrl", "teamOrTribe", "age", "hometown", "occupation", "biography", "externalSubjectId"];
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

    const hubStatus = res.hubConfigured
      ? `<div class="admin-message success">Connected to External Results Hub: <b>${adminRealityTvEscape_(res.hubSpreadsheetName || res.hubSpreadsheetId)}</b></div>`
      : `<div class="admin-message warning">External Results Hub is not connected. The manager still works, but Hub mappings and review records will not be mirrored.</div>`;

    return `
      <div class="page admin-page admin-reality-tv-page">
        <div class="admin-page-header">
          <div>
            <h1>Reality TV Season Manager</h1>
            <div class="admin-sub">One roster setup. Elimination plus optional immunity, tribal, reward, and idol questions each episode.</div>
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
              <div class="admin-sub">Enter the season once, add the full contestant roster, and Episode 1 is built automatically.</div>
            </div>
          </summary>
          <div class="admin-collapsible-body">
            <div class="admin-form-grid reality-tv-season-form-grid">
              <label>Show name *<input id="realityTvShowName" class="input" placeholder="Survivor"></label>
              <label>Season name *<input id="realityTvSeasonName" class="input" placeholder="Season 50"></label>
              <label>Season number<input id="realityTvSeasonNumber" class="input" value="1"></label>
              <label>Year<input id="realityTvYear" class="input" type="number" value="${new Date().getFullYear()}"></label>
              <label>Game ID<input id="realityTvGameId" class="input" placeholder="Auto-generated if blank"></label>
              <label>First episode date &amp; time *<input id="realityTvFirstEpisode" class="input" type="datetime-local"></label>
              <label>Repeat every days<input id="realityTvIntervalDays" class="input" type="number" min="1" value="7"></label>
              <label>Lock minutes before airtime<input id="realityTvLockOffset" class="input" type="number" min="0" value="5"></label>
              <label>Points per correct pick<input id="realityTvPoints" class="input" type="number" min="0" value="1"></label>
              <label class="reality-tv-wide-field">Question template<input id="realityTvQuestionTemplate" class="input" value="Who will be eliminated in Episode {episode}?"></label>
            </div>

            <div class="reality-tv-create-question-pack">
              <h3>Episode Question Pack</h3>
              <div class="admin-sub">Elimination is always created. Choose the additional questions to generate for every episode.</div>
              <div class="reality-tv-question-pack-grid">
                ${adminRealityTvQuestionPackTypes_().map(function(item) {
                  return `<label class="reality-tv-question-pack-choice"><input type="checkbox" class="rt-create-question-type" value="${adminRealityTvEscape_(item.id)}" checked><span><b>${adminRealityTvEscape_(item.label)}</b><small>${adminRealityTvEscape_(item.help)}</small></span></label>`;
                }).join("")}
              </div>
            </div>

            <div class="reality-tv-checkbox-row">
              <label><input id="realityTvPublishGame" type="checkbox"> Make game active immediately</label>
              <label><input id="realityTvAutoNext" type="checkbox" checked> Automatically build the next episode after approval</label>
            </div>

            <div class="reality-tv-roster-builder">
              <div class="reality-tv-roster-builder-header">
                <div>
                  <h3>Contestant Roster</h3>
                  <div class="admin-sub">Only the name is required. Photos and profile details can be added now or later.</div>
                </div>
                <button type="button" class="admin-small-button" onclick="adminRealityTvAddRosterRow()">Add Row</button>
              </div>

              <details class="reality-tv-bulk-import" open>
                <summary>Mass Enter Contestants</summary>
                <div class="admin-sub">Paste one name per line, or copy rows from Excel/Google Sheets. Header-based tab-separated or CSV data is supported.</div>
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
      externalSubjectId: row.querySelector(".rt-roster-external-id").value.trim()
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
    adminRealityTvSetMessage_("realityTvCreateMessage", "Add at least two contestants.", "error");
    return;
  }
  const firstEpisode = document.getElementById("realityTvFirstEpisode").value;
  if (!firstEpisode) {
    adminRealityTvSetMessage_("realityTvCreateMessage", "First episode date and time are required.", "error");
    return;
  }

  const payload = {
    showName: document.getElementById("realityTvShowName").value.trim(),
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
