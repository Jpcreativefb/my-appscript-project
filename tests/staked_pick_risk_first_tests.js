const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const appearance = fs.readFileSync(path.join(root, 'frontend/js/pages/adminAppearance.js'), 'utf8');
const picksEngine = fs.readFileSync(path.join(root, 'backend/engines/PicksEngine.js'), 'utf8');

// Server-side purse reserve is required as a production integrity mirror of the frontend guard.
assert(picksEngine.includes('function getAwardsStakesRequiredReserveBudget_('));
assert(picksEngine.includes('function awardsStakesCategoryRequiresPickServer_('));
assert(picksEngine.includes('getAwardsStakesRequiredReserveBudget_('));
assert(picksEngine.includes('Keep enough points for the remaining required picks.'));
assert(picksEngine.includes('Max for this pick is '));

// R1 source-scope contracts: the new layout is explicit to Awards Staked Prediction.
assert(picks.includes('type === "staked-prediction" && game.stakedPointsEnabled === true'));
assert(picks.includes('class="pick-category-card question-layout-${escapeAttr(picksResolvedQuestionLayout_(category))}'));
assert(picks.includes('awards-stakes-card'));
assert(picks.includes('draftAwardsStakesNominee_'));
assert(picks.includes('confirmAwardsStakesPick_'));
assert(picks.includes('await selectNominee(category.id, nomineeId);'));
assert(picks.includes('apiSavePick({'));
assert(picks.includes('getAwardsStakesWagerBudget_'));
assert(picks.includes('validateAwardsStakesWagerBudget_'));
assert(picks.includes('adjustAwardsStakesStake_'));
assert(picks.includes('Available after: '));
assert(picks.includes('Correct +'));
assert(picks.includes('Wrong −'));
assert(css.includes('AWARDS STAKES R1 — pick → risk → confirm → collapse'));
assert(css.includes('.picks-page .awards-stakes-card'));
assert(!css.includes('.picks-page .nominee-choice.awards-stakes-nominee'));

// Appearance controls are narrow to staked-prediction and stored in the existing theme JSON.
assert(appearance.includes('function adminAppearanceIsAwardsStakesGame_()'));
assert(appearance.includes('appearanceThemeStakesShowRisked'));
assert(appearance.includes('appearanceThemeStakesAccent'));
assert(appearance.includes('appearanceThemeStakesCorrectOutline'));
assert(appearance.includes('appearanceThemeStakesCorrectTitle'));
assert(appearance.includes('Correct Outline Color'));
assert(appearance.includes('Correct Title Color'));
assert(appearance.includes('appearanceThemeStakesWrongOpacity'));
assert(appearance.includes('appearanceThemeStakesWinnerText'));
assert(appearance.includes('stakes: {'));

// Awards/Stakes result colors are scoped and default to awards gold; pending saved titles remain white.
assert(/\.picks-page \.awards-stakes-card \.awards-stakes-hero-answer strong \{[^}]*color:\s*#fff;/s.test(css));
assert(/\.picks-page \.awards-stakes-card\.correct \{[^}]*--awards-stakes-correct-outline, #d4af37/s.test(css));
assert(/\.picks-page \.awards-stakes-card\.correct \.awards-stakes-hero-answer strong \{[^}]*--awards-stakes-correct-title, #d4af37/s.test(css));
assert(css.includes('color: #60a5fa;'));
assert(css.includes('.awards-stakes-fallback-monogram'));
assert(css.includes('background: rgba(255,255,255,.10)'));
assert(/\.awards-stakes-fallback-monogram \{[\s\S]*?width:\s*76px;[\s\S]*?height:\s*76px;/m.test(css));
assert(/\.awards-stakes-nominee\.no-image \.awards-stakes-nominee-title \{[\s\S]*?font-size:\s*\.99rem;/m.test(css));
assert(css.includes('color: rgba(255,255,255,.60)'));
assert(css.includes('filter: grayscale(.9) saturate(.1) contrast(.92)'));
assert(css.includes('-webkit-mask-image: linear-gradient(to right, transparent 0%'));
assert(css.includes('background: linear-gradient(to right, #090f1d 0%, #0d1627 28%, #172033 100%)'));
assert(/\.awards-stakes-lock \{[\s\S]*?min-height:\s*11px;[\s\S]*?border-radius:\s*4px;[\s\S]*?font-size:\s*\.35rem;/m.test(css));
assert(css.includes('.picks-page .awards-stakes-card .awards-stakes-stepper'));
assert(css.includes('.picks-page .awards-stakes-card .awards-stakes-stepper-button'));
assert(css.includes('.picks-page .awards-stakes-card .awards-stakes-wager-info'));
assert(/\.picks-page \.awards-stakes-card \.stake-step-status\.is-ready \{[\s\S]*?display:\s*none;/m.test(css));

function htmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let savePayload = null;
let messageLog = [];
const documentStub = {
  _stakeValue: '',
  _elements: {},
  _card: null,
  _panel: null,
  getElementById(id) {
    if (this._elements && this._elements[id]) return this._elements[id];
    if (String(id).indexOf('stake-') === 0 && String(id).indexOf('stake-confirm-') !== 0) {
      return { value: this._stakeValue, classList: { toggle() {} } };
    }
    return null;
  },
  querySelector(selector) {
    if (String(selector).indexOf('[data-awards-stakes-risk="true"]') === 0) return this._panel;
    if (String(selector).indexOf('[data-category-id=') === 0) return this._card;
    return null;
  },
  querySelectorAll() { return []; },
  createElement() {
    return {
      innerHTML: '',
      firstElementChild: null
    };
  }
};

const context = {
  console,
  Math,
  Number,
  String,
  Array,
  Object,
  Boolean,
  Date,
  JSON,
  RegExp,
  isFinite,
  parseInt,
  parseFloat,
  Promise,
  setTimeout() {},
  clearTimeout() {},
  setInterval() {},
  clearInterval() {},
  requestAnimationFrame(fn) { if (fn) fn(); },
  document: documentStub,
  window: {
    PlatformImageEngine: null,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  normalizeId(value) { return String(value == null ? '' : value).trim().toLowerCase(); },
  cssEscape(value) { return String(value == null ? '' : value).replace(/"/g, '\\"'); },
  escapeHtml: htmlEscape,
  escapeAttr: htmlEscape,
  escapeJs(value) { return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); },
  platformImgHtml(src, options) {
    if (!src) return '';
    const className = options && options.className ? options.className : '';
    return `<img class="${htmlEscape(className)}" src="${htmlEscape(src)}">`;
  },
  showPicksMessage(message, isError) { messageLog.push({ message, isError }); },
  getSession() { return { username: 'riley-test' }; },
  clearStartupPayload() {},
  setPageLoadStep() {},
  renderErrorCard(message) { return message; },
  getFrontendGameId() { return ''; },
  apiSavePick: async payload => {
    savePayload = payload;
    return {
      success: true,
      changeCount: 0,
      originalNomineeId: payload.nomineeId,
      stakePoints: payload.stakePoints,
      stakeSummary: {
        currentBalance: 100,
        pendingStakes: payload.stakePoints,
        availablePoints: 100 - payload.stakePoints,
        settledNet: 0
      }
    };
  }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(picks, context);
vm.runInContext(`
  this.AWARDS_STAKES_TEST = {
    setState(value) { PICKS_PAGE_DATA = value; clearAwardsStakesDrafts_(); },
    getState() { return PICKS_PAGE_DATA; },
    setDraft(categoryId, nomineeId) { PICKS_AWARDS_STAKES_DRAFT_PICKS[categoryId] = nomineeId; },
    getDraft(categoryId) { return PICKS_AWARDS_STAKES_DRAFT_PICKS[categoryId]; },
    getTempOpen() { return PICKS_TEMP_OPEN_CATEGORY_ID; }
  };
`, context);

// Avoid DOM page remounting during the functional save test; rendering is tested separately.
context.refreshPicksPage = function() {};
context.applySportsRichConfidenceAppearance_ = function() {};

function setAwardsStakeState(overrides) {
  const state = Object.assign({
    session: { username: 'riley-test' },
    gameId: 'stake-test',
    game: {
      type: 'staked-prediction',
      stakedPointsEnabled: true,
      minStake: 10,
      maxStake: 100,
      stakeIncrement: 10,
      startingPoints: 100,
      stakeWinMultiplier: 1,
      stakeLossMultiplier: 1,
      lockAllPicks: false
    },
    isConfidenceGame: false,
    confidenceScoringMode: 'win_only',
    categories: [],
    picks: {},
    changeCounts: {},
    originalPicks: {},
    confidencePoints: {},
    stakePoints: {},
    stakeSummary: {
      currentBalance: 100,
      pendingStakes: 0,
      availablePoints: 100,
      settledNet: 0
    },
    pickMeta: {},
    appearance: null,
    realityTvView: null
  }, overrides || {});
  context.AWARDS_STAKES_TEST.setState(state);
}

const nominees = [
  { id: 'n1', name: 'Survivor' },
  { id: 'n2', name: 'The Traitors' }
];
const category = {
  id: 'q1',
  question: 'Outstanding reality / competition series',
  scoreMode: 'staked-points',
  minStake: 0,
  maxStake: 0,
  stakeIncrement: 0,
  stakeWinMultiplier: null,
  stakeLossMultiplier: null,
  maxChanges: -1,
  nominees: nominees
};

setAwardsStakeState({ categories: [category] });

// PICK FIRST: open card immediately exposes nominees; Risk controls are hidden until a nominee is drafted.
let openHtml = context.renderCategoryCard(category, false, null);
assert(openHtml.includes('awards-stakes-card'));
assert(openHtml.includes('awards-stakes-nominee'));
assert(openHtml.includes("draftAwardsStakesNominee_('q1', 'n1')"));
assert(!openHtml.includes('data-awards-stakes-risk="true"'));
assert(!openHtml.includes('STEP 1'));
assert(!openHtml.includes('STEP 2'));
assert(!openHtml.includes('stake-preset-button'));

// Selecting a nominee is only a local draft; Risk starts at the configured minimum with a compact stepper.
context.AWARDS_STAKES_TEST.setDraft('q1', 'n1');
let selectedHtml = context.renderCategoryCard(category, false, null);
assert(selectedHtml.includes('Selected: <strong>Survivor</strong>'));
assert(selectedHtml.includes('Risk Points'));
assert(selectedHtml.includes('Available after: 90'));
assert(selectedHtml.includes('value="10"'));
assert(selectedHtml.includes('min="10"'));
assert(selectedHtml.includes('max="100"'));
assert(selectedHtml.includes('step="10"'));
assert(selectedHtml.includes('Min 10 · Max 100 · Step 10'));
assert(selectedHtml.includes('id="stake-minus-q1"'));
assert(selectedHtml.includes('id="stake-plus-q1"'));
assert(selectedHtml.includes("adjustAwardsStakesStake_('q1', -1)"));
assert(selectedHtml.includes("adjustAwardsStakesStake_('q1', 1)"));
assert(selectedHtml.includes('Confirm Pick'));
assert(!selectedHtml.includes('stake-preset-row'));
assert(!selectedHtml.includes('Choose your risk amount above before selecting an answer.'));
assert(!selectedHtml.includes('>15</button>'));
assert(!selectedHtml.includes('>25</button>'));
assert(!selectedHtml.includes('>50</button>'));
assert.strictEqual(context.AWARDS_STAKES_TEST.getState().picks.q1, undefined);

// Required unanswered Awards/Stakes questions reserve their minimums so one pick cannot exhaust the purse.
const category2 = Object.assign({}, category, { id: 'q2', question: 'Second required question' });
const category3 = Object.assign({}, category, { id: 'q3', question: 'Third required question' });
setAwardsStakeState({ categories: [category, category2, category3] });
context.AWARDS_STAKES_TEST.setDraft('q1', 'n1');
const protectedBudget = context.getAwardsStakesWagerBudget_(category);
assert.strictEqual(protectedBudget.usablePoints, 100);
assert.strictEqual(protectedBudget.reservedPoints, 20);
assert.strictEqual(protectedBudget.remainingRequired, 2);
assert.strictEqual(protectedBudget.effectiveMaxStake, 80);
let protectedHtml = context.renderCategoryCard(category, false, null);
assert(protectedHtml.includes('Available after: 90 · Reserve 20'));
assert(protectedHtml.includes('Min 10 · Max 100 · Step 10 · Here max 80'));
assert(protectedHtml.includes('max="80"'));
let purseValidation = context.validateAwardsStakesWagerBudget_(category, 90);
assert.strictEqual(purseValidation.valid, false);
assert(purseValidation.message.includes('Max for this pick is 80'));
purseValidation = context.validateAwardsStakesWagerBudget_(category, 80);
assert.strictEqual(purseValidation.valid, true);

// The compact info line swaps from bid rules to win/loss values after the player edits the wager,
// while Available-after decreases live as the entered stake rises.
function fakeElement(extra) {
  return Object.assign({ disabled: false, textContent: '', classList: { toggle() {} } }, extra || {});
}
const liveInput = fakeElement({ value: '20' });
const liveAvailable = fakeElement();
const liveInfo = fakeElement();
const liveConfirm = fakeElement();
const liveMinus = fakeElement();
const livePlus = fakeElement();
const liveStatus = fakeElement();
const livePanel = { dataset: { stakeTouched: 'true' } };
const liveCard = {
  querySelector(selector) { return selector === '[data-awards-stakes-risk="true"]' ? livePanel : null; },
  querySelectorAll() { return []; }
};
documentStub._elements = {
  'stake-q1': liveInput,
  'stake-available-after-q1': liveAvailable,
  'stake-info-q1': liveInfo,
  'stake-confirm-q1': liveConfirm,
  'stake-minus-q1': liveMinus,
  'stake-plus-q1': livePlus,
  'stake-step-status-q1': liveStatus
};
documentStub._card = liveCard;
documentStub._panel = livePanel;
context.syncStakedPickControls('q1');
assert.strictEqual(liveAvailable.textContent, 'Available after: 80 · Reserve 20');
assert.strictEqual(liveInfo.textContent, 'Correct +20 · Wrong −20');
assert.strictEqual(liveConfirm.disabled, false);
liveInput.value = '40';
context.syncStakedPickControls('q1');
assert.strictEqual(liveAvailable.textContent, 'Available after: 60 · Reserve 20');
assert.strictEqual(liveInfo.textContent, 'Correct +40 · Wrong −40');
liveInput.value = '80';
context.syncStakedPickControls('q1');
assert.strictEqual(liveAvailable.textContent, 'Available after: 20 · Reserve 20');
assert.strictEqual(livePlus.disabled, true);

// Reset the lightweight DOM harness and return to one question for the existing scoring/API invariants.
documentStub._elements = {};
documentStub._card = null;
documentStub._panel = null;
setAwardsStakeState({ categories: [category] });
context.AWARDS_STAKES_TEST.setDraft('q1', 'n1');

// Stake validation math and available-balance rules are unchanged.
let validation = context.validateSelectedStakeForCategory_(category, 0);
assert.strictEqual(validation.valid, false);
assert.strictEqual(validation.message, 'Choose your risk amount first.');
validation = context.validateSelectedStakeForCategory_(category, 20);
assert.strictEqual(validation.valid, true);
assert(validation.message.includes('Risking 20 points'));
validation = context.validateSelectedStakeForCategory_(category, 25);
assert.strictEqual(validation.valid, false);
assert(validation.message.includes('10-point increments'));
validation = context.validateSelectedStakeForCategory_(category, 110);
assert.strictEqual(validation.valid, false);

// Appearance override is already in the existing bundle; Stakes now consumes it even when the generic layout would be text.
context.AWARDS_STAKES_TEST.getState().appearance = {
  assignment: { ImageMode: 'default' },
  overrides: [{
    GameId: 'stake-test',
    EntityType: 'nominee',
    EntityId: 'n1',
    EntityName: 'Survivor',
    ImageUrl: 'https://images.example/survivor.jpg',
    Active: true
  }],
  theme: { questions: { defaultLayout: 'text' } }
};
selectedHtml = context.renderCategoryCard(category, false, null);
assert(selectedHtml.includes('https://images.example/survivor.jpg'));
assert(selectedHtml.includes('awards-stakes-nominee has-image selected'));

// No image gets a deterministic generated visual fallback, never a broken image placeholder.
context.AWARDS_STAKES_TEST.setDraft('q1', 'n2');
let noImageHtml = context.renderCategoryCard(category, false, null);
assert(noImageHtml.includes('awards-stakes-nominee no-image selected'));
const n2Button = context.renderAwardsStakesNomineeButton_(category, nominees[1], 'n2', false);
assert(!n2Button.includes('<img'));
assert(n2Button.includes('awards-stakes-fallback-art awards-stakes-nominee-fallback'));
assert(n2Button.includes('awards-stakes-fallback-monogram'));
assert(n2Button.includes('<span class="awards-stakes-fallback-monogram">The Traitors</span>'));
assert(n2Button.includes('The Traitors'));
const fallbackA1 = context.awardsStakesFallbackVisual_(nominees[0]);
const fallbackA2 = context.awardsStakesFallbackVisual_(nominees[0]);
const fallbackB = context.awardsStakesFallbackVisual_(nominees[1]);
assert.strictEqual(fallbackA1.style, fallbackA2.style);
assert.strictEqual(fallbackA1.variant, fallbackA2.variant);
assert.strictEqual(fallbackA1.label, fallbackA2.label);
assert.strictEqual(fallbackA1.label, 'Survivor');
assert.notStrictEqual(fallbackA1.style, fallbackB.style);

// A real Appearance assignment replaces the generated fallback automatically.
const n1ImageButton = context.renderAwardsStakesNomineeButton_(category, nominees[0], 'n1', false);
assert(n1ImageButton.includes('https://images.example/survivor.jpg'));
assert(!n1ImageButton.includes('awards-stakes-nominee-fallback'));

// Deferred Appearance refresh is Stakes-specific when this is the explicit staked-prediction game.
let targetedRefresh = 0;
context.refreshAwardsStakesAppearanceUi_ = function() { targetedRefresh += 1; };
context.refreshPicksAppearanceUi_();
assert.strictEqual(targetedRefresh, 1);

// CONFIRM: existing selectNominee/apiSavePick path is used, stake payload/accounting stays intact, and save collapses.
setAwardsStakeState({ categories: [category] });
context.AWARDS_STAKES_TEST.setDraft('q1', 'n1');
documentStub._elements = {};
documentStub._card = null;
documentStub._panel = null;
documentStub._stakeValue = '20';
savePayload = null;
messageLog = [];

function extractNamedFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'missing function ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unterminated function ' + name);
}

// Behavioral server-reserve test. Three required 10-point questions with a 100-point purse
// means the current question may risk at most 80; optional/locked/already-picked questions do not reserve.
(function testAwardsStakesServerReserve() {
  let userPicks = [];
  let gameType = 'staked-prediction';
  const settings = {
    q1: { scoreMode: 'staked-points', minStake: 10, maxStake: 100, stakeIncrement: 10 },
    q2: { scoreMode: 'staked-points', minStake: 10, maxStake: 100, stakeIncrement: 10 },
    q3: { scoreMode: 'staked-points', minStake: 10, maxStake: 100, stakeIncrement: 10 },
    q4: { scoreMode: 'staked-points', minStake: 10, maxStake: 100, stakeIncrement: 10, optional: true }
  };
  const categories = [
    { id: 'q1', scoreMode: 'staked-points' },
    { id: 'q2', scoreMode: 'staked-points' },
    { id: 'q3', scoreMode: 'staked-points' },
    { id: 'q4', scoreMode: 'staked-points', optional: true }
  ];

  const serverContext = {
    console,
    Number,
    Math,
    Boolean,
    String,
    Array,
    Object,
    normalizeLower_(value) { return String(value == null ? '' : value).trim().toLowerCase(); },
    normalizeCategoryScoreMode_(value) { return String(value || 'correct-pick').trim().toLowerCase(); },
    getGameRuntimeConfig() { return { type: gameType, stakedPointsEnabled: true }; },
    getCategorySettingsCached() { return settings; },
    getCategoriesCached() { return categories; },
    getUserPicks() { return userPicks; },
    getCategoryResultsResolutionMap() { return {}; },
    getHybridCategoryResolution_() { return { resolved: false }; },
    isCategoryConfigLocked_(config) { return config && config.locked === true; },
    getStakedPredictionRules_(gameId, config) {
      return {
        minStake: Number(config.minStake) || 10,
        maxStake: Number(config.maxStake) || 100,
        stakeIncrement: Number(config.stakeIncrement) || 10
      };
    },
    getStakedPredictionSummary_() { return { availablePoints: 100 }; }
  };
  vm.createContext(serverContext);
  vm.runInContext(extractNamedFunction(picksEngine, 'awardsStakesCategoryRequiresPickServer_'), serverContext);
  vm.runInContext(extractNamedFunction(picksEngine, 'getAwardsStakesRequiredReserveBudget_'), serverContext);

  let budget = serverContext.getAwardsStakesRequiredReserveBudget_('riley-test', 'stake-test', 'q1', settings, categories);
  assert.strictEqual(budget.reservedPoints, 20);
  assert.strictEqual(budget.remainingRequired, 2);
  assert.strictEqual(budget.effectiveMaxStake, 80);

  userPicks = [{ categoryId: 'q2', nomineeId: 'n2', stakePoints: 10 }];
  budget = serverContext.getAwardsStakesRequiredReserveBudget_('riley-test', 'stake-test', 'q1', settings, categories);
  assert.strictEqual(budget.reservedPoints, 10);
  assert.strictEqual(budget.remainingRequired, 1);
  assert.strictEqual(budget.effectiveMaxStake, 90);

  settings.q3.locked = true;
  budget = serverContext.getAwardsStakesRequiredReserveBudget_('riley-test', 'stake-test', 'q1', settings, categories);
  assert.strictEqual(budget.reservedPoints, 0);
  assert.strictEqual(budget.remainingRequired, 0);
  assert.strictEqual(budget.effectiveMaxStake, 100);

  gameType = 'prediction';
  assert.strictEqual(serverContext.getAwardsStakesRequiredReserveBudget_('riley-test', 'stake-test', 'q1', settings, categories), null);
})();

(async () => {
  await context.confirmAwardsStakesPick_('q1');
  assert(savePayload, 'Confirm Pick must call existing apiSavePick path');
  assert.strictEqual(savePayload.categoryId, 'q1');
  assert.strictEqual(savePayload.nomineeId, 'n1');
  assert.strictEqual(savePayload.stakePoints, 20);
  assert.strictEqual(context.AWARDS_STAKES_TEST.getState().picks.q1, 'n1');
  assert.strictEqual(context.AWARDS_STAKES_TEST.getState().stakePoints.q1, 20);
  assert.strictEqual(context.AWARDS_STAKES_TEST.getState().stakeSummary.pendingStakes, 20);
  assert.strictEqual(context.AWARDS_STAKES_TEST.getState().stakeSummary.availablePoints, 80);
  assert.strictEqual(context.AWARDS_STAKES_TEST.getDraft('q1'), undefined);
  assert.strictEqual(context.AWARDS_STAKES_TEST.getTempOpen(), '');

  // Saved state collapses; Appearance image is reused in the compact hero.
  context.AWARDS_STAKES_TEST.getState().appearance = {
    overrides: [{ GameId: 'stake-test', EntityType: 'nominee', EntityId: 'n1', ImageUrl: 'https://images.example/survivor.jpg', Active: true }],
    theme: { questions: { stakes: { showRiskedPoints: true } } }
  };
  let collapsedHtml = context.renderCategoryCard(category, false, null);
  assert(collapsedHtml.includes('collapsed'));
  assert(collapsedHtml.includes('awards-stakes-card'));
  assert(collapsedHtml.includes(' pending '));
  assert(collapsedHtml.includes('awards-stakes-collapsed-header'));
  assert(collapsedHtml.includes('https://images.example/survivor.jpg'));
  assert(collapsedHtml.includes('20 points risked'));
  // Before settlement, the title is governed by the white saved-title rule, not Pick Accent or Correct colors.
  assert(/\.picks-page \.awards-stakes-card \.awards-stakes-hero-answer strong \{[^}]*color:\s*#fff;/s.test(css));

  // Show Risked Points OFF suppresses only that collapsed detail.
  context.AWARDS_STAKES_TEST.getState().appearance.theme.questions.stakes.showRiskedPoints = false;
  collapsedHtml = context.renderCategoryCard(category, false, null);
  assert(!collapsedHtml.includes('20 points risked'));
  assert(collapsedHtml.includes('Survivor'));

  // Awards/Stakes defaults to gold correct outline/title, independently of generic result colors.
  context.AWARDS_STAKES_TEST.getState().appearance.theme.questions.stakes = {};
  let defaultCorrectSettings = context.awardsStakesAppearanceSettings_();
  assert.strictEqual(defaultCorrectSettings.correctOutlineColor, '#d4af37');
  assert.strictEqual(defaultCorrectSettings.correctTitleColor, '#d4af37');

  // Correct result keeps the selected image clear and receives Awards-only Appearance colors.
  category.winnerNomineeId = 'n1';
  context.AWARDS_STAKES_TEST.getState().appearance.theme.questions.stakes = {
    showRiskedPoints: true,
    correctOutlineColor: '#c89b3c',
    correctTitleColor: '#f7d774',
    pickAccentColor: '#fedcba',
    wrongOpacity: 40,
    winnerTextColor: '#e7be55'
  };
  let correctHtml = context.renderCategoryCard(category, false, null);
  assert(correctHtml.includes(' correct '));
  assert(correctHtml.includes('--awards-stakes-correct-outline:#c89b3c'));
  assert(correctHtml.includes('--awards-stakes-correct-title:#f7d774'));
  assert(correctHtml.includes('--awards-stakes-winner-text:#e7be55'));
  assert(!correctHtml.includes('Winner:'));

  // Wrong result preserves the user's pick and adds a small winner explanation.
  context.AWARDS_STAKES_TEST.getState().picks.q1 = 'n2';
  context.AWARDS_STAKES_TEST.getState().stakePoints.q1 = 20;
  let wrongHtml = context.renderCategoryCard(category, false, null);
  assert(wrongHtml.includes(' wrong '));
  assert(wrongHtml.includes('<strong>The Traitors</strong>'));
  assert(wrongHtml.includes('Winner: Survivor'));
  assert(wrongHtml.includes('--awards-stakes-wrong-opacity:0.4'));
  assert(wrongHtml.includes('--awards-stakes-winner-text:#e7be55'));
  assert(wrongHtml.includes('awards-stakes-hero-fallback'));

  // Before lock, a collapsed saved card can reopen using the unchanged collapse function.
  let collapsed = true;
  let aria = 'false';
  const fakeCard = {
    classList: {
      toggle(name) { if (name === 'collapsed') collapsed = !collapsed; },
      contains(name) { return name === 'collapsed' ? collapsed : false; }
    },
    querySelector(selector) {
      if (selector === '.pick-card-header') return { setAttribute(name, value) { if (name === 'aria-expanded') aria = value; } };
      return null;
    }
  };
  context.document.querySelector = function() { return fakeCard; };
  context.togglePickCategory('q1');
  assert.strictEqual(collapsed, false);
  assert.strictEqual(aria, 'true');

  // Existing lock gate remains authoritative; no Stakes draft bypasses it.
  context.AWARDS_STAKES_TEST.getState().game.lockAllPicks = true;
  assert.strictEqual(context.isCategoryLocked(category), true);
  const lockedHtml = context.renderCategoryCard(category, false, null);
  assert(lockedHtml.includes('<span class="awards-stakes-lock">LOCKED</span>'));
  assert(!lockedHtml.includes('🔒'));
  context.AWARDS_STAKES_TEST.setDraft('q1', 'n1');
  context.draftAwardsStakesNominee_('q1', 'n2');
  assert.strictEqual(context.AWARDS_STAKES_TEST.getDraft('q1'), 'n1');
  context.AWARDS_STAKES_TEST.getState().game.lockAllPicks = false;

  // Ordinary Picks remains on the generic selectNominee renderer with no Stakes classes.
  context.AWARDS_STAKES_TEST.getState().game = { type: 'prediction', stakedPointsEnabled: false, lockAllPicks: false };
  const normalCategory = { id: 'p1', scoreMode: 'correct-pick', nominees: [{ id: 'a', name: 'Answer A' }] };
  const normalButton = context.renderNomineeButton(normalCategory, normalCategory.nominees[0], '', false);
  assert(normalButton.includes("onclick=\"selectNominee('p1', 'a')\""));
  assert(!normalButton.includes('awards-stakes-nominee'));
  const normalCard = context.renderCategoryCard(normalCategory, false, null);
  assert(!normalCard.includes('awards-stakes-card'));

  // Confidence remains on its existing control/interaction path.
  context.AWARDS_STAKES_TEST.getState().game = { type: 'confidence', confidenceEnabled: true, stakedPointsEnabled: false, lockAllPicks: false };
  context.AWARDS_STAKES_TEST.getState().isConfidenceGame = true;
  context.AWARDS_STAKES_TEST.getState().confidencePoints = {};
  const confidenceCategory = { id: 'c1', scoreMode: 'confidence-points', nominees: [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }] };
  const confidenceControl = context.renderConfidenceControl(confidenceCategory, false);
  assert(confidenceControl.includes('id="confidence-c1"'));
  assert(confidenceControl.includes("updateConfidenceForCategory('c1', this.value)"));
  const confidenceButton = context.renderNomineeButton(confidenceCategory, confidenceCategory.nominees[0], '', false);
  assert(confidenceButton.includes("selectNominee('c1', 'x')"));
  assert(!confidenceButton.includes('awards-stakes-nominee'));

  console.log('awards-stakes-r1-focused-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
