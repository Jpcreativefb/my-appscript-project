# Project Structure

This project is split into two separate application layers:

1. Backend: Google Sheets + Google Apps Script API
2. Frontend: Cloudflare-hosted browser application

The goal is to keep backend and frontend code separated, tested, committed, and deployable from GitHub across two Mac workstations.

---

## Final Architecture

```txt
Cloudflare Frontend
        ↓
Cloudflare Pages
        ↓
Apps Script API
        ↓
Google Sheets data
```

Future production hardening may add a Cloudflare Worker API proxy:

```txt
Cloudflare Frontend
        ↓
Cloudflare Worker API Proxy
        ↓
Apps Script API
        ↓
Google Sheets data
```

For now, the Cloudflare frontend can call the Apps Script API directly.

---

## Repository Layout

```txt
my-appscript-project/

├── backend/
│   ├── Api.js
│   ├── App.js
│   ├── appsscript.json
│   ├── core/
│   ├── admin/
│   ├── repositories/
│   ├── engines/
│   └── services/
│
├── frontend/
│   ├── index.html
│   ├── app.html
│   ├── css/
│   │   ├── styles.css
│   │   ├── components.css
│   │   ├── pages.css
│   │   └── picks.css
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── state.js
│   │   ├── utils.js
│   │   ├── app.js
│   │   └── pages/
│   │       ├── dashboard.js
│   │       ├── picks.js
│   │       └── leaderboard.js
│   └── pages/
│
├── PROJECT_STRUCTURE.md
└── README.md
```

---

## Backend Purpose

The backend lives in:

```txt
backend/
```

The backend runs inside Google Apps Script.

The backend is responsible for:

```txt
API routing
authentication
game validation
category loading
category settings
pick saving
pick loading
leaderboard data
scoring/results logic
Google Sheets reads/writes
cache management
```

The main backend API entry point is:

```txt
backend/Api.js
```

The active API entry point should be:

```js
function doGet(e)
```

There should only be one active `doGet(e)` in the backend.

---

## Backend Allowed APIs

Backend code may use Apps Script/server APIs such as:

```txt
SpreadsheetApp
ContentService
CacheService
PropertiesService
LockService
Logger
Utilities
```

Backend code must not use browser-only APIs such as:

```txt
document
window
localStorage
querySelector
getElementById
addEventListener
innerHTML
createElement
```

If those appear in backend files, they are likely old frontend contamination and should be removed or moved to the frontend.

---

## Frontend Purpose

The frontend lives in:

```txt
frontend/
```

The frontend runs in the browser and is deployed through Cloudflare Pages.

The frontend is responsible for:

```txt
login screen
app shell
navigation
page rendering
calling backend API
displaying categories
displaying picks
saving picks from UI
displaying leaderboard
CSS/layout/responsive design
```

Frontend API calls should go through:

```txt
frontend/js/api.js
```

Frontend configuration should live in:

```txt
frontend/js/config.js
```

Shared frontend helpers should live in:

```txt
frontend/js/utils.js
```

Page-specific code should live in:

```txt
frontend/js/pages/
```

---

## Frontend Allowed APIs

Frontend code may use browser APIs such as:

```txt
document
window
localStorage
fetch
DOM events
querySelector
getElementById
```

Frontend code should not directly use Apps Script APIs such as:

```txt
SpreadsheetApp
ContentService
LockService
PropertiesService
CacheService
```

---

## Cloudflare Deployment

The active frontend deployment is now Git-connected through Cloudflare Pages.

Cloudflare Pages should deploy from:

```txt
GitHub repo: Jpcreativefb/my-appscript-project
Branch: architecture-cleanup
Build output directory: frontend
```

The old drag-and-drop Cloudflare Pages deployment should be considered obsolete once the Git-connected deployment is fully verified.

The deployed Cloudflare frontend has been verified to:

```txt
load app.html
load config.js
load api.js
run getFrontendGameId()
call apiGetCategories()
render Picks
save Picks
render Leaderboard
```

---

## Apps Script Deployment

The backend is deployed through Google Apps Script.

When backend files are changed locally, Apps Script must be updated and redeployed.

Typical backend deployment flow:

```bash
clasp push
```

Then in Apps Script:

```txt
Deploy → Manage deployments → Edit pencil → Deploy
```

If not using clasp, backend file changes must be copied manually into the Apps Script editor and then redeployed.

---

## Verified Backend Endpoints

The following Apps Script API endpoints have been tested:

```txt
?action=getCategories&gameId=oscars-2026
?action=leaderboard&gameId=oscars-2026
?action=login&username=TEST_USER&pin=TEST_PIN
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
?action=savePick&username=TEST_USER&categoryId=TEST_CATEGORY&nomineeId=TEST_NOMINEE&gameId=oscars-2026
```

Verified backend behavior:

```txt
getCategories returns category array
leaderboard returns leaderboard array
login returns success response
getMyPicks returns saved picks
savePick saves new picks
savePick updates existing picks
savePick respects locked categories
savePick respects change validation
```

---

## Verified Frontend Features

The following frontend flows have been tested locally and/or on Cloudflare:

```txt
app.html loads correctly
config.js loads correctly
api.js loads correctly
utils.js loads correctly
getFrontendGameId() returns oscars-2026
apiGetCategories() returns live backend categories
Picks page renders live categories
Picks page loads saved user picks
Clicking nominee saves pick through backend
Saved pick remains selected after refresh
Changing an existing pick updates the same Picks sheet row
Changing an existing pick does not append duplicate rows
Leaderboard page renders live backend leaderboard data
Picks card images are normalized and do not overflow
Leaderboard cards are styled and readable
```

---

## Picks Behavior Rule

The Picks sheet should behave like this:

```txt
New pick:
User + GameId + CategoryId does not exist
→ insert a new row

Changed pick:
User + GameId + CategoryId already exists
→ update the existing row
→ do not append a duplicate row
→ increment ChangeCount when nominee changes
→ update LastUpdated
```

This is intentional and should be preserved.

---

## Known Backend Architecture Notes

`PicksEngine.js` expects `PicksRepo` to be an object-style repository.

Expected repository methods:

```js
PicksRepo.getAllPicks()
PicksRepo.updatePick(rowNumber, updatesObject)
PicksRepo.insertPick(row)
PicksRepo.flush()
```

`PicksRepo.updatePick()` should accept an object where keys are sheet column numbers and values are the values to write.

Example:

```js
PicksRepo.updatePick(
  existingRow,
  {
    [col.nominee + 1]: nomineeId,
    [col.lastUpdated + 1]: now,
    [col.changes + 1]: changeCount + 1
  }
);
```

The repository should update those cells on the existing row.

---

## Cache Architecture Notes

The cache layer now uses:

```txt
backend/services/AppCache.js
```

The custom cache object should be:

```js
var AppCache = {
  clearPicksCaches,
  clearAppCaches,
  clearGameCaches
};
```

Backend code should call:

```js
AppCache.clearPicksCaches()
```

Do not call:

```js
CacheService.clearPicksCaches()
```

because `CacheService` is Google’s built-in Apps Script cache service and does not contain custom app methods.

---

## Current Important Files

Backend:

```txt
backend/Api.js
backend/engines/PicksEngine.js
backend/repositories/PicksRepo.js
backend/services/AppCache.js
backend/engines/CategoriesEngine.js
backend/engines/GamesEngine.js
backend/engines/SettingsEngine.js
backend/engines/ScoringEngine.js
backend/engines/ResultsEngine.js
```

Frontend:

```txt
frontend/app.html
frontend/index.html
frontend/js/config.js
frontend/js/api.js
frontend/js/state.js
frontend/js/utils.js
frontend/js/app.js
frontend/js/pages/picks.js
frontend/js/pages/leaderboard.js
frontend/css/picks.css
frontend/css/pages.css
```

---

## Testing Workflow

Use this process for every feature:

```txt
1. Test backend endpoint directly in browser
2. Confirm JSON response shape
3. Wire or update frontend API function
4. Wire frontend page
5. Test in browser console
6. Test actual UI
7. Refresh and confirm persistence
8. Check Google Sheet data if the feature writes data
9. Commit small working checkpoint
10. Push to GitHub
11. Verify Cloudflare deployment if frontend changed
```

Do not clean or refactor unrelated files during feature wiring.

---

## Backend Test Checklist

Before wiring frontend features, test backend endpoints directly.

Example:

```txt
?action=getCategories&gameId=oscars-2026
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
?action=savePick&username=TEST_USER&categoryId=TEST_CATEGORY&nomineeId=TEST_NOMINEE&gameId=oscars-2026
?action=leaderboard&gameId=oscars-2026
```

Expected:

```txt
Backend returns valid JSON
No Apps Script error page
No ReferenceError
No frontend/browser API errors
```

---

## Frontend Test Checklist

After frontend changes, test:

```txt
app.html loads
Login works
Picks page loads
Categories render
Saved picks appear selected
Changing a pick saves successfully
Changing a pick updates existing sheet row
Refreshing keeps saved selection
Leaderboard loads
No [object Promise] appears
No escapeHtml is not defined error
No major layout overflow
```

---

## Git Workflow

Main working branch:

```txt
architecture-cleanup
```

Before starting work on either Mac:

```bash
git checkout architecture-cleanup
git pull origin architecture-cleanup
git status
```

Expected before editing:

```txt
On branch architecture-cleanup
Your branch is up to date with 'origin/architecture-cleanup'.

nothing to commit, working tree clean
```

After completing a small verified task:

```bash
git status
git add <changed-files>
git commit -m "Clear description of completed task"
git push origin architecture-cleanup
```

---

## Two-Mac Development Rule

Before working on Mac A or Mac B:

```bash
git checkout architecture-cleanup
git pull origin architecture-cleanup
git status
```

Never start editing if the branch is behind GitHub.

After finishing work:

```bash
git add .
git commit -m "Describe the completed work"
git push origin architecture-cleanup
```

Then the other Mac must pull before editing.

---

## Commit Strategy

Use small commits.

Good commit examples:

```txt
Stabilize picks repository and cache integration
Wire picks page to backend API
Wire leaderboard page to backend API
Polish picks layout
Move frontend escape helpers to shared utils
Fix existing pick row updates
Document project architecture and workflow
```

Avoid giant mixed commits that include unrelated backend, frontend, and deployment changes.

---

## Do Not Do

Do not move frontend source files into Apps Script runtime.

Do not copy browser JavaScript files into backend.

Do not use `document`, `window`, or `localStorage` in backend files.

Do not reintroduce Apps Script HTML Service routing unless the architecture decision changes.

Do not rely on drag-and-drop Cloudflare deployments for ongoing development.

Do not start work on the second Mac before pulling latest GitHub changes.

Do not change frontend and backend contracts at the same time without testing each layer separately.

---

## Current Production Direction

Backend:

```txt
Google Sheets + Apps Script API
```

Frontend:

```txt
Cloudflare Pages hosted browser app
```

Current branch:

```txt
architecture-cleanup
```

Current game:

```txt
oscars-2026
```

Current verified app loop:

```txt
Login
→ Load categories
→ Load saved picks
→ Save/change picks
→ Update existing Picks sheet row
→ Refresh and reload saved picks
→ View leaderboard
```