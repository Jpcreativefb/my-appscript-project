/* PATTC Admin Specialized Manager Pages R3 — presentation ownership only. */

function adminSportsR3Breadcrumb_(tail) {
  return `<div class="admin-sub" style="margin-bottom:10px"><button type="button" class="admin-small-button secondary" onclick="navigate('admin')">Admin</button> → Games &amp; Design → Sports${tail ? ' → ' + tail : ''}</div>`;
}

async function renderAdminNflCupPage() {
  const futures = typeof nflCupFuturesAdminCardR3_ === "function" ? nflCupFuturesAdminCardR3_() : "";
  const control = typeof pattcCupControlAdminCardR3_ === "function" ? await pattcCupControlAdminCardR3_() : "";
  return `
    <div class="page admin-page" data-admin-specialized-manager-r3="nfl-cup">
      ${adminSportsR3Breadcrumb_("NFL → 2026 → Cups / Combined Competitions → NFL Cup")}
      <div class="admin-page-header"><div><h1>NFL Cup</h1><div class="admin-sub">Cup preparation, Futures setup, participation, weighting, qualification and publication controls. Existing APIs and game records remain authoritative.</div></div></div>
      ${futures}
      ${control || '<div class="card admin-card">NFL Cup is not configured for this season.</div>'}
    </div>`;
}

async function renderAdminNflSeasonSetupPage() {
  const card = typeof nflSeasonPackAdminCardR3_ === "function" ? nflSeasonPackAdminCardR3_() : "";
  return `
    <div class="page admin-page" data-admin-specialized-manager-r3="nfl-season-setup">
      ${adminSportsR3Breadcrumb_("NFL → 2026 → Season / Sports Setup")}
      <div class="admin-page-header"><div><h1>NFL Season / Sports Setup</h1><div class="admin-sub">Build or repair the shared NFL season game pack. This is season setup, not Cup-only administration.</div></div></div>
      ${card || '<div class="card admin-card">NFL Sports Pack controls are unavailable.</div>'}
    </div>`;
}

async function renderAdminPlayoffRacePage() {
  const card = typeof nflPlayoffRaceTimingAdminCardR3_ === "function" ? nflPlayoffRaceTimingAdminCardR3_() : "";
  if (card && typeof nflPlayoffRaceAdminLoad_ === "function") {
    window.setTimeout(function() { nflPlayoffRaceAdminLoad_(); }, 0);
  }
  return `
    <div class="page admin-page" data-admin-specialized-manager-r3="playoff-race">
      ${adminSportsR3Breadcrumb_("NFL → 2026 → Playoff Race")}
      <div class="admin-page-header"><div><h1>Playoff Race</h1><div class="admin-sub">Operational timing for the existing NFL Playoff Race. Gameplay and scoring remain unchanged.</div></div></div>
      ${card || '<div class="card admin-card">Playoff Race timing controls are unavailable.</div>'}
    </div>`;
}

async function renderAdminSportsEnginePage() {
  window.setTimeout(function() {
    if (typeof adminOpenSportsControls === "function") adminOpenSportsControls();
  }, 0);
  return `
    <div class="page admin-page" data-admin-specialized-manager-r3="sports-engine">
      ${adminSportsR3Breadcrumb_("Sports Operations → Sports Engine Controls")}
      <div class="admin-page-header"><div><h1>Sports Engine Controls</h1><div class="admin-sub">Existing Sports Engine controls and APIs on a dedicated Admin surface.</div></div></div>
      <div id="adminSportsControlMessage" class="admin-message"></div>
      <div id="adminSportsControlPanel" class="admin-list"></div>
    </div>`;
}
