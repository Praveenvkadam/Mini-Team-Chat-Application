require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const connectDB = require('./src/db/connection');
const AuthRouter = require('./src/routes/AuthRouter');
const setupSocketHandlers = require('./src/sockets/SignupHandler');

const app = express();
const server = http.createServer(app);

const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use('/api/auth', AuthRouter);

app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3002;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);

});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
