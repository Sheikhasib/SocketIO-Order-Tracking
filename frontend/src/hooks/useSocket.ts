import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Establish socket connection and handle events
  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("✅ Connected to server:", socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("❌ Disconnected from server");
    });

    socket.on("connected", (data: { message: string }) => {
      console.log("📨 Server message:", data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
  };
};
