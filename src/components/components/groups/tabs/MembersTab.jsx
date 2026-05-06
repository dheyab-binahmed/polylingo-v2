import { useState } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// List    : GET    /api/community/groups/:id/members
// Invite  : POST   /api/community/groups/:id/invite   { usernameOrEmail }
// Remove  : DELETE /api/community/groups/:id/members/:userId  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS = { online:"#10b981", away:"#f59e0b", offline:"#9ca3af" };

const MembersTab = ({ group, notify, onOpenDM }) => {
  const [members,      setMembers]      = useState(group.membersList || []);
  const [inviteInput,  setInviteInput]  = useState("");
  const [inviteMode,   setInviteMode]   = useState(false);
  const [inviting,     setInviting]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [confirmName,  setConfirmName]  = useState(null); // member pending removal confirmation

  const filtered    = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const onlineCount = members.filter(m => m.status === "online").length;

  const handleInvite = () => {
    const val = inviteInput.trim();
    if (!val) return;
    setInviting(true);
    // BACKEND INTEGRATION: POST /api/community/groups/:id/invite  { usernameOrEmail: val }
    setTimeout(() => {
      notify(`Invite sent to "${val}"! 📨`, "success");
      setInviteInput(""); setInviting(false); setInviteMode(false);
    }, 500);
  };

  const confirmRemove = name => setConfirmName(name);

  const doRemove = () => {
    // BACKEND INTEGRATION: DELETE /api/community/groups/:id/members/:userId
    setMembers(m => m.filter(x => x.name !== confirmName));
    notify(`${confirmName} removed from group.`, "info");
    setConfirmName(null);
  };

  const handleMessageMember = m => {
    onOpenDM?.({ id:m.name, name:m.name, initials:m.initials, color:group.color, online:m.status==="online", bio:"", languages:[] });
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Confirm removal dialog */}
      {confirmName && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:20 }}>
          <div style={{ background:"var(--bg-card)", borderRadius:16, padding:24, maxWidth:320, width:"100%", textAlign:"center", boxShadow:"0 16px 40px rgba(0,0,0,.2)" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>⚠️</div>
            <div style={{ fontWeight:700, fontSize:16, color:"var(--text-base)", marginBottom:8 }}>Remove Member?</div>
            <div style={{ fontSize:14, color:"var(--text-muted)", marginBottom:20 }}>
              Remove <strong>{confirmName}</strong> from the group? They will need to rejoin.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button className="btn-ghost" style={{ padding:"8px 20px" }} onClick={()=>setConfirmName(null)}>Cancel</button>
              <button onClick={doRemove} style={{ padding:"8px 20px", background:"#ef4444", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:14 }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:"var(--text-base)" }}>Members ({members.length})</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>
            <span style={{ color:"#10b981", fontWeight:600 }}>● {onlineCount} online</span>
            {members.length - onlineCount > 0 && <span style={{ marginLeft:8 }}>· {members.length - onlineCount} offline</span>}
          </div>
        </div>
        <button className="btn-coral" style={{ padding:"7px 14px", fontSize:13 }} onClick={()=>setInviteMode(s=>!s)}>
          {inviteMode ? "✕ Cancel" : "➕ Invite"}
        </button>
      </div>

      {/* Invite form */}
      {inviteMode && (
        <div style={{ padding:"12px 20px", borderBottom:"1px solid var(--border)", background:"var(--bg-subtle)", flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text-base)", marginBottom:8 }}>Invite by username or email</div>
          <div style={{ display:"flex", gap:8 }}>
            <input className="fc" placeholder="e.g. maria@example.com or @username" value={inviteInput}
              onChange={e=>setInviteInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleInvite()}
              style={{ flex:1, padding:"8px 12px", fontSize:13 }} autoFocus/>
            <button className="btn-coral" onClick={handleInvite} disabled={!inviteInput.trim()||inviting} style={{ padding:"8px 14px", fontSize:13 }}>
              {inviting?"⏳":"Send Invite"}
            </button>
          </div>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:6 }}>They'll receive a notification to join.</div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding:"10px 20px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <input className="fc" placeholder="Search members…" value={search} onChange={e=>setSearch(e.target.value)} style={{ padding:"7px 12px", fontSize:13 }}/>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 20px" }}>
        {/* BACKEND INTEGRATION: GET /api/community/groups/:id/members */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", color:"var(--text-muted)", padding:"30px 20px" }}>
            <div style={{ fontSize:30, marginBottom:8 }}>👥</div>
            <div style={{ fontWeight:600 }}>{search ? "No members match" : "No members yet"}</div>
            <div style={{ fontSize:13, marginTop:4 }}>{search ? "Try a different name" : "Invite people to get started"}</div>
          </div>
        ) : filtered.map((m,i) => {
          const isSelf = m.name==="You" || m.initials==="ME";
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}>
              <div style={{ position:"relative", flexShrink:0 }}>
                <div className="ava" style={{ width:38, height:38, background:group.color, fontSize:13 }}>{m.initials}</div>
                <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, background:STATUS[m.status]||"#9ca3af", border:"2px solid var(--bg-card)", borderRadius:"50%" }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--text-base)" }}>{m.name}{isSelf?" (You)":""}</div>
                <div style={{ fontSize:11, color:STATUS[m.status]||"var(--text-muted)", textTransform:"capitalize" }}>{m.status||"offline"}</div>
              </div>
              {!isSelf ? (
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn-ghost" style={{ padding:"5px 10px", fontSize:12 }} onClick={()=>handleMessageMember(m)} title={`Message ${m.name}`}>
                    💬 Message
                  </button>
                  <button onClick={()=>confirmRemove(m.name)} title="Remove from group"
                    style={{ background:"none", border:"1.5px solid #fca5a5", borderRadius:8, cursor:"pointer", color:"#ef4444", fontSize:12, padding:"5px 9px" }}>
                    ✕
                  </button>
                </div>
              ) : (
                <span style={{ fontSize:11, background:"#eef2ff", color:"#4338ca", padding:"2px 9px", borderRadius:20, fontWeight:600 }}>You</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MembersTab;
