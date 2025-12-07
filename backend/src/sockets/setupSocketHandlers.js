// src/sockets/setupSocketHandlers.js
const Channel = require('../models/Channel');
const User = require('../models/User');

module.exports = function setupSocketHandlers(io) {
  const userSockets = new Map();

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user || !user.id) {
      socket.disconnect(true);
      return;
    }

    const uid = String(user.id);

    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    socket.emit('presence:snapshot', {
      onlineUserIds: Array.from(userSockets.keys()),
    });

    if (userSockets.get(uid).size === 1) {
      const now = new Date();
      User.findByIdAndUpdate(uid, { isOnline: true, lastSeen: now })
        .exec()
        .catch(() => {});
      io.emit('presence:update', { userId: uid, isOnline: true, lastSeen: now });
    }

    console.log('Socket connected', uid, socket.id);

    socket.on('join:channel', async ({ channelId } = {}) => {
      if (!channelId) {
        return socket.emit('error', {
          code: 'NO_CHANNEL',
          message: 'channelId required',
        });
      }
      try {
        const channel = await Channel.findById(channelId).exec();
        if (!channel) {
          return socket.emit('error', {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Channel not found',
          });
        }
        socket.join(`channel:${channelId}`);
        socket.emit('joined:channel', { channelId });
      } catch (err) {
        console.error('join error', err);
        socket.emit('error', {
          code: 'JOIN_FAIL',
          message: 'Failed to join channel',
        });
      }
    });

    socket.on('leave:channel', ({ channelId } = {}) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
      socket.emit('left:channel', { channelId });
    });

    socket.on('typing', ({ channelId, isTyping = true } = {}) => {
      if (!channelId) return;
      const payload = {
        userId: uid,
        username: user.username,
        channelId,
        isTyping: Boolean(isTyping),
      };
      socket.to(`channel:${channelId}`).emit('typing', payload);
    });

    socket.on('disconnect', () => {
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(uid);
          const now = new Date();
          User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: now })
            .exec()
            .catch(() => {});
          io.emit('presence:update', {
            userId: uid,
            isOnline: false,
            lastSeen: now,
          });
        }
      }
      console.log('Socket disconnected', uid, socket.id);
    });
  });
};
