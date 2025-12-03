// src/controllers/channelController.js
const Channel = require('../models/Channel');
const mongoose = require('mongoose');

/**
 * Create channel
 * POST /api/channels
 * body: { name, isPrivate?, capacity? }
 */
exports.createChannel = async (req, res) => {
  try {
    const { name, isPrivate = false, capacity = 0 } = req.body;
    const creatorId = req.userId;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // simple validation
    if (typeof capacity !== 'number' && typeof capacity !== 'string') {
      return res.status(400).json({ error: 'Invalid capacity' });
    }
    const capNum = Number(capacity) || 0;
    if (capNum < 0) return res.status(400).json({ error: 'Capacity must be >= 0' });
    if (String(name).length > 100) return res.status(400).json({ error: 'Name too long' });

    // case-insensitive uniqueness
    const exists = await Channel.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) return res.status(409).json({ error: 'Channel name already exists' });

    const channel = await Channel.create({
      name: String(name).trim(),
      createdBy: creatorId,
      members: [creatorId],
      isPrivate: Boolean(isPrivate),
      capacity: capNum
    });

    return res.status(201).json(channel);
  } catch (err) {
    console.error('createChannel error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Join channel
 * POST /api/channels/:id/join
 */
exports.joinChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(channelId)) return res.status(400).json({ error: 'Invalid channel id' });

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    // capacity check
    if (channel.capacity > 0 && channel.members.length >= channel.capacity) {
      return res.status(403).json({ error: 'Channel capacity reached' });
    }

    // if channel is private, you may want to enforce invite logic here
    if (channel.isPrivate) {
      // default: allow join for now, but you can change it.
      // return res.status(403).json({ error: 'Channel is private' });
    }

    if (!channel.members.map(String).includes(String(userId))) {
      channel.members.push(userId);
      await channel.save();
    }

    return res.json(channel);
  } catch (err) {
    console.error('joinChannel error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * List channels (public + joined) with pagination
 * GET /api/channels?page=1&limit=20
 */
exports.getChannels = async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { isPrivate: false },
        { members: userId }
      ]
    };

    const [total, channels] = await Promise.all([
      Channel.countDocuments(query),
      Channel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    return res.json({ total, page, limit, channels });
  } catch (err) {
    console.error('getChannels error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get channels the current user is a member of
 * GET /api/channels/mine
 */
exports.getMyChannels = async (req, res) => {
  try {
    const userId = req.userId;
    const channels = await Channel.find({ members: userId }).sort({ createdAt: -1 }).lean();
    return res.json({ channels });
  } catch (err) {
    console.error('getMyChannels error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete a channel
 * DELETE /api/channels/:id
 * Only creator or admin allowed (here: only creator allowed)
 */
exports.deleteChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(channelId)) return res.status(400).json({ error: 'Invalid channel id' });

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    // Only creator can delete — modify if you want admins
    if (String(channel.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'Not allowed to delete this channel' });
    }

    await Channel.deleteOne({ _id: channelId });
    // optional: delete related messages (if you have Message model)
    // await Message.deleteMany({ channel: channelId });

    return res.json({ message: 'Channel deleted' });
  } catch (err) {
    console.error('deleteChannel error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
