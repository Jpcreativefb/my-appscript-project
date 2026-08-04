# Production Smoke Test v1.1.1

## Repair the currently blocked game

1. Open **Admin → Manage Games**.
2. Open the Reality TV game.
3. Select **Run Check**.
4. Select **Repair Reality TV Setup**.
5. Let the staged repair finish.
6. Confirm the preflight now lists the main exit question and all enabled extra questions with pickable answers.
7. Activate the game.

## Game Setup verification

1. Open **Categories / Questions / Nominees**.
2. Confirm the main exit question has every eligible participant/team.
3. Confirm every enabled extra question exists.
4. Confirm every created question has at least two valid answers.
5. Confirm a group-only question explains why it was skipped when group data is missing or individual play has started.

## Tribe/group history verification

1. Open **Reality TV Season Manager**.
2. Expand the season and **Participant Group / Tribe History**.
3. Move one test participant to a new group effective Episode 2.
4. Confirm the bio shows starting and later groups.
5. Confirm Episode 1 still shows the starting group.
6. Confirm Episode 2 uses the new group.
7. Set **Individual play starts** to Episode 3.
8. Confirm an immunity/reward question uses groups in Episode 2 and individuals in Episode 3.
9. Confirm group-only questions are not created for Episode 3.

## Regression checks

- Save a normal player pick and refresh.
- Switch between Picks, Leaderboard, and Admin pages.
- Confirm no duplicate questions or answers appear after repeating Repair.
- Confirm historical questions and picks remain unchanged after a group switch.
