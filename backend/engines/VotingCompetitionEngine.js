/* =====================================================
   VOTING / COMPETITION ENGINE v1.2.18z

   Standalone community competitions with participant self-entry.
   This engine is intentionally separate from:
   - RankingGameEngine (prediction rankings scored against an official order)
   - VotingEngine / Votes (legacy movie/awards community ballots)

   Data is stored in dedicated sheets so legacy voting remains untouched.
===================================================== */

const VOTING_COMPETITION_SETTINGS_SHEET = "VotingCompetitionSettings";
const VOTING_COMPETITION_PARTICIPANTS_SHEET = "VotingParticipants";
const VOTING_COMPETITION_BALLOTS_SHEET = "VotingCompetitionBallots";
const VOTING_COMPETITION_EVALUATIONS_SHEET = "VotingCompetitionEvaluations";
const VOTING_COMPETITION_DRAFTS_SHEET = "VotingCompetitionDrafts";
const VOTING_COMPETITION_DRAFT_HEADERS = ["Timestamp","UpdatedAt","GameId","Username","CategoryId","RankingsJSON","Finalized"];

const VOTING_COMPETITION_SETTINGS_HEADERS = [
  "GameId",
  "EntryLabel",
  "RegistrationEnabled",
  "ApprovalRequired",
  "AllowParticipantEdits",
  "RegistrationLocked",
  "VotingLocked",
  "VotingMethod",
  "RankingUi",
  "RankLimit",
  "ScoringMode",
  "PointValuesJSON",
  "ResultsVisibility",
  "ShowParticipantNames",
  "ShowPhoto",
  "ShowDescription",
  "ShowIngredients",
  "NumberAssignment",
  "ColorAssignment",
  "Instructions",
  "CustomFieldsJSON",
  "EvaluatedOnly",
  "MinimumEvaluatedEntries",
  "JudgingMode",
  "CriteriaJSON",
  "CombinedRankWeight",
  "CombinedCriteriaWeight",
  "BallotWeighting",
  "VotingDeadline",
  "UpdatedAt",
  "EntryIdentifierMode",
  "EntryColorPaletteJSON",
  "AllowMultipleEntries",
  "MaxEntriesPerParticipant",
  "EntryCategoriesJSON",
  "EntryRules",
  "HostEntryInfo",
  "PickupInstructions",
  "RegistrationDeadline",
  "OfficialJudgesJSON",
  "JudgeMultiplier",
  "AutoFinalizeDrafts",
  "AllowPartialAutoFinalize",
  "ContestantSelfRank",
  "EntryDivisionsJSON",
  "ShowVotingCountdown"
];

const VOTING_COMPETITION_PARTICIPANT_HEADERS = [
  "Timestamp",
  "UpdatedAt",
  "GameId",
  "Username",
  "EntryId",
  "ParticipantName",
  "EntryName",
  "ImageUrl",
  "ImageFileId",
  "DisplayNumber",
  "DisplayColor",
  "Description",
  "Ingredients",
  "CustomDataJSON",
  "Status",
  "Published",
  "AdminNotes"
];

const VOTING_COMPETITION_BALLOT_HEADERS = [
  "Timestamp",
  "UpdatedAt",
  "GameId",
  "Username",
  "EntryId",
  "Rank",
  "Points",
  "RawRankPoints",
  "CriteriaScore",
  "CoverageWeight",
  "FinalScore",
  "CriteriaJSON",
  "Locked",
  "CategoryId",
  "VoterRole",
  "VoterMultiplier"
];

const VOTING_COMPETITION_EVALUATION_HEADERS = [
  "UpdatedAt",
  "GameId",
  "Username",
  "EntryId",
  "Evaluated",
  "CriteriaJSON"
];

const VOTING_COMPETITION_COLOR_PALETTE = [
  "Red", "Blue", "Green", "Orange", "Yellow", "Purple",
  "Pink", "Teal", "Black", "White", "Silver", "Gold"
];

function votingCompetitionString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function votingCompetitionKey_(value) {
  return votingCompetitionString_(value).toLowerCase();
}

function votingCompetitionBool_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback === true;
  return value === true || ["true", "yes", "1", "on"].indexOf(votingCompetitionKey_(value)) !== -1;
}

function votingCompetitionNumber_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
}

function votingCompetitionJson_(value, fallback) {
  if (value && typeof value === "object") return value;
  const text = votingCompetitionString_(value);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

function votingCompetitionSlug_(value) {
  return votingCompetitionString_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function votingCompetitionHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    const key = votingCompetitionKey_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function votingCompetitionEnsureSheet_(name, requiredHeaders) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    const lock = LockService.getScriptLock();
    let locked = false;
    try {
      lock.waitLock(10000);
      locked = true;
      sh = ss.getSheetByName(name);
      if (!sh) {
        try {
          sh = ss.insertSheet(name);
        } catch (err) {
          sh = ss.getSheetByName(name);
          if (!sh) throw err;
        }
      }
    } finally {
      if (locked) lock.releaseLock();
    }
  }

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  let headers = sh.getLastRow() >= 1
    ? sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(votingCompetitionString_)
    : [];

  if (!headers.some(Boolean)) {
    sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    headers = requiredHeaders.slice();
  }

  const lower = headers.map(votingCompetitionKey_);
  const missing = requiredHeaders.filter(function(header) {
    return lower.indexOf(votingCompetitionKey_(header)) === -1;
  });
  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
  sh.setFrozenRows(1);
  return sh;
}

function votingCompetitionDefaultCustomFields_() {
  return [];
}

function votingCompetitionDefaultSettings_(gameId) {
  return {
    gameId: votingCompetitionString_(gameId),
    entryLabel: "Entry",
    registrationEnabled: true,
    approvalRequired: true,
    allowParticipantEdits: true,
    registrationLocked: false,
    votingLocked: false,
    votingMethod: "top-n",
    rankingUi: "auto",
    rankLimit: 5,
    scoringMode: "custom-points",
    pointValues: [10, 7, 5, 3, 1],
    resultsVisibility: "after-close",
    showParticipantNames: false,
    showPhoto: true,
    showDescription: true,
    showIngredients: true,
    numberAssignment: "auto-sequential",
    colorAssignment: "auto-palette",
    instructions: "Choose your favorites and put them in order.",
    customFields: votingCompetitionDefaultCustomFields_(),
    evaluatedOnly: false,
    minimumEvaluatedEntries: 0,
    judgingMode: "rank",
    criteria: [],
    combinedRankWeight: 0.5,
    combinedCriteriaWeight: 0.5,
    ballotWeighting: "equal",
    votingDeadline: "",
    entryIdentifierMode: "legacy",
    entryColorPalette: VOTING_COMPETITION_COLOR_PALETTE.slice(),
    allowMultipleEntries: false,
    maxEntriesPerParticipant: 1,
    entryCategories: [],
    entryDivisions: [],
    entryRules: "",
    hostEntryInfo: "",
    pickupInstructions: "",
    registrationDeadline: "",
    officialJudges: [],
    judgeMultiplier: 3,
    autoFinalizeDrafts: false,
    allowPartialAutoFinalize: false,
    contestantSelfRank: false,
    showVotingCountdown: false
  };
}

function votingCompetitionNormalizeVotingMethod_(value) {
  const method = votingCompetitionKey_(value).replace(/_/g, "-");
  if (["rank-all", "top-n", "favorite"].indexOf(method) !== -1) return method;
  return "top-n";
}

function votingCompetitionNormalizeRankingUi_(value) {
  const ui = votingCompetitionKey_(value).replace(/_/g, "-");
  if (["auto", "numbered", "drag", "arrows"].indexOf(ui) !== -1) return ui;
  return "auto";
}

function votingCompetitionNormalizeResultsVisibility_(value) {
  const mode = votingCompetitionKey_(value).replace(/_/g, "-");
  if (["hidden", "after-close", "live"].indexOf(mode) !== -1) return mode;
  return "after-close";
}

function votingCompetitionNormalizeScoringMode_(value) {
  const mode = votingCompetitionKey_(value).replace(/_/g, "-");
  return mode === "borda" ? "borda" : "custom-points";
}

function votingCompetitionNormalizeJudgingMode_(value) {
  const mode = votingCompetitionKey_(value).replace(/_/g, "-");
  return ["rank", "criteria", "combined"].indexOf(mode) !== -1 ? mode : "rank";
}

function votingCompetitionNormalizeBallotWeighting_(value) {
  const mode = votingCompetitionKey_(value).replace(/_/g, "-");
  return mode === "coverage" ? "coverage" : "equal";
}

function votingCompetitionNormalizeCriteria_(value, strict) {
  const rows = Array.isArray(value) ? value : votingCompetitionJson_(value, []);
  const seen = {};
  const out = [];
  (rows || []).slice(0, 20).forEach(function(criterion, index) {
    criterion = criterion || {};
    const label = votingCompetitionString_(criterion.label || criterion.name);
    const id = votingCompetitionSlug_(criterion.id || label || ("criterion-" + (index + 1)));
    const minScore = Number(criterion.minScore);
    const maxScore = Number(criterion.maxScore);
    const weight = Number(criterion.weight);
    const invalid = !id || !label || seen[id] || !Number.isFinite(minScore) || !Number.isFinite(maxScore) || maxScore <= minScore || !Number.isFinite(weight) || weight < 0;
    if (invalid) {
      if (strict) throw new Error("Each judging criterion requires a unique id, label, numeric min/max with max greater than min, and a non-negative weight.");
      return;
    }
    seen[id] = true;
    out.push({ id: id, label: label, minScore: minScore, maxScore: maxScore, weight: weight });
  });
  if (out.length && out.reduce(function(sum, item) { return sum + item.weight; }, 0) <= 0) {
    if (strict) throw new Error("At least one judging criterion weight must be greater than zero.");
    out.forEach(function(item) { item.weight = 1; });
  }
  return out;
}

function votingCompetitionNormalizeCombinedWeights_(rankWeight, criteriaWeight, strict) {
  const rank = Number(rankWeight);
  const criteria = Number(criteriaWeight);
  if (!Number.isFinite(rank) || !Number.isFinite(criteria) || rank < 0 || criteria < 0 || rank + criteria <= 0) {
    if (strict) throw new Error("Combined rank and criteria weights must be non-negative numbers with a positive total.");
    return { rankWeight: 0.5, criteriaWeight: 0.5 };
  }
  const total = rank + criteria;
  return { rankWeight: rank / total, criteriaWeight: criteria / total };
}

function votingCompetitionValidateCriterionScores_(criteria, scores, requireComplete) {
  criteria = Array.isArray(criteria) ? criteria : [];
  scores = scores && typeof scores === "object" && !Array.isArray(scores) ? scores : {};
  const byId = {};
  criteria.forEach(function(criterion) { byId[criterion.id] = criterion; });
  Object.keys(scores).forEach(function(id) {
    if (!byId[id]) throw new Error("Unknown judging criterion: " + id);
  });
  const output = {};
  criteria.forEach(function(criterion) {
    const hasValue = Object.prototype.hasOwnProperty.call(scores, criterion.id) && scores[criterion.id] !== "" && scores[criterion.id] !== null && scores[criterion.id] !== undefined;
    if (!hasValue) {
      if (requireComplete) throw new Error("Score every judging criterion before submitting.");
      return;
    }
    const score = Number(scores[criterion.id]);
    if (!Number.isFinite(score) || score < criterion.minScore || score > criterion.maxScore) {
      throw new Error(criterion.label + " must be between " + criterion.minScore + " and " + criterion.maxScore + ".");
    }
    output[criterion.id] = score;
  });
  return output;
}

function votingCompetitionWeightedCriteriaScore_(criteria, scores) {
  criteria = Array.isArray(criteria) ? criteria : [];
  if (!criteria.length) throw new Error("No judging criteria are configured.");
  const validScores = votingCompetitionValidateCriterionScores_(criteria, scores, true);
  const totalWeight = criteria.reduce(function(sum, criterion) { return sum + Number(criterion.weight || 0); }, 0);
  if (!(totalWeight > 0)) throw new Error("Judging criterion weights must total more than zero.");
  const weighted = criteria.reduce(function(sum, criterion) {
    const normalizedScore = (validScores[criterion.id] - criterion.minScore) / (criterion.maxScore - criterion.minScore);
    return sum + normalizedScore * (criterion.weight / totalWeight);
  }, 0);
  return Math.round(weighted * 100000000) / 1000000;
}

function votingCompetitionCombinedScore_(rankPoints, maxRankPoints, criteriaScore, settings) {
  const weights = votingCompetitionNormalizeCombinedWeights_(settings.combinedRankWeight, settings.combinedCriteriaWeight, true);
  const maxRank = Number(maxRankPoints);
  const normalizedRankScore = maxRank > 0 ? Math.max(0, Number(rankPoints || 0)) / maxRank * 100 : 0;
  const combined = normalizedRankScore * weights.rankWeight + Number(criteriaScore || 0) * weights.criteriaWeight;
  return Math.round(combined * 1000000) / 1000000;
}

function votingCompetitionCoverageWeight_(evaluatedCount, totalEligiblePublishedEntries, mode) {
  if (votingCompetitionNormalizeBallotWeighting_(mode) !== "coverage") return 1;
  const total = Math.max(0, Number(totalEligiblePublishedEntries || 0));
  const evaluated = Math.max(0, Math.min(total, Number(evaluatedCount || 0)));
  if (!total) return 0;
  return Math.round(Math.sqrt(evaluated / total) * 1000000) / 1000000;
}

function votingCompetitionDeadlineTime_(settings) {
  const text = votingCompetitionString_(settings && settings.votingDeadline);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) ? time : null;
}

function votingCompetitionDeadlinePassed_(settings, nowMs) {
  const deadline = votingCompetitionDeadlineTime_(settings);
  if (deadline === null) return false;
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  return now >= deadline;
}

function votingCompetitionVotingOpen_(settings, game, nowMs) {
  if (settings && settings.entryIdentifierMode !== "legacy" && votingCompetitionRegistrationOpen_(settings,nowMs)) return false;
  if (settings && settings.votingLocked === true) return false;
  if (game && (game.votingLocked === true || game.lockAllPicks === true)) return false;
  return !votingCompetitionDeadlinePassed_(settings, nowMs);
}

function votingCompetitionAssertMinimumEvaluated_(settings, evaluatedCount) {
  const minimum = Math.max(0, Math.floor(votingCompetitionNumber_(settings && settings.minimumEvaluatedEntries, 0)));
  if (Number(evaluatedCount || 0) < minimum) throw new Error("Evaluate at least " + minimum + " entries before submitting your ballot.");
}

function votingCompetitionEvaluationMap_(rows) {
  const map = {};
  (rows || []).forEach(function(row) { map[row.entryId] = row; });
  return map;
}

function votingCompetitionEligibleEntries_(entries, evaluationMap, settings) {
  entries = Array.isArray(entries) ? entries : [];
  if (!(settings && settings.evaluatedOnly === true)) return entries.slice();
  evaluationMap = evaluationMap || {};
  return entries.filter(function(entry) { return evaluationMap[entry.entryId] && evaluationMap[entry.entryId].evaluated === true; });
}

function votingCompetitionScoringContract_(settings) {
  settings = settings || {};
  const weights = votingCompetitionNormalizeCombinedWeights_(settings.combinedRankWeight, settings.combinedCriteriaWeight, false);
  return {
    votingMethod: votingCompetitionNormalizeVotingMethod_(settings.votingMethod),
    rankLimit: Math.max(1, Math.floor(votingCompetitionNumber_(settings.rankLimit, 1))),
    scoringMode: votingCompetitionNormalizeScoringMode_(settings.scoringMode),
    pointValues: (Array.isArray(settings.pointValues) ? settings.pointValues : []).map(function(value) { return Math.max(0, votingCompetitionNumber_(value, 0)); }),
    evaluatedOnly: settings.evaluatedOnly === true,
    minimumEvaluatedEntries: Math.max(0, Math.floor(votingCompetitionNumber_(settings.minimumEvaluatedEntries, 0))),
    judgingMode: votingCompetitionNormalizeJudgingMode_(settings.judgingMode),
    criteria: votingCompetitionNormalizeCriteria_(settings.criteria, false),
    combinedRankWeight: weights.rankWeight,
    combinedCriteriaWeight: weights.criteriaWeight,
    ballotWeighting: votingCompetitionNormalizeBallotWeighting_(settings.ballotWeighting),
    contestantSelfRank: settings.contestantSelfRank === true
  };
}

function votingCompetitionScoringContractChanged_(before, after) {
  return JSON.stringify(votingCompetitionScoringContract_(before)) !== JSON.stringify(votingCompetitionScoringContract_(after));
}

function votingCompetitionNormalizeAssignment_(value, kind) {
  const mode = votingCompetitionKey_(value).replace(/_/g, "-");
  const allowed = kind === "number"
    ? ["auto-sequential", "participant", "admin"]
    : ["auto-palette", "participant", "admin", "none"];
  return allowed.indexOf(mode) !== -1 ? mode : allowed[0];
}

function votingCompetitionNormalizeCustomFields_(value) {
  const rows = Array.isArray(value) ? value : votingCompetitionJson_(value, []);
  const seen = {};
  return (rows || []).map(function(field, index) {
    field = field || {};
    const label = votingCompetitionString_(field.label || field.name || ("Custom Field " + (index + 1)));
    let id = votingCompetitionSlug_(field.id || label) || ("field-" + (index + 1));
    if (seen[id]) id += "-" + (index + 1);
    seen[id] = true;
    let type = votingCompetitionKey_(field.type || "short-text").replace(/_/g, "-");
    if (["short-text", "long-text", "number", "select", "checkbox", "yes-no"].indexOf(type) === -1) {
      type = "short-text";
    }
    const options = Array.isArray(field.options)
      ? field.options.map(votingCompetitionString_).filter(Boolean)
      : votingCompetitionString_(field.options).split(/\r?\n|,/).map(votingCompetitionString_).filter(Boolean);
    return {
      id: id,
      label: label,
      type: type,
      required: votingCompetitionBool_(field.required, false),
      voterVisible: votingCompetitionBool_(field.voterVisible, true),
      options: options
    };
  }).filter(function(field) { return !!field.label; }).slice(0, 30);
}


/* R9 competition settings remain optional to preserve existing Voting games. */
function votingCompetitionIdentifierMode_(value) {
  const mode = votingCompetitionKey_(value);
  return ["legacy","color","number","combo"].indexOf(mode) >= 0 ? mode : "legacy";
}
function votingCompetitionColorPalette_(value) {
  const rows = Array.isArray(value) ? value : votingCompetitionJson_(value, VOTING_COMPETITION_COLOR_PALETTE);
  const seen = {};
  return rows.map(votingCompetitionString_).filter(function(color) {
    const key = color.toLowerCase();
    if (!color || seen[key] || !( /^#[0-9a-f]{6}$/i.test(color) || VOTING_COMPETITION_COLOR_PALETTE.some(function(c){return c.toLowerCase()===key;}) )) return false;
    seen[key] = true; return true;
  });
}
function votingCompetitionOfficialJudges_(value) {
  const rows = Array.isArray(value) ? value : votingCompetitionJson_(value, []);
  return Array.from(new Set(rows.map(votingCompetitionKey_).filter(Boolean))).slice(0,200);
}
function votingCompetitionJudgeRole_(settings, username, categoryId) {
  const judge = (settings.officialJudges || []).indexOf(votingCompetitionKey_(username)) !== -1;
  const category = (settings.entryCategories || []).find(function(c){return c.id === categoryId;});
  const audience = category && category.audience || 'both';
  if (audience === 'judges' && !judge) throw new Error("This category is reserved for appointed judges.");
  return {
    role:judge && audience !== 'public' ? 'judge' : 'public',
    multiplier:judge && audience !== 'public' ? Math.max(1,Number(settings.judgeMultiplier || 1)) : 1
  };
}
function votingCompetitionEntryDivisions_(value) {
  const labels = Array.isArray(value) ? value : votingCompetitionJson_(value, []);
  const seen = new Set();
  return labels.map(function(label) {
    label = votingCompetitionString_(label).slice(0,80);
    return {id:votingCompetitionSlug_(label),label:label};
  }).filter(function(division) {
    if (!division.id || seen.has(division.id)) return false;
    seen.add(division.id);
    return true;
  }).slice(0,30).map(function(division) { return division.label; });
}

function votingCompetitionEntryCategories_(value) {
  const rows = Array.isArray(value) ? value : votingCompetitionJson_(value, []);
  const seen = {};
  return rows.map(function(row) {
    if (typeof row === "string") row = {label:row};
    row = row || {};
    const label = votingCompetitionString_(row.label || row.name);
    const id = votingCompetitionSlug_(row.id || label);
    if (!id || !label || seen[id]) return null;
    seen[id] = true;
    const audience = ["public","judges","both"].indexOf(votingCompetitionKey_(row.audience)) >= 0 ? votingCompetitionKey_(row.audience) : "both";
    return {id:id,label:label.slice(0,100),description:votingCompetitionString_(row.description).slice(0,600),defaultSelected:row.defaultSelected !== false,audience:audience};
  }).filter(Boolean).slice(0,30);
}
function votingCompetitionRegistrationOpen_(settings, nowMs) {
  if (!settings || settings.registrationEnabled !== true || settings.registrationLocked === true) return false;
  const deadline = votingCompetitionString_(settings.registrationDeadline);
  if (!deadline) return true;
  const when = Date.parse(deadline);
  return Number.isFinite(when) && (nowMs === undefined ? Date.now() : nowMs) < when;
}
function votingCompetitionAssignIdentity_(settings, participants) {
  const mode = votingCompetitionIdentifierMode_(settings.entryIdentifierMode);
  if (mode === "legacy") return {
    displayNumber: settings.numberAssignment === "auto-sequential" ? votingCompetitionNextDisplayNumber_(participants) : "",
    displayColor: settings.colorAssignment === "auto-palette" ? votingCompetitionNextDisplayColor_(participants) : ""
  };
  const palette = votingCompetitionColorPalette_(settings.entryColorPalette);
  const used = {};
  (participants || []).forEach(function(p) {
    const number = votingCompetitionString_(p.displayNumber);
    const color = votingCompetitionKey_(p.displayColor);
    used[(mode === "color" ? color : mode === "number" ? number : color + "|" + number)] = true;
  });
  if (mode === "color") {
    const colors = palette.filter(function(c){return !used[c.toLowerCase()];});
    if (!colors.length) throw new Error("All Cookoff colors are assigned. Ask the host to add colors or switch to Color + Number.");
    return {displayColor:colors[Math.floor(Math.random()*colors.length)],displayNumber:""};
  }
  if (mode === "combo" && !palette.length) throw new Error("Admin must configure at least one entry color.");
  // Choose from the available pool under the same Apps Script lock used for the row write.
  const maxNumber = mode === "number" ? 9999 : 999;
  const choices = [];
  if (mode === "number") {
    for (let i=1;i<=maxNumber;i++) if (!used[String(i)]) choices.push({displayNumber:String(i),displayColor:""});
  } else {
    palette.forEach(function(color){for (let i=1;i<=maxNumber;i++) {
      if (!used[color.toLowerCase()+"|"+i]) choices.push({displayNumber:String(i),displayColor:color});
    }});
  }
  if (!choices.length) throw new Error("No unique Cookoff identifiers remain. Contact the host.");
  return choices[Math.floor(Math.random()*choices.length)];
}

function votingCompetitionGetSettings_(gameId) {
  gameId = votingCompetitionString_(gameId);
  const defaults = votingCompetitionDefaultSettings_(gameId);
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_SETTINGS_SHEET, VOTING_COMPETITION_SETTINGS_HEADERS);
  if (sh.getLastRow() <= 1) return defaults;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  const row = rows.find(function(item) { return votingCompetitionString_(item[col.gameid]) === gameId; });
  if (!row) return defaults;
  const weights = votingCompetitionNormalizeCombinedWeights_(row[col.combinedrankweight], row[col.combinedcriteriaweight], false);
  return {
    gameId: gameId,
    entryLabel: votingCompetitionString_(row[col.entrylabel]) || defaults.entryLabel,
    registrationEnabled: votingCompetitionBool_(row[col.registrationenabled], defaults.registrationEnabled),
    approvalRequired: votingCompetitionBool_(row[col.approvalrequired], defaults.approvalRequired),
    allowParticipantEdits: votingCompetitionBool_(row[col.allowparticipantedits], defaults.allowParticipantEdits),
    registrationLocked: votingCompetitionBool_(row[col.registrationlocked], defaults.registrationLocked),
    votingLocked: votingCompetitionBool_(row[col.votinglocked], defaults.votingLocked),
    votingMethod: votingCompetitionNormalizeVotingMethod_(row[col.votingmethod]),
    rankingUi: votingCompetitionNormalizeRankingUi_(row[col.rankingui]),
    rankLimit: Math.max(1, Math.floor(votingCompetitionNumber_(row[col.ranklimit], defaults.rankLimit))),
    scoringMode: votingCompetitionNormalizeScoringMode_(row[col.scoringmode]),
    pointValues: (function() { const parsed = votingCompetitionJson_(row[col.pointvaluesjson], defaults.pointValues); return Array.isArray(parsed) ? parsed.map(function(value) { return votingCompetitionNumber_(value, 0); }) : defaults.pointValues.slice(); })(),
    resultsVisibility: votingCompetitionNormalizeResultsVisibility_(row[col.resultsvisibility]),
    showParticipantNames: votingCompetitionBool_(row[col.showparticipantnames], defaults.showParticipantNames),
    showPhoto: votingCompetitionBool_(row[col.showphoto], defaults.showPhoto),
    showDescription: votingCompetitionBool_(row[col.showdescription], defaults.showDescription),
    showIngredients: votingCompetitionBool_(row[col.showingredients], defaults.showIngredients),
    numberAssignment: votingCompetitionNormalizeAssignment_(row[col.numberassignment], "number"),
    colorAssignment: votingCompetitionNormalizeAssignment_(row[col.colorassignment], "color"),
    instructions: votingCompetitionString_(row[col.instructions]) || defaults.instructions,
    customFields: votingCompetitionNormalizeCustomFields_(row[col.customfieldsjson]),
    evaluatedOnly: votingCompetitionBool_(row[col.evaluatedonly], defaults.evaluatedOnly),
    minimumEvaluatedEntries: Math.max(0, Math.floor(votingCompetitionNumber_(row[col.minimumevaluatedentries], defaults.minimumEvaluatedEntries))),
    judgingMode: votingCompetitionNormalizeJudgingMode_(row[col.judgingmode]),
    criteria: votingCompetitionNormalizeCriteria_(row[col.criteriajson], false),
    combinedRankWeight: weights.rankWeight,
    combinedCriteriaWeight: weights.criteriaWeight,
    ballotWeighting: votingCompetitionNormalizeBallotWeighting_(row[col.ballotweighting]),
    votingDeadline: votingCompetitionString_(row[col.votingdeadline]),
    entryIdentifierMode: votingCompetitionIdentifierMode_(row[col.entryidentifiermode]),
    entryColorPalette: votingCompetitionColorPalette_(row[col.entrycolorpalettejson]),
    allowMultipleEntries: votingCompetitionBool_(row[col.allowmultipleentries], false),
    maxEntriesPerParticipant: Math.max(0,Math.min(100,Math.floor(votingCompetitionNumber_(row[col.maxentriesperparticipant],1)))),
    entryCategories: votingCompetitionEntryCategories_(row[col.entrycategoriesjson]),
    entryDivisions: votingCompetitionEntryDivisions_(row[col.entrydivisionsjson]),
    entryRules: votingCompetitionString_(row[col.entryrules]),
    hostEntryInfo: votingCompetitionString_(row[col.hostentryinfo]),
    pickupInstructions: votingCompetitionString_(row[col.pickupinstructions]),
    registrationDeadline: votingCompetitionString_(row[col.registrationdeadline]),
    officialJudges: votingCompetitionOfficialJudges_(row[col.officialjudgesjson]),
    judgeMultiplier: Math.max(1,Math.min(100,votingCompetitionNumber_(row[col.judgemultiplier],3))),
    autoFinalizeDrafts: votingCompetitionBool_(row[col.autofinalizedrafts],false),
    allowPartialAutoFinalize: votingCompetitionBool_(row[col.allowpartialautofinalize],false),
    contestantSelfRank: votingCompetitionBool_(row[col.contestantselfrank],false),
    showVotingCountdown: votingCompetitionBool_(row[col.showvotingcountdown],false)
  };
}

function votingCompetitionSaveSettings_(gameId, payload) {
  gameId = votingCompetitionString_(gameId);
  payload = payload || {};
  if (!gameId) throw new Error("GameId is required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || votingCompetitionKey_(game.type) !== "voting") throw new Error("Voting / Competition settings can only be saved for a Voting game.");
  const minimumEvaluatedEntries = Math.floor(Number(payload.minimumEvaluatedEntries === "" || payload.minimumEvaluatedEntries === undefined ? 0 : payload.minimumEvaluatedEntries));
  if (!Number.isFinite(minimumEvaluatedEntries) || minimumEvaluatedEntries < 0) throw new Error("Minimum evaluated entries must be zero or greater.");
  const weights = votingCompetitionNormalizeCombinedWeights_(payload.combinedRankWeight === undefined ? 0.5 : payload.combinedRankWeight, payload.combinedCriteriaWeight === undefined ? 0.5 : payload.combinedCriteriaWeight, true);
  const deadline = votingCompetitionString_(payload.votingDeadline);
  if (deadline && !Number.isFinite(Date.parse(deadline))) throw new Error("Voting deadline must be a valid date/time.");
  const settings = {
    gameId: gameId,
    entryLabel: votingCompetitionString_(payload.entryLabel) || "Entry",
    registrationEnabled: votingCompetitionBool_(payload.registrationEnabled, true),
    approvalRequired: votingCompetitionBool_(payload.approvalRequired, true),
    allowParticipantEdits: votingCompetitionBool_(payload.allowParticipantEdits, true),
    registrationLocked: votingCompetitionBool_(payload.registrationLocked, false),
    votingLocked: votingCompetitionBool_(payload.votingLocked, false),
    votingMethod: votingCompetitionNormalizeVotingMethod_(payload.votingMethod),
    rankingUi: votingCompetitionNormalizeRankingUi_(payload.rankingUi),
    rankLimit: Math.max(1, Math.min(100, Math.floor(votingCompetitionNumber_(payload.rankLimit, 5)))),
    scoringMode: votingCompetitionNormalizeScoringMode_(payload.scoringMode),
    pointValues: (Array.isArray(payload.pointValues) ? payload.pointValues : votingCompetitionJson_(payload.pointValuesJSON, [10, 7, 5, 3, 1])).map(function(value) { return Math.max(0, votingCompetitionNumber_(value, 0)); }).slice(0, 100),
    resultsVisibility: votingCompetitionNormalizeResultsVisibility_(payload.resultsVisibility),
    showParticipantNames: votingCompetitionBool_(payload.showParticipantNames, false),
    showPhoto: votingCompetitionBool_(payload.showPhoto, true),
    showDescription: votingCompetitionBool_(payload.showDescription, true),
    showIngredients: votingCompetitionBool_(payload.showIngredients, true),
    numberAssignment: votingCompetitionNormalizeAssignment_(payload.numberAssignment, "number"),
    colorAssignment: votingCompetitionNormalizeAssignment_(payload.colorAssignment, "color"),
    instructions: votingCompetitionString_(payload.instructions),
    customFields: votingCompetitionNormalizeCustomFields_(payload.customFields || payload.customFieldsJSON),
    evaluatedOnly: votingCompetitionBool_(payload.evaluatedOnly, false),
    minimumEvaluatedEntries: minimumEvaluatedEntries,
    judgingMode: votingCompetitionNormalizeJudgingMode_(payload.judgingMode),
    criteria: votingCompetitionNormalizeCriteria_(payload.criteria || payload.criteriaJSON, true),
    combinedRankWeight: weights.rankWeight,
    combinedCriteriaWeight: weights.criteriaWeight,
    ballotWeighting: votingCompetitionNormalizeBallotWeighting_(payload.ballotWeighting),
    votingDeadline: deadline,
    entryIdentifierMode: votingCompetitionIdentifierMode_(payload.entryIdentifierMode),
    entryColorPalette: votingCompetitionColorPalette_(payload.entryColorPalette),
    allowMultipleEntries: votingCompetitionBool_(payload.allowMultipleEntries,false),
    maxEntriesPerParticipant: Math.max(0,Math.min(100,Math.floor(votingCompetitionNumber_(payload.maxEntriesPerParticipant,1)))),
    entryCategories: votingCompetitionEntryCategories_(payload.entryCategories),
    entryDivisions: votingCompetitionEntryDivisions_(payload.entryDivisions),
    entryRules: votingCompetitionString_(payload.entryRules),
    hostEntryInfo: votingCompetitionString_(payload.hostEntryInfo),
    pickupInstructions: votingCompetitionString_(payload.pickupInstructions),
    registrationDeadline: votingCompetitionString_(payload.registrationDeadline),
    officialJudges: votingCompetitionOfficialJudges_(payload.officialJudges),
    judgeMultiplier: Math.max(1,Math.min(100,votingCompetitionNumber_(payload.judgeMultiplier,3))),
    autoFinalizeDrafts: votingCompetitionBool_(payload.autoFinalizeDrafts,false),
    allowPartialAutoFinalize: votingCompetitionBool_(payload.allowPartialAutoFinalize,false),
    contestantSelfRank: votingCompetitionBool_(payload.contestantSelfRank,false),
    showVotingCountdown: votingCompetitionBool_(payload.showVotingCountdown,false)
  };
  if (settings.registrationDeadline && !Number.isFinite(Date.parse(settings.registrationDeadline))) throw new Error("Registration deadline must be a valid date/time.");
  if (settings.registrationDeadline && settings.votingDeadline && Date.parse(settings.registrationDeadline)>=Date.parse(settings.votingDeadline)) throw new Error("Registration must close before the voting deadline.");
  if ((settings.entryIdentifierMode === "color" || settings.entryIdentifierMode === "combo") && !settings.entryColorPalette.length) throw new Error("Select at least one Cookoff color.");
  if (!settings.pointValues.length) settings.pointValues = [10, 7, 5, 3, 1];
  if (settings.votingMethod === "favorite") settings.rankLimit = 1;
  if ((settings.judgingMode === "criteria" || settings.judgingMode === "combined") && !settings.criteria.length) throw new Error("Criteria or Combined judging requires at least one criterion.");
  const existingSettings = votingCompetitionGetSettings_(gameId);
  const existingBallots = votingCompetitionReadBallots_(gameId);
  if (existingBallots.length && votingCompetitionScoringContractChanged_(existingSettings, settings)) throw new Error("Voting scoring settings cannot change after the first ballot is saved. Ballot method/size, rank scoring, Cookoff criteria/weights, evaluated minimum, and ballot weighting are locked once voting begins.");
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_SETTINGS_SHEET, VOTING_COMPETITION_SETTINGS_HEADERS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) if (votingCompetitionString_(data[i][col.gameid]) === gameId) { rowNumber = i + 1; break; }
  const row = new Array(headers.length).fill("");
  row[col.gameid] = gameId; row[col.entrylabel] = settings.entryLabel; row[col.registrationenabled] = settings.registrationEnabled; row[col.approvalrequired] = settings.approvalRequired; row[col.allowparticipantedits] = settings.allowParticipantEdits; row[col.registrationlocked] = settings.registrationLocked; row[col.votinglocked] = settings.votingLocked; row[col.votingmethod] = settings.votingMethod; row[col.rankingui] = settings.rankingUi; row[col.ranklimit] = settings.rankLimit; row[col.scoringmode] = settings.scoringMode; row[col.pointvaluesjson] = JSON.stringify(settings.pointValues); row[col.resultsvisibility] = settings.resultsVisibility; row[col.showparticipantnames] = settings.showParticipantNames; row[col.showphoto] = settings.showPhoto; row[col.showdescription] = settings.showDescription; row[col.showingredients] = settings.showIngredients; row[col.numberassignment] = settings.numberAssignment; row[col.colorassignment] = settings.colorAssignment; row[col.instructions] = settings.instructions; row[col.customfieldsjson] = JSON.stringify(settings.customFields); row[col.evaluatedonly] = settings.evaluatedOnly; row[col.minimumevaluatedentries] = settings.minimumEvaluatedEntries; row[col.judgingmode] = settings.judgingMode; row[col.criteriajson] = JSON.stringify(settings.criteria); row[col.combinedrankweight] = settings.combinedRankWeight; row[col.combinedcriteriaweight] = settings.combinedCriteriaWeight; row[col.ballotweighting] = settings.ballotWeighting; row[col.votingdeadline] = settings.votingDeadline; row[col.updatedat] = new Date();
  row[col.entryidentifiermode] = settings.entryIdentifierMode; row[col.entrycolorpalettejson] = JSON.stringify(settings.entryColorPalette);
  row[col.allowmultipleentries] = settings.allowMultipleEntries; row[col.maxentriesperparticipant] = settings.maxEntriesPerParticipant;
  row[col.entrycategoriesjson] = JSON.stringify(settings.entryCategories); row[col.entryrules] = settings.entryRules;
  row[col.hostentryinfo] = settings.hostEntryInfo; row[col.pickupinstructions] = settings.pickupInstructions;
  row[col.registrationdeadline] = settings.registrationDeadline;
  row[col.officialjudgesjson] = JSON.stringify(settings.officialJudges); row[col.judgemultiplier] = settings.judgeMultiplier;
  row[col.autofinalizedrafts] = settings.autoFinalizeDrafts; row[col.allowpartialautofinalize] = settings.allowPartialAutoFinalize;
  row[col.entrydivisionsjson] = JSON.stringify(settings.entryDivisions);
  row[col.contestantselfrank] = settings.contestantSelfRank;
  row[col.showvotingcountdown] = settings.showVotingCountdown;
  if (rowNumber) sh.getRange(rowNumber, 1, 1, headers.length).setValues([row]); else sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  if (typeof clearGameCaches === "function") clearGameCaches(gameId);
  return { success: true, settings: settings };
}

function votingCompetitionReadParticipants_(gameId) {
  gameId = votingCompetitionString_(gameId);
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_PARTICIPANTS_SHEET, VOTING_COMPETITION_PARTICIPANT_HEADERS);
  if (sh.getLastRow() <= 1) return [];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  return sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().map(function(row, index) {
    return {
      rowNumber: index + 2,
      timestamp: row[col.timestamp],
      updatedAt: row[col.updatedat],
      gameId: votingCompetitionString_(row[col.gameid]),
      username: votingCompetitionString_(row[col.username]),
      entryId: votingCompetitionString_(row[col.entryid]),
      participantName: votingCompetitionString_(row[col.participantname]),
      entryName: votingCompetitionString_(row[col.entryname]),
      imageUrl: votingCompetitionString_(row[col.imageurl]),
      imageFileId: votingCompetitionString_(row[col.imagefileid]),
      displayNumber: votingCompetitionString_(row[col.displaynumber]),
      displayColor: votingCompetitionString_(row[col.displaycolor]),
      description: votingCompetitionString_(row[col.description]),
      ingredients: votingCompetitionString_(row[col.ingredients]),
      customData: votingCompetitionJson_(row[col.customdatajson], {}),
      status: votingCompetitionKey_(row[col.status]) || "submitted",
      published: votingCompetitionBool_(row[col.published], false),
      adminNotes: votingCompetitionString_(row[col.adminnotes])
    };
  }).filter(function(row) {
    return !gameId || row.gameId === gameId;
  });
}

function votingCompetitionNextDisplayNumber_(participants) {
  let max = 0;
  (participants || []).forEach(function(entry) {
    const n = parseInt(votingCompetitionString_(entry.displayNumber), 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  });
  return String(max + 1);
}

function votingCompetitionNextDisplayColor_(participants) {
  return VOTING_COMPETITION_COLOR_PALETTE[(participants || []).length % VOTING_COMPETITION_COLOR_PALETTE.length];
}

function votingCompetitionValidateCustomData_(settings, customData) {
  customData = customData && typeof customData === "object" ? customData : {};
  const output = {};
  (settings.customFields || []).forEach(function(field) {
    let value = customData[field.id];
    if (field.type === "checkbox" || field.type === "yes-no") {
      value = votingCompetitionBool_(value, false);
    } else if (field.type === "number") {
      const numericText = votingCompetitionString_(value);
      if (numericText === "") {
        value = "";
      } else {
        const numericValue = Number(numericText);
        if (!Number.isFinite(numericValue)) throw new Error(field.label + " must be a number.");
        value = numericValue;
      }
    } else {
      value = votingCompetitionString_(value);
    }
    if (field.type === "select" && value && field.options.indexOf(value) === -1) {
      throw new Error("Invalid choice for " + field.label + ".");
    }
    if (field.required && (value === "" || value === null || value === undefined || value === false)) {
      throw new Error(field.label + " is required.");
    }
    output[field.id] = value;
  });
  return output;
}

function votingCompetitionSaveParticipant_(payload) {
  payload = payload || {};
  const username = votingCompetitionString_(payload.username);
  const gameId = votingCompetitionString_(payload.gameId);
  if (!username || !gameId) throw new Error("Username and GameId are required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || votingCompetitionKey_(game.type) !== "voting") throw new Error("This is not a Voting / Competition game.");
  const settings = votingCompetitionGetSettings_(gameId);
  if (!votingCompetitionRegistrationOpen_(settings)) throw new Error("Participant registration is closed.");
  const entryName = votingCompetitionString_(payload.entryName);
  if (!entryName) throw new Error((settings.entryLabel || "Entry") + " name is required.");

  const submissionId = votingCompetitionString_(payload.submissionId).slice(0,100);
  const requestedId = votingCompetitionString_(payload.entryId);
  // Protect read-choose-write from simultaneous submissions by different players.
  // Never accept an identifier chosen in the browser for server-assigned modes.
  votingCompetitionEnsureSheet_(VOTING_COMPETITION_PARTICIPANTS_SHEET,VOTING_COMPETITION_PARTICIPANT_HEADERS);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error("Another entry is being registered. Please retry.");
  try {
    const participants = votingCompetitionReadParticipants_(gameId);
    const mine = participants.filter(function(entry) {
      return votingCompetitionKey_(entry.username) === votingCompetitionKey_(username);
    });
    let existing = null;
    if (requestedId) {
      existing = participants.find(function(entry) { return entry.entryId === requestedId; }) || null;
      if (!existing || votingCompetitionKey_(existing.username) !== votingCompetitionKey_(username)) {
        throw new Error("You do not own this competition entry.");
      }
    } else if (submissionId) {
      existing = mine.find(function(entry) {
        return votingCompetitionString_(entry.customData && entry.customData._cookoffSubmissionId) === submissionId;
      }) || null;
    }
    if (!existing && !settings.allowMultipleEntries) existing = mine[0] || null;
    if (existing && !settings.allowParticipantEdits && !(
      submissionId && votingCompetitionString_(existing.customData && existing.customData._cookoffSubmissionId) === submissionId
    )) throw new Error("This entry can no longer be edited.");
    if (!existing && mine.length && !settings.allowMultipleEntries) throw new Error("Only one dish is allowed per contestant.");
    const maxEntries = settings.allowMultipleEntries ? Number(settings.maxEntriesPerParticipant || 0) : 1;
    if (!existing && maxEntries > 0 && mine.length >= maxEntries) throw new Error("You reached the maximum number of dishes for this Cookoff.");

    const customData = votingCompetitionValidateCustomData_(settings, payload.customData || {});
    const categories = Array.isArray(settings.entryCategories) ? settings.entryCategories : [];
    if (categories.length) {
      const eligible = {};
      categories.forEach(function(category) { eligible[category.id] = true; });
      const requested = payload.customData && payload.customData.cookoffCategoryIds;
      const choices = Array.isArray(requested) ? requested.map(votingCompetitionString_) :
        categories.filter(function(category) { return category.defaultSelected !== false; }).map(function(category) { return category.id; });
      if (choices.some(function(id){return !eligible[id];})) throw new Error("Unknown Cookoff entry category.");
      customData.cookoffCategoryIds = Array.from(new Set(choices));
    }
    if ((settings.entryDivisions || []).length) {
      const requestedDivision = votingCompetitionString_(payload.customData && payload.customData.cookoffDivision);
      if (settings.entryDivisions.indexOf(requestedDivision) === -1) throw new Error("Choose a valid entry division.");
      customData.cookoffDivision = requestedDivision;
    }
    if (submissionId) customData._cookoffSubmissionId = submissionId;
    else if (existing && existing.customData && existing.customData._cookoffSubmissionId) {
      customData._cookoffSubmissionId = existing.customData._cookoffSubmissionId;
    }

    let displayNumber = existing ? existing.displayNumber : "";
    let displayColor = existing ? existing.displayColor : "";
    if (!existing) {
      if (settings.entryIdentifierMode !== "legacy") {
        const assigned = votingCompetitionAssignIdentity_(settings, participants);
        displayNumber = assigned.displayNumber;
        displayColor = assigned.displayColor;
      } else {
        if (settings.numberAssignment === "participant") displayNumber = votingCompetitionString_(payload.displayNumber);
        else if (settings.numberAssignment === "auto-sequential") displayNumber = votingCompetitionNextDisplayNumber_(participants);
        if (settings.colorAssignment === "participant") displayColor = votingCompetitionString_(payload.displayColor);
        else if (settings.colorAssignment === "auto-palette") displayColor = votingCompetitionNextDisplayColor_(participants);
      }
    } else if (settings.entryIdentifierMode === "legacy") {
      if (settings.numberAssignment === "participant") displayNumber = votingCompetitionString_(payload.displayNumber);
      if (settings.colorAssignment === "participant") displayColor = votingCompetitionString_(payload.displayColor);
    }
    const participantName = votingCompetitionString_(payload.participantName) || username;
    const status = settings.approvalRequired ? "submitted" : "approved";
    const published = !settings.approvalRequired;
    const entryId = existing && existing.entryId
      ? existing.entryId
      : ("entry-" + Utilities.getUuid().replace(/-/g, "").substring(0,16).toLowerCase());
    const now = new Date();
    const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_PARTICIPANTS_SHEET, VOTING_COMPETITION_PARTICIPANT_HEADERS);
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
    const col = votingCompetitionHeaderMap_(headers);
    const row = new Array(headers.length).fill("");
    row[col.timestamp] = existing && existing.timestamp ? existing.timestamp : now;
    row[col.updatedat] = now;
    row[col.gameid] = gameId;
    row[col.username] = username;
    row[col.entryid] = entryId;
    row[col.participantname] = participantName;
    row[col.entryname] = entryName;
    row[col.imageurl] = votingCompetitionString_(payload.imageUrl) || (existing ? existing.imageUrl : "");
    row[col.imagefileid] = votingCompetitionString_(payload.imageFileId) || (existing ? existing.imageFileId : "");
    row[col.displaynumber] = displayNumber;
    row[col.displaycolor] = displayColor;
    row[col.description] = votingCompetitionString_(payload.description);
    row[col.ingredients] = votingCompetitionString_(payload.ingredients);
    row[col.customdatajson] = JSON.stringify(customData);
    row[col.status] = status;
    row[col.published] = published;
    row[col.adminnotes] = existing ? existing.adminNotes : "";
    if (existing) sh.getRange(existing.rowNumber,1,1,headers.length).setValues([row]);
    else sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([row]);
    if (typeof clearGameCaches === "function") clearGameCaches(gameId);
    return {success:true,entryId:entryId,displayNumber:displayNumber,displayColor:displayColor,
      status:status,published:published,
      message:published ? "Entry saved and published." : "Entry submitted for admin approval."};
  } finally {
    lock.releaseLock();
  }
}

function votingCompetitionImageFolder_() {
  return typeof adminImageGetUploadFolder_ === "function"
    ? adminImageGetUploadFolder_()
    : DriveApp.createFolder("Awards App Voting Competition Images");
}

function votingCompetitionUploadParticipantImage_(payload) {
  payload = payload || {};
  const username = votingCompetitionString_(payload.username);
  const gameId = votingCompetitionString_(payload.gameId);
  const mimeType = votingCompetitionKey_(payload.mimeType);
  const base64 = votingCompetitionString_(payload.base64);
  if (!username || !gameId) throw new Error("Username and GameId are required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || votingCompetitionKey_(game.type) !== "voting") throw new Error("This is not a Voting / Competition game.");
  const settings = votingCompetitionGetSettings_(gameId);
  const admin = typeof isAdmin === "function" && isAdmin(username);
  if (payload.readCropSource === true) {
    const entry = votingCompetitionReadParticipants_(gameId).find(function(row) {
      return row.entryId === votingCompetitionString_(payload.entryId) &&
        (admin || votingCompetitionKey_(row.username) === votingCompetitionKey_(username));
    });
    if (!entry || !entry.imageFileId) throw new Error("Saved photo is unavailable.");
    const file = DriveApp.getFileById(entry.imageFileId);
    const folderId = votingCompetitionImageFolder_().getId();
    const parents = file.getParents();
    let inFolder = false;
    while (parents.hasNext()) if (parents.next().getId() === folderId) inFolder = true;
    if (!inFolder || file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK ||
        !file.getName().startsWith("competition-" + votingCompetitionSlug_(gameId) + "-")) {
      throw new Error("Choose the original photo to adjust this crop.");
    }
    const blob = file.getBlob();
    const type = blob.getContentType();
    const bytes = blob.getBytes();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type) || bytes.length > 4 * 1024 * 1024) throw new Error("Choose the original photo to adjust this crop.");
    return {success:true,mimeType:type,base64:Utilities.base64Encode(bytes)};
  }
  if (!(payload.adminPhoto === true && admin) && !votingCompetitionRegistrationOpen_(settings)) throw new Error("Participant registration is closed.");
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  if (!extensions[mimeType]) throw new Error("Photo must be JPG, PNG, WEBP, or GIF.");
  if (!base64) throw new Error("Photo data is missing.");
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 4 * 1024 * 1024) throw new Error("Photo must be 4 MB or smaller after preparation.");

  const folder = votingCompetitionImageFolder_();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const safeFile = ["competition", votingCompetitionSlug_(gameId), Utilities.getUuid(), stamp].join("-") + "." + extensions[mimeType];
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, safeFile));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (ignore) {}
  return {
    success: true,
    fileId: file.getId(),
    imageUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(file.getId()) + "&sz=w1200",
    viewUrl: "https://drive.google.com/file/d/" + file.getId() + "/view"
  };
}

function votingCompetitionAdminUpdateParticipant_(payload) {
  payload = payload || {};
  const gameId = votingCompetitionString_(payload.gameId);
  const entryId = votingCompetitionString_(payload.entryId);
  if (!gameId || !entryId) throw new Error("GameId and EntryId are required.");
  const participants = votingCompetitionReadParticipants_(gameId);
  const existing = participants.find(function(entry) { return entry.entryId === entryId; });
  if (!existing) throw new Error("Participant entry not found.");
  const settings = votingCompetitionGetSettings_(gameId);
  if (settings.entryIdentifierMode !== "legacy") {
    if (Object.prototype.hasOwnProperty.call(payload,"displayNumber") &&
      votingCompetitionString_(payload.displayNumber) !== existing.displayNumber) throw new Error("Assigned Cookoff number is locked.");
    if (Object.prototype.hasOwnProperty.call(payload,"displayColor") &&
      votingCompetitionString_(payload.displayColor) !== existing.displayColor) throw new Error("Assigned Cookoff color is locked.");
  }

  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_PARTICIPANTS_SHEET, VOTING_COMPETITION_PARTICIPANT_HEADERS);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  const row = sh.getRange(existing.rowNumber, 1, 1, headers.length).getValues()[0];
  const status = votingCompetitionKey_(payload.status || existing.status);
  if (["submitted", "approved", "rejected"].indexOf(status) === -1) throw new Error("Invalid participant status.");
  row[col.updatedat] = new Date();
  if (Object.prototype.hasOwnProperty.call(payload, "participantName")) row[col.participantname] = votingCompetitionString_(payload.participantName);
  if (Object.prototype.hasOwnProperty.call(payload, "entryName")) row[col.entryname] = votingCompetitionString_(payload.entryName);
  if (Object.prototype.hasOwnProperty.call(payload, "displayNumber")) row[col.displaynumber] = votingCompetitionString_(payload.displayNumber);
  if (Object.prototype.hasOwnProperty.call(payload, "displayColor")) row[col.displaycolor] = votingCompetitionString_(payload.displayColor);
  if (Object.prototype.hasOwnProperty.call(payload, "description")) row[col.description] = votingCompetitionString_(payload.description);
  if (Object.prototype.hasOwnProperty.call(payload, "ingredients")) row[col.ingredients] = votingCompetitionString_(payload.ingredients);
  if (Object.prototype.hasOwnProperty.call(payload, "adminNotes")) row[col.adminnotes] = votingCompetitionString_(payload.adminNotes);
  if (payload.imageFileId && payload.imageUrl) {
    row[col.imagefileid] = votingCompetitionString_(payload.imageFileId);
    row[col.imageurl] = votingCompetitionString_(payload.imageUrl);
  }
  row[col.status] = status;
  row[col.published] = Object.prototype.hasOwnProperty.call(payload, "published")
    ? votingCompetitionBool_(payload.published, false)
    : (status === "approved");
  sh.getRange(existing.rowNumber, 1, 1, headers.length).setValues([row]);
  if (typeof clearGameCaches === "function") clearGameCaches(gameId);
  return { success: true, entryId: entryId, status: status, published: votingCompetitionBool_(row[col.published], false) };
}

function votingCompetitionReadEvaluations_(gameId, username) {
  gameId = votingCompetitionString_(gameId);
  username = votingCompetitionKey_(username);
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_EVALUATIONS_SHEET, VOTING_COMPETITION_EVALUATION_HEADERS);
  if (sh.getLastRow() <= 1) return [];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  return sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().map(function(row, index) {
    return { rowNumber: index + 2, updatedAt: row[col.updatedat], gameId: votingCompetitionString_(row[col.gameid]), username: votingCompetitionString_(row[col.username]), entryId: votingCompetitionString_(row[col.entryid]), evaluated: votingCompetitionBool_(row[col.evaluated], false), criteriaScores: votingCompetitionJson_(row[col.criteriajson], {}) };
  }).filter(function(row) { return (!gameId || row.gameId === gameId) && (!username || votingCompetitionKey_(row.username) === username); });
}

function votingCompetitionSaveEvaluationStateUnlocked_(gameId, username, publishedEntries, settings, payload) {
  payload = payload || {};
  const hasEvaluatedList = Array.isArray(payload.evaluatedEntryIds);
  const evaluatedEntryIds = hasEvaluatedList ? payload.evaluatedEntryIds.map(votingCompetitionString_).filter(Boolean) : [];
  const evaluatedSet = {}; evaluatedEntryIds.forEach(function(id) { evaluatedSet[id] = true; });
  const criteriaByEntry = payload.criteriaScoresByEntry && typeof payload.criteriaScoresByEntry === "object" ? payload.criteriaScoresByEntry : {};
  const allowed = {}; (publishedEntries || []).forEach(function(entry) { allowed[entry.entryId] = entry; });
  evaluatedEntryIds.forEach(function(id) { if (!allowed[id]) throw new Error("Invalid competition entry in evaluated list."); });
  Object.keys(criteriaByEntry).forEach(function(id) { if (!allowed[id]) throw new Error("Invalid competition entry in criteria scores."); });
  const current = votingCompetitionEvaluationMap_(votingCompetitionReadEvaluations_(gameId, username));
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_EVALUATIONS_SHEET, VOTING_COMPETITION_EVALUATION_HEADERS);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers); const now = new Date();
  (publishedEntries || []).forEach(function(entry) {
    const existing = current[entry.entryId] || null;
    const criteriaProvided = Object.prototype.hasOwnProperty.call(criteriaByEntry, entry.entryId);
    if (!hasEvaluatedList && !criteriaProvided) return;
    const criteriaScores = criteriaProvided ? votingCompetitionValidateCriterionScores_(settings.criteria, criteriaByEntry[entry.entryId], false) : (existing ? existing.criteriaScores : {});
    const row = new Array(headers.length).fill("");
    row[col.updatedat] = now; row[col.gameid] = gameId; row[col.username] = username; row[col.entryid] = entry.entryId; row[col.evaluated] = hasEvaluatedList ? evaluatedSet[entry.entryId] === true : Boolean(existing && existing.evaluated); row[col.criteriajson] = JSON.stringify(criteriaScores || {});
    if (existing) sh.getRange(existing.rowNumber, 1, 1, headers.length).setValues([row]); else sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  });
  return votingCompetitionReadEvaluations_(gameId, username);
}


/* Partial rankings are separate from counted ballots. */
function votingCompetitionReadDrafts_(gameId, username) {
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_DRAFTS_SHEET,VOTING_COMPETITION_DRAFT_HEADERS);
  if (sh.getLastRow() <= 1) return [];
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  return sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues().map(function(row,index) {
    return {rowNumber:index+2,gameId:votingCompetitionString_(row[col.gameid]),
      username:votingCompetitionString_(row[col.username]),
      categoryId:votingCompetitionString_(row[col.categoryid]),
      rankings:votingCompetitionJson_(row[col.rankingsjson],[]),
      updatedAt:row[col.updatedat],
      finalized:votingCompetitionBool_(row[col.finalized],false)};
  }).filter(function(row) {
    return (!gameId || row.gameId===gameId) &&
      (!username || votingCompetitionKey_(row.username)===votingCompetitionKey_(username));
  });
}
function votingCompetitionSaveDraftUnlocked_(gameId, username, categoryId, rankings, finalized) {
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_DRAFTS_SHEET,VOTING_COMPETITION_DRAFT_HEADERS);
  const existing = votingCompetitionReadDrafts_(gameId,username).find(function(row){return row.categoryId===categoryId;});
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  const now = new Date();
  const row = new Array(headers.length).fill("");
  row[col.timestamp] = existing ? existing.updatedAt : now;
  row[col.updatedat] = now;
  row[col.gameid] = gameId;
  row[col.username] = username;
  row[col.categoryid] = categoryId;
  row[col.rankingsjson] = JSON.stringify(rankings);
  row[col.finalized] = finalized === true;
  const rowNumber = existing ? existing.rowNumber : sh.getLastRow()+1;
  sh.getRange(rowNumber,1,1,headers.length).setValues([row]);
}
function votingCompetitionValidateDraft_(rankings,entries,settings) {
  rankings = Array.isArray(rankings) ? rankings : [];
  const allowed = {};
  entries.forEach(function(e){allowed[e.entryId]=true;});
  const max = votingCompetitionBallotLimit_(settings,entries.length);
  if (rankings.length>max) throw new Error("Too many ranked dishes.");
  const seen = {};
  rankings.forEach(function(row,index) {
    const id = votingCompetitionString_(row && row.entryId);
    const rank = Number(row && row.rank);
    if (!allowed[id] || seen[id] || rank !== index+1) throw new Error("Invalid partial Cookoff ranking.");
    seen[id]=true;
  });
  return rankings;
}

function votingCompetitionReadBallots_(gameId) {
  gameId = votingCompetitionString_(gameId);
  const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_BALLOTS_SHEET, VOTING_COMPETITION_BALLOT_HEADERS);
  if (sh.getLastRow() <= 1) return [];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(votingCompetitionString_);
  const col = votingCompetitionHeaderMap_(headers);
  return sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().map(function(row, index) {
    return { rowNumber:index+2, timestamp:row[col.timestamp], updatedAt:row[col.updatedat], gameId:votingCompetitionString_(row[col.gameid]), username:votingCompetitionString_(row[col.username]), entryId:votingCompetitionString_(row[col.entryid]), rank:votingCompetitionNumber_(row[col.rank],0), points:votingCompetitionNumber_(row[col.points],0), rawRankPoints:votingCompetitionNumber_(row[col.rawrankpoints],0), criteriaScore:votingCompetitionNumber_(row[col.criteriascore],0), coverageWeight:votingCompetitionNumber_(row[col.coverageweight],1), finalScore:votingCompetitionNumber_(row[col.finalscore],votingCompetitionNumber_(row[col.points],0)), criteriaScores:votingCompetitionJson_(row[col.criteriajson],{}), locked:votingCompetitionBool_(row[col.locked],false), categoryId:votingCompetitionString_(row[col.categoryid]), voterRole:votingCompetitionString_(row[col.voterrole])||"public", voterMultiplier:votingCompetitionNumber_(row[col.votermultiplier],1) };
  }).filter(function(row) { return !gameId || row.gameId === gameId; });
}


function votingCompetitionCategoryId_(settings, value) {
  const categories = settings && Array.isArray(settings.entryCategories) ? settings.entryCategories : [];
  if (!categories.length) return "";
  const requested = votingCompetitionString_(value);
  if (!requested || !categories.some(function(c){return c.id === requested;})) throw new Error("Select a valid Cookoff voting category.");
  return requested;
}
function votingCompetitionEntriesForCategory_(entries, categoryId) {
  if (!categoryId) return entries.slice();
  return entries.filter(function(entry){
    const selected = entry.customData && entry.customData.cookoffCategoryIds;
    return !Array.isArray(selected) || selected.indexOf(categoryId) >= 0;
  });
}

function votingCompetitionBallotLimit_(settings, entryCount) {
  if (settings && settings.judgingMode === "criteria") return 0;
  if (settings.votingMethod === "favorite") return Math.min(1, entryCount);
  if (settings.votingMethod === "rank-all") return entryCount;
  return Math.min(Math.max(1, settings.rankLimit), entryCount);
}

function votingCompetitionPointsForRank_(rank, settings, ballotSize) {
  rank = Math.max(1, Math.floor(votingCompetitionNumber_(rank, 1)));
  if (settings.scoringMode === "borda") return Math.max(0, ballotSize - rank + 1);
  const values = Array.isArray(settings.pointValues) ? settings.pointValues : [];
  if (rank <= values.length) return Math.max(0, votingCompetitionNumber_(values[rank - 1], 0));
  return 0;
}

function votingCompetitionValidateBallot_(rankings, entries, settings) {
  rankings = Array.isArray(rankings) ? rankings : [];
  entries = Array.isArray(entries) ? entries : [];
  const limit = votingCompetitionBallotLimit_(settings, entries.length);
  if (!limit) throw new Error("There are no published entries available to vote on.");
  if (rankings.length !== limit) {
    throw new Error("Rank exactly " + limit + " " + (limit === 1 ? "entry" : "entries") + " before saving your ballot.");
  }
  const allowed = {};
  entries.forEach(function(entry) { allowed[entry.entryId] = true; });
  const usedEntries = {};
  const usedRanks = {};
  rankings.forEach(function(item) {
    const entryId = votingCompetitionString_(item && item.entryId);
    const rank = votingCompetitionNumber_(item && item.rank, NaN);
    if (!allowed[entryId]) throw new Error("Invalid competition entry in ballot.");
    if (usedEntries[entryId]) throw new Error("Each entry can only appear once on your ballot.");
    if (!Number.isFinite(rank) || Math.floor(rank) !== rank || rank < 1 || rank > limit || usedRanks[rank]) {
      throw new Error("Ranks must be whole numbers, unique, and run from 1 through " + limit + ".");
    }
    usedEntries[entryId] = true;
    usedRanks[rank] = true;
  });
}

function votingCompetitionSelfRankEntries_(entries, rankings, username, draftOnly) {
  const owned = entries.filter(function(entry) {
    return votingCompetitionKey_(entry.username) === votingCompetitionKey_(username);
  });
  if (!owned.length) return entries;
  const ownedIds = new Set(owned.map(function(entry) { return entry.entryId; }));
  const chosen = rankings.filter(function(row) {
    return row && ownedIds.has(votingCompetitionString_(row.entryId));
  });
  if (chosen.length !== 1 || Number(chosen[0].rank) !== 1) {
    if (draftOnly && !rankings.length) return entries;
    throw new Error("Choose one of your eligible dishes to lock at #1.");
  }
  const chosenId = votingCompetitionString_(chosen[0].entryId);
  return entries.filter(function(entry) { return entry.entryId === chosenId || !ownedIds.has(entry.entryId); });
}

function votingCompetitionSaveBallot_(payload, internalOptions) {
  payload = payload || {};
  internalOptions = internalOptions || {};
  const username = votingCompetitionString_(payload.username); const gameId = votingCompetitionString_(payload.gameId);
  if (!username || !gameId) throw new Error("Username and GameId are required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || votingCompetitionKey_(game.type) !== "voting") throw new Error("This is not a Voting / Competition game.");
  const settings = votingCompetitionGetSettings_(gameId);
  const categoryId = votingCompetitionCategoryId_(settings, payload.categoryId);
  const voterRole = votingCompetitionJudgeRole_(settings,username,categoryId);
  const internalAuto = internalOptions.serverDeadlineFinalization === true && settings.autoFinalizeDrafts === true && votingCompetitionDeadlinePassed_(settings);
  if (!internalAuto && !votingCompetitionVotingOpen_(settings, game)) throw new Error(votingCompetitionDeadlinePassed_(settings) ? "Voting deadline has passed." : "Voting is closed.");
  const publishedEntries = votingCompetitionReadParticipants_(gameId).filter(function(entry) { return entry.status === "approved" && entry.published === true; });
  if (!publishedEntries.length) throw new Error("There are no published entries available to vote on.");
  if ((settings.entryCategories || []).length) votingCompetitionEnsureSheet_(VOTING_COMPETITION_DRAFTS_SHEET,VOTING_COMPETITION_DRAFT_HEADERS);
  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
  if (!lock.tryLock(3500)) throw new Error("Another vote is being saved. Please try once more.");
  try {
    if (!internalAuto && !votingCompetitionVotingOpen_(settings, game)) throw new Error("Voting is closed.");
    if (internalAuto) {
      const latest = votingCompetitionReadDrafts_(gameId, username).find(function(draft) {
        return draft.categoryId === categoryId;
      });
      if (!latest || latest.finalized) return {success:true, skipped:true};
      payload.rankings = latest.rankings;
    }
    if (Array.isArray(payload.evaluatedEntryIds) || (payload.criteriaScoresByEntry && typeof payload.criteriaScoresByEntry === "object")) votingCompetitionSaveEvaluationStateUnlocked_(gameId, username, publishedEntries, settings, payload);
    const evaluationMap = votingCompetitionEvaluationMap_(votingCompetitionReadEvaluations_(gameId, username));
    const categoryEntries = votingCompetitionEntriesForCategory_(publishedEntries,categoryId);
    const evaluatedCount = categoryEntries.filter(function(entry) { return evaluationMap[entry.entryId] && evaluationMap[entry.entryId].evaluated === true; }).length;
    if (payload.evaluationOnly === true) return { success:true, gameId:gameId, categoryId:categoryId, evaluationSaved:true, evaluatedCount:evaluatedCount };
    let eligibleEntries = votingCompetitionEligibleEntries_(categoryEntries, evaluationMap, settings);
    const rankings = Array.isArray(payload.rankings) ? payload.rankings : [];
    const judgingMode = votingCompetitionNormalizeJudgingMode_(settings.judgingMode);
    if (settings.contestantSelfRank && judgingMode !== "criteria") {
      eligibleEntries = votingCompetitionSelfRankEntries_(eligibleEntries, rankings, username, payload.draftOnly === true);
    }
    if (payload.draftOnly === true) {
      if (!(settings.entryCategories || []).length) throw new Error("Draft saving is not enabled for this competition.");
      votingCompetitionValidateDraft_(rankings, eligibleEntries, settings);
      votingCompetitionSaveDraftUnlocked_(gameId,username,categoryId,rankings,false);
      return {success:true,gameId:gameId,categoryId:categoryId,draftSaved:true,saved:rankings.length};
    }
    votingCompetitionAssertMinimumEvaluated_(settings, evaluatedCount);
    let validationSettings = settings;
    if (internalAuto && settings.allowPartialAutoFinalize === true && judgingMode !== "criteria" && rankings.length > 0) {
      const fullLimit = votingCompetitionBallotLimit_(settings,eligibleEntries.length);
      if (rankings.length > fullLimit) throw new Error("Draft contains too many ranks.");
      validationSettings = Object.assign({},settings,{votingMethod:"top-n",rankLimit:rankings.length});
    }
    if (judgingMode !== "criteria") votingCompetitionValidateBallot_(rankings, eligibleEntries, validationSettings);
    const coverageWeight = votingCompetitionCoverageWeight_(evaluatedCount, categoryEntries.length, settings.ballotWeighting);
    const limit = votingCompetitionBallotLimit_(validationSettings, eligibleEntries.length);
    const maxRankPoints = limit ? votingCompetitionPointsForRank_(1, settings, limit) : 0;
    const specs = [];
    if (judgingMode === "criteria") {
      if (!settings.criteria.length) throw new Error("No judging criteria are configured.");
      const candidates = categoryEntries.filter(function(entry) {
        const evaluation = evaluationMap[entry.entryId];
        if (settings.evaluatedOnly && !(evaluation && evaluation.evaluated)) return false;
        return evaluation && evaluation.criteriaScores && Object.keys(evaluation.criteriaScores).length > 0;
      });
      if (!candidates.length) throw new Error("Score at least one evaluated entry before submitting.");
      candidates.forEach(function(entry) { const evaluation = evaluationMap[entry.entryId]; const criteriaScore = votingCompetitionWeightedCriteriaScore_(settings.criteria, evaluation.criteriaScores); specs.push({entryId:entry.entryId,rank:0,rawRankPoints:0,criteriaScore:criteriaScore,finalScore:criteriaScore*coverageWeight*voterRole.multiplier,criteriaScores:evaluation.criteriaScores}); });
    } else {
      rankings.slice().sort(function(a,b){return Number(a.rank||0)-Number(b.rank||0);}).forEach(function(item) {
        const entryId = votingCompetitionString_(item.entryId); const rank = votingCompetitionNumber_(item.rank,0); const rawRankPoints = votingCompetitionPointsForRank_(rank,settings,limit);
        let criteriaScore=0, criteriaScores={}, rawScore=rawRankPoints;
        if (judgingMode === "combined") { const evaluation=evaluationMap[entryId]||{}; criteriaScores=evaluation.criteriaScores||{}; criteriaScore=votingCompetitionWeightedCriteriaScore_(settings.criteria,criteriaScores); rawScore=votingCompetitionCombinedScore_(rawRankPoints,maxRankPoints,criteriaScore,settings); }
        specs.push({entryId:entryId,rank:rank,rawRankPoints:rawRankPoints,criteriaScore:criteriaScore,finalScore:rawScore*coverageWeight*voterRole.multiplier,criteriaScores:criteriaScores});
      });
    }
    const sh = votingCompetitionEnsureSheet_(VOTING_COMPETITION_BALLOTS_SHEET,VOTING_COMPETITION_BALLOT_HEADERS); const data=sh.getDataRange().getValues(); const headers=data[0].map(votingCompetitionString_); const col=votingCompetitionHeaderMap_(headers); const matchingRows=[];
    for (let i=1;i<data.length;i++) if (votingCompetitionString_(data[i][col.gameid])===gameId && votingCompetitionKey_(data[i][col.username])===votingCompetitionKey_(username) && votingCompetitionString_(data[i][col.categoryid])===categoryId) matchingRows.push(i+1);
    const now=new Date(); const rows=specs.map(function(spec){ const row=new Array(headers.length).fill(""); const finalScore=Math.round(Number(spec.finalScore||0)*1000000)/1000000; row[col.timestamp]=now; row[col.updatedat]=now; row[col.gameid]=gameId; row[col.username]=username; row[col.entryid]=spec.entryId; row[col.rank]=spec.rank; row[col.points]=finalScore; row[col.rawrankpoints]=spec.rawRankPoints; row[col.criteriascore]=spec.criteriaScore; row[col.coverageweight]=coverageWeight; row[col.finalscore]=finalScore; row[col.criteriajson]=JSON.stringify(spec.criteriaScores||{}); row[col.locked]=false; row[col.categoryid]=categoryId; row[col.voterrole]=voterRole.role; row[col.votermultiplier]=voterRole.multiplier; return row; });
    const reuse=Math.min(matchingRows.length,rows.length); for(let i=0;i<reuse;i++) sh.getRange(matchingRows[i],1,1,headers.length).setValues([rows[i]]); if(rows.length>reuse) sh.getRange(sh.getLastRow()+1,1,rows.length-reuse,headers.length).setValues(rows.slice(reuse)); if(matchingRows.length>rows.length) matchingRows.slice(rows.length).sort(function(a,b){return b-a;}).forEach(function(rowNumber){sh.deleteRow(rowNumber);});
    if ((settings.entryCategories || []).length) votingCompetitionSaveDraftUnlocked_(gameId,username,categoryId,rankings,true);
    if(typeof clearGameCaches==="function") clearGameCaches(gameId);
    return {success:true,gameId:gameId,categoryId:categoryId,saved:rows.length,evaluatedCount:evaluatedCount,coverageWeight:coverageWeight};
  } finally { lock.releaseLock(); }
}


/* Private time-trigger operation; never expose this as a public API route. */
function votingCompetitionFinalizeDueDrafts_() {
  const drafts = votingCompetitionReadDrafts_("","");
  const result = {checked:0,finalized:0,skipped:0,errors:[]};
  drafts.filter(function(row){return !row.finalized;}).forEach(function(draft) {
    result.checked++;
    try {
      const settings = votingCompetitionGetSettings_(draft.gameId);
      if (!settings.autoFinalizeDrafts || !votingCompetitionDeadlinePassed_(settings)) {result.skipped++;return;}
      if (votingCompetitionNormalizeJudgingMode_(settings.judgingMode) !== "criteria" &&
          (!draft.rankings || !draft.rankings.length)) {result.skipped++;return;}
      const saved = votingCompetitionSaveBallot_({
        gameId:draft.gameId,username:draft.username,categoryId:draft.categoryId,
        rankings:draft.rankings
      },{serverDeadlineFinalization:true});
      if (saved && saved.skipped) result.skipped++;
      else result.finalized++;
    } catch(err) {
      result.errors.push({gameId:draft.gameId,categoryId:draft.categoryId,message:String(err && err.message || err)});
    }
  });
  if (result.errors.length && typeof Logger !== "undefined") Logger.log(JSON.stringify(result));
  return result;
}
function votingCompetitionInstallDraftFinalizer_() {
  const target = "votingCompetitionFinalizeDueDrafts_";
  if (ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()===target;})) return {installed:false,alreadyExists:true};
  ScriptApp.newTrigger(target).timeBased().everyMinutes(1).create();
  return {installed:true,alreadyExists:false};
}

function votingCompetitionResults_(gameId, settings, participants, ballots) {
  const approved=(participants||[]).filter(function(entry){return entry.status==="approved"&&entry.published===true;}); const byEntry={};
  approved.forEach(function(entry){byEntry[entry.entryId]={entryId:entry.entryId,entryName:entry.entryName,displayNumber:entry.displayNumber,displayColor:entry.displayColor,imageUrl:entry.imageUrl,participantName:entry.participantName,totalPoints:0,firstPlaceVotes:0,topThreeVotes:0,rankTotal:0,rankCount:0,averageRank:null,position:0};});
  const voterSet={}; (ballots||[]).forEach(function(vote){const row=byEntry[vote.entryId]; if(!row)return; row.totalPoints=Math.round((row.totalPoints+votingCompetitionNumber_(vote.points,0))*1000000)/1000000; if(vote.rank>0){row.firstPlaceVotes+=vote.rank===1?1:0;row.topThreeVotes+=vote.rank<=3?1:0;row.rankTotal+=vote.rank;row.rankCount+=1;} voterSet[votingCompetitionKey_(vote.username)]=true;});
  const results=Object.keys(byEntry).map(function(id){const row=byEntry[id];row.averageRank=row.rankCount?Math.round((row.rankTotal/row.rankCount)*100)/100:null;return row;}).sort(function(a,b){if(b.totalPoints!==a.totalPoints)return b.totalPoints-a.totalPoints;if(b.firstPlaceVotes!==a.firstPlaceVotes)return b.firstPlaceVotes-a.firstPlaceVotes;if(b.topThreeVotes!==a.topThreeVotes)return b.topThreeVotes-a.topThreeVotes;const ar=a.averageRank===null?99999:a.averageRank;const br=b.averageRank===null?99999:b.averageRank;if(ar!==br)return ar-br;return votingCompetitionString_(a.entryName).localeCompare(votingCompetitionString_(b.entryName));});
  let currentPosition=0,previousKey="";results.forEach(function(row,index){const key=[row.totalPoints,row.firstPlaceVotes,row.topThreeVotes,row.averageRank===null?"":row.averageRank].join("|");if(index===0||key!==previousKey)currentPosition=index+1;row.position=currentPosition;previousKey=key;});
  return {ballotCount:Object.keys(voterSet).length,results:results};
}

function votingCompetitionPublicEntry_(entry, settings) {
  const customVisible = {};
  (settings.customFields || []).forEach(function(field) {
    if (field.voterVisible) customVisible[field.id] = entry.customData ? entry.customData[field.id] : "";
  });
  return {
    entryId: entry.entryId,
    entryName: entry.entryName,
    participantName: settings.showParticipantNames ? entry.participantName : "",
    imageUrl: settings.showPhoto ? entry.imageUrl : "",
    displayNumber: entry.displayNumber,
    displayColor: entry.displayColor,
    description: settings.showDescription ? entry.description : "",
    ingredients: settings.showIngredients ? entry.ingredients : "",
    customData: customVisible,
    division: votingCompetitionString_(entry.customData && entry.customData.cookoffDivision),
    categoryIds: entry.customData && Array.isArray(entry.customData.cookoffCategoryIds) ? entry.customData.cookoffCategoryIds : null
  };
}

function votingCompetitionResultsVisible_(settings, game) {
  if (settings.resultsVisibility === "live") return true;
  if (settings.resultsVisibility === "hidden") return false;
  return settings.votingLocked === true || votingCompetitionDeadlinePassed_(settings) || (game && (game.votingLocked === true || game.resultsFinalized === true));
}

function apiGetVotingCompetitionState_(payload) {
  payload = payload || {};
  const username = votingCompetitionString_(payload.username);
  const gameId = votingCompetitionString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  if (!username || !gameId) throw new Error("Username and GameId are required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || votingCompetitionKey_(game.type) !== "voting") throw new Error("This is not a Voting / Competition game.");
  const settings = votingCompetitionGetSettings_(gameId);
  const participants = votingCompetitionReadParticipants_(gameId);
  const published = participants.filter(function(e){return e.status === "approved" && e.published === true;});
  const evaluations = votingCompetitionReadEvaluations_(gameId, username);
  const evaluationMap = votingCompetitionEvaluationMap_(evaluations);
  const ballots = votingCompetitionReadBallots_(gameId);
  const drafts = (settings.entryCategories || []).length ? votingCompetitionReadDrafts_(gameId,username) : [];
  const draftsByCategory = {};
  drafts.forEach(function(d){draftsByCategory[d.categoryId]=d.rankings;});
  const ownEntries = participants.filter(function(e){return votingCompetitionKey_(e.username) === votingCompetitionKey_(username);});
  const ownEntry = ownEntries[0] || null;
  const resultsVisible = votingCompetitionResultsVisible_(settings, game);
  const votingOpen = votingCompetitionVotingOpen_(settings, game);
  const categories = settings.entryCategories || [];
  const activeCategory = categories.length ? categories[0].id : "";
  const ballotByCategory = {};
  const resultsByCategory = {};
  const resultCountByCategory = {};
  const categoryIds = categories.length ? categories.map(function(c){return c.id;}) : [""];
  categoryIds.forEach(function(categoryId) {
    const categoryEntries = votingCompetitionEntriesForCategory_(published, categoryId);
    const categoryBallots = ballots.filter(function(row){return votingCompetitionString_(row.categoryId)===categoryId;});
    ballotByCategory[categoryId] = categoryBallots.filter(function(row) {
      return votingCompetitionKey_(row.username)===votingCompetitionKey_(username);
    }).map(function(row) {
      return {entryId:row.entryId,rank:row.rank,points:row.points,criteriaScore:row.criteriaScore,coverageWeight:row.coverageWeight};
    }).sort(function(a,b){return a.rank-b.rank;});
    const result = votingCompetitionResults_(gameId, settings, categoryEntries, categoryBallots);
    resultCountByCategory[categoryId] = result.ballotCount;
    resultsByCategory[categoryId] = resultsVisible ? result.results.map(function(row){
      return Object.assign({},row,{
        participantName:settings.showParticipantNames ? row.participantName : "",
        imageUrl:settings.showPhoto ? row.imageUrl : ""
      });
    }) : [];
  });
  function ownPublic(e) {
    return {entryId:e.entryId,participantName:e.participantName,entryName:e.entryName,
      imageUrl:e.imageUrl,imageFileId:e.imageFileId,displayNumber:e.displayNumber,
      displayColor:e.displayColor,description:e.description,ingredients:e.ingredients,
      customData:e.customData||{},status:e.status,published:e.published,adminNotes:e.adminNotes};
  }
  const currentEntries = votingCompetitionEntriesForCategory_(published,activeCategory);
  const eligible = votingCompetitionEligibleEntries_(currentEntries,evaluationMap,settings);
  return {
    success:true,gameId:gameId,gameName:game.name||gameId,gameDescription:game.description||"",
    settings:settings,serverNow:Date.now(),votingDeadlineEpoch:votingCompetitionDeadlineTime_(settings),isOfficialJudge:(settings.officialJudges||[]).indexOf(votingCompetitionKey_(username))>=0,registrationOpen:votingCompetitionRegistrationOpen_(settings),
    votingOpen:votingOpen,votingDeadlinePassed:votingCompetitionDeadlinePassed_(settings),
    ballotLimit:votingCompetitionBallotLimit_(settings,eligible.length),
    categoryId:activeCategory,categories:categories,
    entries:published.map(function(entry){return votingCompetitionPublicEntry_(entry,settings);}),
    evaluations:evaluations.map(function(row){return {entryId:row.entryId,evaluated:row.evaluated,criteriaScores:row.criteriaScores||{}};}),
    ownEntries:ownEntries.map(ownPublic),ownEntry:ownEntry?ownPublic(ownEntry):null,
    ballot:ballotByCategory[activeCategory]||[],ballotsByCategory:ballotByCategory,draftsByCategory:draftsByCategory,
    resultsVisible:resultsVisible,ballotCount:resultCountByCategory[activeCategory]||0,
    ballotCountByCategory:resultCountByCategory,
    results:resultsVisible?(resultsByCategory[activeCategory]||[]):[],resultsByCategory:resultsByCategory
  };
}

function adminGetVotingCompetitionDashboard_(payload) {
  payload = payload || {};
  const gameId = votingCompetitionString_(payload.gameId);
  if (!gameId) throw new Error("GameId is required.");
  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || votingCompetitionKey_(game.type) !== "voting") throw new Error("This is not a Voting / Competition game.");
  const settings = votingCompetitionGetSettings_(gameId);
  const participants = votingCompetitionReadParticipants_(gameId);
  const ballots = votingCompetitionReadBallots_(gameId);
  const resultBundle = votingCompetitionResults_(gameId, settings, participants, ballots);
  return {
    success: true,
    gameId: gameId,
    settings: settings,
    participants: participants.map(function(entry) {
      return {
        entryId:entry.entryId,entryName:entry.entryName,imageUrl:entry.imageUrl,imageFileId:entry.imageFileId,
        displayNumber:entry.displayNumber,displayColor:entry.displayColor,description:entry.description,
        ingredients:entry.ingredients,status:entry.status,published:entry.published,adminNotes:entry.adminNotes
      };
    }),
    ballotCount: resultBundle.ballotCount,
    results: resultBundle.results.map(function(row) {
      const {participantName, ...anonymousResult} = row;
      return anonymousResult;
    })
  };
}

function votingCompetitionPreflightIssues_(gameId) {
  const issues=[]; const settings=votingCompetitionGetSettings_(gameId); const participants=votingCompetitionReadParticipants_(gameId); const approved=participants.filter(function(entry){return entry.status==="approved"&&entry.published===true;});
  if(!settings.entryLabel)issues.push({severity:"error",message:"Voting / Competition Entry Label is required."});
  if(settings.judgingMode!=="criteria"&&settings.votingMethod!=="favorite"&&settings.rankLimit<1)issues.push({severity:"error",message:"Voting / Competition Rank Limit must be at least 1."});
  if(settings.scoringMode==="custom-points"&&settings.judgingMode!=="criteria"&&!settings.pointValues.length)issues.push({severity:"error",message:"Voting / Competition custom point values are empty."});
  if((settings.judgingMode==="criteria"||settings.judgingMode==="combined")&&!settings.criteria.length)issues.push({severity:"error",message:"Cookoff Criteria/Combined judging requires at least one criterion."});
  if(settings.minimumEvaluatedEntries>approved.length&&approved.length)issues.push({severity:"warning",message:"Minimum evaluated entries is greater than the current number of published entries."});
  if(!approved.length)issues.push({severity:"warning",message:"No approved/published competition entries are available yet. Participant registration can remain open after activation."});
  return issues;
}
