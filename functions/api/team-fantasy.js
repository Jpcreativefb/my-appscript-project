const APPS_SCRIPT_API_URL =
  "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

const ALLOWED_ACTIONS = new Set([
  "saveTeamFantasyPick",
  "randomTeamFantasyPicks",
  "autoPickTeamFantasy",
  "adminSaveTeamFantasySettings",
  "adminSaveTeamFantasyRules",
  "adminCreateTeamFantasyLeague",
  "adminAssignTeamFantasyLeagueMember",
  "adminRunTeamFantasySync",
  "adminInstallTeamFantasySyncTrigger",
  "adminSendTeamFantasyReminder"
]);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestPost(context) {
  let raw = "";
  try {
    raw = await context.request.text();
  } catch (err) {
    return jsonResponse({ success: false, message: "Could not read Team Fantasy request." }, 400);
  }

  if (!raw || raw.length > 262144) {
    return jsonResponse({ success: false, message: "Team Fantasy request is empty or too large." }, 400);
  }

  let body = null;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return jsonResponse({ success: false, message: "Team Fantasy request is not valid JSON." }, 400);
  }

  const action = String(body && body.action || "").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return jsonResponse({ success: false, message: "Unsupported Team Fantasy action." }, 400);
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Accept": "application/json"
      },
      body: JSON.stringify(body),
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
          : "Apps Script rejected the Team Fantasy request."
      }, 502);
    }

    if (!parsed || typeof parsed !== "object") {
      return jsonResponse({
        success: false,
        message: "Apps Script returned an invalid Team Fantasy response."
      }, 502);
    }

    return jsonResponse(parsed, 200);
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Could not reach the Team Fantasy backend.",
      error: String(err && err.message ? err.message : err).slice(0, 240)
    }, 502);
  }
}

export async function onRequestGet() {
  return jsonResponse({
    success: true,
    service: "Awards App Team Fantasy Bridge",
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
