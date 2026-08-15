# Reality TV Mass Voting and Approval Resilience v1.1.14

## Purpose

This release improves episode vote entry and removes two approval failure modes reported in production:

- approval jobs timing out because the approval worker held a broad Apps Script lock while settlement code attempted another lock;
- temporary Google Sheets service failures leaving an approval or question approval stuck with a permanent last error.

It also collapses every Show Format & Episode Questions section by default so administrators can open only the section they need.

## Tribe-restricted mass voting

The Episode Vote Details panel now detects the voting tribe or council using the episode results already recorded by the manager.

Detection order:

1. a finalized or pending Tribe Going to Tribal Council result;
2. the immunity winner, when exactly one other active tribe can be inferred as the losing tribe;
3. all active contestants after merge or when only one active group remains;
4. a manual administrator-selected tribe when the episode structure is unusual.

The manager creates one ballot row for every eligible member of the selected tribe. Each target dropdown contains only members of that same voting tribe. The administrator saves the entire round with one action.

An Add Outside Voter control is available for unusual twists. The outside contestant may cast a ballot, but the target remains restricted to the selected voting tribe. This prevents accidental cross-tribe targets while preserving special-game flexibility.

Separate council cards can be saved for two tribes attending different Tribal Councils. Existing single-ballot editing remains available for corrections.

## Approval processing repair

Main elimination approval and supplemental question approval now use a short claim-and-release mutex rather than holding the global lock throughout settlement, roster changes, category updates, and optional Hub work.

The worker:

- briefly claims the next stage;
- releases the lock before heavy spreadsheet work;
- retries temporary Spreadsheet service failures with bounded backoff;
- preserves stage progress so Resume can continue safely;
- treats duplicate clicks as an already-processing response instead of starting competing jobs;
- records a final error only after the retry budget is exhausted.

This removes the self-created lock timeout while retaining duplicate-processing protection.

## Collapsed question-pack sections

For existing seasons, the following sections now start closed:

1. Show format
2. Episode wording and scoring
3. Display and layout
4. Extra Episode Questions
5. Custom Questions

The parent Show Format & Episode Questions panel also starts closed. The administrator can open section 4 directly without closing the other sections first.

## Compatibility

- Existing vote rows remain compatible.
- Existing episode, question, result, roster, and Hub identifiers are unchanged.
- The single-vote API remains available.
- The new bulk vote action is additive.
- External Results Hub work remains non-blocking and is not required for local approval completion.

## Validation

- 56 regression test files passed.
- 151 JavaScript files passed syntax validation.
- Bulk tribe voting was tested with two tribe members and one explicitly added outside voter.
- Target restrictions, duplicate-voter protection, retry behavior, brief approval claims, collapsed sections, and cache-version synchronization were tested.
