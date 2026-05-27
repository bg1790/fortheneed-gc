# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Layout

This directory **is** the codebase root (remote: `git@github.com:bg1790/fortheneed-gc.git`, branch `main`). There is no nested project folder despite the parent path being named `fortheneed-gc`.

```
index.html               # Landing page: sign-in modal, gates links to /registration and /view
registration/
  index.html             # Walk-in registration form (the real data-entry page)
  app.js                 # Firebase init + form submit logic
  worker.js              # Web Worker: name normalization + walk-in type validation
view/
  index.html             # Self-contained table of /walkins with sort + delete
public/                  # Legacy starter landing page; not linked from the live app
  index.html
app.js, worker.js        # Legacy copies at root; not loaded by any current page
firebase.json            # Hosts "." (whole repo); database.rules from database.rules.json
database.rules.json      # Realtime DB rules — /walkins requires auth != null
.firebaserc              # Firebase project alias
package.json             # Single dep: firebase@^12.13.0 (only used for tooling/types; pages CDN-load compat SDKs)
```

## Commands

```powershell
npm install              # Install firebase package (used by tooling, not bundled)
firebase deploy          # Deploy hosting + DB rules (requires firebase login)
npx serve .              # Local static preview
```

No build, lint, or test tooling is configured.

## Architecture

**Stack:** Vanilla JS (ES6+), Firebase compat SDK 10.12.5 loaded from gstatic CDN, Firebase Realtime Database, Firebase Anonymous Auth, Web Workers. No framework, no bundler.

### Three-page flow

1. **`/` (root `index.html`)** — Landing page. Shows a Sign-In button. The two protected links (`/registration/`, `/view/`) are hidden (`.hidden`) until auth passes. Sign-in is client-side: `SHA-256(email.toLowerCase() + ":" + password)` is compared against a hardcoded `CRED_HASHES` Set. On match, `sessionStorage.ftn_auth = "1"` is set and the links are revealed. Other pages gate themselves with `if (sessionStorage.getItem("ftn_auth") !== "1") location.replace("/");` at the top of `<body>`.
2. **`/registration/`** — The walk-in form. Submits to Firebase via the worker pattern below.
3. **`/view/`** — Real-time table bound to `db.ref("walkins").on("value", ...)`. Supports column-sort and per-row delete. Self-contained (no shared `app.js`).

### Registration data flow

```
User submits form
  → registration/app.js collects {firstName, lastName, walkinType}
  → processInWorker(data): postMessage to worker.js with a request ID
    → worker.js trims/title-cases names, validates against allowedTypes
    → returns {firstName, lastName, walkinType, createdAt: Date.now()}
  → database.ref("walkins").push(payload)
```

The worker uses a `Map` of request IDs so concurrent `processInWorker()` calls each get their own Promise.

### Auth model — two layers, intentional split

- **Gate (client-side, UX only):** The hashed-credential sign-in on the landing page is a *UX gate*, not a security boundary. The hashes are in plain JS source. Anyone reading `index.html` can bypass it; treat it as "are you supposed to be here" rather than "are you authorized."
- **Authorization (Firebase):** Every page (registration + view) calls `firebase.auth().signInAnonymously()` before any DB I/O. `database.rules.json` requires `auth != null` for `/walkins` reads and writes. The real access control is the Firebase rules — anonymous auth is what satisfies them.

When adding a new protected page, you must do **both**: copy the `sessionStorage` gate script into `<body>`, and call `signInAnonymously()` before any `db.ref(...)` call.

### Firebase config

- `registration/index.html` and `view/index.html` each inline `window.FIREBASE_CONFIG` literally (project `gcftnproject`). If you rotate config, update both — they are not shared.
- The legacy `public/index.html` fetches `/__/firebase/init.json` from Hosting instead; that path is not currently linked from the live app.

### Adding new credentials

To grant access to a new email/password, compute `SHA-256(email.toLowerCase() + ":" + password)` and add the hex digest to the `CRED_HASHES` Set in root `index.html`. The most recent commit (`4ae12de`) is an example of this.

## Gotchas

- **Two copies of `app.js` / `worker.js`** exist (root and `registration/`). The root copies are stale — only the `registration/` ones run. When changing form logic, edit `registration/app.js` and `registration/worker.js`; leave root copies alone or delete them deliberately.
- **`firebase.json` `"public": "."`** — the entire repo is the hosting root. `node_modules`, dotfiles, and `package*.json` are explicitly ignored, but anything else you add at root ships to production.
- **No build step** means HTML/JS edits are live immediately on next deploy. Test in `npx serve .` first; the sessionStorage gate and CDN script loads only work over HTTP, not `file://`.