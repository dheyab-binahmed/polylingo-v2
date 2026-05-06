const LEVEL_LABELS = { beginner:"👶 Beginner", intermediate:"🎓 Intermediate", advanced:"🏆 Advanced", all:"🌈 All Levels" };

const GroupRow = ({ group, onOpen, onJoin, onLeave }) => (
  <div
    onClick={() => onOpen(group.id)}
    style={{ background:"var(--bg-card)", border:"1.5px solid var(--border)", borderRadius:16, padding:"18px 22px", display:"flex", alignItems:"center", gap:18, transition:"all .25s", cursor:"pointer" }}
    onMouseEnter={e=>{ e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.transform="translateX(4px)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(99,102,241,.1)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
  >
    <div style={{ width:52, height:52, borderRadius:14, background:group.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
      {group.icon}
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <div style={{ fontWeight:700, fontSize:15, color:"var(--text-base)" }}>{group.name}</div>
        {group.joined && <span style={{ fontSize:11, fontWeight:700, background:"#d1fae5", color:"#065f46", padding:"1px 8px", borderRadius:20 }}>✓ Joined</span>}
        {group.isPrivate && <span style={{ fontSize:11, background:"var(--bg-subtle)", color:"var(--text-muted)", padding:"1px 8px", borderRadius:20 }}>🔒 Private</span>}
      </div>
      <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:9, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" }}>
        {group.description}
      </div>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ background:"#dbeafe", color:"#1e40af", padding:"2px 9px", borderRadius:20, fontSize:12, fontWeight:600 }}>{group.language}</span>
        <span style={{ background:"#d1fae5", color:"#065f46", padding:"2px 9px", borderRadius:20, fontSize:12, fontWeight:600 }}>{LEVEL_LABELS[group.level]||group.level}</span>
        <span style={{ fontSize:12, color:"var(--text-muted)" }}>👥 {group.members} members</span>
      </div>
    </div>
    <div style={{ display:"flex", gap:8, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
      <button className="btn-coral" onClick={()=>onOpen(group.id)}>Open →</button>
      {/* BACKEND INTEGRATION: POST /api/community/groups/:id/join  or DELETE to leave */}
      {group.joined
        ? <button className="btn-ghost" style={{ fontSize:13 }} onClick={()=>onLeave?.(group.id)}>Leave</button>
        : <button className="btn-ghost" style={{ fontSize:13, borderColor:"#6366f1", color:"#6366f1" }} onClick={()=>onJoin?.(group.id)}>+ Join</button>
      }
    </div>
  </div>
);

export default GroupRow;
