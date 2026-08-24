#!/usr/bin/env python3
from pathlib import Path
import re
import sys

repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
marker = 'v1218w4-survivor-edge-cases'

# Cache-bust lazy page modules while preserving every existing release marker.
for rel in ('frontend/js/app.js', 'frontend/app.js'):
    p = repo / rel
    text = p.read_text()
    if marker not in text:
        pattern = r'(const APP_ASSET_VERSION\s*=\s*")([^"]+)(";)'
        match = re.search(pattern, text)
        if not match:
            raise SystemExit(f'STOP: Could not locate APP_ASSET_VERSION in {rel}')
        replacement = match.group(1) + match.group(2) + '-' + marker + match.group(3)
        text = text[:match.start()] + replacement + text[match.end():]
        p.write_text(text)

app_js = (repo / 'frontend/js/app.js').read_text()
app_mirror = (repo / 'frontend/app.js').read_text()
if app_js != app_mirror:
    raise SystemExit('STOP: frontend/js/app.js and frontend/app.js are not synchronized after cache update.')

p = repo / 'frontend/app.html'
text = p.read_text()
if marker not in text:
    pattern = r'(<script\s+src="\./js/app\.js\?v=)([^"]+)("></script>)'
    match = re.search(pattern, text)
    if not match:
        raise SystemExit('STOP: Could not locate the app.js script URL in frontend/app.html')
    current = match.group(2)
    if '&hotfix=' in current:
        version, hotfix = current.split('&hotfix=', 1)
        current = version + '-' + marker + '&hotfix=' + hotfix
    else:
        current = current + '-' + marker
    replacement = match.group(1) + current + match.group(3)
    text = text[:match.start()] + replacement + text[match.end():]
    p.write_text(text)

p = repo / 'frontend/sw.js'
text = p.read_text()
if marker not in text:
    pattern = r'(const AWARDS_CACHE\s*=\s*")([^"]+)(";)'
    match = re.search(pattern, text)
    if not match:
        raise SystemExit('STOP: Could not locate AWARDS_CACHE in frontend/sw.js')
    replacement = match.group(1) + match.group(2) + '-' + marker + match.group(3)
    text = text[:match.start()] + replacement + text[match.end():]
    p.write_text(text)

for rel in ('frontend/js/app.js', 'frontend/app.js', 'frontend/app.html', 'frontend/sw.js'):
    if marker not in (repo / rel).read_text():
        raise SystemExit(f'STOP: v1.2.18w4 cache marker missing from {rel}')

print('Survivor v1.2.18w4 frontend cache markers applied.')
print('Frontend app mirrors remain synchronized.')
