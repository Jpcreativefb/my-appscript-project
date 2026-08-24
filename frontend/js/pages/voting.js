/* =====================================================
   VOTING / COMPETITION PLAYER PAGE v1.2.18z
===================================================== */

var VOTING_PAGE_STATE = VOTING_PAGE_STATE || {
  gameId: "",
  payload: null,
  selectedEntryIds: [],
  effectiveUi: "arrows",
  uploadedImageUrl: "",
  uploadedImageFileId: ""
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

function votingPageParticipantCard_(payload) {
  var settings = payload.settings || {};
  var entry = payload.ownEntry || null;
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
    '<div class="voting-entry-form-grid">' +
      '<label class="voting-form-field"><span>Your Name / Team Name</span><input id="votingParticipantName" type="text" value="' + votingPageEscape_(entry && entry.participantName || '') + '" ' + (canEdit ? '' : 'disabled') + '></label>' +
      '<label class="voting-form-field"><span>' + votingPageEscape_(label) + ' Name *</span><input id="votingParticipantEntryName" type="text" value="' + votingPageEscape_(entry && entry.entryName || '') + '" required ' + (canEdit ? '' : 'disabled') + '></label>' +
      numberField + colorField +
    '</div>' +
    '<div class="voting-photo-editor">' +
      '<div id="votingParticipantPhotoPreview" class="voting-photo-preview">' + (photoUrl ? platformImgHtml(photoUrl, { className: 'voting-photo-preview-image', variant: 'card', alt: 'Entry photo', critical: true }) : '<span>Photo preview</span>') + '</div>' +
      '<div><strong>' + votingPageEscape_(label) + ' Photo</strong><p>Take a photo now or choose one already on your device.</p>' +
        (canEdit ? '<div class="voting-photo-actions"><label class="button secondary voting-file-button">Choose Photo<input type="file" accept="image/*" onchange="votingParticipantPhotoChanged_(this)"></label><label class="button secondary voting-file-button">Take Photo<input type="file" accept="image/*" capture="environment" onchange="votingParticipantPhotoChanged_(this)"></label></div><div id="votingPhotoMessage" class="voting-inline-message"></div>' : '') +
      '</div>' +
    '</div>' +
    '<label class="voting-form-field"><span>Description</span><textarea id="votingParticipantDescription" rows="4" ' + (canEdit ? '' : 'disabled') + ' placeholder="Tell voters about this ' + votingPageEscape_(label.toLowerCase()) + '.">' + votingPageEscape_(entry && entry.description || '') + '</textarea></label>' +
    '<label class="voting-form-field"><span>Ingredients / Useful Information</span><textarea id="votingParticipantIngredients" rows="4" ' + (canEdit ? '' : 'disabled') + ' placeholder="Ingredients, allergens, heat level, materials, or other useful details.">' + votingPageEscape_(entry && entry.ingredients || '') + '</textarea></label>' +
    (customFields.length ? '<div class="voting-custom-fields"><h3>Additional Information</h3><div class="voting-entry-form-grid">' + customFields.map(function(field) { return votingPageCustomFieldInput_(field, entry, canEdit); }).join('') + '</div></div>' : '') +
    (canEdit ? '<div class="voting-save-row"><button class="button" type="button" onclick="votingSaveParticipant_()">' + (entry ? 'Save Entry Changes' : 'Submit Entry') + '</button><span id="votingParticipantMessage" class="voting-inline-message"></span></div>' : '<p class="voting-locked-note">Participant changes are locked.</p>') +
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

function votingPageNumberedWorkspace_(payload) {
  var settings = payload.settings || {};
  var limit = Number(payload.ballotLimit || 0);
  var byId = {};
  (payload.ballot || []).forEach(function(row) { byId[row.entryId] = Number(row.rank || 0); });
  return '<div class="voting-numbered-grid">' + (payload.entries || []).map(function(entry) {
    var selected = byId[entry.entryId] || 0;
    var options = ['<option value="">Not ranked</option>'];
    for (var rank = 1; rank <= limit; rank++) {
      options.push('<option value="' + rank + '" ' + (selected === rank ? 'selected' : '') + '>' + votingPageOrdinal_(rank) + '</option>');
    }
    var controls = '<label class="voting-rank-select"><span>Your Rank</span><select data-voting-numbered-entry="' + votingPageEscape_(entry.entryId) + '" onchange="votingNumberedRankChanged_(this)">' + options.join('') + '</select></label>';
    return votingPageEntryCard_(entry, settings, controls);
  }).join('') + '</div>';
}

function votingPageOrderWorkspaceHtml_() {
  var payload = VOTING_PAGE_STATE.payload || {};
  var settings = payload.settings || {};
  var limit = Number(payload.ballotLimit || 0);
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

  var availableHtml = (payload.entries || []).filter(function(entry) { return !selectedSet[entry.entryId]; }).map(function(entry) {
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
  var entries = Array.isArray(payload.entries) ? payload.entries : [];
  if (!entries.length) {
    return '<section class="card voting-ballot-card"><div class="voting-section-heading"><div><span class="voting-eyebrow">Voting</span><h2>No published entries yet</h2></div></div><p>Approved participant entries will appear here automatically.</p></section>';
  }
  var limit = Number(payload.ballotLimit || 0);
  var title = settings.votingMethod === "favorite" ? "Choose Your Favorite" : (settings.votingMethod === "rank-all" ? "Rank Every Entry" : "Rank Your Top " + limit);
  var status = payload.votingOpen ? "Voting Open" : "Voting Closed";
  return '<section class="card voting-ballot-card">' +
    '<div class="voting-section-heading"><div><span class="voting-eyebrow">Community Ballot</span><h2>' + votingPageEscape_(title) + '</h2><p>' + votingPageEscape_(settings.instructions || '') + '</p></div><span class="voting-entry-status ' + (payload.votingOpen ? 'approved' : 'rejected') + '">' + status + '</span></div>' +
    '<div class="voting-method-note">Voting style: <strong>' + votingPageEscape_(VOTING_PAGE_STATE.effectiveUi === 'drag' ? 'Drag & Drop' : (VOTING_PAGE_STATE.effectiveUi === 'numbered' ? 'Numbered' : 'Up / Down Arrows')) + '</strong></div>' +
    '<div id="votingBallotWorkspace">' + (VOTING_PAGE_STATE.effectiveUi === "numbered" ? votingPageNumberedWorkspace_(payload) : votingPageOrderWorkspaceHtml_()) + '</div>' +
    (payload.votingOpen ? '<div class="voting-save-row"><button class="button" type="button" onclick="votingSaveBallot_()">Save Ballot</button><span id="votingBallotMessage" class="voting-inline-message"></span></div>' : '') +
  '</section>';
}

function votingPageResultsCard_(payload) {
  if (!payload.resultsVisible) {
    return '<section class="card voting-results-card"><div class="voting-section-heading"><div><span class="voting-eyebrow">Results</span><h2>Results are hidden</h2></div></div><p>Results will appear when the administrator releases them.</p><div class="voting-ballot-count">' + votingPageEscape_(payload.ballotCount || 0) + ' ballots submitted</div></section>';
  }
  var results = Array.isArray(payload.results) ? payload.results : [];
  return '<section class="card voting-results-card"><div class="voting-section-heading"><div><span class="voting-eyebrow">Results</span><h2>Competition Standings</h2></div><span class="voting-ballot-count">' + votingPageEscape_(payload.ballotCount || 0) + ' ballots</span></div>' +
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
  if (!payload.entryName) {
    if (message) { message.textContent = votingPageEntryLabel_(VOTING_PAGE_STATE.payload) + ' name is required.'; message.classList.add('error'); }
    return;
  }
  if (message) { message.textContent = 'Saving entry…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveVotingParticipant(payload);
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save entry.');
    if (message) message.textContent = res.message || 'Entry saved ✓';
    window.setTimeout(function() { navigate('voting', { skipUnsavedCheck: true }); }, 450);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save entry.'; message.classList.add('error'); }
  }
}

function votingBallotAdd_(entryId) {
  var limit = Number(VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.ballotLimit || 0);
  if (!entryId || VOTING_PAGE_STATE.selectedEntryIds.indexOf(entryId) !== -1 || VOTING_PAGE_STATE.selectedEntryIds.length >= limit) return;
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
  var rankings = votingCollectBallot_();
  var limit = Number(VOTING_PAGE_STATE.payload && VOTING_PAGE_STATE.payload.ballotLimit || 0);
  if (rankings.length !== limit) {
    if (message) { message.textContent = 'Rank exactly ' + limit + (limit === 1 ? ' entry.' : ' entries.'); message.classList.add('error'); }
    return;
  }
  if (message) { message.textContent = 'Saving ballot…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveVotingCompetitionBallot({ gameId: VOTING_PAGE_STATE.gameId, rankings: rankings });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save ballot.');
    if (message) message.textContent = 'Ballot saved ✓';
    window.setTimeout(function() { navigate('voting', { skipUnsavedCheck: true }); }, 400);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save ballot.'; message.classList.add('error'); }
  }
}

async function renderVotingPage() {
  var gameId = typeof APP_STATE !== 'undefined' ? String(APP_STATE.gameId || '').trim() : '';
  if (!gameId) return '<div class="page"><div class="card error-card">Choose a Voting / Competition game first.</div></div>';
  setPageLoadStep(55, 'Loading competition entries and your ballot…');
  var payload = await apiGetVotingCompetitionState(gameId);
  if (!payload || payload.success === false) {
    return '<div class="page"><div class="card error-card">' + votingPageEscape_(payload && (payload.error || payload.message) || 'Could not load Voting / Competition game.') + '</div></div>';
  }
  VOTING_PAGE_STATE.gameId = gameId;
  VOTING_PAGE_STATE.payload = payload;
  VOTING_PAGE_STATE.effectiveUi = votingPageResolveUi_(payload.settings && payload.settings.rankingUi);
  VOTING_PAGE_STATE.selectedEntryIds = (payload.ballot || []).slice().sort(function(a, b) { return Number(a.rank || 0) - Number(b.rank || 0); }).map(function(row) { return row.entryId; }).filter(Boolean);

  return '<div class="page voting-page">' +
    '<header class="voting-page-header"><div><span class="voting-eyebrow">Voting / Competition</span><h1>' + votingPageEscape_(payload.gameName || 'Competition') + '</h1><p>' + votingPageEscape_(payload.gameDescription || payload.settings.instructions || '') + '</p></div>' +
      '<button class="button secondary" type="button" onclick="navigate(\'dashboard\')">Back to Games</button></header>' +
    votingPageParticipantCard_(payload) +
    votingPageVotingCard_(payload) +
    votingPageResultsCard_(payload) +
  '</div>';
}
