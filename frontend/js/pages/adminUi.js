/* =========================================================
   SHARED ADMIN UI
   Production hardening v1.1.0
   - Game Manager-style help popups
   - Consistent action progress and save states
   - Safe progressive enhancement for all admin routes
========================================================= */

const ADMIN_UI_HELP = {
  "game id": "Permanent internal identifier used to connect questions, picks, results, archives, and external mappings. Avoid changing it after users begin playing.",
  "game name": "Public name shown to players on the dashboard and game pages.",
  "year": "Season or ceremony year used for organization, filtering, and archives.",
  "status": "Controls whether the item is in setup, open, locked, final, archived, or disabled state.",
  "enabled": "Turns this feature on or off without deleting its saved configuration.",
  "active": "Makes this item available to the application. Turning it off preserves historical data.",
  "lock date": "Date and time after which users can no longer create or change picks for this item.",
  "lock time": "Time after which users can no longer create or change picks for this item.",
  "points": "Points awarded when the user selects the correct answer. Final historical scores are not automatically rewritten when future settings change.",
  "display order": "Controls where this item appears relative to other items. Lower numbers appear first.",
  "image url": "Public image URL used for cards and profiles. Leave blank to use a text fallback.",
  "source url": "Official or supporting source used to verify an imported result.",
  "provider": "System responsible for discovering or confirming the result, such as Manual Awards, Reality TV, Kalshi, Polymarket, Sports, or Racing.",
  "auto settle": "Allows an approved final provider result to settle automatically. Keep disabled while testing or when administrator review is required.",
  "require admin review": "Keeps imported results pending until an administrator explicitly approves them.",
  "polling": "How often the system checks for updated data. Shorter intervals use more API calls and Apps Script execution time.",
  "archive": "Moves or copies completed information into long-term storage while preserving history.",
  "retention": "Number of days to keep detailed operational data before archive or cleanup.",
  "multiplier": "Controls how a season-long bonus grows. Use the displayed cap and maximum bonus preview to prevent runaway scoring.",
  "penalty": "Points deducted when the configured loss condition occurs.",
  "team / tribe": "Grouping used for team-based questions, colors, images, and pre-merge display.",
  "question type": "Defines the result behavior and which scoring or provider adapter handles this question.",
  "score mode": "Determines whether this question uses fixed points, confidence points, staked points, ranking, or another supported scoring method.",
  "layout": "Controls whether answers appear as image cards, compact cards, a list, or text-only choices.",
  "image source": "Chooses whether answer images come from the roster, group records, custom answers, or no image source.",
  "schedule": "Controls when events are built, opened, locked, refreshed, and finalized.",
  "season": "Settings shared by all periods, episodes, legs, rounds, or weeks in this game.",
  "odds": "Controls external odds retrieval and API usage limits. Odds do not settle results by themselves.",
  "snapshots": "Stores periodic copies of changing scores or odds for history and diagnostics.",
  "external event id": "Provider-specific event identifier used by the External Results Hub.",
  "external market id": "Provider-specific market or question identifier used by the External Results Hub.",
  "external subject id": "Provider-specific participant, nominee, team, or contestant identifier.",
  "threshold": "Numeric value used with the comparison operator to decide whether the result condition is met.",
  "comparison": "Rule used to compare an imported result with a configured threshold or expected outcome."
};

let ADMIN_UI_LAST_ACTION = null;
let ADMIN_UI_REQUEST_BUTTONS = {};

function adminUiNormalizeText_(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function adminUiHelpText_(labelText, control) {
  const normalized = adminUiNormalizeText_(labelText).toLowerCase();
  const explicit = control && (
    control.getAttribute("data-help") ||
    control.getAttribute("aria-description") ||
    control.getAttribute("title")
  );
  if (explicit) return explicit;

  const keys = Object.keys(ADMIN_UI_HELP);
  const match = keys.find(function(key) {
    return normalized === key || normalized.indexOf(key) !== -1;
  });
  if (match) return ADMIN_UI_HELP[match];

  const placeholder = control && control.getAttribute("placeholder");
  if (placeholder) {
    return "Enter or select " + labelText + ". Example or expected format: " + placeholder + ".";
  }

  return "Controls " + labelText + ". Review the value before saving because it can affect future application behavior.";
}

function adminUiCreateHelp_(title, message) {
  const wrap = document.createElement("span");
  wrap.className = "admin-help-wrap admin-help-auto";
  wrap.innerHTML = [
    '<button type="button" class="admin-help-button" aria-expanded="false" aria-label="Help: ' + adminUiEscape_(title) + '" onclick="adminToggleHelpPopover(event, this)">?</button>',
    '<span class="admin-help-popover" role="tooltip" hidden><strong>' + adminUiEscape_(title) + '</strong><span>' + adminUiEscape_(message) + '</span></span>'
  ].join("");
  return wrap;
}

function adminUiEscape_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminUiLabelText_(label, control) {
  const clone = label.cloneNode(true);
  clone.querySelectorAll("input,select,textarea,button,.admin-help-wrap,.admin-sub,.hint,small").forEach(function(node) {
    node.remove();
  });
  const text = adminUiNormalizeText_(clone.textContent);
  return text || adminUiNormalizeText_(control && (control.name || control.id || control.placeholder)) || "Setting";
}

function adminUiEnhanceHelp_(root) {
  if (typeof adminToggleHelpPopover !== "function") return;

  root.querySelectorAll("label").forEach(function(label) {
    if (label.querySelector(".admin-help-button")) return;
    const control = label.querySelector("input,select,textarea");
    if (!control || control.type === "hidden") return;
    const title = adminUiLabelText_(label, control);
    if (!title || title.length > 90) return;
    const help = adminUiHelpText_(title, control);

    const first = label.firstElementChild;
    if (first && (
      first.classList.contains("admin-field-label") ||
      first.classList.contains("reality-tv-field-title")
    )) {
      first.appendChild(adminUiCreateHelp_(title, help));
      return;
    }

    const heading = document.createElement("span");
    heading.className = "admin-field-label admin-field-label-auto";
    heading.appendChild(document.createTextNode(title));
    heading.appendChild(adminUiCreateHelp_(title, help));

    // Remove only direct text nodes so the input and existing descriptive nodes stay intact.
    Array.from(label.childNodes).forEach(function(node) {
      if (node.nodeType === Node.TEXT_NODE && adminUiNormalizeText_(node.textContent)) {
        node.remove();
      }
    });
    label.insertBefore(heading, label.firstChild);
  });

  root.querySelectorAll("details > summary").forEach(function(summary) {
    if (summary.querySelector(".admin-help-button")) return;
    const title = adminUiNormalizeText_(summary.textContent);
    if (!title || title.length > 100) return;
    const help = adminUiHelpText_(title, null);
    summary.appendChild(adminUiCreateHelp_(title, help));
  });
}

function adminUiIsActionButton_(button) {
  if (!button || button.disabled || button.dataset.adminNoProgress === "true") return false;
  // Expand/collapse and disclosure controls are navigation controls, not API actions.
  // Without this guard, labels such as “Build Status” are mistaken for build buttons
  // and the shared progress UI remains on “Starting…” even though no request should run.
  if (button.hasAttribute("aria-expanded") || button.closest("summary")) return false;
  if (button.classList.contains("secondary") || button.classList.contains("danger")) return false;
  const text = adminUiNormalizeText_(button.textContent).toLowerCase();
  if (!text) return false;
  return /\b(save|create|update|apply|build|sync|approve|submit|import|refresh|repair|rebuild|archive|settle|configure|connect|push|run|load)\b/.test(text);
}

function adminUiProgressWrap_(button) {
  let wrap = button.__adminActionProgress;
  if (wrap && wrap.isConnected) return wrap;

  wrap = document.createElement("div");
  wrap.className = "admin-action-progress-wrap";
  wrap.innerHTML = '<div class="admin-action-progress-track"><span class="admin-action-progress-fill"></span></div><div class="admin-action-progress-text">Working…</div>';
  button.insertAdjacentElement("afterend", wrap);
  button.__adminActionProgress = wrap;
  return wrap;
}

function adminUiStartButton_(button, message) {
  if (!button) return;
  const wrap = adminUiProgressWrap_(button);
  wrap.classList.remove("is-success", "is-error");
  const text = wrap.querySelector(".admin-action-progress-text");
  if (text) text.textContent = message || "Saving changes…";
  button.classList.remove("is-admin-success", "is-admin-error");
  button.classList.add("is-admin-processing");
  button.setAttribute("aria-busy", "true");
}

function adminUiFinishButton_(button, success, message) {
  if (!button) return;
  const wrap = adminUiProgressWrap_(button);
  wrap.classList.remove("is-success", "is-error");
  wrap.classList.add(success ? "is-success" : "is-error");
  const text = wrap.querySelector(".admin-action-progress-text");
  if (text) text.textContent = message || (success ? "Completed." : "Could not complete the action.");
  button.classList.remove("is-admin-processing", "is-admin-success", "is-admin-error");
  button.classList.add(success ? "is-admin-success" : "is-admin-error");
  button.removeAttribute("aria-busy");

  setTimeout(function() {
    if (wrap && wrap.isConnected) wrap.remove();
    button.classList.remove("is-admin-success", "is-admin-error");
    button.__adminActionProgress = null;
  }, success ? 1800 : 4200);
}

function adminUiEnhanceButtons_(root) {
  root.querySelectorAll("button").forEach(function(button) {
    if (adminUiIsActionButton_(button)) button.classList.add("admin-action-button");
  });
}

function adminUiEnhanceCards_(root) {
  root.querySelectorAll("details.admin-collapsible-card, details.reality-tv-subsection, details.reality-tv-create-step").forEach(function(details) {
    details.classList.add("admin-ui-collapsible");
  });
}

function adminUiEnhancePage(root) {
  root = root || document;
  const page = root.querySelector ? root.querySelector(".admin-page") : null;
  if (!page) return;
  adminUiEnhanceCards_(page);
  adminUiEnhanceButtons_(page);
  adminUiEnhanceHelp_(page);
}

if (!window.__adminUiGlobalBound) {
  window.__adminUiGlobalBound = true;

  document.addEventListener("click", function(event) {
    const button = event.target.closest(".admin-page button");
    if (!adminUiIsActionButton_(button)) return;
    ADMIN_UI_LAST_ACTION = { button: button, at: Date.now() };
    setTimeout(function() {
      if (ADMIN_UI_LAST_ACTION && ADMIN_UI_LAST_ACTION.button === button && !button.__adminApiAttached) {
        adminUiStartButton_(button, "Starting…");
      }
    }, 0);
  }, true);

  document.addEventListener("awards:api-start", function(event) {
    const detail = event.detail || {};
    const recent = ADMIN_UI_LAST_ACTION;
    if (!recent || Date.now() - recent.at > 2500 || !recent.button || !recent.button.isConnected) return;
    const button = recent.button;
    button.__adminApiAttached = true;
    ADMIN_UI_REQUEST_BUTTONS[detail.requestId] = button;
    adminUiStartButton_(button, "Working: " + String(detail.action || "saving changes").replace(/^admin/, "").replace(/([A-Z])/g, " $1").trim() + "…");
  });

  document.addEventListener("awards:api-end", function(event) {
    const detail = event.detail || {};
    const button = ADMIN_UI_REQUEST_BUTTONS[detail.requestId];
    if (!button) return;
    delete ADMIN_UI_REQUEST_BUTTONS[detail.requestId];
    button.__adminApiAttached = false;
    const result = detail.result || {};
    adminUiFinishButton_(
      button,
      detail.success !== false,
      detail.success !== false
        ? (result.message || "Completed successfully.")
        : (result.error || result.message || "Could not complete the action.")
    );
  });
}
