const APPS_SCRIPT_API_URL =
  "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

const SURVIVOR_R3_PREVIEW_API_URL =
  "https://script.google.com/macros/s/AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0/exec";

const SURVIVOR_R3_PREVIEW_READ_ACTIONS = new Set([
  "getSurvivorState",
  "getSurvivorTeamSchedule",
  "adminBuildNflSeasonPack",
  "adminGetNflPlayoffRaceSettings",
  "adminSaveNflPlayoffRaceSettings",
  "getNflPlayoffRaceState",
  "saveNflPlayoffRaceRanking",
  "adminPrepareNflCupFuturesR1"
]);

const SURVIVOR_R3_PREVIEW_BLOCKED_WRITE_ACTIONS = new Set([
  "saveSurvivorPick",
  "saveSportsSurvivorAutoPickPreference"
]);

// Fail closed: this feature can change the shared production Google Sheet.
// The Pages canonical production hostname is the only default allowlisted host.
// A custom production hostname must be explicitly set as PATTC_PRODUCTION_HOSTNAME
// in the Pages environment (never set that variable for Preview).
function pattcCupProductionRequest_(context) {
  let host = "";
  try { host = new URL(context.request.url).hostname.toLowerCase(); } catch (_) { return false; }
  const configured = String(context.env && context.env.PATTC_PRODUCTION_HOSTNAME || "").trim().toLowerCase();
  return host === "my-appscript-project.pages.dev" || !!(configured && host === configured);
}

const MAX_BODY_BYTES = 6 * 1024 * 1024;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export async function onRequestPost(context) {
  let raw = "";
  try {
    raw = await context.request.text();
  } catch (err) {
    return jsonResponse({ success: false, message: "Could not read request." }, 400);
  }

  if (!raw) {
    return jsonResponse({ success: false, message: "Request body is empty." }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return jsonResponse({ success: false, message: "Request body is too large." }, 413);
  }

  let body = null;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return jsonResponse({ success: false, message: "Request is not valid JSON." }, 400);
  }

  const action = String(body && body.action || "").trim();
  if (!action || !/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(action)) {
    return jsonResponse({ success: false, message: "Invalid API action." }, 400);
  }

  const productionRequest = pattcCupProductionRequest_(context);
  const gameId = String(body && body.gameId || "").trim();
  if (!productionRequest && new Set([
    "adminPrepareNflCupFuturesR1",
    "adminBuildNflSeasonPack",
    "adminSaveNflPlayoffRaceSettings",
    "saveNflPlayoffRaceRanking"
  ]).has(action)) {
    return jsonResponse({ success: false, previewOnly: true,
      message: "This setup or ranking write is disabled in Cloudflare Preview because its Google Sheet is shared with production. Use the canonical production app for launch setup." }, 200);
  }
  // Preview shares production Sheets: reject all Visual Studio draft/publish/version writes.
  if (!productionRequest && action === "adminSaveAppearanceOverride" &&
      /^visual-studio-(draft|published|version)$/i.test(String(body.entityType || ""))) {
    return jsonResponse({success:false,previewOnly:true,message:"Visual Studio writes are disabled on Preview."},403);
  }
  if (!productionRequest && gameId === "nfl-futures-2026" &&
      (action === "saveBet" || action === "removeBet")) {
    return jsonResponse({ success: false, previewOnly: true,
      message: "Futures preview is read-only. Futures wagers can be placed after the game is published in production." }, 200);
  }

  if (!productionRequest && SURVIVOR_R3_PREVIEW_BLOCKED_WRITE_ACTIONS.has(action)) {
    return jsonResponse({
      success: false,
      previewOnly: true,
      message: "Survivor R3 preview is review-only. Picks and Auto-Pick settings are not saved from this preview."
    }, 200);
  }

  // R1.1: Preview-only routes are host-scoped. Production always uses the production Apps Script deployment.
  const futuresActions = new Set(["getBettingPagePayload","getBettingOptions","getMyBets","saveBet","removeBet","bettingLeaderboard","leaderboard"]);
  const newFeaturePreview =
    (/^nfl-futures-2026$/.test(gameId) && futuresActions.has(action)) ||
    (/^nfl-cup-2026$/.test(gameId) && action === "leaderboard");
  const upstreamUrl = !productionRequest &&
    (SURVIVOR_R3_PREVIEW_READ_ACTIONS.has(action) || newFeaturePreview)
    ? SURVIVOR_R3_PREVIEW_API_URL
    : APPS_SCRIPT_API_URL;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Accept": "application/json"
      },
      body: raw,
      redirect: "follow"
    });

    const text = await upstream.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (err) {
      parsed = null;
    }

    if (!upstream.ok) {
      return jsonResponse({
        success: false,
        status: upstream.status,
        message: parsed && (parsed.message || parsed.error)
          ? String(parsed.message || parsed.error)
          : "Apps Script rejected the request."
      }, 502);
    }

    if (!parsed || typeof parsed !== "object") {
      return jsonResponse({
        success: false,
        message: "Apps Script returned an invalid response."
      }, 502);
    }

    return jsonResponse(parsed, 200);
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Could not reach the Awards App backend.",
      error: String(err && err.message ? err.message : err).slice(0, 240)
    }, 502);
  }
}

export async function onRequestGet(context) {
  return jsonResponse({
    success: true,
    studioProductionBridge: pattcCupProductionRequest_(context),
    apiUrl: APPS_SCRIPT_API_URL,
    service: "Awards App POST Bridge",
    method: "POST required"
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Allow": "POST, OPTIONS",
      "Cache-Control": "no-store"
    }
  });
}
