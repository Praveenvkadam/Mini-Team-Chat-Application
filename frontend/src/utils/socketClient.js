import { io } from "socket.io-client";

export function createSocket(token) {
  if (!token) throw new Error("createSocket: token required");
  return io(import.meta.env.VITE_API_URL || "http://localhost:3002", {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });
}
