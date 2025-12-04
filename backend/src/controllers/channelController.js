// src/controllers/channelController.js
const Channel = require('../models/Channel');
const User = require('../models/User');
const mongoose = require('mongoose');

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

// CREATE CHANNEL
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

    const activeMembers = (populated.members || []).map(m => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map(m => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    return res.status(201).json({ ...populated, members: combined });
  } catch (err) {
    console.error("createChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET SINGLE CHANNEL (fixed: includes createdById and isOwner)
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

    const activeMembers = (populated.members || []).map(m => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map(m => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    const createdById = populated.createdBy
      ? (String(populated.createdBy._id || populated.createdBy))
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

// JOIN CHANNEL
exports.joinChannel = async (req, res) => {
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

    if (channel.capacity > 0 && channel.members.length >= channel.capacity) {
      return res.status(403).json({ error: "Channel capacity reached" });
    }

    if (channel.isPrivate) {
      const invited = (channel.invitedUsers || []).map(String);
      const allowed = invited.includes(String(userId)) || String(channel.createdBy) === String(userId);
      if (!allowed) return res.status(403).json({ error: "Not invited to join this private channel" });
    }

    const stringMembers = (channel.members || []).map(String);
    if (!stringMembers.includes(String(userId))) {
      channel.members.push(userId);
    }

    if (!Array.isArray(channel.leftMembers)) channel.leftMembers = [];
    channel.leftMembers = channel.leftMembers.filter((m) => String(m) !== String(userId));

    await channel.save();

    const populated = await Channel.findById(channel._id)
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .populate("createdBy", "username name email profileUrl")
      .lean();

    const activeMembers = (populated.members || []).map(m => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map(m => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) io.to(`channel:${String(channel._id)}`).emit('channel:member-joined', { channelId: channel._id, userId });
    } catch (e) {}

    return res.json({ ...populated, members: combined });
  } catch (err) {
    console.error("joinChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// LEAVE CHANNEL
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

    const activeMembers = (populated.members || []).map(m => ({ ...m, active: true }));
    const leftMembers = (populated.leftMembers || []).map(m => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) io.to(`channel:${String(channel._id)}`).emit('channel:member-left', { channelId: channel._id, userId });
    } catch (e) {}

    return res.json({ ...populated, members: combined });
  } catch (err) {
    console.error("leaveChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET ALL CHANNELS USER CAN SEE
exports.getChannels = async (req, res) => {
  try {
    const userId = req.userId;

    const channels = await Channel.find({
      $or: [{ isPrivate: false }, { members: userId }]
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "username name email profileUrl")
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .lean();

    return res.json({ channels });
  } catch (err) {
    console.error("getChannels error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET MY CHANNELS
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

// GET CHANNEL MEMBERS
exports.getChannelMembers = async (req, res) => {
  try {
    const channelId = req.params.id;

    const channel = await Channel.findById(channelId)
      .populate("members", "username name email profileUrl isOnline lastSeen")
      .populate("leftMembers", "username name email profileUrl isOnline lastSeen")
      .lean();

    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const activeMembers = (channel.members || []).map(m => ({ ...m, active: true }));
    const leftMembers = (channel.leftMembers || []).map(m => ({ ...m, active: false }));
    const combined = [...activeMembers, ...leftMembers];

    return res.json({ members: combined || [] });
  } catch (err) {
    console.error("getChannelMembers error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// INVITE
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

// DELETE
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
    return res.json({ message: "Channel deleted" });
  } catch (err) {
    console.error("deleteChannel error", err);
    return res.status(500).json({ error: "Server error" });
  }
};
