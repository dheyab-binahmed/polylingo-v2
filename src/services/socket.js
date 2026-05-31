import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

/**
 * Pending listeners: registered before connectSocket() is called.
 * Map<eventName, Set<callback>>
 */
const pendingListeners = new Map();

function _addListener(event, cb) {
  if (socket) {
    socket.on(event, cb);
  } else {
    if (!pendingListeners.has(event)) pendingListeners.set(event, new Set());
    pendingListeners.get(event).add(cb);
  }
  // Return cleanup function
  return () => _removeListener(event, cb);
}

function _removeListener(event, cb) {
  socket?.off(event, cb);
  pendingListeners.get(event)?.delete(cb);
}

function _flushPendingListeners() {
  for (const [event, callbacks] of pendingListeners.entries()) {
    for (const cb of callbacks) {
      socket.on(event, cb);
    }
  }
  pendingListeners.clear();
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    socket.emit("authenticate", { token });
    // Attach any listeners that were registered before the socket existed
    _flushPendingListeners();
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
  return _addListener("dm:message", cb);
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
  return _addListener("call:incoming", cb);
}

export function offCallIncoming(cb) {
  _removeListener("call:incoming", cb);
}

export function onCallAnswered(cb) {
  return _addListener("call:answered", cb);
}

export function onCallIce(cb) {
  return _addListener("call:ice", cb);
}

export function onCallEnded(cb) {
  return _addListener("call:ended", cb);
}

export function onPresenceUpdate(cb) {
  return _addListener("presence:update", cb);
}
