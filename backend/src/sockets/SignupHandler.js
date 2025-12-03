// src/sockets/SignupHandler.js
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');

/**
 * Socket handler with:
 * - multi-tab presence tracking
 * - join/leave rooms
 * - message create/update/delete
 * - typing indicator
 *
 * NOTE: This is single-server (in-memory maps). If you deploy multiple instances,
 * you MUST use a Redis adapter and move presence tracking to Redis.
 */
module.exports = function setupSocketHandlers(io) {
  // userId -> Set(socketId)
  const userSockets = new Map();

  // Simple per-user rate limiter placeholder: you should replace with robust implementation
  const lastMessageAt = new Map(); // userId -> timestamp(ms)
  const MESSAGE_MIN_INTERVAL = 300; // ms between messages (quick throttle)

  io.on('connection', (socket) => {
    // require socket.user presence (your auth middleware should set it)
    const user = socket.user;
    if (!user || !user.id) {
      socket.disconnect(true);
      return;
    }
    const uid = String(user.id);

    // add socket to user map
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    // mark online only when first socket connects
    if (userSockets.get(uid).size === 1) {
      User.findByIdAndUpdate(uid, { isOnline: true, lastSeen: new Date() }).exec().catch(()=>{});
      io.emit('presence:update', { userId: uid, isOnline: true });
    }

    // Logging
    console.log('Socket connected', uid, socket.id);

    // JOIN channel
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

    // LEAVE channel
    socket.on('leave:channel', ({ channelId } = {}) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
      socket.emit('left:channel', { channelId });
    });

    // New message: validate, throttle, persist, broadcast
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

        // Optional: validate user is a member of private channel here
        // const channel = await Channel.findById(channelId);
        // if (channel.isPrivate && !channel.members.includes(uid)) return socket.emit('error', ...)

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

    // Typing indicator
    socket.on('typing', ({ channelId, isTyping = true } = {}) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('typing', { userId: uid, isTyping });
    });

    // Update message (only sender)
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

    // Delete message (only sender)
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

    // Disconnect
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
