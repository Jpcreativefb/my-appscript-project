#!/usr/bin/env python3
from pathlib import Path
import sys

repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
path = repo / 'backend/admin/AdminPreflight.js'
text = path.read_text()
marker = 'TEAM_FANTASY_V1218P_FAST_PREFLIGHT'
if marker in text:
    print('Team Fantasy v1.2.18p fast preflight already applied.')
    sys.exit(0)
needle = '''  /* =========================\n     SETUP CHECKS\n  ========================= */'''
if needle not in text:
    raise SystemExit('STOP: Could not find AdminPreflight SETUP CHECKS marker. No files changed.')
block = r'''  /* =====================================================
     TEAM_FANTASY_V1218P_FAST_PREFLIGHT

     Team Fantasy is category-free by design. Do not call the generic
     adminGetGameSetup() loader for this game type; that loader scans the
     normal Categories/Question setup and can be slow enough to time out.
     Validate only Team Fantasy's saved settings + scoring rules here.
  ===================================================== */
  if (adminPreflightGameType_(game) === "team-fantasy") {
    if (typeof teamFantasyPreflightIssues_ !== "function") {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Team Fantasy preflight validator is unavailable."
      );
    } else {
      const teamFantasyIssues =
        teamFantasyPreflightIssues_(gameId) || [];

      teamFantasyIssues.forEach(function(issue) {
        adminPreflightAddIssue_(
          issues,
          issue && issue.severity ? issue.severity : "warning",
          issue && issue.message
            ? issue.message
            : "Team Fantasy preflight reported an unspecified issue."
        );
      });
    }

    const teamFantasyStatus =
      adminPreflightNormalize_(game.status);
    const teamFantasyErrorCount =
      issues.filter(function(issue) {
        return issue.severity === "error";
      }).length;
    const teamFantasyWarningCount =
      issues.filter(function(issue) {
        return issue.severity === "warning";
      }).length;

    return {
      success: true,
      ready: teamFantasyErrorCount === 0,
      gameId: gameId,
      gameType: "team-fantasy",
      status: teamFantasyStatus || "",
      realityTvManaged: false,
      canRepairRealityTv: false,
      categoryModeCounts: {
        picks: 0,
        confidence: 0,
        staked: 0,
        wagers: 0,
        rankings: 0
      },
      errorCount: teamFantasyErrorCount,
      warningCount: teamFantasyWarningCount,
      issueCount: issues.length,
      issues: issues,
      fastPath: true
    };
  }

'''
text = text.replace(needle, block + needle, 1)
path.write_text(text)
print('Team Fantasy Football v1.2.18p fast preflight applied.')
print('- Team Fantasy Run Check bypasses generic category/question loading')
print('- Existing Team Fantasy settings/rules validator is restored')
print('- Normal games keep the existing preflight path')
