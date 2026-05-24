import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    socket.emit("authenticate", { token });
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function sendDM(to, text, tempId) {
  socket?.emit("send_dm", { to, text, tempId });
}

export function onDmMessage(cb) {
  socket?.on("dm:message", cb);
  return () => socket?.off("dm:message", cb);
}

export function sendCallOffer(to, offer, callType) {
  socket?.emit("call:offer", { to, offer, callType });
}

export function sendCallAnswer(to, answer) {
  socket?.emit("call:answer", { to, answer });
}

export function sendIceCandidate(to, candidate) {
  socket?.emit("call:ice", { to, candidate });
}

export function endCall(to) {
  socket?.emit("call:end", { to });
}

export function onCallIncoming(cb) {
  socket?.on("call:incoming", cb);
  return () => socket?.off("call:incoming", cb);
}

export function offCallIncoming(cb) {
  socket?.off("call:incoming", cb);
}

export function onCallAnswered(cb) {
  socket?.on("call:answered", cb);
  return () => socket?.off("call:answered", cb);
}

export function onCallIce(cb) {
  socket?.on("call:ice", cb);
  return () => socket?.off("call:ice", cb);
}

export function onCallEnded(cb) {
  socket?.on("call:ended", cb);
  return () => socket?.off("call:ended", cb);
}

export function onPresenceUpdate(cb) {
  socket?.on("presence:update", cb);
  return () => socket?.off("presence:update", cb);
}
