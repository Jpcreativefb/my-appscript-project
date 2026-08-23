#!/usr/bin/env python3
from pathlib import Path
import subprocess, sys

MARKER = 'TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_UI_v1218u1'
BASELINE_MARKER = 'TEAM_FANTASY_WEEKLY_HUB_UI_v1218t2'
BACKEND_MARKER = 'TEAM_FANTASY_WEEKLY_HUB_BACKEND_v1218t2'

repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
pkg = Path(__file__).resolve().parent.parent
patch = Path(__file__).resolve().parent / 'patches' / 'team_fantasy_week_history_compare_v1218u1.patch'
page = repo / 'frontend/js/pages/teamFantasy.js'
backend = repo / 'backend/engines/SportsTeamFantasyGameDayEngine.js'

if not page.exists() or not backend.exists():
    raise SystemExit('STOP: Team Fantasy runtime files are missing.')
if MARKER in page.read_text():
    print('Team Fantasy v1.2.18u1 is already applied.')
    raise SystemExit(0)
if BASELINE_MARKER not in page.read_text():
    raise SystemExit('STOP: Required v1.2.18t2 player UI marker is missing.')
if BACKEND_MARKER not in backend.read_text():
    raise SystemExit('STOP: Required v1.2.18t2 game-day backend marker is missing.')
if not patch.exists():
    raise SystemExit('STOP: v1.2.18u1 patch file is missing from the package.')

subprocess.run(['git','apply','--check',str(patch)], cwd=repo, check=True)
subprocess.run(['git','apply',str(patch)], cwd=repo, check=True)

if MARKER not in page.read_text():
    raise SystemExit('STOP: v1.2.18u1 UI marker missing after patch.')
print('Team Fantasy v1.2.18u1 applied transactionally.')
print('- Pickers and League rows use dark navy surfaces with white borders')
print('- Viewer is identified by blue border instead of YOU text')
print('- Compare freezes the viewer column left and team headers top')
print('- Compare/League View can switch to past weeks from cached data')
print('- Week History is restored as the final player-page section')
print('- Picker colors show 3+/2/1 uses left; exhausted teams are removed')
print('- BYE teams stay visible but ghosted and disabled for that week')
