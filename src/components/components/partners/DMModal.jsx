import { useCallback, useContext, useEffect, useRef, useState } from "react";

import AuthContext from "../../../context/AuthContext";
import { getDmMessages } from "../../../services/api";
import {
  endCall,
  onCallAnswered,
  onCallEnded,
  onCallIce,
  onCallIncoming,
  onDmMessage,
  sendCallAnswer,
  sendCallOffer,
  sendDM,
  sendIceCandidate,
} from "../../../services/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("polylingo_auth_user") || "null");
  } catch (_) {
    return null;
  }
}

function sameId(left, right) {
  return String(left) === String(right);
}

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function getMessageTime(message) {
  return message.ts || message.created_at || message.createdAt || null;
}

export default function DMModal({
  partner,
  currentUser: currentUserProp,
  onClose,
}) {
  const auth = useContext(AuthContext);
  const currentUser = currentUserProp || auth?.user || getStoredUser();

  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [mediaError, setMediaError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const callActiveRef = useRef(false);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    let mounted = true;

    getDmMessages(partner.id).then((data) => {
      if (mounted) setMsgs(data.messages || []);
    });

    setTimeout(() => inputRef.current?.focus(), 80);

    return () => {
      mounted = false;
    };
  }, [partner.id]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const unsubscribe = onDmMessage((msg) => {
      const relevant =
        (sameId(msg.from, partner.id) && sameId(msg.to, currentUser.id)) ||
        (sameId(msg.from, currentUser.id) && sameId(msg.to, partner.id));

      if (!relevant) return;

      setMsgs((prev) => {
        const exists = prev.find(
          (m) =>
            (msg.id && m.id === msg.id) ||
            (msg.tempId && m.tempId === msg.tempId),
        );

        if (exists) {
          return prev.map((m) =>
            (msg.tempId && m.tempId === msg.tempId) ||
            (msg.id && m.id === msg.id)
              ? { ...m, ...msg }
              : m,
          );
        }

        return [...prev, msg];
      });
    });

    return unsubscribe;
  }, [partner.id, currentUser?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (callType === "video" && localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }

    if (callType === "video" && remoteVideoRef.current && remoteStream.current) {
      remoteVideoRef.current.srcObject = remoteStream.current;
    }
  }, [callActive, callType]);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setCallSeconds(0);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setCallSeconds(0);
    timerRef.current = setInterval(() => {
      setCallSeconds((seconds) => seconds + 1);
    }, 1000);
  }, [stopTimer]);

  const cleanupCall = useCallback(
    ({ notify = false } = {}) => {
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
        localStream.current = null;
      }

      remoteStream.current = null;

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      if (notify && callActiveRef.current) endCall(partner.id);

      setCallActive(false);
      setCallType(null);
      setMicEnabled(true);
      setCamEnabled(true);
      stopTimer();
    },
    [partner.id, stopTimer],
  );

  const buildPC = useCallback((stream, partnerId) => {
    pc.current = new RTCPeerConnection({
      ...ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    pc.current.onconnectionstatechange = () => {
      console.log("Connection state:", pc.current.connectionState);
    };
    pc.current.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.current.iceConnectionState);
    };

    const conn = pc.current;

    stream.getTracks().forEach((track) => {
      conn.addTrack(track, stream);
    });

    conn.onicecandidate = (event) => {
      if (event.candidate) sendIceCandidate(partnerId, event.candidate);
    };

    conn.ontrack = (event) => {
      remoteStream.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return conn;
  }, []);

  const hangUp = useCallback(() => {
    cleanupCall({ notify: true });
  }, [cleanupCall]);

  const startCall = async (type) => {
    setMediaError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      buildPC(stream, partner.id);
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      sendCallOffer(partner.id, offer, type);
      setCallActive(true);
      setCallType(type);
      setMicEnabled(true);
      setCamEnabled(type === "video");
      startTimer();
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setMediaError(
          "Camera/microphone permission denied. Please allow access in your browser settings.",
        );
      } else if (err.name === "NotFoundError") {
        setMediaError("No camera or microphone found on this device.");
      } else {
        setMediaError(`Could not start call: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    const unsubIncoming = onCallIncoming(async ({ from, offer, callType: ct }) => {
      if (!sameId(from, partner.id)) return;

      const accept = window.confirm(
        `Incoming ${ct} call from ${partner.name}. Accept?`,
      );

      if (!accept) {
        endCall(partner.id);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: ct === "video",
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        buildPC(stream, partner.id);
        await pc.current.setRemoteDescription(offer);
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);

        sendCallAnswer(partner.id, answer);
        setMediaError(null);
        setCallActive(true);
        setCallType(ct);
        setMicEnabled(true);
        setCamEnabled(ct === "video");
        startTimer();
      } catch (err) {
        setMediaError(`Could not accept call: ${err.message}`);
        cleanupCall({ notify: true });
      }
    });

    const unsubAnswered = onCallAnswered(async ({ from, answer }) => {
      if (from && !sameId(from, partner.id)) return;

      try {
        await pc.current?.setRemoteDescription(answer);
      } catch (_) {
        // The peer connection may already have been closed locally.
      }
    });

    const unsubIce = onCallIce(async ({ from, candidate }) => {
      if (from && !sameId(from, partner.id)) return;

      try {
        await pc.current?.addIceCandidate(candidate);
      } catch (_) {
        // ICE can arrive after cleanup or before remote description is set.
      }
    });

    const unsubEnded = onCallEnded(({ from } = {}) => {
      if (from && !sameId(from, partner.id)) return;
      cleanupCall({ notify: false });
    });

    return () => {
      unsubIncoming();
      unsubAnswered();
      unsubIce();
      unsubEnded();
    };
  }, [buildPC, cleanupCall, partner.id, partner.name, startTimer]);

  useEffect(() => {
    return () => {
      cleanupCall({ notify: true });
    };
  }, [cleanupCall]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUser?.id) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      tempId,
      from: currentUser.id,
      to: partner.id,
      text: trimmed,
      ts: new Date().toISOString(),
    };

    setMsgs((prev) => [...prev, optimistic]);
    sendDM(partner.id, trimmed, tempId);
    setText("");
  };

  const toggleMute = () => {
    if (!localStream.current) return;

    const nextEnabled = !micEnabled;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMicEnabled(nextEnabled);
  };

  const toggleCam = () => {
    if (!localStream.current) return;

    const nextEnabled = !camEnabled;
    localStream.current.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setCamEnabled(nextEnabled);
  };

  return (
    <div
      style={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.identity}>
            <div style={{ ...styles.avatar, background: partner.color || "#6366f1" }}>
              {partner.initials || partner.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={styles.partnerName}>{partner.name}</div>
              <div style={styles.statusText}>
                {callActive
                  ? `${callType === "video" ? "Video" : "Voice"} call · ${formatTime(callSeconds)}`
                  : partner.online
                    ? "Online"
                    : "Offline"}
              </div>
            </div>
          </div>

          <div style={styles.callButtons}>
            <button
              onClick={() => startCall("audio")}
              title="Voice call"
              style={styles.iconBtn}
              type="button"
            >
              📞
            </button>
            <button
              onClick={() => startCall("video")}
              title="Video call"
              style={styles.iconBtn}
              type="button"
            >
              📹
            </button>
            <button onClick={onClose} style={styles.iconBtn} type="button">
              ✕
            </button>
          </div>
        </div>

        {mediaError && <div style={styles.errorBar}>{mediaError}</div>}

        {callActive && (
          <div style={styles.callBar}>
            <span>
              {callType === "video" ? "📹 Video call" : "📞 Voice call"} ·{" "}
              {formatTime(callSeconds)}
            </span>
            <div style={styles.callControls}>
              <button onClick={toggleMute} style={styles.iconBtn} type="button">
                {micEnabled ? "🎙️" : "🔇"}
              </button>
              {callType === "video" && (
                <button onClick={toggleCam} style={styles.iconBtn} type="button">
                  {camEnabled ? "📷" : "🚫"}
                </button>
              )}
              <button
                onClick={hangUp}
                style={{ ...styles.iconBtn, color: "#ef4444" }}
                type="button"
              >
                📵
              </button>
            </div>
          </div>
        )}

        {callActive && callType === "video" && (
          <div style={styles.videoRow}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={styles.videoSelf}
            />
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={styles.videoRemote}
            />
          </div>
        )}

        <div style={styles.msgList}>
          {msgs.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👋</div>
              <div style={styles.emptyTitle}>Say hello to {partner.name}!</div>
              <div style={styles.emptyCopy}>You're connected. Start a conversation.</div>
            </div>
          )}

          {msgs.map((msg, index) => {
            const mine = sameId(msg.from, currentUser?.id);
            const time = getMessageTime(msg);

            return (
              <div
                key={msg.id ?? msg.tempId ?? index}
                style={{
                  ...styles.messageRow,
                  justifyContent: mine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    background: mine ? "#6366f1" : "#374151",
                    borderBottomRightRadius: mine ? 4 : 14,
                    borderBottomLeftRadius: mine ? 14 : 4,
                  }}
                >
                  <span>{msg.text}</span>
                  <span style={styles.ts}>
                    {time
                      ? new Date(time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            style={styles.input}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !currentUser?.id}
            style={{
              ...styles.sendBtn,
              opacity: text.trim() && currentUser?.id ? 1 : 0.55,
            }}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 24,
    zIndex: 1000,
  },
  modal: {
    background: "#1f2937",
    borderRadius: 12,
    width: 420,
    maxWidth: "calc(100vw - 32px)",
    height: 620,
    maxHeight: "82vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #374151",
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  partnerName: {
    fontWeight: 700,
    color: "#fff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 180,
  },
  statusText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  callButtons: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    width: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBar: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: "8px 16px",
    fontSize: 13,
  },
  callBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "#065f46",
    color: "#a7f3d0",
    padding: "8px 16px",
    fontSize: 14,
  },
  callControls: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  videoRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: 8,
    background: "#111827",
  },
  videoSelf: {
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: 8,
    border: "2px solid #6366f1",
    background: "#000",
    objectFit: "cover",
  },
  videoRemote: {
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: 8,
    border: "2px solid rgba(255,255,255,0.16)",
    background: "#000",
    objectFit: "cover",
  },
  msgList: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  emptyState: {
    margin: "auto",
    textAlign: "center",
    color: "#9ca3af",
    padding: "32px 20px",
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#f9fafb",
    fontWeight: 700,
    marginBottom: 4,
  },
  emptyCopy: {
    fontSize: 13,
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "75%",
    padding: "8px 12px",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    color: "#fff",
    overflowWrap: "anywhere",
  },
  ts: {
    fontSize: 10,
    opacity: 0.65,
    alignSelf: "flex-end",
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #374151",
  },
  input: {
    flex: 1,
    minWidth: 0,
    background: "#374151",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#fff",
    outline: "none",
  },
  sendBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
};
