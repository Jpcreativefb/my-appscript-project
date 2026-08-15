# Sports ESPN CDN Fallback Hotfix v1.2.16

## Problem

On August 15, 2026, `site.api.espn.com` returned HTTP 403 to both Google Apps Script and Cloudflare Pages outbound requests, while the same request from a residential Mac connection returned HTTP 200 with current live NFL data.

## Fix

The existing authenticated Cloudflare Pages Function remains the only public proxy surface. It still accepts only `https://site.api.espn.com/apis/site/v2/sports/...` targets and still requires `SPORTS_PROXY_TOKEN`.

For date-scoped NFL and MLB scoreboard requests only:

1. Try the normal `site.api.espn.com` request.
2. If ESPN returns HTTP 403, retry using ESPN's real-time CDN scoreboard endpoint:
   - `https://cdn.espn.com/core/nfl/scoreboard?xhr=1&limit=50`
   - `https://cdn.espn.com/core/mlb/scoreboard?xhr=1&limit=50`
3. Return the CDN payload to the Sports Scores Engine.
4. The Sports Scores Engine now recognizes `content.sbData.events` from the CDN payload.

The fallback is deliberately not used for season-wide builders or team schedules, because a current live scoreboard is not a safe substitute for a historical/season request.

## Security and cost

- No new vendor or account.
- No open proxy: incoming host/path restrictions remain in place.
- CDN fallback URLs are hard-coded and cannot be supplied by callers.
- Private token remains required.
- No KV, D1, R2, cron, database, or paid sports API.

## Validation

Run `./tools/run_production_checks.sh` from the repository root.
