const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken } = require("../utils/JWTToken");
const twilio = require("twilio");

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const register = async (req, res) => {
  try {
    const { username, email, phone, password, confirmPassword } = req.body;

    if (!username || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    if (await User.findOne({ phone }))
      return res.status(400).json({ message: "Phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      phone,
      password: hashedPassword,
      verified: false,
    });

    await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return res.status(201).json({
      message: "OTP sent to phone",
      phone,
    });

  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    const check = await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: phone, code: otp });

    if (check.status !== "approved")
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.verified = true;
    await user.save();

    const token = generateToken(user);

    return res.json({
      message: "OTP verified. Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (err) {
    console.error("Verify OTP error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone)
      return res.status(400).json({ message: "Phone is required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return res.json({ message: "OTP resent" });

  } catch (err) {
    console.error("Resend OTP error:", err.message);
    return res.status(500).json({ message: "Failed to resend OTP" });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return res.status(400).json({ message: "Email/Phone and password required" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!await bcrypt.compare(password, user.password))
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.verified)
      return res.status(403).json({
        message: "Account not verified. Complete OTP first.",
        requireOtp: true,
        phone: user.phone,
      });

    const token = generateToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword, confirmPassword } = req.body;

    if (!identifier || !otp || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "All fields required" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const check = await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: user.phone, code: otp });

    if (check.status !== "approved")
      return res.status(400).json({ message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Reset password error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMe = async (req, res) => {
  return req.user
    ? res.json({ user: req.user })
    : res.status(401).json({ message: "Not authenticated" });
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  resetPassword,
  getMe,
};
