const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

(async function run() {
  const root = path.resolve(__dirname, '..');
  const leaderboard = fs.readFileSync(
    path.join(root, 'frontend/js/pages/leaderboard.js'),
    'utf8'
  );
  const serviceWorker = fs.readFileSync(
    path.join(root, 'frontend/sw.js'),
    'utf8'
  );
  const leaderboardCss = fs.readFileSync(
    path.join(root, 'frontend/css/frontend-leaderboard-profile.css'),
    'utf8'
  );

  assert.strictEqual(
    (leaderboard.match(/\$\{renderCareerProfileModalShell_\(\)\}/g) || []).length,
    0
  );
  assert(leaderboard.includes('data-leaderboard-action="career"'));
  assert(leaderboard.includes('data-leaderboard-action="compare"'));
  assert(leaderboard.includes('function initializeLeaderboardInteractions_()'));
  assert(leaderboard.includes('function ensureLeaderboardModalShells_()'));
  assert(leaderboard.includes('const host = document.body;'));
  assert(leaderboard.includes('function showLeaderboardModal_(modal, content, html)'));
  assert(leaderboard.includes('modal.style.display = "flex"'));
  assert(leaderboard.includes('showLeaderboardModal_(modal, content, html);'));
  assert(serviceWorker.includes('awards-app-v252-phase1-publish-controls'));
  assert(serviceWorker.includes('"./css/frontend-leaderboard-profile.css"'));
  assert(leaderboardCss.includes('body > .compare-picks-modal'));
  assert(leaderboardCss.includes('z-index: 2147483000'));

  let clickHandler = null;
  const byId = new Map();

  function makeClassList(initial) {
    const values = new Set(initial || []);
    return {
      add(value) { values.add(value); },
      remove(value) { values.delete(value); },
      contains(value) { return values.has(value); }
    };
  }

  function makeModal(kind) {
    const isCareer = kind === 'career';
    const modalId = isCareer ? 'careerProfileModal' : 'comparePicksModal';
    const contentId = isCareer ? 'careerProfileContent' : 'comparePicksContent';
    const content = {
      id: contentId,
      innerHTML: '',
      style: {},
      classList: makeClassList()
    };
    const panel = {
      style: {},
      classList: makeClassList(['compare-picks-panel'])
    };
    const attrs = new Map();
    const modal = {
      id: modalId,
      parentNode: null,
      style: {},
      classList: makeClassList(['compare-picks-modal', 'hidden']),
      querySelector(selector) {
        if (selector === '#' + contentId) return content;
        if (selector === '.compare-picks-panel') return panel;
        return null;
      },
      setAttribute(name, value) { attrs.set(name, String(value)); },
      removeAttribute(name) { attrs.delete(name); },
      getAttribute(name) { return attrs.get(name); },
      remove() {
        if (this.parentNode && this.parentNode.removeChild) {
          this.parentNode.removeChild(this);
        }
      }
    };
    byId.set(modalId, modal);
    byId.set(contentId, content);
    return modal;
  }

  const body = {
    children: [],
    classList: makeClassList(),
    appendChild(node) {
      if (node.parentNode && node.parentNode !== this && node.parentNode.removeChild) {
        node.parentNode.removeChild(node);
      }
      if (!this.children.includes(node)) this.children.push(node);
      node.parentNode = this;
      if (node.id) byId.set(node.id, node);
      return node;
    },
    removeChild(node) {
      this.children = this.children.filter(child => child !== node);
      if (node.id) byId.delete(node.id);
      node.parentNode = null;
      return node;
    }
  };

  const context = {
    console,
    setTimeout,
    Promise,
    window: {},
    document: {
      addEventListener(type, handler) {
        if (type === 'click') clickHandler = handler;
      },
      getElementById(id) { return byId.get(id) || null; },
      createElement() {
        let html = '';
        return {
          firstElementChild: null,
          get innerHTML() { return html; },
          set innerHTML(value) {
            html = String(value || '');
            if (html.includes('careerProfileModal')) {
              this.firstElementChild = makeModal('career');
            } else if (html.includes('comparePicksModal')) {
              this.firstElementChild = makeModal('compare');
            }
          }
        };
      },
      body
    },
    APP_STATE: { gameId: 'oscars-2026' },
    localStorage: {
      getItem() { return ''; }
    },
    escapeHtml(value) { return String(value == null ? '' : value); },
    getCurrentUsername() { return 'viewer'; },
    getFrontendGameId() { return 'oscars-2026'; },
    getFrontendLeagueId() { return ''; },
    apiGetUserProfileHistory: async username => ({
      success: true,
      username,
      summary: {
        archivedGames: 2,
        accuracy: 75,
        firstPlaceFinishes: 1,
        longestCorrectStreak: 4,
        funFacts: ['Won one archived game.'],
        games: [
          { name: 'Hybrid Test Game', year: 2026, rank: 1, accuracy: 75 }
        ]
      }
    }),
    api: async () => ({ success: true, categories: [] })
  };

  vm.createContext(context);
  vm.runInContext(leaderboard, context);
  assert.strictEqual(typeof clickHandler, 'function');

  const careerHtml = context.renderLeaderboardUser_({
    username: 'stacey',
    displayName: 'Stacey'
  });
  assert(careerHtml.includes('data-leaderboard-action="career"'));
  assert(careerHtml.includes('data-username="stacey"'));

  const compareHtml = context.renderPickWagerCompareButton_('joel');
  assert(compareHtml.includes('data-leaderboard-action="compare"'));
  assert(compareHtml.includes('data-username="joel"'));

  await context.openLeaderboardCareerProfile_('stacey');
  const careerModal = byId.get('careerProfileModal');
  const careerContent = byId.get('careerProfileContent');
  assert(careerModal);
  assert.strictEqual(careerModal.parentNode, body);
  assert.strictEqual(careerModal.style.display, 'flex');
  assert.strictEqual(careerModal.classList.contains('hidden'), false);
  assert(careerContent.innerHTML.includes('Stacey') || careerContent.innerHTML.includes('stacey'));
  assert(careerContent.innerHTML.includes('Archived Games'));
  assert(careerContent.innerHTML.includes('75%'));

  context.closeLeaderboardCareerProfile_();
  assert.strictEqual(careerModal.style.display, 'none');
  assert.strictEqual(careerModal.classList.contains('hidden'), true);

  context.showComparePicksModal_('<div>Compare loaded</div>');
  const compareModal = byId.get('comparePicksModal');
  const compareContent = byId.get('comparePicksContent');
  assert(compareModal);
  assert.strictEqual(compareModal.parentNode, body);
  assert.strictEqual(compareModal.style.display, 'flex');
  assert(compareContent.innerHTML.includes('Compare loaded'));

  let openedCareer = '';
  let openedCompare = '';
  context.openLeaderboardCareerProfile_ = username => {
    openedCareer = username;
  };
  context.openCompareUserPicks = username => {
    openedCompare = username;
  };

  function click(action, username) {
    let prevented = false;
    clickHandler({
      preventDefault() { prevented = true; },
      target: {
        closest(selector) {
          assert.strictEqual(selector, '[data-leaderboard-action]');
          return {
            getAttribute(name) {
              if (name === 'data-leaderboard-action') return action;
              if (name === 'data-username') return username;
              return '';
            }
          };
        }
      }
    });
    return prevented;
  }

  assert.strictEqual(click('career', 'stacey'), true);
  assert.strictEqual(openedCareer, 'stacey');
  assert.strictEqual(click('compare', 'joel'), true);
  assert.strictEqual(openedCompare, 'joel');

  console.log('leaderboard-modal-interactions-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
