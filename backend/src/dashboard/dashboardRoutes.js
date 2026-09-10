const express = require("express");
const { approveMechanic, getMechanicById, getOverview, getPendingMechanics } = require("./dashboardController");

const router = express.Router();

/**
 * Dashboard Routes
 * All dashboard API endpoints
 */

// GET /api/dashboard/overview - Get full dashboard overview with stats
router.get("/overview", getOverview);

// GET /api/dashboard/pending-mechanics - Get all pending mechanic approvals
router.get("/pending-mechanics", getPendingMechanics);

// GET /api/dashboard/mechanics/:accountId - Get a single mechanic with credential details
router.get("/mechanics/:accountId", getMechanicById);

// POST /api/dashboard/approve/:accountId - Approve a mechanic account
router.post("/approve/:accountId", approveMechanic);
// POST /api/dashboard/mechanics/:accountId/approve - Alias for older dashboard clients
router.post("/mechanics/:accountId/approve", approveMechanic);

module.exports = router;
