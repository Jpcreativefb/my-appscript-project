# PATTC Predicts v1.2.18o — Team Fantasy Sports Proxy Routing

Controlled release of the Team Fantasy historical/live NFL transport fix.

## Runtime changes
- Adds `/api/team-fantasy` to Cloudflare Pages routing while preserving `/api/espn-proxy`.
- Adds `getTeamFantasyNflSchedule` and `getTeamFantasyNflSummary` to the separate Sports Scores Engine.
- Those actions reuse the Sports Scores Engine's existing authenticated `sportsEspnFetch_()` Cloudflare ESPN proxy transport.
- Team Fantasy no longer calls ESPN directly from Apps Script for schedule/summary data.
- Historical NFL weeks, including prior seasons, use the same Sports Scores Engine path.
- No ESPN proxy token is copied into PATTC Predicts.
- No Team Fantasy picks, leagues, scoring rules, settings, or triggers are cleared or rewritten.

## Release-control safeguards
- Package is extracted to `/tmp`, not over the repository.
- Local Git must be clean and must exactly match `origin/architecture-cleanup` before patching.
- Only three runtime files are patched.
- Existing Team Fantasy, Notifications, and Reality regression tests are run when present.
- Full production checks must pass before commit/deployment.
- The configured Sports Scores Engine deployment ID is verified against the separate Sports Scores Engine Apps Script project's actual deployment list.
- Deployment order is Sports Scores Engine first, PATTC Predicts Apps Script second, GitHub/Cloudflare last.
