const express = require("express");
const {
  register,
  login,
  verifyOtp,
  resendOtp,
  resetPassword,
  logout,
  getMe,
} = require("../controllers/AuthController");
const AuthMiddleware = require("../middleware/AuthMiddleware");

// multer upload middleware (ensure path matches your project)
const upload = require("../middleware/upload");

const router = express.Router();

// attach multer so req.file and req.body are populated for multipart/form-data
router.post("/register", upload.single("profile"), register);

router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.post("/reset-password", resetPassword);
router.post("/logout", logout);
router.get("/me", AuthMiddleware, getMe);

module.exports = router;
