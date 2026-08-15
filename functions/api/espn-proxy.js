const ALLOWED_HOST = "site.api.espn.com";
const ALLOWED_PATH_PREFIX = "/apis/site/v2/sports/";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
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

  const upstream = await fetch(target.toString(), {
    method: "GET",
    headers: {
      "accept": "application/json,text/plain,*/*",
      "user-agent": "AwardsApp-SportsEngine/1.0"
    },
    redirect: "follow"
  });

  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-awards-sports-proxy", "cloudflare-pages");
  headers.set("x-upstream-status", String(upstream.status));

  return new Response(body, {
    status: upstream.status,
    headers
  });
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
