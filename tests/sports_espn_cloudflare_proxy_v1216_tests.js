const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const scores = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');
const players = read('external-engines/sports-scoring-engine/src/SportsPlayersEngine.js');
const advanced = read('external-engines/sports-scoring-engine/src/SportsAdvancedStatsEngine.js');
const proxy = read('functions/api/espn-proxy.js');
const routes = JSON.parse(read('frontend/_routes.json'));

assert(scores.includes('SPORTS_ESPN_PROXY_URL'), 'Sports Engine must support a configurable ESPN proxy URL.');
assert(scores.includes('SPORTS_ESPN_PROXY_TOKEN'), 'Sports Engine must require a private proxy token.');
assert(scores.includes('x-awards-sports-token'), 'Sports Engine must authenticate proxy requests with a private header.');
assert(scores.includes('Refusing to use an unauthenticated Sports proxy'), 'Sports Engine must fail closed when proxy token is missing.');
assert(scores.includes('function sportsEspnRequestUrl_'), 'Shared ESPN transport URL helper missing.');
assert(scores.includes('function sportsEspnFetch_'), 'Shared ESPN fetch helper missing.');
assert(scores.includes('function sportsEspnFetchAll_'), 'Shared ESPN fetchAll helper missing.');
assert(scores.includes('sportsEspnFetch_(url'), 'Scoreboard fetch must use shared ESPN transport.');
assert(players.includes('sportsEspnFetch_'), 'Player single ESPN requests must use shared transport.');
assert(players.includes('sportsEspnFetchAll_'), 'Player roster batch requests must use shared transport.');
assert(advanced.includes('sportsEspnFetch_'), 'Advanced-stat fallback must use shared transport.');

assert(proxy.includes('SPORTS_PROXY_TOKEN'), 'Cloudflare Pages Function must require an encrypted secret binding.');
assert(proxy.includes('x-awards-sports-token'), 'Cloudflare Pages Function must verify the Sports Engine token header.');
assert(proxy.includes('Unauthorized.'), 'Cloudflare Pages Function must fail closed for unauthenticated callers.');
assert(proxy.includes('site.api.espn.com'), 'Proxy must pin the ESPN hostname.');
assert(proxy.includes('/apis/site/v2/sports/'), 'Proxy must pin the ESPN sports API path.');
assert(proxy.includes('target.hostname !== ALLOWED_HOST'), 'Proxy hostname allowlist enforcement missing.');
assert(proxy.includes('target.pathname.startsWith(ALLOWED_PATH_PREFIX)'), 'Proxy path allowlist enforcement missing.');
assert(!proxy.includes('access-control-allow-origin'), 'Server-only proxy should not expose browser CORS by default.');
assert(proxy.includes('cache-control", "no-store"'), 'Proxy must avoid stale live-score caching.');

console.log('Sports ESPN Cloudflare proxy v1.2.16 tests passed.');

assert(proxy.includes('cdn.espn.com'), 'Proxy must support ESPN CDN live-score fallback.');
assert(proxy.includes('LIVE_CDN_LEAGUES'), 'Proxy must explicitly allow only known live CDN league mappings.');
assert(proxy.includes('target.searchParams.get("dates")'), 'CDN fallback must be limited to date-scoped live requests.');
assert(proxy.includes('/scoreboard?xhr=1&limit=50'), 'CDN fallback must use the real-time scoreboard endpoint.');
assert(proxy.includes('x-awards-sports-fallback-from-status'), 'Proxy should expose when the primary ESPN host was rejected.');
assert(scores.includes('payload.content.sbData') && scores.includes('payload.content.sbData.events'), 'Sports Engine must parse CDN scoreboard events.');
