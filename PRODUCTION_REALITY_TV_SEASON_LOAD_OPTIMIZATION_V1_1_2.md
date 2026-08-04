# Production Reality TV Season Load Optimization v1.1.2

## Problem

Expanding a Reality TV season could stall or time out. The detail request was not a pure read: it synchronized groups, repaired missing history, ensured template catalogs, and rebuilt contestant group profiles by rereading the complete history sheet for every contestant.

A season with 20–30 contestants could therefore perform dozens of redundant sheet reads plus multiple writes before returning the admin page.

## Fix

The season detail endpoint is now strictly read-only.

- Each required table is read at most once.
- Contestant group profiles are built from one in-memory history index.
- Missing legacy group/history display values are derived in memory and marked as read-only defaults.
- No group, history, question, or settings row is created while a season card is opening.
- Repairs occur only after an explicit Save or Repair action.
- The dashboard summary uses indexed counts instead of repeatedly filtering every table for every season.

## Admin loading UI

The season card now reports:

- Reading roster, episodes, questions, results, and settings in one pass.
- Cold-start notice after seven seconds.
- Safe retry guidance if the request takes unusually long or times out.

## Diagnostics

The response includes admin-only performance metadata with duration and row counts. Loads exceeding five seconds are written to Apps Script logs.

## Validation

A new automated test opens a 30-contestant season and verifies:

- zero spreadsheet writes;
- one read per relevant table;
- complete group-history profiles;
- safe retry UI;
- no legacy sync/repair helpers in the read endpoint.

All 45 repository test files passed.
