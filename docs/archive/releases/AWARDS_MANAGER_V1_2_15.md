# Awards Manager v1.2.15 — True Event Search

## Discovery
- Search returns provider events directly instead of grouping a sampled market batch.
- Kalshi search walks the open `/events` catalog using cursor pagination and nested markets.
- Polymarket search uses `public-search` page pagination.
- `Load More Events` continues the provider search without repeating prior results.
- Searches can continue until the provider catalog/search pages are exhausted.

## Advanced Search
- Provider: Kalshi / Polymarket / Both
- Category text filter
- Search scope: Event + markets / Event only / Markets only
- Closing window: 24 hours / 7 / 30 / 90 days / Any
- Sort: Relevance / Event title / Closing soon
- Exact phrase option

## Context
- Every result displays parent event context before its markets.
- Opened events show category, subtitle/series context, close time, and all live markets.
- If context is incomplete, the UI says so explicitly.
- Provider links are available on event cards.
- Every opened market has an `Open Original Market` link.
- Kalshi links use the user-facing Kalshi event/market route rather than the API URL.
- Polymarket links use the user-facing event page.

## Question creation
- Search pagination does not limit event answers.
- `View Event` independently reloads the selected event and all current markets.
- Existing grouped-question creation and Hub mapping behavior remains in place.
- Auto-settlement stays OFF and admin review remains required.
