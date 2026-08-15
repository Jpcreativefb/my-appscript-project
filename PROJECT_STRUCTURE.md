# Awards App Project Structure

Current production candidate: **v1.2.16 Fall Production Hardening**

## Architecture

```txt
Cloudflare Pages PWA
        ↓
Cloudflare POST proxy (write/upload requests)
        ↓
Google Apps Script API
        ↓
Main Awards App Google Sheet
        ↓
External Results Hub / Sports / Racing integrations
```

The main Apps Script project is rooted at `backend/` through `.clasp.json`. The browser application is deployed from `frontend/`.

## Primary repository areas

```txt
my-appscript-project/
├── backend/
│   ├── Api.js                       # Apps Script GET/POST entry point
│   ├── AuthEngine.js                # login/session validation and throttling
│   ├── core/
│   │   └── ApiSecurity.js           # v1.2.16 central API authorization boundary
│   ├── admin/                       # admin games, images, sports, preflight, results
│   ├── engines/                     # games, scoring, wagers, Reality TV, Awards, Sports, Racing
│   ├── repositories/                # sheet-backed repositories
│   ├── services/                    # shared backend services/cache
│   └── appsscript.json
├── frontend/
│   ├── index.html                   # login/signup entry
│   ├── app.html                     # authenticated PWA shell
│   ├── js/                          # primary browser JS
│   │   └── pages/                   # lazy-loaded player/admin pages
│   ├── css/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── sw.js                        # service worker/cache version
├── external-engines/
│   ├── external-results-hub/        # provider discovery, mappings, review/bridge
│   ├── sports-scoring-engine/       # separate Sports Apps Script project
│   └── racing-score-engine/         # separate Racing Apps Script project
├── tests/                            # Node regression contracts
├── tools/
│   ├── run_production_checks.sh     # complete local release gate
│   ├── sync_frontend_mirrors.sh     # explicit legacy mirror sync
│   └── cleanup_repository_docs.sh   # archives historical release notes
├── .github/workflows/
│   └── production-checks.yml        # CI release gate
├── PRODUCTION_STATUS.md
├── PRODUCTION_HARDENING_V1_2_16.md
├── PRODUCTION_SMOKE_TEST_V1_2_16.md
├── DEPLOYMENT_CHECKLIST.md
└── CHANGELOG.md
```

## API security rule

The Apps Script web app remains reachable over the internet, so the backend must treat the browser as untrusted. Both `doGet` and `doPost` call `apiSecurityAuthorizeRequest_()` before dispatch.

- Public auth/health routes are explicitly allowlisted.
- All other routes require a valid persisted session.
- `admin...` actions require an authenticated administrator automatically.
- Self-service actions derive the acting username from the session.
- Routes that intentionally display another player's information use a separate target username rather than using that target as the access-check identity.

Do not add a new API action that bypasses this boundary.

## Frontend mirrors

The project currently keeps legacy compatibility mirrors:

```txt
frontend/js/api.js  ↔ frontend/api.js
frontend/js/app.js  ↔ frontend/app.js
```

Do not edit only one copy. Run:

```bash
./tools/sync_frontend_mirrors.sh
```

and then:

```bash
./tools/run_production_checks.sh
```

A future cleanup can remove these mirrors after all deployments are proven to load only the canonical `frontend/js/` files. They are intentionally retained for v1.2.16 to avoid a risky pre-Fall loader rewrite.

## Release discipline

Historical release notes are retained in:

```txt
docs/archive/releases/
```

The repository root should contain only the current production/release documents. Before every deployment, `./tools/run_production_checks.sh` must pass, and after every deployment the current production smoke test must be completed.
