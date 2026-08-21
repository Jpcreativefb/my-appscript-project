import { buildPushHTTPRequest } from "@pushforge/builder";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function bearerToken(request) {
  const header = String(request.headers.get("Authorization") || "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? String(match[1] || "").trim() : "";
}

function cleanNotification(input) {
  const data = input && typeof input === "object" ? input : {};
  const nestedData = data.data && typeof data.data === "object" ? data.data : {};

  return {
    title: String(data.title || "Awards App").trim().slice(0, 120),
    body: String(data.body || data.message || "").trim().slice(0, 500),
    icon: String(data.icon || "/icons/icon-192.png").trim().slice(0, 400),
    badge: String(data.badge || "/icons/icon-192.png").trim().slice(0, 400),
    tag: String(data.tag || "awards-app-notification").trim().slice(0, 120),
    renotify: data.renotify === true,
    requireInteraction: data.requireInteraction === true,
    data: {
      url: String(nestedData.url || "./app.html#notifications").trim().slice(0, 500),
      route: String(nestedData.route || "notifications").trim().slice(0, 80),
      gameId: String(nestedData.gameId || "").trim().slice(0, 160),
      type: String(nestedData.type || "custom").trim().slice(0, 80)
    }
  };
}

async function sendOne(item, privateJWK, adminContact, notification) {
  const subscriptionId = String(item && item.subscriptionId || "").trim();
  const subscription = item && item.subscription && typeof item.subscription === "object"
    ? item.subscription
    : {};

  try {
    const request = await buildPushHTTPRequest({
      privateJWK,
      subscription,
      message: {
        payload: notification,
        adminContact,
        options: {
          ttl: 3600,
          urgency: "normal"
        }
      }
    });

    const response = await fetch(request.endpoint, {
      method: "POST",
      headers: request.headers,
      body: request.body
    });

    const ok = response.status >= 200 && response.status < 300;
    let error = "";
    if (!ok) {
      try {
        error = String(await response.text()).slice(0, 300);
      } catch (err) {
        error = "Push service returned HTTP " + response.status;
      }
    }

    return {
      subscriptionId,
      ok,
      statusCode: response.status,
      expired: response.status === 404 || response.status === 410,
      error
    };
  } catch (err) {
    return {
      subscriptionId,
      ok: false,
      statusCode: 0,
      expired: false,
      error: String(err && err.message ? err.message : err).slice(0, 300)
    };
  }
}

export async function onRequestPost(context) {
  const expectedToken = String(context.env.PUSH_GATEWAY_TOKEN || "").trim();
  const providedToken = bearerToken(context.request);

  if (!expectedToken) {
    return jsonResponse({
      success: false,
      message: "Cloudflare PUSH_GATEWAY_TOKEN is not configured."
    }, 503);
  }

  if (!providedToken || providedToken !== expectedToken) {
    return jsonResponse({ success: false, message: "Unauthorized push gateway request." }, 401);
  }

  const publicKey = String(context.env.VAPID_PUBLIC_KEY || "").trim();
  const privateJwkText = String(context.env.VAPID_PRIVATE_JWK || "").trim();
  const adminContact = String(context.env.VAPID_SUBJECT || "").trim();

  if (!publicKey || !privateJwkText || !adminContact) {
    return jsonResponse({
      success: false,
      message: "Cloudflare VAPID settings are incomplete."
    }, 503);
  }

  let privateJWK;
  try {
    privateJWK = JSON.parse(privateJwkText);
  } catch (err) {
    return jsonResponse({ success: false, message: "VAPID_PRIVATE_JWK is not valid JSON." }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return jsonResponse({ success: false, message: "Invalid JSON request." }, 400);
  }

  const subscriptions = Array.isArray(body && body.subscriptions)
    ? body.subscriptions.slice(0, 100)
    : [];

  if (!subscriptions.length) {
    return jsonResponse({ success: true, sent: 0, failed: 0, expired: 0, results: [] });
  }

  const notification = cleanNotification(body.notification);
  if (!notification.title || !notification.body) {
    return jsonResponse({ success: false, message: "Notification title and body are required." }, 400);
  }

  const results = await Promise.all(
    subscriptions.map(item => sendOne(item, privateJWK, adminContact, notification))
  );

  return jsonResponse({
    success: true,
    sent: results.filter(item => item.ok === true).length,
    failed: results.filter(item => item.ok !== true).length,
    expired: results.filter(item => item.expired === true).length,
    results
  });
}

export async function onRequestGet() {
  return jsonResponse({ success: true, service: "Awards App Push Gateway", method: "POST required" });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
