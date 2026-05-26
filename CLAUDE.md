# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (firebase-tools CLI only — no build step)
npm install

# Serve locally (serves root, which is what Firebase Hosting deploys)
npx serve .

# Deploy to Firebase Hosting (requires prior firebase login)
firebase deploy
```

No build, test, or lint tooling is configured.

## Architecture

**Stack:** Vanilla JS (ES6+), Firebase compat SDK (v10.12.5 via CDN), Firebase Realtime Database, Firebase Anonymous Auth, Web Workers. No framework, no bundler.

**Two separate pages:**
- `index.html` (root) — the walk-in registration form; this is the real app
- `public/index.html` — a Firebase Hosting connectivity check page; fetches `/__/firebase/init.json` at runtime to auto-load config

**Deployment:** `firebase.json` sets `"public": "."`, so Firebase Hosting deploys the entire root directory (excluding `firebase.json`, `package*.json`, dotfiles, and `node_modules`). Both pages are live after deploy.

**Firebase config:** `index.html` inlines `window.FIREBASE_CONFIG` as a script tag before loading `app.js`. The `public/index.html` landing page fetches config dynamically from `/__/firebase/init.json` instead.

**Data flow for form submission:**

```
User submits form (index.html)
  → app.js reads firstName, lastName, walkinType from FormData
  → validates walkinType against ALLOWED_TYPES client-side
  → processInWorker(data): postMessage to worker.js (promise keyed by request ID)
    → worker.js normalizes names (title-case, trim/collapse whitespace)
    → validates required fields and walkinType enum
    → returns {firstName, lastName, walkinType, createdAt: Date.now()}
  → app.js writes payload to Firebase Realtime Database at /walkins/{pushId}
```

**Worker pattern:** `workerRequests` Map in `app.js` tracks in-flight calls by integer ID. Each `processInWorker()` increments `workerRequestId`, stores `{resolve, reject}` handlers, and returns a Promise that settles when the worker echoes back the matching ID.

**Auth:** Anonymous sign-in runs at startup. If it fails, the form still renders but a status message warns the user; the save will fail at the database write due to security rules.

**Walk-in types:** `["Volunteer", "Arrow", "Parent/Guardian", "Guest"]` — defined as `ALLOWED_TYPES` in `app.js` and passed to the worker for validation. Adding a new type requires updating both the `<select>` in `index.html` and the `ALLOWED_TYPES` array in `app.js`.

**Database rules:** Referenced in `firebase.json` as `database.rules.json` — this file must exist before deploying the database rules.
