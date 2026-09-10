/**
 * Admin Controller (Deprecated)
 * For backward compatibility, re-exports dashboard functions.
 * New code should import from ../dashboard/dashboardController.js
 */

const { getOverview, getPendingMechanics, approveMechanic, buildOverview } = require("../dashboard/dashboardController");

module.exports = {
  getOverview,
  getPendingMechanics,
  approveMechanic,
  buildOverview
};
