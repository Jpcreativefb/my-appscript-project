# R3 collapse and responsive editing candidate

## Status

Implemented locally; focused automated checks PASS. **Real-browser acceptance is
BLOCKED / NOT PASSED.** No Publish, deployment, commit, push, or full certification
was performed. Awards/Stakes files were not changed.

## Files changed in this batch

- `frontend/js/ownerVisualStudioR3.js`
- `tests/owner_visual_studio_r3_tests.js`
- `tests/owner_visual_studio_r3_selection_tests.js`
- `tests/owner_visual_studio_r3_responsive_collapse_tests.js` (new)
- `docs/owner-visual-studio-r3-feature-batch.md` (this report, new)

The existing disposable preview's copy of `frontend/js/ownerVisualStudioR3.js` was
also updated under `/private/var/folders/p_/lxl5mgt9723frzkwbfq60n900000gn/T/pattc-studio-r3-0hckyffc/`.
Production entrypoints and the persistence controller/adapter were not changed.

## Behavior

Desktop remains the base manifest. Optional `responsive.tablet` and
`responsive.mobile` contain item/style, visibility, and collapse overrides.
Tablet and Mobile inherit directly from Desktop, independently of each other.
Per-control labels identify Desktop base, Using Desktop, Custom Tablet, and Custom
Mobile. Reset Override removes the selected property. Visibility has its own reset.

Responsive controls cover width, height, padding, gap, body/header font size,
scale, alignment, image object-fit/position, columns, visibility, and collapse.
Branding controls remain shared. Player breakpoints are Mobile <=600 CSS pixels,
Tablet 601–1024, Desktop >1024. Studio explicitly resolves the selected view and
constrains the page to 390px or 768px (capped to available space). This constrains
the live page; it does not change browser-wide CSS media queries.

Section Layouts exposes Collapsible, Default State, Collapse Style, and Remember
Player State. Open/Close Section changes only temporary Studio state, retaining
selection. The blind uses measured max-height, overflow, a 240ms transition, and
reduced-motion detection. Native details remain open while their body is animated.
Headers remain visible and a keyboard-accessible toggle is provided. Collapsible
OFF removes the body wrapper and makes native details stay open.

Player state is optional browser local storage under `pattc:r3:collapse:`, scoped
by game/page/section/breakpoint. Studio ignores and never writes player state.
The manifest stays in the existing Appearance Draft/Publish/Version pipeline;
there are no device-specific Appearance rows and no gameplay writes.

## Focused verification — PASS

Run with Node from the repository:

- `node --check frontend/js/ownerVisualStudioR3.js`
- `node tests/owner_visual_studio_r3_tests.js`
- `node tests/owner_visual_studio_r3_dom_tests.js`
- `node tests/owner_visual_studio_r3_selection_tests.js`
- `node tests/owner_visual_studio_r3_responsive_collapse_tests.js`

Coverage includes ON/OFF, Open/Closed, blind/instant, reduced motion, retained
selection, local remembered state and OFF reload behavior, Desktop base,
Tablet/Mobile inheritance and custom overrides, reset, propagation to inherited
values only, breakpoint visibility/collapse isolation, preview width restoration,
and responsive/collapse Draft reload. The existing real frontend-wrapper/backend
serializer test now carries responsive/collapse payloads through its in-memory
Sheet round trip. All test writes are doubles, not live writes.

## Real-browser attempt — BLOCKED

Target: existing Chrome tab at `http://127.0.0.1:8793/app#betting`, previously
accepted `nfl-sports-wager / visual-studio-draft / betting` scope.

- Read the existing betting DOM before changes; confirmed its hero uses a classed
  title rather than a heading, and added support for that header structure.
- Updated only the existing disposable preview asset. Its HTTP response was 200.
- Browser control began timing out on reload and subsequent inspection commands.
- Native Chrome controls reached the local page and clicked the Studio launcher;
  it remained at `Loading fresh Studio Draft…` without opening the editor.
- Reconnecting the browser tools and attempting a fresh local tab also timed out.
- No feature-control edit, live feature Draft save, feature hard-refresh
  restoration, or visual animation/viewport acceptance was verified.

The loading failure's cause is unresolved. It must not be interpreted as a passing
browser test or assumed to be unrelated to the candidate. Resume browser acceptance
on the existing safe scope once Chrome control and the fresh Draft read respond.
Do not Publish or run full certification before that gate is complete.

## Workspace boundary

The workspace already contained modified R2 files and numerous untracked R3,
fixture, certification, and local preview artifacts at the start. The tracked
`git diff --stat` at the end remains the pre-existing three-file R2 change set
(3152 insertions, 131 deletions); this batch's R3 files are still untracked, so
that tracked diff does not measure this feature batch. No unrelated cleanup was
performed.
