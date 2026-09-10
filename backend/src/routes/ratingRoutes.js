const express = require("express");

const { createRating, listRatings } = require("../controllers/ratingController");

const router = express.Router();

router.get("/", listRatings);
router.post("/", createRating);

module.exports = router;
