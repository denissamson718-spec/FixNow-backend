const fs = require("fs");
const path = require("path");

const { dataFilePath } = require("../config/paths");

const defaultDb = {
  accounts: [],
  serviceRequests: [],
  offers: [],
  ratings: [],
  payments: [],
  passwordResetTokens: []
};

function normalizeCollection(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDb(value) {
  return {
    accounts: normalizeCollection(value?.accounts),
    serviceRequests: normalizeCollection(value?.serviceRequests),
    offers: normalizeCollection(value?.offers),
    ratings: normalizeCollection(value?.ratings),
    payments: normalizeCollection(value?.payments),
    passwordResetTokens: normalizeCollection(value?.passwordResetTokens)
  };
}

function ensureDbFile() {
  const directory = path.dirname(dataFilePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultDb, null, 2));
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(dataFilePath, "utf8");
  return normalizeDb(JSON.parse(raw));
}

function writeDb(value) {
  ensureDbFile();
  const nextDb = normalizeDb(value);
  const temporaryPath = `${dataFilePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(nextDb, null, 2));
  fs.renameSync(temporaryPath, dataFilePath);
  return nextDb;
}

function updateDb(updater) {
  const current = readDb();
  const next = updater(current);
  return writeDb(next);
}

module.exports = {
  readDb,
  writeDb,
  updateDb
};
