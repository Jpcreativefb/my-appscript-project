#!/usr/bin/env python3
from pathlib import Path
import sys

repo = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()


def replace_once(path, old, new, label):
    p = repo / path
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"STOP: {path} {label}: expected 1 match, found {count}")
    p.write_text(text.replace(old, new, 1))
    print(f"Updated: {path}")


def append_marker_in_const(path, const_name, marker):
    p = repo / path
    text = p.read_text()
    prefix = f'const {const_name} = "'
    start = text.find(prefix)
    if start < 0:
        raise SystemExit(f"STOP: {path}: {const_name} not found")
    value_start = start + len(prefix)
    end = text.find('";', value_start)
    if end < 0:
        raise SystemExit(f"STOP: {path}: {const_name} terminator not found")
    value = text[value_start:end]
    if marker in value:
        return
    value += marker
    p.write_text(text[:value_start] + value + text[end:])
    print(f"Updated: {path}")

picks = repo / "frontend/js/pages/picks.js"
text = picks.read_text()
helper_anchor = "async function hydrateConfidenceAppearance_() {"
if text.count(helper_anchor) != 1:
    raise SystemExit(f"STOP: frontend/js/pages/picks.js hydrate anchor: expected 1, found {text.count(helper_anchor)}")
helper = '''function refreshConfidenceAppearanceUi_() {\n  if (!shouldRenderCompactConfidenceSlate_()) return;\n\n  const list = document.getElementById("picksCategoryList");\n  if (!list) return;\n\n  // Confidence presentation classes, per-side image placement, visibility,\n  // score anchors, and several layout variables are calculated while the\n  // slate HTML is rendered. Rebuild only the Confidence slate when deferred\n  // appearance data arrives; never hide or replace the whole Picks page.\n  list.innerHTML = renderCompactConfidenceSlate_();\n\n  const summary = document.querySelector(".confidence-summary-bar");\n  if (summary && hasConfidencePointsCategories()) {\n    summary.outerHTML = renderConfidenceSummaryBar();\n  }\n\n  if (window.PlatformImageEngine && typeof window.PlatformImageEngine.process === "function") {\n    window.PlatformImageEngine.process(list);\n  }\n\n  mountConfidenceLiveSports_();\n  updateCountdowns();\n}\n\n'''
text = text.replace(helper_anchor, helper + helper_anchor, 1)

cached_old = '''      PICKS_APPEARANCE_CACHE[gameId] = cachedAppearance;\n      PICKS_PAGE_DATA.appearance = cachedAppearance;\n      applyPicksAppearanceToPage_();\n'''
cached_new = '''      PICKS_APPEARANCE_CACHE[gameId] = cachedAppearance;\n      PICKS_PAGE_DATA.appearance = cachedAppearance;\n      applyPicksAppearanceToPage_();\n      refreshConfidenceAppearanceUi_();\n'''
if text.count(cached_old) != 1:
    raise SystemExit(f"STOP: frontend/js/pages/picks.js cached appearance block: expected 1, found {text.count(cached_old)}")
text = text.replace(cached_old, cached_new, 1)

remote_old = '''        // The page is already usable. Apply the theme without replacing the\n        // whole question DOM just because style metadata arrived later.\n        applyPicksAppearanceToPage_();\n'''
remote_new = '''        // The page is already usable. Apply page-level theme values first,\n        // then redraw only the compact Confidence slate because its per-team\n        // layout/classes/images are calculated from appearance at render time.\n        applyPicksAppearanceToPage_();\n        refreshConfidenceAppearanceUi_();\n'''
if text.count(remote_old) != 1:
    raise SystemExit(f"STOP: frontend/js/pages/picks.js deferred appearance block: expected 1, found {text.count(remote_old)}")
text = text.replace(remote_old, remote_new, 1)
picks.write_text(text)
print("Updated: frontend/js/pages/picks.js")

# Bump lazy page-module version in both mirrored app files.
for path in ["frontend/js/app.js", "frontend/app.js"]:
    append_marker_in_const(path, "APP_ASSET_VERSION", "-v1218x2c-confidence-appearance")

# Force the normal browser/PWA shell to request the x2 CSS/API/module assets.
app_html = repo / "frontend/app.html"
html = app_html.read_text()
repls = [
    (
        'href="./css/picks.css?v=v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes&brand=',
        'href="./css/picks.css?v=v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1218x2-no-style-block-v1218x2c-confidence-appearance&brand=',
        "picks.css cache key",
    ),
    (
        '-v1218v2-reality-cast-forward-v1218w-survivor-ranking&brand=v1218f6-pattc-predicts"></script>',
        '-v1218v2-reality-cast-forward-v1218w-survivor-ranking-v1218x2-batched-picks-v1218x2c-confidence-appearance&brand=v1218f6-pattc-predicts"></script>',
        "api.js cache key",
    ),
    (
        '-v1218x1b-performance-v1218x2-fast-nav-batch-picks&hotfix=',
        '-v1218x1b-performance-v1218x2-fast-nav-batch-picks-v1218x2c-confidence-appearance&hotfix=',
        "app.js cache key",
    ),
    (
        'src="./js/pwa.js?v=v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217v-studio-control-fixes-v1217w-pack-management-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts&brand=',
        'src="./js/pwa.js?v=v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217v-studio-control-fixes-v1217w-pack-management-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts-v1218x2c-confidence-appearance&brand=',
        "pwa.js cache key",
    ),
]
for old, new, label in repls:
    count = html.count(old)
    if count != 1:
        raise SystemExit(f"STOP: frontend/app.html {label}: expected 1, found {count}")
    html = html.replace(old, new, 1)
app_html.write_text(html)
print("Updated: frontend/app.html")

append_marker_in_const("frontend/sw.js", "AWARDS_CACHE", "-v1218x2c-confidence-appearance")
append_marker_in_const("frontend/js/pwa.js", "PWA_VERSION", "-v1218x2c-confidence-appearance")

# Keep app mirror invariant explicit.
if (repo / "frontend/js/app.js").read_text() != (repo / "frontend/app.js").read_text():
    raise SystemExit("STOP: frontend app.js mirrors diverged")

print("Confidence appearance + PWA refresh v1.2.18x2c applied.")
