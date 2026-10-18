const { execFileSync } = require('child_process');

// Director-required whitespace gate on the checked-out branch.
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });

// Stronger assignment-scoped check: verify every committed change since the
// required Director checkpoint, not only the clean checkout worktree.
execFileSync('git', [
  'diff',
  '--check',
  '76fb1ad95e19586014439b3e59ec28e7b981532d',
  'HEAD'
], { stdio: 'inherit' });

console.log('Movie Community Awards git diff --check passed');
