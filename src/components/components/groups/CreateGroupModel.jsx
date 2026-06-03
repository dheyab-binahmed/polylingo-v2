import { useState } from "react";

const LANGUAGES = ["Spanish","English","French","German","Japanese","Korean","Chinese","Arabic","Portuguese","Russian","Italian"];
const ICONS = ["💬","🎙️","📚","📖","🎌","🏮","🌙","🏰","🎵","❄️","🍕","🎯","🚀","⭐","🌍","🎓","💡","🔬","🎨","🏆","🌸","🦋","🎸","🧠","✨","🦊","🐉","🌊","🔥","💎"];

const CreateGroupModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ name:"", description:"", language:"", level:"", icon:"💬", isPrivate:false });
  const [showIcons, setShowIcons] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const valid = form.name.trim() && form.description.trim() && form.language && form.level;

  const handleSubmit = e => {
    e.preventDefault();
    if (!valid) return;
    onCreate(form);
    onClose();
  };

  return (
    <div className="create-group-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="create-group-box">

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:"clamp(16px,4vw,20px)", fontWeight:800, color:"var(--text-base)" }}>
            Create Study Group
          </h2>
          <button onClick={onClose} style={{ background:"var(--bg-subtle)", border:"none", width:34, height:34, borderRadius:"50%", cursor:"pointer", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", flexShrink:0 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Icon picker + Name */}
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <button type="button" onClick={() => setShowIcons(s => !s)}
                style={{ width:52, height:52, borderRadius:13, background:"var(--bg-subtle)", border:`2px solid ${showIcons?"#6366f1":"var(--border)"}`, fontSize:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color .2s" }}
                title="Pick group icon">
                {form.icon}
              </button>
              {showIcons && (
                <div style={{ position:"absolute", top:58, left:0, zIndex:200, background:"var(--bg-card)", border:"1.5px solid var(--border)", borderRadius:14, padding:10, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4, boxShadow:"0 8px 28px rgba(0,0,0,.18)", width:200 }}>
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => { setForm(f => ({...f, icon:ic})); setShowIcons(false); }}
                      style={{ background:form.icon===ic?"#eef2ff":"none", border:"none", fontSize:20, cursor:"pointer", borderRadius:8, padding:"4px 3px", lineHeight:1 }}>
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:5, color:"var(--text-muted)" }}>Group Name *</label>
              <input className="fc" type="text" placeholder="e.g. Spanish Conversation Club" value={form.name} onChange={set("name")} required maxLength={60} />
              <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3, textAlign:"right" }}>{form.name.length}/60</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:5, color:"var(--text-muted)" }}>Description *</label>
            <textarea className="fc" style={{ resize:"vertical", minHeight:72 }} placeholder="Describe your group's purpose and goals…" value={form.description} onChange={set("description")} required maxLength={300} />
            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3, textAlign:"right" }}>{form.description.length}/300</div>
          </div>

          {/* Language + Level side by side on larger screens */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:5, color:"var(--text-muted)" }}>Language *</label>
              <select className="fc" value={form.language} onChange={set("language")} required style={{ appearance:"none" }}>
                <option value="">Choose…</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:5, color:"var(--text-muted)" }}>Level *</label>
              <select className="fc" value={form.level} onChange={set("level")} required style={{ appearance:"none" }}>
                <option value="">Select…</option>
                <option value="beginner">👶 Beginner</option>
                <option value="intermediate">🎓 Intermediate</option>
                <option value="advanced">🏆 Advanced</option>
                <option value="all">🌈 All Levels</option>
              </select>
            </div>
          </div>

          {/* Privacy toggle */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"var(--bg-subtle)", borderRadius:12, border:"1px solid var(--border)", gap:12 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:13, color:"var(--text-base)" }}>
                {form.isPrivate ? "🔒 Private Group" : "🌍 Public Group"}
              </div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                {form.isPrivate ? "Only invited members can join" : "Anyone can find and join"}
              </div>
            </div>
            <div
              onClick={() => setForm(f => ({...f, isPrivate:!f.isPrivate}))}
              role="switch"
              aria-checked={form.isPrivate}
              tabIndex={0}
              onKeyDown={e => e.key === " " && setForm(f => ({...f, isPrivate:!f.isPrivate}))}
              style={{ width:44, height:24, borderRadius:12, background:form.isPrivate?"#6366f1":"var(--border)", cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0 }}>
              <div style={{ position:"absolute", top:3, left:form.isPrivate?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }} />
            </div>
          </div>

          <button type="submit" className="btn-coral" disabled={!valid} style={{ width:"100%", justifyContent:"center", padding:"13px 0", fontSize:15, marginTop:2 }}>
            🚀 Create Group
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
