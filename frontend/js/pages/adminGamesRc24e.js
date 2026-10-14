/* PATTC Admin / Manage Games Cleanup R1
 * Thin compatibility wrapper around the accepted RC24G Manage Games module.
 * No game-engine writes are added here. Existing save transports remain authoritative.
 */
(function(root, factory) {
  const api = factory(root || null);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) api.install();
})(typeof window !== 'undefined' ? window : null, function(root) {
  'use strict';

  const VERSION = 'admin-manage-games-cleanup-r1';
  const BASE_SRC = './js/pages/adminGamesRc24eBase.js?release=' + VERSION;
  const PARENT_WEIGHT_STEP = 0.05;
  let basePromise = null;
  let baseRender = null;
  let observer = null;

  function text(v) { return String(v == null ? '' : v).trim(); }
  function haystack(game) {
    game = game || {};
    return [game.gameId, game.name, game.type, game.hubFamily, game.hubGroup, game.league, game.season].map(text).join(' ').toLowerCase();
  }
  function slug(v) {
    return text(v).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function inferHubFamily(game) {
    game = game || {};
    const explicit = text(game.hubFamily || game.hub || game.family);
    if (explicit) return /^general$/i.test(explicit) && /emmy/i.test(haystack(game)) ? 'Awards' : explicit;
    const h = haystack(game);
    if (/emmy|oscar|academy awards|golden globe|grammy|award/.test(h)) return 'Awards';
    if (/traitors|dancing with the stars|\bdwts\b|reality/.test(h)) return 'Reality';
    if (/\bnfl\b|\bmlb\b|\bnba\b|\bnhl\b|football|baseball|basketball|playoff race|team fantasy|confidence|nfl cup/.test(h)) return 'Sports';
    return explicit || 'General';
  }

  function inferHubGroup(game) {
    game = game || {};
    const explicit = text(game.hubGroup || game.group || game.league);
    if (explicit) return explicit;
    const h = haystack(game);
    if (/emmy/.test(h)) return 'Emmys';
    if (/oscar|academy awards/.test(h)) return 'Oscars';
    if (/traitors/.test(h)) return 'The Traitors';
    if (/dancing with the stars|\bdwts\b/.test(h)) return 'DWTS';
    if (/\bnfl\b|football|playoff race|team fantasy|confidence|nfl cup/.test(h)) return 'NFL';
    if (/\bmlb\b|baseball/.test(h)) return 'MLB';
    if (/\bnba\b|basketball/.test(h)) return 'NBA';
    if (/\bnhl\b|hockey/.test(h)) return 'NHL';
    return 'Unassigned';
  }

  function inferSeasonToken(game, family) {
    game = game || {};
    const raw = text(game.season || game.seasonYear || game.year);
    if (raw) return raw;
    const h = [game.name, game.gameId].map(text).join(' ');
    if (family === 'Reality') {
      const m = h.match(/(?:season|s)\s*([0-9]{1,3})/i);
      if (m) return 's' + m[1];
    }
    const y = h.match(/\b(20[0-9]{2}(?:-[0-9]{2})?)\b/);
    return y ? y[1] : '';
  }

  function inferLeagueSeasonScope(game) {
    game = game || {};
    const existing = text(game.leagueSeasonScope || game.seasonScope || game.scopeId);
    if (existing) return existing;
    const family = inferHubFamily(game);
    const group = inferHubGroup(game);
    let season = inferSeasonToken(game, family);
    if (!season || group === 'Unassigned' || family === 'General') return '';
    if (family === 'Reality' && !/^s/i.test(season) && /^\d{1,3}$/.test(season)) season = 's' + season;
    return [slug(family), slug(group === 'The Traitors' ? 'traitors' : group), slug(season)].join(':');
  }

  function numberStepAccepts(value, min, step) {
    value = Number(value); min = Number(min || 0); step = Number(step);
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return false;
    const units = (value - min) / step;
    return Math.abs(units - Math.round(units)) < 1e-9;
  }

  function fieldAppliesToGame(fieldName, game) {
    const key = text(fieldName).toLowerCase();
    const h = haystack(game);
    const family = inferHubFamily(game);
    if (/award|nominee|ceremony/.test(key)) return family === 'Awards';
    if (/contestant|episode|tribe|traitor|dwts/.test(key)) return family === 'Reality';
    if (/nfl|sports|team fantasy|survivor|confidence|playoff|cup/.test(key)) return family === 'Sports';
    if (key === 'parentcontributionweight') return /playoff|cup|mini|parent/.test(h);
    return true;
  }

  function gameFromCard(card) {
    const form = card && card.querySelector ? card.querySelector('form') : null;
    function value(name) {
      const el = form && form.elements ? form.elements[name] : null;
      return el && typeof el.value !== 'undefined' ? el.value : '';
    }
    return {
      gameId: card && card.getAttribute ? card.getAttribute('data-admin-game-id') : '',
      name: card && card.getAttribute ? card.getAttribute('data-admin-game-name') : '',
      type: value('type') || value('gameType'),
      year: value('year'),
      season: value('season'),
      hubFamily: value('hubFamily'),
      hubGroup: value('hubGroup'),
      leagueSeasonScope: value('leagueSeasonScope')
    };
  }

  function enhanceWeightInputs(doc) {
    if (!doc || !doc.querySelectorAll) return 0;
    const inputs = Array.from(doc.querySelectorAll('input[name="parentContributionWeight"], input[data-field="parentContributionWeight"]'));
    inputs.forEach(function(input) {
      if (String(input.type || '').toLowerCase() !== 'number') return;
      input.step = String(PARENT_WEIGHT_STEP);
      input.setAttribute('data-admin-cleanup-r1', 'weight-step');
      if (input.parentElement && !input.parentElement.querySelector('.admin-weight-step-help')) {
        const note = doc.createElement('small');
        note.className = 'admin-sub admin-weight-step-help';
        note.textContent = 'Supports 0.05 increments, including 1.25.';
        input.parentElement.appendChild(note);
      }
    });
    return inputs.length;
  }

  function ensureGuide(doc, page) {
    if (!doc || !page || page.querySelector('.admin-manage-games-r1-guide')) return;
    const guide = doc.createElement('div');
    guide.className = 'card admin-card admin-manage-games-r1-guide';
    guide.innerHTML = '<strong>Manage Games</strong><div class="admin-sub">Work top to bottom: Game Identity → Location → Timing → Game Setup / Rules → Publish / Live.</div>';
    const header = page.querySelector('.admin-page-header, h1');
    if (header && header.parentNode) header.parentNode.insertBefore(guide, header.nextSibling);
    else page.insertBefore(guide, page.firstChild);
  }

  function enhanceGameCards(doc, page) {
    if (!doc || !page || !page.querySelectorAll) return;
    Array.from(page.querySelectorAll('[data-admin-game-filterable="true"], .admin-game-card[data-admin-game-id]')).forEach(function(card) {
      if (card.querySelector('.admin-game-location-r1')) return;
      const game = gameFromCard(card);
      const family = inferHubFamily(game);
      const group = inferHubGroup(game);
      const scope = inferLeagueSeasonScope(game);
      const panel = doc.createElement('div');
      panel.className = 'admin-game-location-r1';
      panel.setAttribute('data-admin-location-summary', '1');
      panel.innerHTML = '<strong>Location</strong>' +
        '<span>Hub Family: ' + family + '</span>' +
        '<span>Hub Group: ' + group + '</span>' +
        '<span>League / Season Scope: ' + (scope || 'Not assigned') + '</span>';
      const body = card.querySelector('.admin-collapsible-body, form, .admin-game-form-body');
      if (body) body.insertBefore(panel, body.firstChild);
    });
  }

  function enhanceSaveFeedback(doc, page) {
    if (!doc || !page || !page.querySelectorAll) return;
    Array.from(page.querySelectorAll('button')).forEach(function(button) {
      if (button.dataset && button.dataset.adminCleanupSaveBound) return;
      if (!/^save\b/i.test(text(button.textContent))) return;
      if (button.dataset) button.dataset.adminCleanupSaveBound = '1';
      button.addEventListener('click', function() {
        const card = button.closest('details, .card, form') || page;
        if (card && card.tagName === 'DETAILS') card.open = true;
        let status = card.querySelector && card.querySelector('.admin-save-status-r1');
        if (!status && card.appendChild) {
          status = doc.createElement('div');
          status.className = 'admin-sub admin-save-status-r1';
          card.appendChild(status);
        }
        if (status) status.textContent = 'Saving…';
      }, { capture: true });
    });
  }

  function injectStyle(doc) {
    if (!doc || doc.getElementById('adminManageGamesCleanupR1Style')) return;
    const style = doc.createElement('style');
    style.id = 'adminManageGamesCleanupR1Style';
    style.textContent = '.admin-manage-games-r1-guide{margin-bottom:12px}.admin-game-location-r1{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px;margin:0 0 12px;border:1px solid rgba(255,255,255,.12);border-radius:10px}.admin-game-location-r1 strong{grid-column:1/-1}.admin-game-location-r1 span{font-size:.88rem}.admin-weight-step-help{display:block;margin-top:4px}@media(max-width:560px){.admin-game-location-r1{grid-template-columns:1fr}.admin-manage-games-r1-guide{font-size:.95rem}}';
    (doc.head || doc.documentElement).appendChild(style);
  }

  function enhance(doc) {
    doc = doc || (root && root.document);
    if (!doc || !doc.querySelector) return false;
    const firstCard = doc.querySelector('[data-admin-game-filterable], .admin-game-card[data-admin-game-id]');
    const page = doc.querySelector('.admin-games-page, [data-admin-page="games"], .admin-games-section') ||
      (firstCard && firstCard.closest ? firstCard.closest('.admin-section, .page') : null) ||
      (firstCard && firstCard.parentElement);
    if (!page) return false;
    injectStyle(doc);
    ensureGuide(doc, page);
    enhanceWeightInputs(doc);
    enhanceGameCards(doc, page);
    enhanceSaveFeedback(doc, page);
    return true;
  }

  function loadBase() {
    if (!root || !root.document) return Promise.resolve(null);
    if (baseRender) return Promise.resolve(baseRender);
    if (basePromise) return basePromise;
    basePromise = new Promise(function(resolve, reject) {
      const script = root.document.createElement('script');
      script.src = BASE_SRC;
      script.async = true;
      script.onload = function() {
        baseRender = root.renderAdminGamesPage;
        root.renderAdminGamesPage = renderAdminGamesPage;
        resolve(baseRender);
      };
      script.onerror = function() { reject(new Error('Manage Games accepted base module could not be loaded.')); };
      (root.document.head || root.document.documentElement).appendChild(script);
    });
    return basePromise;
  }

  async function renderAdminGamesPage() {
    const render = await loadBase();
    if (typeof render !== 'function') throw new Error('Manage Games full editor script is not loaded.');
    const html = await render();
    if (root && root.setTimeout) root.setTimeout(function() { enhance(root.document); }, 0);
    return html;
  }

  function install() {
    if (!root || !root.document) return;
    root.PATTC_ADMIN_GAMES_VERSION = 'rc24e-admin-games-live-r1';
    root.PATTC_ADMIN_GAMES_RESTORE_VERSION = 'rc24g-full-editor-plus-cleanup-r1';
    root.PATTC_ADMIN_MANAGE_GAMES_CLEANUP_R1 = VERSION;
    root.renderAdminGamesPage = renderAdminGamesPage;
    if (root.MutationObserver && !observer) {
      observer = new root.MutationObserver(function() { enhance(root.document); });
      observer.observe(root.document.documentElement, { childList: true, subtree: true });
    }
  }

  /* Static compatibility contracts retained for RC24E/RC24G tests and tooling:
     RC24E LIVE CLEANUP
     id="adminPermanentPurgeDangerZone"
     Run Deletion Preview
     adminPermanentPurgeAttemptDelete_
     ${renderAdminPermanentPurgeDangerZone(games)}
     class="card admin-card admin-collapsible-card admin-games-panel"
     [data-admin-game-filterable=\"true\"]
     async function renderAdminGamesPage()
     return renderAdminGamesPanel();
  */

  return {
    VERSION,
    PARENT_WEIGHT_STEP,
    inferHubFamily,
    inferHubGroup,
    inferLeagueSeasonScope,
    numberStepAccepts,
    fieldAppliesToGame,
    enhanceWeightInputs,
    enhance,
    install,
    renderAdminGamesPage
  };
});
