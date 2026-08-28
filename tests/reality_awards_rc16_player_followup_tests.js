const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const profile = read('frontend/js/pages/profile.js');
const picks = read('frontend/js/pages/picks.js');
const styles = read('frontend/css/styles.css');
const anchor = read('backend/engines/SeasonAnchorEngine.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const html = read('frontend/app.html');

function functionSource(source, name) {
  const asyncMarker = `async function ${name}(`;
  const marker = `function ${name}(`;
  let start = source.indexOf(asyncMarker);
  if (start < 0) start = source.indexOf(marker);
  assert(start >= 0, `Missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

function runFunctions(source, names, context = {}) {
  const sandbox = Object.assign({ console, Promise, Date, Math, Number, String, Array, Object, JSON, setTimeout, clearTimeout }, context);
  vm.createContext(sandbox);
  names.forEach(name => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

function makeStorage() {
  const values = new Map();
  return {
    getItem(k) { return values.has(String(k)) ? values.get(String(k)) : null; },
    setItem(k, v) { values.set(String(k), String(v)); },
    removeItem(k) { values.delete(String(k)); },
    values
  };
}

(async function main() {
  // -----------------------------------------------------------------------
  // 1) First-entry profile/onboarding: keep existing is immediate and sticky.
  // -----------------------------------------------------------------------
  assert.strictEqual(app, appMirror, 'frontend app mirrors must stay identical');
  const storage = makeStorage();
  const ordering = [];
  const never = new Promise(() => {});
  let profileReads = 0;
  let modalCalls = 0;
  const originalSet = storage.setItem.bind(storage);
  storage.setItem = (k, v) => { ordering.push('local'); originalSet(k, v); };

  const profileCtx = runFunctions(app, [
    'gameProfilePromptCacheKey_',
    'rememberGameProfilePromptComplete_',
    'gameProfileDashboardRow_',
    'maybeOfferGameProfile_'
  ], {
    localStorage: storage,
    APP_STATE: { dashboardHomePayload: { activeGames: [], pastGames: [] } },
    getCurrentUsername: () => 'cert-user',
    apiGetEditableProfile: async () => {
      profileReads++;
      return { success: true, profileMode: 'game', gameProfilePromptCompleted: false, profile: { displayName: 'Existing Name' } };
    },
    showGameProfileChoiceModal_: async () => { modalCalls++; return 'general'; },
    apiSetGameProfilePromptChoice: () => { ordering.push('remote'); return never; }
  });

  const keepResult = await Promise.race([
    profileCtx.maybeOfferGameProfile_('game-1'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('keep-existing profile path waited for server persistence')), 80))
  ]);
  assert.strictEqual(keepResult, 'continue');
  assert.strictEqual(modalCalls, 1);
  assert.deepStrictEqual(ordering.slice(0, 2), ['local', 'remote'], 'local acknowledgement must occur before background persistence');
  assert.strictEqual(storage.getItem('gameProfilePrompt:cert-user:game-1'), 'done');

  // Local completion must bypass both server read and modal on re-entry.
  await profileCtx.maybeOfferGameProfile_('game-1');
  assert.strictEqual(profileReads, 1, 'completed local onboarding must not re-read/reopen profile prompt');
  assert.strictEqual(modalCalls, 1);

  // Server-completed onboarding on another device should not open a modal.
  const storage2 = makeStorage();
  let serverModalCalls = 0;
  const completedCtx = runFunctions(app, [
    'gameProfilePromptCacheKey_',
    'rememberGameProfilePromptComplete_',
    'gameProfileDashboardRow_',
    'maybeOfferGameProfile_'
  ], {
    localStorage: storage2,
    APP_STATE: { dashboardHomePayload: { activeGames: [], pastGames: [] } },
    getCurrentUsername: () => 'cert-user-2',
    apiGetEditableProfile: async () => ({ success: true, profileMode: 'game', gameProfilePromptCompleted: true, profile: {} }),
    showGameProfileChoiceModal_: async () => { serverModalCalls++; return 'general'; },
    apiSetGameProfilePromptChoice: async () => ({ success: true })
  });
  assert.strictEqual(await completedCtx.maybeOfferGameProfile_('game-2'), 'continue');
  assert.strictEqual(serverModalCalls, 0);
  assert.strictEqual(storage2.getItem('gameProfilePrompt:cert-user-2:game-2'), 'done');

  // Custom display name/image save must continue into the originating game,
  // even when effective scope is general.
  const storage3 = makeStorage();
  const entered = [];
  const navigated = [];
  let cleared = 0;
  const continueCtx = runFunctions(profile, ['continueAfterProfileSave_'], {
    localStorage: storage3,
    clearProfileEditContext_: () => { cleared++; },
    enterGame: (...args) => entered.push(args),
    navigate: target => navigated.push(target),
    window: { setTimeout: fn => { fn(); return 1; } }
  });
  const continuation = continueCtx.continueAfterProfileSave_('general', {
    gameId: 'game-custom', gameType: 'reality-tv', leagueId: '', gameRole: 'child', hubMode: 'reality'
  }, 'cert-user-3');
  assert.strictEqual(continuation, 'game');
  assert.strictEqual(cleared, 1);
  assert.strictEqual(entered.length, 1, 'saved custom profile must continue into the game');
  assert.strictEqual(entered[0][0], 'game-custom');
  assert.strictEqual(navigated.length, 0, 'game-entry profile save must not bounce Home');
  assert.strictEqual(storage3.getItem('gameProfilePrompt:cert-user-3:game-custom'), 'done');

  // -----------------------------------------------------------------------
  // 2) Sole Survivor required pick auto-expands; final state starts collapsed.
  // -----------------------------------------------------------------------
  function renderAnchor(anchorView) {
    const ctx = runFunctions(picks, ['renderSeasonAnchorPickCard_'], {
      PICKS_PAGE_DATA: { seasonAnchor: anchorView },
      PICKS_SEASON_ANCHOR_DRAFT_ID: '',
      PICKS_SEASON_ANCHOR_SAVE_IN_FLIGHT: false,
      seasonAnchorEntityById_: id => (anchorView.entities || []).find(e => String(e.id) === String(id)) || null,
      realityTvSafeColor_: c => c || '#64748b',
      escapeHtml: v => String(v == null ? '' : v),
      escapeAttr: v => String(v == null ? '' : v),
      formatSeasonAnchorMultiplier_: v => `${Number(v || 0).toFixed(2)}x`,
      formatSeasonAnchorLock_: () => 'Open now',
      seasonAnchorImageHtml_: () => '<div class="image"></div>',
      realityTvProfileDetailsHtml_: () => '<div>bio</div>',
      seasonAnchorActiveBioBrowserHtml_: () => '<div>bios</div>'
    });
    return ctx.renderSeasonAnchorPickCard_();
  }

  const baseAnchor = {
    enabled: true,
    deferred: false,
    hiddenBySpoiler: false,
    locked: false,
    canChoose: true,
    settings: { DisplayLabel: 'Sole Survivor', StartMultiplier: 1.1, GrowthPerSuccess: .1, MaxMultiplier: 1.2, EligiblePointsCap: 10, LossPenalty: 2 },
    season: { periodLabel: 'Episode' },
    episode: { episodeId: 'ep1', episodeNumber: 1, episodeName: 'Episode 1', lockDateTime: '' },
    entities: [{ id: 'chef-a', name: 'Chef A', status: 'ACTIVE', teamColor: '#ffffff' }],
    stats: { longestStreak: 2, totalBonus: 3, totalPenalty: 2, netAdjustment: 1, recent: [{ episodeNumber: 1, entityName: 'Chef A', outcome: 'SURVIVED', multiplier: 1.1, bonus: 1, penalty: 2, net: -1 }] },
    maxWeeklyBonus: 1
  };
  const requiredHtml = renderAnchor(Object.assign({}, baseAnchor, { user: null }));
  assert(requiredHtml.includes('class="season-anchor-card needs-pick" open'), 'required Sole Survivor pick must start expanded');
  assert(requiredHtml.indexOf('season-anchor-current-episode-primary') < requiredHtml.indexOf('season-anchor-feature-grid'), 'Current Episode must precede main pick/status content');
  assert(requiredHtml.includes('Current streak'));
  assert(requiredHtml.includes('Current bonus / multiplier'));
  assert(requiredHtml.includes('>Penalty<'));
  assert(requiredHtml.includes('More Stats / Details'));
  assert(requiredHtml.indexOf('More Stats / Details') < requiredHtml.indexOf('Longest streak'), 'secondary stats must live under More Stats');

  const finalizedAnchor = Object.assign({}, baseAnchor, {
    canChoose: false,
    user: { currentEntityId: 'chef-a', currentEntityName: 'Chef A', currentEntityActive: true, status: 'ACTIVE', streak: 2, currentMultiplier: 1.2 },
    currentEntity: baseAnchor.entities[0]
  });
  const finalizedHtml = renderAnchor(finalizedAnchor);
  assert(finalizedHtml.includes('class="season-anchor-card active" >') || finalizedHtml.includes('class="season-anchor-card active"'), 'finalized card should render without forced-open attribute');
  assert(!finalizedHtml.includes('class="season-anchor-card active" open'));
  assert.strictEqual((finalizedHtml.match(/Finalized Pick: Chef A/g) || []).length, 1, 'finalized copy must be condensed to one headline');
  assert.strictEqual((finalizedHtml.match(/You cannot choose again unless this contestant is eliminated\./g) || []).length, 1, 'finalized explanation must appear once');

  // Deferred payload still uses the loading state and eliminated currentEntity
  // can still render even if no longer present in active entities.
  const deferredHtml = renderAnchor(Object.assign({}, baseAnchor, { deferred: true }));
  assert(deferredHtml.includes('Loading the current survivor selection'));
  const eliminatedAnchor = Object.assign({}, baseAnchor, {
    canChoose: true,
    user: { currentEntityId: 'chef-old', currentEntityName: 'Chef Old', currentEntityActive: false, status: 'NEEDS_PICK', streak: 0, currentMultiplier: 1.1 },
    currentEntity: { id: 'chef-old', name: 'Chef Old', status: 'ELIMINATED' }
  });
  assert(renderAnchor(eliminatedAnchor).includes('Chef Old'));

  // -----------------------------------------------------------------------
  // 3) Confirmation and immediate save feedback / double-submit guard.
  // -----------------------------------------------------------------------
  assert(!functionSource(picks, 'saveSeasonAnchorPick_').includes('window.confirm'), 'finalize must use real two-button confirmation, not window.confirm');
  const confirmSource = functionSource(picks, 'showSeasonAnchorFinalizeConfirmation_');
  assert(confirmSource.includes('CANCEL'));
  assert(confirmSource.includes('FINALIZE PICK'));

  async function runSaveCase(approved, apiImpl) {
    const messages = [];
    const busy = [];
    let apiCalls = 0;
    const ctx = runFunctions(picks, ['saveSeasonAnchorPick_'], {
      PICKS_SEASON_ANCHOR_SAVE_IN_FLIGHT: false,
      PICKS_SEASON_ANCHOR_DRAFT_ID: 'chef-a',
      PICKS_PAGE_DATA: { gameId: 'game-1', seasonAnchor: baseAnchor },
      PICKS_ENHANCEMENTS_CACHE: {},
      seasonAnchorEntityById_: () => ({ id: 'chef-a', name: 'Chef A' }),
      showSeasonAnchorFinalizeConfirmation_: async () => approved,
      setSeasonAnchorFinalizeBusy_: value => { ctx.PICKS_SEASON_ANCHOR_SAVE_IN_FLIGHT = value === true; busy.push(value); },
      showPicksMessage: (message, isError) => messages.push({ message, isError }),
      apiSaveSeasonAnchorPick: async (...args) => { apiCalls++; return apiImpl(...args); },
      clearStartupPayload: () => {},
      picksEnhancementKey_: () => 'key',
      refreshPicksEnhancementUi_: () => {},
      document: { getElementById: () => null }
    });
    return { ctx, messages, busy, getApiCalls: () => apiCalls };
  }

  const cancel = await runSaveCase(false, async () => ({ success: true }));
  await cancel.ctx.saveSeasonAnchorPick_();
  assert.strictEqual(cancel.getApiCalls(), 0, 'CANCEL must make no save call');
  assert.strictEqual(cancel.busy.length, 0, 'CANCEL must not mutate busy/finalization state');

  let releaseSave;
  const pendingPromise = new Promise(resolve => { releaseSave = resolve; });
  const pending = await runSaveCase(true, () => pendingPromise);
  const firstSave = pending.ctx.saveSeasonAnchorPick_();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(pending.getApiCalls(), 1);
  assert.strictEqual(pending.busy[0], true, 'approved finalize must disable repeat submit before network completion');
  assert.strictEqual(pending.messages[0].message, 'Finalizing…', 'approved finalize must show immediate feedback');
  const secondSave = pending.ctx.saveSeasonAnchorPick_();
  await Promise.resolve();
  assert.strictEqual(pending.getApiCalls(), 1, 'repeat submit while finalizing must not issue a second request');
  releaseSave({ success: true, message: 'Finalized Pick: Chef A', seasonAnchor: finalizedAnchor });
  await Promise.all([firstSave, secondSave]);
  assert(pending.messages.some(item => item.message === 'Finalized Pick: Chef A' && item.isError === false));

  const failed = await runSaveCase(true, async () => { throw new Error('Save failed clearly'); });
  await failed.ctx.saveSeasonAnchorPick_();
  assert.strictEqual(failed.getApiCalls(), 1);
  assert.strictEqual(failed.busy[failed.busy.length - 1], false, 'failed save must re-enable the action');
  assert(failed.messages.some(item => item.message === 'Save failed clearly' && item.isError === true));

  // -----------------------------------------------------------------------
  // 4) Backend save path performance + exactly-once protection.
  // -----------------------------------------------------------------------
  const saveSource = functionSource(anchor, 'apiSaveSeasonAnchorPick');
  assert.strictEqual((saveSource.match(/seasonAnchorUserPayload_\(/g) || []).length, 1, 'finalize must build the expensive Season Anchor/Reality payload only once');
  assert(!saveSource.includes('seasonAnchorUpsert_('), 'finalize must not rescan users through the generic upsert');
  assert(saveSource.includes('seasonAnchorPersistUserPick_('));
  assert(saveSource.includes('LockService.getUserLock'));
  assert(saveSource.includes('tryLock(2000)'));
  assert(saveSource.includes('alreadyFinalized: true'), 'same already-finalized pick must be idempotent');
  assert(functionSource(anchor, 'seasonAnchorPersistUserPick_').includes('getSheetByName(SEASON_ANCHOR_USERS_SHEET)'), 'finalize persistence should reuse the already-ensured users sheet');

  // Existing scoring/replacement/spoiler settlement functions remain present.
  assert(anchor.includes('function seasonAnchorSettleRealityEpisode_'));
  assert(anchor.includes('function seasonAnchorRecalculateEpisodeScores_'));
  assert(saveSource.includes('realityTvSpoilerStateForGame_'));
  assert(saveSource.includes('This Sole Survivor pick is finalized. You can choose again only after the contestant is eliminated.'));

  // Cache markers ensure installed PWA receives the new player JS/CSS shell.
  for (const source of [app, pwa, sw, html]) {
    assert(source.includes('v1219rc16-reality-player-followup'), 'RC16 player follow-up cache marker missing');
  }
  assert(styles.includes('.season-anchor-primary-stats'));
  assert(styles.includes('.season-anchor-confirm-backdrop'));

  console.log('reality-awards-rc16-player-followup-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
