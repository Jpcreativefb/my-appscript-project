# Reality TV Approval Recovery and Episode Question Plans v1.1.15

## Completed behavior

### Reset Stuck Approval

The elimination review card displays **Reset Stuck Approval** whenever a queue row remains `APPROVING`. The reset checks whether the episode is final and whether the next episode already exists, then resumes from `SETTLE`, `BUILD_NEXT`, or `SYNC_HUB` as appropriate.

### Multiple eliminations

A surprise double, triple, or larger elimination no longer pushes the main question. Every selected eliminated contestant is written as a winner in `CategoryResults`. A user who selected any one of those contestants receives the category's normal fixed points.

A true no-elimination episode still pushes the question.

### Automatic next episode

Approving the main elimination creates the next episode automatically when more than one active contestant remains. The next episode inherits the enabled season question templates and their points, display, image, wording, and answer-source values.

Approving immunity, reward, or another Extra Question never creates the next episode.

### One-episode changes

**Update This Episode Only** applies the checked Extra Questions and visible point/display values to the current open episode without changing future defaults. Unchecked questions are removed only when no pick, result, or approval history depends on them.

Custom questions include a **This episode only** option. These questions build immediately but are saved disabled for future episodes.

## Deployment

This release changes Apps Script backend and Cloudflare frontend files. Run `clasp push`, update the existing Apps Script web-app deployment to a new version, push the branch to GitHub, and allow Cloudflare Pages to deploy the frontend.
