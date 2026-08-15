# Awards Manager v1.2.12

This release begins the app-based Awards Manager workflow.

## Included
- New Admin → Awards Manager page.
- Live search against Kalshi and Polymarket.
- Readable market cards with provider outcomes and live probability values when available.
- Create Question From Market.
- Link Existing Question.
- Selected markets are queued into the existing External Results Hub bridge.
- New bridge job: `UPSERT_EXTERNAL_MARKET_MAPPING`.
- `AutoSettle` is forced to `false`.
- `RequireAdminReview` is forced to `true`.
- Existing Hub Mapping Manager v1.2.11 remains available as an advanced/debug tool.

## Architecture
Awards App Admin → live provider search → create/link question → External Results Hub bridge → Hub AppMappings/ExternalMarkets → mapped provider watch → review → CategoryResults.

## Scope
This first Awards Manager production slice does not yet scrape official award-show result sites. The next slice can add official award-source adapters (Oscars first) without changing the provider-mapping workflow.
