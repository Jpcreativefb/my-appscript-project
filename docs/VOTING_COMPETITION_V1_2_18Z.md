# PATTC Predicts v1.2.18z — Voting / Competition

## Purpose
Adds a standalone **Voting / Competition Game** without replacing the existing movie/awards Votes/Ballot engine or the existing prediction Ranking engine.

## Participant entry
Each signed-in participant can submit one competition entry per game. The participant form supports:

- Participant / team name
- Dish / entry name
- Direct phone camera photo or existing-device photo
- Description
- Ingredients / useful information
- Assigned or participant-entered display number
- Assigned or participant-entered display color
- Up to 30 admin-defined custom fields (short text, long text, number, dropdown, checkbox, yes/no)
- Admin-controlled required fields and voter visibility

Uploaded photos are prepared in the browser (maximum side 1400 px, WebP when supported by the current UI) and the backend rejects images larger than 4 MB after preparation. Images use the existing Awards App Drive image location.

## Approval and publishing
Admin settings control whether entries publish automatically or require review. Participant rows have Submitted / Approved / Rejected status plus a separate Published flag and an admin note. Participant edits can be allowed or locked independently.

## Display card controls
Admin can choose:

- Number: automatic sequential / admin-assigned / participant-entered
- Color: automatic palette / admin-assigned / participant-entered / none
- Show/hide participant name to support blind judging
- Show/hide photo, description, and ingredients/info

The selected display-card metadata is shown with each voting entry.

## Voting methods
The standalone competition supports:

- Rank Top N
- Rank All Entries
- Pick Favorite Only

Ranking interface can be:

- Auto (drag on fine-pointer devices, arrows on coarse-pointer/mobile devices)
- Numbered ranking
- Drag & Drop
- Up / Down arrows

Drag mode always retains arrow controls as an accessible fallback.

## Scoring and results
Admin can use custom rank points (default 10, 7, 5, 3, 1) or Borda scoring. Results aggregate points, first-place votes, Top-3 appearances, and average rank. Tie ordering uses points, first-place votes, Top-3 appearances, average rank, then entry name; exact ties share a place.

Results visibility can be hidden, live, or released after voting closes. Blind competitions do not expose participant names in the player results payload when participant names are hidden.

## Data isolation / compatibility
The new feature uses dedicated sheets:

- `VotingCompetitionSettings`
- `VotingParticipants`
- `VotingCompetitionBallots`

The release does **not** modify the existing `VotingEngine.js`, `Ballot.js`, `VotingValidation.js`, `VotingUtils.js`, or `RankingGameEngine.js`. Existing movie/awards voting and prediction-ranking data remain separate.

## Current release boundary
Participant self-entry is authenticated through the existing PATTC Predicts account/session system. v1.2.18z does not add anonymous guest-entry tokens or QR registration links yet. One participant entry per signed-in account per competition is supported in this first production version.
