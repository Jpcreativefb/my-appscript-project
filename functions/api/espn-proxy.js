const ALLOWED_HOST = "site.api.espn.com";
const ALLOWED_PATH_PREFIX = "/apis/site/v2/sports/";
const CDN_HOST = "cdn.espn.com";

const LIVE_CDN_LEAGUES = Object.freeze({
  nfl: "nfl",
  mlb: "mlb"
});

function json(data, status = 200, extraHeaders = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders
  };
  return new Response(JSON.stringify(data), { status, headers });
}

function upstreamHeaders() {
  return {
    "accept": "application/json,text/plain,*/*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "referer": "https://www.espn.com/",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
  };
}

function liveCdnFallbackUrl(target) {
  // Only substitute a CDN scoreboard for a date-scoped live-score request.
  // Season builders/team schedules must fail loudly rather than silently receive
  // a current-day scoreboard that does not match their requested range.
  if (!target.searchParams.get("dates")) return "";

  const match = target.pathname.match(
    /^\/apis\/site\/v2\/sports\/([^/]+)\/([^/]+)\/scoreboard\/?$/i
  );
  if (!match) return "";

  const league = String(match[2] || "").toLowerCase();
  const cdnLeague = LIVE_CDN_LEAGUES[league];
  if (!cdnLeague) return "";

  return `https://${CDN_HOST}/core/${encodeURIComponent(cdnLeague)}/scoreboard?xhr=1&limit=50`;
}

async function fetchUpstream(url) {
  return fetch(url, {
    method: "GET",
    headers: upstreamHeaders(),
    redirect: "follow"
  });
}

async function responseFromUpstream(upstream, source, fallbackFromStatus) {
  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-awards-sports-proxy", "cloudflare-pages");
  headers.set("x-awards-sports-source", source);
  headers.set("x-upstream-status", String(upstream.status));
  if (fallbackFromStatus) {
    headers.set("x-awards-sports-fallback-from-status", String(fallbackFromStatus));
  }

  return new Response(body, {
    status: upstream.status,
    headers
  });
}

export async function onRequestGet(context) {
  const requiredToken = String(context.env && context.env.SPORTS_PROXY_TOKEN || "").trim();
  if (!requiredToken) {
    return json({ success: false, error: "Sports proxy secret is not configured." }, 503);
  }

  const suppliedToken = String(context.request.headers.get("x-awards-sports-token") || "").trim();
  if (!suppliedToken || suppliedToken !== requiredToken) {
    return json({ success: false, error: "Unauthorized." }, 401);
  }

  const incoming = new URL(context.request.url);
  const targetRaw = incoming.searchParams.get("url") || "";

  let target;
  try {
    target = new URL(targetRaw);
  } catch (error) {
    return json({ success: false, error: "Missing or invalid ESPN URL." }, 400);
  }

  if (
    target.protocol !== "https:" ||
    target.hostname !== ALLOWED_HOST ||
    !target.pathname.startsWith(ALLOWED_PATH_PREFIX)
  ) {
    return json({ success: false, error: "ESPN target is not allowed." }, 403);
  }

  const primary = await fetchUpstream(target.toString());
  if (primary.status !== 403) {
    return responseFromUpstream(primary, ALLOWED_HOST, 0);
  }

  const cdnUrl = liveCdnFallbackUrl(target);
  if (!cdnUrl) {
    return responseFromUpstream(primary, ALLOWED_HOST, 0);
  }

  const fallback = await fetchUpstream(cdnUrl);
  return responseFromUpstream(fallback, CDN_HOST, primary.status);
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "allow": "GET, OPTIONS",
      "cache-control": "no-store"
    }
  });
}
