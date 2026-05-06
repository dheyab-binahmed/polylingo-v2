const COLORS = {
  success: { border: "#059669", icon: "✓", bg: "rgba(5,150,105,.08)" },
  error:   { border: "#DC2626", icon: "✕", bg: "rgba(220,38,38,.08)"  },
  info:    { border: "#6366f1", icon: "ℹ", bg: "rgba(99,102,241,.08)" },
  warning: { border: "#f59e0b", icon: "⚠", bg: "rgba(245,158,11,.08)" },
};

const ToastContainer = ({ toasts }) => (
  <div style={{ position:"fixed", top:76, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
    {toasts.map(t => {
      const c = COLORS[t.type] || COLORS.info;
      return (
        <div key={t.id} style={{
          background: "var(--bg-card)",
          border: `1px solid var(--border)`,
          borderLeft: `4px solid ${c.border}`,
          borderRadius: 12,
          padding: "11px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,.14)",
          maxWidth: 320,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-base)",
          animation: "slideInRight .3s ease",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 10,
          pointerEvents: "all",
        }}>
          <span style={{ fontSize:16, color: c.border, flexShrink:0 }}>{c.icon}</span>
          {t.message}
        </div>
      );
    })}
  </div>
);

export default ToastContainer;
