const jwt = require('jsonwebtoken');
const User = require('../models/User');

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('No auth token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) return next(new Error('User not found'));

      socket.user = { id: user._id.toString(), name: user.name };
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // mark online
    await User.findByIdAndUpdate(userId, { isOnline: true });

    io.emit('presence:update', { userId, isOnline: true });

    console.log('Socket connected', userId, socket.id);

    socket.on('disconnect', async () => {
      // in real app handle multi-tabs by tracking socket count per user
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      io.emit('presence:update', {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
      console.log('Socket disconnected', userId, socket.id);
    });
  });
};

module.exports = setupSocketHandlers;
