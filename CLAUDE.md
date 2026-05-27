# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Layout

The actual codebase lives in `fortheneed-gc/` — that subdirectory is its own git repository (`git@github.com:bg1790/fortheneed-gc.git`, branch `main`).

```
fortheneed-gc/
  index.html      # Walk-in registration form (the real app entry point)
  app.js          # Main Firebase + form logic
  worker.js       # Web Worker for validation/normalization
  public/
    index.html    # Firebase Hosting landing page only
  firebase.json   # Hosting config — deploys ONLY public/ to Firebase
  package.json    # Single dependency: firebase@^12.13.0
```

**Important:** `firebase.json` deploys only the `public/` folder. The form app (`index.html`, `app.js`, `worker.js` at root) is not currently wired into the Firebase Hosting deployment.

## Commands

```bash
# Install dependencies
cd fortheneed-gc && npm install

# Deploy to Firebase Hosting (requires prior firebase login)
cd fortheneed-gc && firebase deploy

# Serve locally (any static server works, e.g.)
cd fortheneed-gc && npx serve .
```

No build, test, or lint tooling is configured.

## Architecture

**Stack:** Vanilla JS (ES6+), Firebase Realtime Database, Firebase Anonymous Auth, Web Workers. No framework, no bundler.

**Data flow:**

```
User submits form
  → app.js collects {firstName, lastName, walkinType}
  → processInWorker(data): sends to worker.js via postMessage (promise-based, keyed by request ID)
    → worker.js validates required fields, title-cases names, validates walkinType enum
    → returns normalized payload + createdAt timestamp
  → app.js writes payload to Firebase Realtime Database at /walkins/{pushId}
```

**Firebase setup:** `app.js` reads `window.FIREBASE_CONFIG` for the Firebase project credentials. The `public/index.html` landing page auto-loads config from Firebase Hosting's `/__/firebase/init.json` endpoint instead.

**Worker pattern:** `worker.js` uses a request-ID map so multiple in-flight calls can be tracked. Each `processInWorker()` call returns a Promise that resolves/rejects when the worker responds with the matching ID.

**Auth:** Anonymous sign-in is required before any database write. If auth fails, the form is disabled with an error message.
