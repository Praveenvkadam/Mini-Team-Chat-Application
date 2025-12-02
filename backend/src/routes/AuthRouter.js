const express = require("express");
const {
  register,
  login,
  verifyOtp,
  resendOtp,
  resetPassword,
  getMe,
} = require("../controllers/AuthController");
const AuthMiddleware = require("../middleware/AuthMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.post("/reset-password", resetPassword);

router.get("/me", AuthMiddleware, getMe);

module.exports = router;
