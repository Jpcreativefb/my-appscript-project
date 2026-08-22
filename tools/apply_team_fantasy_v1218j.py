#!/usr/bin/env python3
"""Apply Awards App Team Fantasy Football v1.2.18j over the current checkout.

Designed as an overlay patch: current local v1.2.18 work remains authoritative.
The script copies only new Team Fantasy files and patches stable integration hooks.
Idempotent: rerunning does not duplicate routes or UI hooks.
"""
from pathlib import Path
import re
import shutil
import sys

RELEASE = Path(__file__).resolve().parents[1]
REPO = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
MARK = "TEAM FANTASY v1.2.18j"


def fail(msg):
    raise SystemExit("Team Fantasy installer stopped: " + msg)


def read(rel):
    p = REPO / rel
    if not p.exists():
        fail(f"required current project file is missing: {rel}")
    return p.read_text()


def write(rel, text):
    p = REPO / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def copy(rel):
    src = RELEASE / rel
    if not src.exists():
        fail(f"release file is missing: {rel}")
    dst = REPO / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def insert_before_once(text, marker, block, label):
    if block.strip() in text or MARK + " " + label in text:
        return text
    idx = text.find(marker)
    if idx < 0:
        fail(f"could not find integration marker for {label}: {marker[:80]}")
    return text[:idx] + block + text[idx:]


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        fail(f"could not find integration marker for {label}")
    return text.replace(old, new, 1)


def patch_api():
    rel = "backend/Api.js"
    s = read(rel)

    post = f'''    /* {MARK} POST ROUTES */\n    if (action === "saveTeamFantasyPick") return json(apiSaveTeamFantasyPick(body));\n    if (action === "randomTeamFantasyPicks") return json(apiRandomTeamFantasyPicks(body));\n    if (action === "autoPickTeamFantasy") return json(apiAutoPickTeamFantasy(body));\n    if (action === "adminSaveTeamFantasySettings") return json(apiAdminSaveTeamFantasySettings(body));\n    if (action === "adminSaveTeamFantasyRules") return json(apiAdminSaveTeamFantasyRules(body));\n    if (action === "adminCreateTeamFantasyLeague") return json(apiAdminCreateTeamFantasyLeague(body));\n    if (action === "adminAssignTeamFantasyLeagueMember") return json(apiAdminAssignTeamFantasyLeagueMember(body));\n    if (action === "adminRunTeamFantasySync") return json(apiAdminRunTeamFantasySync(body));\n    if (action === "adminInstallTeamFantasySyncTrigger") return json(apiAdminInstallTeamFantasySyncTrigger(body));\n    if (action === "adminSendTeamFantasyReminder") return json(apiAdminSendTeamFantasyReminder(body));\n\n'''
    s = insert_before_once(s, "    return json({\n      success:\n        false,\n\n      error:\n        \"Unknown POST action: \" + action", post, "POST ROUTES")

    get = f'''    /* {MARK} GET ROUTES */\n    if (action === "getTeamFantasyState") return json(apiGetTeamFantasyState(params));\n    if (action === "getTeamFantasyStandings") return json(apiGetTeamFantasyStandings(params));\n    if (action === "getTeamFantasyHeadToHead") return json(apiGetTeamFantasyHeadToHead(params));\n    if (action === "adminGetTeamFantasyDashboard") return json(apiAdminGetTeamFantasyDashboard(params));\n\n'''
    s = insert_before_once(s, "    /* =========================\n       UNKNOWN ACTION\n    ========================= */", get, "GET ROUTES")

    # Explicitly reject write actions sent via GET, matching the existing API contract.
    if f"{MARK} POST-ONLY ACTIONS" not in s:
        anchor = '      action === "adminSendPushNotification" ||\n'
        addition = (
            f'      /* {MARK} POST-ONLY ACTIONS */\n'
            '      action === "saveTeamFantasyPick" ||\n'
            '      action === "randomTeamFantasyPicks" ||\n'
            '      action === "autoPickTeamFantasy" ||\n'
            '      action === "adminSaveTeamFantasySettings" ||\n'
            '      action === "adminSaveTeamFantasyRules" ||\n'
            '      action === "adminCreateTeamFantasyLeague" ||\n'
            '      action === "adminAssignTeamFantasyLeagueMember" ||\n'
            '      action === "adminRunTeamFantasySync" ||\n'
            '      action === "adminInstallTeamFantasySyncTrigger" ||\n'
            '      action === "adminSendTeamFantasyReminder" ||\n'
        )
        if anchor not in s:
            fail("could not find API POST-only list")
        s = s.replace(anchor, anchor + addition, 1)

    write(rel, s)


def patch_games():
    rel = "backend/engines/GamesEngine.js"
    s = read(rel)
    if 'id: "team-fantasy"' not in s:
        block = '''    {\n      id: "team-fantasy",\n      label: "Team Fantasy Football",\n      description: "Weekly NFL team-unit fantasy with configurable scoring, leagues, All-Play standings and playoffs.",\n      predictionEnabled: false,\n      rankingEnabled: false,\n      confidenceEnabled: false,\n      wagerEnabled: false,\n      stakedPointsEnabled: false,\n      fixedPointsEnabled: false,\n      racingEnabled: false,\n      mixedGame: false\n    },\n'''
        marker = '    {\n      id: "mixed",'
        idx = s.find(marker)
        if idx < 0:
            marker = '    {\n      id: "ranking",'
            idx = s.find(marker)
        if idx < 0:
            fail("could not locate supported game type list")
        s = s[:idx] + block + s[idx:]
    write(rel, s)


def patch_preflight():
    rel = "backend/admin/AdminPreflight.js"
    s = read(rel)
    # Category-free Team Fantasy uses its own readiness checks.
    if 'gameType !== "team-fantasy"' not in s:
        pattern = r'if\s*\(\s*!categories\.length\s*&&\s*!leaderboardOnlyParent\s*\)\s*\{'
        m = re.search(pattern, s)
        if not m:
            fail("could not locate no-categories preflight check")
        s = s[:m.start()] + 'if (!categories.length && !leaderboardOnlyParent && gameType !== "team-fantasy") {' + s[m.end():]
    if MARK + " PREFLIGHT" not in s:
        anchor = '  if (leaderboardOnlyParent) {'
        idx = s.find(anchor)
        if idx < 0:
            # Fallback: place after the no-categories check before type-specific checks.
            anchor = '  /* =========================\n     GAME-TYPE CHECKS'
            idx = s.find(anchor)
        if idx < 0:
            fail("could not locate Team Fantasy preflight insertion point")
        block = f'''  /* {MARK} PREFLIGHT */\n  if (gameType === "team-fantasy" && typeof teamFantasyPreflightIssues_ === "function") {{\n    teamFantasyPreflightIssues_(gameId).forEach(function(issue) {{\n      adminPreflightAddIssue_(issues, issue.severity || "warning", issue.message || "Team Fantasy readiness issue.");\n    }});\n  }}\n\n'''
        s = s[:idx] + block + s[idx:]
    write(rel, s)


def patch_notifications():
    rel = "backend/engines/NotificationsEngine.js"
    s = read(rel)
    if MARK + " PARTICIPANTS" not in s:
        anchor = 'function notificationPushGameParticipants_(gameId) {\n  const unique = {};'
        repl = f'''function notificationPushGameParticipants_(gameId) {{\n  const unique = {{}};\n  /* {MARK} PARTICIPANTS */\n  if (typeof teamFantasyIsGame_ === "function" && teamFantasyIsGame_(gameId) && typeof teamFantasyParticipantUsernames_ === "function") {{\n    teamFantasyParticipantUsernames_(gameId).forEach(function(username) {{ unique[String(username || "").trim().toLowerCase()] = true; }});\n  }}'''
        s = replace_once(s, anchor, repl, "notification participants")
    if MARK + " MISSING PICKS" not in s:
        anchor = 'function notificationPushOutstandingPickSummary_(gameId, participants) {\n'
        repl = anchor + f'''  /* {MARK} MISSING PICKS */\n  if (typeof teamFantasyIsGame_ === "function" && teamFantasyIsGame_(gameId) && typeof teamFantasyNotificationOutstandingSummary_ === "function") {{\n    return teamFantasyNotificationOutstandingSummary_(gameId, participants);\n  }}\n'''
        s = replace_once(s, anchor, repl, "notification missing picks")
    write(rel, s)


def patch_frontend_app(rel):
    s = read(rel)
    if '"team-fantasy": ["teamFantasy"]' not in s:
        anchor = '  "betting": ["betting"],\n'
        add = '  "team-fantasy": ["teamFantasy"],\n'
        if anchor not in s: fail(f"could not locate page module map in {rel}")
        s = s.replace(anchor, anchor + add, 1)
    if '"admin-team-fantasy": ["admin", "adminUi", "adminTeamFantasy"]' not in s:
        anchor = '  "admin-reality-tv": ["admin", "adminUi", "adminRealityTv"],\n'
        add = '  "admin-team-fantasy": ["admin", "adminUi", "adminTeamFantasy"],\n'
        if anchor not in s: fail(f"could not locate admin page module map in {rel}")
        s = s.replace(anchor, anchor + add, 1)
    # Load launcher helper with normal Admin page.
    if '"admin": ["admin", "adminUi", "adminTeamFantasy"]' not in s:
        s = s.replace('  "admin": ["admin", "adminUi"],', '  "admin": ["admin", "adminUi", "adminTeamFantasy"],', 1)

    if MARK + " GAME ROUTE" not in s:
        anchor = '  if (\n    gameType === "wager" ||'
        idx = s.find(anchor)
        if idx < 0: fail(f"could not locate enterGame route in {rel}")
        block = f'''  /* {MARK} GAME ROUTE */\n  if (gameType === "team-fantasy") {{\n    await navigate("team-fantasy");\n    return;\n  }}\n\n'''
        s = s[:idx] + block + s[idx:]

    if 'case "team-fantasy":' not in s:
        anchor = '    case "betting":\n'
        idx = s.find(anchor)
        if idx < 0: fail(f"could not locate render switch in {rel}")
        block = '''    case "team-fantasy":\n      if (typeof renderTeamFantasyPage !== "function") throw new Error("Team Fantasy page script is not loaded.");\n      app.innerHTML = await renderTeamFantasyPage();\n      break;\n\n'''
        s = s[:idx] + block + s[idx:]

    if 'case "admin-team-fantasy":' not in s:
        anchor = '    case "admin-reality-tv":\n'
        idx = s.find(anchor)
        if idx < 0: fail(f"could not locate admin render switch in {rel}")
        block = '''    case "admin-team-fantasy":\n      if (typeof renderAdminTeamFantasyPage !== "function") throw new Error("Team Fantasy admin script is not loaded.");\n      app.innerHTML = await renderAdminTeamFantasyPage();\n      break;\n\n'''
        s = s[:idx] + block + s[idx:]

    if MARK + " ADMIN LAUNCHER" not in s:
        anchor = '''      if (typeof adminUiEnhancePage === "function") {\n        setTimeout(function() { adminUiEnhancePage(app); }, 0);\n      }\n'''
        if anchor not in s: fail(f"could not locate Admin enhancer in {rel}")
        add = anchor + f'''      /* {MARK} ADMIN LAUNCHER */\n      if (typeof teamFantasyEnhanceAdminLanding_ === "function") {{\n        setTimeout(function() {{ teamFantasyEnhanceAdminLanding_(); }}, 0);\n      }}\n'''
        s = s.replace(anchor, add, 1)
    write(rel, s)


def patch_sw():
    rel = "frontend/sw.js"
    s = read(rel)
    if "v1218j-team-fantasy" not in s:
        m = re.search(r'(const\s+AWARDS_CACHE\s*=\s*")([^"]+)(";)', s)
        if not m: fail("could not locate service-worker cache name")
        s = s[:m.start()] + m.group(1) + m.group(2) + '-v1218j-team-fantasy' + m.group(3) + s[m.end():]
    for asset, anchor in [
        ('  "./css/team-fantasy.css",\n', '  "./css/pages.css",\n'),
        ('  "./js/pages/teamFantasy.js",\n  "./js/pages/adminTeamFantasy.js",\n', '  "./js/pages/adminAppearance.js"\n')
    ]:
        key = asset.strip().split('\n')[0].strip().rstrip(',')
        if key.strip('"') in s:
            continue
        if anchor not in s:
            # Assets are lazy-loaded; cache bump is sufficient if shell list changed in later versions.
            continue
        if anchor.endswith('\n') and 'adminAppearance' not in anchor:
            s = s.replace(anchor, anchor + asset, 1)
        else:
            s = s.replace(anchor, anchor.rstrip('\n') + ',\n' + asset.rstrip('\n') + '\n', 1)
    write(rel, s)


def patch_frontend_api_timeout(rel):
    p = REPO / rel
    if not p.exists(): return
    s = p.read_text()
    if '"adminRunTeamFantasySync"' not in s:
        anchor = '    "adminGetSportsControlDashboard",\n'
        if anchor in s:
            s = s.replace(anchor, anchor + '    "getTeamFantasyState",\n    "adminGetTeamFantasyDashboard",\n    "adminRunTeamFantasySync",\n', 1)
    p.write_text(s)


def main():
    if not (REPO / ".git").exists():
        fail(f"{REPO} is not a Git repository root")

    for rel in [
        "backend/engines/SportsTeamFantasyEngine.js",
        "frontend/js/pages/teamFantasy.js",
        "frontend/js/pages/adminTeamFantasy.js",
        "frontend/css/team-fantasy.css",
        "tests/team_fantasy_v1218j_tests.js",
        "tools/apply_team_fantasy_v1218j.py",
        "tools/install_team_fantasy_v1218j.sh",
        "docs/TEAM_FANTASY_FOOTBALL_V1_2_18J.md",
        "CHANGED_FILES_V1_2_18J.txt",
    ]:
        copy(rel)

    patch_api()
    patch_games()
    patch_preflight()
    patch_notifications()
    patch_frontend_app("frontend/js/app.js")
    if (REPO / "frontend/app.js").exists():
        patch_frontend_app("frontend/app.js")
    patch_frontend_api_timeout("frontend/js/api.js")
    patch_frontend_api_timeout("frontend/api.js")
    patch_sw()

    print("Team Fantasy Football v1.2.18j overlay applied.")
    print("Game type: team-fantasy")
    print("New engine/UI/scoring/leagues/H2H/reminders/playoff support installed.")


if __name__ == "__main__":
    main()
