const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const root = process.cwd();
const preflightPath = path.join(root, 'backend/admin/AdminPreflight.js');
const source = fs.readFileSync(preflightPath, 'utf8');

assert(source.includes('TEAM_FANTASY_V1218P_FAST_PREFLIGHT'), 'fast preflight marker missing');
const fastIndex = source.indexOf('TEAM_FANTASY_V1218P_FAST_PREFLIGHT');
const setupLoadIndex = source.indexOf('adminGetGameSetup({');
assert(fastIndex >= 0 && setupLoadIndex >= 0 && fastIndex < setupLoadIndex,
  'Team Fantasy fast path must occur before generic adminGetGameSetup');
assert(source.includes('teamFantasyPreflightIssues_(gameId)'), 'Team Fantasy validator call missing');
assert(source.includes('fastPath: true'), 'fastPath response marker missing');

let genericSetupCalls = 0;
const sandbox = {
  console,
  getGame: () => ({
    gameId: 'tf-test', name: 'Team Fantasy Test', year: 2025,
    type: 'team-fantasy', status: 'Setup', active: false,
    archived: false, defaultGame: false, themeColor: '#000000'
  }),
  getGames: () => [{
    gameId: 'tf-test', name: 'Team Fantasy Test', year: 2025,
    type: 'team-fantasy', status: 'Setup', active: false,
    archived: false, defaultGame: false, themeColor: '#000000'
  }],
  adminGetGameSetup: () => { genericSetupCalls++; throw new Error('generic setup loader should not run'); },
  teamFantasyPreflightIssues_: () => [],
  realityTvGetSeasonByGameId_: () => null,
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'AdminPreflight.js' });
const result = sandbox.adminRunGamePreflight({ gameId: 'tf-test' });
assert.strictEqual(genericSetupCalls, 0, 'generic Game Setup loader was called');
assert.strictEqual(result.success, true);
assert.strictEqual(result.gameType, 'team-fantasy');
assert.strictEqual(result.fastPath, true);
assert.strictEqual(result.errorCount, 0);
console.log('Team Fantasy v1.2.18p fast preflight tests passed.');
