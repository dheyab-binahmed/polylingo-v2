import { useState, useRef, useEffect } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Messages    : GET  /api/community/groups/:id/messages?page=1&limit=50
// Send text   : POST /api/community/groups/:id/messages  { text }
// Send image  : POST /api/community/groups/:id/messages  FormData{ file, type:"image" }
// Real-time   : socket.on("message", msg => setMsgs(p => [...p, msg]))
//             : socket.on("typing",  ()  => show typing indicator)
// ─────────────────────────────────────────────────────────────────────────────

const EMOJIS = ["😊","😂","👍","❤️","🔥","🎉","😮","🤔","👏","💯","🙌","😅"];

const ChatTab = ({ group, notify, onOpenDM, onStartCall, onNewMessage }) => {
  const [msgs,         setMsgs]         = useState(group.messages || []);
  const [val,          setVal]          = useState("");
  const [typing,       setTyping]       = useState(false);
  const [hoverMember,  setHoverMember]  = useState(null);
  const [showEmoji,    setShowEmoji]    = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // image to send
  const [imageFile,    setImageFile]    = useState(null);

  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);
  const fileRef     = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);
  useEffect(() => () => clearTimeout(typingTimer.current), []);

  // ── Send message ──────────────────────────────────────────────────────
  const send = () => {
    const text = val.trim();
    if (!text && !imageFile) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // BACKEND INTEGRATION: POST /api/community/groups/:id/messages
    // If imageFile: send as FormData { file: imageFile, type: "image" }
    // else: send as JSON { text }
    const newMsg = {
      id: Date.now(), sender: "You", initials: "ME",
      text: text || null,
      image: imagePreview || null,
      time: now, sent: true,
    };
    setMsgs(p => [...p, newMsg]);
    setVal(""); setImagePreview(null); setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";

    // Simulate reply (remove when backend connected)
    setTyping(true);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      const replies = [
        "¡Excelente! 🎉", "Great point!", "Let's practice together!",
        "I agree! 🙌", "Could you elaborate more?", "That's really helpful, thanks!",
        "Interesting! What do you think about that?",
      ];
      setMsgs(p => [...p, {
        id: Date.now() + 1, sender: "Group Bot", initials: "GB",
        text: replies[Math.floor(Math.random() * replies.length)],
        image: null, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sent: false,
      }]);
      // Tell GroupInterface a new message arrived (so badge increments when user is on another tab)
      onNewMessage?.();
    }, 1400);
  };

  // ── Image attach ──────────────────────────────────────────────────────
  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { notify("Image too large (max 8 MB)", "error"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // BACKEND INTEGRATION: upload as FormData with message
  };

  // ── Emoji insert ──────────────────────────────────────────────────────
  const insertEmoji = emoji => {
    setVal(v => v + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // ── Open DM with member ───────────────────────────────────────────────
  const openMemberDM = member => {
    onOpenDM?.({ id: member.name, name: member.name, initials: member.initials, color: group.color, online: member.status === "online", bio: "", languages: [] });
    setHoverMember(null);
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* ── Members sidebar ── */}
      <div style={{ width: 196, borderRight: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Sidebar header with call button */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
            Members · {(group.membersList || []).length}
          </span>
          {/* Start call from chat */}
          <button
            onClick={() => onStartCall?.()}
            title="Start video call"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", color: "#fff", borderRadius: 7, padding: "4px 9px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
          >
            📞 Call
          </button>
        </div>

        {/* Member list */}
        <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
          {(group.membersList || []).length === 0 ? (
            <div style={{ padding: "14px 10px", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>No members yet</div>
          ) : (group.membersList || []).map((m, i) => (
            <div
              key={i}
              title={m.name !== "You" ? `Click to DM ${m.name}` : ""}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, cursor: m.name !== "You" ? "pointer" : "default", position: "relative", transition: "background .15s" }}
              onClick={() => m.name !== "You" && openMemberDM(m)}
              onMouseEnter={e => { if (m.name !== "You") { e.currentTarget.style.background = "var(--bg-card)"; setHoverMember(m.name); } }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; setHoverMember(null); }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div className="ava" style={{ width: 28, height: 28, background: group.color, fontSize: 10 }}>{m.initials}</div>
                {m.status === "online" && <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, background: "#10b981", border: "2px solid var(--bg-subtle)", borderRadius: "50%" }} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: m.status === "online" ? "#10b981" : "var(--text-muted)" }}>{m.status}</div>
              </div>
              {hoverMember === m.name && m.name !== "You" && (
                <div style={{ position: "absolute", right: 8, background: "#6366f1", color: "#fff", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>💬</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Messages */}
        <div className="chat-msgs">
          {msgs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "50px 20px" }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>💬</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>No messages yet</div>
              <div style={{ fontSize: 13 }}>Start the conversation!</div>
            </div>
          ) : msgs.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: msg.sent ? "row-reverse" : "row", gap: 9, marginBottom: 14, alignItems: "flex-end" }}>
              <div className="ava" style={{ width: 28, height: 28, background: msg.sent ? "#6366f1" : group.color, fontSize: 10, flexShrink: 0 }}>{msg.initials}</div>
              <div style={{ maxWidth: "68%" }}>
                {!msg.sent && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>{msg.sender}</div>}
                {/* Image message */}
                {msg.image && (
                  <img src={msg.image} alt="shared" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, display: "block", marginBottom: msg.text ? 6 : 0, border: "1px solid var(--border)" }} />
                )}
                {/* Text message */}
                {msg.text && (
                  <div style={{ background: msg.sent ? "#6366f1" : "var(--bg-subtle)", color: msg.sent ? "#fff" : "var(--text-base)", borderRadius: msg.sent ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "9px 13px", fontSize: 14, lineHeight: 1.5, border: msg.sent ? "none" : "1px solid var(--border)" }}>
                    {msg.text}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: msg.sent ? "right" : "left" }}>{msg.time}</div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <div className="ava" style={{ width: 28, height: 28, background: group.color, fontSize: 10, flexShrink: 0 }}>…</div>
              <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", animation: `chatBounce 1.2s infinite ${i * .2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Image preview ── */}
        {imagePreview && (
          <div style={{ padding: "6px 14px 0", flexShrink: 0 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={imagePreview} alt="preview" style={{ maxHeight: 80, borderRadius: 8, display: "block", border: "1.5px solid var(--border)" }} />
              <button
                onClick={() => { setImagePreview(null); setImageFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              >×</button>
            </div>
          </div>
        )}

        {/* ── Emoji picker ── */}
        {showEmoji && (
          <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 4, background: "var(--bg-subtle)", flexShrink: 0 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => insertEmoji(e)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "3px 5px", borderRadius: 6, transition: "transform .15s" }}
                onMouseEnter={ev => ev.currentTarget.style.transform = "scale(1.3)"}
                onMouseLeave={ev => ev.currentTarget.style.transform = "none"}>
                {e}
              </button>
            ))}
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-card)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
            {/* Hidden file input */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

            {/* Attach image */}
            <button
              onClick={() => fileRef.current?.click()}
              title="Send image"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", padding: "6px 4px", flexShrink: 0, transition: "color .2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#6366f1"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >📎</button>

            {/* Emoji toggle */}
            <button
              onClick={() => setShowEmoji(s => !s)}
              title="Emoji"
              style={{ background: showEmoji ? "#eef2ff" : "none", border: "none", cursor: "pointer", fontSize: 18, color: showEmoji ? "#6366f1" : "var(--text-muted)", padding: "6px 4px", borderRadius: 6, flexShrink: 0, transition: "all .2s" }}
            >😊</button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              className="chat-fc"
              rows={1}
              placeholder="Type a message… (Enter to send)"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              style={{ resize: "none", flex: 1 }}
            />

            {/* Send */}
            <button className="btn-coral" onClick={send} disabled={!val.trim() && !imageFile} style={{ padding: "8px 13px", flexShrink: 0 }}>✈️</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chatBounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
      `}</style>
    </div>
  );
};

export default ChatTab;
