const express = require("express");

const { forgotPassword, getResetPasswordPage, login, resetPassword, signup } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password", getResetPasswordPage);
router.post("/reset-password", resetPassword);

module.exports = router;
