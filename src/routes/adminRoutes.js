const express = require("express");

const dashboardRoutes = require("../dashboard/dashboardRoutes");

const router = express.Router();

/**
 * Admin Routes (Deprecated - use /api/dashboard instead)
 * Acts as a pass-through to dashboard routes for backward compatibility
 */
router.use("/", dashboardRoutes);

module.exports = router;
