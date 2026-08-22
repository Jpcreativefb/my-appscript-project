/* =========================================================
   SHARED ADMIN UI
   Production hardening v1.1.0
   - Game Manager-style help popups
   - Consistent action progress and save states
   - Safe progressive enhancement for all admin routes
========================================================= */

const ADMIN_UI_HELP_EXACT = {
  // Core game / shared administration.
  "game id": "Permanent internal ID that links this game to questions, picks, results, archives, sports mappings, and external-result mappings. Set it once and avoid changing it after the game is in use.",
  "game name": "Public game name shown to players. Changing this label does not change the permanent Game ID.",
  "game name / title": "Public title shown to players for this game. The permanent Game ID stays separate so you can rename the game safely.",
  "year": "Season, ceremony, or competition year used for organization, filters, schedule building, and archives.",
  "type": "Chooses the game family and which player/admin tools are available. Changing this on an existing live game can change how its questions are presented.",
  "theme color": "Primary accent color used by the game when no more-specific Theme Pack setting overrides it.",
  "lock label": "Player-facing text used to describe the game or pick lock deadline.",
  "available from": "Earliest date/time this game should be shown as available to players.",
  "available until": "Date/time after which this game should stop appearing as an active choice. This is separate from individual question lock times.",
  "description": "Short player-facing explanation of the game. Keep it concise; detailed rules can live in game instructions or help text.",
  "source game": "Existing game used as the starting point for a clone. Historical picks/results remain attached to the original game.",
  "hero image file id": "Google Drive file ID used for the large game image when this game uses Drive-hosted artwork.",
  "hero image position": "Controls which part of the hero image remains visible when the image is cropped to fit its display area.",
  "status": "Current lifecycle state. Setup keeps the item editable, open allows player use, locked prevents new changes, final marks results complete, and archived preserves history outside normal play.",
  "enabled": "Turns this feature on or off while keeping its saved settings. Use this instead of deleting configuration you may want again later.",
  "active": "Makes this item available to the app without deleting its history or configuration when turned off.",
  "lock date": "Exact date/time after which this item should no longer accept new or changed player picks.",
  "lock time": "Time after which this item should no longer accept new or changed player picks.",
  "points": "Points awarded for a correct result for this question or option. Existing finalized history is not automatically rewritten when you change future settings.",
  "question points": "Points awarded when the user answers this question correctly. This changes the current/open question and future copies, not already-finalized history.",
  "display order": "Controls display position. Lower values appear earlier; use direct position controls when available instead of repeatedly renumbering everything.",
  "question order": "Position of this question inside its section or game. Lower positions appear first.",
  "stored display order": "Saved order value currently stored for this question. Use the move/position control when you want to reorganize questions visually.",
  "image url": "Public image URL used for this item. If left blank, the app falls back to its pack/default image or a text-only display.",
  "source url": "Official or supporting source used by an administrator to verify the result.",
  "provider": "External or internal source used to discover/confirm this item, such as Manual, Sports, Kalshi, Polymarket, or another configured provider.",
  "auto settle": "When enabled, an approved final provider result can settle automatically. Keep this off when you want an administrator to review every result first.",
  "require admin review": "Keeps imported results pending until an administrator explicitly approves them.",
  "polling": "How often the system checks for changes. Short intervals provide fresher data but increase API calls and Apps Script execution time.",
  "archive": "Moves completed information into long-term history while preserving results, picks, and reporting data.",
  "retention": "How long detailed operational data is kept before archive/cleanup rules are allowed to remove it.",
  "multiplier": "Controls how a season-long bonus grows. Check the cap and maximum preview before using aggressive values.",
  "penalty": "Points deducted when the configured penalty condition occurs.",
  "team / tribe": "Group assignment used for team questions, colors, images, and pre/post-merge displays.",
  "question type": "Defines what the question is measuring or comparing. This is different from the visual Question Layout and from the scoring mode.",
  "score mode": "Determines how the answer is scored, such as Fixed Points, Confidence, Staked Points, Ranking, or Wager.",
  "layout": "Visual answer layout only. It changes presentation without changing the question's scoring rules.",
  "image source": "Where answer artwork comes from: roster/entity images, group images, a custom override, or no image.",
  "schedule": "Controls when events are built, opened, locked, refreshed, or finalized.",
  "season": "Settings shared across the periods, episodes, legs, rounds, or weeks belonging to the same season.",
  "odds": "External probability/price information used for player context or wager play. Odds alone do not settle a result.",
  "snapshots": "Periodic stored copies of changing scores/odds used for history and diagnostics.",
  "external event id": "Provider event identifier used to connect this item to the External Results Hub.",
  "external market id": "Provider market/question identifier used to connect this question to an external result source.",
  "external subject id": "Provider participant/nominee/team identifier used for entity-level mappings.",
  "threshold": "Numeric cutoff compared against the selected statistic when deciding a Yes/No or over/under result.",
  "comparison": "Comparison rule applied to the imported/current value and the configured threshold.",

  // Awards Manager.
  "awards app game": "Destination PATTC Predicts game for questions built or linked from this Awards Manager session.",
  "default play type": "Default scoring/play behavior assigned to newly built questions. Individual questions can still override it.",
  "official website url": "Official event or organization page shown as the primary non-market source for the awards event.",
  "question display": "Default visual layout for questions built from the selected event. This does not change scoring behavior.",
  "show market odds to players": "Shows external market probabilities/odds beside eligible answers. Turn it off when you want picks made without market influence.",
  "pick changes": "Controls whether players can revise picks before lock and how many changes are permitted.",
  "default section": "Section name automatically assigned to newly built questions unless an individual question specifies another section.",
  "default points": "Points automatically assigned to newly built fixed-point questions unless changed per question.",
  "first question order": "Starting display position for a batch. Later questions are numbered from this point forward.",
  "find event": "Searches the enabled providers for matching events; it does not create questions until you explicitly load/build selections.",
  "category": "Provider category filter used to narrow event discovery. Leave broad when you are unsure how a provider classifies an event.",
  "search in": "Chooses which provider fields are searched for your event text, such as event title, market title, or both.",
  "closing window": "Limits discovered markets by how soon they close so old or far-future markets do not dominate results.",
  "answer text": "Player-facing answer label. Keep it clear even when an image or market probability is also shown.",
  "section": "Question group shown on the Picks page. Sections can also receive their own layout override in Appearance Studio.",
  "play type": "Scoring/play behavior for this question. Appearance layout is configured separately.",
  "market odds display": "Controls whether live market probability/odds are displayed for this specific question.",
  "provider market": "External provider market linked to this question for probability display and/or result mapping.",
  "existing question": "Existing PATTC Predicts question that should receive a provider link instead of creating a duplicate question.",
  "question play type": "Scoring/play behavior for this question. It is intentionally separate from Text/Compact/Image visual layout.",
  "probability display": "Controls whether provider probabilities appear to players and where supported how they are formatted.",
  "number of changes": "Maximum number of times a player may revise this pick before lock. Leave unlimited only when that matches the game rules.",
  "change penalty": "Optional point cost charged when a player changes an already-saved pick.",
  "advanced search": "Extra provider-search filters. Start simple and use these only when normal event search returns too many unrelated results.",
  "advanced settings": "Less-common question/build options. Defaults are designed for the normal workflow; change them only when the game needs different behavior.",
  "advanced tool: link provider market to an existing question": "Links an external market to an existing PATTC Predicts question without rebuilding or duplicating the question.",

  // Sports controls/builders.
  "league": "League whose stored schedule/teams/players should be used for this build or comparison.",
  "load by": "Chooses how games are selected: date range, league week, season scope, or another supported loader. Only fields for the selected method should be required.",
  "date from": "First game date included when loading by date range.",
  "date to": "Last game date included when loading by date range.",
  "season year": "Season year stored with imported games. Some leagues cross calendar years, so use the league's official season year.",
  "season phase": "Optional preseason/regular/postseason or provider season-type filter.",
  "week": "League week to load. This should load the stored games assigned to that official league week without requiring a date range.",
  "player": "Athlete whose stored/final statistics should be used by this question or comparison.",
  "statistic": "Statistic used to compare players/teams or settle the generated question. All selected entities must support it.",
  "over / under line": "Threshold that separates Over from Under for this question.",
  "over odds": "Decimal odds paid for the Over side when this is a wager-style question.",
  "under odds": "Decimal odds paid for the Under side when this is a wager-style question.",
  "prediction points": "Fixed points awarded for a correct prediction when the question is not using wager/stake scoring.",
  "show entities": "Filters the entity list to teams, players, positions, or another supported group without changing stored data.",
  "search": "Filters the current sports entity list. Multi-team/player search is supported where the builder exposes it.",
  "question mode": "Chooses the generated gameplay behavior, such as a fixed prediction or wager, while keeping the source statistic the same.",
  "checkpoint": "Defines which point in the event provides the value used for scoring, such as current score, final game total, or another stored checkpoint.",
  "yes odds": "Decimal odds paid when the configured comparison resolves Yes.",
  "no odds": "Decimal odds paid when the configured comparison resolves No.",
  "question (optional)": "Optional custom player-facing wording. Leave blank to let the builder generate a description from the selected entities/statistic.",

  // Reality TV / season manager.
  "result type": "Defines how the administrator records the final result for this question, such as one winner, multiple winners, Yes/No, or another supported result form.",
  "evidence url (optional)": "Optional source link supporting the entered result, useful for audits and later review.",
  "notes (optional)": "Administrator-only context about this result or correction.",
  "display label": "Player-facing label for this season-long pick or special feature.",
  "starting multiplier": "Multiplier used when the player first makes an eligible season-long pick.",
  "growth per survival": "Amount added to the multiplier each time the selected contestant survives an eligible period.",
  "maximum multiplier cap": "Highest multiplier the season-long bonus is allowed to reach.",
  "weekly eligible-points cap": "Maximum weekly points that may receive the season-long multiplier, preventing one unusually large week from dominating the season.",
  "loss penalty": "Penalty applied when the season-long selection loses under the configured rules.",
  "quit / medical withdrawal": "Controls how non-standard exits such as quits or medical removals affect the season-long selection.",
  "voting tribe / council": "Group participating in this vote. Use it to limit valid voter/target choices to the correct council.",
  "voting round": "Vote/revote round for this ballot so revotes remain separate from the original vote.",
  "voter": "Contestant or participant who cast this ballot.",
  "voted for": "Contestant or participant named on this ballot.",
  "vote status": "Marks the ballot valid, nullified, unrevealed, lost, extra, or another supported status without changing the official elimination result.",
  "vote value": "Number of votes represented by this ballot row when an advantage or special rule changes its weight.",
  "air date/time": "Scheduled local air/start time for this episode or period. Existing picks/questions stay attached if the schedule moves.",
  "pick lock time": "Exact time player picks for this episode/period lock.",
  "schedule note": "Short administrator note explaining a delay, network move, sports conflict, TBA date, or other scheduling change.",

  // Appearance Studio core controls and section headings.
  "theme to edit": "Theme Pack currently loaded into Appearance Studio. Editing the theme changes every game assigned to it after you save.",
  "theme name": "Readable Theme Pack name shown in Appearance Manager.",
  "theme id": "Permanent internal ID for this Theme Pack. Keep it stable after games begin using the theme.",
  "base theme": "Starting Theme Pack whose settings are copied/inherited when creating a new design.",
  "image pack": "Reusable entity artwork set assigned to this game. Individual image overrides still take priority over the pack.",
  "theme pack": "Reusable visual template assigned to this game. It controls presentation, not game scoring or results.",
  "pack to edit": "Image Pack currently being edited. Uploads are saved to this pack rather than directly rewriting the sports/entity source data.",
  "change image": "Uploads/replaces the artwork for this entity inside the selected Image Pack.",
  "density preset": "Quick starting point for matchup spacing and row height. Fine controls below can still override the preset.",
  "team order": "Chooses which side appears first visually. This does not change which team is actually home or away in the sports data.",
  "shadow": "Controls the visual depth around matchup/team cards. It has no effect on layout size or scoring.",
  "image canvas mode": "Chooses how team artwork participates in the button: inline, background art, floating art, or full-button background.",
  "image shape": "Mask applied to inline/floating artwork. Full-button backgrounds ignore this shape and use the card boundary instead.",
  "vertical align": "Vertical anchor used by the selected image/text element inside its available area.",
  "image fit": "Contain keeps the whole image visible; Cover fills the area and may crop; full-button modes can use the entire team surface.",
  "overlay type": "Adds a solid or gradient readability/tint layer without altering the source image file.",
  "overlay color": "Primary color used by the selected overlay layer.",
  "gradient color 2": "Second color used to build the selected gradient.",
  "city alignment": "Horizontal alignment for the smaller city/location line.",
  "team name alignment": "Horizontal alignment for the larger team/nickname line.",
  "text vertical": "Moves the stacked city/team text block toward the top, middle, or bottom of the team button.",
  "score position": "Anchors the score independently from the city/team text. Use inline, center, or any card corner.",
  "confidence vertical": "Vertical alignment of the Confidence control/value within the matchup row.",
  "status alignment": "Horizontal alignment of game time, live clock, or FINAL status inside the scoreboard/status strip.",
  "text alignment": "Horizontal alignment for the selected Home/Away text block when separate positioning is enabled.",
  "selected border": "Border shown around the player's selected team before the game is final.",
  "selected tint": "Background tint added to the selected team while keeping the team image visible.",
  "unselected team": "Controls how strongly the non-selected team is dimmed or converted to grayscale.",
  "correct pick": "Visual treatment used when the player's selected team/question answer is final and correct.",
  "wrong pick": "Visual treatment used when the player's selected team/question answer is final and incorrect.",
  "background": "Base matchup-row background before overlays, team artwork, and result states are applied.",
  "solid surface": "Single base color used when the matchup background mode is Solid.",
  "gradient start": "First color of the matchup/page gradient.",
  "gradient end": "Second color of the matchup/page gradient.",
  "selected overlay": "Additional overlay placed on the selected team surface.",
  "unselected overlay": "Additional overlay placed on the non-selected team surface.",
  "correct overlay": "Overlay used on a final correct selection.",
  "incorrect overlay": "Overlay used on a final incorrect selection.",
  "live row tint": "Color/tint used to distinguish a game currently in progress.",
  "final row tint": "Color/tint used after the game has reached FINAL.",
  "primary text": "Default main text color for the theme before result-state overrides are applied.",
  "muted text": "Secondary text color used for city names, helper labels, records, and other de-emphasized information.",
  "score background": "Background color behind the score itself. This is separate from the larger scoreboard/status strip background.",
  "score font color": "Normal score text color before correct/incorrect result-state colors override it.",
  "score border": "Border color around the score badge itself.",
  "live color": "Accent used for live-game indicators.",
  "final color": "Accent used for FINAL-state indicators.",
  "live badge": "Visual style for the LIVE marker shown while a game is in progress.",
  "final badge": "Visual style for the FINAL marker after a game completes.",
  "scoreboard background": "Background color of the game-time/live/final scoreboard strip between or beneath the team buttons.",
  "scoreboard text": "Text color used for game time, quarter/clock, and FINAL status in the scoreboard strip.",
  "scoreboard border": "Border color around the scoreboard/status strip.",
  "confidence box": "Overall size/shape styling for the Confidence selector/value area.",
  "confidence background": "Background color of the Confidence selector/value area.",
  "confidence text": "Text/number color used in the Confidence selector before correct/incorrect overrides.",
  "confidence border": "Border color around the Confidence selector/value area.",
  "mobile arrow color": "Color of the compact custom Confidence dropdown arrow used on iPhone/mobile layouts.",
  "winning pick overlay": "Controls the extra winner treatment applied when a selected answer/team is final and correct.",
  "winner overlay color": "Primary color used by the winner overlay.",
  "winner gradient color 2": "Second winner-overlay color when a gradient is selected.",
  "overlay placement": "Limits the selected overlay to the full surface or a top/bottom portion.",
  "winner element": "Optional decorative marker such as a trophy, crown, medal, star, or check shown on a winning selection.",
  "element position": "Anchor position for the optional winner decoration.",
  "element color": "Color applied to the optional winner decoration where the selected decoration supports it.",
  "page background type": "Chooses solid or gradient background treatment for the Picks page outside individual cards.",
  "page background": "Base Picks-page background color when using a solid surface.",
  "page gradient start": "First color of the Picks-page gradient.",
  "page gradient end": "Second color of the Picks-page gradient.",
  "header background type": "Chooses solid or gradient treatment for the game header area.",
  "header background": "Primary game-header background color.",
  "header gradient start": "First color of the game-header gradient.",
  "header gradient end": "Second color of the game-header gradient.",
  "header title": "Primary game-header text color.",
  "header secondary text": "Secondary/subtitle text color in the game header.",
  "sort / toolbar background type": "Chooses solid or gradient styling for the Picks sort/filter toolbar.",
  "sort / toolbar background": "Primary toolbar background color.",
  "sort gradient start": "First color of the toolbar gradient.",
  "sort gradient end": "Second color of the toolbar gradient.",
  "sort / toolbar text": "Text color used by sort/filter controls.",
  "save button background type": "Chooses solid or gradient styling for the player Save Picks button.",
  "save button background": "Primary Save Picks button background color.",
  "save gradient start": "First color of the Save Picks button gradient.",
  "save gradient end": "Second color of the Save Picks button gradient.",
  "save button text": "Save Picks button text color.",
  "game default question layout": "Default visual layout for normal questions in this game. It does not change play/scoring type and can be overridden by section or individual question.",
  "question card background type": "Solid or gradient surface used behind the entire question card.",
  "question card background": "Primary background color for the question card.",
  "question card gradient start": "First question-card gradient color.",
  "question card gradient end": "Second question-card gradient color.",
  "question header background type": "Solid or gradient surface behind the question title/header.",
  "question header background": "Primary question-header background color.",
  "question header gradient start": "First question-header gradient color.",
  "question header gradient end": "Second question-header gradient color.",
  "question title": "Text color used by the question title.",
  "answer background type": "Solid or gradient surface used by unselected answer choices.",
  "answer background": "Primary background color of an unselected answer.",
  "answer gradient start": "First unselected-answer gradient color.",
  "answer gradient end": "Second unselected-answer gradient color.",
  "answer text": "Text color used by unselected answers.",
  "answer border": "Border color used by unselected answers.",
  "selected answer background type": "Solid or gradient surface used by the player's selected answer before final scoring.",
  "selected answer background": "Primary selected-answer background color.",
  "selected gradient start": "First selected-answer gradient color.",
  "selected gradient end": "Second selected-answer gradient color.",
  "selected answer text": "Text color used by the player's selected answer.",
  "selected answer border": "Border color used by the player's selected answer.",
  "image ratio": "Aspect ratio of Image-layout answer cards. Wider ratios show more landscape art; taller ratios emphasize portraits/posters.",
  "text overlay type": "Solid or gradient readability layer placed over an Image-layout answer image and behind its answer text.",
  "text overlay color": "Primary color of the Image-layout text readability overlay.",
  "text overlay color 2": "Second color used when the Image-layout text overlay is a gradient.",
  "text overlay placement": "Controls whether the Image-layout text overlay covers the full image or only the text edge/area.",
  "details background": "Background color used by expandable odds/records/favorite details.",
  "details text": "Text color used inside expandable details.",
  "details border": "Border color around expandable details.",

  // Appearance Studio section summaries.
  "layout & density": "Controls the overall matchup-row size, spacing, team order, and density. Start here before fine-positioning individual elements.",
  "typography": "Font size, weight, spacing, and base text treatment for city, team name, score, status, and Confidence text.",
  "images & canvas mode": "Chooses how entity artwork is placed: inline, background art, floating art, or full-button background, plus fit/zoom/position controls.",
  "team text readability overlay": "Optional layer between team artwork and city/team text to keep lettering readable without permanently editing the source image.",
  "element positioning": "Moves text, score, status, Confidence, and image layers inside the matchup template. These controls affect placement, not font styling.",
  "home / away layout": "Use Mirror for a fast symmetrical matchup. Switch to independent controls only when Home and Away need different positioning.",
  "selection & results": "Defines selected, unselected, correct, and incorrect visual states while leaving the underlying pick/result logic unchanged.",
  "background & overlay layers": "Builds solid/gradient surfaces and state overlays for the matchup row and team buttons.",
  "element visibility": "Shows or hides individual matchup elements. Desktop, Tablet, and Mobile can be controlled independently without removing the underlying data.",
  "score styling": "Styles the score badge itself: background, opacity, text, border, padding, and corner radius. Score position is controlled separately.",
  "scoreboard & confidence": "Styles the game-time/live/final status strip and the separate Confidence selector/value area.",
  "winner overlay / decoration": "Adds an optional visual overlay and trophy/crown/medal/star/check decoration to final winning selections.",
  "page / header / bars": "Styles the overall Picks page, game header, sorting toolbar, and Save Picks control independently from individual questions.",
  "question area designer": "Styles normal question cards and answer choices. Visual layout is separate from each question's Fixed/Confidence/Wager/etc. scoring type.",
  "question layout types": "Configures Text, Compact, Image, List, Short Answer, and Wager/Market presentation options used by the game/section/question layout hierarchy.",
  "section / question layout overrides": "Overrides the game-default visual layout for one section or one question without changing its scoring/play type.",
  "expandable details": "Styles the collapsible records, odds, favorite, spread, moneyline, and over/under detail area where those values are available."
};

function adminUiHelpText_(labelText, control) {
  const normalized = adminUiNormalizeText_(labelText).toLowerCase();
  const explicit = control && (
    control.getAttribute("data-help") ||
    control.getAttribute("aria-description") ||
    control.getAttribute("title")
  );
  if (explicit) return adminUiNormalizeText_(explicit);

  if (ADMIN_UI_HELP_EXACT[normalized]) return ADMIN_UI_HELP_EXACT[normalized];

  // Dynamic answer labels are common throughout Awards/Reality/Sports builders.
  if (/^answer\s+\d+/.test(normalized)) {
    return "Player-facing answer option. Its image, provider mapping, scoring value, and display layout are configured separately where supported.";
  }
  if (/^question\s+\d+$/.test(normalized)) {
    return "Question position in this build/review list. Open its settings to change wording, play type, points, layout, or provider mapping.";
  }

  const placeholder = control && control.getAttribute("placeholder");
  if (placeholder) {
    return "Expected entry or format: " + placeholder + ".";
  }

  // Do not manufacture vague “Controls X” help. Unknown controls simply do not
  // receive an automatic help icon until a useful description is defined.
  return "";
}

let ADMIN_UI_LAST_ACTION = null;
let ADMIN_UI_REQUEST_BUTTONS = {};

function adminUiNormalizeText_(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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

function adminUiSimpleTitleNode_(node, title, control) {
  if (!node || node === control || (control && node.contains && node.contains(control))) return false;
  if (!/^(SPAN|DIV|STRONG|B|EM|P)$/.test(String(node.tagName || ""))) return false;
  if (node.querySelector && node.querySelector("input,select,textarea,button,.admin-help-wrap,.admin-sub,.hint,small")) return false;
  if (node.classList && (
    node.classList.contains("admin-sub") ||
    node.classList.contains("hint") ||
    node.classList.contains("admin-message") ||
    node.classList.contains("reality-tv-question-option-copy")
  )) return false;
  return adminUiNormalizeText_(node.textContent) === adminUiNormalizeText_(title);
}

function adminUiFindTitleHost_(label, title, control) {
  const children = Array.from(label.children || []);
  const known = children.find(function(node) {
    return node.classList && (
      node.classList.contains("admin-field-label") ||
      node.classList.contains("reality-tv-field-title") ||
      node.classList.contains("sports-field-label") ||
      node.classList.contains("awards-field-label") ||
      node.classList.contains("appearance-field-label")
    );
  });
  if (known) return known;

  return children.find(function(node) {
    return adminUiSimpleTitleNode_(node, title, control);
  }) || null;
}

function adminUiRemoveDuplicateTitleNodes_(label, heading, title, control) {
  Array.from(label.childNodes || []).forEach(function(node) {
    if (node === heading || node === control) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (adminUiNormalizeText_(node.textContent) === adminUiNormalizeText_(title)) node.remove();
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && adminUiSimpleTitleNode_(node, title, control)) {
      node.remove();
    }
  });
}

function adminUiRepairLegacyDuplicateLabels_(root) {
  root.querySelectorAll("label > .admin-field-label-auto").forEach(function(heading) {
    const label = heading.parentElement;
    if (!label) return;
    const clone = heading.cloneNode(true);
    clone.querySelectorAll(".admin-help-wrap,button").forEach(function(node) { node.remove(); });
    const title = adminUiNormalizeText_(clone.textContent);
    const control = label.querySelector("input,select,textarea");
    if (title) adminUiRemoveDuplicateTitleNodes_(label, heading, title, control);
  });
}

function adminUiEnhanceHelp_(root) {
  if (typeof adminToggleHelpPopover !== "function") return;

  adminUiRepairLegacyDuplicateLabels_(root);

  root.querySelectorAll("label").forEach(function(label) {
    if (label.querySelector(".admin-help-button")) return;
    const control = label.querySelector("input,select,textarea");
    if (!control || control.type === "hidden") return;
    const title = adminUiLabelText_(label, control);
    if (!title || title.length > 90) return;
    const help = adminUiHelpText_(title, control);
    if (!help) return;

    const host = adminUiFindTitleHost_(label, title, control);
    if (host) {
      host.classList.add("admin-field-label-auto-host");
      host.appendChild(adminUiCreateHelp_(title, help));
      return;
    }

    const heading = document.createElement("span");
    heading.className = "admin-field-label admin-field-label-auto";
    heading.appendChild(document.createTextNode(title));
    heading.appendChild(adminUiCreateHelp_(title, help));

    // Remove only the original title text. Inputs and genuine descriptions remain.
    Array.from(label.childNodes).forEach(function(node) {
      if (node.nodeType === Node.TEXT_NODE && adminUiNormalizeText_(node.textContent)) {
        node.remove();
      }
    });
    label.insertBefore(heading, label.firstChild);
    adminUiRemoveDuplicateTitleNodes_(label, heading, title, control);
  });

  root.querySelectorAll("details > summary").forEach(function(summary) {
    if (summary.querySelector(".admin-help-button")) return;
    const title = adminUiNormalizeText_(summary.textContent);
    if (!title || title.length > 100) return;
    const help = adminUiHelpText_(title, null);
    if (!help) return;
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
    const actionAt = Date.now();
    ADMIN_UI_LAST_ACTION = { button: button, at: actionAt };
    setTimeout(function() {
      if (Number(button.__adminApiLastEndAt || 0) >= actionAt) return;
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
    button.__adminApiLastEndAt = Date.now();
    if (ADMIN_UI_LAST_ACTION && ADMIN_UI_LAST_ACTION.button === button) {
      ADMIN_UI_LAST_ACTION = null;
    }
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
