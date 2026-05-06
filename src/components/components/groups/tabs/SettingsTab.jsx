import { useState } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Get details  : GET   /api/community/groups/:id
// Edit         : PATCH /api/community/groups/:id  { name, description, isPrivate }
// Leave        : DELETE /api/community/groups/:id/join
// Delete group : DELETE /api/community/groups/:id  (owner only)
// ─────────────────────────────────────────────────────────────────────────────

const SettingsTab = ({ group, notify, onUpdate, onLeave, onDelete }) => {
  const [editing,     setEditing]     = useState(false);
  const [name,        setName]        = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [isPrivate,   setIsPrivate]   = useState(group.isPrivate || false);
  const [saving,      setSaving]      = useState(false);
  const [confirmLeave,  setConfirmLeave]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput,   setDeleteInput]   = useState(""); // must type group name to confirm delete

  const handleSave = () => {
    if (!name.trim()) return;
    setSaving(true);
    // BACKEND INTEGRATION: PATCH /api/community/groups/:id  { name, description, isPrivate }
    setTimeout(() => {
      onUpdate?.({ name: name.trim(), description: description.trim(), isPrivate });
      setEditing(false);
      setSaving(false);
    }, 400);
  };

  const handleLeave = () => {
    // BACKEND INTEGRATION: DELETE /api/community/groups/:id/join  { userId }
    onLeave?.();
  };

  const handleDelete = () => {
    if (deleteInput !== group.name) return;
    // BACKEND INTEGRATION: DELETE /api/community/groups/:id  (owner only)
    onDelete?.();
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:24 }}>

      {/* ── Group Info Card ── */}
      <div style={{ background:"var(--bg-subtle)", borderRadius:16, padding:20, marginBottom:20, border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:group.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
            {group.icon}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--text-base)" }}>{group.name}</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2, display:"flex", gap:8 }}>
              <span>👥 {group.members} members</span>
              <span>🌐 {group.language}</span>
              {group.isPrivate && <span>🔒 Private</span>}
            </div>
          </div>
        </div>
        <div style={{ fontSize:14, color:"var(--text-muted)", lineHeight:1.6 }}>{group.description}</div>
      </div>

      {/* ── Edit Details ── */}
      <div style={{ background:"var(--bg-card)", borderRadius:16, padding:20, marginBottom:20, border:"1.5px solid var(--border)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:15, color:"var(--text-base)" }}>✏️ Edit Group Details</div>
          {!editing
            ? <button className="btn-ghost" style={{ padding:"6px 14px", fontSize:13 }} onClick={()=>setEditing(true)}>Edit</button>
            : <div style={{ display:"flex", gap:8 }}>
                <button className="btn-coral" style={{ padding:"6px 14px", fontSize:13 }} onClick={handleSave} disabled={!name.trim()||saving}>{saving?"Saving…":"Save"}</button>
                <button className="btn-ghost" style={{ padding:"6px 12px", fontSize:13 }} onClick={()=>{ setEditing(false); setName(group.name); setDescription(group.description); setIsPrivate(group.isPrivate||false); }}>Cancel</button>
              </div>
          }
        </div>

        {editing ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"var(--text-muted)", marginBottom:6 }}>Group Name</label>
              <input className="fc" value={name} onChange={e=>setName(e.target.value)} maxLength={60} style={{ padding:"8px 12px", fontSize:14 }}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"var(--text-muted)", marginBottom:6 }}>Description</label>
              <textarea className="fc" value={description} onChange={e=>setDescription(e.target.value)} rows={3} maxLength={300} style={{ resize:"vertical", padding:"8px 12px", fontSize:14 }}/>
              <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"right", marginTop:3 }}>{description.length}/300</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"var(--bg-subtle)", borderRadius:12 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:"var(--text-base)" }}>{isPrivate?"🔒 Private Group":"🌍 Public Group"}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{isPrivate?"Only invited members can join":"Anyone can find and join"}</div>
              </div>
              <div onClick={()=>setIsPrivate(p=>!p)}
                style={{ width:44, height:24, borderRadius:12, background:isPrivate?"#6366f1":"var(--border)", cursor:"pointer", position:"relative", transition:"background .2s" }}>
                <div style={{ position:"absolute", top:3, left:isPrivate?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }}/>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)", width:100 }}>Name</span>
              <span style={{ fontSize:13, color:"var(--text-base)" }}>{group.name}</span>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)", width:100 }}>Language</span>
              <span style={{ fontSize:13, color:"var(--text-base)" }}>{group.language}</span>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)", width:100 }}>Level</span>
              <span style={{ fontSize:13, color:"var(--text-base)" }}>{group.level}</span>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)", width:100 }}>Privacy</span>
              <span style={{ fontSize:13, color:"var(--text-base)" }}>{group.isPrivate?"🔒 Private":"🌍 Public"}</span>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)", width:100 }}>Members</span>
              <span style={{ fontSize:13, color:"var(--text-base)" }}>{group.members}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Leave Group ── */}
      {group.joined && (
        <div style={{ background:"var(--bg-card)", borderRadius:16, padding:20, marginBottom:20, border:"1.5px solid var(--border)" }}>
          <div style={{ fontWeight:700, fontSize:15, color:"var(--text-base)", marginBottom:8 }}>🚪 Leave Group</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:14 }}>
            You will no longer have access to this group's chat, resources, and events. You can rejoin later.
          </div>
          {!confirmLeave ? (
            <button onClick={()=>setConfirmLeave(true)} className="btn-ghost" style={{ borderColor:"#f59e0b", color:"#f59e0b", padding:"8px 18px", fontSize:13 }}>
              Leave Group
            </button>
          ) : (
            <div style={{ background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.3)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--text-base)", marginBottom:10 }}>Are you sure you want to leave?</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={handleLeave} style={{ padding:"8px 18px", background:"#f59e0b", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Yes, Leave</button>
                <button className="btn-ghost" style={{ padding:"8px 14px", fontSize:13 }} onClick={()=>setConfirmLeave(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Group (owner only) ── */}
      <div style={{ background:"rgba(239,68,68,.05)", borderRadius:16, padding:20, border:"1.5px solid rgba(239,68,68,.2)" }}>
        <div style={{ fontWeight:700, fontSize:15, color:"#ef4444", marginBottom:8 }}>🗑 Delete Group</div>
        <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:14 }}>
          Permanently delete this group and all its messages, resources, and events. This cannot be undone.
        </div>
        {!confirmDelete ? (
          <button onClick={()=>setConfirmDelete(true)} style={{ padding:"8px 18px", background:"none", border:"1.5px solid #ef4444", borderRadius:10, color:"#ef4444", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
            Delete Group
          </button>
        ) : (
          <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:12, padding:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-base)", marginBottom:6 }}>
              Type <strong>{group.name}</strong> to confirm deletion:
            </div>
            <input className="fc" placeholder={group.name} value={deleteInput} onChange={e=>setDeleteInput(e.target.value)} style={{ padding:"8px 12px", fontSize:13, marginBottom:10, borderColor: deleteInput===group.name?"#ef4444":"var(--border)" }}/>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleDelete} disabled={deleteInput!==group.name}
                style={{ padding:"8px 18px", background: deleteInput===group.name?"#ef4444":"#fca5a5", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor: deleteInput===group.name?"pointer":"not-allowed", fontFamily:"inherit", fontSize:13 }}>
                Delete Forever
              </button>
              <button className="btn-ghost" style={{ padding:"8px 14px", fontSize:13 }} onClick={()=>{ setConfirmDelete(false); setDeleteInput(""); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SettingsTab;
