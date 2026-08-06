# Production Smoke Test — v1.1.10

1. Deploy the full frontend, including `frontend/js/pages/adminUi.js` and `frontend/js/pages/adminRealityTv.js`.
2. Hard-refresh the Cloudflare site so the updated JavaScript is loaded.
3. Open Admin → Reality TV Manager → MasterChef.
4. Select **Current Episode Build Status**.
   - Expected: the stages expand.
   - Expected: no **Starting…** progress row appears beneath the status header.
5. In the expanded panel, select the actual action:
   - **Resume Automatic Build** when an unfinished build exists, or
   - **Build / Repair Now** when questions need insertion.
6. Confirm the message changes to the saved build stage and progresses toward `READY`.
7. Refresh the manager and confirm the completed counts remain saved.
