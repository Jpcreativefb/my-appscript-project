/* =====================================================
   VOTING / COMPETITION PLAYER PAGE v1.2.18z
===================================================== */

var VOTING_PAGE_STATE = VOTING_PAGE_STATE || {
  gameId: "",
  payload: null,
  selectedEntryIds: [],
  effectiveUi: "arrows",
  uploadedImageUrl: "",
  uploadedImageFileId: "",
  evaluatedEntryIds: [],
  criteriaScoresByEntry: {}
};

function votingPageEscape_(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function votingPageOrdinal_(value) {
  var n = Number(value || 0);
  var mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return n + "th";
  if (n % 10 === 1) return n + "st";
  if (n % 10 === 2) return n + "nd";
  if (n % 10 === 3) return n + "rd";
  return n + "th";
}

function votingPageEntryLabel_(payload) {
  return String(payload && payload.settings && payload.settings.entryLabel || "Entry").trim() || "Entry";
}

function votingPageCustomFieldValue_(entry, field) {
  var data = entry && entry.customData && typeof entry.customData === "object" ? entry.customData : {};
  return data[field.id];
}

function votingPageCustomFieldInput_(field, entry, canEdit) {
  var id = "votingCustom_" + field.id;
  var value = votingPageCustomFieldValue_(entry, field);
  var required = field.required ? " required" : "";
  var disabled = canEdit === false ? " disabled" : "";
  var label = votingPageEscape_(field.label) + (field.required ? " *" : "");
  if (field.type === "long-text") {
    return '<label class="voting-form-field"><span>' + label + '</span><textarea id="' + votingPageEscape_(id) + '" rows="4"' + required + disabled + '>' + votingPageEscape_(value || "") + '</textarea></label>';
  }
  if (field.type === "select") {
    var options = ['<option value="">Choose…</option>'].concat((field.options || []).map(function(option) {
      return '<option value="' + votingPageEscape_(option) + '" ' + (String(value || "") === String(option) ? 'selected' : '') + '>' + votingPageEscape_(option) + '</option>';
    })).join("");
    return '<label class="voting-form-field"><span>' + label + '</span><select id="' + votingPageEscape_(id) + '"' + required + disabled + '>' + options + '</select></label>';
  }
  if (field.type === "checkbox" || field.type === "yes-no") {
    return '<label class="voting-checkbox-field"><input id="' + votingPageEscape_(id) + '" type="checkbox" ' + (value === true || String(value).toLowerCase() === "true" ? 'checked' : '') + disabled + '><span>' + label + '</span></label>';
  }
  return '<label class="voting-form-field"><span>' + label + '</span><input id="' + votingPageEscape_(id) + '" type="' + (field.type === "number" ? 'number' : 'text') + '" value="' + votingPageEscape_(value === undefined || value === null ? "" : value) + '"' + required + disabled + '></label>';
}


/* Cookoff entry presentation: never invent a server-assigned identifier. */
function votingPageAssignedIdentity_(entry, settings) {
  var number = entry && entry.displayNumber ? String(entry.displayNumber) : '';
  var color = entry && entry.displayColor && settings.colorAssignment !== 'none' ? String(entry.displayColor) : '';
  var mode = String(settings.entryIdentifierMode || '').toLowerCase();
  if (!mode) mode = settings.colorAssignment === 'none' ? 'number' :
    settings.numberAssignment === 'none' ? 'color' : 'both';
  if (mode === 'number') color = '';
  if (mode === 'color') number = '';
  var label = mode === 'color' ? 'YOUR ASSIGNED COLOR' :
    mode === 'number' ? 'YOUR ASSIGNED NUMBER' : 'YOUR ASSIGNED COLOR & NUMBER';
  var value = [color, number ? '#' + number : ''].filter(Boolean).join(' · ');
  var bg = color ? votingPageColorHex_(color) : '#34445f';
  return '<section class="cookoff-r9-assignment" style="--cookoff-assignment-color:' + bg + '">' +
    '<small>' + label + '</small><strong>' + votingPageEscape_(value || 'Assigned after submission') + '</strong>' +
    '<p>' + votingPageEscape_(settings.pickupInstructions ||
      'Ask the Cookoff host where to collect your matching display sign before voting begins.') + '</p>' +
    '</section>';
}
function votingPageEntryCategories_(entry, settings, canEdit) {
  var cats = Array.isArray(settings.entryCategories) ? settings.entryCategories : [];
  if (!cats.length) return '';
  var previous = entry && entry.customData && Array.isArray(entry.customData.cookoffCategoryIds) ?
    entry.customData.cookoffCategoryIds : null;
  var selected = previous || cats.filter(function(c) { return c.defaultSelected !== false; }).map(function(c) { return String(c.id); });
  return '<fieldset class="cookoff-r9-category-list"><legend>Enter this dish in</legend><p>Choose the awards for your dish.</p>' +
    cats.map(function(c) { var id = votingPageEscape_(String(c.id)); return '<label><input type="checkbox" data-cookoff-entry-category="' + id + '" value="' + id + '"' +
      (selected.indexOf(String(c.id)) >= 0 ? ' checked' : '') + (canEdit ? '' : ' disabled') + '><span>' +
      votingPageEscape_(c.label || c.name || c.id) + '</span></label>'; }).join('') + '</fieldset>';
}
function votingPageEntryRules_(settings) {
  var rules = String(settings.entryRules || '').trim();
  var info = String(settings.hostEntryInfo || '').trim();
  return '<button type="button" class="cookoff-r9-rules-button" onclick="votingPageShowEntryRules_()">Entry Rules & Host Information</button>' +
    '<dialog id="cookoffEntryRulesDialog" class="cookoff-r9-rules-dialog"><h3>Cookoff Entry Rules</h3>' +
    '<p>' + votingPageEscape_(rules || 'Enter your dish details, include ingredient and allergy information, and follow the host instructions.') + '</p>' +
    (info ? '<h4>Host Information</h4><p>' + votingPageEscape_(info) + '</p>' : '') +
    '<button type="button" class="button" onclick="votingPageCloseEntryRules_()">Close</button></dialog>';
}
function votingPageShowEntryRules_() {
  var el = document.getElementById('cookoffEntryRulesDialog');
  if (el && el.showModal) el.showModal();
}
function votingPageCloseEntryRules_() {
  var el = document.getElementById('cookoffEntryRulesDialog');
  if (el && el.close) el.close();
}


/* R9 multiple entries: maintain one active owned entry while preserving all others. */
function votingPageOwnEntries_(payload) {
  if (Array.isArray(payload.ownEntries)) return payload.ownEntries;
  return payload.ownEntry ? [payload.ownEntry] : [];
}
function votingPageActiveOwnEntry_(payload) {
  var entries = votingPageOwnEntries_(payload);
  var activeId = VOTING_PAGE_STATE.activeEntryId;
  if (activeId === '__new__') return null;
  return entries.find(function(e){return e.entryId === activeId;}) || entries[0] || null;
}
function votingPageEditOwnEntry_(entryId) {
  VOTING_PAGE_STATE.activeEntryId = entryId || '__new__';
  VOTING_PAGE_STATE.submissionId = '';
  var payload = VOTING_PAGE_STATE.payload;
  var panel = document.querySelector('.cookoff-r9-panel[data-cookoff-panel="entry"]');
  if (panel && payload) panel.innerHTML = votingPageParticipantCard_(payload);
  votingPageSwitchSection_('entry');
}
function votingPageOwnEntriesHtml_(payload) {
  var mine = votingPageOwnEntries_(payload);
  if (!mine.length) return '';
  var settings = payload.settings || {};
  var limit = settings.allowMultipleEntries ? Number(settings.maxEntriesPerParticipant || 0) : 1;
  var canAdd = payload.registrationOpen && settings.allowMultipleEntries && (limit === 0 || mine.length < limit);
  return '<section class="cookoff-r9-own-entries"><h3>My Cookoff Dishes</h3>' +
    mine.map(function(e) {
      var safeId = votingPageEscape_(e.entryId);
      return '<div class="cookoff-r9-owned-row"><strong>' + votingPageEscape_(e.entryName) + '</strong><span>' +
        votingPageEscape_([e.displayColor,e.displayNumber ? '#' + e.displayNumber : '',e.status].filter(Boolean).join(' · ')) +
        '</span>' + (payload.registrationOpen ? '<button type="button" onclick="votingPageEditOwnEntry_(\'' + safeId + '\')">Edit</button>' : '') + '</div>';
    }).join('') +
    (canAdd ? '<button class="cookoff-r9-another" type="button" onclick="votingPageEditOwnEntry_(\'__new__\')">+ SUBMIT ANOTHER DISH</button>' : '') +
    '</section>';
}

function votingPageParticipantCard_(payload) {
  var settings = payload.settings || {};
  var entry = votingPageActiveOwnEntry_(payload);
  var label = votingPageEntryLabel_(payload);
  if (!payload.registrationOpen && !entry) {
    return '<section class="card voting-registration-card"><div class="voting-section-heading"><div><span class="voting-eyebrow">Participant Registration</span><h2>Registration is closed</h2></div></div><p>New participant entries are not being accepted right now.</p></section>';
  }

  var statusText = entry
    ? (entry.status === "approved" ? "Approved" : (entry.status === "rejected" ? "Needs Attention" : "Awaiting Admin Approval"))
    : "Not Submitted";
  var canEdit = payload.registrationOpen && (!entry || settings.allowParticipantEdits === true);
  var customFields = Array.isArray(settings.customFields) ? settings.customFields : [];
  var photoUrl = entry && entry.imageUrl ? entry.imageUrl : "";
  VOTING_PAGE_STATE.uploadedImageUrl = photoUrl;
  VOTING_PAGE_STATE.uploadedImageFileId = entry && entry.imageFileId ? entry.imageFileId : "";

  var numberField = "";
  if (settings.numberAssignment === "participant") {
    numberField = '<label class="voting-form-field"><span>Display Number</span><input id="votingParticipantDisplayNumber" type="text" value="' + votingPageEscape_(entry && entry.displayNumber || "") + '" placeholder="Example: 14" ' + (canEdit ? '' : 'disabled') + '></label>';
  } else if (entry && entry.displayNumber) {
    numberField = '<div class="voting-assigned-value"><span>Assigned Number</span><strong>#' + votingPageEscape_(entry.displayNumber) + '</strong></div>';
  } else {
    numberField = '<div class="voting-assigned-value"><span>Display Number</span><strong>' + (settings.numberAssignment === "admin" ? 'Assigned by Admin' : 'Assigned automatically') + '</strong></div>';
  }

  var colorField = "";
  if (settings.colorAssignment === "participant") {
    colorField = '<label class="voting-form-field"><span>Display Color</span><input id="votingParticipantDisplayColor" type="text" value="' + votingPageEscape_(entry && entry.displayColor || "") + '" placeholder="Example: Orange" ' + (canEdit ? '' : 'disabled') + '></label>';
  } else if (settings.colorAssignment !== "none" && entry && entry.displayColor) {
    colorField = '<div class="voting-assigned-value"><span>Assigned Color</span><strong>' + votingPageEscape_(entry.displayColor) + '</strong></div>';
  } else if (settings.colorAssignment !== "none") {
    colorField = '<div class="voting-assigned-value"><span>Display Color</span><strong>' + (settings.colorAssignment === "admin" ? 'Assigned by Admin' : 'Assigned automatically') + '</strong></div>';
  }

  return '<section class="card voting-registration-card">' +
    '<div class="voting-section-heading"><div><span class="voting-eyebrow">Participant Entry</span><h2>Submit Your ' + votingPageEscape_(label) + '</h2><p>Your information becomes a voting card after approval.</p></div><span class="voting-entry-status ' + votingPageEscape_(entry && entry.status || 'new') + '">' + votingPageEscape_(statusText) + '</span></div>' +
    (entry && entry.adminNotes ? '<div class="voting-admin-note"><strong>Admin note:</strong> ' + votingPageEscape_(entry.adminNotes) + '</div>' : '') +
    votingPageOwnEntriesHtml_(payload) +
    '<div class="voting-entry-form-grid">' +
      '<label class="voting-form-field"><span>Your Name / Team Name</span><input id="votingParticipantName" type="text" value="' + votingPageEscape_(entry && entry.participantName || '') + '" ' + (canEdit ? '' : 'disabled') + '></label>' +
      '<label class="voting-form-field"><span>' + votingPageEscape_(label) + ' Name *</span><input id="votingParticipantEntryName" type="text" value="' + votingPageEscape_(entry && entry.entryName || '') + '" required ' + (canEdit ? '' : 'disabled') + '></label>' +
    '</div>' +
    (settings.entryIdentifierMode || settings.numberAssignment !== 'participant' && settings.colorAssignment !== 'participant' ? votingPageAssignedIdentity_(entry, settings) : numberField + colorField) +
    '<div class="voting-photo-editor">' +
      '<div id="votingParticipantPhotoPreview" class="voting-photo-preview">' + (photoUrl ? platformImgHtml(photoUrl, { className: 'voting-photo-preview-image', variant: 'card', alt: 'Entry photo', critical: true }) : '<span>Photo preview</span>') + '</div>' +
      '<div><strong>' + votingPageEscape_(label) + ' Photo</strong><p>Take a photo now or choose one already on your device.</p>' +
        (canEdit ? '<div class="voting-photo-actions"><label class="button secondary voting-file-button">Choose Photo<input type="file" accept="image/*" onchange="votingParticipantPhotoChanged_(this)"></label><label class="button secondary voting-file-button">Take Photo<input type="file" accept="image/*" capture="environment" onchange="votingParticipantPhotoChanged_(this)"></label></div><div id="votingPhotoMessage" class="voting-inline-message"></div>' : '') +
      '</div>' +
    '</div>' +
    '<label class="voting-form-field"><span>Description</span><textarea id="votingParticipantDescription" rows="4" ' + (canEdit ? '' : 'disabled') + ' placeholder="Tell voters about this ' + votingPageEscape_(label.toLowerCase()) + '.">' + votingPageEscape_(entry && entry.description || '') + '</textarea></label>' +
    '<label class="voting-form-field"><span>Ingredients / Useful Information</span><textarea id="votingParticipantIngredients" rows="4" ' + (canEdit ? '' : 'disabled') + ' placeholder="Ingredients, allergens, heat level, materials, or other useful details.">' + votingPageEscape_(entry && entry.ingredients || '') + '</textarea></label>' +
    (customFields.length ? '<div class="voting-custom-fields"><h3>Additional Information</h3><div class="voting-entry-form-grid">' + customFields.map(function(field) { return votingPageCustomFieldInput_(field, entry, canEdit); }).join('') + '</div></div>' : '') +
    votingPageEntryCategories_(entry, settings, canEdit) + votingPageEntryRules_(settings) +
    (canEdit ? '<div class="voting-save-row"><button class="button" type="button" onclick="votingSaveParticipant_()">' + (entry ? 'SAVE ENTRY CHANGES' : 'SUBMIT MY DISH') + '</button><span id="votingParticipantMessage" class="voting-inline-message"></span></div>' : '<p class="voting-locked-note">Participant changes are locked.</p>') +
  '</section>';
}

function votingPageEntryMeta_(entry, settings) {
  var parts = [];
  if (entry.displayNumber) parts.push('#' + votingPageEscape_(entry.displayNumber));
  if (entry.displayColor) parts.push(votingPageEscape_(entry.displayColor));
  if (entry.participantName) parts.push(votingPageEscape_(entry.participantName));
  return parts.length ? '<div class="voting-entry-meta">' + parts.join(' · ') + '</div>' : '';
}

function votingPageCustomVisible_(entry, settings) {
  var fields = Array.isArray(settings.customFields) ? settings.customFields : [];
  var data = entry.customData || {};
  var rows = fields.filter(function(field) { return field.voterVisible && data[field.id] !== "" && data[field.id] !== undefined && data[field.id] !== null; }).map(function(field) {
    var value = data[field.id];
    if (typeof value === "boolean") value = value ? "Yes" : "No";
    return '<div class="voting-entry-extra"><strong>' + votingPageEscape_(field.label) + ':</strong> ' + votingPageEscape_(value) + '</div>';
  });
  return rows.join('');
}

function votingPageEntryCard_(entry, settings, controlsHtml) {
  return '<article class="voting-entry-card" data-entry-id="' + votingPageEscape_(entry.entryId) + '">' +
    (entry.imageUrl ? '<div class="voting-entry-image">' + platformImgHtml(entry.imageUrl, { className: 'voting-entry-card-image', variant: 'card', alt: entry.entryName || 'Competition entry' }) + '</div>' : '<div class="voting-entry-image placeholder"><span>★</span></div>') +
    '<div class="voting-entry-card-body">' +
      votingPageEntryMeta_(entry, settings) +
      '<h3>' + votingPageEscape_(entry.entryName) + '</h3>' +
      (entry.description ? '<p>' + votingPageEscape_(entry.description) + '</p>' : '') +
      (entry.ingredients ? '<details class="voting-entry-details"><summary>Ingredients / Info</summary><p>' + votingPageEscape_(entry.ingredients) + '</p></details>' : '') +
      votingPageCustomVisible_(entry, settings) +
      (controlsHtml || '') +
    '</div>' +
  '</article>';
}

function votingPageGetEntry_(entryId) {
  var entries = VOTING_PAGE_STATE.payload && Array.isArray(VOTING_PAGE_STATE.payload.entries) ? VOTING_PAGE_STATE.payload.entries : [];
  return entries.find(function(entry) { return String(entry.entryId || '') === String(entryId || ''); }) || null;
}

function votingPageResolveUi_(requested) {
  requested = String(requested || "auto").toLowerCase();
  if (requested !== "auto") return requested;
  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return "arrows";
  } catch (ignore) {}
  return "drag";
}

function votingPageIsEvaluated_(entryId) {
  return VOTING_PAGE_STATE.evaluatedEntryIds.indexOf(String(entryId || "")) !== -1;
}


function votingPageActiveCategoryId_(payload) {
  var cats = payload && payload.settings && payload.settings.entryCategories || [];
  if (!cats.length) return '';
  var current = VOTING_PAGE_STATE.activeCategoryId;
  if (!cats.some(function(c){return c.id === current;})) current=cats[0].id;
  VOTING_PAGE_STATE.activeCategoryId = current;
  return current;
}
function votingPageCategoryEntries_(payload) {
  var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
  var categoryId = votingPageActiveCategoryId_(payload);
  return !categoryId ? entries.slice() : entries.filter(function(e) {
    return !Array.isArray(e.categoryIds) || e.categoryIds.includes(categoryId);
  });
}
function votingPageCategorySelector_(payload) {
  var cats = payload && payload.settings && payload.settings.entryCategories || [];
  if (!cats.length) return '';
  var active = votingPageActiveCategoryId_(payload);
  return '<label class="cookoff-r9-category-select"><span>Award Category</span><select onchange="votingPageChangeCategory_(this.value)">' +
    cats.map(function(c) {return '<option value="' + votingPageEscape_(c.id) + '"' +
      (active===c.id?' selected':'') + '>' + votingPageEscape_(c.label) + '</option>';}).join('') +
    '</select></label>';
}
function votingPageChangeCategory_(categoryId) {
  var payload = VOTING_PAGE_STATE.payload;
  if (!payload) return;
  VOTING_PAGE_STATE.localRankingsByCategory = VOTING_PAGE_STATE.localRankingsByCategory || {};
  var current = votingPageActiveCategoryId_(payload);
  VOTING_PAGE_STATE.localRankingsByCategory[current] = VOTING_PAGE_STATE.selectedEntryIds.slice();
  VOTING_PAGE_STATE.activeCategoryId = categoryId;
  var saved = payload.ballotsByCategory && payload.ballotsByCategory[categoryId] || [];
  var next = VOTING_PAGE_STATE.localRankingsByCategory[categoryId] ||
    saved.filter(function(r){return Number(r.rank||0)>0;}).sort(function(a,b){return a.rank-b.rank;}).map(function(r){return r.entryId;});
  VOTING_PAGE_STATE.selectedEntryIds = next.slice();
  var vote = document.querySelector('[data-cookoff-panel="vote"]');
  if (vote) vote.innerHTML = votingPageVotingCard_(payload);
  var results = document.querySelector('[data-cookoff-panel="results"]');
  if (results) results.innerHTML = votingPageResultsCard_(payload);
}

function votingPageEligibleEntries_(payload) {
  payload = payload || VOTING_PAGE_STATE.payload || {};
  var entries = votingPageCategoryEntries_(payload);
  var settings = payload.settings || {};
  if (!settings.evaluatedOnly) return entries.slice();
  return entries.filter(function(entry) { return votingPageIsEvaluated_(entry.entryId); });
}

function votingPageBallotLimit_(payload) {
  payload = payload || VOTING_PAGE_STATE.payload || {};
  var settings = payload.settings || {};
  if (settings.judgingMode === "criteria") return 0;
  var count = votingPageEligibleEntries_(payload).length;
  if (settings.votingMethod === "favorite") return Math.min(1, count);
  if (settings.votingMethod === "rank-all") return count;
  return Math.min(Math.max(1, Number(settings.rankLimit || 1)), count);
}

function votingPageCriteriaControls_(entry, settings) {
  var criteria = Array.isArray(settings.criteria) ? settings.criteria : [];
  if (!criteria.length || (settings.judgingMode !== "criteria" && settings.judgingMode !== "combined")) return "";
  var scores = VOTING_PAGE_STATE.criteriaScoresByEntry[entry.entryId] || {};
  return '<div class="voting-criteria-grid">' + criteria.map(function(criterion) {
    var value = Object.prototype.hasOwnProperty.call(scores, criterion.id) ? scores[criterion.id] : '';
    return '<label class="voting-form-field"><span>' + votingPageEscape_(criterion.label) + ' (' + votingPageEscape_(criterion.minScore) + '–' + votingPageEscape_(criterion.maxScore) + ')</span><input type="number" min="' + votingPageEscape_(criterion.minScore) + '" max="' + votingPageEscape_(criterion.maxScore) + '" step="any" value="' + votingPageEscape_(value) + '" onchange="votingCriterionChanged_(\'' + votingPageEscape_(entry.entryId) + '\',\'' + votingPageEscape_(criterion.id) + '\',this.value)"></label>';
  }).join('') + '</div>';
}

function votingPageEvaluationWorkspace_(payload) {
  var settings = payload.settings || {};
  if (votingPageIsCompactMobile_() && settings.judgingMode !== 'criteria') return '';
  var enabled = settings.evaluatedOnly || Number(settings.minimumEvaluatedEntries || 0) > 0 || settings.judgingMode === "criteria" || settings.judgingMode === "combined";
  if (!enabled) return "";
  var minimum = Number(settings.minimumEvaluatedEntries || 0);
  return '<div class="voting-evaluation-workspace"><div class="voting-evaluation-heading"><h3>Tasted / Evaluated</h3><p>Mark the entries you actually evaluated.' + (minimum ? ' At least ' + minimum + ' are required before submission.' : '') + '</p></div><div class="voting-entry-grid">' + (payload.entries || []).map(function(entry) {
    var checked = votingPageIsEvaluated_(entry.entryId);
    var controls = '<label class="voting-evaluated-toggle"><input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="votingEvaluationChanged_(\'' + votingPageEscape_(entry.entryId) + '\',this.checked)"><span>' + (checked ? 'Evaluated ✓' : 'Mark evaluated') + '</span></label>' + votingPageCriteriaControls_(entry, settings);
    return votingPageEntryCard_(entry, settings, controls);
  }).join('') + '</div><div id="votingEvaluationMessage" class="voting-inline-message"></div></div>';
}

async function votingSaveEvaluationState_() {
  if (!VOTING_PAGE_STATE.payload || !VOTING_PAGE_STATE.payload.votingOpen) return;
  var message = document.getElementById('votingEvaluationMessage');
  try {
    var res = await apiSaveVotingCompetitionBallot({ gameId: VOTING_PAGE_STATE.gameId, categoryId: votingPageActiveCategoryId_(VOTING_PAGE_STATE.payload), evaluationOnly: true, evaluatedEntryIds: VOTING_PAGE_STATE.evaluatedEntryIds.slice(), criteriaScoresByEntry: VOTING_PAGE_STATE.criteriaScoresByEntry });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save evaluated entries.');
    if (message) { message.textContent = 'Evaluation state saved ✓'; message.classList.remove('error'); }
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save evaluated entries.'; message.classList.add('error'); }
  }
}

function votingEvaluationChanged_(entryId, checked) {
  entryId = String(entryId || '');
  VOTING_PAGE_STATE.evaluatedEntryIds = VOTING_PAGE_STATE.evaluatedEntryIds.filter(function(id) { return id !== entryId; });
  if (checked) VOTING_PAGE_STATE.evaluatedEntryIds.push(entryId);
  var settings = VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.settings || {};
  if (!checked && settings.evaluatedOnly) VOTING_PAGE_STATE.selectedEntryIds = VOTING_PAGE_STATE.selectedEntryIds.filter(function(id) { return id !== entryId; });
  if (checked && settings.evaluatedOnly && votingPageIsCompactMobile_() && VOTING_PAGE_STATE.payload && settings.judgingMode !== 'criteria') {
    var limit = votingPageBallotLimit_(VOTING_PAGE_STATE.payload);
    if (VOTING_PAGE_STATE.selectedEntryIds.indexOf(entryId) < 0 && VOTING_PAGE_STATE.selectedEntryIds.length < limit) VOTING_PAGE_STATE.selectedEntryIds.push(entryId);
  }
  votingRenderBallotWorkspace_();
  votingSaveEvaluationState_();
}

function votingCriterionChanged_(entryId, criterionId, value) {
  entryId = String(entryId || ''); criterionId = String(criterionId || '');
  var scores = Object.assign({}, VOTING_PAGE_STATE.criteriaScoresByEntry[entryId] || {});
  if (value === '' || value === null || value === undefined) delete scores[criterionId]; else scores[criterionId] = Number(value);
  VOTING_PAGE_STATE.criteriaScoresByEntry[entryId] = scores;
  votingSaveEvaluationState_();
}

function votingPageNumberedWorkspace_(payload) {
  var settings = payload.settings || {};
  var limit = votingPageBallotLimit_(payload);
  var byId = {};
  (payload.ballot || []).forEach(function(row) { byId[row.entryId] = Number(row.rank || 0); });
  return '<div class="voting-numbered-grid">' + votingPageEligibleEntries_(payload).map(function(entry) {
    var selected = byId[entry.entryId] || 0;
    var options = ['<option value="">Not ranked</option>'];
    for (var rank = 1; rank <= limit; rank++) {
      options.push('<option value="' + rank + '" ' + (selected === rank ? 'selected' : '') + '>' + votingPageOrdinal_(rank) + '</option>');
    }
    var controls = '<label class="voting-rank-select"><span>Your Rank</span><select data-voting-numbered-entry="' + votingPageEscape_(entry.entryId) + '" onchange="votingNumberedRankChanged_(this)">' + options.join('') + '</select></label>';
    return votingPageEntryCard_(entry, settings, controls);
  }).join('') + '</div>';
}


/* Compact mobile ballot. The backend remains authoritative for eligibility and scores. */
function votingPageIsCompactMobile_() {
  try { return window.matchMedia('(max-width: 700px)').matches; } catch (ignore) { return false; }
}
function votingPageColorHex_(color) {
  var colors = {red:'#d64b42',blue:'#357cce',green:'#25835b',yellow:'#e5b929',
    orange:'#dc8030',purple:'#8754c2',pink:'#cc5d97',teal:'#168b92',
    black:'#292d35',white:'#e2e5e9',silver:'#a7adb8',gold:'#c69e24'};
  return colors[String(color || '').trim().toLowerCase()] || '#65748b';
}

function votingPageSetRankEntryMode_(mode) {
  VOTING_PAGE_STATE.rankEntryMode = mode === 'number' ? 'number' : 'drag';
  votingRenderBallotWorkspace_();
}
function votingPageDirectRank_(entryId, rank) {
  rank = Number(rank);
  if (!Number.isInteger(rank) || rank < 1) return;
  var payload = VOTING_PAGE_STATE.payload || {};
  var eligible = votingPageEligibleEntries_(payload).some(function(e){return e.entryId === entryId;});
  if (!eligible) return;
  var rows = VOTING_PAGE_STATE.selectedEntryIds;
  var old = rows.indexOf(entryId);
  var limit = votingPageBallotLimit_(payload);
  if (old < 0 && rows.length >= limit) return;
  if (old >= 0) rows.splice(old,1);
  rows.splice(Math.min(rank-1,rows.length),0,entryId);
  votingRenderBallotWorkspace_();
}
function votingPageDirectRankOptions_(id, ranked) {
  var rows = VOTING_PAGE_STATE.selectedEntryIds;
  var allowed = Math.min(votingPageBallotLimit_(VOTING_PAGE_STATE.payload),rows.length+(ranked?0:1));
  var values = [];
  for (var n=1;n<=allowed;n++) values.push('<option value="'+n+'"'+(ranked && rows.indexOf(id)+1===n?' selected':'')+'>'+n+'</option>');
  return '<label class="cookoff-r9-direct-rank">Rank <select aria-label="Rank dish" onchange="votingPageDirectRank_(\'' +
    votingPageEscape_(id) + '\',this.value)">' + (ranked?'':'<option value="" selected>Choose…</option>') + values.join('') + '</select></label>';
}

function votingPageCompactRow_(entry, position, settings) {
  var id = votingPageEscape_(entry.entryId);
  var ate = votingPageIsEvaluated_(entry.entryId);
  var tastingRequired = settings.evaluatedOnly === true;
  var showTasting = tastingRequired || Number(settings.minimumEvaluatedEntries || 0) > 0 || settings.judgingMode === 'combined';
  var ranked = position > 0;
  var showNumber = settings.entryIdentifierMode === "number" || (!settings.entryIdentifierMode && settings.colorAssignment === "none");
  var identifier = showNumber && entry.displayNumber ? "#" + entry.displayNumber + " " : "";
  var swatch = votingPageColorHex_(entry.displayColor);
  var photo = entry.imageUrl ? platformImgHtml(entry.imageUrl, {
    className:'cookoff-r9-photo-image',variant:'thumb',alt:entry.entryName || 'Dish'
  }) : '';
  var numberMode = VOTING_PAGE_STATE.rankEntryMode === 'number';
  var actions = ranked
    ? numberMode ? votingPageDirectRankOptions_(entry.entryId,true) :
      '<div class="cookoff-r9-reorder">' +
        '<button type="button" aria-label="Move dish up" onclick="votingBallotMove_(\'' + id + '\',-1)">▲</button>' +
        '<span class="cookoff-r9-grip" role="img" aria-label="Touch and drag to rank" ontouchstart="votingPageTouchStart_(event)" ontouchmove="event.preventDefault()" ontouchend="votingPageTouchEnd_(event)" ontouchcancel="votingPageTouchCancel_()">⠿</span>' +
        '<button type="button" aria-label="Move dish down" onclick="votingBallotMove_(\'' + id + '\',1)">▼</button>' +
      '</div>'
    : (!tastingRequired || ate ? (numberMode ? votingPageDirectRankOptions_(entry.entryId,false) :
        '<button class="cookoff-r9-add" type="button" onclick="votingBallotAdd_(\'' + id + '\')">+ Rank</button>') : '');
  return '<article class="cookoff-r9-dish' + (tastingRequired && !ate ? ' is-untasted' : '') + '" data-ballot-entry-id="' + id + '"' +
    (ranked ? ' draggable="true" ondragstart="votingBallotDragStart_(event)" ondragover="votingBallotDragOver_(event)" ondrop="votingBallotDrop_(event)"' : '') +
    ' style="--cookoff-dish-color:' + swatch + '">' +
    '<div class="cookoff-r9-row">' +
      '<div class="cookoff-r9-rank">' + (ranked ? position : '–') + '</div>' +
      '<div class="cookoff-r9-main">' +
        '<div class="cookoff-r9-photo">' + photo + '</div>' +
        '<div class="cookoff-r9-shade"></div>' +
        '<div class="cookoff-r9-title"><strong>' + votingPageEscape_(identifier + entry.entryName) + '</strong></div>' +
      '</div>' + actions +
    '</div>' +
    '<div class="cookoff-r9-quick">' +
      (showTasting ? '<label><input type="checkbox" ' + (ate ? 'checked' : '') + ' onchange="votingEvaluationChanged_(\'' + id + '\',this.checked)"> Tasted</label>' : '') +
      '<details><summary>Info / Ingredients</summary>' +
        (entry.description ? '<p>' + votingPageEscape_(entry.description) + '</p>' : '') +
        (entry.ingredients ? '<p><strong>Ingredients:</strong> ' + votingPageEscape_(entry.ingredients) + '</p>' : '') +
        votingPageCustomVisible_(entry, settings) + votingPageCriteriaControls_(entry, settings) +
      '</details>' +
      (ranked ? '<button type="button" class="cookoff-r9-remove" onclick="votingBallotRemove_(\'' + id + '\')">Remove</button>' : '') +
    '</div>' +
  '</article>';
}
var VOTING_R9_TOUCH_ID = '';
var VOTING_R9_TOUCH_START = null;
function votingPageTouchCancel_() {
  VOTING_R9_TOUCH_ID = '';
  VOTING_R9_TOUCH_START = null;
}
function votingPageTouchStart_(event) {
  votingPageTouchCancel_();
  if (!event || !event.touches || event.touches.length !== 1) return;
  var row = event.target && event.target.closest('.cookoff-r9-dish');
  var id = row && row.dataset.ballotEntryId;
  if (!id || VOTING_PAGE_STATE.selectedEntryIds.indexOf(id) === -1) return;
  VOTING_R9_TOUCH_ID = id;
  VOTING_R9_TOUCH_START = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}
function votingPageTouchEnd_(event) {
  var fromId = VOTING_R9_TOUCH_ID;
  var start = VOTING_R9_TOUCH_START;
  votingPageTouchCancel_();
  if (!fromId || !start || !event || !event.changedTouches || event.changedTouches.length !== 1) return;
  var touch = event.changedTouches[0];
  if (Math.abs(touch.clientY - start.y) < 12 && Math.abs(touch.clientX - start.x) < 12) return;
  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  var row = target && target.closest('.cookoff-r9-dish');
  var toId = row && row.dataset.ballotEntryId;
  var rows = VOTING_PAGE_STATE.selectedEntryIds;
  var from = rows.indexOf(fromId);
  var to = rows.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return;
  rows.splice(to, 0, rows.splice(from, 1)[0]);
  votingRenderBallotWorkspace_();
}
function votingPageCompactWorkspace_(payload) {
  var settings = payload.settings || {};
  var limit = votingPageBallotLimit_(payload);
  var entries = votingPageCategoryEntries_(payload);
  var byId = {};
  entries.forEach(function(e) { byId[e.entryId] = e; });
  VOTING_PAGE_STATE.selectedEntryIds = VOTING_PAGE_STATE.selectedEntryIds.filter(function(id) {
    return !!byId[id] && (!settings.evaluatedOnly || votingPageIsEvaluated_(id));
  });
  var selected = VOTING_PAGE_STATE.selectedEntryIds.slice(0, limit);
  var selectedSet = {};
  selected.forEach(function(id) { selectedSet[id] = true; });
  return '<div class="cookoff-r9-workspace">' +
    '<div class="cookoff-r9-mode"><span>Rank using</span><button type="button" class="' + (VOTING_PAGE_STATE.rankEntryMode === 'number' ? '' : 'active') + '" onclick="votingPageSetRankEntryMode_(\'drag\')">Drag / Arrows</button><button type="button" class="' + (VOTING_PAGE_STATE.rankEntryMode === 'number' ? 'active' : '') + '" onclick="votingPageSetRankEntryMode_(\'number\')">Enter Rank</button></div>' +
    '<p class="cookoff-r9-intro">' + (settings.evaluatedOnly ? 'Mark the dishes you ate, then drag or use ▲ ▼ to rank them. Untasted dishes earn no points.' : 'Add the dishes you want to rank, then drag or use ▲ ▼ to arrange them.') + '</p>' +
    '<div class="cookoff-r9-meter">' + selected.length + ' ranked' + (settings.evaluatedOnly || Number(settings.minimumEvaluatedEntries || 0) > 0 || settings.judgingMode === 'combined' ? ' · ' + VOTING_PAGE_STATE.evaluatedEntryIds.length + ' tasted' : '') + '</div>' +
    '<h3>Your Ranking</h3>' +
    (selected.length ? selected.map(function(id,i) { return votingPageCompactRow_(byId[id],i+1,settings); }).join('') : '<p class="voting-empty-state">Mark a dish Tasted to start ranking.</p>') +
    '<h3>Other Dishes</h3>' +
    entries.filter(function(e) { return !selectedSet[e.entryId]; }).map(function(e) { return votingPageCompactRow_(e,0,settings); }).join('') +
    '<div id="votingEvaluationMessage" class="voting-inline-message"></div>' +
  '</div>';
}

function votingPageOrderWorkspaceHtml_() {
  var payload = VOTING_PAGE_STATE.payload || {};
  var settings = payload.settings || {};
  if (votingPageIsCompactMobile_()) return votingPageCompactWorkspace_(payload);
  var limit = votingPageBallotLimit_(payload);
  var eligibleIds = votingPageEligibleEntries_(payload).map(function(entry) { return entry.entryId; });
  VOTING_PAGE_STATE.selectedEntryIds = VOTING_PAGE_STATE.selectedEntryIds.filter(function(id) { return eligibleIds.indexOf(id) !== -1; });
  var selected = VOTING_PAGE_STATE.selectedEntryIds.slice(0, limit);
  var selectedSet = {};
  selected.forEach(function(id) { selectedSet[id] = true; });
  var draggable = VOTING_PAGE_STATE.effectiveUi === "drag";
  var chosenHtml = selected.map(function(entryId, index) {
    var entry = votingPageGetEntry_(entryId);
    if (!entry) return '';
    return '<div class="voting-ballot-row" data-ballot-entry-id="' + votingPageEscape_(entry.entryId) + '" ' + (draggable ? 'draggable="true" ondragstart="votingBallotDragStart_(event)" ondragover="votingBallotDragOver_(event)" ondrop="votingBallotDrop_(event)"' : '') + '>' +
      '<div class="voting-ballot-rank">' + votingPageOrdinal_(index + 1) + '</div>' +
      (entry.imageUrl ? platformImgHtml(entry.imageUrl, { className: 'voting-ballot-thumb', variant: 'thumb', alt: entry.entryName || 'Competition entry' }) : '') +
      '<div class="voting-ballot-name"><strong>' + votingPageEscape_(entry.entryName) + '</strong>' + votingPageEntryMeta_(entry, settings) + '</div>' +
      '<div class="voting-ballot-controls">' + (draggable ? '<span class="voting-drag-handle" title="Drag to reorder">☰</span>' : '') +
        '<button type="button" aria-label="Move up" onclick="votingBallotMove_(\'' + votingPageEscape_(entry.entryId) + '\',-1)">↑</button>' +
        '<button type="button" aria-label="Move down" onclick="votingBallotMove_(\'' + votingPageEscape_(entry.entryId) + '\',1)">↓</button>' +
        '<button type="button" aria-label="Remove" onclick="votingBallotRemove_(\'' + votingPageEscape_(entry.entryId) + '\')">×</button>' +
      '</div>' +
    '</div>';
  }).join('');

  var availableHtml = votingPageEligibleEntries_(payload).filter(function(entry) { return !selectedSet[entry.entryId]; }).map(function(entry) {
    var controls = selected.length < limit ? '<button class="button secondary voting-add-button" type="button" onclick="votingBallotAdd_(\'' + votingPageEscape_(entry.entryId) + '\')">Add to Ballot</button>' : '<span class="voting-limit-note">Ballot full</span>';
    return votingPageEntryCard_(entry, settings, controls);
  }).join('');

  return '<div class="voting-ballot-builder">' +
    '<div class="voting-ballot-selected"><h3>Your Ranked Ballot <span>' + selected.length + ' / ' + limit + '</span></h3>' +
      (draggable ? '<p class="voting-help-text">Drag your selected entries into order. Arrow buttons are also available.</p>' : '<p class="voting-help-text">Use the arrows to put your selected entries in order.</p>') +
      '<div id="votingSelectedBallot">' + (chosenHtml || '<div class="voting-empty-state">Add entries below to start your ballot.</div>') + '</div>' +
    '</div>' +
    '<div class="voting-available-entries"><h3>Available Entries</h3><div class="voting-entry-grid">' + (availableHtml || '<div class="voting-empty-state">All available entries are on your ballot.</div>') + '</div></div>' +
  '</div>';
}

function votingRenderBallotWorkspace_() {
  var target = document.getElementById('votingBallotWorkspace');
  if (!target || !VOTING_PAGE_STATE.payload) return;
  target.innerHTML = VOTING_PAGE_STATE.effectiveUi === "numbered"
    ? votingPageNumberedWorkspace_(VOTING_PAGE_STATE.payload)
    : votingPageOrderWorkspaceHtml_();
}

function votingPageVotingCard_(payload) {
  var settings = payload.settings || {};
  var entries = votingPageCategoryEntries_(payload);
  var currentCategory = (payload.settings && payload.settings.entryCategories || []).find(function(c){return c.id === votingPageActiveCategoryId_(payload);});
  if (currentCategory && currentCategory.audience === "judges" && !payload.isOfficialJudge) return '<section class="card voting-ballot-card">' + votingPageCategorySelector_(payload) + '<h3>Official Judges Only</h3><p>This award category is reserved for appointed judges.</p></section>';
  if (!entries.length) return '<section class="card voting-ballot-card"><div class="voting-section-heading"><div><span class="voting-eyebrow">Voting</span><h2>No published entries yet</h2></div></div><p>Approved participant entries will appear here automatically.</p></section>';
  var limit = votingPageBallotLimit_(payload);
  var judgingMode = settings.judgingMode || 'rank';
  var title = judgingMode === 'criteria' ? 'Score the Entries You Evaluated' : (judgingMode === 'combined' ? 'Rank + Score Your Evaluated Entries' : (settings.votingMethod === "favorite" ? "Choose Your Favorite" : (settings.votingMethod === "rank-all" ? "Rank Every Eligible Entry" : "Rank Your Top " + limit)));
  var status = payload.votingOpen ? "Voting Open" : (payload.votingDeadlinePassed ? "Deadline Passed" : "Voting Closed");
  var rankingWorkspace = judgingMode === 'criteria' ? '' : '<div class="voting-method-note">Ranking style: <strong>' + votingPageEscape_(VOTING_PAGE_STATE.effectiveUi === 'drag' ? 'Drag & Drop' : (VOTING_PAGE_STATE.effectiveUi === 'numbered' ? 'Numbered' : 'Up / Down Arrows')) + '</strong></div><div id="votingBallotWorkspace">' + (VOTING_PAGE_STATE.effectiveUi === "numbered" ? votingPageNumberedWorkspace_(payload) : votingPageOrderWorkspaceHtml_()) + '</div>';
  return '<section class="card voting-ballot-card">' + votingPageCategorySelector_(payload) + '<div class="voting-section-heading"><div><span class="voting-eyebrow">Community Ballot</span><h2>' + votingPageEscape_(title) + '</h2><p>' + votingPageEscape_(settings.instructions || '') + '</p></div><span class="voting-entry-status ' + (payload.votingOpen ? 'approved' : 'rejected') + '">' + status + '</span></div>' + votingPageEvaluationWorkspace_(payload) + rankingWorkspace + (payload.votingOpen ? '<div class="voting-save-row voting-final-submit"><button class="button" type="button" onclick="votingSaveBallot_()">' + (judgingMode === 'criteria' ? 'Submit Criteria Ballot' : 'Save Ballot') + '</button><span id="votingBallotMessage" class="voting-inline-message"></span></div>' : '') + '</section>';
}

function votingPageResultsCard_(payload) {
  if (!payload.resultsVisible) {
    return '<section class="card voting-results-card"><div class="voting-section-heading"><div><span class="voting-eyebrow">Results</span><h2>Results are hidden</h2></div></div><p>Results will appear when the administrator releases them.</p><div class="voting-ballot-count">' + votingPageEscape_(payload.ballotCount || 0) + ' ballots submitted</div></section>';
  }
  var categoryId = votingPageActiveCategoryId_(payload);
  var results = payload.resultsByCategory && payload.resultsByCategory[categoryId] || (Array.isArray(payload.results) ? payload.results : []);
  return '<section class="card voting-results-card">' + votingPageCategorySelector_(payload) + '<div class="voting-section-heading"><div><span class="voting-eyebrow">Results</span><h2>Competition Standings</h2></div><span class="voting-ballot-count">' + votingPageEscape_(payload.ballotCount || 0) + ' ballots</span></div>' +
    (results.length ? '<div class="voting-results-list">' + results.map(function(row) {
      return '<div class="voting-result-row"><div class="voting-result-position">#' + votingPageEscape_(row.position) + '</div>' +
        (row.imageUrl ? platformImgHtml(row.imageUrl, { className: 'voting-result-image', variant: 'thumb', alt: row.entryName || 'Competition entry' }) : '') +
        '<div class="voting-result-name"><strong>' + votingPageEscape_(row.entryName) + '</strong>' +
          '<small>' + [row.displayNumber ? '#' + row.displayNumber : '', row.displayColor || '', row.participantName || ''].filter(Boolean).map(votingPageEscape_).join(' · ') + '</small></div>' +
        '<div class="voting-result-stats"><strong>' + votingPageEscape_(row.totalPoints) + ' pts</strong><small>' + votingPageEscape_(row.firstPlaceVotes) + ' first-place · ' + votingPageEscape_(row.topThreeVotes) + ' top-3</small></div></div>';
    }).join('') + '</div>' : '<p>No ballots have been counted yet.</p>') + '</section>';
}

function votingCollectCustomData_() {
  var settings = VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.settings || {};
  var output = {};
  (settings.customFields || []).forEach(function(field) {
    var el = document.getElementById('votingCustom_' + field.id);
    if (!el) return;
    output[field.id] = (field.type === 'checkbox' || field.type === 'yes-no') ? el.checked : el.value;
  });
  return output;
}

function votingParticipantFileToDataUrl_(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(String(reader.result || '')); };
    reader.onerror = function() { reject(new Error('Could not read photo.')); };
    reader.readAsDataURL(file);
  });
}

function votingParticipantImageFromUrl_(url) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() { resolve(img); };
    img.onerror = function() { reject(new Error('Could not prepare photo.')); };
    img.src = url;
  });
}

async function votingPrepareParticipantPhoto_(file) {
  if (!file) throw new Error('Choose a photo first.');
  var originalUrl = await votingParticipantFileToDataUrl_(file);
  var image = await votingParticipantImageFromUrl_(originalUrl);
  var maxSide = 1400;
  var scale = Math.min(1, maxSide / Math.max(image.width || 1, image.height || 1));
  var canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  var dataUrl = canvas.toDataURL('image/webp', 0.86);
  var comma = dataUrl.indexOf(',');
  return {
    fileName: String(file.name || 'competition-photo').replace(/\.[^.]+$/, '') + '.webp',
    mimeType: 'image/webp',
    base64: comma >= 0 ? dataUrl.slice(comma + 1) : ''
  };
}

async function votingParticipantPhotoChanged_(input) {
  var message = document.getElementById('votingPhotoMessage');
  var file = input && input.files && input.files[0];
  if (!file) return;
  if (message) { message.textContent = 'Preparing photo…'; message.classList.remove('error'); }
  try {
    var prepared = await votingPrepareParticipantPhoto_(file);
    if (message) message.textContent = 'Uploading photo…';
    var res = await apiUploadVotingParticipantImage({
      gameId: VOTING_PAGE_STATE.gameId,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      base64: prepared.base64
    });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Photo upload failed.');
    VOTING_PAGE_STATE.uploadedImageUrl = res.imageUrl || '';
    VOTING_PAGE_STATE.uploadedImageFileId = res.fileId || '';
    var preview = document.getElementById('votingParticipantPhotoPreview');
    if (preview) preview.innerHTML = platformImgHtml(res.imageUrl || '', { className: 'voting-photo-preview-image', variant: 'card', alt: 'Entry photo', critical: true });
    if (message) message.textContent = 'Photo uploaded ✓';
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Photo upload failed.'; message.classList.add('error'); }
  } finally {
    try { input.value = ''; } catch (ignore) {}
  }
}

async function votingSaveParticipant_() {
  var message = document.getElementById('votingParticipantMessage');
  var settings = VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.settings || {};
  function value(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  var payload = {
    gameId: VOTING_PAGE_STATE.gameId,
    entryId: votingPageActiveOwnEntry_(VOTING_PAGE_STATE.payload || {}) && votingPageActiveOwnEntry_(VOTING_PAGE_STATE.payload || {}).entryId || "",
    submissionId: VOTING_PAGE_STATE.submissionId || (VOTING_PAGE_STATE.submissionId = String(Date.now()) + "-" + Math.random().toString(36).slice(2)),
    participantName: value('votingParticipantName'),
    entryName: value('votingParticipantEntryName'),
    imageUrl: VOTING_PAGE_STATE.uploadedImageUrl,
    imageFileId: VOTING_PAGE_STATE.uploadedImageFileId,
    displayNumber: settings.numberAssignment === 'participant' ? value('votingParticipantDisplayNumber') : '',
    displayColor: settings.colorAssignment === 'participant' ? value('votingParticipantDisplayColor') : '',
    description: value('votingParticipantDescription'),
    ingredients: value('votingParticipantIngredients'),
    customData: votingCollectCustomData_()
  };
  if (Array.isArray(settings.entryCategories) && settings.entryCategories.length) {
    payload.customData.cookoffCategoryIds = Array.from(document.querySelectorAll('[data-cookoff-entry-category]:checked')).map(function(el) { return el.value; });
  }
  if (!payload.entryName) {
    if (message) { message.textContent = votingPageEntryLabel_(VOTING_PAGE_STATE.payload) + ' name is required.'; message.classList.add('error'); }
    return;
  }
  if (message) { message.textContent = 'Saving entry…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveVotingParticipant(payload);
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save entry.');
    if (message) { message.textContent = 'GOOD LUCK! CAN’T WAIT TO TASTE THAT DISH!!'; message.classList.remove('error'); }
    var oldEntry = votingPageActiveOwnEntry_(VOTING_PAGE_STATE.payload || {}) || {};
    if (res.displayNumber || res.displayColor || oldEntry.displayNumber || oldEntry.displayColor) {
      var assignment = document.querySelector('.cookoff-r9-assignment');
      if (assignment) assignment.outerHTML = votingPageAssignedIdentity_({displayNumber:res.displayNumber || oldEntry.displayNumber,displayColor:res.displayColor || oldEntry.displayColor},settings);
    }
    var saveButton = document.querySelector('.voting-registration-card .voting-save-row button');
    if (saveButton) saveButton.disabled = true;
    VOTING_PAGE_STATE.submissionId = '';
    VOTING_PAGE_STATE.activeEntryId = res.entryId || '';
    window.setTimeout(function() { navigate('voting', { skipUnsavedCheck: true }); }, 1800);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save entry.'; message.classList.add('error'); }
  }
}

function votingBallotAdd_(entryId) {
  var limit = votingPageBallotLimit_(VOTING_PAGE_STATE.payload);
  var eligible = votingPageEligibleEntries_(VOTING_PAGE_STATE.payload).some(function(entry) { return entry.entryId === entryId; });
  if (!eligible || !entryId || VOTING_PAGE_STATE.selectedEntryIds.indexOf(entryId) !== -1 || VOTING_PAGE_STATE.selectedEntryIds.length >= limit) return;
  if (votingPageIsCompactMobile_() && VOTING_PAGE_STATE.payload && (VOTING_PAGE_STATE.payload.settings || {}).evaluatedOnly && !votingPageIsEvaluated_(entryId)) return;
  VOTING_PAGE_STATE.selectedEntryIds.push(entryId);
  votingRenderBallotWorkspace_();
}

function votingBallotRemove_(entryId) {
  VOTING_PAGE_STATE.selectedEntryIds = VOTING_PAGE_STATE.selectedEntryIds.filter(function(id) { return id !== entryId; });
  votingRenderBallotWorkspace_();
}

function votingBallotMove_(entryId, direction) {
  var rows = VOTING_PAGE_STATE.selectedEntryIds;
  var index = rows.indexOf(entryId);
  var target = index + Number(direction || 0);
  if (index < 0 || target < 0 || target >= rows.length) return;
  rows.splice(index, 1);
  rows.splice(target, 0, entryId);
  votingRenderBallotWorkspace_();
}

var VOTING_DRAG_ENTRY_ID = '';
function votingBallotDragStart_(event) {
  var row = event && event.currentTarget;
  VOTING_DRAG_ENTRY_ID = row ? String(row.dataset.ballotEntryId || '') : '';
  if (event && event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}
function votingBallotDragOver_(event) {
  if (event) event.preventDefault();
}
function votingBallotDrop_(event) {
  if (event) event.preventDefault();
  var row = event && event.currentTarget;
  var targetId = row ? String(row.dataset.ballotEntryId || '') : '';
  if (!VOTING_DRAG_ENTRY_ID || !targetId || VOTING_DRAG_ENTRY_ID === targetId) return;
  var rows = VOTING_PAGE_STATE.selectedEntryIds;
  var from = rows.indexOf(VOTING_DRAG_ENTRY_ID);
  var to = rows.indexOf(targetId);
  if (from < 0 || to < 0) return;
  rows.splice(from, 1);
  rows.splice(to, 0, VOTING_DRAG_ENTRY_ID);
  VOTING_DRAG_ENTRY_ID = '';
  votingRenderBallotWorkspace_();
}

function votingNumberedRankChanged_(select) {
  if (!select || !select.value) return;
  var value = String(select.value);
  document.querySelectorAll('[data-voting-numbered-entry]').forEach(function(other) {
    if (other !== select && String(other.value || '') === value) other.value = '';
  });
}

function votingCollectBallot_() {
  if (VOTING_PAGE_STATE.effectiveUi === 'numbered') {
    return Array.from(document.querySelectorAll('[data-voting-numbered-entry]')).map(function(select) {
      return { entryId: select.dataset.votingNumberedEntry || '', rank: Number(select.value || 0) };
    }).filter(function(row) { return row.entryId && row.rank > 0; }).sort(function(a, b) { return a.rank - b.rank; });
  }
  return VOTING_PAGE_STATE.selectedEntryIds.map(function(entryId, index) { return { entryId: entryId, rank: index + 1 }; });
}

async function votingSaveBallot_() {
  var message = document.getElementById('votingBallotMessage');
  var settings = VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.settings || {};
  var rankings = votingCollectBallot_();
  var limit = votingPageBallotLimit_(VOTING_PAGE_STATE.payload);
  if (votingPageIsCompactMobile_() && settings.evaluatedOnly && rankings.some(function(row) { return !votingPageIsEvaluated_(row.entryId); })) {
    if (message) { message.textContent = 'Only tasted dishes may be ranked.'; message.classList.add('error'); }
    return;
  }
  if (settings.judgingMode !== 'criteria' && rankings.length !== limit) {
    if (message) { message.textContent = 'Rank exactly ' + limit + (limit === 1 ? ' entry.' : ' entries.'); message.classList.add('error'); }
    return;
  }
  if (message) { message.textContent = 'Saving ballot…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveVotingCompetitionBallot({ gameId: VOTING_PAGE_STATE.gameId, categoryId: votingPageActiveCategoryId_(VOTING_PAGE_STATE.payload), rankings: rankings, evaluatedEntryIds: VOTING_PAGE_STATE.evaluatedEntryIds.slice(), criteriaScoresByEntry: VOTING_PAGE_STATE.criteriaScoresByEntry });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save ballot.');
    if (message) message.textContent = 'Ballot saved ✓';
    if (VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.ballotsByCategory) {
      VOTING_PAGE_STATE.payload.ballotsByCategory[votingPageActiveCategoryId_(VOTING_PAGE_STATE.payload)] = rankings.slice();
    }
    window.setTimeout(function() { navigate('voting', { skipUnsavedCheck: true }); }, 400);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save ballot.'; message.classList.add('error'); }
  }
}


/* Cookoff R9: separate player surfaces without changing voting authority. */
function votingPageSwitchSection_(section) {
  var root = document.querySelector('.voting-page');
  if (!root) return;
  ['entry', 'vote', 'results'].forEach(function(name) {
    var panel = root.querySelector('[data-cookoff-panel="' + name + '"]');
    var tab = root.querySelector('[data-cookoff-tab="' + name + '"]');
    if (panel) panel.hidden = name !== section;
    if (tab) {
      tab.setAttribute('aria-pressed', name === section ? 'true' : 'false');
      tab.classList.toggle('is-current', name === section);
    }
  });
  VOTING_PAGE_STATE.activeSection = section;
  if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
}

function votingPageSections_(payload) {
  var entryOpen = payload.registrationOpen === true;
  var canVote = Array.isArray(payload.entries) && payload.entries.length > 0;
  var hasResults = payload.resultsVisible === true;
  var active = (!entryOpen && hasResults && !payload.votingOpen) ? 'results'
    : (!entryOpen || payload.votingOpen) && canVote ? 'vote' : entryOpen ? 'entry' : 'results';
  var choices = [];
  if (entryOpen) choices.push({ id: 'entry', label: 'Enter Cookoff' });
  if (canVote || !entryOpen) choices.push({ id: 'vote', label: 'Vote / Judge' });
  choices.push({ id: 'results', label: 'Results' });
  if (!choices.some(function(item) { return item.id === active; })) active = choices[0].id;
  VOTING_PAGE_STATE.activeSection = active;
  return '<nav class="cookoff-r9-nav" aria-label="Competition areas">' + choices.map(function(item) {
    return '<button class="cookoff-r9-tab' + (active === item.id ? ' is-current' : '') + '" type="button" data-cookoff-tab="' + item.id + '" aria-pressed="' + (active === item.id ? 'true' : 'false') + '" onclick="votingPageSwitchSection_(\'' + item.id + '\')">' + item.label + '</button>';
  }).join('') + '</nav>' +
    '<div class="cookoff-r9-panel" data-cookoff-panel="entry"' + (active !== 'entry' ? ' hidden' : '') + '>' + (entryOpen ? votingPageParticipantCard_(payload) : '') + '</div>' +
    '<div class="cookoff-r9-panel" data-cookoff-panel="vote"' + (active !== 'vote' ? ' hidden' : '') + '>' + votingPageVotingCard_(payload) + '</div>' +
    '<div class="cookoff-r9-panel" data-cookoff-panel="results"' + (active !== 'results' ? ' hidden' : '') + '>' + votingPageResultsCard_(payload) + '</div>';
}

async function renderVotingPage() {
  var gameId = typeof APP_STATE !== 'undefined' ? String(APP_STATE.gameId || '').trim() : '';
  if (!gameId) return '<div class="page"><div class="card error-card">Choose a Voting / Competition game first.</div></div>';
  setPageLoadStep(55, 'Loading competition entries and your ballot…');
  var payload = await apiGetVotingCompetitionState(gameId);
  if (!payload || payload.success === false) return '<div class="page"><div class="card error-card">' + votingPageEscape_(payload && (payload.error || payload.message) || 'Could not load Voting / Competition game.') + '</div></div>';
  VOTING_PAGE_STATE.gameId = gameId; VOTING_PAGE_STATE.payload = payload; VOTING_PAGE_STATE.effectiveUi = votingPageResolveUi_(payload.settings && payload.settings.rankingUi);
  VOTING_PAGE_STATE.selectedEntryIds = ((payload.ballotsByCategory && payload.ballotsByCategory[votingPageActiveCategoryId_(payload)]) || payload.ballot || []).filter(function(row) { return Number(row.rank || 0) > 0; }).slice().sort(function(a, b) { return Number(a.rank || 0) - Number(b.rank || 0); }).map(function(row) { return row.entryId; }).filter(Boolean);
  VOTING_PAGE_STATE.evaluatedEntryIds = []; VOTING_PAGE_STATE.criteriaScoresByEntry = {};
  (payload.evaluations || []).forEach(function(row) { if (row.evaluated) VOTING_PAGE_STATE.evaluatedEntryIds.push(row.entryId); VOTING_PAGE_STATE.criteriaScoresByEntry[row.entryId] = Object.assign({}, row.criteriaScores || {}); });
  return '<div class="page voting-page">' + '<header class="voting-page-header"><div><span class="voting-eyebrow">Voting / Competition</span><h1>' + votingPageEscape_(payload.gameName || 'Competition') + '</h1><p>' + votingPageEscape_(payload.gameDescription || payload.settings.instructions || '') + '</p></div><button class="button secondary" type="button" onclick="navigate(\'dashboard\')">Back to Games</button></header>' + votingPageSections_(payload) + '</div>';
}
