import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) return socket;
  const BASE =
    import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ||
    "http://localhost:5000";
  socket = io(BASE, { transports: ["websocket"], autoConnect: false });
  socket.connect();
  socket.on("connect", () => {
    socket.emit("authenticate", { token });
  });
  return socket;
}

export function on(event, cb) {
  if (!socket) return;
  socket.on(event, cb);
}

export function off(event, cb) {
  if (!socket) return;
  socket.off(event, cb);
}

export function sendSignal(to, payload) {
  if (!socket) return;
  socket.emit("signal", { to, payload });
}

export function joinCall(room) {
  if (!socket) return;
  socket.emit("join_call", { room });
}

export function leaveCall(room) {
  if (!socket) return;
  socket.emit("leave_call", { room });
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
