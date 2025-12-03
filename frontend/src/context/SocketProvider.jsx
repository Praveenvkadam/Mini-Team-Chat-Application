// src/context/SocketProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createSocket } from "../utils/socketClient";

const SocketContext = createContext({
  socket: null,
  connected: false,
  presence: {},
});

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // no token — nothing to do. Provider still gives stable object.
      return;
    }

    const socket = createSocket(token);
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onPresence = (p) => setPresence(prev => ({ ...prev, [p.userId]: p }));

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:update", onPresence);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:update", onPresence);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const value = useMemo(() => ({
    socket: socketRef.current,
    connected,
    presence,
  }), [connected, presence]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
