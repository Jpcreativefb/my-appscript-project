#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER = "v1218w-survivor-ranking"


def fail(msg):
    raise SystemExit("STOP: " + msg)


def append_marker_to_const(text, const_name):
    pattern = re.compile(r'^(const\s+' + re.escape(const_name) + r'\s*=\s*")([^"]*)(";\s*)$', re.M)
    m = pattern.search(text)
    if not m:
        fail(f"Could not find {const_name} marker in frontend app router.")
    value = m.group(2)
    if MARKER not in value:
        value += "-" + MARKER
        text = text[:m.start()] + m.group(1) + value + m.group(3) + text[m.end():]
    return text


def patch_app_js(text):
    text = append_marker_to_const(text, "APP_ASSET_VERSION")
    # Keep the existing route-hotfix chain intact. Newer releases may append
    # extra shell-only cache markers after this value in app.html, and the
    # production tests require the exact APP_ROUTE_HOTFIX_VERSION to remain
    # a contiguous substring of that shell URL.

    if '"survivor": ["survivor"]' not in text:
        anchor = '  "picks": ["picks"],\n'
        if anchor not in text:
            fail('Could not find APP_PAGE_MODULES picks anchor.')
        text = text.replace(anchor, anchor + '  "survivor": ["survivor"],\n  "ranking": ["ranking"],\n', 1)

    # Survivor must no longer share the generic Picks route.
    text = re.sub(
        r'(gameType\s*===\s*"staked-prediction")\s*\|\|\s*\n\s*gameType\s*===\s*"survivor"',
        r'\1',
        text,
        count=1,
    )

    # Replace the old Ranking -> leaderboard route with dedicated Survivor + Ranking routes.
    if 'await navigate("survivor")' not in text:
        ranking_old = re.compile(
            r'\n\s*if\s*\(gameType\s*===\s*"ranking"\)\s*\{\s*\n\s*await navigate\("leaderboard"\);\s*\n\s*return;\s*\n\s*\}',
            re.M,
        )
        m = ranking_old.search(text)
        if not m:
            fail('Could not find legacy Ranking -> leaderboard route.')
        replacement = '''\n\n  if (gameType === "survivor") {\n    await navigate("survivor");\n    return;\n  }\n\n  if (gameType === "ranking") {\n    await navigate("ranking");\n    return;\n  }'''
        text = text[:m.start()] + replacement + text[m.end():]

    if 'case "survivor":' not in text:
        anchor_re = re.compile(
            r'(\n\s*case\s+"picks":\s*\n(?:.|\n)*?\n\s*break;\s*\n)(\s*\n\s*case\s+"game-hub":)',
            re.M,
        )
        m = anchor_re.search(text)
        if not m:
            fail('Could not find Picks -> Game Hub router anchor.')
        dedicated = '''\n    case "survivor":\n      if (typeof renderSurvivorPage !== "function") throw new Error("Survivor page script is not loaded.");\n      app.innerHTML = await renderSurvivorPage();\n      break;\n\n    case "ranking":\n      if (typeof renderRankingPage !== "function") throw new Error("Ranking page script is not loaded.");\n      app.innerHTML = await renderRankingPage();\n      break;\n'''
        text = text[:m.start()] + m.group(1) + dedicated + m.group(2) + text[m.end():]

    required = [
        '"survivor": ["survivor"]',
        '"ranking": ["ranking"]',
        'await navigate("survivor")',
        'await navigate("ranking")',
        'case "survivor":',
        'case "ranking":',
        MARKER,
    ]
    for needle in required:
        if needle not in text:
            fail(f"Frontend router verification failed: {needle}")
    return text


def append_query_marker(line, key):
    if MARKER in line:
        return line
    # Append to a named query parameter while keeping every newer cache marker already present.
    pattern = re.compile(r'([?&]' + re.escape(key) + r'=)([^&"<>]+)')
    m = pattern.search(line)
    if not m:
        fail(f"Could not find {key}= query parameter in app.html cache line: {line.strip()[:80]}")
    value = m.group(2)
    new = m.group(1) + value + '-' + MARKER
    return line[:m.start()] + new + line[m.end():]


def patch_app_html(text):
    lines = text.splitlines(True)
    found = {"styles": False, "pages": False, "manifest": False, "api": False, "app": False}
    for i, line in enumerate(lines):
        if './css/styles.css?' in line:
            lines[i] = append_query_marker(line, 'brand')
            found['styles'] = True
        elif './css/pages.css?' in line:
            lines[i] = append_query_marker(line, 'v')
            found['pages'] = True
        elif './assets/images/image-manifest.js?' in line:
            lines[i] = append_query_marker(line, 'brand')
            found['manifest'] = True
        elif './js/api.js?' in line:
            lines[i] = append_query_marker(line, 'v')
            found['api'] = True
        elif './js/app.js?' in line:
            # The main asset version changes for this release. Preserve the existing
            # hotfix chain exactly so newer shell-only markers remain compatible.
            lines[i] = append_query_marker(line, 'v')
            found['app'] = True
    if not all(found.values()):
        missing = ', '.join(k for k, v in found.items() if not v)
        fail('Could not update expected app.html cache references: ' + missing)
    text = ''.join(lines)

    if './js/pages/survivor.js' not in text:
        anchor = '  ./js/pages/picks.js\n'
        if anchor not in text:
            fail('Could not find lazy-route manifest picks anchor in app.html.')
        text = text.replace(anchor, anchor + '  ./js/pages/survivor.js\n  ./js/pages/ranking.js\n', 1)
    elif './js/pages/ranking.js' not in text:
        anchor = '  ./js/pages/survivor.js\n'
        text = text.replace(anchor, anchor + '  ./js/pages/ranking.js\n', 1)
    if MARKER not in text:
        fail('app.html cache marker was not added.')
    return text


def patch_sw(text, asset_version):
    pat = re.compile(r'^(const\s+AWARDS_CACHE\s*=\s*")([^"]*)(";\s*)$', re.M)
    m = pat.search(text)
    if not m:
        fail('Could not find AWARDS_CACHE in frontend/sw.js.')
    value = m.group(2)
    # Production checks require the complete APP_ASSET_VERSION to be present in
    # the service-worker cache key. Preserve the existing cache history and append
    # the current asset chain when newer Reality/Team Fantasy markers caused drift.
    if asset_version not in value:
        value += '-route-assets-' + asset_version
    if MARKER not in value:
        value += '-' + MARKER
    text = text[:m.start()] + m.group(1) + value + m.group(3) + text[m.end():]
    return text


def write_if_changed(path, new_text):
    old = path.read_text()
    if old != new_text:
        path.write_text(new_text)
        print(f"Rebased: {path}")
    else:
        print(f"Already current: {path}")


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    js = root / 'frontend/js/app.js'
    html = root / 'frontend/app.html'
    sw = root / 'frontend/sw.js'
    for path in (js, html, sw):
        if not path.is_file():
            fail(f"Required frontend file missing: {path.relative_to(root)}")

    js_text = patch_app_js(js.read_text())
    asset_match = re.search(r'^const\s+APP_ASSET_VERSION\s*=\s*"([^"]+)"', js_text, re.M)
    if not asset_match:
        fail('Could not read rebased APP_ASSET_VERSION.')
    asset_version = asset_match.group(1)
    html_text = patch_app_html(html.read_text())
    sw_text = patch_sw(sw.read_text(), asset_version)

    write_if_changed(js, js_text)
    write_if_changed(html, html_text)
    write_if_changed(sw, sw_text)

    # The project uses frontend/js/app.js as source and frontend/app.js as compatibility mirror.
    mirror = root / 'frontend/app.js'
    mirror.write_text(js.read_text())
    print('Synchronized: frontend/app.js <- frontend/js/app.js')

    if mirror.read_text() != js.read_text():
        fail('frontend app mirror synchronization failed.')
    print('Survivor + Ranking frontend rebase verification passed.')


if __name__ == '__main__':
    main()
