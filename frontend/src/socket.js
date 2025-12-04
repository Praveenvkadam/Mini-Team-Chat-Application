import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

export const socket = io(API_URL, {
  autoConnect: false,          
  transports: ["websocket"],
});

export function ensureSocketConnected() {
  const token = localStorage.getItem("token");
  if (!token) return;

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
