# Awards App Deployment Checklist

Current release candidate: **v1.2.16 Fall Production Hardening**  
Branch: **architecture-cleanup**

Architecture:

```txt
Cloudflare Pages frontend
        ↓
Apps Script API backend
        ↓
Google Sheets
```

## Critical deployment order for v1.2.16

v1.2.16 changes both the frontend request contract and backend authorization rules. The cleanest rollout is:

1. Update/test the local worktree.
2. `clasp push` and create the new Apps Script **version**, but do not switch the live deployment yet.
3. Commit/push GitHub so Cloudflare publishes the v1.2.16 frontend.
4. As soon as the Cloudflare deployment succeeds, immediately `clasp redeploy` the existing Apps Script deployment to the staged v1.2.16 version.
5. Run `PRODUCTION_SMOKE_TEST_V1_2_16.md`.

There can be a brief mixed-version window during step 3-4. During that window, do not make production picks/admin changes. The new frontend is intentionally not fully compatible with the old backend because credential/player writes moved to POST.

## 1. Install the release over the existing Git worktree

From the current repository, first make sure your work is safe:

```bash
cd /Users/joel/my-appscript-project
git checkout architecture-cleanup
git pull origin architecture-cleanup
git status
```

The packaged full release can then be copied over this worktree while preserving `.git`, `.vscode`, and local `node_modules`. See the terminal commands supplied with the release.

## 2. Run the production gate

```bash
chmod +x tools/run_production_checks.sh tools/sync_frontend_mirrors.sh
./tools/run_production_checks.sh
```

Do not deploy if any check fails.

## 3. Stage the Apps Script backend

Confirm the correct Apps Script project and push the code without changing the live deployment yet:

```bash
clasp status
clasp push
```

Create a version:

```bash
clasp version "v1.2.16 Fall Production Hardening"
```

Record the version number printed by `clasp version`; you will use it after the frontend publishes. Do not redeploy the live web app yet.

## 4. Commit/push the frontend + release files

Review the change set:

```bash
git status
git diff --stat
```

Commit and push:

```bash
git add .
git commit -m "v1.2.16 fall production hardening"
git push origin architecture-cleanup
```

Cloudflare Pages should deploy the `frontend/` directory from the `architecture-cleanup` branch using the existing project configuration. Wait until that deployment reports success. Do not make production picks/admin changes during this short mixed-version window.

## 5. Switch the existing Apps Script deployment immediately

List deployments if you want to confirm the existing production deployment ID:

```bash
clasp deployments
```

Redeploy the existing production deployment to the staged version (replace `VERSION_NUMBER`):

```bash
clasp redeploy AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo VERSION_NUMBER "v1.2.16 Fall Production Hardening"
```

Do not create a new web-app deployment. The frontend is configured for the existing deployment ID.

## 6. Browser cache / release check

After Cloudflare finishes:

- Open the app once in a private/incognito window.
- On existing devices, hard refresh or fully close/reopen the installed PWA once.
- Verify login and one test pick before announcing the release.

Current browser/cache marker:

```txt
318-fall-production-hardening-v1216
```

## 7. Run full v1.2.16 smoke test

Complete:

```txt
PRODUCTION_SMOKE_TEST_V1_2_16.md
```

Prioritize the Fall-critical paths first: login/auth, football sports wagers, Awards Manager/Emmys mapping, and each active Reality TV show.

## 8. Tag only after smoke testing

After the smoke matrix passes:

```bash
git tag -a v1.2.16 -m "Awards App v1.2.16 Fall Production Hardening"
git push origin v1.2.16
```

That tag becomes the rollback checkpoint for the Fall production baseline.
