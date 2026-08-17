# v1.2.17f — Appearance Setup Transport / Reliability Hotfix

Fixes Appearance Manager startup errors where the upload proxy surfaced `Server returned an invalid response` and Google Sheets could time out while creating several new Appearance sheets in one request.

Changes:
- setup initialization uses the existing direct Apps Script JSONP/GET transport instead of the upload proxy;
- creates at most one missing Appearance sheet per setup request;
- Appearance Manager loops the small setup steps and re-checks readiness;
- AppearanceEngine retries initial spreadsheet access and reuses one spreadsheet handle for dashboard/runtime reads;
- adds long client timeout coverage for Appearance dashboard/setup;
- bumps the service-worker cache so the new API helper is loaded immediately.
