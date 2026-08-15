# External Results Hub Mapping Manager v1.2.11

Adds a spreadsheet sidebar so administrators can create and maintain `AppMappings` without editing rows manually.

## Workflow

1. Open **External Results Hub → Open Mapping Manager**.
2. Choose Kalshi or Polymarket.
3. Search discovered `ExternalMarkets` and choose a market.
4. Choose the provider outcome that represents a win.
5. Choose the connected Awards App Game → Question → Answer/Nominee.
6. Save the mapping.
7. Existing mappings can be edited, activated, or deactivated from the same sidebar.

## Safety

- `AutoSettle` is always `FALSE`.
- `RequireAdminReview` is always `TRUE`.
- The UI does not expose a delete or auto-settlement control.
- The existing mapped-provider watch is reused; only active `AppMappings` are polled.
- Existing ReviewQueue / App Inbox delivery paths are unchanged.

## Changed files

- `external-engines/external-results-hub/HubCore.js` — one menu item added by installer.
- `external-engines/external-results-hub/MappingManager.js` — new server-side Mapping Manager.
- `external-engines/external-results-hub/MappingManager.html` — new sidebar UI.
- `tests/external_results_hub_mapping_manager_v1211_tests.js` — regression guard.
