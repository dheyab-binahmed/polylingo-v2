import { useState, useCallback } from "react";
import CommunityStyles  from "../styles/CommunityStyles";
import { INITIAL_POSTS, INITIAL_GROUPS, INITIAL_PARTNERS } from "../data/communityData";
import ToastContainer   from "../components/components/ui/ToastContainer";
import Section          from "../components/components/ui/Section";
import Hero             from "../components/components/Hero";
import StateGrid        from "../components/components/StateGrid";
import PostForm         from "../components/components/feed/PostForm";
import PostCard         from "../components/components/feed/PostCard";
import PartnerCard      from "../components/components/partners/PartnerCard";
import DMModal          from "../components/components/partners/DMModal";
import GroupRow         from "../components/components/groups/GroupRow";
import CreateGroupModel from "../components/components/groups/CreateGroupModel";
import GroupInterface   from "../components/components/groups/GroupInterface";

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION — replace with API calls:
//   Posts:    GET /api/community/posts?page=1&limit=10
//   Groups:   GET /api/community/groups?userId=
//   Partners: GET /api/community/partners?userId=&page=1
// ─────────────────────────────────────────────────────────────────────────────

const PARTNER_LANGS  = ["All","Spanish","English","French","Japanese","Arabic","Chinese"];
const LEVEL_FILTERS  = ["All Levels","Beginner","Intermediate","Advanced"];
const GROUPS_PAGE_SZ = 5; // groups shown per page

export default function CommunityPage() {
  const [posts,           setPosts]           = useState(INITIAL_POSTS);
  const [groups,          setGroups]          = useState(INITIAL_GROUPS);
  const [partners,        setPartners]        = useState(INITIAL_PARTNERS);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeGroup,     setActiveGroup]     = useState(null);
  const [dmPartner,       setDmPartner]       = useState(null);
  const [toasts,          setToasts]          = useState([]);

  // Feed filters
  const [feedSearch,         setFeedSearch]         = useState("");
  const [feedLoading,        setFeedLoading]        = useState(false);
  const [loadingMorePosts,   setLoadingMorePosts]   = useState(false);
  const [postsPage,          setPostsPage]          = useState(1);
  const [hasMorePosts,       setHasMorePosts]       = useState(true);

  // Partner filters
  const [partnerFilter,      setPartnerFilter]      = useState("All");
  const [partnerSearch,      setPartnerSearch]      = useState("");
  const [partnerLoading,     setPartnerLoading]     = useState(false);
  const [loadingMorePartners,setLoadingMorePartners]= useState(false);
  const [partnersPage,       setPartnersPage]       = useState(1);
  const [hasMorePartners,    setHasMorePartners]    = useState(true);

  // Group filters
  const [groupSearch,     setGroupSearch]     = useState("");
  const [groupLevel,      setGroupLevel]      = useState("All Levels");
  const [groupsShown,     setGroupsShown]     = useState(GROUPS_PAGE_SZ);

  // ── Toast ─────────────────────────────────────────────────────────────
  const notify = useCallback((message, type="info") => {
    const id = Date.now();
    setToasts(p=>[...p, { id, message, type }]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 3500);
  }, []);

  // ── Scroll to section ─────────────────────────────────────────────────
  const scrollTo = useCallback((section) => {
    const ids = { feed:"feed-section", partners:"partners-section", groups:"groups-section" };
    document.getElementById(ids[section])?.scrollIntoView({ behavior:"smooth" });
  }, []);

  // ── DM opener (used by GroupInterface → ChatTab / MembersTab) ─────────
  const openDM = useCallback((partnerInfo) => {
    setDmPartner(partnerInfo);
    setActiveGroup(null); // close group modal when DM opens
  }, []);

  // ── My connections (friends) ──────────────────────────────────────────
  // BACKEND INTEGRATION: GET /api/community/partners/connections
  const myConnections = partners.filter(p=>p.connected);

  // ─────────────────────────────────────────────────────────────────────
  // POST HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handlePost = ({ content, language, tags, pollOptions, photoPreview }) => {
    // BACKEND INTEGRATION: POST /api/community/posts  FormData{ content, language, tags, pollOptions, image? }
    setPosts(p=>[{
      id:Date.now(), author:"You", initials:"ME", time:"Just now",
      language, tags, color:"#6366f1",
      likes:0, comments:0, shares:0, liked:false,
      commentsList:[], ownedByCurrentUser:true, content,
      pollOptions: pollOptions?.length>=2 ? pollOptions : undefined,
      photoPreview: photoPreview||undefined,
    },...p]);
    notify("Post published! 🎉","success");
  };

  const handleDelete = id => {
    // BACKEND INTEGRATION: DELETE /api/community/posts/:id
    setPosts(p=>p.filter(post=>post.id!==id));
    notify("Post deleted.","info");
  };

  const handleLike = id => {
    // BACKEND INTEGRATION: POST /api/community/posts/:id/like  (DELETE to unlike)
    setPosts(p=>p.map(post=>post.id===id ? { ...post, liked:!post.liked, likes:post.liked?post.likes-1:post.likes+1 } : post));
  };

  const handleShare = id => {
    // BACKEND INTEGRATION: POST /api/community/posts/:id/share
    setPosts(p=>p.map(post=>post.id===id ? { ...post, shares:post.shares+1 } : post));
  };

  const handleComment = id => {
    // BACKEND INTEGRATION: handled inside PostCard; this updates the parent count
    setPosts(p=>p.map(post=>post.id===id ? { ...post, comments:post.comments+1 } : post));
  };

  const handleReport = id => {
    // BACKEND INTEGRATION: POST /api/community/posts/:id/report  { reason }
    notify("Post reported. We'll review it shortly.","warning");
  };

  const handleRefreshFeed = () => {
    setFeedLoading(true);
    setPostsPage(1); setHasMorePosts(true);
    // BACKEND INTEGRATION: GET /api/community/posts?page=1&refresh=true → setPosts(response)
    setTimeout(()=>{ setFeedLoading(false); notify("Feed refreshed!","success"); },600);
  };

  const handleLoadMorePosts = () => {
    if (loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    const nextPage = postsPage + 1;
    // BACKEND INTEGRATION: GET /api/community/posts?page=${nextPage} → append response to posts
    setTimeout(() => {
      const morePosts = INITIAL_POSTS.map(p => ({
        ...p, id: Date.now() + Math.random() * 99999,
        time: `${nextPage * 3} hours ago`, likes: Math.floor(Math.random()*20),
        comments: 0, shares: 0, liked: false, commentsList: [], ownedByCurrentUser: false,
      }));
      setPosts(prev => [...prev, ...morePosts]);
      setPostsPage(nextPage);
      setLoadingMorePosts(false);
      if (nextPage >= 3) setHasMorePosts(false); // remove this line when backend is connected
    }, 900);
  };

  // ─────────────────────────────────────────────────────────────────────
  // PARTNER HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleConnect = id => {
    // BACKEND INTEGRATION: POST /api/community/partners/:id/connect  { userId }
    const p = partners.find(x=>x.id===id);
    setPartners(ps=>ps.map(pt=>pt.id===id ? { ...pt, connected:true } : pt));
    notify(`Connected with ${p?.name}! 🤝`,"success");
  };

  const handleDisconnect = id => {
    // BACKEND INTEGRATION: DELETE /api/community/partners/:id/connect
    const p = partners.find(x=>x.id===id);
    setPartners(ps=>ps.map(pt=>pt.id===id ? { ...pt, connected:false } : pt));
    if (dmPartner?.id===id) setDmPartner(null);
    notify(`Disconnected from ${p?.name}.`,"info");
  };

  const handleMessage = id => {
    // BACKEND INTEGRATION: GET /api/community/dm/:id/messages → load history
    const p = partners.find(x=>x.id===id);
    if (p) setDmPartner(p);
  };

  const handleCall = id => {
    // BACKEND INTEGRATION: POST /api/community/dm/:id/call → { roomToken }
    const p = partners.find(x=>x.id===id);
    notify(`Starting call with ${p?.name}… 📞`,"info");
  };

  const handleRefreshPartners = () => {
    setPartnerLoading(true);
    setPartnersPage(1); setHasMorePartners(true);
    // BACKEND INTEGRATION: GET /api/community/partners?refresh=true → setPartners(response)
    setTimeout(()=>{ setPartnerLoading(false); notify("Partners refreshed!","success"); },600);
  };

  const handleLoadMorePartners = () => {
    if (loadingMorePartners || !hasMorePartners) return;
    setLoadingMorePartners(true);
    const nextPage = partnersPage + 1;
    // BACKEND INTEGRATION: GET /api/community/partners?page=${nextPage} → append response to partners
    setTimeout(() => {
      const more = INITIAL_PARTNERS.map(p => ({
        ...p, id: Date.now() + Math.random() * 99999, connected: false,
      }));
      setPartners(prev => [...prev, ...more]);
      setPartnersPage(nextPage);
      setLoadingMorePartners(false);
      if (nextPage >= 3) setHasMorePartners(false); // remove this line when backend is connected
    }, 900);
  };

  // ─────────────────────────────────────────────────────────────────────
  // GROUP HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleCreateGroup = form => {
    const colors = ["#6366f1","#10b981","#8b5cf6","#3b82f6","#f59e0b"];
    // BACKEND INTEGRATION: POST /api/community/groups { name, description, language, level, icon, isPrivate }
    setGroups(p=>[{
      id:Date.now(), name:form.name, icon:form.icon||"💬",
      description:form.description, members:1, language:form.language, level:form.level,
      color:colors[Math.floor(Math.random()*colors.length)],
      joined:true, isPrivate:form.isPrivate||false, isOwner:true, messages:[],
      membersList:[{ name:"You", initials:"ME", status:"online" }],
      resources:[], events:[],
    },...p]);
    notify(`"${form.name}" created! 🎉`,"success");
  };

  const handleDeleteGroup = id => {
    // BACKEND INTEGRATION: DELETE /api/community/groups/:id (owner only)
    setGroups(g=>g.filter(gr=>gr.id!==id));
    notify("Group deleted.","info");
  };

  const handleJoinGroup = id => {
    // BACKEND INTEGRATION: POST /api/community/groups/:id/join  { userId }
    setGroups(g=>g.map(gr=>gr.id===id ? { ...gr, joined:true, members:gr.members+1, membersList:[...(gr.membersList||[]),{ name:"You",initials:"ME",status:"online" }] } : gr));
    notify(`Joined "${groups.find(g=>g.id===id)?.name}"! 🎉`,"success");
  };

  const handleLeaveGroup = id => {
    // BACKEND INTEGRATION: DELETE /api/community/groups/:id/join  { userId }
    setGroups(g=>g.map(gr=>gr.id===id ? { ...gr, joined:false, members:Math.max(0,gr.members-1), membersList:(gr.membersList||[]).filter(m=>m.name!=="You") } : gr));
    notify(`Left "${groups.find(g=>g.id===id)?.name}".`,"info");
  };

  const openGroup = id => setActiveGroup(groups.find(g=>g.id===id)||null);

  // ── Filtered data ─────────────────────────────────────────────────────
  const filteredPosts = posts.filter(p =>
    !feedSearch.trim() ||
    p.content.toLowerCase().includes(feedSearch.toLowerCase()) ||
    p.author.toLowerCase().includes(feedSearch.toLowerCase()) ||
    (p.tags||[]).some(t=>t.includes(feedSearch.toLowerCase()))
  );

  const filteredPartners = partners.filter(p => {
    const matchLang   = partnerFilter==="All" || p.languages.some(l=>l.toLowerCase().includes(partnerFilter.toLowerCase()));
    const matchSearch = !partnerSearch.trim() || p.name.toLowerCase().includes(partnerSearch.toLowerCase()) || p.country.toLowerCase().includes(partnerSearch.toLowerCase());
    return matchLang && matchSearch;
  });

  const filteredGroups = groups.filter(g => {
    const matchSearch = !groupSearch.trim() || g.name.toLowerCase().includes(groupSearch.toLowerCase()) || g.description.toLowerCase().includes(groupSearch.toLowerCase()) || g.language.toLowerCase().includes(groupSearch.toLowerCase());
    const matchLevel  = groupLevel==="All Levels" || g.level===groupLevel.toLowerCase();
    return matchSearch && matchLevel;
  });
  const visibleGroups = filteredGroups.slice(0, groupsShown);
  const hasMoreGroups = filteredGroups.length > groupsShown;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="plg-root">
      <CommunityStyles />
      <ToastContainer toasts={toasts} />

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px" }}>

        <Hero onCreateGroup={()=>setShowCreateGroup(true)} onFindPartners={()=>scrollTo("partners")} />

        <StateGrid postCount={posts.length} groupCount={groups.length} onScrollTo={scrollTo} />

        {/* ── My Connections ── */}
        {myConnections.length > 0 && (
          <Section title={`My Connections (${myConnections.length})`}>
            {/* BACKEND INTEGRATION: GET /api/community/partners/connections */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {myConnections.map(p=>(
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, background:"var(--bg-subtle)", border:"1.5px solid var(--border)", borderRadius:14, padding:"10px 14px" }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div className="ava" style={{ width:38, height:38, background:p.color, fontSize:13 }}>{p.initials}</div>
                    {p.online && <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, background:"#10b981", border:"2px solid var(--bg-subtle)", borderRadius:"50%" }}/>}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"var(--text-base)", maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:11, color:p.online?"#10b981":"var(--text-muted)" }}>{p.online?"● Online":"○ Offline"}</div>
                  </div>
                  <div style={{ display:"flex", gap:5 }}>
                    <button className="btn-coral" style={{ padding:"5px 10px", fontSize:12 }} onClick={()=>handleMessage(p.id)} title="Message">💬</button>
                    <button className="btn-ghost" style={{ padding:"5px 9px", fontSize:12, borderColor:"#10b981", color:"#10b981" }} onClick={()=>handleCall(p.id)} title="Video call">📹</button>
                    <button className="btn-ghost" style={{ padding:"5px 9px", fontSize:12 }} onClick={()=>handleDisconnect(p.id)} title="Disconnect">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Community Feed ── */}
        <div id="feed-section">
          <Section
            title="Community Feed"
            action={
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#9ca3af" }}>🔍</span>
                  <input type="text" placeholder="Search posts…" value={feedSearch} onChange={e=>setFeedSearch(e.target.value)}
                    style={{ padding:"6px 10px 6px 26px", border:"1.5px solid var(--border)", borderRadius:9, fontSize:13, fontFamily:"inherit", color:"var(--text-base)", background:"var(--bg-input)", outline:"none", width:160 }}
                    onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
                </div>
                <button className="btn-ghost" onClick={handleRefreshFeed} disabled={feedLoading}>
                  {feedLoading?"⏳":"🔄"}
                </button>
              </div>
            }
          >
            <PostForm onPost={handlePost}/>
            {filteredPosts.length===0 ? (
              <div style={{ textAlign:"center", padding:"2rem", color:"var(--text-muted)" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                <div style={{ fontWeight:600 }}>No posts match "{feedSearch}"</div>
              </div>
            ) : filteredPosts.map(p=>(
              <PostCard key={p.id} post={p} onLike={handleLike} onShare={handleShare} onComment={handleComment} onDelete={handleDelete} onReport={handleReport}/>
            ))}
            {!feedSearch && (
              <div style={{ textAlign:"center", marginTop:14 }}>
                {hasMorePosts ? (
                  <button className="btn-ghost" onClick={handleLoadMorePosts} disabled={loadingMorePosts}>
                    {loadingMorePosts ? "⏳ Loading…" : "⬇ Load More Posts"}
                  </button>
                ) : (
                  <div style={{ fontSize:13, color:"var(--text-muted)" }}>✅ You've seen all posts</div>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── Find Partners ── */}
        <div id="partners-section">
          <Section
            title="Find Language Partners"
            action={<button className="btn-ghost" onClick={handleRefreshPartners} disabled={partnerLoading}>{partnerLoading?"⏳":"🔄"} Refresh</button>}
          >
            <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ position:"relative", flex:"1 1 200px", minWidth:180 }}>
                <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#9ca3af", fontSize:13 }}>🔍</span>
                <input type="text" placeholder="Search by name or country…" value={partnerSearch} onChange={e=>setPartnerSearch(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px 9px 32px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, fontFamily:"inherit", color:"var(--text-base)", background:"var(--bg-input)", outline:"none", transition:"border-color .2s" }}
                  onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {PARTNER_LANGS.map(lang=>(
                  <button key={lang} onClick={()=>setPartnerFilter(lang)} style={{ padding:"6px 14px", borderRadius:99, fontSize:13, fontWeight:600, border:"1.5px solid", borderColor:partnerFilter===lang?"#6366f1":"var(--border)", background:partnerFilter===lang?"#6366f1":"var(--bg-card)", color:partnerFilter===lang?"#fff":"var(--text-muted)", cursor:"pointer", transition:"all .18s", fontFamily:"inherit" }}>{lang}</button>
                ))}
              </div>
            </div>
            {/* BACKEND INTEGRATION: GET /api/community/partners?lang=&search=&page= */}
            {filteredPartners.length>0 ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(230px,1fr))", gap:16 }}>
                {filteredPartners.map(p=>(
                  <PartnerCard key={p.id} partner={p} onConnect={handleConnect} onDisconnect={handleDisconnect} onMessage={handleMessage} onCall={handleCall}/>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"2.5rem 1rem", background:"var(--bg-subtle)", borderRadius:14, border:"1.5px dashed var(--border)" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                <div style={{ fontWeight:700, color:"var(--text-base)", marginBottom:4 }}>No partners found</div>
                <div style={{ fontSize:13, color:"var(--text-muted)" }}>Try adjusting your search or filter</div>
              </div>
            )}
            {filteredPartners.length>0 && (
              <div style={{ textAlign:"center", marginTop:18 }}>
                {hasMorePartners ? (
                  <button className="btn-ghost" onClick={handleLoadMorePartners} disabled={loadingMorePartners}>
                    {loadingMorePartners ? "⏳ Loading…" : "👥 Show More Partners"}
                  </button>
                ) : (
                  <div style={{ fontSize:13, color:"var(--text-muted)" }}>✅ You've seen all partners</div>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── Study Groups ── */}
        <div id="groups-section">
          <Section
            title="Join Study Groups"
            action={<button className="btn-coral" onClick={()=>setShowCreateGroup(true)}>＋ Create Group</button>}
          >
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ position:"relative", flex:"1 1 180px", minWidth:160 }}>
                <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#9ca3af", fontSize:13 }}>🔍</span>
                <input type="text" placeholder="Search groups…" value={groupSearch} onChange={e=>setGroupSearch(e.target.value)}
                  style={{ width:"100%", padding:"8px 12px 8px 32px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:13, fontFamily:"inherit", color:"var(--text-base)", background:"var(--bg-input)", outline:"none" }}
                  onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {LEVEL_FILTERS.map(lvl=>(
                  <button key={lvl} onClick={()=>{ setGroupLevel(lvl); setGroupsShown(GROUPS_PAGE_SZ); }} style={{ padding:"5px 12px", borderRadius:99, fontSize:12, fontWeight:600, border:"1.5px solid", borderColor:groupLevel===lvl?"#6366f1":"var(--border)", background:groupLevel===lvl?"#6366f1":"var(--bg-card)", color:groupLevel===lvl?"#fff":"var(--text-muted)", cursor:"pointer", fontFamily:"inherit" }}>{lvl}</button>
                ))}
              </div>
            </div>

            {/* BACKEND INTEGRATION: GET /api/community/groups?search=&level=&page= */}
            {visibleGroups.length===0 ? (
              <div style={{ textAlign:"center", padding:"2rem 1rem", background:"var(--bg-subtle)", borderRadius:14, border:"1.5px dashed var(--border)" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>👥</div>
                <div style={{ fontWeight:600, color:"var(--text-base)" }}>No groups found</div>
                <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:4 }}>Try a different search or create your own</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {visibleGroups.map(g=>(
                  <GroupRow key={g.id} group={g} onOpen={openGroup} onJoin={handleJoinGroup} onLeave={handleLeaveGroup}/>
                ))}
              </div>
            )}

            {/* Show more / less */}
            <div style={{ textAlign:"center", marginTop:16, display:"flex", gap:10, justifyContent:"center" }}>
              {hasMoreGroups && (
                <button className="btn-ghost" onClick={()=>setGroupsShown(s=>s+GROUPS_PAGE_SZ)}>
                  ⬇ Show More ({filteredGroups.length - groupsShown} remaining)
                </button>
              )}
              {groupsShown > GROUPS_PAGE_SZ && (
                <button className="btn-ghost" onClick={()=>setGroupsShown(GROUPS_PAGE_SZ)}>⬆ Show Less</button>
              )}
            </div>
          </Section>
        </div>

      </main>

      {/* FAB */}
      <button className="btn-coral" onClick={()=>setShowCreateGroup(true)} style={{ position:"fixed", bottom:26, right:26, width:54, height:54, borderRadius:"50%", padding:0, fontSize:22, justifyContent:"center", boxShadow:"0 8px 24px rgba(99,102,241,.4)", zIndex:400 }}>＋</button>

      {/* Modals */}
      {showCreateGroup && <CreateGroupModel onClose={()=>setShowCreateGroup(false)} onCreate={handleCreateGroup}/>}
      {activeGroup     && <GroupInterface   group={activeGroup} onClose={()=>setActiveGroup(null)} notify={notify} onOpenDM={openDM} onLeaveGroup={handleLeaveGroup} onDeleteGroup={handleDeleteGroup}/>}
      {dmPartner       && <DMModal          partner={dmPartner} onClose={()=>setDmPartner(null)} onCall={handleCall}/>}
    </div>
  );
}
