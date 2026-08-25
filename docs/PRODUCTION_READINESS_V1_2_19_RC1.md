# v1.2.19-rc1 Production Readiness

This candidate converts PATTC Predicts from feature-building mode into launch-hardening mode.

## Design decisions

- Preserve all current game engines.
- Do not perform a pre-launch giant-file/module rewrite.
- Make Admin task-oriented and lazy-load heavy controls.
- Treat GET as public/credential-free only; authenticated traffic uses POST.
- Own the generic Cloudflare bridge in the repository.
- Treat built-in game templates as configuration presets over existing engines.
- Give admins one place to see Apps Script trigger pressure and safe duplicates.
- Extend the production gate so these rules cannot silently regress.

## Follow-up after live certification

Once the release is stable in production, large files such as Admin and Sports Wager can be modularized incrementally behind tests. That work is intentionally excluded from the launch candidate because it creates more short-term regression risk than production benefit.
