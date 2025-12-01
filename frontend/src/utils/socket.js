// frontend/src/utils/socket.js
import { io } from "socket.io-client";

let socket = null;

export function initSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
    socket = io(url, { transports: ["websocket", "polling"] });
  }
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized — call initSocket() first");
  return socket;
}
