# Reality TV Build Status UI Fix — v1.1.10

## Problem
Selecting the **Current Episode Build Status** header produced a permanent **Starting…** progress message. The header is an expand/collapse disclosure, not a backend build action. The shared admin UI matched the words “Build Status” and incorrectly attached action progress even though no API request was expected.

## Fix
- Marked the Reality TV build-status disclosure with `data-admin-no-progress="true"`.
- Updated the shared admin progress detector to ignore buttons with `aria-expanded` and buttons inside `summary` elements.
- Preserved the real **Build / Repair Now**, **Resume Automatic Build**, and **Verify Again** actions inside the expanded stage panel.

## Result
- Clicking **Current Episode Build Status** only opens or closes the stage panel.
- No false **Starting…** state is created.
- The actual build button starts or resumes the saved build and receives normal API progress.
