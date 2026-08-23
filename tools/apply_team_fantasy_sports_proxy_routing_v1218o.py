#!/usr/bin/env python3
from pathlib import Path
import json, sys

RELEASE = "v1.2.18o"
MARKER = "TEAM FANTASY NFL DATA BRIDGE — v1.2.18o"

def replace_function(text, name, replacement):
    needle = f"function {name}("
    start = text.find(needle)
    if start < 0:
        raise RuntimeError(f"Could not find function {name}")
    brace = text.find("{", start)
    if brace < 0:
        raise RuntimeError(f"Could not find opening brace for {name}")
    depth = 0
    i = brace
    in_s = in_d = in_t = False
    esc = False
    line_comment = block_comment = False
    while i < len(text):
        c = text[i]
        n = text[i+1] if i+1 < len(text) else ''
        if line_comment:
            if c == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if c == '*' and n == '/': block_comment=False; i += 2; continue
            i += 1; continue
        if in_s:
            if esc: esc=False
            elif c == '\\': esc=True
            elif c == "'": in_s=False
            i += 1; continue
        if in_d:
            if esc: esc=False
            elif c == '\\': esc=True
            elif c == '"': in_d=False
            i += 1; continue
        if in_t:
            if esc: esc=False
            elif c == '\\': esc=True
            elif c == '`': in_t=False
            i += 1; continue
        if c == '/' and n == '/': line_comment=True; i += 2; continue
        if c == '/' and n == '*': block_comment=True; i += 2; continue
        if c == "'": in_s=True; i += 1; continue
        if c == '"': in_d=True; i += 1; continue
        if c == '`': in_t=True; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                return text[:start] + replacement.rstrip() + text[end:]
        i += 1
    raise RuntimeError(f"Could not find closing brace for {name}")

def patch_routes(path):
    data = json.loads(path.read_text())
    includes = list(data.get('include') or [])
    if '/api/team-fantasy' not in includes:
        try:
            idx = includes.index('/api/espn-proxy') + 1
        except ValueError:
            idx = 0
        includes.insert(idx, '/api/team-fantasy')
    # de-dupe preserving order
    out=[]
    for x in includes:
        if x not in out: out.append(x)
    data['include'] = out
    path.write_text(json.dumps(data, indent=2) + "\n")

def patch_external(path):
    text = path.read_text()
    if MARKER not in text:
        branch = '''    else if (action === "getTeamFantasyNflSchedule") {\n      payload = apiGetTeamFantasyNflSchedule_(params);\n    }\n    else if (action === "getTeamFantasyNflSummary") {\n      payload = apiGetTeamFantasyNflSummary_(params);\n    }\n\n'''
        candidates = [
            '    else if (action === "getSportsTeamGameStats") {',
            '    else if (action === "setupSportsRacing" || action === "getSportsRacingResults" || action === "getSportsRacingOdds") {',
            '    else if (action === "getSportsOdds") {'
        ]
        for needle in candidates:
            pos = text.find(needle)
            if pos >= 0:
                text = text[:pos] + branch + text[pos:]
                break
        else:
            raise RuntimeError("Could not find Sports Scores Engine doGet insertion marker")

        helpers = '''\n/************************************\n TEAM FANTASY NFL DATA BRIDGE — v1.2.18o\n Keeps ESPN access inside the Sports Scores Engine so the existing\n authenticated Cloudflare ESPN proxy is reused by Team Fantasy.\n************************************/\nfunction sportsTeamFantasyFetchJson_(url) {\n  const response = sportsEspnFetch_(url, {\n    method: "get",\n    muteHttpExceptions: true,\n    followRedirects: true\n  });\n  const code = response.getResponseCode();\n  if (code < 200 || code >= 300) {\n    throw new Error("Team Fantasy ESPN source returned HTTP " + code);\n  }\n  return JSON.parse(response.getContentText() || "{}");\n}\n\nfunction apiGetTeamFantasyNflSchedule_(params) {\n  params = params || {};\n  const seasonYear = Math.floor(Number(params.seasonYear || params.year || 0));\n  const seasonType = Math.floor(Number(params.seasonType || params.seasontype || 2));\n  const week = Math.floor(Number(params.week || 0));\n  if (seasonYear < 2000 || seasonYear > 2100) throw new Error("Valid NFL seasonYear is required.");\n  if ([1, 2, 3].indexOf(seasonType) === -1) throw new Error("NFL seasonType must be 1, 2, or 3.");\n  if (week < 1 || week > 25) throw new Error("Valid NFL week is required.");\n  const url =\n    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?" +\n    "dates=" + encodeURIComponent(String(seasonYear)) +\n    "&seasontype=" + encodeURIComponent(String(seasonType)) +\n    "&week=" + encodeURIComponent(String(week)) +\n    "&limit=100";\n  const data = sportsTeamFantasyFetchJson_(url);\n  return {\n    success: true,\n    seasonYear: seasonYear,\n    seasonType: seasonType,\n    week: week,\n    events: Array.isArray(data.events) ? data.events : []\n  };\n}\n\nfunction apiGetTeamFantasyNflSummary_(params) {\n  params = params || {};\n  const eventId = String(params.eventId || params.espnEventId || "").trim().replace(/^nfl_/, "");\n  if (!/^\\d{6,20}$/.test(eventId)) throw new Error("Valid ESPN eventId is required.");\n  const url =\n    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=" +\n    encodeURIComponent(eventId);\n  return {\n    success: true,\n    eventId: eventId,\n    data: sportsTeamFantasyFetchJson_(url)\n  };\n}\n\n'''
        marker = 'function sportsApiOutput_(payload, callback) {'
        pos = text.find(marker)
        if pos < 0:
            raise RuntimeError("Could not find Sports API output marker")
        text = text[:pos] + helpers + text[pos:]
        path.write_text(text)

def patch_main(path):
    text = path.read_text()
    helper_marker = 'function teamFantasySportsEngineJson_('
    if helper_marker not in text:
        insert_after = '''function teamFantasyHttpJson_(url) {\n  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });\n  const code = response.getResponseCode();\n  if (code < 200 || code >= 300) throw new Error("Sports source returned HTTP " + code);\n  return JSON.parse(response.getContentText() || "{}");\n}\n'''
        pos = text.find(insert_after)
        if pos < 0:
            raise RuntimeError("Could not find Team Fantasy HTTP helper")
        new_helper = insert_after + '''\nfunction teamFantasySportsEngineJson_(action, params) {\n  const base = teamFantasySportsApiUrl_();\n  if (!base) throw new Error("Sports Scores Engine URL is not configured.");\n  const query = ["action=" + encodeURIComponent(String(action || ""))];\n  Object.keys(params || {}).forEach(function(key) {\n    const value = params[key];\n    if (value === undefined || value === null || value === "") return;\n    query.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));\n  });\n  query.push("_ts=" + Date.now());\n  const url = base + (base.indexOf("?") === -1 ? "?" : "&") + query.join("&");\n  const parsed = teamFantasyHttpJson_(url);\n  if (parsed && parsed.success === false) {\n    throw new Error(teamFantasyString_(parsed.error || parsed.message) || "Sports Scores Engine request failed.");\n  }\n  return parsed || {};\n}\n\nfunction teamFantasyScheduleRowsFromEspnEvents_(events, settings, seasonType, sourceWeek) {\n  return (Array.isArray(events) ? events : []).map(function(event) {\n    const competition = event.competitions && event.competitions[0] ? event.competitions[0] : {};\n    const competitors = competition.competitors || [];\n    let home = null;\n    let away = null;\n    competitors.forEach(function(item) {\n      if (item.homeAway === "home") home = item;\n      if (item.homeAway === "away") away = item;\n    });\n    home = home || competitors[0] || {};\n    away = away || competitors[1] || {};\n    const status = event.status && event.status.type ? event.status.type : {};\n    return {\n      eventId: teamFantasyString_(event.id),\n      sportsGameId: "nfl_" + teamFantasyString_(event.id),\n      gameDateTime: teamFantasyString_(event.date),\n      homeTeam: teamFantasyString_(home.team && (home.team.displayName || home.team.name)),\n      awayTeam: teamFantasyString_(away.team && (away.team.displayName || away.team.name)),\n      homeAbbr: teamFantasyNormalizeTeam_(home.team && home.team.abbreviation),\n      awayAbbr: teamFantasyNormalizeTeam_(away.team && away.team.abbreviation),\n      homeTeamId: teamFantasyString_(home.team && home.team.id),\n      awayTeamId: teamFantasyString_(away.team && away.team.id),\n      status: teamFantasyString_(status.name || status.description),\n      state: teamFantasyKey_(status.state),\n      completed: status.completed === true,\n      seasonYear: settings.seasonYear,\n      seasonType: seasonType,\n      week: sourceWeek\n    };\n  }).filter(function(row) { return row.eventId && row.gameDateTime; });\n}\n'''
        text = text[:pos] + text[pos:].replace(insert_after, new_helper, 1)

    schedule_fn = '''function teamFantasyFetchScheduleFromSportsEngine_(settings, week) {\n  const seasonType = teamFantasyScheduleSeasonType_(settings, week);\n  const sourceWeek = teamFantasyScheduleWeek_(settings, week);\n\n  // Preferred path: ask the separate Sports Scores Engine to fetch the exact\n  // NFL week through its authenticated Cloudflare ESPN proxy. This works for\n  // historical weeks as well as the live season.\n  try {\n    const parsed = teamFantasySportsEngineJson_("getTeamFantasyNflSchedule", {\n      seasonYear: settings.seasonYear,\n      seasonType: seasonType,\n      week: sourceWeek\n    });\n    const rows = teamFantasyScheduleRowsFromEspnEvents_(parsed.events || (parsed.data && parsed.data.events) || [], settings, seasonType, sourceWeek);\n    if (rows.length) return rows;\n  } catch (err) {\n    // Compatibility fallback below can still use rows already stored by the\n    // Sports Scores Engine while deployments are rolling forward.\n  }\n\n  const base = teamFantasySportsApiUrl_();\n  if (!base) return [];\n  try {\n    const separator = base.indexOf("?") === -1 ? "?" : "&";\n    const url = base + separator + "action=getSportsScores&sport=football&league=nfl&_ts=" + Date.now();\n    const parsed = teamFantasyHttpJson_(url);\n    const rows = Array.isArray(parsed) ? parsed : (parsed.scores || parsed.games || parsed.rows || []);\n    return rows.map(teamFantasyNormalizeScheduleRow_).filter(function(row) {\n      if (row.seasonYear && row.seasonYear !== settings.seasonYear) return false;\n      if (row.seasonType && row.seasonType !== seasonType) return false;\n      if (row.week && row.week !== sourceWeek) return false;\n      return row.eventId && row.gameDateTime;\n    });\n  } catch (err2) {\n    return [];\n  }\n}\n'''
    text = replace_function(text, 'teamFantasyFetchScheduleFromSportsEngine_', schedule_fn)

    espn_schedule_fn = '''function teamFantasyFetchScheduleFromEspn_(settings, week) {\n  // ESPN blocks Google Apps Script UrlFetchApp with HTTP 403. Team Fantasy\n  // deliberately does not call ESPN directly; the separate Sports Scores\n  // Engine owns the authenticated Cloudflare ESPN proxy.\n  const rows = teamFantasyFetchScheduleFromSportsEngine_(settings, week);\n  if (rows.length) return rows;\n  throw new Error("NFL schedule unavailable from Sports Scores Engine. Direct ESPN fetch is disabled because ESPN blocks Google Apps Script with HTTP 403.");\n}\n'''
    text = replace_function(text, 'teamFantasyFetchScheduleFromEspn_', espn_schedule_fn)

    summary_fn = '''function teamFantasyFetchEspnSummary_(eventId) {\n  eventId = teamFantasyString_(eventId).replace(/^nfl_/, "");\n  if (!eventId) throw new Error("ESPN event id is required");\n  const parsed = teamFantasySportsEngineJson_("getTeamFantasyNflSummary", { eventId: eventId });\n  const data = parsed && parsed.data ? parsed.data : parsed;\n  if (!data || typeof data !== "object") throw new Error("Sports Scores Engine returned an invalid NFL game summary.");\n  return data;\n}\n'''
    text = replace_function(text, 'teamFantasyFetchEspnSummary_', summary_fn)
    path.write_text(text)

def main():
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    routes = repo/'frontend/_routes.json'
    main_engine = repo/'backend/engines/SportsTeamFantasyEngine.js'
    sports_engine = repo/'external-engines/sports-scoring-engine/src/SportsScoresEngine.js'
    for p in (routes, main_engine, sports_engine):
        if not p.exists(): raise RuntimeError(f"Required file not found: {p}")
    patch_routes(routes)
    patch_external(sports_engine)
    patch_main(main_engine)
    print("Team Fantasy Football v1.2.18o sports-proxy/routing hotfix applied.")
    print("- /api/team-fantasy added to Cloudflare Pages Functions routes")
    print("- Sports Scores Engine exposes narrow NFL schedule + summary actions")
    print("- Team Fantasy no longer calls ESPN directly from Apps Script")

if __name__ == '__main__':
    try: main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
