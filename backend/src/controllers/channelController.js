const Channel = require('../models/Channel');
const User = require('../models/User');
const mongoose = require('mongoose');

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

exports.createChannel = async (req, res) => {
  try {
    const creatorId = req.userId;
    const rawName = safeTrim(req.body.name);
    const isPrivate = Boolean(req.body.isPrivate);
    const capacity = Number(req.body.capacity || 0) || 0;

    if (!rawName) return res.status(400).json({ error: 'Channel name is required' });
    if (rawName.length > 100) return res.status(400).json({ error: 'Channel name too long' });
    if (capacity < 0) return res.status(400).json({ error: 'Capacity must be >= 0' });

    const exists = await Channel.findOne({
      name: { $regex: `^${rawName}$`, $options: 'i' },
    });
    if (exists) return res.status(409).json({ error: 'Channel name already exists' });

    const channel = await Channel.create({
      name: rawName,
      createdBy: creatorId,
      members: [creatorId],
      isPrivate,
      capacity,
      invitedUsers: isPrivate ? [creatorId] : [],
    });

    const populated = await Channel.findById(channel._id)
      .populate('createdBy', 'username name email profileUrl')
      .populate('members', 'username name email profileUrl isOnline lastSeen')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    console.error('createChannel error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.joinChannel = async (req, res) => {
  try {
    const identifier = safeTrim(req.params.id); // can be _id or name
    const userId = req.userId;

    if (!identifier) {
      return res.status(400).json({ error: 'Channel id or name is required' });
    }

    let channel = null;

    if (mongoose.isValidObjectId(identifier)) {
      channel = await Channel.findById(identifier);
    }

    if (!channel) {
      channel = await Channel.findOne({
        name: { $regex: `^${identifier}$`, $options: 'i' },
      });
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.capacity > 0 && channel.members.length >= channel.capacity) {
      return res.status(403).json({ error: 'Channel capacity reached' });
    }

    if (channel.isPrivate) {
      const invited = (channel.invitedUsers || []).map(String);
      const allowed =
        String(channel.createdBy) === String(userId) ||
        invited.includes(String(userId));

      if (!allowed) {
        return res.status(403).json({ error: 'You are not invited to this private channel' });
      }
    }

    if (!channel.members.map(String).includes(String(userId))) {
      channel.members.push(userId);
      await channel.save();
    }

    const populated = await Channel.findById(channel._id)
      .populate('members', 'username name email profileUrl isOnline lastSeen')
      .populate('createdBy', 'username name email profileUrl')
      .lean();

    return res.json(populated);
  } catch (err) {
    console.error('joinChannel error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getChannels = async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ isPrivate: false }, { members: userId }],
    };

    const [total, channels] = await Promise.all([
      Channel.countDocuments(query),
      Channel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username name email profileUrl')
        .populate('members', 'username name email profileUrl isOnline lastSeen')
        .lean(),
    ]);

    return res.json({ total, page, limit, channels });
  } catch (err) {
    console.error('getChannels error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getMyChannels = async (req, res) => {
  try {
    const userId = req.userId;
    const channels = await Channel.find({ members: userId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username name email profileUrl')
      .populate('members', 'username name email profileUrl isOnline lastSeen')
      .lean();

    return res.json({ channels });
  } catch (err) {
    console.error('getMyChannels error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getChannelMembers = async (req, res) => {
  try {
    const channelId = req.params.id;
    if (!mongoose.isValidObjectId(channelId)) {
      return res.status(400).json({ error: 'Invalid channel id' });
    }

    const channel = await Channel.findById(channelId)
      .populate('members', 'username name email profileUrl isOnline lastSeen')
      .lean();

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    return res.json({ members: channel.members || [] });
  } catch (err) {
    console.error('getChannelMembers error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.inviteUser = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userToInvite = req.body.userIdToInvite;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(channelId)) {
      return res.status(400).json({ error: 'Invalid channel id' });
    }
    if (!mongoose.isValidObjectId(userToInvite)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    if (String(channel.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'Only channel creator can invite users' });
    }

    const user = await User.findById(userToInvite).select('_id username');
    if (!user) return res.status(404).json({ error: 'User to invite not found' });

    channel.invitedUsers = channel.invitedUsers || [];
    if (!channel.invitedUsers.map(String).includes(String(userToInvite))) {
      channel.invitedUsers.push(userToInvite);
      await channel.save();
    }

    return res.json({ message: 'User invited' });
  } catch (err) {
    console.error('inviteUser error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(channelId)) {
      return res.status(400).json({ error: 'Invalid channel id' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    if (String(channel.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'Not allowed to delete this channel' });
    }

    await Channel.deleteOne({ _id: channelId });
    return res.json({ message: 'Channel deleted' });
  } catch (err) {
    console.error('deleteChannel error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
