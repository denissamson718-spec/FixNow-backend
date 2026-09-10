const express = require("express");

const { createOffer, listOffers, updateOffer } = require("../controllers/offerController");

const router = express.Router();

router.get("/", listOffers);
router.post("/", createOffer);
router.patch("/:offerId", updateOffer);

module.exports = router;
