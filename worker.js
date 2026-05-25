const ALLOWED_TYPES = ["Volunteer", "Arrow", "Parent/Guardian", "Guest"];

function normalizeName(name) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

self.onmessage = (event) => {
  const { id, data } = event.data || {};
  try {
    const firstName = normalizeName(data.firstName || "");
    const lastName = normalizeName(data.lastName || "");
    const walkinType = (data.walkinType || "").trim();

    if (!firstName || !lastName) {
      throw new Error("First name and last name are required.");
    }
    if (!ALLOWED_TYPES.includes(walkinType)) {
      throw new Error("Invalid walk-in type.");
    }

    self.postMessage({
      id,
      ok: true,
      payload: {
        firstName,
        lastName,
        walkinType,
        createdAt: Date.now(),
      },
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error.message || "Worker validation failed.",
    });
  }
};
