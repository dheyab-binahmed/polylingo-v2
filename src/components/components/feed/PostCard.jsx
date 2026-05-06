import { useState, useRef } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// Like    : POST   /api/community/posts/:id/like         { userId }
// Unlike  : DELETE /api/community/posts/:id/like
// React   : POST   /api/community/posts/:id/react        { emoji }
// Share   : POST   /api/community/posts/:id/share
// Delete  : DELETE /api/community/posts/:id
// Edit    : PATCH  /api/community/posts/:id              { content }
// Comment : POST   /api/community/posts/:id/comments     { text }
// Poll    : POST   /api/community/posts/:id/poll/vote    { optionIndex }
// Report  : POST   /api/community/posts/:id/report       { reason }
// ─────────────────────────────────────────────────────────────────────────────

const EMOJIS = ["👍","🎉","🔥","💯","😂","😮"];

const PostCard = ({ post, onLike, onShare, onComment, onDelete, onReport, currentUserInitials = "ME" }) => {
  const [showComments,  setShowComments]  = useState(false);
  const [commentText,   setCommentText]   = useState("");
  const [comments,      setComments]      = useState(post.commentsList || []);
  const [submitting,    setSubmitting]    = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [editText,      setEditText]      = useState(post.content);
  const [content,       setContent]       = useState(post.content);
  const [showShare,     setShowShare]     = useState(false);
  const [shareCopied,   setShareCopied]   = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions,     setReactions]     = useState({ "👍":0,"🎉":0,"🔥":0,"💯":0,"😂":0,"😮":0 });
  const [reported,      setReported]      = useState(false);
  const [pollVote,      setPollVote]      = useState(null);
  // 👉 BACKEND: poll votes come from GET /api/community/posts/:id — start at 0 until backend provides real counts
  const [pollVotes,     setPollVotes]     = useState((post.pollOptions||[]).map(() => 0));
  const inputRef = useRef(null);
  const editRef  = useRef(null);

  const toggleComments = () => {
    setShowComments(s=>!s);
    if (!showComments) setTimeout(() => inputRef.current?.focus(), 80);
  };

  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    // BACKEND INTEGRATION: POST /api/community/posts/:id/comments  { text }
    setComments(c=>[...c, { id:Date.now(), author:"You", initials:currentUserInitials, text, time:"Just now" }]);
    onComment(post.id);
    setCommentText("");
    setSubmitting(false);
  };

  const saveEdit = () => {
    const t = editText.trim();
    if (!t || t.length < 10) return;
    // BACKEND INTEGRATION: PATCH /api/community/posts/:id  { content: t }
    setContent(t);
    setEditing(false);
  };

  const handleShareClick = () => { setShowShare(s=>!s); setShareCopied(false); };

  const copyLink = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    // BACKEND INTEGRATION: share URL = /community/posts/:id
    navigator.clipboard?.writeText(url).catch(()=>{});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
    onShare(post.id);
  };

  const onReact = (emoji) => {
    // BACKEND INTEGRATION: POST /api/community/posts/:id/react  { emoji }
    setReactions(r => ({ ...r, [emoji]: r[emoji] > 0 ? 0 : 1 }));
    setShowReactions(false);
  };

  const handleReport = () => {
    if (reported) return;
    // BACKEND INTEGRATION: POST /api/community/posts/:id/report  { reason:"inappropriate" }
    setReported(true);
    onReport?.(post.id);
  };

  const voteOption = idx => {
    if (pollVote !== null) return;
    // BACKEND INTEGRATION: POST /api/community/posts/:id/poll/vote  { optionIndex: idx }
    setPollVote(idx);
    setPollVotes(v => v.map((c,i) => i===idx ? c+1 : c));
  };

  const totalVotes = pollVotes.reduce((a,b)=>a+b,0);
  const hasPoll    = post.pollOptions && post.pollOptions.length > 0;
  const hasPhoto   = post.photoUrl || post.photoPreview;
  const activeReactions = Object.entries(reactions).filter(([,v])=>v>0);

  return (
    <div className="card fade-in-up" style={{ padding:22, marginBottom:14 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:13, marginBottom:14 }}>
        <div className="ava" style={{ width:46, height:46, background:post.color, fontSize:15 }}>{post.initials}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4, color:"var(--text-base)" }}>{post.author}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>{post.time}</span>
            <span className="tag tag-green">📚 {post.language}</span>
            {(post.tags||[]).map(tag=>(
              <span key={tag} className="tag tag-blue" style={{ fontSize:11 }}>#{tag}</span>
            ))}
          </div>
        </div>
        {post.ownedByCurrentUser && (
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>{ setEditing(e=>!e); setTimeout(()=>editRef.current?.focus(),60); }} title="Edit"
              style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:13, padding:"4px 6px", borderRadius:6 }}>✏️</button>
            <button onClick={()=>onDelete?.(post.id)} title="Delete"
              style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:13, padding:"4px 6px", borderRadius:6 }}>🗑</button>
          </div>
        )}
      </div>

      {/* Content / Edit */}
      {editing ? (
        <div style={{ marginBottom:14 }}>
          <textarea ref={editRef} className="fc-area" rows={4} value={editText} onChange={e=>setEditText(e.target.value)} style={{ fontSize:14, marginBottom:8 }}/>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-coral" style={{ padding:"6px 14px", fontSize:13 }} onClick={saveEdit} disabled={editText.trim().length<10}>Save</button>
            <button className="btn-ghost" style={{ padding:"6px 12px", fontSize:13 }} onClick={()=>{ setEditing(false); setEditText(content); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize:15, lineHeight:1.72, color:"var(--text-base)", whiteSpace:"pre-line", marginBottom:14 }}>{content}</p>
      )}

      {/* Photo */}
      {hasPhoto && !editing && (
        <div style={{ marginBottom:14 }}>
          <img src={post.photoUrl||post.photoPreview} alt="Post attachment"
            style={{ width:"100%", maxHeight:320, objectFit:"cover", borderRadius:10, border:"1px solid var(--border)", display:"block" }}/>
        </div>
      )}

      {/* Poll */}
      {hasPoll && !editing && (
        <div style={{ marginBottom:14, background:"var(--bg-subtle)", borderRadius:12, padding:"14px 16px", border:"1px solid var(--border)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--text-muted)", marginBottom:10 }}>📊 Poll · {totalVotes} vote{totalVotes!==1?"s":""}</div>
          {post.pollOptions.map((opt,i) => {
            const pct   = totalVotes > 0 ? Math.round((pollVotes[i]/totalVotes)*100) : 0;
            const voted = pollVote===i;
            const locked= pollVote!==null;
            return (
              <div key={i} onClick={()=>!locked&&voteOption(i)} style={{ position:"relative", marginBottom:8, borderRadius:8, overflow:"hidden", border:`1.5px solid ${voted?"#6366f1":"var(--border)"}`, cursor:locked?"default":"pointer", transition:"border-color .2s" }}>
                {locked && <div style={{ position:"absolute", inset:0, width:`${pct}%`, background:voted?"rgba(99,102,241,.15)":"rgba(0,0,0,.04)", transition:"width .4s ease" }}/>}
                <div style={{ position:"relative", padding:"9px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:voted?700:500, color:voted?"#6366f1":"var(--text-base)" }}>{voted?"✓ ":""}{opt}</span>
                  {locked && <span style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)" }}>{pct}%</span>}
                </div>
              </div>
            );
          })}
          {pollVote===null && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>Click an option to vote</div>}
        </div>
      )}

      {/* Action bar */}
      <div style={{ borderTop:"1px solid var(--border)", paddingTop:10, display:"flex", alignItems:"center", gap:2, flexWrap:"wrap", position:"relative" }}>

        {/* Like */}
        <button className={`pact ${post.liked?"liked":""}`} onClick={()=>onLike(post.id)}>
          {post.liked?"❤️":"🤍"} {post.likes}
        </button>

        {/* Emoji reaction picker */}
        <div style={{ position:"relative" }}>
          <button className="pact" onClick={()=>setShowReactions(s=>!s)} title="Add reaction">😊</button>
          {showReactions && (
            <div style={{ position:"absolute", bottom:38, left:0, background:"var(--bg-card)", border:"1.5px solid var(--border)", borderRadius:12, padding:"8px 10px", display:"flex", gap:6, boxShadow:"0 8px 24px rgba(0,0,0,.14)", zIndex:50 }}>
              {EMOJIS.map(emoji=>(
                <button key={emoji} onClick={()=>onReact(emoji)}
                  style={{ background:reactions[emoji]?"#eef2ff":"none", border:"none", fontSize:18, cursor:"pointer", borderRadius:8, padding:"4px 6px", transition:"transform .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.3)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active reactions */}
        {activeReactions.map(([emoji,count])=>(
          <span key={emoji} onClick={()=>onReact(emoji)} style={{ fontSize:12, background:"var(--bg-subtle)", border:"1px solid var(--border)", borderRadius:20, padding:"2px 8px", display:"inline-flex", alignItems:"center", gap:3, cursor:"pointer" }}>
            {emoji}<span style={{ fontWeight:600, color:"var(--text-muted)" }}>{count}</span>
          </span>
        ))}

        {/* Comment */}
        <button className={`pact ${showComments?"liked":""}`} onClick={toggleComments}>
          💬 {comments.length}
        </button>

        {/* Share */}
        <button className="pact" onClick={handleShareClick}>📤 {post.shares}</button>

        {/* Report (only other people's posts) */}
        {!post.ownedByCurrentUser && (
          <button className="pact" onClick={handleReport} title={reported?"Already reported":"Report this post"}
            style={{ color:reported?"#ef4444":"var(--text-muted)", fontSize:12 }}>
            {reported ? "⚑ Reported" : "⚑"}
          </button>
        )}

        <span style={{ marginLeft:"auto", fontSize:12, color:"var(--text-muted)" }}>👁 {Math.floor(post.likes*2.5)}</span>

        {/* Share popover */}
        {showShare && (
          <div style={{ position:"absolute", bottom:38, right:0, background:"var(--bg-card)", border:"1.5px solid var(--border)", borderRadius:12, padding:14, boxShadow:"0 8px 28px rgba(0,0,0,.13)", zIndex:50, minWidth:200 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--text-base)", marginBottom:10 }}>Share this post</div>
            <button className="btn-ghost" style={{ width:"100%", justifyContent:"center", marginBottom:7, fontSize:13 }} onClick={copyLink}>
              {shareCopied ? "✓ Link copied!" : "🔗 Copy link"}
            </button>
            <button className="btn-ghost" style={{ width:"100%", justifyContent:"center", fontSize:13 }} onClick={()=>{ onShare(post.id); setShowShare(false); }}>
              📢 Share to feed
            </button>
          </div>
        )}
      </div>

      {/* Comments panel */}
      {showComments && (
        <div style={{ marginTop:14, borderTop:"1px solid var(--border)", paddingTop:14 }}>
          {/* BACKEND INTEGRATION: GET /api/community/posts/:id/comments?page=1 */}
          {comments.length===0 ? (
            <div style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center", padding:"10px 0 8px" }}>No comments yet — be the first!</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
              {comments.map(c=>(
                <div key={c.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div className="ava" style={{ width:30, height:30, background:c.initials===currentUserInitials?"#6366f1":"#9ca3af", fontSize:10, flexShrink:0 }}>{c.initials}</div>
                  <div style={{ flex:1, background:"var(--bg-subtle)", borderRadius:"4px 12px 12px 12px", padding:"8px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"var(--text-base)" }}>{c.author}</span>
                      <span style={{ fontSize:11, color:"var(--text-muted)" }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize:13, color:"var(--text-base)", lineHeight:1.5 }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <div className="ava" style={{ width:30, height:30, background:"#6366f1", fontSize:10, flexShrink:0 }}>{currentUserInitials}</div>
            <div style={{ flex:1 }}>
              <textarea ref={inputRef} className="fc-area" rows={2}
                placeholder="Write a comment… (Enter to send)"
                value={commentText} onChange={e=>setCommentText(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment();} }}
                style={{ fontSize:13, padding:"8px 12px", minHeight:"unset" }}/>
            </div>
            <button className="btn-coral" onClick={submitComment} disabled={!commentText.trim()||submitting} style={{ padding:"8px 14px", fontSize:13, flexShrink:0 }}>✈️</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
