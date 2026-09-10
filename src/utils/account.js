function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function createCreatedAt() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createAccountId(role) {
  return createId(role === "mechanic" ? "mech" : "drv");
}

module.exports = {
  normalizeEmail,
  createCreatedAt,
  createId,
  createAccountId
};
