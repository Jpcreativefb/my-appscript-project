/* PATTC Shared Game Builder Navigation Shell R2
 * Presentation/navigation proof only. No game creation, scoring, schema, or backend writes.
 */
(function () {
  "use strict";

  const SHELL_SELECTOR = '[data-admin-games-design-r1="1"]';
  const MOUNTED_ATTR = "data-shared-game-builder-navigation-shell-r2";

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shellChoiceLabel_(choice) {
    const labels = {
      confidence: "Confidence",
      survivor: "Survivor",
      "team-fantasy": "Team Fantasy",
      "playoff-forecast": "Playoff / Forecast",
      other: "Other Game",
      series: "Series",
      tournaments: "Tournaments",
      teams: "Teams",
      schedule: "Schedule",
      scores: "Scores",
      standings: "Standings",
      odds: "Odds",
      "season-timing": "Season Timing"
    };
    return labels[String(choice || "")] || String(choice || "");
  }

  window.pattcAdminGameBuilderR2Select_ = function (choice, kind) {
    const shell = document.querySelector("[" + MOUNTED_ATTR + '="1"]');
    if (!shell) return;

    const label = shellChoiceLabel_(choice);
    const message = shell.querySelector("[data-admin-r2-selection-message]");
    if (message) {
      const prefix = kind === "competition"
        ? "Competition shell selected"
        : kind === "season-data"
          ? "League / Season Data shell selected"
          : "Game Builder shell selected";
      message.textContent = prefix + ": " + label + ". R2 proves placement and workflow only; implementation remains on the existing authoritative managers/APIs.";
    }

    shell.querySelectorAll("[data-admin-r2-shell-choice]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-admin-r2-shell-choice") === String(choice) ? "true" : "false");
    });
  };

  function builderChoice_(key, label, note) {
    return `
      <button type="button" class="button admin-button secondary"
        data-admin-r2-shell-choice="${escapeHtml_(key)}"
        aria-pressed="false"
        onclick="pattcAdminGameBuilderR2Select_('${escapeHtml_(key)}','builder')">
        ${escapeHtml_(label)}
      </button>
      ${note ? `<span class="admin-sub">${escapeHtml_(note)}</span>` : ""}
    `;
  }

  function seasonChoice_(key, label) {
    return `
      <button type="button" class="button admin-button secondary"
        data-admin-r2-shell-choice="${escapeHtml_(key)}"
        aria-pressed="false"
        onclick="pattcAdminGameBuilderR2Select_('${escapeHtml_(key)}','season-data')">
        ${escapeHtml_(label)}
      </button>
    `;
  }

  function shellHtml_() {
    return `
      <div ${MOUNTED_ATTR}="1" data-admin-sports-organization-r2="1">
        <style>
          [${MOUNTED_ATTR}="1"] .admin-r2-lifecycle-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
            gap:12px;
            margin-top:12px;
          }
          [${MOUNTED_ATTR}="1"] .admin-r2-destination {
            border:1px solid rgba(148,163,184,.32);
            border-radius:14px;
            padding:14px;
            min-width:0;
          }
          [${MOUNTED_ATTR}="1"] .admin-r2-destination h3 {
            margin:0 0 6px;
          }
          [${MOUNTED_ATTR}="1"] .admin-r2-choice-grid {
            display:flex;
            flex-wrap:wrap;
            gap:8px;
            margin-top:10px;
            align-items:center;
          }
          [${MOUNTED_ATTR}="1"] [data-admin-r2-shell-choice][aria-pressed="true"] {
            outline:2px solid currentColor;
            outline-offset:2px;
          }
          [${MOUNTED_ATTR}="1"] .admin-r2-rule {
            margin-top:12px;
            padding:10px 12px;
            border-radius:10px;
            background:rgba(148,163,184,.10);
          }
        </style>

        <div class="admin-sub"><strong>Admin → Games &amp; Design → Sports → NFL → 2026</strong></div>
        <div class="admin-sub">
          One lifecycle, five destinations. Builders create. Managers edit. Engines support.
          Scope defines context. Competitions combine existing games.
        </div>

        <div class="admin-r2-lifecycle-grid">
          <section class="admin-r2-destination" data-admin-r2-destination="game-builder">
            <h3>1. Game Builder</h3>
            <div class="admin-sub">Choose what you want to create. R2 is navigation/presentation only; no game is created from this shell.</div>
            <div class="admin-r2-choice-grid">
              ${builderChoice_("confidence", "Confidence")}
              ${builderChoice_("survivor", "Survivor")}
              ${builderChoice_("team-fantasy", "Team Fantasy", "Existing manager remains authoritative.")}
              ${builderChoice_("playoff-forecast", "Playoff / Forecast", "Existing Playoff Race timing remains dedicated.")}
              ${builderChoice_("other", "Other Game")}
            </div>
            <div class="admin-actions" style="margin-top:10px">
              <button type="button" class="button admin-button secondary" onclick="navigate('admin-team-fantasy')">Open Existing Team Fantasy Manager</button>
              <button type="button" class="button admin-button secondary" onclick="navigate('admin-playoff-race')">Open Existing Playoff Race Timing</button>
            </div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="manage-existing-games">
            <h3>2. Manage Existing Games</h3>
            <div class="admin-sub">Edit ordinary existing game records and game-specific settings. New Game stays available here until the R3 builder is accepted.</div>
            <div class="admin-actions">
              <button type="button" class="button admin-button" onclick="navigate('admin-games')">Manage Existing Games</button>
            </div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="competitions">
            <h3>3. Competitions</h3>
            <div class="admin-sub">Combine or organize existing authoritative Game IDs. Competitions do not duplicate the underlying games.</div>
            <div class="admin-actions">
              <button type="button" class="button admin-button" onclick="navigate('admin-nfl-cup')">Cups</button>
              <button type="button" class="button admin-button secondary"
                data-admin-r2-shell-choice="series" aria-pressed="false"
                onclick="pattcAdminGameBuilderR2Select_('series','competition')">Series</button>
              <button type="button" class="button admin-button secondary"
                data-admin-r2-shell-choice="tournaments" aria-pressed="false"
                onclick="pattcAdminGameBuilderR2Select_('tournaments','competition')">Tournaments</button>
            </div>
            <div class="admin-sub">NFL Cup keeps its dedicated page. Series and Tournaments are visual destinations only in R2.</div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="league-season-data">
            <h3>4. League / Season Data</h3>
            <div class="admin-sub">Shared NFL season context used by games and competitions. Existing Sports data tooling remains authoritative.</div>
            <div class="admin-r2-choice-grid">
              ${seasonChoice_("teams", "Teams")}
              ${seasonChoice_("schedule", "Schedule")}
              ${seasonChoice_("scores", "Scores")}
              ${seasonChoice_("standings", "Standings")}
              ${seasonChoice_("odds", "Odds")}
              ${seasonChoice_("season-timing", "Season Timing")}
            </div>
            <div class="admin-actions" style="margin-top:10px">
              <button type="button" class="button admin-button secondary" onclick="window.location.href='./sports.html'">Open Sports Scores &amp; Game Builder</button>
              <button type="button" class="button admin-button secondary" onclick="navigate('admin-nfl-season-setup')">Open Existing NFL Sports Pack Setup</button>
            </div>
          </section>

          <section class="admin-r2-destination" data-admin-r2-destination="operations">
            <h3>5. Operations</h3>
            <div class="admin-sub">Operate the shared Sports Engine. Engine controls stay separate from ordinary Manage Games.</div>
            <div class="admin-actions">
              <button type="button" class="button admin-button" onclick="navigate('admin-sports-engine')">Sports Engine Controls</button>
            </div>
          </section>
        </div>

        <div class="admin-message" data-admin-r2-selection-message>
          Select a Game Builder, Competition, or League / Season Data destination to review the R2 workflow. No creation action runs from this shell.
        </div>

        <div class="admin-r2-rule admin-sub">
          <strong>Preserved R3 boundaries:</strong>
          NFL Cup stays dedicated; NFL Sports Pack stays outside ordinary Manage Games; Playoff Race timing stays dedicated;
          Sports Engine Controls stays dedicated; Team Fantasy keeps its manager.
        </div>

        <div class="admin-list" style="margin-top:12px">
          <div class="admin-list-row"><div><strong>Reality</strong><div class="admin-sub">Show/season managers such as The Traitors and DWTS remain in the existing Reality TV Manager.</div></div></div>
          <div class="admin-list-row"><div><strong>Awards</strong><div class="admin-sub">Ceremonies such as Oscars and Emmys remain in the existing Awards Manager.</div></div></div>
        </div>
      </div>
    `;
  }

  function mountShell_() {
    const host = document.querySelector(SHELL_SELECTOR);
    if (!host || host.getAttribute(MOUNTED_ATTR) === "1") return false;

    host.innerHTML = shellHtml_();
    host.setAttribute(MOUNTED_ATTR, "1");
    return true;
  }

  window.pattcAdminGameBuilderNavigationShellR2Mount = mountShell_;

  function scheduleMount_() {
    window.setTimeout(mountShell_, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleMount_, { once: true });
  } else {
    scheduleMount_();
  }

  const root = document.getElementById("app");
  if (root && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(scheduleMount_);
    observer.observe(root, { childList: true, subtree: true });
  }
})();
