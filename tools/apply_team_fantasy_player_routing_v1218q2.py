#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) < 2:
    raise SystemExit("Usage: apply_team_fantasy_player_routing_v1218q2.py <repo>")

repo = Path(sys.argv[1]).resolve()
path = repo / "backend/engines/AppDataEngine.js"
if not path.is_file():
    raise SystemExit("Missing backend/engines/AppDataEngine.js")

text = path.read_text()
original = text


def function_span(source: str, name: str):
    match = re.search(r"function\s+" + re.escape(name) + r"\s*\([^)]*\)\s*\{", source)
    if not match:
        raise SystemExit(f"Could not find function {name} in AppDataEngine.js")
    open_brace = source.find("{", match.start())
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = open_brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ('"', "'", "`"):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return match.start(), open_brace, i + 1
        i += 1
    raise SystemExit(f"Could not parse function {name} in AppDataEngine.js")


def body_of(name: str):
    start, open_brace, end = function_span(text, name)
    return start, open_brace, end, text[open_brace + 1:end - 1]


def insert_at_function_start(name: str, marker: str, block: str):
    global text
    start, open_brace, end, body = body_of(name)
    if marker in body:
        return False
    insertion = "\n" + block.rstrip() + "\n"
    text = text[:open_brace + 1] + insertion + text[open_brace + 1:]
    return True


def replace_in_function(name: str, marker: str, pattern: str, repl, label: str, flags=0):
    global text
    start, open_brace, end, body = body_of(name)
    if marker in body:
        return False
    new_body, count = re.subn(pattern, repl, body, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"Could not apply {label}: expected source structure not found in {name}().")
    text = text[:open_brace + 1] + new_body + text[end - 1:]
    return True


# 1. Preserve team-fantasy as a first-class Dashboard mode.
start, open_brace, end, body = body_of("getDashboardGameMode_")
if '"team-fantasy"' not in body:
    new_body, count = re.subn(
        r'(?m)^(\s*)"prediction"',
        r'\1"team-fantasy",\n\1"prediction"',
        body,
        count=1,
    )
    if count != 1:
        raise SystemExit("Could not add team-fantasy to getDashboardGameMode_: prediction mode anchor missing.")
    text = text[:open_brace + 1] + new_body + text[end - 1:]

# 2. Correct type label.
insert_at_function_start(
    "getDashboardGameTypeLabel_",
    'return "Team Fantasy Football";',
    '''\n  if (mode === "team-fantasy") {\n    return "Team Fantasy Football";\n  }\n'''
)

# 3. Correct action label. Insert immediately after made is defined so it does not depend on later progress code.
replace_in_function(
    "getDashboardEnterLabel_",
    '"Continue Lineup"',
    r'(\s*const\s+made\s*=.*?;)',
    lambda m: m.group(1) + '''\n\n  if (mode === "team-fantasy") {\n    return made > 0\n      ? "Continue Lineup"\n      : "Make Lineup";\n  }''',
    "Team Fantasy dashboard action label",
    flags=re.S,
)

# 4. Correct description.
insert_at_function_start(
    "getDashboardGameDescription_",
    'Build an eight-slot NFL team lineup each week.',
    '''\n  if (mode === "team-fantasy") {\n    return "Build an eight-slot NFL team lineup each week. Picks lock individually when that NFL team's game starts.";\n  }\n'''
)

# Shared progress bypass block.
progress_block = '''\n  if (mode === "team-fantasy") {\n    return {\n      madeCount: 0,\n      totalCount: 0,\n      progressAvailable: false,\n      progressLabel: "Weekly lineup",\n      progressValue: 0,\n      userSummary: "Open Team Fantasy lineup",\n      summary: {}\n    };\n  }\n'''

# 5. Lite Dashboard progress bypass — function-aware, no fragile interior anchor.
insert_at_function_start(
    "getDashboardGameProgressLite_",
    'progressLabel: "Weekly lineup"',
    progress_block,
)

# 6. Full Dashboard progress bypass.
insert_at_function_start(
    "getDashboardGameProgress_",
    'progressLabel: "Weekly lineup"',
    progress_block,
)

# 7. Sports/NFL placement.
insert_at_function_start(
    "getDashboardHubPlacement_",
    'return { category: "sports", group: "NFL" };',
    '''\n  if (mode === "team-fantasy") {\n    return { category: "sports", group: "NFL" };\n  }\n'''
)

# 8. Lite Home lock text. Rather than rewriting the whole expression, make lockLabel mutable
#    and override it after the existing expression is complete.
start, open_brace, end, body = body_of("buildDashboardGameHubItemLite_")
if 'lockLabel = "Locks by NFL kickoff";' not in body:
    const_match = re.search(r'\bconst\s+lockLabel\s*=', body)
    if not const_match:
        raise SystemExit("Could not apply Team Fantasy lite Dashboard lock label: lockLabel declaration missing.")
    # Find the semicolon terminating this declaration while respecting strings/brackets.
    eq_pos = body.find("=", const_match.start())
    depth = 0
    quote = None
    escape = False
    semi = None
    i = eq_pos + 1
    while i < len(body):
        ch = body[i]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
        else:
            if ch in ('"', "'", "`"):
                quote = ch
            elif ch in "([{":
                depth += 1
            elif ch in ")]}" and depth > 0:
                depth -= 1
            elif ch == ";" and depth == 0:
                semi = i
                break
        i += 1
    if semi is None:
        raise SystemExit("Could not apply Team Fantasy lite Dashboard lock label: lockLabel terminator missing.")
    body = body[:const_match.start()] + re.sub(r'^const', 'let', body[const_match.start():], count=1)
    # Recompute semicolon after same-length const->let change (-2 chars), so search again.
    const_match2 = re.search(r'\blet\s+lockLabel\s*=', body)
    eq_pos = body.find("=", const_match2.start())
    depth = 0
    quote = None
    escape = False
    semi = None
    i = eq_pos + 1
    while i < len(body):
        ch = body[i]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
        else:
            if ch in ('"', "'", "`"):
                quote = ch
            elif ch in "([{":
                depth += 1
            elif ch in ")]}" and depth > 0:
                depth -= 1
            elif ch == ";" and depth == 0:
                semi = i
                break
        i += 1
    if semi is None:
        raise SystemExit("Could not apply Team Fantasy lite Dashboard lock label after declaration update.")
    override = '''\n\n  if (mode === "team-fantasy") {\n    lockLabel = "Locks by NFL kickoff";\n  }'''
    body = body[:semi + 1] + override + body[semi + 1:]
    text = text[:open_brace + 1] + body + text[end - 1:]

# 9. Full Dashboard lock helper.
insert_at_function_start(
    "getDashboardLockLabel_",
    'return "Locks by NFL kickoff";',
    '''\n  if (getDashboardGameMode_(game) === "team-fantasy") {\n    return "Locks by NFL kickoff";\n  }\n'''
)

if text == original:
    print("Team Fantasy player routing v1.2.18q2 already applied.")
else:
    path.write_text(text)
    print("Updated:", path.relative_to(repo))

print("Team Fantasy player routing v1.2.18q2 applied.")
