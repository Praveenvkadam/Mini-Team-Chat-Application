const Channel = require("../models/Channel");
const User = require("../models/User");
const mongoose = require("mongoose");

const safeTrim = (v) => (typeof v === "string" ? v.trim() : v);

const emitChannelState = (req, channelDoc, combinedMembers) => {
  try {
    const io = req.app && req.app.get && req.app.get("io");
    if (!io || !channelDoc) return;

    const channelId = String(channelDoc._id);

    // send full channel object (for left sidebar)
    const channelSafe = {
      ...channelDoc,
      members: combinedMembers,
    };

    io.emit("channel:updated", channelSafe);

    // send members list only (for right sidebar)
    io.to(`channel:${channelId}`).emit("channel:members", {
      channelId,
      members: combinedMembers,
    });
  } catch {
    // ignore socket errors
  }
};

exports.createChannel = async (req, res) => {
  try {
    const creatorId = req.userId;
    const rawName = safeTrim(req.body.name);
    const isPrivate = Boolean(req.body.isPrivate);
    const capacity = Number(req.body.capacity || 0) || 0;

    if (!rawName) return res.status(400).json({ error: "Channel name is required" });
    if (rawName.length > 100) return res.status(400).json({ error: "Channel name too long" });
    if (capacity < 0) return res.status(400).json({ error: "Capacity must be >= 0" });

    const exists = await Channel.findOne({
      name: { $regex: `^${rawName}$`, $options: "i" }
    });

    if (exists) return res.status(409).json({ error: "Channel name already exists" });

    const channel = await Channel.create({
      name: rawName,
      createdBy: creatorId,
      members: [creatorId],
      isPrivate,
      capacity,
      invitedUsers: isPrivate ? [creatorId] : []
    });

    const populated = await Channel.findById(channel._id)
      .populate("createdBy", "username name email profileUrl")
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .lean();

    const activeMembers = (populated.members || []).map((m) => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map((m) => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    // broadcast new channel + members
    emitChannelState(req, populated, combined);

    return res.status(201).json({ ...populated, members: combined });
  } catch (err) {
    console.error("createChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getChannel = async (req, res) => {
  try {
    const identifier = safeTrim(req.params.id);
    const userId = req.userId;

    let channel = null;

    if (mongoose.isValidObjectId(identifier)) {
      channel = await Channel.findById(identifier);
    }

    if (!channel) {
      channel = await Channel.findOne({
        name: { $regex: `^${identifier}$`, $options: "i" }
      });
    }

    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const members = (channel.members || []).map(String);
    const invited = (channel.invitedUsers || []).map(String);

    const isMember = members.includes(String(userId));
    const isOwner = String(channel.createdBy) === String(userId);
    const isInvited = invited.includes(String(userId));
    const canJoin = !channel.isPrivate || isOwner || isMember || isInvited;

    const populated = await Channel.findById(channel._id)
      .populate("createdBy", "username name email profileUrl")
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .lean();

    const activeMembers = (populated.members || []).map((m) => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map((m) => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    const createdById = populated.createdBy
      ? String(populated.createdBy._id || populated.createdBy)
      : String(channel.createdBy);

    return res.json({
      ...populated,
      createdById,
      members: combined,
      isMember,
      isOwner,
      isInvited,
      canJoin
    });
  } catch (err) {
    console.error("getChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.joinChannel = async (req, res) => {
  try {
    const identifier = safeTrim(req.params.id);
    const userId = req.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let channel = null;

    if (mongoose.isValidObjectId(identifier)) {
      channel = await Channel.findById(identifier);
    }
    if (!channel) {
      channel = await Channel.findOne({
        name: { $regex: `^${identifier}$`, $options: "i" }
      });
    }

    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const members = (channel.members || []).map(String);
    const invited = (channel.invitedUsers || []).map(String);
    const isMember = members.includes(String(userId));
    const isOwner = String(channel.createdBy) === String(userId);
    const isInvited = invited.includes(String(userId));

    if (channel.capacity > 0 && channel.members.length >= channel.capacity) {
      return res.status(403).json({ error: "Channel capacity reached" });
    }

    if (channel.isPrivate && !isMember && !isOwner && !isInvited) {
      return res.status(403).json({ error: "Request required", code: "PRIVATE_CHANNEL" });
    }

    // already a member -> just return state, no broadcast
    if (isMember) {
      const populated = await Channel.findById(channel._id)
        .populate("members", "username name email profileUrl isOnline lastSeen")
        .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
        .populate("createdBy", "username name email profileUrl")
        .lean();

      const activeMembers = (populated.members || []).map((m) => ({ ...m, active: true }));
      const leftMembers = (populated.leftMembers || []).map((m) => ({ ...m, active: false }));
      const combined = [...activeMembers, ...leftMembers];

      return res.json({ ...populated, members: combined });
    }

    // newly joining
    channel.members.push(userId);
    if (!Array.isArray(channel.leftMembers)) channel.leftMembers = [];
    channel.leftMembers = channel.leftMembers.filter((m) => String(m) !== String(userId));
    await channel.save();

    const populated = await Channel.findById(channel._id)
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .populate("createdBy", "username name email profileUrl")
      .lean();

    const activeMembers = (populated.members || []).map((m) => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map((m) => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    // OLD event (not used by frontend now, but harmless)
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) {
        io.to(`channel:${String(channel._id)}`).emit("channel:member-joined", {
          channelId: channel._id,
          userId,
        });
      }
    } catch (_) {}

    // NEW: broadcast full updated state for sidebars
    emitChannelState(req, populated, combined);

    return res.json({ ...populated, members: combined });
  } catch (err) {
    console.error("joinChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.leaveChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (String(channel.createdBy) === String(userId)) {
      return res.status(403).json({ error: "Channel creator cannot leave the channel" });
    }

    if (!Array.isArray(channel.leftMembers)) channel.leftMembers = [];
    channel.members = (channel.members || []).filter((m) => String(m) !== String(userId));
    if (!channel.leftMembers.map(String).includes(String(userId))) {
      channel.leftMembers.push(userId);
    }

    await channel.save();

    const populated = await Channel.findById(channelId)
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .populate("createdBy", "username name email profileUrl")
      .lean();

    const activeMembers = (populated.members || []).map((m) => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map((m) => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    // OLD event (unused in frontend)
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) {
        io.to(`channel:${String(channel._id)}`).emit("channel:member-left", {
          channelId: channel._id,
          userId,
        });
      }
    } catch (_) {}

    // NEW: broadcast full updated state for sidebars
    emitChannelState(req, populated, combined);

    return res.json({ ...populated, members: combined });
  } catch (err) {
    console.error("leaveChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getChannels = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const channels = await Channel.find({})
      .sort({ createdAt: -1 })
      .populate("createdBy", "username name email profileUrl")
      .lean();

    const mapped = channels.map((ch) => {
      const members = (ch.members || []).map(String);
      const invited = (ch.invitedUsers || []).map(String);
      const isMember = members.includes(String(userId));
      const isOwner = String(ch.createdBy) === String(userId);
      const isInvited = invited.includes(String(userId));
      const canJoin = !ch.isPrivate || isOwner || isMember || isInvited;

      return {
        ...ch,
        isMember,
        isOwner,
        isInvited,
        canJoin
      };
    });

    return res.json({ channels: mapped });
  } catch (err) {
    console.error("getChannels error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getMyChannels = async (req, res) => {
  try {
    const userId = req.userId;

    const channels = await Channel.find({ members: userId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "username name email profileUrl")
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .lean();

    return res.json({ channels });
  } catch (err) {
    console.error("getMyChannels error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getChannelMembers = async (req, res) => {
  try {
    const channelId = req.params.id;

    const channel = await Channel.findById(channelId)
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .lean();

    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const activeMembers = (channel.members || []).map((m) => ({ ...m, active: true }));
    const leftMembers = (channel.leftMembers || []).map((m) => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    return res.json({ members: combined || [] });
  } catch (err) {
    console.error("getChannelMembers error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.inviteUser = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userToInvite = req.body.userIdToInvite;
    const userId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (String(channel.createdBy) !== String(userId)) {
      return res.status(403).json({ error: "Only creator can invite" });
    }

    if (!channel.invitedUsers.map(String).includes(String(userToInvite))) {
      channel.invitedUsers.push(userToInvite);
      await channel.save();
    }

    return res.json({ message: "User invited" });
  } catch (err) {
    console.error("inviteUser error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (String(channel.createdBy) !== String(userId)) {
      return res.status(403).json({ error: "Not allowed to delete" });
    }

    await Channel.deleteOne({ _id: channelId });

    // broadcast delete
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) {
        io.emit("channel:deleted", { channelId: String(channelId) });
      }
    } catch (_) {}

    return res.json({ message: "Channel deleted" });
  } catch (err) {
    console.error("deleteChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};
