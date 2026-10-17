const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const apiSource = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const gamesSource = fs.readFileSync(path.join(root, 'backend/admin/AdminGames.js'), 'utf8');

function extractFunction(source, name) {
  const needles = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const needle of needles) {
    start = source.indexOf(needle);
    if (start >= 0) break;
  }
  assert(start >= 0, 'function not found: ' + name);
  const brace = source.indexOf('{', start);
  assert(brace >= 0, 'opening brace not found: ' + name);
  let depth = 0;
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || '';
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('closing brace not found: ' + name);
}

(async () => {
  // Frontend Create forces createOnly; ordinary Save/Update retain their existing request shape.
  {
    const calls = [];
    const context = {
      apiAdminGameSaveRequest_: async function(action, payload) {
        calls.push({ action, payload });
        return { success: true };
      }
    };
    vm.createContext(context);
    for (const name of ['apiAdminCreateGame', 'apiAdminSaveGame', 'apiAdminUpdateGame']) {
      vm.runInContext(extractFunction(apiSource, name), context);
    }

    await context.apiAdminCreateGame({ gameId: 'create-only-test', createOnly: false });
    await context.apiAdminSaveGame({ gameId: 'ordinary-save' });
    await context.apiAdminUpdateGame({ gameId: 'ordinary-update' });

    assert.strictEqual(calls[0].action, 'adminSaveGame');
    assert.strictEqual(calls[0].payload.createOnly, true, 'Create API must force createOnly=true');
    assert.strictEqual(calls[1].action, 'adminSaveGame');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(calls[1].payload, 'createOnly'), false, 'ordinary Save must remain unchanged');
    assert.strictEqual(calls[2].action, 'adminSaveGame');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(calls[2].payload, 'createOnly'), false, 'ordinary Update must remain unchanged');
  }

  // Exercise the real adminSaveGame dispatcher with an in-memory authoritative creator/updater.
  {
    const games = new Map();
    const calls = { create: 0, update: 0, find: 0, createPayloads: [] };
    const sheet = {
      getDataRange: function() {
        return {
          getValues: function() {
            return Array.from(games.values());
          }
        };
      }
    };
    const context = {
      adminNormalizeGameId_: function(value) { return String(value || '').trim().toLowerCase(); },
      adminEnsureGameOptionalHeaders_: function() {},
      getGamesSheet_: function() { return sheet; },
      adminGetGamesHeaders_: function() { return ['GameId']; },
      getGamesColumnMap_: function() { return { gameId: 0 }; },
      validateGamesColumns_: function() {},
      adminFindGameRow_: function(_data, _col, gameId) {
        calls.find += 1;
        return games.has(gameId) ? 2 : -1;
      },
      adminCreateGame: function(payload) {
        calls.create += 1;
        calls.createPayloads.push(Object.assign({}, payload));
        if (games.has(payload.gameId)) {
          return {
            success: true,
            message: 'Game already exists',
            gameId: payload.gameId,
            duplicate: true
          };
        }
        games.set(payload.gameId, Object.assign({}, payload));
        return { success: true, message: 'Game created', gameId: payload.gameId };
      },
      adminUpdateGame: function(payload) {
        calls.update += 1;
        const current = games.get(payload.gameId) || {};
        games.set(payload.gameId, Object.assign({}, current, payload));
        return { success: true, message: 'Game updated', gameId: payload.gameId };
      }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(gamesSource, 'adminSaveGame'), context);

    const first = context.adminSaveGame({
      gameId: 'oscars-2027',
      name: 'Original Awards Pool',
      type: 'prediction',
      createOnly: true
    });
    assert.strictEqual(first.success, true, 'missing GameId must create');
    assert.strictEqual(first.result.duplicate, undefined);
    assert.strictEqual(calls.create, 1);
    assert.strictEqual(calls.update, 0);
    assert.strictEqual(calls.find, 0, 'create-only must skip the non-atomic row lookup');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(calls.createPayloads[0], 'createOnly'), false, 'createOnly must remain operation-only');

    const beforeDuplicate = Object.assign({}, games.get('oscars-2027'));
    const second = context.adminSaveGame({
      gameId: 'oscars-2027',
      name: 'Overwrite Attempt',
      type: 'wager',
      createOnly: true
    });
    assert.strictEqual(second.success, true);
    assert.strictEqual(second.message, 'Game created', 'wrapper response shape remains compatible');
    assert.strictEqual(second.result.duplicate, true, 'second Create must return nested duplicate');
    assert.strictEqual(calls.create, 2, 'duplicate Create still delegates to authoritative creator');
    assert.strictEqual(calls.update, 0, 'duplicate Create must never update');
    assert.strictEqual(calls.find, 0, 'duplicate Create must not make a non-atomic row decision');
    assert.deepStrictEqual(games.get('oscars-2027'), beforeDuplicate, 'duplicate Create must not overwrite fields');

    const ordinarySave = context.adminSaveGame({
      gameId: 'oscars-2027',
      name: 'Updated Through Ordinary Save',
      type: 'confidence'
    });
    assert.strictEqual(ordinarySave.success, true);
    assert.strictEqual(calls.update, 1, 'ordinary Save/update remains available');
    assert.strictEqual(calls.find, 1, 'ordinary Save retains its existing row lookup');
    assert.strictEqual(games.get('oscars-2027').name, 'Updated Through Ordinary Save');
    assert.strictEqual(games.get('oscars-2027').type, 'confidence');
  }

  console.log('PASS shared admin game create-only contract and duplicate safety');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
