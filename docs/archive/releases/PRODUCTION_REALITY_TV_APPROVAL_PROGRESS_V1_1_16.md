# Reality TV Staged Approval Progress v1.1.16

## Why approval could appear frozen

The previous approval loop performed several separate jobs while displaying only the queue's last text value. A normal main-elimination approval can touch CategoryResults, category settings, scoring, the contestant roster, group history, the episode row, the next episode, and every enabled Extra Question. Google Sheets service retries can lengthen any of those writes.

Creating the next episode row is usually not the longest step. Building each Extra Question and its answer rows is commonly the largest variable part, especially with a large roster. Optional External Results Hub access could also add delay when configured.

## New visible stages

1. **Settle Result** — write winners or push, score picks, finalize the episode, and update the roster.
2. **Create Next Episode** — create the next episode and its main elimination question.
3. **Build Extra Questions** — create and verify enabled questions one at a time with a visible `N of N` count.
4. **Finalize** — save final approval records and perform optional Hub status work.
5. **Ready** — the approval is complete.

The progress bar continues animating while each Apps Script request is active. It shows total elapsed time and an approximate remaining time. If an estimate expires, the UI says the stage is taking longer than usual rather than displaying a false zero. If no heartbeat is saved for 150 seconds, the main approval is marked as potentially stalled and the existing Reset/Resume recovery path remains available.

## Performance and resilience changes

- Extra Questions advance one template per approval request instead of one long 20+ second block.
- The approval loop permits enough continuations for large question packs.
- Existing v1.1.15 `SYNC_HUB` rows remain backward compatible and display as Finalize.
- Unconfigured External Results Hub work is skipped immediately.
- Configured Hub work remains best-effort and does not define local question readiness.
- Supplemental question approvals now display progress and timing too.

## Typical timing

Actual timing depends on Google Sheets load, roster size, and the number of enabled questions. A four-question episode will commonly require several short requests rather than one invisible wait. The displayed ETA is intentionally approximate and updates after every server checkpoint.
