# Reality TV Inline Admin Actions v1.1.13

## Problem fixed
Reality TV action buttons opened the global **Loading Admin Tools** overlay at 4% while backend requests were running. The page was blurred, the user could not continue working, and normal in-place updates were difficult to see.

## Production behavior
- Reality TV task buttons now use the shared per-button progress indicator and the section message already located beside the action.
- The full-page loader is reserved for normal route navigation.
- Season actions refresh only the open season body after completion.
- The current season remains expanded and the manager scrolls back to the affected section.
- Unavoidable fallback manager reloads use `suppressLoader: true`.
- Frontend asset version `310-reality-tv-inline-admin-actions` forces browsers to fetch the corrected scripts.

## Backend
No backend files changed. No `clasp push` is required for this release.
