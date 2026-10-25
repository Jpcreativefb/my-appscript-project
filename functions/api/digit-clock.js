// Public, read-only sports data. Only fixed league paths and ESPN hosts are allowed.
const LEAGUES = { nfl: "football/nfl", cfb: "football/college-football", nba: "basketball/nba", wnba: "basketball/wnba", ncaam: "basketball/mens-college-basketball", ncaaw: "basketball/womens-college-basketball", mlb: "baseball/mlb", nhl: "hockey/nhl" };
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=10", "x-content-type-options": "nosniff" };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
async function espn(league, path, query) {
  const urls = ["site.api.espn.com", "site.web.api.espn.com"];
  for (const host of urls) {
    try {
      const response = await fetch(`https://${host}/apis/site/v2/sports/${LEAGUES[league]}/${path}?${query}`, {
        headers: { accept: "application/json", referer: "https://www.espn.com/" },
        signal: AbortSignal.timeout(12000)
      });
      if (response.ok) return await response.json();
    } catch (_) { /* Try the second fixed ESPN host. */ }
  }
  throw new Error("ESPN is unavailable. Please try again shortly.");
}
export async function onRequestGet({ request }) {
  const query = new URL(request.url).searchParams;
  const event = query.get("event");
  const date = query.get("date");
  const league = query.get("league") || "nfl";
  if (!Object.hasOwn(LEAGUES, league)) return reply({ error: "Unsupported sport / league." }, 400);
  if ((event !== null && !/^\d{6,12}$/.test(event)) || (date !== null && !/^\d{8}$/.test(date))) {
    return reply({ error: "Use a numeric ESPN event ID or a YYYYMMDD date." }, 400);
  }
  try {
    if (!event) return reply(await espn(league, "scoreboard", new URLSearchParams(date ? { dates: date, limit: "1000" } : { limit: "1000" })));
    const summary = await espn(league, "summary", new URLSearchParams({ event }));
    if (!summary.header?.competitions?.length) return reply({ error: "Game not found in the selected sport / league." }, 404);
    const gameDate = String(summary.header.competitions[0].date || "").slice(0, 10).replaceAll("-", "");
    let scoreboardEvent = null;
    try {
      const board = await espn(league, "scoreboard", new URLSearchParams({ dates: gameDate, limit: "1000" }));
      scoreboardEvent = (board.events || []).find(item => String(item.id) === event) || null;
    } catch (_) { /* Client will label the last-play clock as provisional. */ }
    return reply({ league, summary, scoreboardEvent, fetchedAt: new Date().toISOString() });
  } catch (error) { return reply({ error: error.message }, 502); }
}
