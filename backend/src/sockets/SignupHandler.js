const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');

module.exports = function setupSocketHandlers(io) {
  const userSockets = new Map();
  const lastMessageAt = new Map(); 
  const MESSAGE_MIN_INTERVAL = 300; 

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user || !user.id) {
      socket.disconnect(true);
      return;
    }
    const uid = String(user.id);

    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    if (userSockets.get(uid).size === 1) {
      User.findByIdAndUpdate(uid, { isOnline: true, lastSeen: new Date() }).exec().catch(()=>{});
      io.emit('presence:update', { userId: uid, isOnline: true });
    }

    console.log('Socket connected', uid, socket.id);

    socket.on('join:channel', async ({ channelId } = {}) => {
      if (!channelId) return socket.emit('error', { code: 'NO_CHANNEL', message: 'channelId required' });
      try {
        const channel = await Channel.findById(channelId).exec();
        if (!channel) return socket.emit('error', { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' });
        socket.join(`channel:${channelId}`);
        socket.emit('joined:channel', { channelId });
      } catch (err) {
        console.error('join error', err);
        socket.emit('error', { code: 'JOIN_FAIL', message: 'Failed to join channel' });
      }
    });

    socket.on('leave:channel', ({ channelId } = {}) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
      socket.emit('left:channel', { channelId });
    });

    socket.on('message:new', async (payload) => {
      try {
        const now = Date.now();
        const lastAt = lastMessageAt.get(uid) || 0;
        if (now - lastAt < MESSAGE_MIN_INTERVAL) {
          return socket.emit('error', { code: 'RATE_LIMIT', message: 'You are sending messages too fast' });
        }
        lastMessageAt.set(uid, now);

        const { channelId, text, attachments } = payload || {};
        if (!channelId) return socket.emit('error', { code: 'NO_CHANNEL', message: 'channelId required' });
        if ((!text || !String(text).trim()) && (!attachments || attachments.length === 0)) {
          return socket.emit('error', { code: 'EMPTY_MESSAGE', message: 'Message empty' });
        }

        const msg = await Message.create({
          channel: channelId,
          sender: uid,
          text: String(text || ''),
          attachments: attachments || []
        });

        const populated = await msg.populate('sender', 'username _id');

        io.to(`channel:${channelId}`).emit('message:received', populated);
      } catch (err) {
        console.error('message:new error', err);
        socket.emit('error', { code: 'MSG_SAVE_FAIL', message: 'Failed to save message' });
      }
    });

    socket.on('typing', ({ channelId, isTyping = true } = {}) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('typing', { userId: uid, isTyping });
    });

    socket.on('message:update', async ({ messageId, text } = {}) => {
      try {
        if (!messageId) return socket.emit('error', { code: 'NO_MSG_ID', message: 'messageId required' });
        const m = await Message.findById(messageId).exec();
        if (!m) return socket.emit('error', { code: 'MSG_NOT_FOUND', message: 'Message not found' });
        if (String(m.sender) !== uid) return socket.emit('error', { code: 'NOT_ALLOWED', message: 'Not allowed' });
        m.text = String(text || '');
        await m.save();
        io.to(`channel:${m.channel}`).emit('message:updated', m);
      } catch (err) {
        console.error('message:update error', err);
        socket.emit('error', { code: 'MSG_UPDATE_FAIL', message: 'Failed to update message' });
      }
    });

    socket.on('message:delete', async ({ messageId } = {}) => {
      try {
        if (!messageId) return socket.emit('error', { code: 'NO_MSG_ID', message: 'messageId required' });
        const m = await Message.findById(messageId).exec();
        if (!m) return socket.emit('error', { code: 'MSG_NOT_FOUND', message: 'Message not found' });
        if (String(m.sender) !== uid) return socket.emit('error', { code: 'NOT_ALLOWED', message: 'Not allowed' });
        await Message.deleteOne({ _id: messageId });
        io.to(`channel:${m.channel}`).emit('message:deleted', { messageId });
      } catch (err) {
        console.error('message:delete error', err);
        socket.emit('error', { code: 'MSG_DELETE_FAIL', message: 'Failed to delete message' });
      }
    });

    socket.on('disconnect', () => {
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(uid);
          User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() }).exec().catch(()=>{});
          io.emit('presence:update', { userId: uid, isOnline: false, lastSeen: new Date() });
        }
      }
      console.log('Socket disconnected', uid, socket.id);
    });
  });
};
