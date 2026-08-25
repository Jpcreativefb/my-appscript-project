/* =========================================================
   AUTOMATION HEALTH ENGINE — v1.2.19-rc1
   Central visibility for installable Apps Script triggers.
   It intentionally cleans duplicates only for durable workers
   whose installers already enforce a one-trigger contract.
========================================================= */

var AUTOMATION_HEALTH_TRIGGER_LIMIT_ = 20;

var AUTOMATION_HEALTH_DURABLE_HANDLERS_ = {
  externalResultsProcessHubOutbox: "External Results Inbox",
  runScoringAutomation: "Scoring Automation",
  runSportsWagerScoreRefresh: "Sports Score Refresh",
  runSportsWagerAutoRefreshAndSettle: "Sports Wager Settle",
  runSportsWagerSmartAutomation: "Smart Sports Automation",
  notificationPushRunScheduledPickReminders: "Pick Reminder Notifications",
  teamFantasySyncTriggerHandler: "Team Fantasy Sync",
  survivorSportsAutomationTick: "Survivor / KOTH Automation"
};

var AUTOMATION_HEALTH_TRANSIENT_HANDLERS_ = {
  realityTvContinuePendingApprovalKick: "Reality TV Approval Kick",
  realityTvContinuePendingApprovals: "Reality TV Approval Worker",
  realityTvContinuePendingQuestionBuilds: "Reality TV Question Builder",
  realityTvContinueNextEpisodeJobs: "Reality TV Next Episode Worker"
};

function automationHealthSafeTriggerText_(trigger, method) {
  try {
    return trigger && typeof trigger[method] === "function"
      ? String(trigger[method]() || "")
      : "";
  } catch (err) {
    return "";
  }
}

function automationHealthClassify_(handler) {
  handler = String(handler || "").trim();
  if (AUTOMATION_HEALTH_DURABLE_HANDLERS_[handler]) {
    return { kind: "durable", label: AUTOMATION_HEALTH_DURABLE_HANDLERS_[handler] };
  }
  if (AUTOMATION_HEALTH_TRANSIENT_HANDLERS_[handler]) {
    return { kind: "transient", label: AUTOMATION_HEALTH_TRANSIENT_HANDLERS_[handler] };
  }
  return { kind: "other", label: handler || "Unknown trigger" };
}

function automationHealthSnapshot_() {
  const triggers = ScriptApp.getProjectTriggers();
  const byHandler = {};
  const rows = [];

  triggers.forEach(function(trigger) {
    const handler = automationHealthSafeTriggerText_(trigger, "getHandlerFunction");
    const classification = automationHealthClassify_(handler);
    const row = {
      handler: handler,
      label: classification.label,
      kind: classification.kind,
      eventType: automationHealthSafeTriggerText_(trigger, "getEventType"),
      source: automationHealthSafeTriggerText_(trigger, "getTriggerSource"),
      uniqueId: automationHealthSafeTriggerText_(trigger, "getUniqueId")
    };
    rows.push(row);
    byHandler[handler] = byHandler[handler] || [];
    byHandler[handler].push(row);
  });

  const duplicateHandlers = [];
  Object.keys(byHandler).forEach(function(handler) {
    const group = byHandler[handler] || [];
    if (group.length > 1) {
      const classification = automationHealthClassify_(handler);
      duplicateHandlers.push({
        handler: handler,
        label: classification.label,
        kind: classification.kind,
        count: group.length,
        removable: classification.kind === "durable"
      });
    }
  });

  const total = rows.length;
  const remaining = Math.max(0, AUTOMATION_HEALTH_TRIGGER_LIMIT_ - total);
  let level = "healthy";
  if (total >= AUTOMATION_HEALTH_TRIGGER_LIMIT_) level = "critical";
  else if (total >= 16 || duplicateHandlers.some(function(item) { return item.removable; })) level = "warning";

  return {
    success: true,
    level: level,
    totalTriggers: total,
    triggerLimit: AUTOMATION_HEALTH_TRIGGER_LIMIT_,
    remainingSlots: remaining,
    durableTriggers: rows.filter(function(row) { return row.kind === "durable"; }),
    transientTriggers: rows.filter(function(row) { return row.kind === "transient"; }),
    otherTriggers: rows.filter(function(row) { return row.kind === "other"; }),
    duplicates: duplicateHandlers,
    duplicateDurableCount: duplicateHandlers.filter(function(item) { return item.removable; }).length,
    checkedAt: new Date().toISOString()
  };
}

function apiAdminGetAutomationHealth(payload) {
  requireAdmin_(payload || {});
  return automationHealthSnapshot_();
}

function apiAdminCleanupDuplicateAutomationTriggers(payload) {
  requireAdmin_(payload || {});

  const triggers = ScriptApp.getProjectTriggers();
  const kept = {};
  let removed = 0;
  const removedHandlers = {};

  triggers.forEach(function(trigger) {
    const handler = automationHealthSafeTriggerText_(trigger, "getHandlerFunction");
    if (!AUTOMATION_HEALTH_DURABLE_HANDLERS_[handler]) return;
    if (!kept[handler]) {
      kept[handler] = true;
      return;
    }
    ScriptApp.deleteTrigger(trigger);
    removed++;
    removedHandlers[handler] = Number(removedHandlers[handler] || 0) + 1;
  });

  const snapshot = automationHealthSnapshot_();
  snapshot.removed = removed;
  snapshot.removedHandlers = removedHandlers;
  snapshot.message = removed
    ? "Removed " + removed + " duplicate durable automation trigger(s)."
    : "No duplicate durable automation triggers found.";
  return snapshot;
}
