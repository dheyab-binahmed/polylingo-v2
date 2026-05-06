import { useState } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Connect    : POST   /api/community/partners/:id/connect    { userId }
// Disconnect : DELETE /api/community/partners/:id/connect
// Message    : opens DM modal (handled in parent)
// Call       : POST   /api/community/partners/:id/call       → { roomToken }
//              then open WebRTC session using roomToken
// ─────────────────────────────────────────────────────────────────────────────

const LANG_COLORS = [
  { bg: "#eef2ff", color: "#4f46e5" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#ede9fe", color: "#5b21b6" },
];

const PartnerCard = ({ partner, onConnect, onMessage, onDisconnect, onCall }) => {
  const [showBio, setShowBio] = useState(false);

  return (
    <div
      style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "20px 22px", transition: "all .25s", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(99,102,241,.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Avatar + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div className="ava" style={{ width: 52, height: 52, background: partner.color, fontSize: 16 }}>{partner.initials}</div>
          {partner.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 13, height: 13, background: "#10b981", border: "2.5px solid var(--bg-card)", borderRadius: "50%" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{partner.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <span>🌍 {partner.country}</span>
            <span style={{ color: partner.online ? "#10b981" : "#d1d5db" }}>●</span>
            <span style={{ color: partner.online ? "#10b981" : "var(--text-muted)" }}>{partner.online ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {partner.bio && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowBio(s => !s)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {showBio ? "▲ Hide bio" : "▼ View bio"}
          </button>
          {showBio && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, background: "var(--bg-subtle)", borderRadius: 8, padding: "8px 10px" }}>{partner.bio}</div>
          )}
        </div>
      )}

      {/* Languages */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
        {partner.languages.map((lang, i) => (
          <span key={i} style={{ ...LANG_COLORS[i % 3], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{lang}</span>
        ))}
      </div>

      {/* Actions */}
      {partner.connected ? (
        <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
          {/* Message */}
          <button className="btn-coral" style={{ flex: 1, justifyContent: "center" }} onClick={() => onMessage?.(partner.id)} title="Send a message">
            💬 Message
          </button>
          {/* Video call */}
          <button
            className="btn-ghost"
            style={{ padding: "8px 11px", borderColor: "#10b981", color: "#10b981" }}
            onClick={() => onCall?.(partner.id)}
            title="Start video call"
          >
            📹
          </button>
          {/* Disconnect */}
          <button className="btn-ghost" style={{ padding: "8px 10px" }} onClick={() => onDisconnect?.(partner.id)} title="Disconnect">✕</button>
        </div>
      ) : (
        // BACKEND INTEGRATION: POST /api/community/partners/:id/connect
        <button className="btn-coral" style={{ width: "100%", justifyContent: "center", marginTop: "auto" }} onClick={() => onConnect(partner.id)}>
          💬 Connect
        </button>
      )}
    </div>
  );
};

export default PartnerCard;
