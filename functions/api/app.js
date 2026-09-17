const APPS_SCRIPT_API_URL =
  "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

const SURVIVOR_R3_PREVIEW_API_URL =
  "https://script.google.com/macros/s/AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0/exec";

const SURVIVOR_R3_PREVIEW_READ_ACTIONS = new Set([
  "getSurvivorState",
  "getSurvivorTeamSchedule"
]);

const SURVIVOR_R3_PREVIEW_BLOCKED_WRITE_ACTIONS = new Set([
  "saveSurvivorPick",
  "saveSportsSurvivorAutoPickPreference"
]);

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

  if (SURVIVOR_R3_PREVIEW_BLOCKED_WRITE_ACTIONS.has(action)) {
    return jsonResponse({
      success: false,
      previewOnly: true,
      message: "Survivor R3 preview is review-only. Picks and Auto-Pick settings are not saved from this preview."
    }, 200);
  }

  const upstreamUrl = SURVIVOR_R3_PREVIEW_READ_ACTIONS.has(action)
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

export async function onRequestGet() {
  return jsonResponse({
    success: true,
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
