/* =========================
   REALITY TV EPISODE QUESTION PACKS
   Production v1.2.3

   Adds independent, administrator-reviewed episode questions without
   changing the stable elimination/next-episode workflow.
========================= */

const REALITY_TV_QUESTION_TEMPLATES_SHEET = "RealityQuestionTemplates";
const REALITY_TV_EPISODE_QUESTIONS_SHEET = "RealityEpisodeQuestions";
const REALITY_TV_QUESTION_QUEUE_SHEET = "RealityQuestionResultQueue";
const REALITY_TV_QUESTION_BUILD_JOBS_SHEET = "RealityQuestionBuildJobs";

const REALITY_TV_QUESTION_TEMPLATE_HEADERS = [
  "SeasonId", "GameId", "TemplateId", "QuestionType", "Label", "HelpText",
  "QuestionTemplate", "AnswerSource", "ResultKey", "Points", "Enabled",
  "DisplayOrder", "IncludeNoOutcome", "NoOutcomeLabel", "ShowFormatsJSON",
  "TemplateSource", "CustomAnswerOptionsJSON", "LayoutType", "ImageSource", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_EPISODE_QUESTION_HEADERS = [
  "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "EpisodeQuestionId",
  "TemplateId", "QuestionType", "QuestionText", "CategoryId", "AnswerSource",
  "AnswerOptionsJSON", "ResultKey", "ExternalEventId", "ExternalMarketId",
  "Status", "WinningOutcomeIds", "ResultQueueId", "TemplateSource",
  "Points", "LayoutType", "ImageSource", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_QUESTION_QUEUE_HEADERS = [
  "QueueId", "SeasonId", "GameId", "EpisodeId", "EpisodeNumber",
  "EpisodeQuestionId", "CategoryId", "QuestionType", "ResultKey",
  "ResultMode", "SelectedOutcomeIdsJSON", "SelectedOutcomeLabelsJSON",
  "SelectedOutcomeId", "SelectedOutcomeLabel", "ReviewStatus", "EvidenceUrl",
  "Notes", "SubmittedBy", "SubmittedAt", "ReviewedBy", "ReviewedAt",
  "PushStatus", "ApprovalStage", "ApprovalStartedAt", "ApprovalCompletedAt",
  "ApprovalAttemptCount", "ApprovalStageStartedAt", "ApprovalHeartbeatAt", "PushedAt", "HubImportedResultId", "HubReviewId",
  "ErrorMessage", "UpdatedAt"
];

const REALITY_TV_QUESTION_BUILD_JOB_HEADERS = [
  "BuildId", "SeasonId", "GameId", "EpisodeId",
  "ManagedBy",
  "EnabledQuestionTypesJSON", "CurrentIndex", "TotalCount",
  "Stage", "Status", "ProcessedCount", "SkippedCount",
  "LastTemplateId", "LastEpisodeQuestionId", "LastMessage",
  "BuildResultsJSON", "ErrorMessage", "AttemptCount", "StartedAt", "CompletedAt", "UpdatedAt"
];

function realityTvShowFormatDefinitions_() {
  return [
    {
      id: "survivor-tribal", label: "Survivor / Tribal", participantType: "individual",
      participantLabel: "Contestant", groupLabel: "Tribe", periodLabel: "Episode",
      eliminationTemplate: "Who will be eliminated in Episode {episode}?",
      defaultQuestionTypes: ["immunity-winner", "tribal-attendee", "reward-winner", "idol-finder"]
    },
    {
      id: "cooking", label: "Cooking Competition", participantType: "individual",
      participantLabel: "Chef", groupLabel: "Team", periodLabel: "Episode",
      eliminationTemplate: "Who will be eliminated in Episode {episode}?",
      defaultQuestionTypes: ["individual-challenge-winner", "team-challenge-winner", "safety-winner", "bottom-finish"]
    },
    {
      id: "performance", label: "Performance / Judged Competition", participantType: "individual",
      participantLabel: "Couple / Performer", groupLabel: "Group", periodLabel: "Episode",
      eliminationTemplate: "Who will be eliminated in Episode {episode}?",
      defaultQuestionTypes: ["highest-score", "lowest-score", "perfect-score", "bottom-finish"]
    },
    {
      id: "social-deduction", label: "Social Deduction", participantType: "individual",
      participantLabel: "Player", groupLabel: "Team", periodLabel: "Episode",
      eliminationTemplate: "Who will leave the game in Episode {episode}?",
      defaultQuestionTypes: ["shield-winner", "murdered-player", "banished-player", "traitor-banished", "mission-winner"]
    },
    {
      id: "amazing-race", label: "Amazing Race / Team Travel", participantType: "team",
      participantLabel: "Team", groupLabel: "Group", periodLabel: "Leg",
      eliminationTemplate: "Which team will be eliminated in Leg {episode}?",
      defaultQuestionTypes: ["leg-winner", "last-place-team", "non-elimination-leg", "fast-forward", "u-turn-recipient", "time-penalty"]
    },
    {
      id: "team-competition", label: "Team Competition", participantType: "team",
      participantLabel: "Team", groupLabel: "Division / Group", periodLabel: "Round",
      eliminationTemplate: "Which team will be eliminated in Round {episode}?",
      defaultQuestionTypes: ["team-challenge-winner", "team-safety-winner", "last-place-team"]
    },
    {
      id: "general-elimination", label: "General Elimination", participantType: "individual",
      participantLabel: "Contestant", groupLabel: "Team", periodLabel: "Episode",
      eliminationTemplate: "Who will be eliminated in Episode {episode}?",
      defaultQuestionTypes: ["individual-challenge-winner", "safety-winner", "bottom-finish"]
    },
    {
      id: "custom", label: "Fully Custom", participantType: "individual",
      participantLabel: "Participant", groupLabel: "Group", periodLabel: "Episode",
      eliminationTemplate: "Who will be eliminated in Episode {episode}?",
      defaultQuestionTypes: []
    }
  ];
}

function realityTvShowFormatDefinition_(formatId) {
  const key = realityTvKey_(formatId || "survivor-tribal");
  return realityTvShowFormatDefinitions_().find(function(item) { return item.id === key; }) ||
    realityTvShowFormatDefinitions_()[0];
}

function realityTvStandardQuestionDefinitions_() {
  return [
    { templateId: "immunity-winner", formats: ["survivor-tribal"], label: "Immunity winner", help: "Uses tribes before the merge and participants after the merge.", questionTemplate: "Who will win immunity in {period} {episode}?", answerSource: "groups-or-participants", resultKey: "immunity-winner", displayOrder: 20, includeNoOutcome: false },
    { templateId: "tribal-attendee", formats: ["survivor-tribal"], label: "Tribe going to Tribal Council", help: "Created only while two or more active tribes remain.", questionTemplate: "Which tribe will go to Tribal Council in Episode {episode}?", answerSource: "active-groups", resultKey: "tribal-attendee", displayOrder: 30, includeNoOutcome: true, noOutcomeLabel: "No Tribal Council" },
    { templateId: "reward-winner", formats: ["survivor-tribal"], label: "Reward winner", help: "Uses tribes before the merge and participants after the merge.", questionTemplate: "Who will win the reward in {period} {episode}?", answerSource: "groups-or-participants", resultKey: "reward-winner", displayOrder: 40, includeNoOutcome: true, noOutcomeLabel: "No reward challenge" },
    { templateId: "idol-finder", formats: ["survivor-tribal"], label: "Immunity idol finder", help: "Active contestants plus a No one option.", questionTemplate: "Who will find a hidden immunity idol in Episode {episode}?", answerSource: "active-participants", resultKey: "idol-finder", displayOrder: 50, includeNoOutcome: true, noOutcomeLabel: "No one" },
    { templateId: "fire-making-winner", formats: ["survivor-tribal"], label: "Fire-making challenge winner", help: "Use for a Survivor fire-making challenge or finale stage.", questionTemplate: "Who will win the fire-making challenge in {period} {episode}?", answerSource: "active-participants", resultKey: "fire-making-winner", displayOrder: 60, includeNoOutcome: true, noOutcomeLabel: "No fire-making challenge" },

    { templateId: "individual-challenge-winner", formats: ["cooking", "general-elimination"], label: "Individual challenge winner", help: "Selects from the active participants.", questionTemplate: "Who will win the individual challenge in {period} {episode}?", answerSource: "active-participants", resultKey: "individual-challenge-winner", displayOrder: 20, includeNoOutcome: true, noOutcomeLabel: "No individual challenge" },
    { templateId: "team-challenge-winner", formats: ["cooking", "team-competition"], label: "Team challenge winner", help: "Uses active teams or groups.", questionTemplate: "Which team will win the team challenge in {period} {episode}?", answerSource: "active-groups", resultKey: "team-challenge-winner", displayOrder: 30, includeNoOutcome: true, noOutcomeLabel: "No team challenge" },
    { templateId: "safety-winner", formats: ["cooking", "general-elimination"], label: "Safety / immunity winner", help: "Participant who earns safety from elimination.", questionTemplate: "Who will earn safety in {period} {episode}?", answerSource: "active-participants", resultKey: "safety-winner", displayOrder: 40, includeNoOutcome: true, noOutcomeLabel: "No one" },
    { templateId: "bottom-finish", formats: ["cooking", "performance", "general-elimination"], label: "Bottom finisher", help: "Single participant who finishes lowest or is most at risk.", questionTemplate: "Who will finish at the bottom in {period} {episode}?", answerSource: "active-participants", resultKey: "bottom-finish", displayOrder: 50, includeNoOutcome: true, noOutcomeLabel: "No bottom result" },

    { templateId: "highest-score", formats: ["performance"], label: "Highest score", help: "Performer or couple with the highest judges' score.", questionTemplate: "Who will receive the highest score in Episode {episode}?", answerSource: "active-participants", resultKey: "highest-score", displayOrder: 20, includeNoOutcome: false },
    { templateId: "lowest-score", formats: ["performance"], label: "Lowest score", help: "Performer or couple with the lowest judges' score.", questionTemplate: "Who will receive the lowest score in Episode {episode}?", answerSource: "active-participants", resultKey: "lowest-score", displayOrder: 30, includeNoOutcome: false },
    { templateId: "perfect-score", formats: ["performance"], label: "Perfect score", help: "Active participants plus a No one option.", questionTemplate: "Who will earn a perfect score in Episode {episode}?", answerSource: "active-participants", resultKey: "perfect-score", displayOrder: 40, includeNoOutcome: true, noOutcomeLabel: "No one" },

    { templateId: "shield-winner", formats: ["social-deduction"], label: "Shield / safety winner", help: "Player who earns protection.", questionTemplate: "Who will receive the shield in Episode {episode}?", answerSource: "active-participants", resultKey: "shield-winner", displayOrder: 20, includeNoOutcome: true, noOutcomeLabel: "No one" },
    { templateId: "murdered-player", formats: ["social-deduction"], label: "Murdered player", help: "Player removed by the hidden group.", questionTemplate: "Who will be murdered in Episode {episode}?", answerSource: "active-participants", resultKey: "murdered-player", displayOrder: 30, includeNoOutcome: true, noOutcomeLabel: "No murder" },
    { templateId: "banished-player", formats: ["social-deduction"], label: "Banished player", help: "Player selected at the round table.", questionTemplate: "Who will be banished in Episode {episode}?", answerSource: "active-participants", resultKey: "banished-player", displayOrder: 40, includeNoOutcome: true, noOutcomeLabel: "No banishment" },
    { templateId: "traitor-banished", formats: ["social-deduction"], label: "Will a Traitor be banished?", help: "Yes / No market.", questionTemplate: "Will a Traitor be banished in Episode {episode}?", answerSource: "yes-no", resultKey: "traitor-banished", displayOrder: 50, includeNoOutcome: false },
    { templateId: "mission-winner", formats: ["social-deduction"], label: "Mission winner", help: "Winning group or player for the mission.", questionTemplate: "Who will win the mission in Episode {episode}?", answerSource: "groups-or-participants", resultKey: "mission-winner", displayOrder: 60, includeNoOutcome: true, noOutcomeLabel: "No winner" },

    { templateId: "leg-winner", formats: ["amazing-race"], label: "Leg winner", help: "Team that checks in first.", questionTemplate: "Which team will win Leg {episode}?", answerSource: "active-participants", resultKey: "leg-winner", displayOrder: 20, includeNoOutcome: false },
    { templateId: "last-place-team", formats: ["amazing-race", "team-competition"], label: "Last-place team", help: "Team that finishes last in the leg or round.", questionTemplate: "Which team will finish last in {period} {episode}?", answerSource: "active-participants", resultKey: "last-place-team", displayOrder: 30, includeNoOutcome: false },
    { templateId: "non-elimination-leg", formats: ["amazing-race"], label: "Non-elimination leg", help: "Yes / No market.", questionTemplate: "Will Leg {episode} be a non-elimination leg?", answerSource: "yes-no", resultKey: "non-elimination-leg", displayOrder: 40, includeNoOutcome: false },
    { templateId: "fast-forward", formats: ["amazing-race"], label: "Fast Forward winner", help: "Active teams plus a No one option.", questionTemplate: "Which team will win or use the Fast Forward in Leg {episode}?", answerSource: "active-participants", resultKey: "fast-forward", displayOrder: 50, includeNoOutcome: true, noOutcomeLabel: "No one" },
    { templateId: "u-turn-recipient", formats: ["amazing-race"], label: "U-Turn recipient", help: "Team receiving the U-Turn, or No one.", questionTemplate: "Which team will receive the U-Turn in Leg {episode}?", answerSource: "active-participants", resultKey: "u-turn-recipient", displayOrder: 60, includeNoOutcome: true, noOutcomeLabel: "No one" },
    { templateId: "time-penalty", formats: ["amazing-race"], label: "Time penalty", help: "Team receiving a time penalty, or No one.", questionTemplate: "Which team will receive a time penalty in Leg {episode}?", answerSource: "active-participants", resultKey: "time-penalty", displayOrder: 70, includeNoOutcome: true, noOutcomeLabel: "No one" },

    { templateId: "team-safety-winner", formats: ["team-competition"], label: "Team safety winner", help: "Team protected from elimination.", questionTemplate: "Which team will earn safety in Round {episode}?", answerSource: "active-participants", resultKey: "team-safety-winner", displayOrder: 40, includeNoOutcome: true, noOutcomeLabel: "No team" }
  ];
}

function realityTvStandardQuestionDefinitionsForFormat_(formatId) {
  const key = realityTvShowFormatDefinition_(formatId).id;
  return realityTvStandardQuestionDefinitions_().filter(function(item) {
    return (item.formats || []).indexOf(key) !== -1;
  });
}

function realityTvQuestionTemplateMatchesFormat_(template, formatId) {
  if (!template) return false;
  if (realityTvKey_(template.TemplateSource || template.templateSource) === "custom") return true;
  const key = realityTvShowFormatDefinition_(formatId).id;
  let formats = template.formats;
  if (!Array.isArray(formats)) formats = realityTvParseJson_(template.ShowFormatsJSON || "[]", []);
  return Array.isArray(formats) && formats.map(realityTvKey_).indexOf(key) !== -1;
}

function realityTvPrunePresetQuestionTemplatesForSeason_(seasonId, formatId) {
  realityTvEnsureQuestionPackSystem_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_TEMPLATES_SHEET);
  if (!sheet) return 0;
  const allowed = {};
  realityTvStandardQuestionDefinitionsForFormat_(formatId).forEach(function(item) {
    allowed[realityTvKey_(item.templateId)] = true;
  });
  const rows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_TEMPLATES_SHEET)
    .filter(function(row) {
      return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId) &&
        realityTvKey_(row.TemplateSource || "preset") !== "custom" &&
        !allowed[realityTvKey_(row.TemplateId)];
    })
    .sort(function(a, b) { return b.__rowNumber - a.__rowNumber; });
  rows.forEach(function(row) { sheet.deleteRow(row.__rowNumber); });
  return rows.length;
}

function realityTvEnsureQuestionPackSystem_() {
  const ss = SpreadsheetApp.getActive();
  realityTvGetOrCreateSheet_(ss, REALITY_TV_QUESTION_TEMPLATES_SHEET, REALITY_TV_QUESTION_TEMPLATE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_EPISODE_QUESTIONS_SHEET, REALITY_TV_EPISODE_QUESTION_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_QUESTION_QUEUE_SHEET, REALITY_TV_QUESTION_QUEUE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_QUESTION_BUILD_JOBS_SHEET, REALITY_TV_QUESTION_BUILD_JOB_HEADERS);
  return { success: true };
}

function realityTvQuestionTemplatesForSeason_(seasonId) {
  realityTvEnsureQuestionPackSystem_();
  const season = typeof realityTvGetSeason_ === "function" ? realityTvGetSeason_(seasonId) : null;
  const formatId = season ? realityTvShowFormatDefinition_(season.ShowFormat || "survivor-tribal").id : "survivor-tribal";
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_TEMPLATES_SHEET)
    .filter(function(row) {
      return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId) &&
        realityTvQuestionTemplateMatchesFormat_(row, formatId);
    })
    .sort(function(a, b) { return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999); });
}

function realityTvEpisodeQuestionsForSeason_(seasonId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) {
      const episodeDiff = realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0);
      if (episodeDiff) return episodeDiff;
      return realityTvString_(a.QuestionType).localeCompare(realityTvString_(b.QuestionType));
    });
}

function realityTvQuestionQueueForSeason_(seasonId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) { return new Date(b.SubmittedAt || 0).getTime() - new Date(a.SubmittedAt || 0).getTime(); });
}

function realityTvGetEpisodeQuestion_(episodeQuestionId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET).find(function(row) {
    return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(episodeQuestionId);
  }) || null;
}

function realityTvGetQuestionQueue_(queueId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET).find(function(row) {
    return realityTvKey_(row.QueueId) === realityTvKey_(queueId);
  }) || null;
}

function realityTvQuestionBuildJobsForSeason_(seasonId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_BUILD_JOBS_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) {
      return new Date(b.UpdatedAt || b.StartedAt || 0).getTime() - new Date(a.UpdatedAt || a.StartedAt || 0).getTime();
    });
}

function realityTvGetQuestionBuildJob_(buildId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_BUILD_JOBS_SHEET).find(function(row) {
    return realityTvKey_(row.BuildId) === realityTvKey_(buildId);
  }) || null;
}

function realityTvQuestionBuildState_(job) {
  if (!job) return null;
  const status = realityTvString_(job.Status || "BUILDING").toUpperCase();
  const stage = realityTvString_(job.Stage || "BUILD_LOCAL").toUpperCase();
  const total = Math.max(0, realityTvNumber_(job.TotalCount, 0));
  const index = Math.max(0, realityTvNumber_(job.CurrentIndex, 0));
  const results = realityTvQuestionBuildResults_(job);
  return {
    success: true,
    buildId: job.BuildId,
    seasonId: job.SeasonId,
    episodeId: job.EpisodeId,
    managedBy: realityTvString_(job.ManagedBy),
    status: status,
    stage: stage,
    currentIndex: index,
    totalCount: total,
    processedCount: Math.max(0, realityTvNumber_(job.ProcessedCount, 0)),
    skippedCount: Math.max(0, realityTvNumber_(job.SkippedCount, 0)),
    lastTemplateId: realityTvString_(job.LastTemplateId),
    lastMessage: realityTvString_(job.LastMessage),
    results: results,
    builtCount: results.filter(function(item) { return item.status === "BUILT"; }).length,
    existingCount: results.filter(function(item) { return item.status === "ALREADY_EXISTS"; }).length,
    skippedDetails: results.filter(function(item) { return item.status === "SKIPPED" || item.status === "BLOCKED"; }),
    error: realityTvString_(job.ErrorMessage),
    complete: status === "COMPLETE" || stage === "COMPLETE",
    ready: (status === "COMPLETE" || stage === "COMPLETE") && !results.some(function(item) {
      return item.status === "SKIPPED" || item.status === "BLOCKED";
    }),
    progressLabel: Math.min(index, total) + " of " + total + " question types processed"
  };
}

function realityTvQuestionBuildResults_(job) {
  const parsed = realityTvParseJson_(job && job.BuildResultsJSON ? job.BuildResultsJSON : "[]", []);
  return (Array.isArray(parsed) ? parsed : []).map(function(item) {
    return {
      templateId: realityTvKey_(item && item.templateId),
      label: realityTvString_(item && item.label),
      status: realityTvString_(item && item.status || "PENDING").toUpperCase(),
      message: realityTvString_(item && item.message),
      episodeQuestionId: realityTvString_(item && item.episodeQuestionId),
      hubStatus: realityTvString_(item && item.hubStatus),
      updatedAt: realityTvString_(item && item.updatedAt)
    };
  }).filter(function(item) { return item.templateId; });
}

function realityTvSetQuestionBuildResult_(job, template, status, message, episodeQuestionId, hubStatus) {
  const templateId = realityTvKey_(template && (template.TemplateId || template.templateId || template));
  const results = realityTvQuestionBuildResults_(job).filter(function(item) {
    return item.templateId !== templateId;
  });
  results.push({
    templateId: templateId,
    label: realityTvString_(template && (template.Label || template.label)) || templateId,
    status: realityTvString_(status || "PENDING").toUpperCase(),
    message: realityTvString_(message),
    episodeQuestionId: realityTvString_(episodeQuestionId),
    hubStatus: realityTvString_(hubStatus),
    updatedAt: new Date().toISOString()
  });
  return JSON.stringify(results);
}

function realityTvLatestQuestionBuildForSeason_(seasonId, episodeId) {
  return realityTvQuestionBuildJobsForSeason_(seasonId).find(function(row) {
    const status = realityTvString_(row.Status).toUpperCase();
    const episodeMatches = !episodeId || realityTvKey_(row.EpisodeId) === realityTvKey_(episodeId);
    return episodeMatches && status !== "COMPLETE" && status !== "CANCELLED";
  }) || null;
}

function realityTvLatestQuestionBuildStateForSeason_(seasonId, episodeId) {
  return realityTvQuestionBuildState_(realityTvLatestQuestionBuildForSeason_(seasonId, episodeId));
}

function realityTvLatestCompletedQuestionBuildStateForSeason_(seasonId, episodeId) {
  const row = realityTvQuestionBuildJobsForSeason_(seasonId).find(function(item) {
    const episodeMatches = !episodeId || realityTvKey_(item.EpisodeId) === realityTvKey_(episodeId);
    return episodeMatches && realityTvString_(item.Status).toUpperCase() === "COMPLETE";
  }) || null;
  return realityTvQuestionBuildState_(row);
}

function realityTvCancelOtherQuestionBuildsForEpisode_(seasonId, episodeId, keepBuildId) {
  realityTvEnsureQuestionPackSystem_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_BUILD_JOBS_SHEET);
  if (!sheet) return 0;
  let cancelled = 0;
  realityTvQuestionBuildJobsForSeason_(seasonId).forEach(function(row) {
    const status = realityTvString_(row.Status).toUpperCase();
    if (realityTvKey_(row.EpisodeId) !== realityTvKey_(episodeId) ||
        realityTvKey_(row.BuildId) === realityTvKey_(keepBuildId) ||
        status === "COMPLETE" || status === "CANCELLED") return;
    realityTvUpdateObjectRow_(sheet, row.__rowNumber, {
      Status: "CANCELLED",
      LastMessage: "Replaced by a newer question-pack build for this episode.",
      ErrorMessage: "",
      UpdatedAt: new Date()
    });
    cancelled += 1;
  });
  return cancelled;
}

function realityTvHasQuestionBuildTrigger_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return false;
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinuePendingQuestionBuilds";
  });
}

function realityTvScheduleQuestionBuildContinuation_() {
  try {
    if (typeof ScriptApp === "undefined" || realityTvHasQuestionBuildTrigger_()) return false;
    ScriptApp.newTrigger("realityTvContinuePendingQuestionBuilds").timeBased().after(10000).create();
    return true;
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("Reality TV question build trigger warning: " + (err.message || err));
    return false;
  }
}

function realityTvDeleteQuestionBuildTriggers_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinuePendingQuestionBuilds") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function realityTvContinuePendingQuestionBuilds() {
  realityTvEnsureQuestionPackSystem_();
  realityTvDeleteQuestionBuildTriggers_();
  const deadline = Date.now() + (4 * 60 * 1000);
  let pending = false;
  const jobs = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_BUILD_JOBS_SHEET)
    .filter(function(row) {
      const status = realityTvString_(row.Status).toUpperCase();
      const attempts = Math.max(0, realityTvNumber_(row.AttemptCount, 0));
      if (realityTvString_(row.ManagedBy).toUpperCase() === "APPROVAL") return false;
      return status === "BUILDING" || (status === "ERROR" && attempts < 3);
    })
    .sort(function(a, b) {
      return new Date(a.UpdatedAt || a.StartedAt || 0).getTime() - new Date(b.UpdatedAt || b.StartedAt || 0).getTime();
    });
  jobs.forEach(function(row) {
    if (Date.now() >= deadline) { pending = true; return; }
    try {
      let state = realityTvQuestionBuildState_(row);
      let guard = 0;
      while (state && !state.complete && !state.busy && guard < 8 && Date.now() < deadline) {
        state = realityTvContinueQuestionPackBuildStage_(row.BuildId);
        guard += 1;
      }
      if (state && !state.complete) pending = true;
    } catch (err) {
      const refreshed = realityTvGetQuestionBuildJob_(row.BuildId);
      if (refreshed && Math.max(0, realityTvNumber_(refreshed.AttemptCount, 0)) < 3) pending = true;
      if (typeof Logger !== "undefined") Logger.log("Reality TV pending build warning: " + (err.message || err));
    }
  });
  if (pending) realityTvScheduleQuestionBuildContinuation_();
}

function realityTvAdvanceQuestionPackBuild_(state, maxStages, maxMillis, options) {
  options = options || {};
  let current = state;
  const limit = Math.max(1, realityTvNumber_(maxStages, 6));
  const deadline = Date.now() + Math.max(1000, realityTvNumber_(maxMillis, 20000));
  let guard = 0;
  while (current && !current.complete && !current.busy && guard < limit && Date.now() < deadline) {
    current = realityTvContinueQuestionPackBuildStage_(current.buildId);
    guard += 1;
  }
  if (current && !current.complete && options.scheduleContinuation !== false && realityTvString_(current.managedBy).toUpperCase() !== "APPROVAL") {
    realityTvScheduleQuestionBuildContinuation_();
  }
  return current;
}

function realityTvStartQuestionPackBuild_(season, episode, enabledTypes, options) {
  options = options || {};
  realityTvEnsureQuestionPackSystem_();
  const normalized = realityTvEnabledQuestionTypes_(enabledTypes, season.SeasonId);
  const normalizedJson = JSON.stringify(normalized);
  const existing = realityTvQuestionBuildJobsForSeason_(season.SeasonId).find(function(row) {
    const status = realityTvString_(row.Status).toUpperCase();
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId) &&
      realityTvString_(row.EnabledQuestionTypesJSON) === normalizedJson &&
      status !== "COMPLETE" && status !== "CANCELLED";
  });
  if (existing) {
    if (options.managedBy && realityTvString_(existing.ManagedBy).toUpperCase() !== realityTvString_(options.managedBy).toUpperCase()) {
      realityTvUpdateObjectRow_(
        SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_BUILD_JOBS_SHEET),
        existing.__rowNumber,
        { ManagedBy: options.managedBy, UpdatedAt: new Date() }
      );
    }
    const existingState = realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(existing.BuildId));
    if (realityTvString_(existingState.managedBy).toUpperCase() !== "APPROVAL") realityTvScheduleQuestionBuildContinuation_();
    return existingState;
  }

  realityTvCancelOtherQuestionBuildsForEpisode_(season.SeasonId, episode.EpisodeId, "");
  const now = new Date();
  const row = {
    BuildId: realityTvId_("rtq-build"),
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: episode.EpisodeId,
    ManagedBy: realityTvString_(options.managedBy),
    EnabledQuestionTypesJSON: normalizedJson,
    CurrentIndex: 0,
    TotalCount: normalized.length,
    Stage: normalized.length ? "BUILD_LOCAL" : "COMPLETE",
    Status: normalized.length ? "BUILDING" : "COMPLETE",
    ProcessedCount: 0,
    SkippedCount: 0,
    LastTemplateId: "",
    LastEpisodeQuestionId: "",
    LastMessage: normalized.length ? "Question pack build queued." : "Question pack saved; no extra questions are enabled.",
    BuildResultsJSON: "[]",
    ErrorMessage: "",
    AttemptCount: 0,
    StartedAt: now,
    CompletedAt: normalized.length ? "" : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_BUILD_JOBS_SHEET,
    REALITY_TV_QUESTION_BUILD_JOB_HEADERS, ["BuildId"], row);
  if (normalized.length && realityTvString_(options.managedBy).toUpperCase() !== "APPROVAL") realityTvScheduleQuestionBuildContinuation_();
  return realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(row.BuildId));
}

function realityTvEnabledQuestionTypes_(value, seasonId) {
  let parsed = value;
  if (!Array.isArray(parsed)) parsed = realityTvParseJson_(value, []);
  const allowed = {};
  const season = seasonId && typeof realityTvGetSeason_ === "function" ? realityTvGetSeason_(seasonId) : null;
  const formatId = season ? season.ShowFormat : "survivor-tribal";
  realityTvStandardQuestionDefinitionsForFormat_(formatId).forEach(function(item) {
    allowed[realityTvKey_(item.templateId)] = true;
  });
  if (seasonId) {
    realityTvQuestionTemplatesForSeason_(seasonId).forEach(function(item) {
      if (realityTvKey_(item.TemplateSource) === "custom") allowed[realityTvKey_(item.TemplateId)] = true;
    });
  }
  const seen = {};
  return (Array.isArray(parsed) ? parsed : []).map(realityTvKey_).filter(function(type) {
    if (!allowed[type] || seen[type]) return false;
    seen[type] = true;
    return true;
  });
}

function realityTvQuestionPointsMap_(value) {
  let parsed = value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    parsed = realityTvParseJson_(value || "{}", {});
  }
  const result = {};
  Object.keys(parsed || {}).forEach(function(key) {
    const normalized = realityTvKey_(key);
    if (!normalized) return;
    result[normalized] = Math.max(0, realityTvNumber_(parsed[key], 0));
  });
  return result;
}


function realityTvQuestionDisplayMap_(value) {
  let parsed = value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = realityTvParseJson_(value || "{}", {});
  const result = {};
  Object.keys(parsed || {}).forEach(function(key) {
    const normalized = realityTvKey_(key);
    const item = parsed[key] || {};
    result[normalized] = {
      layoutType: realityTvKey_(item.layoutType || item.LayoutType || "auto"),
      imageSource: realityTvKey_(item.imageSource || item.ImageSource || "auto")
    };
  });
  return result;
}

function realityTvNormalizeLayoutType_(value) {
  const key = realityTvKey_(value || "auto");
  return ["auto", "image", "compact", "text", "list"].indexOf(key) !== -1 ? key : "auto";
}

function realityTvNormalizeImageSource_(value) {
  const key = realityTvKey_(value || "auto");
  return ["auto", "roster", "group", "custom", "none"].indexOf(key) !== -1 ? key : "auto";
}

function realityTvSaveStandardQuestionPack_(season, enabledTypes, points, questionPoints, questionDisplay) {
  realityTvEnsureQuestionPackSystem_();
  const enabled = {};
  realityTvEnabledQuestionTypes_(enabledTypes, season.SeasonId).forEach(function(type) { enabled[type] = true; });
  const existing = realityTvQuestionTemplatesForSeason_(season.SeasonId);
  const existingById = {};
  existing.forEach(function(row) { existingById[realityTvKey_(row.TemplateId)] = row; });
  const pointsById = realityTvQuestionPointsMap_(questionPoints || {});
  const displayById = realityTvQuestionDisplayMap_(questionDisplay || {});
  const defaultPoints = Math.max(0, realityTvNumber_(points, realityTvNumber_(season.Points, 1)));
  const now = new Date();
  const formatId = realityTvShowFormatDefinition_(season.ShowFormat || "survivor-tribal").id;
  const rows = realityTvStandardQuestionDefinitionsForFormat_(formatId).map(function(definition) {
    const prior = existingById[definition.templateId];
    const available = (definition.formats || []).indexOf(formatId) !== -1;
    const requestedPoints = Object.prototype.hasOwnProperty.call(pointsById, definition.templateId)
      ? pointsById[definition.templateId]
      : (prior && prior.Points !== "" && prior.Points !== undefined
        ? Math.max(0, realityTvNumber_(prior.Points, defaultPoints))
        : defaultPoints);
    return {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      TemplateId: definition.templateId,
      QuestionType: definition.templateId,
      Label: definition.label,
      HelpText: definition.help || "",
      QuestionTemplate: definition.questionTemplate,
      AnswerSource: definition.answerSource,
      ResultKey: definition.resultKey,
      Points: requestedPoints,
      Enabled: available && !!enabled[definition.templateId],
      DisplayOrder: definition.displayOrder,
      IncludeNoOutcome: !!definition.includeNoOutcome,
      NoOutcomeLabel: definition.noOutcomeLabel || "",
      ShowFormatsJSON: JSON.stringify(definition.formats || []),
      TemplateSource: "preset",
      CustomAnswerOptionsJSON: "",
      LayoutType: realityTvNormalizeLayoutType_((displayById[definition.templateId] || {}).layoutType || (prior && prior.LayoutType) || "auto"),
      ImageSource: realityTvNormalizeImageSource_((displayById[definition.templateId] || {}).imageSource || (prior && prior.ImageSource) || "auto"),
      CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now,
      UpdatedAt: now
    };
  });
  const ss = SpreadsheetApp.getActive();
  realityTvBulkUpsertObjects_(ss, REALITY_TV_QUESTION_TEMPLATES_SHEET,
    REALITY_TV_QUESTION_TEMPLATE_HEADERS, ["SeasonId", "TemplateId"], rows);

  const templateSheet = ss.getSheetByName(REALITY_TV_QUESTION_TEMPLATES_SHEET);
  existing.filter(function(row) { return realityTvKey_(row.TemplateSource) === "custom"; }).forEach(function(row) {
    const templateId = realityTvKey_(row.TemplateId);
    const patch = {
      Enabled: !!enabled[templateId],
      UpdatedAt: now
    };
    if (Object.prototype.hasOwnProperty.call(pointsById, templateId)) patch.Points = pointsById[templateId];
    if (displayById[templateId]) {
      patch.LayoutType = realityTvNormalizeLayoutType_(displayById[templateId].layoutType);
      patch.ImageSource = realityTvNormalizeImageSource_(displayById[templateId].imageSource);
    }
    realityTvUpdateObjectRow_(templateSheet, row.__rowNumber, patch);
  });
  realityTvPrunePresetQuestionTemplatesForSeason_(season.SeasonId, formatId);

  return realityTvQuestionTemplatesForSeason_(season.SeasonId);
}

function realityTvEnsureQuestionTemplateCatalogForSeason_(season) {
  if (!season) return [];
  const existing = realityTvQuestionTemplatesForSeason_(season.SeasonId);
  const enabled = existing.filter(function(row) { return realityTvBool_(row.Enabled); }).map(function(row) { return row.TemplateId; });
  const format = realityTvShowFormatDefinition_(season.ShowFormat || "survivor-tribal");
  const defaults = enabled.length ? enabled : format.defaultQuestionTypes;
  realityTvSaveStandardQuestionPack_(season, defaults, season.Points);
  return realityTvQuestionTemplatesForSeason_(season.SeasonId);
}

function realityTvFormatSupplementalQuestion_(template, season, episodeNumber) {
  const periodLabel = realityTvString_(season.PeriodLabel || "Episode");
  return realityTvString_(template)
    .replace(/\{episode\}/gi, String(episodeNumber))
    .replace(/\{period\}/gi, periodLabel)
    .replace(/\{show\}/gi, realityTvString_(season.ShowName))
    .replace(/\{season\}/gi, realityTvString_(season.SeasonName));
}

function realityTvActiveContestants_(seasonId, episodeNumber) {
  if (typeof realityTvContestantsEligibleForEpisode_ === "function" && episodeNumber) {
    return realityTvContestantsEligibleForEpisode_(seasonId, episodeNumber);
  }
  return realityTvContestantsForSeason_(seasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status || "active") === "active";
  });
}

function realityTvActiveTribes_(seasonId, episodeNumber) {
  const map = {};
  const season = realityTvGetSeason_(seasonId) || {};
  const survivorMode = realityTvKey_(season.ShowFormat || "survivor-tribal") === "survivor-tribal";
  const prefix = survivorMode ? "tribe" : "group";
  const savedGroups = typeof realityTvSyncGroupsFromContestants_ === "function"
    ? realityTvSyncGroupsFromContestants_(season)
    : [];
  const savedByName = {};
  savedGroups.forEach(function(group) { savedByName[realityTvKey_(group.GroupName)] = group; });
  const assignments = typeof realityTvGroupAssignmentsForEpisode_ === "function" && episodeNumber
    ? realityTvGroupAssignmentsForEpisode_(seasonId, episodeNumber)
    : {};
  realityTvActiveContestants_(seasonId, episodeNumber).forEach(function(contestant) {
    const assignment = assignments[realityTvKey_(contestant.ContestantId)] || {};
    const label = realityTvString_(assignment.GroupName || contestant.TeamOrTribe);
    if (!label) return;
    const key = realityTvKey_(label);
    const group = savedByName[key] || {};
    if (!map[key]) {
      map[key] = {
        id: group.GroupId || assignment.GroupId || prefix + "-" + realityTvSlug_(label),
        label: label,
        imageUrl: realityTvString_(group.ImageUrl),
        teamColor: typeof realityTvNormalizeColor_ === "function" ? realityTvNormalizeColor_(group.Color || contestant.TeamColor, "#64748B") : (group.Color || contestant.TeamColor || "#64748B"),
        subjectType: prefix,
        externalSubjectId: group.GroupId || assignment.GroupId || prefix + "-" + realityTvSlug_(label),
        biography: "",
        hometown: "",
        occupation: "",
        status: "ACTIVE"
      };
    }
  });
  return Object.keys(map).sort().map(function(key) { return map[key]; });
}

function realityTvContestantAnswerOptions_(seasonId, episodeNumber) {
  const season = realityTvGetSeason_(seasonId) || {};
  const subjectType = realityTvKey_(season.ParticipantType) === "team" ? "team" : "contestant";
  const groups = typeof realityTvSyncGroupsFromContestants_ === "function" ? realityTvSyncGroupsFromContestants_(season) : [];
  const groupByName = {};
  groups.forEach(function(group) { groupByName[realityTvKey_(group.GroupName)] = group; });
  const assignments = typeof realityTvGroupAssignmentsForEpisode_ === "function" && episodeNumber
    ? realityTvGroupAssignmentsForEpisode_(seasonId, episodeNumber)
    : {};
  return realityTvActiveContestants_(seasonId, episodeNumber).map(function(contestant) {
    const assignment = assignments[realityTvKey_(contestant.ContestantId)] || {};
    const groupName = realityTvString_(assignment.GroupName || contestant.TeamOrTribe);
    const group = groupByName[realityTvKey_(groupName)] || {};
    const profile = typeof realityTvContestantGroupProfile_ === "function"
      ? realityTvContestantGroupProfile_(seasonId, contestant.ContestantId)
      : { startingGroup: groupName, currentGroup: groupName, finalGroup: groupName, history: [] };
    return {
      id: contestant.ContestantId,
      label: contestant.Name,
      imageUrl: contestant.ImageUrl || "",
      teamOrTribe: groupName,
      startingGroup: profile.startingGroup || "",
      currentGroup: profile.currentGroup || "",
      finalGroup: profile.finalGroup || "",
      groupHistory: profile.history || [],
      groupImageUrl: group.ImageUrl || "",
      teamColor: typeof realityTvNormalizeColor_ === "function" ? realityTvNormalizeColor_(contestant.TeamColor || group.Color, "#64748B") : (contestant.TeamColor || group.Color || "#64748B"),
      fullName: contestant.FullName || "",
      age: contestant.Age || "",
      hometown: contestant.Hometown || "",
      occupation: contestant.Occupation || "",
      biography: contestant.Biography || "",
      member1: contestant.Member1 || "",
      member2: contestant.Member2 || "",
      relationship: contestant.Relationship || "",
      member1ImageUrl: contestant.Member1ImageUrl || "",
      member2ImageUrl: contestant.Member2ImageUrl || "",
      status: contestant.Status || "ACTIVE",
      eliminatedEpisode: contestant.EliminatedEpisode || "",
      subjectType: subjectType,
      externalSubjectId: contestant.ExternalSubjectId || contestant.ContestantId
    };
  });
}

function realityTvQuestionAnswerContext_(season, episode) {
  const episodeNumber = episode
    ? realityTvNumber_(episode.EpisodeNumber, 0)
    : realityTvNumber_(season.CurrentEpisodeNumber, 0);
  const contestants = realityTvActiveContestants_(season.SeasonId, episodeNumber);
  const savedGroups = typeof realityTvSyncGroupsFromContestants_ === "function"
    ? realityTvSyncGroupsFromContestants_(season)
    : [];
  const groupByName = {};
  savedGroups.forEach(function(group) {
    groupByName[realityTvKey_(group.GroupName)] = group;
  });
  const assignments = typeof realityTvGroupAssignmentsForEpisode_ === "function" && episodeNumber
    ? realityTvGroupAssignmentsForEpisode_(season.SeasonId, episodeNumber)
    : {};
  const history = typeof realityTvGroupHistoryForSeason_ === "function"
    ? realityTvGroupHistoryForSeason_(season.SeasonId)
    : [];
  const profiles = typeof realityTvContestantGroupProfilesFromHistory_ === "function"
    ? realityTvContestantGroupProfilesFromHistory_(season, history)
    : {};
  const subjectType = realityTvKey_(season.ParticipantType) === "team" ? "team" : "contestant";
  const survivorMode = realityTvKey_(season.ShowFormat || "survivor-tribal") === "survivor-tribal";
  const groupPrefix = survivorMode ? "tribe" : "group";
  const groupMap = {};

  const contestantOptions = contestants.map(function(contestant) {
    const contestantKey = realityTvKey_(contestant.ContestantId);
    const assignment = assignments[contestantKey] || {};
    const groupName = realityTvString_(assignment.GroupName || contestant.TeamOrTribe);
    const group = groupByName[realityTvKey_(groupName)] || {};
    const profile = profiles[contestantKey] || {
      startingGroup: groupName,
      currentGroup: groupName,
      finalGroup: groupName,
      history: []
    };
    if (groupName) {
      const groupKey = realityTvKey_(groupName);
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          id: group.GroupId || assignment.GroupId || groupPrefix + "-" + realityTvSlug_(groupName),
          label: groupName,
          imageUrl: realityTvString_(group.ImageUrl),
          teamColor: typeof realityTvNormalizeColor_ === "function"
            ? realityTvNormalizeColor_(group.Color || contestant.TeamColor, "#64748B")
            : (group.Color || contestant.TeamColor || "#64748B"),
          subjectType: groupPrefix,
          externalSubjectId: group.GroupId || assignment.GroupId || groupPrefix + "-" + realityTvSlug_(groupName),
          biography: "",
          hometown: "",
          occupation: "",
          status: "ACTIVE"
        };
      }
    }
    return {
      id: contestant.ContestantId,
      label: contestant.Name,
      imageUrl: contestant.ImageUrl || "",
      teamOrTribe: groupName,
      startingGroup: profile.startingGroup || "",
      currentGroup: profile.currentGroup || "",
      finalGroup: profile.finalGroup || "",
      groupHistory: profile.history || [],
      groupImageUrl: group.ImageUrl || "",
      teamColor: typeof realityTvNormalizeColor_ === "function"
        ? realityTvNormalizeColor_(contestant.TeamColor || group.Color, "#64748B")
        : (contestant.TeamColor || group.Color || "#64748B"),
      fullName: contestant.FullName || "",
      age: contestant.Age || "",
      hometown: contestant.Hometown || "",
      occupation: contestant.Occupation || "",
      biography: contestant.Biography || "",
      member1: contestant.Member1 || "",
      member2: contestant.Member2 || "",
      relationship: contestant.Relationship || "",
      member1ImageUrl: contestant.Member1ImageUrl || "",
      member2ImageUrl: contestant.Member2ImageUrl || "",
      status: contestant.Status || "ACTIVE",
      eliminatedEpisode: contestant.EliminatedEpisode || "",
      subjectType: subjectType,
      externalSubjectId: contestant.ExternalSubjectId || contestant.ContestantId
    };
  });

  return {
    episodeNumber: episodeNumber,
    contestants: contestantOptions,
    groups: Object.keys(groupMap).sort().map(function(key) { return groupMap[key]; })
  };
}

function realityTvAnswerOptionsForTemplate_(season, template, episode, context) {
  const source = realityTvKey_(template.AnswerSource);
  const episodeNumber = episode ? realityTvNumber_(episode.EpisodeNumber, 0) : realityTvNumber_(season.CurrentEpisodeNumber, 0);
  context = context || null;
  const groups = context && Array.isArray(context.groups)
    ? context.groups
    : realityTvActiveTribes_(season.SeasonId, episodeNumber);
  const contestants = context && Array.isArray(context.contestants)
    ? context.contestants
    : null;
  const contestantOptions = function() {
    return contestants || realityTvContestantAnswerOptions_(season.SeasonId, episodeNumber);
  };
  const individualStart = Math.max(0, realityTvNumber_(season.IndividualPlayStartsEpisode, 0));
  const automaticIndividualPlay = individualStart === 0 && groups.length < 2;
  const isIndividualPeriod = (individualStart > 0 && episodeNumber >= individualStart) || automaticIndividualPlay;
  let options = [];
  if (source === "active-groups" || source === "active-tribes") {
    if (isIndividualPeriod) {
      return {
        options: [],
        skipped: true,
        reason: individualStart > 0
          ? "This group-based question is pre-merge only. Individual play starts in " + realityTvString_(season.PeriodLabel || "Episode") + " " + individualStart + "."
          : "This group-based question was skipped automatically because Team / Tribe information is incomplete: fewer than two active groups remain."
      };
    }
    options = groups;
  } else if (source === "groups-or-participants" || source === "auto-competition") {
    options = isIndividualPeriod
      ? contestantOptions()
      : (groups.length >= 2 ? groups : contestantOptions());
  } else if (source === "yes-no") {
    options = [
      { id: "yes", label: "Yes", imageUrl: "", subjectType: "outcome", externalSubjectId: "yes" },
      { id: "no", label: "No", imageUrl: "", subjectType: "outcome", externalSubjectId: "no" }
    ];
  } else if (source === "manual-options") {
    const manual = realityTvParseJson_(template.CustomAnswerOptionsJSON, []);
    options = manual.map(function(value) {
      const objectValue = value && typeof value === "object" ? value : {};
      const label = realityTvString_(objectValue.label || objectValue.name || objectValue.id || value);
      const id = realityTvSlug_(objectValue.id || label);
      return {
        id: id,
        label: label,
        imageUrl: realityTvString_(objectValue.imageUrl || objectValue.image),
        teamColor: realityTvString_(objectValue.teamColor || objectValue.color),
        biography: realityTvString_(objectValue.biography || objectValue.bio),
        subjectType: "outcome",
        externalSubjectId: id
      };
    }).filter(function(item) { return item.label; });
  } else {
    options = contestantOptions();
  }

  if (realityTvBool_(template.IncludeNoOutcome)) {
    const noLabel = realityTvString_(template.NoOutcomeLabel) || "No one";
    const noId = realityTvSlug_(realityTvString_(template.QuestionType || template.TemplateId) + "-" + noLabel);
    options = options.concat([{ id: noId, label: noLabel, imageUrl: "", subjectType: "outcome", externalSubjectId: noId }]);
  }
  if (options.length < 2) {
    let reason = "This question has fewer than two valid answers.";
    if (source === "active-groups" || source === "active-tribes") {
      reason = groups.length
        ? "Only one active team / tribe is available for this period. Add another group assignment or disable this question."
        : "No active Team / Tribe information was found for this period. Add group membership history or disable this group-based question.";
    } else if (source === "active-participants") {
      reason = "Fewer than two eligible participants remain for this question.";
    }
    return { options: options, skipped: true, reason: reason };
  }
  return { options: options, skipped: false, reason: "" };
}


function realityTvApplyQuestionImageSource_(answerOptions, template) {
  const imageSource = realityTvNormalizeImageSource_(template.ImageSource || "auto");
  return (answerOptions || []).map(function(item) {
    const copy = Object.assign({}, item);
    if (imageSource === "none") copy.imageUrl = "";
    if (imageSource === "group" && ["tribe", "group"].indexOf(realityTvKey_(copy.subjectType)) === -1) copy.imageUrl = copy.groupImageUrl || "";
    if (imageSource === "roster" && ["contestant", "team"].indexOf(realityTvKey_(copy.subjectType)) === -1) copy.imageUrl = "";
    return copy;
  });
}

function realityTvResolvedQuestionLayout_(template, answerOptions) {
  const requested = realityTvNormalizeLayoutType_(template.LayoutType || "auto");
  if (requested !== "auto") return requested;
  return (answerOptions || []).some(function(item) { return realityTvString_(item.imageUrl); }) ? "image" : "text";
}

function realityTvBuildSupplementalQuestionForTemplate_(season, episode, template, options) {
  options = options || {};
  const answerBundle = realityTvAnswerOptionsForTemplate_(season, template, episode);
  answerBundle.options = realityTvApplyQuestionImageSource_(answerBundle.options, template);
  const resolvedLayout = realityTvResolvedQuestionLayout_(template, answerBundle.options);
  if (answerBundle.skipped || answerBundle.options.length < 2) {
    return {
      success: true,
      skipped: true,
      reason: answerBundle.reason || "Not enough answer options.",
      templateId: template.TemplateId
    };
  }

  const type = realityTvSlug_(template.QuestionType || template.TemplateId);
  const categoryId = "episode-" + episode.EpisodeNumber + "-" + type;
  const episodeQuestionId = episode.EpisodeId + "-" + type;
  const externalMarketId = season.GameId + "-episode-" + episode.EpisodeNumber + "-" + type;
  const question = realityTvFormatSupplementalQuestion_(template.QuestionTemplate, season, episode.EpisodeNumber);
  const setup = options.setup || adminGetGameSetup({ gameId: season.GameId });
  const categories = setup.categories || [];
  let category = categories.find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
  });
  const prior = realityTvGetEpisodeQuestion_(episodeQuestionId);
  const questionPoints = Math.max(0, realityTvNumber_(template.Points, realityTvNumber_(season.Points, 1)));
  let createdCategory = false;

  if (!category) {
    try {
      adminCreateCategory({
        gameId: season.GameId,
        category: question,
        categoryId: categoryId,
        section: realityTvString_(season.PeriodLabel || "Episode") + " " + episode.EpisodeNumber,
        points: questionPoints,
        maxChanges: realityTvPickRules_(season).maxChanges,
        changePenalty: realityTvPickRules_(season).changePenalty,
        locked: false,
        lockDateTime: episode.LockDateTime,
        displayOrder: (realityTvNumber_(episode.EpisodeNumber, 0) * 100) + realityTvNumber_(template.DisplayOrder, 50),
        groupId: "reality-tv-" + realityTvSlug_(season.PeriodLabel || "episode") + "-" + episode.EpisodeNumber,
        layoutType: resolvedLayout,
        shortName: realityTvString_(template.Label || template.QuestionType).replace(/-/g, " "),
        countsAsStatue: false,
        questionType: "reality-" + type,
        scoringEngine: "manual",
        selectionMode: "single",
        scoreMode: "fixed-points",
        oddsMode: "none",
        resultSource: "external-results-hub",
        settlementStatus: "pending",
        maxSelections: 1,
        minSelections: 1,
        allowDraw: false,
        allowPush: true,
        resultSourceType: "reality-tv",
        resultProvider: "manual-reality-tv",
        externalEventId: episode.ExternalEventId,
        externalMarketId: externalMarketId,
        statKey: template.ResultKey,
        autoSettle: false,
        requireAdminReview: true,
        sourceConfigJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          episodeQuestionId: episodeQuestionId,
          questionType: template.QuestionType
        })
      });
      createdCategory = true;
      category = categories.find(function(item) {
        return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
      });
      if (!category) {
        category = {
          categoryId: categoryId,
          category: question,
          section: realityTvString_(season.PeriodLabel || "Episode") + " " + episode.EpisodeNumber,
          nominees: []
        };
        categories.push(category);
      }
    } catch (err) {
      if (!/already exists/i.test(err.message || String(err))) throw err;
      const refreshed = adminGetGameSetup({ gameId: season.GameId });
      category = (refreshed.categories || []).find(function(item) {
        return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
      });
      if (!category) throw err;
    }
  }

  if (!prior || realityTvKey_(prior.Status || "open") !== "final") {
    adminUpdateCategory({
      gameId: season.GameId,
      categoryId: categoryId,
      category: question,
      points: questionPoints,
      maxChanges: realityTvPickRules_(season).maxChanges,
      changePenalty: realityTvPickRules_(season).changePenalty,
      lockDateTime: episode.LockDateTime,
      layoutType: resolvedLayout
    });
  }

  const existingNominees = {};
  (category.nominees || []).forEach(function(item) { existingNominees[realityTvKey_(item.nomineeId)] = true; });
  const missing = answerBundle.options.filter(function(item) { return !existingNominees[realityTvKey_(item.id)]; });
  if (missing.length) {
    adminBulkCreateNominees({
      gameId: season.GameId,
      categoryId: categoryId,
      category: question,
      section: realityTvString_(season.PeriodLabel || "Episode") + " " + episode.EpisodeNumber,
      itemsJSON: JSON.stringify(missing.map(function(item) {
        return {
          nominee: item.label,
          nomineeId: item.id,
          shortAnswer: item.label,
          fileId: "",
          logoUrl: item.imageUrl || "",
          person: item.subjectType === "contestant" ? item.label : "",
          active: true
        };
      }))
    });
    category.nominees = (category.nominees || []).concat(missing.map(function(item) {
      return { nomineeId: item.id, nominee: item.label };
    }));
  }

  const now = new Date();
  const row = {
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: episode.EpisodeId,
    EpisodeNumber: episode.EpisodeNumber,
    EpisodeQuestionId: episodeQuestionId,
    TemplateId: template.TemplateId,
    QuestionType: template.QuestionType,
    QuestionText: question,
    CategoryId: categoryId,
    AnswerSource: template.AnswerSource,
    AnswerOptionsJSON: JSON.stringify(answerBundle.options),
    ResultKey: template.ResultKey,
    ExternalEventId: episode.ExternalEventId,
    ExternalMarketId: externalMarketId,
    Status: prior && prior.Status ? prior.Status : "OPEN",
    WinningOutcomeIds: prior && prior.WinningOutcomeIds ? prior.WinningOutcomeIds : "",
    ResultQueueId: prior && prior.ResultQueueId ? prior.ResultQueueId : "",
    TemplateSource: template.TemplateSource || "preset",
    Points: prior && realityTvKey_(prior.Status || "open") === "final"
      ? Math.max(0, realityTvNumber_(prior.Points, questionPoints))
      : questionPoints,
    LayoutType: resolvedLayout,
    ImageSource: realityTvNormalizeImageSource_(template.ImageSource || "auto"),
    CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET,
    REALITY_TV_EPISODE_QUESTION_HEADERS, ["EpisodeQuestionId"], row);

  let hubSync = { success: true, skipped: true };
  if (!options.skipHubSync) {
    hubSync = realityTvSyncSupplementalQuestionToHub_(season, episode, row, answerBundle.options);
  }
  return {
    success: true,
    skipped: false,
    question: row,
    answerOptions: answerBundle.options,
    createdCategory: createdCategory,
    nomineesCreated: missing.length,
    hubWarning: hubSync && hubSync.error ? hubSync.error : ""
  };
}


function realityTvBulkUpsertCategorySettings_(payloads) {
  const items = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
  if (!items.length) return { updated: 0, appended: 0, total: 0 };
  adminCatEnsureHybridHeaders_();
  const sheet = getCategorySettingsSheet_();
  const data = sheet.getDataRange().getValues();
  if (!data.length) throw new Error("CategorySettings sheet is empty.");
  const headers = data[0].map(function(header) { return String(header || "").trim(); });
  const col = getCategorySettingsColumnMap_(headers);
  validateCategorySettingsColumns_(col);
  const body = data.slice(1);
  let updated = 0;
  let appended = 0;

  items.forEach(function(payload) {
    adminCatValidateQuestionSettingsPayload_(payload);
    const matches = adminCatFindSettingsRows_(data, col, payload.gameId, payload.categoryId);
    const row = adminCatBuildSettingsRow_(headers, col, payload);
    if (matches.length) {
      matches.forEach(function(rowNumber) {
        body[rowNumber - 2] = row.slice();
        updated += 1;
      });
    } else {
      body.push(row);
      data.push(row);
      appended += 1;
    }
  });

  if (body.length) {
    sheet.getRange(2, 1, body.length, headers.length).setValues(body);
  }
  return { updated: updated, appended: appended, total: items.length };
}

function realityTvBulkQuestionBuildResult_(template, status, message, episodeQuestionId) {
  return {
    templateId: realityTvKey_(template.TemplateId),
    label: realityTvString_(template.Label || template.QuestionType || template.TemplateId),
    status: status,
    message: message,
    episodeQuestionId: episodeQuestionId || "",
    hubStatus: "DEFERRED",
    updatedAt: new Date().toISOString()
  };
}

function realityTvFinalizeBulkQuestionBuildJob_(season, episode, enabledTypes, buildId, results, counts, managedBy) {
  const now = new Date();
  let job = buildId ? realityTvGetQuestionBuildJob_(buildId) : null;
  if (!job) {
    const state = realityTvStartQuestionPackBuild_(season, episode, enabledTypes, {
      managedBy: managedBy || "BULK"
    });
    buildId = state.buildId;
    job = realityTvGetQuestionBuildJob_(buildId);
  }
  if (!job) return null;
  realityTvUpdateObjectRow_(
    SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_BUILD_JOBS_SHEET),
    job.__rowNumber,
    {
      ManagedBy: managedBy || job.ManagedBy || "BULK",
      CurrentIndex: enabledTypes.length,
      TotalCount: enabledTypes.length,
      Stage: "COMPLETE",
      Status: "COMPLETE",
      ProcessedCount: counts.built,
      SkippedCount: counts.skipped,
      LastTemplateId: enabledTypes.length ? enabledTypes[enabledTypes.length - 1] : "",
      LastEpisodeQuestionId: results.length ? results[results.length - 1].episodeQuestionId : "",
      LastMessage: "Episode question pack was compiled and written in one bulk pass.",
      ErrorMessage: "",
      AttemptCount: realityTvNumber_(job.AttemptCount, 0) + 1,
      CompletedAt: now,
      UpdatedAt: now,
      BuildResultsJSON: JSON.stringify(results)
    }
  );
  return realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(buildId));
}

function realityTvMaterializeEpisodeQuestionPackFallback_(season, episode, templates, options) {
  const setup = typeof adminGetGameSetup === "function"
    ? adminGetGameSetup({ gameId: season.GameId })
    : { categories: [] };
  const questions = [];
  const results = [];
  let skipped = 0;
  templates.forEach(function(template) {
    const result = realityTvBuildSupplementalQuestionForTemplate_(season, episode, template, {
      setup: setup,
      skipHubSync: true
    });
    if (result.skipped) {
      skipped += 1;
      results.push(realityTvBulkQuestionBuildResult_(template, "SKIPPED", result.reason || "Not enough valid answers.", ""));
      return;
    }
    questions.push(result.question);
    results.push(realityTvBulkQuestionBuildResult_(
      template,
      result.createdCategory ? "BUILT" : "ALREADY_EXISTS",
      result.createdCategory ? "Question and answers were added." : "Question and answers were verified.",
      result.question.EpisodeQuestionId
    ));
  });
  const enabledTypes = templates.map(function(template) { return realityTvKey_(template.TemplateId); });
  const buildState = realityTvFinalizeBulkQuestionBuildJob_(
    season,
    episode,
    enabledTypes,
    options && options.buildId,
    results,
    { built: questions.length, skipped: skipped },
    options && options.managedBy || "COMPATIBILITY"
  );
  return {
    success: true,
    complete: true,
    buildId: buildState ? buildState.buildId : (options && options.buildId || ""),
    currentIndex: templates.length,
    totalCount: templates.length,
    built: questions.length,
    skipped: skipped,
    questions: questions,
    results: results,
    skippedDetails: results.filter(function(item) { return item.status === "SKIPPED" || item.status === "BLOCKED"; }),
    lastMessage: "Extra Questions were created with the compatibility builder.",
    message: "Extra Questions were created with the compatibility builder."
  };
}

function realityTvMaterializeEpisodeQuestionPackBulk_(season, episode, options) {
  options = options || {};
  realityTvEnsureQuestionPackSystem_();
  const requestedIds = Array.isArray(options.enabledTypes)
    ? options.enabledTypes.map(realityTvKey_).filter(Boolean)
    : null;
  const requestedMap = {};
  (requestedIds || []).forEach(function(id) { requestedMap[id] = true; });
  const templates = realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) {
    const id = realityTvKey_(row.TemplateId);
    return realityTvBool_(row.Enabled) && (!requestedIds || requestedMap[id]);
  }).sort(function(a, b) {
    return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999);
  });
  const enabledTypes = templates.map(function(row) { return realityTvKey_(row.TemplateId); });
  const bulkInfrastructureReady =
    typeof getCategoriesSheet_ === "function" &&
    typeof getCategorySettingsSheet_ === "function" &&
    typeof adminCatBuildNomineeRow_ === "function" &&
    typeof adminCatBuildSettingsRow_ === "function" &&
    typeof normalizedStorageGetQuestionSetup_ === "function" &&
    typeof normalizedStorageQuestionObject_ === "function" &&
    typeof normalizedStorageOptionObject_ === "function" &&
    typeof normalizedStorageUpsertOptionsBulk_ === "function";
  if (templates.length && !bulkInfrastructureReady) {
    return realityTvMaterializeEpisodeQuestionPackFallback_(season, episode, templates, options);
  }
  if (!templates.length) {
    const emptyBuild = realityTvFinalizeBulkQuestionBuildJob_(season, episode, [], options.buildId, [], { built: 0, skipped: 0 }, options.managedBy);
    return {
      success: true,
      complete: true,
      buildId: emptyBuild ? emptyBuild.buildId : "",
      currentIndex: 0,
      totalCount: 0,
      built: 0,
      skipped: 0,
      questions: [],
      results: [],
      skippedDetails: [],
      message: "No Extra Questions are enabled for this episode."
    };
  }

  if (typeof options.checkpoint === "function") options.checkpoint("COMPILING QUESTION PACK");
  const answerContext = realityTvQuestionAnswerContext_(season, episode);
  const normalizedSetup = typeof normalizedStorageGetQuestionSetup_ === "function"
    ? normalizedStorageGetQuestionSetup_(season.GameId, {
        syncLegacy: false,
        bypassRuntimeCache: true,
        trustIndex: false
      })
    : { questions: [], options: [] };
  const normalizedQuestionMap = {};
  (normalizedSetup.questions || []).forEach(function(row) {
    normalizedQuestionMap[realityTvKey_(row.QuestionId)] = row;
  });
  const normalizedOptionMap = {};
  (normalizedSetup.options || []).forEach(function(row) {
    normalizedOptionMap[realityTvKey_(row.QuestionId) + "||" + realityTvKey_(row.OptionId)] = row;
  });
  const priorQuestions = {};
  realityTvEpisodeQuestionsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId);
  }).forEach(function(row) {
    priorQuestions[realityTvKey_(row.EpisodeQuestionId)] = row;
  });

  const categoriesSheet = getCategoriesSheet_();
  const categoryData = categoriesSheet.getDataRange().getValues();
  if (!categoryData.length) throw new Error("Categories sheet is empty.");
  const categoryHeaders = categoryData[0].map(function(header) { return String(header || "").trim(); });
  const categoryCol = getCategoriesColumnMap_(categoryHeaders);
  validateCategoriesColumns_(categoryCol);
  const legacyNomineeMap = {};
  for (let rowIndex = 1; rowIndex < categoryData.length; rowIndex += 1) {
    const row = categoryData[rowIndex];
    if (adminCatNormalizeGameId_(row[categoryCol.gameId]) !== adminCatNormalizeGameId_(season.GameId)) continue;
    const categoryId = adminCatNormalizeId_(row[categoryCol.categoryId]);
    const nomineeId = adminCatNormalizeId_(row[categoryCol.nomineeId]);
    if (categoryId && nomineeId) legacyNomineeMap[categoryId + "||" + nomineeId] = true;
  }

  const now = new Date();
  const section = realityTvString_(season.PeriodLabel || "Episode") + " " + episode.EpisodeNumber;
  const pickRules = realityTvPickRules_(season);
  const normalizedQuestions = [];
  const normalizedOptions = [];
  const settingsPayloads = [];
  const legacyNomineeRows = [];
  const episodeQuestionRows = [];
  const results = [];
  const builtQuestions = [];
  let skipped = 0;

  templates.forEach(function(template) {
    const answerBundle = realityTvAnswerOptionsForTemplate_(season, template, episode, answerContext);
    answerBundle.options = realityTvApplyQuestionImageSource_(answerBundle.options, template);
    const resolvedLayout = realityTvResolvedQuestionLayout_(template, answerBundle.options);
    if (answerBundle.skipped || answerBundle.options.length < 2) {
      skipped += 1;
      results.push(realityTvBulkQuestionBuildResult_(
        template,
        "SKIPPED",
        answerBundle.reason || "Not enough valid answers.",
        ""
      ));
      return;
    }

    const type = realityTvSlug_(template.QuestionType || template.TemplateId);
    const categoryId = "episode-" + episode.EpisodeNumber + "-" + type;
    const episodeQuestionId = episode.EpisodeId + "-" + type;
    const externalMarketId = season.GameId + "-episode-" + episode.EpisodeNumber + "-" + type;
    const questionText = realityTvFormatSupplementalQuestion_(template.QuestionTemplate, season, episode.EpisodeNumber);
    const questionPoints = Math.max(0, realityTvNumber_(template.Points, realityTvNumber_(season.Points, 1)));
    const prior = priorQuestions[realityTvKey_(episodeQuestionId)] || null;
    const sourceConfigJSON = JSON.stringify({
      seasonId: season.SeasonId,
      episodeId: episode.EpisodeId,
      episodeQuestionId: episodeQuestionId,
      questionType: template.QuestionType
    });

    if (typeof normalizedStorageQuestionObject_ === "function") {
      normalizedQuestions.push(normalizedStorageQuestionObject_({
        gameId: season.GameId,
        questionId: categoryId,
        question: questionText,
        section: section,
        categoryImage: "",
        active: true,
        predictionGame: true,
        communityRank: false,
        questionType: "reality-" + type,
        scoringEngine: "manual",
        selectionMode: "single",
        entryType: "",
        oddsMode: "none",
        resultSource: "external-results-hub",
        payloadJSON: sourceConfigJSON,
        sourceSystem: "reality-tv-bulk"
      }, normalizedQuestionMap[realityTvKey_(categoryId)] || null));
    }

    if (!prior || realityTvKey_(prior.Status || "open") !== "final") settingsPayloads.push({
      gameId: season.GameId,
      categoryId: categoryId,
      points: questionPoints,
      locked: false,
      winnerNomineeId: "",
      changePenalty: pickRules.changePenalty,
      maxChanges: pickRules.maxChanges,
      lockDateTime: episode.LockDateTime,
      displayOrder: (realityTvNumber_(episode.EpisodeNumber, 0) * 100) + realityTvNumber_(template.DisplayOrder, 50),
      groupId: "reality-tv-" + realityTvSlug_(season.PeriodLabel || "episode") + "-" + episode.EpisodeNumber,
      parentCategoryId: "",
      followUpCategoryId: "",
      followUpMapJSON: "",
      layoutType: resolvedLayout,
      shortName: realityTvString_(template.Label || template.QuestionType).replace(/-/g, " "),
      countsAsStatue: false,
      scoreVersion: "",
      favoriteNomineeId: "",
      questionType: "reality-" + type,
      scoringEngine: "manual",
      selectionMode: "single",
      scoreMode: "fixed-points",
      oddsMode: "none",
      resultSource: "external-results-hub",
      settlementStatus: "pending",
      maxSelections: 1,
      minSelections: 1,
      allowDraw: false,
      allowPush: true,
      resultSourceType: "reality-tv",
      resultProvider: "manual-reality-tv",
      externalEventId: episode.ExternalEventId,
      externalMarketId: externalMarketId,
      externalSubjectId: "",
      statKey: template.ResultKey,
      comparisonOperator: "",
      threshold: "",
      autoSettle: false,
      requireAdminReview: true,
      sourceUrl: "",
      sourceConfigJSON: sourceConfigJSON
    });

    answerBundle.options.forEach(function(item, optionIndex) {
      const optionKey = realityTvKey_(categoryId) + "||" + realityTvKey_(item.id);
      if (typeof normalizedStorageOptionObject_ === "function") {
        normalizedOptions.push(normalizedStorageOptionObject_({
          gameId: season.GameId,
          questionId: categoryId,
          optionId: item.id,
          option: item.label,
          shortAnswer: item.label,
          fileId: "",
          logoUrl: item.imageUrl || "",
          movieId: "",
          movie: "",
          person: item.subjectType === "contestant" ? item.label : "",
          active: true,
          displayOrder: optionIndex + 1,
          payloadJSON: JSON.stringify({ subjectType: item.subjectType || "", externalSubjectId: item.externalSubjectId || item.id }),
          sourceSystem: "reality-tv-bulk"
        }, normalizedOptionMap[optionKey] || null));
      }
      const legacyKey = realityTvKey_(categoryId) + "||" + realityTvKey_(item.id);
      if (!legacyNomineeMap[legacyKey]) {
        legacyNomineeMap[legacyKey] = true;
        legacyNomineeRows.push(adminCatBuildNomineeRow_(categoryHeaders, categoryCol, {
          gameId: season.GameId,
          categoryId: categoryId,
          category: questionText,
          nominee: item.label,
          nomineeId: item.id,
          section: section,
          fileId: "",
          shortAnswer: item.label,
          categoryImage: "",
          movieId: "",
          movie: "",
          person: item.subjectType === "contestant" ? item.label : "",
          active: true,
          predictionGame: true,
          communityRank: false
        }));
      }
    });

    const episodeQuestionRow = {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      EpisodeId: episode.EpisodeId,
      EpisodeNumber: episode.EpisodeNumber,
      EpisodeQuestionId: episodeQuestionId,
      TemplateId: template.TemplateId,
      QuestionType: template.QuestionType,
      QuestionText: questionText,
      CategoryId: categoryId,
      AnswerSource: template.AnswerSource,
      AnswerOptionsJSON: JSON.stringify(answerBundle.options),
      ResultKey: template.ResultKey,
      ExternalEventId: episode.ExternalEventId,
      ExternalMarketId: externalMarketId,
      Status: prior && prior.Status ? prior.Status : "OPEN",
      WinningOutcomeIds: prior && prior.WinningOutcomeIds ? prior.WinningOutcomeIds : "",
      ResultQueueId: prior && prior.ResultQueueId ? prior.ResultQueueId : "",
      TemplateSource: template.TemplateSource || "preset",
      Points: prior && realityTvKey_(prior.Status || "open") === "final"
        ? Math.max(0, realityTvNumber_(prior.Points, questionPoints))
        : questionPoints,
      LayoutType: resolvedLayout,
      ImageSource: realityTvNormalizeImageSource_(template.ImageSource || "auto"),
      CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now,
      UpdatedAt: now
    };
    episodeQuestionRows.push(episodeQuestionRow);
    builtQuestions.push(episodeQuestionRow);
    results.push(realityTvBulkQuestionBuildResult_(
      template,
      prior ? "ALREADY_EXISTS" : "BUILT",
      prior ? "Question and answers were verified in the bulk pass." : "Question and answers were added in the bulk pass.",
      episodeQuestionId
    ));
  });

  if (typeof options.checkpoint === "function") options.checkpoint("WRITING QUESTION PACK");
  const documentLock = LockService.getDocumentLock();
  documentLock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive();
    if (normalizedQuestions.length) {
      realityTvBulkUpsertObjects_(ss, QUESTIONS_SHEET, QUESTIONS_HEADERS, ["GameId", "QuestionId"], normalizedQuestions);
      if (typeof normalizedStorageRebuildIndexForSheet_ === "function") {
        normalizedStorageRebuildIndexForSheet_(QUESTIONS_SHEET, "Questions");
      }
    }
    realityTvBulkUpsertCategorySettings_(settingsPayloads);
    if (legacyNomineeRows.length) {
      categoriesSheet.getRange(categoriesSheet.getLastRow() + 1, 1, legacyNomineeRows.length, categoryHeaders.length)
        .setValues(legacyNomineeRows);
    }
    if (normalizedOptions.length && typeof normalizedStorageUpsertOptionsBulk_ === "function") {
      normalizedStorageUpsertOptionsBulk_(normalizedOptions);
    }
    realityTvBulkUpsertObjects_(
      ss,
      REALITY_TV_EPISODE_QUESTIONS_SHEET,
      REALITY_TV_EPISODE_QUESTION_HEADERS,
      ["EpisodeQuestionId"],
      episodeQuestionRows
    );
    SpreadsheetApp.flush();
  } finally {
    documentLock.releaseLock();
  }

  if (typeof options.checkpoint === "function") options.checkpoint("VERIFYING QUESTION PACK");
  adminCatClearCaches_();
  if (typeof normalizedStorageClearCaches_ === "function") normalizedStorageClearCaches_();
  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  const buildState = realityTvFinalizeBulkQuestionBuildJob_(
    season,
    episode,
    enabledTypes,
    options.buildId,
    results,
    { built: builtQuestions.length, skipped: skipped },
    options.managedBy || "BULK"
  );
  const hubSync = typeof realityTvSyncAllSupplementalQuestionsToHub_ === "function"
    ? realityTvSyncAllSupplementalQuestionsToHub_(season, episode)
    : { success: false, skipped: true };
  return {
    success: true,
    complete: true,
    buildId: buildState ? buildState.buildId : "",
    currentIndex: enabledTypes.length,
    totalCount: enabledTypes.length,
    built: builtQuestions.length,
    skipped: skipped,
    questions: builtQuestions,
    results: results,
    skippedDetails: results.filter(function(item) { return item.status === "SKIPPED" || item.status === "BLOCKED"; }),
    hubSync: hubSync,
    hubWarning: hubSync && hubSync.error ? hubSync.error : "",
    lastMessage: "All enabled Extra Questions and answers were written in one bulk pass.",
    message: "All enabled Extra Questions and answers were written in one bulk pass."
  };
}

function realityTvBuildSupplementalQuestionsForEpisode_(season, episode, options) {
  options = options || {};
  const result = realityTvMaterializeEpisodeQuestionPackBulk_(season, episode, {
    enabledTypes: options.enabledTypes,
    buildId: options.buildId,
    managedBy: options.managedBy || "BULK",
    checkpoint: options.checkpoint
  });
  return {
    success: true,
    complete: true,
    buildId: result.buildId,
    created: result.built,
    skipped: result.skipped,
    questions: result.questions,
    results: result.results,
    hubWarning: "",
    message: result.message
  };
}


function realityTvSupplementalHubEntriesForEpisode_(season, episode) {
  if (!season || !episode) return [];
  return realityTvEpisodeQuestionsForSeason_(season.SeasonId)
    .filter(function(row) {
      return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId);
    })
    .map(function(question) {
      return {
        question: question,
        answerOptions: realityTvParseJson_(question.AnswerOptionsJSON || "[]", [])
      };
    });
}

function realityTvBuildSupplementalHubPayload_(season, episode, items) {
  const now = new Date();
  const entries = Array.isArray(items) ? items.filter(function(item) {
    return item && item.question;
  }) : [];
  const marketRows = [];
  const subjectByKey = {};
  const mappingRows = [];

  entries.forEach(function(entry) {
    const question = entry.question;
    const answerOptions = Array.isArray(entry.answerOptions)
      ? entry.answerOptions
      : realityTvParseJson_(question.AnswerOptionsJSON || "[]", []);
    const winnerIds = realityTvParseJson_(question.WinningOutcomeIds || "[]", []);
    const normalizedWinnerIds = Array.isArray(winnerIds)
      ? winnerIds.map(realityTvKey_)
      : realityTvString_(question.WinningOutcomeIds).split(",").map(realityTvKey_).filter(Boolean);
    const winningLabels = answerOptions.filter(function(item) {
      return normalizedWinnerIds.indexOf(realityTvKey_(item.id)) !== -1;
    }).map(function(item) { return item.label; });
    const isFinal = realityTvKey_(question.Status) === "final";

    marketRows.push({
      Provider: "manual-reality-tv",
      ExternalMarketId: question.ExternalMarketId,
      ExternalEventId: episode.ExternalEventId,
      MarketQuestion: question.QuestionText,
      OutcomesJSON: JSON.stringify(answerOptions.map(function(item) { return item.label; })),
      PricesJSON: "{}",
      ClosingTime: episode.LockDateTime,
      ResolutionStatus: isFinal ? "resolved" : "pending",
      WinningOutcome: winningLabels.join(", "),
      ResolutionSource: "manual-reality-tv",
      SourceUrl: "",
      LastUpdated: now,
      RawJSON: JSON.stringify({
        seasonId: season.SeasonId,
        episodeId: episode.EpisodeId,
        episodeQuestionId: question.EpisodeQuestionId,
        questionType: question.QuestionType,
        templateId: question.TemplateId || ""
      }),
      CreatedAt: question.CreatedAt || now
    });

    answerOptions.forEach(function(item) {
      const externalSubjectId = item.subjectType === "outcome" ? "" : (item.externalSubjectId || item.id);
      if (externalSubjectId) {
        const subjectKey = realityTvKey_(externalSubjectId);
        subjectByKey[subjectKey] = {
          Provider: "manual-reality-tv",
          ExternalSubjectId: externalSubjectId,
          Name: item.label,
          SubjectType: item.subjectType || "subject",
          ImageUrl: item.imageUrl || "",
          MetadataJSON: JSON.stringify({
            seasonId: season.SeasonId,
            episodeId: episode.EpisodeId,
            questionType: question.QuestionType
          }),
          SourceUrl: "",
          LastUpdated: now,
          CreatedAt: now
        };
      }
      mappingRows.push({
        MappingId: season.GameId + "-" + question.CategoryId + "-" + item.id,
        AppGameId: season.GameId,
        CategoryId: question.CategoryId,
        NomineeId: item.id,
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        ExternalMarketId: question.ExternalMarketId,
        ExternalSubjectId: externalSubjectId,
        ResultKey: question.ResultKey,
        ComparisonOperator: "eq",
        Threshold: "",
        ExpectedOutcome: item.label,
        AutoSettle: false,
        RequireAdminReview: true,
        SourceUrl: "",
        SourceConfigJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          episodeQuestionId: question.EpisodeQuestionId,
          questionType: question.QuestionType,
          templateId: question.TemplateId || ""
        }),
        Active: true,
        CreatedAt: now,
        UpdatedAt: now
      });
    });
  });

  return {
    event: {
      Provider: "manual-reality-tv",
      ExternalEventId: episode.ExternalEventId,
      EventName: season.ShowName + " " + episode.EpisodeName,
      EventType: "reality-tv",
      StartDate: episode.AirDateTime,
      EndDate: episode.AirDateTime,
      Status: realityTvString_(episode.Status || "scheduled").toLowerCase(),
      SourceUrl: "",
      LastUpdated: now,
      RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
      CreatedAt: episode.CreatedAt || now
    },
    markets: marketRows,
    subjects: Object.keys(subjectByKey).map(function(key) { return subjectByKey[key]; }),
    mappings: mappingRows,
    replaceQuestionPack: true,
    mainExternalMarketId: episode.ExternalMarketId,
    seasonId: season.SeasonId,
    episodeId: episode.EpisodeId
  };
}

function realityTvSyncSupplementalQuestionsToHubBatch_(season, episode, items) {
  if (!realityTvGetHubId_() || typeof externalResultsBridgeEnqueue_ !== "function") {
    return { success: false, skipped: true, message: "External Results Hub is not configured." };
  }
  const entries = Array.isArray(items) ? items.filter(Boolean) : [];
  const payload = realityTvBuildSupplementalHubPayload_(season, episode, entries);
  const queued = externalResultsBridgeEnqueue_(
    "UPSERT_REALITY_QUESTION_PACK",
    (episode.ExternalEventId || episode.EpisodeId) + ":question-pack",
    "manual-reality-tv",
    payload
  );
  return {
    success: !!(queued && queued.success),
    queued: !!(queued && queued.queued),
    skipped: !!(queued && queued.skipped),
    jobId: queued && queued.jobId || "",
    markets: payload.markets.length,
    mappings: payload.mappings.length,
    error: queued && queued.error || "",
    message: queued && queued.message || "Reality TV question pack queued for Hub mirroring."
  };
}

function realityTvSyncAllSupplementalQuestionsToHub_(season, episode) {
  return realityTvSyncSupplementalQuestionsToHubBatch_(
    season,
    episode,
    realityTvSupplementalHubEntriesForEpisode_(season, episode)
  );
}

function realityTvSyncSupplementalQuestionToHub_(season, episode, question, answerOptions) {
  return realityTvSyncSupplementalQuestionsToHubBatch_(season, episode, [{
    question: question,
    answerOptions: answerOptions || []
  }]);
}

function realityTvCreateSupplementalHubPendingResult_(season, episode, question, outcome, evidenceUrl, notes) {
  if (!realityTvGetHubId_() || typeof externalResultsBridgeEnqueue_ !== "function") {
    return { importedResultId: "", reviewId: "", skipped: true };
  }
  const now = new Date();
  const importedResultId = realityTvId_("rtq-result");
  const reviewId = realityTvId_("rtq-review");
  const outcomeIds = Array.isArray(outcome && outcome.ids) ? outcome.ids : [outcome && outcome.id].filter(Boolean);
  const outcomeLabels = Array.isArray(outcome && outcome.labels) ? outcome.labels : [outcome && outcome.label].filter(Boolean);
  const resultValue = realityTvString_(outcome && outcome.label) || outcomeLabels.join(", ");
  const fingerprint = ["manual-reality-tv", question.ExternalEventId, question.ExternalMarketId, resultValue].join("|").toLowerCase();
  const queued = externalResultsBridgeEnqueue_(
    "CREATE_RESULT_REVIEW",
    importedResultId,
    "manual-reality-tv",
    {
      importedResult: {
        ImportedResultId: importedResultId,
        Provider: "manual-reality-tv",
        ExternalEventId: question.ExternalEventId,
        ExternalMarketId: question.ExternalMarketId,
        ResultKey: question.ResultKey,
        ResultValue: resultValue,
        Finality: "FINAL",
        WinningOutcome: resultValue,
        ProviderTimestamp: now,
        ImportedAt: now,
        EvidenceUrl: evidenceUrl || "",
        SourceUrl: evidenceUrl || "",
        RawJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          episodeQuestionId: question.EpisodeQuestionId,
          questionType: question.QuestionType,
          outcomeId: outcome && outcome.id || "",
          outcomeIds: outcomeIds,
          outcomeLabels: outcomeLabels
        }),
        ReviewStatus: "PENDING",
        ReviewRequired: true,
        SourceFingerprint: fingerprint,
        CreatedAt: now,
        UpdatedAt: now
      },
      review: {
        ReviewId: reviewId,
        ImportedResultId: importedResultId,
        Provider: "manual-reality-tv",
        ExternalEventId: question.ExternalEventId,
        ExternalMarketId: question.ExternalMarketId,
        ResultKey: question.ResultKey,
        ResultValue: resultValue,
        Finality: "FINAL",
        WinningOutcome: resultValue,
        EvidenceUrl: evidenceUrl || "",
        ReviewStatus: "PENDING",
        ReviewedBy: "",
        ReviewedAt: "",
        ReviewNotes: notes || "",
        PushStatus: "NOT PUSHED",
        PushedAt: "",
        PushMessage: "Waiting for Reality TV Season Manager approval.",
        CreatedAt: now,
        UpdatedAt: now
      }
    }
  );
  return {
    importedResultId: importedResultId,
    reviewId: reviewId,
    queued: !!(queued && queued.success),
    skipped: !!(queued && queued.skipped),
    error: queued && queued.error ? queued.error : ""
  };
}

function realityTvResolveQuestionBuildEpisode_(season, requestedEpisodeId, createIfMissing) {
  if (!season) return null;
  let episode = requestedEpisodeId ? realityTvGetEpisode_(requestedEpisodeId) : null;
  const episodes = realityTvEpisodesForSeason_(season.SeasonId);
  const currentNumber = Math.max(1, realityTvNumber_(season.CurrentEpisodeNumber,
    episodes.length ? episodes[episodes.length - 1].EpisodeNumber : 1));

  if (!episode) {
    episode = episodes.find(function(row) {
      return realityTvNumber_(row.EpisodeNumber, 0) === currentNumber;
    }) || null;
  }
  if (!episode) {
    episode = episodes.slice().reverse().find(function(row) {
      const status = realityTvString_(row.Status || "OPEN").toUpperCase();
      return status === "OPEN" || status === "REVIEW";
    }) || null;
  }
  if (!episode && episodes.length) episode = episodes[episodes.length - 1];

  if (!episode && createIfMissing && typeof realityTvCreateEpisode_ === "function") {
    episode = realityTvCreateEpisode_(season, currentNumber, {
      repair: true,
      skipHubSync: true,
      skipQuestionPack: true
    });
    episode.autoRepaired = true;
  }
  return episode;
}

function apiAdminUpdateRealityTvQuestionPack(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  let season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");

  if (payload.showFormat || payload.participantLabel || payload.groupLabel || payload.periodLabel || payload.questionTemplate || payload.individualPlayStartsEpisode !== undefined || payload.eliminationPoints !== undefined || payload.points !== undefined || payload.pickChangesAllowed !== undefined || payload.maxPickChanges !== undefined || payload.pickChangePenalty !== undefined) {
    const format = realityTvShowFormatDefinition_(payload.showFormat || season.ShowFormat || "survivor-tribal");
    const requestedEliminationPoints = payload.eliminationPoints !== undefined ? payload.eliminationPoints : payload.points;
    const patch = {
      ShowFormat: format.id,
      ParticipantType: realityTvString_(payload.participantType || season.ParticipantType || format.participantType),
      ParticipantLabel: realityTvString_(payload.participantLabel || season.ParticipantLabel || format.participantLabel),
      GroupLabel: realityTvString_(payload.groupLabel || season.GroupLabel || format.groupLabel),
      PeriodLabel: realityTvString_(payload.periodLabel || season.PeriodLabel || format.periodLabel),
      QuestionTemplate: realityTvString_(payload.questionTemplate || season.QuestionTemplate || format.eliminationTemplate),
      Points: requestedEliminationPoints === undefined
        ? Math.max(0, realityTvNumber_(season.Points, 1))
        : Math.max(0, realityTvNumber_(requestedEliminationPoints, realityTvNumber_(season.Points, 1))),
      EliminationLayoutType: realityTvNormalizeLayoutType_(payload.eliminationLayoutType || season.EliminationLayoutType || "auto"),
      EliminationImageSource: realityTvNormalizeImageSource_(payload.eliminationImageSource || season.EliminationImageSource || "roster"),
      IndividualPlayStartsEpisode: payload.individualPlayStartsEpisode === undefined
        ? Math.max(0, realityTvNumber_(season.IndividualPlayStartsEpisode, 0))
        : Math.max(0, realityTvNumber_(payload.individualPlayStartsEpisode, 0)),
      PickChangesAllowed: payload.pickChangesAllowed === undefined
        ? (season.PickChangesAllowed === "" || season.PickChangesAllowed === undefined ? true : realityTvBool_(season.PickChangesAllowed))
        : realityTvBool_(payload.pickChangesAllowed),
      MaxPickChanges: payload.maxPickChanges === undefined
        ? realityTvPickRules_(season).maxChanges
        : realityTvPickRules_({ pickChangesAllowed: payload.pickChangesAllowed === undefined ? season.PickChangesAllowed : payload.pickChangesAllowed, maxPickChanges: payload.maxPickChanges }).maxChanges,
      PickChangePenalty: payload.pickChangePenalty === undefined
        ? realityTvPickRules_(season).changePenalty
        : Math.max(0, realityTvNumber_(payload.pickChangePenalty, 0)),
      UpdatedAt: new Date()
    };
    realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_SEASONS_SHEET), season.__rowNumber, patch);
    season = realityTvGetSeason_(season.SeasonId);
    if (typeof realityTvApplyPickRulesToSeasonCategories_ === "function") {
      realityTvApplyPickRulesToSeasonCategories_(season);
    }
  }

  let requested = payload.enabledQuestionTypesJSON || payload.enabledQuestionTypes || [];
  if (realityTvBool_(payload.applyFormatPreset)) {
    requested = realityTvShowFormatDefinition_(season.ShowFormat).defaultQuestionTypes.concat(
      realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) {
        return realityTvKey_(row.TemplateSource) === "custom" && realityTvBool_(row.Enabled);
      }).map(function(row) { return row.TemplateId; })
    );
  }
  const enabledTypes = realityTvEnabledQuestionTypes_(requested, season.SeasonId);
  realityTvSaveStandardQuestionPack_(
    season,
    enabledTypes,
    season.Points,
    payload.questionPointsJSON || payload.questionPoints || {},
    payload.questionDisplayJSON || payload.questionDisplay || {}
  );

  if (payload.buildCurrentEpisode === undefined || realityTvBool_(payload.buildCurrentEpisode)) {
    let episode = realityTvResolveQuestionBuildEpisode_(season, payload.episodeId, true);
    if (!episode) throw new Error("The current Reality TV episode could not be repaired. Open Episode Schedule and create the current episode, then try again.");
    episode = realityTvUpdateCurrentPeriodPresentation_(season, episode);
    const state = realityTvMaterializeEpisodeQuestionPackBulk_(season, episode, {
      enabledTypes: enabledTypes,
      managedBy: "ADMIN"
    });
    state.enabledQuestionTypes = enabledTypes;
    state.message = episode.autoRepaired
      ? "The missing current period was repaired and all enabled Extra Questions were written in one bulk pass."
      : "Show format and question pack saved. All enabled Extra Questions were written in one bulk pass.";
    return state;
  }

  return { success: true, complete: true, enabledQuestionTypes: enabledTypes, created: 0, skipped: 0, message: "Show format and question pack saved." };
}

function realityTvQuestionPackReadiness_(season, episode, templates, episodeQuestions, activeBuild, completedBuild, gameSetupCategories) {
  const formatId = realityTvShowFormatDefinition_(season && season.ShowFormat || "survivor-tribal").id;
  const visibleTemplates = (templates || []).filter(function(item) {
    return realityTvQuestionTemplateMatchesFormat_(item, formatId);
  });
  const questionsByTemplate = {};
  (episodeQuestions || []).filter(function(item) {
    return episode && realityTvKey_(item.EpisodeId) === realityTvKey_(episode.EpisodeId);
  }).forEach(function(item) {
    questionsByTemplate[realityTvKey_(item.TemplateId || item.QuestionType)] = item;
  });
  const categoryMap = {};
  const hasGameSetup = Array.isArray(gameSetupCategories);
  (gameSetupCategories || []).forEach(function(item) {
    categoryMap[realityTvKey_(item.categoryId || item.id)] = item;
  });
  const build = activeBuild && !activeBuild.complete ? activeBuild : null;
  const resultsByTemplate = {};
  const resultSource = build && build.results && build.results.length ? build : completedBuild;
  (resultSource && resultSource.results ? resultSource.results : []).forEach(function(item) {
    resultsByTemplate[realityTvKey_(item.templateId)] = item;
  });

  const questionStates = visibleTemplates.map(function(template) {
    const templateId = realityTvKey_(template.TemplateId);
    const selected = realityTvBool_(template.Enabled);
    const question = questionsByTemplate[templateId] || null;
    const options = question ? realityTvParseJson_(question.AnswerOptionsJSON || "[]", []) : [];
    const category = question && hasGameSetup ? categoryMap[realityTvKey_(question.CategoryId)] || null : null;
    const inserted = !!question && (!hasGameSetup || !!category);
    const nomineeIds = {};
    if (category) (category.nominees || []).forEach(function(item) {
      nomineeIds[realityTvKey_(item.nomineeId || item.id)] = true;
    });
    const answersVerified = inserted && Array.isArray(options) && options.length >= 2 &&
      (!hasGameSetup || options.every(function(item) { return !!nomineeIds[realityTvKey_(item.id)]; }));
    const result = resultsByTemplate[templateId] || null;
    let state = selected ? "NEEDS_BUILD" : "AVAILABLE";
    let message = selected ? "Selected for this episode but not inserted yet." : "Available for this format but not selected.";
    if (selected && inserted && answersVerified) {
      state = "READY";
      message = "Already in the current episode with verified answers.";
    } else if (selected && build && realityTvKey_(build.lastTemplateId) === templateId) {
      state = "BUILDING";
      message = build.lastMessage || "This question is being inserted now.";
    } else if (selected && result && (result.status === "SKIPPED" || result.status === "BLOCKED")) {
      state = "BLOCKED";
      message = result.message || "This question needs attention before it can be ready.";
    } else if (selected && inserted && !answersVerified) {
      state = "VERIFYING";
      message = "The question exists, but its answers still need repair or verification.";
    }
    return {
      templateId: templateId,
      label: realityTvString_(template.Label || template.QuestionTemplate || template.TemplateId),
      templateSource: realityTvKey_(template.TemplateSource || "preset"),
      selected: selected,
      inserted: inserted,
      answersVerified: answersVerified,
      episodeQuestionId: question ? realityTvString_(question.EpisodeQuestionId) : "",
      state: state,
      message: message
    };
  });

  const selected = questionStates.filter(function(item) { return item.selected; });
  const eliminationReady = !!(episode && realityTvString_(episode.CategoryId)) &&
    (!hasGameSetup || !!categoryMap[realityTvKey_(episode.CategoryId)]);
  const insertedCount = selected.filter(function(item) { return item.inserted; }).length;
  const readyCount = selected.filter(function(item) { return item.state === "READY"; }).length;
  const blockedCount = selected.filter(function(item) { return item.state === "BLOCKED" || item.state === "VERIFYING"; }).length;
  const needsBuildCount = selected.filter(function(item) { return item.state === "NEEDS_BUILD"; }).length;
  let status = "READY";
  if (!episode) status = "NO_EPISODE";
  else if (!eliminationReady) status = "NEEDS_BUILD";
  else if (build && build.error) status = "ERROR";
  else if (blockedCount) status = "BLOCKED";
  else if (build) status = "BUILDING";
  else if (needsBuildCount || readyCount < selected.length) status = "NEEDS_BUILD";

  const ready = status === "READY";
  const action = status === "BUILDING" || status === "ERROR" ? "RESUME" : status === "READY" ? "VERIFY" : "BUILD";
  const label = status === "READY"
    ? "READY · " + readyCount + "/" + selected.length
    : status === "BUILDING"
      ? "BUILDING · " + readyCount + "/" + selected.length
      : status === "BLOCKED" || status === "ERROR"
        ? "NEEDS ATTENTION · " + readyCount + "/" + selected.length
        : status === "NO_EPISODE"
          ? "EPISODE NOT CREATED"
          : "NEEDS BUILD · " + readyCount + "/" + selected.length;
  return {
    status: status,
    ready: ready,
    action: action,
    label: label,
    episodeId: episode ? realityTvString_(episode.EpisodeId) : "",
    episodeNumber: episode ? realityTvNumber_(episode.EpisodeNumber, 0) : 0,
    availableCount: questionStates.length,
    selectedCount: selected.length,
    eliminationReady: eliminationReady,
    insertedCount: insertedCount,
    readyCount: readyCount,
    blockedCount: blockedCount,
    needsBuildCount: needsBuildCount,
    buildId: build ? realityTvString_(build.buildId) : "",
    questionStates: questionStates,
    stages: [
      { id: "episode", label: "Current episode exists", complete: !!episode, detail: episode ? "Episode " + realityTvNumber_(episode.EpisodeNumber, 0) + " is selected." : "Create or repair the current episode." },
      { id: "elimination", label: "Main elimination question linked", complete: eliminationReady, detail: eliminationReady ? "The episode's main question is connected to Game Setup." : "Repair the current episode's main question." },
      { id: "selection", label: "Extra-question selection saved", complete: !!episode, detail: selected.length + " extra question" + (selected.length === 1 ? "" : "s") + " selected." },
      { id: "insert", label: "Questions inserted into Game Setup", complete: insertedCount === selected.length, detail: insertedCount + " of " + selected.length + " inserted." },
      { id: "answers", label: "Answers verified", complete: readyCount === selected.length, detail: readyCount + " of " + selected.length + " ready." },
      { id: "ready", label: "Episode question pack ready", complete: ready, detail: ready ? "All selected local questions are ready for players." : "Finish or repair the remaining local questions." }
    ]
  };
}

function apiAdminAddRealityTvCustomQuestionTemplate(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const questionTemplate = realityTvString_(payload.questionTemplate);
  if (!questionTemplate) throw new Error("Custom question text is required.");
  const answerSource = realityTvKey_(payload.answerSource || "active-participants");
  const validSources = ["active-participants", "active-groups", "groups-or-participants", "yes-no", "manual-options"];
  if (validSources.indexOf(answerSource) === -1) throw new Error("Unsupported custom answer source.");
  let manualOptions = [];
  if (answerSource === "manual-options") {
    manualOptions = realityTvParseJson_(payload.manualOptionsJSON || payload.manualOptions || [], []);
    if (!Array.isArray(manualOptions) || manualOptions.filter(function(v) { return realityTvString_(v); }).length < 2) {
      throw new Error("Enter at least two manual answer options.");
    }
  }
  const templateId = realityTvSlug_(payload.templateId || questionTemplate) + "-custom";
  const prior = realityTvQuestionTemplatesForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.TemplateId) === realityTvKey_(templateId);
  });
  const now = new Date();
  const row = {
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    TemplateId: templateId,
    QuestionType: templateId,
    Label: realityTvString_(payload.label || questionTemplate),
    HelpText: realityTvString_(payload.helpText || "Custom episode question."),
    QuestionTemplate: questionTemplate,
    AnswerSource: answerSource,
    ResultKey: realityTvSlug_(payload.resultKey || templateId),
    Points: Math.max(0, realityTvNumber_(payload.points, realityTvNumber_(season.Points, 1))),
    Enabled: !realityTvBool_(payload.episodeOnly),
    DisplayOrder: Math.max(10, realityTvNumber_(payload.displayOrder, 900)),
    IncludeNoOutcome: realityTvBool_(payload.includeNoOutcome),
    NoOutcomeLabel: realityTvString_(payload.noOutcomeLabel || "No one"),
    ShowFormatsJSON: JSON.stringify([realityTvShowFormatDefinition_(season.ShowFormat).id]),
    TemplateSource: "custom",
    CustomAnswerOptionsJSON: JSON.stringify(manualOptions),
    LayoutType: realityTvNormalizeLayoutType_(payload.layoutType || "auto"),
    ImageSource: realityTvNormalizeImageSource_(payload.imageSource || "auto"),
    CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_TEMPLATES_SHEET,
    REALITY_TV_QUESTION_TEMPLATE_HEADERS, ["SeasonId", "TemplateId"], row);
  const episode = realityTvResolveQuestionBuildEpisode_(season, payload.episodeId, true);
  if (!episode) throw new Error("The current Reality TV episode could not be repaired. Open Episode Schedule and create the current episode, then try again.");
  if (realityTvBool_(payload.episodeOnly)) {
    const built = realityTvBuildSupplementalQuestionForTemplate_(season, episode, row, { skipHubSync: true });
    const hubSync = realityTvSyncAllSupplementalQuestionsToHub_(season, episode);
    return {
      success: true,
      complete: true,
      customTemplateId: templateId,
      episodeOnly: true,
      created: built && !built.skipped ? 1 : 0,
      skipped: built && built.skipped ? 1 : 0,
      hubSync: hubSync,
      message: built && built.skipped
        ? "The custom question was saved for this episode only but could not be built: " + (built.reason || "not enough answers")
        : "Custom question saved and built for this episode only. It is disabled for future episodes unless you enable it later."
    };
  }
  const enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(item) { return realityTvBool_(item.Enabled); }).map(function(item) { return item.TemplateId; });
  let state = realityTvStartQuestionPackBuild_(season, episode, enabledTypes);
  if (!state.complete) state = realityTvAdvanceQuestionPackBuild_(state, Math.max(4, enabledTypes.length + 1), 22000);
  state.message = episode.autoRepaired
    ? "The missing current period was repaired with its existing lock time. The custom question was saved and is ready to build."
    : "Custom question saved. The current period build is ready to continue.";
  state.customTemplateId = templateId;
  return state;
}

function apiAdminDeleteRealityTvCustomQuestionTemplate(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const templateId = realityTvKey_(payload.templateId);
  if (!templateId) throw new Error("Custom question template ID is required.");
  const allRows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_TEMPLATES_SHEET);
  const template = allRows.find(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(season.SeasonId) &&
      realityTvKey_(row.TemplateId) === templateId;
  });
  if (!template) throw new Error("Custom question template not found.");
  if (realityTvKey_(template.TemplateSource) !== "custom") throw new Error("Preset questions cannot be deleted. Disable them instead.");

  const currentEpisode = realityTvResolveQuestionBuildEpisode_(season, payload.episodeId, false);
  let deletedCurrentQuestion = false;
  let currentQuestionPreserved = false;
  if (currentEpisode) {
    const currentQuestion = realityTvEpisodeQuestionsForSeason_(season.SeasonId).find(function(row) {
      return realityTvKey_(row.EpisodeId) === realityTvKey_(currentEpisode.EpisodeId) &&
        realityTvKey_(row.TemplateId || row.QuestionType) === templateId;
    });
    if (currentQuestion) {
      const deleted = typeof adminDeleteCategory === "function"
        ? adminDeleteCategory({ gameId: season.GameId, categoryId: currentQuestion.CategoryId })
        : { success: false, blocked: true };
      if (deleted && deleted.success) {
        const questionSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET);
        if (questionSheet) questionSheet.deleteRow(currentQuestion.__rowNumber);
        const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET);
        if (queueSheet) {
          realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET)
            .filter(function(row) {
              return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(currentQuestion.EpisodeQuestionId);
            })
            .sort(function(a, b) { return b.__rowNumber - a.__rowNumber; })
            .forEach(function(row) { queueSheet.deleteRow(row.__rowNumber); });
        }
        deletedCurrentQuestion = true;
      } else {
        currentQuestionPreserved = true;
      }
    }
  }

  const templateSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_TEMPLATES_SHEET);
  templateSheet.deleteRow(template.__rowNumber);
  if (currentEpisode) realityTvCancelOtherQuestionBuildsForEpisode_(season.SeasonId, currentEpisode.EpisodeId, "");

  let build = null;
  let hubSync = { success: true, skipped: true };
  if (currentEpisode) {
    hubSync = realityTvSyncAllSupplementalQuestionsToHub_(season, currentEpisode);
    const enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId)
      .filter(function(row) { return realityTvBool_(row.Enabled); })
      .map(function(row) { return row.TemplateId; });
    build = realityTvStartQuestionPackBuild_(season, currentEpisode, enabledTypes);
    if (build && !build.complete) build = realityTvAdvanceQuestionPackBuild_(build, Math.max(4, enabledTypes.length + 1), 22000);
  }

  return {
    success: true,
    hubSync: hubSync,
    templateId: templateId,
    deletedCurrentQuestion: deletedCurrentQuestion,
    preservedCurrentQuestion: currentQuestionPreserved,
    build: build,
    message: currentQuestionPreserved
      ? "Custom template deleted. The already-played episode question was preserved because it has saved picks, wagers, or results."
      : (deletedCurrentQuestion
          ? "Custom question deleted from the template list and the current episode."
          : "Custom question template deleted.")
  };
}

function realityTvDeleteEpisodeQuestionForPlan_(season, question) {
  if (!question) return { removed: false, preserved: false };
  if (realityTvString_(question.Status).toUpperCase() === "FINAL") {
    return { removed: false, preserved: true, reason: "finalized history" };
  }
  const queues = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET).filter(function(row) {
    return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(question.EpisodeQuestionId);
  });
  const activeQueue = queues.some(function(row) {
    return ["PENDING", "APPROVING", "APPROVED"].indexOf(realityTvString_(row.ReviewStatus).toUpperCase()) !== -1;
  });
  if (activeQueue) return { removed: false, preserved: true, reason: "saved result or approval history" };

  let deleted = { success: false };
  try {
    deleted = typeof adminDeleteCategory === "function"
      ? adminDeleteCategory({ gameId: season.GameId, categoryId: question.CategoryId })
      : { success: false };
  } catch (err) {
    return { removed: false, preserved: true, reason: err.message || String(err) };
  }
  if (!deleted || !deleted.success) {
    return { removed: false, preserved: true, reason: "saved picks, wagers, or results" };
  }

  const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET);
  if (queueSheet) queues.sort(function(a, b) { return b.__rowNumber - a.__rowNumber; }).forEach(function(row) {
    queueSheet.deleteRow(row.__rowNumber);
  });
  const questionSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET);
  if (questionSheet) questionSheet.deleteRow(question.__rowNumber);
  return { removed: true, preserved: false };
}

function apiAdminApplyRealityTvEpisodeQuestionPlan(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episode = realityTvResolveQuestionBuildEpisode_(season, payload.episodeId, false);
  if (!episode) throw new Error("Current episode not found.");
  if (realityTvString_(episode.Status).toUpperCase() === "FINAL") {
    throw new Error("Finalized episode questions cannot be changed.");
  }

  const requested = realityTvParseJson_(payload.enabledQuestionTypesJSON || payload.enabledQuestionTypes || [], []);
  const selectedIds = (Array.isArray(requested) ? requested : []).map(realityTvKey_).filter(function(id, index, all) {
    return id && all.indexOf(id) === index;
  });
  const pointsById = realityTvQuestionPointsMap_(payload.questionPointsJSON || payload.questionPoints || {});
  const displayById = realityTvQuestionDisplayMap_(payload.questionDisplayJSON || payload.questionDisplay || {});
  const templates = realityTvQuestionTemplatesForSeason_(season.SeasonId);
  const templatesById = {};
  templates.forEach(function(row) { templatesById[realityTvKey_(row.TemplateId)] = row; });
  selectedIds.forEach(function(id) {
    if (!templatesById[id]) throw new Error("Question template not found: " + id);
  });

  realityTvCancelOtherQuestionBuildsForEpisode_(season.SeasonId, episode.EpisodeId, "");
  const existingQuestions = realityTvEpisodeQuestionsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId);
  });
  const selectedLookup = {};
  selectedIds.forEach(function(id) { selectedLookup[id] = true; });
  let removed = 0;
  const preserved = [];
  existingQuestions.forEach(function(question) {
    const id = realityTvKey_(question.TemplateId || question.QuestionType);
    if (selectedLookup[id]) return;
    const result = realityTvDeleteEpisodeQuestionForPlan_(season, question);
    if (result.removed) removed += 1;
    if (result.preserved) preserved.push({ templateId: id, reason: result.reason || "historical data" });
  });

  let built = 0;
  let skipped = 0;
  const results = [];
  const setup = adminGetGameSetup({ gameId: season.GameId });
  selectedIds.forEach(function(id) {
    const template = Object.assign({}, templatesById[id]);
    if (Object.prototype.hasOwnProperty.call(pointsById, id)) template.Points = pointsById[id];
    if (displayById[id]) {
      template.LayoutType = realityTvNormalizeLayoutType_(displayById[id].layoutType || template.LayoutType || "auto");
      template.ImageSource = realityTvNormalizeImageSource_(displayById[id].imageSource || template.ImageSource || "auto");
    }
    const result = realityTvBuildSupplementalQuestionForTemplate_(season, episode, template, {
      setup: setup,
      skipHubSync: true
    });
    if (result.skipped) skipped += 1;
    else built += 1;
    results.push({
      templateId: id,
      status: result.skipped ? "SKIPPED" : "READY",
      message: result.skipped ? (result.reason || "Not enough answers") : "Ready in this episode."
    });
  });

  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  const hubSync = realityTvSyncAllSupplementalQuestionsToHub_(season, episode);
  return {
    success: true,
    complete: true,
    episodeId: episode.EpisodeId,
    hubSync: hubSync,
    selectedCount: selectedIds.length,
    builtCount: built,
    removedCount: removed,
    skippedCount: skipped,
    preserved: preserved,
    results: results,
    message: "This episode's Extra Questions were updated: " + built + " ready, " + removed + " removed" +
      (skipped ? ", " + skipped + " skipped" : "") +
      (preserved.length ? ", " + preserved.length + " preserved because picks or results already exist" : "") + ". Future episode defaults were not changed."
  };
}

function apiAdminBuildRealityTvEpisodeQuestions(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episode = realityTvResolveQuestionBuildEpisode_(season, payload.episodeId, true);
  if (!episode) throw new Error("The current Reality TV episode could not be repaired. Open Episode Schedule and create the current episode, then try again.");
  const enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId)
    .filter(function(row) { return realityTvBool_(row.Enabled); })
    .map(function(row) { return row.TemplateId; });
  const state = realityTvMaterializeEpisodeQuestionPackBulk_(season, episode, {
    enabledTypes: enabledTypes,
    managedBy: "ADMIN"
  });
  state.message = enabledTypes.length
    ? "All enabled episode questions and answers were written in one bulk pass."
    : "No additional episode questions are enabled.";
  return state;
}


function realityTvQuestionPackMissingTemplateIndex_(season, episode, enabledTypes, definitionsById) {
  const setup = adminGetGameSetup({ gameId: season.GameId });
  const categories = setup && Array.isArray(setup.categories) ? setup.categories : [];
  const questions = realityTvEpisodeQuestionsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId);
  });

  for (let i = 0; i < enabledTypes.length; i += 1) {
    const templateId = realityTvKey_(enabledTypes[i]);
    const template = definitionsById[templateId];
    if (!template || !realityTvBool_(template.Enabled)) continue;

    const answerBundle = realityTvAnswerOptionsForTemplate_(season, template, episode);
    if (answerBundle.skipped || answerBundle.options.length < 2) continue;

    const type = realityTvSlug_(template.QuestionType || template.TemplateId);
    const categoryId = "episode-" + episode.EpisodeNumber + "-" + type;
    const episodeQuestionId = episode.EpisodeId + "-" + type;
    const question = questions.find(function(row) {
      return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(episodeQuestionId);
    });
    const category = categories.find(function(row) {
      return realityTvKey_(row.categoryId || row.id) === realityTvKey_(categoryId);
    });
    if (!question || !category) return i;

    const existingNominees = {};
    (category.nominees || []).forEach(function(item) {
      existingNominees[realityTvKey_(item.nomineeId || item.id)] = true;
    });
    const missingAnswer = answerBundle.options.some(function(item) {
      return !existingNominees[realityTvKey_(item.id)];
    });
    if (missingAnswer) return i;
  }
  return -1;
}

function apiAdminRepairRealityTvQuestionPack(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episode = realityTvResolveQuestionBuildEpisode_(season, payload.episodeId, true);
  if (!episode) throw new Error("The current Reality TV episode could not be repaired. Open Episode Schedule and create the current episode, then try again.");
  let enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Enabled);
  }).map(function(row) {
    return realityTvKey_(row.TemplateId);
  });
  realityTvSaveStandardQuestionPack_(season, enabledTypes, season.Points);
  enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Enabled);
  }).map(function(row) {
    return realityTvKey_(row.TemplateId);
  });
  const state = realityTvMaterializeEpisodeQuestionPackBulk_(season, episode, {
    enabledTypes: enabledTypes,
    managedBy: "REPAIR"
  });
  state.message = episode.autoRepaired
    ? "The missing current period was repaired and its Extra Questions were bulk-written and verified."
    : "Enabled Extra Questions and answers were bulk-written and verified without creating duplicates.";
  return state;
}

function apiAdminContinueRealityTvQuestionPackBuild(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  return realityTvContinueQuestionPackBuildStage_(payload.buildId);
}

function realityTvContinueQuestionPackBuildStage_(buildId) {
  realityTvEnsureQuestionPackSystem_();
  const payload = { buildId: buildId };

  const stageLock = typeof LockService.getDocumentLock === "function"
    ? LockService.getDocumentLock()
    : null;
  if (stageLock && !stageLock.tryLock(750)) {
    return {
      success: true,
      busy: true,
      complete: false,
      buildId: payload.buildId,
      message: "Another question build stage is still running."
    };
  }

  try {
  let job = realityTvGetQuestionBuildJob_(payload.buildId);
  if (!job) throw new Error("Question pack build job not found.");
  if (realityTvQuestionBuildState_(job).complete) return realityTvQuestionBuildState_(job);

  const season = realityTvGetSeason_(job.SeasonId);
  const episode = realityTvGetEpisode_(job.EpisodeId);
  if (!season || !episode) throw new Error("Season or episode not found for this question build.");

  const enabledTypes = realityTvEnabledQuestionTypes_(job.EnabledQuestionTypesJSON, season.SeasonId);
  const definitionsById = {};
  realityTvQuestionTemplatesForSeason_(season.SeasonId).forEach(function(row) {
    definitionsById[realityTvKey_(row.TemplateId)] = row;
  });
  const index = Math.max(0, realityTvNumber_(job.CurrentIndex, 0));
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_BUILD_JOBS_SHEET);
  const stage = realityTvString_(job.Stage || "BUILD_LOCAL").toUpperCase();
  const attempts = realityTvNumber_(job.AttemptCount, 0) + 1;

  if (index >= enabledTypes.length) {
    const completedResults = realityTvQuestionBuildResults_(job);
    const actualMissingIndex = realityTvQuestionPackMissingTemplateIndex_(season, episode, enabledTypes, definitionsById);
    if (actualMissingIndex !== -1) {
      const missingTemplateId = realityTvKey_(enabledTypes[actualMissingIndex]);
      const repairedResults = completedResults.filter(function(item) {
        return item.templateId !== missingTemplateId;
      });
      realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
        CurrentIndex: actualMissingIndex,
        Stage: "BUILD_LOCAL",
        Status: "BUILDING",
        LastTemplateId: missingTemplateId,
        LastMessage: "Verification found a missing question or answer for " + missingTemplateId + ". Repairing it now.",
        BuildResultsJSON: JSON.stringify(repairedResults),
        ErrorMessage: "",
        UpdatedAt: new Date()
      });
      const repairState = realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(job.BuildId));
      repairState.message = repairState.lastMessage;
      return repairState;
    }
    const resultIds = {};
    completedResults.forEach(function(item) { resultIds[item.templateId] = true; });
    const missingIndex = enabledTypes.findIndex(function(item) { return !resultIds[realityTvKey_(item)]; });
    if (missingIndex !== -1) {
      realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
        CurrentIndex: missingIndex,
        Stage: "BUILD_LOCAL",
        Status: "BUILDING",
        LastTemplateId: enabledTypes[missingIndex],
        LastMessage: "Verification found an unchecked build result for " + enabledTypes[missingIndex] + ". Repairing it now.",
        ErrorMessage: "",
        UpdatedAt: new Date()
      });
      const repairState = realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(job.BuildId));
      repairState.message = repairState.lastMessage;
      return repairState;
    }
    const completedAt = new Date();
    realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
      Stage: "COMPLETE",
      Status: "COMPLETE",
      CurrentIndex: enabledTypes.length,
      LastMessage: "Episode question pack build completed. Complete Hub mirroring was queued.",
      ErrorMessage: "",
      CompletedAt: completedAt,
      UpdatedAt: completedAt
    });
    realityTvSyncAllSupplementalQuestionsToHub_(season, episode);
    return realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(job.BuildId));
  }

  const templateId = enabledTypes[index];
  const template = definitionsById[realityTvKey_(templateId)];
  try {
    if (stage === "BUILD_LOCAL") {
      realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
        Status: "BUILDING",
        LastTemplateId: templateId,
        LastMessage: "Building " + templateId + " in Game Setup.",
        ErrorMessage: "",
        AttemptCount: attempts,
        UpdatedAt: new Date()
      });

      if (!template) {
        throw new Error("Selected question template not found for this season: " + templateId + ". Save the format again to repair the template catalog.");
      } else {
        const result = realityTvBuildSupplementalQuestionForTemplate_(season, episode, template, { skipHubSync: true });
        if (result.skipped) {
          const resultJson = realityTvSetQuestionBuildResult_(
            job,
            template,
            "SKIPPED",
            result.reason || "Not enough answer options.",
            "",
            "NOT_SYNCED"
          );
          realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
            CurrentIndex: index + 1,
            SkippedCount: realityTvNumber_(job.SkippedCount, 0) + 1,
            Stage: "BUILD_LOCAL",
            LastMessage: templateId + " was skipped: " + (result.reason || "not enough answer options"),
            BuildResultsJSON: resultJson,
            ErrorMessage: "",
            UpdatedAt: new Date()
          });
        } else {
          const localStatus = result.createdCategory ? "BUILT" : "ALREADY_EXISTS";
          const resultJson = realityTvSetQuestionBuildResult_(
            job,
            template,
            localStatus,
            result.createdCategory
              ? "Question and answers were added to Game Setup."
              : "Question already existed and was verified / repaired.",
            result.question.EpisodeQuestionId,
            "PENDING"
          );
          const nextIndex = index + 1;
          const complete = nextIndex >= enabledTypes.length;
          const now = new Date();
          const deferredResultJson = realityTvSetQuestionBuildResult_(
            job,
            template,
            localStatus,
            result.createdCategory
              ? "Question and answers were added to Game Setup. Hub sync is optional and deferred."
              : "Question already existed and was verified / repaired. Hub sync is optional and deferred.",
            result.question.EpisodeQuestionId,
            "DEFERRED"
          );
          realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
            CurrentIndex: nextIndex,
            Stage: complete ? "COMPLETE" : "BUILD_LOCAL",
            Status: complete ? "COMPLETE" : "BUILDING",
            ProcessedCount: realityTvNumber_(job.ProcessedCount, 0) + 1,
            LastEpisodeQuestionId: result.question.EpisodeQuestionId,
            LastMessage: complete
              ? "Episode question pack build completed. Complete Hub mirroring was queued."
              : result.question.QuestionText + " was built and verified. Continuing to the next question.",
            BuildResultsJSON: deferredResultJson,
            ErrorMessage: "",
            CompletedAt: complete ? now : "",
            UpdatedAt: now
          });
          if (complete) realityTvSyncAllSupplementalQuestionsToHub_(season, episode);
        }
      }

      const state = realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(job.BuildId));
      state.message = state.lastMessage;
      if (!state.complete && realityTvString_(state.managedBy).toUpperCase() !== "APPROVAL") {
        realityTvScheduleQuestionBuildContinuation_();
      }
      return state;
    }

    if (stage === "SYNC_HUB") {
      // Recovery for builds created before v1.1.6. Game Setup is authoritative;
      // optional Hub mappings must never block playable questions.
      const question = realityTvGetEpisodeQuestion_(job.LastEpisodeQuestionId || (episode.EpisodeId + "-" + realityTvSlug_(templateId)));
      const existingResult = realityTvQuestionBuildResults_(job).find(function(item) {
        return item.templateId === realityTvKey_(templateId);
      });
      const resultJson = realityTvSetQuestionBuildResult_(
        job,
        template || { TemplateId: templateId, Label: templateId },
        existingResult ? existingResult.status : "ALREADY_EXISTS",
        existingResult ? existingResult.message : "Question was verified. Hub sync is optional and deferred.",
        question ? question.EpisodeQuestionId : (existingResult ? existingResult.episodeQuestionId : ""),
        "DEFERRED"
      );
      const nextIndex = index + 1;
      const complete = nextIndex >= enabledTypes.length;
      const now = new Date();
      realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
        CurrentIndex: nextIndex,
        Stage: complete ? "COMPLETE" : "BUILD_LOCAL",
        Status: complete ? "COMPLETE" : "BUILDING",
        LastMessage: complete
          ? "Episode question pack build completed. Hub mappings can be synchronized separately."
          : templateId + " was verified. Continuing without waiting for optional Hub mappings.",
        BuildResultsJSON: resultJson,
        ErrorMessage: "",
        CompletedAt: complete ? now : "",
        UpdatedAt: now
      });
      const state = realityTvQuestionBuildState_(realityTvGetQuestionBuildJob_(job.BuildId));
      state.message = state.lastMessage;
      return state;
    }

    if (stage === "COMPLETE") return realityTvQuestionBuildState_(job);
    throw new Error("Unknown question pack build stage: " + stage + ".");
  } catch (err) {
    realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
      Status: "ERROR",
      ErrorMessage: err.message || String(err),
      LastMessage: "Question pack build paused. It is safe to resume.",
      AttemptCount: attempts,
      UpdatedAt: new Date()
    });
    throw err;
  }
  } finally {
    if (stageLock) stageLock.releaseLock();
  }
}

function realityTvQuestionSelectedIds_(queue) {
  const plural = realityTvParseJson_(queue && queue.SelectedOutcomeIdsJSON, []);
  const ids = Array.isArray(plural) ? plural.map(realityTvKey_).filter(Boolean) : [];
  const legacy = realityTvKey_(queue && queue.SelectedOutcomeId);
  if (!ids.length && legacy) ids.push(legacy);
  return ids.filter(function(id, index, all) { return all.indexOf(id) === index; });
}

function realityTvQuestionSelectedLabels_(queue) {
  const plural = realityTvParseJson_(queue && queue.SelectedOutcomeLabelsJSON, []);
  const labels = Array.isArray(plural) ? plural.map(realityTvString_).filter(Boolean) : [];
  const legacy = realityTvString_(queue && queue.SelectedOutcomeLabel);
  if (!labels.length && legacy) labels.push(legacy);
  return labels;
}

function apiAdminSubmitRealityTvQuestionResult(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const question = realityTvGetEpisodeQuestion_(payload.episodeQuestionId);
  if (!question) throw new Error("Episode question not found.");
  if (["FINAL", "CLOSED"].indexOf(realityTvString_(question.Status).toUpperCase()) !== -1) {
    throw new Error("This question is already finalized.");
  }
  const season = realityTvGetSeason_(question.SeasonId);
  const episode = realityTvGetEpisode_(question.EpisodeId);
  if (!season || !episode) throw new Error("Season or episode not found.");
  const options = realityTvParseJson_(question.AnswerOptionsJSON, []);

  const incoming = realityTvParseJson_(
    payload.selectedOutcomeIdsJSON !== undefined
      ? payload.selectedOutcomeIdsJSON
      : (payload.selectedOutcomeIds !== undefined ? payload.selectedOutcomeIds : []),
    []
  );
  let selectedIds = (Array.isArray(incoming) ? incoming : [])
    .map(realityTvKey_)
    .filter(Boolean);
  const legacySelectedId = realityTvKey_(payload.selectedOutcomeId);
  if (!selectedIds.length && legacySelectedId) selectedIds.push(legacySelectedId);
  selectedIds = selectedIds.filter(function(id, index, all) { return all.indexOf(id) === index; });

  const resultMode = realityTvKey_(payload.resultMode || (selectedIds.length > 1 ? "multiple-winners" : "winner"));
  if (["winner", "multiple-winners", "push"].indexOf(resultMode) === -1) {
    throw new Error("Unsupported question result type.");
  }
  if (resultMode === "push" && selectedIds.length) {
    throw new Error("A pushed question cannot include a winning answer.");
  }
  if (resultMode === "winner" && selectedIds.length !== 1) {
    throw new Error("Select exactly one winning answer.");
  }
  if (resultMode === "multiple-winners" && selectedIds.length < 2) {
    throw new Error("Select at least two winning answers.");
  }

  const selected = selectedIds.map(function(id) {
    return options.find(function(item) { return realityTvKey_(item.id) === id; });
  });
  if (selected.some(function(item) { return !item; })) throw new Error("Select only valid outcomes.");
  const selectedLabels = selected.map(function(item) { return realityTvString_(item.label); }).filter(Boolean);
  const summaryOutcome = resultMode === "push"
    ? { id: "", label: "Push / no official result", ids: [], labels: [] }
    : {
        id: selectedIds[0],
        label: selectedLabels.join(", "),
        ids: selectedIds,
        labels: selectedLabels
      };

  const existingPending = realityTvQuestionQueueForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(question.EpisodeQuestionId) &&
      ["pending", "approving"].indexOf(realityTvKey_(row.ReviewStatus)) !== -1;
  });
  if (existingPending) throw new Error("This question already has a result awaiting review.");

  const now = new Date();
  const hubResult = realityTvCreateSupplementalHubPendingResult_(season, episode, question, summaryOutcome,
    realityTvString_(payload.evidenceUrl), realityTvString_(payload.notes));
  const queue = {
    QueueId: realityTvId_("rtq-queue"),
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: episode.EpisodeId,
    EpisodeNumber: episode.EpisodeNumber,
    EpisodeQuestionId: question.EpisodeQuestionId,
    CategoryId: question.CategoryId,
    QuestionType: question.QuestionType,
    ResultKey: question.ResultKey,
    ResultMode: resultMode,
    SelectedOutcomeIdsJSON: JSON.stringify(selectedIds),
    SelectedOutcomeLabelsJSON: JSON.stringify(selectedLabels),
    SelectedOutcomeId: selectedIds[0] || "",
    SelectedOutcomeLabel: summaryOutcome.label,
    ReviewStatus: "PENDING",
    EvidenceUrl: realityTvString_(payload.evidenceUrl),
    Notes: realityTvString_(payload.notes),
    SubmittedBy: realityTvString_(payload.username),
    SubmittedAt: now,
    ReviewedBy: "",
    ReviewedAt: "",
    PushStatus: "NOT PUSHED",
    ApprovalStage: "",
    ApprovalStartedAt: "",
    ApprovalCompletedAt: "",
    ApprovalAttemptCount: 0,
    PushedAt: "",
    HubImportedResultId: hubResult.importedResultId || "",
    HubReviewId: hubResult.reviewId || "",
    ErrorMessage: hubResult.error || "",
    UpdatedAt: now
  };
  realityTvAppendObject_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET), queue);
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET), question.__rowNumber, {
    ResultQueueId: queue.QueueId,
    Status: "REVIEW",
    UpdatedAt: now
  });
  return {
    success: true,
    message: resultMode === "multiple-winners"
      ? "Multiple winners submitted for administrator review."
      : (resultMode === "push" ? "Question push submitted for administrator review." : "Question result submitted for administrator review."),
    queueId: queue.QueueId
  };
}

function realityTvQuestionApprovalState_(queue) {
  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  const stage = realityTvString_(queue.ApprovalStage || (status === "APPROVED" ? "COMPLETE" : "SETTLE")).toUpperCase();
  const nowMs = Date.now();
  const startedMs = new Date(queue.ApprovalStartedAt || queue.UpdatedAt || 0).getTime();
  const stageStartedMs = new Date(queue.ApprovalStageStartedAt || queue.ApprovalStartedAt || queue.UpdatedAt || 0).getTime();
  const heartbeatMs = new Date(queue.ApprovalHeartbeatAt || queue.UpdatedAt || 0).getTime();
  const elapsedSeconds = startedMs > 0 ? Math.max(0, Math.floor((nowMs - startedMs) / 1000)) : 0;
  const stageElapsedSeconds = stageStartedMs > 0 ? Math.max(0, Math.floor((nowMs - stageStartedMs) / 1000)) : 0;
  let percent = 8;
  let label = "Queued for approval";
  let detail = "Waiting to settle this question result.";
  let estimatedRemainingSeconds = 30;
  if (stage === "SETTLE") {
    percent = realityTvString_(queue.PushStatus).toUpperCase() === "SETTLING QUESTION" ? 32 : 12;
    label = "Settling question result";
    detail = "Writing the winning answer or push and scoring this question.";
    estimatedRemainingSeconds = Math.max(4, 18 - stageElapsedSeconds) + 10;
  } else if (stage === "SYNC_HUB") {
    percent = 82;
    label = "Finalizing question approval";
    detail = "Saving the final approval record and optional Hub status.";
    estimatedRemainingSeconds = Math.max(3, 10 - stageElapsedSeconds);
  } else if (stage === "COMPLETE" || status === "APPROVED") {
    percent = 100;
    label = "Question approval complete";
    detail = "This question result is settled and ready.";
    estimatedRemainingSeconds = 0;
  }
  const heartbeatAgeSeconds = heartbeatMs > 0 ? Math.max(0, Math.floor((nowMs - heartbeatMs) / 1000)) : 0;
  return {
    success: true,
    queueId: queue.QueueId,
    reviewStatus: status,
    stage: stage,
    pushStatus: realityTvString_(queue.PushStatus),
    complete: status === "APPROVED" || stage === "COMPLETE",
    error: realityTvString_(queue.ErrorMessage),
    progressPercent: percent,
    progressLabel: label,
    progressDetail: detail,
    elapsedSeconds: elapsedSeconds,
    estimatedRemainingSeconds: estimatedRemainingSeconds,
    stalled: status === "APPROVING" && heartbeatAgeSeconds >= 120
  };
}

function apiAdminApproveRealityTvQuestionResult(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureQuestionPackSystem_();
  const queue = realityTvGetQuestionQueue_(payload.queueId);
  if (!queue) throw new Error("Question review item not found.");
  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  if (status === "REJECTED") throw new Error("This result was rejected. Submit a corrected result.");
  if (status === "APPROVED") return realityTvQuestionApprovalState_(queue);
  if (status !== "PENDING" && status !== "APPROVING") throw new Error("This result cannot be approved from its current status.");
  if (status === "PENDING") {
    const now = new Date();
    const queueUpdate = function() {
      realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET), queue.__rowNumber, {
        ReviewStatus: "APPROVING",
        ReviewedBy: realityTvString_(payload.username || "administrator"),
        ReviewedAt: now,
        PushStatus: "QUEUED",
        ApprovalStage: "SETTLE",
        ApprovalStartedAt: now,
        ApprovalCompletedAt: "",
        ApprovalStageStartedAt: now,
        ApprovalHeartbeatAt: now,
        ErrorMessage: "",
        UpdatedAt: now
      });
    };
    if (typeof realityTvSpreadsheetRetry_ === "function") realityTvSpreadsheetRetry_("Queue Reality TV question approval", queueUpdate, 4);
    else queueUpdate();
  }
  return realityTvQuestionApprovalState_(realityTvGetQuestionQueue_(payload.queueId));
}

function realityTvSettleSupplementalQuestion_(question, queue, reviewer, options) {
  options = options || {};
  const setup = options.setup || adminGetGameSetup({ gameId: question.GameId });
  const category = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(question.CategoryId);
  });
  if (!category) throw new Error("Question not found in Game Setup.");

  const resultMode = realityTvKey_(queue.ResultMode || "winner");
  const winnerIds = resultMode === "push" ? [] : realityTvQuestionSelectedIds_(queue);
  const winnerLookup = {};
  winnerIds.forEach(function(id) { winnerLookup[realityTvKey_(id)] = true; });
  const isPush = resultMode === "push";
  const selectedLabels = realityTvQuestionSelectedLabels_(queue);
  const resultValue = isPush
    ? "Push / no official result"
    : (selectedLabels.join(", ") || realityTvString_(queue.SelectedOutcomeLabel));
  const settledAt = new Date();

  const resultPayloads = (category.nominees || []).map(function(nominee) {
    return {
      gameId: question.GameId,
      categoryId: question.CategoryId,
      nomineeId: nominee.nomineeId,
      resultStatus: isPush ? "push" : "settled",
      isWinner: !isPush && winnerLookup[realityTvKey_(nominee.nomineeId)] === true,
      resultValue: resultValue,
      resultSource: "manual-reality-tv",
      settledAt: settledAt,
      timestamp: settledAt,
      notes: "Approved in Reality TV Season Manager by " + (reviewer || "administrator")
    };
  });
  if (typeof upsertCategoryResultsBulk_ === "function") upsertCategoryResultsBulk_(resultPayloads);
  else resultPayloads.forEach(function(item) { upsertCategoryResult_(item); });

  adminUpdateCategory({
    gameId: question.GameId,
    categoryId: question.CategoryId,
    locked: true,
    winnerNomineeId: winnerIds.length === 1 ? winnerIds[0] : "",
    settlementStatus: isPush ? "push" : "settled",
    resultSource: "manual-reality-tv",
    resultSourceType: "reality-tv",
    resultProvider: "manual-reality-tv",
    externalEventId: question.ExternalEventId,
    externalMarketId: question.ExternalMarketId,
    statKey: question.ResultKey,
    autoSettle: false,
    requireAdminReview: true,
    username: reviewer || "",
    notes: winnerIds.length > 1
      ? "Approved Reality TV episode question with multiple winners"
      : "Approved Reality TV episode question result"
  });

  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET), question.__rowNumber, {
    Status: "FINAL",
    WinningOutcomeIds: JSON.stringify(winnerIds),
    UpdatedAt: settledAt
  });
  if (!options.skipScoreRecalc && typeof seasonAnchorRecalculateEpisodeScores_ === "function") {
    seasonAnchorRecalculateEpisodeScores_(question.GameId, question.SeasonId, question.EpisodeId);
  }
  return { winnerId: winnerIds[0] || "", winnerIds: winnerIds, isPush: isPush };
}

function realityTvSyncSupplementalApprovalHub_(question, queue, reviewer) {
  const warnings = [];
  try {
    const season = realityTvGetSeason_(question.SeasonId);
    const episode = realityTvGetEpisode_(question.EpisodeId);
    if (season && episode && typeof realityTvSyncAllSupplementalQuestionsToHub_ === "function") {
      const mirror = realityTvSyncAllSupplementalQuestionsToHub_(season, episode);
      if (mirror && mirror.error) warnings.push(mirror.error);
    }
  } catch (err) {
    warnings.push(err.message || String(err));
  }
  try {
    realityTvUpdateHubReview_(queue, "APPROVED", reviewer, "Pushed to CategoryResults.");
  } catch (err) {
    warnings.push(err.message || String(err));
  }
  return { warning: warnings.join(" | ") };
}

function apiAdminContinueRealityTvQuestionApproval(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureQuestionPackSystem_();

  let queue = typeof realityTvSpreadsheetRetry_ === "function"
    ? realityTvSpreadsheetRetry_("Read Reality TV question approval", function() { return realityTvGetQuestionQueue_(payload.queueId); }, 4)
    : realityTvGetQuestionQueue_(payload.queueId);
  if (!queue) throw new Error("Question review item not found.");
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "PENDING") {
    apiAdminApproveRealityTvQuestionResult(payload);
    queue = realityTvGetQuestionQueue_(payload.queueId);
  }
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVED") return realityTvQuestionApprovalState_(queue);
  if (realityTvString_(queue.ReviewStatus).toUpperCase() !== "APPROVING") throw new Error("This result is not awaiting approval processing.");

  const stage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
  if (stage === "COMPLETE") return realityTvQuestionApprovalState_(queue);
  const processingStatus = stage === "SETTLE" ? "SETTLING QUESTION" : "SYNCING APPROVAL";
  const claim = typeof realityTvClaimApprovalStage_ === "function"
    ? realityTvClaimApprovalStage_({
        queueId: payload.queueId,
        stage: stage,
        processingStatus: processingStatus,
        sheetName: REALITY_TV_QUESTION_QUEUE_SHEET,
        getQueue: realityTvGetQuestionQueue_,
        notFoundMessage: "Question review item not found.",
        busyMessage: "This question approval stage is already running."
      })
    : { busy: false, queue: queue, attempts: realityTvNumber_(queue.ApprovalAttemptCount, 0) + 1 };
  if (claim.busy) return claim;
  if (claim.changed) return apiAdminContinueRealityTvQuestionApproval(payload);
  queue = claim.queue;
  const attempts = claim.attempts;

  const question = realityTvGetEpisodeQuestion_(queue.EpisodeQuestionId);
  if (!question) throw new Error("Episode question not found.");
  const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET);
  const reviewer = realityTvString_(queue.ReviewedBy || payload.username || "administrator");
  const retry = typeof realityTvSpreadsheetRetry_ === "function"
    ? realityTvSpreadsheetRetry_
    : function(label, fn) { return fn(); };
  try {
    if (stage === "SETTLE") {
      retry("Settle Reality TV episode question", function() {
        return realityTvSettleSupplementalQuestion_(question, queue, reviewer);
      }, 5);
      retry("Advance Reality TV question approval", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "QUESTION SETTLED",
          ApprovalStage: "SYNC_HUB",
          ApprovalStageStartedAt: new Date(),
          ApprovalHeartbeatAt: new Date(),
          ErrorMessage: "",
          UpdatedAt: new Date()
        });
      }, 4);
      const state = realityTvQuestionApprovalState_(realityTvGetQuestionQueue_(queue.QueueId));
      state.message = "Question settled. Finishing Hub approval records.";
      return state;
    }
    if (stage === "SYNC_HUB") {
      const hub = retry("Finish Reality TV question approval", function() {
        return realityTvSyncSupplementalApprovalHub_(question, queue, reviewer);
      }, 5);
      const completedAt = new Date();
      retry("Complete Reality TV question approval", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          ReviewStatus: "APPROVED",
          PushStatus: "PUSHED",
          PushedAt: completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ApprovalHeartbeatAt: completedAt,
          ErrorMessage: hub.warning || "",
          UpdatedAt: completedAt
        });
      }, 4);
      const state = realityTvQuestionApprovalState_(realityTvGetQuestionQueue_(queue.QueueId));
      state.warning = hub.warning || "";
      state.message = "Question result approved and pushed.";
      return state;
    }
    throw new Error("Unknown question approval stage: " + stage + ".");
  } catch (err) {
    try {
      retry("Record Reality TV question approval error", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "ERROR",
          ApprovalAttemptCount: attempts,
          ApprovalHeartbeatAt: new Date(),
          ErrorMessage: err.message || String(err),
          UpdatedAt: new Date()
        });
      }, 3);
    } catch (recordError) {
      if (typeof Logger !== "undefined") Logger.log("Could not record Reality TV question approval error: " + recordError);
    }
    throw err;
  }
}


function apiAdminRejectRealityTvQuestionResult(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureQuestionPackSystem_();
  const queue = realityTvGetQuestionQueue_(payload.queueId);
  if (!queue) throw new Error("Question review item not found.");
  if (realityTvKey_(queue.ReviewStatus) !== "pending") throw new Error("This result is no longer pending.");
  const now = new Date();
  const reviewer = realityTvString_(payload.username || "administrator");
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET), queue.__rowNumber, {
    ReviewStatus: "REJECTED",
    ReviewedBy: reviewer,
    ReviewedAt: now,
    PushStatus: "NOT PUSHED",
    ErrorMessage: realityTvString_(payload.notes),
    UpdatedAt: now
  });
  const question = realityTvGetEpisodeQuestion_(queue.EpisodeQuestionId);
  if (question) {
    realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET), question.__rowNumber, {
      ResultQueueId: "",
      Status: "OPEN",
      UpdatedAt: now
    });
  }
  realityTvUpdateHubReview_(queue, "REJECTED", reviewer, realityTvString_(payload.notes || "Rejected in Reality TV Season Manager."));
  return { success: true, message: "Question result rejected. Submit a corrected result." };
}
