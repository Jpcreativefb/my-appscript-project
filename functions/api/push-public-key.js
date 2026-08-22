function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function base64UrlBytes(value) {
  const text = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = text + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesBase64Url(bytes) {
  let binary = "";
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function publicKeyFromPrivateJwk(privateJwk) {
  if (!privateJwk || privateJwk.kty !== "EC" || privateJwk.crv !== "P-256" || !privateJwk.x || !privateJwk.y || !privateJwk.d) {
    throw new Error("VAPID_PRIVATE_JWK must be a P-256 private JWK containing x, y, and d.");
  }
  const x = base64UrlBytes(privateJwk.x);
  const y = base64UrlBytes(privateJwk.y);
  if (x.length !== 32 || y.length !== 32) {
    throw new Error("VAPID_PRIVATE_JWK has invalid P-256 coordinates.");
  }
  const point = new Uint8Array(65);
  point[0] = 4;
  point.set(x, 1);
  point.set(y, 33);
  return bytesBase64Url(point);
}

export async function onRequestGet(context) {
  const configuredPublicKey = String(context.env.VAPID_PUBLIC_KEY || "").trim();
  const privateJwkText = String(context.env.VAPID_PRIVATE_JWK || "").trim();

  if (privateJwkText) {
    try {
      const privateJwk = JSON.parse(privateJwkText);
      const derivedPublicKey = publicKeyFromPrivateJwk(privateJwk);
      return jsonResponse({
        success: true,
        configured: true,
        publicKey: derivedPublicKey,
        source: "private-jwk",
        configuredPublicKeyMatches: !configuredPublicKey || configuredPublicKey === derivedPublicKey
      });
    } catch (err) {
      return jsonResponse({
        success: false,
        configured: false,
        message: String(err && err.message ? err.message : err)
      }, 503);
    }
  }

  if (!configuredPublicKey) {
    return jsonResponse({
      success: false,
      configured: false,
      message: "Cloudflare VAPID_PRIVATE_JWK is not configured yet."
    }, 503);
  }

  // Backward-compatible fallback only. New subscriptions should normally use
  // the key derived from VAPID_PRIVATE_JWK so public/private drift is impossible.
  return jsonResponse({
    success: true,
    configured: true,
    publicKey: configuredPublicKey,
    source: "public-variable",
    configuredPublicKeyMatches: null
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
