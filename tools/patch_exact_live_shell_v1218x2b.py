#!/usr/bin/env python3
from pathlib import Path
import re, sys

repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
marker_old = 'v1218x1b-performance'
marker_x2 = 'v1218x2-fast-nav-batch-picks'
marker_new = marker_old + '-' + marker_x2


def read(rel):
    return (repo / rel).read_text()

def write(rel, text):
    (repo / rel).write_text(text)

def require(cond, msg):
    if not cond:
        raise SystemExit('STOP: ' + msg)

app_rel = 'frontend/js/app.js'
app = read(app_rel)
require('v1218v4-reality-draft-switch' in app, 'exact live Reality v4 app marker is missing before x2b')
require(marker_old in app, 'x1b performance app marker is missing before x2b')
require(marker_x2 not in app, 'x2 marker already exists in app.js; refusing duplicate apply')

# Preserve the entire exact live marker history; append x2 only.
app = app.replace(marker_old, marker_new, 1)

# Snapshot timing/storage constants.
old_consts = 'const APP_PAGE_SNAPSHOT_FRESH_MS = 30 * 1000;\nconst APP_PAGE_SNAPSHOT_MAX_MS = 5 * 60 * 1000;'
new_consts = '''const APP_PAGE_SNAPSHOT_FRESH_MS = 45 * 1000;
const APP_PAGE_SNAPSHOT_MAX_MS = 10 * 60 * 1000;
const APP_PAGE_SNAPSHOT_STORAGE_PREFIX = "pattcPageSnapshot:";
const APP_PAGE_SNAPSHOT_STORAGE_MAX_CHARS = 700000;'''
require(old_consts in app, 'x1b page snapshot constants not found')
app = app.replace(old_consts, new_consts, 1)

new_key_fn = '''function appPageSnapshotKey_(page) {
  const session = typeof getSession === "function" ? getSession() : null;
  const username = String(session && session.username || "").trim().toLowerCase();
  const pageName = String(page || "");

  // Home/hub pages are account views, not game views. Keying Home by the
  // currently selected game made a perfectly good snapshot miss after a game
  // switch and forced another Dashboard rebuild.
  if (
    pageName === "dashboard" ||
    pageName === "more" ||
    pageName === "trophy-room" ||
    pageName.indexOf("hub:") === 0
  ) {
    return [username, "account", pageName].join("|");
  }

  const gameId = typeof getFrontendGameId === "function" ? String(getFrontendGameId() || "").trim() : String(APP_STATE.gameId || "").trim();
  const leagueId = typeof getFrontendLeagueId === "function" ? String(getFrontendLeagueId() || "").trim() : "";
  const mode = String(localStorage.getItem("gameMode") || "").trim().toLowerCase();
  return [username, gameId, leagueId, mode, pageName].join("|");
}

function appPageSnapshotStorageKey_(key) {
  return APP_PAGE_SNAPSHOT_STORAGE_PREFIX + encodeURIComponent(String(key || ""));
}'''
pat = re.compile(r'function appPageSnapshotKey_\(page\) \{.*?\n\}\n(?=\nfunction appCapturePageSnapshot_)', re.S)
app, n = pat.subn(new_key_fn, app, count=1)
require(n == 1, 'could not surgically replace appPageSnapshotKey_')

new_capture = '''function appCapturePageSnapshot_(page, app) {
  if (!app || !appPageSnapshotEligible_(page)) return;
  const html = String(app.innerHTML || "");
  if (!html || html.indexOf("Page failed to load") !== -1) return;
  const key = appPageSnapshotKey_(page);
  const item = { html: html, savedAt: Date.now() };
  APP_PAGE_SNAPSHOT_CACHE[key] = item;

  // sessionStorage survives hash/full-shell navigation in the same tab/PWA
  // session, so a browser repaint cannot destroy the fast return path.
  if (html.length <= APP_PAGE_SNAPSHOT_STORAGE_MAX_CHARS) {
    try {
      sessionStorage.setItem(appPageSnapshotStorageKey_(key), JSON.stringify(item));
    } catch (err) {}
    if (String(page || "") === "dashboard" || String(page || "").indexOf("hub:") === 0) {
      try { localStorage.setItem(appPageSnapshotStorageKey_(key), JSON.stringify(item)); } catch (err) {}
    }
  }
}'''
pat = re.compile(r'function appCapturePageSnapshot_\(page, app\) \{.*?\n\}\n(?=\nfunction appReadPageSnapshot_)', re.S)
app, n = pat.subn(new_capture, app, count=1)
require(n == 1, 'could not surgically replace appCapturePageSnapshot_')

new_read = '''function appReadPageSnapshot_(page) {
  if (!appPageSnapshotEligible_(page)) return null;
  const key = appPageSnapshotKey_(page);
  let item = APP_PAGE_SNAPSHOT_CACHE[key] || null;

  if (!item) {
    try {
      const raw = sessionStorage.getItem(appPageSnapshotStorageKey_(key));
      if (raw) {
        item = JSON.parse(raw);
        if (item && item.html) APP_PAGE_SNAPSHOT_CACHE[key] = item;
      }
    } catch (err) {
      item = null;
    }
  }

  if (!item && (String(page || "") === "dashboard" || String(page || "").indexOf("hub:") === 0)) {
    try {
      const raw = localStorage.getItem(appPageSnapshotStorageKey_(key));
      if (raw) {
        item = JSON.parse(raw);
        if (item && item.html) APP_PAGE_SNAPSHOT_CACHE[key] = item;
      }
    } catch (err) { item = null; }
  }

  if (!item) return null;
  const age = Date.now() - Number(item.savedAt || 0);
  if (age > APP_PAGE_SNAPSHOT_MAX_MS) {
    delete APP_PAGE_SNAPSHOT_CACHE[key];
    try { sessionStorage.removeItem(appPageSnapshotStorageKey_(key)); } catch (err) {}
    return null;
  }
  return { key: key, html: item.html, age: age };
}'''
pat = re.compile(r'function appReadPageSnapshot_\(page\) \{.*?\n\}\n(?=\nfunction invalidateAppPageSnapshots)', re.S)
app, n = pat.subn(new_read, app, count=1)
require(n == 1, 'could not surgically replace appReadPageSnapshot_')

snapshot_branch = '''    app.innerHTML = snapshot.html;
    app.classList.remove("page-enter");
    app.classList.add("page-enter-active");
    setActiveNav(page);'''
replacement = snapshot_branch + '\n    if (usePageLoader && APP_LOADER_STATE.visible) hideLoader();'
require(snapshot_branch in app, 'snapshot navigation branch not found')
app = app.replace(snapshot_branch, replacement, 1)

write(app_rel, app)
# The production contract requires these files to remain exact mirrors.
write('frontend/app.js', app)

# Preserve every live app.html compatibility/hotfix marker; append x2 only to
# the x1b application asset chain.
html = read('frontend/app.html')
require('v1218v4-reality-draft-switch' in html, 'Reality v4 app.html marker missing before x2b')
require(marker_old in html, 'x1b app.html marker missing before x2b')
require(marker_x2 not in html, 'x2 marker already exists in app.html')
html = html.replace(marker_old, marker_new)
write('frontend/app.html', html)

# Same for service worker cache history, including Team Fantasy route assets.
sw = read('frontend/sw.js')
require('v1218v4-reality-draft-switch' in sw, 'Reality v4 service-worker marker missing before x2b')
require('v1218j-team-fantasy' in sw, 'Team Fantasy service-worker marker missing before x2b')
require(marker_old in sw, 'x1b service-worker marker missing before x2b')
require(marker_x2 not in sw, 'x2 marker already exists in service worker')
sw = sw.replace(marker_old, marker_new)
write('frontend/sw.js', sw)

print('Exact live x1b app shell preserved; x2 navigation/cache changes applied surgically.')
