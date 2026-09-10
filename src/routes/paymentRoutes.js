const express = require("express");

const { createPayment, listPayments } = require("../controllers/paymentController");

const router = express.Router();

router.get("/", listPayments);
router.post("/", createPayment);

module.exports = router;
