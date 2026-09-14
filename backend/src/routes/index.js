const express = require("express");

const { login, signup } = require("../controllers/authController");
const accountRoutes = require("./accountRoutes");
const adminRoutes = require("./adminRoutes");
const authRoutes = require("./authRoutes");
const dashboardRoutes = require("../dashboard/dashboardRoutes");
const offerRoutes = require("./offerRoutes");
const paymentRoutes = require("./paymentRoutes");
const placeRoutes = require("./placeRoutes");
const ratingRoutes = require("./ratingRoutes");
const requestRoutes = require("./requestRoutes");

const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    const storage = await require("../data/database").checkDatabase();
    res.json({ ok: true, storage });
  } catch {
    res.status(503).json({ ok: false, message: "Database unavailable." });
  }
});

router.use("/accounts", accountRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);        // Legacy admin routes (backward compatible)
router.use("/dashboard", dashboardRoutes); // New dashboard routes
router.use("/requests", requestRoutes);
router.use("/offers", offerRoutes);
router.use("/ratings", ratingRoutes);
router.use("/payments", paymentRoutes);
router.use("/places", placeRoutes);

// Legacy aliases kept so the current mobile app continues working during the backend transition.
router.post("/signup", signup);
router.post("/login", login);

module.exports = router;
