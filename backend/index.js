require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const connectDB = require('./src/db/connection');
const AuthRouter = require('./src/routes/AuthRouter');
const setupSocketHandlers = require('./src/sockets/SignupHandler');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL ,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', AuthRouter);

app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3002;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
