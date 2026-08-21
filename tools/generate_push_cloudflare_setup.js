#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function b64urlToBuffer(value) {
  const input = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

const home = process.env.HOME || process.cwd();
const updatesDir = path.join(home, "Awards-App-Updates");
const outPath = path.join(updatesDir, "v1.2.18f-cloudflare-push-values.txt");

fs.mkdirSync(updatesDir, { recursive: true });

if (fs.existsSync(outPath)) {
  console.log("Existing Cloudflare push values preserved:");
  console.log(outPath);
  console.log("");
  console.log(fs.readFileSync(outPath, "utf8"));
  process.exit(0);
}

const { privateKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "prime256v1"
});

const jwk = privateKey.export({ format: "jwk" });
const publicPoint = Buffer.concat([
  Buffer.from([0x04]),
  b64urlToBuffer(jwk.x),
  b64urlToBuffer(jwk.y)
]);

const publicKey = publicPoint.toString("base64url");
const privateJwk = JSON.stringify({
  kty: "EC",
  crv: "P-256",
  x: jwk.x,
  y: jwk.y,
  d: jwk.d,
  ext: true
});
const gatewayToken = crypto.randomBytes(32).toString("base64url");

const text = [
  "AWARDS APP v1.2.18f — CLOUDFLARE PUSH VALUES",
  "KEEP THIS FILE PRIVATE. DO NOT COMMIT IT TO GITHUB.",
  "",
  "VAPID_PUBLIC_KEY=" + publicKey,
  "VAPID_PRIVATE_JWK=" + privateJwk,
  "PUSH_GATEWAY_TOKEN=" + gatewayToken,
  "VAPID_SUBJECT=mailto:YOUR_EMAIL_ADDRESS_HERE",
  "",
  "Cloudflare Pages variables/secrets:",
  "- VAPID_PUBLIC_KEY      -> Plain text variable",
  "- VAPID_PRIVATE_JWK     -> Encrypt / Secret",
  "- PUSH_GATEWAY_TOKEN    -> Encrypt / Secret",
  "- VAPID_SUBJECT         -> Plain text variable; replace YOUR_EMAIL_ADDRESS_HERE with your real email",
  ""
].join("\n");

fs.writeFileSync(outPath, text, { mode: 0o600 });
try { fs.chmodSync(outPath, 0o600); } catch (err) {}

console.log(text);
console.log("Saved privately to:");
console.log(outPath);
