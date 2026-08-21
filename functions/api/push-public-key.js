export async function onRequestGet(context) {
  const publicKey = String(context.env.VAPID_PUBLIC_KEY || "").trim();

  if (!publicKey) {
    return new Response(JSON.stringify({
      success: false,
      configured: false,
      message: "Cloudflare VAPID_PUBLIC_KEY is not configured yet."
    }), {
      status: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    configured: true,
    publicKey
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
