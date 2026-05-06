// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Replace hardcoded stats with: GET /api/community/stats
// response: { activeLearners, totalPosts, languagePartners, activeGroups }
// ─────────────────────────────────────────────────────────────────────────────

const StateGrid = ({ postCount, groupCount, onScrollTo }) => {
  const stats = [
    { icon:"👥", value:"5,248",    label:"Active Learners",    sub:"+128 today",      color:"#6366f1", bg:"#eef2ff", section: null         },
    { icon:"💬", value:postCount,  label:"Total Posts",        sub:"Click to browse", color:"#10b981", bg:"#d1fae5", section: "feed"        },
    { icon:"🤝", value:"892",      label:"Language Partners",  sub:"Find yours →",    color:"#f59e0b", bg:"#fef3c7", section: "partners"    },
    { icon:"🏆", value:groupCount, label:"Active Groups",      sub:"Join or create →",color:"#8b5cf6", bg:"#ede9fe", section: "groups"      },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:16, marginBottom:28 }}>
      {stats.map((s, i) => (
        <div
          key={i}
          onClick={() => s.section && onScrollTo?.(s.section)}
          style={{
            background:"var(--bg-card)", border:`1.5px solid ${s.color}20`,
            borderRadius:16, padding:"20px 22px",
            transition:"all .25s",
            cursor: s.section ? "pointer" : "default",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 28px ${s.color}18`; e.currentTarget.style.borderColor=`${s.color}40`; }}
          onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=`${s.color}20`; }}
        >
          <div style={{ width:44, height:44, borderRadius:12, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:12 }}>{s.icon}</div>
          <div style={{ fontSize:26, fontWeight:800, color:"var(--text-base)", marginBottom:2 }}>{s.value}</div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text-base)", marginBottom:2 }}>{s.label}</div>
          <div style={{ fontSize:12, color: s.section ? s.color : "var(--text-muted)", fontWeight: s.section ? 600 : 400 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default StateGrid;
