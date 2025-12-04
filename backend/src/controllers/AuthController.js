const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { generateToken } = require("../utils/JWTToken");
const { generateInitialAvatar } = require("../utils/avatar");

function buildUploadUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/profiles/${filename}`;
}

const register = async (req, res) => {
  try {
    const { username, email, phone, password, confirmPassword } = req.body;

    if (!username || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existsEmail = await User.findOne({ email });
    if (existsEmail)
      return res.status(400).json({ message: "Email already registered" });

    const existsPhone = await User.findOne({ phone });
    if (existsPhone)
      return res.status(400).json({ message: "Phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    let profileUrl = null;
    if (req.file && req.file.filename) {
      profileUrl = buildUploadUrl(req, req.file.filename);
    } else {
      profileUrl = generateInitialAvatar(username);
    }

    const user = await User.create({
      username,
      email,
      phone,
      password: hashedPassword,
      verified: true, 
      profileUrl,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profileUrl: user.profileUrl,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
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

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profileUrl: user.profileUrl,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { identifier, newPassword, confirmPassword } = req.body;
    if (!identifier || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "All fields required" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const {
      _id,
      username,
      email,
      phone,
      profileUrl,
      isOnline,
      lastSeen,
      verified,
    } = req.user;

    return res.json({
      user: {
        id: _id,
        username,
        email,
        phone,
        profileUrl,
        isOnline,
        lastSeen,
        verified,
      },
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const logout = async (req, res) => {
  try {
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, email, phone } = req.body;

    if (username && username.trim() !== "") user.username = username.trim();

    if (email && email.trim() !== "" && email !== user.email) {
      const existsEmail = await User.findOne({ email: email.trim() });
      if (existsEmail && existsEmail._id.toString() !== user._id.toString())
        return res.status(400).json({ message: "Email already in use" });

      user.email = email.trim();
    }

    if (phone && phone.trim() !== "" && phone !== user.phone) {
      const existsPhone = await User.findOne({ phone: phone.trim() });
      if (existsPhone && existsPhone._id.toString() !== user._id.toString())
        return res.status(400).json({ message: "Phone already in use" });

      user.phone = phone.trim();
    }

    if (req.file && req.file.filename) {
      const newProfileUrl = buildUploadUrl(req, req.file.filename);

      try {
        if (
          user.profileUrl &&
          typeof user.profileUrl === "string" &&
          user.profileUrl.includes("/uploads/profiles/")
        ) {
          const prevFilename = path.basename(user.profileUrl);
          const prevPath = path.join(process.cwd(), "uploads", "profiles", prevFilename);
          if (fs.existsSync(prevPath)) fs.unlink(prevPath, () => {});
        }
      } catch (_) {}

      user.profileUrl = newProfileUrl;
    }

    await user.save();

    const token = generateToken(user);

    return res.json({
      message: "Profile updated",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profileUrl: user.profileUrl,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  resetPassword,
  getMe,
  logout,
  updateProfile,
};
