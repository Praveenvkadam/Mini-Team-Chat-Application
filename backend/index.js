require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// DB + Routers
const connectDB = require('./src/db/connection');
const AuthRouter = require('./src/routes/AuthRouter');
const ChannelRouter = require('./src/routes/ChannelRouter');   // <-- IMPORTANT
const setupSocketHandlers = require('./src/sockets/SignupHandler');
const MessageRouter = require('./src/routes/messageRouter');

const app = express();
const server = http.createServer(app);

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
fs.mkdirSync(uploadsDir, { recursive: true });

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Routes
app.use('/api/auth', AuthRouter);
app.use('/api/channels', ChannelRouter);   // <-- REGISTERED HERE

app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});

app.use('/api/messages', MessageRouter);

// SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
});

// Socket authentication middleware
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').split(' ')[1];

    if (!token) return next(new Error('Authentication error: token missing'));

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    socket.userId = payload.id || payload.userId || payload._id;
    if (!socket.userId) return next(new Error('Authentication error: invalid payload'));

    next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Register socket events
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3002;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection error:', err);
    process.exit(1);
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
