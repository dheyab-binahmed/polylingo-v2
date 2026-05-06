import { useState, useRef, useEffect } from "react";
import ChatTab      from "./tabs/ChatTab";
import VideoTab     from "./tabs/VideoTab";
import ResourcesTab from "./tabs/ResourcesTab";
import EventsTab    from "./tabs/EventsTab";
import MembersTab   from "./tabs/MembersTab";
import SettingsTab  from "./tabs/SettingsTab";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Start call   : POST  /api/community/groups/:id/call/notify
// Edit group   : PATCH /api/community/groups/:id  { name, description, isPrivate }
// Leave group  : DELETE /api/community/groups/:id/join
// Delete group : DELETE /api/community/groups/:id
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id:"chat",      icon:"💬", label:"Chat"      },
  { id:"members",   icon:"👥", label:"Members"   },
  { id:"video",     icon:"📹", label:"Video Room" },
  { id:"resources", icon:"📁", label:"Resources"  },
  { id:"events",    icon:"📅", label:"Events"     },
  { id:"settings",  icon:"⚙️", label:"Settings"   },
];

const GroupInterface = ({ group, onClose, notify, onOpenDM, onLeaveGroup, onDeleteGroup }) => {
  const [tab,       setTab]      = useState("chat");
  const [unread,    setUnread]   = useState(0);
  const [groupData, setGroupData]= useState(group);

  // Track current tab in a ref so handleNewMessage always sees latest value
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // Called by ChatTab when a remote message arrives — increments badge if user is on another tab
  const handleNewMessage = () => {
    if (tabRef.current !== "chat") setUnread(n => n + 1);
  };

  const startCall = () => {
    setTab("video");
    // BACKEND INTEGRATION: POST /api/community/groups/:id/call/notify
    notify("Opening video room… 📹", "info");
  };

  const handleTabChange = id => {
    setTab(id);
    if (id === "chat") setUnread(0);
  };

  // Called from SettingsTab
  const handleUpdate = fields => {
    setGroupData(g => ({ ...g, ...fields }));
    // BACKEND INTEGRATION: PATCH /api/community/groups/:id  { ...fields }
    notify("Group updated! ✓", "success");
  };

  const handleLeave = () => {
    onLeaveGroup?.(groupData.id);
    notify(`Left "${groupData.name}".`, "info");
    onClose();
  };

  const handleDelete = () => {
    onDeleteGroup?.(groupData.id);
    notify(`"${groupData.name}" deleted.`, "info");
    onClose();
  };

  return (
    <div className="gi-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="gi-box">

        {/* Header — Fix 7: shows name, member count, language, description snippet */}
        <div style={{ background:groupData.color, padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"rgba(255,255,255,.2)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>
              {groupData.icon}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>{groupData.name}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.75)", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <span>👥 {groupData.members}</span>
                <span>🌐 {groupData.language}</span>
                {groupData.isPrivate && <span style={{ background:"rgba(255,255,255,.15)", padding:"0 7px", borderRadius:10 }}>🔒 Private</span>}
                {tab==="video" && <span style={{ background:"rgba(34,197,94,.3)", color:"#4ade80", padding:"1px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>● Live</span>}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={startCall} title="Start video call"
              style={{ background:tab==="video"?"rgba(34,197,94,.35)":"rgba(255,255,255,.2)", border:"none", color:"#fff", width:34, height:34, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}>
              📞
            </button>
            <button onClick={onClose}
              style={{ background:"rgba(255,255,255,.2)", border:"none", width:34, height:34, borderRadius:"50%", color:"#fff", cursor:"pointer", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center" }}>
              ×
            </button>
          </div>
        </div>

        {/* Description strip — Fix 7 */}
        {groupData.description && (
          <div style={{ padding:"8px 20px", background:"var(--bg-subtle)", borderBottom:"1px solid var(--border)", fontSize:13, color:"var(--text-muted)", lineHeight:1.4, flexShrink:0, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" }}>
            {groupData.description}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid var(--border)", background:"var(--bg-card)", flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t.id} className={`gtab ${tab===t.id?"active":""}`} onClick={()=>handleTabChange(t.id)} style={{ position:"relative" }}>
              {t.icon} {t.label}
              {t.id==="chat" && unread>0 && (
                <span style={{ position:"absolute", top:6, right:4, background:"#ef4444", color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{unread}</span>
              )}
              {t.id==="video" && tab==="video" && (
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block", marginLeft:5, animation:"gipulse 1.5s infinite" }}/>
              )}
            </button>
          ))}
          <style>{`@keyframes gipulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>
          {tab==="chat"      && <ChatTab      group={groupData} notify={notify} onOpenDM={onOpenDM} onStartCall={startCall} onNewMessage={handleNewMessage}/>}
          {tab==="members"   && <MembersTab   group={groupData} notify={notify} onOpenDM={onOpenDM}/>}
          {tab==="video"     && <VideoTab     group={groupData} onLeave={()=>{ setTab("chat"); notify("You left the call.","info"); }}/>}
          {tab==="resources" && <ResourcesTab group={groupData} notify={notify}/>}
          {tab==="events"    && <EventsTab    group={groupData} notify={notify} onStartCall={startCall}/>}
          {tab==="settings"  && <SettingsTab  group={groupData} notify={notify} onUpdate={handleUpdate} onLeave={handleLeave} onDelete={handleDelete}/>}
        </div>

      </div>
    </div>
  );
};

export default GroupInterface;
