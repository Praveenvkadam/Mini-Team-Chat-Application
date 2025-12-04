require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./src/db/connection");
const AuthRouter = require("./src/routes/AuthRouter");
const ChannelRouter = require("./src/routes/ChannelRouter");
const setupSocketHandlers = require("./src/sockets/setupSocketHandlers");
const MessageRouter = require("./src/routes/messageRouter");

const app = express();
const server = http.createServer(app);

const uploadsDir = path.join(__dirname, "uploads", "profiles");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const CLIENT_URLS = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

console.log("CLIENT_URLS:", CLIENT_URLS);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;                                
  if (origin.startsWith("http://localhost:")) return true; 
  if (origin.endsWith(".vercel.app")) return true;         
  if (CLIENT_URLS.includes(origin)) return true;          
  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.log("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use("/api/auth", AuthRouter);
app.use("/api/channels", ChannelRouter);
app.use("/api/messages", MessageRouter);

app.get("/", (req, res) => res.json({ message: "API running" }));

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      console.log("Socket.io CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 30000,
});


io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || "").split(" ")[1];

    if (!token) return next(new Error("Missing token"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const userId = payload.id || payload.userId || payload._id;
    if (!userId) return next(new Error("Invalid token payload"));

    // normalize and attach
    socket.userId = String(userId);
    socket.user = {
      id: socket.userId,                                 
      username: payload.username || payload.name || payload.email || "",
      email: payload.email,
    };

    next();
  } catch (err) {
    console.error("Socket auth failed:", err.message);
    next(new Error("Socket auth failed"));
  }
});


setupSocketHandlers(io);

const PORT = process.env.PORT || 3002;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("Server running on port:", PORT);
      console.log("Allowed origins (env):", CLIENT_URLS);
    });
  })
  .catch((err) => {
    console.error("DB Connection Error", err);
    process.exit(1);
  });

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
