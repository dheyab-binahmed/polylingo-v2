import { useState, useEffect, useRef, useCallback } from "react";
import {
  sendGroupCallJoin,
  sendGroupCallLeave,
  sendGroupCallOffer,
  sendGroupCallAnswer,
  sendGroupCallIce,
  onGroupCallPeerJoined,
  offGroupCallPeerJoined,
  onGroupCallPeerLeft,
  offGroupCallPeerLeft,
  onGroupCallOffer,
  offGroupCallOffer,
  onGroupCallAnswer,
  offGroupCallAnswer,
  onGroupCallIce,
  offGroupCallIce,
} from "../../../../services/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "6581927f246d886071999175",
      credential: "zG5aDkE2qoxGbHHR",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "6581927f246d886071999175",
      credential: "zG5aDkE2qoxGbHHR",
    },
  ],
};

const fmt = (s) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function getCurrentUserId() {
  try {
    return JSON.parse(localStorage.getItem("polylingo_auth_user") || "{}").id || null;
  } catch (_) {
    return null;
  }
}

const VideoTab = ({ group, onLeave }) => {
  const [inCall, setInCall] = useState(false);
  const [joining, setJoining] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatVal, setChatVal] = useState("");
  const [permError, setPermError] = useState("");
  // Map of userId → { name, initials, stream } for remote peers
  const [peers, setPeers] = useState({});

  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const timerRef = useRef(null);
  const chatBottomRef = useRef(null);
  // userId → RTCPeerConnection
  const peerConns = useRef({});
  // userId → HTMLVideoElement (set via callback refs in JSX)
  const remoteVideoEls = useRef({});
  // userId → ICE candidate queue (before remote description is set)
  const iceBuffers = useRef({});
  const currentUserId = useRef(getCurrentUserId());
  const groupIdRef = useRef(group.id);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (inCall) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [inCall]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAllStreams();
      closeAllPeerConns();
    };
  }, []);

  // ── When local stream changes, attach to all existing peer connections ────
  const addTracksToPeer = useCallback((pc) => {
    if (!localStream.current) return;
    const senders = pc.getSenders();
    localStream.current.getTracks().forEach((track) => {
      const already = senders.find((s) => s.track?.kind === track.kind);
      if (!already) pc.addTrack(track, localStream.current);
    });
  }, []);

  // ── WebRTC helpers ────────────────────────────────────────────────────────
  const createPeerConn = useCallback(
    (userId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) sendGroupCallIce(userId, candidate);
      };

      pc.ontrack = ({ streams }) => {
        const stream = streams?.[0];
        if (!stream) return;
        setPeers((prev) => ({ ...prev, [userId]: { ...prev[userId], stream } }));
        // Attach to <video> element if it already exists
        if (remoteVideoEls.current[userId]) {
          remoteVideoEls.current[userId].srcObject = stream;
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed"
        ) {
          removePeer(userId);
        }
      };

      if (localStream.current) {
        localStream.current.getTracks().forEach((t) =>
          pc.addTrack(t, localStream.current),
        );
      }

      peerConns.current[userId] = pc;
      return pc;
    },
    [addTracksToPeer],
  );

  const removePeer = useCallback((userId) => {
    peerConns.current[userId]?.close();
    delete peerConns.current[userId];
    delete iceBuffers.current[userId];
    delete remoteVideoEls.current[userId];
    setPeers((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const closeAllPeerConns = useCallback(() => {
    Object.values(peerConns.current).forEach((pc) => pc.close());
    peerConns.current = {};
    iceBuffers.current = {};
    setPeers({});
  }, []);

  const flushIceBuffer = useCallback(async (userId) => {
    const buf = iceBuffers.current[userId] || [];
    const pc = peerConns.current[userId];
    if (!pc || !pc.remoteDescription) return;
    for (const c of buf) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (_) {}
    }
    iceBuffers.current[userId] = [];
  }, []);

  const stopAllStreams = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    screenStream.current = null;
  }, []);

  // ── Socket event handlers (attached only while in call) ───────────────────
  useEffect(() => {
    if (!inCall) return;

    const handlePeerJoined = async ({ user_id, user_name, user_initials }) => {
      if (user_id === currentUserId.current) return;

      // Register peer in UI immediately
      setPeers((prev) => ({
        ...prev,
        [user_id]: { name: user_name, initials: user_initials || user_name?.slice(0, 2).toUpperCase() || "??", stream: null },
      }));

      // Existing member creates offer for the new joiner
      const pc = createPeerConn(user_id);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendGroupCallOffer(groupIdRef.current, user_id, offer);
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    };

    const handlePeerLeft = ({ user_id }) => {
      removePeer(user_id);
    };

    const handleOffer = async ({ from, offer }) => {
      if (from === currentUserId.current) return;
      const pc = createPeerConn(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceBuffer(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendGroupCallAnswer(from, answer);
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = peerConns.current[from];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIceBuffer(from);
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    };

    const handleIce = async ({ from, candidate }) => {
      if (!candidate) return;
      const pc = peerConns.current[from];
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (_) {}
      } else {
        if (!iceBuffers.current[from]) iceBuffers.current[from] = [];
        iceBuffers.current[from].push(candidate);
      }
    };

    onGroupCallPeerJoined(handlePeerJoined);
    onGroupCallPeerLeft(handlePeerLeft);
    onGroupCallOffer(handleOffer);
    onGroupCallAnswer(handleAnswer);
    onGroupCallIce(handleIce);

    return () => {
      offGroupCallPeerJoined(handlePeerJoined);
      offGroupCallPeerLeft(handlePeerLeft);
      offGroupCallOffer(handleOffer);
      offGroupCallAnswer(handleAnswer);
      offGroupCallIce(handleIce);
    };
  }, [inCall, createPeerConn, removePeer, flushIceBuffer]);

  // ── JOIN ─────────────────────────────────────────────────────────────────
  const joinCall = async () => {
    setJoining(true);
    setPermError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camOn ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      setInCall(true);
      // Announce to others in the group room — they will send us offers
      sendGroupCallJoin(group.id);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermError("Camera/microphone permission denied. Allow access in browser settings.");
      } else if (err.name === "NotFoundError") {
        setPermError("No camera or microphone found on this device.");
      } else if (err.name === "NotReadableError") {
        setPermError("Camera/microphone is already in use by another app.");
      } else {
        setPermError(`Could not access media: ${err.message}`);
      }
    }
    setJoining(false);
  };

  // ── LEAVE ────────────────────────────────────────────────────────────────
  const leaveCall = useCallback(() => {
    sendGroupCallLeave(group.id);
    stopAllStreams();
    closeAllPeerConns();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setInCall(false);
    setScreenOn(false);
    setMicOn(true);
    setCamOn(true);
    setHandRaised(false);
    setShowChat(false);
    setChatMsgs([]);
    setChatVal("");
    onLeave();
  }, [group.id, stopAllStreams, closeAllPeerConns, onLeave]);

  // ── TOGGLE MIC ───────────────────────────────────────────────────────────
  const toggleMic = () => {
    localStream.current?.getAudioTracks().forEach((t) => { t.enabled = !micOn; });
    setMicOn((m) => !m);
  };

  // ── TOGGLE CAMERA ────────────────────────────────────────────────────────
  const toggleCam = () => {
    localStream.current?.getVideoTracks().forEach((t) => { t.enabled = !camOn; });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = camOn ? null : localStream.current;
    }
    setCamOn((c) => !c);
  };

  // ── SCREEN SHARE ─────────────────────────────────────────────────────────
  const toggleScreen = async () => {
    if (screenOn) {
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      setScreenOn(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = camOn ? localStream.current : null;
      }
      // Replace screen track back with camera track in all peer connections
      Object.values(peerConns.current).forEach((pc) => {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
        const camTrack = localStream.current?.getVideoTracks()[0];
        if (videoSender && camTrack) videoSender.replaceTrack(camTrack);
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setScreenOn(true);
        // Replace camera track with screen track in all peer connections
        const screenTrack = stream.getVideoTracks()[0];
        Object.values(peerConns.current).forEach((pc) => {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (videoSender) videoSender.replaceTrack(screenTrack);
        });
        screenTrack.onended = () => toggleScreen();
      } catch (err) {
        if (err.name !== "NotAllowedError") {
          setPermError("Could not start screen share: " + err.message);
        }
      }
    }
  };

  const toggleHand = () => setHandRaised((h) => !h);

  const sendChatMsg = () => {
    const text = chatVal.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMsgs((m) => [...m, { id: Date.now(), sender: "You", initials: "ME", text, time: now, sent: true }]);
    setChatVal("");
  };

  // ── Callback ref for remote video elements ────────────────────────────────
  const setRemoteVideoRef = (userId) => (el) => {
    if (!el) return;
    remoteVideoEls.current[userId] = el;
    const peerStream = peers[userId]?.stream;
    if (peerStream) el.srcObject = peerStream;
  };

  const allMembers = (group.membersList || []).length > 0
    ? group.membersList
    : [{ name: "You", initials: "ME", status: "online" }];

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (!inCall) {
    return (
      <div style={{ flex: 1, background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: group.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
          {group.icon}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 5 }}>{group.name}</div>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 14 }}>
            Video Room · {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          {allMembers.slice(0, 5).map((m, i) => (
            <div key={i} className="ava" style={{ width: 34, height: 34, background: group.color, fontSize: 11, border: "2px solid #0f172a", marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i }}>
              {m.initials}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {[
            { icon: micOn ? "🎙️" : "🔇", active: micOn, toggle: () => setMicOn((m) => !m), label: micOn ? "Mic on" : "Mic off" },
            { icon: camOn ? "📹" : "📷", active: camOn, toggle: () => setCamOn((c) => !c), label: camOn ? "Cam on" : "Cam off" },
          ].map((btn, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <button onClick={btn.toggle} style={{ background: btn.active ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)", border: "none", color: "#fff", width: 50, height: 50, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {btn.icon}
              </button>
              <span style={{ color: "rgba(255,255,255,.45)", fontSize: 11 }}>{btn.label}</span>
            </div>
          ))}
        </div>

        {permError && (
          <div style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.4)", borderRadius: 12, padding: "12px 18px", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⚠️</div>
            <div style={{ color: "#fca5a5", fontSize: 13, lineHeight: 1.5 }}>{permError}</div>
          </div>
        )}

        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 10, padding: "10px 18px", maxWidth: 320, textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12, lineHeight: 1.6 }}>
            {camOn || micOn
              ? `Browser will ask for your ${camOn && micOn ? "camera and microphone" : camOn ? "camera" : "microphone"}.`
              : "You'll join with camera and mic off."}
          </div>
        </div>

        <button onClick={joinCall} disabled={joining} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", border: "none", borderRadius: 14, padding: "13px 44px", fontSize: 16, fontWeight: 700, cursor: joining ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(34,197,94,.4)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
          {joining ? "⏳ Connecting…" : "📞 Join Call"}
        </button>
      </div>
    );
  }

  // ── IN-CALL ───────────────────────────────────────────────────────────────
  const remotePeerList = Object.entries(peers);
  const controls = [
    { icon: micOn ? "🎙️" : "🔇", label: micOn ? "Mute" : "Unmute", active: micOn, toggle: toggleMic, danger: false },
    { icon: camOn ? "📹" : "📷", label: camOn ? "Stop cam" : "Start cam", active: camOn, toggle: toggleCam, danger: false },
    { icon: screenOn ? "🖥️" : "💻", label: screenOn ? "Stop share" : "Share", active: screenOn, toggle: toggleScreen, danger: false },
    { icon: handRaised ? "✋" : "🤚", label: handRaised ? "Lower" : "Hand", active: handRaised, toggle: toggleHand, danger: false },
    { icon: "💬", label: "Chat", active: showChat, toggle: () => setShowChat((s) => !s), danger: false },
    { icon: "📞", label: "Leave", active: false, toggle: leaveCall, danger: true },
  ];

  return (
    <div style={{ flex: 1, background: "#0f172a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Live bar */}
      <div style={{ padding: "7px 16px", background: "rgba(34,197,94,.15)", borderBottom: "1px solid rgba(34,197,94,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "vCallPulse 1.5s infinite" }} />
          <style>{`@keyframes vCallPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>
            Live · {1 + remotePeerList.length} participant{1 + remotePeerList.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ color: "rgba(255,255,255,.6)", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>⏱ {fmt(duration)}</span>
        {handRaised && (
          <span style={{ background: "rgba(245,158,11,.2)", color: "#fbbf24", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
            ✋ You raised your hand
          </span>
        )}
      </div>

      {screenOn && (
        <div style={{ padding: "7px 16px", background: "rgba(99,102,241,.2)", borderBottom: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>🖥️ You are sharing your screen</span>
          <button onClick={toggleScreen} style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(165,180,252,.4)", color: "#a5b4fc", borderRadius: 6, padding: "2px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Stop sharing</button>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Participant grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: remotePeerList.length === 0 ? "1fr" : "repeat(2,1fr)", gap: 8, padding: 10, overflowY: "auto", alignContent: "start" }}>

          {/* Self tile */}
          <div style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden", border: "2px solid #6366f1", position: "relative" }}>
            {(camOn || screenOn) ? (
              <video ref={localVideoRef} autoPlay playsInline muted
                style={{ width: "100%", height: 140, objectFit: screenOn ? "contain" : "cover", display: "block", background: "#0f172a", transform: screenOn ? "none" : "scaleX(-1)" }}
              />
            ) : (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "#1e293b" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: group.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>ME</div>
                <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.4)" }}>📷 Camera off</div>
              </div>
            )}
            <div style={{ padding: "5px 10px", background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>You</span>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ fontSize: 11, opacity: micOn ? 1 : 0.35 }}>{micOn ? "🎙️" : "🔇"}</span>
                <span style={{ fontSize: 11, opacity: camOn ? 1 : 0.35 }}>{camOn ? "📹" : "📷"}</span>
              </div>
            </div>
          </div>

          {/* Remote peer tiles */}
          {remotePeerList.map(([userId, peer]) => (
            <div key={userId} style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden", border: "2px solid rgba(255,255,255,.08)" }}>
              {peer.stream ? (
                <video
                  ref={setRemoteVideoRef(userId)}
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block", background: "#0f172a" }}
                />
              ) : (
                <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "#1e293b" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: group.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                    {peer.initials}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.35)" }}>Connecting…</div>
                </div>
              )}
              <div style={{ padding: "5px 10px", background: "rgba(0,0,0,.7)" }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{peer.name}</span>
              </div>
            </div>
          ))}

          {/* Empty state when alone */}
          {remotePeerList.length === 0 && (
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, border: "2px dashed rgba(255,255,255,.12)", height: 140, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 28 }}>👥</div>
              <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>Waiting for others to join…</div>
            </div>
          )}
        </div>

        {/* In-call chat panel */}
        {showChat && (
          <div style={{ width: 230, borderLeft: "1px solid rgba(255,255,255,.1)", background: "#1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.1)", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,.8)" }}>In-call Chat</div>
            <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {chatMsgs.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 12, marginTop: 20 }}>No messages yet</div>
              ) : chatMsgs.map((msg) => (
                <div key={msg.id} style={{ display: "flex", flexDirection: msg.sent ? "row-reverse" : "row", gap: 5, alignItems: "flex-end" }}>
                  <div className="ava" style={{ width: 20, height: 20, background: group.color, fontSize: 8, flexShrink: 0 }}>{msg.initials}</div>
                  <div style={{ maxWidth: "80%", background: msg.sent ? "#6366f1" : "rgba(255,255,255,.1)", color: "#fff", borderRadius: msg.sent ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "6px 9px", fontSize: 12 }}>
                    {msg.text}
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", marginTop: 2, textAlign: msg.sent ? "right" : "left" }}>{msg.time}</div>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", gap: 6 }}>
              <input value={chatVal} onChange={(e) => setChatVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMsg()} placeholder="Message…"
                style={{ flex: 1, background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: "6px 9px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
              <button onClick={sendChatMsg} disabled={!chatVal.trim()} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>✈️</button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "11px 16px", background: "rgba(0,0,0,.85)", display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        {controls.map((btn, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <button onClick={btn.toggle} title={btn.label}
              style={{ background: btn.danger ? "#DC2626" : btn.active ? "rgba(99,102,241,.8)" : "rgba(255,255,255,.14)", border: "none", color: "#fff", width: 46, height: 46, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", boxShadow: btn.active && !btn.danger ? "0 0 0 2px rgba(99,102,241,.6)" : "none" }}>
              {btn.icon}
            </button>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,.45)", userSelect: "none" }}>{btn.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoTab;
