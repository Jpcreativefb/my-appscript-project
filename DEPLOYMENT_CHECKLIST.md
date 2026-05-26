# Deployment Checklist

Use this checklist after backend deployments, frontend deployments, or when switching between Mac workstations.

Current architecture:

```txt
Cloudflare Pages Frontend
        ↓
Apps Script API Backend
        ↓
Google Sheets
```

Current branch:

```txt
architecture-cleanup
```

Current game:

```txt
oscars-2026
```

---

## 1. Before Starting Work

Run this on whichever Mac you are using:

```bash
git checkout architecture-cleanup
git pull origin architecture-cleanup
git status
```

Expected:

```txt
On branch architecture-cleanup
Your branch is up to date with 'origin/architecture-cleanup'.

nothing to commit, working tree clean
```

Do not start editing if the branch is behind or has uncommitted changes you do not understand.

---

## 2. Backend Deployment Checklist

Use this when backend files change:

```txt
backend/
```

### Push backend files to Apps Script

```bash
clasp push
```

### Redeploy Apps Script

In Apps Script:

```txt
Deploy
→ Manage deployments
→ Edit pencil
→ Deploy
```

### Direct backend API tests

Open the Apps Script web app URL directly and test:

```txt
?action=getCategories&gameId=oscars-2026
```

Expected:

```txt
Valid JSON array of categories
No Apps Script error page
```

Test:

```txt
?action=leaderboard&gameId=oscars-2026
```

Expected:

```txt
Valid JSON leaderboard array
```

Test login:

```txt
?action=login&username=TEST_USER&pin=TEST_PIN
```

Expected:

```txt
success true
response includes username
```

Test picks:

```txt
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
```

Expected:

```txt
Valid picks object
```

Test save pick:

```txt
?action=savePick&username=TEST_USER&categoryId=TEST_CATEGORY&nomineeId=TEST_NOMINEE&gameId=oscars-2026
```

Expected:

```txt
success true
or expected validation message such as Category is locked
```

---

## 3. Frontend Deployment Checklist

Use this when frontend files change:

```txt
frontend/
```

Cloudflare Pages should deploy from GitHub automatically after pushing to:

```txt
architecture-cleanup
```

Cloudflare Pages settings should be:

```txt
GitHub repo: Jpcreativefb/my-appscript-project
Branch: architecture-cleanup
Build output directory: frontend
```

After pushing frontend changes:

```bash
git push origin architecture-cleanup
```

Wait for Cloudflare Pages deployment to finish.

Then open:

```txt
https://YOUR-CLOUDFLARE-PAGES-URL/app.html
```

or start at:

```txt
https://YOUR-CLOUDFLARE-PAGES-URL/
```

---

## 4. Cloudflare Console Tests

On the deployed Cloudflare site, open browser console.

Run:

```js
typeof apiGetCategories
```

Expected:

```txt
"function"
```

Run:

```js
getFrontendGameId()
```

Expected:

```txt
"oscars-2026"
```

Run:

```js
apiGetCategories().then(console.log)
```

Expected:

```txt
Category array returns
Currently expected count: 46 categories
```

---

## 5. Login Flow Test

Open:

```txt
index.html
```

Login with a test user.

Expected:

```txt
Login succeeds
Redirects to app.html
Header shows username
Dashboard loads
```

If login fails, check:

```txt
frontend/js/config.js
frontend/js/api.js
frontend/js/state.js
frontend/js/auth.js
frontend/index.html script order
```

Required script order on login page:

```html
<script src="./js/config.js"></script>
<script src="./js/utils.js"></script>
<script src="./js/api.js"></script>
<script src="./js/state.js"></script>
<script src="./js/auth.js"></script>
```

---

## 6. Dashboard Test

Go to:

```txt
Dashboard
```

Expected:

```txt
Welcome username displays
Game shows oscars-2026
Picks made / total categories displays
Remaining picks displays
Leaderboard rank displays
Score displays
Win chance displays
Make Picks button works
View Leaderboard button works
```

No expected errors:

```txt
No [object Promise]
No debugLog is not defined
No escapeHtml is not defined
```

---

## 7. Picks Test

Go to:

```txt
Picks
```

Expected:

```txt
Categories load
Nominees load
Images fit inside cards
Missing images show local placeholder
Saved picks appear selected
Locked categories are disabled
```

Change an unlocked pick.

Expected:

```txt
Save succeeds
Selected state updates
Picks sheet updates existing row
No duplicate row is added
ChangeCount increments when nominee changes
LastUpdated updates
```

Refresh page.

Expected:

```txt
Changed pick remains selected
Session remains active
```

---

## 8. Leaderboard Test

Go to:

```txt
Leaderboard
```

Expected:

```txt
Leaderboard loads
Users display
Rank displays
Total score displays
Remaining/max displays
Statues display
Win chance displays
Cards are styled and readable
```

No expected errors:

```txt
No [object Promise]
No empty white cards
```

---

## 9. Logout Test

Click:

```txt
Logout
```

Expected:

```txt
Session clears
Redirects to index.html
Opening app.html directly redirects back to index.html
```

Console check after logout:

```js
localStorage.getItem("session")
```

Expected:

```txt
null
```

---

## 10. Debug Logging Check

In:

```txt
frontend/js/config.js
```

Production should usually be:

```js
DEBUG: false
```

Expected:

```txt
Console is quiet during normal usage
Real errors still appear
```

For troubleshooting only:

```js
DEBUG: true
```

Expected debug logs:

```txt
API REQUEST
CATEGORIES API
MY PICKS API
DASHBOARD API logs
LEADERBOARD API
SAVE PICK API
```

Set it back to:

```js
DEBUG: false
```

before committing production changes.

---

## 11. Git Commit Checklist

Before committing:

```bash
git status
```

Review changed files.

Commit small focused changes:

```bash
git add <changed-files>
git commit -m "Clear description"
git push origin architecture-cleanup
```

After pushing:

```bash
git status
```

Expected:

```txt
On branch architecture-cleanup
Your branch is up to date with 'origin/architecture-cleanup'.

nothing to commit, working tree clean
```

---

## 12. Common Problems

### Problem: Cloudflare is missing latest JS

Likely cause:

```txt
Cloudflare deployment did not finish
Wrong Pages project
Old drag-and-drop deployment being viewed
Browser cache
```

Fix:

```txt
Check Cloudflare deployment status
Open Git-connected Pages URL
Hard refresh
Confirm branch is architecture-cleanup
```

---

### Problem: debugLog is not defined

Likely cause:

```txt
utils.js loaded after api.js
utils.js missing from index.html or app.html
```

Fix script order:

```html
<script src="./js/config.js"></script>
<script src="./js/utils.js"></script>
<script src="./js/api.js"></script>
<script src="./js/state.js"></script>
```

---

### Problem: [object Promise] appears on page

Likely cause:

```txt
Async page renderer was called without await
```

Fix in:

```txt
frontend/js/app.js
```

Example:

```js
app.innerHTML =
  await renderDashboardPage();
```

---

### Problem: savePick returns category locked

Likely cause:

```txt
Category is locked in backend category settings
```

Fix:

```txt
Use an unlocked test category
or update sheet test data
Do not bypass backend lock validation in code
```

---

### Problem: existing pick adds duplicate row

Likely cause:

```txt
PicksRepo.updatePick or PicksEngine existing-row logic is broken
```

Expected behavior:

```txt
Existing User + GameId + CategoryId updates same row
New User + GameId + CategoryId inserts new row
```

Related files:

```txt
backend/engines/PicksEngine.js
backend/repositories/PicksRepo.js
```

---

## 13. Production Readiness Notes

Current verified production loop:

```txt
Login
→ Dashboard
→ Picks
→ Save/change picks
→ Refresh saved picks
→ Leaderboard
→ Logout
```

Future production hardening:

```txt
Cloudflare Worker API proxy
POST requests for writes
Stronger auth/session token validation
Standard API response shape
Profile endpoint
Admin endpoint controls
```