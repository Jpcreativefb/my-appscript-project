# Production Smoke Test v1.1.15

1. Open a Reality TV season with an approval stuck in `APPROVING`.
2. Select **Reset Stuck Approval**, then **Resume Approval**.
3. Confirm the episode is not settled twice and the next episode is not duplicated.
4. Submit a multiple elimination with two contestants.
5. Approve it and verify both contestants are winners in `CategoryResults` and both matching user picks earn normal points.
6. Confirm a no-elimination result still settles as a push.
7. Approve a normal main elimination with at least two contestants remaining.
8. Confirm the next episode is created automatically with the same enabled Extra Questions and values.
9. In the new episode, uncheck one Extra Question, change another question's points, and select **Update This Episode Only**.
10. Confirm the one-off changes affect only that episode and the season template defaults remain unchanged.
11. Create a custom question with **This episode only** checked.
12. Confirm it appears in the current episode but is disabled for future episodes.
13. Approve an immunity or reward question and confirm it does not create another episode.
14. Hard-refresh the frontend and repeat one reset/override action to verify the v1.1.15 cached route is active.
