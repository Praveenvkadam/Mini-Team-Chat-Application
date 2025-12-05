// src/routes/channelRoutes.js
const express = require("express");
const router = express.Router();
const channelController = require("../controllers/channelController");
const requireAuth = require("../middleware/AuthMiddleware");

router.post("/", requireAuth, channelController.createChannel);
router.get("/", requireAuth, channelController.getChannels);
router.get("/mine", requireAuth, channelController.getMyChannels);
router.get("/:id", requireAuth, channelController.getChannel);
router.get("/:id/members", requireAuth, channelController.getChannelMembers);
router.post("/:id/join", requireAuth, channelController.joinChannel);
router.post("/:id/leave", requireAuth, channelController.leaveChannel);
router.post("/:id/invite", requireAuth, channelController.inviteUser);
router.delete("/:id", requireAuth, channelController.deleteChannel);

module.exports = router;
