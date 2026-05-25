# fortheneed-gc

Simple vanilla Netlify walk-in app for volunteer events.

## Features
- Collects walk-in first name, last name, and type:
  - Volunteer
  - Arrow
  - Parent/Guardian
  - Guest
- Uses Firebase compat SDKs:
  - `firebase-app-compat.js`
  - `firebase-auth-compat.js`
  - `firebase-database-compat.js`
- Stores walk-ins in Firebase Realtime Database
- Uses a Web Worker (`worker.js`) for multithreaded payload processing

## Files
- `index.html` - UI and SDK script includes
- `app.js` - Firebase initialization + submit/save logic
- `worker.js` - background worker for validation/normalization

## Firebase setup
Provide Firebase config through `window.FIREBASE_CONFIG` before `app.js` is loaded.
