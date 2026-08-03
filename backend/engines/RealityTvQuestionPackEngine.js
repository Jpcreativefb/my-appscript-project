/* =========================
   REALITY TV EPISODE QUESTION PACKS
   Phase 2B v1.0.24

   Adds independent, administrator-reviewed episode questions without
   changing the stable elimination/next-episode workflow.
========================= */

const REALITY_TV_QUESTION_TEMPLATES_SHEET = "RealityQuestionTemplates";
const REALITY_TV_EPISODE_QUESTIONS_SHEET = "RealityEpisodeQuestions";
const REALITY_TV_QUESTION_QUEUE_SHEET = "RealityQuestionResultQueue";

const REALITY_TV_QUESTION_TEMPLATE_HEADERS = [
  "SeasonId", "GameId", "TemplateId", "QuestionType", "QuestionTemplate",
  "AnswerSource", "ResultKey", "Points", "Enabled", "DisplayOrder",
  "IncludeNoOutcome", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_EPISODE_QUESTION_HEADERS = [
  "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "EpisodeQuestionId",
  "TemplateId", "QuestionType", "QuestionText", "CategoryId", "AnswerSource",
  "AnswerOptionsJSON", "ResultKey", "ExternalEventId", "ExternalMarketId",
  "Status", "WinningOutcomeIds", "ResultQueueId", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_QUESTION_QUEUE_HEADERS = [
  "QueueId", "SeasonId", "GameId", "EpisodeId", "EpisodeNumber",
  "EpisodeQuestionId", "CategoryId", "QuestionType", "ResultKey",
  "SelectedOutcomeId", "SelectedOutcomeLabel", "ReviewStatus", "EvidenceUrl",
  "Notes", "SubmittedBy", "SubmittedAt", "ReviewedBy", "ReviewedAt",
  "PushStatus", "ApprovalStage", "ApprovalStartedAt", "ApprovalCompletedAt",
  "ApprovalAttemptCount", "PushedAt", "HubImportedResultId", "HubReviewId",
  "ErrorMessage", "UpdatedAt"
];

function realityTvStandardQuestionDefinitions_() {
  return [
    {
      templateId: "immunity-winner",
      questionType: "immunity-winner",
      label: "Immunity winner",
      questionTemplate: "Who will win immunity in Episode {episode}?",
      answerSource: "auto-competition",
      resultKey: "immunity-winner",
      displayOrder: 20,
      includeNoOutcome: false
    },
    {
      templateId: "tribal-attendee",
      questionType: "tribal-attendee",
      label: "Tribe going to Tribal Council",
      questionTemplate: "Which tribe will go to Tribal Council in Episode {episode}?",
      answerSource: "active-tribes",
      resultKey: "tribal-attendee",
      displayOrder: 30,
      includeNoOutcome: true
    },
    {
      templateId: "reward-winner",
      questionType: "reward-winner",
      label: "Reward winner",
      questionTemplate: "Who will win the reward in Episode {episode}?",
      answerSource: "auto-competition",
      resultKey: "reward-winner",
      displayOrder: 40,
      includeNoOutcome: true
    },
    {
      templateId: "idol-finder",
      questionType: "idol-finder",
      label: "Immunity idol finder",
      questionTemplate: "Who will find a hidden immunity idol in Episode {episode}?",
      answerSource: "active-contestants",
      resultKey: "idol-finder",
      displayOrder: 50,
      includeNoOutcome: true
    }
  ];
}

function realityTvEnsureQuestionPackSystem_() {
  const ss = SpreadsheetApp.getActive();
  realityTvGetOrCreateSheet_(ss, REALITY_TV_QUESTION_TEMPLATES_SHEET, REALITY_TV_QUESTION_TEMPLATE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_EPISODE_QUESTIONS_SHEET, REALITY_TV_EPISODE_QUESTION_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_QUESTION_QUEUE_SHEET, REALITY_TV_QUESTION_QUEUE_HEADERS);
  return { success: true };
}

function realityTvQuestionTemplatesForSeason_(seasonId) {
  realityTvEnsureQuestionPackSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_TEMPLATES_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
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

function realityTvEnabledQuestionTypes_(value) {
  let parsed = value;
  if (!Array.isArray(parsed)) parsed = realityTvParseJson_(value, []);
  const allowed = {};
  realityTvStandardQuestionDefinitions_().forEach(function(item) { allowed[item.templateId] = true; });
  const seen = {};
  return (Array.isArray(parsed) ? parsed : []).map(realityTvKey_).filter(function(type) {
    if (!allowed[type] || seen[type]) return false;
    seen[type] = true;
    return true;
  });
}

function realityTvSaveStandardQuestionPack_(season, enabledTypes, points) {
  realityTvEnsureQuestionPackSystem_();
  const enabled = {};
  realityTvEnabledQuestionTypes_(enabledTypes).forEach(function(type) { enabled[type] = true; });
  const existing = realityTvQuestionTemplatesForSeason_(season.SeasonId);
  const existingById = {};
  existing.forEach(function(row) { existingById[realityTvKey_(row.TemplateId)] = row; });
  const now = new Date();
  const rows = realityTvStandardQuestionDefinitions_().map(function(definition) {
    const prior = existingById[definition.templateId];
    return {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      TemplateId: definition.templateId,
      QuestionType: definition.questionType,
      QuestionTemplate: definition.questionTemplate,
      AnswerSource: definition.answerSource,
      ResultKey: definition.resultKey,
      Points: Math.max(0, realityTvNumber_(points, realityTvNumber_(season.Points, 1))),
      Enabled: !!enabled[definition.templateId],
      DisplayOrder: definition.displayOrder,
      IncludeNoOutcome: definition.includeNoOutcome,
      CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now,
      UpdatedAt: now
    };
  });
  realityTvBulkUpsertObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_TEMPLATES_SHEET,
    REALITY_TV_QUESTION_TEMPLATE_HEADERS, ["SeasonId", "TemplateId"], rows);
  return rows;
}

function realityTvFormatSupplementalQuestion_(template, season, episodeNumber) {
  return realityTvString_(template)
    .replace(/\{episode\}/gi, String(episodeNumber))
    .replace(/\{show\}/gi, realityTvString_(season.ShowName))
    .replace(/\{season\}/gi, realityTvString_(season.SeasonName));
}

function realityTvActiveContestants_(seasonId) {
  return realityTvContestantsForSeason_(seasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status || "active") === "active";
  });
}

function realityTvActiveTribes_(seasonId) {
  const map = {};
  realityTvActiveContestants_(seasonId).forEach(function(contestant) {
    const label = realityTvString_(contestant.TeamOrTribe);
    if (!label) return;
    const key = realityTvKey_(label);
    if (!map[key]) {
      map[key] = {
        id: "tribe-" + realityTvSlug_(label),
        label: label,
        imageUrl: "",
        subjectType: "tribe",
        externalSubjectId: "tribe-" + realityTvSlug_(label)
      };
    }
  });
  return Object.keys(map).sort().map(function(key) { return map[key]; });
}

function realityTvContestantAnswerOptions_(seasonId) {
  return realityTvActiveContestants_(seasonId).map(function(contestant) {
    return {
      id: contestant.ContestantId,
      label: contestant.Name,
      imageUrl: contestant.ImageUrl || "",
      subjectType: "contestant",
      externalSubjectId: contestant.ExternalSubjectId || contestant.ContestantId
    };
  });
}

function realityTvAnswerOptionsForTemplate_(season, template) {
  const source = realityTvKey_(template.AnswerSource);
  const tribes = realityTvActiveTribes_(season.SeasonId);
  let options = [];
  if (source === "active-tribes") {
    options = tribes;
    if (options.length < 2) return { options: [], skipped: true, reason: "Fewer than two active tribes remain." };
  } else if (source === "auto-competition") {
    options = tribes.length >= 2 ? tribes : realityTvContestantAnswerOptions_(season.SeasonId);
  } else {
    options = realityTvContestantAnswerOptions_(season.SeasonId);
  }

  if (realityTvBool_(template.IncludeNoOutcome)) {
    const noLabel = realityTvKey_(template.QuestionType) === "tribal-attendee" ? "No Tribal Council" : "No one";
    options = options.concat([{
      id: realityTvKey_(template.QuestionType) === "tribal-attendee" ? "no-tribal-council" : "no-one",
      label: noLabel,
      imageUrl: "",
      subjectType: "outcome",
      externalSubjectId: realityTvKey_(template.QuestionType) + "-none"
    }]);
  }
  return { options: options, skipped: false, reason: "" };
}

function realityTvBuildSupplementalQuestionsForEpisode_(season, episode, options) {
  options = options || {};
  realityTvEnsureQuestionPackSystem_();
  const templates = realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Enabled);
  });
  if (!templates.length) return { success: true, created: 0, skipped: 0, questions: [] };

  const setup = adminGetGameSetup({ gameId: season.GameId });
  const categories = setup.categories || [];
  const now = new Date();
  const built = [];
  const hubItems = [];
  let skipped = 0;

  templates.forEach(function(template) {
    const answerBundle = realityTvAnswerOptionsForTemplate_(season, template);
    if (answerBundle.skipped || answerBundle.options.length < 2) {
      skipped += 1;
      return;
    }
    const type = realityTvSlug_(template.QuestionType || template.TemplateId);
    const categoryId = "episode-" + episode.EpisodeNumber + "-" + type;
    const episodeQuestionId = episode.EpisodeId + "-" + type;
    const externalMarketId = season.GameId + "-episode-" + episode.EpisodeNumber + "-" + type;
    const question = realityTvFormatSupplementalQuestion_(template.QuestionTemplate, season, episode.EpisodeNumber);
    let category = categories.find(function(item) {
      return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
    });

    if (!category) {
      adminCreateCategory({
        gameId: season.GameId,
        category: question,
        categoryId: categoryId,
        section: "Episode " + episode.EpisodeNumber,
        points: realityTvNumber_(template.Points, realityTvNumber_(season.Points, 1)),
        locked: false,
        lockDateTime: episode.LockDateTime,
        displayOrder: (realityTvNumber_(episode.EpisodeNumber, 0) * 100) + realityTvNumber_(template.DisplayOrder, 50),
        groupId: "reality-tv-episode-" + episode.EpisodeNumber,
        layoutType: answerBundle.options.some(function(item) { return item.imageUrl; }) ? "image" : "text",
        shortName: realityTvString_(template.QuestionType).replace(/-/g, " "),
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
    }

    const refreshed = adminGetGameSetup({ gameId: season.GameId });
    category = (refreshed.categories || []).find(function(item) {
      return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
    });
    if (!category) throw new Error("Episode question could not be created: " + categoryId + ".");

    const existingNominees = {};
    (category.nominees || []).forEach(function(item) { existingNominees[realityTvKey_(item.nomineeId)] = true; });
    const missing = answerBundle.options.filter(function(item) { return !existingNominees[realityTvKey_(item.id)]; });
    if (missing.length) {
      adminBulkCreateNominees({
        gameId: season.GameId,
        categoryId: categoryId,
        category: question,
        section: "Episode " + episode.EpisodeNumber,
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
    }

    const prior = realityTvGetEpisodeQuestion_(episodeQuestionId);
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
      CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now,
      UpdatedAt: now
    };
    realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET,
      REALITY_TV_EPISODE_QUESTION_HEADERS, ["EpisodeQuestionId"], row);
    built.push(row);
    hubItems.push({ question: row, answerOptions: answerBundle.options });
  });

  let hubSync = { success: true, skipped: true };
  if (!options.skipHubSync && hubItems.length) {
    hubSync = realityTvSyncSupplementalQuestionsToHubBatch_(season, episode, hubItems);
  }
  return {
    success: true,
    created: built.length,
    skipped: skipped,
    questions: built,
    hubWarning: hubSync && hubSync.error ? hubSync.error : ""
  };
}

function realityTvSyncSupplementalQuestionsToHubBatch_(season, episode, items) {
  try {
    const hub = realityTvOpenHub_();
    if (!hub) return { success: false, skipped: true, message: "External Results Hub is not configured." };
    const now = new Date();
    const entries = Array.isArray(items) ? items.filter(Boolean) : [];
    realityTvUpsertObject_(hub, "ExternalEvents", REALITY_TV_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], {
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        EventName: season.ShowName + " " + episode.EpisodeName,
        EventType: "reality-tv",
        StartDate: episode.AirDateTime,
        EndDate: episode.AirDateTime,
        Status: "scheduled",
        SourceUrl: "",
        LastUpdated: now,
        RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
        CreatedAt: now
      });

    const marketRows = [];
    const subjectByKey = {};
    const mappingRows = [];
    entries.forEach(function(entry) {
      const question = entry.question;
      const answerOptions = entry.answerOptions || [];
      marketRows.push({
        Provider: "manual-reality-tv",
        ExternalMarketId: question.ExternalMarketId,
        ExternalEventId: episode.ExternalEventId,
        MarketQuestion: question.QuestionText,
        OutcomesJSON: JSON.stringify(answerOptions.map(function(item) { return item.label; })),
        PricesJSON: "{}",
        ClosingTime: episode.LockDateTime,
        ResolutionStatus: "pending",
        WinningOutcome: "",
        ResolutionSource: "manual-reality-tv",
        SourceUrl: "",
        LastUpdated: now,
        RawJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          episodeQuestionId: question.EpisodeQuestionId,
          questionType: question.QuestionType
        }),
        CreatedAt: now
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
            MetadataJSON: JSON.stringify({ seasonId: season.SeasonId }),
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
            questionType: question.QuestionType
          }),
          Active: true,
          CreatedAt: now,
          UpdatedAt: now
        });
      });
    });

    realityTvBulkUpsertObjects_(hub, "ExternalMarkets", REALITY_TV_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], marketRows);
    realityTvBulkUpsertObjects_(hub, "ExternalSubjects", REALITY_TV_HUB_HEADERS.ExternalSubjects,
      ["Provider", "ExternalSubjectId"], Object.keys(subjectByKey).map(function(key) { return subjectByKey[key]; }));
    realityTvBulkUpsertObjects_(hub, "AppMappings", REALITY_TV_HUB_HEADERS.AppMappings,
      ["MappingId"], mappingRows);
    return { success: true, markets: marketRows.length, mappings: mappingRows.length };
  } catch (err) {
    return { success: false, skipped: true, error: err.message };
  }
}

function realityTvSyncSupplementalQuestionToHub_(season, episode, question, answerOptions) {
  return realityTvSyncSupplementalQuestionsToHubBatch_(season, episode, [{
    question: question,
    answerOptions: answerOptions || []
  }]);
}

function realityTvCreateSupplementalHubPendingResult_(season, episode, question, outcome, evidenceUrl, notes) {
  try {
    const hub = realityTvOpenHub_();
    if (!hub) return { importedResultId: "", reviewId: "", skipped: true };
    const now = new Date();
    const importedResultId = realityTvId_("rtq-result");
    const reviewId = realityTvId_("rtq-review");
    const fingerprint = ["manual-reality-tv", question.ExternalEventId, question.ExternalMarketId, outcome.label].join("|").toLowerCase();
    realityTvAppendObject_(realityTvGetOrCreateSheet_(hub, "ImportedResults", REALITY_TV_HUB_HEADERS.ImportedResults), {
      ImportedResultId: importedResultId,
      Provider: "manual-reality-tv",
      ExternalEventId: question.ExternalEventId,
      ExternalMarketId: question.ExternalMarketId,
      ResultKey: question.ResultKey,
      ResultValue: outcome.label,
      Finality: "FINAL",
      WinningOutcome: outcome.label,
      ProviderTimestamp: now,
      ImportedAt: now,
      EvidenceUrl: evidenceUrl || "",
      SourceUrl: evidenceUrl || "",
      RawJSON: JSON.stringify({
        seasonId: season.SeasonId,
        episodeId: episode.EpisodeId,
        episodeQuestionId: question.EpisodeQuestionId,
        questionType: question.QuestionType,
        outcomeId: outcome.id
      }),
      ReviewStatus: "PENDING",
      ReviewRequired: true,
      SourceFingerprint: fingerprint,
      CreatedAt: now,
      UpdatedAt: now
    });
    realityTvAppendObject_(realityTvGetOrCreateSheet_(hub, "ReviewQueue", REALITY_TV_HUB_HEADERS.ReviewQueue), {
      ReviewId: reviewId,
      ImportedResultId: importedResultId,
      Provider: "manual-reality-tv",
      ExternalEventId: question.ExternalEventId,
      ExternalMarketId: question.ExternalMarketId,
      ResultKey: question.ResultKey,
      ResultValue: outcome.label,
      Finality: "FINAL",
      WinningOutcome: outcome.label,
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
    });
    return { importedResultId: importedResultId, reviewId: reviewId };
  } catch (err) {
    return { importedResultId: "", reviewId: "", skipped: true, error: err.message };
  }
}

function apiAdminUpdateRealityTvQuestionPack(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const enabledTypes = realityTvEnabledQuestionTypes_(payload.enabledQuestionTypesJSON || payload.enabledQuestionTypes || []);
  realityTvSaveStandardQuestionPack_(season, enabledTypes, payload.points || season.Points);
  let build = { created: 0, skipped: 0 };
  if (payload.buildCurrentEpisode === undefined || realityTvBool_(payload.buildCurrentEpisode)) {
    const episode = realityTvGetEpisode_(payload.episodeId) || realityTvEpisodesForSeason_(season.SeasonId).slice(-1)[0];
    if (episode) build = realityTvBuildSupplementalQuestionsForEpisode_(season, episode);
  }
  return {
    success: true,
    enabledQuestionTypes: enabledTypes,
    created: build.created || 0,
    skipped: build.skipped || 0,
    message: "Episode question pack saved" + ((build.created || build.skipped) ? "; current episode questions were built or repaired." : ".")
  };
}

function apiAdminBuildRealityTvEpisodeQuestions(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  realityTvEnsureQuestionPackSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  const episode = realityTvGetEpisode_(payload.episodeId);
  if (!season || !episode) throw new Error("Season or episode not found.");
  const result = realityTvBuildSupplementalQuestionsForEpisode_(season, episode);
  result.message = (result.created || 0) + " episode question" + ((result.created || 0) === 1 ? "" : "s") + " built or repaired.";
  return result;
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
  const selectedId = realityTvKey_(payload.selectedOutcomeId);
  const selected = options.find(function(item) { return realityTvKey_(item.id) === selectedId; });
  if (!selected) throw new Error("Select one valid outcome.");

  const existingPending = realityTvQuestionQueueForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(question.EpisodeQuestionId) &&
      ["pending", "approving"].indexOf(realityTvKey_(row.ReviewStatus)) !== -1;
  });
  if (existingPending) throw new Error("This question already has a result awaiting review.");

  const now = new Date();
  const hubResult = realityTvCreateSupplementalHubPendingResult_(season, episode, question, selected,
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
    SelectedOutcomeId: selected.id,
    SelectedOutcomeLabel: selected.label,
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
  return { success: true, message: "Question result submitted for administrator review.", queueId: queue.QueueId };
}

function realityTvQuestionApprovalState_(queue) {
  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  const stage = realityTvString_(queue.ApprovalStage || (status === "APPROVED" ? "COMPLETE" : "SETTLE")).toUpperCase();
  return {
    success: true,
    queueId: queue.QueueId,
    reviewStatus: status,
    stage: stage,
    pushStatus: realityTvString_(queue.PushStatus),
    complete: status === "APPROVED" || stage === "COMPLETE",
    error: realityTvString_(queue.ErrorMessage)
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
    realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET), queue.__rowNumber, {
      ReviewStatus: "APPROVING",
      ReviewedBy: realityTvString_(payload.username || "administrator"),
      ReviewedAt: now,
      PushStatus: "QUEUED",
      ApprovalStage: "SETTLE",
      ApprovalStartedAt: now,
      ApprovalCompletedAt: "",
      ErrorMessage: "",
      UpdatedAt: now
    });
  }
  return realityTvQuestionApprovalState_(realityTvGetQuestionQueue_(payload.queueId));
}

function realityTvSettleSupplementalQuestion_(question, queue, reviewer) {
  const setup = adminGetGameSetup({ gameId: question.GameId });
  const category = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(question.CategoryId);
  });
  if (!category) throw new Error("Question not found in Game Setup.");
  const winnerId = realityTvString_(queue.SelectedOutcomeId);
  const resultPayloads = (category.nominees || []).map(function(nominee) {
    return {
      gameId: question.GameId,
      categoryId: question.CategoryId,
      nomineeId: nominee.nomineeId,
      resultStatus: "settled",
      isWinner: realityTvKey_(nominee.nomineeId) === realityTvKey_(winnerId),
      resultValue: queue.SelectedOutcomeLabel,
      resultSource: "manual-reality-tv",
      notes: "Approved in Reality TV Season Manager by " + (reviewer || "administrator")
    };
  });
  if (typeof upsertCategoryResultsBulk_ === "function") upsertCategoryResultsBulk_(resultPayloads);
  else resultPayloads.forEach(function(item) { upsertCategoryResult_(item); });

  adminUpdateCategory({
    gameId: question.GameId,
    categoryId: question.CategoryId,
    locked: true,
    winnerNomineeId: winnerId,
    settlementStatus: "settled",
    resultSource: "manual-reality-tv",
    resultSourceType: "reality-tv",
    resultProvider: "manual-reality-tv",
    externalEventId: question.ExternalEventId,
    externalMarketId: question.ExternalMarketId,
    statKey: question.ResultKey,
    autoSettle: false,
    requireAdminReview: true,
    username: reviewer || "",
    notes: "Approved Reality TV episode question result"
  });

  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET), question.__rowNumber, {
    Status: "FINAL",
    WinningOutcomeIds: JSON.stringify([winnerId]),
    UpdatedAt: new Date()
  });
  return { winnerId: winnerId };
}

function realityTvSyncSupplementalApprovalHub_(question, queue, reviewer) {
  const warnings = [];
  try {
    const hub = realityTvOpenHub_();
    if (hub) {
      const markets = realityTvReadObjects_(hub, "ExternalMarkets");
      const market = markets.find(function(row) {
        return realityTvKey_(row.Provider) === "manual-reality-tv" &&
          realityTvKey_(row.ExternalMarketId) === realityTvKey_(question.ExternalMarketId);
      });
      if (market) {
        realityTvUpdateObjectRow_(hub.getSheetByName("ExternalMarkets"), market.__rowNumber, {
          ResolutionStatus: "final",
          WinningOutcome: queue.SelectedOutcomeLabel,
          ResolutionSource: "manual-reality-tv",
          LastUpdated: new Date()
        });
      }
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
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { success: true, busy: true, complete: false, message: "Another approval stage is still running." };
  try {
    let queue = realityTvGetQuestionQueue_(payload.queueId);
    if (!queue) throw new Error("Question review item not found.");
    if (realityTvString_(queue.ReviewStatus).toUpperCase() === "PENDING") {
      apiAdminApproveRealityTvQuestionResult(payload);
      queue = realityTvGetQuestionQueue_(payload.queueId);
    }
    if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVED") return realityTvQuestionApprovalState_(queue);
    if (realityTvString_(queue.ReviewStatus).toUpperCase() !== "APPROVING") throw new Error("This result is not awaiting approval processing.");
    const question = realityTvGetEpisodeQuestion_(queue.EpisodeQuestionId);
    if (!question) throw new Error("Episode question not found.");
    const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET);
    const reviewer = realityTvString_(queue.ReviewedBy || payload.username || "administrator");
    const stage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
    const attempts = realityTvNumber_(queue.ApprovalAttemptCount, 0) + 1;
    const now = new Date();
    try {
      if (stage === "SETTLE") {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "SETTLING QUESTION",
          ApprovalAttemptCount: attempts,
          ErrorMessage: "",
          UpdatedAt: now
        });
        realityTvSettleSupplementalQuestion_(question, queue, reviewer);
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "QUESTION SETTLED",
          ApprovalStage: "SYNC_HUB",
          ErrorMessage: "",
          UpdatedAt: new Date()
        });
        const state = realityTvQuestionApprovalState_(realityTvGetQuestionQueue_(queue.QueueId));
        state.message = "Question settled. Finishing Hub approval records.";
        return state;
      }
      if (stage === "SYNC_HUB") {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "SYNCING APPROVAL",
          ApprovalAttemptCount: attempts,
          ErrorMessage: "",
          UpdatedAt: now
        });
        const hub = realityTvSyncSupplementalApprovalHub_(question, queue, reviewer);
        const completedAt = new Date();
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          ReviewStatus: "APPROVED",
          PushStatus: "PUSHED",
          PushedAt: completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ErrorMessage: hub.warning || "",
          UpdatedAt: completedAt
        });
        const state = realityTvQuestionApprovalState_(realityTvGetQuestionQueue_(queue.QueueId));
        state.warning = hub.warning || "";
        state.message = "Question result approved and pushed.";
        return state;
      }
      if (stage === "COMPLETE") return realityTvQuestionApprovalState_(queue);
      throw new Error("Unknown question approval stage: " + stage + ".");
    } catch (err) {
      realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
        PushStatus: "ERROR",
        ApprovalAttemptCount: attempts,
        ErrorMessage: err.message || String(err),
        UpdatedAt: new Date()
      });
      throw err;
    }
  } finally {
    lock.releaseLock();
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
