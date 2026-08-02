/* =========================
   ADMIN REALITY TV SEASON MANAGER
   Phase 2B v1.0.18
========================= */

let ADMIN_REALITY_TV_DASHBOARD = null;
let ADMIN_REALITY_TV_ROSTER_ROW = 0;

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
    return String(item.EpisodeId || "") === String(episode.EpisodeId || "") &&
      String(item.ReviewStatus || "").toUpperCase() === "PENDING";
  }) || null;
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
  const episode = adminRealityTvCurrentEpisode_(bundle);
  if (!episode) return `<div class="admin-message warning">No episode exists yet.</div>`;

  const pending = adminRealityTvPendingQueue_(bundle, episode);
  const activeContestants = (bundle.contestants || []).filter(function(item) {
    return item.Active === true || String(item.Active || "").toLowerCase() === "true";
  });

  if (pending) {
    const selectedIds = (() => {
      try { return JSON.parse(pending.SelectedContestantIds || "[]"); }
      catch (err) { return []; }
    })();
    const selectedNames = activeContestants
      .filter(function(item) { return selectedIds.indexOf(String(item.ContestantId || "").toLowerCase()) !== -1; })
      .map(function(item) { return item.Name; });

    return `
      <div class="reality-tv-review-card">
        <div class="reality-tv-review-header">
          <div>
            <strong>Administrator approval required</strong>
            <div class="admin-sub">${adminRealityTvEscape_(episode.EpisodeName)} result is pending.</div>
          </div>
          <span class="reality-tv-status-pill pending">PENDING</span>
        </div>
        <div class="reality-tv-result-summary">
          <span><b>Result type:</b> ${adminRealityTvEscape_(pending.OutcomeType)}</span>
          <span><b>Contestant:</b> ${adminRealityTvEscape_(selectedNames.join(", ") || "No elimination")}</span>
          ${pending.EvidenceUrl ? `<span><b>Evidence:</b> <a href="${adminRealityTvEscape_(pending.EvidenceUrl)}" target="_blank" rel="noopener">Open source</a></span>` : ""}
          ${pending.Notes ? `<span><b>Notes:</b> ${adminRealityTvEscape_(pending.Notes)}</span>` : ""}
        </div>
        <div class="admin-actions">
          <button class="button admin-button" onclick="adminRealityTvApproveResult('${adminRealityTvEscape_(pending.QueueId)}')">
            Approve &amp; Build Next Episode
          </button>
          <button class="admin-small-button danger" onclick="adminRealityTvRejectResult('${adminRealityTvEscape_(pending.QueueId)}')">
            Reject
          </button>
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
        ${adminRealityTvContestantRows_(bundle.contestants)}

        <details class="reality-tv-subsection">
          <summary>Add a late-entry contestant</summary>
          <div class="admin-form-grid">
            <input id="realityTvAddName_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Contestant name">
            <input id="realityTvAddImage_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Image URL (optional)">
            <input id="realityTvAddTeam_${adminRealityTvEscape_(season.SeasonId)}" class="input" placeholder="Team / tribe (optional)">
          </div>
          <button class="admin-small-button" onclick="adminRealityTvAddContestant('${adminRealityTvEscape_(season.SeasonId)}')">Add Contestant</button>
          <div class="admin-sub">This adds the contestant to the season roster. Existing episode questions are not changed.</div>
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
  for (let index = 0; index < count; index++) html += adminRealityTvRosterRowHtml_();
  return html;
}

function adminRealityTvRosterRowHtml_() {
  ADMIN_REALITY_TV_ROSTER_ROW += 1;
  const id = ADMIN_REALITY_TV_ROSTER_ROW;
  return `
    <div class="reality-tv-roster-row" data-roster-row="${id}">
      <input class="input rt-roster-name" placeholder="Name *">
      <input class="input rt-roster-image" placeholder="Image URL">
      <input class="input rt-roster-team" placeholder="Team / tribe">
      <input class="input rt-roster-age" placeholder="Age" inputmode="numeric">
      <input class="input rt-roster-hometown" placeholder="Hometown">
      <input class="input rt-roster-occupation" placeholder="Occupation">
      <button type="button" class="admin-small-button danger" onclick="this.closest('[data-roster-row]').remove()">Remove</button>
    </div>
  `;
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
            <div class="admin-sub">One roster setup. One reviewed elimination action per episode.</div>
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
              <div class="reality-tv-roster-column-labels">
                <span>Name</span><span>Image URL</span><span>Team / Tribe</span><span>Age</span><span>Hometown</span><span>Occupation</span><span></span>
              </div>
              <div id="realityTvRosterRows">${adminRealityTvBlankRosterRows_(6)}</div>
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
      imageUrl: row.querySelector(".rt-roster-image").value.trim(),
      teamOrTribe: row.querySelector(".rt-roster-team").value.trim(),
      age: row.querySelector(".rt-roster-age").value.trim(),
      hometown: row.querySelector(".rt-roster-hometown").value.trim(),
      occupation: row.querySelector(".rt-roster-occupation").value.trim()
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
    contestantsJSON: JSON.stringify(roster)
  };

  if (!payload.showName || !payload.seasonName) {
    adminRealityTvSetMessage_("realityTvCreateMessage", "Show name and season name are required.", "error");
    return;
  }

  adminRealityTvSetMessage_("realityTvCreateMessage", "Creating season, roster, mappings, and Episode 1…", "info");
  showLoader();
  try {
    const res = await apiAdminCreateRealityTvSeason(payload);
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not create the season.");
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

async function adminRealityTvApproveResult(queueId) {
  if (!confirm("Approve this result?\n\nThis will settle the episode, update CategoryResults, eliminate the selected contestant, and build the next episode.")) return;
  showLoader();
  try {
    const res = await apiAdminApproveRealityTvResult(queueId);
    if (!res || res.success === false) throw new Error((res && res.error) || "Could not approve the result.");
    alert(res.message || "Result approved.");
    navigate("admin-reality-tv");
  } catch (err) {
    alert(err.message);
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
