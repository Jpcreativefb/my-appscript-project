const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const gamesPath = path.join(root, 'frontend/js/pages/adminGames.js');
const appPath = path.join(root, 'frontend/js/app.js');

const shellSource = fs.readFileSync(shellPath, 'utf8');
const gamesSource = fs.readFileSync(gamesPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');

assert.doesNotThrow(
  () => new Function(shellSource),
  'Games & Design R3 shell must parse'
);

const canonical = [
  'prediction',
  'head-to-head',
  'staked-prediction',
  'wager',
  'racing-wager',
  'mixed',
  'voting',
  'ranking'
];

const canonicalMatch = shellSource.match(
  /const OTHER_GAME_TYPES_R3B = Object\.freeze\(\[([\s\S]*?)\]\);/
);
assert(canonicalMatch, 'canonical General / Custom type array missing');
const canonicalActual = Array.from(
  canonicalMatch[1].matchAll(/"([^"]+)"/g),
  match => match[1]
);
assert.deepStrictEqual(
  canonicalActual,
  canonical,
  'canonical General / Custom types changed'
);

[
  'general',
  'custom',
  'cookoff',
  'judging',
  'movie-ballot',
  'community-awards',
  'prediction-market'
].forEach(type => {
  assert(
    !canonicalActual.includes(type),
    'forbidden canonical General / Custom type introduced: ' + type
  );
});

const sections = [
  ['sports', '"Sports"'],
  ['reality-tv', '"Reality TV"'],
  ['awards', '"Awards"'],
  ['other-games', '"Other Games"'],
  ['prediction-markets', '"Prediction Markets"'],
  ['appearance', '"Appearance / Visual Design"']
];

sections.forEach(([key, title]) => {
  assert(
    shellSource.includes(`sectionHtml_("${key}", ${title}`),
    'missing Games & Design top-level section: ' + key
  );
});

assert(
  shellSource.includes(
    '<details class="card admin-card admin-collapsible-card admin-games-design-section"'
  ),
  'top-level Games & Design sections must reuse Manage Games collapsible classes'
);
assert(
  shellSource.includes('<summary class="admin-card-summary">') &&
  shellSource.includes('admin-collapse-icon') &&
  shellSource.includes('admin-collapsible-body'),
  'Games & Design must reuse Manage Games summary/body interaction pattern'
);
assert(
  gamesSource.includes('class="card admin-card admin-collapsible-card') &&
  gamesSource.includes('class="admin-card-summary"') &&
  gamesSource.includes('class="admin-collapsible-body"'),
  'Manage Games accordion authority changed unexpectedly'
);

['League', 'NFL', '2026'].forEach(label => {
  assert(shellSource.includes('>' + label + '<'), 'Sports hierarchy missing ' + label);
});
assert(
  shellSource.includes('Admin → Games &amp; Design → Sports → League → NFL → 2026'),
  'Sports breadcrumb must use League as the organizational level'
);

[
  "navigate('admin-games')",
  "navigate('admin-team-fantasy')",
  "navigate('admin-playoff-race')",
  "navigate('admin-nfl-cup')",
  "navigate('admin-nfl-season-setup')",
  "navigate('admin-sports-engine')"
].forEach(route => {
  assert(shellSource.includes(route), 'Sports authority route missing: ' + route);
});

assert(
  shellSource.includes("navigate('admin-reality-tv')") &&
  shellSource.includes('Open Reality TV Manager'),
  'Reality TV Manager must be a visible actionable destination'
);
assert(
  shellSource.includes("navigate('admin-awards')") &&
  shellSource.includes('Open Awards Game Builder') &&
  shellSource.includes('Open Awards Manager'),
  'Awards builder/manager destinations must be visible'
);
assert(
  !/sectionHtml_\("awards"[\s\S]*builderFormHtmlR3B_/.test(
    shellSource.slice(shellSource.indexOf('function shellHtml_'))
  ),
  'Awards must not permanently dump the generic builder inline'
);

assert(
  shellSource.includes('data-admin-other-games-r3="1"'),
  'Other Games section missing'
);
assert(
  shellSource.includes('data-admin-other-game="cookoff"') &&
  shellSource.includes('Manage Cookoff') &&
  shellSource.includes('existing Voting / Competition game authority'),
  'Cookoff product destination must preserve Voting / Competition authority'
);
assert(
  shellSource.includes('data-admin-other-game="movie-ranking"') &&
  shellSource.includes('Movie Ranking / Community Awards') &&
  shellSource.includes('existing Ranking / Movie Community Awards authority'),
  'Movie Ranking / Community Awards product destination must preserve Ranking authority'
);
assert(
  shellSource.includes('data-admin-other-game="voting"') &&
  shellSource.includes('data-admin-other-game="ranking"'),
  'generic Voting / Competition and Ranking destinations missing'
);
assert(
  shellSource.includes('data-admin-other-game="general-custom"'),
  'General / Custom destination missing'
);

assert(
  shellSource.includes("navigate('admin-prediction-markets')") &&
  shellSource.includes("navigate('prediction-markets')") &&
  shellSource.includes("navigate('leaderboard')"),
  'Prediction Markets admin/player/leaderboard authorities must remain separate and visible'
);
assert(
  !canonicalActual.includes('prediction-market'),
  'Prediction Markets must not become a General / Custom canonical type'
);

[
  'admin-reality-tv',
  'admin-awards',
  'admin-prediction-markets',
  'admin-appearance',
  'admin-nfl-cup',
  'admin-nfl-season-setup',
  'admin-playoff-race',
  'admin-sports-engine'
].forEach(route => {
  assert(
    appSource.includes('"' + route + '"'),
    'app router missing existing authority: ' + route
  );
});

assert(
  !shellSource.includes('function renderAdminReality') &&
  !shellSource.includes('function renderAdminAwards') &&
  !shellSource.includes('function renderAdminPredictionMarket') &&
  !shellSource.includes('function renderAdminAppearance'),
  'Games & Design shell must not duplicate manager implementations'
);

assert(
  shellSource.includes('grid-template-columns:minmax(0,1fr)') &&
  shellSource.includes('max-width:100%') &&
  shellSource.includes('min-width:0') &&
  shellSource.includes('overflow-wrap:anywhere'),
  'mobile layout must include explicit no-overflow safeguards'
);

assert(
  shellSource.includes('const body = host.closest ? host.closest(".admin-collapsible-body") : null;'),
  'mount must replace the old mixed Games & Design body so duplicate legacy cards are not left visible'
);

console.log('PASS Admin Games & Design organization R3 routing / accordion / mobile contract');
