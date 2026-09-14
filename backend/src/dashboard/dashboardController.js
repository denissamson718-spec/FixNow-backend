const { asyncHandler } = require("../utils/asyncHandler");
const { readDb, writeDb } = require("../data/database");

/**
 * Dashboard Controller
 * Handles all dashboard-related business logic and data operations
 */

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

function parseIsoDate(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function withActivity(account, nowTimestamp) {
  const updatedAt = account.lastKnownLocation?.updatedAt;
  const lastSeenTimestamp = parseIsoDate(updatedAt);
  const isActive = Boolean(lastSeenTimestamp && nowTimestamp - lastSeenTimestamp <= ACTIVE_WINDOW_MS);

  return {
    ...account,
    activityStatus: isActive ? "active" : "inactive",
    lastSeenAt: updatedAt || null
  };
}

function slimCredentials(credentials) {
  if (!credentials) {
    return undefined;
  }

  return {
    identificationType: credentials.identificationType,
    identificationNumber: credentials.identificationNumber,
    experienceYears: credentials.experienceYears,
    transportMode: credentials.transportMode,
    workingGarage: credentials.workingGarage,
    garageLocation: credentials.garageLocation
  };
}

function toOverviewAccount(account) {
  return {
    id: account.id,
    role: account.role,
    password: account.password,
    profile: account.profile,
    approvalStatus: account.approvalStatus,
    createdAt: account.createdAt,
    activityStatus: account.activityStatus,
    lastSeenAt: account.lastSeenAt,
    lastKnownLocation: account.lastKnownLocation,
    linkedMechanicId: account.linkedMechanicId,
    mechanicCredentials: slimCredentials(account.mechanicCredentials)
  };
}

function toOverviewRequest(request) {
  return {
    requestedByAccountId: request.requestedByAccountId,
    locationLabel: request.locationLabel,
    latitude: request.latitude,
    longitude: request.longitude,
    createdAt: request.createdAt
  };
}

function buildOverview(db) {
  const nowTimestamp = Date.now();
  const drivers = db.accounts
    .filter((account) => account.role === "driver")
    .map((account) => withActivity(account, nowTimestamp))
    .map(toOverviewAccount);
  const mechanics = db.accounts
    .filter((account) => account.role === "mechanic")
    .map((account) => withActivity(account, nowTimestamp))
    .map(toOverviewAccount);
  const pendingMechanics = mechanics.filter((account) => account.approvalStatus === "pending");
  const approvedMechanics = mechanics.filter((account) => account.approvalStatus === "approved");
  const activeDrivers = drivers.filter((account) => account.activityStatus === "active");
  const inactiveDrivers = drivers.filter((account) => account.activityStatus === "inactive");
  const activeMechanics = approvedMechanics.filter((account) => account.activityStatus === "active");
  const inactiveMechanics = approvedMechanics.filter((account) => account.activityStatus === "inactive");

  return {
    stats: {
      drivers: drivers.length,
      mechanics: mechanics.length,
      pendingApprovals: pendingMechanics.length,
      activeDrivers: activeDrivers.length,
      inactiveDrivers: inactiveDrivers.length,
      activeMechanics: activeMechanics.length,
      inactiveMechanics: inactiveMechanics.length
    },
    requests: (db.serviceRequests || []).map(toOverviewRequest),
    drivers,
    mechanics,
    approvedMechanics,
    pendingMechanics,
    accounts: [...drivers, ...mechanics]
  };
}

async function getOverview(req, res) {
  try {
    const db = await readDb();
    res.json(buildOverview(db));
  } catch (error) {
    res.status(error.status === 409 ? 409 : 500).json({ success: false, message: "Failed to get overview", error: error.status === 409 ? error.message : "Database request failed." });
  }
}

async function getPendingMechanics(req, res) {
  try {
    const db = await readDb();
    const nowTimestamp = Date.now();
    const pendingMechanics = db.accounts
      .filter((account) => account.role === "mechanic" && account.approvalStatus === "pending")
      .map((account) => withActivity(account, nowTimestamp))
      .map(toOverviewAccount);

    res.json({ mechanics: pendingMechanics });
  } catch (error) {
    res.status(error.status === 409 ? 409 : 500).json({ success: false, message: "Failed to get pending mechanics", error: error.status === 409 ? error.message : "Database request failed." });
  }
}

async function getMechanicById(req, res) {
  try {
    const db = await readDb();
    const nowTimestamp = Date.now();
    const accountId = String(req.params.accountId || "").trim();
    const mechanic = db.accounts.find((account) => account.id === accountId && account.role === "mechanic");

    if (!mechanic) {
      res.status(404).json({ success: false, message: "Mechanic account not found." });
      return;
    }

    res.json({
      success: true,
      mechanic: withActivity(mechanic, nowTimestamp)
    });
  } catch (error) {
    res.status(error.status === 409 ? 409 : 500).json({ success: false, message: "Failed to get mechanic details", error: error.status === 409 ? error.message : "Database request failed." });
  }
}

async function approveMechanic(req, res) {
  try {
    const db = await readDb();
    let approvedAccount;

    db.accounts = db.accounts.map((account) => {
      if (account.id !== req.params.accountId || account.role !== "mechanic") {
        return account;
      }

      approvedAccount = {
        ...account,
        approvalStatus: "approved",
        linkedMechanicId: account.linkedMechanicId || account.id
      };

      return approvedAccount;
    });

    if (!approvedAccount) {
      res.status(404).json({ success: false, message: "Mechanic account not found." });
      return;
    }

    await writeDb(db);
    res.json({
      success: true,
      message: "Mechanic approved successfully.",
      account: approvedAccount,
      overview: buildOverview(db)
    });
  } catch (error) {
    res.status(error.status === 409 ? 409 : 500).json({ success: false, message: "Failed to approve mechanic", error: error.status === 409 ? error.message : "Database request failed." });
  }
}

module.exports = {
  getOverview: asyncHandler(getOverview),
  getPendingMechanics: asyncHandler(getPendingMechanics),
  getMechanicById: asyncHandler(getMechanicById),
  approveMechanic: asyncHandler(approveMechanic),
  buildOverview
};
