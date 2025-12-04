const express = require("express");
const {register,login,resetPassword,logout,getMe,updateProfile,} = require("../controllers/AuthController");
const AuthMiddleware = require("../middleware/AuthMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/register", upload.single("profile"), register);

router.post("/login", login);

router.post("/reset-password", resetPassword);

router.post("/logout", AuthMiddleware, logout);

router.get("/me", AuthMiddleware, getMe);

router.post(
  "/update-profile",
  AuthMiddleware,
  upload.single("profile"),
  updateProfile
);

module.exports = router;
