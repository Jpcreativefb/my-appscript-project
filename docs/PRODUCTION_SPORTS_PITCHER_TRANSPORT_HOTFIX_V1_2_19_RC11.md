# PATTC Predicts v1.2.19-rc11 — Sports Pitcher Transport Hotfix

Baseline: `b295053964ed6f7e779da50c3c6311df0f338ffb` (RC10).

This hotfix keeps the RC10 Sports Reliability work intact and makes two targeted corrections:

- MLB starting-pitcher summaries are requested through the Sports Scores Engine, which reuses the authenticated ESPN transport/proxy path. A rolling-deployment-only direct fallback remains when the new Sports Engine action is not yet deployed.
- The admin Sports UI now distinguishes a real upstream probable-pitcher TBD from a transport/HTTP failure instead of collapsing both to `TBD`.
- Smart Sports Sync confirmation wording now accurately says the work was queued for background processing rather than claiming an inline finished-game finalizer ran.
- Sports reliability regression coverage verifies proxy-aware summary routing, secret redaction, transport-vs-TBD status, and queued Smart Sync wording.

Deployment scope:

- Main Awards App Apps Script: required (`SportsLiveDisplayEngine.js`).
- Separate Sports Scores Engine Apps Script: required (`SportsScoresEngine.js`).
- Cloudflare Pages: required because frontend Sports/Admin files changed; normal GitHub auto-deploy is sufficient.
- No separate Sports Worker deployment is required.
