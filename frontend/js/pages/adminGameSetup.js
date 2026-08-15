/* ======================
   ADMIN GAME SETUP PAGE
====================== */
let adminSetupCategoryIdTouched = false;
let adminSetupNomineeIdTouched = false;
let adminSetupShortAnswerTouched = false;

const ADMIN_SETUP_UI_ACTION_KEY = "adminGameSetupUiActionV1";

function adminSetupRememberUiAction_(action) {
  const state = Object.assign({}, action || {}, {
    createdAt: Date.now()
  });

  try {
    sessionStorage.setItem(ADMIN_SETUP_UI_ACTION_KEY, JSON.stringify(state));
  } catch (ignore) {
    /* The setup action still succeeds when browser storage is unavailable. */
  }

  return state;
}

function adminSetupReadUiAction_(gameId) {
  let state = null;

  try {
    state = JSON.parse(sessionStorage.getItem(ADMIN_SETUP_UI_ACTION_KEY) || "null");
  } catch (ignore) {
    state = null;
  }

  if (!state || String(state.gameId || "").trim() !== String(gameId || "").trim()) {
    return null;
  }

  if (!state.createdAt || Date.now() - Number(state.createdAt) > 10 * 60 * 1000) {
    try {
      sessionStorage.removeItem(ADMIN_SETUP_UI_ACTION_KEY);
    } catch (ignore) {}
    return null;
  }

  state.categoryId = String(state.categoryId || "").trim().toLowerCase();
  state.sourceCategoryId = String(state.sourceCategoryId || "").trim().toLowerCase();
  state.nomineeIds = Array.isArray(state.nomineeIds)
    ? state.nomineeIds.map(function(value) {
        return String(value || "").trim().toLowerCase();
      }).filter(Boolean)
    : [];

  return state;
}

function adminSetupActionTargetsCategory_(action, categoryId) {
  return Boolean(
    action &&
    String(action.categoryId || "").trim().toLowerCase() ===
      String(categoryId || "").trim().toLowerCase()
  );
}

function adminSetupActionTargetsNominee_(action, categoryId, nomineeId) {
  if (!adminSetupActionTargetsCategory_(action, categoryId)) {
    return false;
  }

  if (action.highlightAllAnswers === true) {
    return true;
  }

  return (action.nomineeIds || []).indexOf(
    String(nomineeId || "").trim().toLowerCase()
  ) !== -1;
}

function renderAdminSetupUiActionBanner_(action) {
  if (!action) return "";

  const labels = {
    "clone-question": "Question cloned",
    "create-question": "Question created",
    "bulk-add-answers": "Answers created",
    "add-answer": "Answer created",
    "clone-answer": "Answer cloned",
    "delete-answer": "Answer deleted",
    "reorder-question": "Question reordered"
  };

  return `
    <div id="adminSetupActionBanner" class="admin-setup-action-banner" role="status">
      <strong>${adminSetupEscapeHtml(labels[action.type] || "Game Setup updated")}</strong>
      <span>${adminSetupEscapeHtml(action.message || "The changed question is open below.")}</span>
    </div>
  `;
}

function adminSetupScheduleUiActionReveal_(action) {
  if (!action) return;

  setTimeout(function() {
    const target = document.getElementById("categoryCard_" + action.categoryId);

    if (target) {
      target.open = true;
      target.classList.add("admin-setup-action-flash");

      const answersPanel = document.getElementById("answersPanel_" + action.categoryId);
      if (answersPanel && action.openAnswers !== false) {
        answersPanel.open = true;
      }

      target.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(function() {
        target.classList.remove("admin-setup-action-flash");
      }, 4500);
    }

    try {
      sessionStorage.removeItem(ADMIN_SETUP_UI_ACTION_KEY);
    } catch (ignore) {}
  }, 80);
}

function adminSetupEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminSetupSlugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function adminSetupFormatDateTimeLocal(value) {

  const text =
    String(value || "").trim();

  if (!text) {
    return "";
  }

  // Already valid for datetime-local:
  // yyyy-MM-ddThh:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  // Convert ISO string:
  // 2026-06-11T19:00:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return text.substring(0, 16);
  }

  return "";

}

function adminSetupAutoFillCategoryId() {
  const nameInput = document.getElementById("setupNewCategoryName");

  const idInput = document.getElementById("setupNewCategoryId");

  if (!nameInput || !idInput || adminSetupCategoryIdTouched) {
    return;
  }

  idInput.value = adminSetupSlugify(nameInput.value);
}

function adminSetupAutoFillNomineeFields() {
  const nomineeInput = document.getElementById("setupNewNomineeName");

  const nomineeIdInput = document.getElementById("setupNewNomineeId");

  const shortAnswerInput = document.getElementById(
    "setupNewNomineeShortAnswer"
  );

  if (!nomineeInput) {
    return;
  }

  const nomineeName = nomineeInput.value.trim();

  if (nomineeIdInput && !adminSetupNomineeIdTouched) {
    nomineeIdInput.value = adminSetupSlugify(nomineeName);
  }

  if (shortAnswerInput && !adminSetupShortAnswerTouched) {
    shortAnswerInput.value = nomineeName;
  }
}

function adminSetupBoolText(value) {
  return value ? "Yes" : "No";
}

function adminSetupFieldId_(prefix, fieldName, suffix) {
  return String(prefix || "") + String(fieldName || "") + String(suffix || "");
}

function adminSetupFieldValue_(id, fallbackValue) {
  const element = document.getElementById(id);

  if (!element) {
    return fallbackValue == null ? "" : fallbackValue;
  }

  return String(element.value == null ? "" : element.value).trim();
}

function adminSetupFieldChecked_(id, fallbackValue) {
  const element = document.getElementById(id);

  return element ? Boolean(element.checked) : Boolean(fallbackValue);
}

function adminSetupSelected_(currentValue, optionValue) {
  return String(currentValue || "").trim().toLowerCase() ===
    String(optionValue || "").trim().toLowerCase()
    ? "selected"
    : "";
}

function adminSetupFieldLabel_(title, helpText) {
  if (typeof adminFieldLabel_ === "function") {
    return adminFieldLabel_(title, helpText);
  }

  return `<span>${adminSetupEscapeHtml(title)}</span>`;
}

function adminSetupCanonicalGameType_(game) {
  const config = game || {};
  const type = String(config.type || config.gameType || "prediction")
    .trim()
    .toLowerCase();
  const gameFormat = String(config.gameFormat || "").trim().toLowerCase();
  const scoringMode = String(config.scoringMode || "").trim().toLowerCase();

  /*
    Hybrid has existed under several persisted names. Treat every alias and
    explicit hybrid flag as the same canonical type so per-question ScoreMode
    remains editable and is not replaced by the Fixed Points default.
  */
  if (
    type === "mixed" ||
    type === "hybrid" ||
    type === "combo" ||
    config.mixedGame === true ||
    gameFormat === "hybrid" ||
    scoringMode === "hybrid"
  ) {
    return "mixed";
  }

  return type;
}

function adminSetupAllowedScoreModes_(game, currentMode) {
  const type = adminSetupCanonicalGameType_(game);
  const modes = [];
  const add = function(value, label) {
    if (!modes.some(function(item) { return item.value === value; })) {
      modes.push({ value: value, label: label });
    }
  };

  if (["prediction", "head-to-head", "survivor"].indexOf(type) !== -1) {
    add("fixed-points", "Fixed Points");
  } else if (type === "staked-prediction") {
    add("staked-points", "Staked Points");
  } else if (type === "confidence") {
    add("confidence-points", "Confidence Points");
  } else if (type === "wager" || type === "racing-wager") {
    add("wager", "Wager");
  } else if (type === "ranking") {
    add("ranking", "Ranking");
  } else {
    if (!game || game.predictionEnabled !== false || game.fixedPointsEnabled !== false) {
      add("fixed-points", "Fixed Points");
    }
    if (game && game.confidenceEnabled === true) {
      add("confidence-points", "Confidence Points");
    }
    if (game && game.stakedPointsEnabled === true) {
      add("staked-points", "Staked Points");
    }
    if (game && game.wagerEnabled === true) {
      add("wager", "Wager");
    }
    if (game && game.rankingEnabled === true) {
      add("ranking", "Ranking");
    }
  }

  const normalizedCurrent = String(currentMode || "fixed-points")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (!modes.some(function(item) { return item.value === normalizedCurrent; })) {
    const labels = {
      "fixed-points": "Fixed Points",
      "confidence-points": "Confidence Points",
      "staked-points": "Staked Points",
      "wager": "Wager",
      "ranking": "Ranking"
    };
    add(normalizedCurrent, (labels[normalizedCurrent] || normalizedCurrent) + " — existing");
  }

  return modes;
}


function adminSetupDefaultScoreMode_(game) {
  const type = adminSetupCanonicalGameType_(game);

  if (type === "staked-prediction") return "staked-points";
  if (type === "confidence") return "confidence-points";
  if (type === "wager" || type === "racing-wager") return "wager";
  if (type === "ranking") return "ranking";
  return "fixed-points";
}

function adminSetupDefaultQuestionType_(game) {
  const type = adminSetupCanonicalGameType_(game);

  if (type === "head-to-head") return "head-to-head";
  if (type === "wager" || type === "racing-wager") return "game-winner";
  if (type === "ranking") return "ranking";
  if (type === "survivor") return "elimination";
  return "category-winner";
}


function adminSetupUniqueValues_(items) {
  const seen = {};
  return (items || []).map(function(value) {
    return String(value || "").trim();
  }).filter(function(value) {
    const key = value.toLowerCase();
    if (!value || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function adminSetupQuestionTypeOptions_() {
  return [
    "category-winner",
    "binary",
    "yes-no",
    "player-compare",
    "team-compare",
    "over-under",
    "game-winner",
    "first-scorer",
    "elimination",
    "ranking",
    "head-to-head",
    "tiebreaker"
  ];
}

function renderAdminSetupDatalists_(categories) {
  const list = Array.isArray(categories) ? categories : [];
  const sections = adminSetupUniqueValues_(list.map(function(category) {
    return category.section || "Main";
  }).concat(["Main", "Predictions", "Staked Predictions", "Wagers", "Bonus", "Tiebreakers"]));
  const groups = adminSetupUniqueValues_(list.map(function(category) {
    return category.settings && category.settings.groupId || "default";
  }).concat(["default"]));
  const providers = ["Manual", "ESPN", "The Academy", "Emmys", "Golden Globes", "TVmaze", "Kalshi", "Polymarket"];

  return `
    <datalist id="adminSetupSectionOptions">
      ${sections.map(function(value) { return `<option value="${adminSetupEscapeHtml(value)}"></option>`; }).join("")}
    </datalist>
    <datalist id="adminSetupGroupOptions">
      ${groups.map(function(value) { return `<option value="${adminSetupEscapeHtml(value)}"></option>`; }).join("")}
    </datalist>
    <datalist id="adminSetupQuestionTypeOptions">
      ${adminSetupQuestionTypeOptions_().map(function(value) { return `<option value="${adminSetupEscapeHtml(value)}"></option>`; }).join("")}
    </datalist>
    <datalist id="adminSetupProviderOptions">
      ${providers.map(function(value) { return `<option value="${adminSetupEscapeHtml(value)}"></option>`; }).join("")}
    </datalist>
  `;
}

function adminSetupCategoryOptions_(categories, selectedId, excludedId, blankLabel) {
  const selected = String(selectedId || "").trim().toLowerCase();
  const excluded = String(excludedId || "").trim().toLowerCase();
  const options = [`<option value="">${adminSetupEscapeHtml(blankLabel || "None")}</option>`];

  (categories || []).forEach(function(category) {
    const categoryId = String(category.categoryId || "").trim();
    if (!categoryId || categoryId.toLowerCase() === excluded) return;
    options.push(`<option value="${adminSetupEscapeHtml(categoryId)}" ${categoryId.toLowerCase() === selected ? "selected" : ""}>${adminSetupEscapeHtml(category.category || categoryId)}</option>`);
  });

  return options.join("");
}

function adminSetupAutoFillCloneCategoryFields(categoryId) {
  const nameInput = document.getElementById("cloneCategoryName_" + categoryId);
  const idInput = document.getElementById("cloneCategoryId_" + categoryId);
  if (!nameInput || !idInput || idInput.dataset.touched === "true") return;

  const suggestedId = String(idInput.dataset.suggestedId || "").trim();
  idInput.value = suggestedId || adminSetupSlugify(nameInput.value);
}

function adminSetupNextSequentialCategoryId_(sourceCategoryId, categories) {
  const used = {};

  (categories || []).forEach(function(category) {
    const id = adminSetupSlugify(category && category.categoryId);
    if (id) used[id] = true;
  });

  const sourceId = adminSetupSlugify(sourceCategoryId) || "question";
  const match = sourceId.match(/^(.*?)-(\d+)$/);
  const base = match && match[1] ? match[1] : sourceId;
  let number = match ? Number(match[2]) + 1 : 2;
  let candidate = base + "-" + number;

  while (used[candidate]) {
    number += 1;
    candidate = base + "-" + number;
  }

  return candidate;
}

function adminSetupNextCategoryDisplayOrder_(categories, section) {
  const targetSection = String(section || "Main").trim().toLowerCase();
  let highest = 0;

  (categories || []).forEach(function(category) {
    const categorySection = String(category && category.section || "Main").trim().toLowerCase();
    if (categorySection !== targetSection) return;

    const order = Number(category && category.settings && category.settings.displayOrder);
    if (Number.isFinite(order) && order > highest) highest = order;
  });

  return highest + 1;
}

function adminSetupAutoFillCloneNomineeFields(categoryId, nomineeId) {
  const nameInput = document.getElementById("cloneNomineeName_" + categoryId + "_" + nomineeId);
  const idInput = document.getElementById("cloneNomineeId_" + categoryId + "_" + nomineeId);
  const shortInput = document.getElementById("cloneNomineeShort_" + categoryId + "_" + nomineeId);
  if (!nameInput) return;
  if (idInput && idInput.dataset.touched !== "true") idInput.value = adminSetupSlugify(nameInput.value);
  if (shortInput && shortInput.dataset.touched !== "true") shortInput.value = nameInput.value;
}

function adminSetupParseBulkAnswerLines_(text) {
  const rows = [];
  String(text || "").split(/\r?\n/).forEach(function(line) {
    const clean = String(line || "").trim();
    if (!clean) return;
    const parts = clean.split("|").map(function(part) { return part.trim(); });
    const nominee = parts[0] || "";
    if (!nominee) return;
    rows.push({
      nominee: nominee,
      shortAnswer: parts[1] || nominee,
      nomineeId: parts[2] || adminSetupSlugify(nominee),
      fileId: parts[3] || ""
    });
  });
  return rows;
}


function adminSetupAnswerPresetItems_(preset) {
  const sets = {
    "yes-no": ["Yes", "No"],
    "true-false": ["True", "False"],
    "over-under": ["Over", "Under"],
    "home-away": ["Home", "Away"],
    "home-away-draw": ["Home", "Away", "Draw"]
  };
  return (sets[String(preset || "")] || []).map(function(name) {
    return {
      nominee: name,
      shortAnswer: name,
      nomineeId: adminSetupSlugify(name)
    };
  });
}

function adminSetupUpdateQuestionFieldVisibility(root) {
  if (!root) {
    return;
  }

  const scoreSelect = root.querySelector("[data-question-score-mode]");
  const scoreMode = scoreSelect ? scoreSelect.value : "fixed-points";

  root.querySelectorAll("[data-score-mode-only]").forEach(function(section) {
    section.hidden = section.dataset.scoreModeOnly !== scoreMode;
  });

  const card = root.closest(".admin-collapsible-body") || root.closest(".admin-category-edit-panel") || root.parentElement;
  if (card) {
    card.querySelectorAll("[data-question-points-field]").forEach(function(field) {
      field.hidden = ["fixed-points", "confidence-points"].indexOf(scoreMode) === -1;
    });
  }

  const sourceSelect = root.querySelector("[data-result-source-type]");
  const sourceType = sourceSelect ? sourceSelect.value : "manual";

  root.querySelectorAll("[data-result-source-advanced]").forEach(function(section) {
    section.hidden = sourceType === "manual";
  });
}

function renderAdminSetupQuestionEngineFields_(prefix, suffix, settings, game) {
  const config = settings || {};
  const id = fieldName => adminSetupFieldId_(prefix, fieldName, suffix);
  const value = fieldName => adminSetupEscapeHtml(config[fieldName] || "");

  const rawScoreMode = String(config.scoreMode || "fixed-points").trim();
  const normalizedScoreMode = rawScoreMode.toLowerCase().replace(/_/g, "-");
  const storedScoreMode = normalizedScoreMode === "correct-pick"
    ? "fixed-points"
    : normalizedScoreMode;
  const gameType = adminSetupCanonicalGameType_(game);
  const scoreModeLocked = gameType !== "mixed";
  /*
    Existing questions always display their own canonical mode. Game Type
    controls which choices are allowed and supplies the add-question default,
    but it no longer rewrites a saved question while rendering the editor.
  */
  const scoreMode = storedScoreMode || adminSetupDefaultScoreMode_(game);
  const scoringEngine = String(config.scoringEngine || (game && game.scoringEngine) || "manual").trim();
  const selectionMode = String(config.selectionMode || "single").trim();
  const resultSourceType = String(config.resultSourceType || "manual").trim();
  const allowedScoreModes = adminSetupAllowedScoreModes_(game, scoreMode);
  const stakedHidden = scoreMode === "staked-points" ? "" : "hidden";
  const externalHidden = resultSourceType === "manual" ? "hidden" : "";

  return `
    <div class="admin-question-engine-fields" data-question-engine-root>
      <div class="admin-setup-subsection">
        <h4>Question and scoring</h4>
        <div class="admin-sub">
          Only scoring modes enabled for this game are shown.
        </div>

        <div class="admin-control-grid">
          <label class="admin-field">
            ${adminSetupFieldLabel_("Score Mode", "Determines whether the question awards fixed points, confidence points, staked points, wager payouts, or ranking credit.")}
            <select
              id="${id("ScoreMode")}"
              data-question-score-mode
              ${scoreModeLocked ? "disabled aria-disabled=\"true\"" : ""}
              onchange="adminSetupUpdateQuestionFieldVisibility(this.closest('[data-question-engine-root]'))"
            >
              ${allowedScoreModes.map(function(mode) {
                return `<option value="${adminSetupEscapeHtml(mode.value)}" ${adminSetupSelected_(scoreMode, mode.value)}>${adminSetupEscapeHtml(mode.label)}</option>`;
              }).join("")}
            </select>
            ${scoreModeLocked
              ? `<input type="hidden" id="${id("ScoreModeCanonical")}" value="${adminSetupEscapeHtml(scoreMode)}"><span class="admin-field-note">Set by Game Type when the question is created. The saved question mode is preserved.</span>`
              : `<span class="admin-field-note">Saved in the dedicated QuestionModes table. Every answer inherits the question mode.</span>`}
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Question Type", "A machine-readable description used by result adapters, such as category-winner, player-compare, binary, over-under, or elimination.")}
            <input
              type="text"
              id="${id("QuestionType")}"
              value="${value("questionType") || "category-winner"}"
              placeholder="player-compare, binary, category-winner"
              list="adminSetupQuestionTypeOptions"
            >
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Scoring Engine", "The system that evaluates the result. Manual works for any question; automated engines require matching source information.")}
            <select id="${id("ScoringEngine")}">
              <option value="manual" ${adminSetupSelected_(scoringEngine, "manual")}>Manual / Category Result</option>
              <option value="sports" ${adminSetupSelected_(scoringEngine, "sports")}>Sports Scores Engine</option>
              <option value="internet" ${adminSetupSelected_(scoringEngine, "internet")}>External Results Hub</option>
              <option value="racing" ${adminSetupSelected_(scoringEngine, "racing")}>Racing Engine</option>
            </select>
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Selection Mode", "Single Answer allows one choice. Multiple Answers allows several. Ranking asks players to order the answers.")}
            <select id="${id("SelectionMode")}">
              <option value="single" ${adminSetupSelected_(selectionMode, "single")}>Single Answer</option>
              <option value="multiple" ${adminSetupSelected_(selectionMode, "multiple")}>Multiple Answers</option>
              <option value="ranking" ${adminSetupSelected_(selectionMode, "ranking")}>Rank Answers</option>
            </select>
          </label>
        </div>
      </div>

      <div class="admin-setup-subsection" data-score-mode-only="staked-points" ${stakedHidden}>
        <h4>Staked-points override</h4>
        <div class="admin-sub">
          Leave values at zero or blank to inherit the game-level staked-points rules.
        </div>

        <div class="admin-control-grid">
          <label class="admin-field">
            ${adminSetupFieldLabel_("Minimum Stake", "Overrides the game's minimum stake for this question. Zero inherits the game rule.")}
            <input type="number" id="${id("MinStake")}" value="${Number(config.minStake) || 0}" min="0">
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Maximum Stake", "Overrides the game's maximum stake for this question. Zero inherits the game rule.")}
            <input type="number" id="${id("MaxStake")}" value="${Number(config.maxStake) || 0}" min="0">
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Stake Increment", "Overrides the allowed step between stake amounts. Zero inherits the game rule.")}
            <input type="number" id="${id("StakeIncrement")}" value="${Number(config.stakeIncrement) || 0}" min="0">
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Win Multiplier", "Overrides the game's net-win multiplier for this question. Blank inherits the game rule.")}
            <input type="number" id="${id("StakeWinMultiplier")}" value="${config.stakeWinMultiplier === "" || config.stakeWinMultiplier == null ? "" : Number(config.stakeWinMultiplier)}" min="0" step="0.01" placeholder="Inherit game rule">
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Loss Multiplier", "Overrides the game's loss multiplier for this question. Blank inherits the game rule.")}
            <input type="number" id="${id("StakeLossMultiplier")}" value="${config.stakeLossMultiplier === "" || config.stakeLossMultiplier == null ? "" : Number(config.stakeLossMultiplier)}" min="0" step="0.01" placeholder="Inherit game rule">
          </label>
        </div>
      </div>

      <div class="admin-setup-subsection">
        <h4>Result source</h4>
        <div class="admin-sub">
          Manual review is the safest default. Choose another source when an adapter will supply the final result.
        </div>

        <div class="admin-control-grid">
          <label class="admin-field">
            ${adminSetupFieldLabel_("Source Type", "Identifies where the result comes from: manual review, sports data, awards, reality TV, prediction markets, or an imported file.")}
            <select
              id="${id("ResultSourceType")}"
              data-result-source-type
              onchange="adminSetupUpdateQuestionFieldVisibility(this.closest('[data-question-engine-root]'))"
            >
              <option value="manual" ${adminSetupSelected_(resultSourceType, "manual")}>Manual / Official Review</option>
              <option value="sports-stats" ${adminSetupSelected_(resultSourceType, "sports-stats")}>Sports Stats</option>
              <option value="awards" ${adminSetupSelected_(resultSourceType, "awards")}>Awards</option>
              <option value="reality-tv" ${adminSetupSelected_(resultSourceType, "reality-tv")}>Reality TV</option>
              <option value="prediction-market" ${adminSetupSelected_(resultSourceType, "prediction-market")}>Prediction Market</option>
              <option value="imported" ${adminSetupSelected_(resultSourceType, "imported")}>Imported JSON / CSV</option>
            </select>
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Provider", "The specific source, such as ESPN, The Academy, Kalshi, Polymarket, or Manual.")}
            <input type="text" id="${id("ResultProvider")}" value="${value("resultProvider")}" placeholder="ESPN, Oscars, Kalshi, Manual" list="adminSetupProviderOptions">
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Result Source Key", "A stable internal key describing the feed or settlement method, such as ESPN_PLAYER_STATS or MANUAL_ADMIN.")}
            <input type="text" id="${id("ResultSource")}" value="${value("resultSource")}" placeholder="ESPN_PLAYER_STATS">
          </label>
        </div>

        <details class="admin-advanced-details" data-result-source-advanced ${externalHidden}>
          <summary>External source mapping</summary>

          <div class="admin-control-grid">
            <label class="admin-field">
              ${adminSetupFieldLabel_("External Event ID", "The external game, ceremony, episode, or event identifier.")}
              <input type="text" id="${id("ExternalEventId")}" value="${value("externalEventId")}" placeholder="ESPN event or ceremony ID">
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("External Market ID", "The external prediction-market identifier when a market resolves this question.")}
              <input type="text" id="${id("ExternalMarketId")}" value="${value("externalMarketId")}" placeholder="Prediction-market ID">
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("External Subject ID", "The athlete, team, nominee, contestant, driver, or other subject identifier.")}
              <input type="text" id="${id("ExternalSubjectId")}" value="${value("externalSubjectId")}" placeholder="Athlete, nominee, contestant, team">
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Stat / Result Key", "The exact field used to evaluate the question, such as passingYards, best-picture, or eliminated.")}
              <input type="text" id="${id("StatKey")}" value="${value("statKey")}" placeholder="passingYards, best-picture, eliminated">
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Comparison", "Used for thresholds and over/under questions. Leave Not Applicable for simple winner questions.")}
              <select id="${id("ComparisonOperator")}">
                <option value="" ${adminSetupSelected_(config.comparisonOperator, "")}>Not Applicable</option>
                <option value="greater-than" ${adminSetupSelected_(config.comparisonOperator, "greater-than")}>Greater Than</option>
                <option value="less-than" ${adminSetupSelected_(config.comparisonOperator, "less-than")}>Less Than</option>
                <option value="greater-or-equal" ${adminSetupSelected_(config.comparisonOperator, "greater-or-equal")}>Greater or Equal</option>
                <option value="less-or-equal" ${adminSetupSelected_(config.comparisonOperator, "less-or-equal")}>Less or Equal</option>
                <option value="equals" ${adminSetupSelected_(config.comparisonOperator, "equals")}>Equals</option>
              </select>
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Threshold", "The number used by an over/under or comparison question, such as 275.5 passing yards.")}
              <input type="number" id="${id("Threshold")}" value="${config.threshold == null ? "" : adminSetupEscapeHtml(config.threshold)}" step="0.01" placeholder="275.5">
            </label>
          </div>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Official Source URL", "A reference link used for auditing or admin review.")}
            <input type="url" id="${id("SourceUrl")}" value="${value("sourceUrl")}" placeholder="https://official-source.example/result">
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Source Configuration JSON", "Advanced adapter settings such as athlete IDs, answer maps, or provider-specific options.")}
            <textarea id="${id("SourceConfigJSON")}" rows="4" placeholder='{"athleteIds":["1","2"],"answerMap":{"YES":"yes"}}'>${value("sourceConfigJSON")}</textarea>
          </label>
        </details>

        <div class="admin-checkbox-row">
          <span class="admin-checkbox-with-help">
            <label><input type="checkbox" id="${id("AutoSettle")}" ${config.autoSettle ? "checked" : ""}> Auto-settle when final</label>
            ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Auto-settle when final", "Settles the question automatically after the connected source reports a final result.") : ""}
          </span>

          <span class="admin-checkbox-with-help">
            <label><input type="checkbox" id="${id("RequireAdminReview")}" ${config.requireAdminReview === false ? "" : "checked"}> Require admin review</label>
            ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Require admin review", "Places detected results into a review step before player scores are settled.") : ""}
          </span>
        </div>
      </div>
    </div>
  `;
}


function adminSetupReadQuestionEngineFields_(prefix, suffix) {
  const id = fieldName => adminSetupFieldId_(prefix, fieldName, suffix);

  return {
    scoreMode: adminSetupFieldValue_(
      id("ScoreMode"),
      adminSetupFieldValue_(id("ScoreModeCanonical"), "fixed-points")
    ),
    questionType: adminSetupFieldValue_(id("QuestionType"), "award-single-winner"),
    scoringEngine: adminSetupFieldValue_(id("ScoringEngine"), "manual"),
    selectionMode: adminSetupFieldValue_(id("SelectionMode"), "single"),
    minStake: adminSetupFieldValue_(id("MinStake"), "0"),
    maxStake: adminSetupFieldValue_(id("MaxStake"), "0"),
    stakeIncrement: adminSetupFieldValue_(id("StakeIncrement"), "0"),
    stakeWinMultiplier: adminSetupFieldValue_(id("StakeWinMultiplier"), ""),
    stakeLossMultiplier: adminSetupFieldValue_(id("StakeLossMultiplier"), ""),
    resultSourceType: adminSetupFieldValue_(id("ResultSourceType"), "manual"),
    resultProvider: adminSetupFieldValue_(id("ResultProvider"), ""),
    resultSource: adminSetupFieldValue_(id("ResultSource"), ""),
    externalEventId: adminSetupFieldValue_(id("ExternalEventId"), ""),
    externalMarketId: adminSetupFieldValue_(id("ExternalMarketId"), ""),
    externalSubjectId: adminSetupFieldValue_(id("ExternalSubjectId"), ""),
    statKey: adminSetupFieldValue_(id("StatKey"), ""),
    comparisonOperator: adminSetupFieldValue_(id("ComparisonOperator"), ""),
    threshold: adminSetupFieldValue_(id("Threshold"), ""),
    sourceUrl: adminSetupFieldValue_(id("SourceUrl"), ""),
    sourceConfigJSON: adminSetupFieldValue_(id("SourceConfigJSON"), ""),
    autoSettle: adminSetupFieldChecked_(id("AutoSettle"), false),
    requireAdminReview: adminSetupFieldChecked_(id("RequireAdminReview"), true),
  };
}

function renderAdminSetupAddCategoryCard(gameId, game, categories) {
  const defaultScoreMode = adminSetupDefaultScoreMode_(game);
  const showPoints = ["fixed-points", "confidence-points"].indexOf(defaultScoreMode) !== -1;

  return `
    <details
      class="card admin-card admin-collapsible-card"
    >

      <summary class="admin-card-summary">

        <div>
          <h2>Add Category / Question</h2>

          <div class="admin-sub">
            Enter the category/question name. The Category ID auto-generates.
          </div>
        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <div class="admin-control-grid">

          <label class="admin-field">
            ${adminSetupFieldLabel_("Category / Question", "The player-facing question or category title.")}

            <input
              type="text"
              id="setupNewCategoryName"
              placeholder="Best Picture"
              oninput="adminSetupAutoFillCategoryId()"
            >
          </label>

          <label class="admin-field" data-question-points-field ${showPoints ? "" : "hidden"}>
            ${adminSetupFieldLabel_("Points", "Used by fixed-point and confidence questions. Staked and wager questions calculate results from the player's stake or wager.")}

            <input
              type="number"
              id="setupNewCategoryPoints"
              value="1"
              min="0"
            >
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Lock Date / Time", "The exact time players can no longer change this question.")}

            <input
              type="datetime-local"
              id="setupNewCategoryLockDateTime"
            >
          </label>

          <label class="admin-field">
            ${adminSetupFieldLabel_("Quick Answer Set", "Optionally creates common answer choices immediately after the question is created.")}
            <select id="setupNewCategoryAnswerPreset">
              <option value="">Add answers later</option>
              <option value="yes-no">Yes / No</option>
              <option value="true-false">True / False</option>
              <option value="over-under">Over / Under</option>
              <option value="home-away">Home / Away</option>
              <option value="home-away-draw">Home / Away / Draw</option>
            </select>
          </label>

        </div>

        <details class="admin-advanced-details">

          <summary>
            Advanced category settings
          </summary>

          <div class="admin-control-grid">

            <label class="admin-field">
              ${adminSetupFieldLabel_("Category ID", "A permanent URL-safe identifier. It auto-generates from the question title.")}

              <input
                type="text"
                id="setupNewCategoryId"
                placeholder="auto-generated"
                oninput="adminSetupCategoryIdTouched = true"
              >
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Section", "Groups related questions together on the player page.")}

              <input
                type="text"
                id="setupNewCategorySection"
                placeholder="Main"
                value="Main"
                list="adminSetupSectionOptions"
              >
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Group ID", "An internal grouping key used by layouts, follow-ups, and bulk controls.")}

              <input
                type="text"
                id="setupNewCategoryGroupId"
                placeholder="default"
                value="default"
                list="adminSetupGroupOptions"
              >
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Display Order", "Lower numbers appear earlier within the section.")}

              <input
                type="number"
                id="setupNewCategoryDisplayOrder"
                value="999"
                min="0"
              >
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Layout Type", "Controls whether answers appear as image cards, text, compact cards, or a list.")}

              <select id="setupNewCategoryLayoutType">
                <option value="image">Image</option>
                <option value="text">Text</option>
                <option value="compact">Compact</option>
                <option value="list">List</option>
              </select>
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Parent Question", "Optional link to a parent question for conditional or grouped flows.")}
              <select id="setupNewCategoryParentCategoryId">
                ${adminSetupCategoryOptions_(categories, "", "", "No parent question")}
              </select>
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Follow-Up Question", "Optional question to reveal or activate after this question resolves.")}
              <select id="setupNewCategoryFollowUpCategoryId">
                ${adminSetupCategoryOptions_(categories, "", "", "No follow-up question")}
              </select>
            </label>

          </div>

          ${renderAdminSetupQuestionEngineFields_(
            "setupNewCategory",
            "",
            {
              scoreMode: defaultScoreMode,
              questionType: adminSetupDefaultQuestionType_(game),
              scoringEngine: (game && game.scoringEngine) || "manual",
              selectionMode: "single",
              resultSourceType: "manual",
              requireAdminReview: true,
            },
            game
          )}

          <label class="admin-field">
            ${adminSetupFieldLabel_("Follow-Up Map JSON", "Advanced mapping from a winning answer ID to a follow-up category ID.")}

            <textarea
              id="setupNewCategoryFollowUpMapJSON"
              rows="4"
              placeholder='{"winner-id":"follow-up-category-id"}'
            ></textarea>
          </label>

          <div class="admin-checkbox-row">
            <span class="admin-checkbox-with-help">
              <label class="admin-check-row">
                <input type="checkbox" id="setupNewCategoryCountsAsStatue" checked>
                <span>Counts as statue</span>
              </label>
              ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Counts as statue", "Includes this question in award-statue totals. Turn it off for sports, props, bonuses, and non-award questions.") : ""}
            </span>

            <span class="admin-checkbox-with-help">
              <label class="admin-check-row">
                <input type="checkbox" id="setupNewCategoryLocked">
                <span>Start locked</span>
              </label>
              ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Start locked", "Creates the question in a locked state so players cannot make picks until an admin opens it.") : ""}
            </span>
          </div>

        </details>

        <button
          class="admin-small-button"
          onclick="adminSetupCreateCategory('${adminSetupEscapeHtml(gameId)}')"
        >
          Add Question
        </button>

        <div
          id="setupAddCategoryMessage"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;
}

async function renderAdminGameSetupPage(gameId) {

  setPageLoadStep(50, "Loading game questions, answers, and settings…");
  const safeGameId =
    String(gameId || "").trim();

  if (!safeGameId) {
    return `
      <div class="page admin-page">

        <h1>Game Setup</h1>

        <div class="card admin-card error-card">
          Missing game ID.
        </div>

      </div>
    `;
  }

  const res =
    await apiAdminGetGameSetup(
      safeGameId
    );

  if (!res || res.success === false) {
    return `
      <div class="page admin-page">

        <h1>Game Setup</h1>

        <div class="card admin-card error-card">
          Could not load game setup.
          <br>
          ${adminSetupEscapeHtml(
            res && (res.message || res.error)
              ? res.message || res.error
              : "Please refresh and try again."
          )}
        </div>

        <button
          class="admin-small-button secondary"
          onclick="navigate('admin-games')"
        >
          Back to Manage Games
        </button>

      </div>
    `;
  }

  const categories =
    Array.isArray(res.categories)
      ? res.categories
      : [];

  const game =
    res.game || {
      gameId: safeGameId,
      type: "prediction",
      predictionEnabled: true,
      fixedPointsEnabled: true
    };

  const isLeaderboardOnlyHub =
    game.gameRole === "parent" &&
    game.hubMode === "leaderboard-only";

  const uiAction = adminSetupReadUiAction_(safeGameId);
  adminSetupScheduleUiActionReveal_(uiAction);

  return `
    <div class="page admin-page admin-game-setup-page">

      ${renderAdminSetupDatalists_(categories)}

      <div class="admin-page-header">

        <div>
          <h1>Game Setup</h1>

          <div class="admin-sub">
            ${adminSetupEscapeHtml(safeGameId)}
          </div>
        </div>

        <div class="admin-header-actions">

          <button
            class="admin-small-button"
            onclick="adminSetupFinalizeResults('${adminSetupEscapeHtml(
              safeGameId
            )}', true)"
          >
            Mark Results Finalized
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupFinalizeResults('${adminSetupEscapeHtml(
              safeGameId
            )}', false)"
          >
            Reopen Results
          </button>

          <button
          class="admin-small-button secondary"
          onclick="adminSetupScoringAutomationSetup('${adminSetupEscapeHtml(
            safeGameId
          )}')"
        >
          Setup Scoring
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminSetupRunScoringAutomation('${adminSetupEscapeHtml(
            safeGameId
          )}')"
        >
          Run Scoring Now
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminSetupStartAutoScoring()"
        >
          Start Auto Scoring
        </button>

        <button
          class="admin-small-button secondary"
          onclick="adminSetupStopAutoScoring()"
        >
          Stop Auto Scoring
        </button>

          <button
            class="admin-small-button secondary"
            onclick="navigate('admin-games')"
          >
            Back to Manage Games
          </button>

        </div>

      </div>

      <div class="admin-section">

        ${isLeaderboardOnlyHub ? `
          <div class="card admin-card admin-season-hub-notice">
            <h2>Leaderboard-Only Season Hub</h2>
            <p>
              This hub combines mini-game standings and links. It does not accept parent-level categories or questions.
              Change Hub Mode to <strong>Playable + Aggregate</strong> in Manage Games to add season-long questions.
            </p>
          </div>
        ` : renderAdminSetupAddCategoryCard(safeGameId, game, categories)}

        <details
          class="card admin-card admin-collapsible-card admin-categories-main-card"
          ${uiAction ? "open" : ""}
        >

          <summary class="admin-card-summary">

            <div>
              <h2>${isLeaderboardOnlyHub ? "Stored Categories / Questions" : "Categories / Questions"}</h2>

              <div class="admin-sub">
                ${categories.length} categories/questions configured.${isLeaderboardOnlyHub ? " Stored parent questions are excluded from the hub standings." : ""}
              </div>
            </div>

            <span class="admin-collapse-icon">
              ▾
            </span>

          </summary>

          <div class="admin-collapsible-body">

            <div
              id="adminSetupMessage"
              class="admin-message"
            ></div>

            ${renderAdminSetupUiActionBanner_(uiAction)}

            <div class="admin-setup-save-all-bar">
              <div>
                <strong>Question and answer changes</strong>
                <div class="admin-sub">Edit several existing questions and answers, then save them together.</div>
              </div>
              <button
                type="button"
                id="adminSetupSaveAllButton"
                class="admin-small-button admin-save-state-button"
                onclick="adminSetupSaveAllChanges('${adminSetupEscapeHtml(safeGameId)}')"
              >
                SAVE ALL CHANGES
              </button>
            </div>

            <div class="admin-card-actions">

            <button
              class="admin-small-button secondary"
              onclick="adminSetupScoringAutomationSetup('${adminSetupEscapeHtml(
                safeGameId
              )}')"
            >
              Setup Scoring
            </button>

            <button
              class="admin-small-button secondary"
              onclick="adminSetupRunScoringAutomation('${adminSetupEscapeHtml(
                safeGameId
              )}')"
            >
              Run Scoring Now
            </button>

            <button
              class="admin-small-button secondary"
              onclick="adminSetupStartAutoScoring()"
            >
              Start Auto Scoring
            </button>

            <button
              class="admin-small-button secondary"
              onclick="adminSetupStopAutoScoring()"
            >
              Stop Auto Scoring
            </button>

          </div>

          <details class="admin-advanced-details" open>

          <summary>
            Internet Results Import
          </summary>

          <div class="admin-control-grid">

            <label class="admin-field">
              <span>Source ID</span>

              <input
                type="text"
                id="internetSourceId"
                value="manual-results"
                placeholder="espn-nfl-scoreboard"
              >
            </label>

            <label class="admin-field">
              <span>Source Name</span>

              <input
                type="text"
                id="internetSourceName"
                value="Manual Results"
                placeholder="ESPN NFL Scoreboard"
              >
            </label>

            <label class="admin-field">
              <span>Source Type</span>

              <select id="internetSourceType">

                <option value="manual">
                  Manual Text
                </option>

                <option value="webpage">
                  Webpage / HTML
                </option>

                <option value="json">
                  JSON / API
                </option>

                <option value="csv">
                  CSV / Text
                </option>

              </select>
            </label>

            <label class="admin-field">
              <span>Parser Type</span>

              <select id="internetParserType">

                <option value="manual-text">
                  Manual Text
                </option>

                <option value="webpage-text">
                  Webpage Text
                </option>

                <option value="json">
                  JSON
                </option>

                <option value="csv">
                  CSV / Text
                </option>

              </select>
            </label>

            <label class="admin-field">
              <span>Match Mode</span>

              <select id="internetMatchMode">

                <option value="nominee-name">
                  Nominee Name
                </option>

                <option value="category-name">
                  Category Name
                </option>

                <option value="team-name">
                  Team Name
                </option>

                <option value="market-title">
                  Market Title
                </option>

                <option value="raw">
                  Raw Only
                </option>

              </select>
            </label>

            <label class="admin-field">
              <span>Trust Level</span>

              <select id="internetTrustLevel">

                <option value="low">
                  Low
                </option>

                <option value="medium" selected>
                  Medium
                </option>

                <option value="high">
                  High
                </option>

                <option value="official">
                  Official
                </option>

              </select>
            </label>

          </div>

          <label class="admin-field">
            <span>URL</span>

            <input
              type="url"
              id="internetSourceUrl"
              placeholder="https://example.com/results"
            >
          </label>

          <label class="admin-field">
            <span>Manual Results Text</span>

            <textarea
              id="internetManualText"
              rows="6"
              placeholder="Paste results here. Example: Best Picture: Anora"
            ></textarea>
          </label>

          <div class="admin-card-actions">

          <button
            class="admin-small-button secondary"
            onclick="adminSetupLoadInternetSources('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Load Saved Sources
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupSaveInternetSource('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Save Source
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupInternetResultsSetup('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Setup Internet Imports
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupPullInternetResults('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Pull Internet Results
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupViewLastInternetImport('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            View Last Import
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupGenerateResultSuggestions('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Generate Suggestions
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupParseSportsScoreboard('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Parse Sports Scoreboard
          </button>

          <button
            class="admin-small-button secondary"
            onclick="adminSetupViewResultSuggestions('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            View Suggestions
          </button>

          <button
            class="admin-small-button"
            onclick="adminSetupApplyHighConfidenceSuggestions('${adminSetupEscapeHtml(
              safeGameId
            )}')"
          >
            Apply High Confidence
          </button>

        </div>

          <div class="admin-control-grid">

          <label class="admin-field">
            <span>Bulk Apply Min Confidence</span>

            <input
              type="number"
              id="internetSuggestionMinConfidence"
              value="90"
              min="0"
              max="100"
            >
          </label>

        </div>

          <div
            id="internetImportMessage"
            class="admin-message"
          ></div>

          <div
            id="internetSourcesPanel"
            class="admin-sources-panel"
          ></div>

          <pre
            id="internetImportPreview"
            class="admin-code-preview"
          ></pre>

          <div
            id="resultSuggestionsPanel"
            class="admin-suggestions-panel"
          ></div>

          <div
            id="sportsScoreboardPanel"
            class="admin-sources-panel"
          ></div>

        </details>

            ${
              categories.length
                ? `
                  <div class="admin-list admin-category-list">
                    ${categories
                      .map(category =>
                        renderAdminSetupCategoryCard(category, game, categories, uiAction)
                      )
                      .join("")}
                  </div>
                `
                : `
                  <div class="admin-sub">
                    No categories found yet. Add your first category above.
                  </div>
                `
            }

          </div>

        </details>

      </div>

    </div>
  `;
}

function adminSetupOpenAttr(defaultOpen) {
  return defaultOpen ? "open" : "";
}

/* ======================
   ADMIN FILE ID HELPERS
====================== */

function adminSetupCleanFileId(value) {
  return String(value || "").trim();
}

function adminSetupExtractDriveFileId(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  // Already looks like a plain Drive file ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text) && text.indexOf("/") === -1) {
    return text;
  }

  // Format:
  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = text.match(/\/file\/d\/([^/]+)/);

  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }

  // Format:
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const idMatch = text.match(/[?&]id=([^&]+)/);

  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return text;
}

function adminSetupDriveThumbnailUrl(fileId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(fileId) +
    "&sz=w240-h360"
  );
}

function adminSetupDriveViewUrl(fileId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/file/d/" + encodeURIComponent(fileId) + "/view"
  );
}

function adminSetupDriveDownloadUrl(fileId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/uc?export=download&id=" +
    encodeURIComponent(fileId)
  );
}

function adminSetupCopyText(value) {
  const text = String(value || "").trim();

  if (!text) {
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function adminSetupNormalizeFileInput(inputId) {
  const input = document.getElementById(inputId);

  if (!input) {
    return;
  }

  input.value = adminSetupExtractDriveFileId(input.value);
}

function renderAdminSetupFileTools(fileId, inputId) {
  fileId = adminSetupCleanFileId(fileId);

  if (!fileId) {
    return `
      <div class="admin-file-tools empty">

        <button
          type="button"
          class="admin-small-button secondary"
          onclick="adminSetupNormalizeFileInput('${adminSetupEscapeHtml(
            inputId
          )}')"
        >
          Extract ID from pasted Drive link
        </button>

        <span class="admin-sub">
          No File ID set yet.
        </span>

      </div>
    `;
  }

  const thumbnailUrl = adminSetupDriveThumbnailUrl(fileId);

  const viewUrl = adminSetupDriveViewUrl(fileId);

  const downloadUrl = adminSetupDriveDownloadUrl(fileId);

  return `
    <div class="admin-file-tools">

      <div class="admin-file-preview">
        ${platformImgHtml(thumbnailUrl, { className: "admin-file-preview-image", variant: "profile", alt: "Image preview" })}
      </div>

      <div class="admin-file-actions">

        <a
          class="admin-small-button secondary"
          href="${adminSetupEscapeHtml(viewUrl)}"
          target="_blank"
          rel="noopener"
        >
          View
        </a>

        <a
          class="admin-small-button secondary"
          href="${adminSetupEscapeHtml(downloadUrl)}"
          target="_blank"
          rel="noopener"
        >
          Download
        </a>

        <button
          type="button"
          class="admin-small-button secondary"
          onclick="adminSetupCopyText('${adminSetupEscapeHtml(fileId)}')"
        >
          Copy ID
        </button>

        <button
          type="button"
          class="admin-small-button secondary"
          onclick="adminSetupNormalizeFileInput('${adminSetupEscapeHtml(
            inputId
          )}')"
        >
          Extract ID
        </button>

      </div>

    </div>
  `;
}

/* ======================
   ADMIN IMAGE UPLOAD HELPERS
====================== */

function adminSetupFileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = () => {

      const result =
        String(reader.result || "");

      const base64 =
        result.indexOf(",") !== -1
          ? result.split(",")[1]
          : result;

      resolve(base64);

    };

    reader.onerror = () => {

      reject(
        new Error("Could not read image file.")
      );

    };

    reader.readAsDataURL(file);

  });

}

function adminSetupValidateImageFile(file) {

  if (!file) {

    return "Choose an image file first.";

  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif"
  ];

  if (
    allowedTypes.indexOf(file.type) === -1 &&
    file.type
  ) {

    return "Image must be JPG, PNG, WEBP, GIF, HEIC, or HEIF.";

  }

  const maxOriginalBytes =
    15 * 1024 * 1024;

  if (file.size > maxOriginalBytes) {

    return "Image must be 15MB or smaller before resizing.";

  }

  return "";

}

function adminSetupResizeImageFile(file) {

  return new Promise((resolve, reject) => {

    if (!file) {

      reject(
        new Error("No image file selected.")
      );

      return;

    }

    const image =
      new Image();

    const objectUrl =
      URL.createObjectURL(file);

    image.onload = () => {

      URL.revokeObjectURL(
        objectUrl
      );

      const maxWidth =
        900;

      const maxHeight =
        1350;

      let width =
        image.width;

      let height =
        image.height;

      const ratio =
        Math.min(
          maxWidth / width,
          maxHeight / height,
          1
        );

      width =
        Math.round(
          width * ratio
        );

      height =
        Math.round(
          height * ratio
        );

      const canvas =
        document.createElement("canvas");

      canvas.width =
        width;

      canvas.height =
        height;

      const ctx =
        canvas.getContext("2d");

      ctx.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(
        blob => {

          if (!blob) {

            reject(
              new Error("Could not resize image.")
            );

            return;

          }

          const safeName =
            String(file.name || "image")
              .replace(/\.[^/.]+$/, "") +
            ".jpg";

          const resizedFile =
            new File(
              [blob],
              safeName,
              {
                type:
                  "image/jpeg"
              }
            );

          resolve(
            resizedFile
          );

        },
        "image/jpeg",
        0.82
      );

    };

    image.onerror = () => {

      URL.revokeObjectURL(
        objectUrl
      );

      reject(
        new Error(
          "Could not load image. Try choosing a JPG or PNG instead."
        )
      );

    };

    image.src =
      objectUrl;

  });

}

async function adminSetupUploadNomineeImage(
  gameId,
  categoryId,
  nomineeId,
  source
) {

  console.log(
    "UPLOAD START",
    {
      gameId:
        gameId,
      categoryId:
        categoryId,
      nomineeId:
        nomineeId,
      source:
        source
    }
  );

  const chooseInputId =
    "uploadNomineeImage_" +
    categoryId +
    "_" +
    nomineeId;

  const captureInputId =
    "captureNomineeImage_" +
    categoryId +
    "_" +
    nomineeId;

  const selectedInputId =
    source === "capture"
      ? captureInputId
      : chooseInputId;

  const selectedInput =
    document.getElementById(
      selectedInputId
    );

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const file =
    selectedInput &&
    selectedInput.files &&
    selectedInput.files[0]
      ? selectedInput.files[0]
      : null;

  if (!file) {

    adminSetupSetMessage(
      messageId,
      source === "capture"
        ? "Take a photo first, then tap Upload Photo."
        : "Choose an image first, then tap Upload Chosen Image.",
      true
    );

    console.log(
      "UPLOAD STOP: no file selected",
      {
        selectedInputId:
          selectedInputId
      }
    );

    return;

  }

  console.log(
    "UPLOAD ORIGINAL FILE",
    {
      name:
        file.name,
      type:
        file.type,
      size:
        file.size
    }
  );

  const validationError =
    adminSetupValidateImageFile(
      file
    );

  if (validationError) {

    adminSetupSetMessage(
      messageId,
      validationError,
      true
    );

    console.log(
      "UPLOAD STOP: validation error",
      validationError
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Resizing image...",
    false
  );

  let uploadFile =
    file;

  try {

    uploadFile =
      await adminSetupResizeImageFile(
        file
      );

    console.log(
      "UPLOAD RESIZED FILE",
      {
        name:
          uploadFile.name,
        type:
          uploadFile.type,
        size:
          uploadFile.size
      }
    );

  } catch (err) {

    console.error(
      "UPLOAD RESIZE ERROR",
      err
    );

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Could not resize image.",
      true
    );

    return;

  }

  const maxUploadBytes =
    2 * 1024 * 1024;

  if (uploadFile.size > maxUploadBytes) {

    adminSetupSetMessage(
      messageId,
      "Image is still larger than 2MB after resizing. Try a smaller photo.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Reading resized image...",
    false
  );

  let base64 =
    "";

  try {

    base64 =
      await adminSetupFileToBase64(
        uploadFile
      );

    console.log(
      "UPLOAD BASE64 READY",
      {
        length:
          base64.length
      }
    );

  } catch (err) {

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Could not read image file.",
      true
    );

    console.error(
      "UPLOAD READ ERROR",
      err
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Uploading image to Drive...",
    false
  );

  let res;

  try {

    res =
      await Promise.race([
        apiAdminUploadImage({
          gameId:
            gameId,

          categoryId:
            categoryId,

          nomineeId:
            nomineeId,

          fileName:
            uploadFile.name,

          mimeType:
            uploadFile.type,

          base64:
            base64
        }),

        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success:
                  false,
                error:
                  "Upload timed out after 45 seconds."
              }),
            45000
          )
        )
      ]);

  } catch (err) {

    console.error(
      "UPLOAD API ERROR",
      err
    );

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Image upload failed.",
      true
    );

    return;

  }

  console.log(
    "UPLOAD RESPONSE",
    res
  );

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Image upload failed.",
      true
    );

    return;

  }

  if (fileIdInput) {

    fileIdInput.value =
      res.fileId || "";
  
    adminSetupRefreshImagePreview(
      categoryId,
      nomineeId
    );
  
  }

  adminSetupSetMessage(
    messageId,
    "Image uploaded. Click Save Nominee to keep this File ID.",
    false
  );

}

async function adminSetupImportNomineeImageFromUrl(
  gameId,
  categoryId,
  nomineeId
) {

  const urlInput =
    document.getElementById(
      "importNomineeImageUrl_" +
      categoryId +
      "_" +
      nomineeId
    );

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const imageUrl =
    urlInput
      ? urlInput.value.trim()
      : "";

  if (!imageUrl) {

    adminSetupSetMessage(
      messageId,
      "Paste an image URL first.",
      true
    );

    return;

  }

  if (
    imageUrl.indexOf("http://") !== 0 &&
    imageUrl.indexOf("https://") !== 0
  ) {

    adminSetupSetMessage(
      messageId,
      "Image URL must start with http:// or https://",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Importing image from URL...",
    false
  );

  let res;

  try {

    res =
      await Promise.race([
        apiAdminImportImageFromUrl({
          gameId:
            gameId,

          categoryId:
            categoryId,

          nomineeId:
            nomineeId,

          imageUrl:
            imageUrl
        }),

        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success:
                  false,
                error:
                  "Import timed out after 45 seconds."
              }),
            45000
          )
        )
      ]);

  } catch (err) {

    console.error(
      "IMPORT URL ERROR",
      err
    );

    adminSetupSetMessage(
      messageId,
      err.message ||
      "Image import failed.",
      true
    );

    return;

  }

  console.log(
    "IMPORT URL RESPONSE",
    res
  );

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Image import failed.",
      true
    );

    return;

  }

  if (fileIdInput) {

    fileIdInput.value =
      res.fileId || "";
  
    adminSetupRefreshImagePreview(
      categoryId,
      nomineeId
    );
  
  }

  adminSetupSetMessage(
    messageId,
    "Image imported. Click Save Nominee to keep this File ID.",
    false
  );

}

async function adminSetupSearchTmdbPosters(
  gameId,
  categoryId,
  nomineeId
) {

  const searchInput =
    document.getElementById(
      "tmdbPosterSearch_" +
      categoryId +
      "_" +
      nomineeId
    );

  const resultsEl =
    document.getElementById(
      "tmdbPosterResults_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const query =
    searchInput
      ? searchInput.value.trim()
      : "";

  if (!query) {

    adminSetupSetMessage(
      messageId,
      "Enter a movie title to search TMDb.",
      true
    );

    return;

  }

  if (resultsEl) {
    resultsEl.innerHTML = "";
  }

  adminSetupSetMessage(
    messageId,
    "Searching TMDb...",
    false
  );

  const res =
    await apiAdminSearchTmdbMoviePosters({
      query:
        query
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "TMDb search failed.",
      true
    );

    return;

  }

  const results =
    Array.isArray(res.results)
      ? res.results
      : [];

  if (!results.length) {

    adminSetupSetMessage(
      messageId,
      "No TMDb posters found.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Choose a TMDb poster to import.",
    false
  );

  if (resultsEl) {

    resultsEl.innerHTML =
      results
        .map(item => `
          <div class="admin-tmdb-result">

            ${platformImgHtml(item.posterUrl, { className: "admin-tmdb-poster", variant: "card", alt: (item.title || "Movie") + " poster" })}

            <div class="admin-tmdb-result-body">

              <strong>
                ${adminSetupEscapeHtml(item.title)}
              </strong>

              <div class="admin-sub">
                ${adminSetupEscapeHtml(item.year || "Unknown year")}
              </div>

              <button
                type="button"
                class="admin-small-button secondary"
                onclick="adminSetupImportTmdbPoster('${gameId}', '${categoryId}', '${nomineeId}', '${adminSetupEscapeHtml(item.posterUrl)}')"
              >
                Import Poster
              </button>

            </div>

          </div>
        `)
        .join("");

  }

}

async function adminSetupImportTmdbPoster(
  gameId,
  categoryId,
  nomineeId,
  posterUrl
) {

  const urlInput =
    document.getElementById(
      "importNomineeImageUrl_" +
      categoryId +
      "_" +
      nomineeId
    );

  if (urlInput) {
    urlInput.value =
      posterUrl;
  }

  await adminSetupImportNomineeImageFromUrl(
    gameId,
    categoryId,
    nomineeId
  );

}

function adminSetupRefreshImagePreview(
  categoryId,
  nomineeId
) {

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const previewEl =
    document.getElementById(
      "imagePreviewTools_" +
      categoryId +
      "_" +
      nomineeId
    );

  if (!fileIdInput || !previewEl) {
    return;
  }

  const fileId =
    adminSetupExtractDriveFileId(
      fileIdInput.value
    );

  fileIdInput.value =
    fileId;

  previewEl.innerHTML =
    renderAdminSetupFileTools(
      fileId,
      fileIdInput.id
    );

}

function adminSetupClearNomineeImage(
  categoryId,
  nomineeId
) {

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  if (fileIdInput) {

    fileIdInput.value =
      "";
      adminSetupRefreshImagePreview(
        categoryId,
        nomineeId
      );

  }

  adminSetupSetMessage(
    messageId,
    "Image cleared. Click Save Nominee to keep this change.",
    false
  );

}

async function adminSetupDeleteNomineeImageFromDrive(
  categoryId,
  nomineeId
) {

  const fileIdInput =
    document.getElementById(
      "editNomineeFileId_" +
      categoryId +
      "_" +
      nomineeId
    );

  const messageId =
    "editNomineeMessage_" +
    categoryId +
    "_" +
    nomineeId;

  const fileId =
    fileIdInput
      ? fileIdInput.value.trim()
      : "";

  if (!fileId) {

    adminSetupSetMessage(
      messageId,
      "No File ID to delete.",
      true
    );

    return;

  }

  const ok =
    confirm(
      "Move this image to Google Drive trash and clear it from this nominee?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    messageId,
    "Deleting image from Drive...",
    false
  );

  const res =
    await apiAdminDeleteImageFromDrive({
      fileId:
        fileId
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not delete image from Drive.",
      true
    );

    return;

  }

  if (fileIdInput) {

    fileIdInput.value =
      "";

    adminSetupRefreshImagePreview(
      categoryId,
      nomineeId
    );

  }

  adminSetupSetMessage(
    messageId,
    "Image moved to Drive trash. Click Save Nominee to remove the File ID.",
    false
  );

}

/* ======================
   CLONE / BULK SETUP PANELS
====================== */

function renderAdminSetupCloneCategoryPanel_(category, categories) {
  const gameId = adminSetupEscapeHtml(category.gameId);
  const categoryId = adminSetupEscapeHtml(category.categoryId);
  const cloneName = adminSetupEscapeHtml((category.category || category.categoryId) + " Copy");
  const cloneIdRaw = adminSetupNextSequentialCategoryId_(category.categoryId, categories);
  const cloneId = adminSetupEscapeHtml(cloneIdRaw);
  const settings = category.settings || {};
  const cloneSection = category.section || "Main";
  const nextDisplayOrder = adminSetupNextCategoryDisplayOrder_(categories, cloneSection);
  const cloneLockDateTime = adminSetupFormatDateTimeLocal(settings.lockDateTime);

  return `
    <details class="admin-setup-tool-panel admin-clone-question-panel">
      <summary class="admin-inline-add-summary">
        <strong>Clone Question</strong>
        <span class="admin-sub">Copy this question and optionally all answers.</span>
        <span class="admin-collapse-icon">▾</span>
      </summary>
      <div class="admin-inline-add-body">
        <div class="admin-control-grid">
          <label class="admin-field">
            ${adminSetupFieldLabel_("New Question", "Change the title so the cloned question is unique.")}
            <input type="text" id="cloneCategoryName_${categoryId}" value="${cloneName}" oninput="adminSetupAutoFillCloneCategoryFields('${categoryId}')">
          </label>
          <label class="admin-field">
            ${adminSetupFieldLabel_("New Question ID", "Auto-generated from the new title. The backend also prevents duplicate IDs.")}
            <input type="text" id="cloneCategoryId_${categoryId}" value="${cloneId}" data-suggested-id="${cloneId}" oninput="this.dataset.touched='true'">
          </label>
          <label class="admin-field">
            ${adminSetupFieldLabel_("Section", "The cloned question can stay in the same section or move to another.")}
            <input type="text" id="cloneCategorySection_${categoryId}" value="${adminSetupEscapeHtml(cloneSection)}" list="adminSetupSectionOptions">
          </label>
          <label class="admin-field">
            ${adminSetupFieldLabel_("Display Order", "Automatically uses the next available number in this section. You can still change it before cloning.")}
            <input type="number" id="cloneCategoryOrder_${categoryId}" value="${nextDisplayOrder}" min="0">
          </label>
          <label class="admin-field">
            ${adminSetupFieldLabel_("New Lock Date / Time", "Starts with the same lock date and time as the original question. Change it only when this clone should lock at a different time.")}
            <input type="datetime-local" id="cloneCategoryLockDateTime_${categoryId}" value="${adminSetupEscapeHtml(cloneLockDateTime)}">
          </label>
        </div>
        <div class="admin-checkbox-row">
          <label class="admin-check-row"><input type="checkbox" id="cloneCategoryCopyNominees_${categoryId}" checked><span>Copy answers / nominees</span></label>
          <label class="admin-check-row"><input type="checkbox" id="cloneCategoryCopyImages_${categoryId}" checked><span>Copy answer images</span></label>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="admin-small-button" onclick="adminSetupCloneCategory('${gameId}', '${categoryId}')">Clone Question</button>
        </div>
        <div id="cloneCategoryMessage_${categoryId}" class="admin-message"></div>
      </div>
    </details>
  `;
}

function renderAdminSetupBulkNomineesPanel_(category) {
  const gameId = adminSetupEscapeHtml(category.gameId);
  const categoryId = adminSetupEscapeHtml(category.categoryId);
  const categoryName = adminSetupEscapeHtml(category.category || category.categoryId);

  return `
    <details class="admin-setup-tool-panel admin-bulk-answer-panel">
      <summary class="admin-inline-add-summary">
        <strong>Bulk Add Answers</strong>
        <span class="admin-sub">Paste or generate many answers at once.</span>
        <span class="admin-collapse-icon">▾</span>
      </summary>
      <div class="admin-inline-add-body">
        <div class="admin-control-grid">
          <label class="admin-field">
            ${adminSetupFieldLabel_("Generate Numbered Answers", "Creates editable lines such as Contestant 1, Contestant 2, and Contestant 3.")}
            <input type="text" id="bulkNomineePrefix_${categoryId}" placeholder="Contestant">
          </label>
          <label class="admin-field">
            <span>Count</span>
            <input type="number" id="bulkNomineeCount_${categoryId}" value="5" min="1" max="250">
          </label>
          <label class="admin-field">
            <span>Start Number</span>
            <input type="number" id="bulkNomineeStart_${categoryId}" value="1" min="0">
          </label>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="admin-small-button secondary" onclick="adminSetupGenerateBulkAnswerLines('${categoryId}')">Generate Lines</button>
        </div>
        <label class="admin-field">
          ${adminSetupFieldLabel_("Answers", "Enter one answer per line. Optional format: Name | Short Answer | ID | Drive File ID.")}
          <textarea id="bulkNomineeLines_${categoryId}" rows="8" placeholder="Josh Allen\nPatrick Mahomes\nTie"></textarea>
        </label>
        <div class="admin-card-actions">
          <button type="button" class="admin-small-button" onclick="adminSetupBulkCreateNominees('${gameId}', '${categoryId}', '${categoryName}')">Create All Answers</button>
        </div>
        <div id="bulkNomineeMessage_${categoryId}" class="admin-message"></div>
      </div>
    </details>
  `;
}

function renderAdminSetupCloneNomineePanel_(category, nominee, categories) {
  const gameId = adminSetupEscapeHtml(category.gameId);
  const categoryId = adminSetupEscapeHtml(category.categoryId);
  const nomineeId = adminSetupEscapeHtml(nominee.nomineeId);
  const cloneName = adminSetupEscapeHtml((nominee.nominee || nominee.nomineeId) + " Copy");
  const cloneId = adminSetupEscapeHtml(adminSetupSlugify((nominee.nomineeId || nominee.nominee || "answer") + "-copy"));

  return `
    <details class="admin-setup-tool-panel admin-clone-answer-panel">
      <summary class="admin-inline-add-summary">
        <strong>Clone Answer</strong>
        <span class="admin-sub">Copy this answer into this or another question.</span>
        <span class="admin-collapse-icon">▾</span>
      </summary>
      <div class="admin-inline-add-body">
        <div class="admin-control-grid nominee-grid">
          <label class="admin-field">
            <span>Target Question</span>
            <select id="cloneNomineeTarget_${categoryId}_${nomineeId}">
              ${adminSetupCategoryOptions_(categories, category.categoryId, "", "Select target question")}
            </select>
          </label>
          <label class="admin-field">
            <span>New Answer</span>
            <input type="text" id="cloneNomineeName_${categoryId}_${nomineeId}" value="${cloneName}" oninput="adminSetupAutoFillCloneNomineeFields('${categoryId}', '${nomineeId}')">
          </label>
          <label class="admin-field">
            <span>Short Answer</span>
            <input type="text" id="cloneNomineeShort_${categoryId}_${nomineeId}" value="${cloneName}" oninput="this.dataset.touched='true'">
          </label>
          <label class="admin-field">
            <span>New Answer ID</span>
            <input type="text" id="cloneNomineeId_${categoryId}_${nomineeId}" value="${cloneId}" oninput="this.dataset.touched='true'">
          </label>
        </div>
        <label class="admin-check-row"><input type="checkbox" id="cloneNomineeCopyImage_${categoryId}_${nomineeId}" checked><span>Copy image / file ID</span></label>
        <div class="admin-card-actions">
          <button type="button" class="admin-small-button" onclick="adminSetupCloneNominee('${gameId}', '${categoryId}', '${nomineeId}')">Clone Answer</button>
        </div>
        <div id="cloneNomineeMessage_${categoryId}_${nomineeId}" class="admin-message"></div>
      </div>
    </details>
  `;
}

/* ======================
   CATEGORY CARD
====================== */

function renderAdminSetupCategoryCard(category, game, categories, uiAction) {
  const settings =
    category.settings || {};

  const nominees =
    Array.isArray(category.nominees)
      ? category.nominees
      : [];

  const gameId =
    adminSetupEscapeHtml(category.gameId);

  const categoryId =
    adminSetupEscapeHtml(category.categoryId);

  const categoryTitle =
    adminSetupEscapeHtml(
      category.category || category.categoryId
    );

  const section =
    adminSetupEscapeHtml(
      category.section || "Other"
    );

  const groupId =
    adminSetupEscapeHtml(
      settings.groupId || "default"
    );

  const actionTargetsCategory =
    adminSetupActionTargetsCategory_(uiAction, category.categoryId);
  const cloneInfo = category.cloneInfo || {};
  const cloneSourceCategoryId = String(
    cloneInfo.sourceCategoryId ||
    (actionTargetsCategory && uiAction && uiAction.type === "clone-question"
      ? uiAction.sourceCategoryId
      : "")
  ).trim();
  const cloneSourceGameId = String(cloneInfo.sourceGameId || "").trim();
  const isJustCloned = Boolean(
    actionTargetsCategory && uiAction && uiAction.type === "clone-question"
  );
  const shouldOpenAnswers = Boolean(
    actionTargetsCategory && (!uiAction || uiAction.openAnswers !== false)
  );

  const categoryIndex = (categories || []).findIndex(function(item) {
    return String(item && item.categoryId || "").trim().toLowerCase() ===
      String(category.categoryId || "").trim().toLowerCase();
  });
  const canMoveUp = categoryIndex > 0;
  const canMoveDown = categoryIndex >= 0 && categoryIndex < (categories || []).length - 1;

  return `
    <details
      id="categoryCard_${categoryId}"
      class="admin-category-card admin-collapsible-category ${actionTargetsCategory ? "admin-setup-action-target" : ""}"
      ${actionTargetsCategory ? "open" : ""}
    >

      <summary class="admin-category-summary">

        <div class="admin-category-header">

          <div>
            <strong id="categoryTitle_${categoryId}">
              ${categoryTitle}
            </strong>

            ${(cloneSourceCategoryId || isJustCloned) ? `
              <div class="admin-setup-question-badges">
                ${isJustCloned ? `<span class="admin-pill admin-just-cloned-pill">JUST CLONED</span>` : ""}
                ${cloneSourceCategoryId ? `
                  <span class="admin-clone-origin-badge">
                    Clone of ${adminSetupEscapeHtml(cloneSourceCategoryId)}
                    ${cloneSourceGameId && cloneSourceGameId !== category.gameId
                      ? ` in ${adminSetupEscapeHtml(cloneSourceGameId)}`
                      : ""}
                  </span>
                ` : ""}
              </div>
            ` : ""}

            <div class="admin-sub">
              Question ID (permanent): ${categoryId}
              ·
              ${section}
              ·
              ${groupId}
              ·
              ${nominees.length} nominees
            </div>
          </div>

          <div class="admin-question-summary-actions">
            <div class="admin-question-order-controls" title="Move question">
              <button
                type="button"
                class="admin-small-button secondary admin-question-order-button"
                onclick="adminSetupMoveQuestionOrder_('${gameId}', '${categoryId}', -1, event)"
                ${canMoveUp ? "" : "disabled"}
                aria-label="Move question up"
              >↑</button>
              <button
                type="button"
                class="admin-small-button secondary admin-question-order-button"
                onclick="adminSetupMoveQuestionOrder_('${gameId}', '${categoryId}', 1, event)"
                ${canMoveDown ? "" : "disabled"}
                aria-label="Move question down"
              >↓</button>
            </div>

            <div
              id="categoryLockPill_${categoryId}"
              class="admin-pill ${settings.locked ? "locked" : ""}"
            >
              ${settings.locked ? "Locked" : "Open"}
            </div>
          </div>

        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        <details class="admin-question-settings-shell">
          <summary class="admin-inline-add-summary">
            <strong>Settings</strong>
            <span class="admin-sub">Question text, scoring, source, display, and locking.</span>
            <span class="admin-collapse-icon">▾</span>
          </summary>

          <div
            class="admin-edit-panel"
            data-question-editor
            data-category-id="${categoryId}"
            data-dirty="false"
            oninput="adminSetupMarkQuestionDirty('${categoryId}')"
            onchange="adminSetupMarkQuestionDirty('${categoryId}')"
          >

          <div class="admin-control-grid">

            <label class="admin-field">
              ${adminSetupFieldLabel_("Category / Question", "The player-facing question or category title.")}

              <input
                type="text"
                id="editCategoryName_${categoryId}"
                value="${adminSetupEscapeHtml(category.category)}"
              >
              <span class="admin-sub">Question ID: ${categoryId} (permanent; renaming the question does not change it)</span>
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Section", "Groups related questions together on the player page.")}

              <input
                type="text"
                id="editCategorySection_${categoryId}"
                value="${section}"
                list="adminSetupSectionOptions"
              >
            </label>

            <label class="admin-field" data-question-points-field ${["fixed-points", "confidence-points", "correct-pick"].indexOf(String(settings.scoreMode || "fixed-points").toLowerCase().replace(/_/g, "-")) !== -1 ? "" : "hidden"}>
              ${adminSetupFieldLabel_("Points", "Used only by fixed-point and confidence questions.")}

              <input
                type="number"
                id="editCategoryPoints_${categoryId}"
                value="${Number(settings.points) || 0}"
                min="0"
              >
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Display Order", "Lower numbers appear earlier within the section.")}

              <input
                type="number"
                id="editCategoryOrder_${categoryId}"
                value="${Number(settings.displayOrder) || 999}"
                min="0"
              >
            </label>

            <label class="admin-field">
              ${adminSetupFieldLabel_("Layout Type", "Controls whether answers appear as image cards, text, compact cards, or a list.")}

              <select id="editCategoryLayout_${categoryId}">

                <option
                  value="image"
                  ${settings.layoutType === "image" ? "selected" : ""}
                >
                  Image
                </option>

                <option
                  value="text"
                  ${settings.layoutType === "text" ? "selected" : ""}
                >
                  Text
                </option>

                <option
                  value="compact"
                  ${settings.layoutType === "compact" ? "selected" : ""}
                >
                  Compact
                </option>

                <option
                  value="list"
                  ${settings.layoutType === "list" ? "selected" : ""}
                >
                  List
                </option>

              </select>
            </label>

          </div>

          <div class="admin-checkbox-row">
            <span class="admin-checkbox-with-help">
              <label><input type="checkbox" id="editCategoryLocked_${categoryId}" ${settings.locked ? "checked" : ""}> Locked</label>
              ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Locked", "Prevents players from changing this question even if the game itself remains open.") : ""}
            </span>

            <span class="admin-checkbox-with-help">
              <label><input type="checkbox" id="editCategoryActive_${categoryId}" ${category.active !== false ? "checked" : ""}> Active</label>
              ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Active", "Shows this question to players. Inactive questions remain stored but are hidden.") : ""}
            </span>

            <span class="admin-checkbox-with-help">
              <label><input type="checkbox" id="editCategoryPrediction_${categoryId}" ${category.predictionGame !== false ? "checked" : ""}> Prediction Question</label>
              ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Prediction Question", "Includes this category in the normal prediction/pick flow. Leave off for ranking-only or specialized categories.") : ""}
            </span>

            <span class="admin-checkbox-with-help">
              <label><input type="checkbox" id="editCategoryStatue_${categoryId}" ${settings.countsAsStatue ? "checked" : ""}> Counts as Statue</label>
              ${typeof adminHelpButton_ === "function" ? adminHelpButton_("Counts as Statue", "Includes this category in award-statue totals. Turn it off for sports, props, bonuses, and non-award questions.") : ""}
            </span>
          </div>

          <details class="admin-advanced-details">

            <summary>
              Advanced category settings
            </summary>

            <div class="admin-control-grid">

              <label class="admin-field">
                ${adminSetupFieldLabel_("Lock Date / Time", "The exact time players can no longer change this question.")}

                <input
                  type="datetime-local"
                  id="editCategoryLockDateTime_${categoryId}"
                  value="${adminSetupEscapeHtml(
                    adminSetupFormatDateTimeLocal(settings.lockDateTime)
                  )}"
                >
              </label>

              <label class="admin-field">
                ${adminSetupFieldLabel_("Group ID", "An internal grouping key used by layouts, follow-ups, and bulk controls.")}

                <input
                  type="text"
                  id="editCategoryGroupId_${categoryId}"
                  value="${groupId}"
                  placeholder="default"
                  list="adminSetupGroupOptions"
                >
              </label>

              <label class="admin-field">
                ${adminSetupFieldLabel_("Parent Question", "Optional link to a parent question for conditional or grouped flows.")}
                <select id="editCategoryParentCategoryId_${categoryId}">
                  ${adminSetupCategoryOptions_(categories, settings.parentCategoryId, category.categoryId, "No parent question")}
                </select>
              </label>

              <label class="admin-field">
                ${adminSetupFieldLabel_("Follow-Up Question", "Optional question to reveal or activate after this question resolves.")}
                <select id="editCategoryFollowUpCategoryId_${categoryId}">
                  ${adminSetupCategoryOptions_(categories, settings.followUpCategoryId, category.categoryId, "No follow-up question")}
                </select>
              </label>

            </div>

            ${renderAdminSetupQuestionEngineFields_(
              "editCategory",
              "_${categoryId}",
              settings,
              game
            )}

            <label class="admin-field">
              ${adminSetupFieldLabel_("Follow-Up Map JSON", "Advanced mapping from a winning answer ID to a follow-up category ID.")}

              <textarea
                id="editCategoryFollowUpMapJSON_${categoryId}"
                rows="4"
                placeholder='{"winner-id":"follow-up-category-id"}'
              >${adminSetupEscapeHtml(settings.followUpMapJSON || "")}</textarea>
            </label>

          </details>

          <div class="admin-card-actions">

            <button
              type="button"
              id="saveQuestionButton_${categoryId}"
              class="admin-small-button admin-save-state-button"
              onclick="adminSetupUpdateCategory('${gameId}', '${categoryId}')"
            >
              SAVE QUESTION
            </button>

            <button
              type="button"
              class="admin-small-button secondary"
              onclick="adminSetupArchiveCategory('${gameId}', '${categoryId}')"
            >
              Archive Question
            </button>

            <button
              type="button"
              class="admin-danger-button"
              onclick="adminSetupDeleteCategory('${gameId}', '${categoryId}')"
            >
              Delete Question
            </button>

          </div>

          <div
            id="editCategoryMessage_${categoryId}"
            class="admin-message"
          ></div>

          </div>
        </details>

        ${renderAdminSetupCloneCategoryPanel_(category, categories)}

        ${renderAdminResultsPanel(category, nominees, settings)}

        <details
          id="answersPanel_${categoryId}"
          class="admin-setup-nominees"
          ${shouldOpenAnswers ? "open" : ""}
        >

          <summary class="admin-nominee-summary">

            <h3>
              Nominees / Answers
            </h3>

            <span id="answerCount_${categoryId}" class="admin-sub">
              ${nominees.length} total
            </span>

            <span class="admin-collapse-icon">
              ▾
            </span>

          </summary>

          <div class="admin-collapsible-body">

            ${
              nominees.length
                ? nominees
                    .map(nominee =>
                      renderAdminSetupNomineeRow(category, nominee, categories, uiAction)
                    )
                    .join("")
                : `
                  <div class="admin-sub">
                    No nominees added yet.
                  </div>
                `
            }

            ${renderAdminSetupInlineAddNomineeCard(category)}
            ${renderAdminSetupBulkNomineesPanel_(category)}

          </div>

        </details>

      </div>

    </details>
  `;
}

/* ======================
   RESULTS / WINNERS PANEL
====================== */

function renderAdminResultsPanel(category, nominees, settings) {
  const gameId =
    adminSetupEscapeHtml(category.gameId);

  const categoryId =
    adminSetupEscapeHtml(category.categoryId);

  const winnerNomineeId =
    String(settings.winnerNomineeId || "").trim();

  const settlementStatus =
    String(settings.settlementStatus || "")
      .trim()
      .toLowerCase();

  const resultStatus =
    settlementStatus === "push" ||
    settlementStatus === "pushed" ||
    settlementStatus === "void"
      ? "push"
      : settlementStatus === "cancelled" ||
        settlementStatus === "canceled"
        ? "cancelled"
        : winnerNomineeId
          ? "winner"
          : "pending";

  const favoriteNomineeId =
    String(settings.favoriteNomineeId || "").trim();

  const nomineeOptions =
    nominees
      .filter(nominee => nominee.active !== false)
      .map(nominee => {
        const nomineeId =
          String(nominee.nomineeId || "").trim();

        const nomineeName =
          nominee.nominee || nominee.nomineeId;

        return `
          <option
            value="${adminSetupEscapeHtml(nomineeId)}"
            ${nomineeId === winnerNomineeId ? "selected" : ""}
          >
            ${adminSetupEscapeHtml(nomineeName)}
          </option>
        `;
      })
      .join("");

  const favoriteOptions =
    nominees
      .filter(nominee => nominee.active !== false)
      .map(nominee => {
        const nomineeId =
          String(nominee.nomineeId || "").trim();

        const nomineeName =
          nominee.nominee || nominee.nomineeId;

        return `
          <option
            value="${adminSetupEscapeHtml(nomineeId)}"
            ${nomineeId === favoriteNomineeId ? "selected" : ""}
          >
            ${adminSetupEscapeHtml(nomineeName)}
          </option>
        `;
      })
      .join("");

  return `
    <details class="admin-results-panel">

      <summary class="admin-results-summary">

        <div class="admin-results-head">

          <div>
            <h3>Results / Winners</h3>

            <div class="admin-sub">
              Select the actual winner and optional favorite/projection.
            </div>
          </div>

        </div>

        <span class="admin-collapse-icon">
          ▾
        </span>

      </summary>

      <div class="admin-collapsible-body">

        ${
          nominees.length
            ? `
              <div class="admin-control-grid">

                <label class="admin-field">
                  <span>Result Status</span>

                  <select
                    id="resultStatus_${categoryId}"
                    onchange="adminSetupToggleWinnerControl('${categoryId}')"
                  >
                    <option value="pending" ${resultStatus === "pending" ? "selected" : ""}>
                      Pending / Not Settled
                    </option>
                    <option value="winner" ${resultStatus === "winner" ? "selected" : ""}>
                      Final — Winner Selected
                    </option>
                    <option value="push" ${resultStatus === "push" ? "selected" : ""}>
                      Push — Return Stakes
                    </option>
                    <option value="cancelled" ${resultStatus === "cancelled" ? "selected" : ""}>
                      Cancelled / No Contest — Return Stakes
                    </option>
                  </select>
                </label>

                <label class="admin-field">
                  <span>Winner Nominee</span>

                  <select
                    id="resultWinner_${categoryId}"
                    ${resultStatus === "winner" ? "" : "disabled"}
                  >
                    <option value="">Not selected</option>
                    ${nomineeOptions}
                  </select>
                </label>

                <label class="admin-field">
                  <span>Favorite Nominee</span>

                  <select id="resultFavorite_${categoryId}">
                    <option value="">Not selected</option>
                    ${favoriteOptions}
                  </select>
                </label>

              </div>

              <div class="admin-card-actions">

                <button
                  class="admin-small-button"
                  onclick="adminSetupSaveResults('${gameId}', '${categoryId}')"
                >
                  Save Results
                </button>

                <button
                  class="admin-danger-button"
                  onclick="adminSetupClearResults('${gameId}', '${categoryId}')"
                >
                  Clear Results
                </button>

              </div>
            `
            : `
              <div class="admin-sub">
                Add nominees before setting results.
              </div>
            `
        }

        <div
          id="resultMessage_${categoryId}"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;
}

/* ======================
   ACTION HELPERS
====================== */

function adminSetupToggleWinnerControl(categoryId) {
  const statusInput =
    document.getElementById(
      "resultStatus_" + categoryId
    );

  const winnerInput =
    document.getElementById(
      "resultWinner_" + categoryId
    );

  if (!winnerInput) {
    return;
  }

  const requiresWinner =
    !!statusInput &&
    statusInput.value === "winner";

  winnerInput.disabled =
    !requiresWinner;

  if (!requiresWinner) {
    winnerInput.value = "";
  }
}

function adminSetupApplyLockState_(categoryId, locked) {
  const checkbox =
    document.getElementById(
      "editCategoryLocked_" + categoryId
    );

  const pill =
    document.getElementById(
      "categoryLockPill_" + categoryId
    );

  if (checkbox) {
    checkbox.checked = Boolean(locked);
  }

  if (pill) {
    pill.classList.toggle(
      "locked",
      Boolean(locked)
    );

    pill.textContent =
      locked
        ? "Locked"
        : "Open";
  }
}

function adminSetupSyncQuestionDisplay_(categoryId) {
  const input = document.getElementById("editCategoryName_" + categoryId);
  const title = document.getElementById("categoryTitle_" + categoryId);

  if (input && title) {
    title.textContent = input.value.trim() || categoryId;
  }
}

function adminSetupSyncAnswerDisplay_(categoryId, nomineeId) {
  const input = document.getElementById(
    "editNomineeName_" + categoryId + "_" + nomineeId
  );
  const title = document.getElementById(
    "nomineeTitle_" + categoryId + "_" + nomineeId
  );

  if (input && title) {
    title.textContent = input.value.trim() || nomineeId;
  }
}

function adminSetupSetMessage(id, message, isError) {
  const el = document.getElementById(id);

  if (!el) {
    return;
  }

  el.classList.toggle("is-error", Boolean(isError));

  el.innerText = message || "";
}

function adminSetupGetCategoryNameById(categoryId) {
  const select = document.getElementById("setupNomineeCategoryId");

  if (!select) {
    return "";
  }

  const option = Array.from(select.options).find(
    (opt) => opt.value === categoryId
  );

  return option ? option.textContent.trim() : "";
}

function renderAdminSetupNomineeRow(category, nominee, categories, uiAction) {
  const gameId =
    adminSetupEscapeHtml(category.gameId);

  const categoryId =
    adminSetupEscapeHtml(category.categoryId);

  const nomineeId =
    adminSetupEscapeHtml(nominee.nomineeId);

  const fileId =
    String(nominee.fileId || "").trim();

  const fileInputId =
    "editNomineeFileId_" +
    categoryId +
    "_" +
    nomineeId;

  const actionTargetsNominee =
    adminSetupActionTargetsNominee_(uiAction, category.categoryId, nominee.nomineeId);

  return `
    <details
      id="answerRow_${categoryId}_${nomineeId}"
      class="admin-setup-nominee-edit-row admin-collapsible-nominee ${actionTargetsNominee ? "admin-new-answer-row" : ""}"
    >

      <summary class="admin-nominee-item-summary">
        <div>
          <strong id="nomineeTitle_${categoryId}_${nomineeId}">${adminSetupEscapeHtml(nominee.nominee || nominee.nomineeId)}</strong>
          <div class="admin-sub">Answer ID (permanent): ${nomineeId}${fileId ? " · image" : ""}</div>
        </div>
        <div class="admin-nominee-summary-status">
          ${actionTargetsNominee ? `<span class="admin-pill admin-new-answer-pill">NEW</span>` : ""}
          <span class="admin-pill ${nominee.active === false ? "inactive" : ""}">${nominee.active === false ? "Inactive" : "Active"}</span>
          <button
            type="button"
            class="admin-answer-quick-delete"
            title="Permanently delete this answer"
            onclick="event.preventDefault(); event.stopPropagation(); adminSetupDeleteNominee('${gameId}', '${categoryId}', '${nomineeId}')"
          >
            Delete
          </button>
          <span class="admin-collapse-icon">▾</span>
        </div>
      </summary>

      <div
        class="admin-nominee-item-body"
        data-answer-editor
        data-category-id="${categoryId}"
        data-nominee-id="${nomineeId}"
        data-dirty="false"
        oninput="adminSetupMarkAnswerDirty('${categoryId}', '${nomineeId}')"
        onchange="adminSetupMarkAnswerDirty('${categoryId}', '${nomineeId}')"
      >

      <div class="admin-control-grid nominee-grid">

        <label class="admin-field">
          <span>Nominee / Answer</span>

          <input
            type="text"
            id="editNomineeName_${categoryId}_${nomineeId}"
            value="${adminSetupEscapeHtml(nominee.nominee)}"
          >
          <span class="admin-sub">Answer ID: ${nomineeId} (permanent; renaming the answer does not change it)</span>
        </label>

        <label class="admin-field">
          <span>Short Answer</span>

          <input
            type="text"
            id="editNomineeShort_${categoryId}_${nomineeId}"
            value="${adminSetupEscapeHtml(
              nominee.shortAnswer || nominee.nominee
            )}"
          >
        </label>

        <details class="admin-image-details">

          <summary class="admin-image-summary">

            <div>
              <strong>
                Image / File ID
              </strong>

              <div class="admin-sub">
                ${
                  fileId
                    ? "Current File ID: " + adminSetupEscapeHtml(fileId)
                    : "No image set"
                }
              </div>
            </div>

            <span class="admin-collapse-icon">
              ▾
            </span>

          </summary>

          <div class="admin-image-body">

            <label class="admin-field">
              <span>Current File ID</span>

              <input
                type="text"
                id="${fileInputId}"
                value="${adminSetupEscapeHtml(fileId)}"
                placeholder="Paste Drive File ID or Drive link"
                oninput="adminSetupRefreshImagePreview('${categoryId}', '${nomineeId}')"
                onchange="adminSetupRefreshImagePreview('${categoryId}', '${nomineeId}')"
              >
            </label>

            <div
                id="imagePreviewTools_${categoryId}_${nomineeId}"
                class="admin-live-image-preview"
            >
                ${renderAdminSetupFileTools(fileId, fileInputId)}
            </div>

            <div class="admin-card-actions">

              <button
                type="button"
                class="admin-small-button secondary"
                onclick="adminSetupClearNomineeImage('${categoryId}', '${nomineeId}')"
              >
                Clear Current Image
              </button>

              <button
                type="button"
                class="admin-danger-button"
                onclick="adminSetupDeleteNomineeImageFromDrive('${categoryId}', '${nomineeId}')"
              >
                Delete from Drive
              </button>

            </div>

            <details class="admin-image-source-details">

              <summary>
                Change / Upload Image
              </summary>

              <div class="admin-upload-tools">

                <label class="admin-field">
                  <span>Choose Image / Camera Roll</span>

                  <input
                    type="file"
                    id="uploadNomineeImage_${categoryId}_${nomineeId}"
                    accept="image/*"
                  >
                </label>

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminSetupUploadNomineeImage('${gameId}', '${categoryId}', '${nomineeId}', 'choose')"
                >
                  Upload Chosen Image
                </button>

                <label class="admin-field">
                  <span>Take Photo</span>

                  <input
                    type="file"
                    id="captureNomineeImage_${categoryId}_${nomineeId}"
                    accept="image/*"
                    capture="environment"
                  >
                </label>

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminSetupUploadNomineeImage('${gameId}', '${categoryId}', '${nomineeId}', 'capture')"
                >
                  Upload Photo
                </button>

              </div>

              <div class="admin-url-import-tools">

                <label class="admin-field">
                  <span>Import Image from URL</span>

                  <input
                    type="url"
                    id="importNomineeImageUrl_${categoryId}_${nomineeId}"
                    placeholder="https://example.com/image.jpg"
                  >
                </label>

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminSetupImportNomineeImageFromUrl('${gameId}', '${categoryId}', '${nomineeId}')"
                >
                  Import URL
                </button>

              </div>

              <div class="admin-tmdb-tools">

                <label class="admin-field">
                  <span>Search TMDb Movie Poster</span>

                  <input
                    type="text"
                    id="tmdbPosterSearch_${categoryId}_${nomineeId}"
                    value="${adminSetupEscapeHtml(nominee.nominee || "")}"
                    placeholder="Movie title"
                  >
                </label>

                <button
                  type="button"
                  class="admin-small-button secondary"
                  onclick="adminSetupSearchTmdbPosters('${gameId}', '${categoryId}', '${nomineeId}')"
                >
                  Search TMDb
                </button>

              </div>

              <div class="admin-sub">
                This product uses the TMDb API but is not endorsed or certified by TMDb.
              </div>

              <div
                id="tmdbPosterResults_${categoryId}_${nomineeId}"
                class="admin-tmdb-results"
              ></div>

            </details>

          </div>

        </details>

      </div>

      <div class="admin-nominee-edit-footer">

        <label class="admin-check-row compact">
          <input
            type="checkbox"
            id="editNomineeActive_${categoryId}_${nomineeId}"
            ${nominee.active !== false ? "checked" : ""}
          >

          <span>
            Active
          </span>
        </label>

        <div class="admin-card-actions">

          <button
            type="button"
            id="saveAnswerButton_${categoryId}_${nomineeId}"
            class="admin-small-button admin-save-state-button"
            onclick="adminSetupUpdateNominee('${gameId}', '${categoryId}', '${nomineeId}')"
          >
            SAVE ANSWER
          </button>

          <button
            type="button"
            class="admin-danger-button"
            onclick="adminSetupArchiveNominee('${gameId}', '${categoryId}', '${nomineeId}')"
          >
            Archive Answer
          </button>

          <button
            type="button"
            class="admin-danger-button"
            onclick="adminSetupDeleteNominee('${gameId}', '${categoryId}', '${nomineeId}')"
          >
            Delete Answer
          </button>

        </div>

      </div>

      ${renderAdminSetupCloneNomineePanel_(category, nominee, categories)}

      <div
        id="editNomineeMessage_${categoryId}_${nomineeId}"
        class="admin-message"
      ></div>

      </div>
    </details>
  `;
}

function renderAdminSetupInlineAddNomineeCard(category) {

  const gameId =
    adminSetupEscapeHtml(
      category.gameId
    );

  const categoryId =
    adminSetupEscapeHtml(
      category.categoryId
    );

  const categoryName =
    adminSetupEscapeHtml(
      category.category || category.categoryId
    );

  return `
    <details class="admin-inline-add-answer">

      <summary class="admin-inline-add-summary">

        <strong>
          + Add Answer
        </strong>

        <span class="admin-sub">
          Add another nominee/answer to this question.
        </span>

      </summary>

      <div class="admin-inline-add-body">

        <div class="admin-control-grid nominee-grid">

          <label class="admin-field">
            <span>Nominee / Answer</span>

            <input
              type="text"
              id="inlineNewNomineeName_${categoryId}"
              placeholder="New answer"
              oninput="adminSetupAutoFillInlineNomineeFields('${categoryId}')"
            >
          </label>

          <label class="admin-field">
            <span>Short Answer</span>

            <input
              type="text"
              id="inlineNewNomineeShortAnswer_${categoryId}"
              placeholder="Auto-filled"
            >
          </label>

          <label class="admin-field">
            <span>Nominee ID</span>

            <input
              type="text"
              id="inlineNewNomineeId_${categoryId}"
              placeholder="auto-generated"
            >
          </label>

          <label class="admin-field">
            <span>File ID</span>

            <input
              type="text"
              id="inlineNewNomineeFileId_${categoryId}"
              placeholder="Optional Google Drive File ID"
            >
          </label>

          <label class="admin-field">
            <span>Section</span>

            <input
              type="text"
              id="inlineNewNomineeSection_${categoryId}"
              value="${adminSetupEscapeHtml(category.section || "Main")}"
              list="adminSetupSectionOptions"
            >
          </label>

        </div>

        <div class="admin-card-actions">

          <button
            type="button"
            class="admin-small-button"
            onclick="adminSetupCreateInlineNominee('${gameId}', '${categoryId}', '${categoryName}')"
          >
            Add Answer
          </button>

        </div>

        <div
          id="inlineNewNomineeMessage_${categoryId}"
          class="admin-message"
        ></div>

      </div>

    </details>
  `;

}
/* ======================
   CLONE / BULK QUESTION ACTIONS
====================== */

async function adminSetupCloneCategory(gameId, categoryId) {
  const name = adminSetupFieldValue_("cloneCategoryName_" + categoryId, "");
  const newCategoryId = adminSetupSlugify(
    adminSetupFieldValue_("cloneCategoryId_" + categoryId, name)
  );

  if (!name || !newCategoryId) {
    adminSetupSetMessage("cloneCategoryMessage_" + categoryId, "New question name and ID are required.", true);
    return;
  }

  adminSetupSetMessage("cloneCategoryMessage_" + categoryId, "Cloning question...", false);

  const res = await apiAdminCloneCategory({
    gameId: gameId,
    sourceGameId: gameId,
    targetGameId: gameId,
    sourceCategoryId: categoryId,
    category: name,
    newCategoryId: newCategoryId,
    section: adminSetupFieldValue_("cloneCategorySection_" + categoryId, "Main"),
    displayOrder: adminSetupFieldValue_("cloneCategoryOrder_" + categoryId, "999"),
    lockDateTime: adminSetupFieldValue_("cloneCategoryLockDateTime_" + categoryId, ""),
    copyNominees: adminSetupFieldChecked_("cloneCategoryCopyNominees_" + categoryId, true),
    copyImages: adminSetupFieldChecked_("cloneCategoryCopyImages_" + categoryId, true)
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "cloneCategoryMessage_" + categoryId,
      res && (res.message || res.error) ? res.message || res.error : "Unable to clone question.",
      true
    );
    return;
  }

  adminSetupSetMessage(
    "cloneCategoryMessage_" + categoryId,
    "Question cloned as " + (res.category || name) + ".",
    false
  );
  adminSetupRememberUiAction_({
    type: "clone-question",
    gameId: gameId,
    categoryId: res.categoryId || newCategoryId,
    sourceCategoryId: categoryId,
    openAnswers: true,
    highlightAllAnswers: true,
    message: "Cloned from " + categoryId +
      " with " + Number(res.nomineeResult && res.nomineeResult.createdCount || 0) +
      " answer(s). The cloned question and answers are open below."
  });
  navigate("admin-game-setup:" + gameId);
}

function adminSetupGenerateBulkAnswerLines(categoryId) {
  const prefix = adminSetupFieldValue_("bulkNomineePrefix_" + categoryId, "Answer");
  const count = Math.max(1, Math.min(250, Number(adminSetupFieldValue_("bulkNomineeCount_" + categoryId, "5")) || 5));
  const start = Number(adminSetupFieldValue_("bulkNomineeStart_" + categoryId, "1")) || 0;
  const textarea = document.getElementById("bulkNomineeLines_" + categoryId);
  if (!textarea) return;

  const lines = [];
  for (let index = 0; index < count; index += 1) {
    const name = (prefix || "Answer") + " " + (start + index);
    lines.push(name + " | " + name + " | " + adminSetupSlugify(name));
  }
  textarea.value = lines.join("\n");
}

async function adminSetupBulkCreateNominees(gameId, categoryId, categoryName) {
  const textarea = document.getElementById("bulkNomineeLines_" + categoryId);
  const items = adminSetupParseBulkAnswerLines_(textarea ? textarea.value : "");

  if (!items.length) {
    adminSetupSetMessage("bulkNomineeMessage_" + categoryId, "Enter at least one answer.", true);
    return;
  }

  adminSetupSetMessage("bulkNomineeMessage_" + categoryId, "Creating " + items.length + " answers...", false);

  const res = await apiAdminBulkCreateNominees({
    gameId: gameId,
    categoryId: categoryId,
    category: categoryName,
    itemsJSON: JSON.stringify(items)
  });

  if (!res || (res.success === false && !res.partial)) {
    adminSetupSetMessage(
      "bulkNomineeMessage_" + categoryId,
      res && (res.message || res.error) ? res.message || res.error : "Unable to create answers.",
      true
    );
    return;
  }

  adminSetupSetMessage(
    "bulkNomineeMessage_" + categoryId,
    (res.createdCount || items.length) + " answers created" + (res.errors && res.errors.length ? "; some lines were skipped." : "."),
    Boolean(res.errors && res.errors.length)
  );
  adminSetupRememberUiAction_({
    type: "bulk-add-answers",
    gameId: gameId,
    categoryId: categoryId,
    nomineeIds: (res.created || []).map(function(item) { return item.nomineeId; }),
    openAnswers: true,
    message: Number(res.createdCount || items.length) +
      " answer(s) created. The answer list is open below."
  });
  navigate("admin-game-setup:" + gameId);
}

async function adminSetupCloneNominee(gameId, categoryId, nomineeId) {
  const targetCategoryId = adminSetupFieldValue_("cloneNomineeTarget_" + categoryId + "_" + nomineeId, categoryId);
  const nomineeName = adminSetupFieldValue_("cloneNomineeName_" + categoryId + "_" + nomineeId, "");
  const newNomineeId = adminSetupSlugify(
    adminSetupFieldValue_("cloneNomineeId_" + categoryId + "_" + nomineeId, nomineeName)
  );

  if (!targetCategoryId || !nomineeName || !newNomineeId) {
    adminSetupSetMessage("cloneNomineeMessage_" + categoryId + "_" + nomineeId, "Target question, answer name, and answer ID are required.", true);
    return;
  }

  adminSetupSetMessage("cloneNomineeMessage_" + categoryId + "_" + nomineeId, "Cloning answer...", false);

  const res = await apiAdminCloneNominee({
    gameId: gameId,
    sourceCategoryId: categoryId,
    sourceNomineeId: nomineeId,
    targetCategoryId: targetCategoryId,
    nominee: nomineeName,
    newNomineeId: newNomineeId,
    shortAnswer: adminSetupFieldValue_("cloneNomineeShort_" + categoryId + "_" + nomineeId, nomineeName),
    copyImage: adminSetupFieldChecked_("cloneNomineeCopyImage_" + categoryId + "_" + nomineeId, true)
  });

  if (!res || (res.success === false && !res.partial)) {
    adminSetupSetMessage(
      "cloneNomineeMessage_" + categoryId + "_" + nomineeId,
      res && (res.message || res.error) ? res.message || res.error : "Unable to clone answer.",
      true
    );
    return;
  }

  adminSetupSetMessage("cloneNomineeMessage_" + categoryId + "_" + nomineeId, "Answer cloned.", false);
  adminSetupRememberUiAction_({
    type: "clone-answer",
    gameId: gameId,
    categoryId: targetCategoryId,
    nomineeIds: (res.created || []).map(function(item) { return item.nomineeId; }).concat(
      res.created && res.created.length ? [] : [newNomineeId]
    ),
    openAnswers: true,
    message: "The cloned answer is shown in " + targetCategoryId + "."
  });
  navigate("admin-game-setup:" + gameId);
}

/* ======================
   CREATE CATEGORY
====================== */

async function adminSetupCreateCategory(gameId) {
  const nameInput = document.getElementById("setupNewCategoryName");

  const idInput = document.getElementById("setupNewCategoryId");

  const sectionInput = document.getElementById("setupNewCategorySection");

  const pointsInput = document.getElementById("setupNewCategoryPoints");

  const lockDateTimeInput = document.getElementById(
    "setupNewCategoryLockDateTime"
  );

  const groupIdInput = document.getElementById("setupNewCategoryGroupId");

  const parentCategoryIdInput = document.getElementById(
    "setupNewCategoryParentCategoryId"
  );

  const followUpCategoryIdInput = document.getElementById(
    "setupNewCategoryFollowUpCategoryId"
  );

  const followUpMapJSONInput = document.getElementById(
    "setupNewCategoryFollowUpMapJSON"
  );

  const questionEngineFields =
    adminSetupReadQuestionEngineFields_("setupNewCategory", "");

  const displayOrderInput = document.getElementById(
    "setupNewCategoryDisplayOrder"
  );

  const layoutTypeInput = document.getElementById("setupNewCategoryLayoutType");

  const countsAsStatueInput = document.getElementById(
    "setupNewCategoryCountsAsStatue"
  );

  const lockedInput = document.getElementById("setupNewCategoryLocked");

  const answerPresetInput = document.getElementById("setupNewCategoryAnswerPreset");

  const categoryName = nameInput ? nameInput.value.trim() : "";

  const categoryId = adminSetupSlugify(
    idInput && idInput.value.trim() ? idInput.value.trim() : categoryName
  );

  if (!categoryName || !categoryId) {
    adminSetupSetMessage(
      "setupAddCategoryMessage",
      "Category name is required.",
      true
    );

    return;
  }

  const followUpMapJSON = followUpMapJSONInput
    ? followUpMapJSONInput.value.trim()
    : "";

  if (followUpMapJSON) {
    try {
      JSON.parse(followUpMapJSON);
    } catch (err) {
      adminSetupSetMessage(
        "setupAddCategoryMessage",
        "Follow-Up Map JSON is not valid JSON.",
        true
      );

      return;
    }
  }

  if (questionEngineFields.sourceConfigJSON) {
    try {
      JSON.parse(questionEngineFields.sourceConfigJSON);
    } catch (err) {
      adminSetupSetMessage(
        "setupAddCategoryMessage",
        "Source Configuration JSON is not valid JSON.",
        true
      );

      return;
    }
  }

  adminSetupSetMessage("setupAddCategoryMessage", "Adding category...", false);

  const res = await apiAdminCreateCategory(Object.assign({
    gameId: gameId,

    category: categoryName,

    categoryId: categoryId,

    section: sectionInput ? sectionInput.value.trim() : "Main",

    points: pointsInput ? pointsInput.value : 1,

    lockDateTime: lockDateTimeInput ? lockDateTimeInput.value : "",

    groupId:
      groupIdInput && groupIdInput.value.trim()
        ? groupIdInput.value.trim()
        : "default",

    parentCategoryId: parentCategoryIdInput
      ? adminSetupSlugify(parentCategoryIdInput.value.trim())
      : "",

    followUpCategoryId: followUpCategoryIdInput
      ? adminSetupSlugify(followUpCategoryIdInput.value.trim())
      : "",

    followUpMapJSON: followUpMapJSON,

    displayOrder: displayOrderInput ? displayOrderInput.value : 999,

    layoutType: layoutTypeInput ? layoutTypeInput.value : "image",

    countsAsStatue: countsAsStatueInput ? countsAsStatueInput.checked : true,

    locked: lockedInput ? lockedInput.checked : false,
  }, questionEngineFields));

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "setupAddCategoryMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add category.",
      true
    );

    return;
  }

  const presetItems = adminSetupAnswerPresetItems_(
    answerPresetInput ? answerPresetInput.value : ""
  );
  let createdAnswerIds = [];

  if (presetItems.length) {
    adminSetupSetMessage(
      "setupAddCategoryMessage",
      "Question added. Creating answer choices...",
      false
    );

    const bulkResult = await apiAdminBulkCreateNominees({
      gameId: gameId,
      categoryId: categoryId,
      category: categoryName,
      section: sectionInput ? sectionInput.value.trim() : "Main",
      itemsJSON: JSON.stringify(presetItems)
    });

    if (!bulkResult || bulkResult.success === false) {
      adminSetupSetMessage(
        "setupAddCategoryMessage",
        "Question added, but the quick answers could not be created: " +
          (bulkResult && (bulkResult.message || bulkResult.error)
            ? bulkResult.message || bulkResult.error
            : "Unknown error"),
        true
      );
      return;
    }

    createdAnswerIds = (bulkResult.created || []).map(function(item) {
      return item.nomineeId;
    });
  }

  adminSetupSetMessage("setupAddCategoryMessage", "Question added.", false);

  adminSetupCategoryIdTouched = false;
  adminSetupRememberUiAction_({
    type: "create-question",
    gameId: gameId,
    categoryId: res.categoryId || categoryId,
    nomineeIds: createdAnswerIds,
    openAnswers: true,
    message: createdAnswerIds.length
      ? "Question created with " + createdAnswerIds.length + " answer(s)."
      : "Question created. Add answers in the open section below."
  });

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   CREATE NOMINEE
====================== */

async function adminSetupCreateNominee(gameId) {
  const categoryInput = document.getElementById("setupNomineeCategoryId");

  const nomineeInput = document.getElementById("setupNewNomineeName");

  const nomineeIdInput = document.getElementById("setupNewNomineeId");

  const shortAnswerInput = document.getElementById(
    "setupNewNomineeShortAnswer"
  );

  const fileIdInput = document.getElementById("setupNewNomineeFileId");

  const sectionInput = document.getElementById("setupNewNomineeSection");

  const categoryId = categoryInput ? categoryInput.value.trim() : "";

  const categoryName = adminSetupGetCategoryNameById(categoryId);

  const nomineeName = nomineeInput ? nomineeInput.value.trim() : "";

  const nomineeId = adminSetupSlugify(
    nomineeIdInput && nomineeIdInput.value.trim()
      ? nomineeIdInput.value.trim()
      : nomineeName
  );

  if (!categoryId || !nomineeName || !nomineeId) {
    adminSetupSetMessage(
      "setupAddNomineeMessage",
      "Category and nominee name are required.",
      true
    );

    return;
  }

  adminSetupSetMessage("setupAddNomineeMessage", "Adding nominee...", false);

  const res = await apiAdminCreateNominee({
    gameId: gameId,
    categoryId: categoryId,
    category: categoryName,
    nominee: nomineeName,
    nomineeId: nomineeId,
    shortAnswer:
      shortAnswerInput && shortAnswerInput.value.trim()
        ? shortAnswerInput.value.trim()
        : nomineeName,
    fileId: fileIdInput ? fileIdInput.value.trim() : "",
    section: sectionInput ? sectionInput.value.trim() : "Main",
    active: true,
  });

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "setupAddNomineeMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add nominee.",
      true
    );

    return;
  }

  adminSetupSetMessage("setupAddNomineeMessage", "Nominee added.", false);

  adminSetupNomineeIdTouched = false;
  adminSetupShortAnswerTouched = false;
  adminSetupRememberUiAction_({
    type: "add-answer",
    gameId: gameId,
    categoryId: categoryId,
    nomineeIds: [res.nomineeId || nomineeId],
    openAnswers: true,
    message: "The new answer is highlighted below."
  });

  navigate("admin-game-setup:" + gameId);
}

function adminSetupAutoFillInlineNomineeFields(categoryId) {

  const nomineeInput =
    document.getElementById(
      "inlineNewNomineeName_" +
      categoryId
    );

  const nomineeIdInput =
    document.getElementById(
      "inlineNewNomineeId_" +
      categoryId
    );

  const shortAnswerInput =
    document.getElementById(
      "inlineNewNomineeShortAnswer_" +
      categoryId
    );

  if (!nomineeInput) {
    return;
  }

  const nomineeName =
    nomineeInput.value.trim();

  if (nomineeIdInput) {
    nomineeIdInput.value =
      adminSetupSlugify(
        nomineeName
      );
  }

  if (shortAnswerInput) {
    shortAnswerInput.value =
      nomineeName;
  }

}

async function adminSetupCreateInlineNominee(
  gameId,
  categoryId,
  categoryName
) {

  const nomineeInput =
    document.getElementById(
      "inlineNewNomineeName_" +
      categoryId
    );

  const nomineeIdInput =
    document.getElementById(
      "inlineNewNomineeId_" +
      categoryId
    );

  const shortAnswerInput =
    document.getElementById(
      "inlineNewNomineeShortAnswer_" +
      categoryId
    );

  const fileIdInput =
    document.getElementById(
      "inlineNewNomineeFileId_" +
      categoryId
    );

  const sectionInput =
    document.getElementById(
      "inlineNewNomineeSection_" +
      categoryId
    );

  const messageId =
    "inlineNewNomineeMessage_" +
    categoryId;

  const nomineeName =
    nomineeInput
      ? nomineeInput.value.trim()
      : "";

  const nomineeId =
    adminSetupSlugify(
      nomineeIdInput && nomineeIdInput.value.trim()
        ? nomineeIdInput.value.trim()
        : nomineeName
    );

  if (
    !nomineeName ||
    !nomineeId
  ) {

    adminSetupSetMessage(
      messageId,
      "Answer name is required.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Adding answer...",
    false
  );

  const res =
    await apiAdminCreateNominee({
      gameId:
        gameId,

      categoryId:
        categoryId,

      category:
        categoryName,

      nominee:
        nomineeName,

      nomineeId:
        nomineeId,

      shortAnswer:
        shortAnswerInput && shortAnswerInput.value.trim()
          ? shortAnswerInput.value.trim()
          : nomineeName,

      fileId:
        fileIdInput
          ? fileIdInput.value.trim()
          : "",

      section:
        sectionInput && sectionInput.value.trim()
          ? sectionInput.value.trim()
          : "Main",

      active:
        true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      messageId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add answer.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    messageId,
    "Answer added.",
    false
  );

  adminSetupRememberUiAction_({
    type: "add-answer",
    gameId: gameId,
    categoryId: categoryId,
    nomineeIds: [res.nomineeId || nomineeId],
    openAnswers: true,
    message: "The new answer is highlighted below."
  });

  navigate(
    "admin-game-setup:" +
    gameId
  );

}

/* ======================
   QUESTION / ANSWER SAVE STATE
====================== */

function adminSetupSetSaveButtonState_(button, state, labels) {
  if (!button) return;

  labels = labels || {};
  button.classList.remove("is-dirty", "is-saving", "is-saved", "is-error");

  if (state) {
    button.classList.add("is-" + state);
  }

  const label = labels[state] || labels.default || button.textContent;
  button.textContent = label;
  button.disabled = state === "saving";
}

function adminSetupRefreshSaveAllState_() {
  const button = document.getElementById("adminSetupSaveAllButton");
  if (!button) return;

  const hasDirty = Boolean(
    document.querySelector('[data-question-editor][data-dirty="true"], [data-answer-editor][data-dirty="true"]')
  );

  if (hasDirty) {
    adminSetupSetSaveButtonState_(button, "dirty", {
      dirty: "CHANGES MADE — SAVE ALL NOW"
    });
  } else if (!button.classList.contains("is-saved")) {
    adminSetupSetSaveButtonState_(button, "", {
      default: "SAVE ALL CHANGES"
    });
  }
}

function adminSetupMarkQuestionDirty(categoryId) {
  const editor = document.querySelector(
    '[data-question-editor][data-category-id="' + String(categoryId) + '"]'
  );
  if (editor) editor.dataset.dirty = "true";

  adminSetupSetSaveButtonState_(
    document.getElementById("saveQuestionButton_" + categoryId),
    "dirty",
    { dirty: "CHANGES MADE — SAVE NOW" }
  );
  adminSetupRefreshSaveAllState_();
}

function adminSetupMarkAnswerDirty(categoryId, nomineeId) {
  const editor = document.querySelector(
    '[data-answer-editor][data-category-id="' + String(categoryId) + '"][data-nominee-id="' + String(nomineeId) + '"]'
  );
  if (editor) editor.dataset.dirty = "true";

  adminSetupSetSaveButtonState_(
    document.getElementById("saveAnswerButton_" + categoryId + "_" + nomineeId),
    "dirty",
    { dirty: "CHANGES MADE — SAVE NOW" }
  );
  adminSetupRefreshSaveAllState_();
}

function adminSetupMarkQuestionSaved_(categoryId) {
  adminSetupSyncQuestionDisplay_(categoryId);

  const editor = document.querySelector(
    '[data-question-editor][data-category-id="' + String(categoryId) + '"]'
  );
  if (editor) editor.dataset.dirty = "false";

  const button = document.getElementById("saveQuestionButton_" + categoryId);
  adminSetupSetSaveButtonState_(button, "saved", { saved: "SAVED ✓" });
  setTimeout(function() {
    if (editor && editor.dataset.dirty === "true") return;
    adminSetupSetSaveButtonState_(button, "", { default: "SAVE QUESTION" });
  }, 2200);
  adminSetupRefreshSaveAllState_();
}

function adminSetupMarkAnswerSaved_(categoryId, nomineeId) {
  adminSetupSyncAnswerDisplay_(categoryId, nomineeId);

  const editor = document.querySelector(
    '[data-answer-editor][data-category-id="' + String(categoryId) + '"][data-nominee-id="' + String(nomineeId) + '"]'
  );
  if (editor) editor.dataset.dirty = "false";

  const button = document.getElementById("saveAnswerButton_" + categoryId + "_" + nomineeId);
  adminSetupSetSaveButtonState_(button, "saved", { saved: "SAVED ✓" });
  setTimeout(function() {
    if (editor && editor.dataset.dirty === "true") return;
    adminSetupSetSaveButtonState_(button, "", { default: "SAVE ANSWER" });
  }, 2200);
  adminSetupRefreshSaveAllState_();
}

function adminSetupBuildCategoryPayload_(gameId, categoryId) {
  const get = function(id) { return document.getElementById(id); };
  const nameInput = get("editCategoryName_" + categoryId);
  const categoryName = nameInput ? nameInput.value.trim() : "";

  if (!categoryName) {
    return { error: "Category name is required." };
  }

  const questionEngineFields =
    adminSetupReadQuestionEngineFields_("editCategory", "_" + categoryId);
  const followUpMapInput = get("editCategoryFollowUpMapJSON_" + categoryId);
  const followUpMapJSON = followUpMapInput ? followUpMapInput.value.trim() : "";

  if (followUpMapJSON) {
    try {
      JSON.parse(followUpMapJSON);
    } catch (err) {
      return { error: "Follow-Up Map JSON is not valid JSON." };
    }
  }

  if (questionEngineFields.sourceConfigJSON) {
    try {
      JSON.parse(questionEngineFields.sourceConfigJSON);
    } catch (err) {
      return { error: "Source Configuration JSON is not valid JSON." };
    }
  }

  const groupIdInput = get("editCategoryGroupId_" + categoryId);
  const parentInput = get("editCategoryParentCategoryId_" + categoryId);
  const followUpInput = get("editCategoryFollowUpCategoryId_" + categoryId);
  const pointsInput = get("editCategoryPoints_" + categoryId);
  const orderInput = get("editCategoryOrder_" + categoryId);
  const layoutInput = get("editCategoryLayout_" + categoryId);
  const lockDateInput = get("editCategoryLockDateTime_" + categoryId);
  const sectionInput = get("editCategorySection_" + categoryId);
  const lockedInput = get("editCategoryLocked_" + categoryId);
  const activeInput = get("editCategoryActive_" + categoryId);
  const predictionInput = get("editCategoryPrediction_" + categoryId);
  const statueInput = get("editCategoryStatue_" + categoryId);

  return {
    payload: Object.assign({
      gameId: gameId,
      categoryId: categoryId,
      category: categoryName,
      section: sectionInput ? sectionInput.value.trim() : "",
      points: pointsInput ? pointsInput.value : 0,
      displayOrder: orderInput ? orderInput.value : 999,
      layoutType: layoutInput ? layoutInput.value : "image",
      lockDateTime: lockDateInput ? lockDateInput.value : "",
      groupId: groupIdInput && groupIdInput.value.trim()
        ? groupIdInput.value.trim()
        : "default",
      parentCategoryId: parentInput
        ? adminSetupSlugify(parentInput.value.trim())
        : "",
      followUpCategoryId: followUpInput
        ? adminSetupSlugify(followUpInput.value.trim())
        : "",
      followUpMapJSON: followUpMapJSON,
      locked: lockedInput ? lockedInput.checked : false,
      active: activeInput ? activeInput.checked : true,
      predictionGame: predictionInput ? predictionInput.checked : true,
      countsAsStatue: statueInput ? statueInput.checked : false
    }, questionEngineFields)
  };
}

function adminSetupBuildAnswerPayload_(gameId, categoryId, nomineeId) {
  const get = function(id) { return document.getElementById(id); };
  const nameInput = get("editNomineeName_" + categoryId + "_" + nomineeId);
  const nomineeName = nameInput ? nameInput.value.trim() : "";

  if (!nomineeName) {
    return { error: "Answer name is required." };
  }

  const shortInput = get("editNomineeShort_" + categoryId + "_" + nomineeId);
  const fileInput = get("editNomineeFileId_" + categoryId + "_" + nomineeId);
  const activeInput = get("editNomineeActive_" + categoryId + "_" + nomineeId);

  return {
    payload: {
      gameId: gameId,
      categoryId: categoryId,
      nomineeId: nomineeId,
      nominee: nomineeName,
      shortAnswer: shortInput && shortInput.value.trim()
        ? shortInput.value.trim()
        : nomineeName,
      fileId: fileInput ? fileInput.value.trim() : "",
      active: activeInput ? activeInput.checked : true
    }
  };
}

function adminSetupBuildBulkSaveBatches_(questions, answers) {
  const maxJsonLength = 4200;
  const batches = [];
  let current = { questions: [], answers: [], length: 0 };

  const pushCurrent = function() {
    if (current.questions.length || current.answers.length) {
      batches.push(current);
    }
    current = { questions: [], answers: [], length: 0 };
  };

  const addItem = function(type, item) {
    const length = JSON.stringify(item || {}).length + 80;
    if (current.length && current.length + length > maxJsonLength) {
      pushCurrent();
    }
    current[type].push(item);
    current.length += length;
  };

  (questions || []).forEach(function(item) { addItem("questions", item); });
  (answers || []).forEach(function(item) { addItem("answers", item); });
  pushCurrent();

  return batches;
}

async function adminSetupSaveAllChanges(gameId) {
  const questionEditors = Array.from(
    document.querySelectorAll('[data-question-editor][data-dirty="true"]')
  );
  const answerEditors = Array.from(
    document.querySelectorAll('[data-answer-editor][data-dirty="true"]')
  );
  const button = document.getElementById("adminSetupSaveAllButton");

  if (!questionEditors.length && !answerEditors.length) {
    adminSetupSetMessage("adminSetupMessage", "No unsaved question or answer changes.", false);
    return;
  }

  const questions = [];
  const answers = [];

  for (const editor of questionEditors) {
    const categoryId = editor.dataset.categoryId;
    const built = adminSetupBuildCategoryPayload_(gameId, categoryId);
    if (built.error) {
      adminSetupSetMessage("editCategoryMessage_" + categoryId, built.error, true);
      adminSetupSetMessage("adminSetupMessage", "Fix the highlighted question before saving all changes.", true);
      return;
    }
    questions.push(built.payload);
    adminSetupSetSaveButtonState_(
      document.getElementById("saveQuestionButton_" + categoryId),
      "saving",
      { saving: "SAVING..." }
    );
  }

  for (const editor of answerEditors) {
    const categoryId = editor.dataset.categoryId;
    const nomineeId = editor.dataset.nomineeId;
    const built = adminSetupBuildAnswerPayload_(gameId, categoryId, nomineeId);
    if (built.error) {
      adminSetupSetMessage("editNomineeMessage_" + categoryId + "_" + nomineeId, built.error, true);
      adminSetupSetMessage("adminSetupMessage", "Fix the highlighted answer before saving all changes.", true);
      return;
    }
    answers.push(built.payload);
    adminSetupSetSaveButtonState_(
      document.getElementById("saveAnswerButton_" + categoryId + "_" + nomineeId),
      "saving",
      { saving: "SAVING..." }
    );
  }

  adminSetupSetSaveButtonState_(button, "saving", { saving: "SAVING ALL..." });
  adminSetupSetMessage("adminSetupMessage", "Saving all changed questions and answers...", false);

  const batches = adminSetupBuildBulkSaveBatches_(questions, answers);
  const aggregate = {
    success: true,
    message: "All Game Setup changes saved.",
    questionsSaved: 0,
    answersSaved: 0,
    failures: [],
    compatibilityFallback: false
  };

  for (const batch of batches) {
    const batchResult = await apiAdminBulkUpdateGameSetup(
      gameId,
      batch.questions,
      batch.answers
    );

    if (!batchResult || batchResult.success === false) {
      aggregate.success = false;
      aggregate.message = batchResult && (batchResult.message || batchResult.error)
        ? batchResult.message || batchResult.error
        : "Some Game Setup changes could not be saved.";
    }

    aggregate.questionsSaved += Number(batchResult && batchResult.questionsSaved || 0);
    aggregate.answersSaved += Number(batchResult && batchResult.answersSaved || 0);
    if (batchResult && Array.isArray(batchResult.failures)) {
      aggregate.failures = aggregate.failures.concat(batchResult.failures);
    }
    if (batchResult && batchResult.compatibilityFallback) {
      aggregate.compatibilityFallback = true;
    }
  }

  const res = aggregate;
  const failures = res.failures;
  const failedQuestions = {};
  const failedAnswers = {};

  failures.forEach(function(failure) {
    if (failure.type === "question") {
      failedQuestions[String(failure.categoryId || "")] = failure.error || "Save failed.";
    } else {
      failedAnswers[
        String(failure.categoryId || "") + "::" + String(failure.nomineeId || "")
      ] = failure.error || "Save failed.";
    }
  });

  questionEditors.forEach(function(editor) {
    const categoryId = editor.dataset.categoryId;
    if (failedQuestions[categoryId]) {
      adminSetupSetMessage("editCategoryMessage_" + categoryId, failedQuestions[categoryId], true);
      adminSetupSetSaveButtonState_(
        document.getElementById("saveQuestionButton_" + categoryId),
        "error",
        { error: "SAVE FAILED — TRY AGAIN" }
      );
    } else {
      adminSetupSetMessage("editCategoryMessage_" + categoryId, "Question saved.", false);
      adminSetupMarkQuestionSaved_(categoryId);
    }
  });

  answerEditors.forEach(function(editor) {
    const categoryId = editor.dataset.categoryId;
    const nomineeId = editor.dataset.nomineeId;
    const key = categoryId + "::" + nomineeId;
    if (failedAnswers[key]) {
      adminSetupSetMessage("editNomineeMessage_" + categoryId + "_" + nomineeId, failedAnswers[key], true);
      adminSetupSetSaveButtonState_(
        document.getElementById("saveAnswerButton_" + categoryId + "_" + nomineeId),
        "error",
        { error: "SAVE FAILED — TRY AGAIN" }
      );
    } else {
      adminSetupSetMessage("editNomineeMessage_" + categoryId + "_" + nomineeId, "Answer saved.", false);
      adminSetupMarkAnswerSaved_(categoryId, nomineeId);
    }
  });

  if (!res || res.success === false) {
    adminSetupSetSaveButtonState_(button, "error", { error: "SOME CHANGES FAILED" });
    adminSetupSetMessage(
      "adminSetupMessage",
      res && (res.message || res.error) ? res.message || res.error : "Some changes could not be saved.",
      true
    );
    return;
  }

  adminSetupSetSaveButtonState_(button, "saved", { saved: "ALL CHANGES SAVED ✓" });
  adminSetupSetMessage(
    "adminSetupMessage",
    "Saved " + Number(res.questionsSaved || 0) + " question(s) and " + Number(res.answersSaved || 0) + " answer(s)." +
      (res.compatibilityFallback ? " The app used compatibility save mode because the Apps Script deployment is one version behind." : ""),
    false
  );
  setTimeout(function() {
    adminSetupSetSaveButtonState_(button, "", { default: "SAVE ALL CHANGES" });
    adminSetupRefreshSaveAllState_();
  }, 2500);
}

async function adminSetupDeleteCategory(gameId, categoryId) {
  const first = confirm(
    "Permanently delete this question and all of its answers? This cannot be undone. Use Archive Question when you need to preserve history."
  );
  if (!first) return;

  const second = confirm("Delete this question permanently now?");
  if (!second) return;

  adminSetupSetMessage("editCategoryMessage_" + categoryId, "Deleting question...", false);
  const res = await apiAdminDeleteCategory(gameId, categoryId);

  if (!res || res.success === false) {
    const message = res && (res.message || res.error)
      ? res.message || res.error
      : "Could not delete question.";
    adminSetupSetMessage("editCategoryMessage_" + categoryId, message, true);
    alert(message);
    return;
  }

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   UPDATE CATEGORY
====================== */

async function adminSetupUpdateCategory(gameId, categoryId) {
  const built = adminSetupBuildCategoryPayload_(gameId, categoryId);
  const button = document.getElementById("saveQuestionButton_" + categoryId);

  if (built.error) {
    adminSetupSetMessage("editCategoryMessage_" + categoryId, built.error, true);
    adminSetupSetSaveButtonState_(button, "error", { error: "FIX ERROR — SAVE AGAIN" });
    return;
  }

  adminSetupSetSaveButtonState_(button, "saving", { saving: "SAVING..." });
  adminSetupSetMessage("editCategoryMessage_" + categoryId, "Saving question...", false);

  const res = await apiAdminUpdateCategory(built.payload);

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editCategoryMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save question.",
      true
    );
    adminSetupSetSaveButtonState_(button, "error", { error: "SAVE FAILED — TRY AGAIN" });
    return;
  }

  adminSetupApplyLockState_(categoryId, Boolean(built.payload.locked));
  adminSetupSetMessage("editCategoryMessage_" + categoryId, "Question saved.", false);
  adminSetupMarkQuestionSaved_(categoryId);
}

/* ======================
   ARCHIVE CATEGORY
====================== */

async function adminSetupArchiveCategory(gameId, categoryId) {
  const ok = confirm(
    "Archive this category? It will be marked inactive and locked."
  );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "editCategoryMessage_" + categoryId,
    "Archiving category...",
    false
  );

  const res = await apiAdminArchiveCategory(gameId, categoryId);

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editCategoryMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not archive category.",
      true
    );

    return;
  }

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   UPDATE NOMINEE
====================== */

async function adminSetupUpdateNominee(gameId, categoryId, nomineeId) {
  const built = adminSetupBuildAnswerPayload_(gameId, categoryId, nomineeId);
  const button = document.getElementById(
    "saveAnswerButton_" + categoryId + "_" + nomineeId
  );

  if (built.error) {
    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      built.error,
      true
    );
    adminSetupSetSaveButtonState_(button, "error", { error: "FIX ERROR — SAVE AGAIN" });
    return;
  }

  adminSetupSetSaveButtonState_(button, "saving", { saving: "SAVING..." });
  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Saving answer...",
    false
  );

  const res = await apiAdminUpdateNominee(built.payload);

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save answer.",
      true
    );
    adminSetupSetSaveButtonState_(button, "error", { error: "SAVE FAILED — TRY AGAIN" });
    return;
  }

  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Answer saved.",
    false
  );
  adminSetupMarkAnswerSaved_(categoryId, nomineeId);
}

/* ======================
   DELETE NOMINEE / ANSWER
====================== */

async function adminSetupDeleteNominee(gameId, categoryId, nomineeId) {
  const answerInput = document.getElementById(
    "editNomineeName_" + categoryId + "_" + nomineeId
  );
  const answerName = answerInput && answerInput.value.trim()
    ? answerInput.value.trim()
    : nomineeId;

  const first = confirm(
    'Permanently delete the answer "' + answerName + '"? This cannot be undone. Use Archive Answer when picks, wagers, or results must be preserved.'
  );
  if (!first) return;

  const second = confirm("Delete this answer permanently now?");
  if (!second) return;

  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Deleting answer...",
    false
  );

  const res = await apiAdminDeleteNominee(gameId, categoryId, nomineeId);

  if (!res || res.success === false) {
    const message = res && (res.message || res.error)
      ? res.message || res.error
      : "Could not delete answer.";

    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      message,
      true
    );
    alert(message);
    return;
  }

  adminSetupRememberUiAction_({
    type: "delete-answer",
    gameId: gameId,
    categoryId: categoryId,
    openAnswers: true,
    message: 'Deleted "' + answerName + '". The remaining answers are shown below.'
  });
  navigate("admin-game-setup:" + gameId);
}

/* ======================
   ARCHIVE NOMINEE
====================== */

async function adminSetupArchiveNominee(gameId, categoryId, nomineeId) {
  const ok = confirm("Archive this nominee? It will be marked inactive.");

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "editNomineeMessage_" + categoryId + "_" + nomineeId,
    "Archiving nominee...",
    false
  );

  const res = await apiAdminArchiveNominee(gameId, categoryId, nomineeId);

  if (!res || res.success === false) {
    adminSetupSetMessage(
      "editNomineeMessage_" + categoryId + "_" + nomineeId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not archive nominee.",
      true
    );

    return;
  }

  navigate("admin-game-setup:" + gameId);
}

/* ======================
   SAVE RESULTS / WINNERS
====================== */

async function adminSetupSaveResults(gameId, categoryId) {

  const statusInput =
    document.getElementById(
      "resultStatus_" + categoryId
    );

  const winnerInput =
    document.getElementById(
      "resultWinner_" + categoryId
    );

  const favoriteInput =
    document.getElementById(
      "resultFavorite_" + categoryId
    );

  const selectedResultStatus =
    statusInput
      ? statusInput.value.trim().toLowerCase()
      : "pending";

  const winnerNomineeId =
    selectedResultStatus === "winner" && winnerInput
      ? winnerInput.value.trim()
      : "";

  if (
    selectedResultStatus === "winner" &&
    !winnerNomineeId
  ) {
    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      "Select the winning nominee before saving a final result.",
      true
    );
    return;
  }

  const settlementStatus =
    selectedResultStatus === "winner"
      ? "settled"
      : selectedResultStatus;

  const favoriteNomineeId =
    favoriteInput
      ? favoriteInput.value.trim()
      : "";

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Saving results...",
    false
  );

  const res =
    await apiAdminUpdateCategory({
      gameId:
        gameId,
      categoryId:
        categoryId,
      winnerNomineeId:
        winnerNomineeId,
      favoriteNomineeId:
        favoriteNomineeId,
      settlementStatus:
        settlementStatus,
      locked:
        selectedResultStatus !== "pending"
          ? true
          : undefined,
      wagerResultType:
        selectedResultStatus === "push" ||
        selectedResultStatus === "cancelled"
          ? selectedResultStatus
          : "",
      notes:
        "Result saved from Manage Games panel: " +
        selectedResultStatus
    });

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save results.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results saved. Running scoring automation...",
    false
  );

  const scoringRes =
    await apiAdminRunScoringAutomation(
      gameId
    );

  if (!scoringRes || scoringRes.success === false) {

    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      scoringRes && (scoringRes.message || scoringRes.error)
        ? scoringRes.message || scoringRes.error
        : "Results saved, but scoring automation failed.",
      true
    );

    return;

  }

  if (selectedResultStatus !== "pending") {
    adminSetupApplyLockState_(
      categoryId,
      true
    );
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    selectedResultStatus !== "pending"
      ? "Results saved, scoring updated, and question locked."
      : "Results saved and scoring updated.",
    false
  );

}


async function adminSetupMoveQuestionOrder_(gameId, categoryId, direction, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const safeGameId = String(gameId || "").trim();
  const safeCategoryId = String(categoryId || "").trim().toLowerCase();
  const step = Number(direction || 0);

  if (!safeGameId || !safeCategoryId || !step) return;

  adminSetupSetMessage("adminSetupMessage", "Reordering question…", false);

  try {
    const setup = await apiAdminGetGameSetup(safeGameId);
    if (!setup || setup.success === false) {
      throw new Error((setup && (setup.error || setup.message)) || "Could not reload question order.");
    }

    const categories = Array.isArray(setup.categories) ? setup.categories : [];
    const index = categories.findIndex(function(item) {
      return String(item && item.categoryId || "").trim().toLowerCase() === safeCategoryId;
    });
    const targetIndex = index + step;

    if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) return;

    const current = categories[index];
    const target = categories[targetIndex];
    let currentOrder = Number(current && current.settings && current.settings.displayOrder);
    let targetOrder = Number(target && target.settings && target.settings.displayOrder);

    if (!Number.isFinite(currentOrder) || !Number.isFinite(targetOrder) || currentOrder === targetOrder) {
      currentOrder = (index + 1) * 10;
      targetOrder = (targetIndex + 1) * 10;
    }

    const first = await apiAdminUpdateCategory({
      gameId: safeGameId,
      categoryId: current.categoryId,
      displayOrder: targetOrder
    });
    if (!first || first.success === false) {
      throw new Error((first && (first.error || first.message)) || "Could not move the selected question.");
    }

    const second = await apiAdminUpdateCategory({
      gameId: safeGameId,
      categoryId: target.categoryId,
      displayOrder: currentOrder
    });
    if (!second || second.success === false) {
      throw new Error((second && (second.error || second.message)) || "Could not finish the question reorder.");
    }

    adminSetupRememberUiAction_({
      type: "reorder-question",
      gameId: safeGameId,
      categoryId: current.categoryId,
      openAnswers: false,
      message: "Question moved " + (step < 0 ? "up." : "down.")
    });
    navigate("admin-game-setup:" + safeGameId);
  } catch (err) {
    adminSetupSetMessage(
      "adminSetupMessage",
      err && err.message ? err.message : String(err),
      true
    );
  }
}

/* ======================
   CLEAR RESULTS / WINNERS
====================== */

async function adminSetupClearResults(gameId, categoryId) {

  const ok =
    confirm(
      "Clear winner and favorite for this category?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Clearing results...",
    false
  );

  const res =
    await apiAdminUpdateCategory({
      gameId:
        gameId,
      categoryId:
        categoryId,
      winnerNomineeId:
        "",
      favoriteNomineeId:
        "",
      settlementStatus:
        "pending",
      wagerResultType:
        "",
      notes:
        "Winner, favorite, and settlement status cleared from Manage Games panel"
    });

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not clear results.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results cleared. Running scoring automation...",
    false
  );

  const scoringRes =
    await apiAdminRunScoringAutomation(
      gameId
    );

  if (!scoringRes || scoringRes.success === false) {

    adminSetupSetMessage(
      "resultMessage_" + categoryId,
      scoringRes && (scoringRes.message || scoringRes.error)
        ? scoringRes.message || scoringRes.error
        : "Results cleared, but scoring automation failed.",
      true
    );

    return;

  }

  if (document.getElementById("resultWinner_" + categoryId)) {
    document.getElementById("resultWinner_" + categoryId).value = "";
  }

  if (document.getElementById("resultFavorite_" + categoryId)) {
    document.getElementById("resultFavorite_" + categoryId).value = "";
  }

  adminSetupSetMessage(
    "resultMessage_" + categoryId,
    "Results cleared and scoring updated.",
    false
  );

}

/* ======================
   FINALIZE / REOPEN RESULTS
====================== */

async function adminSetupFinalizeResults(gameId, finalized) {
  const ok = confirm(
    finalized
      ? "Mark results finalized for this game?"
      : "Reopen results for this game?"
  );

  if (!ok) {
    return;
  }

  const res = await apiAdminSetResultsFinalized(gameId, finalized);

  if (!res || res.success === false) {
    alert(
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not update results finalized state."
    );

    return;
  }

  await apiAdminRunScoringAutomation(gameId);

  navigate("admin-game-setup:" + gameId);
}


/* ======================
   SCORING AUTOMATION
====================== */

async function adminSetupScoringAutomationSetup(gameId) {

  adminSetupSetMessage(
    "adminSetupMessage",
    "Setting up scoring automation...",
    false
  );

  const res =
    await apiAdminSetupScoringAutomationSystem(
      gameId
    );

  adminSetupSetMessage(
    "adminSetupMessage",
    res && res.success
      ? "Scoring automation ready. ScoringRuns and LiveLeaderboardSnapshot are ready."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not setup scoring automation.",
    !(res && res.success)
  );

}

async function adminSetupRunScoringAutomation(gameId) {

  adminSetupSetMessage(
    "adminSetupMessage",
    "Running scoring automation...",
    false
  );

  const res =
    await apiAdminRunScoringAutomation(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "adminSetupMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not run scoring automation.",
      true
    );

    return;

  }

  const run =
    res.runs && res.runs.length
      ? res.runs[0]
      : null;

  adminSetupSetMessage(
    "adminSetupMessage",
    run
      ? `Scoring updated. Leader: ${run.leaderDisplayName || run.leaderUser || "None"} with ${run.leaderScore || 0} points.`
      : "Scoring automation completed.",
    false
  );

}

async function adminSetupStartAutoScoring() {

  const ok =
    confirm(
      "Start automatic scoring every 1 minute for active games?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "adminSetupMessage",
    "Starting automatic scoring...",
    false
  );

  const res =
    await apiAdminInstallScoringAutomationTrigger();

  adminSetupSetMessage(
    "adminSetupMessage",
    res && res.success
      ? "Automatic scoring started. It will run every 1 minute."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not start automatic scoring.",
    !(res && res.success)
  );

}

async function adminSetupStopAutoScoring() {

  const ok =
    confirm(
      "Stop automatic scoring?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "adminSetupMessage",
    "Stopping automatic scoring...",
    false
  );

  const res =
    await apiAdminUninstallScoringAutomationTrigger();

  adminSetupSetMessage(
    "adminSetupMessage",
    res && res.success
      ? "Automatic scoring stopped."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not stop automatic scoring.",
    !(res && res.success)
  );

}

/* ======================
   INTERNET RESULTS IMPORT
====================== */

function adminSetupGetInternetImportPayload(gameId) {

  const sourceIdInput =
    document.getElementById(
      "internetSourceId"
    );

  const sourceNameInput =
    document.getElementById(
      "internetSourceName"
    );

  const sourceTypeInput =
    document.getElementById(
      "internetSourceType"
    );

  const parserTypeInput =
    document.getElementById(
      "internetParserType"
    );

  const matchModeInput =
    document.getElementById(
      "internetMatchMode"
    );

  const trustLevelInput =
    document.getElementById(
      "internetTrustLevel"
    );

  const urlInput =
    document.getElementById(
      "internetSourceUrl"
    );

  const manualTextInput =
    document.getElementById(
      "internetManualText"
    );

  return {
    gameId:
      gameId,

    sourceId:
      sourceIdInput
        ? sourceIdInput.value.trim()
        : "manual-results",

    name:
      sourceNameInput
        ? sourceNameInput.value.trim()
        : "Manual Results",

    sourceType:
      sourceTypeInput
        ? sourceTypeInput.value
        : "manual",

    parserType:
      parserTypeInput
        ? parserTypeInput.value
        : "manual-text",

    matchMode:
      matchModeInput
        ? matchModeInput.value
        : "nominee-name",

    trustLevel:
      trustLevelInput
        ? trustLevelInput.value
        : "medium",

    url:
      urlInput
        ? urlInput.value.trim()
        : "",

    manualText:
      manualTextInput
        ? manualTextInput.value.trim()
        : "",

    notes:
      "Pulled from Manage Games internet import panel"
  };

}

function adminSetupShowInternetPreview(res) {

  const preview =
    document.getElementById(
      "internetImportPreview"
    );

  if (!preview) {
    return;
  }

  if (!res) {

    preview.innerText =
      "";

    return;

  }

  const text =
    res.rawTextPreview ||
    res.rawJsonPreview ||
    (
      res.import &&
      (
        res.import.rawTextPreview ||
        res.import.rawJsonPreview
      )
    ) ||
    "";

  preview.innerText =
    text ||
    "No preview available.";

}

async function adminSetupInternetResultsSetup(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Setting up internet import sheets...",
    false
  );

  const res =
    await apiAdminSetupInternetResultsSystem(
      gameId
    );

  adminSetupSetMessage(
    "internetImportMessage",
    res && res.success
      ? "Internet import system ready. InternetSources and InternetImports are ready."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Could not setup internet imports.",
    !(res && res.success)
  );

}

async function adminSetupPullInternetResults(gameId) {

  const payload =
    adminSetupGetInternetImportPayload(
      gameId
    );

  if (
    payload.sourceType !== "manual" &&
    !payload.url
  ) {

    adminSetupSetMessage(
      "internetImportMessage",
      "URL is required unless Source Type is Manual Text.",
      true
    );

    return;

  }

  if (
    payload.sourceType === "manual" &&
    !payload.manualText
  ) {

    adminSetupSetMessage(
      "internetImportMessage",
      "Manual Results Text is required for manual imports.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Pulling internet results...",
    false
  );

  adminSetupShowInternetPreview(null);

  const res =
    await apiAdminPullInternetResults(
      payload
    );

  adminSetupSetMessage(
    "internetImportMessage",
    res && res.success
      ? "Import saved to InternetImports."
      : res && (res.message || res.error)
        ? res.message || res.error
        : "Internet import failed.",
    !(res && res.success)
  );

  adminSetupShowInternetPreview(
    res
  );

}

async function adminSetupViewLastInternetImport(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Loading last import...",
    false
  );

  const res =
    await apiAdminGetLastInternetImport(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not load last import.",
      true
    );

    return;

  }

  if (!res.import) {

    adminSetupSetMessage(
      "internetImportMessage",
      "No internet imports found for this game yet.",
      false
    );

    adminSetupShowInternetPreview(null);

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Last import loaded: " +
      (res.import.sourceName || res.import.sourceId || ""),
    false
  );

  adminSetupShowInternetPreview(
    res
  );

}

/* ======================
   RESULT SUGGESTIONS
====================== */

function adminSetupRenderResultSuggestions(
  gameId,
  suggestions
) {

  const panel =
    document.getElementById(
      "resultSuggestionsPanel"
    );

  if (!panel) {
    return;
  }

  suggestions =
    Array.isArray(suggestions)
      ? suggestions
      : [];

  if (!suggestions.length) {

    panel.innerHTML =
      `
        <div class="admin-sub">
          No result suggestions found.
        </div>
      `;

    return;

  }

  panel.innerHTML =
    `
      <div class="admin-suggestions-list">

        <h3>
          Result Suggestions
        </h3>

        ${suggestions
          .map(item => {

            const status =
              String(item.status || "pending");

            const canAct =
              status.toLowerCase() === "pending";

            return `
              <div class="admin-suggestion-card">

                <div>
                  <strong>
                    ${adminSetupEscapeHtml(item.categoryName || item.categoryId)}
                  </strong>

                  <div class="admin-sub">
                    Suggested Winner:
                    ${adminSetupEscapeHtml(item.suggestedNomineeName || item.suggestedNomineeId)}
                  </div>

                  <div class="admin-sub">
                    Confidence:
                    ${Number(item.confidence) || 0}%
                    · Status:
                    ${adminSetupEscapeHtml(status)}
                  </div>

                  <div class="admin-sub">
                    Matched:
                    ${adminSetupEscapeHtml(item.matchedText || "")}
                  </div>
                </div>

                ${
                  canAct
                    ? `
                      <div class="admin-card-actions">

                        <button
                          class="admin-small-button"
                          onclick="adminSetupApplyResultSuggestion('${adminSetupEscapeHtml(
                            gameId
                          )}', '${adminSetupEscapeHtml(
                            item.suggestionId
                          )}')"
                        >
                          Apply
                        </button>

                        <button
                          class="admin-danger-button"
                          onclick="adminSetupRejectResultSuggestion('${adminSetupEscapeHtml(
                            gameId
                          )}', '${adminSetupEscapeHtml(
                            item.suggestionId
                          )}')"
                        >
                          Reject
                        </button>

                      </div>
                    `
                    : ""
                }

              </div>
            `;

          })
          .join("")}

      </div>
    `;

}

async function adminSetupGenerateResultSuggestions(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Generating result suggestions...",
    false
  );

  const res =
    await apiAdminGenerateResultSuggestions(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not generate suggestions.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Generated " +
      (res.count || 0) +
      " suggestion(s).",
    false
  );

  adminSetupRenderResultSuggestions(
    gameId,
    res.suggestions || []
  );

}

async function adminSetupViewResultSuggestions(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Loading result suggestions...",
    false
  );

  const res =
    await apiAdminGetResultSuggestions(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not load suggestions.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Suggestions loaded.",
    false
  );

  adminSetupRenderResultSuggestions(
    gameId,
    res.suggestions || []
  );

}

async function adminSetupApplyResultSuggestion(
  gameId,
  suggestionId
) {

  const ok =
    confirm(
      "Apply this suggestion as the official winner?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Applying suggestion...",
    false
  );

  const res =
    await apiAdminApplyResultSuggestion(
      gameId,
      suggestionId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not apply suggestion.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Suggestion applied and scoring updated.",
    false
  );

  await adminSetupViewResultSuggestions(
    gameId
  );

}

async function adminSetupRejectResultSuggestion(
  gameId,
  suggestionId
) {

  const ok =
    confirm(
      "Reject this suggestion?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Rejecting suggestion...",
    false
  );

  const res =
    await apiAdminRejectResultSuggestion(
      gameId,
      suggestionId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not reject suggestion.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Suggestion rejected.",
    false
  );

  await adminSetupViewResultSuggestions(
    gameId
  );

}

async function adminSetupApplyHighConfidenceSuggestions(gameId) {

  const input =
    document.getElementById(
      "internetSuggestionMinConfidence"
    );

  const minConfidence =
    input
      ? Number(input.value || 90)
      : 90;

  const ok =
    confirm(
      "Apply all pending suggestions from the latest import with confidence " +
      minConfidence +
      "% or higher?"
    );

  if (!ok) {
    return;
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Applying high-confidence suggestions...",
    false
  );

  const res =
    await apiAdminApplyHighConfidenceSuggestions(
      gameId,
      minConfidence
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not apply high-confidence suggestions.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Applied " +
      (res.appliedCount || 0) +
      " suggestion(s). Failed: " +
      (res.failedCount || 0) +
      ". Scoring updated.",
    false
  );

  await adminSetupViewResultSuggestions(
    gameId
  );

}

/* ======================
   SAVED INTERNET SOURCES
====================== */

function adminSetupFillInternetSourceForm(source) {

  source =
    source || {};

  const sourceIdInput =
    document.getElementById(
      "internetSourceId"
    );

  const sourceNameInput =
    document.getElementById(
      "internetSourceName"
    );

  const sourceTypeInput =
    document.getElementById(
      "internetSourceType"
    );

  const parserTypeInput =
    document.getElementById(
      "internetParserType"
    );

  const matchModeInput =
    document.getElementById(
      "internetMatchMode"
    );

  const trustLevelInput =
    document.getElementById(
      "internetTrustLevel"
    );

  const urlInput =
    document.getElementById(
      "internetSourceUrl"
    );

  if (sourceIdInput) {
    sourceIdInput.value =
      source.sourceId || "";
  }

  if (sourceNameInput) {
    sourceNameInput.value =
      source.name || "";
  }

  if (sourceTypeInput) {
    sourceTypeInput.value =
      source.sourceType || "webpage";
  }

  if (parserTypeInput) {
    parserTypeInput.value =
      source.parserType || "webpage-text";
  }

  if (matchModeInput) {
    matchModeInput.value =
      source.matchMode || "nominee-name";
  }

  if (trustLevelInput) {
    trustLevelInput.value =
      source.trustLevel || "medium";
  }

  if (urlInput) {
    urlInput.value =
      source.url || "";
  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Loaded source: " +
      (source.name || source.sourceId || ""),
    false
  );

}

function adminSetupRenderInternetSources(
  gameId,
  sources
) {

  const panel =
    document.getElementById(
      "internetSourcesPanel"
    );

  if (!panel) {
    return;
  }

  sources =
    Array.isArray(sources)
      ? sources
      : [];

  if (!sources.length) {

    panel.innerHTML =
      `
        <div class="admin-sub">
          No saved internet sources found for this game yet.
        </div>
      `;

    return;

  }

  panel.innerHTML =
    `
      <div class="admin-sources-list">

        <h3>
          Saved Internet Sources
        </h3>

        ${sources
          .map(source => `
            <div class="admin-source-card">

              <div>
                <strong>
                  ${adminSetupEscapeHtml(source.name || source.sourceId)}
                </strong>

                <div class="admin-sub">
                  ${adminSetupEscapeHtml(source.sourceType || "")}
                  ·
                  ${adminSetupEscapeHtml(source.parserType || "")}
                  ·
                  ${adminSetupEscapeHtml(source.trustLevel || "")}
                </div>

                <div class="admin-sub">
                  ${adminSetupEscapeHtml(source.url || "Manual source")}
                </div>

                <div class="admin-sub">
                  Last Status:
                  ${adminSetupEscapeHtml(source.lastStatus || "Never pulled")}
                </div>
              </div>

              <div class="admin-card-actions">

                <button
                  class="admin-small-button secondary"
                  onclick='adminSetupFillInternetSourceForm(${JSON.stringify(source)})'
                >
                  Load
                </button>

                <button
                  class="admin-small-button"
                  onclick='adminSetupFillInternetSourceForm(${JSON.stringify(source)}); adminSetupPullInternetResults("${adminSetupEscapeHtml(gameId)}");'
                >
                  Pull
                </button>

              </div>

            </div>
          `)
          .join("")}

      </div>
    `;

}

async function adminSetupLoadInternetSources(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Loading saved internet sources...",
    false
  );

  const res =
    await apiAdminGetInternetSources(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not load saved sources.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Loaded " +
      (res.sources ? res.sources.length : 0) +
      " saved source(s).",
    false
  );

  adminSetupRenderInternetSources(
    gameId,
    res.sources || []
  );

}

async function adminSetupSaveInternetSource(gameId) {

  const payload =
    adminSetupGetInternetImportPayload(
      gameId
    );

  adminSetupSetMessage(
    "internetImportMessage",
    "Saving internet source...",
    false
  );

  const res =
    await apiAdminSaveInternetSource(
      payload
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not save internet source.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Internet source saved.",
    false
  );

  await adminSetupLoadInternetSources(
    gameId
  );

}

/* ======================
   SPORTS SCOREBOARD PARSER
====================== */

function adminSetupRenderSportsScoreboard(res) {

  const panel =
    document.getElementById(
      "sportsScoreboardPanel"
    );

  if (!panel) {
    return;
  }

  if (!res) {

    panel.innerHTML =
      "";

    return;

  }

  const games =
    Array.isArray(res.games)
      ? res.games
      : [];

  const suggestions =
    Array.isArray(res.suggestions)
      ? res.suggestions
      : [];

  panel.innerHTML =
    `
      <div class="admin-sources-list">

        <h3>
          Sports Scoreboard Parse
        </h3>

        <div class="admin-sub">
          Parsed Games:
          ${Number(res.parsedGameCount) || 0}
          · Final Games:
          ${Number(res.finalGameCount) || 0}
          · Suggestions:
          ${Number(res.suggestionCount) || 0}
        </div>

        ${
          games.length
            ? games
                .map(game => `
                  <div class="admin-source-card">

                    <div>
                      <strong>
                        ${adminSetupEscapeHtml(game.awayName)}
                        ${adminSetupEscapeHtml(game.awayScore)}
                        @
                        ${adminSetupEscapeHtml(game.homeName)}
                        ${adminSetupEscapeHtml(game.homeScore)}
                      </strong>

                      <div class="admin-sub">
                        Winner:
                        ${adminSetupEscapeHtml(game.winnerName || "")}
                      </div>

                      <div class="admin-sub">
                        Status:
                        ${adminSetupEscapeHtml(game.status || "Final")}
                      </div>

                    </div>

                  </div>
                `)
                .join("")
            : `
              <div class="admin-sub">
                No final scoreboard games found.
              </div>
            `
        }

        ${
          suggestions.length
            ? `
              <div class="admin-sub">
                Sports suggestions were added to ResultSuggestions.
                Use View Suggestions or Apply High Confidence next.
              </div>
            `
            : ""
        }

      </div>
    `;

}

async function adminSetupParseSportsScoreboard(gameId) {

  adminSetupSetMessage(
    "internetImportMessage",
    "Parsing sports scoreboard...",
    false
  );

  adminSetupRenderSportsScoreboard(null);

  const res =
    await apiAdminParseSportsScoreboard(
      gameId
    );

  if (!res || res.success === false) {

    adminSetupSetMessage(
      "internetImportMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Could not parse sports scoreboard.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "internetImportMessage",
    "Sports scoreboard parsed. Final games: " +
      (res.finalGameCount || 0) +
      ". Suggestions: " +
      (res.suggestionCount || 0) +
      ".",
    false
  );

  adminSetupRenderSportsScoreboard(
    res
  );

  if (
    res.suggestions &&
    res.suggestions.length
  ) {

    adminSetupRenderResultSuggestions(
      gameId,
      res.suggestions
    );

  }

}