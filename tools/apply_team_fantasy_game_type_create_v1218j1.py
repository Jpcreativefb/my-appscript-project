#!/usr/bin/env python3
"""Apply Team Fantasy Football v1.2.18j1 Manage Games create-type hotfix."""
from pathlib import Path
import re, shutil, sys

REPO = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
PKG = Path(__file__).resolve().parents[1]
MARK = "TEAM_FANTASY_V1218J1"

def fail(msg):
    raise SystemExit("Team Fantasy j1 hotfix stopped: " + msg)

def read(rel):
    p = REPO / rel
    if not p.exists(): fail(f"missing required file: {rel}")
    return p.read_text()

def write(rel, text):
    (REPO / rel).write_text(text)

def copy_support():
    for rel in [
        "CHANGED_FILES_V1_2_18J1.txt",
        "docs/TEAM_FANTASY_CREATE_GAME_HOTFIX_V1_2_18J1.md",
        "tests/team_fantasy_game_type_create_v1218j1_tests.js",
        "tools/apply_team_fantasy_game_type_create_v1218j1.py",
        "tools/install_team_fantasy_game_type_create_v1218j1.sh",
    ]:
        src = PKG / rel
        dst = REPO / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.resolve() != dst.resolve():
            shutil.copy2(src, dst)

def verify_base():
    if not (REPO / ".git").exists():
        fail(f"{REPO} is not a Git repository root")
    games = read("backend/engines/GamesEngine.js")
    if 'id: "team-fantasy"' not in games:
        fail("v1.2.18j Team Fantasy backend is not installed yet")
    if not (REPO / "backend/engines/SportsTeamFantasyEngine.js").exists():
        fail("SportsTeamFantasyEngine.js is missing; install v1.2.18j first")

def patch_admin():
    rel = "frontend/js/pages/admin.js"
    s = read(rel)

    # Manage Games uses an explicit ordered list rather than rendering every
    # backend game type. v1.2.18j added the backend type but did not add it here.
    option = '    ["team-fantasy", "Team Fantasy Football"],\n'
    if option not in s:
        anchor = '    ["survivor", "Survivor / Elimination Game"],\n    ["mixed", "Hybrid Game"]\n'
        if anchor not in s:
            fail("could not locate Manage Games ordered game-type list")
        s = s.replace(
            anchor,
            '    ["survivor", "Survivor / Elimination Game"],\n' + option + '    ["mixed", "Hybrid Game"]\n',
            1,
        )

    summary = '''  if (type === "team-fantasy") {\n    return "Team Fantasy Engine: ON • Normal Predictions/Wagers: OFF";\n  }\n\n'''
    if 'Team Fantasy Engine: ON' not in s:
        anchor = '  if (type === "mixed") {\n'
        pos = s.find(anchor)
        if pos == -1:
            fail("could not locate game-type summary insertion point")
        # Insert in adminGameTypeSummaryText_, not an earlier mixed branch.
        fn = s.find('function adminGameTypeSummaryText_')
        pos = s.find(anchor, fn)
        if fn == -1 or pos == -1:
            fail("could not locate adminGameTypeSummaryText_ mixed branch")
        s = s[:pos] + summary + s[pos:]

    # Explicitly document the no-generic-gameplay default. The existing reset
    # already produces these values; this branch makes the intent durable.
    marker = f'  /* {MARK} DEFAULTS */\n'
    if marker not in s:
        fn = s.find('function adminApplyGameTypeDefaults')
        if fn == -1: fail("could not locate adminApplyGameTypeDefaults")
        anchor = '  if (["prediction", "head-to-head", "survivor"].indexOf(type) !== -1) {\n'
        pos = s.find(anchor, fn)
        if pos == -1: fail("could not locate game-type defaults insertion point")
        block = marker + '''  if (type === "team-fantasy") {\n    // Team Fantasy uses SportsTeamFantasyEngine rather than generic questions.\n    // The common reset above intentionally leaves all generic scoring flags off.\n  }\n\n'''
        s = s[:pos] + block + s[pos:]

    write(rel, s)

def patch_sw():
    rel = "frontend/sw.js"
    s = read(rel)
    if "v1218j1-team-fantasy-create" not in s:
        m = re.search(r'(const\s+AWARDS_CACHE\s*=\s*")([^"]+)(";)', s)
        if not m:
            fail("could not locate service-worker cache name")
        base = m.group(2)
        # Avoid an endlessly growing repeated suffix if the hotfix is rerun.
        new_name = base + "-v1218j1-team-fantasy-create"
        s = s[:m.start()] + m.group(1) + new_name + m.group(3) + s[m.end():]
    write(rel, s)

def main():
    verify_base()
    copy_support()
    patch_admin()
    patch_sw()
    print("Team Fantasy v1.2.18j1 create-game hotfix applied.")
    print("Manage Games now exposes: Team Fantasy Football")

if __name__ == "__main__":
    main()
