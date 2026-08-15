# Awards Manager Batch Builder — v1.2.16

This smoke-test follow-up replaces the intermediate Awards workflow package with a faster event-to-game builder for Fall awards games.

## Admin workflow

1. **Game & Source Setup**
   - Choose the Awards App Game once.
   - Optional Official Website URL becomes the preferred result/reference source.
   - Choose the default play/scoring type, Text/Compact/Image question display, market-probability visibility, number of pick changes, section, points, and starting question order.
2. **Find & Select Events**
   - Search Kalshi, Polymarket, or both.
   - Check any number of events, or check/clear all current results.
   - `View Event` still expands Build/Link directly under the event.
   - `Market Grid` opens a provider-market inspection popup.
3. **Configure & Build Questions**
   - `Load Selected Events & Questions` fetches every checked event with progress and creates an editable local grid.
   - Every question can independently edit question text, section, points, display order, Text/Compact/Image layout, play type (Hybrid), pick-change limit, and probability display.
   - `Markets / Answers` opens an editable market grid where each answer/market has separate **Include** and **Show Odds** switches plus an editable answer label.
   - `Build All Loaded Questions` creates the enabled questions sequentially so a large awards show does not depend on one long Apps Script request.

## Probability behavior

- Question-level setting: Use Game Setting / Show / Hide.
- Answer-level setting: Show Odds on/off.
- Hiding K/P percentages does **not** remove provider market data or wager odds from storage.
- Disabled answers/markets are not created as nominees and are not mapped into the External Results Hub.

## Existing-question linking

`View Event` retains a **Link Provider Market to an Existing Question** section. Choose one provider market, an existing Awards App question, and map provider outcomes to existing answers.

## Safety

- Official result URL remains preferred when supplied.
- Kalshi/Polymarket remain read-only market sources.
- External Results Hub mappings still require administrator review.
- Automatic settlement remains OFF.
- Generic Ranking remains development-only even though the Awards Manager can prepare ranking configuration.

## Release marker

Frontend/service-worker marker: `323-awards-batch-builder-v1216`

## Automated validation

Expected production gate:

```text
PASS: 117 JavaScript files
PASS: API/app mirrors synchronized
PASS: 83 regression tests
PASS: v1.2.16 release/security contract
ALL PRODUCTION CHECKS PASSED
```
