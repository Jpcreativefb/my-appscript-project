const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'backend/engines/SportsWagerEngine.js'), 'utf8');
const frontend = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} missing`);
  const brace = source.indexOf('{', start);
  assert(brace >= 0, `${name} opening brace missing`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} closing brace missing`);
}

assert(backend.includes('Admin Sports builders must be able to seed the first wager while the'));
assert(backend.includes('status === "setup"'));
assert(backend.includes('status === "preview"'));
assert(frontend.includes('No Setup, Preview, or Live wager-enabled games were found.'));
assert(frontend.includes('String(game.status).toUpperCase()'));

const context = {
  String,
  Array,
  Object,
  requireAdmin_() {},
  getGames() {
    return [
      {
        gameId: 'setup-wager',
        name: 'Setup Wager',
        type: 'wager',
        status: 'Setup',
        active: false,
        archived: false,
        wagerEnabled: true
      },
      {
        gameId: 'setup-hybrid',
        name: 'Setup Hybrid',
        type: 'mixed',
        status: 'Setup',
        active: false,
        archived: false,
        wagerEnabled: true
      },
      {
        gameId: 'preview-hybrid',
        name: 'Preview Hybrid',
        type: 'mixed',
        status: 'Preview',
        active: true,
        archived: false,
        wagerEnabled: true
      },
      {
        gameId: 'live-wager',
        name: 'Live Wager',
        type: 'wager',
        status: 'Active',
        active: true,
        archived: false,
        wagerEnabled: true
      },
      {
        gameId: 'draft-wager',
        name: 'Draft Wager',
        type: 'wager',
        status: 'Draft',
        active: false,
        archived: false,
        wagerEnabled: true
      },
      {
        gameId: 'archived-wager',
        name: 'Archived Wager',
        type: 'wager',
        status: 'Setup',
        active: false,
        archived: true,
        wagerEnabled: true
      },
      {
        gameId: 'setup-prediction',
        name: 'Setup Prediction',
        type: 'prediction',
        status: 'Setup',
        active: false,
        archived: false,
        wagerEnabled: false
      },
      {
        gameId: 'legacy-active-wager',
        name: 'Legacy Active Wager',
        type: 'wager',
        status: '',
        active: true,
        archived: false,
        wagerEnabled: true
      }
    ];
  },
  getActiveGames() {
    throw new Error('getActiveGames should not be the primary admin-builder source');
  }
};

vm.createContext(context);
vm.runInContext(extractFunction(backend, 'apiAdminGetSportsWagerGames'), context);

const result = context.apiAdminGetSportsWagerGames({ username: 'admin', token: 'token' });
assert.strictEqual(result.success, true);
const ids = Array.from(result.games, game => game.gameId);
assert.deepStrictEqual(ids, [
  'setup-wager',
  'setup-hybrid',
  'preview-hybrid',
  'live-wager',
  'legacy-active-wager'
]);
assert.strictEqual(result.games[0].status, 'Setup');
assert.strictEqual(result.games[1].wagerEnabled, true);
assert(!ids.includes('draft-wager'));
assert(!ids.includes('archived-wager'));
assert(!ids.includes('setup-prediction'));

console.log('sports-wager-setup-destination-v1216-tests: PASS');
