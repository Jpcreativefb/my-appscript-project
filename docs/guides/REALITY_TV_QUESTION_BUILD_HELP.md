# Reality TV Question Build Help

## Normal workflow

For a normal episode setup, use **Save Format & Build Current Episode** once.

That action saves the episode-question settings and creates or verifies every checked local question and its answers. The questions are usable in the Awards App as soon as the local build completes.

## What Resume Build means

**Resume Build** is a recovery button. It is intended for an interrupted connection, a browser that was closed during a build, an Apps Script timeout, or a previously paused build job.

A label such as:

```text
Resume Build (3/4)
```

means three of the four checked question types have already been created or verified. Select **Resume Build once** to continue from the saved position. The builder reuses completed questions and does not intentionally duplicate them.

You should not need to keep selecting Resume repeatedly during a healthy build. If the connection is interrupted again, refresh the Reality TV Manager and select Resume once more.

## Local questions versus External Results Hub mappings

The local game questions and answers are now completed first. External Results Hub mappings are optional follow-up work and no longer block the playable question build.

A completed local build can therefore report that Hub mappings are deferred. That does not prevent players from viewing or saving picks.

## Common statuses

| Status | Meaning | Action |
|---|---|---|
| Built | The local question and answers were created | No action |
| Verified | Existing local question and answers passed validation | No action |
| Resume Build (3/4) | Three of four selected question types are complete | Select Resume once |
| Hub deferred | Local question is playable; Hub mapping is waiting | No action needed for gameplay |
| Connection timed out | Browser lost the response before final confirmation | Refresh, then select Resume once |

## Before activating a game

Confirm that:

1. Every enabled question has at least two valid answers, unless its format intentionally supports one choice.
2. The current episode question pack shows built or verified.
3. The main elimination question contains the active contestants.
4. Player Pick Rules are saved.
5. The game lock date and time are correct.

Use **Manage Games → Run Check** to validate the game before activation. If the check reports missing Reality TV questions or answers, use **Repair Reality TV Setup**.

## When to investigate instead of repeatedly resuming

Stop selecting Resume and inspect the Apps Script execution log when:

- The counter does not advance after two separate Resume attempts.
- The same local question repeatedly reports an error.
- A question is built but has no answers.
- The build job remains busy after refreshing the manager.
- Apps Script reports a permission or spreadsheet access error.

Record the exact on-screen message, browser console error, and Apps Script execution error for diagnosis.
