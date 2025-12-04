1  import { io } from "socket.io-client";
2
3  let socket = null;
4
5  export function initSocket(token) {
6    if (!token) throw new Error("initSocket: token required");
7    if (!socket) {
8      socket = io(import.meta.env.VITE_API_URL || "http://localhost:3002", {
9        auth: { token },
10       transports: ["websocket"],
11       autoConnect: true,
12     });
13   }
14   return socket;
15 }
16
17 export function getSocket() {
18   if (!socket) throw new Error("getSocket: socket not initialized");
19   return socket;
20 }
