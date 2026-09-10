const express = require("express");

const { createServiceRequest, listServiceRequests, updateServiceRequest } = require("../controllers/requestController");

const router = express.Router();

router.get("/", listServiceRequests);
router.post("/", createServiceRequest);
router.patch("/:requestId", updateServiceRequest);

module.exports = router;
