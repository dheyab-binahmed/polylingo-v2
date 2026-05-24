function MessageToast({ messages, onClose }) {
  if (!messages.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 8888,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {messages.map((message, index) => (
        <div
          key={index}
          style={{
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            animation: "slideUp 0.3s ease",
            minWidth: 260,
            maxWidth: 320,
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {message.senderName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#f9fafb", fontWeight: 600, fontSize: 13 }}>
              {message.senderName}
            </div>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {message.text}
            </div>
          </div>
          <button
            onClick={() => onClose(index)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              flexShrink: 0,
            }}
            type="button"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default MessageToast;
