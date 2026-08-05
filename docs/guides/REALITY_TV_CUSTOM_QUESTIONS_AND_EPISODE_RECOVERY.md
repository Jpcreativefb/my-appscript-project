# Reality TV Current Episode and Custom Question Help

## “Current Reality TV episode not found”

This means the game question may exist in Game Setup, but its matching row is missing from `RealityEpisodes`.

With v1.1.8, use:

**Save Format & Build Current Episode**

The manager automatically repairs the current episode row and keeps the lock time already stored on the game question whenever available.

## Can custom questions be added more than once?

Yes. There is no one-question limit.

Use this cycle:

1. Enter one question.
2. Choose its answer source.
3. Review the Answer Preview.
4. Select **Save & Build This Custom Question**.
5. Return to the same section and enter the next question.

Saved questions are shown above the form.

## Choosing the answers

### Active individuals / teams from roster

Uses every active roster entry. For a team-based season, each roster row represents a selectable team.

### Active groups / tribes

Uses the current active group or tribe records.

### Groups before merge, individuals after

Uses groups until the manager's `Individual play starts` episode, then switches to active roster participants.

### Yes / No

Creates two answers automatically.

### Manual answers / judges / special choices

Enter one answer per line. Use this for:

- Judges
- Hosts
- Special guests
- Locations
- Challenge types
- Outcomes not stored in the roster

At least two answers are required.

## Question collapse

Select the question header to open or close only that question. After a successful Reality TV pick, the question closes automatically and the next unanswered question opens.
