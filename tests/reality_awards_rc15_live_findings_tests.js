'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadMany(files, extra = {}) {
  const c = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, URL, ...extra
  };
  vm.createContext(c);
  files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), c));
  return c;
}

const frontend = fs.readFileSync('frontend/js/pages/adminRealityTv.js', 'utf8');
const seasonEngine = fs.readFileSync('backend/engines/RealityTvSeasonEngine.js', 'utf8');
const questionEngine = fs.readFileSync('backend/engines/RealityTvQuestionPackEngine.js', 'utf8');

// ---------------------------------------------------------------------------
// RC15 live findings 1 + 2: the rebased Reality follow-up must keep the
// post-Episode-1 management surface and queued initial setup transport.
// Detailed runtime behavior is covered by the dedicated persistent/async suite.
// ---------------------------------------------------------------------------
assert(frontend.includes('Manage Cast / Participants'), 'Existing season must expose persistent cast management.');
assert(frontend.includes('Season Settings'), 'Existing season must expose persistent Season Settings.');
assert(frontend.includes('Prepare / Open Cast Import Sheet'), 'Existing season must expose Cast Import after Episode 1.');
assert(frontend.includes('Preview Cast Import'), 'Existing season must expose Cast Import preview after Episode 1.');
assert(frontend.includes('Load Selected / Import Selected'), 'Existing season must expose selected-row import after Episode 1.');
assert(frontend.includes('ExternalSubjectId'), 'Existing participant editor must preserve/update ExternalSubjectId.');
assert(seasonEngine.includes('accepted: true') && seasonEngine.includes('queued: true'),
  'Initial season create must return an accepted/queued state in production.');
assert(frontend.includes('Season accepted. Episode 1 setup is queued in the background.'),
  'Admin UI must describe queued Episode 1 setup instead of waiting for the long build.');

// ---------------------------------------------------------------------------
// RC15 live finding 3: current-episode display order must persist independently
// from question materialization. Reproduce the live failure shape:
//   season default = 30
//   existing Episode 1 row = 1
//   admin sends Episode 1 = 15
//   supplemental build is skipped/deferred
// Old behavior left the row at 1. New behavior persists 15 before the build.
// Dashboard readback must return 15, while Episode 2 inherits season default 30.
// ---------------------------------------------------------------------------
{
  const dummySheet = {};
  const q = loadMany(['backend/engines/RealityTvSeasonEngine.js', 'backend/engines/RealityTvQuestionPackEngine.js'], {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => dummySheet }) }
  });

  const season = {
    SeasonId: 's1', GameId: 'g1', ShowFormat: 'survivor-tribal',
    PeriodLabel: 'Episode', Points: 1
  };
  const episode1 = { EpisodeId: 'e1', EpisodeNumber: 1, Status: 'OPEN', CategoryId: 'elim-e1' };
  const template = {
    SeasonId: 's1', GameId: 'g1', TemplateId: 'tribal-attendee', QuestionType: 'tribal-attendee',
    Label: 'Tribe going to Tribal Council', Enabled: true, DisplayOrder: 30,
    QuestionTemplate: 'Which tribe will go to Tribal Council in Episode {episode}?',
    AnswerSource: 'active-groups', ResultKey: 'tribal-attendee', Points: 1,
    LayoutType: 'text', ImageSource: 'none', TemplateSource: 'preset',
    ShowFormatsJSON: JSON.stringify(['survivor-tribal'])
  };
  const episodeQuestion = {
    __rowNumber: 2, SeasonId: 's1', GameId: 'g1', EpisodeId: 'e1', EpisodeNumber: 1,
    EpisodeQuestionId: 'e1-tribal-attendee', TemplateId: 'tribal-attendee', QuestionType: 'tribal-attendee',
    CategoryId: 'episode-1-tribal-attendee', Enabled: true, DisplayOrder: 1, Status: 'OPEN',
    AnswerOptionsJSON: JSON.stringify([{ id: 'tribe-a' }, { id: 'tribe-b' }])
  };
  const category = {
    categoryId: 'episode-1-tribal-attendee', displayOrder: 101,
    nominees: [{ nomineeId: 'tribe-a' }, { nomineeId: 'tribe-b' }]
  };
  const elimination = { categoryId: 'elim-e1', displayOrder: 199, nominees: [] };
  const setup = { categories: [category, elimination] };
  const updates = [];

  q.requireAdmin_ = () => {};
  q.realityTvEnsureSystem_ = () => {};
  q.realityTvEnsureQuestionPackSystem_ = () => {};
  q.realityTvGetSeason_ = () => season;
  q.realityTvResolveQuestionBuildEpisode_ = () => episode1;
  q.realityTvQuestionTemplatesForSeason_ = () => [template];
  q.realityTvCancelOtherQuestionBuildsForEpisode_ = () => 0;
  q.realityTvEpisodeQuestionsForSeason_ = () => [episodeQuestion];
  q.adminGetGameSetup = () => setup;
  q.realityTvUpdateObjectRow_ = (_sheet, _rowNumber, patch) => Object.assign(episodeQuestion, patch);
  q.adminUpdateCategory = (payload) => {
    updates.push({ ...payload });
    const row = setup.categories.find(item => String(item.categoryId) === String(payload.categoryId));
    if (row && payload.displayOrder !== undefined) row.displayOrder = payload.displayOrder;
    if (row && payload.active !== undefined) row.active = payload.active;
    return { success: true };
  };
  // Deliberately skip materialization to reproduce the live path that previously
  // lost the episode-only order even though the save request itself succeeded.
  q.realityTvBuildSupplementalQuestionForTemplate_ = () => ({ success: true, skipped: true, reason: 'fixture skip' });
  q.realityTvClearRuntimeCaches_ = () => {};
  q.realityTvSyncAllSupplementalQuestionsToHub_ = () => ({ success: true, skipped: true });

  const result = q.apiAdminApplyRealityTvEpisodeQuestionPlan({
    seasonId: 's1', episodeId: 'e1',
    enabledQuestionTypesJSON: JSON.stringify(['tribal-attendee']),
    questionPointsJSON: '{}', questionDisplayJSON: '{}',
    questionOrderJSON: JSON.stringify({ 'tribal-attendee': 15 }),
    eliminationDisplayOrder: 990
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(episodeQuestion.DisplayOrder, 15,
    'Episode 1 order must persist at 15 even when the supplemental build skips.');
  assert.strictEqual(template.DisplayOrder, 30,
    'Episode-only update must not mutate the season template order.');
  assert.strictEqual(category.displayOrder, 115,
    'Playable Episode 1 category order must track episode-local order 15.');
  assert(updates.some(row => row.categoryId === 'episode-1-tribal-attendee' && row.displayOrder === 115),
    'Episode order save path must update the existing playable category.');

  const reload1 = q.realityTvQuestionPackReadiness_(
    season, episode1, [template], [{ ...episodeQuestion }], null, null, setup.categories
  );
  const e1State = reload1.questionStates.find(row => row.templateId === 'tribal-attendee');
  assert(e1State, 'Episode 1 readiness must contain tribal-attendee.');
  assert.strictEqual(e1State.episodeDisplayOrder, 15,
    'Full dashboard/readback must return Episode 1 order 15 after reload.');
  assert.strictEqual(e1State.seasonDefaultEnabled, true);

  const episode2 = { EpisodeId: 'e2', EpisodeNumber: 2, Status: 'OPEN', CategoryId: 'elim-e2' };
  const reload2 = q.realityTvQuestionPackReadiness_(
    season, episode2, [template], [], null, null, [{ categoryId: 'elim-e2', nominees: [] }]
  );
  const e2State = reload2.questionStates.find(row => row.templateId === 'tribal-attendee');
  assert(e2State, 'Episode 2 readiness must contain tribal-attendee.');
  assert.strictEqual(e2State.episodeDisplayOrder, 30,
    'Episode 2 must inherit season order 30 rather than Episode 1 override 15.');
}

// Ensure frontend sends the episode-order map through the exact Update This Episode Only path.
assert(frontend.includes('questionOrderJSON: JSON.stringify(adminRealityTvCollectQuestionOrder_(seasonId, "episode"))'),
  'Update This Episode Only must submit episode question order.');
assert(questionEngine.includes('realityTvSetEpisodeQuestionDisplayOrder_'),
  'Backend must persist episode display order explicitly rather than only as a build side effect.');

console.log('reality-awards-rc15-live-findings-tests: PASS');
