const express = require("express");

const {
  getAccountById,
  listAccounts,
  updateAccountLocation,
  updateAccountTransportMode
} = require("../controllers/accountController");

const router = express.Router();

router.get("/", listAccounts);
router.get("/:accountId", getAccountById);
router.patch("/:accountId/location", updateAccountLocation);
router.patch("/:accountId/transport", updateAccountTransportMode);

module.exports = router;
