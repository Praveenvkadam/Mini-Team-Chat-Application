const Message = require('../models/Message');
const Channel = require('../models/Channel');

exports.getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId required' });
    }

    const userId = req.userId;

    // ✅ only members can read messages
    const channel = await Channel.findOne({
      _id: channelId,
      members: userId,
    });

    if (!channel) {
      return res.status(403).json({ error: 'Join this channel to view messages' });
    }

    const limit = Math.min(100, parseInt(req.query.limit || '30', 10));
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const messages = await Message.find({
      channel: channelId,
      createdAt: { $lt: before },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username _id');

    res.json(messages);
  } catch (err) {
    console.error('getMessages error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { channelId, text } = req.body;
    const sender = req.userId;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId required' });
    }

  
    const channel = await Channel.findOne({
      _id: channelId,
      members: sender,
    });

    if (!channel) {
      return res.status(403).json({ error: 'Join this channel to send messages' });
    }

    const msg = await Message.create({
      channel: channelId,
      sender,
      text: String(text || ''),
    });

    const populated = await msg.populate('sender', 'username _id');
    res.status(201).json(populated);
  } catch (err) {
    console.error('postMessage error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId required' });
    }

    const msg = await Message.findById(messageId);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not allowed to delete this message' });
    }

    await Message.deleteOne({ _id: messageId });

    res.json({ success: true, messageId });
  } catch (err) {
    console.error('deleteMessage error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId required' });
    }

    const msg = await Message.findById(messageId);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not allowed to edit this message' });
    }

    msg.text = String(text || '');
    await msg.save();
    const populated = await msg.populate('sender', 'username _id');

    res.json(populated);
  } catch (err) {
    console.error('editMessage error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
