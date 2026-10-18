/* PATTC Admin Specialized Manager Pages R3 — presentation ownership only. */

function adminSportsR3Breadcrumb_(tail) {
  return `<div class="admin-sub" style="margin-bottom:10px"><button type="button" class="admin-small-button secondary" onclick="navigate('admin')">Admin</button> → Games &amp; Design → Sports${tail ? ' → ' + tail : ''}</div>`;
}

function adminSportsR3SafeBottom_() {
  return '<div aria-hidden="true" style="height:calc(88px + env(safe-area-inset-bottom, 0px))"></div>';
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
      ${adminSportsR3SafeBottom_()}
    </div>`;
}

async function renderAdminNflSeasonSetupPage() {
  const card = typeof nflSeasonPackAdminCardR3_ === "function" ? nflSeasonPackAdminCardR3_() : "";
  return `
    <div class="page admin-page" data-admin-specialized-manager-r3="nfl-season-setup">
      ${adminSportsR3Breadcrumb_("NFL → 2026 → League / Season Data → Season / Sports Setup")}
      <div class="admin-page-header"><div><h1>NFL Season / Sports Setup</h1><div class="admin-sub">Shared NFL season setup used by multiple games. The existing NFL Sports Pack implementation remains authoritative; this page only makes its ownership and related tools easier to understand.</div></div></div>
      <div class="card admin-card" data-admin-season-setup-guide-r2="1">
        <h2>Shared NFL Season Setup</h2>
        <div class="admin-sub">Use this workspace for the common NFL season foundation: teams, schedule, scores, standings, odds and season timing. Game-specific rules stay in their dedicated managers.</div>
        <div class="admin-list" style="margin-top:12px">
          <div class="admin-list-row"><div><strong>Teams · Schedule · Scores · Standings · Odds</strong><div class="admin-sub">Use the existing Sports Scores &amp; Game Builder for shared league and season data.</div></div><button type="button" class="admin-small-button" onclick="window.location.href='./sports.html'">Open Sports Data</button></div>
          <div class="admin-list-row"><div><strong>Season Timing</strong><div class="admin-sub">Use the existing NFL Sports Pack controls below for shared season timing and pack setup.</div></div></div>
          <div class="admin-list-row"><div><strong>Game-specific managers</strong><div class="admin-sub">Confidence, Survivor, Team Fantasy Football and Playoff Race keep their own authoritative configuration surfaces.</div></div><button type="button" class="admin-small-button secondary" onclick="navigate('admin')">Games &amp; Design</button></div>
          <div class="admin-list-row"><div><strong>Cup administration</strong><div class="admin-sub">NFL Cup remains a separate competition manager and is not configured here.</div></div><button type="button" class="admin-small-button secondary" onclick="navigate('admin-nfl-cup')">NFL Cup</button></div>
        </div>
        <div class="admin-sub" style="margin-top:12px"><strong>This page is not:</strong> NFL Cup, Manage Existing Games, Sports Engine Controls, or a new scoring engine.</div>
      </div>
      ${card || '<div class="card admin-card">NFL Sports Pack controls are unavailable.</div>'}
      ${adminSportsR3SafeBottom_()}
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
      <div class="admin-page-header"><div><h1>Playoff Race</h1><div class="admin-sub">Timing and configuration for the existing NFL Playoff Race. Gameplay and scoring remain unchanged; unrelated NFL controls stay on their own Admin surfaces.</div></div></div>
      ${card || '<div class="card admin-card">Playoff Race timing controls are unavailable.</div>'}
      ${adminSportsR3SafeBottom_()}
    </div>`;
}

async function renderAdminSportsEnginePage() {
  window.setTimeout(function() {
    if (typeof adminOpenSportsControls === "function") adminOpenSportsControls();
  }, 0);
  return `
    <div class="page admin-page" data-admin-specialized-manager-r3="sports-engine">
      ${adminSportsR3Breadcrumb_("Operations → Sports Engine Controls")}
      <div class="admin-page-header"><div><h1>Sports Engine Controls</h1><div class="admin-sub">Existing Sports Engine controls and APIs on a dedicated Admin surface.</div></div></div>
      <div id="adminSportsControlMessage" class="admin-message"></div>
      <div id="adminSportsControlPanel" class="admin-list"></div>
      ${adminSportsR3SafeBottom_()}
    </div>`;
}