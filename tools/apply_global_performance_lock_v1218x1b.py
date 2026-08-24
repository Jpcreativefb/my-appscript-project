#!/usr/bin/env python3
from pathlib import Path
import sys, re

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()


def read(rel):
    return (ROOT / rel).read_text()

def write(rel, text):
    (ROOT / rel).write_text(text)
    print(f"Updated: {rel}")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"STOP: {label}: expected exactly 1 anchor, found {count}")
    return text.replace(old, new, 1)

def replace_all_checked(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"STOP: {label}: expected {expected} anchors, found {count}")
    return text.replace(old, new)

def replace_lock_calls(text, expected, label):
    pattern = re.compile(r'LockService\s*\.\s*getScriptLock\(\)')
    count = len(pattern.findall(text))
    if count != expected:
        raise SystemExit(f"STOP: {label}: expected {expected} script-lock calls, found {count}")
    return pattern.sub('((typeof LockService.getDocumentLock === \"function\" ? LockService.getDocumentLock() : null) || LockService.getScriptLock())', text)

# -----------------------------------------------------------------------------
# AppCache: batch invalidation + targeted gameplay invalidation.
# -----------------------------------------------------------------------------
rel = 'backend/services/AppCache.js'
text = read(rel)
text = replace_once(text, 'const CACHE_TTL = 120;', 'const CACHE_TTL = 600;', 'AppCache TTL extension')
anchor = '''/* =========================\n   CLEAR GAME CACHE\n========================= */\n\nfunction clearGameCaches(\n  gameId\n){\n'''
insert = '''/* =========================\n   CACHE INVALIDATION HELPERS\n   v1.2.18x1b\n========================= */\n\nfunction appCacheRemoveKeys_(cache, keys){\n\n  if (!cache) return;\n\n  const seen = {};\n  const clean = (keys || []).map(function(key) {\n    return String(key || \"\").trim();\n  }).filter(function(key) {\n    if (!key || seen[key]) return false;\n    seen[key] = true;\n    return true;\n  });\n\n  if (!clean.length) return;\n\n  // CacheService.removeAll is substantially cheaper than dozens of\n  // individual remote cache operations. Keep batches conservative.\n  if (typeof cache.removeAll === \"function\") {\n    for (let i = 0; i < clean.length; i += 75) {\n      cache.removeAll(clean.slice(i, i + 75));\n    }\n    return;\n  }\n\n  clean.forEach(function(key) {\n    cache.remove(key);\n  });\n}\n\nfunction appGameCacheKeys_(gameId, username){\n\n  gameId = String(gameId || \"\").trim();\n  username = String(username || \"\").trim();\n  if (!gameId) return [];\n\n  const keys = [\n    \"categories_\" + gameId,\n    \"settings_\" + gameId,\n    \"leaderboard_\" + gameId,\n    \"projected_\" + gameId,\n    \"normalized_sync_\" + gameId,\n    \"external_live_probabilities_v1_\" + String(gameId || \"\").toLowerCase().replace(/[^a-z0-9_-]+/g, \"_\").slice(0, 120),\n    \"normalized_question_game_map_v1\",\n    \"rtv_season_game_ids_v1\"\n  ];\n\n  if (username && typeof realityTvSlug_ === \"function\") {\n    keys.push(\"rtv_player_stats_\" + realityTvSlug_(gameId) + \"_\" + realityTvSlug_(username));\n  }\n\n  return keys;\n}\n\nfunction clearPlayerActionCaches(gameId, sheetNames, username){\n\n  APP_RUNTIME_CACHE = {};\n\n  gameId = String(gameId || \"\").trim();\n  username = String(username || \"\").trim();\n  const cache = CacheService.getScriptCache();\n  const keys = [];\n\n  (sheetNames || []).forEach(function(sheetName) {\n    sheetName = String(sheetName || \"\").trim();\n    if (sheetName) keys.push(\"sheet_\" + sheetName);\n  });\n\n  if (gameId) {\n    keys.push(\"leaderboard_\" + gameId);\n    keys.push(\"projected_\" + gameId);\n    if (username && typeof realityTvSlug_ === \"function\") {\n      keys.push(\"rtv_player_stats_\" + realityTvSlug_(gameId) + \"_\" + realityTvSlug_(username));\n    }\n  }\n\n  appCacheRemoveKeys_(cache, keys);\n}\n\nfunction clearGameDataCaches(gameId, sheetNames, username){\n\n  APP_RUNTIME_CACHE = {};\n\n  if (typeof NORMALIZED_STORAGE_RUNTIME_CACHE !== \"undefined\") {\n    delete NORMALIZED_STORAGE_RUNTIME_CACHE[\"question-game-map:all\"];\n    delete NORMALIZED_STORAGE_RUNTIME_CACHE[\"data-index:all\"];\n  }\n\n  gameId = String(gameId || \"\").trim();\n  const cache = CacheService.getScriptCache();\n  const keys = appGameCacheKeys_(gameId, username);\n\n  (sheetNames || []).forEach(function(sheetName) {\n    sheetName = String(sheetName || \"\").trim();\n    if (sheetName) keys.push(\"sheet_\" + sheetName);\n  });\n\n  appCacheRemoveKeys_(cache, keys);\n}\n\n/* =========================\n   CLEAR GAME CACHE\n========================= */\n\nfunction clearGameCaches(\n  gameId\n){\n'''
text = replace_once(text, anchor, insert, 'AppCache helper insertion')
old = '''  const keys = [\n\n    \"categories_\" + gameId,\n\n    \"settings_\" + gameId,\n\n    \"leaderboard_\" + gameId,\n\n    \"projected_\" + gameId,\n\n    \"normalized_sync_\" + gameId,\n\n    \"external_live_probabilities_v1_\" + String(gameId || \"\").toLowerCase().replace(/[^a-z0-9_-]+/g, \"_\").slice(0, 120),\n\n    \"normalized_question_game_map_v1\",\n\n    \"rtv_season_game_ids_v1\"\n\n  ];\n\n  keys.forEach(key =>\n    cache.remove(key)\n  );\n'''
new = '''  const keys = appGameCacheKeys_(gameId);\n  appCacheRemoveKeys_(cache, keys);\n'''
text = replace_once(text, old, new, 'clearGameCaches batching')
old = '''  const cache =\n    CacheService\n      .getScriptCache();\n\n  /* =========================\n     RAW SHEETS\n  ========================= */\n\n  const baseKeys = [\n'''
new = '''  const cache =\n    CacheService\n      .getScriptCache();\n\n  // Snapshot the current game list BEFORE invalidating the Games cache.\n  // The old implementation removed sheet_Games first and immediately forced\n  // another full Games sheet read just to discover cache keys to delete.\n  const games =\n    typeof getGames === \"function\"\n      ? getGames()\n      : [];\n\n  /* =========================\n     RAW SHEETS\n  ========================= */\n\n  const baseKeys = [\n'''
text = replace_once(text, old, new, 'clearAppCaches games snapshot')
old = '''  baseKeys.forEach(key =>\n    cache.remove(key)\n  );\n\n  /* =========================\n     GAME CACHES\n  ========================= */\n\n  const games =\n    getGames();\n\n  games.forEach(game => {\n\n    clearGameCaches(\n      game.gameId\n    );\n\n  });\n\n  clearGamesCache();\n'''
new = '''  /* =========================\n     GAME CACHES\n  ========================= */\n\n  const keys = baseKeys.slice();\n\n  (games || []).forEach(function(game) {\n    appGameCacheKeys_(game && game.gameId).forEach(function(key) {\n      keys.push(key);\n    });\n  });\n\n  appCacheRemoveKeys_(cache, keys);\n  clearGamesCache();\n'''
text = replace_once(text, old, new, 'clearAppCaches batching')
old = '''  const cache = CacheService.getScriptCache();\n  cache.remove(\"sheet_Picks\");\n\n  gameId = String(gameId || \"\").trim();\n  username = String(username || \"\").trim();\n\n  if (gameId) {\n    cache.remove(\"leaderboard_\" + gameId);\n    cache.remove(\"projected_\" + gameId);\n    if (typeof realityTvSlug_ === \"function\") {\n      if (username) cache.remove(\"rtv_player_stats_\" + realityTvSlug_(gameId) + \"_\" + realityTvSlug_(username));\n    }\n    return;\n  }\n'''
new = '''  gameId = String(gameId || \"\").trim();\n  username = String(username || \"\").trim();\n\n  if (gameId) {\n    clearPlayerActionCaches(\n      gameId,\n      [typeof PICKS_SHEET !== \"undefined\" ? PICKS_SHEET : \"Picks\"],\n      username\n    );\n    return;\n  }\n'''
text = replace_once(text, old, new, 'clearPicksCaches targeted helper')
old = '''  clearPicksCaches,\n  clearAppCaches,\n  clearGameCaches\n'''
new = '''  clearPicksCaches,\n  clearPlayerActionCaches,\n  clearGameDataCaches,\n  clearAppCaches,\n  clearGameCaches\n'''
text = replace_once(text, old, new, 'AppCache API export')
write(rel, text)

# -----------------------------------------------------------------------------
# Interactive writes: use document lock (script fallback) so background script
# automation locks cannot freeze player/admin saves.
# -----------------------------------------------------------------------------
lock_files = {
    'backend/engines/PicksEngine.js': 2,
    'backend/engines/BettingEngine.js': 3,
        'backend/engines/VotingEngine.js': 1,
    'backend/admin/AdminCategories.js': 9,
    'backend/admin/AdminGames.js': 2,
    'backend/engines/SettingsEngine.js': 2,
    'backend/engines/AppearanceEngine.js': 1,
    'backend/engines/SportsConfidenceBuilderEngine.js': 1,
}
for rel, expected in lock_files.items():
    text = read(rel)
    text = replace_lock_calls(text, expected, f'{rel} interactive lock split')
    write(rel, text)

# Normalized storage long maintenance operations: use document lock with fallback.
rel = 'backend/engines/NormalizedQuestionStorageEngine.js'
text = read(rel)
text = replace_lock_calls(text, 4, 'Normalized storage lock split')
write(rel, text)

# -----------------------------------------------------------------------------
# Ranking save lock: preserve the w3 ScriptLock used only for first-time sheet
# creation, but move normal ballot saves to the interactive document lock and
# cap contention below five seconds.
# -----------------------------------------------------------------------------
rel = 'backend/engines/RankingGameEngine.js'
text = read(rel)
old = '''  rankingValidateBallot_(category, rankings);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
'''
new = '''  rankingValidateBallot_(category, rankings);

  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
  if (!lock.tryLock(2500)) {
    throw new Error("Could not save ranking: another write is finishing. Please try once more.");
  }
  try {
'''
text = replace_once(text, old, new, 'Ranking ballot interactive lock')
write(rel, text)

# -----------------------------------------------------------------------------
# Betting: release lock before cache invalidation/summary and avoid global cache.
# -----------------------------------------------------------------------------
rel = 'backend/engines/BettingEngine.js'
text = read(rel)
# saveBet has lock const at top now using document fallback. Convert to mutable tracking.
old = '''function saveBet(payload){\n\n  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());\n\n  const gotLock =\n    lock.tryLock(8000);\n'''
new = '''function saveBet(payload){\n\n  let lock = ((typeof LockService.getDocumentLock === \"function\" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());\n  let lockAcquired = false;\n\n  const gotLock =\n    lock.tryLock(5000);\n\n  lockAcquired = gotLock;\n'''
text = replace_once(text, old, new, 'saveBet lock tracking')
old = '''      appendBetRow_(row);\n\n    }\n\n    SpreadsheetApp.flush();\n\n    if (typeof clearAppCaches === \"function\") {\n      clearAppCaches();\n    }\n\n    return {\n'''
new = '''      appendBetRow_(row);\n\n    }\n\n    SpreadsheetApp.flush();\n\n    // The spreadsheet mutation is complete. Release the write lock before\n    // cache invalidation and summary reconstruction so one wager cannot block\n    // unrelated interactive saves.\n    if (lockAcquired) {\n      lock.releaseLock();\n      lockAcquired = false;\n    }\n\n    if (typeof clearPlayerActionCaches === \"function\") {\n      clearPlayerActionCaches(\n        gameId,\n        [typeof BETS_SHEET !== \"undefined\" ? BETS_SHEET : \"Bets\"],\n        username\n      );\n    } else if (typeof clearGameCaches === \"function\") {\n      clearGameCaches(gameId);\n    }\n\n    return {\n'''
text = replace_once(text, old, new, 'saveBet post-write unlock')
old = '''  } finally {\n\n    lock.releaseLock();\n\n  }\n\n}\n\nfunction previewDuplicateBetsCleanup(){\n'''
new = '''  } finally {\n\n    if (lockAcquired && lock) lock.releaseLock();\n\n  }\n\n}\n\nfunction previewDuplicateBetsCleanup(){\n'''
text = replace_once(text, old, new, 'saveBet conditional release')
# cleanupDuplicateBets is maintenance; just targeted cache, still lock safe.
old = '''    if (typeof clearAppCaches === \"function\") {\n      clearAppCaches();\n    }\n\n    return {\n      success: true,\n      groupsConsolidated:'''
new = '''    if (typeof clearGameDataCaches === \"function\") {\n      clearGameDataCaches(\"\", [typeof BETS_SHEET !== \"undefined\" ? BETS_SHEET : \"Bets\"]);\n    } else if (typeof clearAppCaches === \"function\") {\n      clearAppCaches();\n    }\n\n    return {\n      success: true,\n      groupsConsolidated:'''
text = replace_once(text, old, new, 'bet cleanup cache')
# removeBet lock tracking and post-write release.
old = '''function removeBet(payload){\n\n  const lock =\n    ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());\n\n  const gotLock =\n    lock.tryLock(8000);\n'''
new = '''function removeBet(payload){\n\n  const lock =\n    ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());\n  let lockAcquired = false;\n\n  const gotLock =\n    lock.tryLock(5000);\n\n  lockAcquired = gotLock;\n'''
text = replace_once(text, old, new, 'removeBet lock tracking')
old = '''    SpreadsheetApp.flush();\n\n    if (\n      typeof clearAppCaches ===\n      \"function\"\n    ) {\n\n      clearAppCaches();\n\n    }\n\n    return {\n'''
new = '''    SpreadsheetApp.flush();\n\n    if (lockAcquired) {\n      lock.releaseLock();\n      lockAcquired = false;\n    }\n\n    if (typeof clearPlayerActionCaches === \"function\") {\n      clearPlayerActionCaches(\n        gameId,\n        [typeof BETS_SHEET !== \"undefined\" ? BETS_SHEET : \"Bets\"],\n        username\n      );\n    } else if (typeof clearGameCaches === \"function\") {\n      clearGameCaches(gameId);\n    }\n\n    return {\n'''
text = replace_once(text, old, new, 'removeBet post-write unlock/cache')
# removeBet final release (last matching explicit lock release in removeBet block).
old = '''  } finally {\n\n    lock.releaseLock();\n\n  }\n\n}\n\n/* =====================================================\n   LEADERBOARD'''
new = '''  } finally {\n\n    if (lockAcquired && lock) lock.releaseLock();\n\n  }\n\n}\n\n/* =====================================================\n   LEADERBOARD'''
text = replace_once(text, old, new, 'removeBet conditional release')
write(rel, text)

# -----------------------------------------------------------------------------
# Ranking: do not clear/rewrite the whole sheet for one ballot; only replace the
# matching rows, then targeted invalidation after releasing the lock.
# -----------------------------------------------------------------------------
rel = 'backend/engines/RankingGameEngine.js'
text = read(rel)
old = '''    const keep = [];\n    for (let i = 1; i < data.length; i++) {\n      const same = rankingString_(data[i][col.gameid]) === gameId &&\n        rankingString_(data[i][col.username]) === username &&\n        rankingKey_(data[i][col.categoryid]) === categoryId;\n      if (!same) keep.push(data[i]);\n    }\n\n    const now = new Date();\n    const newRows = rankings.map(function(item) {\n      const row = new Array(headers.length).fill(\"\");\n      row[col.timestamp] = now;\n      row[col.updatedat] = now;\n      row[col.gameid] = gameId;\n      row[col.username] = username;\n      row[col.categoryid] = categoryId;\n      row[col.nomineeid] = rankingKey_(item.nomineeId);\n      row[col.rank] = rankingNumber_(item.rank, 0);\n      row[col.locked] = false;\n      return row;\n    });\n\n    const output = [headers].concat(keep, newRows);\n    sh.clearContents();\n    sh.getRange(1, 1, output.length, headers.length).setValues(output);\n    if (typeof clearAppCaches === \"function\") clearAppCaches();\n    return { success: true, gameId: gameId, categoryId: categoryId, saved: newRows.length };\n  } finally {\n    lock.releaseLock();\n  }\n}\n'''
new = '''    const matchingRows = [];\n    for (let i = 1; i < data.length; i++) {\n      const same = rankingString_(data[i][col.gameid]) === gameId &&\n        rankingString_(data[i][col.username]) === username &&\n        rankingKey_(data[i][col.categoryid]) === categoryId;\n      if (same) matchingRows.push(i + 1);\n    }\n\n    const now = new Date();\n    const newRows = rankings.map(function(item) {\n      const row = new Array(headers.length).fill(\"\");\n      row[col.timestamp] = now;\n      row[col.updatedat] = now;\n      row[col.gameid] = gameId;\n      row[col.username] = username;\n      row[col.categoryid] = categoryId;\n      row[col.nomineeid] = rankingKey_(item.nomineeId);\n      row[col.rank] = rankingNumber_(item.rank, 0);\n      row[col.locked] = false;\n      return row;\n    });\n\n    const reuseCount = Math.min(matchingRows.length, newRows.length);\n    for (let i = 0; i < reuseCount; i++) {\n      sh.getRange(matchingRows[i], 1, 1, headers.length).setValues([newRows[i]]);\n    }\n\n    if (newRows.length > reuseCount) {\n      const appendRows = newRows.slice(reuseCount);\n      sh.getRange(sh.getLastRow() + 1, 1, appendRows.length, headers.length).setValues(appendRows);\n    }\n\n    if (matchingRows.length > newRows.length) {\n      matchingRows.slice(newRows.length).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {\n        sh.deleteRow(rowNumber);\n      });\n    }\n\n    SpreadsheetApp.flush();\n    return { success: true, gameId: gameId, categoryId: categoryId, saved: newRows.length };\n  } finally {\n    lock.releaseLock();\n  }\n}\n'''
text = replace_once(text, old, new, 'Ranking targeted row write')
# Add targeted cache after finally by wrapping call site is harder because return occurs inside try.
# Instead add cache before return but it is lightweight and targeted; no global clear.
old = '''    SpreadsheetApp.flush();\n    return { success: true, gameId: gameId, categoryId: categoryId, saved: newRows.length };\n'''
new = '''    SpreadsheetApp.flush();\n    if (typeof clearPlayerActionCaches === \"function\") {\n      clearPlayerActionCaches(gameId, [RANKING_ENTRIES_SHEET], username);\n    } else if (typeof clearGameCaches === \"function\") {\n      clearGameCaches(gameId);\n    }\n    return { success: true, gameId: gameId, categoryId: categoryId, saved: newRows.length };\n'''
text = replace_once(text, old, new, 'Ranking targeted cache')
# Admin ranking results should invalidate only affected game, not whole app.
old = '  if (typeof clearAppCaches === "function") clearAppCaches();\n  return {\n    success: true,\n    gameId: gameId,\n    categoryId: categoryId,'
new = '  if (typeof clearGameDataCaches === "function") {\n    clearGameDataCaches(gameId, ["CategoryResults", "CategorySettings"]);\n  } else if (typeof clearGameCaches === "function") {\n    clearGameCaches(gameId);\n  }\n  return {\n    success: true,\n    gameId: gameId,\n    categoryId: categoryId,'
text = replace_once(text, old, new, 'Ranking admin result cache')
write(rel, text)

# -----------------------------------------------------------------------------
# Notifications: replace long-held global script lock with short atomic lease.
# -----------------------------------------------------------------------------
rel = 'backend/engines/NotificationsEngine.js'
text = read(rel)
anchor = 'function notificationPushRunScheduledPickReminders() {\n'
helper = '''const PUSH_REMINDER_RUN_LEASE_KEY = \"PUSH_REMINDER_RUN_LEASE_V1218X1\";\nconst PUSH_REMINDER_RUN_LEASE_MS = 15 * 60 * 1000;\n\nfunction notificationPushAcquireReminderLease_() {\n  const props = PropertiesService.getScriptProperties();\n  const now = Date.now();\n  const token = \"reminder|\" + now + \"|\" + Math.random().toString(36).slice(2);\n  const lock = LockService.getScriptLock();\n  if (!lock.tryLock(300)) return { acquired: false, busy: true };\n  try {\n    let current = null;\n    try { current = JSON.parse(props.getProperty(PUSH_REMINDER_RUN_LEASE_KEY) || \"null\"); } catch (ignore) {}\n    if (current && Number(current.expiresAt || 0) > now) {\n      return { acquired: false, busy: true, owner: current.owner || \"reminder\" };\n    }\n    const lease = { acquired: true, token: token, owner: \"automatic-reminders\", startedAt: now, expiresAt: now + PUSH_REMINDER_RUN_LEASE_MS };\n    props.setProperty(PUSH_REMINDER_RUN_LEASE_KEY, JSON.stringify(lease));\n    return lease;\n  } finally {\n    lock.releaseLock();\n  }\n}\n\nfunction notificationPushReleaseReminderLease_(lease) {\n  if (!lease || !lease.token) return;\n  const props = PropertiesService.getScriptProperties();\n  const lock = LockService.getScriptLock();\n  if (!lock.tryLock(300)) return;\n  try {\n    let current = null;\n    try { current = JSON.parse(props.getProperty(PUSH_REMINDER_RUN_LEASE_KEY) || \"null\"); } catch (ignore) {}\n    if (current && current.token === lease.token) {
      if (typeof props.deleteProperty === "function") props.deleteProperty(PUSH_REMINDER_RUN_LEASE_KEY);
      else props.setProperty(PUSH_REMINDER_RUN_LEASE_KEY, "");
    }\n  } finally {\n    lock.releaseLock();\n  }\n}\n\nfunction notificationPushRunScheduledPickReminders() {\n'''
text = replace_once(text, anchor, helper, 'Notification lease helper insertion')
old = '''  let lock = null;\n\n  if (typeof LockService !== \"undefined\" && LockService.getScriptLock) {\n    lock = LockService.getScriptLock();\n    if (!lock.tryLock(5000)) {\n      return { success: false, message: \"Another automatic reminder check is already running.\" };\n    }\n  }\n\n  try {\n'''
new = '''  const lease = notificationPushAcquireReminderLease_();\n  if (!lease.acquired) {\n    return { success: true, skipped: true, message: \"Another automatic reminder check is already running.\" };\n  }\n\n  try {\n'''
text = replace_once(text, old, new, 'Notification acquire lease')
old = '''  } finally {\n    if (lock) lock.releaseLock();\n  }\n}\n'''
new = '''  } finally {\n    notificationPushReleaseReminderLease_(lease);\n  }\n}\n'''
text = replace_once(text, old, new, 'Notification release lease')
write(rel, text)

# -----------------------------------------------------------------------------
# Sports: one shared short lease for all background sports automations; replace
# global cache flushes with targeted affected-game invalidation.
# -----------------------------------------------------------------------------
rel = 'backend/engines/SportsWagerEngine.js'
text = read(rel)
anchor = '''const SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION =\n  \"runSportsWagerScoreRefresh\";\n'''
helper = '''const SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION =\n  \"runSportsWagerScoreRefresh\";\n\nconst SPORTS_WAGER_AUTOMATION_LEASE_KEY =\n  \"SPORTS_WAGER_AUTOMATION_LEASE_V1218X1\";\nconst SPORTS_WAGER_AUTOMATION_LEASE_MS =\n  20 * 60 * 1000;\n\nfunction sportsWagerAcquireAutomationLease_(owner) {\n  const props = PropertiesService.getScriptProperties();\n  const now = Date.now();\n  const token = String(owner || \"sports\") + \"|\" + now + \"|\" + Math.random().toString(36).slice(2);\n  const lock = LockService.getScriptLock();\n  if (!lock.tryLock(300)) return { acquired: false, busy: true };\n  try {\n    let current = null;\n    try { current = JSON.parse(props.getProperty(SPORTS_WAGER_AUTOMATION_LEASE_KEY) || \"null\"); } catch (ignore) {}\n    if (current && Number(current.expiresAt || 0) > now) {\n      return { acquired: false, busy: true, owner: current.owner || \"sports-automation\" };\n    }\n    const lease = { acquired: true, token: token, owner: String(owner || \"sports-automation\"), startedAt: now, expiresAt: now + SPORTS_WAGER_AUTOMATION_LEASE_MS };\n    props.setProperty(SPORTS_WAGER_AUTOMATION_LEASE_KEY, JSON.stringify(lease));\n    return lease;\n  } finally {\n    lock.releaseLock();\n  }\n}\n\nfunction sportsWagerReleaseAutomationLease_(lease) {\n  if (!lease || !lease.token) return;\n  const props = PropertiesService.getScriptProperties();\n  const lock = LockService.getScriptLock();\n  if (!lock.tryLock(300)) return;\n  try {\n    let current = null;\n    try { current = JSON.parse(props.getProperty(SPORTS_WAGER_AUTOMATION_LEASE_KEY) || \"null\"); } catch (ignore) {}\n    if (current && current.token === lease.token) {
      if (typeof props.deleteProperty === "function") props.deleteProperty(SPORTS_WAGER_AUTOMATION_LEASE_KEY);
      else props.setProperty(SPORTS_WAGER_AUTOMATION_LEASE_KEY, "");
    }\n  } finally {\n    lock.releaseLock();\n  }\n}\n\nfunction sportsWagerClearCachesForGames_(gameIds) {\n  const ids = {};\n  (gameIds || []).forEach(function(gameId) {\n    gameId = sportsWagerNormalizeGameId_(gameId);\n    if (gameId) ids[gameId] = true;\n  });\n\n  Object.keys(ids).forEach(function(gameId) {\n    if (typeof clearGameDataCaches === \"function\") {\n      clearGameDataCaches(gameId, [\"Categories\", \"CategorySettings\", \"CategoryResults\"]);\n    } else if (typeof clearGameCaches === \"function\") {\n      clearGameCaches(gameId);\n    }\n  });\n}\n'''
text = replace_once(text, anchor, helper, 'Sports lease/cache helpers')
# runSportsWagerScoreRefresh lock -> lease
old = '''  const lock =\n    LockService.getScriptLock();\n\n  if (!lock.tryLock(30000)) {\n    return {\n      success: false,\n      message: \"Sports wager score refresh already running\"\n    };\n  }\n\n  try {\n'''
new = '''  const lease =\n    sportsWagerAcquireAutomationLease_(\"score-refresh\");\n\n  if (!lease.acquired) {\n    return {\n      success: true,\n      skipped: true,\n      message: \"Sports wager automation already running\"\n    };\n  }\n\n  try {\n'''
text = replace_once(text, old, new, 'Sports score refresh lease')
old = '''  } finally {\n\n    lock.releaseLock();\n\n  }\n\n}\n\nfunction getSportsWagerGameIdsForRefresh_()'''
new = '''  } finally {\n\n    sportsWagerReleaseAutomationLease_(lease);\n\n  }\n\n}\n\nfunction getSportsWagerGameIdsForRefresh_()'''
text = replace_once(text, old, new, 'Sports score refresh release')
# smart automation lock -> same lease
old = '''  const lock =\n    LockService.getScriptLock();\n\n  if (!lock.tryLock(30000)) {\n    return {\n      success: false,\n      skipped: true,\n      message: \"Smart sports automation already running\"\n    };\n  }\n\n  try {\n'''
new = '''  const lease =\n    sportsWagerAcquireAutomationLease_(\"smart-automation\");\n\n  if (!lease.acquired) {\n    return {\n      success: true,\n      skipped: true,\n      message: \"Sports wager automation already running\"\n    };\n  }\n\n  try {\n'''
text = replace_once(text, old, new, 'Sports smart automation lease')
old = '''  } finally {\n    lock.releaseLock();\n  }\n\n}\n\nfunction removeSportsWagerSmartAutomationQueuedTriggers_()'''
new = '''  } finally {\n    sportsWagerReleaseAutomationLease_(lease);\n  }\n\n}\n\nfunction removeSportsWagerSmartAutomationQueuedTriggers_()'''
text = replace_once(text, old, new, 'Sports smart automation release')
# Replace each broad sports cache clear with targeted call based on enclosing context.
replacements = [
('''  if (\n    shouldClearCaches &&\n    typeof clearAppCaches === \"function\"\n  ) {\n    clearAppCaches();\n  }\n''', '''  if (shouldClearCaches) {\n    sportsWagerClearCachesForGames_([awardsGameId]);\n  }\n''', 'create sports cache'),
('''  if (\n    typeof clearAppCaches ===\n    \"function\"\n  ) {\n\n    clearAppCaches();\n\n  }\n\n  return summary;\n\n}\n\n/* =====================================================\n   ADMIN API: SETTLE SPORTS WAGERS''', '''  if (payload.skipCacheClear !== true) {\n    sportsWagerClearCachesForGames_([awardsGameId]);\n  }\n\n  return summary;\n\n}\n\n/* =====================================================\n   ADMIN API: SETTLE SPORTS WAGERS''', 'settle sports cache'),
('''  if (\n    typeof clearAppCaches ===\n    \"function\"\n  ) {\n    clearAppCaches();\n  }\n\n  return summary;\n\n}\n\n\n\nfunction apiAdminRefreshSportsWagerScores''', '''  if (payload.skipCacheClear !== true) {\n    sportsWagerClearCachesForGames_([awardsGameId]);\n  }\n\n  return summary;\n\n}\n\n\n\nfunction apiAdminRefreshSportsWagerScores''', 'refresh sports cache'),
('''  if (typeof clearAppCaches === \"function\") {\n    clearAppCaches();\n  }\n\n  return summary;\n\n}\n\nfunction testFinalizeSportsWagerResultsFromCategoriesNow''', '''  sportsWagerClearCachesForGames_([awardsGameId]);\n\n  return summary;\n\n}\n\nfunction testFinalizeSportsWagerResultsFromCategoriesNow''', 'finalize categories cache'),
('''  if (typeof clearAppCaches === \"function\") {\n    clearAppCaches();\n  }\n\n  return summary;\n\n}\n\nfunction testFinalizeAllSportsWagerResultsFromCategoriesNow''', '''  sportsWagerClearCachesForGames_(gameIds);\n\n  return summary;\n\n}\n\nfunction testFinalizeAllSportsWagerResultsFromCategoriesNow''', 'finalize all categories cache'),
('''    payload.skipCacheClear !== true &&\n    typeof clearAppCaches === \"function\"\n  ) {\n    clearAppCaches();\n  }\n''', '''    payload.skipCacheClear !== true\n  ) {\n    sportsWagerClearCachesForGames_([awardsGameId]);\n  }\n''', 'source finalizer cache'),
('''  if (typeof clearAppCaches === \"function\") {\n    clearAppCaches();\n  }\n\n  return summary;\n\n}\n\nfunction testFinalizeSportsWagerResultsFromSourceScoresNow''', '''  sportsWagerClearCachesForGames_(gameIds);\n\n  return summary;\n\n}\n\nfunction testFinalizeSportsWagerResultsFromSourceScoresNow''', 'source all games cache'),
('''  if (\n    typeof clearAppCaches ===\n    \"function\"\n  ) {\n    clearAppCaches();\n  }\n\n  return {\n    success: true,\n    awardsGameId: awardsGameId,''', '''  sportsWagerClearCachesForGames_([awardsGameId]);\n\n  return {\n    success: true,\n    awardsGameId: awardsGameId,''', 'refresh settle cache'),
('''  if (\n    typeof clearAppCaches ===\n    \"function\"\n  ) {\n    clearAppCaches();\n  }\n\n  return summary;\n\n}\n\n\n\nfunction apiAdminAutoSetSportsWagerOdds''', '''  if (payload.skipCacheClear !== true) {\n    sportsWagerClearCachesForGames_([awardsGameId]);\n  }\n\n  return summary;\n\n}\n\n\n\nfunction apiAdminAutoSetSportsWagerOdds''', 'auto odds cache'),
('''    if (typeof clearAppCaches === \"function\") {\n      clearAppCaches();\n    }\n\n    return summary;\n''', '''    sportsWagerClearCachesForGames_(gameIds);\n\n    return summary;\n''', 'smart automation final cache'),
]
for old,new,label in replacements:
    text = replace_once(text, old, new, label)
# Ensure automation inner calls can skip repeated invalidation.
text = replace_once(text, '''          refreshSportsWagerScores({\n            gameId: gameId\n          });''', '''          refreshSportsWagerScores({\n            gameId: gameId,\n            skipCacheClear: true\n          });''', 'score automation refresh skip cache')
text = replace_once(text, '''            refreshOddsIfStale: false\n          });''', '''            refreshOddsIfStale: false,\n            skipCacheClear: true\n          });''', 'score automation auto odds skip cache')
old_settle_call = '''          settleSportsWagers({\n            gameId: gameId,\n            skipRefresh: true,\n            force: true\n          });'''
new_settle_call = '''          settleSportsWagers({\n            gameId: gameId,\n            skipRefresh: true,\n            force: true,\n            skipCacheClear: true\n          });'''
if text.count(old_settle_call) != 2:
    raise SystemExit(f'STOP: score/smart settle calls expected 2 anchors, found {text.count(old_settle_call)}')
text = text.replace(old_settle_call, new_settle_call, 1)
# Smart automation equivalents (one exact occurrence remains for each pattern with refreshEngineFirst).
text = replace_once(text, '''          refreshSportsWagerScores({\n            gameId: gameId,\n            refreshEngineFirst: false\n          });''', '''          refreshSportsWagerScores({\n            gameId: gameId,\n            refreshEngineFirst: false,\n            skipCacheClear: true\n          });''', 'smart refresh skip cache')
text = replace_once(text, '''            refreshOddsIfStale: false,\n            refreshOddsEngineFirst: false\n          });''', '''            refreshOddsIfStale: false,\n            refreshOddsEngineFirst: false,\n            skipCacheClear: true\n          });''', 'smart auto odds skip cache')
# Smart settle pattern may now have already changed first instance only; replace remaining exact if exists.
old = '''          settleSportsWagers({\n            gameId: gameId,\n            skipRefresh: true,\n            force: true\n          });'''
if text.count(old) != 1:
    raise SystemExit(f'STOP: smart settle skip cache expected 1 remaining anchor, found {text.count(old)}')
text = text.replace(old, '''          settleSportsWagers({\n            gameId: gameId,\n            skipRefresh: true,\n            force: true,\n            skipCacheClear: true\n          });''', 1)
# Score-refresh suppresses repeated invalidation inside each game; invalidate once after the batch.
text = replace_once(text, '''    });\n\n    return {\n      success: true,\n      sourceRefresh:\n        sourceRefresh,''', '''    });\n\n    sportsWagerClearCachesForGames_(gameIds);\n\n    return {\n      success: true,\n      sourceRefresh:\n        sourceRefresh,''', 'score refresh final targeted cache')
write(rel, text)

# -----------------------------------------------------------------------------
# Racing: do not clear every game's caches when only one racing game changed.
# -----------------------------------------------------------------------------
rel = 'backend/engines/RacingWagerEngine.js'
text = read(rel)
text = replace_once(text, '''    if (typeof clearAppCaches === \"function\") {\n      clearAppCaches();\n    }''', '''    if (typeof clearGameDataCaches === \"function\") {\n      clearGameDataCaches(awardsGameId, [\"Categories\", \"CategorySettings\", \"CategoryResults\"]);\n    } else if (typeof clearGameCaches === \"function\") {\n      clearGameCaches(awardsGameId);\n    }''', 'Racing create targeted cache')
text = replace_once(text, '''  if (typeof clearAppCaches === \"function\") {\n    clearAppCaches();\n  }\n\n  return {\n    success: errors.length === 0,\n    awardsGameId: awardsGameId,\n    refreshed:''', '''  if (typeof clearGameDataCaches === \"function\") {\n    clearGameDataCaches(awardsGameId, [\"Categories\", \"CategorySettings\", \"CategoryResults\"]);\n  } else if (typeof clearGameCaches === \"function\") {\n    clearGameCaches(awardsGameId);\n  }\n\n  return {\n    success: errors.length === 0,\n    awardsGameId: awardsGameId,\n    refreshed:''', 'Racing refresh targeted cache')
text = replace_once(text, '''  if (typeof clearAppCaches === \"function\") {\n    clearAppCaches();\n  }\n\n  return {\n    success: errors.length === 0,\n    awardsGameId: awardsGameId,\n    settled:''', '''  if (typeof clearGameDataCaches === \"function\") {\n    clearGameDataCaches(awardsGameId, [\"Categories\", \"CategorySettings\", \"CategoryResults\"]);\n  } else if (typeof clearGameCaches === \"function\") {\n    clearGameCaches(awardsGameId);\n  }\n\n  return {\n    success: errors.length === 0,\n    awardsGameId: awardsGameId,\n    settled:''', 'Racing settle targeted cache')
write(rel, text)


# -----------------------------------------------------------------------------
# Final cache/navigation/admin-sports performance recovery
# -----------------------------------------------------------------------------
# --- App.js: instant in-session snapshots / stale-while-revalidate navigation ---
rel='frontend/js/app.js'; t=read(rel)
anchor='''/* ======================\n   NAVIGATION CORE\n====================== */\n\nasync function navigate(page, options) {\n'''
insert='''/* ======================\n   FAST PAGE SNAPSHOTS\n   v1.2.18x1b\n\n   Public play pages are expensive because their server payloads aggregate\n   several Sheets. Keep the most recently rendered DOM in memory so normal\n   back-and-forth navigation paints immediately. Fresh snapshots are reused\n   directly; older snapshots paint first and refresh quietly in the background.\n====================== */\n\nconst APP_PAGE_SNAPSHOT_CACHE = {};\nconst APP_PAGE_SNAPSHOT_FRESH_MS = 30 * 1000;\nconst APP_PAGE_SNAPSHOT_MAX_MS = 5 * 60 * 1000;\n\nfunction appPageSnapshotEligible_(page) {\n  page = String(page || "");\n  if (!page) return false;\n  if (page.indexOf("admin") === 0) return false;\n  return page === "dashboard" ||\n    page.indexOf("hub:") === 0 ||\n    page === "picks" ||\n    page === "game-hub" ||\n    page === "survivor" ||\n    page === "ranking" ||\n    page === "team-fantasy" ||\n    page === "betting" ||\n    page === "leaderboard" ||\n    page === "season-hub" ||\n    page === "trophy-room" ||\n    page === "more";\n}\n\nfunction appPageSnapshotKey_(page) {\n  const session = typeof getSession === "function" ? getSession() : null;\n  const username = String(session && session.username || "").trim().toLowerCase();\n  const gameId = typeof getFrontendGameId === "function" ? String(getFrontendGameId() || "").trim() : String(APP_STATE.gameId || "").trim();\n  const leagueId = typeof getFrontendLeagueId === "function" ? String(getFrontendLeagueId() || "").trim() : "";\n  const mode = String(localStorage.getItem("gameMode") || "").trim().toLowerCase();\n  return [username, gameId, leagueId, mode, String(page || "")].join("|");\n}\n\nfunction appCapturePageSnapshot_(page, app) {\n  if (!app || !appPageSnapshotEligible_(page)) return;\n  const html = String(app.innerHTML || "");\n  if (!html || html.indexOf("Page failed to load") !== -1) return;\n  APP_PAGE_SNAPSHOT_CACHE[appPageSnapshotKey_(page)] = {\n    html: html,\n    savedAt: Date.now()\n  };\n}\n\nfunction appReadPageSnapshot_(page) {\n  if (!appPageSnapshotEligible_(page)) return null;\n  const key = appPageSnapshotKey_(page);\n  const item = APP_PAGE_SNAPSHOT_CACHE[key] || null;\n  if (!item) return null;\n  const age = Date.now() - Number(item.savedAt || 0);\n  if (age > APP_PAGE_SNAPSHOT_MAX_MS) {\n    delete APP_PAGE_SNAPSHOT_CACHE[key];\n    return null;\n  }\n  return { key: key, html: item.html, age: age };\n}\n\nfunction invalidateAppPageSnapshots(gameId) {\n  gameId = String(gameId || "").trim();\n  Object.keys(APP_PAGE_SNAPSHOT_CACHE).forEach(function(key) {\n    if (!gameId || key.indexOf("|" + gameId + "|") !== -1) {\n      delete APP_PAGE_SNAPSHOT_CACHE[key];\n    }\n  });\n}\n\nfunction appRefreshSnapshotQuietly_(page, snapshotKey) {\n  window.setTimeout(async function() {\n    try {\n      await ensurePageModules_(page);\n      if (APP_STATE.currentPage !== page || appPageSnapshotKey_(page) !== snapshotKey) return;\n      const app = document.getElementById("app");\n      if (!app) return;\n      await renderPage(page);\n      if (APP_STATE.currentPage !== page || appPageSnapshotKey_(page) !== snapshotKey) return;\n      appCapturePageSnapshot_(page, app);\n      if (isAdminPage_(page) && typeof adminUiEnhancePage === "function") adminUiEnhancePage(app);\n    } catch (err) {\n      console.warn("Quiet page refresh skipped", page, err);\n    }\n  }, 0);\n}\n\n/* ======================\n   NAVIGATION CORE\n====================== */\n\nasync function navigate(page, options) {\n'''
t=replace_once(t,anchor,insert,'insert page snapshot helpers')
old='''  app.classList.add("page-enter");\n\n  APP_STATE.currentPage = page;\n  const usePageLoader = options.suppressLoader !== true;\n  if (usePageLoader) {\n    showLoader({\n      percent: 8,\n      title: isAdminPage_(page) ? "Loading Admin Tools" : "Loading",\n      detail: isAdminPage_(page) ? "Preparing " + page.replace(/[-:]/g, " ") + "…" : ""\n    });\n  }\n\n  window.location.hash = page;\n\n  try {\n'''
new='''  const previousPage = APP_STATE.currentPage;\n  if (previousPage && previousPage !== page) {\n    appCapturePageSnapshot_(previousPage, app);\n  }\n\n  app.classList.add("page-enter");\n\n  APP_STATE.currentPage = page;\n  const snapshot = options.forceRefresh === true ? null : appReadPageSnapshot_(page);\n  const usePageLoader = options.suppressLoader !== true;\n\n  window.location.hash = page;\n\n  if (snapshot) {\n    app.innerHTML = snapshot.html;\n    app.classList.remove("page-enter");\n    app.classList.add("page-enter-active");\n    setActiveNav(page);\n\n    // Fresh snapshots return immediately. Stale-but-valid snapshots remain\n    // visible while the page refreshes quietly, avoiding another full-screen loader.\n    if (snapshot.age >= APP_PAGE_SNAPSHOT_FRESH_MS || options.refreshCached === true) {\n      appRefreshSnapshotQuietly_(page, snapshot.key);\n    }\n    return;\n  }\n\n  if (usePageLoader) {\n    showLoader({\n      percent: 8,\n      title: isAdminPage_(page) ? "Loading Admin Tools" : "Loading",\n      detail: isAdminPage_(page) ? "Preparing " + page.replace(/[-:]/g, " ") + "…" : ""\n    });\n  }\n\n  try {\n'''
t=replace_once(t,old,new,'navigate snapshot use')
# capture after successful render before final animation
old='''    if (isAdminPage_(page) && typeof adminUiEnhancePage === "function") {\n      adminUiEnhancePage(app);\n    }\n    setPageLoadStep(94, isAdminPage_(page) ? "Finishing page layout…" : "");\n'''
new='''    if (isAdminPage_(page) && typeof adminUiEnhancePage === "function") {\n      adminUiEnhancePage(app);\n    }\n    appCapturePageSnapshot_(page, app);\n    setPageLoadStep(94, isAdminPage_(page) ? "Finishing page layout…" : "");\n'''
t=replace_once(t,old,new,'capture rendered snapshot')
asset_match = re.search(r'const APP_ASSET_VERSION\s*=\s*\n?\s*"([^"]+)";', t)
route_match = re.search(r'const APP_ROUTE_HOTFIX_VERSION\s*=\s*\n?\s*"([^"]+)";', t)
if not asset_match or not route_match:
    raise SystemExit('STOP: frontend app version markers not found')
old_asset = asset_match.group(1)
old_route = route_match.group(1)
if not old_asset.endswith('-v1218w4-survivor-edge-cases'):
    raise SystemExit('STOP: expected v1.2.18w4 frontend asset baseline, found ' + old_asset[-80:])
new_asset = old_asset + '-v1218x1b-performance'
# Replace only the captured version value so both current one-line and legacy
# multi-line APP_ASSET_VERSION declarations are handled safely.
t = t[:asset_match.start(1)] + new_asset + t[asset_match.end(1):]
if new_asset not in t:
    raise SystemExit('STOP: frontend app asset marker did not update')
write(rel,t)
# mirror
write('frontend/app.js',t)

# Keep shell asset URLs synchronized with the exact current production marker.
rel='frontend/app.html'; html=read(rel)
old_url='js/app.js?v=' + old_asset + '&hotfix=' + old_route
new_url='js/app.js?v=' + new_asset + '&hotfix=' + old_route
html=replace_once(html, old_url, new_url, 'app.html x1 asset marker')
write(rel,html)

rel='frontend/sw.js'; sw=read(rel)
if old_asset in sw:
    sw=sw.replace(old_asset, new_asset, 1)
else:
    # Older/reconstructed shells may compose the SW cache marker differently.
    # Still bump the cache identity and retain the exact current asset marker for diagnostics.
    cache_match = re.search(r'const AWARDS_CACHE\s*=\s*"([^"]+)";', sw)
    if not cache_match:
        raise SystemExit('STOP: service worker cache marker not found')
    old_cache = cache_match.group(1)
    new_cache = old_cache if old_cache.endswith('-v1218x1b-performance') else old_cache + '-v1218x1b-performance'
    sw=sw.replace('const AWARDS_CACHE = "' + old_cache + '";', 'const AWARDS_CACHE = "' + new_cache + '";', 1)
    sw='// Current app asset: ' + new_asset + '\n' + sw
write(rel,sw)

# Admin: add Sports Scores/Game Builder card below Sports Engine Controls
rel='frontend/js/pages/admin.js'; t=read(rel)
anchor='''        <div class="card admin-card">\n\n          <h2>League Access</h2>\n'''
card='''        <div class="card admin-card">\n\n          <h2>Sports Scores & Game Builder</h2>\n\n          <div class="admin-sub">\n            Open the admin-only Sports Scores workspace to review schedules, scores and records, then build Sports Wagers, Confidence games, player props, matchups, and advanced sports prediction questions.\n          </div>\n\n          <div class="admin-actions">\n            <button\n              class="button admin-button"\n              onclick="window.location.href='./sports.html'"\n            >\n              Open Sports Scores & Builder\n            </button>\n          </div>\n\n        </div>\n\n        <div class="card admin-card">\n\n          <h2>League Access</h2>\n'''
t=replace_once(t,anchor,card,'admin sports builder card')
write(rel,t)

# Sports page: make intent/admin-only explicit and guard startup
rel='frontend/sports.html'; t=read(rel)
t=t.replace('<title>Sports Scores</title>','<title>Sports Scores & Game Builder</title>',1)
t=t.replace('<h1>Sports Scores</h1>\n      <p>Live scores, finals, snapshots, and enabled leagues.</p>', '<h1>Sports Scores & Game Builder</h1>\n      <p>Admin workspace for live scores, schedules, wagers, confidence pools, props, matchups, and sports prediction questions.</p>',1)
t=t.replace('<a href="./sports.html" class="active">Sports</a>','<a href="./sports.html" class="active">Admin Sports</a>',1)
# Force the browser/PWA to fetch the admin Sports workspace update.
sports_script_match = re.search(r'js/sports\.js\?v=([^"\']+)', t)
if sports_script_match:
    old_sports_v = sports_script_match.group(1)
    if not old_sports_v.endswith('-v1218x1b-performance'):
        t = t.replace('js/sports.js?v=' + old_sports_v, 'js/sports.js?v=' + old_sports_v + '-v1218x1b-performance', 1)
write(rel,t)

rel='frontend/js/sports.js'; t=read(rel)
old='''document.addEventListener("DOMContentLoaded", function() {\n  bindSportsEvents();\n  initSportsPage();\n});\n'''
new='''document.addEventListener("DOMContentLoaded", function() {\n  const session = getSportsStoredSession_();\n  if (!sportsSessionIsAdmin_(session)) {\n    const main = document.querySelector("main.page");\n    if (main) {\n      main.innerHTML = '<section class="status-box"><strong>Admin access required.</strong><br>Open Sports Scores & Game Builder from the PATTC Predicts Admin page after signing in as an administrator.</section>';\n    }\n    return;\n  }\n  bindSportsEvents();\n  initSportsPage();\n});\n'''
t=replace_once(t,old,new,'sports admin guard')
write(rel,t)

# AdminCategories: targeted normalized/cache invalidation and game-aware calls
rel='backend/admin/AdminCategories.js'; t=read(rel)
old='''function adminCatClearCaches_() {\n\n  /*\n    Game Setup writes update normalized Questions / QuestionOptions as well\n    as compatibility rows. Clear both cache layers so an immediate reopen\n    cannot display the pre-save wording.\n  */\n  if (\n    typeof normalizedStorageClearCaches_ ===\n    "function"\n  ) {\n\n    normalizedStorageClearCaches_();\n    return;\n\n  }\n\n  if (\n    typeof clearAppCaches ===\n    "function"\n  ) {\n\n    clearAppCaches();\n\n  }\n\n}\n'''
new='''function adminCatClearCaches_(gameId) {\n\n  /*\n    Game Setup writes update normalized Questions / QuestionOptions as well\n    as compatibility rows. Invalidate only the affected game instead of\n    dumping every active game's warm cache after each admin field save.\n  */\n  if (typeof NORMALIZED_STORAGE_RUNTIME_CACHE !== "undefined") {\n    NORMALIZED_STORAGE_RUNTIME_CACHE = {};\n  }\n\n  gameId = adminCatNormalizeGameId_(gameId);\n  if (gameId && typeof clearGameDataCaches === "function") {\n    clearGameDataCaches(gameId, [\n      typeof QUESTIONS_SHEET !== "undefined" ? QUESTIONS_SHEET : "Questions",\n      typeof QUESTION_OPTIONS_SHEET !== "undefined" ? QUESTION_OPTIONS_SHEET : "QuestionOptions",\n      typeof DATA_INDEX_SHEET !== "undefined" ? DATA_INDEX_SHEET : "DataIndex",\n      typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories",\n      typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings",\n      typeof CATEGORY_RESULTS_SHEET !== "undefined" ? CATEGORY_RESULTS_SHEET : "CategoryResults"\n    ]);\n    return;\n  }\n\n  if (typeof normalizedStorageClearCaches_ === "function") {\n    normalizedStorageClearCaches_();\n    return;\n  }\n\n  if (typeof clearAppCaches === "function") clearAppCaches();\n}\n'''
t=replace_once(t,old,new,'admin targeted cache helper')
# Calls exact contexts
t=t.replace('adminCatClearCaches_();','adminCatClearCaches_(gameId);',5) # create/update/delete q/delete answer/add nominee first 5 occurrences? Need verify below
# Now remaining inspect based known local names
# careful replace occurrences with safeGameId/targetGameId/gameId according to snippets
# find all remaining after first 5 and replace based nearest context manually via anchors
# The first 5 replacement sequence is at 2461,3118,3332,3610,3879; third should safeGameId not gameId -> fix
# in adminUpdateQuestionOrderPositions_ function the variable is safeGameId.
t=t.replace('SpreadsheetApp.flush();\n  adminCatClearCaches_(gameId);\n}\n\nfunction adminSetQuestionOrder', 'SpreadsheetApp.flush();\n  adminCatClearCaches_(safeGameId);\n}\n\nfunction adminSetQuestionOrder',1)
# remaining calls
# nominee created/updated
while 'adminCatClearCaches_();' in t:
    # handle clone special if preceding targetGameId within 500 chars
    idx=t.index('adminCatClearCaches_();')
    prev=t[max(0,idx-900):idx]
    if 'targetGameId' in prev and 'CloneSourceGameId' in prev:
        repl='adminCatClearCaches_(targetGameId);'
    else:
        repl='adminCatClearCaches_(gameId);'
    t=t[:idx]+repl+t[idx+len('adminCatClearCaches_();'):]
write(rel,t)

# Normalized cache helper: accepts optional gameId to avoid global flush from known game writers
rel='backend/engines/NormalizedQuestionStorageEngine.js'; t=read(rel)
old='''function normalizedStorageClearCaches_() {\n  NORMALIZED_STORAGE_RUNTIME_CACHE = {};\n\n  try {\n    const cache = CacheService.getScriptCache();\n    [\n      "sheet_" + QUESTIONS_SHEET,\n      "sheet_" + QUESTION_OPTIONS_SHEET,\n      "sheet_" + DATA_INDEX_SHEET\n    ].forEach(function(key) {\n      cache.remove(key);\n    });\n  } catch (err) {\n    Logger.log("Normalized cache clear warning: " + err);\n  }\n\n  if (typeof clearAppCaches === "function") {\n    clearAppCaches();\n  }\n}\n'''
new='''function normalizedStorageClearCaches_(gameId) {\n  NORMALIZED_STORAGE_RUNTIME_CACHE = {};\n\n  gameId = normalizedStorageString_(gameId);\n  if (gameId && typeof clearGameDataCaches === "function") {\n    clearGameDataCaches(gameId, [QUESTIONS_SHEET, QUESTION_OPTIONS_SHEET, DATA_INDEX_SHEET]);\n    return;\n  }\n\n  try {\n    const cache = CacheService.getScriptCache();\n    const keys = [\n      "sheet_" + QUESTIONS_SHEET,\n      "sheet_" + QUESTION_OPTIONS_SHEET,\n      "sheet_" + DATA_INDEX_SHEET\n    ];\n    if (typeof appCacheRemoveKeys_ === "function") appCacheRemoveKeys_(cache, keys);\n    else keys.forEach(function(key) { cache.remove(key); });\n  } catch (err) {\n    Logger.log("Normalized cache clear warning: " + err);\n  }\n\n  if (typeof clearAppCaches === "function") clearAppCaches();\n}\n'''
t=replace_once(t,old,new,'normalized optional scoped cache')
write(rel,t)

# Sports confidence: targeted cache; avoid triple global invalidation in bulk
rel='backend/engines/SportsConfidenceBuilderEngine.js'; t=read(rel)
t=t.replace('if (typeof clearAppCaches === "function") clearAppCaches();','''if (typeof clearGameDataCaches === "function") {\n      clearGameDataCaches(awardsGameId, ["Categories", "CategorySettings", "Questions", "QuestionOptions"]);\n    } else if (typeof clearGameCaches === "function") {\n      clearGameCaches(awardsGameId);\n    }''',1)
old='''    if (typeof normalizedStorageClearCaches_ === "function") {\n      normalizedStorageClearCaches_();\n    }\n    if (typeof adminCatClearCaches_ === "function") {\n      adminCatClearCaches_();\n    }\n    if (typeof clearAppCaches === "function") {\n      clearAppCaches();\n    }\n'''
new='''    if (typeof adminCatClearCaches_ === "function") {\n      adminCatClearCaches_(awardsGameId);\n    } else if (typeof normalizedStorageClearCaches_ === "function") {\n      normalizedStorageClearCaches_(awardsGameId);\n    } else if (typeof clearGameDataCaches === "function") {\n      clearGameDataCaches(awardsGameId, ["Categories", "CategorySettings", "Questions", "QuestionOptions"]);\n    }\n'''
t=replace_once(t,old,new,'sports confidence bulk cache')
write(rel,t)

# Sports advanced: targeted create and per-game settle
rel='backend/engines/SportsAdvancedQuestionEngine.js'; t=read(rel)
t=t.replace('if (typeof clearAppCaches === "function") clearAppCaches();','''if (typeof clearGameDataCaches === "function") clearGameDataCaches(awardsGameId, ["Categories", "CategorySettings", "CategoryResults"]);\n  else if (typeof clearGameCaches === "function") clearGameCaches(awardsGameId);''',1)
# second occurs in per-game settle where awardsGameId should be in function scope; verify name from context yes likely payload-derived.
t=t.replace('if (typeof clearAppCaches === "function") clearAppCaches();','''if (typeof clearGameDataCaches === "function") clearGameDataCaches(awardsGameId, ["CategorySettings", "CategoryResults"]);\n  else if (typeof clearGameCaches === "function") clearGameCaches(awardsGameId);''',1)
write(rel,t)

# Sports player props: targeted four occurrences (create prop, create matchup, settle matchup, settle prop)
rel='backend/engines/SportsPlayerPropEngine.js'; t=read(rel)
# first two have awardsGameId directly
for _ in range(2):
    t=t.replace('if (typeof clearAppCaches === "function") clearAppCaches();','''if (typeof clearGameDataCaches === "function") clearGameDataCaches(awardsGameId, ["Categories", "CategorySettings", "CategoryResults"]);\n  else if (typeof clearGameCaches === "function") clearGameCaches(awardsGameId);''',1)
# settlement functions: need identify local variable. inspect function names and likely awardsGameId param. We'll use payload gameId variable if present. Leave two broad for all-game jobs to ensure cross-game correctness but batch once is okay.
write(rel,t)

# Betting: move expensive validation before lock acquisition. Acquire only before bankroll/read/write section.
rel='backend/engines/BettingEngine.js'; t=read(rel)
old='''function saveBet(payload){\n\n  let lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());\n  let lockAcquired = false;\n\n  const gotLock =\n    lock.tryLock(5000);\n\n  lockAcquired = gotLock;\n\n  if (!gotLock) {\n    return {\n      success: false,\n      message: "Could not save wager: another save is still running. Please try again."\n    };\n  }\n\n  try {\n'''
new='''function saveBet(payload){\n\n  let lock = null;\n  let lockAcquired = false;\n\n  try {\n'''
t=replace_once(t,old,new,'bet defer lock')
anchor='''    const currentSummary = getUserBettingSummary(\n      username,\n      gameId\n    );\n'''
new='''    // All static validation is complete. Only serialize the bankroll check and\n    // actual Bets row mutation; do not hold a shared lock while loading game\n    // config, questions, settings, or odds.\n    lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());\n    const gotLock = lock.tryLock(2500);\n    lockAcquired = gotLock;\n    if (!gotLock) {\n      return {\n        success: false,\n        message: "Could not save wager: another write is finishing. Please try once more."\n      };\n    }\n\n    const currentSummary = getUserBettingSummary(\n      username,\n      gameId\n    );\n'''
t=replace_once(t,anchor,new,'bet narrow lock acquire')
write(rel,t)

# Picks: cap interactive waits below 5 seconds; background no longer owns this domain.
rel='backend/engines/PicksEngine.js'; t=read(rel)
t=t.replace('lock.waitLock(10000);\n    lockAcquired = true;', 'lock.waitLock(3500);\n    lockAcquired = true;',1)
t=t.replace('lock.waitLock(5000);\n    lockAcquired = true;', 'lock.waitLock(3000);\n    lockAcquired = true;',1)
write(rel,t)



# Preserve legacy targeted Picks cache contract while avoiding whole-app invalidation.
rel='backend/services/AppCache.js'; text=read(rel)
old="""  gameId = String(gameId || \"\").trim();
  username = String(username || \"\").trim();

  if (gameId) {
    clearPlayerActionCaches(
      gameId,
      [typeof PICKS_SHEET !== \"undefined\" ? PICKS_SHEET : \"Picks\"],
      username
    );
    return;
  }
"""
new="""  const cache = CacheService.getScriptCache();
  cache.remove(\"sheet_Picks\");

  gameId = String(gameId || \"\").trim();
  username = String(username || \"\").trim();

  if (gameId) {
    if (username && typeof realityTvSlug_ === \"function\") {
      cache.remove(\"rtv_player_stats_\" + realityTvSlug_(gameId) + \"_\" + realityTvSlug_(username));
    }
    clearPlayerActionCaches(gameId, [], \"\");
    return;
  }
"""
text=replace_once(text,old,new,'legacy Picks cache compatibility')
write(rel,text)

# Cap remaining interactive/admin lock waits so no UI action waits 10-30 seconds.
rel='backend/admin/AdminCategories.js'; text=read(rel)
for old_wait in ['lock.waitLock(10000);','lock.waitLock(15000);','lock.waitLock(20000);','lock.waitLock(\n    10000\n  );','lock.waitLock(\n    15000\n  );','lock.waitLock(\n    20000\n  );']:
    text=text.replace(old_wait, old_wait.replace('10000','4000').replace('15000','4000').replace('20000','4000'))
write(rel,text)
for rel in ['backend/engines/SettingsEngine.js','backend/engines/VotingEngine.js']:
    text=read(rel).replace('lock.waitLock(10000);','lock.waitLock(4000);')
    write(rel,text)
rel='backend/engines/AppearanceEngine.js'; text=read(rel).replace('lock.tryLock(10000)','lock.tryLock(4000)'); write(rel,text)
rel='backend/engines/SportsConfidenceBuilderEngine.js'; text=read(rel).replace('lock.waitLock(20000);','lock.waitLock(5000);'); write(rel,text)
rel='backend/engines/SportsWagerEngine.js'; text=read(rel)
if text.count('lock.tryLock(30000);') != 1:
    raise SystemExit('STOP: expected exactly one remaining Sports Wager 30s interactive lock')
text=text.replace('lock.tryLock(30000);','lock.tryLock(5000);',1)
write(rel,text)

print('Global performance / lock contention v1.2.18x1b applied.')
