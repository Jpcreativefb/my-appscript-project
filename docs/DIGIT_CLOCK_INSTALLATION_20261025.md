# Digit Clock installation — October 25, 2026

Prepared from the verified production source `67b9bd1` on an isolated `codex/digit-clock-install` branch. Cloudflare production baseline: `753adb1c-feda-4e34-bcd5-0d3e7cbfb8e8`, project `pattc-predicts`, production branch `architecture-cleanup`.

Adds the reviewed multi-sport Digit Clock feature, player Sports-hub entry, Admin → Sports Operations → Digit Clock, and Sports workspace link. Adds `/api/digit-clock` to the Pages route allowlist, precaches the feature shell, bypasses service-worker caching for its score feed, and changes the app/login release cache markers. Existing production source files are retained except these narrow integration edits. No Apps Script deployment, production spreadsheet mutation, or existing game-data migration is required.

Validation: 193 JavaScript files, 344 regression scripts, and all 14 production gates passed. The focused installation test additionally covers the route allowlist, navigation, shell assets, release markers, and score-feed cache bypass. The Digit Clock browser suite covers the game/league/week workflow, scoring overrides, same event across leagues, mixed sports, MLB outs, NBA fractional clocks, NHL shootouts, backups and stale-feed handling.

League storage remains per browser and per origin. Local-preview leagues must be exported as JSON and imported on the production origin; installing the page cannot read localhost storage. These are local setup controls, not a new authenticated commissioner backend. Point estimates remain illustrative model outputs. See `DIGIT_CLOCK.md` for all scoring and data limitations.

Deploy to a preview branch first and smoke-test the hosted page plus live NFL/NBA/MLB/NHL endpoint responses. Publish the same tested source to `pattc-predicts` production only after those checks. Previous Cloudflare deployment is the rollback checkpoint. The shared production Git branch also feeds the legacy my-appscript-project Pages project; verify its alias after the production merge.
