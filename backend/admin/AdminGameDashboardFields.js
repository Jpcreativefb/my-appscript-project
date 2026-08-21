/* =========================
   ADMIN GAME DASHBOARD FIELDS
   Adds optional Games sheet columns used by the dashboard hub.
========================= */

const GAME_DASHBOARD_FIELD_HEADERS = [
  "Description",
  "LockLabel",
  "AvailableFrom",
  "AvailableUntil",
  "HeroImageFileID",
  "HeroImagePosition",
  "PlayerProfileScope",
  "PlayerProfileGroupKey",
  "PlayerProfileGroupLabel"
];

function setupGameDashboardColumns() {

  const sh =
    getGamesSheet_();

  const lastColumn =
    Math.max(
      sh.getLastColumn(),
      1
    );

  const headers =
    sh.getRange(
      1,
      1,
      1,
      lastColumn
    )
      .getValues()[0]
      .map(h =>
        String(h || "").trim()
      );

  const missing =
    GAME_DASHBOARD_FIELD_HEADERS
      .filter(header =>
        headers.indexOf(header) === -1
      );

  if (!missing.length) {

    return {
      success: true,
      message: "Games dashboard columns already exist.",
      added: []
    };

  }

  sh.getRange(
    1,
    headers.length + 1,
    1,
    missing.length
  ).setValues([
    missing
  ]);

  SpreadsheetApp.flush();

  if (
    typeof clearGamesCache ===
    "function"
  ) {
    clearGamesCache();
  }

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "Games dashboard columns added.",
    added: missing
  };

}
