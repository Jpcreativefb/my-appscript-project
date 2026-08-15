# Awards Manager Workflow Hotfix — v1.2.16

This smoke-test follow-up makes Awards Manager faster and safer for Fall game creation.

## Player fixes

- Season Survivor / Sole Survivor no longer appears on ordinary Awards or other non-Reality-TV pick games.
- New Awards-created pick questions default to unlimited pick changes until the question locks.
- Admin can explicitly choose no changes or 1/2/3/5 changes per question.
- Live external market labels beside answers use compact provider badges: `K` for Kalshi and `P` for Polymarket.

## Awards Manager workflow

- Search result events can be checked and batch-added to one target Awards App game.
- Batch creation creates one question per selected event and uses all live markets in that event as the initial answer set.
- `View Event` expands the Build or Link Questions workspace directly below the selected event card.
- Target game dropdowns show the game type.
- Question Play Type supports Fixed Points, Confidence, Staked, Wager, and Ranking selection. Non-Hybrid games enforce their own game type; Hybrid games allow per-question choice.
- Question Type selector supports winner/category, Yes/No, head-to-head, over/under, tiebreaker, and ranking metadata.
- Ranking remains visibly marked as in development until the generic Ranking player/scoring engine is completed.

## Awards wager support

- Kalshi/Polymarket probabilities are converted to decimal betting odds when an Awards question is created for Wager/Hybrid wager play.
- Per-answer odds persist through normalized Question/Option storage and remain visible to the Betting engine.
- Official result URLs remain preferred for human result verification; prediction-market provider links remain attached for market data and probability context.

## Safety

- Automatic settlement remains off.
- Administrator review remains required.
- Existing Reality TV, Sports, Racing, and Awards result bridges are not rewritten by this hotfix.
