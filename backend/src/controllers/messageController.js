const Message = require('../models/Message');

// GET /api/messages/:channelId?before=<iso>&limit=20
exports.getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = Math.min(100, parseInt(req.query.limit || '30', 10));
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const messages = await Message.find({
      channel: channelId,
      createdAt: { $lt: before }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username');

    res.json(messages);
  } catch (err) {
    console.error('getMessages error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/messages
// body: { channelId, text }
exports.postMessage = async (req, res) => {
  try {
    const { channelId, text } = req.body;
    const sender = req.userId;

    if (!channelId) return res.status(400).json({ error: 'channelId required' });

    const msg = await Message.create({ channel: channelId, sender, text: String(text || '') });
    const populated = await msg.populate('sender', 'username');

    // Optionally emit via socket if you have io instance (more work to wire)
    res.status(201).json(populated);
  } catch (err) {
    console.error('postMessage error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
