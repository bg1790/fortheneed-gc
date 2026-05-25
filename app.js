const ALLOWED_TYPES = ["Volunteer", "Arrow", "Parent/Guardian", "Guest"];
const statusEl = document.getElementById("status");
const formEl = document.getElementById("walkin-form");
const saveBtn = document.getElementById("saveBtn");

const worker = new Worker("./worker.js");
let workerRequestId = 0;
const workerRequests = new Map();

worker.onmessage = (event) => {
  const { id, ok, payload, error } = event.data || {};
  const handlers = workerRequests.get(id);
  if (!handlers) return;
  workerRequests.delete(id);
  if (ok) {
    handlers.resolve(payload);
  } else {
    handlers.reject(new Error(error || "Worker processing failed."));
  }
};

worker.onerror = () => {
  statusEl.textContent = "Worker error. Please reload and try again.";
};

function processInWorker(data) {
  return new Promise((resolve, reject) => {
    const id = ++workerRequestId;
    workerRequests.set(id, { resolve, reject });
    worker.postMessage({ id, data });
  });
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#a61e1e" : "#233154";
}

function getFirebaseConfig() {
  if (!window.FIREBASE_CONFIG) return null;
  return window.FIREBASE_CONFIG;
}

const firebaseConfig = getFirebaseConfig();
const isConfigReady = Boolean(firebaseConfig);
let database = null;

if (isConfigReady) {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  database = firebase.database();
  firebase.auth().signInAnonymously().catch(() => {
    showStatus(
      "Auth failed. Saving may not work until anonymous sign-in is enabled in Firebase Authentication.",
      true
    );
  });
} else {
  saveBtn.disabled = true;
  showStatus("Set window.FIREBASE_CONFIG before loading app.js to enable saving.", true);
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!database) return;

  const formData = new FormData(formEl);
  const firstName = (formData.get("firstName") || "").toString();
  const lastName = (formData.get("lastName") || "").toString();
  const walkinType = (formData.get("walkinType") || "").toString();

  if (!ALLOWED_TYPES.includes(walkinType)) {
    showStatus("Please select a valid walk-in type.", true);
    return;
  }

  try {
    saveBtn.disabled = true;
    showStatus("Saving...");

    const payload = await processInWorker({ firstName, lastName, walkinType, allowedTypes: ALLOWED_TYPES });
    await database.ref("walkins").push(payload);

    formEl.reset();
    showStatus("Saved successfully.");
  } catch (error) {
    showStatus(error.message || "Save failed. Please try again.", true);
  } finally {
    if (isConfigReady) {
      saveBtn.disabled = false;
    }
  }
});
