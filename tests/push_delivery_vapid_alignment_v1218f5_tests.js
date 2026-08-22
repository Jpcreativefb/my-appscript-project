const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const publicKeyFn = read('functions/api/push-public-key.js');
const sendFn = read('functions/api/push-send.js');
const backend = read('backend/engines/NotificationsEngine.js');
const admin = read('frontend/js/pages/notifications.js');
const appJs = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const appHtml = read('frontend/app.html');
const indexHtml = read('frontend/index.html');

assert(publicKeyFn.includes('publicKeyFromPrivateJwk'), 'public key endpoint must derive the public key from the private JWK');
assert(publicKeyFn.includes('source: "private-jwk"'), 'private JWK must be the canonical public-key source');
assert(publicKeyFn.includes('configuredPublicKeyMatches'), 'public/private drift diagnostic missing');
assert(pwa.includes('awardsPushSubscriptionServerKey_'), 'browser subscription VAPID-key inspection missing');
assert(pwa.includes('awardsPushKeyMatches_'), 'browser subscription VAPID comparison missing');
assert(pwa.includes('await subscription.unsubscribe()'), 'mismatched subscription must be replaced');
assert(pwa.includes('Push security key changed — repair this device'), 'player-facing repair state missing');
assert(sendFn.includes('VAPID_SUBJECT must be a real mailto: email address or https:// URL.'), 'VAPID subject validation missing');
assert(backend.includes('failureDetails'), 'backend must return per-delivery failure details');
assert(backend.includes('failureSummary'), 'backend failure summary missing');
assert(admin.includes('Number(res.failed || 0) > 0'), 'Admin sender must render failed delivery as an error');
assert(sw.includes("awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts"), 'service-worker cache marker not bumped');
assert(appJs.includes("v1218f5-vapid-alignment"), 'route module cache marker not bumped');
assert.strictEqual(appJs, appMirror, 'frontend app mirrors must stay synchronized');
assert(appHtml.includes("v1218f5-vapid-alignment"), 'app shell cache query not bumped');
assert(indexHtml.includes("v1218f5-vapid-alignment"), 'login shell cache query not bumped');

(async () => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const expected = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url')
  ]).toString('base64url');

  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(publicKeyFn, 'utf8').toString('base64');
  const mod = await import(moduleUrl);
  const response = await mod.onRequestGet({
    env: {
      VAPID_PRIVATE_JWK: JSON.stringify({
        kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true
      }),
      VAPID_PUBLIC_KEY: 'deliberately-mismatched-public-key'
    }
  });
  const payload = await response.json();
  assert.strictEqual(payload.success, true);
  assert.strictEqual(payload.publicKey, expected, 'derived VAPID public key does not match private JWK');
  assert.strictEqual(payload.configuredPublicKeyMatches, false, 'mismatch diagnostic should be false');

  console.log('push-delivery-vapid-alignment-v1218f5-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
