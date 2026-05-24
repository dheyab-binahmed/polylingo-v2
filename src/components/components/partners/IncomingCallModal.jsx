function IncomingCallModal({ caller, callType, onAccept, onDecline }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        background: "#1f2937",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        minWidth: 280,
        border: "1px solid #374151",
        animation: "slideIn 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#8b5cf6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 700,
          color: "white",
          animation: "pulse 1.5s infinite",
        }}
      >
        {caller?.name?.charAt(0)?.toUpperCase() ?? "?"}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 16 }}>
          {caller?.name ?? "Someone"}
        </div>
        <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
          Incoming {callType === "video" ? "📹 Video" : "📞 Audio"} Call
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onDecline}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 52,
            height: 52,
            fontSize: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          type="button"
        >
          ✕
        </button>
        <button
          onClick={onAccept}
          style={{
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 52,
            height: 52,
            fontSize: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          type="button"
        >
          ✓
        </button>
      </div>
    </div>
  );
}

export default IncomingCallModal;
