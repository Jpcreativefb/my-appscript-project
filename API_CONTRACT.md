# API Contract

This document describes the current working API contract between:

```txt
Cloudflare Frontend
        ↓
Apps Script API
        ↓
Google Sheets
```

The API is currently served by:

```txt
backend/Api.js
```

Main Apps Script entry point:

```js
function doGet(e)
```

Current default game:

```txt
oscars-2026
```

---

## General Notes

The API currently uses GET requests with query parameters.

Example:

```txt
?action=getCategories&gameId=oscars-2026
```

The frontend API wrapper lives in:

```txt
frontend/js/api.js
```

Frontend config lives in:

```txt
frontend/js/config.js
```

The current response format is mixed:

```txt
Some endpoints return arrays directly.
Some endpoints return objects.
Some endpoints include success true/false.
```

Do not change response shapes without updating both this file and the frontend API/page code.

---

## Endpoint: API Health / Default

### Request

```txt
?action=
```

or no action.

### Response

```json
{
  "success": true,
  "message": "API running",
  "gameId": "oscars-2026"
}
```

### Notes

Used to confirm the Apps Script deployment is reachable.

---

## Endpoint: Login

### Request

```txt
?action=login&username=TEST_USER&pin=TEST_PIN
```

### Frontend Function

```js
apiLogin(username, pin)
```

### Current Response Shape

Success response includes:

```json
{
  "success": true,
  "username": "TEST_USER"
}
```

There may be additional fields depending on backend user data.

Failure response:

```json
{
  "success": false,
  "message": "Invalid login"
}
```

or:

```json
{
  "success": false,
  "message": "Missing username or PIN"
}
```

### Frontend Usage

Login stores the returned object as session data.

Current session flow:

```txt
auth.js → setSession(res)
state.js → APP_STATE.session
app.js → auth guard
```

Important:

```txt
The login response must include username at the root level.
```

---

## Endpoint: Get Categories

### Request

```txt
?action=getCategories&gameId=oscars-2026
```

### Frontend Function

```js
apiGetCategories(gameId)
```

### Current Response Shape

This endpoint currently returns an array directly:

```json
[
  {
    "gameId": "oscars-2026",
    "id": "best-picture",
    "name": "Best Picture",
    "section": "Oscars",
    "image": "https://...",
    "displayOrder": 1,
    "layoutType": "image",
    "shortName": "Picture",
    "locked": true,
    "lockDateTime": "2027-03-15T01:30:00.000Z",
    "points": 20,
    "maxChanges": 4,
    "changePenalty": 4,
    "countsAsStatue": true,
    "scoreVersion": "",
    "winnerNomineeId": "",
    "favoriteNomineeId": "",
    "groupId": "Feature Films",
    "parentCategoryId": "",
    "followUpCategoryId": "",
    "followUpMapJSON": "",
    "predictionGame": true,
    "communityRank": true,
    "nominees": [
      {
        "id": "bugonia",
        "name": "Bugonia",
        "shortAnswer": "Bugonia",
        "movieId": "bugonia-2026",
        "movie": "Bugonia",
        "person": "",
        "image": "https://..."
      }
    ]
  }
]
```

### Frontend Usage

Used by:

```txt
frontend/js/pages/picks.js
frontend/js/pages/dashboard.js
```

Frontend currently supports direct array response:

```js
const categories =
  Array.isArray(categoriesRes)
    ? categoriesRes
    : categoriesRes.categories || [];
```

### Verified Behavior

```txt
Returns 46 categories for oscars-2026.
Categories include nominees.
Some categories may be locked.
Missing images are handled by frontend CSS.
```

---

## Endpoint: Get My Picks

### Request

```txt
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
```

### Frontend Function

```js
apiGetMyPicks(username, gameId)
```

### Current Response Shape

```json
{
  "picks": {
    "best-picture": "bugonia"
  },
  "changeCounts": {
    "best-picture": 0
  },
  "originalPicks": {
    "best-picture": "bugonia"
  }
}
```

If user has no picks:

```json
{
  "picks": {},
  "changeCounts": {},
  "originalPicks": {}
}
```

Error example:

```json
{
  "error": true,
  "message": "Error message"
}
```

### Frontend Usage

Used by:

```txt
frontend/js/pages/picks.js
frontend/js/pages/dashboard.js
```

Current picks are stored in:

```js
APP_STATE.picks
```

---

## Endpoint: Save Pick

### Request

```txt
?action=savePick&username=TEST_USER&categoryId=best-picture&nomineeId=bugonia&gameId=oscars-2026
```

### Frontend Function

```js
apiSavePick(username, categoryId, nomineeId, gameId)
```

### Current Success Response Shape

New or changed pick:

```json
{
  "success": true,
  "gameId": "oscars-2026",
  "categoryId": "best-picture",
  "nomineeId": "bugonia",
  "originalNomineeId": "bugonia",
  "changeCount": 0
}
```

Already saved pick:

```json
{
  "success": true,
  "message": "Pick already saved",
  "gameId": "oscars-2026",
  "categoryId": "best-picture",
  "nomineeId": "bugonia",
  "originalNomineeId": "bugonia",
  "changeCount": 0
}
```

Locked category:

```json
{
  "success": false,
  "message": "Category is locked"
}
```

Change limit reached:

```json
{
  "success": false,
  "message": "Change limit reached",
  "changeCount": 4,
  "maxChanges": 4
}
```

### Verified Behavior

```txt
New pick inserts a row.
Changed pick updates the existing row.
Changed pick does not append duplicate rows.
ChangeCount increments when nominee changes.
LastUpdated updates when nominee changes.
Locked categories reject saves.
```

### Important Backend Rule

Existing picks are matched by:

```txt
GameId + Username + CategoryId
```

If a matching row exists, the row must be updated in place.

Do not append duplicate rows for changed picks.

### Related Backend Files

```txt
backend/engines/PicksEngine.js
backend/repositories/PicksRepo.js
backend/services/AppCache.js
```

---

## Endpoint: Leaderboard

### Request

```txt
?action=leaderboard&gameId=oscars-2026
```

### Frontend Function

```js
apiLeaderboard(gameId)
```

### Current Response Shape

This endpoint currently returns an array directly:

```json
[
  {
    "user": "TestUser",
    "total": 0,
    "remaining": 4,
    "max": 4,
    "statues": 0,
    "eliminated": false,
    "winChance": 100
  },
  {
    "user": "Stacey",
    "total": 0,
    "remaining": 28,
    "max": 28,
    "statues": 0,
    "eliminated": false,
    "winChance": 100
  }
]
```

### Frontend Usage

Used by:

```txt
frontend/js/pages/leaderboard.js
frontend/js/pages/dashboard.js
```

Frontend currently supports direct array response:

```js
const rows =
  Array.isArray(res)
    ? res
    : res.leaderboard || [];
```

### Verified Behavior

```txt
Leaderboard renders on Cloudflare.
Dashboard reads user rank from leaderboard.
```

---

## Endpoint: User Breakdown

### Request

```txt
?action=userBreakdown&username=TEST_USER&gameId=oscars-2026
```

### Current Response Shape

Expected to return an array of category-level user scoring details.

Example expected shape:

```json
[
  {
    "category": "best-picture",
    "pick": "bugonia",
    "winner": "",
    "status": "pending",
    "points": 20,
    "originalNomineeId": "bugonia",
    "changeCount": 0
  }
]
```

### Status

```txt
Backend route exists.
Frontend is not currently wired to this endpoint.
Needs future verification before production use.
```

---

## Frontend API Wrapper

File:

```txt
frontend/js/api.js
```

Current core behavior:

```txt
Builds URL from CONFIG.API_URL.
Adds action query parameter.
Adds provided params.
Fetches response.
Parses JSON.
Logs API request.
Handles non-JSON response safely.
Returns { success:false, message:"Network error" } on fetch failure.
```

Current frontend API functions:

```js
apiLogin(username, pin)
apiGetCategories(gameId)
apiGetMyPicks(username, gameId)
apiSavePick(username, categoryId, nomineeId, gameId)
apiLeaderboard(gameId)
getPicks(username)
```

`getPicks(username)` is a temporary legacy alias for `apiGetMyPicks`.

---

## Current Verified Frontend API Consumers

```txt
frontend/js/pages/dashboard.js
frontend/js/pages/picks.js
frontend/js/pages/leaderboard.js
frontend/js/auth.js
```

---

## Known Contract Inconsistencies

The API currently has mixed response shapes.

Array responses:

```txt
getCategories
leaderboard
```

Object responses:

```txt
login
getMyPicks
savePick
userBreakdown
default health response
```

Future standardization may use:

```json
{
  "success": true,
  "data": {}
}
```

But do not change this until frontend and backend are updated together.

---

## Current Production-Safe Rule

Before changing any API response shape:

```txt
1. Update this API_CONTRACT.md file
2. Update backend endpoint
3. Update frontend API wrapper
4. Update frontend page consumers
5. Test direct backend URL
6. Test local frontend
7. Test Cloudflare frontend
8. Commit and push
```

---

## Manual Test Checklist

### Backend Direct URL Tests

```txt
?action=getCategories&gameId=oscars-2026
?action=leaderboard&gameId=oscars-2026
?action=login&username=TEST_USER&pin=TEST_PIN
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
?action=savePick&username=TEST_USER&categoryId=TEST_CATEGORY&nomineeId=TEST_NOMINEE&gameId=oscars-2026
```

### Frontend Tests

```txt
Login works
Dashboard loads
Dashboard stats load
Picks loads categories
Picks loads saved selections
Changing picks saves successfully
Picks sheet updates existing row
Leaderboard loads
Refresh keeps session and saved picks
Logout clears session
```

---

## Future API Improvements

Possible future improvements:

```txt
Add Cloudflare Worker API proxy
Move all write operations to POST
Standardize responses to { success, data, error }
Add profile endpoint
Add dashboard summary endpoint
Add admin-only endpoints
Add stronger auth/session token validation
Add API versioning
```