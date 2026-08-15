# Sports ESPN Cloudflare Proxy Hotfix v1.2.16

## Root cause
On 2026-08-15 ESPN began returning HTTP 403 Access Denied to Google Apps Script `UrlFetchApp` requests for `site.api.espn.com`, including small date-scoped scoreboard requests. The same URL returns HTTP 200 with current scores from a normal Mac/Cloudflare network path.

## Fix
- Adds a Cloudflare Pages Function at `/api/espn-proxy`.
- The function is not an open proxy: it requires the encrypted Cloudflare secret `SPORTS_PROXY_TOKEN`, verifies the `x-awards-sports-token` header, and accepts HTTPS targets only for `site.api.espn.com` under `/apis/site/v2/sports/`.
- Adds Sports Engine Script Properties `SPORTS_ESPN_PROXY_URL` and `SPORTS_ESPN_PROXY_TOKEN`. The token is never returned by the status helper.
- Scoreboard, player/roster, and advanced-stat ESPN fetch paths use the shared proxy transport when configured.
- Direct ESPN remains the fallback if the Script Property is absent.
- Proxy responses use `Cache-Control: no-store` to avoid stale live-score responses.
- `frontend/_routes.json` limits Pages Function invocation to `/api/espn-proxy`, so normal static app traffic does not consume the Functions quota.

## Deployment order
1. Install package and run production checks.
2. Commit/push GitHub so Cloudflare Pages deploys `/api/espn-proxy`.
3. Generate a random token locally and add it to Cloudflare Pages as an **encrypted secret** named `SPORTS_PROXY_TOKEN`; this does not require KV, D1, R2, Workers AI, or any paid binding.
4. Test the Pages Function from Terminal using the production Pages/custom-domain origin and the private header.
5. In the Sports Scores Engine Apps Script project, set `SPORTS_ESPN_PROXY_URL` to `<origin>/api/espn-proxy` and set `SPORTS_ESPN_PROXY_TOKEN` to the same random token.
6. Push the separate Sports Scores Engine clasp project, create a new version, and update the existing Sports deployment.
7. Run `runSportsScoresUpdate` and confirm current scores with no 403 errors.
