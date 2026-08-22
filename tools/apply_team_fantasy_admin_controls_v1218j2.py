#!/usr/bin/env python3
"""Apply Team Fantasy Football v1.2.18j2 admin/POST reliability hotfix."""
from pathlib import Path
import re
import shutil
import sys

REPO = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
PKG = Path(__file__).resolve().parents[1]
MARK = "TEAM_FANTASY_V1218J2"


def fail(msg):
    raise SystemExit("Team Fantasy j2 hotfix stopped: " + msg)


def read(rel):
    p = REPO / rel
    if not p.exists():
        fail(f"missing required file: {rel}")
    return p.read_text()


def write(rel, text):
    p = REPO / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def copy_file(src_rel, dst_rel=None):
    dst_rel = dst_rel or src_rel
    src = PKG / src_rel
    if not src.exists():
        fail(f"release file missing: {src_rel}")
    dst = REPO / dst_rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.resolve() != dst.resolve():
        shutil.copy2(src, dst)


def verify_base():
    if not (REPO / ".git").exists():
        fail(f"{REPO} is not a Git repository root")
    engine = read("backend/engines/SportsTeamFantasyEngine.js")
    if "TEAM_FANTASY_VERSION" not in engine:
        fail("Team Fantasy v1.2.18j is not installed")
    admin = read("frontend/js/pages/adminTeamFantasy.js")
    if "renderAdminTeamFantasyPage" not in admin:
        fail("Team Fantasy admin page is missing")
    games = read("frontend/js/pages/admin.js")
    if '["team-fantasy", "Team Fantasy Football"]' not in games:
        fail("Team Fantasy create-game hotfix j1/j1a is not installed")


def patch_api_transport(rel):
    s = read(rel)
    if "function apiTeamFantasyPost_" in s:
        return
    anchor = "/* ======================\n   LOGIN\n====================== */"
    if anchor not in s:
        fail(f"could not locate API helper insertion point in {rel}")
    helper = r'''/* ======================
   TEAM FANTASY POST BRIDGE — v1.2.18j2
   Repo-owned Cloudflare Pages proxy. Falls back to the legacy
   generic POST bridge only while a new Pages deployment is unavailable.
====================== */
async function apiTeamFantasyPost_(action, payload = {}) {
  const attached = apiAttachSession_(action, payload || {});
  try {
    const response = await fetch("./api/team-fantasy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({ action: action, ...attached })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }

    if ((response.status === 404 || response.status === 405) && typeof apiPost === "function") {
      return apiPost(action, payload || {});
    }
    if (!response.ok || !data) {
      return {
        success: false,
        status: response.status,
        message: data && (data.message || data.error)
          ? data.message || data.error
          : "Team Fantasy bridge returned an invalid response.",
        error: data && (data.error || data.message)
          ? data.error || data.message
          : "Team Fantasy bridge returned an invalid response."
      };
    }
    return data;
  } catch (err) {
    if (typeof apiPost === "function") {
      return apiPost(action, payload || {});
    }
    return {
      success: false,
      error: err && err.message ? err.message : "Team Fantasy network error",
      message: err && err.message ? err.message : "Team Fantasy network error"
    };
  }
}

'''
    s = s.replace(anchor, helper + anchor, 1)
    write(rel, s)


def patch_sw():
    rel = "frontend/sw.js"
    s = read(rel)
    if "v1218j2-team-fantasy-controls" not in s:
        m = re.search(r'(const\s+AWARDS_CACHE\s*=\s*")([^"]+)(";)', s)
        if not m:
            fail("could not locate service-worker cache name")
        s = s[:m.start()] + m.group(1) + m.group(2) + "-v1218j2-team-fantasy-controls" + m.group(3) + s[m.end():]
    write(rel, s)


def copy_release_files():
    mapping = {
        "SportsTeamFantasyEngine.js": "backend/engines/SportsTeamFantasyEngine.js",
        "teamFantasy.js": "frontend/js/pages/teamFantasy.js",
        "adminTeamFantasy.js": "frontend/js/pages/adminTeamFantasy.js",
        "team-fantasy.css": "frontend/css/team-fantasy.css",
        "functions/api/team-fantasy.js": "functions/api/team-fantasy.js",
        "tests/team_fantasy_admin_controls_v1218j2_tests.js": "tests/team_fantasy_admin_controls_v1218j2_tests.js",
        "tools/apply_team_fantasy_admin_controls_v1218j2.py": "tools/apply_team_fantasy_admin_controls_v1218j2.py",
        "tools/install_team_fantasy_admin_controls_v1218j2.sh": "tools/install_team_fantasy_admin_controls_v1218j2.sh",
        "docs/TEAM_FANTASY_ADMIN_CONTROLS_V1_2_18J2.md": "docs/TEAM_FANTASY_ADMIN_CONTROLS_V1_2_18J2.md",
        "CHANGED_FILES_V1_2_18J2.txt": "CHANGED_FILES_V1_2_18J2.txt",
    }
    for src, dst in mapping.items():
        copy_file(src, dst)


def main():
    verify_base()
    copy_release_files()
    patch_api_transport("frontend/js/api.js")
    if (REPO / "frontend/api.js").exists():
        patch_api_transport("frontend/api.js")
    patch_sw()
    print("Team Fantasy Football v1.2.18j2 admin-control hotfix applied.")
    print("Team Fantasy writes now use the repo-owned /api/team-fantasy bridge.")
    print("Admin save/sync/trigger actions now show persistent verified status.")


if __name__ == "__main__":
    main()
