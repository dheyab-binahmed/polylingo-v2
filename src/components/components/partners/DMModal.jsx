import { useState, useRef, useEffect } from "react";
import { getDmMessages, postDmMessage } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Load history : GET  /api/community/dm/:partnerId/messages
// Send message : POST /api/community/dm/:partnerId/messages  { text }
// Real-time    : socket.on("dm:message", msg => setMsgs(p => [...p, msg]))
// Start call   : WebRTC peer connection using roomToken from backend
//              : POST /api/community/dm/:partnerId/call → { roomToken }
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (s) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const DMModal = ({ partner, onClose, onCall }) => {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  // Call state
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState(""); // "audio" | "video"
  const [callMic, setCallMic] = useState(true);
  const [callCam, setCallCam] = useState(true);
  const [callTimer, setCallTimer] = useState(0);
  const [callError, setCallError] = useState("");

  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  const timerRef = useRef(null);
  const typingRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);
  const optimisticIds = useRef(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
    let mounted = true;
    const load = async () => {
      try {
        const data = await getDmMessages(partner.id);
        if (!mounted) return;
        const serverMessages = data.messages || [];
        setMsgs(serverMessages);
        optimisticIds.current.clear();
      } catch (err) {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(typingRef.current);
      clearInterval(timerRef.current);
      stopStream();
    };
  }, [partner.id]);

  // Call duration timer
  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callActive]);

  // Attach stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [callActive]);

  const stopStream = () => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
  };

  // ── Start call — requests real permission ─────────────────────────────
  const startCall = async (type) => {
    setCallError("");
    setCallType(type);

    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          type === "video"
            ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
              }
            : false,
      };

      // Browser will show permission popup here
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;

      setCallActive(true);
      setCallMic(true);
      setCallCam(type === "video");

      // BACKEND INTEGRATION: POST /api/community/dm/:partnerId/call → { roomToken }
      // Then: create RTCPeerConnection, add tracks from stream, do signalling
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setCallError(
          `${type === "video" ? "Camera/microphone" : "Microphone"} permission denied. Please allow access in your browser settings.`,
        );
      } else if (err.name === "NotFoundError") {
        setCallError(
          `No ${type === "video" ? "camera or microphone" : "microphone"} found on this device.`,
        );
      } else {
        setCallError("Could not start call: " + err.message);
      }
    }
  };

  const endCall = () => {
    stopStream();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setCallActive(false);
    setCallType("");
    setCallError("");
    // BACKEND INTEGRATION: POST /api/community/dm/:partnerId/call/end
  };

  const toggleMic = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((t) => {
        t.enabled = !callMic;
      });
    }
    setCallMic((m) => !m);
  };

  const toggleCam = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((t) => {
        t.enabled = !callCam;
      });
    }
    setCallCam((c) => !c);
  };

  // ── Chat ──────────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || !user?.id || sendingRef.current) return;
    sendingRef.current = true;
    const tempId = Date.now();
    optimisticIds.current.add(tempId);
    const optimistic = {
      id: tempId,
      from: user.id,
      text,
      ts: new Date().toISOString(),
    };
    setMsgs((p) => [...p, optimistic]);
    setInput("");
    setTyping(true);
    try {
      await postDmMessage(partner.id, text);
    } catch (err) {
      setMsgs((p) => p.filter((m) => m.id !== tempId));
      optimisticIds.current.delete(tempId);
    } finally {
      setTyping(false);
      sendingRef.current = false;
    }
  };

  return (
    <>
      <style>{`
        .dm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:flex-end;z-index:950;padding:20px;backdrop-filter:blur(3px);}
        .dm-box{background:var(--bg-card);border-radius:20px;width:100%;max-width:430px;height:600px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.28);animation:fadeInUp .25s ease;}
        .dm-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10;}
        .dm-msgs::-webkit-scrollbar{width:4px;}
        .dm-msgs::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
        @keyframes dmBounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes callPulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      <div
        className="dm-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="dm-box">
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 16px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              background: "var(--bg-card)",
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                className="ava"
                style={{
                  width: 40,
                  height: 40,
                  background: partner.color,
                  fontSize: 14,
                }}
              >
                {partner.initials}
              </div>
              {partner.online && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 11,
                    height: 11,
                    background: "#10b981",
                    border: "2px solid var(--bg-card)",
                    borderRadius: "50%",
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--text-base)",
                }}
              >
                {partner.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: callActive
                    ? "#10b981"
                    : partner.online
                      ? "#10b981"
                      : "var(--text-muted)",
                }}
              >
                {callActive ? (
                  <span
                    style={{
                      animation: "callPulse 1s infinite",
                      display: "inline-block",
                    }}
                  >
                    📞 {callType === "video" ? "Video" : "Voice"} call ·{" "}
                    {fmt(callTimer)}
                  </span>
                ) : partner.online ? (
                  "● Online"
                ) : (
                  "○ Offline"
                )}
              </div>
            </div>

            {/* Call action buttons */}
            {!callActive ? (
              <div style={{ display: "flex", gap: 6 }}>
                {/* Voice call */}
                <button
                  onClick={() => startCall("audio")}
                  title="Voice call"
                  style={{
                    background: "var(--bg-subtle)",
                    border: "none",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                  }}
                >
                  📞
                </button>
                {/* Video call */}
                <button
                  onClick={() => startCall("video")}
                  title="Video call"
                  style={{
                    background: "var(--bg-subtle)",
                    border: "none",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6366f1",
                  }}
                >
                  📹
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={toggleMic}
                  title={callMic ? "Mute" : "Unmute"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    opacity: callMic ? 1 : 0.5,
                  }}
                >
                  {callMic ? "🎙️" : "🔇"}
                </button>
                {callType === "video" && (
                  <button
                    onClick={toggleCam}
                    title={callCam ? "Stop cam" : "Start cam"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      opacity: callCam ? 1 : 0.5,
                    }}
                  >
                    {callCam ? "📹" : "📷"}
                  </button>
                )}
                <button
                  onClick={endCall}
                  title="End call"
                  style={{
                    background: "#DC2626",
                    border: "none",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  📞
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                background: "var(--bg-subtle)",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
              }}
            >
              ×
            </button>
          </div>

          {/* ── Active call panel ── */}
          {callActive && (
            <div style={{ flexShrink: 0 }}>
              {/* Call info bar */}
              <div
                style={{
                  background: "rgba(16,185,129,.1)",
                  borderBottom: "1px solid rgba(16,185,129,.2)",
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#10b981",
                      animation: "callPulse 1s infinite",
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}
                  >
                    {callType === "video" ? "Video" : "Voice"} call ·{" "}
                    {fmt(callTimer)}
                  </span>
                </div>
                <button
                  onClick={endCall}
                  style={{
                    background: "#DC2626",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "4px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  End call
                </button>
              </div>

              {/* Video preview — shows YOUR camera if video call */}
              {callType === "video" && (
                <div
                  style={{
                    background: "#0f172a",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  {/* Self video */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {callCam ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: 110,
                          height: 75,
                          objectFit: "cover",
                          borderRadius: 10,
                          display: "block",
                          border: "2px solid #6366f1",
                          background: "#1e293b",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 110,
                          height: 75,
                          borderRadius: 10,
                          background: "#1e293b",
                          border: "2px solid #6366f1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          className="ava"
                          style={{
                            width: 32,
                            height: 32,
                            background: "#6366f1",
                            fontSize: 11,
                          }}
                        >
                          ME
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,.4)",
                            marginTop: 4,
                          }}
                        >
                          Cam off
                        </div>
                      </div>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 4,
                        fontSize: 9,
                        color: "#fff",
                        background: "rgba(0,0,0,.6)",
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}
                    >
                      You
                    </div>
                  </div>

                  {/* Partner video placeholder */}
                  {/* BACKEND INTEGRATION: Replace with <video ref={remoteVideoRef} autoPlay playsInline srcObject={remoteStream} /> */}
                  <div
                    style={{
                      flex: 1,
                      height: 75,
                      borderRadius: 10,
                      background: "#1e293b",
                      border: "2px solid rgba(255,255,255,.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      className="ava"
                      style={{
                        width: 32,
                        height: 32,
                        background: partner.color,
                        fontSize: 11,
                      }}
                    >
                      {partner.initials}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,.35)",
                        marginTop: 4,
                      }}
                    >
                      Connecting…
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Permission error ── */}
          {callError && (
            <div
              style={{
                margin: "10px 14px 0",
                padding: "10px 14px",
                background: "rgba(239,68,68,.1)",
                border: "1px solid rgba(239,68,68,.3)",
                borderRadius: 10,
                fontSize: 13,
                color: "var(--danger)",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                flexShrink: 0,
              }}
            >
              <span style={{ flexShrink: 0 }}>⚠️</span>
              {callError}
            </div>
          )}

          {/* ── Messages ── */}
          <div className="dm-msgs">
            {/* BACKEND INTEGRATION: GET /api/community/dm/:partnerId/messages */}
            {msgs.length === 0 && !typing && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: "40px 20px",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Say hello to {partner.name}!
                </div>
                <div style={{ fontSize: 13 }}>
                  You're connected — start a conversation.
                </div>
              </div>
            )}
            {msgs.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: msg.from === user?.id ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                {msg.from !== user?.id && (
                  <div
                    className="ava"
                    style={{
                      width: 26,
                      height: 26,
                      background: partner.color,
                      fontSize: 9,
                      flexShrink: 0,
                    }}
                  >
                    {partner.initials}
                  </div>
                )}
                <div style={{ maxWidth: "75%" }}>
                  <div
                    style={{
                      background:
                        msg.from === user?.id
                          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                          : "var(--bg-subtle)",
                      color:
                        msg.from === user?.id ? "#fff" : "var(--text-base)",
                      borderRadius:
                        msg.from === user?.id
                          ? "16px 4px 16px 16px"
                          : "4px 16px 16px 16px",
                      padding: "9px 13px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      border:
                        msg.from === user?.id
                          ? "none"
                          : "1px solid var(--border)",
                    }}
                  >
                    {msg.text}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      marginTop: 3,
                      textAlign: msg.from === user?.id ? "right" : "left",
                    }}
                  >
                    {new Date(msg.created_at || Date.now()).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div
                  className="ava"
                  style={{
                    width: 26,
                    height: 26,
                    background: partner.color,
                    fontSize: 9,
                    flexShrink: 0,
                  }}
                >
                  {partner.initials}
                </div>
                <div
                  style={{
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "10px 14px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--text-muted)",
                        animation: `dmBounce 1.2s infinite ${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
              background: "var(--bg-card)",
            }}
          >
            <textarea
              ref={inputRef}
              className="chat-fc"
              rows={1}
              placeholder={`Message ${partner.name}… (Enter to send)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sendingRef.current) send();
                }
              }}
              style={{ resize: "none", flex: 1 }}
            />
            <button
              className="btn-coral"
              onClick={send}
              disabled={!input.trim() || sendingRef.current}
              style={{ padding: "8px 13px", flexShrink: 0 }}
            >
              ✈️
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DMModal;
