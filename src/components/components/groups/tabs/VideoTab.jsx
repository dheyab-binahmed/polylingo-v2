import { useState, useEffect, useRef } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Join room    : POST /api/community/groups/:id/call/join   → { roomToken, participants }
// Leave room   : POST /api/community/groups/:id/call/leave
// Real-time    : Use WebRTC + signalling server (Agora / Twilio / Daily.co)
//              : socket.on("call:joined",  p  => add remote stream)
//              : socket.on("call:left",    id => remove participant)
// The local stream (localStream) should be sent to peers via WebRTC peer connection
// ─────────────────────────────────────────────────────────────────────────────

const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

const VideoTab = ({ group, onLeave }) => {
  const [inCall,      setInCall]      = useState(false);
  const [joining,     setJoining]     = useState(false);
  const [micOn,       setMicOn]       = useState(true);
  const [camOn,       setCamOn]       = useState(true);
  const [screenOn,    setScreenOn]    = useState(false);
  const [handRaised,  setHandRaised]  = useState(false);
  const [raisedHands, setRaisedHands] = useState([]);
  const [duration,    setDuration]    = useState(0);
  const [showChat,    setShowChat]    = useState(false);
  const [chatMsgs,    setChatMsgs]    = useState([]);
  const [chatVal,     setChatVal]     = useState("");
  const [permError,   setPermError]   = useState(""); // camera/mic error message

  // Refs for real media
  const localVideoRef  = useRef(null); // <video> element for self
  const localStream    = useRef(null); // MediaStream from getUserMedia
  const screenStream   = useRef(null); // MediaStream from getDisplayMedia
  const timerRef       = useRef(null);
  const chatBottomRef  = useRef(null);

  const allMembers = (group.membersList || []).length > 0
    ? group.membersList
    : [{ name: "You", initials: "ME", status: "online" }];

  // Call timer
  useEffect(() => {
    if (inCall) {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [inCall]);

  // Scroll in-call chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  }, []);

  // Attach stream to video element whenever localStream or camOn changes
  useEffect(() => {
    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = camOn ? localStream.current : null;
    }
  }, [camOn, inCall]);

  const stopAllStreams = () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    screenStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    screenStream.current = null;
  };

  // ── JOIN CALL — requests real camera + mic permission ─────────────────
  const joinCall = async () => {
    setJoining(true);
    setPermError("");

    try {
      // This line is what triggers the browser permission popup
      const constraints = {
        video: camOn ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        audio: micOn ? { echoCancellation: true, noiseSuppression: true } : false,
      };

      // If both are off, still ask for audio at minimum
      if (!camOn && !micOn) constraints.audio = true;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;

      // Attach to video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // BACKEND INTEGRATION: POST /api/community/groups/:id/call/join
      // Then use stream with WebRTC peer connection to send to other participants
      setInCall(true);

    } catch (err) {
      // Handle permission denied or no device
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermError("Camera or microphone permission was denied. Please allow access in your browser settings and try again.");
      } else if (err.name === "NotFoundError") {
        setPermError("No camera or microphone found on this device. Please connect a device and try again.");
      } else if (err.name === "NotReadableError") {
        setPermError("Your camera or microphone is already in use by another application. Please close it and try again.");
      } else {
        setPermError(`Could not access camera/microphone: ${err.message}`);
      }
    }

    setJoining(false);
  };

  // ── LEAVE ─────────────────────────────────────────────────────────────
  const leaveCall = () => {
    stopAllStreams();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setInCall(false); setScreenOn(false); setMicOn(true); setCamOn(true);
    setHandRaised(false); setRaisedHands([]); setShowChat(false);
    setChatMsgs([]); setChatVal("");
    // BACKEND INTEGRATION: POST /api/community/groups/:id/call/leave
    onLeave();
  };

  // ── TOGGLE MIC ────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    }
    setMicOn(m => !m);
    // BACKEND INTEGRATION: socket.emit("call:mic", { groupId, enabled: !micOn })
  };

  // ── TOGGLE CAMERA ─────────────────────────────────────────────────────
  const toggleCam = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(t => { t.enabled = !camOn; });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = !camOn ? localStream.current : null;
      }
    }
    setCamOn(c => !c);
    // BACKEND INTEGRATION: socket.emit("call:cam", { groupId, enabled: !camOn })
  };

  // ── SCREEN SHARE ──────────────────────────────────────────────────────
  const toggleScreen = async () => {
    if (screenOn) {
      // Stop screen share and restore camera to video tile
      screenStream.current?.getTracks().forEach(t => t.stop());
      screenStream.current = null;
      setScreenOn(false);
      // Restore camera stream to video element
      if (localVideoRef.current && localStream.current) {
        localVideoRef.current.srcObject = camOn ? localStream.current : null;
      }
      // BACKEND INTEGRATION: replace screen track back to camera track in peer connection
    } else {
      try {
        // This triggers the browser's screen share picker
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStream.current = stream;
        // Show screen share in the self video tile
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setScreenOn(true);
        // When user clicks "Stop sharing" in browser's own bar
        stream.getVideoTracks()[0].onended = () => {
          screenStream.current = null;
          setScreenOn(false);
          // Restore camera stream
          if (localVideoRef.current && localStream.current) {
            localVideoRef.current.srcObject = camOn ? localStream.current : null;
          }
        };
        // BACKEND INTEGRATION: replace video track in peer connection with screen track
      } catch (err) {
        if (err.name !== "NotAllowedError") {
          setPermError("Could not start screen share: " + err.message);
        }
      }
    }
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    if (next) setRaisedHands(r => [...r, "You"]);
    else      setRaisedHands(r => r.filter(n => n !== "You"));
    // BACKEND INTEGRATION: socket.emit("call:hand", { groupId, raised: next })
  };

  const sendChatMsg = () => {
    const text = chatVal.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    setChatMsgs(m => [...m, { id:Date.now(), sender:"You", initials:"ME", text, time:now, sent:true }]);
    setChatVal("");
    // BACKEND INTEGRATION: socket.emit("call:chat", { groupId, text })
  };

  // ── LOBBY ─────────────────────────────────────────────────────────────
  if (!inCall) {
    return (
      <div style={{ flex:1, background:"#0f172a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, gap:20 }}>

        <div style={{ width:72, height:72, borderRadius:20, background:group.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{group.icon}</div>

        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#fff", fontWeight:800, fontSize:20, marginBottom:5 }}>{group.name}</div>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:14 }}>Video Room · {allMembers.length} member{allMembers.length!==1?"s":""}</div>
        </div>

        {/* Member stack */}
        <div style={{ display:"flex", justifyContent:"center" }}>
          {allMembers.slice(0,5).map((m,i) => (
            <div key={i} className="ava" style={{ width:34, height:34, background:group.color, fontSize:11, border:"2px solid #0f172a", marginLeft:i===0?0:-10, zIndex:5-i }}>{m.initials}</div>
          ))}
        </div>

        {/* Pre-call device toggles */}
        <div style={{ display:"flex", gap:14 }}>
          {[
            { icon:micOn?"🎙️":"🔇", active:micOn, toggle:()=>setMicOn(m=>!m), label:micOn?"Mic on":"Mic off" },
            { icon:camOn?"📹":"📷", active:camOn, toggle:()=>setCamOn(c=>!c), label:camOn?"Camera on":"Cam off" },
          ].map((btn,i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <button onClick={btn.toggle}
                style={{ background:btn.active?"rgba(99,102,241,.5)":"rgba(255,255,255,.1)", border:"none", color:"#fff", width:50, height:50, borderRadius:"50%", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}>
                {btn.icon}
              </button>
              <span style={{ color:"rgba(255,255,255,.45)", fontSize:11 }}>{btn.label}</span>
            </div>
          ))}
        </div>

        {/* Permission error */}
        {permError && (
          <div style={{ background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.4)", borderRadius:12, padding:"12px 18px", maxWidth:360, textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:6 }}>⚠️</div>
            <div style={{ color:"#fca5a5", fontSize:13, lineHeight:1.5 }}>{permError}</div>
          </div>
        )}

        {/* Info about what will happen */}
        <div style={{ background:"rgba(255,255,255,.06)", borderRadius:10, padding:"10px 18px", maxWidth:320, textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:12, lineHeight:1.6 }}>
            {camOn || micOn
              ? `Your browser will ask for permission to use your ${camOn && micOn ? "camera and microphone" : camOn ? "camera" : "microphone"}.`
              : "You'll join with camera and mic off. You can turn them on after joining."}
          </div>
        </div>

        {/* Join button */}
        <button onClick={joinCall} disabled={joining}
          style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"#fff", border:"none", borderRadius:14, padding:"13px 44px", fontSize:16, fontWeight:700, cursor:joining?"not-allowed":"pointer", transition:"all .2s", boxShadow:"0 6px 20px rgba(34,197,94,.4)", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}>
          {joining ? "⏳ Requesting permission…" : "📞 Join Call"}
        </button>
      </div>
    );
  }

  // ── IN-CALL ───────────────────────────────────────────────────────────
  const otherMembers = allMembers.filter(m => m.name !== "You" && m.initials !== "ME");

  const controls = [
    { icon:micOn?"🎙️":"🔇",      label:micOn?"Mute":"Unmute",          active:micOn,      toggle:toggleMic,                 danger:false },
    { icon:camOn?"📹":"📷",      label:camOn?"Stop cam":"Start cam",    active:camOn,      toggle:toggleCam,                 danger:false },
    { icon:screenOn?"🖥️":"💻",   label:screenOn?"Stop share":"Share",  active:screenOn,   toggle:toggleScreen,              danger:false },
    { icon:handRaised?"✋":"🤚", label:handRaised?"Lower hand":"Hand",  active:handRaised, toggle:toggleHand,                danger:false },
    { icon:"💬",                  label:"Chat",                          active:showChat,   toggle:()=>setShowChat(s=>!s),    danger:false },
    { icon:"📞",                  label:"Leave",                         active:false,      toggle:leaveCall,                 danger:true  },
  ];

  return (
    <div style={{ flex:1, background:"#0f172a", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Live bar */}
      <div style={{ padding:"7px 16px", background:"rgba(34,197,94,.15)", borderBottom:"1px solid rgba(34,197,94,.2)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", animation:"vCallPulse 1.5s infinite" }} />
          <style>{`@keyframes vCallPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          <span style={{ color:"#4ade80", fontSize:13, fontWeight:600 }}>Live · {allMembers.length} participants</span>
        </div>
        <span style={{ color:"rgba(255,255,255,.6)", fontSize:13, fontFamily:"monospace", fontWeight:600 }}>⏱ {fmt(duration)}</span>
        {raisedHands.length > 0 && (
          <span style={{ background:"rgba(245,158,11,.2)", color:"#fbbf24", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600 }}>
            ✋ {raisedHands.join(", ")}
          </span>
        )}
      </div>

      {/* Screen share banner */}
      {screenOn && (
        <div style={{ padding:"7px 16px", background:"rgba(99,102,241,.2)", borderBottom:"1px solid rgba(99,102,241,.3)", display:"flex", alignItems:"center", flexShrink:0 }}>
          <span style={{ color:"#a5b4fc", fontSize:13, fontWeight:600 }}>🖥️ You are sharing your screen</span>
          <button onClick={toggleScreen} style={{ marginLeft:"auto", background:"none", border:"1px solid rgba(165,180,252,.4)", color:"#a5b4fc", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Stop sharing</button>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Participant grid */}
        <div style={{ flex:1, display:"grid", gridTemplateColumns:allMembers.length===1?"1fr":"repeat(2,1fr)", gap:8, padding:10, overflowY:"auto", alignContent:"start" }}>

          {/* ── SELF TILE — shows real camera feed or screen share ── */}
          <div style={{ background:"#1e293b", borderRadius:12, overflow:"hidden", border:"2px solid #6366f1", position:"relative" }}>
            {/* Real camera/screen video element */}
            {(camOn || screenOn) && localStream.current ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted  /* muted to avoid echo on self-view */
                style={{ width:"100%", height:140, objectFit: screenOn ? "contain" : "cover", display:"block", background:"#0f172a", transform: screenOn ? "none" : "scaleX(-1)" }}
              />
            ) : (
              <div style={{ height:140, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", background:"#1e293b" }}>
                <div style={{ width:48, height:48, borderRadius:"50%", background:group.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff" }}>ME</div>
                {!camOn && <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,.4)" }}>📷 Camera off</div>}
              </div>
            )}
            <div style={{ padding:"5px 10px", background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:"#fff", fontSize:12, fontWeight:600 }}>You</span>
              <div style={{ display:"flex", gap:4 }}>
                <span style={{ fontSize:11, opacity:micOn?1:.35 }}>{micOn?"🎙️":"🔇"}</span>
                <span style={{ fontSize:11, opacity:camOn?1:.35 }}>{camOn?"📹":"📷"}</span>
              </div>
            </div>
          </div>

          {/* ── OTHER PARTICIPANTS — placeholders until WebRTC backend connected ── */}
          {otherMembers.map((m,i) => (
            <div key={i} style={{ background:"#1e293b", borderRadius:12, overflow:"hidden", border:"2px solid rgba(255,255,255,.08)" }}>
              {/* BACKEND INTEGRATION: Replace this div with <video ref={remoteVideoRefs[i]} autoPlay playsInline srcObject={remoteStreams[i]} /> */}
              <div style={{ height:140, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", background:i%2===0?"#1e293b":"#162032", position:"relative" }}>
                <div style={{ width:48, height:48, borderRadius:"50%", background:group.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff" }}>{m.initials}</div>
                <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,.35)" }}>Waiting for connection…</div>
                {raisedHands.includes(m.name) && <div style={{ position:"absolute", top:6, left:8, fontSize:18 }}>✋</div>}
                {m.status==="online" && <div style={{ position:"absolute", bottom:8, left:8, width:8, height:8, borderRadius:"50%", background:"#22c55e" }} />}
              </div>
              <div style={{ padding:"5px 10px", background:"rgba(0,0,0,.7)" }}>
                <span style={{ color:"#fff", fontSize:12, fontWeight:500 }}>{m.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* In-call chat panel */}
        {showChat && (
          <div style={{ width:230, borderLeft:"1px solid rgba(255,255,255,.1)", background:"#1e293b", display:"flex", flexDirection:"column", flexShrink:0 }}>
            <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.1)", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.8)" }}>In-call Chat</div>
            <div style={{ flex:1, overflowY:"auto", padding:"10px", display:"flex", flexDirection:"column", gap:8 }}>
              {chatMsgs.length===0 ? (
                <div style={{ textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:12, marginTop:20 }}>No messages yet</div>
              ) : chatMsgs.map(msg => (
                <div key={msg.id} style={{ display:"flex", flexDirection:msg.sent?"row-reverse":"row", gap:5, alignItems:"flex-end" }}>
                  <div className="ava" style={{ width:20, height:20, background:group.color, fontSize:8, flexShrink:0 }}>{msg.initials}</div>
                  <div style={{ maxWidth:"80%", background:msg.sent?"#6366f1":"rgba(255,255,255,.1)", color:"#fff", borderRadius:msg.sent?"12px 12px 2px 12px":"12px 12px 12px 2px", padding:"6px 9px", fontSize:12 }}>
                    {msg.text}
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", marginTop:2, textAlign:msg.sent?"right":"left" }}>{msg.time}</div>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef}/>
            </div>
            <div style={{ padding:"8px 10px", borderTop:"1px solid rgba(255,255,255,.1)", display:"flex", gap:6 }}>
              <input value={chatVal} onChange={e=>setChatVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChatMsg()} placeholder="Message…"
                style={{ flex:1, background:"rgba(255,255,255,.1)", border:"none", borderRadius:8, padding:"6px 9px", color:"#fff", fontSize:12, fontFamily:"inherit", outline:"none" }}/>
              <button onClick={sendChatMsg} disabled={!chatVal.trim()} style={{ background:"#6366f1", border:"none", color:"#fff", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:13 }}>✈️</button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding:"11px 16px", background:"rgba(0,0,0,.85)", display:"flex", justifyContent:"center", alignItems:"center", gap:10, flexShrink:0, flexWrap:"wrap" }}>
        {controls.map((btn,i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <button onClick={btn.toggle} title={btn.label}
              style={{ background:btn.danger?"#DC2626":btn.active?"rgba(99,102,241,.8)":"rgba(255,255,255,.14)", border:"none", color:"#fff", width:46, height:46, borderRadius:"50%", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", boxShadow:btn.active&&!btn.danger?"0 0 0 2px rgba(99,102,241,.6)":"none" }}>
              {btn.icon}
            </button>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.45)", userSelect:"none" }}>{btn.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoTab;
